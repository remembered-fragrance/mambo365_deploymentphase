/* views-more.js — đơn, kết nối, đối tác, mặt hàng, kho, giá, báo cáo, tiện ích, nhập dữ liệu */
'use strict';

/* ─── Đơn hàng (dùng chung mọi vỏ) ─── */
VIEWS.orders = {
  title: () => (TYPE() === 'farmer' ? 'Đơn của tôi' : 'Đơn hàng'), short: 'Đơn', icon: 'order', show: () => TYPE() !== 'admin',
  render() {
    const list = myOrders().sort((a, b) => b.events[b.events.length - 1].at - a.events[a.events.length - 1].at);
    const f = S.otab; const rows = list.filter((o) => f === 'all' || (f === 'open' ? OPEN.includes(o.status) : f === 'in' ? !oview(o).isCreator : oview(o).isCreator));
    const tabs = [['all', 'Tất cả'], ['open', 'Đang mở'], ['in', 'Đơn tới'], ['out', 'Đơn gửi đi']];
    const canCreate = can('order:create') && linkedPartners().length;
    return `${pagehead(vtitle('orders'), 'Đơn cần mạng và chỉ gửi được cho bên đã kết nối. Đơn miễn phí cho mọi bên.', canCreate ? `<button class="btn primary" data-act="${TYPE() === 'farmer' ? 'go' : 'newOrder'}" data-r="fneworder">${ic('plus')}${TYPE() === 'farmer' ? 'Tạo đơn bán' : 'Tạo đơn'}</button>` : '')}
    <section class="card"><div class="tabs" style="padding:0 10px">${tabs.map(([v, l]) => `<button aria-selected="${f === v}" data-act="set" data-k="otab" data-v="${v}">${l}</button>`).join('')}</div>
    ${rows.length ? rows.map(orderCard).join('') : '<div class="empty"><b>Không có đơn nào</b><span>Đơn từ bên đã kết nối sẽ hiện ở đây.</span></div>'}</section>`;
  },
};
function orderCard(o) {
  const v = oview(o), st = ORDER_ST[o.status];
  return `<button class="ocard" data-act="openOrder" data-id="${o.id}"><div class="top2"><span class="row" style="gap:8px"><b class="mono">${o.code}</b><span class="pill ${st[1]}">${st[0]}</span>${!v.isCreator && o.status === 'submitted' ? '<span class="pill alert plain">Mới</span>' : ''}</span><span class="muted" style="font-size:.85em">${ago(o.events[o.events.length - 1].at)}</span></div>
   <div class="top2"><span>${v.side === 'seller' ? 'Bán cho' : 'Mua của'} <b>${esc(v.cpName)}</b> · ${PRODUCTS[o.crop].short} khoảng ${num(o.qty)} kg</span>${o.pickupAt && o.status === 'scheduled' ? `<span class="row" style="gap:6px;font-size:.88em">${ic('calendar', 15)}${fmtDate(o.pickupAt)}</span>` : ''}</div></button>`;
}
function openOrder(id, opts = {}) {
  const o = S.orders.find((x) => x.id === id); const v = oview(o), a = orderActs(o), st = ORDER_ST[o.status];
  const rc = Object.values(S.books).flatMap((B) => B.receipts).find((r) => r.orderId === o.id && !r.deleted && r.status === 'done');
  const evs = o.events.slice().reverse().map((e) => `<li><span class="dot ${e.by === P().org ? 'me' : ''}"></span><div><b>${ORDER_ST[e.to][0]}</b> · ${e.by === P().org ? 'mình' : esc(ORGS[e.by].name)}<br><small>${fmtDate(e.at)}</small>${e.note ? `<div class="hint">“${esc(e.note)}”</div>` : ''}</div></li>`).join('');
  openDialog(`${dlgHead('Đơn ' + o.code, (v.side === 'seller' ? 'Bán cho ' : 'Mua của ') + esc(v.cpName))}<div class="dlg-b">
   ${opts.conflict ? `<div class="banner warn">${ic('alert')}<div class="grow"><b>Bên kia vừa đổi đơn này.</b> Đã tải lại — xem trạng thái mới rồi làm tiếp. <span class="mono hint">ORDER_STATE_CHANGED</span></div></div>` : ''}
   <div class="row"><span class="pill ${st[1]}">${st[0]}</span><span class="muted mono" style="font-size:.85em">phiên bản ${o.version}</span></div>
   <dl class="kv"><dt>Mặt hàng</dt><dd>${PRODUCTS[o.crop].name}</dd><dt>Ước lượng</dt><dd>${kg(o.qty)}</dd>${o.pickupAt ? `<dt>Hẹn cân</dt><dd>${fmtDate(o.pickupAt)}</dd><dt>Địa chỉ</dt><dd>${esc(o.pickupAddress)}</dd>` : ''}${o.branch ? `<dt>Chi nhánh</dt><dd>${esc(branchName(o.branch))}</dd>` : ''}${rc ? `<dt>Phiếu</dt><dd class="mono">${rc.code} · ${vnd(totalOf(rc))}</dd>` : ''}</dl>
   ${o.note ? `<p class="hint">Ghi chú: ${esc(o.note)}</p>` : ''}<h3 style="font-size:.95em">Lịch sử</h3><ul class="tl">${evs}</ul>
   ${o.status === 'scheduled' || o.status === 'accepted' ? `<p class="hint">Không có nút "Đã cân xong": phiếu theo đơn đồng bộ lên thì đơn tự chuyển.</p>` : ''}</div>
   <div class="dlg-f">${a.cancel ? `<button class="btn danger" data-act="orderCancel" data-id="${o.id}">Huỷ đơn</button>` : ''}${a.accept ? `<button class="btn" data-act="orderReject" data-id="${o.id}">Từ chối</button><button class="btn primary" data-act="orderAccept" data-id="${o.id}">Nhận đơn</button>` : ''}${a.schedule ? `<button class="btn ${o.status === 'accepted' ? 'primary' : ''}" data-act="orderSchedule" data-id="${o.id}">${ic('calendar', 16)}${o.status === 'scheduled' ? 'Đổi lịch' : 'Hẹn lịch cân'}</button>` : ''}${a.weigh ? `<button class="btn primary" data-act="weighOrder" data-id="${o.id}">${ic('scale', 16)}Cân theo đơn</button>` : ''}${!a.cancel && !a.accept && !a.schedule && !a.weigh ? '<button class="btn" data-act="close">Đóng</button>' : ''}</div>`, 'drawer');
}
ACT.openOrder = (d) => openOrder(d.id);
function orderStep(id, to, extra = {}) {
  if (!needNet('đổi trạng thái đơn')) return;
  const o = S.orders.find((x) => x.id === id);
  if (o.conflict) { o.conflict = false; o.status = 'cancelled'; o.version++; o.events.push({ to: 'cancelled', by: o.creator, at: Date.now() - 4e4, note: 'Bán cho nhà khác rồi, xin lỗi vựa' }); render(); openOrder(id, { conflict: true }); return; }
  o.status = to; o.version++; if (extra.pickupAt) { o.pickupAt = extra.pickupAt; o.pickupAddress = extra.pickupAddress; }
  o.events.push({ to, by: P().org, at: Date.now(), note: extra.note || '' });
  const cp = oview(o).cp; if (['accepted', 'scheduled', 'cancelled'].includes(to)) S.notifs.push({ id: uid('n'), org: cp, kind: 'order.' + to, from: P().org, orderId: id, at: Date.now(), read: false, branch: o.branch });
  closeDialog(); render(); toast({ accepted: 'Đã nhận đơn ', scheduled: 'Đã hẹn lịch cho đơn ', cancelled: 'Đã huỷ đơn ', rejected: 'Đã từ chối đơn ' }[to] + o.code);
}
ACT.orderAccept = (d) => orderStep(d.id, 'accepted');
ACT.orderReject = (d) => confirmDialog({ title: 'Từ chối đơn?', body: '<p>Bên kia sẽ thấy đơn bị từ chối.</p>', ok: 'Từ chối', danger: true, onOk: () => orderStep(d.id, 'rejected') });
ACT.orderCancel = (d) => { ACT._cancelGo = () => orderStep(d.id, 'cancelled', { note: ($('#cnNote') || {}).value || '' }); openDialog(`${dlgHead('Huỷ đơn')}<div class="dlg-b"><div class="field"><label for="cnNote">Lý do (bên kia sẽ đọc)</label><input class="input" id="cnNote" placeholder="Ví dụ: hàng chưa đủ khô" autofocus></div></div><div class="dlg-f"><button class="btn" data-act="close">Bỏ qua</button><button class="btn danger solid" data-act="_cancelGo">Huỷ đơn</button></div>`); };
ACT.orderSchedule = (d) => {
  const o = S.orders.find((x) => x.id === d.id); const t = new Date(o.pickupAt || at(-1, 7, 30)); const val = `${t.getFullYear()}-${p2(t.getMonth() + 1)}-${p2(t.getDate())}T${p2(t.getHours())}:${p2(t.getMinutes())}`;
  openDialog(`${dlgHead('Hẹn lịch cân — ' + o.code)}<form class="dlg-b" data-form="schedule" data-id="${o.id}"><div class="field"><label for="scAt">Ngày giờ đến cân</label><input class="input" type="datetime-local" id="scAt" name="at" value="${val}" required></div><div class="field"><label for="scAddr">Địa chỉ</label><input class="input" id="scAddr" name="addr" value="${esc(o.pickupAddress || 'Rẫy ' + oview(o).cpName)}" required></div><div class="dlg-f" style="margin:0 -18px -18px"><button type="button" class="btn" data-act="close">Bỏ qua</button><button class="btn primary">Lưu lịch hẹn</button></div></form>`);
};
FORM.schedule = (f) => orderStep(f.dataset.id, 'scheduled', { pickupAt: new Date(f.at.value).getTime(), pickupAddress: f.addr.value });
ACT.weighOrder = (d) => { closeDialog(); go('create', { orderId: d.id }); };
function linkedPartners() { // tổ chức đã kết nối (cả hai chiều)
  const me = P().org, out = [];
  if (isBook()) Object.values(BOOK().partners).forEach((p) => { if (p.link && p.link.status === 'active') out.push({ org: p.link.org, pid: p.id, side: 'owner' }); });
  linkedToMe().forEach((x) => { if (!out.find((y) => y.org === x.org)) out.push({ org: x.org, pid: null, side: 'linked' }); });
  return out.filter((x) => x.org !== me && ORGS[x.org]);
}
ACT.newOrder = () => {
  if (!needNet('tạo đơn')) return;
  const ls = linkedPartners();
  openDialog(`${dlgHead('Tạo đơn', 'Chỉ gửi được cho bên đã kết nối')}<form class="dlg-b" data-form="newOrder"><div class="field"><label for="noOrg">Gửi cho</label><select class="input" id="noOrg" name="org">${ls.map((x) => `<option value="${x.org}">${esc(ORGS[x.org].name)}</option>`).join('')}</select></div><div class="field"><label for="noRole">Mình là</label><select class="input" id="noRole" name="role"><option value="seller">Bên bán</option><option value="buyer">Bên mua</option></select></div>${orderFields()}<div class="dlg-f" style="margin:0 -18px -18px"><button type="button" class="btn" data-act="close">Bỏ qua</button><button class="btn primary">Gửi đơn</button></div></form>`);
};
const orderFields = () => `<div class="fields"><div class="field"><label for="noCrop">Mặt hàng</label><select class="input" id="noCrop" name="crop">${Object.entries(PRODUCTS).map(([k, p]) => `<option value="${k}">${p.name}</option>`).join('')}</select></div><div class="field"><label for="noQty">Ước lượng (kg)</label><input class="input r" id="noQty" name="qty" inputmode="numeric" value="1.000" required></div></div><div class="field"><label for="noNote">Ghi chú</label><input class="input" id="noNote" name="note" placeholder="Ví dụ: hàng phơi khô, để ở kho nhà"></div>`;
function createOrder(org, role, f) {
  const me = P().org, qty = parseNum(f.qty.value);
  if (!(qty > 0)) { toast('Nhập số kg ước lượng', 'alert'); return; }
  const seller = role === 'seller' ? me : org, buyer = role === 'seller' ? org : me;
  const maxNo = Math.max(...S.orders.map((o) => +o.code.slice(3)));
  const partner = {}; for (const [bo, B] of Object.entries(S.books)) { const p = Object.values(B.partners).find((x) => x.link && x.link.status === 'active' && x.link.org === (bo === seller ? buyer : seller)); if (p && (bo === seller || bo === buyer)) partner[bo] = p.id; }
  const o = { id: uid('od'), code: 'DH-' + (maxNo + 1), seller, buyer, creator: me, crop: f.crop.value, qty, note: f.note.value, status: 'submitted', version: 1, partner, branch: P().branch || (ORGS[buyer].type === 'enterprise' ? 'br2' : null), events: [{ to: 'submitted', by: me, at: Date.now(), note: '' }] };
  S.orders.push(o); S.notifs.push({ id: uid('n'), org, kind: 'order.submitted', from: me, orderId: o.id, at: Date.now(), read: false, branch: o.branch });
  closeDialog(); S.otab = 'all'; go('orders'); toast('Đã gửi đơn ' + o.code + ' cho ' + ORGS[org].name);
}
FORM.newOrder = (f) => createOrder(f.org.value, f.role.value, f);

