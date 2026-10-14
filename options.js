const $ = (id) => document.getElementById(id);
const FIELDS = ['composerUrlPattern', 'dialogSelector', 'editorSelector', 'timeoutMs'];
let loadedMeta = { version: null, updated: null };

function say(text, ok = true) {
  $('msg').textContent = text;
  $('msg').className = ok ? 'ok' : 'err';
}

function fill(cfg) {
  FIELDS.forEach((f) => ($(f).value = cfg[f]));
  $('mediaButtonLabels').value = cfg.mediaButtonLabels.join('\n');
  loadedMeta = { version: cfg.version, updated: cfg.updated };
}

function readForm() {
  return {
    ...loadedMeta,
    composerUrlPattern: $('composerUrlPattern').value.trim(),
    dialogSelector: $('dialogSelector').value.trim(),
    editorSelector: $('editorSelector').value.trim(),
    mediaButtonLabels: $('mediaButtonLabels').value.split('\n').map((s) => s.trim()).filter(Boolean),
    timeoutMs: Number($('timeoutMs').value),
  };
}

// Returns an error message, or '' when the config is usable.
// Remote configs go through the same check: only plain strings and numbers
// are accepted, and nothing in the file is ever executed.
function validate(cfg) {
  for (const key of ['composerUrlPattern', 'dialogSelector', 'editorSelector']) {
    if (typeof cfg[key] !== 'string' || !cfg[key]) return `"${key}" must be a non-empty text.`;
  }
  try {
    new RegExp(cfg.composerUrlPattern);
  } catch {
    return 'Composer URL pattern is not a valid regular expression.';
  }
  for (const key of ['dialogSelector', 'editorSelector']) {
    try {
      document.querySelector(cfg[key]);
    } catch {
      return `"${cfg[key]}" is not a valid CSS selector.`;
    }
  }
  if (!Array.isArray(cfg.mediaButtonLabels) || !cfg.mediaButtonLabels.length ||
      cfg.mediaButtonLabels.some((l) => typeof l !== 'string')) {
    return 'Add at least one media button label.';
  }
  if (!Number.isFinite(cfg.timeoutMs) || cfg.timeoutMs < 500 || cfg.timeoutMs > 15000) {
    return 'Timeout must be between 500 and 15000 ms.';
  }
  return '';
}

async function load() {
  const { config, remoteConfigUrl } = await chrome.storage.sync.get(['config', 'remoteConfigUrl']);
  const cfg = fipMergeConfig(config);
  fill(cfg);
  $('remoteConfigUrl').value = remoteConfigUrl || FIP_DEFAULTS.remoteConfigUrl;
  $('current').textContent = config
    ? `Using your saved config (dated ${cfg.updated || 'unknown'}).`
    : `Using the built-in config (dated ${cfg.updated}).`;
}

$('save').addEventListener('click', async () => {
  const cfg = readForm();
  const err = validate(cfg);
  if (err) return say(err, false);
  await chrome.storage.sync.set({ config: cfg, remoteConfigUrl: $('remoteConfigUrl').value.trim() });
  say('Saved. Refresh your LinkedIn tab, open "Start a post" and paste an image to confirm.');
  load();
});

$('reset').addEventListener('click', async () => {
  await chrome.storage.sync.remove(['config', 'remoteConfigUrl']);
  say('Back to built-in defaults. Refresh your LinkedIn tab.');
  load();
});

$('fetch').addEventListener('click', async () => {
  const url = $('remoteConfigUrl').value.trim();
  if (!/^https:\/\//.test(url)) return say('Config URL must start with https://', false);
  say('Fetching…');
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const remote = { ...FIP_DEFAULTS.selectors, ...(await res.json()) };
    const err = validate(remote);
    if (err) return say(`The fetched config is not valid: ${err}`, false);
    fill(remote);
    say(`Fetched config dated ${remote.updated || 'unknown'}. Review it and click Save.`);
  } catch (e) {
    say(`Could not fetch the config: ${e.message}`, false);
  }
});

$('help').href = `${FIP_DEFAULTS.repoUrl}#when-linkedin-changes-something`;
load();
