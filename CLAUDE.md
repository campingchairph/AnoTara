# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

A standalone, framework-free wedding planner PWA. No build step, no bundler, no npm. Edit files and push — GitHub Pages serves them directly. The app was extracted from a separate repo (AnoTara) and lives here on its own.

**Repo:** `https://github.com/campingchairph/[repo-name]`
**Live URLs**
- App: `https://campingchairph.github.io/[repo-name]/` (index.html)
- RSVP page: `https://campingchairph.github.io/[repo-name]/rsvp.html`

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell, all modals, landing page overlay, inline `<script>` helpers |
| `kasalko.css` | All styles — CSS custom properties, glass utilities, responsive layout |
| `kasalko-app.js` | All app logic — state, rendering, canvas seating, calendar, checklist |
| `firebase-config.js` | Firebase Auth + Firestore: cloud save, cloud load, RSVP sync |
| `rsvp.html` | Standalone guest RSVP page opened via QR code link |

**Critical constraint:** Never touch any other files. Only these five belong to this app.

## Architecture

### State
Everything lives in a single global `WED` object in `kasalko-app.js`. There is no reactive framework — every mutation is followed by a manual `saveState()` call and a targeted `render*()` call.

```js
WED = {
  couple: { p1, p2 }, date, venue, budget,
  guests[], expenses[], checklist[], schedule[], furniture[], vendors[],
  customCardImage,   // base64 — user-uploaded invitation card
  _invitationImg,    // base64 — generated default card (auto-saved by _syncPreview)
  planningMonths,    // null = show setup screen; number = active checklist
  _collapsedPhases[] // checklist phase collapse state
  // ... id counters, drag state, etc.
}
```

### Persistence — two layers
1. **localStorage** (`kasalko_data`) — always, synchronous, on every `saveState()` call
2. **Firestore** (`users/{uid}/data/wedding`) — debounced 2.5s, only when signed in

`loadState()` runs on `DOMContentLoaded`. Cloud load (`cloudLoadWedding`) runs on Firebase auth state change. If both exist, a conflict sheet appears and the user chooses which to keep.

### Rendering pattern
Each tab has a `render*()` function that rebuilds its entire inner HTML from `WED` state. Tab switching is handled by `wedTab(name)` which shows/hides `#panel-{name}` divs and calls the relevant renderer.

Functions must be on `window.*` to be callable from inline HTML `onclick` handlers — there is a large exports block at the bottom of `kasalko-app.js`.

### Layout (desktop vs mobile)
- **Mobile:** tabs wrap in two rows at the bottom of the header
- **Desktop (≥900px):** `aside.app-left-panel` (240px sticky sidebar) + `main.app-main` (flex:1). CSS overrides inside `@media (min-width:900px)` reflow the tabs into a vertical nav list.

### Seating canvas
The seating tab uses a raw `<canvas>` with pan/zoom state (`cTx = { scale, ox, oy }`). Furniture items (tables, chairs, long tables) live in `WED.furniture[]`. Guest-to-chair assignment is stored as `guest._chairId = furnitureId`. `drawCanvas()` is the single render function; it calls `cx.setTransform()` on every frame.

### Invitation card
`showRSVPCard(guestId?)` draws onto a hidden `<canvas>`, then `_syncPreview()` converts it to a data URL and sets it as the `src` of `<img#rsvp-preview-img>` (so it's long-pressable on mobile). When no custom card is set, `_syncPreview()` also writes the data URL to `WED._invitationImg` so the Overview tab can show the preview.

### Per-guest RSVP flow
1. `shareGuestInvite(id)` builds a personalised URL: `rsvp.html?p1=...&guestId=...&guestName=...&coupleKey=...`
2. Uses `navigator.share()` → clipboard fallback → marks `guest._inviteSent = true`
3. `rsvp.html` reads those params, pre-fills the form, and submits to Firestore: `kasalko_rsvp/{coupleKey}/responses/{autoId}`
4. `syncRSVPsFromCloud()` in `firebase-config.js` reads those responses and updates guest RSVP statuses in `WED.guests[]`

## CSS conventions

Custom properties are defined in `:root` in `kasalko.css`:
- Palette: `--ivory`, `--gold`, `--gold-dark`, `--tan`, `--tan-dark`, `--rose`, `--sage`, `--ink`, `--ink-2`, `--ink-3`, `--ink-4`, `--green-deep`, `--pink-deep`
- Fonts: `--f` (Inter), `--f2` (Cormorant Garamond)
- Radii: `--r-sm`, `--r-md`, `--r-lg`, `--r-xl`

Glass card utilities: `.glass`, `.glass-pink`, `.glass-green`, `.glass-cream`

## Firebase

- **Project:** `weddingthings` (firebase.google.com)
- **Auth:** Email/password + Google OAuth (compat SDK v10.7.1)
- **Firestore rules** must be published in the Firebase Console — they are NOT in this repo:
  ```
  match /users/{userId}/data/wedding { allow read, write: if request.auth.uid == userId; }
  match /kasalko_rsvp/{coupleKey}/responses/{id} { allow create: if true; allow read: if request.auth != null; }
  ```

## Deploying

Push to `main` → GitHub Pages auto-deploys in ~1 minute. No build command needed.

## Hardcoded URLs to update if repo is renamed

Two places reference the GitHub Pages URL directly:
- `kasalko-app.js` → `_generateRSVPQR()` and `shareGuestInvite()` — the `rsvp.html` base URL
- `rsvp.html` → footer link back to the planner