/* ─── Kết nối (vựa / DN) ─── */
VIEWS.links = {
  title: 'Kết nối', icon: 'link', show: () => isBook() && (can('partner:manage') || can('linked:read')),
  render() {
    const B = BOOK(); const ps = Object.values(B.partners);
    const rows = ps.map((p) => { const [lbl, cls, act] = linkState(p); return `<tr><td><div class="cellname"><b>${esc(p.name)}</b><small>${p.kind === 'supplier' ? (TYPE() === 'trader' ? 'Nông hộ' : 'Nhà cung cấp') : 'Người mua'}${p.phone ? ' · ' + esc(p.phone) : ' · chưa có số'}</small></div></td><td><span class="pill ${cls}">${lbl}</span></td><td class="hide-sm">${p.link && p.link.status === 'invited' && p.link.code ? `<span class="mono">${fmtCode(p.link.code)}</span><div class="hint">hết hạn ${fmtDate(p.link.expiresAt)}</div>` : p.link && p.link.since ? '<span class="hint">từ ' + fmtDay(p.link.since) + '</span>' : ''}</td><td class="num">${can('partner:manage') ? act : ''}</td></tr>`; }).join('');
    const lt = linkedToMe();
    return `${pagehead('Kết nối', 'Nối một dòng trong sổ của mình với một tài khoản thật. Bên kia nhập mã là đồng ý — từ đó họ xem được phiếu và công nợ của chính họ.')}
    <div class="split"><section class="card"><div class="card-h"><h3>Người trong sổ của mình</h3><span class="muted">Mã 8 ký tự · hạn 7 ngày · dùng một lần</span></div><div class="table-wrap"><table class="t"><thead><tr><th>Tên</th><th>Trạng thái</th><th class="hide-sm">Mã / từ ngày</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>
    <div class="stack"><section class="card"><div class="card-h"><h3>Sổ bên khác cho mình xem</h3></div>${lt.length ? lt.map((x) => linkedOrgRow(x)).join('') : '<div class="empty">Chưa có</div>'}</section>${claimCard()}</div></div>`;
  },
};
function linkState(p) {
  const L = p.link;
  if (!L) return ['Chưa kết nối', 'plain', `<button class="btn sm" data-act="invite" data-pid="${p.id}">Mời kết nối</button>`];
  if (L.status === 'active') return ['Đang kết nối', 'ok', `<button class="btn sm ghost" data-act="revoke" data-pid="${p.id}">Huỷ kết nối</button>`];
  if (L.status === 'invited' && L.code) return ['Đã mời', 'warn', `<button class="btn sm" data-act="invite" data-pid="${p.id}">Xem mã</button>`];
  if (L.status === 'invited') return ['Mã hết hạn', 'alert', `<button class="btn sm" data-act="invite" data-pid="${p.id}">Lấy mã mới</button>`];
  return ['Đã huỷ', 'plain', `<button class="btn sm" data-act="invite" data-pid="${p.id}">Mời lại</button>`];
}
function linkedOrgRow(x) { const b = linkedBalance(x.B, x.p); return `<div class="ocard" style="cursor:default"><div class="top2"><b>${esc(ORGS[x.org].name)}</b><span class="hint">từ ${fmtDay(x.p.link.since)}</span></div><div class="top2"><span class="hint">Họ còn nợ mình <b class="amt-pay">${vnd(b.theyOwe)}</b> · Mình còn nợ họ <b class="amt-recv">${vnd(b.youOwe)}</b></span><span class="row"><button class="btn sm" data-act="linkedReceipts" data-org="${x.org}" data-pid="${x.p.id}">Xem phiếu</button><button class="btn sm ghost" data-act="revokeLinked" data-org="${x.org}" data-pid="${x.p.id}">Huỷ</button></span></div></div>`; }
function claimCard() {
  return `<section class="card"><div class="card-h"><h3>Nhập mã kết nối</h3></div><form class="card-b stack" data-form="claim"><p class="hint">Bên giữ sổ đưa mã tận tay hoặc qua Zalo. Gõ kiểu gì cũng được, app tự bỏ dấu cách và gạch.</p>
   <input class="input codein" id="claimCode" name="code" placeholder="XXXX-XXXX" maxlength="11" autocomplete="off" data-in="claimCode" aria-label="Mã kết nối"><span class="err" id="claimErr"></span>
   <button class="btn primary">Kết nối</button>${TYPE() === 'farmer' ? '<p class="hint">Bản demo: thử mã <button type="button" class="link mono" data-act="fillCode" data-c="H4TR-9WXP">H4TR-9WXP</button> của Vựa Năm Quý.</p>' : ''}</form></section>`;
}
INP.claimCode = (el) => { const raw = el.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); const bad = raw.split('').filter((c) => !LINK_ALPHABET.includes(c)); const clean = raw.split('').filter((c) => LINK_ALPHABET.includes(c)).join('').slice(0, 8); el.value = clean.length > 4 ? clean.slice(0, 4) + '-' + clean.slice(4) : clean; $('#claimErr').textContent = bad.length ? 'Mã không có chữ 0, O, 1, I, L — đã bỏ ' + bad.join(' ') : ''; };
ACT.fillCode = (d) => { $('#claimCode').value = d.c; };
FORM.claim = (f) => {
  const code = f.code.value.replace(/-/g, ''); const err = $('#claimErr');
  if (!needNet('nhập mã kết nối')) return;
  if (++S.claimTries > 10) { err.textContent = 'Thử nhiều quá. Đợi một phút rồi thử lại.'; return; }
  if (code.length !== 8) { err.textContent = 'Mã gồm 8 ký tự.'; return; }
  if (isBook() && Object.values(BOOK().partners).some((p) => p.link && p.link.code === code)) { err.textContent = 'Đây là mã của sổ mình — đưa mã này cho người được mời.'; return; }
  for (const [org, B] of Object.entries(S.books)) for (const p of Object.values(B.partners)) {
    if (p.link && p.link.status === 'invited' && p.link.code === code && p.link.expiresAt > Date.now() && org !== P().org) {
      p.link = { status: 'active', org: P().org, since: Date.now() }; S.notifs.push({ id: uid('n'), org, kind: 'link.accepted', from: P().org, at: Date.now(), read: false });
      S.claimTries = 0; render(); toast('Đã kết nối với ' + ORGS[org].name); return;
    }
  }
  err.textContent = 'Mã không đúng hoặc đã hết hạn, xin bên kia mã mới.';
};
ACT.invite = (d) => {
  if (!needNet('lấy mã kết nối')) return;
  const p = BOOK().partners[d.pid];
  if (!(p.link && p.link.status === 'invited' && p.link.code && p.link.expiresAt > Date.now())) { p.link = { status: 'invited', code: newCode(), expiresAt: Date.now() + 7 * DAY }; }
  const msg = `Chào ${p.name}, ${ORG().name} mời kết nối trên THUMUA365 để xem phiếu cân và công nợ. Mở app, chọn "Nhập mã kết nối" và gõ mã ${fmtCode(p.link.code)} (hạn 7 ngày, dùng một lần).`;
  render();
  openDialog(`${dlgHead('Mã kết nối cho ' + esc(p.name))}<div class="dlg-b"><div class="codebox"><span class="hint">Đọc to hoặc gửi qua Zalo — đúng người mới đưa</span><span class="code">${fmtCode(p.link.code)}</span><span class="hint">Hết hạn ${fmtDate(p.link.expiresAt)} · bấm lại vẫn ra đúng mã này</span></div>
   <div class="field"><label for="invMsg">Tin nhắn Zalo soạn sẵn</label><textarea class="input" id="invMsg" rows="4" readonly>${esc(msg)}</textarea></div><p class="hint">Dòng danh bạ không cần số điện thoại. Người cân của vựa không mời được.</p></div>
   <div class="dlg-f"><button class="btn" data-act="copyEl" data-el="invMsg">${ic('copy')}Chép tin nhắn</button><button class="btn primary" data-act="close">Xong</button></div>`);
};
ACT.revoke = (d) => { const p = BOOK().partners[d.pid]; confirmDialog({ title: 'Huỷ kết nối với ' + esc(p.name) + '?', body: '<p>Bên kia mất quyền xem ngay. Kết nối đã huỷ không mở lại được — muốn nối lại thì mời lại.</p>', ok: 'Huỷ kết nối', danger: true, onOk: () => { if (!needNet('huỷ kết nối')) return; S.notifs.push({ id: uid('n'), org: p.link.org, kind: 'link.revoked', from: P().org, at: Date.now(), read: false }); p.link = { ...p.link, status: 'revoked', revokedAt: Date.now() }; render(); toast('Đã huỷ kết nối'); } }); };
ACT.revokeLinked = (d) => { const p = S.books[d.org].partners[d.pid]; confirmDialog({ title: 'Ngừng xem sổ của ' + esc(ORGS[d.org].name) + '?', body: '<p>Mình sẽ không xem phiếu của họ nữa. Muốn xem lại thì xin mã mới.</p>', ok: 'Huỷ kết nối', danger: true, onOk: () => { if (!needNet('huỷ kết nối')) return; p.link = { ...p.link, status: 'revoked' }; S.notifs.push({ id: uid('n'), org: d.org, kind: 'link.revoked', from: P().org, at: Date.now(), read: false }); render(); toast('Đã huỷ kết nối'); } }); };
ACT.linkedReceipts = (d) => {
  const B = S.books[d.org], p = B.partners[d.pid]; const rs = B.receipts.filter((r) => r.partnerId === p.id && r.status === 'done' && !r.deleted);
  openDialog(`${dlgHead('Phiếu ' + esc(ORGS[d.org].name) + ' ghi về mình', 'Chỉ phần in trên biên nhận · mới nhất trước')}<div class="dlg-b">${rs.map((r) => voucher(r, B, d.org, true)).join('') || '<div class="empty">Chưa có phiếu</div>'}</div>`, 'drawer');
};

