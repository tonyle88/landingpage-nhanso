const ADMIN_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3m9zkv9mX-BgMtB7DZj2rMrZtkAAOFDQow2UKxttXRz8G5Zlc4qponSGrvPBxJwEO/exec';
const SESSION_KEY = 'clowcat_admin_session';

const state = {
  token: '',
  user: null,
  items: [],
  originals: new Map(),
  sections: [],
  selectedSection: 'all',
  search: '',
  savingKeys: new Set(),
  feedbackImages: [],
};

const els = {
  loginScreen: document.getElementById('login-screen'),
  adminShell: document.getElementById('admin-shell'),
  loginForm: document.getElementById('login-form'),
  loginMessage: document.getElementById('login-message'),
  loginPassword: document.getElementById('login-password'),
  toggleLoginPassword: document.getElementById('toggle-login-password'),
  sectionNav: document.getElementById('section-nav'),
  editorGrid: document.getElementById('editor-grid'),
  emptyState: document.getElementById('empty-state'),
  totalCount: document.getElementById('total-count'),
  enabledCount: document.getElementById('enabled-count'),
  dirtyCount: document.getElementById('dirty-count'),
  currentUser: document.getElementById('current-user'),
  contentSearch: document.getElementById('content-search'),
  sectionHeading: document.getElementById('section-heading'),
  refreshContent: document.getElementById('refresh-content'),
  saveAll: document.getElementById('save-all'),
  syncTemplate: document.getElementById('sync-template'),
  logout: document.getElementById('logout'),
  openPassword: document.getElementById('open-password'),
  passwordModal: document.getElementById('password-modal'),
  passwordForm: document.getElementById('password-form'),
  passwordMessage: document.getElementById('password-message'),
  openUsers: document.getElementById('open-users'),
  usersModal: document.getElementById('users-modal'),
  userForm: document.getElementById('user-form'),
  userList: document.getElementById('user-list'),
  usersMessage: document.getElementById('users-message'),
  toast: document.getElementById('toast'),
  adminHamburger: document.getElementById('admin-hamburger'),
  sidebar: document.querySelector('.sidebar'),
};

document.addEventListener('DOMContentLoaded', boot);

function boot() {
  bindEvents();
  restoreSession();
}

function bindEvents() {
  els.loginForm.addEventListener('submit', handleLogin);
  els.toggleLoginPassword.addEventListener('click', toggleLoginPassword);
  els.contentSearch.addEventListener('input', () => {
    state.search = els.contentSearch.value.trim().toLowerCase();
    render();
  });
  els.refreshContent.addEventListener('click', () => loadContent(true));
  els.saveAll.addEventListener('click', saveAllDirtyItems);
  els.syncTemplate.addEventListener('click', syncTemplate);
  els.logout.addEventListener('click', logout);
  els.openPassword.addEventListener('click', () => openModal(els.passwordModal));
  els.passwordForm.addEventListener('submit', changePassword);
  els.openUsers.addEventListener('click', openUsersModal);
  els.userForm.addEventListener('submit', createUser);

  if (els.adminHamburger) {
    els.adminHamburger.addEventListener('click', () => {
      els.adminHamburger.classList.toggle('is-active');
      els.sidebar.classList.toggle('is-open');
    });
  }

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      const modal = document.getElementById(button.dataset.closeModal);
      closeModal(modal);
    });
  });

  [els.passwordModal, els.usersModal].forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });
}

function restoreSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    if (!saved.token || !saved.user) return showLogin();
    state.token = saved.token;
    state.user = saved.user;
    showAdmin();
    loadContent();
  } catch (error) {
    showLogin();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  setMessage(els.loginMessage, 'Đang đăng nhập...');
  const formData = new FormData(els.loginForm);
  try {
    const payload = await api('loginAdmin', {
      username: formData.get('username'),
      password: formData.get('password'),
    }, false);

    state.token = payload.token;
    state.user = payload.user;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: state.token, user: state.user }));
    setMessage(els.loginMessage, payload.forcePasswordChange ? 'Bạn đang dùng mật khẩu mặc định, hãy đổi ngay sau khi vào.' : 'Đăng nhập thành công.', 'success');
    showAdmin();
    await loadContent();
    if (payload.forcePasswordChange) {
      window.setTimeout(() => openModal(els.passwordModal), 450);
    }
  } catch (error) {
    setMessage(els.loginMessage, error.message, 'error');
  }
}

