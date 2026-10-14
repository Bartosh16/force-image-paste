# Force Image Paste

A tiny Chrome extension that brings back **Ctrl+V for images in the LinkedIn post composer**.

Take a screenshot (Win+Shift+S, Cmd+Ctrl+Shift+4) or right-click an image and choose "Copy image", click into a new LinkedIn post, press Ctrl+V. The image lands in LinkedIn's media editor, exactly as if you had uploaded it with the media button.

Not affiliated with LinkedIn. Not on the Chrome Web Store on purpose: you install it from this repo and you stay in control of it. Please read the [disclaimer](#disclaimer) before using it.

## Why it's needed

In October 2026 LinkedIn moved the post composer to a new text editor. The new editor only accepts text from the clipboard and silently drops pasted images. There's no setting to bring it back.

The extension doesn't upload anything itself. When you paste an image into the composer, it:

1. clicks the composer's own media button,
2. intercepts the "open file picker" step, so no system dialog pops up,
3. hands your clipboard image to LinkedIn's file input instead of a file from disk.

From there LinkedIn's own upload flow takes over.

## Install

1. Download this repo: **Code → Download ZIP** and unzip it, or `git clone` it.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the folder with `manifest.json`.
5. Refresh any open LinkedIn tabs.

Requires Chrome 111 or newer. Other Chromium browsers (Edge, Brave) should work too, but are untested.

To update after a new release: replace the folder contents (or `git pull`) and click the reload icon on the extension card in `chrome://extensions`.

## Privacy and permissions

- **Runs only on `https://www.linkedin.com/*`.**
- **One permission: `storage`** to save your settings and the last error.
- **No tracking, no analytics, no servers.** The only network request the extension ever makes is when *you* click **Fetch latest config** in Settings. It downloads one JSON file from the URL shown in that field. The file holds text values only (selectors and labels); it is validated and never executed.

The code is a few hundred lines of plain JavaScript with no dependencies. Read it before installing; that's the point of not using the Web Store.

## When LinkedIn changes something

LinkedIn changes its page without notice, and at some point the extension will stop finding what it needs. It tells you when that happens:

- **a red `!` badge** on the extension icon (pin the extension to your toolbar so you see it),
- **the popup** (click the icon) says "Configuration looks outdated" and explains what's missing,
- the extension also checks the composer every time you open **Start a post**, so the badge usually lights up before your first failed paste.

The extension never draws anything on the LinkedIn page itself. All warnings stay on the toolbar icon.

How to fix it, easiest first:

1. **Fetch the latest config.** Open the extension's **Settings** and click **Fetch latest config**, then **Save**. If someone has already updated [`selectors.json`](selectors.json) in this repo, you're done.
2. **Pick the new button label.** Open **Start a post** on LinkedIn, click the extension icon, then **Check this tab**. If the media button is missing, the popup lists every button it found in the composer. Click the one that adds a photo. Its label is saved right away.
3. **Edit the selectors yourself.** In **Settings** you can change every value the extension relies on (see below). Use your browser's "Inspect element" on the composer to find the new values.
4. **Refresh the LinkedIn tab** and paste an image. A successful paste clears the warning.

Fixed it? Please open a pull request that updates `selectors.json` (and bump `updated`), so everyone else can click **Fetch latest config** instead of debugging it again.

### Your LinkedIn is in another language

The media button is found by its `aria-label`, which depends on your LinkedIn language. Verified so far: **Multimedia** (Polish). If yours isn't recognised, use step 2 above. One click adds your label. A pull request adding it to `selectors.json` helps the next person.

## Configuration

Everything lives in Settings and is stored in your browser (synced if you use Chrome Sync).

| Setting | Default | What it is |
|---|---|---|
| Media button labels | `Multimedia`, `Media`, `Add media` | `aria-label` of the composer button that adds photos |
| Editor selector | `.ProseMirror` | CSS selector of the post text editor |
| Composer container selector | `dialog` | CSS selector of the element that wraps the composer |
| Composer URL pattern | `^/sharing/compose` | Regex matched against the page path while the composer is open; used for the early check |
| Timeout | `3000` ms | How long to wait for LinkedIn's file input after clicking the media button |
| Config URL | this repo's `selectors.json` | Where **Fetch latest config** downloads from. Point it to your fork if you maintain your own |

## What it doesn't do

- Only the **post composer**. Comments and messages are left alone.
- No video. LinkedIn accepts one video per post via the media button, and video rarely sits in a clipboard.
- Tested in Chrome only. Firefox is not supported.

## Files

| File | Role |
|---|---|
| `manifest.json` | Extension manifest (MV3) |
| `main.js` | Runs in the page; handles the paste and the composer check |
| `bridge.js` | Connects the page with settings, the badge and the popup |
| `background.js` | Keeps the error list and the `!` badge |
| `popup.html`, `popup.js` | Status, **Check this tab**, one-click label fix |
| `options.html`, `options.js` | Settings, **Fetch latest config** |
| `defaults.js` | Built-in config and messages |
| `selectors.json` | Latest known-good config, fetched by **Fetch latest config** |

## Contributing

Pull requests are welcome, especially `selectors.json` updates and labels for new languages. Please keep the extension dependency-free and permission-light.

## Disclaimer

This is an unofficial, personal tool. It is not affiliated with, endorsed by or supported by LinkedIn.

The extension changes how the LinkedIn page behaves: it intercepts the paste event and clicks the composer's media button on your behalf. [LinkedIn's User Agreement](https://www.linkedin.com/legal/user-agreement) (section 8.2) prohibits modifying the Services, and LinkedIn's [Prohibited software and extensions](https://www.linkedin.com/help/linkedin/answer/a1341387) page covers browser extensions that modify or automate activity on its website. Using this extension may therefore conflict with those terms.

It doesn't scrape data, send messages or invitations, react to posts, or get around any limits or security features. It only acts when you press Ctrl+V and does what you would otherwise do by hand with the media button. Still, the decision is yours: **you use it at your own risk**, and the authors are not responsible for any consequences for your LinkedIn account. The software is provided "as is", without warranty of any kind (see [LICENSE](LICENSE)).

## License

[MIT](LICENSE)
