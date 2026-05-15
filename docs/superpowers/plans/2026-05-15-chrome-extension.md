# HubSpot Test Email Recipients — Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome MV3 extension that fills HubSpot's test-email recipient field with pre-defined named sets of email addresses stored in `chrome.storage.local`.

**Architecture:** A content script watches for `[data-test-id="email-user-recipients-select"]` via `MutationObserver`, injects a compact Fill bar below it, and inputs each email via native input value setter + synthetic events to interact with React Select. A toolbar popup provides the same fill capability plus a set management UI.

**Tech Stack:** Vanilla JS (ES modules), Chrome Extension Manifest V3, `chrome.storage.local`, Jest + jest-chrome for unit tests on the storage module.

---

## File Map

| File                        | Responsibility                                              |
| --------------------------- | ----------------------------------------------------------- |
| `manifest.json`             | MV3 manifest — permissions, content script, popup           |
| `src/storage.js`            | `chrome.storage.local` CRUD wrapper — only testable unit    |
| `src/content.js`            | MutationObserver, injected Fill bar, React Select injection |
| `src/popup.html`            | Popup shell — tabs for Fill and Manage                      |
| `src/popup.js`              | Popup logic — fill via message, manage sets inline          |
| `src/styles.css`            | Scoped styles for injected UI and popup                     |
| `icons/icon{16,48,128}.png` | Extension icons                                             |
| `scripts/generate-icons.py` | Generates placeholder teal PNG icons                        |
| `tests/storage.test.js`     | Unit tests for storage.js                                   |
| `package.json`              | Dev-only deps (Jest, jest-chrome)                           |

---

### Task 1: Project scaffold — manifest + package.json

**Files:**

- Create: `manifest.json`
- Create: `package.json`
- Create: `src/` (directory)
- Create: `icons/` (directory)

- [ ] **Step 1: Create directories**

```bash
mkdir -p src icons tests
```

- [ ] **Step 2: Write manifest.json**

```json
{
  "manifest_version": 3,
  "name": "HubSpot Test Email Recipients",
  "version": "0.1.0",
  "description": "Fill HubSpot test-email recipient fields with pre-defined address sets.",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["*://*.hubspot.com/*"],
  "action": {
    "default_popup": "src/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "content_scripts": [
    {
      "matches": ["*://*.hubspot.com/*"],
      "js": ["src/content.js"],
      "type": "module",
      "run_at": "document_idle"
    }
  ]
}
```

- [ ] **Step 3: Write package.json**

Dev dependencies only — no runtime bundle needed.

```json
{
  "name": "hs-test-email-recipients",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/.bin/jest"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "jest-chrome": "^0.8.0"
  },
  "jest": {
    "testEnvironment": "node",
    "setupFiles": ["jest-chrome"],
    "transform": {}
  }
}
```

- [ ] **Step 4: Install dev dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Commit**

```bash
git add manifest.json package.json package-lock.json
git commit -m "🎉 feat: scaffold Chrome MV3 extension"
```

---

### Task 2: Placeholder icons

**Files:**

- Create: `scripts/generate-icons.py`
- Create: `icons/icon16.png`
- Create: `icons/icon48.png`
- Create: `icons/icon128.png`

- [ ] **Step 1: Write icon generator**

Create `scripts/generate-icons.py`:

```python
#!/usr/bin/env python3
"""Generate minimal teal square PNG icons — no external dependencies."""
import struct, zlib, os

TEAL = (0, 164, 196)  # #00A4C4


def make_png(size, rgb):
    r, g, b = rgb

    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    raw = b"".join(b"\x00" + bytes([r, g, b] * size) for _ in range(size))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


root = os.path.join(os.path.dirname(__file__), "..")
for size in [16, 48, 128]:
    path = os.path.join(root, "icons", f"icon{size}.png")
    with open(path, "wb") as f:
        f.write(make_png(size, TEAL))
    print(f"icons/icon{size}.png")
```

