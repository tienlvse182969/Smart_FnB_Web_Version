# BÀN GIAO — Smart F&B Web (phiên agent mới)

> Đọc hết file này trước khi làm gì. Đặc tả chuẩn: `docs/Smart-FnB-Dac-ta-v9.md`.
> Kế hoạch: `docs/Smart-FnB-Ke-hoach-v9.md`. Khi file này, prompt và đặc tả mâu thuẫn: **đặc tả thắng**, và báo lại chỗ lệch.
> Cập nhật: 2026-10-01, sau khi xong Giai đoạn 2 (nhánh `feat/v9-foundation`, chưa push).

---

## 1. Dự án

**Smart F&B Chain Platform** (mã SP26SE123), đồ án tốt nghiệp FPT. SaaS multi-tenant cho chuỗi đồ uống gọi món và **trả tiền trước tại quầy** (cà phê, trà sữa, mang đi), 2–10 chi nhánh.

Dự án đã đổi nghiệp vụ từ v7 sang v9. Những gì v9 **đã bỏ hẳn**, không được dựng lại dưới bất kỳ hình thức nào:
sơ đồ bàn, phiên bàn, xếp/ghép bàn, đặt bàn, Waiter, Kitchen Staff, ca làm, check-in, ví doanh nghiệp, sổ cái, tạm giữ, quyết toán, rút tiền, nhập menu bằng ảnh, voucher, **quản lý kho** (kể cả trừ số suất).

Những gì v9 **mới có**: tuỳ chọn món có giá cộng thêm, 3 gói Cơ bản / Tiêu chuẩn / Nâng cao khác hạn mức và tính năng, liên kết PayOS (tiền về thẳng tài khoản Owner, nền tảng không giữ tiền), quầy + máy in + ghép màn hình bằng mã 6 số, đơn Cần xử lý, xác nhận chuyển khoản thủ công, huỷ đơn đã thanh toán, màn hình gọi số.

## 2. Phạm vi của web

Web chỉ gồm: **Platform Admin, Owner, Branch Manager, và màn hình gọi số chạy trên TV**.

POS thu ngân, màn hình phía khách và màn hình pha chế thuộc **app Android** (người khác làm), không làm trên web. Manager không đứng quầy (CC-08), nên web không có màn POS nào.

## 3. Môi trường

| Thứ | Giá trị |
|---|---|
| Repo web | `tienlvse182969/Smart_FnB_Web_Version` (repo của Tiến) — local: `FE_FnB/Smart_FnB_Web_Version` |
| Repo BE | `Raintostorm/SmartFnBBackend` — local: `BE_FnB/SmartFnBBackend`. **CHỈ ĐỌC** |
| Stack web | React 19 + Vite + Ant Design 6 + Zustand + React Router 7 |
| Stack BE | NestJS + Prisma + PostgreSQL, chạy Docker |
| BE local | `http://localhost:3100`, prefix `/api/v1`, Swagger `/api/docs`, JSON `/api/docs-json` |
| Tài khoản demo | Đọc từ `.env` của BE. **Không in mật khẩu ra báo cáo hay log** |
| Nhánh hiện tại | `feat/v9-foundation` (tạo từ `refactor/v9-scope`, tạo từ `feat/real-tables-payments`) |

## 4. Quy tắc làm việc (bắt buộc)

