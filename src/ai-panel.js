const AIPanel = {
  messages: [],

  init() {
    document.getElementById('ai-close-btn').onclick = () => this.close();
    document.getElementById('ai-send-btn').onclick = () => this.sendFromInput();
    document.getElementById('ai-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendFromInput();
      }
    });
  },

  toggle() {
    const sidebar = document.getElementById('ai-sidebar');
    sidebar.classList.toggle('hidden');
    document.getElementById('ai-toggle-btn').classList.toggle('active');
    document.getElementById('ai-search-btn').classList.toggle('active');
    if (!sidebar.classList.contains('hidden')) {
      document.getElementById('ai-input').focus();
    }
  },

  open() {
    const sidebar = document.getElementById('ai-sidebar');
    sidebar.classList.remove('hidden');
    document.getElementById('ai-toggle-btn').classList.add('active');
    document.getElementById('ai-search-btn').classList.add('active');
    if (!this.messages.length) {
      this.addMessage('assistant', 'Hello! I\'m your AI assistant powered by DeepSeek. Ask me anything!');
    }
  },

  close() {
    document.getElementById('ai-sidebar').classList.add('hidden');
    document.getElementById('ai-toggle-btn').classList.remove('active');
    document.getElementById('ai-search-btn').classList.remove('active');
  },

  sendFromInput() {
    const input = document.getElementById('ai-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    this.sendQuery(text);
  },

  async sendQuery(text) {
    const settings = BrowserApp.settings;
    if (!settings.apiKey) {
      this.addMessage('error', 'Please set your DeepSeek API key in Settings (⚙) to use AI search.');
      return;
    }

    this.addMessage('user', text);
    this.addMessage('loading', '');

    try {
      const response = await this.callDeepSeekAPI(text, settings);
      this.removeLastLoading();
      this.addMessage('assistant', response);
    } catch (err) {
      this.removeLastLoading();
      this.addMessage('error', `Error: ${err.message || 'Failed to connect to DeepSeek API'}`);
    }
  },

  async callDeepSeekAPI(query, settings) {
    const msgs = this.messages
      .filter(m => m.role !== 'system' && m.role !== 'loading')
      .map(m => ({ role: m.role, content: m.text }));

    msgs.push({ role: 'user', content: query });

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model || 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant integrated into a web browser. Answer questions concisely and accurately.'
          },
          ...msgs.slice(-20)
        ],
        stream: false
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },

  addMessage(role, text) {
    const container = document.getElementById('ai-messages');
    const msgDiv = document.createElement('div');

    if (role === 'loading') {
      msgDiv.className = 'ai-message assistant loading';
      msgDiv.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
      msgDiv.dataset.role = 'loading';
      this.messages.push({ role: 'loading', text: '', element: msgDiv });
    } else {
      const label = role === 'user' ? 'user' : 'assistant';
      msgDiv.className = `ai-message ${label}`;
      const ts = new Date().toLocaleTimeString();
      msgDiv.innerHTML = `${this.escapeHtml(text)}<div class="timestamp">${ts}</div>`;
      this.messages.push({ role, text, element: msgDiv });
    }

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  },

  removeLastLoading() {
    const idx = this.messages.findLastIndex(m => m.role === 'loading');
    if (idx !== -1) {
      const msg = this.messages[idx];
      msg.element.remove();
      this.messages.splice(idx, 1);
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
