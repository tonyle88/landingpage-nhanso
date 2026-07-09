const ADMIN_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3m9zkv9mX-BgMtB7DZj2rMrZtkAAOFDQow2UKxttXRz8G5Zlc4qponSGrvPBxJwEO/exec';
const SESSION_KEY = 'clowcat_admin_session';
const MANAGED_PACKAGE_CONTENT_PREFIXES = [
  'packages.year_',
  'packages.big3_',
  'packages.big7_',
];
const FEEDBACK_IMAGES_PER_PAGE = 8;

const state = {
  token: null,
  user: null,
  items: [],
  sectionsLayout: [],
  packages: [],
  feedbackImages: [],
  paymentSettings: {},
  search: '',
  selectedSection: 'all',
  miniReportFilter: { type: 'life_path', number: '1' },
  feedbackPage: 1,
  savingKeys: new Set(),
  toastTimeout: null,
};

// Cấu hình Quill dùng inline style cho canh lề
if (window.Quill) {
  const AlignStyle = Quill.import('attributors/style/align');
  Quill.register(AlignStyle, true);
}

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
  healthCheck: document.getElementById('health-check'),
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
  globalLoader: document.getElementById('global-loader'),
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
  els.healthCheck?.addEventListener('click', runHealthCheck);
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
    setMessage(els.loginMessage, 'Đăng nhập thành công.', 'success');
    showAdmin();
    await loadContent();
  } catch (error) {
    setMessage(els.loginMessage, error.message, 'error');
  }
}

async function loadContent(showNotice = false) {
  setBusy(els.refreshContent, true);
  if (els.globalLoader) els.globalLoader.classList.remove('is-hidden');
  try {
    const payload = await api('getAdminContent', { token: state.token });
    state.items = (payload.items || []).map(normalizeItem);
    state.sections = payload.sections || [];
    state.feedbackImages = payload.feedbackImages || [];
    state.packages = payload.packages || [];
    state.sectionsLayout = payload.sectionsLayout || [];
    state.paymentSettings = normalizePaymentSettings(payload.paymentSettings);
    state.blogCategories = payload.blogCategories || [];
    state.blogArticles = payload.blogArticles || [];
    state.originals = new Map(state.items.map((item) => [item.key, snapshotItem(item)]));
    render();
    if (showNotice) toast('Đã tải lại nội dung mới nhất.');
  } catch (error) {
    handleSessionError(error);
  } finally {
    setBusy(els.refreshContent, false);
    if (els.globalLoader) els.globalLoader.classList.add('is-hidden');
  }
}

async function runHealthCheck() {
  if (!state.token) return;
  setBusy(els.healthCheck, true);
  try {
    const payload = await apiAllowFailure('healthCheck', { token: state.token });
    const summary = summarizeHealthCheck(payload);
    toast(payload.ok ? 'Hệ thống content/admin ổn.' : 'Health check phát hiện lỗi.', payload.ok ? 'success' : 'error');
    window.alert(summary);
  } catch (error) {
    handleSessionError(error);
  } finally {
    setBusy(els.healthCheck, false);
  }
}

