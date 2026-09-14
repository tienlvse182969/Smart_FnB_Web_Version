Bước 5: sơ đồ bàn tương tác + thuật toán xếp và ghép bàn.

RÀNG BUỘC (giữ nguyên): không đổi màu, font, spacing, style component, 
bố cục. Tái sử dụng component sẵn có.

────────────────────────────────────
0. VÁ LỖI Ở BƯỚC 4 TRƯỚC
────────────────────────────────────
getTableState hiện chỉ coi phiên status="open" là "đang phục vụ". Sai: 
khách đã trả tiền nhưng waiter chưa đóng bàn thì khách VẪN ĐANG NGỒI ĐÓ, 
mà sơ đồ lại hiện bàn trống — waiter khác có thể xếp nhóm mới vào.

Sửa: coi cả "open" và "paid" là đang phục vụ. Chỉ "closed" và "cancelled" 
mới trả bàn về trống. Bàn ở trạng thái paid hiện badge riêng 
"Đã thanh toán · chờ đóng bàn", dùng màu khác với bàn đang ăn.

────────────────────────────────────
1. KHAI BÁO BÀN LIỀN KỀ (Branch Manager)
────────────────────────────────────
File: sửa src/roles/branch/FloorPlan.tsx

Đây là màn CHẾ ĐỘ QUẢN TRỊ — việc làm NGOÀI CA, không phải trong ca.
Thêm Segmented 2 chế độ ở đầu màn: "Xem" (mặc định, như hiện tại) và 
"Thiết kế".

Chế độ Thiết kế:
  - Bấm một bàn → bàn được chọn, tô viền nổi bật
  - Các bàn CÙNG KHU VỰC hiện checkbox "liền kề với bàn này"
  - Bàn khác khu vực hiện mờ, không chọn được, kèm chú thích ngắn là 
    không ghép được vì khác khu vực
  - Tick/bỏ tick → cập nhật adjacentTableIds CẢ HAI CHIỀU (A liền kề B 
    thì B cũng liền kề A). Đây là quan hệ đối xứng, đừng để lệch.
  - Vẽ đường nối mảnh giữa các cặp bàn đã khai báo, để nhìn ra cụm nào 
    ghép được với cụm nào
  - Nút "Thêm bàn": nhập số bàn, số ghế, chọn khu vực
  - Nút "Ngưng sử dụng / Mở lại" cho bàn hỏng (state="locked")

GHI CHÚ NGHIỆP VỤ hiện ở đầu chế độ Thiết kế (viết ngắn gọn):
Quan hệ liền kề phải khai báo tay, hệ thống KHÔNG tự suy ra từ vị trí 
trên sơ đồ — vì hai bàn nhìn gần nhau nhưng cách một lối đi thì thực tế 
không ghép được. Đây là dữ liệu bắt buộc cho tính năng gợi ý ghép bàn.

────────────────────────────────────
2. THUẬT TOÁN XẾP VÀ GHÉP BÀN
────────────────────────────────────
File mới: src/logic/tableArrangement.ts

Đây là PHẦN THUẬT TOÁN CỦA ĐỒ ÁN, viết cho rõ ràng và có chú thích 
tiếng Việt từng bước, vì sẽ đưa vào báo cáo.

Hàm chính:
  suggestArrangements(branchId, guestCount, sessions, tables): Suggestion[]

  type Suggestion = {
    tableIds: string[]
    totalSeats: number
    wastedSeats: number      // totalSeats - guestCount
    tableCount: number
    score: number
    label: string            // ví dụ "Bàn A1" hoặc "Ghép A1 + A2"
  }

RÀNG BUỘC BẮT BUỘC (phương án vi phạm thì loại, không phải trừ điểm):
  a) Tổng số ghế của khối >= số khách
  b) Nếu dùng nhiều hơn 1 bàn, các bàn phải LIỀN KỀ NHAU THÀNH MỘT KHỐI 
     LIÊN THÔNG. Không chấp nhận A liền B, C liền D mà B không liền C.
  c) Mọi bàn trong khối phải CÙNG KHU VỰC
  d) Không dùng bàn đang có khách (getTableState = serving), bàn locked, 
     hoặc bàn reserved

