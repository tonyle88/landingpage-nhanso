/* =============================================
   JAVASCRIPT FOR NHÂN SỐ HỌC LANDING PAGE
   ============================================= */

// Sheet cũ: đặt lịch, Calendar, Email, lưu booking.
const BOOKING_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxbWZXF2iCsWsr0cWL0JVChANywEq7D7l_mCIvrvqZs78vSOsPej3PuXFgHbOiVNoKr/exec';
// Sheet mới: cấu hình nội dung từng section của landing page.
const LANDING_CONTENT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3m9zkv9mX-BgMtB7DZj2rMrZtkAAOFDQow2UKxttXRz8G5Zlc4qponSGrvPBxJwEO/exec';
const LANDING_CONTENT_ENABLED = true;
const LANDING_CONTENT_TIMEOUT_MS = 9000;
const LANDING_CONTENT_RETRY_COUNT = 2;
const LANDING_CONTENT_LOADING_MAX_MS = 1600;
const LANDING_CONTENT_LOADING_CLASS = 'landing-content-loading';
const LANDING_CONTENT_CACHE_KEY = 'clowcat_landing_content_cache_v5';
const LANDING_CONTENT_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const PAYMENT_SETTINGS_REFRESH_MAX_AGE_MS = 60 * 1000;
const PAYMENT_SETTINGS_REFRESH_TIMEOUT_MS = 4500;
const BOOKING_API_TIMEOUT_MS = 12000;
const BOOKING_API_RETRY_COUNT = 2;
const DEFAULT_TESTIMONIAL_IMAGES = Array.from({ length: 10 }, (_, index) => ({
  url: `assets/images/testimonials/testimonial-${String(index + 1).padStart(2, '0')}.png`,
}));
const LANDING_CONTENT_ITEM_OVERRIDES = {
  'hero.badge': { selector: '.hero-badge', type: 'text' },
  'hero.title_1': { selector: '.hero-title .title-line:nth-child(1)', type: 'text' },
  'hero.title_2': { selector: '.hero-title .title-line:nth-child(2)', type: 'text' },
  'hero.title_3': { selector: '.hero-title .title-line:nth-child(3)', type: 'text' },
  'hero.subtitle': { selector: '.hero-subtitle', type: 'text' },
  'hero.stat_1_number': { selector: '.hero-stats .stat-item:nth-child(1) .stat-number', type: 'text' },
  'hero.stat_1_label': { selector: '.hero-stats .stat-item:nth-child(1) .stat-label', type: 'text' },
  'hero.stat_2_number': { selector: '.hero-stats .stat-item:nth-child(3) .stat-number', type: 'text' },
  'hero.stat_2_label': { selector: '.hero-stats .stat-item:nth-child(3) .stat-label', type: 'text' },
  'hero.stat_3_number': { selector: '.hero-stats .stat-item:nth-child(5) .stat-number', type: 'text' },
  'hero.stat_3_label': { selector: '.hero-stats .stat-item:nth-child(5) .stat-label', type: 'text' },
  'hero.cta_primary': { selector: '#hero-cta-primary span', type: 'text' },
  'hero.cta_secondary': { selector: '#hero-cta-secondary', type: 'text' },
  'hero.scroll_label': { selector: '.scroll-indicator span', type: 'text' },
};
const PACKAGE_OPTIONS = {
  online: {
    year: { label: 'Dự Đoán Năm Cá Nhân – 500.000 vnđ/buổi', price: 500000 },
    big3: { label: 'Phân Tích 3 Chỉ Số Tính Cách – 1.000.000 vnđ/buổi', price: 1000000 },
    big7: { label: 'Phân Tích Toàn Diện – 2.000.000 vnđ/buổi', price: 2000000 },
  },
  offline: {
    year: { label: 'Dự Đoán Năm Cá Nhân – 550.000 vnđ/buổi', price: 550000 },
    big3: { label: 'Phân Tích 3 Chỉ Số Tính Cách – 1.050.000 vnđ/buổi', price: 1050000 },
    big7: { label: 'Phân Tích Toàn Diện – 2.000.000 vnđ/buổi', price: 2000000 },
  },
};
const PACKAGE_CONTENT_KEYS = {
  year: { name: 'packages.year_name', price: 'packages.year_price' },
  big3: { name: 'packages.big3_name', price: 'packages.big3_price' },
  big7: { name: 'packages.big7_name', price: 'packages.big7_price' },
};
const OFFLINE_TRAVEL_FEE = 50000;
const CONSULTATION_TYPE_LABELS = {
  online: 'Online - Google Meet',
  offline: 'Offline - Trực tiếp tại TP.HCM',
};

// Bank info for VietQR/SePay
const BANK_BIN = '970418'; // BIDV BIN
const BANK_ACCOUNT = '96247031088CUONG';
const BANK_NAME_DISPLAY = 'LÊ CHÍ CƯỜNG';
const DEFAULT_PAYMENT_SETTINGS = {
  sepayEnabled: false,
  bankName: 'BIDV',
  bankBin: BANK_BIN,
  bankAccount: BANK_ACCOUNT,
  bankAccountName: BANK_NAME_DISPLAY,
  sepayBankName: 'BIDV',
  sepayBankAccount: '96247031088CUONG',
  sepayEnv: 'sandbox',
  sepayMerchantId: '',
  sepayCheckoutUrl: '',
  sepayOrderPrefix: 'CCP',
  paymentTimeoutMinutes: 15,
  thankYouUrl: 'thankyou.html',
};
let paymentSettings = { ...DEFAULT_PAYMENT_SETTINGS };
let paymentSettingsLoadedAt = 0;
let paymentSettingsLoadedFromNetwork = false;
let sepayPaymentTimer = null;
let sepayPaymentPoller = null;

// Working hours config (24h format)
// Mon–Fri: 19–21, Sat–Sun: 9–21, slot duration 2h
const WORKING_HOURS = {
  weekday: { start: 19, end: 21 }, // Mon(1)–Fri(5)
  weekend: { start: 9, end: 21 },  // Sat(6)–Sun(0)
  slotDurationHrs: 2,
};

document.addEventListener('DOMContentLoaded', () => {
  initYouTubeEmbeds();
  renderTestimonials(DEFAULT_TESTIMONIAL_IMAGES);

  // ===== PARTICLES CANVAS =====
  initParticles();

  // ===== NAVBAR SCROLL =====
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  // ===== HAMBURGER MENU =====
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
  });
  // Close menu when clicking a link
  navLinks?.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });

  // ===== SCROLL REVEAL =====
  window.revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        window.revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => {
    window.revealObserver.observe(el);
  });

  // ===== ACTIVE NAV LINK =====
  const sections = document.querySelectorAll('section[id]');
  const navLinkEls = document.querySelectorAll('.nav-link:not(.nav-cta)');
  const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinkEls.forEach(link => {
          link.style.color = '';
          if (link.getAttribute('href') === `#${id}`) {
            link.style.color = 'var(--color-sunburst-light)';
          }
        });
      }
    });
  }, { threshold: 0.4 });
  sections.forEach(s => activeObserver.observe(s));

  // ===== PACKAGE QUICK SELECT =====
  const consultationTypeSelect = document.getElementById('consultation-type');
  const packageSelect = document.getElementById('package');
  populatePackageOptions(consultationTypeSelect?.value || '');
  consultationTypeSelect?.addEventListener('change', () => {
    populatePackageOptions(consultationTypeSelect.value, '', true);
  });
  packageSelect?.addEventListener('change', updatePackageChoiceSummary);
  packageSelect?.addEventListener('focus', () => {
    populatePackageOptions(consultationTypeSelect?.value || '', packageSelect.value);
  });
  packageSelect?.addEventListener('pointerdown', () => {
    populatePackageOptions(consultationTypeSelect?.value || '', packageSelect.value);
  });

  document.addEventListener('click', handlePackageCtaClick);

  // ===== FORM SUBMIT → OPEN CALENDAR MODAL =====
  const form = document.getElementById('booking-form');
  const dobInput = document.getElementById('dob');

  if (dobInput) {
    dobInput.max = getTodayDateInputValue();
    const clearDobError = () => {
      const validation = validateDobValue(dobInput.value);
      dobInput.setCustomValidity(validation.valid || !dobInput.value ? '' : validation.message);
    };
    dobInput.addEventListener('input', clearDobError);
    dobInput.addEventListener('change', clearDobError);
  }

  // Custom validation messages
  const requiredInputs = form?.querySelectorAll('[required]');
  requiredInputs?.forEach(input => {
    input.addEventListener('invalid', function() {
      if (this.validity.valueMissing) this.setCustomValidity('Vui lòng nhập thông tin');
    });
    input.addEventListener('input', function() {
      if (this.id !== 'dob') this.setCustomValidity('');
    });
    input.addEventListener('change', function() {
      if (this.id !== 'dob') this.setCustomValidity('');
    });
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (dobInput) {
      const dobValidation = validateDobValue(dobInput.value);
      dobInput.setCustomValidity(dobValidation.valid ? '' : dobValidation.message);
      if (!dobValidation.valid) {
        dobInput.reportValidity();
        dobInput.focus();
        return;
      }
    }
    if (!form.reportValidity()) return;

    if (!isConfiguredGoogleScriptUrl()) {
      showToast('Vui lòng cấu hình Google Apps Script URL.');
      return;
    }
    // Save form data into session state
    const fd = new FormData(form);
    bookingState.name   = fd.get('name') || '';
    bookingState.dob    = fd.get('dob') || '';
    bookingState.phone  = fd.get('phone') || '';
    bookingState.email  = fd.get('email') || '';
    bookingState.consultationType = fd.get('consultationType') || '';
    bookingState.package = fd.get('package') || '';
    bookingState.concern = fd.get('concern') || '';
    bookingState.paymentOrderId = '';
    const packageSnapshot = getSelectedPackageSnapshot();
    if (!packageSnapshot.price) {
      showToast('Bạn vui lòng chọn lại gói tư vấn để hệ thống cập nhật đúng số tiền.');
      return;
    }
    openModal('modal-calendar');
    loadCalendar();
  });

  // ===== BOOKING MODAL LOGIC =====
  initBookingModals();
  initMobileStickyCta();
  initMiniReport();

  // ===== SMOOTH COUNTER ANIMATION =====
  landingContentReady.finally(initStatCounters);

  // ===== PACKAGE CARD GLOW ON HOVER =====
  bindPackageCardGlow();
});

async function loadLandingContentFromSheet() {
  if (!LANDING_CONTENT_ENABLED || !isConfiguredScriptUrl(LANDING_CONTENT_SCRIPT_URL)) {
    finishLandingContentLoading();
    return;
  }

  const loaderTimer = window.setTimeout(finishLandingContentLoading, LANDING_CONTENT_LOADING_MAX_MS);
  const cachedPayload = readLandingContentCache();
  if (cachedPayload) {
    applyLandingContent(cachedPayload, { fromCache: true });
    finishLandingContentLoading();
  }

  try {
    const payload = await fetchLandingContentWithRetry();
    if (!isValidLandingContentPayload(payload)) return;
    applyLandingContent(payload, { fromCache: false });
    writeLandingContentCache(payload);
  } catch (error) {
    const message = cachedPayload
      ? 'Không tải được nội dung mới từ Google Sheet, đang dùng bản cache gần nhất.'
      : 'Không tải được nội dung từ Google Sheet, dùng nội dung dự phòng trong HTML.';
    console.warn(message, error);
  } finally {
    window.clearTimeout(loaderTimer);
    finishLandingContentLoading();
  }
}

