import assert from "node:assert/strict";
import test from "node:test";
import {
  deterministicUuid,
  hashRows,
  projectRows,
  transformGooglePublicContent,
} from "./lib/public-content-import.mjs";
import { buildPublicImportSql } from "./lib/public-content-sql.mjs";

const synthetic = {
  landing: {
    items: [
      {
        key: "hero.title",
        value: "Synthetic",
        selector: "#hero",
        type: "text",
        enabled: true,
      },
    ],
    sectionsLayout: [
      {
        id: "synthetic",
        type: "generic",
        name: "Synthetic",
        order: 1,
        enabled: true,
      },
    ],
    packages: [
      {
        code: "SYNTHETIC",
        name: "Synthetic",
        onlinePrice: 1,
        enabled: true,
      },
    ],
    feedbackImages: [{ url: "https://example.test/synthetic.png" }],
  },
  blog: {
    blogCategories: [{ id: "synthetic", name: "Synthetic", order: 1 }],
  },
  articleDetails: [
    {
      id: "synthetic-post",
      categoryId: "synthetic",
      title: "Synthetic",
      contentHtml: "<p>Synthetic</p>",
      date: "2026-07-24T00:00:00Z",
      enabled: true,
    },
  ],
};

test("deterministic keys produce stable version-5 UUIDs", () => {
  const uuid = deterministicUuid("scope", "synthetic");
  assert.equal(uuid, deterministicUuid("scope", "synthetic"));
  assert.match(
    uuid,
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test("all public slices transform with preserved blog relationships", () => {
  const payload = transformGooglePublicContent(synthetic);
  [
    "site_settings",
    "landing_sections",
    "packages",
    "testimonials",
    "blog_categories",
    "blog_posts",
  ].forEach((table) => assert.equal(payload[table].length, 1));
  assert.equal(
    payload.blog_posts[0].category_id,
    payload.blog_categories[0].id,
  );
});

test("transform and hashes are idempotent", () => {
  const first = transformGooglePublicContent(synthetic);
  const second = transformGooglePublicContent(structuredClone(synthetic));
  assert.deepEqual(first, second);
  assert.equal(hashRows(first.blog_posts), hashRows(second.blog_posts));
});

test("disabled or unsafe public assets are excluded", () => {
  const changed = structuredClone(synthetic);
  changed.articleDetails[0].enabled = false;
  changed.landing.feedbackImages[0].url = "javascript:alert(1)";
  const payload = transformGooglePublicContent(changed);
  assert.equal(payload.blog_posts.length, 0);
  assert.equal(payload.testimonials.length, 0);
});

test("SQL import is transactional, idempotent, and safely escaped", () => {
  const changed = structuredClone(synthetic);
  changed.landing.items[0].value = "O'Brien";
  const payload = transformGooglePublicContent(changed);
  const sql = buildPublicImportSql(payload);
  assert.match(sql, /BEGIN;/);
  assert.match(sql, /COMMIT;/);
  assert.equal((sql.match(/ON CONFLICT/g) || []).length, 6);
  assert.match(sql, /O''Brien/);
  assert.doesNotMatch(sql, /O'Brien/);
});

test("database timestamps normalize before parity hashing", () => {
  assert.deepEqual(
    projectRows(
      [{ published_at: "2026-07-24 00:00:00+00", title: "Synthetic" }],
      ["published_at", "title"],
    ),
    [{ published_at: "2026-07-24T00:00:00.000Z", title: "Synthetic" }],
  );
});
