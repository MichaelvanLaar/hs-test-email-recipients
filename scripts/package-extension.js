#!/usr/bin/env node
// Packages the extension's runtime footprint (manifest.json + the folders it
// references) into a Chrome-Web-Store-ready zip under dist/. Excludes every
// dev-only path (tests/, .claude/, scripts/, docs/, node_modules/, ...) by
// construction — it only ever copies the runtime folders, never the repo root.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME_ENTRIES = ["manifest.json", "src", "icons", "_locales"];

function readVersion() {
  const manifest = JSON.parse(
    readFileSync(join(ROOT, "manifest.json"), "utf8"),
  );
  return manifest.version;
}

async function stageRuntimeFiles(stageDir) {
  for (const entry of RUNTIME_ENTRIES) {
    const src = join(ROOT, entry);
    if (!existsSync(src)) {
      throw new Error(`Expected runtime path missing: ${entry}`);
    }
    await cp(src, join(stageDir, entry), { recursive: true });
  }
}

async function main() {
  const version = readVersion();
  const distDir = join(ROOT, "dist");
  const zipName = `test-email-recipient-lists-for-hubspot-v${version}.zip`;
  const zipPath = join(distDir, zipName);

  // Clear dist/ entirely so it only ever holds the current release's zip —
  // `unzip -l dist/*.zip` and similar globs stay unambiguous even after
  // several releases have been packaged in this checkout.
  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });

  const stageDir = mkdtempSync(join(tmpdir(), "hs-ext-package-"));
  try {
    await stageRuntimeFiles(stageDir);
    execFileSync("zip", ["-r", "-X", zipPath, ...RUNTIME_ENTRIES], {
      cwd: stageDir,
      stdio: "inherit",
    });
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
  }

  console.log(`\nPackaged ${zipName}`);
  console.log(zipPath);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
