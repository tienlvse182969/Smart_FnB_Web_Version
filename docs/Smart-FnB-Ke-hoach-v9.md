Smart F&B Chain Platform

Kế hoạch dự án và chuẩn bị bảo vệ — đi kèm Đặc tả 9.0

**Mã đề tài:** SP26SE123

**Giảng viên hướng dẫn:** Tôn Thất Hoàng Minh

**Quy mô nhóm:** 4 sinh viên (2 Frontend, 2 Backend) — 11 tuần thực thi

**Phạm vi sử dụng:** tài liệu nội bộ của nhóm, không gửi hội đồng. Số mục ghi trong ngoặc như (11.10), mã BR-xx và mã use case trỏ tới tài liệu Đặc tả; mục của chính tài liệu này ghi rõ là "tài liệu này".

## Mục lục

1\. Lịch sử thay đổi

2\. Lịch 11 tuần

3\. Ước lượng khối lượng

4\. Rủi ro

5\. Điểm chưa chốt

6\. Việc phải làm ngay

7\. Câu hỏi hội đồng dễ hỏi

## 1\. Lịch sử thay đổi

### 1.1. Thay đổi so với bản 7.0

Hội đồng nhận xét phạm vi v7 quá rộng. Bản 8.0 đổi loại hình cửa hàng và cắt những phần không còn cần trong loại hình mới. Bảng dưới là tóm tắt để cả nhóm biết phần nào đã làm theo v7 còn dùng được.

| **Hạng mục**              | **Bản 7.0**                                            | **Bản 8.0**                                                                               |
| ------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Loại hình                 | Nhà hàng phục vụ tại bàn, ăn xong mới trả tiền         | Chuỗi gọi món và trả tiền tại quầy, trả trước rồi mới pha                                 |
| ---                       | ---                                                    | ---                                                                                       |
| Actor vận hành            | Branch Manager kiêm thu ngân, Waiter, Kitchen Staff    | Branch Manager, Cashier (thu ngân), Barista (pha chế)                                     |
| ---                       | ---                                                    | ---                                                                                       |
| Bàn                       | Sơ đồ bàn, phiên bàn, xếp và ghép bàn                  | Bỏ. Khách ngồi đâu cũng được, nhận món theo số gọi                                        |
| ---                       | ---                                                    | ---                                                                                       |
| Thuật toán                | Xếp và ghép bàn                                        | Gom món trong hàng đợi pha chế (mục 8)                                                    |
| ---                       | ---                                                    | ---                                                                                       |
| Tiền                      | Nền tảng thu hộ, tạm giữ, quyết toán vào ví, Owner rút | Tiền QR đi thẳng vào tài khoản ngân hàng của chủ chuỗi qua PayOS. Nền tảng không giữ tiền |
| ---                       | ---                                                    | ---                                                                                       |
| Doanh thu nền tảng        | Phí thuê bao + phí giao dịch QR                        | Chỉ phí thuê bao theo gói                                                                 |
| ---                       | ---                                                    | ---                                                                                       |
| Menu                      | Món và giá                                             | Món và giá + tuỳ chọn món (size, đường, đá, topping) có giá cộng thêm                     |
| ---                       | ---                                                    | ---                                                                                       |
| Gói dịch vụ               | Hạn mức chi nhánh, tài khoản, bàn                      | Ba gói Cơ bản / Tiêu chuẩn / Nâng cao, khác nhau về hạn mức và tính năng                  |
| ---                       | ---                                                    | ---                                                                                       |
| Ca làm, check-in          | Có                                                     | Bỏ                                                                                        |
| ---                       | ---                                                    | ---                                                                                       |
| AI                        | Trợ lý số liệu + nhập menu bằng ảnh                    | Chỉ trợ lý số liệu, thuộc gói Nâng cao                                                    |
| ---                       | ---                                                    | ---                                                                                       |
| Nhận diện thương hiệu     | Mọi doanh nghiệp                                       | Từ gói Tiêu chuẩn trở lên                                                                 |
| ---                       | ---                                                    | ---                                                                                       |
| Số use case               | 60 (46 giai đoạn 1 + 14 giai đoạn 2)                   | 32, không chia giai đoạn                                                                  |
| ---                       | ---                                                    | ---                                                                                       |
| Mã use case và mã quy tắc | —                                                      | Cấp lại từ đầu. Không đối chiếu với mã của v7                                             |
| ---                       | ---                                                    | ---                                                                                       |

### 1.2. Thay đổi trong bản 8.1

- Thu ngân dùng **hai máy tính bảng Android**: máy phía trước để thu ngân order, máy phía sau quay về phía khách để hiện đơn và mã QR. Bản 8.0 ghi POS chạy trên web
- Thêm thực thể **Quầy** và cơ chế **ghép màn hình phía khách bằng mã**; màn hình khách dùng token thiết bị, không cần tài khoản người dùng (11.10)
- Chốt cách đồng bộ hai máy: chuyển tiếp qua backend bằng Socket.IO theo room của quầy, gửi toàn bộ giỏ kèm số phiên bản (11.11)
- BM-01 mở rộng thành quản lý tài khoản thu ngân, pha chế và quầy; thêm BR-45 đến BR-47; chốt CC-07

