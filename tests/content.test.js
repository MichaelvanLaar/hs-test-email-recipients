/**
 * @jest-environment jsdom
 */
import { chrome } from "jest-chrome";

chrome.runtime.getURL.mockReturnValue("chrome-extension://fake/src/styles.css");
chrome.storage.local.get.mockImplementation((_keys, cb) => cb({ sets: [] }));
chrome.i18n.getMessage.mockImplementation((key) => key);

await import("../src/content.js");

// ── Helpers ───────────────────────────────────────────────────────────────────

function flush() {
  return new Promise((r) => setTimeout(r, 0));
}

function callListener(msg) {
  return new Promise((resolve) => {
    for (const listener of chrome.runtime.onMessage.getListeners()) {
      listener(msg, {}, resolve);
    }
  });
}

async function injectField({ withInput = false } = {}) {
  const el = document.createElement("div");
  el.setAttribute("data-test-id", "email-user-recipients-select");
  if (withInput) {
    const input = document.createElement("input");
    input.setAttribute("role", "combobox");
    el.appendChild(input);
  }
  document.body.appendChild(el);
  await flush();
  return el;
}

async function removeField(el) {
  el.remove();
  await flush();
}

// ── checkField ────────────────────────────────────────────────────────────────

describe("checkField message handler", () => {
  test("responds with present: false when no bar is injected", async () => {
    const res = await callListener({ action: "checkField" });
    expect(res).toEqual({ present: false });
  });
});

// ── buildBar — no sets ────────────────────────────────────────────────────────

describe("buildBar — no sets", () => {
  let fieldEl;

  beforeEach(async () => {
    chrome.storage.local.get.mockImplementation((_keys, cb) =>
      cb({ sets: [] }),
    );
    fieldEl = await injectField();
  });

  afterEach(async () => {
    await removeField(fieldEl);
  });

  test("injects fill bar into DOM", () => {
    expect(document.getElementById("hs-ext-fill-bar")).not.toBeNull();
  });

  test("shows no-sets message span", () => {
    const bar = document.getElementById("hs-ext-fill-bar");
    expect(bar.querySelector(".hs-ext-bar-msg")).not.toBeNull();
  });

  test("does not render a set selector", () => {
    expect(document.querySelector(".hs-ext-set-select")).toBeNull();
  });

  test("injects stylesheet link into document head", () => {
    const link = document.getElementById("hs-ext-styles");
    expect(link).not.toBeNull();
    expect(link.rel).toBe("stylesheet");
  });

  test("checkField responds with present: true after bar is built", async () => {
    const res = await callListener({ action: "checkField" });
    expect(res).toEqual({ present: true });
  });
});

// ── buildBar — with sets ──────────────────────────────────────────────────────

describe("buildBar — with sets", () => {
  const sets = [
    { id: "s1", name: "Team A", emails: ["a@b.com", "c@d.com"] },
    { id: "s2", name: "Team B", emails: ["e@f.com"] },
  ];
  let fieldEl;

  beforeEach(async () => {
    chrome.storage.local.get.mockImplementation((_keys, cb) => cb({ sets }));
    fieldEl = await injectField();
  });

  afterEach(async () => {
    await removeField(fieldEl);
  });

  test("injects fill bar into DOM", () => {
    expect(document.getElementById("hs-ext-fill-bar")).not.toBeNull();
  });

  test("bar contains a heading", () => {
    expect(document.querySelector(".hs-ext-bar-heading")).not.toBeNull();
  });

  test("bar contains set selector with one option per set", () => {
    const sel = document.querySelector(".hs-ext-set-select");
    expect(sel).not.toBeNull();
    expect(sel.options).toHaveLength(2);
    expect(sel.options[0].textContent).toContain("Team A");
    expect(sel.options[0].textContent).toContain("(2)");
    expect(sel.options[1].textContent).toContain("Team B");
    expect(sel.options[1].textContent).toContain("(1)");
  });

  test("bar contains replace/append toggle with replace active by default", () => {
    const btns = [...document.querySelectorAll(".hs-ext-toggle button")];
    expect(btns).toHaveLength(2);
    expect(btns[0].dataset.mode).toBe("replace");
    expect(btns[1].dataset.mode).toBe("append");
    expect(btns[0].classList.contains("active")).toBe(true);
    expect(btns[1].classList.contains("active")).toBe(false);
  });

  test("clicking append makes it active and replace inactive", () => {
    const [replace, append] = document.querySelectorAll(
      ".hs-ext-toggle button",
    );
    append.click();
    expect(append.classList.contains("active")).toBe(true);
    expect(replace.classList.contains("active")).toBe(false);
  });

  test("clicking replace after append restores replace as active", () => {
    const [replace, append] = document.querySelectorAll(
      ".hs-ext-toggle button",
    );
    append.click();
    replace.click();
    expect(replace.classList.contains("active")).toBe(true);
    expect(append.classList.contains("active")).toBe(false);
  });

  test("bar contains an enabled fill button", () => {
    const fillBtn = document.querySelector(".hs-ext-fill-btn");
    expect(fillBtn).not.toBeNull();
    expect(fillBtn.disabled).toBe(false);
  });
});

