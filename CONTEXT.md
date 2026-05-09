# ANO TARA — Project Context
> Paste this at the top of every new Claude session instead of pasting code files.
> Update "Last Changed" and "Known Issues" after every session.

Last changed: May 8 2025
Version: 3.0

---

## What This App Is
Mobile-first planning + expense coordination app for Filipino families, couples, and friends.
Three group modes: **Ano Tara Jowa** (couple), **Ano Tara Mifamilia** (family), **Ano Tara Berks** (friends).
Bonus feature: full **Wedding Planner** (separate screen, activated manually).
Stack: Vanilla HTML/CSS/JS — no framework. Leaflet.js for maps. Google Fonts (Figtree + Lora).
Hosted on GitHub Pages: `campingchairph.github.io/AnoTara/`

---

## File Map

| File | Size | Purpose |
|------|------|---------|
| `index.html` | ~880 lines | All screens, all modals, script tags at bottom |
| `style.css` | ~435 lines | Design system, glass utilities, all component styles |
| `app.js` | ~1077 lines | Core logic: nav, tasks, expenses, map, lang, couple, balance |
| `lang.js` | ~310 lines | EN/FIL translation strings — LANG.en and LANG.fil objects |
| `wedding.js` | ~1204 lines | All wedding features: canvas, checklist, schedule, overview, guests |
| `wedding.css` | ~331 lines | Wedding-only styles |

---

## Screen IDs (in index.html)
```
home          → Home dashboard
groups        → Group list
group-detail  → Single group (tabs: tasks, expenses, members, settle, map)
couple        → Jowa / couple mode
receipt       → Event receipt + share
settings      → Profile + settings
wedding       → Wedding planner (activated via home quick btn)
```

---

## Modal IDs (all in index.html)

### General
```
group-select-modal        → Pick which group when adding expense from Home
add-expense-modal         → Full expense form (icon picker, split, payer)
add-task-modal            → New task (assign member, due date)
new-group-modal           → Create group (type picker: jowa/familia/berks/trip + custom)
add-pin-modal             → Add map pin (type, name, note)
balance-modal             → Net balance breakdown (by group / by person)
share-modal               → Share link + Messenger + QR code
pair-modal                → Couple pairing (generate/enter 6-digit code)
```

### Couple
```
add-goal-modal            → New savings goal (name, target, contributions, emoji)
add-money-modal           → Add money to a goal (who, amount, note)
withdraw-modal            → Withdraw from a goal
edit-goal-modal           → Edit goal name, target, saved amount, date
couple-expense-modal      → Add couple expense directly (no group picker)
add-poll-modal            → New poll (question + up to 4 options)
```

### Wedding
```
activate-wedding-modal    → First-time setup (names, date, venue, budget)
wed-add-guest-modal       → Add guest (name, table, seat, meal)
wed-add-expense-modal     → Add wedding expense (label, amount, category)
wed-add-sched-modal       → Add schedule item (time, event, assignee)
wed-edit-sched-modal      → Edit schedule item (re-sorts by time on save)
wed-edit-overview-modal   → Edit wedding details (names, date, venue, budget)
wed-add-checklist-modal   → Add checklist task (to specific phase or last phase)
wed-timeline-modal        → Set planning timeline (preset or custom months)
wed-assign-modal          → Assign guests to tables (inline number inputs)
rsvp-card-modal           → Digital invitation card (canvas-rendered + share)
```

---

## CSS Design System (style.css :root)

### Palette
```
PawPark warm cream:  --cream #fffdf8 · --cream-2 #fef6e8 · --cream-3 #fdefd4
Sand/tan:            --sand #f5e6c8 · --sand-2 #e8d4a8 · --tan #c9a96e · --tan-dark #a07840
Ink (text):          --ink #2c1f0e · --ink-2 #4a3520 · --ink-3 #7a6045 · --ink-4 #b8977a
Powder pink:         --pink #fce8ee · --pink-2 #f8d0de · --pink-mid #f0a8c0
                     --pink-accent #e07898 · --pink-deep #c0506e
Powder green:        --green #e8f5ed · --green-2 #d0ecda · --green-mid #a0d4b4
                     --green-accent #5aab7a · --green-deep #3a7a54
Amber/status:        --amber #f5a623 · --danger #e55a4e
```

