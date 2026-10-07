import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createWeeklyBackup } from "./backup-supabase-weekly.mjs";

const environment = {
  PRODUCTION_PROJECT_REF: "abcdefghijklmnopqrst",
  SUPABASE_DB_PASSWORD: "synthetic-test-password",
};

async function syntheticRepo() {
  const root = await mkdtemp(join(tmpdir(), "synthetic-supabase-backup-"));
  execFileSync("git", ["init", "--quiet", root]);
  await writeFile(join(root, ".gitignore"), "/backups/\n.env*\n!.env.example\n");
  await writeFile(join(root, "app.js"), "export const ready = true;\n");
  await writeFile(join(root, ".env.local"), "SECRET=synthetic-secret\n");
  return root;
}

test("weekly backup stores a verified archive in an ignored local folder without exposing its password in arguments", async () => {
  const root = await syntheticRepo();
  const calls = [];
  try {
    const result = await createWeeklyBackup({
      projectRoot: root,
      environment,
      now: new Date("2026-09-28T13:00:00Z"),
      execute: async (command, args, options) => {
        if (command === "tar") {
          execFileSync(command, args);
          return;
        }
        calls.push({ command, args });
        assert.equal(args.join(" ").includes(environment.SUPABASE_DB_PASSWORD), false);
        if (args.includes("pg_dump")) {
          assert.equal(options?.env?.PGPASSWORD, environment.SUPABASE_DB_PASSWORD);
          const mount = args[args.indexOf("--mount") + 1];
          const directory = mount.match(/src=(.*),dst=\/backup$/)?.[1];
          assert.ok(directory);
          await writeFile(join(directory, "database.dump"), Buffer.alloc(2048, 65));
        }
      },
    });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].args.includes("--schema"), false);
    assert.ok(calls[1].args.includes("pg_restore"));
    assert.equal(result.bytes, 2048);
    const manifest = JSON.parse(await readFile(join(result.directory, "manifest.json"), "utf8"));
    assert.equal(manifest.bytes, 2048);
    assert.equal(manifest.sha256.length, 64);
    assert.match(manifest.databaseScope, /all non-system schemas/);
    assert.equal(manifest.source.file, "source.tar.gz");
    assert.ok(manifest.source.bytes > 100);
    const sourceFiles = execFileSync("tar", ["-tzf", join(result.directory, "source.tar.gz")], { encoding: "utf8" });
    assert.match(sourceFiles, /app\.js/);
    assert.doesNotMatch(sourceFiles, /\.env\.local|backups\//);
    assert.equal(manifest.storageObjectsIncluded, false);
    execFileSync("git", ["check-ignore", "--quiet", join(result.directory, "database.dump")], { cwd: root });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("retention removes only completed backups older than the latest three", async () => {
  const root = await syntheticRepo();
  const backupRoot = join(root, "backups", "supabase");
  const previous = [
    "2026-09-01T00-00-00-000Z",
    "2026-09-08T00-00-00-000Z",
    "2026-09-15T00-00-00-000Z",
  ];
  try {
    for (const name of previous) {
      const directory = join(backupRoot, name);
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, "manifest.json"), "{}\n");
    }
    await mkdir(join(backupRoot, "notes"));
    await createWeeklyBackup({
      projectRoot: root,
      environment,
      now: new Date("2026-09-22T00:00:00Z"),
      execute: async (command, args) => {
        if (command === "tar") {
          execFileSync(command, args);
        } else if (args.includes("pg_dump")) {
          const directory = args[args.indexOf("--mount") + 1].match(/src=(.*),dst=\/backup$/)?.[1];
          await writeFile(join(directory, "database.dump"), Buffer.alloc(2048, 65));
        }
      },
    });
    const remaining = await readdir(backupRoot);
    assert.equal(remaining.includes(previous[0]), false);
    assert.equal(remaining.includes(previous[1]), true);
    assert.equal(remaining.includes(previous[2]), true);
    assert.equal(remaining.includes("2026-09-22T00-00-00-000Z"), true);
    assert.equal(remaining.includes("notes"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("failed dump leaves no partial backup directory", async () => {
  const root = await syntheticRepo();
  try {
    await assert.rejects(createWeeklyBackup({
      projectRoot: root,
      environment,
      now: new Date("2026-09-28T13:00:00Z"),
      execute: async () => { throw new Error("synthetic failure"); },
    }), /synthetic failure/);
    assert.deepEqual(await readdir(join(root, "backups", "supabase")), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
