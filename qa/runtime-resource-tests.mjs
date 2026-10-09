import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { loadTypeScript as loadTs, readNextSource as read } from "./lib/runtime-sandbox.mjs";

function animationHarness() {
  const frames = new Map();
  let nextId = 0;
  const document = new EventTarget();
  document.hidden = false;
  const motion = new EventTarget();
  motion.matches = false;
  const window = {
    matchMedia: () => motion,
    requestAnimationFrame: (callback) => {
      frames.set(++nextId, callback);
      return nextId;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
  };
  const context = loadTs("lib/browser-animation.ts", {}, { window, document });
  return {
    ...context.exports, frames, document, motion,
    step(timestamp) {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(timestamp));
    },
  };
}

test("scroll bursts schedule one update per frame and cleanup cancels queued work", () => {
  const harness = animationHarness();
  let updates = 0;
  const scheduler = harness.createFrameScheduler(() => updates++);
  for (let index = 0; index < 100; index++) scheduler.schedule();
  assert.equal(harness.frames.size, 1);
  harness.step(0);
  assert.equal(updates, 1);
  scheduler.schedule();
  scheduler.cancel();
  harness.step(16);
  assert.equal(updates, 1);
});

test("particles stop scheduling while hidden or reduced motion is enabled, then resume", () => {
  const harness = animationHarness();
  const draws = [];
  const dispose = harness.startVisibleAnimation((timestamp, elapsed) => draws.push([timestamp, elapsed]));
  for (let frame = 0; frame <= 120; frame++) harness.step(frame * 1000 / 120);
  assert.ok(draws.length <= 31 && draws.length >= 20);
  harness.document.hidden = true;
  harness.document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(harness.frames.size, 0);
  const previousCount = draws.length;
  harness.step(20_000);
  assert.equal(draws.length, previousCount);
  harness.document.hidden = false;
  harness.document.dispatchEvent(new Event("visibilitychange"));
  harness.step(30_000);
  assert.equal(draws.length, previousCount + 1);
  assert.ok(draws.at(-1)[1] < 50, "Resuming must not apply the entire hidden interval");
  harness.motion.matches = true;
  harness.motion.dispatchEvent(new Event("change"));
  assert.equal(harness.frames.size, 0);
  harness.motion.matches = false;
  harness.motion.dispatchEvent(new Event("change"));
  assert.equal(harness.frames.size, 1);
  dispose();
  harness.document.dispatchEvent(new Event("visibilitychange"));
  harness.motion.dispatchEvent(new Event("change"));
  assert.equal(harness.frames.size, 0);
});

test("a page opened in the background starts no animation until visible", () => {
  const harness = animationHarness();
  harness.document.hidden = true;
  const dispose = harness.startVisibleAnimation(() => {});
  assert.equal(harness.frames.size, 0);
  harness.document.hidden = false;
  harness.document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(harness.frames.size, 1);
  dispose();
});

for (const width of [390, 1440]) {
  test(`shared canvas draws the expected particle budget at width ${width} and releases resources`, () => {
    let effect, draw, stopped = false, circles = 0, connections = 0;
    const canvasContext = {
      clearRect() {}, beginPath() {}, fill() {}, moveTo() {}, stroke() {},
      arc: () => circles++, lineTo: () => connections++,
    };
    const canvas = { getContext: () => canvasContext };
    const resizeListeners = new Set();
    const context = loadTs("app/use-particles-canvas.ts", {
      react: { useEffect: (callback) => { effect = callback; } },
      "@/lib/browser-animation": { startVisibleAnimation: (callback) => {
        draw = callback;
        return () => { stopped = true; };
      } },
    }, {
      document: { querySelector: () => canvas },
      window: {
        innerWidth: width, innerHeight: 800,
        addEventListener: (_, listener) => resizeListeners.add(listener),
        removeEventListener: (_, listener) => resizeListeners.delete(listener),
      },
    });
    context.exports.useParticlesCanvas();
    const cleanup = effect();
    draw(0, 1000 / 30);
    assert.equal(circles, width < 768 ? 30 : 70);
    if (width < 768) assert.equal(connections, 0);
    assert.equal(canvas.width, width);
    cleanup();
    assert.equal(stopped, true);
    assert.equal(resizeListeners.size, 0);
  });
}