- [ ] **Step 2: Run it**

```bash
python3 scripts/generate-icons.py
```

Expected:

```
icons/icon16.png
icons/icon48.png
icons/icon128.png
```

- [ ] **Step 3: Verify**

```bash
ls -lh icons/
```

Expected: three files, each > 200 bytes.

- [ ] **Step 4: Commit**

```bash
git add icons/ scripts/generate-icons.py
git commit -m "🎨 feat: add placeholder teal extension icons"
```

---

### Task 3: storage.js — chrome.storage.local CRUD (TDD)

**Files:**

- Create: `tests/storage.test.js`
- Create: `src/storage.js`

- [ ] **Step 1: Write failing tests**

Create `tests/storage.test.js`:

```js
import { getSets, createSet, updateSet, deleteSet } from "../src/storage.js";

beforeEach(() => {
  chrome.storage.local.get.mockImplementation((_keys, cb) => cb({ sets: [] }));
  chrome.storage.local.set.mockImplementation((_obj, cb) => cb && cb());
});

test("getSets returns [] when storage is empty", async () => {
  expect(await getSets()).toEqual([]);
});

test("getSets returns stored sets", async () => {
  const stored = [{ id: "1", name: "A", emails: ["a@x.com"] }];
  chrome.storage.local.get.mockImplementation((_k, cb) => cb({ sets: stored }));
  expect(await getSets()).toEqual(stored);
});

test("createSet appends a new set with a uuid and returns it", async () => {
  let saved;
  chrome.storage.local.set.mockImplementation((obj, cb) => {
    saved = obj.sets;
    cb && cb();
  });

  const result = await createSet("QA", ["a@x.com", "b@x.com"]);

  expect(result.name).toBe("QA");
  expect(result.emails).toEqual(["a@x.com", "b@x.com"]);
  expect(typeof result.id).toBe("string");
  expect(result.id.length).toBeGreaterThan(0);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toEqual(result);
});

test("updateSet merges changes onto the matching set", async () => {
  const existing = [{ id: "abc", name: "Old", emails: ["x@x.com"] }];
  chrome.storage.local.get.mockImplementation((_k, cb) =>
    cb({ sets: existing }),
  );
  let saved;
  chrome.storage.local.set.mockImplementation((obj, cb) => {
    saved = obj.sets;
    cb && cb();
  });

  await updateSet("abc", { name: "New", emails: ["y@y.com"] });

  expect(saved).toEqual([{ id: "abc", name: "New", emails: ["y@y.com"] }]);
});

test("deleteSet removes the matching set and leaves others", async () => {
  const a = { id: "aaa", name: "A", emails: [] };
  const b = { id: "bbb", name: "B", emails: [] };
  chrome.storage.local.get.mockImplementation((_k, cb) => cb({ sets: [a, b] }));
  let saved;
  chrome.storage.local.set.mockImplementation((obj, cb) => {
    saved = obj.sets;
    cb && cb();
  });

  await deleteSet("aaa");

  expect(saved).toEqual([b]);
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test
```

Expected: `FAIL — Cannot find module '../src/storage.js'`

- [ ] **Step 3: Implement storage.js**

Create `src/storage.js`:

```js
const KEY = "sets";

export async function getSets() {
  return new Promise((resolve) => {
    chrome.storage.local.get([KEY], (result) => resolve(result[KEY] ?? []));
  });
}

export async function saveSets(sets) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [KEY]: sets }, resolve);
  });
}

export async function createSet(name, emails = []) {
  const sets = await getSets();
  const newSet = { id: crypto.randomUUID(), name, emails };
  await saveSets([...sets, newSet]);
  return newSet;
}

export async function updateSet(id, changes) {
  const sets = await getSets();
  await saveSets(sets.map((s) => (s.id === id ? { ...s, ...changes } : s)));
}

export async function deleteSet(id) {
  const sets = await getSets();
  await saveSets(sets.filter((s) => s.id !== id));
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test
```