/* ─── Đối tác ─── */
function partnersView(kind) {
  return {
    title: () => (kind === 'supplier' ? (TYPE() === 'trader' ? 'Nông hộ' : 'Nhà cung cấp') : 'Người mua'), icon: kind === 'supplier' ? 'sprout' : 'truck', show: isBook,
    render() {
      const B = BOOK(); const ps = Object.values(B.partners).filter((p) => p.kind === kind); const rs = doneReceipts();
      return `${pagehead(vtitle(kind === 'supplier' ? 'suppliers' : 'buyers'), kind === 'supplier' ? 'Người bán hàng cho mình. Mời kết nối để họ tự xem phiếu và tiền còn nợ.' : 'Nơi mình bán hàng ra.', can('partner:manage') ? `<button class="btn primary" data-act="addPartner" data-kind="${kind}">${ic('plus')}Thêm ${kind === 'supplier' ? 'người bán' : 'người mua'}</button>` : '')}
      <section class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Tên</th><th class="hide-sm">Số điện thoại</th><th class="hide-md">Nơi ở</th><th>Kết nối</th><th class="num hide-sm">Số phiếu</th><th class="num">Còn nợ</th></tr></thead><tbody>${ps.map((p) => { const mine = rs.filter((r) => r.partnerId === p.id); const debt = sum(mine, debtOf); return `<tr class="click" data-act="openPartner" data-id="${p.id}"><td><b>${esc(p.name)}</b></td><td class="hide-sm tnum">${esc(p.phone) || '<span class="muted">—</span>'}</td><td class="hide-md">${esc(p.place)}</td><td><span class="pill ${linkState(p)[1]}">${linkState(p)[0]}</span></td><td class="num hide-sm">${mine.length}</td><td class="num ${debt ? (kind === 'buyer' ? 'amt-recv' : 'amt-pay') : 'muted'}">${debt ? vnd(debt) : '—'}</td></tr>`; }).join('')}</tbody></table></div></section>`;
    },
  };
}
VIEWS.suppliers = partnersView('supplier');
VIEWS.buyers = partnersView('buyer');
function openPartner(id) {
  const B = BOOK(), p = B.partners[id]; const mine = doneReceipts().filter((r) => r.partnerId === id);
  openDialog(`${dlgHead(esc(p.name), p.kind === 'supplier' ? 'Người bán' : 'Người mua')}<div class="dlg-b"><dl class="kv"><dt>Số điện thoại</dt><dd>${esc(p.phone) || '—'}</dd><dt>Nơi ở</dt><dd>${esc(p.place) || '—'}</dd><dt>Kết nối</dt><dd>${linkState(p)[0]}</dd><dt>Số phiếu</dt><dd>${mine.length}</dd><dt>Tổng giao dịch</dt><dd>${vnd(sum(mine, totalOf))}</dd><dt>Còn nợ</dt><dd>${vnd(sum(mine, debtOf))}</dd></dl>
   <div class="row">${p.phone ? `<button class="btn sm" data-act="copy" data-t="${esc(p.phone)}">${ic('phone', 15)}Chép số để gọi</button>` : ''}${can('partner:manage') ? linkState(p)[2] : ''}${can('receipt:create') ? `<button class="btn sm primary" data-act="go" data-r="create" data-kind="${p.kind === 'supplier' ? 'purchase' : 'sale'}" data-pid="${p.id}">Tạo phiếu</button>` : ''}</div></div><div class="table-wrap">${receiptTable(mine.slice(0, 12))}</div>`, 'drawer');
}
ACT.openPartner = (d) => openPartner(d.id);
ACT.copy = (d) => copyText(d.t);
ACT.addPartner = (d) => openDialog(`${dlgHead('Thêm ' + (d.kind === 'supplier' ? 'người bán' : 'người mua'))}<form class="dlg-b" data-form="addPartner" data-kind="${d.kind}"><div class="field"><label for="apName">Tên</label><input class="input" id="apName" name="name" required autofocus></div><div class="field"><label for="apPhone">Số điện thoại (không bắt buộc)</label><input class="input" id="apPhone" name="phone" inputmode="tel"></div><div class="field"><label for="apPlace">Nơi ở</label><input class="input" id="apPlace" name="place"></div><div class="dlg-f" style="margin:0 -18px -18px"><button type="button" class="btn" data-act="close">Bỏ qua</button><button class="btn primary">Thêm</button></div></form>`);
FORM.addPartner = (f) => { const id = uid('p'); BOOK().partners[id] = { id, kind: f.dataset.kind, name: f.name.value.trim(), phone: f.phone.value.trim(), place: f.place.value.trim(), link: null, note: '' }; pushOp('Thêm ' + f.name.value.trim()); closeDialog(); render(); toast('Đã thêm ' + f.name.value.trim()); };