async function initializeBlog(initial, fallback, search = "") {
  const classes = new Set();
  const storage = new Map();
  let requests = 0, cacheReads = 0;
  const context = vm.createContext({
    document: {
      readyState: "loading", addEventListener() {},
      getElementById: () => ({ textContent: JSON.stringify(initial) }),
      body: { classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) } },
    },
    window: { location: { search }, setTimeout, clearTimeout },
    localStorage: {
      getItem: (key) => { cacheReads++; return storage.get(key); },
      setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key),
    },
    fetch: async () => { requests++; return { ok: true, json: async () => fallback }; },
    URLSearchParams, AbortController, console,
    rendered: [],
  });
  vm.runInContext(read("public/blog.js"), context);
  vm.runInContext(`
    setupNavbar = setupBlogHistoryNavigation = setupScrollTopButton = () => {};
    renderBlogHome = () => rendered.push('home');
    renderArticleDetail = async (id) => rendered.push(id);
  `, context);
  await context.initializeBlogPage();
  return { requests, cacheReads, classes, rendered: context.rendered, context };
}

for (const search of ["", "?id=synthetic-post"]) {
  test(`blog with both Supabase slices avoids external refresh and renders once (${search || "home"})`, async () => {
    const result = await initializeBlog({ categories: [{ id: "synthetic-category" }], posts: [{ id: "synthetic-post" }] }, null, search);
    assert.equal(result.requests, 0);
    assert.equal(result.cacheReads, 0);
    assert.deepEqual([...result.rendered], [search ? "synthetic-post" : "home"]);
    assert.equal(result.classes.has("landing-content-loading"), false);
  });
}

test("blog still fetches its fallback when one Supabase slice is absent", async () => {
  const result = await initializeBlog(
    { categories: [], posts: [{ id: "synthetic-post" }] },
    { ok: true, blogCategories: [{ id: "fallback-category" }], blogArticles: [] },
  );
  assert.equal(result.requests, 1);
  assert.equal(vm.runInContext("blogCategories[0].id", result.context), "fallback-category");
  assert.equal(vm.runInContext("blogArticles[0].id", result.context), "synthetic-post");
  assert.equal(result.classes.has("landing-content-loading"), false);
});

for (const complete of [true, false]) {
  test(`landing uses Google only for missing data slices (complete=${complete})`, async () => {
    let effect, requests = 0, cacheReads = 0, settled = 0;
    const classes = new Set();
    const timers = new Set();
    const context = loadTs("app/use-landing-content.ts", {
      react: { useEffect: (callback) => { effect = callback; } },
      "@/lib/landing-text": { landingPlainText: String },
    }, {
      AbortController, Event, DOMException, console,
      document: { body: { classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) } } },
      window: {
        ClowLandingContentRuntime: { applyLegacy() {} },
        setTimeout: (callback) => { timers.add(callback); return callback; },
        clearTimeout: (callback) => timers.delete(callback),
        dispatchEvent: () => settled++,
      },
      fetchFallback: async () => { requests++; return { items: [], sectionsLayout: [] }; },
      cached: () => { cacheReads++; return null; },
    });
    vm.runInContext("applyReactContent = writeCache = () => {}; readCache = cached; fetchWithRetry = fetchFallback;", context);
    context.exports.useLandingContent(true, true, { items: [], sectionsLayout: [] }, true, complete);
    const cleanup = effect();
    await new Promise(setImmediate);
    assert.equal(requests, complete ? 0 : 1);
    assert.equal(cacheReads, complete ? 0 : 1);
    assert.equal(settled, 1);
    assert.equal(timers.size, 0);
    assert.equal(classes.has("landing-content-loading"), false);
    cleanup();
  });
}