async function loadContent(showNotice = false) {
  setBusy(els.refreshContent, true);
  try {
    const payload = await api('getAdminContent', { token: state.token });
    state.items = (payload.items || []).map(normalizeItem);
    state.sections = payload.sections || [];
    state.feedbackImages = payload.feedbackImages || [];
    state.originals = new Map(state.items.map((item) => [item.key, snapshotItem(item)]));
    render();
    if (showNotice) toast('Đã tải lại nội dung mới nhất.');
  } catch (error) {
    handleSessionError(error);
  } finally {
    setBusy(els.refreshContent, false);
  }
}

function normalizeItem(item) {
  return {
    enabled: item.enabled !== false,
    key: String(item.key || ''),
    section: String(item.section || 'Khác'),
    description: String(item.description || ''),
    selector: String(item.selector || ''),
    type: String(item.type || 'text'),
    attribute: String(item.attribute || ''),
    value: item.value == null ? '' : String(item.value),
    rowNumber: item.rowNumber || '',
  };
}

function snapshotItem(item) {
  return {
    enabled: item.enabled,
    value: item.value,
  };
}

function showLogin() {
  els.loginScreen.hidden = false;
  els.adminShell.hidden = true;
  els.loginScreen.classList.remove('is-hidden');
  els.adminShell.classList.add('is-hidden');
}

function showAdmin() {
  els.loginScreen.hidden = true;
  els.adminShell.hidden = false;
  els.loginScreen.classList.add('is-hidden');
  els.adminShell.classList.remove('is-hidden');
  const displayName = state.user.displayName || state.user.username;
  els.currentUser.textContent = displayName;
  els.currentUser.title = `${displayName} - ${state.user.role}`;
  document.querySelectorAll('.admin-only').forEach((el) => {
    el.classList.toggle('is-hidden', state.user.role !== 'admin');
  });
}

function render() {
  renderSections();
  renderHeading();
  renderCards();
  renderStats();
}

function renderSections() {
  const groups = buildSectionGroups();
  const buttons = [
    { name: 'all', label: 'Tất cả', count: state.items.length },
    ...groups.map((group) => ({ name: group.name, label: group.name, count: group.count })),
    { name: 'feedback-images', label: 'Ảnh Feedback', count: state.feedbackImages ? state.feedbackImages.length : 0 }
  ];

  els.sectionNav.innerHTML = '';
  buttons.forEach((section) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `section-tab${state.selectedSection === section.name ? ' is-active' : ''}`;
    button.innerHTML = `<span></span><small></small>`;
    button.querySelector('span').textContent = section.label;
    button.querySelector('small').textContent = section.count;
    button.addEventListener('click', () => {
      state.selectedSection = section.name;
      if (els.adminHamburger && els.adminHamburger.classList.contains('is-active')) {
        els.adminHamburger.classList.remove('is-active');
        els.sidebar.classList.remove('is-open');
      }
      render();
    });
    els.sectionNav.appendChild(button);
  });
}

function renderHeading() {
  let label, count, title, desc;
  if (state.selectedSection === 'feedback-images') {
    label = 'Ảnh khách hàng';
    title = 'Quản lý ảnh Feedback';
    count = state.feedbackImages ? state.feedbackImages.length : 0;
    desc = `${count} ảnh đang hiển thị. Ảnh sẽ tự động thêm vào mục "Khách hàng nghĩ gì?" trên trang chủ.`;
  } else {
    label = state.selectedSection === 'all' ? 'Tất cả section' : state.selectedSection;
    count = getFilteredItems().length;
    title = state.selectedSection === 'all' ? 'Nội dung có thể chỉnh' : `Section ${state.selectedSection}`;
    desc = `${count} mục đang hiển thị. Những mục đổi nội dung sẽ được đánh dấu để bạn lưu lại.`;
  }
  els.sectionHeading.querySelector('.eyebrow').textContent = label;
  els.sectionHeading.querySelector('h2').textContent = title;
  document.getElementById('section-description').textContent = desc;
}

