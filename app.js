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
  selectedPayer: null,
  assignedMember: null,
  editSelectedPayer: null,
  editAssignedMember: null,
  activeTaskDropdown: null,
};

const MEMBERS = [
  { id: 'JH', name: 'Jhoan (You)', color: 'ma-tan' },
  { id: 'CA', name: 'Carlo',       color: 'ma-green' },
  { id: 'MK', name: 'Mark',        color: 'ma-pink' },
  { id: 'TL', name: 'Tita Linda',  color: 'ma-sand' },
  { id: 'AN', name: 'Ana',         color: 'ma-green' },
];

/* ── GROUPS DATA ─────────────────────────────── */
// Persisted groups — each has members, tasks, expenses
let GROUPS = JSON.parse(localStorage.getItem('at_groups') || 'null');
if (!GROUPS) {
  GROUPS = [
    {
      id: 'jowa', type: 'jowa', emoji: '💑',
      name: 'Ano Tara — Jowa',
      members: [
        { id:'JH', name:'Jhoan (You)', color:'ma-tan',  isOwner:true  },
        { id:'SP', name:'Seph',        color:'ma-pink', isOwner:false },
      ],
      tasks:[], expenses:[], budget:0, createdAt: Date.now(),
    },
    {
      id: 'familia', type: 'familia', emoji: '🎂',
      name: 'Ano Tara — Mifamilia',
      members: [
        { id:'JH', name:'Jhoan (You)', color:'ma-tan',   isOwner:true  },
        { id:'CA', name:'Carlo',       color:'ma-green', isOwner:false },
        { id:'MK', name:'Mark',        color:'ma-pink',  isOwner:false },
        { id:'TL', name:'Tita Linda',  color:'ma-sand',  isOwner:false },
        { id:'AN', name:'Ana',         color:'ma-green', isOwner:false },
      ],
      tasks:[], expenses:[], budget:4200, createdAt: Date.now(),
    },
    {
      id: 'berks', type: 'berks', emoji: '🍜',
      name: 'Ano Tara — Berks',
      members: [
        { id:'JH', name:'Jhoan (You)', color:'ma-tan',   isOwner:true  },
        { id:'CA', name:'Carlo',       color:'ma-green', isOwner:false },
        { id:'MK', name:'Mark',        color:'ma-pink',  isOwner:false },
        { id:'AN', name:'Ana',         color:'ma-green', isOwner:false },
      ],
      tasks:[], expenses:[], budget:0, createdAt: Date.now(),
    },
  ];
  localStorage.setItem('at_groups', JSON.stringify(GROUPS));
}

function saveGroups() { localStorage.setItem('at_groups', JSON.stringify(GROUPS)); }

function getActiveGroup() { return GROUPS.find(g => g.id === STATE.currentGroup) || GROUPS[0]; }

function getJowaPartner() {
  const jowa = GROUPS.find(g => g.type === 'jowa');
  if (!jowa) return null;
  return jowa.members.find(m => !m.isOwner) || null;
}

const PIN_TYPES = ['pinMeetup','pinParking','pinEntrance','pinFood','pinPhoto','pinOther'];
const PIN_EMOJIS = { pinMeetup:'📍', pinParking:'🅿️', pinEntrance:'🚪', pinFood:'🍽️', pinPhoto:'📸', pinOther:'📌' };

/* ── MAIN APP SHELL ──────────────────────────── */
const MAIN_TABS = ['home','groups','jowa','wedding','settings'];
let _activeMainTab = 'home';

function switchMainTab(name) {
  if (name === 'wedding' && !WEDDING_STATE.activated) { activateWedding(); return; }
  if (name === 'jowa') setTimeout(animateBars, 150);
  if (name === 'home') setTimeout(initHomeFeed, 100);
  _activeMainTab = name;
  MAIN_TABS.forEach((t,i) => {
    const panel = document.getElementById('tp-'+t);
    const btn   = document.getElementById('main-tab-'+t);
    if (panel) panel.classList.toggle('active', t === name);
    if (btn)   btn.classList.toggle('active',   t === name);
    // dots
    const dot = document.getElementById('mtd-'+i);
    if (dot) dot.classList.toggle('active', t === name);
  });
  // scroll panel to top on switch
  const panel = document.getElementById('tp-'+name);
  // scroll to top on every tab switch
  const tabPanels = document.getElementById('tab-panels');
  if (tabPanels) tabPanels.scrollTop = 0;
  if (panel) panel.scrollTop = 0;
}

function showAppShell() {
  document.getElementById('app-shell').classList.add('active');
  // hide old screens that are now tabs
  ['home','groups','couple','settings'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  // init shell swipe
  initShellSwipe();
}

function initShellSwipe() {
  const panels = document.getElementById('tab-panels');
  if (!panels || panels._swipeBound) return;
  panels._swipeBound = true;
  let startX = 0, startY = 0;
  panels.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, {passive:true});
  panels.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.8) return;
    const tabs = MAIN_TABS.filter(t => t !== 'wedding' || WEDDING_STATE.activated);
    const idx  = tabs.indexOf(_activeMainTab);
    if (dx < 0 && idx < tabs.length-1) switchMainTab(tabs[idx+1]);
    if (dx > 0 && idx > 0)             switchMainTab(tabs[idx-1]);
  }, {passive:true});
}

function updateShellOverview() {
  const u = AUTH?.user;
  if (!u) return;
  const first = u.name.split(' ')[0];
  const greet = document.getElementById('ov-greet');
  if (greet) greet.textContent = 'Good day, '+first+'!';
  const el = document.getElementById('ov-name');
  if (el) el.textContent = "Today's Plan";
  const av = document.getElementById('ov-avatar');
  if (av) av.textContent = first.substring(0,2).toUpperCase();
  // Reminder dot
  checkOverviewBanner();
}

function checkOverviewBanner() {
  const upcoming = (typeof REMINDERS !== 'undefined' ? REMINDERS : [])
    .map(r => ({ r, days: daysUntil(r.date, r.repeat) }))
    .filter(x => x.days >= 0 && x.days <= 14)
    .sort((a,b) => a.days - b.days);
  const dot    = document.getElementById('ov-reminder-dot');
  const banner = document.getElementById('ov-reminder-banner');
  if (!upcoming.length) {
    if (dot)    dot.style.display    = 'none';
    if (banner) banner.style.display = 'none';
    return;
  }
  if (dot)    dot.style.display    = 'block';
  if (banner) banner.style.display = 'block';
  const { r, days } = upcoming[0];
  const emo  = document.getElementById('ov-hrb-emoji');
  const ttl  = document.getElementById('ov-hrb-title');
  const dys  = document.getElementById('ov-hrb-days');
  if (emo) emo.textContent = r.emoji;
  if (ttl) ttl.textContent = r.name;
  if (dys) dys.textContent = formatCountdown(days);
}

window.switchMainTab = switchMainTab;
window.showAppShell  = showAppShell;
window.checkOverviewBanner = checkOverviewBanner;

/* ── AUTH STATE ─────────────────────────────── */
const AUTH = {
  user:    JSON.parse(localStorage.getItem('at_user') || 'null'),
  // user: { id, name, phone, pairCode, jowaId, jowaName }
};

function saveAuth() { localStorage.setItem('at_user', JSON.stringify(AUTH.user)); }

function isLoggedIn() { return !!AUTH.user; }

function getCurrentUser() { return AUTH.user; }

// ── Mock OTP (swap these 3 for Firebase later) ──
function mockSendOTP(phone, cb) {
  // Simulate network delay
  setTimeout(() => cb(null), 800);
}
function mockVerifyOTP(phone, code, cb) {
  if (code === '123456') cb(null);
  else cb('Invalid code. Use 123456 for testing.');
}
function generatePairCode(phone) {
  // deterministic 6-char code from phone
  let hash = 0;
  for (let i = 0; i < phone.length; i++) hash = ((hash << 5) - hash) + phone.charCodeAt(i);
  return Math.abs(hash).toString(36).toUpperCase().padStart(6,'0').substring(0,6);
}

// ── Auth screens ────────────────────────────────
function showSplash() {
  document.getElementById('splash-screen').style.display = 'flex';
}

function hideSplash() {
  const splash = document.getElementById('splash-screen');
  splash.style.opacity = '0';
  splash.style.transition = 'opacity 0.5s';
  setTimeout(() => { splash.style.display = 'none'; }, 500);
}

function showIntro() {
  document.getElementById('intro-screen').style.display = 'flex';
}

function hideIntro() {
  const intro = document.getElementById('intro-screen');
  intro.style.opacity = '0';
  intro.style.transition = 'opacity 0.4s';
  setTimeout(() => { intro.style.display = 'none'; showAuth('signup'); }, 400);
}

function showAuth(mode) {
  document.getElementById('auth-screen').style.display = 'flex';
  switchAuth(mode || 'signup');
}

function hideAuth() {
  document.getElementById('auth-screen').style.display = 'none';
}

function switchAuth(mode) {
  document.getElementById('auth-signup').style.display = mode === 'signup' ? 'block' : 'none';
  document.getElementById('auth-login').style.display  = mode === 'login'  ? 'block' : 'none';
  document.getElementById('auth-otp').style.display    = mode === 'otp'    ? 'block' : 'none';
}

// ── Sign Up flow ────────────────────────────────
let _authPendingPhone = '';
let _authPendingName  = '';
let _authMode         = 'signup'; // 'signup' | 'login'

function submitSignUp() {
  const name  = (document.getElementById('su-name')?.value  || '').trim();
  const phone = (document.getElementById('su-phone')?.value || '').trim();
  if (!name)  { authError('su-error', 'Enter your name'); return; }
  if (!phone || phone.length < 10) { authError('su-error', 'Enter a valid phone number'); return; }
  _authPendingName  = name;
  _authPendingPhone = phone;
  _authMode = 'signup';
  setAuthLoading('su-btn', true);
  mockSendOTP(phone, (err) => {
    setAuthLoading('su-btn', false);
    if (err) { authError('su-error', err); return; }
    document.getElementById('otp-hint').textContent = 'Code sent to ' + phone + ' — use 123456 for testing';
    switchAuth('otp');
  });
}

function submitLogin() {
  const phone = (document.getElementById('li-phone')?.value || '').trim();
  if (!phone || phone.length < 10) { authError('li-error', 'Enter a valid phone number'); return; }
  _authPendingPhone = phone;
  _authMode = 'login';
  setAuthLoading('li-btn', true);
  mockSendOTP(phone, (err) => {
    setAuthLoading('li-btn', false);
    if (err) { authError('li-error', err); return; }
    document.getElementById('otp-hint').textContent = 'Code sent to ' + phone + ' — use 123456 for testing';
    switchAuth('otp');
  });
}

function submitOTP() {
  const code = (document.getElementById('otp-input')?.value || '').trim();
  if (!code) { authError('otp-error', 'Enter the 6-digit code'); return; }
  setAuthLoading('otp-btn', true);
  mockVerifyOTP(_authPendingPhone, code, (err) => {
    setAuthLoading('otp-btn', false);
    if (err) { authError('otp-error', err); return; }
    // Success
    if (_authMode === 'signup') {
      AUTH.user = {
        id:        'u_' + Date.now(),
        name:      _authPendingName,
        phone:     _authPendingPhone,
        pairCode:  generatePairCode(_authPendingPhone),
        jowaId:    null,
        jowaName:  null,
      };
    } else {
      // Login — load existing or create minimal
      const existing = JSON.parse(localStorage.getItem('at_user') || 'null');
      AUTH.user = existing && existing.phone === _authPendingPhone
        ? existing
        : { id:'u_'+Date.now(), name:'User', phone:_authPendingPhone, pairCode:generatePairCode(_authPendingPhone), jowaId:null, jowaName:null };
    }
    saveAuth();
    onAuthSuccess();
  });
}

function resendOTP() {
  document.getElementById('otp-input').value = '';
  authError('otp-error', '');
  showToast('📱 Code resent!');
}

function authError(elId, msg) {
  const el = document.getElementById(elId);
  if (el) el.textContent = msg;
}

function setAuthLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.style.opacity = loading ? '0.6' : '1';
}

function onAuthSuccess() {
  hideAuth();
  // Update greeting name and avatar
  const u = AUTH.user;
  const firstName = u.name.split(' ')[0];
  document.querySelectorAll('.greeting-name').forEach(el => el.textContent = firstName + ' ✨');
  document.querySelectorAll('.avatar-btn').forEach(el => el.textContent = firstName.substring(0,2).toUpperCase());
  document.querySelectorAll('.profile-av').forEach(el => el.textContent = firstName.substring(0,2).toUpperCase());
  document.querySelectorAll('.profile-name-el').forEach(el => el.textContent = u.name);
  document.querySelectorAll('.profile-phone-el').forEach(el => el.textContent = u.phone);
  // Update Jowa group members with real name
  const jowaGroup = GROUPS.find(g => g.type === 'jowa');
  if (jowaGroup) {
    const owner = jowaGroup.members.find(m => m.isOwner);
    if (owner) { owner.name = u.name + ' (You)'; owner.id = firstName.substring(0,2).toUpperCase(); }
  }
  saveGroups();
  renderGroupsList();
  renderReminders();
  checkHomeBanner();
  updateReminderTypeLabels();
  initJowaExpenses();
  renderGroupsList();
  showAppShell();
  setTimeout(initHomeFeed, 200);
  switchMainTab('home');
  updateShellOverview();
  checkOverviewBanner();
  initIdleTimer();
  showToast('👋 Welcome, ' + firstName + '!');
}

function signOut() {
  if (!confirm('Sign out?')) return;
  AUTH.user = null;
  localStorage.removeItem('at_user');
  location.reload();
}

// ── Jowa Pairing ────────────────────────────────
function openPairModal() {
  const modal = document.getElementById('pair-modal');
  if (!modal) return;
  const u = AUTH.user;
  const codeEl = document.getElementById('my-pair-code');
  if (codeEl && u) codeEl.textContent = u.pairCode || '------';
  if (u?.jowaName) {
    const statusEl = document.getElementById('pair-status');
    if (statusEl) statusEl.innerHTML =
      '<div style="text-align:center;padding:12px;background:rgba(90,171,122,0.1);border-radius:var(--r-md);border:1px solid rgba(90,171,122,0.2);font-size:13px;font-weight:700;color:var(--green-deep)">💑 Paired with '+u.jowaName+'</div>'
      + '<button onclick="unpairJowa()" style="width:100%;margin-top:8px;padding:10px;border-radius:var(--r-md);border:1px solid rgba(224,120,152,0.25);background:rgba(252,232,238,0.5);font-size:12.5px;font-weight:700;color:var(--pink-deep);cursor:pointer">Unpair</button>';
  }
  modal.classList.add('open');
}

function submitPair() {
  const code = (document.getElementById('partner-code')?.value || '').trim().toUpperCase();
  if (!code || code.length < 6) { showToast('⚠️ Enter your partner\'s 6-character code'); return; }
  if (!AUTH.user) { showToast('⚠️ Sign in first'); return; }
  if (code === AUTH.user.pairCode) { showToast('⚠️ That\'s your own code!'); return; }
  // Mock pairing — in Firebase this would look up the code and get the partner's name
  const partnerName = 'Your Jowa'; // Firebase will resolve this from the code
  AUTH.user.jowaId   = 'paired_' + code;
  AUTH.user.jowaName = partnerName;
  saveAuth();
  // Update Jowa group
  const jowaGroup = GROUPS.find(g => g.type === 'jowa');
  if (jowaGroup) {
    const partner = jowaGroup.members.find(m => !m.isOwner);
    if (partner) { partner.name = partnerName; }
    saveGroups();
  }
  closeModalById('pair-modal');
  showToast('💑 Paired! Welcome to Ano Tara together.');
}

function unpairJowa() {
  if (!confirm('Unpair from your jowa? This will remove the link.')) return;
  AUTH.user.jowaId   = null;
  AUTH.user.jowaName = null;
  saveAuth();
  closeModalById('pair-modal');
  showToast('💔 Unpaired');
}

// ── App boot ────────────────────────────────────
function bootApp() {
  const hasSeenIntro = localStorage.getItem('at_seen_intro');

  // Always show splash on load
  showLoadingSplash();

  if (isLoggedIn()) {
    // Check if PIN is set — show lock if so
    if (getPIN()) {
      setTimeout(() => showPinLock('lock'), 1800);
      // After PIN unlock, show app
      const origHide = window.hidePinLock;
      window.hidePinLock = function() {
        origHide();
        window.hidePinLock = origHide; // restore
        onAuthSuccess();
        initIdleTimer();
      };
    } else {
      setTimeout(() => { onAuthSuccess(); initIdleTimer(); }, 1900);
    }
    return;
  }

  // Not logged in — show splash then auth
  setTimeout(() => {
    if (!hasSeenIntro) {
      showIntro();
    } else {
      showAuth('signup');
    }
  }, 1900);
}

/* ── INTRO SWIPE ─────────────────────────────── */
let _introIdx = 0;
const INTRO_TOTAL = 4;

function introNext() {
  if (_introIdx < INTRO_TOTAL - 1) {
    // Slide current out left, next in from right
    const cur  = document.getElementById('icard-' + _introIdx);
    const next = document.getElementById('icard-' + (_introIdx + 1));
    if (cur)  cur.style.transform  = 'translateX(-100%)';
    if (next) next.style.transform = 'translateX(0)';
    _introIdx++;
    // Update dots
    for (let i = 0; i < INTRO_TOTAL; i++) {
      const dot = document.getElementById('idot-' + i);
      if (dot) dot.classList.toggle('active', i === _introIdx);
    }
    // Last card — change button text
    const btn = document.getElementById('intro-next-btn');
    if (btn && _introIdx === INTRO_TOTAL - 1) {
      btn.textContent = 'Get Started 🎉';
      btn.onclick = () => {
        localStorage.setItem('at_seen_intro', '1');
        window.hideIntro();
      };
    }
  } else {
    localStorage.setItem('at_seen_intro', '1');
    window.hideIntro();
  }
}
window.introNext = introNext;

window.showAuth    = showAuth;
window.switchAuth  = switchAuth;
window.submitSignUp= submitSignUp;
window.submitLogin = submitLogin;
window.submitOTP   = submitOTP;
window.resendOTP   = resendOTP;
window.hideIntro   = hideIntro;
window.openPairModal = openPairModal;
window.submitPair  = submitPair;
window.unpairJowa  = unpairJowa;
window.signOut     = signOut;

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
    happening:'Happening Now', seeAll:'See all', groupsTitle:'Your Groups',
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
    pairJowa:'Pair with Jowa', pairCode:'Your Code', enterCode:"Partner's Code", pairBtn:'Pair Now →',
    codeCopied:'Copied!',
    notifications:'Notifications', monthlyReports:'Monthly Reports', calendarSync:'Calendar Sync',
    aiSmartLists:'AI Smart Lists', rateApp:'Rate the App', sendFeedback:'Send Feedback',
    navHome:'Home', navGroups:'Groups', navCouple:'Jowa', navSettings:'Settings',
    activePoll:'Active Poll', newPoll:'+ New',
  },
  fil: {
    appSub:'Mag-plano nang magkasama',
    greetSub:'Kumusta!', netBalance:'Net Balance',
    owedToYou:'Utang sa iyo', youOwe:'Utang mo',
    quickGroups:'Groups', quickExpense:'Gastos', quickCouple:'Jowa', quickWedding:'Kasal',
    yourGroups:'Mga Group', newBtn:'+ Bago',
    jowaLabel:'Ano Tara — Jowa', familiaLabel:'Ano Tara — Mifamilia', berksLabel:'Ano Tara — Berks',
    newGroupLabel:'Bagong Group', newGroupSub:'Mag-plan nang magkasama',
    happening:'Nangyayari Ngayon', seeAll:'Tingnan lahat', groupsTitle:'Mga Group',
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
    activePoll:'Aktibong Poll', newPoll:'+ Bago',
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
const ALL_SCREENS = ['home','groups','group-detail','couple','receipt','settings','wedding','daily-tasks','mood-board','suppliers','errand-board','saan-tayo','supplier-directory'];
const NAV_IDS     = ['home','groups','couple','settings'];
const FAB_HIDDEN  = ['group-detail','receipt','settings','wedding','daily-tasks','mood-board','suppliers','errand-board','saan-tayo','supplier-directory'];

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
    const dest = STATE.navHistory[STATE.navHistory.length-1];
    navTo(dest);
    if (dest === 'groups') renderGroupsList();
  }
}

/* ── GROUP OPEN ──────────────────────────────── */
function openGroup(id) {
  const group = GROUPS.find(g => g.id === id) || GROUPS[0];
  STATE.currentGroup = group.id;

  const hero = document.getElementById('group-hero-el');
  const heroName  = document.getElementById('group-hero-name');
  const heroSub   = document.getElementById('group-hero-sub');
  const heroEmoji = document.getElementById('group-hero-emoji');

  const typeClass = { jowa:'gh-jowa', familia:'gh-familia', berks:'gh-berks', trip:'gh-berks' };
  if (hero) hero.className = 'group-hero ' + (typeClass[group.type] || 'gh-berks');
  if (heroEmoji) heroEmoji.textContent = group.emoji;
  if (heroName)  heroName.textContent  = group.name;
  if (heroSub)   heroSub.textContent   = group.members.map(m=>m.name.split(' ')[0]).join(', ') + ' · ' + group.members.length + ' members';

  // Render members tab
  renderMembersTab(group);

  // Render Saan Tayo suggestions based on group type
  renderGroupSuggestions(group);

  renderSaanTopCard(group);
  renderTasksPanel(group);
  renderExpensesPanel(group);
  renderSettlePanel(group);
  updateGroupHeroStats(group);
  navTo('group-detail');
  switchTab('tasks');
  setTimeout(initTabSwipe, 100);
}