test("an unmounted landing does not continue loading after its bridge resolves", async () => {
  let effect, requests = 0;
  const context = loadTs("app/use-landing-content.ts", {
    react: { useEffect: (callback) => { effect = callback; } },
    "@/lib/landing-text": { landingPlainText: String },
  }, {
    AbortController, Event, DOMException, console,
    document: { body: { classList: { add() {}, remove() {} } } },
    window: { ClowLandingContentRuntime: { applyLegacy() {} }, setTimeout: () => 1, clearTimeout() {} },
    fetchFallback: async () => { requests++; },
  });
  vm.runInContext("fetchWithRetry = fetchFallback;", context);
  context.exports.useLandingContent();
  effect()();
  await new Promise(setImmediate);
  assert.equal(requests, 0);
});

test("public setting reads cache by key, exclude private rows and clear timeout resources", async () => {
  const rows = new Map([
    ["public.one", { is_public: true, value: "one" }],
    ["public.two", { is_public: true, value: "two" }],
    ["private.one", { is_public: false, value: "synthetic-private" }],
  ]);
  let queries = 0;
  const cache = new Map();
  const timers = new Set();
  const context = loadTs("lib/supabase/public-site-setting.ts", {
    "server-only": {},
    "next/cache": { unstable_cache: (readSetting, _keyParts, options) => {
      assert.equal(options.revalidate, 300);
      assert.deepEqual([...options.tags], ["public-site-settings"]);
      return (key) => {
        if (!cache.has(key)) cache.set(key, readSetting(key));
        return cache.get(key);
      };
    } },
    "./server": { createPublicServerClient: () => ({ from(table) {
      assert.equal(table, "site_settings");
      const filters = {};
      return {
        select(columns) { assert.equal(columns, "value"); return this; },
        eq(key, value) { filters[key] = value; return this; },
        abortSignal(signal) { assert.equal(signal.aborted, false); return this; },
        async maybeSingle() {
          queries++;
          const row = rows.get(filters.key);
          return { data: row?.is_public === filters.is_public ? row : null, error: null };
        },
      };
    } }) },
  }, {
    AbortController,
    setTimeout: (callback) => { timers.add(callback); return callback; },
    clearTimeout: (callback) => timers.delete(callback),
  });
  const getSetting = context.exports.getPublicSiteSetting;
  assert.equal(await getSetting("public.one"), "one");
  assert.equal(await getSetting("public.one"), "one");
  assert.equal(await getSetting("public.two"), "two");
  assert.equal(queries, 2);
  assert.equal(await getSetting("private.one"), null);
  assert.equal(await getSetting("missing"), null);
  assert.equal(timers.size, 0);
  rows.get("public.one").value = "updated";
  cache.clear();
  assert.equal(await getSetting("public.one"), "updated");
});

test("public settings recover with a null fallback when the client is unavailable or a read fails", async () => {
  for (const failure of ["unconfigured", "query-error", "throw", "timeout"]) {
    const timers = new Set();
    let signal;
    const query = {
      select() { return this; }, eq() { return this; },
      abortSignal(value) { signal = value; return this; },
      maybeSingle() {
        if (failure === "throw") throw new Error("synthetic database failure");
        if (failure === "timeout") return new Promise((resolve) => {
          signal.addEventListener("abort", () => resolve({ data: null, error: { message: "aborted" } }));
        });
        return Promise.resolve({ data: null, error: { message: "synthetic query error" } });
      },
    };
    const context = loadTs("lib/supabase/public-site-setting.ts", {
      "server-only": {}, "next/cache": { unstable_cache: (callback) => callback },
      "./server": { createPublicServerClient: () => failure === "unconfigured" ? null : { from: () => query } },
    }, {
      AbortController,
      setTimeout: (callback) => { timers.add(callback); return callback; },
      clearTimeout: (callback) => timers.delete(callback),
    });
    const pending = context.exports.getPublicSiteSetting("synthetic.key");
    if (failure === "timeout") [...timers].forEach((callback) => callback());
    assert.equal(await pending, null);
    assert.equal(timers.size, 0);
  }
});

