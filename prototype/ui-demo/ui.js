/* ui.js — khung app: thanh demo, sidebar, thanh trên, thanh dưới, hộp thoại, thông báo, tìm nhanh */
'use strict';
const VIEWS = {}; // id → { title, icon, show(), render() }
const ACT = {};   // data-act → handler(dataset, el, event)
const CHG = {};   // data-chg → handler(el)
const INP = {};   // data-in  → handler(el)
const FORM = {};  // data-form → handler(form)

function toast(msg, kind = '') {
  const el = document.createElement('div'); el.className = 'toast ' + kind; el.innerHTML = (kind === 'alert' ? ic('alert') : ic('check')) + '<span>' + esc(msg) + '</span>';
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3600);
}
function openDialog(html, cls = '') {
  const drawer = cls.includes('drawer');
  $('#overlay').innerHTML = `<div class="scrim ${drawer ? 'drawer-s' : ''}" data-act="scrim"><div class="dialog ${cls}" role="dialog" aria-modal="true">${html}</div></div>`;
  const f = $('#overlay [autofocus]') || $('#overlay .dialog'); if (f) { f.setAttribute('tabindex', f.getAttribute('tabindex') || '-1'); f.focus(); }
}
function closeDialog() { $('#overlay').innerHTML = ''; }
const dlgHead = (title, sub = '') => `<div class="dlg-h"><div><h3>${title}</h3>${sub ? `<div class="hint">${sub}</div>` : ''}</div><button class="iconbtn" data-act="close" aria-label="Đóng">${ic('x')}</button></div>`;
function confirmDialog({ title, body, ok = 'Đồng ý', danger = false, onOk }) {
  ACT._confirmOk = () => { closeDialog(); onOk(); };
  openDialog(`${dlgHead(title)}<div class="dlg-b">${body}</div><div class="dlg-f"><button class="btn" data-act="close">Bỏ qua</button><button class="btn ${danger ? 'danger solid' : 'primary'}" data-act="_confirmOk" autofocus>${ok}</button></div>`);
}
function needNet(what) { if (S.online) return true; toast('Không có mạng — ' + what + ' cần mạng. Bật lại mạng ở thanh demo.', 'alert'); return false; }
async function copyText(t) { try { await navigator.clipboard.writeText(t); toast('Đã chép'); } catch (e) { toast('Máy không cho chép tự động — bôi đen để chép tay', 'alert'); } }

function go(route, params = {}) {
  S.route = route; S.params = params; S.menu = false; closeDialog();
  if (route === 'create') S.draft = params.keepDraft ? S.draft : newDraft(params.kind || 'purchase', params.orderId, params.edit, params.gross);
  try { history.replaceState(null, '', '#' + route); } catch (e) { /* sandbox */ }
  render(); window.scrollTo(0, 0);
}
const homeRoute = () => ({ farmer: 'fhome', admin: 'aops' })[TYPE()] || 'dashboard';

const NAV = {
  book: [['Hằng ngày', ['dashboard', 'receipts', 'debts', 'orders']], ['Đối tác', ['suppliers', 'buyers', 'links']], ['Hàng hoá & Kho', ['products', 'inventory', 'pricing']], ['Báo cáo', ['reports', 'utilities']], ['Tổ chức', ['staff', 'branches']], ['Tài khoản', ['account', 'plans', 'import']]],
  farmer: [['Việc của tôi', ['fhome', 'fneworder', 'orders', 'fowed', 'flinks']], ['Tài khoản', ['account']]],
  admin: [['Vận hành', ['aops', 'abilling', 'alog']]],
};
const navKind = () => (isBook() ? 'book' : TYPE());
const visible = (id) => VIEWS[id] && VIEWS[id].show();
const vtitle = (id) => (typeof VIEWS[id].title === 'function' ? VIEWS[id].title() : VIEWS[id].title);
function badgeFor(id) {
  if (id === 'receipts') return myReceipts().filter((r) => r.status !== 'done').length;
  if (id === 'debts') return overdueCount();
  if (id === 'orders') return incomingOpen();
  if (id === 'abilling') return S.admin.intents.filter((x) => x.status === 'pending').length;
  return 0;
}

