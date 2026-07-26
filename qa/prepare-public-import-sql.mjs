import { chmod, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildPublicImportSql } from "./lib/public-content-sql.mjs";

const root = resolve(import.meta.dirname, "..");
const inputPath = resolve(root, ".staging-import/public-content-import.json");
const outputPath = resolve(root, ".staging-import/public-content-import.sql");
const document = JSON.parse(await readFile(inputPath, "utf8"));
const payload = document.tables;
const sql = buildPublicImportSql(payload);

await writeFile(outputPath, sql, { encoding: "utf8", mode: 0o600 });
await chmod(outputPath, 0o600);

console.log(
  JSON.stringify({
    status: "PASS",
    target: "staging-only",
    tables: Object.keys(payload).length,
    rows: Object.values(payload).reduce((sum, rows) => sum + rows.length, 0),
    output: ".staging-import/public-content-import.sql",
  }),
);
