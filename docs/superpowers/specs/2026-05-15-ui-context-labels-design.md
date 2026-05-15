# UI Context Labels — Design Spec

**Date:** 2026-05-15
**Status:** Approved

## Problem

The injected fill bar and the popup Fill tab provide no context for first-time users. Controls appear without explanation: the bar floats beneath the HubSpot recipient field with no label; the popup shows a dropdown and a toggle with no indication of what they operate on. The Fill tab also shows dead controls when no HubSpot recipient field is present.

## Goals

- Add just enough labelling so each surface is self-explanatory without adding visual noise.
- Show a useful informational state in the popup when the extension cannot act.

## Out of Scope

- Redesigning the layout of the Manage tab.
- Tooltip or onboarding flows.
- Any changes to fill behaviour or storage.

---

## Design

### 1. Fill bar — heading row

**Where:** The bar injected below HubSpot's test email recipient field (`content.js` → `buildBar()`).

**Change:** Add a short heading above the controls row.

- Text: `Use recipient list`
- Style: mixed case, muted (`#7c98b6`), 11 px, not all-caps
- Layout: bar switches from single-row flex to two-row column flex. Top row is the heading; bottom row is the existing `[select] [Replace/Append toggle] [Fill]` row.

**No change** to the "no sets" error message or the error/success message span.

---

### 2. Popup Fill tab — control labels (field present)

**Where:** `popup.html` Fill view (`#view-fill`), shown when the recipient field is detected.

**Change:** Add a small label above each control group.

- `Recipient list` — appears directly above the set `<select>`
- `Fill mode` — appears directly above the `[Replace/Append toggle] [Fill]` row

**Style:** new `.hs-field-label` CSS class — 11 px, `#7c98b6`, `font-weight: 500`, `display: block`, small bottom margin.

---

### 3. Popup Fill tab — informational state (no field detected)

**Where:** `popup.html` Fill view, shown when the recipient field is absent.

**Trigger:** On every `renderFill()` call the popup sends `{action: 'checkField'}` to the active tab's content script. The content script responds `{present: boolean}`. If the message throws (wrong page, script not injected), treat as `present: false`.

**When `present: false`:** Hide the fill controls; show:

> No recipient field found. Open HubSpot and the send test dialog to use this tab.
>
> **Go to Manage →** to set up recipient lists.

"Go to Manage →" is a clickable element that programmatically switches the popup to the Manage tab (same logic as the existing tab-click handler).

**When `present: true`:** Show the labelled fill controls (point 2). Hide the informational state.

**Style:** new `.hs-fill-info` class — 12 px, `#7c98b6`, line-height 1.5. The "Go to Manage →" element is a `<button>` styled as a link (`.hs-fill-info-link`) — `#00a4c4`, no border, no background, `cursor: pointer`.

---

## Files Changed

| File             | Change                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/content.js` | Add `checkField` message handler; update `buildBar()` for two-row layout                                       |
| `src/popup.html` | Add label elements; add empty-state markup in Fill view                                                        |
| `src/popup.js`   | `renderFill()` queries field presence and branches on result                                                   |
| `src/styles.css` | Add `.hs-field-label`, `.hs-fill-info`, `.hs-fill-info-link` rules; update `.hs-ext-fill-bar` to column layout |

## No New Dependencies

All changes are plain HTML/CSS/JS within the existing MV3 extension structure.
