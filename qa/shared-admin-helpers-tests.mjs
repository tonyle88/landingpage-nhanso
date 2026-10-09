import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { loadTypeScript, readNextSource } from "./lib/runtime-sandbox.mjs";

const forms = loadTypeScript("lib/admin/form-input.ts").exports;
const display = loadTypeScript("lib/admin/display-format.ts").exports;
const roles = loadTypeScript("lib/auth/roles.ts").exports;

test("shared form fields preserve trimming, optional truncation and checkbox-independent values", () => {
  const form = new FormData();
  form.set("name", "  Một tên dài  ");
  assert.equal(forms.formText(form, "name"), "Một tên dài");
  assert.equal(forms.formText(form, "name", 3), "Một");
  assert.equal(forms.formText(form, "missing"), "");
  assert.equal(forms.formText(form, "name", 0), "");
});

test("sort-order helper preserves numeric bounds and the caller's error code", () => {
  for (const [input, expected] of [[null, 0], ["", 0], [" 12 ", 12], [10_000, 10_000]]) {
    assert.equal(forms.parseSortOrder(input), expected);
  }
  for (const input of [-1, 10_001, 0.5, "bad", NaN, Infinity]) {
    assert.throws(() => forms.parseSortOrder(input, "invalid sort order"), /invalid sort order/);
  }
});

test("optional IDs retain UUID validation and distinguish creating a record from editing", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  assert.equal(forms.optionalUuid(null), null);
  assert.equal(forms.optionalUuid(" "), null);
  assert.equal(forms.optionalUuid(` ${id} `), id);
  for (const invalid of ["not-a-uuid", "00000000-0000-6000-8000-000000000001", "../record"]) {
    assert.throws(() => forms.optionalUuid(invalid), /invalid id/);
  }
});

test("package, testimonial, category and section parsers use shared input rules without losing business checks", () => {
  const dependencies = { "./form-input": forms };
  const blog = loadTypeScript("lib/admin/blog-post-input.ts", dependencies, { URL }).exports;
  const packageParser = loadTypeScript("lib/admin/package-input.ts", dependencies).exports;
  const testimonialParser = loadTypeScript("lib/admin/testimonial-input.ts", dependencies, { URL }).exports;
  const categoryParser = loadTypeScript("lib/admin/blog-category-input.ts", {
    ...dependencies, "./blog-post-input": blog,
  }).exports;
  const sectionParser = loadTypeScript("lib/admin/landing-section-input.ts", dependencies).exports;
  const form = new FormData();
  for (const [key, value] of Object.entries({
    code: "demo", name: "Tên thử", online_price: "100000", currency: "vnd",
    features: " Một \n Hai ", image_url: "https://example.test/image.jpg", alt_text: "Ảnh thử",
    display_name: "Section thử", content_html: "<p>Nội dung</p>", sort_order: "7", enabled: "on",
  })) form.set(key, value);
  const packages = packageParser.packagePayloadFromForm(form);
  assert.equal(packages.online_price, "100000");
  assert.equal(packages.currency, "VND");
  assert.deepEqual([...packages.features], ["Một", "Hai"]);
  const readers = [packageParser.packagePayloadFromForm, testimonialParser.testimonialPayloadFromForm,
    categoryParser.blogCategoryPayloadFromForm, sectionParser.landingSectionPayloadFromForm];
  for (const read of readers) assert.equal(read(form).sort_order, 7);
  form.set("sort_order", "1.5");
  for (const read of readers) assert.throws(() => read(form), /invalid (sort )?order/);
  form.set("sort_order", "0");
  form.set("image_url", "javascript:alert(1)");
  assert.throws(() => testimonialParser.testimonialPayloadFromForm(form), /invalid URL/);
  form.set("content_html", '<p onclick="alert(1)">x</p>');
  assert.throws(() => sectionParser.landingSectionPayloadFromForm(form), /invalid section HTML/);
  form.set("online_price", "1.2");
  assert.throws(() => packageParser.packagePayloadFromForm(form), /invalid price/);
});

