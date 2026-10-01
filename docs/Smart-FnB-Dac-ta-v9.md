Smart F&B Chain Platform

Phân tích nghiệp vụ & Đặc tả dự án — Phiên bản 9.0

Mã đề tài: SP26SE123

Giảng viên hướng dẫn: Tôn Thất Hoàng Minh

Quy mô nhóm: 4 sinh viên (2 Frontend, 2 Backend) — 11 tuần thực thi

Hiệu lực: bản duy nhất đang dùng, thay thế mọi bản đặc tả trước, kể cả bản 7.0, 8.0 và 8.1

Căn cứ thay đổi: tài liệu “Scope mới” sau góp ý của hội đồng — phạm vi v7 quá rộng; chuyển sang mô hình chuỗi gọi món và trả tiền tại quầy.

## Mục lục

- Tài liệu này là gì

- Sản phẩm

- Mô hình tổ chức dữ liệu

- Từ điển thuật ngữ

- Actor

- Vòng đời trạng thái

- Luồng nghiệp vụ

- Quy tắc nghiệp vụ

- Thuật toán gom món trong hàng đợi pha chế

- AI trong sản phẩm

- Tuỳ biến nhận diện thương hiệu theo chuỗi

- Thanh toán QR qua PayOS và màn hình phía khách

- Tuỳ chọn món

- Gói dịch vụ và phân cấp tính năng

- Danh sách use case

- Ma trận quyền

- Phạm vi

- Giả định và giới hạn đã biết

- Yêu cầu phi chức năng

## 0. Tài liệu này là gì

Đặc tả nghiệp vụ và phạm vi của Smart F&B Chain Platform. Mọi tài liệu khác của nhóm — SRS, Use Case Diagram, Activity Diagram, ERD, slide bảo vệ — lấy mã use case, mã quy tắc và số liệu từ bản này.

Bốn phần nghiệp vụ nặng nhất và cần đọc kỹ nhất: thanh toán QR qua PayOS (mục 11), tuỳ chọn món (mục 12), thuật toán gom món (mục 8) và trợ lý AI hỏi đáp số liệu (mục 9).

### 0.1. Cách đọc

| Bạn là | Đọc kỹ mục |
| --- | --- |
| Ai cũng cần | 0.2, 1, 3, 4, 6 |
| Backend | 2, 5, 7, 8, 9, 11, 12, 13, 15 |
| Frontend | 4, 6, 8, 10, 11, 12, 14, 15 |
| Người viết SRS | Toàn bộ, đặc biệt 7, 14, 15, 16 |
| Người trình bày bảo vệ | 1.5, 17 và tài liệu Kế hoạch |

### 0.2. Phiên bản và tài liệu đi kèm

Bản 9.0. So với bản 7.0: đổi sang chuỗi gọi món và trả tiền tại quầy, bỏ bàn, ví, ca làm; từ 60 use case còn 32. Bản 8.1 thêm hai tablet ở quầy, ghép màn hình phía khách và đồng bộ qua Socket.IO. Bản 9.0 đổi cách in bill sang lệnh ESC/POS, làm rõ xác nhận thủ công và huỷ đơn đã thanh toán, thêm yêu cầu phi chức năng (mục 18).

Tài liệu đi kèm: lịch sử thay đổi chi tiết, lịch 11 tuần, ước lượng khối lượng, rủi ro, điểm chưa chốt (các mã CC-xx), việc phải làm và câu hỏi hội đồng dễ hỏi nằm ở tài liệu Kế hoạch dự án và chuẩn bị bảo vệ. Tài liệu đó dùng nội bộ, không gửi kèm đặc tả.

## 1. Sản phẩm

### 1.1. Một câu

Phần mềm bán hàng tại quầy cho thuê theo tháng, để chuỗi cà phê, trà sữa và đồ ăn nhanh tự cấu hình menu có tuỳ chọn, mang nhận diện riêng của mình, thu tiền mặt hoặc QR về thẳng tài khoản của chủ chuỗi, và đẩy món xuống quầy pha chế ngay khi khách trả tiền.

Không phải ứng dụng đặt món cho người tiêu dùng. Khách hàng cuối không cài gì, không có tài khoản, không biết tên sản phẩm này.

### 1.2. Ai trả tiền

Chủ chuỗi F&B quy mô 2–10 chi nhánh. Nền tảng chỉ thu một khoản: phí thuê bao theo tháng, theo gói Cơ bản, Tiêu chuẩn hoặc Nâng cao (mục 13). Phí thoả thuận và thu ngoài hệ thống; Platform Admin gia hạn thủ công (GĐ-10).

Không có phí giao dịch. Tiền bán hàng — cả tiền mặt lẫn QR — không đi qua nền tảng (mục 11).

### 1.3. Loại hình cửa hàng

Chuỗi F&B gọi món và trả tiền tại quầy, 2–10 chi nhánh, cùng một chủ. Gồm cà phê, trà sữa, đồ uống mang đi, và đồ ăn nhanh gọi tại quầy như bánh mì hay cơm văn phòng.

Quy trình chung:

Gọi món tại quầy  →  Trả tiền (tiền mặt hoặc QR)  →  Món xuống quầy pha chế                  →  Gọi số  →  Khách nhận

### 1.4. Vấn đề thật mà hệ thống giải

| Vấn đề ngoài quán | Cách giải |
| --- | --- |
| Giờ cao điểm, thu ngân ghi tay hoặc hô món cho pha chế, nghe nhầm size, đường, đá | Thu ngân nhập món kèm tuỳ chọn trên POS; đơn hiện thẳng trên màn hình pha chế ngay khi khách trả tiền |
| Trà sữa có size, đường, đá, topping; cộng tiền tay dễ nhầm | Giá tuỳ chọn cộng tự động, tính ở backend, lưu giá tại thời điểm bán |
| Khách chuyển khoản rồi chìa màn hình, thu ngân không biết thật hay giả, phải mở app ngân hàng dò | PayOS gửi webhook, POS báo “Đã nhận 45.000đ” kèm âm thanh — không ai phải dò sao kê |
| Tính tiền thối nhầm khi đông khách | Nhập số tiền khách đưa, hệ thống tính tiền thối |
| Pha chế làm lần lượt từng đơn, cùng một loại ly bị pha rời nhiều lần | Hàng đợi gom các ly cùng món, cùng size thành một mẻ (mục 8) |
| Khách đứng chờ không biết tới lượt mình chưa, quầy ồn gọi tên không nghe | Phiếu số in kèm bill, màn hình gọi số và âm báo |
| Hết trân châu mà thu ngân vẫn bán, khách trả tiền rồi mới biết | Pha chế báo hết món hoặc hết topping, POS chặn bán ngay |
| Chủ ở nhà không biết chi nhánh nào bán tốt | Báo cáo so sánh đa chi nhánh |
| Chủ muốn biết một con số cụ thể thì phải chờ người tổng hợp | Hỏi trợ lý AI bằng tiếng Việt, nhận số liệu thật kèm diễn giải |
| Màn hình quay về phía khách mang logo của một phần mềm lạ | Owner cấu hình logo, màu, tên chuỗi; màn hình khách, màn hình gọi số, bill và phiếu số đều mang nhận diện của quán |
| Mua POS truyền thống thì đắt và phải mua máy | Thuê tháng, chạy trên máy tính bảng Android phổ thông và trình duyệt sẵn có |

### 1.5. Mô hình trả trước giải các bài toán hội đồng đã nêu

| Bài toán hội đồng nêu | Mô hình trả trước |
| --- | --- |
| Quản lý bàn, chỗ ngồi | Không cần. Khách ngồi đâu cũng được, nhận món theo số |
| Khách huỷ món | Trước khi trả thì sửa thoải mái. Sau khi trả thì chỉ Manager được huỷ, kèm lý do |
| Tách món, tách bill | Mỗi người tự gọi và tự trả tại quầy |
| Khách không trả tiền | Chưa trả thì chưa pha, nên không có thiệt hại |

Đây là lý do chọn loại hình này, nên phải nói ngay từ slide đầu khi bảo vệ. Bốn bài toán trên không được “giải bằng tính năng” mà biến mất do đổi quy trình.

### 1.6. Phân khúc mục tiêu

Phù hợp: chuỗi cà phê, trà sữa, nước ép, đồ uống mang đi; quán đồ ăn nhanh gọi tại quầy như bánh mì, cơm văn phòng, xôi; quy mô 2–10 chi nhánh.

Không nhắm tới: nhà hàng phục vụ tại bàn và trả sau, buffet, quán nhậu, lẩu nướng, chuỗi trên 10 chi nhánh, mô hình chủ yếu bán qua ứng dụng giao hàng.

## 2. Mô hình tổ chức dữ liệu

NỀN TẢNG  (bên bán phần mềm — không giữ tiền của quán)│├── Doanh nghiệp A ── Owner   (gói Tiêu chuẩn)│   │   nhận diện riêng: logo, màu cam · kênh PayOS của A│   ├── Chi nhánh Q1 ── Branch Manager ── Cashier, Barista│   └── Chi nhánh Q7 ── Branch Manager ── Cashier, Barista│└── Doanh nghiệp B ── Owner   (gói Cơ bản)    │   nhận diện mặc định · kênh PayOS của B    └── Chi nhánh Thủ Đức          (không thấy gì của A)

Quy tắc vàng: mọi truy vấn dữ liệu vận hành phải lọc theo doanh nghiệp. Không có ngoại lệ. Ai làm rớt điều kiện này là tạo lỗ hổng rò rỉ dữ liệu giữa hai khách hàng trả tiền.

### 2.1. Chuỗi cấp tài khoản

Chủ quán nộp hồ sơ ──► Admin duyệt, chọn gói ──► sinh tài khoản Owner</w:r><w:r><w:rPr><w:rFonts w:ascii="Cambria" w:cs="Cambria" w:eastAsia="Cambria" w:hAnsi="Cambria"/><w:b w:val="0"/><w:bCs w:val="0"/><w:i w:val="0"/><w:iCs w:val="0"/><w:color w:val="000000"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:rtl w:val="0"/></w:rPr><w:br w:type="textWrapping"/></w:r><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:cs="Consolas" w:eastAsia="Consolas" w:hAnsi="Consolas"/><w:b w:val="0"/><w:bCs w:val="0"/><w:i w:val="0"/><w:iCs w:val="0"/><w:color w:val="000000"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:rtl w:val="0"/></w:rPr><w:t xml:space="preserve">Owner ──cấp──► Branch Manager ──cấp──► Cashier + Barista

Tài khoản Owner không do Admin tạo thủ công từ đầu, mà sinh ra khi Admin duyệt hồ sơ đăng ký. Từ tầng Owner trở xuống, mỗi tầng chỉ tạo được tài khoản của tầng ngay dưới. Không có đường tắt. Tổng số tài khoản của doanh nghiệp bị giới hạn theo gói (mục 13).

### 2.2. Nhận diện chảy xuống theo cùng chuỗi đó

Owner cấu hình nhận diện (logo, màu, tên hiển thị)   — gói Tiêu chuẩn trở lên        │        ├──► màn hình Owner        ├──► màn hình Branch Manager        ├──► POS của thu ngân        ├──► màn hình phía khách        ◄── khách nhìn thấy        ├──► màn hình gọi số            ◄── khách nhìn thấy        ├──► màn hình pha chế           (áp có giới hạn — xem 10.4)        └──► bill và phiếu số in ra cho khách

Nhận diện là thuộc tính của doanh nghiệp, không phải của người dùng và không phải của chi nhánh. Một tài khoản thu ngân mới được Branch Manager tạo ra hôm nay, đăng nhập lần đầu đã thấy màu của chuỗi ngay, không cần ai cấu hình thêm gì.

### 2.3. Tiền đi theo đường nào

Khách quét QR tại quầy của bất kỳ chi nhánh nào        │        ▼Kênh PayOS của chính doanh nghiệp đó        │   tiền đi thẳng        ▼Tài khoản ngân hàng của chủ chuỗi</w:r><w:r><w:rPr><w:rFonts w:ascii="Cambria" w:cs="Cambria" w:eastAsia="Cambria" w:hAnsi="Cambria"/><w:b w:val="0"/><w:bCs w:val="0"/><w:i w:val="0"/><w:iCs w:val="0"/><w:color w:val="000000"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:rtl w:val="0"/></w:rPr><w:br w:type="textWrapping"/></w:r><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:cs="Consolas" w:eastAsia="Consolas" w:hAnsi="Consolas"/><w:b w:val="0"/><w:bCs w:val="0"/><w:i w:val="0"/><w:iCs w:val="0"/><w:color w:val="000000"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:rtl w:val="0"/></w:rPr><w:t xml:space="preserve">PayOS ── webhook ──► Backend: kiểm chữ ký bằng checksum key của doanh nghiệp                              → đối chiếu mã đơn và số tiền                              → đơn Đã thanh toán → báo POS qua Socket.IO

Nền tảng không giữ tiền. Nền tảng chỉ nhận tín hiệu “tiền đã vào” từ PayOS để đổi trạng thái đơn. Không có ví, không có sổ cái, không có quyết toán, không có rút tiền.

Tiền mặt nằm trong két của chi nhánh; hệ thống chỉ ghi nhận doanh thu và tên thu ngân đã thu.

### 2.4. Ba cấp tính năng

| Cấp | Tính năng |
| --- | --- |
| Hệ thống (Platform Admin) | Duyệt hồ sơ, quản lý gói, quản lý doanh nghiệp (gia hạn, đổi gói, tạm ngưng) |
| Chuỗi (Owner) | Chi nhánh, menu và giá toàn chuỗi, tuỳ chọn món, tài khoản Manager, liên kết PayOS, nhận diện thương hiệu, báo cáo đa chi nhánh, trợ lý AI |
| Cửa hàng (Manager, Cashier, Barista) | POS, bật/tắt món, tài khoản nhân viên, màn hình pha chế, màn hình gọi số, báo cáo chi nhánh |

## 3. Từ điển thuật ngữ

| Thuật ngữ | Nghĩa |
| --- | --- |
| Doanh nghiệp | Một khách hàng đã mua dịch vụ. Ranh giới cô lập dữ liệu. |
| Hồ sơ đăng ký | Đơn của chủ quán chờ Admin duyệt. Chưa phải doanh nghiệp. |
| Chi nhánh | Một cửa hàng thuộc doanh nghiệp. Mọi hoạt động bán hàng gắn với một chi nhánh. |
| Gói dịch vụ | Cơ bản, Tiêu chuẩn hoặc Nâng cao. Quy định hạn mức chi nhánh, hạn mức tài khoản, tính năng được dùng và giá tháng. |
| Hạn mức | Con số trần của gói: số chi nhánh, số tài khoản. Vượt thì backend chặn. |
| Chế độ chỉ đọc | Trạng thái của doanh nghiệp hết hạn thuê bao: xem được dữ liệu, không tạo đơn mới, không sửa cấu hình. |
| Quầy | Một điểm thu tiền trong chi nhánh, do Branch Manager tạo. Mỗi quầy gồm một tablet POS và tối đa một màn hình phía khách. |
| POS | Ứng dụng bán hàng trên máy tính bảng Android của thu ngân, đặt quay về phía thu ngân. |
| Màn hình phía khách | Máy tính bảng Android thứ hai của quầy, quay về phía khách, hiện món đã chọn, tổng tiền, mã QR và kết quả thanh toán. Chỉ hiển thị, không thao tác. |
| Mã ghép | Mã 6 số, kèm mã QR, do màn hình phía khách tự sinh để ghép với một quầy. Hết hạn sau 5 phút. |
| Token thiết bị | Khoá server cấp cho màn hình phía khách hoặc màn hình gọi số sau khi ghép. Chỉ đọc, gắn với một quầy hoặc một chi nhánh, không phải tài khoản người dùng. |
| Đơn | Một lần khách gọi món và trả tiền tại quầy. Có một số gọi sau khi thanh toán. |
| Dòng món | Một món trong đơn, kèm các tuỳ chọn và số lượng. Đơn vị pha chế xử lý, có vòng đời trạng thái riêng. |
| Nhóm tuỳ chọn | Một nhóm lựa chọn gắn vào món, ví dụ Size, Đường, Đá, Topping. Có quy tắc chọn: bắt buộc hay không, chọn tối thiểu, tối đa. |
| Tuỳ chọn | Một lựa chọn trong nhóm, ví dụ Size L, 50% đường, Trân châu đen. Có giá cộng thêm, có thể bằng 0. |
| Giá lúc bán | Bản sao tên và giá của món cùng từng tuỳ chọn, chụp lại tại thời điểm chốt đơn. Owner đổi giá sau đó không ảnh hưởng. |
| Số gọi | Số thứ tự cấp cho đơn khi thanh toán xong, duy nhất trong một chi nhánh trong một ngày, in trên phiếu số. |
| Phiếu số | Phiếu in kèm bill, khách giữ để nhận món khi được gọi số. |
| Màn hình gọi số | Màn hình đặt ở khu nhận món, hiện các số đang pha và các số mời nhận. |
| Hàng đợi pha chế | Danh sách dòng món của các đơn đã thanh toán, chưa xong, của một chi nhánh. |
| Gom món | Việc gộp các ly cùng món, cùng size ở nhiều đơn khác nhau thành một mẻ để pha một lần (mục 8). |
| Mẻ | Một nhóm ly được gom, pha chế bắt đầu và kết thúc cùng lúc. |
| Kênh PayOS | Kênh thanh toán Owner tự mở trên PayOS, gắn với tài khoản ngân hàng của chủ chuỗi. |
| Khoá PayOS | Bộ ba Client ID, API Key, Checksum Key của kênh PayOS. Lưu mã hoá, mỗi doanh nghiệp một bộ. |
| Webhook | Lời gọi PayOS gửi về backend khi có tiền vào, kèm chữ ký để chứng minh do PayOS gửi. |
| Mã đơn (orderCode) | Số định danh đơn gửi sang PayOS khi tạo QR, dùng để đối chiếu khi webhook về. |
| Xác nhận thủ công | Branch Manager xác nhận một đơn QR đã thanh toán khi webhook không về. Bắt buộc lý do, lưu người xác nhận. |
| Trợ lý số liệu | Tính năng AI: Owner hỏi bằng tiếng Việt, hệ thống trả số liệu thật kèm diễn giải. |
| View báo cáo | Bảng ảo trong cơ sở dữ liệu, là phần dữ liệu duy nhất trợ lý số liệu được đọc. |
| Bộ nhận diện thương hiệu | Logo, màu chủ đạo, màu nhấn và tên hiển thị của một doanh nghiệp. Do Owner đặt, áp cho mọi tài khoản thuộc doanh nghiệp đó. |
| Màu ngữ nghĩa | Màu mang ý nghĩa cố định: đỏ là cảnh báo, vàng là đang chờ, xanh là xong. Là hằng số của hệ thống, không đổi theo thương hiệu. |
| Token màu | Biến CSS trung gian giữa mã nguồn và màu thật. Mã nguồn gọi tên biến, không viết mã màu cứng. |

