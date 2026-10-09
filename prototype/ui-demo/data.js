/* data.js — dữ liệu mẫu, trạng thái, truy vấn. Mọi số liệu ở đây là ví dụ. */
'use strict';
const ORGS0 = {
  'o-mai': { type: 'farmer', name: 'Hộ cô Mai', place: 'Ấp 3, Tân Lập', phone: '0912 345 678' },
  'o-hung': { type: 'trader', name: 'Vựa Tư Hùng', place: 'Tổ 4, Tân Lập', phone: '0905 118 236' },
  'o-datdo': { type: 'enterprise', name: 'Công ty Nông sản Đất Đỏ', place: 'QL14, Đồng Xoài', phone: '0271 3 889 120' },
  'o-namquy': { type: 'trader', name: 'Vựa Năm Quý', place: 'Chơn Thành', phone: '0919 404 772' },
  'o-bay': { type: 'farmer', name: 'Hộ ông Bảy Thắng', place: 'Thuận Lợi', phone: '0918 774 032' },
};
let ORGS = JSON.parse(JSON.stringify(ORGS0));
const PERSONAS = {
  farmer: { label: 'Nông dân — Cô Mai', name: 'Cô Mai', full: 'Nguyễn Thị Mai', org: 'o-mai', role: 'owner', branch: null, phone: '0912 345 678', username: 'comai' },
  trader_owner: { label: 'Vựa — Chủ vựa Tư Hùng', name: 'Tư Hùng', full: 'Trần Văn Hùng', org: 'o-hung', role: 'owner', branch: null, phone: '0905 118 236', username: 'tuhung' },
  trader_staff: { label: 'Vựa — Người cân Bé Tư', name: 'Bé Tư', full: 'Trần Ngọc Tư', org: 'o-hung', role: 'staff', branch: null, phone: '0386 552 019', username: '' },
  ent_owner: { label: 'Doanh nghiệp — Chủ: chị Lan', name: 'Chị Lan', full: 'Phạm Thị Lan', org: 'o-datdo', role: 'owner', branch: null, phone: '0913 220 456', username: 'lanpham' },
  ent_manager: { label: 'Doanh nghiệp — Quản lý CN Bù Đăng', name: 'Anh Khoa', full: 'Trần Văn Khoa', org: 'o-datdo', role: 'manager', branch: 'br2', phone: '0988 101 552', username: '' },
  ent_staff: { label: 'Doanh nghiệp — Nhân viên cân CN Bù Đăng', name: 'Minh', full: 'Lê Văn Minh', org: 'o-datdo', role: 'staff', branch: 'br2', phone: '0397 334 812', username: '' },
  admin: { label: 'Nội bộ — Quản trị viên', name: 'Quản trị', full: 'Nhóm vận hành THUMUA365', org: null, role: 'admin', branch: null, phone: '', username: 'ops' },
};
const S = {};

