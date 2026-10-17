/* views-book.js — sổ của vựa / doanh nghiệp: tổng quan, phiếu, tạo phiếu, công nợ */
'use strict';
const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
const pagehead = (h, p, actions = '') => `<div class="pagehead"><div><h2>${h}</h2>${p ? `<p>${p}</p>` : ''}</div><div class="actions">${actions}</div></div>`;

/* ─── Tổng quan ─── */
VIEWS.dashboard = {
  title: 'Tổng quan', short: 'Tổng quan', icon: 'home', show: isBook,
  render() {
    const rs = doneReceipts(), buys = rs.filter((r) => r.kind === 'purchase'), sales = rs.filter((r) => r.kind === 'sale');
    const since = (d) => (r) => r.at >= T0 - (d - 1) * DAY;
    const today = buys.filter(since(1)), w = buys.filter(since(7)), m = buys.filter(since(30)), s30 = sales.filter(since(30));
    const drafts = myReceipts().filter((r) => r.status !== 'done').length, debtors = debtGroups('purchase').length, neg = inventory().filter((x) => x.stock < 0), inc = incomingOpen();
    const vals = [], labels = [];
    for (let i = 6; i >= 0; i--) { vals.push(sum(buys.filter((r) => dayIndex(r.at) === i), totalOf)); const d = new Date(T0 - i * DAY); labels.push(i === 0 ? 'Hôm nay' : p2(d.getDate()) + '/' + p2(d.getMonth() + 1)); }
    const todo = [
      [drafts, 'phiếu đang cân dở', 'receipts', drafts ? 'warn' : 'ok', { tab: 'draft' }],
      [inc, 'đơn mới chờ nhận', 'orders', inc ? 'alert' : 'ok'],
      [debtors, 'người bán mình còn nợ tiền', 'debts', debtors ? 'warn' : 'ok'],
      [neg.length, 'mặt hàng tồn âm' + (neg.length ? ' — ' + neg.map((x) => x.name).join(', ') : ''), 'inventory', neg.length ? 'alert' : 'ok'],
    ].filter((t) => t[2] !== 'orders' || can('order:respond'));
    const recent = rs.slice(0, 6);
    let branchStrip = '';
    if (TYPE() === 'enterprise' && !P().branch) {
      branchStrip = `<section class="card"><div class="card-h"><h3>Chi nhánh — 30 ngày</h3><button class="btn sm" data-act="go" data-r="reports">Báo cáo tổng</button></div><div class="card-b"><div class="bars">${BOOK().branches.map((b) => { const v = sum(m.filter((r) => r.branchId === b.id), totalOf); const mx = Math.max(...BOOK().branches.map((x) => sum(m.filter((r) => r.branchId === x.id), totalOf))); return `<div class="bar"><span>${esc(b.name.replace('Chi nhánh ', ''))}</span><span class="track"><span class="fill" style="width:${(v / mx) * 100}%;display:block"></span></span><span class="num">${tr(v)}</span></div>`; }).join('')}</div></div></section>`;
    }
    return `${pagehead('Chào ' + esc(P().name), (TYPE() === 'enterprise' && P().branch ? esc(branchName(P().branch)) + ' · ' : '') + 'Hôm nay ' + fmtDay(Date.now()), can('receipt:create') ? `<button class="btn primary" data-act="go" data-r="create" data-kind="purchase">${ic('plus')}Tạo phiếu mua</button><button class="btn" data-act="go" data-r="create" data-kind="sale">Tạo phiếu bán</button>` : '')}
    <div class="kpis">
      <div class="card kpi hero"><span class="l">Đã chi mua hôm nay</span><span class="v">${vnd(sum(today, totalOf))}</span><span class="d">${today.length} phiếu · ${kg(sum(today, netOf))} tính tiền</span></div>
      <div class="card kpi"><span class="l">Chi mua 7 ngày</span><span class="v">${vnd(sum(w, totalOf))}</span><span class="d">${w.length} phiếu</span></div>
      <div class="card kpi"><span class="l">Chi mua 30 ngày</span><span class="v">${vnd(sum(m, totalOf))}</span><span class="d">${kg(sum(m, netOf))}</span></div>
      <div class="card kpi"><span class="l">Bán ra 30 ngày</span><span class="v">${vnd(sum(s30, totalOf))}</span><span class="d">${s30.length ? s30.length + ' phiếu bán' : 'Chưa có phiếu bán nào'}</span></div>
    </div>
    <div class="split">
      <section class="card"><div class="card-h"><h3>Bảy ngày gần đây</h3><span class="muted">Tiền chi mua mỗi ngày</span></div><div class="card-b">${barChart(vals, labels, vnd)}</div></section>
      <section class="card"><div class="card-h"><h3>Việc cần làm hôm nay</h3></div><div class="todo">${todo.map(([n, t, r, k, extra]) => `<button data-act="go" data-r="${r}" ${extra ? `data-tab="${extra.tab}"` : ''}><span class="n ${k}">${n}</span><span class="txt">${t}</span>${ic('chev')}</button>`).join('')}</div></section>
    </div>${branchStrip}
    <section class="card"><div class="card-h"><h3>Phiếu mới nhất</h3><button class="btn sm" data-act="go" data-r="receipts">Xem tất cả</button></div><div class="table-wrap">${receiptTable(recent)}</div></section>`;
  },
};

