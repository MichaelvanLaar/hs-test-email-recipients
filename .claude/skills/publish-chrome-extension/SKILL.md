---
name: publish-chrome-extension
description: Release a new version of this Chrome extension (hs-test-email-recipients / "Test Email Recipient Lists for HubSpot") — bump the manifest version, tag and release on GitHub, and package a Chrome-Web-Store-ready zip. Use whenever the user asks to publish, release, ship, or cut a new version of the extension, mentions the Chrome Web Store listing (https://chromewebstore.google.com/detail/test-email-recipient-list/khbaancbialhnfoklffpaikfeckceplb), or asks "how do we publish this" / "what's left before we can publish" after making changes to this repo. Covers everything that can be automated locally; the Developer Dashboard upload itself is a manual step this skill walks the user through, since no Chrome Web Store API credentials exist in this project.
---

# Publishing a release

This extension has no CI/CD publishing pipeline and no Chrome Web Store API
credentials configured — the last mile (uploading the zip, editing the
listing, submitting for review) has to happen in the developer's browser,
logged into the Chrome Web Store Developer Dashboard. This skill automates
everything before that point and then hands off with exact instructions for
the manual part, rather than pretending that part can be scripted.

Treat this as a release checklist, not a single command. Work through the
steps in order and stop to confirm before anything that pushes, tags, or
creates a public GitHub release — those are hard to undo cleanly. Bumping
the manifest version and packaging the zip are cheap and reversible, so
do those _before_ asking for that confirmation: if the zip's contents turn
out wrong, you want to find that out before there's a public tag to clean
up, not after.

## 1. Preflight

Before touching anything, confirm the repo is actually ready to release:

- `git status` — the working tree must be clean. If there are uncommitted
  changes, stop and ask whether to commit them first; don't fold unrelated
  work into a release commit.
- `git fetch && git log origin/main..main` / `main..origin/main` — confirm
  local `main` is in sync with `origin/main` (not ahead by unpushed work you
  didn't expect, not behind).
- `npm test` — must pass fully. A release built on a red test suite is worse
  than no release.

If any of these fail, fix or flag it and stop — don't route around a dirty
tree or failing tests to get a zip out the door.

## 2. Decide the version bump

Read the current version from `manifest.json` (root of the repo, not
`package.json` — Chrome only reads the manifest's `version` field, and
`package.json` here doesn't track a version at all).

**Before trusting that number, check what's actually live.** This repo has
no git tags yet, so `manifest.json`'s version is only a source of truth
once a release has gone through this skill at least once. If a Chrome Web
Store listing already exists (it does:
https://chromewebstore.google.com/detail/test-email-recipient-list/khbaancbialhnfoklffpaikfeckceplb),
open it — or the Developer Dashboard — and check the version shown there.
Bump relative to _that_ live version, not blindly relative to the local
file. If the local manifest is behind or ahead of what's actually
published, the dashboard will reject a re-uploaded duplicate version
number, and that's a confusing failure to hit for the first time at
step 7 after everything else already succeeded. Reconcile the two before
proceeding — set the local manifest to match live-plus-bump, even if that
means the "bump" changes more than the last digit.

Ask the user whether this is a **patch**, **minor**, or **major** bump if
they haven't already said — don't guess from commit messages. A quick
skim of `git log <last-tag>..HEAD --oneline` (or the full log if there's no
tag yet) is useful context to bring to that question, but the human makes
the call.

Chrome Web Store versions must be dotted integers with no pre-release
suffix (`1.2.3`, not `1.2.3-beta`) — semver bumping keeps you compatible
with that automatically.

## 3. Bump the version

Edit `manifest.json`'s `"version"` field to the new value directly — it's a
single field in a small file, no script needed. The project's prettier
hook reformats on save, so don't worry about matching indentation by hand.

Run `npm test` again after the edit (cheap, and catches the rare case where
something reads the version at runtime).

## 4. Package the zip and verify it — before anything gets pushed

Run:

```
npm run package
```

This runs `scripts/package-extension.js`, which:

- Reads the version straight out of the (already-bumped) `manifest.json`,
  so the zip's version can never drift from what step 5 is about to tag.
- Clears `dist/` first, then copies **only** `manifest.json`, `src/`,
  `icons/`, and `_locales/` — the exact folders the manifest's `action`,
  `icons`, `content_scripts`, and locale system reference — into a temp
  staging directory and zips that. Nothing else in the repo root
  (`tests/`, `.claude/`, `scripts/`, `docs/`, `node_modules/`,
  `.github/`, `README.md`, ...) is ever copied, so there's no
  exclude-list to keep in sync as the project grows — if a new runtime
  file lives outside those four paths, the extension itself wouldn't
  load it either, so it doesn't belong in the store package.
- Writes `dist/test-email-recipient-lists-for-hubspot-vX.Y.Z.zip`
  (`dist/` is gitignored and cleared on every run — this artifact is
  never committed, and never accumulates stale prior-version zips).

Sanity-check the result before moving on: `unzip -l dist/*.zip` and confirm
it's just `manifest.json`, `src/`, `icons/`, `_locales/` — no stray files —
and that the zip's `manifest.json` version matches the version you just
set in step 3. If anything looks wrong, fix it here — nothing has been
committed or pushed yet, so there's nothing to undo.

If the manifest ever grows a new top-level asset folder (e.g. a `rules/`
for declarativeNetRequest, or a `_metadata/` folder), add it to the
`RUNTIME_ENTRIES` array at the top of `scripts/package-extension.js` —
that's the one place the runtime footprint is defined.

## 5. Commit, tag, and push — confirm first

Now that the packaged zip is verified, show the user the diff
(`git diff manifest.json`) and the exact commands you're about to run,
then wait for a go-ahead. This step is the point of no easy return: once
pushed, a tag is public.

```
git add manifest.json
git commit -m "🔖 chore(release): bump version to vX.Y.Z"
git tag vX.Y.Z
git push && git push origin vX.Y.Z
```

Use the gitmoji `🔖` (bookmark) for version-bump commits, per this user's
Conventional Commits + gitmoji convention.

## 6. Create the GitHub release — confirm first

Same rule as step 5: show the user the command, wait for a go-ahead, then
run it. Attach the already-verified zip from step 4 as a release asset so
there's a durable download link independent of the Chrome Web Store, and
let `gh` generate release notes from the commits since the last tag:

```
gh release create vX.Y.Z dist/test-email-recipient-lists-for-hubspot-vX.Y.Z.zip \
  --title "vX.Y.Z" \
  --generate-notes
```

If this is the very first tag in the repo, `--generate-notes` has nothing
to diff against — write a short manual summary instead (what the release
contains) rather than leaving it empty.

## 7. Hand off to the Chrome Web Store Developer Dashboard

This part cannot be automated here — there's no stored API credential for
the Chrome Web Store Publish API in this project, and fabricating an
upload flow without one would silently fail or (worse) require inventing
a fake credential. Tell the user, plainly, that this is now a manual step,
and walk them through it:

1. Open the [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   and select **Test Email Recipient Lists for HubSpot**
   (listing: https://chromewebstore.google.com/detail/test-email-recipient-list/khbaancbialhnfoklffpaikfeckceplb).
2. Under **Package**, upload
   `dist/test-email-recipient-lists-for-hubspot-vX.Y.Z.zip`.
3. If any listing copy changed (name, description, screenshots, privacy
   policy), the current copy-paste-ready text lives in
   `docs/chrome-web-store-listing/chrome-web-store-listing.md` and the
   policy page is `PRIVACY.md` — update the dashboard fields to match if
   they've drifted, and update that file first if the copy itself changed
   as part of this release.
4. Submit for review. Chrome Web Store review is typically hours to a few
   days — there's nothing further to script here, it's a waiting period on
   Google's side.

If this is the **first-ever** submission (check: does the store listing
already show an "Installed" state, or does `README.md`'s Installation
section still say "The extension is not published to the Chrome Web
Store"?), also flag that the README should be updated afterward to point
users at the store listing instead of "load unpacked" instructions — but
don't do that edit until the listing is actually live, since linking to a
listing still in review is confusing.

## Why the split between automated and manual

It'd be possible to script the dashboard upload too, via the Chrome Web
Store Publish API — but that needs an OAuth client ID/secret and a stored
refresh token, which this repo doesn't have and which is a meaningfully
bigger security surface to introduce (a credential capable of pushing to
production for every user of the extension) than the workflow warrants
right now. If that ever changes, this skill's step 7 is the place to
replace with an automated `gh`-style call — the rest of the workflow
(version bump, tag, package, GitHub release) stays the same either way.