async function fetchLandingContentWithRetry() {
  let lastError;
  for (let attempt = 0; attempt <= LANDING_CONTENT_RETRY_COUNT; attempt += 1) {
    try {
      const payload = await fetchLandingContentOnce(LANDING_CONTENT_TIMEOUT_MS, `try=${attempt + 1}`);
      if (!isValidLandingContentPayload(payload)) {
        throw new Error(payload?.message || 'Payload Google Sheet không hợp lệ.');
      }
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < LANDING_CONTENT_RETRY_COUNT) {
        await sleep(450 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

async function fetchLandingContentOnce(timeoutMs = LANDING_CONTENT_TIMEOUT_MS, extraQuery = '') {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const query = extraQuery ? `&${extraQuery}` : '';
  const url = `${LANDING_CONTENT_SCRIPT_URL}?action=getLandingContent&_=${Date.now()}${query}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function isValidLandingContentPayload(payload) {
  return Boolean(payload)
    && payload.ok !== false
    && Array.isArray(payload.items);
}

function readLandingContentCache() {
  try {
    const raw = window.localStorage?.getItem(LANDING_CONTENT_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached.savedAt || Date.now() - cached.savedAt > LANDING_CONTENT_CACHE_MAX_AGE_MS) return null;
    return isValidLandingContentPayload(cached.payload) ? cached.payload : null;
  } catch (error) {
    return null;
  }
}

function writeLandingContentCache(payload) {
  try {
    const cachePayload = Object.assign({}, payload);
    delete cachePayload.paymentSettings;
    window.localStorage?.setItem(LANDING_CONTENT_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      payload: cachePayload,
    }));
  } catch (error) {
    // Cache chỉ là lớp dự phòng, lỗi lưu cache không ảnh hưởng trải nghiệm chính.
  }
}

async function refreshPaymentSettingsBeforePayment() {
  if (!LANDING_CONTENT_ENABLED || !isConfiguredScriptUrl(LANDING_CONTENT_SCRIPT_URL)) return;
  if (paymentSettingsLoadedFromNetwork && paymentSettingsLoadedAt && Date.now() - paymentSettingsLoadedAt < PAYMENT_SETTINGS_REFRESH_MAX_AGE_MS) return;

  try {
    const payload = await fetchLandingContentOnce(PAYMENT_SETTINGS_REFRESH_TIMEOUT_MS, 'paymentRefresh=1');
    if (!isValidLandingContentPayload(payload)) return;
    applyLandingContent(payload, { fromCache: false });
    writeLandingContentCache(payload);
  } catch (error) {
    console.warn('Không tải kịp cấu hình thanh toán mới, dùng cấu hình hiện có:', error);
  }
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function finishLandingContentLoading() {
  window.requestAnimationFrame(() => {
    document.body?.classList.remove(LANDING_CONTENT_LOADING_CLASS);
  });
}

function applyLandingContent(payload, options = {}) {
  (payload.items || []).forEach(applyLandingContentItem);
  syncMiniReportContent(payload.items || []);
  syncHeroConsultationBadge();
  initYouTubeEmbeds();
  
  if (payload.paymentSettings && !options.fromCache) {
    paymentSettings = normalizePaymentSettings(payload.paymentSettings);
    paymentSettingsLoadedAt = Date.now();
    paymentSettingsLoadedFromNetwork = true;
  }

  const packages = normalizePackages(payload.packages);
  if (packages.length > 0) {
    renderPackages(packages);
    syncPackageOptionsFromPackages(packages);
  } else {
    syncPackageOptionsFromLandingContent(payload.items);
  }

  const feedbackImages = normalizeFeedbackImages(payload.feedbackImages);
  if (feedbackImages.length > 0) {
    renderTestimonials(feedbackImages);
  }

  if (payload.sectionsLayout) {
    applySectionsLayout(payload.sectionsLayout);
  }
}

function applySectionsLayout(layout) {
  const container = document.getElementById('dynamic-layout');
  if (!container) return;
  
  // Xóa các generic section cũ nếu đang render lại
  container.querySelectorAll('.generic-section').forEach(el => el.remove());

  layout.forEach((sec) => {
    if (sec.type === 'builtin') {
      const el = document.getElementById(sec.id);
      if (el) {
        el.style.order = sec.order;
        el.style.display = sec.enabled ? '' : 'none';
      }
    } else if (sec.type === 'generic' && sec.enabled) {
      const el = document.createElement('section');
      el.className = `generic-section section`;
      el.id = sec.id;
      el.style.order = sec.order;
      el.innerHTML = `
        <div class="container">
          <div class="section-header reveal">
            ${sec.tag ? `<span class="section-tag">${sec.tag}</span>` : ''}
            <h2 class="section-title">${sec.title || ''}</h2>
            <div class="section-divider">
              <span>✦</span><span>✦</span><span>✦</span>
            </div>
          </div>
          <div class="generic-content reveal">
            ${sec.contentHtml || ''}
          </div>
        </div>
      `;
      container.appendChild(el);
      if (window.revealObserver) {
        el.querySelectorAll('.reveal').forEach(child => window.revealObserver.observe(child));
      }
    }
  });
}

function normalizePaymentSettings(settings = {}) {
  return {
    sepayEnabled: settings.sepayEnabled === true || String(settings.sepayEnabled).toLowerCase() === 'true',
    bankName: String(settings.bankName || DEFAULT_PAYMENT_SETTINGS.bankName).trim(),
    bankBin: String(settings.bankBin || DEFAULT_PAYMENT_SETTINGS.bankBin).trim(),
    bankAccount: String(settings.bankAccount || DEFAULT_PAYMENT_SETTINGS.bankAccount).trim(),
    bankAccountName: String(settings.bankAccountName || DEFAULT_PAYMENT_SETTINGS.bankAccountName).trim(),
    sepayBankName: String(settings.sepayBankName || DEFAULT_PAYMENT_SETTINGS.sepayBankName).trim(),
    sepayBankAccount: String(settings.sepayBankAccount || DEFAULT_PAYMENT_SETTINGS.sepayBankAccount).trim(),
    sepayEnv: String(settings.sepayEnv || DEFAULT_PAYMENT_SETTINGS.sepayEnv).trim(),
    sepayMerchantId: String(settings.sepayMerchantId || '').trim(),
    sepayCheckoutUrl: String(settings.sepayCheckoutUrl || '').trim(),
    sepayOrderPrefix: String(settings.sepayOrderPrefix || DEFAULT_PAYMENT_SETTINGS.sepayOrderPrefix).trim(),
    paymentTimeoutMinutes: Math.max(1, Number(settings.paymentTimeoutMinutes || DEFAULT_PAYMENT_SETTINGS.paymentTimeoutMinutes)),
    thankYouUrl: String(settings.thankYouUrl || DEFAULT_PAYMENT_SETTINGS.thankYouUrl).trim(),
  };
}

function normalizePackages(packages) {
  if (!Array.isArray(packages)) return [];
  return packages
    .map((pkg, index) => ({
      enabled: pkg.enabled !== false,
      code: String(pkg.code || '').trim(),
      name: String(pkg.name || '').trim(),
      onlinePrice: Number(pkg.onlinePrice || 0),
      offlinePrice: Number(pkg.offlinePrice || pkg.onlinePrice || 0),
      unit: normalizePackageUnit(pkg.unit),
      icon: String(pkg.icon || 'sparkles').trim(),
      accent: String(pkg.accent || 'teal').trim(),
      featured: pkg.featured === true,
      badge: String(pkg.badge || '').trim(),
      features: Array.isArray(pkg.features) ? pkg.features.filter(Boolean) : [],
      buttonText: String(pkg.buttonText || 'Đặt Lịch Ngay').trim(),
      sortOrder: Number(pkg.sortOrder || index + 1),
    }))
    .filter((pkg) => pkg.enabled && pkg.code && pkg.name && pkg.onlinePrice > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function renderPackages(packages) {
  const grid = document.querySelector('#packages .packages-grid');
  if (!grid) return;

  grid.innerHTML = '';
  grid.classList.toggle('packages-grid-3', packages.length === 3);
  grid.classList.toggle('packages-carousel-enabled', packages.length > 3);
  packages.forEach((pkg, index) => {
    const card = createPackageCard(pkg, index);
    grid.appendChild(card);
    window.setTimeout(() => {
      card.classList.add('visible');
    }, 80 + index * 80);
  });

  bindPackageCardGlow();
  setupPackagesCarousel(packages.length);
}

function setupPackagesCarousel(packageCount) {
  const grid = document.querySelector('#packages .packages-grid');
  if (!grid) return;

  const existingControls = document.querySelector('#packages .package-carousel-controls');
  if (packageCount <= 3) {
    existingControls?.remove();
    return;
  }

  let controls = existingControls;
  if (!controls) {
    controls = document.createElement('div');
    controls.className = 'package-carousel-controls';
    controls.innerHTML = `
      <button class="package-carousel-btn" type="button" data-package-slide="prev" aria-label="Xem gói trước">
        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
      </button>
      <div class="package-carousel-status" aria-live="polite">
        <span class="package-carousel-range">1-3 / ${packageCount}</span>
        <div class="package-carousel-dots" aria-label="Chọn gói tư vấn"></div>
      </div>
      <button class="package-carousel-btn" type="button" data-package-slide="next" aria-label="Xem gói tiếp theo">
        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
      </button>
    `;
    grid.after(controls);
  }

  const previousBtn = controls.querySelector('[data-package-slide="prev"]');
  const nextBtn = controls.querySelector('[data-package-slide="next"]');
  const range = controls.querySelector('.package-carousel-range');
  const dots = controls.querySelector('.package-carousel-dots');
  let activeIndex = 0;

  if (dots && dots.children.length !== packageCount) {
    dots.innerHTML = '';
    for (let index = 0; index < packageCount; index += 1) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'package-carousel-dot';
      dot.setAttribute('aria-label', `Xem gói tư vấn ${index + 1}`);
      dot.addEventListener('click', () => scrollToPackage(index));
      dots.appendChild(dot);
    }
  }

  const getStep = () => {
    const firstCard = grid.querySelector('.package-card');
    if (!firstCard) return grid.clientWidth;
    const styles = window.getComputedStyle(grid);
    const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
    return firstCard.getBoundingClientRect().width + gap;
  };
  const getVisibleCount = () => Math.max(1, Math.round(grid.clientWidth / getStep()));
  const getMaxStartIndex = () => Math.max(0, packageCount - getVisibleCount());
  const scrollToPackage = (index) => {
    const targetIndex = Math.max(0, Math.min(index, getMaxStartIndex()));
    grid.scrollTo({ left: getStep() * targetIndex, behavior: 'smooth' });
    window.setTimeout(updateButtons, 360);
  };
  const updateButtons = () => {
    const visibleCount = getVisibleCount();
    const maxStartIndex = getMaxStartIndex();
    activeIndex = Math.max(0, Math.min(Math.round(grid.scrollLeft / getStep()), maxStartIndex));
    const rangeStart = activeIndex + 1;
    const rangeEnd = Math.min(packageCount, activeIndex + visibleCount);

    previousBtn.disabled = activeIndex <= 0;
    nextBtn.disabled = activeIndex >= maxStartIndex;
    if (range) range.textContent = `${rangeStart}${rangeEnd > rangeStart ? `-${rangeEnd}` : ''} / ${packageCount}`;
    dots?.querySelectorAll('.package-carousel-dot').forEach((dot, dotIndex) => {
      const isActive = dotIndex === activeIndex;
      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  };
  const slide = (direction) => {
    scrollToPackage(activeIndex + direction);
  };

  previousBtn.onclick = () => slide(-1);
  nextBtn.onclick = () => slide(1);
  grid.onscroll = updateButtons;
  window.addEventListener('resize', updateButtons);
  window.setTimeout(updateButtons, 120);
}

function createPackageCard(pkg, index) {
  const card = document.createElement('div');
  card.className = `package-card reveal${pkg.featured ? ' package-featured' : ''}`;
  card.dataset.delay = String(index * 100);

  const glow = document.createElement('div');
  glow.className = `package-glow ${getPackageGlowClass(pkg)}`;
  card.appendChild(glow);

  if (pkg.featured) {
    const ring = document.createElement('div');
    ring.className = 'featured-glow-ring';
    card.appendChild(ring);
  }

  if (pkg.badge) {
    const badge = document.createElement('div');
    badge.className = 'featured-badge';
    badge.textContent = pkg.badge;
    card.appendChild(badge);
  }

  const header = document.createElement('div');
  header.className = 'package-header';
  header.innerHTML = `
    <div class="package-icon${pkg.featured ? ' featured-icon' : ''}"><i class="${getPackageIconClass(pkg.icon)}"></i></div>
    <h3 class="package-name${pkg.featured ? ' featured-name' : ''}"></h3>
    <div class="package-price${pkg.featured ? ' featured-price-wrap' : ''}">
      <span class="price-current${pkg.featured ? ' price-highlight' : ''}">${formatPackagePriceHtml(pkg.onlinePrice)}</span>
      <span class="price-unit"></span>
    </div>
  `;
  header.querySelector('.package-name').innerHTML = pkg.name;
  header.querySelector('.price-unit').textContent = pkg.unit;
  card.appendChild(header);

  const divider = document.createElement('div');
  divider.className = `package-divider${pkg.featured ? ' featured-divider' : ''}`;
  card.appendChild(divider);

  const features = document.createElement('ul');
  features.className = 'package-features';
  pkg.features.forEach((feature) => {
    const item = document.createElement('li');
    item.innerHTML = `<span class="feature-check${pkg.featured ? ' featured-check' : ''}">✦</span> <span>${feature}</span>`;
    features.appendChild(item);
  });
  card.appendChild(features);

  const cta = document.createElement('a');
  cta.href = '#contact';
  cta.className = pkg.featured ? 'btn btn-primary btn-featured-pkg' : 'btn btn-package';
  cta.id = `pkg-${pkg.code}`;
  cta.dataset.packageCode = pkg.code;
  cta.textContent = pkg.buttonText;
  card.appendChild(cta);

  return card;
}

function getPackageIconClass(icon) {
  const cleanIcon = String(icon || 'sparkles').replace(/^fa-/, '');
  return `fa-solid fa-${cleanIcon}`;
}

function getPackageGlowClass(pkg) {
  const accent = String(pkg.accent || '').toLowerCase();
  if (accent === 'gold') return 'glow-gold';
  if (accent === 'orange') return 'glow-orange';
  return 'glow-teal';
}

function formatPackagePriceHtml(price) {
  return `${Number(price || 0).toLocaleString('vi-VN')}<sup>đ</sup>`;
}

function syncPackageOptionsFromPackages(packages) {
  PACKAGE_OPTIONS.online = {};
  PACKAGE_OPTIONS.offline = {};
  packages.forEach((pkg) => {
    const name = stripHtmlToText(pkg.name);
    const baseMeta = {
      name,
      unit: pkg.unit,
      onlinePrice: pkg.onlinePrice,
      offlinePrice: pkg.offlinePrice || pkg.onlinePrice,
    };
    updatePackageOption('online', pkg.code, name, pkg.onlinePrice, pkg.unit, baseMeta);
    updatePackageOption('offline', pkg.code, name, pkg.offlinePrice || pkg.onlinePrice, pkg.unit, baseMeta);
  });

  const consultationTypeSelect = document.getElementById('consultation-type');
  const packageSelect = document.getElementById('package');
  if (consultationTypeSelect?.value && packageSelect) {
    populatePackageOptions(consultationTypeSelect.value, packageSelect.value);
  }
  updatePackageChoiceSummary();
}

function handlePackageCtaClick(event) {
  const link = event.target.closest('a[href="#contact"][id^="pkg-"], a[data-package-code]');
  if (!link) return;

  const packageValue = link.dataset.packageCode || link.id.replace('pkg-', '');
  const consultationTypeSelect = document.getElementById('consultation-type');
  const packageSelect = document.getElementById('package');
  const selectedType = consultationTypeSelect?.value || 'online';
  if (consultationTypeSelect && !consultationTypeSelect.value) {
    consultationTypeSelect.value = selectedType;
    populatePackageOptions(selectedType);
  }
  if (packageSelect && getPackageOptions(selectedType)[packageValue]) {
    packageSelect.value = packageValue;
  }
}

function bindPackageCardGlow() {
  document.querySelectorAll('.package-card').forEach(card => {
    card.onmousemove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    };
  });
}

function normalizeFeedbackImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map((img, index) => ({
      ...img,
      originalIndex: index,
      createdAtMs: getFeedbackSortOrder(img, index),
      url: String(img?.url || '').trim(),
    }))
    .filter((img) => img.url)
    .sort((a, b) => (b.createdAtMs - a.createdAtMs) || (b.originalIndex - a.originalIndex));
}

function getFeedbackSortOrder(img, index) {
  const serverOrder = Number(img?.sortOrder ?? img?.createdAtMs ?? 0);
  if (Number.isFinite(serverOrder) && serverOrder > 0) return serverOrder;
  return parseFeedbackCreatedAt(img?.createdAt) || index + 1;
}

function parseFeedbackCreatedAt(value) {
  if (!value) return 0;
  const text = String(value).trim();
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return date.getTime();

  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return 0;
  const [, day, month, year, hour = '0', minute = '0', second = '0'] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)).getTime();
}

function renderTestimonials(images) {
  const track = document.getElementById('testimonials-track');
  if (!track) return;

  const validImages = normalizeFeedbackImages(images);
  if (validImages.length === 0) return;

  track.innerHTML = '';

  validImages.forEach((img, index) => {
    const card = document.createElement('figure');
    card.className = 'testimonial-card' + (index === 0 ? ' is-active' : '');
    
    const wrap = document.createElement('div');
    wrap.className = 'testimonial-image-wrap';
    
    const imgEl = document.createElement('img');
    imgEl.src = img.url;
    imgEl.alt = 'Cảm nhận của khách hàng ' + (index + 1);
    imgEl.loading = 'lazy';
    imgEl.decoding = 'async';
    imgEl.width = 420;
    imgEl.height = 620;
    imgEl.referrerPolicy = 'no-referrer';
    imgEl.onerror = () => {
      const fallback = DEFAULT_TESTIMONIAL_IMAGES[index % DEFAULT_TESTIMONIAL_IMAGES.length]?.url;
      if (fallback && imgEl.dataset.fallbackApplied !== 'true') {
        imgEl.dataset.fallbackApplied = 'true';
        imgEl.src = fallback;
      }
    };
    
    wrap.appendChild(imgEl);
    card.appendChild(wrap);
    track.appendChild(card);
  });
  
  initTestimonialsCarousel();
}

function initTestimonialsCarousel() {
  const testimonialsTrack = document.getElementById('testimonials-track');
  if (!testimonialsTrack) return;
  
  const testimonialCards = Array.from(testimonialsTrack.querySelectorAll('.testimonial-card'));
  if (testimonialCards.length === 0) return;
  
  const prevTestimonialBtn = document.querySelector('.testimonial-nav-prev');
  const nextTestimonialBtn = document.querySelector('.testimonial-nav-next');
  const testimonialDots = document.getElementById('testimonials-dots');
  
  if (testimonialDots) testimonialDots.innerHTML = '';
  
  let activeTestimonialIndex = 0;
  let testimonialScrollTimer;

  const setActiveTestimonial = (index) => {
    activeTestimonialIndex = (index + testimonialCards.length) % testimonialCards.length;
    testimonialCards.forEach((card, cardIndex) => {
      card.classList.toggle('is-active', cardIndex === activeTestimonialIndex);
    });
    testimonialDots?.querySelectorAll('.testimonial-dot').forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === activeTestimonialIndex);
      dot.setAttribute('aria-current', dotIndex === activeTestimonialIndex ? 'true' : 'false');
    });
  };

  const centerTestimonial = (index, behavior = 'smooth') => {
    const card = testimonialCards[index];
    if (!card) return;
    const trackRect = testimonialsTrack.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const left = testimonialsTrack.scrollLeft
      + cardRect.left
      - trackRect.left
      - (trackRect.width - cardRect.width) / 2;
    testimonialsTrack.scrollTo({ left, behavior });
    setActiveTestimonial(index);
  };

  const updateActiveFromScroll = () => {
    const trackRect = testimonialsTrack.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;
    let nearestIndex = activeTestimonialIndex;
    let nearestDistance = Infinity;

    testimonialCards.forEach((card, index) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(cardCenter - trackCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setActiveTestimonial(nearestIndex);
  };

  testimonialCards.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'testimonial-dot';
    dot.setAttribute('aria-label', `Xem feedback ${index + 1}`);
    dot.addEventListener('click', () => centerTestimonial(index));
    testimonialDots?.appendChild(dot);
  });

  if (prevTestimonialBtn) {
    prevTestimonialBtn.onclick = () => {
      centerTestimonial(activeTestimonialIndex - 1);
    };
  }

  if (nextTestimonialBtn) {
    nextTestimonialBtn.onclick = () => {
      centerTestimonial(activeTestimonialIndex + 1);
    };
  }

  testimonialsTrack.onscroll = () => {
    window.clearTimeout(testimonialScrollTimer);
    testimonialScrollTimer = window.setTimeout(updateActiveFromScroll, 90);
  };

  setActiveTestimonial(0);
  window.requestAnimationFrame(() => centerTestimonial(0, 'auto'));
}

function initYouTubeEmbeds() {
  const origin = window.location.origin;
  const canUseOrigin = origin && /^https?:\/\//.test(origin);

  document.querySelectorAll('iframe[data-youtube-embed]').forEach((iframe) => {
    let rawId = iframe.dataset.youtubeEmbed;
    if (!rawId) return;

    let videoId = rawId;
    const match = rawId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      videoId = match[1];
    }

    const url = new URL(`https://www.youtube.com/embed/${videoId}`);
    url.searchParams.set('rel', '0');
    url.searchParams.set('modestbranding', '1');
    url.searchParams.set('playsinline', '1');
    if (canUseOrigin) url.searchParams.set('origin', origin);

    iframe.src = url.toString();
  });
}

function applyLandingContentItem(item) {
  if (!item || item.enabled === false) return;
  const key = String(item.key || '').trim();
  const override = LANDING_CONTENT_ITEM_OVERRIDES[key] || {};
  const selector = String(override.selector || item.selector || '').trim();
  const value = normalizeLandingContentValue(key, item.value, item);
  if (!selector || value == null || value === '') return;

  const type = String(override.type || item.type || 'text').trim().toLowerCase();
  const attribute = String(override.attribute || item.attribute || '').trim();
  const elements = document.querySelectorAll(selector);
  if (!elements.length) return;

  elements.forEach((element) => {
    if (type === 'html') {
      element.innerHTML = element.matches('#about .mentor-feature-card span')
        ? normalizeInlineLandingContentHtml(value)
        : value;
      return;
    }
    if (type === 'attr' || type === 'attribute') {
      if (attribute) element.setAttribute(attribute, value);
      return;
    }
    if (type === 'placeholder') {
      element.setAttribute('placeholder', value);
      return;
    }
    if (type === 'href' || type === 'src' || type === 'alt' || type === 'aria-label') {
      element.setAttribute(type, value);
      if (type === 'src' && element.tagName === 'IMG' && element.previousElementSibling && element.previousElementSibling.tagName === 'SOURCE') {
        element.previousElementSibling.setAttribute('srcset', value);
      }
      return;
    }
    element.innerHTML = value;
  });
}

function normalizeInlineLandingContentHtml(value) {
  return String(value)
    .replace(/<\/p>\s*<p[^>]*>/gi, ' ')
    .replace(/^\s*<p[^>]*>/i, '')
    .replace(/<\/p>\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+(<strong\b)/gi, '&nbsp;$1')
    .trim();
}

function normalizeLandingContentValue(key, rawValue, item) {
  const value = rawValue == null ? '' : String(rawValue);
  const trimmed = value.trim();
  const selector = String(item?.selector || '').trim();

  if (key === 'hero.stat_3_number' && trimmed === '1') {
    return '100%';
  }

  if ((key === 'hero.subtitle' || selector === '.hero-subtitle') && /^[\d\s+%.,/]+$/.test(trimmed)) {
    return null;
  }

  return value;
}

function syncHeroConsultationBadge() {
  const consultationNumber = document.querySelector('.hero-stats .stat-item:nth-child(3) .stat-number')?.textContent.trim();
  const badge = document.querySelector('.hero-badge');
  const number = consultationNumber?.match(/\d+/)?.[0];
  if (!badge || !number || !/Hơn\s*\d+/i.test(badge.textContent)) return;

  badge.textContent = badge.textContent.replace(/Hơn\s*\d+\+?/i, `Hơn ${number}`);
}

function syncPackageOptionsFromLandingContent(items) {
  const valuesByKey = new Map(items.map((item) => [String(item.key || '').trim(), item.value]));

  Object.entries(PACKAGE_CONTENT_KEYS).forEach(([packageCode, keys]) => {
    const name = stripHtmlToText(valuesByKey.get(keys.name));
    const price = parsePriceFromContent(valuesByKey.get(keys.price));
    if (!name || !price) return;
    const onlinePrice = price;
    const offlinePrice = packageCode === 'big7' ? price : price + OFFLINE_TRAVEL_FEE;
    const meta = { name, unit: '/buổi', onlinePrice, offlinePrice };

    updatePackageOption('online', packageCode, name, onlinePrice, '/buổi', meta);
    updatePackageOption(
      'offline',
      packageCode,
      name,
      offlinePrice,
      '/buổi',
      meta
    );
  });

  const consultationTypeSelect = document.getElementById('consultation-type');
  const packageSelect = document.getElementById('package');
  if (consultationTypeSelect?.value && packageSelect) {
    populatePackageOptions(consultationTypeSelect.value, packageSelect.value);
  }
}

function updatePackageOption(consultationType, packageCode, name, price, unit = '/buổi', meta = {}) {
  if (!PACKAGE_OPTIONS[consultationType]) PACKAGE_OPTIONS[consultationType] = {};
  if (!PACKAGE_OPTIONS[consultationType][packageCode]) PACKAGE_OPTIONS[consultationType][packageCode] = {};
  const option = PACKAGE_OPTIONS[consultationType][packageCode];
  const unitLabel = normalizePackageUnit(unit);

  option.name = meta.name || name;
  option.price = price;
  option.unit = unitLabel;
  option.onlinePrice = Number(meta.onlinePrice || price || 0);
  option.offlinePrice = Number(meta.offlinePrice || price || 0);
  option.label = `${name} – ${formatPackagePriceLabel(price)}${unitLabel}`;
}

function parsePriceFromContent(value) {
  const digits = stripHtmlToText(value).replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

function stripHtmlToText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatPackagePriceLabel(price) {
  return Number(price || 0).toLocaleString('vi-VN') + ' vnđ';
}

function normalizePackageUnit(unit) {
  const value = String(unit || '/buổi').trim();
  if (!value) return '/buổi';
  if (value.startsWith('/')) return value;
  return `/${value}`;
}

function initStatCounters() {
  const statNumbers = document.querySelectorAll('.stat-number');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const text = el.textContent;
        const match = text.match(/(\d+)/);
        if (match) {
          const target = parseInt(match[1]);
          const suffix = text.replace(match[1], '');
          animateCounter(el, 0, target, suffix, 1500);
        }
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  statNumbers.forEach(el => counterObserver.observe(el));
}

function isConfiguredGoogleScriptUrl() {
  return isConfiguredScriptUrl(BOOKING_SCRIPT_URL);
}

function isConfiguredScriptUrl(url) {
  return Boolean(url)
    && !url.includes('PASTE_')
    && !url.includes('URL_MOI')
    && /^https?:\/\//.test(url);
}

function getBookingDataObject() {
  const transferContent = paymentSettings.sepayEnabled && bookingState.paymentOrderId
    ? bookingState.paymentOrderId
    : buildTransferContent(bookingState.package, bookingState.phone);
  const packageSnapshot = getSelectedPackageSnapshot();

  return {
    name: bookingState.name,
    dob: formatDobForSheet(bookingState.dob),
    phone: "'" + bookingState.phone,
    email: bookingState.email,
    consultationType: bookingState.consultationType,
    consultationTypeLabel: CONSULTATION_TYPE_LABELS[bookingState.consultationType] || bookingState.consultationType,
    package: bookingState.package,
    packageName: packageSnapshot.name,
    packageLabel: packageSnapshot.label,
    packagePrice: String(packageSnapshot.price),
    packageUnit: packageSnapshot.unit,
    packageOnlinePrice: String(packageSnapshot.onlinePrice || ''),
    packageOfflinePrice: String(packageSnapshot.offlinePrice || ''),
    hasOfflineTravelFee: packageSnapshot.hasOfflineTravelFee ? 'true' : 'false',
    transferContent: transferContent,
    concern: bookingState.concern,
    slotLabel: bookingState.fullSlotLabel || '',
    slotStart: buildSlotISO(bookingState.selectedDate, bookingState.selectedTime),
    slotEnd: buildSlotISO(bookingState.selectedDate, bookingState.selectedTime, WORKING_HOURS.slotDurationHrs),
    submittedAt: new Date().toISOString(),
    pageUrl: window.location.href,
    paymentProvider: paymentSettings.sepayEnabled ? 'sepay' : 'manual_qr',
    paymentOrderId: bookingState.paymentOrderId || buildPaymentOrderId(bookingState.package, bookingState.phone),
  };
}

function buildTransferContent(packageCode, phone) {
  const cleanPackageCode = String(packageCode || '').trim().toUpperCase();
  const cleanPhone = String(phone || '').replace(/\s+/g, '');
  return `${cleanPackageCode} ${cleanPhone}`.trim();
}

function buildPaymentOrderId(packageCode, phone) {
  const prefix = String(paymentSettings.sepayOrderPrefix || 'CCP').trim().toUpperCase();
  const cleanPackageCode = String(packageCode || '').trim().toUpperCase();
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  const timestamp = Date.now().toString().slice(-6);
  return [prefix, cleanPackageCode, cleanPhone || 'GUEST', timestamp].filter(Boolean).join('-');
}

function bookingDataToUrlParams(data, action) {
  const params = new URLSearchParams();
  params.append('action', action);
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  return params;
}

async function saveBookingToSheet(data) {
  const body = bookingDataToUrlParams(data, 'saveBooking').toString();
  await fetch(BOOKING_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

async function completeBookingOnServer(data) {
  const query = bookingDataToUrlParams(data, 'completeBooking').toString();
  let lastError;

  for (let attempt = 0; attempt <= BOOKING_API_RETRY_COUNT; attempt += 1) {
    try {
      const res = await fetchWithTimeout(`${BOOKING_SCRIPT_URL}?${query}&try=${attempt + 1}`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
      }, BOOKING_API_TIMEOUT_MS);
      const result = await res.json();
      if (!result.ok) {
        throw new Error(result.message || 'Không hoàn tất được email và lịch Calendar');
      }
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < BOOKING_API_RETRY_COUNT) {
        await sleep(700 * (attempt + 1));
      }
    }
  }

  await logClientError('completeBooking', lastError, data);
  throw lastError;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function logClientError(context, error, data = {}) {
  if (!isConfiguredGoogleScriptUrl()) return;
  try {
    const body = bookingDataToUrlParams({
      context,
      message: error?.message || String(error || 'Unknown client error'),
      pageUrl: window.location.href,
      package: data.package || bookingState.package || '',
      phone: data.phone || bookingState.phone || '',
      email: data.email || bookingState.email || '',
      submittedAt: new Date().toISOString(),
    }, 'logClientError').toString();

    await fetch(BOOKING_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (logError) {
    console.warn('Không ghi được client error log:', logError);
  }
}

function getPackageOptions(consultationType) {
  return PACKAGE_OPTIONS[consultationType] || {};
}

function getSelectedPackageSnapshot() {
  return getPackageSnapshot(bookingState.package, bookingState.consultationType);
}

function getPackageSnapshot(packageValue, consultationType) {
  const option = getPackageOptions(consultationType)[packageValue] || {};
  const typeLabel = CONSULTATION_TYPE_LABELS[consultationType] || consultationType || '';
  const price = Number(option.price || 0);
  const onlinePrice = Number(option.onlinePrice || PACKAGE_OPTIONS.online?.[packageValue]?.price || 0);
  const offlinePrice = Number(option.offlinePrice || PACKAGE_OPTIONS.offline?.[packageValue]?.price || 0);
  const unit = normalizePackageUnit(option.unit || '/buổi');
  const hasOfflineTravelFee = consultationType === 'offline'
    && onlinePrice > 0
    && offlinePrice > onlinePrice;

  return {
    code: packageValue || '',
    name: option.name || stripHtmlToText(option.label || packageValue || ''),
    label: option.label || packageValue || '',
    price,
    priceLabel: `${formatPackagePriceLabel(price)}${unit}`,
    unit,
    onlinePrice,
    offlinePrice,
    typeLabel,
    hasOfflineTravelFee,
  };
}

function updatePackageChoiceSummary() {
  const summary = document.getElementById('package-choice-summary');
  const consultationTypeSelect = document.getElementById('consultation-type');
  const packageSelect = document.getElementById('package');
  if (!summary || !consultationTypeSelect || !packageSelect) return;

  const packageValue = packageSelect.value;
  const consultationType = consultationTypeSelect.value;
  const snapshot = getPackageSnapshot(packageValue, consultationType);
  if (!consultationType || !packageValue || !snapshot.price) {
    summary.hidden = true;
    summary.innerHTML = '';
    return;
  }

  const offlineNote = consultationType === 'offline'
    ? (snapshot.hasOfflineTravelFee
      ? '<div class="summary-note">Giá offline đã bao gồm phụ phí di chuyển.</div>'
      : '<div class="summary-note">Gói này không áp dụng phụ phí offline.</div>')
    : '<div class="summary-note">Buổi tư vấn sẽ diễn ra qua Google Meet.</div>';

  summary.innerHTML = `
    <div class="summary-row"><span>Hình thức</span><strong>${snapshot.typeLabel}</strong></div>
    <div class="summary-row"><span>Số tiền</span><strong>${snapshot.priceLabel}</strong></div>
    ${offlineNote}
  `;
  summary.hidden = false;
}

const MINI_REPORT_MEANINGS = {
  1: { text: 'Bạn có xu hướng chủ động, độc lập và muốn tự mở đường cho mình.', keywords: ['Chủ động', 'Tiên phong', 'Tự lập'] },
  2: { text: 'Bạn nhạy cảm với cảm xúc, giỏi kết nối và cần môi trường hài hòa.', keywords: ['Kết nối', 'Tinh tế', 'Hợp tác'] },
  3: { text: 'Bạn có năng lượng sáng tạo, biểu đạt tốt và dễ truyền cảm hứng.', keywords: ['Sáng tạo', 'Giao tiếp', 'Lan tỏa'] },
  4: { text: 'Bạn cần nền tảng vững, hệ thống rõ và cảm giác mọi thứ có thể kiểm soát.', keywords: ['Kỷ luật', 'Bền bỉ', 'Thực tế'] },
  5: { text: 'Bạn học tốt qua trải nghiệm, thích tự do và cần không gian để thay đổi.', keywords: ['Tự do', 'Linh hoạt', 'Trải nghiệm'] },
  6: { text: 'Bạn quan tâm đến trách nhiệm, gia đình, cộng đồng và sự chăm sóc.', keywords: ['Yêu thương', 'Trách nhiệm', 'Chữa lành'] },
  7: { text: 'Bạn có chiều sâu nội tâm, thích quan sát và thường cần thời gian để hiểu chính mình.', keywords: ['Chiêm nghiệm', 'Trực giác', 'Phân tích'] },
  8: { text: 'Bạn có bài học về năng lực, thành tựu, quản trị và cách dùng sức ảnh hưởng.', keywords: ['Thành tựu', 'Quản trị', 'Ảnh hưởng'] },
  9: { text: 'Bạn giàu lòng trắc ẩn, có tầm nhìn rộng và thường học qua sự buông bỏ.', keywords: ['Nhân ái', 'Tầm nhìn', 'Phụng sự'] },
  11: { text: 'Bạn nhạy năng lượng, giàu trực giác và dễ trở thành người truyền cảm hứng.', keywords: ['Trực giác', 'Khai sáng', 'Cảm hứng'] },
  22: { text: 'Bạn mang năng lượng kiến tạo lớn, cần biến lý tưởng thành cấu trúc thực tế.', keywords: ['Kiến tạo', 'Tầm vóc', 'Xây dựng'] },
  33: { text: 'Bạn mang năng lượng chữa lành và phụng sự lớn, cần học cách yêu thương mà không đánh mất chính mình.', keywords: ['Chữa lành', 'Phụng sự', 'Yêu thương'] },
};

const PERSONAL_YEAR_MEANINGS = {
  1: 'Năm khởi đầu: phù hợp gieo hạt, mở dự án mới và chủ động chọn hướng đi.',
  2: 'Năm kết nối: phù hợp hợp tác, lắng nghe cảm xúc và nuôi dưỡng quan hệ.',
  3: 'Năm biểu đạt: phù hợp sáng tạo, học hỏi, truyền thông và mở rộng niềm vui.',
  4: 'Năm xây nền: phù hợp kỷ luật, hệ thống hóa và xử lý những việc cần bền bỉ.',
  5: 'Năm thay đổi: phù hợp thử nghiệm, dịch chuyển và làm mới góc nhìn.',
  6: 'Năm trách nhiệm: phù hợp chăm sóc gia đình, chữa lành và cân bằng nghĩa vụ.',
  7: 'Năm chiêm nghiệm: phù hợp học sâu, tĩnh lại và hiểu rõ câu hỏi bên trong.',
  8: 'Năm thành tựu: phù hợp quản trị tài chính, sự nghiệp và năng lực cá nhân.',
  9: 'Năm hoàn tất: phù hợp tổng kết, buông bỏ điều cũ và chuẩn bị chu kỳ mới.',
};

const SOUL_MEANINGS = {
  1: { text: 'Bên trong bạn khao khát được tự quyết, được dẫn đường và được là chính mình.', keywords: ['Tự chủ', 'Dẫn dắt', 'Can đảm'] },
  2: { text: 'Linh hồn bạn cần sự kết nối, thấu hiểu và cảm giác được đồng hành nhẹ nhàng.', keywords: ['Kết nối', 'Hòa hợp', 'Tinh tế'] },
  3: { text: 'Bạn được nuôi dưỡng bởi biểu đạt, sáng tạo và niềm vui được chia sẻ cảm xúc.', keywords: ['Biểu đạt', 'Sáng tạo', 'Niềm vui'] },
  4: { text: 'Bạn cần cảm giác vững vàng, rõ ràng và một nền tảng đủ an toàn để phát triển.', keywords: ['Ổn định', 'Kỷ luật', 'An toàn'] },
  5: { text: 'Linh hồn bạn tìm kiếm tự do, trải nghiệm mới và không gian để thay đổi.', keywords: ['Tự do', 'Khám phá', 'Linh hoạt'] },
  6: { text: 'Bạn có nhu cầu yêu thương, chăm sóc và tạo nên sự hài hòa cho người mình quý.', keywords: ['Yêu thương', 'Chăm sóc', 'Hài hòa'] },
  7: { text: 'Bên trong bạn cần chiều sâu, sự tĩnh lặng và quyền được hiểu mọi thứ theo cách riêng.', keywords: ['Chiều sâu', 'Tĩnh lặng', 'Trực giác'] },
  8: { text: 'Bạn mong muốn làm chủ năng lực, tạo thành tựu và dùng sức ảnh hưởng đúng cách.', keywords: ['Thành tựu', 'Bản lĩnh', 'Ảnh hưởng'] },
  9: { text: 'Linh hồn bạn hướng đến lòng trắc ẩn, sự bao dung và những giá trị lớn hơn bản thân.', keywords: ['Bao dung', 'Nhân ái', 'Phụng sự'] },
  11: { text: 'Bạn có trực giác mạnh, dễ rung cảm với năng lượng xung quanh và cần tin vào ánh sáng nội tâm.', keywords: ['Trực giác', 'Cảm hứng', 'Khai mở'] },
  22: { text: 'Bạn mang khát vọng kiến tạo điều có ích, biến lý tưởng sâu bên trong thành cấu trúc thật.', keywords: ['Kiến tạo', 'Lý tưởng', 'Bền vững'] },
  33: { text: 'Sâu bên trong bạn có nhu cầu yêu thương, chữa lành và nâng đỡ người khác bằng sự bao dung trưởng thành.', keywords: ['Yêu thương', 'Chữa lành', 'Bao dung'] },
};

const MISSION_MEANINGS = {
  1: { text: 'Sứ mệnh của bạn là học cách đứng vững, mở đường và tạo dấu ấn riêng.', keywords: ['Mở đường', 'Độc lập', 'Tiên phong'] },
  2: { text: 'Bạn phát triển tốt khi trở thành người kết nối, hòa giải và nâng đỡ các mối quan hệ.', keywords: ['Hợp tác', 'Kết nối', 'Lắng nghe'] },
  3: { text: 'Con đường của bạn gắn với sáng tạo, truyền đạt và lan tỏa cảm hứng qua lời nói hoặc tác phẩm.', keywords: ['Giao tiếp', 'Sáng tạo', 'Lan tỏa'] },
  4: { text: 'Bạn đến để xây nền, tạo hệ thống và biến ý tưởng thành kết quả có thể dùng lâu dài.', keywords: ['Xây dựng', 'Hệ thống', 'Bền bỉ'] },
  5: { text: 'Bạn học qua trải nghiệm, thích nghi nhanh và giúp người khác nhìn thấy nhiều lựa chọn hơn.', keywords: ['Thích nghi', 'Trải nghiệm', 'Đổi mới'] },
  6: { text: 'Sứ mệnh của bạn liên quan đến trách nhiệm, chữa lành và tạo không gian an toàn cho người khác.', keywords: ['Chữa lành', 'Trách nhiệm', 'Gia đình'] },
  7: { text: 'Bạn có thiên hướng nghiên cứu, chiêm nghiệm và chia sẻ hiểu biết sau khi đã tự mình đào sâu.', keywords: ['Nghiên cứu', 'Chiêm nghiệm', 'Minh triết'] },
  8: { text: 'Bạn phát triển qua năng lực quản trị, tạo giá trị vật chất và dùng quyền lực một cách tỉnh táo.', keywords: ['Quản trị', 'Giá trị', 'Thành tựu'] },
  9: { text: 'Sứ mệnh của bạn là mở rộng lòng trắc ẩn, hoàn thiện bài học cũ và đóng góp cho cộng đồng.', keywords: ['Cộng đồng', 'Bao dung', 'Hoàn thiện'] },
  11: { text: 'Bạn có sứ mệnh truyền cảm hứng, đánh thức trực giác và giúp người khác tin vào ánh sáng của họ.', keywords: ['Truyền cảm hứng', 'Khai sáng', 'Trực giác'] },
  22: { text: 'Bạn có khả năng xây dựng điều lớn nếu biết kết hợp tầm nhìn với kỷ luật thực tế.', keywords: ['Tầm nhìn', 'Kiến tạo', 'Thực tế'] },
  33: { text: 'Bạn có sứ mệnh lan tỏa tình thương, chữa lành và dẫn dắt bằng sự nâng đỡ thay vì kiểm soát.', keywords: ['Lan tỏa', 'Chữa lành', 'Nâng đỡ'] },
};

const PYTHAGOREAN_VALUES = {
  a: 1, j: 1, s: 1,
  b: 2, k: 2, t: 2,
  c: 3, l: 3, u: 3,
  d: 4, m: 4, v: 4,
  e: 5, n: 5, w: 5,
  f: 6, o: 6, x: 6,
  g: 7, p: 7, y: 7,
  h: 8, q: 8, z: 8,
  i: 9, r: 9,
};

let miniReportContent = createDefaultMiniReportContent();
const landingContentReady = loadLandingContentFromSheet();

function initMiniReport() {
  const form = document.getElementById('mini-report-form');
  const dobInput = document.getElementById('mini-dob');
  if (!form || !dobInput) return;

  dobInput.max = getTodayDateInputValue();
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const name = document.getElementById('mini-name')?.value.trim() || '';
    const dob = dobInput.value;
    const result = buildMiniReport(name, dob);
    renderMiniReport(result);
  });
}

function buildMiniReport(name, dob) {
  const [year, month, day] = dob.split('-').map(Number);
  const lifePath = calculateLifePathNumber(day, month, year);
  const currentYear = new Date().getFullYear();
  const personalYear = resolveFinalNumber(sumDigits(day) + sumDigits(month) + sumDigits(currentYear), false);
  const soul = calculateNameNumber(name, true);
  const mission = calculateNameNumber(name, false);
  const meaning = getMiniReportMeaning('life_path', lifePath.meaningNumber);
  const soulMeaning = getMiniReportMeaning('soul', soul.meaningNumber);
  const missionMeaning = getMiniReportMeaning('mission', mission.meaningNumber);

  return {
    name,
    lifePath: lifePath.display,
    soul: soul.display,
    mission: mission.display,
    personalYear: personalYear.display,
    lifePathText: meaning.text,
    soulText: soulMeaning.text,
    missionText: missionMeaning.text,
    personalYearText: getMiniReportMeaning('personal_year', personalYear.meaningNumber).text,
    keywords: mergeMiniReportKeywords(meaning.keywords, soulMeaning.keywords, missionMeaning.keywords),
  };
}

function renderMiniReport(result) {
  const resultEl = document.getElementById('mini-report-result');
  if (!resultEl) return;

  document.getElementById('mini-life-path').textContent = result.lifePath;
  document.getElementById('mini-life-path-text').textContent = result.lifePathText;
  document.getElementById('mini-soul').textContent = result.soul;
  document.getElementById('mini-soul-text').textContent = result.soulText;
  document.getElementById('mini-mission').textContent = result.mission;
  document.getElementById('mini-mission-text').textContent = result.missionText;
  document.getElementById('mini-personal-year').textContent = result.personalYear;
  document.getElementById('mini-personal-year-text').textContent = result.personalYearText;

  const keywordsEl = document.getElementById('mini-keywords');
  if (keywordsEl) {
    keywordsEl.innerHTML = result.keywords.map((keyword) => `<span>${keyword}</span>`).join('');
  }

  const note = document.getElementById('mini-result-note');
  if (note) {
    note.textContent = `${result.name ? result.name + ', đây' : 'Đây'} là bản xem nhanh dựa trên ngày sinh. Buổi tư vấn 1:1 sẽ nối các chỉ số với câu chuyện thật của bạn để ra lộ trình rõ hơn.`;
  }

  resultEl.hidden = false;
  const scrollBlock = window.matchMedia('(max-width: 820px)').matches ? 'start' : 'nearest';
  resultEl.scrollIntoView({ behavior: 'smooth', block: scrollBlock });
}

function createDefaultMiniReportContent() {
  return {
    life_path: cloneMeaningMap(MINI_REPORT_MEANINGS),
    personal_year: Object.fromEntries(
      Object.entries(PERSONAL_YEAR_MEANINGS).map(([number, text]) => [number, { text, keywords: [] }])
    ),
    soul: cloneMeaningMap(SOUL_MEANINGS),
    mission: cloneMeaningMap(MISSION_MEANINGS),
  };
}

function cloneMeaningMap(map) {
  return Object.fromEntries(
    Object.entries(map).map(([number, meaning]) => [
      number,
      {
        text: meaning.text || '',
        keywords: Array.isArray(meaning.keywords) ? [...meaning.keywords] : [],
      },
    ])
  );
}

function syncMiniReportContent(items) {
  miniReportContent = createDefaultMiniReportContent();
  items.forEach((item) => {
    if (!item || item.enabled === false) return;
    const match = String(item.key || '').match(/^mini_report\.(life_path|personal_year|soul|mission)\.(\d+)\.(text|keywords)$/);
    if (!match) return;

    const [, type, number, field] = match;
    if (!miniReportContent[type]) miniReportContent[type] = {};
    if (!miniReportContent[type][number]) miniReportContent[type][number] = { text: '', keywords: [] };
    if (field === 'keywords') {
      miniReportContent[type][number].keywords = splitMiniReportKeywords(stripHtmlToText(item.value));
    } else {
      miniReportContent[type][number].text = stripHtmlToText(item.value);
    }
  });
}

function getMiniReportMeaning(type, number) {
  const map = miniReportContent[type] || {};
  const key = String(number);
  const reducedKey = String(reduceNumerologyNumber(number, false));
  return map[key] || map[reducedKey] || map[9] || { text: '', keywords: [] };
}

function splitMiniReportKeywords(value) {
  return String(value || '')
    .split(/[,\n|]+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function mergeMiniReportKeywords(...groups) {
  const keywords = [];
  groups.flat().forEach((keyword) => {
    if (keyword && !keywords.includes(keyword)) keywords.push(keyword);
  });
  return keywords.slice(0, 6);
}

function sumDigits(value) {
  return String(Math.abs(Number(value) || 0))
    .split('')
    .reduce((sum, digit) => sum + Number(digit), 0);
}

function reduceNumerologyNumber(value, keepMasterNumbers) {
  let num = Math.abs(Number(value) || 0);
  while (num > 9) {
    if (keepMasterNumbers && (num === 11 || num === 22 || num === 33)) return num;
    num = sumDigits(num);
  }
  return num || 9;
}

function calculateLifePathNumber(day, month, year) {
  const parts = [day, month, year].map((part) => reduceNumerologyNumber(part, true));
  return resolveFinalNumber(parts.reduce((sum, part) => sum + part, 0), true);
}

function resolveFinalNumber(value, keepMasterNumbers) {
  const num = Math.abs(Number(value) || 0);
  const karmicLabels = { 13: '13/4', 14: '14/5', 16: '16/7', 19: '19/1' };
  if (karmicLabels[num]) {
    return {
      value: num,
      display: karmicLabels[num],
      meaningNumber: reduceNumerologyNumber(num, false),
    };
  }

  const reduced = reduceNumerologyNumber(num, keepMasterNumbers);
  return {
    value: reduced,
    display: formatCompoundNumber(reduced),
    meaningNumber: reduced,
  };
}

function formatCompoundNumber(number) {
  const masterLabels = { 11: '11/2', 22: '22/4', 33: '33/6' };
  return masterLabels[Number(number)] || String(number);
}

function calculateNameNumber(name, vowelsOnly) {
  const wordNumbers = normalizeVietnameseName(name)
    .split(/\s+/)
    .map((word) => calculateNameWordNumber(word, vowelsOnly))
    .filter(Boolean);
  return resolveFinalNumber(wordNumbers.reduce((sum, number) => sum + number, 0), true);
}

function calculateNameWordNumber(word, vowelsOnly) {
  const letters = extractPythagoreanLetters(word, vowelsOnly);
  const total = letters.reduce((sum, letter) => sum + (PYTHAGOREAN_VALUES[letter] || 0), 0);
  return total ? reduceNumerologyNumber(total, true) : 0;
}

function extractPythagoreanLetters(word, vowelsOnly) {
  const chars = String(word || '').replace(/[^a-z]/g, '').split('');
  return chars.filter((char, index) => {
    const isVowel = isSoulVowel(chars, index);
    return vowelsOnly ? isVowel : true;
  });
}

function isSoulVowel(chars, index) {
  const char = chars[index];
  if (isBasicVowel(char)) return true;
  if (char !== 'y') return false;
  return !isBasicVowel(chars[index - 1]) && !isBasicVowel(chars[index + 1]);
}

function isBasicVowel(char) {
  return Boolean(char) && 'aeiou'.includes(char);
}

function normalizeVietnameseName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

function populatePackageOptions(consultationType, selectedValue = '', openPicker = false) {
  const packageSelect = document.getElementById('package');
  if (!packageSelect) return;

  const currentValue = selectedValue || packageSelect.value;
  const options = getPackageOptions(consultationType);
  const optionEntries = Object.entries(options);
  packageSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = consultationType
    ? (optionEntries.length ? '-- Chọn gói tư vấn --' : '-- Chưa có gói tư vấn --')
    : '-- Chọn hình thức trước --';
  packageSelect.appendChild(placeholder);

  optionEntries.forEach(([value, option]) => {
    const item = document.createElement('option');
    item.value = value;
    item.textContent = option.label;
    packageSelect.appendChild(item);
  });

  packageSelect.value = options[currentValue] ? currentValue : '';
  packageSelect.disabled = !consultationType || optionEntries.length === 0;
  updatePackageChoiceSummary();

  if (openPicker && consultationType && typeof packageSelect.showPicker === 'function') {
    packageSelect.focus();
    try {
      packageSelect.showPicker();
    } catch (error) {
      packageSelect.focus();
    }
  }
}

// ============================================
// BOOKING FLOW STATE & HELPERS
// ============================================

const bookingState = {
  name: '', dob: '', phone: '', email: '',
  consultationType: '', package: '', concern: '',
  selectedDate: null,   // JS Date object
  selectedTime: null,   // '19:00'
  bookedSlots: [],      // fetched from Apps Script [{start, end}]
  paymentOrderId: '',
};

// ---- Modal open/close ----
function openModal(id) {
  document.getElementById('booking-overlay').classList.add('active');
  document.getElementById(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeAllModals() {
  stopSepayWaiting();
  document.getElementById('booking-overlay').classList.remove('active');
  ['modal-calendar','modal-payment','modal-success'].forEach(id => {
    document.getElementById(id).classList.remove('active');
  });
  document.body.style.overflow = '';
}

// ---- Wire up modal close buttons ----
function initBookingModals() {
  document.getElementById('booking-overlay').addEventListener('click', closeAllModals);
  document.getElementById('close-calendar').addEventListener('click', closeAllModals);
  document.getElementById('close-payment').addEventListener('click', closeAllModals);

  document.getElementById('btn-go-payment').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span>Đang chuẩn bị thanh toán...</span>';
    await refreshPaymentSettingsBeforePayment();
    button.disabled = false;
    button.innerHTML = originalHtml;
    closeAllModals();
    openPaymentModal();
  });

  document.getElementById('btn-back-calendar').addEventListener('click', () => {
    closeAllModals();
    openModal('modal-calendar');
  });

  document.getElementById('btn-confirm-payment').addEventListener('click', finalizeBooking);
  document.getElementById('btn-success-close').addEventListener('click', () => {
    closeAllModals();
    document.getElementById('booking-form').reset();
    populatePackageOptions('');
  });

  document.getElementById('btn-message-fanpage')?.addEventListener('click', (event) => {
    event.preventDefault();
    const fanpageBtn = event.currentTarget;
    const message = fanpageBtn.dataset.message;
    const isMobile = window.matchMedia('(max-width: 640px)').matches;

    copyTextToClipboard(message)
      .then(() => {
        showToast('Đã sao chép nội dung tin nhắn. Bạn chỉ cần dán vào Messenger.');
      })
      .catch(() => {
        showToast('Bạn vui lòng dán nội dung: Khách hàng đã chuyển khoản thanh toán, vui lòng kiểm tra.');
      })
      .finally(() => {
        setTimeout(() => {
          if (isMobile) {
            window.location.href = fanpageBtn.href;
            return;
          }
          window.open(fanpageBtn.href, '_blank', 'noopener');
        }, 1200);
      });
  });

  document.getElementById('retry-calendar').addEventListener('click', loadCalendar);

  document.querySelectorAll('.copyable').forEach(el => {
    el.addEventListener('click', () => {
      const text = el.dataset.copy || el.textContent.replace(/\s+/g,'').replace('📋','').trim();
      copyTextToClipboard(text).then(() => showToast('Đã sao chép!'));
    });
  });
}

function initMobileStickyCta() {
  const stickyCta = document.getElementById('mobile-sticky-cta');
  const contact = document.getElementById('contact');
  if (!stickyCta || !contact) return;

  const updateVisibility = () => {
    const isMobile = window.matchMedia('(max-width: 760px)').matches;
    const contactTop = contact.getBoundingClientRect().top;
    const shouldShow = isMobile && window.scrollY > 520 && contactTop > window.innerHeight * 0.45;
    stickyCta.classList.toggle('is-visible', shouldShow);
  };

  window.addEventListener('scroll', updateVisibility, { passive: true });
  window.addEventListener('resize', updateVisibility);
  updateVisibility();
}

// ============================================
// CALENDAR – generate slots locally + check booked from API
// Luôn tính giờ theo Asia/Ho_Chi_Minh (UTC+7)
// ============================================
function getVnDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const get = (type) => parseInt(parts.find((p) => p.type === type).value, 10);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

function makeVnDateTime(year, month, day, hour = 0, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, 0));
}

function makeVnDateTimeFromDate(date, hour, minute = 0) {
  const { year, month, day } = getVnDateParts(date);
  return makeVnDateTime(year, month, day, hour, minute);
}

function addDaysToVnParts(year, month, day, daysToAdd) {
  const anchor = makeVnDateTime(year, month, day, 12);
  anchor.setUTCDate(anchor.getUTCDate() + daysToAdd);
  return getVnDateParts(anchor);
}

function getVnDayOfWeek(year, month, day) {
  return makeVnDateTime(year, month, day, 12).getUTCDay();
}

function slotsOverlap(slotStart, slotEnd, bookedStart, bookedEnd) {
  return slotStart < bookedEnd && slotEnd > bookedStart;
}

async function loadCalendar() {
  const loading = document.getElementById('cal-loading');
  const errBox  = document.getElementById('cal-error');
  const content = document.getElementById('cal-content');

  loading.style.display = 'flex';
  errBox.style.display  = 'none';
  content.style.display = 'none';
  bookingState.selectedDate = null;
  bookingState.selectedTime = null;
  document.getElementById('btn-go-payment').disabled = true;
  document.getElementById('selected-slot-info').style.display = 'none';

  try {
    const res = await fetchWithTimeout(`${BOOKING_SCRIPT_URL}?action=getBookedSlots&_=${Date.now()}`, {
      mode: 'cors',
      cache: 'no-store',
    }, BOOKING_API_TIMEOUT_MS);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Không tải được lịch đã đặt');
    bookingState.bookedSlots = json.booked || [];
  } catch (e) {
    logClientError('getBookedSlots', e);
    bookingState.bookedSlots = [];
    errBox.style.display = 'block';
    const errText = errBox.querySelector('p') || errBox;
    errText.textContent = 'Không tải được lịch trống từ Google. Vui lòng thử lại hoặc nhắn Zalo để đặt lịch.';
  }

  loading.style.display = 'none';
  content.style.display = 'block';
  renderDateStrip();
}

function generateSlotsForDate(date) {
  const { year, month, day } = getVnDateParts(date);
  const dayOfWeek = getVnDayOfWeek(year, month, day);
  const hours = (dayOfWeek === 0 || dayOfWeek === 6) ? WORKING_HOURS.weekend : WORKING_HOURS.weekday;
  const { start, end } = hours;
  const slotDurationHrs = WORKING_HOURS.slotDurationHrs;
  const slots = [];
  const now = new Date();

  for (let h = start; h + slotDurationHrs <= end; h += slotDurationHrs) {
    const label = `${String(h).padStart(2, '0')}:00\u00a0–\u00a0${String(h + slotDurationHrs).padStart(2, '0')}:00`;
    const slotStart = makeVnDateTime(year, month, day, h, 0);
    const slotEnd = makeVnDateTime(year, month, day, h + slotDurationHrs, 0);

    const isBooked = bookingState.bookedSlots.some((b) => {
      const bookedStart = new Date(b.start);
      const bookedEnd = new Date(b.end);
      return slotsOverlap(slotStart, slotEnd, bookedStart, bookedEnd);
    });

    const isFuture = slotStart > new Date(now.getTime() + 3600000);

    if (!isBooked && isFuture) slots.push({ label, hour: h, year, month, day });
  }
  return slots;
}

function renderDateStrip() {
  const strip = document.getElementById('cal-date-strip');
  strip.innerHTML = '';
  const todayParts = getVnDateParts();
  const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  for (let i = 0; i < 21; i++) {
    const parts = addDaysToVnParts(todayParts.year, todayParts.month, todayParts.day, i);
    const d = makeVnDateTime(parts.year, parts.month, parts.day, 0);
    const btn = document.createElement('button');
    btn.className = 'cal-date-btn';
    btn.innerHTML = `
      <span class="day-name">${DAY_NAMES[getVnDayOfWeek(parts.year, parts.month, parts.day)]}</span>
      <span class="day-num">${parts.day}</span>
      <span class="month">Th${parts.month}</span>`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cal-date-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      bookingState.selectedDate = d;
      bookingState.selectedTime = null;
      document.getElementById('btn-go-payment').disabled = true;
      document.getElementById('selected-slot-info').style.display = 'none';
      renderTimeSlots(d);
    });
    strip.appendChild(btn);
  }
}

function renderTimeSlots(date) {
  const grid = document.getElementById('cal-time-grid');
  grid.innerHTML = '';
  const slots = generateSlotsForDate(date);
  if (!slots.length) {
    grid.innerHTML = '<div class="cal-no-slots">Không còn khung giờ trống cho ngày này 😔<br>Vui lòng chọn ngày khác.</div>';
    return;
  }
  slots.forEach(slot => {
    const btn = document.createElement('button');
    btn.className = 'cal-time-btn';
    btn.textContent = slot.label;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cal-time-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      bookingState.selectedTime = `${String(slot.hour).padStart(2,'0')}:00`;
      bookingState.selectedSlotLabel = slot.label;

      const DAY_VN = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const parts = getVnDateParts(bookingState.selectedDate);
      const dateStr = `${DAY_VN[getVnDayOfWeek(parts.year, parts.month, parts.day)]}, ${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${parts.year}`;
      const fullSlot = `${dateStr} | ${slot.label}`;
      bookingState.fullSlotLabel = fullSlot;

      document.getElementById('selected-slot-text').textContent = fullSlot;
      document.getElementById('selected-slot-info').style.display = 'flex';
      document.getElementById('btn-go-payment').disabled = false;
    });
    grid.appendChild(btn);
  });
}