1. **Khảo sát trước, sửa sau.** Bước nào có chữ "khảo sát" thì chỉ đọc và báo cáo, chờ duyệt.
2. **BE chỉ đọc.** Không sửa code BE, không chạy migration, không chạy seed.
3. **Git:** commit theo từng bước có message rõ ràng. `git add` theo đường dẫn cụ thể, **cấm `git add -A` / `git add .`**. **Không push, không merge.**
4. **Không đụng:** stash `pre-v9-wip`; 4 file LFS luôn hiện `M` (`HarmonyOS_Sans_Regular.ttf` và 3 file `.docx` trong `src/imports/`) — đây là lỗi LFS có từ trước, chủ repo sẽ xử lý.
5. **Không thêm thư viện** nếu chưa nêu lý do và được duyệt (đã duyệt và đã thêm ở Giai đoạn 2: eslint, typescript-eslint, vitest, jsdom, @testing-library/react).
6. **Báo cáo:** tiếng Việt, ngắn, có `file:dòng`. Không tự nhận "xong", "đẹp", "chạy ổn". Chỉ báo sự thật đã kiểm, chỗ không chắc ghi rõ là không chắc.
7. **Không tự mở rộng phạm vi.** Thấy việc ngoài phạm vi thì ghi vào báo cáo, không tự làm.
8. **Kiểm tra trên trình duyệt thật** (Chrome headless qua CDP; script nằm ở `scripts/browser/`, xem README ở đó), không chỉ `tsc` và build.

## 5. Quyết định đã chốt

| Chủ đề | Quyết định |
|---|---|
| Kho | **Không làm kho.** Chỉ có báo hết món / hết tuỳ chọn |
| Màn AuditLog | Xoá (đặc tả 14.2 cắt). BE vẫn ghi log |
| PlatformSettings | Xoá (không có use case) |
| Số dư ví ở Admin | Không bao giờ hiển thị, kể cả khi API trả (BR-07) |
| Trang đăng nhập | Luôn dùng nhận diện nền tảng, không theo tenant (CC-04) |
| Số liệu gói (giá, hạn mức) | Là cấu hình của Admin (CC-01). **Cấm viết cứng ở FE** |
| Tiền | BE trả lẫn `"995000.00"` và `"250000"`. Luôn đi qua `parseAmount` / `formatVnd` trong `lib/reportFormat.ts` |
| Tên tỉnh | Ghi tên đầy đủ theo `constants/provinces.ts`; so khớp thì chuẩn hoá (`normalizeProvince`) |
| Màu | Tách **màu thương hiệu** (theo tenant) và **màu ngữ nghĩa** (cố định, không bao giờ bị thương hiệu đè — BR-42) |
| Màn bị khoá theo gói | Hiện thẻ khoá kèm tên gói cần nâng, **không ẩn hẳn** |
| CC-12 (thu phí gói qua hệ thống) | Chưa chốt. Không làm màn thanh toán gia hạn, nhưng thiết kế lớp API gói chừa chỗ |

## 6. Trạng thái sau Giai đoạn 2

### Commit

Giai đoạn 1 trên `refactor/v9-scope` (`8b3008f` … `d768671`, xem `git log`). Giai đoạn 2 trên `feat/v9-foundation`:

| Commit | Nội dung |
|---|---|
| `0c6f90f` | docs: đưa BAN-GIAO vào `docs/`, sửa bảng route mục 6 |
| `01ed7ba` | chore: thêm eslint, typescript-eslint, vitest, jsdom, testing-library |
| `932e2b1` | 2-A: token màu, một module theme, luật lint cấm màu cứng |
| `8dd7f0b` | 2-B + 2-C: lớp API mock/thật, gói và quyền tính năng, panel mock, script trình duyệt (hai phần dính chung file màn hình nên chung một commit) |
| `7566658` | docs: `docs/api-contract-plan.md` — shape JSON gói/cờ tính năng để gửi BE |
| `0deaedf` | 2-D: Vitest + test, sửa mã BR sai, bỏ cờ staff apps |

Giai đoạn 3 trên `feat/v9-admin` (từ `feat/v9-foundation`, base PR là `feat/v9-foundation`): `4a68aa6` + `fc5e523` (3.2 hồ sơ + doanh nghiệp real, mapper bỏ ví), `340aa81` (api-contract-plan mục 7), `663ae92` (kiểm trình duyệt `scripts/browser/phase3.mjs`), `a9f33dc` (3.3 gói + quy ước cấp), `7090b87` (Landing v9), `741ca22` (form đăng ký).

### Cấu trúc thư mục mới