function mkLine(pid, rng) {
  const P = PRODUCTS[pid]; const l = { pid, formula: P.formula, gross: 0, tare: 0, drc: 0, loss: 0, price: P.price };
  const j = Math.round((rng() - 0.5) * 4) * 500;
  if (pid === 'cs') { l.gross = Math.round(300 + rng() * 1100); l.tare = 2 * Math.ceil(l.gross / 250); l.drc = Math.round((28 + rng() * 8) * 10) / 10; }
  if (pid === 'cf') { l.gross = Math.round(400 + rng() * 2600); l.tare = Math.round(l.gross / 60) * 0.5; }
  if (pid === 'ti') { l.gross = Math.round(80 + rng() * 500); l.tare = Math.round(l.gross / 50 * 3) / 10; l.loss = P.loss; }
  if (pid === 'di') { l.gross = Math.round(200 + rng() * 1300); }
  l.price = P.price + j; return l;
}
const pay = (amount, when) => ({ id: uid('pay'), amount: Math.round(amount), at: when, voided: false });
function mkRec(o) {
  const P = PRODUCTS[o.pid];
  const l = { pid: o.pid, formula: P.formula, gross: o.gross, tare: o.tare || 0, drc: o.drc || 0, loss: o.loss ?? (P.loss || 0), price: o.price };
  const r = { id: uid('r'), code: '', kind: o.kind || 'purchase', partnerId: o.partner, at: at(o.days, o.h ?? 9, o.m ?? 20), lines: [l], adj: [], pays: [], status: o.status || 'done', by: o.by || '', photos: o.photos || 0, note: o.note || '', branchId: o.branch || null, orderId: o.orderId || null, pending: false };
  if (o.payAmount !== undefined && o.payAmount !== null) r.pays.push(pay(o.payAmount, r.at + 36e5));
  else if (o.payFrac) r.pays.push(pay(Math.floor(totalOf(r) * o.payFrac / 1000) * 1000 || totalOf(r), r.at + 36e5));
  return r;
}
function genBook(cfg) {
  const rng = mulberry32(cfg.seed);
  const B = { partners: {}, receipts: [], products: JSON.parse(JSON.stringify(PRODUCTS)), rules: cfg.rules || [], branches: cfg.branches || [], members: cfg.members || [], notes: cfg.notes || '' };
  cfg.partners.forEach((p) => { B.partners[p.id] = { note: '', link: null, phone: '', place: '', ...p }; });
  const sup = cfg.partners.filter((p) => p.kind === 'supplier' && !p.noGen).map((p) => p.id);
  for (let i = 0; i < cfg.n; i++) {
    const days = i < cfg.today ? 0 : 1 + Math.floor(rng() * 28);
    const pid = cfg.mix[Math.floor(rng() * cfg.mix.length)];
    const br = cfg.branchIds ? cfg.branchIds[Math.floor(rng() * cfg.branchIds.length)] : null;
    const r = { id: uid('r'), code: '', kind: 'purchase', partnerId: sup[Math.floor(rng() * sup.length)], at: at(days, 6 + Math.floor(rng() * (days === 0 ? 3 : 11)), Math.floor(rng() * 60)), lines: [mkLine(pid, rng)], adj: [], pays: [], status: 'done', by: cfg.byFor ? cfg.byFor(br, rng) : cfg.by[Math.floor(rng() * cfg.by.length)], photos: rng() < 0.35 ? 1 : 0, note: '', branchId: br, orderId: null, pending: false };
    if (rng() < 0.15) r.adj.push({ label: 'Phí xe đến lấy', amount: Math.round(netOf(r) * 200 / 1000) * 1000, sign: -1 });
    const x = rng(), t = totalOf(r);
    if (x < 0.55) r.pays.push(pay(t, r.at + 6e5));
    else if (x < 0.82) r.pays.push(pay(Math.max(100000, Math.floor(t * (0.3 + rng() * 0.4) / 100000) * 100000), r.at + 36e5));
    B.receipts.push(r);
  }
  (cfg.extra || []).forEach((o) => B.receipts.push(mkRec(o)));
  const seq = { purchase: cfg.seqM, sale: cfg.seqB };
  B.receipts.sort((a, b) => a.at - b.at).forEach((r) => { r.code = (r.kind === 'purchase' ? 'PM-' : 'PB-') + p2(seq[r.kind]++).padStart(4, '0'); });
  B.receipts.sort((a, b) => b.at - a.at);
  return B;
}
function genTrader() {
  return genBook({
    seed: 11, n: 24, today: 4, seqM: 415, seqB: 86, mix: ['cs', 'cs', 'cs', 'cf', 'cf', 'ti', 'di'], by: ['Tư Hùng', 'Bé Tư', 'Bé Tư'],
    partners: [
      { id: 'p1', kind: 'supplier', name: 'Cô Mai', full: 'Nguyễn Thị Mai', phone: '0912 345 678', place: 'Ấp 3, Tân Lập', link: { status: 'active', org: 'o-mai', since: at(6, 9, 12) } },
      { id: 'p2', kind: 'supplier', name: 'Chú Ba Lộc', phone: '0903 218 554', place: 'Tân Hưng', link: { status: 'invited', code: 'K7M2QX9P', expiresAt: at(-5, 9) } },
      { id: 'p3', kind: 'supplier', name: 'Anh Sáu Tài', phone: '0978 610 223', place: 'Đồng Tiến', link: { status: 'invited', code: null, expiresAt: at(2, 8) } },
      { id: 'p4', kind: 'supplier', name: 'Chị Hai Nhàn', phone: '0362 445 190', place: 'Tân Phú' },
      { id: 'p5', kind: 'supplier', name: 'Ông Bảy Thắng', phone: '0918 774 032', place: 'Thuận Lợi', link: { status: 'revoked', org: 'o-bay', since: at(40), revokedAt: at(9) } },
      { id: 'p6', kind: 'supplier', name: 'Cô Út Hiền', phone: '', place: 'Tân Lợi' },
      { id: 'b1', kind: 'buyer', name: 'Công ty Nông sản Đất Đỏ', phone: '0271 3 889 120', place: 'Đồng Xoài', link: { status: 'active', org: 'o-datdo', since: at(20) } },
      { id: 'b2', kind: 'buyer', name: 'Nhà máy mủ Hưng Phát', phone: '0271 3 765 018', place: 'Chơn Thành' },
      { id: 'b3', kind: 'buyer', name: 'Đại lý cà phê Minh Châu', phone: '0909 552 301', place: 'Bù Đăng' },
    ],
    extra: [
      { partner: 'p1', pid: 'cs', gross: 905, tare: 8, drc: 31.5, price: 41500, days: 9, h: 7, m: 40, payAmount: 6000000, orderId: 'od4', by: 'Tư Hùng', photos: 1 },
      { partner: 'p1', pid: 'cs', gross: 742, tare: 6, drc: 30.8, price: 42000, days: 4, h: 7, m: 15, payFrac: 1, by: 'Bé Tư' },
      { partner: 'p1', pid: 'ti', gross: 186, tare: 1.2, loss: 2, price: 141500, days: 2, h: 15, m: 5, by: 'Tư Hùng' },
      { kind: 'sale', partner: 'b2', pid: 'cs', gross: 4200, drc: 32.5, price: 44000, days: 3, h: 14, payFrac: 1, by: 'Tư Hùng' },
      { kind: 'sale', partner: 'b1', pid: 'cf', gross: 4800, tare: 40, price: 102000, days: 6, h: 10, payFrac: 0.6, by: 'Tư Hùng', photos: 2 },
      { kind: 'sale', partner: 'b3', pid: 'ti', gross: 900, tare: 6, loss: 1, price: 148000, days: 12, h: 16, payFrac: 1, by: 'Tư Hùng' },
      { kind: 'sale', partner: 'b2', pid: 'di', gross: 6000, price: 35500, days: 1, h: 13, payAmount: 0, by: 'Tư Hùng' },
      { kind: 'sale', partner: 'b2', pid: 'cs', gross: 3600, drc: 33, price: 43500, days: 18, h: 11, payFrac: 1, by: 'Tư Hùng' },
      { partner: 'p4', pid: 'cs', gross: 640, tare: 4, drc: '', price: 41500, days: 0, h: 7, m: 50, status: 'weighing', by: 'Bé Tư' },
      { partner: 'p2', pid: 'cf', gross: 1250, tare: 10, price: 98500, days: 1, h: 16, m: 30, status: 'saved', by: 'Tư Hùng', note: 'Chờ chú Ba chốt giá chiều nay' },
    ],
    members: [
      { id: 'hm1', name: 'Trần Văn Hùng', phone: '0905 118 236', role: 'owner', branch: null },
      { id: 'hm2', name: 'Trần Ngọc Tư', phone: '0386 552 019', role: 'staff', branch: null },
    ],
    branches: [{ id: 'hb1', name: 'Vựa chính', address: 'Tổ 4, Tân Lập', archived: false }],
    rules: [
      { id: 'ru1', name: 'Cộng giá hàng nhiều', pid: 'cf', min: 2000, delta: 300, active: true },
      { id: 'ru2', name: 'Phí xe đến lấy', pid: '', min: 0, delta: -200, active: true },
      { id: 'ru3', name: 'Bớt giá khi mua nhiều', pid: 'cs', min: 5000, delta: -200, active: false },
    ],
  });
}
function genEnt() {
  const staffOf = { br1: ['Võ Thị Hạnh'], br2: ['Lê Văn Minh', 'Trần Văn Khoa'], br3: ['Đỗ Thanh Tú'] };
  return genBook({
    seed: 29, n: 34, today: 5, seqM: 2210, seqB: 340, mix: ['cf', 'cf', 'cs', 'cs', 'ti', 'di'], branchIds: ['br1', 'br2', 'br2', 'br3'],
    byFor: (br, rng) => staffOf[br][Math.floor(rng() * staffOf[br].length)],
    partners: [
      { id: 'e1', kind: 'supplier', name: 'Vựa Tư Hùng', phone: '0905 118 236', place: 'Tân Lập', link: { status: 'active', org: 'o-hung', since: at(20) } },
      { id: 'e2', kind: 'supplier', name: 'Vựa Năm Quý', phone: '0919 404 772', place: 'Chơn Thành' },
      { id: 'e3', kind: 'supplier', name: 'HTX Nông nghiệp Thuận Lợi', phone: '0271 3 640 115', place: 'Thuận Lợi', link: { status: 'invited', code: 'R8VN3MXT', expiresAt: at(-3, 10) } },
      { id: 'e4', kind: 'supplier', name: 'Hộ ông Tám Sơn', phone: '0977 120 448', place: 'Đức Liễu' },
      { id: 'x1', kind: 'buyer', name: 'Đối tác xuất khẩu Sài Gòn', phone: '028 3 822 4410', place: 'TP.HCM' },
      { id: 'x2', kind: 'buyer', name: 'Xưởng rang xay Hoà Bình', phone: '0283 991 205', place: 'Thủ Đức' },
    ],
    extra: [
      { kind: 'sale', partner: 'x1', pid: 'cf', gross: 18000, tare: 120, price: 104500, days: 5, h: 10, payFrac: 0.7, branch: 'br1', by: 'Võ Thị Hạnh' },
      { kind: 'sale', partner: 'x2', pid: 'cf', gross: 6500, tare: 40, price: 103000, days: 12, h: 9, payFrac: 1, branch: 'br2', by: 'Trần Văn Khoa' },
      { kind: 'sale', partner: 'x1', pid: 'ti', gross: 3000, tare: 20, loss: 1, price: 150000, days: 9, h: 14, payFrac: 0.5, branch: 'br3', by: 'Đỗ Thanh Tú' },
      { partner: 'e4', pid: 'cf', gross: 820, tare: 7, price: 98000, days: 0, h: 8, status: 'weighing', branch: 'br2', by: 'Lê Văn Minh' },
    ],
    members: [
      { id: 'm1', name: 'Phạm Thị Lan', phone: '0913 220 456', role: 'owner', branch: null },
      { id: 'm2', name: 'Trần Văn Khoa', phone: '0988 101 552', role: 'manager', branch: 'br2' },
      { id: 'm3', name: 'Lê Văn Minh', phone: '0397 334 812', role: 'staff', branch: 'br2' },
      { id: 'm4', name: 'Võ Thị Hạnh', phone: '0935 667 210', role: 'manager', branch: 'br1' },
      { id: 'm5', name: 'Đỗ Thanh Tú', phone: '0868 442 975', role: 'staff', branch: 'br3' },
    ],
    branches: [
      { id: 'br1', name: 'Chi nhánh Đồng Xoài', address: 'QL14, P. Tân Phú', archived: false },
      { id: 'br2', name: 'Chi nhánh Bù Đăng', address: 'ĐT760, Đức Liễu', archived: false },
      { id: 'br3', name: 'Chi nhánh Lộc Ninh', address: 'QL13, Lộc Ninh', archived: false },
    ],
    rules: [{ id: 'eru1', name: 'Cộng giá hàng nhiều', pid: 'cf', min: 5000, delta: 400, active: true }],
  });
}
function genNamQuy() {
  return genBook({
    seed: 3, n: 0, today: 0, seqM: 77, seqB: 10, mix: ['cs'], by: ['Năm Quý'],
    partners: [{ id: 'nq1', kind: 'supplier', name: 'Cô Mai', phone: '0912 345 678', link: { status: 'invited', code: 'H4TR9WXP', expiresAt: at(-6, 8) } }],
    extra: [
      { partner: 'nq1', pid: 'di', gross: 640, price: 32500, days: 15, h: 10, payFrac: 1, by: 'Năm Quý' },
      { partner: 'nq1', pid: 'cs', gross: 520, tare: 4, drc: 32, price: 41000, days: 3, h: 8, payAmount: 2000000, by: 'Năm Quý' },
    ],
  });
}
function ev(to, by, days, h, m, note = '') { return { to, by, at: at(days, h, m), note }; }
function seedOrders() {
  const now = Date.now();
  return [
    { id: 'od6', code: 'DH-1048', seller: 'o-mai', buyer: 'o-hung', creator: 'o-mai', crop: 'cf', qty: 2000, note: 'Cà phê phơi đủ nắng, độ ẩm khoảng 13%', status: 'submitted', version: 1, conflict: true, partner: { 'o-hung': 'p1' }, events: [{ to: 'submitted', by: 'o-mai', at: now - 15 * 6e4, note: '' }] },
    { id: 'od2', code: 'DH-1047', seller: 'o-mai', buyer: 'o-hung', creator: 'o-mai', crop: 'ti', qty: 300, note: 'Tiêu đã phơi khô, đóng 6 bao', status: 'submitted', version: 1, partner: { 'o-hung': 'p1' }, events: [{ to: 'submitted', by: 'o-mai', at: now - 40 * 6e4, note: '' }] },
    { id: 'od1', code: 'DH-1042', seller: 'o-mai', buyer: 'o-hung', creator: 'o-mai', crop: 'cs', qty: 1200, note: 'Mủ cạo sáng, để ở thùng nhà', status: 'scheduled', version: 3, pickupAt: at(-1, 7, 30), pickupAddress: 'Rẫy cô Mai, ấp 3, Tân Lập', partner: { 'o-hung': 'p1' }, events: [ev('submitted', 'o-mai', 1, 17, 2), ev('accepted', 'o-hung', 1, 18, 10), ev('scheduled', 'o-hung', 1, 18, 12, 'Xe vựa ghé lúc 7 giờ 30')] },
    { id: 'od3', code: 'DH-1039', seller: 'o-hung', buyer: 'o-datdo', creator: 'o-hung', crop: 'cf', qty: 5000, note: 'Cà phê nhân xô, giao tại kho Bù Đăng', status: 'accepted', version: 2, branch: 'br2', partner: { 'o-hung': 'b1', 'o-datdo': 'e1' }, events: [ev('submitted', 'o-hung', 2, 9, 0), ev('accepted', 'o-datdo', 2, 11, 25)] },
    { id: 'od4', code: 'DH-1031', seller: 'o-mai', buyer: 'o-hung', creator: 'o-mai', crop: 'cs', qty: 900, note: '', status: 'fulfilled', version: 4, pickupAt: at(9, 7, 30), pickupAddress: 'Rẫy cô Mai, ấp 3, Tân Lập', partner: { 'o-hung': 'p1' }, events: [ev('submitted', 'o-mai', 10, 16, 0), ev('accepted', 'o-hung', 10, 16, 40), ev('scheduled', 'o-hung', 10, 16, 41), ev('fulfilled', 'o-hung', 9, 7, 52, 'Phiếu đã lên sổ')] },
    { id: 'od5', code: 'DH-1036', seller: 'o-hung', buyer: 'o-datdo', creator: 'o-hung', crop: 'ti', qty: 800, note: '', status: 'cancelled', version: 3, branch: 'br2', partner: { 'o-hung': 'b1', 'o-datdo': 'e1' }, events: [ev('submitted', 'o-hung', 6, 8, 0), ev('accepted', 'o-datdo', 6, 9, 30), ev('cancelled', 'o-hung', 5, 10, 0, 'Hàng chưa đủ khô, hẹn tuần sau')] },
  ];
}
function seedNotifs() {
  const now = Date.now();
  return [
    { id: 'n1', org: 'o-hung', kind: 'order.submitted', from: 'o-mai', orderId: 'od6', at: now - 15 * 6e4, read: false },
    { id: 'n2', org: 'o-hung', kind: 'order.submitted', from: 'o-mai', orderId: 'od2', at: now - 40 * 6e4, read: false },
    { id: 'n3', org: 'o-hung', kind: 'order.accepted', from: 'o-datdo', orderId: 'od3', at: at(2, 11, 25), read: true },
    { id: 'n4', org: 'o-hung', kind: 'link.accepted', from: 'o-mai', at: at(6, 9, 12), read: true },
    { id: 'n5', org: 'o-mai', kind: 'order.scheduled', from: 'o-hung', orderId: 'od1', at: at(1, 18, 12), read: false },
    { id: 'n6', org: 'o-mai', kind: 'order.fulfilled', from: 'o-hung', orderId: 'od4', at: at(9, 7, 52), read: true },
    { id: 'n7', org: 'o-datdo', kind: 'order.cancelled', from: 'o-hung', orderId: 'od5', at: at(5, 10, 0), read: true, branch: 'br2' },
    { id: 'n8', org: 'o-datdo', kind: 'member.added', from: 'o-datdo', at: at(3, 15, 0), read: false, text: 'Đã thêm Đỗ Thanh Tú vào Chi nhánh Lộc Ninh' },
  ];
}
function seedBilling() {
  return {
    'o-hung': { tier: 'trial', trialEnds: at(-12, 23, 59), periodEnd: null, selfServe: true, intents: [] },
    'o-datdo': { tier: 'premium', periodEnd: at(-214, 23, 59), branchLimit: 5, selfServe: false, intents: [] },
  };
}
function seedAdmin() {
  return {
    orgs: { farmer: 38, trader: 21, enterprise: 3 }, paying: 9,
    p95: [212, 198, 236, 224, 205, 247, 231, 219, 201, 208, 262, 229, 214, 196],
    ops: { accepted: 1284, duplicate: 37, rejected: 2 },
    funnel: [['Đăng ký', 214], ['Chọn "Bác là ai?"', 188], ['Lập phiếu đầu tiên', 121], ['Kết nối nông dân', 64], ['Đơn đầu tiên', 29], ['Trả phí', 9]],
    intents: [
      { id: 'ai1', org: 'Vựa Sáu Phước', amount: 1490000, content: 'TM365 Q4ZK7W', at: Date.now() - 50 * 6e4, status: 'pending' },
      { id: 'ai2', org: 'Vựa Kim Thoa', amount: 149000, content: 'TM365 B9MX2R', at: Date.now() - 3 * 36e5, status: 'pending' },
    ],
    bank: [
      { id: 'bk1', at: Date.now() - 2.8 * 36e5, amount: 149000, content: 'TM365 B9MX2 R chuyen tien app', hint: 'Gần khớp TM365 B9MX2R (Vựa Kim Thoa)' },
      { id: 'bk2', at: at(1, 20, 14), amount: 150000, content: 'thanh toan app thu mua', hint: 'Không khớp mã nào' },
    ],
    log: [
      { at: at(1, 10, 5), who: 'Nguyên (hỗ trợ)', org: 'Vựa Tư Hùng', scope: 'Đọc sổ', reason: 'Bác Hùng nhờ xem phiếu PM-0431 lệch tổng' },
      { at: at(4, 14, 40), who: 'Linh (hỗ trợ)', org: 'Vựa Kim Thoa', scope: 'Mở gói tay', reason: 'Chuyển khoản sai nội dung, đã đối chiếu sao kê' },
      { at: at(8, 9, 12), who: 'Nguyên (hỗ trợ)', org: 'Hộ ông Bảy Thắng', scope: 'Đọc hồ sơ', reason: 'Hỏi vì sao không còn xem được phiếu' },
    ],
    backup: { last: at(0, 2, 0), restoreCheck: at(dayIndex(Date.now()) + ((new Date().getDay() + 7) % 7), 3, 10) },
  };
}

