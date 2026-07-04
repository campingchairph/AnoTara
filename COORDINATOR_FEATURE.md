# Coordinator Planner Feature — What Was Added

## Files Created / Modified

### New File: `coordinator.html`
A standalone coordinator planner app (~1000 lines, all inline HTML/CSS/JS).

**Screens:**
1. **Onboarding** — first-time setup: coordinator name, specialty, contact, years of experience, bio
2. **Dashboard** — coordinator badge card + list of wedding plans
3. **Plan Detail** — 4 tabs: Overview, Timeline, Vendors, Package Inclusions
4. **Presentation Mode** — fullscreen slide deck for client meetings

**Plan structure stored in `localStorage` (`at_coord_plans`):**
```json
{
  "id": "...",
  "p1": "Bride name",
  "p2": "Groom name",
  "date": "YYYY-MM-DD",
  "venue": "Venue name",
  "pkg": "Package name",
  "budget": 0,
  "notes": "...",
  "timeline": [],
  "vendors": [],
  "inclusions": []
}
```

**Coordinator profile stored in `localStorage` (`at_coord_profile`):**
```json
{
  "name": "...",
  "specialty": "...",
  "contact": "...",
  "years": 0,
  "bio": "..."
}
```

**Freemium model:**
- `FREE_PLAN_LIMIT = 3` constant at top of script
- Creating a 4th plan shows an upgrade banner instead

**Presentation Mode slide types (6):**
1. Title slide — couple names + date
2. Info slide — venue + package
3. List slide — inclusions
4. Timeline slide — schedule items
5. Vendors slide — vendor list
6. Closing slide — coordinator contact info

**Theme:** Dark navy (`#0d1b2e`) + gold (`#d4a853`) — intentionally different from the couple's rose/ivory app.

---

### Modified: `index.html`
Added a "Coordinator Planner" link card in the `#tp-wedding` tab panel, stacked below the existing "Down to the Isle" link:

```html
<a href="coordinator.html" style="display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-radius:var(--r-md);background:linear-gradient(135deg,#1a2744,#2a3f6e);border:1px solid rgba(212,168,83,0.3);text-decoration:none">
  <div>
    <div style="font-size:13px;font-weight:800;color:#d4a853">Coordinator Planner</div>
    <div style="font-size:11.5px;color:rgba(255,255,255,0.6);margin-top:2px">For wedding coordinators</div>
  </div>
  <div style="font-size:13px;font-weight:700;color:#d4a853">Open →</div>
</a>
```

---

### Modified: `sitemap.xml`
Added coordinator.html entry:
```xml
<url>
  <loc>https://campingchairph.github.io/AnoTara/coordinator.html</loc>
  <changefreq>monthly</changefreq>
  <priority>0.7</priority>
</url>
```

---

## Commits Made

```
4d8a33d  Add Coordinator Planner app and link it from the wedding tab
```

Pushed to both `claude/kasal-isle-app-link-2sXXn` and merged into `main`.

---

## How to Revert

To remove these changes from `main`:

```bash
# Revert the coordinator commit on main
git revert 4d8a33d --no-edit
git push origin main
```

Or to hard-reset (loses commit history):
```bash
git reset --hard 61f51b7   # commit before coordinator was added
git push --force-with-lease origin main
```

The commit hash before this feature was added: **`61f51b7`**