```
src/api/                      lớp API — màn hình/store CHỈ import từ "../api"
  index.ts                    barrel: authApi, branchApi, … + lỗi + cờ + kịch bản mock
  flags.ts                    cờ VITE_API_<MODULE>=real|mock, bảng cờ in ra console ở dev
  define.ts                   defineApi(): chọn real/mock + bọc báo lỗi thống nhất
  http/client.ts              fetch + Bearer + refresh (khoá liên tab); token ở localStorage
  http/errors.ts              ApiError, phân loại 401/403/hạn mức/mạng, reportApiError
  http/refreshLock.ts         navigator.locks
  modules/<m>/index.ts        interface <M>Api + gắn bản cài đặt; real.ts / mock.ts
  mock/                       control (độ trễ, giả lập lỗi), scenario (A/B, gói, hết hạn), store (sinh dữ liệu
                              lần đầu gặp chainId/branchId), guards, data/{profiles,orders}.ts
src/plan/                     usePlan, useReadOnly/useWriteGuard, FeatureGate, ActionButton, ReadOnlyBanner
src/theme/                    tokens.ts (nơi DUY NHẤT có mã màu), semantic.ts, index.ts (resolveBrand, buildTheme,
                              applyThemeVars, contrast), BrandContext.tsx
src/dev/MockPanel.tsx         chỉ chạy ở vite dev
src/lib/reportFormat.ts       parseAmount, formatVnd… (trước đây services/reportFormat.ts)
src/types/                    TẤT CẢ kiểu request/response (branch, report, plan, order, option, auth, ai…)
scripts/browser/              Chrome CDP + phase2.mjs (+ README)
```

Đã xoá: `src/services/*`, `src/mock/db.ts`, `src/mock/seed.ts`, `mockBridge.ts`, `theme.ts`, `accentContext.ts`. Không còn lớp ánh xạ ID: mock tự sinh dữ liệu cho ID thật.

### Bảng cờ module (mặc định)

| Module | Cờ | Mặc định | Ghi chú |
|---|---|---|---|
| auth | `VITE_API_AUTH` | real | đổi mật khẩu chờ BE (chưa có endpoint cho người đã đăng nhập) |
| branch | `VITE_API_BRANCH` | real | |
| report | `VITE_API_REPORT` | real | BE chưa đếm đơn quầy; thẻ khách đã ẩn (TODO BE) |
| plan | `VITE_API_PLAN` | real | hạn mức THẬT; tier, cờ tính năng, hạn dùng, trạng thái là MOCK (chờ BE) |
| menu | `VITE_API_MENU` | **real** | danh mục + món + gán chi nhánh + menu chi nhánh (4.2); không gửi/đọc `remainingPortions`; giá số nguyên (BR-19) |
| options | `VITE_API_OPTIONS` | mock | BE chưa có (OW-03) — giai đoạn 4 |
| branding | `VITE_API_BRANDING` | mock | BE có endpoint, chờ giai đoạn 6 (BE mới build lại đã có `/branding` và `/stations`; web chưa nối) |
| account | `VITE_API_ACCOUNT` | mock | BE có /auth/managers, /auth/staff, thiếu Cashier/Barista cho Manager — giai đoạn 5 |
| order | `VITE_API_ORDER` | mock | BE chưa có (BM-04..06) — giai đoạn 7 |
| ai | `VITE_API_AI` | mock | BE chưa có (OW-09) — giai đoạn 9 |
| admin | `VITE_API_ADMIN` | **real** | hồ sơ + doanh nghiệp + gói (3.2, 3.3); mapper bỏ ví (BR-07); nộp hồ sơ công khai real. Còn chờ BE: xem `docs/api-contract-plan.md` mục 7 |
| payos | `VITE_API_PAYOS` | mock | BE chưa có (OW-06) — giai đoạn 6 |

Module chưa có `real.ts` mà bật cờ `real` thì rơi về mock kèm cảnh báo. Mỗi giai đoạn sau tự viết `real.ts` rồi đổi mặc định.

