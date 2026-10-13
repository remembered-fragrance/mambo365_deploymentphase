/**
 * Chính sách quyền riêng tư — thông báo xử lý dữ liệu cá nhân theo Luật Bảo vệ
 * dữ liệu cá nhân 2025 (91/2025/QH15) và Nghị định 356/2025/NĐ-CP (thay Nghị
 * định 13/2023). Thời hạn ở mục "Quyền của bạn" lấy theo Điều 5 Nghị định 356.
 *
 * Chỉ ghi những gì hệ thống THẬT SỰ làm. Thêm công cụ thống kê, Sentry, gửi SMS…
 * thì phải sửa trang này trong cùng PR.
 */

import { DATA_REGION, LEGAL_EFFECTIVE_DATE, LEGAL_VERSION } from '@/config';
import { list, note, OPERATOR_ROWS, p, table, type LegalDoc } from './legalDoc';

const REGION = DATA_REGION ?? 'vùng máy chủ đang cập nhật';

export const PRIVACY: LegalDoc = {
  title: 'Chính sách quyền riêng tư',
  meta: `Phiên bản ${LEGAL_VERSION} · Áp dụng từ ${LEGAL_EFFECTIVE_DATE}`,
  intro:
    'Trang này nói THUMUA365 thu thập dữ liệu gì, để làm gì, lưu ở đâu, ai xem được, giữ bao lâu và bạn có quyền gì. Chỗ nào app không làm được thì trang này không hứa.',
  sections: [
    {
      id: 'chu-the',
      title: '1. Ai chịu trách nhiệm',
      blocks: [
        p('Với dữ liệu của chính người dùng (tài khoản, hồ sơ, thanh toán), chủ thể vận hành THUMUA365 là bên kiểm soát và xử lý dữ liệu cá nhân:'),
        table(['', ''], ...OPERATOR_ROWS),
        p('Với dữ liệu của nông hộ, người mua do vựa / doanh nghiệp nhập vào sổ, tổ chức đó là bên kiểm soát; THUMUA365 là bên xử lý theo yêu cầu của họ (xem mục 8).'),
      ],
    },
    {
      id: 'thu-thap',
      title: '2. Thu thập những gì',
      blocks: [
        table(
          ['Nhóm', 'Gồm những gì', 'Nguồn'],
          ['Tài khoản', 'Tên, số điện thoại, mật khẩu (chỉ lưu dạng băm, không ai đọc được), email khôi phục và tên đăng nhập nếu bạn tự khai.', 'Bạn khai khi đăng ký'],
          ['Tổ chức', 'Loại (nông dân / vựa / doanh nghiệp), tên vựa / doanh nghiệp, chi nhánh, vai trò của từng thành viên.', 'Bạn khai ở bước "Bạn là ai?"'],
          ['Sổ', 'Phiếu mua bán, số cân, đơn giá, công nợ, mặt hàng, quy tắc giá, tồn kho, ghi chú.', 'Bạn và nhân viên nhập'],
          ['Người thứ ba', 'Tên, số điện thoại, khu vực của nông hộ và người mua.', 'Bạn nhập (mục 8)'],
          ['Ảnh chứng từ', 'Ảnh phiếu cân, hoá đơn bạn tự chụp và tự đính vào phiếu.', 'Bạn chọn'],
          ['Thanh toán gói', 'Số tiền, thời điểm, mã đối soát, mã giao dịch ngân hàng. Không lưu số thẻ, mật khẩu hay thông tin đăng nhập ngân hàng.', 'Ngân hàng / dịch vụ đối soát'],
          ['Kỹ thuật', 'Nhật ký truy cập máy chủ: địa chỉ IP, thời điểm, đường dẫn gọi, mã lỗi.', 'Tự sinh khi dùng app'],
          ['Sự kiện dùng app', 'Tên việc vừa làm (mở app, đăng nhập được / không được, lập phiếu, tạo đơn, xem gói…), thời điểm, loại tổ chức, phiên bản app, một mã máy ngẫu nhiên và vài con số không định danh (số dòng của phiếu, có mạng hay không). Không có tên, số điện thoại, email hay số tiền.', 'Tự sinh khi dùng app'],
        ),
        note(
          'Không thu thập: vị trí GPS, danh bạ, ảnh trong máy (ngoài ảnh bạn tự chọn), sinh trắc học, căn cước. App tự đếm các sự kiện ở trên trên máy chủ của mình, không dùng công cụ thống kê của bên thứ ba, không có mã quảng cáo, không có cookie theo dõi. THUMUA365 không chủ động thu thập dữ liệu cá nhân nhạy cảm; bạn đừng ghi loại dữ liệu đó vào ô ghi chú.',
        ),
      ],
    },
    {
      id: 'muc-dich',
      title: '3. Dùng để làm gì',
      blocks: [
        list(
          'Tạo và bảo vệ tài khoản, cho đăng nhập bằng số điện thoại, email hoặc tên đăng nhập.',
          'Chạy đúng chức năng bạn thấy trong app: ghi phiếu, tính tiền, công nợ, báo cáo, đồng bộ giữa các máy và giữa thành viên trong tổ chức.',
          'Cho nông dân đã kết nối xem phiếu và công nợ ghi về chính họ.',
          'Mở, gia hạn gói khi bạn chuyển khoản; hoàn tiền khi bạn yêu cầu.',
          'Hỗ trợ khi bạn nhắn hỏi; phát hiện, ngăn chặn truy cập trái phép và sửa lỗi.',
          'Đếm sự kiện dùng app để biết chỗ nào người dùng bỏ dở và sửa cho dễ dùng hơn — chỉ xem số tổng, không xem riêng từng người.',
          'Thực hiện nghĩa vụ theo yêu cầu hợp pháp của cơ quan nhà nước có thẩm quyền.',
        ),
        p('Không bán, không cho thuê, không chia sẻ dữ liệu cho bên thứ ba để quảng cáo. Muốn dùng vào mục đích mới, chúng tôi phải hỏi lại sự đồng ý của bạn.'),
      ],
    },
    {
      id: 'dong-y',
      title: '4. Sự đồng ý',
      blocks: [
        list(
          'Ô "Tôi đồng ý" lúc đăng ký không đánh dấu sẵn; bạn phải tự bấm. Không đồng ý thì không tạo tài khoản, và không có dữ liệu nào được gửi đi.',
          'Bạn rút lại đồng ý bất cứ lúc nào bằng cách xoá tài khoản (mục 7). Rút lại không ảnh hưởng tới việc xử lý hợp pháp trước đó.',
        ),
      ],
    },
    {
      id: 'luu-tru',
      title: '5. Lưu ở đâu, ai cùng xử lý',
      blocks: [
        p('Sổ được ghi vào bộ nhớ trình duyệt trên máy bạn trước (để mất mạng vẫn dùng được), rồi đồng bộ lên máy chủ khi có mạng. Phiên đăng nhập cũng nằm trong bộ nhớ trình duyệt.'),
        table(
          ['Bên cung cấp hạ tầng', 'Xử lý gì', 'Đặt ở đâu'],
          ['Supabase', 'Đăng nhập, cơ sở dữ liệu, ảnh chứng từ (mã hoá khi truyền và khi lưu)', REGION],
          ['Render', 'Máy chủ API — mọi yêu cầu đọc / ghi sổ đi qua đây', 'Singapore'],
          ['Vercel', 'Phát trang web của app; nhật ký truy cập kỹ thuật (IP, thời điểm)', 'Mạng phân phối toàn cầu'],
          ['vietqr.io', 'Sinh ảnh mã QR — chỉ nhận số tiền và nội dung chuyển khoản, không kèm tên hay dữ liệu sổ', 'Việt Nam'],
          ['Ngân hàng, Casso / SePay', 'Thông tin của chính giao dịch chuyển khoản, để tự mở gói', 'Việt Nam'],
          ['Zalo', 'Tin nhắn bạn tự gửi khi cần hỗ trợ', 'Theo chính sách của Zalo'],
        ),
        p('Một phần dữ liệu được lưu trên máy chủ đặt ngoài Việt Nam. Chúng tôi chỉ chọn nhà cung cấp có cam kết bảo mật bằng hợp đồng, và thực hiện thủ tục chuyển dữ liệu cá nhân ra nước ngoài khi pháp luật yêu cầu.'),
      ],
    },
    {
      id: 'ai-xem',
      title: '6. Ai xem được dữ liệu',
      blocks: [
        list(
          'Thành viên của tổ chức, theo đúng vai trò: chủ thấy toàn bộ sổ; quản lý doanh nghiệp thấy chi nhánh mình; nhân viên chỉ thấy phần được giao. Quyền được máy chủ kiểm ở mọi yêu cầu, tài khoản tổ chức khác gọi thẳng vào máy chủ cũng chỉ nhận về rỗng.',
          'Nông dân đã kết nối: chỉ các phiếu và công nợ ghi về chính họ.',
          'Người vận hành: chỉ khi bạn yêu cầu hỗ trợ (đặt lại mật khẩu, mở gói khi chuyển sai nội dung). Mỗi lần đều ghi nhật ký làm gì, cho tài khoản nào, lúc nào; bạn hỏi thì được xem phần nhật ký của mình.',
          'Cơ quan nhà nước: khi có yêu cầu bằng văn bản đúng thẩm quyền theo pháp luật.',
        ),
      ],
    },
    {
      id: 'thoi-gian',
      title: '7. Giữ bao lâu, xoá thế nào',
      blocks: [
        list(
          'Giữ đến khi bạn xoá — không có hạn tự động xoá phiếu cũ.',
          'Bấm "Xoá tài khoản" trong màn Tài khoản là xoá thật: ảnh chứng từ, sổ, kết nối của tổ chức mà bạn là chủ duy nhất, hồ sơ, rồi tài khoản đăng nhập. Dữ liệu trong trình duyệt của máy đó cũng bị xoá.',
          'Bản sao lưu của máy chủ tự hết hạn trong vòng 30 ngày; sau đó dữ liệu đã xoá không còn ở đâu nữa.',
          'Còn lại sau khi xoá, đều không kèm tên bạn: dòng đối soát khoản tiền đã chuyển (để không cộng nhầm hai lần, và lưu theo thời hạn pháp luật về kế toán, thuế), dòng nhật ký hỗ trợ, và sự kiện dùng app (vốn không có tên, số điện thoại hay số tiền).',
        ),
      ],
    },
    {
      id: 'nguoi-thu-ba',
      title: '8. Dữ liệu của nông hộ và người mua',
      blocks: [
        p('App lưu tên, số điện thoại, khu vực và số liệu mua bán của người khác — do vựa / doanh nghiệp nhập vào.'),
        list(
          'Tổ chức nhập dữ liệu chịu trách nhiệm về việc nhập và dùng đúng mục đích mua bán, và cho người đó biết mình ghi sổ bằng app.',
          'THUMUA365 chỉ lưu và xử lý theo yêu cầu của tổ chức đó, không tự dùng vào việc khác, không liên hệ người đó để tiếp thị.',
          'Nông hộ, người mua muốn xem, sửa hay xoá thông tin của mình thì liên hệ vựa / doanh nghiệp đã ghi; nếu không liên lạc được thì nhắn Zalo hỗ trợ, chúng tôi chuyển yêu cầu và hỗ trợ thực hiện.',
        ),
      ],
    },
    {
      id: 'quyen',
      title: '9. Quyền của bạn',
      blocks: [
        table(
          ['Quyền', 'Cách làm', 'Thời hạn nếu cần chúng tôi xử lý'],
          ['Được biết, được xem', 'Mọi thứ đều hiện trong app; trang này', '10 ngày'],
          ['Chỉnh sửa', 'Sửa ngay trong app (hồ sơ, sổ, danh bạ)', '10 ngày'],
          ['Nhận bản sao dữ liệu', 'Nút "Lưu ra file" trong màn Tài khoản', '10 ngày'],
          ['Rút lại đồng ý, phản đối, hạn chế xử lý', 'Xoá tài khoản, hoặc nhắn yêu cầu', '15 ngày'],
          ['Xoá dữ liệu', 'Nút "Xoá tài khoản và toàn bộ dữ liệu"', '20 ngày'],
          ['Khiếu nại', 'Zalo hoặc email ở mục 1; hoặc gửi cơ quan chuyên trách bảo vệ dữ liệu cá nhân (Bộ Công an)', '—'],
        ),
        p('Gửi yêu cầu qua Zalo hoặc email: chúng tôi xác nhận đã nhận trong 2 ngày làm việc. Để tránh người khác giả danh, chúng tôi xác minh bằng số điện thoại đã đăng ký trước khi làm.'),
      ],
    },
    {
      id: 'bao-mat',
      title: '10. Bảo vệ dữ liệu và khi có sự cố',
      blocks: [
        list(
          'Kết nối luôn mã hoá (HTTPS); mật khẩu chỉ lưu dạng băm; phân quyền kiểm ở máy chủ và ở cơ sở dữ liệu.',
          'Khoá bí mật của máy chủ không bao giờ nằm trong app trên máy người dùng.',
          'Phát hiện lộ, mất dữ liệu: chúng tôi khắc phục, báo cơ quan chuyên trách theo đúng thời hạn luật định (72 giờ) và báo cho người bị ảnh hưởng trong app hoặc qua số điện thoại đã đăng ký.',
        ),
      ],
    },
    {
      id: 'tre-em',
      title: '11. Trẻ em',
      blocks: [p('App dành cho người kinh doanh từ đủ 18 tuổi, không hướng tới trẻ em. Phát hiện tài khoản của trẻ em, chúng tôi xoá sau khi báo cho người dùng.')],
    },
    {
      id: 'thay-doi',
      title: '12. Khi chính sách thay đổi',
      blocks: [p('Sửa gì thì đổi phiên bản, ngày áp dụng ở đầu trang và báo trong app. Thay đổi làm giảm quyền của bạn, hoặc thêm mục đích xử lý mới, thì báo trước ít nhất 30 ngày và hỏi lại sự đồng ý khi luật yêu cầu.')],
    },
  ],
};