function demoBar() {
  const opts = Object.entries(PERSONAS).map(([k, v]) => `<option value="${k}" ${k === S.persona ? 'selected' : ''}>${esc(v.label)}</option>`).join('');
  const tier = TYPE() === 'trader' ? `<label>Gói của vựa <select data-chg="tier">${[['trial', 'Dùng thử'], ['premium', 'Premium'], ['grace', 'Quá hạn (ân hạn)'], ['free', 'Hết gói']].map(([v, l]) => `<option value="${v}" ${S.billing['o-hung'].tier === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : '';
  return `<div class="demobar" role="region" aria-label="Điều khiển bản demo"><span class="dtag">BẢN DEMO</span>
  <label for="persona">Xem với vai</label><select id="persona" data-chg="persona">${opts}</select>${tier}
  <button class="dbtn ${S.online ? '' : 'off'}" data-act="toggleNet"><span class="dot"></span>${S.online ? 'Có mạng' : 'Mất mạng'}</button>
  <span class="dspacer"></span><button class="dbtn" data-act="matrix">${ic('shield', 14)}Ma trận quyền</button><button class="dbtn" data-act="reset">Làm lại dữ liệu</button></div>`;
}
function sidebar() {
  const groups = NAV[navKind()].map(([g, ids]) => {
    const items = ids.filter(visible); if (!items.length) return '';
    return `<div class="navg"><span>${g}</span>${items.map((id) => { const b = badgeFor(id); return `<button class="navi" data-act="go" data-r="${id}" ${S.route === id || (S.route === 'receipt' && id === 'receipts') ? 'aria-current="page"' : ''}>${ic(VIEWS[id].icon)}<span>${vtitle(id)}</span>${b ? `<span class="cnt">${b}</span>` : ''}</button>`; }).join('')}</div>`;
  }).join('');
  const o = ORG();
  const org = o ? `<div class="orgcard"><b>${esc(o.name)}</b><div class="meta"><span class="pill plain">${TYPE_LABEL[o.type]}</span><span>${ROLE_LABEL(o.type, P().role)}${P().branch ? ' · ' + esc(branchName(P().branch)) : ''}</span></div></div>`
    : `<div class="orgcard"><b>Bảng vận hành</b><div class="meta"><span class="pill alert plain">Nội bộ</span><span>Mọi lần mở sổ khách đều ghi nhật ký</span></div></div>`;
  return `<aside class="side"><div class="brand"><div class="mark">${ic('scale', 20)}</div><div class="word">THUMUA365<small>Sổ thu mua nông sản</small></div></div>${org}${groups}<div class="side-foot">API v1 · staging · gói <span class="mono">@mambo/sdk 0.6.0</span></div></aside>`;
}
function syncPill() {
  const n = S.queue.filter((q) => q.org === P().org).length;
  if (!isBook()) return S.online ? '' : `<span class="syncpill off">${ic('cloudoff', 15)}<span class="lbl">Không có mạng</span></span>`;
  if (!S.online) return `<button class="syncpill off" data-act="syncInfo">${ic('cloudoff', 15)}<span class="lbl">Không có mạng${n ? ' · ' + n + ' chờ gửi' : ''}</span></button>`;
  if (n) return `<button class="syncpill pending" data-act="syncInfo"><span class="spin"></span><span class="lbl">Đang gửi ${n} thao tác</span></button>`;
  return `<button class="syncpill" data-act="syncInfo">${ic('cloud', 15)}<span class="lbl">Đã lưu lên mạng</span></button>`;
}
function topbar() {
  const unread = myNotifs().filter((n) => !n.read).length;
  const modeIc = { auto: 'monitor', day: 'sun', sun: 'sun', night: 'moon' }[S.mode];
  const sub = ORG() ? esc(ORG().name) + ' · ' + ROLE_LABEL(TYPE(), P().role) : 'Nhóm vận hành';
  const back = S.route === 'receipt' ? `<button class="iconbtn" data-act="go" data-r="receipts" aria-label="Về danh sách phiếu">${ic('back')}</button>` : '';
  const menu = S.menu ? `<div class="menu"><div class="who"><b>${esc(P().full)}</b><div class="hint">${P().phone ? esc(P().phone) + ' · ' : ''}${sub}</div></div>
    ${ORG() ? `<button class="navi" data-act="go" data-r="account">${ic('user')}Tài khoản</button>` : ''}
    <button class="navi" data-act="cycleMode">${ic(modeIc)}Chế độ xem: ${{ auto: 'Theo máy', day: 'Trong nhà', sun: 'Ngoài nắng', night: 'Ban đêm' }[S.mode]}</button>
    <button class="navi" data-act="logout">${ic('logout')}Đăng xuất</button></div>` : '';
  return `<header class="top">${back}<div class="ttl"><h1>${vtitle(S.route)}</h1><div class="sub">${sub}</div></div>
   <button class="searchbtn" data-act="palette" aria-label="Tìm nhanh">${ic('search', 16)}<span>Tìm phiếu, người bán, lệnh…</span><kbd>Ctrl K</kbd></button>
   ${syncPill()}
   <button class="iconbtn" data-act="cycleMode" aria-label="Đổi chế độ xem" title="Đổi chế độ xem">${ic(modeIc)}</button>
   ${ORG() ? `<button class="iconbtn" data-act="notifs" aria-label="Thông báo">${ic('bell')}${unread ? `<span class="badge">${unread}</span>` : ''}</button>` : ''}
   <button class="avatar" data-act="menu" aria-label="Tài khoản">${esc(P().name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase())}</button>${menu}</header>`;
}
function bottomBar() {
  const k = navKind();
  const items = k === 'book' ? ['dashboard', 'receipts', 'FAB', 'debts', 'more'] : k === 'farmer' ? ['fhome', 'orders', 'FAB', 'fowed', 'more'] : ['aops', 'abilling', 'alog'];
  const fabOk = k === 'book' ? can('receipt:create') : k === 'farmer';
  return `<nav class="bottombar" style="grid-template-columns:repeat(${items.length},1fr)" aria-label="Điều hướng chính">${items.map((id) => {
    if (id === 'FAB') return fabOk ? `<button class="fab" data-act="go" data-r="${k === 'book' ? 'create' : 'fneworder'}" aria-label="${k === 'book' ? 'Tạo phiếu' : 'Tạo đơn bán'}">${ic('plus', 24)}</button>` : '<span></span>';
    const b = badgeFor(id); const cur = S.route === id || (id === 'more' && !items.includes(S.route));
    return `<button class="bb" data-act="go" data-r="${id}" ${cur ? 'aria-current="page"' : ''}>${b ? `<span class="cnt">${b}</span>` : ''}${ic(VIEWS[id].icon, 22)}<span>${VIEWS[id].short || vtitle(id)}</span></button>`;
  }).join('')}</nav>`;
}
function banners() {
  const out = [];
  if (!S.online && isBook()) out.push(`<div class="banner alert">${ic('cloudoff')}<div class="grow"><b>Đang làm việc không có mạng.</b> Phiếu vẫn ghi bình thường, có mạng lại sẽ tự gửi đi. Đơn, kết nối và gói cần mạng.</div></div>`);
  const b = S.billing[P().org];
  if (b && can('billing:manage') && S.route !== 'plans') {
    if (b.tier === 'trial') { const d = Math.max(0, Math.ceil((b.trialEnds - Date.now()) / DAY)); out.push(`<div class="banner info">${ic('gift')}<div class="grow"><b>Đang dùng thử — còn ${d} ngày.</b> Hết thử vẫn xem và lưu sổ ra file được.</div><button class="btn sm" data-act="go" data-r="plans">Xem gói</button></div>`); }
    if (b.tier === 'grace') out.push(`<div class="banner warn">${ic('alert')}<div class="grow"><b>Gói hết hạn 3 ngày trước.</b> Còn 4 ngày ân hạn, sau đó tạm khoá ghi phiếu mới.</div><button class="btn sm primary" data-act="go" data-r="plans">Gia hạn</button></div>`);
    if (b.tier === 'free') out.push(`<div class="banner alert">${ic('lock')}<div class="grow"><b>Hết gói.</b> Vẫn xem và lưu sổ ra file. Đơn và kết nối vẫn miễn phí. Tạm khoá ghi phiếu mới.</div><button class="btn sm primary" data-act="go" data-r="plans">Gia hạn 149.000đ/tháng</button></div>`);
  }
  if (S.billing[P().org] && S.billing[P().org].tier === 'free' && !can('billing:manage')) out.push(`<div class="banner alert">${ic('lock')}<div class="grow"><b>Vựa đã hết gói.</b> Báo chủ vựa gia hạn để ghi phiếu tiếp.</div></div>`);
  return out.join('');
}

function render() {
  const app = $('#app');
  if (S.mode === 'auto') app.removeAttribute('data-mode'); else app.setAttribute('data-mode', S.mode);
  if (S.screen !== 'app') { $('#root').innerHTML = demoBar() + authScreen(); return; }
  if (!S.route || !visible(S.route)) S.route = homeRoute();
  $('#root').innerHTML = demoBar() + `<div class="shell">${sidebar()}<div class="main">${topbar()}<main class="content" id="view">${banners()}${VIEWS[S.route].render()}<p class="foot-note">Bản demo · dữ liệu mẫu, không phải số liệu thật · mọi thao tác chỉ chạy trong trình duyệt này</p></main></div></div>${bottomBar()}`;
  if (VIEWS[S.route].after) VIEWS[S.route].after();
}

/* ─── Hộp thoại dùng chung ─── */
ACT.matrix = () => {
  const cols = [['farmer', 'owner', 'Nông dân'], ['trader', 'owner', 'Vựa · chủ'], ['trader', 'staff', 'Vựa · người cân'], ['enterprise', 'owner', 'DN · chủ'], ['enterprise', 'manager', 'DN · quản lý'], ['enterprise', 'staff', 'DN · nhân viên']];
  const meIdx = cols.findIndex(([t, r]) => t === TYPE() && r === P().role);
  openDialog(`${dlgHead('Ma trận quyền', 'Bảng gốc PERMISSIONS_BY trong @mambo/contracts — app ẩn/hiện theo đây, server luôn kiểm lại')}<div class="dlg-b"><div class="table-wrap"><table class="t matrix"><thead><tr><th>Quyền</th>${cols.map((c, i) => `<th class="${i === meIdx ? 'me' : ''}">${c[2]}</th>`).join('')}</tr></thead><tbody>${PERM_LIST.map(([p, l]) => `<tr><td><div class="cellname">${l}<small class="mono">${p}</small></div></td>${cols.map(([t, r], i) => `<td class="${i === meIdx ? 'me' : ''}">${permsFor(t, r).has(p) ? '<span class="yes">✓</span>' : '<span class="no">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="hint">Cột tô màu là vai đang xem. Vựa không có vai quản lý; nông dân chỉ có chủ.</p></div>`, 'wide');
};
ACT.syncInfo = () => {
  const q = S.queue.filter((x) => x.org === P().org);
  openDialog(`${dlgHead('Đồng bộ sổ', 'Ghi trên máy trước, đẩy lên qua /v1/sync/push, kéo về bằng cursor do server cấp')}<div class="dlg-b">
  <dl class="kv"><dt>Mạng</dt><dd>${S.online ? 'Có mạng' : 'Không có mạng'}</dd><dt>Thao tác chờ gửi</dt><dd>${q.length}</dd><dt>Lần kéo về gần nhất</dt><dd>${fmtDate(Date.now() - 4 * 6e4)}</dd><dt>Mã máy</dt><dd class="mono">dev-${hashStr(S.persona).toString(36).slice(0, 6)}</dd></dl>
  ${q.length ? `<div class="card"><div class="card-b tight"><table class="t"><tbody>${q.map((x) => `<tr><td>${esc(x.label)}</td><td class="num muted">${fmtTime(x.at)}</td></tr>`).join('')}</tbody></table></div></div>` : '<p class="hint">Sổ trên máy đã khớp với máy chủ.</p>'}
  <p class="hint">Gửi lại một lô không sinh phiếu trùng; xoá thắng sửa; lần trả không bao giờ mồ côi khỏi phiếu.</p></div>
  <div class="dlg-f"><button class="btn" data-act="close">Đóng</button>${S.online && q.length ? '<button class="btn primary" data-act="flushNow">Gửi ngay</button>' : ''}</div>`);
};
ACT.flushNow = () => { closeDialog(); scheduleFlush(); };

function notifText(n) {
  const f = ORGS[n.from] ? ORGS[n.from].name : ''; const o = n.orderId && S.orders.find((x) => x.id === n.orderId); const oc = o ? o.code : '';
  switch (n.kind) {
    case 'order.submitted': return [`${f} gửi đơn ${oc}`, o ? `${PRODUCTS[o.crop].short} khoảng ${num(o.qty)} kg` : '', 'order'];
    case 'order.accepted': return [`${f} đã nhận đơn ${oc}`, 'Chờ hẹn ngày đến cân', 'order'];
    case 'order.scheduled': return [`${f} hẹn đến cân — đơn ${oc}`, o && o.pickupAt ? fmtDate(o.pickupAt) + ' · ' + o.pickupAddress : '', 'calendar'];
    case 'order.cancelled': return [`${f} huỷ đơn ${oc}`, o ? (o.events[o.events.length - 1].note || '') : '', 'x'];
    case 'order.fulfilled': return [`Đơn ${oc} đã cân xong`, 'Phiếu đã lên sổ của ' + f, 'check'];
    case 'link.accepted': return [`${f} đã nhập mã kết nối`, 'Từ giờ bên đó xem được phiếu và công nợ của mình với họ', 'link'];
    case 'link.revoked': return [`${f} huỷ kết nối`, 'Không còn xem phiếu của nhau', 'link'];
    case 'plan.activated': return ['Gói Premium đã mở', n.text || '', 'card'];
    case 'member.added': return ['Thêm người vào tổ chức', n.text || '', 'team'];
    default: return null; // loại chưa biết vẽ thì bỏ qua
  }
}
ACT.notifs = () => {
  const list = myNotifs(); const rows = list.map((n) => { const t = notifText(n); if (!t) return ''; return `<button class="ntf ${n.read ? 'read' : ''}" data-act="openNotif" data-id="${n.id}"><span class="nd"></span><span class="ib">${ic(t[2])}</span><span style="flex:1;min-width:0"><b>${esc(t[0])}</b><br><span class="hint">${esc(t[1])}</span><br><small class="muted">${ago(n.at)}</small></span></button>`; }).join('');
  openDialog(`${dlgHead('Thông báo', 'Của cả tổ chức — mọi thành viên cùng thấy, cùng trạng thái đã đọc')}<div>${rows || '<div class="empty"><b>Chưa có thông báo</b></div>'}</div><div class="dlg-f"><button class="btn" data-act="readAll">Đánh dấu đã đọc hết</button></div>`, 'drawer');
};
ACT.openNotif = (d) => { const n = S.notifs.find((x) => x.id === d.id); n.read = true; closeDialog(); if (n.orderId) { go('orders'); openOrder(n.orderId); } else if (n.kind.startsWith('link')) go(TYPE() === 'farmer' ? 'flinks' : 'links'); else if (n.kind === 'plan.activated') go('plans'); else render(); };
ACT.readAll = () => { myNotifs().forEach((n) => (n.read = true)); closeDialog(); render(); toast('Đã đánh dấu đã đọc'); };

/* Tìm nhanh (Ctrl K) */
let palSel = 0;
function paletteItems(q) {
  const items = [];
  NAV[navKind()].forEach(([, ids]) => ids.filter(visible).forEach((id) => items.push({ g: 'Đi tới', label: vtitle(id), icon: VIEWS[id].icon, run: () => go(id) })));
  if (isBook() && can('receipt:create')) { items.push({ g: 'Lệnh', label: 'Tạo phiếu mua', icon: 'plus', run: () => go('create', { kind: 'purchase' }) }); items.push({ g: 'Lệnh', label: 'Tạo phiếu bán', icon: 'plus', run: () => go('create', { kind: 'sale' }) }); }
  if (TYPE() === 'farmer') items.push({ g: 'Lệnh', label: 'Tạo đơn bán', icon: 'plus', run: () => go('fneworder') });
  items.push({ g: 'Lệnh', label: 'Đổi chế độ xem', icon: 'sun', run: () => ACT.cycleMode() });
  if (isBook()) {
    Object.values(BOOK().partners).forEach((p) => items.push({ g: 'Đối tác', label: p.name, hint: p.phone, icon: p.kind === 'supplier' ? 'sprout' : 'truck', run: () => { go(p.kind === 'supplier' ? 'suppliers' : 'buyers'); openPartner(p.id); } }));
    myReceipts().slice(0, 60).forEach((r) => items.push({ g: 'Phiếu', label: r.code + ' · ' + pname(BOOK(), r.partnerId), hint: vnd(totalOf(r)), icon: 'receipt', run: () => go('receipt', { id: r.id }) }));
  }
  const s = q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const norm = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  return (s ? items.filter((i) => norm(i.label + ' ' + (i.hint || '')).includes(s)) : items.filter((i) => i.g !== 'Phiếu' && i.g !== 'Đối tác')).slice(0, 40);
}
let palList = [];
function drawPalette() {
  const q = $('#palq') ? $('#palq').value : ''; palList = paletteItems(q); palSel = Math.min(palSel, Math.max(0, palList.length - 1));
  let g = ''; $('#pall').innerHTML = palList.map((i, k) => { const h = i.g !== g ? `<div class="grp">${i.g}</div>` : ''; g = i.g; return h + `<button data-act="palRun" data-k="${k}" aria-selected="${k === palSel}">${ic(i.icon)}<span>${esc(i.label)}</span>${i.hint ? `<small>${esc(i.hint)}</small>` : ''}</button>`; }).join('') || '<div class="empty">Không thấy gì khớp</div>';
}
ACT.palette = () => { if (S.screen !== 'app') return; palSel = 0; openDialog(`<input id="palq" class="input" placeholder="Gõ tên người bán, mã phiếu, hoặc việc cần làm…" data-in="pal" autocomplete="off" autofocus><div class="pl" id="pall"></div>`, 'palette'); drawPalette(); };
INP.pal = () => { palSel = 0; drawPalette(); };
ACT.palRun = (d) => { const i = palList[+d.k]; closeDialog(); if (i) i.run(); };
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ACT.palette(); return; }
  if (e.key === 'Escape' && $('#overlay').innerHTML) { closeDialog(); return; }
  if ($('#pall')) { if (e.key === 'ArrowDown') { palSel = Math.min(palList.length - 1, palSel + 1); drawPalette(); e.preventDefault(); } if (e.key === 'ArrowUp') { palSel = Math.max(0, palSel - 1); drawPalette(); e.preventDefault(); } if (e.key === 'Enter') { e.preventDefault(); ACT.palRun({ k: palSel }); } }
});

