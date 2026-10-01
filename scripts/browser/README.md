# Kiểm tra trình duyệt thật (Chrome headless qua CDP)

Không cần thêm thư viện (dùng `WebSocket`/`fetch` có sẵn của Node ≥ 22). Mật khẩu **không** nằm trong file: tài khoản thật đọc từ `.env` của BE (chỉ đọc), tài khoản mock lấy từ `src/api/modules/auth/mock.ts`.

## Chạy

```bash
# 1. dev server (cổng bất kỳ)
PORT=5173 npx vite --port 5173

# 2. Chrome headless, cổng CDP 9333 (profile tạm)
node scripts/browser/chrome.mjs

# 3. kiểm tra (BE phải chạy cho các nhóm dùng API thật)
node scripts/browser/phase2.mjs            # tất cả nhóm trừ "flip"
node scripts/browser/phase2.mjs plan       # một nhóm: login | brand | plan | ai | errors | refresh | flip
```

| Biến môi trường | Mặc định | Ý nghĩa |
|---|---|---|
| `BASE_URL` | `http://localhost:$PORT` | địa chỉ dev server |
| `PORT` | `5173` | cổng dev server |
| `CDP_PORT` | `9333` | cổng Chrome DevTools |
| `CHROME_PATH` | tự dò | đường dẫn Chrome |
| `BE_ENV_PATH` | `../../BE_FnB/SmartFnBBackend/.env` | `.env` của BE (chứa tài khoản demo) |
| `AUTH_MODE` | `real` | `mock` = dùng tài khoản mock (khi `VITE_API_AUTH=mock`) |

## Nhóm kiểm tra của `phase2.mjs`

| Nhóm | Kiểm gì |
|---|---|
| `login` | trang đăng nhập và Admin luôn nhận diện nền tảng; bảng cờ được in ra console |
| `brand` | đổi doanh nghiệp mock A↔B: primary đổi trên mọi màn, màu trạng thái giữ nguyên; gói Cơ bản không áp màu |
| `plan` | BASIC/STANDARD/ADVANCED: AI, Nhận diện, so sánh khoá/mở đúng; hết hạn: banner và nút ghi bị vô hiệu hoá |
| `ai` | trợ lý trả số liệu từ bộ đơn mock, không rỗng |
| `errors` | 403, hạn mức, mạng (kèm Thử lại), 401 → /login, giả lập qua panel dev |
| `refresh` | hai tab cùng hết hạn access token: chỉ **một** lần `/auth/refresh`, không tab nào bị đá ra |
| `flip` | chạy trên dev server có `VITE_API_AUTH=mock VITE_API_BRANCH=mock VITE_API_REPORT=mock`: màn hình không đổi gì |

Chạy `flip`:

```bash
VITE_API_AUTH=mock VITE_API_BRANCH=mock VITE_API_REPORT=mock npx vite --port 5174
BASE_URL=http://localhost:5174 AUTH_MODE=mock node scripts/browser/phase2.mjs flip
```

Panel mock (góc dưới trái, chỉ có ở `vite dev`) đổi doanh nghiệp mock, ghi đè gói/hết hạn và giả lập lỗi; các script điều khiển nó qua `data-testid`.

## Giai đoạn 3.2 — `phase3.mjs` (Platform Admin: hồ sơ đăng ký + doanh nghiệp)

```bash
# BE không chạy: mọi thứ mock
VITE_API_ADMIN=mock VITE_API_AUTH=mock VITE_API_BRANCH=mock VITE_API_REPORT=mock npx vite --port 5175
BASE_URL=http://localhost:5175 AUTH_MODE=mock node scripts/browser/phase3.mjs mock

# BE chạy: chỉ phần ĐỌC + gia hạn 1 lần (KHÔNG duyệt/từ chối/tạm ngưng/đổi gói/đặt lại mật khẩu trên dữ liệu thật)
npx vite --port 5175
BASE_URL=http://localhost:5175 node scripts/browser/phase3.mjs real
```

Kiểm: danh sách/phân trang/lọc/tìm kiếm, duyệt (ngày hết hạn), từ chối (bắt buộc lý do), gia hạn, đổi gói nâng/hạ (409), tạm ngưng (bắt buộc lý do), đặt lại mật khẩu có xác nhận, KPI, và quét DOM + store + storage không có `balance`/`heldBalance`/ví/số dư.