function renderMembersTab(group) {
  const el = document.getElementById('panel-members');
  if (!el) return;
  const rows = group.members.map(m => {
    const removeBtn = m.isOwner ? '' : `<button onclick="window.removeMember('${m.id}')" style="padding:5px 10px;border-radius:8px;border:none;background:rgba(224,120,152,0.12);font-size:11px;font-weight:700;color:var(--pink-deep);cursor:pointer">Remove</button>`;
    const ownerTag  = m.isOwner ? '<div style="font-size:10.5px;font-weight:700;color:var(--tan-dark);margin-top:2px">Owner</div>' : '';
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(201,169,110,0.1)">
      <div class="member-av ${m.color}" style="width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;border:2px solid rgba(255,255,255,0.6)">${m.id.substring(0,2)}</div>
      <div style="flex:1"><div style="font-size:14px;font-weight:700;color:var(--ink)">${m.name}</div>${ownerTag}</div>
      ${removeBtn}
    </div>`;
  }).join('');
  el.innerHTML = `<div style="padding:16px 0">
    <div style="font-size:11px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:12px">Members (${group.members.length})</div>
    ${rows}
    <div style="margin-top:14px">
      <button onclick="openModal('add-member-modal')" style="width:100%;padding:11px;border-radius:var(--r-md);background:rgba(245,230,200,0.5);border:1.5px dashed rgba(201,169,110,0.35);font-size:13px;font-weight:700;color:var(--tan-dark);cursor:pointer">+ Add Member</button>
    </div>
  </div>`;
}

function removeMember(memberId) {
  const group = getActiveGroup();
  if (!group) return;
  const m = group.members.find(m=>m.id===memberId);
  if (!m || m.isOwner) { showToast('⚠️ Cannot remove the owner'); return; }
  if (!confirm('Remove '+m.name+' from '+group.name+'?')) return;
  group.members = group.members.filter(m=>m.id!==memberId);
  saveGroups();
  renderMembersTab(group);
  showToast('🗑 '+m.name+' removed');
}

function addMember() {
  const nameEl = document.getElementById('new-member-name');
  const name   = (nameEl?.value||'').trim();
  if (!name) { showToast('⚠️ Enter a name'); return; }
  const group  = getActiveGroup();
  if (!group)  return;
  const colors = ['ma-green','ma-pink','ma-sand','ma-tan'];
  const newId  = name.substring(0,2).toUpperCase() + group.members.length;
  group.members.push({ id:newId, name, color:colors[group.members.length % colors.length], isOwner:false });
  saveGroups();
  if (nameEl) nameEl.value = '';
  closeModalById('add-member-modal');
  renderMembersTab(group);
  showToast('👤 '+name+' added!');
}
window.removeMember = removeMember;
window.addMember    = addMember;

/* ── PLACES / SUGGESTIONS ───────────────────── */
const PLACES = {
  // Jowa — romantic / date spots
  jowa: [
    { id:'j1', name:'The Peninsula Manila', cat:'Hotel', emoji:'🏨', loc:'Makati', price:'₱₱₱₱', vibe:'Romantic', desc:'Iconic luxury hotel — perfect for staycation & anniversaries.', link:'https://manila.peninsula.com', img:'🏨' },
    { id:'j2', name:'Nobu Restaurant Manila', cat:'Dinner', emoji:'🍣', loc:'BGC, Taguig', price:'₱₱₱₱', vibe:'Fine Dining', desc:'World-renowned Japanese fusion. Book a private table.', link:'https://noburestaurants.com', img:'🍣' },
    { id:'j3', name:'The Ruins, Talisay', cat:'Date Spot', emoji:'🏛️', loc:'Bacolod', price:'₱₱', vibe:'Romantic', desc:'Stunning ruins at sunset — unforgettable backdrop for couples.', link:'https://theruins.com.ph', img:'🏛️' },
    { id:'j4', name:'Nurture Wellness Village', cat:'Spa', emoji:'🌿', loc:'Tagaytay', price:'₱₱₱', vibe:'Relaxing', desc:'Couples spa and wellness retreat. Stress-free weekend.', link:'https://nurture.com.ph', img:'🌿' },
    { id:'j5', name:'Balesin Island Club', cat:'Resort', emoji:'🏖️', loc:'Quezon', price:'₱₱₱₱', vibe:'Luxury', desc:'Private island resort — multiple themed villages.', link:'https://balesin.com', img:'🏖️' },
    { id:'j6', name:'Il Ponticello', cat:'Dinner', emoji:'🍝', loc:'Kapitolyo, Pasig', price:'₱₱₱', vibe:'Cozy', desc:'Italian trattoria with romantic garden seating.', link:'https://ilponticello.com.ph', img:'🍝' },
    { id:'j7', name:'Canvas Hotel Manila', cat:'Hotel', emoji:'🎨', loc:'BGC, Taguig', price:'₱₱₱', vibe:'Artsy', desc:'Boutique hotel with stunning BGC skyline views.', link:'https://canvashotel.ph', img:'🎨' },
    { id:'j8', name:'Wildflour Café', cat:'Café', emoji:'☕', loc:'BGC / Salcedo', price:'₱₱', vibe:'Chill', desc:'Artisanal café — perfect lazy Sunday morning date.', link:'https://wildflour.com.ph', img:'☕' },
  ],
  // Berks + Familia — group hangout spots
  group: [
    { id:'g1', name:'Palace Pool Club', cat:'Club', emoji:'🎉', loc:'BGC, Taguig', price:'₱₱₱', vibe:'Party', desc:'Open-air pool party venue. Book a cabana for the barkada.', link:'https://palace.com.ph', img:'🎉' },
    { id:'g2', name:'SNR Members Shopping', cat:'Recreation', emoji:'🛒', loc:'Multiple', price:'₱₱', vibe:'Practical', desc:'Wholesale heaven. Perfect pre-party grocery run.', link:'https://snr.com.ph', img:'🛒' },
    { id:'g3', name:'Escape Room Philippines', cat:'Activity', emoji:'🔐', loc:'Makati / BGC', price:'₱₱', vibe:'Adventure', desc:'Multiple themed rooms. Perfect barkada challenge.', link:'https://escaperoomph.com', img:'🔐' },
    { id:'g4', name:'Crimson Hotel Filinvest', cat:'Hotel', emoji:'🏩', loc:'Alabang', price:'₱₱₱', vibe:'Staycation', desc:'Day-use pool packages. Great for group staycations.', link:'https://crimsonhotel.com', img:'🏩' },
    { id:'g5', name:'El Nido Resorts', cat:'Beach', emoji:'🌊', loc:'Palawan', price:'₱₱₱₱', vibe:'Beach', desc:'World-class islands. Best for annual barkada trip.', link:'https://elnidoresorts.com', img:'🌊' },
    { id:'g6', name:'The Grid Food Market', cat:'Dinner', emoji:'🍜', loc:'Quezon City', price:'₱₱', vibe:'Casual', desc:'Hip food hall — everyone eats what they want.', link:'https://thegrid.com.ph', img:'🍜' },
    { id:'g7', name:'Sandbox at Alviera', cat:'Recreation', emoji:'🏄', loc:'Pampanga', price:'₱₱', vibe:'Adventure', desc:'Zipline, ATV, outdoor activities. Great for big groups.', link:'https://sandboxatAlviera.com', img:'🏄' },
    { id:'g8', name:'Okada Manila', cat:'Entertainment', emoji:'🎰', loc:'Parañaque', price:'₱₱₱₱', vibe:'Night Out', desc:'Hotel, casino, bars, restaurants — all in one night.', link:'https://okadamanila.com', img:'🎰' },
  ],
  // Wedding — venues + honeymoon
  wedding: [
    { id:'w1', name:'Fernwood Gardens', cat:'Wedding Venue', emoji:'🌸', loc:'Quezon City', price:'₱₱₱', vibe:'Garden', desc:'Lush garden venue — popular for outdoor receptions.', link:'https://fernwoodgardens.com', img:'🌸' },
    { id:'w2', name:'Shangri-La The Fort', cat:'Hotel Venue', emoji:'✨', loc:'BGC, Taguig', price:'₱₱₱₱', vibe:'Luxury', desc:'Grand ballrooms with full hotel services for guests.', link:'https://shangri-la.com', img:'✨' },
    { id:'w3', name:'Villa Escudero', cat:'Wedding Venue', emoji:'🌴', loc:'San Pablo, Laguna', price:'₱₱₱', vibe:'Nature', desc:'Picturesque waterfalls resort. Unique and memorable.', link:'https://villaescudero.com.ph', img:'🌴' },
    { id:'w4', name:'Crimson Resort Mactan', cat:'Honeymoon', emoji:'🌅', loc:'Cebu', price:'₱₱₱₱', vibe:'Romantic', desc:'Beachfront luxury resort. Perfect honeymoon escape.', link:'https://crimsonhotel.com/mactan', img:'🌅' },
    { id:'w5', name:'Amanpulo', cat:'Honeymoon', emoji:'🏝️', loc:'Palawan', price:'₱₱₱₱', vibe:'Ultra Luxury', desc:'Private island resort. Most exclusive in the Philippines.', link:'https://aman.com/amanpulo', img:'🏝️' },
    { id:'w6', name:'Sofitel Philippine Plaza', cat:'Hotel Venue', emoji:'🏛️', loc:'Pasay, Manila', price:'₱₱₱₱', vibe:'Classic', desc:'Bay-view ballrooms. Elegant and timeless setting.', link:'https://sofitel.accor.com', img:'🏛️' },
    { id:'w7', name:'The Farm at San Benito', cat:'Honeymoon', emoji:'🌿', loc:'Batangas', price:'₱₱₱', vibe:'Wellness', desc:'Holistic wellness resort. Detox and reconnect together.', link:'https://thefarm.com.ph', img:'🌿' },
    { id:'w8', name:'Acuaverde Beach Resort', cat:'Honeymoon', emoji:'🤿', loc:'Batangas', price:'₱₱', vibe:'Chill Beach', desc:'Affordable dive resort with beautiful corals.', link:'https://acuaverde.com', img:'🤿' },
  ],
};

function renderGroupSuggestions(group) {
  const el = document.getElementById('panel-saan-tayo');
  if (!el) return;

  const isJowa   = group.type === 'jowa';
  const isWed    = group.type === 'wedding';
  const places   = isJowa ? PLACES.jowa : PLACES.group;
  const title    = isJowa ? '💕 Date Ideas & Places' : '🗺 Saan Tayo? Suggestions';

  el.innerHTML = '<div style="padding:16px 0">'
    + '<div style="font-size:11px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:14px">'+title+'</div>'
    + places.map(p => renderPlaceCard(p)).join('')
    + '<div style="text-align:center;padding:12px;font-size:11px;color:var(--ink-4)">More places coming soon 🗺</div>'
    + '</div>';
}

function renderPlaceCard(p) {
  return `<div class="glass" style="border-radius:var(--r-md);margin-bottom:10px;overflow:hidden">
    <div style="display:flex;align-items:flex-start;gap:12px;padding:14px">
      <div style="width:52px;height:52px;border-radius:14px;background:rgba(245,230,200,0.5);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;border:1px solid rgba(201,169,110,0.15)">${p.emoji}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:4px">${p.name}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:5px">
          <span style="font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:5px;background:rgba(245,230,200,0.7);color:var(--tan-dark);border:1px solid rgba(201,169,110,0.2)">${p.cat}</span>
          <span style="font-size:10.5px;padding:2px 7px;border-radius:5px;background:rgba(255,253,248,0.8);color:var(--ink-4);border:1px solid rgba(201,169,110,0.1)">📍 ${p.loc}</span>
          <span style="font-size:10.5px;padding:2px 7px;border-radius:5px;background:rgba(255,253,248,0.8);color:var(--ink-4);border:1px solid rgba(201,169,110,0.1)">${p.price}</span>
        </div>
        <div style="font-size:12px;color:var(--ink-3);line-height:1.5">${p.desc}</div>
      </div>
    </div>
    <div style="display:flex;border-top:1px solid rgba(201,169,110,0.1)">
      <button onclick="window.savePlaceForGroup('${p.id}')" style="flex:1;padding:10px;border:none;background:rgba(245,230,200,0.3);font-size:12.5px;font-weight:700;color:var(--tan-dark);cursor:pointer">❤️ Save</button>
      <a href="${p.link}" target="_blank" style="flex:2;padding:10px;background:rgba(232,245,237,0.4);font-size:12.5px;font-weight:700;color:var(--green-deep);text-decoration:none;text-align:center;display:flex;align-items:center;justify-content:center">Check it out →</a>
    </div>
  </div>`;
}

function savePlaceForGroup(placeId) {
  const group = getActiveGroup();
  if (!group) return;
  if (!group.savedPlaces) group.savedPlaces = [];
  if (group.savedPlaces.includes(placeId)) { showToast('Already saved!'); return; }
  group.savedPlaces.push(placeId);
  saveGroups();
  showToast('❤️ Place saved!');
}
window.savePlaceForGroup = savePlaceForGroup;
window.renderGroupSuggestions = renderGroupSuggestions;

/* ── TABS ────────────────────────────────────── */
function switchTab(name) {
  TAB_ORDER.forEach(t => {
    const panel = document.getElementById('panel-'+t);
    const tab   = document.getElementById('tab-'+t);
    if (panel) panel.style.display = t === name ? 'block' : 'none';
    if (tab)   tab.classList.toggle('active', t === name);
  });
  if (name === 'map')     initMap();
  if (name === 'members') { const g = getActiveGroup(); renderMembersTab(g); }
  // Update swipe position indicator
  const idx = TAB_ORDER.indexOf(name);
  document.querySelectorAll('.tab-swipe-dot').forEach((d,i) => d.classList.toggle('active', i===idx));
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
  // Persist to GROUPS
  const taskId = taskEl.dataset.taskId;
  if (taskId) {
    const group = getActiveGroup();
    if (group) {
      const task = group.tasks.find(t => t.id === taskId);
      if (task) { task.status = status; saveGroups(); updateGroupHeroStats(group); }
    }
  }
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
      if (assignEl) assignEl.textContent = m.name.split(' ')[0];
      // Persist assignment
      const taskId = taskEl.dataset.taskId;
      if (taskId) {
        const group = getActiveGroup();
        if (group) {
          const task = group.tasks.find(t => t.id === taskId);
          if (task) { task.assigneeId = m.id; saveGroups(); }
        }
      }
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
    { id:'SP', name:'Seph (Jowa)',  color:'ma-tan',   owesYou:0,    youOwe:240 },
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
  STATE.selectedPayer = id;
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
  if (id === 'add-expense-modal') {
    renderIconPicker();
    const g = getActiveGroup();
    if (g) renderExpensePaymentInputs(g, 'expense-member-payments', 'expense-total-preview');
  }
  if (id === 'add-task-modal') {
    const g = getActiveGroup();
    if (g) renderTaskMemberPickerFor(g);
    STATE.assignedMember = null;
  }
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
  const nameEl  = document.getElementById('ng-name');
  const name     = (nameEl?.value || '').trim();
  if (!name) { showToast('⚠️ Enter a group name'); return; }

  // Type from selected type-btn
  const typeBtn  = document.querySelector('#new-group-modal .type-btn.selected');
  const type     = typeBtn?.dataset.type || 'berks';
  const emojiMap = { jowa:'💑', familia:'🏠', berks:'🍜', trip:'✈️' };
  const emoji    = emojiMap[type] || '👥';

  // Budget
  const budgetEl = document.getElementById('ng-budget');
  const budget   = parseFloat(budgetEl?.value) || 0;

  // Members input — comma-separated names
  const membersEl = document.getElementById('ng-members');
  const extraNames = (membersEl?.value || '').split(',').map(n=>n.trim()).filter(Boolean);

  const newId  = 'g_' + Date.now();
  const colors = ['ma-green','ma-pink','ma-sand','ma-tan'];
  const members = [
    { id:'JH', name:'Jhoan (You)', color:'ma-tan', isOwner:true },
    ...extraNames.map((nm,i) => ({
      id: nm.substring(0,2).toUpperCase()+(i),
      name: nm, color: colors[i % colors.length], isOwner:false
    })),
  ];

  const newGroup = { id:newId, type, emoji, name, members, tasks:[], expenses:[], budget, createdAt:Date.now() };
  GROUPS.push(newGroup);
  saveGroups();

  closeModalById('new-group-modal');
  if (nameEl)   nameEl.value   = '';
  if (budgetEl) budgetEl.value = '';
  if (membersEl) membersEl.value = '';

  renderGroupsList();
  showToast('🎉 '+name+' created!');
  setTimeout(() => { STATE.currentGroup = newId; openGroup(newId); }, 380);
}

function renderGroupsList() {
  const bgMap = { jowa:'glass-pink', familia:'glass-cream', berks:'glass-green', trip:'glass' };
  const gcMap = { jowa:'gc-jowa', familia:'gc-familia', berks:'gc-berks', trip:'gc-berks' };
  const icMap = { jowa:'rgba(252,232,238,0.80)', familia:'rgba(245,230,200,0.80)', berks:'rgba(208,236,218,0.80)', trip:'rgba(232,245,237,0.80)' };
  const brMap = { jowa:'rgba(224,120,152,0.22)', familia:'rgba(201,169,110,0.25)', berks:'rgba(90,171,122,0.25)', trip:'rgba(90,171,122,0.25)' };

  // Home scroll cards
  const scroll = document.getElementById('groups-scroll-el');
  if (scroll) {
    scroll.innerHTML = GROUPS.map(g => `
      <div class="group-card ${gcMap[g.type]||'gc-berks'}" onclick="openGroup('${g.id}')">
        <div class="group-emoji">${g.emoji}</div>
        <div class="group-name">${g.name}</div>
        <div class="group-meta">${g.members.length} members</div>
        <div class="group-balance" style="color:var(--ink-4);font-size:11px">${g.budget?'₱'+g.budget.toLocaleString()+' budget':'No budget'}</div>
      </div>`).join('')
    + `<div class="group-card gc-new" onclick="openModal('new-group-modal')">
        <div class="group-emoji" style="opacity:.4">+</div>
        <div class="group-name" style="color:var(--ink-3)">New Group</div>
        <div class="group-meta" style="color:var(--ink-4)">Start planning together</div>
      </div>`;
  }

  // Full groups list — render into both home screen list and groups tab panel
  const listHtml = GROUPS.map(g => {
    const budgetBar = g.budget ? `<div style="margin-top:6px;height:4px;border-radius:2px;background:rgba(44,31,14,0.07);overflow:hidden"><div style="width:30%;height:100%;background:linear-gradient(90deg,var(--tan),var(--tan-dark));border-radius:2px"></div></div>` : '';
    return `<div class="activity-item ${bgMap[g.type]||'glass'}" style="border-radius:var(--r-lg);margin-bottom:11px;cursor:pointer" onclick="openGroup('${g.id}')">
      <div style="width:52px;height:52px;border-radius:var(--r-md);background:${icMap[g.type]||'rgba(232,245,237,0.80)'};border:1px solid ${brMap[g.type]||'rgba(90,171,122,0.25)'};display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">${g.emoji}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:15px;font-weight:700;color:var(--ink)">${g.name}</div>
        <div style="font-size:11.5px;color:var(--ink-3);margin-top:2px">${g.members.map(m=>m.name.split(' ')[0]).join(', ')}</div>
        ${budgetBar}
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:11px;font-weight:700;color:var(--ink-4)">${g.members.length} members</div>
        ${g.budget?'<div style="font-size:10.5px;color:var(--ink-4)">\u20b1'+g.budget.toLocaleString()+'</div>':''}
      </div>
    </div>`;
  }).join('')
  + `<div class="activity-item glass" style="border-radius:var(--r-lg);cursor:pointer;opacity:0.7" onclick="openModal('new-group-modal')">
      <div style="width:52px;height:52px;border-radius:var(--r-md);background:rgba(245,230,200,0.5);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">➕</div>
      <div style="flex:1"><div style="font-size:15px;font-weight:700;color:var(--ink)">New Group</div><div style="font-size:11.5px;color:var(--ink-3);margin-top:2px">Start planning together</div></div>
    </div>`;
  ['groups-list-el','groups-tab-list-el'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = listHtml;
  });
}

function addExpense() {
  const group = getActiveGroup();
  if (!group) return;
  const descEl = document.getElementById('expense-desc-input');
  const noteEl = document.getElementById('expense-note-input');
  const dateEl = document.getElementById('expense-date-input');
  const name   = (descEl?.value || '').trim();
  if (!name) { showToast('⚠️ Enter a description'); return; }
  const payInputs     = document.querySelectorAll('#expense-member-payments .expense-pay-input');
  const memberPayments = Array.from(payInputs).map(inp => ({ memberId: inp.dataset.memberId, amount: parseFloat(inp.value) || 0 }));
  const total         = memberPayments.reduce((s, p) => s + p.amount, 0);
  if (!total) { showToast('⚠️ Enter at least one payment amount'); return; }
  const expense = {
    id: 'exp_' + Date.now(),
    icon: STATE.expenseIconSelected || '🍽️',
    name, memberPayments, total,
    note: noteEl?.value.trim() || '',
    date: dateEl?.value || '',
    createdAt: Date.now(),
  };
  group.expenses.push(expense);
  saveGroups();
  renderExpensesPanel(group);
  renderSettlePanel(group);
  updateGroupHeroStats(group);
  if (descEl) descEl.value = '';
  if (noteEl) noteEl.value = '';
  if (dateEl) dateEl.value = '';
  payInputs.forEach(i => i.value = '');
  const prev = document.getElementById('expense-total-preview');
  if (prev) prev.style.display = 'none';
  closeModalById('add-expense-modal');
  showToast(t('expenseAdded'));
}

function addTask() {
  const group = getActiveGroup();
  if (!group) return;
  const nameEl = document.getElementById('task-name-input');
  const dueEl  = document.getElementById('task-due-input');
  const name   = (nameEl?.value || '').trim();
  if (!name) { showToast('⚠️ Enter a task name'); return; }
  const task = {
    id: 'task_' + Date.now(),
    name,
    assigneeId: STATE.assignedMember || (group.members[0]?.id),
    dueDate: dueEl?.value || '',
    status: 'pending',
    createdAt: Date.now(),
  };
  group.tasks.push(task);
  saveGroups();
  renderTasksPanel(group);
  updateGroupHeroStats(group);
  if (nameEl) nameEl.value = '';
  if (dueEl)  dueEl.value  = '';
  closeModalById('add-task-modal');
  showToast(t('taskAdded'));
}

function renderTasksPanel(group) {
  const container = document.getElementById('tasks-list');
  if (!container) return;
  if (!group.tasks || group.tasks.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:28px;color:var(--ink-4);font-size:13px;font-weight:600">No tasks yet — tap + Add to create one</div>';
    return;
  }
  const statusClass = { done:'done', progress:'progress', pending:'' };
  const badgeClass  = { done:'s-done', progress:'s-progress', pending:'s-pending' };
  const badgeText   = { done:'Done', progress:'In Progress', pending:'Pending' };
  container.innerHTML = group.tasks.map(task => {
    const member  = group.members.find(m => m.id === task.assigneeId);
    const mName   = member ? member.name.split(' ')[0] : 'Unassigned';
    const isDone  = task.status === 'done';
    const due     = task.dueDate ? ' · ' + task.dueDate : '';
    return `<div class="task-item glass" onclick="showTaskDropdown(this,event)" data-task-id="${task.id}">
      <div class="task-check ${statusClass[task.status] || ''}"></div>
      <div class="task-body">
        <div class="task-name ${isDone ? 'done-text' : ''}">${task.name}</div>
        <div class="task-assignee">${mName}${due}</div>
      </div>
      <button class="task-edit-btn" onclick="event.stopPropagation();openEditTask('${task.id}')">✏️</button>
      <button class="task-assign-btn" onclick="event.stopPropagation();openAssignPicker(this.closest('.task-item'))">👤</button>
      <span class="task-status ${badgeClass[task.status] || 's-pending'}">${badgeText[task.status] || 'Pending'}</span>
    </div>`;
  }).join('');
}

function renderExpensesPanel(group) {
  const container = document.getElementById('expenses-list');
  if (!container) return;
  if (!group.expenses || group.expenses.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:28px;color:var(--ink-4);font-size:13px;font-weight:600">No expenses yet — tap + Add to log one</div>';
    return;
  }
  container.innerHTML = group.expenses.map(exp => {
    let total, payerLine;
    if (exp.memberPayments) {
      total = exp.memberPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      const payers = exp.memberPayments.filter(p => p.amount > 0).map(p => {
        const m = group.members.find(m => m.id === p.memberId);
        return m ? `${m.name.split(' ')[0]} ₱${parseFloat(p.amount).toLocaleString()}` : '';
      }).filter(Boolean);
      payerLine = payers.length ? payers.join(', ') : '—';
    } else {
      total = parseFloat(exp.amount) || 0;
      const payer = group.members.find(m => m.id === exp.payerId);
      payerLine = `Paid by ${payer ? payer.name.split(' ')[0] : '—'}`;
    }
    const share = group.members.length > 0 ? (total / group.members.length).toFixed(2) : 0;
    return `<div class="expense-item glass" onclick="openExpenseActions('${exp.id}')">
      <div class="expense-icon" style="background:rgba(245,230,200,0.7);border:1px solid rgba(201,169,110,0.22)">${exp.icon}</div>
      <div class="expense-body">
        <div class="expense-name">${exp.name}</div>
        <div class="expense-detail">${payerLine}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="expense-amount">₱${total.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
        <div class="expense-split">₱${share} each</div>
      </div>
    </div>`;
  }).join('');
}

function openExpenseActions(expId) {
  const group = getActiveGroup();
  if (!group) return;
  const exp = group.expenses.find(e => e.id === expId);
  if (!exp) return;
  document.getElementById('expense-actions-id').value = expId;
  const title = document.getElementById('expense-actions-title');
  if (title) title.textContent = exp.icon + ' ' + exp.name + ' — ₱' + parseFloat(exp.amount).toLocaleString();
  openModal('expense-actions-modal');
}

function renderExpensePaymentInputs(group, containerId, totalPreviewId) {
  const container = document.getElementById(containerId);
  if (!container || !group) return;
  container.innerHTML = group.members.map(m => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.05)">
      <div class="member-av ${m.color}" style="width:32px;height:32px;border-radius:9px;font-size:11px;flex-shrink:0">${m.id}</div>
      <span style="flex:1;font-size:13px;font-weight:600;color:var(--ink)">${m.name.split(' ')[0]}</span>
      <div style="display:flex;align-items:center;background:rgba(255,255,255,0.7);border:1.5px solid rgba(201,169,110,0.3);border-radius:var(--r-sm);overflow:hidden">
        <span style="padding:8px 6px 8px 10px;font-size:13px;font-weight:700;color:var(--ink-3)">₱</span>
        <input type="number" class="expense-pay-input" data-member-id="${m.id}" placeholder="0" min="0"
          oninput="updateExpenseTotalPreview('${containerId}','${totalPreviewId}')"
          style="width:80px;padding:8px 10px 8px 0;border:none;background:transparent;font-size:13px;font-weight:700;color:var(--ink);text-align:right;outline:none;-moz-appearance:textfield">
      </div>
    </div>`).join('');
}

function updateExpenseTotalPreview(containerId, previewId) {
  const preview   = document.getElementById(previewId);
  const container = document.getElementById(containerId);
  if (!preview || !container) return;
  const total = Array.from(container.querySelectorAll('.expense-pay-input')).reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
  preview.style.display = total > 0 ? 'block' : 'none';
  preview.textContent = 'Total: ₱' + total.toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function openEditExpense(expId) {
  const group = getActiveGroup();
  if (!group) return;
  const exp = group.expenses.find(e => e.id === expId);
  if (!exp) return;
  closeModalById('expense-actions-modal');
  document.getElementById('edit-expense-id').value   = expId;
  document.getElementById('edit-expense-desc').value = exp.name;
  document.getElementById('edit-expense-note').value = exp.note || '';
  STATE.expenseIconSelected = exp.icon;
  const iconPreview = document.getElementById('edit-expense-icon-preview');
  if (iconPreview) iconPreview.textContent = exp.icon;
  const grid = document.getElementById('edit-icon-picker-grid');
  if (grid) renderIconPickerInto(grid, 'edit-expense-icon-preview');
  renderExpensePaymentInputs(group, 'edit-expense-member-payments', 'edit-expense-total-preview');
  // Pre-fill amounts
  const payments = exp.memberPayments || (exp.payerId ? [{ memberId: exp.payerId, amount: exp.amount }] : []);
  payments.forEach(p => {
    const inp = document.querySelector(`#edit-expense-member-payments .expense-pay-input[data-member-id="${p.memberId}"]`);
    if (inp && p.amount) inp.value = p.amount;
  });
  updateExpenseTotalPreview('edit-expense-member-payments', 'edit-expense-total-preview');
  openModal('edit-expense-modal');
}

function saveEditExpense() {
  const group = getActiveGroup();
  if (!group) return;
  const expId = document.getElementById('edit-expense-id').value;
  const exp   = group.expenses.find(e => e.id === expId);
  if (!exp) return;
  const name  = document.getElementById('edit-expense-desc').value.trim();
  if (!name) { showToast('⚠️ Enter a description'); return; }
  const payInputs      = document.querySelectorAll('#edit-expense-member-payments .expense-pay-input');
  const memberPayments = Array.from(payInputs).map(inp => ({ memberId: inp.dataset.memberId, amount: parseFloat(inp.value) || 0 }));
  const total          = memberPayments.reduce((s, p) => s + p.amount, 0);
  if (!total) { showToast('⚠️ Enter at least one payment amount'); return; }
  exp.name           = name;
  exp.icon           = STATE.expenseIconSelected || exp.icon;
  exp.memberPayments = memberPayments;
  exp.total          = total;
  exp.note           = document.getElementById('edit-expense-note').value.trim();
  delete exp.amount;
  delete exp.payerId;
  saveGroups();
  renderExpensesPanel(group);
  renderSettlePanel(group);
  updateGroupHeroStats(group);
  closeModalById('edit-expense-modal');
  showToast('✅ Expense updated!');
}

function deleteExpense(expId) {
  const group = getActiveGroup();
  if (!group) return;
  group.expenses = group.expenses.filter(e => e.id !== expId);
  saveGroups();
  renderExpensesPanel(group);
  renderSettlePanel(group);
  closeModalById('expense-actions-modal');
  closeModalById('edit-expense-modal');
  showToast('🗑 Expense deleted');
}

function openEditTask(taskId) {
  const group = getActiveGroup();
  if (!group) return;
  const task = group.tasks.find(t => t.id === taskId);
  if (!task) return;
  document.getElementById('edit-task-id').value   = taskId;
  document.getElementById('edit-task-name').value = task.name;
  document.getElementById('edit-task-due').value  = task.dueDate || '';
  STATE.editAssignedMember = task.assigneeId;
  const picker = document.getElementById('edit-task-assign-picker');
  if (picker) {
    picker.innerHTML = group.members.map(m => {
      const sel = m.id === task.assigneeId;
      return `<button class="task-member-btn edit-assign-btn${sel?' selected':''}"
        onclick="selectEditAssign(this,'${m.id}')"
        style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px;border-radius:var(--r-md);cursor:pointer;border:1.5px solid ${sel?'rgba(201,169,110,0.45)':'rgba(255,255,255,0.5)'};background:${sel?'rgba(245,230,200,0.55)':'rgba(255,255,255,0.45)'}">
        <div class="member-av ${m.color}" style="width:36px;height:36px;border-radius:10px;font-size:12px">${m.id}</div>
        <span style="font-size:10px;font-weight:600;color:var(--ink-2);text-align:center;max-width:52px">${m.name.split(' ')[0]}</span>
      </button>`;
    }).join('');
  }
  openModal('edit-task-modal');
}

function selectEditAssign(btn, id) {
  STATE.editAssignedMember = id;
  document.querySelectorAll('.edit-assign-btn').forEach(b => {
    b.classList.remove('selected');
    b.style.borderColor = 'rgba(255,255,255,0.5)';
    b.style.background  = 'rgba(255,255,255,0.45)';
  });
  btn.classList.add('selected');
  btn.style.borderColor = 'rgba(201,169,110,0.45)';
  btn.style.background  = 'rgba(245,230,200,0.55)';
}

function saveEditTask() {
  const group  = getActiveGroup();
  if (!group) return;
  const taskId = document.getElementById('edit-task-id').value;
  const task   = group.tasks.find(t => t.id === taskId);
  if (!task) return;
  const name   = document.getElementById('edit-task-name').value.trim();
  if (!name) { showToast('⚠️ Enter a task name'); return; }
  task.name       = name;
  task.dueDate    = document.getElementById('edit-task-due').value;
  task.assigneeId = STATE.editAssignedMember || task.assigneeId;
  saveGroups();
  renderTasksPanel(group);
  updateGroupHeroStats(group);
  closeModalById('edit-task-modal');
  showToast('✅ Task updated!');
}

function deleteTask(taskId) {
  const group = getActiveGroup();
  if (!group) return;
  group.tasks = group.tasks.filter(t => t.id !== taskId);
  saveGroups();
  renderTasksPanel(group);
  updateGroupHeroStats(group);
  closeModalById('edit-task-modal');
  showToast('🗑 Task deleted');
}

/* ── RECEIPT RENDER ──────────────────────────── */
function renderReceipt() {
  const card = document.getElementById('receipt-card-el');
  if (!card) return;
  const group = getActiveGroup();
  if (!group) { card.innerHTML = '<div style="padding:24px;text-align:center;color:var(--ink-4)">No group selected</div>'; return; }

  const expenses   = group.expenses || [];
  const total      = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const perPerson  = group.members.length > 0 ? total / group.members.length : 0;
  const remaining  = group.budget ? group.budget - total : null;
  const settlements = calcSettlement(group);
  const today      = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

  const expenseRows = expenses.length === 0
    ? '<div style="padding:12px 20px;color:var(--ink-4);font-size:13px">No expenses logged yet</div>'
    : expenses.map(e => {
        const payer = group.members.find(m => m.id === e.payerId);
        const pName = payer ? payer.name.split(' ')[0] : '—';
        return `<div class="r-row"><span class="r-key">${e.icon} ${e.name} (${pName})</span><span class="r-val">₱${parseFloat(e.amount).toLocaleString()}</span></div>`;
      }).join('');

  const settlementRows = settlements.length === 0
    ? '<div style="padding:8px 20px;color:var(--ink-4);font-size:13px">Everyone is settled up ✓</div>'
    : settlements.map(s => `<div class="r-row"><span class="r-key">${s.fromName.split(' ')[0]} → ${s.toName.split(' ')[0]}</span><span class="r-val">₱${s.amount.toLocaleString()}</span></div>`).join('');

  card.innerHTML = `
    <div class="receipt-logo">
      <div class="receipt-brand">ano tara?</div>
      <div class="receipt-title">Event Summary</div>
      <div class="receipt-sub">${group.name}</div>
    </div>
    <div class="r-divider"></div>
    <div class="r-row"><span class="r-key">Group</span><span class="r-val">${group.members.length} members</span></div>
    <div class="r-row"><span class="r-key">Date</span><span class="r-val">${today}</span></div>
    <div class="r-divider"></div>
    <div class="r-sec-title">Expenses</div>
    ${expenseRows}
    <div class="r-divider"></div>
    <div class="r-row"><span class="r-key" style="font-weight:700;color:var(--ink)">Total Spent</span><span class="r-total">₱${total.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
    <div class="r-row"><span class="r-key">Per person</span><span class="r-val">₱${perPerson.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
    ${remaining !== null ? `<div class="r-row"><span class="r-key">Remaining</span><span class="r-val" style="color:var(--green-deep);font-weight:700">₱${remaining.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>` : ''}
    <div class="r-divider"></div>
    <div class="r-sec-title">Who Pays Who</div>
    ${settlementRows}
    <button class="receipt-share" onclick="shareToMessenger()">
      <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:white;flex-shrink:0"><path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.87 1.397 5.437 3.585 7.12V22l3.348-1.838A11.04 11.04 0 0012 20.485c5.523 0 10-4.145 10-9.242C22 6.145 17.523 2 12 2z"/></svg>
      Share via Messenger
    </button>
  `;
}

/* ── SETTLEMENT ALGORITHM ────────────────────── */
function calcSettlement(group) {
  if (!group.expenses || group.expenses.length === 0 || group.members.length < 2) return [];
  const balances = {};
  group.members.forEach(m => balances[m.id] = 0);
  group.expenses.forEach(exp => {
    if (exp.memberPayments) {
      const total = exp.memberPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      if (!total) return;
      const share = total / group.members.length;
      exp.memberPayments.forEach(p => { if (balances[p.memberId] !== undefined) balances[p.memberId] += parseFloat(p.amount) || 0; });
      group.members.forEach(m => { if (balances[m.id] !== undefined) balances[m.id] -= share; });
    } else {
      const amount = parseFloat(exp.amount) || 0;
      if (!amount) return;
      const share = amount / group.members.length;
      group.members.forEach(m => {
        balances[m.id] = (balances[m.id] || 0) - share;
        if (m.id === exp.payerId) balances[m.id] += amount;
      });
    }
  });
  const creditors = group.members.filter(m => balances[m.id] > 0.01).map(m => ({ ...m, bal: balances[m.id] }));
  const debtors   = group.members.filter(m => balances[m.id] < -0.01).map(m => ({ ...m, bal: -balances[m.id] }));
  const result = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].bal, creditors[j].bal);
    result.push({ fromName: debtors[i].name, toName: creditors[j].name, amount: Math.round(amt * 100) / 100 });
    debtors[i].bal -= amt;
    creditors[j].bal -= amt;
    if (debtors[i].bal < 0.01) i++;
    if (creditors[j].bal < 0.01) j++;
  }
  return result;
}

/* ── SETTLE PANEL RENDER ─────────────────────── */
function renderSettlePanel(group) {
  const container = document.getElementById('settle-list');
  if (!container) return;
  const settlements = calcSettlement(group);
  const avColors = ['ma-tan','ma-pink','ma-green','ma-sand'];
  if (settlements.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:28px;color:var(--ink-4);font-size:13px;font-weight:600">${(group.expenses||[]).length === 0 ? 'No expenses yet — add some first' : 'Everyone is settled up ✓'}</div>`;
    return;
  }
  container.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px">`
    + settlements.map((s, idx) => {
      const fromM = group.members.find(m => m.name === s.fromName) || {};
      const toM   = group.members.find(m => m.name === s.toName)   || {};
      const avFrom = fromM.color || avColors[idx % avColors.length];
      return `<div style="background:#fff;border-radius:var(--r-lg);padding:14px 16px;border:1px solid rgba(0,0,0,0.06);box-shadow:0 2px 8px rgba(0,0,0,0.05);display:flex;align-items:center;gap:10px">
        <div class="member-av ${avFrom}" style="width:38px;height:38px;border-radius:50%;font-size:12px;flex-shrink:0">${(fromM.id||s.fromName.substring(0,2)).toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:var(--ink)">${s.fromName.split(' ')[0]}</div>
          <div style="font-size:12px;color:var(--ink-4);margin-top:1px">owes ${s.toName.split(' ')[0]}</div>
        </div>
        <div style="font-size:18px;font-weight:900;color:#BE185D">₱${s.amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        <button onclick="settleDebt(${idx})" style="padding:6px 14px;border-radius:99px;background:var(--flat-green);border:none;font-size:12px;font-weight:800;color:var(--ink);cursor:pointer;font-family:var(--f)">Settle</button>
      </div>`;
    }).join('')
    + '</div>';
}

function settleDebt(idx) { showToast('✅ Marked as settled!'); }

/* ── GROUP EDIT ──────────────────────────────── */
function openEditGroup() {
  const group = getActiveGroup();
  if (!group) return;
  document.getElementById('edit-group-name').value   = group.name;
  document.getElementById('edit-group-emoji').value  = group.emoji;
  document.getElementById('edit-group-budget').value = group.budget || '';
  renderEditGroupMembers(group);
  openModal('edit-group-modal');
}

function renderEditGroupMembers(group) {
  const el = document.getElementById('edit-group-members-list');
  if (!el) return;
  el.innerHTML = group.members.map(m => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,0.6);border-radius:var(--r-md);border:1px solid rgba(0,0,0,0.06)">
      <div class="member-av ${m.color}" style="width:32px;height:32px;border-radius:9px;font-size:11px;flex-shrink:0">${m.id}</div>
      <span style="flex:1;font-size:13px;font-weight:600;color:var(--ink)">${m.name}</span>
      ${!m.isOwner ? `<button onclick="editGroupRemoveMember('${m.id}')" style="border:none;background:none;color:var(--danger);font-size:18px;cursor:pointer;padding:0 4px;line-height:1">×</button>` : '<span style="font-size:10px;font-weight:700;color:var(--ink-4);padding:2px 8px;background:rgba(0,0,0,0.05);border-radius:99px">You</span>'}
    </div>`).join('');
}

function editGroupRemoveMember(memberId) {
  const group = getActiveGroup();
  if (!group) return;
  group.members = group.members.filter(m => m.id !== memberId);
  saveGroups();
  renderEditGroupMembers(group);
  renderMembersTab(group);
}

function editGroupAddMember() {
  const input = document.getElementById('edit-group-new-member');
  const name  = (input?.value || '').trim();
  if (!name) return;
  const group = getActiveGroup();
  if (!group) return;
  const colors = ['ma-green','ma-pink','ma-sand','ma-tan'];
  const newId  = name.substring(0,2).toUpperCase() + group.members.length;
  group.members.push({ id:newId, name, color:colors[group.members.length % colors.length], isOwner:false });
  saveGroups();
  if (input) input.value = '';
  renderEditGroupMembers(group);
  renderMembersTab(group);
}

function saveEditGroup() {
  const group  = getActiveGroup();
  if (!group) return;
  const name   = document.getElementById('edit-group-name').value.trim();
  const emoji  = document.getElementById('edit-group-emoji').value.trim();
  const budget = parseFloat(document.getElementById('edit-group-budget').value) || 0;
  if (!name) { showToast('⚠️ Enter a group name'); return; }
  group.name   = name;
  group.emoji  = emoji || group.emoji;
  group.budget = budget;
  saveGroups();
  // Refresh hero
  const heroName  = document.getElementById('group-hero-name');
  const heroEmoji = document.getElementById('group-hero-emoji');
  const heroSub   = document.getElementById('group-hero-sub');
  if (heroName)  heroName.textContent  = group.name;
  if (heroEmoji) heroEmoji.textContent = group.emoji;
  if (heroSub)   heroSub.textContent   = group.members.map(m=>m.name.split(' ')[0]).join(', ') + ' · ' + group.members.length + ' members';
  renderGroupsList();
  closeModalById('edit-group-modal');
  showToast('✅ Group updated!');
}

function renderIconPickerInto(container, previewId) {
  const ICONS = {
    'Food & Drink': ['🍽️','🍜','🍕','🍔','🍣','🥗','🍱','☕','🧋','🍺','🥩','🍗'],
    'Shopping':     ['🛒','👗','👟','💄','🎁','🛍️','💍','⌚'],
    'Transport':    ['🚗','✈️','🚌','⛽','🚕','🛵','🚂'],
    'Fun':          ['🎉','🎬','🎮','🎤','🎨','🏖️','🎯','🎳'],
    'Home':         ['🏠','💡','🔧','🛋️','🧹','🌿'],
    'Health':       ['💊','🏥','💉','🩺'],
    'Other':        ['📦','💰','🎂','📝','🔑','🧾'],
  };
  let html = '';
  for (const [cat, icons] of Object.entries(ICONS)) {
    html += `<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px">${cat}</div><div style="display:flex;flex-wrap:wrap;gap:6px">`;
    icons.forEach(icon => {
      html += `<button class="icon-pick-btn${icon===STATE.expenseIconSelected?' selected':''}" onclick="selectEditIcon(this,'${icon}','${previewId}')">${icon}</button>`;
    });
    html += '</div></div>';
  }
  container.innerHTML = html;
}

