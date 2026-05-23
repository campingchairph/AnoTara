/* ═══════════════════════════════════════════════
   KASALKO — Standalone Wedding Planner JS
   Self-contained; no dependency on AnoTara
   ═══════════════════════════════════════════════ */

/* ── STATE ───────────────────────────────────── */
const WED = {
  couple:   { p1: '', p2: '' },
  date:     '',
  venue:    '',
  budget:   0,
  activeTab: 'overview',
  customCardImage: null,
  _invitationImg: null,
  guests:   [],
  expenses: [],
  checklist: [
    { phase:'12 Months Out', items:[
      { id:'c1',  text:'Set wedding date',                  done:false },
      { id:'c2',  text:'Book the venue',                    done:false },
      { id:'c3',  text:'Set overall budget',                done:false },
      { id:'c4',  text:'Create initial guest list',         done:false },
      { id:'c5',  text:'Hire wedding coordinator',          done:false },
    ]},
    { phase:'6 Months Out', items:[
      { id:'c6',  text:'Book photographer & videographer',  done:false },
      { id:'c7',  text:'Book catering',                     done:false },
      { id:'c8',  text:'Choose & order wedding attire',     done:false },
      { id:'c9',  text:'Send save-the-dates',               done:false },
      { id:'c10', text:'Book live band or DJ',              done:false },
    ]},
    { phase:'3 Months Out', items:[
      { id:'c11', text:'Send formal invitations',           done:false },
      { id:'c12', text:'Finalize menu with caterer',        done:false },
      { id:'c13', text:'Book hair & makeup',                done:false },
      { id:'c14', text:'Order wedding cake',                done:false },
      { id:'c15', text:'Arrange accommodations for guests', done:false },
    ]},
    { phase:'1 Month Out', items:[
      { id:'c16', text:'Confirm all vendors',               done:false },
      { id:'c17', text:'Finalize seating arrangement',      done:false },
      { id:'c18', text:'Submit final headcount to caterer', done:false },
      { id:'c19', text:'Pick up wedding attire',            done:false },
      { id:'c20', text:'Prepare payments & envelopes',      done:false },
    ]},
    { phase:'Week Of', items:[
      { id:'c21', text:'Wedding rehearsal',                 done:false },
      { id:'c22', text:'Confirm vendors one last time',     done:false },
      { id:'c23', text:'Pack for honeymoon',                done:false },
      { id:'c24', text:'Prepare emergency kit',             done:false },
    ]},
    { phase:'Day Of', items:[
      { id:'c25', text:'Hair & makeup',                     done:false },
      { id:'c26', text:'Bride/groom gets dressed',          done:false },
      { id:'c27', text:'Ceremony',                          done:false },
      { id:'c28', text:'Reception',                         done:false },
      { id:'c29', text:'Send-off / exit',                   done:false },
    ]},
  ],
  schedule:  [],
  furniture: [],
  dragging:  null,
  dragOffX:  0,
  dragOffY:  0,
  selectedFurniture: null,
  nextFurnitureId: 1,
  nextGuestId: 1,
  nextVendorId: 1,
  vendors: [],
  _customPhases: [],
  planningMonths: null,
  _collapsedPhases: [],
};

/* ── PERSISTENCE ─────────────────────────────── */
const STORE_KEY = 'kasalko_data';

function saveState() {
  try {
    const snapshot = {
      couple: WED.couple,
      date:   WED.date,
      venue:  WED.venue,
      budget: WED.budget,
      customCardImage: WED.customCardImage,
      _invitationImg:  WED._invitationImg,
      guests:    WED.guests,
      expenses:  WED.expenses,
      checklist: WED.checklist,
      schedule:  WED.schedule,
      furniture: WED.furniture,
      nextFurnitureId: WED.nextFurnitureId,
      nextGuestId:     WED.nextGuestId,
      nextVendorId:    WED.nextVendorId,
      vendors:         WED.vendors,
      planningMonths:  WED.planningMonths,
      _collapsedPhases: WED._collapsedPhases,
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(snapshot));
  } catch(e) {}
  // Cloud sync — debounced, only when signed in (cloudSave defined in firebase-config.js)
  if (typeof cloudSave === 'function' && window.CURRENT_USER) cloudSave();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    Object.assign(WED, d);
    if (!WED._customPhases)    WED._customPhases    = [];
    if (!WED.vendors)          WED.vendors          = [];
    if (!WED.nextVendorId)     WED.nextVendorId     = 1;
    if (WED.planningMonths === undefined) WED.planningMonths = null;
    if (!WED._collapsedPhases) WED._collapsedPhases = [];
  } catch(e) {}
}

/* ── TOAST ───────────────────────────────────── */
let _toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ── MODAL HELPERS ───────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}
function closeModalOutside(ev, id) {
  if (ev.target === ev.currentTarget) closeModal(id);
}

/* ── COUNTDOWN ───────────────────────────────── */
function getCountdown() {
  if (!WED.date) return '— days to go';
  const diff = new Date(WED.date) - new Date();
  if (diff <= 0) return '🎊 The big day is here!';
  const days = Math.floor(diff / 86400000);
  if (days > 365) return `${Math.floor(days/365)}y ${Math.floor((days%365)/30)}mo to go`;
  if (days > 30)  return `${Math.floor(days/30)} months, ${days%30} days to go`;
  return `${days} days to go`;
}

/* ── TAB SWITCH ──────────────────────────────── */
function wedTab(name) {
  WED.activeTab = name;
  ['overview','budget','guests','suppliers','seating','checklist','schedule'].forEach(t => {
    const panel = document.getElementById('panel-'+t);
    const tab   = document.getElementById('tab-'+t);
    if (panel) panel.style.display = t === name ? 'block' : 'none';
    if (tab)   tab.classList.toggle('active', t === name);
  });
  if (name === 'seating')   initCanvas();
  if (name === 'guests')    renderGuests();
  if (name === 'budget')    renderBudget();
  if (name === 'checklist') renderChecklist();
  if (name === 'schedule')  renderSchedule();
  if (name === 'overview')  renderOverview();
  if (name === 'suppliers') renderSuppliers();
}

/* ── HERO UPDATE ─────────────────────────────── */
function updateHero() {
  const namesEl    = document.getElementById('wed-hero-names');
  const dateBadge  = document.getElementById('wed-hero-date');
  const venueBadge = document.getElementById('wed-hero-venue');
  const countdownEl= document.getElementById('wed-hero-countdown');
  const ofLabel    = document.getElementById('wed-hero-of-label');

  if (ofLabel) ofLabel.style.opacity = (WED.couple.p1 || WED.couple.p2) ? '0.8' : '0.3';

  if (namesEl) {
    namesEl.innerHTML = (WED.couple.p1 || '—')
      + '<span class="wedding-amp">&amp;</span>'
      + (WED.couple.p2 || '—');
  }
  if (dateBadge) {
    if (WED.date) {
      const d = new Date(WED.date + 'T12:00:00');
      const weekday = d.toLocaleDateString('en-PH', { weekday: 'long' });
      const month   = d.toLocaleDateString('en-PH', { month: 'short' }).toUpperCase();
      const day     = d.getDate();
      const year    = d.getFullYear();
      dateBadge.style.display = 'block';
      dateBadge.innerHTML =
        `<span class="hero-date-weekday">${weekday},</span>`
        + `<span class="hero-date-month">${month}</span>`
        + `<span class="hero-date-day">${day}</span>`
        + `<span class="hero-date-year">${year}</span>`;
    } else {
      dateBadge.style.display = 'none';
    }
  }
  if (venueBadge) {
    if (WED.venue) {
      venueBadge.style.display = 'block';
      venueBadge.textContent = WED.venue;
    } else {
      venueBadge.style.display = 'none';
    }
  }
  if (countdownEl) countdownEl.textContent = getCountdown();
}

