/**
 * Điều khoản sử dụng. Mỗi câu là một lời hứa đối chiếu được với hệ thống thật
 * (xem đầu `legalLabels.ts`) — sửa hành vi của app thì sửa cả ở đây.
 *
 * Bố cục tham khảo điều khoản dịch vụ của các phần mềm quản lý bán hàng trong
 * nước (KiotViet, Sapo, MISA), cắt bớt phần không thuộc phạm vi THUMUA365.
 */

import {
  FREE_RECEIPTS_PER_MONTH,
  GRACE_DAYS,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_VERSION,
  REFUND_DAYS,
  TRIAL_DAYS,
} from '@/config';
import { LEGAL_BASIS, list, note, OPERATOR_ROWS, p, PRICE_TEXT, table, type LegalDoc } from './legalDoc';

export const TERMS: LegalDoc = {
  title: 'Điều khoản sử dụng',
  meta: `Phiên bản ${LEGAL_VERSION} · Áp dụng từ ${LEGAL_EFFECTIVE_DATE}`,
  intro:
    'Bấm "Đăng ký" (sau khi tự đánh dấu ô đồng ý) nghĩa là bạn đồng ý với các điều dưới đây. Viết ngắn, nói thẳng, đọc hết trong khoảng năm phút.',
  sections: [
    {
      id: 'gioi-thieu',
      title: '1. Dịch vụ này là gì, và không là gì',
      blocks: [
        p('THUMUA365 là phần mềm chạy trên trình duyệt giúp ghi chép việc thu mua nông sản cho ba loại người dùng:'),
        table(
          ['Loại tài khoản', 'Dùng để làm gì'],
          ['Nông dân', 'Xem các phiếu và công nợ mà vựa đã ghi về mình (sau khi kết nối bằng mã vựa đưa).'],
          ['Vựa thu mua', 'Cân, tính tiền, lập phiếu mua / bán, theo dõi công nợ, tồn kho, báo cáo.'],
          ['Doanh nghiệp', 'Như vựa, thêm nhiều chi nhánh và phân quyền quản lý, nhân viên.'],
        ),
        note(
          'Phiếu, biên nhận và báo cáo trong app KHÔNG phải chứng từ kế toán hay hoá đơn theo quy định về hoá đơn, chứng từ, và không thay thế tư vấn thuế. Số liệu do app cộng từ chính phiếu bạn nhập — đưa kế toán xem trước khi dùng để kê khai.',
        ),
        p('THUMUA365 không phải sàn giao dịch: không đứng giữa mua bán, không giữ tiền hàng, không định giá thay bạn.'),
      ],
    },
    {
      id: 'tai-khoan',
      title: '2. Tài khoản',
      blocks: [
        list(
          'Số điện thoại là khoá đăng nhập — mỗi số chỉ có một tài khoản. Email (nếu khai) là email khôi phục và cũng đăng nhập được, vẫn vào đúng tài khoản đó.',
          'Bạn phải đủ 18 tuổi, khai thông tin đúng và tự giữ mật khẩu. Mọi thao tác bằng tài khoản của bạn được coi là do bạn thực hiện, trừ khi bạn đã báo mất tài khoản cho chúng tôi.',
          'Thấy dấu hiệu lạ (đăng nhập lạ, mất máy) thì đổi mật khẩu ngay và nhắn Zalo hỗ trợ.',
          'Quên mật khẩu: nhắn Zalo hỗ trợ. Chúng tôi gọi lại đúng số đã đăng ký và hỏi vài thông tin về sổ trước khi đặt lại — hỏi kỹ vì ai đặt lại được mật khẩu là đọc được sổ tiền của bạn.',
        ),
      ],
    },
    {
      id: 'thanh-vien',
      title: '3. Tổ chức, thành viên và phân quyền',
      blocks: [
        p(
          'Người tạo vựa / doanh nghiệp là chủ (owner). Chủ thêm được quản lý (doanh nghiệp) và nhân viên; mỗi người chỉ thấy và làm được đúng phần quyền của vai trò mình — máy chủ kiểm lại quyền ở mọi thao tác, không chỉ ẩn nút trên màn hình.',
        ),
        list(
          'Chủ chịu trách nhiệm về người mình thêm vào và về việc họ dùng dữ liệu của tổ chức.',
          'Gỡ nhân viên là họ mất quyền vào sổ ngay; phiếu họ đã lập vẫn ở lại trong sổ.',
          'Nhân viên tự xoá tài khoản thì chỉ rời tổ chức, không xoá được sổ của tổ chức.',
        ),
      ],
    },
    {
      id: 'ket-noi',
      title: '4. Kết nối giữa vựa và nông dân',
      blocks: [
        p(
          'Vựa tạo mã kết nối cho đúng một nông hộ trong danh bạ của mình và đưa tận tay. Mã dùng một lần, hết hạn sau 7 ngày. Nông dân nhập mã thì xem được các phiếu và công nợ vựa đã ghi về chính mình — không xem được phần khác của sổ.',
        ),
        p('Hai bên đều huỷ kết nối được bất cứ lúc nào; huỷ xong phía nông dân không còn xem được nữa.'),
      ],
    },
    {
      id: 'du-lieu',
      title: '5. Dữ liệu là của bạn',
      blocks: [
        list(
          'Sổ, phiếu, danh bạ, ảnh chứng từ bạn nhập vào thuộc về bạn (hoặc tổ chức của bạn). Chúng tôi chỉ lưu trữ và xử lý để cung cấp đúng các chức năng của app.',
          'Bạn xuất được toàn bộ sổ ra file bất cứ lúc nào, kể cả khi gói đã hết hạn.',
          'Việc thu thập và bảo vệ dữ liệu cá nhân nói chi tiết trong Chính sách quyền riêng tư — là một phần của điều khoản này.',
        ),
      ],
    },
    {
      id: 'nguoi-thu-ba',
      title: '6. Dữ liệu của người thứ ba do bạn nhập',
      blocks: [
        p(
          'Tên, số điện thoại, khu vực, số tiền mua bán và công nợ của nông hộ, người mua là dữ liệu cá nhân của họ. Với phần dữ liệu này, bạn (tổ chức của bạn) là bên quyết định mục đích xử lý; THUMUA365 là bên xử lý theo yêu cầu của bạn.',
        ),
        list(
          'Chỉ nhập thông tin cần cho việc mua bán, và cho họ biết bạn ghi sổ bằng app.',
          'Họ yêu cầu xem, sửa hay xoá thông tin của mình thì bạn làm ngay trong app; cần hỗ trợ thì nhắn Zalo.',
        ),
      ],
    },
    {
      id: 'gia',
      title: '7. Giá và thanh toán',
      blocks: [
        table(
          ['Mục', 'Nội dung'],
          ['Nông dân', 'Miễn phí.'],
          ['Dùng thử (vựa, doanh nghiệp)', `${TRIAL_DAYS} ngày đầy đủ tính năng, tính từ lúc tạo vựa / doanh nghiệp. Không cần trả trước.`],
          ['Gói miễn phí', `Sau dùng thử: ${FREE_RECEIPTS_PER_MONTH} phiếu mỗi tháng; công nợ, nông hộ và xuất file như gói trả phí. Không thêm người cân, chi nhánh hay ảnh chứng từ mới.`],
          ['Gói trả phí', `${PRICE_TEXT}. Giá đã hiện trong app trước khi bạn chuyển tiền.`],
          ['Cách trả', 'Chuyển khoản ngân hàng theo mã QR trong app, kèm đúng nội dung app đưa sẵn.'],
        ),
        list(
          'Không tự động gia hạn, không lưu thẻ — hết hạn thì bạn chủ động chuyển tiếp, không chuyển cũng không bị trừ gì.',
          'Chuyển sai nội dung: nhắn Zalo kèm ảnh giao dịch, chúng tôi đối soát và mở gói bằng tay trong ngày làm việc.',
          'Biên nhận thanh toán trong app xác nhận đã nhận tiền, không phải hoá đơn giá trị gia tăng.',
        ),
      ],
    },
    {
      id: 'hoan-tien',
      title: '8. Hoàn tiền',
      blocks: [
        p(`Hoàn 100% nếu bạn yêu cầu trong ${REFUND_DAYS} ngày kể từ lần thanh toán, không cần lý do — nhắn Zalo là được. Tiền hoàn về đúng tài khoản đã chuyển.`),
        p('Khi chúng tôi thay đổi điều khoản theo hướng bất lợi mà bạn không đồng ý, hoặc chúng tôi ngừng dịch vụ, phần thời gian chưa dùng được hoàn theo tỷ lệ.'),
      ],
    },
    {
      id: 'het-han',
      title: '9. Khi hết hạn gói',
      blocks: [
        p(`Không khoá dữ liệu. Hết hạn, app còn đồng bộ thêm ${GRACE_DAYS} ngày kèm nhắc nhở, rồi chuyển về gói miễn phí. Bạn vẫn xem, tìm và xuất được toàn bộ sổ như thường.`),
        p('Người cân, chi nhánh và ảnh đã có vẫn giữ nguyên: người cân vẫn đăng nhập và ghi phiếu trên máy, ảnh cũ vẫn xem được. Chỉ thêm người, thêm hoặc dùng lại chi nhánh và gửi ảnh mới là chờ gia hạn.'),
      ],
    },
    {
      id: 'cam',
      title: '10. Những việc không được làm',
      blocks: [
        list(
          'Dùng app để ghi chép, lưu trữ hoặc che giấu hoạt động vi phạm pháp luật.',
          'Nhập dữ liệu cá nhân của người khác khi không cần cho việc mua bán, hoặc dùng sai mục đích.',
          'Bán lại, cho thuê tài khoản; chia sẻ mật khẩu thay vì thêm nhân viên đúng cách.',
          'Dò quét lỗ hổng, cố lấy dữ liệu của tổ chức khác, làm quá tải hoặc can thiệp vào hệ thống.',
        ),
        p('Vi phạm nghiêm trọng thì chúng tôi tạm khoá tài khoản và báo lý do; trừ khi pháp luật cấm, bạn vẫn được hỗ trợ xuất dữ liệu ra file.'),
      ],
    },
    {
      id: 'so-huu-tri-tue',
      title: '11. Quyền sở hữu trí tuệ',
      blocks: [p('Mã nguồn, giao diện, tên và biểu tượng THUMUA365 thuộc về chủ thể vận hành. Bạn được dùng app cho việc kinh doanh của mình, không được sao chép hay bán lại phần mềm.')],
    },
    {
      id: 'trach-nhiem',
      title: '12. Giới hạn trách nhiệm',
      blocks: [
        list(
          'App tính đúng theo con số bạn nhập. Nhập sai số cân, đơn giá, người bán thì kết quả sai — chúng tôi không chịu trách nhiệm về thiệt hại do sai sót nhập liệu.',
          'Báo cáo thuế, bảng kê thu mua là số liệu tổng hợp từ sổ của bạn, không phải tờ khai và không được kiểm theo luật. Bạn tự kiểm tra, tự điền phần còn thiếu (CCCD, địa chỉ người bán) và chịu trách nhiệm khi dùng để kê khai thuế.',
          'Chúng tôi nỗ lực hợp lý để app luôn chạy, nhưng không cam kết 100% thời gian. Vì vậy app ghi vào máy trước, mất mạng vẫn dùng được, và luôn cho lưu sổ ra file.',
          'Trong phạm vi pháp luật cho phép, mức bồi thường tối đa bằng số tiền bạn đã trả trong 3 tháng gần nhất. Điều này không loại trừ trách nhiệm mà pháp luật về bảo vệ người tiêu dùng hay bảo vệ dữ liệu cá nhân không cho phép loại trừ.',
        ),
      ],
    },
    {
      id: 'cham-dut',
      title: '13. Ngừng dùng, ngừng cung cấp',
      blocks: [
        list(
          'Bạn ngừng lúc nào cũng được: bấm "Xoá tài khoản" trong màn Tài khoản là xoá hẳn, không cần gọi ai.',
          'Nếu ngừng cung cấp dịch vụ, chúng tôi báo trước ít nhất 30 ngày trong app và hỗ trợ xuất toàn bộ dữ liệu trước khi đóng.',
        ),
      ],
    },
    {
      id: 'thay-doi',
      title: '14. Thay đổi điều khoản',
      blocks: [p('Sửa gì thì đổi phiên bản, ngày áp dụng ở đầu trang và báo trong app. Thay đổi bất lợi cho bạn thì báo trước ít nhất 30 ngày; không đồng ý thì ngừng dùng, xoá tài khoản và được hoàn phần chưa dùng.')],
    },
    {
      id: 'lien-he',
      title: '15. Liên hệ, khiếu nại và giải quyết tranh chấp',
      blocks: [
        table(['', ''], ...OPERATOR_ROWS),
        p('Khiếu nại gửi qua Zalo hoặc email trên; chúng tôi xác nhận đã nhận trong 2 ngày làm việc và trả lời kết quả trong tối đa 15 ngày.'),
        p('Tranh chấp ưu tiên thương lượng. Không thương lượng được thì giải quyết tại cơ quan có thẩm quyền theo pháp luật Việt Nam.'),
        p('Căn cứ pháp lý chính:'),
        list(...LEGAL_BASIS),
      ],
    },
  ],
};