## 4. Actor

### 4.1. Bảng tổng hợp

| # | Actor | Phạm vi | Nền tảng | Use case |
| --- | --- | --- | --- | --- |
| 0 | Prospective Owner (khách đăng ký, chưa có tài khoản) | Ngoài hệ thống | Web | 1 |
| 1 | Platform Admin | Toàn nền tảng | Web | 5 |
| 2 | Owner | Một doanh nghiệp | Web | 10 |
| 3 | Branch Manager | Một chi nhánh | Web | 6 |
| 4 | Cashier (thu ngân) | Một chi nhánh | Hai tablet Android: POS phía trước + màn hình phía khách phía sau | 5 |
| 5 | Barista (pha chế) | Một chi nhánh | Mobile (máy tính bảng tại quầy pha chế) | 3 |
| — | Authenticated User (actor cha) | — | — | 2 |

Tổng cộng 32 use case, tất cả đều bắt buộc, không chia giai đoạn — xem mục 14.

Năm actor 1–5 kế thừa Authenticated User. Quan hệ generalization này phải vẽ rõ trên Use Case Diagram.

Khách mua hàng tại quầy không phải actor — họ không có tài khoản, không có phiên đăng nhập; họ chỉ nhìn màn hình phía khách, quét QR bằng app ngân hàng của mình, cầm phiếu số và nhìn màn hình gọi số. Phải nêu rõ trong SRS.

### 4.2. Prospective Owner (web, chưa đăng nhập)

Là ai: chủ chuỗi quan tâm dịch vụ, chưa có tài khoản.

Làm gì (GU-01): nộp hồ sơ đăng ký gồm thông tin doanh nghiệp (tên, mã số thuế, địa chỉ, số chi nhánh dự kiến, gói mong muốn) và thông tin người đại diện (họ tên, email, số điện thoại).

Sau khi nộp, hồ sơ ở trạng thái Chờ duyệt. Không có tài khoản, không đăng nhập được cho tới khi Admin duyệt.

Không làm: không tự kích hoạt, không tự thanh toán thuê bao, không dùng thử.

### 4.3. Platform Admin (web)

Là ai: bên bán phần mềm. Vai trò kinh doanh của nền tảng, không dính nghiệp vụ cửa hàng và không cầm tiền của quán.

Ví von: ban quản lý toà nhà cho thuê. Biết công ty nào thuê gói nào, hợp đồng tới ngày nào, đang dùng bao nhiêu chi nhánh. Không biết công ty đó bán món gì cho ai, không thu tiền hộ, và cũng không quyết định công ty đó treo biển màu gì.

A. Xử lý hồ sơ đăng ký

- PA-01 — Xem danh sách hồ sơ chờ duyệt, tìm kiếm, mở chi tiết

- PA-02 — Duyệt: chọn gói và ngày hết hạn ban đầu; hệ thống sinh không gian dữ liệu riêng, tài khoản Owner, bộ nhận diện mặc định, gửi email đăng nhập

- PA-03 — Từ chối: ghi lý do, hồ sơ chuyển trạng thái Bị từ chối, gửi email

B. Gói và doanh nghiệp

- PA-04 — Quản lý gói: tên gói, giá tháng, số chi nhánh tối đa, số tài khoản tối đa, tính năng được bật (nhận diện, so sánh đa chi nhánh, trợ lý AI)

- PA-05 — Quản lý doanh nghiệp: xem danh sách và hồ sơ, gia hạn, đổi gói, tạm ngưng, kích hoạt lại, đặt lại mật khẩu cho Owner

Thấy gì: tên doanh nghiệp, người đại diện, gói, ngày hết hạn, số chi nhánh, số tài khoản đang dùng, tổng số đơn trong tháng.

Không thấy: nội dung đơn hàng, menu, giá món, doanh thu, tên nhân viên quán, khoá PayOS của doanh nghiệp.

Không làm: không tạo chi nhánh — chỉ đặt con số trần; không sửa menu, nhân viên; không sửa bộ nhận diện của doanh nghiệp; không xem hay sửa liên kết PayOS; không đăng nhập thay Owner; không xoá cứng dữ liệu.

Giao diện của Platform Admin luôn giữ nhận diện của nền tảng, không bị doanh nghiệp nào áp màu lên (BR-44).

### 4.4. Owner (web)

Là ai: chủ chuỗi. Người thiết lập chuẩn cho cả chuỗi và giám sát, không phải người đứng quầy.

Nguyên tắc phân định: Owner quyết định luật chơi, Branch Manager chơi theo luật đó.

A. Chi nhánh

- OW-01 — Tạo chi nhánh: tên, địa chỉ, điện thoại, giờ mở cửa, giờ đóng cửa; sửa, tạm ngưng, đóng chi nhánh; xem trạng thái mọi chi nhánh trên một màn hình

- Bị chặn khi vượt số chi nhánh của gói, kèm gợi ý nâng gói

B. Menu toàn chuỗi

- OW-02 — Quản lý danh mục và món: tên, mô tả, ảnh, giá, danh mục, cờ cho phép gom món khi pha

- OW-03 — Quản lý tuỳ chọn món: nhóm tuỳ chọn (size, đường, đá, topping), quy tắc chọn, giá cộng thêm của từng tuỳ chọn, gắn nhóm vào món (mục 12)

- OW-04 — Gán món cho chi nhánh nào bán; bật/tắt món và tuỳ chọn ở cấp toàn chuỗi — tắt thì mọi chi nhánh đều không bán được

Giá là một giá cho toàn chuỗi, cả giá món lẫn giá tuỳ chọn. Không có giá riêng theo chi nhánh.

C. Tài khoản Branch Manager

- OW-05 — Tạo tài khoản Manager và gán vào chi nhánh; khoá, đặt lại mật khẩu, chuyển chi nhánh

Owner không tạo tài khoản thu ngân và pha chế, chỉ xem danh sách.

D. Liên kết PayOS (chi tiết ở mục 11)

- OW-06 — Nhập Client ID, API Key, Checksum Key của kênh PayOS; hệ thống kiểm tra khoá và đăng ký địa chỉ webhook; xem trạng thái liên kết; cập nhật hoặc gỡ liên kết

Chưa liên kết PayOS thì POS của mọi chi nhánh chỉ thu tiền mặt.

E. Bộ nhận diện thương hiệu (chi tiết ở mục 10) — gói Tiêu chuẩn trở lên

- OW-07 — Tải logo, chọn màu chủ đạo và màu nhấn (bộ dựng sẵn hoặc nhập mã màu), đặt tên hiển thị, xem trước trực tiếp, khôi phục mặc định

F. Báo cáo và trợ lý số liệu

- OW-08 — Báo cáo đa chi nhánh: doanh thu theo ngày, tuần, tháng; theo hình thức thanh toán; món và topping bán chạy; số đơn, giá trị đơn trung bình; đơn bị huỷ. Gói Cơ bản xem từng chi nhánh; gói Tiêu chuẩn trở lên có thêm so sánh các chi nhánh trên cùng biểu đồ

- OW-09 — Trợ lý AI hỏi đáp số liệu — gõ câu hỏi tiếng Việt, nhận câu trả lời kèm bảng số lấy từ dữ liệu thật (mục 9). Chỉ gói Nâng cao

Không có báo cáo lợi nhuận. Hệ thống không quản lý kho và không tính lương, nên không có dữ liệu chi phí để tính.

G. Gói dịch vụ

- OW-10 — Xem gói đang dùng, ngày hết hạn, hạn mức đã dùng trên hạn mức cho phép, tính năng có và chưa có

Không làm: không đứng quầy, không thu tiền, không huỷ đơn; không tạo tài khoản thu ngân và pha chế; không tự đổi gói hay gia hạn; không đổi bố cục màn hình hay nhãn chức năng — tuỳ biến dừng ở mức nhận diện.

Ranh giới đầu là cố ý: nếu Owner làm được mọi thứ thì audit log mất ý nghĩa.

### 4.5. Branch Manager (web)

Là ai: quản lý một chi nhánh. Người giữ quyền với những việc có dính tới tiền sau khi khách đã trả: huỷ đơn đã thanh toán, xác nhận chuyển khoản thủ công.

Đây là vai trò, không phải chức danh. Một chi nhánh được tạo nhiều tài khoản Manager, ví dụ quản lý ca sáng và quản lý ca tối.

A. Nhân sự và quầy

- BM-01 — Quản lý tài khoản thu ngân và pha chế của chi nhánh (tạo, sửa, đặt lại mật khẩu, khoá khi nghỉ việc — bị chặn khi vượt số tài khoản của gói) và quản lý quầy (tạo, đổi tên, ngừng dùng quầy; xem và thu hồi màn hình phía khách đã ghép)

B. Món tại chi nhánh

- BM-02 — Bật/tắt món và tuỳ chọn cho chi nhánh mình (hết hàng trong ngày, bật lại khi có hàng)

Không sửa được tên, giá, ảnh, tuỳ chọn — đó là của Owner.

C. Báo cáo

- BM-03 — Báo cáo chi nhánh: doanh thu theo ngày, tuần, tháng, theo hình thức thanh toán; món và topping bán chạy; số đơn theo giờ; thời gian pha trung bình; đơn huỷ kèm lý do

D. Đơn và thanh toán

- BM-04 — Tra cứu đơn: theo số gọi, mã đơn, khoảng thời gian, trạng thái, hình thức thanh toán; xem chi tiết món, tuỳ chọn, giá lúc bán, người tạo, lịch sử thanh toán

- BM-05 — Xác nhận chuyển khoản thủ công khi webhook không về hoặc số tiền lệch; bắt buộc ghi lý do, hệ thống lưu người xác nhận

- BM-06 — Huỷ đơn đã thanh toán, toàn bộ hoặc từng dòng món; bắt buộc ghi lý do và hình thức hoàn tiền (tiền mặt tại quầy hoặc chuyển khoản ngoài hệ thống)

Nhận cảnh báo: webhook báo số tiền lệch, đơn chờ xác nhận thủ công, pha chế báo hết món khi còn đơn đã trả tiền chứa món đó.

Thiết bị hiển thị: Manager ghép màn hình gọi số của chi nhánh (TV hoặc tablet ở khu nhận món) bằng mã ghép, giống cách ghép màn hình phía khách (11.10). Đây là cấu hình thiết bị, không phải use case.

Không làm: sửa tên, mô tả, ảnh, giá món và tuỳ chọn; sửa logo, màu, tên hiển thị; tạo hoặc xoá chi nhánh; xem dữ liệu chi nhánh khác; xem hay sửa khoá PayOS; xem hoặc đổi gói thuê bao.

### 4.6. Cashier — thu ngân (hai tablet Android tại quầy)

Là ai: nhân viên đứng quầy. Actor có tần suất thao tác cao nhất — giờ cao điểm cỡ một đơn mỗi 30 giây, nên mọi màn hình của thu ngân phải tối ưu số lần chạm.

Hai máy tại mỗi quầy. Máy phía trước là tablet POS, thu ngân đăng nhập bằng tài khoản của mình và chọn quầy để order cho khách. Máy phía sau là màn hình phía khách, quay về phía khách: hiện món đã chọn kèm tuỳ chọn và tổng tiền theo thời gian thực, sau đó hiện mã QR kèm đồng hồ đếm ngược, cuối cùng hiện “Thanh toán thành công — số gọi 023”. Màn hình phía khách không thao tác được gì; nó là màn hình phụ của POS.

Ghép hai máy. Màn hình phía khách không đăng nhập tài khoản. Nó hiện một mã ghép; thu ngân nhập hoặc quét mã đó trên POS là hai máy thành một cặp của quầy. Hai máy không nối trực tiếp với nhau mà đồng bộ qua backend bằng Socket.IO — chi tiết ở 11.10 và 11.11.

A. Tạo đơn tại quầy

- CS-01 — Chọn món → chọn tuỳ chọn (các tuỳ chọn mặc định đã chọn sẵn) → số lượng → ghi chú → thêm món khác. Trước khi trả tiền được sửa, xoá thoải mái. Bấm chốt đơn

B. Thu tiền

- CS-02 — Thu tiền mặt: nhập số tiền khách đưa (có nút mệnh giá nhanh và nút “vừa đủ”), hệ thống tính tiền thối, xác nhận

- CS-03 — Thu QR: chọn chuyển khoản, QR hiện trên màn hình phía khách kèm đồng hồ đếm ngược khoảng 10 phút; POS tự báo “Đã nhận 45.000đ” kèm âm thanh khi PayOS xác nhận; có nút “Kiểm tra lại” khi webhook về chậm; khách đổi ý thì huỷ QR để chuyển sang tiền mặt

C. Sau thanh toán

- CS-04 — In bill và phiếu số: tự động ngay khi thanh toán xong. POS gửi lệnh ESC/POS tới máy in nhiệt của quầy (Bluetooth hoặc WiFi, CC-11); nội dung in do backend dựng thành ảnh để in đúng tiếng Việt và logo chuỗi. Máy có dao cắt thì in bill và phiếu số thành hai tờ; không có dao cắt thì gộp một tờ, số gọi in lớn ở đầu. In lỗi không chặn thanh toán; in lại từ lịch sử đơn (mỗi lần in lại ghi log)

- CS-05 — Xem lịch sử đơn của chi nhánh trong ngày: trạng thái pha chế, số gọi, hình thức thanh toán; mở chi tiết để in lại

Không làm: không huỷ hay sửa đơn đã thanh toán; không xác nhận chuyển khoản thủ công, kể cả khi khách chìa màn hình báo chuyển thành công; không sửa giá, không giảm giá; không bật/tắt món; không xem báo cáo doanh thu.

### 4.7. Barista — pha chế (mobile)

Là ai: nhân viên pha chế và làm đồ ăn nhanh của một chi nhánh. Dùng máy tính bảng đặt tại quầy pha chế.

Actor đơn giản nhất về chức năng, khó nhất về thiết kế giao diện. Người dùng tay ướt, đang lắc bình, mắt liếc chứ không đọc.

A. Hàng đợi

