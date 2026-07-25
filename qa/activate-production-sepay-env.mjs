import { spawn } from "node:child_process";

const projectRef = process.env.PRODUCTION_PROJECT_REF?.trim();
const approval = process.env.PRODUCTION_SEPAY_ACTIVATION_APPROVED?.trim();
const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const sepayWebhookSecret = process.env.SEPAY_WEBHOOK_SECRET;
if (
  projectRef !== "nuexmwyyibhkfcisaavw" ||
  approval !== projectRef ||
  !accessToken ||
  !sepayWebhookSecret ||
  sepayWebhookSecret.length < 16
) {
  throw new Error("Refusing to activate SePay on an unapproved production project");
}

const keysResponse = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/api-keys`,
  {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  },
);
if (!keysResponse.ok) throw new Error("Unable to retrieve production API key");
const keys = await keysResponse.json();
const serviceRole = keys.find((key) => key.name === "service_role")?.api_key;
if (!serviceRole) throw new Error("Production service role is unavailable");

const values = [
  {
    key: "SUPABASE_SECRET_KEY",
    value: serviceRole,
    sensitive: true,
  },
  {
    key: "SEPAY_WEBHOOK_SECRET",
    value: sepayWebhookSecret,
    sensitive: true,
  },
  {
    key: "SEPAY_BANK_ACCOUNT_NUMBER",
    value: "96247031088CUONG",
    sensitive: true,
  },
  {
    key: "SEPAY_SUPABASE_WEBHOOK_ENABLED",
    value: "true",
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
console.log(JSON.stringify({
  status: "PASS",
  project: "landingpage-nhanso",
  environment: "production",
  configured: values.map(({ key, sensitive }) => ({ key, sensitive })),
  paymentActivation: "PENDING_SIGNED_DEPLOYMENT_VERIFICATION",
}));
