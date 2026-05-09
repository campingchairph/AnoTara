/* ═══════════════════════════════════════════════
   ANO TARA — app.js
   All features: nav, tasks, expenses, balance,
   map (Leaflet), sharing, QR, couple pairing,
   lang toggle, floating task dropdown, assign
   ═══════════════════════════════════════════════ */
'use strict';

/* ── STATE ───────────────────────────────────── */
const STATE = {
  lang: 'en',
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
  { id: 'MA', name: 'Jhoan (You)', color: 'ma-tan' },
  { id: 'CA', name: 'Carlo',       color: 'ma-green' },
  { id: 'MK', name: 'Mark',        color: 'ma-pink' },
  { id: 'TL', name: 'Tita Linda',  color: 'ma-sand' },
  { id: 'AN', name: 'Ana',         color: 'ma-green' },
];

const PIN_TYPES = ['pinMeetup','pinParking','pinEntrance','pinFood','pinPhoto','pinOther'];
const PIN_EMOJIS = { pinMeetup:'📍', pinParking:'🅿️', pinEntrance:'🚪', pinFood:'🍽️', pinPhoto:'📸', pinOther:'📌' };

/* ── LANG ────────────────────────────────────── */
window.LANG = {
  en: {
    appSub:'Plan together, stress less',
    greetSub:'Good day!', netBalance:'Net Balance',
    owedToYou:'Owed to you', youOwe:'You owe',
    quickGroups:'Groups', quickExpense:'Expense', quickCouple:'Jowa', quickWedding:'Wedding',
    yourGroups:'Your Groups', newBtn:'+ New',
    jowaLabel:'Ano Tara — Jowa', familiaLabel:'Ano Tara — Mifamilia', berksLabel:'Ano Tara — Berks',
    newGroupLabel:'New Group', newGroupSub:'Start planning together',
    happening:'Happening Now', seeAll:'See all',
    groupsTitle:'Your Groups',
    coupleFinance:'Couple finances & goals', familyEvent:'Family event planning', friendsHangout:'Friends hangout', tonight:'Tonight',
    backBtn:'Back', inviteBtn:'Invite',
    tabTasks:'Tasks', tabExpenses:'Expenses', tabMembers:'Members', tabSettle:'Settle', tabMap:'Map',
    tasksTitle:'Tasks', addTask:'+ Add',
    statusDone:'Done', statusProgress:'In Progress', statusPending:'Pending',
    addExpenseTitle:'Add Expense', categoryLabel:'Category', descLabel:'Description',
    descPlaceholder:'e.g. Dinner, Grocery…', amountLabel:'Amount', amountPlaceholder:'₱ 0.00',
    paidByLabel:'Paid by', splitLabel:'Split', noteLabel:'Note', notePlaceholder:'Optional note…',
    dateLabel:'Date', photoLabel:'Receipt Photo', addEntryBtn:'Add Expense →',
    splitEqual:'Equal', splitCustom:'Custom', splitTwo:'Two-way', splitFull:'One pays',
    addTaskTitle:'Add Task', taskLabel:'Task', taskPlaceholder:'What needs to be done?',
    assignLabel:'Assign to', dueDateLabel:'Due Date', addTaskBtn:'Add Task →',
    newGroupTitle:'New Group', groupNameLabel:'Group Name', groupNamePlaceholder:'e.g. Bday ni Carlo',
    groupTypeLabel:'Type', budgetLabel2:'Budget (optional)', createGroupBtn:'Create Group →',
    typeJowa:'Jowa', typeJowaSub:'Couple', typeFamilia:'Mifamilia', typeFamiliaSub:'Family',
    typeBerks:'Berks', typeBerksSub:'Friends', typeTrip:'Trip', typeTripSub:'Travel',
    mapPinTitle:'Add Pin', pinNameLabel:'Name', pinNamePlaceholder:'e.g. Meeting spot',
    pinTypeLabel:'Type', pinNoteLabel:'Note', pinNotePlaceholder:'Optional…', addPinBtn:'Add Pin →',
    pinMeetup:'Meetup', pinParking:'Parking', pinEntrance:'Entrance', pinFood:'Food', pinPhoto:'Photo', pinOther:'Other',
    balBreakdownTitle:'Balance Breakdown', balPerGroup:'By Group', balPerPerson:'By Person',
    shareTitle:'Share Group', copyLink:'Copy Link', shareMessenger:'Share via Messenger', shareQR:'QR Code',
    pairJowa:'Pair with Jowa', pairCode:'Your Code', enterCode:'Partner\'s Code', pairBtn:'Pair Now →',
    codeCopied:'Copied!',
    notifications:'Notifications', monthlyReports:'Monthly Reports', calendarSync:'Calendar Sync',
    aiSmartLists:'AI Smart Lists', rateApp:'Rate the App', sendFeedback:'Send Feedback',
    navHome:'Home', navGroups:'Groups', navCouple:'Jowa', navSettings:'Settings',
  },
  fil: {
    appSub:'Mag-plano nang magkasama',
    greetSub:'Kumusta!', netBalance:'Net Balance',
    owedToYou:'Utang sa iyo', youOwe:'Utang mo',
    quickGroups:'Groups', quickExpense:'Gastos', quickCouple:'Jowa', quickWedding:'Kasal',
    yourGroups:'Mga Group', newBtn:'+ Bago',
    jowaLabel:'Ano Tara — Jowa', familiaLabel:'Ano Tara — Mifamilia', berksLabel:'Ano Tara — Berks',
    newGroupLabel:'Bagong Group', newGroupSub:'Mag-plan nang magkasama',
    happening:'Nangyayari Ngayon', seeAll:'Tingnan lahat',
    groupsTitle:'Mga Group',
    coupleFinance:'Finances ng mag-asawa', familyEvent:'Family event', friendsHangout:'Lakad ng barkada', tonight:'Ngayong Gabi',
    backBtn:'Bumalik', inviteBtn:'Imbitahan',
    tabTasks:'Gawain', tabExpenses:'Gastos', tabMembers:'Miyembro', tabSettle:'Bayad', tabMap:'Mapa',
    tasksTitle:'Mga Gawain', addTask:'+ Dagdag',
    statusDone:'Tapos', statusProgress:'In Progress', statusPending:'Pending',
    addExpenseTitle:'Dagdag na Gastos', categoryLabel:'Kategorya', descLabel:'Paglalarawan',
    descPlaceholder:'hal. Hapunan, Grocery…', amountLabel:'Halaga', amountPlaceholder:'₱ 0.00',
    paidByLabel:'Binayaran ni', splitLabel:'Hatiin', noteLabel:'Tala', notePlaceholder:'Opsyonal…',
    dateLabel:'Petsa', photoLabel:'Larawan ng Resibo', addEntryBtn:'Idagdag →',
    splitEqual:'Pantay', splitCustom:'Custom', splitTwo:'Dalawa', splitFull:'Isa lang',
    addTaskTitle:'Bagong Gawain', taskLabel:'Gawain', taskPlaceholder:'Ano ang kailangang gawin?',
    assignLabel:'I-assign sa', dueDateLabel:'Deadline', addTaskBtn:'Idagdag →',
    newGroupTitle:'Bagong Group', groupNameLabel:'Pangalan', groupNamePlaceholder:'hal. Bday ni Carlo',
    groupTypeLabel:'Uri', budgetLabel2:'Budget (opsyonal)', createGroupBtn:'Gumawa ng Group →',
    typeJowa:'Jowa', typeJowaSub:'Mag-asawa', typeFamilia:'Mifamilia', typeFamiliaSub:'Pamilya',
    typeBerks:'Berks', typeBerksSub:'Mga Kaibigan', typeTrip:'Trip', typeTripSub:'Lakbay',
    mapPinTitle:'Lagyan ng Pin', pinNameLabel:'Pangalan', pinNamePlaceholder:'hal. Tagpuan',
    pinTypeLabel:'Uri', pinNoteLabel:'Tala', pinNotePlaceholder:'Opsyonal…', addPinBtn:'Idagdag →',
    pinMeetup:'Tagpuan', pinParking:'Parking', pinEntrance:'Pasukan', pinFood:'Pagkain', pinPhoto:'Litrato', pinOther:'Iba pa',
    balBreakdownTitle:'Breakdown ng Balance', balPerGroup:'Per Group', balPerPerson:'Per Tao',
    shareTitle:'I-share ang Group', copyLink:'Kopyahin ang Link', shareMessenger:'I-share sa Messenger', shareQR:'QR Code',
    pairJowa:'I-pair ang Jowa', pairCode:'Iyong Code', enterCode:'Code ng Partner', pairBtn:'I-pair →',
    codeCopied:'Nakopya!',
    notifications:'Mga Notipikasyon', monthlyReports:'Buwanang Ulat', calendarSync:'Calendar Sync',
    aiSmartLists:'AI Smart Lists', rateApp:'I-rate ang App', sendFeedback:'Magpadala ng Feedback',
    navHome:'Home', navGroups:'Groups', navCouple:'Jowa', navSettings:'Settings',
  }
};

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
const ALL_SCREENS = ['home','groups','group-detail','couple','receipt','settings','wedding'];
const NAV_IDS     = ['home','groups','couple','settings'];
const FAB_HIDDEN  = ['group-detail','receipt','settings','wedding'];