/* ── OVERVIEW ────────────────────────────────── */
function renderOverview() {
  const el = document.getElementById('wed-overview-content');
  if (!el) return;
  updateHero();

  if (!WED.couple.p1 && !WED.couple.p2) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-emoji">💍</div>
      <div class="empty-title">Start Planning Your Wedding</div>
      <div class="empty-sub">Add your names, date, venue, and budget<br>to begin your planning journey.</div>
      <button onclick="openSetupModal()" class="cta-btn" style="max-width:260px;margin:0 auto">✏️ Set Up Wedding Details</button>
    </div>`;
    return;
  }

  const totalDone  = WED.checklist.reduce((a,p)=>a+p.items.filter(i=>i.done).length,0);
  const totalItems = WED.checklist.reduce((a,p)=>a+p.items.length,0);
  const pct        = totalItems ? Math.round((totalDone/totalItems)*100) : 0;
  const totalSpent = WED.expenses.reduce((a,e)=>a+e.amount,0);
  const paid       = WED.expenses.filter(e=>e.paid).reduce((a,e)=>a+e.amount,0);
  const attending  = WED.guests.filter(g=>g.rsvp==='attending').length;

  el.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
      <button onclick="openSetupModal()" class="icon-btn">✏️ Edit Details</button>
    </div>
    <!-- Elegant stats strip — no boxes -->
    <div class="hero-stats-strip" style="margin-bottom:16px">
      <div class="hss-item">
        <span class="hss-val">${getCountdown().replace(' to go','').replace(' days','d').replace(' months,','mo')}</span>
        <span class="hss-lbl">To the Day</span>
      </div>
      <div class="hss-item">
        <span class="hss-val">${attending} / ${WED.guests.length}</span>
        <span class="hss-lbl">Guests</span>
      </div>
      <div class="hss-item">
        <span class="hss-val">₱${totalSpent >= 1000 ? (totalSpent/1000).toFixed(0)+'k' : totalSpent.toLocaleString()}</span>
        <span class="hss-lbl">Committed</span>
      </div>
      <div class="hss-item">
        <span class="hss-val">${pct}%</span>
        <span class="hss-lbl">Planned</span>
      </div>
    </div>

    <div style="margin-bottom:16px;padding:16px;border-radius:18px" class="glass">
      <span class="sec-title">Planning Progress</span>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="progress-bar-wrap" style="flex:1">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <span style="font-size:13px;font-weight:700;color:var(--tan-dark)">${pct}%</span>
      </div>
      <div style="font-size:11.5px;color:var(--ink-4);margin-top:6px">${totalDone} of ${totalItems} tasks complete</div>
    </div>

    <div style="padding:16px;border-radius:18px;margin-bottom:12px" class="glass">
      <span class="sec-title">Event Details</span>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;gap:10px;align-items:center"><span style="font-size:16px">💑</span><div><div style="font-size:13px;font-weight:700;color:var(--ink)">${WED.couple.p1} &amp; ${WED.couple.p2}</div><div style="font-size:11px;color:var(--ink-4)">Couple</div></div></div>
        ${WED.date?`<div style="display:flex;gap:10px;align-items:center"><span style="font-size:16px">📅</span><div><div style="font-size:13px;font-weight:700;color:var(--ink)">${new Date(WED.date).toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div><div style="font-size:11px;color:var(--ink-4)">Wedding Date</div></div></div>`:''}
        ${WED.venue?`<div style="display:flex;gap:10px;align-items:center"><span style="font-size:16px">📍</span><div><div style="font-size:13px;font-weight:700;color:var(--ink)">${WED.venue}</div><div style="font-size:11px;color:var(--ink-4)">Venue</div></div></div>`:''}
        <div style="display:flex;gap:10px;align-items:center"><span style="font-size:16px">💰</span><div><div style="font-size:13px;font-weight:700;color:var(--ink)">₱${WED.budget.toLocaleString()}</div><div style="font-size:11px;color:var(--ink-4)">Total Budget</div></div></div>
      </div>
    </div>

    <!-- Invitation -->
    <div style="padding:16px;border-radius:18px" class="glass">
      <span class="sec-title">Wedding Invitation</span>
      ${WED._invitationImg ? `<img src="${WED._invitationImg}" style="width:100%;border-radius:14px;margin-bottom:10px">` : `
        <div style="padding:20px;border-radius:14px;border:1.5px dashed rgba(224,120,152,0.4);background:rgba(252,232,238,0.3);text-align:center;margin-bottom:10px">
          <div style="font-size:28px;margin-bottom:6px">💌</div>
          <div style="font-size:12.5px;color:var(--ink-3)">Upload your own invitation design</div>
        </div>`}
      <label style="display:block;width:100%;padding:10px;border-radius:14px;background:rgba(252,232,238,0.65);border:1px solid rgba(224,120,152,0.25);font-size:13px;font-weight:700;color:var(--pink-deep);cursor:pointer;text-align:center;margin-bottom:8px">
        📎 ${WED._invitationImg ? 'Replace Invitation' : 'Upload Invitation'}
        <input type="file" accept="image/*" style="display:none" onchange="uploadInvitation(event)">
      </label>
      <button onclick="showRSVPCard()" style="width:100%;padding:10px;border-radius:14px;background:rgba(245,230,200,0.65);border:1px solid rgba(201,169,110,0.25);font-size:13px;font-weight:700;color:var(--tan-dark);cursor:pointer">💌 Generate Digital Invitation</button>
    </div>

    ${typeof renderCloudSection === 'function' ? renderCloudSection() : `
    <div style="padding:16px;border-radius:18px;margin-top:12px" class="glass">
      <span class="sec-title">📦 Templates &amp; Backup</span>
      <div style="font-size:12px;color:var(--ink-4);margin-bottom:10px">Loading cloud features…</div>
    </div>`}`;
}

function uploadInvitation(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => { WED._invitationImg = e.target.result; saveState(); renderOverview(); showToast('💌 Invitation uploaded!'); };
  reader.readAsDataURL(file);
}

/* ── SETUP MODAL ─────────────────────────────── */
function openSetupModal() {
  document.getElementById('ov-p1').value    = WED.couple.p1;
  document.getElementById('ov-p2').value    = WED.couple.p2;
  document.getElementById('ov-date').value  = WED.date;
  document.getElementById('ov-venue').value = WED.venue;
  document.getElementById('ov-budget').value= WED.budget || '';
  openModal('wed-setup-modal');
}

function submitSetup() {
  WED.couple.p1 = document.getElementById('ov-p1')?.value.trim()    || WED.couple.p1;
  WED.couple.p2 = document.getElementById('ov-p2')?.value.trim()    || WED.couple.p2;
  WED.date      = document.getElementById('ov-date')?.value         || WED.date;
  WED.venue     = document.getElementById('ov-venue')?.value.trim() || WED.venue;
  WED.budget    = parseInt(document.getElementById('ov-budget')?.value) || WED.budget;
  saveState();
  closeModal('wed-setup-modal');
  renderOverview();
  showToast('✅ Wedding details updated!');
}

/* ── BUDGET ──────────────────────────────────── */
const CAT_COLORS = { venue:'glass-cream', catering:'glass-green', florals:'glass-pink', photography:'glass-cream', attire:'glass-pink', music:'glass-cream', cake:'glass-cream', invites:'glass-green', other:'glass-cream' };
const CAT_EMOJIS = { venue:'🏛️', catering:'🍽️', florals:'💐', photography:'📸', attire:'👗', music:'🎵', cake:'🎂', invites:'💌', other:'📦' };

function renderBudget() {
  const el = document.getElementById('wed-budget-content');
  if (!el) return;

  if (!WED.expenses.length && !WED.budget) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-emoji">💸</div>
      <div class="empty-title">No Budget Set Yet</div>
      <div class="empty-sub">Set your total budget and start<br>tracking wedding expenses.</div>
      <button onclick="openSetupModal()" class="cta-btn" style="max-width:220px;margin:0 auto">Set Budget</button>
    </div>`;
    return;
  }

  const totalSpent = WED.expenses.reduce((a,e)=>a+e.amount,0);
  const paid       = WED.expenses.filter(e=>e.paid).reduce((a,e)=>a+e.amount,0);
  const remaining  = WED.budget - totalSpent;
  const pct        = WED.budget ? Math.min(Math.round((totalSpent/WED.budget)*100),100) : 0;

  const byCat = {};
  WED.expenses.forEach(e => { byCat[e.category] = (byCat[e.category]||0)+e.amount; });

  el.innerHTML = `
    <div class="budget-hero">
      <div style="font-size:11px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.8px">Total Budget</div>
      <div style="font-family:var(--f2);font-size:34px;font-style:italic;font-weight:600;color:var(--ink);letter-spacing:-1px;margin:4px 0 12px">₱${WED.budget.toLocaleString()}</div>
      <div class="progress-bar-wrap" style="margin-bottom:8px">
        <div class="progress-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,var(--green-accent),var(--tan))"></div>
      </div>
      <div style="display:flex;justify-content:space-between">
        <span style="font-size:12px;color:var(--ink-3)">Committed ₱${totalSpent.toLocaleString()}</span>
        <span style="font-size:12px;font-weight:700;color:${remaining>=0?'var(--green-deep)':'var(--pink-deep)'}">${remaining>=0?'₱'+remaining.toLocaleString()+' left':'₱'+Math.abs(remaining).toLocaleString()+' over'}</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:8px;background:rgba(90,171,122,0.15);color:var(--green-deep);border:1px solid rgba(90,171,122,0.2)">Paid ₱${paid.toLocaleString()}</span>
        <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:8px;background:rgba(224,120,152,0.12);color:var(--pink-deep);border:1px solid rgba(224,120,152,0.2)">Pending ₱${(totalSpent-paid).toLocaleString()}</span>
      </div>
    </div>

    ${Object.keys(byCat).length ? `
    <span class="sec-title">By Category</span>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${Object.entries(byCat).map(([cat,amt])=>`
        <div class="${CAT_COLORS[cat]||'glass-cream'}" style="padding:12px;border-radius:var(--r-md)">
          <div style="font-size:20px;margin-bottom:4px">${CAT_EMOJIS[cat]||'📦'}</div>
          <div style="font-size:12.5px;font-weight:700;color:var(--ink);text-transform:capitalize">${cat}</div>
          <div style="font-family:var(--f2);font-size:16px;font-style:italic;color:var(--ink);margin-top:2px">₱${amt.toLocaleString()}</div>
        </div>`).join('')}
    </div>` : ''}

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span class="sec-title" style="margin-bottom:0">All Expenses</span>
      <button onclick="openModal('wed-add-expense-modal')" class="icon-btn">+ Add</button>
    </div>
    ${WED.expenses.length ? WED.expenses.map((e,i)=>`
      <div class="glass" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:var(--r-md);margin-bottom:7px">
        <div style="width:36px;height:36px;border-radius:var(--r-sm);background:rgba(245,230,200,0.6);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;border:1px solid rgba(201,169,110,0.2)">${CAT_EMOJIS[e.category]||'📦'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:var(--ink)">${e.label}</div>
          <div style="font-size:11px;color:var(--ink-4);text-transform:capitalize">${e.category}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:14px;font-weight:700;color:var(--ink)">₱${e.amount.toLocaleString()}</div>
          <div style="font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:6px;margin-top:2px;background:${e.paid?'rgba(90,171,122,0.12)':'rgba(224,120,152,0.12)'};color:${e.paid?'var(--green-deep)':'var(--pink-deep)'};">${e.paid?'Paid':'Pending'}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <button onclick="toggleExpensePaid(${i})" style="padding:4px 7px;border-radius:7px;border:1px solid rgba(90,171,122,0.25);background:rgba(90,171,122,0.12);font-size:10px;font-weight:700;color:var(--green-deep);cursor:pointer">${e.paid?'Unpay':'Mark Paid'}</button>
          <button onclick="deleteExpense(${i})" style="padding:4px 7px;border-radius:7px;border:1px solid rgba(224,120,152,0.2);background:rgba(252,232,238,0.5);font-size:11px;cursor:pointer;color:var(--pink-deep)">🗑</button>
        </div>
      </div>`).join('') : `<div style="text-align:center;padding:24px;font-size:13px;color:var(--ink-4)">No expenses yet — click "+ Add" to start tracking.</div>`}
    <button onclick="openModal('wed-add-expense-modal')" class="cta-btn" style="margin-top:8px">+ Add Expense</button>`;
}

function addWedExpense() {
  const label    = document.getElementById('wed-exp-label')?.value.trim();
  const amount   = parseFloat((document.getElementById('wed-exp-amount')?.value||'').replace(/,/g,''))||0;
  const category = document.getElementById('wed-exp-category')?.value;
  if (!label||!amount) { showToast('⚠️ Fill in all fields'); return; }
  WED.expenses.push({ id: Date.now(), category, label, amount, paid: false });
  document.getElementById('wed-exp-label').value  = '';
  document.getElementById('wed-exp-amount').value = '';
  saveState();
  closeModal('wed-add-expense-modal');
  renderBudget();
  showToast('💸 Expense added!');
}

function toggleExpensePaid(i) {
  WED.expenses[i].paid = !WED.expenses[i].paid;
  saveState();
  renderBudget();
  showToast(WED.expenses[i].paid ? '✅ Marked as paid!' : '↩ Marked unpaid');
}

function deleteExpense(i) {
  if (!confirm('Delete "'+WED.expenses[i].label+'"?')) return;
  WED.expenses.splice(i, 1);
  saveState();
  renderBudget();
  showToast('🗑 Expense removed');
}

/* ── GUESTS ──────────────────────────────────── */
function renderGuests() {
  const el = document.getElementById('wed-guests-content');
  if (!el) return;
  const attending = WED.guests.filter(g=>g.rsvp==='attending').length;
  const pending   = WED.guests.filter(g=>g.rsvp==='pending').length;
  const declined  = WED.guests.filter(g=>g.rsvp==='declined').length;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">
      <div class="glass-green" style="padding:12px;border-radius:var(--r-md);text-align:center">
        <div style="font-size:22px;font-weight:700;color:var(--green-deep);font-family:var(--f2);font-style:italic">${attending}</div>
        <div style="font-size:10.5px;color:var(--green-deep);font-weight:700">Attending</div>
      </div>
      <div class="glass-cream" style="padding:12px;border-radius:var(--r-md);text-align:center">
        <div style="font-size:22px;font-weight:700;color:var(--tan-dark);font-family:var(--f2);font-style:italic">${pending}</div>
        <div style="font-size:10.5px;color:var(--tan-dark);font-weight:700">Pending</div>
      </div>
      <div class="glass-pink" style="padding:12px;border-radius:var(--r-md);text-align:center">
        <div style="font-size:22px;font-weight:700;color:var(--pink-deep);font-family:var(--f2);font-style:italic">${declined}</div>
        <div style="font-size:10.5px;color:var(--pink-deep);font-weight:700">Declined</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button onclick="openModal('wed-add-guest-modal')" style="flex:1;padding:10px;border-radius:var(--r-md);background:rgba(245,230,200,0.65);border:1px solid rgba(201,169,110,0.28);font-size:13px;font-weight:700;color:var(--tan-dark);cursor:pointer">+ Add Guest</button>
      <button onclick="showRSVPCard()" style="flex:1;padding:10px;border-radius:var(--r-md);background:rgba(252,232,238,0.65);border:1px solid rgba(224,120,152,0.28);font-size:13px;font-weight:700;color:var(--pink-deep);cursor:pointer">💌 Send Invites</button>
    </div>
    ${WED.guests.length ? WED.guests.map(g => {
      const chair = WED.furniture.find(f => g._chairId === f.id);
      const initials = g.name.split(' ').map(n=>n[0]).join('').substring(0,2);
      const bgColor = g.rsvp==='attending'?'rgba(232,245,237,0.8)':g.rsvp==='declined'?'rgba(252,232,238,0.8)':'rgba(245,230,200,0.8)';
      const txtColor= g.rsvp==='attending'?'var(--green-deep)':g.rsvp==='declined'?'var(--pink-deep)':'var(--tan-dark)';
      return `<div class="glass" style="border-radius:var(--r-md);margin-bottom:7px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:10px;padding:12px 14px">
          <div style="width:38px;height:38px;border-radius:10px;background:${bgColor};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:${txtColor};flex-shrink:0;border:1px solid rgba(255,255,255,0.6)">${initials}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13.5px;font-weight:700;color:var(--ink)">${g.name}</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:3px">
              <span style="font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:6px;background:rgba(245,230,200,0.7);color:var(--tan-dark);border:1px solid rgba(201,169,110,0.2)">Table ${g.table} · Seat ${g.seat}</span>
              ${chair?`<span style="font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:6px;background:rgba(90,171,122,0.12);color:var(--green-deep);border:1px solid rgba(90,171,122,0.2)">🪑 ${chair.label}</span>`:''}
              ${g.meal?`<span style="font-size:10.5px;padding:2px 7px;border-radius:6px;background:rgba(255,253,248,0.8);color:var(--ink-3);border:1px solid rgba(201,169,110,0.12)">${g.meal}</span>`:''}
              ${g.phone?`<a href="tel:${g.phone.replace(/\s/g,'')}" style="font-size:10.5px;padding:2px 7px;border-radius:6px;background:rgba(90,171,122,0.1);color:var(--green-deep);border:1px solid rgba(90,171,122,0.18);text-decoration:none;font-weight:700">📞 ${g.phone}</a>`:''}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
            <select onchange="updateGuestRSVP(${g.id},this.value)" style="padding:4px 8px;border-radius:8px;border:1px solid rgba(201,169,110,0.25);background:rgba(255,253,248,0.8);font-size:11px;font-weight:700;color:var(--ink-2);font-family:var(--f);cursor:pointer;outline:none">
              <option value="attending" ${g.rsvp==='attending'?'selected':''}>✅ Attending</option>
              <option value="pending"   ${g.rsvp==='pending'  ?'selected':''}>⏳ Pending</option>
              <option value="declined"  ${g.rsvp==='declined' ?'selected':''}>❌ Declined</option>
            </select>
            <button onclick="removeGuest(${g.id})" style="width:26px;height:26px;border-radius:7px;border:none;background:rgba(224,120,152,0.12);font-size:13px;cursor:pointer;color:var(--pink-deep)">🗑</button>
          </div>
        </div>
      </div>`;
    }).join('') : `<div style="text-align:center;padding:32px;font-size:13px;color:var(--ink-4)">No guests yet — click "+ Add Guest" to start your list.</div>`}`;
}

let _newGuestMeal = 'chicken';

function selectGuestMeal(btn, val) {
  _newGuestMeal = val;
  document.querySelectorAll('#guest-meal-picker .split-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function submitAddGuest() {
  const name = (document.getElementById('new-guest-name')?.value || '').trim();
  if (!name) { showToast('⚠️ Enter a guest name'); return; }
  const table   = parseInt(document.getElementById('new-guest-table')?.value) || 1;
  const seat    = parseInt(document.getElementById('new-guest-seat')?.value)  || 1;
  const phone   = (document.getElementById('new-guest-phone')?.value   || '').trim();
  const dietary = (document.getElementById('new-guest-dietary')?.value || '').trim();
  WED.guests.push({ id: WED.nextGuestId++, name, table, seat, rsvp:'pending', meal:_newGuestMeal, dietary, phone });
  document.getElementById('new-guest-name').value    = '';
  document.getElementById('new-guest-table').value   = '';
  document.getElementById('new-guest-seat').value    = '';
  document.getElementById('new-guest-phone').value   = '';
  document.getElementById('new-guest-dietary').value = '';
  _newGuestMeal = 'chicken';
  saveState();
  closeModal('wed-add-guest-modal');
  renderGuests();
  renderSeatAssignments();
  drawCanvas();
  showToast('🎉 '+name+' added!');
}

function updateGuestRSVP(id, val) {
  const g = WED.guests.find(g=>g.id===id);
  if (g) { g.rsvp = val; saveState(); renderGuests(); showToast('✅ RSVP updated for '+g.name); }
}

function removeGuest(id) {
  const g = WED.guests.find(g=>g.id===id);
  if (!g) return;
  if (!confirm('Remove '+g.name+'?')) return;
  WED.guests = WED.guests.filter(gg=>gg.id!==id);
  saveState();
  renderGuests();
  renderSeatAssignments();
  drawCanvas();
  showToast('🗑 '+g.name+' removed');
}

/* ── RSVP / INVITATION CARD ──────────────────── */
function showRSVPCard() {
  const modal = document.getElementById('rsvp-card-modal');
  if (!modal) return;
  const canvas = document.getElementById('rsvp-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width  = 380;
  const h = canvas.height = 560;

  if (WED.customCardImage) {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img,0,0,w,h); };
    img.src = WED.customCardImage;
    modal.classList.add('open');
    return;
  }

  // gradient bg
  const grad = ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,'#fef6e8'); grad.addColorStop(0.5,'#fce8ee'); grad.addColorStop(1,'#e8f5ed');
  ctx.fillStyle=grad; ctx.roundRect(0,0,w,h,24); ctx.fill();

  // deco circles
  ctx.globalAlpha=0.12;
  ctx.fillStyle='#c9a96e'; ctx.beginPath(); ctx.arc(340,60,90,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#e07898'; ctx.beginPath(); ctx.arc(40,500,70,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;

  // border
  ctx.strokeStyle='rgba(201,169,110,0.35)'; ctx.lineWidth=1.5;
  ctx.roundRect(8,8,w-16,h-16,20); ctx.stroke();

  // florals
  ctx.font='28px serif'; ctx.textAlign='left';
  ctx.fillText('🌸',18,50); ctx.fillText('🌸',w-52,50);
  ctx.fillText('🌿',12,h-28); ctx.fillText('🌿',w-44,h-28);

  // header
  ctx.fillStyle='#7a6045'; ctx.font='500 12.5px Figtree,sans-serif'; ctx.textAlign='center';
  ctx.fillText('YOU ARE CORDIALLY INVITED TO THE WEDDING OF', w/2, 80);

  // names
  const p1 = WED.couple.p1 || 'Partner 1';
  const p2 = WED.couple.p2 || 'Partner 2';
  ctx.fillStyle='#2c1f0e'; ctx.font='italic 600 38px Lora,serif';
  ctx.fillText(p1, w/2, 130);
  ctx.fillStyle='#c9a96e'; ctx.font='italic 400 22px Lora,serif';
  ctx.fillText('&', w/2, 162);
  ctx.fillStyle='#2c1f0e'; ctx.font='italic 600 38px Lora,serif';
  ctx.fillText(p2, w/2, 200);

  // divider
  ctx.strokeStyle='rgba(201,169,110,0.4)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(60,220); ctx.lineTo(w-60,220); ctx.stroke();

  // date
  const dateStr = WED.date
    ? new Date(WED.date).toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})
    : '(Date TBD)';
  ctx.fillStyle='#4a3520'; ctx.font='600 15px Figtree,sans-serif';
  ctx.fillText(dateStr, w/2, 252);
  ctx.fillStyle='#7a6045'; ctx.font='400 13px Figtree,sans-serif';
  ctx.fillText('3:00 PM', w/2, 275);
  ctx.fillStyle='#4a3520'; ctx.font='600 14px Figtree,sans-serif';
  ctx.fillText(WED.venue || '(Venue TBD)', w/2, 300);

  // divider 2
  ctx.strokeStyle='rgba(201,169,110,0.3)';
  ctx.beginPath(); ctx.moveTo(60,318); ctx.lineTo(w-60,318); ctx.stroke();

  // rsvp section
  ctx.fillStyle='#7a6045'; ctx.font='500 12px Figtree,sans-serif';
  ctx.fillText('KINDLY CONFIRM YOUR ATTENDANCE', w/2, 342);

  // rsvp button visual
  const btnGrad = ctx.createLinearGradient(w/2-80,358,w/2+80,396);
  btnGrad.addColorStop(0,'#c9a96e'); btnGrad.addColorStop(1,'#a07840');
  ctx.fillStyle=btnGrad;
  ctx.beginPath(); ctx.roundRect(w/2-80,358,160,38,10); ctx.fill();
  ctx.fillStyle='white'; ctx.font='700 14px Figtree,sans-serif';
  ctx.fillText('RSVP NOW →', w/2, 382);

  // hashtag
  ctx.fillStyle='#c9a96e'; ctx.font='italic 400 13px Lora,serif';
  ctx.fillText(`#${p1}And${p2}`, w/2, 538);

  modal.classList.add('open');
}

window.loadCustomCard = function(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    WED.customCardImage = e.target.result;
    saveState();
    document.getElementById('clear-card-btn').style.display = 'inline-block';
    showToast('🖼 Custom card uploaded!');
    showRSVPCard();
  };
  reader.readAsDataURL(file);
};

