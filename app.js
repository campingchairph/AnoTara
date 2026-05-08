/* ═══════════════════════════════════════════════
   ANO TARA — app.js
   All features: nav, tasks, expenses, balance,
   map (Leaflet), sharing, QR, couple pairing,
   lang toggle, floating task dropdown, assign
   ═══════════════════════════════════════════════ */
'use strict';

/* ── STATE ───────────────────────────────────── */
const STATE = {
  lang: localStorage.getItem('at_lang') || 'en',
  currentGroup: 'familia',
  navHistory: ['home'],
  mapInstance: null,
  mapPins: JSON.parse(localStorage.getItem('at_pins') || '[]'),
  pendingLatLng: null,
  pollVotes: [55, 30, 15],
  pairedCode: localStorage.getItem('at_pair_code') || null,
  isPaired: localStorage.getItem('at_paired') === '1',
  expenseIconSelected: '🍽️',
  splitMethod: 'equal',
  assignedMember: null,
  activeTaskDropdown: null,
};

const MEMBERS = [
  { id: 'MA', name: 'Maria (You)', color: 'ma-tan' },
  { id: 'CA', name: 'Carlo',       color: 'ma-green' },
  { id: 'MK', name: 'Mark',        color: 'ma-pink' },
  { id: 'TL', name: 'Tita Linda',  color: 'ma-sand' },
  { id: 'AN', name: 'Ana',         color: 'ma-green' },
];

const PIN_TYPES = ['pinMeetup','pinParking','pinEntrance','pinFood','pinPhoto','pinOther'];
const PIN_EMOJIS = { pinMeetup:'📍', pinParking:'🅿️', pinEntrance:'🚪', pinFood:'🍽️', pinPhoto:'📸', pinOther:'📌' };

/* ── LANG ────────────────────────────────────── */
function t(key) { return (window.LANG[STATE.lang] || window.LANG.en)[key] || key; }

function applyLang() {
  document.querySelectorAll('[data-t]').forEach(el => {
    const key = el.getAttribute('data-t');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-t-ph]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-t-ph'));
  });
  document.querySelectorAll('[data-t-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.getAttribute('data-t-aria')));
  });
  // Toggle button label
  const toggleBtn = document.getElementById('lang-toggle');
  if (toggleBtn) toggleBtn.textContent = STATE.lang === 'en' ? '🇵🇭 Filipino' : '🇺🇸 English';
}

function toggleLang() {
  STATE.lang = STATE.lang === 'en' ? 'fil' : 'en';
  localStorage.setItem('at_lang', STATE.lang);
  applyLang();
  showToast(STATE.lang === 'en' ? '🇺🇸 Switched to English' : '🇵🇭 Pinalit sa Filipino');
}

/* ── NAVIGATION ──────────────────────────────── */
const ALL_SCREENS = ['home','groups','group-detail','couple','receipt','settings'];
const NAV_IDS     = ['home','groups','couple','settings'];

function navTo(id) {
  ALL_SCREENS.forEach(s => {
    const el = document.getElementById(s);
    if (!el) return;
    const was = el.classList.contains('active');
    el.classList.remove('active');
    if (s === id) {
      el.classList.add('active');
      if (!was) { el.style.animation='none'; void el.offsetWidth; el.style.animation=''; }
    }
  });
  NAV_IDS.forEach(s => {
    const btn = document.getElementById('nav-'+s);
    if (btn) btn.classList.toggle('active', s === id);
  });
  if (STATE.navHistory[STATE.navHistory.length-1] !== id) STATE.navHistory.push(id);
  const fab = document.getElementById('fab');
  if (fab) fab.style.display = ['group-detail','receipt','settings'].includes(id) ? 'none' : 'flex';
  window.scrollTo({ top:0, behavior:'smooth' });
  closeAllDropdowns();
}

function goBack() {
  if (STATE.navHistory.length > 1) {
    STATE.navHistory.pop();
    navTo(STATE.navHistory[STATE.navHistory.length-1]);
  }
}