function navTo(id) {
  // Ensure wedding screen is registered
  if (id === 'wedding' && !ALL_SCREENS.includes('wedding')) ALL_SCREENS.push('wedding');

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
  if (fab) fab.style.display = FAB_HIDDEN.includes(id) ? 'none' : 'flex';

  window.scrollTo({ top:0, behavior:'smooth' });
  closeAllDropdowns();

  // Wedding screen — init overview on first visit
  if (id === 'wedding') {
    const cd = document.getElementById('wed-countdown');
    if (cd && typeof getCountdown === 'function') cd.textContent = getCountdown();
    if (typeof renderOverview === 'function') renderOverview();
  }
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
    jowa:    { emoji:'💑', name:'Ano Tara — Jowa',      sub:'Jhoan & JC · Couple Finance' },
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
  // Render dynamic content before opening
  if (id === 'add-expense-modal') { renderIconPicker(); renderMemberPicker(); renderSplitPreview(); }
  if (id === 'add-task-modal')    { renderTaskMemberPicker(); }
  el.classList.add('open');
}

// Alias so wedding.js can call either name
window.openWedModal = openModal;

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
      const dot = indicator.querySelector('.sync-dot');
      if (dot) dot.classList.add('active');
    }
  }

  // Wedding countdown on home card (static, updated when wedding screen opens)
  const wedCd = document.getElementById('wed-countdown');
  if (wedCd && typeof getCountdown === 'function') {
    wedCd.textContent = getCountdown();
  }

  // Wedding assign modal — populate guest list when opened
  document.addEventListener('click', (e) => {
    if (e.target.closest('[onclick*="wed-assign-modal"]')) {
      setTimeout(() => {
        const list = document.getElementById('wed-assign-list');
        if (!list || typeof WED === 'undefined') return;
        list.innerHTML = WED.guests.map(g => `
          <div class="assign-guest-row glass" style="margin-bottom:7px">
            <div style="display:flex;align-items:center;gap:10px;flex:1">
              <div style="width:32px;height:32px;border-radius:9px;background:rgba(245,230,200,0.7);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--ink-2)">${g.name.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>
              <span style="font-size:13px;font-weight:600;color:var(--ink)">${g.name}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <label style="font-size:11px;color:var(--ink-4)">Table</label>
              <input type="number" value="${g.table}" min="1" max="20"
                onchange="WED.guests.find(x=>x.id===${g.id}).table=parseInt(this.value)||1"
                style="width:46px;padding:4px 6px;border-radius:7px;border:1px solid rgba(201,169,110,0.28);background:rgba(255,253,248,0.85);font-size:13px;font-weight:700;text-align:center;font-family:var(--f);outline:none">
              <label style="font-size:11px;color:var(--ink-4)">Seat</label>
              <input type="number" value="${g.seat}" min="1" max="20"
                onchange="WED.guests.find(x=>x.id===${g.id}).seat=parseInt(this.value)||1"
                style="width:46px;padding:4px 6px;border-radius:7px;border:1px solid rgba(201,169,110,0.28);background:rgba(255,253,248,0.85);font-size:13px;font-weight:700;text-align:center;font-family:var(--f);outline:none">
            </div>
          </div>`).join('');
      }, 80);
    }
  });

  // Close task dropdowns & assign pickers on outside click
  document.addEventListener('click', (e) => {
    if (STATE.activeTaskDropdown && !e.target.closest('.task-dropdown')) {
      closeAllDropdowns();
    }
    const picker = document.getElementById('assign-picker');
    if (picker && !e.target.closest('#assign-picker') && !e.target.closest('.task-assign-btn')) {
      picker.remove();
    }
  });

  // Escape key closes all modals and dropdowns
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      closeAllDropdowns();
    }
  });
});

