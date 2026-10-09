/* views-org.js — nhân viên, chi nhánh, gói, tài khoản, vỏ nông dân, quản trị, đăng nhập */
'use strict';

/* ─── Nhân viên ─── */
VIEWS.staff = {
  title: 'Nhân viên', icon: 'team', show: () => isBook() && can('staff:manage'),
  render() {
    const B = BOOK(); const me = P().full;
    return `${pagehead('Nhân viên', 'Chủ tạo tài khoản cho người của mình: số điện thoại + mật khẩu. Họ đăng nhập rồi tự đổi mật khẩu, không cần đăng ký.', `<button class="btn primary" data-act="addMember">${ic('plus')}Thêm ${TYPE() === 'trader' ? 'người cân' : 'nhân viên'}</button>`)}
    <section class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Tên</th><th class="hide-sm">Số điện thoại</th><th>Vai trò</th>${TYPE() === 'enterprise' ? '<th>Chi nhánh</th>' : ''}<th></th></tr></thead><tbody>${B.members.map((m) => `<tr><td><b>${esc(m.name)}</b>${m.name === me ? ' <span class="pill plain">Mình</span>' : ''}</td><td class="hide-sm tnum">${esc(m.phone)}</td><td><span class="pill ${m.role === 'owner' ? 'ok' : m.role === 'manager' ? 'info' : 'plain'}">${ROLE_LABEL(TYPE(), m.role)}</span></td>${TYPE() === 'enterprise' ? `<td>${m.branch ? esc(branchName(m.branch)) : '<span class="muted">Toàn doanh nghiệp</span>'}</td>` : ''}<td class="num">${m.role === 'owner' || m.name === me ? '' : `${TYPE() === 'enterprise' ? `<button class="btn sm" data-act="editMember" data-id="${m.id}">Đổi</button>` : ''}<button class="btn sm ghost" data-act="removeMember" data-id="${m.id}">Gỡ</button>`}</td></tr>`).join('')}</tbody></table></div></section>
    <p class="hint">Đổi chi nhánh của một người thì máy của họ phải tải lại sổ. Gỡ là mất quyền ngay.</p>`;
  },
};
const memberForm = (m = {}) => `${TYPE() === 'enterprise' ? `<div class="fields"><div class="field"><label for="mfRole">Vai trò</label><select class="input" id="mfRole" name="role"><option value="staff" ${m.role === 'staff' ? 'selected' : ''}>Nhân viên (cân, lập phiếu)</option><option value="manager" ${m.role === 'manager' ? 'selected' : ''}>Quản lý chi nhánh</option></select></div><div class="field"><label for="mfBranch">Chi nhánh</label><select class="input" id="mfBranch" name="branch">${BOOK().branches.filter((b) => !b.archived).map((b) => `<option value="${b.id}" ${b.id === m.branch ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div></div>` : '<p class="hint">Vựa chỉ có một vai cho người làm: người cân — lập phiếu, ghi trả tiền, không xoá phiếu, không xem báo cáo.</p>'}`;
ACT.addMember = () => { if (!needNet('thêm người')) return; openDialog(`${dlgHead(TYPE() === 'trader' ? 'Thêm người cân' : 'Thêm nhân viên')}<form class="dlg-b" data-form="addMember"><div class="field"><label for="amName">Họ tên</label><input class="input" id="amName" name="name" required autofocus></div><div class="fields"><div class="field"><label for="amPhone">Số điện thoại</label><input class="input" id="amPhone" name="phone" inputmode="tel" required><span class="hint">Thử 0909 000 111 để xem lỗi số đã có tài khoản</span></div><div class="field"><label for="amPw">Mật khẩu ban đầu</label><input class="input" id="amPw" name="pw" value="${newCode().toLowerCase().slice(0, 6)}" minlength="6" required></div></div>${memberForm({ role: 'staff', branch: 'br1' })}<span class="err" id="amErr"></span><div class="dlg-f" style="margin:0 -18px -18px"><button type="button" class="btn" data-act="close">Bỏ qua</button><button class="btn primary">Tạo tài khoản</button></div></form>`); };
FORM.addMember = (f) => {
  const phone = f.phone.value.replace(/\D/g, ''); const B = BOOK();
  if (phone.length < 10) { $('#amErr').textContent = 'Số điện thoại chưa đúng'; return; }
  if (phone === '0909000111') { $('#amErr').textContent = 'Số này đã có tài khoản ở nơi khác.'; return; }
  if (B.members.some((m) => m.phone.replace(/\D/g, '') === phone)) { $('#amErr').textContent = 'Người này đã ở trong tổ chức.'; return; }
  B.members.push({ id: uid('m'), name: f.name.value.trim(), phone: f.phone.value.trim(), role: f.role ? f.role.value : 'staff', branch: f.branch ? f.branch.value : null });
  notify(P().org, 'member.added', { text: 'Đã thêm ' + f.name.value.trim() + (f.branch ? ' vào ' + branchName(f.branch.value) : '') });
  closeDialog(); render(); toast('Đã tạo tài khoản — gửi số và mật khẩu cho ' + f.name.value.trim());
};
ACT.editMember = (d) => { const m = BOOK().members.find((x) => x.id === d.id); openDialog(`${dlgHead('Đổi vai trò / chi nhánh — ' + esc(m.name))}<form class="dlg-b" data-form="editMember" data-id="${m.id}">${memberForm(m)}<div class="dlg-f" style="margin:0 -18px -18px"><button type="button" class="btn" data-act="close">Bỏ qua</button><button class="btn primary">Lưu</button></div></form>`); };
FORM.editMember = (f) => { const m = BOOK().members.find((x) => x.id === f.dataset.id); const moved = m.branch !== f.branch.value; m.role = f.role.value; m.branch = f.branch.value; closeDialog(); render(); toast(moved ? 'Đã đổi — máy của ' + m.name + ' sẽ tải lại sổ chi nhánh mới' : 'Đã lưu'); };
ACT.removeMember = (d) => { const B = BOOK(), m = B.members.find((x) => x.id === d.id); confirmDialog({ title: 'Gỡ ' + esc(m.name) + '?', body: '<p>Người này mất quyền vào sổ ngay. Phiếu họ đã lập vẫn giữ nguyên. Thêm lại sau thì dùng mật khẩu cũ.</p>', ok: 'Gỡ khỏi tổ chức', danger: true, onOk: () => { B.members = B.members.filter((x) => x !== m); render(); toast('Đã gỡ ' + m.name); } }); };

/* ─── Chi nhánh ─── */
VIEWS.branches = {
  title: 'Chi nhánh', icon: 'building', show: () => isBook() && can('branch:manage'),
  render() {
    const B = BOOK(); const act = B.branches.filter((b) => !b.archived); const lim = TYPE() === 'enterprise' ? S.billing[P().org].branchLimit : null; const rs = doneReceipts();
    return `${pagehead('Chi nhánh', lim ? `Gói doanh nghiệp tính theo số chi nhánh: đang dùng ${act.length}/${lim}.` : 'Vựa không giới hạn số chi nhánh.', `<button class="btn primary" data-act="addBranch">${ic('plus')}Thêm chi nhánh</button>`)}
    ${lim ? `<div class="card card-b stack" style="gap:8px"><div class="between"><span class="lbl">Chi nhánh trong gói</span><b class="tnum">${act.length} / ${lim}</b></div><div class="meter ${act.length >= lim ? 'warn' : ''}"><i style="width:${(act.length / lim) * 100}%"></i></div></div>` : ''}
    <section class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Chi nhánh</th><th class="hide-sm">Địa chỉ</th><th class="num">Người</th><th class="num hide-sm">Phiếu 30 ngày</th><th></th></tr></thead><tbody>${B.branches.map((b) => `<tr><td><b>${esc(b.name)}</b>${b.archived ? ' <span class="pill plain">Đã lưu trữ</span>' : ''}</td><td class="hide-sm">${esc(b.address)}</td><td class="num">${B.members.filter((m) => m.branch === b.id).length}</td><td class="num hide-sm">${rs.filter((r) => r.branchId === b.id).length}</td><td class="num">${b.archived ? '' : `<button class="btn sm ghost" data-act="archiveBranch" data-id="${b.id}">Lưu trữ</button>`}</td></tr>`).join('')}</tbody></table></div></section>`;
  },
};
ACT.addBranch = () => { if (!needNet('thêm chi nhánh')) return; openDialog(`${dlgHead('Thêm chi nhánh')}<form class="dlg-b" data-form="addBranch"><div class="field"><label for="abName">Tên</label><input class="input" id="abName" name="name" value="Chi nhánh " required autofocus></div><div class="field"><label for="abAddr">Địa chỉ</label><input class="input" id="abAddr" name="addr"></div><span class="err" id="abErr"></span><div class="dlg-f" style="margin:0 -18px -18px"><button type="button" class="btn" data-act="close">Bỏ qua</button><button class="btn primary">Thêm</button></div></form>`); };
FORM.addBranch = (f) => { const B = BOOK(); const lim = TYPE() === 'enterprise' ? S.billing[P().org].branchLimit : Infinity; if (B.branches.filter((b) => !b.archived).length >= lim) { $('#abErr').textContent = `Gói hiện cho tối đa ${lim} chi nhánh. Liên hệ để nâng gói.`; return; } B.branches.push({ id: uid('br'), name: f.name.value.trim(), address: f.addr.value.trim(), archived: false }); closeDialog(); render(); toast('Đã thêm ' + f.name.value.trim()); };
ACT.archiveBranch = (d) => { const B = BOOK(), b = B.branches.find((x) => x.id === d.id); const n = B.members.filter((m) => m.branch === b.id).length; if (n) { toast(`Còn ${n} người gắn ${b.name} — chuyển họ sang chi nhánh khác trước`, 'alert'); return; } confirmDialog({ title: 'Lưu trữ ' + esc(b.name) + '?', body: '<p>Phiếu cũ vẫn giữ, không lập phiếu mới vào chi nhánh này nữa.</p>', ok: 'Lưu trữ', onOk: () => { b.archived = true; render(); } }); };

/* ─── Gói dịch vụ ─── */
VIEWS.plans = {
  title: 'Gói dịch vụ', icon: 'card', show: () => isBook() && can('billing:manage'),
  render() {
    const b = S.billing[P().org];
    const tierL = { trial: ['Dùng thử', 'info'], premium: ['Premium', 'ok'], grace: ['Quá hạn — ân hạn', 'warn'], free: ['Hết gói', 'alert'] }[b.tier];
    if (!b.selfServe) return `${pagehead('Gói doanh nghiệp', 'Tính theo số chi nhánh, kích hoạt tay sau khi ký hợp đồng.')}<div class="g2"><section class="card"><div class="card-h"><h3>Gói hiện tại</h3><span class="pill ${tierL[1]}">${tierL[0]}</span></div><div class="card-b"><dl class="kv"><dt>Hạn đến</dt><dd>${fmtDay(b.periodEnd)}</dd><dt>Chi nhánh trong gói</dt><dd>${BOOK().branches.filter((x) => !x.archived).length} / ${b.branchLimit}</dd><dt>Nhân viên</dt><dd>Không giới hạn</dd></dl></div></section><section class="card"><div class="card-h"><h3>Thêm chi nhánh hoặc gia hạn</h3></div><div class="card-b stack"><p>Liên hệ để kích hoạt — nhóm hỗ trợ báo giá theo số chi nhánh trong ngày làm việc.</p><div class="row"><span class="mono" style="font-size:1.1em">Zalo 0901 365 365</span><button class="btn sm" data-act="copy" data-t="0901365365">${ic('copy', 15)}Chép số</button></div></div></section></div>`;
    const days = b.tier === 'trial' ? Math.max(0, Math.ceil((b.trialEnds - Date.now()) / DAY)) : 0;
    return `${pagehead('Gói dịch vụ', 'Đơn và kết nối miễn phí cho mọi bên. Gói chỉ mở phần ghi sổ.')}
    <div class="g2"><section class="card"><div class="card-h"><h3>Gói hiện tại</h3><span class="pill ${tierL[1]}">${tierL[0]}</span></div><div class="card-b stack">
      ${b.tier === 'trial' ? `<div class="between"><span>Còn ${days} ngày dùng thử</span><span class="hint">hết ${fmtDay(b.trialEnds)}</span></div><div class="meter"><i style="width:${((30 - days) / 30) * 100}%"></i></div>` : ''}
      ${b.tier === 'premium' ? `<dl class="kv"><dt>Hạn đến</dt><dd>${fmtDay(b.periodEnd)}</dd></dl>` : ''}
      ${b.tier === 'grace' ? '<p>Hết hạn 3 ngày trước. Còn 4 ngày ân hạn để gia hạn trước khi khoá ghi phiếu.</p>' : ''}${b.tier === 'free' ? '<p>Đang tạm khoá ghi phiếu mới. Sổ cũ vẫn xem và lưu ra file.</p>' : ''}
      <p class="hint">Mua lúc đang dùng thử không cộng dồn ngày thử còn lại.</p></div></section>
    <section class="card"><div class="card-h"><h3>Premium</h3><span class="muted">Không giới hạn phiếu, người cân, chi nhánh</span></div><div class="card-b stack">
      <button class="btn primary block" data-act="buy" data-m="1" style="justify-content:space-between"><span>1 tháng</span><span class="tnum">149.000đ</span></button>
      <button class="btn block" data-act="buy" data-m="12" style="justify-content:space-between"><span>12 tháng <span class="pill ok">bớt 298.000đ</span></span><span class="tnum">1.490.000đ</span></button>
      <p class="hint">Chuyển khoản qua mã QR, gói tự mở sau vài giây đến vài phút.</p></div></section></div>
    <section class="card"><div class="card-h"><h3>So sánh</h3></div><div class="table-wrap"><table class="t"><thead><tr><th></th><th>Hết gói</th><th>Premium</th></tr></thead><tbody>${[['Xem sổ, lưu ra Excel/PDF', '✓', '✓'], ['Đơn hàng, kết nối nông dân', '✓', '✓'], ['Ghi phiếu mới, ghi trả tiền', '—', '✓'], ['Người cân dùng chung sổ', '—', '✓'], ['Ảnh chứng từ trên mạng', '—', '✓'], ['Báo cáo thuế', '—', '✓']].map(([a, x, y]) => `<tr><td>${a}</td><td class="${x === '✓' ? 'yes' : 'no'}">${x}</td><td class="yes">${y}</td></tr>`).join('')}</tbody></table></div></section>
    ${b.intents.length ? `<section class="card"><div class="card-h"><h3>Lịch sử chuyển khoản</h3></div><div class="table-wrap"><table class="t"><thead><tr><th>Nội dung</th><th>Ngày</th><th class="num">Số tiền</th><th>Trạng thái</th></tr></thead><tbody>${b.intents.map((x) => `<tr><td class="mono">${x.content}</td><td>${fmtDate(x.at)}</td><td class="num">${vnd(x.amount)}</td><td><span class="pill ${x.status === 'paid' ? 'ok' : 'warn'}">${x.status === 'paid' ? 'Đã nhận' : 'Chờ tiền'}</span></td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
  },
};
ACT.buy = (d) => {
  if (!needNet('mua gói')) return;
  const b = S.billing[P().org]; const m = +d.m; const amount = m === 12 ? 1490000 : 149000;
  let it = b.intents.find((x) => x.status === 'pending' && x.months === m && Date.now() - x.at < DAY);
  if (!it) { it = { id: uid('in'), months: m, amount, content: 'TM365 ' + newCode().slice(0, 6), at: Date.now(), status: 'pending' }; b.intents.unshift(it); }
  openDialog(`${dlgHead('Chuyển khoản ' + vnd(amount), m === 12 ? 'Premium 12 tháng' : 'Premium 1 tháng')}<div class="dlg-b" id="payBody"><div style="display:grid;justify-items:center;gap:8px"><canvas class="qr" id="qr" aria-label="Mã QR minh hoạ"></canvas><span class="hint">Mã QR minh hoạ — bản demo, không quét được</span></div>
   <dl class="kv"><dt>Ngân hàng</dt><dd>(nhóm chưa chốt)</dd><dt>Số tài khoản</dt><dd class="mono">—</dd><dt>Số tiền</dt><dd>${vnd(amount)}</dd></dl>
   <div class="field"><label for="tc">Nội dung chuyển khoản — không sửa</label><div class="row" style="flex-wrap:nowrap"><input class="input mono" id="tc" value="${it.content}" readonly><button class="btn sm" data-act="copy" data-t="${it.content}">${ic('copy', 15)}Chép</button></div><span class="hint">Sai nội dung thì gói không tự mở — khi đó nhắn Zalo hỗ trợ để mở tay.</span></div></div>
   <div class="dlg-f" id="payFoot"><button class="btn" data-act="close">Để sau</button><button class="btn primary" data-act="paid" data-id="${it.id}">Tôi đã chuyển</button></div>`);
  drawQR($('#qr'), it.content);
};
ACT.paid = (d) => {
  const b = S.billing[P().org]; const it = b.intents.find((x) => x.id === d.id); const org = P().org;
  $('#payFoot').innerHTML = '<span class="row hint"><span class="spin"></span>Đang chờ ngân hàng báo về — thường vài giây đến vài phút. Có thể đóng cửa sổ này.</span><button class="btn" data-act="close">Đóng</button>';
  setTimeout(() => {
    it.status = 'paid'; const base = b.tier === 'premium' && b.periodEnd > Date.now() ? b.periodEnd : Date.now();
    b.tier = 'premium'; b.periodEnd = base + it.months * 30 * DAY;
    S.notifs.push({ id: uid('n'), org, kind: 'plan.activated', from: org, at: Date.now(), read: false, text: 'Hạn mới: ' + fmtDay(b.periodEnd) });
    closeDialog(); render(); toast('Đã nhận tiền — gói Premium mở đến ' + fmtDay(b.periodEnd));
  }, 3200);
};