function receiptTable(rows, withBranch = false) {
  if (!rows.length) return '<div class="empty"><b>Chưa có phiếu nào</b><span>Bấm "Tạo phiếu mua" để ghi phiếu cân đầu tiên.</span></div>';
  const B = BOOK();
  return `<table class="t"><thead><tr><th>Phiếu</th><th class="hide-sm">Thời gian</th><th>Đối tác</th><th class="hide-md">Mặt hàng</th>${withBranch ? '<th class="hide-md">Chi nhánh</th>' : ''}<th class="num hide-sm">Tính tiền</th><th class="num">Tổng</th><th class="num hide-sm">Còn nợ</th><th class="hide-sm"></th></tr></thead><tbody>${rows.map((r) => `<tr class="click" data-act="go" data-r="receipt" data-id="${r.id}" data-q="${esc((r.code + ' ' + pname(B, r.partnerId)).toLowerCase())}">
    <td><div class="cellname"><span class="mono ${r.kind === 'sale' ? 'kind-out' : 'kind-in'}">${r.code}</span><small>${r.kind === 'sale' ? 'Bán' : 'Mua'}</small></div></td><td class="hide-sm">${fmtDate(r.at)}</td><td>${esc(pname(B, r.partnerId))}</td><td class="hide-md">${r.lines.map((l) => B.products[l.pid].short).join(', ')}</td>${withBranch ? `<td class="hide-md">${esc(branchName(r.branchId).replace('Chi nhánh ', ''))}</td>` : ''}
    <td class="num hide-sm">${kg(netOf(r))}</td><td class="num"><b>${vnd(totalOf(r))}</b></td><td class="num hide-sm ${debtOf(r) ? (r.kind === 'sale' ? 'amt-recv' : 'amt-pay') : 'muted'}">${debtOf(r) ? vnd(debtOf(r)) : '—'}</td><td class="hide-sm">${statusPill(r)}</td></tr>`).join('')}</tbody></table>`;
}

