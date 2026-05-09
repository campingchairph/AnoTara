/* ═══════════════════════════════════════════════
   ANO TARA — wedding.js
   Full wedding planner: canvas seating, guests,
   budget, checklist, schedule, RSVP card
   ═══════════════════════════════════════════════ */
/* ── WEDDING STATE ───────────────────────────── */
const WED = {
  couple:   { p1: '', p2: '' },
  date:     '',
  venue:    '',
  budget:   0,
  activeTab: 'overview',
  customCardImage: null, // base64 uploaded card

  guests:   [],
  expenses: [],

  checklist: [
    { phase:'12 Months Out', items:[
      { id:'c1',  text:'Set wedding date',                done:false },
      { id:'c2',  text:'Book the venue',                  done:false },
      { id:'c3',  text:'Set overall budget',              done:false },
      { id:'c4',  text:'Create initial guest list',       done:false },
      { id:'c5',  text:'Hire wedding coordinator',        done:false },
    ]},
    { phase:'6 Months Out', items:[
      { id:'c6',  text:'Book photographer & videographer',done:false },
      { id:'c7',  text:'Book catering',                   done:false },
      { id:'c8',  text:'Choose & order wedding attire',   done:false },
      { id:'c9',  text:'Send save-the-dates',             done:false },
      { id:'c10', text:'Book live band or DJ',            done:false },
    ]},
    { phase:'3 Months Out', items:[
      { id:'c11', text:'Send formal invitations',         done:false },
      { id:'c12', text:'Finalize menu with caterer',      done:false },
      { id:'c13', text:'Book hair & makeup',              done:false },
      { id:'c14', text:'Order wedding cake',              done:false },
      { id:'c15', text:'Arrange accommodations for guests',done:false},
    ]},
    { phase:'1 Month Out', items:[
      { id:'c16', text:'Confirm all vendors',             done:false },
      { id:'c17', text:'Finalize seating arrangement',    done:false },
      { id:'c18', text:'Submit final headcount to caterer',done:false},
      { id:'c19', text:'Pick up wedding attire',          done:false },
      { id:'c20', text:'Prepare payments & envelopes',    done:false },
    ]},
    { phase:'Week Of', items:[
      { id:'c21', text:'Wedding rehearsal',               done:false },
      { id:'c22', text:'Confirm vendors one last time',   done:false },
      { id:'c23', text:'Pack for honeymoon',              done:false },
      { id:'c24', text:'Prepare emergency kit',           done:false },
    ]},
    { phase:'Day Of', items:[
      { id:'c25', text:'Hair & makeup',                   done:false },
      { id:'c26', text:'Bride/groom gets dressed',        done:false },
      { id:'c27', text:'Ceremony',                        done:false },
      { id:'c28', text:'Reception',                       done:false },
      { id:'c29', text:'Send-off / exit',                 done:false },
    ]},
  ],

  schedule: [],

  // Canvas furniture items
  furniture: [],

  dragging: null,
  dragOffX:  0,
  dragOffY:  0,
  selectedFurniture: null,
  nextFurnitureId: 1,
  nextGuestId: 1,
};

/* ── SYNC RSVP RESPONSES ─────────────────────── */
function syncRSVPResponses() {
  try {
    const pending = JSON.parse(localStorage.getItem('at_rsvp_pending') || '[]');
    if (!pending.length) return;
    let updated = 0;
    pending.forEach(r => {
      const g = WED.guests.find(g => g.id == r.gid);
      if (g && g.rsvp !== r.status) { g.rsvp = r.status; updated++; }
    });
    if (updated) {
      renderGuests();
      renderOverview();
      showToast('📬 ' + updated + ' RSVP response' + (updated > 1 ? 's' : '') + ' synced!');
    }
  } catch(e) {}
}

/* ── COUNTDOWN ───────────────────────────────── */
function getCountdown() {
  const diff = new Date(WED.date) - new Date();
  if (diff <= 0) return '🎊 The big day is here!';
  const days = Math.floor(diff / 86400000);
  if (days > 365) return `${Math.floor(days/365)} years, ${Math.floor((days%365)/30)} months to go`;
  if (days > 30)  return `${Math.floor(days/30)} months, ${days%30} days to go`;
  return `${days} days to go`;
}

/* ── TAB SWITCH ──────────────────────────────── */
function wedTab(name) {
  WED.activeTab = name;
  ['overview','budget','guests','seating','checklist','schedule'].forEach(t => {
    const panel = document.getElementById('wed-panel-'+t);
    const tab   = document.getElementById('wed-tab-'+t);
    if (panel) panel.style.display = t === name ? 'block' : 'none';
    if (tab)   tab.classList.toggle('active', t === name);
  });
  if (name === 'seating')  initCanvas();
  if (name === 'guests')   { syncRSVPResponses(); renderGuests(); }
  if (name === 'budget')   renderBudget();
  if (name === 'checklist') renderChecklist();
  if (name === 'schedule') renderSchedule();
}