function renderCards() {
  if (state.selectedSection === 'feedback-images') {
    renderFeedbackImages();
    return;
  }

  const items = getFilteredItems();
  els.editorGrid.innerHTML = '';
  els.emptyState.classList.toggle('is-hidden', items.length > 0);

  items.forEach((item) => {
    els.editorGrid.appendChild(createContentCard(item));
  });
}

function createContentCard(item) {
  const card = document.createElement('article');
  card.className = `content-card${isDirty(item) ? ' is-dirty' : ''}`;
  card.dataset.key = item.key;

  const top = document.createElement('div');
  top.className = 'card-top';
  top.innerHTML = `
    <div>
      <div class="content-key"></div>
      <p class="content-desc"></p>
    </div>
  `;
  top.querySelector('.content-key').textContent = item.key;
  top.querySelector('.content-desc').textContent = item.description || item.selector || 'Nội dung landing page';

  const toggle = document.createElement('label');
  toggle.className = 'toggle';
  toggle.innerHTML = `
    <input type="checkbox" />
    <span class="switch"></span>
    <span>Bật</span>
  `;
  toggle.querySelector('input').checked = item.enabled;
  toggle.querySelector('input').addEventListener('change', (event) => {
    item.enabled = event.target.checked;
    render();
  });
  top.appendChild(toggle);

  const meta = document.createElement('div');
  meta.className = 'content-meta';
  [item.section, item.type, item.attribute || 'content'].forEach((value) => {
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = value;
    meta.appendChild(pill);
  });

  const input = shouldUseTextarea(item)
    ? document.createElement('textarea')
    : document.createElement('input');
  if (input.tagName === 'INPUT') input.type = 'text';
  input.value = item.value;
  input.setAttribute('aria-label', item.description || item.key);
  input.addEventListener('input', (event) => {
    item.value = event.target.value;
    updateSingleCardState(card, item);
  });

  const actions = document.createElement('div');
  actions.className = 'card-actions';
  const stateLabel = document.createElement('span');
  stateLabel.className = 'save-state';
  stateLabel.textContent = isDirty(item) ? 'Có thay đổi chưa lưu' : 'Đã đồng bộ';
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'ghost-button';
  saveButton.disabled = !isDirty(item) || state.savingKeys.has(item.key);
  saveButton.innerHTML = `<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i><span>Lưu mục này</span>`;
  saveButton.addEventListener('click', () => saveItem(item));
  actions.append(stateLabel, saveButton);

  card.append(top, meta, input, actions);
  return card;
}

function updateSingleCardState(card, item) {
  card.classList.toggle('is-dirty', isDirty(item));
  const label = card.querySelector('.save-state');
  const button = card.querySelector('.card-actions button');
  label.textContent = isDirty(item) ? 'Có thay đổi chưa lưu' : 'Đã đồng bộ';
  button.disabled = !isDirty(item) || state.savingKeys.has(item.key);
  renderStats();
}

function shouldUseTextarea(item) {
  const type = item.type.toLowerCase();
  return type === 'html' || item.value.length > 90 || item.value.includes('\n');
}

function renderStats() {
  const dirty = getDirtyItems();
  els.totalCount.textContent = state.items.length;
  els.enabledCount.textContent = state.items.filter((item) => item.enabled).length;
  els.dirtyCount.textContent = dirty.length;
  els.saveAll.disabled = dirty.length === 0;
}

function buildSectionGroups() {
  const groups = new Map();
  state.items.forEach((item) => {
    if (!groups.has(item.section)) groups.set(item.section, { name: item.section, count: 0 });
    groups.get(item.section).count += 1;
  });
  return Array.from(groups.values());
}

function getFilteredItems() {
  const search = state.search;
  return state.items.filter((item) => {
    const sectionMatch = state.selectedSection === 'all' || item.section === state.selectedSection;
    if (!sectionMatch) return false;
    if (!search) return true;
    return [
      item.key,
      item.section,
      item.description,
      item.selector,
      item.type,
      item.value,
    ].join(' ').toLowerCase().includes(search);
  });
}

