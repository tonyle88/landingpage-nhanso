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
const bookingSource = fs.readFileSync(new URL('../google-apps-script-booking.gs', import.meta.url), 'utf8');
const contentScriptSource = fs.readFileSync(new URL('../google-apps-script-landing-content.gs', import.meta.url), 'utf8');
const adminHtmlSource = fs.readFileSync(new URL('../admin/index.html', import.meta.url), 'utf8');
const adminSource = fs.readFileSync(new URL('../admin/app.js', import.meta.url), 'utf8');
const blogAdminSource = fs.readFileSync(new URL('../admin/blog_admin.js', import.meta.url), 'utf8');
const sanitizerSource = fs.readFileSync(new URL('../assets/js/sanitize-html.js', import.meta.url), 'utf8');

assert.doesNotMatch(
  blogHtmlSource,
  /<style(?:\s|>)/i,
  'Blog-specific styles should live in the shared stylesheet'
);

assert.doesNotMatch(
  blogHtmlSource,
  /\sstyle=/i,
  'Blog markup should not contain inline style attributes'
);

assert.match(
  blogHtmlSource,
  /<script src="assets\/js\/sanitize-html\.js[^>]*><\/script>[\s\S]*<script src="blog\.js[^>]*defer><\/script>/,
  'Blog should load only its sanitizer and blog application scripts locally'
);

assert.doesNotMatch(
  blogHtmlSource,
  /<script[^>]+src="(?:script\.js|admin\/app\.js|admin\/blog_admin\.js)/,
  'Blog must not load landing or admin application scripts'
);

assert.match(
  blogSource,
  /const searchText = normalizeSearchText\(\[\s*a\.title,\s*\]\.join\(' '\)\);/,
  'Blog search index should only include article title'
);

assert.match(
  blogSource,
  /action=getBlogContent/,
  'Blog should load from its dedicated public endpoint'
);

assert.match(
  blogSource,
  /if \(!Array\.isArray\(data\.blogArticles\)\)[\s\S]*action=getLandingContent/,
  'Blog should remain compatible while the new Apps Script deployment is rolling out'
);

assert.match(
  contentScriptSource,
  /function handleGetBlogContent\(\)[\s\S]*blogCategories: getBlogCategories\(false\)[\s\S]*blogArticles: getBlogArticles\(false\)/,
  'Content Apps Script should expose blog data through a dedicated endpoint'
);

assert.match(
  contentScriptSource,
  /function toPublicBlogArticleSummary\(article\)[\s\S]*summary: article\.summary[\s\S]*\};/,
  'Public blog list should return article metadata without full content'
);

const publicBlogSummaryBlock = contentScriptSource.slice(
  contentScriptSource.indexOf('function toPublicBlogArticleSummary(article)'),
  contentScriptSource.indexOf('function buildLandingContentPayload()')
);
assert.doesNotMatch(
  publicBlogSummaryBlock,
  /contentHtml/,
  'Public blog summaries must not include article content HTML'
);

assert.match(
  contentScriptSource,
  /function handleGetBlogArticle\(params\)/,
  'Content Apps Script should expose one enabled article by ID'
);

assert.match(
  contentScriptSource,
  /const CACHE_VALUE_MAX_BYTES = 95000;/,
  'Apps Script cache entries should stay below the per-key size limit'
);

assert.match(
  contentScriptSource,
  /const CACHE_SCHEMA_VERSION = 'v21';[\s\S]*LANDING_CONTENT_CACHE_KEY = 'landing_content_payload_' \+ CACHE_SCHEMA_VERSION;[\s\S]*BLOG_CONTENT_CACHE_KEY = 'blog_content_summaries_' \+ CACHE_SCHEMA_VERSION;[\s\S]*BLOG_ARTICLE_CACHE_PREFIX = 'blog_article_' \+ CACHE_SCHEMA_VERSION \+ '_';/,
  'Public payload caches should share one schema version for deployment invalidation'
);

assert.match(
  contentScriptSource,
  /function handleGetBlogContent\(\)[\s\S]*getJsonCacheValue\(BLOG_CONTENT_CACHE_KEY\)[\s\S]*putJsonCacheValue\(BLOG_CONTENT_CACHE_KEY, payload, BLOG_CONTENT_CACHE_SECONDS\)/,
  'Public blog summaries should use the dedicated cache'
);

assert.match(
  contentScriptSource,
  /function handleGetBlogArticle\(params\)[\s\S]*getBlogArticleCacheKey\(id\)[\s\S]*putJsonCacheValue\(cacheKey, payload, BLOG_CONTENT_CACHE_SECONDS\)/,
  'Individual blog articles should use per-article cache keys'
);

