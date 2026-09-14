Bước 3: chia lại màn hình cho Owner và Branch Manager cho đúng phân quyền.

RÀNG BUỘC (giữ nguyên):
Không đổi màu, font, spacing, style component, bố cục. Màn mới phải trông 
như cùng một người thiết kế với màn cũ — tái sử dụng component sẵn có 
(bảng, toggle, badge, stat card, drawer) thay vì tự vẽ kiểu mới.

────────────────────────────────────
NGUYÊN TẮC PHÂN QUYỀN
────────────────────────────────────
Owner QUYẾT LUẬT CHƠI. Branch Manager CHƠI THEO LUẬT ĐÓ.

Owner: tạo chi nhánh, quản menu và GIÁ toàn chuỗi, tạo tài khoản 
Branch Manager, cấu hình tài khoản nhận tiền, xem báo cáo SO SÁNH 
giữa các chi nhánh. KHÔNG vận hành quán, KHÔNG mở bàn, KHÔNG thu tiền.

Branch Manager: điều hành MỘT chi nhánh + KIÊM THU NGÂN tại quầy. 
Bật/tắt món cho chi nhánh mình, thiết kế sơ đồ bàn, tạo tài khoản 
waiter và bếp, xác nhận thanh toán. KHÔNG sửa được tên/giá/ảnh món — 
đó là của Owner. KHÔNG xem được dữ liệu chi nhánh khác.

Toàn bộ màn của Branch Manager phải lọc theo MỘT chi nhánh. Thêm 
biến currentBranchId (tạm hardcode "B-01" / Quận 1) và một chip hiển 
thị tên chi nhánh ở header BranchApp, để nhìn là biết đang ở chi nhánh nào.

────────────────────────────────────
A. OWNER — sửa và thêm
────────────────────────────────────

A1. Tổng quan (Kpis + RevenueChart của owner/)
Hiện đang là số liệu một chi nhánh. Đổi thành TOÀN CHUỖI:
- Stat card: tổng doanh thu hôm nay cả chuỗi, số chi nhánh đang mở, 
  tổng lượt khách hôm nay, món bán chạy nhất chuỗi
- RevenueChart: đổi từ biểu đồ cột theo giờ thành SO SÁNH GIỮA CÁC 
  CHI NHÁNH — mỗi chi nhánh một cột, doanh thu hôm nay. Giữ nguyên 
  style biểu đồ hiện tại, chỉ đổi trục và dữ liệu.
  Lý do nghiệp vụ: nếu Owner phải xem từng chi nhánh một rồi tự nhẩm 
  thì không cần phần mềm.
- Bỏ chữ "Q1" còn sót trong copy.

A2. Menu toàn chuỗi (MenuTable) — đã gần đúng, chỉnh nốt:
- Cột "Có mặt tại x/3" hiện chỉ hiển thị. Cho click vào mở Drawer 
  liệt kê 3 chi nhánh với checkbox bật/tắt sự có mặt của món tại 
  từng chi nhánh. Bật = tạo BranchMenuItem (available=true, 
  remaining=null, sold=0). Tắt = xoá bản ghi.
  Dùng đúng style Drawer của TenantsTable bên Admin.
- Nút "Thêm món" hiện không có onClick: cho mở Drawer nhập tên, danh mục, 
  giá, và chọn chi nhánh nào có món này. Lưu vào state thật.

A3. Màn mới: Tài khoản quản lý (thay placeholder)
File: src/roles/owner/ManagerAccounts.tsx
Bảng tài khoản Branch Manager, cột: tên, email, chi nhánh được gán, 
trạng thái (đang hoạt động / đã khoá).
Hành động: Thêm tài khoản (Drawer: tên, email, chọn chi nhánh), 
Đổi chi nhánh, Khoá / Mở khoá. Tất cả đổi state thật.
Nghiệp vụ: MỘT chi nhánh được có NHIỀU tài khoản Branch Manager — 
vì cần trực ca, không phải một người làm cả ngày. Seed cho chi nhánh 
Quận 1 có 2 tài khoản để thấy rõ điều này.
Thêm type BranchManagerAccount vào data.ts.

A4. Thanh toán (PaymentConfig) — giữ nguyên, chỉ thêm một dòng chú thích 
dưới tiêu đề: tài khoản này áp dụng cho toàn bộ chi nhánh của chuỗi.

