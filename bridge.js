// Runs in the extension's isolated world. Connects main.js (page world)
// with chrome.storage, the background worker and the popup, and shows an
// in-page warning when the config looks outdated.

(() => {
  let config = null;
  const toastShown = new Set();

  const sendConfig = () => {
    if (!config) return;
    document.dispatchEvent(new CustomEvent('fip:config', { detail: JSON.stringify(config) }));
  };

  async function loadConfig() {
    const { config: stored } = await chrome.storage.sync.get('config');
    config = fipMergeConfig(stored);
    sendConfig();
  }

  document.addEventListener('fip:ready', sendConfig);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.config) loadConfig();
  });
  loadConfig();

  const safeSend = (msg) => {
    try {
      chrome.runtime.sendMessage(msg);
    } catch {
      // extension was reloaded; this page needs a refresh
    }
  };

  document.addEventListener('fip:status', (e) => {
    let payload;
    try {
      payload = JSON.parse(e.detail);
    } catch {
      return;
    }
    safeSend({ type: 'fip:status', payload });
    if (payload.status === 'error' && !toastShown.has(payload.code)) {
      toastShown.add(payload.code);
      showToast(FIP_MESSAGES[payload.code] || payload.code);
    }
  });

  // Popup asks for a live check of the open composer.
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type !== 'fip:diagnose') return;
    const onResult = (e) => {
      document.removeEventListener('fip:diagnosis', onResult);
      try {
        sendResponse(JSON.parse(e.detail));
      } catch {
        sendResponse(null);
      }
    };
    document.addEventListener('fip:diagnosis', onResult);
    document.dispatchEvent(new CustomEvent('fip:diagnose'));
    return true;
  });

  // --- in-page warning -----------------------------------------------------

  function showToast(text) {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;';
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `
      <style>
        .box { max-width: 360px; background: #1d2226; color: #fff; border-left: 4px solid #f5a623;
               border-radius: 8px; padding: 12px 14px; box-shadow: 0 4px 16px rgba(0,0,0,.3);
               font: 14px/1.4 -apple-system, system-ui, "Segoe UI", sans-serif; }
        .title { font-weight: 600; margin-bottom: 4px; }
        .row { display: flex; gap: 8px; margin-top: 10px; }
        button { font: inherit; border: 0; border-radius: 16px; padding: 4px 12px; cursor: pointer; }
        .primary { background: #fff; color: #1d2226; }
        .ghost { background: transparent; color: #ccc; }
      </style>
      <div class="box" role="alert">
        <div class="title">Force Image Paste: configuration looks outdated</div>
        <div class="msg"></div>
        <div class="row">
          <button class="primary" data-act="fix">How to fix</button>
          <button class="ghost" data-act="close">Dismiss</button>
        </div>
      </div>`;
    root.querySelector('.msg').textContent = text;
    root.addEventListener('click', (e) => {
      const act = e.target?.dataset?.act;
      if (act === 'fix') safeSend({ type: 'fip:openOptions' });
      if (act) host.remove();
    });
    document.documentElement.appendChild(host);
    setTimeout(() => host.remove(), 15000);
  }
})();
