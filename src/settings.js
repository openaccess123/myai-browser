document.addEventListener('DOMContentLoaded', () => {
  const urlBar = document.getElementById('url-bar');

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!document.getElementById('settings-modal').classList.contains('hidden')) {
        BrowserApp.toggleSettings();
      }
    }
    if (e.ctrlKey && e.key === 't') { e.preventDefault(); BrowserApp.createTab(); }
    if (e.ctrlKey && e.key === 'w') { e.preventDefault(); if (BrowserApp.currentTabId) BrowserApp.closeTab(BrowserApp.currentTabId); }
    if (e.ctrlKey && e.key === 'l') { e.preventDefault(); urlBar.focus(); urlBar.select(); }
  });
});
