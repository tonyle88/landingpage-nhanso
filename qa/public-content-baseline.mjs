import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hashRows,
  projectRows,
  transformGooglePublicContent,
} from "./lib/public-content-import.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = resolve(root, "next-app");
const outputDirectory = resolve(root, ".staging-import");
const googleUrl =
  "https://script.google.com/macros/s/AKfycbw3m9zkv9mX-BgMtB7DZj2rMrZtkAAOFDQow2UKxttXRz8G5Zlc4qponSGrvPBxJwEO/exec";
const shouldPrepare = process.argv.includes("--prepare");

process.loadEnvFile(resolve(appRoot, ".env.staging.local"));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(supabaseUrl && publishableKey, "Missing ignored staging environment");

const socketEvidence = new Set();
const sampler = setInterval(() => {
  try {
    const snapshot = execFileSync(
      "/usr/sbin/lsof",
      ["-a", "-p", String(process.pid), "-iTCP", "-nP", "-F", "nT"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    snapshot
      .split(/\r?\n/)
      .filter((line) => line.startsWith("n") && line.includes("->"))
      .forEach((line) => socketEvidence.add(line.slice(1)));
  } catch {}
}, 50);

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  assert.equal(response.ok, true, `Read failed with HTTP ${response.status}`);
  return response.json();
}

async function fetchArticleDetails(summaries) {
  const results = [];
  for (let index = 0; index < summaries.length; index += 4) {
    const batch = summaries.slice(index, index + 4);
    const payloads = await Promise.all(
      batch.map((article) =>
        fetchJson(
          `${googleUrl}?action=getBlogArticle&id=${encodeURIComponent(article.id)}`,
        ),
      ),
    );
    payloads.forEach((payload) => {
      if (payload.ok && payload.article) results.push(payload.article);
    });
  }
  return results;
}

async function readStagingTable(table) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(
    response.ok,
    true,
    `Staging ${table} read failed with HTTP ${response.status}`,
  );
  return response.json();
}

try {
  const [landing, blog] = await Promise.all([
    fetchJson(`${googleUrl}?action=getLandingContent`),
    fetchJson(`${googleUrl}?action=getBlogContent`),
  ]);
  assert.equal(landing.ok, true, "Google landing baseline is unavailable");
  assert.equal(blog.ok, true, "Google blog baseline is unavailable");

  const articleDetails = await fetchArticleDetails(blog.blogArticles || []);
  const payload = transformGooglePublicContent({
    landing,
    blog,
    articleDetails,
  });
  const tables = Object.keys(payload);
  const stagingEntries = await Promise.all(
    tables.map(async (table) => [table, await readStagingTable(table)]),
  );
  const staging = Object.fromEntries(stagingEntries);

  const comparison = Object.fromEntries(
    tables.map((table) => {
      const expected = payload[table];
      const columns = expected[0] ? Object.keys(expected[0]).sort() : [];
      const actual = projectRows(staging[table], columns);
      const expectedHash = hashRows(expected);
      const stagingHash = hashRows(actual);
      return [
        table,
        {
          expectedCount: expected.length,
          stagingCount: actual.length,
          expectedHash,
          stagingHash,
          matches:
            expected.length === actual.length && expectedHash === stagingHash,
        },
      ];
    }),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    mode: "read-only",
    source: {
      landingItems: landing.items?.length || 0,
      packages: landing.packages?.length || 0,
      testimonials: landing.feedbackImages?.length || 0,
      sections: landing.sectionsLayout?.length || 0,
      blogCategories: blog.blogCategories?.length || 0,
      blogArticleSummaries: blog.blogArticles?.length || 0,
      blogArticleDetails: articleDetails.length,
    },
    comparison,
    allMatch: Object.values(comparison).every((item) => item.matches),
    networkEvidence: [...socketEvidence].sort(),
  };

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    resolve(outputDirectory, "public-content-baseline.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    { mode: 0o600 },
  );

  if (shouldPrepare) {
    await writeFile(
      resolve(outputDirectory, "public-content-import.json"),
      `${JSON.stringify(
        {
          metadata: {
            generatedAt: report.generatedAt,
            strategy: "upsert",
            conflictKeys: {
              site_settings: "key",
              landing_sections: "section_key",
              packages: "code",
              testimonials: "id",
              blog_categories: "slug",
              blog_posts: "slug",
            },
          },
          tables: payload,
        },
        null,
        2,
      )}\n`,
      { mode: 0o600 },
    );
  }

  console.log(
    JSON.stringify(
      {
        source: report.source,
        comparison: Object.fromEntries(
          Object.entries(comparison).map(([table, item]) => [
            table,
            {
              expectedCount: item.expectedCount,
              stagingCount: item.stagingCount,
              matches: item.matches,
            },
          ]),
        ),
        allMatch: report.allMatch,
        networkSocketsCaptured: report.networkEvidence.length,
        payloadPrepared: shouldPrepare,
      },
      null,
      2,
    ),
  );
} finally {
  clearInterval(sampler);
}