window.clearCustomCard = function() {
  WED.customCardImage = null;
  saveState();
  document.getElementById('clear-card-btn').style.display = 'none';
  document.getElementById('custom-card-upload').value = '';
  showToast('🗑 Custom card removed');
  showRSVPCard();
};

/* ═══════════════════════════════════════════════
   SUPPLIERS
═══════════════════════════════════════════════ */
const SUGGESTED_SUPPLIERS = [
  { cat:'venue',       emoji:'🏛️', label:'Venue',           tip:'Book 12+ months out — venues fill fast',         link:'https://kasal.com/venues' },
  { cat:'catering',    emoji:'🍽️', label:'Catering',        tip:'Request a tasting before signing anything',       link:'https://kasal.com/caterers' },
  { cat:'photography', emoji:'📸', label:'Photography',      tip:'Ask for full-day + 2nd shooter + album',          link:'https://kasal.com/photography' },
  { cat:'videography', emoji:'🎬', label:'Videography',      tip:'SDE (same-day edit) is the Filipino must-have',   link:'https://kasal.com/videography' },
  { cat:'florals',     emoji:'💐', label:'Florals',          tip:'Seasonal blooms save 20–30% on your budget',      link:'https://kasal.com/florists' },
  { cat:'attire',      emoji:'👗', label:'Attire & Styling', tip:'Schedule fittings at least 3 months before',     link:'https://kasal.com/attire' },
  { cat:'music',       emoji:'🎵', label:'Music & Band',     tip:'Hear them live at a gig before booking',          link:'https://kasal.com/entertainment' },
  { cat:'coordination',emoji:'📋', label:'Coordination',     tip:'A good coordinator is the best investment',       link:'https://kasal.com/coordinators' },
  { cat:'cake',        emoji:'🎂', label:'Cake & Desserts',  tip:'Order tasting boxes from your shortlist',         link:'https://kasal.com/cakes' },
  { cat:'invites',     emoji:'💌', label:'Invitations',      tip:'Stationery sets the entire wedding tone',         link:'https://kasal.com/invitations' },
  { cat:'hair',        emoji:'💄', label:'Hair & Makeup',    tip:'Book an HMUA who specializes in your look',       link:'https://kasal.com/hairmakeup' },
  { cat:'photo-booth', emoji:'🖼️', label:'Photo Booth',      tip:'Fun keepsake for guests — worth every peso',      link:'https://kasal.com/photobooth' },
];

const VENDOR_EMOJI = { venue:'🏛️',catering:'🍽️',photography:'📸',videography:'🎬',florals:'💐',attire:'👗',music:'🎵',coordination:'📋',cake:'🎂',invites:'💌',hair:'💄','photo-booth':'🖼️',other:'📦' };
function getSupplierEmoji(cat) { return VENDOR_EMOJI[cat] || '🤝'; }

// Partner suppliers per category — populated when partnership agreements are in place
const PARTNER_SUPPLIERS = {
  venue:[], catering:[], photography:[], videography:[], florals:[],
  attire:[], music:[], coordination:[], cake:[], invites:[], hair:[], 'photo-booth':[],
};

function openPartnerBrowse(cat, label) {
  const partners = PARTNER_SUPPLIERS[cat] || [];
  const titleEl   = document.getElementById('partner-browse-title');
  const contentEl = document.getElementById('partner-browse-content');
  if (titleEl)   titleEl.textContent = label + ' — Featured Partners';
  if (contentEl) {
    contentEl.innerHTML = partners.length
      ? partners.map(p => `
          <a href="${p.link}" target="_blank" rel="noopener"
             style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:var(--r-md);background:rgba(245,230,200,0.5);border:1px solid rgba(184,145,106,0.22);margin-bottom:8px;text-decoration:none">
            <div style="flex:1">
              <div style="font-size:13px;font-weight:700;color:var(--ink)">${p.name}</div>
              <div style="font-size:11px;color:var(--ink-4)">${p.area}</div>
            </div>
            <span style="font-size:11px;font-weight:700;color:var(--gold-dark)">View →</span>
          </a>`).join('')
      : `<div style="text-align:center;padding:32px 16px">
           <div style="font-size:32px;margin-bottom:12px">◇</div>
           <div style="font-size:14px;font-weight:700;color:var(--ink-2);margin-bottom:8px">Partner suppliers coming soon</div>
           <div style="font-size:12.5px;color:var(--ink-4);line-height:1.6;margin-bottom:16px">
             We're curating the best vetted ${label.toLowerCase()} suppliers<br>for Philippine weddings.
           </div>
           <div style="font-size:11.5px;color:var(--gold-dark);font-weight:600">Are you a ${label.toLowerCase()} supplier?<br>
             <a href="mailto:hello@anotara.com" style="color:var(--gold-dark)">Reach out to be featured →</a>
           </div>
         </div>`;
  }
  openModal('partner-browse-modal');
}

