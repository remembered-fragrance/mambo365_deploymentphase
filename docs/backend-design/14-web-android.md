# 14. Web, Android, Google Play

**Chọn:** giữ React/Vite; **Capacitor** Android (ADR-008). [Capacitor docs](https://capacitorjs.com/docs). TWA/Bubblewrap không mặc định vì offline IDB + camera + share file + push. [TWA](https://developer.chrome.com/docs/android/trusted-web-activity) chỉ revisit nếu native tối thiểu.

Spike build debug **mốc 1** — không cam kết duyệt Play.

## 14.1 Checklist Android

1. **Package ID / tên:** chủ sản phẩm chốt (A-NAME). Debug/release, `versionCode`/`versionName`, icon/splash, AAB, upload key + Play App Signing. Key **không commit**. [Publish](https://developer.android.com/studio/publish), [signing](https://developer.android.com/studio/publish/app-signing).
2. **Target SDK:** kiểm tra **ngày nộp**. Nguồn 18/09/2026: từ **31/08/2026** app điện thoại mới/cập nhật phải target **Android 16 / API 36**. [Play target API](https://developer.android.com/google/play/requirements/target-sdk), [Help Center](https://support.google.com/googleplay/android-developer/answer/11926878). minSdk: 24+ (Capacitor hiện hành — xác minh lúc spike).
3. Vị trí: foreground khi “gần tôi”; approximate + chọn tay. **Không** background location. Camera/ảnh/notification runtime khi dùng; photo picker nếu đủ. [Location permissions](https://developer.android.com/develop/sensors-and-location/location/permissions).
4. Push FCM; App Links điểm/đơn/báo giá; web fallback; `assetlinks.json`; auth+ACL sau open; **cấm** token trên URL. [App Links](https://developer.android.com/training/app-links).
5. Session native store; pause/resume; offline; process death; upload retry; token expiry; đổi TK; back; keyboard; share PDF.
6. Test offline, đổi phiên, update app, IDB migration; SW không cache API contract vô hạn; `minSupportedVersion` + cứu pending.
7. Privacy policy URL, Data safety đúng SDK thật, tuổi, support, tài khoản review 3 role. Cấm auth bypass reviewer. [User Data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).
8. Xóa TK trong app **và** trang web. [Deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).
9. Internal → closed (nếu áp) → production staged. Crash/ANR. Rollback API + app hotfix. TK cá nhân sau 13/11/2023: closed testing ≥12 testers opt-in 14 ngày trước production access — **A-PLAY**, [testing](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).
10. Developer verification, package, UGC, minimum functionality. Phân biệt build AAB / đã nộp / đã duyệt.

## 14.2 Thanh toán Android

- Mua nông sản = hàng vật lý → **không** Play Billing.
- Gói Pro/sync = dịch vụ số → thường **Play Billing** trừ ngoại lệ. [Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en).

Repo QR/Casso **web**. Android P0: **không** copy `PaymentQrDialog`. Hướng: (a) web-only billing, app đọc entitlement; hoặc (b) Play Billing + verify server. Chọn **(a) P0** nếu chưa pháp nhân/Play merchant; ghi rõ trên UI Android “mua gói trên web”. P1: Play Billing verify NestJS, renew/refund/revoke.

Billing namespace ≠ settlements nông sản.

## 14.3 Tái sử dụng frontend

Giữ `src/core` công thức (port decimal dần). `data/` thêm `apiClient` NestJS song song `supabase`. Feature flags: `useNestOrders`. Màn mới: map, listings, quotes, workspace switcher — không rewrite sổ phiếu.

Native adapters: Camera, Filesystem, Preferences, App, Push, Geolocation (optional).