Phần làm theo v7 vẫn dùng lại được: xác thực, multi-tenant và cô lập dữ liệu, luồng đăng ký và duyệt hồ sơ, quản lý chi nhánh, danh mục và món, tài khoản phân cấp, bộ nhận diện thương hiệu, trợ lý AI. Phần bỏ hẳn: sơ đồ bàn, phiên bàn, thuật toán xếp bàn, ca làm, ví, sổ cái, quyết toán, rút tiền, nhập menu bằng ảnh, đặt bàn.

### 1.3. Thay đổi trong bản 9.0

- **In bill:** bỏ in qua trình duyệt. POS gửi lệnh ESC/POS tới máy in nhiệt của quầy; backend dựng bill thành ảnh để in đúng tiếng Việt và logo chuỗi; in lỗi không chặn bán hàng (CS-04, BR-21, GĐ-15). Máy in Bluetooth hay WiFi chưa chốt (CC-11)
- **Đồng bộ hai màn hình:** số phiên bản giỏ do server cấp thay vì POS tự đếm; thêm BR-48 kiểm tra người gửi giỏ (11.11)
- **Thanh toán và huỷ đơn:** làm rõ xử lý số tiền lệch, nút Kiểm tra lại, webhook về sau xác nhận thủ công, huỷ món đã pha, trạng thái hoàn tiền và ngày trừ doanh thu (BR-28, BR-29, BR-49, BR-50, 6.5)
- **Thêm mục 18 đặc tả — Yêu cầu phi chức năng** với chỉ tiêu đo được
- **Lịch 11 tuần chia lại theo nền tảng:** FE-W làm toàn bộ web, FE-M làm toàn bộ app Android; màn hình gọi số làm bằng web chạy trên TV; lịch gắn với tuần học kỳ và các mốc review (mục 2, tài liệu này)
- **Chưa đổi trong bản này:** thu phí thuê bao qua hệ thống và lựa chọn PayOS hay Tingee, chờ chốt với giảng viên hướng dẫn (CC-12)

### 1.4. Vì sao bỏ ví doanh nghiệp của v7

Use case diagram của nhóm đã có sẵn "PayOS Payment Information", và PayOS cho mỗi chủ quán nhận tiền về tài khoản của chính họ. Đổi sang mô hình này có hệ quả lớn:

- Nền tảng không còn phí giao dịch; doanh thu nền tảng chỉ còn phí thuê bao
- Bỏ được toàn bộ sổ cái, tạm giữ, quyết toán, rút tiền — khoảng hai tuần người ở v7
- Bỏ được câu hỏi pháp lý về trung gian thanh toán: nền tảng không giữ tiền của ai
- Chủ chuỗi nhận tiền ngay, không chờ quyết toán

Cái mất đi: không còn khoảng đệm để hoàn tiền qua hệ thống. Hoàn tiền trở thành việc của quán, hệ thống chỉ ghi nhận (BR-23).

## 2\. Lịch 11 tuần

**Phân vai.** BE1 — tenant, tài khoản, gói, menu, đơn hàng, thanh toán, in. BE2 — Socket.IO, quầy và ghép màn hình, pha chế, thuật toán gom món, báo cáo, trợ lý AI. FE-W — toàn bộ web: Admin, Owner, Manager và màn hình gọi số. FE-M — toàn bộ app Android: POS, màn hình phía khách, pha chế. Mỗi FE chỉ làm một nền tảng để không phải chuyển qua lại giữa hai codebase.