function renderSuppliers() {
  const el = document.getElementById('wed-suppliers-content');
  if (!el) return;

  // Index my vendors by category
  const byCategory = {};
  WED.vendors.forEach(v => { (byCategory[v.category] = byCategory[v.category]||[]).push(v); });

  el.innerHTML = `
    <div class="glass-pink" style="padding:16px;border-radius:var(--r-lg);margin-bottom:16px;text-align:center">
      <div style="font-size:26px;margin-bottom:6px">🤝</div>
      <div style="font-size:14px;font-weight:700;color:var(--ink)">Suggested Wedding Suppliers</div>
      <div style="font-size:11.5px;color:var(--ink-3);margin-top:3px">Curated for Philippine weddings · tap Browse to explore</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      ${SUGGESTED_SUPPLIERS.map(s => {
        const mine = byCategory[s.cat] || [];
        return `
        <div class="glass" style="padding:12px;border-radius:var(--r-md)">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
            <span style="font-size:19px">${s.emoji}</span>
            <span style="font-size:11.5px;font-weight:700;color:var(--ink)">${s.label}</span>
          </div>
          <div style="font-size:9.5px;color:var(--ink-4);margin-bottom:8px;line-height:1.4">${s.tip}</div>
              ${mine.map(v => `
            <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:8px;background:rgba(90,171,122,0.1);border:1px solid rgba(90,171,122,0.18);margin-bottom:4px">
              <span style="font-size:10.5px;font-weight:700;color:var(--green-deep);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v.name}</span>
              ${v.phone?`<a href="tel:${v.phone.replace(/\s/g,'')}" style="font-size:11px;font-weight:700;text-decoration:none;color:var(--green-deep)" title="${v.phone}">Call</a>`:''}
              <button onclick="deleteVendor(${v.id})" style="font-size:11px;border:none;background:none;color:var(--pink-deep);cursor:pointer;padding:0;line-height:1">×</button>
            </div>`).join('')}
          <div style="display:flex;gap:5px;margin-top:4px">
            <button onclick="openPartnerBrowse('${s.cat}','${s.label}')"
               style="flex:1;padding:6px 4px;border-radius:8px;border:1px solid rgba(201,169,110,0.25);background:rgba(245,230,200,0.55);font-size:9.5px;font-weight:700;color:var(--tan-dark);cursor:pointer;font-family:var(--f)">
               Browse →</button>
            <button onclick="openAddVendorModal('${s.cat}','${s.label}')"
              style="padding:6px 9px;border-radius:8px;border:1px solid rgba(224,120,152,0.25);background:rgba(252,232,238,0.55);font-size:9.5px;font-weight:700;color:var(--pink-deep);cursor:pointer;font-family:var(--f)">
              + Add</button>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span class="sec-title" style="margin-bottom:0">My Vendors</span>
      <button onclick="openAddVendorModal('','other')" class="icon-btn">+ Add Vendor</button>
    </div>

    ${WED.vendors.length ? WED.vendors.map(v => `
      <div class="glass" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:var(--r-md);margin-bottom:7px">
        <div style="width:38px;height:38px;border-radius:10px;background:rgba(245,230,200,0.65);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;border:1px solid rgba(201,169,110,0.2)">${getSupplierEmoji(v.category)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:var(--ink)">${v.name}</div>
          <div style="font-size:11px;color:var(--ink-4);text-transform:capitalize">${v.category}${v.phone?' · '+v.phone:''}</div>
          ${v.price?`<div style="font-size:11px;color:var(--tan-dark);font-weight:700;margin-top:1px">₱${Number(v.price).toLocaleString()}</div>`:''}
          ${v.notes?`<div style="font-size:10.5px;color:var(--ink-4);margin-top:2px;font-style:italic">${v.notes}</div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
          ${v.phone?`<a href="tel:${v.phone.replace(/\s/g,'')}" style="padding:5px 8px;border-radius:8px;border:1px solid rgba(90,171,122,0.25);background:rgba(90,171,122,0.12);font-size:11px;font-weight:700;color:var(--green-deep);text-decoration:none;text-align:center">📞</a>`:''}
          ${v.link?`<a href="${v.link}" target="_blank" rel="noopener" style="padding:5px 8px;border-radius:8px;border:1px solid rgba(201,169,110,0.25);background:rgba(245,230,200,0.55);font-size:11px;font-weight:700;color:var(--tan-dark);text-decoration:none;text-align:center">🔗</a>`:''}
          <button onclick="deleteVendor(${v.id})" style="padding:5px 8px;border-radius:8px;border:1px solid rgba(224,120,152,0.2);background:rgba(252,232,238,0.5);font-size:11px;cursor:pointer;color:var(--pink-deep)">🗑</button>
        </div>
      </div>`).join('')
    : `<div style="text-align:center;padding:28px;font-size:13px;color:var(--ink-4)">No vendors saved yet — click <b>+ Add</b> next to any category above.</div>`}
  `;
}

/* ── VENDOR CRUD ─────────────────────────────── */
let _addVendorCategory = '';

function openAddVendorModal(cat, label) {
  _addVendorCategory = cat;
  const catEl = document.getElementById('vendor-category');
  if (catEl && cat) catEl.value = cat;
  openModal('wed-add-vendor-modal');
  setTimeout(() => document.getElementById('vendor-name')?.focus(), 200);
}

function submitAddVendor() {
  const name = (document.getElementById('vendor-name')?.value || '').trim();
  if (!name) { showToast('⚠️ Enter a vendor name'); return; }
  const category = document.getElementById('vendor-category')?.value || _addVendorCategory || 'other';
  const phone    = (document.getElementById('vendor-phone')?.value  || '').trim();
  const link     = (document.getElementById('vendor-link')?.value   || '').trim();
  const notes    = (document.getElementById('vendor-notes')?.value  || '').trim();
  const price    = parseFloat((document.getElementById('vendor-price')?.value||'').replace(/,/g,'')) || 0;
  WED.vendors.push({ id: WED.nextVendorId++, name, category, phone, link, notes, price });
  ['vendor-name','vendor-phone','vendor-link','vendor-notes','vendor-price'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  saveState();
  closeModal('wed-add-vendor-modal');
  renderSuppliers();
  showToast('🤝 ' + name + ' saved!');
}

function deleteVendor(id) {
  const v = WED.vendors.find(v => v.id === id);
  if (!v || !confirm('Remove "' + v.name + '"?')) return;
  WED.vendors = WED.vendors.filter(v => v.id !== id);
  saveState();
  renderSuppliers();
  showToast('🗑 Vendor removed');
}

/* ── QUICK DIALS ─────────────────────────────── */
function openQuickDials() {
  const old = document.getElementById('quick-dials-overlay');
  if (old) { old.remove(); return; }   // toggle off if already open

  const vendorContacts = WED.vendors.filter(v => v.phone);
  const guestContacts  = WED.guests.filter(g => g.phone);

  const vendorRows = vendorContacts.length
    ? vendorContacts.map(v => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--r-md);margin-bottom:5px;background:rgba(245,230,200,0.55);border:1px solid rgba(201,169,110,0.18)">
          <span style="font-size:20px;flex-shrink:0">${getSupplierEmoji(v.category)}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v.name}</div>
            <div style="font-size:10.5px;color:var(--ink-4);text-transform:capitalize">${v.category}</div>
          </div>
          <a href="tel:${v.phone.replace(/\s/g,'')}" style="padding:7px 12px;border-radius:8px;background:rgba(90,171,122,0.15);border:1px solid rgba(90,171,122,0.25);font-size:12px;font-weight:700;color:var(--green-deep);text-decoration:none;flex-shrink:0">📞 Call</a>
        </div>`).join('')
    : `<div style="font-size:12px;color:var(--ink-4);padding:10px 4px;text-align:center">Add vendors with phone numbers in the Suppliers tab.</div>`;

  const guestRows = guestContacts.length
    ? guestContacts.map(g => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--r-md);margin-bottom:5px;background:rgba(232,245,237,0.55);border:1px solid rgba(90,171,122,0.15)">
          <div style="width:34px;height:34px;border-radius:10px;background:rgba(90,171,122,0.15);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--green-deep);flex-shrink:0">${g.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${g.name}</div>
            <div style="font-size:10.5px;color:var(--ink-4)">${g.phone}</div>
          </div>
          <a href="tel:${g.phone.replace(/\s/g,'')}" style="padding:7px 12px;border-radius:8px;background:rgba(90,171,122,0.15);border:1px solid rgba(90,171,122,0.25);font-size:12px;font-weight:700;color:var(--green-deep);text-decoration:none;flex-shrink:0">📞 Call</a>
        </div>`).join('')
    : `<div style="font-size:12px;color:var(--ink-4);padding:10px 4px;text-align:center">Add phone numbers when registering guests.</div>`;

  const overlay = document.createElement('div');
  overlay.id = 'quick-dials-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:980;background:rgba(44,31,14,0.3);display:flex;align-items:flex-end;justify-content:center;';
  overlay.innerHTML = `
    <div style="width:100%;max-width:440px;background:var(--cream);border-radius:22px 22px 0 0;padding:20px 16px 44px;max-height:82vh;overflow-y:auto;box-shadow:0 -8px 40px rgba(44,31,14,0.22);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--ink)">📞 Quick Dials</div>
          <div style="font-size:11px;color:var(--ink-4);margin-top:1px">${vendorContacts.length} vendor${vendorContacts.length!==1?'s':''} · ${guestContacts.length} guest${guestContacts.length!==1?'s':''}</div>
        </div>
        <button onclick="closeQuickDials()" style="width:30px;height:30px;border-radius:50%;border:none;background:rgba(44,31,14,0.08);font-size:17px;cursor:pointer;color:var(--ink-3)">×</button>
      </div>
      <div style="font-size:10.5px;font-weight:700;color:var(--tan-dark);text-transform:uppercase;letter-spacing:0.7px;margin-bottom:8px">🤝 Vendors (${vendorContacts.length})</div>
      ${vendorRows}
      <div style="font-size:10.5px;font-weight:700;color:var(--green-deep);text-transform:uppercase;letter-spacing:0.7px;margin:14px 0 8px">👥 Guests (${guestContacts.length})</div>
      ${guestRows}
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeQuickDials(); });
  document.body.appendChild(overlay);
}

function closeQuickDials() {
  const el = document.getElementById('quick-dials-overlay');
  if (el) el.remove();
}

/* ── CHECKLIST ───────────────────────────────── */
let _addToPhaseIndex = null;

/* Generate phases based on months-before-wedding */
function generateChecklistPhases(months) {
  const m = parseInt(months, 10) || 12;
  WED.planningMonths = m;
  WED._collapsedPhases = [];

  const ALL_PHASES = [
    { minMonths: 18, phase: '18 Months Out', items: [
      { text: 'Set wedding date' },
      { text: 'Book the venue' },
      { text: 'Set overall budget' },
      { text: 'Create initial guest list' },
      { text: 'Hire wedding coordinator' },
    ]},
    { minMonths: 12, phase: '12 Months Out', items: [
      { text: 'Set wedding date' },
      { text: 'Book the venue' },
      { text: 'Set overall budget' },
      { text: 'Create initial guest list' },
      { text: 'Hire wedding coordinator' },
    ]},
    { minMonths: 9, phase: '9 Months Out', items: [
      { text: 'Book photographer & videographer' },
      { text: 'Choose wedding theme & color palette' },
      { text: 'Start shopping for wedding attire' },
    ]},
    { minMonths: 6, phase: '6 Months Out', items: [
      { text: 'Book catering' },
      { text: 'Order wedding attire' },
      { text: 'Send save-the-dates' },
      { text: 'Book live band or DJ' },
    ]},
    { minMonths: 3, phase: '3 Months Out', items: [
      { text: 'Send formal invitations' },
      { text: 'Finalize menu with caterer' },
      { text: 'Book hair & makeup' },
      { text: 'Order wedding cake' },
      { text: 'Arrange accommodations for guests' },
    ]},
    { minMonths: 1, phase: '1 Month Out', items: [
      { text: 'Confirm all vendors' },
      { text: 'Finalize seating arrangement' },
      { text: 'Submit final headcount to caterer' },
      { text: 'Pick up wedding attire' },
      { text: 'Prepare payments & envelopes' },
    ]},
    { minMonths: 0, phase: 'Week Of', items: [
      { text: 'Wedding rehearsal' },
      { text: 'Confirm vendors one last time' },
      { text: 'Pack for honeymoon' },
      { text: 'Prepare emergency kit' },
    ]},
    { minMonths: 0, phase: 'Day Of', items: [
      { text: 'Hair & makeup' },
      { text: 'Bride/groom gets dressed' },
      { text: 'Ceremony' },
      { text: 'Reception' },
      { text: 'Send-off / exit' },
    ]},
  ];

  // Pick phases that fit within the planning window; always include Week Of + Day Of
  const fixed = ['Week Of', 'Day Of'];
  let chosen;
  if (m >= 18) {
    chosen = ALL_PHASES.filter(p => p.minMonths <= m && p.minMonths >= 18 || fixed.includes(p.phase) || (p.minMonths < 18 && p.minMonths > 0 && p.minMonths <= m));
    chosen = ALL_PHASES; // 18+ months: all phases
  } else {
    chosen = ALL_PHASES.filter(p => p.minMonths <= m || fixed.includes(p.phase));
  }
  // Remove the 18-month phase if planning less than 18 months
  if (m < 18) chosen = chosen.filter(p => p.phase !== '18 Months Out');
  // Remove the 12-month phase if planning less than 12 months
  if (m < 12) chosen = chosen.filter(p => p.phase !== '12 Months Out');
  // Remove the 9-month phase if planning less than 9 months
  if (m < 9) chosen = chosen.filter(p => p.phase !== '9 Months Out');

  let idCounter = Date.now();
  WED.checklist = chosen.map(p => ({
    phase: p.phase,
    items: p.items.map(it => ({
      id: 'c' + (idCounter++),
      text: it.text,
      done: false,
      note: '',
      noteAt: null,
    })),
  }));
  saveState();
}

function submitChecklistTimeline() {
  const sel = document.getElementById('checklist-months-select');
  const months = sel ? parseInt(sel.value, 10) : 12;
  generateChecklistPhases(months);
  renderChecklist();
  showToast('✅ Checklist ready!');
}

function togglePhaseCollapse(pi) {
  const phaseName = WED.checklist[pi]?.phase;
  if (!phaseName) return;
  const idx = WED._collapsedPhases.indexOf(phaseName);
  if (idx > -1) WED._collapsedPhases.splice(idx, 1);
  else WED._collapsedPhases.push(phaseName);
  saveState();
  renderChecklist();
}

function renderChecklist() {
  const el = document.getElementById('wed-checklist-content');
  if (!el) return;

  /* ── Setup screen when planning window not set ── */
  if (WED.planningMonths === null) {
    el.innerHTML = `
      <div style="max-width:360px;margin:24px auto 0;padding:28px 22px 26px;border-radius:var(--r-lg);background:rgba(255,252,247,0.9);border:1px solid rgba(184,145,106,0.22);text-align:center">
        <div style="font-size:26px;margin-bottom:10px">💍</div>
        <div style="font-family:var(--f2);font-size:20px;font-style:italic;color:var(--ink);margin-bottom:6px">Let's build your checklist</div>
        <div style="font-size:12.5px;color:var(--ink-3);line-height:1.6;margin-bottom:20px">How many months do you have until your wedding? We'll create the right planning phases for you.</div>
        <select id="checklist-months-select" style="width:100%;padding:10px 14px;border-radius:var(--r-md);border:1px solid rgba(184,145,106,0.3);background:rgba(250,246,238,0.9);font-size:13px;color:var(--ink);margin-bottom:16px;font-family:var(--f)">
          <option value="3">3 months — Quick sprint</option>
          <option value="6">6 months</option>
          <option value="9">9 months</option>
          <option value="12" selected>12 months — Recommended</option>
          <option value="18">18 months — Detailed planning</option>
          <option value="24">24 months — Extra thorough</option>
        </select>
        <button onclick="submitChecklistTimeline()" style="width:100%;padding:11px;border-radius:var(--r-md);background:linear-gradient(135deg,var(--gold),var(--tan-dark));border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:0.5px">Build My Checklist →</button>
      </div>`;
    return;
  }

  /* ── Normal checklist view ── */
  const totalDone  = WED.checklist.reduce((a,p)=>a+p.items.filter(i=>i.done).length,0);
  const totalItems = WED.checklist.reduce((a,p)=>a+p.items.length,0);
  const pct = totalItems ? Math.round((totalDone/totalItems)*100) : 0;

  const fmtNoteAt = iso => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' })
      + ' · ' + d.toLocaleTimeString('en-PH', { hour:'numeric', minute:'2-digit' });
  };

  el.innerHTML = `
    <div style="padding:12px 14px;border-radius:var(--r-md);background:rgba(245,230,200,0.45);border:1px solid rgba(201,169,110,0.18);margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:12px;font-weight:700;color:var(--ink-3)">Overall Progress</span>
        <span style="font-size:12px;font-weight:700;color:var(--tan-dark)">${totalDone}/${totalItems} · ${pct}%</span>
      </div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      <button onclick="WED.planningMonths=null;WED._collapsedPhases=[];saveState();renderChecklist()" style="margin-top:10px;padding:3px 10px;border-radius:6px;background:transparent;border:1px solid rgba(184,145,106,0.25);font-size:10px;color:var(--ink-4);cursor:pointer">↺ Reset checklist</button>
    </div>
    ${WED.checklist.map((phase,pi)=>{
      const done      = phase.items.filter(i=>i.done).length;
      const total     = phase.items.length;
      const pp        = total ? Math.round((done/total)*100) : 0;
      const collapsed = WED._collapsedPhases.includes(phase.phase);
      return `
      <div style="margin-bottom:14px;border-radius:var(--r-md);overflow:hidden;border:1px solid rgba(184,145,106,0.14)">
        <div onclick="togglePhaseCollapse(${pi})" style="display:flex;align-items:center;justify-content:space-between;padding:10px 13px;background:rgba(245,230,200,0.55);cursor:pointer;user-select:none">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:13px;color:var(--ink-3);transition:transform 0.2s;display:inline-block;transform:rotate(${collapsed?'-90':'0'}deg)">▾</span>
            <span style="font-size:13px;font-weight:700;color:var(--ink-2)">${phase.phase}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;color:var(--ink-4);font-weight:700">${done}/${total}</span>
            <div style="width:40px;height:4px;border-radius:2px;background:rgba(44,31,14,0.1);overflow:hidden">
              <div style="width:${pp}%;height:100%;background:linear-gradient(90deg,var(--rose),var(--tan));border-radius:2px"></div>
            </div>
          </div>
        </div>
        ${collapsed ? '' : `
        <div style="padding:8px 10px 10px;background:rgba(255,252,247,0.7)">
          ${phase.items.map(item=>{
            const noteTs = item.noteAt ? fmtNoteAt(item.noteAt) : '';
            return `
          <div class="glass" style="padding:10px 13px;border-radius:var(--r-md);margin-bottom:6px">
            <div style="display:flex;align-items:center;gap:10px">
              <div onclick="toggleChecklist('${item.id}')" style="width:22px;height:22px;border-radius:7px;border:2px solid ${item.done?'var(--green-accent)':'var(--ink-4)'};background:${item.done?'var(--green-accent)':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;transition:all 0.2s">
                ${item.done?'<span style="color:white;font-size:12px;font-weight:700">✓</span>':''}
              </div>
              <span onclick="toggleChecklist('${item.id}')" style="font-size:13px;font-weight:500;color:${item.done?'var(--ink-4)':'var(--ink)'};text-decoration:${item.done?'line-through':'none'};flex:1;cursor:pointer;line-height:1.4">${item.text}</span>
              <button onclick="openChecklistNoteEditor('${item.id}')"
                style="padding:3px 8px;border-radius:6px;border:1px solid ${item.note?'rgba(184,145,106,0.35)':'rgba(44,31,14,0.1)'};background:${item.note?'rgba(184,145,106,0.12)':'transparent'};font-size:9.5px;font-weight:700;color:${item.note?'var(--gold-dark)':'var(--ink-4)'};cursor:pointer;flex-shrink:0;font-family:var(--f)"
                title="${item.note?'Edit decision note':'Add decision note'}">
                ${item.note?'◇ Note':'+ Note'}
              </button>
              <button onclick="deleteChecklistItem('${item.id}')" style="width:24px;height:24px;border-radius:7px;border:none;background:rgba(224,120,152,0.1);color:var(--pink-deep);font-size:14px;cursor:pointer;flex-shrink:0;line-height:1">×</button>
            </div>
            ${item.note?`
            <div style="margin-top:6px;padding:6px 8px;border-radius:6px;background:rgba(184,145,106,0.08);border-left:2px solid rgba(184,145,106,0.3)">
              <div style="font-size:11.5px;color:var(--ink-3);font-style:italic;line-height:1.5">"${item.note}"</div>
              ${noteTs?`<div style="margin-top:3px;font-size:10px;color:var(--ink-4)">${noteTs}</div>`:''}
            </div>`:''}
          </div>`;
          }).join('')}
          <button onclick="openAddChecklistItemToPhase(${pi})" style="width:100%;margin-top:4px;padding:7px;border-radius:var(--r-md);background:transparent;border:1px dashed rgba(184,145,106,0.3);font-size:11.5px;font-weight:700;color:var(--ink-4);cursor:pointer">+ Add Task</button>
        </div>`}
      </div>`;
    }).join('')}`;
}

function toggleChecklist(id) {
  for (const phase of WED.checklist) {
    const item = phase.items.find(i => i.id === id);
    if (item) {
      item.done = !item.done;
      saveState(); renderChecklist(); renderOverview();
      showToast(item.done ? 'Task done' : 'Task unchecked');
      return;
    }
  }
}

let _editNoteId = null;

function openChecklistNoteEditor(id) {
  _editNoteId = id;
  let item = null;
  for (const phase of WED.checklist) {
    item = phase.items.find(i => i.id === id);
    if (item) break;
  }
  if (!item) return;
  const labelEl = document.getElementById('checklist-note-item-label');
  const inputEl = document.getElementById('checklist-note-input');
  if (labelEl) labelEl.textContent = item.text;
  if (inputEl) inputEl.value = item.note || '';
  openModal('checklist-note-modal');
  setTimeout(() => inputEl?.focus(), 200);
}

function saveChecklistNote() {
  const note = (document.getElementById('checklist-note-input')?.value || '').trim();
  for (const phase of WED.checklist) {
    const item = phase.items.find(i => i.id === _editNoteId);
    if (item) {
      item.note   = note;
      item.noteAt = note ? new Date().toISOString() : null;
      saveState();
      break;
    }
  }
  closeModal('checklist-note-modal');
  renderChecklist();
}

function openAddChecklistItem()           { _addToPhaseIndex = null; openModal('wed-add-checklist-modal'); }
function openAddChecklistItemToPhase(pi)  { _addToPhaseIndex = pi;   openModal('wed-add-checklist-modal'); }

function submitChecklistItem() {
  const text = document.getElementById('checklist-item-text')?.value.trim();
  if (!text) { showToast('⚠️ Enter a task'); return; }
  const id = 'c'+Date.now();
  if (_addToPhaseIndex !== null && WED.checklist[_addToPhaseIndex]) {
    WED.checklist[_addToPhaseIndex].items.push({ id, text, done:false, note:'' });
  } else {
    WED.checklist[WED.checklist.length-1].items.push({ id, text, done:false, note:'' });
  }
  document.getElementById('checklist-item-text').value = '';
  saveState();
  closeModal('wed-add-checklist-modal');
  renderChecklist();
  renderOverview();
  showToast('✅ Task added!');
}

function deleteChecklistItem(id) {
  for (const phase of WED.checklist) {
    const idx = phase.items.findIndex(i=>i.id===id);
    if (idx > -1) { phase.items.splice(idx,1); break; }
  }
  saveState();
  renderChecklist();
  renderOverview();
}

/* ── SCHEDULE ────────────────────────────────── */
let _editSchedIndex = null;
const SCHED_COLORS = {
  pink:  'rgba(252,232,238,0.72)',
  sand:  'rgba(245,230,200,0.72)',
  green: 'rgba(232,245,237,0.72)',
  cream: 'rgba(255,253,248,0.72)',
};
const SCHED_BORDER = {
  pink:  'rgba(224,120,152,0.2)',
  sand:  'rgba(201,169,110,0.25)',
  green: 'rgba(90,171,122,0.2)',
  cream: 'rgba(255,255,255,0.5)',
};

/* ── SCHEDULE / CALENDAR ─────────────────────── */
let _schedView = 'daily';  // 'monthly' | 'weekly' | 'daily'
let _schedDate = null;     // Date object — currently viewed date

function _getSchedDate() {
  if (!_schedDate) {
    _schedDate = WED.date ? new Date(WED.date + 'T12:00:00') : new Date();
  }
  return _schedDate;
}

function _fmtIso(d) {
  // Date → 'YYYY-MM-DD'
  return d.getFullYear() + '-'
    + String(d.getMonth()+1).padStart(2,'0') + '-'
    + String(d.getDate()).padStart(2,'0');
}

function _eventsOnDate(dateStr) {
  return WED.schedule
    .filter(s => (s.date || WED.date || '') === dateStr)
    .sort((a,b) => a.time.localeCompare(b.time));
}

function setSchedView(view) {
  _schedView = view;
  renderSchedule();
}

function navSchedDate(delta) {
  const d = _getSchedDate();
  if (_schedView === 'monthly') {
    d.setMonth(d.getMonth() + delta);
  } else if (_schedView === 'weekly') {
    d.setDate(d.getDate() + delta * 7);
  } else {
    d.setDate(d.getDate() + delta);
  }
  _schedDate = d;
  renderSchedule();
}

function jumpToDate(dateStr) {
  _schedDate = new Date(dateStr + 'T12:00:00');
  _schedView = 'daily';
  renderSchedule();
}

function prefillSchedDate() {
  const inp = document.getElementById('sched-date');
  if (!inp) return;
  if (!inp.value) {
    inp.value = _fmtIso(_getSchedDate());
  }
}

/* ── Monthly calendar view ── */
function _renderMonthView(d) {
  const year = d.getFullYear();
  const month = d.getMonth();
  const monthName = d.toLocaleString('en-PH', { month: 'long', year: 'numeric' });
  const firstDow  = new Date(year, month, 1).getDay();
  const lastDay   = new Date(year, month + 1, 0).getDate();
  const todayStr  = _fmtIso(new Date());
  const dows      = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  let grid = '<div class="cal-month-grid">';
  dows.forEach(h => { grid += `<div class="cal-month-dow">${h}</div>`; });

  for (let i = 0; i < firstDow; i++) {
    grid += '<div class="cal-month-cell cal-month-empty"></div>';
  }
  for (let day = 1; day <= lastDay; day++) {
    const mm     = String(month+1).padStart(2,'0');
    const dd     = String(day).padStart(2,'0');
    const dStr   = `${year}-${mm}-${dd}`;
    const evs    = _eventsOnDate(dStr);
    const isTdy  = dStr === todayStr;
    const isWed  = dStr === WED.date;
    grid += `
      <div class="cal-month-cell${isTdy?' cal-today':''}${isWed?' cal-wed-day':''}" onclick="jumpToDate('${dStr}')">
        <span class="cal-day-num">${day}</span>
        ${evs.length ? `<div class="cal-dots">${evs.slice(0,4).map(()=>'<span class="cal-dot"></span>').join('')}</div>` : ''}
        ${isWed ? '<span class="cal-wed-badge">💍</span>' : ''}
      </div>`;
  }
  grid += '</div>';

  return `
    <div class="cal-nav">
      <button class="cal-nav-btn" onclick="navSchedDate(-1)">‹</button>
      <span class="cal-nav-title">${monthName}</span>
      <button class="cal-nav-btn" onclick="navSchedDate(1)">›</button>
    </div>
    ${grid}
    <div class="cal-month-hint">Tap a date to see its events</div>`;
}

/* ── Weekly calendar view ── */
function _renderWeekView(d) {
  const sun = new Date(d);
  sun.setDate(d.getDate() - d.getDay()); // back to Sunday

  const todayStr  = _fmtIso(new Date());
  const dayNames  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const weekStart = sun.toLocaleDateString('en-PH', { month:'short', day:'numeric' });
  const weekEndD  = new Date(sun); weekEndD.setDate(sun.getDate()+6);
  const weekEnd   = weekEndD.toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' });

  let cols = '';
  for (let i = 0; i < 7; i++) {
    const day   = new Date(sun); day.setDate(sun.getDate()+i);
    const dStr  = _fmtIso(day);
    const evs   = _eventsOnDate(dStr);
    const isTdy = dStr === todayStr;
    const isWed = dStr === WED.date;
    cols += `
      <div class="cal-week-col${isTdy?' cal-week-today':''}${isWed?' cal-week-wedday':''}">
        <div class="cal-week-header" onclick="jumpToDate('${dStr}')">
          <div class="cal-week-dow">${dayNames[i]}</div>
          <div class="cal-week-daynum${isTdy?' cal-today-num':''}">${day.getDate()}</div>
          ${isWed ? '<div style="font-size:9px">💍</div>' : ''}
        </div>
        <div class="cal-week-events">
          ${evs.length
            ? evs.map(e=>`
            <div class="cal-week-event" style="border-left:3px solid ${SCHED_BORDER[e.color]||'rgba(201,169,110,0.5)'}" onclick="jumpToDate('${dStr}')">
              <div class="cal-week-event-time">${e.time}</div>
              <div class="cal-week-event-name">${e.event}</div>
            </div>`).join('')
            : '<div class="cal-week-empty">—</div>'}
        </div>
      </div>`;
  }

  return `
    <div class="cal-nav">
      <button class="cal-nav-btn" onclick="navSchedDate(-1)">‹</button>
      <span class="cal-nav-title">${weekStart} – ${weekEnd}</span>
      <button class="cal-nav-btn" onclick="navSchedDate(1)">›</button>
    </div>
    <div class="cal-week-grid">${cols}</div>`;
}

/* ── Daily timeline view ── */
function _renderDayView(d) {
  const dateStr  = _fmtIso(d);
  const dayLabel = d.toLocaleDateString('en-PH', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  const evs      = _eventsOnDate(dateStr);
  const isWedDay = dateStr === WED.date;

  let html = `
    <div class="cal-nav">
      <button class="cal-nav-btn" onclick="navSchedDate(-1)">‹</button>
      <span class="cal-nav-title">${dayLabel}</span>
      <button class="cal-nav-btn" onclick="navSchedDate(1)">›</button>
    </div>
    ${isWedDay ? '<div class="cal-wed-banner">💍 Your Wedding Day</div>' : ''}`;

  if (!evs.length) {
    html += `
      <div class="empty-state" style="padding:40px 0">
        <div class="empty-emoji">📅</div>
        <div class="empty-title">No Events</div>
        <div class="empty-sub">No events planned for this day.<br>Tap + Add Event above.</div>
      </div>`;
  } else {
    html += '<div class="cal-day-timeline">' + evs.map(s => {
      const i = WED.schedule.indexOf(s);
      return `
        <div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start">
          <div style="min-width:52px;text-align:right;padding-top:13px">
            <div style="font-size:11px;font-weight:700;color:var(--ink-3)">${s.time}</div>
          </div>
          <div class="timeline-dot"></div>
          <div style="flex:1;padding:12px 14px;border-radius:var(--r-md);background:${SCHED_COLORS[s.color]||SCHED_COLORS.cream};border:1px solid ${SCHED_BORDER[s.color]||SCHED_BORDER.cream};opacity:${s.done?0.6:1}">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
              <div style="flex:1">
                <div style="font-size:13.5px;font-weight:700;color:var(--ink);text-decoration:${s.done?'line-through':'none'}">${s.event}</div>
                <div style="font-size:11px;color:var(--ink-4);margin-top:2px">👤 ${s.assignee}</div>
              </div>
              <div style="display:flex;gap:5px;flex-shrink:0">
                <button onclick="toggleSchedule(${i})" style="width:26px;height:26px;border-radius:8px;border:2px solid ${s.done?'var(--green-accent)':'var(--ink-4)'};background:${s.done?'var(--green-accent)':'transparent'};display:flex;align-items:center;justify-content:center;cursor:pointer">${s.done?'<span style="color:white;font-size:11px;font-weight:700">✓</span>':''}</button>
                <button onclick="openEditSched(${i})" style="width:26px;height:26px;border-radius:8px;border:1px solid rgba(201,169,110,0.28);background:rgba(245,230,200,0.55);font-size:13px;cursor:pointer">✏️</button>
                <button onclick="deleteSchedItem(${i})" style="width:26px;height:26px;border-radius:8px;border:1px solid rgba(224,120,152,0.22);background:rgba(252,232,238,0.55);font-size:14px;cursor:pointer;color:var(--pink-deep)">×</button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('') + '</div>';
  }
  return html;
}