/* ── GROUP OPEN ──────────────────────────────── */
function openGroup(variant) {
  STATE.currentGroup = variant || 'familia';
  const hero = document.getElementById('group-hero-el');
  const heroName = document.getElementById('group-hero-name');
  const heroSub  = document.getElementById('group-hero-sub');
  if (hero) hero.className = 'group-hero gh-' + STATE.currentGroup;

  const data = {
    familia: { emoji:'🎂', name:'Ano Tara — Mifamilia', sub:'6 members · Family Event · May 15' },
    jowa:    { emoji:'💑', name:'Ano Tara — Jowa',      sub:'Maria & JC · Couple Finance' },
    berks:   { emoji:'🍜', name:'Ano Tara — Berks',     sub:'5 people · Tonight 7pm' },
  };
  const d = data[STATE.currentGroup] || data.familia;
  if (heroName) heroName.textContent = d.name;
  if (heroSub)  heroSub.textContent  = d.sub;
  const heroEmoji = document.getElementById('group-hero-emoji');
  if (heroEmoji) heroEmoji.textContent = d.emoji;

  navTo('group-detail');
  switchTab('tasks');
}

/* ── TABS ────────────────────────────────────── */
function switchTab(name) {
  ['tasks','expenses','members','settle','map'].forEach(t => {
    const panel = document.getElementById('panel-'+t);
    const tab   = document.getElementById('tab-'+t);
    if (panel) panel.style.display = t === name ? 'block' : 'none';
    if (tab)   tab.classList.toggle('active', t === name);
  });
  if (name === 'map') initMap();
}

/* ── TASK FLOATING DROPDOWN ──────────────────── */
function closeAllDropdowns() {
  document.querySelectorAll('.task-dropdown').forEach(d => d.remove());
  STATE.activeTaskDropdown = null;
}

function showTaskDropdown(el, event) {
  event.stopPropagation();
  closeAllDropdowns();

  const rect = el.getBoundingClientRect();
  const appRect = document.getElementById('app').getBoundingClientRect();

  const dropdown = document.createElement('div');
  dropdown.className = 'task-dropdown glass-heavy';
  dropdown.innerHTML = `
    <button class="td-btn td-pending"  onclick="setTaskStatus(this,'pending')" >${t('setPending')}</button>
    <button class="td-btn td-progress" onclick="setTaskStatus(this,'progress')">${t('setProgress')}</button>
    <button class="td-btn td-done"     onclick="setTaskStatus(this,'done')"    >${t('setDone')}</button>
  `;

  // Position below the task row
  dropdown.style.cssText = `
    position:fixed;
    top:${rect.bottom + 6}px;
    left:${Math.max(rect.left, appRect.left + 8)}px;
    width:${Math.min(220, window.innerWidth - 32)}px;
    z-index:500;
    border-radius:var(--r-md);
    overflow:hidden;
    animation:popIn 0.18s cubic-bezier(0.34,1.56,0.64,1);
  `;

  document.body.appendChild(dropdown);
  STATE.activeTaskDropdown = { dropdown, taskEl: el };
  return false;
}

function setTaskStatus(btnEl, status) {
  if (!STATE.activeTaskDropdown) return;
  const taskEl = STATE.activeTaskDropdown.taskEl;
  const check  = taskEl.querySelector('.task-check');
  const name   = taskEl.querySelector('.task-name');
  const badge  = taskEl.querySelector('.task-status');

  check.className = 'task-check' + (status !== 'pending' ? ' '+status : '');
  name.classList.toggle('done-text', status === 'done');

  const map = {
    done:     { cls:'s-done',     label: t('statusDone') },
    progress: { cls:'s-progress', label: t('statusProgress') },
    pending:  { cls:'s-pending',  label: t('statusPending') },
  };
  if (badge) { badge.className = 'task-status '+map[status].cls; badge.textContent = map[status].label; }

  const toasts = { done: '✅ '+t('statusDone')+'!', progress: '🔄 '+t('statusProgress'), pending: '⏸ '+t('statusPending') };
  showToast(toasts[status]);
  closeAllDropdowns();
}

