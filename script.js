/* =============================================
   JAVASCRIPT FOR NHÂN SỐ HỌC LANDING PAGE
   ============================================= */

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxOlNPUunzX4gJvtpKvvXYdBQRMXEKyEqB4L_39CLu-qt4trPzgDoLXRRmauCk2iA2P/exec';
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
const CONSULTATION_TYPE_LABELS = {
  online: 'Online - Google Meet',
  offline: 'Offline - Trực tiếp tại TP.HCM',
};

// Bank info for VietQR
const BANK_BIN = '970436'; // Vietcombank BIN
const BANK_ACCOUNT = '0421003904479';
const BANK_NAME_DISPLAY = 'LÊ CHÍ CƯỜNG';

// Working hours config (24h format)
// Mon–Fri: 19–21, Sat–Sun: 9–21, slot duration 2h
const WORKING_HOURS = {
  weekday: { start: 19, end: 21 }, // Mon(1)–Fri(5)
  weekend: { start: 9, end: 21 },  // Sat(6)–Sun(0)
  slotDurationHrs: 2,
};

document.addEventListener('DOMContentLoaded', () => {

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
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => {
    revealObserver.observe(el);
  });

  // ===== TESTIMONIALS CAROUSEL =====
  const testimonialsTrack = document.getElementById('testimonials-track');
  if (testimonialsTrack) {
    const testimonialCards = Array.from(testimonialsTrack.querySelectorAll('.testimonial-card'));
    const prevTestimonialBtn = document.querySelector('.testimonial-nav-prev');
    const nextTestimonialBtn = document.querySelector('.testimonial-nav-next');
    const testimonialDots = document.getElementById('testimonials-dots');
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

    prevTestimonialBtn?.addEventListener('click', () => {
      centerTestimonial(activeTestimonialIndex - 1);
    });

    nextTestimonialBtn?.addEventListener('click', () => {
      centerTestimonial(activeTestimonialIndex + 1);
    });

    testimonialsTrack.addEventListener('scroll', () => {
      window.clearTimeout(testimonialScrollTimer);
      testimonialScrollTimer = window.setTimeout(updateActiveFromScroll, 90);
    }, { passive: true });

    setActiveTestimonial(0);
    window.requestAnimationFrame(() => centerTestimonial(0, 'auto'));
  }

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
  packageSelect?.addEventListener('focus', () => {
    populatePackageOptions(consultationTypeSelect?.value || '', packageSelect.value);
  });
  packageSelect?.addEventListener('pointerdown', () => {
    populatePackageOptions(consultationTypeSelect?.value || '', packageSelect.value);
  });

  document.querySelectorAll('a[href="#contact"][id^="pkg-"]').forEach(link => {
    link.addEventListener('click', () => {
      const packageValue = link.id.replace('pkg-', '');
      const selectedType = consultationTypeSelect?.value || 'online';
      if (consultationTypeSelect && !consultationTypeSelect.value) {
        consultationTypeSelect.value = selectedType;
        populatePackageOptions(selectedType);
      }
      if (packageSelect && getPackageOptions(selectedType)[packageValue]) {
        packageSelect.value = packageValue;
      }
    });
  });

  // ===== FORM SUBMIT → OPEN CALENDAR MODAL =====
  const form = document.getElementById('booking-form');

  // Custom validation messages
  const requiredInputs = form?.querySelectorAll('[required]');
  requiredInputs?.forEach(input => {
    input.addEventListener('invalid', function() {
      if (this.validity.valueMissing) this.setCustomValidity('Vui lòng nhập thông tin');
    });
    input.addEventListener('input', function() { this.setCustomValidity(''); });
    input.addEventListener('change', function() { this.setCustomValidity(''); });
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
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
    openModal('modal-calendar');
    loadCalendar();
  });

  // ===== BOOKING MODAL LOGIC =====
  initBookingModals();
  // ===== SMOOTH COUNTER ANIMATION =====
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

  // ===== PACKAGE CARD GLOW ON HOVER =====
  document.querySelectorAll('.package-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });
  });
});

function isConfiguredGoogleScriptUrl() {
  return GOOGLE_SCRIPT_URL && !GOOGLE_SCRIPT_URL.includes('PASTE_GOOGLE_APPS_SCRIPT');
}