/* ═══════════════════════════════════════════════
   NEW FEATURES — v3 additions
   ═══════════════════════════════════════════════ */

/* ── WEDDING ACTIVATION ──────────────────────── */
const WEDDING_STATE = {
  activated: JSON.parse(localStorage.getItem('at_wed_active') || 'false'),
  p1:     localStorage.getItem('at_wed_p1')     || 'Jhoan',
  p2:     localStorage.getItem('at_wed_p2')     || 'JC',
  date:   localStorage.getItem('at_wed_date')   || '2025-12-15',
  venue:  localStorage.getItem('at_wed_venue')  || 'The Ruins, Bacolod',
  budget: parseInt(localStorage.getItem('at_wed_budget') || '350000'),
};

function activateWedding() {
  if (WEDDING_STATE.activated) {
    navTo('wedding');
  } else {
    openModal('activate-wedding-modal');
  }
}

function doActivateWedding() {
  const p1    = document.getElementById('wed-p1')?.value.trim()     || 'Jhoan';
  const p2    = document.getElementById('wed-p2')?.value.trim()     || 'JC';
  const date  = document.getElementById('wed-date-input')?.value    || '2025-12-15';
  const venue = document.getElementById('wed-venue-input')?.value.trim() || 'TBD';
  const budget= parseInt(document.getElementById('wed-budget-input')?.value) || 0;

  WEDDING_STATE.activated = true;
  WEDDING_STATE.p1 = p1; WEDDING_STATE.p2 = p2;
  WEDDING_STATE.date = date; WEDDING_STATE.venue = venue;
  WEDDING_STATE.budget = budget;

  localStorage.setItem('at_wed_active', 'true');
  localStorage.setItem('at_wed_p1', p1);
  localStorage.setItem('at_wed_p2', p2);
  localStorage.setItem('at_wed_date', date);
  localStorage.setItem('at_wed_venue', venue);
  localStorage.setItem('at_wed_budget', budget);

  // Sync to WED object if wedding.js is loaded
  if (typeof WED !== 'undefined') {
    WED.couple.p1 = p1; WED.couple.p2 = p2;
    WED.date = date; WED.venue = venue; WED.budget = budget;
  }

  closeModalById('activate-wedding-modal');
  showWeddingHomeCard();
  showToast('💍 Wedding Planner activated!');
  setTimeout(() => navTo('wedding'), 420);
}