/* ─── Tài khoản ─── */
VIEWS.account = {
  title: 'Tài khoản', short: 'Tài khoản', icon: 'user', show: () => !!ORG(),
  render() {
    const p = P(); const code = 'TM' + hashStr(p.full).toString(36).toUpperCase().slice(0, 5);
    const modeSeg = `<div class="seg">${[['auto', 'Theo máy'], ['day', 'Trong nhà'], ['sun', 'Ngoài nắng'], ['night', 'Ban đêm']].map(([v, l]) => `<button data-act="setMode" data-v="${v}" aria-pressed="${S.mode === v}">${l}</button>`).join('')}</div>`;
    const owner = can('account:delete');
    return `${pagehead('Tài khoản', esc(p.full) + ' · ' + esc(ORG().name))}<div class="g2">
    <section class="card"><div class="card-h"><h3>Hồ sơ</h3></div><form class="card-b stack" data-form="profile"><div class="field"><label for="pfName">Tên hiển thị</label><input class="input" id="pfName" name="name" value="${esc(p.full)}"></div><div class="fields"><div class="field"><label for="pfUser">Tên đăng nhập</label><input class="input" id="pfUser" name="username" value="${esc(p.username)}" placeholder="vd: tuhung"><span class="hint">3–32 ký tự a-z 0-9 . _ — không giống số điện thoại</span></div><div class="field"><label for="pfPhone">Số điện thoại</label><input class="input" id="pfPhone" value="${esc(p.phone)}" readonly><span class="hint">Khoá đăng nhập, không đổi ở đây</span></div></div><div class="field"><label for="pfMail">Email khôi phục (không bắt buộc)</label><input class="input" id="pfMail" name="mail" type="email" placeholder="ten@gmail.com"></div><span class="err" id="pfErr"></span><button class="btn primary" style="justify-self:start">Lưu hồ sơ</button></form></section>
    <div class="stack"><section class="card"><div class="card-h"><h3>Chế độ xem</h3></div><div class="card-b stack">${modeSeg}<p class="hint">Ngoài nắng: chữ to hơn, tương phản cao, nút lớn cho tay đeo găng.</p></div></section>
    <section class="card"><div class="card-h"><h3>Đổi mật khẩu</h3></div><form class="card-b stack" data-form="pw"><div class="fields"><div class="field"><label for="pw1">Mật khẩu mới</label><input class="input" id="pw1" name="pw" type="password" minlength="6" autocomplete="new-password" required></div></div><button class="btn" style="justify-self:start">Đổi mật khẩu</button></form></section></div>
    <section class="card"><div class="card-h"><h3>Mã giới thiệu</h3>${ic('gift')}</div><div class="card-b stack"><div class="row"><span class="code" style="font-size:1.4em">${code}</span><button class="btn sm" data-act="copy" data-t="${code}">${ic('copy', 15)}Chép</button></div><form class="row" data-form="referral" style="flex-wrap:nowrap"><input class="input mono" name="code" placeholder="Nhập mã người mời mình" aria-label="Mã người mời"><button class="btn">Nhập</button></form><p class="hint">Mỗi tài khoản nhập mã người mời một lần.</p></div></section>
    ${isBook() ? `<section class="card"><div class="card-h"><h3>Dữ liệu của bác</h3></div><div class="card-b stack"><p class="hint">Lưu toàn bộ sổ ra một file để cất giữ, hoặc lấy lại từ file đã lưu.</p><div class="row"><button class="btn" data-act="export" data-what="Toàn bộ sổ (.json)">${ic('download')}Lưu ra file</button><button class="btn" data-act="export" data-what="Lấy lại từ file">${ic('upload')}Lấy lại từ file</button></div></div></section>` : ''}
    <section class="card"><div class="card-h"><h3>Pháp lý và hỗ trợ</h3></div><div class="card-b stack"><div class="row"><button class="link" data-act="legal" data-k="terms">Điều khoản sử dụng</button><button class="link" data-act="legal" data-k="privacy">Quyền riêng tư</button></div><div class="row"><span>Hỗ trợ qua Zalo:</span><span class="mono">0901 365 365</span><button class="btn sm" data-act="copy" data-t="0901365365">Chép số</button></div><p class="hint">Nhân viên hỗ trợ chỉ mở sổ khi bác nhờ, và mỗi lần mở đều ghi nhật ký.</p></div></section>
    <section class="card" style="border-color:var(--alert)"><div class="card-h"><h3>${owner ? 'Xoá tài khoản' : 'Rời tổ chức'}</h3></div><div class="card-b stack"><p class="hint">${owner ? 'Xoá thật: ảnh, sổ, đơn, kết nối, hồ sơ và tài khoản đăng nhập. Không lấy lại được. Lưu sổ ra file trước nếu cần.' : 'Rời tổ chức thì mất quyền vào sổ. Tài khoản đăng nhập vẫn còn.'}</p><button class="btn danger" style="justify-self:start" data-act="deleteAcc">${owner ? 'Xoá tài khoản…' : 'Rời tổ chức…'}</button></div></section></div>`;
  },
};
FORM.profile = (f) => { const u = f.username.value.trim().toLowerCase(); if (u && !/^[a-z0-9._]{3,32}$/.test(u)) { $('#pfErr').textContent = 'Tên đăng nhập 3–32 ký tự a-z 0-9 . _'; return; } if (/^\d{9,11}$/.test(u)) { $('#pfErr').textContent = 'Tên đăng nhập không được giống số điện thoại'; return; } if (u === 'tuhung' && S.persona !== 'trader_owner') { $('#pfErr').textContent = 'Tên này đã có người dùng'; return; } P().full = f.name.value.trim() || P().full; P().username = u; render(); toast('Đã lưu hồ sơ'); };
FORM.pw = (f) => { f.reset(); toast('Đã đổi mật khẩu — máy khác sẽ phải đăng nhập lại'); };
FORM.referral = (f) => { const c = f.code.value.trim(); if (!c) return; f.reset(); toast(c.toUpperCase().startsWith('TM') && c.length === 7 ? 'Đã ghi nhận mã người mời' : 'Mã không dùng được', c.toUpperCase().startsWith('TM') && c.length === 7 ? '' : 'alert'); };
ACT.legal = (d) => openDialog(`${dlgHead(d.k === 'terms' ? 'Điều khoản sử dụng' : 'Quyền riêng tư')}<div class="dlg-b"><p class="hint">Bản demo hiển thị trang tĩnh của site. Trang thật nằm ở site pháp lý của dự án.</p>${d.k === 'privacy' ? '<table class="t"><thead><tr><th>Bên thứ ba</th><th>Thấy gì</th></tr></thead><tbody><tr><td>Supabase</td><td>Tài khoản, sổ, ảnh (máy chủ Singapore)</td></tr><tr><td>vietqr.io</td><td>Số tiền và nội dung chuyển khoản khi vẽ mã QR</td></tr><tr><td>Casso / SePay</td><td>Giao dịch vào tài khoản nhận tiền</td></tr><tr><td>Sentry</td><td>Lỗi kỹ thuật, không có số tiền hay số điện thoại</td></tr></tbody></table>' : '<p>Đơn và kết nối miễn phí. Gói Premium 149.000đ/tháng cho vựa. App không giữ tiền hộ và không chi tiền ra.</p>'}</div>`);
ACT.deleteAcc = () => {
  const owner = can('account:delete');
  if (!owner) { confirmDialog({ title: 'Rời ' + esc(ORG().name) + '?', body: '<p>Mất quyền vào sổ ngay. Muốn vào lại thì nhờ chủ thêm lại.</p>', ok: 'Rời tổ chức', danger: true, onOk: () => { S.screen = 'login'; render(); toast('Đã rời tổ chức'); } }); return; }
  if (isBook() && BOOK().members.length > 1) { openDialog(`${dlgHead('Chưa xoá được')}<div class="dlg-b"><div class="banner warn">${ic('alert')}<div class="grow"><b>Gỡ nhân viên trước.</b> Tổ chức còn ${BOOK().members.length - 1} người khác. <span class="mono hint">ORG_HAS_MEMBERS</span></div></div></div><div class="dlg-f"><button class="btn" data-act="close">Đóng</button><button class="btn primary" data-act="go" data-r="staff">Tới trang nhân viên</button></div>`); return; }
  const n = isBook() ? BOOK().receipts.length : 0, o = myOrders().length, l = isBook() ? Object.values(BOOK().partners).filter((p) => p.link && p.link.status === 'active').length : linkedToMe().length;
  openDialog(`${dlgHead('Xoá tài khoản — bước 1/2')}<div class="dlg-b"><p>Sẽ xoá vĩnh viễn:</p><ul><li><b>${n}</b> phiếu và ảnh chứng từ</li><li><b>${o}</b> đơn hàng</li><li><b>${l}</b> kết nối — bên kia mất quyền xem</li><li>Hồ sơ và tài khoản đăng nhập</li></ul><div class="field"><label for="delName">Gõ đúng tên "${esc(ORG().name)}" để tiếp tục</label><input class="input" id="delName" data-in="delName" autocomplete="off" autofocus><span class="err" id="delErr"></span></div></div><div class="dlg-f"><button class="btn" data-act="close">Bỏ qua</button><button class="btn danger" id="delNext" data-act="delStep2" disabled>Tiếp</button></div>`);
};
INP.delName = (el) => { const ok = el.value.trim() === ORG().name; $('#delNext').disabled = !ok; $('#delErr').textContent = el.value && !ok ? 'Chưa khớp tên' : ''; };
ACT.delStep2 = () => confirmDialog({ title: 'Xoá tài khoản — bước 2/2', body: '<p><b>Không lấy lại được.</b> Sổ, hàng đợi và ảnh trên máy này cũng bị xoá rồi đăng xuất — phòng khi đây là máy mượn.</p>', ok: 'Xoá vĩnh viễn', danger: true, onOk: () => { initState(); S.screen = 'login'; render(); toast('Đã xoá tài khoản. Dữ liệu demo đã làm lại từ đầu.'); } });

