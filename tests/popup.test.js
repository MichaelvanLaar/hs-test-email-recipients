/**
 * @jest-environment jsdom
 */

import { jest } from "@jest/globals";
import { chrome } from "jest-chrome";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── 1. Register storage mock before popup.js is imported ─────────────────────
const mockGetSets = jest.fn();
const mockCreateSet = jest.fn();
const mockUpdateSet = jest.fn();
const mockDeleteSet = jest.fn();

jest.unstable_mockModule("../src/storage.js", () => ({
  getSets: mockGetSets,
  createSet: mockCreateSet,
  updateSet: mockUpdateSet,
  deleteSet: mockDeleteSet,
}));

// ── 2. Build DOM from popup.html before module init runs ──────────────────────
const htmlSource = readFileSync(join(__dirname, "../src/popup.html"), "utf-8");
document.body.innerHTML = htmlSource.match(/<body[^>]*>([\s\S]*?)<\/body>/i)[1];
document.body.className = "hs-popup";

// ── 3. Configure base chrome + storage mocks ──────────────────────────────────
chrome.i18n.getMessage.mockImplementation((key) => key);
chrome.tabs.query.mockResolvedValue([{ id: 42 }]);
chrome.tabs.sendMessage.mockResolvedValue({ present: false });
mockGetSets.mockResolvedValue([]);
mockCreateSet.mockImplementation(async (name, emails) => ({
  id: "t1",
  name,
  emails,
}));
mockUpdateSet.mockResolvedValue(undefined);
mockDeleteSet.mockResolvedValue(undefined);
window.confirm = jest.fn().mockReturnValue(true);

// ── 4. Import popup.js — runs module-level init against the prepared DOM ──────
await import("../src/popup.js");
// Flush the initial async renderFill() call
await new Promise((r) => setTimeout(r, 0));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Flush microtask + macrotask queue so async renders settle */
function flush() {
  return new Promise((r) => setTimeout(r, 0));
}

function clickTab(name) {
  document.querySelector(`[data-tab="${name}"]`).click();
}

function activeTabName() {
  return document.querySelector(".hs-popup-tab.active")?.dataset.tab;
}

function isViewActive(name) {
  return document.getElementById(`view-${name}`)?.classList.contains("active");
}

/** Re-apply base mock implementations after jest.clearAllMocks() */
function resetMocks() {
  chrome.i18n.getMessage.mockImplementation((key) => key);
  chrome.tabs.query.mockResolvedValue([{ id: 42 }]);
  chrome.tabs.sendMessage.mockResolvedValue({ present: false });
  mockGetSets.mockResolvedValue([]);
  mockCreateSet.mockImplementation(async (name, emails) => ({
    id: "t1",
    name,
    emails,
  }));
  mockUpdateSet.mockResolvedValue(undefined);
  mockDeleteSet.mockResolvedValue(undefined);
  window.confirm.mockReturnValue(true);
}

beforeEach(() => {
  jest.clearAllMocks();
  resetMocks();
});

// ── Mock sanity check ─────────────────────────────────────────────────────────
// If this fails, jest.unstable_mockModule path resolution is broken and the
// real storage.js is being called instead of the mock.
describe("mock wiring", () => {
  test("storage mock is called when manage tab triggers renderManage", async () => {
    clickTab("manage");
    await flush();
    expect(mockGetSets).toHaveBeenCalled();
  });
});

// ── i18n ──────────────────────────────────────────────────────────────────────
describe("applyI18n", () => {
  test("data-i18n elements receive the message key as text content", () => {
    expect(document.querySelector("[data-tab='fill']").textContent.trim()).toBe(
      "tabFill",
    );
    expect(
      document.querySelector("[data-tab='manage']").textContent.trim(),
    ).toBe("tabManage");
  });

  test("data-i18n-placeholder elements receive the key as placeholder", () => {
    expect(document.getElementById("new-set-name").placeholder).toBe(
      "newSetNamePlaceholder",
    );
  });
});

// ── Tab switching ─────────────────────────────────────────────────────────────
describe("tab switching", () => {
  beforeEach(async () => {
    clickTab("fill");
    await flush();
  });

  test("fill tab is active by default", () => {
    expect(activeTabName()).toBe("fill");
    expect(isViewActive("fill")).toBe(true);
    expect(isViewActive("manage")).toBe(false);
  });

  test("clicking manage tab activates manage view and deactivates fill", async () => {
    clickTab("manage");
    await flush();
    expect(activeTabName()).toBe("manage");
    expect(isViewActive("manage")).toBe(true);
    expect(isViewActive("fill")).toBe(false);
  });

  test("clicking fill tab after manage reactivates fill view", async () => {
    clickTab("manage");
    await flush();
    clickTab("fill");
    await flush();
    expect(activeTabName()).toBe("fill");
    expect(isViewActive("fill")).toBe(true);
    expect(isViewActive("manage")).toBe(false);
  });
});

