/* app.js — nối sự kiện và khởi động */
'use strict';
const PERSONAS0 = JSON.stringify(PERSONAS);
function resetAll() { const p0 = JSON.parse(PERSONAS0); for (const k of Object.keys(p0)) Object.assign(PERSONAS[k], p0[k]); const keepMode = S.mode, keepP = S.persona; initState(); S.mode = keepMode || S.mode; S.persona = keepP || S.persona; }

ACT.go = (d) => {
  if (d.tab) S.rtab = d.tab;
  go(d.r, { id: d.id, kind: d.kind, orderId: d.order, edit: d.edit, gross: d.gross, org: d.org });
  if (d.r === 'create' && d.pid && S.draft) { S.draft.partnerId = d.pid; render(); }
};
ACT.set = (d) => { S[d.k] = d.v; render(); };
ACT.close = () => closeDialog();
ACT.scrim = (d, el, e) => { if (e.target === el) closeDialog(); };
ACT.menu = () => { S.menu = !S.menu; render(); };
ACT.screen = (d) => { S.screen = d.v; render(); };
const MODES = ['auto', 'day', 'sun', 'night'];
ACT.cycleMode = () => { S.mode = MODES[(MODES.indexOf(S.mode) + 1) % MODES.length]; savePref('mode', S.mode); S.menu = false; render(); toast('Chế độ xem: ' + { auto: 'Theo máy', day: 'Trong nhà', sun: 'Ngoài nắng', night: 'Ban đêm' }[S.mode]); };
ACT.setMode = (d) => { S.mode = d.v; savePref('mode', S.mode); render(); };
ACT.toggleNet = () => { S.online = !S.online; render(); toast(S.online ? 'Có mạng lại' : 'Đã tắt mạng — thử lập phiếu, phiếu vẫn lưu trên máy', S.online ? '' : 'alert'); if (S.online && S.queue.length) scheduleFlush(); };
ACT.reset = () => confirmDialog({ title: 'Làm lại dữ liệu demo?', body: '<p>Mọi phiếu, đơn, kết nối bác vừa thử sẽ về như ban đầu.</p>', ok: 'Làm lại', onOk: () => { resetAll(); S.route = ''; render(); toast('Đã làm lại dữ liệu mẫu'); } });
ACT.logout = () => {
  const n = S.queue.filter((q) => q.org === P().org).length;
  const doIt = () => { S.menu = false; S.screen = 'login'; closeDialog(); render(); };
  if (n) confirmDialog({ title: 'Còn ' + n + ' thao tác chưa gửi', body: '<p>Đăng xuất vẫn giữ các thao tác này trên máy, đăng nhập lại sẽ gửi tiếp. Không thao tác nào bị xoá.</p>', ok: 'Vẫn đăng xuất', onOk: doIt });
  else doIt();
};
CHG.persona = (el) => { S.persona = el.value; savePref('persona', S.persona); S.route = ''; S.params = {}; S.menu = false; S.draft = null; S.otab = 'all'; if (S.screen !== 'app') S.screen = 'app'; closeDialog(); render(); toast('Đang xem với vai: ' + PERSONAS[S.persona].label); };
CHG.tier = (el) => { const b = S.billing['o-hung']; b.tier = el.value; if (el.value === 'premium' && !b.periodEnd) b.periodEnd = Date.now() + 30 * DAY; render(); };

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el || !$('#app').contains(el)) return;
  if (el.tagName === 'A') e.preventDefault();
  const fn = ACT[el.dataset.act]; if (fn) fn(el.dataset, el, e);
  if (S.menu && el.dataset.act !== 'menu' && !el.closest('.menu')) { S.menu = false; render(); }
});
document.addEventListener('input', (e) => { const el = e.target; if (el.dataset && el.dataset.in && INP[el.dataset.in]) INP[el.dataset.in](el, e); });
document.addEventListener('change', (e) => { const el = e.target; if (el.dataset && el.dataset.chg && CHG[el.dataset.chg]) CHG[el.dataset.chg](el, e); });
document.addEventListener('submit', (e) => { const f = e.target; if (!f.dataset || !f.dataset.form) return; e.preventDefault(); if (FORM[f.dataset.form]) FORM[f.dataset.form](f, e); });
window.addEventListener('hashchange', () => { const r = location.hash.slice(1); if (VIEWS[r] && r !== S.route && visible(r)) go(r); });

initState();
(() => { const r = location.hash.slice(1); if (VIEWS[r] && visible(r) && r !== 'receipt' && r !== 'create') S.route = r; })();
render();
