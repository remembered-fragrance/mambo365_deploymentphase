# site/ — trang giới thiệu & pháp lý

Bốn trang HTML tĩnh. **Không build, không framework, không công cụ theo dõi.**
Mở thẳng file bằng trình duyệt là xem được.

| File | Là gì |
|---|---|
| `index.html` | Trang giới thiệu + bảng giá công khai |
| `dieu-khoan.html` | Điều khoản sử dụng |
| `quyen-rieng-tu.html` | Chính sách quyền riêng tư |
| `huong-dan.html` | Cài lên điện thoại + câu hỏi hay gặp |
| `style.css` | Màu chép nguyên từ `src/index.css` |

## Trước khi xuất bản

```bash
npm run site:check
```

Lệnh này **chặn deploy** khi còn chỗ trống `ĐIỀN: …`, khi có `<script>`, khi
trang nạp tài nguyên từ máy chủ ngoài, hoặc khi số tiền / số Zalo lệch với
`src/config.ts`. Nó **không** nằm trong `npm run verify`: `verify` phải xanh
suốt trong lúc làm, còn cái này canh đúng lúc phát hành.

### Còn phải điền (cần người, không phải cần code)

| Chỗ | Ai |
|---|---|
| Họ tên / tên hộ kinh doanh chịu trách nhiệm, địa chỉ | Nguyên |
| Email tiếp nhận yêu cầu về dữ liệu | Nguyên |
| Vùng máy chủ Supabase (ghi đúng vùng đã chọn lúc tạo project) | Tài |
| Ba ảnh chụp màn hình thật: Tổng quan · Tạo phiếu · Biên nhận | Tài, chụp trên máy thật |
| Ảnh từng bước cài lên Android và iPhone | Tài |
| Video 60 giây tạo phiếu đầu tiên | Nguyên |

Ảnh đặt vào `site/anh/`. **Ảnh chụp màn hình thật**, không dựng 3D, không tải
ảnh mẫu trên mạng — một cái điện thoại lơ lửng trong không gian nói với chủ vựa
rằng sản phẩm này không phải làm cho họ.

## Deploy

Project Vercel **thứ hai**, cùng repo:

| | |
|---|---|
| Root Directory | `site` |
| Framework Preset | Other (không build) |
| Build Command | *(để trống)* |
| Output Directory | *(để trống)* |
| Domain | `thumua365.vn` |

App vẫn là project thứ nhất, domain `app.thumua365.vn`. Hai project tách nhau để
một lần deploy hỏng bên này không kéo bên kia xuống theo.

## Sửa nội dung

Mọi câu trong hai trang pháp lý phải **đối chiếu được với hệ thống thật**. Sửa
hành vi app mà quên sửa trang này là biến một câu đúng thành một lời hứa suông —
cạm bẫy số một của giai đoạn G. Danh sách đối chiếu nằm ở `MEMORY.md`, mục
giai đoạn G.
