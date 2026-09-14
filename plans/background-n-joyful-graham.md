# Audit: Smart F&B Chain Platform – Trạng thái hiện tại

## 1. Danh sách màn hình theo vai trò

### Platform Admin (`src/roles/admin/`)

| File | Vai trò | Chức năng | Nút / hành động |
|---|---|---|---|
| `AdminApp.tsx` | admin | Shell điều hướng 4 mục: Tổng quan, Doanh nghiệp, Đăng ký, Nhật ký | Nav menu, Logout |
| `Kpis.tsx` | admin | 4 stat card: MRR, số tenant, sắp hết hạn, đơn đăng ký chờ | Không có |
| `TenantsTable.tsx` | admin | Bảng toàn bộ tenant; click mở Drawer chi tiết hạn mức & trạng thái | Gia hạn, Tạm ngưng, Kích hoạt lại (Drawer) |
| `SignupRequests.tsx` | admin | Danh sách 3 yêu cầu đăng ký mới | Duyệt, Từ chối |
| `AuditLog.tsx` | admin | Bảng nhật ký thao tác (read-only) | Không có |

### Business Manager (`src/roles/manager/`)

| File | Vai trò | Chức năng | Nút / hành động |
|---|---|---|---|
| `ManagerApp.tsx` | manager | Shell 8 mục điều hướng | Nav menu, Logout |
| `Kpis.tsx` | manager | 4 stat card: doanh thu hôm nay, vòng quay bàn, thời gian chờ, món bán chạy | Không có |
| `RevenueChart.tsx` | manager | Biểu đồ cột doanh thu theo giờ (10h–21h) | Không có |
| `AiPanel.tsx` | manager | Card AI insight: quá tải bếp 12h–13h, gợi ý điều chỉnh | Chạy phân tích lại |
| `MenuTable.tsx` | manager | Bảng menu 7 món: giá, trạm, thời gian pha chế, quota còn lại, toggle kích hoạt | Toggle active, Sửa remaining, Không giới hạn, Thêm món |
| `StaffTable.tsx` | manager | Bảng nhân viên: vai trò, chi nhánh, ca làm, phân quyền | Toggle ca, Phân quyền, Thêm nhân viên |
| `Branches.tsx` | manager | Grid 3 chi nhánh: địa chỉ, giờ mở, trạm, nhân viên theo ca | Sửa chi nhánh, Thêm trạm, Thêm chi nhánh |
| `FloorPlan.tsx` | manager | Sơ đồ 12 bàn chia theo khu: trạng thái, khách, elapsed, số tiền | Không có (display only) |
| `PaymentConfig.tsx` | manager | Cấu hình VietQR: tài khoản Vietcombank, webhook URL | Cập nhật tài khoản, Kiểm tra webhook |
| `Refunds.tsx` | manager | Danh sách 3 yêu cầu hoàn tiền; badge leo thang khi chờ ≥5 phút | Duyệt hoàn tiền, Từ chối |

### Kitchen Staff (`src/roles/kitchen/`)

| File | Vai trò | Chức năng | Nút / hành động |
|---|---|---|---|
| `KitchenApp.tsx` | kitchen | Queue bếp với Segmented filter (Tất cả/Đang làm/Chờ/Xong) | Filter, Check-out ca |
| `TicketCard.tsx` | kitchen | Card ticket: tên món, ghi chú, thời gian, trạng thái | Bắt đầu làm, Xong, Báo hết món |

### Cashier (`src/roles/cashier/`)

| File | Vai trò | Chức năng | Nút / hành động |
|---|---|---|---|
| `CashierApp.tsx` | cashier | Shell 2 mục: Ngoại lệ thanh toán, Lịch sử giao dịch | Nav, click chọn transaction |
| `TxList.tsx` | cashier | Danh sách transaction có thể chọn | Click chọn dòng |
| `TxDetail.tsx` | cashier | Panel chi tiết: xác nhận tiền mặt, đối soát QR, tạo hoàn tiền, in hoá đơn | Xác nhận, Đối soát, Tạo hoàn tiền, In hoá đơn |

---

## 2. Sơ đồ điều hướng