- BA-01 — Xem hàng đợi của chi nhánh, đã gom thành mẻ (mục 8). Mỗi mẻ hiện: tên món, size, số ly; bên dưới là từng ly với số gọi, đường, đá, topping, ghi chú, thời gian đã chờ. Lọc theo danh mục (đồ uống / đồ ăn)

Tuỳ chọn khác mặc định và ghi chú phải nổi bật. Ít đường, không đá, thêm pudding — đây là thứ hay bị bỏ sót nhất ngoài đời thật.

B. Cập nhật trạng thái

- BA-02 — Bấm “Bắt đầu mẻ” (mọi ly trong mẻ sang Đang pha), bấm “Xong” từng ly hoặc cả mẻ. Đơn nào đủ món thì hệ thống gọi số. Khách đưa phiếu và nhận món thì bấm “Đã giao”

Đơn vị thao tác là dòng món, không phải cả đơn. Nhưng số chỉ được gọi khi mọi dòng món của đơn đã xong — khách không phải lên quầy hai lần.

C. Báo tình trạng món

- BA-03 — Báo hết món hoặc hết một tuỳ chọn (ví dụ hết trân châu): POS chặn bán ngay; bật lại khi có hàng

Trùng quyền bật/tắt với Branch Manager, và trùng là đúng — pha chế là người biết trước nhất.

Không làm: không thấy giá tiền, không thấy tổng tiền đơn; không huỷ đơn; không thấy dữ liệu chi nhánh khác.

Nguyên tắc thiết kế giao diện pha chế

- Chữ tối thiểu 20px, nút cao tối thiểu 60px

- Hàng đợi nhìn thấy không cần cuộn, hoặc cuộn tối đa một lần

- Phân biệt trạng thái bằng màu và vị trí, đừng bắt đọc chữ

- Mẻ chờ quá lâu tự đổi màu

- Không hộp thoại xác nhận. Bấm nhầm thì có nút hoàn tác trong vài giây

- Tự cập nhật khi có đơn mới thanh toán

- Màu thương hiệu chỉ xuất hiện ở thanh tiêu đề và logo. Màu của thẻ món là màu ngữ nghĩa, không đổi theo chuỗi (BR-42)

### 4.8. Hệ thống bên ngoài

Không phải người dùng, không kế thừa Authenticated User, nhưng có trao đổi dữ liệu với hệ thống và phải xuất hiện trên Context Diagram.

| Hệ thống | Trao đổi gì | Ghi chú |
| --- | --- | --- |
| PayOS | Nhận yêu cầu tạo QR; gửi webhook khi tiền vào; trả trạng thái khi tra cứu; huỷ QR; xác nhận địa chỉ webhook | Mỗi doanh nghiệp một kênh, một bộ khoá. Webhook xử lý idempotent (BR-27) |
| Ngân hàng của chủ chuỗi | Nhận tiền khách chuyển qua PayOS | Không trao đổi dữ liệu với hệ thống. Vẽ để thấy tiền không đi qua nền tảng |
| SePay hoặc Casso | Phương án thay thế PayOS: báo biến động số dư, khớp theo nội dung chuyển khoản chứa mã đơn | Chỉ dùng nếu PayOS không phù hợp (mục 11.7) |
| Dịch vụ mô hình AI | Nhận câu hỏi và mô tả view, trả truy vấn và diễn giải | Chỉ gọi qua backend |
| Dịch vụ email | Gửi tài khoản mới, kết quả duyệt hồ sơ, nhắc sắp hết hạn gói |  |
| Dịch vụ lưu trữ tệp | Lưu logo và ảnh món | Cơ sở dữ liệu chỉ giữ đường dẫn |

## 5. Vòng đời trạng thái

### 5.1. Hồ sơ đăng ký

Chờ duyệt  →  Đã duyệt              → sinh doanh nghiệp + gói + tài khoản Owner              → sinh nhận diện mặc địnhChờ duyệt  →  Bị từ chối  (kèm lý do)

### 5.2. Doanh nghiệp

Hoạt động  →  Tạm ngưng  →  Hoạt động        (Admin, kèm lý do)Hoạt động  →  Hết hạn — chỉ đọc  →  Hoạt động  (Admin gia hạn)

Hết hạn là trạng thái tính từ ngày hết hạn của gói, không cần job chạy. Ở chế độ chỉ đọc, POS không tạo được đơn mới; đơn đã thanh toán trước đó vẫn được pha và gọi số cho xong.

### 5.3. Đơn

Chờ thanh toán → Đã thanh toán → Đang pha → Sẵn sàng (đã gọi số) → Hoàn tấtChờ thanh toán → Đã huỷ          (thu ngân huỷ, sửa đơn, hoặc QR hết hạn)Chờ thanh toán → Cần xử lý       (webhook báo số tiền lệch)                   → Đã thanh toán  (Manager xác nhận thủ công)                   → Đã huỷ         (Manager huỷ, hoàn tiền ngoài hệ thống)Đã thanh toán / Đang pha / Sẵn sàng → Đã huỷ   (chỉ Manager, kèm lý do)

Không có trạng thái Nháp trong cơ sở dữ liệu. Giỏ món trước khi chốt nằm ở POS; chốt đơn mới sinh bản ghi đơn. Đơn chỉ xuống pha chế khi đã ở Đã thanh toán.

Sẵn sàng → Hoàn tất khi pha chế bấm Đã giao, hoặc tự chuyển sau 30 phút (cấu hình) để màn hình gọi số không bị đầy bởi số khách quên nhận.

### 5.4. Dòng món

Chờ pha  →  Đang pha  →  XongChờ pha  →  Hết món                         (pha chế báo hết; Manager xử lý)Chờ pha / Đang pha / Xong  →  Đã huỷ        (Manager huỷ dòng)

Đơn chuyển Sẵn sàng khi mọi dòng món chưa bị huỷ đều đã Xong.

### 5.5. Thanh toán

Tiền mặt:  Khởi tạo → Đã thanh toán</w:r><w:r><w:rPr><w:rFonts w:ascii="Cambria" w:cs="Cambria" w:eastAsia="Cambria" w:hAnsi="Cambria"/><w:b w:val="0"/><w:bCs w:val="0"/><w:i w:val="0"/><w:iCs w:val="0"/><w:color w:val="000000"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:rtl w:val="0"/></w:rPr><w:br w:type="textWrapping"/></w:r><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:cs="Consolas" w:eastAsia="Consolas" w:hAnsi="Consolas"/><w:b w:val="0"/><w:bCs w:val="0"/><w:i w:val="0"/><w:iCs w:val="0"/><w:color w:val="000000"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:rtl w:val="0"/></w:rPr><w:t xml:space="preserve">QR:  Chờ chuyển khoản → Đã thanh toán   (webhook hợp lệ hoặc Kiểm tra lại)     Chờ chuyển khoản → Hết hạn         (quá thời hạn QR, mặc định 10 phút)     Chờ chuyển khoản → Đã huỷ          (đổi sang tiền mặt, hoặc sửa đơn)     Chờ chuyển khoản → Lệch số tiền    (chờ Manager)     Chờ chuyển khoản / Lệch số tiền                      → Đã thanh toán, xác nhận thủ công (Manager, có lý do)

Mỗi đơn có tối đa một thanh toán ở trạng thái Đã thanh toán. Huỷ đơn đã thanh toán không đổi trạng thái thanh toán; hệ thống ghi số tiền phải hoàn và hình thức hoàn vào đơn.

### 5.6. Liên kết PayOS

Chưa liên kết  →  Đang kiểm tra  →  Đã liên kết                  Đang kiểm tra  →  Lỗi  →  Owner nhập lạiĐã liên kết    →  Lỗi             (PayOS từ chối khoá khi tạo QR)Đã liên kết    →  Chưa liên kết   (Owner gỡ)

Chỉ ở Đã liên kết thì POS mới hiện nút thu QR.

### 5.7. Bộ nhận diện thương hiệu

Mặc định nền tảng  →  Owner sửa  →  Đang áp dụng  →  Owner sửa tiếpĐang áp dụng       →  Khôi phục mặc định  →  Mặc định nền tảngĐang áp dụng       →  Hạ xuống gói Cơ bản  →  Tạm không áp (giữ cấu hình)

Không có trạng thái chờ duyệt. Owner lưu là áp dụng ngay cho toàn doanh nghiệp — nền tảng không kiểm duyệt màu sắc của khách hàng.

### 5.8. Một lượt hỏi trợ lý số liệu

Câu hỏi → Sinh truy vấn → Kiểm tra → Chạy → Diễn giải → Đã trả lờiKiểm tra → Bị chặn → Sinh lại (tối đa 1 lần) → Không trả lời đượcCâu hỏi  →  Ngoài phạm vi  →  Từ chối

## 6. Luồng nghiệp vụ

### 6.1. Onboarding doanh nghiệp mới

[Chủ quán]  Nộp hồ sơ đăng ký trên web               ↓[Hệ thống]  Hồ sơ vào trạng thái Chờ duyệt               ↓[Admin]     Mở chi tiết, đối chiếu thông tin               ├─ Từ chối: ghi lý do, gửi email               │    → chủ quán sửa và nộp lại               └─ Duyệt: chọn gói + ngày hết hạn                         → sinh không gian dữ liệu + tài khoản Owner                         + nhận diện mặc định + gửi email               ↓[Owner]     Đăng nhập lần đầu, đổi mật khẩu               ↓[Owner]     Cấu hình nhận diện: logo, màu chuỗi, tên hiển thị            (gói Tiêu chuẩn trở lên)               ↓[Owner]     Liên kết PayOS: nhập ba khoá → hệ thống kiểm tra               ↓[Owner]     Tạo chi nhánh, danh mục, món, nhóm tuỳ chọn, gán món cho chi nhánh               ├─ Vượt số chi nhánh của gói → chặn, gợi ý nâng gói               ↓[Owner]     Tạo tài khoản Branch Manager cho từng chi nhánh               ↓[Manager]   Đăng nhập — giao diện đã mang màu của chuỗi               ↓[Manager]   Tạo tài khoản thu ngân và pha chế, tạo quầy               ↓[Cashier]   Ghép màn hình phía khách với quầy; Manager ghép màn hình gọi số               ↓            Chi nhánh sẵn sàng bán hàng

Luồng này là kịch bản demo mở màn khi bảo vệ. Nó cho thấy multi-tenant, gói dịch vụ, nhận diện riêng theo chuỗi và phân cấp tài khoản trong một mạch.

### 6.2. Luồng chính tại quầy — từ lúc khách gọi món tới lúc nhận món

[Khách]     Tới quầy, gọi món               ↓[Cashier]   Chọn món, size, đường, đá, topping, số lượng, ghi chú            → màn hình phía khách hiện món và tổng tiền theo thời gian thực               ├─ Khách đổi ý → sửa, xoá thoải mái (chưa trả thì chưa pha)               ↓[Cashier]   Chốt đơn               ↓[Hệ thống]  Kiểm tra món và tuỳ chọn còn bán, kiểm tra quy tắc chọn,            tính tổng tiền ở backend, chụp giá lúc bán               ├─ Có món hoặc topping vừa hết → chặn, báo món nào, khách chọn lại               ↓[Cashier]   Chọn hình thức thanh toán               ├─ Tiền mặt: nhập tiền khách đưa → hệ thống tính tiền thối (6.4)               └─ QR: hệ thống tạo QR qua PayOS → màn hình phía khách hiện QR                      + đồng hồ đếm ngược → khách quét → webhook (6.3)               ↓[Hệ thống]  Đơn Đã thanh toán → cấp số gọi → in bill + phiếu số            → đẩy dòng món vào hàng đợi pha chế               ↓[Barista]   Thấy mẻ đã gom trong hàng đợi → Bắt đầu mẻ → Xong từng ly               ↓[Hệ thống]  Đơn đủ món → gọi số trên màn hình gọi số + âm báo               ↓[Khách]     Đưa phiếu số, nhận món               ↓[Barista]   Bấm Đã giao → số rời màn hình gọi số, đơn Hoàn tất

### 6.3. Thu QR qua PayOS

- Owner đã tạo kênh PayOS gắn với tài khoản ngân hàng của mình và nhập Client ID, API Key, Checksum Key vào hệ thống. Các khoá này lưu mã hoá, mỗi doanh nghiệp một bộ.

- Thu ngân chốt đơn và chọn chuyển khoản. Backend dùng khoá của đúng doanh nghiệp đó gọi PayOS tạo QR với orderCode là mã đơn và amount là tổng tiền.

- POS đẩy QR sang màn hình phía khách, kèm đồng hồ đếm ngược khoảng 10 phút.

- Khách quét bằng app ngân hàng bất kỳ, tiền vào thẳng tài khoản của chủ chuỗi.

- PayOS gửi webhook về backend. Backend kiểm tra chữ ký bằng checksum key của đúng doanh nghiệp đó, rồi đối chiếu orderCode và số tiền. Xử lý idempotent theo mã giao dịch, nên webhook về hai lần cũng chỉ ghi một lần.

- Đơn chuyển sang Đã thanh toán. Socket.IO báo lên POS (“Đã nhận 45.000đ” kèm âm thanh), màn hình phía khách báo thành công, in bill và phiếu số, đẩy đơn xuống màn hình pha chế.

Các trường hợp dự phòng:

- Webhook về chậm: thu ngân bấm “Kiểm tra lại” để backend gọi API tra cứu trạng thái của PayOS. Kết quả đi qua đúng bước đối chiếu như webhook.

- Webhook không về nhưng khách chìa màn hình báo chuyển thành công: chỉ Branch Manager được xác nhận thủ công (BM-05), và hệ thống lưu người xác nhận cùng lý do.

- Hết hạn QR: backend huỷ QR bên PayOS và huỷ đơn. Món chưa pha nên không mất gì. Khách muốn mua tiếp thì thu ngân mở lại giỏ cũ, chốt thành đơn mới.

- Số tiền lệch: không tự xác nhận. Đơn sang Cần xử lý, báo Manager.

- Khách đổi sang tiền mặt khi QR đang hiện: backend huỷ QR bên PayOS trước, rồi mới cho thu tiền mặt — tránh khách vừa chuyển khoản vừa trả tiền mặt.

Chi tiết kỹ thuật ở mục 11.

### 6.4. Thu tiền mặt

- Thu ngân chốt đơn, chọn tiền mặt

- Nhập số tiền khách đưa, hoặc bấm nút mệnh giá nhanh (50.000, 100.000, 200.000, 500.000, vừa đủ)

- Hệ thống chặn nếu số tiền nhỏ hơn tổng; tính và hiện tiền thối cỡ chữ lớn

- Thu ngân bấm xác nhận → đơn Đã thanh toán, ghi tên thu ngân, cấp số gọi, in bill và phiếu số, đẩy xuống pha chế

### 6.5. Sửa và huỷ đơn

Trước khi trả tiền — thu ngân tự làm, không cần ai duyệt, không ghi audit log:

- Đang ở giỏ món: sửa, xoá tự do

- Đã chốt, đang hiện QR: bấm “Sửa đơn” → backend huỷ QR và huỷ đơn cũ → POS mở lại giỏ với nội dung cũ → chốt thành đơn mới với mã mới

- Khách bỏ đi: bấm huỷ, đơn sang Đã huỷ

Sau khi trả tiền — chỉ Branch Manager (BM-06):

- Manager tra cứu đơn (BM-04), chọn huỷ toàn bộ hoặc chọn dòng món cần huỷ

- Nhập lý do (bắt buộc) và hình thức hoàn: tiền mặt tại quầy, hoặc chuyển khoản ngoài hệ thống từ tài khoản chủ chuỗi

- Hoàn bằng chuyển khoản thì đơn mang trạng thái Chờ chủ chuỗi hoàn cho tới khi được đánh dấu Đã hoàn; Owner thấy danh sách khoản chờ hoàn trong báo cáo (BR-49)

- Hệ thống tính số tiền hoàn theo giá lúc bán, gỡ dòng món khỏi hàng đợi pha chế nếu chưa xong; dòng món đã pha xong vẫn huỷ được và được ghi là hao hụt (BR-49); ghi audit log

- Báo cáo doanh thu trừ phần đã huỷ vào ngày huỷ và hiện riêng mục đơn huỷ (BR-50)

Hệ thống không tự hoàn tiền qua PayOS. Việc chuyển tiền trả lại khách là việc của quán, hệ thống chỉ ghi nhận (GĐ-05).

### 6.6. Pha chế báo hết món

- Pha chế bấm Hết món trên một món hoặc một tuỳ chọn (ví dụ hết trân châu đen)