### Glass Utility Classes
```
.glass        → white glass, warm edge shadows
.glass-cream  → sand-tinted glass
.glass-pink   → pink-tinted glass
.glass-green  → green-tinted glass
.glass-heavy  → opaque glass (modals, nav)
```

### Radius Scale
```
--r-xs:8px  --r-sm:12px  --r-md:16px  --r-lg:22px  --r-xl:28px  --r-2xl:36px
```

### Shadow/Blur Tokens
```
--blur      → blur(22px) saturate(1.9) brightness(1.04)
--blur-sm   → blur(14px) saturate(1.7)
--edge      → inset box-shadow for glass depth (warm)
--edge-pink → pink variant
--edge-green→ green variant
--shadow    → standard drop shadow
--shadow-hvy→ heavy drop shadow (modals)
```

---

## JavaScript State Objects

### STATE (app.js)
```js
STATE = {
  lang,              // 'en' | 'fil' — persisted to localStorage
  currentGroup,      // 'familia' | 'jowa' | 'berks'
  navHistory,        // array of screen ids
  mapInstance,       // Leaflet map instance
  mapPins,           // array — persisted to localStorage
  pendingLatLng,     // map click position before pin submit
  pollVotes,         // [55, 30, 15] — couple poll
  pairedCode,        // localStorage
  isPaired,          // localStorage
  expenseIconSelected,
  splitMethod,       // 'equal' | 'custom' | 'two' | 'full'
  assignedMember,
  activeTaskDropdown,
}
```

### WEDDING_STATE (app.js)
```js
WEDDING_STATE = {
  activated,   // bool — persisted localStorage 'at_wed_active'
  p1, p2,      // partner names — localStorage
  date,        // ISO date string — localStorage
  venue,       // string — localStorage
  budget,      // number — localStorage
}
```

### WED (wedding.js)
```js
WED = {
  couple: { p1, p2 },
  date, venue, budget,
  guests[],          // { id, name, table, seat, rsvp, meal, dietary }
  expenses[],        // { id, category, label, amount, paid }
  checklist[],       // [{ phase, items[{ id, text, done }] }]
  schedule[],        // [{ time, event, assignee, done, color }]
  furniture[],       // canvas items { id, type, x, y, w, h, label, rot }
  _invitationImg,    // base64 uploaded image or null
  _customPhases,     // custom timeline phases
  dragging,          // currently dragged furniture item
  selectedFurniture, // id of selected canvas item
  nextFurnitureId,
  nextGuestId,
}
```

---

## Key Functions Quick Reference

### app.js
```
navTo(id)                    → navigate to screen
goBack()                     → pop navHistory
openGroup(variant)           → open group-detail with variant data
switchTab(name)              → switch group-detail tab
showTaskDropdown(el, event)  → floating status picker on task tap
setTaskStatus(btn, status)   → set task done/progress/pending
openAssignPicker(taskEl)     → floating member avatar picker
openBalanceBreakdown()       → opens balance-modal (groups only, excl. couple+wedding)
openShareModal()             → opens share-modal with QR
openModal(id)                → generic modal open (renders dynamic content first)
closeModalById(id)           → close modal
showToast(msg)               → bottom toast notification
toggleLang()                 → swap EN/FIL + update all data-t elements
activateWedding()            → open activate modal or go to wedding screen
doActivateWedding()          → save wedding state + show home card
showWeddingHomeCard()        → show/update the conditional home wedding card
openAddMoneyModal(goalName)  → couple goal add money
openWithdrawModal(goalName)  → couple goal withdraw
openEditGoalModal(name,target,saved) → couple goal edit
openCoupleExpenseModal()     → couple expense (no group picker)
vote(el, idx)                → couple poll vote
submitPoll()                 → create new poll
renderBalanceBreakdown()     → render group-only balance (overridden in app.js v3)
```

