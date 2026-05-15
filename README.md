# HubSpot Test Email Recipients

A Chrome extension that fills HubSpot's test-email recipient field with pre-defined address lists, so you don't have to type them by hand every time.

## Features

- **Recipient lists** — save named groups of email addresses and reuse them across tests
- **In-page fill bar** — appears directly below the recipient field when the HubSpot send-test dialog is open; no need to open the popup
- **Replace or Append** — choose whether to overwrite the current recipients or add to them
- **Manage from the popup** — create, rename, and delete lists; add or remove individual addresses
- **Multilingual** — English and German, following the browser locale automatically

## Installation

The extension is not published to the Chrome Web Store. Load it unpacked:

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the repository root folder.

The extension icon appears in the toolbar. Pin it for quick access.

## Usage

### In-page fill bar

Open a HubSpot email draft, click **Send test** to open the test-send dialog. The extension detects the recipient field and inserts a small bar directly below it:

1. Pick a recipient list from the dropdown.
2. Choose **Replace** (clears existing recipients first) or **Append** (adds to them).
3. Click **Fill**.

### Popup — Fill tab

Click the extension icon to open the popup. The **Fill** tab mirrors the in-page bar; it is only active when a HubSpot test-send dialog is open in the current tab.

### Popup — Manage tab

Use the **Manage** tab to maintain your recipient lists:

| Action            | How                                                                    |
| ----------------- | ---------------------------------------------------------------------- |
| Create a list     | Type a name in the input at the top, press Enter or click **Add set**  |
| Rename a list     | Click the list name directly and edit it in place; click away to save  |
| Delete a list     | Click **Delete** on the list header                                    |
| Add an address    | Expand a list, type in the address field, press Enter or click **Add** |
| Remove an address | Click **×** next to any address                                        |

## Languages

The extension uses the Chrome i18n API. The active locale is picked automatically from the browser language setting, with English as the fallback.

| Locale         | Status   |
| -------------- | -------- |
| English (`en`) | Included |
| German (`de`)  | Included |

To add another language, create `_locales/<locale>/messages.json` using `_locales/en/messages.json` as a template. All keys must be present; no code changes are required.

## Development

**Prerequisites:** Node.js (for tests and scripts).

```bash
npm install     # install dev dependencies
npm test        # run Jest unit tests
```

**Load unpacked** from `chrome://extensions` — there is no build step.

**Formatting** runs automatically via a Prettier post-edit hook when using Claude Code. To format manually:

```bash
npx prettier --write .
```

### Project structure

```
_locales/          Chrome i18n message files
  en/messages.json
  de/messages.json
icons/             Extension icons (16 px, 48 px, 128 px)
scripts/           Utility scripts (icon generation, CLAUDE.md sync)
src/
  content.js       Injected into HubSpot pages — detects the recipient field
                   and renders the in-page fill bar
  popup.html       Extension popup markup
  popup.js         Popup logic — Fill and Manage tabs
  storage.js       chrome.storage.local helpers (getSets, createSet, …)
  styles.css       Shared styles for both the popup and the in-page bar
tests/             Jest unit tests
manifest.json      Chrome MV3 manifest
```

### Conventions

- Manifest V3 only
- Recipient sets are stored in `chrome.storage.local` — never `chrome.storage.sync` (intentionally local to the browser profile)
- The content script does not use ES module imports (blocked by HubSpot's CSP); `chrome.i18n` and `chrome.storage` are used directly

## License

MIT — see [LICENSE](LICENSE).
