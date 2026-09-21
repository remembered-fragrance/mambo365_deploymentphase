# 11. Bản đồ, PostGIS, provider

Phân hệ: dữ liệu điểm + quyền công bố + tìm kiếm + kết nối (follow, đề nghị). **Độc lập provider** — đổi VietMap không đổi `locations`.

Nguồn: [PostGIS trên Supabase](https://supabase.com/docs/guides/database/extensions/postgis), [ST_DWithin](https://postgis.net/docs/ST_DWithin.html), [OSMF tiles](https://operations.osmfoundation.org/policies/tiles/).

## 11.1 Schema geo

```sql
create extension if not exists postgis;

alter table locations
  add column geog geography(Point, 4326);

create index locations_geog_gix on locations using gist (geog);
```

Tọa độ **(longitude, latitude)** — `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`. Check `lng` ∈ [-180,180], `lat` ∈ [-90,90]. Việt Nam thực tế lat ~8–24, lng ~102–110 — không reject ngoài nhưng warn moderation.

Published ⇒ `geog is not null`. Farm `geog` default không public.

## 11.2 Query nearby (mẫu triển khai, chưa EXPLAIN)

Xem [samples/geo-nearby.sql](samples/geo-nearby.sql).

- `ST_DWithin(geog, point, radius_m)`
- `ST_Distance(geog, point)` sort
- Tie-break `id` cho cursor ổn định
- Filter `publish_status = 'published'`, commodity, openNow join hours+timezone, giá `valid_to > now()`
- Limit bắt buộc; radius max 50_000 m
- Nhãn `straight_line`. Routing: adapter `GET /directions` **không** dùng để sort P0 trừ khi user bật “theo đường” (quota).

Bbox: `geog && ST_MakeEnvelope(minLng,minLat,maxLng,maxLat,4326)::geography` + GiST. Zoom < 8: **cluster** server (`ST_SnapToGrid` hoặc precomputed cluster P0.1; P0 zoom thấp trả count-by-grid max 200 cells). **Cấm** dump toàn quốc.

Cluster index: GiST đủ P0; `EXPLAIN ANALYZE` bắt buộc trước khi tuyên bố SLO nearby.

Tìm tên/địa chỉ: `unaccent` + `pg_trgm` trên `name`, `address_text` (tiếng Việt). Không GPS: text search + chọn điểm trên list → set center.

Giá trả về kèm `last_updated_at`, `valid_to`. Hết hạn: field `currentPrice: null` + `priceExpired: true`.

## 11.3 Public vs private projection

| Field | Public GET | Nội bộ WS |
|---|---|---|
| name, type, hours, geog điểm KD | có nếu published | có |
| public_phone | có | có |
| owner home / farm exact | không | theo `geo_visibility` |
| cost, internal notes | không | accountant+ |
| unpublished draft | không (404) | staff |

EXIF GPS: worker strip khi finalize image. Log search: lưu **huyện/grid**, không lưu lat/lng user lâu > 24h trừ abuse investigation (audit).

## 11.4 Vòng đời & abuse

draft → pending_review → published. Report trùng/sai/claim. Moderator. Điểm tài trợ: field `promoted` **tách** khỏi sort “phù hợp” (nhận đúng hàng, grade, qty, giờ, khoảng cách, giá còn hạn). Không gọi điểm trả tiền là “tốt nhất”.

## 11.5 So sánh provider — chọn mặc định

| | Chất lượng địa chỉ VN | Routing | Attribution | Cache | Chi phí (nhãn giả định, chưa snapshot giá 18/09/2026) |
|---|---|---|---|---|---|
| Google Maps | rất tốt | tốt | bắt buộc | hạn ToS | cao theo request |
| Mapbox | khá | tốt | bắt buộc | theo hợp đồng | cao |
| VietMap | tốt VN | tốt VN | theo HĐ | theo HĐ | trung bình, **chọn mặc định** |
| MapLibre + OSM public tiles | renderer ≠ data | n/a | OSM | **cấm production** OSMF | “miễn phí” giả |

MapLibre = thư viện hiển thị, không phải dataset.

**Mặc định:** MapLibre GL + VietMap tiles/geocode/routing.  
**Fallback:** list + server geocode + nhập tay. Timeout 2s, retry 1, circuit 30s. Key hạn domain + Android package. Quota monthly alert.

## 11.6 Kiểm thử bản đồ

A04, A05. Unit: thứ tự lng/lat. Integration: PostGIS container, `ST_DWithin` mét (không nhầm degree). EXPLAIN ANALYZE trên dataset 10k điểm — **kế hoạch, chưa chạy**.