### Token màu

- **Thương hiệu** (theo tenant, `BrandTokens`): `primary`, `primaryContrast` (tự chọn theo WCAG ≥ 4.5:1, BR-43), `accent` (đặc tả 10.2 CÓ màu nhấn, nên giữ), `displayName`, `logo`. CSS: `--brand-primary`, `--brand-primary-contrast`, `--brand-accent`.
- **Ngữ nghĩa** (cố định, BR-42): `success`/`warning`/`error`/`info`/`neutral`/`purple` (bg, text, border) + `status.waiting/done/late` (đặc tả 10.5). CSS: `--sem-<tên>-<bg|text|border>`, `--status-*`.
- **Trung tính** (cố định): `ink`, `surface`, `paper`, `paperSubtle`, `line`, `lineSubtle`, `textStrong`, `textMuted`, `textSubtle`, `codeBg`, `codeText`.
- Màn hình dùng `palette.*` (chuỗi `var(--…)`), `onBrandAlpha(%)`, `useBrand()`. ESLint cấm hex/rgb/hsl/tên màu ngoài `src/theme/` (`npm run lint`; CSS không được lint — `index.css` không có mã màu).
- Admin, trang đăng nhập, landing: luôn nhận diện nền tảng. Doanh nghiệp gói Cơ bản: nhận diện nền tảng (cấu hình đã lưu được giữ).
- Trạng thái đơn/dòng món/thanh toán: `ORDER_STATUS_COLOR` … trong `theme/semantic.ts`, khoá tiếng Anh ứng với tên trạng thái đặc tả 5.3–5.6.

### Cây route

| Route | Mã | Trạng thái |
|---|---|---|
| `/admin/overview` | — | real (`adminApi`): KPI đếm bằng `pagination.total` |
| `/admin/tenants` | PA-05 | real: phân trang/tìm kiếm, gia hạn, đổi gói, tạm ngưng (bắt buộc lý do), đặt lại mật khẩu Owner |
| `/admin/signups` | PA-01..03 | real: phân trang/lọc/tìm kiếm phía server, duyệt (gói + số tháng), từ chối (bắt buộc lý do) |
| `/admin/plans` | PA-04 | real: CRUD gói; cấp và cờ tính năng suy từ MÃ gói (BASIC/STANDARD/ADVANCED), chỉ đọc, chờ BE lưu |
| `/owner/reports` | OW-08 | `reportApi` real (+ banner chờ BE); so sánh đa chi nhánh khoá từ Cơ bản |
| `/owner/branches` | OW-01 | `branchApi` real; nút thêm báo sớm hết hạn mức |
| `/owner/menu` | OW-02, OW-04 | real: lọc danh mục/trạng thái/tìm kiếm phía server, thêm/sửa món (SKU, ảnh URL), bật/tắt cấp chuỗi, gán chi nhánh, xoá |
| `/owner/menu/categories` | OW-02 | real: thêm, sửa, ẩn/hiện, đổi thứ tự (displayOrder), xoá (409 còn món) |
| `/owner/menu/options` | OW-03 | placeholder (đã có `optionsApi` mock + dữ liệu) |
| `/owner/accounts` | OW-05 | mock (`accountApi`) — BE có endpoint, web CHƯA nối |
| `/owner/payos` | OW-06 | placeholder (`payosApi` mock) |
| `/owner/branding` | OW-07 | mock (`brandingApi`); khoá từ Cơ bản; Branding.tsx mới chỉ đổi chữ/màu preview |
| `/owner/ai` | OW-09 | mock (`aiApi`), đọc bộ đơn mock; khoá nếu không phải Nâng cao |
| `/owner/plan` | OW-10 | placeholder (đã có `usePlan()`) |
| `/manager/dashboard` | BM-03 | placeholder |
| `/manager/branch-info` | — | `branchApi` real |
| `/manager/menu` | BM-02 | real (`GET /branches/{id}/menu`): chỉ bật/tắt còn bán hôm nay; đã gỡ cột Suất còn lại; làm lại màn ở giai đoạn 5 |
| `/manager/staff` | BM-01 | mock (`accountApi`) |
| `/manager/stations` | BM-01 | placeholder |
| `/manager/orders` | BM-04 | placeholder (`orderApi` mock + bộ đơn có sẵn) |
| `/manager/orders/needs-attention` | BM-05 | placeholder |
| `/manager/orders/:orderId` | BM-04, BM-06 | placeholder (ẩn khỏi sidebar) |
| `/display/call` | (không phải use case) | placeholder, công khai, không sidebar |