// ============================================
// PAYMENT MODAL
// ============================================
function openPaymentModal() {
  const snapshot = getSelectedPackageSnapshot();
  const price = snapshot.price;
  if (!price) {
    showToast('Bạn vui lòng chọn lại gói tư vấn để hệ thống cập nhật đúng số tiền.');
    return;
  }

  const priceStr = price.toLocaleString('vi-VN') + 'đ';
  if (paymentSettings.sepayEnabled && !bookingState.paymentOrderId) {
    bookingState.paymentOrderId = buildPaymentOrderId(snapshot.code, bookingState.phone);
  }
  if (!paymentSettings.sepayEnabled) {
    bookingState.paymentOrderId = '';
  }
  const transferContent = paymentSettings.sepayEnabled
    ? bookingState.paymentOrderId
    : buildTransferContent(snapshot.code, bookingState.phone);
  const isSepay = paymentSettings.sepayEnabled;
  const bankBin = paymentSettings.bankBin || BANK_BIN;
  
  const displayBankName = isSepay ? (paymentSettings.sepayBankName || 'BIDV') : (paymentSettings.bankName || 'BIDV');
  const displayBankAccount = isSepay ? (paymentSettings.sepayBankAccount || '96247031088CUONG') : (paymentSettings.bankAccount || BANK_ACCOUNT);
  const displayBankAccountName = paymentSettings.bankAccountName || BANK_NAME_DISPLAY;

  // Build QR URL
  let qrUrl = '';
  if (isSepay) {
    // SePay Dynamic QR URL
    qrUrl = `https://qr.sepay.vn/img?acc=${displayBankAccount}&bank=${displayBankName}&amount=${price}&des=${encodeURIComponent(transferContent)}`;
  } else {
    // VietQR URL
    qrUrl = `https://img.vietqr.io/image/${bankBin}-${displayBankAccount}-compact2.jpg?amount=${price}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(displayBankAccountName)}`;
  }

  document.getElementById('qr-img').src = qrUrl;
  document.getElementById('bank-name').textContent = displayBankName;
  document.getElementById('bank-account').innerHTML = `${displayBankAccount} <i class="fa-regular fa-copy"></i>`;
  document.getElementById('bank-account').dataset.copy = displayBankAccount;
  document.getElementById('bank-account-name').textContent = displayBankAccountName;
  document.getElementById('pay-amount').textContent = priceStr;
  document.getElementById('pay-content').textContent = transferContent;
  document.getElementById('pay-content').dataset.copy = transferContent;
  document.getElementById('pay-slot').textContent = bookingState.fullSlotLabel || '';
  document.getElementById('pay-package').textContent = snapshot.name || snapshot.label;
  document.getElementById('pay-type').textContent = snapshot.typeLabel;

  const detailRow = document.getElementById('pay-package-detail-row');
  const detailText = document.getElementById('pay-package-detail');
  if (detailRow && detailText) {
    detailText.textContent = snapshot.priceLabel;
    detailRow.hidden = false;
  }

  preparePaymentMode({
    amount: price,
    transferContent,
  });
  openModal('modal-payment');
}