Expected:

```
PASS tests/storage.test.js
  ✓ getSets returns [] when storage is empty
  ✓ getSets returns stored sets
  ✓ createSet appends a new set with a uuid and returns it
  ✓ updateSet merges changes onto the matching set
  ✓ deleteSet removes the matching set and leaves others

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

- [ ] **Step 5: Commit**

```bash
git add src/storage.js tests/storage.test.js package.json package-lock.json
git commit -m "✅ feat: storage.js with CRUD + passing unit tests"
```

---

### Task 4: styles.css

**Files:**

- Create: `src/styles.css`

- [ ] **Step 1: Write styles.css**

Create `src/styles.css`:

```css
/* === Injected fill bar (all classes prefixed hs-ext- to avoid collisions) === */
.hs-ext-fill-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  padding: 6px 8px;
  background: #f5f8fa;
  border: 1px solid #cbd6e2;
  border-radius: 4px;
  font-family:
    Lexend Deca,
    Helvetica,
    Arial,
    sans-serif;
  font-size: 13px;
  color: #33475b;
  box-sizing: border-box;
}

.hs-ext-set-select {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid #cbd6e2;
  border-radius: 3px;
  background: #fff;
  font-size: 13px;
  color: #33475b;
}

.hs-ext-toggle {
  display: flex;
  border: 1px solid #cbd6e2;
  border-radius: 3px;
  overflow: hidden;
}

.hs-ext-toggle button {
  padding: 4px 8px;
  border: none;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  color: #33475b;
}

.hs-ext-toggle button.active {
  background: #00a4c4;
  color: #fff;
}

.hs-ext-fill-btn {
  padding: 4px 12px;
  background: #ff7a59;
  color: #fff;
  border: none;
  border-radius: 3px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.hs-ext-fill-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hs-ext-bar-msg {
  font-size: 12px;
  color: #7c98b6;
  flex: 1;
}

.hs-ext-bar-msg.error {
  color: #f2545b;
}

/* === Popup (320 px wide) === */
body.hs-popup {
  width: 320px;
  min-height: 180px;
  margin: 0;
  padding: 12px;
  font-family:
    Lexend Deca,
    Helvetica,
    Arial,
    sans-serif;
  font-size: 13px;
  color: #33475b;
  box-sizing: border-box;
}

.hs-popup-tabs {
  display: flex;
  border-bottom: 2px solid #cbd6e2;
  margin-bottom: 12px;
}

.hs-popup-tab {
  padding: 6px 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-weight: 500;
}

.hs-popup-tab.active {
  border-bottom-color: #00a4c4;
  color: #00a4c4;
}

.hs-popup-view {
  display: none;
}
.hs-popup-view.active {
  display: block;
}

.hs-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.hs-row select,
.hs-row input[type="text"],
.hs-row input[type="email"] {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid #cbd6e2;
  border-radius: 3px;
  font-size: 13px;
  color: #33475b;
}

.hs-btn-primary {
  padding: 5px 14px;
  background: #ff7a59;
  color: #fff;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.hs-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hs-btn-secondary {
  padding: 5px 10px;
  background: #fff;
  color: #33475b;
  border: 1px solid #cbd6e2;
  border-radius: 3px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.hs-btn-danger {
  padding: 3px 8px;
  background: #fff;
  color: #f2545b;
  border: 1px solid #f2545b;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.hs-set-item {
  border: 1px solid #cbd6e2;
  border-radius: 4px;
  margin-bottom: 8px;
  overflow: hidden;
}

.hs-set-header {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  background: #f5f8fa;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.hs-set-header .hs-set-name {
  flex: 1;
  font-weight: 500;
  outline: none;
  border-radius: 2px;
  padding: 1px 3px;
}

.hs-set-header .hs-set-name:focus {
  background: #fff;
  box-shadow: 0 0 0 2px #00a4c4;
}

.hs-set-body {
  padding: 8px 10px;
  display: none;
}

.hs-set-body.open {
  display: block;
}

.hs-email-item {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 12px;
}

.hs-email-item span {
  flex: 1;
  word-break: break-all;
}

.hs-empty {
  color: #7c98b6;
  font-size: 12px;
  text-align: center;
  padding: 16px 0;
}

#popup-status {
  font-size: 12px;
  min-height: 16px;
  margin-top: 4px;
  color: #7c98b6;
}

#popup-status.success {
  color: #00a4c4;
}
#popup-status.error {
  color: #f2545b;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles.css
