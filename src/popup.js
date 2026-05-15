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

// ── Fill tab ──────────────────────────────────────────────────────────────────

let fillMode = "replace";

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

document.getElementById("go-to-manage").addEventListener("click", () => {
  switchTab("manage");
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
  switchTab("manage");
});

document.getElementById("new-set-name").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("add-set-btn").click();
});

// Init
renderFill();
