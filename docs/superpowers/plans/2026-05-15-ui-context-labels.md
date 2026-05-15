# UI Context Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a heading to the injected fill bar, control labels to the popup Fill tab, and an informational empty state when no HubSpot recipient field is detected.

**Architecture:** Four isolated changes across four files. CSS classes are added first so later tasks can reference them. The only new behaviour is `checkField` message passing between popup and content script — the popup sends the message on every `renderFill()` call and branches on the response.

**Tech Stack:** Vanilla JS ES modules, Chrome MV3 APIs (`chrome.runtime.onMessage`, `chrome.tabs.sendMessage`), Jest 29 + jest-chrome for unit tests.

---

## File Map

| File                    | What changes                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles.css`        | Column layout for fill bar; new `.hs-ext-bar-heading`, `.hs-ext-bar-controls`, `.hs-field-label`, `.hs-fill-info`, `.hs-fill-info-link` classes |
| `src/content.js`        | `buildBar()` gets heading + controls row; message listener gains `checkField` handler                                                           |
| `src/popup.html`        | Fill view gets `#fill-info` empty-state block, `#fill-controls` wrapper, and `.hs-field-label` labels                                           |
| `src/popup.js`          | New `switchTab()` helper; new `checkActiveTabField()` helper; `renderFill()` branches on field presence; `#go-to-manage` handler                |
| `tests/content.test.js` | New — tests `checkField` message handler                                                                                                        |

---

## Task 1: CSS — column layout and new utility classes

**Files:**

- Modify: `src/styles.css`

- [ ] **Step 1: Replace the fill bar rule with a column-flex version**

  Find and replace the entire `.hs-ext-fill-bar` block in `src/styles.css`:

  ```css
  .hs-ext-fill-bar {
    display: flex;
    flex-direction: column;
    gap: 5px;
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
  ```

- [ ] **Step 2: Add heading and controls-row classes directly after `.hs-ext-fill-bar`**

  ```css
  .hs-ext-bar-heading {
    font-size: 11px;
    color: #7c98b6;
    font-weight: 500;
  }

  .hs-ext-bar-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  ```

- [ ] **Step 3: Add popup label and info-state classes at the end of the file (before the last closing comment if any)**

  ```css
  .hs-field-label {
    font-size: 11px;
    color: #7c98b6;
    font-weight: 500;
    display: block;
    margin-bottom: 3px;
  }

  .hs-fill-info {
    font-size: 12px;
    color: #7c98b6;
    line-height: 1.5;
    padding: 4px 0;
  }

  .hs-fill-info p {
    margin: 0 0 6px;
  }

  .hs-fill-info p:last-child {
    margin-bottom: 0;
  }

  .hs-fill-info-link {
    background: none;
    border: none;
    padding: 0;
    color: #00a4c4;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    font-weight: 500;
  }
  ```

- [ ] **Step 4: Run existing tests to confirm nothing broke**

  ```
  npm test
  ```

  Expected: all existing tests pass (storage tests only at this point).

- [ ] **Step 5: Commit**

  ```bash
  git add src/styles.css
  git commit -m "💄 style: add fill bar column layout and context label classes"
  ```

---

## Task 2: content.js — heading row and checkField handler

**Files:**

- Modify: `src/content.js`
- Create: `tests/content.test.js`

- [ ] **Step 1: Install jest-environment-jsdom**

  ```bash
  npm install --save-dev jest-environment-jsdom
  ```

  Expected output: package-lock.json updated, no errors.

- [ ] **Step 2: Write the failing test**

  Create `tests/content.test.js`:

  ```js
  /**
   * @jest-environment jsdom
   */
  import { chrome } from "jest-chrome";

  // Stub chrome.runtime.getURL so the stylesheet injection doesn't throw
  chrome.runtime.getURL.mockReturnValue(
    "chrome-extension://fake/src/styles.css",
  );

  // Stub chrome.storage.local.get so getSets() (inlined in content.js) resolves to []
  chrome.storage.local.get.mockImplementation((_keys, cb) => cb({ sets: [] }));

  // Import after stubs are in place
  const { default: _contentModule } = await import("../src/content.js");

  describe("checkField message handler", () => {
    function callListener(msg) {
      return new Promise((resolve) => {
        const listeners = chrome.runtime.onMessage.getListeners();
        for (const listener of listeners) {
          listener(msg, {}, resolve);
        }
      });
    }

    test("responds with present: false when injectedBar is null", async () => {
      const res = await callListener({ action: "checkField" });
      expect(res).toEqual({ present: false });
    });
  });
  ```

- [ ] **Step 3: Run the test to verify it fails**

  ```bash
  npm test -- tests/content.test.js
  ```

  Expected: FAIL — either import error (no `checkField` branch yet) or the response is undefined.

- [ ] **Step 4: Add the checkField handler to the message listener in content.js**

  Find the existing `chrome.runtime.onMessage.addListener` block at the bottom of `src/content.js` and replace it:

  ```js
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "checkField") {
      sendResponse({ present: injectedBar !== null });
      return;
    }
    if (msg.action !== "fill") return;
    sendResponse({ ok: true }); // acknowledge before async work so sendMessage resolves
    const fieldEl = document.querySelector(FIELD_SELECTOR);
    if (!fieldEl) return;
    fillRecipients(fieldEl, msg.emails, msg.mode);
  });
  ```

- [ ] **Step 5: Run the test to verify it passes**

  ```bash
  npm test -- tests/content.test.js
  ```

  Expected: PASS — `checkField` returns `{ present: false }` when no bar is injected.