/* Biểu đồ cột 7 ngày */
function niceMax(v) { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p; return 10 * p; }
function barChart(vals, labels, fmt) {
  const W = 640, H = 210, L = 46, R = 8, Tp = 22, B = 26, max = niceMax(Math.max(...vals)), iw = W - L - R, ih = H - Tp - B, bw = iw / vals.length;
  let g = ''; for (let i = 0; i <= 4; i++) { const v = (max / 4) * i, y = Tp + ih - (ih * v) / max; g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 8}" y="${y + 4}" text-anchor="end">${tr(v)}</text>`; }
  const bars = vals.map((v, i) => { const h = (ih * v) / max, x = L + i * bw + bw * 0.18, y = Tp + ih - h, last = i === vals.length - 1; return `<rect class="b ${last ? 'now' : ''}" x="${x}" y="${y}" width="${bw * 0.64}" height="${Math.max(h, v ? 2 : 0)}" rx="4"><title>${labels[i]}: ${fmt(v)}</title></rect><text x="${x + bw * 0.32}" y="${H - 8}" text-anchor="middle">${labels[i]}</text>${last && v ? `<text class="lbl-now" x="${x + bw * 0.32}" y="${y - 6}" text-anchor="middle">${tr(v)}</text>` : ''}`; }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Biểu đồ cột">${g}${bars}</svg>`;
}

/* Phiếu khổ 80mm — phần linked chỉ hiện trường in trên biên nhận */
function voucher(r, B, orgId, linked = false) {
  const o = ORGS[orgId]; const sale = r.kind === 'sale';
  const lines = r.lines.map((l) => `<div class="v-line"><span class="p">${esc(B.products[l.pid].name)}</span><span class="d">${lineDesc(l)}</span><div class="m"><span>${num(lineNet(l))} kg × ${vnd(parseNum(l.price))}</span><b>${vnd(lineAmt(l))}</b></div></div>`).join('');
  const adj = r.adj.map((a) => `<div class="v-sum"><span>${esc(a.label)}</span><span>${a.sign < 0 ? '−' : '+'}${vnd(parseNum(a.amount))}</span></div>`).join('');
  const pays = r.pays.map((p) => `<div class="v-sum ${p.voided ? 'muted' : ''}"><span>${p.voided ? '<s>' : ''}Đã trả ${fmtDay(p.at)}${p.voided ? '</s> (đã huỷ)' : ''}</span><span>${p.voided ? '<s>' : ''}${vnd(p.amount)}${p.voided ? '</s>' : ''}</span></div>`).join('');
  const d = debtOf(r);
  return `<div class="voucher"><div class="v-org">${esc(o.name)}</div><div class="v-addr">${esc(o.place)} · ${esc(o.phone)}</div><div class="v-title">${sale ? 'PHIẾU BÁN HÀNG' : 'PHIẾU THU MUA'}</div>
   <div class="v-meta"><span>Số <b class="mono">${r.code}</b></span><span>${fmtDay(r.at)} ${fmtTime(r.at)}</span></div>
   <div class="v-meta"><span>${sale ? 'Người mua' : 'Người bán'}: <b>${esc(pname(B, r.partnerId))}</b></span></div><hr class="v-hr">${lines}${adj ? '<hr class="v-hr">' + adj : ''}<hr class="v-hr">
   <div class="v-sum v-total"><span>Tổng phiếu</span><span>${vnd(totalOf(r))}</span></div><div class="v-words">${moneyWords(totalOf(r))}</div>${pays}
   <div class="v-sum" style="font-weight:800"><span>${d ? 'Còn nợ' : 'Đã trả đủ'}</span><span class="${d ? (sale ? 'amt-recv' : 'amt-pay') : ''}">${d ? vnd(d) : '✓'}</span></div>
   ${!linked && r.note ? `<div class="hint">Ghi chú nội bộ: ${esc(r.note)}</div>` : ''}<div class="v-thanks">${sale ? 'Cảm ơn quý khách' : 'Cảm ơn bà con đã bán hàng cho vựa'}</div></div>`;
}
const statusPill = (r) => r.pending ? '<span class="pill warn">Chưa gửi</span>' : debtOf(r) ? `<span class="pill ${r.kind === 'sale' ? 'info' : 'pay'}">Còn nợ</span>` : '<span class="pill ok">Đã trả đủ</span>';

/* Mã QR minh hoạ (không quét được) */
function drawQR(canvas, text) {
  const n = 29, c = canvas.getContext('2d'), s = 8; canvas.width = canvas.height = n * s; const rng = mulberry32(hashStr(text));
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, n * s, n * s); c.fillStyle = '#111111';
  const finder = (x, y) => { c.fillRect(x * s, y * s, 7 * s, 7 * s); c.fillStyle = '#ffffff'; c.fillRect((x + 1) * s, (y + 1) * s, 5 * s, 5 * s); c.fillStyle = '#111111'; c.fillRect((x + 2) * s, (y + 2) * s, 3 * s, 3 * s); };
  const inF = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inF(x, y) && rng() < 0.48) c.fillRect(x * s, y * s, s, s);
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
}