/* ─── Mặt hàng, kho, giá ─── */
VIEWS.products = {
  title: 'Mặt hàng', icon: 'tag', show: isBook,
  render() { const B = BOOK(); return `${pagehead('Mặt hàng', 'Mỗi mặt hàng có cách tính và giá mặc định. Đổi giá ở đây không làm đổi phiếu cũ.')}<section class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Mặt hàng</th><th>Cách tính</th><th class="num">Giá mua</th><th class="num">Giá bán</th><th></th></tr></thead><tbody>${Object.entries(B.products).map(([k, p]) => `<tr><td><b>${esc(p.name)}</b><div class="hint">${p.unit}</div></td><td>${FORMULAS[p.formula]}</td><td class="num">${vnd(p.price)}</td><td class="num">${vnd(p.sale)}</td><td class="num">${can('pricing:manage') ? `<button class="btn sm" data-act="editProduct" data-id="${k}">Sửa giá</button>` : ''}</td></tr>`).join('')}</tbody></table></div></section>`; },
};
ACT.editProduct = (d) => { const p = BOOK().products[d.id]; openDialog(`${dlgHead('Sửa giá — ' + esc(p.name))}<form class="dlg-b" data-form="editProduct" data-id="${d.id}"><div class="fields"><div class="field"><label for="epBuy">Giá mua (${p.unit})</label><input class="input r" id="epBuy" name="buy" value="${p.price.toLocaleString('vi-VN')}" autofocus></div><div class="field"><label for="epSale">Giá bán</label><input class="input r" id="epSale" name="sale" value="${p.sale.toLocaleString('vi-VN')}"></div></div><div class="dlg-f" style="margin:0 -18px -18px"><button type="button" class="btn" data-act="close">Bỏ qua</button><button class="btn primary">Lưu giá</button></div></form>`); };
FORM.editProduct = (f) => { const p = BOOK().products[f.dataset.id]; p.price = parseNum(f.buy.value) || p.price; p.sale = parseNum(f.sale.value) || p.sale; pushOp('Đổi giá ' + p.name); closeDialog(); render(); toast('Đã lưu giá ' + p.name); };
VIEWS.inventory = {
  title: 'Tồn kho', icon: 'box', show: isBook,
  render() { const inv = inventory(); return `${pagehead('Tồn kho', 'Hàng còn trong kho = mua vào − bán ra, suy từ phiếu. Số âm nghĩa là bán nhiều hơn số đã ghi mua — thường do quên ghi phiếu mua.')}<section class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Mặt hàng</th><th class="num">Mua vào</th><th class="num">Bán ra</th><th class="num">Còn trong kho</th><th class="num hide-sm">Giá vốn bình quân</th><th class="num hide-sm">Giá trị tồn</th></tr></thead><tbody>${inv.map((x) => `<tr><td><b>${esc(x.name)}</b>${x.stock < 0 ? ' <span class="pill alert">Tồn âm</span>' : ''}</td><td class="num">${kg(x.inK)}</td><td class="num">${kg(x.outK)}</td><td class="num ${x.stock < 0 ? 'neg' : ''}"><b>${kg(x.stock)}</b></td><td class="num hide-sm">${x.avg ? vnd(x.avg) : '—'}</td><td class="num hide-sm">${vnd(x.value)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Tổng</td><td></td><td></td><td></td><td class="hide-sm"></td><td class="num hide-sm">${vnd(sum(inv, (x) => x.value))}</td></tr></tfoot></table></div></section>`; },
};
VIEWS.pricing = {
  title: 'Quy tắc giá', icon: 'percent', show: () => isBook() && can('pricing:manage'),
  render() { const B = BOOK(); return `${pagehead('Quy tắc giá', 'Cộng hoặc trừ giá theo số kg. App gợi ý khi lập phiếu, người cân vẫn sửa được.', `<button class="btn primary" data-act="addRule">${ic('plus')}Thêm quy tắc</button>`)}<section class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Quy tắc</th><th>Mặt hàng</th><th class="num">Từ bao nhiêu kg</th><th class="num">Cộng / trừ</th><th>Đang bật</th></tr></thead><tbody>${B.rules.map((r) => `<tr><td><b>${esc(r.name)}</b></td><td>${r.pid ? B.products[r.pid].short : 'Mọi mặt hàng'}</td><td class="num">${r.min ? kg(r.min) + ' trở lên' : 'Mọi phiếu'}</td><td class="num ${r.delta < 0 ? 'amt-pay' : 'kind-in'}">${r.delta > 0 ? '+' : '−'}${vnd(Math.abs(r.delta))}/kg</td><td><label class="check"><input type="checkbox" data-chg="ruleToggle" data-id="${r.id}" ${r.active ? 'checked' : ''}> ${r.active ? 'Bật' : 'Tắt'}</label></td></tr>`).join('')}</tbody></table></div></section>`; },
};
CHG.ruleToggle = (el) => { const r = BOOK().rules.find((x) => x.id === el.dataset.id); r.active = el.checked; pushOp((r.active ? 'Bật ' : 'Tắt ') + r.name); render(); };
ACT.addRule = () => openDialog(`${dlgHead('Thêm quy tắc giá')}<form class="dlg-b" data-form="addRule"><div class="field"><label for="arName">Tên</label><input class="input" id="arName" name="name" value="Bớt giá khi mua nhiều" required></div><div class="fields"><div class="field"><label for="arPid">Mặt hàng</label><select class="input" id="arPid" name="pid"><option value="">Mọi mặt hàng</option>${Object.entries(PRODUCTS).map(([k, p]) => `<option value="${k}">${p.name}</option>`).join('')}</select></div><div class="field"><label for="arMin">Từ bao nhiêu kg trở lên</label><input class="input r" id="arMin" name="min" value="1.000"></div><div class="field"><label for="arDelta">Cộng / trừ (đ/kg)</label><input class="input r" id="arDelta" name="delta" value="-200"></div></div><div class="dlg-f" style="margin:0 -18px -18px"><button type="button" class="btn" data-act="close">Bỏ qua</button><button class="btn primary">Thêm</button></div></form>`);
FORM.addRule = (f) => { BOOK().rules.push({ id: uid('ru'), name: f.name.value, pid: f.pid.value, min: parseNum(f.min.value) || 0, delta: Number(String(f.delta.value).replace(/\./g, '')) || 0, active: true }); pushOp('Thêm quy tắc ' + f.name.value); closeDialog(); render(); };

/* ─── Báo cáo ─── */
VIEWS.reports = {
  title: () => (TYPE() === 'enterprise' && !P().branch ? 'Báo cáo tổng' : 'Báo cáo'), icon: 'chart', show: () => isBook() && can('report:view'),
  render() {
    const rs = doneReceipts(); const days = +S.rrange; const inR = rs.filter((r) => r.at >= T0 - (days - 1) * DAY);
    const buy = inR.filter((r) => r.kind === 'purchase'), sale = inR.filter((r) => r.kind === 'sale');
    const agg = (arr) => ({ count: arr.length, net: sum(arr, netOf), amount: sum(arr, totalOf), paid: sum(arr, paidOf), debt: sum(arr, debtOf) });
    const seg = `<div class="seg">${[['7', '7 ngày'], ['30', '30 ngày']].map(([v, l]) => `<button data-act="set" data-k="rrange" data-v="${v}" aria-pressed="${S.rrange === v}">${l}</button>`).join('')}</div>`;
    let branchTbl = '';
    if (TYPE() === 'enterprise') {
      const brs = BOOK().branches.filter((b) => !P().branch || b.id === P().branch);
      const rowsB = brs.map((b) => [b.name, agg(buy.filter((r) => r.branchId === b.id))]); const tot = agg(buy);
      branchTbl = `<section class="card"><div class="card-h"><h3>Thu mua theo chi nhánh</h3><span class="muted">${P().branch ? 'Chỉ chi nhánh của mình' : 'Toàn doanh nghiệp'}</span></div><div class="table-wrap"><table class="t"><thead><tr><th>Chi nhánh</th><th class="num">Số phiếu</th><th class="num">Tính tiền</th><th class="num">Tiền hàng</th><th class="num hide-sm">Đã trả</th><th class="num">Còn nợ</th></tr></thead><tbody>${rowsB.map(([n, a]) => `<tr><td><b>${esc(n)}</b></td><td class="num">${a.count}</td><td class="num">${kg(a.net)}</td><td class="num">${vnd(a.amount)}</td><td class="num hide-sm">${vnd(a.paid)}</td><td class="num amt-pay">${vnd(a.debt)}</td></tr>`).join('')}</tbody>${P().branch ? '' : `<tfoot><tr><td>Tổng</td><td class="num">${tot.count}</td><td class="num">${kg(tot.net)}</td><td class="num">${vnd(tot.amount)}</td><td class="num hide-sm">${vnd(tot.paid)}</td><td class="num">${vnd(tot.debt)}</td></tr></tfoot>`}</table></div></section>`;
    }
    const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push(d); }
    const base = TYPE() === 'enterprise' ? 1.9e9 : 4.2e8; const rngM = mulberry32(5);
    const mrows = months.map((d, i) => { const cur = i === 5; const b = cur ? sum(rs.filter((r) => r.kind === 'purchase' && new Date(r.at).getMonth() === d.getMonth()), totalOf) : Math.round(base * (0.75 + rngM() * 0.5) / 1e5) * 1e5; const s = cur ? sum(rs.filter((r) => r.kind === 'sale' && new Date(r.at).getMonth() === d.getMonth()), totalOf) : Math.round(b * (1.02 + rngM() * 0.06) / 1e5) * 1e5; return [`Tháng ${d.getMonth() + 1}/${d.getFullYear()}${cur ? ' (đang chạy)' : ''}`, b, s]; });
    const B = agg(buy), Sa = agg(sale);
    return `${pagehead(vtitle('reports'), 'Số tính từ phiếu đã xong, giờ Việt Nam. Tối đa 366 ngày mỗi lần xem.', seg + `<button class="btn" data-act="export" data-what="Báo cáo (Excel)">${ic('download')}Lưu ra file</button>`)}
    <div class="kpis"><div class="card kpi"><span class="l">Chi mua</span><span class="v">${vnd(B.amount)}</span><span class="d">${B.count} phiếu · ${kg(B.net)}</span></div><div class="card kpi"><span class="l">Bán ra</span><span class="v">${vnd(Sa.amount)}</span><span class="d">${Sa.count} phiếu</span></div><div class="card kpi"><span class="l">Còn nợ người bán</span><span class="v amt-pay">${vnd(B.debt)}</span><span class="d">trong kỳ</span></div><div class="card kpi"><span class="l">Người mua còn nợ</span><span class="v amt-recv">${vnd(Sa.debt)}</span><span class="d">trong kỳ</span></div></div>
    ${branchTbl}
    <div class="split"><section class="card"><div class="card-h"><h3>Theo tháng</h3><span class="muted">Các tháng trước là số mẫu</span></div><div class="table-wrap"><table class="t"><thead><tr><th>Tháng</th><th class="num">Chi mua</th><th class="num">Bán ra</th><th class="num">Tạm tính lời</th></tr></thead><tbody>${mrows.map(([m, b, s]) => `<tr><td>${m}</td><td class="num">${vnd(b)}</td><td class="num">${vnd(s)}</td><td class="num ${s - b < 0 ? 'neg' : 'kind-in'}">${vnd(s - b)}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="card"><div class="card-h"><h3>Báo cáo thuế</h3><span class="muted">Kỳ: quý này</span></div><div class="card-b stack"><dl class="kv"><dt>Tổng chi mua</dt><dd>${vnd(mrows.slice(3).reduce((a, x) => a + x[1], 0))}</dd><dt>Tổng doanh thu bán</dt><dd>${vnd(mrows.slice(3).reduce((a, x) => a + x[2], 0))}</dd><dt>Số phiếu mua</dt><dd>${rs.filter((r) => r.kind === 'purchase').length}</dd><dt>Số phiếu bán</dt><dd>${rs.filter((r) => r.kind === 'sale').length}</dd></dl><p class="hint">Bảng kê thu mua hàng nông sản không có hoá đơn — mẫu 01/TNDN.</p><button class="btn" data-act="export" data-what="Báo cáo thuế (Excel)">${ic('file')}Xuất bảng kê</button></div></section></div>`;
  },
};

/* ─── Tiện ích ─── */
VIEWS.utilities = {
  title: 'Tiện ích', icon: 'calc', show: isBook,
  render() { const ws = S.weigh.map(parseNum).filter((x) => x > 0); return `${pagehead('Tiện ích', 'Cộng nhiều lần cân trước khi lập phiếu, và sổ tay ghi nhanh.')}<div class="g2"><section class="card"><div class="card-h"><h3>Cộng nhiều lần cân</h3><span class="muted">${ws.length} lần</span></div><div class="card-b stack"><form class="row" data-form="weighAdd" style="flex-wrap:nowrap"><input class="input r" name="w" id="weighIn" inputmode="decimal" placeholder="Số kg lần cân" aria-label="Số kg"><button class="btn">Cộng</button></form><div class="photos">${S.weigh.map((w, i) => `<span class="pill plain tnum">${esc(w)} kg <button class="link" data-act="weighDel" data-i="${i}" aria-label="Bỏ">×</button></span>`).join('')}</div><div class="sumrow big"><span>Tổng</span><span>${kg(sum(ws, (x) => x))}</span></div>${can('receipt:create') ? `<button class="btn primary" data-act="go" data-r="create" data-gross="${showNum(sum(ws, (x) => x))}">Tạo phiếu với tổng này</button>` : ''}</div></section>
  <section class="card"><div class="card-h"><h3>Sổ tay</h3><span class="muted">Lưu trong sổ của tổ chức</span></div><div class="card-b"><textarea class="input" rows="8" data-in="notes" aria-label="Sổ tay" placeholder="Ví dụ: chiều thứ 5 xe nhà máy lấy mủ">${esc(BOOK().notes || 'Giá mủ nhà máy báo sáng nay: 44.000đ/kg quy khô.\nChú Ba Lộc hẹn cân cà phê sau 15 giờ.')}</textarea></div></section></div>`; },
};
FORM.weighAdd = (f) => { const v = f.w.value.trim(); if (parseNum(v) > 0) { S.weigh.push(v); render(); $('#weighIn').focus(); } };
ACT.weighDel = (d) => { S.weigh.splice(+d.i, 1); render(); };
INP.notes = (el) => { BOOK().notes = el.value; };

/* ─── Nhập dữ liệu ─── */
VIEWS.import = {
  title: 'Nhập dữ liệu', icon: 'upload', show: () => isBook() && can('partner:manage'),
  render() {
    const rows = S.importRows;
    const pre = rows ? `<section class="card"><div class="card-h"><h3>Xem trước — danh_ba_nong_ho.xlsx</h3><span class="muted">${rows.filter((r) => !r.err).length} dòng hợp lệ · ${rows.filter((r) => r.err).length} dòng lỗi</span></div><div class="table-wrap"><table class="t"><thead><tr><th>Dòng</th><th>Tên</th><th>Số điện thoại</th><th>Nơi ở</th><th>Kiểm tra</th></tr></thead><tbody>${rows.map((r) => `<tr><td class="tnum">${r.n}</td><td>${esc(r.name)}</td><td class="tnum">${esc(r.phone)}</td><td>${esc(r.place)}</td><td>${r.err ? `<span class="err">${esc(r.err)}</span>` : '<span class="pill ok">Được</span>'}</td></tr>`).join('')}</tbody></table></div><div class="card-b row"><button class="btn primary" data-act="importGo">Nhập ${rows.filter((r) => !r.err).length} dòng hợp lệ</button><button class="btn" data-act="importClear">Bỏ file này</button><span class="hint">Dòng lỗi bỏ qua, sửa trong file rồi nhập lại.</span></div></section>` : '';
    return `${pagehead('Nhập dữ liệu', 'Chuyển sổ cũ từ Excel: danh bạ nông hộ, người mua, mặt hàng. Xem trước rồi mới nhập.')}<section class="card"><div class="card-b row"><label class="btn" for="impFile">${ic('upload')}Chọn file Excel (.xlsx)</label><input type="file" id="impFile" accept=".xlsx,.csv" hidden data-chg="impFile"><button class="btn" data-act="importSample">Dùng file mẫu</button><span class="hint">Cột: Tên · Số điện thoại · Nơi ở. Số viết 0912 345 678 hoặc +84912345678 đều được.</span></div></section>${pre}`;
  },
};
const SAMPLE = [['Bác Tư Lành', '0915 220 113', 'Tân Lập'], ['Chị Năm Hoa', '0388 441 905', 'Tân Hưng'], ['Anh Hai Phúc', '0962 118 774', 'Đồng Tiến'], ['Cô Sáu Liên', '0903 662 018', 'Tân Phú'], ['Chú Tám Rô', '09123', 'Thuận Lợi'], ['Anh Bảy Đen', '0977 520 336', 'Tân Lợi'], ['Chú Ba Lộc', '0903 218 554', 'Tân Hưng'], ['Hộ ông Chín', '', 'Đồng Tâm'], ['Chị Út Mận', '0349 223 670', 'Tân Lập'], ['Anh Mười Hiếu', '0911 774 255', 'Thuận Phú']];
ACT.importSample = () => { const names = Object.values(BOOK().partners).map((p) => p.name); S.importRows = SAMPLE.map(([name, phone, place], i) => ({ n: i + 2, name, phone, place, err: phone && phone.replace(/\D/g, '').length < 10 ? `Số điện thoại "${phone}" chưa đúng` : names.includes(name) ? `Trùng với "${name}" đã có trong sổ` : '' })); render(); };
CHG.impFile = (el) => { if (el.files[0]) { toast('Đã đọc ' + el.files[0].name + ' — bản demo dùng nội dung mẫu để xem trước'); ACT.importSample(); } };
ACT.importClear = () => { S.importRows = null; render(); };
ACT.importGo = () => { const ok = S.importRows.filter((r) => !r.err); ok.forEach((r) => { const id = uid('p'); BOOK().partners[id] = { id, kind: 'supplier', name: r.name, phone: r.phone, place: r.place, link: null, note: '' }; }); pushOp('Nhập ' + ok.length + ' nông hộ từ Excel'); S.importRows = null; go('suppliers'); toast('Đã nhập ' + ok.length + ' người bán'); };

/* ─── Thêm (điện thoại) ─── */
VIEWS.more = {
  title: 'Thêm', short: 'Thêm', icon: 'grid', show: () => true,
  render() { const bar = ['dashboard', 'receipts', 'debts', 'fhome', 'orders', 'fowed', 'aops', 'abilling', 'alog']; const ids = NAV[navKind()].flatMap(([, x]) => x).filter((id) => visible(id) && (navKind() === 'book' ? !['dashboard', 'receipts', 'debts'].includes(id) : !bar.includes(id) || id === 'orders')); return `<div class="morelist">${ids.map((id) => `<button data-act="go" data-r="${id}">${ic(VIEWS[id].icon, 22)}<span>${vtitle(id)}</span></button>`).join('')}<button data-act="logout">${ic('logout', 22)}<span>Đăng xuất</span></button></div>`; },
};
