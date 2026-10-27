# UTM — đo khách tới từ kênh nào (G1.2)

Từ BE `0.26.0`: mở app từ link có `utm_source` thì app giữ nguồn đó trong máy (link mới có UTM thì thay) và gửi kèm
`app_opened` và `sign_up_completed` (`analytics_events.props->'utm'`). Không dùng công cụ thống kê bên ngoài.

## Đặt tên

- Chỉ chữ thường không dấu, số, `_ . -` — giá trị khác app bỏ, không gửi.
- `utm_source` = kênh · `utm_medium` = kiểu đăng · `utm_campaign` = đợt / bài.
- Link trỏ **thẳng vào app** (`www.thumua365.id.vn`). Landing `thumua365-landing.vercel.app` chưa chuyển tiếp UTM sang app.

## Link cho từng kênh

| Kênh | Link |
|---|---|
| Facebook — trang | `https://www.thumua365.id.vn/?utm_source=facebook&utm_medium=social&utm_campaign=ra-mat-2026-10` |
| Facebook — nhóm thu mua | `https://www.thumua365.id.vn/?utm_source=facebook&utm_medium=group&utm_campaign=ra-mat-2026-10` |
| Zalo — tin nhắn / nhóm | `https://www.thumua365.id.vn/?utm_source=zalo&utm_medium=social&utm_campaign=ra-mat-2026-10` |
| Zalo OA | `https://www.thumua365.id.vn/?utm_source=zalo&utm_medium=oa&utm_campaign=ra-mat-2026-10` |
| TikTok | `https://www.thumua365.id.vn/?utm_source=tiktok&utm_medium=social&utm_campaign=ra-mat-2026-10` |
| YouTube | `https://www.thumua365.id.vn/?utm_source=youtube&utm_medium=social&utm_campaign=ra-mat-2026-10` |
| Tờ rơi / mã QR ở chợ | `https://www.thumua365.id.vn/?utm_source=offline&utm_medium=qr&utm_campaign=ra-mat-2026-10` |

Đợt mới thì đổi `utm_campaign`, giữ `utm_source` / `utm_medium`.

## Phễu theo kênh (Supabase → SQL editor, chỉ đọc)

Máy (`anon_id`) mở app từ kênh nào → đăng ký → xem gói → bắt đầu trả → gói mở thật (`plan_activated`, server ghi).

```sql
with src as (
  select distinct on (anon_id) anon_id, props->'utm'->>'source' as source
  from analytics_events
  where name = 'app_opened' and props ? 'utm'
  order by anon_id, created_at
), orgs as (
  select distinct e.organization_id, s.source
  from analytics_events e join src s using (anon_id)
  where e.organization_id is not null
)
select s.source,
  count(distinct s.anon_id) as devices_opened,
  count(distinct e.anon_id) filter (where e.name = 'sign_up_completed') as signed_up,
  count(distinct e.anon_id) filter (where e.name = 'plans_viewed') as viewed_plans,
  count(distinct e.anon_id) filter (where e.name = 'checkout_started') as started_checkout,
  (select count(distinct p.organization_id) from analytics_events p join orgs o using (organization_id)
    where p.name = 'plan_activated' and o.source = s.source) as paid
from src s
left join analytics_events e on e.anon_id = s.anon_id
group by s.source
order by devices_opened desc;
```

Nguồn tính theo lần mở đầu tiên có UTM của mỗi máy. Máy chưa từng mở bằng link có UTM không nằm trong bảng.