| Tuần (tuần học kỳ) | Việc                                                                                                                                         | Ai               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1 (HK 4)           | Dựng khung, ERD, xác thực, RBAC, hợp đồng API, quy ước token màu cho web và mobile; kiểm tra môi trường test PayOS; mua máy in nhiệt ESC/POS | Cả nhóm          |
| ---                | ---                                                                                                                                          | ---              |
| 2 (HK 5)           | Multi-tenant, đăng ký và duyệt hồ sơ, Platform Admin, gói và lớp kiểm tra hạn mức                                                            | BE1 + FE-W       |
| ---                | ---                                                                                                                                          | ---              |
| 2 (HK 5)           | Tài khoản phân cấp: Owner tạo Manager, Manager tạo thu ngân và pha chế; khung Socket.IO và room                                              | BE2              |
| ---                | ---                                                                                                                                          | ---              |
| 2 (HK 5)           | Khung app Android ba chế độ (POS, màn hình khách, pha chế), đăng nhập, token màu; thử in ESC/POS từ tablet                                   | FE-M             |
| ---                | ---                                                                                                                                          | ---              |
| 3 (HK 6)           | Chi nhánh, danh mục, món, tuỳ chọn món, gán món cho chi nhánh                                                                                | BE1 + FE-W       |
| ---                | ---                                                                                                                                          | ---              |
| 3 (HK 6)           | Bật/tắt món và tuỳ chọn hai cấp; API nhận diện thương hiệu (OW-07)                                                                           | BE2              |
| ---                | ---                                                                                                                                          | ---              |
| 3 (HK 6)           | POS: giỏ món có tuỳ chọn trên dữ liệu thật                                                                                                   | FE-M             |
| ---                | ---                                                                                                                                          | ---              |
| 4 (HK 7)           | Chốt đơn, chụp giá lúc bán, thu tiền mặt, số gọi; dựng bill thành ảnh ESC/POS                                                                | BE1 + FE-M       |
| ---                | ---                                                                                                                                          | ---              |
| 4 (HK 7)           | Quầy, mã ghép, token thiết bị, đồng bộ giỏ; màn hình Manager: tài khoản, quầy, máy in, bật/tắt món                                           | BE2 + FE-W       |
| ---                | ---                                                                                                                                          | ---              |
| 4–5 (HK 7–8)       | Tài liệu Review 2: ERD, Activity Diagram, cập nhật SRS (1–2 ngày)                                                                            | Một thành viên   |
| ---                | ---                                                                                                                                          | ---              |
| 5 (HK 8)           | Liên kết PayOS: mã hoá khoá, xác nhận webhook; màn hình Owner: liên kết PayOS, cấu hình nhận diện, xem gói                                   | BE1 + FE-W       |
| ---                | ---                                                                                                                                          | ---              |
| 5 (HK 8)           | Bộ view báo cáo; API hàng đợi pha chế                                                                                                        | BE2              |
| ---                | ---                                                                                                                                          | ---              |
| 5 (HK 8)           | Ghép và màn hình phía khách; in bill và phiếu số từ POS                                                                                      | FE-M             |
| ---                | ---                                                                                                                                          | ---              |
| 6 (HK 9)           | Thu QR qua PayOS: tạo, huỷ, hết hạn, webhook idempotent, Kiểm tra lại; luồng QR trên POS và màn hình khách                                   | BE1 + FE-M       |
| ---                | ---                                                                                                                                          | ---              |
| 6 (HK 9)           | Thuật toán gom món, cập nhật trạng thái món, gọi số                                                                                          | BE2              |
| ---                | ---                                                                                                                                          | ---              |
| 6 (HK 9)           | Tra cứu đơn cho Manager, báo cáo chi nhánh                                                                                                   | FE-W             |
| ---                | ---                                                                                                                                          | ---              |
| 7 (HK 10)          | Xác nhận thủ công, đơn Cần xử lý, huỷ đơn đã thanh toán, trạng thái hoàn; màn hình gọi số (web trên TV)                                      | BE1 + FE-W       |
| ---                | ---                                                                                                                                          | ---              |
| 7 (HK 10)          | Màn hình pha chế với gom món, báo hết món; lịch sử đơn và in lại trên POS                                                                    | BE2 + FE-M       |
| ---                | ---                                                                                                                                          | ---              |
| 7 (HK 10)          | Bản thử trợ lý AI trên dữ liệu seed                                                                                                          | BE2              |
| ---                | ---                                                                                                                                          | ---              |
| 8 (HK 11)          | Chạy trọn luồng đầu cuối trên máy chủ thật, sửa lỗi tích hợp; test webhook trùng và đồng thời                                                | Cả nhóm          |
| ---                | ---                                                                                                                                          | ---              |
| 9 (HK 12)          | Báo cáo đa chi nhánh; hoàn thiện trợ lý AI và màn hình hỏi đáp; chỉ đọc khi hết hạn gói                                                      | BE1 + BE2 + FE-W |
| ---                | ---                                                                                                                                          | ---              |
| 9 (HK 12)          | Sửa lỗi POS và pha chế, tối ưu số lần chạm, kiểm thử trên nhiều tablet                                                                       | FE-M             |
| ---                | ---                                                                                                                                          | ---              |
| 10 (HK 13)         | Seed hai doanh nghiệp khác gói và khác nhận diện; test hạn mức, đa thiết bị; đo gom món, AI và các chỉ tiêu mục 18 đặc tả; tài liệu Review 3 | Cả nhóm          |
| ---                | ---                                                                                                                                          | ---              |
| 11 (HK 14)         | Tài liệu, tập demo, dự phòng                                                                                                                 | Cả nhóm          |
| ---                | ---                                                                                                                                          | ---              |

**Mốc sinh tử là hết tuần 8.** Nếu tuần 8 chưa chạy được trọn luồng từ tạo đơn có tuỳ chọn, thu QR qua PayOS thật, in bill và phiếu số, pha chế, tới gọi số, phải dồn toàn bộ tuần 9 vào luồng chính và cắt bớt báo cáo. Một luồng chạy mượt hoàn chỉnh luôn ăn điểm hơn tám tính năng làm dở.

**Lưu ý về PayOS:** kiểm tra môi trường test ở tuần 1 là bắt buộc. Nếu tới tuần 2 vẫn không có đường chạy QR thật, chuyển sang SePay hoặc Casso ngay, đừng chờ tới tuần 6.

**Lưu ý về AI:** bản thử dựng ở tuần 7 trên dữ liệu seed, ngay khi có bộ view (tuần 5); tuần 9 chỉ hoàn thiện trên dữ liệu thật từ luồng chính. Không dồn toàn bộ AI vào tuần 9.

**Lưu ý về nhận diện:** quy ước token ở tuần 1 là bắt buộc, màn hình cấu hình ở tuần 5 là nên. Nếu tuần 5 quá tải thì đẩy màn hình cấu hình sang tuần 9, nhưng quy ước token thì không được đẩy.

**Tuần học kỳ:** cột tuần ghi kèm tuần học kỳ dự kiến, tính từ tuần 4. Review 2 (ERD, AD) rơi vào tuần 4–5 của lịch; giảng viên hướng dẫn xem demo ở tuần 7 của lịch (tuần 10 học kỳ), lúc đó phải chạy được luồng tiền mặt và QR; Review 3 ở tuần 9–11 của lịch; hội đồng chính thức tuần 15 học kỳ. Nếu lịch học kỳ thực tế khác thì dời cả bảng.

