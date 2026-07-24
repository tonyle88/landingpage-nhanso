/* =============================================
   JAVASCRIPT FOR NHÂN SỐ HỌC LANDING PAGE
   ============================================= */

// Sheet cũ: đặt lịch, Calendar, Email, lưu booking.
const BOOKING_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxbWZXF2iCsWsr0cWL0JVChANywEq7D7l_mCIvrvqZs78vSOsPej3PuXFgHbOiVNoKr/exec';
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

document.addEventListener('DOMContentLoaded', () => {
  initYouTubeEmbeds();

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

  window.addEventListener('clow-booking-form-valid', () => {
    if (!isConfiguredGoogleScriptUrl()) {
      showToast('Vui lòng cấu hình Google Apps Script URL.');
      return;
    }
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
  if (window.ClowLandingContentSettled) {
    initStatCounters();
  } else {
    window.addEventListener('clow-landing-content-settled', initStatCounters, { once: true });
  }

  // ===== PACKAGE CARD GLOW ON HOVER =====
  bindPackageCardGlow();
});

async function refreshPaymentSettingsBeforePayment() {
  if (!window.ClowPaymentRuntime) {
    throw new Error('Chưa khởi tạo được cấu hình thanh toán. Vui lòng thử lại.');
  }
  return window.ClowPaymentRuntime.refreshSettings();
}

function applyLegacyLandingContent(payload, options = {}) {
  initYouTubeEmbeds();

  const packages = normalizePackages(payload.packages);
  if (packages.length > 0) {
    syncPackageOptionsFromPackages(packages);
  } else {
    syncPackageOptionsFromLandingContent(payload.items);
  }

}

window.ClowLandingContentRuntime = {
  applyLegacy: applyLegacyLandingContent,
};
window.dispatchEvent(new Event('clow-landing-runtime-ready'));

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
  const state = getBookingState();
  const transferContent = state.paymentOrderId || buildTransferContent(state.package, state.phone);
  const packageSnapshot = getSelectedPackageSnapshot();
  const calendarSelection = getCalendarSelection();

  return {
    bookingId: ensureBookingId(),
    name: state.name,
    dob: formatDobForSheet(state.dob),
    phone: "'" + state.phone,
    email: state.email,
    consultationType: state.consultationType,
    consultationTypeLabel: CONSULTATION_TYPE_LABELS[state.consultationType] || state.consultationType,
    package: state.package,
    packageName: packageSnapshot.name,
    packageLabel: packageSnapshot.label,
    packagePrice: String(packageSnapshot.price),
    packageUnit: packageSnapshot.unit,
    packageOnlinePrice: String(packageSnapshot.onlinePrice || ''),
    packageOfflinePrice: String(packageSnapshot.offlinePrice || ''),
    hasOfflineTravelFee: packageSnapshot.hasOfflineTravelFee ? 'true' : 'false',
    transferContent: transferContent,
    concern: state.concern,
    slotLabel: calendarSelection.fullSlotLabel,
    slotStart: calendarSelection.slotStart,
    slotEnd: calendarSelection.slotEnd,
    submittedAt: new Date().toISOString(),
    pageUrl: window.location.href,
    paymentProvider: window.ClowPaymentRuntime?.getSettings().sepayEnabled ? 'sepay' : 'manual_qr',
    paymentOrderId: state.paymentOrderId,
  };
}

function ensureBookingId() {
  const state = getBookingState();
  if (state.bookingId) return state.bookingId;
  const suffix = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const bookingId = `BKG-${suffix}`.toUpperCase();
  window.ClowBookingState?.patch({ bookingId });
  return bookingId;
}

function buildTransferContent(packageCode, phone) {
  const cleanPackageCode = String(packageCode || '').trim().toUpperCase();
  const cleanPhone = String(phone || '').replace(/\s+/g, '');
  return `${cleanPackageCode} ${cleanPhone}`.trim();
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

async function postBookingAction(action, data) {
  const client = await getBookingApiClient();
  return client.postAction(action, data);
}

function createBookingOnServer(data) {
  return postBookingAction('createBooking', data);
}

function applyBookingReservation(reservation) {
  const state = getBookingState();
  window.ClowBookingState?.patch({
    bookingId: reservation.bookingId || state.bookingId,
    paymentOrderId: reservation.paymentOrderId || '',
    expectedAmount: Number(reservation.amount || 0),
    holdExpiresAt: reservation.holdExpiresAt || '',
  });
}

async function cancelBookingReservation() {
  const state = getBookingState();
  if (!state.bookingId) return;
  try {
    await postBookingAction('cancelBooking', { bookingId: state.bookingId });
  } catch (error) {
    console.warn('Không thể hủy giữ chỗ cũ:', error);
  } finally {
    window.ClowBookingState?.patch({
      bookingId: '',
      paymentOrderId: '',
      expectedAmount: 0,
      holdExpiresAt: '',
    });
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const client = await getBookingApiClient();
  return client.fetchWithTimeout(url, options, timeoutMs);
}

async function logClientError(context, error, data = {}) {
  if (!isConfiguredGoogleScriptUrl()) return;
  const state = getBookingState();
  const client = await getBookingApiClient();
  return client.logError(context, error, {
    ...data,
    package: data.package || state.package || '',
    phone: data.phone || state.phone || '',
    email: data.email || state.email || '',
  });
}

async function getBookingApiClient() {
  if (window.ClowBookingApi) return window.ClowBookingApi;
  return new Promise((resolve) => {
    window.addEventListener('clow-booking-api-ready', () => {
      resolve(window.ClowBookingApi);
    }, { once: true });
  });
}

function getPackageOptions(consultationType) {
  return PACKAGE_OPTIONS[consultationType] || {};
}

function getSelectedPackageSnapshot() {
  const state = getBookingState();
  return getPackageSnapshot(state.package, state.consultationType);
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

function getMiniReportMeaning(type, number) {
  return window.ClowMiniReportRuntime?.getMeaning(type, number)
    || { text: '', keywords: [] };
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

function getBookingState() {
  const state = window.ClowBookingState?.getState();
  if (!state) throw new Error('Booking state chưa sẵn sàng.');
  return state;
}

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
    try {
      await refreshPaymentSettingsBeforePayment();
      const reservation = await createBookingOnServer(getBookingDataObject());
      applyBookingReservation(reservation);
      closeAllModals();
      openPaymentModal();
    } catch (error) {
      showToast(error.message || 'Không thể giữ chỗ. Vui lòng chọn lại lịch.');
    } finally {
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
  });

  document.getElementById('btn-back-calendar').addEventListener('click', async () => {
    await cancelBookingReservation();
    closeAllModals();
    openModal('modal-calendar');
    loadCalendar();
  });

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
async function loadCalendar() {
  if (window.ClowBookingCalendar) {
    return window.ClowBookingCalendar.load();
  }
  return new Promise((resolve) => {
    window.addEventListener('clow-booking-calendar-ready', () => {
      resolve(window.ClowBookingCalendar.load());
    }, { once: true });
  });
}

function getCalendarSelection() {
  return window.ClowBookingCalendar?.getSelection() || {
    selectedDate: null,
    selectedTime: '',
    fullSlotLabel: '',
    slotStart: '',
    slotEnd: '',
  };
}

// ============================================
// PAYMENT MODAL
// ============================================
function openPaymentModal() {
  const snapshot = getSelectedPackageSnapshot();
  const state = getBookingState();
  const price = Number(state.expectedAmount || 0);
  if (!state.bookingId || !state.paymentOrderId || !price) {
    showToast('Không thể tạo thông tin thanh toán. Vui lòng quay lại chọn lịch.');
    return;
  }
  window.ClowPaymentRuntime?.open(snapshot);
}

function stopSepayWaiting() {
  window.ClowPaymentRuntime?.stop();
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
