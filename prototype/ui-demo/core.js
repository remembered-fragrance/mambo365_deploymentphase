/* core.js — tiện ích, biểu tượng, phép tính tiền (mô phỏng @mambo/core), quyền (mô phỏng @mambo/contracts) */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const DAY = 864e5;
const T0 = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
const at = (daysAgo, h = 8, m = 0) => T0 - daysAgo * DAY + h * 36e5 + m * 6e4;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let _id = 1;
const uid = (p) => (p || 'x') + (_id++).toString(36);
const p2 = (n) => String(n).padStart(2, '0');
const vnd = (n) => Math.round(n || 0).toLocaleString('vi-VN') + 'đ';
const num = (n, d = 1) => (Math.round((n || 0) * 10 ** d) / 10 ** d).toLocaleString('vi-VN', { maximumFractionDigits: d });
const kg = (n) => num(n) + ' kg';
const tr = (n) => { const a = Math.abs(n); if (a >= 1e9) return num(n / 1e9, 2) + ' tỷ'; if (a >= 1e6) return num(n / 1e6, 1) + ' tr'; if (a >= 1e3) return num(n / 1e3, 0) + 'k'; return String(Math.round(n)); };
const fmtTime = (ms) => { const d = new Date(ms); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
const dayIndex = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return Math.round((T0 - d.getTime()) / DAY); };
function fmtDate(ms) {
  const i = dayIndex(ms);
  if (i === 0) return 'Hôm nay, ' + fmtTime(ms);
  if (i === 1) return 'Hôm qua, ' + fmtTime(ms);
  if (i === -1) return 'Mai, ' + fmtTime(ms);
  const d = new Date(ms); return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + ', ' + fmtTime(ms);
}
const fmtDay = (ms) => { const d = new Date(ms); return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear(); };
function ago(ms) { const m = Math.round((Date.now() - ms) / 6e4); if (m < 1) return 'vừa xong'; if (m < 60) return m + ' phút trước'; const h = Math.round(m / 60); if (h < 24) return h + ' giờ trước'; return Math.round(h / 24) + ' ngày trước'; }
/* Quy ước số của dự án: phẩy là thập phân, chấm là ngăn nghìn */
function parseNum(s) { if (typeof s === 'number') return s; s = String(s ?? '').trim().replace(/\s/g, ''); if (!s) return 0; s = s.replace(/\./g, '').replace(',', '.'); const n = Number(s); return Number.isFinite(n) ? n : NaN; }
const showNum = (n) => (n === '' || n === null || n === undefined ? '' : String(n).replace('.', ','));

/* Đọc tiền bằng chữ */
function readTriple(n, full) {
  const d = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10, s = [];
  if (full || h > 0) s.push(d[h] + ' trăm');
  if (t === 0) { if (u > 0 && (full || h > 0)) s.push('linh'); }
  else if (t === 1) s.push('mười'); else s.push(d[t] + ' mươi');
  if (u > 0) { if (u === 1 && t > 1) s.push('mốt'); else if (u === 5 && t > 0) s.push('lăm'); else s.push(d[u]); }
  return s.join(' ');
}
function moneyWords(n) {
  n = Math.round(Math.abs(n)); if (!n) return 'Không đồng';
  const units = ['', ' nghìn', ' triệu', ' tỷ']; const g = [];
  while (n > 0) { g.push(n % 1000); n = Math.floor(n / 1000); }
  const out = []; let started = false;
  for (let i = g.length - 1; i >= 0; i--) { if (g[i] === 0) continue; out.push(readTriple(g[i], started) + units[i % 4]); started = true; }
  const s = out.join(' ').replace(/\s+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1) + ' đồng';
}

/* Mặt hàng và cách tính */
const PRODUCTS = {
  cs: { name: 'Cao su mủ nước', short: 'Cao su', formula: 'rubber', price: 41500, sale: 44000, unit: 'đ/kg quy khô' },
  cf: { name: 'Cà phê nhân xô', short: 'Cà phê', formula: 'tare', price: 98500, sale: 102000, unit: 'đ/kg' },
  ti: { name: 'Tiêu đen', short: 'Tiêu', formula: 'loss', price: 142000, sale: 148000, unit: 'đ/kg', loss: 2 },
  di: { name: 'Hạt điều thô', short: 'Điều', formula: 'standard', price: 33000, sale: 35500, unit: 'đ/kg' },
};
const FORMULAS = { standard: 'Cân xong tính luôn', tare: 'Cân xong trừ bì', rubber: 'Cao su tính theo hàm lượng mủ', loss: 'Trừ hao hụt' };
const FORMULA_HINT = { standard: 'Tính tiền theo = cân được', tare: 'Tính tiền theo = cân được − bì', rubber: 'Tính tiền theo = (cân được − bì) × hàm lượng mủ', loss: 'Tính tiền theo = (cân được − bì) × (100% − hao hụt)' };
function lineNet(l) {
  const g = parseNum(l.gross) || 0, t = parseNum(l.tare) || 0, base = Math.max(0, g - t); let n;
  switch (l.formula) { case 'standard': n = g; break; case 'rubber': n = (base * (parseNum(l.drc) || 0)) / 100; break; case 'loss': n = base * (1 - (parseNum(l.loss) || 0) / 100); break; default: n = base; }
  return Math.round(n * 10) / 10;
}
const lineAmt = (l) => Math.round(lineNet(l) * (parseNum(l.price) || 0));
const netOf = (r) => r.lines.reduce((a, l) => a + lineNet(l), 0);
const rawOf = (r) => r.lines.reduce((a, l) => a + lineAmt(l), 0);
const adjOf = (r) => r.adj.reduce((a, x) => a + (parseNum(x.amount) || 0) * x.sign, 0);
const totalOf = (r) => rawOf(r) + adjOf(r);
const paidOf = (r) => r.pays.filter((p) => !p.voided).reduce((a, p) => a + p.amount, 0);
const debtOf = (r) => Math.max(0, totalOf(r) - paidOf(r));
function lineDesc(l) {
  const parts = ['Cân được ' + kg(parseNum(l.gross))];
  if (l.formula !== 'standard' && parseNum(l.tare)) parts.push('trừ bì ' + kg(parseNum(l.tare)));
  if (l.formula === 'rubber') parts.push('hàm lượng ' + num(parseNum(l.drc)) + '%');
  if (l.formula === 'loss') parts.push('hao hụt ' + num(parseNum(l.loss)) + '%');
  return parts.join(' · ');
}