- Hệ thống tắt món hoặc tuỳ chọn đó ở cấp chi nhánh; POS mọi quầy của chi nhánh không chọn được nữa

- Nếu hàng đợi còn dòng món đã trả tiền chứa món đó: dòng món sang Hết món, cảnh báo Branch Manager

- Manager ra quầy trao đổi với khách: huỷ dòng món và hoàn tiền dòng đó (BM-06); khách muốn món khác thì gọi đơn mới

- Khi có hàng lại, pha chế hoặc Manager bật món lên

### 6.7. Liên kết PayOS

- Owner tạo kênh thanh toán trên trang PayOS, gắn với tài khoản ngân hàng của chủ chuỗi (việc này làm ngoài hệ thống)

- Owner vào cài đặt doanh nghiệp, thẻ Thanh toán, dán Client ID, API Key, Checksum Key

- Backend mã hoá và lưu, rồi gọi PayOS xác nhận địa chỉ webhook riêng của doanh nghiệp

- Thành công → trạng thái Đã liên kết, POS mọi chi nhánh hiện nút thu QR. Thất bại → báo lỗi cụ thể, không lưu khoá sai

- Sau khi lưu, khoá chỉ hiện dạng che (ví dụ ••••3f9a). Muốn đổi thì nhập lại cả bộ

- Mọi lần lưu, đổi, gỡ đều ghi audit log

### 6.8. Quản lý gói — gia hạn, đổi gói, hết hạn

[Chủ quán]  Chuyển phí thuê bao cho nền tảng (ngoài hệ thống)               ↓[Admin]     Mở doanh nghiệp → Gia hạn: chọn ngày hết hạn mới            hoặc Đổi gói: chọn gói mới               ├─ Hạ gói mà đang vượt hạn mức gói mới → cảnh báo;               │    dữ liệu giữ nguyên, chặn tạo mới cho tới khi về trong hạn mức               ↓[Hệ thống]  Áp hạn mức, tính năng của gói mới; ghi audit log, email Owner</w:r><w:r><w:rPr><w:rFonts w:ascii="Cambria" w:cs="Cambria" w:eastAsia="Cambria" w:hAnsi="Cambria"/><w:b w:val="0"/><w:bCs w:val="0"/><w:i w:val="0"/><w:iCs w:val="0"/><w:color w:val="000000"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:rtl w:val="0"/></w:rPr><w:br w:type="textWrapping"/></w:r><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:cs="Consolas" w:eastAsia="Consolas" w:hAnsi="Consolas"/><w:b w:val="0"/><w:bCs w:val="0"/><w:i w:val="0"/><w:iCs w:val="0"/><w:color w:val="000000"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:rtl w:val="0"/></w:rPr><w:t xml:space="preserve">(Không gia hạn)[Hệ thống]  Trước hạn 7 ngày → email nhắc Owner[Hệ thống]  Qua ngày hết hạn → doanh nghiệp chỉ đọc[Admin]     Gia hạn → mở lại ngay, không mất dữ liệu

### 6.9. Hỏi đáp với trợ lý số liệu

- Owner (gói Nâng cao) mở trợ lý trên web, gõ câu hỏi, ví dụ “Tuần trước chi nhánh Q7 bán bao nhiêu ly trà sữa size L có thêm trân châu sau 20 giờ?”

- Backend gửi câu hỏi kèm mô tả cấu trúc các view báo cáo tới mô hình ngôn ngữ — không gửi dữ liệu

- Mô hình trả về một truy vấn đọc

- Backend kiểm tra truy vấn, tự gắn điều kiện doanh nghiệp, rồi chạy bằng tài khoản cơ sở dữ liệu chỉ đọc

- Kết quả được gửi lại mô hình để viết một câu diễn giải ngắn

- Giao diện hiện câu trả lời, bảng số, khoảng thời gian đã hiểu và view đã dùng; Owner mở được truy vấn đã chạy

- Truy vấn không qua kiểm tra → sinh lại một lần → vẫn không qua thì báo không trả lời được và gợi ý cách hỏi khác

- Câu hỏi về thứ hệ thống không có dữ liệu (lợi nhuận, tồn kho, lương) → từ chối và nói rõ lý do

Chi tiết ở mục 9.

### 6.10. Cấu hình nhận diện thương hiệu

- Owner (gói Tiêu chuẩn trở lên) vào màn hình cài đặt doanh nghiệp, chọn thẻ Nhận diện

- Tải logo, chọn màu chủ đạo (bộ dựng sẵn hoặc nhập mã màu), chọn màu nhấn, đặt tên hiển thị

- Khung xem trước bên cạnh đổi theo ngay khi chọn, chưa lưu

- Hệ thống kiểm tra tương phản; nếu màu chữ trên nền màu chủ đạo không đủ đọc, tự đổi màu chữ và báo cho Owner biết

- Owner bấm lưu → ghi vào bản ghi nhận diện của doanh nghiệp, ghi audit log

- Mọi client của doanh nghiệp tải lại cấu hình ở lần điều hướng kế tiếp hoặc lần đăng nhập kế tiếp; màn hình phía khách và màn hình gọi số nhận qua Socket.IO

- Có nút khôi phục mặc định

Chi tiết ở mục 10.

### 6.11. Các luồng phụ

| Tình huống | Xử lý |
| --- | --- |
| Khách đổi ý trước khi trả | Thu ngân sửa giỏ tự do. Nếu QR đã tạo thì dùng Sửa đơn: huỷ QR, mở lại giỏ, chốt đơn mới |
| Khách đổi từ QR sang tiền mặt | Backend huỷ QR bên PayOS trước, rồi mới cho thu tiền mặt |
| Webhook về chậm | Nút Kiểm tra lại gọi API tra cứu trạng thái của PayOS |
| Webhook không về, khách chìa màn hình chuyển thành công | Chỉ Manager xác nhận thủ công, bắt buộc lý do, lưu người xác nhận |
| QR hết hạn | Huỷ QR và huỷ đơn. Khách muốn mua tiếp thì chốt đơn mới hoặc trả tiền mặt |
| Webhook báo số tiền khác tổng đơn | Không tự xác nhận; đơn sang Cần xử lý, báo Manager |
| Webhook về hai lần cho cùng giao dịch | Lần sau bị bỏ qua: không cấp thêm số gọi, không in thêm bill (BR-27) |
| Webhook sai chữ ký | Bỏ qua, ghi log bảo mật, không đổi trạng thái đơn |
| Tiền về sau khi đơn đã huỷ do hết hạn | Không tự khôi phục đơn; báo Manager — xác nhận thủ công để pha, hoặc hoàn tiền ngoài hệ thống (BR-31) |
| Khách muốn huỷ sau khi đã trả | Manager huỷ kèm lý do và hình thức hoàn; tiền hoàn ngoài hệ thống |
| Pha chế báo hết món khi đơn đã trả | Dòng món sang Hết món, báo Manager; Manager huỷ dòng và hoàn tiền dòng đó |
| Khách không tới nhận món | Sau 30 phút đơn tự chuyển Hoàn tất, số rời màn hình gọi số; vẫn tính doanh thu |
| Khách mất phiếu số | Đọc số gọi hoặc đưa bill; pha chế tra theo số gọi trong danh sách đơn Sẵn sàng |
| Máy in lỗi: kẹt giấy, hết giấy, mất kết nối | Đơn vẫn Đã thanh toán và vẫn xuống pha chế; POS báo In thất bại; in lại từ lịch sử đơn (CS-05), mỗi lần in lại ghi log (BR-21) |
| Hai pha chế cùng bấm Bắt đầu một mẻ | Ai bấm trước thắng, backend khoá bằng transaction; người sau thấy mẻ đã có người nhận |
| Doanh nghiệp chưa liên kết PayOS | POS chỉ hiện tiền mặt |
| Khoá PayOS sai hoặc bị thu hồi | Tạo QR lỗi → POS báo, gợi ý thu tiền mặt; liên kết sang Lỗi, cảnh báo Owner |
| Vượt hạn mức gói | Backend chặn, trả lỗi có gợi ý nâng gói; không chỉ ẩn nút |
| Gọi tính năng gói không có | Backend từ chối; giao diện hiện mục bị khoá kèm nhãn gói cần có |
| Doanh nghiệp hết hạn khi đang bán | POS không chốt được đơn mới; đơn đã trả tiền vẫn pha và gọi số cho xong |
| Trợ lý nhận câu hỏi ngoài phạm vi | Từ chối, nói rõ hệ thống không có dữ liệu đó |
| Câu hỏi cố lấy dữ liệu doanh nghiệp khác | Backend luôn gắn doanh nghiệp của người hỏi; kết quả chỉ có dữ liệu của họ |
| Màn hình phía khách mất kết nối | POS báo ngay; khi thu QR, POS hiện QR trên chính màn hình thu ngân để xoay cho khách quét. Không chặn bán hàng (BR-47) |
| Mở lại app màn hình phía khách, hoặc máy khởi động lại | Tự vào lại bằng token đã lưu, xin trạng thái hiện tại của quầy, không cần ghép lại |
| Màn hình phía khách bị mất hoặc nghi bị lấy | Manager thu hồi token; máy đó không nhận được dữ liệu quầy nữa |
| Ghép một máy mới vào quầy đã có màn hình khách | Máy cũ bị thu hồi tự động — mỗi quầy tối đa một màn hình khách |
| Mạng chập chờn | Client tải lại trạng thái mới nhất khi có mạng, không dựng từ dữ liệu cũ |
| Hồ sơ đăng ký trùng mã số thuế | Hệ thống cảnh báo Admin, không tự chặn |
| Owner tải logo sai định dạng hoặc quá nặng | Chặn ngay ở bước tải, báo giới hạn cụ thể, giữ logo cũ |
| Owner chọn màu quá nhạt làm mất chữ | Hệ thống tự đổi màu chữ sang tương phản đủ, không từ chối màu của khách |

## 7. Quy tắc nghiệp vụ

Mã quy tắc được cấp lại từ đầu trong bản 8.0 và giữ cố định từ đây để các tài liệu khác không phải sửa theo.

Phân quyền và dữ liệu

| Mã | Quy tắc |
| --- | --- |
| BR-01 | Mọi truy vấn dữ liệu vận hành phải lọc theo doanh nghiệp. Không có ngoại lệ. |
| BR-02 | Branch Manager, Cashier, Barista chỉ truy cập dữ liệu của chi nhánh mình được gán. |
| BR-03 | Tài khoản Owner chỉ được sinh ra khi Admin duyệt hồ sơ. Không có đường tạo tắt. |
| BR-04 | Hồ sơ bị từ chối phải có lý do được ghi lại. |
| BR-05 | Mỗi tầng chỉ tạo tài khoản của tầng ngay dưới: Owner tạo Branch Manager; Branch Manager tạo Cashier và Barista. |
| BR-06 | Các thao tác sau ghi audit log kèm người thực hiện và thời điểm: huỷ đơn đã thanh toán, xác nhận chuyển khoản thủ công, in lại bill, đổi giá món hoặc tuỳ chọn, đổi quyền, khoá tài khoản, đổi nhận diện, lưu hoặc gỡ liên kết PayOS, duyệt hoặc từ chối hồ sơ, gia hạn, đổi gói, tạm ngưng doanh nghiệp. |
| BR-07 | Platform Admin chỉ truy cập số liệu tổng hợp phục vụ quản lý gói: số chi nhánh, số tài khoản, số đơn trong tháng. Không truy cập nội dung đơn, menu, doanh thu, nhân viên, khoá PayOS. |

Gói dịch vụ và hạn mức

| Mã | Quy tắc |
| --- | --- |
| BR-08 | Thao tác vượt hạn mức gói, hoặc gọi tính năng gói không có, phải bị chặn tại backend, không chỉ ẩn nút ở frontend. |
| BR-09 | Doanh nghiệp hết hạn chuyển sang chế độ chỉ đọc, không khoá cứng, giữ dữ liệu tối thiểu 90 ngày. Chỉ đọc nghĩa là không chốt đơn mới và không sửa cấu hình; đơn đã thanh toán trước đó vẫn được pha và gọi số cho xong. |
| BR-10 | Phí thuê bao thu ngoài hệ thống. Chỉ Platform Admin gia hạn và đổi gói. |
| BR-11 | Hạ gói không xoá dữ liệu. Nếu đang vượt hạn mức của gói mới, những gì đang có giữ nguyên, chỉ chặn tạo mới cho tới khi về trong hạn mức. |

Menu và tuỳ chọn món

| Mã | Quy tắc |
| --- | --- |
| BR-12 | Món hiện trên POS khi đủ ba điều kiện: cờ kinh doanh cấp chuỗi do Owner bật, món được gán cho chi nhánh, và cờ còn bán hôm nay do Branch Manager hoặc Barista bật. Owner tắt thì chi nhánh không bật lại được. Tuỳ chọn theo cùng quy tắc. |
| BR-13 | Một món có một giá duy nhất toàn chuỗi; một tuỳ chọn có một giá cộng thêm duy nhất toàn chuỗi. Không có giá riêng theo chi nhánh. |
| BR-14 | Mỗi nhóm tuỳ chọn có quy tắc chọn: bắt buộc hay không, số tối thiểu, số tối đa. POS không cho thêm dòng món vi phạm quy tắc; backend kiểm tra lại lúc chốt đơn. |
| BR-15 | Đơn lưu giá tại thời điểm bán: tên và giá món, tên và giá cộng thêm của từng tuỳ chọn, không tham chiếu sang bảng món. Owner đổi giá không hồi tố. |
| BR-16 | Không cho chốt đơn có món hoặc tuỳ chọn đang tắt, kể cả khi món bị tắt sau lúc thêm vào giỏ. Backend kiểm tra lại lúc chốt. |

Đơn và thanh toán tại quầy

| Mã | Quy tắc |
| --- | --- |
| BR-17 | Chưa thanh toán thì chưa pha. Dòng món chỉ vào hàng đợi pha chế khi đơn đã ở trạng thái Đã thanh toán. |
| BR-18 | Trước khi thanh toán, thu ngân sửa và huỷ đơn tự do. Sau khi thanh toán, chỉ Branch Manager của chi nhánh đó được huỷ — toàn bộ hoặc từng dòng món — bắt buộc ghi lý do và hình thức hoàn tiền. |
| BR-19 | Tổng tiền tính ở backend từ giá lúc bán; client chỉ hiển thị. Tiền lưu bằng số nguyên đồng, không dùng số thực. |
| BR-20 | Thu tiền mặt: số tiền khách đưa phải lớn hơn hoặc bằng tổng đơn; tiền thối bằng số khách đưa trừ tổng đơn; ghi tên thu ngân đã thu. |
| BR-21 | Mọi đơn đã thanh toán đều in bill và phiếu số, cả tiền mặt lẫn QR. In lỗi (mất kết nối, hết giấy, kẹt giấy) không chặn thanh toán và không chặn đơn xuống pha chế; POS báo In thất bại và thu ngân in lại từ lịch sử đơn. |
| BR-22 | Số gọi được cấp đúng lúc đơn chuyển Đã thanh toán, tăng dần, duy nhất trong một chi nhánh trong một ngày, bắt đầu lại từ đầu mỗi ngày. Đơn chưa thanh toán không có số gọi. |
| BR-23 | Hệ thống không hoàn tiền tự động. Huỷ đơn đã thanh toán chỉ ghi nhận số tiền phải hoàn và hình thức hoàn; việc trả tiền cho khách do quán làm. |

Thanh toán QR qua PayOS