- [ ] **Step 6: Update buildBar() to use a heading + controls row**

  Replace the entire `buildBar` function in `src/content.js`:

  ```js
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

    const heading = document.createElement("span");
    heading.className = "hs-ext-bar-heading";
    heading.textContent = "Use recipient list";

    const controls = document.createElement("div");
    controls.className = "hs-ext-bar-controls";

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

    controls.appendChild(sel);
    controls.appendChild(toggle);
    controls.appendChild(fillBtn);

    bar.appendChild(heading);
    bar.appendChild(controls);
    return bar;
  }
  ```

- [ ] **Step 7: Run all tests**

  ```bash
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 8: Commit**

  ```bash
  git add src/content.js tests/content.test.js package.json package-lock.json
  git commit -m "✨ feat: add fill bar heading row and checkField message handler"
  ```

---

## Task 3: popup.html — labels and empty-state markup

**Files:**

- Modify: `src/popup.html`

- [ ] **Step 1: Replace the Fill view markup**

  Find the `<!-- Fill tab -->` section in `src/popup.html` and replace it entirely:

  ```html
  <!-- Fill tab -->
  <div class="hs-popup-view active" id="view-fill">
    <!-- Shown when no recipient field is detected on the active tab -->
    <div id="fill-info" class="hs-fill-info" hidden>
      <p>
        No recipient field found. Open HubSpot and the send test dialog to use
        this tab.
      </p>
      <p>
        <button class="hs-fill-info-link" id="go-to-manage">
          Go to Manage →
        </button>
        to set up recipient lists.
      </p>
    </div>
    <!-- Shown when a recipient field is detected -->
    <div id="fill-controls" hidden>
      <label class="hs-field-label" for="fill-set-sel">Recipient list</label>
      <div class="hs-row">
        <select id="fill-set-sel"></select>
      </div>
      <label class="hs-field-label">Fill mode</label>
      <div class="hs-row">
        <div class="hs-ext-toggle" id="fill-mode-toggle">
          <button class="active" data-mode="replace">Replace</button>
          <button data-mode="append">Append</button>
        </div>
        <button class="hs-btn-primary" id="fill-btn">Fill</button>
      </div>
    </div>
    <div id="popup-status"></div>
  </div>
  ```

- [ ] **Step 2: Run existing tests**

  ```bash
  npm test
  ```

  Expected: all tests pass (HTML changes don't affect unit tests).

- [ ] **Step 3: Commit**

  ```bash
  git add src/popup.html
  git commit -m "✨ feat: add popup fill tab labels and informational empty state markup"
  ```

---

## Task 4: popup.js — field detection, branching, and tab switching

**Files:**

- Modify: `src/popup.js`

- [ ] **Step 1: Extract a switchTab() helper**

  Find the tab-switching `forEach` near the top of `src/popup.js` and replace it:

  ```js
  // ── Tab switching ─────────────────────────────────────────────────────────────

  function switchTab(name) {
    document
      .querySelectorAll(".hs-popup-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".hs-popup-view")
      .forEach((v) => v.classList.remove("active"));
    document.querySelector(`[data-tab="${name}"]`).classList.add("active");
    document.getElementById(`view-${name}`).classList.add("active");
    if (name === "fill") renderFill();
    else renderManage();
  }

  document.querySelectorAll(".hs-popup-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });
  ```

- [ ] **Step 2: Add checkActiveTabField() before renderFill()**

  Insert this function between the tab-switching block and the `// ── Fill tab` comment:

  ```js
  async function checkActiveTabField() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return false;
    try {
      const res = await chrome.tabs.sendMessage(tab.id, {
        action: "checkField",
      });
      return res?.present === true;
    } catch {
      return false;
    }
  }
  ```

- [ ] **Step 3: Replace renderFill() with the branching version**

  Replace the existing `async function renderFill()` with:

  ```js
  async function renderFill() {
    const present = await checkActiveTabField();
    const infoEl = document.getElementById("fill-info");
    const controlsEl = document.getElementById("fill-controls");

    if (!present) {
      infoEl.hidden = false;
      controlsEl.hidden = true;
      return;
    }

    infoEl.hidden = true;
    controlsEl.hidden = false;

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
  ```

- [ ] **Step 4: Wire up the "Go to Manage →" button**

  Add this event listener after the `fill-mode-toggle` block (before the `fill-btn` listener):

  ```js
  document.getElementById("go-to-manage").addEventListener("click", () => {
    switchTab("manage");
  });
  ```

- [ ] **Step 5: Run all tests**

  ```bash
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 6: Manual verification — informational state**

  Load the extension in Chrome (`chrome://extensions` → Load unpacked → select repo root).

  Open any non-HubSpot page (e.g. `chrome://newtab`), click the extension icon. The Fill tab should show:

  > No recipient field found. Open HubSpot and the send test dialog to use this tab.
  > Go to Manage → to set up recipient lists.

  Click "Go to Manage →" — the popup should switch to the Manage tab.

- [ ] **Step 7: Manual verification — fill controls with labels**

  Open HubSpot, trigger the send test email dialog so the recipient field appears. Click the extension icon. The Fill tab should show "Recipient list" label above the set dropdown and "Fill mode" label above the toggle.

- [ ] **Step 8: Manual verification — fill bar heading**

  With the send test email dialog open, the injected bar below the recipient field should show "Use recipient list" on its own line above the `[select] [Replace/Append] [Fill]` row.

- [ ] **Step 9: Commit**

  ```bash
  git add src/popup.js
  git commit -m "✨ feat: popup fill tab detects field presence and shows labels or info state"
  ```