```
Khởi động (App.tsx)
└─ role === null → LoginScreen (src/roles/LoginScreen.tsx)
   ├─ Chọn "Platform Admin" → AdminApp
   │   ├─ [Nav] Tổng quan     → Kpis + TenantsTable (sidebar) + SignupRequests (sidebar)
   │   ├─ [Nav] Doanh nghiệp  → TenantsTable toàn trang
   │   │   └─ Click dòng tenant → Drawer chi tiết
   │   │       ├─ Bấm "Gia hạn"       → status = active
   │   │       ├─ Bấm "Tạm ngưng"     → status = suspended
   │   │       └─ Bấm "Kích hoạt lại" → status = active
   │   ├─ [Nav] Đăng ký       → SignupRequests
   │   │   ├─ Bấm "Duyệt"    → toast success (không đổi state)
   │   │   └─ Bấm "Từ chối"  → toast info (không đổi state)
   │   ├─ [Nav] Nhật ký       → AuditLog (read-only)
   │   └─ [Sidebar] Logout    → trở về LoginScreen
   │
   ├─ Chọn "Business Manager" → ManagerApp
   │   ├─ [Nav] Tổng quan         → Kpis + RevenueChart + AiPanel + MenuTable
   │   ├─ [Nav] Sơ đồ bàn         → FloorPlan (display only)
   │   ├─ [Nav] Quản lý menu      → MenuTable
   │   │   ├─ Toggle active         → đổi trạng thái + toast
   │   │   └─ Sửa remaining quota  → số giảm về 0 → auto disable
   │   ├─ [Nav] Chi nhánh & trạm  → Branches (mọi nút = toast)
   │   ├─ [Nav] Nhân viên          → StaffTable
   │   │   └─ Toggle ca làm         → đổi onShift
   │   ├─ [Nav] Duyệt hoàn tiền   → Refunds
   │   │   ├─ Duyệt  → status = approved, ẩn nút
   │   │   └─ Từ chối → status = rejected, ẩn nút
   │   ├─ [Nav] Thanh toán         → PaymentConfig (mọi nút = toast)
   │   ├─ [Nav] Phân tích AI       → RevenueChart + AiPanel
   │   └─ [Sidebar] Logout         → trở về LoginScreen
   │
   ├─ Chọn "Kitchen Staff" → KitchenApp
   │   ├─ [Segmented] Tất cả / Đang làm / Chờ / Xong → lọc danh sách ticket
   │   ├─ Mỗi TicketCard
   │   │   ├─ "Bắt đầu làm" → status: queued → cooking
   │   │   ├─ "Xong"        → status: cooking → done
   │   │   └─ "Báo hết món" → modal xác nhận → xoá ticket + toast warning
   │   └─ [Sidebar] Check-out ca → Logout → LoginScreen
   │
   └─ Chọn "Cashier" → CashierApp
       ├─ [Nav] Ngoại lệ thanh toán
       │   ├─ Stat cards (pending cash, stuck/failed, refunds today)
       │   ├─ TxList – click dòng → chọn transaction (selId)
       │   └─ TxDetail (hiện theo status + method)
       │       ├─ pending + Tiền mặt → "Xác nhận đã nhận tiền mặt" → status = confirmed
       │       ├─ pending + VietQR  → "Đối soát tay & xác nhận"   → status = confirmed
       │       ├─ failed             → "Đối soát tay theo mã đơn"  → status = confirmed
       │       ├─ confirmed/refund   → "Tạo hoàn tiền"             → status = refund
       │       └─ (mọi trạng thái)  → "In hoá đơn"                → toast (simulated)
       ├─ [Nav] Lịch sử giao dịch   → Bảng toàn bộ transactions (display)
       └─ [Sidebar] Logout           → LoginScreen
```

---

## 3. Dữ liệu mẫu trong `src/data.ts`

### Tenant
| Field | Kiểu | Mô tả |
|---|---|---|
| id | string | Mã tenant |
| name | string | Tên doanh nghiệp |
| plan | "Starter"\|"Growth"\|"Chain" | Gói thuê bao |
| branches | number | Số chi nhánh hiện có |
| branchLimit | number | Giới hạn chi nhánh theo gói |
| status | "active"\|"trial"\|"suspended"\|"expiring" | Trạng thái |
| mrr | number | Doanh thu định kỳ tháng (VNĐ) |
| renews | string | Ngày gia hạn tiếp theo |

### planLimits (keyed by plan name)
| Field | Kiểu |
|---|---|
| branches | number |
| staff | number |
| tables | number |
| price | number |

