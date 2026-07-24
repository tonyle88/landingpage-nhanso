const TABLES = {
  site_settings: {
    conflict: "key",
    json: new Set(["value"]),
  },
  landing_sections: { conflict: "section_key", json: new Set() },
  packages: { conflict: "code", json: new Set(["features"]) },
  testimonials: { conflict: "id", json: new Set() },
  blog_categories: { conflict: "slug", json: new Set() },
  blog_posts: { conflict: "slug", json: new Set() },
};

function identifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }
  return `"${value}"`;
}

function literal(value, json = false) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite SQL number");
    return String(value);
  }
  const source = json ? JSON.stringify(value) : String(value);
  const escaped = source.replaceAll("'", "''");
  return `'${escaped}'${json ? "::jsonb" : ""}`;
}

function buildUpsert(table, rows, config) {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const columns = Object.keys(rows[0]);
  if (!columns.includes(config.conflict)) {
    throw new Error(`${table} is missing conflict key ${config.conflict}`);
  }
  for (const row of rows) {
    if (
      Object.keys(row).length !== columns.length ||
      columns.some((column) => !(column in row))
    ) {
      throw new Error(`${table} rows do not share one column shape`);
    }
  }
  const values = rows
    .map(
      (row) =>
        `  (${columns
          .map((column) => literal(row[column], config.json.has(column)))
          .join(", ")})`,
    )
    .join(",\n");
  const updates = columns
    .filter((column) => column !== config.conflict)
    .map(
      (column) =>
        `${identifier(column)} = EXCLUDED.${identifier(column)}`,
    )
    .join(",\n  ");
  return [
    `INSERT INTO public.${identifier(table)} (${columns.map(identifier).join(", ")})`,
    "VALUES",
    values,
    `ON CONFLICT (${identifier(config.conflict)}) DO UPDATE SET`,
    `  ${updates};`,
  ].join("\n");
}

export function buildPublicImportSql(payload) {
  const statements = Object.entries(TABLES).map(([table, config]) =>
    buildUpsert(table, payload[table], config),
  );
  if (statements.some((statement) => !statement)) {
    throw new Error("Every public content table must contain at least one row");
  }
  return [
    "-- Generated public-content staging import. Do not commit this file.",
    "BEGIN;",
    ...statements,
    "COMMIT;",
    "",
  ].join("\n\n");
}
