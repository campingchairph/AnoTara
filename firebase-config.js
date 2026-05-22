/* ═══════════════════════════════════════════════
   KASALKO — Firebase Configuration & Cloud Sync
   ═══════════════════════════════════════════════

   ⚠️  SETUP — 3 values to fill in below.

   Steps:
   1. Go to console.firebase.google.com
   2. Click on "weddingthings"
   3. ⚙️ Project Settings → scroll to "Your apps"
   4. Click your web app → copy the firebaseConfig
   5. Paste apiKey, messagingSenderId, appId below
   ═══════════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey:            "PASTE_API_KEY_HERE",            // ← from Firebase console
  authDomain:        "weddingthings.firebaseapp.com",
  projectId:         "weddingthings",
  storageBucket:     "weddingthings.appspot.com",
  messagingSenderId: "PASTE_MESSAGING_SENDER_ID_HERE", // ← from Firebase console
  appId:             "PASTE_APP_ID_HERE",              // ← from Firebase console
};

/* ── INIT ─────────────────────────────────────── */
const _fbReady = !FIREBASE_CONFIG.apiKey.includes('PASTE');
if (_fbReady) {
  try { firebase.initializeApp(FIREBASE_CONFIG); } catch(e) {}
}

const AUTH = _fbReady ? firebase.auth()      : null;
const DB   = _fbReady ? firebase.firestore() : null;

/* ── AUTH STATE ──────────────────────────────── */
let CURRENT_USER = null;
window.CURRENT_USER = null;

if (AUTH) {
  AUTH.onAuthStateChanged(user => {
    CURRENT_USER = user;
    window.CURRENT_USER = user;
    updateAuthUI(user);
    if (user) {
      cloudLoadWedding();
    } else {
      // Signed out — refresh overview to show sign-in prompt
      if (typeof renderOverview === 'function' && WED && WED.activeTab === 'overview') renderOverview();
    }
  });
}

/* ── HEADER AUTH BUTTON ──────────────────────── */
function updateAuthUI(user) {
  const btn = document.getElementById('auth-header-btn');
  if (!btn) return;
  if (user) {
    const name = user.displayName || user.email.split('@')[0];
    const initials = name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    btn.innerHTML = `<span style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#c9a96e,#7a6045);display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white;flex-shrink:0">${initials}</span><span style="font-size:11.5px;font-weight:700;color:var(--tan-dark);max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name.split(' ')[0]}</span>`;
    btn.title = user.email;
  } else {
    btn.innerHTML = `☁️ <span style="font-size:11.5px;font-weight:700;color:var(--tan-dark)">Sign In</span>`;
    btn.title = 'Sync your plans to the cloud';
  }
  // Refresh overview cloud section
  if (typeof renderOverview === 'function' && WED && WED.activeTab === 'overview') renderOverview();
}

/* ── CLOUD SAVE ──────────────────────────────── */
let _cloudSaveTimer = null;

function cloudSave() {
  if (!CURRENT_USER || !DB) return;
  clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer = setTimeout(_doCloudSave, 2500);
}

function cloudSaveNow() {
  if (!CURRENT_USER || !DB) { showToast('⚠️ Sign in to sync'); return; }
  clearTimeout(_cloudSaveTimer);
  _doCloudSave();
}

async function _doCloudSave() {
  if (!CURRENT_USER || !DB) return;
  try {
    const snap = {
      couple:    WED.couple,    date:      WED.date,
      venue:     WED.venue,     budget:    WED.budget,
      guests:    WED.guests,    expenses:  WED.expenses,
      checklist: WED.checklist, schedule:  WED.schedule,
      furniture: WED.furniture, vendors:   WED.vendors,
      nextFurnitureId: WED.nextFurnitureId,
      nextGuestId:     WED.nextGuestId,
      nextVendorId:    WED.nextVendorId,
      _savedAt:  new Date().toISOString(),
      _version:  1,
    };
    await DB.collection('users').doc(CURRENT_USER.uid)
            .collection('data').doc('wedding').set(snap);
    _cloudIndicator('☁️ Saved', 'var(--green-deep)', 2500);
  } catch(e) {
    _cloudIndicator('⚠️ Sync failed', 'var(--pink-deep)', 3000);
    console.warn('Cloud save error:', e);
  }
}