function summarizeHealthCheck(payload) {
  const lines = [
    payload.ok ? 'Content/Admin health check: OK' : 'Content/Admin health check: CẦN KIỂM TRA',
    `Script version: ${payload.scriptVersion || 'không rõ'}`,
  ];

  const badSheets = (payload.sheets || []).filter((item) => !item.ok);
  const badProps = (payload.properties || []).filter((item) => !item.ok && item.required);
  if (badSheets.length) {
    lines.push('', 'Sheet lỗi:');
    badSheets.forEach((item) => lines.push(`- ${item.name}: ${item.message}${item.missing?.length ? ` (${item.missing.join(', ')})` : ''}`));
  }
  if (badProps.length) {
    lines.push('', 'Script Properties thiếu:');
    badProps.forEach((item) => lines.push(`- ${item.key || item.name}: ${item.message || 'Thiếu cấu hình'}`));
  }
  if (!badSheets.length && !badProps.length) lines.push('', 'Tất cả sheet bắt buộc đang đúng header.');
  return lines.join('\n');
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

function normalizePaymentSettings(settings = {}) {
  return {
    sepayEnabled: settings.sepayEnabled === true || String(settings.sepayEnabled).toLowerCase() === 'true',
    bankName: String(settings.bankName || 'Vietcombank'),
    bankBin: String(settings.bankBin || '970436'),
    bankAccount: String(settings.bankAccount || '0421003904479'),
    bankAccountName: String(settings.bankAccountName || 'LÊ CHÍ CƯỜNG'),
    sepayBankName: String(settings.sepayBankName || 'BIDV'),
    sepayBankAccount: String(settings.sepayBankAccount || '96247031088CUONG'),
    sepayEnv: String(settings.sepayEnv || 'sandbox'),
    sepayMerchantId: String(settings.sepayMerchantId || ''),
    sepayCheckoutUrl: String(settings.sepayCheckoutUrl || ''),
    sepayOrderPrefix: String(settings.sepayOrderPrefix || 'CCP'),
    paymentTimeoutMinutes: Number(settings.paymentTimeoutMinutes || 15),
    thankYouUrl: String(settings.thankYouUrl || 'thankyou.html'),
    hasSepaySecretKey: settings.hasSepaySecretKey === true || String(settings.hasSepaySecretKey).toLowerCase() === 'true',
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

function expireSession() {
  state.token = '';
  state.user = null;
  state.items = [];
  state.originals = new Map();
    state.feedbackImages = [];
    state.packages = [];
    state.sectionsLayout = [];
    state.paymentSettings = {};
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
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
    { name: 'all', label: 'Tất cả', count: getVisibleContentItems().length },
    ...groups.map((group) => ({ name: group.name, label: group.name, count: group.count })),
    { name: 'packages-manager', label: 'Gói Tư Vấn', count: state.packages ? state.packages.length : 0 },
    { name: 'payment-settings', label: 'Thanh toán', count: state.paymentSettings?.sepayEnabled ? 'SePay' : 'QR' },
    { name: 'sections-layout-manager', label: 'Cấu trúc trang', count: state.sectionsLayout ? state.sectionsLayout.length : 0 },
    { name: 'blog-manager', label: 'Giải mã nhân số học', count: state.blogArticles ? state.blogArticles.length : 0 },
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
  } else if (state.selectedSection === 'packages-manager') {
    label = 'Gói tư vấn';
    title = 'Quản lý gói tư vấn';
    count = state.packages ? state.packages.length : 0;
    desc = `${count} gói đang được quản lý. Các gói bật sẽ tự hiển thị trong section "Gói Tư Vấn" và dropdown đặt lịch.`;
  } else if (state.selectedSection === 'payment-settings') {
    label = 'Thanh toán';
    title = 'Cấu hình thanh toán';
    count = state.paymentSettings?.sepayEnabled ? 'SePay đang bật' : 'QR thủ công';
    desc = 'Đổi tài khoản nhận tiền, bật/tắt SePay và thời gian chờ xác nhận thanh toán.';
  } else if (state.selectedSection === 'sections-layout-manager') {
    label = 'Cấu trúc trang';
    title = 'Quản lý thứ tự & khối nội dung';
    count = state.sectionsLayout ? state.sectionsLayout.length : 0;
    desc = 'Sắp xếp thứ tự các section trên trang. Bật/tắt hiển thị. Thêm khối nội dung mới.';
  } else if (state.selectedSection === 'blog-manager') {
    label = 'Blog';
    title = 'Giải mã nhân số học';
    count = state.blogArticles ? state.blogArticles.length : 0;
    desc = 'Quản lý chủ đề và bài viết thuộc chuyên mục Giải mã nhân số học.';
  } else if (state.selectedSection === 'Tra Cứu Thử') {
    label = 'Tra Cứu Thử';
    count = getMiniReportFilteredItems().length;
    title = 'Luận giải tra cứu nhanh';
    desc = 'Chọn loại chỉ số và con số để sửa đúng phần luận giải hoặc từ khóa.';
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
  if (state.selectedSection === 'packages-manager') {
    renderPackagesManager();
    return;
  }
  if (state.selectedSection === 'payment-settings') {
    renderPaymentSettings();
    return;
  }
  if (state.selectedSection === 'sections-layout-manager') {
    renderSectionsLayoutManager();
    return;
  }
  if (state.selectedSection === 'blog-manager') {
    renderBlogManager();
    return;
  }
  if (state.selectedSection === 'Tra Cứu Thử') {
    renderMiniReportManager();
    return;
  }

  const items = getFilteredItems();
  els.editorGrid.innerHTML = '';
  els.emptyState.classList.toggle('is-hidden', items.length > 0);

  items.forEach((item) => {
    const { card, initEditor } = createContentCard(item);
    els.editorGrid.appendChild(card);
    if (initEditor) initEditor();
  });
}

const MINI_REPORT_TYPE_LABELS = {
  general: 'Nội dung chung',
  life_path: 'Số chủ đạo',
  soul: 'Linh hồn',
  mission: 'Sứ mệnh',
  personal_year: 'Năm cá nhân',
};

const MINI_REPORT_TYPE_ORDER = ['life_path', 'soul', 'mission', 'personal_year', 'general'];

function renderMiniReportManager() {
  const items = getVisibleContentItems().filter((item) => item.section === 'Tra Cứu Thử');
  const types = getMiniReportTypes(items);
  const selectedType = types.includes(state.miniReportFilter.type) ? state.miniReportFilter.type : types[0] || 'general';
  state.miniReportFilter.type = selectedType;

  const numbers = getMiniReportNumbers(items, selectedType);
  if (selectedType !== 'general') {
    state.miniReportFilter.number = numbers.includes(state.miniReportFilter.number)
      ? state.miniReportFilter.number
      : numbers[0] || '1';
  }

  const filteredItems = getMiniReportFilteredItems(items);
  els.editorGrid.innerHTML = '';
  els.emptyState.classList.toggle('is-hidden', filteredItems.length > 0);

  const panel = document.createElement('section');
  panel.className = 'mini-report-admin-panel';
  panel.innerHTML = `
    <div class="mini-report-admin-filters" aria-label="Bộ lọc tra cứu thử"></div>
    <div class="mini-report-number-filter" aria-label="Chọn số luận giải"></div>
  `;

  const typeFilter = panel.querySelector('.mini-report-admin-filters');
  types.forEach((type) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `mini-report-filter-btn${type === selectedType ? ' is-active' : ''}`;
    button.textContent = MINI_REPORT_TYPE_LABELS[type] || type;
    button.addEventListener('click', () => {
      state.miniReportFilter.type = type;
      state.miniReportFilter.number = getMiniReportNumbers(items, type)[0] || '1';
      render();
    });
    typeFilter.appendChild(button);
  });

  const numberFilter = panel.querySelector('.mini-report-number-filter');
  numberFilter.hidden = selectedType === 'general';
  numbers.forEach((number) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `mini-report-number-btn${number === state.miniReportFilter.number ? ' is-active' : ''}`;
    button.textContent = formatMiniReportNumberLabel(number);
    button.addEventListener('click', () => {
      state.miniReportFilter.number = number;
      render();
    });
    numberFilter.appendChild(button);
  });

  els.editorGrid.appendChild(panel);

  filteredItems.forEach((item) => {
    const { card, initEditor } = createContentCard(item);
    els.editorGrid.appendChild(card);
    if (initEditor) initEditor();
  });
}

function getMiniReportTypes(items) {
  const types = new Set(['general']);
  items.forEach((item) => {
    const meta = parseMiniReportMeaningKey(item.key);
    if (meta) types.add(meta.type);
  });
  return MINI_REPORT_TYPE_ORDER.filter((type) => types.has(type));
}

function getMiniReportNumbers(items, type) {
  const numbers = new Set();
  items.forEach((item) => {
    const meta = parseMiniReportMeaningKey(item.key);
    if (meta?.type === type) numbers.add(meta.number);
  });
  return Array.from(numbers).sort((a, b) => Number(a) - Number(b));
}

function getMiniReportFilteredItems(sourceItems) {
  const items = sourceItems || getVisibleContentItems().filter((item) => item.section === 'Tra Cứu Thử');
  const search = state.search;
  return items.filter((item) => {
    const meta = parseMiniReportMeaningKey(item.key);
    const isGeneral = !meta;
    const filterMatch = state.miniReportFilter.type === 'general'
      ? isGeneral
      : meta?.type === state.miniReportFilter.type && meta?.number === state.miniReportFilter.number;
    if (!filterMatch) return false;
    if (!search) return true;
    return [
      item.key,
      item.description,
      item.value,
    ].join(' ').toLowerCase().includes(search);
  });
}

function parseMiniReportMeaningKey(key) {
  const match = String(key || '').match(/^mini_report\.(life_path|personal_year|soul|mission)\.(\d+)\.(text|keywords)$/);
  return match ? { type: match[1], number: match[2], field: match[3] } : null;
}

function formatMiniReportNumberLabel(number) {
  const masterLabels = { 11: '11/2', 22: '22/4', 33: '33/6' };
  return masterLabels[Number(number)] || number;
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

  const useRichText = shouldUseTextarea(item);
  let input;
  let initEditor = null;

  if (useRichText) {
    input = document.createElement('div');
    input.style.background = '#fff';
    input.style.color = '#000';
    input.style.borderRadius = '4px';
    input.style.minHeight = '150px';
  } else {
    input = document.createElement('input');
    input.type = 'text';
    input.value = item.value;
    input.setAttribute('aria-label', item.description || item.key);
    input.addEventListener('input', (event) => {
      item.value = event.target.value;
      updateSingleCardState(card, item);
    });
  }

  const actions = document.createElement('div');
  actions.className = 'card-actions package-card-actions';
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

  if (useRichText) {
    initEditor = () => {
      const quill = new Quill(input, {
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
      quill.root.innerHTML = item.value;
      quill.on('text-change', () => {
        item.value = quill.root.innerHTML;
        updateSingleCardState(card, item);
      });
    };
  }

  return { card, initEditor };
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
  const key = item.key.toLowerCase();
  const section = String(item.section || '').toLowerCase();
  const isAttributeValue = ['attr', 'attribute', 'placeholder', 'href', 'src', 'alt', 'aria-label'].includes(type);
  return (!isAttributeValue && section === 'tra cứu thử')
    || type === 'html'
    || key.includes('body')
    || key.includes('desc')
    || key.includes('content')
    || item.value.length > 90
    || item.value.includes('\n');
}

function renderStats() {
  const dirty = getDirtyItems();
  const visibleItems = getVisibleContentItems();
  els.totalCount.textContent = visibleItems.length;
  els.enabledCount.textContent = visibleItems.filter((item) => item.enabled).length;
  els.dirtyCount.textContent = dirty.length;
  els.saveAll.disabled = dirty.length === 0;
}

function buildSectionGroups() {
  const groups = new Map();
  getVisibleContentItems().forEach((item) => {
    if (!groups.has(item.section)) groups.set(item.section, { name: item.section, count: 0 });
    groups.get(item.section).count += 1;
  });
  return Array.from(groups.values());
}

function isManagedPackageContent(item) {
  const key = String(item?.key || '').trim();
  return MANAGED_PACKAGE_CONTENT_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function getVisibleContentItems() {
  return state.items.filter((item) => !isManagedPackageContent(item));
}

function getFilteredItems() {
  const search = state.search;
  return getVisibleContentItems().filter((item) => {
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
  return getVisibleContentItems().filter(isDirty);
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
  const payload = await requestApi(action, data, includeToken);
  if (!payload.ok) {
    const errorMessage = formatApiErrorMessage(action, payload);
    if (isSessionExpiredMessage(errorMessage)) {
      expireSession();
    }
    throw new Error(errorMessage);
  }
  return payload;
}

async function apiAllowFailure(action, data = {}, includeToken = true) {
  return requestApi(action, data, includeToken);
}

async function requestApi(action, data = {}, includeToken = true) {
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
  return payload;
}

function isSessionExpiredMessage(message) {
  return /dang nhap|đăng nhập|het han|hết hạn|phien|phiên/i.test(message || '');
}

function formatApiErrorMessage(action, payload) {
  const message = payload.message || 'Không thể hoàn tất thao tác.';
  const isAdminAction = [
    'loginAdmin',
    'getAdminContent',
    'saveLandingContentItem',
    'saveLandingContentBatch',
    'syncLandingContentTemplate',
    'savePackage',
    'savePaymentSettings',
    'deletePackage',
    'uploadFeedbackImage',
    'saveFeedbackImage',
    'deleteFeedbackImage',
  ].includes(action);

  if (isAdminAction && /Dang ky tu van|SHEET_NAME|sheet/i.test(message)) {
    return 'Admin đang gọi nhầm Apps Script đặt lịch. Hãy deploy file google-apps-script-landing-content.gs vào đúng Web App URL của admin.';
  }

  return message;
}

function handleSessionError(error) {
  if (isSessionExpiredMessage(error.message)) {
    toast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
    expireSession();
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
//  Packages Manager
// =============================================
function renderPackagesManager() {
  els.editorGrid.innerHTML = `
    <form class="content-card package-editor-card" id="package-form" style="grid-column: 1/-1;">
      <div class="card-top">
        <div>
          <div class="content-key">Thêm hoặc sửa gói tư vấn</div>
          <p class="content-desc">Nhập mã gói không dấu, ví dụ: big3, big7, year, couple-reading. Thứ tự nhỏ sẽ hiện trước, hoặc dùng nút lên/xuống bên dưới.</p>
        </div>
        <button type="button" class="ghost-button" id="package-normalize-order-btn"><i class="fa-solid fa-arrow-down-1-9"></i><span>Sắp lại thứ tự</span></button>
      </div>
      <div class="package-form-grid">
        <label>Mã gói<input name="code" required placeholder="vd: big3" /></label>
        <label>Tên gói<input name="name" required placeholder="Tên hiển thị trên card" /></label>
        <label>Giá online<input name="onlinePrice" required inputmode="numeric" placeholder="500000" /></label>
        <label>Giá offline<input name="offlinePrice" inputmode="numeric" placeholder="550000" /></label>
        <label>Đơn vị<input name="unit" value="/buổi" /></label>
        <label>Icon<input name="icon" placeholder="sparkles, infinity, fingerprint..." /></label>
        <label>Màu nhấn
          <select name="accent">
            <option value="orange">Cam</option>
            <option value="gold">Vàng</option>
            <option value="teal">Xanh</option>
          </select>
        </label>
        <label>Thứ tự<input name="sortOrder" inputmode="numeric" placeholder="10" /></label>
        <label class="toggle package-toggle">
          <input type="checkbox" name="enabled" checked />
          <span class="switch"></span>
          <span>Bật gói</span>
        </label>
        <label class="toggle package-toggle">
          <input type="checkbox" name="featured" />
          <span class="switch"></span>
          <span>Gói nổi bật</span>
        </label>
        <label>Badge<input name="badge" placeholder="✨ Toàn Diện Nhất ✨" /></label>
        <label>Nút CTA<input name="buttonText" value="Đặt Lịch Ngay" /></label>
        <label class="package-features-field">Quyền lợi<textarea name="features" placeholder="Mỗi dòng là một quyền lợi"></textarea></label>
      </div>
      <div class="card-actions">
        <span class="save-state" id="package-form-message"></span>
        <button type="button" class="ghost-button" id="package-reset-btn"><i class="fa-solid fa-rotate-left"></i><span>Làm mới</span></button>
        <button type="submit" class="primary-button" id="package-save-btn"><i class="fa-solid fa-floppy-disk"></i><span>Lưu gói</span></button>
      </div>
    </form>
  `;

  const form = document.getElementById('package-form');
  const resetBtn = document.getElementById('package-reset-btn');
  const normalizeOrderBtn = document.getElementById('package-normalize-order-btn');
  form.addEventListener('submit', savePackageFromForm);
  resetBtn.addEventListener('click', () => fillPackageForm());
  normalizeOrderBtn.addEventListener('click', normalizePackageOrder);

  const gallery = document.createElement('div');
  gallery.className = 'packages-admin-grid';
  gallery.style.gridColumn = '1 / -1';

  if (state.packages && state.packages.length) {
    state.packages
      .slice()
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
      .forEach((pkg, index, sortedPackages) => gallery.appendChild(createAdminPackageCard(pkg, index, sortedPackages.length)));
  } else {
    gallery.innerHTML = '<p style="grid-column: 1/-1; color: var(--text-dim);">Chưa có gói tư vấn nào.</p>';
  }

  els.editorGrid.appendChild(gallery);
  els.emptyState.classList.add('is-hidden');
}

function createAdminPackageCard(pkg, index = 0, total = 0) {
  const card = document.createElement('article');
  card.className = 'content-card admin-package-card';
  card.draggable = true;
  card.dataset.packageCode = pkg.code;
  card.addEventListener('dragstart', (event) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', pkg.code);
    card.classList.add('is-dragging');
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('is-dragging');
    document.querySelectorAll('.admin-package-card.is-drag-over').forEach((item) => item.classList.remove('is-drag-over'));
  });
  card.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    card.classList.add('is-drag-over');
  });
  card.addEventListener('dragleave', () => {
    card.classList.remove('is-drag-over');
  });
  card.addEventListener('drop', (event) => {
    event.preventDefault();
    card.classList.remove('is-drag-over');
    const fromCode = event.dataTransfer.getData('text/plain');
    if (fromCode && fromCode !== pkg.code) reorderPackageByDrag(fromCode, pkg.code);
  });

  const title = document.createElement('div');
  title.className = 'card-top';
  const info = document.createElement('div');
  info.innerHTML = '<div class="content-key"></div><p class="content-desc"></p>';
  info.querySelector('.content-key').textContent = `${pkg.code} · ${pkg.enabled ? 'Đang bật' : 'Đang tắt'}`;
  info.querySelector('.content-desc').textContent = pkg.name || '';
  const statusGroup = document.createElement('div');
  statusGroup.className = 'package-card-status';
  const dragHandle = document.createElement('button');
  dragHandle.type = 'button';
  dragHandle.className = 'package-drag-handle';
  dragHandle.innerHTML = '<i class="fa-solid fa-grip-vertical" aria-hidden="true"></i>';
  dragHandle.setAttribute('aria-label', 'Kéo để đổi thứ tự gói');
  dragHandle.title = 'Kéo để đổi thứ tự';
  const status = document.createElement('span');
  status.className = 'pill';
  status.textContent = pkg.featured ? 'Nổi bật' : `Thứ tự ${pkg.sortOrder || ''}`;
  statusGroup.append(dragHandle, status);
  title.append(info, statusGroup);

  const meta = document.createElement('div');
  meta.className = 'content-meta';
  [
    `Online ${formatMoney(pkg.onlinePrice)}`,
    `Offline ${formatMoney(pkg.offlinePrice)}`,
    pkg.accent || 'teal',
  ].forEach((text) => {
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = text;
    meta.appendChild(pill);
  });

  const features = document.createElement('ul');
  features.className = 'admin-package-features';
  (pkg.features || []).slice(0, 5).forEach((feature) => {
    const item = document.createElement('li');
    item.textContent = feature;
    features.appendChild(item);
  });

  const actions = document.createElement('div');
  actions.className = 'card-actions package-card-actions';
  const moveUpBtn = document.createElement('button');
  moveUpBtn.type = 'button';
  moveUpBtn.className = 'ghost-button package-icon-button';
  moveUpBtn.disabled = index <= 0;
  moveUpBtn.innerHTML = '<i class="fa-solid fa-arrow-up" aria-hidden="true"></i>';
  moveUpBtn.setAttribute('aria-label', 'Đưa gói lên trước');
  moveUpBtn.title = 'Lên';
  moveUpBtn.addEventListener('click', () => movePackage(pkg.code, -1));

  const moveDownBtn = document.createElement('button');
  moveDownBtn.type = 'button';
  moveDownBtn.className = 'ghost-button package-icon-button';
  moveDownBtn.disabled = index >= total - 1;
  moveDownBtn.innerHTML = '<i class="fa-solid fa-arrow-down" aria-hidden="true"></i>';
  moveDownBtn.setAttribute('aria-label', 'Đưa gói xuống sau');
  moveDownBtn.title = 'Xuống';
  moveDownBtn.addEventListener('click', () => movePackage(pkg.code, 1));

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'ghost-button';
  editBtn.innerHTML = '<i class="fa-solid fa-pen"></i><span>Sửa</span>';
  editBtn.addEventListener('click', () => fillPackageForm(pkg));

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'ghost-button package-icon-button';
  deleteBtn.style.color = 'var(--danger)';
  deleteBtn.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';
  deleteBtn.setAttribute('aria-label', 'Xóa gói');
  deleteBtn.title = 'Xóa';
  deleteBtn.addEventListener('click', () => deletePackage(pkg.code));
  actions.append(moveUpBtn, moveDownBtn, editBtn, deleteBtn);

  card.append(title, meta, features, actions);
  return card;
}

async function reorderPackageByDrag(fromCode, toCode) {
  const packages = (state.packages || [])
    .slice()
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  const fromIndex = packages.findIndex((pkg) => pkg.code === fromCode);
  const toIndex = packages.findIndex((pkg) => pkg.code === toCode);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

  const [movedPackage] = packages.splice(fromIndex, 1);
  packages.splice(toIndex, 0, movedPackage);
  packages.forEach((pkg, itemIndex) => {
    pkg.sortOrder = (itemIndex + 1) * 10;
  });

  try {
    const payload = await savePackageOrder(packages);
    state.packages = payload.packages || state.packages;
    toast('Đã kéo thả đổi thứ tự gói tư vấn.');
    render();
  } catch (error) {
    handleSessionError(error);
  }
}

async function movePackage(code, direction) {
  const packages = (state.packages || [])
    .slice()
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  const index = packages.findIndex((pkg) => pkg.code === code);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= packages.length) return;

  const current = packages[index];
  const target = packages[nextIndex];
  packages.forEach((pkg, itemIndex) => {
    pkg.sortOrder = Number(pkg.sortOrder || (itemIndex + 1) * 10);
  });
  const currentOrder = current.sortOrder;
  current.sortOrder = target.sortOrder;
  target.sortOrder = currentOrder;

  try {
    const payload = await savePackageOrder(packages);
    state.packages = payload.packages || state.packages;
    toast('Đã đổi thứ tự gói tư vấn.');
    render();
  } catch (error) {
    handleSessionError(error);
  }
}

async function normalizePackageOrder() {
  const packages = (state.packages || [])
    .slice()
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  if (!packages.length) return;

  packages.forEach((pkg, index) => {
    pkg.sortOrder = (index + 1) * 10;
  });

  try {
    const payload = await savePackageOrder(packages);
    state.packages = payload.packages || state.packages;
    toast('Đã sắp lại thứ tự gói tư vấn.');
    render();
  } catch (error) {
    handleSessionError(error);
  }
}

function savePackageOrder(packages) {
  return api('savePackageOrder', {
    token: state.token,
    order: JSON.stringify(packages.map((pkg, index) => ({
      code: pkg.code,
      sortOrder: Number(pkg.sortOrder || (index + 1) * 10),
    }))),
  });
}

function savePackageSilently(pkg) {
  return api('savePackage', {
    token: state.token,
    code: pkg.code,
    name: pkg.name,
    onlinePrice: pkg.onlinePrice,
    offlinePrice: pkg.offlinePrice,
    unit: pkg.unit,
    icon: pkg.icon,
    accent: pkg.accent,
    sortOrder: pkg.sortOrder,
    enabled: pkg.enabled ? 'true' : 'false',
    featured: pkg.featured ? 'true' : 'false',
    badge: pkg.badge || '',
    buttonText: pkg.buttonText || 'Đặt Lịch Ngay',
    features: Array.isArray(pkg.features) ? pkg.features.join('\n') : '',
  });
}

function fillPackageForm(pkg = {}) {
  const form = document.getElementById('package-form');
  if (!form) return;
  const fields = form.elements;
  fields.code.value = pkg.code || '';
  fields.name.value = pkg.name || '';
  fields.onlinePrice.value = pkg.onlinePrice || '';
  fields.offlinePrice.value = pkg.offlinePrice || '';
  fields.unit.value = pkg.unit || '/buổi';
  fields.icon.value = pkg.icon || 'sparkles';
  fields.accent.value = pkg.accent || 'teal';
  fields.sortOrder.value = pkg.sortOrder || '';
  fields.enabled.checked = pkg.enabled !== false;
  fields.featured.checked = pkg.featured === true;
  fields.badge.value = pkg.badge || '';
  fields.buttonText.value = pkg.buttonText || 'Đặt Lịch Ngay';
  fields.features.value = Array.isArray(pkg.features) ? pkg.features.join('\n') : '';
  document.getElementById('package-form-message').textContent = pkg.code ? `Đang sửa gói ${pkg.code}` : '';
  form.code.focus();
}

async function savePackageFromForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = document.getElementById('package-save-btn');
  const message = document.getElementById('package-form-message');
  setBusy(button, true);
  message.textContent = 'Đang lưu gói...';

  try {
    const fields = form.elements;
    const payload = await api('savePackage', {
      token: state.token,
      code: fields.code.value,
      name: fields.name.value,
      onlinePrice: fields.onlinePrice.value,
      offlinePrice: fields.offlinePrice.value,
      unit: fields.unit.value,
      icon: fields.icon.value,
      accent: fields.accent.value,
      sortOrder: fields.sortOrder.value,
      enabled: fields.enabled.checked ? 'true' : 'false',
      featured: fields.featured.checked ? 'true' : 'false',
      badge: fields.badge.value,
      buttonText: fields.buttonText.value,
      features: fields.features.value,
    });
    state.packages = payload.packages || state.packages;
    toast('Đã lưu gói tư vấn.');
    fillPackageForm();
    render();
  } catch (error) {
    message.textContent = error.message;
    message.style.color = 'var(--danger)';
  } finally {
    setBusy(button, false);
  }
}

async function deletePackage(code) {
  if (!confirm(`Xóa gói ${code}?`)) return;
  try {
    const payload = await api('deletePackage', { token: state.token, code });
    state.packages = payload.packages || state.packages;
    toast('Đã xóa gói tư vấn.');
    render();
  } catch (error) {
    handleSessionError(error);
  }
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('vi-VN') + 'đ';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =============================================
//  Payment Settings
// =============================================
function renderPaymentSettings() {
  const settings = normalizePaymentSettings(state.paymentSettings);
  els.editorGrid.innerHTML = `
    <form class="content-card package-editor-card" id="payment-settings-form" style="grid-column:1/-1;">
      <div class="card-top">
        <div>
          <div class="content-key">payment.settings</div>
          <h3>Thanh toán & SePay</h3>
        </div>
        <label class="toggle-row">
          <input type="checkbox" name="sepayEnabled" ${settings.sepayEnabled ? 'checked' : ''} ${state.user.role !== 'admin' ? 'disabled' : ''} />
          <span>Bật SePay</span>
        </label>
      </div>
      <div class="package-form-grid">
        <div class="payment-section-title" style="grid-column: 1/-1; margin-top: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: 500; font-size: 1.1rem; color: var(--accent-color);">
          1. Thanh toán thủ công (VietQR)
        </div>
        <label>Ngân hàng
          <input name="bankName" value="${escapeHtml(settings.bankName)}" required ${state.user.role !== 'admin' ? 'disabled' : ''} />
        </label>
        <label>Mã BIN VietQR
          <input name="bankBin" value="${escapeHtml(settings.bankBin)}" inputmode="numeric" required ${state.user.role !== 'admin' ? 'disabled' : ''} />
        </label>
        <label>Số tài khoản
          <input name="bankAccount" value="${escapeHtml(settings.bankAccount)}" inputmode="numeric" required ${state.user.role !== 'admin' ? 'disabled' : ''} />
        </label>
        <label>Chủ tài khoản
          <input name="bankAccountName" value="${escapeHtml(settings.bankAccountName)}" required ${state.user.role !== 'admin' ? 'disabled' : ''} />
        </label>

        <div class="payment-section-title" style="grid-column: 1/-1; margin-top: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: 500; font-size: 1.1rem; color: var(--accent-color);">
          2. Thanh toán tự động (SePay)
        </div>
        <label>Ngân hàng SePay (Tên rút gọn)
          <input name="sepayBankName" value="${escapeHtml(settings.sepayBankName || '')}" placeholder="Ví dụ: BIDV, VCB..." ${state.user.role !== 'admin' ? 'disabled' : ''} />
        </label>
        <label>Số tài khoản SePay
          <input name="sepayBankAccount" value="${escapeHtml(settings.sepayBankAccount || '')}" placeholder="Ví dụ: 96247031088CUONG" ${state.user.role !== 'admin' ? 'disabled' : ''} />
        </label>
        <label>Môi trường SePay
          <select name="sepayEnv" ${state.user.role !== 'admin' ? 'disabled' : ''}>
            <option value="sandbox" ${settings.sepayEnv === 'sandbox' ? 'selected' : ''}>Sandbox</option>
            <option value="production" ${settings.sepayEnv === 'production' ? 'selected' : ''}>Production</option>
          </select>
        </label>
        <label>Merchant ID
          <input name="sepayMerchantId" value="${escapeHtml(settings.sepayMerchantId)}" placeholder="Nhập Merchant ID SePay" ${state.user.role !== 'admin' ? 'disabled' : ''} />
        </label>
        <label>Secret Key
          <input name="sepaySecretKey" type="password" value="" placeholder="${settings.hasSepaySecretKey ? 'Đã lưu key trên server - để trống nếu không đổi' : 'Dán Secret Key SePay để lưu server-side'}" autocomplete="new-password" ${state.user.role !== 'admin' ? 'disabled' : ''} />
        </label>
        <label>Checkout URL tùy chọn
          <input name="sepayCheckoutUrl" value="${escapeHtml(settings.sepayCheckoutUrl)}" placeholder="Có thể để trống nếu dùng QR chờ thanh toán" ${state.user.role !== 'admin' ? 'disabled' : ''} />
        </label>
        <label>Tiền tố mã đơn
          <input name="sepayOrderPrefix" value="${escapeHtml(settings.sepayOrderPrefix)}" ${state.user.role !== 'admin' ? 'disabled' : ''} />
        </label>
        <label>Thời gian chờ (phút)
          <input name="paymentTimeoutMinutes" type="number" min="1" max="60" value="${settings.paymentTimeoutMinutes}" required ${state.user.role !== 'admin' ? 'disabled' : ''} />
        </label>
        <label>Trang cảm ơn
          <input name="thankYouUrl" value="${escapeHtml(settings.thankYouUrl)}" required ${state.user.role !== 'admin' ? 'disabled' : ''} />
        </label>
      </div>
      <p class="content-description">
        Khi tắt SePay, trang dùng flow hiện tại: khách quét QR rồi tự bấm xác nhận. Khi bật SePay, trang hiển thị QR có đếm ngược và chờ webhook/payment log xác nhận đã thanh toán.
        Secret Key chỉ được lưu trong Apps Script Properties và không trả ra landing page.
      </p>
      ${settings.hasSepaySecretKey ? `
        <label class="toggle-row payment-secret-clear">
          <input type="checkbox" name="clearSepaySecretKey" ${state.user.role !== 'admin' ? 'disabled' : ''} />
          <span>Xóa Secret Key SePay đang lưu</span>
        </label>
      ` : ''}
      <footer class="package-form-actions">
        <span class="save-state" id="payment-settings-message">${state.user.role !== 'admin' ? 'Chỉ admin được đổi cấu hình thanh toán.' : ''}</span>
        <button class="primary-button" type="submit" id="payment-settings-save-btn" ${state.user.role !== 'admin' ? 'disabled' : ''}>
          <i class="fa-solid fa-floppy-disk"></i>
          <span>Lưu thanh toán</span>
        </button>
      </footer>
    </form>
  `;

  els.emptyState.classList.add('is-hidden');
  document.getElementById('payment-settings-form')?.addEventListener('submit', savePaymentSettings);
}

async function savePaymentSettings(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = document.getElementById('payment-settings-save-btn');
  const message = document.getElementById('payment-settings-message');
  setBusy(button, true);
  message.textContent = 'Đang lưu cấu hình thanh toán...';
  message.style.color = '';

  try {
    const fields = form.elements;
    const payload = await api('savePaymentSettings', {
      token: state.token,
      sepayEnabled: fields.sepayEnabled.checked ? 'true' : 'false',
      bankName: fields.bankName.value,
      bankBin: fields.bankBin.value,
      bankAccount: fields.bankAccount.value,
      bankAccountName: fields.bankAccountName.value,
      sepayBankName: fields.sepayBankName.value,
      sepayBankAccount: fields.sepayBankAccount.value,
      sepayEnv: fields.sepayEnv.value,
      sepayMerchantId: fields.sepayMerchantId.value,
      sepaySecretKey: fields.sepaySecretKey.value,
      clearSepaySecretKey: fields.clearSepaySecretKey?.checked ? 'true' : 'false',
      sepayCheckoutUrl: fields.sepayCheckoutUrl.value,
      sepayOrderPrefix: fields.sepayOrderPrefix.value,
      paymentTimeoutMinutes: fields.paymentTimeoutMinutes.value,
      thankYouUrl: fields.thankYouUrl.value,
    });
    state.paymentSettings = normalizePaymentSettings(payload.paymentSettings);
    toast('Đã lưu cấu hình thanh toán.');
    render();
  } catch (error) {
    message.textContent = error.message;
    message.style.color = 'var(--danger)';
  } finally {
    setBusy(button, false);
  }
}

// =============================================
//  Feedback Images Upload
// =============================================
function renderFeedbackImages() {
  // Auto-cleanup blog thumbnails mistakenly added to feedback images
  setTimeout(async () => {
    if (!state.feedbackImages || !state.blogArticles || window.__cleanedUpFeedbackImages) return;
    window.__cleanedUpFeedbackImages = true;
    const blogThumbnails = state.blogArticles.map(a => a.thumbnail).filter(Boolean);
    const overlaps = state.feedbackImages.filter(img => blogThumbnails.includes(img.url));
    if (overlaps.length > 0) {
      console.log('Cleaning up', overlaps.length, 'overlapping images');
      for (let img of overlaps) {
        try { await api('deleteFeedbackImage', { token: state.token, fileId: img.fileId }); } catch(e) {}
      }
      toast('Đã dọn dẹp các ảnh bị trùng lặp!');
      loadContent(true); // reload the UI
    }
  }, 1000);

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
    msg.textContent = 'Đang nén và tải ảnh lên... Vui lòng đợi nhé!';
    msg.style.color = 'var(--text-dim)';
    
    try {
      const base64 = await resizeAndCompressImage(file);
      const cleanBase64 = base64.split('base64,')[1];
      
      const payload = await api('uploadFeedbackImage', {
        token: state.token,
        filename: file.name,
        imageBase64: cleanBase64
      });
      
      toast(payload.message || 'Tải ảnh lên thành công!');
      input.value = '';
      btn.disabled = true;
      msg.textContent = '';
      state.feedbackPage = 1;
      if (payload.feedbackImages) state.feedbackImages = payload.feedbackImages;
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
  
  const feedbackImages = state.feedbackImages || [];
  const totalPages = Math.max(1, Math.ceil(feedbackImages.length / FEEDBACK_IMAGES_PER_PAGE));
  state.feedbackPage = Math.min(Math.max(1, state.feedbackPage || 1), totalPages);
  const pageStart = (state.feedbackPage - 1) * FEEDBACK_IMAGES_PER_PAGE;
  const pageImages = feedbackImages.slice(pageStart, pageStart + FEEDBACK_IMAGES_PER_PAGE);

  if (feedbackImages.length) {
    pageImages.forEach(img => {
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
          const payload = await api('deleteFeedbackImage', { token: state.token, fileId: img.fileId });
          if (payload.feedbackImages) state.feedbackImages = payload.feedbackImages;
          state.feedbackPage = Math.min(state.feedbackPage, Math.max(1, Math.ceil((state.feedbackImages || []).length / FEEDBACK_IMAGES_PER_PAGE)));
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

  if (feedbackImages.length > FEEDBACK_IMAGES_PER_PAGE) {
    const pager = document.createElement('nav');
    pager.className = 'feedback-pagination';
    pager.setAttribute('aria-label', 'Phân trang ảnh feedback');
    pager.innerHTML = `
      <button type="button" class="ghost-button" ${state.feedbackPage === 1 ? 'disabled' : ''}>
        <i class="fa-solid fa-chevron-left"></i>
        <span>Trước</span>
      </button>
      <span>Trang ${state.feedbackPage} / ${totalPages}</span>
      <button type="button" class="ghost-button" ${state.feedbackPage === totalPages ? 'disabled' : ''}>
        <span>Sau</span>
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    `;
    const [prevBtn, nextBtn] = pager.querySelectorAll('button');
    prevBtn.addEventListener('click', () => {
      state.feedbackPage = Math.max(1, state.feedbackPage - 1);
      render();
    });
    nextBtn.addEventListener('click', () => {
      state.feedbackPage = Math.min(totalPages, state.feedbackPage + 1);
      render();
    });
    els.editorGrid.appendChild(pager);
  }

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

// =============================================
//  Sections Layout Manager
// =============================================
function renderSectionsLayoutManager() {
  els.editorGrid.innerHTML = '';
  els.emptyState.classList.add('is-hidden');

  const container = document.createElement('div');
  container.className = 'manager-container';
  container.innerHTML = `
    <div class="manager-header">
      <p>Kéo thả (hoặc dùng nút mũi tên) để sắp xếp thứ tự. Khối 'generic' có thể xóa và chỉnh sửa nội dung.</p>
      <button class="primary-button" id="btn-add-generic-section" ${state.user.role !== 'admin' ? 'disabled' : ''}>
        <i class="fa-solid fa-plus"></i> Thêm Khối Nội Dung
      </button>
    </div>
    <div class="sections-layout-list">
      ${state.sectionsLayout.map((sec, index) => `
        <div class="section-layout-item" data-id="${sec.id}" data-type="${sec.type}">
          <div class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></div>
          <div class="section-layout-info">
            <strong>${escapeHtml(sec.name || sec.id)}</strong>
            <span class="badge badge-${sec.type === 'builtin' ? 'neutral' : 'success'}">${sec.type === 'builtin' ? 'Mặc định' : 'Tự tạo'}</span>
            ${sec.type === 'generic' ? `<div class="generic-title-preview">${escapeHtml(sec.title || '')}</div>` : ''}
          </div>
          <div class="section-layout-actions">
            <button class="icon-button btn-move-up" ${index === 0 || state.user.role !== 'admin' ? 'disabled' : ''} title="Lên"><i class="fa-solid fa-arrow-up"></i></button>
            <button class="icon-button btn-move-down" ${index === state.sectionsLayout.length - 1 || state.user.role !== 'admin' ? 'disabled' : ''} title="Xuống"><i class="fa-solid fa-arrow-down"></i></button>
            
            <label class="toggle" title="Bật/tắt hiển thị">
              <input type="checkbox" class="toggle-section-visible" ${sec.enabled ? 'checked' : ''} ${state.user.role !== 'admin' ? 'disabled' : ''}>
              <span class="switch"></span>
            </label>
            
            ${sec.type === 'generic' ? `
              <button class="icon-button btn-edit-generic" title="Sửa nội dung" ${state.user.role !== 'admin' ? 'disabled' : ''}><i class="fa-solid fa-pen"></i></button>
              <button class="icon-button btn-delete-generic" title="Xóa" ${state.user.role !== 'admin' ? 'disabled' : ''}><i class="fa-solid fa-trash"></i></button>
            ` : `<div style="width: 72px;"></div>`}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="manager-footer" style="margin-top: 20px; text-align: right;">
      <button class="primary-button" id="btn-save-sections-layout" ${state.user.role !== 'admin' ? 'disabled' : ''}>
        <i class="fa-solid fa-save"></i> Lưu Thứ Tự & Trạng Thái
      </button>
    </div>
  `;

  els.editorGrid.appendChild(container);

  const btnSave = container.querySelector('#btn-save-sections-layout');
  btnSave.addEventListener('click', async () => {
    setBusy(btnSave, true);
    try {
      const items = Array.from(container.querySelectorAll('.section-layout-item'));
      const updates = items.map((el, i) => ({
        id: el.dataset.id,
        order: i + 1,
        enabled: el.querySelector('.toggle-section-visible').checked
      }));
      
      const res = await api('saveSectionsLayoutOrder', {
        token: state.token,
        updates: JSON.stringify(updates)
      });
      state.sectionsLayout = res.sectionsLayout;
      toast('Đã lưu cấu trúc trang.');
      renderSectionsLayoutManager();
    } catch(e) {
      toast(e.message, 'error');
    } finally {
      setBusy(btnSave, false);
    }
  });

  const listContainer = container.querySelector('.sections-layout-list');
  
  // Nút Lên/Xuống
  listContainer.addEventListener('click', (e) => {
    const btnUp = e.target.closest('.btn-move-up');
    const btnDown = e.target.closest('.btn-move-down');
    if (btnUp || btnDown) {
      const item = (btnUp || btnDown).closest('.section-layout-item');
      if (btnUp && item.previousElementSibling) {
        listContainer.insertBefore(item, item.previousElementSibling);
      } else if (btnDown && item.nextElementSibling) {
        listContainer.insertBefore(item.nextElementSibling, item);
      }
      updateMoveButtons(listContainer);
    }
    
    const btnEdit = e.target.closest('.btn-edit-generic');
    if (btnEdit) {
      const id = btnEdit.closest('.section-layout-item').dataset.id;
      const sec = state.sectionsLayout.find(s => s.id === id);
      if (sec) openGenericSectionModal(sec);
    }
    
    const btnDelete = e.target.closest('.btn-delete-generic');
    if (btnDelete) {
      const id = btnDelete.closest('.section-layout-item').dataset.id;
      if (confirm('Bạn có chắc chắn muốn xóa khối nội dung này?')) {
        deleteGenericSection(id);
      }
    }
  });
  
  container.querySelector('#btn-add-generic-section').addEventListener('click', () => {
    openGenericSectionModal();
  });
}

function updateMoveButtons(listContainer) {
  const items = Array.from(listContainer.querySelectorAll('.section-layout-item'));
  items.forEach((item, index) => {
    const btnUp = item.querySelector('.btn-move-up');
    const btnDown = item.querySelector('.btn-move-down');
    if (btnUp) btnUp.disabled = index === 0;
    if (btnDown) btnDown.disabled = index === items.length - 1;
  });
}

async function deleteGenericSection(id) {
  try {
    const res = await api('deleteSection', { token: state.token, id });
    state.sectionsLayout = res.sectionsLayout;
    toast('Đã xóa khối nội dung.');
    renderSectionsLayoutManager();
  } catch(e) {
    toast(e.message, 'error');
  }
}

function openGenericSectionModal(sec = null) {
  let modal = document.getElementById('generic-section-modal');
  if (!modal) {
    modal = document.createElement('dialog');
    modal.className = 'modal';
    modal.id = 'generic-section-modal';
    modal.innerHTML = `
      <form method="dialog" class="modal-panel">
        <header>
          <div>
            <p class="eyebrow">Cấu trúc trang</p>
            <h2 id="generic-modal-title">Thêm Khối Nội Dung</h2>
          </div>
          <button class="icon-button" type="button" onclick="this.closest('dialog').close()" aria-label="Đóng">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
          <input type="hidden" id="generic-sec-id" value="">
          <div>
            <label for="generic-sec-name">Tên hiển thị (Admin)</label>
            <input type="text" id="generic-sec-name" required placeholder="Ví dụ: Giới thiệu khóa học...">
          </div>
          <div>
            <label for="generic-sec-tag">Thẻ phụ (Chữ màu cam nhỏ)</label>
            <input type="text" id="generic-sec-tag" placeholder="Ví dụ: BẠN ĐANG GẶP PHẢI?">
          </div>
          <div>
            <label for="generic-sec-title">Tiêu đề chính (Hiển thị trên web)</label>
            <input type="text" id="generic-sec-title" placeholder="Tiêu đề chính của khối...">
          </div>
          <div>
            <label>Nội dung chi tiết</label>
            <div id="generic-sec-editor" style="height: 250px; background: #fff; color: #000; border-radius: 4px;"></div>
          </div>
          <div>
            <label class="toggle" style="display:inline-flex; align-items:center; gap:8px;">
              <input type="checkbox" id="generic-sec-enabled" checked>
              <span class="switch"></span>
              <span> Bật hiển thị khối này</span>
            </label>
          </div>
        </div>
        <footer>
          <button class="ghost-button" type="button" onclick="this.closest('dialog').close()">Hủy</button>
          <button class="primary-button" type="submit" id="btn-save-generic">
            <i class="fa-solid fa-check"></i> Lưu Khối
          </button>
        </footer>
      </form>
    `;
    document.body.appendChild(modal);
    
    // Initialize Quill
    window.genericQuill = new Quill('#generic-sec-editor', {
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
      const btn = modal.querySelector('#btn-save-generic');
      setBusy(btn, true);
      try {
        const payload = {
          action: 'saveGenericSection',
          token: state.token,
          id: modal.querySelector('#generic-sec-id').value,
          name: modal.querySelector('#generic-sec-name').value,
          tag: modal.querySelector('#generic-sec-tag').value,
          title: modal.querySelector('#generic-sec-title').value,
          contentHtml: window.genericQuill.root.innerHTML,
          enabled: modal.querySelector('#generic-sec-enabled').checked ? 'true' : 'false'
        };
        const res = await api('saveGenericSection', payload);
        state.sectionsLayout = res.sectionsLayout;
        toast('Đã lưu khối nội dung.');
        modal.close();
        if (state.selectedSection === 'sections-layout-manager') renderSectionsLayoutManager();
      } catch(error) {
        toast(error.message, 'error');
      } finally {
        setBusy(btn, false);
      }
    });
  }
  
  modal.querySelector('#generic-modal-title').textContent = sec ? 'Sửa Khối Nội Dung' : 'Thêm Khối Nội Dung';
  modal.querySelector('#generic-sec-id').value = sec ? sec.id : '';
  modal.querySelector('#generic-sec-name').value = sec ? sec.name : '';
  modal.querySelector('#generic-sec-tag').value = sec && sec.tag ? sec.tag : '';
  modal.querySelector('#generic-sec-title').value = sec ? sec.title : '';
  if (window.genericQuill) {
    window.genericQuill.root.innerHTML = sec ? (window.DOMPurify ? window.DOMPurify.sanitize(sec.contentHtml) : sec.contentHtml) : '';
  }
  modal.querySelector('#generic-sec-enabled').checked = sec ? sec.enabled : true;
  
  openModal(modal);
}
