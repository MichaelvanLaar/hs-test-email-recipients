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