| Mã | Quy tắc |
| --- | --- |
| BR-24 | Nền tảng không giữ tiền. QR luôn được tạo từ kênh PayOS của chính doanh nghiệp, tiền vào thẳng tài khoản ngân hàng của chủ chuỗi. |
| BR-25 | Khoá PayOS được mã hoá khi lưu, mỗi doanh nghiệp một bộ, không bao giờ trả về frontend sau khi lưu, không ghi vào log. Chỉ Owner lưu, đổi, gỡ. |
| BR-26 | QR mang orderCode là mã đơn và amount là tổng tiền đơn. QR có thời hạn, mặc định 10 phút. Mỗi đơn chỉ có tối đa một QR còn hiệu lực. |
| BR-27 | Webhook phải qua kiểm tra chữ ký bằng checksum key của đúng doanh nghiệp; sai chữ ký thì bỏ qua. Đối chiếu orderCode và số tiền. Xử lý idempotent theo mã giao dịch: nhận lại lần hai không đổi gì. Cập nhật thanh toán, chuyển trạng thái đơn và cấp số gọi nằm trong một transaction. |
| BR-28 | Số tiền webhook khác tổng đơn thì không tự xác nhận; đơn sang Cần xử lý và báo Branch Manager. Manager chỉ được xác nhận khi số tiền thực nhận lớn hơn hoặc bằng tổng đơn (phần dư được ghi nhận để quán trả lại khách); nhận thiếu thì huỷ đơn và ghi nhận khoản phải hoàn. |
| BR-29 | Xác nhận chuyển khoản thủ công chỉ do Branch Manager của chi nhánh đó thực hiện, bắt buộc ghi lý do, hệ thống lưu người xác nhận. Thu ngân không xác nhận được trong mọi trường hợp. Nút Kiểm tra lại mà PayOS trả về đã thanh toán thì hệ thống tự xác nhận như khi nhận webhook, không cần Manager; xác nhận thủ công chỉ dùng khi không tra cứu được PayOS. Webhook hợp lệ về sau khi đã xác nhận thủ công được gắn vào đơn và đánh dấu đã đối soát. |
| BR-30 | QR hết hạn mà chưa nhận tiền thì hệ thống huỷ QR bên PayOS và huỷ đơn. Đổi sang tiền mặt hoặc sửa đơn cũng phải huỷ QR bên PayOS trước. |
| BR-31 | Webhook hợp lệ về cho một đơn đã huỷ thì không tự khôi phục đơn; hệ thống ghi nhận và báo Branch Manager xử lý. |

Pha chế và gọi số

| Mã | Quy tắc |
| --- | --- |
| BR-32 | Hàng đợi pha chế chỉ gồm dòng món của đơn đã thanh toán, thuộc chi nhánh của người xem. |
| BR-33 | Pha chế cập nhật trạng thái theo từng dòng món. Đơn chỉ được gọi số khi mọi dòng món chưa bị huỷ đều đã Xong. |
| BR-34 | Gom món không được làm dòng món chờ lâu nhất phải chờ thêm: mẻ đầu hàng đợi luôn chứa dòng món chờ lâu nhất, và chỉ gom thêm những ly trong cửa sổ gom (mục 8). |
| BR-35 | Một mẻ chỉ một pha chế nhận. Ai bấm Bắt đầu mẻ trước thắng, backend khoá bằng transaction; người thua nhận phản hồi rõ ràng. |
| BR-36 | Báo hết món hoặc tuỳ chọn thì tắt ở cấp chi nhánh ngay, POS chặn bán. Dòng món đã thanh toán chứa món đó chuyển Hết món và báo Branch Manager. |

AI

| Mã | Quy tắc |
| --- | --- |
| BR-37 | AI không truy cập cơ sở dữ liệu trực tiếp. Mọi lời gọi mô hình đi qua backend; ngữ cảnh gửi đi đã lọc theo doanh nghiệp; khoá API không xuất hiện ở frontend. |
| BR-38 | Trợ lý số liệu chỉ chạy truy vấn đọc, chỉ trên các view báo cáo được phép, bằng tài khoản cơ sở dữ liệu chỉ đọc. Backend tự gắn điều kiện doanh nghiệp của người hỏi; mô hình không chọn được doanh nghiệp. |
| BR-39 | Mọi con số trong câu trả lời phải lấy từ kết quả truy vấn. Không có kết quả thì trả lời là không có; không để mô hình tự ước lượng. |
| BR-40 | Mỗi truy vấn bị giới hạn số dòng trả về và thời gian chạy. Câu hỏi, truy vấn đã chạy và câu trả lời được lưu để truy vết. Chỉ Owner của doanh nghiệp gói Nâng cao dùng được trợ lý. |

Nhận diện thương hiệu

| Mã | Quy tắc |
| --- | --- |
| BR-41 | Bộ nhận diện thương hiệu thuộc về doanh nghiệp. Mọi tài khoản thuộc doanh nghiệp đó — kể cả tài khoản tạo sau — đều nhận cùng một bộ nhận diện. Không cấu hình theo chi nhánh, không theo từng người dùng. Chỉ áp khi doanh nghiệp dùng gói Tiêu chuẩn trở lên; gói Cơ bản dùng nhận diện mặc định. |
| BR-42 | Màu ngữ nghĩa không chịu ảnh hưởng của màu thương hiệu. Màu cảnh báo, màu lỗi và màu trạng thái pha chế là hằng số hệ thống. Màu thương hiệu chỉ áp cho nút chính, thanh điều hướng, liên kết và điểm nhấn. |
| BR-43 | Chỉ Owner sửa được bộ nhận diện. Hệ thống kiểm tra tương phản khi lưu; nếu chữ trên nền màu thương hiệu dưới ngưỡng đọc được thì tự chọn màu chữ tương phản. Không cho lưu một cấu hình làm giao diện không đọc được. |
| BR-44 | Giao diện Platform Admin luôn giữ nhận diện của nền tảng. Không doanh nghiệp nào áp màu lên được. |

Quầy và màn hình phía khách

| Mã | Quy tắc |
| --- | --- |
| BR-45 | Màn hình phía khách và màn hình gọi số chỉ được ghép bằng mã ghép do chính màn hình đó sinh, còn hạn, và phải được thu ngân hoặc Manager của đúng chi nhánh xác nhận. Token cấp ra chỉ đọc, gắn với một quầy (hoặc một chi nhánh với màn hình gọi số), không phải tài khoản người dùng, không tính vào hạn mức tài khoản của gói. Mỗi quầy tối đa một màn hình phía khách; Branch Manager thu hồi được bất cứ lúc nào. |
| BR-46 | Trước khi chốt đơn, giỏ trên tablet POS là nguồn dữ liệu duy nhất; server chỉ chuyển tiếp, không ghi cơ sở dữ liệu. Sau khi chốt, server là nguồn duy nhất cho mã QR và trạng thái thanh toán, và gửi đồng thời cho cả hai máy. Màn hình phía khách chỉ hiển thị bản giỏ có số phiên bản mới nhất; số phiên bản do server cấp theo quầy, không do POS tự đếm. |
| BR-47 | Màn hình phía khách mất kết nối không được chặn bán hàng: POS báo trạng thái kết nối và tự hiện mã QR trên màn hình thu ngân. |
| BR-48 | Server chỉ nhận sự kiện giỏ hàng (cart:update, cart:clear) từ tài khoản thu ngân đang đăng nhập và đã chọn đúng quầy đó, thuộc đúng chi nhánh và doanh nghiệp. Sự kiện từ nguồn khác bị bỏ qua và ghi log bảo mật. |
| BR-49 | Huỷ đơn đã thanh toán ghi trạng thái hoàn tiền: Đã hoàn tiền mặt tại quầy, hoặc Chờ chủ chuỗi hoàn (chuyển khoản ngoài hệ thống) cho tới khi Owner hoặc Branch Manager đánh dấu Đã hoàn. Dòng món đã pha xong vẫn huỷ được và được ghi là hao hụt. |
| BR-50 | Tiền của đơn bị huỷ được trừ vào doanh thu của ngày huỷ; số liệu của ngày bán đã qua không bị sửa lại. Báo cáo hiện riêng mục đơn huỷ và số tiền hoàn. |

## 8. Thuật toán gom món trong hàng đợi pha chế

Đây là phần “có thuật toán” mà đề tài yêu cầu, thay cho thuật toán xếp và ghép bàn của v7 — loại hình mới không còn bàn.

### 8.1. Vì sao chọn bài toán này

Giờ cao điểm ở quán trà sữa, mười đơn đến trong năm phút, trong đó sáu ly trà sữa trân châu size L nằm rải rác ở nhiều đơn. Pha lần lượt từng đơn thì pha chế lắc trà nền sáu lần. Gom lại thì pha nền một mẻ, chỉ khác nhau ở bước cuối — đường, đá, topping của từng ly. Người pha chế giỏi tự làm việc này trong đầu; hệ thống làm nó cho người mới và làm đều tay lúc đông.

Bài toán xếp lịch pha chế theo thời gian đã bị loại cùng lý do như bài toán xếp lịch bếp ở v7: thời gian pha phụ thuộc tay nghề và dụng cụ, mọi con số đưa vào đều là số bịa. Gom món không cần thời gian pha. Mọi đầu vào đều đo được chính xác: món, size, tuỳ chọn, thời điểm thanh toán — hệ thống đã có sẵn.

### 8.2. Phát biểu bài toán

Cho: danh sách ly ở trạng thái Chờ pha của một chi nhánh (một dòng món số lượng 3 là ba ly), mỗi ly có món, size, tuỳ chọn, ghi chú, thời điểm thanh toán, số gọi. Hai tham số của chi nhánh: cửa sổ gom W (mặc định 5 phút) và số ly tối đa một mẻ K (mặc định 4).

Tìm: danh sách mẻ theo thứ tự nên pha, mỗi mẻ gồm các ly pha chung được.

### 8.3. Khoá gom

Hai ly pha chung được khi cùng món + size. Đường, đá, topping và ghi chú không nằm trong khoá gom, vì phần nền pha chung được và các tuỳ chọn này thêm ở bước cuối cho từng ly.

Món có cờ “không gom” do Owner đặt (ví dụ sinh tố xay từng ly, bánh mì kẹp theo yêu cầu riêng) thì mỗi ly là một mẻ.

### 8.4. Ràng buộc bắt buộc

- Mẻ đầu hàng đợi luôn chứa ly chờ lâu nhất — gom không bao giờ làm ly chờ lâu nhất phải chờ thêm (BR-34)

- Một ly x được gom vào mẻ bắt đầu bởi ly h khi cùng khoá gom và t(x) − t(h) ≤ W, với t là thời điểm thanh toán

- Mỗi mẻ không quá K ly

- Chỉ gom ly ở trạng thái Chờ pha. Mẻ đã bấm Bắt đầu thì khoá, không tính lại

Cái giá phải trả được nói rõ: một ly x được kéo lên pha chung với ly h thì các ly khác loại đến giữa h và x bị lùi lại. Cửa sổ W và trần K giới hạn mức lùi này — không ly nào bị vượt bởi quá K − 1 ly đến sau nó, và chỉ bởi những ly đến trong vòng W phút.

### 8.5. Cách giải

Hàng đợi thực tế chỉ vài chục ly, thuật toán tham lam là đủ và giải thích được trước hội đồng:

- Lấy các ly Chờ pha, sắp theo thời điểm thanh toán, cùng thời điểm thì theo số gọi

- Lấy ly đầu tiên h chưa thuộc mẻ nào, mở mẻ mới

- Quét các ly sau h: ly nào cùng khoá gom, trong cửa sổ W tính từ h, và mẻ chưa đủ K ly thì thêm vào mẻ

- Lặp lại bước 2 tới khi mọi ly đều thuộc một mẻ

- Tính lại mỗi khi có đơn mới thanh toán, có ly đổi trạng thái hoặc bị huỷ

Độ phức tạp O(n²) với n là số ly chờ — không đáng kể ở quy mô một chi nhánh. Thuật toán chạy ở backend, kết quả đẩy xuống màn hình pha chế qua Socket.IO.

### 8.6. Hiển thị và thao tác

- Mỗi mẻ là một thẻ: tên món, size, số ly, thời gian chờ của ly cũ nhất

- Trong thẻ, từng ly một dòng: số gọi, đường, đá, topping, ghi chú; tuỳ chọn khác mặc định in đậm

- Bắt đầu mẻ → mọi ly trong mẻ sang Đang pha; Xong từng ly hoặc Xong cả mẻ

- Đơn nào đủ ly Xong thì gọi số, không chờ các đơn khác trong cùng mẻ

### 8.7. Đo và demo

Chỉ đo những thứ không phụ thuộc thời gian pha, để kết quả không phải số bịa:

- Số mẻ: trên kịch bản seed giờ cao điểm (ví dụ 20 đơn trong 10 phút), so số lần pha khi có gom và khi pha lần lượt

- Độ lệch thứ tự lớn nhất: số ly một ly bị vượt, phải luôn nhỏ hơn hoặc bằng K − 1

- Tính đúng: bộ test cho các ràng buộc 8.4, gồm trường hợp món không gom, mẻ đầy, ly ngoài cửa sổ, ly bị huỷ giữa chừng

Demo: bấm chốt năm đơn liên tiếp trên POS, trong đó ba đơn có trà sữa size L với đường và topping khác nhau. Màn hình pha chế hiện một mẻ ba ly, từng ly ghi rõ tuỳ chọn riêng. Ba mươi giây, không cần giải thích thêm.

### 8.8. Giới hạn đã biết

- Không mô hình hoá thời gian pha, nên không dự báo được giờ trả món

- Khoá gom cố định là món + size; không gom theo phần nền chung giữa các món khác nhau

- Mọi pha chế của chi nhánh thấy chung một hàng đợi; không phân việc theo từng người

## 9. AI trong sản phẩm

Một điểm chạm duy nhất: trợ lý hỏi đáp số liệu kinh doanh cho Owner, gọi API mô hình sẵn có qua backend, đúng ràng buộc đề tài. Thuộc gói Nâng cao. Nhập menu bằng ảnh của v7 đã cắt.

### 9.1. Vấn đề nó giải

Báo cáo chỉ trả lời được những câu hỏi đã được vẽ sẵn thành biểu đồ. Chủ chuỗi thường muốn biết một con số cụ thể không có sẵn: “Tuần trước chi nhánh Q7 bán bao nhiêu ly trà sữa size L có trân châu sau 20 giờ?”, “Tháng này topping nào bán chạy nhất ở chi nhánh Thủ Đức?”, “Thứ Bảy chi nhánh nào có nhiều đơn nhất?”. Hiện tại họ phải nhờ người lọc báo cáo, hoặc tự xuất dữ liệu ra tính. Trợ lý trả lời những câu đó bằng số thật trong vài giây.

Tuỳ chọn món làm trợ lý đáng giá hơn ở v8: số tổ hợp món × size × topping quá nhiều để vẽ sẵn thành biểu đồ, nhưng lại đúng loại câu chủ chuỗi trà sữa hay hỏi.

### 9.2. Trợ lý này khác “AI phân tích, gợi ý chiến lược” ở đâu

| Tiêu chí | Trợ lý hỏi đáp số liệu | AI phân tích, gợi ý chiến lược |
| --- | --- | --- |
| Câu trả lời là gì | Một con số hoặc một bảng số lấy từ cơ sở dữ liệu | Một lời khuyên, ví dụ “nên đẩy combo trưa” |
| Có đáp án đúng để kiểm chứng | Có — chạy tay cùng truy vấn hoặc đối chiếu báo cáo | Không |
| Phụ thuộc chất lượng dữ liệu seed | Không — số seed thì trả số seed, vẫn đúng với dữ liệu đó | Có — phân tích số bịa ra kết luận bịa |
| Đo được để viết báo cáo | Có — tỷ lệ trả lời đúng trên bộ câu hỏi mẫu | Khó |

Nhóm làm cột giữa, không làm cột phải. Trợ lý không đưa lời khuyên kinh doanh; nó chỉ trả lời câu hỏi có đáp án đo được.

### 9.3. Luồng

- Owner gõ câu hỏi bằng tiếng Việt

- Backend kiểm tra gói Nâng cao, rồi gửi tới mô hình: câu hỏi, mô tả cấu trúc các view báo cáo (tên cột, ý nghĩa, đơn vị), ngày giờ hiện tại, vài lượt hỏi đáp gần nhất để hiểu câu hỏi nối tiếp. Không gửi dữ liệu

- Mô hình trả về một truy vấn đọc

- Backend kiểm tra truy vấn theo 9.5; không qua thì yêu cầu mô hình sinh lại một lần

- Backend gắn điều kiện doanh nghiệp của người hỏi và chạy bằng tài khoản cơ sở dữ liệu chỉ đọc

- Kết quả gửi lại mô hình để viết một câu diễn giải ngắn

- Giao diện hiện: câu trả lời, bảng số, khoảng thời gian hệ thống đã hiểu, view đã dùng; nút xem truy vấn đã chạy

### 9.4. Dữ liệu trợ lý được đọc

Trợ lý chỉ thấy bộ view báo cáo do nhóm định nghĩa, mỗi view đều có cột doanh nghiệp:

| View | Nội dung |
| --- | --- |
| Doanh thu theo đơn | Chi nhánh, thời điểm thanh toán, hình thức thanh toán, tổng tiền, đã huỷ hay không, số tiền đã hoàn |
| Dòng món đã bán | Chi nhánh, thời điểm, món, danh mục, size, số lượng, giá lúc bán gồm tuỳ chọn |
| Tuỳ chọn đã bán | Chi nhánh, thời điểm, món, nhóm tuỳ chọn, tuỳ chọn, số lượng, giá cộng thêm |
| Thời gian pha | Chi nhánh, món, thời gian từ lúc thanh toán tới lúc gọi số |
| Đơn huỷ | Chi nhánh, thời điểm, số tiền, lý do, vai trò người huỷ |

