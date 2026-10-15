# Đối chiếu mobile ↔ web/BE (lượt 9.2, 2026-10-15) — chỉ đọc

Hai repo mobile chỉ `git fetch` + `git pull --ff-only` trên `main` (cây làm việc sạch, đang ở `main`). Không cài gói, không build, không chạy app.

## Commit mới

| Repo | Từ → đến | Commit (mới → cũ) | Nội dung |
|---|---|---|---|
| POS + pha chế (`Smart-FnB-Chain-Platform-Mobile`) | `530aa33` → `63a4480` | `63a4480` Revert "feat: add customer display device mode"; `52f4e27` merge PR #6; `c4469e4` fix conflict; `81706a5` new printing invoice feature; `e494a81` add customer display device mode | In hoá đơn Bluetooth (ESC/POS, raster), `OrderReceipt` thêm `items`, `subtotal`, `totalAmount`, `payment`, `currency`; chế độ màn hình khách trong app POS đã thêm rồi bị revert. 22 file |
| Màn hình phía khách (`smart_fnb_cashier_backscreen_version`) | `3dbabee` → `e8a0539` | `e8a0539` merge PR #3; `0211375` fix: integrated API for display poster | Áp phích đọc từ `posters` của display context (`src/display/posters.ts`, `station-sync.tsx`, `display-api.ts`) |

## Bảng lệch ảnh hưởng web/BE

| # | Chỗ dùng chung | Mobile | Web / BE `8a315ad` | Lệch | Ảnh hưởng |
|---|---|---|---|---|---|
| 1 | Áp phích: trường trả về | `posters[{ id, title, imageUrl, durationSeconds }]`, bỏ mục thiếu ảnh, ép 3–60 giây, đường dẫn tương đối ghép với `apiOrigin()` | BE `stations.service.ts:305,333` trả `displayPosters` của chuỗi dưới khoá `posters`; web (QĐ 137) hiển thị cùng bộ trường | Không | — |
| 2 | Áp phích: cập nhật | Hỏi lại `fetchDisplayContext` mỗi 60 giây; comment ghi BE không đẩy khi Owner đổi áp phích | BE không phát sự kiện áp phích (grep `src/realtime`) | Khớp, nhưng chậm tối đa 60 giây | Ghi BE #101 (thấp). Web Owner không cần sửa |
| 3 | Áp phích bị chặn theo gói | `context.posters` bị bỏ qua nếu lỗi → dùng ảnh mặc định trong app | BE `8a315ad`: `GET/PUT …/display-posters` của Owner trả 403 `PLAN_FEATURE_NOT_ENABLED` khi gói không có BRANDING; **display context của thiết bị không đi qua `assertFeatureEnabled`** (chỉ đọc `chain.displayPosters`) | Không | Màn hình khách vẫn thấy áp phích đã tải của gói trước đó dù gói hiện tại không có BRANDING. Chưa rõ BE có chủ ý; hỏi BE nếu đặc tả 13.1 yêu cầu ẩn |
| 4 | Ghép màn hình phía khách / màn gọi số | Mã ghép 6 ký tự, `PAIRING_CODE_*`, `DEVICE_TOKEN_*` (đã có từ lượt trước, không đổi) | BE `assertPairingRateLimit` 10 lần/phút/địa chỉ (bộ nhớ); không khoá 5 lần/5 phút (#86) | Mobile không đoán số lần | Không ảnh hưởng mobile; web đã có `TOO_MANY_REQUESTS_TEXT` |
| 5 | Sự kiện socket | Mobile chỉ nghe `display:snapshot`/sự kiện giỏ của quầy (không đổi trong 2 repo lượt này) | BE phát `payment.cancelled` khi đổi QR sang tiền mặt (mới, `counter-operations.controller.ts`) | Mobile POS không nghe `payment.cancelled` | Chưa kiểm app POS có nghe; chỉ ghi nhận (không đề xuất việc cho mobile ngoài lệch) |
| 6 | Hoá đơn in | `OrderReceipt` mong `items`, `subtotal`, `totalAmount`, `payment`, `currency` | BE `counter-operations.service.ts` `receipt()` trả đủ các trường này | Khớp | — |
| 7 | Nhận diện thương hiệu trên màn hình khách | `branding` ở context (`accentColor`…); không đổi | BE `GET …/branding` của Owner nay 403 khi gói Cơ bản; display context không bị | Không | Màn hình khách có thể còn nhận diện của gói cũ (cùng ý với #3) |
