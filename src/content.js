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