────────────────────────────────────
B. BRANCH MANAGER — sửa và thêm
────────────────────────────────────

B1. Tổng quan (Kpis + RevenueChart của branch/)
Lọc theo currentBranchId. Stat card: doanh thu hôm nay của chi nhánh, 
số bàn đang phục vụ trên tổng số bàn, số món đang chờ bếp, món bán chạy 
của chi nhánh. RevenueChart giữ nguyên dạng cột theo giờ (đúng cho 
cấp chi nhánh), chỉ lọc dữ liệu theo chi nhánh.
Bỏ chỉ số "thời gian chờ trung bình" nếu còn — nhóm đã loại bỏ việc 
mô hình hoá thời gian chế biến.

B2. Màn mới: Món tại chi nhánh (thay placeholder)
File: src/roles/branch/BranchMenu.tsx
Bảng các món CÓ MẶT tại chi nhánh này (đọc BranchMenuItem), cột: 
tên món, danh mục, giá (CHỈ ĐỌC, hiện dạng chữ xám để thấy rõ là 
không sửa được), toggle còn bán hôm nay, số suất còn lại.
Hành động: toggle available, sửa remaining, nút "Không giới hạn" 
đặt remaining=null. Tất cả đổi state thật.
Món có activeChain=false: hiện mờ, toggle bị khoá, kèm ghi chú ngắn 
là món đã bị chuỗi tắt. Đây là quy tắc Owner tắt thì chi nhánh không 
bật lại được.
Món hết suất (remaining=0): hiện badge cảnh báo.

B3. Nhân viên (StaffTable)
Lọc theo currentBranchId. Bỏ giá trị "Cashier" khỏi type StaffRole, 
chỉ còn "Manager" | "Waiter" | "Kitchen".
Nút "Thêm nhân viên" và "Phân quyền" hiện chỉ toast: cho Thêm nhân viên 
mở Drawer (tên, vai trò Waiter hoặc Kitchen, email) và lưu state thật. 
Bỏ nút "Phân quyền" — vai trò đã quyết lúc tạo, không đổi giữa chừng.
Đổi cột "ca làm" thành nút Check-in / Check-out do Branch Manager bấm 
cho nhân viên. Ghi chú ngắn ở đầu bảng: check-in để hệ thống biết ai 
đang có mặt mà bắn thông báo, không phải để chấm công.

B4. Thanh toán (TxList + TxDetail)
Lọc theo currentBranchId. Đổi tiêu đề mục nav từ "Ngoại lệ thanh toán" 
thành "Thanh toán" — đây là việc chính của quầy, không phải ngoại lệ.
Đổi nội dung màn thành danh sách BÀN ĐANG CÓ KHÁCH kèm tổng tiền tạm 
tính (đọc TableSession status="open" + calcSessionTotal), click một bàn 
mở panel bên phải:
- Chi tiết hoá đơn phiên: gộp TOÀN BỘ order của phiên kể cả các lần 
  gọi thêm, liệt kê từng dòng món kèm đơn giá và thành tiền
- Hai nút: "Sinh mã QR" và "Nhận tiền mặt"
- Sau khi xác nhận: nút "Xác nhận thanh toán & in hoá đơn" → 
  TableSession.status chuyển "paid"
Nghiệp vụ: CHỈ Branch Manager xác nhận được thanh toán. Waiter chỉ 
mang QR ra bàn hoặc thu tiền mặt hộ, và hệ thống ghi tên người thu hộ.
Giữ lại phần đối soát tay cho giao dịch lỗi, gom vào một tab phụ 
trong cùng màn.

B5. Lịch sử giao dịch — giữ nguyên, chỉ lọc theo currentBranchId.

B6. Sơ đồ bàn (FloorPlan) — CHƯA sửa ở bước này, để nguyên. 
Phần tương tác và khai báo bàn liền kề làm ở bước 5.

────────────────────────────────────
KHÔNG LÀM Ở BƯỚC NÀY
────────────────────────────────────
- Không đụng vào Waiter (vẫn placeholder)
- Không đụng Kitchen
- Không làm sơ đồ bàn tương tác
- Không làm thuật toán xếp bàn
- Không làm AI quét menu
- Không đổi màu, font, spacing

Làm xong báo tôi: các file mới tạo, màn nào đã đổi phạm vi dữ liệu 
từ chi nhánh sang chuỗi hoặc ngược lại, và những chỗ anh phải tự quyết.