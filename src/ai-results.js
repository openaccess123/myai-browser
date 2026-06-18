const AIResultsPage = {
  conversation: [],

  init() {
    document.getElementById('ai-followup-btn').onclick = () => this.sendFollowup();
    document.getElementById('ai-followup-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendFollowup();
    });
  },

  showQuery(query) {
    BrowserApp.showAIResults();
    document.getElementById('ai-query-display').textContent = query;
    document.getElementById('ai-results-body').innerHTML =
      '<div class="ai-loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
    document.getElementById('ai-followup-input').value = '';
    this.conversation = [];
    const tab = BrowserApp.getCurrentTab();
    if (tab) {
      tab.title = query;
      tab.element.querySelector('.tab-title').textContent = query;
      document.title = query + ' - MyAi Browser';
    }
  },

  async answer(query) {
    this.showQuery(query);
    this.conversation = [{ role: 'user', content: query }];
    await this.tryProviders(query, true);
  },

  async askFollowup(query) {
    this.conversation.push({ role: 'user', content: query });
    document.getElementById('ai-query-display').textContent = query;
    document.getElementById('ai-results-body').innerHTML =
      '<div class="ai-loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
    document.getElementById('ai-followup-input').value = '';
    await this.tryProviders(query, false);
  },

  async tryProviders(query, isNew) {
    const providers = AI_CONFIG.providers;
    let lastError = '';

    for (let i = 0; i < providers.length; i++) {
      const p = providers[i];
      try {
        let content;
        if (p.type === 'gemini') {
          content = await this.callGemini(query, p, isNew);
        } else {
          content = await this.callOpenAI(query, p, isNew);
        }
        this.conversation.push({ role: 'assistant', content });
        this.renderAnswer(content);
        if (i > 0) {
          this.appendProviderNote(`Answered by ${p.name} (fallback from #${i})`);
        }
        return;
      } catch (err) {
        lastError = err.message;
        console.warn(`Provider ${p.name} failed:`, err.message);
      }
    }

    this.renderError(`All providers failed. Last error: ${lastError}`);
  },

  async callOpenAI(query, provider, isNew) {
    const sysMsg = 'You are a helpful AI assistant. Format answers using markdown with headings, lists, code blocks, and tables where appropriate. Be concise but thorough.';
    const msgs = isNew
      ? [{ role: 'system', content: sysMsg }, { role: 'user', content: query }]
      : [{ role: 'system', content: sysMsg }, ...this.conversation.map(m => ({ role: m.role, content: m.content }))];

    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: provider.model,
        messages: msgs,
        stream: false,
        max_tokens: 8192
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`${provider.name} ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },

  async callGemini(query, provider, isNew) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`;

    const contents = isNew
      ? [{ role: 'user', parts: [{ text: query }] }]
      : this.conversation.map(m => ({ role: m.role, parts: [{ text: m.content }] }));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: 8192 }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`${provider.name} ${response.status}: ${err}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error(`${provider.name}: No response`);
    return text;
  },

  renderAnswer(content) {
    const body = document.getElementById('ai-results-body');
    body.innerHTML = `<div class="ai-answer-card"><div class="answer-content">${this.renderMarkdown(content)}</div></div>`;
  },

  appendProviderNote(note) {
    const card = document.querySelector('.ai-answer-card');
    if (card) {
      const noteEl = document.createElement('div');
      noteEl.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:16px;padding-top:12px;border-top:1px solid var(--border-color)';
      noteEl.textContent = note;
      card.appendChild(noteEl);
    }
  },

  renderError(msg) {
    const body = document.getElementById('ai-results-body');
    body.innerHTML = `<div class="ai-error-card">${this.escapeHtml(msg)}</div>`;
  },

  sendFollowup() {
    const input = document.getElementById('ai-followup-input');
    const text = input.value.trim();
    if (!text) return;
    this.askFollowup(text);
  },

  renderMarkdown(text) {
    let html = this.escapeHtml(text);
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => `<pre><code>${this.escapeHtml(code)}</code></pre>`);
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^[-=*]{3,}$/gm, '');
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^(.+)$/gm, (m) => {
      if (m.startsWith('<')) return m;
      if (m.trim() === '') return '';
      if (m.startsWith('http://') || m.startsWith('https://')) {
        return `<p><a href="${this.escapeHtml(m.trim())}" target="_blank">${this.escapeHtml(m.trim())}</a></p>`;
      }
      return `<p>${m}</p>`;
    });
    html = html.replace(/\n\s*\n/g, '\n');
    return html;
  },

  escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }
};
