const BrowserApp = {
  settings: {},
  currentTabId: null,
  tabs: new Map(),
  tabCounter: 0,
  activeFullPage: null,

  async init() {
    this.settings = { theme: AI_CONFIG.theme };
    this.applyTheme();
    this.setupWindowControls();
    this.setupSettings();
    this.setupSuggestions();
    this.loadAdPanels();
    TabManager.init();
    SearchBar.init();
    AIResultsPage.init();
    this.setupBookmarks();
    this.createTab();
  },

  loadAdPanels() {
    document.getElementById('ai-ad-left').innerHTML = AD_CONFIG.leftAd;
    document.getElementById('ai-ad-right').innerHTML = AD_CONFIG.rightAd;
  },

  applyTheme() {
    document.body.classList.toggle('dark', this.settings.theme === 'dark');
  },

  setupWindowControls() {
    document.getElementById('minimize-btn').onclick = () => window.electronAPI.minimizeWindow();
    document.getElementById('maximize-btn').onclick = () => window.electronAPI.maximizeWindow();
    document.getElementById('close-btn').onclick = () => window.electronAPI.closeWindow();
    document.getElementById('settings-btn').onclick = () => this.toggleSettings();
    document.getElementById('history-btn').onclick = () => this.openHistoryPage();
    document.getElementById('bookmarks-btn').onclick = () => this.openBookmarksPage();
  },

  setupSettings() {
    document.getElementById('settings-close-btn').onclick = () => this.toggleSettings();
    document.getElementById('settings-overlay').onclick = () => this.toggleSettings();
    document.getElementById('settings-save-btn').onclick = () => this.saveSettings();
  },

  setupSuggestions() {
    document.querySelectorAll('.suggestion').forEach(el => {
      el.onclick = () => SearchBar.doSearch(el.dataset.query);
    });
    const emptyInput = document.getElementById('empty-search-input');
    const emptyBtn = document.getElementById('empty-search-btn');
    if (emptyInput) {
      emptyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.handleEmptySearch(emptyInput.value);
      });
    }
    if (emptyBtn) {
      emptyBtn.onclick = () => this.handleEmptySearch(emptyInput.value);
    }
  },

  handleEmptySearch(value) {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (SearchBar.looksLikeUrl(trimmed)) {
      this.navigateTo(trimmed);
    } else {
      SearchBar.doSearch(trimmed);
    }
  },

  setupBookmarks() {
    document.getElementById('bookmark-btn').onclick = () => this.toggleBookmark();
    document.getElementById('history-search').addEventListener('input', (e) => this.loadHistoryPage(e.target.value));
    document.getElementById('bookmarks-search').addEventListener('input', (e) => this.loadBookmarksPage(e.target.value));
    document.getElementById('clear-history-btn').onclick = () => this.clearHistory();
  },

  escapeAttr(str) { return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;'); },
  escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; },
  getHostname(url) { try { return new URL(url).hostname; } catch { return url; } },

  groupByDate(entries) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const week = today - 7 * 86400000;
    const month = today - 30 * 86400000;
    const buckets = { 'Today': [], 'Yesterday': [], 'Last 7 Days': [], 'Last 30 Days': [], 'Older': [] };
    for (const e of entries) {
      const t = e.timestamp || 0;
      if (t >= today) buckets['Today'].push(e);
      else if (t >= yesterday) buckets['Yesterday'].push(e);
      else if (t >= week) buckets['Last 7 Days'].push(e);
      else if (t >= month) buckets['Last 30 Days'].push(e);
      else buckets['Older'].push(e);
    }
    const groups = [];
    for (const label of ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Older']) {
      if (buckets[label].length > 0) groups.push({ label, items: buckets[label] });
    }
    return groups;
  },

  renderListItems(entries, type) {
    const groups = this.groupByDate(entries);
    let html = '';
    for (const group of groups) {
      html += `<div class="fp-date-label">${group.label}</div>`;
      for (const e of group.items) {
        const displayTitle = e.title && e.title !== e.url ? e.title : e.url;
        const hostname = this.getHostname(e.url);
        const d = new Date(e.timestamp);
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        html += `<div class="fp-item" data-url="${this.escapeAttr(e.url)}">
          <div class="fp-item-icon">🌐</div>
          <div class="fp-item-info">
            <div class="fp-item-title">${this.escapeHtml(displayTitle)}</div>
            <div class="fp-item-meta">${this.escapeHtml(hostname)} · ${timeStr}</div>
          </div>
          ${type === 'bookmark' ? `<button class="fp-item-remove" data-url="${this.escapeAttr(e.url)}" title="Remove">✕</button>` : ''}
        </div>`;
      }
    }
    return html;
  },

  // Full pages
  openHistoryPage() {
    this.showFullPage('history-page');
    document.getElementById('history-search').value = '';
    document.getElementById('history-search').focus();
    this.loadHistoryPage();
  },

  openBookmarksPage() {
    this.showFullPage('bookmarks-page');
    document.getElementById('bookmarks-search').value = '';
    document.getElementById('bookmarks-search').focus();
    this.loadBookmarksPage();
  },

  showFullPage(pageId) {
    this.activeFullPage = pageId;
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('ai-results-page').classList.add('hidden');
    document.getElementById('webview-container').style.display = 'none';
    document.querySelectorAll('.full-page').forEach(el => el.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
  },

  closeFullPage() {
    this.activeFullPage = null;
    document.querySelectorAll('.full-page').forEach(el => el.classList.add('hidden'));
    document.getElementById('webview-container').style.display = '';
    const tab = this.getCurrentTab();
    if (tab && tab.viewReady && tab.webview) {
      this.showWebview();
    } else {
      this.showEmptyState();
    }
  },

  async loadHistoryPage(filter) {
    const list = document.getElementById('history-list');
    const entries = await window.electronAPI.getHistory();
    const search = (filter || '').toLowerCase().trim();
    const filtered = search ? entries.filter(e =>
      (e.title || '').toLowerCase().includes(search) || (e.url || '').toLowerCase().includes(search)
    ) : entries;

    if (!filtered || filtered.length === 0) {
      list.innerHTML = `<div class="fp-empty">${search ? 'No matching history' : 'No history yet'}</div>`;
      return;
    }
    list.innerHTML = this.renderListItems(filtered, 'history');
    list.querySelectorAll('.fp-item').forEach(el => {
      el.onclick = () => BrowserApp.createTab(el.dataset.url);
    });
  },

  async loadBookmarksPage(filter) {
    const list = document.getElementById('bookmarks-list');
    const entries = await window.electronAPI.getBookmarks();
    const search = (filter || '').toLowerCase().trim();
    const filtered = search ? entries.filter(e =>
      (e.title || '').toLowerCase().includes(search) || (e.url || '').toLowerCase().includes(search)
    ) : entries;

    if (!filtered || filtered.length === 0) {
      list.innerHTML = `<div class="fp-empty">${search ? 'No matching bookmarks' : 'No bookmarks yet'}</div>`;
      return;
    }
    list.innerHTML = this.renderListItems(filtered, 'bookmark');
    list.querySelectorAll('.fp-item').forEach(el => {
      el.onclick = (ev) => {
        if (ev.target.classList.contains('fp-item-remove')) return;
        BrowserApp.createTab(el.dataset.url);
      };
    });
    list.querySelectorAll('.fp-item-remove').forEach(el => {
      el.onclick = async (ev) => {
        ev.stopPropagation();
        await window.electronAPI.removeBookmark(el.dataset.url);
        BrowserApp.loadBookmarksPage(document.getElementById('bookmarks-search').value);
        BrowserApp.updateBookmarkButton();
      };
    });
  },

  async clearHistory() {
    await window.electronAPI.clearHistory();
    this.loadHistoryPage();
  },

  // Bookmark toggle
  async toggleBookmark() {
    const tab = this.getCurrentTab();
    if (!tab || !tab.url || tab.url === 'about:blank' || tab.url.startsWith('chrome-')) return;
    const bookmarked = await window.electronAPI.isBookmarked(tab.url);
    if (bookmarked) {
      await window.electronAPI.removeBookmark(tab.url);
    } else {
      await window.electronAPI.addBookmark({ url: tab.url, title: tab.title || tab.url });
    }
    this.updateBookmarkButton();
  },

  async updateBookmarkButton() {
    const tab = this.getCurrentTab();
    const btn = document.getElementById('bookmark-btn');
    if (!tab || !tab.url || tab.url === 'about:blank' || tab.url.startsWith('chrome-')) {
      btn.textContent = '☆';
      btn.classList.remove('bookmarked');
      return;
    }
    const bookmarked = await window.electronAPI.isBookmarked(tab.url);
    btn.textContent = bookmarked ? '★' : '☆';
    btn.classList.toggle('bookmarked', bookmarked);
  },

  // Settings
  toggleSettings() {
    const modal = document.getElementById('settings-modal');
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
      document.getElementById('theme-select').value = this.settings.theme || 'light';
    }
  },

  async saveSettings() {
    this.settings.theme = document.getElementById('theme-select').value;
    await window.electronAPI.saveSettings(this.settings);
    this.applyTheme();
    this.toggleSettings();
  },

  // History tracking
  async trackHistory(url, title) {
    if (!url || url === 'about:blank' || url.startsWith('chrome-')) return;
    await window.electronAPI.addHistory({ url, title: title || url });
  },

  // Tabs
  createTab(url) {
    const tabId = 'tab-' + (++this.tabCounter);
    const tab = { id: tabId, title: 'New Tab', url: url || '', viewReady: false, element: null, webview: null, showingAI: false };
    this.tabs.set(tabId, tab);
    TabManager.createTabElement(tab);
    this.activateTab(tabId);
    if (url) this.navigateTo(url);
    return tabId;
  },

  activateTab(tabId) {
    if (this.currentTabId) {
      const prev = this.tabs.get(this.currentTabId);
      if (prev) {
        prev.element.classList.remove('active');
        if (prev.webview) prev.webview.classList.add('hidden');
        prev.showingAI = !document.getElementById('ai-results-page').classList.contains('hidden');
      }
    }
    this.currentTabId = tabId;
    const tab = this.tabs.get(tabId);
    tab.element.classList.add('active');
    this.positionPlusButton();
    if (tab.viewReady && tab.webview) {
      tab.webview.classList.remove('hidden');
      if (tab.showingAI) {
        this.showAIResults();
      } else {
        this.showWebview();
      }
    } else if (tab.showingAI) {
      this.showAIResults();
    } else {
      this.showEmptyState();
      this.hideAIResults();
    }
    this.updateNavState();
    this.updateBookmarkButton();
  },

  positionPlusButton() {
    const plusBtn = document.getElementById('new-tab-btn');
    const tabBar = document.getElementById('tab-bar');
    if (tabBar && plusBtn) {
      tabBar.appendChild(plusBtn);
    }
  },

  closeTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    const ids = Array.from(this.tabs.keys());
    if (ids.length <= 1) this.createTab();
    tab.element.remove();
    if (tab.webview) tab.webview.remove();
    this.tabs.delete(tabId);
    if (tabId === this.currentTabId) this.activateTab(Array.from(this.tabs.keys()).pop());
  },

  getCurrentTab() { return this.tabs.get(this.currentTabId); },

  navigateTo(url) {
    const tab = this.getCurrentTab();
    if (!tab) return;
    const full = url.match(/^https?:\/\//i) ? url : 'https://' + url;
    tab.url = full;
    this.closeFullPage();
    this.hideAIResults();
    this.hideEmptyState();
    this.showWebview();
    if (!tab.viewReady) {
      tab.viewReady = true;
      TabManager.createWebview(tab, full);
    } else if (tab.webview) {
      tab.webview.src = full;
    }
    this.updateBookmarkButton();
  },

  updateNavState() {
    const tab = this.getCurrentTab();
    const b = document.getElementById('back-btn');
    const f = document.getElementById('forward-btn');
    if (!tab || !tab.viewReady || !tab.webview) { b.style.opacity = '0.3'; f.style.opacity = '0.3'; return; }
    b.style.opacity = tab.webview.canGoBack() ? '1' : '0.3';
    f.style.opacity = tab.webview.canGoForward() ? '1' : '0.3';
  },

  showWebview() {
    document.getElementById('ai-results-page').classList.add('hidden');
    document.getElementById('empty-state').style.display = 'none';
    document.querySelectorAll('.full-page').forEach(el => el.classList.add('hidden'));
    document.getElementById('webview-container').style.display = '';
  },
  hideEmptyState() { document.getElementById('empty-state').style.display = 'none'; },
  showEmptyState() {
    document.getElementById('empty-state').style.display = 'flex';
    document.getElementById('ai-results-page').classList.add('hidden');
    document.querySelectorAll('.full-page').forEach(el => el.classList.add('hidden'));
    document.getElementById('webview-container').style.display = 'none';
    const input = document.getElementById('empty-search-input');
    if (input) { input.value = ''; input.focus(); }
  },
  showAIResults() {
    document.getElementById('ai-results-page').classList.remove('hidden');
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('webview-container').style.display = 'none';
    const tab = this.getCurrentTab();
    if (tab) tab.showingAI = true;
  },
  hideAIResults() {
    document.getElementById('ai-results-page').classList.add('hidden');
    const tab = this.getCurrentTab();
    if (tab) tab.showingAI = false;
  }
};

document.addEventListener('DOMContentLoaded', () => BrowserApp.init());

document.getElementById('back-btn').onclick = () => {
  const tab = BrowserApp.getCurrentTab();
  if (tab && tab.webview && tab.webview.canGoBack()) tab.webview.goBack();
};
document.getElementById('forward-btn').onclick = () => {
  const tab = BrowserApp.getCurrentTab();
  if (tab && tab.webview && tab.webview.canGoForward()) tab.webview.goForward();
};
document.getElementById('refresh-btn').onclick = () => {
  const tab = BrowserApp.getCurrentTab();
  if (tab && tab.webview) tab.webview.reload();
};

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'h') { e.preventDefault(); BrowserApp.openHistoryPage(); }
  if (e.ctrlKey && e.shiftKey && e.key === 'O') { e.preventDefault(); BrowserApp.openBookmarksPage(); }
  if (e.key === 'Escape' && BrowserApp.activeFullPage) { BrowserApp.closeFullPage(); }
});