function showWeddingHomeCard() {
  const card = document.getElementById('home-wedding-card');
  if (!card) return;
  card.style.display = 'block';
  // Update content
  const titleEl = document.getElementById('whc-title-text');
  const subEl   = document.getElementById('whc-sub-text');
  if (titleEl) titleEl.textContent = `${WEDDING_STATE.p1} & ${WEDDING_STATE.p2}`;
  if (subEl) {
    const d = new Date(WEDDING_STATE.date);
    const opts = { year:'numeric', month:'long', day:'numeric' };
    subEl.textContent = `${d.toLocaleDateString('en-PH', opts)} · ${WEDDING_STATE.venue}`;
  }
  // Update the quick icon to show activated state
  const icon = document.getElementById('wedding-quick-icon');
  if (icon) icon.style.background = 'linear-gradient(135deg,rgba(252,232,238,0.95),rgba(240,168,192,0.85))';
  // Update badges from WED state
  updateWeddingHomeBadges();
}

function updateWeddingHomeBadges() {
  const badgesEl = document.getElementById('whc-badges');
  if (!badgesEl || typeof WED === 'undefined') return;
  const spent    = WED.expenses.filter(e=>e.paid).reduce((a,e)=>a+e.amount,0);
  const attending= WED.guests.filter(g=>g.rsvp==='attending').length;
  const total    = WED.checklist.reduce((a,p)=>a+p.items.length,0);
  const done     = WED.checklist.reduce((a,p)=>a+p.items.filter(i=>i.done).length,0);
  badgesEl.innerHTML = `
    <span class="whc-badge">💰 ₱${spent.toLocaleString()} committed</span>
    <span class="whc-badge">✅ ${done}/${total} tasks</span>
    <span class="whc-badge">👥 ${attending} guests confirmed</span>`;
}

