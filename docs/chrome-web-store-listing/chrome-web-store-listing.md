# Chrome Web Store Listing — Test Email Recipient Lists for HubSpot

All texts ready to copy-paste into the Chrome Web Store Developer Dashboard.

---

## 1. Extension name

```
Test Email Recipient Lists for HubSpot
```

> **Note:** The Chrome Web Store policy allows descriptive use of a platform name in an extension title (e.g. "for HubSpot") as long as the listing makes clear there is no affiliation. The disclaimer in the detailed description below covers this.

---

## 2. Short description

_Limit: 132 characters. Shown in search results and category pages._

```
Fill HubSpot test-email recipient fields instantly with saved address lists. Replace or append in one click.
```

_(107 characters)_

---

## 3. Detailed description

_Limit: 16,000 characters. Supports plain text only — no HTML or Markdown._

```
Stop retyping the same email addresses every time you send a HubSpot test email.

Test Email Recipient Lists for HubSpot lets you save named groups of email addresses and fill the “Send test to” field with a single click — directly from an in-page bar that appears right below the recipient field, or from the extension popup.


FEATURES

• Recipient lists: Create as many named lists as you need and reuse them across every test send.
• In-page fill bar: A compact bar appears automatically below the recipient field when the HubSpot send-test dialog is open. No need to open the popup.
• Replace or Append: Overwrite the current recipients, or add your list on top of whatever is already there.
• Full list management: Create, rename, and delete lists. Add or remove individual addresses at any time.
• Purely local: All data is stored in your browser profile only. Nothing is ever sent to any server.
• Multilingual: English, German, French, Spanish, Italian, Dutch, and Portuguese. The language follows your browser setting automatically.


HOW TO USE

In-page fill bar
1. Open a HubSpot email draft and click “Send test email” to open the dialog.
2. A small bar labelled “Use recipient list” appears below the “Send test to” field.
3. Choose a list from the dropdown, select Replace or Append, and click Fill.

Popup — Fill tab
Click the extension icon in the toolbar. The Fill tab mirrors the in-page bar and is active whenever a HubSpot send-test dialog is open in the current tab.

Popup — Manage tab
Use the Manage tab to maintain your lists:
• Type a name and click “Add list” to create a new list.
• Click a list name to rename it in place.
• Expand a list, type an address and press Enter (or click “Add”) to add a recipient.
• Click “×” next to any address to remove it.
• Click “Delete” on a list header to remove the entire list.


PERMISSIONS

• Storage: Saves your recipient lists locally in the browser (chrome.storage.local). No data leaves your device.
• Access to hubspot.com: Required to inject the fill bar into HubSpot pages and to read/fill the recipient field.

No other permissions are requested.


PRIVACY

This extension does not collect, transmit, or share any personal data. Your email address lists are stored exclusively in your browser’s local storage and never leave your device. There is no analytics, no tracking, and no external server communication of any kind.


DISCLAIMER

This extension is an independent, community-built productivity tool. It is not affiliated with, endorsed by, or in any way officially connected to HubSpot, Inc. “HubSpot” is a registered trademark of HubSpot, Inc. All product and company names are trademarks or registered trademarks of their respective holders. Use of these names does not imply any affiliation or endorsement.


SOURCE CODE

This extension is open source. The full source code is available on GitHub:
https://github.com/MichaelvanLaar/hs-test-email-recipients
```

---

## 4. Category

```
Productivity
```

---

## 5. Language

```
English
```

_(Additional store-listing translations are optional and can be added later via the Developer Dashboard's "Add a language" feature.)_

---

## 6. Privacy policy

_The privacy policy lives in [`PRIVACY.md`](../PRIVACY.md) at the repo root. Paste the URL below into the "Privacy practices" field in the Developer Dashboard._

```
https://github.com/MichaelvanLaar/hs-test-email-recipients/blob/main/PRIVACY.md
```

---

## 7. Screenshots

_Upload in this order for the best narrative flow:_

| #   | File                              | Caption suggestion                                              |
| --- | --------------------------------- | --------------------------------------------------------------- |
| 1   | `injected-list-selection-bar.png` | Fill recipients directly from the in-page bar — no popup needed |
| 2   | `pop-up-fill.png`                 | One-click fill from the extension popup                         |
| 3   | `pop-up-manage.png`               | Manage as many named recipient lists as you need                |

_Chrome Web Store accepts PNG or JPEG, 1280×800 or 640×400 px. Verify your screenshot dimensions before uploading._

---

## 8. Store icon

Use `icons/icon128.png` (128×128 px) — already in the repository.

---

## 9. Support URL _(optional)_

```
https://github.com/MichaelvanLaar/hs-test-email-recipients/issues
```

---

## 10. Homepage URL _(optional)_

```
https://github.com/MichaelvanLaar/hs-test-email-recipients
```

---

## 11. Single-purpose description

_Required field in the Developer Dashboard ("Does your extension have a single purpose?"). Enter a short plain-English sentence describing the one thing the extension does._

```
Fills the HubSpot test-email recipient field with pre-saved address lists.
```

---

## 12. Permission justifications

_Required fields in the Developer Dashboard → Privacy section. One field per permission._

### `storage`

```
The extension uses chrome.storage.local to save named recipient lists on the user's device. This is the core function of the extension — without storage, lists cannot be persisted between browser sessions. All data stays in the local browser profile and is never sent to any server or synced to a Google account.
```

### Host permission (`*://*.hubspot.com/*`)

```
The extension injects a small fill bar into HubSpot pages so it can detect when the "Send test email" dialog is open and populate the recipient field with a saved address list. Access to hubspot.com pages is required for the content script to operate. No data is read from HubSpot pages beyond detecting the presence of the recipient input field and writing addresses into it.
```