TIÊU CHÍ XẾP HẠNG, theo thứ tự ưu tiên:
  1. ÍT GHẾ THỪA NHẤT — 8 khách vào 8 ghế tốt hơn vào 12 ghế
  2. ÍT BÀN NHẤT — ghép 2 bàn tốt hơn ghép 3
  3. BẢO TOÀN BÀN LỚN — đừng xếp nhóm 3 người vào bàn 8 ghế khi còn 
     bàn 4 ghế trống

Tiêu chí 3 quan trọng hơn vẻ ngoài của nó: xếp nhóm nhỏ vào bàn lớn thì 
lát nữa nhóm đông tới sẽ không còn chỗ. Đây chính là chỗ thuật toán 
thắng con người — nó nhìn được cả sơ đồ cùng lúc.

CÁCH GIẢI (sơ đồ thực tế chỉ 10–30 bàn, không cần thuật toán tinh vi):
  1. Lọc ra các bàn khả dụng
  2. Dựng đồ thị liền kề trong từng khu vực
  3. Duyệt các khối bàn liên thông, CẮT TỈA NGAY khi tổng ghế đã đủ — 
     không mở rộng khối thêm nữa (đây là bước quan trọng, tránh nổ tổ hợp)
  4. Chấm điểm mỗi phương án theo 3 tiêu chí trên
  5. Trả về TỐI ĐA 3 phương án tốt nhất

Nếu không tìm được phương án nào: trả mảng rỗng, kèm hàm phụ 
estimateNextAvailable(branchId, guestCount) ước tính khi nào có bàn, 
dựa trên thời gian các phiên hiện tại đã ngồi.

Viết luôn vài unit test nhỏ trong file (hoặc file test riêng) cho 3 ca: 
vừa đúng 1 bàn, phải ghép 2 bàn, và không đủ chỗ.

────────────────────────────────────
3. ÁP THUẬT TOÁN VÀO MÀN MỞ BÀN CỦA WAITER
────────────────────────────────────
File: sửa src/roles/waiter/TableMap.tsx

Thay phần "chọn tay bàn đủ chỗ" ở bước 4 bằng:

  - Waiter nhập số khách
  - Hiện TỐI ĐA 3 THẺ PHƯƠNG ÁN, mỗi thẻ: nhãn ("Bàn A1" / "Ghép A1 + A2"), 
    tổng ghế, số ghế thừa, khu vực
  - Hover hoặc chạm vào một thẻ → TÔ SÁNG các bàn tương ứng trên sơ đồ
  - Bấm "Chọn phương án này" → mở phiên với tableIds tương ứng
  - Vẫn giữ đường "Chọn bàn thủ công" cho waiter tự quyết

NGUYÊN TẮC: hệ thống CHỈ GỢI Ý, waiter là người quyết định cuối cùng. 
Waiter biết những thứ hệ thống không biết — bàn cạnh nhà vệ sinh, khách 
có trẻ nhỏ, nhóm ồn ào. Đừng làm tự động chọn.

Trường hợp không đủ chỗ: hiện thông báo rõ ràng kèm ước tính giờ có bàn.

────────────────────────────────────
4. HIỂN THỊ BÀN GHÉP
────────────────────────────────────
Phiên có nhiều tableIds phải hiện đúng ở mọi nơi:
  - Sơ đồ bàn: các bàn cùng phiên vẽ viền nối liền hoặc cùng màu nhấn, 
    nhìn ra là một khối
  - Nhãn bàn trong order, hàng đợi bếp, hoá đơn: hiện "A1+A2" thay vì 
    chỉ một bàn
  - Đóng bàn: trả TẤT CẢ bàn trong phiên về trống cùng lúc

Seed thêm 1 phiên đang mở dùng 2 bàn ghép, để nhìn thấy ngay.

────────────────────────────────────
KHÔNG LÀM Ở BƯỚC NÀY
────────────────────────────────────
- Không làm AI quét menu (bước 6)
- Không đụng Owner, Admin, Kitchen
- Không làm đặt bàn trước
- Không đổi màu, font, spacing

Làm xong báo tôi: thuật toán chạy ra kết quả gì với 4 / 9 / 20 khách 
trên sơ đồ hiện tại, cách anh cài tiêu chí "bảo toàn bàn lớn", và chỗ 
nào anh phải tự quyết.