## 3\. Ước lượng khối lượng

Ước lượng theo từng phần nghiệp vụ nặng, tính bằng ngày hoặc tuần người. Dùng để kiểm tra lịch ở mục 2 (tài liệu này) có khả thi không.

### 3.1. Thuật toán gom món (đặc tả mục 8)

Khoảng 3 ngày backend (thuật toán, test ràng buộc, đẩy realtime) và 3 ngày frontend cho màn hình pha chế theo mẻ.

### 3.2. Trợ lý AI hỏi đáp số liệu (đặc tả mục 9)

| **Phần việc**                                              | **Ước lượng** |
| ---------------------------------------------------------- | ------------- |
| Bộ view báo cáo và tài khoản chỉ đọc                       | ~2 ngày       |
| ---                                                        | ---           |
| Bộ kiểm tra truy vấn, gắn điều kiện doanh nghiệp, giới hạn | ~2–3 ngày     |
| ---                                                        | ---           |
| Giao diện hỏi đáp, bảng kết quả, lịch sử                   | ~2 ngày       |
| ---                                                        | ---           |
| Bộ câu hỏi mẫu và kiểm thử tấn công                        | ~1–2 ngày     |
| ---                                                        | ---           |

Tổng khoảng 1,5 tuần. Phần khó nằm ở an toàn dữ liệu chứ không nằm ở gọi mô hình.

### 3.3. Tuỳ biến nhận diện thương hiệu (đặc tả mục 10)

| **Phần việc**                                                   | **Ước lượng**                |
| --------------------------------------------------------------- | ---------------------------- |
| Backend: bảng, API đọc, API ghi, tải ảnh, kiểm tra quyền và gói | ~0,5 ngày                    |
| ---                                                             | ---                          |
| Frontend: quy ước token màu cho web và mobile                   | ~0,5 ngày, phải làm ở tuần 1 |
| ---                                                             | ---                          |
| Frontend: màn hình cấu hình, bộ màu dựng sẵn, xem trước         | ~1,5 ngày                    |
| ---                                                             | ---                          |
| Áp logo vào mẫu bill và phiếu số                                | ~0,5 ngày                    |
| ---                                                             | ---                          |

Tổng khoảng 2–3 ngày, rẻ so với giá trị thuyết trình. Nhưng chỉ rẻ nếu quy ước token có từ tuần 1. Để tới tuần 9 mới nghĩ tới theme thì cả nhóm phải đi dò từng màn hình gỡ mã màu cứng.

### 3.4. Thanh toán QR qua PayOS (đặc tả mục 11)

| **Phần việc**                                                  | **Ước lượng** |
| -------------------------------------------------------------- | ------------- |
| Liên kết PayOS: mã hoá khoá, xác nhận webhook, màn hình Owner  | ~2 ngày       |
| ---                                                            | ---           |
| Tạo QR, huỷ QR, hết hạn, tra cứu trạng thái                    | ~2 ngày       |
| ---                                                            | ---           |
| Webhook: chữ ký, đối chiếu, idempotent, transaction, Socket.IO | ~2 ngày       |
| ---                                                            | ---           |
| Xác nhận thủ công, đơn Cần xử lý, cảnh báo Manager             | ~1 ngày       |
| ---                                                            | ---           |
| POS và màn hình phía khách cho luồng QR                        | ~2 ngày       |
| ---                                                            | ---           |

Tổng khoảng 1,5 tuần người — ít hơn một nửa phần ví của v7.

### 3.5. Quầy, ghép và đồng bộ màn hình phía khách (đặc tả 11.10, 11.11)

Khoảng 1,5 ngày backend (quầy, mã ghép, token thiết bị, room, bộ nhớ giỏ) và 2 ngày frontend (chế độ màn hình khách, màn hình ghép trên POS, trạng thái kết nối).

### 3.6. Tuỳ chọn món (đặc tả mục 12)

Khoảng 2 ngày backend (bảng, API, kiểm tra quy tắc, chụp giá lúc bán) và 3 ngày frontend (màn hình quản lý của Owner, bảng chọn trên POS). Làm cùng tuần với menu, trước POS.

## 4\. Rủi ro

