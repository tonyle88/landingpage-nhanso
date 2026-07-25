import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

const projectRef = process.env.PRODUCTION_PROJECT_REF?.trim();
const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (projectRef !== "nuexmwyyibhkfcisaavw" || !accessToken) {
  throw new Error("Refusing to configure an unapproved production project");
}

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/api-keys`,
  {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  },
);
if (!response.ok) throw new Error("Unable to retrieve production API keys");
const keys = await response.json();
const publishable = keys.find((key) => key.type === "publishable")?.api_key;
// The project currently rejects its new-format secret key at the Data API,
// while the project-scoped legacy service_role key is verified working.
const secret = keys.find((key) => key.name === "service_role")?.api_key;
if (!publishable || !secret) {
  throw new Error("Production publishable or secret key is unavailable");
}

const values = [
  {
    key: "NEXT_PUBLIC_SITE_URL",
    value: "https://nhanso.clowcat.com.vn",
    sensitive: false,
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    value: `https://${projectRef}.supabase.co`,
    sensitive: false,
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    value: publishable,
    sensitive: false,
  },
  { key: "SUPABASE_SECRET_KEY", value: secret, sensitive: true },
  {
    key: "BOOKING_RATE_LIMIT_SECRET",
    value: randomBytes(48).toString("base64url"),
    sensitive: true,
  },
  {
    key: "NEXT_PUBLIC_BOOKING_API_V2_ENABLED",
    value: "true",
    sensitive: false,
  },
  {
    key: "SEPAY_SUPABASE_WEBHOOK_ENABLED",
    value: "false",
    sensitive: false,
  },
];

async function setVercelEnv(item) {
  const args = [
    "--cache",
    "/private/tmp/nhanso-vercel-npm-cache",
    "--yes",
    "vercel@latest",
    "env",
    "add",
    item.key,
    "production",
    "--force",
    "--yes",
    item.sensitive ? "--sensitive" : "--no-sensitive",
  ];
  await new Promise((resolve, reject) => {
    const child = spawn("npx", args, {
      cwd: new URL("..", import.meta.url).pathname,
      stdio: ["pipe", "ignore", "pipe"],
    });
    let errors = "";
    child.stderr.on("data", (chunk) => {
      errors += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Vercel rejected ${item.key} (exit ${code})`));
    });
    child.stdin.end(item.value);
  });
}

for (const item of values) await setVercelEnv(item);
console.log(
  JSON.stringify({
    status: "PASS",
    project: "landingpage-nhanso",
    environment: "production",
    configured: values.map(({ key, sensitive }) => ({ key, sensitive })),
    paymentActivation: "BLOCKED_PENDING_ACCOUNT_CONFIRMATION",
  }),
);
