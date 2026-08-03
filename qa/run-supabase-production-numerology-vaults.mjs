import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = resolve(root, "next-app");
const binary = resolve(
  appRoot,
  "node_modules/@supabase/cli-darwin-arm64/bin/supabase",
);
const expectedProjectRef = "nuexmwyyibhkfcisaavw";
const linkedProjectRef = readFileSync(
  resolve(appRoot, "supabase/.temp/project-ref"),
  "utf8",
).trim();
const operation = process.argv[2];

if (!existsSync(binary)) throw new Error("Pinned Supabase CLI binary is missing");
if (
  process.env.PRODUCTION_PROJECT_REF !== expectedProjectRef ||
  linkedProjectRef !== expectedProjectRef ||
  !process.env.SUPABASE_ACCESS_TOKEN ||
  !process.env.SUPABASE_DB_PASSWORD
) {
  throw new Error("Refusing to access an unapproved production project");
}
if (
  operation === "push" &&
  process.env.NUMEROLOGY_USER_VAULTS_MIGRATION_APPROVED !== expectedProjectRef
) {
  throw new Error("Explicit numerology vault migration approval is required");
}

const operations = {
  migrations: ["migration", "list", "--linked"],
  "dry-run": ["db", "push", "--linked", "--dry-run", "--yes"],
  push: ["db", "push", "--linked", "--yes"],
};
const args = operations[operation];
if (!args) throw new Error("Allowed operations: migrations, dry-run, push");

const cli = spawn(binary, args, {
  cwd: appRoot,
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});
cli.stdout.setEncoding("utf8");
cli.stderr.setEncoding("utf8");
cli.stdout.on("data", (chunk) => process.stdout.write(chunk));
cli.stderr.on("data", (chunk) => process.stderr.write(chunk));

let networkOutput = "";
const socketEvidence = new Set();
const socketSampler = setInterval(() => {
  try {
    const snapshot = execFileSync(
      "/usr/sbin/lsof",
      ["-a", "-p", String(cli.pid), "-iTCP", "-nP", "-F", "pcnT"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    for (const line of snapshot.split(/\r?\n/)) {
      if (line.startsWith("n") && line.includes("->")) socketEvidence.add(line);
    }
  } catch {}
}, 100);
const monitor = spawn(
  "/usr/bin/nettop",
  ["-p", String(cli.pid), "-L", "0", "-n", "-m", "tcp"],
  { stdio: ["ignore", "pipe", "ignore"] },
);
monitor.stdout.setEncoding("utf8");
monitor.stdout.on("data", (chunk) => {
  if (networkOutput.length < 100_000) networkOutput += chunk;
});

const [code, signal] = await once(cli, "exit");
clearInterval(socketSampler);
monitor.kill("SIGINT");
await Promise.race([
  once(monitor, "exit"),
  new Promise((resolveWait) => setTimeout(resolveWait, 2_000)),
]);

const evidence = networkOutput
  .split(/\r?\n/)
  .filter((line) => line.trim())
  .slice(0, 40);
console.log(`Network evidence rows captured by nettop: ${Math.max(0, evidence.length - 1)}`);
for (const line of evidence) console.log(line);
console.log(`Network socket snapshots captured by lsof: ${socketEvidence.size}`);
for (const line of socketEvidence) console.log(line);

if (signal) throw new Error(`Supabase CLI terminated by ${signal}`);
if (code !== 0) process.exit(code ?? 1);