function renderSchedule() {
  const el = document.getElementById('wed-schedule-content');
  if (!el) return;
  const d = _getSchedDate();

  const toolbar = `
    <div class="sched-toolbar">
      <div class="sched-view-switcher">
        <button class="sched-vbtn${_schedView==='monthly'?' sched-vbtn-active':''}" onclick="setSchedView('monthly')">Monthly</button>
        <button class="sched-vbtn${_schedView==='weekly'?' sched-vbtn-active':''}" onclick="setSchedView('weekly')">Weekly</button>
        <button class="sched-vbtn${_schedView==='daily'?' sched-vbtn-active':''}" onclick="setSchedView('daily')">Daily</button>
      </div>
      <button onclick="openModal('wed-add-sched-modal');prefillSchedDate()" class="sched-add-btn">+ Add Event</button>
    </div>`;

  let body = '';
  if (_schedView === 'monthly') body = _renderMonthView(d);
  else if (_schedView === 'weekly') body = _renderWeekView(d);
  else body = _renderDayView(d);

  el.innerHTML = toolbar + body;
}

function toggleSchedule(i) {
  WED.schedule[i].done = !WED.schedule[i].done;
  saveState();
  renderSchedule();
  showToast(WED.schedule[i].done ? '✅ Done!' : '↩ Unchecked');
}

function addWedSched() {
  const date     = document.getElementById('sched-date')?.value || WED.date || '';
  const time     = document.getElementById('sched-time')?.value;
  const event    = document.getElementById('sched-event')?.value.trim();
  const assignee = document.getElementById('sched-assignee')?.value.trim();
  if (!time||!event) { showToast('⚠️ Fill in time and event'); return; }
  WED.schedule.push({ date, time, event, assignee:assignee||'Unassigned', done:false, color:'cream' });
  WED.schedule.sort((a,b) => (a.date||'').localeCompare(b.date||'') || a.time.localeCompare(b.time));
  document.getElementById('sched-date').value     = '';
  document.getElementById('sched-time').value     = '';
  document.getElementById('sched-event').value    = '';
  document.getElementById('sched-assignee').value = '';
  // Navigate calendar to the new event's date
  if (date) { _schedDate = new Date(date + 'T12:00:00'); _schedView = 'daily'; }
  saveState();
  closeModal('wed-add-sched-modal');
  renderSchedule();
  showToast('📅 Event added!');
}

function openEditSched(i) {
  _editSchedIndex = i;
  const s = WED.schedule[i];
  const dateEl = document.getElementById('edit-sched-date');
  if (dateEl) dateEl.value = s.date || WED.date || '';
  document.getElementById('edit-sched-time').value     = s.time;
  document.getElementById('edit-sched-event').value    = s.event;
  document.getElementById('edit-sched-assignee').value = s.assignee;
  openModal('wed-edit-sched-modal');
}

function submitEditSched() {
  if (_editSchedIndex === null) return;
  const s = WED.schedule[_editSchedIndex];
  s.date     = document.getElementById('edit-sched-date')?.value   || s.date || '';
  s.time     = document.getElementById('edit-sched-time')?.value   || s.time;
  s.event    = document.getElementById('edit-sched-event')?.value.trim()    || s.event;
  s.assignee = document.getElementById('edit-sched-assignee')?.value.trim() || s.assignee;
  WED.schedule.sort((a,b) => (a.date||'').localeCompare(b.date||'') || a.time.localeCompare(b.time));
  if (s.date) { _schedDate = new Date(s.date + 'T12:00:00'); _schedView = 'daily'; }
  _editSchedIndex = null;
  saveState();
  closeModal('wed-edit-sched-modal');
  renderSchedule();
  showToast('📅 Event updated!');
}

function deleteSchedItem(i) {
  WED.schedule.splice(i,1);
  saveState();
  renderSchedule();
  showToast('🗑 Item removed');
}

/* ═══════════════════════════════════════════════
   SEATING CANVAS
═══════════════════════════════════════════════ */
let cvs, cx;
let cTx = { scale: 1, ox: 20, oy: 20 };  // canvas pan/zoom transform

function screenToWorld(sx, sy) {
  return { x: (sx - cTx.ox) / cTx.scale, y: (sy - cTx.oy) / cTx.scale };
}

function initCanvas() {
  cvs = document.getElementById('seating-canvas');
  if (!cvs) return;
  if (cvs._init) { resizeCanvas(); drawCanvas(); return; }
  cvs._init = true;
  cx = cvs.getContext('2d');
  resizeCanvas();
  drawCanvas();
  bindCanvasEvents();
  bindCanvasRotate();
  bindCanvasZoom();
  bindCanvasResize();
  renderFurniturePalette();
  renderCanvasActions();
  renderSeatAssignments();
}

function resizeCanvas() {
  const wrap = document.getElementById('canvas-wrap');
  if (!wrap || !cvs) return;
  const W = wrap.clientWidth || 380;
  const isDesk = window.innerWidth >= 900;
  const defaultH = isDesk
    ? Math.max(520, window.innerHeight - 200)
    : (cvs._userHeight || 420);
  cvs.width  = W;
  cvs.height = cvs._userHeight || defaultH;
  if (!cvs._userHeight) cvs._userHeight = cvs.height;
}

function bindCanvasResize() {
  const handle = document.getElementById('canvas-resize-handle');
  if (!handle || handle._bound) return;
  handle._bound = true;
  let startY = 0, startH = 0;
  const onStart = (e) => {
    e.preventDefault();
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    startH = cvs._userHeight || 400;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onEnd);
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('touchend',  onEnd);
  };
  const onMove = (e) => {
    if (e.cancelable) e.preventDefault();
    const y   = e.touches ? e.touches[0].clientY : e.clientY;
    const newH = Math.max(280, Math.min(1400, startH + (y - startY)));
    cvs._userHeight = newH;
    cvs.height = newH;
    drawCanvas();
  };
  const onEnd = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup',   onEnd);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend',  onEnd);
  };
  handle.addEventListener('mousedown',  onStart);
  handle.addEventListener('touchstart', onStart, {passive:false});
}

function drawCanvas() {
  if (!cx || !cvs) return;
  cx.clearRect(0, 0, cvs.width, cvs.height);

  // Flat base fill (shows at edges when panned far)
  cx.fillStyle = '#ede4d3';
  cx.fillRect(0, 0, cvs.width, cvs.height);

  cx.save();
  cx.setTransform(cTx.scale, 0, 0, cTx.scale, cTx.ox, cTx.oy);

  // Visible world bounds (for culling)
  const vL = -cTx.ox / cTx.scale - 20;
  const vT = -cTx.oy / cTx.scale - 20;
  const vR = vL + cvs.width  / cTx.scale + 40;
  const vB = vT + cvs.height / cTx.scale + 40;

  // Gradient background in world space
  const bg = cx.createLinearGradient(vL, vT, vR, vB);
  bg.addColorStop(0, '#fef6e8'); bg.addColorStop(1, '#f5e6c8');
  cx.fillStyle = bg;
  cx.fillRect(vL, vT, vR - vL, vB - vT);

  // Dot grid (only visible dots)
  const GRID = 20;
  cx.fillStyle = 'rgba(201,169,110,0.22)';
  const gStartX = Math.floor(vL / GRID) * GRID;
  const gStartY = Math.floor(vT / GRID) * GRID;
  for (let gx = gStartX; gx < vR; gx += GRID) {
    for (let gy = gStartY; gy < vB; gy += GRID) {
      cx.beginPath(); cx.arc(gx, gy, 1.5, 0, Math.PI * 2); cx.fill();
    }
  }

  WED.furniture.forEach(f => drawFurniture(f));
  cx.restore();
}