// ── Fill tab — field absent ───────────────────────────────────────────────────
describe("fill tab — no recipient field detected", () => {
  beforeEach(async () => {
    chrome.tabs.sendMessage.mockResolvedValue({ present: false });
    clickTab("manage");
    await flush();
    clickTab("fill");
    await flush();
  });

  test("shows fill-info panel", () => {
    expect(document.getElementById("fill-info").hidden).toBe(false);
  });

  test("hides fill-controls panel", () => {
    expect(document.getElementById("fill-controls").hidden).toBe(true);
  });
});

// ── Fill tab — field present, sets available ──────────────────────────────────
describe("fill tab — recipient field detected, sets available", () => {
  const sets = [
    { id: "a", name: "Team A", emails: ["alice@x.com", "bob@x.com"] },
    { id: "b", name: "Team B", emails: ["carol@x.com"] },
  ];

  beforeEach(async () => {
    chrome.tabs.sendMessage.mockResolvedValue({ present: true });
    mockGetSets.mockResolvedValue(sets);
    clickTab("manage");
    await flush();
    clickTab("fill");
    await flush();
  });

  test("hides fill-info panel", () => {
    expect(document.getElementById("fill-info").hidden).toBe(true);
  });

  test("shows fill-controls panel", () => {
    expect(document.getElementById("fill-controls").hidden).toBe(false);
  });

  test("populates select with one option per set", () => {
    const opts = document.getElementById("fill-set-sel").options;
    expect(opts).toHaveLength(2);
    expect(opts[0].textContent).toContain("Team A");
    expect(opts[0].textContent).toContain("(2)");
    expect(opts[1].textContent).toContain("Team B");
    expect(opts[1].textContent).toContain("(1)");
  });

  test("fill button is enabled when sets are available", () => {
    expect(document.getElementById("fill-btn").disabled).toBe(false);
  });
});

// ── Fill tab — field present, no sets configured ──────────────────────────────
describe("fill tab — field present but no sets configured", () => {
  beforeEach(async () => {
    chrome.tabs.sendMessage.mockResolvedValue({ present: true });
    mockGetSets.mockResolvedValue([]);
    clickTab("manage");
    await flush();
    clickTab("fill");
    await flush();
  });

  test("fill button is disabled when no sets exist", () => {
    expect(document.getElementById("fill-btn").disabled).toBe(true);
  });
});

// ── Fill mode toggle ──────────────────────────────────────────────────────────
describe("fill mode toggle", () => {
  function getToggleButtons() {
    return [
      ...document.getElementById("fill-mode-toggle").querySelectorAll("button"),
    ];
  }

  beforeEach(() => {
    // Always start from replace mode so tests are order-independent
    document.querySelector("[data-mode='replace']").click();
  });

  test("replace button is active by default", () => {
    const [replace, append] = getToggleButtons();
    expect(replace.classList.contains("active")).toBe(true);
    expect(append.classList.contains("active")).toBe(false);
  });

  test("clicking append makes it active and replace inactive", () => {
    const [replace, append] = getToggleButtons();
    append.click();
    expect(append.classList.contains("active")).toBe(true);
    expect(replace.classList.contains("active")).toBe(false);
  });

  test("clicking replace after append restores it as active", () => {
    const [replace, append] = getToggleButtons();
    append.click();
    replace.click();
    expect(replace.classList.contains("active")).toBe(true);
    expect(append.classList.contains("active")).toBe(false);
  });
});

// ── Fill button ───────────────────────────────────────────────────────────────
describe("fill button", () => {
  const sets = [
    { id: "s1", name: "QA", emails: ["qa@test.com", "dev@test.com"] },
  ];

  async function renderFillWithField() {
    chrome.tabs.sendMessage.mockResolvedValue({ present: true });
    mockGetSets.mockResolvedValue(sets);
    clickTab("manage");
    await flush();
    clickTab("fill");
    await flush();
    // Reset sendMessage so the fill click is what we observe
    chrome.tabs.sendMessage.mockResolvedValue(undefined);
  }

  test("sends fill action with the selected set's emails in replace mode", async () => {
    document.querySelector("[data-mode='replace']").click();
    await renderFillWithField();
    document.getElementById("fill-btn").click();
    await flush();
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(42, {
      action: "fill",
      emails: ["qa@test.com", "dev@test.com"],
      mode: "replace",
    });
  });

  test("sends fill action in append mode when toggled", async () => {
    document.querySelector("[data-mode='replace']").click();
    await renderFillWithField();
    document.querySelector("[data-mode='append']").click();
    document.getElementById("fill-btn").click();
    await flush();
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(42, {
      action: "fill",
      emails: ["qa@test.com", "dev@test.com"],
      mode: "append",
    });
  });

  test("shows success status after a successful fill", async () => {
    document.querySelector("[data-mode='replace']").click();
    chrome.i18n.getMessage.mockImplementation((key, subs) => {
      if (key === "filledMany") return `Filled ${subs[0]} addresses.`;
      return key;
    });
    await renderFillWithField();
    document.getElementById("fill-btn").click();
    await flush();
    const status = document.getElementById("popup-status");
    expect(status.className).toBe("success");
    expect(status.textContent).toContain("2");
  });

  test("shows error status when content script is not reachable", async () => {
    document.querySelector("[data-mode='replace']").click();
    await renderFillWithField();
    chrome.tabs.sendMessage.mockRejectedValue(
      new Error("Could not establish connection"),
    );
    document.getElementById("fill-btn").click();
    await flush();
    expect(document.getElementById("popup-status").className).toBe("error");
  });
});

