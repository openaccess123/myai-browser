// Webview preload: overrides viewport globals to match actual element size
try {
  Object.defineProperty(window, 'innerHeight', {
    get() { return document.documentElement.clientHeight || window.outerHeight; },
    configurable: true
  });
  Object.defineProperty(window, 'innerWidth', {
    get() { return document.documentElement.clientWidth || window.outerWidth; },
    configurable: true
  });
  Object.defineProperty(window, 'visualViewport', {
    get() { return { height: document.documentElement.clientHeight || window.outerHeight, width: document.documentElement.clientWidth || window.outerWidth }; },
    configurable: true
  });
} catch (e) {}