function drawFurniture(f) {
  const selected = WED.selectedFurniture === f.id;
  cx.save();
  // Use stored w/h directly — rotation swaps them in-place via bindCanvasRotate
  const w = f.w;
  const h = f.h;
  const x = f.x, y = f.y;

  if (f.type === 'round') {
    const rx = x+f.w/2, ry = y+f.h/2, r = f.w/2;
    // Subtle dashed orbital ring shown when table is selected — radius adapts to actual chairs
    if (selected) {
      const sample = WED.furniture.find(c => c.type==='chair' && c.parentTableId===f.id);
      const guideR = r + (sample ? sample.w/2 : 16) + 6;
      cx.beginPath(); cx.arc(rx,ry,guideR,0,Math.PI*2);
      cx.strokeStyle = 'rgba(201,169,110,0.28)'; cx.lineWidth = 1;
      cx.setLineDash([3,5]); cx.stroke(); cx.setLineDash([]);
    }
    cx.beginPath(); cx.arc(rx,ry,r,0,Math.PI*2);
    cx.fillStyle = selected ? 'rgba(224,120,152,0.22)' : 'rgba(255,253,248,0.88)';
    cx.fill();
    cx.strokeStyle = selected ? '#e07898' : 'rgba(201,169,110,0.65)';
    cx.lineWidth = selected ? 2.5 : 1.5; cx.stroke();
    const num = parseInt(f.label.replace(/\D/g,''));
    const assignedCount = WED.guests.filter(g => g.table === num).length;
    if (assignedCount > 0) {
      cx.fillStyle = 'rgba(90,171,122,0.18)';
      cx.beginPath(); cx.arc(rx,ry,r*0.55,0,Math.PI*2); cx.fill();
      cx.fillStyle='rgba(44,31,14,0.6)';
      cx.font='700 11px Figtree,sans-serif'; cx.textAlign='center';
      cx.fillText(assignedCount+'👤', rx, ry+4);
    }
  } else if (f.type === 'long') {
    // Subtle dashed chair-band zone shown when table is selected — height adapts to actual chairs
    if (selected) {
      const sample = WED.furniture.find(c => c.type==='chair' && c.parentTableId===f.id);
      const pad = (sample ? sample.h : 28) + 4;
      cx.beginPath(); cx.roundRect(x-4, y-pad, w+8, h+pad*2, 8);
      cx.strokeStyle = 'rgba(90,171,122,0.25)'; cx.lineWidth = 1;
      cx.setLineDash([3,5]); cx.stroke(); cx.setLineDash([]);
    }
    cx.beginPath(); cx.roundRect(x,y,w,h,8);
    cx.fillStyle = selected ? 'rgba(90,171,122,0.18)' : 'rgba(255,253,248,0.88)';
    cx.fill();
    cx.strokeStyle = selected ? '#5aab7a' : 'rgba(201,169,110,0.65)';
    cx.lineWidth = selected ? 2.5 : 1.5; cx.stroke();
    if (selected) { cx.fillStyle='rgba(90,171,122,0.9)'; cx.font='10px serif'; cx.textAlign='center'; cx.fillText('⟳',x+w/2,y-5); }
  } else if (f.type === 'chair') {
    const assignedGuest = WED.guests.find(g => g._chairId === f.id);
    cx.beginPath(); cx.roundRect(x,y,w,h,5);
    cx.fillStyle = assignedGuest ? 'rgba(90,171,122,0.35)' : (selected ? 'rgba(201,169,110,0.28)' : 'rgba(245,230,200,0.75)');
    cx.fill();
    cx.strokeStyle = assignedGuest ? '#3a7a54' : (selected ? 'rgba(201,169,110,0.9)' : 'rgba(201,169,110,0.5)');
    cx.lineWidth = assignedGuest||selected ? 2 : 1; cx.stroke();
    cx.fillStyle='rgba(44,31,14,0.82)'; cx.textAlign='center';
    if (assignedGuest) {
      cx.font='600 7px Figtree,sans-serif';
      cx.fillText(assignedGuest.name.split(' ')[0], x+w/2, y+h/2+3);
    } else {
      // Two-line label: "RT1" / "Chair N" — font scales with chair size
      const fs1 = Math.max(5, Math.min(7, Math.floor(w / 4.5)));
      const fs2 = Math.max(4, Math.min(6, Math.floor(w / 5.5)));
      const parts = f.label.split('/');
      if (parts.length === 2) {
        cx.font=`bold ${fs1}px Figtree,sans-serif`;
        cx.fillText(parts[0], x+w/2, y+h/2-1);
        cx.font=`600 ${fs2}px Figtree,sans-serif`;
        cx.fillText(parts[1], x+w/2, y+h/2+fs2+1);
      } else {
        cx.font=`600 ${fs1}px Figtree,sans-serif`;
        cx.fillText(f.label, x+w/2, y+h/2+3);
      }
    }
    cx.restore(); return;
  } else if (f.type === 'freechair') {
    const assignedGuest = WED.guests.find(g => g._chairId === f.id);
    cx.beginPath(); cx.roundRect(x,y,w,h,6);
    cx.fillStyle = assignedGuest ? 'rgba(90,171,122,0.3)' : (selected ? 'rgba(201,169,110,0.4)' : 'rgba(245,230,200,0.95)');
    cx.fill();
    cx.strokeStyle = assignedGuest ? '#3a7a54' : (selected ? '#c9a96e' : 'rgba(201,169,110,0.85)');
    cx.lineWidth = selected||assignedGuest ? 2.5 : 1.5; cx.stroke();
    cx.textAlign='center';
    if (assignedGuest) {
      cx.fillStyle='rgba(44,31,14,0.82)'; cx.font='600 7px Figtree,sans-serif';
      cx.fillText(assignedGuest.name.split(' ')[0], x+w/2, y+h/2+3);
    } else {
      cx.fillStyle='#c9a96e'; cx.font='10px serif';
      cx.fillText('★', x+w/2, y+9);
      cx.fillStyle='rgba(44,31,14,0.75)'; cx.font='bold 7px Figtree,sans-serif';
      cx.fillText('Free', x+w/2, y+h/2+2);
      cx.font='600 6px Figtree,sans-serif';
      cx.fillText('Chair', x+w/2, y+h/2+10);
    }
    cx.restore(); return;
  } else if (f.type === 'stage') {
    cx.beginPath(); cx.roundRect(x,y,w,h,10);
    cx.fillStyle = selected ? 'rgba(224,120,152,0.28)' : 'rgba(252,232,238,0.88)';
    cx.fill();
    cx.strokeStyle = selected ? '#e07898' : 'rgba(224,120,152,0.5)';
    cx.lineWidth = selected ? 2.5 : 1.5; cx.stroke();
    if (selected) { cx.fillStyle='rgba(224,120,152,0.9)'; cx.font='bold 11px serif'; cx.textAlign='center'; cx.fillText('⟳',x+w/2,y-5); }
  } else if (f.type === 'entrance') {
    cx.beginPath(); cx.roundRect(x,y,w,h,8);
    cx.fillStyle = selected ? 'rgba(90,171,122,0.22)' : 'rgba(232,245,237,0.88)';
    cx.fill();
    cx.strokeStyle = selected ? '#5aab7a' : 'rgba(90,171,122,0.5)';
    cx.lineWidth = selected ? 2.5 : 1.5; cx.stroke();
    if (selected) { cx.fillStyle='rgba(90,171,122,0.9)'; cx.font='bold 11px serif'; cx.textAlign='center'; cx.fillText('⟳',x+w/2,y-5); }
  } else {
    cx.beginPath(); cx.roundRect(x,y,w,h,8);
    cx.fillStyle = selected ? 'rgba(245,230,200,0.7)' : 'rgba(255,253,248,0.88)';
    cx.fill();
    cx.strokeStyle = selected ? 'rgba(201,169,110,0.8)' : 'rgba(201,169,110,0.5)';
    cx.lineWidth = selected ? 2 : 1.5; cx.stroke();
  }

  cx.fillStyle = 'rgba(44,31,14,0.72)';
  cx.font = `600 ${f.type==='stage'?12:10}px Figtree,sans-serif`;
  cx.textAlign = 'center';
  cx.fillText(f.label, x+w/2, y+h/2+4);
  cx.restore();
}

function bindCanvasEvents() {
  let _pinchState = null;

  const getScreenPos = (e, isTouch) => {
    const r = cvs.getBoundingClientRect();
    const src = isTouch ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  const onDown = (e) => {
    if (e.type !== 'touchstart') e.preventDefault();
    if (e.touches && e.touches.length > 1) return; // multi-touch → pinch handles it
    _pinchState = null;

    const { x: sx, y: sy } = getScreenPos(e, e.type === 'touchstart');
    const { x, y } = screenToWorld(sx, sy); // world coords

    const hit = [...WED.furniture].reverse().find(f => {
      if (f.type === 'chair' || f.type === 'freechair')
        return x >= f.x-4 && x <= f.x+f.w+4 && y >= f.y-4 && y <= f.y+f.h+4;
      if (f.type === 'round') {
        const dx = x-(f.x+f.w/2), dy = y-(f.y+f.h/2);
        return Math.sqrt(dx*dx+dy*dy) <= f.w/2+6;
      }
      return x >= f.x-8 && x <= f.x+f.w+8 && y >= f.y-8 && y <= f.y+f.h+8;
    });

    if (hit) {
      if (hit.type === 'chair' || hit.type === 'freechair') {
        const now = Date.now(), key = '_lastTap_' + hit.id;
        const isDouble = (now - (WED[key]||0)) < 400;
        WED[key] = isDouble ? 0 : now;
        WED.selectedFurniture = hit.id;
        drawCanvas(); renderFurniturePalette(); renderCanvasActions();
        if (isDouble) { openChairGuestPicker(hit.id); return; }
      }
      WED.dragging  = hit;
      WED.dragOffX  = x - hit.x;  // offset in world coords
      WED.dragOffY  = y - hit.y;
      WED._panStart = null;
      WED.selectedFurniture = hit.id;
      renderSeatAssignments();
      drawCanvas(); renderFurniturePalette(); renderCanvasActions();
    } else {
      // Begin canvas pan
      WED._panStart = { sx, sy, ox: cTx.ox, oy: cTx.oy };
      WED.dragging  = null;
      WED.selectedFurniture = null;
      drawCanvas(); renderFurniturePalette(); renderCanvasActions();
    }
  };

  const onMove = (e) => {
    if (e.cancelable) e.preventDefault();

    // ── Two-finger pinch-zoom ──────────────────────
    if (e.touches && e.touches.length === 2) {
      const r = cvs.getBoundingClientRect();
      const t1 = e.touches[0], t2 = e.touches[1];
      const x1 = t1.clientX-r.left, y1 = t1.clientY-r.top;
      const x2 = t2.clientX-r.left, y2 = t2.clientY-r.top;
      const dist = Math.sqrt((x2-x1)**2+(y2-y1)**2);
      const mx = (x1+x2)/2, my = (y1+y2)/2;
      if (_pinchState) {
        const factor = dist / _pinchState.dist;
        const ns = Math.max(0.15, Math.min(6, cTx.scale * factor));
        cTx.ox = mx - (mx - cTx.ox) * (ns / cTx.scale);
        cTx.oy = my - (my - cTx.oy) * (ns / cTx.scale);
        cTx.ox += mx - _pinchState.mx;
        cTx.oy += my - _pinchState.my;
        cTx.scale = ns;
        drawCanvas(); _updateZoomLabel();
      }
      _pinchState = { dist, mx, my };
      WED.dragging  = null;
      WED._panStart = null;
      return;
    }
    _pinchState = null;

    const { x: sx, y: sy } = getScreenPos(e, e.type === 'touchmove');

    // ── Pan ──────────────────────────────────────
    if (WED._panStart) {
      cTx.ox = WED._panStart.ox + (sx - WED._panStart.sx);
      cTx.oy = WED._panStart.oy + (sy - WED._panStart.sy);
      drawCanvas();
      return;
    }

    if (!WED.dragging) return;

    const { x, y } = screenToWorld(sx, sy); // world coords
    const drag = WED.dragging;

    if (drag.type === 'round' || drag.type === 'long') {
      // Table drag — move table + all linked chairs by same delta
      const oldX = drag.x, oldY = drag.y;
      drag.x = x - WED.dragOffX;
      drag.y = y - WED.dragOffY;
      const dx = drag.x - oldX, dy = drag.y - oldY;
      if (dx || dy) {
        WED.furniture.forEach(f => {
          if (f.parentTableId === drag.id) { f.x += dx; f.y += dy; }
        });
      }
    } else if (drag.type === 'chair' && drag.parentTableId) {
      const parent = WED.furniture.find(f => f.id === drag.parentTableId);
      if (parent && parent.type === 'round') {
        // Orbital ring lock
        const tCX = parent.x+parent.w/2, tCY = parent.y+parent.h/2;
        const orbitR = parent.w/2 + drag.w/2 + 6;
        const angle  = Math.atan2(y - tCY, x - tCX);
        drag.x = Math.round(tCX + orbitR*Math.cos(angle) - drag.w/2);
        drag.y = Math.round(tCY + orbitR*Math.sin(angle) - drag.h/2);
      } else if (parent && parent.type === 'long') {
        // Snap to top or bottom edge
        const tL = parent.x, tR = parent.x+parent.w;
        const tT = parent.y, tB = parent.y+parent.h;
        const wX  = x - WED.dragOffX;
        const wCY = (y - WED.dragOffY) + drag.h/2;
        drag.x = Math.max(tL, Math.min(tR-drag.w, wX));
        drag.y = (wCY < (tT+tB)/2) ? tT-drag.h-4 : tB+4;
      } else {
        drag.x = x - WED.dragOffX;
        drag.y = y - WED.dragOffY;
      }
    } else {
      // Free drag — stage, entrance, freechair
      drag.x = x - WED.dragOffX;
      drag.y = y - WED.dragOffY;
    }

    drawCanvas();
  };

  const onUp = () => {
    _pinchState   = null;
    WED._panStart = null;
    if (!WED.dragging) return;
    WED.dragging  = null;
    saveState(); renderCanvasActions();
  };

  cvs.addEventListener('mousedown',  onDown);
  cvs.addEventListener('mousemove',  onMove);
  cvs.addEventListener('mouseup',    onUp);
  cvs.addEventListener('touchstart', onDown, { passive: true });
  cvs.addEventListener('touchmove',  onMove, { passive: false });
  cvs.addEventListener('touchend',   onUp);
}

function bindCanvasRotate() {
  let lastTap = 0;
  const handleDbl = (e) => {
    const now = Date.now();
    if (now - lastTap < 350) {
      const sel = WED.furniture.find(f => f.id === WED.selectedFurniture);
      if (sel && (sel.type === 'long' || sel.type === 'stage' || sel.type === 'entrance')) {
        rotateFurniture(sel);
      }
    }
    lastTap = now;
  };
  if (cvs) {
    cvs.addEventListener('mousedown',  handleDbl);
    cvs.addEventListener('touchstart', handleDbl, { passive: true });
  }
}

function rotateFurniture(sel) {
  if (!sel) return;
  if (sel.type === 'long') {
    const wasHoriz = sel.w >= sel.h;
    const oldW = sel.w, oldH = sel.h;
    const children = WED.furniture.filter(f => f.parentTableId === sel.id);

    // Capture each chair's relative position + which side of the table it's on
    const childData = children.map(chair => {
      let isFirstSide, relativeAlong;
      if (wasHoriz) {
        // Horizontal table: chairs are above (y < center) or below (y > center)
        isFirstSide   = (chair.y + chair.h/2) < (sel.y + sel.h/2);
        relativeAlong = (chair.x + chair.w/2 - sel.x) / sel.w;
      } else {
        // Vertical table: chairs are left (x < center) or right (x > center)
        isFirstSide   = (chair.x + chair.w/2) < (sel.x + sel.w/2);
        relativeAlong = (chair.y + chair.h/2 - sel.y) / sel.h;
      }
      relativeAlong = Math.max(0, Math.min(1, relativeAlong));
      return { chair, isFirstSide, relativeAlong };
    });

    // Rotate the table (swap w/h, keep top-left anchor)
    sel.rot = !sel.rot;
    sel.w = oldH;
    sel.h = oldW;

    // Reposition each child chair using its stored relative data
    childData.forEach(({ chair, isFirstSide, relativeAlong }) => {
      const nCW = chair.h, nCH = chair.w;  // also swap chair dims
      chair.w = nCW;
      chair.h = nCH;
      if (wasHoriz) {
        // Horizontal → Vertical: above → left side, below → right side
        chair.x = isFirstSide ? sel.x - nCW - 4 : sel.x + sel.w + 4;
        chair.y = sel.y + relativeAlong * sel.h - nCH / 2;
      } else {
        // Vertical → Horizontal: left → above, right → below
        chair.y = isFirstSide ? sel.y - nCH - 4 : sel.y + sel.h + 4;
        chair.x = sel.x + relativeAlong * sel.w - nCW / 2;
      }
    });

    saveState(); drawCanvas();
    showToast('Table rotated · chairs followed');
  } else {
    // Stage or Entrance — simple dimension swap
    const tmp = sel.w; sel.w = sel.h; sel.h = tmp;
    sel.rot = !sel.rot;
    saveState(); drawCanvas();
    showToast('Rotated');
  }
}

/* ── CANVAS ZOOM / PAN CONTROLS ──────────────── */
function bindCanvasZoom() {
  if (!cvs) return;
  cvs.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = cvs.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const ns = Math.max(0.15, Math.min(6, cTx.scale * factor));
    cTx.ox = sx - (sx - cTx.ox) * (ns / cTx.scale);
    cTx.oy = sy - (sy - cTx.oy) * (ns / cTx.scale);
    cTx.scale = ns;
    drawCanvas(); _updateZoomLabel();
  }, { passive: false });
}

function _updateZoomLabel() {
  const el = document.getElementById('canvas-zoom-label');
  if (el) el.textContent = Math.round(cTx.scale * 100) + '%';
}

function zoomCanvas(factor) {
  if (!cvs) return;
  const sx = cvs.width / 2, sy = cvs.height / 2;
  const ns = Math.max(0.15, Math.min(6, cTx.scale * factor));
  cTx.ox = sx - (sx - cTx.ox) * (ns / cTx.scale);
  cTx.oy = sy - (sy - cTx.oy) * (ns / cTx.scale);
  cTx.scale = ns;
  drawCanvas(); _updateZoomLabel();
}

function fitCanvas() {
  if (!cvs) return;
  if (!WED.furniture.length) {
    cTx = { scale: 1, ox: 20, oy: 20 };
    drawCanvas(); _updateZoomLabel();
    return;
  }
  const margin = 60;
  const xs = WED.furniture.flatMap(f => [f.x, f.x + f.w]);
  const ys = WED.furniture.flatMap(f => [f.y, f.y + f.h]);
  const minX = Math.min(...xs) - margin, maxX = Math.max(...xs) + margin;
  const minY = Math.min(...ys) - margin, maxY = Math.max(...ys) + margin;
  const scaleX = cvs.width  / (maxX - minX);
  const scaleY = cvs.height / (maxY - minY);
  const ns = Math.min(2.5, scaleX, scaleY);
  cTx.scale = ns;
  cTx.ox = -minX * ns + (cvs.width  - (maxX - minX) * ns) / 2;
  cTx.oy = -minY * ns + (cvs.height - (maxY - minY) * ns) / 2;
  drawCanvas(); _updateZoomLabel();
}