/* ── ASSIGN MEMBER PICKER ────────────────────── */
function openAssignPicker(taskEl) {
  const existing = document.getElementById('assign-picker');
  if (existing) existing.remove();
  if (!taskEl) return;

  const rect = taskEl.getBoundingClientRect();
  const picker = document.createElement('div');
  picker.id = 'assign-picker';
  picker.className = 'glass-heavy';
  picker.style.cssText = `
    position:fixed; top:${rect.bottom+6}px; left:${rect.left}px;
    z-index:501; border-radius:var(--r-md); padding:8px;
    display:flex; gap:6px; flex-wrap:wrap; max-width:240px;
    animation:popIn 0.18s cubic-bezier(0.34,1.56,0.64,1);
    border:1px solid var(--glass-border);
  `;

  MEMBERS.forEach(m => {
    const btn = document.createElement('button');
    btn.style.cssText = `
      width:38px;height:38px;border-radius:10px;
      display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:700;cursor:pointer;border:2px solid rgba(255,255,255,0.6);
    `;
    btn.className = 'member-av '+m.color;
    btn.textContent = m.id;
    btn.title = m.name;
    btn.onclick = () => {
      const assignEl = taskEl.querySelector('.task-assignee');
      if (assignEl) assignEl.textContent = m.name;
      picker.remove();
      showToast('👤 Assigned to '+m.name);
    };
    picker.appendChild(btn);
  });

  document.body.appendChild(picker);
}

/* ── BALANCE BREAKDOWN MODAL ─────────────────── */
function openBalanceBreakdown() {
  const modal = document.getElementById('balance-modal');
  if (modal) {
    renderBalanceBreakdown();
    modal.classList.add('open');
  }
}

function renderBalanceBreakdown() {
  const byGroup = document.getElementById('bal-by-group');
  const byPerson = document.getElementById('bal-by-person');
  if (!byGroup || !byPerson) return;

  const groups = [
    { name:'Ano Tara — Mifamilia', emoji:'🎂', owed:473, owe:0,   variant:'familia' },
    { name:'Ano Tara — Berks',     emoji:'🍜', owed:560, owe:0,   variant:'berks' },
    { name:'Ano Tara — Jowa',      emoji:'💑', owed:0,   owe:240, variant:'jowa' },
    { name:'Palawan Trip',          emoji:'✈️', owed:800, owe:320, variant:'familia' },
  ];

  byGroup.innerHTML = groups.map(g => {
    const net = g.owed - g.owe;
    const isPos = net >= 0;
    return `
    <div class="bal-row glass" style="margin-bottom:8px;padding:12px 14px;border-radius:var(--r-md);display:flex;align-items:center;gap:10px">
      <span style="font-size:22px">${g.emoji}</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;color:var(--ink)">${g.name}</div>
        ${g.owed ? `<div style="font-size:11px;color:var(--green-deep)">↑ Owed ₱${g.owed}</div>` : ''}
        ${g.owe  ? `<div style="font-size:11px;color:var(--pink-deep)">↓ Owes ₱${g.owe}</div>` : ''}
      </div>
      <div style="font-size:16px;font-weight:700;color:${isPos?'var(--green-deep)':'var(--pink-deep)'}">
        ${isPos?'+':'−'}₱${Math.abs(net)}
      </div>
    </div>`;
  }).join('');

  const people = [
    { id:'CA', name:'Carlo',      color:'ma-green', owesYou:113,  youOwe:0   },
    { id:'MK', name:'Mark',       color:'ma-pink',  owesYou:200,  youOwe:0   },
    { id:'AN', name:'Ana',        color:'ma-green', owesYou:473,  youOwe:0   },
    { id:'JC', name:'JC (Jowa)',  color:'ma-tan',   owesYou:0,    youOwe:240 },
    { id:'TL', name:'Tita Linda', color:'ma-sand',  owesYou:273,  youOwe:0   },
  ];

  byPerson.innerHTML = people.map(p => {
    const isOwed = p.owesYou > 0;
    return `
    <div class="bal-row glass" style="margin-bottom:8px;padding:12px 14px;border-radius:var(--r-md);display:flex;align-items:center;gap:10px">
      <div class="member-av ${p.color}" style="width:38px;height:38px;border-radius:10px;font-size:12px">${p.id}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;color:var(--ink)">${p.name}</div>
        <div style="font-size:11px;color:${isOwed?'var(--green-deep)':'var(--pink-deep)'}">
          ${isOwed ? p.name+' '+t('owesYou')+' ₱'+p.owesYou : t('owesThem')+' ₱'+p.youOwe}
        </div>
      </div>
      <button onclick="showToast('📲 Request sent to ${p.name}!')" style="
        padding:6px 12px;border-radius:var(--r-xs);
        background:${isOwed?'rgba(90,171,122,0.15)':'rgba(224,120,152,0.12)'};
        border:1px solid ${isOwed?'rgba(90,171,122,0.25)':'rgba(224,120,152,0.2)'};
        color:${isOwed?'var(--green-deep)':'var(--pink-deep)'};
        font-size:11px;font-weight:700;cursor:pointer;
      ">${isOwed ? t('requestPayment') : t('sendMoney')}</button>
    </div>`;
  }).join('');
}

