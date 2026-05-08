/* ═══════════════════════════════════════════════
   ANO TARA — app.js
   ═══════════════════════════════════════════════ */

'use strict';

/* ── NAVIGATION ──────────────────────────────── */
const navHistory = ['home'];
const allScreens = ['home','groups','group-detail','couple','receipt','settings'];
const navBtnIds  = ['home','groups','couple','settings'];

function navTo(id) {
  allScreens.forEach(s => {
    const el = document.getElementById(s);
    if (!el) return;
    const wasActive = el.classList.contains('active');
    el.classList.remove('active');
    if (s === id) {
      el.classList.add('active');
      if (!wasActive) {
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
      }
    }
  });

  navBtnIds.forEach(s => {
    const btn = document.getElementById('nav-' + s);
    if (btn) btn.classList.toggle('active', s === id);
  });

  if (navHistory[navHistory.length - 1] !== id) navHistory.push(id);

  const fab = document.querySelector('.fab');
  if (fab) {
    fab.style.display = ['group-detail', 'receipt', 'settings'].includes(id) ? 'none' : 'flex';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
  if (navHistory.length > 1) {
    navHistory.pop();
    navTo(navHistory[navHistory.length - 1]);
  }
}

/* ── TABS (group detail) ─────────────────────── */
function switchTab(name) {
  ['tasks', 'expenses', 'members', 'settle'].forEach(t => {
    const panel = document.getElementById('panel-' + t);
    const tab   = document.getElementById('tab-' + t);
    if (panel) panel.style.display = t === name ? 'block' : 'none';
    if (tab)   tab.classList.toggle('active', t === name);
  });
}

/* ── TASK CYCLE ──────────────────────────────── */
function cycleTask(el) {
  const check  = el.querySelector('.task-check');
  const name   = el.querySelector('.task-name');
  const status = el.querySelector('.task-status');

  if (check.classList.contains('done')) {
    check.classList.remove('done');
    name.classList.remove('done-text');
    status.className = 'task-status s-pending';
    status.textContent = 'Pending';
    showToast('↩ Task set back to pending');
  } else if (check.classList.contains('progress')) {
    check.classList.remove('progress');
    check.classList.add('done');
    name.classList.add('done-text');
    status.className = 'task-status s-done';
    status.textContent = 'Done';
    showToast('✅ Task completed!');
  } else {
    check.classList.add('progress');
    status.className = 'task-status s-progress';
    status.textContent = 'In Progress';
    showToast('🔄 Marked in progress');
  }
}

/* ── MODALS ──────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModalById(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function closeModalOutside(e, id) {
  if (e.target.id === id) closeModalById(id);
}

/* ── MODAL ACTIONS ───────────────────────────── */
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
  showToast(name ? `🎉 "${name}" created!` : '🎉 New group created!');
  setTimeout(() => navTo('groups'), 380);
}

function addExpense() {
  closeModalById('add-expense-modal');
  showToast('💸 Expense added!');
}

function addTask() {
  closeModalById('add-task-modal');
  showToast('✅ Task added!');
}

/* ── TOAST ───────────────────────────────────── */
let _toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ── POLL VOTING ─────────────────────────────── */
const pollVotes = [55, 30, 15];

function vote(el, idx) {
  document.querySelectorAll('.poll-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');

  pollVotes[idx] = Math.min(pollVotes[idx] + 12, 94);
  const total = pollVotes.reduce((a, b) => a + b, 0);

  pollVotes.forEach((v, i) => {
    const pct  = Math.round((v / total) * 100);
    const fill  = document.getElementById('pf' + i);
    const label = document.getElementById('pp' + i);
    if (fill)  fill.style.width = pct + '%';
    if (label) label.textContent = pct + '%';
  });

  showToast('🗳️ Vote recorded!');
}

/* ── OPEN GROUP DETAIL (with color variant) ─── */
function openGroup(variant) {
  // Swap hero & tab color based on group variant
  const hero = document.getElementById('group-hero-el');
  if (hero) {
    hero.className = 'group-hero gh-' + (variant || 'familia');
  }
  navTo('group-detail');
}

/* ── SMOOTH PROGRESS BARS ON LOAD ────────────── */
function animateProgressBars() {
  document.querySelectorAll('.prog-fill[data-width]').forEach(el => {
    const w = el.getAttribute('data-width');
    setTimeout(() => { el.style.width = w; }, 120);
  });
  document.querySelectorAll('.goal-fill[data-width]').forEach(el => {
    const w = el.getAttribute('data-width');
    setTimeout(() => { el.style.width = w; }, 150);
  });
}

/* ── INIT ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  navTo('home');
  animateProgressBars();

  // Close modals on escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => {
        m.classList.remove('open');
      });
    }
  });
});
