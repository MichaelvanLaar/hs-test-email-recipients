# HubSpot Test Email Recipients

Chrome extension (Manifest V3) — fills HubSpot test email recipient fields with pre-defined address sets stored in `chrome.storage.local`.

## Key Config Files

| File                           | Purpose                                                          |
| ------------------------------ | ---------------------------------------------------------------- |
| `.claude/learnings.md`         | Per-session corrections that accumulate over time                |
| `.claude/settings.json`        | Permissions, hooks, environment variables                        |
| `.claudeignore`                | Paths excluded from Claude Code indexing                         |
| `.gitignore`                   | Git ignore patterns                                              |
| `CLAUDE.md`                    | Project instructions, loaded every message                       |
| `LICENSE`                      | MIT license                                                      |
| `manifest.json`                | Chrome MV3 manifest — permissions, content scripts, popup, icons |
| `package.json`                 | Node dependencies, test command, Jest configuration              |
| `scripts/generate-icons.js`    | TODO: add description                                            |
| `scripts/sync-config-table.sh` | Keeps Key Config Files table in CLAUDE.md in sync                |

## Commands

- **Test:** `npm test`
- **Build:** None — load unpacked from repo root in `chrome://extensions`
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
