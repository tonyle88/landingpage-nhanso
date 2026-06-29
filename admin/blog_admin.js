function renderBlogManager() {
  els.emptyState.classList.add('is-hidden');
  els.editorGrid.innerHTML = '';
  
  const container = document.createElement('div');
  container.className = 'blog-manager-container';
  container.style.gridColumn = '1 / -1';
  
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.gap = '16px';
  header.style.marginBottom = '24px';
  header.innerHTML = `
    <button class="primary-button" id="tab-articles">Bài viết</button>
    <button class="ghost-button" id="tab-categories">Chủ đề</button>
  `;
  
  const contentArea = document.createElement('div');
  contentArea.id = 'blog-content-area';
  
  container.appendChild(header);
  container.appendChild(contentArea);
  els.editorGrid.appendChild(container);
  
  header.querySelector('#tab-articles').addEventListener('click', (e) => {
    e.target.className = 'primary-button';
    header.querySelector('#tab-categories').className = 'ghost-button';
    renderBlogArticlesList(contentArea);
  });
  
  header.querySelector('#tab-categories').addEventListener('click', (e) => {
    e.target.className = 'primary-button';
    header.querySelector('#tab-articles').className = 'ghost-button';
    renderBlogCategoriesList(contentArea);
  });
  
  renderBlogArticlesList(contentArea);
}

