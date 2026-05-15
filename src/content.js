const FIELD_SELECTOR = '[data-test-id="email-user-recipients-select"]';
const nativeSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value",
).set;

let injectedBar = null;
let buildingBar = false;
let barMode = "replace";

// ── Storage (inlined — ES module imports are blocked by HubSpot's CSP) ───────

function getSets() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["sets"], (result) =>
      resolve(result["sets"] ?? []),
    );
  });
}

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
    showBarError(chrome.i18n.getMessage("inputNotFound"));
    return;
  }
  if (mode === "replace") {
    clearTags(fieldEl);
    await delay(100);
  }
  for (const email of emails) {
    await typeEmail(input, email);
  }
  nativeSetter.call(input, "");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.blur();
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
    const msg = document.createElement("span");
    msg.className = "hs-ext-bar-msg";
    const icon = document.createElement("img");
    icon.src = chrome.runtime.getURL("icons/icon16.png");
    icon.className = "hs-ext-bar-icon";
    icon.alt = "";
    msg.appendChild(icon);
    msg.appendChild(
      document.createTextNode(chrome.i18n.getMessage("barNoSets")),
    );
    bar.appendChild(msg);
    return bar;
  }

  const heading = document.createElement("span");
  heading.className = "hs-ext-bar-heading";
  heading.textContent = chrome.i18n.getMessage("barHeading");

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
    btn.textContent = chrome.i18n.getMessage(
      mode === "replace" ? "fillModeReplace" : "fillModeAppend",
    );
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
  fillBtn.textContent = chrome.i18n.getMessage("fillButton");
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

function removeBar() {
  injectedBar?.remove();
  injectedBar = null;
  buildingBar = false;
}

// ── MutationObserver ─────────────────────────────────────────────────────────

const observer = new MutationObserver(() => {
  const fieldEl = document.querySelector(FIELD_SELECTOR);
  if (fieldEl && !injectedBar && !buildingBar) {
    buildingBar = true;
    injectStylesheet();
    buildBar(fieldEl).then((bar) => {
      buildingBar = false;
      if (!fieldEl.isConnected) return;
      injectedBar = bar;
      fieldEl.insertAdjacentElement("afterend", bar);
    });
  } else if (!fieldEl && (injectedBar || buildingBar)) {
    removeBar();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// ── Popup message handler ────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  if (msg.action === "checkField") {
    sendResponse({ present: injectedBar !== null });
    return;
  }
  if (msg.action !== "fill") return;
  sendResponse({ ok: true }); // acknowledge before async work so sendMessage resolves
  const fieldEl = document.querySelector(FIELD_SELECTOR);
  if (!fieldEl) return;
  const mode = msg.mode === "append" ? "append" : "replace";
  fillRecipients(fieldEl, msg.emails, mode);
});
