import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { chmod, mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BACKUP_IMAGE = "postgres:18-alpine";
const DB_HOST = "aws-0-ap-southeast-1.pooler.supabase.com";
const BACKUP_FILE = "database.dump";
const SOURCE_FILE = "source.tar.gz";
const KEEP_LATEST = 3;

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "ignore", "pipe"] });
    let errorText = "";
    child.stderr.on("data", (chunk) => {
      errorText = (errorText + chunk.toString()).slice(-4000);
    });
    child.once("error", rejectRun);
    child.once("close", (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} exited ${code}: ${errorText.trim()}`));
    });
  });
}

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function safeSourcePath(path) {
  const parts = path.split("/");
  if (parts.some((part) => [".git", "backups", "node_modules", ".next", ".vercel"].includes(part))) return false;
  if (parts.some((part) => part.startsWith(".env") && part !== ".env.example")) return false;
  const name = parts.at(-1).toLowerCase();
  return !(/\.(pem|key|p12|pfx|dump)$/.test(name) || ["id_rsa", "id_ed25519"].includes(name));
}

async function archiveSource(projectRoot, pendingDir, execute) {
  const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: projectRoot,
    maxBuffer: 32 * 1024 * 1024,
  });
  const paths = listed.toString("utf8").split("\0").filter(Boolean).filter(safeSourcePath);
  if (paths.length === 0) throw new Error("No source files found for backup");
  const fileList = join(pendingDir, ".source-files");
  const archivePath = join(pendingDir, SOURCE_FILE);
  await writeFile(fileList, `${paths.join("\0")}\0`, { mode: 0o600 });
  try {
    await execute("tar", ["-czf", archivePath, "-C", projectRoot, "--null", "-T", fileList]);
  } finally {
    await rm(fileList, { force: true });
  }
  const archiveStats = await stat(archivePath);
  if (!archiveStats.isFile() || archiveStats.size < 100) throw new Error("Source archive is missing or unexpectedly small");
  await chmod(archivePath, 0o600);
  await execute("tar", ["-tzf", archivePath]);
  return { file: SOURCE_FILE, bytes: archiveStats.size, sha256: await sha256(archivePath), fileCount: paths.length };
}

async function pruneOldBackups(backupRoot) {
  const entries = await readdir(backupRoot, { withFileTypes: true });
  const completed = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(entry.name)) continue;
    try {
      const manifest = await stat(join(backupRoot, entry.name, "manifest.json"));
      if (manifest.isFile()) completed.push(entry.name);
    } catch {
      // Incomplete or unrelated folders are never removed by retention.
    }
  }
  completed.sort().reverse();
  for (const name of completed.slice(KEEP_LATEST)) {
    await rm(join(backupRoot, name), { recursive: true, force: true });
  }
}

export async function createWeeklyBackup({
  projectRoot = PROJECT_ROOT,
  environment = process.env,
  execute = run,
  now = new Date(),
} = {}) {
  const ref = environment.PRODUCTION_PROJECT_REF?.trim();
  const password = environment.SUPABASE_DB_PASSWORD;
  if (!/^[a-z0-9]{20}$/.test(ref || "") || !password) {
    throw new Error("Missing production project ref or database password in the local environment file");
  }

  const backupRoot = join(projectRoot, "backups", "supabase");
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const pendingDir = join(backupRoot, `.pending-${stamp}`);
  const finalDir = join(backupRoot, stamp);
  const dumpPath = join(pendingDir, BACKUP_FILE);
  await mkdir(backupRoot, { recursive: true, mode: 0o700 });
  await chmod(backupRoot, 0o700);
  await mkdir(pendingDir, { mode: 0o700 });

  const childEnv = {
    ...environment,
    PGPASSWORD: password,
    PGSSLMODE: "require",
  };
  const username = `postgres.${ref}`;
  try {
    await execute("docker", [
      "run", "--rm", "--user", `${process.getuid()}:${process.getgid()}`,
      "--mount", `type=bind,src=${pendingDir},dst=/backup`,
      "--env", "PGPASSWORD", "--env", "PGSSLMODE",
      BACKUP_IMAGE, "pg_dump",
      "--host", DB_HOST, "--port", "5432", "--username", username,
      "--dbname", "postgres", "--format", "custom", "--no-owner", "--no-acl",
      "--file", `/backup/${BACKUP_FILE}`,
    ], { env: childEnv });

    const dumpStats = await stat(dumpPath);
    if (!dumpStats.isFile() || dumpStats.size < 1024) {
      throw new Error("Database dump is missing or unexpectedly small");
    }
    await chmod(dumpPath, 0o600);
    await execute("docker", [
      "run", "--rm", "--user", `${process.getuid()}:${process.getgid()}`,
      "--mount", `type=bind,src=${pendingDir},dst=/backup,readonly`,
      BACKUP_IMAGE, "pg_restore", "--list", `/backup/${BACKUP_FILE}`,
    ]);

    const source = await archiveSource(projectRoot, pendingDir, execute);

    const manifest = {
      createdAt: now.toISOString(),
      file: BACKUP_FILE,
      bytes: dumpStats.size,
      sha256: await sha256(dumpPath),
      databaseScope: "all non-system schemas accessible to the database user",
      source,
      storageObjectsIncluded: false,
    };
    await writeFile(join(pendingDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    await rename(pendingDir, finalDir);
    await pruneOldBackups(backupRoot);
    return { directory: finalDir, ...manifest };
  } catch (error) {
    await rm(pendingDir, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createWeeklyBackup()
    .then(({ directory, bytes, source }) => {
      process.stdout.write(`Backup complete: ${directory} (database ${bytes} bytes, source ${source.bytes} bytes)\n`);
    })
    .catch((error) => {
      const password = process.env.SUPABASE_DB_PASSWORD;
      const message = password ? error.message.replaceAll(password, "[REDACTED]") : error.message;
      process.stderr.write(`Backup failed: ${message}\n`);
      process.exitCode = 1;
    });
}
