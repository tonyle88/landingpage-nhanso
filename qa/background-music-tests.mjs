import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const musicRuntime = await readFile(
  new URL("next-app/app/use-background-music.ts", root),
  "utf8",
);
const landingRuntime = await readFile(
  new URL("next-app/app/landing-runtime.tsx", root),
  "utf8",
);
const blogRuntime = await readFile(
  new URL("next-app/app/blog/blog-runtime.tsx", root),
  "utf8",
);
const blogPage = await readFile(
  new URL("next-app/app/blog/page.tsx", root),
  "utf8",
);

test("landing and blog share the same background music controller", () => {
  assert.match(landingRuntime, /useBackgroundMusic\(\)/);
  assert.match(blogRuntime, /useBackgroundMusic\(\)/);
  assert.match(blogPage, /id="bg-music"/);
  assert.match(blogPage, /id="musicToggleBtn"/);
});

test("music button explicitly toggles playback and accessible state", () => {
  assert.match(
    musicRuntime,
    /musicToggleButton\.addEventListener\("click", toggleMusic\)/,
  );
  assert.match(musicRuntime, /backgroundMusic\.pause\(\)/);
  assert.match(musicRuntime, /await backgroundMusic\.play\(\)/);
  assert.match(musicRuntime, /isPlaying \? "Tắt nhạc" : "Bật nhạc"/);
  assert.match(musicRuntime, /"aria-pressed"/);
});

test("an explicit mute preference survives navigation between site pages", () => {
  assert.match(
    musicRuntime,
    /MUSIC_PREFERENCE_KEY = "clowcat-background-music-enabled"/,
  );
  assert.match(musicRuntime, /window\.localStorage\.getItem/);
  assert.match(musicRuntime, /saveMusicPreference\(false\)/);
  assert.match(musicRuntime, /saveMusicPreference\(true\)/);
  assert.match(musicRuntime, /window\.addEventListener\("storage"/);
});
