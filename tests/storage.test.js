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
