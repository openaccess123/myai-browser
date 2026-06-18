// ===== AI CONFIGURATION =====
// Primary + fallback providers. If one fails, the next is tried automatically.
// Copy this file to config.js and add your API keys.

const AI_CONFIG = {
  providers: [
    {
      name: 'Groq Llama 4',
      type: 'openai',
      apiKey: 'YOUR_GROQ_API_KEY',
      apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-4-scout-17b'
    },
    {
      name: 'Gemini 2.0 Flash',
      type: 'gemini',
      apiKey: 'YOUR_GEMINI_API_KEY',
      model: 'gemini-2.0-flash'
    },
    {
      name: 'GPT-4.1 Nano',
      type: 'openai',
      apiKey: 'YOUR_OPENAI_API_KEY',
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4.1-nano'
    }
  ],
  theme: 'light'
};

// ===== AD CONFIGURATION =====
// Left and right panels on AI results page

const AD_CONFIG = {
  leftAd: `
    <div style="text-align:center;padding:20px;font-family:sans-serif">
      <div style="font-size:11px;color:#999;margin-bottom:8px">SPONSORED</div>
      <img src="https://via.placeholder.com/160x600/1a73e8/ffffff?text=Ad+Space" style="max-width:100%;border-radius:8px" alt="Ad">
      <p style="font-size:12px;color:#666;margin-top:8px">Your ad here</p>
    </div>
  `,
  rightAd: `
    <div style="text-align:center;padding:20px;font-family:sans-serif">
      <div style="font-size:11px;color:#999;margin-bottom:8px">SPONSORED</div>
      <img src="https://via.placeholder.com/160x600/ea4335/ffffff?text=Ad+Space" style="max-width:100%;border-radius:8px" alt="Ad">
      <p style="font-size:12px;color:#666;margin-top:8px">Your ad here</p>
    </div>
  `
};
