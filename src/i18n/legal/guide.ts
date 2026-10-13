/**
 * Hướng dẫn dùng — cài lên điện thoại, bắt đầu theo từng loại tài khoản, câu hỏi
 * hay gặp. Chỉ hướng dẫn chức năng đang có trong app; chức năng "Sắp có" thì nói
 * là sắp có.
 */

import { FREE_RECEIPTS_PER_MONTH, GRACE_DAYS, SUPPORT_ZALO } from '@/config';
import { list, note, p, steps, type LegalDoc } from './legalDoc';

export const GUIDE: LegalDoc = {
  title: 'Hướng dẫn dùng',
  intro:
    'App chạy thẳng trong trình duyệt, không cần lên chợ ứng dụng. Cài lên màn hình chính một lần là từ đó mở như một app bình thường.',
  sections: [
    {
      id: 'cai-dat',
      title: 'Cài lên màn hình chính',
      blocks: [
        p('Điện thoại Android (Chrome):'),
        steps(
          'Mở Chrome, vào địa chỉ của app.',
          'Bấm nút ba chấm ở góc trên bên phải.',
          'Chọn "Thêm vào Màn hình chính" (có máy ghi "Cài ứng dụng").',
          'Bấm Thêm. Biểu tượng THUMUA365 hiện ra ngoài màn hình chính.',
        ),
        p('iPhone (bắt buộc dùng Safari — làm trong Chrome sẽ không có mục này):'),
        steps(
          'Mở Safari, vào địa chỉ của app.',
          'Bấm nút Chia sẻ — hình ô vuông có mũi tên đi lên, ở thanh dưới màn hình.',
          'Vuốt lên, chọn "Thêm vào MH chính".',
          'Bấm Thêm ở góc trên bên phải.',
        ),
      ],
    },
    {
      id: 'dang-ky',
      title: 'Đăng ký và chọn "Bác là ai?"',
      blocks: [
        steps(
          'Bấm "Đăng ký", nhập tên, số điện thoại và mật khẩu. Email không bắt buộc, nhưng nên khai để có thêm một cách đăng nhập.',
          'Tự đánh dấu ô đồng ý Điều khoản và Chính sách quyền riêng tư, bấm Đăng ký.',
          'Ở màn "Bác là ai?", chọn Nông dân, Vựa thu mua hoặc Doanh nghiệp. Có thể đặt thêm tên đăng nhập ngắn cho dễ nhớ.',
        ),
        note('Số điện thoại là khoá của tài khoản: đăng nhập bằng số, bằng email hay bằng tên đăng nhập đều vào CÙNG một tài khoản. Đừng đăng ký lần hai bằng email.'),
      ],
    },
    {
      id: 'vua',
      title: 'Vựa và doanh nghiệp: tạo phiếu đầu tiên',
      blocks: [
        steps(
          'Bấm nút tròn ở giữa thanh dưới, chọn "Tạo phiếu mua".',
          'Gõ tên nông hộ. Tên mới thì app tự lưu vào danh bạ, lần sau chỉ cần chọn. Không cần lưu tên thì để trống — thành "Khách lẻ".',
          'Chọn mặt hàng, nhập số cân và đơn giá. Hàng tính theo hàm lượng (mủ cao su…) thì nhập thêm ô hàm lượng; hàng có bì thì nhập ô trừ bì.',
          'Xem lại số tiền — app ghi kèm số tiền bằng chữ để bác đọc lại cho nông hộ nghe. Rồi bấm "Trả đủ & xong" hoặc "Ghi nợ & xong".',
        ),
        p('Đang cân dở mà xe khác tới thì bấm "Khách mới" ở thanh "Đang cân" phía trên — hai phiếu chạy song song, mỗi phiếu giữ số của mình.'),
        p('Nhân viên chỉ thấy các nút đúng với quyền được giao: người cân lập phiếu và thu nợ được, nhưng không sửa giá, không xoá phiếu, không xem báo cáo. Cần thêm quyền thì nhờ chủ vựa.'),
      ],
    },
    {
      id: 'nong-dan',
      title: 'Nông dân',
      blocks: [
        p('Tài khoản nông dân miễn phí. Phần xem phiếu và công nợ mà vựa ghi về mình đang được mở dần: khi vựa đưa mã kết nối, bác nhập mã đó là xem được — mã dùng một lần, hết hạn sau 7 ngày.'),
      ],
    },
    {
      id: 'hoi-dap',
      title: 'Câu hỏi hay gặp',
      blocks: [
        p('Mất mạng có dùng được không?'),
        list('Được. Phiếu ghi thẳng vào máy, có mạng lại thì app tự gửi đi. Tắt app giữa chừng cũng không mất — việc chưa gửi vẫn nằm chờ.'),
        p('Đổi điện thoại có mất dữ liệu không?'),
        list(
          'Gói còn đồng bộ: đăng nhập trên máy mới là sổ về đủ.',
          'Phòng xa: vào Tài khoản bấm "Lưu ra file", gửi file sang máy mới (Zalo cũng được), rồi bấm "Lấy lại từ file". Máy sắp hỏng hay sắp bán thì lưu trước, đừng đợi.',
        ),
        p('Quên mật khẩu thì sao?'),
        list(`Nhắn Zalo ${SUPPORT_ZALO}. Chúng tôi gọi lại đúng số đã đăng ký và hỏi vài thông tin về sổ trước khi đặt lại — hỏi kỹ vì ai đặt lại được mật khẩu là đọc được sổ tiền của bác.`),
        p('Hết hạn gói thì sổ có bị khoá không?'),
        list(`Không. App đồng bộ thêm ${GRACE_DAYS} ngày kèm nhắc nhở, rồi về gói miễn phí ${FREE_RECEIPTS_PER_MONTH} phiếu mỗi tháng. Xem và xuất sổ vẫn như thường.`),
        p('Có tự trừ tiền hằng tháng không?'),
        list('Không. Trả bằng chuyển khoản, hết hạn thì bác chủ động chuyển tiếp. Không ai giữ số thẻ của bác.'),
        p('Chuyển khoản rồi mà gói chưa mở?'),
        list('Thường vào trong vài phút. Lâu hơn thường là do gõ sai nội dung chuyển khoản — nhắn Zalo kèm ảnh giao dịch, chúng tôi mở bằng tay trong ngày làm việc.'),
      ],
    },
  ],
};