function initState() {
  _id = 1; ORGS = JSON.parse(JSON.stringify(ORGS0));
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, {
    persona: PERSONAS[loadPref('persona', 'trader_owner')] ? loadPref('persona', 'trader_owner') : 'trader_owner',
    screen: 'app', route: '', params: {}, online: true, mode: loadPref('mode', 'auto'), queue: [], menu: false,
    claimTries: 0, draft: null, rtab: 'done', rkind: 'all', rperiod: '30', otab: 'all', rrange: '30', rbranch: 'all',
    importRows: null, weigh: ['612', '588', '604,5'], who: { type: '', org: '', name: '', username: '' },
  });
  S.books = { 'o-hung': genTrader(), 'o-datdo': genEnt(), 'o-namquy': genNamQuy() };
  S.orders = seedOrders(); S.notifs = seedNotifs(); S.billing = seedBilling(); S.admin = seedAdmin();
}

/* Truy vấn theo người đang dùng */
const P = () => PERSONAS[S.persona];
const ORG = () => (P().org ? ORGS[P().org] : null);
const TYPE = () => (ORG() ? ORG().type : 'admin');
const can = (perm) => S.persona !== 'admin' && permsFor(TYPE(), P().role).has(perm);
const BOOK = () => S.books[P().org];
const isBook = () => TYPE() === 'trader' || TYPE() === 'enterprise';
const branchName = (id) => (id ? (S.books['o-datdo'].branches.concat(S.books['o-hung'].branches).find((b) => b.id === id) || {}).name || '' : '');
function myReceipts() { const B = BOOK(); if (!B) return []; return B.receipts.filter((r) => !r.deleted && (!P().branch || r.branchId === P().branch)); }
const doneReceipts = () => myReceipts().filter((r) => r.status === 'done');
const pname = (B, id) => (id ? (B.partners[id] || {}).name || '—' : 'Khách lẻ');
const findReceipt = (id) => { for (const [org, B] of Object.entries(S.books)) { const r = B.receipts.find((x) => x.id === id); if (r) return { r, B, org }; } return null; };
function inventory() {
  const B = BOOK(); const rs = doneReceipts();
  return Object.entries(B.products).map(([pid, p]) => {
    let inK = 0, outK = 0, inV = 0;
    rs.forEach((r) => r.lines.forEach((l) => { if (l.pid !== pid) return; const n = lineNet(l); if (r.kind === 'purchase') { inK += n; inV += lineAmt(l); } else outK += n; }));
    const stock = inK - outK, avg = inK ? inV / inK : 0;
    return { pid, name: p.name, inK, outK, stock, avg, value: Math.max(0, stock) * avg };
  });
}
function debtGroups(kind) {
  const map = {};
  doneReceipts().filter((r) => r.kind === kind && debtOf(r) > 0).forEach((r) => {
    const k = r.partnerId || '_walk';
    const g = (map[k] = map[k] || { pid: r.partnerId, rs: [], debt: 0, oldest: r.at });
    g.rs.push(r); g.debt += debtOf(r); g.oldest = Math.min(g.oldest, r.at);
  });
  return Object.values(map).sort((a, b) => b.debt - a.debt);
}
const overdueCount = () => debtGroups('purchase').concat(debtGroups('sale')).filter((g) => dayIndex(g.oldest) > 15).length;

