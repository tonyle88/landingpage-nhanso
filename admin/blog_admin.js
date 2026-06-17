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
      <div class="user-header" style="grid-template-columns: 150px 1fr 100px 100px;">
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

window.renderBlogArticlesList = function(container) {
  const cats = {};
  (state.blogCategories || []).forEach(c => cats[c.id] = c.name);
  
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3>Danh sách bài viết</h3>
      <button class="primary-button" onclick="openBlogArticleModal()"><i class="fa-solid fa-plus"></i> Viết bài mới</button>
    </div>
    <div class="user-list">
      <div class="user-header" style="grid-template-columns: 60px 1fr 150px 100px 80px 100px;">
        <span>Bật</span>
        <span>Tiêu đề</span>
        <span>Chủ đề</span>
        <span>Ngày đăng</span>
        <span>Ghim</span>
        <span style="text-align: right;">Thao tác</span>
      </div>
      ${(state.blogArticles || []).map(a => `
        <div class="user-row" style="grid-template-columns: 60px 1fr 150px 100px 80px 100px; align-items: center;">
          <label class="toggle">
             <input type="checkbox" ${a.enabled ? 'checked' : ''} onchange="toggleBlogArticle('${a.id}', this.checked)">
             <span class="switch"></span>
          </label>
          <strong style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(a.title)}</strong>
          <span class="pill" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(cats[a.categoryId] || a.categoryId)}</span>
          <span>${escapeHtml(a.date)}</span>
          <span style="color: var(--primary);">${a.pinned ? '<i class="fa-solid fa-thumbtack"></i>' : ''}</span>
          <div style="text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
            <button class="icon-button" onclick="openBlogArticleModalById('${a.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-button" style="color: var(--danger);" onclick="deleteBlogArticle('${a.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `).join('')}
      ${(state.blogArticles || []).length === 0 ? '<div style="padding: 32px; text-align: center; color: var(--text-muted);">Chưa có bài viết nào.</div>' : ''}
    </div>
  `;
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
              <label for="article-date">Ngày đăng</label>
              <input type="date" id="article-date" required>
            </div>
            <div>
              <label for="article-thumbnail">Ảnh Thumbnail (URL)</label>
              <input type="text" id="article-thumbnail" placeholder="https://...">
            </div>
          </div>
          
          <div>
             <label for="article-summary">Tóm tắt ngắn</label>
             <textarea id="article-summary" rows="2" placeholder="Hiển thị ở trang danh sách bài viết..."></textarea>
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
    
    // Setup Quill
    window.articleQuill = new Quill('#article-editor', {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ 'header': [2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'align': [] }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['link', 'image', 'video'],
          ['clean']
        ]
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
          date: modal.querySelector('#article-date').value,
          thumbnail: modal.querySelector('#article-thumbnail').value,
          summary: modal.querySelector('#article-summary').value,
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
  modal.querySelector('#article-date').value = article ? article.date : new Date().toISOString().slice(0,10);
  modal.querySelector('#article-thumbnail').value = article ? (article.thumbnail || '') : '';
  modal.querySelector('#article-summary').value = article ? (article.summary || '') : '';
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