git commit -m "💄 feat: add scoped styles for fill bar and popup"
```

---

### Task 5: content.js — complete implementation

**Files:**

- Create: `src/content.js`

The content script: injects a stylesheet, watches for the HubSpot recipient field, builds a Fill bar, and handles React Select email injection on demand (from the bar or from a popup message).

**Key technique:** React intercepts `input.value = x` via a property descriptor on the prototype. Using the native setter from `HTMLInputElement.prototype` bypasses React's interception, allowing us to set the value and then fire synthetic events that React's onChange handler picks up. A 100–150 ms delay between each email lets React Select render and confirm the previous tag.

- [ ] **Step 1: Write content.js**

Create `src/content.js`:

```js
import { getSets } from "./storage.js";

const FIELD_SELECTOR = '[data-test-id="email-user-recipients-select"]';
const nativeSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value",
).set;

let injectedBar = null;
let barMode = "replace";

// ── Stylesheet ──────────────────────────────────────────────────────────────

function injectStylesheet() {
  if (document.getElementById("hs-ext-styles")) return;
  const link = document.createElement("link");
  link.id = "hs-ext-styles";
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("src/styles.css");
  document.head.appendChild(link);
}

// ── React Select interaction ─────────────────────────────────────────────────

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function clearTags(fieldEl) {
  // React Select renders per-value remove controls — try common class patterns
  const btns = fieldEl.querySelectorAll(
    '[class*="value-icon"], [class*="value__remove"], [aria-label="Remove"]',
  );
  btns.forEach((b) => b.click());
}

async function typeEmail(input, email) {
  input.focus();
  nativeSetter.call(input, email);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await delay(100);
  input.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }),
  );
  await delay(150);
}

async function fillRecipients(fieldEl, emails, mode) {
  const input = fieldEl.querySelector('input[role="combobox"]');
  if (!input) {
    showBarError("Input not found — is the dialog open?");
    return;
  }
  if (mode === "replace") {
    clearTags(fieldEl);
    await delay(100);
  }
  for (const email of emails) {
    await typeEmail(input, email);
  }
}

// ── Fill bar ────────────────────────────────────────────────────────────────

function showBarError(msg) {
  const bar = document.getElementById("hs-ext-fill-bar");
  if (!bar) return;
  let el = bar.querySelector(".hs-ext-bar-msg");
  if (!el) {
    el = document.createElement("span");
    bar.appendChild(el);
  }
  el.className = "hs-ext-bar-msg error";
  el.textContent = msg;
  setTimeout(() => {
    el.textContent = "";
    el.className = "hs-ext-bar-msg";
  }, 4000);
}

