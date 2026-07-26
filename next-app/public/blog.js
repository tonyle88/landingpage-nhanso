const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3m9zkv9mX-BgMtB7DZj2rMrZtkAAOFDQow2UKxttXRz8G5Zlc4qponSGrvPBxJwEO/exec';
const RELATED_VIEWED_KEY = 'clowcat_blog_related_viewed';
const BLOG_API_TIMEOUT_MS = 12000;
const BLOG_API_RETRY_COUNT = 1;
const BLOG_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function formatBlogDateTime(value) {
  const text = String(value || '').trim();
  if (!text) return '—';

  // Giá trị từ ô datetime-local không có múi giờ. Đây là giờ Việt Nam đã nhập,
  // vì vậy giữ nguyên các thành phần thay vì để trình duyệt tự chuyển múi giờ.
  const localMatch = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?)?$/
  );
  if (localMatch) {
    const [, year, month, day, hour = '00', minute = '00'] = localMatch;
    return `${day}/${month}/${year}, ${hour}:${minute}`;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '—';

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('vi-VN', {
      timeZone: BLOG_TIME_ZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return `${parts.day}/${parts.month}/${parts.year}, ${parts.hour}:${parts.minute}`;
}

let blogCategories = [];
let blogArticles = [];
const initialBlogData = readInitialBlogData();
const initialBlogCategories = initialBlogData.categories;
const initialBlogArticles = initialBlogData.posts;
let activeArticleRequest = 0;
let blogSearchState = {
  query: '',
  categoryId: 'ALL',
};

function readInitialBlogData() {
  try {
    const element = document.getElementById('blog-initial-data');
    const data = JSON.parse(element?.textContent || '{}');
    return {
      categories: Array.isArray(data.categories) ? data.categories : [],
      posts: Array.isArray(data.posts) ? data.posts : [],
    };
  } catch {
    return { categories: [], posts: [] };
  }
}

function chooseBlogCategories(fallbackCategories) {
  return initialBlogCategories.length
    ? initialBlogCategories
    : Array.isArray(fallbackCategories)
      ? fallbackCategories
      : [];
}

function chooseBlogArticles(fallbackArticles) {
  return initialBlogArticles.length
    ? initialBlogArticles
    : Array.isArray(fallbackArticles)
      ? fallbackArticles
      : [];
}

async function initializeBlogPage() {
  setupNavbar();
  setupMusic();
  initParticles();
  setupBlogHistoryNavigation();
  setupScrollTopButton();
  
  const CACHE_KEY = 'blog_landing_cache_v2';
  const CACHE_TTL = 5 * 60 * 1000; // 5 phút
  let renderedFromCache = false;
  try { localStorage.removeItem('blog_landing_cache'); } catch(e) {}

  // Hiển thị dữ liệu từ cache ngay lập tức nếu có
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { ts, data } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) {
        blogCategories = chooseBlogCategories(data.blogCategories);
        blogArticles = chooseBlogArticles(data.blogArticles);
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('id');
        if (articleId) await renderArticleDetail(articleId);
        else renderBlogHome();
        renderedFromCache = true;
        document.body.classList.remove('landing-content-loading');
      }
    }
  } catch(e) {}

  if (!renderedFromCache && initialBlogArticles.length) {
    blogCategories = chooseBlogCategories([]);
    blogArticles = initialBlogArticles;
    const articleId = new URLSearchParams(window.location.search).get('id');
    if (articleId) await renderArticleDetail(articleId);
    else renderBlogHome();
    renderedFromCache = true;
    document.body.classList.remove('landing-content-loading');
  }

  // Luôn fetch mới ở nền để cập nhật cache
  try {
    let data = await fetchBlogJson(`${SCRIPT_URL}?action=getBlogContent`);
    if (!Array.isArray(data.blogArticles)) {
      data = await fetchBlogJson(`${SCRIPT_URL}?action=getLandingContent`);
    }
    if (
      !data.ok ||
      (!initialBlogArticles.length && !Array.isArray(data.blogArticles)) ||
      (!initialBlogCategories.length && !Array.isArray(data.blogCategories))
    ) {
      throw new Error(data.message || 'Dữ liệu blog không hợp lệ.');
    }

    const mergedData = {
      ...data,
      blogCategories: chooseBlogCategories(data.blogCategories),
      blogArticles: chooseBlogArticles(data.blogArticles),
    };
    // Lưu cache
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: mergedData })); } catch(e) {}

    blogCategories = mergedData.blogCategories;
    blogArticles = mergedData.blogArticles;
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');

    if (articleId) await renderArticleDetail(articleId);
    else renderBlogHome();

    document.body.classList.remove('landing-content-loading');
  } catch (error) {
    if (!renderedFromCache) renderBlogLoadError();
    else console.warn('Không cập nhật được dữ liệu blog, tiếp tục dùng cache:', error);
    document.body.classList.remove('landing-content-loading');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeBlogPage, { once: true });
} else {
  void initializeBlogPage();
}

