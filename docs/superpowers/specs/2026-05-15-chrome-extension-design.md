# HubSpot Test Email Recipients — Chrome Extension Design

**Date:** 2026-05-15
**Status:** Approved

## Goal

A Chrome extension (Manifest V3) that lets users fill the HubSpot test-email recipient field with pre-defined named sets of email addresses stored in `chrome.storage.local`.

---

## User Flow

1. User opens HubSpot, clicks "Test-E-Mail senden" — the modal appears.
2. The extension's content script detects the recipient field and injects a compact row below it: a set-selector dropdown, a Replace/Append toggle, and a "Fill" button.
3. User picks a set, chooses Replace or Append, and clicks Fill — the emails are inserted as tags in the React Select field.
4. Alternatively, user clicks the extension toolbar icon to open the popup, which has the same Fill controls plus a Manage tab for creating/editing/deleting sets.

---

## Architecture

### Files

```
manifest.json          — MV3 manifest
src/
  content.js           — content script: observer, injected UI, field interaction
  popup.html           — toolbar popup HTML shell
  popup.js             — popup logic (fill + manage views)
  storage.js           — shared chrome.storage.local CRUD wrapper
  styles.css           — shared styles for injected UI and popup
icons/
  icon16.png
  icon48.png
  icon128.png
```

### Components

**`manifest.json`**

- `manifest_version: 3`
- `permissions: ["storage", "activeTab"]`
- `host_permissions: ["*://*.hubspot.com/*"]`
- Content script declared on `*://*.hubspot.com/*` with `"type": "module"` (enables ES module imports so `storage.js` is shared)
- `action` with popup pointing to `src/popup.html`

**`storage.js`** (imported by both content and popup)

- `getSets()` → `Promise<Set[]>`
- `saveSets(sets)` → `Promise<void>`
- `createSet(name, emails)` → `Promise<Set>`
- `updateSet(id, changes)` → `Promise<void>`
- `deleteSet(id)` → `Promise<void>`

Data shape:

```json
{
  "sets": [
    { "id": "uuid-v4", "name": "QA Team", "emails": ["a@x.com", "b@x.com"] }
  ]
}
```

**`content.js`**

- `MutationObserver` watches for `[data-test-id="email-user-recipients-select"]` to appear in the DOM (the modal is dynamically rendered).
- Once detected, injects the Fill UI row immediately below the field container.
- On Fill:
  1. If Replace: click each existing tag's `×` button to remove current recipients.
  2. For each email in the set, in sequence with ~100ms delay:
     - Focus the `<input>` inside the recipient select.
     - Set its value via `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, email)`.
     - Dispatch `new Event('input', { bubbles: true })`.
     - Dispatch `new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true })`.
- On modal close (field leaves DOM), remove injected UI and reset observer.
- Listens for `chrome.runtime.onMessage` from the popup's Fill action.

**`popup.html` / `popup.js`**

- Two tabs: **Fill** and **Manage**.
- **Fill tab**: set dropdown + Replace/Append toggle + Fill button → sends `{ action: 'fill', setId, mode }` message to active tab's content script.
- **Manage tab**:
  - List of sets with rename and delete buttons.
  - "Add set" button creates a new named set.
  - Each set expands to show its email list with add/remove controls.
  - All edits immediately persisted via `storage.js`.

**`styles.css`**

- Injected UI uses scoped class names (prefixed `hs-ext-`) to avoid HubSpot style collisions.
- Minimal, neutral styling that doesn't clash with HubSpot's teal/white design.

---

## Error Handling

- If the content script cannot find the recipient `<input>` when Fill is triggered, show a brief inline error message in the injected UI.
- If `chrome.storage.local` fails, surface error in the popup Manage tab.
- If no sets exist yet, the injected UI shows a "No sets — manage in extension popup" message instead of the dropdown.

---

## Constraints

- `chrome.storage.local` only — never `chrome.storage.sync` (addresses must stay on-device).
- MV3 only — no background page, no `chrome.extension.getBackgroundPage()`.
- No external network calls — the extension is fully local.
- No build toolchain required at launch — plain ES modules (`type: module` in content/popup scripts). A bundler can be added later if needed.

---

## Out of Scope

- Importing/exporting sets as JSON (can be added later).
- Validation of email format at input time (HubSpot already validates on submit).
- Supporting non-HubSpot pages.