Trợ lý không đọc được: bảng tài khoản, mật khẩu, thông tin cá nhân nhân viên, khoá PayOS, cấu hình hệ thống, audit log, dữ liệu doanh nghiệp khác.

### 9.5. Ràng buộc an toàn

- AI không truy cập cơ sở dữ liệu trực tiếp — chỉ đề xuất truy vấn, backend quyết định có chạy hay không (BR-37)

- Truy vấn phải là truy vấn đọc duy nhất: không có lệnh ghi, sửa cấu trúc, gọi hàm hệ thống, nhiều câu lệnh nối nhau

- Chỉ tham chiếu các view trong danh sách cho phép

- Backend tự gắn điều kiện doanh nghiệp, bỏ qua mọi điều kiện doanh nghiệp do mô hình tự viết (BR-38)

- Chạy bằng tài khoản cơ sở dữ liệu chỉ đọc, chỉ được cấp quyền trên các view — lớp chặn cuối cùng nếu bước kiểm tra có lỗ hổng

- Giới hạn số dòng trả về và thời gian chạy (BR-40)

- Mọi con số trong câu trả lời lấy từ kết quả truy vấn (BR-39)

- Lưu câu hỏi, truy vấn và câu trả lời để truy vết

- Chỉ Owner của doanh nghiệp gói Nâng cao dùng được trợ lý

Phương án dự phòng (CC-03): nếu bộ kiểm thử tấn công ở 9.7 không đạt tuyệt đối, chuyển sang cách mô hình chỉ chọn một mẫu truy vấn có sẵn và điền tham số (chi nhánh, món, size, tuỳ chọn, khoảng thời gian). Kém linh hoạt hơn nhưng không còn truy vấn tự do.

### 9.6. Giới hạn đã biết

- Câu hỏi mơ hồ về thời gian (“tuần này”, “dạo gần đây”) có thể bị hiểu khác ý — luôn hiện khoảng thời gian đã hiểu để Owner kiểm tra

- Tên món hoặc topping viết tắt, gọi theo cách riêng của quán có thể không khớp

- Câu hỏi nhiều bước phức tạp có thể không trả lời được

- Không trả lời những thứ hệ thống không có dữ liệu: lợi nhuận, tồn kho, lương, đánh giá của khách

- Mỗi câu hỏi tốn hai lần gọi mô hình — có chi phí và độ trễ

### 9.7. Đo và trình bày

- Bộ 30 câu hỏi mẫu có đáp án tính sẵn bằng truy vấn viết tay trên dữ liệu seed, trong đó ít nhất 10 câu hỏi về tuỳ chọn món; đo tỷ lệ trả lời đúng số liệu

- Bộ 10 câu hỏi ngoài phạm vi; đo tỷ lệ từ chối đúng

- Bộ kiểm thử tấn công: câu hỏi cố lấy dữ liệu doanh nghiệp khác, cố xoá hoặc sửa dữ liệu, cố đọc bảng tài khoản hoặc khoá PayOS. Yêu cầu chặn 100%

- Khi demo, dùng các câu hỏi đã chạy thử trước, và hỏi thêm một câu hội đồng tự đặt để thấy nó không được dàn dựng

## 10. Tuỳ biến nhận diện thương hiệu theo chuỗi

### 10.1. Ý tưởng một câu

Owner của doanh nghiệp gói Tiêu chuẩn trở lên tự đặt logo, màu chủ đạo và tên hiển thị của chuỗi mình. Mọi tài khoản sinh ra từ Owner đó — Branch Manager, Cashier, Barista — đăng nhập vào là thấy giao diện mang màu của chuỗi; màn hình phía khách, màn hình gọi số, bill và phiếu số cũng vậy.

Đây là white-label ở mức nhẹ: đổi được nhận diện, không đổi được bố cục và chức năng.

### 10.2. Cấu hình gồm những gì — chốt cứng, không mở rộng

| Hạng mục | Kiểu dữ liệu | Áp ở đâu | Mặc định |
| --- | --- | --- | --- |
| Logo chuỗi | Ảnh PNG/JPG, ≤ 1 MB, khuyến nghị nền trong | Thanh điều hướng, màn hình phía khách, màn hình gọi số, đầu bill và phiếu số | Logo nền tảng |
| Màu chủ đạo | Mã màu hex | Nút chính, thanh điều hướng, liên kết, tab đang chọn | Xám đen trung tính |
| Màu nhấn | Mã màu hex | Badge, biểu đồ, điểm nhấn phụ | Xám trung tính |
| Tên hiển thị chuỗi | Văn bản ≤ 50 ký tự | Tiêu đề trang, màn hình phía khách, đầu bill | Tên doanh nghiệp trong hồ sơ |

Cố ý không có: tải lên CSS tuỳ ý, đổi phông chữ, đổi bố cục màn hình, đổi nhãn nút và tên chức năng, tên miền riêng cho từng doanh nghiệp, nhận diện riêng theo từng chi nhánh, ảnh nền trang đăng nhập, chế độ tối. Lý do ở tài liệu Kế hoạch, 7.11 và mục 5.

### 10.3. Áp ở những màn hình nào

| Màn hình | Áp nhận diện? | Ghi chú |
| --- | --- | --- |
| Web Owner | Có | Toàn bộ |
| Web Branch Manager | Có | Toàn bộ |
| POS của thu ngân | Có | Toàn bộ |
| Màn hình phía khách | Có — quan trọng nhất | Khách nhìn thấy khi trả tiền |
| Màn hình gọi số | Có | Logo và thanh tiêu đề; số gọi dùng màu tương phản cao cố định |
| Màn hình pha chế | Có, nhưng giới hạn | Chỉ thanh tiêu đề và logo. Thẻ mẻ giữ màu ngữ nghĩa — xem 10.4 |
| Bill và phiếu số in | Có | Logo, tên chuỗi, kèm tên và địa chỉ chi nhánh |
| Trang đăng nhập | Không | Giữ nhận diện nền tảng (CC-04) |
| Màn hình Platform Admin | Không | Luôn giữ nhận diện nền tảng (BR-44) |

### 10.4. Ràng buộc thiết kế — mục quan trọng nhất của phần này

Cho khách hàng tự chọn màu là mở một cửa để họ tự làm hỏng giao diện của chính mình. Bốn ràng buộc dưới đây là để đóng cửa đó lại mà vẫn giữ được quyền tuỳ biến.

R1 — Tách màu thương hiệu khỏi màu ngữ nghĩa. Hệ thống có hai họ màu:

- Màu thương hiệu: nút chính, thanh điều hướng, liên kết, điểm nhấn. Owner đổi được.

- Màu ngữ nghĩa: đỏ cảnh báo, vàng đang chờ, xanh đã xong, xám vô hiệu. Hằng số hệ thống, Owner không đổi được.

Lý do sống còn: màn hình pha chế phân biệt trạng thái bằng màu, người pha chế liếc chứ không đọc. Nếu một chuỗi chọn màu chủ đạo là đỏ và màu đó tràn vào thẻ mẻ, pha chế sẽ đọc nhầm mẻ bình thường thành mẻ trễ. Tuỳ biến giao diện không được phép làm hỏng vận hành (BR-42).

R2 — Kiểm tra tương phản khi lưu. Chủ quán chọn màu vàng nhạt làm màu nút thì chữ trắng trên nút biến mất. Hệ thống tự tính tương phản giữa chữ và nền; nếu dưới ngưỡng đọc được thì tự đổi chữ sang màu tương phản và báo cho Owner. Không từ chối màu của khách, chỉ sửa màu chữ (BR-43).

R3 — Ưu tiên bộ màu dựng sẵn. Cho 8 bộ màu đã phối sẵn cộng một ô nhập mã màu tự do. Phần lớn chủ quán chọn bộ sẵn, vừa nhanh vừa tránh phối màu xấu.

R4 — Xem trước trước khi lưu, và luôn có nút khôi phục mặc định. Owner phải thấy kết quả trước khi áp cho cả doanh nghiệp, và phải có đường lùi.

### 10.5. Cách triển khai

Dữ liệu. Một bảng branding quan hệ một–một với doanh nghiệp: mã doanh nghiệp, đường dẫn logo, màu chủ đạo, màu nhấn, tên hiển thị, phiên bản cấu hình, thời điểm cập nhật, người cập nhật. Khi Admin duyệt hồ sơ, hệ thống sinh sẵn một bản ghi mặc định để không bao giờ có doanh nghiệp thiếu nhận diện.

Theo gói. API trả nhận diện kiểm tra gói: gói Cơ bản luôn trả bộ mặc định, dù bảng branding có cấu hình. Hạ gói thì cấu hình được giữ lại, nâng lại là áp ngay.

Áp vào giao diện. Frontend không viết mã màu cứng ở bất kỳ đâu, cả web lẫn ứng dụng mobile. Mọi màu đi qua token:

