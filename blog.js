const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3m9zkv9mX-BgMtB7DZj2rMrZtkAAOFDQow2UKxttXRz8G5Zlc4qponSGrvPBxJwEO/exec';

let blogCategories = [];
let blogArticles = [];

document.addEventListener('DOMContentLoaded', async () => {
  setupNavbar();
  setupMusic();
  initParticles();
  
  try {
    const res = await fetch(`${SCRIPT_URL}?action=getLandingContent`);
    const data = await res.json();
    if (data.ok) {
      blogCategories = data.blogCategories || [];
      blogArticles = data.blogArticles || [];
      
      const urlParams = new URLSearchParams(window.location.search);
      const articleId = urlParams.get('id');
      
      if (articleId) {
        renderArticleDetail(articleId);
      } else {
        renderBlogHome();
      }
      
      document.body.classList.remove('landing-content-loading');
    }
  } catch (error) {
    document.getElementById('blog-container').innerHTML = '<p>Lỗi tải dữ liệu.</p>';
    document.body.classList.remove('landing-content-loading');
  }
});

function setupNavbar() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('active');
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

  const colors = [
    'rgba(217, 78, 31, alpha)',
    'rgba(212, 168, 67, alpha)',
    'rgba(232, 168, 120, alpha)',
    'rgba(27, 97, 107, alpha)',
  ];
  const particles = [];
  for (let i = 0; i < 70; i++) {
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
  function animate() {
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
    particles.forEach((p, i) => {
      particles.slice(i + 1, i + 5).forEach(q => {
        const dist = Math.hypot(p.x - q.x, p.y - q.y);
        if (dist < 120) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(212, 168, 67, ${(1 - dist / 120) * 0.08})`;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      });
    });
    requestAnimationFrame(animate);
  }
  animate();
  window.addEventListener('resize', () => {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W; canvas.height = H;
  }, { passive: true });
}

function renderBlogHome() {
  const container = document.getElementById('blog-container');
  let html = `
    <div style="text-align: center; margin: 40px 0;">
      <h1 class="section-title" style="font-size: 2.5rem;">CÁC CHỦ ĐỀ</h1>
    </div>
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
      <section style="margin-bottom: 80px;">
        <div class="section-header">
          <span class="section-tag">Giải Mã Nhân Số Học</span>
          <h2 class="section-title">${cat.name}</h2>
          <div class="section-divider">
            <span>✦</span><span>✦</span><span>✦</span>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
    `;
    
    articles.forEach(a => {
      html += `
        <a href="?id=${a.id}" style="display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; text-decoration: none; transition: transform 0.3s, border-color 0.3s; color: inherit;" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="width: 100%; height: 200px; background: var(--surface-hover); position: relative;">
            ${a.thumbnail ? `<img src="${a.thumbnail}" style="width: 100%; height: 100%; object-fit: cover;">` : `<div style="width: 100%; height: 100%; display:flex; align-items:center; justify-content:center; color: var(--text-muted);"><i class="fa-solid fa-image fa-3x"></i></div>`}
            ${a.pinned ? `<div style="position: absolute; top: 12px; right: 12px; background: var(--primary); color: #000; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;"><i class="fa-solid fa-thumbtack"></i> Đã ghim</div>` : ''}
          </div>
          <div style="padding: 20px; flex: 1; display: flex; flex-direction: column;">
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">
              <i class="fa-regular fa-calendar"></i> ${a.date.replace('T', ' ')}
            </div>
            <h3 style="font-size: 1.25rem; margin-bottom: 12px; line-height: 1.4; text-align: justify;">${a.title}</h3>
            <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin-bottom: 16px; flex: 1;">${a.summary || ''}</p>
            <div style="color: var(--primary); font-weight: 500; font-size: 0.9rem; margin-top: auto;">Đọc tiếp <i class="fa-solid fa-arrow-right"></i></div>
          </div>
        </a>
      `;
    });
    
    html += `
        </div>
      </section>
    `;
  });
  
  if (html.indexOf('<section') === -1) {
    html += '<div style="text-align: center; padding: 60px; color: var(--text-muted);">Chưa có bài viết nào.</div>';
  }
  
  container.innerHTML = html;
}

function renderArticleDetail(id) {
  const container = document.getElementById('blog-container');
  const article = blogArticles.find(a => a.id === id && a.enabled);
  
  if (!article) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px;">
        <h2>Bài viết không tồn tại hoặc đã bị ẩn.</h2>
        <a href="blog.html" class="primary-button" style="display: inline-flex; margin-top: 24px;">Quay lại danh sách</a>
      </div>
    `;
    return;
  }
  
  const cat = blogCategories.find(c => c.id === article.categoryId);
  const catName = cat ? cat.name : 'Khác';
  
  const related = blogArticles
    .filter(a => a.categoryId === article.categoryId && a.enabled && a.id !== article.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  
  let html = `
    <div style="max-width: 800px; margin: 0 auto;">
      <div style="margin-bottom: 32px;">
        <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 16px; font-size: 0.9rem;">
          <a href="blog.html" style="color: var(--text-muted); text-decoration: none;"><i class="fa-solid fa-arrow-left"></i> Quay lại</a>
          <span style="color: var(--border);">|</span>
          <span class="pill">${catName}</span>
          <span style="color: var(--border);">|</span>
          <span style="color: var(--text-muted);"><i class="fa-regular fa-calendar"></i> ${article.date.replace('T', ' ')}</span>
        </div>
        <h1 style="font-size: 2.5rem; line-height: 1.3; margin-bottom: 24px;">${article.title}</h1>
        ${article.thumbnail ? `<div style="width: 100%; border-radius: 12px; overflow: hidden; margin-bottom: 32px;"><img src="${article.thumbnail}" style="width: 100%; display: block;"></div>` : ''}
      </div>
      
      <div class="article-content" style="font-size: 1.1rem; line-height: 1.8; color: var(--text-secondary);">
        ${article.contentHtml}
      </div>
      
      <div style="margin-top: 60px; padding-top: 40px; border-top: 1px solid var(--border);">
        <h3 style="font-size: 1.5rem; margin-bottom: 24px;">Bài Viết Liên Quan</h3>
        <div style="display: flex; flex-direction: column; gap: 16px;">
  `;
  
  if (related.length === 0) {
    html += '<div style="color: var(--text-muted);">Chưa có bài viết liên quan.</div>';
  } else {
    related.forEach(r => {
      html += `
        <a href="?id=${r.id}" style="display: flex; gap: 16px; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; text-decoration: none; color: inherit; transition: background 0.2s;" onmouseover="this.style.background='var(--surface-hover)'" onmouseout="this.style.background='var(--surface)'">
          ${r.thumbnail ? `<div style="width: 120px; height: 80px; flex-shrink: 0; border-radius: 4px; overflow: hidden;"><img src="${r.thumbnail}" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}
          <div style="display: flex; flex-direction: column; justify-content: center;">
            <h4 style="font-size: 1.1rem; margin-bottom: 8px; line-height: 1.4;">${r.title}</h4>
            <div style="font-size: 0.85rem; color: var(--text-muted);"><i class="fa-regular fa-calendar"></i> ${r.date.replace('T', ' ')}</div>
          </div>
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
}
