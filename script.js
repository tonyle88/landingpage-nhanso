/* =============================================
   JAVASCRIPT FOR NHÂN SỐ HỌC LANDING PAGE
   ============================================= */

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxOlNPUunzX4gJvtpKvvXYdBQRMXEKyEqB4L_39CLu-qt4trPzgDoLXRRmauCk2iA2P/exec';
const PACKAGE_LABELS = {
  year: 'Dự Đoán Năm Cá Nhân – 500.000đ/buổi',
  big3: 'Phân Tích 3 Chỉ Số Tính Cách – 1.000.000đ/buổi',
  big7: 'Phân Tích Toàn Diện – 2.000.000đ/buổi',
};
const CONSULTATION_TYPE_LABELS = {
  online: 'Online - Google Meet',
  offline: 'Offline - Trực tiếp tại TP.HCM',
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
  document.querySelectorAll('a[href="#contact"][id^="pkg-"]').forEach(link => {
    link.addEventListener('click', () => {
      const packageSelect = document.getElementById('package');
      const packageValue = link.id.replace('pkg-', '');
      if (packageSelect && PACKAGE_LABELS[packageValue]) {
        packageSelect.value = packageValue;
      }
    });
  });

  // ===== FORM SUBMIT =====
  const form = document.getElementById('booking-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;

    if (!isConfiguredGoogleScriptUrl()) {
      showToast('Vui lòng cấu hình Google Apps Script Web App URL trước khi gửi form.');
      return;
    }

    btn.innerHTML = '<span>Đang gửi...</span>';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
      await submitBookingForm(form);
      btn.innerHTML = '<span>✓ Đã gửi thành công!</span>';
      btn.style.background = 'linear-gradient(135deg, #2a8a5a, #1f6a45)';
      showToast('🎉 Cảm ơn bạn! Chúng tôi sẽ liên hệ trong vòng 2 giờ.');
      form.reset();
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.background = '';
      }, 3000);
    } catch (error) {
      console.error('Booking form submission failed:', error);
      showToast('Có lỗi khi gửi form. Vui lòng thử lại hoặc nhắn trực tiếp qua Facebook/Zalo.');
      btn.innerHTML = originalHTML;
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.background = '';
    }
  });

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

async function submitBookingForm(form) {
  const formData = new FormData(form);
  
  // Prevent Google Sheets from dropping the leading zero in phone numbers
  const phone = formData.get('phone');
  if (phone) {
    formData.set('phone', "'" + phone);
  }

  const packageValue = formData.get('package');
  const consultationTypeValue = formData.get('consultationType');
  formData.append('packageLabel', PACKAGE_LABELS[packageValue] || packageValue || '');
  formData.append('consultationTypeLabel', CONSULTATION_TYPE_LABELS[consultationTypeValue] || consultationTypeValue || '');
  formData.append('submittedAt', new Date().toISOString());
  formData.append('pageUrl', window.location.href);
  formData.append('userAgent', navigator.userAgent);

  await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: formData,
  });
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