CM-02 (hồ sơ, đổi mật khẩu) là drawer/modal trong `RoleShell`, không có route riêng.

### Gói và quyền tính năng

`usePlan()` (tier, hạn mức đã dùng, tính năng, trạng thái, hạn dùng) · `<FeatureGate feature>` (thẻ khoá kèm tên gói cần nâng, không ẩn) · `useReadOnly()`/`useWriteGuard()` · `<ActionButton consumes?>` cho mọi nút ghi · `<ReadOnlyBanner/>` trong `RoleShell`. FE chỉ báo sớm; BE chặn thật (BR-08). **Lệch BE:** hết hạn thì BE chặn cả đọc, đặc tả là chỉ đọc — FE làm theo đặc tả. Hợp đồng gửi BE: `docs/api-contract-plan.md`.

### Tồn đọng đã biết

| Chỗ | Xử lý ở |
|---|---|
| Panel dev đổi doanh nghiệp/gói/hết hạn/lỗi chỉ có ở `vite dev`; mock auth đăng nhập bằng email `*@mock.local` (mật khẩu ở `auth/mock.ts`) | — |
| `branchApi` mock chỉ trả chi nhánh của doanh nghiệp mock, nên auth real + branch mock lệch ID (chỉ ghép cùng chế độ) | ghi nhận |
| Landing: nội dung đã sang v9 (3.3); bảng giá đọc từ cấu hình mock chung (`api/publicPlans.ts`) vì BE chưa có endpoint công khai danh sách gói | chờ BE (mục 7 #8) |
| Form đăng ký (GU-01): đã bỏ ô số chi nhánh dự kiến, chưa có ô chọn gói | chờ BE (mục 7 #8, #9) |
| Quy ước cấp gói theo mã (`plan/tiers.ts`) là tạm; BE chưa có `tier` và cờ tính năng trên gói | chờ BE (mục 7 #10) |
| `BranchMenu.tsx`: màn tối thiểu, chưa có bật/tắt tuỳ chọn (BE chỉ có endpoint Barista) | Giai đoạn 5 |
| `branchApi`: `maxTables`; `authApi`: `WAITER`, `KITCHEN` trong `BackendRole` | Giữ: phản ánh đúng JSON BE hiện tại |
| `README.md` còn mô tả Waiter/Kitchen và `VITE_DEMO_PASSWORD`; `pnpm-lock.yaml` không còn đồng bộ với `package.json` | dọn khi chủ repo quyết dùng npm hay pnpm |
| Khu thu ngân trên web (`CashierApp.tsx`, `cashier-api.ts`) của Bảo đã gỡ khi merge main: POS chạy app Android. Code vẫn trong lịch sử (`dc8fcdd`, `32f6cdc`, `6e226af`) | — |
| `src/api/realtime/operations.ts` (Socket.IO `/operations`, sự kiện `operations.updated`, auth bằng JWT người dùng; dependency `socket.io-client` 4.8.3) chưa dùng ở đâu; để cho màn hình gọi số. Đặc tả dùng token thiết bị chỉ đọc nên gateway BE cần đổi | Giai đoạn 8 |
| `vitest` ghim 4.1.11 (5.0.3 mới phát hành 30/09 bị pnpm chặn theo tuổi bản phát hành); nâng lên 5.x khi đủ tuổi | khi tiện |
| File v7 ở gốc (`Smart-FnB-Dac-ta-v7 (1).md`, `PHAN_TICH_NGHIEP_VU.md`) | KHÔNG đụng (dính stash `pre-v9-wip`) |
| DB local thiếu tài khoản cashier/barista dù seed BE có | Người dùng tự xử lý |

## 7. Backend: hiện trạng tóm tắt

Báo cáo đầy đủ đã gửi nhóm BE. Tóm tắt những gì ảnh hưởng web:

**Có thật, dùng được:** auth (`/auth/login`, refresh, `/auth/me`), PA-01..03, PA-05, `/admin/service-plans`, OW-01, OW-02, OW-04, OW-05, branding GET/PUT/DELETE, `/reports/*` (chỉ OWNER), bật/tắt món chi nhánh qua `PATCH /branches/:id/menu/items/:id`, `GET/POST /stations`, `POST /stations/pair-customer-display`, `DELETE /display-devices/{id}`.

**Chưa có → web phải mock:**

| Mã | Chức năng |
|---|---|
| OW-03 | CRUD nhóm tuỳ chọn, tuỳ chọn, gắn vào món, bật/tắt cấp chuỗi |
| OW-06 | Liên kết PayOS |
| OW-09 | Trợ lý AI |
| OW-10, PA-04 | Cờ tính năng của gói (hạn mức đọc được thật) |
| BM-01 | Tạo/sửa/khoá Cashier, Barista; sửa/ngừng quầy; danh sách thiết bị đã ghép |
| BM-02 | Manager bật/tắt tuỳ chọn (BE chỉ có `/barista/...`) |
| BM-03 | Báo cáo chi nhánh cho Manager (`/reports/*` chỉ OWNER) |
| BM-04 | Tra cứu đơn mọi ngày cho Manager |
| BM-05 | Đơn Cần xử lý, xác nhận thủ công |
| BM-06 | Huỷ đơn đã thanh toán, trạng thái hoàn |
| — | Màn hình gọi số: ghép, token thiết bị, event realtime (gateway hiện chỉ nhận JWT người dùng) |

**BE đang sai, web cần biết:** báo cáo không đếm đơn quầy (lọc `COMPLETED`, đơn quầy kết thúc ở `DELIVERED`); hết hạn gói thì BE chặn cả đọc (đặc tả là chỉ đọc); gói chưa có cờ tính năng.

## 8. Lộ trình

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Dọn v7, route con theo v9 | ✅ xong |
| 2 | Nền móng: token màu, lớp API mock/thật, gói và quyền tính năng, test | ✅ xong (`feat/v9-foundation`) |
| 3 | Admin nối API thật (`adminApi` real); gói 3 tier; Landing đọc giá từ API | ✅ phần web xong trên `feat/v9-admin` (3.2 hồ sơ + doanh nghiệp, 3.3 gói + Landing + form). Còn chờ BE: email, bỏ ví khỏi response, endpoint công khai danh sách gói, tier/cờ tính năng |
| 4 | Owner menu: 4.2 danh mục + món real ✅ (`feat/v9-menu`); 4.3 nhóm tuỳ chọn (OW-03, mock) ▶ tiếp theo | |
| 5 | Manager: tài khoản Cashier/Barista, quầy, máy in, thiết bị đã ghép, bật/tắt tuỳ chọn; gỡ "suất còn lại" | |
| 6 | Owner: liên kết PayOS, nhận diện (`brandingApi` real, preset, tương phản, preview), gói của tôi (OW-10) | |
| 7 | Manager: tra cứu đơn, báo cáo chi nhánh, đơn Cần xử lý, xác nhận thủ công, huỷ đơn đã trả | |
| 8 | Màn hình gọi số trên TV | |
| 9 | Báo cáo đa chi nhánh, trợ lý AI (real), chỉ đọc khi hết hạn khớp BE | |
