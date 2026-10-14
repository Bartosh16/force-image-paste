const $ = (id) => document.getElementById(id);
const fmt = (ts) => (ts ? new Date(ts).toLocaleString() : 'never');

function el(tag, props = {}, text = '') {
  const node = Object.assign(document.createElement(tag), props);
  if (text) node.textContent = text;
  return node;
}

async function renderStatus() {
  const { errors = {}, lastSuccess } = await chrome.storage.local.get(['errors', 'lastSuccess']);
  const { config: stored } = await chrome.storage.sync.get('config');
  const cfg = fipMergeConfig(stored);
  const box = $('status');
  box.replaceChildren();

  const codes = Object.keys(errors);
  if (!codes.length) {
    box.className = 'status ok';
    box.append(el('strong', {}, 'Working.'), ' No problems detected.');
  } else {
    box.className = 'status bad';
    box.append(el('strong', {}, 'Configuration looks outdated.'));
    const ul = el('ul');
    for (const code of codes) {
      const li = el('li', {}, FIP_MESSAGES[code] || code);
      if (errors[code].detail) li.append(el('div', { className: 'muted' }, errors[code].detail));
      li.append(el('div', { className: 'muted' }, fmt(errors[code].at)));
      ul.append(li);
    }
    box.append(ul);
  }

  $('meta').textContent =
    `Last successful paste: ${fmt(lastSuccess)} · Config dated ${cfg.updated || 'unknown'}` +
    (stored ? ' (custom)' : ' (built-in)');
}

function mark(ok) {
  return el('span', { className: ok ? 'yes' : 'no' }, ok ? 'OK' : 'Missing');
}

async function addLabel(label) {
  const { config: stored } = await chrome.storage.sync.get('config');
  const cfg = fipMergeConfig(stored);
  if (!cfg.mediaButtonLabels.includes(label)) cfg.mediaButtonLabels.push(label);
  await chrome.storage.sync.set({ config: cfg });
  setTimeout(runCheck, 300); // let the content script pick up the new config
}

async function runCheck() {
  const out = $('result');
  out.replaceChildren(el('div', { className: 'muted' }, 'Checking…'));

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let r = null;
  try {
    r = await chrome.tabs.sendMessage(tab.id, { type: 'fip:diagnose' });
  } catch {
    r = null;
  }

  out.replaceChildren();
  if (!r) {
    out.append(el('div', {}, 'Open LinkedIn in this tab (refresh it after installing), click "Start a post", then check again.'));
    return;
  }
  if (r.error) {
    out.append(el('div', { className: 'no' }, r.error));
    return;
  }
  if (!r.composerUrl && !r.editorFound) {
    out.append(el('div', {}, 'Click "Start a post" on LinkedIn first, then check again.'));
    return;
  }

  const table = el('table');
  for (const [name, ok] of [
    ['Composer URL', r.composerUrl],
    ['Post editor', r.editorFound],
    ['Media button', r.mediaButtonFound],
  ]) {
    const tr = el('tr');
    tr.append(el('td', {}, name), el('td'));
    tr.lastChild.append(mark(ok));
    table.append(tr);
  }
  out.append(table);

  if (r.editorFound && !r.mediaButtonFound && r.candidates.length) {
    out.append(el('p', {}, 'Which of these buttons adds a photo? Click it to save its label:'));
    const wrap = el('div', { className: 'cands' });
    for (const label of r.candidates) {
      const b = el('button', {}, label);
      b.addEventListener('click', () => addLabel(label));
      wrap.append(b);
    }
    out.append(wrap);
  } else if (!r.editorFound) {
    out.append(el('p', {}, 'The editor selector no longer matches. Open Settings and try "Fetch latest config", or update the selector by hand.'));
  } else if (r.mediaButtonFound) {
    out.append(el('p', { className: 'yes' }, 'Everything is in place. Paste an image to confirm.'));
  }
}

$('check').addEventListener('click', runCheck);
$('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('help').href = `${FIP_DEFAULTS.repoUrl}#when-linkedin-changes-something`;
chrome.storage.onChanged.addListener(renderStatus);
renderStatus();