/* ── OVERVIEW ────────────────────────────────── */
function renderOverview() {
  const el = document.getElementById('wed-overview-content');
  if (!el) return;
  const totalDone = WED.checklist.reduce((a,p) => a + p.items.filter(i=>i.done).length, 0);
  const totalItems= WED.checklist.reduce((a,p) => a + p.items.length, 0);
  const pct = Math.round((totalDone/totalItems)*100);
  const spent = WED.expenses.filter(e=>e.paid).reduce((a,e)=>a+e.amount,0);
  const attending = WED.guests.filter(g=>g.rsvp==='attending').length;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div class="wed-stat-card glass-pink">
        <div class="wed-stat-emoji">💍</div>
        <div class="wed-stat-val">${getCountdown()}</div>
        <div class="wed-stat-lbl">Until the Big Day</div>
      </div>
      <div class="wed-stat-card glass-green">
        <div class="wed-stat-emoji">👥</div>
        <div class="wed-stat-val">${attending} / ${WED.guests.length}</div>
        <div class="wed-stat-lbl">Guests Confirmed</div>
      </div>
      <div class="wed-stat-card glass-cream">
        <div class="wed-stat-emoji">💰</div>
        <div class="wed-stat-val">₱${spent.toLocaleString()}</div>
        <div class="wed-stat-lbl">of ₱${WED.budget.toLocaleString()} spent</div>
      </div>
      <div class="wed-stat-card glass">
        <div class="wed-stat-emoji">✅</div>
        <div class="wed-stat-val">${pct}%</div>
        <div class="wed-stat-lbl">Planning Complete</div>
      </div>
    </div>
    <div style="margin-bottom:16px;padding:16px;border-radius:var(--r-lg)" class="glass">
      <div style="font-size:12px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px">Planning Progress</div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="flex:1;height:10px;border-radius:5px;background:rgba(44,31,14,0.08);overflow:hidden">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--pink-accent),var(--tan));border-radius:5px;transition:width 0.8s cubic-bezier(0.34,1.56,0.64,1)"></div>
        </div>
        <span style="font-size:13px;font-weight:700;color:var(--tan-dark)">${pct}%</span>
      </div>
      <div style="font-size:11.5px;color:var(--ink-4);margin-top:6px">${totalDone} of ${totalItems} tasks complete</div>
    </div>
    <div style="padding:16px;border-radius:var(--r-lg);margin-bottom:12px" class="glass">
      <div style="font-size:12px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px">Event Details</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;gap:10px;align-items:center"><span style="font-size:16px">💑</span><div><div style="font-size:13px;font-weight:700;color:var(--ink)">${WED.couple.p1} &amp; ${WED.couple.p2}</div><div style="font-size:11px;color:var(--ink-4)">Couple</div></div></div>
        <div style="display:flex;gap:10px;align-items:center"><span style="font-size:16px">📅</span><div><div style="font-size:13px;font-weight:700;color:var(--ink)">${new Date(WED.date).toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div><div style="font-size:11px;color:var(--ink-4)">Wedding Date</div></div></div>
        <div style="display:flex;gap:10px;align-items:center"><span style="font-size:16px">📍</span><div><div style="font-size:13px;font-weight:700;color:var(--ink)">${WED.venue}</div><div style="font-size:11px;color:var(--ink-4)">Venue</div></div></div>
      </div>
    </div>`;
}

/* ── BUDGET ──────────────────────────────────── */
const CAT_COLORS = { venue:'sand', catering:'green', florals:'pink', photography:'cream', attire:'pink', music:'sand', cake:'cream', invites:'green', other:'sand' };
const CAT_EMOJIS = { venue:'🏛️', catering:'🍽️', florals:'💐', photography:'📸', attire:'👗', music:'🎵', cake:'🎂', invites:'💌', other:'📦' };

function renderBudget() {
  const el = document.getElementById('wed-budget-content');
  if (!el) return;
  if (!WED.expenses.length && !WED.budget) {
    el.innerHTML = '<div style="text-align:center;padding:40px 20px">'
      + '<div style="font-size:40px;margin-bottom:12px">💸</div>'
      + '<div style="font-size:16px;font-weight:700;color:var(--ink);margin-bottom:8px">No Budget Set Yet</div>'
      + '<div style="font-size:13px;color:var(--ink-4);margin-bottom:20px">Set your total budget and start<br>tracking wedding expenses.</div>'
      + '<button onclick="window.openWedModal(&quot;wed-edit-overview-modal&quot;)" style="padding:12px 24px;border-radius:var(--r-md);background:rgba(245,230,200,0.8);border:1px solid rgba(201,169,110,0.3);font-size:13px;font-weight:700;color:var(--tan-dark);cursor:pointer">Set Budget</button>'
      + '</div>';
    return;
  }
  const totalSpent = WED.expenses.reduce((a,e)=>a+e.amount,0);
  const paid = WED.expenses.filter(e=>e.paid).reduce((a,e)=>a+e.amount,0);
  const remaining = WED.budget - totalSpent;
  const pct = Math.min(Math.round((totalSpent/WED.budget)*100),100);

  const byCat = {};
  WED.expenses.forEach(e => { byCat[e.category] = (byCat[e.category]||0)+e.amount; });

  el.innerHTML = `
    <div style="padding:18px;border-radius:var(--r-xl);margin-bottom:16px;background:linear-gradient(135deg,rgba(245,230,200,0.92),rgba(232,245,237,0.80));border:1px solid rgba(255,255,255,0.72);box-shadow:var(--edge),0 8px 28px rgba(44,31,14,0.10)">
      <div style="font-size:11px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.8px">Total Budget</div>
      <div style="font-family:var(--f2);font-size:34px;font-style:italic;font-weight:600;color:var(--ink);letter-spacing:-1px;margin:4px 0 12px">₱${WED.budget.toLocaleString()}</div>
      <div style="height:8px;border-radius:4px;background:rgba(44,31,14,0.08);overflow:hidden;margin-bottom:8px">
        <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--green-accent),var(--tan));border-radius:4px"></div>
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

    <div style="font-size:12px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px">By Category</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${Object.entries(byCat).map(([cat,amt])=>`
        <div class="glass-${CAT_COLORS[cat]||'cream'}" style="padding:12px;border-radius:var(--r-md)">
          <div style="font-size:20px;margin-bottom:4px">${CAT_EMOJIS[cat]||'📦'}</div>
          <div style="font-size:12.5px;font-weight:700;color:var(--ink);text-transform:capitalize">${cat}</div>
          <div style="font-family:var(--f2);font-size:16px;font-style:italic;color:var(--ink);margin-top:2px">₱${amt.toLocaleString()}</div>
        </div>`).join('')}
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-size:12px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px">All Expenses</span>
      <button onclick="openWedModal('wed-add-expense-modal')" style="padding:6px 14px;border-radius:var(--r-xs);background:rgba(201,169,110,0.15);border:1px solid rgba(201,169,110,0.25);font-size:12px;font-weight:700;color:var(--tan-dark);cursor:pointer">+ Add</button>
    </div>
    ${WED.expenses.map(e=>`
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
      </div>`).join('')}`;
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
      <button onclick="openWedModal('wed-add-guest-modal')" style="flex:1;padding:10px;border-radius:var(--r-md);background:rgba(245,230,200,0.65);border:1px solid rgba(201,169,110,0.28);font-size:13px;font-weight:700;color:var(--tan-dark);cursor:pointer">+ Add Guest</button>
      <button onclick="showRSVPCard()" style="flex:1;padding:10px;border-radius:var(--r-md);background:rgba(252,232,238,0.65);border:1px solid rgba(224,120,152,0.28);font-size:13px;font-weight:700;color:var(--pink-deep);cursor:pointer">💌 Send Invites</button>
    </div>

    ${WED.guests.map(g => {
      const chair = WED.furniture.find(f => g._chairId === f.id);
      const params = new URLSearchParams({ name:g.name, table:g.table, seat:g.seat, chair:chair?chair.label:'', wedding:WED.couple.p1+' & '+WED.couple.p2, date:WED.date, venue:WED.venue });
      const rsvpLink = 'https://campingchairph.github.io/AnoTara/rsvp.html?'+params.toString();
      return '<div class="glass" style="border-radius:var(--r-md);margin-bottom:7px;overflow:hidden">'
        + '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px">'
        + '<div style="width:38px;height:38px;border-radius:10px;background:'+(g.rsvp==='attending'?'rgba(232,245,237,0.8)':g.rsvp==='declined'?'rgba(252,232,238,0.8)':'rgba(245,230,200,0.8)')+';display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:'+(g.rsvp==='attending'?'var(--green-deep)':g.rsvp==='declined'?'var(--pink-deep)':'var(--tan-dark)')+';flex-shrink:0;border:1px solid rgba(255,255,255,0.6)">'
        + g.name.split(' ').map(n=>n[0]).join('').substring(0,2)+'</div>'
        + '<div style="flex:1;min-width:0">'
        + '<div style="font-size:13.5px;font-weight:700;color:var(--ink)">'+g.name+'</div>'
        + '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:3px">'
        + '<span style="font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:6px;background:rgba(245,230,200,0.7);color:var(--tan-dark);border:1px solid rgba(201,169,110,0.2)">Table '+g.table+' · Seat '+g.seat+'</span>'
        + (chair?'<span style="font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:6px;background:rgba(90,171,122,0.12);color:var(--green-deep);border:1px solid rgba(90,171,122,0.2)">🪑 '+chair.label+'</span>':'')
        + (g.meal?'<span style="font-size:10.5px;padding:2px 7px;border-radius:6px;background:rgba(255,253,248,0.8);color:var(--ink-3);border:1px solid rgba(201,169,110,0.12)">'+g.meal+'</span>':'')
        + '</div></div>'
        + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">'
        + '<select onchange="updateGuestRSVP('+g.id+',this.value)" style="padding:4px 8px;border-radius:8px;border:1px solid rgba(201,169,110,0.25);background:rgba(255,253,248,0.8);font-size:11px;font-weight:700;color:var(--ink-2);font-family:var(--f);cursor:pointer;outline:none">'
        + '<option value="attending" '+(g.rsvp==='attending'?'selected':'')+'>✅ Attending</option>'
        + '<option value="pending" '+(g.rsvp==='pending'?'selected':'')+'>⏳ Pending</option>'
        + '<option value="declined" '+(g.rsvp==='declined'?'selected':'')+'>❌ Declined</option>'
        + '</select>'
        + '<button onclick="removeGuest('+g.id+')" style="width:26px;height:26px;border-radius:7px;border:none;background:rgba(224,120,152,0.12);font-size:13px;cursor:pointer;color:var(--pink-deep)">🗑</button>'
        + '</div></div>'
        + '<div style="padding:8px 14px 10px;border-top:1px solid rgba(201,169,110,0.1);display:flex;align-items:center;justify-content:space-between;gap:8px">'
        + '<span style="font-size:10.5px;color:var(--ink-4);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+rsvpLink.replace('https://','')+'</span>'
        + '<button onclick="copyGuestLink('+g.id+')" style="padding:4px 10px;border-radius:7px;border:1px solid rgba(201,169,110,0.25);background:rgba(245,230,200,0.6);font-size:11px;font-weight:700;color:var(--tan-dark);cursor:pointer;flex-shrink:0">📋 Copy</button>'
        + '</div></div>';
    }).join('')}`;
}

function updateGuestRSVP(id, val) {
  const g = WED.guests.find(g=>g.id===id);
  if (g) { g.rsvp = val; renderGuests(); showToast('✅ RSVP updated for '+g.name); }
}