function preparePaymentMode(paymentMeta) {
  stopSepayWaiting();
  const waiting = document.getElementById('sepay-waiting');
  const confirmBtn = document.getElementById('btn-confirm-payment');
  const noteText = document.getElementById('payment-note-text');
  const title = document.getElementById('modal-pay-title');

  if (!paymentSettings.sepayEnabled) {
    waiting.hidden = true;
    confirmBtn.hidden = false;
    confirmBtn.style.display = '';
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<span>✓ Tôi Đã Chuyển Khoản Thành Công</span>';
    title.textContent = 'Thanh Toán Chuyển Khoản';
    noteText.textContent = 'Sau khi chuyển khoản, nhấn nút bên dưới để hoàn tất. Chúng tôi sẽ xác nhận và gửi email cho bạn ngay.';
    return;
  }

  waiting.hidden = false;
  confirmBtn.hidden = true;
  confirmBtn.style.display = 'none';
  confirmBtn.disabled = true;
  title.textContent = 'Thanh Toán SePay';
  noteText.textContent = 'Vui lòng quét mã và giữ nguyên nội dung chuyển khoản. Hệ thống sẽ tự xác nhận khi nhận được thanh toán.';
  startSepayWaiting(paymentMeta);
}

function startSepayWaiting(paymentMeta) {
  const countdown = document.getElementById('sepay-countdown');
  const statusText = document.getElementById('sepay-status-text');
  const timeoutSeconds = Math.max(60, Number(paymentSettings.paymentTimeoutMinutes || 15) * 60);
  const expiresAt = Date.now() + timeoutSeconds * 1000;

  const updateCountdown = () => {
    const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    countdown.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    if (remaining <= 0) {
      stopSepayWaiting();
      statusText.textContent = 'Thanh toán đã quá hạn. Bạn có thể quay lại chọn lịch hoặc tải lại mã thanh toán.';
      return;
    }
  };

  updateCountdown();
  sepayPaymentTimer = window.setInterval(updateCountdown, 1000);
  sepayPaymentPoller = window.setInterval(() => checkSepayPaymentStatus(paymentMeta), 5000);
}