function selectEditIcon(btn, icon, previewId) {
  STATE.expenseIconSelected = icon;
  document.querySelectorAll('#edit-icon-picker-grid .icon-pick-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const preview = document.getElementById(previewId);
  if (preview) preview.textContent = icon;
}

function shareReceiptAsImage() {
  const card = document.getElementById('receipt-card-el');
  if (!card) return;
  showToast('📸 Capturing receipt…');
  html2canvas(card, { backgroundColor: '#ffffff', scale: 2, useCORS: true }).then(canvas => {
    const img = canvas.toDataURL('image/png');
    if (navigator.share) {
      canvas.toBlob(blob => {
        const file = new File([blob], 'receipt-anotara.png', { type: 'image/png' });
        navigator.share({ files: [file], title: 'Ano Tara Receipt' }).catch(() => downloadReceiptImage(img));
      });
    } else {
      downloadReceiptImage(img);
    }
  }).catch(() => showToast('⚠️ Could not capture receipt'));
}

function downloadReceiptImage(dataUrl) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'receipt-anotara.png';
  a.click();
  showToast('✅ Receipt saved!');
}

/* ── DAILY TASKS ─────────────────────────────── */
let DAILY_TASKS = JSON.parse(localStorage.getItem('at_daily_tasks') || '[]');
// task: { id, title, type:'check'|'milestone', target:n, unit:'', days:['mon',...], color, p1done:0, p2done:0, todayP1:false, todayP2:false, lastReset:'' }

function saveDailyTasks() { localStorage.setItem('at_daily_tasks', JSON.stringify(DAILY_TASKS)); }

function initDailyTasks() {
  resetDailyTasksIfNewDay();
  renderDailyTasks();
  renderWeeklySetup();
}

function resetDailyTasksIfNewDay() {
  const today = new Date().toDateString();
  DAILY_TASKS.forEach(t => {
    if (t.lastReset !== today) {
      t.todayP1 = 0; t.todayP2 = 0; t.lastReset = today;
    }
  });
  saveDailyTasks();
}

function renderDailyTasks() {
  const el = document.getElementById('daily-tasks-list');
  if (!el) return;
  const today = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
  const todayTasks = DAILY_TASKS.filter(t => !t.days || t.days.includes(today) || t.days.length === 0);
  if (!todayTasks.length) {
    el.innerHTML = '<div style="text-align:center;padding:40px 20px"><div style="font-size:40px;margin-bottom:12px">✨</div><div style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:8px">No tasks for today</div><div style="font-size:13px;color:var(--ink-4)">Set up your weekly tasks below.</div></div>';
    return;
  }
  el.innerHTML = todayTasks.map(t => {
    const p1v = t.todayP1 || 0, p2v = t.todayP2 || 0;
    const isCheck = t.type === 'check';
    const p1done = isCheck ? p1v >= 1 : p1v >= t.target;
    const p2done = isCheck ? p2v >= 1 : p2v >= t.target;
    const allDone = p1done && p2done;
    return '<div class="dtask-card glass'+(allDone?' dtask-done':'')+'" style="border-left:3px solid '+(t.color||'var(--tan)')+';">'
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:'+(isCheck?'0':'10px')+'">'
      + '<div style="font-size:22px">'+t.emoji+'</div>'
      + '<div style="flex:1"><div style="font-size:14px;font-weight:700;color:var(--ink)">'+t.title+'</div>'
      + (isCheck?'':'<div style="font-size:11px;color:var(--ink-4)">'+t.unit+' · '+t.target+' target</div>')
      + '</div>'
      + (allDone?'<div style="font-size:18px">✅</div>':'')
      + '</div>'
      + (isCheck
        ? '<div style="display:flex;gap:8px">'
          + '<button onclick="toggleDailyCheck('+t.id+',\'p1\')" style="flex:1;padding:10px;border-radius:var(--r-md);border:2px solid '+(p1done?'var(--green-deep)':'rgba(201,169,110,0.3)')+';background:'+(p1done?'rgba(90,171,122,0.15)':'rgba(255,253,248,0.8)')+';font-size:13px;font-weight:700;color:'+(p1done?'var(--green-deep)':'var(--ink-3)')+';cursor:pointer">'+getP1Name()+(p1done?' ✓':'')+' </button>'
          + '<button onclick="toggleDailyCheck('+t.id+',\'p2\')" style="flex:1;padding:10px;border-radius:var(--r-md);border:2px solid '+(p2done?'var(--green-deep)':'rgba(201,169,110,0.3)')+';background:'+(p2done?'rgba(90,171,122,0.15)':'rgba(255,253,248,0.8)')+';font-size:13px;font-weight:700;color:'+(p2done?'var(--green-deep)':'var(--ink-3)')+';cursor:pointer">'+getP2Name()+(p2done?' ✓':'')+' </button>'
          + '</div>'
        : '<div>'
          + '<div style="display:flex;justify-content:space-between;margin-bottom:6px">'
          + '<span style="font-size:12px;font-weight:700;color:var(--ink-3)">'+getP1Name()+'</span>'
          + '<span style="font-size:12px;font-weight:700;color:var(--ink-3)">'+getP2Name()+'</span>'
          + '</div>'
          + '<div style="display:flex;gap:8px;align-items:center">'
          + '<div style="flex:1;background:rgba(245,230,200,0.5);border-radius:8px;height:8px;overflow:hidden"><div style="height:100%;border-radius:8px;background:var(--tan);width:'+Math.min(100,Math.round((p1v/t.target)*100))+'%;transition:width 0.3s"></div></div>'
          + '<span style="font-size:12px;font-weight:700;min-width:28px;text-align:center;color:var(--ink)">'+p1v+'/'+t.target+'</span>'
          + '<span style="font-size:11px;color:var(--ink-4)">vs</span>'
          + '<span style="font-size:12px;font-weight:700;min-width:28px;text-align:center;color:var(--ink)">'+p2v+'/'+t.target+'</span>'
          + '<div style="flex:1;background:rgba(245,230,200,0.5);border-radius:8px;height:8px;overflow:hidden"><div style="height:100%;border-radius:8px;background:var(--pink-accent);width:'+Math.min(100,Math.round((p2v/t.target)*100))+'%;transition:width 0.3s"></div></div>'
          + '</div>'
          + '<div style="display:flex;gap:8px;margin-top:8px">'
          + '<button onclick="incrementDaily('+t.id+',\'p1\')" style="flex:1;padding:9px;border-radius:var(--r-md);border:1.5px solid rgba(201,169,110,0.3);background:rgba(245,230,200,0.5);font-size:13px;font-weight:700;color:var(--tan-dark);cursor:pointer">'+getP1Name()+' +1</button>'
          + '<button onclick="incrementDaily('+t.id+',\'p2\')" style="flex:1;padding:9px;border-radius:var(--r-md);border:1.5px solid rgba(224,120,152,0.3);background:rgba(252,232,238,0.5);font-size:13px;font-weight:700;color:var(--pink-deep);cursor:pointer">'+getP2Name()+' +1</button>'
          + '</div>'
          + '</div>'
      )
      + '</div>';
  }).join('');
}

function getP1Name() { return WEDDING_STATE.p1 || 'Jhoan'; }
function getP2Name() { return WEDDING_STATE.p2 || 'Seph'; }

function toggleDailyCheck(id, who) {
  const t = DAILY_TASKS.find(t=>t.id===id); if (!t) return;
  if (who === 'p1') t.todayP1 = t.todayP1 ? 0 : 1;
  else              t.todayP2 = t.todayP2 ? 0 : 1;
  saveDailyTasks(); renderDailyTasks();
  checkAllDone(t);
}

function incrementDaily(id, who) {
  const t = DAILY_TASKS.find(t=>t.id===id); if (!t) return;
  if (who === 'p1' && t.todayP1 < t.target) t.todayP1++;
  else if (who === 'p2' && t.todayP2 < t.target) t.todayP2++;
  saveDailyTasks(); renderDailyTasks();
  checkAllDone(t);
}

function checkAllDone(t) {
  const p1done = t.type==='check' ? t.todayP1>=1 : t.todayP1>=t.target;
  const p2done = t.type==='check' ? t.todayP2>=1 : t.todayP2>=t.target;
  if (p1done && p2done) showToast('🎉 '+t.title+' — both done!');
}

function renderWeeklySetup() {
  const el = document.getElementById('weekly-setup-list');
  if (!el) return;
  if (!DAILY_TASKS.length) { el.innerHTML = '<div style="text-align:center;padding:20px;font-size:13px;color:var(--ink-4)">No tasks yet — add your first task!</div>'; return; }
  el.innerHTML = DAILY_TASKS.map(t => '<div class="glass" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:var(--r-md);margin-bottom:7px">'
    + '<div style="font-size:20px">'+t.emoji+'</div>'
    + '<div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--ink)">'+t.title+'</div>'
    + '<div style="font-size:11px;color:var(--ink-4)">'+( t.type==='check'?'Yes/No · '+t.days.join(', '):'Milestone · '+t.target+' '+t.unit+' · '+t.days.join(', '))+'</div>'
    + '</div>'
    + '<button onclick="removeDailyTask('+t.id+')" style="width:26px;height:26px;border-radius:7px;border:none;background:rgba(224,120,152,0.12);font-size:13px;cursor:pointer;color:var(--pink-deep)">🗑</button>'
    + '</div>').join('');
}

function removeDailyTask(id) {
  DAILY_TASKS = DAILY_TASKS.filter(t=>t.id!==id);
  saveDailyTasks(); renderDailyTasks(); renderWeeklySetup();
  showToast('🗑 Task removed');
}

let _dtaskType = 'check';
let _dtaskDays = ['mon','tue','wed','thu','fri','sat','sun'];
let _dtaskEmoji = '✅';
const DTASK_COLORS = ['var(--tan)','var(--pink-accent)','var(--green-accent)','#8b7cf8','#f59e42'];
let _dtaskColor = 'var(--tan)';

function selectDTaskType(type) {
  _dtaskType = type;
  document.querySelectorAll('.dtask-type-btn').forEach(b => b.classList.remove('selected'));
  document.querySelector('.dtask-type-btn[data-type="'+type+'"]')?.classList.add('selected');
  document.getElementById('dtask-milestone-fields').style.display = type==='milestone'?'block':'none';
}

function toggleDTaskDay(btn, day) {
  btn.classList.toggle('selected');
  if (_dtaskDays.includes(day)) _dtaskDays = _dtaskDays.filter(d=>d!==day);
  else _dtaskDays.push(day);
}

function submitDailyTask() {
  const title = (document.getElementById('dtask-title')?.value||'').trim();
  if (!title) { showToast('⚠️ Enter a task name'); return; }
  const target = parseInt(document.getElementById('dtask-target')?.value)||8;
  const unit   = (document.getElementById('dtask-unit')?.value||'times').trim();
  const newId  = (DAILY_TASKS.reduce((m,t)=>Math.max(m,t.id),0))+1;
  DAILY_TASKS.push({ id:newId, title, type:_dtaskType, target, unit, days:[..._dtaskDays], emoji:_dtaskEmoji, color:_dtaskColor, todayP1:0, todayP2:0, lastReset:'' });
  saveDailyTasks();
  closeModalById('add-dtask-modal');
  document.getElementById('dtask-title').value='';
  renderDailyTasks(); renderWeeklySetup();
  showToast('✅ Task added!');
}

window.initDailyTasks=initDailyTasks; window.toggleDailyCheck=toggleDailyCheck;
window.incrementDaily=incrementDaily; window.removeDailyTask=removeDailyTask;
window.selectDTaskType=selectDTaskType; window.toggleDTaskDay=toggleDTaskDay;
window.submitDailyTask=submitDailyTask;

/* ── MOOD BOARD ──────────────────────────────── */
let MOOD_LOG = JSON.parse(localStorage.getItem('at_mood_log') || '[]');
// entry: { date, p1emoji, p1note, p2emoji, p2note }
const MOOD_EMOJIS = ['😊','😄','😍','😎','🥰','😌','😐','😔','😤','😩','😴','🤒'];

function saveMoods() { localStorage.setItem('at_mood_log', JSON.stringify(MOOD_LOG)); }

function initMoodBoard() { renderMoodBoard(); }