/* Mã kết nối: 8 ký tự, bỏ 0 O 1 I L */
const LINK_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = (rng = Math.random) => Array.from({ length: 8 }, () => LINK_ALPHABET[Math.floor(rng() * LINK_ALPHABET.length)]).join('');
const fmtCode = (c) => (c ? c.slice(0, 4) + '-' + c.slice(4) : '');

/* Ma trận quyền — FRONTEND.md §5.4 */
const PERM_LIST = [
  ['order:create', 'Tạo đơn'], ['order:respond', 'Nhận / hẹn đơn'], ['book:sync', 'Đồng bộ sổ'],
  ['receipt:create', 'Lập phiếu, ghi trả tiền'], ['receipt:delete', 'Xoá phiếu, huỷ lần trả'],
  ['partner:manage', 'Quản lý đối tác, giá'], ['linked:read', 'Xem sổ được kết nối'],
  ['staff:manage', 'Nhân viên, chi nhánh'], ['report:view', 'Xem báo cáo'], ['billing:manage', 'Gói, xoá tài khoản'],
];
function permsFor(type, role) {
  const P = new Set(); const add = (...a) => a.forEach((x) => P.add(x));
  if (type === 'farmer') add('order:create', 'order:respond', 'linked:read', 'report:view', 'billing:manage', 'account:delete');
  if (type === 'trader') {
    add('order:create', 'order:respond', 'book:sync', 'receipt:create', 'payment:record');
    if (role === 'owner') add('receipt:delete', 'payment:void', 'partner:manage', 'pricing:manage', 'linked:read', 'staff:manage', 'branch:manage', 'report:view', 'billing:manage', 'account:delete');
  }
  if (type === 'enterprise') {
    add('order:create', 'book:sync', 'receipt:create', 'payment:record');
    if (role !== 'staff') add('order:respond', 'receipt:delete', 'payment:void', 'partner:manage', 'pricing:manage', 'linked:read', 'report:view');
    if (role === 'owner') add('staff:manage', 'branch:manage', 'billing:manage', 'account:delete');
  }
  return P;
}
const ROLE_LABEL = (type, role) => role === 'owner' ? 'Chủ' : role === 'manager' ? 'Quản lý chi nhánh' : role === 'admin' ? 'Quản trị viên' : type === 'trader' ? 'Người cân' : 'Nhân viên';
const TYPE_LABEL = { farmer: 'Nông dân', trader: 'Vựa', enterprise: 'Doanh nghiệp' };

/* Biểu tượng nét (24px) */
const IC = {
  home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  receipt: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
  wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 13h2M2 10h20M6 6V4h12v2"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  sprout: '<path d="M12 21V11"/><path d="M12 11C12 7 9 4 4 4c0 4 3 7 8 7z"/><path d="M12 13c0-3 2.5-6 8-6 0 3.5-3 6-8 6z"/>',
  truck: '<path d="M1 4h14v12H1zM15 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h8"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  order: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2h6v4H9zM9 12h6M9 16h4"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  cloud: '<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1 0 8z"/>',
  cloudoff: '<path d="M7 18a5 5 0 0 1-1-9.9M10 6.5A6 6 0 0 1 19 10a4 4 0 0 1 2 7.4M3 3l18 18"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  building: '<path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-5h6v5M9 10h.01M15 10h.01"/>',
  team: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.6c2.4.6 4 2.4 4 5.4"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/>',
  camera: '<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  printer: '<path d="M6 9V2h12v7"/><rect x="2" y="9" width="20" height="8" rx="2"/><path d="M6 14h12v8H6z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  scale: '<path d="M12 3v18M6 21h12M4 7h16"/><path d="M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l2 2"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  gift: '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M12 8v13M3 12h18M12 8S10 3 7.5 4 9 8 12 8zM12 8s2-5 4.5-4S15 8 12 8z"/>',
};
const ic = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;

function loadPref(k, d) { try { return localStorage.getItem('tm365.' + k) || d; } catch (e) { return d; } }
function savePref(k, v) { try { localStorage.setItem('tm365.' + k, v); } catch (e) { /* bỏ qua */ } }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