function stopSepayWaiting() {
  if (sepayPaymentTimer) window.clearInterval(sepayPaymentTimer);
  if (sepayPaymentPoller) window.clearInterval(sepayPaymentPoller);
  sepayPaymentTimer = null;
  sepayPaymentPoller = null;
}

async function checkSepayPaymentStatus(paymentMeta) {
  if (!paymentSettings.sepayEnabled || !isConfiguredGoogleScriptUrl()) return;
  try {
    const data = getBookingDataObject();
    const params = bookingDataToUrlParams(Object.assign({}, data, paymentMeta), 'checkSepayPayment').toString();
    const res = await fetchWithTimeout(`${BOOKING_SCRIPT_URL}?${params}`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
    }, BOOKING_API_TIMEOUT_MS);
    const result = await res.json();
    if (!result.ok || result.status !== 'paid') return;

    stopSepayWaiting();

    const statusText = document.getElementById('sepay-status-text');
    if (statusText) statusText.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang hoàn tất lịch hẹn...';
    const countdown = document.getElementById('sepay-countdown');
    if (countdown) countdown.style.display = 'none';

    await saveBookingToSheet(data);
    await completeBookingOnServer(data);

    closeAllModals();
    showSuccessModal();
  } catch (error) {
    console.warn('SePay status check failed:', error);
  }
}