function addFurniture(type, label) {
  const defaults = {
    round:{w:68,h:68}, long:{w:115,h:46}, stage:{w:140,h:56},
    entrance:{w:76,h:34}, chair:{w:32,h:28}, freechair:{w:32,h:32},
    photo:{w:68,h:58}, bar:{w:100,h:38},
  };
  const d = defaults[type] || {w:68,h:68};

  if (type === 'chair') {
    // Chair must be linked to a selected table
    const selTable = WED.furniture.find(f => f.id === WED.selectedFurniture && (f.type === 'round' || f.type === 'long'));
    if (!selTable) { showToast('⚠️ Select a table on the canvas first'); return; }
    const prefix = selTable.type === 'round' ? 'RT' : 'LT';
    const tableNum = selTable.label.replace(/\D/g,'');
    const existingOnTable = WED.furniture.filter(f => f.type === 'chair' && f.parentTableId === selTable.id).length;
    const chairLabel = `${prefix}${tableNum}/Chair ${existingOnTable + 1}`;

    let spawnX, spawnY;
    if (selTable.type === 'round') {
      // Orbital placement — distribute evenly around the round table's perimeter
      const tableCX = selTable.x + selTable.w / 2;
      const tableCY = selTable.y + selTable.h / 2;
      const tableR  = selTable.w / 2;
      const angle   = (existingOnTable * Math.PI * 2 / 8) - Math.PI / 2; // start from top
      const orbitR  = tableR + d.w / 2 + 6; // must match the drag constraint radius exactly
      spawnX = Math.max(0, Math.min(Math.round(tableCX + orbitR * Math.cos(angle) - d.w / 2), (cvs.width  || 380) - d.w));
      spawnY = Math.max(0, Math.min(Math.round(tableCY + orbitR * Math.sin(angle) - d.h / 2), (cvs.height || 400) - d.h));
    } else {
      // Long table — fill chairs along the top edge first, then bottom
      const spacing  = d.w + 4;
      const perRow   = Math.max(1, Math.floor(selTable.w / spacing));
      const rowIdx   = Math.floor(existingOnTable / perRow);
      const colIdx   = existingOnTable % perRow;
      const offsetY  = rowIdx === 0 ? -(d.h + 4) : selTable.h + 4;
      spawnX = Math.max(0, Math.min(selTable.x + colIdx * spacing, (cvs.width  || 380) - d.w));
      spawnY = Math.max(0, Math.min(selTable.y + offsetY,          (cvs.height || 400) - d.h));
    }

    WED.furniture.push({
      id:'f'+WED.nextFurnitureId++, type:'chair', x:spawnX, y:spawnY,
      w:d.w, h:d.h, label:chairLabel, rot:false, parentTableId:selTable.id,
    });
    saveState(); drawCanvas(); renderFurniturePalette(); renderCanvasActions();
    showToast('🪑 '+chairLabel+' added!');
    return;
  }

  if (type === 'freechair') {
    // Free-standing VIP chair — no table parent required
    WED.furniture.push({
      id:'f'+WED.nextFurnitureId++, type:'freechair',
      x:20, y:20, w:d.w, h:d.h, label:'Free Chair', rot:false, parentTableId:null,
    });
    saveState(); drawCanvas();
    showToast('⭐ Free Chair added! Drag to position.');
    return;
  }

  const num = WED.furniture.filter(f=>f.type===type).length+1;
  WED.furniture.push({
    id:'f'+WED.nextFurnitureId++, type, x:20, y:20, w:d.w, h:d.h,
    label:['round','long'].includes(type)?`${label} ${num}`:label,
    rot:false,
  });
  saveState(); drawCanvas();
  showToast('✅ '+label+' added!');
}

/* ── TABLE SEAT-COUNT PICKER ─────────────────── */
const _tableSeatsCount = { round: 8, long: 10 };
let   _tableModalType  = 'round';