test("shared access guard preserves every role/permission decision and reads each request's principal", async () => {
  let principal = null, reads = 0;
  const guard = loadTypeScript("lib/auth/admin-access.ts", {
    "server-only": {}, "./roles": roles,
    "./admin-principal": { getAdminPrincipal: async () => { reads++; return principal; } },
    "next/navigation": { redirect: (url) => { throw new Error(`REDIRECT ${url}`); } },
  }).exports;
  for (const role of [null, "owner", "admin", "editor", "auditor"]) {
    principal = role ? { userId: `synthetic-${role}`, role, email: null } : null;
    for (const permission of ["manage_roles", "manage_content", "manage_operations", "read_operations", "read_audit"]) {
      if (roles.can(role, permission)) assert.equal(await guard.requireAdminPermission(permission), principal);
      else await assert.rejects(guard.requireAdminPermission(permission), /REDIRECT \/admin\/login\?reason=unauthorized/);
    }
  }
  assert.equal(reads, 25);
  principal = { userId: "synthetic-editor", role: "editor", email: null };
  assert.equal(await guard.requireContentManager(), principal);
});

test("display helpers preserve date-only strings, file-size rounding and caller-specific empty labels", () => {
  assert.equal(display.formatBirthDate("1990-06-28"), "28/06/1990");
  assert.equal(display.formatBirthDate(null), "—");
  assert.equal(display.formatBirthDate("", ""), "");
  assert.equal(display.formatBirthDate("invalid-date"), "invalid-date");
  assert.equal(display.formatArchiveBytes(0), "0 KB");
  assert.equal(display.formatArchiveBytes(0, "1 KB"), "1 KB");
  assert.equal(display.formatArchiveBytes(1), "1 KB");
  assert.equal(display.formatArchiveBytes(1024), "1 KB");
  assert.equal(display.formatArchiveBytes(1024 ** 2), "1.0 MB");
});

test("pagination keeps the existing safe-positive-page contract", () => {
  const { parsePositivePage } = loadTypeScript("lib/pagination.ts").exports;
  for (const value of [null, undefined, "", "bad", "0", "-1", "9007199254740992"]) {
    assert.equal(parsePositivePage(value), 1);
  }
  assert.equal(parsePositivePage("2abc"), 2);
  assert.equal(parsePositivePage(" 3 "), 3);
});

test("calculator defers the render module and shares presentation definitions with exported reports", () => {
  const calculator = readNextSource("app/admin/numerology/numerology-calculator.tsx");
  assert.match(calculator, /await import\("@\/lib\/admin\/numerology-export"\)/);
  assert.doesNotMatch(calculator, /import\s+\{[^}]*\}\s+from\s+"@\/lib\/admin\/numerology-export"/);
  assert.doesNotMatch(calculator, /function (renderCustomerSummaryAsJpeg|createPdfFromJpegPages|drawRoundRect)/);
  assert.match(calculator, /from "@\/lib\/admin\/numerology-presentation"/);
  assert.match(readNextSource("lib/admin/numerology-export.ts"), /from "\.\/numerology-presentation"/);
});

test("PDF packaging preserves two JPEG pages, valid binary offsets and A4 dimensions", async () => {
  const presentation = loadTypeScript("lib/admin/numerology-presentation.ts").exports;
  const context = loadTypeScript("lib/admin/numerology-export.ts", {
    "./numerology-presentation": presentation,
  }, { Blob, TextEncoder });
  const pages = [new Blob([new Uint8Array([255, 216, 1, 255, 217])]),
    new Blob([new Uint8Array([255, 216, 2, 255, 217])])];
  context.syntheticPages = pages;
  const pdf = await vm.runInContext("createPdfFromJpegPages(syntheticPages)", context);
  const bytes = Buffer.from(await pdf.arrayBuffer());
  const text = bytes.toString("latin1");
  assert.equal(pdf.type, "application/pdf");
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.match(text, /\/Count 2/);
  assert.equal((text.match(/\/Filter \/DCTDecode/g) || []).length, 2);
  assert.equal((text.match(/\/MediaBox \[0 0 595\.28 841\.89\]/g) || []).length, 2);
  const xrefOffset = Number(text.match(/startxref\n(\d+)/)[1]);
  assert.equal(text.slice(xrefOffset, xrefOffset + 4), "xref");
  const entries = text.slice(xrefOffset).split("\n").slice(3, 11);
  entries.forEach((entry, index) => {
    const offset = Number(entry.slice(0, 10));
    assert.ok(text.slice(offset).startsWith(`${index + 1} 0 obj\n`));
  });
});
