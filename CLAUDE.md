# Test Email Recipient Lists for HubSpot

Chrome extension (Manifest V3) — fills HubSpot test email recipient fields with pre-defined address sets stored in `chrome.storage.local`.

## Key Config Files

| File                                               | Purpose                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `.claudeignore`                                    | Paths excluded from Claude Code indexing                                             |
| `.claude/learnings.md`                             | TODO: add description                                                                |
| `CLAUDE.md`                                        | Project instructions, loaded every message                                           |
| `.claude/settings.json`                            | Permissions, hooks, environment variables                                            |
| `.claude/skills/publish-chrome-extension/SKILL.md` | Release checklist: version bump, packaging, GitHub release, Chrome Web Store handoff |
| `.github/workflows/test.yml`                       | Runs `npm test` on push and pull requests                                            |
| `.gitignore`                                       | Git ignore patterns                                                                  |
| `LICENSE`                                          | MIT license                                                                          |
| `manifest.json`                                    | Chrome MV3 manifest — permissions, content scripts, popup, icons                     |
| `package.json`                                     | Node dependencies, test command, Jest configuration                                  |
| `scripts/generate-icons.js`                        | Generates 16/48/128 px PNG icons from the SVG source using sharp                     |
| `scripts/package-extension.js`                     | Zips manifest + runtime folders into a Chrome-Web-Store-ready dist/\*.zip            |
| `scripts/sync-config-table.sh`                     | Keeps Key Config Files table in CLAUDE.md in sync                                    |

## Commands

- **Install:** `npm install --legacy-peer-deps` (required — jest-chrome@0.8.0 has a peer conflict with jest@29)
- **Test:** `npm test`
- **Build:** None for local dev — load unpacked from repo root in `chrome://extensions`
- **Package:** `npm run package` — zips the runtime footprint (`manifest.json`, `src/`, `icons/`, `_locales/`) into `dist/*.zip` for Chrome Web Store submission; see the `publish-chrome-extension` skill for the full release checklist
- **Format:** `npx prettier --write .` (runs automatically via PostToolUse hook on every edit)

## Structure

- `src/` — Extension source: `content.js`, `popup.js`, `popup.html`, `storage.js`, `styles.css`
- `tests/` — Jest unit tests
- `scripts/` — Utility scripts (icon generation, CLAUDE.md sync)
- `icons/` — Extension icons (16 px, 48 px, 128 px)
- `manifest.json` — MV3 manifest (root level, not inside `src/`)

## Conventions

- Use Manifest V3 (not V2)
- Recipient sets are stored in `chrome.storage.local` — never `chrome.storage.sync`
- Content script targets HubSpot test email recipient input fields only

## Don't

- Don't commit secrets or credentials to git
- Don't use --force flags — fix the underlying issue instead
- Don't use `chrome.storage.sync` for email addresses (intentionally local-only)

## Learnings

When the user corrects a mistake or points out a recurring issue, append a one-line
summary to .claude/learnings.md. Don't modify CLAUDE.md directly.

## Compact Instructions

When compacting, preserve: list of modified files, current test status, open TODOs, and key decisions made.
