# BÀN GIAO — Smart F&B Web (phiên agent mới)

> Đọc hết file này trước khi làm gì. Đặc tả chuẩn: `docs/Smart-FnB-Dac-ta-v9.md`.
> Kế hoạch: `docs/Smart-FnB-Ke-hoach-v9.md`. Khi file này, prompt và đặc tả mâu thuẫn: **đặc tả thắng**, và báo lại chỗ lệch.
> Cập nhật: 2026-10-04, sau 5.8e (chốt giai đoạn 5), đã push `feat/v9-manager`.

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
| BE local | `http://localhost:3100`, prefix `/api/v1`, Swagger `/api/docs`, JSON `/api/docs-json`. **Mã nguồn BE local ở `91867ae` từ 2026-10-05** (pull và build 2026-10-04/05, chi tiết ở cuối dòng này); trước đó ở `0083289` (pull ngày 2026-10-03, **không có backup trước khi pull**; backup gần nhất là 2026-10-02, bản `dfe8100`, `~/backup-smartfnb-20261002-222344.sql`). **Đã build lại và chạy `0083289` ngày 2026-10-03 (~21:01)** sau khi sao lưu bằng `pg_dump` tại `~/backup-smartfnb-20261003-210016.sql` (353 KB, 53 bảng). Container tự `migrate deploy` + `db seed`: đã áp `20261003000000_branch_manager` (chỉ **thêm** 2 cột `payments`, bảng `branch_audit_logs`, 2 index; không xoá gì), `prisma migrate status` báo "Database schema is up to date" (20/20), không migration lỗi. Seed không đổi (vẫn 2 gói giá 0). Trước đó: mã nguồn pull ngày 2026-10-03 **không có backup**; backup trước nữa là 2026-10-02 (bản `dfe8100`, `~/backup-smartfnb-20261002-222344.sql`). Kiểm GET bằng Manager thật: `/manager/menu-options` 200 (4 tuỳ chọn, 2 nhóm, shape khớp `manager-operations.service.ts:182-202`), `/manager/staff`, `/manager/orders`, `/manager/reports`, `/manager/audit-logs` 200, `GET /restaurant-chains` 403. Dùng BE local, không dùng Render. **BE `91867ae` (build 2026-10-05 ~18:10):** sao lưu trước khi pull bằng `docker exec smart-fnb-postgres pg_dump -U smartfnb -d smart_fnb` tại `~/backup-smartfnb-20261004-184610.sql` (454.286 byte, 54 bảng); `git pull --ff-only` (1 commit `feat: complete cashier and barista v9.1 flows`); build bằng `docker compose up -d --build api` (chỉ container `smart-fnb-api` tạo lại, Postgres giữ nguyên); container tự `migrate deploy` áp `20261004160000_add_v91_menu_defaults_and_batching` (thêm `menu_items.allow_batching`, `menu_options.is_default`, không phá huỷ) → **21/21 migration, không lỗi**, seed chạy xong, healthcheck `healthy`. Kiểm SELECT: 2 cột có mặt (NOT NULL, default `true`/`false`); `is_default` đúng cho M và 100% đường. Kiểm GET: `menu/items` có `allowBatching`, `option-groups` vẫn KHÔNG có `isDefault`, `/manager/menu-options` như cũ |
| Tài khoản demo | Đọc từ `.env` của BE. **Không in mật khẩu ra báo cáo hay log** |
| Nhánh hiện tại | `feat/v9-manager` (từ `feat/v9-menu`). Chuỗi PR: `main` ← `feat/v9-foundation` ← `feat/v9-admin` ← `feat/v9-menu` ← `feat/v9-manager` (mỗi PR lấy nhánh trước làm base) |
| Chạy web real | Cổng **5173** (CORS của BE chỉ cho `localhost` 5173, 8443, 8081): `npx vite --port 5173` |

## 4. Quy tắc làm việc (bắt buộc)