/* ─── Vỏ Nông dân ─── */
const fLinks = () => linkedToMe();
VIEWS.fhome = {
  title: 'Trang chủ', short: 'Trang chủ', icon: 'home', show: () => TYPE() === 'farmer',
  render() {
    const ls = fLinks(); const owed = sum(ls, (x) => linkedBalance(x.B, x.p).theyOwe); const open = myOrders().filter((o) => OPEN.includes(o.status));
    const recent = ls.flatMap((x) => x.B.receipts.filter((r) => r.partnerId === x.p.id && r.status === 'done' && !r.deleted).map((r) => ({ r, x }))).sort((a, b) => b.r.at - a.r.at).slice(0, 5);
    const next = open.filter((o) => o.status === 'scheduled').sort((a, b) => a.pickupAt - b.pickupAt)[0];
    return `${pagehead('Chào ' + esc(P().name), 'Hộ cô Mai · ' + ls.length + ' vựa đã kết nối', `<button class="btn primary" data-act="go" data-r="fneworder">${ic('plus')}Tạo đơn bán</button>`)}
    ${next ? `<div class="banner info">${ic('calendar')}<div class="grow"><b>${esc(ORGS[next.buyer].name)} hẹn đến cân ${fmtDate(next.pickupAt)}</b> · ${PRODUCTS[next.crop].short} khoảng ${num(next.qty)} kg · ${esc(next.pickupAddress)}</div><button class="btn sm" data-act="openOrder" data-id="${next.id}">Xem đơn</button></div>` : ''}
    <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))"><button class="card kpi hero" data-act="go" data-r="fowed" style="text-align:left;font:inherit;cursor:pointer"><span class="l">Vựa còn nợ cô</span><span class="v">${vnd(owed)}</span><span class="d">Cộng từ ${ls.length} vựa · bấm để xem phiếu</span></button><div class="card kpi"><span class="l">Đơn đang mở</span><span class="v">${open.length}</span><span class="d">${open.filter((o) => o.status === 'submitted').length} chờ vựa nhận</span></div><div class="card kpi"><span class="l">Phiếu 30 ngày</span><span class="v">${recent.length ? ls.reduce((a, x) => a + x.B.receipts.filter((r) => r.partnerId === x.p.id && r.at > T0 - 30 * DAY).length, 0) : 0}</span><span class="d">do vựa ghi về cô</span></div></div>
    <section class="card"><div class="card-h"><h3>Phiếu vựa mới ghi</h3><span class="muted">Chỉ phần in trên biên nhận</span></div><div class="table-wrap"><table class="t"><thead><tr><th>Vựa</th><th>Ngày</th><th class="hide-sm">Mặt hàng</th><th class="num">Tổng</th><th class="num">Còn nợ</th></tr></thead><tbody>${recent.map(({ r, x }) => `<tr class="click" data-act="fVoucher" data-org="${x.org}" data-id="${r.id}"><td>${esc(ORGS[x.org].name)}</td><td>${fmtDate(r.at)}</td><td class="hide-sm">${r.lines.map((l) => x.B.products[l.pid].short).join(', ')}</td><td class="num"><b>${vnd(totalOf(r))}</b></td><td class="num ${debtOf(r) ? 'amt-pay' : 'muted'}">${debtOf(r) ? vnd(debtOf(r)) : 'Đủ'}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Chưa có phiếu</td></tr>'}</tbody></table></div></section>`;
  },
};
ACT.fVoucher = (d) => { const B = S.books[d.org]; const r = B.receipts.find((x) => x.id === d.id); openDialog(`${dlgHead('Phiếu ' + r.code, esc(ORGS[d.org].name))}<div class="dlg-b">${voucher(r, B, d.org, true)}</div>`, 'drawer'); };
VIEWS.fneworder = {
  title: 'Tạo đơn bán', icon: 'plus', show: () => TYPE() === 'farmer',
  render() {
    const ls = fLinks();
    if (!ls.length) return `<section class="card"><div class="empty"><b>Cần kết nối trước</b><span>Xin vựa mã kết nối rồi nhập ở trang "Vựa đã kết nối".</span><button class="btn primary" data-act="go" data-r="flinks">Nhập mã kết nối</button></div></section>`;
    return `${pagehead('Tạo đơn bán', 'Báo vựa cô có hàng. Vựa nhận đơn rồi hẹn ngày đến cân.')}<section class="card" style="max-width:620px"><form class="card-b stack" data-form="fOrder"><div class="field"><label for="foOrg">Bán cho vựa</label><select class="input" id="foOrg" name="org">${ls.map((x) => `<option value="${x.org}">${esc(ORGS[x.org].name)}</option>`).join('')}</select></div>${orderFields()}<button class="btn primary">${ic('send')}Gửi đơn</button><p class="hint">${S.online ? 'Đơn gửi đi ngay, vựa nhận được thông báo.' : 'Đơn cần mạng — bật lại mạng để gửi.'}</p></form></section>`;
  },
};
FORM.fOrder = (f) => { if (!needNet('gửi đơn')) return; createOrder(f.org.value, 'seller', f); };
VIEWS.fowed = {
  title: 'Tiền vựa còn nợ', short: 'Tiền nợ', icon: 'wallet', show: () => TYPE() === 'farmer',
  render() {
    const ls = fLinks(); const sel = S.params.org || (ls[0] && ls[0].org);
    const cards = ls.map((x) => { const b = linkedBalance(x.B, x.p); return `<button class="card kpi" data-act="go" data-r="fowed" data-org="${x.org}" style="text-align:left;font:inherit;color:inherit;cursor:pointer;${x.org === sel ? 'border-color:var(--brand);box-shadow:0 0 0 2px var(--brand-soft)' : ''}"><span class="l">${esc(ORGS[x.org].name)}</span><span class="v amt-pay">${vnd(b.theyOwe)}</span><span class="d">${b.youOwe ? 'Cô còn nợ vựa ' + vnd(b.youOwe) : 'Cô không nợ vựa'}</span></button>`; }).join('');
    const x = ls.find((y) => y.org === sel);
    const rs = x ? x.B.receipts.filter((r) => r.partnerId === x.p.id && r.status === 'done' && !r.deleted) : [];
    return `${pagehead('Tiền vựa còn nợ', 'Số do vựa ghi trong sổ của họ, tính bằng cùng một công thức với vựa.')}<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">${cards || '<div class="empty">Chưa kết nối vựa nào</div>'}</div>
    ${x ? `<section class="card"><div class="card-h"><h3>Phiếu của ${esc(ORGS[x.org].name)}</h3><span class="muted">${rs.length} phiếu · mới nhất trước</span></div><div class="table-wrap"><table class="t"><thead><tr><th>Phiếu</th><th>Ngày</th><th class="hide-sm">Hàng</th><th class="num hide-sm">Tính tiền</th><th class="num">Tổng</th><th class="num">Đã trả</th><th class="num">Còn nợ</th></tr></thead><tbody>${rs.map((r) => `<tr class="click" data-act="fVoucher" data-org="${x.org}" data-id="${r.id}"><td class="mono">${r.code}</td><td>${fmtDate(r.at)}</td><td class="hide-sm">${r.lines.map((l) => x.B.products[l.pid].short).join(', ')}</td><td class="num hide-sm">${kg(netOf(r))}</td><td class="num">${vnd(totalOf(r))}</td><td class="num">${vnd(paidOf(r))}</td><td class="num ${debtOf(r) ? 'amt-pay' : 'muted'}">${debtOf(r) ? vnd(debtOf(r)) : '—'}</td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
  },
};
VIEWS.flinks = {
  title: 'Vựa đã kết nối', icon: 'link', show: () => TYPE() === 'farmer',
  render() { const ls = fLinks(); return `${pagehead('Vựa đã kết nối', 'Nhập mã vựa đưa là đồng ý cho vựa đó cho cô xem phiếu của cô.')}<div class="split"><section class="card"><div class="card-h"><h3>Đang kết nối</h3><span class="muted">${ls.length} vựa</span></div>${ls.map(linkedOrgRow).join('') || '<div class="empty"><b>Chưa có vựa nào</b><span>Xin vựa mã 8 ký tự.</span></div>'}</section>${claimCard()}</div>`; },
};

/* ─── Quản trị (nội bộ) ─── */
VIEWS.aops = {
  title: 'Vận hành', icon: 'activity', show: () => TYPE() === 'admin',
  render() {
    const A = S.admin; const tot = A.orgs.farmer + A.orgs.trader + A.orgs.enterprise; const p = A.p95; const W = 520, H = 120, mx = 300;
    const pts = p.map((v, i) => [10 + (i * (W - 20)) / (p.length - 1), H - 16 - ((H - 32) * v) / mx]);
    const line = pts.map((q) => q.join(',')).join(' '); const area = `10,${H - 16} ${line} ${W - 10},${H - 16}`; const ty = H - 16 - ((H - 32) * 300) / mx; const last = pts[pts.length - 1];
    const fmax = A.funnel[0][1];
    return `${pagehead('Vận hành', 'Số đo từ /metrics và sự kiện sản phẩm (BE9). Không chứa số tiền, số điện thoại hay tên.')}
    <div class="kpis"><div class="card kpi"><span class="l">Tổ chức</span><span class="v">${tot}</span><span class="d">${A.orgs.farmer} nông dân · ${A.orgs.trader} vựa · ${A.orgs.enterprise} DN</span></div><div class="card kpi"><span class="l">Đang trả phí</span><span class="v">${A.paying}</span><span class="d">≈ ${vnd(A.paying * 149000)}/tháng</span></div><div class="card kpi"><span class="l">Thao tác sổ 24 giờ</span><span class="v">${num(A.ops.accepted, 0)}</span><span class="d">${A.ops.duplicate} gửi lại · <b class="${A.ops.rejected ? 'amt-pay' : ''}">${A.ops.rejected} bị từ chối</b></span></div><div class="card kpi"><span class="l">p95 API hôm nay</span><span class="v">${p[p.length - 1]} ms</span><span class="d">Ngưỡng 300 ms</span></div></div>
    <div class="split"><section class="card"><div class="card-h"><h3>Thời gian phản hồi p95 — 14 ngày</h3><span class="muted">ms</span></div><div class="card-b"><svg class="chart spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="p95 14 ngày"><line class="grid" x1="10" x2="${W - 10}" y1="${ty}" y2="${ty}" stroke-dasharray="4 4"/><text x="${W - 12}" y="${ty - 4}" text-anchor="end">ngưỡng 300</text><polygon points="${area}" fill="var(--brand)" opacity=".14"/><polyline points="${line}" fill="none" stroke="var(--brand)" stroke-width="2"/><circle cx="${last[0]}" cy="${last[1]}" r="4" fill="var(--brand)"/><text class="lbl-now" x="${last[0] - 6}" y="${last[1] - 8}" text-anchor="end">${p[p.length - 1]}</text></svg></div></section>
    <section class="card"><div class="card-h"><h3>Hệ thống</h3></div><div class="card-b"><dl class="kv"><dt>/v1/health</dt><dd><span class="pill ok">200</span></dd><dt>Commit</dt><dd class="mono">0e6ec2c</dd><dt>Môi trường</dt><dd>staging · Singapore</dd><dt>Sao lưu gần nhất</dt><dd>${fmtDate(A.backup.last)}</dd><dt>Thử phục hồi</dt><dd>Chủ nhật hằng tuần</dd><dt>Rà lộ khoá</dt><dd><span class="pill ok">Sạch</span></dd></dl></div></section></div>
    <section class="card"><div class="card-h"><h3>Phễu kích hoạt — 30 ngày</h3></div><div class="card-b"><div class="bars">${A.funnel.map(([l, v]) => `<div class="bar"><span>${l}</span><span class="track"><span class="fill" style="width:${(v / fmax) * 100}%;display:block"></span></span><span class="num">${v}</span></div>`).join('')}</div></div></section>`;
  },
};
VIEWS.abilling = {
  title: 'Kích hoạt gói', icon: 'card', show: () => TYPE() === 'admin',
  render() {
    const A = S.admin;
    return `${pagehead('Kích hoạt gói', 'Tiền vào khớp nội dung thì gói tự mở. Ở đây xử lý phần lệch: chuyển thiếu, sai nội dung.')}
    <section class="card"><div class="card-h"><h3>Mã chờ tiền</h3></div><div class="table-wrap"><table class="t"><thead><tr><th>Tổ chức</th><th>Nội dung</th><th class="num">Số tiền</th><th class="hide-sm">Tạo lúc</th><th></th></tr></thead><tbody>${A.intents.map((x) => `<tr><td><b>${esc(x.org)}</b></td><td class="mono">${x.content}</td><td class="num">${vnd(x.amount)}</td><td class="hide-sm">${ago(x.at)}</td><td class="num">${x.status === 'pending' ? `<button class="btn sm primary" data-act="adminOpen" data-id="${x.id}">Mở gói tay</button>` : '<span class="pill ok">Đã mở</span>'}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="card"><div class="card-h"><h3>Tiền vào chưa khớp</h3><span class="muted">Từ Casso / SePay</span></div><div class="table-wrap"><table class="t"><thead><tr><th>Lúc</th><th class="num">Số tiền</th><th>Nội dung</th><th class="hide-sm">Gợi ý</th></tr></thead><tbody>${A.bank.map((b) => `<tr><td>${fmtDate(b.at)}</td><td class="num">${vnd(b.amount)}</td><td class="mono">${esc(b.content)}</td><td class="hide-sm hint">${esc(b.hint)}</td></tr>`).join('')}</tbody></table></div></section>`;
  },
};
ACT.adminOpen = (d) => { const x = S.admin.intents.find((i) => i.id === d.id); confirmDialog({ title: 'Mở gói cho ' + esc(x.org) + '?', body: `<p>Chỉ mở khi đã đối chiếu sao kê. Việc này ghi vào nhật ký hỗ trợ.</p><div class="field"><label for="aoReason">Lý do</label><input class="input" id="aoReason" value="Chuyển khoản sai nội dung, đã đối chiếu sao kê"></div>`, ok: 'Mở gói', onOk: () => { x.status = 'paid'; S.admin.log.unshift({ at: Date.now(), who: 'Quản trị (bản demo)', org: x.org, scope: 'Mở gói tay', reason: ($('#aoReason') || {}).value || 'Đã đối chiếu sao kê' }); render(); toast('Đã mở gói cho ' + x.org); } }); };
VIEWS.alog = {
  title: 'Nhật ký hỗ trợ', icon: 'shield', show: () => TYPE() === 'admin',
  render() { return `${pagehead('Nhật ký hỗ trợ', 'Mỗi lần nhân viên mở sổ hay đổi gói của khách đều ghi lại. Nhật ký không xoá được, kể cả khi khách xoá tài khoản.')}<section class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Lúc</th><th>Người</th><th>Tổ chức</th><th>Phạm vi</th><th class="hide-sm">Lý do</th></tr></thead><tbody>${S.admin.log.map((l) => `<tr><td>${fmtDate(l.at)}</td><td>${esc(l.who)}</td><td>${esc(l.org)}</td><td><span class="pill plain">${esc(l.scope)}</span></td><td class="hide-sm">${esc(l.reason)}</td></tr>`).join('')}</tbody></table></div></section>`; },
};

/* ─── Đăng nhập / đăng ký / "Bác là ai?" ─── */
function authScreen() {
  const left = `<div class="auth-l"><div class="brand"><div class="mark" style="background:var(--on-brand);color:var(--brand)">${ic('scale', 20)}</div><div class="word">THUMUA365</div></div><h1>Sổ thu mua nông sản cho vựa, nông dân và doanh nghiệp</h1><p>Cân xong là có phiếu, công nợ tự cộng, không mạng vẫn ghi. Nông dân tự xem phiếu và tiền vựa còn nợ.</p><ul><li>${ic('sprout')}<span><b>Nông dân</b> — miễn phí: xem phiếu, gửi đơn bán</span></li><li>${ic('scale')}<span><b>Vựa</b> — 149.000đ/tháng, dùng thử 30 ngày</span></li><li>${ic('building')}<span><b>Doanh nghiệp</b> — nhiều chi nhánh, nhân viên, báo cáo tổng</span></li></ul></div>`;
  let card = '';
  if (S.screen === 'login') card = `<form class="authcard" data-form="login"><h2>Đăng nhập</h2><div class="field"><label for="liId">Số điện thoại, email hoặc tên tài khoản</label><input class="input" id="liId" name="id" value="${esc(P().phone || P().username)}" autocomplete="username" required></div><div class="field"><label for="liPw">Mật khẩu</label><input class="input" id="liPw" name="pw" type="password" value="demo123" autocomplete="current-password" required><span class="hint">Gõ "sai" để xem lỗi đăng nhập</span></div><span class="err" id="liErr"></span><button class="btn primary block">Đăng nhập</button><p class="hint">Chưa có tài khoản? <button type="button" class="link" data-act="screen" data-v="signup">Đăng ký</button></p></form>`;
  if (S.screen === 'signup') card = `<form class="authcard" data-form="signup"><h2>Đăng ký</h2><div class="field"><label for="suPhone">Số điện thoại</label><input class="input" id="suPhone" name="phone" inputmode="tel" required><span class="hint">Dùng số này để đăng nhập.</span></div><div class="field"><label for="suMail">Email (không bắt buộc)</label><input class="input" id="suMail" name="mail" type="email"></div><div class="field"><label for="suPw">Mật khẩu</label><input class="input" id="suPw" name="pw" type="password" minlength="6" required><span class="hint">Ít nhất 6 ký tự</span></div><label class="check"><input type="checkbox" name="agree" id="suAgree"><span>Tôi đồng ý <button type="button" class="link" data-act="legal" data-k="terms">Điều khoản</button> và <button type="button" class="link" data-act="legal" data-k="privacy">Quyền riêng tư</button></span></label><span class="err" id="suErr"></span><button class="btn primary block">Tiếp</button><p class="hint">Đã có tài khoản? <button type="button" class="link" data-act="screen" data-v="login">Đăng nhập</button></p></form>`;
  if (S.screen === 'who') { const w = S.who; card = `<form class="authcard" data-form="who"><h2>Bác là ai?</h2><div class="who">${[['farmer', 'sprout', 'Nông dân', 'Bán hàng cho vựa, xem phiếu và tiền vựa còn nợ'], ['trader', 'scale', 'Thương lái / Vựa', 'Ghi phiếu cân, công nợ, kho — dùng thử 30 ngày'], ['enterprise', 'building', 'Doanh nghiệp', 'Nhiều chi nhánh, nhân viên, báo cáo tổng']].map(([v, i, t, s]) => `<button type="button" class="whoopt" data-act="whoType" data-v="${v}" aria-pressed="${w.type === v}"><span class="ib">${ic(i, 22)}</span><span><b>${t}</b><br><span class="hint">${s}</span></span></button>`).join('')}</div>${w.type ? `<div class="field"><label for="whOrg">${w.type === 'farmer' ? 'Tên hộ' : w.type === 'trader' ? 'Tên vựa' : 'Tên doanh nghiệp'}</label><input class="input" id="whOrg" name="org" maxlength="120" required value="${esc(w.org)}" placeholder="${w.type === 'farmer' ? 'Hộ cô Mai' : w.type === 'trader' ? 'Vựa Tư Hùng' : 'Công ty Nông sản Đất Đỏ'}"></div><div class="field"><label for="whName">Tên của bác</label><input class="input" id="whName" name="name" maxlength="80" required></div><div class="field"><label for="whUser">Tên đăng nhập (không bắt buộc)</label><input class="input" id="whUser" name="username"></div><button class="btn primary block">Tạo</button>` : ''}</form>`; }
  return `<div class="auth">${left}<div class="auth-r">${card}</div></div>`;
}
FORM.login = (f) => { if (f.pw.value === 'sai') { $('#liErr').textContent = 'Tài khoản hoặc mật khẩu không đúng'; return; } S.screen = 'app'; S.route = ''; render(); toast('Chào ' + P().name); };
FORM.signup = (f) => { const ph = f.phone.value.replace(/\D/g, ''); if (ph.length < 10) { $('#suErr').textContent = 'Số điện thoại chưa đúng'; return; } if (!f.agree.checked) { $('#suErr').textContent = 'Cần đồng ý điều khoản để đăng ký'; return; } S.who = { type: '', org: '', name: '', username: '' }; S.screen = 'who'; render(); };
ACT.whoType = (d) => { const o = $('#whOrg'); S.who.org = o ? o.value : ''; S.who.type = d.v; render(); };
FORM.who = (f) => {
  const map = { farmer: ['farmer', 'o-mai'], trader: ['trader_owner', 'o-hung'], enterprise: ['ent_owner', 'o-datdo'] }[S.who.type];
  S.persona = map[0]; savePref('persona', S.persona); ORGS[map[1]].name = f.org.value.trim(); PERSONAS[map[0]].full = f.name.value.trim(); PERSONAS[map[0]].name = f.name.value.trim().split(' ').slice(-1)[0];
  S.who = { type: '', org: '', name: '', username: '' }; S.screen = 'app'; S.route = ''; render();
  toast('Đã tạo ' + f.org.value.trim() + (S.persona === 'farmer' ? '' : ' — dùng thử 30 ngày'));
};