| **Rủi ro**                                                                                  | **Mức**    | **Cách xử lý**                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PayOS không có môi trường test hoặc nhóm không mở kịp kênh                                  | Cao        | Kiểm tra ngay tuần 1; chuẩn bị SePay hoặc Casso; nếu cần thì demo giao dịch thật số tiền nhỏ (CC-02)                                                                                     |
| ---                                                                                         | ---        | ---                                                                                                                                                                                      |
| Webhook không tới được máy phát triển                                                       | Cao        | Dùng đường hầm HTTPS khi phát triển; triển khai máy chủ thật trước tuần 8                                                                                                                |
| ---                                                                                         | ---        | ---                                                                                                                                                                                      |
| Webhook lỗi hoặc trễ ngày bảo vệ                                                            | Cao        | Nút Kiểm tra lại, xác nhận thủ công dự phòng, tập trước                                                                                                                                  |
| ---                                                                                         | ---        | ---                                                                                                                                                                                      |
| Lộ khoá PayOS của khách hàng                                                                | Cao        | Mã hoá khi lưu, khoá chủ ở biến môi trường, không trả về frontend, không ghi log, có test                                                                                                |
| ---                                                                                         | ---        | ---                                                                                                                                                                                      |
| Cô lập dữ liệu bị rò do quên điều kiện lọc                                                  | Cao        | Ép lọc ở tầng repository, không để từng câu truy vấn tự lo                                                                                                                               |
| ---                                                                                         | ---        | ---                                                                                                                                                                                      |
| Trợ lý AI sinh truy vấn lấy dữ liệu doanh nghiệp khác hoặc ghi dữ liệu                      | Cao        | Danh sách view cho phép, tài khoản chỉ đọc, backend tự gắn doanh nghiệp, bộ kiểm thử tấn công; không đạt thì chuyển sang mẫu truy vấn (CC-03)                                            |
| ---                                                                                         | ---        | ---                                                                                                                                                                                      |
| Màu cứng rải rác trong mã, tới tuần 9 mới làm theme                                         | Cao        | Chốt quy ước token màu ngay tuần 1 cho cả web và mobile                                                                                                                                  |
| ---                                                                                         | ---        | ---                                                                                                                                                                                      |
| Webhook trùng hoặc tới cùng lúc với xác nhận thủ công làm cấp hai số gọi, in hai bill       | Trung bình | Ràng buộc duy nhất, một hàm xác nhận chung có khoá dòng, test đồng thời                                                                                                                  |
| ---                                                                                         | ---        | ---                                                                                                                                                                                      |
| Tuỳ chọn món làm tính giá sai                                                               | Trung bình | Tính ở backend, test bảng giá với nhiều tổ hợp, chụp giá lúc bán                                                                                                                         |
| ---                                                                                         | ---        | ---                                                                                                                                                                                      |
| Hội đồng cho rằng gom món quá đơn giản để gọi là thuật toán                                 | Trung bình | Trình bày ràng buộc không vượt hàng và số đo ở 8.7; hỏi ý kiến giảng viên sớm (CC-05)                                                                                                    |
| ---                                                                                         | ---        | ---                                                                                                                                                                                      |
| Màu thương hiệu đè lên màu trạng thái, pha chế đọc sai                                      | Trung bình | Tách hai họ màu từ đầu (BR-42)                                                                                                                                                           |
| ---                                                                                         | ---        | ---                                                                                                                                                                                      |
| Màn hình phía khách trễ hoặc lệch so với POS                                                | Trung bình | Gửi cả giỏ kèm số phiên bản, station:sync khi vào lại, hiện trạng thái kết nối, dự phòng QR trên POS (11.11)                                                                             |
| ---                                                                                         | ---        | ---                                                                                                                                                                                      |
| Phần làm theo v7 bị bỏ phí                                                                  | Trung bình | Tái dùng xác thực, multi-tenant, onboarding, menu, nhận diện, AI; chỉ bỏ bàn, ví, ca làm                                                                                                 |
| ---                                                                                         | ---        | ---                                                                                                                                                                                      |
| Không đủ thiết bị demo                                                                      | Trung bình | Tối thiểu: 2 tablet Android cho quầy (POS + màn hình khách), 1 tablet pha chế, 1 TV hoặc máy có trình duyệt làm màn hình gọi số, 1 laptop Owner/Admin, 1 máy in nhiệt ESC/POS và giấy in |
| ---                                                                                         | ---        | ---                                                                                                                                                                                      |
| Máy in không in được tiếng Việt, mua nhầm máy không nhận ESC/POS, hoặc thư viện kết nối lỗi | Trung bình | Kiểm tra thông số ESC/POS trước khi mua; dựng bill thành ảnh; tách lớp kết nối máy in (PrinterTransport); thử in từ tablet ngay tuần có máy, không để tới tuần 8                         |
| ---                                                                                         | ---        | ---                                                                                                                                                                                      |
| Mạng không ổn định ngày bảo vệ                                                              | Trung bình | Phát wifi từ điện thoại, seed sẵn dữ liệu                                                                                                                                                |
| ---                                                                                         | ---        | ---                                                                                                                                                                                      |

## 5\. Điểm chưa chốt

Ghi ra để không quên, không phải để lơ lửng tới tuần 8.

**CC-01 — Số liệu gói.** Hạn mức chi nhánh, tài khoản và giá tháng của ba gói ở 13.1 là ví dụ. Nhóm và thầy chốt con số cụ thể; đây là cấu hình của Admin nên đổi được mà không sửa mã.

**CC-02 — PayOS khi demo.** PayOS có môi trường test không? Nếu không, kênh PayOS dùng để demo đứng tên thành viên nào, và giới hạn số tiền mỗi giao dịch demo bao nhiêu.

**CC-03 — Trợ lý AI dùng truy vấn tự do hay mẫu truy vấn.** Đề xuất: truy vấn tự do trên danh sách view cho phép, có bốn lớp chặn (9.5). Nếu bộ kiểm thử tấn công không đạt 100% trước tuần 9, chuyển sang mẫu truy vấn có tham số.

**CC-04 — Trang đăng nhập có mang nhận diện riêng không.** Muốn được thì cần đường dẫn riêng cho từng doanh nghiệp. Đề xuất không làm; trang đăng nhập giữ nhận diện nền tảng.