function getBookingDataObject() {
  return {
    name: bookingState.name,
    dob: formatDobForSheet(bookingState.dob),
    phone: "'" + bookingState.phone,
    email: bookingState.email,
    consultationType: bookingState.consultationType,
    consultationTypeLabel: CONSULTATION_TYPE_LABELS[bookingState.consultationType] || bookingState.consultationType,
    package: bookingState.package,
    packageLabel: getPackageLabel(bookingState.package, bookingState.consultationType),
    packagePrice: String(getPackagePrice(bookingState.package, bookingState.consultationType)),
    concern: bookingState.concern,
    slotLabel: bookingState.fullSlotLabel || '',
    slotStart: buildSlotISO(bookingState.selectedDate, bookingState.selectedTime),
    slotEnd: buildSlotISO(bookingState.selectedDate, bookingState.selectedTime, WORKING_HOURS.slotDurationHrs),
    submittedAt: new Date().toISOString(),
    pageUrl: window.location.href,
  };
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
  await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

async function completeBookingOnServer(data) {
  const query = bookingDataToUrlParams(data, 'completeBooking').toString();
  const res = await fetch(`${GOOGLE_SCRIPT_URL}?${query}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-store',
  });
  const result = await res.json();
  if (!result.ok) {
    throw new Error(result.message || 'Không hoàn tất được email và lịch Calendar');
  }
  return result;
}

function getPackageOptions(consultationType) {
  return PACKAGE_OPTIONS[consultationType] || {};
}

function getPackageLabel(packageValue, consultationType) {
  return getPackageOptions(consultationType)[packageValue]?.label || packageValue || '';
}

function getPackagePrice(packageValue, consultationType) {
  return getPackageOptions(consultationType)[packageValue]?.price || 0;
}

function populatePackageOptions(consultationType, selectedValue = '', openPicker = false) {
  const packageSelect = document.getElementById('package');
  if (!packageSelect) return;

  const currentValue = selectedValue || packageSelect.value;
  const options = getPackageOptions(consultationType);
  packageSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = consultationType ? '-- Chọn gói tư vấn --' : '-- Chọn hình thức trước --';
  packageSelect.appendChild(placeholder);

  Object.entries(options).forEach(([value, option]) => {
    const item = document.createElement('option');
    item.value = value;
    item.textContent = option.label;
    packageSelect.appendChild(item);
  });

  packageSelect.value = options[currentValue] ? currentValue : '';
  packageSelect.disabled = !consultationType;

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
};

// ---- Modal open/close ----
function openModal(id) {
  document.getElementById('booking-overlay').classList.add('active');
  document.getElementById(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeAllModals() {
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

  document.getElementById('btn-go-payment').addEventListener('click', () => {
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
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getBookedSlots&_=${Date.now()}`, {
      mode: 'cors',
      cache: 'no-store',
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Không tải được lịch đã đặt');
    bookingState.bookedSlots = json.booked || [];
  } catch (e) {
    console.error('getBookedSlots error:', e);
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
  const pkg = bookingState.package;
  const price = getPackagePrice(pkg, bookingState.consultationType);
  const pkgLabel = getPackageLabel(pkg, bookingState.consultationType);
  const priceStr = price.toLocaleString('vi-VN') + 'đ';
  const transferContent = `DATLICHTV ${bookingState.phone}`;

  // Build VietQR URL  
  const qrUrl = `https://img.vietqr.io/image/${BANK_BIN}-${BANK_ACCOUNT}-compact2.jpg?amount=${price}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(BANK_NAME_DISPLAY)}`;

  document.getElementById('qr-img').src = qrUrl;
  document.getElementById('pay-amount').textContent = priceStr;
  document.getElementById('pay-content').textContent = transferContent;
  document.getElementById('pay-content').dataset.copy = transferContent;
  document.getElementById('pay-slot').textContent = bookingState.fullSlotLabel || '';
  document.getElementById('pay-package').textContent = pkgLabel;

  openModal('modal-payment');
}

// ============================================
// FINAL SUBMIT – save to Sheet + create Calendar event + send Email
// ============================================
async function finalizeBooking() {
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
    console.error(err);
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

// ============================================
// SUCCESS MODAL
// ============================================
function showSuccessModal() {
  document.getElementById('success-greeting').textContent =
    `Chào mừng ${bookingState.name}! Lịch tư vấn của bạn đã được xác nhận.`;

  const typeLabel = CONSULTATION_TYPE_LABELS[bookingState.consultationType] || bookingState.consultationType;
  const pkgLabel  = getPackageLabel(bookingState.package, bookingState.consultationType);

  document.getElementById('success-summary').innerHTML = `
    <div class="success-summary-row"><i class="fa-regular fa-clock"></i><span><strong>Thời gian:</strong> ${bookingState.fullSlotLabel}</span></div>
    <div class="success-summary-row"><i class="fa-solid fa-box-open"></i><span><strong>Gói:</strong> ${pkgLabel}</span></div>
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