/* ── INVITATION / RSVP CARD ──────────────────── */
function showRSVPCard() {
  const modal = document.getElementById('rsvp-card-modal');
  if (!modal) return;
  const canvas = document.getElementById('rsvp-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = 380;
  const h = canvas.height = 560;

  // If user uploaded a custom card, draw that instead
  if (WED.customCardImage) {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, w, h);
      ctx.fillStyle='#c9a96e';
      ctx.font='italic 400 13px Lora, serif';
      ctx.textAlign='center';
      ctx.fillText('Scan QR code below to RSVP', w/2, h-14);
      const qrTarget = document.getElementById('rsvp-qr-target');
      if (qrTarget && window.QRCode) {
        qrTarget.innerHTML = '';
        const rsvpUrl = 'https://campingchairph.github.io/AnoTara/rsvp.html?cardImg=1&wedding='+encodeURIComponent(WED.couple.p1+' & '+WED.couple.p2)+'&date='+encodeURIComponent(WED.date)+'&venue='+encodeURIComponent(WED.venue);
        new QRCode(qrTarget, { text:rsvpUrl, width:120, height:120, colorDark:'#2c1f0e', colorLight:'#fef6e8' });
      }
    };
    img.src = WED.customCardImage;
    modal.classList.add('open');
    return;
  }

  // Background gradient
  const grad = ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0, '#fef6e8');
  grad.addColorStop(0.5, '#fce8ee');
  grad.addColorStop(1, '#e8f5ed');
  ctx.fillStyle = grad;
  ctx.roundRect(0,0,w,h,24);
  ctx.fill();

  // Decorative circles
  ctx.globalAlpha=0.12;
  ctx.fillStyle='#c9a96e';
  ctx.beginPath(); ctx.arc(340,60,90,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#e07898';
  ctx.beginPath(); ctx.arc(40,500,70,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;

  // Border
  ctx.strokeStyle='rgba(201,169,110,0.35)';
  ctx.lineWidth=1.5;
  ctx.roundRect(8,8,w-16,h-16,20);
  ctx.stroke();

  // Floral emoji decorations
  ctx.font='28px serif';
  ctx.fillText('🌸',20,50);
  ctx.fillText('🌸',w-50,50);
  ctx.fillText('🌿',14,h-30);
  ctx.fillText('🌿',w-42,h-30);

  // Header
  ctx.fillStyle='#7a6045';
  ctx.font='500 13px Figtree, sans-serif';
  ctx.textAlign='center';
  ctx.fillText('YOU ARE CORDIALLY INVITED TO THE WEDDING OF', w/2, 80);

  // Names
  ctx.fillStyle='#2c1f0e';
  ctx.font='italic 600 38px Lora, serif';
  ctx.fillText(`${WED.couple.p1}`, w/2, 130);
  ctx.fillStyle='#c9a96e';
  ctx.font='italic 400 22px Lora, serif';
  ctx.fillText('&', w/2, 162);
  ctx.fillStyle='#2c1f0e';
  ctx.font='italic 600 38px Lora, serif';
  ctx.fillText(`${WED.couple.p2}`, w/2, 200);

  // Divider
  ctx.strokeStyle='rgba(201,169,110,0.4)';
  ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(60,220); ctx.lineTo(w-60,220); ctx.stroke();

  // Date
  const dateStr = new Date(WED.date).toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  ctx.fillStyle='#4a3520';
  ctx.font='600 15px Figtree, sans-serif';
  ctx.fillText(dateStr, w/2, 252);

  // Time & Venue
  ctx.fillStyle='#7a6045';
  ctx.font='400 13px Figtree, sans-serif';
  ctx.fillText('3:00 PM', w/2, 275);
  ctx.font='600 14px Figtree, sans-serif';
  ctx.fillStyle='#4a3520';
  ctx.fillText(WED.venue, w/2, 300);

  // Divider
  ctx.strokeStyle='rgba(201,169,110,0.3)';
  ctx.beginPath(); ctx.moveTo(60,318); ctx.lineTo(w-60,318); ctx.stroke();

  // RSVP section
  ctx.fillStyle='#7a6045';
  ctx.font='500 12px Figtree, sans-serif';
  ctx.fillText('KINDLY RESPOND BY NOVEMBER 15, 2025', w/2, 342);

  // RSVP button visual
  const btnX = w/2-80, btnY=358, btnW=160, btnH=38;
  const btnGrad = ctx.createLinearGradient(btnX,btnY,btnX+btnW,btnY+btnH);
  btnGrad.addColorStop(0,'#c9a96e');
  btnGrad.addColorStop(1,'#a07840');
  ctx.fillStyle=btnGrad;
  ctx.beginPath(); ctx.roundRect(btnX,btnY,btnW,btnH,10); ctx.fill();
  ctx.fillStyle='white';
  ctx.font='700 14px Figtree, sans-serif';
  ctx.fillText('RSVP NOW →', w/2, btnY+24);

  // Link
  ctx.fillStyle='#b8977a';
  ctx.font='400 11.5px Figtree, sans-serif';
  ctx.fillText('campingchairph.github.io/AnoTara/rsvp', w/2, 418);
  ctx.font='400 11px Figtree, sans-serif';
  ctx.fillText('Scan QR code below to RSVP', w/2, 460);

  // Generate real QR below canvas
  const qrTarget = document.getElementById('rsvp-qr-target');
  if (qrTarget && window.QRCode) {
    qrTarget.innerHTML = '';
    const rsvpUrl = 'https://campingchairph.github.io/AnoTara/rsvp.html?wedding='+encodeURIComponent(WED.couple.p1+' & '+WED.couple.p2)+'&date='+encodeURIComponent(WED.date)+'&venue='+encodeURIComponent(WED.venue);
    new QRCode(qrTarget, { text:rsvpUrl, width:120, height:120, colorDark:'#2c1f0e', colorLight:'#fef6e8' });
  }

  // Hashtag
  ctx.fillStyle='#c9a96e';
  ctx.font='italic 400 13px Lora, serif';
  ctx.fillText(`#${WED.couple.p1}And${WED.couple.p2}2025`, w/2, 538);

  modal.classList.add('open');
}

/* ── CHECKLIST ───────────────────────────────── */
function renderChecklist() {
  const el = document.getElementById('wed-checklist-content');
  if (!el) return;
  el.innerHTML = WED.checklist.map((phase,pi)=>{
    const done = phase.items.filter(i=>i.done).length;
    const total = phase.items.length;
    const pct = Math.round((done/total)*100);
    return `
    <div style="margin-bottom:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:13px;font-weight:700;color:var(--ink-2)">${phase.phase}</div>
        <div style="font-size:11px;color:var(--ink-4);font-weight:700">${done}/${total}</div>
      </div>
      <div style="height:3px;border-radius:2px;background:rgba(44,31,14,0.07);overflow:hidden;margin-bottom:8px">
        <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--pink-accent),var(--tan));border-radius:2px"></div>
      </div>
      ${phase.items.map(item=>`
        <div class="glass" onclick="toggleChecklist('${item.id}')" style="display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:var(--r-md);margin-bottom:6px;cursor:pointer;transition:transform 0.15s">
          <div style="width:22px;height:22px;border-radius:7px;border:2px solid ${item.done?'var(--green-accent)':'var(--ink-4)'};background:${item.done?'var(--green-accent)':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s">
            ${item.done?'<span style="color:white;font-size:12px;font-weight:700">✓</span>':''}
          </div>
          <span style="font-size:13px;font-weight:500;color:${item.done?'var(--ink-4)':'var(--ink)'};text-decoration:${item.done?'line-through':'none'}">${item.text}</span>
        </div>`).join('')}
    </div>`;
  }).join('');
}

function toggleChecklist(id) {
  for (const phase of WED.checklist) {
    const item = phase.items.find(i=>i.id===id);
    if (item) { item.done = !item.done; renderChecklist(); renderOverview(); showToast(item.done?'✅ Task done!':'↩ Task unchecked'); return; }
  }
}

/* ── SCHEDULE ────────────────────────────────── */
const SCHED_COLORS = { pink:'var(--glass-pink)', sand:'var(--glass-cream)', green:'var(--glass-green)', cream:'var(--glass-white)' };
const SCHED_BORDER = { pink:'var(--glass-b-pink)', sand:'var(--glass-b-tan)', green:'var(--glass-b-grn)', cream:'rgba(255,255,255,0.5)' };

function renderSchedule() {
  const el = document.getElementById('wed-schedule-content');
  if (!el) return;
  if (!WED.schedule.length) {
    el.innerHTML = '<div style="text-align:center;padding:40px 20px">'
      + '<div style="font-size:40px;margin-bottom:12px">📅</div>'
      + '<div style="font-size:16px;font-weight:700;color:var(--ink);margin-bottom:8px">No Schedule Yet</div>'
      + '<div style="font-size:13px;color:var(--ink-4);margin-bottom:20px">Add your wedding day timeline<br>event by event.</div>'
      + '<button onclick="window.openWedModal(&quot;wed-add-sched-modal&quot;)" style="padding:12px 24px;border-radius:var(--r-md);background:rgba(252,232,238,0.8);border:1px solid rgba(224,120,152,0.25);font-size:13px;font-weight:700;color:var(--pink-deep);cursor:pointer">+ Add First Event</button>'
      + '</div>';
    return;
  }
  el.innerHTML = `
    <button onclick="openWedModal('wed-add-sched-modal')" style="width:100%;padding:10px;border-radius:var(--r-md);background:rgba(245,230,200,0.65);border:1px solid rgba(201,169,110,0.28);font-size:13px;font-weight:700;color:var(--tan-dark);cursor:pointer;margin-bottom:14px">+ Add Schedule Item</button>
    ${WED.schedule.map((s,i)=>`
      <div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start">
        <div style="min-width:60px;text-align:right;padding-top:12px">
          <div style="font-size:11px;font-weight:700;color:var(--ink-3)">${s.time}</div>
        </div>
        <div style="width:2px;background:linear-gradient(to bottom,rgba(201,169,110,0.3),rgba(201,169,110,0.1));border-radius:1px;min-height:50px;flex-shrink:0;margin-top:14px"></div>
        <div onclick="toggleSchedule(${i})" style="flex:1;padding:12px 14px;border-radius:var(--r-md);background:${SCHED_COLORS[s.color]};border:1px solid ${SCHED_BORDER[s.color]};cursor:pointer;opacity:${s.done?0.6:1};transition:opacity 0.2s">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
            <div style="flex:1">
              <div style="font-size:13.5px;font-weight:700;color:var(--ink);text-decoration:${s.done?'line-through':'none'}">${s.event}</div>
              <div style="font-size:11px;color:var(--ink-4);margin-top:2px">👤 ${s.assignee}</div>
            </div>
            <div style="width:22px;height:22px;border-radius:7px;border:2px solid ${s.done?'var(--green-accent)':'var(--ink-4)'};background:${s.done?'var(--green-accent)':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${s.done?'<span style="color:white;font-size:11px;font-weight:700">✓</span>':''}
            </div>
          </div>
        </div>
      </div>`).join('')}`;
}

function toggleSchedule(i) {
  WED.schedule[i].done = !WED.schedule[i].done;
  renderSchedule();
  showToast(WED.schedule[i].done ? '✅ Done!' : '↩ Unchecked');
}

/* ══════════════════════════════════════════════
   SEATING CANVAS
══════════════════════════════════════════════ */
let cvs, cx;

function initCanvas() {
  cvs = document.getElementById('seating-canvas');
  if (!cvs || cvs._init) return;
  cvs._init = true;
  cx = cvs.getContext('2d');
  resizeCanvas();
  drawCanvas();
  bindCanvasEvents();
  if (typeof bindCanvasRotate === 'function') bindCanvasRotate();
  if (typeof bindCanvasResize === 'function') bindCanvasResize();
  renderFurniturePalette();
  renderSeatAssignments();
}

function resizeCanvas() {
  const wrap = document.getElementById('canvas-wrap');
  if (!wrap || !cvs) return;
  cvs.width  = wrap.clientWidth || 380;
  cvs.height = cvs._userHeight || 400;
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
    const y = e.touches ? e.touches[0].clientY : e.clientY;
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
  cx.clearRect(0,0,cvs.width,cvs.height);

  // Background
  const bg = cx.createLinearGradient(0,0,cvs.width,cvs.height);
  bg.addColorStop(0,'#fef6e8'); bg.addColorStop(1,'#f5e6c8');
  cx.fillStyle=bg; cx.fillRect(0,0,cvs.width,cvs.height);

  // Grid dots
  cx.fillStyle='rgba(201,169,110,0.25)';
  for(let x=16;x<cvs.width;x+=20) for(let y=16;y<cvs.height;y+=20) {
    cx.beginPath(); cx.arc(x,y,1.5,0,Math.PI*2); cx.fill();
  }

  // Draw each furniture item
  WED.furniture.forEach(f => drawFurniture(f));
}

function drawFurniture(f) {
  const selected = WED.selectedFurniture === f.id;
  cx.save();

  if (f.type==='round') {
    // Circle table
    const rx = f.x+f.w/2, ry = f.y+f.h/2, r = f.w/2;
    cx.beginPath(); cx.arc(rx,ry,r,0,Math.PI*2);
    cx.fillStyle = selected ? 'rgba(224,120,152,0.25)' : 'rgba(255,253,248,0.85)';
    cx.fill();
    cx.strokeStyle = selected ? '#e07898' : 'rgba(201,169,110,0.6)';
    cx.lineWidth = selected ? 2 : 1.5;
    cx.stroke();

    // Chair dots
    const chairs = 8;
    const cr = r+10;
    for(let i=0;i<chairs;i++) {
      const a = (i/chairs)*Math.PI*2 - Math.PI/2;
      cx.beginPath(); cx.arc(rx+Math.cos(a)*cr, ry+Math.sin(a)*cr, 5,0,Math.PI*2);
      cx.fillStyle = 'rgba(201,169,110,0.5)'; cx.fill();
      cx.strokeStyle='rgba(160,120,64,0.4)'; cx.lineWidth=1; cx.stroke();
    }
  } else if (f.type==='long') {
    // Long rectangular table
    cx.beginPath(); cx.roundRect(f.x,f.y,f.w,f.h,8);
    cx.fillStyle = selected ? 'rgba(90,171,122,0.2)' : 'rgba(255,253,248,0.85)';
    cx.fill();
    cx.strokeStyle = selected ? '#5aab7a' : 'rgba(201,169,110,0.6)';
    cx.lineWidth = selected ? 2 : 1.5; cx.stroke();

    // Chairs top & bottom
    const cols = Math.floor(f.w/22);
    for(let i=0;i<cols;i++) {
      const x = f.x+14+i*22;
      // top
      cx.beginPath(); cx.arc(x,f.y-8,5,0,Math.PI*2);
      cx.fillStyle='rgba(201,169,110,0.5)'; cx.fill();
      cx.strokeStyle='rgba(160,120,64,0.4)'; cx.lineWidth=1; cx.stroke();
      // bottom
      cx.beginPath(); cx.arc(x,f.y+f.h+8,5,0,Math.PI*2);
      cx.fill(); cx.stroke();
    }
  } else if (f.type==='stage') {
    cx.beginPath(); cx.roundRect(f.x,f.y,f.w,f.h,10);
    cx.fillStyle = selected ? 'rgba(224,120,152,0.3)' : 'rgba(252,232,238,0.85)';
    cx.fill();
    cx.strokeStyle = selected ? '#e07898' : 'rgba(224,120,152,0.5)';
    cx.lineWidth=selected?2:1.5; cx.stroke();
  } else if (f.type==='entrance') {
    cx.beginPath(); cx.roundRect(f.x,f.y,f.w,f.h,8);
    cx.fillStyle=selected?'rgba(90,171,122,0.25)':'rgba(232,245,237,0.85)';
    cx.fill();
    cx.strokeStyle=selected?'#5aab7a':'rgba(90,171,122,0.5)';
    cx.lineWidth=selected?2:1.5; cx.stroke();
  } else {
    cx.beginPath(); cx.roundRect(f.x,f.y,f.w,f.h,8);
    cx.fillStyle=selected?'rgba(245,230,200,0.6)':'rgba(255,253,248,0.85)';
    cx.fill();
    cx.strokeStyle=selected?'var(--tan)':'rgba(201,169,110,0.5)';
    cx.lineWidth=selected?2:1.5; cx.stroke();
  }

  // Label
  cx.fillStyle='rgba(44,31,14,0.75)';
  cx.font=`600 ${f.type==='stage'?13:11}px Figtree,sans-serif`;
  cx.textAlign='center';
  const ly = f.type==='round' ? f.y+f.h/2+4 : f.y+f.h/2+4;
  cx.fillText(f.label, f.x+f.w/2, ly);

  cx.restore();
}

function bindCanvasEvents() {
  const getTouchPos = (e,t) => {
    const r = cvs.getBoundingClientRect();
    const src = t ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };
  const onDown = (e) => {
    if (e.type !== 'touchstart') e.preventDefault();
    const {x,y} = getTouchPos(e, e.type==='touchstart');
    const hit = [...WED.furniture].reverse().find(f => {
      if (f.type==='round') {
        const dx=x-(f.x+f.w/2), dy=y-(f.y+f.h/2);
        return Math.sqrt(dx*dx+dy*dy) <= f.w/2+12;
      }
      return x>=f.x-8&&x<=f.x+f.w+8&&y>=f.y-8&&y<=f.y+f.h+8;
    });
    if (hit) {
      if (hit.type === 'chair') {
        const now = Date.now();
        const key = '_lastTap_' + hit.id;
        const isDouble = (now - (WED[key] || 0)) < 400;
        WED[key] = isDouble ? 0 : now;
        WED.selectedFurniture = hit.id;
        drawCanvas();
        if (isDouble) { openChairGuestPicker(hit.id); return; }
      }
      WED.dragging = hit;
      WED.dragOffX = x - hit.x;
      WED.dragOffY = y - hit.y;
      WED.selectedFurniture = hit.id;
      renderSeatAssignments();
      drawCanvas();
    } else {
      WED.selectedFurniture = null;
      drawCanvas();
    }
  };
  const onMove = (e) => {
    if (!WED.dragging) return;
    if (e.cancelable) e.preventDefault();
    const {x,y} = getTouchPos(e, e.type==='touchmove');
    WED.dragging.x = Math.max(0, Math.min(cvs.width-WED.dragging.w,  x-WED.dragOffX));
    WED.dragging.y = Math.max(0, Math.min(cvs.height-WED.dragging.h, y-WED.dragOffY));
    drawCanvas();
  };
  const onUp = () => { WED.dragging = null; };

  cvs.addEventListener('mousedown',  onDown);
  cvs.addEventListener('mousemove',  onMove);
  cvs.addEventListener('mouseup',    onUp);
  cvs.addEventListener('touchstart', onDown, {passive:true});
  cvs.addEventListener('touchmove',  onMove, {passive:false});
  cvs.addEventListener('touchend',   onUp);
}

function renderFurniturePalette() {
  const el = document.getElementById('furniture-palette');
  if (!el) return;
  const items = [
    { type:'round',    emoji:'⭕', label:'Round Table' },
    { type:'long',     emoji:'▬',  label:'Long Table' },
    { type:'stage',    emoji:'🎭', label:'Stage' },
    { type:'entrance', emoji:'🚪', label:'Entrance' },
    { type:'chair',    emoji:'🪑', label:'Chair' },
  ];
  el.innerHTML = items.map(i=>`
    <button onclick="addFurniture('${i.type}','${i.label}')" style="
      display:flex;flex-direction:column;align-items:center;gap:4px;
      padding:10px 8px;border-radius:var(--r-md);
      border:1px solid rgba(201,169,110,0.25);background:rgba(245,230,200,0.55);
      cursor:pointer;transition:transform 0.15s;min-width:68px;
    " onmousedown="this.style.transform='scale(0.93)'" onmouseup="this.style.transform=''">
      <span style="font-size:22px">${i.emoji}</span>
      <span style="font-size:10px;font-weight:700;color:var(--ink-2)">${i.label}</span>
    </button>`).join('');
}

function addFurniture(type, label) {
  const defaults = {
    round:    { w:70,  h:70  },
    long:     { w:120, h:50  },
    stage:    { w:140, h:60  },
    entrance: { w:80,  h:36  },
    photo:    { w:70,  h:60  },
    bar:      { w:100, h:40  },
  };
  const d = defaults[type] || { w:70, h:70 };
  const num = WED.furniture.filter(f=>f.type===type).length+1;
  WED.furniture.push({
    id: 'f'+WED.nextFurnitureId++,
    type, x:30, y:30,
    w:d.w, h:d.h,
    label: type==='round'||type==='long' ? `${label} ${num}` : label,
    emoji: '',
  });
  drawCanvas();
  showToast('✅ '+label+' added! Drag to position.');
}

function renderSeatAssignments() {
  const el = document.getElementById('seat-assignments');
  if (!el) return;
  const assignedChairs   = WED.furniture.filter(f => f.type==='chair' && WED.guests.some(g => g._chairId===f.id));
  const unassignedChairs = WED.furniture.filter(f => f.type==='chair' && !WED.guests.some(g => g._chairId===f.id));
  const unseatedGuests   = WED.guests.filter(g => !g._chairId);

  let html = '<div style="font-size:11px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px;margin-top:4px">🪑 Chair Assignments</div>';

  if (assignedChairs.length) {
    html += '<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:var(--green-deep);margin-bottom:6px">✅ Seated ('+assignedChairs.length+')</div>';
    assignedChairs.forEach(f => {
      const g = WED.guests.find(gg => gg._chairId===f.id);
      html += '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--r-md);margin-bottom:5px;background:rgba(90,171,122,0.1);border:1px solid rgba(90,171,122,0.2)">'
        + '<div style="width:28px;height:28px;border-radius:8px;background:rgba(90,171,122,0.2);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">🪑</div>'
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
      html += '<div onclick="openChairGuestPicker(\''+f.id+'\')" style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--r-md);margin-bottom:5px;background:rgba(245,230,200,0.45);border:1px dashed rgba(201,169,110,0.3);cursor:pointer">'
        + '<div style="width:28px;height:28px;border-radius:8px;background:rgba(245,230,200,0.6);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">🪑</div>'
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

/* ── WEDDING MODALS ──────────────────────────── */
function openWedModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function addWedGuest() {
  const name = document.getElementById('new-guest-name').value.trim();
  const table = parseInt(document.getElementById('new-guest-table').value)||1;
  const seat  = parseInt(document.getElementById('new-guest-seat').value)||1;
  if (!name) { showToast('⚠️ Enter a guest name'); return; }
  WED.guests.push({ id:WED.nextGuestId++, name, table, seat, rsvp:'pending', meal:'', dietary:'' });
  document.getElementById('wed-add-guest-modal').classList.remove('open');
  document.getElementById('new-guest-name').value='';
  renderGuests();
  renderSeatAssignments();
  showToast('✅ '+name+' added!');
}

function addWedExpense() {
  const label    = document.getElementById('wed-exp-label').value.trim();
  const amount   = parseFloat(document.getElementById('wed-exp-amount').value)||0;
  const category = document.getElementById('wed-exp-category').value;
  if (!label||!amount) { showToast('⚠️ Fill in all fields'); return; }
  WED.expenses.push({ id:Date.now(), category, label, amount, paid:false });
  document.getElementById('wed-add-expense-modal').classList.remove('open');
  document.getElementById('wed-exp-label').value='';
  document.getElementById('wed-exp-amount').value='';
  renderBudget();
  showToast('💸 Expense added!');
}

function addWedSched() {
  const time     = document.getElementById('sched-time').value;
  const event    = document.getElementById('sched-event').value.trim();
  const assignee = document.getElementById('sched-assignee').value.trim();
  if (!time||!event) { showToast('⚠️ Fill in time and event'); return; }
  WED.schedule.push({ time, event, assignee:assignee||'Unassigned', done:false, color:'cream' });
  WED.schedule.sort((a,b)=>a.time.localeCompare(b.time));
  document.getElementById('wed-add-sched-modal').classList.remove('open');
  document.getElementById('sched-time').value='';
  document.getElementById('sched-event').value='';
  document.getElementById('sched-assignee').value='';
  renderSchedule();
  showToast('📅 Schedule item added!');
}

/* ── EXPOSE ──────────────────────────────────── */
window.loadCustomCard = function(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    WED.customCardImage = e.target.result;
    const clearBtn = document.getElementById('clear-card-btn');
    if (clearBtn) clearBtn.style.display = 'inline-block';
    showToast('🖼 Custom card uploaded!');
    window.showRSVPCard();
  };
  reader.readAsDataURL(file);
};
window.clearCustomCard = function() {
  WED.customCardImage = null;
  const clearBtn = document.getElementById('clear-card-btn');
  if (clearBtn) clearBtn.style.display = 'none';
  const input = document.getElementById('custom-card-upload');
  if (input) input.value = '';
  showToast('🗑 Custom card removed');
  window.showRSVPCard();
};
window.syncRSVPResponses=syncRSVPResponses;
window.WED=WED; window.wedTab=wedTab; window.renderOverview=renderOverview;
window.renderGuests=renderGuests; window.renderBudget=renderBudget;
window.renderChecklist=renderChecklist; window.renderSchedule=renderSchedule;
window.initCanvas=initCanvas; window.addFurniture=addFurniture;
window.toggleChecklist=toggleChecklist; window.toggleSchedule=toggleSchedule;
window.updateGuestRSVP=updateGuestRSVP; window.showRSVPCard=showRSVPCard;
window.openWedModal=openWedModal; window.addWedGuest=addWedGuest;
window.addWedExpense=addWedExpense; window.addWedSched=addWedSched;

/* ═══════════════════════════════════════════════
   WEDDING v2 — new features appended
   ═══════════════════════════════════════════════ */

/* ── CANVAS: REMOVE DEFAULT CHAIRS ──────────────
   Override WED.furniture to start empty (no chairs)
   and replace drawFurniture to skip auto-chairs.
   Tables start blank; owner adds chairs manually.
   ─────────────────────────────────────────────── */
// WED.furniture starts empty — user adds from palette

// Replace drawFurniture — no auto-chairs, supports rotation
function drawFurniture(f) {
  const selected = WED.selectedFurniture === f.id;
  cx.save();

  const isH = f.rot; // rotated = horizontal long table / vertical orientation swap
  // For round tables rotation doesn't change appearance — skip swap
  const w = (f.type === 'long' && isH) ? f.h : f.w;
  const h = (f.type === 'long' && isH) ? f.w : f.h;
  const x = f.x, y = f.y;

  if (f.type === 'round') {
    const rx = x+f.w/2, ry = y+f.h/2, r = f.w/2;
    cx.beginPath(); cx.arc(rx,ry,r,0,Math.PI*2);
    cx.fillStyle = selected ? 'rgba(224,120,152,0.22)' : 'rgba(255,253,248,0.88)';
    cx.fill();
    cx.strokeStyle = selected ? '#e07898' : 'rgba(201,169,110,0.65)';
    cx.lineWidth = selected ? 2.5 : 1.5; cx.stroke();
    // Draw assigned guest count indicator
    const assignedCount = WED.guests.filter(g => g.table === parseInt(f.label.replace(/\D/g,''))).length;
    if (assignedCount > 0) {
      cx.fillStyle = 'rgba(90,171,122,0.18)';
      cx.beginPath(); cx.arc(rx,ry,r*0.55,0,Math.PI*2); cx.fill();
      cx.fillStyle='rgba(44,31,14,0.6)';
      cx.font='700 11px Figtree,sans-serif'; cx.textAlign='center';
      cx.fillText(assignedCount+'👤', rx, ry+4);
    }
  } else if (f.type === 'long') {
    cx.beginPath(); cx.roundRect(x, y, w, h, 8);
    cx.fillStyle = selected ? 'rgba(90,171,122,0.18)' : 'rgba(255,253,248,0.88)';
    cx.fill();
    cx.strokeStyle = selected ? '#5aab7a' : 'rgba(201,169,110,0.65)';
    cx.lineWidth = selected ? 2.5 : 1.5; cx.stroke();
  } else if (f.type === 'chair') {
    const assignedGuest = WED.guests.find(g => g._chairId === f.id);
    const isAssigned = !!assignedGuest;
    cx.beginPath(); cx.roundRect(x, y, w, h, 5);
    cx.fillStyle = isAssigned ? 'rgba(90,171,122,0.35)' : (selected ? 'rgba(201,169,110,0.28)' : 'rgba(245,230,200,0.75)');
    cx.fill();
    cx.strokeStyle = isAssigned ? '#3a7a54' : (selected ? 'rgba(201,169,110,0.9)' : 'rgba(201,169,110,0.5)');
    cx.lineWidth = isAssigned || selected ? 2 : 1; cx.stroke();
    if (isAssigned) {
      const firstName = assignedGuest.name.split(' ')[0];
      cx.fillStyle = 'rgba(44,31,14,0.82)';
      cx.font = '600 7px Figtree,sans-serif';
      cx.textAlign = 'center';
      cx.fillText(firstName, x+w/2, y+h/2+3);
      cx.restore(); return;
    }
  } else if (f.type === 'stage') {
    cx.beginPath(); cx.roundRect(x, y, w, h, 10);
    cx.fillStyle = selected ? 'rgba(224,120,152,0.28)' : 'rgba(252,232,238,0.88)';
    cx.fill();
    cx.strokeStyle = selected ? '#e07898' : 'rgba(224,120,152,0.5)';
    cx.lineWidth = selected ? 2.5 : 1.5; cx.stroke();
  } else if (f.type === 'entrance') {
    cx.beginPath(); cx.roundRect(x, y, w, h, 8);
    cx.fillStyle = selected ? 'rgba(90,171,122,0.22)' : 'rgba(232,245,237,0.88)';
    cx.fill();
    cx.strokeStyle = selected ? '#5aab7a' : 'rgba(90,171,122,0.5)';
    cx.lineWidth = selected ? 2.5 : 1.5; cx.stroke();
  } else {
    cx.beginPath(); cx.roundRect(x, y, w, h, 8);
    cx.fillStyle = selected ? 'rgba(245,230,200,0.7)' : 'rgba(255,253,248,0.88)';
    cx.fill();
    cx.strokeStyle = selected ? 'rgba(201,169,110,0.8)' : 'rgba(201,169,110,0.5)';
    cx.lineWidth = selected ? 2 : 1.5; cx.stroke();
  }

  // Rotate indicator on selected long table
  if (selected && f.type === 'long') {
    cx.fillStyle = 'rgba(90,171,122,0.9)';
    cx.font = '10px serif'; cx.textAlign = 'center';
    cx.fillText('⟳', x+w/2, y-5);
  }

  // Label
  cx.fillStyle = 'rgba(44,31,14,0.72)';
  cx.font = `600 ${f.type==='stage'?12:10}px Figtree,sans-serif`;
  cx.textAlign = 'center';
  cx.fillText(f.label, x+w/2, y+h/2+4);

  cx.restore();
}

// Double-tap / double-click on selected long table = rotate
function bindCanvasRotate() {
  let lastTap = 0;
  const handleDbl = (e) => {
    const now = Date.now();
    const sel = WED.furniture.find(f => f.id === WED.selectedFurniture);
    if (sel && sel.type === 'long' && now - lastTap < 350) {
      sel.rot = !sel.rot;
      // Swap stored w/h so drag collision still works
      const tmp = sel.w; sel.w = sel.h; sel.h = tmp;
      drawCanvas();
      showToast('🔄 Table rotated');
    }
    lastTap = now;
  };
  if (cvs) {
    cvs.addEventListener('mousedown', handleDbl);
    cvs.addEventListener('touchstart', handleDbl, {passive:true});
  }
}

// Patch addFurniture to not add default chairs
function addFurniture(type, label) {
  const defaults = {
    round:    { w:68,  h:68  },
    long:     { w:115, h:46  },
    stage:    { w:140, h:56  },
    entrance: { w:76,  h:34  },
    chair:    { w:22,  h:22  },
    photo:    { w:68,  h:58  },
    bar:      { w:100, h:38  },
  };
  const d = defaults[type] || { w:68, h:68 };
  const num = WED.furniture.filter(f=>f.type===type).length+1;
  WED.furniture.push({
    id: 'f'+WED.nextFurnitureId++,
    type, x:20, y:20,
    w:d.w, h:d.h,
    label: ['round','long'].includes(type) ? `${label} ${num}` : (type==='chair'?`Chair ${num}`:label),
    rot: false,
  });
  drawCanvas();
  showToast(type === 'chair' ? '🪑 Chair added! Drag to position.' : '✅ '+label+' added! Drag to position.');
}

// bindCanvasRotate + bindCanvasResize are called inside initCanvas above

/* ── CHAIR GUEST PICKER ──────────────────────── */
function openChairGuestPicker(chairId) {
  const old = document.getElementById('chair-guest-picker');
  if (old) old.remove();
  const chair = WED.furniture.find(f => f.id === chairId);
  const currentGuest = WED.guests.find(g => g._chairId === chairId);
  const seated = new Set(WED.guests.filter(g => g._chairId && g._chairId !== chairId).map(g => g.id));
  const overlay = document.createElement('div');
  overlay.id = 'chair-guest-picker';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(44,31,14,0.28);display:flex;align-items:flex-end;justify-content:center;';
  let rows = '';
  if (!WED.guests.length) {
    rows = '<div style="text-align:center;padding:20px;font-size:13px;color:var(--ink-4)">No guests yet — add guests in the Guests tab first.</div>';
  } else {
    WED.guests.forEach(g => {
      const isSeated = seated.has(g.id);
      const isCurrent = currentGuest && g.id === currentGuest.id;
      rows += '<div onclick="assignChairGuest(\''+chairId+'\','+g.id+')" style="'
        + 'display:flex;align-items:center;gap:10px;padding:11px 14px;'
        + 'border-radius:var(--r-md);margin-bottom:6px;cursor:pointer;'
        + 'background:'+(isCurrent?'rgba(90,171,122,0.22)':isSeated?'rgba(44,31,14,0.05)':'rgba(255,253,248,0.85)')+';'
        + 'border:1.5px solid '+(isCurrent?'rgba(58,122,84,0.4)':'rgba(255,255,255,0.5)')+';'
        + 'opacity:'+(isSeated&&!isCurrent?0.45:1)+';'
        + 'pointer-events:'+(isSeated&&!isCurrent?'none':'auto')+';'
        + '">'
        + '<div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:'+(g.rsvp==='attending'?'var(--green-accent)':g.rsvp==='declined'?'var(--pink-accent)':'var(--tan)')+'"></div>'
        + '<span style="font-size:13px;font-weight:600;color:var(--ink);flex:1">'+g.name+'</span>'
        + (isCurrent?'<span style="font-size:11px;color:var(--green-deep);font-weight:700">✓ Seated</span>':'')
        + (isSeated&&!isCurrent?'<span style="font-size:10px;color:var(--ink-4)">Elsewhere</span>':'')
        + '</div>';
    });
  }
  const removeBtn = currentGuest
    ? '<button onclick="assignChairGuest(\''+chairId+'\',null)" style="width:100%;padding:9px;border-radius:var(--r-md);background:rgba(224,120,152,0.12);border:1px solid rgba(224,120,152,0.25);font-size:12.5px;font-weight:700;color:var(--pink-deep);cursor:pointer;margin-bottom:10px">🗑 Remove '+currentGuest.name.split(' ')[0]+'</button>'
    : '';
  overlay.innerHTML = '<div style="width:100%;max-width:440px;background:var(--cream);border-radius:var(--r-xl) var(--r-xl) 0 0;padding:20px 16px 32px;max-height:70vh;overflow-y:auto;box-shadow:0 -8px 40px rgba(44,31,14,0.18);">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
    + '<div style="font-size:14px;font-weight:700;color:var(--ink)">🪑 Assign Guest — '+(chair?chair.label:'Chair')+'</div>'
    + '<button onclick="closeChairPicker()" style="width:28px;height:28px;border-radius:50%;border:none;background:rgba(44,31,14,0.08);font-size:16px;cursor:pointer;color:var(--ink-3)">×</button>'
    + '</div>'
    + removeBtn
    + '<div style="font-size:11px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">All Guests</div>'
    + rows + '</div>';
  overlay.addEventListener('click', e => { if (e.target === overlay) closeChairPicker(); });
  document.body.appendChild(overlay);
}

function closeChairPicker() {
  const el = document.getElementById('chair-guest-picker');
  if (el) el.remove();
}

function assignChairGuest(chairId, guestId) {
  WED.guests.forEach(g => { if (g._chairId === chairId) delete g._chairId; });
  if (guestId !== null) {
    const g = WED.guests.find(g => g.id === guestId);
    if (g) g._chairId = chairId;
  }
  closeChairPicker();
  drawCanvas();
  renderSeatAssignments();
  showToast(guestId ? '🪑 Guest seated!' : '🗑 Seat cleared');
}

/* ── GUEST ADD / REMOVE ──────────────────────── */
let _newGuestMeal = 'chicken';
function selectGuestMeal(btn, val) {
  _newGuestMeal = val;
  document.querySelectorAll('#guest-meal-picker .split-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function submitAddGuest() {
  const name = (document.getElementById('new-guest-name')?.value || '').trim();
  if (!name) { showToast('⚠️ Enter a guest name'); return; }
  const table    = parseInt(document.getElementById('new-guest-table')?.value) || 1;
  const seat     = parseInt(document.getElementById('new-guest-seat')?.value)  || 1;
  const dietary  = (document.getElementById('new-guest-dietary')?.value || '').trim();
  WED.guests.push({ id: WED.nextGuestId++, name, table, seat, rsvp:'pending', meal:_newGuestMeal, dietary });
  closeModalById('wed-add-guest-modal');
  document.getElementById('new-guest-name').value = '';
  document.getElementById('new-guest-table').value = '';
  document.getElementById('new-guest-seat').value = '';
  document.getElementById('new-guest-dietary').value = '';
  _newGuestMeal = 'chicken';
  renderGuests();
  renderSeatAssignments();
  drawCanvas();
  showToast('🎉 '+name+' added!');
}

function removeGuest(id) {
  const g = WED.guests.find(g => g.id === id);
  if (!g) return;
  if (!confirm('Remove '+g.name+'?')) return;
  WED.guests = WED.guests.filter(gg => gg.id !== id);
  renderGuests();
  renderSeatAssignments();
  drawCanvas();
  showToast('🗑 '+g.name+' removed');
}

function copyGuestLink(guestId) {
  const g = WED.guests.find(g => g.id === guestId);
  if (!g) return;
  const chair = WED.furniture.find(f => g._chairId === f.id);
  const params = new URLSearchParams({ name:g.name, table:g.table, seat:g.seat, chair:chair?chair.label:'', wedding:WED.couple.p1+' & '+WED.couple.p2, date:WED.date, venue:WED.venue });
  const link = 'https://campingchairph.github.io/AnoTara/rsvp.html?' + params.toString();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => showToast('📋 Link copied for '+g.name.split(' ')[0]+'!'));
  } else { showToast('📋 ' + link); }
}

window.openChairGuestPicker = openChairGuestPicker;
window.closeChairPicker     = closeChairPicker;
window.assignChairGuest     = assignChairGuest;
window.selectGuestMeal      = selectGuestMeal;
window.submitAddGuest       = submitAddGuest;
window.removeGuest          = removeGuest;
window.copyGuestLink        = copyGuestLink;

/* ── CHECKLIST: CUSTOM TIMELINE ──────────────── */
// Extended state for custom checklist phases
if (!WED._customPhases) WED._customPhases = [];

function renderChecklist() {
  const el = document.getElementById('wed-checklist-content');
  if (!el) return;

  const totalDone  = WED.checklist.reduce((a,p)=>a+p.items.filter(i=>i.done).length,0);
  const totalItems = WED.checklist.reduce((a,p)=>a+p.items.length,0);
  const pct = totalItems ? Math.round((totalDone/totalItems)*100) : 0;

  el.innerHTML = `
    <!-- Header toolbar -->
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <button onclick="openWedModal('wed-timeline-modal')" style="flex:1;padding:9px;border-radius:var(--r-md);background:rgba(252,232,238,0.65);border:1px solid rgba(224,120,152,0.25);font-size:12px;font-weight:700;color:var(--pink-deep);cursor:pointer">📅 Set Timeline</button>
      <button onclick="openAddChecklistItem()" style="flex:1;padding:9px;border-radius:var(--r-md);background:rgba(245,230,200,0.65);border:1px solid rgba(201,169,110,0.25);font-size:12px;font-weight:700;color:var(--tan-dark);cursor:pointer">+ Add Task</button>
    </div>
    <!-- Overall progress -->
    <div style="padding:12px 14px;border-radius:var(--r-md);background:rgba(245,230,200,0.45);border:1px solid rgba(201,169,110,0.18);margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:12px;font-weight:700;color:var(--ink-3)">Overall Progress</span>
        <span style="font-size:12px;font-weight:700;color:var(--tan-dark)">${totalDone}/${totalItems} · ${pct}%</span>
      </div>
      <div style="height:6px;border-radius:3px;background:rgba(44,31,14,0.07);overflow:hidden">
        <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--pink-accent),var(--tan));border-radius:3px"></div>
      </div>
    </div>
    ${WED.checklist.map((phase,pi) => {
      const done  = phase.items.filter(i=>i.done).length;
      const total = phase.items.length;
      const pp    = total ? Math.round((done/total)*100) : 0;
      return `
      <div style="margin-bottom:18px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div style="font-size:13px;font-weight:700;color:var(--ink-2)">${phase.phase}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;color:var(--ink-4);font-weight:700">${done}/${total}</span>
            <button onclick="openAddChecklistItemToPhase(${pi})" style="padding:3px 9px;border-radius:7px;background:rgba(245,230,200,0.6);border:1px solid rgba(201,169,110,0.22);font-size:10.5px;font-weight:700;color:var(--tan-dark);cursor:pointer">+ Add</button>
          </div>
        </div>
        <div style="height:3px;border-radius:2px;background:rgba(44,31,14,0.07);overflow:hidden;margin-bottom:8px">
          <div style="width:${pp}%;height:100%;background:linear-gradient(90deg,var(--pink-accent),var(--tan));border-radius:2px"></div>
        </div>
        ${phase.items.map(item=>`
          <div class="glass" style="display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:var(--r-md);margin-bottom:6px">
            <div onclick="toggleChecklist('${item.id}')" style="width:22px;height:22px;border-radius:7px;border:2px solid ${item.done?'var(--green-accent)':'var(--ink-4)'};background:${item.done?'var(--green-accent)':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;transition:all 0.2s">
              ${item.done?'<span style="color:white;font-size:12px;font-weight:700">✓</span>':''}
            </div>
            <span onclick="toggleChecklist('${item.id}')" style="font-size:13px;font-weight:500;color:${item.done?'var(--ink-4)':'var(--ink)'};text-decoration:${item.done?'line-through':'none'};flex:1;cursor:pointer">${item.text}</span>
            <button onclick="deleteChecklistItem('${item.id}')" style="width:24px;height:24px;border-radius:7px;border:none;background:rgba(224,120,152,0.1);color:var(--pink-deep);font-size:13px;cursor:pointer;flex-shrink:0">×</button>
          </div>`).join('')}
      </div>`;
    }).join('')}`;
}

let _addToPhaseIndex = null;
function openAddChecklistItem() { _addToPhaseIndex = null; openWedModal('wed-add-checklist-modal'); }
function openAddChecklistItemToPhase(pi) { _addToPhaseIndex = pi; openWedModal('wed-add-checklist-modal'); }

function submitChecklistItem() {
  const text = document.getElementById('checklist-item-text')?.value.trim();
  if (!text) { showToast('⚠️ Enter a task'); return; }
  const id = 'c'+Date.now();
  if (_addToPhaseIndex !== null && WED.checklist[_addToPhaseIndex]) {
    WED.checklist[_addToPhaseIndex].items.push({ id, text, done:false });
  } else {
    // Add to last phase
    WED.checklist[WED.checklist.length-1].items.push({ id, text, done:false });
  }
  document.getElementById('checklist-item-text').value = '';
  closeModalById('wed-add-checklist-modal');
  renderChecklist();
  renderOverview();
  showToast('✅ Task added!');
}

function deleteChecklistItem(id) {
  for (const phase of WED.checklist) {
    const idx = phase.items.findIndex(i=>i.id===id);
    if (idx > -1) { phase.items.splice(idx,1); break; }
  }
  renderChecklist();
  renderOverview();
}

function submitTimeline() {
  const preset = document.getElementById('timeline-preset')?.value;
  const custom = document.getElementById('timeline-custom-months')?.value;
  closeModalById('wed-timeline-modal');
  showToast('📅 Timeline set to ' + (custom || preset));
}

/* ── SCHEDULE: EDITABLE ENTRIES ──────────────── */
let _editSchedIndex = null;

function renderSchedule() {
  const el = document.getElementById('wed-schedule-content');
  if (!el) return;
  el.innerHTML = `
    <button onclick="openWedModal('wed-add-sched-modal')" style="width:100%;padding:10px;border-radius:var(--r-md);background:rgba(245,230,200,0.65);border:1px solid rgba(201,169,110,0.28);font-size:13px;font-weight:700;color:var(--tan-dark);cursor:pointer;margin-bottom:14px">+ Add Schedule Item</button>
    ${WED.schedule.map((s,i)=>`
      <div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start">
        <div style="min-width:58px;text-align:right;padding-top:12px">
          <div style="font-size:11px;font-weight:700;color:var(--ink-3)">${s.time}</div>
        </div>
        <div style="width:2px;background:linear-gradient(to bottom,rgba(201,169,110,0.3),rgba(201,169,110,0.1));border-radius:1px;min-height:50px;flex-shrink:0;margin-top:14px"></div>
        <div style="flex:1;padding:12px 14px;border-radius:var(--r-md);background:${SCHED_COLORS[s.color]};border:1px solid ${SCHED_BORDER[s.color]};opacity:${s.done?0.6:1}">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
            <div style="flex:1">
              <div style="font-size:13.5px;font-weight:700;color:var(--ink);text-decoration:${s.done?'line-through':'none'}">${s.event}</div>
              <div style="font-size:11px;color:var(--ink-4);margin-top:2px">👤 ${s.assignee}</div>
            </div>
            <div style="display:flex;gap:5px;flex-shrink:0">
              <button onclick="toggleSchedule(${i})" style="width:26px;height:26px;border-radius:8px;border:2px solid ${s.done?'var(--green-accent)':'var(--ink-4)'};background:${s.done?'var(--green-accent)':'transparent'};display:flex;align-items:center;justify-content:center;cursor:pointer">
                ${s.done?'<span style="color:white;font-size:11px;font-weight:700">✓</span>':''}
              </button>
              <button onclick="openEditSched(${i})" style="width:26px;height:26px;border-radius:8px;border:1px solid rgba(201,169,110,0.28);background:rgba(245,230,200,0.55);font-size:13px;cursor:pointer">✏️</button>
              <button onclick="deleteSchedItem(${i})" style="width:26px;height:26px;border-radius:8px;border:1px solid rgba(224,120,152,0.22);background:rgba(252,232,238,0.55);font-size:13px;cursor:pointer;color:var(--pink-deep)">×</button>
            </div>
          </div>
        </div>
      </div>`).join('')}`;
}

function openEditSched(i) {
  _editSchedIndex = i;
  const s = WED.schedule[i];
  const tEl = document.getElementById('edit-sched-time');
  const eEl = document.getElementById('edit-sched-event');
  const aEl = document.getElementById('edit-sched-assignee');
  if (tEl) tEl.value = s.time;
  if (eEl) eEl.value = s.event;
  if (aEl) aEl.value = s.assignee;
  openWedModal('wed-edit-sched-modal');
}

function submitEditSched() {
  if (_editSchedIndex === null) return;
  const s = WED.schedule[_editSchedIndex];
  s.time     = document.getElementById('edit-sched-time')?.value    || s.time;
  s.event    = document.getElementById('edit-sched-event')?.value.trim()    || s.event;
  s.assignee = document.getElementById('edit-sched-assignee')?.value.trim() || s.assignee;
  // Re-sort by time
  WED.schedule.sort((a,b) => a.time.localeCompare(b.time));
  _editSchedIndex = null;
  closeModalById('wed-edit-sched-modal');
  renderSchedule();
  showToast('📅 Schedule updated & sorted!');
}

function deleteSchedItem(i) {
  WED.schedule.splice(i, 1);
  renderSchedule();
  showToast('🗑 Item removed');
}

/* ── OVERVIEW: EDITABLE FIELDS ───────────────── */
function renderOverview() {
  const el = document.getElementById('wed-overview-content');
  if (!el) return;

  // Empty state — prompt user to set up their wedding
  // Update hero display
  const heroNames = document.getElementById('wed-hero-names');
  const heroDate  = document.getElementById('wed-hero-date');
  const heroVenue = document.getElementById('wed-hero-venue');
  if (heroNames) heroNames.innerHTML = (WED.couple.p1||'—')+'<span class="wedding-amp">&</span>'+(WED.couple.p2||'—');
  if (heroDate)  { heroDate.style.display = WED.date?'inline-flex':'none'; heroDate.textContent = WED.date ? '📅 '+new Date(WED.date).toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'}) : ''; }
  if (heroVenue) { heroVenue.style.display = WED.venue?'block':'none'; heroVenue.textContent = WED.venue ? '📍 '+WED.venue : ''; }

  if (!WED.couple.p1 && !WED.couple.p2) {
    el.innerHTML = '<div style="text-align:center;padding:40px 20px">'
      + '<div style="font-size:48px;margin-bottom:16px">💍</div>'
      + '<div style="font-size:20px;font-weight:700;color:var(--ink);font-family:var(--f2);font-style:italic;margin-bottom:8px">Start Planning Your Wedding</div>'
      + '<div style="font-size:13px;color:var(--ink-4);margin-bottom:24px;line-height:1.6">Add your names, date, venue, and budget<br>to begin your planning journey.</div>'
      + '<button onclick="window.openWedModal(&quot;wed-edit-overview-modal&quot;)" style="padding:14px 28px;border-radius:var(--r-md);background:linear-gradient(135deg,var(--pink-accent),var(--tan));color:white;border:none;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 6px 20px rgba(201,169,110,0.3)">✏️ Set Up Wedding Details</button>'
      + '</div>';
    return;
  }

  const totalDone  = WED.checklist.reduce((a,p)=>a+p.items.filter(i=>i.done).length,0);
  const totalItems = WED.checklist.reduce((a,p)=>a+p.items.length,0);
  const pct     = totalItems ? Math.round((totalDone/totalItems)*100) : 0;
  const totalSpent = WED.expenses.reduce((a,e)=>a+e.amount,0);
  const paid       = WED.expenses.filter(e=>e.paid).reduce((a,e)=>a+e.amount,0);
  const attending  = WED.guests.filter(g=>g.rsvp==='attending').length;

  el.innerHTML = `
    <!-- Edit overview button -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button onclick="openWedModal('wed-edit-overview-modal')" style="padding:7px 16px;border-radius:var(--r-md);background:rgba(245,230,200,0.65);border:1px solid rgba(201,169,110,0.25);font-size:12.5px;font-weight:700;color:var(--tan-dark);cursor:pointer">✏️ Edit Details</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div class="wed-stat-card glass-pink"><div class="wed-stat-emoji">💍</div><div class="wed-stat-val">${getCountdown()}</div><div class="wed-stat-lbl">Until the Big Day</div></div>
      <div class="wed-stat-card glass-green"><div class="wed-stat-emoji">👥</div><div class="wed-stat-val">${attending} / ${WED.guests.length}</div><div class="wed-stat-lbl">Guests Confirmed</div></div>
      <div class="wed-stat-card glass-cream"><div class="wed-stat-emoji">💰</div><div class="wed-stat-val">₱${totalSpent.toLocaleString()}</div><div class="wed-stat-lbl">committed · ₱${paid.toLocaleString()} paid</div></div>
      <div class="wed-stat-card glass"><div class="wed-stat-emoji">✅</div><div class="wed-stat-val">${pct}%</div><div class="wed-stat-lbl">Planning Complete</div></div>
    </div>
    <div style="margin-bottom:16px;padding:16px;border-radius:var(--r-lg)" class="glass">
      <div style="font-size:12px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px">Planning Progress</div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="flex:1;height:10px;border-radius:5px;background:rgba(44,31,14,0.08);overflow:hidden">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--pink-accent),var(--tan));border-radius:5px"></div>
        </div>
        <span style="font-size:13px;font-weight:700;color:var(--tan-dark)">${pct}%</span>
      </div>
      <div style="font-size:11.5px;color:var(--ink-4);margin-top:6px">${totalDone} of ${totalItems} tasks complete</div>
    </div>
    <div style="padding:16px;border-radius:var(--r-lg);margin-bottom:12px" class="glass">
      <div style="font-size:12px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px">Event Details</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;gap:10px;align-items:center">
          <span style="font-size:16px">💑</span>
          <div><div style="font-size:13px;font-weight:700;color:var(--ink)">${WED.couple.p1} &amp; ${WED.couple.p2}</div><div style="font-size:11px;color:var(--ink-4)">Couple</div></div>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <span style="font-size:16px">📅</span>
          <div><div style="font-size:13px;font-weight:700;color:var(--ink)">${new Date(WED.date).toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div><div style="font-size:11px;color:var(--ink-4)">Wedding Date</div></div>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <span style="font-size:16px">📍</span>
          <div><div style="font-size:13px;font-weight:700;color:var(--ink)">${WED.venue}</div><div style="font-size:11px;color:var(--ink-4)">Venue</div></div>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <span style="font-size:16px">💰</span>
          <div><div style="font-size:13px;font-weight:700;color:var(--ink)">₱${WED.budget.toLocaleString()}</div><div style="font-size:11px;color:var(--ink-4)">Total Budget</div></div>
        </div>
      </div>
    </div>
    <!-- Invitation image upload -->
    <div style="padding:16px;border-radius:var(--r-lg)" class="glass">
      <div style="font-size:12px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px">Wedding Invitation</div>
      ${WED._invitationImg ? `<img src="${WED._invitationImg}" style="width:100%;border-radius:var(--r-md);margin-bottom:10px">` : `
        <div style="padding:20px;border-radius:var(--r-md);border:1.5px dashed rgba(224,120,152,0.4);background:rgba(252,232,238,0.3);text-align:center;margin-bottom:10px">
          <div style="font-size:28px;margin-bottom:6px">💌</div>
          <div style="font-size:12.5px;color:var(--ink-3)">Upload your own invitation design</div>
        </div>`}
      <label style="display:block;width:100%;padding:10px;border-radius:var(--r-md);background:rgba(252,232,238,0.65);border:1px solid rgba(224,120,152,0.25);font-size:13px;font-weight:700;color:var(--pink-deep);cursor:pointer;text-align:center">
        📎 ${WED._invitationImg ? 'Replace Invitation' : 'Upload Invitation'}
        <input type="file" accept="image/*" style="display:none" onchange="uploadInvitation(event)">
      </label>
      <button onclick="showRSVPCard()" style="width:100%;padding:10px;border-radius:var(--r-md);background:rgba(245,230,200,0.65);border:1px solid rgba(201,169,110,0.25);font-size:13px;font-weight:700;color:var(--tan-dark);cursor:pointer;margin-top:8px">💌 Generate Digital Invitation</button>
    </div>`;
}

function uploadInvitation(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    WED._invitationImg = e.target.result;
    renderOverview();
    showToast('💌 Invitation uploaded!');
  };
  reader.readAsDataURL(file);
}

function submitEditOverview() {
  const p1     = document.getElementById('ov-p1')?.value.trim()     || WED.couple.p1;
  const p2     = document.getElementById('ov-p2')?.value.trim()     || WED.couple.p2;
  const date   = document.getElementById('ov-date')?.value          || WED.date;
  const venue  = document.getElementById('ov-venue')?.value.trim()  || WED.venue;
  const budget = parseInt(document.getElementById('ov-budget')?.value) || WED.budget;
  WED.couple.p1 = p1; WED.couple.p2 = p2;
  WED.date = date; WED.venue = venue; WED.budget = budget;
  // Sync to WEDDING_STATE if available
  if (typeof WEDDING_STATE !== 'undefined') {
    Object.assign(WEDDING_STATE, { p1, p2, date, venue, budget });
  }
  closeModalById('wed-edit-overview-modal');
  renderOverview();
  if (typeof updateWeddingHomeBadges === 'function') updateWeddingHomeBadges();
  showToast('✅ Wedding details updated!');
}

// Expose new functions
window.submitChecklistItem = submitChecklistItem;
window.deleteChecklistItem = deleteChecklistItem;
window.openAddChecklistItem = openAddChecklistItem;
window.openAddChecklistItemToPhase = openAddChecklistItemToPhase;
window.submitTimeline = submitTimeline;
window.openEditSched = openEditSched;
window.submitEditSched = submitEditSched;
window.deleteSchedItem = deleteSchedItem;
window.submitEditOverview = submitEditOverview;
window.uploadInvitation = uploadInvitation;
window.addFurniture = addFurniture;
window.drawFurniture = drawFurniture;
