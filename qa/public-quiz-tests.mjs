import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("adds Quiz to public navigation and reads enabled admin packages", () => {
  const landing = read("next-app/components/landing/landing-sections.tsx");
  const blog = read("next-app/app/blog/page.tsx");
  const page = read("next-app/app/quiz/page.tsx");
  assert.match(landing, /\["\/quiz", "Quiz"\]/);
  assert.match(blog, /href: "\/quiz", label: "Quiz"/);
  assert.match(page, /getPublicPackages\(\)/);
});

test("recommends each package family from matching answers", async () => {
  const moduleUrl = pathToFileURL(path.join(root, "next-app/lib/package-quiz.ts")).href;
  const { QUIZ_QUESTIONS, recommendPackages } = await import(moduleUrl);
  const base = {
    onlinePrice: 500000,
    offlinePrice: 550000,
    currency: "VND",
    unit: "/buổi",
    icon: "sparkles",
    accent: "teal",
    featured: false,
    badge: "",
    features: [],
    buttonText: "Đặt lịch",
    enabled: true,
  };
  const packages = [
    { ...base, code: "year", name: "Dự Đoán Năm Cá Nhân", sortOrder: 10 },
    { ...base, code: "big3", name: "Phân Tích 3 Chỉ Số Tính Cách", sortOrder: 20 },
    { ...base, code: "big7", name: "Phân Tích Toàn Diện 7 Chỉ Số", sortOrder: 30 },
    { ...base, code: "combo3", name: "Dịch vụ Tư Vấn 3-in-1 Đặc Biệt", sortOrder: 40 },
  ];

  const cases = [
    ["next-year", "year"],
    ["understand-self", "big3"],
    ["whole-map", "big7"],
    ["heal", "combo3"],
  ];
  for (const [firstAnswer, expected] of cases) {
    const profile = expected === "year" ? "focused" : expected === "big3" ? "three-core" : expected === "big7" ? "full-numerology" : "multi-method";
    const answers = Object.fromEntries(QUIZ_QUESTIONS.map((question, index) => [
      question.id,
      index === 0 ? firstAnswer : index === 1 ? profile : question.options.find((option) => option.weights[expected === "year" ? "year" : expected === "big3" ? "core" : expected === "big7" ? "deep" : "combo"] === Math.max(...question.options.map((option) => option.weights[expected === "year" ? "year" : expected === "big3" ? "core" : expected === "big7" ? "deep" : "combo"])))?.id,
    ]));
    assert.equal(recommendPackages(packages, answers)[0].item.code, expected);
  }
});

test("keeps the result CTA connected to the recommended admin package", () => {
  const client = read("next-app/app/quiz/quiz-experience.tsx");
  const packagesRuntime = read("next-app/app/use-packages.ts");
  assert.match(client, /encodeURIComponent\(recommendation\.item\.code\)/);
  assert.match(packagesRuntime, /searchParams\.get\("package"\)/);
  assert.doesNotMatch(client, /const packages\s*=\s*\[/);
});
