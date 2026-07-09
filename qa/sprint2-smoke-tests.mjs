import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../script.js', import.meta.url), 'utf8');

function extractBlock(startPattern, endPattern) {
  const start = source.search(startPattern);
  const end = source.search(endPattern);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Cannot extract block ${startPattern} -> ${endPattern}`);
  }
  return source.slice(start, end);
}

const constants = extractBlock(/const MINI_REPORT_MEANINGS = /, /let miniReportContent = /);
const numerology = extractBlock(/function sumDigits/, /function populatePackageOptions/);
const feedback = extractBlock(/function normalizeFeedbackImages/, /function renderTestimonials/);

const context = {
  console,
  Date,
  Number,
  Math,
  String,
  Boolean,
  Array,
  Object,
};

vm.createContext(context);
vm.runInContext(`${constants}\n${numerology}\n${feedback}`, context);

assert.equal(
  context.calculateNameNumber('Nguyễn Phạm Hoàng Thy', true).display,
  '5',
  'Soul number should follow the approved Y/vowel rule'
);

assert.equal(
  context.calculateLifePathNumber(7, 10, 2003).display,
  '13/4',
  'Life path should keep final karmic debt 13/4'
);

assert.equal(
  context.calculateNameNumber('A A A A A A A A A A A', false).display,
  '11/2',
  'Mission/name number should keep master number 11/2'
);

assert.deepEqual(
  context.normalizeFeedbackImages([
    { url: 'old', createdAt: '01/07/2026, 10:00' },
    { url: 'new', createdAt: '06/07/2026, 10:00' },
  ]).map((item) => item.url),
  ['new', 'old'],
  'Feedback images should sort newest first by date'
);

assert.deepEqual(
  context.normalizeFeedbackImages([
    { url: 'old' },
    { url: 'new' },
  ]).map((item) => item.url),
  ['new', 'old'],
  'Feedback images should treat later rows as newer when dates are missing'
);

const blogSource = fs.readFileSync(new URL('../blog.js', import.meta.url), 'utf8');
const indexSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const blogHtmlSource = fs.readFileSync(new URL('../blog.html', import.meta.url), 'utf8');
const styleSource = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
assert.match(
  blogSource,
  /const searchText = normalizeSearchText\(\[\s*a\.title,\s*\]\.join\(' '\)\);/,
  'Blog search index should only include article title'
);

assert.match(
  blogSource,
  /visibleCards\.length > \(window\.innerWidth <= 700 \? 1 : 3\)/,
  'Blog carousel controls should appear after 3 visible cards on desktop'
);

assert.match(
  blogSource,
  /<div class="blog-carousel-controls"[\s\S]*data-carousel-prev[\s\S]*data-carousel-next/,
  'Blog category sections should render previous/next carousel controls'
);

assert.match(
  source,
  /tag\.textContent = sec\.tag;/,
  'Generic section tag should render as text, not raw HTML'
);

assert.match(
  source,
  /title\.textContent = sec\.title \|\| '';/,
  'Generic section title should render as text, not raw HTML'
);

assert.match(
  source,
  /content\.innerHTML = sanitizeGenericSectionHtml\(sec\.contentHtml\);/,
  'Generic section content should pass through sanitizer before render'
);

assert.match(
  styleSource,
  /\.generic-content[\s\S]*overflow-wrap: anywhere;/,
  'Generic section content should wrap long text on mobile'
);

assert.match(
  styleSource,
  /\.generic-content :where\(img, video, iframe\)[\s\S]*max-width: 100%;/,
  'Generic section media should not overflow its container'
);

assert.match(
  styleSource,
  /\.generic-content table[\s\S]*overflow-x: auto;/,
  'Generic section tables should scroll instead of overflowing'
);

assert.match(
  indexSource,
  /<audio id="bg-music"[^>]*preload="none"/,
  'Landing page music should not preload the full audio file during initial render'
);

assert.match(
  indexSource,
  /<link rel="preload" href="assets\/images\/hero_bg\.webp" as="image" type="image\/webp" fetchpriority="high"/,
  'Landing page should preload the hero WebP background'
);

assert.match(
  indexSource,
  /class="logo-img" width="568" height="567"/,
  'Landing navbar logo should reserve image dimensions'
);

assert.match(
  indexSource,
  /class="footer-logo" width="568" height="567" loading="lazy" decoding="async"/,
  'Landing footer logo should lazy-load'
);

assert.match(
  blogHtmlSource,
  /class="logo-img" width="568" height="567"/,
  'Blog navbar logo should reserve image dimensions'
);

assert.match(
  blogHtmlSource,
  /class="footer-logo" width="568" height="567" loading="lazy" decoding="async"/,
  'Blog footer logo should lazy-load'
);

assert.match(
  blogSource,
  /<img src="\$\{a\.thumbnail\}" loading="lazy" decoding="async"/,
  'Blog list thumbnails should lazy-load'
);

assert.match(
  blogSource,
  /<img src="\$\{r\.thumbnail\}" loading="lazy" decoding="async"/,
  'Related article thumbnails should lazy-load'
);

console.log('Sprint 2 smoke tests passed.');
