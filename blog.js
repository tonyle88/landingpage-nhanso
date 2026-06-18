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
  let html = '';
  
  blogCategories.forEach(cat => {
    const articles = blogArticles
      .filter(a => a.categoryId === cat.id && a.enabled)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.date) - new Date(a.date);
      });
      
    if (articles.length === 0) return;
    
    html += `
      <section style="margin-bottom: 100px;">
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
        <!-- Cards Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 28px;">
    `;
    
    articles.forEach(a => {
      html += `
        <a href="?id=${a.id}" class="blog-card-link" style="display: flex; flex-direction: column; background: linear-gradient(160deg, rgba(26,16,6,0.95) 0%, rgba(20,13,5,0.98) 100%); border: 1px solid rgba(212,168,67,0.25); border-radius: 16px; overflow: hidden; text-decoration: none; color: inherit; position: relative; transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease, border-color 0.3s ease;"
          onmouseover="this.style.transform='translateY(-8px)'; this.style.boxShadow='0 20px 60px rgba(212,168,67,0.25), 0 0 20px rgba(212,168,67,0.1)'; this.style.borderColor='rgba(212,168,67,0.7)';"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.borderColor='rgba(212,168,67,0.25)';">
          <!-- Corner accents -->
          <div style="position: absolute; top: 0; left: 0; width: 20px; height: 20px; border-top: 2px solid var(--primary); border-left: 2px solid var(--primary); border-radius: 16px 0 0 0; z-index: 2;"></div>
          <div style="position: absolute; top: 0; right: 0; width: 20px; height: 20px; border-top: 2px solid var(--primary); border-right: 2px solid var(--primary); border-radius: 0 16px 0 0; z-index: 2;"></div>
          <!-- Thumbnail -->
          <div style="width: 100%; height: 210px; overflow: hidden; position: relative;">
            ${a.thumbnail
              ? `<img src="${a.thumbnail}" style="width:100%; height:100%; object-fit:cover; transition: transform 0.5s ease;" onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'">`
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
              <span style="font-size: 0.8rem; color: rgba(212,168,67,0.7); letter-spacing:1px;"><i class="fa-regular fa-clock"></i> ${a.date.replace('T', ' ')}</span>
            </div>
            <h3 style="font-family:'Playfair Display',serif; font-size:1.2rem; margin-bottom:12px; line-height:1.55; text-align:justify; color: #f0e0c0; font-weight:700;">${a.title}</h3>
            <div style="color: rgba(235,215,185,0.9); font-size:0.9rem; line-height:1.65; flex:1; overflow:hidden; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical;">${(a.summary || '').replace(/<[^>]*>/g, '')}</div>
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
      </section>
    `;
  });
  
  if (!html) {
    html = '<div style="text-align: center; padding: 60px; color: var(--text-muted);">Chưa có bài viết nào.</div>';
  }
  
  container.innerHTML = html;
}

function renderArticleDetail(id) {
  const container = document.getElementById('blog-container');
  const article = blogArticles.find(a => a.id === id && a.enabled);
  
  if (!article) {
    container.innerHTML = `
      <div style="text-align: center; padding: 80px 20px;">
        <i class="fa-solid fa-ghost" style="font-size:4rem; color: rgba(212,168,67,0.3); margin-bottom:24px; display:block;"></i>
        <h2 style="color: var(--text-muted); margin-bottom:32px;">Bài viết không tồn tại hoặc đã bị ẩn.</h2>
        <a href="blog.html" style="display:inline-flex; align-items:center; gap:10px; background: linear-gradient(135deg, #d4a843, #a07830); color:#000; font-weight:800; padding:12px 28px; border-radius:32px; text-decoration:none; font-size:1rem; box-shadow:0 0 20px rgba(212,168,67,0.4); transition: all 0.3s;">
          <i class="fa-solid fa-arrow-left"></i> Quay lại trang Blog
        </a>
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
    <div style="max-width: 820px; margin: 0 auto;">
      
      <!-- Back Button Row -->
      <div style="display:flex; flex-direction:column; gap:14px; margin-bottom:36px;">
        <a href="blog.html" style="display:inline-flex; align-items:center; gap:10px; background: rgba(212,168,67,0.08); border: 1px solid rgba(212,168,67,0.4); color: var(--primary); font-weight:700; padding:10px 22px; border-radius:32px; text-decoration:none; font-size:0.9rem; letter-spacing:0.5px; transition: all 0.3s; box-shadow: 0 0 12px rgba(212,168,67,0.1); align-self:flex-start;" onmouseover="this.style.background='rgba(212,168,67,0.18)'; this.style.boxShadow='0 0 20px rgba(212,168,67,0.3)';" onmouseout="this.style.background='rgba(212,168,67,0.08)'; this.style.boxShadow='0 0 12px rgba(212,168,67,0.1)';">
          <i class="fa-solid fa-arrow-left"></i> Quay lại Danh Sách
        </a>
        <div style="display:flex; align-items:center; flex-wrap:wrap; gap:10px;">
          <span style="background: linear-gradient(135deg, rgba(212,168,67,0.2), rgba(212,168,67,0.05)); border: 1px solid rgba(212,168,67,0.4); color: var(--primary); padding:6px 16px; border-radius:20px; font-size:0.8rem; font-weight:700; letter-spacing:1px; white-space:nowrap;">${catName}</span>
          <span style="font-size:0.82rem; color:rgba(212,168,67,0.6); white-space:nowrap;"><i class="fa-regular fa-clock"></i> ${article.date.replace('T', ' ')}</span>
        </div>
      </div>

      <!-- Hero image -->
      ${article.thumbnail ? `
        <div style="width:100%; border-radius:20px; overflow:hidden; margin-bottom:40px; box-shadow: 0 12px 48px rgba(0,0,0,0.6), 0 0 30px rgba(212,168,67,0.15); position:relative;">
          <img src="${article.thumbnail}" style="width:100%; max-height:480px; object-fit:cover; display:block;">
          <div style="position:absolute; bottom:0; left:0; right:0; height:120px; background:linear-gradient(to top, rgba(10,7,3,0.9), transparent);"></div>
        </div>` : ''}
      
      <!-- Title Banner (same ribbon style as category) -->
      <div style="text-align:center; margin-bottom:48px;">
        <div style="height:1px; background:linear-gradient(to right, transparent, rgba(212,168,67,0.5), transparent); margin-bottom:28px;"></div>
        <h1 style="font-family:'Playfair Display',serif; font-size:clamp(1.8rem,5vw,3rem); line-height:1.35; font-weight:900; background:linear-gradient(180deg, #f5d98a 0%, #d4a843 50%, #c09030 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:20px;">${article.title}</h1>
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
        ${article.contentHtml}
      </div>

      <!-- Bottom action -->
      <div style="text-align:center; margin:48px 0;">
        <a href="blog.html" style="display:inline-flex; align-items:center; gap:12px; background:linear-gradient(135deg, #d4a843, #a07830); color:#1a1006; font-weight:900; padding:14px 36px; border-radius:36px; text-decoration:none; font-size:1rem; letter-spacing:0.5px; box-shadow:0 0 30px rgba(212,168,67,0.4), 0 8px 24px rgba(0,0,0,0.4); transition:all 0.3s;" onmouseover="this.style.boxShadow='0 0 50px rgba(212,168,67,0.6), 0 12px 32px rgba(0,0,0,0.5)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.boxShadow='0 0 30px rgba(212,168,67,0.4), 0 8px 24px rgba(0,0,0,0.4)'; this.style.transform='none';">
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
        <a href="?id=${r.id}" style="display:flex; gap:16px; padding:16px; background:linear-gradient(135deg, rgba(26,16,6,0.8), rgba(15,10,3,0.9)); border:1px solid rgba(212,168,67,0.2); border-radius:12px; text-decoration:none; color:inherit; transition:all 0.3s;" onmouseover="this.style.borderColor='rgba(212,168,67,0.6)'; this.style.boxShadow='0 0 20px rgba(212,168,67,0.15)'; this.style.transform='translateX(6px)';" onmouseout="this.style.borderColor='rgba(212,168,67,0.2)'; this.style.boxShadow='none'; this.style.transform='none';">
          ${r.thumbnail ? `<div style="width:110px; height:75px; flex-shrink:0; border-radius:8px; overflow:hidden; border:1px solid rgba(212,168,67,0.3);"><img src="${r.thumbnail}" style="width:100%; height:100%; object-fit:cover;"></div>` : `<div style="width:110px; height:75px; flex-shrink:0; border-radius:8px; background:linear-gradient(135deg,#1a1006,#2e1f07); display:flex; align-items:center; justify-content:center; border:1px solid rgba(212,168,67,0.2);"><i class="fa-solid fa-star" style="color:rgba(212,168,67,0.3);"></i></div>`}
          <div style="display:flex; flex-direction:column; justify-content:center; flex:1;">
            <h4 style="font-family:'Playfair Display',serif; font-size:1rem; margin-bottom:6px; line-height:1.4; color:#f0e0c0;">${r.title}</h4>
            <div style="font-size:0.8rem; color:rgba(212,168,67,0.6);"><i class="fa-regular fa-clock"></i> ${r.date.replace('T', ' ')}</div>
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
}
