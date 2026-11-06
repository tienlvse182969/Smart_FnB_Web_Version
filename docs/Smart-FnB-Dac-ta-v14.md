Smart F&B Chain Platform

Phân tích nghiệp vụ & Đặc tả dự án — Phiên bản 14

**Mã đề tài:** SP26SE123

**Giảng viên hướng dẫn:** Tôn Thất Hoàng Minh

**Quy mô nhóm:** 4 sinh viên (2 Frontend, 2 Backend) — 11 tuần thực thi

**Hiệu lực:** bản duy nhất đang dùng, thay thế mọi bản đặc tả trước, kể cả bản 7.0, 8.0, 8.1, 9.0, 9.1, 9.2, 10, 11, 12 và 13

**Căn cứ thay đổi:** tài liệu "Scope mới" sau góp ý của hội đồng — phạm vi v7 quá rộng; chuyển sang mô hình chuỗi gọi món và trả tiền tại quầy.

## Mục lục

0. Tài liệu này là gì
1. Sản phẩm
2. Mô hình tổ chức dữ liệu
3. Từ điển thuật ngữ
4. Actor
5. Vòng đời trạng thái
6. Luồng nghiệp vụ
7. Quy tắc nghiệp vụ
8. Thuật toán gom món trong hàng đợi pha chế
9. AI trong sản phẩm
10. Tuỳ biến nhận diện thương hiệu theo chuỗi
11. Thanh toán QR qua PayOS và màn hình phía khách
12. Tuỳ chọn món
13. Gói dịch vụ và phân cấp tính năng
14. Danh sách use case
15. Ma trận quyền
16. Phạm vi
17. Giả định và giới hạn đã biết
18. Yêu cầu phi chức năng
19. In bill và phiếu số
20. Áp phích màn hình phía khách
21. Màn hình TV hiển thị áp phích và menu (dự kiến)
22. Cấp tài khoản và mật khẩu tạm
23. Số máy rung
24. Nhập menu bằng ảnh (OCR + AI)
25. Thanh toán thuê bao và dùng thử
26. Combo và combo biến thể món
27. Topping thêm của món (menu item extra)
28. Hoàn tiền mặt tại quầy
29. Giá menu theo chi nhánh
30. Platform Staff và doanh thu nền tảng

## 0. Tài liệu này là gì

Đặc tả nghiệp vụ và phạm vi của Smart F&B Chain Platform. Mọi tài liệu khác của nhóm — SRS, Use Case Diagram, Activity Diagram, ERD, slide bảo vệ — lấy mã use case, mã quy tắc và số liệu từ bản này.

Bốn phần nghiệp vụ nặng nhất và cần đọc kỹ nhất: thanh toán QR qua PayOS (mục 11), tuỳ chọn món (mục 12), thuật toán gom món (mục 8) và nhập menu bằng ảnh bằng OCR và AI (mục 24). Bản 14 thêm ba phần cần đọc kỹ: combo (mục 26), hoàn tiền mặt tại quầy (mục 28) và giá theo chi nhánh (mục 29).

### 0.1. Cách đọc

| **Bạn là**             | **Đọc kỹ mục**                                                              |
| ---------------------- | --------------------------------------------------------------------------- |
| Ai cũng cần            | 0.2, 1, 3, 4, 6                                                             |
| ---                    | ---                                                                         |
| Backend                | 2, 5, 7, 8, 9, 11, 12, 13, 15, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30   |
| ---                    | ---                                                                         |
| Frontend               | 4, 6, 8, 10, 11, 12, 14, 15, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30 |
| ---                    | ---                                                                         |
| Người viết SRS         | Toàn bộ, đặc biệt 7, 14, 15, 16 và 26–30                                    |
| ---                    | ---                                                                         |
| Người trình bày bảo vệ | 1.5, 17 và tài liệu Kế hoạch                                                |
| ---                    | ---                                                                         |

### 0.2. Phiên bản và tài liệu đi kèm

**Bản 14.** So với bản 7.0: đổi sang chuỗi gọi món và trả tiền tại quầy, bỏ bàn, ví, ca làm; từ 60 use case còn 32. Bản 8.1 thêm hai tablet ở quầy, ghép màn hình phía khách và đồng bộ qua Socket.IO. Bản 9.0 đổi cách in bill sang lệnh ESC/POS, làm rõ xác nhận thủ công và huỷ đơn đã thanh toán, thêm yêu cầu phi chức năng (mục 18). Bản 9.1 chốt cách ghép màn hình phía khách bằng mã OTP 6 số (bỏ cách quét mã QR), quy định cách sinh mã, hạn dùng và chống dò mã, thêm luồng trao token và các sự kiện ghép, thu hồi trên Socket.IO (11.10, 11.11, BR-45, 6.10).

Bản 9.2 cập nhật theo mã nguồn đã làm, gồm ba thay đổi:

- **In bill và phiếu số** viết lại theo đúng bản đã chạy: POS lấy dữ liệu bill từ backend, tự dựng bill thành ảnh rồi in qua Bluetooth; có chế độ dự phòng in chữ không dấu, in thử, in lại có lý do (CS-04, mục 19, BR-53, 6.11)
- **Áp phích màn hình phía khách** — use case mới OW-11: Owner quản lý áp phích hiện trên màn hình phía khách của mọi chi nhánh trong chuỗi (mục 20, BR-51, BR-52, 6.12). Từ 32 lên 33 use case
- **Màn hình TV hiển thị áp phích và menu** ở quầy thu ngân và quầy pha chế — phần dự kiến, làm nếu còn thời gian, không tính vào cam kết (mục 21)

Bản 10 thêm ba tính năng và bỏ một, từ 33 thành 34 use case:

- **Cấp tài khoản bằng mật khẩu tạm** — Admin cấp tài khoản Owner, Owner cấp Branch Manager, Branch Manager cấp thu ngân và pha chế: hệ thống tự sinh mật khẩu tạm và gửi email gồm email đăng nhập và mật khẩu đó; đăng nhập lần đầu phải đổi sang mật khẩu riêng mới dùng tiếp được; quên mật khẩu thì báo cấp trên đặt lại, hệ thống gửi mật khẩu tạm mới (mục 22, BR-54 đến BR-57; sửa PA-02, PA-05, OW-05, BM-01, CM-01)
- **Số máy rung** — use case mới CS-06: thu ngân gắn số máy rung vào đơn vừa thanh toán để pha chế biết đơn nào thuộc máy nào và báo món đúng khách (mục 23, BR-58, BR-59)
- **Nhập menu bằng ảnh (OCR + AI)** — use case mới OW-12: OCR đọc chữ trong ảnh menu thành văn bản thô, AI sắp văn bản đó vào menu toàn chuỗi, Owner duyệt bản nháp rồi mới nhập. Đưa lại phần đã cắt ở bản 8.0; mọi gói đều dùng; là tính năng duy nhất dùng AI (mục 24, BR-60 đến BR-63)
- **Bỏ trợ lý AI hỏi đáp số liệu** (OW-09): báo cáo chi nhánh và báo cáo đa chi nhánh đã đủ cho việc quản lý, trợ lý không giúp thêm nhiều mà tốn chi phí gọi mô hình và kiểm thử an toàn. Nhập menu bằng ảnh là tính năng duy nhất dùng AI (mục 9). Mã OW-09, BR-38, BR-39, BR-40 bỏ trống, không cấp lại

Bản 11 làm rõ tính năng số máy rung theo đúng cách quán vận hành; vẫn 34 use case, không thêm use case mới:

- **Số máy rung đi kèm trong đơn gửi xuống pha chế** — khách thanh toán xong, thu ngân nhập số máy rung vào chính đơn đó; số này là một trường của đơn và có mặt trong mọi dữ liệu đơn màn hình pha chế nhận (hàng đợi, danh sách Sẵn sàng, sự kiện realtime), pha chế không phải hỏi lại thu ngân (23.6, BR-64)
- **Pha chế báo máy rung dựa trên dữ liệu đơn** — đơn đủ món thì màn hình pha chế phát âm báo và hiện "Báo máy rung số 12" lấy từ đơn; pha chế bấm số đó trên bộ phát rồi chạm Đã báo để đánh dấu; thu ngân đổi số sau khi đã báo thì nhắc hiện lại với số mới (5.11, 23.3, 23.5, BR-65)
- **Làm rõ tình huống và nghiệm thu** — nhập số khi đơn đã Đang pha hoặc đã Sẵn sàng, đổi số sau khi đã báo, màn hình pha chế mất kết nối; thêm hợp đồng dữ liệu (API, sự kiện) và tiêu chí nghiệm thu cho tính năng (6.10, 23.6, 23.8)

Bản 12 cập nhật hạn mức và giá dự kiến của ba gói; không đổi tính năng, vẫn 34 use case:

- **Hạn mức mới** — Cơ bản ≤ 3 chi nhánh, ≤ 30 tài khoản; Tiêu chuẩn ≤ 6 chi nhánh, ≤ 55 tài khoản; Nâng cao ≤ 10 chi nhánh, ≤ 90 tài khoản. Tính theo ước lượng khoảng 8 tài khoản mỗi chi nhánh cộng 1 Owner, có dư cho nhân viên thời vụ (13.1)
- **Giá dự kiến** — 590.000đ, 1.090.000đ và 1.690.000đ mỗi tháng; nếu dùng hết hạn mức thì khoảng 197.000đ, 182.000đ và 169.000đ mỗi chi nhánh, rẻ dần khi lên gói. Giá chỉ để nhóm bàn, chưa chốt (13.1, CC-01, GĐ-13)
- **Phân tính năng theo gói giữ như cũ** — mọi gói có đủ POS, pha chế, số máy rung, áp phích, nhập menu bằng ảnh; nhận diện thương hiệu và so sánh đa chi nhánh từ gói Tiêu chuẩn; Nâng cao khác Tiêu chuẩn ở hạn mức (13.1)

Bản 13 đưa việc thu phí thuê bao vào hệ thống và thêm dùng thử; từ 34 lên 36 use case:

- **Thu phí thuê bao qua PayOS của nền tảng** — đi theo cách trường đại học thu học phí: Admin duyệt hồ sơ thì hệ thống gửi email kèm link kích hoạt; chủ quán bấm link, vào trang thanh toán và quét QR PayOS để trả tháng đầu. Tiền thuê bao về tài khoản ngân hàng của nền tảng qua kênh PayOS riêng của nền tảng, tách hẳn kênh PayOS bán hàng của từng chuỗi (mục 25, BR-66 đến BR-73; sửa BR-03, BR-06, BR-07, BR-09, BR-10, GĐ-10)
- **Gia hạn tự phục vụ** — trước ngày hết hạn 7 ngày, hệ thống lập hoá đơn kỳ tiếp theo và gửi email kèm link vào đúng trang Gói dịch vụ trên web của Owner; Owner đăng nhập, quét QR PayOS là được gia hạn thêm một tháng ngay. Chưa trả thì nhắc lại khi còn 3 ngày và đúng ngày hết hạn. Admin chỉ còn gia hạn thủ công cho trường hợp ngoại lệ (25.3, 25.5, use case mới OW-13)
- **Dùng thử 14 ngày gói Cơ bản** — ở trang kích hoạt, chủ quán chọn trả tháng đầu hoặc dùng thử 14 ngày gói Cơ bản không mất phí; mỗi mã số thuế dùng thử một lần. Trước khi hết hạn dùng thử 5 ngày và 3 ngày, hệ thống tự gửi email nhắc để Owner có thời gian đánh giá trải nghiệm và quyết định mua; hết hạn mà không mua thì doanh nghiệp chuyển chỉ đọc (25.4, use case mới GU-02)
- **Tài khoản Owner sinh khi kích hoạt** — Admin duyệt hồ sơ không còn sinh tài khoản ngay và không chọn ngày hết hạn nữa. Doanh nghiệp, tài khoản Owner và email mật khẩu tạm chỉ sinh khi chủ quán kích hoạt xong; ngày hết hạn tính từ lần thanh toán hoặc từ lúc bắt đầu dùng thử (5.1, 5.2, 6.1, PA-02, PA-05)

Bản 14 thêm bán combo, topping thêm của món, hoàn tiền mặt tại quầy, giá theo chi nhánh và vai trò Platform Staff, đồng thời đổi tên hai vai trò; từ 36 lên 43 use case:

- **Đổi tên vai trò** — Owner thành Brand Manager, Branch Manager (gọi tắt Manager) thành Store Manager trong toàn bộ đặc tả. Chỉ đổi tên, không đổi quyền. Mã use case giữ tiền tố cũ — OW- là của Brand Manager, BM- là của Store Manager — để SRS, sơ đồ và mã nguồn không phải đánh lại mã. Phần lịch sử các bản trước ở trên giữ tên cũ
- **Combo và combo biến thể món** — use case mới OW-14: Brand Manager tạo combo có giá riêng, gồm các thành phần; mỗi thành phần là một món cố định hoặc một nhóm biến thể để khách chọn một món, có phụ thu nếu cần. Thu ngân bán combo ngay trong CS-01; các món trong combo xuống pha chế như ly thường và vẫn được gom (mục 26, BR-77 đến BR-79)
- **Topping thêm của món (menu item extra)** — use case mới OW-15: Brand Manager khai báo topping một lần trong thư viện của chuỗi rồi gắn vào từng món, với giá cộng thêm và số phần tối đa riêng theo món; thu ngân chọn được nhiều phần của cùng một topping. Thay cho nhóm tuỳ chọn Topping dùng chung của bản 13 (mục 27, BR-80)
- **Hoàn tiền mặt tại quầy** — use case mới CS-07: thu ngân hoàn tiền cho đơn đã thanh toán trong ngày bán, toàn bộ hoặc từng dòng, bắt buộc lý do. Mọi khoản hoàn đều trả bằng tiền mặt tại quầy, kể cả đơn khách đã trả bằng QR; bỏ hình thức hoàn bằng chuyển khoản ngoài hệ thống và trạng thái Chờ chủ chuỗi hoàn vì luồng chuyển khoản quá phức tạp. Store Manager vẫn hoàn được mọi đơn của chi nhánh (BM-06) (mục 28, BR-81 đến BR-83; sửa BR-18, BR-23, BR-28, BR-31, BR-49)
- **Giá menu theo chi nhánh** — use case mới OW-16: giá chuỗi là giá mặc định; Brand Manager đặt giá riêng cho từng chi nhánh với món và combo. Tuỳ chọn, topping và phụ thu biến thể giữ một giá toàn chuỗi (mục 29, BR-84, BR-85; sửa BR-13, BR-15)
- **Platform Staff** — vai trò mới của nền tảng: xem, duyệt và từ chối hồ sơ đăng ký (PA-01 đến PA-03 chuyển sang Platform Staff, giữ mã), hỗ trợ khách đăng ký gói sau khi hồ sơ đã được duyệt (use case mới PS-01). Platform Admin kế thừa mọi việc của Platform Staff, xem doanh thu của nền tảng (PA-06) và cấp tài khoản Platform Staff (PA-07) (mục 30, BR-74 đến BR-76; sửa BR-05, BR-07, BR-56)

**Tài liệu đi kèm:** lịch sử thay đổi chi tiết, lịch 11 tuần, ước lượng khối lượng, rủi ro, điểm chưa chốt (các mã CC-xx), việc phải làm và câu hỏi hội đồng dễ hỏi nằm ở tài liệu **Kế hoạch dự án và chuẩn bị bảo vệ**. Tài liệu đó dùng nội bộ, không gửi kèm đặc tả.

## 1. Sản phẩm

### 1.1. Một câu

Phần mềm bán hàng tại quầy cho thuê theo tháng, để chuỗi cà phê, trà sữa và đồ ăn nhanh tự cấu hình menu có tuỳ chọn, mang nhận diện riêng của mình, thu tiền mặt hoặc QR về thẳng tài khoản của chủ chuỗi, và đẩy món xuống quầy pha chế ngay khi khách trả tiền.

Không phải ứng dụng đặt món cho người tiêu dùng. Khách hàng cuối không cài gì, không có tài khoản, không biết tên sản phẩm này.

### 1.2. Ai trả tiền

Chủ chuỗi F&B quy mô 2–10 chi nhánh. Nền tảng chỉ thu **một khoản: phí thuê bao theo tháng**, theo gói Cơ bản, Tiêu chuẩn hoặc Nâng cao (mục 13). Phí thu ngay trong hệ thống qua PayOS, giống cách trường đại học thu học phí: hệ thống gửi email kèm link tới trang thanh toán, chủ chuỗi quét QR để trả tháng đầu và gia hạn mỗi tháng; tiền về tài khoản ngân hàng của nền tảng (mục 25). Chuỗi mới được dùng thử 14 ngày gói Cơ bản trước khi quyết định mua.

Không có phí giao dịch. Tiền bán hàng — cả tiền mặt lẫn QR — không đi qua nền tảng (mục 11). Phí thuê bao đi qua một kênh PayOS riêng của nền tảng, tách hẳn kênh bán hàng của từng chuỗi (2.3).

### 1.3. Loại hình cửa hàng

Chuỗi F&B gọi món và trả tiền tại quầy, 2–10 chi nhánh, cùng một chủ. Gồm cà phê, trà sữa, đồ uống mang đi, và đồ ăn nhanh gọi tại quầy như bánh mì hay cơm văn phòng.

**Quy trình chung:**

```
Gọi món tại quầy  →  Trả tiền (tiền mặt hoặc QR)  →  Món xuống quầy pha chế
                  →  Gọi số  →  Khách nhận
```

### 1.4. Vấn đề thật mà hệ thống giải

| **Vấn đề ngoài quán**                                                                            | **Cách giải**                                                                                                              |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Giờ cao điểm, thu ngân ghi tay hoặc hô món cho pha chế, nghe nhầm size, đường, đá                | Thu ngân nhập món kèm tuỳ chọn trên POS; đơn hiện thẳng trên màn hình pha chế ngay khi khách trả tiền                      |
| ---                                                                                              | ---                                                                                                                        |
| Trà sữa có size, đường, đá, topping; cộng tiền tay dễ nhầm                                       | Giá tuỳ chọn cộng tự động, tính ở backend, lưu giá tại thời điểm bán                                                       |
| ---                                                                                              | ---                                                                                                                        |
| Khách chuyển khoản rồi chìa màn hình, thu ngân không biết thật hay giả, phải mở app ngân hàng dò | PayOS gửi webhook, POS báo "Đã nhận 45.000đ" kèm âm thanh — không ai phải dò sao kê                                        |
| ---                                                                                              | ---                                                                                                                        |
| Tính tiền thối nhầm khi đông khách                                                               | Nhập số tiền khách đưa, hệ thống tính tiền thối                                                                            |
| ---                                                                                              | ---                                                                                                                        |
| Pha chế làm lần lượt từng đơn, cùng một loại ly bị pha rời nhiều lần                             | Hàng đợi gom các ly cùng món, cùng size thành một mẻ (mục 8)                                                               |
| ---                                                                                              | ---                                                                                                                        |
| Khách đứng chờ không biết tới lượt mình chưa, quầy ồn gọi tên không nghe                         | Phiếu số in kèm bill, màn hình gọi số và âm báo                                                                            |
| ---                                                                                              | ---                                                                                                                        |
| Hết trân châu mà thu ngân vẫn bán, khách trả tiền rồi mới biết                                   | Pha chế báo hết món hoặc hết topping, POS chặn bán ngay                                                                    |
| ---                                                                                              | ---                                                                                                                        |
| Chủ ở nhà không biết chi nhánh nào bán tốt                                                       | Báo cáo so sánh đa chi nhánh                                                                                               |
| ---                                                                                              | ---                                                                                                                        |
| Màn hình quay về phía khách mang logo của một phần mềm lạ                                        | Brand Manager cấu hình logo, màu, tên chuỗi; màn hình khách, màn hình gọi số, bill và phiếu số đều mang nhận diện của quán |
| ---                                                                                              | ---                                                                                                                        |
| Máy in nhiệt giá rẻ in tiếng Việt thành chữ lỗi                                                  | POS dựng bill thành ảnh rồi mới in, đúng dấu và có logo trên mọi máy in ESC/POS (mục 19)                                   |
| ---                                                                                              | ---                                                                                                                        |
| Màn hình quay về phía khách đứng yên lúc vắng khách, phí một chỗ quảng cáo ngay trước mặt khách  | Brand Manager tải áp phích món mới, khuyến mãi một lần; màn hình phía khách của mọi chi nhánh tự xoay vòng (mục 20)        |
| ---                                                                                              | ---                                                                                                                        |
| Quán đông, gọi số ồn, khách ngồi xa không nghe số của mình                                       | Thu ngân gắn số máy rung vào đơn; pha chế thấy đúng số máy để bấm, đúng khách lên nhận món (mục 23)                        |
| ---                                                                                              | ---                                                                                                                        |
| Mở quán mới phải gõ tay vài chục món kèm size, topping, giá                                      | Chụp ảnh menu; OCR đọc chữ, AI sắp vào menu, Brand Manager duyệt rồi nhập (mục 24)                                         |
| ---                                                                                              | ---                                                                                                                        |
| Cấp tài khoản cho nhân viên phải tự nghĩ mật khẩu rồi nhắn riêng                                 | Hệ thống tự sinh mật khẩu tạm và gửi email; nhân viên đổi sang mật khẩu riêng ngay lần đăng nhập đầu (mục 22)              |
| ---                                                                                              | ---                                                                                                                        |
| Thuê phần mềm mà phải chuyển khoản rồi chờ bên bán xác nhận; quên ngày gia hạn là bị khoá        | Email nhắc trước hạn kèm link tới đúng trang thanh toán; quét QR PayOS là gia hạn ngay, không chờ ai duyệt (mục 25)        |
| ---                                                                                              | ---                                                                                                                        |
| Quán bán theo bộ (bánh mì kèm cà phê) phải bấm từng món rồi tự trừ tiền                          | Brand Manager tạo combo có giá riêng; thu ngân chọn combo, chọn món cho từng phần, giá tính tự động (mục 26)               |
| ---                                                                                              | ---                                                                                                                        |
| Khách muốn thêm hai phần trân châu; mỗi món có topping và giá topping khác nhau                  | Topping gắn riêng cho từng món, chọn được nhiều phần, giá theo món (mục 27)                                                |
| ---                                                                                              | ---                                                                                                                        |
| Khách đã chuyển khoản rồi đổi ý, quán phải chờ chủ chuỗi chuyển trả                              | Thu ngân hoàn tiền mặt ngay tại quầy kèm lý do và phiếu hoàn; cuối ngày két khớp với hệ thống (mục 28)                     |
| ---                                                                                              | ---                                                                                                                        |
| Chi nhánh ở sân bay, trung tâm thương mại cần bán giá khác                                       | Brand Manager đặt giá riêng cho chi nhánh đó; các chi nhánh khác giữ giá chuỗi (mục 29)                                    |
| ---                                                                                              | ---                                                                                                                        |
| Chưa biết phần mềm có hợp quán mình không mà đã phải trả tiền                                    | Dùng thử 14 ngày gói Cơ bản; email nhắc trước khi hết hạn để kịp đánh giá và quyết định mua (mục 25)                       |
| ---                                                                                              | ---                                                                                                                        |
| Mua POS truyền thống thì đắt và phải mua máy                                                     | Thuê tháng, chạy trên máy tính bảng Android phổ thông và trình duyệt sẵn có                                                |
| ---                                                                                              | ---                                                                                                                        |

### 1.5. Mô hình trả trước giải các bài toán hội đồng đã nêu

| **Bài toán hội đồng nêu** | **Mô hình trả trước**                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Quản lý bàn, chỗ ngồi     | Không cần. Khách ngồi đâu cũng được, nhận món theo số                                                                       |
| ---                       | ---                                                                                                                         |
| Khách huỷ món             | Trước khi trả thì sửa thoải mái. Sau khi trả thì thu ngân hoàn tiền mặt kèm lý do; đơn của ngày trước do Store Manager hoàn |
| ---                       | ---                                                                                                                         |
| Tách món, tách bill       | Mỗi người tự gọi và tự trả tại quầy                                                                                         |
| ---                       | ---                                                                                                                         |
| Khách không trả tiền      | Chưa trả thì chưa pha, nên không có thiệt hại                                                                               |
| ---                       | ---                                                                                                                         |

Đây là lý do chọn loại hình này, nên phải nói ngay từ slide đầu khi bảo vệ. Bốn bài toán trên không được "giải bằng tính năng" mà biến mất do đổi quy trình.

### 1.6. Phân khúc mục tiêu

**Phù hợp:** chuỗi cà phê, trà sữa, nước ép, đồ uống mang đi; quán đồ ăn nhanh gọi tại quầy như bánh mì, cơm văn phòng, xôi; quy mô 2–10 chi nhánh.

**Không nhắm tới:** nhà hàng phục vụ tại bàn và trả sau, buffet, quán nhậu, lẩu nướng, chuỗi trên 10 chi nhánh, mô hình chủ yếu bán qua ứng dụng giao hàng.

## 2. Mô hình tổ chức dữ liệu

```
NỀN TẢNG  (bên bán phần mềm: Platform Admin, Platform Staff — không giữ tiền của quán)
│
├── Doanh nghiệp A ── Brand Manager   (gói Tiêu chuẩn)
│   │   nhận diện riêng: logo, màu cam · kênh PayOS của A
│   ├── Chi nhánh Q1 ── Store Manager ── Cashier, Barista
│   └── Chi nhánh Q7 ── Store Manager ── Cashier, Barista
│
└── Doanh nghiệp B ── Brand Manager   (gói Cơ bản)
    │   nhận diện mặc định · kênh PayOS của B
    └── Chi nhánh Thủ Đức          (không thấy gì của A)
```

**Quy tắc vàng:** mọi truy vấn dữ liệu vận hành phải lọc theo doanh nghiệp. Không có ngoại lệ. Ai làm rớt điều kiện này là tạo lỗ hổng rò rỉ dữ liệu giữa hai khách hàng trả tiền.

### 2.1. Chuỗi cấp tài khoản

```
Platform Admin ──cấp──► Platform Staff
Chủ quán nộp hồ sơ ──► Platform Staff duyệt, chọn gói ──► email kèm link kích hoạt
Chủ quán kích hoạt (trả tháng đầu hoặc dùng thử) ──► sinh tài khoản Brand Manager

Brand Manager ──cấp──► Store Manager ──cấp──► Cashier + Barista
```

Tài khoản Brand Manager không do Platform Admin hay Platform Staff tạo thủ công từ đầu, mà sinh ra khi chủ quán kích hoạt dịch vụ từ link trong email duyệt hồ sơ — trả tháng đầu hoặc chọn dùng thử (mục 25). Từ tầng Brand Manager trở xuống, mỗi tầng chỉ tạo được tài khoản của tầng ngay dưới. Không có đường tắt. Tổng số tài khoản của doanh nghiệp bị giới hạn theo gói (mục 13). Mỗi lần cấp tài khoản, hệ thống tự sinh mật khẩu tạm và gửi email cho người được cấp; người đó phải đổi mật khẩu ở lần đăng nhập đầu. Quên mật khẩu thì chỉ cấp trên trực tiếp đặt lại (mục 22). Tài khoản Platform Staff do Platform Admin cấp theo cùng cách (PA-07).

### 2.2. Nhận diện chảy xuống theo cùng chuỗi đó

```
Brand Manager cấu hình nhận diện (logo, màu, tên hiển thị)   — gói Tiêu chuẩn trở lên
        │
        ├──► màn hình Brand Manager
        ├──► màn hình Store Manager
        ├──► POS của thu ngân
        ├──► màn hình phía khách        ◄── khách nhìn thấy
        ├──► màn hình gọi số            ◄── khách nhìn thấy
        ├──► màn hình pha chế           (áp có giới hạn — xem 10.4)
        └──► bill và phiếu số in ra cho khách
```

Nhận diện là thuộc tính của doanh nghiệp, không phải của người dùng và không phải của chi nhánh. Một tài khoản thu ngân mới được Store Manager tạo ra hôm nay, đăng nhập lần đầu đã thấy màu của chuỗi ngay, không cần ai cấu hình thêm gì.

### 2.3. Tiền đi theo đường nào

```
Khách quét QR tại quầy của bất kỳ chi nhánh nào
        │
        ▼
Kênh PayOS của chính doanh nghiệp đó
        │   tiền đi thẳng
        ▼
Tài khoản ngân hàng của chủ chuỗi

PayOS ── webhook ──► Backend: kiểm chữ ký bằng checksum key của doanh nghiệp
                              → đối chiếu mã đơn và số tiền
                              → đơn Đã thanh toán → báo POS qua Socket.IO
```

**Nền tảng không giữ tiền bán hàng.** Nền tảng chỉ nhận tín hiệu "tiền đã vào" từ PayOS để đổi trạng thái đơn. Không có ví, không có sổ cái, không có quyết toán, không có rút tiền.

Tiền mặt nằm trong két của chi nhánh; hệ thống chỉ ghi nhận doanh thu và tên thu ngân đã thu.

**Phí thuê bao đi đường riêng.** Brand Manager trả phí thuê bao bằng QR tạo từ kênh PayOS của nền tảng; tiền vào tài khoản ngân hàng của nền tảng, webhook về địa chỉ riêng của nền tảng và chỉ dùng để gia hạn thuê bao. Kênh này không dính tới đơn hàng, và khoá của nó nằm trong cấu hình máy chủ, không nằm cùng khoá PayOS của các doanh nghiệp (mục 25, BR-66).

### 2.4. Ba cấp tính năng

| **Cấp**                                    | **Tính năng**                                                                                                                                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hệ thống (Platform Admin, Platform Staff)  | Platform Staff: duyệt hồ sơ, hỗ trợ khách đăng ký gói sau khi duyệt. Platform Admin: mọi việc của Platform Staff, cộng quản lý gói, quản lý doanh nghiệp (gia hạn thủ công, đổi gói, tạm ngưng), theo dõi hoá đơn thuê bao, doanh thu nền tảng, tài khoản Platform Staff |
| ---                                        | ---                                                                                                                                                                                                                                                                      |
| Chuỗi (Brand Manager)                      | Chi nhánh, menu và giá chuỗi, giá riêng theo chi nhánh, combo, topping thêm của món, nhập menu bằng ảnh, tuỳ chọn món, tài khoản Store Manager, liên kết PayOS, nhận diện thương hiệu, áp phích màn hình phía khách, báo cáo đa chi nhánh, thanh toán thuê bao           |
| ---                                        | ---                                                                                                                                                                                                                                                                      |
| Cửa hàng (Store Manager, Cashier, Barista) | POS (bán món, topping, combo), hoàn tiền mặt, số máy rung, bật/tắt món và combo, tài khoản nhân viên, màn hình pha chế, màn hình gọi số, báo cáo chi nhánh                                                                                                               |
| ---                                        | ---                                                                                                                                                                                                                                                                      |

## 3. Từ điển thuật ngữ

| **Thuật ngữ**             | **Nghĩa**                                                                                                                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Doanh nghiệp              | Một khách hàng đã mua dịch vụ. Ranh giới cô lập dữ liệu.                                                                                                                                                                                 |
| ---                       | ---                                                                                                                                                                                                                                      |
| Hồ sơ đăng ký             | Đơn của chủ quán chờ Platform Staff duyệt. Chưa phải doanh nghiệp; thành doanh nghiệp khi được duyệt và kích hoạt.                                                                                                                       |
| ---                       | ---                                                                                                                                                                                                                                      |
| Chi nhánh                 | Một cửa hàng thuộc doanh nghiệp. Mọi hoạt động bán hàng gắn với một chi nhánh.                                                                                                                                                           |
| ---                       | ---                                                                                                                                                                                                                                      |
| Gói dịch vụ               | Cơ bản, Tiêu chuẩn hoặc Nâng cao. Quy định hạn mức chi nhánh, hạn mức tài khoản, tính năng được dùng và giá tháng.                                                                                                                       |
| ---                       | ---                                                                                                                                                                                                                                      |
| Hạn mức                   | Con số trần của gói: số chi nhánh, số tài khoản. Vượt thì backend chặn.                                                                                                                                                                  |
| ---                       | ---                                                                                                                                                                                                                                      |
| Chế độ chỉ đọc            | Trạng thái của doanh nghiệp hết hạn thuê bao hoặc hết hạn dùng thử: xem được dữ liệu, không tạo đơn mới, không sửa cấu hình.                                                                                                             |
| ---                       | ---                                                                                                                                                                                                                                      |
| Link kích hoạt            | Đường dẫn trong email duyệt hồ sơ, đưa chủ quán tới trang kích hoạt để trả tháng đầu hoặc chọn dùng thử. Dùng một lần, hết hạn sau 7 ngày (mục 25).                                                                                      |
| ---                       | ---                                                                                                                                                                                                                                      |
| Dùng thử                  | 14 ngày dùng gói Cơ bản không mất phí, chọn ở trang kích hoạt. Mỗi mã số thuế một lần.                                                                                                                                                   |
| ---                       | ---                                                                                                                                                                                                                                      |
| Kỳ thuê bao               | Một tháng sử dụng đã trả tiền. Mỗi lần thanh toán cộng đúng một kỳ.                                                                                                                                                                      |
| ---                       | ---                                                                                                                                                                                                                                      |
| Hoá đơn thuê bao          | Khoản phí của một kỳ thuê bao: doanh nghiệp, gói, số tiền theo giá gói lúc lập, kỳ áp dụng, trạng thái. Trả bằng QR PayOS của nền tảng.                                                                                                  |
| ---                       | ---                                                                                                                                                                                                                                      |
| Kênh PayOS của nền tảng   | Kênh PayOS gắn với tài khoản ngân hàng của nền tảng, chỉ dùng thu phí thuê bao. Khác kênh PayOS bán hàng của từng doanh nghiệp.                                                                                                          |
| ---                       | ---                                                                                                                                                                                                                                      |
| Quầy                      | Một điểm thu tiền trong chi nhánh, do Store Manager tạo. Mỗi quầy gồm một tablet POS và tối đa một màn hình phía khách.                                                                                                                  |
| ---                       | ---                                                                                                                                                                                                                                      |
| POS                       | Ứng dụng bán hàng trên máy tính bảng Android của thu ngân, đặt quay về phía thu ngân.                                                                                                                                                    |
| ---                       | ---                                                                                                                                                                                                                                      |
| Màn hình phía khách       | Máy tính bảng Android thứ hai của quầy, quay về phía khách, hiện món đã chọn, tổng tiền, mã QR và kết quả thanh toán. Chỉ hiển thị, không thao tác.                                                                                      |
| ---                       | ---                                                                                                                                                                                                                                      |
| Áp phích                  | Ảnh quảng bá (món mới, khuyến mãi) do Brand Manager tải lên cho cả chuỗi. Màn hình phía khách xoay vòng các áp phích đang bật. Mỗi doanh nghiệp tối đa 6 áp phích (mục 20).                                                              |
| ---                       | ---                                                                                                                                                                                                                                      |
| Mã ghép (OTP)             | Mã OTP 6 số do server sinh khi màn hình phía khách (hoặc màn hình gọi số) chưa ghép xin mã; hiện trên chính màn hình đó để thu ngân hoặc Store Manager nhập vào và ghép với một quầy (hoặc chi nhánh). Dùng một lần, hết hạn sau 5 phút. |
| ---                       | ---                                                                                                                                                                                                                                      |
| Token thiết bị            | Khoá server cấp cho màn hình phía khách hoặc màn hình gọi số sau khi ghép. Chỉ đọc, gắn với một quầy hoặc một chi nhánh, không phải tài khoản người dùng.                                                                                |
| ---                       | ---                                                                                                                                                                                                                                      |
| Đơn                       | Một lần khách gọi món và trả tiền tại quầy. Có một số gọi sau khi thanh toán.                                                                                                                                                            |
| ---                       | ---                                                                                                                                                                                                                                      |
| Dòng món                  | Một món hoặc một combo trong đơn, kèm các tuỳ chọn, topping và số lượng. Dòng combo có các dòng thành phần; pha chế xử lý từng dòng thành phần như một món, mỗi dòng có vòng đời trạng thái riêng.                                       |
| ---                       | ---                                                                                                                                                                                                                                      |
| Nhóm tuỳ chọn             | Một nhóm lựa chọn gắn vào món, ví dụ Size, Đường, Đá. Có quy tắc chọn: bắt buộc hay không, chọn tối thiểu, tối đa.                                                                                                                       |
| ---                       | ---                                                                                                                                                                                                                                      |
| Tuỳ chọn                  | Một lựa chọn trong nhóm, ví dụ Size L, 50% đường, Ít đá. Có giá cộng thêm, có thể bằng 0.                                                                                                                                                |
| ---                       | ---                                                                                                                                                                                                                                      |
| Giá lúc bán               | Bản sao tên và giá hiệu lực của món hoặc combo tại chi nhánh, cùng từng tuỳ chọn, topping và phụ thu biến thể, chụp lại tại thời điểm chốt đơn. Brand Manager đổi giá sau đó không ảnh hưởng.                                            |
| ---                       | ---                                                                                                                                                                                                                                      |
| Combo                     | Một mục bán có giá riêng, gồm nhiều thành phần, do Brand Manager tạo (mục 26). Lên POS, giỏ và bill như một dòng.                                                                                                                        |
| ---                       | ---                                                                                                                                                                                                                                      |
| Thành phần combo          | Một vị trí trong combo: một món cố định, hoặc một nhóm biến thể để khách chọn đúng một món. Có số lượng, có thể cố định size.                                                                                                            |
| ---                       | ---                                                                                                                                                                                                                                      |
| Biến thể (trong combo)    | Một món được phép chọn trong thành phần combo, có thể kèm phụ thu ≥ 0, ví dụ đổi Trà đào sang Trà sữa matcha +5.000đ.                                                                                                                    |
| ---                       | ---                                                                                                                                                                                                                                      |
| Topping (menu item extra) | Phần thêm vào một món, khai báo một lần trong thư viện topping của chuỗi rồi gắn vào từng món với giá cộng thêm và số phần tối đa riêng theo món (mục 27).                                                                               |
| ---                       | ---                                                                                                                                                                                                                                      |
| Giá chuỗi                 | Giá mặc định của món hoặc combo, áp cho mọi chi nhánh không có giá riêng.                                                                                                                                                                |
| ---                       | ---                                                                                                                                                                                                                                      |
| Giá chi nhánh             | Giá riêng của một món hoặc combo tại một chi nhánh, do Brand Manager đặt. Giá hiệu lực là giá chi nhánh nếu có, không thì giá chuỗi (mục 29).                                                                                            |
| ---                       | ---                                                                                                                                                                                                                                      |
| Hoàn tiền mặt             | Trả lại tiền cho khách bằng tiền mặt từ két khi huỷ đơn hoặc dòng đã thanh toán, kể cả đơn đã trả bằng QR (mục 28).                                                                                                                      |
| ---                       | ---                                                                                                                                                                                                                                      |
| Phiếu hoàn tiền           | Tờ in khi hoàn tiền: mã đơn, dòng được hoàn, số tiền, lý do, người hoàn. Quán giữ để đối chiếu két.                                                                                                                                      |
| ---                       | ---                                                                                                                                                                                                                                      |
| Doanh thu nền tảng        | Phí thuê bao nền tảng đã thu qua hoá đơn thuê bao Đã thanh toán. Không gồm tiền bán hàng của các quán (mục 30).                                                                                                                          |
| ---                       | ---                                                                                                                                                                                                                                      |
| Số gọi                    | Số thứ tự cấp cho đơn khi thanh toán xong, duy nhất trong một chi nhánh trong một ngày, in trên phiếu số.                                                                                                                                |
| ---                       | ---                                                                                                                                                                                                                                      |
| Phiếu số                  | Phiếu in kèm bill, khách giữ để nhận món khi được gọi số.                                                                                                                                                                                |
| ---                       | ---                                                                                                                                                                                                                                      |
| Máy rung                  | Thiết bị cầm tay quán phát cho khách sau khi trả tiền, rung khi món xong. Là thiết bị riêng của quán, không nối với hệ thống (mục 23).                                                                                                   |
| ---                       | ---                                                                                                                                                                                                                                      |
| Số máy rung               | Số in trên máy rung. Thu ngân nhập vào đơn đã thanh toán; số đi kèm dữ liệu đơn gửi xuống pha chế để pha chế báo đúng máy khi món xong. Không bắt buộc, không thay số gọi.                                                               |
| ---                       | ---                                                                                                                                                                                                                                      |
| Bộ phát máy rung          | Bàn phím của bộ máy rung, đặt ở quầy pha chế; pha chế bấm số để máy tương ứng rung.                                                                                                                                                      |
| ---                       | ---                                                                                                                                                                                                                                      |
| Chế độ in ảnh             | Cách in mặc định: POS dựng bill và phiếu số thành ảnh đen trắng rồi gửi lệnh in ảnh ESC/POS, nên in đúng tiếng Việt và logo. Chế độ dự phòng là in chữ không dấu (mục 19).                                                               |
| ---                       | ---                                                                                                                                                                                                                                      |
| Lượt in lại               | Một lần in lại bill và phiếu số từ lịch sử đơn. Bắt buộc lý do; backend ghi lại người in, chi nhánh, thời điểm.                                                                                                                          |
| ---                       | ---                                                                                                                                                                                                                                      |
| Màn hình gọi số           | Màn hình đặt ở khu nhận món, hiện các số đang pha và các số mời nhận.                                                                                                                                                                    |
| ---                       | ---                                                                                                                                                                                                                                      |
| Màn hình TV menu          | TV treo ở quầy thu ngân hoặc quầy pha chế, hiện menu đang bán của chi nhánh và áp phích của chuỗi. Chỉ hiển thị. Thuộc phần dự kiến (mục 21).                                                                                            |
| ---                       | ---                                                                                                                                                                                                                                      |
| Hàng đợi pha chế          | Danh sách dòng món của các đơn đã thanh toán, chưa xong, của một chi nhánh.                                                                                                                                                              |
| ---                       | ---                                                                                                                                                                                                                                      |
| Gom món                   | Việc gộp các ly cùng món, cùng size ở nhiều đơn khác nhau thành một mẻ để pha một lần (mục 8).                                                                                                                                           |
| ---                       | ---                                                                                                                                                                                                                                      |
| Mẻ                        | Một nhóm ly được gom, pha chế bắt đầu và kết thúc cùng lúc.                                                                                                                                                                              |
| ---                       | ---                                                                                                                                                                                                                                      |
| Kênh PayOS                | Kênh thanh toán Brand Manager tự mở trên PayOS, gắn với tài khoản ngân hàng của chủ chuỗi.                                                                                                                                               |
| ---                       | ---                                                                                                                                                                                                                                      |
| Khoá PayOS                | Bộ ba Client ID, API Key, Checksum Key của kênh PayOS. Lưu mã hoá, mỗi doanh nghiệp một bộ.                                                                                                                                              |
| ---                       | ---                                                                                                                                                                                                                                      |
| Webhook                   | Lời gọi PayOS gửi về backend khi có tiền vào, kèm chữ ký để chứng minh do PayOS gửi.                                                                                                                                                     |
| ---                       | ---                                                                                                                                                                                                                                      |
| Mã đơn (orderCode)        | Số định danh đơn gửi sang PayOS khi tạo QR, dùng để đối chiếu khi webhook về.                                                                                                                                                            |
| ---                       | ---                                                                                                                                                                                                                                      |
| Xác nhận thủ công         | Store Manager xác nhận một đơn QR đã thanh toán khi webhook không về. Bắt buộc lý do, lưu người xác nhận.                                                                                                                                |
| ---                       | ---                                                                                                                                                                                                                                      |
| Bộ nhận diện thương hiệu  | Logo, màu chủ đạo, màu nhấn và tên hiển thị của một doanh nghiệp. Do Brand Manager đặt, áp cho mọi tài khoản thuộc doanh nghiệp đó.                                                                                                      |
| ---                       | ---                                                                                                                                                                                                                                      |
| Màu ngữ nghĩa             | Màu mang ý nghĩa cố định: đỏ là cảnh báo, vàng là đang chờ, xanh là xong. Là hằng số của hệ thống, không đổi theo thương hiệu.                                                                                                           |
| ---                       | ---                                                                                                                                                                                                                                      |
| Token màu                 | Biến CSS trung gian giữa mã nguồn và màu thật. Mã nguồn gọi tên biến, không viết mã màu cứng.                                                                                                                                            |
| ---                       | ---                                                                                                                                                                                                                                      |
| Mật khẩu tạm              | Mật khẩu hệ thống tự sinh khi cấp hoặc đặt lại tài khoản, gửi qua email cho người được cấp. Chỉ dùng để đăng nhập rồi đổi sang mật khẩu riêng; hết hạn sau 72 giờ (mục 22).                                                              |
| ---                       | ---                                                                                                                                                                                                                                      |
| Chờ đổi mật khẩu          | Trạng thái của tài khoản đang dùng mật khẩu tạm: chỉ được đổi mật khẩu, xem hồ sơ của mình và đăng xuất.                                                                                                                                 |
| ---                       | ---                                                                                                                                                                                                                                      |
| OCR                       | Nhận dạng ký tự quang học: đọc chữ trong ảnh thành văn bản thô, chưa hiểu nghĩa của chữ.                                                                                                                                                 |
| ---                       | ---                                                                                                                                                                                                                                      |
| Bản nháp nhập menu        | Danh mục, món, giá và tuỳ chọn do AI sắp từ văn bản OCR. Chỉ ghi vào menu khi Brand Manager duyệt và bấm Nhập (mục 24).                                                                                                                  |
| ---                       | ---                                                                                                                                                                                                                                      |

## 4. Actor

### 4.1. Bảng tổng hợp

| **#** | **Actor**                                                    | **Phạm vi**      | **Nền tảng**                                                      | **Use case**        |
| ----- | ------------------------------------------------------------ | ---------------- | ----------------------------------------------------------------- | ------------------- |
| 0     | Prospective Brand Manager (khách đăng ký, chưa có tài khoản) | Ngoài hệ thống   | Web                                                               | 2                   |
| ---   | ---                                                          | ---              | ---                                                               | ---                 |
| 1     | Platform Staff                                               | Toàn nền tảng    | Web                                                               | 4                   |
| ---   | ---                                                          | ---              | ---                                                               | ---                 |
| 2     | Platform Admin (kế thừa Platform Staff)                      | Toàn nền tảng    | Web                                                               | 4 riêng + 4 kế thừa |
| ---   | ---                                                          | ---              | ---                                                               | ---                 |
| 3     | Brand Manager                                                | Một doanh nghiệp | Web                                                               | 15                  |
| ---   | ---                                                          | ---              | ---                                                               | ---                 |
| 4     | Store Manager                                                | Một chi nhánh    | Web                                                               | 6                   |
| ---   | ---                                                          | ---              | ---                                                               | ---                 |
| 5     | Cashier (thu ngân)                                           | Một chi nhánh    | Hai tablet Android: POS phía trước + màn hình phía khách phía sau | 7                   |
| ---   | ---                                                          | ---              | ---                                                               | ---                 |
| 6     | Barista (pha chế)                                            | Một chi nhánh    | Mobile (máy tính bảng tại quầy pha chế)                           | 3                   |
| ---   | ---                                                          | ---              | ---                                                               | ---                 |
| —     | Authenticated User (actor cha)                               | —                | —                                                                 | 2                   |
| ---   | ---                                                          | ---              | ---                                                               | ---                 |

Tổng cộng **43 use case**, tất cả đều bắt buộc, không chia giai đoạn — xem mục 14.

Năm actor Platform Staff, Brand Manager, Store Manager, Cashier, Barista kế thừa Authenticated User; Platform Admin kế thừa Platform Staff nên có mọi use case của Platform Staff mà không vẽ lại. Hai tầng generalization này phải vẽ rõ trên Use Case Diagram.

Khách mua hàng tại quầy không phải actor — họ không có tài khoản, không có phiên đăng nhập; họ chỉ nhìn màn hình phía khách, quét QR bằng app ngân hàng của mình, cầm phiếu số và nhìn màn hình gọi số. Phải nêu rõ trong SRS.

### 4.2. Prospective Brand Manager (web, chưa đăng nhập)

**Là ai:** chủ chuỗi quan tâm dịch vụ, chưa có tài khoản.

**Làm gì (GU-01):** nộp hồ sơ đăng ký gồm thông tin doanh nghiệp (tên, mã số thuế, địa chỉ, số chi nhánh dự kiến, gói mong muốn) và thông tin người đại diện (họ tên, email, số điện thoại).

Sau khi nộp, hồ sơ ở trạng thái Chờ duyệt. Không có tài khoản, không đăng nhập được cho tới khi Platform Staff duyệt và chủ quán kích hoạt.

**Làm gì tiếp (GU-02):** khi hồ sơ được duyệt, bấm link kích hoạt trong email, mở trang kích hoạt — không cần đăng nhập — và chọn một trong hai: trả tháng đầu của gói đã được duyệt bằng QR PayOS, hoặc dùng thử 14 ngày gói Cơ bản. Kích hoạt xong thì nhận email tài khoản Brand Manager kèm mật khẩu tạm (mục 22, 25). Cần đổi gói đã duyệt, không nhận được email hay đã quét QR mà chưa thấy kích hoạt thì liên hệ nền tảng; Platform Staff hỗ trợ (PS-01, mục 30).

**Không làm:** không đổi gói đã được duyệt ở trang kích hoạt (dùng thử luôn là gói Cơ bản); không dùng thử lần hai với cùng mã số thuế.

### 4.3. Platform Staff và Platform Admin (web)

**Là ai:** người của bên bán phần mềm, gồm hai vai trò. Platform Staff là nhân viên vận hành: xử lý hồ sơ đăng ký và hỗ trợ khách đăng ký gói. Platform Admin là quản trị nền tảng: làm được mọi việc của Platform Staff và giữ các quyền về gói, doanh nghiệp, tài khoản nhân viên nền tảng và doanh thu. Cả hai không dính nghiệp vụ cửa hàng và **không cầm tiền của quán**.

**Ví von:** ban quản lý toà nhà cho thuê. Biết công ty nào thuê gói nào, hợp đồng tới ngày nào, đang dùng bao nhiêu chi nhánh. Không biết công ty đó bán món gì cho ai, không thu tiền hộ, và cũng không quyết định công ty đó treo biển màu gì.

**A. Xử lý hồ sơ đăng ký — Platform Staff (Platform Admin kế thừa)**

- **PA-01** — Xem danh sách hồ sơ chờ duyệt, tìm kiếm, mở chi tiết
- **PA-02** — Duyệt: chọn gói được duyệt (mặc định là gói chủ quán mong muốn); hệ thống gửi email báo duyệt kèm link kích hoạt. Doanh nghiệp, tài khoản Brand Manager, bộ nhận diện mặc định và email mật khẩu tạm chỉ được sinh khi chủ quán kích hoạt — trả tháng đầu hoặc dùng thử (mục 22, 25). Link hết hạn thì Platform Staff bấm Gửi lại link kích hoạt
- **PA-03** — Từ chối: ghi lý do, hồ sơ chuyển trạng thái Bị từ chối, gửi email

**B. Hỗ trợ đăng ký gói — Platform Staff (Platform Admin kế thừa)**

- **PS-01** — Hỗ trợ khách đăng ký gói sau khi hồ sơ đã được duyệt: xem hồ sơ Đã duyệt — chờ kích hoạt và trạng thái thanh toán kỳ đầu; đổi gói đã duyệt theo yêu cầu của khách khi chưa kích hoạt (link cũ mất hiệu lực, gửi link mới); gửi lại link kích hoạt. Với doanh nghiệp đã kích hoạt: xem gói, hạn và hoá đơn thuê bao; đổi gói kỳ kế tiếp theo yêu cầu của Brand Manager; gửi lại email hoá đơn kèm link thanh toán; bấm Kiểm tra lại khi khách báo đã quét QR mà chưa thấy gia hạn. Mọi thao tác thay khách bắt buộc ghi chú yêu cầu và ghi audit log (mục 30)

**Platform Staff không làm:** không thanh toán thay khách, không gia hạn thủ công, không xác nhận thủ công hoá đơn lệch số tiền, không đổi gói giữa kỳ, không tạm ngưng doanh nghiệp, không sửa gói và giá gói, không xem doanh thu nền tảng, không đặt lại mật khẩu Brand Manager, không cấp tài khoản Platform Staff.

**C. Gói, doanh nghiệp và doanh thu — chỉ Platform Admin**

- **PA-04** — Quản lý gói: tên gói, giá tháng, số chi nhánh tối đa, số tài khoản tối đa, tính năng được bật (nhận diện, so sánh đa chi nhánh); đổi giá chỉ áp cho hoá đơn thuê bao lập sau đó (BR-72)
- **PA-05** — Quản lý doanh nghiệp: xem danh sách và hồ sơ, trạng thái thuê bao (Dùng thử, Hoạt động, Hết hạn), lịch sử hoá đơn thuê bao; gia hạn thủ công cho trường hợp ngoại lệ (bù ngày khi sự cố, nhận phí ngoài hệ thống), bắt buộc lý do; xác nhận thủ công hoá đơn thuê bao lệch số tiền; đổi gói, tạm ngưng, kích hoạt lại, đặt lại mật khẩu cho Brand Manager (hệ thống sinh mật khẩu tạm mới và gửi email)
- **PA-06** — Xem doanh thu nền tảng: doanh thu thuê bao đã thu theo ngày, tháng, năm và theo gói; doanh thu định kỳ hằng tháng (MRR); số doanh nghiệp đang trả phí, dùng thử, hết hạn, tạm ngưng; tỷ lệ chuyển từ dùng thử sang trả phí; hoá đơn chưa trả và quá hạn; các kỳ gia hạn thủ công. Chỉ tính hoá đơn thuê bao Đã thanh toán, không gồm tiền bán hàng của các quán (BR-76, 30.4)
- **PA-07** — Quản lý tài khoản Platform Staff: tạo (hệ thống sinh mật khẩu tạm và gửi email), sửa, khoá, mở khoá, đặt lại mật khẩu hoặc gửi lại email (mục 22)

**Thấy gì:** tên doanh nghiệp, người đại diện, gói, ngày hết hạn, số chi nhánh, số tài khoản đang dùng, tổng số đơn trong tháng, đang dùng thử hay trả phí, các hoá đơn thuê bao và trạng thái thanh toán — Platform Staff và Platform Admin như nhau. Riêng Platform Admin thấy thêm báo cáo doanh thu nền tảng (PA-06).

**Không thấy:** nội dung đơn hàng, menu, giá món, doanh thu bán hàng của quán, tên nhân viên quán, khoá PayOS của doanh nghiệp.

**Không làm:** không tạo chi nhánh — chỉ đặt con số trần; không sửa menu, nhân viên; không sửa bộ nhận diện của doanh nghiệp; không xem hay sửa liên kết PayOS; không đăng nhập thay Brand Manager; không xoá cứng dữ liệu.

Giao diện của Platform Admin và Platform Staff luôn giữ nhận diện của nền tảng, không bị doanh nghiệp nào áp màu lên (BR-44).

### 4.4. Brand Manager (web)

**Là ai:** chủ chuỗi. Người thiết lập chuẩn cho cả chuỗi và giám sát, không phải người đứng quầy.

**Nguyên tắc phân định:** Brand Manager quyết định luật chơi, Store Manager chơi theo luật đó.

**A. Chi nhánh**

- **OW-01** — Tạo chi nhánh: tên, địa chỉ, điện thoại, giờ mở cửa, giờ đóng cửa; sửa, tạm ngưng, đóng chi nhánh; xem trạng thái mọi chi nhánh trên một màn hình
- Bị chặn khi vượt số chi nhánh của gói, kèm gợi ý nâng gói

**B. Menu toàn chuỗi**

- **OW-02** — Quản lý danh mục và món: tên, mô tả, ảnh, giá, danh mục, cờ cho phép gom món khi pha
- **OW-03** — Quản lý tuỳ chọn món: nhóm tuỳ chọn (size, đường, đá), quy tắc chọn, giá cộng thêm của từng tuỳ chọn, gắn nhóm vào món (mục 12)
- **OW-04** — Gán món và combo cho chi nhánh nào bán; bật/tắt món, tuỳ chọn, topping và combo ở cấp toàn chuỗi — tắt thì mọi chi nhánh đều không bán được
- **OW-14** — Quản lý combo: tên, mô tả, ảnh, danh mục, giá combo; thêm thành phần là món cố định hoặc nhóm biến thể (khách chọn một trong nhiều món, mỗi món kèm phụ thu ≥ 0), số lượng mỗi thành phần, size cố định nếu cần; bật/tắt, gán chi nhánh bán; xem giá combo so với mua lẻ (mục 26)
- **OW-15** — Quản lý topping thêm của món (menu item extra): thư viện topping của chuỗi (tên, giá mặc định); gắn topping vào từng món với giá cộng thêm và số phần tối đa riêng theo món, tổng số phần tối đa của món; bật/tắt cấp chuỗi (mục 27)
- **OW-16** — Đặt giá menu theo chi nhánh: xem bảng giá của từng chi nhánh; đặt giá riêng cho món hoặc combo tại một hoặc nhiều chi nhánh; xoá giá riêng để quay về giá chuỗi. Giá mới áp cho đơn chốt sau đó (mục 29)

Giá chuỗi là giá mặc định của món và combo cho mọi chi nhánh; Brand Manager đặt giá riêng cho chi nhánh nào cần (OW-16). Giá cộng thêm của tuỳ chọn, giá topping và phụ thu biến thể là một giá cho toàn chuỗi.

**C. Tài khoản Store Manager**

- **OW-05** — Tạo tài khoản Store Manager và gán vào chi nhánh (hệ thống sinh mật khẩu tạm và gửi email cho Store Manager); khoá; đặt lại mật khẩu hoặc gửi lại email — luôn sinh mật khẩu tạm mới; chuyển chi nhánh

Brand Manager không tạo tài khoản thu ngân và pha chế, chỉ xem danh sách.

**D. Liên kết PayOS (chi tiết ở mục 11)**

- **OW-06** — Nhập Client ID, API Key, Checksum Key của kênh PayOS; hệ thống kiểm tra khoá và đăng ký địa chỉ webhook; xem trạng thái liên kết; cập nhật hoặc gỡ liên kết

Chưa liên kết PayOS thì POS của mọi chi nhánh chỉ thu tiền mặt.

**E. Bộ nhận diện thương hiệu (chi tiết ở mục 10) — gói Tiêu chuẩn trở lên**

- **OW-07** — Tải logo, chọn màu chủ đạo và màu nhấn (bộ dựng sẵn hoặc nhập mã màu), đặt tên hiển thị, xem trước trực tiếp, khôi phục mặc định

**F. Báo cáo**

- **OW-08** — Báo cáo đa chi nhánh: doanh thu theo ngày, tuần, tháng; theo hình thức thanh toán; món, combo và topping bán chạy; số đơn, giá trị đơn trung bình; đơn bị huỷ và tiền mặt đã hoàn. Gói Cơ bản xem từng chi nhánh; gói Tiêu chuẩn trở lên có thêm so sánh các chi nhánh trên cùng biểu đồ

Không có báo cáo lợi nhuận. Hệ thống không quản lý kho và không tính lương, nên không có dữ liệu chi phí để tính.

**G. Gói dịch vụ**

- **OW-10** — Xem gói đang dùng, ngày hết hạn, hạn mức đã dùng trên hạn mức cho phép, tính năng có và chưa có
- **OW-13** — Thanh toán thuê bao qua PayOS: trên trang Gói dịch vụ, xem hoá đơn kỳ tiếp theo, chọn gói cho kỳ đó (mặc định gói đang dùng), bấm Thanh toán để hiện QR PayOS của nền tảng và quét bằng app ngân hàng; hệ thống nhận webhook và gia hạn thêm một tháng ngay. Dùng cho gia hạn hằng tháng và cho chuyển từ dùng thử sang trả phí. Link trong email nhắc hạn dẫn thẳng tới trang này (mục 25)

**H. Áp phích màn hình phía khách (chi tiết ở mục 20)**

- **OW-11** — Thêm áp phích (PNG, JPG hoặc WebP, tối đa 5 MB mỗi ảnh, tối đa 6 áp phích), đổi ảnh, đặt tên, bật/tắt, đổi thứ tự xoay vòng, xoá; xem trước ngay trên trang. Áp phích áp cho màn hình phía khách của mọi chi nhánh, không chọn riêng theo chi nhánh

**I. Nhập menu bằng ảnh (chi tiết ở mục 24)**

- **OW-12** — Tải 1–5 ảnh menu (JPG, PNG hoặc WebP, tối đa 10 MB mỗi ảnh). Hệ thống dùng OCR đọc chữ, AI sắp thành danh mục, món, giá, size và topping. Brand Manager xem bản nháp cạnh ảnh gốc, sửa, chọn cách xử lý món trùng và chi nhánh được bán, rồi bấm Nhập vào menu toàn chuỗi. Mọi gói đều dùng

**Không làm:** không đứng quầy, không thu tiền, không huỷ đơn, không hoàn tiền; không tạo tài khoản thu ngân và pha chế; không gia hạn thủ công, không đổi gói giữa kỳ — gia hạn chỉ bằng thanh toán (OW-13), gói mới áp từ kỳ kế tiếp; không đổi bố cục màn hình hay nhãn chức năng — tuỳ biến dừng ở mức nhận diện.

Ranh giới đầu là cố ý: nếu Brand Manager làm được mọi thứ thì audit log mất ý nghĩa.

### 4.5. Store Manager (web)

**Là ai:** quản lý một chi nhánh. Người giữ quyền với những việc có dính tới tiền sau khi khách đã trả: huỷ và hoàn tiền mọi đơn đã thanh toán của chi nhánh (thu ngân chỉ hoàn đơn trong ngày bán), xác nhận chuyển khoản thủ công.

Đây là vai trò, không phải chức danh. Một chi nhánh được tạo nhiều tài khoản Store Manager, ví dụ quản lý ca sáng và quản lý ca tối.

**A. Nhân sự và quầy**

- **BM-01** — Quản lý tài khoản thu ngân và pha chế của chi nhánh (tạo — hệ thống sinh mật khẩu tạm và gửi email; sửa; đặt lại mật khẩu hoặc gửi lại email — luôn sinh mật khẩu tạm mới; khoá khi nghỉ việc — bị chặn khi vượt số tài khoản của gói) và quản lý quầy (tạo, đổi tên, ngừng dùng quầy; xem và thu hồi màn hình phía khách đã ghép)

**B. Món tại chi nhánh**

- **BM-02** — Bật/tắt món, tuỳ chọn, topping và combo cho chi nhánh mình (hết hàng trong ngày, bật lại khi có hàng)

Không sửa được tên, giá, ảnh, tuỳ chọn, topping, combo, kể cả giá riêng của chi nhánh mình — đó là của Brand Manager (OW-16).

**C. Báo cáo**

- **BM-03** — Báo cáo chi nhánh: doanh thu theo ngày, tuần, tháng, theo hình thức thanh toán; món, combo và topping bán chạy; số đơn theo giờ; thời gian pha trung bình; đơn huỷ và khoản hoàn tiền kèm lý do, người hoàn; tiền mặt đã thu, tiền mặt đã hoàn và tiền mặt thuần của két theo ngày, theo thu ngân (BR-83)

**D. Đơn và thanh toán**

- **BM-04** — Tra cứu đơn: theo số gọi, mã đơn, khoảng thời gian, trạng thái, hình thức thanh toán; xem chi tiết món, tuỳ chọn, giá lúc bán, người tạo, lịch sử thanh toán
- **BM-05** — Xác nhận chuyển khoản thủ công khi webhook không về hoặc số tiền lệch; bắt buộc ghi lý do, hệ thống lưu người xác nhận
- **BM-06** — Huỷ đơn đã thanh toán và hoàn tiền mặt cho mọi đơn của chi nhánh, kể cả đơn của ngày trước, toàn bộ hoặc từng dòng món; bắt buộc lý do. Hình thức hoàn luôn là tiền mặt tại quầy, kể cả đơn đã trả bằng QR (BR-81). Xem và đối chiếu các khoản thu ngân đã hoàn (CS-07)

**Nhận cảnh báo:** webhook báo số tiền lệch, đơn chờ xác nhận thủ công, pha chế báo hết món khi còn đơn đã trả tiền chứa món đó, thu ngân vừa hoàn tiền một đơn.

**Thiết bị hiển thị:** Store Manager ghép màn hình gọi số của chi nhánh (TV hoặc tablet ở khu nhận món) bằng mã ghép, giống cách ghép màn hình phía khách (11.10). Đây là cấu hình thiết bị, không phải use case. Nếu làm phần dự kiến ở mục 21, TV menu của chi nhánh cũng ghép theo cách này.

**Không làm:** sửa tên, mô tả, ảnh, giá món, combo và tuỳ chọn, kể cả giá của chi nhánh mình; sửa logo, màu, tên hiển thị; tạo hoặc xoá chi nhánh; xem dữ liệu chi nhánh khác; xem hay sửa khoá PayOS; xem hoặc đổi gói thuê bao.

### 4.6. Cashier — thu ngân (hai tablet Android tại quầy)

**Là ai:** nhân viên đứng quầy. Actor có tần suất thao tác cao nhất — giờ cao điểm cỡ một đơn mỗi 30 giây, nên mọi màn hình của thu ngân phải tối ưu số lần chạm.

**Hai máy tại mỗi quầy.** Máy phía trước là tablet POS, thu ngân đăng nhập bằng tài khoản của mình và chọn quầy để order cho khách. Máy phía sau là màn hình phía khách, quay về phía khách: lúc chưa có khách thì chiếu áp phích của chuỗi toàn màn hình; khi thu ngân thêm món thì hiện món đã chọn kèm tuỳ chọn và tổng tiền theo thời gian thực, áp phích thu về nửa trái; sau đó hiện mã QR kèm đồng hồ đếm ngược, cuối cùng hiện "Thanh toán thành công — số gọi 023". Màn hình phía khách không thao tác được gì; nó là màn hình phụ của POS.

**Ghép hai máy.** Màn hình phía khách không đăng nhập tài khoản. Nó hiện một mã OTP 6 số; thu ngân nhập mã đó trên POS là hai máy thành một cặp của quầy. Hai máy không nối trực tiếp với nhau mà đồng bộ qua backend bằng Socket.IO — chi tiết ở 11.10 và 11.11.

**A. Tạo đơn tại quầy**

- **CS-01** — Chọn món → chọn tuỳ chọn (các tuỳ chọn mặc định đã chọn sẵn) và topping (chọn số phần) → số lượng → ghi chú → thêm món khác. Trước khi trả tiền được sửa, xoá thoải mái. Bấm chốt đơn. Bán combo: chọn combo → chọn món cho từng thành phần biến thể → chỉnh tuỳ chọn và topping của từng món → thêm vào giỏ như một dòng (mục 26)

**B. Thu tiền**

- **CS-02** — Thu tiền mặt: nhập số tiền khách đưa (có nút mệnh giá nhanh và nút "vừa đủ"), hệ thống tính tiền thối, xác nhận
- **CS-03** — Thu QR: chọn chuyển khoản, QR hiện trên màn hình phía khách kèm đồng hồ đếm ngược khoảng 10 phút; POS tự báo "Đã nhận 45.000đ" kèm âm thanh khi PayOS xác nhận; có nút "Kiểm tra lại" khi webhook về chậm; khách đổi ý thì huỷ QR để chuyển sang tiền mặt

**C. Sau thanh toán**

- **CS-04** — In bill và phiếu số: tự động ngay khi thanh toán xong, cả tiền mặt lẫn QR. POS lấy dữ liệu bill từ backend, tự dựng bill và phiếu số thành ảnh khổ 58 mm rồi gửi lệnh in ảnh ESC/POS tới máy in nhiệt của quầy qua Bluetooth; không dựng được ảnh thì tự in chữ không dấu để khách vẫn có bill. Bill và phiếu số in thành hai tờ; phiếu số có số gọi cỡ lớn và mã QR theo dõi đơn. Máy in chọn ngay trên POS (Tài khoản › Máy in hóa đơn), có nút in thử. In lỗi không chặn thanh toán; POS báo lỗi và có nút In lại. In lại từ lịch sử đơn bắt buộc lý do, backend ghi lại từng lượt (mục 19)
- **CS-05** — Xem lịch sử đơn của chi nhánh trong ngày: trạng thái pha chế, số gọi, hình thức thanh toán; mở chi tiết để in lại

**D. Số máy rung (chi tiết ở mục 23)**

- **CS-06** — Gán số máy rung cho đơn đã thanh toán: nhập số in trên máy rung ngay ở màn hình thanh toán thành công hoặc từ lịch sử đơn; đổi số hoặc gỡ số khi đưa nhầm. Không bắt buộc; một số chỉ gắn với một đơn đang mở của chi nhánh; số máy rung đi kèm trong dữ liệu đơn gửi xuống màn hình pha chế

**E. Hoàn tiền (chi tiết ở mục 28)**

- **CS-07** — Hoàn tiền mặt cho khách: mở đơn đã thanh toán trong ngày bán từ lịch sử đơn (CS-05), chọn hoàn toàn bộ hoặc từng dòng món (combo hoàn theo cả dòng), chọn lý do; hệ thống tính số tiền hoàn theo giá lúc bán; thu ngân lấy tiền mặt từ két trả khách — kể cả khi khách đã trả bằng QR — rồi bấm Xác nhận đã hoàn; POS in phiếu hoàn tiền, dòng chưa pha rời hàng đợi pha chế, Store Manager nhận thông báo

**Không làm:** không sửa đơn đã thanh toán; không hoàn tiền đơn của ngày trước, không hoàn bằng chuyển khoản; không xác nhận chuyển khoản thủ công, kể cả khi khách chìa màn hình báo chuyển thành công; không sửa giá, không giảm giá ngoài giá combo đã cấu hình; không bật/tắt món; không xem báo cáo doanh thu.

### 4.7. Barista — pha chế (mobile)

**Là ai:** nhân viên pha chế và làm đồ ăn nhanh của một chi nhánh. Dùng máy tính bảng đặt tại quầy pha chế.

Actor đơn giản nhất về chức năng, khó nhất về thiết kế giao diện. Người dùng tay ướt, đang lắc bình, mắt liếc chứ không đọc.

**A. Hàng đợi**

- **BA-01** — Xem hàng đợi của chi nhánh, đã gom thành mẻ (mục 8). Mỗi mẻ hiện: tên món, size, số ly; bên dưới là từng ly với số gọi, số máy rung (nếu có), đường, đá, topping kèm số phần, ghi chú, tên combo nếu ly thuộc combo, thời gian đã chờ. Lọc theo danh mục (đồ uống / đồ ăn)

Tuỳ chọn khác mặc định và ghi chú phải nổi bật. Ít đường, không đá, thêm pudding — đây là thứ hay bị bỏ sót nhất ngoài đời thật.

**B. Cập nhật trạng thái**

- **BA-02** — Bấm "Bắt đầu mẻ" (mọi ly trong mẻ sang Đang pha), bấm "Xong" từng ly hoặc cả mẻ. Đơn nào đủ món thì hệ thống gọi số; đơn có số máy rung thì màn hình pha chế nhắc "Báo máy rung số …" lấy từ dữ liệu đơn; pha chế bấm số đó trên bộ phát máy rung rồi chạm Đã báo. Khách đưa phiếu và nhận món thì bấm "Đã giao"

Đơn vị thao tác là dòng món, không phải cả đơn. Nhưng số chỉ được gọi khi mọi dòng món của đơn đã xong — khách không phải lên quầy hai lần.

**C. Báo tình trạng món**

- **BA-03** — Báo hết món, hết một tuỳ chọn hoặc hết một topping (ví dụ hết trân châu): POS chặn bán ngay, kể cả trong combo (BR-78); bật lại khi có hàng

Trùng quyền bật/tắt với Store Manager, và trùng là đúng — pha chế là người biết trước nhất.

**Không làm:** không thấy giá tiền, không thấy tổng tiền đơn; không huỷ đơn; không thấy dữ liệu chi nhánh khác.

**Nguyên tắc thiết kế giao diện pha chế**

- Chữ tối thiểu 20px, nút cao tối thiểu 60px
- Hàng đợi nhìn thấy không cần cuộn, hoặc cuộn tối đa một lần
- Phân biệt trạng thái bằng màu và vị trí, đừng bắt đọc chữ
- Mẻ chờ quá lâu tự đổi màu
- Không hộp thoại xác nhận. Bấm nhầm thì có nút hoàn tác trong vài giây
- Tự cập nhật khi có đơn mới thanh toán
- Màu thương hiệu chỉ xuất hiện ở thanh tiêu đề và logo. Màu của thẻ món là màu ngữ nghĩa, không đổi theo chuỗi (BR-42)

### 4.8. Hệ thống bên ngoài

Không phải người dùng, không kế thừa Authenticated User, nhưng có trao đổi dữ liệu với hệ thống và phải xuất hiện trên Context Diagram.

| **Hệ thống**            | **Trao đổi gì**                                                                                                                                                                                              | **Ghi chú**                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PayOS                   | Nhận yêu cầu tạo QR; gửi webhook khi tiền vào; trả trạng thái khi tra cứu; huỷ QR; xác nhận địa chỉ webhook                                                                                                  | Mỗi doanh nghiệp một kênh, một bộ khoá. Webhook xử lý idempotent (BR-27). Riêng phí thuê bao đi qua kênh PayOS của nền tảng, khoá đặt trong cấu hình máy chủ (BR-66) |
| ---                     | ---                                                                                                                                                                                                          | ---                                                                                                                                                                  |
| Ngân hàng của chủ chuỗi | Nhận tiền khách chuyển qua PayOS                                                                                                                                                                             | Không trao đổi dữ liệu với hệ thống. Vẽ để thấy tiền không đi qua nền tảng                                                                                           |
| ---                     | ---                                                                                                                                                                                                          | ---                                                                                                                                                                  |
| Ngân hàng của nền tảng  | Nhận phí thuê bao Brand Manager trả qua kênh PayOS của nền tảng                                                                                                                                              | Không trao đổi dữ liệu với hệ thống                                                                                                                                  |
| ---                     | ---                                                                                                                                                                                                          | ---                                                                                                                                                                  |
| SePay hoặc Casso        | Phương án thay thế PayOS: báo biến động số dư, khớp theo nội dung chuyển khoản chứa mã đơn                                                                                                                   | Chỉ dùng nếu PayOS không phù hợp (mục 11.7)                                                                                                                          |
| ---                     | ---                                                                                                                                                                                                          | ---                                                                                                                                                                  |
| Dịch vụ mô hình AI      | Nhận văn bản OCR của menu và tên các mục menu đang có, trả bản nháp menu có cấu trúc                                                                                                                         | Chỉ gọi qua backend                                                                                                                                                  |
| ---                     | ---                                                                                                                                                                                                          | ---                                                                                                                                                                  |
| Dịch vụ OCR             | Nhận ảnh menu, trả văn bản thô theo từng dòng kèm vị trí                                                                                                                                                     | Chỉ gọi qua backend; chỉ gửi ảnh menu (BR-63)                                                                                                                        |
| ---                     | ---                                                                                                                                                                                                          | ---                                                                                                                                                                  |
| Dịch vụ email           | Gửi email đăng nhập kèm mật khẩu tạm khi cấp hoặc đặt lại tài khoản; kết quả duyệt hồ sơ kèm link kích hoạt; nhắc sắp hết hạn dùng thử và sắp hết hạn gói kèm link thanh toán; biên nhận thanh toán thuê bao | Email nhắc hạn gửi bằng job chạy hằng ngày (25.6)                                                                                                                    |
| ---                     | ---                                                                                                                                                                                                          | ---                                                                                                                                                                  |
| Dịch vụ lưu trữ tệp     | Lưu logo, ảnh món, áp phích và ảnh menu tải lên để nhập                                                                                                                                                      | Cơ sở dữ liệu chỉ giữ đường dẫn                                                                                                                                      |
| ---                     | ---                                                                                                                                                                                                          | ---                                                                                                                                                                  |

## 5. Vòng đời trạng thái

### 5.1. Hồ sơ đăng ký

```
Chờ duyệt  →  Đã duyệt — chờ kích hoạt   (gửi email kèm link kích hoạt)
Đã duyệt — chờ kích hoạt  →  Đã kích hoạt
              ← trả tháng đầu qua PayOS, hoặc chọn dùng thử 14 ngày
              → sinh doanh nghiệp + gói + tài khoản Brand Manager
              → sinh nhận diện mặc định, gửi email mật khẩu tạm
Đã duyệt — chờ kích hoạt  →  Đã duyệt — chờ kích hoạt
              (link hết hạn hoặc đổi gói trước khi kích hoạt, Platform Staff gửi lại link mới)
Chờ duyệt  →  Bị từ chối  (kèm lý do)
```

Link kích hoạt hết hạn sau 7 ngày nhưng hồ sơ vẫn ở Đã duyệt — chờ kích hoạt; Platform Staff gửi lại hoặc đổi gói đã duyệt thì link cũ mất hiệu lực. Kích hoạt chỉ xảy ra một lần cho mỗi hồ sơ (BR-67).

### 5.2. Doanh nghiệp

```
Dùng thử   →  Hoạt động            (Brand Manager thanh toán, OW-13)
Dùng thử   →  Hết hạn — chỉ đọc    (qua 14 ngày chưa thanh toán)
Hoạt động  →  Hết hạn — chỉ đọc    (qua ngày hết hạn chưa thanh toán)
Hết hạn — chỉ đọc  →  Hoạt động    (Brand Manager thanh toán / Admin gia hạn thủ công)
Dùng thử / Hoạt động  →  Tạm ngưng  →  trạng thái trước đó  (Admin, kèm lý do)
```

Dùng thử, Hoạt động và Hết hạn tính từ ngày hết hạn và loại của kỳ thuê bao hiện tại khi xử lý yêu cầu, không cần job đổi trạng thái; job hằng ngày chỉ lập hoá đơn và gửi email nhắc (25.6). Ở chế độ chỉ đọc, POS không tạo được đơn mới; đơn đã thanh toán trước đó vẫn được pha và gọi số cho xong.

### 5.3. Đơn

```
Chờ thanh toán → Đã thanh toán → Đang pha → Sẵn sàng (đã gọi số) → Hoàn tất
Chờ thanh toán → Đã huỷ          (thu ngân huỷ, sửa đơn, hoặc QR hết hạn)
Chờ thanh toán → Cần xử lý       (webhook báo số tiền lệch)
                   → Đã thanh toán  (Store Manager xác nhận thủ công)
                   → Đã huỷ         (Store Manager huỷ, hoàn tiền mặt số đã nhận)
Đã thanh toán / Đang pha / Sẵn sàng / Hoàn tất → Đã huỷ   (hoàn tiền mặt toàn bộ: thu ngân trong ngày bán, Store Manager mọi lúc; kèm lý do)
```

Không có trạng thái Nháp trong cơ sở dữ liệu. Giỏ món trước khi chốt nằm ở POS; chốt đơn mới sinh bản ghi đơn. **Đơn chỉ xuống pha chế khi đã ở Đã thanh toán.**

Sẵn sàng → Hoàn tất khi pha chế bấm Đã giao, hoặc tự chuyển sau 30 phút (cấu hình) để màn hình gọi số không bị đầy bởi số khách quên nhận.

Hoàn tiền một phần (một số dòng) không đổi trạng thái đơn; các dòng được hoàn chuyển Đã huỷ (5.4). Hoàn hết mọi dòng thì đơn chuyển Đã huỷ. Mọi khoản hoàn bằng tiền mặt và được ghi riêng (mục 28).

### 5.4. Dòng món

```
Chờ pha  →  Đang pha  →  Xong
Chờ pha  →  Hết món                         (pha chế báo hết; Store Manager xử lý)
Chờ pha / Đang pha / Xong  →  Đã huỷ        (hoàn tiền dòng: thu ngân trong ngày bán hoặc Store Manager)
```

Đơn chuyển Sẵn sàng khi mọi dòng món chưa bị huỷ đều đã Xong. Dòng combo không có trạng thái pha riêng: trạng thái suy ra từ các dòng thành phần; hoàn tiền combo huỷ mọi dòng thành phần cùng lúc (BR-79).

### 5.5. Thanh toán

```
Tiền mặt:  Khởi tạo → Đã thanh toán

QR:  Chờ chuyển khoản → Đã thanh toán   (webhook hợp lệ hoặc Kiểm tra lại)
     Chờ chuyển khoản → Hết hạn         (quá thời hạn QR, mặc định 10 phút)
     Chờ chuyển khoản → Đã huỷ          (đổi sang tiền mặt, hoặc sửa đơn)
     Chờ chuyển khoản → Lệch số tiền    (chờ Store Manager)
     Chờ chuyển khoản / Lệch số tiền
                      → Đã thanh toán, xác nhận thủ công (Store Manager, có lý do)
```

Mỗi đơn có tối đa một thanh toán ở trạng thái Đã thanh toán. Huỷ đơn đã thanh toán không đổi trạng thái thanh toán; hệ thống ghi một khoản hoàn tiền mặt — số tiền, dòng được hoàn, người hoàn, lý do — gắn với đơn (mục 28).

### 5.6. Liên kết PayOS

```
Chưa liên kết  →  Đang kiểm tra  →  Đã liên kết
                  Đang kiểm tra  →  Lỗi  →  Brand Manager nhập lại
Đã liên kết    →  Lỗi             (PayOS từ chối khoá khi tạo QR)
Đã liên kết    →  Chưa liên kết   (Brand Manager gỡ)
```

Chỉ ở Đã liên kết thì POS mới hiện nút thu QR.

### 5.7. Bộ nhận diện thương hiệu

```
Mặc định nền tảng  →  Brand Manager sửa  →  Đang áp dụng  →  Brand Manager sửa tiếp
Đang áp dụng       →  Khôi phục mặc định  →  Mặc định nền tảng
Đang áp dụng       →  Hạ xuống gói Cơ bản  →  Tạm không áp (giữ cấu hình)
```

Không có trạng thái chờ duyệt. Brand Manager lưu là áp dụng ngay cho toàn doanh nghiệp — nền tảng không kiểm duyệt màu sắc của khách hàng.

### 5.8. Áp phích

```
Đang bật  ⇄  Đang tắt                 (Brand Manager bật/tắt)
Đang bật / Đang tắt  →  Đã xoá        (Brand Manager xoá, không khôi phục)
```

Không có áp phích nào đang bật thì màn hình phía khách dùng ảnh mặc định của nền tảng. Doanh nghiệp hết hạn chuyển chỉ đọc thì Brand Manager không sửa được áp phích, nhưng màn hình vẫn chiếu những áp phích đang bật.

### 5.9. Một lượt in

```
Đang in  →  Đã in
Đang in  →  In lỗi  →  Đang in       (thu ngân bấm In lại)
Đang in  →  Chưa chọn máy in        (chọn máy in rồi in lại từ lịch sử đơn)
```

Lượt in không phải trạng thái của đơn. Đơn đã ở Đã thanh toán và đã xuống pha chế trước khi in, nên in lỗi không kéo lùi đơn (BR-21).

### 5.10. Tài khoản và mật khẩu tạm

```
Chờ đổi mật khẩu  →  Hoạt động            (đổi mật khẩu tạm thành công)
Chờ đổi mật khẩu  →  Mật khẩu tạm hết hạn  (quá 72 giờ chưa đổi)
Mật khẩu tạm hết hạn  →  Chờ đổi mật khẩu  (cấp trên gửi lại)
Hoạt động         →  Chờ đổi mật khẩu      (cấp trên đặt lại mật khẩu)
Mọi trạng thái    →  Bị khoá  →  trạng thái trước đó   (cấp trên khoá, mở khoá)
```

Tài khoản Chờ đổi mật khẩu vẫn tính vào hạn mức tài khoản của gói (13.1). Mở khoá không đổi mật khẩu: tài khoản bị khoá lúc đang Chờ đổi mật khẩu thì mở khoá xong vẫn phải đổi.

### 5.11. Số máy rung của đơn

```
Chưa gán  →  Đã gán     (thu ngân nhập số; đơn Đã thanh toán, Đang pha hoặc Sẵn sàng)
Đã gán    →  Đã gán     (đổi sang số khác)
Đã gán    →  Chưa gán   (thu ngân gỡ)
Đã gán    →  Đã báo     (đơn Sẵn sàng; pha chế bấm bộ phát rồi chạm Đã báo)
Đã báo    →  Đã gán     (thu ngân đổi sang số khác: phải báo lại số mới)
Đã báo    →  Chưa gán   (thu ngân gỡ)
Đã gán, Đã báo  →  Đã trả số  (đơn Hoàn tất hoặc Đã huỷ)
```

Số máy rung không phải trạng thái của đơn và không đổi vòng đời đơn (5.3). Đơn không gán máy rung vẫn đi đủ các trạng thái như cũ. Đã báo chỉ là dấu nhắc cho pha chế, không chứng minh máy đã rung (GĐ-19).

### 5.12. Một lượt nhập menu bằng ảnh

```
Đang nhận dạng  →  Chờ duyệt  →  Đã nhập
Đang nhận dạng  →  Lỗi        (OCR không đọc được chữ, hoặc AI vẫn sai cấu trúc sau một lần gọi lại)
Chờ duyệt       →  Đã huỷ     (Brand Manager huỷ, hoặc bỏ quá 7 ngày)
```

Chỉ bước Đã nhập mới ghi vào menu. Đang nhận dạng, Chờ duyệt, Lỗi và Đã huỷ không làm thay đổi món nào (BR-61).

### 5.13. Hoá đơn thuê bao

```
Chưa thanh toán  →  Đã thanh toán   (webhook hợp lệ / Kiểm tra lại → cộng một kỳ)
Chưa thanh toán  →  Lệch số tiền    (số tiền khác hoá đơn → báo Admin)
Lệch số tiền     →  Đã thanh toán   (Admin xác nhận thủ công, kèm lý do)
Chưa thanh toán  →  Đã huỷ          (Brand Manager đổi gói kỳ đó, hoặc Admin huỷ)
```

Mỗi lần Brand Manager bấm Thanh toán, hệ thống tạo một QR PayOS có hạn 15 phút cho hoá đơn; QR hết hạn thì hoá đơn vẫn Chưa thanh toán, Brand Manager bấm Thanh toán lại để lấy QR mới. Hoá đơn chưa trả vẫn trả được sau ngày hết hạn — doanh nghiệp chỉ đọc cho tới khi trả (BR-70, BR-73).

### 5.14. Combo

```
Đang kinh doanh  ⇄  Ngừng kinh doanh   (Brand Manager bật/tắt cấp chuỗi)
Tại chi nhánh:   Còn bán  ⇄  Tạm hết  (Store Manager hoặc Barista)
Tại chi nhánh:   Còn bán  →  Tự hết   (thành phần cố định hết, hoặc
                                       mọi biến thể của một thành phần hết)
```

Tự hết không phải cờ lưu trong cơ sở dữ liệu: backend tính từ trạng thái còn bán của từng món thành phần mỗi khi trả menu, nên món có hàng lại là combo tự bán lại được (BR-78). Combo đã bán giữ nguyên trong đơn cũ dù combo bị sửa hay tắt sau đó (BR-15).

## 6. Luồng nghiệp vụ

### 6.1. Onboarding doanh nghiệp mới

```
[Chủ quán]       Nộp hồ sơ đăng ký trên web
                    ↓
[Hệ thống]       Hồ sơ vào trạng thái Chờ duyệt
                    ↓
[Platform Staff] Mở chi tiết, đối chiếu thông tin
                    ├─ Từ chối: ghi lý do, gửi email
                    │    → chủ quán sửa và nộp lại
                    └─ Duyệt: chọn gói
                              → email báo duyệt kèm link kích hoạt
                    ↓
[Chủ quán]       Bấm link → trang kích hoạt (không cần đăng nhập)
                    ├─ Trả tháng đầu: quét QR PayOS của nền tảng
                    │    → webhook → thuê bao Hoạt động 1 tháng
                    └─ Dùng thử: 14 ngày gói Cơ bản, không trả tiền
                    ↓
[Hệ thống]       Sinh không gian dữ liệu + tài khoản Brand Manager
                 + nhận diện mặc định + gửi email mật khẩu tạm
                    ↓
[Brand Manager]  Đăng nhập lần đầu, đổi mật khẩu
                    ↓
[Brand Manager]  Cấu hình nhận diện: logo, màu chuỗi, tên hiển thị
                 (gói Tiêu chuẩn trở lên)
                    ↓
[Brand Manager]  Liên kết PayOS: nhập ba khoá → hệ thống kiểm tra
                    ↓
[Brand Manager]  Tạo chi nhánh, danh mục, món, nhóm tuỳ chọn, topping, combo,
                 gán món cho chi nhánh; đặt giá riêng nếu chi nhánh cần
                    ├─ Vượt số chi nhánh của gói → chặn, gợi ý nâng gói
                    ↓
[Brand Manager]  Tạo tài khoản Store Manager cho từng chi nhánh
                    ↓
[Store Manager]  Đăng nhập — giao diện đã mang màu của chuỗi
                    ↓
[Store Manager]  Tạo tài khoản thu ngân và pha chế, tạo quầy
                    ↓
[Cashier]        Ghép màn hình phía khách với quầy; Store Manager ghép màn hình gọi số
                    ↓
                 Chi nhánh sẵn sàng bán hàng
```

Luồng này là kịch bản demo mở màn khi bảo vệ. Nó cho thấy multi-tenant, gói dịch vụ, nhận diện riêng theo chuỗi và phân cấp tài khoản trong một mạch. Ở bước kích hoạt, demo chọn dùng thử để đi tiếp ngay; thanh toán tháng đầu và gia hạn qua PayOS demo riêng ở 6.8.

### 6.2. Luồng chính tại quầy — từ lúc khách gọi món tới lúc nhận món

```
[Khách]     Tới quầy, gọi món
               ↓
[Cashier]   Chọn món hoặc combo, size, đường, đá, topping, số lượng, ghi chú
            → màn hình phía khách hiện món và tổng tiền theo thời gian thực
               ├─ Khách đổi ý → sửa, xoá thoải mái (chưa trả thì chưa pha)
               ↓
[Cashier]   Chốt đơn
               ↓
[Hệ thống]  Kiểm tra món và tuỳ chọn còn bán, kiểm tra quy tắc chọn,
            tính tổng tiền ở backend theo giá chi nhánh, chụp giá lúc bán
               ├─ Có món hoặc topping vừa hết → chặn, báo món nào, khách chọn lại
               ↓
[Cashier]   Chọn hình thức thanh toán
               ├─ Tiền mặt: nhập tiền khách đưa → hệ thống tính tiền thối (6.4)
               └─ QR: hệ thống tạo QR qua PayOS → màn hình phía khách hiện QR
                      + đồng hồ đếm ngược → khách quét → webhook (6.3)
               ↓
[Hệ thống]  Đơn Đã thanh toán → cấp số gọi → in bill + phiếu số
            → đẩy dòng món vào hàng đợi pha chế
               ↓
[Barista]   Thấy mẻ đã gom trong hàng đợi → Bắt đầu mẻ → Xong từng ly
               ↓
[Hệ thống]  Đơn đủ món → gọi số trên màn hình gọi số + âm báo
               ↓
[Khách]     Đưa phiếu số, nhận món
               ↓
[Barista]   Bấm Đã giao → số rời màn hình gọi số, đơn Hoàn tất
```

### 6.3. Thu QR qua PayOS

1. Brand Manager đã tạo kênh PayOS gắn với tài khoản ngân hàng của mình và nhập Client ID, API Key, Checksum Key vào hệ thống. Các khoá này lưu mã hoá, mỗi doanh nghiệp một bộ.
2. Thu ngân chốt đơn và chọn chuyển khoản. Backend dùng khoá của đúng doanh nghiệp đó gọi PayOS tạo QR với orderCode là mã đơn và amount là tổng tiền.
3. POS đẩy QR sang màn hình phía khách, kèm đồng hồ đếm ngược khoảng 10 phút.
4. Khách quét bằng app ngân hàng bất kỳ, tiền vào thẳng tài khoản của chủ chuỗi.
5. PayOS gửi webhook về backend. Backend kiểm tra chữ ký bằng checksum key của đúng doanh nghiệp đó, rồi đối chiếu orderCode và số tiền. Xử lý idempotent theo mã giao dịch, nên webhook về hai lần cũng chỉ ghi một lần.
6. Đơn chuyển sang Đã thanh toán. Socket.IO báo lên POS ("Đã nhận 45.000đ" kèm âm thanh), màn hình phía khách báo thành công, in bill và phiếu số, đẩy đơn xuống màn hình pha chế.

**Các trường hợp dự phòng:**

- **Webhook về chậm:** thu ngân bấm "Kiểm tra lại" để backend gọi API tra cứu trạng thái của PayOS. Kết quả đi qua đúng bước đối chiếu như webhook.
- **Webhook không về nhưng khách chìa màn hình báo chuyển thành công:** chỉ Store Manager được xác nhận thủ công (BM-05), và hệ thống lưu người xác nhận cùng lý do.
- **Hết hạn QR:** backend huỷ QR bên PayOS và huỷ đơn. Món chưa pha nên không mất gì. Khách muốn mua tiếp thì thu ngân mở lại giỏ cũ, chốt thành đơn mới.
- **Số tiền lệch:** không tự xác nhận. Đơn sang Cần xử lý, báo Store Manager.
- **Khách đổi sang tiền mặt khi QR đang hiện:** backend huỷ QR bên PayOS trước, rồi mới cho thu tiền mặt — tránh khách vừa chuyển khoản vừa trả tiền mặt.

Chi tiết kỹ thuật ở mục 11.

### 6.4. Thu tiền mặt

1. Thu ngân chốt đơn, chọn tiền mặt
2. Nhập số tiền khách đưa, hoặc bấm nút mệnh giá nhanh (50.000, 100.000, 200.000, 500.000, vừa đủ)
3. Hệ thống chặn nếu số tiền nhỏ hơn tổng; tính và hiện tiền thối cỡ chữ lớn
4. Thu ngân bấm xác nhận → đơn Đã thanh toán, ghi tên thu ngân, cấp số gọi, in bill và phiếu số, đẩy xuống pha chế

### 6.5. Sửa và huỷ đơn

**Trước khi trả tiền** — thu ngân tự làm, không cần ai duyệt, không ghi audit log:

- Đang ở giỏ món: sửa, xoá tự do
- Đã chốt, đang hiện QR: bấm "Sửa đơn" → backend huỷ QR và huỷ đơn cũ → POS mở lại giỏ với nội dung cũ → chốt thành đơn mới với mã mới
- Khách bỏ đi: bấm huỷ, đơn sang Đã huỷ

**Sau khi trả tiền** — hoàn tiền mặt: thu ngân với đơn trong ngày bán (CS-07), Store Manager với mọi đơn của chi nhánh (BM-06):

1. Thu ngân mở đơn từ lịch sử đơn (CS-05) hoặc Store Manager tra cứu đơn (BM-04), chọn hoàn toàn bộ hoặc chọn dòng món cần hoàn; combo hoàn theo cả dòng
2. Chọn lý do (bắt buộc). Hình thức hoàn luôn là tiền mặt tại quầy, kể cả khi khách đã trả bằng QR (BR-81)
3. Người hoàn lấy tiền mặt từ két trả khách rồi bấm Xác nhận đã hoàn; POS in phiếu hoàn tiền; thu ngân hoàn thì Store Manager nhận thông báo (BR-82)
4. Hệ thống tính số tiền hoàn theo giá lúc bán, gỡ dòng món khỏi hàng đợi pha chế nếu chưa xong; dòng món đã pha xong vẫn huỷ được và được ghi là hao hụt (BR-49); ghi audit log
5. Báo cáo doanh thu trừ phần đã huỷ vào ngày huỷ và hiện riêng mục đơn huỷ (BR-50)

Hệ thống không hoàn tiền qua PayOS và không có hoàn bằng chuyển khoản. Hoàn chuyển khoản cần số tài khoản của khách, người có quyền chuyển tiền từ tài khoản chủ chuỗi và một trạng thái chờ hoàn phải theo dõi nhiều ngày — quá phức tạp so với giá trị một đơn tại quầy. Mọi khoản hoàn trả bằng tiền mặt từ két; hệ thống ghi nhận để đối chiếu két cuối ngày (GĐ-05, mục 28).

### 6.6. Pha chế báo hết món

1. Pha chế bấm Hết món trên một món, một tuỳ chọn hoặc một topping (ví dụ hết trân châu đen)
2. Hệ thống tắt món hoặc tuỳ chọn đó ở cấp chi nhánh; POS mọi quầy của chi nhánh không chọn được nữa; combo có thành phần cố định là món đó tạm hết, combo có món đó là biến thể thì chỉ khoá lựa chọn đó (BR-78)
3. Nếu hàng đợi còn dòng món đã trả tiền chứa món đó: dòng món sang Hết món, cảnh báo Store Manager
4. Store Manager ra quầy trao đổi với khách: hoàn tiền mặt dòng món đó (BM-06, hoặc thu ngân với CS-07); khách muốn món khác thì gọi đơn mới
5. Khi có hàng lại, pha chế hoặc Store Manager bật món lên

### 6.7. Liên kết PayOS

1. Brand Manager tạo kênh thanh toán trên trang PayOS, gắn với tài khoản ngân hàng của chủ chuỗi (việc này làm ngoài hệ thống)
2. Brand Manager vào cài đặt doanh nghiệp, thẻ Thanh toán, dán Client ID, API Key, Checksum Key
3. Backend mã hoá và lưu, rồi gọi PayOS xác nhận địa chỉ webhook riêng của doanh nghiệp
4. Thành công → trạng thái Đã liên kết, POS mọi chi nhánh hiện nút thu QR. Thất bại → báo lỗi cụ thể, không lưu khoá sai
5. Sau khi lưu, khoá chỉ hiện dạng che (ví dụ ••••3f9a). Muốn đổi thì nhập lại cả bộ
6. Mọi lần lưu, đổi, gỡ đều ghi audit log

### 6.8. Gói dịch vụ — gia hạn qua PayOS, đổi gói, hết hạn

```
[Hệ thống]      Trước ngày hết hạn 7 ngày: lập hoá đơn kỳ tiếp theo theo
                gói đang dùng → email nhắc Brand Manager kèm link tới trang
                Gói dịch vụ trên web
                   ↓
[Brand Manager] Bấm link → đăng nhập (nếu chưa) → về đúng trang Gói dịch vụ
                   ├─ Muốn đổi gói cho kỳ tới → chọn gói khác → hoá đơn
                   │    lập lại theo giá gói mới
                   │    └─ Hạ gói mà đang vượt hạn mức gói mới → cảnh báo;
                   │         dữ liệu giữ nguyên, chặn tạo mới khi sang kỳ mới
                   ↓
[Brand Manager] Bấm Thanh toán → QR PayOS của nền tảng (hạn 15 phút)
                → quét bằng app ngân hàng
                   ↓
[Hệ thống]      Webhook hợp lệ → hoá đơn Đã thanh toán → cộng một tháng
                vào ngày hết hạn → kỳ mới áp gói đã chọn → email biên nhận

(Chưa trả)
[Hệ thống]      Còn 3 ngày, và đúng ngày hết hạn → email nhắc lại
[Hệ thống]      Qua ngày hết hạn → doanh nghiệp chỉ đọc
[Brand Manager] Thanh toán bất cứ lúc nào → mở lại ngay, không mất dữ liệu

(Ngoại lệ)
[Admin]         Gia hạn thủ công kèm lý do; xác nhận thủ công hoá đơn lệch
                số tiền; đổi gói gấp giữa kỳ — đều ghi audit log
```

### 6.9. Cấu hình nhận diện thương hiệu

1. Brand Manager (gói Tiêu chuẩn trở lên) vào màn hình cài đặt doanh nghiệp, chọn thẻ Nhận diện
2. Tải logo, chọn màu chủ đạo (bộ dựng sẵn hoặc nhập mã màu), chọn màu nhấn, đặt tên hiển thị
3. Khung xem trước bên cạnh đổi theo ngay khi chọn, chưa lưu
4. Hệ thống kiểm tra tương phản; nếu màu chữ trên nền màu chủ đạo không đủ đọc, tự đổi màu chữ và báo cho Brand Manager biết
5. Brand Manager bấm lưu → ghi vào bản ghi nhận diện của doanh nghiệp, ghi audit log
6. Mọi client của doanh nghiệp tải lại cấu hình ở lần điều hướng kế tiếp hoặc lần đăng nhập kế tiếp; màn hình phía khách và màn hình gọi số nhận qua Socket.IO
7. Có nút khôi phục mặc định

Chi tiết ở mục 10.

### 6.10. Các luồng phụ

| **Tình huống**                                                            | **Xử lý**                                                                                                                                                                    |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Khách đổi ý trước khi trả                                                 | Thu ngân sửa giỏ tự do. Nếu QR đã tạo thì dùng Sửa đơn: huỷ QR, mở lại giỏ, chốt đơn mới                                                                                     |
| ---                                                                       | ---                                                                                                                                                                          |
| Khách đổi từ QR sang tiền mặt                                             | Backend huỷ QR bên PayOS trước, rồi mới cho thu tiền mặt                                                                                                                     |
| ---                                                                       | ---                                                                                                                                                                          |
| Webhook về chậm                                                           | Nút Kiểm tra lại gọi API tra cứu trạng thái của PayOS                                                                                                                        |
| ---                                                                       | ---                                                                                                                                                                          |
| Webhook không về, khách chìa màn hình chuyển thành công                   | Chỉ Store Manager xác nhận thủ công, bắt buộc lý do, lưu người xác nhận                                                                                                      |
| ---                                                                       | ---                                                                                                                                                                          |
| QR hết hạn                                                                | Huỷ QR và huỷ đơn. Khách muốn mua tiếp thì chốt đơn mới hoặc trả tiền mặt                                                                                                    |
| ---                                                                       | ---                                                                                                                                                                          |
| Webhook báo số tiền khác tổng đơn                                         | Không tự xác nhận; đơn sang Cần xử lý, báo Store Manager                                                                                                                     |
| ---                                                                       | ---                                                                                                                                                                          |
| Webhook về hai lần cho cùng giao dịch                                     | Lần sau bị bỏ qua: không cấp thêm số gọi, không in thêm bill (BR-27)                                                                                                         |
| ---                                                                       | ---                                                                                                                                                                          |
| Webhook sai chữ ký                                                        | Bỏ qua, ghi log bảo mật, không đổi trạng thái đơn                                                                                                                            |
| ---                                                                       | ---                                                                                                                                                                          |
| Tiền về sau khi đơn đã huỷ do hết hạn                                     | Không tự khôi phục đơn; báo Store Manager — xác nhận thủ công để pha, hoặc hoàn lại bằng tiền mặt tại quầy (BR-31, BR-81)                                                    |
| ---                                                                       | ---                                                                                                                                                                          |
| Khách muốn huỷ sau khi đã trả                                             | Thu ngân hoàn tiền mặt kèm lý do (CS-07), kể cả khi khách đã trả bằng QR; đơn của ngày trước thì Store Manager hoàn (BM-06)                                                  |
| ---                                                                       | ---                                                                                                                                                                          |
| Pha chế báo hết món khi đơn đã trả                                        | Dòng món sang Hết món, báo Store Manager; thu ngân hoặc Store Manager hoàn tiền mặt dòng đó                                                                                  |
| ---                                                                       | ---                                                                                                                                                                          |
| Khách không tới nhận món                                                  | Sau 30 phút đơn tự chuyển Hoàn tất, số rời màn hình gọi số; vẫn tính doanh thu                                                                                               |
| ---                                                                       | ---                                                                                                                                                                          |
| Khách mất phiếu số                                                        | Đọc số gọi hoặc đưa bill; pha chế tra theo số gọi trong danh sách đơn Sẵn sàng                                                                                               |
| ---                                                                       | ---                                                                                                                                                                          |
| Máy in lỗi: kẹt giấy, hết giấy, mất kết nối                               | Đơn vẫn Đã thanh toán và vẫn xuống pha chế; POS báo In thất bại; in lại từ lịch sử đơn (CS-05), mỗi lần in lại ghi log (BR-21)                                               |
| ---                                                                       | ---                                                                                                                                                                          |
| Thu ngân chưa chọn máy in và quầy chưa khai báo máy in                    | Thanh toán vẫn xong; POS báo Chưa chọn máy in, chỉ tới Tài khoản › Máy in hóa đơn; chọn xong thì in lại từ lịch sử đơn                                                       |
| ---                                                                       | ---                                                                                                                                                                          |
| Không dựng được ảnh bill                                                  | POS tự chuyển sang in chữ không dấu để khách vẫn có bill                                                                                                                     |
| ---                                                                       | ---                                                                                                                                                                          |
| Bluetooth đang tắt hoặc app chưa được cấp quyền Bluetooth                 | POS báo cụ thể cần bật Bluetooth hoặc cấp quyền; không chặn thanh toán                                                                                                       |
| ---                                                                       | ---                                                                                                                                                                          |
| Hai pha chế cùng bấm Bắt đầu một mẻ                                       | Ai bấm trước thắng, backend khoá bằng transaction; người sau thấy mẻ đã có người nhận                                                                                        |
| ---                                                                       | ---                                                                                                                                                                          |
| Doanh nghiệp chưa liên kết PayOS                                          | POS chỉ hiện tiền mặt                                                                                                                                                        |
| ---                                                                       | ---                                                                                                                                                                          |
| Khoá PayOS sai hoặc bị thu hồi                                            | Tạo QR lỗi → POS báo, gợi ý thu tiền mặt; liên kết sang Lỗi, cảnh báo Brand Manager                                                                                          |
| ---                                                                       | ---                                                                                                                                                                          |
| Vượt hạn mức gói                                                          | Backend chặn, trả lỗi có gợi ý nâng gói; không chỉ ẩn nút                                                                                                                    |
| ---                                                                       | ---                                                                                                                                                                          |
| Gọi tính năng gói không có                                                | Backend từ chối; giao diện hiện mục bị khoá kèm nhãn gói cần có                                                                                                              |
| ---                                                                       | ---                                                                                                                                                                          |
| Doanh nghiệp hết hạn khi đang bán                                         | POS không chốt được đơn mới; đơn đã trả tiền vẫn pha và gọi số cho xong                                                                                                      |
| ---                                                                       | ---                                                                                                                                                                          |
| Màn hình phía khách mất kết nối                                           | POS báo ngay; khi thu QR, POS hiện QR trên chính màn hình thu ngân để xoay cho khách quét. Không chặn bán hàng (BR-47)                                                       |
| ---                                                                       | ---                                                                                                                                                                          |
| Mở lại app màn hình phía khách, hoặc máy khởi động lại                    | Tự vào lại bằng token đã lưu, xin trạng thái hiện tại của quầy, không cần ghép lại                                                                                           |
| ---                                                                       | ---                                                                                                                                                                          |
| Màn hình phía khách bị mất hoặc nghi bị lấy                               | Store Manager thu hồi token; máy đó không nhận được dữ liệu quầy nữa                                                                                                         |
| ---                                                                       | ---                                                                                                                                                                          |
| Ghép một máy mới vào quầy đã có màn hình khách                            | Máy cũ bị thu hồi tự động — mỗi quầy tối đa một màn hình khách                                                                                                               |
| ---                                                                       | ---                                                                                                                                                                          |
| Mã OTP hết hạn trước khi thu ngân kịp nhập                                | Màn hình tự xin và hiện mã mới; nhập mã cũ thì POS báo mã đã hết hạn                                                                                                         |
| ---                                                                       | ---                                                                                                                                                                          |
| Thu ngân nhập sai mã OTP                                                  | POS báo sai mã và cho nhập lại; sai 5 lần liên tiếp thì khoá ghép của quầy 5 phút và ghi audit log (BR-45)                                                                   |
| ---                                                                       | ---                                                                                                                                                                          |
| Mạng chập chờn                                                            | Client tải lại trạng thái mới nhất khi có mạng, không dựng từ dữ liệu cũ                                                                                                     |
| ---                                                                       | ---                                                                                                                                                                          |
| Hồ sơ đăng ký trùng mã số thuế                                            | Hệ thống cảnh báo Platform Staff, không tự chặn                                                                                                                              |
| ---                                                                       | ---                                                                                                                                                                          |
| Brand Manager tải logo sai định dạng hoặc quá nặng                        | Chặn ngay ở bước tải, báo giới hạn cụ thể, giữ logo cũ                                                                                                                       |
| ---                                                                       | ---                                                                                                                                                                          |
| Brand Manager chọn màu quá nhạt làm mất chữ                               | Hệ thống tự đổi màu chữ sang tương phản đủ, không từ chối màu của khách                                                                                                      |
| ---                                                                       | ---                                                                                                                                                                          |
| Brand Manager chưa có áp phích hoặc tắt hết                               | Màn hình phía khách dùng ảnh mặc định của nền tảng                                                                                                                           |
| ---                                                                       | ---                                                                                                                                                                          |
| Brand Manager tải áp phích sai định dạng, quá 5 MB, hoặc đã đủ 6 áp phích | Chặn ngay ở bước chọn tệp, báo lý do cụ thể, giữ nguyên áp phích hiện có (BR-51)                                                                                             |
| ---                                                                       | ---                                                                                                                                                                          |
| Áp phích khác tỉ lệ màn hình (ảnh dọc, ảnh vuông)                         | Hiện nguyên ảnh, không cắt chữ; phần trống lấp bằng chính ảnh đó làm mờ                                                                                                      |
| ---                                                                       | ---                                                                                                                                                                          |
| Email mật khẩu tạm không tới (sai email, vào thư rác)                     | Cấp trên kiểm tra email, sửa nếu sai, bấm Gửi lại; mỗi lần gửi lại sinh mật khẩu tạm mới (BR-57)                                                                             |
| ---                                                                       | ---                                                                                                                                                                          |
| Mật khẩu tạm đã quá 72 giờ                                                | Đăng nhập báo mật khẩu tạm hết hạn, hướng dẫn liên hệ cấp trên gửi lại (BR-55)                                                                                               |
| ---                                                                       | ---                                                                                                                                                                          |
| Nhân viên quên mật khẩu                                                   | Không có quên mật khẩu tự phục vụ; báo cấp trên trực tiếp đặt lại (BR-56)                                                                                                    |
| ---                                                                       | ---                                                                                                                                                                          |
| Đổi mật khẩu bỏ dở rồi tắt app                                            | Lần đăng nhập sau vẫn phải đổi; không vào được màn hình nào khác                                                                                                             |
| ---                                                                       | ---                                                                                                                                                                          |
| Số máy rung đang gắn với một đơn khác chưa xong                           | POS báo số gọi của đơn đang giữ; thu ngân đưa máy khác, hoặc gỡ số ở đơn kia nếu đó là gán nhầm (BR-58)                                                                      |
| ---                                                                       | ---                                                                                                                                                                          |
| Đưa nhầm máy rung cho khách                                               | Thu ngân đổi số trên đơn; hàng đợi pha chế cập nhật ngay                                                                                                                     |
| ---                                                                       | ---                                                                                                                                                                          |
| Đơn có máy rung bị huỷ hoặc tự Hoàn tất sau 30 phút                       | Số máy rung tự được giải phóng; quán thu lại máy                                                                                                                             |
| ---                                                                       | ---                                                                                                                                                                          |
| Thu ngân nhập số khi đơn đã Sẵn sàng (khách quay lại lấy máy muộn)        | Màn hình pha chế hiện ngay "Báo máy rung số …" kèm âm báo trên thẻ Sẵn sàng của đơn; pha chế bấm số trên bộ phát                                                             |
| ---                                                                       | ---                                                                                                                                                                          |
| Thu ngân đổi số sau khi pha chế đã chạm Đã báo                            | Dấu Đã báo bị xoá; nhắc hiện lại với số mới để pha chế bấm lại (BR-65)                                                                                                       |
| ---                                                                       | ---                                                                                                                                                                          |
| Màn hình pha chế mất kết nối đúng lúc thu ngân gán số                     | Gán vẫn thành công ở backend; khi có mạng, màn hình pha chế tải lại hàng đợi và danh sách Sẵn sàng, số máy rung lấy từ dữ liệu đơn mới nhất (BR-64)                          |
| ---                                                                       | ---                                                                                                                                                                          |
| Ảnh menu mờ, chữ viết tay, OCR không đọc được                             | Lượt nhập sang Lỗi kèm lý do; Brand Manager chụp lại hoặc nhập tay (OW-02)                                                                                                   |
| ---                                                                       | ---                                                                                                                                                                          |
| AI sắp sai danh mục, size hoặc giá                                        | Brand Manager sửa trong bản nháp; chưa bấm Nhập thì không có gì ghi vào menu (BR-61)                                                                                         |
| ---                                                                       | ---                                                                                                                                                                          |
| Bản nháp có món trùng với menu đang có                                    | Mặc định Cập nhật giá nếu giá khác, Bỏ qua nếu giá giống; Brand Manager đổi được (BR-62)                                                                                     |
| ---                                                                       | ---                                                                                                                                                                          |
| Link kích hoạt đã quá 7 ngày                                              | Trang kích hoạt báo link hết hạn, hướng dẫn liên hệ nền tảng; Platform Staff bấm Gửi lại link kích hoạt, link cũ mất hiệu lực (BR-67, PS-01)                                 |
| ---                                                                       | ---                                                                                                                                                                          |
| Bấm link kích hoạt sau khi đã kích hoạt                                   | Trang báo đã kích hoạt và chỉ tới trang đăng nhập; không sinh thêm doanh nghiệp hay tài khoản                                                                                |
| ---                                                                       | ---                                                                                                                                                                          |
| Chủ quán quét QR tháng đầu rồi đóng trang trước khi thấy kết quả          | Webhook vẫn kích hoạt và email tài khoản Brand Manager vẫn được gửi; mở lại link thì trang báo đã kích hoạt                                                                  |
| ---                                                                       | ---                                                                                                                                                                          |
| Mã số thuế đã từng dùng thử                                               | Trang kích hoạt ẩn lựa chọn dùng thử, chỉ còn trả tháng đầu (BR-68)                                                                                                          |
| ---                                                                       | ---                                                                                                                                                                          |
| Webhook thuê bao về chậm                                                  | Nút Kiểm tra lại trên trang thanh toán gọi API tra cứu của PayOS; kết quả đi qua cùng bước đối chiếu như webhook                                                             |
| ---                                                                       | ---                                                                                                                                                                          |
| Webhook thuê bao báo số tiền khác hoá đơn                                 | Không tự gia hạn; hoá đơn sang Lệch số tiền, báo Admin xác nhận thủ công hoặc hoàn tiền ngoài hệ thống (BR-71)                                                               |
| ---                                                                       | ---                                                                                                                                                                          |
| Brand Manager mở hai QR cho cùng một hoá đơn (hai tab)                    | Mỗi hoá đơn chỉ một QR còn hiệu lực; tạo QR mới thì QR cũ bị huỷ bên PayOS (BR-72). Tiền vẫn về cho hoá đơn đã trả thì không cộng thêm kỳ, chỉ ghi nhận và báo Admin (BR-71) |
| ---                                                                       | ---                                                                                                                                                                          |
| Brand Manager trả sớm khi còn nhiều ngày                                  | Kỳ mới nối tiếp ngày hết hạn hiện tại, không mất ngày nào (BR-70)                                                                                                            |
| ---                                                                       | ---                                                                                                                                                                          |
| Email nhắc hạn vào thư rác hoặc Brand Manager không đọc                   | Web của Brand Manager hiện dải nhắc từ khi còn 7 ngày (dùng thử: 5 ngày); trang Gói dịch vụ luôn có nút Thanh toán                                                           |
| ---                                                                       | ---                                                                                                                                                                          |
| Doanh nghiệp đang chỉ đọc muốn thanh toán                                 | Trang Gói dịch vụ và thanh toán vẫn mở; trả xong mở lại ngay (BR-73)                                                                                                         |
| ---                                                                       | ---                                                                                                                                                                          |
| Brand Manager chọn hạ gói cho kỳ tới trong khi đang vượt hạn mức gói mới  | Cảnh báo trước khi thanh toán, vẫn cho trả; sang kỳ mới thì giữ dữ liệu, chặn tạo mới (BR-11)                                                                                |
| ---                                                                       | ---                                                                                                                                                                          |
| Admin đổi giá gói khi đã có hoá đơn chưa trả                              | Hoá đơn đã lập giữ giá cũ; giá mới áp cho hoá đơn lập sau (BR-72)                                                                                                            |
| ---                                                                       | ---                                                                                                                                                                          |
| Khách đã trả QR rồi xin huỷ                                               | Thu ngân hoàn bằng tiền mặt từ két, không chuyển khoản lại; phiếu hoàn ghi rõ đơn đã trả bằng QR (BR-81)                                                                     |
| ---                                                                       | ---                                                                                                                                                                          |
| Két không đủ tiền mặt để hoàn                                             | Chưa bấm Xác nhận đã hoàn khi chưa đưa tiền cho khách; thu ngân báo Store Manager lấy tiền bổ sung. Hệ thống chỉ ghi khoản hoàn khi đã xác nhận                              |
| ---                                                                       | ---                                                                                                                                                                          |
| Khách xin hoàn đơn của hôm trước                                          | POS không cho thu ngân hoàn; Store Manager hoàn qua BM-06, tiền trừ vào doanh thu ngày hoàn (BR-50, BR-82)                                                                   |
| ---                                                                       | ---                                                                                                                                                                          |
| Khách muốn hoàn một ly trong combo                                        | Không hoàn riêng một thành phần: hoàn cả dòng combo hoặc không hoàn. Ly làm hỏng thì pha lại ngoài hệ thống (BR-79)                                                          |
| ---                                                                       | ---                                                                                                                                                                          |
| Thành phần cố định của combo hết món                                      | Combo tự hết trên POS; bật lại món là combo bán lại được (BR-78)                                                                                                             |
| ---                                                                       | ---                                                                                                                                                                          |
| Một biến thể trong combo hết món                                          | POS khoá lựa chọn đó; còn ít nhất một biến thể thì combo vẫn bán (BR-78)                                                                                                     |
| ---                                                                       | ---                                                                                                                                                                          |
| Thu ngân bấm + topping vượt số phần tối đa                                | POS không cho tăng thêm; backend kiểm lại lúc chốt (BR-80)                                                                                                                   |
| ---                                                                       | ---                                                                                                                                                                          |
| Brand Manager đổi giá chi nhánh khi thu ngân đang có giỏ                  | Giá tính lại lúc chốt theo giá hiệu lực mới; POS cập nhật giỏ và màn hình phía khách hiện tổng mới trước khi thu tiền (BR-85)                                                |
| ---                                                                       | ---                                                                                                                                                                          |
| Khách báo đã quét QR thuê bao nhưng chưa thấy gia hạn                     | Platform Staff bấm Kiểm tra lại cho hoá đơn đó (PS-01); số tiền lệch thì chuyển Platform Admin xác nhận thủ công (BR-71)                                                     |
| ---                                                                       | ---                                                                                                                                                                          |
| Khách muốn đổi gói đã duyệt trước khi kích hoạt                           | Platform Staff đổi gói đã duyệt và gửi link mới; link cũ mất hiệu lực (BR-67, BR-74)                                                                                         |
| ---                                                                       | ---                                                                                                                                                                          |

### 6.11. In bill và phiếu số

- Thu ngân chọn máy in một lần trên tablet POS: Tài khoản › Máy in hóa đơn → chọn trong danh sách máy đã ghép đôi Bluetooth với Android → chọn chế độ in (ảnh hoặc chữ không dấu) → In thử. Chưa chọn thì POS dùng máy in Bluetooth Store Manager khai báo cho quầy (BM-01)
- Đơn chuyển Đã thanh toán → POS gọi API lấy dữ liệu bill của đơn: tên chuỗi, chi nhánh, địa chỉ, điện thoại, mã đơn, giờ thanh toán, thu ngân, từng món kèm tuỳ chọn và ghi chú theo giá lúc bán, tổng tiền, hình thức thanh toán, tiền khách đưa, tiền thừa, số gọi, đường dẫn theo dõi đơn
- POS dựng hai tờ ngoài màn hình (bill và phiếu số), chụp thành ảnh, đổi sang ảnh đen trắng 384 điểm ngang, gửi lệnh in ảnh ESC/POS và cắt giấy sau mỗi tờ
- Màn hình thanh toán thành công hiện trạng thái in: Đang in → Đã in; hoặc Chưa chọn máy in; hoặc In lỗi kèm lý do và nút In lại. Thanh toán và việc đẩy đơn xuống pha chế không phụ thuộc kết quả in (BR-21)
- In lại từ lịch sử đơn (CS-05): thu ngân nhập lý do (tối thiểu 3 ký tự) → backend ghi lượt in lại rồi trả dữ liệu bill → POS in như lần đầu (BR-53)

Chi tiết ở mục 19.

### 6.12. Brand Manager đổi áp phích màn hình phía khách

- Brand Manager mở mục "Poster màn hình sau" trên web. Chọn ảnh là tải lên ngay, không có bước Lưu, để không bỏ lại thay đổi dở
- Web kiểm tra định dạng, dung lượng và số lượng trước khi gửi; backend kiểm tra lại (BR-51)
- Brand Manager đặt tên, bật/tắt, đổi thứ tự lên xuống, đổi ảnh, xoá (có hộp thoại xác nhận). Khung xem trước bên cạnh xoay đúng nhịp màn hình thật
- Mỗi thay đổi lưu vào danh sách áp phích của doanh nghiệp; server báo các màn hình phía khách đang mở ở mọi chi nhánh nạp lại danh sách
- Màn hình phía khách chỉ chiếu áp phích đang bật, theo thứ tự, 8 giây mỗi ảnh (BR-52)

Chi tiết ở mục 20.

### 6.13. Cấp tài khoản và đặt lại mật khẩu

1. Cấp trên tạo tài khoản cấp dưới (PA-02, PA-07, OW-05, BM-01); hệ thống sinh mật khẩu tạm và gửi email cho người được cấp
2. Người được cấp đăng nhập bằng email và mật khẩu tạm, bị chuyển thẳng tới màn hình Đổi mật khẩu — trên web với Platform Staff, Brand Manager, Store Manager; trên app tablet với thu ngân, pha chế
3. Đổi xong thì vào màn hình chính theo vai trò
4. Quên mật khẩu: báo cấp trên trực tiếp → cấp trên bấm Đặt lại mật khẩu → hệ thống gửi mật khẩu tạm mới → quay lại bước 2
5. Không nhận được email hoặc mật khẩu tạm đã hết hạn: cấp trên bấm Gửi lại, hệ thống sinh mật khẩu tạm mới

Chi tiết ở mục 22.

### 6.14. Gán số máy rung

1. Thanh toán xong (tiền mặt hoặc QR), đơn xuống hàng đợi pha chế ngay, không chờ máy rung; thu ngân đưa máy rung cho khách và nhập số máy trên màn hình thanh toán thành công (CS-06)
2. Backend lưu số vào đơn và gửi cập nhật của chính đơn đó, kèm số máy rung, tới màn hình pha chế của chi nhánh; hàng đợi hiện số máy rung cạnh số gọi của từng ly
3. Đơn đủ món: màn hình gọi số gọi số như cũ; màn hình pha chế phát âm báo và hiện "Báo máy rung số 12" lấy từ dữ liệu đơn
4. Pha chế bấm số 12 trên bộ phát rồi chạm Đã báo; khách mang máy rung tới đổi lấy món; pha chế bấm Đã giao, số máy rung được giải phóng

Chi tiết ở mục 23.

### 6.15. Nhập menu bằng ảnh

1. Brand Manager mở Menu toàn chuỗi, chọn Nhập từ ảnh, tải 1–5 ảnh menu (OW-12)
2. Hệ thống gọi OCR rồi AI, trả bản nháp trong khoảng một phút
3. Brand Manager đối chiếu bản nháp với ảnh gốc, sửa, xử lý món trùng, chọn chi nhánh được bán
4. Brand Manager bấm Nhập vào menu; hệ thống ghi một lần và ghi audit log; POS các chi nhánh có món mới ở lần tải menu kế tiếp

Chi tiết ở mục 24.

### 6.16. Dùng thử 14 ngày

```
[Chủ quán]      Ở trang kích hoạt chọn Dùng thử 14 ngày gói Cơ bản
                   ├─ Mã số thuế đã từng dùng thử → không cho chọn,
                   │    chỉ còn nút trả tháng đầu
                   ↓
[Hệ thống]      Sinh doanh nghiệp ở trạng thái Dùng thử, gói Cơ bản,
                hết hạn sau 14 ngày → gửi email tài khoản Brand Manager
                   ↓
[Brand Manager] Dùng như gói Cơ bản: ≤ 3 chi nhánh, ≤ 30 tài khoản, đủ POS,
                PayOS bán hàng, pha chế, áp phích, nhập menu bằng ảnh
                   ↓
[Hệ thống]      Còn 5 ngày → email "Dùng thử còn 5 ngày" kèm tóm tắt đã
                dùng và link tới trang Gói dịch vụ
[Hệ thống]      Còn 3 ngày, chưa mua → email nhắc lại
                   ↓
[Brand Manager] Quyết định mua → trang Gói dịch vụ → chọn gói bất kỳ
                → thanh toán QR PayOS (OW-13)
                   ├─ Trả trong lúc dùng thử → gói đã chọn áp ngay,
                   │    hết hạn = ngày hết dùng thử + 1 tháng
                   └─ Không trả → hết 14 ngày doanh nghiệp chỉ đọc;
                        trả lúc nào mở lại lúc đó, dữ liệu dùng thử giữ nguyên
```

Trong lúc dùng thử, web của Brand Manager hiện dải thông báo số ngày còn lại và nút Mua gói; Store Manager, thu ngân và pha chế không thấy dải này. Chi tiết ở mục 25.

### 6.17. Bán combo

1. Thu ngân chạm combo trên POS (mục Combo hoặc trong danh mục được gán)
2. POS mở bảng combo: thành phần cố định điền sẵn; mỗi thành phần biến thể hiện các món được chọn kèm phụ thu, mặc định món đầu tiên còn bán
3. Với từng món trong combo, chỉnh tuỳ chọn và topping như món lẻ; size bị combo cố định thì không đổi được
4. Thêm vào giỏ như một dòng combo; màn hình phía khách hiện tên combo, các món bên dưới và giá
5. Chốt đơn: backend tính giá combo theo giá hiệu lực của chi nhánh, cộng phụ thu, tuỳ chọn và topping; chụp giá lúc bán của dòng combo và từng thành phần
6. Thanh toán xong: mỗi thành phần xuống hàng đợi pha chế như một ly thường, mang nhãn tên combo, và được gom với ly cùng món, cùng size của đơn khác

Chi tiết ở mục 26.

### 6.18. Hoàn tiền mặt tại quầy

1. Khách quay lại quầy xin hoàn (đổi ý, món sai, chờ quá lâu), hoặc pha chế báo hết món của đơn đã trả
2. Thu ngân mở đơn trong lịch sử đơn hôm nay, bấm Hoàn tiền, chọn toàn bộ hoặc từng dòng
3. Chọn lý do; POS hiện số tiền hoàn tính từ giá lúc bán và nhắc "Trả khách 45.000đ tiền mặt" — kể cả đơn đã trả bằng QR
4. Thu ngân lấy tiền từ két trả khách, bấm Xác nhận đã hoàn; backend ghi khoản hoàn, huỷ dòng, gỡ dòng chưa pha khỏi hàng đợi, ghi audit log, báo Store Manager
5. POS in phiếu hoàn tiền; báo cáo trừ doanh thu vào ngày hoàn và cộng vào mục tiền mặt đã hoàn của két

Đơn của ngày trước: Store Manager làm các bước 2–5 trên web (BM-06). Chi tiết ở mục 28.

### 6.19. Đặt giá theo chi nhánh

1. Brand Manager mở Menu toàn chuỗi › Giá theo chi nhánh, chọn chi nhánh
2. Bảng hiện giá chuỗi và giá chi nhánh của từng món, từng combo; ô trống là đang dùng giá chuỗi
3. Nhập giá riêng cho món hoặc combo cần đổi, hoặc chọn nhiều chi nhánh để áp cùng một giá; xoá giá riêng để quay về giá chuỗi
4. Lưu: backend ghi giá chi nhánh và audit log, báo POS, màn hình phía khách và TV menu của chi nhánh tải lại giá
5. Đơn chốt sau đó dùng giá mới; đơn đã chốt giữ giá lúc bán (BR-15)

Chi tiết ở mục 29.

### 6.20. Platform Staff hỗ trợ đăng ký gói

```
[Chủ quán]       Liên hệ nền tảng: muốn đổi gói đã duyệt, không nhận
                 được email, hoặc đã quét QR mà chưa thấy kích hoạt
                   ↓
[Platform Staff] Tìm hồ sơ hoặc doanh nghiệp theo mã số thuế, email
                   ├─ Đổi gói trước khi kích hoạt → chọn gói mới, ghi
                   │    chú yêu cầu → link cũ mất hiệu lực, gửi link mới
                   ├─ Không nhận email → kiểm email, sửa nếu sai, gửi lại
                   ├─ Đã quét QR → Kiểm tra lại → PayOS đã nhận thì
                   │    kích hoạt hoặc gia hạn như khi webhook về
                   └─ Lệch tiền, cần gia hạn tay → chuyển Platform Admin
                   ↓
[Hệ thống]       Ghi audit log: người hỗ trợ, thao tác, ghi chú yêu cầu
```

Platform Staff không quét QR hay trả tiền thay khách. Chi tiết ở mục 30.

## 7. Quy tắc nghiệp vụ

Mã quy tắc được cấp lại từ đầu trong bản 8.0 và giữ cố định từ đây để các tài liệu khác không phải sửa theo.

**Phân quyền và dữ liệu**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-01  | Mọi truy vấn dữ liệu vận hành phải lọc theo doanh nghiệp. Không có ngoại lệ.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| BR-02  | Store Manager, Cashier, Barista chỉ truy cập dữ liệu của chi nhánh mình được gán.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| BR-03  | Tài khoản Brand Manager chỉ được sinh ra khi hồ sơ đã được Platform Staff duyệt và chủ quán kích hoạt thành công từ link kích hoạt — trả tháng đầu hoặc bắt đầu dùng thử (BR-67). Không có đường tạo tắt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| BR-04  | Hồ sơ bị từ chối phải có lý do được ghi lại.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| BR-05  | Mỗi tầng chỉ tạo tài khoản của tầng ngay dưới: Platform Admin tạo Platform Staff; Brand Manager tạo Store Manager; Store Manager tạo Cashier và Barista. Tài khoản Brand Manager chỉ sinh khi kích hoạt (BR-03). Chỉ cấp trên trực tiếp đặt lại mật khẩu cho cấp dưới; Platform Admin đặt lại cho Platform Staff và Brand Manager (BR-56).                                                                                                                                                                                                                                                                                                                                                                          |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| BR-06  | Các thao tác sau ghi audit log kèm người thực hiện và thời điểm: huỷ đơn đã thanh toán và hoàn tiền mặt, xác nhận chuyển khoản thủ công, in lại bill, đổi giá món, combo, tuỳ chọn hoặc topping (kể cả giá chi nhánh), tạo, sửa hoặc tắt combo, đổi quyền, khoá tài khoản, cấp hoặc đặt lại mật khẩu tạm, nhập menu bằng ảnh, đổi nhận diện, lưu hoặc gỡ liên kết PayOS, thêm, đổi hoặc xoá áp phích, duyệt hoặc từ chối hồ sơ, mọi thao tác hỗ trợ đăng ký gói của Platform Staff, cấp hoặc khoá tài khoản Platform Staff, gửi lại link kích hoạt, kích hoạt (trả tháng đầu hoặc dùng thử), thanh toán thuê bao thành công, gia hạn thủ công, xác nhận thủ công hoá đơn thuê bao, đổi gói, tạm ngưng doanh nghiệp. |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| BR-07  | Platform Admin và Platform Staff chỉ truy cập số liệu tổng hợp phục vụ quản lý gói: số chi nhánh, số tài khoản, số đơn trong tháng, trạng thái thuê bao và hoá đơn thuê bao. Riêng Platform Admin xem thêm doanh thu của nền tảng (BR-76). Không ai của nền tảng truy cập nội dung đơn, menu, doanh thu bán hàng, nhân viên, khoá PayOS của doanh nghiệp.                                                                                                                                                                                                                                                                                                                                                           |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

**Gói dịch vụ và hạn mức**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                                                                                                                             |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-08  | Thao tác vượt hạn mức gói, hoặc gọi tính năng gói không có, phải bị chặn tại backend, không chỉ ẩn nút ở frontend.                                                                                                                                                                                                                      |
| ---    | ---                                                                                                                                                                                                                                                                                                                                     |
| BR-09  | Doanh nghiệp hết hạn thuê bao hoặc hết hạn dùng thử chuyển sang chế độ chỉ đọc, không khoá cứng, giữ dữ liệu tối thiểu 90 ngày. Chỉ đọc nghĩa là không chốt đơn mới và không sửa cấu hình; đơn đã thanh toán trước đó vẫn được pha và gọi số cho xong.                                                                                  |
| ---    | ---                                                                                                                                                                                                                                                                                                                                     |
| BR-10  | Phí thuê bao thu trong hệ thống qua kênh PayOS của nền tảng (mục 25); Brand Manager gia hạn bằng cách thanh toán hoá đơn (OW-13). Platform Admin chỉ gia hạn thủ công cho trường hợp ngoại lệ, bắt buộc lý do. Brand Manager chọn gói cho kỳ kế tiếp (Platform Staff đổi thay khi khách yêu cầu, BR-74); đổi gói giữa kỳ chỉ Admin làm. |
| ---    | ---                                                                                                                                                                                                                                                                                                                                     |
| BR-11  | Hạ gói không xoá dữ liệu. Nếu đang vượt hạn mức của gói mới, những gì đang có giữ nguyên, chỉ chặn tạo mới cho tới khi về trong hạn mức.                                                                                                                                                                                                |
| ---    | ---                                                                                                                                                                                                                                                                                                                                     |

**Thuê bao và dùng thử**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-66  | Phí thuê bao thu qua kênh PayOS của nền tảng, gắn với tài khoản ngân hàng của nền tảng. Khoá của kênh này đặt trong cấu hình máy chủ (biến môi trường), không lưu cùng khoá PayOS của doanh nghiệp, có địa chỉ webhook riêng. Kênh này chỉ dùng cho hoá đơn thuê bao; QR bán hàng luôn tạo từ kênh của doanh nghiệp (BR-24).                                                                                                             |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| BR-67  | Link kích hoạt sinh khi Platform Staff duyệt hồ sơ: mã ngẫu nhiên, chỉ lưu bản băm, hết hạn sau 7 ngày, dùng một lần. Gửi lại hoặc đổi gói đã duyệt (BR-74) sinh mã mới và vô hiệu mã cũ. Doanh nghiệp, tài khoản Brand Manager và email mật khẩu tạm chỉ sinh khi kích hoạt thành công — thanh toán tháng đầu được PayOS xác nhận, hoặc bắt đầu dùng thử — và chỉ sinh một lần dù link được mở nhiều lần hay webhook về nhiều lần.      |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| BR-68  | Dùng thử chỉ áp cho gói Cơ bản, 14 ngày tính từ lúc kích hoạt, không cần thanh toán, có đủ hạn mức và tính năng của gói Cơ bản. Mỗi mã số thuế chỉ dùng thử một lần, kiểm theo mã số thuế đã chuẩn hoá trên mọi doanh nghiệp từng có. Không tự gia hạn dùng thử; Admin gia hạn thủ công nếu cần, kèm lý do.                                                                                                                              |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| BR-69  | Email nhắc hạn: dùng thử — khi còn 5 ngày và còn 3 ngày; thuê bao trả phí — khi còn 7 ngày, còn 3 ngày và đúng ngày hết hạn. Mỗi mốc gửi tối đa một lần cho một kỳ; đã thanh toán kỳ kế tiếp thì không gửi các mốc còn lại. Chỉ gửi tới email của Brand Manager. Các mốc là cấu hình của nền tảng.                                                                                                                                       |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| BR-70  | Mỗi lần thanh toán cộng đúng một kỳ một tháng theo lịch (ngày không có trong tháng sau thì lùi về cuối tháng). Còn hạn thì kỳ mới nối tiếp ngày hết hạn hiện tại; đã hết hạn thì kỳ mới tính từ lúc thanh toán. Trả trong lúc dùng thử thì gói đã chọn áp ngay và ngày hết hạn bằng ngày hết dùng thử cộng một tháng. Gói Brand Manager chọn cho kỳ kế tiếp áp từ ngày kỳ đó bắt đầu.                                                    |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| BR-71  | Webhook thuê bao phải qua kiểm tra chữ ký bằng checksum key của kênh nền tảng, đối chiếu mã hoá đơn và số tiền, xử lý idempotent theo mã giao dịch; ghi hoá đơn Đã thanh toán và cộng kỳ trong một transaction. Số tiền khác hoá đơn thì không tự gia hạn: hoá đơn sang Lệch số tiền và báo Platform Admin; Admin xác nhận thủ công bắt buộc lý do. Tiền về cho hoá đơn đã trả hoặc đã huỷ thì không cộng kỳ, chỉ ghi nhận và báo Admin. |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| BR-72  | Số tiền hoá đơn tính ở backend từ giá gói lúc lập hoá đơn và lưu lại cùng tên gói; Admin đổi giá sau đó không đổi hoá đơn đã lập. Mỗi hoá đơn có tối đa một QR còn hiệu lực, hạn 15 phút; tạo QR mới thì QR cũ bị huỷ bên PayOS. Tiền lưu bằng số nguyên đồng.                                                                                                                                                                           |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| BR-73  | Chỉ Brand Manager thanh toán hoá đơn thuê bao của doanh nghiệp mình; Platform Staff và Platform Admin xem để hỗ trợ; Store Manager, thu ngân, pha chế không thấy. Link trong email nhắc dẫn tới trang Gói dịch vụ trên web của Brand Manager và bắt đăng nhập; email không chứa QR, mật khẩu hay mã đăng nhập. Trang Gói dịch vụ và thanh toán vẫn dùng được khi doanh nghiệp ở chế độ chỉ đọc.                                          |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                      |

**Platform Staff và doanh thu nền tảng**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-74  | Platform Staff được: xem, duyệt, từ chối hồ sơ (PA-01 đến PA-03); hỗ trợ đăng ký gói (PS-01) — đổi gói đã duyệt khi hồ sơ còn chờ kích hoạt, gửi lại link kích hoạt, đổi gói kỳ kế tiếp và gửi lại email hoá đơn theo yêu cầu của Brand Manager, bấm Kiểm tra lại hoá đơn thuê bao. Platform Staff không thanh toán thay khách, không gia hạn thủ công, không xác nhận thủ công hoá đơn lệch số tiền, không đổi gói giữa kỳ, không tạm ngưng doanh nghiệp, không sửa gói, không xem doanh thu nền tảng. Mọi thao tác thay khách bắt buộc ghi chú yêu cầu và ghi audit log (BR-06). |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| BR-75  | Platform Admin có mọi quyền của Platform Staff (actor kế thừa), cộng quản lý gói, quản lý doanh nghiệp, tài khoản Platform Staff và doanh thu nền tảng. Tài khoản Platform Staff do Platform Admin cấp bằng mật khẩu tạm (BR-54), không thuộc doanh nghiệp nào, không tính vào hạn mức của gói nào, luôn mang nhận diện nền tảng (BR-44).                                                                                                                                                                                                                                          |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| BR-76  | Doanh thu nền tảng chỉ tính từ hoá đơn thuê bao Đã thanh toán (kể cả xác nhận thủ công), ghi nhận theo thời điểm thanh toán và theo số tiền lưu trên hoá đơn (BR-72). Dùng thử và gia hạn thủ công không phát sinh doanh thu, hiện riêng số kỳ. Tiền bán hàng của các quán không bao giờ vào báo cáo này (BR-24). Chỉ Platform Admin xem.                                                                                                                                                                                                                                          |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

**Menu và tuỳ chọn món**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                                                                                                                 |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-12  | Món hiện trên POS khi đủ ba điều kiện: cờ kinh doanh cấp chuỗi do Brand Manager bật, món được gán cho chi nhánh, và cờ còn bán hôm nay do Store Manager hoặc Barista bật. Brand Manager tắt thì chi nhánh không bật lại được. Tuỳ chọn, topping và combo theo cùng quy tắc; combo còn thêm điều kiện về thành phần (BR-78). |
| ---    | ---                                                                                                                                                                                                                                                                                                                         |
| BR-13  | Giá món và giá combo lấy giá chuỗi làm mặc định; Brand Manager được đặt giá riêng theo chi nhánh (BR-84). Giá cộng thêm của tuỳ chọn, giá topping theo món và phụ thu biến thể là một giá duy nhất toàn chuỗi.                                                                                                              |
| ---    | ---                                                                                                                                                                                                                                                                                                                         |
| BR-14  | Mỗi nhóm tuỳ chọn có quy tắc chọn: bắt buộc hay không, số tối thiểu, số tối đa. POS không cho thêm dòng món vi phạm quy tắc; backend kiểm tra lại lúc chốt đơn.                                                                                                                                                             |
| ---    | ---                                                                                                                                                                                                                                                                                                                         |
| BR-15  | Đơn lưu giá tại thời điểm bán: tên và giá hiệu lực của món hoặc combo tại chi nhánh; tên và giá cộng thêm của từng tuỳ chọn; tên, giá một phần và số phần của từng topping; món đã chọn và phụ thu của từng thành phần combo. Không tham chiếu sang bảng món. Brand Manager đổi giá chuỗi hay giá chi nhánh không hồi tố.   |
| ---    | ---                                                                                                                                                                                                                                                                                                                         |
| BR-16  | Không cho chốt đơn có món, tuỳ chọn, topping hoặc combo đang tắt, kể cả khi món bị tắt sau lúc thêm vào giỏ. Backend kiểm tra lại lúc chốt.                                                                                                                                                                                 |
| ---    | ---                                                                                                                                                                                                                                                                                                                         |

**Combo và topping**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                                                                                                                                                                                     |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-77  | Combo do Brand Manager tạo, có giá combo là số nguyên đồng ≥ 0 và từ 2 tới 6 thành phần. Mỗi thành phần có số lượng 1–5 và là một món cố định hoặc một nhóm biến thể gồm 2–10 món để khách chọn đúng một; mỗi biến thể có phụ thu ≥ 0. Thành phần có thể cố định size; các tuỳ chọn khác và topping chọn như món lẻ, giá cộng thêm vẫn tính. Combo không chứa combo khác.                       |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                             |
| BR-78  | Combo hiện trên POS khi: cờ kinh doanh cấp chuỗi bật, combo được gán cho chi nhánh, cờ còn bán hôm nay của chi nhánh bật, mọi thành phần cố định còn bán ở chi nhánh, và mỗi nhóm biến thể còn ít nhất một món còn bán. Biến thể hết món thì POS khoá lựa chọn đó. Backend kiểm lại lúc chốt (BR-16).                                                                                           |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                             |
| BR-79  | Giá dòng combo bằng giá combo hiệu lực tại chi nhánh cộng phụ thu biến thể đã chọn và giá tuỳ chọn, topping của từng món, nhân số lượng combo. Dòng combo sinh các dòng thành phần đi xuống pha chế như món thường và được gom theo món + size (mục 8). Hoàn tiền và huỷ theo cả dòng combo, không theo từng thành phần; số tiền hoàn bằng giá lúc bán của cả dòng.                             |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                             |
| BR-80  | Topping thuộc thư viện của chuỗi và chỉ bán được khi gắn vào món. Mỗi lần gắn có giá cộng thêm ≥ 0 (mặc định lấy giá của thư viện) và số phần tối đa 1–5 cho một ly; mỗi món có tổng số phần topping tối đa (mặc định 5). Giá dòng món cộng giá topping nhân số phần. Topping bật/tắt cấp chuỗi và cấp chi nhánh theo BR-12; báo hết topping thì mọi món gắn topping đó không chọn được nó nữa. |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                             |

**Giá theo chi nhánh**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                                                                                                                                                    |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-84  | Giá chuỗi là giá mặc định của món và combo. Chỉ Brand Manager đặt, đổi, xoá giá riêng của một món hoặc combo tại một chi nhánh; giá là số nguyên đồng ≥ 0. Giá hiệu lực là giá chi nhánh nếu có, không thì giá chuỗi. Đổi giá chuỗi không ghi đè giá chi nhánh đã đặt. Store Manager, thu ngân, pha chế không đổi được giá. Mọi lần đổi ghi audit log (BR-06). |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                            |
| BR-85  | POS, màn hình phía khách, TV menu và bill dùng giá hiệu lực của chi nhánh. Backend tính tổng tiền từ giá hiệu lực tại thời điểm chốt đơn (BR-19), không tin giá client gửi; giá đổi sau khi chốt không ảnh hưởng đơn (BR-15). Báo cáo đa chi nhánh so sánh doanh thu thực thu, kèm ghi chú chi nhánh nào đang có giá riêng.                                    |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                            |

**Đơn và thanh toán tại quầy**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BR-17  | Chưa thanh toán thì chưa pha. Dòng món chỉ vào hàng đợi pha chế khi đơn đã ở trạng thái Đã thanh toán.                                                                                                                                                                   |
| ---    | ---                                                                                                                                                                                                                                                                      |
| BR-18  | Trước khi thanh toán, thu ngân sửa và huỷ đơn tự do. Sau khi thanh toán, đơn chỉ được huỷ bằng cách hoàn tiền mặt — toàn bộ hoặc từng dòng món, bắt buộc ghi lý do: thu ngân với đơn của chi nhánh mình trong ngày bán (BR-82), Store Manager với mọi đơn của chi nhánh. |
| ---    | ---                                                                                                                                                                                                                                                                      |
| BR-19  | Tổng tiền tính ở backend từ giá lúc bán; client chỉ hiển thị. Tiền lưu bằng số nguyên đồng, không dùng số thực.                                                                                                                                                          |
| ---    | ---                                                                                                                                                                                                                                                                      |
| BR-20  | Thu tiền mặt: số tiền khách đưa phải lớn hơn hoặc bằng tổng đơn; tiền thối bằng số khách đưa trừ tổng đơn; ghi tên thu ngân đã thu.                                                                                                                                      |
| ---    | ---                                                                                                                                                                                                                                                                      |
| BR-21  | Mọi đơn đã thanh toán đều in bill và phiếu số, cả tiền mặt lẫn QR. In lỗi (mất kết nối, hết giấy, kẹt giấy) không chặn thanh toán và không chặn đơn xuống pha chế; POS báo In thất bại và thu ngân in lại từ lịch sử đơn.                                                |
| ---    | ---                                                                                                                                                                                                                                                                      |
| BR-22  | Số gọi được cấp đúng lúc đơn chuyển Đã thanh toán, tăng dần, duy nhất trong một chi nhánh trong một ngày, bắt đầu lại từ đầu mỗi ngày. Đơn chưa thanh toán không có số gọi.                                                                                              |
| ---    | ---                                                                                                                                                                                                                                                                      |
| BR-23  | Hệ thống không hoàn tiền tự động và không hoàn qua PayOS. Mọi khoản hoàn trả bằng tiền mặt tại quầy (BR-81); hệ thống ghi số tiền, dòng được hoàn, người hoàn, lý do và thời điểm.                                                                                       |
| ---    | ---                                                                                                                                                                                                                                                                      |

**Thanh toán QR qua PayOS**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BR-24  | Nền tảng không giữ tiền. QR luôn được tạo từ kênh PayOS của chính doanh nghiệp, tiền vào thẳng tài khoản ngân hàng của chủ chuỗi.                                                                                                                                                                                                                                                                                                                            |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| BR-25  | Khoá PayOS được mã hoá khi lưu, mỗi doanh nghiệp một bộ, không bao giờ trả về frontend sau khi lưu, không ghi vào log. Chỉ Brand Manager lưu, đổi, gỡ.                                                                                                                                                                                                                                                                                                       |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| BR-26  | QR mang orderCode là mã đơn và amount là tổng tiền đơn. QR có thời hạn, mặc định 10 phút. Mỗi đơn chỉ có tối đa một QR còn hiệu lực.                                                                                                                                                                                                                                                                                                                         |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| BR-27  | Webhook phải qua kiểm tra chữ ký bằng checksum key của đúng doanh nghiệp; sai chữ ký thì bỏ qua. Đối chiếu orderCode và số tiền. Xử lý idempotent theo mã giao dịch: nhận lại lần hai không đổi gì. Cập nhật thanh toán, chuyển trạng thái đơn và cấp số gọi nằm trong một transaction.                                                                                                                                                                      |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| BR-28  | Số tiền webhook khác tổng đơn thì không tự xác nhận; đơn sang Cần xử lý và báo Store Manager. Store Manager chỉ được xác nhận khi số tiền thực nhận lớn hơn hoặc bằng tổng đơn (phần dư trả lại khách bằng tiền mặt và được ghi nhận); nhận thiếu thì huỷ đơn và hoàn tiền mặt số đã nhận (BR-81).                                                                                                                                                           |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| BR-29  | Xác nhận chuyển khoản thủ công chỉ do Store Manager của chi nhánh đó thực hiện, bắt buộc ghi lý do, hệ thống lưu người xác nhận. Thu ngân không xác nhận được trong mọi trường hợp. Nút Kiểm tra lại mà PayOS trả về đã thanh toán thì hệ thống tự xác nhận như khi nhận webhook, không cần Store Manager; xác nhận thủ công chỉ dùng khi không tra cứu được PayOS. Webhook hợp lệ về sau khi đã xác nhận thủ công được gắn vào đơn và đánh dấu đã đối soát. |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| BR-30  | QR hết hạn mà chưa nhận tiền thì hệ thống huỷ QR bên PayOS và huỷ đơn. Đổi sang tiền mặt hoặc sửa đơn cũng phải huỷ QR bên PayOS trước.                                                                                                                                                                                                                                                                                                                      |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| BR-31  | Webhook hợp lệ về cho một đơn đã huỷ thì không tự khôi phục đơn; hệ thống ghi nhận và báo Store Manager xử lý: xác nhận để pha, hoặc hoàn lại bằng tiền mặt (BR-81).                                                                                                                                                                                                                                                                                         |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

**Pha chế và gọi số**

| **Mã** | **Quy tắc**                                                                                                                                                                             |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-32  | Hàng đợi pha chế chỉ gồm dòng món của đơn đã thanh toán, thuộc chi nhánh của người xem.                                                                                                 |
| ---    | ---                                                                                                                                                                                     |
| BR-33  | Pha chế cập nhật trạng thái theo từng dòng món. Đơn chỉ được gọi số khi mọi dòng món chưa bị huỷ đều đã Xong.                                                                           |
| ---    | ---                                                                                                                                                                                     |
| BR-34  | Gom món không được làm dòng món chờ lâu nhất phải chờ thêm: mẻ đầu hàng đợi luôn chứa dòng món chờ lâu nhất, và chỉ gom thêm những ly trong cửa sổ gom (mục 8).                         |
| ---    | ---                                                                                                                                                                                     |
| BR-35  | Một mẻ chỉ một pha chế nhận. Ai bấm Bắt đầu mẻ trước thắng, backend khoá bằng transaction; người thua nhận phản hồi rõ ràng.                                                            |
| ---    | ---                                                                                                                                                                                     |
| BR-36  | Báo hết món, tuỳ chọn hoặc topping thì tắt ở cấp chi nhánh ngay, POS chặn bán. Dòng món đã thanh toán chứa món đó chuyển Hết món và báo Store Manager. Combo chứa món đó áp theo BR-78. |
| ---    | ---                                                                                                                                                                                     |

**AI**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-37  | AI và OCR không truy cập cơ sở dữ liệu. Mọi lời gọi dịch vụ OCR và mô hình AI đi qua backend, chỉ gửi ảnh và văn bản menu cùng tên các mục menu đang có của đúng doanh nghiệp; khoá API không xuất hiện ở frontend (BR-61, BR-63). |
| ---    | ---                                                                                                                                                                                                                                |
| BR-38  | Bỏ ở bản 10 cùng trợ lý số liệu. Mã giữ trống, không cấp lại.                                                                                                                                                                      |
| ---    | ---                                                                                                                                                                                                                                |
| BR-39  | Bỏ ở bản 10 cùng trợ lý số liệu. Mã giữ trống, không cấp lại.                                                                                                                                                                      |
| ---    | ---                                                                                                                                                                                                                                |
| BR-40  | Bỏ ở bản 10 cùng trợ lý số liệu. Mã giữ trống, không cấp lại.                                                                                                                                                                      |
| ---    | ---                                                                                                                                                                                                                                |

**Nhận diện thương hiệu**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                                                                                         |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-41  | Bộ nhận diện thương hiệu thuộc về doanh nghiệp. Mọi tài khoản thuộc doanh nghiệp đó — kể cả tài khoản tạo sau — đều nhận cùng một bộ nhận diện. Không cấu hình theo chi nhánh, không theo từng người dùng. Chỉ áp khi doanh nghiệp dùng gói Tiêu chuẩn trở lên; gói Cơ bản dùng nhận diện mặc định. |
| ---    | ---                                                                                                                                                                                                                                                                                                 |
| BR-42  | Màu ngữ nghĩa không chịu ảnh hưởng của màu thương hiệu. Màu cảnh báo, màu lỗi và màu trạng thái pha chế là hằng số hệ thống. Màu thương hiệu chỉ áp cho nút chính, thanh điều hướng, liên kết và điểm nhấn.                                                                                         |
| ---    | ---                                                                                                                                                                                                                                                                                                 |
| BR-43  | Chỉ Brand Manager sửa được bộ nhận diện. Hệ thống kiểm tra tương phản khi lưu; nếu chữ trên nền màu thương hiệu dưới ngưỡng đọc được thì tự chọn màu chữ tương phản. Không cho lưu một cấu hình làm giao diện không đọc được.                                                                       |
| ---    | ---                                                                                                                                                                                                                                                                                                 |
| BR-44  | Giao diện Platform Admin luôn giữ nhận diện của nền tảng. Không doanh nghiệp nào áp màu lên được.                                                                                                                                                                                                   |
| ---    | ---                                                                                                                                                                                                                                                                                                 |

**Quầy và màn hình phía khách**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-45  | Màn hình phía khách và màn hình gọi số chỉ được ghép bằng mã OTP 6 số do server sinh theo yêu cầu của chính màn hình đó. Mã dùng một lần, hết hạn sau 5 phút, và phải được thu ngân (cho quầy đang đăng nhập) hoặc Store Manager của đúng chi nhánh nhập trên thiết bị của mình. Một quầy nhập sai quá 5 lần liên tiếp thì bị khoá ghép 5 phút. Token chỉ được gửi về đúng kết nối đã xin mã. Token cấp ra chỉ đọc, gắn với một quầy (hoặc một chi nhánh với màn hình gọi số), không phải tài khoản người dùng, không tính vào hạn mức tài khoản của gói. Mỗi quầy tối đa một màn hình phía khách; Store Manager thu hồi được bất cứ lúc nào. |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| BR-46  | Trước khi chốt đơn, giỏ trên tablet POS là nguồn dữ liệu duy nhất; server chỉ chuyển tiếp, không ghi cơ sở dữ liệu. Sau khi chốt, server là nguồn duy nhất cho mã QR và trạng thái thanh toán, và gửi đồng thời cho cả hai máy. Màn hình phía khách chỉ hiển thị bản giỏ có số phiên bản mới nhất; số phiên bản do server cấp theo quầy, không do POS tự đếm.                                                                                                                                                                                                                                                                                 |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| BR-47  | Màn hình phía khách mất kết nối không được chặn bán hàng: POS báo trạng thái kết nối và tự hiện mã QR trên màn hình thu ngân.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| BR-48  | Server chỉ nhận sự kiện giỏ hàng (cart:update, cart:clear) từ tài khoản thu ngân đang đăng nhập và đã chọn đúng quầy đó, thuộc đúng chi nhánh và doanh nghiệp. Sự kiện từ nguồn khác bị bỏ qua và ghi log bảo mật.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| BR-49  | Huỷ đơn đã thanh toán ghi một khoản hoàn tiền mặt, hoàn tất ngay khi thu ngân hoặc Store Manager xác nhận đã trả tiền cho khách; không còn trạng thái Chờ chủ chuỗi hoàn. Dòng món đã pha xong vẫn hoàn được và được ghi là hao hụt.                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| BR-50  | Tiền của đơn bị huỷ được trừ vào doanh thu của ngày huỷ; số liệu của ngày bán đã qua không bị sửa lại. Báo cáo hiện riêng mục đơn huỷ, số tiền hoàn và người hoàn.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

**Hoàn tiền**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                                                                                                                                                                                              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-81  | Mọi khoản hoàn tiền trả bằng tiền mặt tại quầy, bất kể đơn đã trả bằng tiền mặt hay QR. Hệ thống không hoàn qua PayOS và không có hình thức hoàn bằng chuyển khoản. Số tiền hoàn tính ở backend theo giá lúc bán của dòng được hoàn (BR-15), không nhập tay; tổng hoàn của một đơn không vượt số tiền đã thu.                                                                                            |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                      |
| BR-82  | Thu ngân chỉ hoàn đơn của chi nhánh mình, thanh toán trong ngày bán hiện tại (ngày của số gọi, giờ Việt Nam), ở trạng thái Đã thanh toán, Đang pha, Sẵn sàng hoặc Hoàn tất. Đơn của ngày trước chỉ Store Manager hoàn. Mỗi lần hoàn bắt buộc chọn lý do (Khách đổi ý, Món sai, Hết món, Chờ quá lâu, Khác — Khác phải ghi thêm ít nhất 5 ký tự), in phiếu hoàn tiền, ghi audit log và báo Store Manager. |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                      |
| BR-83  | Báo cáo chi nhánh tách ba số theo ngày và theo thu ngân: tiền mặt đã thu, tiền mặt đã hoàn (gồm hoàn cho đơn trả bằng QR) và tiền mặt thuần phải có trong két. Doanh thu theo hình thức thanh toán giữ hình thức gốc của đơn; phần hoàn trừ vào ngày hoàn (BR-50).                                                                                                                                       |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                                      |

**Áp phích và in**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                                                                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BR-51  | Áp phích thuộc về doanh nghiệp và áp cho màn hình phía khách của mọi chi nhánh; không có áp phích riêng theo chi nhánh hay theo quầy. Chỉ Brand Manager thêm, sửa, xoá. Mỗi doanh nghiệp tối đa 6 áp phích; mỗi ảnh PNG, JPG hoặc WebP, không quá 5 MB; tên không quá 50 ký tự. Backend kiểm tra lại mọi giới hạn, không chỉ dựa vào web. Doanh nghiệp ở chế độ chỉ đọc không sửa được áp phích. |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                              |
| BR-52  | Áp phích không được che thông tin đơn. Màn hình phía khách chỉ chiếu áp phích ở màn hình chờ (toàn màn hình) và ở nửa trái màn hình giỏ; màn hình QR, thanh toán thành công và QR hết hạn không có áp phích. Ảnh luôn hiện nguyên khổ, không cắt. Không có áp phích đang bật thì dùng ảnh mặc định.                                                                                              |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                              |
| BR-53  | Bill và phiếu số in từ dữ liệu bill do backend trả theo giá lúc bán (BR-15), không dựng từ giỏ trên POS. Mỗi lượt in lại bắt buộc lý do và được backend ghi lại kèm người in, chi nhánh, thời điểm (BR-06, BR-21).                                                                                                                                                                               |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                                                              |

**Tài khoản và mật khẩu**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BR-54  | Khi cấp tài khoản mới hoặc đặt lại mật khẩu, hệ thống tự sinh mật khẩu tạm và gửi email gồm email đăng nhập và mật khẩu tạm tới đúng email của tài khoản được cấp. Người cấp không đặt và không xem được mật khẩu; mật khẩu tạm chỉ lưu bản băm, không ghi vào log.                                                |
| ---    | ---                                                                                                                                                                                                                                                                                                                |
| BR-55  | Tài khoản đang dùng mật khẩu tạm chỉ được đổi mật khẩu, xem hồ sơ của mình và đăng xuất; mọi thao tác khác bị backend chặn cho tới khi đổi xong. Mật khẩu mới phải khác mật khẩu tạm và đạt quy tắc ở 22.6. Mật khẩu tạm hết hạn sau 72 giờ; quá hạn thì cấp trên gửi lại.                                         |
| ---    | ---                                                                                                                                                                                                                                                                                                                |
| BR-56  | Chỉ cấp trên trực tiếp đặt lại mật khẩu: Platform Admin cho Platform Staff và Brand Manager, Brand Manager cho Store Manager trong chuỗi, Store Manager cho Cashier và Barista của chi nhánh mình. Đặt lại vô hiệu mật khẩu cũ và mọi phiên đăng nhập đang mở của tài khoản đó. Không có quên mật khẩu tự phục vụ. |
| ---    | ---                                                                                                                                                                                                                                                                                                                |
| BR-57  | Gửi email lỗi không huỷ việc tạo tài khoản: tài khoản giữ trạng thái Chờ đổi mật khẩu kèm nhãn Chưa gửi được email để cấp trên bấm Gửi lại. Gửi lại luôn sinh mật khẩu tạm mới.                                                                                                                                    |
| ---    | ---                                                                                                                                                                                                                                                                                                                |

**Số máy rung**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                                                                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-58  | Số máy rung là tuỳ chọn, chỉ thu ngân của chi nhánh gán, đổi hoặc gỡ, và chỉ cho đơn Đã thanh toán, Đang pha hoặc Sẵn sàng. Số là số nguyên từ 1 đến 999. Một số chỉ gắn với tối đa một đơn chưa Hoàn tất và chưa Đã huỷ trong chi nhánh; đơn Hoàn tất hoặc Đã huỷ thì số tự được giải phóng.                                                                   |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                             |
| BR-59  | Số máy rung không thay số gọi: đơn có máy rung vẫn có số gọi, phiếu số và lên màn hình gọi số. Hệ thống không điều khiển máy rung. Mọi lần gán, đổi, gỡ được lưu kèm người làm và thời điểm.                                                                                                                                                                    |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                             |
| BR-64  | Số máy rung là một trường của đơn, không phải dữ liệu đi riêng: mọi dữ liệu đơn backend gửi cho màn hình pha chế — hàng đợi, danh sách Sẵn sàng và sự kiện realtime — đều kèm số máy rung hiện tại của đơn (rỗng nếu chưa gán). Gán, đổi, gỡ phải hiện trên màn hình pha chế của chi nhánh trong tối đa 2 giây khi mạng bình thường, không cần pha chế tải lại. |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                             |
| BR-65  | Chỉ pha chế của chi nhánh đánh dấu Đã báo, và chỉ cho đơn Sẵn sàng đang có số máy rung. Đổi số thì xoá dấu Đã báo để nhắc báo lại số mới; gỡ số thì bỏ nhắc. Dấu Đã báo không chặn Đã giao, không chứng minh máy đã rung (GĐ-19); người đánh dấu và thời điểm được lưu.                                                                                         |
| ---    | ---                                                                                                                                                                                                                                                                                                                                                             |

**Nhập menu bằng ảnh**

| **Mã** | **Quy tắc**                                                                                                                                                                                                                                                            |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-60  | Chỉ Brand Manager nhập menu bằng ảnh. Mỗi lượt 1–5 ảnh JPG, PNG hoặc WebP, mỗi ảnh không quá 10 MB. Tính năng không khoá theo gói. Doanh nghiệp ở chế độ chỉ đọc không nhập được.                                                                                      |
| ---    | ---                                                                                                                                                                                                                                                                    |
| BR-61  | Kết quả OCR và AI chỉ là bản nháp. Hệ thống chỉ ghi vào menu khi Brand Manager bấm Nhập; mọi dòng được kiểm lại như nhập tay (tên, giá là số nguyên đồng ≥ 0, quy tắc nhóm tuỳ chọn) và ghi trong một transaction — một dòng lỗi thì không dòng nào được ghi.          |
| ---    | ---                                                                                                                                                                                                                                                                    |
| BR-62  | Nhập menu không xoá món nào. Món trùng chỉ được cập nhật giá khi Brand Manager chọn; đổi giá qua nhập menu ghi audit log như đổi giá tay (BR-06) và không hồi tố đơn đã bán (BR-15). Nhập menu chỉ ghi giá chuỗi, không đụng giá chi nhánh (BR-84) và không tạo combo. |
| ---    | ---                                                                                                                                                                                                                                                                    |
| BR-63  | Ảnh và văn bản menu chỉ gửi tới dịch vụ OCR và AI qua backend, không kèm dữ liệu đơn, doanh thu, tài khoản hay khoá PayOS; khoá API không xuất hiện ở frontend. Mỗi doanh nghiệp tối đa 20 lượt nhập mỗi ngày.                                                         |
| ---    | ---                                                                                                                                                                                                                                                                    |

## 8. Thuật toán gom món trong hàng đợi pha chế

Đây là phần "có thuật toán" mà đề tài yêu cầu, thay cho thuật toán xếp và ghép bàn của v7 — loại hình mới không còn bàn.

### 8.1. Vì sao chọn bài toán này

Giờ cao điểm ở quán trà sữa, mười đơn đến trong năm phút, trong đó sáu ly trà sữa trân châu size L nằm rải rác ở nhiều đơn. Pha lần lượt từng đơn thì pha chế lắc trà nền sáu lần. Gom lại thì pha nền một mẻ, chỉ khác nhau ở bước cuối — đường, đá, topping của từng ly. Người pha chế giỏi tự làm việc này trong đầu; hệ thống làm nó cho người mới và làm đều tay lúc đông.

Bài toán xếp lịch pha chế theo thời gian đã bị loại cùng lý do như bài toán xếp lịch bếp ở v7: thời gian pha phụ thuộc tay nghề và dụng cụ, mọi con số đưa vào đều là số bịa. **Gom món không cần thời gian pha.** Mọi đầu vào đều đo được chính xác: món, size, tuỳ chọn, thời điểm thanh toán — hệ thống đã có sẵn.

### 8.2. Phát biểu bài toán

**Cho:** danh sách ly ở trạng thái Chờ pha của một chi nhánh (một dòng món số lượng 3 là ba ly), mỗi ly có món, size, tuỳ chọn, ghi chú, thời điểm thanh toán, số gọi. Hai tham số của chi nhánh: cửa sổ gom W (mặc định 5 phút) và số ly tối đa một mẻ K (mặc định 4).

**Tìm:** danh sách mẻ theo thứ tự nên pha, mỗi mẻ gồm các ly pha chung được.

### 8.3. Khoá gom

Hai ly pha chung được khi cùng **món + size**. Đường, đá, topping và ghi chú không nằm trong khoá gom, vì phần nền pha chung được và các tuỳ chọn này thêm ở bước cuối cho từng ly. Topping, kể cả nhiều phần, cũng nằm ngoài khoá gom. Ly thuộc combo gom như ly bán lẻ: khoá gom là món + size của thành phần; nhãn tên combo chỉ để pha chế biết, không ảnh hưởng việc gom.

Món có cờ "không gom" do Brand Manager đặt (ví dụ sinh tố xay từng ly, bánh mì kẹp theo yêu cầu riêng) thì mỗi ly là một mẻ.

### 8.4. Ràng buộc bắt buộc

1. Mẻ đầu hàng đợi luôn chứa ly chờ lâu nhất — gom không bao giờ làm ly chờ lâu nhất phải chờ thêm (BR-34)
2. Một ly x được gom vào mẻ bắt đầu bởi ly h khi cùng khoá gom và t(x) − t(h) ≤ W, với t là thời điểm thanh toán
3. Mỗi mẻ không quá K ly
4. Chỉ gom ly ở trạng thái Chờ pha. Mẻ đã bấm Bắt đầu thì khoá, không tính lại

Cái giá phải trả được nói rõ: một ly x được kéo lên pha chung với ly h thì các ly khác loại đến giữa h và x bị lùi lại. Cửa sổ W và trần K giới hạn mức lùi này — không ly nào bị vượt bởi quá K − 1 ly đến sau nó, và chỉ bởi những ly đến trong vòng W phút.

### 8.5. Cách giải

Hàng đợi thực tế chỉ vài chục ly, thuật toán tham lam là đủ và giải thích được trước hội đồng:

1. Lấy các ly Chờ pha, sắp theo thời điểm thanh toán, cùng thời điểm thì theo số gọi
2. Lấy ly đầu tiên h chưa thuộc mẻ nào, mở mẻ mới
3. Quét các ly sau h: ly nào cùng khoá gom, trong cửa sổ W tính từ h, và mẻ chưa đủ K ly thì thêm vào mẻ
4. Lặp lại bước 2 tới khi mọi ly đều thuộc một mẻ
5. Tính lại mỗi khi có đơn mới thanh toán, có ly đổi trạng thái hoặc bị huỷ

Độ phức tạp O(n²) với n là số ly chờ — không đáng kể ở quy mô một chi nhánh. Thuật toán chạy ở backend, kết quả đẩy xuống màn hình pha chế qua Socket.IO.

### 8.6. Hiển thị và thao tác

- Mỗi mẻ là một thẻ: tên món, size, số ly, thời gian chờ của ly cũ nhất
- Trong thẻ, từng ly một dòng: số gọi, số máy rung nếu có, đường, đá, topping, ghi chú; tuỳ chọn khác mặc định in đậm
- Bắt đầu mẻ → mọi ly trong mẻ sang Đang pha; Xong từng ly hoặc Xong cả mẻ
- Đơn nào đủ ly Xong thì gọi số, không chờ các đơn khác trong cùng mẻ

### 8.7. Đo và demo

Chỉ đo những thứ không phụ thuộc thời gian pha, để kết quả không phải số bịa:

- **Số mẻ:** trên kịch bản seed giờ cao điểm (ví dụ 20 đơn trong 10 phút), so số lần pha khi có gom và khi pha lần lượt
- **Độ lệch thứ tự lớn nhất:** số ly một ly bị vượt, phải luôn nhỏ hơn hoặc bằng K − 1
- **Tính đúng:** bộ test cho các ràng buộc 8.4, gồm trường hợp món không gom, mẻ đầy, ly ngoài cửa sổ, ly bị huỷ giữa chừng

Demo: bấm chốt năm đơn liên tiếp trên POS, trong đó ba đơn có trà sữa size L với đường và topping khác nhau. Màn hình pha chế hiện một mẻ ba ly, từng ly ghi rõ tuỳ chọn riêng. Ba mươi giây, không cần giải thích thêm.

### 8.8. Giới hạn đã biết

- Không mô hình hoá thời gian pha, nên không dự báo được giờ trả món
- Khoá gom cố định là món + size; không gom theo phần nền chung giữa các món khác nhau
- Mọi pha chế của chi nhánh thấy chung một hàng đợi; không phân việc theo từng người

## 9. AI trong sản phẩm

Một điểm chạm duy nhất: **nhập menu bằng ảnh** — OCR đọc chữ trong ảnh menu, AI sắp văn bản đó vào menu toàn chuỗi, Brand Manager duyệt bản nháp rồi mới nhập (OW-12, mục 24). Gọi API mô hình sẵn có qua backend, không tự huấn luyện mô hình, đúng ràng buộc đề tài. Mọi gói đều dùng.

Bản 10 bỏ trợ lý hỏi đáp số liệu (OW-09 của bản 9.2). Báo cáo chi nhánh và báo cáo đa chi nhánh (OW-08, BM-03) đã trả lời các câu hỏi quản lý thường gặp; trợ lý tốn hai lần gọi mô hình mỗi câu và cần bộ kiểm thử tấn công riêng mà không giúp thêm nhiều cho Store Manager. Không có AI phân tích hay gợi ý chiến lược kinh doanh.

Ràng buộc chung khi dùng AI: AI không truy cập cơ sở dữ liệu, không ghi gì vào menu khi chưa có Brand Manager duyệt, chỉ nhận dữ liệu cần cho việc nhập menu (BR-37, BR-61, BR-63).

## 10. Tuỳ biến nhận diện thương hiệu theo chuỗi

### 10.1. Ý tưởng một câu

Brand Manager của doanh nghiệp gói Tiêu chuẩn trở lên tự đặt logo, màu chủ đạo và tên hiển thị của chuỗi mình. Mọi tài khoản sinh ra từ Brand Manager đó — Store Manager, Cashier, Barista — đăng nhập vào là thấy giao diện mang màu của chuỗi; màn hình phía khách, màn hình gọi số, bill và phiếu số cũng vậy.

Đây là white-label ở mức nhẹ: đổi được nhận diện, không đổi được bố cục và chức năng.

### 10.2. Cấu hình gồm những gì — chốt cứng, không mở rộng

| **Hạng mục**       | **Kiểu dữ liệu**                           | **Áp ở đâu**                                                                 | **Mặc định**                 |
| ------------------ | ------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------- |
| Logo chuỗi         | Ảnh PNG/JPG, ≤ 1 MB, khuyến nghị nền trong | Thanh điều hướng, màn hình phía khách, màn hình gọi số, đầu bill và phiếu số | Logo nền tảng                |
| ---                | ---                                        | ---                                                                          | ---                          |
| Màu chủ đạo        | Mã màu hex                                 | Nút chính, thanh điều hướng, liên kết, tab đang chọn                         | Xám đen trung tính           |
| ---                | ---                                        | ---                                                                          | ---                          |
| Màu nhấn           | Mã màu hex                                 | Badge, biểu đồ, điểm nhấn phụ                                                | Xám trung tính               |
| ---                | ---                                        | ---                                                                          | ---                          |
| Tên hiển thị chuỗi | Văn bản ≤ 50 ký tự                         | Tiêu đề trang, màn hình phía khách, đầu bill                                 | Tên doanh nghiệp trong hồ sơ |
| ---                | ---                                        | ---                                                                          | ---                          |

Cố ý không có: tải lên CSS tuỳ ý, đổi phông chữ, đổi bố cục màn hình, đổi nhãn nút và tên chức năng, tên miền riêng cho từng doanh nghiệp, nhận diện riêng theo từng chi nhánh, ảnh nền trang đăng nhập, chế độ tối. Lý do ở tài liệu Kế hoạch, 7.11 và mục 5.

### 10.3. Áp ở những màn hình nào

| **Màn hình**                            | **Áp nhận diện?**    | **Ghi chú**                                                    |
| --------------------------------------- | -------------------- | -------------------------------------------------------------- |
| Web Brand Manager                       | Có                   | Toàn bộ                                                        |
| ---                                     | ---                  | ---                                                            |
| Web Store Manager                       | Có                   | Toàn bộ                                                        |
| ---                                     | ---                  | ---                                                            |
| POS của thu ngân                        | Có                   | Toàn bộ                                                        |
| ---                                     | ---                  | ---                                                            |
| Màn hình phía khách                     | Có — quan trọng nhất | Khách nhìn thấy khi trả tiền                                   |
| ---                                     | ---                  | ---                                                            |
| Màn hình gọi số                         | Có                   | Logo và thanh tiêu đề; số gọi dùng màu tương phản cao cố định  |
| ---                                     | ---                  | ---                                                            |
| Màn hình pha chế                        | Có, nhưng giới hạn   | Chỉ thanh tiêu đề và logo. Thẻ mẻ giữ màu ngữ nghĩa — xem 10.4 |
| ---                                     | ---                  | ---                                                            |
| Bill và phiếu số in                     | Có                   | Logo, tên chuỗi, kèm tên và địa chỉ chi nhánh                  |
| ---                                     | ---                  | ---                                                            |
| Trang đăng nhập                         | Không                | Giữ nhận diện nền tảng (CC-04)                                 |
| ---                                     | ---                  | ---                                                            |
| Màn hình Platform Admin, Platform Staff | Không                | Luôn giữ nhận diện nền tảng (BR-44)                            |
| ---                                     | ---                  | ---                                                            |

### 10.4. Ràng buộc thiết kế — mục quan trọng nhất của phần này

Cho khách hàng tự chọn màu là mở một cửa để họ tự làm hỏng giao diện của chính mình. Bốn ràng buộc dưới đây là để đóng cửa đó lại mà vẫn giữ được quyền tuỳ biến.

**R1 — Tách màu thương hiệu khỏi màu ngữ nghĩa.** Hệ thống có hai họ màu:

- **Màu thương hiệu:** nút chính, thanh điều hướng, liên kết, điểm nhấn. Brand Manager đổi được.
- **Màu ngữ nghĩa:** đỏ cảnh báo, vàng đang chờ, xanh đã xong, xám vô hiệu. Hằng số hệ thống, Brand Manager không đổi được.

Lý do sống còn: màn hình pha chế phân biệt trạng thái bằng màu, người pha chế liếc chứ không đọc. Nếu một chuỗi chọn màu chủ đạo là đỏ và màu đó tràn vào thẻ mẻ, pha chế sẽ đọc nhầm mẻ bình thường thành mẻ trễ. Tuỳ biến giao diện không được phép làm hỏng vận hành (BR-42).

**R2 — Kiểm tra tương phản khi lưu.** Chủ quán chọn màu vàng nhạt làm màu nút thì chữ trắng trên nút biến mất. Hệ thống tự tính tương phản giữa chữ và nền; nếu dưới ngưỡng đọc được thì tự đổi chữ sang màu tương phản và báo cho Brand Manager. Không từ chối màu của khách, chỉ sửa màu chữ (BR-43).

**R3 — Ưu tiên bộ màu dựng sẵn.** Cho 8 bộ màu đã phối sẵn cộng một ô nhập mã màu tự do. Phần lớn chủ quán chọn bộ sẵn, vừa nhanh vừa tránh phối màu xấu.

**R4 — Xem trước trước khi lưu, và luôn có nút khôi phục mặc định.** Brand Manager phải thấy kết quả trước khi áp cho cả doanh nghiệp, và phải có đường lùi.

### 10.5. Cách triển khai

**Dữ liệu.** Một bảng branding quan hệ **một–một với doanh nghiệp**: mã doanh nghiệp, đường dẫn logo, màu chủ đạo, màu nhấn, tên hiển thị, phiên bản cấu hình, thời điểm cập nhật, người cập nhật. Khi doanh nghiệp được kích hoạt, hệ thống sinh sẵn một bản ghi mặc định để không bao giờ có doanh nghiệp thiếu nhận diện.

**Theo gói.** API trả nhận diện kiểm tra gói: gói Cơ bản luôn trả bộ mặc định, dù bảng branding có cấu hình. Hạ gói thì cấu hình được giữ lại, nâng lại là áp ngay.

**Áp vào giao diện.** Frontend không viết mã màu cứng ở bất kỳ đâu, cả web lẫn ứng dụng mobile. Mọi màu đi qua token:

```
:root {
  --brand-primary:   #111827;   ← Brand Manager đổi được
  --brand-accent:    #6B7280;   ← Brand Manager đổi được
  --status-waiting:  #F59E0B;   ← hằng số hệ thống
  --status-done:     #10B981;   ← hằng số hệ thống
  --status-late:     #EF4444;   ← hằng số hệ thống
}
```

Ứng dụng Android (POS, màn hình phía khách, màn hình pha chế) dùng cùng bộ tên token trong một theme object. Đổi nhận diện chỉ là ghi lại giá trị của nhóm biến đầu. Không build lại, không nhân bản giao diện theo khách hàng.

**Nạp lúc nào.** Sau khi đăng nhập, API trả về hồ sơ người dùng kèm nhận diện của doanh nghiệp trong cùng một phản hồi. Client áp token trước khi render màn hình đầu tiên, tránh nhấp nháy đổi màu. Mỗi lần Brand Manager lưu thì tăng số phiên bản để client biết phải tải lại.

**Ranh giới quyền.** API ghi nhận diện chỉ chấp nhận vai trò Brand Manager, chỉ ghi được vào doanh nghiệp của chính người gọi, và chỉ khi gói có tính năng này. Tài khoản Store Manager gọi thẳng API phải bị từ chối ở backend — một điểm kiểm thử phân quyền đáng viết test.

### 10.6. Giới hạn đã biết

- Không phải white-label đầy đủ: không có tên miền riêng, không đổi được phông và bố cục
- Logo nền không trong suốt sẽ lộ khối vuông trên thanh điều hướng màu — hướng dẫn trong giao diện, không xử lý ảnh tự động
- Nhận diện dùng chung toàn chuỗi, chi nhánh không có nhận diện riêng
- Không có bản xem trước cho từng vai trò; Brand Manager xem trước trên giao diện của chính mình

## 11. Thanh toán QR qua PayOS và màn hình phía khách

### 11.1. Ý tưởng một câu

Nền tảng không giữ tiền. Mỗi chủ chuỗi tự mở kênh PayOS gắn với tài khoản ngân hàng của mình; hệ thống dùng khoá của kênh đó để tạo QR cho từng đơn và nhận webhook để biết tiền đã vào — tiền đi thẳng từ khách tới chủ chuỗi.

```
Khách  →  PayOS (kênh của chủ chuỗi)  →  Tài khoản ngân hàng của chủ chuỗi
                 └── webhook ──►  Hệ thống: đơn Đã thanh toán
```

### 11.2. Làm rõ: cửa hàng biết khách đã chuyển khoản bằng cách nào

Đây là câu hỏi hội đồng đã nêu. Câu trả lời ngắn: **cửa hàng không cần nhìn màn hình của khách — PayOS báo cho hệ thống.**

1. Backend tạo QR qua PayOS với orderCode là mã đơn, amount là tổng tiền, thời hạn khoảng 10 phút
2. Khách quét bằng app ngân hàng bất kỳ; PayOS nhận biết giao dịch khớp với QR nào
3. PayOS gửi webhook có chữ ký về địa chỉ webhook riêng của doanh nghiệp đó
4. Backend lấy checksum key của đúng doanh nghiệp, kiểm tra chữ ký — chỉ PayOS biết khoá này, nên không ai giả webhook được
5. Backend đối chiếu orderCode với đơn đang chờ và số tiền với tổng đơn; khớp thì chuyển đơn Đã thanh toán trong một transaction, cấp số gọi
6. Socket.IO báo POS "Đã nhận 45.000đ" kèm âm thanh, màn hình phía khách báo thành công, in bill và phiếu số, đẩy đơn xuống pha chế

### 11.3. Liên kết PayOS

- Brand Manager tự mở kênh trên PayOS, gắn tài khoản ngân hàng, lấy Client ID, API Key, Checksum Key
- Hệ thống mã hoá ba khoá trước khi lưu, bằng khoá chủ đặt trong biến môi trường của máy chủ, không nằm trong cơ sở dữ liệu
- Mỗi doanh nghiệp một bộ khoá và một địa chỉ webhook riêng, dạng /webhooks/payos/{mã kênh}. Nhờ đó backend biết ngay phải dùng checksum key nào để kiểm chữ ký
- Lúc lưu, backend gọi PayOS xác nhận địa chỉ webhook. Không xác nhận được thì báo lỗi, không lưu
- Khoá không bao giờ trả về frontend sau khi lưu, không ghi vào log; giao diện chỉ hiện dạng che (BR-25)

### 11.4. Mã đơn và vòng đời QR

- Mã đơn là số nguyên duy nhất, dùng làm orderCode gửi PayOS. Một đơn chỉ có một QR
- Cần QR khác (sửa đơn sau khi đã chốt, QR hết hạn mà khách vẫn muốn mua) thì huỷ đơn cũ và chốt đơn mới với mã mới — thu ngân chỉ thấy nút "Sửa đơn", POS tự mở lại giỏ cũ
- Đơn bị huỷ, đổi sang tiền mặt hoặc QR hết hạn: backend gọi PayOS huỷ QR trước, để khách không trả được vào một đơn đã huỷ

### 11.5. Các trường hợp dự phòng

Các tình huống dự phòng của thanh toán QR — webhook chậm, webhook không về, QR hết hạn, số tiền lệch, tiền về cho đơn đã huỷ — được liệt kê ở bảng 6.10 và quy định ở BR-26 đến BR-31; mục này không nhắc lại.

### 11.6. Kiểm tra môi trường thử nghiệm

Nhóm phải kiểm tra ngay tuần 1 xem PayOS có môi trường test không. Nếu không có thì demo bằng giao dịch thật với số tiền nhỏ, trên kênh PayOS của một thành viên trong nhóm (CC-02). Webhook cần một địa chỉ công khai có HTTPS — trong lúc phát triển dùng đường hầm từ máy cá nhân, trước tuần 8 phải có máy chủ triển khai thật.

### 11.7. Phương án thay thế

Nếu PayOS không phù hợp thì dùng SePay hoặc Casso. Hai dịch vụ này theo dõi biến động số dư của tài khoản ngân hàng và gửi webhook khi có tiền vào; hệ thống khớp theo nội dung chuyển khoản có chứa mã đơn. Tiền vẫn đi thẳng vào tài khoản chủ chuỗi, nên mọi quy tắc khác của mục này giữ nguyên; chỉ đổi cách tạo QR (QR chuẩn VietQR có sẵn nội dung) và cách đối chiếu (theo nội dung thay vì orderCode).

### 11.8. Cách triển khai

- payos_channels — một dòng mỗi doanh nghiệp: ba khoá đã mã hoá, mã kênh dùng trong địa chỉ webhook, trạng thái liên kết, lần kiểm tra gần nhất, người cập nhật
- orders — mã đơn số nguyên duy nhất, chi nhánh, thu ngân, trạng thái, tổng tiền, số gọi, ngày của số gọi, lý do huỷ, tổng tiền đã hoàn (chi tiết ở refunds, mục 28)
- payments — đơn, hình thức, số tiền, trạng thái, mã link PayOS, thời điểm hết hạn, tiền khách đưa và tiền thối (tiền mặt), người xác nhận thủ công, lý do
- payment_webhooks — webhook đã nhận, ràng buộc duy nhất trên mã giao dịch, kết quả kiểm tra chữ ký và đối chiếu
- Số gọi: ràng buộc duy nhất trên (chi nhánh, ngày, số gọi); cấp trong cùng transaction với việc chuyển đơn sang Đã thanh toán
- Tiền lưu bằng số nguyên đồng

**Đồng thời.** Webhook, nút Kiểm tra lại và xác nhận thủ công có thể tới cùng lúc cho một đơn. Cả ba đi qua cùng một hàm xác nhận, khoá dòng đơn trong transaction và chỉ đổi trạng thái khi đơn còn ở Chờ thanh toán. Phải có test cho webhook về hai lần và webhook tới cùng lúc với xác nhận thủ công.

### 11.9. Giới hạn đã biết

- Không hoàn tiền qua PayOS; mọi khoản hoàn trả bằng tiền mặt tại quầy và hệ thống ghi nhận (mục 28)
- Không đối soát với sao kê ngân hàng; tin vào webhook của PayOS
- Phụ thuộc PayOS: PayOS lỗi thì chỉ thu tiền mặt hoặc xác nhận thủ công
- Chủ chuỗi phải tự mở và xác thực kênh PayOS; nền tảng không làm thay
- Không hỗ trợ thẻ ngân hàng, ví điện tử khác

### 11.10. Quầy và ghép màn hình phía khách

Mỗi quầy thu tiền có hai tablet Android: POS phía trước cho thu ngân, màn hình phía khách phía sau. Hai máy phải biết mình thuộc cùng một quầy, và màn hình phía khách — thứ đặt ở chỗ khách với tay tới được — không được giữ tài khoản có quyền thao tác.

```
[Store Manager] Tạo quầy cho chi nhánh: Quầy 1, Quầy 2 (BM-01)
                    ↓
[Cashier]       Đăng nhập POS bằng tài khoản thu ngân, chọn quầy
                    ↓
[Màn hình KH]   Mở app lần đầu → kết nối Socket.IO chưa có token → xin mã ghép
                    ↓
[Hệ thống]      Sinh mã OTP 6 số, hết hạn sau 5 phút, gắn với đúng kết nối đó
                    ↓
[Màn hình KH]   Hiện mã OTP cỡ lớn + đồng hồ đếm ngược; hết hạn tự xin mã mới
                    ↓
[Cashier]       Trên POS chọn "Ghép màn hình khách", nhập mã OTP
                    ↓
[Hệ thống]      Kiểm tra mã: còn hạn, chưa dùng, quầy chưa bị khoá ghép
                ├─ Sai mã hoặc hết hạn → POS báo lỗi, cho nhập lại
                │    → sai 5 lần liên tiếp: khoá ghép của quầy 5 phút
                ↓
[Hệ thống]      Cấp token thiết bị chỉ đọc gắn với quầy, thu hồi máy cũ nếu có,
                gửi token về đúng kết nối đã xin mã
                    ↓
[Màn hình KH]   Lưu token vào bộ nhớ bảo mật, kết nối lại bằng token
                    ↓
[Hệ thống]      Đưa vào room của quầy, gửi trạng thái hiện tại của quầy
                    ↓
[Màn hình KH]   Hiện màn hình chờ có logo chuỗi
                POS báo "Màn hình khách: đã kết nối"
```

- Token lưu trên máy; mở lại app hoặc khởi động lại máy thì tự vào lại, không phải ghép lại
- Màn hình phía khách không có tài khoản người dùng nên **không tính vào hạn mức tài khoản** của gói
- Token chỉ nhận được sự kiện của đúng quầy đó và không gọi được API ghi nào (BR-45)
- Store Manager xem danh sách thiết bị đã ghép của chi nhánh và thu hồi khi máy hỏng, mất hoặc đổi máy. Khi thu hồi, server gửi display:revoked rồi ngắt kết nối; máy đó xoá token và quay về màn hình xin mã ghép
- Store Manager khai báo máy in mặc định của quầy trong BM-01: kiểu kết nối và địa chỉ máy in. Thu ngân có thể chọn máy in Bluetooth khác ngay trên tablet POS; máy chọn trên tablet được ưu tiên. Bản hiện tại chỉ in qua Bluetooth (mục 19). Mỗi quầy một máy in
- Màn hình gọi số ghép bằng cùng cơ chế, nhưng token gắn với chi nhánh thay vì quầy. Màn hình gọi số là trang web chạy trên trình duyệt của TV hoặc tablet ở khu nhận món

**Mã OTP ghép thiết bị.** Mã chỉ dùng để ghép một màn hình với một quầy, không phải mật khẩu và không gắn với tài khoản nào:

- **Ai sinh:** server sinh bằng bộ sinh số ngẫu nhiên an toàn, đủ 6 chữ số (kể cả số 0 ở đầu), không trùng với mã nào khác còn hạn. Màn hình chỉ hiển thị, không tự đặt mã
- **Gắn với máy xin mã:** mã gắn với đúng kết nối Socket.IO của màn hình đã xin mã. Token chỉ được gửi về kết nối đó, nên người khác nhìn thấy mã cũng không lấy được token
- **Hạn dùng:** hết hạn sau 5 phút và chỉ dùng một lần. Hết hạn thì màn hình tự xin mã mới; màn hình ngắt kết nối khi đang chờ thì mã cũ bị huỷ
- **Chống dò mã:** mỗi quầy được nhập sai tối đa 5 lần liên tiếp, quá thì khoá chức năng ghép của quầy đó 5 phút. Mọi lần ghép, dù thành công hay thất bại, đều ghi audit log
- **Ai được nhập:** thu ngân chỉ ghép được màn hình phía khách cho quầy mình đang đăng nhập; Store Manager ghép được màn hình gọi số cho chi nhánh của mình (BR-45)
- **Lưu trữ:** server chỉ lưu mã băm của OTP và của token thiết bị, không lưu bản rõ

**Trao token qua Socket.IO.** Màn hình chưa ghép mở kết nối Socket.IO không kèm token; kết nối này chỉ được xin mã và chờ kết quả. POS gửi mã qua REST API có kiểm quyền thu ngân như mọi API khác:

```
[Màn hình KH] ──pair:request────────────────────────► [Server]
[Server]      ──pair:code {mã OTP, hết hạn lúc}─────► [Màn hình KH]
[POS]         ──POST /stations/{mã quầy}/display-pairing {mã OTP}──► [Server]
[Server]      ──pair:success {token, quầy, nhận diện}──► [Màn hình KH]
[Màn hình KH] ──kết nối lại, auth = token thiết bị──► room station:{mã quầy}
[Server]      ──display:status {đã kết nối}──────────► [POS]
```

**Dữ liệu:** pos_stations — chi nhánh, tên quầy, trạng thái, cấu hình máy in (kiểu kết nối, địa chỉ IP hoặc địa chỉ MAC); display_devices — loại (màn hình khách hoặc màn hình gọi số), quầy hoặc chi nhánh, mã băm của token, người ghép, thời điểm ghép, lần kết nối gần nhất, thời điểm thu hồi; pairing_codes — mã băm của OTP, loại thiết bị xin mã, kết nối đang chờ, thời điểm hết hạn, đã dùng hay chưa, quầy và người đã nhập. Số lần nhập sai đếm theo quầy, giữ trong bộ nhớ (Redis nếu chạy nhiều máy chủ) và tự xoá sau 5 phút.

### 11.11. Đồng bộ POS và màn hình phía khách

**Kiến trúc.** Hai máy không kết nối trực tiếp với nhau. Cả hai cùng vào room station:{mã quầy} trên server Socket.IO; máy POS gửi lên, server chuyển tiếp ngay cho máy khách.

```
[Tablet POS] ──websocket──► [Backend Socket.IO] ──websocket──► [Màn hình KH]
                                   ▲
                          PayOS webhook (tiền đã vào)
```

Không chọn kết nối trực tiếp qua mạng nội bộ, Wi‑Fi Direct hay Bluetooth vì ba lý do:

- Trạng thái "đã nhận tiền" đến từ webhook PayOS về backend, nên màn hình khách dù sao cũng phải nghe server
- Mất internet thì không tạo được QR và POS đám mây cũng ngừng (GĐ-08); kết nối trực tiếp không cứu được
- Socket.IO đã có sẵn trong kiến trúc cho POS và màn hình pha chế

Với máy chủ đặt ở Singapore hoặc Việt Nam, độ trễ một chiều khoảng 30–100ms — người dùng cảm nhận là tức thì.

**Nguồn dữ liệu theo giai đoạn (BR-46).**

- **Trước khi chốt đơn:** tablet POS là nguồn duy nhất của giỏ. Server chỉ chuyển tiếp, không ghi cơ sở dữ liệu, và giữ bản giỏ cuối của mỗi quầy trong bộ nhớ (Redis nếu chạy nhiều máy chủ) để màn hình khách vào lại là lấy được ngay
- **Sau khi chốt đơn:** server là nguồn duy nhất cho mã QR, thời hạn và kết quả thanh toán, và gửi đồng thời cho cả hai máy

**Gửi cả giỏ, không gửi từng thay đổi.** Mỗi lần thêm, sửa, xoá món, POS gửi toàn bộ giỏ; server gắn cho bản giỏ đó một số phiên bản tăng dần theo quầy rồi mới chuyển tiếp. Giỏ chỉ vài KB. Màn hình khách vẽ lại theo bản có số phiên bản lớn nhất và bỏ qua bản cũ hơn — không cần ghép thay đổi, gói tin đến trễ cũng không làm sai. Số phiên bản do server cấp để POS khởi động lại hay tải lại không làm màn hình khách bỏ qua giỏ mới.

| **Sự kiện**                        | **Chiều**                   | **Nội dung**                                                                                     |
| ---------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| cart:update                        | POS → server                | Mã quầy, danh sách món kèm tuỳ chọn, tổng tiền; server kiểm tra người gửi (BR-48)                |
| ---                                | ---                         | ---                                                                                              |
| cart:clear                         | POS → server                | Xoá giỏ; server phát cart:state với giỏ rỗng, màn hình khách về màn hình chờ                     |
| ---                                | ---                         | ---                                                                                              |
| cart:state                         | Server → quầy               | Bản giỏ mới nhất kèm số phiên bản do server cấp                                                  |
| ---                                | ---                         | ---                                                                                              |
| payment:qr                         | Server → quầy               | Mã đơn, số tiền, chuỗi QR, thời điểm hết hạn                                                     |
| ---                                | ---                         | ---                                                                                              |
| payment:paid                       | Server → quầy               | Mã đơn, số tiền đã nhận, số gọi                                                                  |
| ---                                | ---                         | ---                                                                                              |
| payment:expired, payment:cancelled | Server → quầy               | Mã đơn                                                                                           |
| ---                                | ---                         | ---                                                                                              |
| display:status                     | Server → POS                | Màn hình khách đang kết nối hay không                                                            |
| ---                                | ---                         | ---                                                                                              |
| station:sync                       | Màn hình KH → server        | Xin trạng thái hiện tại: giỏ hoặc QR đang chờ. Server cũng tự gửi ngay khi màn hình vừa vào room |
| ---                                | ---                         | ---                                                                                              |
| pair:request                       | Màn hình chưa ghép → server | Xin mã ghép. Kết nối chưa có token chỉ được gửi sự kiện này                                      |
| ---                                | ---                         | ---                                                                                              |
| pair:code                          | Server → màn hình chưa ghép | Mã OTP 6 số và thời điểm hết hạn                                                                 |
| ---                                | ---                         | ---                                                                                              |
| pair:success                       | Server → màn hình chưa ghép | Token thiết bị, tên quầy, chi nhánh và nhận diện thương hiệu; chỉ gửi về đúng kết nối đã xin mã  |
| ---                                | ---                         | ---                                                                                              |
| display:revoked                    | Server → màn hình khách     | Token bị thu hồi hoặc máy khác vừa ghép vào quầy; màn hình xoá token, quay về màn hình xin mã    |
| ---                                | ---                         | ---                                                                                              |
| display.update                     | Server → màn hình khách     | Nhận diện hoặc áp phích của doanh nghiệp vừa đổi; màn hình nạp lại ngữ cảnh hiển thị (mục 20)    |
| ---                                | ---                         | ---                                                                                              |

**Những chi tiết giữ cho đồng bộ nhanh:**

- Client chỉ dùng websocket, bỏ bước long-polling ban đầu của Socket.IO
- Xác thực ngay lúc bắt tay: POS gửi token đăng nhập của thu ngân, màn hình khách gửi token thiết bị trong phần auth của Socket.IO. Server tự đưa kết nối vào room của quầy tương ứng; client không tự chọn room
- Mất kết nối thì client tự kết nối lại với thời gian chờ tăng dần, không quá 10 giây giữa hai lần thử (mục 18); kết nối lại xong là nhận ngay trạng thái hiện tại của quầy
- Màn hình khách tự vẽ QR từ chuỗi QR PayOS trả về, không tải ảnh
- Gửi thời điểm hết hạn tuyệt đối thay vì số giây còn lại; màn hình khách tự đếm theo độ lệch giờ với server, rớt mạng vài giây vẫn đếm đúng
- POS cập nhật giao diện ngay trên máy mình rồi mới gửi đi, không chờ server phản hồi
- Server chỉ nhận cart:update và cart:clear từ tài khoản thu ngân đang đăng nhập ở đúng quầy, đúng chi nhánh và doanh nghiệp; token màn hình khách không gửi được sự kiện nào ngoài station:sync (BR-48)
- POS hiện trạng thái "Màn hình khách: đang kết nối / mất kết nối"; mất kết nối thì tự hiện QR trên màn hình thu ngân (BR-47)
- Màn hình khách giữ màn hình luôn sáng và khoá ở chế độ màn hình khách (ghim màn hình của Android)

**Phương án khác đã cân nhắc:** máy POS hai màn hình liền khối (loại có màn phụ điều khiển bằng Presentation API của Android) nhanh nhất vì không qua mạng, nhưng phải mua đúng loại máy và viết native module. Không hợp với hai tablet rời.

## 12. Tuỳ chọn món

### 12.1. Vì sao bắt buộc

Tuỳ chọn món là tính năng mới nhưng bắt buộc. POS trà sữa mà không có size, đường, đá, topping thì hội đồng sẽ hỏi ngay. Giá lưu tại thời điểm bán, gồm cả giá của từng tuỳ chọn. Từ bản 14, topping tách khỏi nhóm tuỳ chọn thành topping thêm của từng món, chọn được nhiều phần (mục 27); nhóm tuỳ chọn dùng cho các lựa chọn kiểu size, đường, đá.

### 12.2. Mô hình

- **Nhóm tuỳ chọn:** tên, bắt buộc hay không, số chọn tối thiểu, số chọn tối đa, tuỳ chọn mặc định, thứ tự hiển thị
- **Tuỳ chọn:** tên, giá cộng thêm (≥ 0), cờ kinh doanh cấp chuỗi
- **Gắn nhóm vào món:** một nhóm dùng chung cho nhiều món — nhóm Đường gắn cho mọi món trà sữa, sửa một lần là đổi cho tất cả
- **Cờ còn bán tại chi nhánh:** như món, do Store Manager hoặc Barista bật/tắt
- Topping thêm của món: không phải nhóm tuỳ chọn mà là danh sách topping gắn riêng cho từng món, có giá theo món và số phần (mục 27)

| **Nhóm**         | **Quy tắc chọn**                                         | **Tuỳ chọn (giá cộng thêm)**                                                            |
| ---------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Size             | Bắt buộc, chọn đúng 1                                    | M (+0), L (+6.000)                                                                      |
| ---              | ---                                                      | ---                                                                                     |
| Đường            | Bắt buộc, chọn đúng 1, mặc định 100%                     | 0%, 30%, 50%, 70%, 100% (+0)                                                            |
| ---              | ---                                                      | ---                                                                                     |
| Đá               | Bắt buộc, chọn đúng 1, mặc định Bình thường              | Không đá, Ít đá, Bình thường (+0)                                                       |
| ---              | ---                                                      | ---                                                                                     |
| Topping (mục 27) | Không bắt buộc, mỗi topping 0–3 phần, tổng tối đa 5 phần | Trân châu đen (+5.000 mỗi phần), Thạch dừa (+5.000 mỗi phần), Pudding (+7.000 mỗi phần) |
| ---              | ---                                                      | ---                                                                                     |

### 12.3. Tính giá và lưu giá lúc bán

Giá một ly bằng giá hiệu lực của món tại chi nhánh (mục 29) cộng giá mọi tuỳ chọn đã chọn và giá topping nhân số phần. Giá dòng món bằng giá một ly nhân số lượng. Tính ở backend (BR-19).

**Ví dụ.** Trà sữa truyền thống 30.000đ, size L (+6.000), trân châu đen (+5.000), pudding (+7.000): 48.000đ một ly, hai ly là 96.000đ. Thêm hai phần trân châu đen thay vì một: 53.000đ một ly. Cùng ly đó ở chi nhánh có giá chi nhánh 35.000đ cho món: 58.000đ.

Lúc chốt đơn, hệ thống chụp lại tên và giá của món vào dòng món, và tên nhóm, tên tuỳ chọn, giá cộng thêm của từng tuỳ chọn vào bảng tuỳ chọn của dòng món; tên, giá một phần và số phần của từng topping vào bảng topping của dòng món. Bill in lại sau ba tháng vẫn đúng như lúc bán, dù Brand Manager đã đổi giá hay xoá topping (BR-15).

### 12.4. Hiển thị

- **POS:** chọn món là mở bảng tuỳ chọn với mặc định đã chọn sẵn — đa số ly chỉ cần chọn size rồi thêm vào giỏ. Nhóm bắt buộc chưa chọn đủ thì nút thêm bị khoá
- **Màn hình phía khách và bill:** tuỳ chọn in dưới từng món, kèm giá cộng thêm nếu khác 0; topping kèm số phần ("+2 Trân châu đen"); combo in tên combo rồi các món bên dưới
- **Màn hình pha chế:** chỉ in đậm tuỳ chọn khác mặc định ("30% đường", "không đá", "+ pudding"), không in những gì mặc định, để mắt không bị ngợp

### 12.5. Có gì, không có gì

| **Có**                                              | **Không có**                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Nhóm tuỳ chọn dùng chung nhiều món                  | Giá tuỳ chọn riêng theo chi nhánh                                              |
| ---                                                 | ---                                                                            |
| Quy tắc bắt buộc, tối thiểu, tối đa                 | Tuỳ chọn phụ thuộc nhau (chỉ size L mới có topping X)                          |
| ---                                                 | ---                                                                            |
| Giá cộng thêm theo từng tuỳ chọn                    | Nhiều phần cho một tuỳ chọn (nhiều phần chỉ có ở topping, mục 27)              |
| ---                                                 | ---                                                                            |
| Bật/tắt tuỳ chọn cấp chuỗi và cấp chi nhánh         | Giảm giá tự động theo tổ hợp món (combo phải do Brand Manager tạo sẵn, mục 26) |
| ---                                                 | ---                                                                            |
| Giá lúc bán gồm từng tuỳ chọn                       | Công thức định lượng nguyên liệu                                               |
| ---                                                 | ---                                                                            |
| Topping thêm của từng món, chọn nhiều phần (mục 27) | Giá topping riêng theo chi nhánh                                               |
| ---                                                 | ---                                                                            |
| Combo có thành phần biến thể (mục 26)               | Combo lồng combo                                                               |
| ---                                                 | ---                                                                            |

## 13. Gói dịch vụ và phân cấp tính năng

### 13.1. Ba gói

Hạn mức tính theo ước lượng khoảng 8 tài khoản mỗi chi nhánh (Store Manager, thu ngân và pha chế của các ca) cộng 1 Brand Manager. Giá là giá dự kiến để nhóm bàn, chưa chốt (CC-01).

|                                                                | **Cơ bản**          | **Tiêu chuẩn**                           | **Nâng cao**         |
| -------------------------------------------------------------- | ------------------- | ---------------------------------------- | -------------------- |
| Số chi nhánh                                                   | ≤ 3                 | ≤ 6                                      | ≤ 10                 |
| ---                                                            | ---                 | ---                                      | ---                  |
| Số tài khoản                                                   | ≤ 30                | ≤ 55                                     | ≤ 90                 |
| ---                                                            | ---                 | ---                                      | ---                  |
| POS, pha chế, báo cáo chi nhánh                                | ✓                   | ✓                                        | ✓                    |
| ---                                                            | ---                 | ---                                      | ---                  |
| Áp phích màn hình phía khách                                   | ✓                   | ✓                                        | ✓                    |
| ---                                                            | ---                 | ---                                      | ---                  |
| Nhập menu bằng ảnh (OCR + AI)                                  | ✓                   | ✓                                        | ✓                    |
| ---                                                            | ---                 | ---                                      | ---                  |
| Combo, topping thêm của món, giá theo chi nhánh, hoàn tiền mặt | ✓                   | ✓                                        | ✓                    |
| ---                                                            | ---                 | ---                                      | ---                  |
| Nhận diện thương hiệu, so sánh đa chi nhánh                    | –                   | ✓                                        | ✓                    |
| ---                                                            | ---                 | ---                                      | ---                  |
| Dùng thử 14 ngày, không mất phí                                | ✓                   | –                                        | –                    |
| ---                                                            | ---                 | ---                                      | ---                  |
| Thanh toán                                                     | QR PayOS mỗi tháng  | QR PayOS mỗi tháng                       | QR PayOS mỗi tháng   |
| ---                                                            | ---                 | ---                                      | ---                  |
| Giá hằng tháng (dự kiến)                                       | 590.000đ            | 1.090.000đ                               | 1.690.000đ           |
| ---                                                            | ---                 | ---                                      | ---                  |
| Khoảng mỗi chi nhánh (nếu dùng hết hạn mức)                    | 197.000đ            | 182.000đ                                 | 169.000đ             |
| ---                                                            | ---                 | ---                                      | ---                  |
| Phù hợp với                                                    | Chuỗi 2–3 chi nhánh | Chuỗi 4–6 chi nhánh, cần nhận diện riêng | Chuỗi 7–10 chi nhánh |
| ---                                                            | ---                 | ---                                      | ---                  |

Số tài khoản tính mọi tài khoản đang hoạt động thuộc doanh nghiệp: Brand Manager, Store Manager, Cashier, Barista. Tài khoản đã khoá không tính. Tài khoản Platform Staff và Platform Admin thuộc nền tảng, không tính vào gói nào.

Kiểm hạn mức tài khoản theo ước lượng: Cơ bản 3 × 8 + 1 = 25 trên trần 30; Tiêu chuẩn 6 × 8 + 1 = 49 trên trần 55; Nâng cao 10 × 8 + 1 = 81 trên trần 90. Mỗi gói dư 5–9 tài khoản cho nhân viên thời vụ hoặc thêm Store Manager ca.

Giá mỗi chi nhánh lấy giá tháng chia số chi nhánh tối đa, làm tròn tới nghìn đồng: 590.000 ÷ 3, 1.090.000 ÷ 6, 1.690.000 ÷ 10. Lên gói thì giá mỗi chi nhánh giảm, để chuỗi đang lớn có lý do nâng gói.

Nâng cao không có tính năng riêng: khác Tiêu chuẩn ở số chi nhánh và số tài khoản. Màn hình phía khách, màn hình gọi số và TV không phải tài khoản người dùng nên không tính vào hạn mức tài khoản.

Dùng thử chỉ có ở gói Cơ bản (BR-68). Chuỗi cần nhận diện thương hiệu hoặc so sánh đa chi nhánh dùng thử gói Cơ bản để đánh giá phần bán hàng, rồi chọn Tiêu chuẩn hoặc Nâng cao khi mua — gói chọn lúc mua áp ngay (BR-70).

### 13.2. Quy tắc áp gói

- Backend chặn khi vượt hạn mức hoặc khi gói không có tính năng đó (BR-08). Frontend ẩn hoặc khoá mục tương ứng kèm nhãn gói cần có, nhưng đó chỉ là lớp thứ hai
- Hết hạn thì chuyển sang chỉ đọc (BR-09)
- Phí thuê bao thu qua PayOS của nền tảng; Brand Manager gia hạn bằng thanh toán, Admin chỉ gia hạn thủ công cho ngoại lệ (BR-10, mục 25)
- Hạ gói không xoá gì; chỉ chặn tạo mới khi đang vượt hạn mức (BR-11)
- Email nhắc hạn kèm link tới trang thanh toán: dùng thử khi còn 5 và 3 ngày; thuê bao trả phí khi còn 7 ngày, 3 ngày và đúng ngày hết hạn (BR-69)

### 13.3. Phân cấp tính năng

**Cấp hệ thống (Platform Admin, Platform Staff):** Platform Staff duyệt hồ sơ và hỗ trợ khách đăng ký gói; Platform Admin làm được mọi việc đó, cộng quản lý gói, quản lý doanh nghiệp (gia hạn thủ công, đổi gói, tạm ngưng), theo dõi hoá đơn thuê bao, xem doanh thu nền tảng, cấp tài khoản Platform Staff.

**Cấp chuỗi (Brand Manager):** chi nhánh, menu và giá chuỗi, giá riêng theo chi nhánh, combo, topping thêm của món, nhập menu bằng ảnh, tuỳ chọn món, tài khoản Store Manager, liên kết PayOS, nhận diện thương hiệu, áp phích màn hình phía khách, báo cáo đa chi nhánh, thanh toán thuê bao.

**Cấp cửa hàng (Store Manager, Cashier, Barista):** POS bán món, topping và combo, hoàn tiền mặt, số máy rung, bật/tắt món và combo, tài khoản nhân viên, màn hình pha chế, màn hình gọi số, báo cáo chi nhánh.

### 13.4. Cách triển khai

- plans — tên, giá tháng, số chi nhánh tối đa, số tài khoản tối đa, cờ tính năng: nhận diện, so sánh đa chi nhánh
- subscriptions — doanh nghiệp, gói, loại kỳ (dùng thử, trả phí, gia hạn thủ công), ngày bắt đầu, ngày hết hạn, hoá đơn đã trả hoặc người gia hạn thủ công kèm lý do; mỗi kỳ là một dòng mới để giữ lịch sử
- activation_tokens, subscription_invoices, subscription_payments cho kích hoạt và thanh toán thuê bao — chi tiết ở 25.6
- Một lớp kiểm tra gói dùng chung ở backend, đặt trước mọi API tạo chi nhánh, tạo tài khoản, ghi nhận diện, báo cáo so sánh
- Trạng thái hết hạn tính từ ngày hết hạn khi xử lý yêu cầu, không cần job; job hằng ngày chỉ lập hoá đơn và gửi email nhắc (25.6)

Khối lượng khoảng 2 ngày backend và 1,5 ngày frontend (màn hình gói của Admin, màn hình xem gói của Brand Manager, nhãn khoá tính năng). Phần thanh toán thuê bao và dùng thử tính riêng ở 25.6.

## 14. Danh sách use case

### 14.1. Danh sách đầy đủ — 43 use case, bắt buộc, tuần 1–9

| **Mã** | **Use case**                                                                                                                    | **Actor**                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| CM-01  | Đăng nhập, đăng xuất; đổi mật khẩu tạm bắt buộc ở lần đăng nhập đầu và sau khi được đặt lại                                     | Mọi actor đã xác thực                   |
| ---    | ---                                                                                                                             | ---                                     |
| CM-02  | Xem, cập nhật hồ sơ cá nhân và đổi mật khẩu                                                                                     | Mọi actor đã xác thực                   |
| ---    | ---                                                                                                                             | ---                                     |
| GU-01  | Nộp hồ sơ đăng ký                                                                                                               | Prospective Brand Manager               |
| ---    | ---                                                                                                                             | ---                                     |
| GU-02  | Kích hoạt dịch vụ từ email duyệt — trả tháng đầu qua PayOS hoặc dùng thử 14 ngày gói Cơ bản                                     | Prospective Brand Manager               |
| ---    | ---                                                                                                                             | ---                                     |
| PA-01  | Xem hồ sơ đăng ký: danh sách, tìm kiếm, chi tiết                                                                                | Platform Staff (Platform Admin kế thừa) |
| ---    | ---                                                                                                                             | ---                                     |
| PA-02  | Duyệt hồ sơ — chọn gói, gửi email kèm link kích hoạt                                                                            | Platform Staff (Platform Admin kế thừa) |
| ---    | ---                                                                                                                             | ---                                     |
| PA-03  | Từ chối hồ sơ kèm lý do                                                                                                         | Platform Staff (Platform Admin kế thừa) |
| ---    | ---                                                                                                                             | ---                                     |
| PS-01  | Hỗ trợ khách đăng ký gói sau khi duyệt — đổi gói trước khi kích hoạt, gửi lại link, đổi gói kỳ kế tiếp, Kiểm tra lại thanh toán | Platform Staff (Platform Admin kế thừa) |
| ---    | ---                                                                                                                             | ---                                     |
| PA-04  | Quản lý gói dịch vụ                                                                                                             | Platform Admin                          |
| ---    | ---                                                                                                                             | ---                                     |
| PA-05  | Quản lý doanh nghiệp — theo dõi hoá đơn thuê bao, gia hạn thủ công, đổi gói, tạm ngưng, đặt lại mật khẩu Brand Manager          | Platform Admin                          |
| ---    | ---                                                                                                                             | ---                                     |
| PA-06  | Xem doanh thu nền tảng                                                                                                          | Platform Admin                          |
| ---    | ---                                                                                                                             | ---                                     |
| PA-07  | Quản lý tài khoản Platform Staff — cấp, khoá, đặt lại mật khẩu tạm qua email                                                    | Platform Admin                          |
| ---    | ---                                                                                                                             | ---                                     |
| OW-01  | Quản lý chi nhánh                                                                                                               | Brand Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| OW-02  | Quản lý danh mục và món                                                                                                         | Brand Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| OW-03  | Quản lý tuỳ chọn món — size, đường, đá                                                                                          | Brand Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| OW-04  | Gán món và combo cho chi nhánh, bật/tắt cấp chuỗi                                                                               | Brand Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| OW-05  | Quản lý tài khoản Store Manager — cấp, đặt lại mật khẩu tạm qua email                                                           | Brand Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| OW-06  | Liên kết PayOS                                                                                                                  | Brand Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| OW-07  | Cấu hình nhận diện thương hiệu — logo, màu, tên hiển thị                                                                        | Brand Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| OW-08  | Xem báo cáo đa chi nhánh                                                                                                        | Brand Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| OW-10  | Xem gói dịch vụ và hạn mức                                                                                                      | Brand Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| OW-11  | Quản lý áp phích màn hình phía khách                                                                                            | Brand Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| OW-12  | Nhập menu bằng ảnh (OCR + AI)                                                                                                   | Brand Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| OW-13  | Thanh toán thuê bao qua PayOS — gia hạn hằng tháng, chuyển từ dùng thử sang trả phí                                             | Brand Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| OW-14  | Quản lý combo và combo biến thể món                                                                                             | Brand Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| OW-15  | Quản lý topping thêm của món (menu item extra)                                                                                  | Brand Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| OW-16  | Đặt giá menu theo chi nhánh                                                                                                     | Brand Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| BM-01  | Quản lý tài khoản thu ngân, pha chế (cấp, đặt lại mật khẩu tạm qua email) và quầy                                               | Store Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| BM-02  | Bật/tắt món, tuỳ chọn, topping và combo tại chi nhánh                                                                           | Store Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| BM-03  | Xem báo cáo chi nhánh                                                                                                           | Store Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| BM-04  | Tra cứu đơn                                                                                                                     | Store Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| BM-05  | Xác nhận chuyển khoản thủ công                                                                                                  | Store Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| BM-06  | Huỷ đơn đã thanh toán và hoàn tiền mặt cho mọi đơn của chi nhánh, kèm lý do                                                     | Store Manager                           |
| ---    | ---                                                                                                                             | ---                                     |
| CS-01  | Tạo đơn tại quầy (kèm tuỳ chọn, topping, combo)                                                                                 | Cashier                                 |
| ---    | ---                                                                                                                             | ---                                     |
| CS-02  | Thu tiền mặt, tính tiền thối                                                                                                    | Cashier                                 |
| ---    | ---                                                                                                                             | ---                                     |
| CS-03  | Thu QR qua PayOS                                                                                                                | Cashier                                 |
| ---    | ---                                                                                                                             | ---                                     |
| CS-04  | In bill và phiếu số                                                                                                             | Cashier                                 |
| ---    | ---                                                                                                                             | ---                                     |
| CS-05  | Xem lịch sử đơn                                                                                                                 | Cashier                                 |
| ---    | ---                                                                                                                             | ---                                     |
| CS-06  | Gán số máy rung cho đơn                                                                                                         | Cashier                                 |
| ---    | ---                                                                                                                             | ---                                     |
| CS-07  | Hoàn tiền mặt cho đơn đã thanh toán trong ngày bán                                                                              | Cashier                                 |
| ---    | ---                                                                                                                             | ---                                     |
| BA-01  | Xem hàng đợi pha chế (có gom món, số máy rung)                                                                                  | Barista                                 |
| ---    | ---                                                                                                                             | ---                                     |
| BA-02  | Cập nhật trạng thái từng món; món xong thì gọi số và báo máy rung theo số trong đơn                                             | Barista                                 |
| ---    | ---                                                                                                                             | ---                                     |
| BA-03  | Báo hết món                                                                                                                     | Barista                                 |
| ---    | ---                                                                                                                             | ---                                     |

Tổng: 2 + 2 + 4 + 4 + 15 + 6 + 7 + 3 = **43 use case** (CM, GU, Platform Staff, Platform Admin riêng, Brand Manager, Store Manager, Cashier, Barista). Không có giai đoạn 2: phạm vi đã được thu hẹp theo góp ý của hội đồng, nên toàn bộ danh sách trên là cam kết.

### 14.2. Đã cắt hẳn — không cam kết, không ghi vào SRS như lời hứa

Sơ đồ bàn, phiên bàn, xếp và ghép bàn, đặt bàn; phục vụ tại bàn và trả sau; ca mẫu, phân ca, check-in/check-out; ví doanh nghiệp, sổ cái, tạm giữ, quyết toán, rút tiền; phí giao dịch; hoàn tiền qua hệ thống hoặc bằng chuyển khoản; audit log dạng màn hình xem (vẫn ghi log ở backend); voucher, giảm giá, khuyến mãi, tích điểm, thẻ thành viên; báo cáo lợi nhuận và chi phí; chấm công và tính lương; xuất báo cáo ra Excel; AI phân tích và gợi ý chiến lược kinh doanh; khách tự order bằng điện thoại hoặc kiosk; giao hàng; quên mật khẩu qua email; quản lý kho nguyên liệu; hoá đơn điện tử; thanh toán thẻ và ví điện tử khác; tự động trừ tiền thuê bao định kỳ; tính chênh lệch khi đổi gói giữa kỳ; tên miền riêng theo doanh nghiệp; tải lên CSS hoặc phông chữ tuỳ ý; nhận diện riêng theo chi nhánh.

### 14.3. Quy ước vẽ Use Case Diagram

- Vẽ 7 sơ đồ: một tổng quan + sáu sơ đồ theo actor (Platform Staff, Platform Admin, Brand Manager, Store Manager, Cashier, Barista). Prospective Brand Manager nằm trong sơ đồ tổng quan. Không vẽ một sơ đồ khổng lồ.
- Vẽ generalization từ Platform Staff, Brand Manager, Store Manager, Cashier, Barista lên Authenticated User, và từ Platform Admin lên Platform Staff.
- &lt;<include&gt;> chỉ dùng cho hành vi dùng lại ở nhiều use case: CS-02 và CS-03 cùng include CS-04 (in bill và phiếu số ngay sau thanh toán). Các bước tuần tự bên trong một use case viết vào luồng sự kiện, không vẽ thành bong bóng.
- Không vẽ hành vi hệ thống thành use case: gửi email, sinh mật khẩu tạm, nhận dạng chữ trong ảnh, bắn thông báo, tính tổng tiền, cấp số gọi, gom món, tự huỷ QR hết hạn, hiển thị màn hình gọi số, hiển thị màn hình phía khách, xoay vòng áp phích, đồng bộ giỏ giữa hai máy, áp nhận diện, kiểm tra gói, tính giá hiệu lực theo chi nhánh, tách combo thành dòng thành phần, lập hoá đơn thuê bao, gửi email nhắc hạn dùng thử và gia hạn. Ghép màn hình phía khách là cấu hình thiết bị, không vẽ thành use case. Đổi mật khẩu tạm bắt buộc là một phần của CM-01, không vẽ thành use case riêng.
- Hệ thống bên ngoài (mục 4.8) đặt ở phía phải khung hệ thống, không kế thừa Authenticated User. PayOS nối với CS-03, OW-06, BM-05, GU-02, OW-13 và PS-01; dịch vụ AI và dịch vụ OCR nối với OW-12; dịch vụ email nối với GU-02, PA-02, PA-03, PA-05, PA-07, PS-01, OW-05 và BM-01.

### 14.4. Dự kiến — làm nếu còn thời gian

Màn hình TV hiển thị áp phích và menu ở quầy thu ngân và quầy pha chế (mục 21). Không phát sinh use case mới: nội dung lấy từ OW-02, OW-04, OW-11, BM-02 và BA-03; ghép TV là cấu hình thiết bị như màn hình gọi số. Không tính vào 43 use case cam kết.

## 15. Ma trận quyền

| **Chức năng**                                             | **Platform Staff**                             | **Platform Admin**                                     | **Brand Manager**                             | **Store Manager**                    | **Cashier**            | **Barista**                 |
| --------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ | --------------------------------------------- | ------------------------------------ | ---------------------- | --------------------------- |
| Nộp hồ sơ đăng ký                                         | –                                              | –                                                      | –                                             | –                                    | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Duyệt / từ chối hồ sơ                                     | Toàn quyền                                     | Toàn quyền                                             | –                                             | –                                    | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Hỗ trợ đăng ký gói sau khi duyệt (PS-01)                  | Toàn quyền                                     | Toàn quyền                                             | –                                             | –                                    | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Gói dịch vụ                                               | Xem                                            | Toàn quyền                                             | Xem                                           | –                                    | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Gia hạn thủ công, đổi gói giữa kỳ, tạm ngưng doanh nghiệp | –                                              | Toàn quyền                                             | Xem                                           | –                                    | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Kích hoạt dịch vụ (trả tháng đầu hoặc dùng thử)           | Gửi lại link, đổi gói trước khi kích hoạt      | Như Platform Staff                                     | Chủ quán làm qua link, trước khi có tài khoản | –                                    | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Thanh toán thuê bao, chọn gói kỳ kế tiếp                  | Xem; Kiểm tra lại; đổi gói kỳ tới theo yêu cầu | Như Platform Staff; xác nhận thủ công khi lệch số tiền | Toàn quyền                                    | –                                    | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Doanh thu nền tảng                                        | –                                              | Toàn quyền                                             | –                                             | –                                    | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Tài khoản Platform Staff                                  | –                                              | Tạo/sửa/khoá                                           | –                                             | –                                    | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Chi nhánh                                                 | –                                              | –                                                      | Toàn quyền                                    | Xem chi nhánh mình                   | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Bộ nhận diện thương hiệu                                  | –                                              | –                                                      | Toàn quyền                                    | Nhận và hiển thị                     | Nhận và hiển thị       | Nhận và hiển thị (giới hạn) |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Áp phích màn hình phía khách                              | –                                              | –                                                      | Toàn quyền                                    | –                                    | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Liên kết PayOS                                            | –                                              | –                                                      | Toàn quyền                                    | –                                    | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Món: tên, ảnh, giá chuỗi                                  | –                                              | –                                                      | Toàn quyền                                    | Xem                                  | Xem                    | Xem, không giá              |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Giá riêng theo chi nhánh                                  | –                                              | –                                                      | Toàn quyền                                    | Xem chi nhánh mình                   | Bán theo giá chi nhánh | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Tuỳ chọn món và giá cộng thêm                             | –                                              | –                                                      | Toàn quyền                                    | Xem                                  | Xem                    | Xem, không giá              |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Topping thêm của món                                      | –                                              | –                                                      | Toàn quyền                                    | Xem                                  | Xem                    | Xem, không giá              |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Combo                                                     | –                                              | –                                                      | Toàn quyền                                    | Xem                                  | Bán                    | Xem thành phần, không giá   |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Nhập menu bằng ảnh (OCR + AI)                             | –                                              | –                                                      | Toàn quyền                                    | –                                    | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Bật/tắt món, tuỳ chọn, topping, combo cấp chuỗi           | –                                              | –                                                      | Toàn quyền                                    | –                                    | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Bật/tắt món, tuỳ chọn, topping, combo cấp chi nhánh       | –                                              | –                                                      | Xem                                           | Toàn quyền                           | –                      | Có                          |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Tài khoản Store Manager                                   | –                                              | –                                                      | Tạo/sửa                                       | –                                    | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Tài khoản thu ngân và pha chế                             | –                                              | –                                                      | Xem                                           | Tạo/sửa                              | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Đặt lại mật khẩu, gửi lại mật khẩu tạm                    | –                                              | Cho Platform Staff, Brand Manager                      | Cho Store Manager                             | Cho thu ngân, pha chế chi nhánh mình | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Quầy, thu hồi màn hình khách                              | –                                              | –                                                      | –                                             | Toàn quyền                           | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Máy in của quầy                                           | –                                              | –                                                      | –                                             | Khai báo mặc định                    | Chọn trên POS, in thử  | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Ghép màn hình khách với quầy                              | –                                              | –                                                      | –                                             | Có                                   | Có                     | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Tạo, sửa, huỷ đơn chưa thanh toán                         | –                                              | –                                                      | –                                             | –                                    | Toàn quyền             | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Thu tiền mặt, tạo QR, kiểm tra lại                        | –                                              | –                                                      | –                                             | –                                    | Toàn quyền             | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Số máy rung của đơn                                       | –                                              | –                                                      | –                                             | Xem                                  | Gán, đổi, gỡ           | Xem, đánh dấu Đã báo        |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Xác nhận chuyển khoản thủ công                            | –                                              | –                                                      | –                                             | Toàn quyền                           | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Hoàn tiền mặt, huỷ đơn đã thanh toán                      | –                                              | –                                                      | Xem trong báo cáo                             | Mọi đơn của chi nhánh                | Đơn trong ngày bán     | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| In bill, phiếu số, in lại                                 | –                                              | –                                                      | –                                             | In lại                               | Toàn quyền             | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Tra cứu đơn                                               | –                                              | –                                                      | Xem                                           | Chi nhánh mình                       | Trong ngày             | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Hàng đợi pha chế, trạng thái món                          | –                                              | –                                                      | –                                             | Xem                                  | Xem trạng thái         | Cập nhật                    |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| Báo cáo                                                   | Số liệu quản lý gói                            | Số liệu quản lý gói, doanh thu nền tảng                | Toàn chuỗi                                    | Chi nhánh mình                       | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |
| So sánh đa chi nhánh (gói Tiêu chuẩn+)                    | –                                              | –                                                      | Có                                            | –                                    | –                      | –                           |
| ---                                                       | ---                                            | ---                                                    | ---                                           | ---                                  | ---                    | ---                         |

## 16. Phạm vi

### Trong phạm vi

Luồng đăng ký và duyệt doanh nghiệp do Platform Staff xử lý, kèm hỗ trợ đăng ký gói sau khi duyệt; báo cáo doanh thu nền tảng cho Platform Admin; multi-tenant ba tầng với cô lập dữ liệu; ba gói dịch vụ với hạn mức và tính năng chặn ở backend; tuỳ biến nhận diện thương hiệu theo chuỗi; cấu hình chi nhánh, menu, tuỳ chọn món có giá cộng thêm, topping thêm của từng món chọn được nhiều phần, combo có thành phần biến thể, giá riêng theo chi nhánh; POS tại quầy trên tablet Android với màn hình phía khách là tablet Android thứ hai, ghép bằng mã OTP 6 số và đồng bộ thời gian thực qua Socket.IO; thu tiền mặt có tính tiền thối; thu QR qua PayOS về thẳng tài khoản chủ chuỗi, webhook có kiểm chữ ký và xử lý idempotent, xác nhận thủ công có kiểm soát; hoàn tiền mặt tại quầy cho đơn đã thanh toán, kể cả đơn trả bằng QR; in bill và phiếu số bằng lệnh ESC/POS tới máy in nhiệt 58 mm của quầy qua Bluetooth, POS dựng bill thành ảnh để in đúng tiếng Việt, có chế độ dự phòng in chữ không dấu; áp phích màn hình phía khách do Brand Manager quản lý cho toàn chuỗi; hàng đợi pha chế thời gian thực với thuật toán gom món; gọi số và màn hình gọi số; báo cáo chi nhánh và báo cáo đa chi nhánh; nhập menu bằng ảnh bằng OCR và AI có bước Brand Manager duyệt; cấp và đặt lại tài khoản bằng mật khẩu tạm gửi qua email, bắt đổi mật khẩu ở lần đăng nhập đầu; gán số máy rung cho đơn đã thanh toán; thu phí thuê bao qua PayOS của nền tảng với link kích hoạt, hoá đơn theo kỳ, email nhắc hạn và gia hạn tự phục vụ; dùng thử 14 ngày gói Cơ bản; RBAC và audit log ở backend.

### Ngoài phạm vi — cố ý loại trừ

| **Hạng mục**                                                                  | **Lý do**                                                                                                                                                                           |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phục vụ tại bàn, trả sau, quản lý bàn, đặt bàn                                | Khác loại hình. Mô hình trả trước làm các bài toán này biến mất (1.5)                                                                                                               |
| ---                                                                           | ---                                                                                                                                                                                 |
| Ví, thu hộ, tạm giữ, quyết toán, rút tiền                                     | Nền tảng không giữ tiền; tiền về thẳng chủ chuỗi (mục 11)                                                                                                                           |
| ---                                                                           | ---                                                                                                                                                                                 |
| Phí trên giao dịch                                                            | Doanh thu nền tảng chỉ là thuê bao                                                                                                                                                  |
| ---                                                                           | ---                                                                                                                                                                                 |
| Hoàn tiền qua PayOS hoặc bằng chuyển khoản                                    | Hoàn chuyển khoản cần số tài khoản của khách, người có quyền chuyển từ tài khoản chủ chuỗi và trạng thái chờ hoàn phải theo dõi; mọi khoản hoàn trả bằng tiền mặt tại quầy (mục 28) |
| ---                                                                           | ---                                                                                                                                                                                 |
| Hoá đơn điện tử theo quy định thuế Việt Nam                                   | Cần đăng ký với cơ quan thuế. Bắt buộc nêu khi bảo vệ                                                                                                                               |
| ---                                                                           | ---                                                                                                                                                                                 |
| Quản lý kho nguyên liệu                                                       | Cần định mức và kiểm kê, là một hệ thống riêng. Thay bằng báo hết món và hết tuỳ chọn                                                                                               |
| ---                                                                           | ---                                                                                                                                                                                 |
| Báo cáo lợi nhuận                                                             | Không có dữ liệu chi phí vì không quản lý kho và không tính lương                                                                                                                   |
| ---                                                                           | ---                                                                                                                                                                                 |
| Ca làm, chấm công, tính lương                                                 | Không cần cho điều phối trong loại hình tại quầy; là module nhân sự riêng                                                                                                           |
| ---                                                                           | ---                                                                                                                                                                                 |
| Khách tự order bằng điện thoại hoặc kiosk                                     | Gọi món tại quầy là quy trình của loại hình này; tự order là mở rộng sau                                                                                                            |
| ---                                                                           | ---                                                                                                                                                                                 |
| Voucher, khuyến mãi, tích điểm, thẻ thành viên                                | Quá phức tạp so với thời gian                                                                                                                                                       |
| ---                                                                           | ---                                                                                                                                                                                 |
| Thanh toán thẻ, ví điện tử khác                                               | Tiền mặt và QR ngân hàng đã phủ phần lớn giao dịch tại quầy                                                                                                                         |
| ---                                                                           | ---                                                                                                                                                                                 |
| Tự động trừ tiền thuê bao định kỳ (thẻ, ví liên kết)                          | Brand Manager quét QR mỗi kỳ như đóng học phí; QR PayOS không trừ tiền tự động (mục 25)                                                                                             |
| ---                                                                           | ---                                                                                                                                                                                 |
| Tính chênh lệch khi nâng hoặc hạ gói giữa kỳ                                  | Gói mới áp từ kỳ kế tiếp; cần đổi gấp thì Admin đổi thủ công (25.7)                                                                                                                 |
| ---                                                                           | ---                                                                                                                                                                                 |
| Trả trước nhiều tháng, giảm giá thuê bao theo năm                             | Mỗi lần thanh toán đúng một kỳ một tháng; giá do Admin cấu hình                                                                                                                     |
| ---                                                                           | ---                                                                                                                                                                                 |
| Hoá đơn VAT cho phí thuê bao                                                  | Cần đăng ký với cơ quan thuế như hoá đơn điện tử bán hàng; hệ thống chỉ gửi biên nhận                                                                                               |
| ---                                                                           | ---                                                                                                                                                                                 |
| AI phân tích, gợi ý chiến lược kinh doanh                                     | Không có đáp án đúng để kiểm chứng                                                                                                                                                  |
| ---                                                                           | ---                                                                                                                                                                                 |
| Trợ lý AI hỏi đáp số liệu (OW-09 của bản 9.2)                                 | Bỏ ở bản 10: báo cáo chi nhánh và đa chi nhánh đã đủ cho quản lý; không đáng chi phí gọi mô hình và kiểm thử an toàn (mục 9)                                                        |
| ---                                                                           | ---                                                                                                                                                                                 |
| Chế độ hoạt động offline                                                      | Rủi ro cố hữu của POS đám mây, ghi nhận ở mục 17                                                                                                                                    |
| ---                                                                           | ---                                                                                                                                                                                 |
| Tên miền riêng, tải lên CSS, phông chữ, đổi bố cục                            | Tuỳ biến dừng ở logo, màu, tên                                                                                                                                                      |
| ---                                                                           | ---                                                                                                                                                                                 |
| Nhận diện riêng theo chi nhánh                                                | Nhận diện là của chuỗi                                                                                                                                                              |
| ---                                                                           | ---                                                                                                                                                                                 |
| Tích hợp giao hàng bên thứ ba                                                 | Không thuộc bài toán tại quầy                                                                                                                                                       |
| ---                                                                           | ---                                                                                                                                                                                 |
| Đa ngôn ngữ, đa tiền tệ                                                       | Không cần cho thị trường mục tiêu                                                                                                                                                   |
| ---                                                                           | ---                                                                                                                                                                                 |
| Tự huấn luyện mô hình AI                                                      | Chỉ gọi API sẵn, đúng ràng buộc đề tài                                                                                                                                              |
| ---                                                                           | ---                                                                                                                                                                                 |
| Nhiều máy in theo trạm (in phiếu cho quầy pha chế, in tem dán ly)             | Mỗi quầy một máy in bill; pha chế xem món trên tablet, không cần phiếu giấy                                                                                                         |
| ---                                                                           | ---                                                                                                                                                                                 |
| Lịch chiếu áp phích theo giờ, theo ngày; áp phích riêng theo chi nhánh; video | Áp phích là ảnh tĩnh dùng chung toàn chuỗi, xoay vòng đều; lên lịch và nhắm theo chi nhánh là bài toán quảng cáo riêng                                                              |
| ---                                                                           | ---                                                                                                                                                                                 |
| Màn hình TV menu ở quầy thu ngân và quầy pha chế                              | Dự kiến, làm nếu còn thời gian (mục 21); không cam kết                                                                                                                              |
| ---                                                                           | ---                                                                                                                                                                                 |
| Điều khiển máy rung từ hệ thống (bấm Xong là máy rung)                        | Mỗi hãng máy rung một chuẩn bộ phát riêng; hệ thống chỉ lưu và hiển thị số máy rung (mục 23)                                                                                        |
| ---                                                                           | ---                                                                                                                                                                                 |
| Quên mật khẩu tự phục vụ qua email                                            | Cấp trên đặt lại và hệ thống gửi mật khẩu tạm mới (mục 22); giữ đúng chuỗi cấp tài khoản                                                                                            |
| ---                                                                           | ---                                                                                                                                                                                 |
| Nhập menu từ chữ viết tay, menu nhiều ngôn ngữ; nhận dạng ảnh món ăn          | OCR chỉ cam kết menu in tiếng Việt; ảnh món vẫn tải ở OW-02 (mục 24)                                                                                                                |
| ---                                                                           | ---                                                                                                                                                                                 |
| Giảm giá tự động theo tổ hợp món, combo lồng combo, combo theo khung giờ      | Combo là mục bán do Brand Manager tạo sẵn với giá cố định (mục 26)                                                                                                                  |
| ---                                                                           | ---                                                                                                                                                                                 |
| Giá riêng theo chi nhánh cho tuỳ chọn, topping, phụ thu biến thể              | Chỉ món và combo có giá chi nhánh, để bảng giá còn đơn giản (mục 29)                                                                                                                |
| ---                                                                           | ---                                                                                                                                                                                 |
| Lên lịch đổi giá theo ngày giờ, giá giờ vàng                                  | Giá chi nhánh áp ngay khi lưu; lên lịch là bài toán khuyến mãi                                                                                                                      |
| ---                                                                           | ---                                                                                                                                                                                 |
| Phân công khách hàng cho từng Platform Staff                                  | Mọi Platform Staff thấy chung hàng đợi; quy mô nền tảng của đồ án chưa cần                                                                                                          |
| ---                                                                           | ---                                                                                                                                                                                 |
| Sổ sách kế toán, xuất hoá đơn cho doanh thu nền tảng                          | Báo cáo doanh thu nền tảng chỉ để theo dõi kinh doanh (GĐ-27)                                                                                                                       |
| ---                                                                           | ---                                                                                                                                                                                 |

## 17. Giả định và giới hạn đã biết

Mục này để trả lời phản biện. Chủ động nêu ra luôn được đánh giá cao hơn là bị phát hiện.

**GĐ-01 — Chỉ hợp với loại hình gọi tại quầy.** Nhà hàng phục vụ tại bàn và trả sau không phải khách hàng mục tiêu. Đây là lựa chọn phạm vi, không phải thiếu sót.

**GĐ-02 — Chủ chuỗi phải tự mở kênh PayOS.** Nền tảng không mở tài khoản thay; chưa liên kết thì chỉ thu tiền mặt.

**GĐ-03 — Phụ thuộc PayOS.** PayOS lỗi hoặc chậm thì QR chậm theo; dự phòng bằng Kiểm tra lại, xác nhận thủ công và tiền mặt.

**GĐ-04 — Xác nhận thủ công có rủi ro ảnh chụp màn hình giả.** Giới hạn ở Store Manager, bắt buộc lý do và ghi audit log để truy vết, nhưng không loại bỏ được rủi ro hoàn toàn.

**GĐ-05 — Hoàn tiền chỉ bằng tiền mặt tại quầy.** Khách đã trả QR cũng nhận lại tiền mặt; khách muốn nhận chuyển khoản thì quán tự thoả thuận ngoài hệ thống. Két phải có đủ tiền để hoàn; hệ thống ghi khoản hoàn để đối chiếu két, không chuyển tiền (mục 28).

**GĐ-06 — Thời gian pha không được mô hình hoá.** Gom món cố ý không dùng thời gian pha vì không đo được (8.1).

**GĐ-07 — Bỏ ở bản 10.** Giới hạn của trợ lý số liệu không còn vì tính năng đã bỏ; giới hạn của AI nhập menu ở GĐ-18.

**GĐ-08 — Mất internet là ngừng bán.** Rủi ro cố hữu của POS đám mây, không xử lý trong phạm vi đồ án.

**GĐ-09 — Không xuất hoá đơn điện tử theo quy định thuế.** Đã biết và cố ý loại trừ.

**GĐ-10 — Bán hàng và ký hợp đồng (nếu có) diễn ra ngoài hệ thống; phí thuê bao thu trong hệ thống.** Chủ quán trả tháng đầu và gia hạn bằng QR PayOS của nền tảng (mục 25). Gia hạn thủ công của Admin chỉ còn cho trường hợp ngoại lệ.

**GĐ-11 — Tuỳ biến nhận diện là white-label mức nhẹ.** Đổi được logo, màu, tên hiển thị. Không đổi được tên miền, phông chữ, bố cục, nhãn chức năng.

**GĐ-12 — Màu do khách hàng chọn có thể xấu.** Hệ thống bảo đảm đọc được, không bảo đảm đẹp.

**GĐ-13** — Hạn mức gói theo bảng 13.1 (bản 12); giá là giá dự kiến để nhóm bàn. Hạn mức và giá là cấu hình của Admin (PA-04) nên đổi được mà không sửa mã.

**GĐ-14 — Mỗi quầy cần hai tablet Android.** Thiếu máy thứ hai thì POS vẫn chạy; QR hiện trên màn hình POS và thu ngân xoay màn hình cho khách quét.

**GĐ-15 — Máy in phải hỗ trợ ESC/POS qua Bluetooth.** Bản hiện tại in qua Bluetooth Classic từ tablet Android, khổ 58 mm; máy in WiFi/LAN chưa hỗ trợ (CC-11). Máy in nhãn dùng app riêng của hãng không dùng được. In dạng ảnh chậm hơn in chữ vài giây mỗi tờ, đổi lại in đúng tiếng Việt và logo trên mọi máy; không dựng được ảnh thì in chữ không dấu.

**GĐ-16 — Áp phích dùng chung toàn chuỗi và xoay vòng đều.** Không lên lịch theo giờ, không có áp phích riêng cho chi nhánh, không video. Chủ chuỗi muốn khuyến mãi riêng một chi nhánh thì phải dùng áp phích chung.

**GĐ-17 — Màn hình TV menu là phần dự kiến.** Không nằm trong 43 use case cam kết; chỉ làm khi phần cam kết đã xong và qua kiểm thử (mục 21).

**GĐ-18 — OCR và AI đọc menu không đạt 100%.** Ảnh mờ, chữ viết tay, bố cục lạ sẽ sai; vì vậy kết quả luôn là bản nháp và Brand Manager phải duyệt trước khi nhập. Tỷ lệ đúng được đo và công bố (24.8).

**GĐ-19 — Hệ thống không điều khiển máy rung.** Chỉ lưu số máy rung trong đơn, gửi kèm đơn xuống pha chế và nhắc báo; pha chế bấm bộ phát bằng tay, dấu Đã báo do pha chế tự chạm, quán tự quản máy (mục 23).

**GĐ-20 — Mật khẩu tạm đi qua email.** Ai đọc được hộp thư trong 72 giờ thì đăng nhập được; giảm rủi ro bằng hạn ngắn và bắt đổi ở lần đăng nhập đầu. Nhân viên phải có email dùng được; không có quên mật khẩu tự phục vụ.

**GĐ-21 — Gia hạn phụ thuộc Brand Manager chủ động quét QR.** Không có trừ tiền tự động; Brand Manager bỏ qua email nhắc thì doanh nghiệp chuyển chỉ đọc đúng ngày hết hạn. Giảm rủi ro bằng ba lần nhắc qua email và dải nhắc trên web của Brand Manager.

**GĐ-22 — Phí thuê bao cũng phụ thuộc PayOS.** PayOS lỗi lúc gần hết hạn thì Admin gia hạn thủ công kèm lý do. Kênh PayOS của nền tảng do nhóm mở và xác thực, kiểm tra cùng lúc với môi trường thử nghiệm ở 11.6.

**GĐ-23 — Dùng thử chống lạm dụng bằng mã số thuế.** Người dùng mã số thuế khác vẫn dùng thử lại được; hệ thống không xác minh mã số thuế với cơ quan thuế, Platform Staff đối chiếu khi duyệt (hồ sơ trùng mã số thuế đã có cảnh báo ở 6.10).

**GĐ-24 — Thu ngân có quyền hoàn tiền trong ngày.** Có rủi ro thu ngân hoàn khống để lấy tiền két; giảm bằng lý do bắt buộc, phiếu hoàn, thông báo cho Store Manager và báo cáo tiền hoàn theo từng thu ngân, nhưng không chặn được hẳn nếu không ai kiểm.

**GĐ-25 — Combo không phân bổ doanh thu về từng món.** Báo cáo món bán chạy đếm cả ly trong combo, nhưng doanh thu ghi cho combo; không tính được doanh thu chính xác của từng món nằm trong combo.

**GĐ-26 — Giá theo chi nhánh làm báo cáo so sánh khó đọc hơn.** Hai chi nhánh bán cùng số ly có thể khác doanh thu vì giá khác; báo cáo ghi chú chi nhánh đang có giá riêng, không quy đổi về giá chuỗi.

**GĐ-27 — Doanh thu nền tảng không phải sổ sách kế toán.** Báo cáo dựa trên hoá đơn thuê bao trong hệ thống; khoản thu ngoài hệ thống khi Platform Admin gia hạn thủ công không có số tiền nên không vào báo cáo.

## 18. Yêu cầu phi chức năng

Các chỉ tiêu dưới đây là mục tiêu cho môi trường demo: máy chủ ở Singapore hoặc Việt Nam, mạng 4G hoặc Wi‑Fi bình thường. Tất cả được đo ở tuần 10 (tài liệu Kế hoạch, mục 2) và đưa kết quả vào tài liệu bảo vệ.

| Yêu cầu                                                                                      | Nhóm               | Chỉ tiêu                                                                                                                            |
| -------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Chốt đơn tiền mặt, từ lúc bấm Xác nhận tới khi POS báo thành công                            | Hiệu năng          | ≤ 1 giây                                                                                                                            |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Từ lúc webhook PayOS tới backend tới khi POS và màn hình khách báo Đã nhận                   | Hiệu năng          | ≤ 3 giây                                                                                                                            |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Giỏ trên POS hiện lên màn hình phía khách                                                    | Hiệu năng          | ≤ 300 ms                                                                                                                            |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Đơn đã thanh toán lên màn hình pha chế; số gọi lên màn hình gọi số khi đơn xong              | Hiệu năng          | ≤ 2 giây                                                                                                                            |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| In xong bill và phiếu số sau khi thanh toán                                                  | Hiệu năng          | ≤ 5 giây                                                                                                                            |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Mỗi quầy một đơn mỗi 30 giây giờ cao điểm                                                    | Tải                | Mô phỏng 10 chi nhánh × 2 quầy chạy cùng lúc 15 phút: không lỗi, vẫn đạt các chỉ tiêu hiệu năng                                     |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Từ lúc tải ảnh menu tới khi có bản nháp                                                      | Nhập menu bằng ảnh | ≤ 60 giây cho 1 ảnh, ≤ 3 phút cho 5 ảnh; tỷ lệ món đúng tên, đúng giá đo và công bố trên bộ 10 ảnh mẫu (24.8)                       |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Cô lập dữ liệu giữa doanh nghiệp                                                             | Bảo mật            | 100% ca truy cập chéo bị chặn, qua API và Socket.IO                                                                                 |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Khoá PayOS                                                                                   | Bảo mật            | Mã hoá AES-256-GCM khi lưu; không xuất hiện trong phản hồi API và log (BR-25)                                                       |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Mật khẩu, phiên và thiết bị                                                                  | Bảo mật            | Mật khẩu băm bcrypt; token đăng nhập có hạn; token thiết bị thu hồi được (BR-45)                                                    |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Mật khẩu tạm                                                                                 | Bảo mật            | Sinh bằng bộ sinh ngẫu nhiên an toàn, 12 ký tự; chỉ lưu bản băm; hết hạn sau 72 giờ; email tới hộp thư trong ≤ 1 phút (mục 22)      |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Thanh toán đồng thời                                                                         | Tin cậy            | Webhook trùng hoặc tới cùng lúc với xác nhận thủ công không cấp hai số gọi, không ghi tiền hai lần (test ở 11.8)                    |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Màn hình khách hoặc máy in mất kết nối                                                       | Tin cậy            | Không chặn bán hàng (BR-21, BR-47); tự kết nối lại trong ≤ 10 giây khi có mạng                                                      |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Thao tác thu ngân                                                                            | Dễ dùng            | Đơn một món dùng tuỳ chọn mặc định, trả tiền mặt vừa đủ: ≤ 6 lần chạm từ chọn món tới in bill                                       |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Giao diện pha chế                                                                            | Dễ dùng            | Chữ ≥ 20px, nút cao ≥ 60px, không hộp thoại xác nhận (4.7)                                                                          |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Thiết bị                                                                                     | Tương thích        | App: Android 10 trở lên. Web: Chrome, Edge bản mới. Màn hình gọi số: trình duyệt trên TV hoặc tablet                                |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Từ lúc webhook thuê bao tới backend tới khi trang thanh toán báo đã gia hạn                  | Hiệu năng          | ≤ 3 giây                                                                                                                            |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Email nhắc hạn                                                                               | Tin cậy            | Job hằng ngày gửi đúng mốc (BR-69), chạy lại không gửi trùng; email tới hộp thư trong ≤ 5 phút sau khi job chạy                     |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Link kích hoạt                                                                               | Bảo mật            | Mã ngẫu nhiên ≥ 128 bit, chỉ lưu bản băm, hết hạn 7 ngày, dùng một lần (BR-67)                                                      |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Khoá PayOS của nền tảng                                                                      | Bảo mật            | Chỉ nằm trong biến môi trường máy chủ; không có trong cơ sở dữ liệu, phản hồi API và log (BR-66)                                    |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Hoàn tiền mặt, từ lúc bấm Xác nhận đã hoàn tới khi POS báo xong và dòng rời hàng đợi pha chế | Hiệu năng          | ≤ 2 giây                                                                                                                            |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Brand Manager lưu giá chi nhánh tới khi POS đang mở của chi nhánh dùng giá mới               | Hiệu năng          | ≤ 5 giây; POS mở sau đó luôn tải giá mới                                                                                            |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Báo cáo doanh thu nền tảng                                                                   | Hiệu năng          | ≤ 3 giây cho khoảng 12 tháng                                                                                                        |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Bán combo                                                                                    | Dễ dùng            | Combo 2 thành phần dùng biến thể và tuỳ chọn mặc định: ≤ 3 lần chạm từ chọn combo tới thêm vào giỏ                                  |
| ---                                                                                          | ---                | ---                                                                                                                                 |
| Tiền mặt của két                                                                             | Tin cậy            | Tiền mặt thuần trên báo cáo bằng tiền mặt đã thu trừ tiền mặt đã hoàn, khớp từng đồng với tổng các đơn và khoản hoàn (test tự động) |
| ---                                                                                          | ---                | ---                                                                                                                                 |

## 19. In bill và phiếu số

### 19.1. Ý tưởng một câu

Máy in nhiệt giá rẻ thường không in được tiếng Việt có dấu. Vì vậy POS không gửi chữ xuống máy in mà tự dựng bill thành ảnh rồi in ảnh — bill nào cũng đúng dấu, có logo và mã QR, trên mọi máy in nhận lệnh ESC/POS.

### 19.2. Luồng in

```
[Thu ngân]  Thu tiền mặt hoặc QR thành công — đơn Đã thanh toán
               ↓
[POS]       GET /cashier/orders/{mã đơn}/receipt
            → dữ liệu bill theo giá lúc bán (BR-53)
               ↓
[POS]       Dựng hai tờ ngoài màn hình: Bill, Phiếu số
            → chụp PNG, thu về 384 điểm ngang, đổi đen trắng
               ↓
[POS]       Gửi lệnh ESC/POS (in ảnh, đẩy giấy, cắt) qua Bluetooth
               ├─ Dựng ảnh lỗi → in chữ không dấu
               ├─ Máy in lỗi → báo In thất bại + nút In lại
               │    (thanh toán và hàng đợi pha chế không bị ảnh hưởng)
               ↓
[Khách]     Nhận bill + phiếu số có số gọi và QR theo dõi đơn
```

### 19.3. Nội dung hai tờ

| **Tờ**          | **Nội dung, từ trên xuống**                                                                                                                                                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bill            | Logo; tên chuỗi, tên chi nhánh, địa chỉ, điện thoại; chữ HÓA ĐƠN; mã đơn, thời gian thanh toán, thu ngân; từng món: số lượng × tên và thành tiền, tuỳ chọn, topping kèm số phần và ghi chú in bên dưới; combo in tên và giá combo, các món thành phần thụt vào bên dưới; TỔNG; hình thức thanh toán; tiền khách đưa và tiền thừa (tiền mặt); lời cảm ơn |
| ---             | ---                                                                                                                                                                                                                                                                                                                                                     |
| Phiếu số        | Tên chi nhánh, mã đơn; chữ SỐ GỌI và số gọi 3 chữ số cỡ lớn; "Vui lòng chờ gọi số để nhận món"; mã QR theo dõi đơn kèm dòng "Quét mã để theo dõi đơn"                                                                                                                                                                                                   |
| ---             | ---                                                                                                                                                                                                                                                                                                                                                     |
| Phiếu hoàn tiền | Tên chi nhánh; chữ PHIẾU HOÀN TIỀN; mã đơn, số gọi, giờ thanh toán, hình thức khách đã trả; từng dòng được hoàn và số tiền; TỔNG HOÀN (tiền mặt); lý do; người hoàn, thời điểm; dòng ký nhận của khách                                                                                                                                                  |
| ---             | ---                                                                                                                                                                                                                                                                                                                                                     |
| Phiếu in thử    | Khung rộng đúng 384 điểm để kiểm tra đầu in có đủ rộng, kèm chữ tiếng Việt có dấu ở các độ đậm                                                                                                                                                                                                                                                          |
| ---             | ---                                                                                                                                                                                                                                                                                                                                                     |

Hai tờ luôn in tách, có lệnh cắt sau mỗi tờ. Máy không có dao cắt thì thu ngân xé tay theo vạch cắt; bản 9.2 bỏ cách gộp một tờ của bản 9.0.

### 19.4. Chọn máy in

- Máy in được ghép đôi Bluetooth trong phần Cài đặt của Android trước
- Trên POS: Tài khoản › Máy in hóa đơn → chọn máy trong danh sách đã ghép đôi → chọn chế độ in → In thử. Lựa chọn lưu trên chính tablet đó
- Thứ tự ưu tiên khi in: máy chọn trên tablet → máy in Bluetooth Store Manager khai báo cho quầy (11.10) → chưa có thì báo Chưa chọn máy in, không chặn thanh toán

### 19.5. Hai chế độ in

| **Chế độ**     | **Cách làm**                                                                                                                                                                                           | **Khi nào dùng**                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Ảnh (mặc định) | Dựng bill bằng giao diện của app, chụp ảnh ở độ phân giải gấp đôi rồi thu nhỏ để chữ mịn, đổi sang đen trắng theo ngưỡng, gửi lệnh in ảnh thành từng gói 1 KB có nghỉ giữa các gói để máy in kịp xử lý | Mọi trường hợp; đúng tiếng Việt, có logo và mã QR               |
| ---            | ---                                                                                                                                                                                                    | ---                                                             |
| Chữ không dấu  | Gửi lệnh ESC/POS dạng chữ, 32 ký tự mỗi dòng, bỏ dấu tiếng Việt; phiếu số vẫn in số gọi cỡ lớn và mã QR bằng lệnh của máy in                                                                           | Máy in quá chậm khi in ảnh; POS tự chuyển sang khi dựng ảnh lỗi |
| ---            | ---                                                                                                                                                                                                    | ---                                                             |

### 19.6. In lại và ghi nhận

- In lại từ lịch sử đơn trong ngày (CS-05), bắt buộc lý do tối thiểu 3 ký tự
- POS gọi POST /cashier/orders/{mã đơn}/reprint kèm lý do → backend ghi một dòng print_jobs cho bill và một cho phiếu số (đơn, chi nhánh, loại tờ, người in, là in lại, lý do) rồi trả dữ liệu bill → POS in
- Màn hình chi tiết đơn hiện số lần đã in lại trong phiên

### 19.7. Cách triển khai

- Bluetooth: thư viện react-native-bluetooth-classic, chỉ chạy trên Android; Android 12 trở lên phải xin quyền BLUETOOTH_CONNECT. Kết nối cũ có thể đã chết nên lỗi lần đầu thì ngắt và kết nối lại một lần
- Dựng ảnh: react-native-view-shot chụp phần giao diện vẽ ngoài màn hình; upng-js giải mã PNG để đổi thành ảnh một bit cho lệnh in ảnh ESC/POS
- Vì cần module native, app POS phải chạy bằng bản development build hoặc bản build EAS, không chạy được tính năng in trên Expo Go
- Backend: GET /cashier/orders/{mã đơn}/receipt trả dữ liệu bill; POST /cashier/orders/{mã đơn}/reprint ghi lượt in lại. Bảng print_jobs và cấu hình máy in của quầy (pos_stations) đã có trong cơ sở dữ liệu

### 19.8. Giới hạn đã biết

- Chỉ in qua Bluetooth Classic từ tablet Android; máy in WiFi/LAN chưa làm dù quầy đã có trường cấu hình (CC-11)
- Chỉ khổ 58 mm (384 điểm ngang); máy in 80 mm vẫn in được nhưng bill chỉ rộng bằng khổ 58 mm
- Logo trên bill hiện là logo cố định trong app; lấy logo của chuỗi từ bộ nhận diện (10.2) là việc còn lại
- Lần in đầu ngay sau thanh toán chưa được ghi vào print_jobs; mới ghi các lượt in lại
- In ảnh chậm hơn in chữ vài giây mỗi tờ

## 20. Áp phích màn hình phía khách

### 20.1. Ý tưởng một câu

Màn hình phía khách quay thẳng vào khách đang đứng ở quầy — chỗ quảng cáo tốt nhất của quán. Brand Manager tải áp phích món mới, khuyến mãi một lần trên web; màn hình phía khách của mọi chi nhánh trong chuỗi đổi theo.

### 20.2. Brand Manager quản lý những gì (OW-11)

| **Thao tác** | **Quy tắc**                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| Thêm         | PNG, JPG hoặc WebP, tối đa 5 MB; tối đa 6 áp phích; thêm vào cuối danh sách; chọn tệp là tải lên ngay |
| ---          | ---                                                                                                   |
| Đổi ảnh      | Giữ nguyên vị trí, tên và trạng thái bật/tắt; xoá tệp cũ                                              |
| ---          | ---                                                                                                   |
| Đặt tên      | Không bắt buộc, tối đa 50 ký tự; chỉ để Brand Manager phân biệt, không hiện cho khách                 |
| ---          | ---                                                                                                   |
| Bật/tắt      | Tắt là tạm ẩn khỏi vòng xoay, giữ lại để bật sau                                                      |
| ---          | ---                                                                                                   |
| Đổi thứ tự   | Lên/xuống; quyết định thứ tự xoay vòng                                                                |
| ---          | ---                                                                                                   |
| Xoá          | Có hộp thoại xác nhận; xoá bản ghi và tệp, không khôi phục                                            |
| ---          | ---                                                                                                   |
| Xem trước    | Khung 16:9 cạnh danh sách, xoay đúng nhịp 8 giây như màn hình thật                                    |
| ---          | ---                                                                                                   |

Khuyến nghị ảnh ngang tỉ lệ 16:9 để lấp đầy màn hình. Tính năng không khoá theo gói — gói nào cũng dùng (13.1).

### 20.3. Hiển thị trên màn hình phía khách

| **Màn hình phía khách đang ở**                   | **Áp phích**                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| Chờ — chưa có khách                              | Toàn màn hình; dải dưới có logo, lời chào, tên chi nhánh và quầy, đồng hồ |
| ---                                              | ---                                                                       |
| Giỏ đang có món                                  | Nửa trái (khoảng 56%); giỏ và tổng tiền ở bên phải                        |
| ---                                              | ---                                                                       |
| QR thanh toán, thanh toán thành công, QR hết hạn | Không hiện — dành chỗ cho thông tin thanh toán (BR-52)                    |
| ---                                              | ---                                                                       |

- Xoay vòng 8 giây mỗi ảnh, chuyển cảnh mờ dần
- Ảnh hiện nguyên khổ, không cắt chữ trên áp phích; phần trống lấp bằng chính ảnh đó làm mờ
- Chỉ có một áp phích thì ảnh phóng to rất chậm để màn hình không đứng hình
- Không có áp phích đang bật thì dùng ảnh mặc định của nền tảng

### 20.4. Cách triển khai

- Bảng posters: doanh nghiệp, đường dẫn ảnh, tên, cờ bật, thứ tự, thời điểm cập nhật, người cập nhật. Ảnh lưu ở dịch vụ lưu trữ tệp như logo; backend nên thu ảnh về tối đa 1920 điểm ngang khi lưu để tablet tải nhanh
- API chỉ nhận vai trò Brand Manager, chỉ ghi vào doanh nghiệp của người gọi (BR-01, BR-51):

```
GET    /restaurant-chains/{mã chuỗi}/posters
POST   /restaurant-chains/{mã chuỗi}/posters              (multipart: file, title?)
POST   /restaurant-chains/{mã chuỗi}/posters/{id}/image   (multipart: file)
PATCH  /restaurant-chains/{mã chuỗi}/posters/{id}         ({ title?, enabled? })
PUT    /restaurant-chains/{mã chuỗi}/posters/order        ({ ids: [...] })
DELETE /restaurant-chains/{mã chuỗi}/posters/{id}
```

- Màn hình phía khách lấy áp phích từ GET /public/customer-display/context bằng token thiết bị: thêm trường posters gồm id và đường dẫn ảnh tuyệt đối, chỉ áp phích đang bật, đã sắp theo thứ tự
- Khi Brand Manager đổi áp phích, server phát display.update tới room của mọi quầy thuộc doanh nghiệp; màn hình đang mở nạp lại ngữ cảnh (11.11)

### 20.5. Giới hạn đã biết

- Áp phích dùng chung toàn chuỗi, không chọn theo chi nhánh hay quầy (GĐ-16)
- Không lên lịch theo giờ hay theo ngày, không video
- Ảnh dọc hoặc vuông sẽ có khoảng nền mờ hai bên
- Màn hình phía khách cần mạng để tải áp phích mới

## 21. Màn hình TV hiển thị áp phích và menu — dự kiến

Phần này là **dự kiến, làm nếu còn thời gian** sau khi 43 use case cam kết đã xong và qua kiểm thử. Không ghi vào SRS như lời hứa; nếu không kịp thì trình bày ở phần hướng phát triển khi bảo vệ.

### 21.1. Ý tưởng một câu

Nhiều quán treo TV phía trên quầy thu ngân và quầy pha chế để hiện menu và khuyến mãi thay cho bảng menu in. Bảng in phải in lại mỗi lần đổi giá và không biết món nào đang hết. TV menu lấy thẳng menu và áp phích từ hệ thống: Brand Manager đổi giá, món vừa hết, áp phích mới — TV đổi theo ngay.

### 21.2. Nội dung

| **Vị trí TV**                  | **Hiển thị**                                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Phía trên quầy thu ngân        | Menu đang bán của chi nhánh: danh mục, tên, ảnh, giá theo chi nhánh, giá theo size, combo đang bán; xen áp phích của chuỗi |
| ---                            | ---                                                                                                                        |
| Quầy pha chế hoặc khu nhận món | Áp phích của chuỗi và các món nổi bật cho khách đang chờ nhận món. Không thay màn hình gọi số (11.10)                      |
| ---                            | ---                                                                                                                        |

Store Manager chọn chế độ cho từng TV khi ghép: Menu + áp phích, hoặc Chỉ áp phích.

### 21.3. Quy tắc dự kiến

- Menu hiển thị theo đúng BR-12: chỉ món được bán ở chi nhánh; món hoặc tuỳ chọn báo hết (BA-03, BM-02) hiện nhãn Hết món hoặc ẩn đi, cập nhật qua Socket.IO
- Giá là giá hiệu lực của chi nhánh (BR-84); TV không có giá riêng của TV
- Áp phích dùng chung danh sách của OW-11 (BR-51); không có áp phích riêng cho TV
- Chỉ hiển thị: không cảm ứng, không đặt món, không hiện giỏ hay thông tin thanh toán
- Mang nhận diện của chuỗi (logo, màu); tên món và giá dùng màu tương phản cao cố định để đọc được từ xa
- Bố cục cố định do nhóm thiết kế cho TV ngang 16:9; Brand Manager không tự kéo thả bố cục, giữ đúng tinh thần 10.2

### 21.4. Thiết bị và ghép

- TV chạy trang web trên trình duyệt có sẵn của TV hoặc một hộp Android TV, giống màn hình gọi số
- Ghép bằng mã OTP 6 số theo đúng cơ chế 11.10 và BR-45; Store Manager nhập mã và chọn chế độ; token gắn với chi nhánh, chỉ đọc, thu hồi được
- Thêm một loại thiết bị mới vào display_devices; một chi nhánh ghép được nhiều TV; không tính vào hạn mức tài khoản của gói
- Không phát sinh use case mới: nội dung lấy từ OW-02, OW-04, OW-11, BM-02, BA-03; ghép TV là cấu hình thiết bị (14.3, 14.4)

### 21.5. Điều kiện bắt đầu

- Phần cam kết, đặc biệt OW-11 ở backend, đã xong và qua kiểm thử
- Có API công khai đọc menu của chi nhánh bằng token thiết bị, và sự kiện Socket.IO khi menu hoặc trạng thái còn bán thay đổi

### 21.6. Giới hạn đã biết

- Không có menu theo khung giờ (sáng, chiều), không video
- TV đời cũ có trình duyệt yếu có thể giật khi chuyển ảnh
- Menu nhiều món phải chia trang và tự lật trang; khách có thể phải chờ trang có món mình cần

## 22. Cấp tài khoản và mật khẩu tạm

### 22.1. Ý tưởng một câu

Cấp trên không tự đặt mật khẩu cho cấp dưới. Khi cấp hoặc đặt lại tài khoản, hệ thống tự sinh một mật khẩu tạm và gửi email gồm email đăng nhập và mật khẩu đó cho cấp dưới; lần đầu đăng nhập, cấp dưới phải tự đặt mật khẩu riêng thì mới dùng tiếp được.

### 22.2. Ai cấp cho ai

| **Cấp trên**   | **Cấp và đặt lại mật khẩu cho**                                                                 | **Use case** |
| -------------- | ----------------------------------------------------------------------------------------------- | ------------ |
| Platform Admin | Platform Staff — cấp khi nhận người; đặt lại khi quên                                           | PA-07        |
| ---            | ---                                                                                             | ---          |
| Platform Admin | Brand Manager — sinh khi chủ quán kích hoạt dịch vụ (GU-02); đặt lại khi Brand Manager báo quên | GU-02, PA-05 |
| ---            | ---                                                                                             | ---          |
| Brand Manager  | Store Manager trong chuỗi                                                                       | OW-05        |
| ---            | ---                                                                                             | ---          |
| Store Manager  | Cashier, Barista của chi nhánh mình                                                             | BM-01        |
| ---            | ---                                                                                             | ---          |

Không có nút quên mật khẩu tự phục vụ. Ai quên mật khẩu thì báo cấp trên trực tiếp (BR-56). Tài khoản Platform Admin là của nền tảng, tạo bằng cấu hình triển khai, không nằm trong chuỗi này.

### 22.3. Luồng cấp tài khoản

```
[Cấp trên]   Nhập họ tên, email, vai trò (và chi nhánh) → Tạo
                 ↓
[Hệ thống]   Kiểm hạn mức gói, email chưa dùng
             → sinh mật khẩu tạm 12 ký tự, chỉ lưu bản băm
             → tài khoản ở trạng thái Chờ đổi mật khẩu
             → gửi email: tên chuỗi, vai trò, email đăng nhập,
               mật khẩu tạm, hạn dùng, nơi đăng nhập
                 ├─ Gửi lỗi → tài khoản vẫn được tạo, nhãn
                 │    Chưa gửi được email; cấp trên bấm Gửi lại
                 ↓
[Cấp dưới]   Đăng nhập bằng email + mật khẩu tạm
                 ↓
[Hệ thống]   Mật khẩu tạm còn hạn → chỉ mở màn hình Đổi mật khẩu
                 ├─ Quá 72 giờ → báo hết hạn, liên hệ cấp trên
                 ↓
[Cấp dưới]   Nhập mật khẩu mới hai lần → Lưu
                 ↓
[Hệ thống]   Kiểm quy tắc mật khẩu (22.6) → lưu bản băm,
             huỷ mật khẩu tạm → Hoạt động
             → vào màn hình chính theo vai trò
```

### 22.4. Đặt lại mật khẩu

1. Cấp dưới báo cấp trên trực tiếp (ngoài hệ thống: gọi điện, nhắn tin)
2. Cấp trên mở danh sách tài khoản, chọn Đặt lại mật khẩu, xác nhận
3. Hệ thống sinh mật khẩu tạm mới, vô hiệu mật khẩu cũ, đăng xuất mọi phiên đang mở của tài khoản đó, chuyển tài khoản sang Chờ đổi mật khẩu, gửi email như lúc cấp mới, ghi audit log
4. Cấp dưới đăng nhập bằng mật khẩu tạm và đổi mật khẩu như lần đăng nhập đầu

Gửi lại email (cấp dưới không nhận được, hoặc mật khẩu tạm đã hết hạn) cũng sinh mật khẩu tạm mới, vì hệ thống không giữ bản rõ để gửi lại bản cũ.

### 22.5. Nội dung email

| **Mục**    | **Nội dung**                                                                                                                                                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tiêu đề    | "\[Tên chuỗi\] Tài khoản Smart F&B của bạn" khi cấp mới; "\[Tên chuỗi\] Mật khẩu tạm mới" khi đặt lại hoặc gửi lại                                                                                                                                                                 |
| ---        | ---                                                                                                                                                                                                                                                                                |
| Người nhận | Email của tài khoản được cấp; không gửi bản sao cho cấp trên                                                                                                                                                                                                                       |
| ---        | ---                                                                                                                                                                                                                                                                                |
| Thân thư   | Lời chào theo họ tên; vai trò và chi nhánh; email đăng nhập; mật khẩu tạm; giờ hết hạn cụ thể; nơi đăng nhập — địa chỉ web với Brand Manager và Store Manager, app trên tablet với thu ngân và pha chế; nhắc phải đổi mật khẩu ở lần đăng nhập đầu; nhắc không chuyển tiếp thư này |
| ---        | ---                                                                                                                                                                                                                                                                                |
| Không có   | Đường dẫn đăng nhập kèm mã bí mật, mật khẩu cũ, thông tin của người khác                                                                                                                                                                                                           |
| ---        | ---                                                                                                                                                                                                                                                                                |

Email mang nhận diện của chuỗi (logo, tên hiển thị) khi gói có tính năng nhận diện; email cấp tài khoản Brand Manager luôn mang nhận diện nền tảng.

### 22.6. Quy tắc mật khẩu

- Mật khẩu tạm: 12 ký tự từ bộ sinh ngẫu nhiên an toàn, có chữ hoa, chữ thường và chữ số, bỏ các ký tự dễ nhầm (0 và O, 1, l và I); hết hạn sau 72 giờ; chỉ dùng để vào màn hình đổi mật khẩu
- Mật khẩu riêng: tối thiểu 8 ký tự, có cả chữ và số, khác mật khẩu tạm và khác email
- Chỉ lưu bản băm bcrypt. Giao diện của cấp trên không bao giờ hiện mật khẩu tạm, kể cả ngay sau khi tạo

### 22.7. Cách triển khai

- users thêm cột: cờ phải đổi mật khẩu, hạn của mật khẩu tạm, thời điểm đổi mật khẩu gần nhất, trạng thái gửi email (Đã gửi, Chưa gửi được), thời điểm gửi
- Một hàm cấp mật khẩu tạm dùng chung cho mọi chỗ: kích hoạt dịch vụ, Platform Admin tạo Platform Staff, Brand Manager tạo Store Manager, Store Manager tạo nhân viên, đặt lại, gửi lại
- Lớp kiểm tra quyền ở backend chặn mọi API (trừ đổi mật khẩu, đăng xuất, xem hồ sơ của mình) khi cờ phải đổi đang bật, trả mã lỗi PASSWORD_CHANGE_REQUIRED để web và app chuyển ngay sang màn hình đổi mật khẩu
- Đặt lại mật khẩu tăng số phiên bản phiên đăng nhập của tài khoản, làm mọi token cũ hết hiệu lực
- Gửi email qua hàng đợi, thử lại tối đa 3 lần; mật khẩu tạm không ghi vào log, không lưu bền trong hàng đợi

### 22.8. Giới hạn đã biết

- Mật khẩu tạm đi qua email dạng chữ: ai đọc được hộp thư trong 72 giờ thì đăng nhập được. Giảm rủi ro bằng hạn ngắn, bắt đổi ngay lần đầu và huỷ mật khẩu tạm sau khi đổi (GĐ-20)
- Mọi tài khoản phải có email dùng được; không có email thì không cấp được tài khoản
- Không có quên mật khẩu tự phục vụ: cấp trên vắng thì cấp dưới phải chờ; Brand Manager quên mật khẩu phải liên hệ nền tảng
- Không có đăng nhập hai lớp

## 23. Số máy rung

### 23.1. Ý tưởng một câu

Nhiều quán phát cho khách một máy rung sau khi trả tiền, thay vì bắt khách nhìn màn hình gọi số. Khách thanh toán xong, thu ngân nhập số in trên máy rung vào chính đơn đó; số máy rung đi kèm trong dữ liệu đơn gửi xuống pha chế. Pha chế làm xong món thì dựa vào số máy rung trong đơn để bấm đúng số trên bộ phát, máy của đúng khách rung.

### 23.2. Phạm vi

- **Không bắt buộc:** quán không dùng máy rung, hoặc khách không nhận máy, thì đơn chạy như cũ với số gọi và phiếu số
- **Bổ sung, không thay thế:** đơn có máy rung vẫn có số gọi, vẫn in phiếu số, vẫn lên màn hình gọi số (BR-59)
- **Hệ thống không điều khiển máy rung:** bộ phát là thiết bị riêng của quán, không nối với hệ thống; pha chế bấm số trên bộ phát

### 23.3. Luồng

```
[Cashier]  Thu tiền xong — đơn Đã thanh toán, có số gọi, đã in bill
               ↓
[Hệ thống] Đơn xuống hàng đợi pha chế ngay (chưa có số máy rung)
               ↓
[Cashier]  Đưa máy rung cho khách; trên màn hình thanh toán thành công
           nhập số in trên máy rung (bàn phím số) → Gán và gửi pha chế
               ├─ Số đang gắn với đơn khác chưa xong → POS báo đơn
               │    đang giữ; thu ngân chọn máy khác
               ├─ Bỏ qua → đơn không có máy rung, chạy như cũ
               ↓
[Hệ thống] Lưu số máy rung vào đơn → gửi cập nhật của đơn, kèm số
           máy rung, tới màn hình pha chế của chi nhánh (BR-64)
               ↓
[Barista]  Thấy số máy rung cạnh số gọi ở từng ly trong mẻ; pha như cũ
               ↓
[Hệ thống] Đơn đủ món → gọi số trên màn hình gọi số; màn hình pha chế
           phát âm báo, hiện "Báo máy rung số 12" lấy từ dữ liệu đơn
               ↓
[Barista]  Bấm số 12 trên bộ phát → máy của khách rung; chạm Đã báo
               ├─ Thu ngân đổi số sau đó → nhắc hiện lại với số mới
               ↓
[Khách]    Mang máy rung tới quầy, đổi lấy món
               ↓
[Barista]  Bấm Đã giao → đơn Hoàn tất, số máy rung được giải phóng
```

### 23.4. Thao tác của thu ngân (CS-06)

| **Thao tác**   | **Quy tắc**                                                                                                                                                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gán            | Ngay trên màn hình thanh toán thành công, hoặc mở đơn trong lịch sử đơn (CS-05); chỉ với đơn Đã thanh toán, Đang pha hoặc Sẵn sàng của chi nhánh mình. Đơn đã xuống pha chế từ lúc thanh toán, không chờ số máy rung; gán xong thì số đi kèm đơn tới màn hình pha chế |
| ---            | ---                                                                                                                                                                                                                                                                   |
| Đổi số         | Khi đưa nhầm máy hoặc máy hết pin; số cũ được giải phóng ngay                                                                                                                                                                                                         |
| ---            | ---                                                                                                                                                                                                                                                                   |
| Gỡ             | Khách trả máy trước khi nhận món, hoặc gán nhầm đơn                                                                                                                                                                                                                   |
| ---            | ---                                                                                                                                                                                                                                                                   |
| Không làm được | Gán cho đơn Chờ thanh toán, Hoàn tất hoặc Đã huỷ; gán một số cho hai đơn đang mở cùng lúc                                                                                                                                                                             |
| ---            | ---                                                                                                                                                                                                                                                                   |
| Cách nhập      | Ô Số máy rung nằm ngay dưới số gọi trên màn hình thanh toán thành công, bàn phím số cỡ lớn, nút Gán và gửi pha chế. Gán xong POS hiện "Đã gửi pha chế — máy rung số 12". Không dùng máy rung thì bấm Đơn mới như cũ                                                   |
| ---            | ---                                                                                                                                                                                                                                                                   |

Mọi lần gán, đổi, gỡ đều lưu người làm và thời điểm vào lịch sử của đơn. Không cần lý do, không cần Store Manager duyệt — đây là thao tác vận hành, không dính tới tiền.

### 23.5. Hiển thị

- Màn hình pha chế: số máy rung là một nhãn có biểu tượng máy rung, cỡ chữ bằng số gọi, đặt ngay cạnh số gọi của từng ly; đơn không có máy rung thì không có nhãn
- Khi đơn chuyển Sẵn sàng: màn hình pha chế phát âm báo, thẻ của đơn trong danh sách Sẵn sàng hiện "Báo máy rung số 12" nổi bật. Pha chế bấm số trên bộ phát rồi chạm Đã báo: nhắc chuyển thành "Đã báo máy rung số 12" màu nhạt, thẻ vẫn giữ tới khi bấm Đã giao
- Thu ngân gán hoặc đổi số khi đơn đã Sẵn sàng: nhắc hiện ngay trên thẻ kèm âm báo; đổi số khi đã báo thì nhắc hiện lại với số mới (BR-65)
- POS: lịch sử đơn (CS-05) và chi tiết đơn hiện số máy rung; Store Manager thấy trong tra cứu đơn (BM-04)
- Màn hình gọi số và màn hình phía khách không hiện số máy rung; bill và phiếu số in trước khi gán nên không có

### 23.6. Cách triển khai

- orders thêm cột số máy rung (số nguyên 1–999, có thể rỗng); ràng buộc duy nhất có điều kiện trên (chi nhánh, số máy rung) cho các đơn chưa Hoàn tất và chưa Đã huỷ; thêm hai cột đã báo máy rung lúc và người báo (rỗng khi chưa báo, xoá khi đổi số)
- order_pager_events — đơn, loại (gán, đổi, gỡ, đã báo), số cũ, số mới, người làm, thời điểm
- API: PUT /cashier/orders/{mã đơn}/pager ({ pagerNumber }) để gán hoặc đổi, DELETE cùng đường dẫn để gỡ; chỉ tài khoản thu ngân của đúng chi nhánh; phản hồi trả lại đơn kèm số máy rung để POS hiện xác nhận
- API pha chế: POST /barista/orders/{mã đơn}/pager-notified để đánh dấu Đã báo; chỉ tài khoản pha chế của đúng chi nhánh, chỉ đơn Sẵn sàng đang có số máy rung (BR-65)
- Dữ liệu đơn gửi pha chế mang số máy rung: GET /barista/queue và GET /barista/ready-orders trả pagerNumber và pagerNotifiedAt của từng đơn — mỗi ly trong mẻ mang số máy rung của đơn nó thuộc; sự kiện preparation.order.queued lúc thanh toán xong cũng có trường pagerNumber (thường rỗng vì thu ngân nhập sau)
- Gán, đổi, gỡ phát sự kiện preparation.order.pager-updated tới room của chi nhánh, kèm { orderId, callNumber, pagerNumber, previousPagerNumber, orderStatus }; màn hình pha chế cập nhật đúng đơn đó tại chỗ, không tải lại cả hàng đợi. Đánh dấu Đã báo phát preparation.order.pager-notified để các máy pha chế khác cùng chi nhánh cũng thấy
- Màn hình pha chế mất kết nối rồi vào lại: tải lại hàng đợi và danh sách Sẵn sàng, số máy rung lấy từ dữ liệu đơn mới nhất, không dựng từ sự kiện cũ (BR-64)
- Đơn sang Hoàn tất hoặc Đã huỷ (kể cả tự Hoàn tất sau 30 phút) thì số tự ra khỏi ràng buộc duy nhất, không cần xoá cột — vẫn giữ để tra cứu

### 23.7. Giới hạn đã biết

- Hệ thống không biết máy đã thật sự rung hay chưa, cũng không biết khách đã trả máy (GĐ-19)
- Quán tự quản số máy và tự bảo đảm số in trên máy khớp với số nhập; hệ thống không giữ danh sách máy của quán
- Khoảng số 1–999 cố định; máy đánh số kiểu khác (chữ cái, màu) thì quán quy đổi sang số
- Đơn quên bấm Đã giao tự Hoàn tất sau 30 phút và trả số; nếu khách vẫn giữ máy thì thu ngân gán lại

### 23.8. Tiêu chí nghiệm thu

Mỗi dòng là một ca kiểm thử thủ công hoặc tự động; tính năng chỉ coi là xong khi mọi dòng đạt.

| **Tình huống**                                                           | **Kết quả mong đợi**                                                                                       |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Thu tiền mặt xong, nhập số 12, bấm Gán và gửi pha chế                    | Trong 2 giây, các ly của đơn trên màn hình pha chế có nhãn máy rung 12 cạnh số gọi; POS báo đã gửi pha chế |
| ---                                                                      | ---                                                                                                        |
| Thanh toán QR, webhook về, rồi nhập số 7                                 | Đơn đã có trên hàng đợi từ lúc webhook về; nhập xong thì nhãn máy rung 7 hiện trên đúng đơn đó             |
| ---                                                                      | ---                                                                                                        |
| Nhập số 12 khi một đơn khác chưa xong đang giữ số 12                     | POS báo số gọi của đơn đang giữ, không gán (BR-58)                                                         |
| ---                                                                      | ---                                                                                                        |
| Pha chế bấm Xong ly cuối của đơn có số 12                                | Màn hình gọi số hiện số gọi; màn hình pha chế phát âm báo và hiện "Báo máy rung số 12"                     |
| ---                                                                      | ---                                                                                                        |
| Pha chế chạm Đã báo, sau đó thu ngân đổi 12 sang 15                      | Nhắc hiện lại với số 15, dấu Đã báo bị xoá; lịch sử đơn có dòng đổi số kèm người làm                       |
| ---                                                                      | ---                                                                                                        |
| Pha chế bấm Đã giao                                                      | Đơn Hoàn tất; số 12 gán được cho đơn khác ngay                                                             |
| ---                                                                      | ---                                                                                                        |
| Đơn không gán máy rung                                                   | Không có nhãn và nhắc máy rung; đơn đi đủ vòng đời như cũ (BR-59)                                          |
| ---                                                                      | ---                                                                                                        |
| Thu ngân hoặc pha chế chi nhánh khác gọi API gán số hoặc đánh dấu Đã báo | Backend từ chối, không phát sự kiện nào ra ngoài chi nhánh của đơn                                         |
| ---                                                                      | ---                                                                                                        |

## 24. Nhập menu bằng ảnh (OCR + AI)

### 24.1. Ý tưởng một câu

Chủ chuỗi thường đã có sẵn menu in hoặc bảng menu treo tường. Thay vì gõ tay từng món, Brand Manager chụp ảnh menu: OCR đọc chữ trong ảnh thành văn bản thô, AI sắp văn bản đó thành danh mục, món, giá và tuỳ chọn; Brand Manager xem lại, sửa rồi bấm Nhập — menu toàn chuỗi có ngay, mọi chi nhánh dùng được.

### 24.2. Vì sao làm lại phần đã cắt

Bản 8.0 cắt nhập menu bằng ảnh để thu hẹp phạm vi. Bản 10 làm lại với ba điều kiện để kết quả kiểm chứng được:

1. AI không bao giờ ghi thẳng vào menu; mọi kết quả là bản nháp chờ Brand Manager duyệt (BR-61)
2. Tách hai bước: OCR chỉ đọc chữ, AI chỉ sắp cấu trúc — sai thì biết sai ở bước nào
3. Đo độ chính xác trên bộ ảnh mẫu có đáp án (24.8)

### 24.3. Luồng

```
[Brand Manager] Menu toàn chuỗi → Nhập từ ảnh → chọn 1–5 ảnh menu
                    ↓
[Hệ thống]      Kiểm định dạng, dung lượng → lưu ảnh → Đang nhận dạng
                    ↓
[Dịch vụ OCR]   Đọc chữ từng ảnh → văn bản thô kèm vị trí từng dòng
                    ↓
[Dịch vụ AI]    Nhận văn bản thô + tên danh mục, món, nhóm tuỳ chọn
                đang có → trả bản nháp theo cấu trúc định sẵn
                    ↓
[Hệ thống]      Kiểm cấu trúc, chuẩn hoá giá về số nguyên đồng,
                đối chiếu menu đang có → Chờ duyệt
                    ├─ OCR không đọc được / AI sai cấu trúc → Lỗi,
                    │    báo lý do; Brand Manager chụp lại hoặc nhập tay
                    ↓
[Brand Manager] Xem bản nháp cạnh ảnh gốc: sửa tên, giá, danh mục,
                size, topping; bỏ dòng sai; chọn Tạo mới / Cập nhật giá /
                Bỏ qua cho món trùng; chọn chi nhánh được bán
                    ↓
[Brand Manager] Bấm Nhập vào menu
                    ↓
[Hệ thống]      Kiểm lại mọi dòng → ghi trong một transaction
                → audit log → Đã nhập; POS các chi nhánh có món mới
```

### 24.4. OCR và AI làm gì

| **Bước** | **Đầu vào**                                                     | **Đầu ra**                                                                                                                                                     |
| -------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OCR      | Ảnh menu                                                        | Văn bản thô theo từng dòng, kèm toạ độ và độ tin cậy. Không hiểu nghĩa                                                                                         |
| ---      | ---                                                             | ---                                                                                                                                                            |
| AI       | Văn bản thô; tên danh mục, món, nhóm tuỳ chọn hiện có của chuỗi | Bản nháp có cấu trúc: danh mục → món (tên, mô tả nếu có, giá theo từng size); nhóm tuỳ chọn và tuỳ chọn có giá cộng thêm; dòng không hiểu được kèm văn bản gốc |
| ---      | ---                                                             | ---                                                                                                                                                            |
| Backend  | Bản nháp của AI                                                 | Kiểm cấu trúc; đổi "25k", "25.000đ", "25" thành 25000; đánh dấu món trùng; tô dòng thiếu tên, thiếu giá hoặc độ tin cậy thấp                                   |
| ---      | ---                                                             | ---                                                                                                                                                            |

AI chỉ nhận chữ trên menu và tên các mục menu đang có; không nhận dữ liệu đơn, doanh thu hay tài khoản (BR-63).

### 24.5. Quy tắc sắp vào menu

- **Giá theo size:** món ghi nhiều giá (M 25k, L 30k) thành một món giá 25.000 và nhóm Size bắt buộc chọn 1: M (+0), L (+5.000). Dùng lại nhóm Size của chuỗi nếu đã có
- **Topping:** khu "Topping", "Thêm" trên menu thành topping trong thư viện của chuỗi, gắn vào các món cùng danh mục với giá trên menu, tối đa 3 phần (mục 27); Brand Manager sửa được việc gắn
- **Danh mục:** lấy theo tiêu đề khu trên menu (Cà phê, Trà sữa, Đồ ăn); trùng tên danh mục đang có thì dùng lại
- **Món trùng:** cùng tên (bỏ dấu cách thừa, không phân biệt hoa thường) trong cùng danh mục. Mặc định Cập nhật giá nếu giá khác, Bỏ qua nếu giá giống; Brand Manager đổi được (BR-62)
- **Dòng chưa chắc:** thiếu tên, thiếu giá, giá không đọc được hoặc độ tin cậy thấp thì tô màu cảnh báo và chưa nhập được cho tới khi Brand Manager sửa hoặc bỏ dòng
- **Món mới:** mặc định gán cho mọi chi nhánh đang hoạt động, cho phép gom món, chưa có ảnh món; Brand Manager bổ sung ở OW-02, OW-04. Giá nhập là giá chuỗi; giá riêng của chi nhánh giữ nguyên (BR-84)
- **Không bịa:** AI không tự đặt tên, giá hay mô tả không có trong ảnh; dòng không hiểu được giữ nguyên văn bản gốc để Brand Manager tự xử lý

### 24.6. Cách triển khai

- menu_imports — doanh nghiệp, người tạo, trạng thái, đường dẫn các ảnh, văn bản OCR, bản nháp của AI, bản nháp đã sửa, kết quả nhập (số món tạo mới, cập nhật, bỏ qua), lý do lỗi, thời điểm
- Dịch vụ OCR: Google Cloud Vision (đọc tốt tiếng Việt có dấu, trả vị trí từng dòng); dự phòng Tesseract với gói tiếng Việt chạy ở backend. Chốt ở tuần 1 (CC-12)
- Dịch vụ AI: gọi API mô hình ngôn ngữ sẵn có, dùng chế độ trả kết quả theo lược đồ định sẵn; backend kiểm lược đồ, sai thì gọi lại một lần
- API (chỉ Brand Manager): POST /restaurant-chains/{mã chuỗi}/menu-imports (multipart, 1–5 ảnh); GET …/menu-imports/{id} (trạng thái và bản nháp); PUT …/menu-imports/{id}/draft (lưu bản đã sửa); POST …/menu-imports/{id}/commit (nhập); DELETE …/menu-imports/{id} (huỷ)
- Nhận dạng chạy nền; web hỏi trạng thái hoặc nhận sự kiện Socket.IO khi xong, không giữ một yêu cầu HTTP chờ cả phút
- Bước nhập dùng lại đúng các hàm tạo danh mục, món, nhóm tuỳ chọn của OW-02 và OW-03, nên mọi kiểm tra (tên trùng, SKU, giá ≥ 0, quy tắc chọn) giống hệt nhập tay
- Ảnh menu xoá sau 30 ngày; bản nháp và kết quả nhập giữ lại để truy vết

### 24.7. Giới hạn đã biết

- Cam kết cho menu in tiếng Việt, chữ rõ. Chữ viết tay, ảnh mờ, chói, nghiêng nhiều sẽ đọc sai — luôn phải qua bước duyệt (GĐ-18)
- Bố cục lạ (nhiều cột giá, combo, giá ghi trong hình) có thể bị sắp sai; Brand Manager sửa trong bản nháp
- Không nhận dạng ảnh món ăn, không tự cắt ảnh món từ menu
- Không tạo combo, giảm giá hay giá riêng theo chi nhánh từ ảnh; dòng combo trên menu để ở nhóm chưa hiểu được, Brand Manager tạo combo và đặt giá chi nhánh ở OW-14, OW-16 sau khi nhập
- Mỗi lượt tốn tiền gọi OCR và AI; tối đa 20 lượt mỗi doanh nghiệp mỗi ngày (BR-63)

### 24.8. Đo và trình bày

- Bộ 10 ảnh menu mẫu của quán thật (cà phê, trà sữa, đồ ăn nhanh), có đáp án nhập tay sẵn
- Đo riêng từng bước: tỷ lệ dòng OCR đọc đúng; tỷ lệ món đúng tên, đúng giá, đúng danh mục, đúng size sau bước AI; số chỗ Brand Manager phải sửa mỗi ảnh
- Demo: chụp menu treo tường của một quán ngay trước hội đồng, duyệt bản nháp, bấm Nhập, mở POS thấy món mới

## 25. Thanh toán thuê bao và dùng thử

### 25.1. Ý tưởng một câu

Phí thuê bao thu giống cách trường đại học thu học phí: hệ thống lập khoản phí, gửi email kèm link tới đúng trang thanh toán, chủ chuỗi quét QR PayOS là xong — không chuyển khoản tay, không chờ ai xác nhận. Chuỗi mới được dùng thử 14 ngày gói Cơ bản trước khi quyết định mua.

```
Brand Manager quét QR trên trang thanh toán của nền tảng
        │
        ▼
Kênh PayOS của NỀN TẢNG  ──►  Tài khoản ngân hàng của nền tảng
        │
        └── webhook ──► /webhooks/payos/platform
                        → kiểm chữ ký bằng checksum key của nền tảng
                        → đối chiếu mã hoá đơn và số tiền
                        → hoá đơn Đã thanh toán → cộng một kỳ
```

Hai kênh PayOS không bao giờ lẫn nhau: kênh của nền tảng chỉ thu phí thuê bao; kênh của từng doanh nghiệp chỉ thu tiền bán hàng (mục 11). Nền tảng vẫn không giữ tiền của quán.

### 25.2. Kích hoạt sau khi duyệt (GU-02)

```
[Platform Staff] Duyệt hồ sơ, chọn gói (PA-02)
                    ↓
[Hệ thống]       Sinh link kích hoạt (hạn 7 ngày) → email "Hồ sơ đã được
                 duyệt" gồm tên gói, giá tháng, link kích hoạt
                    ↓
[Chủ quán]       Bấm link → trang kích hoạt, không cần đăng nhập:
                 thông tin doanh nghiệp, gói đã duyệt, giá, hai lựa chọn
                    ├─ Thanh toán tháng đầu
                    │    → lập hoá đơn kỳ đầu, tạo QR PayOS của nền tảng
                    │    → trang hiện QR + đồng hồ 15 phút, tự đổi khi có kết quả
                    │    → webhook hợp lệ → thuê bao Hoạt động 1 tháng
                    └─ Dùng thử 14 ngày gói Cơ bản
                         (ẩn nếu mã số thuế đã dùng thử) → thuê bao Dùng thử
                    ↓
[Hệ thống]       Sinh doanh nghiệp, tài khoản Brand Manager, nhận diện mặc định
                 → email tài khoản Brand Manager kèm mật khẩu tạm (mục 22)
                 → trang kích hoạt báo thành công, chỉ tới trang đăng nhập
```

- Trang kích hoạt chỉ hiện thông tin của chính hồ sơ đó và không cho đổi gói đã duyệt. Muốn gói khác thì báo nền tảng để Platform Staff đổi gói đã duyệt và gửi link mới trước khi kích hoạt (PS-01), hoặc trả tháng đầu rồi chọn gói khác cho kỳ kế tiếp
- Link dùng một lần: kích hoạt xong thì mở lại link chỉ thấy trang "Đã kích hoạt" (BR-67)
- QR tháng đầu hết hạn hoặc khách đổi ý: hồ sơ vẫn chờ kích hoạt; trong hạn link, chủ quán bấm Thanh toán lại hoặc chuyển sang dùng thử
- Trang kích hoạt mang nhận diện nền tảng, giống email cấp tài khoản Brand Manager (22.5)

### 25.3. Hoá đơn thuê bao và gia hạn (OW-13)

- **Lập hoá đơn** — job hằng ngày lập hoá đơn kỳ kế tiếp cho doanh nghiệp còn 7 ngày tới hạn (doanh nghiệp dùng thử: khi còn 5 ngày). Số tiền là giá gói đang dùng tại lúc lập; với doanh nghiệp dùng thử là giá gói Cơ bản, Brand Manager đổi được gói trước khi trả
- **Trang Gói dịch vụ** (mở rộng OW-10) — gói đang dùng, ngày hết hạn, hạn mức đã dùng; hoá đơn chưa trả với số tiền, kỳ áp dụng, hạn trả và nút Thanh toán; lịch sử hoá đơn đã trả kèm biên nhận
- **Thanh toán** — bấm Thanh toán → backend tạo QR PayOS của nền tảng với mã hoá đơn và số tiền, hạn 15 phút → trang hiện QR, đồng hồ đếm ngược và nút Kiểm tra lại → webhook về → trang báo "Đã gia hạn tới …" qua Socket.IO
- **Đổi gói kỳ kế tiếp** — chọn gói khác trước khi trả → hoá đơn chưa trả bị huỷ, lập hoá đơn mới theo giá gói mới. Hạ gói mà đang vượt hạn mức gói mới thì cảnh báo trước (BR-11)
- **Biên nhận** — trả xong, hệ thống gửi email cho Brand Manager gồm mã hoá đơn, gói, kỳ áp dụng, số tiền, thời điểm thanh toán. Biên nhận không phải hoá đơn VAT

Ngày hết hạn mới theo BR-70:

| **Trường hợp**                                           | **Ngày hết hạn mới**                                                             |
| -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Trả sớm ngày 22/11 khi còn hạn tới 27/11                 | 27/12 — nối tiếp, không mất ngày nào                                             |
| ---                                                      | ---                                                                              |
| Trả trễ ngày 02/12 khi đã hết hạn 27/11                  | 02/01 — tính từ lúc trả; từ 28/11 tới 02/12 doanh nghiệp chỉ đọc, không tính phí |
| ---                                                      | ---                                                                              |
| Trả ngày 05/11 lúc đang dùng thử, dùng thử hết hạn 10/11 | 10/12 — gói đã chọn áp ngay từ 05/11                                             |
| ---                                                      | ---                                                                              |
| Hết hạn 31/01, trả sớm                                   | 28/02 (29/02 năm nhuận) — lùi về cuối tháng                                      |
| ---                                                      | ---                                                                              |

### 25.4. Dùng thử 14 ngày

- Chọn ở trang kích hoạt; chỉ gói Cơ bản; 14 ngày tính từ lúc kích hoạt; không cần thanh toán (BR-68)
- Đủ hạn mức và tính năng gói Cơ bản: ≤ 3 chi nhánh, ≤ 30 tài khoản, POS, pha chế, liên kết PayOS bán hàng, áp phích, nhập menu bằng ảnh. Không có nhận diện thương hiệu và so sánh đa chi nhánh — giống gói Cơ bản trả phí
- Mỗi mã số thuế dùng thử một lần; không có dùng thử gói Tiêu chuẩn hay Nâng cao
- Web của Brand Manager hiện dải "Dùng thử còn N ngày — Mua gói" ở mọi trang; nhân viên chi nhánh không thấy
- Email nhắc khi còn 5 ngày và còn 3 ngày (BR-69) gồm số ngày còn lại, ngày hết hạn, tóm tắt những gì đã dùng (số chi nhánh, số tài khoản, số đơn đã bán), bảng so sánh ba gói và link tới trang Gói dịch vụ — để Brand Manager có 3–5 ngày đánh giá trải nghiệm và quyết định mua
- Mua: Brand Manager chọn gói bất kỳ và thanh toán (OW-13); gói áp ngay, ngày hết hạn bằng ngày hết dùng thử cộng một tháng
- Không mua: hết 14 ngày doanh nghiệp chỉ đọc (BR-09) — xem được dữ liệu, không bán. Menu, chi nhánh, tài khoản và đơn giữ tối thiểu 90 ngày; thanh toán lúc nào thì mở lại lúc đó

### 25.5. Email theo mốc

| **Email**              | **Gửi khi**            | **Nội dung chính**                                      | **Link tới**                          |
| ---------------------- | ---------------------- | ------------------------------------------------------- | ------------------------------------- |
| Hồ sơ đã được duyệt    | Platform Staff duyệt   | Gói, giá tháng, hạn link 7 ngày, hai lựa chọn kích hoạt | Trang kích hoạt (không cần đăng nhập) |
| ---                    | ---                    | ---                                                     | ---                                   |
| Dùng thử còn 5 ngày    | Còn 5 ngày, chưa mua   | Ngày hết hạn, tóm tắt đã dùng, so sánh gói              | Trang Gói dịch vụ                     |
| ---                    | ---                    | ---                                                     | ---                                   |
| Dùng thử còn 3 ngày    | Còn 3 ngày, chưa mua   | Nhắc lại; nói rõ hết hạn thì chỉ đọc                    | Trang Gói dịch vụ                     |
| ---                    | ---                    | ---                                                     | ---                                   |
| Sắp tới hạn thanh toán | Còn 7 ngày             | Hoá đơn kỳ tới: gói, số tiền, kỳ áp dụng, hạn trả       | Trang Gói dịch vụ                     |
| ---                    | ---                    | ---                                                     | ---                                   |
| Nhắc thanh toán        | Còn 3 ngày, chưa trả   | Như trên                                                | Trang Gói dịch vụ                     |
| ---                    | ---                    | ---                                                     | ---                                   |
| Đến hạn                | Ngày hết hạn, chưa trả | Hôm nay là ngày cuối; từ ngày mai chỉ đọc nếu chưa trả  | Trang Gói dịch vụ                     |
| ---                    | ---                    | ---                                                     | ---                                   |
| Biên nhận              | Thanh toán thành công  | Mã hoá đơn, gói, kỳ, số tiền, thời điểm                 | Trang Gói dịch vụ                     |
| ---                    | ---                    | ---                                                     | ---                                   |

Email gửi tới email của Brand Manager, mang nhận diện nền tảng, không chứa QR hay mã bí mật. Link tới trang Gói dịch vụ là đường dẫn thường; Brand Manager chưa đăng nhập thì đăng nhập xong được đưa về đúng trang đó (BR-73). Ngày hết hạn là ngày cuối cùng còn dùng; qua 0 giờ ngày hôm sau (giờ Việt Nam) thì chỉ đọc.

### 25.6. Cách triển khai

- activation_tokens — hồ sơ, bản băm mã, hạn dùng, thời điểm dùng, người gửi; gửi lại thì vô hiệu dòng cũ
- subscription_invoices — mã hoá đơn số nguyên duy nhất (dùng làm orderCode PayOS), doanh nghiệp (hoặc hồ sơ với hoá đơn kỳ đầu), tên và giá gói lúc lập, kỳ từ ngày tới ngày, hạn trả, trạng thái, thời điểm trả, người xác nhận thủ công và lý do
- subscription_payments — hoá đơn, mã link PayOS, số tiền, hạn QR, trạng thái; webhook thuê bao lưu chung kiểu payment_webhooks với ràng buộc duy nhất trên mã giao dịch
- Kênh PayOS của nền tảng: ba khoá trong biến môi trường; địa chỉ webhook /webhooks/payos/platform, xác nhận với PayOS khi triển khai
- Job hằng ngày lúc 0 giờ (giờ Việt Nam): lập hoá đơn tới mốc, gửi email theo mốc; ghi dấu đã gửi theo (doanh nghiệp, kỳ, mốc) để chạy lại không gửi trùng
- Một hàm kích hoạt dùng chung cho webhook kỳ đầu và nút Dùng thử: khoá dòng hồ sơ, chỉ chạy khi hồ sơ còn Đã duyệt — chờ kích hoạt, rồi gọi hàm cấp mật khẩu tạm của 22.7
- Một hàm ghi nhận thanh toán thuê bao cho webhook, nút Kiểm tra lại và xác nhận thủ công của Admin; khoá dòng hoá đơn trong transaction như 11.8
- API: GET /activation/{mã}; POST /activation/{mã}/trial; POST /activation/{mã}/pay; GET /subscription (Brand Manager); PUT /subscription/next-plan; POST /subscription/invoices/{id}/pay; POST /subscription/invoices/{id}/check; POST /webhooks/payos/platform

Khối lượng khoảng 4 ngày backend và 3 ngày frontend: trang kích hoạt, trang Gói dịch vụ có thanh toán, dải nhắc, màn hình hoá đơn của Admin, mẫu email.

### 25.7. Giới hạn đã biết

- Không trừ tiền tự động; Brand Manager phải quét QR mỗi tháng (GĐ-21)
- Mỗi lần trả đúng một tháng; không trả trước nhiều tháng, không giảm giá theo năm
- Đổi gói chỉ áp từ kỳ kế tiếp, không tính chênh lệch; đổi gấp giữa kỳ do Admin làm thủ công
- Biên nhận không phải hoá đơn VAT
- Không hoàn phí thuê bao qua hệ thống; trả nhầm, trả thừa thì Admin xử lý ngoài hệ thống
- Dùng thử chống lạm dụng bằng mã số thuế, không chặn được người dùng mã số thuế khác (GĐ-23)

### 25.8. Tiêu chí nghiệm thu

1. Duyệt hồ sơ → email có link; bấm link, chọn dùng thử → trong ≤ 1 phút nhận email tài khoản Brand Manager, doanh nghiệp ở Dùng thử, hết hạn sau 14 ngày
2. Bấm link, thanh toán tháng đầu bằng QR PayOS (môi trường test hoặc số tiền nhỏ) → kích hoạt, doanh nghiệp Hoạt động, hết hạn sau một tháng
3. Mở lại link sau khi đã kích hoạt, hoặc sau 7 ngày → không sinh thêm doanh nghiệp hay tài khoản
4. Đổi ngày hết hạn trong môi trường test: đúng mốc 5 và 3 ngày (dùng thử), 7, 3 và 0 ngày (trả phí) mỗi mốc nhận đúng một email; chạy job hai lần không gửi trùng
5. Bấm link trong email nhắc khi chưa đăng nhập → đăng nhập → về đúng trang Gói dịch vụ
6. Gia hạn khi còn hạn → ngày hết hạn nối tiếp; khi đã hết hạn → mở lại ngay, kỳ tính từ lúc trả
7. Webhook về hai lần → chỉ cộng một kỳ; sai chữ ký → bỏ qua; số tiền lệch → Lệch số tiền, Admin thấy cảnh báo
8. Hết dùng thử không trả → POS không chốt được đơn mới; thanh toán xong → POS bán lại được ngay

## 26. Combo và combo biến thể món

### 26.1. Ý tưởng một câu

Quán hay bán theo bộ: bánh mì kèm một ly cà phê, hai ly trà sữa rẻ hơn mua lẻ. Brand Manager tạo combo có giá riêng; thu ngân chạm combo, chọn món cho những phần để khách chọn, còn giá, pha chế và báo cáo do hệ thống lo.

### 26.2. Mô hình

| **Thành phần**                  | **Nội dung**                                                                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Combo                           | Tên, mô tả, ảnh, danh mục hiển thị trên POS, giá combo (giá chuỗi), cờ kinh doanh cấp chuỗi, chi nhánh được bán. Giá riêng theo chi nhánh đặt ở OW-16 |
| ---                             | ---                                                                                                                                                   |
| Thành phần cố định              | Một món cụ thể, số lượng, size cố định nếu có — ví dụ 1 Bánh mì thịt                                                                                  |
| ---                             | ---                                                                                                                                                   |
| Thành phần biến thể             | Tên nhóm (ví dụ "Đồ uống"), số lượng, size cố định nếu có, danh sách 2–10 món để khách chọn đúng một, mỗi món kèm phụ thu ≥ 0, một món mặc định       |
| ---                             | ---                                                                                                                                                   |
| Tuỳ chọn và topping trong combo | Mỗi món trong combo chọn tuỳ chọn và topping như món lẻ; size đã bị cố định thì khoá; giá cộng thêm vẫn tính                                          |
| ---                             | ---                                                                                                                                                   |

**Ví dụ.** Combo Sáng 39.000đ gồm 1 Bánh mì thịt (cố định) và 1 Đồ uống size M (biến thể): Cà phê sữa (+0), Trà đào (+0), Trà sữa matcha (+5.000). Khách chọn Trà sữa matcha và thêm 1 phần trân châu (+5.000): dòng combo 49.000đ. Mua lẻ cùng các món là 25.000 + 30.000 + 5.000 = 60.000đ.

### 26.3. Bán trên POS

- Combo hiện ở danh mục được gán và ở mục Combo riêng trên POS, với giá hiệu lực của chi nhánh
- Chạm combo mở bảng chọn: thành phần cố định hiện sẵn; mỗi thành phần biến thể là một hàng lựa chọn với món mặc định đã chọn; chạm từng món để chỉnh tuỳ chọn và topping
- Biến thể hết món bị khoá kèm nhãn Hết; thành phần cố định hết thì combo không thêm được vào giỏ (BR-78)
- Giỏ, màn hình phía khách và bill hiện một dòng combo kèm các món bên dưới; sửa combo trong giỏ là mở lại bảng chọn

### 26.4. Pha chế, báo cáo, hoàn tiền

- Thanh toán xong, mỗi món trong combo thành một dòng thành phần, xuống hàng đợi như ly bán lẻ, mang nhãn tên combo và số gọi của đơn; gom món theo món + size như thường (mục 8)
- Đơn chỉ gọi số khi mọi dòng thành phần đã Xong (BR-33)
- Báo cáo: combo bán chạy theo số combo và doanh thu combo; món bán chạy đếm cả ly trong combo nhưng doanh thu ghi cho combo (GĐ-25)
- Hoàn tiền theo cả dòng combo, không hoàn riêng một thành phần (BR-79)

### 26.5. Cách triển khai

- combos — chuỗi, danh mục, tên, mô tả, ảnh, giá chuỗi, cờ kinh doanh, thứ tự; combo_components — combo, loại (cố định, biến thể), tên nhóm, số lượng, size cố định, thứ tự; combo_component_choices — thành phần, món, phụ thu, mặc định
- branch_combos — chi nhánh, combo, cờ được bán, cờ còn bán hôm nay, giá chi nhánh (rỗng là dùng giá chuỗi)
- order_items thêm loại dòng (món, combo, thành phần combo) và dòng cha. Dòng combo lưu tên và giá combo lúc bán; dòng thành phần lưu món đã chọn, phụ thu, tuỳ chọn và topping, còn giá món của nó bằng 0 để tổng không bị cộng hai lần
- API (Brand Manager): GET, POST /restaurant-chains/{mã chuỗi}/combos; PATCH, DELETE …/combos/{id}; PUT …/combos/{id}/branches. POS nhận combo trong cùng phản hồi menu của chi nhánh
- Khối lượng khoảng 3 ngày backend và 3 ngày frontend: màn hình combo trên web, bảng chọn combo trên POS, hiển thị combo trên màn hình phía khách, pha chế và bill

### 26.6. Giới hạn đã biết

- Không có combo lồng combo, combo theo khung giờ, combo tự áp khi giỏ đủ món
- Một thành phần biến thể chỉ chọn một món; muốn "chọn 2 trong 5" thì tạo hai thành phần
- Không phân bổ doanh thu combo về từng món (GĐ-25)

## 27. Topping thêm của món (menu item extra)

### 27.1. Ý tưởng một câu

Topping không còn là một nhóm tuỳ chọn dùng chung mà là phần thêm gắn riêng vào từng món: trà sữa có trân châu và pudding, cà phê có thêm shot espresso, bánh mì có thêm trứng. Mỗi món tự quyết topping nào được thêm, giá bao nhiêu và tối đa mấy phần, nên khách gọi được "thêm hai phần trân châu".

### 27.2. Mô hình

- Thư viện topping của chuỗi: tên, giá mặc định, cờ kinh doanh cấp chuỗi. Khai báo một lần, dùng cho nhiều món
- Gắn topping vào món: giá cộng thêm theo món (mặc định lấy giá thư viện, sửa được — ví dụ trân châu +5.000 với trà sữa nhưng +7.000 với sữa tươi), số phần tối đa mỗi ly (1–5), thứ tự hiển thị
- Mỗi món có tổng số phần topping tối đa, mặc định 5
- Còn bán tại chi nhánh: bật/tắt theo chi nhánh như tuỳ chọn; báo hết một topping là tắt nó ở mọi món có gắn

### 27.3. Vì sao tách khỏi nhóm tuỳ chọn

Nhóm tuỳ chọn hợp với lựa chọn chọn-một như size, đường, đá, và mỗi lựa chọn chỉ có một phần. Topping thì khách hay gọi nhiều phần, và giá thường khác nhau theo món. Dữ liệu dùng nhóm Topping của bản 13 được chuyển sang thư viện topping một lần khi nâng cấp, giữ nguyên giá và việc gắn vào món.

### 27.4. Hiển thị

- POS: dưới các nhóm tuỳ chọn là danh sách topping của món, mỗi dòng có nút − và + cùng số phần; chạm tên là thêm một phần; đạt số phần tối đa thì nút + mờ
- Màn hình phía khách và bill: "+2 Trân châu đen 10.000"
- Pha chế: "+2 trân châu đen" in đậm như tuỳ chọn khác mặc định, không hiện giá

### 27.5. Cách triển khai

- menu_extras — chuỗi, tên, giá mặc định, cờ kinh doanh; menu_item_extras — món, topping, giá cộng thêm, số phần tối đa, thứ tự; menu_items thêm tổng số phần topping tối đa; branch_menu_extras — chi nhánh, topping, cờ còn bán hôm nay
- order_item_extras — dòng món, tên topping, giá một phần, số phần lúc bán
- API (Brand Manager): CRUD /restaurant-chains/{mã chuỗi}/extras; PUT /menu-items/{id}/extras để gắn. Pha chế và Store Manager dùng chung API bật/tắt còn bán của chi nhánh
- Khối lượng khoảng 1,5 ngày backend và 2 ngày frontend

## 28. Hoàn tiền mặt tại quầy

### 28.1. Ý tưởng một câu

Khách đã trả tiền rồi muốn huỷ, món làm sai, hay quán hết món: thu ngân trả lại tiền mặt ngay tại quầy, kể cả khi khách đã chuyển khoản. Hoàn bằng chuyển khoản cần số tài khoản của khách, người có quyền chuyển tiền từ tài khoản chủ chuỗi và một trạng thái chờ hoàn phải theo dõi nhiều ngày — quá phức tạp so với giá trị một đơn tại quầy, nên bản 14 bỏ hẳn.

### 28.2. Ai hoàn được gì

| **Vai trò**   | **Hoàn được**                                                                                                                           | **Use case** |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Cashier       | Đơn của chi nhánh mình, thanh toán trong ngày bán hiện tại; toàn bộ hoặc từng dòng; đơn Đã thanh toán, Đang pha, Sẵn sàng hoặc Hoàn tất | CS-07        |
| ---           | ---                                                                                                                                     | ---          |
| Store Manager | Mọi đơn đã thanh toán của chi nhánh, kể cả ngày trước; đơn Cần xử lý nhận thiếu tiền; tiền về cho đơn đã huỷ                            | BM-06        |
| ---           | ---                                                                                                                                     | ---          |
| Brand Manager | Không hoàn; xem khoản hoàn trong báo cáo đa chi nhánh                                                                                   | OW-08        |
| ---           | ---                                                                                                                                     | ---          |

### 28.3. Luồng

```
[Khách]    Quay lại quầy xin hoàn tiền
             ↓
[Cashier]  Lịch sử đơn hôm nay → mở đơn → Hoàn tiền
           → chọn toàn bộ hoặc từng dòng (combo theo cả dòng)
           → chọn lý do
             ├─ Đơn của ngày trước → POS chặn, gọi Store Manager
             ↓
[Hệ thống] Tính số tiền hoàn theo giá lúc bán, không vượt số đã thu
           → POS hiện "Trả khách 45.000đ tiền mặt"
             ↓
[Cashier]  Lấy tiền từ két trả khách → Xác nhận đã hoàn
             ↓
[Hệ thống] Ghi khoản hoàn + audit log → huỷ dòng, gỡ dòng chưa pha
           khỏi hàng đợi → báo Store Manager → trả dữ liệu phiếu
             ↓
[POS]      In phiếu hoàn tiền; khách ký nhận nếu quán yêu cầu
```

### 28.4. Quy tắc

- Hình thức hoàn luôn là tiền mặt; phiếu hoàn ghi rõ hình thức khách đã trả, tiền mặt hay QR (BR-81)
- Số tiền hoàn tính ở backend từ giá lúc bán; không nhập tay, không hoàn một phần của một dòng
- Dòng chưa pha rời hàng đợi ngay; dòng đã Xong vẫn hoàn được và ghi là hao hụt (BR-49)
- Đơn được hoàn hết mọi dòng chuyển Đã huỷ; số máy rung của đơn được giải phóng (BR-58)
- Doanh thu trừ vào ngày hoàn; báo cáo tách tiền mặt đã thu, tiền mặt đã hoàn và tiền mặt thuần của két theo thu ngân (BR-50, BR-83)
- Chỉ bấm Xác nhận đã hoàn sau khi đã đưa tiền cho khách; hệ thống không có trạng thái chờ hoàn

### 28.5. Cách triển khai

- Dùng lại bảng refunds và refund_items đã có: method chỉ còn CASH; source thêm CASHIER_REFUND bên cạnh MANAGER_CANCELLATION và LATE_PAYMENT; khoản hoàn tạo thẳng ở trạng thái COMPLETED, bỏ luồng PENDING của hoàn chuyển khoản; thêm mã lý do
- API thu ngân: POST /cashier/orders/{mã đơn}/refunds ({ items: \[{ orderItemId }\], reasonCode, note }) — chỉ tài khoản thu ngân của đúng chi nhánh, chỉ đơn trong ngày bán; GET /cashier/orders/{mã đơn}/refunds/{id}/receipt trả dữ liệu phiếu hoàn
- API Store Manager: dùng lại luồng huỷ đơn đã thanh toán của BM-06, bỏ lựa chọn chuyển khoản
- Huỷ dòng, ghi khoản hoàn, gỡ khỏi hàng đợi và giải phóng số máy rung trong một transaction, khoá dòng đơn để hai lần bấm không hoàn hai lần; phát sự kiện tới màn hình pha chế và web Store Manager
- Khối lượng khoảng 1,5 ngày backend và 1,5 ngày frontend: màn hình hoàn trên POS, phiếu hoàn, số liệu két trong báo cáo

### 28.6. Giới hạn đã biết

- Không hoàn bằng chuyển khoản, không hoàn qua PayOS (GĐ-05)
- Thu ngân hoàn được trong ngày nên có rủi ro hoàn khống; kiểm soát bằng lý do, phiếu, thông báo và báo cáo theo thu ngân (GĐ-24)
- Không hoàn một phần số tiền của một dòng (bớt tiền bù cho khách); không quản lý quỹ đầu ca

### 28.7. Tiêu chí nghiệm thu

| **Tình huống**                                    | **Kết quả mong đợi**                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Đơn tiền mặt 45.000đ, thu ngân hoàn toàn bộ       | Đơn Đã huỷ; in phiếu hoàn 45.000đ; báo cáo ngày: doanh thu −45.000đ, tiền mặt đã hoàn +45.000đ               |
| ---                                               | ---                                                                                                          |
| Đơn QR 60.000đ có hai dòng, hoàn một dòng 25.000đ | Hoàn 25.000đ tiền mặt; đơn giữ trạng thái; doanh thu QR không đổi hình thức, tiền mặt thuần của két −25.000đ |
| ---                                               | ---                                                                                                          |
| Hoàn một dòng đang chờ pha                        | Dòng rời hàng đợi pha chế trong ≤ 2 giây                                                                     |
| ---                                               | ---                                                                                                          |
| Thu ngân mở đơn của hôm qua                       | Không có nút Hoàn tiền; gọi thẳng API thì bị từ chối                                                         |
| ---                                               | ---                                                                                                          |
| Hoàn cùng một dòng hai lần (bấm đúp, hai máy)     | Lần sau bị từ chối; chỉ có một khoản hoàn                                                                    |
| ---                                               | ---                                                                                                          |
| Thu ngân chi nhánh khác gọi API hoàn              | Backend từ chối                                                                                              |
| ---                                               | ---                                                                                                          |

## 29. Giá menu theo chi nhánh

### 29.1. Ý tưởng một câu

Giá chuỗi là giá mặc định cho mọi chi nhánh. Chi nhánh có mặt bằng đắt như sân bay, trung tâm thương mại, hay ở khu bình dân thì Brand Manager đặt giá riêng cho món và combo của chi nhánh đó; các chi nhánh khác không bị ảnh hưởng.

### 29.2. Phạm vi

| **Có giá riêng theo chi nhánh** | **Giữ một giá toàn chuỗi**             |
| ------------------------------- | -------------------------------------- |
| Giá món                         | Giá cộng thêm của tuỳ chọn (size L, …) |
| ---                             | ---                                    |
| Giá combo                       | Giá topping theo món                   |
| ---                             | ---                                    |
| –                               | Phụ thu biến thể trong combo           |
| ---                             | ---                                    |

### 29.3. Quy tắc

- Giá hiệu lực là giá chi nhánh nếu có, không thì giá chuỗi (BR-84)
- Đổi giá chuỗi không đổi giá chi nhánh đã đặt. Màn hình giá cảnh báo khi giá chi nhánh thấp hơn giá chuỗi quá 50% hoặc cao hơn quá 100% để tránh gõ nhầm, nhưng vẫn cho lưu
- Áp ngay cho đơn chốt sau khi lưu; đơn đã chốt giữ giá lúc bán (BR-15, BR-85)
- Chỉ Brand Manager sửa; Store Manager xem bảng giá của chi nhánh mình
- Doanh nghiệp ở chế độ chỉ đọc không sửa được giá

### 29.4. Giao diện

- Menu toàn chuỗi › Giá theo chi nhánh: hàng là món và combo, cột là chi nhánh; ô chưa đặt hiện mờ giá chuỗi, ô có giá riêng tô đậm
- Sửa nhanh từng ô, hoặc chọn nhiều chi nhánh rồi áp cùng một giá; nút Về giá chuỗi
- Trang chi tiết món và combo hiện giá chuỗi và số chi nhánh đang có giá riêng

### 29.5. Cách triển khai

- branch_menu_items thêm cột giá chi nhánh (rỗng là dùng giá chuỗi); branch_combos có cột tương tự (mục 26)
- Một hàm tính giá hiệu lực dùng chung cho API menu của POS, màn hình phía khách, TV menu, tính tổng lúc chốt và dữ liệu bill
- API (Brand Manager): GET /restaurant-chains/{mã chuỗi}/branch-prices?branchId=…; PUT /restaurant-chains/{mã chuỗi}/branch-prices ({ items: \[{ type, id, branchIds, price | null }\] })
- Lưu giá phát sự kiện menu.prices-updated tới room của chi nhánh; POS và màn hình phía khách tải lại menu, giỏ đang mở tính lại tổng
- Khối lượng khoảng 1 ngày backend và 1,5 ngày frontend

### 29.6. Giới hạn đã biết

- Không có giá riêng theo chi nhánh cho tuỳ chọn, topping, phụ thu biến thể
- Không lên lịch đổi giá theo ngày giờ, không có giá giờ vàng
- Báo cáo so sánh không quy đổi doanh thu về cùng một giá (GĐ-26)

## 30. Platform Staff và doanh thu nền tảng

### 30.1. Ý tưởng một câu

Bản 14 tách việc vận hành hằng ngày của nền tảng khỏi quyền quản trị. Platform Staff xử lý hồ sơ đăng ký và hỗ trợ khách đăng ký gói; Platform Admin làm được mọi việc đó, giữ các quyền ảnh hưởng tới tiền và cấu hình — gói, gia hạn thủ công, tạm ngưng, tài khoản nhân viên nền tảng — và xem doanh thu của nền tảng.

### 30.2. Phân quyền

| **Việc**                                                                        | **Platform Staff** | **Platform Admin** |
| ------------------------------------------------------------------------------- | ------------------ | ------------------ |
| Xem, duyệt, từ chối hồ sơ (PA-01 đến PA-03)                                     | Có                 | Có                 |
| ---                                                                             | ---                | ---                |
| Đổi gói đã duyệt trước khi kích hoạt, gửi lại link kích hoạt                    | Có                 | Có                 |
| ---                                                                             | ---                | ---                |
| Xem gói, hạn, hoá đơn thuê bao của doanh nghiệp                                 | Có                 | Có                 |
| ---                                                                             | ---                | ---                |
| Đổi gói kỳ kế tiếp theo yêu cầu, gửi lại email hoá đơn, Kiểm tra lại thanh toán | Có                 | Có                 |
| ---                                                                             | ---                | ---                |
| Gia hạn thủ công, xác nhận thủ công hoá đơn lệch, đổi gói giữa kỳ, tạm ngưng    | –                  | Có                 |
| ---                                                                             | ---                | ---                |
| Quản lý gói và giá gói (PA-04)                                                  | Xem                | Có                 |
| ---                                                                             | ---                | ---                |
| Đặt lại mật khẩu Brand Manager                                                  | –                  | Có                 |
| ---                                                                             | ---                | ---                |
| Tài khoản Platform Staff (PA-07)                                                | –                  | Có                 |
| ---                                                                             | ---                | ---                |
| Doanh thu nền tảng (PA-06)                                                      | –                  | Có                 |
| ---                                                                             | ---                | ---                |

### 30.3. Hỗ trợ đăng ký gói (PS-01)

- Danh sách Chờ kích hoạt: hồ sơ đã duyệt, gói, ngày gửi link, hạn link, lần mở link gần nhất, đã tạo QR kỳ đầu hay chưa — để Platform Staff chủ động liên hệ khách sắp hết hạn link
- Đổi gói đã duyệt khi hồ sơ còn chờ kích hoạt: chọn gói, ghi chú yêu cầu; link cũ và QR kỳ đầu chưa trả bị huỷ, hệ thống gửi email kèm link mới
- Doanh nghiệp đã kích hoạt: đổi gói kỳ kế tiếp thay Brand Manager khi được yêu cầu (như OW-13: hoá đơn chưa trả bị huỷ, lập lại theo giá gói mới), gửi lại email hoá đơn, bấm Kiểm tra lại
- Không thanh toán thay, không nhận tiền ngoài hệ thống; việc cần quyền về tiền chuyển Platform Admin
- Mọi thao tác ghi audit log kèm ghi chú yêu cầu; trang Gói dịch vụ của Brand Manager hiện dòng "Nền tảng đã đổi gói kỳ tới theo yêu cầu của bạn"

### 30.4. Doanh thu nền tảng (PA-06)

| **Chỉ số**                         | **Cách tính**                                                                                                        |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Doanh thu thuê bao                 | Tổng số tiền hoá đơn thuê bao Đã thanh toán, theo ngày thanh toán; lọc theo ngày, tháng, năm, gói                    |
| ---                                | ---                                                                                                                  |
| Doanh thu định kỳ hằng tháng (MRR) | Tổng giá tháng của gói đang dùng của các doanh nghiệp Hoạt động tại cuối kỳ xem                                      |
| ---                                | ---                                                                                                                  |
| Doanh nghiệp theo trạng thái       | Dùng thử, Hoạt động, Hết hạn — chỉ đọc, Tạm ngưng tại thời điểm xem                                                  |
| ---                                | ---                                                                                                                  |
| Tỷ lệ chuyển đổi dùng thử          | Số doanh nghiệp trả kỳ đầu trong lúc hoặc sau dùng thử chia số doanh nghiệp đã dùng thử, theo tháng bắt đầu dùng thử |
| ---                                | ---                                                                                                                  |
| Hoá đơn chưa trả, quá hạn          | Số lượng và tổng tiền, kèm danh sách để Platform Staff liên hệ                                                       |
| ---                                | ---                                                                                                                  |
| Gia hạn thủ công                   | Số kỳ và số ngày đã cộng, kèm lý do; không cộng vào doanh thu (BR-76)                                                |
| ---                                | ---                                                                                                                  |

Doanh thu nền tảng là phí thuê bao nền tảng thu được, không phải tiền bán hàng của các quán — nền tảng không thấy tiền bán hàng (BR-07, BR-24).

### 30.5. Cách triển khai

- Vai trò mới PLATFORM_STAFF; lớp kiểm quyền coi PLATFORM_ADMIN có mọi quyền của PLATFORM_STAFF
- Tài khoản Platform Staff dùng chung luồng cấp mật khẩu tạm của mục 22, không gắn doanh nghiệp; tài khoản Platform Admin đầu tiên vẫn tạo bằng cấu hình triển khai
- Hồ sơ đăng ký và hoá đơn thuê bao lưu thêm người thao tác gần nhất; bảng platform_audit_logs ghi thao tác hỗ trợ kèm ghi chú
- API báo cáo: GET /platform/revenue?from=…&to=…&groupBy=day|month&planId=… — chỉ Platform Admin; truy vấn trên subscription_invoices và subscriptions, không chạm bảng đơn hàng của doanh nghiệp
- Khối lượng khoảng 2 ngày backend và 2 ngày frontend: phân quyền mới, màn hình Chờ kích hoạt, màn hình doanh thu

### 30.6. Giới hạn đã biết

- Không phân công khách hàng cho từng Platform Staff; mọi Platform Staff thấy chung hàng đợi
- Báo cáo doanh thu không thay sổ sách kế toán, không xuất hoá đơn VAT (GĐ-27)
- Không đăng nhập thay khách; hỗ trợ dừng ở các thao tác liệt kê ở 30.3