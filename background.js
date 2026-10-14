// Keeps track of what went wrong and shows a "!" badge on the toolbar icon
// until the problem is fixed.

const CLEARED_BY = {
  COMPOSER_OK: ['EDITOR_NOT_FOUND', 'MEDIA_BUTTON_NOT_FOUND', 'CONFIG_INVALID'],
  PASTE_OK: null, // a working paste clears everything
};

async function updateBadge() {
  const { errors = {} } = await chrome.storage.local.get('errors');
  const count = Object.keys(errors).length;
  await chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
  await chrome.action.setBadgeText({ text: count ? '!' : '' });
  await chrome.action.setTitle({
    title: count ? 'Force Image Paste: configuration looks outdated' : 'Force Image Paste',
  });
}

async function handleStatus({ status, code, detail }) {
  const { errors = {} } = await chrome.storage.local.get('errors');
  const update = {};

  if (status === 'error') {
    errors[code] = { detail, at: Date.now() };
  } else if (code in CLEARED_BY) {
    const codes = CLEARED_BY[code] || Object.keys(errors);
    codes.forEach((c) => delete errors[c]);
    if (code === 'PASTE_OK') update.lastSuccess = Date.now();
  }

  await chrome.storage.local.set({ errors, ...update });
  await updateBadge();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'fip:status') handleStatus(msg.payload);
  if (msg?.type === 'fip:openOptions') chrome.runtime.openOptionsPage();
});

// Saving a new config resets the warning; the next composer check or
// paste confirms whether the fix worked.
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync' && changes.config) {
    await chrome.storage.local.set({ errors: {} });
    await updateBadge();
  }
});

chrome.runtime.onInstalled.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);