function isDirty(item) {
  const original = state.originals.get(item.key);
  if (!original) return true;
  return original.value !== item.value || original.enabled !== item.enabled;
}

function getDirtyItems() {
  return state.items.filter(isDirty);
}

async function saveItem(item) {
  if (!isDirty(item)) return;
  state.savingKeys.add(item.key);
  render();
  try {
    await api('saveLandingContentItem', {
      token: state.token,
      key: item.key,
      value: item.value,
      enabled: item.enabled ? 'true' : 'false',
    });
    state.originals.set(item.key, snapshotItem(item));
    toast(`Đã lưu ${item.key}`);
  } catch (error) {
    handleSessionError(error);
  } finally {
    state.savingKeys.delete(item.key);
    render();
  }
}

async function saveAllDirtyItems() {
  const dirty = getDirtyItems();
  if (!dirty.length) return;
  setBusy(els.saveAll, true);
  try {
    await api('saveLandingContentBatch', {
      token: state.token,
      items: JSON.stringify(dirty.map((item) => ({
        key: item.key,
        value: item.value,
        enabled: item.enabled,
      }))),
    });
    dirty.forEach((item) => state.originals.set(item.key, snapshotItem(item)));
    render();
    toast(`Đã lưu ${dirty.length} mục nội dung.`);
  } catch (error) {
    handleSessionError(error);
  } finally {
    setBusy(els.saveAll, false);
  }
}

async function syncTemplate() {
  setBusy(els.syncTemplate, true);
  try {
    await api('syncLandingContentTemplate', { token: state.token });
    await loadContent();
    toast('Đã đồng bộ dòng nội dung mới từ template.');
  } catch (error) {
    handleSessionError(error);
  } finally {
    setBusy(els.syncTemplate, false);
  }
}

async function changePassword(event) {
  event.preventDefault();
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  if (newPassword !== confirmPassword) {
    setMessage(els.passwordMessage, 'Mật khẩu mới chưa khớp.', 'error');
    return;
  }

  setMessage(els.passwordMessage, 'Đang lưu mật khẩu...');
  try {
    await api('changeAdminPassword', {
      token: state.token,
      currentPassword,
      newPassword,
    });
    els.passwordForm.reset();
    setMessage(els.passwordMessage, 'Đã đổi mật khẩu.', 'success');
    toast('Mật khẩu đã được cập nhật.');
  } catch (error) {
    setMessage(els.passwordMessage, error.message, 'error');
  }
}

async function openUsersModal() {
  if (state.user.role !== 'admin') return;
  openModal(els.usersModal);
  await loadUsers();
}

async function loadUsers() {
  setMessage(els.usersMessage, 'Đang tải danh sách user...');
  try {
    const payload = await api('listAdminUsers', { token: state.token });
    renderUsers(payload.users || []);
    setMessage(els.usersMessage, '');
  } catch (error) {
    setMessage(els.usersMessage, error.message, 'error');
  }
}

function renderUsers(users) {
  els.userList.innerHTML = '';
  users.forEach((user) => {
    const row = document.createElement('article');
    row.className = 'user-row';
    const info = document.createElement('div');
    info.innerHTML = `<strong></strong><span></span>`;
    info.querySelector('strong').textContent = `${user.displayName || user.username} - ${user.role}`;
    info.querySelector('span').textContent = `@${user.username}${user.lastLoginAt ? ` - đăng nhập gần nhất ${formatDate(user.lastLoginAt)}` : ''}`;
    const status = document.createElement('span');
    status.className = 'pill';
    status.textContent = user.enabled ? 'Đang bật' : 'Đã khóa';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ghost-button';
    button.disabled = user.username === state.user.username;
    button.innerHTML = user.enabled
      ? `<i class="fa-solid fa-user-lock" aria-hidden="true"></i><span>Khóa</span>`
      : `<i class="fa-solid fa-user-check" aria-hidden="true"></i><span>Mở</span>`;
    button.addEventListener('click', () => setUserStatus(user.username, !user.enabled));
    row.append(info, status, button);
    els.userList.appendChild(row);
  });
}

