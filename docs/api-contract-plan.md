# Hợp đồng API gói dịch vụ (OW-10) và cờ tính năng — web cần gì từ BE

> Dành cho nhóm BE. Căn cứ: đặc tả v9 mục 13 (gói), mục 10 (nhận diện), BR-08, BR-09, BR-11.
> Hiện web **chỉ đọc được hạn mức thật** (`subscription.quotas` trong `GET /restaurant-chains`). Mọi thứ còn lại dưới đây đang là **mock** ở web (`src/api/modules/plan`), chờ BE.
> Kiểu TypeScript tương ứng: `src/types/plan.ts`.

## 1. Endpoint đề xuất

```
GET /api/v1/restaurant-chains/{chainId}/subscription
```

- Vai trò gọi được: **OWNER** của chuỗi và **MANAGER** thuộc chuỗi. Manager cần vì nhận diện (BR-41) và chế độ chỉ đọc (BR-09) áp cho cả Manager; hiện `GET /restaurant-chains` trả 403 cho Manager nên web không đọc được gói của Manager.
- Manager không cần thấy giá, nên `limits` có thể để rỗng cho Manager.
- **Phải trả 200 cả khi gói hết hạn hoặc tạm ngưng** (xem mục 4).
- Thay thế cho phần `subscription` đang nằm lẫn trong `GET /restaurant-chains`; có thể giữ cả hai.

## 2. Response

```json
{
  "chainId": "6f1c…",
  "tier": "ADVANCED",
  "planName": "Nâng cao",
  "status": "active",
  "expiresAt": "2026-10-22T16:59:59.000Z",
  "limits": [
    { "resource": "branches", "used": 3, "limit": 10, "remaining": 7 },
    { "resource": "accounts", "used": 14, "limit": 80, "remaining": 66 }
  ],
  "features": {
    "branding":           { "enabled": true, "requiredTier": "STANDARD" },
    "multiBranchCompare": { "enabled": true, "requiredTier": "STANDARD" },
    "aiAssistant":        { "enabled": true, "requiredTier": "ADVANCED" }
  }
}
```

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `tier` | `"BASIC" \| "STANDARD" \| "ADVANCED"` | Cấp của gói (Cơ bản / Tiêu chuẩn / Nâng cao). Cần một cột `tier` ổn định trên `service_plans`; hiện chỉ có `code` tự do. Web dùng để so sánh "đủ cấp chưa", không dùng để suy ra tính năng. |
| `planName` | string | Tên gói do Admin đặt, hiển thị nguyên văn. |
| `status` | `"active" \| "expired" \| "suspended"` | `expired` tính từ `expiresAt` khi xử lý yêu cầu, không cần job (mục 13.4). `suspended` do Admin tạm ngưng. Cả hai đều là chế độ chỉ đọc ở web. |
| `expiresAt` | ISO 8601, nullable | Ngày hết hạn (`business_subscriptions.expires_at`). Web hiện cho Owner và hiện ở banner. |
| `limits[]` | mảng | Mức đã dùng thật. `resource` ∈ `branches`, `accounts`. **Số tài khoản** tính mọi tài khoản đang hoạt động (Owner, Manager, Cashier, Barista), không tính tài khoản đã khoá (mục 13.1). Không có hạn mức bàn (`tables` của BE hiện tại là v7, web bỏ qua). |
| `features` | object theo khoá | Đúng ba khoá ở bảng dưới. Thêm tính năng mới = thêm khoá, web bỏ qua khoá lạ. |
| `features.*.enabled` | boolean | Gói hiện tại có tính năng này không. |
| `features.*.requiredTier` | tier | Cấp thấp nhất có tính năng — để thẻ khoá ghi "Cần gói Nâng cao". Không để web tự suy ra, vì số liệu gói do Admin cấu hình (CC-01). |

Khoá tính năng (`plans` có đủ ba cờ — mục 13.4):

| Khoá | Ý nghĩa | Màn hình khoá |
|---|---|---|
| `branding` | Nhận diện thương hiệu | OW-07; và việc áp màu cho mọi tài khoản |
| `multiBranchCompare` | So sánh đa chi nhánh trong báo cáo | OW-08 (khối "Doanh thu theo chi nhánh") |
| `aiAssistant` | Trợ lý số liệu | OW-09 |

## 3. Nhận diện theo gói (BR-41)

- `GET /restaurant-chains/{id}/branding`: gói **Cơ bản luôn trả bộ mặc định**, dù bảng branding đã có cấu hình (đặc tả 10.5). Hạ gói thì giữ cấu hình, nâng lại là áp ngay. Web có tự kiểm tra `features.branding.enabled` thêm một lần, nhưng nguồn đúng là BE.
- `GET …/branding` BE đã cho OWNER, MANAGER, CASHIER… đọc (đúng); chỉ cần thêm kiểm tra gói như trên.
- Mỗi lần Owner lưu: tăng số phiên bản cấu hình để client biết tải lại (mục 10.5).

## 4. Chế độ chỉ đọc khi hết hạn (BR-09) — **BE hiện đang lệch đặc tả**

- Đặc tả: hết hạn → **chỉ đọc**. Không chốt đơn mới, không sửa cấu hình; **đơn đã thanh toán trước đó vẫn được pha và gọi số cho xong**; dữ liệu giữ tối thiểu 90 ngày.
- BE hiện tại: `branch-access.service.ts` ném `403 "The business subscription is not active"` cho cả thao tác **đọc** (kể cả `GET /restaurant-chains`, `GET /branches`).
- Web làm theo đặc tả: gọi được là xem; nút tạo/sửa/xoá tự khoá kèm banner. Nếu BE vẫn chặn đọc thì web thấy lỗi 403 ở mọi màn, không vào được chế độ chỉ đọc.
- Đề nghị: khi `status != active`, **cho phép mọi `GET`**, chặn các thao tác ghi bằng một mã lỗi riêng, ví dụ `403` + `error: "SUBSCRIPTION_READ_ONLY"`.

## 5. Mã lỗi web đang xử lý (BR-08)

Web đọc `error` (mã) trong body lỗi để chọn thông báo. Cần BE thống nhất:

| HTTP | `error` | Khi nào | Web hiện |
|---|---|---|---|
| 409 | `PLAN_LIMIT_REACHED` | vượt hạn mức chi nhánh/tài khoản (BE **đã có** cho chi nhánh) | "Vượt hạn mức…" + gợi ý gói nâng nếu có `suggestedPlans` |
| 403 | `PLAN_FEATURE_UNAVAILABLE` | gọi tính năng gói không có (nhận diện, so sánh, AI) | "Gói hiện tại không có tính năng này" |
| 403 | `SUBSCRIPTION_READ_ONLY` | thao tác ghi khi hết hạn/tạm ngưng | "Doanh nghiệp đang ở chế độ chỉ đọc" |
| 403 | (khác) | thiếu quyền vai trò | "Bạn không đủ quyền" |

Web nhận diện lỗi gói bằng mã có chứa `PLAN`, `QUOTA`, `LIMIT`, `FEATURE` hoặc `SUBSCRIPTION`; đặt đúng tên như bảng trên là đủ.

## 6. Còn chưa chốt (CC-12)

Thu phí gói qua hệ thống chưa chốt nên web **không** làm màn gia hạn/thanh toán. Hợp đồng trên chừa chỗ: Admin gia hạn qua `POST /admin/businesses/{id}/subscription/renew` (đã có), web chỉ cần `status`/`expiresAt` đổi.
