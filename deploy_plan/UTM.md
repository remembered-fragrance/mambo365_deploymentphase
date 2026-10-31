# UTM — đo khách tới từ kênh nào (G1.2)

Theo kế hoạch thu hút khách OC2 ("EXE2 - CO1 - Planning Pitching", slide 7–11): **5 kênh thử nghiệm** W5 → W9, **3 thông
điệp** A/B/C, đo theo AARRR, W8 chọn 2 kênh tốt nhất. Mục tiêu cuối W9: 30 user hợp lệ, 12 khách trả phí, ≥ 4 người được
giới thiệu.

Từ BE `0.26.0`: mở app từ link có `utm_source` thì app giữ nguồn đó trong máy (link mới có UTM thì thay) và gửi kèm
`app_opened` và `sign_up_completed` (`analytics_events.props->'utm'`). Không dùng công cụ thống kê bên ngoài.

## Quy ước

| Tham số | Nghĩa | Giá trị |
|---|---|---|
| `utm_source` | Kênh tạo ra lead (slide 7) | `truc-tiep` · `goi-dien` · `zalo` · `gioi-thieu` · `facebook` |
| `utm_medium` | Cách link tới tay khách | `qr` · `zalo` · `chat` · `nguoi-dung` · `doi-tac` · `nhom` |
| `utm_campaign` | Đợt thử nghiệm | `oc2` (W5–W9; tuần xem theo ngày của sự kiện) |
| `utm_content` | Thông điệp (slide 5) | `tin-a` · `tin-b` · `tin-c` |

- Chỉ chữ thường không dấu, số, `_ . -` — giá trị khác app bỏ, không gửi.
- **Link mang kênh tạo ra lead, không phải kênh chuyển link.** Lead từ cuộc gọi nhận link qua Zalo vẫn là
  `goi-dien`. Nhắn follow-up cho lead đã có thì gửi lại đúng link của nguồn gốc lead đó.
- Link trỏ **thẳng vào app** (`www.thumua365.id.vn`). Landing `thumua365-landing.vercel.app` chưa chuyển tiếp UTM.

Ba thông điệp:

| `utm_content` | Thông điệp | Hợp với |
|---|---|---|
| `tin-a` | "Ghi một lần, lưu lại dễ dàng – quản lý giao dịch thu mua gọn hơn." | Facebook, Zalo |
| `tin-b` | "Tạo phiếu thu mua nhanh, lưu giao dịch tự động, tra cứu khi cần." | Demo trực tiếp, sau cuộc gọi |
| `tin-c` | "THUMUA365 – sổ thu mua điện tử dành cho thương lái cây công nghiệp." | Giới thiệu, đối tác |

## Link cho 5 kênh

Đổi `utm_content` sang `tin-a` / `tin-b` / `tin-c` theo thông điệp đang dùng ở bài / lần gửi đó.

| # | Kênh (slide 7) | Bắt đầu | Link |
|---|---|---|---|
| 1 | Tiếp cận trực tiếp tại điểm thu mua — in mã QR lên tờ rơi / thẻ, khách quét lúc demo 5–10 phút | W5 | `https://www.thumua365.id.vn/?utm_source=truc-tiep&utm_medium=qr&utm_campaign=oc2&utm_content=tin-b` |
| 2 | Gọi điện — sàng lọc, rồi gửi link demo qua Zalo | W5 | `https://www.thumua365.id.vn/?utm_source=goi-dien&utm_medium=zalo&utm_campaign=oc2&utm_content=tin-b` |
| 3 | Zalo — lead đến từ Zalo (danh bạ, nhóm Zalo) | W5 | `https://www.thumua365.id.vn/?utm_source=zalo&utm_medium=chat&utm_campaign=oc2&utm_content=tin-a` |
| 4a | Giới thiệu — khách hiện tại gửi cho người quen | W6 | `https://www.thumua365.id.vn/?utm_source=gioi-thieu&utm_medium=nguoi-dung&utm_campaign=oc2&utm_content=tin-c` |
| 4b | Đối tác — mối quan hệ trong ngành (đại lý vật tư, hợp tác xã…) | W6 | `https://www.thumua365.id.vn/?utm_source=gioi-thieu&utm_medium=doi-tac&utm_campaign=oc2&utm_content=tin-c` |
| 5 | Facebook — bài vấn đề – giải pháp trong cộng đồng phù hợp | W5 | `https://www.thumua365.id.vn/?utm_source=facebook&utm_medium=nhom&utm_campaign=oc2&utm_content=tin-a` |

Kênh giới thiệu còn đếm được bằng **mã giới thiệu** lúc đăng ký (`profiles.referred_by`) — KPI "≥ 4 người được giới
thiệu" lấy từ đó, kể cả người không bấm link.

## Đo (Supabase → SQL editor, chỉ đọc)

Phễu AARRR theo kênh (slide 6, 9). Nguồn của mỗi máy = lần mở app đầu tiên có UTM. Muốn so thông điệp thì đổi
`group by s.source` thành `group by s.source, s.content` (và thêm `s.content` vào `select`).

```sql
with src as (
  select distinct on (anon_id) anon_id, props->'utm'->>'source' as source, props->'utm'->>'content' as content
  from analytics_events
  where name = 'app_opened' and props ? 'utm'
  order by anon_id, created_at
),
signup as (
  select anon_id, min(created_at) as at from analytics_events where name = 'sign_up_completed' group by anon_id
),
org as (
  select distinct e.anon_id, e.organization_id
  from analytics_events e join src using (anon_id)
  where e.organization_id is not null
),
paid as (
  select distinct organization_id from analytics_events where name = 'plan_activated'
)
select s.source,
  count(distinct s.anon_id) as acquisition_devices,
  count(distinct su.anon_id) as signed_up,
  count(distinct e.anon_id) filter (where e.name in ('receipt_created', 'order_created')) as activated,
  count(distinct e.anon_id) filter (where e.name = 'app_opened' and e.created_at >= su.at + interval '1 day') as retention_d1,
  count(distinct e.anon_id) filter (where e.name = 'app_opened' and e.created_at >= su.at + interval '7 days') as retention_d7,
  count(distinct o.organization_id) filter (where o.organization_id in (select organization_id from paid)) as revenue_paid_orgs
from src s
left join signup su using (anon_id)
left join analytics_events e on e.anon_id = s.anon_id
left join org o on o.anon_id = s.anon_id
group by s.source
order by acquisition_devices desc;
```

| Cột | AARRR (slide 6) |
|---|---|
| `acquisition_devices` | Acquisition — máy mở app từ link / mã QR của kênh |
| `signed_up`, `activated` | Activation — đăng ký; lập phiếu hoặc tạo đơn đầu tiên (user hợp lệ) |
| `retention_d1`, `retention_d7` | Retention — mở lại app ≥ 1 / ≥ 7 ngày sau đăng ký |
| `revenue_paid_orgs` | Revenue — tổ chức đã trả tiền (`plan_activated`, máy chủ ghi khi tiền vào) |

Referral (≥ 4 người được giới thiệu):

```sql
select count(*) as referred_users from profiles where referred_by is not null;
```

CPA của từng kênh = chi phí kênh (bảng ngân sách của nhóm) ÷ `revenue_paid_orgs`. Lượt hiển thị / lượt xem bài
(Acquisition trước khi bấm link) lấy từ Facebook / Zalo, không có trong app.