:root {  --brand-primary:   #111827;   ← Owner đổi được  --brand-accent:    #6B7280;   ← Owner đổi được  --status-waiting:  #F59E0B;   ← hằng số hệ thống  --status-done:     #10B981;   ← hằng số hệ thống  --status-late:     #EF4444;   ← hằng số hệ thống}

Ứng dụng Android (POS, màn hình phía khách, màn hình pha chế) dùng cùng bộ tên token trong một theme object. Đổi nhận diện chỉ là ghi lại giá trị của nhóm biến đầu. Không build lại, không nhân bản giao diện theo khách hàng.

Nạp lúc nào. Sau khi đăng nhập, API trả về hồ sơ người dùng kèm nhận diện của doanh nghiệp trong cùng một phản hồi. Client áp token trước khi render màn hình đầu tiên, tránh nhấp nháy đổi màu. Mỗi lần Owner lưu thì tăng số phiên bản để client biết phải tải lại.

Ranh giới quyền. API ghi nhận diện chỉ chấp nhận vai trò Owner, chỉ ghi được vào doanh nghiệp của chính người gọi, và chỉ khi gói có tính năng này. Tài khoản Branch Manager gọi thẳng API phải bị từ chối ở backend — một điểm kiểm thử phân quyền đáng viết test.

### 10.6. Giới hạn đã biết

- Không phải white-label đầy đủ: không có tên miền riêng, không đổi được phông và bố cục

- Logo nền không trong suốt sẽ lộ khối vuông trên thanh điều hướng màu — hướng dẫn trong giao diện, không xử lý ảnh tự động

- Nhận diện dùng chung toàn chuỗi, chi nhánh không có nhận diện riêng

- Không có bản xem trước cho từng vai trò; Owner xem trước trên giao diện của chính mình

## 11. Thanh toán QR qua PayOS và màn hình phía khách

### 11.1. Ý tưởng một câu

Nền tảng không giữ tiền. Mỗi chủ chuỗi tự mở kênh PayOS gắn với tài khoản ngân hàng của mình; hệ thống dùng khoá của kênh đó để tạo QR cho từng đơn và nhận webhook để biết tiền đã vào — tiền đi thẳng từ khách tới chủ chuỗi.

Khách  →  PayOS (kênh của chủ chuỗi)  →  Tài khoản ngân hàng của chủ chuỗi                 └── webhook ──►  Hệ thống: đơn Đã thanh toán

### 11.2. Làm rõ: cửa hàng biết khách đã chuyển khoản bằng cách nào

Đây là câu hỏi hội đồng đã nêu. Câu trả lời ngắn: cửa hàng không cần nhìn màn hình của khách — PayOS báo cho hệ thống.

- Backend tạo QR qua PayOS với orderCode là mã đơn, amount là tổng tiền, thời hạn khoảng 10 phút

- Khách quét bằng app ngân hàng bất kỳ; PayOS nhận biết giao dịch khớp với QR nào

- PayOS gửi webhook có chữ ký về địa chỉ webhook riêng của doanh nghiệp đó

- Backend lấy checksum key của đúng doanh nghiệp, kiểm tra chữ ký — chỉ PayOS biết khoá này, nên không ai giả webhook được

- Backend đối chiếu orderCode với đơn đang chờ và số tiền với tổng đơn; khớp thì chuyển đơn Đã thanh toán trong một transaction, cấp số gọi

- Socket.IO báo POS “Đã nhận 45.000đ” kèm âm thanh, màn hình phía khách báo thành công, in bill và phiếu số, đẩy đơn xuống pha chế

### 11.3. Liên kết PayOS

- Owner tự mở kênh trên PayOS, gắn tài khoản ngân hàng, lấy Client ID, API Key, Checksum Key

- Hệ thống mã hoá ba khoá trước khi lưu, bằng khoá chủ đặt trong biến môi trường của máy chủ, không nằm trong cơ sở dữ liệu

- Mỗi doanh nghiệp một bộ khoá và một địa chỉ webhook riêng, dạng /webhooks/payos/{mã kênh}. Nhờ đó backend biết ngay phải dùng checksum key nào để kiểm chữ ký

- Lúc lưu, backend gọi PayOS xác nhận địa chỉ webhook. Không xác nhận được thì báo lỗi, không lưu

- Khoá không bao giờ trả về frontend sau khi lưu, không ghi vào log; giao diện chỉ hiện dạng che (BR-25)

### 11.4. Mã đơn và vòng đời QR

- Mã đơn là số nguyên duy nhất, dùng làm orderCode gửi PayOS. Một đơn chỉ có một QR

- Cần QR khác (sửa đơn sau khi đã chốt, QR hết hạn mà khách vẫn muốn mua) thì huỷ đơn cũ và chốt đơn mới với mã mới — thu ngân chỉ thấy nút “Sửa đơn”, POS tự mở lại giỏ cũ

- Đơn bị huỷ, đổi sang tiền mặt hoặc QR hết hạn: backend gọi PayOS huỷ QR trước, để khách không trả được vào một đơn đã huỷ

### 11.5. Các trường hợp dự phòng

Các tình huống dự phòng của thanh toán QR — webhook chậm, webhook không về, QR hết hạn, số tiền lệch, tiền về cho đơn đã huỷ — được liệt kê ở bảng 6.11 và quy định ở BR-26 đến BR-31; mục này không nhắc lại.

### 11.6. Kiểm tra môi trường thử nghiệm

Nhóm phải kiểm tra ngay tuần 1 xem PayOS có môi trường test không. Nếu không có thì demo bằng giao dịch thật với số tiền nhỏ, trên kênh PayOS của một thành viên trong nhóm (CC-02). Webhook cần một địa chỉ công khai có HTTPS — trong lúc phát triển dùng đường hầm từ máy cá nhân, trước tuần 8 phải có máy chủ triển khai thật.

### 11.7. Phương án thay thế

Nếu PayOS không phù hợp thì dùng SePay hoặc Casso. Hai dịch vụ này theo dõi biến động số dư của tài khoản ngân hàng và gửi webhook khi có tiền vào; hệ thống khớp theo nội dung chuyển khoản có chứa mã đơn. Tiền vẫn đi thẳng vào tài khoản chủ chuỗi, nên mọi quy tắc khác của mục này giữ nguyên; chỉ đổi cách tạo QR (QR chuẩn VietQR có sẵn nội dung) và cách đối chiếu (theo nội dung thay vì orderCode).

### 11.8. Cách triển khai

- payos_channels — một dòng mỗi doanh nghiệp: ba khoá đã mã hoá, mã kênh dùng trong địa chỉ webhook, trạng thái liên kết, lần kiểm tra gần nhất, người cập nhật

- orders — mã đơn số nguyên duy nhất, chi nhánh, thu ngân, trạng thái, tổng tiền, số gọi, ngày của số gọi, lý do huỷ, số tiền hoàn, hình thức hoàn

- payments — đơn, hình thức, số tiền, trạng thái, mã link PayOS, thời điểm hết hạn, tiền khách đưa và tiền thối (tiền mặt), người xác nhận thủ công, lý do

- payment_webhooks — webhook đã nhận, ràng buộc duy nhất trên mã giao dịch, kết quả kiểm tra chữ ký và đối chiếu

- Số gọi: ràng buộc duy nhất trên (chi nhánh, ngày, số gọi); cấp trong cùng transaction với việc chuyển đơn sang Đã thanh toán

- Tiền lưu bằng số nguyên đồng

Đồng thời. Webhook, nút Kiểm tra lại và xác nhận thủ công có thể tới cùng lúc cho một đơn. Cả ba đi qua cùng một hàm xác nhận, khoá dòng đơn trong transaction và chỉ đổi trạng thái khi đơn còn ở Chờ thanh toán. Phải có test cho webhook về hai lần và webhook tới cùng lúc với xác nhận thủ công.

### 11.9. Giới hạn đã biết

- Không hoàn tiền qua hệ thống; quán tự chuyển trả và hệ thống ghi nhận

- Không đối soát với sao kê ngân hàng; tin vào webhook của PayOS

- Phụ thuộc PayOS: PayOS lỗi thì chỉ thu tiền mặt hoặc xác nhận thủ công

- Chủ chuỗi phải tự mở và xác thực kênh PayOS; nền tảng không làm thay

- Không hỗ trợ thẻ ngân hàng, ví điện tử khác

### 11.10. Quầy và ghép màn hình phía khách

Mỗi quầy thu tiền có hai tablet Android: POS phía trước cho thu ngân, màn hình phía khách phía sau. Hai máy phải biết mình thuộc cùng một quầy, và màn hình phía khách — thứ đặt ở chỗ khách với tay tới được — không được giữ tài khoản có quyền thao tác.

[Manager]     Tạo quầy cho chi nhánh: Quầy 1, Quầy 2 (BM-01)                  ↓[Cashier]     Đăng nhập POS bằng tài khoản thu ngân, chọn quầy                  ↓[Màn hình KH] Mở app ở chế độ Màn hình khách → hiện mã ghép 6 số + mã QR              (hết hạn sau 5 phút)                  ↓[Cashier]     Trên POS chọn “Ghép màn hình khách”, nhập hoặc quét mã                  ↓[Hệ thống]    Cấp token thiết bị chỉ đọc gắn với quầy, thu hồi máy cũ nếu có                  ↓[Màn hình KH] Lưu token, vào room của quầy, hiện màn hình chờ có logo chuỗi

- Token lưu trên máy; mở lại app hoặc khởi động lại máy thì tự vào lại, không phải ghép lại

- Màn hình phía khách không có tài khoản người dùng nên không tính vào hạn mức tài khoản của gói

- Token chỉ nhận được sự kiện của đúng quầy đó và không gọi được API ghi nào (BR-45)

- Branch Manager xem danh sách thiết bị đã ghép của chi nhánh và thu hồi khi máy hỏng, mất hoặc đổi máy

- Branch Manager khai báo máy in của quầy trong BM-01: chọn kiểu kết nối, nhập địa chỉ IP (WiFi) hoặc chọn máy đã ghép Bluetooth trên tablet POS. Mỗi quầy một máy in

- Màn hình gọi số ghép bằng cùng cơ chế, nhưng token gắn với chi nhánh thay vì quầy. Màn hình gọi số là trang web chạy trên trình duyệt của TV hoặc tablet ở khu nhận món

Dữ liệu: pos_stations — chi nhánh, tên quầy, trạng thái, cấu hình máy in (kiểu kết nối, địa chỉ IP hoặc địa chỉ MAC); display_devices — loại (màn hình khách hoặc màn hình gọi số), quầy hoặc chi nhánh, mã băm của token, người ghép, thời điểm ghép, lần kết nối gần nhất, thời điểm thu hồi; pairing_codes — mã ghép, thời điểm hết hạn, đã dùng hay chưa.

### 11.11. Đồng bộ POS và màn hình phía khách

Kiến trúc. Hai máy không kết nối trực tiếp với nhau. Cả hai cùng vào room station:{mã quầy} trên server Socket.IO; máy POS gửi lên, server chuyển tiếp ngay cho máy khách.

[Tablet POS] ──websocket──► [Backend Socket.IO] ──websocket──► [Màn hình KH]                                   ▲                          PayOS webhook (tiền đã vào)

Không chọn kết nối trực tiếp qua mạng nội bộ, Wi‑Fi Direct hay Bluetooth vì ba lý do:

- Trạng thái “đã nhận tiền” đến từ webhook PayOS về backend, nên màn hình khách dù sao cũng phải nghe server

- Mất internet thì không tạo được QR và POS đám mây cũng ngừng (GĐ-08); kết nối trực tiếp không cứu được

- Socket.IO đã có sẵn trong kiến trúc cho POS và màn hình pha chế

Với máy chủ đặt ở Singapore hoặc Việt Nam, độ trễ một chiều khoảng 30–100ms — người dùng cảm nhận là tức thì.

Nguồn dữ liệu theo giai đoạn (BR-46).

- Trước khi chốt đơn: tablet POS là nguồn duy nhất của giỏ. Server chỉ chuyển tiếp, không ghi cơ sở dữ liệu, và giữ bản giỏ cuối của mỗi quầy trong bộ nhớ (Redis nếu chạy nhiều máy chủ) để màn hình khách vào lại là lấy được ngay

- Sau khi chốt đơn: server là nguồn duy nhất cho mã QR, thời hạn và kết quả thanh toán, và gửi đồng thời cho cả hai máy

Gửi cả giỏ, không gửi từng thay đổi. Mỗi lần thêm, sửa, xoá món, POS gửi toàn bộ giỏ; server gắn cho bản giỏ đó một số phiên bản tăng dần theo quầy rồi mới chuyển tiếp. Giỏ chỉ vài KB. Màn hình khách vẽ lại theo bản có số phiên bản lớn nhất và bỏ qua bản cũ hơn — không cần ghép thay đổi, gói tin đến trễ cũng không làm sai. Số phiên bản do server cấp để POS khởi động lại hay tải lại không làm màn hình khách bỏ qua giỏ mới.

| Sự kiện | Chiều | Nội dung |
| --- | --- | --- |
| cart:update | POS → server | Mã quầy, danh sách món kèm tuỳ chọn, tổng tiền; server kiểm tra người gửi (BR-48) |
| cart:clear | POS → server | Xoá giỏ, màn hình khách về màn hình chờ |
| cart:state | Server → quầy | Bản giỏ mới nhất kèm số phiên bản do server cấp |
| payment:qr | Server → quầy | Mã đơn, số tiền, chuỗi QR, thời điểm hết hạn |
| payment:paid | Server → quầy | Mã đơn, số tiền đã nhận, số gọi |
| payment:expired, payment:cancelled | Server → quầy | Mã đơn |
| display:status | Server → POS | Màn hình khách đang kết nối hay không |
| station:sync | Màn hình KH → server | Xin trạng thái hiện tại khi vừa kết nối: giỏ hoặc QR đang chờ |

Những chi tiết giữ cho đồng bộ nhanh:

- Client chỉ dùng websocket, bỏ bước long-polling ban đầu của Socket.IO

- Màn hình khách tự vẽ QR từ chuỗi QR PayOS trả về, không tải ảnh

- Gửi thời điểm hết hạn tuyệt đối thay vì số giây còn lại; màn hình khách tự đếm theo độ lệch giờ với server, rớt mạng vài giây vẫn đếm đúng

- POS cập nhật giao diện ngay trên máy mình rồi mới gửi đi, không chờ server phản hồi

- Server chỉ nhận cart:update và cart:clear từ tài khoản thu ngân đang đăng nhập ở đúng quầy, đúng chi nhánh và doanh nghiệp; token màn hình khách không gửi được sự kiện nào ngoài station:sync (BR-48)

- POS hiện trạng thái “Màn hình khách: đang kết nối / mất kết nối”; mất kết nối thì tự hiện QR trên màn hình thu ngân (BR-47)

- Màn hình khách giữ màn hình luôn sáng và khoá ở chế độ màn hình khách (ghim màn hình của Android)

Phương án khác đã cân nhắc: máy POS hai màn hình liền khối (loại có màn phụ điều khiển bằng Presentation API của Android) nhanh nhất vì không qua mạng, nhưng phải mua đúng loại máy và viết native module. Không hợp với hai tablet rời.

## 12. Tuỳ chọn món

### 12.1. Vì sao bắt buộc

Tuỳ chọn món là tính năng mới nhưng bắt buộc. POS trà sữa mà không có size, đường, đá, topping thì hội đồng sẽ hỏi ngay. Giá lưu tại thời điểm bán, gồm cả giá của từng tuỳ chọn.

### 12.2. Mô hình

- Nhóm tuỳ chọn: tên, bắt buộc hay không, số chọn tối thiểu, số chọn tối đa, tuỳ chọn mặc định, thứ tự hiển thị

- Tuỳ chọn: tên, giá cộng thêm (≥ 0), cờ kinh doanh cấp chuỗi

- Gắn nhóm vào món: một nhóm dùng chung cho nhiều món — nhóm Topping gắn cho mọi món trà sữa, sửa một lần là đổi cho tất cả

- Cờ còn bán tại chi nhánh: như món, do Branch Manager hoặc Barista bật/tắt

| Nhóm | Quy tắc chọn | Tuỳ chọn (giá cộng thêm) |
| --- | --- | --- |
| Size | Bắt buộc, chọn đúng 1 | M (+0), L (+6.000) |
| Đường | Bắt buộc, chọn đúng 1, mặc định 100% | 0%, 30%, 50%, 70%, 100% (+0) |
| Đá | Bắt buộc, chọn đúng 1, mặc định Bình thường | Không đá, Ít đá, Bình thường (+0) |
| Topping | Không bắt buộc, chọn 0–3 | Trân châu đen (+5.000), Thạch dừa (+5.000), Pudding (+7.000) |

### 12.3. Tính giá và lưu giá lúc bán

Giá một ly bằng giá món cộng giá mọi tuỳ chọn đã chọn. Giá dòng món bằng giá một ly nhân số lượng. Tính ở backend (BR-19).

Ví dụ. Trà sữa truyền thống 30.000đ, size L (+6.000), trân châu đen (+5.000), pudding (+7.000): 48.000đ một ly, hai ly là 96.000đ.

Lúc chốt đơn, hệ thống chụp lại tên và giá của món vào dòng món, và tên nhóm, tên tuỳ chọn, giá cộng thêm của từng tuỳ chọn vào bảng tuỳ chọn của dòng món. Bill in lại sau ba tháng vẫn đúng như lúc bán, dù Owner đã đổi giá hay xoá topping (BR-15).

### 12.4. Hiển thị

- POS: chọn món là mở bảng tuỳ chọn với mặc định đã chọn sẵn — đa số ly chỉ cần chọn size rồi thêm vào giỏ. Nhóm bắt buộc chưa chọn đủ thì nút thêm bị khoá

- Màn hình phía khách và bill: tuỳ chọn in dưới từng món, kèm giá cộng thêm nếu khác 0

- Màn hình pha chế: chỉ in đậm tuỳ chọn khác mặc định (“30% đường”, “không đá”, “+ pudding”), không in những gì mặc định, để mắt không bị ngợp

### 12.5. Có gì, không có gì

| Có | Không có |
| --- | --- |
| Nhóm tuỳ chọn dùng chung nhiều món | Giá tuỳ chọn riêng theo chi nhánh |
| Quy tắc bắt buộc, tối thiểu, tối đa | Tuỳ chọn phụ thuộc nhau (chỉ size L mới có topping X) |
| Giá cộng thêm theo từng tuỳ chọn | Chọn một topping nhiều phần trong cùng một ly |
| Bật/tắt tuỳ chọn cấp chuỗi và cấp chi nhánh | Combo, giảm giá theo tổ hợp |
| Giá lúc bán gồm từng tuỳ chọn | Công thức định lượng nguyên liệu |

## 13. Gói dịch vụ và phân cấp tính năng

### 13.1. Ba gói

Số liệu là ví dụ, nhóm tự chốt (CC-01).

|  | Cơ bản | Tiêu chuẩn | Nâng cao |
| --- | --- | --- | --- |
| Số chi nhánh | ≤ 2 | ≤ 5 | ≤ 10 |
| Số tài khoản | ≤ 10 | ≤ 30 | ≤ 80 |
| POS, pha chế, báo cáo chi nhánh | ✓ | ✓ | ✓ |
| Nhận diện thương hiệu, so sánh đa chi nhánh | – | ✓ | ✓ |
| Trợ lý AI | – | – | ✓ |
| Giá hằng tháng (subscription) | Nhóm chốt | Nhóm chốt | Nhóm chốt |

Số tài khoản tính mọi tài khoản đang hoạt động thuộc doanh nghiệp: Owner, Branch Manager, Cashier, Barista. Tài khoản đã khoá không tính.

### 13.2. Quy tắc áp gói

- Backend chặn khi vượt hạn mức hoặc khi gói không có tính năng đó (BR-08). Frontend ẩn hoặc khoá mục tương ứng kèm nhãn gói cần có, nhưng đó chỉ là lớp thứ hai

- Hết hạn thì chuyển sang chỉ đọc (BR-09)

- Phí thuê bao vẫn thu ngoài hệ thống; Admin gia hạn thủ công (BR-10)

- Hạ gói không xoá gì; chỉ chặn tạo mới khi đang vượt hạn mức (BR-11)

- Trước ngày hết hạn 7 ngày, hệ thống gửi email nhắc Owner

### 13.3. Phân cấp tính năng

Cấp hệ thống (Platform Admin): duyệt hồ sơ, quản lý gói, quản lý doanh nghiệp (gia hạn, đổi gói, tạm ngưng).

Cấp chuỗi (Owner): chi nhánh, menu và giá toàn chuỗi, tuỳ chọn món, tài khoản Manager, liên kết PayOS, nhận diện thương hiệu, báo cáo đa chi nhánh, trợ lý AI.

Cấp cửa hàng (Manager, Cashier, Barista): POS, bật/tắt món, tài khoản nhân viên, màn hình pha chế, màn hình gọi số, báo cáo chi nhánh.

### 13.4. Cách triển khai

- plans — tên, giá tháng, số chi nhánh tối đa, số tài khoản tối đa, cờ tính năng: nhận diện, so sánh đa chi nhánh, trợ lý AI

- subscriptions — doanh nghiệp, gói, ngày bắt đầu, ngày hết hạn, người gia hạn; mỗi lần đổi là một dòng mới để giữ lịch sử

- Một lớp kiểm tra gói dùng chung ở backend, đặt trước mọi API tạo chi nhánh, tạo tài khoản, ghi nhận diện, báo cáo so sánh, trợ lý AI

- Trạng thái hết hạn tính từ ngày hết hạn khi xử lý yêu cầu, không cần job

Khối lượng khoảng 2 ngày backend và 1,5 ngày frontend (màn hình gói của Admin, màn hình xem gói của Owner, nhãn khoá tính năng).

## 14. Danh sách use case

### 14.1. Danh sách đầy đủ — 32 use case, bắt buộc, tuần 1–9

| Mã | Use case | Actor |
| --- | --- | --- |
| CM-01 | Đăng nhập, đăng xuất | Mọi actor đã xác thực |
| CM-02 | Xem, cập nhật hồ sơ cá nhân và đổi mật khẩu | Mọi actor đã xác thực |
| GU-01 | Nộp hồ sơ đăng ký | Prospective Owner |
| PA-01 | Xem hồ sơ đăng ký: danh sách, tìm kiếm, chi tiết | Platform Admin |
| PA-02 | Duyệt hồ sơ — sinh doanh nghiệp, gói, tài khoản Owner, gửi email | Platform Admin |
| PA-03 | Từ chối hồ sơ kèm lý do | Platform Admin |
| PA-04 | Quản lý gói dịch vụ | Platform Admin |
| PA-05 | Quản lý doanh nghiệp — gia hạn, đổi gói, tạm ngưng | Platform Admin |
| OW-01 | Quản lý chi nhánh | Owner |
| OW-02 | Quản lý danh mục và món | Owner |
| OW-03 | Quản lý tuỳ chọn món — size, đường, đá, topping | Owner |
| OW-04 | Gán món cho chi nhánh, bật/tắt cấp chuỗi | Owner |
| OW-05 | Quản lý tài khoản Branch Manager | Owner |
| OW-06 | Liên kết PayOS | Owner |
| OW-07 | Cấu hình nhận diện thương hiệu — logo, màu, tên hiển thị | Owner |
| OW-08 | Xem báo cáo đa chi nhánh | Owner |
| OW-09 | Hỏi đáp số liệu với trợ lý AI | Owner |
| OW-10 | Xem gói dịch vụ và hạn mức | Owner |
| BM-01 | Quản lý tài khoản thu ngân, pha chế và quầy | Branch Manager |
| BM-02 | Bật/tắt món và tuỳ chọn tại chi nhánh | Branch Manager |
| BM-03 | Xem báo cáo chi nhánh | Branch Manager |
| BM-04 | Tra cứu đơn | Branch Manager |
| BM-05 | Xác nhận chuyển khoản thủ công | Branch Manager |
| BM-06 | Huỷ đơn đã thanh toán, kèm lý do | Branch Manager |
| CS-01 | Tạo đơn tại quầy (kèm tuỳ chọn món) | Cashier |
| CS-02 | Thu tiền mặt, tính tiền thối | Cashier |
| CS-03 | Thu QR qua PayOS | Cashier |
| CS-04 | In bill và phiếu số | Cashier |
| CS-05 | Xem lịch sử đơn | Cashier |
| BA-01 | Xem hàng đợi pha chế (có gom món) | Barista |
| BA-02 | Cập nhật trạng thái từng món; món xong thì gọi số | Barista |
| BA-03 | Báo hết món | Barista |

Tổng: 2 + 1 + 5 + 10 + 6 + 5 + 3 = 32 use case. Không có giai đoạn 2: phạm vi đã được thu hẹp theo góp ý của hội đồng, nên toàn bộ danh sách trên là cam kết.

### 14.2. Đã cắt hẳn — không cam kết, không ghi vào SRS như lời hứa

Sơ đồ bàn, phiên bàn, xếp và ghép bàn, đặt bàn; phục vụ tại bàn và trả sau; ca mẫu, phân ca, check-in/check-out; ví doanh nghiệp, sổ cái, tạm giữ, quyết toán, rút tiền; phí giao dịch; hoàn tiền qua hệ thống; nhập menu bằng ảnh; audit log dạng màn hình xem (vẫn ghi log ở backend); voucher, giảm giá, khuyến mãi, tích điểm, thẻ thành viên; giá riêng theo chi nhánh; combo; báo cáo lợi nhuận và chi phí; chấm công và tính lương; xuất báo cáo ra Excel; AI phân tích và gợi ý chiến lược kinh doanh; khách tự order bằng điện thoại hoặc kiosk; giao hàng; quên mật khẩu qua email; quản lý kho nguyên liệu; hoá đơn điện tử; thanh toán thẻ và ví điện tử khác; thu phí thuê bao qua hệ thống; tên miền riêng theo doanh nghiệp; tải lên CSS hoặc phông chữ tuỳ ý; nhận diện riêng theo chi nhánh.

### 14.3. Quy ước vẽ Use Case Diagram

- Vẽ 6 sơ đồ: một tổng quan + năm sơ đồ theo actor (Platform Admin, Owner, Branch Manager, Cashier, Barista). Prospective Owner nằm trong sơ đồ tổng quan. Không vẽ một sơ đồ khổng lồ.

- Vẽ generalization từ năm actor lên Authenticated User.

- <<include>> chỉ dùng cho hành vi dùng lại ở nhiều use case: CS-02 và CS-03 cùng include CS-04 (in bill và phiếu số ngay sau thanh toán). Các bước tuần tự bên trong một use case viết vào luồng sự kiện, không vẽ thành bong bóng.

- Không vẽ hành vi hệ thống thành use case: gửi email, bắn thông báo, tính tổng tiền, cấp số gọi, gom món, tự huỷ QR hết hạn, hiển thị màn hình gọi số, hiển thị màn hình phía khách, đồng bộ giỏ giữa hai máy, áp nhận diện, kiểm tra gói. Ghép màn hình phía khách là cấu hình thiết bị, không vẽ thành use case.

- Hệ thống bên ngoài (mục 4.8) đặt ở phía phải khung hệ thống, không kế thừa Authenticated User. PayOS nối với CS-03, OW-06 và BM-05; dịch vụ AI nối với OW-09; dịch vụ email nối với PA-02 và PA-03.

## 15. Ma trận quyền

| Chức năng | Platform Admin | Owner | Branch Manager | Cashier | Barista |
| --- | --- | --- | --- | --- | --- |
| Nộp hồ sơ đăng ký | – | – | – | – | – |
| Duyệt / từ chối hồ sơ | Toàn quyền | – | – | – | – |
| Gói dịch vụ | Toàn quyền | Xem | – | – | – |
| Gia hạn, đổi gói, tạm ngưng doanh nghiệp | Toàn quyền | Xem | – | – | – |
| Chi nhánh | – | Toàn quyền | Xem chi nhánh mình | – | – |
| Bộ nhận diện thương hiệu | – | Toàn quyền | Nhận và hiển thị | Nhận và hiển thị | Nhận và hiển thị (giới hạn) |
| Liên kết PayOS | – | Toàn quyền | – | – | – |
| Món: tên, ảnh, giá | – | Toàn quyền | Xem | Xem | Xem, không giá |
| Tuỳ chọn món và giá cộng thêm | – | Toàn quyền | Xem | Xem | Xem, không giá |
| Bật/tắt món, tuỳ chọn cấp chuỗi | – | Toàn quyền | – | – | – |
| Bật/tắt món, tuỳ chọn cấp chi nhánh | – | Xem | Toàn quyền | – | Có |
| Tài khoản Branch Manager | – | Tạo/sửa | – | – | – |
| Tài khoản thu ngân và pha chế | – | Xem | Tạo/sửa | – | – |
| Quầy, thu hồi màn hình khách | – | – | Toàn quyền | – | – |
| Ghép màn hình khách với quầy | – | – | Có | Có | – |
| Tạo, sửa, huỷ đơn chưa thanh toán | – | – | – | Toàn quyền | – |
| Thu tiền mặt, tạo QR, kiểm tra lại | – | – | – | Toàn quyền | – |
| Xác nhận chuyển khoản thủ công | – | – | Toàn quyền | – | – |
| Huỷ đơn đã thanh toán | – | – | Toàn quyền | – | – |
| In bill, phiếu số, in lại | – | – | In lại | Toàn quyền | – |
| Tra cứu đơn | – | Xem | Chi nhánh mình | Trong ngày | – |
| Hàng đợi pha chế, trạng thái món | – | – | Xem | Xem trạng thái | Cập nhật |
| Báo cáo | Số liệu quản lý gói | Toàn chuỗi | Chi nhánh mình | – | – |
| So sánh đa chi nhánh (gói Tiêu chuẩn+) | – | Có | – | – | – |
| Trợ lý AI (gói Nâng cao) | – | Có | – | – | – |

## 16. Phạm vi

### Trong phạm vi

Luồng đăng ký và duyệt doanh nghiệp; multi-tenant ba tầng với cô lập dữ liệu; ba gói dịch vụ với hạn mức và tính năng chặn ở backend; tuỳ biến nhận diện thương hiệu theo chuỗi; cấu hình chi nhánh, menu, tuỳ chọn món có giá cộng thêm; POS tại quầy trên tablet Android với màn hình phía khách là tablet Android thứ hai, ghép bằng mã và đồng bộ thời gian thực qua Socket.IO; thu tiền mặt có tính tiền thối; thu QR qua PayOS về thẳng tài khoản chủ chuỗi, webhook có kiểm chữ ký và xử lý idempotent, xác nhận thủ công có kiểm soát; in bill và phiếu số bằng lệnh ESC/POS tới máy in nhiệt của quầy, bill dựng thành ảnh có tiếng Việt và logo chuỗi; hàng đợi pha chế thời gian thực với thuật toán gom món; gọi số và màn hình gọi số; báo cáo chi nhánh và báo cáo đa chi nhánh; trợ lý AI hỏi đáp số liệu kinh doanh; RBAC và audit log ở backend.

### Ngoài phạm vi — cố ý loại trừ

| Hạng mục | Lý do |
| --- | --- |
| Phục vụ tại bàn, trả sau, quản lý bàn, đặt bàn | Khác loại hình. Mô hình trả trước làm các bài toán này biến mất (1.5) |
| Ví, thu hộ, tạm giữ, quyết toán, rút tiền | Nền tảng không giữ tiền; tiền về thẳng chủ chuỗi (mục 11) |
| Phí trên giao dịch | Doanh thu nền tảng chỉ là thuê bao |
| Hoàn tiền qua hệ thống | PayOS chuyển thẳng vào tài khoản chủ chuỗi; quán tự hoàn, hệ thống ghi nhận |
| Hoá đơn điện tử theo quy định thuế Việt Nam | Cần đăng ký với cơ quan thuế. Bắt buộc nêu khi bảo vệ |
| Quản lý kho nguyên liệu | Cần định mức và kiểm kê, là một hệ thống riêng. Thay bằng báo hết món và hết tuỳ chọn |
| Báo cáo lợi nhuận | Không có dữ liệu chi phí vì không quản lý kho và không tính lương |
| Ca làm, chấm công, tính lương | Không cần cho điều phối trong loại hình tại quầy; là module nhân sự riêng |
| Khách tự order bằng điện thoại hoặc kiosk | Gọi món tại quầy là quy trình của loại hình này; tự order là mở rộng sau |
| Voucher, khuyến mãi, tích điểm, thẻ thành viên | Quá phức tạp so với thời gian |
| Giá riêng theo chi nhánh | Làm phức tạp bảng giá và báo cáo so sánh, không đáng với quy mô 2–10 chi nhánh |
| Thanh toán thẻ, ví điện tử khác | Tiền mặt và QR ngân hàng đã phủ phần lớn giao dịch tại quầy |
| Thu phí thuê bao qua hệ thống | Thu ngoài hệ thống, Admin gia hạn thủ công |
| AI phân tích, gợi ý chiến lược kinh doanh | Không có đáp án đúng để kiểm chứng (9.2) |
| Nhập menu bằng ảnh | Cắt để thu hẹp phạm vi; menu chuỗi đồ uống ít món, nhập tay được |
| Chế độ hoạt động offline | Rủi ro cố hữu của POS đám mây, ghi nhận ở mục 17 |
| Tên miền riêng, tải lên CSS, phông chữ, đổi bố cục | Tuỳ biến dừng ở logo, màu, tên |
| Nhận diện riêng theo chi nhánh | Nhận diện là của chuỗi |
| Tích hợp giao hàng bên thứ ba | Không thuộc bài toán tại quầy |
| Đa ngôn ngữ, đa tiền tệ | Không cần cho thị trường mục tiêu |
| Tự huấn luyện mô hình AI | Chỉ gọi API sẵn, đúng ràng buộc đề tài |
| Nhiều máy in theo trạm (in phiếu cho quầy pha chế, in tem dán ly) | Mỗi quầy một máy in bill; pha chế xem món trên tablet, không cần phiếu giấy |

## 17. Giả định và giới hạn đã biết

Mục này để trả lời phản biện. Chủ động nêu ra luôn được đánh giá cao hơn là bị phát hiện.

GĐ-01 — Chỉ hợp với loại hình gọi tại quầy. Nhà hàng phục vụ tại bàn và trả sau không phải khách hàng mục tiêu. Đây là lựa chọn phạm vi, không phải thiếu sót.

GĐ-02 — Chủ chuỗi phải tự mở kênh PayOS. Nền tảng không mở tài khoản thay; chưa liên kết thì chỉ thu tiền mặt.

GĐ-03 — Phụ thuộc PayOS. PayOS lỗi hoặc chậm thì QR chậm theo; dự phòng bằng Kiểm tra lại, xác nhận thủ công và tiền mặt.

GĐ-04 — Xác nhận thủ công có rủi ro ảnh chụp màn hình giả. Giới hạn ở Branch Manager, bắt buộc lý do và ghi audit log để truy vết, nhưng không loại bỏ được rủi ro hoàn toàn.

GĐ-05 — Hoàn tiền nằm ngoài hệ thống. Hệ thống ghi số tiền phải hoàn và hình thức hoàn; việc chuyển trả là của quán.

GĐ-06 — Thời gian pha không được mô hình hoá. Gom món cố ý không dùng thời gian pha vì không đo được (8.1).

GĐ-07 — AI không đạt 100%. Trợ lý có thể hiểu sai câu hỏi mơ hồ; luôn hiện khoảng thời gian đã hiểu, bảng số và truy vấn đã chạy để Owner tự kiểm tra. Tỷ lệ trả lời đúng được đo và công bố, không giấu.

GĐ-08 — Mất internet là ngừng bán. Rủi ro cố hữu của POS đám mây, không xử lý trong phạm vi đồ án.

GĐ-09 — Không xuất hoá đơn điện tử theo quy định thuế. Đã biết và cố ý loại trừ.

GĐ-10 — Bán hàng, ký hợp đồng và thu phí thuê bao diễn ra ngoài hệ thống. Hệ thống chỉ nhận hồ sơ, cho Admin duyệt và gia hạn thủ công.

GĐ-11 — Tuỳ biến nhận diện là white-label mức nhẹ. Đổi được logo, màu, tên hiển thị. Không đổi được tên miền, phông chữ, bố cục, nhãn chức năng.

GĐ-12 — Màu do khách hàng chọn có thể xấu. Hệ thống bảo đảm đọc được, không bảo đảm đẹp.

GĐ-13 — Số liệu gói là ví dụ. Hạn mức và giá thật do nhóm chốt, là cấu hình của Admin nên đổi được mà không sửa mã.

GĐ-14 — Mỗi quầy cần hai tablet Android. Thiếu máy thứ hai thì POS vẫn chạy; QR hiện trên màn hình POS và thu ngân xoay màn hình cho khách quét.

GĐ-15 — Máy in phải hỗ trợ ESC/POS. Hệ thống chỉ làm việc với máy in nhiệt nhận lệnh ESC/POS qua Bluetooth hoặc WiFi; máy in nhãn dùng app riêng của hãng không dùng được. Nội dung in là ảnh nên in chậm hơn in chữ vài giây mỗi tờ, đổi lại in đúng tiếng Việt và logo trên mọi máy.

## 18. Yêu cầu phi chức năng

Các chỉ tiêu dưới đây là mục tiêu cho môi trường demo: máy chủ ở Singapore hoặc Việt Nam, mạng 4G hoặc Wi‑Fi bình thường. Tất cả được đo ở tuần 10 (tài liệu Kế hoạch, mục 2) và đưa kết quả vào tài liệu bảo vệ.

| Yêu cầu | Nhóm | Chỉ tiêu |
| --- | --- | --- |
| Chốt đơn tiền mặt, từ lúc bấm Xác nhận tới khi POS báo thành công | Hiệu năng | ≤ 1 giây |
| Từ lúc webhook PayOS tới backend tới khi POS và màn hình khách báo Đã nhận | Hiệu năng | ≤ 3 giây |
| Giỏ trên POS hiện lên màn hình phía khách | Hiệu năng | ≤ 300 ms |
| Đơn đã thanh toán lên màn hình pha chế; số gọi lên màn hình gọi số khi đơn xong | Hiệu năng | ≤ 2 giây |
| In xong bill và phiếu số sau khi thanh toán | Hiệu năng | ≤ 5 giây |
| Mỗi quầy một đơn mỗi 30 giây giờ cao điểm | Tải | Mô phỏng 10 chi nhánh × 2 quầy chạy cùng lúc 15 phút: không lỗi, vẫn đạt các chỉ tiêu hiệu năng |
| Thời gian trả lời và độ chính xác | Trợ lý AI | ≤ 10 giây mỗi câu; tỷ lệ đúng đo và công bố trên bộ 30 câu (9.7) |
| Cô lập dữ liệu giữa doanh nghiệp | Bảo mật | 100% ca truy cập chéo bị chặn, qua API, Socket.IO và trợ lý AI |
| Khoá PayOS | Bảo mật | Mã hoá AES-256-GCM khi lưu; không xuất hiện trong phản hồi API và log (BR-25) |
| Mật khẩu, phiên và thiết bị | Bảo mật | Mật khẩu băm bcrypt; token đăng nhập có hạn; token thiết bị thu hồi được (BR-45) |
| Thanh toán đồng thời | Tin cậy | Webhook trùng hoặc tới cùng lúc với xác nhận thủ công không cấp hai số gọi, không ghi tiền hai lần (test ở 11.8) |
| Màn hình khách hoặc máy in mất kết nối | Tin cậy | Không chặn bán hàng (BR-21, BR-47); tự kết nối lại trong ≤ 10 giây khi có mạng |
| Thao tác thu ngân | Dễ dùng | Đơn một món dùng tuỳ chọn mặc định, trả tiền mặt vừa đủ: ≤ 6 lần chạm từ chọn món tới in bill |
| Giao diện pha chế | Dễ dùng | Chữ ≥ 20px, nút cao ≥ 60px, không hộp thoại xác nhận (4.7) |
| Thiết bị | Tương thích | App: Android 10 trở lên. Web: Chrome, Edge bản mới. Màn hình gọi số: trình duyệt trên TV hoặc tablet |
