const TabManager = {
  plusBtn: null,

  init() {
    this.plusBtn = document.createElement('button');
    this.plusBtn.id = 'new-tab-btn';
    this.plusBtn.textContent = '+';
    this.plusBtn.title = 'New Tab';
    this.plusBtn.onclick = () => BrowserApp.createTab();
    this.plusBtn.oncontextmenu = (e) => { e.preventDefault(); BrowserApp.createTab(); };
    document.getElementById('tabs-container').appendChild(this.plusBtn);
  },

  createTabElement(tab) {
    const container = document.getElementById('tabs-container');
    const el = document.createElement('div');
    el.className = 'tab';
    el.dataset.tabId = tab.id;
    el.innerHTML = `
      <span class="tab-favicon">🌐</span>
      <span class="tab-title">New Tab</span>
      <button class="tab-close" title="Close tab">✕</button>
    `;
    el.onclick = () => BrowserApp.activateTab(tab.id);
    el.querySelector('.tab-close').onclick = (e) => {
      e.stopPropagation();
      BrowserApp.closeTab(tab.id);
    };
    container.insertBefore(el, this.plusBtn);
    tab.element = el;
  },

  createWebview(tab, url) {
    const container = document.getElementById('webview-container');
    const wv = document.createElement('webview');
    wv.src = url;
    wv.setAttribute('autosize', 'on');
    wv.setAttribute('preload', new URL('webview-preload.js', window.location.href).href);
    wv.style.width = '100%';
    wv.style.height = '100%';
    wv.style.position = 'absolute';
    wv.style.top = '0';
    wv.style.left = '0';
    wv.style.border = 'none';
    container.appendChild(wv);
    tab.webview = wv;

    wv.addEventListener('did-navigate', (e) => {
      tab.url = e.url;
      if (tab.id === BrowserApp.currentTabId) {
        SearchBar.update(e.url);
        BrowserApp.updateBookmarkButton();
      }
      BrowserApp.trackHistory(e.url, tab.title);
      BrowserApp.updateNavState();
    });
    wv.addEventListener('did-navigate-in-page', (e) => {
      tab.url = e.url;
      if (tab.id === BrowserApp.currentTabId) {
        SearchBar.update(e.url);
        BrowserApp.updateBookmarkButton();
      }
      BrowserApp.trackHistory(e.url, tab.title);
    });
    wv.addEventListener('page-title-updated', (e) => {
      tab.title = e.title;
      tab.element.querySelector('.tab-title').textContent = e.title;
      if (tab.id === BrowserApp.currentTabId) {
        document.title = e.title + ' - MyAi Browser';
      }
    });
    wv.addEventListener('page-favicon-updated', (e) => {
      if (e.favicons && e.favicons.length > 0) {
        tab.element.querySelector('.tab-favicon').innerHTML = `<img src="${e.favicons[0]}" style="width:16px;height:16px">`;
      }
    });
    wv.addEventListener('did-start-loading', () => {
      if (tab.id === BrowserApp.currentTabId) {
        tab.element.querySelector('.tab-title').textContent = 'Loading...';
      }
    });
    wv.addEventListener('did-stop-loading', () => {
      if (tab.id === BrowserApp.currentTabId) {
        tab.element.querySelector('.tab-title').textContent = tab.title || tab.url;
        BrowserApp.updateNavState();
      }
      BrowserApp.trackHistory(tab.url, tab.title);
    });
    wv.addEventListener('new-window', (e) => {
      BrowserApp.createTab(e.url);
    });
    wv.addEventListener('did-attach', () => {
      wv.classList.remove('hidden');
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        wv.style.width = rect.width + 'px';
        wv.style.height = rect.height + 'px';
      }
    });
  }
};