**CC-05 — Gom món có đủ tính là phần thuật toán không.** Cần hỏi giảng viên hướng dẫn sớm. Nếu chưa đủ, hướng mở rộng tự nhiên là ước lượng thời gian chờ từ dữ liệu lịch sử của chính chi nhánh (thời gian từ lúc thanh toán tới lúc gọi số, đo được) để hiện giờ nhận món dự kiến trên phiếu số.

**CC-06 — Gọi số theo đơn hay theo từng món.** Scope ghi "món xong thì gọi số". Bản này chốt gọi theo đơn — khi mọi món của đơn đã xong — để khách không phải lên quầy nhiều lần. Nếu nhóm muốn gọi từng món thì sửa BR-33.

**CC-07 — Màn hình phía khách ghép với POS thế nào.** Đã chốt ở bản 8.1: hai tablet Android, ghép bằng mã do màn hình khách sinh, đồng bộ qua Socket.IO (11.10, 11.11). Còn mở: có cần một quầy nhiều màn hình khách không — đề xuất không.

**CC-08 — Branch Manager có đứng quầy không.** Scope không giao POS cho Manager. Bản này chốt Manager không thao tác POS; nếu chi nhánh cần Manager đứng quầy thì vẽ Branch Manager kế thừa Cashier trên Use Case Diagram.

**CC-09 — Thời hạn QR, cửa sổ gom, trần mẻ, thời gian tự hoàn tất.** Đề xuất lần lượt 10 phút, 5 phút, 4 ly, 30 phút; đều là cấu hình.

**CC-10 — Đối chiếu danh sách use case với bản Scope.** Bảng phạm vi trong bản Scope bị cắt chữ ở hàng Owner và chỉ liệt kê năm use case cho Branch Manager trong khi ghi sáu. Bản này suy ra: Owner có thêm báo cáo đa chi nhánh (OW-08) và trợ lý AI (OW-09) theo phần phân cấp tính năng; Branch Manager có thêm huỷ đơn đã thanh toán (BM-06) theo câu "sau khi trả thì chỉ Manager được huỷ, kèm lý do". Nhóm cần xác nhận lại với người viết Scope.

**CC-11 — Máy in Bluetooth hay WiFi.** Cả hai đều in bằng ESC/POS và dùng chung phần dựng bill; chỉ khác lớp kết nối (PrinterTransport). Bluetooth rẻ hơn và không phụ thuộc mạng ngày demo; WiFi dễ code và ổn định hơn. Phương án an toàn là mua máy có cả hai. Chốt trước tuần 2 để kịp thử in từ tablet.

**CC-12 — Thu phí gói qua hệ thống, và PayOS hay Tingee.** Sau Review 1, giảng viên hướng dẫn góp ý tập trung ba trọng tâm: cửa hàng tạo menu, thu phí gói của Owner, luồng tiền; và gợi ý dùng Tingee sandbox. Bản này vẫn thu phí thuê bao ngoài hệ thống và dùng PayOS. Cần chốt với giảng viên trước Review 2. Nếu thu phí gói qua hệ thống thì thêm use case Owner thanh toán gia hạn gói (33 use case), dùng lại hạ tầng tạo QR và webhook, và sửa 6.8, 13.2, 14.2, BR-10, GĐ-10, 7.4.

## 6\. Việc phải làm ngay

1. Thay toàn bộ tài liệu cũ bằng bản này. Không để bản v7 lưu hành song song
2. Sửa file đăng ký đề tài: loại hình chuỗi gọi món và trả tiền tại quầy; thanh toán QR qua PayOS về thẳng tài khoản chủ chuỗi, nền tảng không giữ tiền; thuật toán là gom món trong hàng đợi pha chế; AI là trợ lý hỏi đáp số liệu; có gói dịch vụ, tuỳ chọn món và tuỳ biến nhận diện
3. Kiểm tra môi trường test của PayOS ngay trong tuần này (CC-02)
4. Vẽ lại Use Case Diagram theo mục 14 và quy ước 14.3 — sáu sơ đồ, actor mới Cashier và Barista, bỏ Waiter và Kitchen Staff
5. Vẽ Activity/Swimlane Diagram cho các luồng: tại quầy (6.2), thu QR qua PayOS (6.3), onboarding (6.1), huỷ đơn đã thanh toán (6.5)
6. Thiết kế lại ERD: bỏ bàn, bàn liền kề, phiên bàn, đặt bàn, ca, lượt làm việc, sổ cái, đợt quyết toán, yêu cầu rút; thêm nhóm tuỳ chọn, tuỳ chọn, tuỳ chọn của dòng món có giá lúc bán, gói và lịch sử thuê bao, kênh PayOS với khoá mã hoá, thanh toán, webhook có ràng buộc duy nhất, số gọi duy nhất theo chi nhánh và ngày, quầy kèm cấu hình máy in, thiết bị đã ghép (token), mã ghép; giữ bảng nhận diện một–một với doanh nghiệp, bộ view báo cáo và lịch sử hỏi đáp của trợ lý
7. Chuyển ứng dụng Android đang làm cho Waiter sang ba chế độ: POS thu ngân, màn hình phía khách và màn hình pha chế; tái dùng phần menu và order entry cho POS; bỏ các màn sơ đồ bàn, mở bàn, chuyển bàn
8. Chốt quy ước token màu ngay tuần 1 cho cả web và mobile — tách rõ màu thương hiệu và màu ngữ nghĩa, cấm mã màu cứng trong mã nguồn
9. Mua máy in nhiệt hỗ trợ ESC/POS (kiểm tra thông số, tránh máy in nhãn) và thử in tiếng Việt từ tablet ngay khi có máy
10. Chốt các điểm ở mục 5 (tài liệu này) trước tuần 2, đặc biệt CC-05, CC-10, CC-11 và CC-12