test("saving quiz content or changing a general setting invalidates the shared public cache", async () => {
  const tags = [];
  const dependencies = {
    "next/cache": { revalidatePath() {}, updateTag: (tag) => tags.push(tag) },
    "next/navigation": { redirect: (url) => { throw new Error(`REDIRECT ${url}`); } },
    "@/lib/auth/admin-principal": { getAdminPrincipal: async () => ({ role: "owner" }) },
    "@/lib/auth/admin-access": {
      requireContentManager: async () => ({ role: "owner" }),
      requireAdminPermission: async () => ({ role: "owner" }),
    },
    "@/lib/auth/roles": { can: () => true },
    "@/lib/supabase/auth-server": { createAuthServerClient: async () => ({ rpc: async () => ({ error: null }) }) },
    "@/lib/quiz-question-schema": { parseQuizQuestions: (value) => value, QUIZ_SETTING_KEY: "quiz.questions" },
    "@/lib/quiz-hub-content": { parseQuizHubContent: (value) => value, QUIZ_HUB_SETTING_KEY: "quiz.hub" },
    "@/lib/self-discovery-tools": {
      parseVakadQuestions: (value) => value, parseLoveLanguageQuestions: (value) => value, parseWheelCategories: (value) => value,
      VAKAD_SETTING_KEY: "quiz.vakad", LOVE_LANGUAGE_SETTING_KEY: "quiz.love", LIFE_WHEEL_SETTING_KEY: "quiz.wheel",
    },
    "@/lib/admin/site-setting-input": { settingPayloadFromForm: () => ({ key: "synthetic.setting", payload: { value: "synthetic" } }) },
  };
  const quiz = loadTs("app/admin/quiz/actions.ts", dependencies, { console }).exports;
  const settings = loadTs("app/admin/settings/actions.ts", dependencies, { console }).exports;
  const form = new FormData();
  for (const field of ["questions", "vakadQuestions", "loveQuestions", "wheelCategories"]) form.set(field, "[]");
  form.set("key", "synthetic.setting");
  form.set("confirmation", "XOA");
  for (const action of [
    quiz.saveQuizQuestionsAction, quiz.saveQuizHubContentAction, quiz.saveVakadQuestionsAction,
    quiz.saveLoveLanguageQuestionsAction, quiz.saveLifeWheelQuestionsAction,
    settings.saveSettingAction, settings.deleteSettingAction,
  ]) {
    tags.length = 0;
    await assert.rejects(action(form), /REDIRECT .*status=(saved|deleted)/);
    assert.ok(tags.includes("public-site-settings"));
  }
});

test("landing database reads download only content rows and columns needed by the page", async () => {
  const downloaded = [];
  const rows = {
    site_settings: [
      { key: "landing.content.hero.badge", is_public: true, value: { value: "synthetic badge", selector: ".hero-badge" } },
      { key: "quiz.questions", is_public: true, value: { questions: Array(20).fill("unused by landing") } },
      { key: "landing.content.private", is_public: false, value: "synthetic-private" },
    ],
    landing_sections: [{ section_key: "hero", section_type: "builtin", sort_order: 1, enabled: true, display_name: "Hero" }],
  };
  const mapper = loadTs("lib/landing-content.ts").exports;
  const context = loadTs("lib/supabase/public-landing-content.ts", {
    "server-only": {}, "next/cache": { unstable_cache: (callback) => callback },
    "@/lib/landing-content": mapper,
    "./server": { createPublicServerClient: () => ({ from(table) {
      const filters = [];
      let columns;
      return {
        select(value) { columns = value.split(","); return this; },
        eq(key, value) { filters.push((row) => row[key] === value); return this; },
        like(key, pattern) { filters.push((row) => row[key].startsWith(pattern.slice(0, -1))); return this; },
        order() { return this; }, abortSignal() { return this; },
        then(resolve) {
          assert.ok(!columns.includes("*"));
          const data = rows[table].filter((row) => filters.every((filter) => filter(row)))
            .map((row) => Object.fromEntries(columns.map((column) => [column, row[column]])));
          downloaded.push({ table, rows: data.length });
          return Promise.resolve({ data, error: null }).then(resolve);
        },
      };
    } }) },
  }, { AbortController, setTimeout, clearTimeout });
  const result = await context.exports.getPublicLandingContent();
  assert.deepEqual(downloaded, [{ table: "site_settings", rows: 1 }, { table: "landing_sections", rows: 1 }]);
  assert.equal(result.content.items[0].key, "hero.badge");
  assert.equal(result.content.sectionsLayout[0].id, "hero");
  assert.equal(result.source, "supabase");
});