/* ── BALANCE CARD — GROUP-ONLY ───────────────── */
// Override renderBalanceBreakdown to exclude couple & wedding
const _origRenderBal = window.renderBalanceBreakdown;
window.renderBalanceBreakdown = function() {
  openModal('balance-modal');
  const byGroup  = document.getElementById('bal-by-group');
  const byPerson = document.getElementById('bal-by-person');
  if (!byGroup || !byPerson) return;

  // Only group expenses (no couple, no wedding)
  const groups = [
    { name:'Ano Tara — Mifamilia', emoji:'🎂', owed:473, owe:0,   net:473  },
    { name:'Ano Tara — Berks',     emoji:'🍜', owed:560, owe:0,   net:560  },
    { name:'Palawan Trip',          emoji:'✈️', owed:800, owe:320, net:480  },
  ];

  byGroup.innerHTML = `
    <div style="font-size:11px;color:var(--ink-4);margin-bottom:10px;padding:8px 12px;background:rgba(245,230,200,0.4);border-radius:var(--r-sm);border:1px solid rgba(201,169,110,0.18)">
      Showing group balances only — couple and wedding expenses are tracked separately.
    </div>` +
    groups.map(g => {
      const isPos = g.net >= 0;
      return `<div class="bal-row glass" style="margin-bottom:8px;padding:12px 14px;border-radius:var(--r-md);display:flex;align-items:center;gap:10px">
        <span style="font-size:22px">${g.emoji}</span>
        <div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--ink)">${g.name}</div>
          ${g.owed ? `<div style="font-size:11px;color:var(--green-deep)">↑ Owed ₱${g.owed}</div>` : ''}
          ${g.owe  ? `<div style="font-size:11px;color:var(--pink-deep)">↓ Owes ₱${g.owe}</div>` : ''}
        </div>
        <div style="font-size:16px;font-weight:700;color:${isPos?'var(--green-deep)':'var(--pink-deep)'}">
          ${isPos?'+':'−'}₱${Math.abs(g.net)}
        </div>
      </div>`;
    }).join('');

  const people = [
    { id:'CA', name:'Carlo',      color:'ma-green', owesYou:113, youOwe:0   },
    { id:'MK', name:'Mark',       color:'ma-pink',  owesYou:200, youOwe:0   },
    { id:'AN', name:'Ana',        color:'ma-green', owesYou:473, youOwe:0   },
    { id:'TL', name:'Tita Linda', color:'ma-sand',  owesYou:273, youOwe:0   },
  ];
  byPerson.innerHTML = people.map(p => {
    const isOwed = p.owesYou > 0;
    return `<div class="bal-row glass" style="margin-bottom:8px;padding:12px 14px;border-radius:var(--r-md);display:flex;align-items:center;gap:10px">
      <div class="member-av ${p.color}" style="width:38px;height:38px;border-radius:10px;font-size:12px">${p.id}</div>
      <div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--ink)">${p.name}</div>
        <div style="font-size:11px;color:${isOwed?'var(--green-deep)':'var(--pink-deep)'}">
          ${isOwed ? p.name+' owes you ₱'+p.owesYou : 'You owe ₱'+p.youOwe}
        </div>
      </div>
      <button onclick="showToast('📲 Request sent to ${p.name}!')" style="padding:6px 12px;border-radius:var(--r-xs);background:${isOwed?'rgba(90,171,122,0.15)':'rgba(224,120,152,0.12)'};border:1px solid ${isOwed?'rgba(90,171,122,0.25)':'rgba(224,120,152,0.2)'};color:${isOwed?'var(--green-deep)':'var(--pink-deep)'};font-size:11px;font-weight:700;cursor:pointer">
        ${isOwed ? 'Request' : 'Pay'}
      </button>
    </div>`;
  }).join('');
};

/* ── COUPLE GOALS ────────────────────────────── */
let _selectedGoalEmoji = '🌏';
let _selectedContributor = 'both';