assert.match(
  contentScriptSource,
  /function putJsonCacheValue\(key, payload, expirationSeconds\)[\s\S]*Utilities\.newBlob\(serialized\)\.getBytes\(\)\.length > CACHE_VALUE_MAX_BYTES/,
  'Oversized payloads should skip Apps Script cache safely'
);

assert.match(
  contentScriptSource,
  /function handleSaveBlogArticle\(params\)[\s\S]*clearBlogContentCache\(id\)/,
  'Saving an article should invalidate its detail and the blog summary cache'
);

assert.match(
  contentScriptSource,
  /function handleDeleteBlogArticle\(params\)[\s\S]*clearBlogContentCache\(id\)/,
  'Deleting an article should invalidate its detail and the blog summary cache'
);

assert.match(
  contentScriptSource,
  /function buildPayloadHealthMetrics\(\)/,
  'Content health check should report public payload sizes'
);

assert.match(
  contentScriptSource,
  /performanceOk = performance\.landing\.cacheable && performance\.blogList\.cacheable/,
  'Health check should fail when a shared public payload exceeds the cache limit'
);

assert.match(
  adminSource,
  /Kích thước payload \(giới hạn cache/,
  'Admin health summary should display payload size and cache status'
);

assert.match(
  blogSource,
  /fetchBlogJson\(`\$\{SCRIPT_URL\}\?action=getBlogArticle&id=\$\{encodeURIComponent\(id\)\}`\)/,
  'Blog should fetch full content only for the opened article'
);

assert.match(
  blogSource,
  /const requestId = \+\+activeArticleRequest;/,
  'Article rendering should ignore stale detail requests'
);

assert.match(
  blogSource,
  /function renderBlogHome\(\) \{\s*activeArticleRequest \+= 1;/,
  'Returning to the blog list should cancel an in-flight article render'
);

assert.match(
  blogSource,
  /const BLOG_API_TIMEOUT_MS = 12000;[\s\S]*const BLOG_API_RETRY_COUNT = 1;/,
  'Blog API reads should have a bounded timeout and one retry'
);

assert.match(
  blogSource,
  /async function fetchBlogJson\(url\)[\s\S]*new AbortController\(\)[\s\S]*signal: controller\.signal/,
  'Blog API helper should abort stalled requests'
);

assert.match(
  blogSource,
  /async function loadBlogArticleDetail\(id\) \{\s*const data = await fetchBlogJson/,
  'Article detail should use the resilient blog API helper'
);

assert.match(
  blogSource,
  /if \(!renderedFromCache\) renderBlogLoadError\(\);\s*else console\.warn/,
  'A failed background refresh should preserve already-rendered cache content'
);

const publicLandingPayloadBlock = contentScriptSource.slice(
  contentScriptSource.indexOf('function buildLandingContentPayload()'),
  contentScriptSource.indexOf('function getLandingContentPayloadFromCache()')
);
assert.doesNotMatch(
  publicLandingPayloadBlock,
  /blogArticles:|blogCategories:/,
  'Landing content payload should not include unused blog data'
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
  blogSource,
  /const RELATED_VIEWED_KEY = 'clowcat_blog_related_viewed';/,
  'Related articles should persist viewed history per browser'
);

assert.match(
  blogSource,
  /const related = getFreshRelatedArticles\(article, 5\);/,
  'Article detail should rotate related articles through unseen posts first'
);

assert.match(
  blogSource,
  /data-related-article-id="\$\{escapeAttribute\(r\.id\)\}"/,
  'Related article links should be enhanced for in-page navigation'
);

assert.match(
  blogSource,
  /window\.history\.pushState\(\{\}, '', `\?id=\$\{encodeURIComponent\(articleId\)\}`\);/,
  'Related article clicks should update URL without full page reload'
);

assert.match(
  blogSource,
  /const unviewed = candidates\.filter\(a => !viewedIds\.includes\(a\.id\)\);/,
  'Related rotation should skip viewed posts until the category is exhausted'
);

assert.match(
  blogSource,
  /function setupScrollTopButton\(\)/,
  'Blog page should initialize the scroll-to-top button'
);

assert.match(
  blogSource,
  /scrollTopBtn\.classList\.toggle\('show', window\.scrollY > threshold\);/,
  'Blog scroll-to-top button should become visible after scrolling down'
);

assert.match(
  blogSource,
  /window\.scrollTo\(\{ top: 0, behavior: 'smooth' \}\);/,
  'Blog scroll-to-top button should smoothly scroll back to the top'
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
  sanitizerSource,
  /global\.ClowSanitizeHtml = function ClowSanitizeHtml/,
  'A local HTML sanitizer fallback should be available when the CDN is unavailable'
);

assert.match(
  sanitizerSource,
  /removedWithContent = new Set\([\s\S]*'SCRIPT'/,
  'The local sanitizer should remove executable elements with their content'
);

assert.match(
  sanitizerSource,
  /name\.indexOf\('on'\) === 0/,
  'The local sanitizer should remove event-handler attributes'
);

assert.match(indexSource, /assets\/js\/sanitize-html\.js/, 'Landing should load the local sanitizer fallback');
assert.match(blogHtmlSource, /assets\/js\/sanitize-html\.js/, 'Blog should load the local sanitizer fallback');
assert.match(adminHtmlSource, /assets\/js\/sanitize-html\.js/, 'Admin should load the local sanitizer fallback');

assert.doesNotMatch(
  `${source}\n${blogSource}\n${adminSource}\n${blogAdminSource}`,
  /window\.DOMPurify\s*\?[^:]+:\s*(?:article|sec|raw)/,
  'Rich HTML rendering must not fall back to unsanitized content'
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

assert.match(
  bookingSource,
  /'ID đặt lịch',\s*'Mã thanh toán',\s*'Phương thức thanh toán',\s*'Trạng thái'/,
  'Booking sheet should keep an ID and payment state for idempotent processing'
);

assert.match(
  bookingSource,
  /function handleCreateBooking\(params\)/,
  'Booking should reserve a slot before payment'
);

assert.match(
  bookingSource,
  /return 'CCP' \+ cleanBookingId\(bookingId\)[\s\S]*\.slice\(-16\);/,
  'New SePay payment codes should use the CCP prefix followed by 16 alphanumeric characters'
);

assert.match(
  bookingSource,
  /function handleConfirmBooking\(params\)/,
  'Booking confirmation should use the booking ID'
);

assert.match(
  bookingSource,
  /success:\s*true,\s*\n\s*status:\s*status,/,
  'SePay webhook should acknowledge a successful delivery'
);

assert.match(
  bookingSource,
  /function confirmSelectedManualBooking\(\)/,
  'Manual transfers should require an explicit administrator confirmation'
);

assert.match(
  bookingSource,
  /function reconcilePendingSepayBookings\(\)/,
  'Administrators should be able to reconcile a received SePay payment that an older parser did not match'
);

assert.match(
  bookingSource,
  /function confirmSelectedSepayBookingManually\(\)/,
  'Administrators should have an audited fallback for a paid SePay booking when no webhook was delivered'
);

assert.match(
  bookingSource,
  /source:\s*'manual_sheet_confirmation'/,
  'Manual SePay confirmation should leave an audit entry in the payment log'
);

assert.match(
  bookingSource,
  /function didPaymentArriveWithinHold\(paymentTime, booking\)/,
  'SePay reconciliation should honor the time the payment arrived, not just when an admin runs reconciliation'
);

assert.match(
  bookingSource,
  /CCP-\?\[A-Z0-9\]\{16\}/,
  'SePay parsing should accept both legacy CCP- and current CCP payment codes'
);

assert.match(
  source,
  /if \(result\.status === 'confirmed'\)/,
  'Frontend should finish a payment flow that an administrator reconciled first'
);

assert.doesNotMatch(
  bookingSource,
  /title:\s*ev\.getTitle\(\)/,
  'Public booked slots must not expose Calendar event titles'
);

assert.doesNotMatch(
  bookingSource,
  /params\.action === 'completeBooking'/,
  'GET should not trigger booking confirmation side effects'
);

assert.match(
  bookingSource,
  /const records = getBookingRecords\(sheet\);/,
  'Booked-slot reads should use normalized booking records'
);

assert.doesNotMatch(
  bookingSource,
  /sheet\.getRange\(2, slotCol, lastRow, slotCol\)/,
  'Booked-slot reads must not use the old oversized range'
);

assert.match(
  bookingSource,
  /sheet\.getRange\(rowNumber, 1, 1, HEADERS\.length\)\.setNumberFormat\('@'\)/,
  'Inserted booking formatting should affect one row only'
);

assert.doesNotMatch(
  source,
  /function saveBookingToSheet\(/,
  'Frontend should not use opaque no-cors booking saves'
);

assert.doesNotMatch(
  source,
  /function completeBookingOnServer\(/,
  'Frontend should not trigger booking side effects through GET'
);

assert.match(
  source,
  /return postBookingAction\('createBooking', data\);/,
  'Frontend should create a reservation through the idempotent POST endpoint'
);

console.log('Sprint 2 smoke tests passed.');