window.renderBlogCategoriesList = function(container) {
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3>Danh sách chủ đề</h3>
      <button class="primary-button" onclick="openBlogCategoryModal()"><i class="fa-solid fa-plus"></i> Thêm Chủ đề</button>
    </div>
    <div class="user-list">
      <div class="user-header" style="display: grid; gap: 10px; padding: 0 12px 12px 12px; font-weight: bold; color: var(--text-muted); border-bottom: 1px solid var(--line); margin-bottom: 8px; grid-template-columns: 150px 1fr 100px 100px;">
        <span>Mã chủ đề</span>
        <span>Tên chủ đề</span>
        <span>Thứ tự</span>
        <span style="text-align: right;">Thao tác</span>
      </div>
      ${(state.blogCategories || []).map(cat => `
        <div class="user-row" style="grid-template-columns: 150px 1fr 100px 100px; align-items: center;">
          <span class="pill">${escapeHtml(cat.id)}</span>
          <strong>${escapeHtml(cat.name)}</strong>
          <span>${cat.order}</span>
          <div style="text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
            <button class="icon-button" onclick="openBlogCategoryModalById('${cat.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-button" style="color: var(--danger);" onclick="deleteBlogCategory('${cat.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
};

window.blogAdminState = window.blogAdminState || {
  categoryFilter: 'ALL',
  currentPage: 1,
  pageSize: 8
};

window.renderBlogArticlesList = function(container) {
  if (!container) container = document.getElementById('blog-content-area');
  
  const cats = {};
  (state.blogCategories || []).forEach(c => cats[c.id] = c.name);
  
  let articles = [...(state.blogArticles || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (window.blogAdminState.categoryFilter !== 'ALL') {
    articles = articles.filter(a => a.categoryId === window.blogAdminState.categoryFilter);
  }
  
  const totalPages = Math.ceil(articles.length / window.blogAdminState.pageSize) || 1;
  if (window.blogAdminState.currentPage > totalPages) window.blogAdminState.currentPage = totalPages;
  
  const startIndex = (window.blogAdminState.currentPage - 1) * window.blogAdminState.pageSize;
  const paginatedArticles = articles.slice(startIndex, startIndex + window.blogAdminState.pageSize);
  
  const catOptions = (state.blogCategories || []).map(c => `<option value="${c.id}" ${window.blogAdminState.categoryFilter === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
  
  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <h3 style="margin: 0;">Danh sách bài viết</h3>
        <div style="position: relative; display: inline-flex; align-items: center;">
          <i class="fa-solid fa-filter" style="position: absolute; left: 12px; color: var(--primary); pointer-events: none; font-size: 0.9rem;"></i>
          <select id="blog-category-filter" style="appearance: none; padding: 8px 32px 8px 36px; background: rgba(212, 168, 67, 0.1); border: 1px solid var(--primary); border-radius: 20px; color: var(--primary); outline: none; font-weight: bold; cursor: pointer; min-width: 230px;" onchange="window.blogAdminState.categoryFilter = this.value; window.blogAdminState.currentPage = 1; window.renderBlogArticlesList()">
            <option value="ALL">Lọc theo: Tất cả chủ đề</option>
            ${catOptions}
          </select>
          <i class="fa-solid fa-chevron-down" style="position: absolute; right: 14px; color: var(--primary); pointer-events: none; font-size: 0.8rem;"></i>
        </div>
      <button class="primary-button" onclick="openBlogArticleModal()"><i class="fa-solid fa-plus"></i> Viết bài mới</button>
    </div>
    <div class="user-list">
      <div class="user-header" style="display: grid; gap: 10px; padding: 0 12px 12px 12px; font-weight: bold; color: var(--text-muted); border-bottom: 1px solid var(--line); margin-bottom: 8px; grid-template-columns: 60px 1fr 150px 100px 80px 100px;">
        <span>Bật</span>
        <span>Tiêu đề</span>
        <span>Chủ đề</span>
        <span>Ngày đăng</span>
        <span>Ghim</span>
        <span style="text-align: right;">Thao tác</span>
      </div>
      ${paginatedArticles.map(a => `
        <div class="user-row" style="grid-template-columns: 60px 1fr 150px 100px 80px 100px; align-items: center;">
          <label class="toggle">
             <input type="checkbox" ${a.enabled ? 'checked' : ''} onchange="toggleBlogArticle('${a.id}', this.checked)">
             <span class="switch"></span>
          </label>
          <strong style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(a.title)}</strong>
          <span class="pill" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(cats[a.categoryId] || a.categoryId)}</span>
          <span style="font-size: 0.9rem;">${escapeHtml(a.date.replace('T', ' '))}</span>
          <button
            class="icon-button blog-pin-button ${a.pinned ? 'is-pinned' : ''}"
            title="${a.pinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết lên đầu'}"
            aria-label="${a.pinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết lên đầu'}"
            onclick="toggleBlogArticlePinned('${a.id}', ${a.pinned ? 'false' : 'true'})"
          >
            <i class="fa-solid fa-thumbtack"></i>
          </button>
          <div style="text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
            <button class="icon-button" onclick="openBlogArticleModalById('${a.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-button" style="color: var(--danger);" onclick="deleteBlogArticle('${a.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `).join('')}
      ${paginatedArticles.length === 0 ? '<div style="padding: 32px; text-align: center; color: var(--text-muted);">Không tìm thấy bài viết nào.</div>' : ''}
    </div>
  `;
  
  if (totalPages > 1) {
    html += `
      <div style="display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 24px;">
        <button class="ghost-button" ${window.blogAdminState.currentPage === 1 ? 'disabled style="opacity: 0.5;"' : ''} onclick="window.blogAdminState.currentPage--; window.renderBlogArticlesList()"><i class="fa-solid fa-chevron-left"></i> Trang trước</button>
        <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-muted);">Trang ${window.blogAdminState.currentPage} / ${totalPages}</span>
        <button class="ghost-button" ${window.blogAdminState.currentPage === totalPages ? 'disabled style="opacity: 0.5;"' : ''} onclick="window.blogAdminState.currentPage++; window.renderBlogArticlesList()">Tiếp theo <i class="fa-solid fa-chevron-right"></i></button>
      </div>
    `;
  }
  
  container.innerHTML = html;
};

window.openBlogCategoryModalById = function(id) {
  const cat = state.blogCategories.find(c => c.id === id);
  openBlogCategoryModal(cat);
};

window.openBlogArticleModalById = function(id) {
  const article = state.blogArticles.find(a => a.id === id);
  openBlogArticleModal(article);
};

window.openBlogCategoryModal = function(cat = null) {
  let modal = document.getElementById('blog-category-modal');
  if (!modal) {
    modal = document.createElement('dialog');
    modal.className = 'modal';
    modal.id = 'blog-category-modal';
    modal.innerHTML = `
      <form method="dialog" class="modal-panel">
        <header>
          <div>
            <p class="eyebrow">Giải mã nhân số học</p>
            <h2 id="cat-modal-title">Thêm Chủ Đề</h2>
          </div>
          <button class="icon-button" type="button" onclick="this.closest('dialog').close()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
          <input type="hidden" id="cat-id" value="">
          <div>
            <label for="cat-name">Tên chủ đề</label>
            <input type="text" id="cat-name" required placeholder="Ví dụ: Số chủ đạo">
          </div>
        </div>
        <footer>
          <button class="ghost-button" type="button" onclick="this.closest('dialog').close()">Hủy</button>
          <button class="primary-button" type="submit" id="btn-save-cat">
            <i class="fa-solid fa-check"></i> Lưu
          </button>
        </footer>
      </form>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = modal.querySelector('#btn-save-cat');
      setBusy(btn, true);
      try {
        const payload = {
          action: 'saveBlogCategory',
          token: state.token,
          id: modal.querySelector('#cat-id').value,
          name: modal.querySelector('#cat-name').value
        };
        const res = await api('saveBlogCategory', payload);
        state.blogCategories = res.blogCategories;
        toast('Đã lưu chủ đề.');
        modal.close();
        if (state.selectedSection === 'blog-manager') renderBlogManager();
      } catch(error) {
        toast(error.message, 'error');
      } finally {
        setBusy(btn, false);
      }
    });
  }
  
  modal.querySelector('#cat-modal-title').textContent = cat ? 'Sửa Chủ Đề' : 'Thêm Chủ Đề';
  modal.querySelector('#cat-id').value = cat ? cat.id : '';
  modal.querySelector('#cat-name').value = cat ? cat.name : '';
  
  openModal(modal);
};