function selectGoalEmoji(btn, emoji) {
  _selectedGoalEmoji = emoji;
  document.querySelectorAll('#add-goal-modal .icon-pick-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function selectContributor(who) {
  _selectedContributor = who;
  ['p1','p2','both'].forEach(k => {
    const b = document.getElementById('contrib-btn-'+k);
    if (b) b.classList.toggle('selected', k === who);
  });
}

function submitNewGoal() {
  const name   = document.getElementById('goal-name')?.value.trim();
  const target = parseFloat(document.getElementById('goal-target')?.value)||0;
  if (!name || !target) { showToast('⚠️ Enter goal name and target'); return; }
  closeModalById('add-goal-modal');
  showToast(`🎯 "${name}" goal created!`);
}

let _addMoneyGoalName = '';
function openAddMoneyModal(goalName) {
  _addMoneyGoalName = goalName;
  const el = document.getElementById('add-money-goal-name');
  if (el) el.textContent = 'Goal: ' + goalName;
  openModal('add-money-modal');
}

function submitAddMoney() {
  const amt = parseFloat(document.getElementById('add-money-amount')?.value)||0;
  if (!amt) { showToast('⚠️ Enter an amount'); return; }
  closeModalById('add-money-modal');
  showToast(`💰 ₱${amt.toLocaleString()} added to ${_addMoneyGoalName}!`);
  document.getElementById('add-money-amount').value = '';
}

let _withdrawGoalName = '';
function openWithdrawModal(goalName) {
  _withdrawGoalName = goalName;
  const el = document.getElementById('withdraw-goal-name');
  if (el) el.textContent = 'Goal: ' + goalName;
  openModal('withdraw-modal');
}

function submitWithdraw() {
  const amt = parseFloat(document.getElementById('withdraw-amount')?.value)||0;
  if (!amt) { showToast('⚠️ Enter an amount'); return; }
  closeModalById('withdraw-modal');
  showToast(`↩ ₱${amt.toLocaleString()} withdrawn from ${_withdrawGoalName}`);
  document.getElementById('withdraw-amount').value = '';
}

function openEditGoalModal(name, target, saved) {
  const n = document.getElementById('edit-goal-name');
  const t = document.getElementById('edit-goal-target');
  const s = document.getElementById('edit-goal-saved');
  if (n) n.value = name;
  if (t) t.value = target;
  if (s) s.value = saved;
  openModal('edit-goal-modal');
}

function submitEditGoal() {
  const name = document.getElementById('edit-goal-name')?.value.trim();
  closeModalById('edit-goal-modal');
  showToast(`✅ "${name}" updated!`);
}

/* ── COUPLE EXPENSE MODAL ────────────────────── */
let _coupleIcon   = '🍽️';
let _couplePayer  = 'jhoan';
let _coupleSplit  = 'equal';

function openCoupleExpenseModal() { openModal('couple-expense-modal'); }

function selectCoupleIcon(btn, icon) {
  _coupleIcon = icon;
  document.querySelectorAll('#couple-expense-modal .icon-pick-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
}

function selectCouplePayer(who) {
  _couplePayer = who;
  ['jhoan','jc'].forEach(k => {
    const b = document.getElementById('cpaid-'+k);
    if (b) b.classList.toggle('selected', k === who);
  });
}

function selectCoupleSplit(split) {
  _coupleSplit = split;
  ['equal','6040','full'].forEach(k => {
    const b = document.getElementById('csplit-'+k);
    if (b) b.classList.toggle('selected', k === split);
  });
}

function submitCoupleExpense() {
  closeModalById('couple-expense-modal');
  showToast(t('expenseAdded'));
}

/* ── COUPLE POLL ─────────────────────────────── */
function submitPoll() {
  const q  = document.getElementById('poll-question')?.value.trim();
  const o1 = document.getElementById('poll-opt1')?.value.trim();
  const o2 = document.getElementById('poll-opt2')?.value.trim();
  if (!q || !o1 || !o2) { showToast('⚠️ Add a question and at least 2 options'); return; }
  closeModalById('add-poll-modal');
  showToast('📊 Poll created!');
  // Reset
  ['poll-question','poll-opt1','poll-opt2','poll-opt3','poll-opt4'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

/* ── INIT EXTENSION ──────────────────────────── */
// Restore wedding activation state on page load
document.addEventListener('DOMContentLoaded', () => {
  if (WEDDING_STATE.activated) showWeddingHomeCard();
  // Add lang key for wedding quick button
  if (window.LANG) {
    window.LANG.en.quickWedding  = 'Wedding';
    window.LANG.fil.quickWedding = 'Kasal';
  }
});