// ============================================
// FINAL SUBMIT – save to Sheet + create Calendar event + send Email
// ============================================
async function finalizeBooking() {
  if (paymentSettings.sepayEnabled) {
    showToast('SePay đang bật, hệ thống sẽ tự xác nhận khi nhận được thanh toán.');
    return;
  }

  const btn = document.getElementById('btn-confirm-payment');
  btn.innerHTML = '<span>Đang xử lý...</span>';
  btn.disabled = true;

  try {
    const data = getBookingDataObject();

    // Bước 1: Lưu Sheet (POST no-cors – thường chỉ chạy được phần này)
    await saveBookingToSheet(data);

    // Bước 2: Gửi email + tạo Google Calendar (GET cors – chạy đủ và có phản hồi)
    const result = await completeBookingOnServer(data);

    if (result.emailStatus && !result.emailStatus.customer?.sent) {
      const errMsg = result.emailStatus.customer?.error || 'chưa xác định';
      console.warn('Customer email failed:', errMsg);
      showToast('Đã lưu đăng ký. Email xác nhận chưa gửi được — kiểm tra Spam hoặc nhắn Zalo.');
    }

    closeAllModals();
    showSuccessModal();
  } catch (err) {
    await logClientError('finalizeBooking', err, getBookingDataObject());
    showToast('Có lỗi khi xử lý. Vui lòng chụp màn hình và liên hệ qua Zalo/Facebook để được hỗ trợ.');
    btn.innerHTML = '<span>✓ Tôi Đã Chuyển Khoản Thành Công</span>';
    btn.disabled = false;
  }
}