function renderMoodBoard() {
  const el = document.getElementById('mood-board-content');
  if (!el) return;
  const today = new Date().toDateString();
  const todayEntry = MOOD_LOG.find(e=>e.date===today) || { date:today, p1emoji:'', p1note:'', p2emoji:'', p2note:'' };

  el.innerHTML = '<div style="margin-bottom:20px">'
    + '<div style="font-size:11px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:12px">Today\'s Check-in</div>'
    + '<div style="display:flex;gap:12px">'
    // P1 card
    + '<div class="glass" style="flex:1;padding:16px;border-radius:var(--r-md);text-align:center">'
    + '<div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:10px">'+getP1Name()+'</div>'
    + '<div style="font-size:36px;margin-bottom:8px;cursor:pointer;min-height:44px" onclick="openMoodPicker(\'p1\')" id="mood-p1-emoji">'+(todayEntry.p1emoji||'🫥')+'</div>'
    + '<input id="mood-p1-note" type="text" placeholder="How are you feeling?" value="'+todayEntry.p1note+'" oninput="saveMoodNote(\'p1\',this.value)" style="width:100%;padding:7px 10px;border-radius:8px;border:1px solid rgba(201,169,110,0.25);background:rgba(255,253,248,0.8);font-size:11.5px;font-family:var(--f);outline:none">'
    + '</div>'
    // P2 card
    + '<div class="glass" style="flex:1;padding:16px;border-radius:var(--r-md);text-align:center">'
    + '<div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:10px">'+getP2Name()+'</div>'
    + '<div style="font-size:36px;margin-bottom:8px;cursor:pointer;min-height:44px" onclick="openMoodPicker(\'p2\')" id="mood-p2-emoji">'+(todayEntry.p2emoji||'🫥')+'</div>'
    + '<input id="mood-p2-note" type="text" placeholder="How are you feeling?" value="'+todayEntry.p2note+'" oninput="saveMoodNote(\'p2\',this.value)" style="width:100%;padding:7px 10px;border-radius:8px;border:1px solid rgba(201,169,110,0.25);background:rgba(255,253,248,0.8);font-size:11.5px;font-family:var(--f);outline:none">'
    + '</div>'
    + '</div>'
    + '</div>'
    // History
    + '<div style="font-size:11px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px">Recent History</div>'
    + (MOOD_LOG.length < 2 ? '<div style="text-align:center;padding:20px;font-size:13px;color:var(--ink-4)">No history yet. Check in daily! 💕</div>'
      : MOOD_LOG.slice().reverse().slice(0,7).map(e=>'<div class="glass" style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:var(--r-md);margin-bottom:7px">'
        + '<div style="font-size:11px;font-weight:700;color:var(--ink-4);min-width:70px">'+new Date(e.date).toLocaleDateString('en-PH',{month:'short',day:'numeric'})+'</div>'
        + '<div style="flex:1;display:flex;gap:10px;align-items:center">'
        + '<span style="font-size:22px">'+( e.p1emoji||'🫥')+'</span>'
        + '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--ink)">'+getP1Name()+'</div>'+(e.p1note?'<div style="font-size:11px;color:var(--ink-4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+e.p1note+'</div>':'')+'</div>'
        + '</div>'
        + '<div style="flex:1;display:flex;gap:10px;align-items:center">'
        + '<span style="font-size:22px">'+(e.p2emoji||'🫥')+'</span>'
        + '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--ink)">'+getP2Name()+'</div>'+(e.p2note?'<div style="font-size:11px;color:var(--ink-4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+e.p2note+'</div>':'')+'</div>'
        + '</div>'
        + '</div>').join(''));
}

function openMoodPicker(who) {
  const old = document.getElementById('mood-picker-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'mood-picker-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(44,31,14,0.28);display:flex;align-items:flex-end;justify-content:center;';
  overlay.innerHTML = '<div style="width:100%;max-width:440px;background:var(--cream);border-radius:var(--r-xl) var(--r-xl) 0 0;padding:20px 16px 32px;">'
    + '<div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:14px">How is '+(who==='p1'?getP1Name():getP2Name())+' feeling?</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">'
    + MOOD_EMOJIS.map(e=>'<button onclick="selectMoodEmoji(\''+who+'\',\''+e+'\')" style="width:52px;height:52px;font-size:28px;border-radius:12px;border:1px solid rgba(201,169,110,0.2);background:rgba(255,253,248,0.8);cursor:pointer">'+e+'</button>').join('')
    + '</div>'
    + '<button onclick="document.getElementById(\'mood-picker-overlay\').remove()" style="width:100%;margin-top:16px;padding:10px;border-radius:var(--r-md);border:1px solid rgba(201,169,110,0.2);background:rgba(245,230,200,0.5);font-size:13px;font-weight:700;color:var(--tan-dark);cursor:pointer">Cancel</button>'
    + '</div>';
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function selectMoodEmoji(who, emoji) {
  document.getElementById('mood-picker-overlay')?.remove();
  const today = new Date().toDateString();
  let entry = MOOD_LOG.find(e=>e.date===today);
  if (!entry) { entry={date:today,p1emoji:'',p1note:'',p2emoji:'',p2note:''}; MOOD_LOG.push(entry); }
  if (who==='p1') entry.p1emoji=emoji; else entry.p2emoji=emoji;
  saveMoods(); renderMoodBoard();
}

function saveMoodNote(who, val) {
  const today = new Date().toDateString();
  let entry = MOOD_LOG.find(e=>e.date===today);
  if (!entry) { entry={date:today,p1emoji:'',p1note:'',p2emoji:'',p2note:''}; MOOD_LOG.push(entry); }
  if (who==='p1') entry.p1note=val; else entry.p2note=val;
  saveMoods();
}

window.initMoodBoard=initMoodBoard; window.openMoodPicker=openMoodPicker;
window.selectMoodEmoji=selectMoodEmoji; window.saveMoodNote=saveMoodNote;

/* ── SUPPLIERS (WEDDING) ─────────────────────── */
let SUPPLIERS = JSON.parse(localStorage.getItem('at_suppliers') || '[]');
// { id, name, category, phone, email, notes, paid, total }
const SUPPLIER_CATS = ['Venue','Catering','Photography','Videography','Florals','Music','Attire','Cake','Transport','Makeup','Invitations','Coordination','Other'];

function saveSuppliers() { localStorage.setItem('at_suppliers', JSON.stringify(SUPPLIERS)); }

function initSuppliers() { renderSuppliers(); }

function renderSuppliers() {
  const el = document.getElementById('suppliers-list');
  if (!el) return;
  if (!SUPPLIERS.length) {
    el.innerHTML = '<div style="text-align:center;padding:40px 20px"><div style="font-size:40px;margin-bottom:12px">📋</div><div style="font-size:16px;font-weight:700;color:var(--ink);margin-bottom:8px">No Suppliers Yet</div><div style="font-size:13px;color:var(--ink-4)">Add your caterer, photographer,<br>band, and all your vendors here.</div></div>';
    return;
  }
  const byCat = {};
  SUPPLIERS.forEach(s => { if (!byCat[s.category]) byCat[s.category]=[]; byCat[s.category].push(s); });
  el.innerHTML = Object.entries(byCat).map(([cat,sups])=>
    '<div style="margin-bottom:18px"><div style="font-size:11px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px">'+cat+'</div>'
    + sups.map(s=>'<div class="glass" style="border-radius:var(--r-md);margin-bottom:8px;overflow:hidden">'
      + '<div style="display:flex;align-items:center;gap:12px;padding:13px 14px">'
      + '<div style="width:40px;height:40px;border-radius:12px;background:rgba(245,230,200,0.6);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">'+getSupplierEmoji(s.category)+'</div>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:14px;font-weight:700;color:var(--ink)">'+s.name+'</div>'
      + (s.notes?'<div style="font-size:11.5px;color:var(--ink-4);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+s.notes+'</div>':'')
      + '</div>'
      + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">'
      + (s.total?'<span style="font-size:12px;font-weight:700;color:var(--ink)">₱'+Number(s.total).toLocaleString()+'</span>':'')
      + '<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;background:'+(s.paid?'rgba(90,171,122,0.15)':'rgba(245,230,200,0.7)')+';color:'+(s.paid?'var(--green-deep)':'var(--tan-dark)')+';">'+(s.paid?'✓ Paid':'Pending')+'</span>'
      + '</div></div>'
      + '<div style="display:flex;border-top:1px solid rgba(201,169,110,0.12)">'
      + (s.phone?'<a href="tel:'+s.phone+'" style="flex:1;padding:10px;text-align:center;font-size:12.5px;font-weight:700;color:var(--green-deep);text-decoration:none;background:rgba(232,245,237,0.4)">📞 Call</a>':'')
      + (s.phone?'<a href="sms:'+s.phone+'" style="flex:1;padding:10px;text-align:center;font-size:12.5px;font-weight:700;color:var(--tan-dark);text-decoration:none;background:rgba(245,230,200,0.3)">💬 SMS</a>':'')
      + (s.email?'<a href="mailto:'+s.email+'" style="flex:1;padding:10px;text-align:center;font-size:12.5px;font-weight:700;color:var(--pink-deep);text-decoration:none;background:rgba(252,232,238,0.3)">✉️ Email</a>':'')
      + '<button onclick="removeSupplier('+s.id+')" style="padding:10px 14px;border:none;background:rgba(252,232,238,0.4);font-size:13px;cursor:pointer;color:var(--pink-deep)">🗑</button>'
      + '</div></div>').join('')
    + '</div>'
  ).join('');
}

function getSupplierEmoji(cat) {
  const map={Venue:'🏛️',Catering:'🍽️',Photography:'📸',Videography:'🎥',Florals:'💐',Music:'🎵',Attire:'👗',Cake:'🎂',Transport:'🚗',Makeup:'💄',Invitations:'💌',Coordination:'📋',Other:'📌'};
  return map[cat]||'📌';
}

function submitSupplier() {
  const name = (document.getElementById('sup-name')?.value||'').trim();
  if (!name) { showToast('⚠️ Enter supplier name'); return; }
  const cat   = document.getElementById('sup-cat')?.value   || 'Other';
  const phone = (document.getElementById('sup-phone')?.value||'').trim();
  const email = (document.getElementById('sup-email')?.value||'').trim();
  const notes = (document.getElementById('sup-notes')?.value||'').trim();
  const total = parseFloat(document.getElementById('sup-total')?.value)||0;
  const newId = (SUPPLIERS.reduce((m,s)=>Math.max(m,s.id),0))+1;
  SUPPLIERS.push({ id:newId, name, category:cat, phone, email, notes, total, paid:false });
  saveSuppliers();
  closeModalById('add-supplier-modal');
  ['sup-name','sup-phone','sup-email','sup-notes','sup-total'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  renderSuppliers();
  showToast('📋 '+name+' added!');
}

function toggleSupplierPaid(id) {
  const s = SUPPLIERS.find(s=>s.id===id); if(!s) return;
  s.paid = !s.paid; saveSuppliers(); renderSuppliers();
  showToast(s.paid?'✅ Marked as paid':'↩️ Marked as unpaid');
}

function removeSupplier(id) {
  const s = SUPPLIERS.find(s=>s.id===id); if(!s) return;
  if(!confirm('Remove '+s.name+'?')) return;
  SUPPLIERS = SUPPLIERS.filter(s=>s.id!==id);
  saveSuppliers(); renderSuppliers();
  showToast('🗑 Supplier removed');
}

window.initSuppliers=initSuppliers; window.submitSupplier=submitSupplier;
window.toggleSupplierPaid=toggleSupplierPaid; window.removeSupplier=removeSupplier;

/* ── POLL ────────────────────────────────────── */
let POLLS = [
  { id:1, q:'Where to eat this Saturday? 🍴', opts:['Yabu Katsu','Manam','Ramen Nagi'], votes:[3,2,1], myVote:null }
];

function renderPolls() {
  const el = document.getElementById('polls-container');
  if (!el) return;
  if (!POLLS.length) { el.innerHTML = '<div style="text-align:center;padding:20px;font-size:13px;color:var(--ink-4)">No polls yet — create one!</div>'; return; }
  el.innerHTML = POLLS.map(p => {
    const total = p.votes.reduce((a,b)=>a+b,0) || 1;
    return '<div class="poll-card glass" style="margin-bottom:12px">'
      + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">'
      + '<div class="poll-q" style="margin:0;flex:1">'+p.q+'</div>'
      + '<button onclick="deletePoll('+p.id+')" style="width:24px;height:24px;border-radius:6px;border:none;background:rgba(224,120,152,0.1);font-size:12px;cursor:pointer;color:var(--pink-deep);flex-shrink:0">🗑</button>'
      + '</div>'
      + p.opts.map((opt,i)=>{
          const pct = Math.round((p.votes[i]/total)*100);
          const isVoted = p.myVote === i;
          return '<div class="poll-opt'+(isVoted?' selected':'')+'" onclick="vote('+p.id+','+i+')">'
            + '<div class="poll-bar-wrap"><div class="poll-label">'+opt+'</div>'
            + '<div class="poll-bar"><div class="poll-fill" style="width:'+pct+'%"></div></div></div>'
            + '<span class="poll-pct">'+pct+'%</span></div>';
        }).join('')
      + '<div style="font-size:10.5px;color:var(--ink-4);margin-top:8px;text-align:right">'+total+' vote'+(total!==1?'s':'')+'</div>'
      + '</div>';
  }).join('');
}

function vote(pollId, optIdx) {
  const p = POLLS.find(p=>p.id===pollId);
  if (!p) return;
  if (p.myVote !== null) p.votes[p.myVote] = Math.max(0, p.votes[p.myVote]-1);
  p.myVote = optIdx;
  p.votes[optIdx]++;
  renderPolls();
  showToast('🗳️ Vote recorded!');
}

function deletePoll(id) {
  POLLS = POLLS.filter(p=>p.id!==id);
  renderPolls();
  showToast('🗑 Poll deleted');
}

function createPoll() {
  const q = (document.getElementById('poll-q-input')?.value||'').trim();
  const opts = [
    document.getElementById('poll-opt1')?.value.trim(),
    document.getElementById('poll-opt2')?.value.trim(),
    document.getElementById('poll-opt3')?.value.trim(),
    document.getElementById('poll-opt4')?.value.trim(),
  ].filter(Boolean);
  if (!q) { showToast('⚠️ Enter a question'); return; }
  if (opts.length < 2) { showToast('⚠️ Add at least 2 options'); return; }
  const newId = (POLLS.reduce((m,p)=>Math.max(m,p.id),0))+1;
  POLLS.push({ id:newId, q, opts, votes:opts.map(()=>0), myVote:null });
  closeModalById('add-poll-modal');
  ['poll-q-input','poll-opt1','poll-opt2','poll-opt3','poll-opt4'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.value='';
  });
  renderPolls();
  showToast('🗳️ Poll created!');
}
window.vote = vote;
window.deletePoll = deletePoll;
window.createPoll = createPoll;

/* ── TOAST ───────────────────────────────────── */
let _tt = null;
function showToast(msg) { /* disabled */ }

/* ── ANIMATE PROGRESS BARS ───────────────────── */
function animateBars() {
  document.querySelectorAll('[data-width]').forEach(el => {
    el.style.width = '0%';
    setTimeout(() => { el.style.width = el.getAttribute('data-width'); }, 400);
  });
}

/* ── INIT ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  renderGroupsList();
  renderPolls();
  renderReminders();
  checkHomeBanner();
  if (getPIN()) { const lbl=document.getElementById('pin-settings-label'); if(lbl) lbl.textContent='Change PIN'; }
  bootApp();
  // Show wedding tab if already activated
  if (typeof WEDDING_STATE !== 'undefined' && WEDDING_STATE.activated) {
    const wt = document.getElementById('main-tab-wedding');
    if (wt) wt.style.display = 'flex';
  }
  // Set daily tasks today label when visited
  const dtLabel = document.getElementById('daily-today-label');
  if (dtLabel) dtLabel.textContent = new Date().toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric'});

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
  p2:     localStorage.getItem('at_wed_p2')     || 'Seph',
  date:   localStorage.getItem('at_wed_date')   || '2025-12-15',
  venue:  localStorage.getItem('at_wed_venue')  || 'The Ruins, Bacolod',
  budget: parseInt(localStorage.getItem('at_wed_budget') || '350000'),
};

function activateWedding() {
  // Show wedding tab if called from shell
  if (document.getElementById('app-shell')?.classList.contains('active')) {
    WEDDING_STATE.activated = true;
    document.getElementById('main-tab-wedding').style.display = 'flex';
    switchMainTab('wedding');
    return;
  }
  if (WEDDING_STATE.activated) {
    navTo('wedding');
  } else {
    openModal('activate-wedding-modal');
  }
}

function doActivateWedding() {
  const p1    = document.getElementById('wed-p1')?.value.trim()     || 'Jhoan';
  const p2    = document.getElementById('wed-p2')?.value.trim()     || 'Seph';
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
  const wt = document.getElementById('main-tab-wedding');
  if (wt) wt.style.display = 'flex';
  if (document.getElementById('app-shell')?.classList.contains('active')) {
    switchMainTab('wedding');
  } else {
    setTimeout(() => navTo('wedding'), 420);
  }
  showToast('💍 Wedding Planner activated!');
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
let _couplePayer  = 'maria';
let _coupleSplit  = 'equal';

function openCoupleExpenseModal() { openModal('couple-expense-modal'); }

function selectCoupleIcon(btn, icon) {
  _coupleIcon = icon;
  document.querySelectorAll('#couple-expense-modal .icon-pick-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
}

function selectCouplePayer(who) {
  _couplePayer = who;
  ['maria','jc'].forEach(k => {
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

/* ═══════════════════════════════════════════════
   IDIOT ERRAND BOARD — app.js
   ═══════════════════════════════════════════════ */

/* ── STATE ───────────────────────────────────── */
let ERRAND_LISTS = JSON.parse(localStorage.getItem('at_errand_lists') || '[]');
// list: { id, name, emoji, createdAt, items:[], archived:false }
// item: { id, name, qty, price, aisle, note, photo, done, skipped }

let _errandActiveList = null;  // id of currently open list
let _errandSwipeIdx   = 0;     // index of card being viewed
let _errandMode       = 'build'; // 'build' | 'swipe'

function saveErrands() { localStorage.setItem('at_errand_lists', JSON.stringify(ERRAND_LISTS)); }

/* ── INIT ────────────────────────────────────── */
function initErrandBoard() {
  _errandMode = 'build';
  _errandActiveList = null;
  renderErrandHome();
}

/* ── HOME: list of grocery runs ─────────────── */
function renderErrandHome() {
  const el = document.getElementById('errand-home');
  if (!el) return;
  el.style.display = 'block';
  document.getElementById('errand-builder').style.display  = 'none';
  document.getElementById('errand-swiper').style.display   = 'none';
  document.getElementById('errand-summary').style.display  = 'none';

  const active   = ERRAND_LISTS.filter(l => !l.archived);
  const archived = ERRAND_LISTS.filter(l =>  l.archived);

  if (!active.length && !archived.length) {
    document.getElementById('errand-list-container').innerHTML =
      '<div style="text-align:center;padding:48px 20px">'
      + '<div style="font-size:56px;margin-bottom:16px">🛒</div>'
      + '<div style="font-size:18px;font-weight:700;color:var(--ink);margin-bottom:8px">No grocery runs yet</div>'
      + '<div style="font-size:13px;color:var(--ink-4);line-height:1.6;margin-bottom:24px">Build a list, send your jowa to the store,<br>and watch them actually get the right stuff.</div>'
      + '<button onclick="openModal(\'add-errand-list-modal\')" style="padding:14px 28px;border-radius:var(--r-md);background:linear-gradient(135deg,var(--tan),var(--tan-dark));color:white;border:none;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 6px 20px rgba(201,169,110,0.3)">+ New Grocery Run</button>'
      + '</div>';
    return;
  }

  document.getElementById('errand-list-container').innerHTML =
    active.map(l => renderErrandListCard(l)).join('')
    + (archived.length ? '<div style="font-size:11px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin:16px 0 8px">Completed</div>'
      + archived.map(l => renderErrandListCard(l, true)).join('') : '');
}

function renderErrandListCard(l, dim) {
  const done  = l.items.filter(i => i.done).length;
  const total = l.items.length;
  const totalCost = l.items.reduce((a,i) => a + (i.price * i.qty), 0);
  const pct = total ? Math.round((done/total)*100) : 0;
  return '<div class="glass" style="border-radius:var(--r-md);margin-bottom:10px;overflow:hidden;opacity:'+(dim?0.6:1)+'">'
    + '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer" onclick="openErrandList('+l.id+')">'
    + '<div style="font-size:28px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:rgba(245,230,200,0.6);border-radius:12px;flex-shrink:0">'+l.emoji+'</div>'
    + '<div style="flex:1;min-width:0">'
    + '<div style="font-size:14px;font-weight:700;color:var(--ink)">'+l.name+'</div>'
    + '<div style="font-size:11.5px;color:var(--ink-4);margin-top:2px">'+total+' items · ₱'+totalCost.toLocaleString()+' est.</div>'
    + '<div style="margin-top:6px;height:4px;background:rgba(245,230,200,0.5);border-radius:4px;overflow:hidden"><div style="height:100%;border-radius:4px;background:var(--tan);width:'+pct+'%;transition:width 0.4s"></div></div>'
    + '</div>'
    + '<div style="text-align:right;flex-shrink:0">'
    + '<div style="font-size:13px;font-weight:700;color:var(--ink)">'+(pct===100?'✅':done+'/'+total)+'</div>'
    + (total && !l.archived ? '<button onclick="event.stopPropagation();startSwipe('+l.id+')" style="margin-top:6px;padding:5px 10px;border-radius:8px;border:none;background:linear-gradient(135deg,var(--tan),var(--tan-dark));color:white;font-size:11px;font-weight:700;cursor:pointer">Shop →</button>' : '')
    + '</div></div>'
    + (l.archived ? '' : '<div style="display:flex;border-top:1px solid rgba(201,169,110,0.12)">'
      + '<button onclick="event.stopPropagation();openErrandList('+l.id+')" style="flex:1;padding:9px;border:none;background:rgba(245,230,200,0.3);font-size:12px;font-weight:700;color:var(--tan-dark);cursor:pointer">✏️ Edit</button>'
      + '<button onclick="event.stopPropagation();archiveErrandList('+l.id+')" style="flex:1;padding:9px;border:none;background:rgba(232,245,237,0.3);font-size:12px;font-weight:700;color:var(--green-deep);cursor:pointer">✔ Done</button>'
      + '<button onclick="event.stopPropagation();deleteErrandList('+l.id+')" style="padding:9px 14px;border:none;background:rgba(252,232,238,0.3);font-size:13px;cursor:pointer;color:var(--pink-deep)">🗑</button>'
      + '</div>')
    + '</div>';
}

/* ── BUILDER: edit items in a list ──────────── */
function openErrandList(id) {
  _errandActiveList = id;
  _errandMode = 'build';
  document.getElementById('errand-home').style.display     = 'none';
  document.getElementById('errand-builder').style.display  = 'block';
  document.getElementById('errand-swiper').style.display   = 'none';
  document.getElementById('errand-summary').style.display  = 'none';
  renderErrandBuilder();
}

function renderErrandBuilder() {
  const list = ERRAND_LISTS.find(l => l.id === _errandActiveList);
  if (!list) return;
  const el = document.getElementById('errand-builder');

  document.getElementById('errand-builder-title').textContent = list.emoji + ' ' + list.name;
  const totalEst = list.items.reduce((a,i) => a + (i.price * i.qty), 0);
  document.getElementById('errand-builder-total').textContent = '₱' + totalEst.toLocaleString() + ' est.';

  const itemsEl = document.getElementById('errand-items-list');
  if (!list.items.length) {
    itemsEl.innerHTML = '<div style="text-align:center;padding:28px;font-size:13px;color:var(--ink-4)">No items yet — add your first!</div>';
  } else {
    itemsEl.innerHTML = list.items.map(item => renderBuilderItem(item, list.id)).join('');
  }
}

function renderBuilderItem(item, listId) {
  const lineTotal = item.price * item.qty;
  return '<div class="glass" id="bi-'+item.id+'" style="border-radius:var(--r-md);margin-bottom:8px;overflow:hidden">'
    + '<div style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px">'
    + (item.photo
      ? '<img src="'+item.photo+'" style="width:52px;height:52px;border-radius:10px;object-fit:cover;flex-shrink:0">'
      : '<div onclick="pickItemPhoto('+listId+','+item.id+')" style="width:52px;height:52px;border-radius:10px;background:rgba(245,230,200,0.5);border:1.5px dashed rgba(201,169,110,0.4);display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;font-size:20px">📷</div>')
    + '<div style="flex:1;min-width:0">'
    + '<div style="font-size:14px;font-weight:700;color:var(--ink)">'+item.name+'</div>'
    + '<div style="font-size:11.5px;color:var(--ink-4);margin-top:2px">'
    + 'x'+item.qty+' · ₱'+item.price.toLocaleString()+' ea · <b style="color:var(--tan-dark)">₱'+lineTotal.toLocaleString()+'</b>'
    + (item.aisle ? ' · <span style="background:rgba(245,230,200,0.7);padding:1px 6px;border-radius:4px;font-size:10.5px">Aisle '+item.aisle+'</span>' : '')
    + '</div>'
    + (item.note ? '<div style="font-size:11px;color:var(--ink-4);margin-top:3px;font-style:italic">'+item.note+'</div>' : '')
    + '</div>'
    + '<button onclick="removeErrandItem('+listId+','+item.id+')" style="width:26px;height:26px;border-radius:7px;border:none;background:rgba(224,120,152,0.12);font-size:12px;cursor:pointer;color:var(--pink-deep);flex-shrink:0">✕</button>'
    + '</div></div>';
}

/* ── SWIPER ──────────────────────────────────── */
function startSwipe(id) {
  _errandActiveList = id;
  _errandMode = 'swipe';
  _errandSwipeIdx = 0;
  const list = ERRAND_LISTS.find(l => l.id === id);
  // Reset done/skipped for fresh run
  list.items.forEach(i => { i.done = false; i.skipped = false; });
  saveErrands();
  document.getElementById('errand-home').style.display    = 'none';
  document.getElementById('errand-builder').style.display = 'none';
  document.getElementById('errand-summary').style.display = 'none';
  document.getElementById('errand-swiper').style.display  = 'block';
  renderSwipeCard();
}

function renderSwipeCard() {
  const list   = ERRAND_LISTS.find(l => l.id === _errandActiveList);
  const undone = list.items.filter(i => !i.done && !i.skipped);
  const el     = document.getElementById('swipe-card-wrap');
  const prog   = document.getElementById('swipe-progress');
  const done   = list.items.filter(i => i.done).length;
  const total  = list.items.length;

  prog.textContent = done + ' / ' + total + ' got';
  document.getElementById('swipe-progress-bar').style.width = total ? Math.round((done/total)*100)+'%' : '0%';

  if (!undone.length) {
    // All done or skipped — show summary
    showSwipeSummary();
    return;
  }

  const item = undone[0];
  const lineTotal = item.price * item.qty;

  el.innerHTML = '<div class="swipe-card glass-cream" id="active-swipe-card">'
    + (item.photo ? '<img src="'+item.photo+'" style="width:100%;height:200px;object-fit:cover;border-radius:var(--r-md);margin-bottom:14px">' : '<div style="width:100%;height:140px;border-radius:var(--r-md);background:rgba(245,230,200,0.4);display:flex;align-items:center;justify-content:center;font-size:56px;margin-bottom:14px">🛒</div>')
    + '<div style="font-size:22px;font-weight:800;color:var(--ink);margin-bottom:6px">'+item.name+'</div>'
    + (item.note ? '<div style="font-size:13px;color:var(--ink-3);margin-bottom:10px;font-style:italic">'+item.note+'</div>' : '')
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'
    + '<span class="swipe-badge">🔢 x'+item.qty+'</span>'
    + '<span class="swipe-badge">💰 ₱'+item.price.toLocaleString()+' ea</span>'
    + '<span class="swipe-badge swipe-badge-total">₱'+lineTotal.toLocaleString()+' total</span>'
    + (item.aisle ? '<span class="swipe-badge swipe-badge-aisle">📍 Aisle '+item.aisle+'</span>' : '')
    + '</div>'
    + '<div style="font-size:11px;color:var(--ink-4);text-align:center">'+undone.length+' item'+(undone.length!==1?'s':'')+' left</div>'
    + '</div>';

  // Bind swipe gestures
  bindSwipeGestures(item.id);
}

function bindSwipeGestures(itemId) {
  const card = document.getElementById('active-swipe-card');
  if (!card) return;
  let startX = 0, curX = 0, dragging = false;

  const onStart = e => {
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    dragging = true; card.style.transition = 'none';
  };
  const onMove = e => {
    if (!dragging) return;
    curX = (e.touches ? e.touches[0].clientX : e.clientX) - startX;
    card.style.transform = 'translateX('+curX+'px) rotate('+(curX*0.03)+'deg)';
    card.style.opacity = String(1 - Math.abs(curX)/400);
    const hint = document.getElementById('swipe-hint');
    if (hint) { hint.textContent = curX > 40 ? '✅ Got it!' : curX < -40 ? '⏭ Skip' : ''; hint.style.color = curX > 40 ? 'var(--green-deep)' : 'var(--pink-deep)'; }
  };
  const onEnd = () => {
    dragging = false;
    card.style.transition = 'transform 0.3s, opacity 0.3s';
    if (curX > 80)       { animateSwipe('right', itemId); }
    else if (curX < -80) { animateSwipe('left',  itemId); }
    else { card.style.transform = ''; card.style.opacity = '1'; }
  };
  card.addEventListener('touchstart', onStart, {passive:true});
  card.addEventListener('touchmove',  onMove,  {passive:true});
  card.addEventListener('touchend',   onEnd);
  card.addEventListener('mousedown',  onStart);
  card.addEventListener('mousemove',  onMove);
  card.addEventListener('mouseup',    onEnd);
}

function animateSwipe(dir, itemId) {
  const card = document.getElementById('active-swipe-card');
  if (card) {
    card.style.transition = 'transform 0.35s cubic-bezier(0.55,0,1,0.45), opacity 0.35s';
    card.style.transform = 'translateX('+(dir==='right'?'120%':'-120%')+') rotate('+(dir==='right'?'20':'-20')+'deg)';
    card.style.opacity = '0';
  }
  setTimeout(() => swipeAction(dir, itemId), 320);
}

function swipeAction(dir, itemId) {
  const list = ERRAND_LISTS.find(l => l.id === _errandActiveList);
  const item = list.items.find(i => i.id === itemId);
  if (!item) return;
  if (dir === 'right') { item.done = true;    showToast('✅ Got '+item.name+'!'); }
  else                  { item.skipped = true; showToast('⏭ Skipped '+item.name); }
  saveErrands();
  renderSwipeCard();
}

/* ── SUMMARY ─────────────────────────────────── */
function showSwipeSummary() {
  document.getElementById('errand-swiper').style.display  = 'none';
  document.getElementById('errand-summary').style.display = 'block';
  const list    = ERRAND_LISTS.find(l => l.id === _errandActiveList);
  const got     = list.items.filter(i => i.done);
  const skipped = list.items.filter(i => i.skipped);
  const total   = got.reduce((a,i) => a+(i.price*i.qty), 0);

  document.getElementById('errand-summary-content').innerHTML =
    '<div style="text-align:center;padding:20px 0 16px">'
    + '<div style="font-size:48px;margin-bottom:10px">'+(skipped.length===0?'🎉':'🛒')+'</div>'
    + '<div style="font-size:20px;font-weight:800;color:var(--ink);margin-bottom:4px">'+(skipped.length===0?'Perfect run!':'Shopping done!')+'</div>'
    + '<div style="font-size:13px;color:var(--ink-4);margin-bottom:20px">'+got.length+' items · ₱'+total.toLocaleString()+' spent</div>'
    + '</div>'
    + (got.length ? '<div style="font-size:11px;font-weight:700;color:var(--green-deep);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">✅ Got ('+got.length+')</div>'
      + got.map(i=>'<div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(232,245,237,0.5);border-radius:10px;margin-bottom:5px;font-size:13px"><span style="font-weight:600;color:var(--ink)">'+i.name+' x'+i.qty+'</span><span style="font-weight:700;color:var(--tan-dark)">₱'+(i.price*i.qty).toLocaleString()+'</span></div>').join('') : '')
    + (skipped.length ? '<div style="font-size:11px;font-weight:700;color:var(--pink-deep);text-transform:uppercase;letter-spacing:0.5px;margin:12px 0 8px">⏭ Skipped ('+skipped.length+')</div>'
      + skipped.map(i=>'<div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(252,232,238,0.4);border-radius:10px;margin-bottom:5px;font-size:13px"><span style="font-weight:600;color:var(--ink-3)">'+i.name+' x'+i.qty+'</span><span style="color:var(--ink-4)">skipped</span></div>').join('') : '')
    + '<div style="display:flex;gap:10px;margin-top:20px">'
    + '<button onclick="initErrandBoard()" style="flex:1;padding:13px;border-radius:var(--r-md);border:1.5px solid rgba(201,169,110,0.3);background:rgba(245,230,200,0.5);font-size:13px;font-weight:700;color:var(--tan-dark);cursor:pointer">← Lists</button>'
    + '<button onclick="archiveErrandList('+_errandActiveList+');initErrandBoard()" style="flex:1;padding:13px;border-radius:var(--r-md);border:none;background:linear-gradient(135deg,var(--green-accent),var(--green-deep));color:white;font-size:13px;font-weight:700;cursor:pointer">✔ Mark Done</button>'
    + '</div>';
}

/* ── HELPERS ─────────────────────────────────── */
function submitErrandList() {
  const name  = (document.getElementById('el-name')?.value||'').trim();
  if (!name) { showToast('⚠️ Enter a list name'); return; }
  const emoji = document.getElementById('el-emoji')?.value || '🛒';
  const newId = (ERRAND_LISTS.reduce((m,l)=>Math.max(m,l.id),0))+1;
  ERRAND_LISTS.push({ id:newId, name, emoji, createdAt:Date.now(), items:[], archived:false });
  saveErrands();
  closeModalById('add-errand-list-modal');
  document.getElementById('el-name').value = '';
  openErrandList(newId);
}

function submitErrandItem() {
  const list = ERRAND_LISTS.find(l => l.id === _errandActiveList);
  if (!list) return;
  const name  = (document.getElementById('ei-name')?.value||'').trim();
  if (!name) { showToast('⚠️ Enter item name'); return; }
  const qty   = parseInt(document.getElementById('ei-qty')?.value)||1;
  const price = parseFloat(document.getElementById('ei-price')?.value)||0;
  const aisle = (document.getElementById('ei-aisle')?.value||'').trim();
  const note  = (document.getElementById('ei-note')?.value||'').trim();
  const newId = (list.items.reduce((m,i)=>Math.max(m,i.id),0))+1;
  const photoVal = _errandItemPhoto || '';
  _errandItemPhoto = '';
  clearErrandPhoto();
  list.items.push({ id:newId, name, qty, price, aisle, note, photo:photoVal, done:false, skipped:false });
  saveErrands();
  closeModalById('add-errand-item-modal');
  ['ei-name','ei-qty','ei-price','ei-aisle','ei-note'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  renderErrandBuilder();
}

function removeErrandItem(listId, itemId) {
  const list = ERRAND_LISTS.find(l=>l.id===listId);
  if (!list) return;
  list.items = list.items.filter(i=>i.id!==itemId);
  saveErrands(); renderErrandBuilder();
}

function archiveErrandList(id) {
  const l = ERRAND_LISTS.find(l=>l.id===id);
  if (l) { l.archived = true; saveErrands(); }
}

function deleteErrandList(id) {
  if (!confirm('Delete this list?')) return;
  ERRAND_LISTS = ERRAND_LISTS.filter(l=>l.id!==id);
  saveErrands(); renderErrandHome();
  showToast('🗑 List deleted');
}

function pickItemPhoto(listId, itemId) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const list = ERRAND_LISTS.find(l=>l.id===listId);
      const item = list?.items.find(i=>i.id===itemId);
      if (item) { item.photo = ev.target.result; saveErrands(); renderErrandBuilder(); }
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

/* ── ERRAND ITEM PHOTO ───────────────────────── */
let _errandItemPhoto = '';

function errandPhotoUpload() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      _errandItemPhoto = ev.target.result;
      const img = document.getElementById('ei-photo-img');
      const prev = document.getElementById('ei-photo-preview');
      const clear = document.getElementById('ei-photo-clear');
      if (img)  img.src = _errandItemPhoto;
      if (prev) prev.style.display = 'block';
      if (clear) clear.style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function errandPhotoSearch() {
  const itemName = (document.getElementById('ei-name')?.value||'').trim() || 'grocery item';
  // Open Google Images in a new tab for reference — user copies image URL or screenshots
  // Show a bottom sheet with instructions + manual URL input
  const old = document.getElementById('photo-search-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'photo-search-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(44,31,14,0.35);display:flex;align-items:flex-end;justify-content:center;';
  overlay.innerHTML = `<div style="width:100%;max-width:440px;background:var(--cream);border-radius:var(--r-xl) var(--r-xl) 0 0;padding:20px 16px 32px;">
    <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:6px">🔍 Search for "${itemName}"</div>
    <div style="font-size:12.5px;color:var(--ink-4);margin-bottom:14px;line-height:1.6">Search Google Images for a reference photo, then paste the image URL below. Or go back and use Upload to take a photo.</div>
    <a href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(itemName+' grocery Philippines')}" target="_blank" style="display:block;width:100%;padding:11px;border-radius:var(--r-md);background:rgba(232,245,237,0.7);border:1px solid rgba(90,171,122,0.25);font-size:13px;font-weight:700;color:var(--green-deep);text-align:center;text-decoration:none;margin-bottom:12px">🌐 Open Google Images →</a>
    <div class="input-group" style="margin-bottom:10px"><div class="input-label">Paste Image URL</div><input type="url" id="photo-search-url" class="glass-input" placeholder="https://..."></div>
    <div style="display:flex;gap:8px">
      <button onclick="applyPhotoSearchUrl()" style="flex:2;padding:11px;border-radius:var(--r-md);background:linear-gradient(135deg,var(--tan),var(--tan-dark));color:white;border:none;font-size:13px;font-weight:700;cursor:pointer">Use This Photo</button>
      <button onclick="document.getElementById('photo-search-overlay').remove()" style="flex:1;padding:11px;border-radius:var(--r-md);background:rgba(245,230,200,0.5);border:1px solid rgba(201,169,110,0.25);font-size:13px;font-weight:700;color:var(--tan-dark);cursor:pointer">Cancel</button>
    </div>
  </div>`;
  overlay.addEventListener('click', e => { if (e.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function applyPhotoSearchUrl() {
  const url = (document.getElementById('photo-search-url')?.value||'').trim();
  if (!url) { showToast('⚠️ Paste an image URL'); return; }
  _errandItemPhoto = url;
  const img  = document.getElementById('ei-photo-img');
  const prev = document.getElementById('ei-photo-preview');
  const clear = document.getElementById('ei-photo-clear');
  if (img) { img.src = url; img.onerror = () => { img.src=''; showToast('⚠️ Could not load that URL'); }; }
  if (prev) prev.style.display = 'block';
  if (clear) clear.style.display = 'inline-block';
  document.getElementById('photo-search-overlay')?.remove();
  showToast('📷 Photo set!');
}

function clearErrandPhoto() {
  _errandItemPhoto = '';
  const img  = document.getElementById('ei-photo-img');
  const prev = document.getElementById('ei-photo-preview');
  const clear = document.getElementById('ei-photo-clear');
  if (img)  img.src = '';
  if (prev) prev.style.display = 'none';
  if (clear) clear.style.display = 'none';
}

window.errandPhotoUpload  = errandPhotoUpload;
window.errandPhotoSearch  = errandPhotoSearch;
window.applyPhotoSearchUrl= applyPhotoSearchUrl;
window.clearErrandPhoto   = clearErrandPhoto;

window.initErrandBoard  = initErrandBoard;
window.openErrandList   = openErrandList;
window.startSwipe       = startSwipe;
window.swipeAction      = swipeAction;
window.submitErrandList = submitErrandList;
window.submitErrandItem = submitErrandItem;
window.removeErrandItem = removeErrandItem;
window.archiveErrandList= archiveErrandList;
window.deleteErrandList = deleteErrandList;
window.pickItemPhoto    = pickItemPhoto;
window.showSwipeSummary = showSwipeSummary;

/* ── ERRAND NAV HELPERS ──────────────────────── */
function errandBack() {
  const home    = document.getElementById('errand-home');
  const builder = document.getElementById('errand-builder');
  const swiper  = document.getElementById('errand-swiper');
  const summary = document.getElementById('errand-summary');
  if (builder?.style.display !== 'none') { errandBackToHome(); }
  else if (swiper?.style.display !== 'none') { errandBackToHome(); }
  else if (summary?.style.display !== 'none') { initErrandBoard(); }
  else { goBack(); }
}

function errandBackToHome() {
  // If there are items, offer to start swiping
  const list = ERRAND_LISTS.find(l=>l.id===_errandActiveList);
  if (list && list.items.length) { startSwipe(_errandActiveList); return; }
  initErrandBoard();
}

function getCurrentSwipeItemId() {
  const list   = ERRAND_LISTS.find(l=>l.id===_errandActiveList);
  if (!list) return -1;
  const undone = list.items.filter(i=>!i.done&&!i.skipped);
  return undone.length ? undone[0].id : -1;
}

window.errandBack            = errandBack;
window.errandBackToHome      = errandBackToHome;
window.getCurrentSwipeItemId = getCurrentSwipeItemId;

/* ═══════════════════════════════════════════════
   SAAN TAYO — Category-first place discovery
   ═══════════════════════════════════════════════ */

const SAAN_CATS = {
  group: [
    { id:'restaurants', emoji:'🍽', label:'Restaurants',      color:'rgba(245,230,200,0.7)',  border:'rgba(201,169,110,0.3)'  },
    { id:'bars',        emoji:'🍸', label:'Bars & Nightlife', color:'rgba(208,200,255,0.5)',  border:'rgba(140,120,240,0.3)'  },
    { id:'beach',       emoji:'🏖', label:'Beach Getaway',    color:'rgba(200,240,250,0.5)',  border:'rgba(80,170,210,0.3)'   },
    { id:'hotels',      emoji:'🏨', label:'Hotels & Stays',   color:'rgba(252,232,238,0.6)',  border:'rgba(224,120,152,0.25)' },
    { id:'recreation',  emoji:'🎮', label:'Recreation',       color:'rgba(232,245,237,0.7)',  border:'rgba(90,171,122,0.3)'   },
    { id:'cafes',       emoji:'☕', label:'Cafés & Chill',    color:'rgba(245,230,200,0.5)',  border:'rgba(180,140,80,0.3)'   },
    { id:'ktv',         emoji:'🎤', label:'KTV & Karaoke',    color:'rgba(255,230,200,0.6)',  border:'rgba(230,140,60,0.3)'   },
    { id:'daytrips',    emoji:'🌿', label:'Day Trips',        color:'rgba(220,245,220,0.6)',  border:'rgba(70,160,80,0.3)'    },
  ],
  jowa: [
    { id:'datenight',   emoji:'🌹', label:'Date Night',       color:'rgba(252,232,238,0.7)',  border:'rgba(224,120,152,0.3)'  },
    { id:'staycation',  emoji:'🏨', label:'Staycation',       color:'rgba(245,230,200,0.7)',  border:'rgba(201,169,110,0.3)'  },
    { id:'finedining',  emoji:'🍣', label:'Fine Dining',      color:'rgba(252,240,220,0.7)',  border:'rgba(210,160,60,0.3)'   },
    { id:'spa',         emoji:'🌿', label:'Spa & Wellness',   color:'rgba(220,245,220,0.6)',  border:'rgba(70,160,80,0.3)'    },
    { id:'adventure',   emoji:'🏄', label:'Adventure',        color:'rgba(200,240,250,0.5)',  border:'rgba(80,170,210,0.3)'   },
    { id:'cafes',       emoji:'☕', label:'Cafés & Chill',    color:'rgba(245,230,200,0.5)',  border:'rgba(180,140,80,0.3)'   },
    { id:'resort',      emoji:'🏝', label:'Beach Resort',     color:'rgba(200,240,250,0.5)',  border:'rgba(80,170,210,0.3)'   },
    { id:'classic',     emoji:'🎬', label:'Classic Date',     color:'rgba(208,200,255,0.5)',  border:'rgba(140,120,240,0.3)'  },
  ],
};

const SAAN_PLACES = {
  restaurants: [
    { name:'The Grid Food Market', loc:'Quezon City', price:'₱₱', desc:'Hip food hall — every group finds something.', link:'https://thegrid.com.ph', emoji:'🍜', tag:'Casual' },
    { name:'Manam Comfort Filipino', loc:'BGC / Greenbelt', price:'₱₱', desc:'Modern Filipino comfort food. Always a winner.', link:'https://manam.com.ph', emoji:'🍛', tag:'Filipino' },
    { name:'Yabu House of Katsu', loc:'Multiple Branches', price:'₱₱₱', desc:'Premium katsu — crowd pleaser every time.', link:'https://yabu.ph', emoji:'🍱', tag:'Japanese' },
    { name:'Vikings Luxury Buffet', loc:'SM Malls Nationwide', price:'₱₱₱', desc:'Unlimited buffet — perfect for big groups.', link:'https://vikings.ph', emoji:'🍽', tag:'Buffet' },
    { name:'Ramen Nagi', loc:'BGC / Greenbelt', price:'₱₱', desc:'Rich tonkotsu broth. Long lines, worth it.', link:'https://ramennagi.com.ph', emoji:'🍜', tag:'Japanese' },
  ],
  bars: [
    { name:'Palace Pool Club', loc:'BGC, Taguig', price:'₱₱₱', desc:'Open-air pool party venue. Book a cabana.', link:'https://palace.com.ph', emoji:'🎉', tag:'Party' },
    { name:'Niner Ichi Nana', loc:'Mandaluyong', price:'₱₱₱', desc:'Rooftop bar with Manila skyline views.', link:'https://ninerichi.com', emoji:'🍸', tag:'Rooftop' },
    { name:'Okada Manila', loc:'Parañaque', price:'₱₱₱₱', desc:'World-class entertainment complex. Full night out.', link:'https://okadamanila.com', emoji:'🎰', tag:'Night Out' },
    { name:'XX XX (Double Cross)', loc:'Bonifacio High St', price:'₱₱₱', desc:'Hip gastropub — great food and drinks.', link:'https://bgc.com.ph', emoji:'🍺', tag:'Gastropub' },
  ],
  beach: [
    { name:'El Nido Resorts', loc:'Palawan', price:'₱₱₱₱', desc:'World-class islands. Best for barkada trip.', link:'https://elnidoresorts.com', emoji:'🌊', tag:'Island' },
    { name:'Anvaya Cove', loc:'Morong, Bataan', price:'₱₱₱', desc:'Private beach resort — 2hrs from Manila.', link:'https://anvayacove.com', emoji:'🏖', tag:'Beach Club' },
    { name:'La Luz Beach Resort', loc:'San Juan, Batangas', price:'₱₱', desc:'Coral-rich shore. Great for snorkeling.', link:'https://laluzbeach.com', emoji:'🤿', tag:'Dive Spot' },
    { name:'Lagen Island Resort', loc:'El Nido, Palawan', price:'₱₱₱₱', desc:'Eco-friendly island lodge. Pristine waters.', link:'https://elnidoresorts.com/lagen', emoji:'🏝', tag:'Eco Resort' },
  ],
  hotels: [
    { name:'Crimson Hotel Filinvest', loc:'Alabang', price:'₱₱₱', desc:'Great pool, day-use packages available.', link:'https://crimsonhotel.com', emoji:'🏩', tag:'Staycation' },
    { name:'Seda BGC', loc:'BGC, Taguig', price:'₱₱₱', desc:'Business district luxury. Central location.', link:'https://sedahotels.com', emoji:'🏨', tag:'Boutique' },
    { name:'The Bayleaf Intramuros', loc:'Manila', price:'₱₱₱', desc:'Historic location, rooftop bar with bay views.', link:'https://thebayleaf.com.ph', emoji:'🌅', tag:'Heritage' },
    { name:'Bohol Beach Club', loc:'Panglao, Bohol', price:'₱₱₱', desc:'Beachfront resort. White sand, turquoise water.', link:'https://boholbeachclub.com.ph', emoji:'🌴', tag:'Beach' },
  ],
  recreation: [
    { name:'Escape Room Philippines', loc:'Makati / BGC', price:'₱₱', desc:'Multiple themed rooms. Perfect barkada challenge.', link:'https://escaperoomph.com', emoji:'🔐', tag:'Indoor' },
    { name:'Sandbox at Alviera', loc:'Pampanga', price:'₱₱', desc:'Zipline, ATV, outdoor fun. Great for groups.', link:'https://sandboxatAlviera.com', emoji:'🏄', tag:'Outdoor' },
    { name:'Clip n Climb', loc:'BGC, Taguig', price:'₱₱', desc:'Indoor climbing walls. All skill levels welcome.', link:'https://clipnclimb.com.ph', emoji:'🧗', tag:'Active' },
    { name:'KidZania Manila', loc:'Bonifacio High St', price:'₱₱', desc:'Fun for the whole family — adults included.', link:'https://kidzania.com.ph', emoji:'🎡', tag:'Family' },
  ],
  cafes: [
    { name:'Wildflour Café', loc:'BGC / Salcedo', price:'₱₱', desc:'Artisanal bakes and great coffee. Relaxed vibe.', link:'https://wildflour.com.ph', emoji:'☕', tag:'Artisanal' },
    { name:'Saturday Café', loc:'Makati', price:'₱', desc:'Cozy, homey café. Laptop-friendly.', link:'https://saturdaycafe.com.ph', emoji:'🧁', tag:'Cozy' },
    { name:'Commune', loc:'Legazpi Village, Makati', price:'₱₱', desc:'Garden café in the middle of the city.', link:'https://communecafe.ph', emoji:'🌿', tag:'Garden' },
    { name:'Hey Handsome Coffee', loc:'BGC', price:'₱₱', desc:'Specialty coffee roasters. Third-wave café culture.', link:'https://heyhandsomecoffee.com', emoji:'☕', tag:'Specialty' },
  ],
  ktv: [
    { name:'Red Box Karaoke', loc:'Multiple Branches', price:'₱₱', desc:'Private rooms, great song selection, affordable.', link:'https://redboxkaraoke.com.ph', emoji:'🎤', tag:'Classic KTV' },
    { name:'Opus Clubbing', loc:'BGC, Taguig', price:'₱₱₱₱', desc:'Premier nightclub. Big names, big nights.', link:'https://opusclubbing.com', emoji:'🎧', tag:'Club' },
    { name:'PRIVE Luxury Club', loc:'BGC', price:'₱₱₱₱', desc:'Upscale nightclub. Bottle service available.', link:'https://priveclubmanila.com', emoji:'🥂', tag:'Luxury' },
    { name:'Music Museum', loc:'Greenhills, San Juan', price:'₱₱₱', desc:'Live concerts and events. Check schedule.', link:'https://musicmuseummanila.com', emoji:'🎵', tag:'Live Music' },
  ],
  daytrips: [
    { name:'Tagaytay Ridge', loc:'Tagaytay City', price:'₱₱', desc:'Cool weather, Taal views, great bulalo.', link:'https://tagaytay.gov.ph', emoji:'🌋', tag:'Scenic' },
    { name:'Villa Escudero', loc:'San Pablo, Laguna', price:'₱₱₱', desc:'Waterfall dining. Unique Philippine experience.', link:'https://villaescudero.com.ph', emoji:'🌴', tag:'Cultural' },
    { name:'Pinto Art Museum', loc:'Antipolo', price:'₱', desc:'Stunning art complex. Great for couples too.', link:'https://pintoartmuseum.com', emoji:'🎨', tag:'Culture' },
    { name:'Masungi Georeserve', loc:'Rizal', price:'₱₱₱', desc:'Guided trail through limestone karst. Book ahead.', link:'https://masungigeoreserve.com', emoji:'🏔', tag:'Nature' },
  ],
  // Jowa categories
  datenight: [
    { name:'Impressions Restaurant', loc:'Manila', price:'₱₱₱₱', desc:'Tableside magic show dining. Unforgettable.', link:'https://impressions.com.ph', emoji:'✨', tag:'Unique' },
    { name:'Il Ponticello', loc:'Kapitolyo, Pasig', price:'₱₱₱', desc:'Italian trattoria with romantic garden seating.', link:'https://ilponticello.com.ph', emoji:'🍝', tag:'Italian' },
    { name:'Gallery VASK', loc:'BGC, Taguig', price:'₱₱₱₱', desc:'Spanish-Filipino tasting menu. Michelin-level.', link:'https://galleryvask.com', emoji:'🌟', tag:'Fine Dining' },
    { name:'The Ruins at Sunset', loc:'Talisay, Bacolod', price:'₱₱', desc:'Dinner among ruins at golden hour. Magical.', link:'https://theruins.com.ph', emoji:'🏛', tag:'Iconic' },
  ],
  staycation: [
    { name:'Canvas Hotel Manila', loc:'BGC, Taguig', price:'₱₱₱', desc:'Artsy boutique hotel. Stunning skyline views.', link:'https://canvashotel.ph', emoji:'🎨', tag:'Boutique' },
    { name:'The Peninsula Manila', loc:'Makati', price:'₱₱₱₱', desc:'Iconic luxury. Perfect anniversary treat.', link:'https://manila.peninsula.com', emoji:'🏨', tag:'Luxury' },
    { name:'Hue Hotels', loc:'Puerto Princesa, Palawan', price:'₱₱₱', desc:'Stylish hotel close to underground river.', link:'https://huehotels.com', emoji:'🌅', tag:'Resort Town' },
    { name:'Acacia Hotel Manila', loc:'Alabang', price:'₱₱₱', desc:'Full resort facilities. Day-use available.', link:'https://acaciahotelmanila.com', emoji:'🌿', tag:'All-In' },
  ],
  finedining: [
    { name:'Nobu Restaurant', loc:'BGC, Taguig', price:'₱₱₱₱', desc:'World-renowned Japanese fusion. Book in advance.', link:'https://noburestaurants.com', emoji:'🍣', tag:'Japanese' },
    { name:'Francés', loc:'Quezon City', price:'₱₱₱', desc:'Filipino-Spanish fusion. Intimate and elegant.', link:'https://frances.com.ph', emoji:'🥂', tag:'Fusion' },
    { name:'10/10 Restaurant', loc:'BGC, Taguig', price:'₱₱₱₱', desc:'Award-winning modern Filipino cuisine.', link:'https://1010.com.ph', emoji:'🌟', tag:'Modern PH' },
    { name:'Lusso', loc:'Fairmont Makati', price:'₱₱₱₱', desc:'European fine dining. Stunning hotel setting.', link:'https://fairmont.com/manila', emoji:'✨', tag:'European' },
  ],
  spa: [
    { name:'Nurture Wellness Village', loc:'Tagaytay', price:'₱₱₱', desc:'Couples spa retreat. Full weekend packages.', link:'https://nurture.com.ph', emoji:'🌿', tag:'Retreat' },
    { name:'The Farm at San Benito', loc:'Batangas', price:'₱₱₱₱', desc:'Holistic wellness resort. Detox together.', link:'https://thefarm.com.ph', emoji:'🌱', tag:'Holistic' },
    { name:'CHI, The Spa Shangri-La', loc:'Makati', price:'₱₱₱₱', desc:'Serene luxury spa. In-hotel sanctuary.', link:'https://shangri-la.com', emoji:'🧘', tag:'Luxury Spa' },
    { name:'Mandala Spa', loc:'Boracay', price:'₱₱₱', desc:'Hilltop tranquility. Iconic Boracay experience.', link:'https://mandalaspa.com', emoji:'🌺', tag:'Island Spa' },
  ],
  adventure: [
    { name:'Masungi Georeserve', loc:'Rizal', price:'₱₱₱', desc:'Unique limestone trail. Book weeks ahead.', link:'https://masungigeoreserve.com', emoji:'🏔', tag:'Nature' },
    { name:'Canyoneering Kawasan', loc:'Badian, Cebu', price:'₱₱', desc:'Cliff jumping and waterfall adventure.', link:'https://cebu-adventures.com', emoji:'🌊', tag:'Extreme' },
    { name:'ATV Ride Mt. Pinatubo', loc:'Capas, Tarlac', price:'₱₱', desc:'All-terrain vehicle ride to crater lake.', link:'https://pinatubo.ph', emoji:'🚵', tag:'ATV' },
    { name:'Batad Rice Terraces', loc:'Banaue, Ifugao', price:'₱₱', desc:'Trek to UNESCO heritage site. Breathtaking.', link:'https://banaue.gov.ph', emoji:'🌾', tag:'Trek' },
  ],
  resort: [
    { name:'Balesin Island Club', loc:'Quezon', price:'₱₱₱₱', desc:'Private island. Multiple themed villages.', link:'https://balesin.com', emoji:'🏝', tag:'Exclusive' },
    { name:'Crimson Resort Mactan', loc:'Cebu', price:'₱₱₱₱', desc:'Beachfront resort. Honeymoon suite available.', link:'https://crimsonhotel.com/mactan', emoji:'🌅', tag:'Beachfront' },
    { name:'Acuaverde Beach Resort', loc:'Laiya, Batangas', price:'₱₱', desc:'Quiet dive resort. Affordable weekend escape.', link:'https://acuaverde.com', emoji:'🤿', tag:'Dive Resort' },
    { name:'Club Paradise Palawan', loc:'Coron, Palawan', price:'₱₱₱₱', desc:'World-class snorkeling and island beauty.', link:'https://clubparadisepalawan.com', emoji:'🐠', tag:'Dive Paradise' },
  ],
  classic: [
    { name:'Cinema 76 Film Society', loc:'Quezon City', price:'₱', desc:'Art house cinema. Watch something different.', link:'https://cinema76.com.ph', emoji:'🎬', tag:'Arthouse' },
    { name:'Pinto Art Museum', loc:'Antipolo', price:'₱', desc:'Stunning art complex. Perfect Sunday date.', link:'https://pintoartmuseum.com', emoji:'🎨', tag:'Art' },
    { name:'Ayala Museum', loc:'Greenbelt 4, Makati', price:'₱₱', desc:'Philippine history and contemporary art.', link:'https://ayalamuseum.org', emoji:'🏛', tag:'Museum' },
    { name:'BGC Arts Center', loc:'BGC, Taguig', price:'₱₱', desc:'Live theater and art exhibitions. Check schedule.', link:'https://bgcartsph.com', emoji:'🎭', tag:'Theater' },
  ],
};

// Quick category pills per group type
const SAAN_QUICK = {
  group: ['restaurants','recreation','beach'],
  jowa:  ['datenight','staycation','spa'],
};

let _saanGroupType = 'group';

function openSaanTayo() {
  const group = getActiveGroup();
  _saanGroupType = group?.type === 'jowa' ? 'jowa' : 'group';
  const cats = SAAN_CATS[_saanGroupType];

  // Update title
  const title = document.getElementById('saan-screen-title');
  if (title) title.textContent = _saanGroupType === 'jowa' ? '💕 Date Ideas' : '🗺 Saan Tayo?';
  const ctx = document.getElementById('saan-context-label');
  if (ctx) ctx.textContent = _saanGroupType === 'jowa'
    ? 'Find the perfect date spot for you two'
    : 'Find the perfect place for your group';

  // Render category grid
  const grid = document.getElementById('saan-cat-grid');
  if (grid) grid.innerHTML = cats.map(c => `
    <div onclick="openSaanCategory('${c.id}')" style="
      padding:18px 14px;border-radius:var(--r-md);cursor:pointer;text-align:center;
      background:${c.color};border:1px solid ${c.border};
      transition:transform 0.15s;
    ">
      <div style="font-size:32px;margin-bottom:8px">${c.emoji}</div>
      <div style="font-size:13px;font-weight:700;color:var(--ink)">${c.label}</div>
    </div>`).join('');

  // Show categories, hide places
  document.getElementById('saan-categories').style.display = 'block';
  document.getElementById('saan-places').style.display = 'none';

  ALL_SCREENS.includes('saan-tayo') || ALL_SCREENS.push('saan-tayo');
  navTo('saan-tayo');
}

function openSaanCategory(catId) {
  const cats = SAAN_CATS[_saanGroupType];
  const cat  = cats.find(c => c.id === catId);
  const places = SAAN_PLACES[catId] || [];

  const title = document.getElementById('saan-places-title');
  if (title) title.textContent = (cat?.emoji||'') + ' ' + (cat?.label||catId);

  const list = document.getElementById('saan-places-list');
  if (list) list.innerHTML = !places.length
    ? '<div style="text-align:center;padding:40px;font-size:13px;color:var(--ink-4)">More places coming soon!</div>'
    : places.map(p => `
      <div class="glass" style="border-radius:var(--r-md);margin-bottom:10px;overflow:hidden">
        <div style="display:flex;align-items:flex-start;gap:12px;padding:14px">
          <div style="width:52px;height:52px;border-radius:14px;background:${cat?.color||'rgba(245,230,200,0.5)'};display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;border:1px solid ${cat?.border||'rgba(201,169,110,0.2)'}">${p.emoji}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:3px">${p.name}</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:5px">
              <span style="font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:5px;background:rgba(245,230,200,0.7);color:var(--tan-dark)">${p.tag}</span>
              <span style="font-size:10.5px;padding:2px 7px;border-radius:5px;background:rgba(255,253,248,0.8);color:var(--ink-4)">📍 ${p.loc}</span>
              <span style="font-size:10.5px;padding:2px 7px;border-radius:5px;background:rgba(255,253,248,0.8);color:var(--ink-4)">${p.price}</span>
            </div>
            <div style="font-size:12px;color:var(--ink-3);line-height:1.5">${p.desc}</div>
          </div>
        </div>
        <div style="display:flex;border-top:1px solid rgba(201,169,110,0.1)">
          <button onclick="window.saveSaanPlace('${catId}','${p.name.replace(/'/g,'')}')" style="flex:1;padding:10px;border:none;background:rgba(245,230,200,0.3);font-size:12px;font-weight:700;color:var(--tan-dark);cursor:pointer">❤️ Save</button>
          <button onclick="window.pinPlaceToMap('${p.name.replace(/'/g,'')}','${catId}')" style="flex:1;padding:10px;border:none;background:rgba(232,245,237,0.3);font-size:12px;font-weight:700;color:var(--green-deep);cursor:pointer">📍 Pin</button>
          <a href="${p.link}" target="_blank" style="flex:2;padding:10px;background:rgba(208,200,255,0.2);font-size:12px;font-weight:700;color:var(--ink-3);text-decoration:none;text-align:center;display:flex;align-items:center;justify-content:center">→ Visit</a>
        </div>
      </div>`).join('');

  document.getElementById('saan-categories').style.display = 'none';
  document.getElementById('saan-places').style.display = 'block';
}

function closeSaanPlaces() {
  document.getElementById('saan-categories').style.display = 'block';
  document.getElementById('saan-places').style.display = 'none';
}

function saveSaanPlace(catId, name) {
  showToast('❤️ ' + name + ' saved!');
}

function pinPlaceToMap(name, catId) {
  const group = getActiveGroup();
  if (!group) { showToast('⚠️ Open a group first'); return; }
  if (!group.pins) group.pins = [];
  if (group.pins.length >= 5) { showToast('📍 Max 5 pins per group. Remove one first.'); return; }
  if (group.pins.find(p=>p.name===name)) { showToast('Already pinned!'); return; }
  // Default coords for Philippines — user can drag/refine on map
  group.pins.push({ id:'pin_'+Date.now(), name, type:'pinOther', note:catId, lat:12.8797, lng:121.7740 });
  saveGroups();
  showToast('📍 '+name+' pinned! Open Map tab to see it.');
}
window.pinPlaceToMap = pinPlaceToMap;

// Render quick category pills on the saan-top-card
function updateGroupHeroStats(group) {
  const total = (group.expenses || []).reduce((s, e) => {
    if (e.memberPayments) return s + e.memberPayments.reduce((a, p) => a + (parseFloat(p.amount) || 0), 0);
    return s + (parseFloat(e.amount) || 0);
  }, 0);
  const doneTasks  = (group.tasks || []).filter(t => t.status === 'done').length;
  const totalTasks = (group.tasks || []).length;
  const owner      = group.members.find(m => m.isOwner);
  let ownerBal = 0;
  if (owner) {
    calcSettlement(group).forEach(s => {
      if (s.toName === owner.name) ownerBal += s.amount;
      if (s.fromName === owner.name) ownerBal -= s.amount;
    });
  }
  const tasksEl  = document.getElementById('hero-tasks');
  const budgetEl = document.getElementById('hero-budget');
  const spentEl  = document.getElementById('hero-spent');
  const owedEl   = document.getElementById('hero-owed');
  if (tasksEl)  tasksEl.textContent  = totalTasks > 0 ? `${doneTasks}/${totalTasks}` : '0';
  if (budgetEl) budgetEl.textContent = group.budget > 0 ? '₱' + group.budget.toLocaleString() : '—';
  if (spentEl)  spentEl.textContent  = '₱' + total.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (owedEl) {
    owedEl.textContent = (ownerBal >= 0 ? '₱' : '-₱') + Math.abs(ownerBal).toLocaleString(undefined, { maximumFractionDigits: 0 });
    owedEl.style.color = ownerBal >= 0 ? 'var(--green-deep)' : 'var(--danger)';
  }
}

function renderTaskMemberPickerFor(group) {
  const container = document.getElementById('task-assign-picker');
  if (!container) return;
  container.innerHTML = group.members.map((m, i) => {
    const sel = i === 0;
    return `<button class="task-member-btn${sel?' selected':''}" onclick="selectTaskMember(this,'${m.id}')"
      style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px;border-radius:var(--r-md);cursor:pointer;border:1.5px solid ${sel?'rgba(201,169,110,0.45)':'rgba(255,255,255,0.5)'};background:${sel?'rgba(245,230,200,0.55)':'rgba(255,255,255,0.45)'}">
      <div class="member-av ${m.color}" style="width:36px;height:36px;border-radius:10px;font-size:12px">${m.id}</div>
      <span style="font-size:10px;font-weight:600;color:var(--ink-2);text-align:center;max-width:52px">${m.name.split(' ')[0]}</span>
    </button>`;
  }).join('');
  if (group.members[0]) STATE.assignedMember = group.members[0].id;
}

function deleteGroup() {
  const group = getActiveGroup();
  if (!group) return;
  if (!confirm(`Delete "${group.name}"? This cannot be undone.`)) return;
  GROUPS = GROUPS.filter(g => g.id !== group.id);
  saveGroups();
  renderGroupsList();
  closeModalById('edit-group-modal');
  goBack();
  showToast('🗑 Group deleted');
}

function renderSaanTopCard(group) {
  const isJowa = group?.type === 'jowa';
  const titleEl = document.getElementById('saan-card-title');
  if (titleEl) titleEl.textContent = isJowa ? '💕 Date Ideas' : '🗺 Saan Tayo?';
  const pillsEl = document.getElementById('saan-quick-pills');
  if (!pillsEl) return;
  const quickIds = SAAN_QUICK[isJowa ? 'jowa' : 'group'];
  const cats = SAAN_CATS[isJowa ? 'jowa' : 'group'];
  pillsEl.innerHTML = quickIds.map(id => {
    const c = cats.find(x => x.id === id);
    return `<button onclick="event.stopPropagation();_saanGroupType='${isJowa?'jowa':'group'}';openSaanCategory('${id}')" style="
      padding:5px 12px;border-radius:20px;border:1px solid ${c?.border||'rgba(201,169,110,0.3)'};
      background:${c?.color||'rgba(245,230,200,0.5)'};font-size:12px;font-weight:700;
      color:var(--ink);cursor:pointer">${c?.emoji||''} ${c?.label||id}</button>`;
  }).join('');
}

window.openSaanTayo     = openSaanTayo;
window.openSaanCategory = openSaanCategory;
window.closeSaanPlaces  = closeSaanPlaces;
window.saveSaanPlace    = saveSaanPlace;
window.renderSaanTopCard= renderSaanTopCard;

/* ═══════════════════════════════════════════════
   WEDDING SUPPLIER DIRECTORY
   ═══════════════════════════════════════════════ */

const SUPDIR_CATS = [
  { id:'venue',         emoji:'🏛',  label:'Venues',          color:'rgba(245,230,200,0.7)',  border:'rgba(201,169,110,0.3)'  },
  { id:'catering',      emoji:'🍽',  label:'Catering',        color:'rgba(252,240,220,0.7)',  border:'rgba(210,160,60,0.3)'   },
  { id:'photography',   emoji:'📸',  label:'Photography',     color:'rgba(208,200,255,0.5)',  border:'rgba(140,120,240,0.3)'  },
  { id:'videography',   emoji:'🎥',  label:'Videography',     color:'rgba(200,240,250,0.5)',  border:'rgba(80,170,210,0.3)'   },
  { id:'attire',        emoji:'👗',  label:'Attire & Gowns',  color:'rgba(252,232,238,0.7)',  border:'rgba(224,120,152,0.3)'  },
  { id:'florals',       emoji:'💐',  label:'Florals & Décor', color:'rgba(220,245,220,0.6)',  border:'rgba(70,160,80,0.3)'    },
  { id:'cake',          emoji:'🎂',  label:'Cake & Sweets',   color:'rgba(255,230,240,0.6)',  border:'rgba(220,120,150,0.3)'  },
  { id:'makeup',        emoji:'💄',  label:'Hair & Makeup',   color:'rgba(255,220,230,0.6)',  border:'rgba(220,100,130,0.3)'  },
  { id:'music',         emoji:'🎵',  label:'Music & Band',    color:'rgba(245,230,200,0.5)',  border:'rgba(180,140,80,0.3)'   },
  { id:'invitations',   emoji:'💌',  label:'Invitations',     color:'rgba(245,230,200,0.7)',  border:'rgba(201,169,110,0.3)'  },
  { id:'souvenirs',     emoji:'🎁',  label:'Souvenirs & Gifts',color:'rgba(230,245,255,0.6)', border:'rgba(100,160,220,0.3)'  },
  { id:'transport',     emoji:'🚗',  label:'Transport',       color:'rgba(232,245,237,0.6)',  border:'rgba(90,171,122,0.3)'   },
];

const SUPDIR_SUPPLIERS = {
  venue: [
    { name:'Fernwood Gardens', loc:'QC', price:'₱₱₱', phone:'+63 2 8929 1000', email:'events@fernwoodgardens.com', desc:'Lush garden venue. Outdoor and indoor options. Capacity up to 500 pax.', tag:'Garden' },
    { name:'The Ruins Events', loc:'Bacolod', price:'₱₱₱', phone:'+63 34 435 4859', email:'info@theruins.com.ph', desc:'Iconic heritage estate. Stunning sunset backdrop for ceremonies.', tag:'Heritage' },
    { name:'Shangri-La The Fort', loc:'BGC, Taguig', price:'₱₱₱₱', phone:'+63 2 8820 0888', email:'tlmn.events@shangri-la.com', desc:'Grand ballrooms, full hotel services, world-class catering.', tag:'Luxury Hotel' },
    { name:'Villa Escudero', loc:'San Pablo, Laguna', price:'₱₱₱', phone:'+63 2 8523 9313', email:'villaescudero@yahoo.com', desc:'Unique waterfall dining experience. Beautiful hacienda grounds.', tag:'Nature' },
  ],
  catering: [
    { name:'Hizon\'s Catering', loc:'Metro Manila', price:'₱₱₱', phone:'+63 2 8721 5888', email:'info@hizons.com.ph', desc:'One of PH\'s top caterers. 40+ years experience. Full service.', tag:'Full Service' },
    { name:'Cater Me PH', loc:'Metro Manila', price:'₱₱', phone:'+63 917 800 1234', email:'book@catermeph.com', desc:'Flexible packages for intimate to grand receptions.', tag:'Flexible' },
    { name:'Fleur de Lis Catering', loc:'Manila', price:'₱₱₱', phone:'+63 2 8556 4444', email:'events@fleurdelis.ph', desc:'French-inspired Filipino cuisine. Premium plated service.', tag:'Premium' },
  ],
  photography: [
    { name:'Nice Print Photography', loc:'Metro Manila', price:'₱₱₱', phone:'+63 917 555 1234', email:'hello@niceprintphoto.com', desc:'Award-winning wedding photographers. Cinematic and editorial style.', tag:'Editorial' },
    { name:'Jayson and Joanne', loc:'Nationwide', price:'₱₱₱₱', phone:'+63 917 123 4567', email:'book@jaysonandjoanne.com', desc:'Southeast Asia\'s most sought-after wedding photographers.', tag:'Luxury' },
    { name:'Nelwin Uy Photography', loc:'Metro Manila', price:'₱₱₱', phone:'+63 917 888 9999', email:'nelwinuystudio@gmail.com', desc:'Natural light specialist. Romantic and timeless style.', tag:'Natural' },
  ],
  videography: [
    { name:'Metrophoto Films', loc:'Metro Manila', price:'₱₱₱', phone:'+63 917 700 5555', email:'info@metrophotofilms.com', desc:'Cinematic same-day edits and full feature films.', tag:'Cinematic' },
    { name:'TheFilmCollective', loc:'Nationwide', price:'₱₱₱₱', phone:'+63 917 222 3333', email:'hello@thefilmcollective.ph', desc:'Documentary-style storytelling. Multiple award winners.', tag:'Story-driven' },
  ],
  attire: [
    { name:'Veluz Realty', loc:'Makati', price:'₱₱₱₱', phone:'+63 2 8895 4321', email:'studio@veluzrealty.com', desc:'Rajo Laurel\'s flagship studio. Bespoke couture gowns.', tag:'Couture' },
    { name:'Jojie Lloren', loc:'Makati', price:'₱₱₱₱', phone:'+63 917 321 4567', email:'jojie@llorenph.com', desc:'Modern Filipino bridal wear. Intricate details and craftsmanship.', tag:'Filipino Designer' },
    { name:'Barong Warehouse', loc:'Multiple', price:'₱₱', phone:'+63 2 8283 8888', email:'orders@barongwarehouse.com', desc:'Quality barong tagalog for groomsmen. Ready-to-wear and custom.', tag:'Barong' },
    { name:'Rental by Tita', loc:'QC / Marikina', price:'₱', phone:'+63 917 456 7890', email:'rentalbytita@gmail.com', desc:'Affordable entourage gown rentals. Wide selection.', tag:'Rental' },
  ],
  florals: [
    { name:'Creative Hands Floristry', loc:'Metro Manila', price:'₱₱₱', phone:'+63 917 600 8888', email:'info@creativehandsfloristry.com', desc:'Lush romantic arrangements. Personalized to your theme.', tag:'Romantic' },
    { name:'The Flower Studio MNL', loc:'BGC', price:'₱₱₱', phone:'+63 917 900 1111', email:'hello@theflowerstudio.ph', desc:'Contemporary botanical installations. Instagram-worthy setups.', tag:'Modern' },
    { name:'Bloom & Wild PH', loc:'Makati', price:'₱₱', phone:'+63 917 444 2222', email:'bloomandwildph@gmail.com', desc:'Fresh and dried flower arrangements. Affordable luxury.', tag:'Budget-Friendly' },
  ],
  cake: [
    { name:'Cakes by Sonja', loc:'BGC / Rockwell', price:'₱₱₱', phone:'+63 2 8856 0851', email:'sonja@cakesbysonja.com', desc:'Artisan wedding cakes. Custom designs, exquisite flavors.', tag:'Artisan' },
    { name:'Bonjour Patisserie', loc:'Makati', price:'₱₱₱', phone:'+63 917 777 3333', email:'info@bonjourpatisserie.ph', desc:'French-trained pastry chefs. Elegant tiered cakes.', tag:'French-style' },
    { name:'Sweet Estela', loc:'QC', price:'₱₱', phone:'+63 917 234 5678', email:'sweetestela@gmail.com', desc:'Homemade goodness. Custom flavors and fondant designs.', tag:'Custom' },
  ],
  makeup: [
    { name:'Yna Alcantara MUA', loc:'Metro Manila', price:'₱₱₱', phone:'+63 917 888 0000', email:'yna@ynabeauty.com', desc:'Celebrity makeup artist. Bridal and editorial specialist.', tag:'Celebrity MUA' },
    { name:'Blushed Beauty Studio', loc:'Makati', price:'₱₱₱', phone:'+63 917 555 8888', email:'book@blushedbeauty.ph', desc:'Full glam team for bride and entourage. Package deals available.', tag:'Full Team' },
    { name:'Elsa Natividad', loc:'Nationwide', price:'₱₱₱₱', phone:'+63 917 111 2222', email:'elsa@elsanatividad.com', desc:'TV and film makeup artist. Flawless on-camera looks.', tag:'Premium' },
  ],
  music: [
    { name:'Moonstar88', loc:'Nationwide', price:'₱₱₱₱', phone:'+63 917 345 6789', email:'booking@moonstar88.com', desc:'Iconic Filipino band. Perfect for wedding receptions.', tag:'OPM Band' },
    { name:'The Basements', loc:'Metro Manila', price:'₱₱₱', phone:'+63 917 456 0000', email:'thebsmnts@gmail.com', desc:'Corporate and wedding band. Wide song repertoire.', tag:'Cover Band' },
    { name:'DJ Rica Rivero', loc:'Metro Manila', price:'₱₱₱', phone:'+63 917 777 9999', email:'djrica@ricamusic.ph', desc:'Top wedding DJ. Creates the perfect dance floor energy.', tag:'DJ' },
    { name:'String Serenaders', loc:'Metro Manila', price:'₱₱', phone:'+63 917 123 9999', email:'strings@serenaders.ph', desc:'String quartet and ensemble. Ceremony music specialists.', tag:'Classical' },
  ],
  invitations: [
    { name:'Papercraft MNL', loc:'QC', price:'₱₱', phone:'+63 917 111 3333', email:'hello@papercraftmnl.com', desc:'Custom printed invitations. Laser cut and digital options.', tag:'Custom Print' },
    { name:'Bliss & Design Studio', loc:'Makati', price:'₱₱₱', phone:'+63 917 222 6666', email:'blissdesignstudio@gmail.com', desc:'Luxury stationery. Foil stamping and letterpress.', tag:'Luxury Stationery' },
    { name:'Canva for Weddings', loc:'Online', price:'₱', phone:'', email:'', desc:'Design your own invitations online. Free and paid templates.', tag:'DIY', link:'https://canva.com' },
  ],
  souvenirs: [
    { name:'Rustan\'s Gift Registry', loc:'Multiple', price:'₱₱₱', phone:'+63 2 8888 1234', email:'gifts@rustans.com.ph', desc:'Premium gift registry. Wide selection across categories.', tag:'Registry' },
    { name:'Giveaway Shop PH', loc:'Online / Pasig', price:'₱', phone:'+63 917 999 0000', email:'orders@giveawayshop.ph', desc:'Affordable custom souvenir items. Minimum orders available.', tag:'Affordable' },
    { name:'Casa de Crafts', loc:'Marikina', price:'₱₱', phone:'+63 917 333 4444', email:'casadecrafts@gmail.com', desc:'Handmade personalized tokens. Custom packaging available.', tag:'Handmade' },
  ],
  transport: [
    { name:'Limousine Service PH', loc:'Metro Manila', price:'₱₱₱₱', phone:'+63 2 8812 3456', email:'info@limoserviceph.com', desc:'Classic and stretch limousines. Bridal car packages.', tag:'Limo' },
    { name:'Toyota Wedding Cars', loc:'Nationwide', price:'₱₱₱', phone:'+63 917 888 4567', email:'weddings@toyota.com.ph', desc:'Premium SUV and sedan packages. Decorated bridal car.', tag:'Premium Cars' },
    { name:'Kalesa Wedding', loc:'Intramuros, Manila', price:'₱₱', phone:'+63 917 123 8888', email:'kalesa@weddingph.com', desc:'Traditional horse-drawn carriage. Unforgettable entrance.', tag:'Traditional' },
  ],
};

function initSupplierDirectory() {
  renderSupDirCategories();
}

function renderSupDirCategories() {
  document.getElementById('supdir-categories').style.display = 'block';
  document.getElementById('supdir-list-view').style.display  = 'none';
  const grid = document.getElementById('supdir-cat-grid');
  if (!grid) return;
  grid.innerHTML = SUPDIR_CATS.map(c => `
    <div onclick="openSupDirCategory('${c.id}')" style="
      padding:18px 14px;border-radius:var(--r-md);cursor:pointer;text-align:center;
      background:${c.color};border:1px solid ${c.border};transition:transform 0.15s;
    ">
      <div style="font-size:32px;margin-bottom:8px">${c.emoji}</div>
      <div style="font-size:12.5px;font-weight:700;color:var(--ink)">${c.label}</div>
    </div>`).join('');
}

function openSupDirCategory(catId) {
  const cat = SUPDIR_CATS.find(c => c.id === catId);
  const suppliers = SUPDIR_SUPPLIERS[catId] || [];
  const titleEl = document.getElementById('supdir-list-title');
  if (titleEl) titleEl.textContent = (cat?.emoji||'') + ' ' + (cat?.label||catId);
  const listEl = document.getElementById('supdir-supplier-list');
  if (listEl) listEl.innerHTML = !suppliers.length
    ? '<div style="text-align:center;padding:40px;font-size:13px;color:var(--ink-4)">More suppliers coming soon!</div>'
    : suppliers.map(s => `
      <div class="glass" style="border-radius:var(--r-md);margin-bottom:12px;overflow:hidden">
        <div style="padding:14px">
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">
            <div style="width:44px;height:44px;border-radius:12px;background:${cat?.color||'rgba(245,230,200,0.5)'};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${cat?.emoji||'📋'}</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:700;color:var(--ink)">${s.name}</div>
              <div style="display:flex;gap:5px;margin-top:3px;flex-wrap:wrap">
                <span style="font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:5px;background:rgba(245,230,200,0.7);color:var(--tan-dark)">${s.tag}</span>
                <span style="font-size:10.5px;padding:2px 7px;border-radius:5px;background:rgba(255,253,248,0.8);color:var(--ink-4)">📍 ${s.loc}</span>
                <span style="font-size:10.5px;padding:2px 7px;border-radius:5px;background:rgba(255,253,248,0.8);color:var(--ink-4)">${s.price}</span>
              </div>
            </div>
          </div>
          <div style="font-size:12.5px;color:var(--ink-3);line-height:1.5;margin-bottom:10px">${s.desc}</div>
          ${s.phone ? `<div style="font-size:12px;color:var(--ink-4);margin-bottom:4px">📞 ${s.phone}</div>` : ''}
          ${s.email ? `<div style="font-size:12px;color:var(--ink-4);margin-bottom:8px">✉️ ${s.email}</div>` : ''}
        </div>
        <div style="display:flex;border-top:1px solid rgba(201,169,110,0.12)">
          ${s.phone ? `<a href="tel:${s.phone}" style="flex:1;padding:10px;text-align:center;font-size:12.5px;font-weight:700;color:var(--green-deep);text-decoration:none;background:rgba(232,245,237,0.4)">📞 Call</a>` : ''}
          ${s.email ? `<a href="mailto:${s.email}" style="flex:1;padding:10px;text-align:center;font-size:12.5px;font-weight:700;color:var(--pink-deep);text-decoration:none;background:rgba(252,232,238,0.3)">✉️ Email</a>` : ''}
          ${s.link  ? `<a href="${s.link}" target="_blank" style="flex:1;padding:10px;text-align:center;font-size:12.5px;font-weight:700;color:var(--tan-dark);text-decoration:none;background:rgba(245,230,200,0.3)">🌐 Website</a>` : ''}
          <button onclick="addSupplierFromDir('${catId}','${s.name.replace(/'/g,'')}','${s.phone||''}','${s.email||''}')" style="flex:1;padding:10px;border:none;background:rgba(245,230,200,0.4);font-size:12px;font-weight:700;color:var(--tan-dark);cursor:pointer">➕ Quick Dial</button>
        </div>
      </div>`).join('');
  document.getElementById('supdir-categories').style.display = 'none';
  document.getElementById('supdir-list-view').style.display  = 'block';
}

function closeSupDirList() {
  document.getElementById('supdir-categories').style.display = 'block';
  document.getElementById('supdir-list-view').style.display  = 'none';
}

function addSupplierFromDir(catId, name, phone, email) {
  const cat = SUPDIR_CATS.find(c => c.id === catId);
  const catLabel = cat?.label || 'Other';
  const newId = (SUPPLIERS.reduce((m,s)=>Math.max(m,s.id),0))+1;
  SUPPLIERS.push({ id:newId, name, category:catLabel, phone, email, notes:'Added from Partner Directory', total:0, paid:false });
  saveSuppliers();
  showToast('📋 ' + name + ' added to Quick Dial!');
}

window.initSupplierDirectory = initSupplierDirectory;
window.openSupDirCategory    = openSupDirCategory;
window.closeSupDirList       = closeSupDirList;
window.addSupplierFromDir    = addSupplierFromDir;

/* ═══════════════════════════════════════════════
   TAB SWIPE — swipe content area to switch tabs
   ═══════════════════════════════════════════════ */

const TAB_ORDER = ['tasks','expenses','members','settle','map'];

function initTabSwipe() {
  const content = document.getElementById('group-detail');
  if (!content || content._swipeBound) return;
  content._swipeBound = true;

  let startX = 0, startY = 0, dragging = false;

  const onStart = e => {
    // Don't intercept if touching a modal, canvas, map, or button
    const t = e.target;
    if (t.closest('.modal-overlay, #leaflet-map, canvas, button, a, input, select, textarea, .task-item, .swipe-card')) return;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    dragging = true;
  };
  const onEnd = e => {
    if (!dragging) return;
    dragging = false;
    const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const endY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const dx = endX - startX;
    const dy = endY - startY;
    // Only horizontal swipe, with minimum distance and must be more horizontal than vertical
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.8) return;
    const currentTab = TAB_ORDER.find(t => {
      const p = document.getElementById('panel-'+t);
      return p && p.style.display !== 'none';
    }) || 'tasks';
    const idx = TAB_ORDER.indexOf(currentTab);
    if (dx < 0 && idx < TAB_ORDER.length - 1) switchTab(TAB_ORDER[idx + 1]); // swipe left = next tab
    if (dx > 0 && idx > 0)                    switchTab(TAB_ORDER[idx - 1]); // swipe right = prev tab
  };

  content.addEventListener('touchstart', onStart, {passive:true});
  content.addEventListener('touchend',   onEnd,   {passive:true});
  content.addEventListener('mousedown',  onStart);
  content.addEventListener('mouseup',    onEnd);
}

window.initTabSwipe = initTabSwipe;

/* ═══════════════════════════════════════════════
   JOWA SHARED EXPENSES
   ═══════════════════════════════════════════════ */
let JOWA_EXPENSES = JSON.parse(localStorage.getItem('at_jowa_expenses') || '[]');
// { id, name, cat, split, entries:[ {id,desc,amount,paidBy,date} ] }
let _jeActiveSplit = '50/50';
let _jeeActivePaidBy = 'p1';
let _jeDetailId = null;

function saveJowaExpenses() { localStorage.setItem('at_jowa_expenses', JSON.stringify(JOWA_EXPENSES)); }

function getP1() { return AUTH?.user?.name?.split(' ')[0] || 'Jhoan'; }
function getP2() { return getJowaPartner()?.name?.split(' ')[0] || 'Seph'; }

function selectJeSplit(val) {
  _jeActiveSplit = val;
  ['je-split-50','je-split-60','je-split-full'].forEach(id => {
    const el = document.getElementById(id); if(el) el.classList.remove('selected');
  });
  const map = {'50/50':'je-split-50','60/40':'je-split-60','Full':'je-split-full'};
  document.getElementById(map[val])?.classList.add('selected');
}

function selectJeePaidBy(who) {
  _jeeActivePaidBy = who;
  document.getElementById('jee-paid-p1')?.classList.toggle('selected', who==='p1');
  document.getElementById('jee-paid-p2')?.classList.toggle('selected', who==='p2');
}

function submitJowaExpense() {
  const name = (document.getElementById('je-name')?.value||'').trim();
  if (!name) { showToast('⚠️ Enter expense name'); return; }
  const cat = document.getElementById('je-cat')?.value || 'Other';
  const newId = (JOWA_EXPENSES.reduce((m,e)=>Math.max(m,e.id),0))+1;
  JOWA_EXPENSES.push({ id:newId, name, cat, split:_jeActiveSplit, entries:[] });
  saveJowaExpenses();
  closeModalById('add-jowa-expense-modal');
  document.getElementById('je-name').value = '';
  initJowaExpenses();
  showToast('💸 '+name+' created!');
}

function submitJowaEntry() {
  const expense = JOWA_EXPENSES.find(e=>e.id===_jeDetailId);
  if (!expense) return;
  const desc   = (document.getElementById('jee-desc')?.value||'').trim();
  const amount = parseFloat(document.getElementById('jee-amount')?.value)||0;
  const date   = document.getElementById('jee-date')?.value || new Date().toISOString().split('T')[0];
  if (!desc) { showToast('⚠️ Enter description'); return; }
  if (!amount) { showToast('⚠️ Enter amount'); return; }
  const newId = (expense.entries.reduce((m,e)=>Math.max(m,e.id),0))+1;
  expense.entries.push({ id:newId, desc, amount, paidBy:_jeeActivePaidBy, date });
  saveJowaExpenses();
  closeModalById('add-je-entry-modal');
  document.getElementById('jee-desc').value = '';
  document.getElementById('jee-amount').value = '';
  renderJowaExpenseDetail(expense);
  initJowaExpenses();
  showToast('✅ Entry added!');
}

function initJowaExpenses() {
  // Register screen
  if (!ALL_SCREENS.includes('jowa-expenses')) ALL_SCREENS.push('jowa-expenses');
  if (!FAB_HIDDEN.includes('jowa-expenses')) FAB_HIDDEN.push('jowa-expenses');

  // Update summary labels
  document.getElementById('je-p1-label').textContent = getP1();
  document.getElementById('je-p2-label').textContent = getP2();
  document.getElementById('jee-paid-p1').textContent = getP1();
  document.getElementById('jee-paid-p2').textContent = getP2();

  // Totals
  let total=0, p1t=0, p2t=0;
  JOWA_EXPENSES.forEach(e => e.entries.forEach(en => {
    total += en.amount;
    if (en.paidBy==='p1') p1t += en.amount;
    else p2t += en.amount;
  }));
  document.getElementById('je-total').textContent  = '₱'+total.toLocaleString();
  document.getElementById('je-p1-total').textContent = '₱'+p1t.toLocaleString();
  document.getElementById('je-p2-total').textContent = '₱'+p2t.toLocaleString();

  // Update summary on couple page
  const sumEl = document.getElementById('jowa-expense-summary');
  if (sumEl) sumEl.textContent = JOWA_EXPENSES.length
    ? JOWA_EXPENSES.length+' categories · ₱'+total.toLocaleString()+' total'
    : 'No expenses yet — tap to add';

  // Cards list
  const el = document.getElementById('jowa-expense-cards');
  if (!el) return;
  if (!JOWA_EXPENSES.length) {
    el.innerHTML = '<div style="text-align:center;padding:40px 20px"><div style="font-size:40px;margin-bottom:12px">💸</div><div style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:8px">No shared expenses yet</div><div style="font-size:13px;color:var(--ink-4)">Track rent, groceries, dates —<br>everything you split.</div></div>';
    return;
  }
  el.innerHTML = JOWA_EXPENSES.map(e => {
    const entTotal = e.entries.reduce((a,en)=>a+en.amount,0);
    const p1paid   = e.entries.filter(en=>en.paidBy==='p1').reduce((a,en)=>a+en.amount,0);
    const p2paid   = e.entries.filter(en=>en.paidBy==='p2').reduce((a,en)=>a+en.amount,0);
    return `<div class="glass" style="border-radius:var(--r-md);margin-bottom:10px;overflow:hidden" onclick="openJowaExpenseDetail(${e.id})">
      <div style="display:flex;align-items:center;gap:12px;padding:14px">
        <div style="width:44px;height:44px;border-radius:12px;background:rgba(252,232,238,0.6);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${e.cat.split(' ')[0]}</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:var(--ink)">${e.name}</div>
          <div style="font-size:11.5px;color:var(--ink-4);margin-top:2px">${e.split} split · ${e.entries.length} entries</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:15px;font-weight:800;color:var(--ink)">₱${entTotal.toLocaleString()}</div>
          <div style="font-size:10.5px;color:var(--ink-4)">${getP1()} ₱${p1paid.toLocaleString()} / ${getP2()} ₱${p2paid.toLocaleString()}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function openJowaExpenseDetail(id) {
  _jeDetailId = id;
  const expense = JOWA_EXPENSES.find(e=>e.id===id);
  if (!expense) return;
  document.getElementById('je-detail-title').textContent = expense.cat.split(' ')[0]+' '+expense.name;
  renderJowaExpenseDetail(expense);
  openModal('jowa-expense-detail-modal');
}

function renderJowaExpenseDetail(expense) {
  const el = document.getElementById('je-detail-content');
  if (!el) return;
  if (!expense.entries.length) {
    el.innerHTML = '<div style="text-align:center;padding:24px;font-size:13px;color:var(--ink-4)">No entries yet — tap + Entry to add the first breakdown.</div>';
    return;
  }
  const total = expense.entries.reduce((a,e)=>a+e.amount,0);
  const p1t   = expense.entries.filter(e=>e.paidBy==='p1').reduce((a,e)=>a+e.amount,0);
  const p2t   = expense.entries.filter(e=>e.paidBy==='p2').reduce((a,e)=>a+e.amount,0);
  el.innerHTML = `
    <div style="display:flex;gap:10px;margin-bottom:14px">
      <div style="flex:1;padding:10px;border-radius:var(--r-md);background:rgba(245,230,200,0.4);text-align:center">
        <div style="font-size:11px;color:var(--ink-4);font-weight:700">${getP1()}</div>
        <div style="font-size:16px;font-weight:800;color:var(--tan-dark)">₱${p1t.toLocaleString()}</div>
      </div>
      <div style="flex:1;padding:10px;border-radius:var(--r-md);background:rgba(252,232,238,0.4);text-align:center">
        <div style="font-size:11px;color:var(--ink-4);font-weight:700">${getP2()}</div>
        <div style="font-size:16px;font-weight:800;color:var(--pink-deep)">₱${p2t.toLocaleString()}</div>
      </div>
      <div style="flex:1;padding:10px;border-radius:var(--r-md);background:rgba(232,245,237,0.4);text-align:center">
        <div style="font-size:11px;color:var(--ink-4);font-weight:700">Total</div>
        <div style="font-size:16px;font-weight:800;color:var(--green-deep)">₱${total.toLocaleString()}</div>
      </div>
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Breakdown</div>
    ${expense.entries.slice().reverse().map(en => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--r-md);margin-bottom:6px;background:${en.paidBy==='p1'?'rgba(245,230,200,0.4)':'rgba(252,232,238,0.35)'};border:1px solid ${en.paidBy==='p1'?'rgba(201,169,110,0.2)':'rgba(224,120,152,0.2)'}">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700;color:var(--ink)">${en.desc}</div>
          <div style="font-size:11px;color:var(--ink-4);margin-top:2px">Paid by ${en.paidBy==='p1'?getP1():getP2()} · ${en.date}</div>
        </div>
        <div style="font-size:14px;font-weight:800;color:var(--ink)">₱${en.amount.toLocaleString()}</div>
        <button onclick="deleteJeEntry(${expense.id},${en.id})" style="width:24px;height:24px;border-radius:6px;border:none;background:rgba(224,120,152,0.12);font-size:11px;cursor:pointer;color:var(--pink-deep)">✕</button>
      </div>`).join('')}`;
}

function deleteJeEntry(expenseId, entryId) {
  const e = JOWA_EXPENSES.find(e=>e.id===expenseId);
  if (!e) return;
  e.entries = e.entries.filter(en=>en.id!==entryId);
  saveJowaExpenses(); renderJowaExpenseDetail(e); initJowaExpenses();
  showToast('🗑 Entry removed');
}

window.initJowaExpenses     = initJowaExpenses;
window.openJowaExpenseDetail= openJowaExpenseDetail;
window.submitJowaExpense    = submitJowaExpense;
window.submitJowaEntry      = submitJowaEntry;
window.selectJeSplit        = selectJeSplit;
window.selectJeePaidBy      = selectJeePaidBy;
window.deleteJeEntry        = deleteJeEntry;

/* ═══════════════════════════════════════════════
   IMPORTANT DATES & REMINDERS
   ═══════════════════════════════════════════════ */

let REMINDERS = JSON.parse(localStorage.getItem('at_reminders') || '[]');
// { id, type, name, emoji, date, alerts:[], repeat, shops:[] }

let _reminderType   = 'birthday_p1';
let _reminderAlerts = ['7','2'];
let _reminderRepeat = 'yearly';
let _activeReminderId = null;

const REMINDER_META = {
  birthday_p1: { emoji:'🎂', label: () => getP1()+'\'s Birthday',   color:'rgba(252,232,238,0.7)', border:'rgba(224,120,152,0.3)' },
  birthday_p2: { emoji:'🎂', label: () => getP2()+'\'s Birthday',   color:'rgba(245,230,200,0.7)', border:'rgba(201,169,110,0.3)' },
  monthsary:   { emoji:'💑', label: () => 'Monthsary',              color:'rgba(252,232,238,0.6)', border:'rgba(224,120,152,0.25)' },
  anniversary: { emoji:'💍', label: () => 'Anniversary',            color:'rgba(252,220,230,0.7)', border:'rgba(200,80,120,0.3)'  },
  custom:      { emoji:'✨', label: () => 'Special Date',           color:'rgba(208,200,255,0.5)', border:'rgba(140,120,240,0.3)' },
};

// Partner shops directory
const PARTNER_SHOPS = {
  flowers: [
    { id:'fs1', name:'Flowers & More PH',    emoji:'💐', loc:'Metro Manila · Delivery', desc:'Same-day delivery. Wide selection of fresh bouquets.', link:'https://flowersandmore.ph',    phone:'+63 917 123 0001', promo:'10% off with Ano Tara code' },
    { id:'fs2', name:'Dangwa Florist Online', emoji:'🌹', loc:'Manila · Nationwide',    desc:'Affordable bulk and single bouquets. Trusted for decades.', link:'https://dangwaflorist.com', phone:'+63 917 123 0002', promo:'Free ribbon with order' },
    { id:'fs3', name:'Bloomberry PH',         emoji:'🌸', loc:'BGC / Delivery',         desc:'Premium preserved and fresh flowers. Beautiful packaging.', link:'https://bloomberry.ph',      phone:'+63 917 123 0003', promo:'Free card with Ano Tara' },
    { id:'fs4', name:'Petals & Co.',          emoji:'🌷', loc:'Makati · Delivery',      desc:'Luxury floral arrangements. Corporate and personal.', link:'https://petalsandco.ph',      phone:'+63 917 123 0004', promo:'Free delivery for 1st order' },
  ],
  cakes: [
    { id:'cs1', name:'Goldilocks',             emoji:'🎂', loc:'Nationwide',             desc:'PH\'s most trusted bakeshop. Cakes for every occasion.', link:'https://goldilocks.com.ph',   phone:'+63 2 8888 1234', promo:'Free message card' },
    { id:'cs2', name:'Red Ribbon',             emoji:'🍰', loc:'Nationwide',             desc:'Classic Filipino cakes. Birthday and celebration cakes.', link:'https://redribbonbakeshop.com', phone:'+63 2 8777 5678', promo:'Candles included' },
    { id:'cs3', name:'Bizu Patisserie',        emoji:'🧁', loc:'BGC / Rockwell',         desc:'French-inspired cakes and macarons. Premium gift boxes.', link:'https://bizupatisserie.com',  phone:'+63 917 234 5678', promo:'10% off cake orders' },
    { id:'cs4', name:'Sonja\'s Cakes',         emoji:'🎂', loc:'BGC / Rockwell',         desc:'Artisan custom cakes. Stunning and delicious.', link:'https://cakesbysonja.com',     phone:'+63 2 8856 0851', promo:'Free candles + topper' },
  ],
  gifts: [
    { id:'gs1', name:'SM Gift Registry',       emoji:'🎁', loc:'SM Malls Nationwide',    desc:'Wide selection across all categories. E-GC available.', link:'https://sm.com.ph',           phone:'+63 2 8831 6161', promo:'Free gift wrapping' },
    { id:'gs2', name:'The Landmark Gifts',     emoji:'🛍', loc:'Makati / BGC',           desc:'Premium lifestyle gifts. Curated selections.', link:'https://thelandmark.com.ph',   phone:'+63 2 8830 7701', promo:'Free ribbon and card' },
    { id:'gs3', name:'Shopee Gift Cards',      emoji:'💳', loc:'Online · Nationwide',    desc:'Send any amount as a Shopee credit. Instant delivery.', link:'https://shopee.ph/giftcard', phone:'', promo:'Zero fees with Ano Tara' },
    { id:'gs4', name:'Lazada Gift Vouchers',   emoji:'🎀', loc:'Online · Nationwide',    desc:'Digital gift vouchers for any occasion. No expiry.', link:'https://lazada.com.ph/gift', phone:'', promo:'Extra ₱50 credit bonus' },
  ],
  restaurants: [
    { id:'rs1', name:'Nobu Restaurant',        emoji:'🍣', loc:'BGC, Taguig',            desc:'World-class Japanese fusion. Book a private table.', link:'https://noburestaurants.com', phone:'+63 2 8945 8888', promo:'Complimentary dessert' },
    { id:'rs2', name:'Gallery VASK',           emoji:'🌟', loc:'BGC, Taguig',            desc:'Spanish-Filipino tasting menu. Michelin-level experience.', link:'https://galleryvask.com', phone:'+63 2 8945 7777', promo:'Free wine pairing upgrade' },
    { id:'rs3', name:'Il Ponticello',          emoji:'🍝', loc:'Kapitolyo, Pasig',       desc:'Romantic Italian garden restaurant. Perfect for dates.', link:'https://ilponticello.com.ph', phone:'+63 2 8631 4321', promo:'Free tiramisu for couples' },
    { id:'rs4', name:'Vikings Buffet',         emoji:'🍽', loc:'Nationwide',             desc:'Unlimited buffet. Group celebrations welcome.', link:'https://vikings.ph',          phone:'+63 2 8878 3333', promo:'10% off for Ano Tara users' },
  ],
  experiences: [
    { id:'es1', name:'Nurture Wellness Village',emoji:'🌿', loc:'Tagaytay',             desc:'Couples spa retreat. Full weekend packages available.', link:'https://nurture.com.ph',      phone:'+63 917 456 7890', promo:'Free aromatherapy add-on' },
    { id:'es2', name:'Balesin Island Club',    emoji:'🏝', loc:'Quezon Province',        desc:'Private island resort. Day and overnight packages.', link:'https://balesin.com',          phone:'+63 2 8811 1234', promo:'Free sunset cruise' },
    { id:'es3', name:'Klook PH',               emoji:'🎡', loc:'Nationwide · Online',    desc:'Book experiences, tours, activities. Easy cancellation.', link:'https://klook.com/ph',       phone:'', promo:'5% cashback via Ano Tara' },
    { id:'es4', name:'Airbnb PH',              emoji:'🏡', loc:'Nationwide',             desc:'Unique stays for special occasions. Filter by romance.', link:'https://airbnb.com',         phone:'', promo:'₱500 off first booking' },
  ],
};

// Which shop categories to suggest per reminder type
const REMINDER_SHOPS = {
  birthday_p1:  ['flowers','cakes','gifts','restaurants'],
  birthday_p2:  ['flowers','cakes','gifts','restaurants'],
  monthsary:    ['flowers','restaurants','experiences','gifts'],
  anniversary:  ['flowers','restaurants','experiences','gifts'],
  custom:       ['gifts','restaurants','experiences'],
};

const SHOP_CAT_LABELS = {
  flowers:'💐 Flower Shops', cakes:'🎂 Cake Shops', gifts:'🎁 Gift Stores',
  restaurants:'🍽 Restaurants', experiences:'✨ Experiences'
};

function saveReminders() { localStorage.setItem('at_reminders', JSON.stringify(REMINDERS)); }

function selectReminderType(btn, type) {
  _reminderType = type;
  document.querySelectorAll('#reminder-type-btns .split-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const customGroup = document.getElementById('reminder-custom-name-group');
  if (customGroup) customGroup.style.display = type === 'custom' ? 'block' : 'none';
}

function toggleReminderAlert(btn, days) {
  btn.classList.toggle('selected');
  if (_reminderAlerts.includes(days)) _reminderAlerts = _reminderAlerts.filter(d=>d!==days);
  else _reminderAlerts.push(days);
}

function selectReminderRepeat(btn, val) {
  _reminderRepeat = val;
  document.querySelectorAll('#rrep-yearly, #rrep-monthly, #rrep-once').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
}

function submitReminder() {
  const dateVal = document.getElementById('reminder-date')?.value;
  if (!dateVal) { showToast('⚠️ Pick a date'); return; }
  const meta = REMINDER_META[_reminderType];
  const customName = (document.getElementById('reminder-custom-name')?.value||'').trim();
  const name = _reminderType === 'custom' ? (customName || 'Special Date') : meta.label();
  const newId = (REMINDERS.reduce((m,r)=>Math.max(m,r.id),0))+1;
  REMINDERS.push({
    id: newId,
    type: _reminderType,
    name,
    emoji: meta.emoji,
    date: dateVal,
    alerts: [..._reminderAlerts],
    repeat: _reminderRepeat,
    shops: [],
  });
  saveReminders();
  closeModalById('add-reminder-modal');
  document.getElementById('reminder-date').value = '';
  renderReminders();
  checkHomeBanner();
  showToast(meta.emoji+' '+name+' reminder saved!');
}

// Days until next occurrence
function daysUntil(dateStr, repeat) {
  const today = new Date(); today.setHours(0,0,0,0);
  let d = new Date(dateStr);
  if (repeat === 'yearly') {
    d.setFullYear(today.getFullYear());
    if (d < today) d.setFullYear(today.getFullYear()+1);
  } else if (repeat === 'monthly') {
    d.setFullYear(today.getFullYear()); d.setMonth(today.getMonth());
    if (d < today) { d.setMonth(d.getMonth()+1); }
  }
  return Math.round((d-today)/(1000*60*60*24));
}

function formatCountdown(days) {
  if (days === 0) return 'TODAY! 🎉';
  if (days === 1) return 'Tomorrow! 💕';
  if (days < 0)  return 'Passed';
  return 'in ' + days + ' days';
}

function renderReminders() {
  // Update couple page list
  ['reminders-list-couple','reminders-full-list'].forEach(elId => {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!REMINDERS.length) {
      el.innerHTML = '<div style="text-align:center;padding:20px;font-size:13px;color:var(--ink-4)">No dates added yet — tap + Add to start.</div>';
      return;
    }
    el.innerHTML = REMINDERS.map(r => {
      const days = daysUntil(r.date, r.repeat);
      const meta = REMINDER_META[r.type] || REMINDER_META.custom;
      const urgent = days >= 0 && days <= 7;
      return `<div onclick="window.openReminderDetail(${r.id})" style="
        display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:var(--r-md);
        margin-bottom:8px;cursor:pointer;
        background:${urgent ? meta.color : 'rgba(255,253,248,0.7)'};
        border:1.5px solid ${urgent ? meta.border : 'rgba(201,169,110,0.15)'};
      ">
        <div style="font-size:28px;flex-shrink:0">${r.emoji}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:700;color:var(--ink)">${r.name}</div>
          <div style="font-size:11.5px;color:var(--ink-4);margin-top:2px">${r.date} · ${r.repeat}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:13px;font-weight:800;color:${urgent?'var(--pink-deep)':'var(--ink-4)'}">${formatCountdown(days)}</div>
          ${r.shops.length ? `<div style="font-size:10.5px;color:var(--green-deep);margin-top:2px">${r.shops.length} shop${r.shops.length>1?'s':''} selected</div>` : ''}
        </div>
      </div>`;
    }).join('');
  });
}

function openReminderDetail(id) {
  const r = REMINDERS.find(r=>r.id===id);
  if (!r) return;
  _activeReminderId = id;
  const days = daysUntil(r.date, r.repeat);
  const meta = REMINDER_META[r.type] || REMINDER_META.custom;

  document.getElementById('rd-title').textContent = r.emoji+' '+r.name;
  const cdEl = document.getElementById('rd-countdown');
  if (cdEl) {
    cdEl.innerHTML = `<div style="font-size:28px;font-weight:800;color:var(--pink-deep)">${formatCountdown(days)}</div>`
      + `<div style="font-size:12px;color:var(--ink-4);margin-top:4px">${r.date} · ${r.repeat} · Alerts ${r.alerts.map(a=>a+'d before').join(', ')}</div>`;
  }

  // Shop suggestions
  const shopsEl = document.getElementById('rd-shops');
  const cats = REMINDER_SHOPS[r.type] || ['gifts','flowers'];
  if (shopsEl) {
    shopsEl.innerHTML = cats.map(catId => {
      const shops = PARTNER_SHOPS[catId] || [];
      return `<div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:7px">${SHOP_CAT_LABELS[catId]||catId}</div>
        ${shops.map(sh => {
          const isSelected = r.shops.includes(sh.id);
          return `<div style="
            display:flex;align-items:flex-start;gap:10px;padding:11px 12px;border-radius:var(--r-md);margin-bottom:6px;
            background:${isSelected?'rgba(232,245,237,0.5)':'rgba(255,253,248,0.7)'};
            border:1.5px solid ${isSelected?'rgba(90,171,122,0.3)':'rgba(201,169,110,0.15)'};
          ">
            <div style="font-size:22px;flex-shrink:0">${sh.emoji}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:700;color:var(--ink)">${sh.name}</div>
              <div style="font-size:11px;color:var(--ink-4);margin-top:1px">📍 ${sh.loc}</div>
              <div style="font-size:11.5px;color:var(--ink-3);margin-top:3px">${sh.desc}</div>
              ${sh.promo ? `<div style="font-size:11px;font-weight:700;color:var(--green-deep);margin-top:4px;padding:2px 7px;background:rgba(232,245,237,0.6);border-radius:5px;display:inline-block">🎁 ${sh.promo}</div>` : ''}
            </div>
            <div style="flex-shrink:0;display:flex;flex-direction:column;gap:5px">
              <button onclick="window.toggleShopForReminder(${r.id},'${sh.id}')" style="
                padding:5px 10px;border-radius:7px;border:none;font-size:11.5px;font-weight:700;cursor:pointer;
                background:${isSelected?'rgba(90,171,122,0.15)':'rgba(245,230,200,0.7)'};
                color:${isSelected?'var(--green-deep)':'var(--tan-dark)'};
              ">${isSelected?'✓ Added':'+ Select'}</button>
              ${sh.phone?`<a href="tel:${sh.phone}" style="text-align:center;padding:4px 8px;border-radius:7px;background:rgba(232,245,237,0.5);border:1px solid rgba(90,171,122,0.2);font-size:11px;font-weight:700;color:var(--green-deep);text-decoration:none">📞 Call</a>`:''}
              ${sh.link?`<a href="${sh.link}" target="_blank" style="text-align:center;padding:4px 8px;border-radius:7px;background:rgba(245,230,200,0.5);border:1px solid rgba(201,169,110,0.2);font-size:11px;font-weight:700;color:var(--tan-dark);text-decoration:none">→ Visit</a>`:''}
            </div>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
  }

  // Selected shops summary
  renderSelectedShops(r);
  openModal('reminder-detail-modal');
}

function toggleShopForReminder(remId, shopId) {
  const r = REMINDERS.find(r=>r.id===remId);
  if (!r) return;
  if (r.shops.includes(shopId)) r.shops = r.shops.filter(s=>s!==shopId);
  else r.shops.push(shopId);
  saveReminders();
  renderSelectedShops(r);
  openReminderDetail(remId); // re-render
}

function renderSelectedShops(r) {
  const el  = document.getElementById('rd-selected-shops');
  const sec = document.getElementById('rd-selected-shops-section');
  if (!el || !sec) return;
  sec.style.display = r.shops.length ? 'block' : 'none';
  // Find shop objects
  const allShops = Object.values(PARTNER_SHOPS).flat();
  el.innerHTML = r.shops.map(sid => {
    const sh = allShops.find(s=>s.id===sid);
    if (!sh) return '';
    return `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--r-md);margin-bottom:5px;background:rgba(232,245,237,0.4);border:1px solid rgba(90,171,122,0.2)">
      <span style="font-size:20px">${sh.emoji}</span>
      <span style="font-size:13px;font-weight:700;color:var(--ink);flex:1">${sh.name}</span>
      ${sh.link?`<a href="${sh.link}" target="_blank" style="padding:4px 10px;border-radius:7px;background:rgba(245,230,200,0.6);border:1px solid rgba(201,169,110,0.2);font-size:11.5px;font-weight:700;color:var(--tan-dark);text-decoration:none">Visit →</a>`:''}
    </div>`;
  }).join('');
}

function deleteActiveReminder() {
  const r = REMINDERS.find(r=>r.id===_activeReminderId);
  if (!r) return;
  if (!confirm('Delete "'+r.name+'"?')) return;
  REMINDERS = REMINDERS.filter(r=>r.id!==_activeReminderId);
  saveReminders();
  closeModalById('reminder-detail-modal');
  renderReminders();
  checkHomeBanner();
  showToast('🗑 Reminder deleted');
}

// Check and update home banner
function checkHomeBanner() {
  const banner = document.getElementById('home-reminder-banner');
  if (!banner) return;
  const upcoming = REMINDERS
    .map(r => ({ r, days: daysUntil(r.date, r.repeat) }))
    .filter(x => x.days >= 0 && x.days <= 14)
    .sort((a,b) => a.days - b.days);
  if (!upcoming.length) { banner.style.display = 'none'; return; }
  const { r, days } = upcoming[0];
  banner.style.display = 'block';
  document.getElementById('hrb-emoji').textContent = r.emoji;
  document.getElementById('hrb-title').textContent = r.name;
  document.getElementById('hrb-sub').textContent   = 'Tap to see reminder details and shop suggestions';
  document.getElementById('hrb-days').textContent  = formatCountdown(days);
}

function openRemindersScreen() {
  if (!ALL_SCREENS.includes('reminders')) ALL_SCREENS.push('reminders');
  if (!FAB_HIDDEN.includes('reminders')) FAB_HIDDEN.push('reminders');
  renderReminders();
  navTo('reminders');
}

// Update type button labels with actual names
function updateReminderTypeLabels() {
  const btns = document.querySelectorAll('#reminder-type-btns .split-btn');
  if (btns[0]) btns[0].textContent = '🎂 '+getP1()+'\'s Birthday';
  if (btns[1]) btns[1].textContent = '🎂 '+getP2()+'\'s Birthday';
}

window.selectReminderType   = selectReminderType;
window.toggleReminderAlert  = toggleReminderAlert;
window.selectReminderRepeat = selectReminderRepeat;
window.submitReminder       = submitReminder;
window.openReminderDetail   = openReminderDetail;
window.toggleShopForReminder= toggleShopForReminder;
window.deleteActiveReminder = deleteActiveReminder;
window.openRemindersScreen  = openRemindersScreen;
window.renderReminders      = renderReminders;
window.checkHomeBanner      = checkHomeBanner;

// ── PIN aliases for new HTML screens ─────────────────────────────
window.pinInput       = (d) => { pinKey(d); };
window.pinDelete      = ()  => { pinKey('del'); };
window.pinForgot      = ()  => { if(!confirm('Log in again with your phone number?')) return; AUTH.user=null; localStorage.removeItem('at_user'); location.reload(); };
window.pinSetupInput  = (d) => { pinKey(d); };
window.pinSetupDelete = ()  => { pinKey('del'); };
window.pinSetupSkip   = ()  => { document.getElementById('pin-setup-screen').style.display='none'; showToast('You can set up a PIN in Settings later.'); };
window.showPinSetup   = ()  => { showPinLock('setup'); };
window.showPinLock    = showPinLock;

/* ═══════════════════════════════════════════════
   PIN LOCK + IDLE TIMER
   ═══════════════════════════════════════════════ */
let _pinBuffer    = '';
let _pinMode      = 'lock';   // 'lock' | 'setup' | 'confirm'
let _pinSetupFirst = '';
let _idleTimer    = null;
const PIN_IDLE_MS = 60000; // 1 minute

function getPIN()  { return localStorage.getItem('at_pin') || '1234'; }
function setPIN(p) { localStorage.setItem('at_pin', p); }

function showPinLock(mode) {
  _pinMode   = mode || 'lock';
  document.body.style.overflow = 'hidden';
  _pinBuffer = '';

  // Use new screens
  const lockEl  = document.getElementById('pin-screen');
  const setupEl = document.getElementById('pin-setup-screen');
  // Also handle legacy pin-lock-screen
  const legacyEl = document.getElementById('pin-lock-screen');

  if (_pinMode === 'lock') {
    if (setupEl) setupEl.style.display = 'none';
    if (lockEl) lockEl.style.display = 'none'; // use legacy
    if (legacyEl) {
      legacyEl.classList.add('active');
      legacyEl.style.display = 'flex';
      const ti = document.getElementById('pin-title');
      const su = document.getElementById('pin-subtitle');
      const u  = AUTH?.user?.name?.split(' ')[0] || 'Jhoan';
      if (ti) ti.textContent = 'Welcome back, '+u+'!';
      if (su) su.textContent = 'Enter your 4-digit PIN';
    }
  } else {
    // setup or confirm
    if (lockEl) lockEl.style.display = 'none';
    if (setupEl) {
      setupEl.style.display = 'flex';
      const ti = document.getElementById('pin-setup-title');
      const su = document.getElementById('pin-setup-sub');
      if (_pinMode === 'setup') {
        if (ti) ti.textContent = 'Set up your PIN';
        if (su) su.textContent = 'Choose a 4-digit PIN to quickly unlock the app';
      } else {
        if (ti) ti.textContent = 'Confirm your PIN';
        if (su) su.textContent = 'Enter the same PIN again to confirm';
      }
    }
  }
  updatePinDots();
}

function hidePinLock() {
  document.body.style.overflow = '';
  const lockEl  = document.getElementById('pin-screen');
  const setupEl = document.getElementById('pin-setup-screen');
  const legacyEl= document.getElementById('pin-lock-screen');
  if (lockEl)   lockEl.style.display   = 'none';
  if (setupEl)  setupEl.style.display  = 'none';
  if (legacyEl) { legacyEl.classList.remove('active'); legacyEl.style.display='none'; }
  resetIdleTimer();
}

function updatePinDots(flash) {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('pld-'+i);
    if (!dot) continue;
    if (flash === 'error') {
      dot.style.background = '#EF4444';
      dot.style.transform  = 'scale(1.2)';
      dot.style.border     = '2px solid #EF4444';
    } else if (flash === 'reset') {
      dot.style.background = '#E5E7EB';
      dot.style.transform  = 'scale(1)';
      dot.style.border     = '2px solid #D1D5DB';
    } else {
      const filled = i < _pinBuffer.length;
      dot.style.background = filled ? '#C6E03F' : '#E5E7EB';
      dot.style.transform  = filled ? 'scale(1.15)' : 'scale(1)';
      dot.style.border     = filled ? '2px solid #C6E03F' : '2px solid #D1D5DB';
    }
  }
}

function pinKey(val) {
  const errEl = document.getElementById('pin-error');
  if (errEl) errEl.textContent = '';

  if (val === 'clear') {
    _pinBuffer = _pinBuffer.slice(0,-1);
    updatePinDots();
    return;
  }
  if (val === 'submit') {
    if (_pinBuffer.length < 4) { if (errEl) errEl.textContent = 'Enter all 4 digits'; return; }
    handlePinSubmit();
    return;
  }
  if (_pinBuffer.length >= 4) return;
  _pinBuffer += val;
  updatePinDots();
  // Auto-submit when 4 digits entered
  if (_pinBuffer.length === 4) setTimeout(handlePinSubmit, 120);
}

function handlePinSubmit() {
  const errEl = document.getElementById('pin-error');
  if (_pinMode === 'setup') {
    _pinSetupFirst = _pinBuffer;
    _pinBuffer = '';
    updatePinDots();
    showPinLock('confirm');
  } else if (_pinMode === 'confirm') {
    if (_pinBuffer === _pinSetupFirst) {
      setPIN(_pinBuffer);
      hidePinLock();
      const lbl = document.getElementById('pin-settings-label');
      if (lbl) lbl.textContent = 'Change PIN';
      showToast('🔐 PIN set! You\'ll be asked after 1 min idle.');
    } else {
      _pinBuffer = ''; updatePinDots();
      if (errEl) errEl.textContent = 'PINs don\'t match. Try again.';
      setTimeout(() => showPinLock('setup'), 600);
    }
  } else {
    // lock mode
    if (_pinBuffer === getPIN()) {
      hidePinLock();
      showToast('✅ Welcome back!');
    } else {
      updatePinDots('error');
      setTimeout(() => { _pinBuffer = ''; updatePinDots('reset'); if(errEl) errEl.textContent=''; }, 600);
      if (errEl) errEl.textContent = 'Wrong PIN';
    }
  }
}

function setupPIN() {
  _pinSetupFirst = '';
  showPinLock('setup');
}

// Idle timer
function resetIdleTimer() {
  if (_idleTimer) clearTimeout(_idleTimer);
  if (!getPIN()) return; // no PIN set, no lock
  _idleTimer = setTimeout(() => {
    if (document.getElementById('app-shell')?.classList.contains('active')) {
      showPinLock('lock');
    }
  }, PIN_IDLE_MS);
}

function initIdleTimer() {
  ['touchstart','mousedown','keydown','scroll'].forEach(ev => {
    document.addEventListener(ev, resetIdleTimer, {passive:true});
  });
  resetIdleTimer();
}

// Splash on every load
function showLoadingSplash() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.style.display = 'flex';
  splash.style.opacity = '1';
  splash.style.transition = '';
  setTimeout(() => {
    splash.style.opacity = '0';
    splash.style.transition = 'opacity 0.5s';
    setTimeout(() => { splash.style.display = 'none'; }, 500);
  }, 1800);
}

window.pinKey   = pinKey;
window.setupPIN = setupPIN;
window.showPinLock = showPinLock;
window.hidePinLock = hidePinLock;

// Add shake keyframe
const shakeStyle = document.createElement('style');
shakeStyle.textContent = '@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}';
document.head.appendChild(shakeStyle);

/* ═══════════════════════════════════════════════
   HOME FEED
   ═══════════════════════════════════════════════ */
function initHomeFeed() {
  renderHomeDailyTasks();
  renderHomeMood();
  renderHomeReminder();
  renderExpenseTrendChart();
}

function renderHomeDailyTasks() {
  const el = document.getElementById('home-daily-tasks');
  if (!el) return;
  const today = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
  const tasks = (typeof DAILY_TASKS !== 'undefined' ? DAILY_TASKS : [])
    .filter(t => !t.days || t.days.includes(today) || !t.days.length)
    .slice(0, 3);
  if (!tasks.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--ink-4);padding:4px 0">No tasks for today. <span style="color:var(--accent-dk);cursor:pointer;font-weight:700" onclick="navTo(\'daily-tasks\');window.initDailyTasks()">Set up tasks →</span></div>';
    return;
  }
  el.innerHTML = tasks.map(t => {
    const p1done = t.type==='check' ? t.todayP1>=1 : t.todayP1>=t.target;
    const p2done = t.type==='check' ? t.todayP2>=1 : t.todayP2>=t.target;
    const done = p1done && p2done;
    return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(0,0,0,0.05)">
      <div style="width:20px;height:20px;border-radius:6px;border:2px solid ${done?'#C6E03F':'rgba(0,0,0,0.12)'};background:${done?'#C6E03F':'transparent'};display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0">${done?'✓':''}</div>
      <div style="flex:1;font-size:13px;font-weight:700;color:var(--ink);${done?'text-decoration:line-through;color:var(--ink-4)':''}">${t.emoji} ${t.title}</div>
      <div style="font-size:11px;color:var(--ink-4)">${t.todayP1||0}/${t.type==='check'?1:t.target}</div>
    </div>`;
  }).join('');
}

function renderHomeMood() {
  const emojiEl = document.getElementById('home-mood-emoji');
  const subEl   = document.getElementById('home-mood-sub');
  if (!emojiEl) return;
  const today = new Date().toDateString();
  const entry = (typeof MOOD_LOG !== 'undefined' ? MOOD_LOG : []).find(e=>e.date===today);
  if (entry?.p1emoji) {
    emojiEl.textContent = entry.p1emoji;
    subEl.textContent   = entry.p1note || 'Checked in ✓';
  }
}

function renderHomeReminder() {
  const card = document.getElementById('home-reminder-card');
  if (!card) return;
  if (typeof REMINDERS === 'undefined' || !REMINDERS.length) { card.style.display='none'; return; }
  const upcoming = REMINDERS
    .map(r => ({ r, days: daysUntil(r.date, r.repeat) }))
    .filter(x => x.days >= 0 && x.days <= 14)
    .sort((a,b) => a.days-b.days);
  if (!upcoming.length) { card.style.display='none'; return; }
  const { r, days } = upcoming[0];
  card.style.display = 'block';
  document.getElementById('home-reminder-name').textContent = r.emoji+' '+r.name;
  document.getElementById('home-reminder-days').textContent = formatCountdown(days);
}

let _chartData = null;
let _chartSelectedIdx = null;

function renderExpenseTrendChart() {
  const canvas = document.getElementById('expense-trend-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Build 6-month data from GROUPS expenses
  const months = [];
  const now = new Date();
  for (let i=5; i>=0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push({ label: d.toLocaleString('en-PH',{month:'short'}), year:d.getFullYear(), month:d.getMonth(), total:0 });
  }
  if (typeof GROUPS !== 'undefined') {
    GROUPS.forEach(g => (g.expenses||[]).forEach(e => {
      const d = new Date(e.date||Date.now());
      const m = months.find(m=>m.year===d.getFullYear()&&m.month===d.getMonth());
      if (m) m.total += (e.amount||0);
    }));
  }
  // Fallback demo data if all zeros
  const hasData = months.some(m=>m.total>0);
  if (!hasData) months.forEach((m,i)=>{ m.total = [2400,3100,2800,4200,3600,months[i].total||3800][i]; });
  _chartData = months;

  drawChart(ctx, canvas, months, null);

  // Touch/click to select point
  function getIdx(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches?e.touches[0].clientX:e.clientX) - rect.left;
    const W = canvas.width, pad = 20, step = (W-pad*2)/(months.length-1);
    let best = 0, bestDist = Infinity;
    months.forEach((_,i)=>{ const px=pad+i*step; if(Math.abs(x-px)<bestDist){bestDist=Math.abs(x-px);best=i;} });
    return best;
  }
  canvas.addEventListener('click', e => {
    const i = getIdx(e);
    _chartSelectedIdx = i;
    drawChart(ctx, canvas, months, i);
    const m = months[i];
    document.getElementById('chart-total').textContent = '₱'+m.total.toLocaleString();
    document.getElementById('chart-label').textContent = m.label+' · tap a point for details';
  });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); const i=getIdx(e); _chartSelectedIdx=i; drawChart(ctx,canvas,months,i); const m=months[i]; document.getElementById('chart-total').textContent='₱'+m.total.toLocaleString(); document.getElementById('chart-label').textContent=m.label; }, {passive:false});

  // Default display: total
  const total = months[months.length-1].total;
  document.getElementById('chart-total').textContent = '₱'+total.toLocaleString();
  document.getElementById('chart-label').textContent = months[months.length-1].label+' · tap a point for details';
}

function drawChart(ctx, canvas, data, selIdx) {
  const W = canvas.offsetWidth || 300;
  const H = 100;
  canvas.width = W; canvas.height = H;
  const pad = 20, bottom = 16;
  const vals = data.map(d=>d.total);
  const max = Math.max(...vals)*1.15;
  const min = Math.min(...vals)*0.85;
  const step = (W-pad*2)/(data.length-1);

  ctx.clearRect(0,0,W,H);

  // Line
  ctx.beginPath();
  data.forEach((d,i) => {
    const x = pad+i*step;
    const y = H-bottom - ((d.total-min)/(max-min||1))*(H-bottom-8);
    i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  });
  ctx.strokeStyle = '#C6E03F'; ctx.lineWidth = 2.5; ctx.lineJoin='round'; ctx.stroke();

  // Fill under line
  ctx.lineTo(pad+(data.length-1)*step, H-bottom);
  ctx.lineTo(pad, H-bottom);
  ctx.closePath();
  ctx.fillStyle = 'rgba(198,224,63,0.12)'; ctx.fill();

  // Points + labels
  data.forEach((d,i) => {
    const x = pad+i*step;
    const y = H-bottom - ((d.total-min)/(max-min||1))*(H-bottom-8);
    const isSel = i===selIdx;

    ctx.beginPath();
    ctx.arc(x, y, isSel?6:4, 0, Math.PI*2);
    ctx.fillStyle = isSel?'#111827':'#C6E03F';
    ctx.fill();
    if (isSel) { ctx.strokeStyle='#C6E03F'; ctx.lineWidth=2; ctx.stroke(); }

    // Month label
    ctx.fillStyle = '#9CA3AF';
    ctx.font = `${isSel?'700':'600'} 10px Nunito,sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(d.label, x, H);
  });
}

window.initHomeFeed = initHomeFeed;
window.renderExpenseTrendChart = renderExpenseTrendChart;