/* ─── Danh sách phiếu ─── */
VIEWS.receipts = {
  title: 'Phiếu', short: 'Phiếu', icon: 'receipt', show: isBook,
  render() {
    const all = myReceipts(), drafts = all.filter((r) => r.status !== 'done'); const B = BOOK();
    let rows = all.filter((r) => r.status === 'done');
    if (S.rkind !== 'all') rows = rows.filter((r) => r.kind === S.rkind);
    rows = rows.filter((r) => r.at >= T0 - (+S.rperiod - 1) * DAY);
    const wb = TYPE() === 'enterprise' && !P().branch;
    const seg = (key, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button data-act="set" data-k="${key}" data-v="${v}" aria-pressed="${S[key] === v}">${l}</button>`).join('')}</div>`;
    const body = S.rtab === 'draft'
      ? (drafts.length ? `<table class="t"><thead><tr><th>Đối tác</th><th>Mặt hàng</th><th>Trạng thái</th><th class="hide-sm">Cập nhật</th><th></th></tr></thead><tbody>${drafts.map((r) => `<tr><td>${esc(pname(B, r.partnerId))}${r.note ? `<div class="hint">${esc(r.note)}</div>` : ''}</td><td>${r.lines.map((l) => B.products[l.pid].short + ' · ' + kg(parseNum(l.gross))).join(', ')}</td><td><span class="pill ${r.status === 'weighing' ? 'warn' : 'plain'}">${r.status === 'weighing' ? 'Đang cân' : 'Để dành'}</span></td><td class="hide-sm">${fmtDate(r.at)} · ${esc(r.by)}</td><td class="num">${can('receipt:create') ? `<button class="btn sm primary" data-act="go" data-r="create" data-edit="${r.id}">Cân tiếp</button>` : ''}</td></tr>`).join('')}</tbody></table>` : '<div class="empty"><b>Không có phiếu nháp</b><span>Phiếu cân dở hoặc để dành sẽ nằm ở đây.</span></div>')
      : receiptTable(rows, wb);
    return `${pagehead('Phiếu', 'Mỗi phiếu ghi trên máy trước rồi tự gửi lên mạng. Phiếu chưa gửi có nhãn vàng.', `${can('receipt:create') ? `<button class="btn primary" data-act="go" data-r="create" data-kind="purchase">${ic('plus')}Tạo phiếu mua</button><button class="btn" data-act="go" data-r="create" data-kind="sale">Tạo phiếu bán</button>` : ''}<button class="btn" data-act="export" data-what="Danh sách phiếu (Excel)">${ic('download')}Lưu ra file</button>`)}
    <section class="card"><div class="tabs" role="tablist" style="padding:0 10px"><button role="tab" aria-selected="${S.rtab === 'done'}" data-act="set" data-k="rtab" data-v="done">Đã xong<span class="c">${all.length - drafts.length}</span></button><button role="tab" aria-selected="${S.rtab === 'draft'}" data-act="set" data-k="rtab" data-v="draft">Nháp<span class="c">${drafts.length}</span></button></div>
    ${S.rtab === 'done' ? `<div class="toolbar">${seg('rkind', [['all', 'Tất cả'], ['purchase', 'Mua'], ['sale', 'Bán']])}${seg('rperiod', [['1', 'Hôm nay'], ['7', '7 ngày'], ['30', '30 ngày']])}<input class="input" id="rsearch" placeholder="Tìm mã phiếu, tên…" data-in="rsearch" aria-label="Tìm phiếu"><span class="muted" style="margin-left:auto;font-size:.85em">${rows.length} phiếu · ${kg(sum(rows, netOf))} · <b>${vnd(sum(rows, totalOf))}</b></span></div>` : ''}
    <div class="table-wrap">${body}</div></section>`;
  },
};
INP.rsearch = (el) => { const q = el.value.trim().toLowerCase(); $$('#view tr[data-q]').forEach((tr) => { tr.hidden = q && !tr.dataset.q.includes(q); }); };

/* ─── Chi tiết phiếu ─── */
VIEWS.receipt = {
  title: () => { const f = findReceipt(S.params.id); return f ? 'Phiếu ' + f.r.code : 'Phiếu'; }, icon: 'receipt', show: () => isBook() && !!findReceipt(S.params.id),
  render() {
    const { r, B } = findReceipt(S.params.id); const p = B.partners[r.partnerId]; const o = r.orderId && S.orders.find((x) => x.id === r.orderId);
    const linked = p && p.link && p.link.status === 'active';
    const pays = r.pays.map((x) => `<tr><td>${fmtDate(x.at)}</td><td class="num ${x.voided ? 'muted' : ''}">${x.voided ? '<s>' + vnd(x.amount) + '</s>' : vnd(x.amount)}</td><td class="num">${x.voided ? '<span class="pill plain">Đã huỷ</span>' : can('payment:void') ? `<button class="btn sm ghost" data-act="voidPay" data-id="${x.id}">Huỷ lần trả</button>` : ''}</td></tr>`).join('');
    return `<div class="split"><div class="stack">${voucher(r, B, P().org)}</div><div class="stack">
     <section class="card"><div class="card-h"><h3>Thanh toán</h3>${statusPill(r)}</div><div class="card-b"><dl class="kv"><dt>Tổng phiếu</dt><dd>${vnd(totalOf(r))}</dd><dt>Đã trả</dt><dd>${vnd(paidOf(r))}</dd><dt>Còn nợ</dt><dd class="${debtOf(r) ? (r.kind === 'sale' ? 'amt-recv' : 'amt-pay') : ''}">${vnd(debtOf(r))}</dd></dl></div>
      ${pays ? `<div class="table-wrap"><table class="t"><tbody>${pays}</tbody></table></div>` : ''}
      <div class="card-b row">${debtOf(r) && can('payment:record') ? `<button class="btn primary" data-act="payPart" data-id="${r.id}">${r.kind === 'sale' ? 'Thu thêm' : 'Trả thêm'}</button>` : ''}<button class="btn" data-act="zalo" data-id="${r.id}">${ic('send')}Gửi Zalo</button><button class="btn" data-act="export" data-what="Phiếu in khổ 80mm">${ic('printer')}In</button></div></section>
     <section class="card"><div class="card-h"><h3>Thông tin thêm</h3></div><div class="card-b"><dl class="kv">
      <dt>Người lập</dt><dd>${esc(r.by)}</dd>${r.branchId && TYPE() === 'enterprise' ? `<dt>Chi nhánh</dt><dd>${esc(branchName(r.branchId))}</dd>` : ''}
      <dt>Theo đơn</dt><dd>${o ? `<button class="link" data-act="openOrder" data-id="${o.id}">${o.code}</button>` : '—'}</dd>
      <dt>Ảnh chứng từ</dt><dd>${r.photos ? r.photos + ' ảnh' : 'Không có'}</dd><dt>Đồng bộ</dt><dd>${r.pending ? 'Chờ gửi' : 'Đã lên mạng'}</dd></dl>
      ${r.photos ? `<div class="photos" style="margin-top:12px">${Array.from({ length: r.photos }, () => `<div class="ph">${ic('camera')}</div>`).join('')}</div><p class="hint" style="margin-top:6px">Ảnh mở bằng đường dẫn ký sẵn, hết hạn sau 10 phút.</p>` : ''}</div></section>
     ${linked ? `<div class="banner ok">${ic('link')}<div class="grow"><b>${esc(p.name)} xem được phiếu này</b> qua kết nối — chỉ phần in trên biên nhận, không thấy ghi chú nội bộ.</div></div>` : ''}
     ${can('receipt:delete') ? `<button class="btn danger" data-act="delReceipt" data-id="${r.id}">${ic('trash')}Xoá phiếu</button>` : ''}
    </div></div>`;
  },
};
ACT.payPart = (d) => {
  const { r } = findReceipt(d.id); const debt = debtOf(r);
  openDialog(`${dlgHead(r.kind === 'sale' ? 'Thu thêm' : 'Trả thêm', 'Phiếu ' + r.code + ' · còn nợ ' + vnd(debt))}<form class="dlg-b" data-form="payPart" data-id="${r.id}"><div class="field"><label for="ppAmt">Số tiền</label><input class="input r" id="ppAmt" name="amt" inputmode="numeric" value="${debt.toLocaleString('vi-VN')}" autofocus><span class="hint">${moneyWords(debt)}</span></div><div class="dlg-f" style="margin:0 -18px -18px"><button type="button" class="btn" data-act="close">Bỏ qua</button><button class="btn primary">Ghi lần trả</button></div></form>`);
};
FORM.payPart = (f) => {
  const { r } = findReceipt(f.dataset.id); const a = parseNum(f.amt.value);
  if (!(a > 0) || a > debtOf(r)) { toast('Số tiền phải lớn hơn 0 và không quá ' + vnd(debtOf(r)), 'alert'); return; }
  r.pays.push(pay(a, Date.now())); pushOp('Ghi lần trả ' + vnd(a) + ' cho ' + r.code, r); closeDialog(); render(); toast('Đã ghi lần trả ' + vnd(a));
};
ACT.voidPay = (d) => {
  const f = findReceipt(S.params.id); const x = f.r.pays.find((p) => p.id === d.id);
  confirmDialog({ title: 'Huỷ lần trả ' + vnd(x.amount) + '?', body: '<p>Lần trả vẫn nằm trong lịch sử, có gạch ngang. Máy khác sẽ thấy huỷ sau khi đồng bộ.</p>', ok: 'Huỷ lần trả', danger: true, onOk: () => { x.voided = true; pushOp('Huỷ lần trả ' + vnd(x.amount) + ' của ' + f.r.code, f.r); render(); toast('Đã huỷ lần trả'); } });
};
ACT.delReceipt = (d) => {
  const { r } = findReceipt(d.id);
  confirmDialog({ title: 'Xoá phiếu ' + r.code + '?', body: `<p>Phiếu ${vnd(totalOf(r))} của ${esc(pname(BOOK(), r.partnerId))} sẽ bị xoá trên mọi máy. Nếu máy khác đang sửa phiếu này, xoá vẫn thắng.</p>`, ok: 'Xoá phiếu', danger: true, onOk: () => { r.deleted = true; pushOp('Xoá phiếu ' + r.code, r); go('receipts'); toast('Đã xoá phiếu ' + r.code); } });
};
ACT.zalo = (d) => {
  const { r, B } = findReceipt(d.id); const t = `${ORG().name}\n${r.kind === 'sale' ? 'Phiếu bán' : 'Phiếu thu mua'} ${r.code} — ${fmtDay(r.at)}\n${r.lines.map((l) => B.products[l.pid].name + ': ' + num(lineNet(l)) + ' kg × ' + vnd(parseNum(l.price)) + ' = ' + vnd(lineAmt(l))).join('\n')}\nTổng: ${vnd(totalOf(r))}\nĐã trả: ${vnd(paidOf(r))}\nCòn nợ: ${vnd(debtOf(r))}`;
  openDialog(`${dlgHead('Gửi Zalo', 'Chép nội dung rồi dán vào Zalo của ' + esc(pname(B, r.partnerId)))}<div class="dlg-b"><textarea class="input mono" id="zaloText" rows="8" readonly>${esc(t)}</textarea></div><div class="dlg-f"><button class="btn" data-act="close">Đóng</button><button class="btn primary" data-act="copyEl" data-el="zaloText">${ic('copy')}Chép nội dung</button></div>`);
};
ACT.copyEl = (d) => { const el = $('#' + d.el); el.select(); copyText(el.value); };
ACT.export = (d) => toast((d.what || 'File') + ': app thật sẽ tải file về máy. Bản demo không tải file.');

/* ─── Tạo phiếu ─── */
function blankLine(kind, pid = 'cs') { const pr = BOOK().products[pid]; return { pid, formula: pr.formula, gross: '', tare: '', drc: '', loss: pr.loss ? showNum(pr.loss) : '', price: String(kind === 'sale' ? pr.sale : pr.price) }; }
function newDraft(kind = 'purchase', orderId = '', editId = '', gross = '') {
  const d = { kind, partnerId: '', orderId: orderId || '', branchId: P().branch || (TYPE() === 'enterprise' ? 'br1' : null), lines: [blankLine(kind)], adj: [], pay: '', photos: 0, note: '', err: {}, editId: editId || '' };
  if (editId) { const r = BOOK().receipts.find((x) => x.id === editId); Object.assign(d, { kind: r.kind, partnerId: r.partnerId || '', orderId: r.orderId || '', branchId: r.branchId, note: r.note, photos: r.photos, lines: r.lines.map((l) => ({ ...l, gross: showNum(l.gross), tare: showNum(l.tare), drc: showNum(l.drc), loss: showNum(l.loss), price: String(l.price) })), adj: r.adj.map((a) => ({ ...a })) }); }
  if (orderId) { const o = S.orders.find((x) => x.id === orderId); d.partnerId = o.partner[P().org] || ''; d.kind = oview(o).side === 'buyer' ? 'purchase' : 'sale'; d.lines = [blankLine(d.kind, o.crop)]; }
  if (gross) d.lines[0].gross = gross;
  return d;
}
const openOrdersFor = (kind) => myOrders().filter((o) => ['accepted', 'scheduled'].includes(o.status) && oview(o).side === (kind === 'purchase' ? 'buyer' : 'seller'));
VIEWS.create = {
  title: () => (S.draft && S.draft.kind === 'sale' ? 'Tạo phiếu bán' : 'Tạo phiếu mua'), icon: 'plus', show: () => isBook() && can('receipt:create'),
  render() {
    const d = S.draft || (S.draft = newDraft()); const B = BOOK(); const bill = S.billing[P().org];
    if (bill && bill.tier === 'free') return `<section class="card"><div class="quota">${ic('lock', 40)}<h2>Tạm khoá ghi phiếu mới</h2><p class="muted" style="max-width:52ch">Gói của vựa đã hết. Sổ cũ vẫn xem và lưu ra file được. Đơn và kết nối vẫn dùng miễn phí.</p>${can('billing:manage') ? '<button class="btn primary" data-act="go" data-r="plans">Gia hạn 149.000đ/tháng</button>' : '<p class="hint">Báo chủ vựa gia hạn.</p>'}</div></section>`;
    const parts = Object.values(B.partners).filter((p) => p.kind === (d.kind === 'purchase' ? 'supplier' : 'buyer'));
    const ords = openOrdersFor(d.kind);
    const e = d.err;
    const lineHtml = d.lines.map((l, i) => `<div class="line"><div class="fields"><div class="field"><label for="pid${i}">Mặt hàng</label><select class="input" id="pid${i}" data-chg="dlPid" data-i="${i}">${Object.entries(B.products).map(([k, p]) => `<option value="${k}" ${k === l.pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="fm${i}">Cách tính</label><select class="input" id="fm${i}" data-chg="dlFormula" data-i="${i}">${Object.entries(FORMULAS).map(([k, v]) => `<option value="${k}" ${k === l.formula ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>
      <div class="fields">${numField('gross', i, 'Cân được (kg)', l.gross, e['gross' + i])}${l.formula !== 'standard' ? numField('tare', i, 'Trừ bì (kg)', l.tare, e['tare' + i]) : ''}${l.formula === 'rubber' ? numField('drc', i, 'Hàm lượng mủ (%)', l.drc, e['drc' + i]) : ''}${l.formula === 'loss' ? numField('loss', i, 'Trừ hao hụt (%)', l.loss, e['loss' + i]) : ''}${numField('price', i, 'Đơn giá (' + B.products[l.pid].unit + ')', l.price, e['price' + i])}</div>
      <div class="line-res"><span class="muted">${FORMULA_HINT[l.formula]}</span><span>Tính tiền theo <b id="ln-net-${i}">${kg(lineNet(l))}</b> · Thành tiền <b id="ln-tot-${i}">${vnd(lineAmt(l))}</b></span>${d.lines.length > 1 ? `<button class="btn sm ghost" data-act="dlRemove" data-i="${i}">${ic('trash', 15)}Bỏ dòng</button>` : ''}</div></div>`).join('');
    const adjHtml = d.adj.map((a, i) => `<div class="row" style="flex-wrap:nowrap"><span class="${a.sign < 0 ? 'amt-pay' : 'kind-in'}" style="width:1em">${a.sign < 0 ? '−' : '+'}</span><input class="input" value="${esc(a.label)}" data-in="adj" data-f="label" data-i="${i}" aria-label="Khoản"><input class="input r" style="max-width:150px" inputmode="numeric" value="${esc(a.amount)}" data-in="adj" data-f="amount" data-i="${i}" aria-label="Số tiền"><button class="iconbtn" data-act="adjRemove" data-i="${i}" aria-label="Bỏ khoản">${ic('x')}</button></div>`).join('');
    return `<div class="create"><div class="stack">
      <section class="card"><div class="card-b stack">
        <div class="seg" role="group" aria-label="Loại phiếu"><button data-act="dKind" data-v="purchase" aria-pressed="${d.kind === 'purchase'}">Phiếu mua</button><button data-act="dKind" data-v="sale" aria-pressed="${d.kind === 'sale'}">Phiếu bán</button></div>
        <div class="fields">
          <div class="field"><label for="dPartner">${d.kind === 'purchase' ? 'Người bán' : 'Người mua'}</label><select class="input ${e.partner ? 'bad' : ''}" id="dPartner" data-chg="dPartner"><option value="">Khách lẻ</option>${parts.map((p) => `<option value="${p.id}" ${p.id === d.partnerId ? 'selected' : ''}>${esc(p.name)}${p.link && p.link.status === 'active' ? ' · đã kết nối' : ''}</option>`).join('')}</select></div>
          <div class="field"><label for="dOrder">Theo đơn</label><select class="input" id="dOrder" data-chg="dOrder"><option value="">Không theo đơn</option>${ords.map((o) => `<option value="${o.id}" ${o.id === d.orderId ? 'selected' : ''}>${o.code} · ${esc(oview(o).cpName)} · ${PRODUCTS[o.crop].short} ${num(o.qty)} kg</option>`).join('')}</select><span class="hint">${ords.length ? 'Chọn đơn thì điền sẵn người ' + (d.kind === 'purchase' ? 'bán' : 'mua') + '; đồng bộ xong đơn tự sang "Đã cân xong".' : 'Không có đơn nào đang mở.'}</span></div>
          ${TYPE() === 'enterprise' ? `<div class="field"><label for="dBranch">Chi nhánh</label><select class="input" id="dBranch" data-chg="dBranch" ${P().branch ? 'disabled' : ''}>${BOOK().branches.filter((b) => !b.archived).map((b) => `<option value="${b.id}" ${b.id === d.branchId ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>` : ''}
        </div></div></section>
      <section class="card"><div class="card-h"><h3>Hàng cân</h3><button class="btn sm" data-act="dlAdd">${ic('plus', 15)}Thêm dòng</button></div><div class="card-b stack">${lineHtml}</div></section>
      <section class="card"><div class="card-h"><h3>Cộng / trừ thêm</h3><div class="row"><button class="btn sm" data-act="adjAdd" data-s="1">+ Cộng thêm</button><button class="btn sm" data-act="adjAdd" data-s="-1">− Trừ bớt</button></div></div><div class="card-b stack">${adjHtml || '<p class="hint">Ví dụ: phí xe đến lấy, tiền ứng trước, thưởng hàng đẹp.</p>'}</div></section>
      <section class="card"><div class="card-h"><h3>Ảnh phiếu cân / hoá đơn</h3><span class="muted">${d.photos}/3 ảnh</span></div><div class="card-b stack"><div class="photos">${Array.from({ length: d.photos }, (_, i) => `<div class="ph">${ic('camera')}<button class="iconbtn" data-act="phRemove" aria-label="Bỏ ảnh ${i + 1}">${ic('x', 14)}</button></div>`).join('')}${d.photos < 3 ? `<button class="ph addph" data-act="phAdd">${ic('camera', 22)}<span>Thêm ảnh</span></button>` : '<span class="hint">Đủ số ảnh cho một phiếu rồi</span>'}</div><p class="hint">Ảnh nén còn cạnh dài 1600px, lưu trong máy, có mạng thì tải lên kho riêng tư.</p>
        <div class="field"><label for="dNote">Ghi chú nội bộ</label><textarea class="input" id="dNote" data-in="dNote" placeholder="Bên kia không thấy ghi chú này">${esc(d.note)}</textarea></div></div></section>
    </div>
    <aside class="card sum"><div class="card-h"><h3>Tóm tắt phiếu</h3><span class="pill ${d.kind === 'sale' ? 'out' : 'ok'}">${d.kind === 'sale' ? 'Bán' : 'Mua'}</span></div><div class="card-b">
      <div class="sumrow"><span>Tổng tính tiền</span><b id="s-net"></b></div><div class="sumrow"><span>Tạm tính</span><span id="s-raw"></span></div><div class="sumrow"><span>Cộng / trừ thêm</span><span id="s-adj"></span></div>
      <div class="sumrow big"><span>Tổng phiếu</span><span id="s-total"></span></div><p class="v-words" id="s-words"></p>
      <div class="field" style="margin-top:12px"><label for="dPay">${d.kind === 'sale' ? 'Thu ngay' : 'Trả ngay'}</label><div class="row" style="flex-wrap:nowrap"><input class="input r ${e.pay ? 'bad' : ''}" id="dPay" inputmode="numeric" value="${esc(d.pay)}" data-in="dPay" placeholder="0"><button class="btn sm" data-act="payAll">Trả đủ</button></div>${e.pay ? `<span class="err">${e.pay}</span>` : ''}</div>
      <div class="sumrow" style="margin-top:8px"><span>Còn nợ</span><b id="s-debt" class="${d.kind === 'sale' ? 'amt-recv' : 'amt-pay'}"></b></div>
      <div class="stack" style="margin-top:14px;gap:8px"><button class="btn primary block" data-act="saveReceipt">${ic('check')}Lưu phiếu</button><button class="btn block" data-act="saveDraft">Để dành</button></div>
      <p class="hint" style="margin-top:10px">${S.online ? 'Lưu xong gửi lên mạng ngay.' : 'Không có mạng — phiếu vẫn lưu trên máy, có mạng sẽ tự gửi.'}</p></div></aside></div>`;
  },
  after: refreshTotals,
};
function numField(f, i, label, v, err) { return `<div class="field"><label for="${f}${i}">${label}</label><input class="input r ${err ? 'bad' : ''}" id="${f}${i}" inputmode="decimal" value="${esc(v)}" data-in="dl" data-f="${f}" data-i="${i}" placeholder="0">${err ? `<span class="err">${err}</span>` : ''}</div>`; }
function draftTotals(d) { const r = { lines: d.lines, adj: d.adj, pays: [] }; const total = totalOf(r), pay = parseNum(d.pay) || 0; return { net: netOf(r), raw: rawOf(r), adj: adjOf(r), total, debt: Math.max(0, total - pay) }; }
function refreshTotals() {
  const d = S.draft; if (!d || !$('#s-total')) return; const t = draftTotals(d);
  d.lines.forEach((l, i) => { const a = $('#ln-net-' + i), b = $('#ln-tot-' + i); if (a) a.textContent = kg(lineNet(l)); if (b) b.textContent = vnd(lineAmt(l)); });
  $('#s-net').textContent = kg(t.net); $('#s-raw').textContent = vnd(t.raw); $('#s-adj').textContent = (t.adj < 0 ? '−' : '+') + vnd(Math.abs(t.adj)); $('#s-total').textContent = vnd(t.total); $('#s-words').textContent = moneyWords(t.total); $('#s-debt').textContent = vnd(t.debt);
}
INP.dl = (el) => { S.draft.lines[+el.dataset.i][el.dataset.f] = el.value; refreshTotals(); };
INP.adj = (el) => { S.draft.adj[+el.dataset.i][el.dataset.f] = el.value; refreshTotals(); };
INP.dPay = (el) => { S.draft.pay = el.value; refreshTotals(); };
INP.dNote = (el) => { S.draft.note = el.value; };
CHG.dlPid = (el) => { const i = +el.dataset.i; S.draft.lines[i] = { ...blankLine(S.draft.kind, el.value), gross: S.draft.lines[i].gross }; render(); };
CHG.dlFormula = (el) => { S.draft.lines[+el.dataset.i].formula = el.value; render(); };
CHG.dPartner = (el) => { S.draft.partnerId = el.value; };
CHG.dBranch = (el) => { S.draft.branchId = el.value; };
CHG.dOrder = (el) => { const d = S.draft; d.orderId = el.value; if (el.value) { const o = S.orders.find((x) => x.id === el.value); d.partnerId = o.partner[P().org] || d.partnerId; if (!d.lines[0].gross) d.lines[0] = blankLine(d.kind, o.crop); } render(); };
ACT.dKind = (d) => { S.draft = newDraft(d.v); render(); };
ACT.dlAdd = () => { S.draft.lines.push(blankLine(S.draft.kind, S.draft.lines[S.draft.lines.length - 1].pid)); render(); };
ACT.dlRemove = (d) => { S.draft.lines.splice(+d.i, 1); render(); };
ACT.adjAdd = (d) => { S.draft.adj.push({ label: +d.s < 0 ? 'Phí xe đến lấy' : 'Thưởng hàng đẹp', amount: '', sign: +d.s }); render(); };
ACT.adjRemove = (d) => { S.draft.adj.splice(+d.i, 1); render(); };
ACT.phAdd = () => { if (S.draft.photos < 3) S.draft.photos++; render(); };
ACT.phRemove = () => { S.draft.photos = Math.max(0, S.draft.photos - 1); render(); };
ACT.payAll = () => { S.draft.pay = draftTotals(S.draft).total.toLocaleString('vi-VN'); render(); };
function validateDraft(d, strict) {
  const e = {};
  d.lines.forEach((l, i) => {
    const g = parseNum(l.gross), t = parseNum(l.tare), pr = parseNum(l.price);
    if (Number.isNaN(g)) e['gross' + i] = 'Số chưa đúng — phẩy là phần lẻ, chấm ngăn nghìn';
    else if (strict && !(g > 0)) e['gross' + i] = 'Nhập số cân';
    if (l.formula !== 'standard' && t >= g && g > 0) e['tare' + i] = 'Bì phải nhỏ hơn số cân';
    if (strict && l.formula === 'rubber' && !(parseNum(l.drc) > 0 && parseNum(l.drc) <= 100)) e['drc' + i] = 'Hàm lượng từ 1 đến 100%';
    if (strict && !(pr > 0)) e['price' + i] = 'Nhập đơn giá';
  });
  const t = draftTotals(d); if ((parseNum(d.pay) || 0) > t.total) e.pay = 'Trả nhiều hơn tổng phiếu';
  return e;
}
function draftToReceipt(d, status) {
  const B = BOOK();
  const lines = d.lines.map((l) => ({ pid: l.pid, formula: l.formula, gross: parseNum(l.gross) || 0, tare: parseNum(l.tare) || 0, drc: parseNum(l.drc) || 0, loss: parseNum(l.loss) || 0, price: parseNum(l.price) || 0 }));
  const adj = d.adj.filter((a) => parseNum(a.amount) > 0).map((a) => ({ label: a.label || 'Khoản khác', amount: parseNum(a.amount), sign: a.sign }));
  let r = d.editId && B.receipts.find((x) => x.id === d.editId);
  if (!r) { r = { id: uid('r'), code: '', kind: d.kind, pays: [], by: P().name, at: Date.now() }; B.receipts.unshift(r); }
  Object.assign(r, { kind: d.kind, partnerId: d.partnerId || null, lines, adj, status, photos: d.photos, note: d.note, branchId: TYPE() === 'enterprise' ? d.branchId : null, orderId: d.orderId || null, at: Date.now() });
  if (status === 'done' && !r.code) { const pre = d.kind === 'purchase' ? 'PM-' : 'PB-'; const max = Math.max(0, ...B.receipts.filter((x) => x.code && x.code.startsWith(pre)).map((x) => +x.code.slice(3))); r.code = pre + String(max + 1).padStart(4, '0'); }
  const pv = parseNum(d.pay) || 0; if (status === 'done' && pv > 0) r.pays.push(pay(pv, Date.now()));
  return r;
}
ACT.saveReceipt = () => {
  const d = S.draft; d.err = validateDraft(d, true); if (Object.keys(d.err).length) { render(); toast('Còn ô chưa đúng — xem chữ đỏ', 'alert'); return; }
  const r = draftToReceipt(d, 'done'); pushOp('Lập phiếu ' + r.code, r); S.draft = null; go('receipt', { id: r.id }); toast('Đã lưu phiếu ' + r.code + (S.online ? '' : ' trên máy'));
};
ACT.saveDraft = () => { const d = S.draft; d.err = validateDraft(d, false); if (Object.keys(d.err).length) { render(); return; } const r = draftToReceipt(d, d.lines.some((l) => parseNum(l.gross) > 0) ? 'weighing' : 'saved'); pushOp('Lưu nháp ' + pname(BOOK(), r.partnerId), r); S.draft = null; S.rtab = 'draft'; go('receipts'); toast('Đã để dành phiếu'); };

/* ─── Công nợ ─── */
VIEWS.debts = {
  title: 'Công nợ', short: 'Công nợ', icon: 'wallet', show: isBook,
  render() {
    const pay = debtGroups('purchase'), recv = debtGroups('sale'); const B = BOOK();
    const col = (groups, kind) => groups.length ? groups.map((g) => { const late = dayIndex(g.oldest); return `<div class="ocard" style="cursor:default"><div class="top2"><div class="cellname"><b>${esc(pname(B, g.pid))}</b><small>${g.rs.length} phiếu · cũ nhất ${late} ngày trước</small></div><b class="num ${kind === 'sale' ? 'amt-recv' : 'amt-pay'}" style="font-size:1.15em">${vnd(g.debt)}</b></div><div class="row">${late > 15 ? '<span class="pill alert">Quá 15 ngày</span>' : ''}${can('payment:record') ? `<button class="btn sm ${kind === 'sale' ? '' : 'primary'}" data-act="payDebt" data-pid="${g.pid || ''}" data-kind="${kind}">${kind === 'sale' ? 'Thu tiền' : 'Trả tiền'}</button>` : ''}<button class="btn sm ghost" data-act="debtList" data-pid="${g.pid || ''}" data-kind="${kind}">Xem phiếu</button></div></div>`; }).join('') : '<div class="empty"><b>Không ai còn nợ</b></div>';
    return `${pagehead('Công nợ', 'Trả nợ theo người: tiền trả vào phiếu cũ nhất trước.', `<button class="btn" data-act="export" data-what="Bảng công nợ (Excel)">${ic('download')}Lưu ra file</button>`)}
    <div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="card kpi"><span class="l">Mình còn nợ người bán</span><span class="v amt-pay">${vnd(sum(pay, (g) => g.debt))}</span><span class="d">${pay.length} người</span></div><div class="card kpi"><span class="l">Người mua còn nợ mình</span><span class="v amt-recv">${vnd(sum(recv, (g) => g.debt))}</span><span class="d">${recv.length} người</span></div></div>
    <div class="g2"><section class="card"><div class="card-h"><h3>Mình còn nợ</h3><span class="muted">Phiếu mua chưa trả đủ</span></div>${col(pay, 'purchase')}</section><section class="card"><div class="card-h"><h3>Còn phải thu</h3><span class="muted">Phiếu bán chưa thu đủ</span></div>${col(recv, 'sale')}</section></div>`;
  },
};
const groupOf = (pid, kind) => debtGroups(kind).find((g) => (g.pid || '') === pid);
ACT.debtList = (d) => { const g = groupOf(d.pid, d.kind); openDialog(`${dlgHead(esc(pname(BOOK(), g.pid)), g.rs.length + ' phiếu còn nợ')}<div class="table-wrap">${receiptTable(g.rs)}</div>`, 'drawer'); };
ACT.payDebt = (d) => {
  const g = groupOf(d.pid, d.kind);
  openDialog(`${dlgHead((d.kind === 'sale' ? 'Thu tiền ' : 'Trả tiền ') + esc(pname(BOOK(), g.pid)), 'Tổng còn nợ ' + vnd(g.debt))}<form class="dlg-b" data-form="payDebt" data-pid="${d.pid}" data-kind="${d.kind}"><div class="field"><label for="pdAmt">Số tiền</label><input class="input r" id="pdAmt" name="amt" inputmode="numeric" value="${g.debt.toLocaleString('vi-VN')}" data-in="pdAmt" autofocus></div><div id="pdAlloc"></div><div class="dlg-f" style="margin:0 -18px -18px"><button type="button" class="btn" data-act="close">Bỏ qua</button><button class="btn primary">Ghi ${d.kind === 'sale' ? 'thu' : 'trả'}</button></div></form>`);
  INP.pdAmt($('#pdAmt'));
};
function allocate(g, amt) { const out = []; let left = amt; g.rs.slice().sort((a, b) => a.at - b.at).forEach((r) => { if (left <= 0) return; const x = Math.min(left, debtOf(r)); out.push([r, x]); left -= x; }); return out; }
INP.pdAmt = (el) => { const f = el.form; const g = groupOf(f.dataset.pid, f.dataset.kind); const a = parseNum(el.value) || 0; $('#pdAlloc').innerHTML = `<p class="lbl">Chia vào phiếu (cũ nhất trước)</p><table class="t"><tbody>${allocate(g, a).map(([r, x]) => `<tr><td class="mono">${r.code}</td><td>${fmtDay(r.at)}</td><td class="num">${vnd(x)}${x === debtOf(r) ? ' <span class="pill ok">đủ</span>' : ''}</td></tr>`).join('')}</tbody></table>${a > g.debt ? '<p class="err">Nhiều hơn tổng còn nợ</p>' : ''}`; };
FORM.payDebt = (f) => { const g = groupOf(f.dataset.pid, f.dataset.kind); const a = parseNum(f.amt.value) || 0; if (!(a > 0) || a > g.debt) { toast('Số tiền phải lớn hơn 0 và không quá ' + vnd(g.debt), 'alert'); return; } allocate(g, a).forEach(([r, x]) => { r.pays.push(pay(x, Date.now())); pushOp('Ghi trả ' + vnd(x) + ' cho ' + r.code, r); }); closeDialog(); render(); toast('Đã ghi ' + vnd(a) + ' cho ' + pname(BOOK(), g.pid)); };