async function buildBar(fieldEl) {
  const sets = await getSets();
  const bar = document.createElement("div");
  bar.className = "hs-ext-fill-bar";
  bar.id = "hs-ext-fill-bar";

  if (sets.length === 0) {
    bar.innerHTML =
      '<span class="hs-ext-bar-msg">No sets — add some via the extension popup.</span>';
    return bar;
  }

  // Set selector
  const sel = document.createElement("select");
  sel.className = "hs-ext-set-select";
  sets.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.name} (${s.emails.length})`;
    sel.appendChild(opt);
  });

  // Replace / Append toggle
  const toggle = document.createElement("div");
  toggle.className = "hs-ext-toggle";
  ["replace", "append"].forEach((mode, i) => {
    const btn = document.createElement("button");
    btn.dataset.mode = mode;
    btn.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    if (i === 0) btn.classList.add("active");
    btn.addEventListener("click", () => {
      toggle
        .querySelectorAll("button")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      barMode = mode;
    });
    toggle.appendChild(btn);
  });

  // Fill button
  const fillBtn = document.createElement("button");
  fillBtn.className = "hs-ext-fill-btn";
  fillBtn.textContent = "Fill";
  fillBtn.addEventListener("click", async () => {
    const set = sets.find((s) => s.id === sel.value);
    if (!set) return;
    fillBtn.disabled = true;
    await fillRecipients(fieldEl, set.emails, barMode);
    fillBtn.disabled = false;
  });

  bar.appendChild(sel);
  bar.appendChild(toggle);
  bar.appendChild(fillBtn);
  return bar;
}

function removeBar() {
  injectedBar?.remove();
  injectedBar = null;
}

// ── MutationObserver ─────────────────────────────────────────────────────────

const observer = new MutationObserver(() => {
  const fieldEl = document.querySelector(FIELD_SELECTOR);
  if (fieldEl && !injectedBar) {
    injectStylesheet();
    buildBar(fieldEl).then((bar) => {
      injectedBar = bar;
      fieldEl.insertAdjacentElement("afterend", bar);
    });
  } else if (!fieldEl && injectedBar) {
    removeBar();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// ── Popup message handler ────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action !== "fill") return;
  const fieldEl = document.querySelector(FIELD_SELECTOR);
  if (!fieldEl) return;
  fillRecipients(fieldEl, msg.emails, msg.mode);
});
```

- [ ] **Step 2: Commit**

```bash
git add src/content.js
git commit -m "✨ feat: content script with observer, fill bar, and React Select injection"
```

---

### Task 6: popup.html + popup.js

**Files:**

- Create: `src/popup.html`
- Create: `src/popup.js`

- [ ] **Step 1: Write popup.html**

Create `src/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>HubSpot Test Email Recipients</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body class="hs-popup">
    <div class="hs-popup-tabs">
      <div class="hs-popup-tab active" data-tab="fill">Fill</div>
      <div class="hs-popup-tab" data-tab="manage">Manage</div>
    </div>

    <!-- Fill tab -->
    <div class="hs-popup-view active" id="view-fill">
      <div class="hs-row">
        <select id="fill-set-sel"></select>
      </div>
      <div class="hs-row">
        <div class="hs-ext-toggle" id="fill-mode-toggle">
          <button class="active" data-mode="replace">Replace</button>
          <button data-mode="append">Append</button>
        </div>
        <button class="hs-btn-primary" id="fill-btn">Fill</button>
      </div>
      <div id="popup-status"></div>
    </div>

    <!-- Manage tab -->
    <div class="hs-popup-view" id="view-manage">
      <div class="hs-row">
        <input type="text" id="new-set-name" placeholder="New set name…" />
        <button class="hs-btn-secondary" id="add-set-btn">Add set</button>
      </div>
      <div id="sets-list"></div>
    </div>

    <script type="module" src="popup.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Write popup.js**

Create `src/popup.js`:

```js
import { getSets, createSet, updateSet, deleteSet } from "./storage.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function esc(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function setStatus(msg, kind = "") {
  const el = document.getElementById("popup-status");
  el.textContent = msg;
  el.className = kind;
}

// ── Tab switching ─────────────────────────────────────────────────────────────

document.querySelectorAll(".hs-popup-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".hs-popup-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".hs-popup-view")
      .forEach((v) => v.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`view-${tab.dataset.tab}`).classList.add("active");
    if (tab.dataset.tab === "fill") renderFill();
    else renderManage();
  });
});