function buildSlotISO(date, timeStr, addHours = 0) {
  if (!date || !timeStr) return '';
  const [h, m = 0] = timeStr.split(':').map(Number);
  return makeVnDateTimeFromDate(date, h + addHours, m).toISOString();
}

function formatDobForSheet(val) {
  if (!val) return '';
  const parts = val.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return val;
}

function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validateDobValue(value) {
  if (!value) {
    return { valid: false, message: 'Vui lòng nhập ngày tháng năm sinh.' };
  }

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return { valid: false, message: 'Ngày sinh chưa đúng định dạng dd/mm/yyyy, năm phải gồm 4 số.' };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const today = new Date();

  if (year < 1900 || year > today.getFullYear()) {
    return { valid: false, message: 'Năm sinh chưa hợp lệ. Vui lòng nhập năm sinh gồm 4 số.' };
  }

  const dob = new Date(year, month - 1, day);
  const isRealDate = dob.getFullYear() === year && dob.getMonth() === month - 1 && dob.getDate() === day;
  if (!isRealDate) {
    return { valid: false, message: 'Ngày sinh không hợp lệ. Vui lòng kiểm tra lại ngày, tháng, năm.' };
  }

  if (dob > today) {
    return { valid: false, message: 'Ngày sinh không được lớn hơn ngày hiện tại.' };
  }

  return { valid: true, message: '' };
}