async function createUser(event) {
  event.preventDefault();
  setMessage(els.usersMessage, 'Đang tạo user...');
  try {
    await api('createAdminUser', {
      token: state.token,
      username: document.getElementById('new-user-username').value,
      displayName: document.getElementById('new-user-display').value,
      role: document.getElementById('new-user-role').value,
      password: document.getElementById('new-user-password').value,
    });
    els.userForm.reset();
    setMessage(els.usersMessage, 'Đã tạo user mới.', 'success');
    await loadUsers();
  } catch (error) {
    setMessage(els.usersMessage, error.message, 'error');
  }
}

async function setUserStatus(username, enabled) {
  try {
    await api('setAdminUserStatus', {
      token: state.token,
      username,
      enabled: enabled ? 'true' : 'false',
    });
    await loadUsers();
    toast(enabled ? 'Đã mở tài khoản.' : 'Đã khóa tài khoản.');
  } catch (error) {
    setMessage(els.usersMessage, error.message, 'error');
  }
}

async function logout() {
  try {
    if (state.token) await api('logoutAdmin', { token: state.token });
  } catch (error) {
    // Logging out locally is still the right fallback.
  }
  state.token = '';
  state.user = null;
  state.items = [];
  state.originals = new Map();
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
}

async function api(action, data = {}, includeToken = true) {
  const body = new URLSearchParams();
  body.set('action', action);
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) body.set(key, String(value));
  });
  if (includeToken && state.token && !body.has('token')) body.set('token', state.token);

  const response = await fetch(ADMIN_SCRIPT_URL, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-store',
    body,
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.message || 'Không thể hoàn tất thao tác.');
  return payload;
}

function handleSessionError(error) {
  if (/dang nhap|het han|phien/i.test(error.message)) {
    toast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
    logout();
    return;
  }
  toast(error.message || 'Có lỗi xảy ra.');
}

function setBusy(button, busy) {
  button.disabled = busy;
  button.dataset.busy = busy ? 'true' : 'false';
}

function setMessage(element, text, type = '') {
  element.textContent = text || '';
  element.classList.toggle('is-error', type === 'error');
  element.classList.toggle('is-success', type === 'success');
}

function openModal(modal) {
  setMessage(els.passwordMessage, '');
  setMessage(els.usersMessage, '');
  if (typeof modal.showModal === 'function') modal.showModal();
  else modal.setAttribute('open', '');
}

function closeModal(modal) {
  if (!modal) return;
  if (typeof modal.close === 'function') modal.close();
  else modal.removeAttribute('open');
}

function toggleLoginPassword() {
  const visible = els.loginPassword.type === 'text';
  els.loginPassword.type = visible ? 'password' : 'text';
  els.toggleLoginPassword.querySelector('i').className = visible ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    els.toast.classList.remove('is-visible');
  }, 3200);
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

