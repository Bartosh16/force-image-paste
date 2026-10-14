// Shared defaults and messages.
// Loaded by the bridge content script, the popup and the options page.
// Keep `selectors` in sync with selectors.json in the repo root.

globalThis.FIP_DEFAULTS = {
  selectors: {
    version: 1,
    updated: '2026-10-14',
    // Regex tested against location.pathname. LinkedIn opens the composer at /sharing/compose.
    composerUrlPattern: '^/sharing/compose',
    // Element that wraps the composer (LinkedIn uses a native <dialog>).
    dialogSelector: 'dialog',
    // The text editor inside the composer (Tiptap / ProseMirror).
    editorSelector: '.ProseMirror',
    // aria-label of the "add media" button. It depends on your LinkedIn language.
    // Verified: "Multimedia" (Polish UI). Add your language if it's missing.
    mediaButtonLabels: ['Multimedia', 'Media', 'Add media'],
    // How long to wait for LinkedIn to create its file input after the click.
    timeoutMs: 3000,
  },
  remoteConfigUrl: 'https://raw.githubusercontent.com/Bartosh16/force-image-paste/main/selectors.json',
  repoUrl: 'https://github.com/Bartosh16/force-image-paste',
};

globalThis.FIP_MESSAGES = {
  EDITOR_NOT_FOUND:
    "Couldn't find the post editor. LinkedIn has probably changed the composer.",
  MEDIA_BUTTON_NOT_FOUND:
    "Couldn't find the media button in the composer. Its label has changed, or your LinkedIn language isn't on the list yet.",
  FILE_INPUT_NOT_CAPTURED:
    "Clicked the media button, but LinkedIn didn't open a file picker. The upload flow has changed.",
  CONFIG_INVALID:
    'One of your selectors or the URL pattern is not valid.',
};

globalThis.fipMergeConfig = (stored) => ({
  ...globalThis.FIP_DEFAULTS.selectors,
  ...(stored || {}),
});