### wedding.js
```
wedTab(name)               → switch wedding tab (overview/budget/guests/seating/checklist/schedule)
renderOverview()           → overview panel with edit button + invitation upload
renderBudget()             → budget panel with category breakdown
renderGuests()             → guest list with RSVP dropdowns
renderChecklist()          → checklist with timeline toolbar + per-phase add
renderSchedule()           → schedule timeline with edit + delete per item
initCanvas()               → init Leaflet-style canvas seating (called on tab open)
drawCanvas()               → redraw all furniture on canvas
drawFurniture(f)           → draw single furniture item (no auto-chairs)
addFurniture(type, label)  → add new item to canvas (chair type supported)
bindCanvasRotate()         → double-tap long table to rotate 90°
openEditSched(i)           → open edit modal pre-filled for schedule item i
submitEditSched()          → save + re-sort schedule by time
deleteSchedItem(i)         → remove schedule item
toggleChecklist(id)        → toggle checklist item done state
openAddChecklistItem()     → open add-checklist modal (adds to last phase)
openAddChecklistItemToPhase(pi) → open add-checklist modal for specific phase
submitChecklistItem()      → save new checklist item
deleteChecklistItem(id)    → remove checklist item
submitEditOverview()       → save edited wedding details
uploadInvitation(event)    → file input handler, stores base64 in WED._invitationImg
showRSVPCard()             → render canvas-based invitation card
updateGuestRSVP(id, val)   → update guest rsvp status
addWedGuest()              → submit new guest from modal
addWedExpense()            → submit new wedding expense
addWedSched()              → submit new schedule item
submitTimeline()           → apply timeline preset/custom
```

---

## Naming Conventions
```
Screens:      kebab-case ids matching ALL_SCREENS array
Modals:       [feature]-modal or wed-[feature]-modal
Data-t keys:  camelCase, defined in lang.js LANG.en + LANG.fil
Glass cards:  always use .glass / .glass-cream / .glass-pink / .glass-green
Buttons:      .cta-btn (primary) · .cta-btn.pink · .cta-btn.green · .cta-btn.dark
Expense icon: .expense-icon with inline background color
Member avatars: .member-av with color class ma-tan / ma-pink / ma-green / ma-sand
```

---

## Patterns to Follow

### Adding a new modal
1. Add HTML in index.html before `</div><!-- /#app -->`
2. Give it class `modal-overlay` + unique id
3. Add `closeModalOutside(event,'modal-id')` on the overlay onclick
4. Call `openModal('modal-id')` from a button
5. No new CSS needed unless custom component inside

### Adding a new screen
1. Add `<section id="new-screen" class="screen">` in index.html
2. Add id to `ALL_SCREENS` array in app.js
3. Add to `FAB_HIDDEN` in app.js if FAB should hide there
4. Add nav item or button that calls `navTo('new-screen')`
5. Add `goBack()` button in the screen header

### Adding a lang string
1. Add to `LANG.en` in lang.js
2. Add matching key to `LANG.fil`
3. Use `data-t="keyName"` on the HTML element
4. Or call `t('keyName')` in JS

### Adding a canvas furniture type
1. Add to `defaults` object in `addFurniture()` in wedding.js
2. Add draw case in `drawFurniture()` in wedding.js
3. Add button to `renderFurniturePalette()` in wedding.js

---

## What NOT to Do
- Never add `<form>` tags — use `onclick` handlers only
- Never use `localStorage` directly in index.html — use STATE or WEDDING_STATE
- Never hardcode colors — always use CSS vars from :root
- Never add `Payment Methods` — removed by design
- Never show wedding card on home unless `WEDDING_STATE.activated === true`
- Never include couple or wedding expenses in the home balance breakdown
- Never auto-add chairs to tables — chairs are manual only

---

## Known Issues / Next Tasks
[ ] Update this section after each session
[ ] Canvas: bindCanvasRotate re-registers on every initCanvas call — needs guard
[ ] Wedding home card badges don't live-update when WED data changes mid-session
[ ] Poll on couple page is static demo — votes don't persist to localStorage yet
[ ] Add Expense from group-select-modal doesn't tag the expense to the selected group yet
[ ] lang.js: wedding modal strings not yet translated to Filipino
[ ] Schedule edit modal: color field not yet editable
[ ] Guest meal preference not wired to add-guest form select

---

## How to Use This File

Start every Claude session with:
```
I'm working on Ano Tara. Here is my CONTEXT.md:
[paste this file]

Change: [what you want]
File: [which file, if you know]
```

Claude will respond with diffs only:
```
CHANGE: functionName or modal-id
FILE: which file

OLD:
[only the changed part]

NEW:
[replacement]
```

After each session, ask:
> "Give me the updated CONTEXT.md lines for what we just changed"
and update this file.