## 7\. Câu hỏi hội đồng dễ hỏi

### 7.1. "Sao lại đổi sang trả trước tại quầy?"

Vì bốn bài toán hội đồng nêu ở v7 — quản lý bàn, khách huỷ món, tách bill, khách không trả tiền — đều biến mất khi đổi quy trình chứ không cần thêm tính năng. Khách ngồi đâu cũng được và nhận món theo số; trước khi trả thì sửa thoải mái, sau khi trả chỉ Manager được huỷ kèm lý do; mỗi người tự gọi và tự trả; chưa trả thì chưa pha nên không có thiệt hại. Loại hình này cũng là loại hình phổ biến nhất ở các chuỗi 2–10 chi nhánh: cà phê, trà sữa, đồ uống mang đi.

### 7.2. "Làm sao cửa hàng biết khách đã chuyển khoản?"

Cửa hàng không nhìn màn hình của khách. Mỗi đơn có một QR riêng tạo qua PayOS với mã đơn và số tiền. Khi tiền vào, PayOS gửi webhook có chữ ký về hệ thống; hệ thống kiểm chữ ký bằng khoá của đúng doanh nghiệp, đối chiếu mã đơn và số tiền, rồi báo lên POS "Đã nhận 45.000đ" kèm âm thanh. Webhook chậm thì có nút Kiểm tra lại; webhook không về thì chỉ Manager được xác nhận thủ công và phải ghi lý do.

### 7.3. "Sao không dùng mã QR tĩnh dán ở quầy cho đơn giản?"

QR tĩnh không biết tiền đó của đơn nào, số tiền do khách tự gõ, và thu ngân vẫn phải nhìn màn hình của khách hoặc mở app ngân hàng dò — đúng vấn đề cần giải. QR động theo đơn mang sẵn mã đơn và số tiền, nên hệ thống tự đối chiếu được.

### 7.4. "Nền tảng có giữ tiền của quán không? Thu phí bằng cách nào?"

Không giữ. Tiền QR đi thẳng từ khách qua PayOS vào tài khoản ngân hàng của chủ chuỗi; tiền mặt nằm trong két. Nền tảng chỉ nhận tín hiệu để đổi trạng thái đơn. Doanh thu nền tảng là phí thuê bao theo gói. Nhờ vậy nhóm bỏ được toàn bộ phần sổ cái, quyết toán, rút tiền và câu hỏi pháp lý về trung gian thanh toán của v7.

### 7.5. "Phần thuật toán ở đâu?"

Gom món trong hàng đợi pha chế, mục 8. Bài toán có đầu vào đo được chính xác (món, size, tuỳ chọn, thời điểm thanh toán), có ràng buộc rõ (không làm ly chờ lâu nhất chờ thêm, cửa sổ gom, trần số ly một mẻ), và có số đo không phụ thuộc số bịa (số mẻ, độ lệch thứ tự lớn nhất). Nhóm đã cân nhắc và loại bài toán xếp lịch pha chế theo thời gian vì thời gian pha không đo được.

### 7.6. "Multi-tenant thể hiện ở đâu?"

Demo nộp hồ sơ, Admin duyệt và chọn gói, tài khoản Owner sinh ra ngay tại chỗ. Đăng nhập bằng tài khoản đó, cho thấy không gian dữ liệu trống trơn và không thấy gì của doanh nghiệp còn lại.

Và có ba cách nhìn thấy được bằng mắt: hai doanh nghiệp seed sẵn mang hai bộ nhận diện khác nhau; hai doanh nghiệp dùng hai gói khác nhau — một bên có trợ lý AI, một bên thấy mục đó bị khoá; và mỗi bên thu QR về kênh PayOS của riêng mình.

### 7.7. "AI ở đâu, và làm sao biết nó đúng?"

Trợ lý hỏi đáp số liệu cho Owner, mục 9. Nó kiểm chứng được: mỗi câu trả lời đi kèm bảng số, khoảng thời gian đã hiểu và truy vấn đã chạy, đối chiếu được với báo cáo. Nhóm đo trên bộ 30 câu hỏi có đáp án tính sẵn và công bố tỷ lệ trả lời đúng.

### 7.8. "Sao không dùng AI phân tích doanh thu, gợi ý chiến lược?"

Nhóm đã cân nhắc và loại bỏ. Gợi ý chiến lược không có đáp án đúng để đối chiếu nên không đo được chất lượng, và phân tích trên dữ liệu seed chỉ ra kết luận không kiểm chứng được. Trợ lý của nhóm chỉ trả lời câu hỏi có đáp án đo được — nó không khuyên, nó tra.

### 7.9. "AI tự viết truy vấn, lỡ nó xoá dữ liệu hoặc lấy dữ liệu quán khác thì sao?"

