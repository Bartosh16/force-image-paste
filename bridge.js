// Runs in the extension's isolated world. Connects main.js (page world)
// with chrome.storage, the background worker and the popup. It never draws
// anything on the LinkedIn page: warnings live on the toolbar icon only.

(() => {
  let config = null;

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
})();