/* Đơn */
function oview(o) { const me = P().org; const side = o.seller === me ? 'seller' : 'buyer'; const cp = side === 'seller' ? o.buyer : o.seller; return { side, cp, cpName: ORGS[cp].name, isCreator: o.creator === me }; }
function myOrders() { const me = P().org; return S.orders.filter((o) => (o.seller === me || o.buyer === me) && (!P().branch || !o.branch || o.branch === P().branch)); }
const OPEN = ['submitted', 'accepted', 'scheduled'];
function orderActs(o) {
  const v = oview(o), open = OPEN.includes(o.status);
  return {
    accept: !v.isCreator && o.status === 'submitted' && can('order:respond'),
    schedule: v.side === 'buyer' && ['accepted', 'scheduled'].includes(o.status) && can('order:respond'),
    cancel: open && (v.isCreator ? can('order:create') : can('order:respond')),
    weigh: v.side === 'buyer' && ['accepted', 'scheduled'].includes(o.status) && can('receipt:create') && isBook(),
  };
}
const ORDER_ST = { submitted: ['Chờ nhận', 'warn'], accepted: ['Đã nhận', 'info'], scheduled: ['Đã hẹn lịch', 'info'], fulfilled: ['Đã cân xong', 'ok'], rejected: ['Từ chối', 'alert'], cancelled: ['Đã huỷ', 'plain'] };
const incomingOpen = () => myOrders().filter((o) => o.status === 'submitted' && !oview(o).isCreator).length;