Có bốn lớp chặn. Backend chỉ chấp nhận một truy vấn đọc trên các view được phép. Backend tự gắn điều kiện doanh nghiệp của người hỏi, bỏ qua mọi điều kiện mô hình tự viết. Truy vấn chạy bằng tài khoản cơ sở dữ liệu chỉ có quyền đọc các view đó — kể cả khi bước kiểm tra có lỗ hổng thì lệnh ghi cũng bị cơ sở dữ liệu từ chối. Và nhóm có bộ kiểm thử tấn công với yêu cầu chặn 100%.

### 7.10. "Khoá PayOS của khách hàng lưu thế nào, lộ thì sao?"

Khoá được mã hoá trước khi lưu, bằng khoá chủ đặt ở biến môi trường máy chủ chứ không trong cơ sở dữ liệu; lộ bản sao cơ sở dữ liệu cũng không đọc được. Sau khi lưu, khoá không bao giờ trả về frontend và không ghi vào log; chỉ Owner lưu hay đổi được. Platform Admin cũng không xem được. Nếu nghi lộ, Owner tạo khoá mới trên PayOS và nhập lại.

### 7.11. "Đổi logo với đổi màu thì có gì đáng gọi là tính năng? Sao không cho sửa CSS?"

Về nghiệp vụ: màn hình phía khách và màn hình gọi số là hai thứ khách nhìn thấy, bill và phiếu số là thứ khách cầm về. Về kỹ thuật: phải tách màu thương hiệu khỏi màu ngữ nghĩa để màn hình pha chế không đọc sai trạng thái, phải kiểm tra tương phản, phải nạp theo tenant trước khi render, phải chặn ở backend theo vai trò và theo gói. Còn mở tới CSS thì mỗi ô cấu hình tự do là một cách khách hàng tự làm hỏng giao diện, và phần hỏng đó nhóm phải hỗ trợ.

### 7.12. "Tuỳ chọn món có gì khó?"

Ba chỗ. Quy tắc chọn phải kiểm ở cả POS lẫn backend: size bắt buộc chọn đúng một, topping tối đa ba. Giá phải tính ở backend từ giá món cộng từng tuỳ chọn. Và giá phải chụp lại lúc bán — cả tên lẫn giá từng tuỳ chọn — để bill in lại sau ba tháng vẫn đúng dù Owner đã đổi giá hay xoá topping.

### 7.13. "Sao không có quản lý kho?"

Kho nguyên liệu cần định mức cho từng món và kiểm kê định kỳ — là một module độc lập, trong ngành thường bán tách riêng. Nhóm thay bằng báo hết món và hết tuỳ chọn để giải quyết phần rủi ro trực tiếp nhất: khách trả tiền cho món đã hết.

### 7.14. "Không có hoá đơn điện tử thì quán dùng thật sao được?"

Đúng, đây là giới hạn đã biết. Hoá đơn điện tử cần đăng ký với cơ quan thuế và tích hợp nhà cung cấp được cấp phép, nằm ngoài khả năng thực hiện của đồ án. Hệ thống in hoá đơn bán hàng nội bộ, không thay thế hoá đơn thuế.

### 7.15. "Hết hạn thuê bao thì quán còn bán được không?"

Không chốt được đơn mới, nhưng không mất gì: doanh nghiệp chuyển sang chỉ đọc, dữ liệu giữ tối thiểu 90 ngày, đơn đã trả tiền vẫn được pha và gọi số cho xong. Owner được nhắc qua email trước 7 ngày; Admin gia hạn là dùng lại ngay.

### 7.16. "Hai tablet ở quầy kết nối với nhau thế nào, có bị trễ không?"

Không kết nối trực tiếp. Màn hình phía khách ghép với quầy bằng mã 6 số, rồi cả hai máy cùng vào một room Socket.IO của quầy; POS gửi toàn bộ giỏ kèm số phiên bản, server chuyển tiếp ngay. Độ trễ khoảng vài chục mili giây. Kết quả thanh toán vốn đến từ webhook PayOS về server, nên đi qua server là đường ngắn nhất cho cả hai loại dữ liệu. Màn hình khách mất kết nối thì POS tự hiện QR, không chặn bán hàng.

### 7.17. "Tuỳ biến nhận diện thì có giá trị nghiệp vụ gì?"

**Một — khách nhìn thấy hai màn hình của hệ thống.** Màn hình phía khách hiện món và mã QR ngay trước mặt khách khi trả tiền; màn hình gọi số treo ở khu nhận món cho cả quán nhìn. Nếu trên đó là logo của một phần mềm lạ, quán đang để khách của mình nhìn thấy thương hiệu của nhà cung cấp phần mềm. Với chuỗi trà sữa sống bằng thương hiệu, đó là mất mát thật.

**Hai — bill và phiếu số là giấy tờ khách cầm trên tay.** Có logo và tên quán là chuẩn mực tối thiểu.

**Ba — sản phẩm cho thuê theo tháng thì nhận diện riêng là câu hỏi khách hàng hỏi sớm nhất,** và là lý do tự nhiên để khách nâng từ gói Cơ bản lên Tiêu chuẩn.

Và một lý do phụ có giá trị khi demo: hai doanh nghiệp hai màu khác nhau là cách nhìn thấy được của multi-tenant. Xem 7.6.