### signupRequests
| Field | Kiểu |
|---|---|
| id | string |
| name | string |
| contact | string |
| branches | number |
| submitted | string |

### MenuItem
| Field | Kiểu |
|---|---|
| id | string |
| name | string |
| category | string |
| price | number |
| station | string |
| prepMinutes | number |
| servingMode | "immediate"\|"by-table" |
| active | boolean |
| remaining | number\|null |
| sold | number |

### KitchenTicket
| Field | Kiểu |
|---|---|
| id | string |
| table | string |
| item | string |
| qty | number |
| note | string? |
| waited | number (phút) |
| dueIn | number (phút, âm = quá hạn) |
| mode | "immediate"\|"by-table" |
| status | "queued"\|"cooking"\|"done" |

### Transaction
| Field | Kiểu |
|---|---|
| id | string |
| table | string |
| session | string |
| amount | number |
| method | "VietQR"\|"Tiền mặt" |
| status | "pending"\|"confirmed"\|"refund"\|"failed" |
| time | string |
| note | string? |

### AuditEntry
| Field | Kiểu |
|---|---|
| id | string |
| time | string |
| actor | string |
| action | string |
| target | string |

### Branch
| Field | Kiểu |
|---|---|
| id | string |
| name | string |
| address | string |
| hours | string |
| tables | number |
| stations | Station[] ({ name, staffOn }) |
| status | "open"\|"closed" |

### FloorTable
| Field | Kiểu |
|---|---|
| id | string |
| area | string |
| seats | number |
| state | "empty"\|"serving"\|"needs-clean"\|"reserved" |
| guests | number? |
| elapsed | number? (phút) |
| amount | number? |

### Staff
| Field | Kiểu |
|---|---|
| id | string |
| name | string |
| role | "Manager"\|"Waiter"\|"Kitchen"\|"Cashier" |
| branch | string |
| station | string? |
| onShift | boolean |

### RefundRequest
| Field | Kiểu |
|---|---|
| id | string |
| table | string |
| item | string |
| amount | number |
| reason | string |
| requestedBy | string |
| waited | number (phút) |
| status | "pending"\|"approved"\|"rejected" |

### bankAccount (single object)
| Field | Kiểu |
|---|---|
| bank | string |
| accountName | string |
| accountNumber | string |
| connected | boolean |
| webhook | string |

Ngoài ra còn có: `revenueByHour` (12 điểm { hour, value }), `roleMeta` (label/scope mỗi role), `money()` (helper format VNĐ).

---

## 4. Màn tĩnh vs. màn tương tác thật

### Tương tác thật (state thực sự thay đổi)

| Màn hình | Hành động thực |
|---|---|
| `TenantsTable` | Suspend / Reactivate / Renew → `tenants` state đổi, UI re-render ngay |
| `MenuTable` | Toggle active, sửa remaining (auto-disable khi = 0) → `items` state |
| `StaffTable` | Toggle ca làm → `staff` state |
| `Refunds` | Duyệt / Từ chối → `rows` state, ẩn nút sau khi quyết định |
| `KitchenApp / TicketCard` | Advance ticket status, xoá ticket sold-out, filter Segmented → `tickets` + `filter` state |
| `CashierApp / TxDetail` | Resolve transaction (confirmed/refund) → `txs` state; chọn dòng → `selId` |

### Chỉ có toast / modal giả lập (không đổi state)

| Màn hình | Hành động giả lập |
|---|---|
| `SignupRequests` | Duyệt / Từ chối → toast, danh sách không thay đổi |
| `MenuTable` | Nút "Thêm món" không có `onClick` |
| `StaffTable` | Phân quyền, Thêm nhân viên → toast |
| `Branches` | Sửa chi nhánh, Thêm trạm, Thêm chi nhánh → toast |
| `PaymentConfig` | Cập nhật tài khoản, Kiểm tra webhook → toast |
| `AiPanel` | Chạy phân tích lại → loading toast 1.2s |
| `TxDetail` | In hoá đơn → toast |

### Hoàn toàn tĩnh (không có nút nào)

| Màn hình | Lý do |
|---|---|
| `Kpis` (admin + manager) | Display-only stat cards |
| `AuditLog` | Read-only log table |
| `RevenueChart` | Biểu đồ div tĩnh |
| `FloorPlan` | Sơ đồ bàn display-only, không click được |
| `CashierApp` – History tab | Bảng lịch sử read-only |