// ── removeBar ─────────────────────────────────────────────────────────────────

describe("removeBar", () => {
  test("removes bar when field element is removed from DOM", async () => {
    chrome.storage.local.get.mockImplementation((_keys, cb) =>
      cb({ sets: [] }),
    );
    const fieldEl = await injectField();
    expect(document.getElementById("hs-ext-fill-bar")).not.toBeNull();

    await removeField(fieldEl);
    expect(document.getElementById("hs-ext-fill-bar")).toBeNull();
  });
});

// ── fill message handler ──────────────────────────────────────────────────────

describe("fill message handler — field present with combobox", () => {
  let fieldEl;

  beforeEach(async () => {
    chrome.storage.local.get.mockImplementation((_keys, cb) =>
      cb({ sets: [] }),
    );
    fieldEl = await injectField({ withInput: true });
  });

  afterEach(async () => {
    await removeField(fieldEl);
  });

  test("responds with ok: true immediately", async () => {
    const res = await callListener({
      action: "fill",
      emails: [],
      mode: "append",
    });
    expect(res).toEqual({ ok: true });
  });

  test("uses replace mode by default for unknown mode values", async () => {
    const res = await callListener({
      action: "fill",
      emails: [],
      mode: "unknown",
    });
    expect(res).toEqual({ ok: true });
  });
});

describe("fill message handler — field absent", () => {
  test("responds with ok: true when no field is in the DOM", async () => {
    const res = await callListener({
      action: "fill",
      emails: ["x@y.com"],
      mode: "replace",
    });
    expect(res).toEqual({ ok: true });
  });
});

// ── showBarError ──────────────────────────────────────────────────────────────

describe("showBarError — triggered by fill on field without combobox input", () => {
  let fieldEl;

  beforeEach(async () => {
    chrome.storage.local.get.mockImplementation((_keys, cb) =>
      cb({ sets: [] }),
    );
    // Field without a combobox input — fillRecipients will call showBarError
    fieldEl = await injectField({ withInput: false });
  });

  afterEach(async () => {
    await removeField(fieldEl);
  });

  test("bar message element gets error class", async () => {
    callListener({ action: "fill", emails: ["a@b.com"], mode: "replace" });
    await flush();
    const bar = document.getElementById("hs-ext-fill-bar");
    const msg = bar?.querySelector(".hs-ext-bar-msg");
    expect(msg?.classList.contains("error")).toBe(true);
  });

  test("bar message element shows i18n error text", async () => {
    chrome.i18n.getMessage.mockImplementation((key) => `MSG:${key}`);
    callListener({ action: "fill", emails: ["a@b.com"], mode: "replace" });
    await flush();
    const bar = document.getElementById("hs-ext-fill-bar");
    const msg = bar?.querySelector(".hs-ext-bar-msg");
    expect(msg?.textContent).toContain("MSG:inputNotFound");
  });
});