function openAddTableModal(type) {
  _tableModalType = type;
  _tableSeatsCount[type] = _tableSeatsCount[type] || (type === 'round' ? 8 : 10);
  const old = document.getElementById('add-table-overlay');
  if (old) old.remove();

  const maxSeats  = type === 'round' ? 20 : 40;
  const emoji     = type === 'round' ? '⭕' : '▬';
  const typeName  = type === 'round' ? 'Round Table' : 'Long Table';
  const hint      = type === 'round'
    ? 'Chairs are placed evenly around the table.'
    : 'Chairs split between top and bottom edges.';

  const overlay = document.createElement('div');
  overlay.id = 'add-table-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:920;background:rgba(44,31,14,0.28);display:flex;align-items:flex-end;justify-content:center;';
  overlay.innerHTML = `
    <div style="width:100%;max-width:440px;background:var(--cream);border-radius:22px 22px 0 0;padding:24px 20px 44px;box-shadow:0 -8px 40px rgba(44,31,14,0.18)">
      <div style="text-align:center;margin-bottom:6px;font-size:28px">${emoji}</div>
      <div style="text-align:center;font-size:15px;font-weight:700;color:var(--ink);margin-bottom:3px">${typeName}</div>
      <div style="text-align:center;font-size:11.5px;color:var(--ink-4);margin-bottom:22px">${hint}</div>

      <div style="display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:8px">
        <button onclick="changeTableSeats(-1,${maxSeats})"
          style="width:44px;height:44px;border-radius:50%;border:2px solid rgba(201,169,110,0.4);background:rgba(245,230,200,0.65);font-size:22px;font-weight:700;color:var(--tan-dark);cursor:pointer;line-height:1;font-family:var(--f)">−</button>
        <div style="text-align:center;min-width:64px">
          <div id="table-seats-display" style="font-size:42px;font-weight:700;font-family:var(--f2);font-style:italic;color:var(--ink);line-height:1">${_tableSeatsCount[type]}</div>
          <div style="font-size:11px;color:var(--ink-4);margin-top:2px">seats</div>
        </div>
        <button onclick="changeTableSeats(+1,${maxSeats})"
          style="width:44px;height:44px;border-radius:50%;border:2px solid rgba(201,169,110,0.4);background:rgba(245,230,200,0.65);font-size:22px;font-weight:700;color:var(--tan-dark);cursor:pointer;line-height:1;font-family:var(--f)">+</button>
      </div>
      <div style="text-align:center;font-size:10.5px;color:var(--ink-4);margin-bottom:20px">min 2 · max ${maxSeats}</div>

      <div style="display:flex;gap:10px">
        <button onclick="closeAddTableModal()"
          style="flex:1;padding:12px;border-radius:var(--r-md);border:1px solid rgba(201,169,110,0.25);background:rgba(255,253,248,0.8);font-size:13px;font-weight:700;color:var(--ink-3);cursor:pointer;font-family:var(--f)">
          Cancel</button>
        <button onclick="confirmAddTable()"
          style="flex:2;padding:12px;border-radius:var(--r-md);border:none;background:linear-gradient(135deg,var(--tan),var(--tan-dark));font-size:13px;font-weight:700;color:white;cursor:pointer;font-family:var(--f)">
          Add Table →</button>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeAddTableModal(); });
  document.body.appendChild(overlay);
}

function changeTableSeats(delta, max) {
  const type = _tableModalType;
  _tableSeatsCount[type] = Math.max(2, Math.min(max, (_tableSeatsCount[type] || 8) + delta));
  const el = document.getElementById('table-seats-display');
  if (el) el.textContent = _tableSeatsCount[type];
}

function closeAddTableModal() {
  const el = document.getElementById('add-table-overlay');
  if (el) el.remove();
  renderFurniturePalette(); // refresh seat-count preview on palette buttons
}

function confirmAddTable() {
  const type  = _tableModalType;
  const seats = _tableSeatsCount[type];
  closeAddTableModal();
  addFurnitureWithSeats(type, seats);
}

/* ── BUILD TABLE + CHAIRS ────────────────────── */
function addFurnitureWithSeats(type, seats) {
  const cW = cvs ? cvs.width  : 380;
  const cH = cvs ? cvs.height : 400;
  seats = Math.max(2, seats);

  if (type === 'round') {
    // ── Size the table so chairs fit without overlapping ──
    const targetCW = 24;               // desired chair width
    const gap      = 3;                // minimum gap between chairs
    // Minimum table diameter so chairs at orbit don't overlap:
    //   orbit circumference = 2π*(tableR + targetCW/2 + 6)  ≥  seats*(targetCW+gap)
    const minOrbitCircumference = seats * (targetCW + gap);
    const minOrbitR = minOrbitCircumference / (2 * Math.PI);
    const tableR    = Math.max(34, Math.ceil(minOrbitR - targetCW / 2 - 6));
    const tableSize = tableR * 2;

    // Chair dimensions (scale down only if truly necessary)
    const orbitR    = tableR + targetCW / 2 + 6;
    const arcPerSeat = (2 * Math.PI * orbitR) / seats;
    const chairW    = Math.min(32, Math.max(12, Math.floor(arcPerSeat - gap)));
    const chairH    = Math.max(12, Math.round(chairW * 0.85));

    // Spawn table near top-centre of canvas
    const tx = Math.max(10, Math.round((cW - tableSize) / 2));
    const ty = Math.max(10, Math.round(cH * 0.15));

    const tableNum = WED.furniture.filter(f => f.type === 'round').length + 1;
    const tableId  = 'f' + WED.nextFurnitureId++;
    WED.furniture.push({ id:tableId, type:'round', x:tx, y:ty, w:tableSize, h:tableSize, label:`Round Table ${tableNum}`, rot:false });

    const tCX = tx + tableSize / 2, tCY = ty + tableSize / 2;
    const finalOrbit = tableR + chairW / 2 + 6;
    for (let i = 0; i < seats; i++) {
      const angle = (i * 2 * Math.PI / seats) - Math.PI / 2;
      WED.furniture.push({
        id: 'f' + WED.nextFurnitureId++, type: 'chair',
        x: Math.max(0, Math.min(cW - chairW, Math.round(tCX + finalOrbit * Math.cos(angle) - chairW / 2))),
        y: Math.max(0, Math.min(cH - chairH, Math.round(tCY + finalOrbit * Math.sin(angle) - chairH / 2))),
        w: chairW, h: chairH, label: `RT${tableNum}/Chair ${i + 1}`, rot: false, parentTableId: tableId,
      });
    }
    saveState(); drawCanvas(); renderFurniturePalette(); renderSeatAssignments();
    showToast(`⭕ Round Table ${tableNum} · ${seats} seats added!`);

  } else if (type === 'long') {
    // ── Size the table so chairs fit side-by-side on each long edge ──
    const seatsTop   = Math.ceil(seats / 2);
    const seatsBot   = Math.floor(seats / 2);
    const targetCW   = 28;
    const gap        = 3;
    const tableW     = Math.max(115, seatsTop * (targetCW + gap));
    const tableH     = 46;
    const chairW     = Math.min(32, Math.max(12, Math.floor((tableW / seatsTop) - gap)));
    const chairH     = 24;

    const tx = Math.max(10, Math.round((cW - tableW) / 2));
    const ty = Math.max(chairH + 10, Math.round(cH * 0.3));

    const tableNum = WED.furniture.filter(f => f.type === 'long').length + 1;
    const tableId  = 'f' + WED.nextFurnitureId++;
    WED.furniture.push({ id:tableId, type:'long', x:tx, y:ty, w:tableW, h:tableH, label:`Long Table ${tableNum}`, rot:false });

    // Top row
    for (let i = 0; i < seatsTop; i++) {
      const slotW = tableW / seatsTop;
      WED.furniture.push({
        id: 'f' + WED.nextFurnitureId++, type: 'chair',
        x: Math.max(0, Math.round(tx + i * slotW + slotW / 2 - chairW / 2)),
        y: Math.max(0, ty - chairH - 4),
        w: chairW, h: chairH, label: `LT${tableNum}/Chair ${i + 1}`, rot: false, parentTableId: tableId,
      });
    }
    // Bottom row
    for (let i = 0; i < seatsBot; i++) {
      const slotW = tableW / seatsBot;
      WED.furniture.push({
        id: 'f' + WED.nextFurnitureId++, type: 'chair',
        x: Math.max(0, Math.round(tx + i * slotW + slotW / 2 - chairW / 2)),
        y: Math.min(cH - chairH, ty + tableH + 4),
        w: chairW, h: chairH, label: `LT${tableNum}/Chair ${seatsTop + i + 1}`, rot: false, parentTableId: tableId,
      });
    }
    saveState(); drawCanvas(); renderFurniturePalette(); renderSeatAssignments();
    showToast(`▬ Long Table ${tableNum} · ${seats} seats added!`);
  }
}

function renderFurniturePalette() {
  // Target: compact mini palette inside canvas float bar
  const el = document.getElementById('canvas-palette-mini');
  if (!el) return;

  const selTable = WED.furniture.find(f => f.id === WED.selectedFurniture && (f.type === 'round' || f.type === 'long'));
  const chairOn  = !!selTable;
  const chairSub = chairOn
    ? (() => { const p = selTable.type==='round'?'RT':'LT'; const n = selTable.label.replace(/\D/g,''); return `→ ${p}${n}`; })()
    : 'select\ntable';

  const roundSeats = _tableSeatsCount.round;
  const longSeats  = _tableSeatsCount.long;

  el.innerHTML =
    `<button class="cfb-pal-btn" onclick="openAddTableModal('round')" title="Round Table · ${roundSeats} seats">
      <span class="cfb-pal-emoji">⭕</span>
      <span class="cfb-pal-label">Round</span>
      <span class="cfb-pal-sub">${roundSeats}s</span>
    </button>`
  + `<button class="cfb-pal-btn" onclick="openAddTableModal('long')" title="Long Table · ${longSeats} seats">
      <span class="cfb-pal-emoji">▬</span>
      <span class="cfb-pal-label">Long</span>
      <span class="cfb-pal-sub">${longSeats}s</span>
    </button>`
  + `<button class="cfb-pal-btn" onclick="addFurniture('stage','Stage')" title="Stage">
      <span class="cfb-pal-emoji">🎭</span>
      <span class="cfb-pal-label">Stage</span>
    </button>`
  + `<button class="cfb-pal-btn" onclick="addFurniture('entrance','Entrance')" title="Entrance">
      <span class="cfb-pal-emoji">🚪</span>
      <span class="cfb-pal-label">Entrance</span>
    </button>`
  + `<button class="cfb-pal-btn" onclick="addFurniture('freechair','Free Chair')" title="Free Chair">
      <span class="cfb-pal-emoji">⭐</span>
      <span class="cfb-pal-label">Free</span>
    </button>`
  + (chairOn
    ? `<button class="cfb-pal-btn cfb-pal-active" onclick="addFurniture('chair','Chair')" title="Add chair to selected table">
        <span class="cfb-pal-emoji">🪑</span>
        <span class="cfb-pal-label">Chair</span>
        <span class="cfb-pal-sub">${chairSub}</span>
      </button>`
    : `<button class="cfb-pal-btn" disabled style="opacity:0.35;cursor:not-allowed;border-style:dashed" title="Select a table first">
        <span class="cfb-pal-emoji">🪑</span>
        <span class="cfb-pal-label">Chair</span>
        <span class="cfb-pal-sub" style="white-space:pre">${chairSub}</span>
      </button>`
  );
}

function renderSeatAssignments() {
  const el = document.getElementById('seat-assignments');
  if (!el) return;
  const isChairType = f => f.type==='chair'||f.type==='freechair';
  const assignedChairs   = WED.furniture.filter(f=>isChairType(f)&&WED.guests.some(g=>g._chairId===f.id));
  const unassignedChairs = WED.furniture.filter(f=>isChairType(f)&&!WED.guests.some(g=>g._chairId===f.id));
  const unseatedGuests   = WED.guests.filter(g=>!g._chairId);

  let html = '<div style="font-size:11px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px;margin-top:4px">🪑 Chair Assignments</div>';

  if (assignedChairs.length) {
    html += '<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:var(--green-deep);margin-bottom:6px">✅ Seated ('+assignedChairs.length+')</div>';
    assignedChairs.forEach(f => {
      const g = WED.guests.find(gg=>gg._chairId===f.id);
      html += '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--r-md);margin-bottom:5px;background:rgba(90,171,122,0.1);border:1px solid rgba(90,171,122,0.2)">'
        + '<div style="width:28px;height:28px;border-radius:8px;background:rgba(90,171,122,0.2);display:flex;align-items:center;justify-content:center;font-size:13px">🪑</div>'
        + '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:var(--ink)">'+g.name+'</div>'
        + '<div style="font-size:10.5px;color:var(--ink-4)">'+f.label+'</div></div>'
        + '<button onclick="assignChairGuest(\''+f.id+'\',null)" style="padding:3px 8px;border-radius:6px;border:none;background:rgba(224,120,152,0.12);font-size:11px;font-weight:700;color:var(--pink-deep);cursor:pointer">✕</button>'
        + '</div>';
    });
    html += '</div>';
  }

  if (unassignedChairs.length) {
    html += '<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:var(--tan-dark);margin-bottom:6px">🪑 Empty Chairs ('+unassignedChairs.length+')</div>';
    unassignedChairs.forEach(f => {
      html += '<div onclick="openChairGuestPicker(\''+f.id+'\')" style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--r-md);margin-bottom:5px;background:rgba(245,230,200,0.45);border:1.5px dashed rgba(201,169,110,0.3);cursor:pointer">'
        + '<div style="width:28px;height:28px;border-radius:8px;background:rgba(245,230,200,0.6);display:flex;align-items:center;justify-content:center;font-size:13px">🪑</div>'
        + '<span style="font-size:13px;font-weight:600;color:var(--ink-3);flex:1">'+f.label+'</span>'
        + '<span style="font-size:11px;color:var(--tan-dark);font-weight:700">+ Assign →</span>'
        + '</div>';
    });
    html += '</div>';
  }

  if (unseatedGuests.length) {
    html += '<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:var(--ink-4);margin-bottom:6px">👤 Not Yet Seated ('+unseatedGuests.length+')</div>';
    unseatedGuests.forEach(g => {
      html += '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--r-md);margin-bottom:5px;background:rgba(255,253,248,0.65);border:1px solid rgba(201,169,110,0.15)">'
        + '<div style="width:8px;height:8px;border-radius:50%;background:'+(g.rsvp==='attending'?'var(--green-accent)':g.rsvp==='declined'?'var(--pink-accent)':'var(--tan)')+';flex-shrink:0"></div>'
        + '<span style="font-size:13px;font-weight:600;color:var(--ink);flex:1">'+g.name+'</span>'
        + '<span style="font-size:10.5px;color:var(--ink-4)">'+g.rsvp+'</span>'
        + '</div>';
    });
    html += '</div>';
  }

  if (!assignedChairs.length && !unassignedChairs.length) {
    html += '<div style="text-align:center;padding:20px;font-size:13px;color:var(--ink-4)">Add 🪑 chairs from the palette above, then double-tap a chair to assign a guest.</div>';
  }
  el.innerHTML = html;
}

/* ── CANVAS ACTIONS (delete / resize) ────────── */
function renderCanvasActions() {
  const el = document.getElementById('canvas-actions');
  if (!el) return;
  const sel = WED.furniture.find(f => f.id === WED.selectedFurniture);
  if (!sel) { el.innerHTML = ''; return; }

  const isLong      = sel.type === 'long';
  const isChair     = sel.type === 'chair' || sel.type === 'freechair';
  const isRotatable = sel.type === 'long' || sel.type === 'stage' || sel.type === 'entrance';

  const btnBase = 'padding:5px 13px;border-radius:8px;font-size:11.5px;font-weight:700;cursor:pointer;font-family:var(--f)';
  let html = `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:8px 0;border-bottom:1px solid rgba(201,169,110,0.18);margin-bottom:6px">
    <span style="font-size:11.5px;font-weight:700;color:var(--ink-3);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">◇ ${sel.label}</span>
    ${isChair ? `<button onclick="openChairGuestPicker('${sel.id}')" style="${btnBase};border:1px solid rgba(90,171,122,0.3);background:rgba(90,171,122,0.1);color:var(--green-deep)">Assign</button>` : ''}
    ${isRotatable ? `<button onclick="rotateFurniture(WED.furniture.find(f=>f.id==='${sel.id}'))" style="${btnBase};border:1px solid rgba(184,145,106,0.3);background:rgba(242,232,213,0.7);color:var(--gold-dark)">Rotate ↻</button>` : ''}
    <button onclick="deleteSelectedFurniture()" style="${btnBase};border:1px solid rgba(224,120,152,0.3);background:rgba(252,232,238,0.7);color:var(--pink-deep)">Delete</button>
  </div>`;

  if (isLong) {
    html += `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding-bottom:6px">
      <span style="font-size:11px;font-weight:700;color:var(--ink-4)">Resize:</span>
      <div style="display:flex;align-items:center;gap:4px">
        <button onclick="resizeLongTable(-12,0)" style="${btnBase};padding:4px 10px;border:1px solid rgba(201,169,110,0.3);background:rgba(245,230,200,0.65);color:var(--tan-dark)">−W</button>
        <span style="font-size:11px;color:var(--ink-3);min-width:34px;text-align:center;font-weight:700">${sel.w}px</span>
        <button onclick="resizeLongTable(12,0)"  style="${btnBase};padding:4px 10px;border:1px solid rgba(201,169,110,0.3);background:rgba(245,230,200,0.65);color:var(--tan-dark)">+W</button>
      </div>
      <div style="display:flex;align-items:center;gap:4px">
        <button onclick="resizeLongTable(0,-8)"  style="${btnBase};padding:4px 10px;border:1px solid rgba(201,169,110,0.3);background:rgba(245,230,200,0.65);color:var(--tan-dark)">−H</button>
        <span style="font-size:11px;color:var(--ink-3);min-width:34px;text-align:center;font-weight:700">${sel.h}px</span>
        <button onclick="resizeLongTable(0,8)"   style="${btnBase};padding:4px 10px;border:1px solid rgba(201,169,110,0.3);background:rgba(245,230,200,0.65);color:var(--tan-dark)">+H</button>
      </div>
    </div>`;
  }

  el.innerHTML = html;
}

function deleteSelectedFurniture() {
  const id = WED.selectedFurniture;
  if (!id) return;
  const f = WED.furniture.find(f => f.id === id);
  if (!f) return;
  // If deleting a table, also delete its linked chairs
  const childChairs = WED.furniture.filter(c => c.parentTableId === id);
  const msg = childChairs.length
    ? `Delete "${f.label}" and its ${childChairs.length} linked chair(s)?`
    : `Delete "${f.label}"?`;
  if (!confirm(msg)) return;
  const toRemove = new Set([id, ...childChairs.map(c => c.id)]);
  // Unseat guests in removed chairs
  WED.guests.forEach(g => { if (toRemove.has(g._chairId)) delete g._chairId; });
  WED.furniture = WED.furniture.filter(f => !toRemove.has(f.id));
  WED.selectedFurniture = null;
  saveState();
  drawCanvas();
  renderFurniturePalette();
  renderCanvasActions();
  renderSeatAssignments();
  showToast(`🗑 "${f.label}" deleted${childChairs.length ? ' + ' + childChairs.length + ' chair(s)' : ''}`);
}

function resizeLongTable(dw, dh) {
  const sel = WED.furniture.find(f => f.id === WED.selectedFurniture && f.type === 'long');
  if (!sel) return;
  sel.w = Math.max(40, sel.w + dw);
  sel.h = Math.max(18, sel.h + dh);
  saveState();
  drawCanvas();
  renderCanvasActions(); // refresh the size readout
}

/* ── CHAIR GUEST PICKER ──────────────────────── */
function openChairGuestPicker(chairId) {
  const old = document.getElementById('chair-guest-picker');
  if (old) old.remove();
  const chair = WED.furniture.find(f=>f.id===chairId);
  const currentGuest = WED.guests.find(g=>g._chairId===chairId);
  const seated = new Set(WED.guests.filter(g=>g._chairId&&g._chairId!==chairId).map(g=>g.id));
  const overlay = document.createElement('div');
  overlay.id = 'chair-guest-picker';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(44,31,14,0.28);display:flex;align-items:flex-end;justify-content:center;';
  let rows = '';
  if (!WED.guests.length) {
    rows = '<div style="text-align:center;padding:20px;font-size:13px;color:var(--ink-4)">No guests yet — add guests in the Guests tab first.</div>';
  } else {
    WED.guests.forEach(g => {
      const isSeated  = seated.has(g.id);
      const isCurrent = currentGuest && g.id===currentGuest.id;
      rows += '<div onclick="assignChairGuest(\''+chairId+'\','+g.id+')" style="'
        + 'display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:var(--r-md);margin-bottom:6px;cursor:pointer;'
        + 'background:'+(isCurrent?'rgba(90,171,122,0.22)':isSeated?'rgba(44,31,14,0.05)':'rgba(255,253,248,0.85)')+';'
        + 'border:1.5px solid '+(isCurrent?'rgba(58,122,84,0.4)':'rgba(255,255,255,0.5)')+';'
        + 'opacity:'+(isSeated&&!isCurrent?0.45:1)+';pointer-events:'+(isSeated&&!isCurrent?'none':'auto')+'">'
        + '<div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:'+(g.rsvp==='attending'?'var(--green-accent)':g.rsvp==='declined'?'var(--pink-accent)':'var(--tan)')+'"></div>'
        + '<span style="font-size:13px;font-weight:600;color:var(--ink);flex:1">'+g.name+'</span>'
        + (isCurrent?'<span style="font-size:11px;color:var(--green-deep);font-weight:700">✓ Seated</span>':'')
        + (isSeated&&!isCurrent?'<span style="font-size:10px;color:var(--ink-4)">Elsewhere</span>':'')
        + '</div>';
    });
  }
  const removeBtn = currentGuest
    ? '<button onclick="assignChairGuest(\''+chairId+'\',null)" style="width:100%;padding:9px;border-radius:var(--r-md);background:rgba(224,120,152,0.12);border:1px solid rgba(224,120,152,0.25);font-size:12.5px;font-weight:700;color:var(--pink-deep);cursor:pointer;margin-bottom:10px;font-family:var(--f)">🗑 Remove '+currentGuest.name.split(' ')[0]+'</button>'
    : '';
  overlay.innerHTML = '<div style="width:100%;max-width:440px;background:var(--cream);border-radius:22px 22px 0 0;padding:20px 16px 32px;max-height:70vh;overflow-y:auto;box-shadow:0 -8px 40px rgba(44,31,14,0.18);">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
    + '<div style="font-size:14px;font-weight:700;color:var(--ink)">🪑 Assign Guest — '+(chair?chair.label:'Chair')+'</div>'
    + '<button onclick="closeChairPicker()" style="width:28px;height:28px;border-radius:50%;border:none;background:rgba(44,31,14,0.08);font-size:16px;cursor:pointer;color:var(--ink-3)">×</button>'
    + '</div>'
    + removeBtn
    + '<div style="font-size:11px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">All Guests</div>'
    + rows + '</div>';
  overlay.addEventListener('click', e => { if (e.target===overlay) closeChairPicker(); });
  document.body.appendChild(overlay);
}

function closeChairPicker() {
  const el = document.getElementById('chair-guest-picker');
  if (el) el.remove();
}

function assignChairGuest(chairId, guestId) {
  WED.guests.forEach(g => { if (g._chairId===chairId) delete g._chairId; });
  if (guestId !== null) {
    const g = WED.guests.find(g=>g.id===guestId);
    if (g) g._chairId = chairId;
  }
  saveState();
  closeChairPicker();
  drawCanvas();
  renderSeatAssignments();
  showToast(guestId ? '🪑 Guest seated!' : '🗑 Seat cleared');
}

/* ── LANDING PAGE ────────────────────────────── */
function enterApp(instant) {
  sessionStorage.setItem('dtti_entered', '1');
  const el = document.getElementById('dtti-landing');
  if (!el) return;
  if (instant) {
    el.style.display = 'none';
    return;
  }
  el.style.transition = 'opacity 0.55s ease, visibility 0.55s ease';
  el.style.opacity    = '0';
  el.style.visibility = 'hidden';
  el.addEventListener('transitionend', () => { el.style.display = 'none'; }, { once: true });
}

/* ── INIT ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  // Wire amount input formatting
  document.addEventListener('input', function(ev) {
    if (ev.target && ev.target.classList.contains('peso-input')) {
      ev.target.value = ev.target.value.replace(/[^0-9.]/g,'').replace(/^(\d*\.?\d*).*$/,'$1');
      const rawBefore = (ev.target.value||'').replace(/,/g,'');
      const parts = rawBefore.split('.');
      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');
      ev.target.value = parts.length > 1 ? intPart+'.'+parts.slice(1).join('') : intPart;
    }
  });
  // Start on overview
  wedTab('overview');
  // Landing page is always the home — always show on fresh page load
  // enterApp() is called by the user clicking a CTA on the landing page
});

/* ── WINDOW EXPORTS ──────────────────────────── */
window.wedTab               = wedTab;
window.openModal            = openModal;
window.closeModal           = closeModal;
window.closeModalOutside    = closeModalOutside;
window.showToast            = showToast;
window.openSetupModal       = openSetupModal;
window.submitSetup          = submitSetup;
window.renderOverview       = renderOverview;
window.renderBudget         = renderBudget;
window.renderGuests         = renderGuests;
window.renderChecklist      = renderChecklist;
window.renderSchedule       = renderSchedule;
window.addWedExpense        = addWedExpense;
window.toggleExpensePaid    = toggleExpensePaid;
window.deleteExpense        = deleteExpense;
window.selectGuestMeal      = selectGuestMeal;
window.submitAddGuest       = submitAddGuest;
window.updateGuestRSVP      = updateGuestRSVP;
window.removeGuest          = removeGuest;
window.showRSVPCard         = showRSVPCard;
window.uploadInvitation     = uploadInvitation;
window.toggleChecklist      = toggleChecklist;
window.openAddChecklistItem = openAddChecklistItem;
window.openAddChecklistItemToPhase = openAddChecklistItemToPhase;
window.submitChecklistItem  = submitChecklistItem;
window.deleteChecklistItem  = deleteChecklistItem;
window.addWedSched          = addWedSched;
window.toggleSchedule       = toggleSchedule;
window.openEditSched        = openEditSched;
window.submitEditSched      = submitEditSched;
window.deleteSchedItem      = deleteSchedItem;
window.setSchedView         = setSchedView;
window.navSchedDate         = navSchedDate;
window.jumpToDate           = jumpToDate;
window.prefillSchedDate     = prefillSchedDate;
window.initCanvas              = initCanvas;
window.addFurniture            = addFurniture;
window.drawCanvas              = drawCanvas;
window.renderCanvasActions     = renderCanvasActions;
window.deleteSelectedFurniture = deleteSelectedFurniture;
window.resizeLongTable         = resizeLongTable;
window.openChairGuestPicker    = openChairGuestPicker;
window.closeChairPicker        = closeChairPicker;
window.assignChairGuest        = assignChairGuest;
window.openAddTableModal       = openAddTableModal;
window.changeTableSeats        = changeTableSeats;
window.closeAddTableModal      = closeAddTableModal;
window.confirmAddTable         = confirmAddTable;
window.addFurnitureWithSeats   = addFurnitureWithSeats;
window.renderSuppliers         = renderSuppliers;
window.openAddVendorModal      = openAddVendorModal;
window.submitAddVendor         = submitAddVendor;
window.deleteVendor            = deleteVendor;
window.openQuickDials          = openQuickDials;
window.closeQuickDials         = closeQuickDials;
window.enterApp                = enterApp;
window.rotateFurniture         = rotateFurniture;
window.zoomCanvas              = zoomCanvas;
window.fitCanvas               = fitCanvas;
window.openChecklistNoteEditor  = openChecklistNoteEditor;
window.saveChecklistNote        = saveChecklistNote;
window.togglePhaseCollapse      = togglePhaseCollapse;
window.submitChecklistTimeline  = submitChecklistTimeline;
window.openPartnerBrowse        = openPartnerBrowse;