async function fetchBlogJson(url) {
  let lastError;
  for (let attempt = 0; attempt <= BLOG_API_RETRY_COUNT; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), BLOG_API_TIMEOUT_MS);
    try {
      const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}try=${attempt + 1}`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < BLOG_API_RETRY_COUNT) await new Promise((resolve) => window.setTimeout(resolve, 450));
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
  throw lastError;
}

function renderBlogLoadError() {
  const container = document.getElementById('blog-container');
  if (!container) return;
  container.innerHTML = `
    <div class="blog-article-load-error" role="alert">
      <i class="fa-solid fa-wifi" aria-hidden="true"></i>
      <h2>Chưa tải được danh sách bài viết</h2>
      <button type="button" data-retry-blog-list>Thử lại</button>
    </div>
  `;
  container.querySelector('[data-retry-blog-list]')?.addEventListener('click', () => window.location.reload());
}

function setupNavbar() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('open');
    });
  }
  
  // Navbar scroll effect
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }
}

function setupScrollTopButton() {
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  if (!scrollTopBtn) return;

  const updateScrollTopVisibility = () => {
    const threshold = Math.min(700, document.body.scrollHeight * 0.35);
    scrollTopBtn.classList.toggle('show', window.scrollY > threshold);
  };

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  window.addEventListener('scroll', updateScrollTopVisibility, { passive: true });
  updateScrollTopVisibility();
}

// ============================================
// BACKGROUND MUSIC TOGGLE
// ============================================
function setupMusic() {
  const bgMusic = document.getElementById('bg-music');
  const musicToggleBtn = document.getElementById('musicToggleBtn');
  if (!bgMusic || !musicToggleBtn) return;

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
    interactionEvents.forEach(e => document.removeEventListener(e, handleFirstInteraction));
    isWaitingForInteraction = false;
  };
  const addAutoplayListeners = () => {
    if (isWaitingForInteraction) return;
    isWaitingForInteraction = true;
    interactionEvents.forEach(e => document.addEventListener(e, handleFirstInteraction, { passive: true }));
  };

  const tryPlayMusic = () => {
    if (!shouldPlayMusic) return Promise.resolve();
    return bgMusic.play()
      .then(() => { setMusicButtonState(true); removeAutoplayListeners(); })
      .catch(() => { setMusicButtonState(false); addAutoplayListeners(); });
  };

  function handleFirstInteraction(event) {
    if (musicToggleBtn.contains(event.target)) return;
    removeAutoplayListeners();
    tryPlayMusic();
  }

  bgMusic.volume = 0.35;
  setMusicButtonState(true);
  tryPlayMusic();

  bgMusic.addEventListener('play', () => { setMusicButtonState(true); removeAutoplayListeners(); });
  bgMusic.addEventListener('pause', () => { setMusicButtonState(false); });

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

// ============================================
// PARTICLES
// ============================================
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = window.innerWidth, H = window.innerHeight;
  canvas.width = W; canvas.height = H;

  // Giảm số hạt trên mobile để tăng hiệu suất
  const isMobile = W < 768;
  const particleCount = isMobile ? 30 : 55;

  const colors = [
    'rgba(217, 78, 31, alpha)',
    'rgba(212, 168, 67, alpha)',
    'rgba(232, 168, 120, alpha)',
    'rgba(27, 97, 107, alpha)',
  ];
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 2.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4 - 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.6 + 0.2,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  let lastFrame = 0;
  function animate(ts) {
    // Giới hạn 40fps thay vì 60fps để giảm CPU
    if (ts - lastFrame < 25) { requestAnimationFrame(animate); return; }
    lastFrame = ts;
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.dx; p.y += p.dy; p.pulse += 0.02;
      const alpha = p.alpha * (0.7 + 0.3 * Math.sin(p.pulse));
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace('alpha', alpha);
      ctx.fill();
    });
    // Bỏ vẽ đường kết nối trên mobile để nhẹ hơn
    if (!isMobile) {
      particles.forEach((p, i) => {
        particles.slice(i + 1, i + 4).forEach(q => {
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          if (dist < 100) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(212, 168, 67, ${(1 - dist / 100) * 0.08})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        });
      });
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
  window.addEventListener('resize', () => {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W; canvas.height = H;
  }, { passive: true });
}

function renderBlogHome() {
  activeArticleRequest += 1;
  const container = document.getElementById('blog-container');
  const enabledArticles = blogArticles.filter(a => a.enabled);
  const totalArticles = enabledArticles.length;
  const categoryOptions = blogCategories
    .filter(cat => enabledArticles.some(a => a.categoryId === cat.id))
    .map(cat => `<option value="${escapeAttribute(cat.id)}">${escapeHtml(cat.name)}</option>`)
    .join('');
  let html = `
    <section class="blog-search-panel" aria-label="Tìm kiếm bài viết giải mã nhân số học">
      <div class="blog-search-heading">
        <span>Tra cứu bài viết</span>
        <strong>Giải Mã Nhân Số Học</strong>
      </div>
      <div class="blog-search-controls">
        <label class="blog-search-input-wrap" for="blog-search-input">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input id="blog-search-input" type="search" placeholder="Tìm theo tên bài viết..." autocomplete="off" />
        </label>
        <label class="blog-category-select-wrap" for="blog-category-filter">
          <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
          <select id="blog-category-filter">
            <option value="ALL">Tất cả chủ đề</option>
            ${categoryOptions}
          </select>
        </label>
      </div>
      <div class="blog-search-meta">
        <span id="blog-search-count">Đang hiển thị ${totalArticles} bài viết</span>
        <button type="button" id="blog-search-clear" class="blog-search-clear" hidden>Xóa lọc</button>
      </div>
    </section>
    <div id="blog-results">
  `;
  
  blogCategories.forEach(cat => {
    const articles = blogArticles
      .filter(a => a.categoryId === cat.id && a.enabled)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.date) - new Date(a.date);
      });
      
    if (articles.length === 0) return;
    
    html += `
      <section class="blog-category-section" data-blog-category="${escapeAttribute(cat.id)}" style="margin-bottom: 100px;">
        <!-- Category Banner -->
        <div style="text-align: center; margin: 0 0 56px; position: relative;">
          <div style="position: relative; display: inline-block;">
            <!-- Ribbon top decoration -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 12px;">
              <div style="height: 1px; width: 60px; background: linear-gradient(to right, transparent, var(--primary));"></div>
              <span style="color: var(--primary); font-size: 0.75rem; letter-spacing: 4px; font-weight: 700; text-transform: uppercase; font-family: 'Inter', sans-serif;">✦ GIẢI MÃ NHÂN SỐ HỌC ✦</span>
              <div style="height: 1px; width: 60px; background: linear-gradient(to left, transparent, var(--primary));"></div>
            </div>
            <!-- Main ribbon banner -->
            <div style="position: relative; background: linear-gradient(135deg, #1a1006 0%, #2e1f07 40%, #3b2608 60%, #1a1006 100%); border: 1px solid rgba(212,168,67,0.6); border-radius: 4px; padding: 14px 48px; box-shadow: 0 0 30px rgba(212,168,67,0.2), inset 0 0 40px rgba(0,0,0,0.5);">
              <!-- Left ribbon fold -->
              <div style="position: absolute; left: -16px; top: 50%; transform: translateY(-50%); width: 0; height: 0; border-style: solid; border-width: 22px 16px 22px 0; border-color: transparent #0f0b03 transparent transparent; filter: drop-shadow(2px 0 3px rgba(0,0,0,0.5));"></div>
              <div style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 4px; height: 44px; background: linear-gradient(to bottom, #8a6520, #d4a843, #8a6520);"></div>
              <!-- Right ribbon fold -->
              <div style="position: absolute; right: -16px; top: 50%; transform: translateY(-50%); width: 0; height: 0; border-style: solid; border-width: 22px 0 22px 16px; border-color: transparent transparent transparent #0f0b03; filter: drop-shadow(-2px 0 3px rgba(0,0,0,0.5));"></div>
              <div style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 4px; height: 44px; background: linear-gradient(to bottom, #8a6520, #d4a843, #8a6520);"></div>
              <!-- Title text -->
              <h2 style="margin: 0; font-family: 'Playfair Display', serif; font-size: clamp(1.1rem, 5vw, 2.4rem); font-weight: 800; background: linear-gradient(180deg, #f5d98a 0%, #d4a843 50%, #a07830 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 1px; text-shadow: none; white-space: normal; word-break: break-word; text-align: center; line-height: 1.3;">${cat.name}</h2>
            </div>
            <!-- Stars decoration -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-top: 16px;">
              <span style="color: rgba(212,168,67,0.4); font-size: 0.6rem;">✦</span>
              <span style="color: rgba(212,168,67,0.7); font-size: 0.9rem;">✦</span>
              <span style="color: rgba(212,168,67,0.4); font-size: 0.6rem;">✦</span>
            </div>
          </div>
        </div>
        <!-- Cards Carousel -->
        <div class="blog-carousel-track" data-carousel-track="${escapeAttribute(cat.id)}">
    `;
    
    articles.forEach(a => {
      const searchText = normalizeSearchText([
        a.title,
      ].join(' '));
      html += `
        <a href="?id=${a.id}" class="blog-card-link" data-blog-category="${escapeAttribute(cat.id)}" data-blog-search="${escapeAttribute(searchText)}" style="display: flex; flex-direction: column; background: linear-gradient(160deg, rgba(26,16,6,0.95) 0%, rgba(20,13,5,0.98) 100%); border: 1px solid rgba(212,168,67,0.25); border-radius: 16px; overflow: hidden; text-decoration: none; color: inherit; position: relative; transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease, border-color 0.3s ease;"
          onmouseover="this.style.transform='translateY(-8px)'; this.style.boxShadow='0 20px 60px rgba(212,168,67,0.25), 0 0 20px rgba(212,168,67,0.1)'; this.style.borderColor='rgba(212,168,67,0.7)';"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.borderColor='rgba(212,168,67,0.25)';">
          <!-- Corner accents -->
          <div style="position: absolute; top: 0; left: 0; width: 20px; height: 20px; border-top: 2px solid var(--primary); border-left: 2px solid var(--primary); border-radius: 16px 0 0 0; z-index: 2;"></div>
          <div style="position: absolute; top: 0; right: 0; width: 20px; height: 20px; border-top: 2px solid var(--primary); border-right: 2px solid var(--primary); border-radius: 0 16px 0 0; z-index: 2;"></div>
          <!-- Thumbnail -->
          <div style="width: 100%; height: 210px; overflow: hidden; position: relative;">
            ${a.thumbnail
              ? `<img src="${a.thumbnail}" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:cover; transition: transform 0.5s ease;" onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'">`
              : `<div style="width:100%; height:100%; background: linear-gradient(135deg, #1a1006, #2e1f07); display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-star" style="font-size:3rem; color: rgba(212,168,67,0.3);"></i></div>`
            }
            <!-- Dark gradient overlay at bottom -->
            <div style="position:absolute; bottom:0; left:0; right:0; height:60px; background: linear-gradient(to top, rgba(20,13,5,0.9), transparent);"></div>
            ${a.pinned ? `<div style="position:absolute; top:12px; right:12px; background: linear-gradient(135deg, #d4a843, #a07830); color:#000; padding:4px 10px; border-radius:20px; font-size:0.78rem; font-weight:800; display:flex; align-items:center; gap:5px; box-shadow: 0 0 12px rgba(212,168,67,0.5);"><i class="fa-solid fa-thumbtack"></i> Đã ghim</div>` : ''}
          </div>
          <!-- Content -->
          <div style="padding: 22px 20px 20px; flex: 1; display: flex; flex-direction: column;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
              <span style="width:4px; height:4px; border-radius:50%; background: var(--primary); display:inline-block;"></span>
              <span style="font-size: 0.8rem; color: rgba(212,168,67,0.7); letter-spacing:1px;"><i class="fa-regular fa-clock"></i> ${formatBlogDateTime(a.date)}</span>
            </div>
            <h3 style="font-family:'Playfair Display',serif; font-size:1.2rem; margin-bottom:12px; line-height:1.55; text-align:justify; color: #f0e0c0; font-weight:700;">${escapeHtml(a.title)}</h3>
            <div style="color: rgba(235,215,185,0.9); font-size:0.9rem; line-height:1.65; flex:1; overflow:hidden; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical;">${escapeHtml((a.summary || '').replace(/<[^>]*>/g, ''))}</div>
            <!-- Read More Button -->
            <div style="margin-top:20px; display:flex; align-items:center; justify-content:center;">
              <span style="display:inline-flex; align-items:center; gap:8px; background: linear-gradient(135deg, rgba(212,168,67,0.15), rgba(212,168,67,0.05)); border: 1px solid rgba(212,168,67,0.5); border-radius:24px; padding:8px 22px; font-size:0.88rem; font-weight:700; color: var(--primary); letter-spacing:0.5px; transition: all 0.3s; box-shadow: 0 0 12px rgba(212,168,67,0.1);">
                Khám phá ngay <i class="fa-solid fa-arrow-right fa-xs"></i>
              </span>
            </div>
          </div>
        </a>
      `;
    });
    
    html += `
        </div>
        ${articles.length > 3 ? `
          <div class="blog-carousel-controls" data-carousel-controls="${escapeAttribute(cat.id)}">
            <button type="button" class="blog-carousel-btn" data-carousel-prev="${escapeAttribute(cat.id)}" aria-label="Xem bài viết trước">
              <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
            </button>
            <span class="blog-carousel-hint">Trượt để xem thêm bài viết</span>
            <button type="button" class="blog-carousel-btn" data-carousel-next="${escapeAttribute(cat.id)}" aria-label="Xem bài viết tiếp theo">
              <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </button>
          </div>
        ` : ''}
      </section>
    `;
  });
  
  html += `
    </div>
    <div id="blog-search-empty" class="blog-search-empty" hidden>
      <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
      <h2>Không tìm thấy bài viết phù hợp</h2>
      <p>Thử đổi từ khóa hoặc chọn lại chủ đề khác nhé.</p>
    </div>
  `;

  if (totalArticles === 0) {
    html = '<div style="text-align: center; padding: 60px; color: var(--text-muted);">Chưa có bài viết nào.</div>';
  }
  
  container.innerHTML = html;
  setupBlogSearch();
  setupBlogCarousels();
}

function setupBlogSearch() {
  const input = document.getElementById('blog-search-input');
  const select = document.getElementById('blog-category-filter');
  const clearBtn = document.getElementById('blog-search-clear');
  if (!input || !select) return;

  input.value = blogSearchState.query;
  select.value = blogSearchState.categoryId;

  input.addEventListener('input', () => {
    blogSearchState.query = input.value;
    applyBlogFilters();
  });

  select.addEventListener('change', () => {
    blogSearchState.categoryId = select.value;
    applyBlogFilters();
  });

  clearBtn?.addEventListener('click', () => {
    blogSearchState = { query: '', categoryId: 'ALL' };
    input.value = '';
    select.value = 'ALL';
    applyBlogFilters();
    input.focus();
  });

  applyBlogFilters();
}

function applyBlogFilters() {
  const query = normalizeSearchText(blogSearchState.query);
  const selectedCategory = blogSearchState.categoryId;
  const sections = document.querySelectorAll('.blog-category-section');
  const cards = document.querySelectorAll('.blog-card-link[data-blog-search]');
  const countEl = document.getElementById('blog-search-count');
  const clearBtn = document.getElementById('blog-search-clear');
  const emptyEl = document.getElementById('blog-search-empty');
  let visibleCount = 0;

  cards.forEach(card => {
    const matchesQuery = !query || card.dataset.blogSearch.includes(query);
    const matchesCategory = selectedCategory === 'ALL' || card.dataset.blogCategory === selectedCategory;
    const isVisible = matchesQuery && matchesCategory;
    card.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  sections.forEach(section => {
    const hasVisibleCards = !!section.querySelector('.blog-card-link:not([hidden])');
    section.hidden = !hasVisibleCards;
  });

  document.querySelectorAll('.blog-carousel-track').forEach(track => {
    track.scrollLeft = 0;
  });

  if (countEl) {
    countEl.textContent = visibleCount > 0
      ? `Đang hiển thị ${visibleCount} bài viết`
      : 'Chưa có bài viết phù hợp';
  }

  if (clearBtn) {
    clearBtn.hidden = !query && selectedCategory === 'ALL';
  }

  if (emptyEl) {
    emptyEl.hidden = visibleCount > 0;
  }

  updateBlogCarouselControls();
}

function setupBlogCarousels() {
  document.querySelectorAll('.blog-carousel-controls').forEach(control => {
    const categoryId = control.dataset.carouselControls;
    const track = document.querySelector(`[data-carousel-track="${cssEscape(categoryId)}"]`);
    const prevBtn = control.querySelector('[data-carousel-prev]');
    const nextBtn = control.querySelector('[data-carousel-next]');
    if (!track || !prevBtn || !nextBtn) return;

    const scrollByPage = (direction) => {
      const visibleCards = getVisibleCarouselCards(track);
      const firstCard = visibleCards[0];
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '28') || 28;
      const cardWidth = firstCard ? firstCard.getBoundingClientRect().width + gap : track.clientWidth;
      const cardsPerPage = window.innerWidth <= 700 ? 1 : 3;
      track.scrollBy({ left: direction * cardWidth * cardsPerPage, behavior: 'smooth' });
    };

    prevBtn.addEventListener('click', () => scrollByPage(-1));
    nextBtn.addEventListener('click', () => scrollByPage(1));
    track.addEventListener('scroll', () => updateBlogCarouselControls(), { passive: true });
  });

  window.addEventListener('resize', updateBlogCarouselControls, { passive: true });
  updateBlogCarouselControls();
}

function updateBlogCarouselControls() {
  document.querySelectorAll('.blog-carousel-controls').forEach(control => {
    const categoryId = control.dataset.carouselControls;
    const track = document.querySelector(`[data-carousel-track="${cssEscape(categoryId)}"]`);
    const prevBtn = control.querySelector('[data-carousel-prev]');
    const nextBtn = control.querySelector('[data-carousel-next]');
    if (!track || !prevBtn || !nextBtn) return;

    const visibleCards = getVisibleCarouselCards(track);
    const shouldShowControls = visibleCards.length > (window.innerWidth <= 700 ? 1 : 3);
    control.hidden = !shouldShowControls;
    if (!shouldShowControls) return;

    const maxScrollLeft = track.scrollWidth - track.clientWidth - 2;
    prevBtn.disabled = track.scrollLeft <= 2;
    nextBtn.disabled = track.scrollLeft >= maxScrollLeft;
  });
}

function getVisibleCarouselCards(track) {
  return [...track.querySelectorAll('.blog-card-link[data-blog-search]')].filter(card => !card.hidden);
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(value);
  }
  return String(value || '').replace(/"/g, '\\"');
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeBlogHtml(value) {
  return window.ClowSanitizeHtml(value);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

async function renderArticleDetail(id) {
  const container = document.getElementById('blog-container');
  const requestId = ++activeArticleRequest;
  let article = blogArticles.find(a => a.id === id && a.enabled);
  
  if (!article) {
    container.innerHTML = `
      <div style="text-align: center; padding: 80px 20px;">
        <i class="fa-solid fa-ghost" style="font-size:4rem; color: rgba(212,168,67,0.3); margin-bottom:24px; display:block;"></i>
        <h2 style="color: var(--text-muted); margin-bottom:32px;">Bài viết không tồn tại hoặc đã bị ẩn.</h2>
        <a href="/blog" style="display:inline-flex; align-items:center; gap:10px; background: linear-gradient(135deg, #d4a843, #a07830); color:#000; font-weight:800; padding:12px 28px; border-radius:32px; text-decoration:none; font-size:1rem; box-shadow:0 0 20px rgba(212,168,67,0.4); transition: all 0.3s;">
          <i class="fa-solid fa-arrow-left"></i> Quay lại trang Blog
        </a>
      </div>
    `;
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(article, 'contentHtml')) {
    container.innerHTML = '<div class="blog-article-loading" role="status"><i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i><span>Đang tải bài viết...</span></div>';
    try {
      article = await loadBlogArticleDetail(id);
      if (requestId !== activeArticleRequest) return;
    } catch (error) {
      if (requestId !== activeArticleRequest) return;
      container.innerHTML = `
        <div class="blog-article-load-error" role="alert">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
          <h2>Chưa tải được bài viết</h2>
          <button type="button" data-retry-blog-article="${escapeAttribute(id)}">Thử lại</button>
        </div>
      `;
      const retryButton = container.querySelector('[data-retry-blog-article]');
      retryButton?.addEventListener('click', () => renderArticleDetail(id));
      return;
    }
  }
  
  const cat = blogCategories.find(c => c.id === article.categoryId);
  const catName = cat ? cat.name : 'Khác';
  markRelatedArticleViewed(article);
  const related = getFreshRelatedArticles(article, 5);
  
  let html = `
    <div style="max-width: 820px; margin: 0 auto;">
      
      <!-- Back Button Row -->
      <div style="display:flex; flex-direction:column; gap:14px; margin-bottom:36px;">
        <a href="/blog" style="display:inline-flex; align-items:center; gap:10px; background: rgba(212,168,67,0.08); border: 1px solid rgba(212,168,67,0.4); color: var(--primary); font-weight:700; padding:10px 22px; border-radius:32px; text-decoration:none; font-size:0.9rem; letter-spacing:0.5px; transition: all 0.3s; box-shadow:0 0 12px rgba(212,168,67,0.1); align-self:flex-start;" onmouseover="this.style.background='rgba(212,168,67,0.18)'; this.style.boxShadow='0 0 20px rgba(212,168,67,0.3)';" onmouseout="this.style.background='rgba(212,168,67,0.08)'; this.style.boxShadow='0 0 12px rgba(212,168,67,0.1)';">
          <i class="fa-solid fa-arrow-left"></i> Quay lại Danh Sách
        </a>
        <div style="display:flex; align-items:center; flex-wrap:wrap; gap:10px;">
          <span style="background: linear-gradient(135deg, rgba(212,168,67,0.2), rgba(212,168,67,0.05)); border: 1px solid rgba(212,168,67,0.4); color: var(--primary); padding:6px 16px; border-radius:20px; font-size:0.8rem; font-weight:700; letter-spacing:1px; white-space:nowrap;">${catName}</span>
          <span style="font-size:0.82rem; color:rgba(212,168,67,0.6); white-space:nowrap;"><i class="fa-regular fa-clock"></i> ${formatBlogDateTime(article.date)}</span>
        </div>
      </div>

      <!-- Hero image -->
      ${article.thumbnail ? `
        <div style="width:100%; border-radius:20px; overflow:hidden; margin-bottom:40px; box-shadow: 0 12px 48px rgba(0,0,0,0.6), 0 0 30px rgba(212,168,67,0.15); position:relative;">
          <img src="${article.thumbnail}" loading="eager" decoding="async" fetchpriority="high" style="width:100%; max-height:480px; object-fit:cover; display:block;">
          <div style="position:absolute; bottom:0; left:0; right:0; height:120px; background:linear-gradient(to top, rgba(10,7,3,0.9), transparent);"></div>
        </div>` : ''}
      
      <!-- Title Banner (same ribbon style as category) -->
      <div style="text-align:center; margin-bottom:48px;">
        <div style="height:1px; background:linear-gradient(to right, transparent, rgba(212,168,67,0.5), transparent); margin-bottom:28px;"></div>
        <h1 style="font-family:'Playfair Display',serif; font-size:clamp(1.8rem,5vw,3rem); line-height:1.35; font-weight:900; background:linear-gradient(180deg, #f5d98a 0%, #d4a843 50%, #c09030 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:20px;">${escapeHtml(article.title)}</h1>
        <div style="display:flex; justify-content:center; gap:16px;">
          <span style="color:rgba(212,168,67,0.4); font-size:0.6rem;">✦</span>
          <span style="color:rgba(212,168,67,0.8); font-size:0.9rem;">✦</span>
          <span style="color:rgba(212,168,67,0.4); font-size:0.6rem;">✦</span>
        </div>
        <div style="height:1px; background:linear-gradient(to right, transparent, rgba(212,168,67,0.5), transparent); margin-top:28px;"></div>
      </div>

      <!-- Article Content -->
      <div class="article-content" style="background: linear-gradient(160deg, rgba(26,16,6,0.6) 0%, rgba(15,10,3,0.7) 100%); border: 1px solid rgba(212,168,67,0.2); border-radius:20px; padding:40px 48px; font-size:1.1rem; line-height:1.9; color:#f0e8d8; box-shadow:0 0 40px rgba(0,0,0,0.4), inset 0 0 60px rgba(212,168,67,0.03); position:relative;">
        <div style="position:absolute; top:0; left:0; width:24px; height:24px; border-top:2px solid rgba(212,168,67,0.5); border-left:2px solid rgba(212,168,67,0.5); border-radius:20px 0 0 0;"></div>
        <div style="position:absolute; top:0; right:0; width:24px; height:24px; border-top:2px solid rgba(212,168,67,0.5); border-right:2px solid rgba(212,168,67,0.5); border-radius:0 20px 0 0;"></div>
        <div style="position:absolute; bottom:0; left:0; width:24px; height:24px; border-bottom:2px solid rgba(212,168,67,0.5); border-left:2px solid rgba(212,168,67,0.5); border-radius:0 0 0 20px;"></div>
        <div style="position:absolute; bottom:0; right:0; width:24px; height:24px; border-bottom:2px solid rgba(212,168,67,0.5); border-right:2px solid rgba(212,168,67,0.5); border-radius:0 0 20px 0;"></div>
        ${sanitizeBlogHtml(article.contentHtml)}
      </div>

      <!-- Bottom action -->
      <div style="text-align:center; margin:48px 0;">
        <a href="/blog" style="display:inline-flex; align-items:center; gap:12px; background:linear-gradient(135deg, #d4a843, #a07830); color:#1a1006; font-weight:900; padding:14px 36px; border-radius:36px; text-decoration:none; font-size:1rem; letter-spacing:0.5px; box-shadow:0 0 30px rgba(212,168,67,0.4), 0 8px 24px rgba(0,0,0,0.4); transition:all 0.3s;" onmouseover="this.style.boxShadow='0 0 50px rgba(212,168,67,0.6), 0 12px 32px rgba(0,0,0,0.5)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.boxShadow='0 0 30px rgba(212,168,67,0.4), 0 8px 24px rgba(0,0,0,0.4)'; this.style.transform='none';">
          <i class="fa-solid fa-arrow-left"></i> Quay lại Danh Sách Bài Viết
        </a>
      </div>
      
      <!-- Related Articles -->
      <div style="margin-top:20px; padding-top:40px; border-top:1px solid rgba(212,168,67,0.2);">
        <div style="text-align:center; margin-bottom:32px;">
          <span style="font-size:0.75rem; letter-spacing:4px; color:rgba(212,168,67,0.6); text-transform:uppercase; font-weight:700;">✦ BÀI VIẾT LIÊN QUAN ✦</span>
          <h3 style="font-family:'Playfair Display',serif; font-size:1.8rem; margin:8px 0 0; background:linear-gradient(180deg,#f5d98a,#d4a843); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;">Khám Phá Thêm</h3>
        </div>
        <div style="display:flex; flex-direction:column; gap:14px;">
  `;
  
  if (related.length === 0) {
    html += '<div style="text-align:center; padding:32px; color:rgba(212,168,67,0.5);"><i class="fa-solid fa-scroll" style="font-size:2rem; margin-bottom:12px; display:block;"></i>Chưa có bài viết liên quan.</div>';
  } else {
    related.forEach(r => {
      html += `
        <a href="?id=${r.id}" data-related-article-id="${escapeAttribute(r.id)}" style="display:flex; gap:16px; padding:16px; background:linear-gradient(135deg, rgba(26,16,6,0.8), rgba(15,10,3,0.9)); border:1px solid rgba(212,168,67,0.2); border-radius:12px; text-decoration:none; color:inherit; transition:all 0.3s;" onmouseover="this.style.borderColor='rgba(212,168,67,0.6)'; this.style.boxShadow='0 0 20px rgba(212,168,67,0.15)'; this.style.transform='translateX(6px)';" onmouseout="this.style.borderColor='rgba(212,168,67,0.2)'; this.style.boxShadow='none'; this.style.transform='none';">
          ${r.thumbnail ? `<div style="width:110px; height:75px; flex-shrink:0; border-radius:8px; overflow:hidden; border:1px solid rgba(212,168,67,0.3);"><img src="${r.thumbnail}" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:cover;"></div>` : `<div style="width:110px; height:75px; flex-shrink:0; border-radius:8px; background:linear-gradient(135deg,#1a1006,#2e1f07); display:flex; align-items:center; justify-content:center; border:1px solid rgba(212,168,67,0.2);"><i class="fa-solid fa-star" style="color:rgba(212,168,67,0.3);"></i></div>`}
          <div style="display:flex; flex-direction:column; justify-content:center; flex:1;">
            <h4 style="font-family:'Playfair Display',serif; font-size:1rem; margin-bottom:6px; line-height:1.4; color:#f0e0c0;">${r.title}</h4>
            <div style="font-size:0.8rem; color:rgba(212,168,67,0.6);"><i class="fa-regular fa-clock"></i> ${formatBlogDateTime(r.date)}</div>
          </div>
          <div style="display:flex; align-items:center; color:rgba(212,168,67,0.5); font-size:0.9rem;"><i class="fa-solid fa-chevron-right"></i></div>
        </a>
      `;
    });
  }
  
  html += `
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  setupRelatedArticleLinks(container);
}

async function loadBlogArticleDetail(id) {
  const data = await fetchBlogJson(`${SCRIPT_URL}?action=getBlogArticle&id=${encodeURIComponent(id)}`);
  if (!data.ok || !data.article) throw new Error(data.message || 'Không tải được bài viết.');

  const index = blogArticles.findIndex((article) => article.id === id);
  if (index === -1) throw new Error('Bài viết không còn trong danh sách.');
  blogArticles[index] = { ...blogArticles[index], ...data.article };
  return blogArticles[index];
}

function setupBlogHistoryNavigation() {
  window.addEventListener('popstate', () => {
    const articleId = new URLSearchParams(window.location.search).get('id');
    if (articleId) renderArticleDetail(articleId);
    else renderBlogHome();
    window.scrollTo({ top: 0, behavior: 'auto' });
  });
}

function setupRelatedArticleLinks(container) {
  container.querySelectorAll('[data-related-article-id]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const articleId = link.dataset.relatedArticleId;
      if (!articleId || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      window.history.pushState({}, '', `?id=${encodeURIComponent(articleId)}`);
      renderArticleDetail(articleId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function getFreshRelatedArticles(article, limit) {
  const candidates = blogArticles
    .filter(a => a.categoryId === article.categoryId && a.enabled && a.id !== article.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const viewedIds = getViewedRelatedIds(article.categoryId);
  const unviewed = candidates.filter(a => !viewedIds.includes(a.id));

  if (unviewed.length > 0) return unviewed.slice(0, limit);
  if (candidates.length > 0) {
    resetViewedRelatedIds(article.categoryId, article.id);
    return candidates.slice(0, limit);
  }
  return [];
}

function markRelatedArticleViewed(article) {
  if (!article || !article.categoryId || !article.id) return;
  const history = readRelatedViewedHistory();
  const current = Array.isArray(history[article.categoryId]) ? history[article.categoryId] : [];
  history[article.categoryId] = [article.id, ...current.filter(id => id !== article.id)].slice(0, 80);
  writeRelatedViewedHistory(history);
}

function getViewedRelatedIds(categoryId) {
  const history = readRelatedViewedHistory();
  return Array.isArray(history[categoryId]) ? history[categoryId] : [];
}

function resetViewedRelatedIds(categoryId, currentArticleId) {
  const history = readRelatedViewedHistory();
  history[categoryId] = currentArticleId ? [currentArticleId] : [];
  writeRelatedViewedHistory(history);
}

function readRelatedViewedHistory() {
  try {
    return JSON.parse(localStorage.getItem(RELATED_VIEWED_KEY) || '{}') || {};
  } catch (error) {
    return {};
  }
}

function writeRelatedViewedHistory(history) {
  try {
    localStorage.setItem(RELATED_VIEWED_KEY, JSON.stringify(history || {}));
  } catch (error) {
    // History only improves recommendation rotation; failure should not block reading.
  }
}
