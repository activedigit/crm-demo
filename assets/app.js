/* ===== ActiveCRM — לוגיקת האפליקציה ===== */
(function () {
  'use strict';

  const KEY = 'activecrm.demo.v1';
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let state = migrate(load());

  /* ---------- אחסון ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* נתונים פגומים — נופלים לנתוני הדגמה */ }
    return buildDemoData();
  }
  function migrate(s) {
    s.customers = s.customers || [];
    s.deals = s.deals || [];
    s.tasks = s.tasks || [];
    s.activities = s.activities || [];
    s.revenue = s.revenue || new Array(12).fill(0);
    s.settings = s.settings || { biz: 'העסק שלי', currency: '₪', contact: '', email: '' };
    if (!s.owners || !s.owners.length) s.owners = OWNERS.map(o => Object.assign({}, o));
    // עסקאות שנסגרו בהצלחה כבר משוקללות בהיקף העסקי של הלקוח
    s.deals.forEach(d => { if (d.counted === undefined) d.counted = (d.stage === 'won'); });
    return s;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { toast('שגיאה בשמירה מקומית'); }
  }
  function uid(p) { return p + Math.random().toString(36).slice(2, 8); }

  /* ---------- עזרי תצוגה ---------- */
  const nf = new Intl.NumberFormat('he-IL');
  function cur() { return state.settings.currency || '₪'; }
  function money(n) { return cur() + nf.format(Math.round(n || 0)); }
  function moneyShort(n) {
    n = n || 0;
    if (n >= 1000000) return cur() + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return cur() + Math.round(n / 1000) + 'K';
    return cur() + nf.format(n);
  }
  function fdate(s) {
    if (!s) return '—';
    return new Date(s + 'T00:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
  function daysFrom(s) {
    if (!s) return 0;
    const d = new Date(s + 'T00:00:00'), t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((d - t) / 86400000);
  }
  function relative(s) {
    const n = daysFrom(s);
    if (n === 0) return 'היום';
    if (n === 1) return 'מחר';
    if (n === -1) return 'אתמול';
    if (n < 0) return 'לפני ' + Math.abs(n) + ' ימים';
    return 'בעוד ' + n + ' ימים';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function owners() { return state.owners; }
  function ownerNames() { return state.owners.map(o => o.name); }
  function ownerColor(name) {
    const o = state.owners.find(x => x.name === name);
    return o ? o.color : '#94a3b8';
  }
  function avatar(name, cls) {
    return '<div class="avatar ' + (cls || '') + '" style="--c:' + ownerColor(name) + '">' +
      esc(String(name || '?').trim().charAt(0)) + '</div>';
  }
  function statusPill(s) {
    const map = { 'לקוח פעיל': 'ok', 'לקוח פוטנציאלי': 'info', 'בטיפול': 'warn', 'לא פעיל': 'mute' };
    return '<span class="pill ' + (map[s] || 'mute') + '">' + esc(s) + '</span>';
  }
  function customerById(id) { return state.customers.find(c => c.id === id); }
  function dealById(id) { return state.deals.find(d => d.id === id); }
  function taskById(id) { return state.tasks.find(t => t.id === id); }
  function stageById(id) { return STAGES.find(s => s.id === id) || STAGES[0]; }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(t._tm);
    t._tm = setTimeout(() => { t.hidden = true; }, 2600);
  }

  function fillSelect(sel, values, current) {
    if (!sel) return;
    const keep = sel.options.length ? sel.options[0] : null;
    const prev = current !== undefined ? current : sel.value;
    sel.innerHTML = '';
    if (keep) sel.add(keep);
    values.forEach(v => sel.add(new Option(v.label !== undefined ? v.label : v, v.value !== undefined ? v.value : v)));
    sel.value = prev;
    if (sel.selectedIndex < 0) sel.selectedIndex = 0;
  }
  function refreshSelects() {
    fillSelect($('#filterOwner'), ownerNames());
    fillSelect($('#pipeOwner'), ownerNames());
    fillSelect($('#taskOwner'), ownerNames());
    fillSelect($('#actType'), ACTIVITY_TYPES);
    fillSelect($('#actCustomer'), state.customers.map(c => ({ value: c.id, label: c.company })));
  }

  function downloadFile(name, content, mime) {
    const url = URL.createObjectURL(new Blob([content], { type: mime || 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- ניווט ---------- */
  function go(view) {
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === view));
    $('#sidebar').classList.remove('open');
    window.scrollTo({ top: 0 });
    renderView(view);
  }
  function currentView() {
    const v = $('.view.active');
    return v ? v.dataset.view : 'dashboard';
  }
  function renderView(v) {
    if (v === 'dashboard') renderDashboard();
    if (v === 'customers') renderCustomers();
    if (v === 'pipeline')  renderBoard();
    if (v === 'tasks')     renderTasks();
    if (v === 'activity')  renderTimeline();
    if (v === 'reports')   renderReports();
    if (v === 'settings')  renderSettings();
  }
  function refreshAll() {
    refreshBadges();
    refreshSelects();
    renderView(currentView());
  }

  /* ---------- חישובים ---------- */
  const CLOSED = ['won', 'lost'];
  function openDeals()  { return state.deals.filter(d => CLOSED.indexOf(d.stage) < 0); }
  function wonDeals()   { return state.deals.filter(d => d.stage === 'won'); }
  function lostDeals()  { return state.deals.filter(d => d.stage === 'lost'); }
  function openTasks()  { return state.tasks.filter(t => !t.done); }
  function lateTasks()  { return openTasks().filter(t => daysFrom(t.due) < 0); }
  function pipelineValue() { return openDeals().reduce((s, d) => s + d.value, 0); }
  function weightedValue() {
    return openDeals().reduce((s, d) => s + d.value * stageById(d.stage).prob / 100, 0);
  }

  /* ---------- לוח בקרה ---------- */
  function renderDashboard() {
    $('#todayLabel').textContent = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const rev = state.revenue;
    const thisM = rev[rev.length - 1] || 0, prevM = rev[rev.length - 2] || 0;
    const growth = prevM ? ((thisM - prevM) / prevM * 100).toFixed(1) : '0.0';
    const active = state.customers.filter(c => c.status === 'לקוח פעיל').length;
    const won = wonDeals().length, closed = won + lostDeals().length;
    const winRate = closed ? Math.round(won / closed * 100) : 0;

    $('#kpiGrid').innerHTML = [
      kpi('הכנסות החודש', money(thisM), (growth >= 0 ? 'up' : 'down'), (growth >= 0 ? '▲ ' : '▼ ') + Math.abs(growth) + '% מהחודש שעבר', '#4f46e5', 'reports'),
      kpi('לקוחות פעילים', nf.format(active), 'up', '▲ מתוך ' + state.customers.length + ' לקוחות בסה״כ', '#0ea5e9', 'customers'),
      kpi('שווי צינור מכירות', money(pipelineValue()), 'flat', openDeals().length + ' עסקאות פתוחות · צפי משוקלל ' + moneyShort(weightedValue()), '#f59e0b', 'pipeline'),
      kpi('אחוז סגירה', winRate + '%', winRate >= 40 ? 'up' : 'down', won + ' נסגרו בהצלחה מתוך ' + closed + ' שהוכרעו', '#10b981', 'reports')
    ].join('');

    const months = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
    const now = new Date().getMonth();
    const max = Math.max.apply(null, rev.concat([1]));
    $('#revenueChart').innerHTML = rev.map((v, i) => {
      const m = months[(now - (rev.length - 1 - i) + 24) % 12];
      return '<div class="col"><div class="bar" style="height:' + (v / max * 100) + '%"><span>' + moneyShort(v) + '</span></div><div class="lb">' + m + '</div></div>';
    }).join('');

    renderDonut();

    const top = openDeals().slice().sort((a, b) => b.value - a.value).slice(0, 6);
    $('#topDeals').innerHTML =
      '<thead><tr><th>עסקה</th><th>לקוח</th><th>שלב</th><th>סכום</th></tr></thead><tbody>' +
      (top.length ? top.map(d => {
        const c = customerById(d.customerId), st = stageById(d.stage);
        return '<tr data-deal="' + d.id + '"><td><strong>' + esc(d.title) + '</strong></td>' +
          '<td class="muted">' + esc(c ? c.company : '—') + '</td>' +
          '<td><span class="pill" style="background:' + st.color + '22;color:' + st.color + '">' + esc(st.name) + '</span></td>' +
          '<td class="num">' + money(d.value) + '</td></tr>';
      }).join('') : '<tr><td colspan="4" class="empty">אין עסקאות פתוחות</td></tr>') + '</tbody>';

    const soon = openTasks().slice().sort((a, b) => a.due.localeCompare(b.due)).slice(0, 6);
    $('#dashTasks').innerHTML = soon.length ? soon.map(taskRow).join('') : emptyRow('אין משימות פתוחות');
  }

  function kpi(label, val, dir, note, color, goto) {
    return '<div class="kpi" style="--kc:' + color + ';cursor:pointer" data-goto="' + goto + '">' +
      '<div class="lbl">' + label + '</div><div class="val">' + val + '</div>' +
      '<div class="delta ' + dir + '">' + note + '</div></div>';
  }
  function emptyRow(msg) { return '<li class="empty"><span class="big">✓</span>' + msg + '</li>'; }

  function renderDonut() {
    const counts = {};
    state.customers.forEach(c => { counts[c.source] = (counts[c.source] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = state.customers.length || 1;
    const palette = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];
    let offset = 25, svg = '';
    entries.forEach((e, i) => {
      const pct = e[1] / total * 100, color = palette[i % palette.length];
      svg += '<circle r="15.915" cx="21" cy="21" fill="none" stroke="' + color + '" stroke-width="7" ' +
             'stroke-dasharray="' + pct.toFixed(2) + ' ' + (100 - pct).toFixed(2) + '" stroke-dashoffset="' + offset + '"></circle>';
      offset -= pct;
    });
    $('#sourceDonut').innerHTML = svg;
    $('#sourceLegend').innerHTML = entries.map((e, i) =>
      '<li><span class="dot" style="background:' + palette[i % palette.length] + '"></span>' + esc(e[0]) +
      '<span class="v">' + e[1] + '</span></li>').join('') || '<li class="muted">אין נתונים</li>';
  }

  /* ---------- לקוחות ---------- */
  function filteredCustomers() {
    const q = ($('#custSearch').value || '').trim().toLowerCase();
    const st = $('#filterStatus').value, ow = $('#filterOwner').value, sort = $('#sortBy').value;
    let list = state.customers.filter(c => {
      if (st && c.status !== st) return false;
      if (ow && c.owner !== ow) return false;
      if (!q) return true;
      return [c.name, c.company, c.email, c.city, c.industry, c.phone, (c.tags || []).join(' ')]
        .join(' ').toLowerCase().includes(q);
    });
    const cmp = {
      name: (a, b) => a.name.localeCompare(b.name, 'he'),
      value: (a, b) => b.value - a.value,
      lastContact: (a, b) => (b.lastContact || '').localeCompare(a.lastContact || ''),
      created: (a, b) => (b.created || '').localeCompare(a.created || '')
    }[sort];
    if (cmp) list.sort(cmp);
    return list;
  }

  function renderCustomers() {
    const list = filteredCustomers();
    $('#custCount').textContent = 'מוצגים ' + list.length + ' מתוך ' + state.customers.length + ' לקוחות';

    const rows = list.map(c => {
      const dealsCount = state.deals.filter(d => d.customerId === c.id && CLOSED.indexOf(d.stage) < 0).length;
      const late = daysFrom(c.lastContact) < -60;
      return '<tr data-id="' + c.id + '">' +
        '<td><div class="cell-name">' + avatar(c.name) +
          '<div><strong>' + esc(c.name) + '</strong><small>' + esc(c.company) + '</small></div></div></td>' +
        '<td>' + statusPill(c.status) + '</td>' +
        '<td class="muted">' + esc(c.industry) + '<br><small>' + esc(c.city) + '</small></td>' +
        '<td class="muted"><div>' + esc(c.phone) + '</div><small>' + esc(c.email) + '</small></td>' +
        '<td><div class="cell-name">' + avatar(c.owner, 'sm') + '<span class="muted">' + esc(c.owner) + '</span></div></td>' +
        '<td class="num">' + (c.value ? money(c.value) : '<span class="muted">—</span>') + '</td>' +
        '<td>' + (dealsCount ? '<span class="pill brand">' + dealsCount + ' פתוחות</span>' : '<span class="muted">—</span>') + '</td>' +
        '<td class="muted"><span class="' + (late ? 'pill danger' : '') + '">' + fdate(c.lastContact) + '</span></td>' +
        '</tr>';
    }).join('');

    $('#customersTable').innerHTML =
      '<thead><tr><th>לקוח</th><th>סטטוס</th><th>תחום / עיר</th><th>פרטי קשר</th><th>אחראי</th><th>היקף עסקי</th><th>עסקאות</th><th>קשר אחרון</th></tr></thead>' +
      '<tbody>' + (rows || '<tr><td colspan="8" class="empty"><span class="big">⌕</span>לא נמצאו לקוחות התואמים לסינון</td></tr>') + '</tbody>';
  }

  /* ---------- מגירת לקוח ---------- */
  let drawerId = null;
  function openCustomer(id) {
    const c = customerById(id);
    if (!c) return;
    drawerId = id;
    const cd = state.deals.filter(d => d.customerId === id);
    const ct = state.tasks.filter(t => t.customerId === id && !t.done);
    const ca = state.activities.filter(a => a.customerId === id).sort((a, b) => b.date.localeCompare(a.date));
    const wonSum = cd.filter(d => d.stage === 'won').reduce((s, d) => s + d.value, 0);

    $('#drawer').innerHTML =
      '<div class="drawer-head">' + avatar(c.name) +
        '<div><h2>' + esc(c.name) + '</h2><p class="muted">' + esc(c.company) + '</p>' +
        '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' + statusPill(c.status) +
        (c.tags || []).map(t => '<span class="pill brand">' + esc(t) + '</span>').join('') + '</div></div>' +
        '<button class="icon-btn close" data-close>✕</button></div>' +

      '<div class="drawer-body">' +
        '<div class="drawer-actions">' +
          '<button class="btn primary sm" data-edit="' + c.id + '">עריכת כרטיס</button>' +
          '<button class="btn ghost sm" data-newdeal="' + c.id + '">+ עסקה</button>' +
          '<button class="btn ghost sm" data-newtask="' + c.id + '">+ משימה</button>' +
          (c.phone ? '<a class="btn ghost sm" href="tel:' + esc(c.phone) + '">☎ חיוג</a>' : '') +
          (c.email ? '<a class="btn ghost sm" href="mailto:' + esc(c.email) + '">✉ מייל</a>' : '') +
          '<button class="btn danger sm" data-del="' + c.id + '">מחיקה</button>' +
        '</div>' +

        '<div class="sec-title">פרטי קשר</div>' +
        '<dl class="kv">' +
          '<dt>טלפון</dt><dd>' + esc(c.phone) + '</dd>' +
          '<dt>אימייל</dt><dd>' + esc(c.email) + '</dd>' +
          '<dt>עיר</dt><dd>' + esc(c.city) + '</dd>' +
          '<dt>תחום</dt><dd>' + esc(c.industry) + '</dd>' +
          '<dt>מקור הליד</dt><dd>' + esc(c.source) + '</dd>' +
          '<dt>אחראי</dt><dd>' + esc(c.owner) + '</dd>' +
          '<dt>היקף עסקי</dt><dd>' + money(c.value) + (wonSum ? ' <span class="muted small">(מזה ' + money(wonSum) + ' מעסקאות סגורות)</span>' : '') + '</dd>' +
          '<dt>לקוח מאז</dt><dd>' + fdate(c.created) + '</dd>' +
          '<dt>קשר אחרון</dt><dd>' + fdate(c.lastContact) + ' <span class="muted small">(' + relative(c.lastContact) + ')</span></dd>' +
        '</dl>' +

        '<div class="sec-title">עסקאות (' + cd.length + ') — לחיצה לעריכה</div>' +
        '<ul class="mini-list">' + (cd.length ? cd.map(d => {
          const st = stageById(d.stage);
          return '<li data-deal="' + d.id + '" style="cursor:pointer"><span class="stage-dot" style="background:' + st.color + '"></span>' +
            esc(d.title) + '<span class="pill mute">' + esc(st.name) + '</span><span class="num">' + money(d.value) + '</span></li>';
        }).join('') : '<li class="muted">אין עסקאות רשומות</li>') + '</ul>' +

        '<div class="sec-title">משימות פתוחות (' + ct.length + ')</div>' +
        '<ul class="mini-list">' + (ct.length
          ? ct.map(t => '<li data-edittask="' + t.id + '" style="cursor:pointer">' + esc(t.title) +
              '<span class="pill ' + (daysFrom(t.due) < 0 ? 'danger' : 'mute') + '">' + relative(t.due) + '</span></li>').join('')
          : '<li class="muted">אין משימות פתוחות</li>') + '</ul>' +

        '<div class="sec-title">היסטוריית פעילות</div>' +
        '<div class="note-box"><input class="input" id="noteInput" placeholder="הוספת הערה או תיעוד שיחה…">' +
          '<button class="btn primary sm" data-addnote="' + c.id + '">הוספה</button></div>' +
        '<ul class="timeline" style="margin-top:14px">' + (ca.length ? ca.map(tlItem).join('') : '<li class="muted">אין פעילות מתועדת</li>') + '</ul>' +
      '</div>';

    $('#drawer').hidden = false;
    $('#overlay').hidden = false;
  }
  function closeDrawer() { $('#drawer').hidden = true; $('#overlay').hidden = true; drawerId = null; }
  function refreshDrawer() { if (drawerId && customerById(drawerId)) openCustomer(drawerId); }

  /* ---------- צינור מכירות ---------- */
  function renderBoard() {
    const ow = $('#pipeOwner').value;
    const visible = ow ? state.deals.filter(d => d.owner === ow) : state.deals;
    const open = visible.filter(d => CLOSED.indexOf(d.stage) < 0);
    const sum = open.reduce((s, d) => s + d.value, 0);
    const weighted = open.reduce((s, d) => s + d.value * stageById(d.stage).prob / 100, 0);
    $('#pipeSummary').textContent = open.length + ' עסקאות פתוחות בשווי ' + money(sum) + ' · צפי משוקלל ' + money(weighted);

    $('#board').innerHTML = STAGES.map(st => {
      const ds = visible.filter(d => d.stage === st.id);
      const total = ds.reduce((s, d) => s + d.value, 0);
      return '<div class="col-stage" data-stage="' + st.id + '">' +
        '<div class="col-head"><span class="stage-dot" style="background:' + st.color + '"></span>' +
          '<strong>' + esc(st.name) + '</strong><span class="chip">' + ds.length + '</span>' +
          '<span class="sum">' + moneyShort(total) + '</span></div>' +
        ds.map(d => {
          const c = customerById(d.customerId);
          const closed = CLOSED.indexOf(d.stage) > -1;
          const overdue = !closed && daysFrom(d.close) < 0;
          return '<div class="deal' + (closed ? ' is-closed' : '') + '" draggable="true" data-deal="' + d.id + '">' +
            '<button class="del" data-deldeal="' + d.id + '" title="מחיקת עסקה">✕</button>' +
            '<div class="t">' + esc(d.title) + '</div>' +
            '<div class="c"><span class="link" data-cust="' + d.customerId + '">' + esc(c ? c.company : '—') + '</span></div>' +
            '<div class="prob"><i style="width:' + st.prob + '%;background:' + st.color + '"></i></div>' +
            '<div class="foot"><span class="amount">' + money(d.value) + '</span>' +
              '<span class="pill ' + (overdue ? 'danger' : 'mute') + '" style="font-size:.7rem">' + fdate(d.close) + '</span>' +
              avatar(d.owner, 'sm') + '</div></div>';
        }).join('') +
        '</div>';
    }).join('');

    bindDnD();
  }

  /* עדכון שלב + התאמת ההיקף העסקי של הלקוח */
  function applyStage(deal, newStage) {
    const c = customerById(deal.customerId);
    const was = deal.stage;
    deal.stage = newStage;
    if (c) {
      if (newStage === 'won' && !deal.counted) { c.value += deal.value; deal.counted = true; c.status = 'לקוח פעיל'; }
      else if (was === 'won' && newStage !== 'won' && deal.counted) { c.value = Math.max(0, c.value - deal.value); deal.counted = false; }
      c.lastContact = dayOffset(0);
    }
    logActivity(deal.customerId, 'עסקה', 'העסקה ״' + deal.title + '״ עברה לשלב ״' + stageById(newStage).name + '״.', deal.owner);
  }
  function logActivity(customerId, type, text, by) {
    state.activities.unshift({ id: uid('a'), customerId: customerId, type: type, text: text, by: by || state.settings.contact || 'המערכת', date: dayOffset(0) });
  }

  function bindDnD() {
    let dragId = null;
    $$('.deal').forEach(el => {
      el.addEventListener('dragstart', e => {
        dragId = el.dataset.deal;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragId);
      });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
    });
    $$('.col-stage').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
      col.addEventListener('drop', e => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const deal = dealById(dragId || e.dataTransfer.getData('text/plain'));
        if (!deal || deal.stage === col.dataset.stage) return;
        applyStage(deal, col.dataset.stage);
        save(); refreshAll();
        toast('העסקה עודכנה לשלב: ' + stageById(deal.stage).name);
      });
    });
  }

  /* ---------- משימות ---------- */
  let taskFilter = 'open';
  function taskRow(t) {
    const c = customerById(t.customerId);
    const late = !t.done && daysFrom(t.due) < 0;
    const prio = { 'גבוהה': 'danger', 'רגילה': 'info', 'נמוכה': 'mute' }[t.priority] || 'mute';
    return '<li class="' + (t.done ? 'done' : '') + '">' +
      '<button class="cb" data-toggle="' + t.id + '" title="סימון כהושלמה">✓</button>' +
      '<div class="t-body"><div class="t-title" data-edittask="' + t.id + '" style="cursor:pointer">' + esc(t.title) + '</div>' +
      '<div class="t-meta">' +
        '<span class="pill mute">' + esc(t.type) + '</span>' +
        '<span class="pill ' + prio + '">' + esc(t.priority) + '</span>' +
        (c ? '<span class="link" data-cust="' + c.id + '">' + esc(c.company) + '</span>' : '') +
        '<span class="' + (late ? 'pill danger' : '') + '">' + (late ? 'באיחור · ' : '') + fdate(t.due) + '</span>' +
        '<span>· ' + esc(t.owner) + '</span>' +
      '</div></div>' +
      '<button class="icon-btn" data-edittask="' + t.id + '" title="עריכה">✎</button>' +
      '<button class="icon-btn" data-deltask="' + t.id + '" title="מחיקה">✕</button></li>';
  }

  function renderTasks() {
    const ow = $('#taskOwner').value;
    let list = state.tasks.slice();
    if (ow) list = list.filter(t => t.owner === ow);
    if (taskFilter === 'open')  list = list.filter(t => !t.done);
    if (taskFilter === 'done')  list = list.filter(t => t.done);
    if (taskFilter === 'today') list = list.filter(t => !t.done && daysFrom(t.due) === 0);
    if (taskFilter === 'late')  list = list.filter(t => !t.done && daysFrom(t.due) < 0);
    list.sort((a, b) => (a.done - b.done) || (a.due || '').localeCompare(b.due || ''));
    $('#taskCount').textContent = list.length + ' משימות · ' + lateTasks().length + ' באיחור';
    $('#taskList').innerHTML = list.length ? list.map(taskRow).join('') : emptyRow('אין משימות בתצוגה הזו');
  }

  /* ---------- יומן פעילות ---------- */
  function tlItem(a) {
    const c = customerById(a.customerId);
    const colors = { 'שיחה': '#0ea5e9', 'פגישה': '#8b5cf6', 'מייל': '#f59e0b', 'עסקה': '#10b981', 'ליד': '#ec4899', 'הערה': '#64748b' };
    const icons  = { 'שיחה': '☎', 'פגישה': '◍', 'מייל': '✉', 'עסקה': '★', 'ליד': '⚡', 'הערה': '✎' };
    return '<li><span class="dot" style="background:' + (colors[a.type] || '#64748b') + '">' + (icons[a.type] || '•') + '</span>' +
      '<div class="tl-head"><strong>' + esc(a.type) + (c ? ' · <span class="link" data-cust="' + c.id + '">' + esc(c.company) + '</span>' : '') + '</strong>' +
      '<time>' + fdate(a.date) + ' · ' + relative(a.date) + '</time>' +
      '<span class="tl-actions"><button class="icon-btn" data-editact="' + a.id + '" title="עריכה">✎</button>' +
      '<button class="icon-btn" data-delact="' + a.id + '" title="מחיקה">✕</button></span></div>' +
      '<p>' + esc(a.text) + ' <span class="muted">— ' + esc(a.by) + '</span></p></li>';
  }
  function renderTimeline() {
    const ty = $('#actType').value, cu = $('#actCustomer').value, rg = Number($('#actRange').value || 0);
    let list = state.activities.slice().sort((a, b) => b.date.localeCompare(a.date));
    if (ty) list = list.filter(a => a.type === ty);
    if (cu) list = list.filter(a => a.customerId === cu);
    if (rg) list = list.filter(a => daysFrom(a.date) >= -rg);
    $('#actCount').textContent = list.length + ' רשומות';
    $('#timeline').innerHTML = list.length ? list.map(tlItem).join('') : '<li class="empty"><span class="big">◷</span>אין פעילות בתצוגה הזו</li>';
  }

  /* ---------- דוחות ---------- */
  function ownerStats() {
    return owners().map(o => {
      const dw = state.deals.filter(d => d.owner === o.name && d.stage === 'won');
      const dls = state.deals.filter(d => d.owner === o.name && d.stage === 'lost');
      const dop = state.deals.filter(d => d.owner === o.name && CLOSED.indexOf(d.stage) < 0);
      const decided = dw.length + dls.length;
      return {
        o: o,
        custs: state.customers.filter(c => c.owner === o.name).length,
        won: dw.length, wonSum: dw.reduce((s, d) => s + d.value, 0),
        lost: dls.length,
        open: dop.length, openSum: dop.reduce((s, d) => s + d.value, 0),
        tasks: state.tasks.filter(t => t.owner === o.name && !t.done).length,
        rate: decided ? Math.round(dw.length / decided * 100) : 0
      };
    }).sort((a, b) => b.wonSum - a.wonSum);
  }

  function renderReports() {
    const won = wonDeals(), wonSum = won.reduce((s, d) => s + d.value, 0);
    const avg = won.length ? wonSum / won.length : 0;
    const totalRev = state.revenue.reduce((s, v) => s + v, 0);

    $('#reportKpis').innerHTML = [
      kpi('סך הכנסות השנה', money(totalRev), 'up', '▲ ממוצע ' + moneyShort(totalRev / 12) + ' לחודש', '#4f46e5', 'dashboard'),
      kpi('עסקאות שנסגרו', won.length, 'up', 'בשווי כולל ' + money(wonSum), '#10b981', 'pipeline'),
      kpi('גודל עסקה ממוצע', money(avg), 'flat', 'על בסיס עסקאות סגורות', '#0ea5e9', 'pipeline'),
      kpi('משימות באיחור', lateTasks().length, lateTasks().length ? 'down' : 'up', 'מתוך ' + openTasks().length + ' משימות פתוחות', '#f59e0b', 'tasks')
    ].join('');

    const rows = ownerStats();
    $('#ownerTable').innerHTML =
      '<thead><tr><th>נציג</th><th>לקוחות</th><th>נסגרו</th><th>הכנסות</th><th>בצנרת</th><th>משימות</th><th>אחוז סגירה</th></tr></thead><tbody>' +
      (rows.length ? rows.map(r => '<tr><td><div class="cell-name">' + avatar(r.o.name, 'sm') +
        '<div><strong>' + esc(r.o.name) + '</strong><small>' + esc(r.o.role) + '</small></div></div></td>' +
        '<td class="num">' + r.custs + '</td><td class="num">' + r.won + '</td>' +
        '<td class="num">' + money(r.wonSum) + '</td><td class="num">' + money(r.openSum) + '</td>' +
        '<td class="num">' + r.tasks + '</td>' +
        '<td><span class="pill ' + (r.rate >= 60 ? 'ok' : r.rate >= 30 ? 'warn' : 'mute') + '">' + r.rate + '%</span></td></tr>').join('')
        : '<tr><td colspan="7" class="empty">אין נציגים</td></tr>') + '</tbody>';

    const counts = STAGES.filter(s => s.id !== 'lost').map(st => ({ st: st, n: state.deals.filter(d => d.stage === st.id).length }));
    const maxN = Math.max.apply(null, counts.map(c => c.n).concat([1]));
    $('#funnel').innerHTML = counts.map((c, i) => {
      const w = 55 + (c.n / maxN) * 45;
      const prev = i ? counts[i - 1].n : null;
      const conv = prev !== null ? '<div class="conv">↓ ' + (prev ? Math.round(c.n / prev * 100) : 0) + '% מעבר</div>' : '';
      return conv + '<div class="step" style="width:' + w + '%;background:' + c.st.color + '1f;color:' + c.st.color + '">' +
        esc(c.st.name) + '<b>' + c.n + '</b></div>';
    }).join('') + '<div class="conv" style="margin-top:10px">נסגרו בהפסד: <b>' + lostDeals().length + '</b></div>';

    const top = state.customers.slice().sort((a, b) => b.value - a.value).slice(0, 8);
    const maxV = (top[0] && top[0].value) || 1;
    $('#topCustomers').innerHTML = top.map(c =>
      '<div class="row" data-id-cust="' + c.id + '"><span class="nm">' + esc(c.company) + '</span>' +
      '<span class="track"><span class="fill" style="width:' + (c.value / maxV * 100) + '%"></span></span>' +
      '<span class="vv">' + money(c.value) + '</span></div>').join('') || '<p class="muted">אין נתונים</p>';
  }

  /* ---------- הגדרות ---------- */
  function renderSettings() {
    const s = state.settings;
    $('#setBiz').value = s.biz; $('#setContact').value = s.contact;
    $('#setEmail').value = s.email; $('#setCurrency').value = s.currency;
    $('#revInput').value = state.revenue.join(', ');

    $('#ownerList').innerHTML = owners().map((o, i) =>
      '<li><div class="owner-row">' + avatar(o.name, 'sm') +
      '<div class="meta"><strong>' + esc(o.name) + '</strong><small>' + esc(o.role) + ' · ' +
        state.customers.filter(c => c.owner === o.name).length + ' לקוחות</small></div>' +
      '<div class="acts"><button class="icon-btn" data-editowner="' + i + '" title="עריכה">✎</button>' +
      '<button class="icon-btn" data-delowner="' + i + '" title="מחיקה">✕</button></div></div></li>').join('')
      || '<li class="muted">אין נציגים</li>';

    const bytes = (localStorage.getItem(KEY) || '').length;
    $('#storageStats').innerHTML =
      '<span>לקוחות: <b>' + state.customers.length + '</b></span>' +
      '<span>עסקאות: <b>' + state.deals.length + '</b></span>' +
      '<span>משימות: <b>' + state.tasks.length + '</b></span>' +
      '<span>רשומות פעילות: <b>' + state.activities.length + '</b></span>' +
      '<span>נפח אחסון מקומי: <b>' + (bytes / 1024).toFixed(1) + ' KB</b></span>';
  }

  function applyBranding() {
    $('#brandBiz').textContent = state.settings.biz || 'ניהול לקוחות';
    document.title = 'ActiveCRM — ' + (state.settings.biz || 'ניהול לקוחות');
    const me = owners().find(o => o.name === state.settings.contact) || owners()[0];
    if (me) {
      $('#userChip').innerHTML = avatar(me.name) + '<div><strong>' + esc(me.name) + '</strong><span>' + esc(me.role) + '</span></div>';
    }
  }

  /* ---------- מודאלים ---------- */
  function modal(title, bodyHtml, onSave, saveLabel, extraHtml) {
    $('#modal').innerHTML =
      '<div class="modal-head"><h2>' + title + '</h2><button class="icon-btn close" data-mclose>✕</button></div>' +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      '<div class="modal-foot"><button class="btn primary" data-msave>' + (saveLabel || 'שמירה') + '</button>' +
      '<button class="btn ghost" data-mclose>ביטול</button>' + (extraHtml || '') + '</div>';
    $('#modalBackdrop').hidden = false;
    $('#modal')._save = onSave;
    const first = $('#modal input, #modal select, #modal textarea');
    if (first) first.focus();
  }
  function closeModal() { $('#modalBackdrop').hidden = true; $('#modal')._save = null; }

  function opts(arr, sel) {
    return arr.map(v => '<option' + (v === sel ? ' selected' : '') + '>' + esc(v) + '</option>').join('');
  }
  function custOpts(sel) {
    if (!state.customers.length) return '<option value="">— אין לקוחות —</option>';
    return state.customers.map(c => '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' +
      esc(c.company) + ' — ' + esc(c.name) + '</option>').join('');
  }

  /* --- טופס לקוח --- */
  function customerForm(c) {
    c = c || {};
    return '<div class="form-grid">' +
      '<label>שם איש הקשר<input class="input" id="f_name" value="' + esc(c.name || '') + '" placeholder="לדוגמה: ישראל ישראלי"></label>' +
      '<label>שם החברה<input class="input" id="f_company" value="' + esc(c.company || '') + '"></label>' +
      '<label>טלפון<input class="input" id="f_phone" value="' + esc(c.phone || '') + '" placeholder="050-0000000"></label>' +
      '<label>אימייל<input class="input" id="f_email" value="' + esc(c.email || '') + '"></label>' +
      '<label>עיר<input class="input" id="f_city" value="' + esc(c.city || '') + '"></label>' +
      '<label>תחום עיסוק<input class="input" id="f_industry" value="' + esc(c.industry || '') + '"></label>' +
      '<label>סטטוס<select class="input" id="f_status">' + opts(['לקוח פוטנציאלי', 'בטיפול', 'לקוח פעיל', 'לא פעיל'], c.status) + '</select></label>' +
      '<label>מקור הליד<select class="input" id="f_source">' + opts(SOURCES, c.source) + '</select></label>' +
      '<label>אחראי<select class="input" id="f_owner">' + opts(ownerNames(), c.owner) + '</select></label>' +
      '<label>היקף עסקי (' + cur() + ')<input class="input" id="f_value" type="number" min="0" value="' + (c.value || 0) + '"></label>' +
      '<label>קשר אחרון<input class="input" id="f_last" type="date" value="' + (c.lastContact || dayOffset(0)) + '"></label>' +
      '<label>לקוח מאז<input class="input" id="f_created" type="date" value="' + (c.created || dayOffset(0)) + '"></label>' +
      '<label class="full">תגיות (מופרדות בפסיק)<input class="input" id="f_tags" value="' + esc((c.tags || []).join(', ')) + '" placeholder="VIP, חוזה שנתי"></label>' +
      '</div>';
  }
  function saveCustomer(existing) {
    const name = $('#f_name').value.trim();
    if (!name) { toast('נא למלא שם איש קשר'); return false; }
    const data = {
      name: name,
      company: $('#f_company').value.trim() || name,
      phone: $('#f_phone').value.trim(),
      email: $('#f_email').value.trim(),
      city: $('#f_city').value.trim(),
      industry: $('#f_industry').value.trim() || 'כללי',
      status: $('#f_status').value,
      source: $('#f_source').value,
      owner: $('#f_owner').value,
      value: Number($('#f_value').value) || 0,
      lastContact: $('#f_last').value || dayOffset(0),
      created: $('#f_created').value || dayOffset(0),
      tags: $('#f_tags').value.split(',').map(s => s.trim()).filter(Boolean)
    };
    if (existing) { Object.assign(existing, data); toast('כרטיס הלקוח עודכן'); }
    else {
      const c = Object.assign({ id: uid('c') }, data);
      state.customers.unshift(c);
      logActivity(c.id, 'ליד', 'נוצר כרטיס לקוח חדש במערכת.', c.owner);
      toast('נוסף לקוח חדש: ' + c.name);
    }
    save();
    return true;
  }

  /* --- טופס עסקה --- */
  function dealForm(d, preCust) {
    d = d || {};
    return '<div class="form-grid">' +
      '<label class="full">כותרת העסקה<input class="input" id="f_title" value="' + esc(d.title || '') + '" placeholder="לדוגמה: מערכת ניהול מלאי"></label>' +
      '<label>לקוח<select class="input" id="f_cust">' + custOpts(d.customerId || preCust) + '</select></label>' +
      '<label>סכום (' + cur() + ')<input class="input" id="f_val" type="number" min="0" value="' + (d.value !== undefined ? d.value : 25000) + '"></label>' +
      '<label>שלב<select class="input" id="f_stage">' +
        STAGES.map(s => '<option value="' + s.id + '"' + (s.id === d.stage ? ' selected' : '') + '>' + esc(s.name) + '</option>').join('') +
      '</select></label>' +
      '<label>אחראי<select class="input" id="f_downer">' + opts(ownerNames(), d.owner) + '</select></label>' +
      '<label class="full">תאריך סגירה צפוי<input class="input" id="f_close" type="date" value="' + (d.close || dayOffset(21)) + '"></label>' +
      '<label class="full">הערה / סיבת הפסד<input class="input" id="f_reason" value="' + esc(d.lostReason || '') + '" placeholder="רלוונטי בעיקר לעסקאות שנסגרו בהפסד"></label>' +
      '</div>';
  }
  function saveDeal(existing) {
    const title = $('#f_title').value.trim();
    if (!title) { toast('נא למלא כותרת לעסקה'); return false; }
    if (!$('#f_cust').value) { toast('נא ליצור לקוח לפני פתיחת עסקה'); return false; }
    const val = Number($('#f_val').value) || 0;
    const stage = $('#f_stage').value;

    if (existing) {
      // מבטלים את שקלול הסכום הישן, מעדכנים, ומשקללים מחדש לפי השלב החדש
      const oldC = customerById(existing.customerId);
      if (existing.counted && oldC) { oldC.value = Math.max(0, oldC.value - existing.value); existing.counted = false; }
      const stageChanged = existing.stage !== stage;
      existing.title = title;
      existing.customerId = $('#f_cust').value;
      existing.value = val;
      existing.owner = $('#f_downer').value;
      existing.close = $('#f_close').value;
      existing.lostReason = $('#f_reason').value.trim();
      if (stageChanged) applyStage(existing, stage);
      else if (stage === 'won') {
        const c = customerById(existing.customerId);
        if (c) { c.value += val; existing.counted = true; }
      }
      toast('העסקה עודכנה');
    } else {
      const d = {
        id: uid('d'), title: title, customerId: $('#f_cust').value, value: val,
        stage: 'new', owner: $('#f_downer').value, close: $('#f_close').value,
        created: dayOffset(0), counted: false, lostReason: $('#f_reason').value.trim()
      };
      state.deals.unshift(d);
      logActivity(d.customerId, 'עסקה', 'נפתחה עסקה חדשה: ' + d.title + ' (' + money(d.value) + ').', d.owner);
      if (stage !== 'new') applyStage(d, stage);
      toast('העסקה נוצרה');
    }
    save();
    return true;
  }
  function editDeal(id) {
    const d = dealById(id);
    if (!d) return;
    modal('עריכת עסקה', dealForm(d), () => {
      if (!saveDeal(d)) return false;
      refreshAll(); refreshDrawer();
    }, 'שמירה', '<button class="btn danger" data-deldeal="' + d.id + '" style="margin-inline-start:auto">מחיקת עסקה</button>');
  }
  function deleteDeal(id) {
    const d = dealById(id);
    if (!d) return;
    if (!confirm('למחוק את העסקה ״' + d.title + '״?')) return;
    const c = customerById(d.customerId);
    if (d.counted && c) c.value = Math.max(0, c.value - d.value);
    state.deals = state.deals.filter(x => x.id !== id);
    save(); closeModal(); refreshAll(); refreshDrawer();
    toast('העסקה נמחקה');
  }

  /* --- טופס משימה --- */
  function taskForm(t, preCust) {
    t = t || {};
    return '<div class="form-grid">' +
      '<label class="full">תיאור המשימה<input class="input" id="f_ttitle" value="' + esc(t.title || '') + '" placeholder="לדוגמה: שיחת מעקב לאחר ההצעה"></label>' +
      '<label>לקוח<select class="input" id="f_tcust">' + custOpts(t.customerId || preCust) + '</select></label>' +
      '<label>סוג<select class="input" id="f_ttype">' + opts(['שיחה', 'פגישה', 'מייל', 'משימה'], t.type) + '</select></label>' +
      '<label>עדיפות<select class="input" id="f_tprio">' + opts(['רגילה', 'גבוהה', 'נמוכה'], t.priority) + '</select></label>' +
      '<label>תאריך יעד<input class="input" id="f_tdue" type="date" value="' + (t.due || dayOffset(2)) + '"></label>' +
      '<label class="full">אחראי<select class="input" id="f_towner">' + opts(ownerNames(), t.owner) + '</select></label>' +
      '</div>';
  }
  function saveTask(existing) {
    const title = $('#f_ttitle').value.trim();
    if (!title) { toast('נא למלא תיאור למשימה'); return false; }
    const data = {
      title: title, customerId: $('#f_tcust').value, type: $('#f_ttype').value,
      priority: $('#f_tprio').value, due: $('#f_tdue').value, owner: $('#f_towner').value
    };
    if (existing) { Object.assign(existing, data); toast('המשימה עודכנה'); }
    else { state.tasks.unshift(Object.assign({ id: uid('t'), done: false }, data)); toast('המשימה נוצרה'); }
    save();
    return true;
  }
  function editTask(id) {
    const t = taskById(id);
    if (!t) return;
    modal('עריכת משימה', taskForm(t), () => {
      if (!saveTask(t)) return false;
      refreshAll(); refreshDrawer();
    }, 'שמירה', '<button class="btn danger" data-deltask="' + t.id + '" style="margin-inline-start:auto">מחיקה</button>');
  }

  /* --- טופס פעילות --- */
  function activityForm(a) {
    a = a || {};
    return '<div class="form-grid">' +
      '<label>לקוח<select class="input" id="f_acust">' + custOpts(a.customerId) + '</select></label>' +
      '<label>סוג פעילות<select class="input" id="f_atype">' + opts(ACTIVITY_TYPES, a.type) + '</select></label>' +
      '<label>תאריך<input class="input" id="f_adate" type="date" value="' + (a.date || dayOffset(0)) + '"></label>' +
      '<label>בוצע על ידי<select class="input" id="f_aby">' + opts(ownerNames(), a.by) + '</select></label>' +
      '<label class="full">תיאור<textarea class="input" id="f_atext" rows="3" placeholder="מה קרה בשיחה / בפגישה?">' + esc(a.text || '') + '</textarea></label>' +
      '</div>';
  }
  function saveActivity(existing) {
    const text = $('#f_atext').value.trim();
    if (!text) { toast('נא למלא תיאור לפעילות'); return false; }
    if (!$('#f_acust').value) { toast('נא ליצור לקוח קודם'); return false; }
    const data = {
      customerId: $('#f_acust').value, type: $('#f_atype').value,
      date: $('#f_adate').value, by: $('#f_aby').value, text: text
    };
    if (existing) { Object.assign(existing, data); toast('הפעילות עודכנה'); }
    else {
      state.activities.unshift(Object.assign({ id: uid('a') }, data));
      const c = customerById(data.customerId);
      if (c && data.date > (c.lastContact || '')) c.lastContact = data.date;
      toast('הפעילות תועדה');
    }
    save();
    return true;
  }

  /* --- טופס נציג --- */
  function ownerForm(o) {
    o = o || {};
    return '<div class="form-grid">' +
      '<label>שם הנציג<input class="input" id="f_oname" value="' + esc(o.name || '') + '"></label>' +
      '<label>תפקיד<input class="input" id="f_orole" value="' + esc(o.role || 'נציג מכירות') + '"></label>' +
      '<label class="full">צבע מזהה<input class="input" id="f_ocolor" type="color" value="' + (o.color || '#6366f1') + '"></label>' +
      '</div>';
  }

  /* ---------- חיפוש גלובלי ---------- */
  function globalSearch(q) {
    q = q.trim().toLowerCase();
    const box = $('#searchResults');
    if (q.length < 2) { box.hidden = true; return; }
    const cust = state.customers.filter(c => (c.name + c.company + c.email + c.city).toLowerCase().includes(q)).slice(0, 5);
    const dl = state.deals.filter(d => d.title.toLowerCase().includes(q)).slice(0, 4);
    const tk = state.tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 4);

    let html = '';
    if (cust.length) html += '<div class="group">לקוחות</div>' + cust.map(c =>
      '<div class="res" data-cust="' + c.id + '">' + avatar(c.name, 'sm') + '<div><strong>' + esc(c.name) + '</strong> <span class="muted">' + esc(c.company) + '</span></div><small>' + esc(c.city) + '</small></div>').join('');
    if (dl.length) html += '<div class="group">עסקאות</div>' + dl.map(d =>
      '<div class="res" data-deal="' + d.id + '"><span class="stage-dot" style="background:' + stageById(d.stage).color + '"></span>' + esc(d.title) + '<small>' + money(d.value) + '</small></div>').join('');
    if (tk.length) html += '<div class="group">משימות</div>' + tk.map(t =>
      '<div class="res" data-edittask="' + t.id + '">✓ ' + esc(t.title) + '<small>' + fdate(t.due) + '</small></div>').join('');
    if (!html) html = '<div class="group">לא נמצאו תוצאות עבור ״' + esc(q) + '״</div>';

    box.innerHTML = html;
    box.hidden = false;
  }

  /* ---------- CSV ---------- */
  const CSV_COLS = ['שם', 'חברה', 'טלפון', 'אימייל', 'עיר', 'תחום', 'סטטוס', 'מקור', 'אחראי', 'היקף עסקי', 'קשר אחרון'];
  function toCsv(rows) {
    return '﻿' + rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  }
  function parseCsv(text) {
    text = text.replace(/^﻿/, '');
    const rows = []; let row = [], field = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') inQ = false;
        else field += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch !== '\r') field += ch;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(v => v.trim() !== ''));
  }
  function exportCsv() {
    const rows = filteredCustomers().map(c =>
      [c.name, c.company, c.phone, c.email, c.city, c.industry, c.status, c.source, c.owner, c.value, c.lastContact]);
    downloadFile('customers.csv', toCsv([CSV_COLS].concat(rows)), 'text/csv;charset=utf-8');
    toast('יוצאו ' + rows.length + ' לקוחות');
  }
  function importCsvText(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) { toast('הקובץ ריק או לא תקין'); return; }
    const head = rows[0].map(h => h.trim());
    const idx = n => head.indexOf(n);
    let added = 0;
    rows.slice(1).forEach(r => {
      const get = (n, pos) => { const i = idx(n); return (i > -1 ? r[i] : r[pos]) || ''; };
      const name = get('שם', 0).trim();
      if (!name) return;
      state.customers.unshift({
        id: uid('c'), name: name,
        company: get('חברה', 1).trim() || name,
        phone: get('טלפון', 2).trim(),
        email: get('אימייל', 3).trim(),
        city: get('עיר', 4).trim(),
        industry: get('תחום', 5).trim() || 'כללי',
        status: get('סטטוס', 6).trim() || 'לקוח פוטנציאלי',
        source: get('מקור', 7).trim() || SOURCES[0],
        owner: get('אחראי', 8).trim() || ownerNames()[0],
        value: Number(String(get('היקף עסקי', 9)).replace(/[^\d.-]/g, '')) || 0,
        lastContact: (get('קשר אחרון', 10) || dayOffset(0)).trim(),
        created: dayOffset(0), tags: []
      });
      added++;
    });
    save(); refreshAll();
    toast('יובאו ' + added + ' לקוחות');
  }
  function exportReport() {
    const rows = ownerStats().map(r => [r.o.name, r.o.role, r.custs, r.won, r.lost, r.wonSum, r.open, r.openSum, r.tasks, r.rate + '%']);
    downloadFile('sales-report.csv',
      toCsv([['נציג', 'תפקיד', 'לקוחות', 'נסגרו בהצלחה', 'נסגרו בהפסד', 'הכנסות', 'עסקאות פתוחות', 'שווי צנרת', 'משימות פתוחות', 'אחוז סגירה']].concat(rows)),
      'text/csv;charset=utf-8');
    toast('דוח המכירות יוצא');
  }

  /* ---------- בוחר קבצים ---------- */
  let pickMode = null;
  function pickFile(mode, accept) {
    pickMode = mode;
    const f = $('#filePicker');
    f.accept = accept; f.value = '';
    f.click();
  }
  $('#filePicker').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      const text = String(rd.result);
      if (pickMode === 'csv') importCsvText(text);
      if (pickMode === 'backup') {
        try {
          const data = JSON.parse(text);
          if (!data.customers) throw new Error('bad');
          state = migrate(data); save(); applyBranding(); refreshAll(); go('dashboard');
          toast('הגיבוי שוחזר בהצלחה');
        } catch (err) { toast('קובץ הגיבוי אינו תקין'); }
      }
    };
    rd.readAsText(file, 'utf-8');
  });

  /* ---------- תגי ניווט ---------- */
  function refreshBadges() {
    $('#navCustomers').textContent = state.customers.length;
    const badge = $('#navTasks');
    badge.textContent = openTasks().length;
    badge.classList.toggle('alert', lateTasks().length > 0);
  }

  /* ---------- אירועים ---------- */
  document.addEventListener('click', e => {
    const t = e.target;
    if (t.tagName === 'A' && t.href) return; // קישורי טלפון/מייל
    const closest = s => t.closest(s);

    const nav = closest('.nav-item');
    if (nav) return go(nav.dataset.view);
    const goto = closest('[data-goto]');
    if (goto) return go(goto.dataset.goto);

    if (closest('[data-close]') || t.id === 'overlay') return closeDrawer();

    /* --- עסקאות --- */
    const dd = closest('[data-deldeal]');
    if (dd) return deleteDeal(dd.dataset.deldeal);
    const cust = closest('[data-cust]');
    if (cust) { $('#searchResults').hidden = true; return openCustomer(cust.dataset.cust); }
    const dealEl = closest('[data-deal]');
    if (dealEl) { $('#searchResults').hidden = true; return editDeal(dealEl.dataset.deal); }

    const row = closest('tr[data-id]');
    if (row) return openCustomer(row.dataset.id);

    /* --- משימות --- */
    const tg = closest('[data-toggle]');
    if (tg) {
      const task = taskById(tg.dataset.toggle);
      task.done = !task.done;
      if (task.done) logActivity(task.customerId, 'הערה', 'הושלמה המשימה: ' + task.title, task.owner);
      save(); refreshAll(); refreshDrawer();
      return;
    }
    const et = closest('[data-edittask]');
    if (et) { $('#searchResults').hidden = true; return editTask(et.dataset.edittask); }
    const dt = closest('[data-deltask]');
    if (dt) {
      state.tasks = state.tasks.filter(x => x.id !== dt.dataset.deltask);
      save(); closeModal(); refreshAll(); refreshDrawer();
      return toast('המשימה נמחקה');
    }

    /* --- פעילות --- */
    const ea = closest('[data-editact]');
    if (ea) {
      const a = state.activities.find(x => x.id === ea.dataset.editact);
      return modal('עריכת פעילות', activityForm(a), () => {
        if (!saveActivity(a)) return false;
        refreshAll(); refreshDrawer();
      });
    }
    const da = closest('[data-delact]');
    if (da) {
      state.activities = state.activities.filter(x => x.id !== da.dataset.delact);
      save(); refreshAll(); refreshDrawer();
      return toast('הרשומה נמחקה');
    }

    /* --- מגירת לקוח --- */
    const ed = closest('[data-edit]');
    if (ed) {
      const c = customerById(ed.dataset.edit);
      return modal('עריכת כרטיס לקוח', customerForm(c), () => {
        if (!saveCustomer(c)) return false;
        refreshAll(); refreshDrawer();
      });
    }
    const nd = closest('[data-newdeal]');
    if (nd) return modal('עסקה חדשה', dealForm(null, nd.dataset.newdeal), () => {
      if (!saveDeal(null)) return false;
      refreshAll(); refreshDrawer();
    }, 'יצירת עסקה');
    const nt = closest('[data-newtask]');
    if (nt) return modal('משימה חדשה', taskForm(null, nt.dataset.newtask), () => {
      if (!saveTask(null)) return false;
      refreshAll(); refreshDrawer();
    }, 'יצירת משימה');

    const dl = closest('[data-del]');
    if (dl) {
      const c = customerById(dl.dataset.del);
      if (!confirm('למחוק את הלקוח ״' + c.name + '״ ואת כל העסקאות, המשימות והפעילות המשויכות אליו?')) return;
      state.customers = state.customers.filter(x => x.id !== c.id);
      state.deals = state.deals.filter(d => d.customerId !== c.id);
      state.tasks = state.tasks.filter(x => x.customerId !== c.id);
      state.activities = state.activities.filter(a => a.customerId !== c.id);
      save(); closeDrawer(); refreshAll();
      return toast('הלקוח נמחק');
    }

    const an = closest('[data-addnote]');
    if (an) {
      const val = $('#noteInput').value.trim();
      if (!val) return;
      const c = customerById(an.dataset.addnote);
      logActivity(c.id, 'הערה', val, state.settings.contact);
      c.lastContact = dayOffset(0);
      save(); refreshDrawer(); refreshAll();
      return toast('ההערה נוספה');
    }

    /* --- צוות --- */
    const eo = closest('[data-editowner]');
    if (eo) {
      const i = Number(eo.dataset.editowner), o = owners()[i], old = o.name;
      return modal('עריכת נציג', ownerForm(o), () => {
        const nm = $('#f_oname').value.trim();
        if (!nm) { toast('נא למלא שם'); return false; }
        o.name = nm; o.role = $('#f_orole').value.trim(); o.color = $('#f_ocolor').value;
        if (nm !== old) {
          state.customers.forEach(c => { if (c.owner === old) c.owner = nm; });
          state.deals.forEach(d => { if (d.owner === old) d.owner = nm; });
          state.tasks.forEach(x => { if (x.owner === old) x.owner = nm; });
          if (state.settings.contact === old) state.settings.contact = nm;
        }
        save(); applyBranding(); refreshAll();
        toast('פרטי הנציג עודכנו');
      });
    }
    const dow = closest('[data-delowner]');
    if (dow) {
      const i = Number(dow.dataset.delowner), o = owners()[i];
      if (owners().length < 2) return toast('חייב להישאר לפחות נציג אחד');
      if (!confirm('למחוק את ' + o.name + '? הרשומות שלו יועברו לנציג הראשון ברשימה.')) return;
      state.owners.splice(i, 1);
      const to = ownerNames()[0];
      state.customers.forEach(c => { if (c.owner === o.name) c.owner = to; });
      state.deals.forEach(d => { if (d.owner === o.name) d.owner = to; });
      state.tasks.forEach(x => { if (x.owner === o.name) x.owner = to; });
      if (state.settings.contact === o.name) state.settings.contact = to;
      save(); applyBranding(); refreshAll();
      return toast('הנציג נמחק');
    }
    if (t.id === 'addOwner') {
      return modal('הוספת נציג', ownerForm(), () => {
        const nm = $('#f_oname').value.trim();
        if (!nm) { toast('נא למלא שם'); return false; }
        state.owners.push({ name: nm, role: $('#f_orole').value.trim() || 'נציג מכירות', color: $('#f_ocolor').value });
        save(); refreshAll();
        toast('הנציג נוסף');
      }, 'הוספה');
    }

    /* --- מודאל --- */
    if (closest('[data-mclose]') || t.id === 'modalBackdrop') return closeModal();
    if (closest('[data-msave]')) {
      const fn = $('#modal')._save;
      if (fn && fn() === false) return;
      return closeModal();
    }

    /* --- כפתורים ראשיים --- */
    if (t.id === 'quickAdd' || t.id === 'addCustomer') {
      return modal('לקוח חדש', customerForm(), () => {
        if (!saveCustomer(null)) return false;
        go('customers'); refreshBadges(); refreshSelects();
      }, 'הוספת לקוח');
    }
    if (t.id === 'addDeal') return modal('עסקה חדשה', dealForm(), () => {
      if (!saveDeal(null)) return false;
      go('pipeline'); refreshBadges();
    }, 'יצירת עסקה');
    if (t.id === 'addTask') return modal('משימה חדשה', taskForm(), () => {
      if (!saveTask(null)) return false;
      go('tasks'); refreshBadges();
    }, 'יצירת משימה');
    if (t.id === 'addActivity') return modal('תיעוד פעילות', activityForm(), () => {
      if (!saveActivity(null)) return false;
      go('activity'); refreshBadges();
    }, 'שמירה');

    if (t.id === 'exportCsv')   return exportCsv();
    if (t.id === 'importCsv')   return pickFile('csv', '.csv');
    if (t.id === 'exportReport') return exportReport();
    if (t.id === 'printReport') { go('reports'); return setTimeout(() => window.print(), 120); }
    if (t.id === 'backupExport') {
      downloadFile('activecrm-backup.json', JSON.stringify(state, null, 2), 'application/json');
      return toast('הגיבוי הורד');
    }
    if (t.id === 'backupImport') return pickFile('backup', '.json');
    if (t.id === 'menuBtn') return $('#sidebar').classList.toggle('open');
    if (t.id === 'themeBtn') {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
      localStorage.setItem('activecrm.theme', dark ? 'light' : 'dark');
      return;
    }
    if (t.id === 'saveSettings') {
      state.settings = {
        biz: $('#setBiz').value.trim(), currency: $('#setCurrency').value,
        contact: $('#setContact').value.trim(), email: $('#setEmail').value.trim()
      };
      save(); applyBranding(); renderSettings();
      return toast('ההגדרות נשמרו');
    }
    if (t.id === 'saveRevenue') {
      const vals = $('#revInput').value.split(/[,\s]+/).map(Number).filter(v => !isNaN(v));
      if (vals.length !== 12) return toast('נא להזין בדיוק 12 מספרים');
      state.revenue = vals;
      save(); renderSettings();
      return toast('גרף ההכנסות עודכן');
    }
    if (t.id === 'resetDemo') {
      if (!confirm('לאפס את המערכת לנתוני הדוגמה המקוריים?')) return;
      state = migrate(buildDemoData()); save(); applyBranding(); refreshSelects(); refreshBadges(); go('dashboard');
      return toast('הנתונים אופסו');
    }
    if (t.id === 'clearAll') {
      if (!confirm('למחוק את כל הנתונים? המערכת תישאר ריקה.')) return;
      state = migrate({ customers: [], deals: [], tasks: [], activities: [], revenue: new Array(12).fill(0), owners: state.owners, settings: state.settings });
      save(); refreshSelects(); refreshBadges(); go('dashboard');
      return toast('כל הנתונים נמחקו');
    }

    const tf = closest('#taskFilter button');
    if (tf) {
      taskFilter = tf.dataset.f;
      $$('#taskFilter button').forEach(b => b.classList.toggle('active', b === tf));
      return renderTasks();
    }

    const bar = closest('[data-id-cust]');
    if (bar) return openCustomer(bar.dataset.idCust);

    if (!closest('.search-wrap')) $('#searchResults').hidden = true;
  });

  /* מסננים */
  const RERENDER = {
    custSearch: renderCustomers, filterStatus: renderCustomers, filterOwner: renderCustomers, sortBy: renderCustomers,
    pipeOwner: renderBoard, taskOwner: renderTasks,
    actType: renderTimeline, actCustomer: renderTimeline, actRange: renderTimeline
  };
  ['input', 'change'].forEach(evt => {
    document.addEventListener(evt, e => {
      const fn = RERENDER[e.target.id];
      if (fn) fn();
    });
  });

  $('#globalSearch').addEventListener('input', e => globalSearch(e.target.value));
  $('#globalSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = $('#searchResults .res');
      if (first) first.click();
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeDrawer(); $('#searchResults').hidden = true; }
    if (e.key === 'Enter' && !$('#modalBackdrop').hidden && e.target.tagName === 'INPUT') {
      const b = $('[data-msave]'); if (b) b.click();
    }
    if (e.key === '/' && ['INPUT', 'SELECT', 'TEXTAREA'].indexOf(e.target.tagName) < 0) {
      e.preventDefault(); $('#globalSearch').focus();
    }
  });

  /* ---------- אתחול ---------- */
  const savedTheme = localStorage.getItem('activecrm.theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  applyBranding();
  refreshSelects();
  refreshBadges();
  renderDashboard();
})();
