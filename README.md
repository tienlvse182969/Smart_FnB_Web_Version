# Smart F&B Web

Giao diện web (React 19 + Vite + Ant Design 6 + Zustand + React Router 7) của **Smart F&B Chain Platform** (đồ án SP26SE123): SaaS multi-tenant cho chuỗi đồ uống gọi món, trả tiền trước tại quầy.

Web chỉ gồm bốn khu vực: **Platform Admin**, **Owner**, **Branch Manager** và **màn hình gọi số** chạy trên TV. POS thu ngân, màn hình phía khách và màn hình pha chế thuộc app Android, không nằm trong repo này.

Nghiệp vụ chuẩn: `docs/Smart-FnB-Dac-ta-v9.md`. Trạng thái, quyết định và quy tắc làm việc: `docs/BAN-GIAO.md` (đọc trước khi làm gì).

## Chạy local

```powershell
Copy-Item .env.example .env.local
pnpm install
pnpm dev --port 5173
```

Backend (NestJS, chỉ đọc từ phía web) chạy ở `http://localhost:3100/api/v1`. CORS của backend chỉ cho `localhost` cổng **5173**, 8443 và 8081, nên chạy web ở cổng 5173 khi dùng backend thật.

```dotenv
VITE_API_BASE_URL=http://localhost:3100/api/v1
```

## Cờ real/mock theo module

Mỗi module của lớp API (`src/api/modules/*`) có một cờ `VITE_API_<MODULE>=real|mock`, mặc định theo bảng ở `docs/BAN-GIAO.md` (mục "Bảng cờ module") và `src/api/flags.ts`. Đổi cờ không phải sửa màn hình. Khi chạy `pnpm dev`, bảng cờ được in ra console. Ví dụ chạy toàn bộ bằng dữ liệu giả lập, không cần backend:

```powershell
$env:VITE_API_AUTH="mock"; $env:VITE_API_BRANCH="mock"; $env:VITE_API_REPORT="mock"; $env:VITE_API_MENU="mock"; $env:VITE_API_ACCOUNT="mock"; $env:VITE_API_STATIONS="mock"; $env:VITE_API_PLAN="mock"; $env:VITE_API_ADMIN="mock"; $env:VITE_API_BRANCH_OPTIONS="mock"; pnpm dev
```

## Tài khoản demo

| Chế độ | Tài khoản | Nguồn mật khẩu |
| --- | --- | --- |
| Backend thật | Platform Admin | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` trong `.env` của backend |
| Backend thật | `owner.demo@smartfnb.local`, `manager.demo@smartfnb.local` | `SEED_DEMO_PASSWORD` trong `.env` của backend |
| Mock | Tài khoản `*@mock.local` (danh sách và mật khẩu ở `src/api/modules/auth/mock.ts`) | `src/api/modules/auth/mock.ts` |

Không đưa mật khẩu thật vào biến Vite: mọi biến `VITE_*` nằm trong bundle chạy trên trình duyệt.

## Kiểm tra

```powershell
pnpm tsc --noEmit
pnpm lint
pnpm build
pnpm test
```

Chạy các lệnh trên nối bằng `&&`, theo thứ tự này, trước mỗi commit. Kiểm trên trình duyệt thật (Chrome CDP, không cần cài thêm thư viện) nằm ở `scripts/browser/`: xem `scripts/browser/README.md` và quy tắc 13 trong `docs/BAN-GIAO.md` (cờ `--mode`, `--only`). Với backend thật, mọi request ghi bị chặn ở tầng CDP.

## Cấu trúc chính

```
src/api/        lớp API: module real/mock, cờ, lỗi thống nhất (màn hình chỉ import từ "../api")
src/plan/       gói dịch vụ, hạn mức, chế độ chỉ đọc khi hết hạn
src/theme/      màu thương hiệu (theo tenant) tách khỏi màu ngữ nghĩa (cố định)
src/roles/      màn hình Admin, Owner, Branch Manager
src/display/    màn hình gọi số (TV)
scripts/browser kiểm trình duyệt thật
docs/           đặc tả v9, kế hoạch, bàn giao, hợp đồng API
```