function _cloudIndicator(text, color, ttl) {
  const el = document.getElementById('cloud-save-indicator');
  if (!el) return;
  el.textContent = text;
  el.style.color   = color;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, ttl);
}

/* ── CLOUD LOAD ──────────────────────────────── */
async function cloudLoadWedding() {
  if (!CURRENT_USER || !DB) return;
  try {
    const doc = await DB.collection('users').doc(CURRENT_USER.uid)
                        .collection('data').doc('wedding').get();
    if (!doc.exists) { cloudSave(); return; } // first login — push local up
    const cloudData = doc.data();
    const localRaw  = localStorage.getItem('kasalko_data');
    if (localRaw) {
      _showCloudConflictSheet(cloudData);
    } else {
      _applyCloudData(cloudData);
    }
  } catch(e) { console.warn('Cloud load error:', e); }
}

function _applyCloudData(data) {
  const { _savedAt, _version, ...wedData } = data;
  Object.assign(WED, wedData);
  if (!WED._customPhases) WED._customPhases = [];
  if (!WED.vendors)       WED.vendors       = [];
  if (!WED.nextVendorId)  WED.nextVendorId  = 1;
  saveState();
  if (typeof wedTab === 'function') wedTab(WED.activeTab || 'overview');
  showToast('☁️ Plans synced from cloud!');
}
window._applyCloudData = _applyCloudData;

function _showCloudConflictSheet(cloudData) {
  const old = document.getElementById('cloud-conflict-sheet');
  if (old) old.remove();
  const d = cloudData._savedAt
    ? new Date(cloudData._savedAt).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})
    : 'unknown date';
  const ov = document.createElement('div');
  ov.id = 'cloud-conflict-sheet';
  ov.style.cssText = 'position:fixed;inset:0;z-index:1100;background:rgba(44,31,14,0.4);display:flex;align-items:flex-end;justify-content:center;';
  ov.innerHTML = `
    <div style="width:100%;max-width:440px;background:var(--cream);border-radius:22px 22px 0 0;padding:28px 20px 44px;box-shadow:0 -8px 40px rgba(44,31,14,0.22)">
      <div style="font-size:30px;text-align:center;margin-bottom:8px">☁️</div>
      <div style="font-size:15px;font-weight:700;color:var(--ink);text-align:center;margin-bottom:6px">Cloud Backup Found</div>
      <div style="font-size:12px;color:var(--ink-3);text-align:center;margin-bottom:22px;line-height:1.6">
        You have plans saved both here and in the cloud.<br>
        <span style="font-weight:700;color:var(--tan-dark)">Cloud last saved: ${d}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button id="_ccs_cloud"
          style="width:100%;padding:13px;border-radius:var(--r-md);background:linear-gradient(135deg,var(--tan),var(--tan-dark));border:none;font-size:13px;font-weight:700;color:white;cursor:pointer;font-family:var(--f)">
          ☁️ Load from Cloud (${d})</button>
        <button id="_ccs_local"
          style="width:100%;padding:13px;border-radius:var(--r-md);border:1.5px solid rgba(201,169,110,0.3);background:rgba(255,253,248,0.9);font-size:13px;font-weight:700;color:var(--ink-3);cursor:pointer;font-family:var(--f)">
          💾 Keep Local Data &amp; Upload to Cloud</button>
      </div>
    </div>`;
  ov.querySelector('#_ccs_cloud').onclick = () => { _applyCloudData(cloudData); ov.remove(); };
  ov.querySelector('#_ccs_local').onclick = () => { cloudSave(); ov.remove(); showToast('💾 Local data kept & uploading...'); };
  document.body.appendChild(ov);
}