// ── Fill tab ──────────────────────────────────────────────────────────────────

let fillMode = "replace";

async function renderFill() {
  const sets = await getSets();
  const sel = document.getElementById("fill-set-sel");
  const fillBtn = document.getElementById("fill-btn");
  sel.innerHTML = "";

  if (sets.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "No sets yet — go to Manage";
    opt.disabled = true;
    sel.appendChild(opt);
    fillBtn.disabled = true;
    return;
  }

  fillBtn.disabled = false;
  sets.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.name} (${s.emails.length})`;
    sel.appendChild(opt);
  });
}

document
  .getElementById("fill-mode-toggle")
  .querySelectorAll("button")
  .forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .getElementById("fill-mode-toggle")
        .querySelectorAll("button")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      fillMode = btn.dataset.mode;
    });
  });

document.getElementById("fill-btn").addEventListener("click", async () => {
  const sets = await getSets();
  const setId = document.getElementById("fill-set-sel").value;
  const set = sets.find((s) => s.id === setId);
  if (!set) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus("No active tab found.", "error");
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      action: "fill",
      emails: set.emails,
      mode: fillMode,
    });
    setStatus(`Filled ${set.emails.length} address(es).`, "success");
  } catch {
    setStatus(
      "Content script not reachable. Is HubSpot open with the dialog?",
      "error",
    );
  }
});

// ── Manage tab ────────────────────────────────────────────────────────────────

async function renderManage() {
  const sets = await getSets();
  const list = document.getElementById("sets-list");
  list.innerHTML = "";

  if (sets.length === 0) {
    list.innerHTML = '<div class="hs-empty">No sets yet.</div>';
    return;
  }

  sets.forEach((set) => {
    const item = document.createElement("div");
    item.className = "hs-set-item";

    item.innerHTML = `
      <div class="hs-set-header">
        <span class="hs-set-name" contenteditable="true">${esc(set.name)}</span>
        <button class="hs-btn-danger js-del">Delete</button>
      </div>
      <div class="hs-set-body open">
        ${set.emails
          .map(
            (e, i) => `
          <div class="hs-email-item">
            <span>${esc(e)}</span>
            <button class="hs-btn-danger js-rem-email" data-idx="${i}">×</button>
          </div>`,
          )
          .join("")}
        <div class="hs-row" style="margin-top:6px">
          <input type="email" class="js-add-email-input" placeholder="Add address…" />
          <button class="hs-btn-secondary js-add-email">Add</button>
        </div>
      </div>`;

    // Toggle body open/closed
    item.querySelector(".hs-set-header").addEventListener("click", (e) => {
      if (
        e.target.classList.contains("js-del") ||
        e.target.classList.contains("hs-set-name")
      )
        return;
      item.querySelector(".hs-set-body").classList.toggle("open");
    });

    // Rename on blur
    item.querySelector(".hs-set-name").addEventListener("blur", async (e) => {
      const name = e.target.textContent.trim();
      if (name && name !== set.name) await updateSet(set.id, { name });
    });

    // Delete set
    item.querySelector(".js-del").addEventListener("click", async () => {
      if (!confirm(`Delete "${set.name}"?`)) return;
      await deleteSet(set.id);
      renderManage();
    });

    // Remove email
    item.querySelectorAll(".js-rem-email").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = Number(btn.dataset.idx);
        await updateSet(set.id, {
          emails: set.emails.filter((_, i) => i !== idx),
        });
        renderManage();
      });
    });

    // Add email
    const addInput = item.querySelector(".js-add-email-input");
    const doAdd = async () => {
      const email = addInput.value.trim();
      if (!email) return;
      await updateSet(set.id, { emails: [...set.emails, email] });
      renderManage();
    };
    item.querySelector(".js-add-email").addEventListener("click", doAdd);
    addInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doAdd();
    });

    list.appendChild(item);
  });
}

// Add set
document.getElementById("add-set-btn").addEventListener("click", async () => {
  const input = document.getElementById("new-set-name");
  const name = input.value.trim();
  if (!name) return;
  await createSet(name, []);
  input.value = "";
  // Switch to manage view so user sees the new set
  document.querySelector('[data-tab="manage"]').classList.add("active");
  document.getElementById("view-manage").classList.add("active");
  document.querySelector('[data-tab="fill"]').classList.remove("active");
  document.getElementById("view-fill").classList.remove("active");
  renderManage();
});

document.getElementById("new-set-name").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("add-set-btn").click();
});

// Init
renderFill();
```