// =============================================
//  Feedback Images Upload
// =============================================
function renderFeedbackImages() {
  els.editorGrid.innerHTML = `
    <div class="content-card" style="grid-column: 1/-1;">
      <div class="card-top">
        <div>
          <div class="content-key">Tải lên ảnh Feedback mới</div>
          <p class="content-desc">Chọn file ảnh (.jpg, .png, .webp). Hệ thống sẽ tự động nén kích thước để web load nhanh hơn.</p>
        </div>
      </div>
      <div style="margin-top: 16px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
        <input type="file" id="feedback-upload-input" accept="image/jpeg, image/png, image/webp" />
        <button type="button" class="primary-button" id="feedback-upload-btn" disabled>
          <i class="fa-solid fa-cloud-arrow-up"></i> <span>Tải ảnh lên</span>
        </button>
      </div>
      <p id="feedback-upload-msg" style="margin-top: 12px; font-size: 0.9em; font-weight: 500;"></p>
    </div>
  `;
  
  const input = document.getElementById('feedback-upload-input');
  const btn = document.getElementById('feedback-upload-btn');
  const msg = document.getElementById('feedback-upload-msg');
  
  input.addEventListener('change', () => {
    btn.disabled = !input.files.length;
  });
  
  btn.addEventListener('click', async () => {
    if (!input.files.length) return;
    const file = input.files[0];
    
    setBusy(btn, true);
    msg.textContent = 'Đang nén và đẩy ảnh lên ImgBB... Vui lòng đợi nhé!';
    msg.style.color = 'var(--text-dim)';
    
    try {
      const base64 = await resizeAndCompressImage(file);
      const cleanBase64 = base64.split('base64,')[1];
      
      const formData = new FormData();
      formData.append('key', 'dbbeb2a25359362e9e9df73c5a9adb24');
      formData.append('image', cleanBase64);
      formData.append('name', file.name);
      
      const imgbbRes = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData
      });
      
      const imgbbData = await imgbbRes.json();
      if (!imgbbData.success) {
        throw new Error('Lỗi từ ImgBB: ' + (imgbbData.error ? imgbbData.error.message : 'Unknown'));
      }
      
      const url = imgbbData.data.display_url;
      const fileId = imgbbData.data.id;

      await api('saveFeedbackImage', {
        token: state.token,
        filename: file.name,
        url: url,
        fileId: fileId
      });
      
      toast('Tải ảnh lên thành công!');
      input.value = '';
      btn.disabled = true;
      msg.textContent = '';
      loadContent(true);
    } catch(err) {
      msg.textContent = 'Lỗi: ' + err.message;
      msg.style.color = 'var(--color-danger)';
    } finally {
      setBusy(btn, false);
    }
  });

  const gallery = document.createElement('div');
  gallery.className = 'feedback-gallery';
  gallery.style.display = 'grid';
  gallery.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
  gallery.style.gap = '16px';
  gallery.style.marginTop = '8px';
  gallery.style.width = '100%';
  gallery.style.gridColumn = '1 / -1';
  
  if (state.feedbackImages && state.feedbackImages.length) {
    state.feedbackImages.forEach(img => {
      const card = document.createElement('article');
      card.className = 'content-card';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.alignItems = 'center';
      card.style.padding = '12px';
      
      const imgEl = document.createElement('img');
      imgEl.src = img.url;
      imgEl.style.width = '100%';
      imgEl.style.height = 'auto';
      imgEl.style.maxHeight = '240px';
      imgEl.style.objectFit = 'contain';
      imgEl.style.borderRadius = '8px';
      imgEl.style.marginBottom = '12px';
      imgEl.style.backgroundColor = 'var(--surface-sunken)';
      
      const delBtn = document.createElement('button');
      delBtn.className = 'ghost-button';
      delBtn.style.color = 'var(--color-danger)';
      delBtn.style.marginTop = 'auto';
      delBtn.innerHTML = '<i class="fa-solid fa-trash"></i> <span>Xóa ảnh</span>';
      delBtn.onclick = async () => {
        if (!confirm('Bạn có chắc muốn xóa ảnh này khỏi Landing Page không?')) return;
        setBusy(delBtn, true);
        try {
          await api('deleteFeedbackImage', { token: state.token, fileId: img.fileId });
          toast('Đã xóa ảnh.');
          loadContent(true);
        } catch(err) {
          handleSessionError(err);
          setBusy(delBtn, false);
        }
      };
      
      card.append(imgEl, delBtn);
      gallery.appendChild(card);
    });
  } else {
    gallery.innerHTML = '<p style="grid-column: 1/-1; color: var(--text-dim);">Chưa có ảnh feedback nào được tải lên.</p>';
  }
  
  els.editorGrid.appendChild(gallery);
  els.emptyState.classList.add('is-hidden');
}

function resizeAndCompressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1000;
        
        if (width > height && width > maxDim) {
          height *= maxDim / width;
          width = maxDim;
        } else if (height > maxDim) {
          width *= maxDim / height;
          height = maxDim;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        let dataUrl;
        if (file.type === 'image/png') {
          dataUrl = canvas.toDataURL('image/png');
        } else {
          dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Khong the doc file anh.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Loi doc file.'));
    reader.readAsDataURL(file);
  });
}