/* ── TEMPLATE EXPORT ─────────────────────────── */
function exportTemplate() {
  const p1 = WED.couple.p1 || 'Partner1';
  const p2 = WED.couple.p2 || 'Partner2';
  const payload = {
    _type:       'kasalko-template',
    _version:    1,
    _exportedAt: new Date().toISOString(),
    _author:     CURRENT_USER ? (CURRENT_USER.displayName || CURRENT_USER.email) : 'Anonymous',
    title:       `${p1} & ${p2} Wedding`,
    couple:    WED.couple,    date:     WED.date,
    venue:     WED.venue,     budget:   WED.budget,
    guests:    WED.guests,    expenses: WED.expenses,
    checklist: WED.checklist, schedule: WED.schedule,
    furniture: WED.furniture, vendors:  WED.vendors,
    nextFurnitureId: WED.nextFurnitureId,
    nextGuestId:     WED.nextGuestId,
    nextVendorId:    WED.nextVendorId,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `kasalko-${p1.toLowerCase()}-${p2.toLowerCase()}-${Date.now()}.json`,
  });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📦 Template exported!');
}

/* ── TEMPLATE IMPORT ─────────────────────────── */
function triggerImportTemplate() {
  let inp = document.getElementById('_tpl_import_inp');
  if (!inp) {
    inp = Object.assign(document.createElement('input'), {
      id:'_tpl_import_inp', type:'file', accept:'.json,application/json',
    });
    inp.style.display = 'none';
    inp.onchange = e => { if (e.target.files[0]) importTemplate(e.target.files[0]); };
    document.body.appendChild(inp);
  }
  inp.value = ''; inp.click();
}

function importTemplate(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data._type !== 'kasalko-template') { showToast('⚠️ Not a valid Kasalko template'); return; }
      const byline = data._author ? ` by ${data._author}` : '';
      if (!confirm(`Import "${data.title}"${byline}?\n\nThis will replace your current data.`)) return;
      const { _type, _version, _exportedAt, _author, title, ...wedData } = data;
      Object.assign(WED, wedData);
      if (!WED._customPhases) WED._customPhases = [];
      if (!WED.vendors)       WED.vendors       = [];
      if (!WED.nextVendorId)  WED.nextVendorId  = 1;
      saveState();
      if (CURRENT_USER) cloudSave();
      if (typeof wedTab === 'function') wedTab(WED.activeTab || 'overview');
      showToast('📦 Template imported!');
    } catch(err) { showToast('⚠️ Invalid template file'); }
  };
  reader.readAsText(file);
}

/* ── AUTH MODAL HELPERS ──────────────────────── */
let _authMode = 'signin';

function openAuthModal() {
  if (!_fbReady) {
    showToast('⚠️ Firebase not configured yet — see firebase-config.js');
    return;
  }
  if (CURRENT_USER) { openUserMenu(); return; }
  _setAuthTab('signin');
  openModal('auth-modal');
}

function setAuthMode(mode) {
  _setAuthTab(mode);
}

function _setAuthTab(mode) {
  _authMode = mode;
  const signinTab  = document.getElementById('auth-tab-signin');
  const regTab     = document.getElementById('auth-tab-register');
  const signinForm = document.getElementById('auth-form-signin');
  const regForm    = document.getElementById('auth-form-register');
  if (!signinTab) return;
  const activeStyle   = 'background:rgba(255,253,248,0.95);color:var(--tan-dark);box-shadow:0 1px 4px rgba(44,31,14,0.1);';
  const inactiveStyle = 'background:transparent;color:var(--ink-4);box-shadow:none;';
  signinTab.style.cssText  += mode === 'signin'   ? activeStyle : inactiveStyle;
  regTab.style.cssText     += mode === 'register' ? activeStyle : inactiveStyle;
  signinForm.style.display  = mode === 'signin'   ? 'block' : 'none';
  regForm.style.display     = mode === 'register' ? 'block' : 'none';
}

function submitAuthSignIn() {
  if (!AUTH) return;
  const email = document.getElementById('auth-email')?.value.trim();
  const pass  = document.getElementById('auth-password')?.value;
  if (!email || !pass) { showToast('⚠️ Enter email and password'); return; }
  AUTH.signInWithEmailAndPassword(email, pass)
    .then(() => { closeModal('auth-modal'); showToast('👋 Welcome back!'); })
    .catch(err => showToast('⚠️ ' + _authErrMsg(err.code)));
}

