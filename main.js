// Runs in the page's own JS world (MAIN), so it can intercept LinkedIn's
// call to input.click() on the file input. No chrome.* APIs here: config
// comes in and status goes out through DOM events handled by bridge.js.
//
// How it works: LinkedIn's composer ignores files in the paste event.
// On an image paste we click the composer's media button, swallow the
// file-picker click LinkedIn makes on its <input type=file>, and hand the
// clipboard images to that input instead.

(() => {
  let cfg = null;
  let armed = false;
  let captured = null;
  let lastPath = '';

  const nativeClick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function (...args) {
    if (armed && this.type === 'file') {
      armed = false;
      captured = this;
      return; // no OS file picker
    }
    return nativeClick.apply(this, args);
  };

  const emit = (name, data) =>
    document.dispatchEvent(new CustomEvent(name, { detail: JSON.stringify(data) }));

  const report = (status, code, detail = '') => emit('fip:status', { status, code, detail });

  document.addEventListener('fip:config', (e) => {
    try {
      cfg = JSON.parse(e.detail);
    } catch {
      cfg = null;
    }
  });
  document.dispatchEvent(new CustomEvent('fip:ready'));

  // --- lookups -------------------------------------------------------------

  const isComposerUrl = () => new RegExp(cfg.composerUrlPattern).test(location.pathname);

  function findComposer() {
    for (const dialog of document.querySelectorAll(cfg.dialogSelector)) {
      const editor = dialog.querySelector(cfg.editorSelector);
      if (editor) return { dialog, editor };
    }
    return null;
  }

  function composerFor(target) {
    const el = target instanceof Element ? target : target?.parentElement;
    const editor = el?.closest(cfg.editorSelector);
    const dialog = editor?.closest(cfg.dialogSelector);
    return dialog ? { dialog, editor } : null;
  }

  function findMediaButton(dialog) {
    const labels = cfg.mediaButtonLabels.map((l) => l.trim().toLowerCase());
    return (
      [...dialog.querySelectorAll('button')].find((b) =>
        labels.includes((b.getAttribute('aria-label') || '').trim().toLowerCase())
      ) || null
    );
  }

  // aria-labels of buttons in the composer – shown in the popup so the user
  // can pick the new media button label with one click.
  const candidateLabels = (dialog) =>
    [...new Set(
      [...dialog.querySelectorAll('button[aria-label]')]
        .map((b) => b.getAttribute('aria-label').trim())
        .filter(Boolean)
    )];

  function diagnose() {
    const result = {
      url: location.pathname,
      composerUrl: false,
      editorFound: false,
      mediaButtonFound: false,
      candidates: [],
      error: '',
    };
    if (!cfg) return { ...result, error: 'Config not loaded yet. Reload the page.' };
    try {
      result.composerUrl = isComposerUrl();
      const composer = findComposer();
      result.editorFound = !!composer;
      if (composer) {
        result.mediaButtonFound = !!findMediaButton(composer.dialog);
        result.candidates = candidateLabels(composer.dialog);
      }
    } catch (err) {
      result.error = `CONFIG_INVALID: ${err.message}`;
    }
    return result;
  }

  document.addEventListener('fip:diagnose', () => emit('fip:diagnosis', diagnose()));

  // --- early warning: check the composer as soon as it opens ---------------

  async function checkComposer() {
    const start = Date.now();
    let composer = null;
    while (Date.now() - start < 4000) {
      composer = findComposer();
      if (composer) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!isComposerUrl()) return; // user closed the composer meanwhile
    if (!composer) return report('error', 'EDITOR_NOT_FOUND');
    if (!findMediaButton(composer.dialog)) {
      return report('error', 'MEDIA_BUTTON_NOT_FOUND',
        `Buttons found: ${candidateLabels(composer.dialog).join(' | ')}`);
    }
    report('ok', 'COMPOSER_OK');
  }

  setInterval(() => {
    if (!cfg || location.pathname === lastPath) return;
    lastPath = location.pathname;
    const invalid = (err) => report('error', 'CONFIG_INVALID', err.message);
    try {
      if (isComposerUrl()) checkComposer().catch(invalid);
    } catch (err) {
      invalid(err);
    }
  }, 1000);

  // --- paste ---------------------------------------------------------------

  function imagesFrom(cd) {
    if (!cd) return [];
    let files = [...(cd.files || [])];
    if (!files.length && cd.items) {
      files = [...cd.items]
        .filter((i) => i.kind === 'file')
        .map((i) => i.getAsFile())
        .filter(Boolean);
    }
    return files.filter((f) => f.type.startsWith('image/'));
  }

  function waitForInput() {
    return new Promise((resolve) => {
      const start = Date.now();
      const t = setInterval(() => {
        if (captured || Date.now() - start > cfg.timeoutMs) {
          clearInterval(t);
          const input = captured;
          captured = null;
          armed = false;
          resolve(input);
        }
      }, 50);
    });
  }

  document.addEventListener(
    'paste',
    async (e) => {
      if (!cfg) return;
      const files = imagesFrom(e.clipboardData);
      if (!files.length) return; // plain text pastes as usual

      let composer;
      try {
        composer = composerFor(e.target);
        if (!composer) {
          // Image pasted on the composer URL, but not into a known editor:
          // the editor or dialog selector is stale.
          if (isComposerUrl()) report('error', 'EDITOR_NOT_FOUND');
          return; // comments, messages etc. – not ours
        }
      } catch (err) {
        return report('error', 'CONFIG_INVALID', err.message);
      }

      const button = findMediaButton(composer.dialog);
      if (!button) {
        return report('error', 'MEDIA_BUTTON_NOT_FOUND',
          `Buttons found: ${candidateLabels(composer.dialog).join(' | ')}`);
      }

      e.preventDefault();
      e.stopPropagation();

      captured = null;
      armed = true;
      button.click();

      const input = await waitForInput();
      if (!input) return report('error', 'FILE_INPUT_NOT_CAPTURED');

      const dt = new DataTransfer();
      files.forEach((f, i) => {
        const name = f.name && f.name !== 'image.png' ? f.name : `pasted-${Date.now()}-${i + 1}.png`;
        dt.items.add(new File([f], name, { type: f.type }));
      });
      input.files = dt.files;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      report('ok', 'PASTE_OK');
    },
    true
  );
})();
