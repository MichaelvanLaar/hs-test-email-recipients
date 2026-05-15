/**
 * @jest-environment jsdom
 */
import { chrome } from "jest-chrome";

// Stub chrome.runtime.getURL so the stylesheet injection doesn't throw
chrome.runtime.getURL.mockReturnValue("chrome-extension://fake/src/styles.css");

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