function submitAuthRegister() {
  if (!AUTH) return;
  const name  = document.getElementById('auth-reg-name')?.value.trim();
  const email = document.getElementById('auth-reg-email')?.value.trim();
  const pass  = document.getElementById('auth-reg-pass')?.value;
  if (!email || !pass) { showToast('⚠️ Enter email and password'); return; }
  if (pass.length < 6) { showToast('⚠️ Password needs at least 6 characters'); return; }
  AUTH.createUserWithEmailAndPassword(email, pass)
    .then(cred => name ? cred.user.updateProfile({ displayName: name }) : null)
    .then(() => { closeModal('auth-modal'); showToast('🎉 Account created! Plans will sync automatically.'); })
    .catch(err => showToast('⚠️ ' + _authErrMsg(err.code)));
}

function signInWithGoogle() {
  if (!AUTH) return;
  AUTH.signInWithPopup(new firebase.auth.GoogleAuthProvider())
    .then(() => { closeModal('auth-modal'); showToast('👋 Signed in with Google!'); })
    .catch(err => showToast('⚠️ ' + _authErrMsg(err.code)));
}

function _authErrMsg(code) {
  return ({
    'auth/user-not-found':       'No account with that email.',
    'auth/wrong-password':       'Wrong password.',
    'auth/email-already-in-use': 'Email already in use.',
    'auth/invalid-email':        'Invalid email address.',
    'auth/weak-password':        'Password too weak (min 6 chars).',
    'auth/popup-closed-by-user': 'Sign-in cancelled.',
    'auth/network-request-failed': 'Network error — check your connection.',
    'auth/invalid-credential':   'Wrong email or password.',
  })[code] || code;
}

/* ── USER MENU (signed in) ───────────────────── */
function openUserMenu() {
  const old = document.getElementById('user-menu-sheet');
  if (old) { old.remove(); return; }
  if (!CURRENT_USER) { openAuthModal(); return; }
  const user = CURRENT_USER;
  const name = user.displayName || user.email.split('@')[0];
  const initials = name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
  const ov = document.createElement('div');
  ov.id = 'user-menu-sheet';
  ov.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(44,31,14,0.25);display:flex;align-items:flex-end;justify-content:center;';
  ov.innerHTML = `
    <div style="width:100%;max-width:440px;background:var(--cream);border-radius:22px 22px 0 0;padding:24px 16px 44px;box-shadow:0 -8px 40px rgba(44,31,14,0.2)">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(201,169,110,0.15)">
        <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--tan),var(--tan-dark));display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:white;flex-shrink:0">${initials}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:700;color:var(--ink)">${name}</div>
          <div style="font-size:11px;color:var(--ink-4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${user.email}</div>
          <div style="font-size:10.5px;font-weight:700;color:var(--green-deep);margin-top:2px">☁️ Cloud Sync Active</div>
        </div>
        <button onclick="document.getElementById('user-menu-sheet').remove()" style="width:28px;height:28px;border-radius:50%;border:none;background:rgba(44,31,14,0.07);font-size:16px;cursor:pointer;flex-shrink:0">×</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button onclick="cloudSaveNow();document.getElementById('user-menu-sheet').remove()"
          style="width:100%;padding:12px 16px;border-radius:var(--r-md);border:1px solid rgba(201,169,110,0.25);background:rgba(245,230,200,0.55);font-size:13px;font-weight:700;color:var(--tan-dark);cursor:pointer;font-family:var(--f);text-align:left">
          ☁️ Sync to Cloud Now</button>
        <button onclick="exportTemplate();document.getElementById('user-menu-sheet').remove()"
          style="width:100%;padding:12px 16px;border-radius:var(--r-md);border:1px solid rgba(201,169,110,0.25);background:rgba(245,230,200,0.55);font-size:13px;font-weight:700;color:var(--tan-dark);cursor:pointer;font-family:var(--f);text-align:left">
          📦 Export Template (.json)</button>
        <button onclick="triggerImportTemplate();document.getElementById('user-menu-sheet').remove()"
          style="width:100%;padding:12px 16px;border-radius:var(--r-md);border:1px solid rgba(201,169,110,0.25);background:rgba(245,230,200,0.55);font-size:13px;font-weight:700;color:var(--tan-dark);cursor:pointer;font-family:var(--f);text-align:left">
          📂 Import Template</button>
        <button onclick="kasalkoSignOut();document.getElementById('user-menu-sheet').remove()"
          style="width:100%;padding:12px 16px;border-radius:var(--r-md);border:1px solid rgba(224,120,152,0.25);background:rgba(252,232,238,0.55);font-size:13px;font-weight:700;color:var(--pink-deep);cursor:pointer;font-family:var(--f);text-align:left">
          🚪 Sign Out</button>
      </div>
    </div>`;
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}