/* Thông báo */
const myNotifs = () => S.notifs.filter((n) => n.org === P().org && (!P().branch || !n.branch || n.branch === P().branch)).sort((a, b) => b.at - a.at);
function notify(org, kind, extra = {}) { S.notifs.push({ id: uid('n'), org, kind, from: P().org, at: Date.now(), read: false, ...extra }); }

/* Kết nối */
function linkedToMe() { // các sổ khác đang cho mình xem
  const me = P().org, out = [];
  for (const [org, B] of Object.entries(S.books)) for (const p of Object.values(B.partners)) if (p.link && p.link.org === me && p.link.status === 'active') out.push({ org, B, p });
  return out;
}
function linkedBalance(B, p) {
  let theyOwe = 0, youOwe = 0;
  B.receipts.filter((r) => r.partnerId === p.id && r.status === 'done' && !r.deleted).forEach((r) => { if (r.kind === 'purchase') theyOwe += debtOf(r); else youOwe += debtOf(r); });
  return { theyOwe, youOwe };
}

/* Hàng đợi đồng bộ */
let flushTimer = null;
function pushOp(label, r) {
  S.queue.push({ id: uid('op'), label, org: P().org, at: Date.now() });
  if (r) r.pending = true;
  if (S.online) scheduleFlush();
}
function scheduleFlush() {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    if (!S.online || !S.queue.length) return;
    const n = S.queue.length; S.queue = [];
    for (const [org, B] of Object.entries(S.books)) B.receipts.forEach((r) => {
      if (!r.pending) return; r.pending = false;
      const o = r.orderId && S.orders.find((x) => x.id === r.orderId);
      if (o && r.status === 'done') {
        if (OPEN.includes(o.status)) {
          o.status = 'fulfilled'; o.version++; o.events.push({ to: 'fulfilled', by: org, at: Date.now(), note: 'Phiếu ' + r.code + ' đã lên sổ' });
          S.notifs.push({ id: uid('n'), org: o.seller === org ? o.buyer : o.seller, kind: 'order.fulfilled', from: org, orderId: o.id, at: Date.now(), read: false });
        } else if (o.status === 'cancelled') { r.orderId = null; toast('Đơn ' + o.code + ' không còn mở; phiếu vẫn lưu'); }
      }
    });
    toast('Đã gửi ' + n + ' thao tác lên mạng');
    render();
  }, 1100);
  render();
}
