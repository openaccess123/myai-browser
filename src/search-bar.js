const SearchBar = {
  init() {
    const urlBar = document.getElementById('url-bar');
    urlBar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleInput(urlBar.value);
    });
    urlBar.addEventListener('focus', () => urlBar.select());
  },

  handleInput(input) {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (this.looksLikeUrl(trimmed)) {
      BrowserApp.navigateTo(trimmed);
    } else {
      this.doSearch(trimmed);
    }
  },

  looksLikeUrl(str) {
    if (str.match(/^https?:\/\//i)) return true;
    if (str.match(/^[a-z0-9-]+(\.[a-z0-9-]+)+/i) && !str.includes(' ')) return true;
    if (str.match(/^[a-z0-9-]+\.[a-z]{2,}(\/|$)/i)) return true;
    return false;
  },

  doSearch(query) {
    document.getElementById('url-bar').value = '';
    AIResultsPage.answer(query);
  },

  update(url) {
    const urlBar = document.getElementById('url-bar');
    if (document.activeElement !== urlBar) urlBar.value = url;
    document.getElementById('secure-icon').textContent =
      url.startsWith('https://') ? '🔒' : url.startsWith('http://') ? '⚠' : '🌐';
  }
};