/* ── SHARE MODAL ─────────────────────────────── */
function openShareModal() {
  renderQR();
  openModal('share-modal');
}

function renderQR() {
  const container = document.getElementById('qr-container');
  if (!container) return;
  // Simple SVG QR-style visual (representative pattern)
  const link = 'https://anotara.app/join/GROUP_XYZ123';
  container.innerHTML = `
    <div style="text-align:center">
      <svg width="140" height="140" viewBox="0 0 140 140" style="border-radius:12px;background:white;padding:8px">
        <rect x="8" y="8" width="40" height="40" rx="4" fill="#2c1f0e"/>
        <rect x="14" y="14" width="28" height="28" rx="2" fill="white"/>
        <rect x="18" y="18" width="20" height="20" rx="1" fill="#2c1f0e"/>
        <rect x="92" y="8" width="40" height="40" rx="4" fill="#2c1f0e"/>
        <rect x="98" y="14" width="28" height="28" rx="2" fill="white"/>
        <rect x="102" y="18" width="20" height="20" rx="1" fill="#2c1f0e"/>
        <rect x="8" y="92" width="40" height="40" rx="4" fill="#2c1f0e"/>
        <rect x="14" y="98" width="28" height="28" rx="2" fill="white"/>
        <rect x="18" y="102" width="20" height="20" rx="1" fill="#2c1f0e"/>
        ${generateQRDots()}
      </svg>
      <div style="font-size:11px;color:var(--ink-3);margin-top:8px;font-weight:600">${t('scanToJoin')}</div>
    </div>`;
}

function generateQRDots() {
  let dots = '';
  const positions = [
    [56,8],[64,8],[72,8],[80,8],[56,16],[72,16],[56,24],[64,24],[80,24],
    [56,32],[72,32],[80,32],[64,40],[72,40],[56,48],[72,48],[80,48],
    [8,56],[24,56],[40,56],[64,56],[80,56],[96,56],[112,56],[128,56],
    [8,64],[16,64],[40,64],[56,64],[72,64],[88,64],[104,64],[120,64],
    [8,72],[32,72],[48,72],[80,72],[96,72],[112,72],[128,72],
    [8,80],[16,80],[24,80],[48,80],[64,80],[96,80],[120,80],
    [56,92],[72,92],[88,92],[96,92],[112,92],[128,92],
    [56,100],[64,100],[80,100],[96,100],[104,100],[128,100],
    [56,108],[72,108],[88,108],[120,108],[128,108],
    [64,116],[80,116],[96,116],[112,116],
    [56,124],[72,124],[88,124],[104,124],[120,124],[128,124],
  ];
  positions.forEach(([x,y]) => { dots += `<rect x="${x}" y="${y}" width="6" height="6" rx="1" fill="#2c1f0e"/>`; });
  return dots;
}