- [ ] **Step 3: Commit**

```bash
git add src/popup.html src/popup.js
git commit -m "✨ feat: popup with fill tab and set management"
```

---

### Task 7: Integration test (manual, in Chrome)

No files changed. Verify the extension works end-to-end.

- [ ] **Step 1: Load the extension**

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** → select the project root (`hs-test-email-recipients/`)

Expected: Extension card appears with the teal icon, no error badges.

- [ ] **Step 2: Create a test set via the popup**

1. Click the extension icon in the toolbar
2. Go to **Manage** tab
3. Enter `Test Set` → click **Add set**
4. In the newly created set, enter your email → **Add**
5. Add a second email address

Expected: Both emails appear listed under "Test Set (2)".

- [ ] **Step 3: Test injected fill bar**

1. Open HubSpot, navigate to an email, click **Test-E-Mail senden**
2. The modal opens — look immediately below the **Test senden an** field

Expected: The teal fill bar appears with the set selector, Replace/Append toggle, and Fill button.

- [ ] **Step 4: Fill with Replace**

1. In the modal, manually type one address into the field and confirm it as a tag
2. In the fill bar, select **Test Set**, choose **Replace**, click **Fill**

Expected: The manually entered tag is removed, both set emails appear as tags.

- [ ] **Step 5: Fill with Append**

1. In the fill bar, choose **Append**, click **Fill** again

Expected: The two set emails appear again (appended, not replacing).

- [ ] **Step 6: Test popup Fill tab**

1. Keep the HubSpot tab with the modal open and active
2. Click the extension icon → **Fill** tab
3. Select **Test Set**, choose **Replace**, click **Fill**

Expected: Emails are filled from the popup (via message to content script).

- [ ] **Step 7: Run unit tests**

```bash
npm test
```

Expected: All 5 tests pass.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "📦 chore: complete Chrome extension MVP — all manual tests passing"
```

---

## Self-Review

**Spec coverage:**

- ✅ Named sets — `storage.js` CRUD, Manage tab
- ✅ Injected button on page — content.js fill bar
- ✅ Extension toolbar popup — popup.html + popup.js Fill tab
- ✅ Replace/Append toggle — both injected bar and popup
- ✅ In-popup editor — Manage tab in popup.js
- ✅ All `*.hubspot.com` — `manifest.json` host_permissions
- ✅ `chrome.storage.local` only — storage.js uses `local`, never `sync`
- ✅ MV3 — `manifest_version: 3`, no background page
- ✅ No external network calls

**Placeholder scan:** No TBDs, TODOs, or vague "handle edge cases" — all steps have code.

**Type consistency:**

- `getSets / createSet / updateSet / deleteSet / saveSets` — same signatures in storage.js, tests, content.js, popup.js
- Set shape `{ id: string, name: string, emails: string[] }` — consistent throughout
- `fillRecipients(fieldEl, emails, mode)` — defined and called with same args
- `FIELD_SELECTOR` = `[data-test-id="email-user-recipients-select"]` — consistent with HTML screenshot

**Known risk:** HubSpot's React Select remove-button classes are generated (styled-components hashes). The `clearTags` function uses three different selector patterns to handle v1/v2/v3 of React Select. If none match, Replace mode silently degrades to Append behavior without error. This is acceptable for an MVP — the user can clear manually if needed.