// ============================================
// SUCCESS MODAL
// ============================================
function showSuccessModal() {
  document.getElementById('success-greeting').textContent =
    `Chào mừng ${bookingState.name}! Lịch tư vấn của bạn đã được xác nhận.`;

  const typeLabel = CONSULTATION_TYPE_LABELS[bookingState.consultationType] || bookingState.consultationType;
  const packageSnapshot = getSelectedPackageSnapshot();

  document.getElementById('success-summary').innerHTML = `
    <div class="success-summary-row"><i class="fa-regular fa-clock"></i><span><strong>Thời gian:</strong> ${bookingState.fullSlotLabel}</span></div>
    <div class="success-summary-row"><i class="fa-solid fa-box-open"></i><span><strong>Gói:</strong> ${packageSnapshot.name || packageSnapshot.label}</span></div>
    <div class="success-summary-row"><i class="fa-solid fa-money-bill-wave"></i><span><strong>Số tiền:</strong> ${packageSnapshot.priceLabel}</span></div>
    <div class="success-summary-row"><i class="fa-solid fa-video"></i><span><strong>Hình thức:</strong> ${typeLabel}</span></div>
    <div class="success-summary-row"><i class="fa-regular fa-envelope"></i><span><strong>Email xác nhận:</strong> ${bookingState.email}</span></div>`;

  openModal('modal-success');
}



// ===== COUNTER ANIMATION =====
function animateCounter(el, start, end, suffix, duration) {
  let startTime = null;
  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.floor(eased * (end - start) + start);
    el.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ===== TOAST =====
function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  return Promise.resolve();
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

// ===== PARTICLES =====
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = window.innerWidth;
  let H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;

  const colors = [
    'rgba(217, 78, 31, alpha)',
    'rgba(212, 168, 67, alpha)',
    'rgba(232, 168, 120, alpha)',
    'rgba(27, 97, 107, alpha)',
  ];

  const particles = [];
  const NUM = 70;

  for (let i = 0; i < NUM; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 2.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4 - 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.6 + 0.2,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  let animId;
  function animate() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.dx;
      p.y += p.dy;
      p.pulse += 0.02;
      const alpha = p.alpha * (0.7 + 0.3 * Math.sin(p.pulse));

      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace('alpha', alpha);
      ctx.fill();
    });

    // Draw some subtle connecting lines
    particles.forEach((p, i) => {
      particles.slice(i + 1, i + 5).forEach(q => {
        const dist = Math.hypot(p.x - q.x, p.y - q.y);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          const lineAlpha = (1 - dist / 120) * 0.08;
          ctx.strokeStyle = `rgba(212, 168, 67, ${lineAlpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    });

    animId = requestAnimationFrame(animate);
  }
  animate();

  window.addEventListener('resize', () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
  }, { passive: true });
}


/* ===== SCROLL PROGRESS BAR WITH TITLE ===== */
window.addEventListener('scroll', () => {
  const scrollProgress = document.getElementById('scrollProgress');
  const scrollTitle = document.getElementById('scrollTitle');
  
  if(scrollProgress) {
    const totalHeight = document.body.scrollHeight - window.innerHeight;
    const scrollY = window.scrollY;
    const progressWidth = (scrollY / totalHeight) * 100;
    scrollProgress.style.width = progressWidth + '%';

    // Update Title based on scroll position
    if (scrollTitle) {
      const sections = document.querySelectorAll('section');
      let currentSectionId = '';
      
      sections.forEach(section => {
        const sectionTop = section.offsetTop - 100; // offset for navbar
        if (scrollY >= sectionTop) {
          currentSectionId = section.getAttribute('id');
        }
      });

      const sectionTitles = {
        'hero': 'Khám Phá',
        'about': 'Về Chúng Tôi',
        'pain-points': 'Bạn Đang Gặp Phải?',
        'benefits': 'Những Gì Bạn Nhận Được',
        'packages': 'Gói Tư Vấn',
        'process': 'Hành Trình',
        'testimonials': 'Khách Hàng Nói Gì?',
        'contact': 'Liên Hệ'
      };

      if (currentSectionId && sectionTitles[currentSectionId]) {
        scrollTitle.textContent = sectionTitles[currentSectionId];
        scrollTitle.style.opacity = '1';
      } else {
        scrollTitle.textContent = 'Trang Chủ';
      }

      // Hide title when at the very top to avoid cluttering
      if (scrollY < 50) {
        scrollTitle.style.opacity = '0';
      }

      // Clamp title position so it tracks the tip but doesn't overflow screen
      const titleWidth = scrollTitle.offsetWidth;
      const barRight = scrollProgress.getBoundingClientRect().right;
      let desiredCenter = barRight;
      let leftEdge = desiredCenter - titleWidth / 2;
      let rightEdge = desiredCenter + titleWidth / 2;
      
      let xOffset = titleWidth / 2; // Default: centered on tip (equivalent to translateX(50%))
      if (leftEdge < 10) {
        xOffset += (10 - leftEdge); // Push right if off left edge
      } else if (rightEdge > window.innerWidth - 10) {
        xOffset -= (rightEdge - (window.innerWidth - 10)); // Push left if off right edge
      }
      scrollTitle.style.transform = `translateX(${xOffset}px)`;
    }
  }

  // Scroll to Top Button Visibility
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  if (scrollTopBtn) {
    if (window.scrollY > document.body.scrollHeight / 2) {
      scrollTopBtn.classList.add('show');
    } else {
      scrollTopBtn.classList.remove('show');
    }
  }

}, { passive: true });

// ===== SCROLL TO TOP CLICK =====
const scrollTopBtn = document.getElementById('scrollTopBtn');
if (scrollTopBtn) {
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// ============================================
// BACKGROUND MUSIC TOGGLE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const bgMusic = document.getElementById('bg-music');
  const musicToggleBtn = document.getElementById('musicToggleBtn');
  
  if (bgMusic && musicToggleBtn) {
    const interactionEvents = ['pointerdown', 'touchstart', 'keydown', 'scroll'];
    let shouldPlayMusic = true;
    let isWaitingForInteraction = false;

    const setMusicButtonState = (isPlaying) => {
      musicToggleBtn.innerHTML = isPlaying
        ? '<i class="fa-solid fa-volume-high"></i>'
        : '<i class="fa-solid fa-volume-xmark"></i>';
      musicToggleBtn.classList.toggle('playing', isPlaying);
      musicToggleBtn.setAttribute('aria-label', isPlaying ? 'Tắt nhạc' : 'Bật nhạc');
      musicToggleBtn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    };

    const removeAutoplayListeners = () => {
      interactionEvents.forEach((eventName) => {
        document.removeEventListener(eventName, handleFirstInteraction);
      });
      isWaitingForInteraction = false;
    };

    const addAutoplayListeners = () => {
      if (isWaitingForInteraction) return;
      isWaitingForInteraction = true;
      interactionEvents.forEach((eventName) => {
        document.addEventListener(eventName, handleFirstInteraction, { passive: true });
      });
    };

    const tryPlayMusic = () => {
      if (!shouldPlayMusic) return Promise.resolve();

      return bgMusic.play()
        .then(() => {
          setMusicButtonState(true);
          removeAutoplayListeners();
        })
        .catch(() => {
          setMusicButtonState(false);
          addAutoplayListeners();
        });
    };

    function handleFirstInteraction(event) {
      if (musicToggleBtn.contains(event.target)) return;
      removeAutoplayListeners();
      tryPlayMusic();
    }

    bgMusic.volume = 0.35;
    setMusicButtonState(true);
    tryPlayMusic();

    bgMusic.addEventListener('play', () => {
      setMusicButtonState(true);
      removeAutoplayListeners();
    });

    bgMusic.addEventListener('pause', () => {
      setMusicButtonState(false);
    });

    musicToggleBtn.addEventListener('click', () => {
      if (bgMusic.paused) {
        shouldPlayMusic = true;
        tryPlayMusic();
      } else {
        shouldPlayMusic = false;
        bgMusic.pause();
        removeAutoplayListeners();
        setMusicButtonState(false);
      }
    });
  }
});