function copyShareLink() {
  const link = 'https://anotara.app/join/GROUP_XYZ123';
  if (navigator.clipboard) navigator.clipboard.writeText(link).catch(()=>{});
  showToast(t('linkCopied'));
}

function shareToMessenger() {
  const link = encodeURIComponent('https://anotara.app/join/GROUP_XYZ123');
  const text = encodeURIComponent('Sumali ka sa aming grupo sa Ano Tara! 🎉');
  const url = `https://www.facebook.com/dialog/send?link=${link}&app_id=123456&redirect_uri=${link}`;
  window.open(url, '_blank');
  showToast('📲 Opening Messenger…');
}

/* ── MAP (LEAFLET) ───────────────────────────── */
function initMap() {
  if (STATE.mapInstance) return; // already initialized

  const container = document.getElementById('leaflet-map');
  if (!container) return;

  // Default: Metro Manila center
  const map = L.map('leaflet-map', {
    center: [14.5995, 120.9842],
    zoom: 14,
    zoomControl: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  STATE.mapInstance = map;

  // Restore saved pins
  STATE.mapPins.forEach((pin, i) => addPinToMap(pin, i+1));

  // Tap to add hint
  map.on('click', function(e) {
    STATE.pendingLatLng = e.latlng;
    // Show pending dot
    if (STATE.pendingMarker) STATE.pendingMarker.remove();
    STATE.pendingMarker = L.circleMarker(e.latlng, {
      radius:10, color:'var(--tan)', fillColor:'rgba(245,166,35,0.4)',
      fillOpacity:1, weight:2
    }).addTo(map).bindPopup(t('tapMapHint')).openPopup();
    openModal('add-pin-modal');
  });

  // Fix map tile load after container becomes visible
  setTimeout(() => map.invalidateSize(), 200);
}

function addPinToMap(pin, number) {
  if (!STATE.mapInstance) return;
  const emoji = PIN_EMOJIS[pin.type] || '📌';
  const icon = L.divIcon({
    className: '',
    html: `<div class="map-pin-icon" style="
      width:36px;height:36px;border-radius:10px;
      background:rgba(255,253,248,0.92);
      border:2px solid rgba(201,169,110,0.5);
      display:flex;align-items:center;justify-content:center;
      font-size:16px;position:relative;
      box-shadow:0 4px 14px rgba(44,31,14,0.18),inset 0 1px 0 rgba(255,255,255,0.8);
    ">
      ${emoji}
      <div style="
        position:absolute;top:-6px;right:-6px;
        width:18px;height:18px;border-radius:6px;
        background:linear-gradient(135deg,var(--tan),var(--tan-dark,#a07840));
        color:white;font-size:9px;font-weight:700;
        display:flex;align-items:center;justify-content:center;
        border:1.5px solid white;
      ">${number}</div>
    </div>`,
    iconSize: [36,36], iconAnchor:[18,18], popupAnchor:[0,-20]
  });

  L.marker([pin.lat, pin.lng], { icon })
    .addTo(STATE.mapInstance)
    .bindPopup(`
      <div style="font-family:'Figtree',sans-serif;min-width:140px">
        <div style="font-weight:700;font-size:13px;margin-bottom:2px">${emoji} ${pin.name}</div>
        ${pin.note ? `<div style="font-size:11px;color:#7a6045">${pin.note}</div>` : ''}
        <div style="font-size:10px;color:#b8977a;margin-top:4px">Pin #${number}</div>
      </div>
    `);
}

function submitPin() {
  const nameEl = document.getElementById('pin-name-input');
  const noteEl = document.getElementById('pin-note-input');
  const typeEl = document.querySelector('.pin-type-btn.selected');

  const name = nameEl ? nameEl.value.trim() : '';
  if (!name) { showToast('⚠️ Please enter a place name'); return; }

  const latlng = STATE.pendingLatLng || { lat:14.5995, lng:120.9842 };
  const pinType = typeEl ? typeEl.getAttribute('data-type') : 'pinMeetup';

  const pin = {
    lat: latlng.lat,
    lng: latlng.lng,
    name,
    type: pinType,
    note: noteEl ? noteEl.value.trim() : '',
  };

  STATE.mapPins.push(pin);
  localStorage.setItem('at_pins', JSON.stringify(STATE.mapPins));

  addPinToMap(pin, STATE.mapPins.length);

  if (STATE.pendingMarker) { STATE.pendingMarker.remove(); STATE.pendingMarker = null; }
  STATE.pendingLatLng = null;

  closeModalById('add-pin-modal');
  if (nameEl) nameEl.value = '';
  if (noteEl) noteEl.value = '';

  renderPinList();
  showToast(t('pinAdded'));
}

function selectPinType(btn) {
  document.querySelectorAll('.pin-type-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function renderPinList() {
  const list = document.getElementById('pin-list');
  if (!list) return;
  if (!STATE.mapPins.length) {
    list.innerHTML = `<div style="text-align:center;padding:16px;font-size:13px;color:var(--ink-4)">${t('tapMapHint')}</div>`;
    return;
  }
  list.innerHTML = STATE.mapPins.map((p,i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:var(--r-md);margin-bottom:7px" class="glass">
      <div style="width:30px;height:30px;border-radius:9px;background:rgba(245,230,200,0.7);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${PIN_EMOJIS[p.type]||'📌'}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;color:var(--ink)">${p.name}</div>
        ${p.note?`<div style="font-size:11px;color:var(--ink-4)">${p.note}</div>`:''}
      </div>
      <div style="width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,var(--tan),#a07840);color:white;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">${i+1}</div>
    </div>`).join('');
}

/* ── EXPENSE FORM ────────────────────────────── */
const EXPENSE_ICONS = {
  'Food & Drinks': ['🍽️','🍜','🍕','🍔','🍣','🧁','☕','🥤','🍷','🧆'],
  'Transport':     ['🚗','🚕','🛵','🚌','✈️','🚢','🚂','⛽','🅿️','🛞'],
  'Shopping':      ['🛒','👗','👟','📦','🎁','💄','📱','💻','🛍️','🧴'],
  'Home':          ['🏠','🛋️','🧹','💡','🔧','🌿','🚪','🛏️','🧺','🔑'],
  'Fun':           ['🎉','🎵','🎬','🎮','🏖️','⛰️','🏋️','🎭','🎨','🎪'],
  'Health':        ['💊','🏥','🧘','🏃','💉','🩺','🦷','👓','🧠','❤️'],
  'Finance':       ['💰','💳','🏦','📈','💵','🧾','🤝','📊','💎','🏷️'],
};

function renderIconPicker() {
  const container = document.getElementById('icon-picker-grid');
  if (!container) return;
  let html = '';
  for (const [cat, icons] of Object.entries(EXPENSE_ICONS)) {
    html += `<div style="margin-bottom:10px">
      <div style="font-size:10px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px">${cat}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">`;
    icons.forEach(icon => {
      html += `<button class="icon-pick-btn${icon===STATE.expenseIconSelected?' selected':''}"
        onclick="selectExpenseIcon(this,'${icon}')">${icon}</button>`;
    });
    html += `</div></div>`;
  }
  container.innerHTML = html;
}

function selectExpenseIcon(btn, icon) {
  STATE.expenseIconSelected = icon;
  document.querySelectorAll('.icon-pick-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const preview = document.getElementById('expense-icon-preview');
  if (preview) preview.textContent = icon;
}

function setSplitMethod(method) {
  STATE.splitMethod = method;
  document.querySelectorAll('.split-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.querySelector(`.split-btn[data-method="${method}"]`);
  if (btn) btn.classList.add('selected');
  renderSplitPreview();
}

function renderSplitPreview() {
  const preview = document.getElementById('split-preview');
  const amountEl = document.getElementById('expense-amount-input');
  if (!preview || !amountEl) return;
  const total = parseFloat(amountEl.value) || 0;
  if (!total) { preview.style.display = 'none'; return; }
  preview.style.display = 'block';
  const n = MEMBERS.length;
  let html = `<div style="font-size:11px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px">${t('splitPreview')}</div>`;

  if (STATE.splitMethod === 'equal') {
    const each = (total/n).toFixed(2);
    html += MEMBERS.map(m=>`
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12.5px">
        <span style="color:var(--ink-2)">${m.name}</span>
        <span style="font-weight:700;color:var(--ink)">₱${each}</span>
      </div>`).join('');
  } else if (STATE.splitMethod === 'two') {
    const half = (total/2).toFixed(2);
    html += `<div style="font-size:12.5px;color:var(--ink-2)">Two people · ₱${half} each</div>`;
  } else if (STATE.splitMethod === 'full') {
    html += `<div style="font-size:12.5px;color:var(--ink-2)">One person pays ₱${total.toFixed(2)}</div>`;
  } else {
    html += `<div style="font-size:12.5px;color:var(--ink-2)">Custom split — enter percentages</div>`;
  }
  preview.innerHTML = html;
}

function renderMemberPicker() {
  const container = document.getElementById('paidby-picker');
  if (!container) return;
  container.innerHTML = MEMBERS.map((m,i) => `
    <button class="member-pick-btn${i===0?' selected':''}" onclick="selectPayer(this,'${m.id}')"
      style="display:flex;align-items:center;gap:7px;padding:8px 12px;border-radius:var(--r-md);cursor:pointer;border:1.5px solid ${i===0?'rgba(201,169,110,0.45)':'rgba(255,255,255,0.5)'};background:${i===0?'rgba(245,230,200,0.55)':'rgba(255,255,255,0.45)'}">
      <div class="member-av ${m.color}" style="width:28px;height:28px;border-radius:8px;font-size:10px">${m.id}</div>
      <span style="font-size:12.5px;font-weight:600;color:var(--ink)">${m.name}</span>
    </button>`).join('');
}

function selectPayer(btn, id) {
  document.querySelectorAll('.member-pick-btn').forEach(b => {
    b.classList.remove('selected');
    b.style.borderColor = 'rgba(255,255,255,0.5)';
    b.style.background  = 'rgba(255,255,255,0.45)';
  });
  btn.classList.add('selected');
  btn.style.borderColor = 'rgba(201,169,110,0.45)';
  btn.style.background  = 'rgba(245,230,200,0.55)';
}

function renderTaskMemberPicker() {
  const container = document.getElementById('task-assign-picker');
  if (!container) return;
  container.innerHTML = MEMBERS.map((m,i) => `
    <button class="task-member-btn${i===0?' selected':''}" onclick="selectTaskMember(this,'${m.id}')"
      style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px;border-radius:var(--r-md);cursor:pointer;border:1.5px solid ${i===0?'rgba(201,169,110,0.45)':'rgba(255,255,255,0.5)'};background:${i===0?'rgba(245,230,200,0.55)':'rgba(255,255,255,0.45)'}">
      <div class="member-av ${m.color}" style="width:36px;height:36px;border-radius:10px;font-size:12px">${m.id}</div>
      <span style="font-size:10px;font-weight:600;color:var(--ink-2);text-align:center;line-height:1.2;max-width:52px">${m.name.split(' ')[0]}</span>
    </button>`).join('');
}

function selectTaskMember(btn, id) {
  STATE.assignedMember = id;
  document.querySelectorAll('.task-member-btn').forEach(b => {
    b.classList.remove('selected');
    b.style.borderColor = 'rgba(255,255,255,0.5)';
    b.style.background  = 'rgba(255,255,255,0.45)';
  });
  btn.classList.add('selected');
  btn.style.borderColor = 'rgba(201,169,110,0.45)';
  btn.style.background  = 'rgba(245,230,200,0.55)';
}

/* ── COUPLE PAIRING ──────────────────────────── */
function generatePairCode() {
  const code = Math.random().toString(36).substring(2,8).toUpperCase();
  STATE.pairedCode = code;
  localStorage.setItem('at_pair_code', code);
  const el = document.getElementById('pair-code-display');
  if (el) el.textContent = code;
  showToast('🔑 Code generated: '+code);
}

function submitPairing() {
  const input = document.getElementById('pair-code-input');
  if (!input || !input.value.trim()) { showToast('⚠️ Enter the pairing code'); return; }
  STATE.isPaired = true;
  localStorage.setItem('at_paired', '1');
  closeModalById('pair-modal');
  showToast(t('pairSuccess'));
  const indicator = document.getElementById('couple-sync-indicator');
  if (indicator) {
    indicator.style.display = 'flex';
    indicator.querySelector('.sync-dot').classList.add('active');
  }
}

/* ── MODALS ──────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  // Render dynamic content
  if (id === 'add-expense-modal') { renderIconPicker(); renderMemberPicker(); renderSplitPreview(); }
  if (id === 'add-task-modal')    { renderTaskMemberPicker(); }
  el.classList.add('open');
}

function closeModalById(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function closeModalOutside(e, id) {
  if (e.target.id === id) closeModalById(id);
}

/* ── FORM ACTIONS ────────────────────────────── */
function selectType(btn) {
  const grid = btn.closest('.type-grid');
  if (grid) grid.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function createGroup() {
  const input = document.querySelector('#new-group-modal input[type="text"]');
  const name  = input ? input.value.trim() : '';
  closeModalById('new-group-modal');
  if (input) input.value = '';
  showToast('🎉 '+(name || t('groupCreated')));
  setTimeout(() => navTo('groups'), 380);
}

function addExpense() {
  closeModalById('add-expense-modal');
  showToast(t('expenseAdded'));
}

function addTask() {
  closeModalById('add-task-modal');
  showToast(t('taskAdded'));
}

/* ── POLL ────────────────────────────────────── */
function vote(el, idx) {
  document.querySelectorAll('.poll-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  STATE.pollVotes[idx] = Math.min(STATE.pollVotes[idx]+12, 94);
  const total = STATE.pollVotes.reduce((a,b)=>a+b,0);
  STATE.pollVotes.forEach((v,i) => {
    const pct = Math.round((v/total)*100);
    const fill = document.getElementById('pf'+i);
    const lbl  = document.getElementById('pp'+i);
    if (fill) fill.style.width = pct+'%';
    if (lbl)  lbl.textContent  = pct+'%';
  });
  showToast('🗳️ Vote recorded!');
}

/* ── TOAST ───────────────────────────────────── */
let _tt = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_tt);
  _tt = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ── ANIMATE PROGRESS BARS ───────────────────── */
function animateBars() {
  document.querySelectorAll('[data-width]').forEach(el => {
    setTimeout(() => { el.style.width = el.getAttribute('data-width'); }, 200);
  });
}

/* ── INIT ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  navTo('home');
  animateBars();
  renderPinList();

  // Couple sync state
  if (STATE.isPaired) {
    const indicator = document.getElementById('couple-sync-indicator');
    if (indicator) {
      indicator.style.display = 'flex';
      indicator.querySelector('.sync-dot').classList.add('active');
    }
  }

  // Close dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (STATE.activeTaskDropdown && !e.target.closest('.task-dropdown')) {
      closeAllDropdowns();
    }
    const picker = document.getElementById('assign-picker');
    if (picker && !e.target.closest('#assign-picker') && !e.target.closest('.task-assign-btn')) {
      picker.remove();
    }
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      closeAllDropdowns();
    }
  });
});
