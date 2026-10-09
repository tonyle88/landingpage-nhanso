import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("../../next-app/node_modules/typescript");

/** Đọc riêng file mã nguồn được chỉ định cho kiểm tra cục bộ; không nạp .env. */
export function readNextSource(path) {
  return readFileSync(new URL(`../../next-app/${path}`, import.meta.url), "utf8");
}

/**
 * Chạy một module TS trong sandbox với các dependency và API do test cung cấp.
 * Dependency ngoài danh sách sẽ làm test lỗi; không tự kết nối dịch vụ hoặc lấy secret.
 * Dùng chung cho kiểm tra tài nguyên trình duyệt và các helper quản trị.
 */
export function loadTypeScript(path, dependencies = {}, globals = {}) {
  const context = vm.createContext({
    exports: {},
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    ...globals,
  });
  const { outputText } = ts.transpileModule(readNextSource(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInContext(outputText, context, { filename: path });
  return context;
}