window.openBlogArticleModal = function(article = null) {
  let modal = document.getElementById('blog-article-modal');
  if (!modal) {
    modal = document.createElement('dialog');
    modal.className = 'modal';
    modal.id = 'blog-article-modal';
    modal.style.maxWidth = '800px';
    modal.style.width = '100%';
    modal.innerHTML = `
      <form method="dialog" class="modal-panel" style="max-width: 100%;">
        <header>
          <div>
            <p class="eyebrow">Giải mã nhân số học</p>
            <h2 id="article-modal-title">Viết Bài</h2>
          </div>
          <button class="icon-button" type="button" onclick="this.closest('dialog').close()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
          <input type="hidden" id="article-id" value="">
          <input type="hidden" id="article-original-date" value="">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label for="article-title">Tiêu đề bài viết</label>
              <input type="text" id="article-title" required placeholder="Nhập tiêu đề...">
            </div>
            <div>
              <label for="article-category">Chủ đề</label>
              <select id="article-category" required style="width: 100%; padding: 0.5rem; background: var(--surface-hover); border: 1px solid var(--border); border-radius: 4px; color: var(--text-primary);"></select>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label for="article-date">Ngày và giờ đăng</label>
              <input type="datetime-local" id="article-date" required>
            </div>
            <div>
              <label for="article-thumbnail">Ảnh Thumbnail</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="text" id="article-thumbnail" placeholder="https://... hoặc tải ảnh lên ↓" style="flex: 1;">
              </div>
              <div style="margin-top: 8px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <input type="file" id="article-thumb-file" accept="image/jpeg,image/png,image/webp" style="display:none;">
                <button type="button" class="ghost-button" id="article-thumb-upload-btn" style="font-size: 0.85rem; padding: 6px 12px;" onclick="document.getElementById('article-thumb-file').click()">
                  <i class="fa-solid fa-cloud-arrow-up"></i> Tải ảnh lên ImgBB
                </button>
                <span id="article-thumb-upload-status" style="font-size: 0.85rem; color: var(--text-muted);"></span>
              </div>
            </div>
          </div>
          
          <div>
            <label>Tóm tắt ngắn (hiển thị ở trang danh sách)</label>
            <div id="article-summary-editor" style="height: 120px; background: #fff; color: #000; border-radius: 4px;"></div>
          </div>
          
          <div>
            <label>Nội dung chi tiết</label>
            <div id="article-editor" style="height: 400px; background: #fff; color: #000; border-radius: 4px;"></div>
          </div>
          
          <div style="display: flex; gap: 24px;">
            <label class="toggle" style="display:inline-flex; align-items:center; gap:8px;">
              <input type="checkbox" id="article-enabled" checked>
              <span class="switch"></span>
              <span> Bật hiển thị</span>
            </label>
            <label class="toggle" style="display:inline-flex; align-items:center; gap:8px;">
              <input type="checkbox" id="article-pinned">
              <span class="switch"></span>
              <span style="color: var(--primary);"> Đính ghim lên đầu</span>
            </label>
          </div>
        </div>
        <footer>
          <button class="ghost-button" type="button" onclick="this.closest('dialog').close()">Hủy</button>
          <button class="primary-button" type="submit" id="btn-save-article">
            <i class="fa-solid fa-check"></i> Lưu Bài Viết
          </button>
        </footer>
      </form>
    `;
    document.body.appendChild(modal);
    
    // Shared toolbar config with color
    const FULL_TOOLBAR = [
      [{ 'header': [2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image', 'video'],
      ['clean']
    ];
    const SUMMARY_TOOLBAR = [
      ['bold', 'italic', 'underline'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['clean']
    ];
    
    // Setup Summary Quill
    window.summaryQuill = new Quill('#article-summary-editor', {
      theme: 'snow',
      placeholder: 'Hiển thị ở trang danh sách bài viết...',
      modules: { toolbar: SUMMARY_TOOLBAR }
    });
    
    // Setup Content Quill
    window.articleQuill = new Quill('#article-editor', {
      theme: 'snow',
      modules: { toolbar: FULL_TOOLBAR }
    });
    
    // Thumbnail file upload via api uploadImage
    document.getElementById('article-thumb-file').addEventListener('change', async function() {
      const file = this.files[0];
      if (!file) return;
      const statusEl = document.getElementById('article-thumb-upload-status');
      const uploadBtn = document.getElementById('article-thumb-upload-btn');
      setBusy(uploadBtn, true);
      statusEl.textContent = 'Đang tải ảnh lên...';
      statusEl.style.color = 'var(--text-muted)';
      try {
        const base64 = await resizeAndCompressImage(file);
        const cleanBase64 = base64.split('base64,')[1];
        const res = await api('uploadImage', {
          token: state.token,
          filename: file.name,
          imageBase64: cleanBase64
        });
        if (res.url) {
          document.getElementById('article-thumbnail').value = res.url;
          statusEl.textContent = '✓ Tải lên thành công!';
          statusEl.style.color = 'var(--primary)';
        }
        this.value = '';
      } catch(err) {
        statusEl.textContent = 'Lỗi: ' + err.message;
        statusEl.style.color = 'var(--danger)';
      } finally {
        setBusy(uploadBtn, false);
      }
    });
    
    modal.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = modal.querySelector('#btn-save-article');
      setBusy(btn, true);
      try {
        const payload = {
          action: 'saveBlogArticle',
          token: state.token,
          id: modal.querySelector('#article-id').value,
          title: modal.querySelector('#article-title').value,
          categoryId: modal.querySelector('#article-category').value,
          date: modal.querySelector('#article-date').value || modal.querySelector('#article-original-date').value,
          thumbnail: modal.querySelector('#article-thumbnail').value,
          summary: window.summaryQuill ? window.summaryQuill.root.innerHTML : '',
          contentHtml: window.articleQuill.root.innerHTML,
          enabled: modal.querySelector('#article-enabled').checked ? 'true' : 'false',
          pinned: modal.querySelector('#article-pinned').checked ? 'true' : 'false'
        };
        const res = await api('saveBlogArticle', payload);
        state.blogArticles = res.blogArticles;
        toast('Đã lưu bài viết.');
        modal.close();
        if (state.selectedSection === 'blog-manager') renderBlogManager();
      } catch(error) {
        toast(error.message, 'error');
      } finally {
        setBusy(btn, false);
      }
    });
  }
  
  // Populate categories
  const catSelect = modal.querySelector('#article-category');
  catSelect.innerHTML = (state.blogCategories || []).map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  
  modal.querySelector('#article-modal-title').textContent = article ? 'Sửa Bài Viết' : 'Viết Bài Mới';
  modal.querySelector('#article-id').value = article ? article.id : '';
  modal.querySelector('#article-title').value = article ? article.title : '';
  modal.querySelector('#article-category').value = article ? article.categoryId : '';
  
  const dateValue = article
    ? toDatetimeLocalValue(article.date, getCurrentDatetimeLocal())
    : getCurrentDatetimeLocal();
  modal.querySelector('#article-original-date').value = article ? (article.date || '') : '';
  modal.querySelector('#article-date').value = dateValue;
  modal.querySelector('#article-thumbnail').value = article ? (article.thumbnail || '') : '';
  if (window.summaryQuill) {
    window.summaryQuill.root.innerHTML = article ? (article.summary || '') : '';
  }
  if (window.articleQuill) {
    window.articleQuill.root.innerHTML = article ? article.contentHtml : '';
  }
  modal.querySelector('#article-enabled').checked = article ? article.enabled : true;
  modal.querySelector('#article-pinned').checked = article ? article.pinned : false;
  
  openModal(modal);
};

window.deleteBlogCategory = async function(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa chủ đề này?')) return;
  try {
    const res = await api('deleteBlogCategory', { token: state.token, id });
    state.blogCategories = res.blogCategories;
    toast('Đã xóa chủ đề.');
    if (state.selectedSection === 'blog-manager') renderBlogManager();
  } catch (error) {
    toast(error.message, 'error');
  }
};

window.deleteBlogArticle = async function(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;
  try {
    const res = await api('deleteBlogArticle', { token: state.token, id });
    state.blogArticles = res.blogArticles;
    toast('Đã xóa bài viết.');
    if (state.selectedSection === 'blog-manager') renderBlogManager();
  } catch (error) {
    toast(error.message, 'error');
  }
};

window.toggleBlogArticle = async function(id, enabled) {
  const article = state.blogArticles.find(a => a.id === id);
  if (!article) return;
  try {
    const payload = {
      action: 'saveBlogArticle',
      token: state.token,
      ...article,
      enabled: enabled ? 'true' : 'false'
    };
    const res = await api('saveBlogArticle', payload);
    state.blogArticles = res.blogArticles;
    toast(enabled ? 'Đã bật bài viết' : 'Đã ẩn bài viết');
  } catch (error) {
    toast(error.message, 'error');
    if (state.selectedSection === 'blog-manager') renderBlogManager();
  }
};

window.toggleBlogArticlePinned = async function(id, pinned) {
  const article = state.blogArticles.find(a => a.id === id);
  if (!article) return;
  try {
    const payload = {
      action: 'saveBlogArticle',
      token: state.token,
      ...article,
      pinned: pinned ? 'true' : 'false'
    };
    const res = await api('saveBlogArticle', payload);
    state.blogArticles = res.blogArticles;
    toast(pinned ? 'Đã ghim bài viết lên đầu' : 'Đã bỏ ghim bài viết');
    if (state.selectedSection === 'blog-manager') renderBlogManager();
  } catch (error) {
    toast(error.message, 'error');
    if (state.selectedSection === 'blog-manager') renderBlogManager();
  }
};

function getCurrentDatetimeLocal() {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + 'T' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0');
}

function toDatetimeLocalValue(value, fallback = '') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;

  const isoLike = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s]+(\d{1,2}):(\d{2})(?::\d{2})?)?/);
  if (isoLike) {
    const hours = isoLike[2] ? isoLike[2].padStart(2, '0') : '00';
    const minutes = isoLike[3] || '00';
    return `${isoLike[1]}T${hours}:${minutes}`;
  }

  const slashDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/);
  if (slashDate) {
    const day = slashDate[1].padStart(2, '0');
    const month = slashDate[2].padStart(2, '0');
    const hours = slashDate[4] ? slashDate[4].padStart(2, '0') : '00';
    const minutes = slashDate[5] || '00';
    return `${slashDate[3]}-${month}-${day}T${hours}:${minutes}`;
  }

  return fallback;
}