1. **Khảo sát trước, sửa sau.** Bước nào có chữ "khảo sát" thì chỉ đọc và báo cáo, chờ duyệt.
2. **BE chỉ đọc.** Không sửa code BE, không chạy migration, không chạy seed, và **KHÔNG gọi API ghi lên BE thật** (kể cả `curl`, kể cả qua form trên web) trừ khi prompt cho phép rõ ràng. Cần dò lỗi thì báo, không tự tạo/sửa dữ liệu thật.
3. **Git:** commit theo từng bước có message rõ ràng. `git add` theo đường dẫn cụ thể, **cấm `git add -A` / `git add .`**. Được push nhánh đang làm; **cấm force push, rebase, merge PR**. File `docs/PR-*.md` nằm trong `.gitignore` (từ `f701bb8`): Khánh dùng làm mô tả PR, không commit.
4. **Không đụng:** stash `pre-v9-wip`; 4 file LFS luôn hiện `M` (`HarmonyOS_Sans_Regular.ttf` và 3 file `.docx` trong `src/imports/`) — đây là lỗi LFS có từ trước, chủ repo sẽ xử lý.
5. **Không thêm thư viện** nếu chưa nêu lý do và được duyệt (đã duyệt và đã thêm ở Giai đoạn 2: eslint, typescript-eslint, vitest, jsdom, @testing-library/react).
6. **Báo cáo:** tiếng Việt, ngắn, có `file:dòng`. Không tự nhận "xong", "đẹp", "chạy ổn". Chỉ báo sự thật đã kiểm, chỗ không chắc ghi rõ là không chắc.
7. **Không tự mở rộng phạm vi.** Thấy việc ngoài phạm vi thì ghi vào báo cáo, không tự làm.
8. **Kiểm tra trên trình duyệt thật** (Chrome headless qua CDP; script nằm ở `scripts/browser/`, xem README ở đó), không chỉ `tsc` và build.
9. **Mỗi commit tự build được.** Chuỗi kiểm tra nối bằng `&&`, không dùng `;`: `tsc --noEmit && pnpm lint && pnpm build && pnpm test`. Test trượt thì không commit. Không chạy test song song với build.
10. **Chỉ báo "xong" khi đã kiểm trình duyệt:** chạy mock trước, rồi real chỉ đọc (cổng 5173) có chặn mọi request ghi.
11. **Trình quản lý gói: pnpm** (`pnpm-lock.yaml`).
12. **Cập nhật BE local:** sao lưu DB trước, pull xong báo migration mới (tên, thêm hay xoá bảng/cột) rồi **dừng**, chờ Khánh duyệt mới build. (Build lại là lúc container chạy `migrate deploy` và seed.) **Lệnh build đã dùng ở 6.3c:** trong thư mục BE, `docker compose up -d --build api` — chỉ tạo lại container `smart-fnb-api`, Postgres giữ nguyên; `docker-entrypoint.sh:4-5` tự chạy `prisma migrate deploy` rồi `prisma db seed`. Kiểm sau build: `docker logs smart-fnb-api` (migration áp, seed xong), `docker ps` (healthy), SELECT chỉ đọc qua `docker exec smart-fnb-postgres psql -U smartfnb -d smart_fnb`. Sao lưu: `docker exec smart-fnb-postgres pg_dump -U smartfnb -d smart_fnb > ~/backup-smartfnb-<YYYYMMDD-HHMMSS>.sql`. Khởi động lại máy cũng chạy lại migrate + seed (seed ghi đè dữ liệu mẫu, #42).
13. **Chạy kiểm trình duyệt theo khối:** lượt thường chỉ chạy khối liên quan; chạy đủ phase2–5 (mock + real) ở lượt chốt giai đoạn. Cờ chung (`scripts/browser/cdp.mjs` `cli()`): `--mode=mock|real` (đối số trần như cũ vẫn dùng được), `--only=<khối>[,<khối>…]`; không cờ = chạy hết. Tên khối:

| Script | `--mode` | `--only` (tên khối) | Thời gian tham khảo |
|---|---|---|---|
| `phase2.mjs` | `mock` (khối `brand`, `login` cần server mock + `AUTH_MODE=mock`), real mặc định (có `flip` mock) | `brand` (**mock-only** từ 6.4: bỏ qua ở real), `plan`, `errors`, `ai`, `refresh`, `flip`, `login` | khối `ai` 17s |
| `phase6.mjs` | `mock`, `real` | `branding` (OW-07, 6.4), `payos` (OW-06, 6.5; khoá GIẢ "test-…-khong-that"; mock cần thêm `VITE_API_PAYOS=mock`; real chặn PUT/DELETE ở CDP, ca "Lưu rồi Gỡ" dùng `fulfillWrites`); `plan` (OW-10, 6.6; real chỉ đọc, ca `subscription: null` tiêm bằng `tab.readOverride` ở `cdp.mjs`, không tới BE) | `branding`: mock 24 ca, real 16 ca; `payos`: mock 15, real 10; `plan`: mock 8, real 11; đủ phase6: mock 47, real 37 |
| `phase3.mjs` | `mock`, `real` | chưa có (chạy hết) | — |
| `phase4.mjs` | `mock`, `real` | `owner`, `manager` | đủ mock 159s, real 41s; `manager` 10s |
| `phase5.mjs` | `mock`, `real` | `menu` (menu món + tuỳ chọn chi nhánh, 5.7b/5.7d), `staff` (màn Nhân viên của Manager, 5.4: mock 28 ca, real 7 ca gồm nhãn "(số liệu mẫu)") | `menu`: mock 46s, real 15s; đủ mock ~4 phút |
| `phase58-forms.mjs` (chỉ real, BE thật) | `real` | `retry` (Thử lại khi form dở), `validation` (400 theo ô) | cả hai 27s |
| `phase58-faults.mjs` (chỉ real, BE thật) | `real` | vai (`admin`, `owner`, `manager`), nhóm (`read`, `write`, `scope`, `expired`), hoặc một phần id màn (`owner/reports`, `manager/menu`, `owner/options`, `owner/menu (gắn nhóm)`…; id có khoảng trắng đặt trong dấu nháy) | 4 màn đọc+ghi 244s; `scope` 1 vai 32s; đủ 3 vai ~25 phút |

14. **Chuỗi kiểm tra trước mỗi commit (kể cả chỉ tài liệu hoặc script):** `pnpm tsc --noEmit && pnpm lint && pnpm build && pnpm test && git commit …` — `git commit` NẰM TRONG chuỗi, nối bằng `&&`; KHÔNG nối bằng `;` và KHÔNG nối ống (`| grep`, `| tail`, `| head`…) bất kỳ lệnh nào trong chuỗi, vì ống làm mất mã thoát (đã từng commit khi test trượt, quyết định 40). Muốn xem gọn thì chuyển đầu ra vào tệp (`> log 2>&1`) rồi đọc riêng. Cũng đừng dùng tệp đánh dấu cũ trong `/tmp` để chờ tiến trình nền (xoá trước khi chờ).

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
| Menu chi nhánh (5.7b, Khánh duyệt) | Món Owner đã tắt: mock hiện dòng xám "Owner đã tắt", công tắc khoá; real không hiện cho tới khi BE làm #19. Tắt món: hộp xác nhận "Món sẽ ẩn khỏi POS của chi nhánh ngay.", không bắt lý do, không nhắc đơn đã thanh toán; bật lại không hộp. Không xử lý xung đột với Barista, chỉ nạp lại sau khi ghi. Web chỉ gửi `isAvailable`, không bao giờ gửi `isEnabled` hay `remainingPortions` |
| Chia 5.7 | 5.7b menu món real ✅ → 5.7c tầng dữ liệu tuỳ chọn chi nhánh ✅ (real qua `/manager/menu-options`, cờ `VITE_API_BRANCH_OPTIONS`, mock lưu F5 key `smartfnb:mock:options:branch:v1:<chainId>:<branchId>`, unit test) → 5.7d giao diện tuỳ chọn + nhãn quota + phase5 → 5.8 |
| Thông báo khi đang nạp khu vực (5.8b, Khánh duyệt) | `ApiErrorBridge` không bắn thông báo nổi cho mất mạng/403/5xx khi `scopeStatus` là `loading` hoặc `error`: màn lỗi toàn trang (`router/guards.tsx`) đã nêu lỗi và có nút Thử lại riêng |
| Bảo vệ form khi Thử lại (5.8d, Khánh duyệt) | Có form/hộp thoại đang nhập dở mà bấm Thử lại → hộp "Nội dung đang nhập sẽ mất. Vẫn tải lại?" (Huỷ: không nạp lại, form và thông báo lỗi còn nguyên). Không có form dở → nạp lại ngay. Phân biệt đọc/ghi theo phương thức HTTP; ngoại lệ `POST /auth/refresh` không bao giờ có Thử lại. Lỗi 400 nhập liệu: hiện các ô sai bằng tiếng Việt khi BE có trả, không dịch được thì câu chung tiếng Việt |
| Nút Thử lại (5.8c, Khánh duyệt) | Chỉ cho lỗi ĐỌC mất mạng và 5xx; không cho 403, 401, 404, 409, 4xx khác và lỗi ghi. Bấm → màn đang mở nạp lại thật (cơ chế ở mục "Tồn đọng đã biết") |
| Thông báo lỗi (5.8b, Khánh duyệt) | Lỗi 5xx: "Máy chủ đang gặp sự cố, thử lại sau ít phút." Câu BE chưa dịch được → câu chung tiếng Việt (bảng dịch ở `api/http/errors.ts`, `BACKEND_TEXT`); không bao giờ hiện tiếng Anh thô. Nút Thử lại: có cho lỗi đọc 500 và mất mạng, không có cho 403 (làm ở 5.8c). Chống trùng: cùng loại lỗi + màn + nội dung trong 3 giây chỉ hiện 1 thông báo. Màn lỗi nạp khu vực và các khối lỗi trong trang (Reports, BranchInfo) dùng cùng hàm dịch; Reports và BranchInfo không bắn thêm thông báo nổi cho 403/mất mạng (`INLINE_ERROR_ROUTES`) |
| Tắt tuỳ chọn (5.7c, Khánh duyệt) | Hộp xác nhận thêm câu "Đơn đã thanh toán có tuỳ chọn này sẽ chuyển Hết món."; sau khi tắt báo số đơn bị ảnh hưởng (`affectedOrderIds.length`). Tắt món giữ câu cũ. Staff (5.4) giữ mock tới khi BE sửa #23/#24. OW-03 real làm đầu GĐ6. Options phía Owner vẫn mock |
| CC-12 (thu phí gói qua hệ thống) | Chưa chốt. Không làm màn thanh toán gia hạn, nhưng thiết kế lớp API gói chừa chỗ |

## 6. Trạng thái hiện tại

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

Giai đoạn 4 trên `feat/v9-menu` (từ `feat/v9-admin`, base PR là `feat/v9-admin`):

| Bước | Commit | Nội dung |
|---|---|---|
| 4.2 | `11a1e5b`, `6d771e1`, `fa5071b`, `5ea2a35` | danh mục + món real, gỡ kho, màn Danh mục, hợp đồng API, kiểm trình duyệt |
| 4.3 | `040e2aa`, `4aabd70`, `52ed773` (+ `9e93899` cố định đồng hồ test) | tuỳ chọn món (mock theo Prisma): luật, màn OW-03, xem trước POS, kiểm trình duyệt |
| 4.4 | `61a4abd`, `fd83667`, `f56aab1`, ``284f436`` | test AI mùng 1; tắt tuỳ chọn mặc định phải xác nhận; mock tuỳ chọn lưu qua F5 + nút xoá trong MockPanel; lỗi BE thì không lưu tuỳ chọn; sửa BAN-GIAO |

Giai đoạn 5 trên `feat/v9-manager` (từ `feat/v9-menu`, base PR là `feat/v9-menu`):

| Bước | Commit | Nội dung |
|---|---|---|
| 5.8d | `aa3e7f0`, `639eeb5` | bảo vệ form khi Thử lại (`lib/dirtyGuard.ts`, `DirtyWatcher`); phân loại đọc/ghi theo HTTP; dịch 400 validate theo ô (`api/http/validationText.ts`); rà bảng dịch lỗi BE (64 câu có file:dòng, `backendMessages.fixture.ts`); `phase58-forms.mjs`; vitest 266/266 |
| 5.8c | `8a21679`, `05e9cc9` | "Thử lại" làm mới thật màn đang mở (`refreshEpoch`, `RefreshBoundary`), nút cho lỗi đọc mất mạng và 5xx; `phase58-faults` kiểm số request mỗi lần bấm; vitest 251/251 |
| 5.8b | `58badd1`, `f6e865f`, `637772e`, `d18e247` | cờ `--mode`/`--only` cho script kiểm; thông báo lỗi tiếng Việt thống nhất, chống trùng, màn lỗi khu vực, Reports/BranchInfo; sửa mock đơn trước 07:30 (AI số đơn không phụ thuộc giờ); vitest 239/239 |
| 5.8a | `62f3664` | bộ giả lập lỗi `phase58-faults.mjs` (500, 403 không mã, mất mạng, 401) và `setFault` ở `cdp.mjs` |
| 5.7d | `2949d79` | giao diện tuỳ chọn theo chi nhánh (tab Tuỳ chọn), thông báo 403 hết hạn không mã, mock Pudding Owner tắt; vitest 233/233, phase5 mock 111/111, real 74/74 |
| 5.7c | `0aa02e8` | tầng dữ liệu tuỳ chọn theo chi nhánh: module `branchOptions` (real `/manager/menu-options`, mock lưu F5), cờ `VITE_API_BRANCH_OPTIONS`, chưa có giao diện; vitest 230/230 |
| 5.7b | `9deded0` | menu món chi nhánh real (BM-02): `BranchMenu`, `ActionSwitch`, mock món Owner tắt, test, phase5 (mock 98/98, real 66/66; đầu lượt real 58/58) |
| 5.2 | `d1abd74`, `36e8a1f`, `a430a9c` | `authApi.setupPassword`, trang `/setup-password`, gỡ `DEFAULT_PASSWORD` và `ForceChangePasswordModal`, `phase5.mjs`, hợp đồng API #23–28 |
| 5.3 | `b418d84`, `f6f2d4e`, `bb8f4b0` | sửa 5.2 (nhận diện nền tảng cho `/setup-password`, giữ status 401); Owner `ManagerAccounts` real qua `/employees`; `phase5.mjs` chặn request ghi ở tầng CDP |

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
| report | `VITE_API_REPORT` | real | BE `dfe8100` tính đơn đã trả (`PAID`) theo `paidAt` nên đã bỏ banner "chờ BE"; chưa trừ đơn huỷ sau thanh toán (BR-50, BE chưa có huỷ đơn đã trả); thẻ khách đã ẩn (TODO BE) |
| plan | `VITE_API_PLAN` | real | hạn mức THẬT; **cờ nhận diện và so sánh đa chi nhánh đọc thật** từ `GET /restaurant-chains` → `subscription.plan` (ưu tiên hơn suy từ mã; panel dev vẫn ghi đè được); cờ AI, cấp (tier), hạn dùng, trạng thái vẫn là MOCK/suy từ mã (chờ BE, #30) |
| menu | `VITE_API_MENU` | **real** | danh mục + món + gán chi nhánh + menu chi nhánh (4.2); không gửi/đọc `remainingPortions`; giá số nguyên (BR-19) |
| options | `VITE_API_OPTIONS` | **real** (từ 6.3) | Phía Owner (OW-03): `optionsApi` theo từng thao tác như BE (`options/real.ts`), `capabilities` real đều false nên ô `isDefault` (#15) và `allowBatching` (#17) bị khoá, panel trạng thái theo chi nhánh ẩn. BE `0083289` thiếu `isDefault`, `allowBatching`, `optionGroups` trong menu (#16, nên đọc cấu hình từng món là N+1, tối đa 4 song song). Mock = `VITE_API_OPTIONS=mock` (theo model Prisma, món tham chiếu bằng ID thật; luật chọn ở `src/api/modules/options/rules.ts`). Test vitest ép `VITE_API_OPTIONS=mock` (`vitest.config.ts`) |
| branch_options | `VITE_API_BRANCH_OPTIONS` | **real** | 5.7c: Manager bật/tắt tuỳ chọn tại chi nhánh, module `branchOptions`: `GET/PATCH /manager/menu-options` (chi nhánh từ JWT, web không gửi `branchId`). Cờ riêng vì ID thật của BE không trộn với ID mock của `options`. API không trả thứ tự nhóm/tuỳ chọn nên web gom theo `group.id`, sắp theo tên (chưa nhờ BE). `ownerDisabled = !option.isActive \|\| !group.isActive` (không suy từ `effectiveAvailable`, vì nó cũng false khi Manager tự tắt). Mock lưu F5 ở `smartfnb:mock:options:branch:v1:<chainId>:<branchId>`, MockPanel xoá được. Giao diện: 5.7d |
| branding | `VITE_API_BRANDING` | **real** (từ 6.4) | OW-07: `GET/PUT/DELETE restaurant-chains/{id}/branding` + `POST …/branding/logo` (multipart, field `file`). BE chưa có `isCustom`/`version` (#39) và chưa chặn theo gói (#33) nên web tự suy `isCustom` (so với bộ mặc định của BE, `theme/tokens.ts` `BE_DEFAULT_BRANDING`) và tự khoá theo `brandingEnabled`. Từ 6.5 web tách `lookCustom` (màu/logo khác mặc định) khỏi tên: chỉ đổi tên → áp tên, màu vẫn của nền tảng (quyết định 28). Vai trò không đọc được (403) → giao diện nền tảng, không lỗi. Mock = `VITE_API_BRANDING=mock` (logo là data URL, lưu qua F5 ở `smartfnb:mock:branding:v1:<chainId>`). Test vitest ép `VITE_API_BRANDING=mock` |
| payos | `VITE_API_PAYOS` | **real** (từ 6.5) | OW-06: `GET/PUT/DELETE restaurant-chains/{id}/payos-channel` (chỉ OWNER; `payos/real.ts`). PUT body CHỈ `{clientId, apiKey, checksumKey}` (`SavePayosChannelDto`), response `{configured, id?, createdAt?, updatedAt?}` KHÔNG có khoá. Web chỉ có 2 trạng thái thật (Chưa/Đã liên kết) + "Đang kiểm tra" chớp lúc lưu; "Lỗi" chỉ mock (panel "PayOS: giả lập trạng thái Lỗi"), chờ #40. PUT cần `PAYOS_MASTER_KEY` trên BE (thiếu thì 503, web báo câu tiếng Việt). Mock lưu **chỉ trạng thái + ngày** ở `smartfnb:mock:payos:v1:<chainId>` (+ cờ Lỗi `smartfnb:mock:payos-error`), không bao giờ lưu khoá. Test vitest ép `VITE_API_PAYOS=mock` |
| stations | `VITE_API_STATIONS` | **real** | 5.5: quầy và máy in (`GET/POST /stations`, role MANAGER; CASHIER GET để chọn quầy trên POS). Module riêng vì quầy có vòng đời riêng và 5.6 mở rộng cùng module. BE chưa có PATCH quầy (#27); trùng tên theo code trả 500 (#34) nên web báo trùng trước. Không giới hạn số quầy |
| account | `VITE_API_ACCOUNT` | **real một phần** | 5.3: Manager (Owner) qua `/employees` real: list phân trang/tìm kiếm/lọc, khoá/mở (`PATCH :id/status`, khoá = `SUSPENDED`), gửi lại email đặt mật khẩu, chuyển chi nhánh; mapper whitelist. Tạo Manager bị khoá ở real (chờ BE #23). Owner **xem** Cashier/Barista bằng real (5.3b, `GET /employees?role=CASHIER|BARISTA`). Manager quản Cashier/Barista là **mock** (chờ BE #24, 5.4 ✅): `real.ts` trỏ thẳng sang `accountMock`, màn `/manager/staff` không gọi `/employees` (Manager bị 403) và hiện banner "Dữ liệu mẫu, chờ BE (#24)". Mock lưu ở localStorage `smartfnb:mock:accounts:v1:<chainId>`. Hạn mức tài khoản (đặc tả 13.1): tính tài khoản không bị khoá của cả doanh nghiệp (gồm Owner), chặn cả tạo lẫn mở khoá |
| order | `VITE_API_ORDER` | mock | BE chưa có (BM-04..06) — giai đoạn 7 |
| ai | `VITE_API_AI` | mock | BE chưa có (OW-09) — giai đoạn 9 |
| admin | `VITE_API_ADMIN` | **real** | hồ sơ + doanh nghiệp + gói (3.2, 3.3); mapper bỏ ví (BR-07); nộp hồ sơ công khai real. Còn chờ BE: xem `docs/api-contract-plan.md` mục 7 |

Module chưa có `real.ts` mà bật cờ `real` thì rơi về mock kèm cảnh báo. Mỗi giai đoạn sau tự viết `real.ts` rồi đổi mặc định.

### Token màu

- **Thương hiệu** (theo tenant, `BrandTokens`): `primary`, `primaryContrast` (tự chọn theo WCAG ≥ 4.5:1, BR-43), `accent` (đặc tả 10.2 CÓ màu nhấn, nên giữ), `displayName`, `logo`. CSS: `--brand-primary`, `--brand-primary-contrast`, `--brand-accent`.
- **Ngữ nghĩa** (cố định, BR-42): `success`/`warning`/`error`/`info`/`neutral`/`purple` (bg, text, border) + `status.waiting/done/late` (đặc tả 10.5). CSS: `--sem-<tên>-<bg|text|border>`, `--status-*`.
- **Trung tính** (cố định): `ink`, `surface`, `paper`, `paperSubtle`, `line`, `lineSubtle`, `textStrong`, `textMuted`, `textSubtle`, `codeBg`, `codeText`.
- Màn hình dùng `palette.*` (chuỗi `var(--…)`), `onBrandAlpha(%)`, `useBrand()`. ESLint cấm hex/rgb/hsl/tên màu ngoài `src/theme/` (`pnpm lint`; CSS không được lint — `index.css` không có mã màu).
- Admin, trang đăng nhập, landing: luôn nhận diện nền tảng. Doanh nghiệp gói Cơ bản: nhận diện nền tảng (cấu hình đã lưu được giữ).
- Trạng thái đơn/dòng món/thanh toán: `ORDER_STATUS_COLOR` … trong `theme/semantic.ts`, khoá tiếng Anh ứng với tên trạng thái đặc tả 5.3–5.6.

### Cây route

| Route | Mã | Trạng thái |
|---|---|---|
| `/admin/overview` | — | real (`adminApi`): KPI đếm bằng `pagination.total` |
| `/admin/tenants` | PA-05 | real: phân trang/tìm kiếm, gia hạn, đổi gói, tạm ngưng (bắt buộc lý do), đặt lại mật khẩu Owner |
| `/admin/signups` | PA-01..03 | real: phân trang/lọc/tìm kiếm phía server, duyệt (gói + số tháng), từ chối (bắt buộc lý do) |
| `/admin/plans` | PA-04 | real: CRUD gói; cấp và cờ tính năng suy từ MÃ gói (BASIC/STANDARD/ADVANCED), chỉ đọc, chờ BE lưu |
| `/owner/reports` | OW-08 | `reportApi` real; so sánh đa chi nhánh khoá theo cờ gói |
| `/owner/branches` | OW-01 | `branchApi` real; nút thêm báo sớm hết hạn mức |
| `/owner/menu` | OW-02, OW-04 | real: lọc danh mục/trạng thái/tìm kiếm phía server, thêm/sửa món (SKU, ảnh URL), bật/tắt cấp chuỗi, gán chi nhánh, xoá |
| `/owner/menu/categories` | OW-02 | real: thêm, sửa, ẩn/hiện, đổi thứ tự (displayOrder), xoá (409 còn món) |
| `/owner/menu/options` | OW-03 | `OptionGroups.tsx` — nhóm + tuỳ chọn, real từ 6.3 (lưu từng thao tác; ô `isDefault` khoá chờ #15); panel trạng thái chi nhánh ẩn ở real |
| `/owner/accounts` | OW-05 | real (`accountApi`, `/employees`): Manager list/khoá/đặt lại/chuyển chi nhánh, mọi thao tác ghi có hộp xác nhận; tạo Manager khoá chờ BE #23; tab Thu ngân & Pha chế chỉ xem, dữ liệu mock (#24) |
| `/owner/payos` | OW-06 | `PayosLink.tsx` (real từ 6.5: nhập 3 khoá một chiều, gỡ liên kết có xác nhận) |
| `/owner/branding` | OW-07 | `Branding.tsx`, real từ 6.4 (GET/PUT/DELETE + tải logo multipart); khoá toàn bộ khi gói không có nhận diện |
| `/owner/ai` | OW-09 | mock (`aiApi`), đọc bộ đơn mock; khoá nếu không phải Nâng cao |
| `/owner/plan` | OW-10 | `MyPlan.tsx` (6.6: tên gói, hạn mức, tính năng; chỉ xem) |
| `/manager/dashboard` | BM-03 | placeholder |
| `/manager/branch-info` | — | `branchApi` real |
| `/manager/menu` | BM-02 | real (`GET /branches/{id}/menu`, `PATCH …/menu/items/{id}` chỉ `{isAvailable}`): 5.7b — nhóm theo danh mục, tìm theo tên, banner, công tắc "Còn bán hôm nay" (`ActionSwitch`, khoá kèm tooltip khi hết hạn), tắt món có hộp xác nhận, bật lại không hộp. Dòng "Owner đã tắt" (xám, khoá) chỉ có ở mock; real chờ BE #19. 5.7d ✅ — tab "Tuỳ chọn" (`branchOptionsApi`, real `/manager/menu-options`): gom nhóm, giá "+6.000đ"/"Không cộng thêm", tắt có hộp xác nhận nhắc đơn đã thanh toán chuyển Hết món, toast nêu số đơn bị ảnh hưởng, dòng Owner đã tắt khoá không gọi API; dùng chung ô tìm kiếm |
| `/manager/staff` | BM-01 | mock (`accountApi`) |
| `/manager/stations` | BM-01 | real (`stationsApi`, `GET/POST /stations`): bảng quầy (tên, trạng thái, máy in, số màn hình đã ghép), thêm quầy (kiểm IPv4 kèm cổng / MAC ở web, báo trùng tên sớm, hộp xác nhận). Đổi tên, ngừng dùng, sửa máy in khoá chờ BE #27. **5.6:** mỗi quầy mở rộng xem màn hình khách đã ghép (tên, ngày ghép, "lần cuối thấy"), nút Ghép màn hình khách (hộp nhập 6 ô, dán được; cảnh báo thay máy cũ, BR-45) và Thu hồi (có xác nhận); khu Màn hình gọi số của chi nhánh có nút ghép, chưa liệt kê được (chờ BE #28, web không tự lưu danh sách); hết hạn gói thì các nút khoá. Không hiện token thiết bị |
| `/manager/orders` | BM-04 | placeholder (`orderApi` mock + bộ đơn có sẵn) |
| `/manager/orders/needs-attention` | BM-05 | placeholder |
| `/manager/orders/:orderId` | BM-04, BM-06 | placeholder (ẩn khỏi sidebar) |
| `/display/call` | (không phải use case) | placeholder, công khai, không sidebar |
| `/setup-password?token=…` | (không phải use case) | công khai, không sidebar: đặt mật khẩu từ link email (`authApi.setupPassword`: real `POST /auth/setup-password` + mock; token `mock-valid`). Token xoá khỏi URL ngay khi đọc |

CM-02 (hồ sơ, đổi mật khẩu) là drawer/modal trong `RoleShell`, không có route riêng.

### Gói và quyền tính năng

`usePlan()` (tier, hạn mức đã dùng, tính năng, trạng thái, hạn dùng) · `<FeatureGate feature>` (thẻ khoá kèm tên gói cần nâng, không ẩn) · `useReadOnly()`/`useWriteGuard()` · `<ActionButton consumes?>` cho mọi nút ghi · `<ReadOnlyBanner/>` trong `RoleShell`. FE chỉ báo sớm; BE chặn thật (BR-08). **Lệch BE:** hết hạn thì BE chặn cả đọc, đặc tả là chỉ đọc — FE làm theo đặc tả. Hợp đồng gửi BE: `docs/api-contract-plan.md`.

### Tồn đọng đã biết

| Chỗ | Xử lý ở |
|---|---|
| Panel dev (`dev/MockPanel.tsx`) chỉ có ở `vite dev` (`App.tsx:55` `import.meta.env.DEV`); mock auth đăng nhập bằng email `*@mock.local` (mật khẩu ở `auth/mock.ts`). **6.7:** giao diện panel KHÔNG có trong bản build (quét `dist/`), nhưng logic đọc ghi đè từ localStorage `fnb.mock.scenario` (`api/mock/scenario.ts:16-38`) còn trong bản build và `plan/real.ts` vẫn đọc `getScenario().tier/expired`: ai đặt khoá đó bằng DevTools thì giao diện của chính họ đổi cấp/chế độ chỉ đọc (BE vẫn chặn thật). Đề xuất sửa (GĐ7): đọc kịch bản chỉ khi `import.meta.env.DEV` | GĐ7 |
| `branchApi` mock chỉ trả chi nhánh của doanh nghiệp mock, nên auth real + branch mock lệch ID (chỉ ghép cùng chế độ) | ghi nhận |
| Landing: nội dung đã sang v9 (3.3); bảng giá VẪN đọc từ cấu hình mock chung (`api/publicPlans.ts`). BE `dfe8100` đã có `GET /public/service-plans` nhưng chỉ có 2 gói giá 0 (`DEMO_OPERATIONS`, `STARTER`), chưa có BASIC/STANDARD/ADVANCED giá thật nên chưa chuyển sang đọc BE | chờ BE seed 3 gói (mục 7 #32) |
| Form đăng ký (GU-01): đã bỏ ô số chi nhánh dự kiến, chưa có ô chọn gói | chờ BE (mục 7 #8, #9) |
| Quy ước cấp gói theo mã (`plan/tiers.ts`) còn dùng cho cấp và cờ AI; hai cờ nhận diện/so sánh đã đọc từ BE (`dfe8100`). BE chưa có `tier`, cờ AI, và chưa thi hành các cờ (BR-08) | chờ BE (mục 7 #30, #33) |
| Mobile (FE_mobile, backscreen) đã quét ngày 2026-10-02: màn khách chưa có ghép/socket; POS chưa in thật, QR mô phỏng; POS còn checkIn, remainingPortions. Ô MAC Bluetooth ở web chờ bên mobile trả lời. | chờ mobile |
| App POS mặc định trỏ localhost:3100: quầy phải tạo trên BE mà máy POS dùng. | ghi nhận |
| **Form mới ở GĐ6+ (5.8d ✅)** — (a) Form nằm trong hộp thoại hoặc ngăn kéo antd: **không cần làm gì**, `DirtyWatcher` (`components/DirtyWatcher.tsx`, gắn trong `RoleLayout`) tự đánh dấu "đang nhập dở" khi người dùng gõ/chọn và hết khi đóng. (b) Form nằm ngay trong trang: gọi `useDirtyGuard(coThayDoiChuaLuu)` (`lib/dirtyGuard.ts`) — đăng ký khi đúng, gỡ khi hết hoặc rời màn. (c) Lỗi 400: thêm nhãn ô vào `FIELD_LABELS` (`api/http/validationText.ts`); `fieldErrors(err.details)` trả lỗi theo ô để gắn vào form, còn không thì `describeApiError` đã gộp các ô sai thành một thông báo. Hiện **chưa có form nào gắn lỗi vào đúng ô** (các form dùng state riêng, không dùng antd `Form`), nên mọi form hiện thông báo gộp. (d) **Quy tắc thêm câu vào `BACKEND_TEXT`** (`api/http/errors.ts`): khi BE thêm/đổi một `throw new …Exception('…')` mà người dùng có thể gặp (400/401 đăng nhập/404/409): thêm một dòng `[regex, câu tiếng Việt]` đặt TRƯỚC các mẫu chung ("not found", "already exists", "invalid"…) và thêm `[status, câu, "module/file.ts:dòng"]` vào `api/http/backendMessages.fixture.ts` — test `backendMessages.test.ts` trượt nếu câu rơi về câu chung. Câu 403 và 401 không phải đăng nhập không cần dịch (web hiện câu cố định theo loại lỗi) | — |
| **Nút Thử lại (5.8c ✅)** — cách dùng cho màn mới ở GĐ6+: (1) màn nạp dữ liệu trong `useEffect` lúc mount qua module API — **không cần sửa gì thêm**. Đọc/ghi lấy từ **phương thức HTTP** của request (`ApiError.method`, gắn ở `api/http/client.ts`: GET = đọc; POST/PUT/PATCH/DELETE = ghi), không còn theo tên hàm; riêng mock (không qua HTTP) gắn tạm theo tên (`list/get/load/find/count` = đọc). Hiện không module nào đọc bằng POST (đã rà); nếu sau này có (tìm kiếm/báo cáo) thì cần `request(..., { method: "POST" })` kèm cờ "đọc" — chưa làm vì đặc tả/BE không có. (2) Lỗi ĐỌC mất mạng/5xx tự có thông báo kèm nút Thử lại; bấm → `requestRefresh()` tăng `refreshEpoch` (`store/slices/refresh.ts`) và `RefreshBoundary` (trong `router/RoleLayout.tsx`) dựng lại màn đang mở, nên nạp lại đúng một lượt, màn khác không chạy request. (3) Không có nút cho lỗi ghi, 403, 401, 404, 409, 4xx khác. (4) Màn có khối lỗi riêng kèm nút (Reports, BranchInfo) thêm đường dẫn vào `INLINE_ERROR_ROUTES` (`api/http/errors.ts`) để không bắn thông báo nổi trùng. (5) **Không được hưởng:** dữ liệu giữ trong store — danh sách chi nhánh (Owner Branches), món chi nhánh của Manager — nạp ở bước vào khu vực và dùng Thử lại của màn lỗi khu vực; màn mới có dữ liệu trong store phải tự nạp lại. Đổi lại màn đang mở mất state cục bộ (ô tìm kiếm, bộ lọc). Ở dev (StrictMode) mỗi lần mount gọi đôi nên số request mỗi lần bấm bằng số của một lần nạp bình thường | — |
| Mock đơn hôm nay (5.8b): trước 07:30 đơn hôm nay được dồn vào 90 phút vừa qua để "hôm nay" và "tháng này" (sáng mùng 1) không rỗng; từ 07:30 trở đi giữ như cũ. Nguyên nhân phase2 "AI số đơn" trượt lúc 00:56: `api/mock/data/orders.ts` đặt đơn trong khung 07:00–21:30 rồi bỏ đơn ở tương lai | — |
| Báo lỗi hết hạn gói: BE thật trả 403 KHÔNG mã (`branch-access.service.ts:81-83`, #31); web nhận diện thêm theo câu "subscription is read-only" (`isReadOnlyError`, `api/http/errors.ts`) và hiện cùng thông báo tiếng Việt như khi có mã `SUBSCRIPTION_READ_ONLY`. Khi BE thêm mã thì giữ nguyên, không đổi web | khi BE làm #31 |
| Real chưa có dữ liệu để kiểm tay: không tuỳ chọn nào bị Owner tắt hoặc chi nhánh tắt, nên dòng "Owner đã tắt" của tuỳ chọn và toast "N đơn chuyển Hết món" chỉ kiểm ở mock (phase5 mock) | khi có dữ liệu |
| Manager ở real **không bao giờ tự khoá** khi gói hết hạn: `GET /restaurant-chains` trả 403 cho Manager nên `usePlan()` của Manager lấy trạng thái/hạn dùng từ MOCK (`plan/real.ts:10-40`, `store/slices/auth.ts:198` chỉ truyền `chains` cho Owner; `useWriteGuard` → `usePlan()`, `plan/useReadOnly.ts:41-43`). BE vẫn chặn ghi (403 không mã, #31). Nhãn "Đã dùng X/Y" ở `/manager/staff` cũng là mock (`account/real.ts:65`) | chờ BE #38 |
| BE `0083289` (pull 2026-10-03) đã khảo sát bằng đọc mã (5.7c-0): bảng đối chiếu và danh sách `/manager/*` ở `docs/api-contract-plan.md` mục "Tình trạng theo BE `0083289`". BE local đã build lại 2026-10-03 và kiểm các GET `/manager/*` bằng request thật (5.7c) | — |
| `branchApi`: `maxTables`; `authApi`: `WAITER`, `KITCHEN` trong `BackendRole` | Giữ: phản ánh đúng JSON BE hiện tại |
| `README.md` còn mô tả Waiter/Kitchen và `VITE_DEMO_PASSWORD` | dọn khi tiện |
| Khu thu ngân trên web (`CashierApp.tsx`, `cashier-api.ts`) của Bảo đã gỡ khi merge main: POS chạy app Android. Code vẫn trong lịch sử (`dc8fcdd`, `32f6cdc`, `6e226af`) | — |
| `src/api/realtime/operations.ts` (Socket.IO `/operations`, sự kiện `operations.updated`, auth bằng JWT người dùng; dependency `socket.io-client` 4.8.3) chưa dùng ở đâu; để cho màn hình gọi số. Đặc tả dùng token thiết bị chỉ đọc nên gateway BE cần đổi | Giai đoạn 8 |
| `vitest` ghim 4.1.11 (5.0.3 mới phát hành 30/09 bị pnpm chặn theo tuổi bản phát hành); nâng lên 5.x khi đủ tuổi | khi tiện |
| File v7 ở gốc (`Smart-FnB-Dac-ta-v7 (1).md`, `PHAN_TICH_NGHIEP_VU.md`) | KHÔNG đụng (dính stash `pre-v9-wip`) |
| DB local thiếu tài khoản cashier/barista dù seed BE có | Người dùng tự xử lý |
| Hồ sơ đăng ký "Probe Quán" do agent tạo nhầm trên BE thật. **KHÔNG xoá, KHÔNG tạo thêm**; chờ Khánh quyết | Khánh |
| ~~Giả lập lỗi (403, mạng, 401…) bằng MockPanel chỉ chạm module mock; module real chưa có kiểm giao diện lỗi~~ **Đã xong ở 5.8a–5.8e**: `scripts/browser/phase58-faults.mjs` (CDP `Fetch.fulfillRequest`) kiểm 500/403/mất mạng/401 cho mọi màn real | — |
| ~~Lỗi hiện 2 lần (toast trùng, câu tiếng Anh thô) và Thử lại chưa nạp lại~~ **Đã xong ở 5.8b–5.8d** (ngoại lệ còn lại ở dòng ngay dưới) | — |
| ~~**Lỗi app (báo ở 5.8e):** tạo chi nhánh (`roles/owner/Branches.tsx:127-129`) gọi `message.error(describeBranchError(err))` nên 403, mất mạng, 401 hiện 2 thông báo.~~ **Đã sửa ở `e2fcdf1` (6.1):** màn gọi `showApiError(message.error, err)`; gợi ý nâng gói (`planUpgradeHint`, `api/modules/branch/index.ts`) chuyển vào thông báo hạn mức toàn cục (`ApiErrorBridge`) nên chỉ còn một thông báo. Quy tắc: không gọi `message.error` trực tiếp với lỗi API | xong |
| `DirtyWatcher` (`components/DirtyWatcher.tsx`) nhận form nhập dở dựa vào **class của antd** (`.ant-modal-container`, `.ant-drawer-section`, `.ant-select-item-option`…). **Nâng cấp antd (nhất là bản major) phải chạy lại `phase58-forms.mjs` và test `components/retry.test.tsx`**; cấu trúc đã đổi một lần giữa antd 5 và 6 (`-content` → `-section`/`-container`) | khi nâng antd |
| Mock tuỳ chọn lưu localStorage (`smartfnb:mock:options:v1:<chainId>`, 4.4); bỏ khi `options` có `real.ts` | khi BE có OW-03 |
| Định dạng `code` nhóm/tuỳ chọn đang giả định giống SKU (`^[A-Z0-9_-]{1,50}$`); chờ BE công bố (`docs/api-contract-plan.md` mục 7 #12) | chờ BE |

## 7. Backend: hiện trạng tóm tắt

Báo cáo đầy đủ đã gửi nhóm BE. Tóm tắt những gì ảnh hưởng web:

**Có thật, dùng được:** auth (`/auth/login`, refresh, `/auth/me`), PA-01..03, PA-05, `/admin/service-plans`, OW-01, OW-02, OW-04, OW-05, branding GET/PUT/DELETE, `/reports/*` (chỉ OWNER), bật/tắt món chi nhánh qua `PATCH /branches/:id/menu/items/:id`, `GET/POST /stations`, `POST /stations/pair-customer-display`, `DELETE /display-devices/{id}`.

**Cập nhật theo BE `0083289` (đọc mã, 2026-10-03; chi tiết `docs/api-contract-plan.md`):** (1) Owner đã có CRUD nhóm tuỳ chọn/tuỳ chọn, gắn nhóm vào món, bật/tắt tuỳ chọn (`/restaurant-chains/{id}/menu/option-groups…`, OW-03 real được, còn thiếu `isDefault`, `allowBatching`, `optionGroups` trong menu). (2) Module `/manager/*` (role MANAGER, chi nhánh lấy từ JWT): `staff` (tạo/sửa/khoá/đặt lại mật khẩu), `menu-options` (GET, PATCH availability, có đánh dấu "Hết món" dòng đã trả), `reports`, `orders` (+ chi tiết), `audit-logs`. (3) `staff` bắt buộc **mật khẩu** khi tạo và đặt lại, không email: lệch quyết định đã chốt. (4) Xác nhận thủ công non-cash chỉ Manager + lý do + số tiền thực nhận (BR-29 đã sửa). (5) Chưa có: huỷ đơn đã trả (BM-06), danh sách Cần xử lý, `PATCH /stations`, `GET /display-devices`, email, 3 gói seed, endpoint gói cho Manager.

**Chưa có → web phải mock (bảng dưới đối chiếu theo `dfe8100`, một số dòng đã đổi ở trên):**

| Mã | Chức năng |
|---|---|
| OW-03 | CRUD nhóm tuỳ chọn, tuỳ chọn, gắn vào món, bật/tắt cấp chuỗi — web đã làm bằng mock (4.3); `isDefault` và cờ không gom món chưa có cột ở BE |
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
| 4 | Owner menu: 4.2 danh mục + món real ✅ (`feat/v9-menu`); 4.3 nhóm tuỳ chọn (OW-03, mock) ✅; 4.4 chốt 4.3 ✅ (xác nhận tắt mặc định, mock lưu qua F5, thứ tự lưu form món). Chờ BE: api-contract-plan #12–17 | ✅ phần web xong trên `feat/v9-menu` |
| 5 | Manager (khảo sát 5.1 ✅, Khánh đã duyệt 10 đề xuất). Chia: **5.2** trang đặt mật khẩu + gỡ mật khẩu cứng ✅ (`feat/v9-manager`); **5.3** Owner `ManagerAccounts` real ✅; **5.5** quầy + máy in ✅ (làm trước vì app Android cần quầy để bán); **5.6** thiết bị (ghép màn hình khách và màn hình gọi số bằng mã 6 số, thu hồi) ✅; **5.4** Cashier/Barista của Manager (mock, chờ BE #24) ✅; **5.7** làm lại `BranchMenu` (món real, tuỳ chọn theo chi nhánh mock); **5.8** chốt. **Thứ tự mới: 5.5 → 5.6 → 5.4 → 5.7 → 5.8** | 5.2 ✅ · 5.3 ✅ · 5.3b ✅ (khớp BE `dfe8100`) · 5.5 ✅ · 5.6 ✅ · 5.4 ✅ · 5.7b ✅ · 5.7c ✅ · 5.7d ✅ · 5.8a ✅ · 5.8b ✅ · 5.8c ✅ · 5.8d ✅ · 5.8e ✅ (chốt) — **GĐ5 ✅ xong phần web trên `feat/v9-manager`**; kết quả chốt và tóm tắt ở mục 9 |
| 6 | Owner: OW-03 tuỳ chọn real, liên kết PayOS, nhận diện (`brandingApi` real, preset, tương phản, preview), gói của tôi (OW-10). Nhánh `feat/v9-owner`, bắt đầu từ `f701bb8`. Chia 6.1, 6.2a, 6.2b, 6.3–6.7 và quyết định ở mục 8b | 6.1 ✅ (`e2fcdf1`, `2fe85c7`, `37f220f`) · 6.2a ✅ (`8b627f6`, `0793a42`, `ac940a1`, `c38e964`) · 6.2b ✅ (`a1dbba7`, `aa55732`, `dd48fb9`, `f3c5b6f`, `9e61140`) · 6.3 ✅ (`07ecedc`, `1c250b1`, `664bd03`, `b3df17e`, `9474fa7`) · 6.3b ✅ (đọc BE `91867ae`, không commit) · 6.3c ✅ (`231f5a9`) · 6.3d ✅ (`d8d4275`, `a1f02ac`, `b63d940`, `d63ad12`) · 6.4 ✅ (`987bf2d`, `00810cf`, `f930f45`, commit docs) · 6.5 ✅ (`29fb9d9`, `3a9860c`, `a366f78`, `00e8ef8`, `3afb12c` docs) · 6.6 ✅ (`61d610d`, `146eb39`, `22ed9cf`, `d99c6e9` docs) · 6.7 ✅ (`0326164`, commit docs chốt) — **GĐ6 xong, kết quả ở mục 10** |
| 6.7 | Chốt GĐ6 (xem mục 10) | ✅ |
| 7 | Manager xử lý đơn hàng: tra cứu đơn (BM-04), đơn Cần xử lý (BM-05), xác nhận thanh toán thủ công, huỷ đơn đã trả (BM-06), báo cáo chi nhánh; đối chiếu đặc tả BM-xx và lịch tuần 7. AI không thuộc GĐ7 (QĐ 43) | lượt tiếp theo: 7.0 khảo sát, chỉ đọc |
| 8 | Màn hình gọi số (trang web trên tablet/TV ở khu nhận món, không đăng nhập, ghép chi nhánh bằng mã 6 số do Manager nhập). Nhóm có thể đổi sang nhân viên bưng món theo phiếu số: chốt với nhóm TRƯỚC khi bắt đầu | |
| 9 | Báo cáo đa chi nhánh, trợ lý AI (OW-09, real), chế độ chỉ đọc khi gói hết hạn khớp BE | |

## 8b. Giai đoạn 6 (Owner) — kế hoạch và quyết định

Nhánh `feat/v9-owner` bắt đầu từ `f701bb8`. BE local vẫn `0083289` (khảo sát 6.0: không có commit mới, không migration mới). Origin/main của web chỉ là các lần merge PR #3–#5, cây giống `637772e`, `git merge-tree` với nhánh này sạch: không cần merge main.

| Lượt | Nội dung | Real / mock, cờ | phase6 kiểm | Nhờ BE |
|---|---|---|---|---|
| 6.1 ✅ | Sửa trùng thông báo ở `Branches.tsx`; nhãn "(số liệu mẫu)" ở `StaffTable.tsx`; khối `phase5 --only=staff`; ghi tài liệu quyết định (`e2fcdf1`, `2fe85c7`, `37f220f`) | không đổi cờ | `phase58-faults --only=owner/branches`; `phase5 --only=staff` | không |
| 6.2a ✅ | Tầng dữ liệu OW-03: log request ghi bị chặn (`8b627f6`); `syncSelectionRule` + bộ kiểm hai chiều (`0793a42`); `optionsApi` theo từng thao tác + `options/real.ts` **chưa bật** (`ac940a1`); chưa đổi màn hình | `options` vẫn mock | vitest; `phase4 --only=owner` mock; `phase5 --only=menu` mock | không |
| 6.2b ✅ | `OptionGroups.tsx` lưu từng thao tác (form nhóm riêng, mỗi dòng tuỳ chọn lưu ngay, nối `syncSelectionRule`, quyết định 12–16) `a1dbba7`; `MenuTable.tsx` gắn nhóm bằng `setItemGroups` (+ `setItemNoBatch` chỉ mock) `aa55732`; xoá hàm cũ của `optionsApi` `dd48fb9`; `phase4` chặn ghi ở CDP khi real `f3c5b6f` | `options` mock | `phase4 --only=owner` mock 99/99, real 18/18; `phase5 --only=menu` mock 24/24 | không |
| 6.3 ✅ | Bật `options=real` (`1c250b1`): màn tuỳ chọn và gắn nhóm cho món chạy BE thật; `menuItemCount` từ `_count.menuItems` thay cho đọc cấu hình từng món và `planReorder` đánh số lại khi `displayOrder` trùng (`07ecedc`); `phase4` real so từng lệnh ghi với DTO BE, chặn ghi ở CDP, GET lại không đổi (`664bd03`); giả lập lỗi `owner/options` và `owner/menu (gắn nhóm)` (`b3df17e`). Ô `isDefault`/`allowBatching` khoá "chờ BE #15/#17", panel trạng thái chi nhánh ẩn (đặc tả không đòi, không thêm #41) | `options=real` | `phase4 --only=owner` mock 99/99, real 29/29; `phase5 --only=menu` mock 24/24, real 18/18; `phase58-faults` 3 khối × 8/8 | #16 (cũ): web đang N+1, tối đa 4 song song |
| 6.3c ✅ | Build BE local lên `91867ae` (sao lưu `…184610.sql`, migration 21/21, seed ổn, healthy) và kiểm real lại: `phase2` **35/40** (xem chập chờn: 4 ca do script, 1 ca chưa rõ), `phase4` đủ **31/31**, `phase5` đủ **76/76**, `phase58-faults` `owner/options`, `owner/menu (gắn nhóm)`, `owner/branches` **8/8 × 3**. Không có chỗ web real vỡ vì BE mới | không đổi | như trái | #17 → đã làm, #15 → một phần, #22 → xấu hơn, #42 (mới) |
| 6.3d ✅ | **Đã làm** (`a1f02ac` allowBatching real, một nguồn `MenuItem.allowBatching`, bỏ `noBatch` và `setItemNoBatch` khỏi `optionsApi`; `d8d4275` sửa đếm refresh; `b63d940` phase2 errors tiêm lỗi ở CDP). Kế hoạch ban đầu: mở khoá `allowBatching` ở real: `noBatch = !allowBatching` từ `GET menu/items`, ghi `PATCH items/:id {allowBatching}`, `setItemNoBatch` real, `capabilities.allowBatching = true` ở real; `phase4` real: ca khoá ô "chờ BE #17" → ca ghi chặn ở CDP so DTO. `isDefault` giữ khoá (#15 một phần) | `options=real` | `phase4` mock + real; `phase5 --only=menu` | không |
| 6.4 ✅ | **Đã làm**: tầng dữ liệu real + tải logo multipart (`987bf2d`); màn Nhận diện khoá theo gói, xem trước bằng object URL, Khôi phục có xác nhận, `useDirtyGuard`, mock lưu qua F5, bật `branding=real` (`00810cf`); `phase6.mjs` khối `branding` + giả lập lỗi `owner/branding` (`f930f45`). Kế hoạch ban đầu: Nhận diện real: GET/PUT/DELETE + tải logo multipart; `useDirtyGuard` | `branding=real` | `phase2 --only=brand` mock; real chỉ đọc, chặn `PUT`, `POST logo`, `DELETE` | #39 (mới); #33 (cũ). Dài hơn mức thường vì đổi cách tải logo từ data URL sang multipart |
| 6.5 ✅ | **Đã làm**: nhận ra đổi riêng tên (`lookCustom`) + nạp lại nhận diện khi điều hướng (`29fb9d9`, quyết định 28–29); `phase58-faults` in tên ca trượt + `chrome.mjs` tự mở lại khi Chrome sập lúc khởi động (`3a9860c`); PayOS real: module `payos` (`getChannel`/`saveKeys`/`unlink`), màn `PayosLink.tsx`, bật `payos=real` (`a366f78`, quyết định 30–34); `phase6` khối `payos` + giả lập lỗi `owner/payos` kèm ca 503 (`00e8ef8`). Kế hoạch ban đầu: PayOS: nhập ba khoá (che sau khi lưu), gỡ liên kết, hộp xác nhận | `payos=real` | mock: máy trạng thái; real: PUT/DELETE chặn ở CDP, so DTO | #40 (mới) |
| 6.6 ✅ | **Đã làm**: `phase58-faults` ca ghi "Gỡ liên kết" PayOS (`61d610d`, kiểm lỗi ghi sau khi đổi `reportApiError`); màn `MyPlan.tsx`, `plan/real.ts` không lấy trạng thái/hạn dùng từ mock (`146eb39`, quyết định 35–39); `phase6` khối `plan` + `owner/plan` + `tab.readOverride` (`22ed9cf`). Kế hoạch ban đầu: "Gói của tôi" (OW-10) | `plan` đã real (không đổi cờ) | `phase2` plan; phase6 | #38 (cũ, cập nhật: Owner cũng cần) |
| 6.7 | Chốt GĐ6: phase2–6 đủ mock + real, bộ giả lập lỗi, README, BAN-GIAO, `docs/PR-v9-owner.md` (bị ignore). Dài hơn mức thường, như 5.8e. Thêm ca trình duyệt gợi ý gói chi nhánh: mock có body (`planUpgradeHint`) → thông báo hạn mức có câu "Gói X cho phép N chi nhánh"; giả lập 409 không body đúng dạng BE → câu chung, không vỡ | cả hai | đủ phase2–6 | không |

**Luật chạy kiểm trình duyệt (từ 6.2a):** (1) CHỈ cổng 5173, không dựng Vite ở cổng khác (BE chỉ cho CORS 5173; cổng khác làm real trượt giả). Chạy mock thì khởi động lại Vite ở 5173 với cờ `VITE_API_*=mock` (không sửa `.env*`), xong khôi phục Vite mặc định (real) ở 5173. (2) `--mode=real` luôn in cuối "BẢNG REQUEST GHI BỊ CHẶN Ở CDP" (số request, từng dòng `METHOD đường dẫn` với id → `{id}`, tên ca) — `cdp.mjs` `printBlockedWritesSummary`, nhật ký tích luỹ `tab.writeLog` không bị script xoá.

**Quyết định GĐ6 (Khánh đã duyệt):**

| # | Quyết định |
|---|---|
| 1 | `isDefault`/`allowBatching`: ở real khoá ô, ghi "chờ BE #15/#17"; KHÔNG lưu localStorage ở real; mock giữ nguyên |
| 2 | Luật `isRequired` ⇔ `min > 0`: web tự đồng bộ (tick bắt buộc → `min ≥ 1`; `min = 0` → bỏ tick), không báo lỗi |
| 3 | `optionsApi` đổi sang từng thao tác giống BE (tạo/sửa/xoá nhóm, thêm/sửa/xoá tuỳ chọn, gắn nhóm vào món); mock theo cùng giao diện; KHÔNG so khác biệt rồi gửi cả nhóm; lỗi giữa chừng → nạp lại từ server |
| 4 | Logo PNG/JPG ≤ 1 MB, tên hiển thị ≤ 50 theo đặc tả; BE lệch ghi vào #39 |
| 5 | Không làm "bỏ logo giữ màu"; chỉ có "Khôi phục mặc định" (DELETE) |
| 6 | PayOS hiện 2 trạng thái thật (Chưa liên kết / Đã liên kết); "Đang kiểm tra" chỉ là trạng thái tạm lúc lưu; "Lỗi" chờ #40. Không đặt `PAYOS_MASTER_KEY` ở GĐ6 |
| 7 | "Gói của tôi": ngày hết hạn và trạng thái hiện nhãn "chờ BE #38" |
| 8 | Panel trạng thái tuỳ chọn theo chi nhánh ở màn Owner: ẩn khi real; 6.3 phải trích dòng đặc tả trước khi mở #41 |
| 9 | Đọc cấu hình tuỳ chọn từng món (N+1): chấp nhận, tối đa 4 request song song |
| 10 | Logo chỉ tải lên khi bấm Lưu, không tải lúc chọn file |
| 11 | Tắt tuỳ chọn đang mặc định: giữ hộp xác nhận ở mock; real chưa áp dụng vì chưa có `isDefault` |
| 12 | Nhóm chưa có tuỳ chọn vẫn hiện, kèm nhãn cảnh báo "Chưa có tuỳ chọn"; không cho gắn nhóm rỗng vào món (ô chọn nhóm ở `MenuTable` khoá nhóm rỗng, ghi lý do). Tạo nhóm xong tự mở ô thêm tuỳ chọn đầu tiên |
| 13 | Xoá tuỳ chọn cuối cùng của một nhóm đang gắn món: hộp xác nhận ghi "N món đang dùng nhóm này" (N lấy từ cấu hình món `listItemConfigs`, cùng nguồn với cột "Số món") |
| 14 | Số tuỳ chọn đang bật < `min` của nhóm: nhãn cảnh báo đỏ "Không đủ tuỳ chọn để chọn tối thiểu N", không chặn lưu |
| 15 | Sắp xếp nhóm và tuỳ chọn bằng nút lên/xuống; mỗi lần đổi 2 dòng = 2 lệnh `patch displayOrder`; lỗi giữa chừng → nạp lại từ nguồn, báo lỗi qua `showApiError`. Hai dòng trùng `displayOrder` thì đánh số lại theo vị trí (các dòng khác trùng thì thứ tự có thể chưa đúng — chưa gặp vì web luôn tạo `max + 1`) |
| 16 | Xoá tuỳ chọn có hộp xác nhận (`Xoá tuỳ chọn "…"`), Huỷ thì giữ nguyên |
| 17 | `displayOrder` trùng nhau trong một danh sách: lần đổi chỗ đầu tiên đánh số lại cả danh sách 0..n-1, gửi tuần tự chỉ các dòng có giá trị thay đổi; lỗi giữa chừng → nạp lại, báo qua `showApiError`. Không trùng thì giữ cách đổi 2 dòng (`api/modules/options/ordering.ts`: `planReorder`, `applyReorder`; thay luật "đánh số lại bằng vị trí" của quyết định 15) |
| 18 | Real dùng `_count.menuItems` (mapper giữ thành `menuItemCount`) cho hộp xác nhận xoá tuỳ chọn cuối (quyết định 13), hộp xoá nhóm và cột "Số món"; không gọi `listItemConfigs` chỉ để đếm. Mock dùng nguồn tương đương (đếm cấu hình món, không lưu vào bản chụp localStorage). Hệ quả: hộp xoá nhóm nêu SỐ món, không còn nêu TÊN món |
| 19 | Màn tuỳ chọn Owner vào bộ giả lập lỗi ngay ở 6.3 (`owner/options`, `owner/menu (gắn nhóm)`) |
| 20 | Khối `errors` của `phase2` không mượn màn mock nữa: tiêm lỗi (403, 409 `PLAN_LIMIT_REACHED` có body như BE, mất mạng, 401 + refresh thất bại) ở tầng CDP/Fetch trên `GET …/menu/categories` (màn "Danh mục món", đọc mỗi lần vào màn, ổn định, không phụ thuộc module nào đang mock); `cdp.mjs` có thêm lỗi giả 409 (`fault.body`) |
| 21 | Lượt nào đổi cờ module (mock ↔ real) hoặc nguồn dữ liệu của một màn phải chạy lại mọi phase/khối có dùng màn hoặc route của module đó (tìm bằng `grep` trong `scripts/browser`, liệt kê trong báo cáo). Ví dụ menu món: `phase2` (brand, plan, flip), `phase4` (owner, manager), `phase5 --only=menu`, `phase58-forms`, `phase58-faults` (`owner/menu`, `owner/menu/categories`, `owner/menu (gắn nhóm)`, `owner/options`) |
| 22 | Màn menu đọc "không gom" từ MỘT nguồn: `MenuItem.allowBatching` (mock lẫn real); mock menu cấp `allowBatching` (mặc định `true`), không còn nhánh UI riêng cho mock/real. Ghi qua lệnh lưu món (`PATCH items/:id {allowBatching}`, `UpdateMenuItemDto` menu.dto.ts:178-185; tạo món gửi tường minh, `CreateMenuItemDto` :112-119); không còn `setItemNoBatch`/`capabilities.allowBatching` (gọn hơn: một request cùng lệnh lưu món, không cần API tuỳ chọn riêng) |
| 23 | "refresh gọi 2 lần": điều tra trước khi sửa. Kết luận (a) do SCRIPT, không do mã ứng dụng hay BE: CDP ghi lại cả yêu cầu kiểm tra trước CORS `OPTIONS /auth/refresh` của chính lần refresh đó khi Chrome chưa có bộ nhớ đệm preflight (Chrome vừa dựng mới); một lần refresh = `POST` + `OPTIONS`. `phase2.mjs` nay chỉ đếm `POST` |
| 24 | Gói không có `brandingEnabled` (Cơ bản): màn Nhận diện vẫn hiện nhưng khoá toàn bộ ô và nút lưu/khôi phục/chọn logo, ghi "Cần gói Tiêu chuẩn trở lên" (cờ đọc thật từ `GET /restaurant-chains`); không gọi PUT/POST/DELETE. BE chưa chặn (#33). `FeatureGate` không còn bọc màn này (thẻ khoá cả màn thay bằng ghi chú `branding-plan-lock`) |
| 25 | Lưu logo: chọn tệp chỉ xem trước tại chỗ (object URL, thu hồi khi đổi/huỷ/rời màn), tệp chỉ tải lên khi bấm Lưu (quyết định 10). Thứ tự lệnh: tải logo (`POST …/logo`) TRƯỚC, rồi `PUT` tên/màu — vì tải logo hay lỗi nhất (dung lượng, định dạng) nên lỗi không để lại tên/màu đổi nửa chừng. Ít lệnh nhất: chỉ logo = 1 lệnh, chỉ tên/màu = 1 lệnh, cả hai = 2 lệnh, không đổi gì = 0 lệnh. Lỗi giữa chừng → nạp lại từ BE (`reloadBranding`), báo qua `showApiError` |
| 26 | Áp giao diện: Owner thấy ngay sau khi lưu (store cập nhật); tài khoản khác nạp nhận diện ở lần ĐĂNG NHẬP hoặc F5 kế tiếp (`loadScope`) và tab cùng trình duyệt nhận qua `BroadcastChannel`. ~~Chưa có nạp lại khi chỉ điều hướng~~ → đã làm ở 6.5 (quyết định 29). Giao diện Platform Admin, trang đăng nhập và `/setup-password` luôn là nhận diện nền tảng (BR-44, `App.tsx` `platformOnly`), đã kiểm mock và real |
| 27 | GĐ6 có script riêng `scripts/browser/phase6.mjs` (`--mode`, `--only`), khối `branding` trước, PayOS và Gói của tôi thêm ở 6.5, 6.6; in bảng request ghi bị chặn như các phase khác. `cdp.mjs`: `blockedWrites` ghi thêm `contentType`; `fulfillWrites` nhận `fulfillBody` (chỉ ca 2 lệnh liên tiếp "logo + màu") |
| 28 | `isCustom` của web = màu khác mặc định của BE HOẶC có logo HOẶC tên hiển thị (đã `trim`) khác tên chuỗi. Chỉ đổi tên (`lookCustom = false`): áp tên hiển thị, màu vẫn của nền tảng (`resolveBrand`); `applyChainName` ghép tên chuỗi khi nạp phạm vi/nhận tin từ tab khác |
| 29 | Tài khoản không phải Admin nạp lại `GET branding` khi điều hướng, tối đa một lần mỗi 60 giây; lỗi thì im lặng (`silent`, giữ bản cũ, không thông báo). Admin, `/login`, `/setup-password` không nạp (BR-44). Thay cho giới hạn ghi ở quyết định 26 |
| 30 | PayOS: 3 ô khoá kiểu mật khẩu có nút hiện/ẩn, `autoComplete="off"`; xoá sạch sau khi lưu thành công; khoá KHÔNG vào localStorage/sessionStorage, không `console.log`, không nằm trong thông báo lỗi; còn dở thì `useDirtyGuard` hỏi trước khi rời/Thử lại |
| 31 | Cập nhật khoá PayOS phải nhập lại đủ cả 3 (BE nhận đủ 3 trường mỗi lần PUT, và không trả khoá nên không có giá trị cũ để điền). Thiếu ô: báo từng ô, KHÔNG gửi request |
| 32 | Hộp xác nhận gỡ liên kết PayOS ghi: "QR thanh toán ở mọi chi nhánh sẽ ngừng hoạt động cho tới khi liên kết lại." |
| 33 | Trạng thái PayOS thật: Chưa liên kết / Đã liên kết (kèm ngày liên kết `createdAt` và cập nhật `updatedAt`); "Đang kiểm tra" chỉ chớp trong lúc PUT; "Lỗi" chờ #40. Mock có đủ 4 trạng thái (panel "PayOS: giả lập trạng thái Lỗi") |
| 34 | BE 503 "PAYOS_MASTER_KEY is not configured" → "Máy chủ chưa sẵn sàng lưu khoá PayOS. Vui lòng liên hệ quản trị hệ thống." (`errors.ts` `SERVER_TEXT`; 503 "Stored PayOS credentials are invalid" → câu nhập lại đủ 3 khoá). Các 5xx khác vẫn là câu chung. Kèm: khối lỗi trong trang (`INLINE_ERROR_ROUTES`) chỉ thay cho lỗi ĐỌC; lỗi ghi vẫn báo toàn cục |
| 35 | "Gói của tôi" (OW-10, `:309`) hiện dữ liệu thật: tên gói (`plan.name`), hạn mức "Đã dùng X / Y" cho chi nhánh và tài khoản (BE `getQuotaSnapshot` `plan-quota.service.ts:87-95`; giới hạn `maxBranches`/`maxAccounts` `:29-33`; đã dùng: chi nhánh chưa xoá, tài khoản = nhân viên + Owner `:67-84`; `quotas` còn có `tables`, web không hiện), tính năng có/chưa có theo cờ BE `brandingEnabled`, `multiBranchComparisonEnabled` (`:23-24`). Cờ AI BE chưa trả (#30) → real ghi "Chưa có dữ liệu từ máy chủ (chờ BE #30)". Tên tính năng theo bảng gói đặc tả 13.1 (`:1214-1226`): "Nhận diện thương hiệu", "So sánh đa chi nhánh", "Trợ lý AI". Chạm hoặc vượt hạn mức có nhãn "Đã hết hạn mức"/"Vượt hạn mức" |
| 36 | Ngày hết hạn và trạng thái gói: real ghi "Chưa có dữ liệu từ máy chủ (chờ BE #38)", KHÔNG dùng giá trị mock (`plan/real.ts`: `status = null`, `expiresAt = null`; `null` không bị coi là hết hạn, `usePlan` không khoá giao diện). Ngoại lệ có chủ đích: ô "Hết hạn" của panel dev vẫn đặt `status = expired` ở real để thử chế độ chỉ đọc (như ghi đè cấp gói). Mock giữ như cũ |
| 37 | Không có nút gia hạn/đổi gói (BR-10); chỉ dòng "Liên hệ quản trị nền tảng để đổi gói hoặc gia hạn." |
| 38 | BE không trả gói đang hoạt động (`subscription = null`, `branches.service.ts:203`: `getActivePlan` ném 403 khi hết hạn/tạm ngưng/chưa có rồi `.catch(() => null)`): hiện khối "Không có gói đang hoạt động" kèm câu ở quyết định 37; không phải lỗi, không toast, không Thử lại. Lỗi đọc thật (500, 403, mạng) do màn lỗi nạp khu vực (cùng `GET /restaurant-chains`) có nút Thử lại |
| 39 | Không làm bảng so sánh các gói |
| 40 | Chuỗi kiểm tra không nối ống (quy tắc làm việc 14). Lý do: ở 6.5 chuỗi có `| grep "Tests "` làm mất mã thoát, một commit vào khi 3 test trượt (đã sửa trước khi push) |
| 41 | Lượt chốt không sửa mã ứng dụng. Ca trượt do mã ứng dụng (tái hiện ổn định) → dừng sửa, ghi báo cáo và tồn đọng (file:dòng, bước tái hiện). Ca trượt do script/chập chờn → sửa script trong commit riêng "test(browser): …", chạy lại 3 lần đạt cả 3 |
| 42 | Panel dev (giả lập hết hạn, đổi gói, đổi doanh nghiệp mock, xoá dữ liệu mock…) không có mặt trong bản build production. Kiểm ở 6.7: giao diện panel KHÔNG lọt (xem mục 10); logic đọc ghi đè kịch bản từ localStorage còn lọt → tồn đọng |
| 43 | Lộ trình sau GĐ6: **GĐ7** Manager xử lý đơn (tra cứu đơn, đơn Cần xử lý, xác nhận thanh toán thủ công, huỷ đơn đã trả, báo cáo chi nhánh; đối chiếu đặc tả BM-xx và lịch tuần 7). **GĐ8** màn hình gọi số (trang web mở trên tablet/TV ở khu nhận món, không đăng nhập, ghép với chi nhánh bằng mã 6 số do Manager nhập; nhóm có thể đổi sang phương án nhân viên bưng món theo phiếu số — PHẢI chốt với nhóm trước khi bắt đầu GĐ8). **GĐ9** báo cáo đa chi nhánh, trợ lý AI (OW-09), chế độ chỉ đọc khi gói hết hạn. AI KHÔNG thuộc GĐ7 |

**Kiểm 6.6 (BE `91867ae`, gói thật "Demo Operations": 2/5 chi nhánh, 7/20 tài khoản, nhận diện + so sánh bật):**
- Lượt này xác nhận `3afb12c` (docs 6.5) **không chạy chuỗi kiểm tra** (chỉ `git add && git commit`); chạy lại chuỗi trên HEAD đó: tsc, lint, build ổn, vitest **353/353**. Ca trượt ở 6.5 đã sửa trước.
- Bảng `INLINE_ERROR_ROUTES` ở 6.6: `/owner/reports` và `/manager/branch-info` không có thao tác ghi (`grep` `Api.*` ghi trong `Reports.tsx`, `useReportData.ts`, `BranchInfo.tsx`: không có); `/owner/payos` có 2 thao tác ghi (`PayosLink.tsx:81` `saveKeys`, `:98` `unlink`): `saveKeys` đã có ca (500, 403, mạng, 401, 503), thêm ca `unlink` (`owner/payos (gỡ liên kết)`, bước chuẩn bị dùng trả lời giả cho PUT để nút Gỡ xuất hiện).
- mock: `phase6` đủ **47/47** (branding 24, payos 15, plan 8), `phase2` plan **16/16** (cần `AUTH_MODE=mock`). real: `phase6` đủ **37/37** (branding 16, payos 10, plan 11), `phase2` đủ **32/32** (2 SKIP mock-only), `phase58-forms` **16/16**, `phase58-faults --only=owner` **82/82** (gồm mọi màn Owner dùng `/owner/plan` làm trang xuất phát, `owner/plan`, `scope`, `expired`). Vitest sau commit: 353 → 360.
- Dữ liệu BE không đổi; bảng chặn ghi: chỉ các request giả (branding, payos, menu, options, accounts…), không request nào tới BE.

**Chập chờn 6.6:** (a) `retry.test.tsx` trượt 1 lần "Test timed out in 5000ms" khi máy đang nặng (chuỗi chạy quá 400 giây); chạy riêng 15/15 và chuỗi commit sau đó 360/360 — nhiễu tải, không phải lỗi mã. (b) Tôi chờ tiến trình nền bằng tệp đánh dấu `/tmp/real_done.txt` còn sót từ ngày 2/10 nên báo "xong" sớm; đã xoá và chờ lại (không ảnh hưởng kết quả).

**Đối chiếu BE nhận diện (6.4, `91867ae`; nhánh `branding/*` không đổi từ `0083289`):**

| Mục | Kết quả (BE) |
|---|---|
| a) `POST …/branding/logo` | Lưu tệp rồi **tự gán `logoUrl`** vào `business_branding` (upsert) và `restaurant_chains.logo_url` trong cùng giao dịch, xoá logo cũ (`branding.service.ts:105-140`); trả bản ghi nhận diện (`:139`), `logoUrl` là đường dẫn tương đối `/uploads/branding/…` (`:114`). Không cần PUT sau |
| b) `PUT` | Nhận `displayName` (≤ 150), `logoUrl` (`@IsUrl`), `primaryColor`, `secondaryColor`, `accentColor` (`@IsHexColor`), tất cả tuỳ chọn (`dto/branding.dto.ts:4-31`); `update: dto` (`branding.service.ts:92`) nên trường thiếu GIỮ nguyên (logo cũ không mất khi không gửi `logoUrl`); `logoUrl` tương đối → 400 (`@IsUrl`, `:13`) — web không bao giờ gửi `logoUrl` |
| c) `DELETE` | Đặt lại tên = tên chuỗi, ba màu mặc định, `logoUrl = null` cho cả bản ghi và chuỗi, và XOÁ tệp logo (`branding.service.ts:142-156`) |
| d) `GET` | Role đọc: OWNER, MANAGER, WAITER, KITCHEN, CASHIER (`branding.controller.ts:51`; thiếu BARISTA, thừa WAITER/KITCHEN — #39); Admin bị từ chối (`branding.service.ts:184`); đã kiểm Owner 200 và Manager 200. Response là bản ghi `business_branding` (có `id`, `secondaryColor`, `createdAt`, `updatedAt`), chưa có hàng thì trả mặc định + `logoUrl` của chuỗi (`:67-74`); không có `isCustom`/`version` |
| e) 2 máy cùng đăng nhập | Cho phép: `login` luôn tạo MỘT phiên mới (`auth.service.ts:327-347` `createSession`), không thu hồi phiên cũ; refresh token băm theo TỪNG phiên (`auth_sessions.refresh_token_hash`) và xoay vòng theo phiên (`:206-232`), dùng lại token cũ thì thu hồi riêng phiên đó (`:207-208`). Thu hồi toàn bộ phiên chỉ khi đặt mật khẩu (`:159-162`). Không có nhận diện trong phản hồi đăng nhập → web phải `GET branding` sau khi đăng nhập |
| f) Thứ tự lệnh khi Lưu | Xem quyết định 25 |
| Điểm mới | Seed chạy lại mỗi lần container khởi động đặt lại **tên hiển thị** nhận diện của chuỗi demo (`seed.ts:247-255`; màu/logo không bị đụng) → thêm vào #42 |

**Đối chiếu PayOS (6.5, BE `91867ae`; nhánh `payos/*` không đổi từ `0083289`) với đặc tả v9:**

| Mục | Đặc tả | BE |
|---|---|---|
| a) Endpoint | 6.7 (`Smart-FnB-Dac-ta-v9.md:564-576`): Owner dán Client ID, API Key, Checksum Key | `GET`/`PUT`/`DELETE restaurant-chains/:chainId/payos-channel`, chỉ OWNER (`payos-channel.controller.ts:15-16, 20, 30, 41`); `PUT` body đúng 3 trường `@IsString @MinLength(1)` (`dto/payos-channel.dto.ts:5-17`), BE tự `trim` (`payos-channel.service.ts:28-30`); `forbidNonWhitelisted` |
| b) Khoá che dạng ••••3f9a | `:574` "khoá chỉ hiện dạng che (ví dụ ••••3f9a)" | **Lệch:** response không có chữ số cuối nào, chỉ `{configured, id, createdAt, updatedAt}` (`payos-channel.service.ts:22, 38`). Web KHÔNG hiện dạng che (không có dữ liệu để che) → #40 |
| c) Kiểm khoá / webhook | `:570` BE gọi PayOS xác nhận webhook riêng, sai thì không lưu | **Lệch:** chỉ mã hoá và lưu (`:25-39`), không gọi PayOS; webhook là route chung `POST /webhooks/payos` (`payos-webhook.controller.ts:14`) → #40 |
| d) Trạng thái | 5.6 (`:462-466`): Chưa liên kết → Đang kiểm tra → Đã liên kết / Lỗi | BE chỉ phân biệt `configured` true/false; không có Đang kiểm tra/Lỗi → web chỉ hiện 2 trạng thái thật (quyết định 33, #40) |
| e) 503 | — | `PUT` cần `PAYOS_MASTER_KEY`, thiếu thì 503 (`payos-cipher.service.ts:35`); khoá lưu hỏng 503 (`:21`). BE local không đặt biến này (quyết định 6) nên PUT thật sẽ 503 — vì vậy lượt 6.5 KHÔNG gọi PUT/DELETE thật, chỉ chặn ở CDP |

**Kiểm 6.5 (BE `91867ae`, chưa khoá PayOS nào ở BE: `{"configured":false}` trước và sau):** mock — `phase6` đủ **39/39** (`branding` 24, `payos` 15); real — `phase6` đủ **26/26** (`branding` 16, `payos` 10; bảng chặn: 2× `PUT …/payos-channel`, 1× `DELETE …/payos-channel`, không request ghi nào tới BE), `phase2` đủ 32/32, `phase58-faults` `owner/payos` **9/9** (500, 403, mạng, 401 đọc; 500, 403, mạng, 401, 503 ghi — 503 phải ra đúng câu quyết định 34), `owner/branding` 8/8, `scope` 12/12, `owner/reports` 4/4, `manager/branch-info` 4/4 (hai màn này dùng `INLINE_ERROR_ROUTES`, đổi ở 6.5). Khối in "CÁC CA TRƯỢT" đã thử bằng một ca cố tình sai (file tạm, đã xoá): in `✗ owner/payos | ghi | 503 | WRONG_TEXT | …`. Không có phase/khối nào khác dùng màn hay route PayOS (`grep` `scripts/browser`: chỉ `phase6`, `phase58-faults`; `phase3` chỉ nhắc chữ "PayOS" ở trang giới thiệu).

**Chrome kiểm thử không ổn định trên máy này (2026-10-06):** Chrome headless đôi khi sập ngay lúc khởi động ("Network service crashed", thoát mã -1, cả Edge); các lần chạy phase6 mock bị treo vì vậy. `chrome.mjs` nay tự mở lại (tối đa `CHROME_ATTEMPTS`, mặc định 12, nếu Chrome sống dưới 6 giây); ổn định nhất khi chạy với `CHROME_ARGS="--no-sandbox --disable-gpu-sandbox --disable-software-rasterizer"` (chỉ cho Chrome kiểm thử mở trang dev cục bộ; `CHROME_HEADLESS=new|old` đổi kiểu headless). Thư mục profile tạm `fnb-*` ở `%TEMP%` tích tụ, dọn khi cần; không đụng Chrome của người dùng.

**Khảo sát dữ liệu thật 6.3 (chỉ GET, BE `0083289` local):** 2 nhóm (SIZE, SUGAR), 4 tuỳ chọn (mỗi nhóm 2), `displayOrder` nhóm 0,1 và tuỳ chọn 0,1 (0-based, không trùng), không có nhóm rỗng, không nhóm nào có số tuỳ chọn đang bật < `min`, `_count.menuItems` = 1 cho cả hai, `priceDelta` là chuỗi ("0", "10000"). `GET items/:id/option-groups` trả mảng nhóm đầy đủ (`id, chainId, code, name, isRequired, minSelections, maxSelections, displayOrder, isActive, createdAt, updatedAt, options`; `displayOrder` là của liên kết món–nhóm), 3 món: 1 món có 2 nhóm.

**Panel trạng thái tuỳ chọn theo chi nhánh ở màn Owner (quyết định 8):** đặc tả không đòi. OW-03 (dòng 277) chỉ nói nhóm, quy tắc chọn, giá cộng thêm, gắn nhóm vào món; OW-04 (dòng 279) nói bật/tắt tuỳ chọn ở cấp toàn chuỗi; cờ "còn bán" theo chi nhánh thuộc BM-02 (dòng 327, Branch Manager) và mục 12 (dòng 1177: "do Branch Manager hoặc Barista bật/tắt"). Kết luận: real bỏ panel, không thêm #41. Panel còn ở mock chỉ để minh hoạ.

## 9. Chốt giai đoạn 5 (5.8e, 2026-10-04)

**Tóm tắt GĐ5 (Manager):**
1. **Real:** trang đặt mật khẩu (`/setup-password`); Owner quản Manager (`/employees`); quầy và máy in (`GET/POST /stations`); ghép/thu hồi màn hình khách và ghép màn hình gọi số; menu món chi nhánh (`GET /branches/{id}/menu`, `PATCH …/items/{id}` chỉ `{isAvailable}`); tuỳ chọn theo chi nhánh (`GET/PATCH /manager/menu-options`, cờ riêng `VITE_API_BRANCH_OPTIONS`); thông tin chi nhánh.
2. **Mock (chờ BE):** Cashier/Barista của Manager (BE `/manager/staff` bắt buộc mật khẩu, lệch quyết định "tạo → email đặt mật khẩu", #23/#24); danh sách màn hình gọi số (thiếu `GET /display-devices`, #28); dòng "Owner đã tắt" của món (BE ẩn hẳn món Owner tắt, #19); phía Owner của tuỳ chọn món (OW-03, làm real đầu GĐ6); nhận diện, PayOS, đơn, AI (giai đoạn 6–9).
3. **Chờ BE:** email đặt mật khẩu không có tiến trình gửi (#1, CAO); hạn mức tài khoản đếm cả tài khoản khoá và mở khoá không kiểm hạn mức (#26); endpoint gói cho Manager (#38) nên Manager ở real không tự khoá khi hết hạn; mã lỗi `SUBSCRIPTION_READ_ONLY` (#31); `PATCH /stations` (#27); 3 gói seed giá thật (#32, #35); Manager ghi được `isEnabled` (#37).
4. **Lớp lỗi dùng chung (5.8):** thông báo lỗi luôn tiếng Việt (5xx, bảng dịch câu BE, 400 theo ô), chống trùng 3 giây, nút Thử lại làm mới thật màn đang mở cho lỗi đọc mất mạng/5xx, hỏi xác nhận khi có form nhập dở, đọc/ghi theo phương thức HTTP.
5. **Kiểm thử:** vitest 266/266; bộ giả lập lỗi CDP trên BE thật cho mọi màn real (đọc, ghi, nạp khu vực, 401 hết phiên); script kiểm có cờ `--mode`, `--only` (quy tắc 13).
6. **Còn mở:** ~~1 lỗi app ở tạo chi nhánh (hiện 2 thông báo)~~ đã sửa ở `e2fcdf1`; BE local `0083289` (đã build lại, backup 2026-10-03); Landing vẫn dùng giá mock.

**Bảng kết quả chốt** (BE local `0083289`, Vite 5173 real; 5174 mock; mọi request ghi trên real bị chặn ở CDP):

| Kiểm | Mock | Real | Thời gian (mock / real) |
|---|---|---|---|
| `pnpm tsc --noEmit && lint && build && test` | — | vitest **266/266** | — |
| phase2 | `flip` 1/1 | **40/40** | 15s / 143s |
| phase3 | **47/47** | **15/15** | 88s / 39s |
| phase4 | **72/72** | **20/20** | 152s / 37s |
| phase5 | **111/111** | **75/75** | 237s / 83s |
| phase58-forms | — | **16/16** | 26s |
| phase58-faults (chỉ các ca chưa chạy lại, real) | — | admin/signups đọc+ghi, admin/tenants ghi, admin/plans ghi, owner/accounts ghi, manager/stations ghi, manager/branch-info, nạp khu vực Admin: **đạt hết**; owner/branches ghi: 500 đạt, 403/mạng/401 **trùng thông báo** (lỗi app ở trên) | ~8 phút |

**Chập chờn gặp ở lượt chốt** (script chạy lại 1 lần là đạt; không phải lỗi app):
- phase4 real: 1/4 lần chạy ngắt giữa chừng (`document.querySelector(".ant-card")` còn null lúc thao tác, trang chưa vẽ xong); 2 lần chạy lại liên tiếp đều 20/20.
- **[HẾT từ 6.7, `0326164`: script chờ dòng hạn mức có số; 3 lần liền 112/112]** phase5 mock: 1/2 lượt trượt đúng 1 kiểm ("Đủ hạn mức: nút 'Thêm nhân viên' bị khoá", 110/111); chạy lại 111/111. Trước đó 3 lượt liền 111/111.
- Lần chạy đầu của lượt chốt (phase2, phase3, phase4 real) hỏng vì tôi sửa `.env.example` giữa lúc chạy (Vite theo dõi `.env*`); suy đoán, không chứng minh được; chạy lại sạch đạt hết. **Quy tắc: không sửa file `.env*` khi đang chạy kiểm trình duyệt.**
- Một kiểm phase3 mock ("Đổi gói (hạ vượt hạn mức)") đòi câu tiếng Anh cũ của BE: lỗi **script** do dịch lỗi ở 5.8b; đã sửa kỳ vọng thành câu tiếng Việt.

**Kiểm real sau khi build BE `91867ae` (6.3c) — `phase2 --mode=real` 35/40, trượt ổn định; ĐÃ XỬ LÝ ở 6.3d (`phase2` real nay 40/40):**
- 4 ca khối `errors` (403, hạn mức, mạng, 401): lỗi **script**, do 6.3 bật `options=real` (khối dựa vào màn "Tuỳ chọn món" còn chạy mock). Sửa ở `b63d940` (quyết định 20).
- 1 ca khối `refresh` "hai tab cùng hết hạn: chỉ gọi /auth/refresh đúng 1 lần" → 2 lần: **do script đếm cả preflight `OPTIONS`** (quyết định 23). Bằng chứng: probe hai tab cho `tab2 refresh requests: ["POST","OPTIONS"]`, `tab1: []` (tab 1 chờ khoá `navigator.locks` rồi dùng lại token mới); `navigator.locks` có ở cả hai tab, chung `localStorage`, cùng origin; `refreshSession` đọc lại token sau khi chờ khoá (`client.ts:146-153`). BE: `/auth/refresh` xoay vòng token (`auth.service.ts:206`), dùng lại token cũ → thu hồi cả phiên và 401 (`:207-208`) — mã ứng dụng không bao giờ gọi lần hai nên không có rủi ro đăng xuất. Sửa script ở `d8d4275`, khối `refresh` 3/3 lần 4/4.
- `phase5 --mode=real`: 1 SKIP "Báo cáo: không kiểm được số liệu khác 0" (BE không có đơn đã trả trong 7 ngày, #35 — đã biết).
- Sau khi máy khởi động lại: Vite 5173 và Chrome CDP 9333 không còn chạy, đã dựng lại (Vite mặc định real, `chrome.mjs`).

**Kết quả kiểm 6.4 (BE `91867ae`):** mock — `phase6 branding` 20/20, `phase2` brand 7/7, plan 16/16, flip 1/1, login 5/5, `phase5` đủ 112/112. Real — `phase6 branding` 16/16, `phase2` đủ 32/32 (2 SKIP: ca "owner thấy màu riêng" và khối `brand` là mock-only), `phase5` đủ 76/76 (1 SKIP đơn đã trả #35), `phase58-faults` `owner/branding` 8/8 và `scope` 12/12.

**Chập chờn gặp ở GĐ6** (không phải lỗi app):
- **[HẾT từ 6.7: không tái hiện ở 6.5–6.7; từ `3a9860c` script in tên ca trượt]** `phase58-faults --only=owner/branding` (6.4): 1 lần in "0/1 ca Đạt, 1 ca Lỗi" (lần chạy nền nối với `scope`, chỉ lưu dòng tổng nên không rõ ca nào); chạy lại 2 lần đều 8/8, chưa tái hiện, chưa rõ nguyên nhân.
- **[HẾT từ 6.7: 8/8 ở mọi lần chạy từ 6.2b tới 6.7, kể cả lượt đủ 3 vai]** `phase58-faults --only=owner/branches` (real): ở 6.2a có 1 lần 7/8 (bảng chỉ ghi 4 request thay vì 5). Ở 6.2b chạy lại 3 lần liên tiếp: **8/8 cả 3 lần**, mỗi lần 5 request ghi bị chặn (`POST /api/v1/restaurant-chains/{id}/branches`). Chưa tái hiện, chưa rõ nguyên nhân; không sửa script.
- `phase4 --mode=mock --only=owner` (6.2b): khi viết khối tuỳ chọn từng dòng gặp 5 kiểu trượt do **script** gõ/đọc trước khi mã ứng dụng xong (dòng thêm tuỳ chọn mới đóng chậm hơn 900 ms cố định nên dòng kế tiếp gõ vào dòng sắp đóng; đổi thứ tự nhóm/tuỳ chọn, xoá món và tắt mặc định chờ `sleep` cố định trong khi lệnh patch + nạp lại có độ trễ giả lập). Đã đổi sang **chờ điều kiện** (`addOptionUI`, `waitOptCodes`, `waitOrder`, các vòng chờ), sau đó 5/6 lần chạy 99/99, 1 lần ngắt vì `CDP timeout: Runtime.evaluate` (hạ tầng Chrome, chạy lại 99/99).
- `phase4 --mode=real --only=owner` (6.3): 1 lần trượt kiểm cũ "Real · Món: lọc 'Đang bán' khớp BE" (0 hàng, ca chọn Select chờ `sleep` cố định, không thuộc tuỳ chọn); chạy lại 2 lần liên tiếp 29/29.
- Chế độ `fulfillWrites` của `cdp.mjs` (6.3): bật tạm chỉ ở bước đổi chỗ để thấy đủ 2 lệnh patch; request vẫn KHÔNG rời trình duyệt (trả 200 `{}` ngay trong CDP). Mọi chỗ khác chặn bằng `BlockedByClient`.
- Thông báo "Máy chủ gặp sự cố" (`duration: 0`) không tự tắt: ca giả lập lỗi BE phải đóng nó (`.ant-notification-notice-close`) trước các ca sau.
- **Còn tái hiện (6.7, mock):** `phase4 --mode=mock --only=owner` 1 lần 98/99 ("Lỗi BE: lưu một dòng báo lỗi tiếng Việt…", ca đọc toast đúng lúc nó đổi nội dung), chạy lại 2 lần 99/99; `phase5 --mode=mock` 1 lần ngắt `CDP timeout: Runtime.evaluate` (hạ tầng Chrome, mục Chrome ở mục 8b). Chưa sửa (không tái hiện ổn định).
- **Dễ nhầm (6.7):** `phase2 --mode=mock` KHÔNG kèm `--only` chạy cả khối `errors`/`refresh` — hai khối này tiêm lỗi ở CDP trên `GET …/menu/categories` real nên ở mock báo 5 FAIL giả (35/40). Ở mock chỉ chạy `--only=brand|plan|ai|login|flip` (cần `AUTH_MODE=mock`); `errors`, `refresh` chỉ chạy real.

## 10. Chốt giai đoạn 6 — Owner (6.7, 2026-10-06)

**Tóm tắt GĐ6 (Owner), nhánh `feat/v9-owner` (từ `f701bb8`):**
1. **Real:** tuỳ chọn món Owner (OW-03, `options=real`, 6.3, kèm `allowBatching` 6.3d); nhận diện thương hiệu (OW-07, `branding=real`, 6.4; chỉ đổi tên được nhận ra và nạp lại khi điều hướng ở 6.5); liên kết PayOS (OW-06, `payos=real`, 6.5, khoá một chiều); "Gói của tôi" (OW-10, 6.6, dữ liệu thật từ `GET /restaurant-chains`, hạn dùng/trạng thái ghi "chờ BE #38").
2. **Sửa:** Branches báo lỗi 2 lần (`e2fcdf1`, 6.1); nhãn "(số liệu mẫu)" ở màn Nhân viên (6.1); `reportApiError` chỉ thay lỗi ĐỌC bằng khối lỗi trong trang (6.5).
3. **Chờ BE:** #15 (`isDefault`), #16, #22, #33 (chặn theo gói), #38 (trạng thái/hạn dùng gói cho Owner và Manager), #39 (`isCustom`, `version`, vai đọc nhận diện), #40 (PayOS: kiểm khoá, che khoá ••••, trạng thái Lỗi, webhook theo kênh), #42 (seed chạy mỗi lần khởi động ghi đè dữ liệu mẫu).
4. **Kiểm thử:** vitest 360/360 (từ 266 ở GĐ5); `phase6.mjs` mới (khối `branding`, `payos`, `plan`); bộ giả lập lỗi mở rộng (`owner/payos` kèm 503, ca ghi "Gỡ liên kết", `owner/plan`); `chrome.mjs` tự mở lại khi Chrome sập lúc khởi động.

**Các lượt (hash đầu → cuối):** 6.0 khảo sát (không commit) · 6.1 `e2fcdf1`→`37f220f` · 6.2a `8b627f6`→`c38e964` · 6.2b `a1dbba7`→`9e61140` · 6.3 `07ecedc`→`9474fa7` · 6.3b khảo sát BE `91867ae` · 6.3c `231f5a9` (build BE) · 6.3d `d8d4275`→`d63ad12` · 6.4 `987bf2d`→docs · 6.5 `29fb9d9`→`3afb12c` · 6.6 `61d610d`→`d99c6e9` · 6.7 `0326164` + commit docs chốt. Quyết định 1–43: mục 8b.

**Bảng kết quả chốt** (BE local `91867ae`; backup mới nhất `~/backup-smartfnb-20261004-184610.sql` trước khi build `91867ae`; Vite 5173; mọi request ghi trên real bị chặn ở CDP):

| Kiểm | Mock | Real |
|---|---|---|
| `pnpm tsc --noEmit && lint && build && test` | — | vitest **360/360** (28 file) |
| phase2 | `brand` 7/7, `plan` 16/16, `ai` 3/3, `login` 5/5, `flip` 1/1 (`errors`, `refresh` chỉ real) | **32/32** (2 SKIP: ca "owner thấy màu riêng" và khối `brand` là mock-only) |
| phase3 | **47/47** | **15/15** (1 SKIP: gia hạn trên dữ liệu thật, cần `ALLOW_REAL_RENEW=1`) |
| phase4 | `owner` **99/99**, `manager` **2/2** | `owner` **31/31**, `manager` **2/2** |
| phase5 | **112/112** (3 lần liền sau sửa script) | **76/76** (1 SKIP: BE không có đơn đã trả 7 ngày gần nhất) |
| phase6 | **47/47** (branding 24, payos 15, plan 8) | **37/37** (branding 16, payos 10, plan 11) |
| phase58-forms | — | **16/16** |
| phase58-faults (admin, owner, manager) | — | **148/148** (admin 33, owner 82, manager 33; gồm `scope`, `expired`) |

**Bảng request ghi bị chặn (real, tổng hợp; mọi dòng là ca có chủ đích, không request nào tới BE):** phase3: 1× `POST registration-applications` (ca gửi hồ sơ công khai); phase4 owner: 11 (option-groups POST/PATCH/DELETE, options POST/PATCH 4×/DELETE, items option-groups PUT, items PATCH); phase5: 9 (employees status/reset-password/branch, admin service-plans POST/PATCH, stations POST, pair-calling-display POST, branches menu items PATCH, manager menu-options availability PATCH); phase6: 8 (branding PUT 2×, logo POST 2×, DELETE 1×, payos-channel PUT 2×, DELETE 1×); phase58-forms: 1× `POST menu/items`; phase58-faults: 80 (15 dòng, mỗi màn 5× theo 500/403/mạng/401 + 503 PayOS); phase2, phase4 manager: 0.

**Panel dev và bản build (QĐ 42):** `MockPanel` chỉ gắn khi `import.meta.env.DEV` (`App.tsx:55`), bảng cờ in console cũng chỉ ở dev (`api/flags.ts:100`). Quét `dist/` (17 chuỗi: `mock-panel`, `mock-profile`, `mock-tier`, `mock-expired`, `mock-payos-error`, `mock-clear`, `mock-failure`, `mock-pair`, "Hết hạn (chỉ đọc)", "giả lập trạng thái Lỗi", "Xoá dữ liệu mock đã lưu", "Lỗi giả lập", `MockPanel`, `setScenario`, `console.table`…): **0 khớp giao diện panel**. Còn trong build: các khoá lưu trữ mock (`fnb.mock.scenario`, `fnb.mock.failure`, `fnb.mock.session`, `smartfnb:mock:*`) — xem tồn đọng.

**Chập chờn/sửa script ở 6.7:** phase5 mock "dòng hạn mức nhân viên" đọc khi còn "Đang tải hạn mức…" → script chờ có số (`0326164`, 3 lần liền 112/112); phase4 owner mock 1 lần 98/99 và phase5 mock 1 lần `CDP timeout` — chạy lại đạt, chưa sửa (mục chập chờn ở trên). Không có ca trượt do mã ứng dụng.

**Tồn đọng chuyển sang GĐ7:** #15, #16, #22, #33, #38, #39, #40, #42 (tất cả chờ BE, xem `docs/api-contract-plan.md`); đọc kịch bản mock từ localStorage còn trong bản build (`api/mock/scenario.ts:16-38`, `plan/real.ts` đọc `getScenario()`); Manager ở real không tự khoá khi gói hết hạn (#38); mock Cashier/Barista của Manager (#23, #24); danh sách màn hình gọi số (#28).

**Lượt tiếp theo: 7.0** — mở GĐ7, khảo sát chỉ đọc (đặc tả BM-xx, luồng đơn, endpoint đơn hàng của Manager ở BE `91867ae`), tách nhánh mới chờ Khánh duyệt.