// ── Go to Manage link ─────────────────────────────────────────────────────────
describe("go-to-manage link", () => {
  beforeEach(async () => {
    chrome.tabs.sendMessage.mockResolvedValue({ present: false });
    clickTab("manage");
    await flush();
    clickTab("fill");
    await flush();
  });

  test("clicking the link switches to the manage tab", async () => {
    mockGetSets.mockResolvedValue([]);
    document.getElementById("go-to-manage").click();
    await flush();
    expect(activeTabName()).toBe("manage");
    expect(isViewActive("manage")).toBe(true);
  });
});

// ── Manage tab — rendering ────────────────────────────────────────────────────
describe("manage tab — rendering", () => {
  async function goToManage() {
    clickTab("fill");
    await flush();
    clickTab("manage");
    await flush();
  }

  test("shows empty-state when no sets exist", async () => {
    mockGetSets.mockResolvedValue([]);
    await goToManage();
    expect(
      document.getElementById("sets-list").querySelector(".hs-empty"),
    ).not.toBeNull();
  });

  test("renders one card per set", async () => {
    mockGetSets.mockResolvedValue([
      { id: "x", name: "X", emails: [] },
      { id: "y", name: "Y", emails: ["a@b.com"] },
    ]);
    await goToManage();
    expect(document.querySelectorAll(".hs-set-item")).toHaveLength(2);
  });

  test("displays email addresses inside a set card", async () => {
    mockGetSets.mockResolvedValue([
      { id: "z", name: "Z", emails: ["foo@bar.com"] },
    ]);
    await goToManage();
    expect(document.getElementById("sets-list").textContent).toContain(
      "foo@bar.com",
    );
  });

  test("displays the set name in the card header", async () => {
    mockGetSets.mockResolvedValue([{ id: "n", name: "Named Set", emails: [] }]);
    await goToManage();
    expect(document.querySelector(".hs-set-name").textContent.trim()).toBe(
      "Named Set",
    );
  });
});

// ── Add set ───────────────────────────────────────────────────────────────────
describe("add set", () => {
  beforeEach(async () => {
    mockGetSets.mockResolvedValue([]);
    clickTab("fill");
    await flush();
    clickTab("manage");
    await flush();
  });

  test("calls createSet with the typed name", async () => {
    document.getElementById("new-set-name").value = "Beta Testers";
    document.getElementById("add-set-btn").click();
    await flush();
    expect(mockCreateSet).toHaveBeenCalledWith("Beta Testers", []);
  });

  test("pressing Enter in the name field triggers createSet", async () => {
    document.getElementById("new-set-name").value = "Keyboard Set";
    document
      .getElementById("new-set-name")
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    await flush();
    expect(mockCreateSet).toHaveBeenCalledWith("Keyboard Set", []);
  });

  test("does not call createSet when name is blank", async () => {
    document.getElementById("new-set-name").value = "   ";
    document.getElementById("add-set-btn").click();
    await flush();
    expect(mockCreateSet).not.toHaveBeenCalled();
  });

  test("clears the name input after adding", async () => {
    document.getElementById("new-set-name").value = "Some Set";
    document.getElementById("add-set-btn").click();
    await flush();
    expect(document.getElementById("new-set-name").value).toBe("");
  });

  test("stays on manage tab after adding a set", async () => {
    document.getElementById("new-set-name").value = "New";
    document.getElementById("add-set-btn").click();
    await flush();
    expect(activeTabName()).toBe("manage");
  });
});

// ── Delete set ────────────────────────────────────────────────────────────────
describe("delete set", () => {
  const set = { id: "del1", name: "To Delete", emails: [] };

  async function renderWithOneSet() {
    mockGetSets.mockResolvedValue([set]);
    clickTab("fill");
    await flush();
    clickTab("manage");
    await flush();
  }

  test("calls deleteSet with the set id after confirm", async () => {
    await renderWithOneSet();
    document.querySelector(".js-del").click();
    await flush();
    expect(mockDeleteSet).toHaveBeenCalledWith("del1");
  });

  test("does not call deleteSet when the user cancels confirm", async () => {
    await renderWithOneSet();
    window.confirm.mockReturnValue(false);
    document.querySelector(".js-del").click();
    await flush();
    expect(mockDeleteSet).not.toHaveBeenCalled();
  });
});
