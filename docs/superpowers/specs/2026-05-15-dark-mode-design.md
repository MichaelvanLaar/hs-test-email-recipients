# Dark Mode for Popup — Design Spec

**Date:** 2026-05-15

## Scope

Dark mode for the extension popup only. The injected fill bar (`.hs-ext-*`) is excluded because HubSpot's interface does not offer native dark mode.

## Trigger

`@media (prefers-color-scheme: dark)` — automatic, follows OS/browser setting. No manual toggle, no storage changes, no JS changes.

## Approach

Replace all hardcoded hex colors in the popup CSS section with CSS custom properties defined on `body.hs-popup`. A single media query block at the end of `styles.css` overrides those variables for dark mode.

The `.hs-ext-toggle` class is shared between the injected bar and the popup's fill-mode toggle. The dark media query targets `body.hs-popup .hs-ext-toggle` to override toggle colors in popup context only, leaving the injected bar unaffected.

## Color Tokens

| Token             | Light     | Dark      |
| ----------------- | --------- | --------- |
| `--hs-bg`         | `#fff`    | `#1c2233` |
| `--hs-surface`    | `#f5f8fa` | `#242d41` |
| `--hs-text`       | `#33475b` | `#d6e0ef` |
| `--hs-text-muted` | `#7c98b6` | `#8faac8` |
| `--hs-border`     | `#cbd6e2` | `#3a4d6a` |
| `--hs-accent`     | `#00a4c4` | `#00c4e6` |
| `--hs-danger`     | `#f2545b` | `#f2545b` |
| `--hs-input-bg`   | `#fff`    | `#2a3549` |

Primary button (`#ff7a59`) and its text (`#fff`) are unchanged in both modes.

## Files Changed

- `src/styles.css` — CSS variables + dark media query (popup section only)