function kasalkoSignOut() {
  if (!AUTH) return;
  AUTH.signOut().then(() => showToast('👋 Signed out'));
}

/* ── OVERVIEW CLOUD SECTION ──────────────────── */
function renderCloudSection() {
  const btnBase = `width:100%;padding:10px 14px;border-radius:var(--r-md);font-size:12.5px;font-weight:700;cursor:pointer;font-family:var(--f);text-align:left;border:1px solid rgba(201,169,110,0.25);background:rgba(245,230,200,0.55);color:var(--tan-dark)`;
  const pinkBtn = `width:100%;padding:10px 14px;border-radius:var(--r-md);font-size:12.5px;font-weight:700;cursor:pointer;font-family:var(--f);text-align:left;border:1px solid rgba(224,120,152,0.25);background:rgba(252,232,238,0.55);color:var(--pink-deep)`;

  if (!_fbReady) {
    // Firebase not configured yet
    return `
      <div style="padding:16px;border-radius:18px;margin-top:12px" class="glass">
        <span class="sec-title">📦 Templates &amp; Backup</span>
        <div style="font-size:12px;color:var(--ink-4);margin-bottom:12px">Export your wedding plan as a .json file to back it up or share it.</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button onclick="exportTemplate()" style="${btnBase}">📦 Export</button>
          <button onclick="triggerImportTemplate()" style="${btnBase}">📂 Import</button>
        </div>
      </div>`;
  }

  if (window.CURRENT_USER) {
    const user = window.CURRENT_USER;
    const name = user.displayName || user.email.split('@')[0];
    return `
      <div style="padding:16px;border-radius:18px;margin-top:12px" class="glass">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span class="sec-title" style="margin-bottom:0">☁️ Cloud &amp; Templates</span>
          <span style="font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:8px;background:rgba(90,171,122,0.12);color:var(--green-deep);border:1px solid rgba(90,171,122,0.2)">● Live</span>
        </div>
        <div style="font-size:12px;color:var(--ink-3);margin-bottom:12px">Signed in as <b>${name}</b> — plans auto-sync on save.</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button onclick="cloudSaveNow()" style="${btnBase}">☁️ Sync Now</button>
          <button onclick="openUserMenu()" style="${btnBase}">👤 Account</button>
          <button onclick="exportTemplate()" style="${btnBase}">📦 Export</button>
          <button onclick="triggerImportTemplate()" style="${btnBase}">📂 Import</button>
        </div>
      </div>`;
  }

  // Not signed in
  return `
    <div style="padding:16px;border-radius:18px;margin-top:12px" class="glass-pink">
      <span class="sec-title">☁️ Cloud Sync &amp; Templates</span>
      <div style="font-size:12px;color:var(--ink-3);margin-bottom:14px;line-height:1.5">Sign in to save your plans to the cloud, sync across devices, and share templates.</div>
      <button onclick="openAuthModal()" class="cta-btn" style="margin-bottom:10px">☁️ Sign In / Create Account</button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button onclick="exportTemplate()" style="${btnBase}">📦 Export .json</button>
        <button onclick="triggerImportTemplate()" style="${btnBase}">📂 Import .json</button>
      </div>
    </div>`;
}

/* ── WINDOW EXPORTS ──────────────────────────── */
window.cloudSave              = cloudSave;
window.cloudSaveNow           = cloudSaveNow;
window.cloudLoadWedding       = cloudLoadWedding;
window.exportTemplate         = exportTemplate;
window.triggerImportTemplate  = triggerImportTemplate;
window.importTemplate         = importTemplate;
window.openAuthModal          = openAuthModal;
window.setAuthMode            = setAuthMode;
window.submitAuthSignIn       = submitAuthSignIn;
window.submitAuthRegister     = submitAuthRegister;
window.signInWithGoogle       = signInWithGoogle;
window.openUserMenu           = openUserMenu;
window.kasalkoSignOut         = kasalkoSignOut;
window.renderCloudSection     = renderCloudSection;
window.updateAuthUI           = updateAuthUI;
