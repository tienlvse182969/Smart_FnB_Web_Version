Smart F&B Chain Platform

Phân tích nghiệp vụ & Đặc tả dự án — Phiên bản 7.0

**Mã đề tài:** SP26SE123

**Giảng viên hướng dẫn:** Tôn Thất Hoàng Minh

**Quy mô nhóm:** 4 sinh viên (2 Frontend, 2 Backend) — 11 tuần thực thi

**Hiệu lực:** bản duy nhất đang dùng, thay thế mọi bản đặc tả trước

## Mục lục

1. Tài liệu này là gì
2. Sản phẩm
3. Mô hình tổ chức dữ liệu
4. Từ điển thuật ngữ
5. Actor
6. Vòng đời trạng thái
7. Luồng nghiệp vụ
8. Quy tắc nghiệp vụ
9. Thuật toán xếp và ghép bàn
10. AI trong sản phẩm
11. Tuỳ biến nhận diện thương hiệu theo chuỗi
12. Ví doanh nghiệp và luồng tiền
13. Ca làm và check-in / check-out
14. Danh sách use case
15. Ma trận quyền
16. Phạm vi
17. Giả định và giới hạn đã biết
18. Rủi ro
19. Lịch 11 tuần
20. Câu hỏi hội đồng dễ hỏi
21. Điểm chưa chốt
22. Việc phải làm ngay

## 0\. Tài liệu này là gì

Đặc tả nghiệp vụ và phạm vi của Smart F&B Chain Platform. Mọi tài liệu khác của nhóm — SRS, Use Case Diagram, Activity Diagram, ERD, slide bảo vệ — lấy mã use case, mã quy tắc và số liệu từ bản này.

Ba phần nghiệp vụ nặng nhất và cần đọc kỹ nhất: thuật toán xếp bàn (mục 8), trợ lý AI hỏi đáp số liệu (mục 9) và ví doanh nghiệp (mục 11).

### 0.1. Cách đọc

| Bạn là                 | Đọc kỹ mục                      |
| ---------------------- | ------------------------------- |
| Ai cũng cần            | 1, 3, 4, 6                      |
| Backend                | 2, 5, 7, 8, 9, 10, 11, 12, 14   |
| Frontend               | 4, 6, 9, 10, 11, 12, 13, 14     |
| Người viết SRS         | Toàn bộ, đặc biệt 7, 13, 14, 15 |
| Người trình bày bảo vệ | 16, 19, 20                      |

## 1\. Sản phẩm

### 1.1. Một câu

Phần mềm vận hành nhà hàng cho thuê theo tháng, để chuỗi quán ăn tự cấu hình, mang nhận diện riêng của mình và chạy toàn bộ quy trình từ lúc khách ngồi xuống tới lúc thu tiền xong.

**Không phải** ứng dụng đặt món cho người tiêu dùng. Khách hàng cuối không cài gì, không có tài khoản, không biết tên sản phẩm này.

### 1.2. Ai trả tiền

Chủ chuỗi F&B quy mô 2–10 chi nhánh. Nền tảng thu hai khoản:

- **Phí thuê bao theo tháng**, tính trên số chi nhánh. Thoả thuận và thu ngoài hệ thống (GĐ-10).
- **Phí dịch vụ thanh toán** trên mỗi giao dịch QR, tự trừ trước khi quyết toán tiền vào ví doanh nghiệp (mục 11). Giao dịch tiền mặt không đi qua nền tảng nên không chịu phí này.

Mức phí cụ thể do Platform Admin cấu hình — xem CC-01 và CC-02.

### 1.3. Vấn đề thật mà hệ thống giải

| Vấn đề ngoài quán                                            | Cách giải                                                                                                                    |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Nhân viên ghi giấy, chạy vào bếp đưa, bếp luận chữ sai       | Order số hoá, hiện thẳng trên màn hình bếp                                                                                   |
| Ghi tay sai món, quên bàn nào gọi gì                         | Nhập ngay tại bàn, gắn với số bàn                                                                                            |
| Tính tiền cộng nhầm, thất thoát tiền mặt                     | Hệ thống tính, ghi nhận ai thu hộ, in bill mọi giao dịch                                                                     |
| Khách đông, xếp bàn lộn xộn, bàn to bị chiếm bởi nhóm nhỏ    | Thuật toán gợi ý phương án xếp và ghép bàn                                                                                   |
| Món hết mà khách vẫn gọi được                                | Bật/tắt món hai tầng, số suất còn lại tự trừ                                                                                 |
| Tiền mỗi chi nhánh thu một nơi, cuối tháng đối soát mệt      | **Mọi giao dịch QR của chuỗi về một ví doanh nghiệp, sổ cái ghi rõ từng chi nhánh, quyết toán định kỳ rồi rút về ngân hàng** |
| Không rõ hôm nay ai đi làm, thông báo gửi cho cả người đã về | **Manager xếp ca theo ngày, check-in/check-out tại quầy; chỉ người đang trong ca nhận việc**                                 |
| Chủ ở nhà không biết chi nhánh nào lỗ                        | Dashboard so sánh đa chi nhánh                                                                                               |
| Chủ muốn biết một con số cụ thể thì phải chờ người tổng hợp  | **Hỏi trợ lý AI bằng tiếng Việt, nhận số liệu thật từ hệ thống kèm diễn giải**                                               |
| Lên hệ thống phải gõ tay 60–80 món                           | _(giai đoạn 2)_ Chụp ảnh menu, AI bóc tách thành bảng, chủ quán sửa rồi nhập hàng loạt                                       |
| Đưa tablet cho khách mà trên đó là logo của một phần mềm lạ  | **Owner cấu hình logo, màu, tên chuỗi; mọi màn hình nhân viên và hoá đơn in đều mang nhận diện của quán**                    |
| Mua POS truyền thống thì đắt và phải mua máy                 | Thuê tháng, chạy trên thiết bị sẵn có                                                                                        |

**Lưu ý khi trình bày:** đừng nói lý do bán hàng là _"khách tự order không cần chờ nhân viên"_. Với mô hình tablet, waiter vẫn đứng bàn. Giá trị nằm ở khâu **sau khi ghi order**. Xem mục 19.1.

### 1.4. Phân khúc mục tiêu

**Phù hợp:** quán cơm, quán bún phở, quán ăn tầm trung, cà phê, trà sữa, quán nhậu, lẩu nướng — kể cả loại hình khách gọi thêm nhiều lần, vì mỗi lần gọi thêm waiter mang tablet ra.

**Chưa tối ưu:** buffet tính theo đầu người, quán tự phục vụ tại quầy, chuỗi trên 20 chi nhánh.

## 2\. Mô hình tổ chức dữ liệu

NỀN TẢNG (bên bán phần mềm)  
│  
├── Doanh nghiệp A ── Owner ── nhận diện riêng (logo, màu cam)  
│ ├── Chi nhánh Q1 ── Branch Manager ── Waiter, Kitchen Staff  
│ └── Chi nhánh Q7 ── Branch Manager ── Waiter, Kitchen Staff  
│  
└── Doanh nghiệp B ── Owner ── nhận diện riêng (logo, màu xanh)  
└── Chi nhánh Thủ Đức (không thấy gì của A)

**Quy tắc vàng:** mọi truy vấn dữ liệu vận hành phải lọc theo doanh nghiệp. Không có ngoại lệ. Ai làm rớt điều kiện này là tạo lỗ hổng rò rỉ dữ liệu giữa hai khách hàng trả tiền.

### 2.1. Chuỗi cấp tài khoản

Chủ quán nộp hồ sơ ──► Admin duyệt ──► sinh tài khoản Owner  
│  
Owner ──cấp──► Branch Manager ──cấp──► Waiter + Kitchen

Tài khoản Owner **không do Admin tạo thủ công từ đầu**, mà sinh ra khi Admin duyệt hồ sơ đăng ký. Từ tầng Owner trở xuống, mỗi tầng chỉ tạo được tài khoản của tầng ngay dưới. Không có đường tắt.

### 2.2. Nhận diện chảy xuống theo cùng chuỗi đó

Owner cấu hình nhận diện (logo, màu, tên hiển thị)  
│  
├──► màn hình Owner  
├──► màn hình Branch Manager (quầy + quản trị)  
├──► tablet Waiter ◄── thiết bị duy nhất khách chạm vào  
├──► màn hình bếp (áp có giới hạn — xem 10.5)  
└──► hoá đơn in ra cho khách

Nhận diện là **thuộc tính của doanh nghiệp**, không phải của người dùng và không phải của chi nhánh. Một tài khoản waiter mới được Branch Manager tạo ra hôm nay, đăng nhập lần đầu đã thấy màu của chuỗi ngay, không cần ai cấu hình thêm gì.

### 2.3. Tiền đi theo đường nào

Khách quét QR tại bất kỳ chi nhánh nào  
│  
▼  
Tài khoản thu hộ của nền tảng (qua cổng thanh toán QR)  
│ webhook → sổ cái ghi TẠM GIỮ, gắn chi nhánh + hoá đơn  
▼  
Hết thời gian tạm giữ → quyết toán, trừ phí dịch vụ  
│  
▼  
Ví doanh nghiệp — số dư khả dụng của Owner  
│ Owner tạo yêu cầu rút → Platform Admin duyệt  
▼  
Tài khoản ngân hàng của Owner

**Ví thuộc về doanh nghiệp, không thuộc chi nhánh.** Chi nhánh chỉ là nhãn trên từng bút toán để Owner biết tiền đến từ đâu.

**Tiền mặt không đi theo đường này.** Tiền mặt nằm trong két của chi nhánh; hệ thống chỉ ghi nhận doanh thu và tên người thu hộ. Vì vậy doanh thu trên dashboard luôn lớn hơn hoặc bằng số tiền đi vào ví.

## 3\. Từ điển thuật ngữ

| Thuật ngữ                    | Nghĩa                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Doanh nghiệp**             | Một khách hàng đã mua dịch vụ. Ranh giới cô lập dữ liệu.                                                                           |
| **Hồ sơ đăng ký**            | Đơn của chủ quán chờ Admin duyệt. Chưa phải doanh nghiệp.                                                                          |
| **Chi nhánh**                | Một quán thuộc doanh nghiệp. Mọi hoạt động vận hành gắn với một chi nhánh.                                                         |
| **Bàn**                      | Một bàn trên sơ đồ: vị trí, số ghế, khu vực, danh sách bàn liền kề.                                                                |
| **Khối bàn**                 | Một hoặc nhiều bàn liền kề được ghép để phục vụ một nhóm khách.                                                                    |
| **Phiên bàn**                | Một lượt khách sử dụng bàn, từ lúc ngồi tới lúc thanh toán xong. Chứa nhiều order.                                                 |
| **Order**                    | Một lần waiter bấm gửi món. Gọi thêm tạo order mới trong cùng phiên.                                                               |
| **Dòng món**                 | Một món trong order. Đơn vị bếp xử lý, có vòng đời trạng thái riêng.                                                               |
| **Nhận việc**                | Waiter bấm nhận thông báo món xong để đi bưng.                                                                                     |
| **Tài khoản thiết bị**       | Tài khoản gắn với chi nhánh, dùng để đăng nhập tablet dùng chung.                                                                  |
| **Ca mẫu**                   | Khung giờ làm việc lặp lại của một chi nhánh, ví dụ Sáng 7:00–14:00.                                                               |
| **Phân ca**                  | Việc gán một nhân viên vào một ca mẫu trong một ngày cụ thể.                                                                       |
| **Lượt làm việc**            | Khoảng thời gian thật một nhân viên có mặt, từ lúc check-in tới lúc check-out.                                                     |
| **Trong ca**                 | Nhân viên đã check-in và chưa check-out. Chỉ người trong ca nhận thông báo.                                                        |
| **Tài khoản thu hộ**         | Tài khoản của nền tảng tại cổng thanh toán, nơi mọi tiền QR của mọi doanh nghiệp chảy vào.                                         |
| **Ví doanh nghiệp**          | Phần tiền nền tảng đang giữ cho một doanh nghiệp. Không phải tài khoản ngân hàng thật.                                             |
| **Sổ cái**                   | Danh sách bút toán của ví. Chỉ thêm, không sửa, không xoá.                                                                         |
| **Bút toán**                 | Một dòng trong sổ cái: loại, số tiền, chi nhánh, hoá đơn nguồn, thời điểm.                                                         |
| **Số dư tạm giữ**            | Tiền QR đã thu nhưng chưa hết thời gian tạm giữ, chưa được rút.                                                                    |
| **Số dư khả dụng**           | Tiền đã quyết toán, đã trừ phí, Owner được phép rút.                                                                               |
| **Thời gian tạm giữ**        | Khoảng thời gian tiền QR phải nằm ở trạng thái tạm giữ trước khi quyết toán.                                                       |
| **Quyết toán**               | Việc hệ thống chuyển tiền đã hết thời gian tạm giữ sang số dư khả dụng, sau khi trừ phí.                                           |
| **Phí dịch vụ thanh toán**   | Tỷ lệ phần trăm nền tảng thu trên mỗi giao dịch QR.                                                                                |
| **Yêu cầu rút tiền**         | Đề nghị của Owner chuyển một phần số dư khả dụng về tài khoản ngân hàng.                                                           |
| **Tài khoản nhận tiền rút**  | Tài khoản ngân hàng Owner khai báo để nhận tiền rút.                                                                               |
| **Trợ lý số liệu**           | Tính năng AI: Owner hỏi bằng tiếng Việt, hệ thống trả số liệu thật kèm diễn giải.                                                  |
| **View báo cáo**             | Bảng ảo trong cơ sở dữ liệu, là phần dữ liệu duy nhất trợ lý số liệu được đọc.                                                     |
| **Bảng nháp menu**           | Kết quả AI bóc tách từ ảnh, chưa ghi vào cơ sở dữ liệu, Owner phải duyệt _(giai đoạn 2)_.                                          |
| **Bộ nhận diện thương hiệu** | Logo, màu chủ đạo, màu nhấn và tên hiển thị của một doanh nghiệp. Do Owner đặt, áp cho mọi tài khoản thuộc doanh nghiệp đó.        |
| **Màu ngữ nghĩa**            | Màu mang ý nghĩa cố định: đỏ là cảnh báo, vàng là đang chờ, xanh là xong. Là hằng số của hệ thống, **không** đổi theo thương hiệu. |
| **Token màu**                | Biến CSS trung gian giữa mã nguồn và màu thật. Mã nguồn gọi tên biến, không viết mã màu cứng.                                      |

Thống nhất gọi cổng thanh toán là **cổng thanh toán QR**, không dùng lẫn lộn tên nhà cung cấp trong tài liệu. Tên cụ thể chỉ xuất hiện trong tài liệu kỹ thuật.

## 4\. Actor

### 4.1. Bảng tổng hợp

| #   | Actor                                       | Phạm vi          | Nền tảng            | Use case (GĐ1 + GĐ2) |
| --- | ------------------------------------------- | ---------------- | ------------------- | -------------------- |
| 0   | Prospective Owner (khách chưa có tài khoản) | Ngoài hệ thống   | Web                 | 1                    |
| 1   | Platform Admin                              | Toàn nền tảng    | Web                 | 11                   |
| 2   | Owner                                       | Một doanh nghiệp | Web                 | 14                   |
| 3   | Branch Manager                              | Một chi nhánh    | Web + POS quầy      | 16                   |
| 4   | Waiter                                      | Một chi nhánh    | Tablet + điện thoại | 11                   |
| 5   | Kitchen Staff                               | Một chi nhánh    | Web màn hình lớn    | 4                    |
| —   | Authenticated User (actor cha)              | —                | —                   | 3                    |

Tổng cộng **60 use case** (46 ở giai đoạn 1, 14 ở giai đoạn 2) — xem mục 13.

Năm actor 1–5 **kế thừa** Authenticated User. Quan hệ generalization này phải vẽ rõ trên Use Case Diagram.

Khách tại bàn **không phải actor** — họ chạm vào tablet của nhân viên, không có tài khoản, không có phiên đăng nhập. Phải nêu rõ trong SRS.

### 4.2. Prospective Owner (web, chưa đăng nhập)

**Là ai:** chủ quán quan tâm dịch vụ, chưa có tài khoản.

**Làm gì:** nộp hồ sơ đăng ký gồm thông tin doanh nghiệp (tên, mã số thuế, địa chỉ, số chi nhánh dự kiến) và thông tin người đại diện (họ tên, email, số điện thoại).

Sau khi nộp, hồ sơ ở trạng thái _Chờ duyệt_. Không có tài khoản, không đăng nhập được cho tới khi Admin duyệt.

**Không làm:** không tự kích hoạt, không chọn gói, không dùng thử.

### 4.3. Platform Admin (web)

**Là ai:** bên bán phần mềm, đồng thời là bên vận hành tài khoản thu hộ. Vai trò kinh doanh và tài chính nền tảng, không dính nghiệp vụ nhà hàng.

**Ví von:** ban quản lý toà nhà cho thuê kiêm thủ quỹ thu hộ. Biết công ty nào thuê tầng mấy, hợp đồng tới ngày nào, đang giữ hộ bao nhiêu tiền và đã chuyển trả bao nhiêu. Không biết công ty đó bán món gì cho ai — và cũng không quyết định công ty đó treo biển màu gì.

**A. Xử lý hồ sơ đăng ký**

- Xem danh sách hồ sơ chờ duyệt, tìm kiếm, mở chi tiết
- **Duyệt**: sinh không gian dữ liệu riêng, sinh ví doanh nghiệp rỗng, sinh tài khoản Owner, sinh bộ nhận diện mặc định, gửi email đăng nhập
- **Từ chối**: ghi lý do, hồ sơ chuyển trạng thái _Bị từ chối_
- Xem trạng thái tài khoản Owner đã cấp

**B. Quản trị nền tảng**

- Xem danh sách và hồ sơ doanh nghiệp
- Định nghĩa gói dịch vụ: giá tháng, số chi nhánh tối đa, số tài khoản tối đa, số bàn tối đa
- Gia hạn, nâng gói, hạ gói, tạm ngưng, kích hoạt lại
- Đặt lại mật khẩu cho Owner
- Xem audit log hệ thống _(giai đoạn 2)_

**C. Tài chính nền tảng** _(chi tiết ở mục 11)_

- Cấu hình **phí dịch vụ thanh toán**, **thời gian tạm giữ** và **mức rút tối thiểu**
- Xem danh sách yêu cầu rút tiền, **duyệt** hoặc **từ chối** kèm lý do
- Sau khi chuyển khoản thật, **xác nhận đã chuyển** kèm mã giao dịch ngân hàng; hoặc đánh dấu chuyển thất bại
- Xem số dư và sổ cái ví của từng doanh nghiệp để đối chiếu
- Xử lý giao dịch lệch — tiền về mà không khớp hoá đơn nào _(giai đoạn 2)_

**Thấy gì:** tên doanh nghiệp, người đại diện, gói, ngày hết hạn, số chi nhánh, số tài khoản, tổng số đơn trong tháng; số dư và bút toán ví (số tiền, loại, thời điểm, chi nhánh).

**Không thấy:** nội dung đơn hàng, món, menu, giá món, tên nhân viên quán, doanh thu tiền mặt.

**Không làm:** không tạo chi nhánh — chỉ đặt con số trần; không sửa menu, sơ đồ bàn, nhân viên; **không sửa bộ nhận diện của doanh nghiệp**; **không sửa số dư hay bút toán**; không tự tạo yêu cầu rút thay Owner; không đăng nhập thay Owner; không xoá cứng dữ liệu.

Giao diện của Platform Admin **luôn giữ nhận diện của nền tảng**, không bị doanh nghiệp nào áp màu lên (BR-32).

### 4.4. Owner (web)

**Là ai:** chủ doanh nghiệp. Người thiết lập chuẩn, giám sát và nhận tiền, không phải người vận hành.

**Nguyên tắc phân định: Owner quyết định luật chơi, Branch Manager chơi theo luật đó.**

**A. Chi nhánh**

- Tạo chi nhánh: tên, địa chỉ, điện thoại, giờ mở cửa, giờ đóng cửa
- Sửa, tạm ngưng, đóng chi nhánh
- Xem trạng thái hoạt động của mọi chi nhánh trên một màn hình
- Bị chặn khi vượt hạn mức gói, kèm gợi ý nâng gói

Owner **tạo** chi nhánh nhưng **không thiết kế sơ đồ bàn**. Giờ đóng cửa là mốc hệ thống dùng để tự đóng lượt làm việc còn treo (mục 12).

**B. Menu toàn chuỗi**

- Quản lý danh mục món
- Tạo, sửa món: tên, mô tả, ảnh, **giá**, danh mục
- **Bật/tắt món ở cấp toàn chuỗi** — tắt thì mọi chi nhánh đều không bán được
- Chọn món nào có mặt tại chi nhánh nào
- Nhập menu hàng loạt bằng ảnh — xem 9.8 _(giai đoạn 2)_

Giá là **một giá cho toàn chuỗi**. Không có giá riêng theo chi nhánh.

**C. Tài khoản Branch Manager**

- Tạo và gán vào chi nhánh
- Tạo nhiều tài khoản cùng vai trò cho một chi nhánh, phục vụ trực ca
- Khoá tài khoản, đặt lại mật khẩu, chuyển chi nhánh

Owner **không tạo tài khoản waiter và bếp**, chỉ xem danh sách.

**D. Báo cáo và trợ lý số liệu**

- So sánh doanh thu giữa các chi nhánh trên cùng biểu đồ
- Doanh thu theo ngày, tuần, tháng; món bán chạy; số lượt khách
- **Trợ lý AI hỏi đáp số liệu** — gõ câu hỏi tiếng Việt, nhận câu trả lời kèm bảng số lấy từ dữ liệu thật (mục 9)

Mọi báo cáo phải **so sánh được giữa các chi nhánh**. Nếu chỉ xem từng chi nhánh một rồi tự nhẩm thì Owner không cần phần mềm.

Không có báo cáo lợi nhuận. Hệ thống không quản lý kho và không tính lương, nên không có dữ liệu chi phí để tính.

**E. Bộ nhận diện thương hiệu** _(chi tiết ở mục 10)_

- Tải logo của chuỗi
- Chọn màu chủ đạo và màu nhấn, từ bộ màu dựng sẵn hoặc nhập mã màu
- Đặt tên hiển thị của chuỗi
- Xem trước trực tiếp trước khi lưu
- Khôi phục về mặc định bất cứ lúc nào

Cấu hình này áp cho **mọi tài khoản thuộc doanh nghiệp**: Branch Manager, Waiter, Kitchen Staff — kể cả tài khoản được tạo ra sau khi cấu hình. Đây là quyền **chỉ Owner có** (BR-29).

**F. Ví doanh nghiệp** _(chi tiết ở mục 11)_

- Xem **số dư tạm giữ**, **số dư khả dụng**, số tiền **đang chờ rút**
- Xem sổ cái, lọc theo chi nhánh, loại bút toán và khoảng thời gian
- Xem lịch sử quyết toán: tổng thu, đã hoàn, phí, thực nhận của từng đợt
- Khai báo **tài khoản ngân hàng nhận tiền rút**
- **Tạo yêu cầu rút tiền**, huỷ khi còn chờ duyệt, theo dõi trạng thái

**G. Giám sát**

- Xem lịch phân ca của các chi nhánh (chỉ xem)
- Audit log toàn doanh nghiệp _(giai đoạn 2)_
- Xem trạng thái tài khoản và lịch sử gói _(giai đoạn 2)_

**Không làm:** không mở bàn, không nhận order, không thu tiền, không hoàn tiền; không thiết kế sơ đồ bàn; không tạo tài khoản waiter và bếp; không xếp ca; không tự đổi gói thuê bao; không sửa số dư; không đổi bố cục màn hình hay nhãn chức năng — tuỳ biến dừng ở mức nhận diện.

Ranh giới đầu là **cố ý**: nếu Owner làm được mọi thứ thì audit log mất ý nghĩa.

### 4.5. Branch Manager (web + POS quầy)

**Là ai:** quản lý một chi nhánh, kiêm thu ngân tại quầy. Actor nặng nhất hệ thống.

**Đây là vai trò, không phải chức danh.** Một chi nhánh được tạo nhiều tài khoản cùng vai trò — ví dụ một quản lý và hai người trực quầy theo ca.

Giao diện tách hai chế độ trong cùng ứng dụng, cả hai đều mang nhận diện của chuỗi.

#### Chế độ Quầy — việc trong ca

**A. Thanh toán**

- Xem danh sách bàn đang có khách kèm tổng tiền tạm tính
- Nhận yêu cầu tính tiền do waiter báo
- Mở hoá đơn phiên bàn, gộp toàn bộ order kể cả các lần gọi thêm
- **Xuất mã QR** để waiter mang ra bàn cho khách quét — tiền vào tài khoản thu hộ của nền tảng, không vào tài khoản của ai trong quán
- **Ghi nhận tiền mặt** do waiter thu hộ, có ghi tên người thu
- Xác nhận thanh toán, **in hoá đơn** có logo và tên chuỗi (bắt buộc cho cả hai hình thức)

**B. Ngoại lệ** _(giai đoạn 2)_

- Đối soát tay khi webhook không về hoặc về trễ
- **Hoàn tiền giao dịch QR** — một phần hoặc toàn bộ, chỉ trong thời gian tạm giữ, bắt buộc ghi lý do
- Điều chỉnh hoá đơn khi huỷ món
- Đóng phiên khi khách bỏ về không trả, ghi lý do vào audit log

**C. Đặt bàn** _(giai đoạn 2)_

- Nhận đặt bàn qua điện thoại: tên, số điện thoại, số người, giờ đến
- Xem lịch đặt bàn trong ngày trên sơ đồ
- Đánh dấu khách không đến

**D. Giám sát sàn**

- Dashboard chi nhánh: doanh thu tháng/năm, top 5 món bán chạy, số bàn đang phục vụ, tổng quan order và bếp, **ai đang trong ca**
- Cảnh báo khi món xong quá lâu chưa ai bưng
- Cảnh báo khi bếp báo hết món
- **Nhắc khi nhân viên quá giờ kết thúc ca chưa check-out**
- Xem hàng đợi bếp ở chế độ chỉ đọc

**E. Ca làm trong ngày**

- **Check-in** waiter và bếp khi họ tới — danh sách gợi ý là người có lịch hôm nay; người không có lịch vẫn check-in được, bị gắn cờ _ngoài lịch_
- **Check-out** khi họ về
- Xác nhận hoặc sửa giờ của các lượt làm việc bị hệ thống tự đóng

Check-in và check-out đều do Branch Manager thao tác, không phải nhân viên tự làm, vì tablet và màn bếp là thiết bị dùng chung. Hệ thống **không tự check-out theo giờ kết thúc ca** — lý do ở 12.4.

#### Chế độ Quản trị — việc ngoài ca

**F. Sơ đồ bàn**

- Thiết kế sơ đồ bàn: vị trí, số ghế, khu vực
- **Khai báo các cặp bàn liền kề** — dữ liệu bắt buộc cho thuật toán ghép bàn

**G. Cấu hình món tại chi nhánh**

Không sửa được tên, giá, ảnh — đó là của Owner.

- **Bật/tắt món cho chi nhánh mình**
- Đặt số suất còn lại cho món có nguyên liệu giới hạn

**H. Nhân sự và xếp ca**

- Tạo tài khoản waiter và nhân viên bếp
- Sửa, đặt lại mật khẩu, khoá khi nghỉ việc
- **Tạo ca mẫu** của chi nhánh: tên ca, giờ bắt đầu, giờ kết thúc
- **Phân ca theo ngày**: chọn ngày, chọn ca, chọn nhân viên; sao chép lịch của tuần trước sang tuần này

**I. Báo cáo và giám sát chi nhánh**

- Doanh thu theo ngày, tuần, tháng
- Món bán chạy
- Số lượt khách, tỷ lệ quay vòng bàn
- Báo cáo chi nhánh theo tuần/tháng _(giai đoạn 2)_
- Audit log chi nhánh _(giai đoạn 2)_

**Không làm:** sửa tên, mô tả, ảnh, **giá** món; **sửa logo, màu, tên hiển thị của chuỗi**; tạo hoặc xoá chi nhánh; xem dữ liệu chi nhánh khác; xem hoặc đổi gói thuê bao; **xem ví doanh nghiệp, rút tiền**.

### 4.6. Waiter (tablet + điện thoại)

**Là ai:** người di chuyển liên tục trong quán. Dùng **hai thiết bị**: tablet dùng chung của quán để ghi order, và điện thoại cá nhân để nhận thông báo.

Tablet là **thiết bị duy nhất khách hàng cuối nhìn thấy và chạm vào**. Đây là lý do nghiệp vụ chính khiến nhận diện thương hiệu không phải chuyện trang trí — xem mục 10.2.

**A. Ca làm**

Được Branch Manager xếp ca, check-in đầu ca và check-out cuối ca. **Chỉ nhận thông báo khi đang trong ca** (BR-43). Waiter không tự check-in, không tự sửa lịch.

Ca làm và check-in không phải để chấm công — chúng tồn tại vì hệ thống cần biết **ai đang có mặt** để giao việc.

**B. Mở bàn**

- Xem sơ đồ bàn thời gian thực
- Nhập số khách → **hệ thống gợi ý 3 phương án xếp bàn**, waiter chọn
- Mở phiên bàn
- Nhận khách đã đặt bàn trước _(giai đoạn 2)_

**C. Ghi order — vòng lặp chính**

- Mang tablet ra bàn, đưa khách xem menu
- **Đứng chờ tại bàn**, ghi ghi chú của khách trực tiếp
- Bấm hoàn tất → order chạy thẳng xuống bếp
- Gọi thêm giữa bữa: mang tablet ra lần nữa, tạo order mới trong cùng phiên
- Sửa hoặc huỷ dòng món khi khách đổi ý, chỉ khi món chưa vào trạng thái đang làm _(giai đoạn 2)_

**D. Bưng món**

- Nhận thông báo trên điện thoại khi bếp báo món xong
- **Bấm nhận việc**, thông báo biến mất khỏi máy các waiter khác
- Bưng ra bàn, xác nhận đã phục vụ
- Cảnh báo đổi màu khi món chờ quá lâu

**E. Thanh toán — vai trò hạn chế**

Đây là mục dễ vẽ sai nhất, nên liệt kê cả hai chiều.

**Waiter LÀM:**

- Xem hoá đơn tạm tính của bàn
- Báo quầy khi khách yêu cầu tính tiền
- Mang tablet có mã QR ra bàn cho khách quét
- Nhận tiền mặt, mang lên quầy — **hệ thống ghi tên người thu hộ**
- Mang hoá đơn in và tiền thừa về bàn
- Đóng phiên bàn sau khi Manager đã xác nhận thanh toán

**Waiter KHÔNG LÀM:**

- Không sinh mã QR thanh toán
- Không xác nhận thanh toán, kể cả tiền mặt
- Không in hoá đơn, không hoàn tiền
- Không sửa giá, không giảm giá

**F. Xử lý tại bàn** _(giai đoạn 2)_

- Nhận cảnh báo bếp báo hết món, ra bàn xin lỗi
- Đổi món thay thế, hoặc bỏ món khỏi hoá đơn

**Mọi waiter trong ca thấy chung mọi bàn và mọi thông báo.** Không phân công bàn cố định, ai bấm nhận trước thì được.

### 4.7. Kitchen Staff (web màn hình lớn)

**Là ai:** nhân viên bếp và pha chế của một chi nhánh. Màn hình treo tường hoặc đặt trên kệ.

**Không có trạm chế biến.** Một chi nhánh một hàng đợi, phân việc bằng **bộ lọc theo danh mục món** — người pha chế lọc đồ uống, người đứng bếp lọc món chính.

Actor đơn giản nhất về chức năng, **khó nhất về thiết kế giao diện**. Người dùng đứng cách màn hình một mét, tay bẩn, đang vội, mắt liếc chứ không đọc.

**A. Ca làm** — Branch Manager xếp ca, check-in / check-out. Chỉ nhận món mới và cảnh báo khi đang trong ca

**B. Hàng đợi**

- Danh sách món cần làm của chi nhánh, sắp theo thứ tự nhận order
- Lọc theo danh mục món và theo trạng thái
- Mỗi thẻ hiện: số bàn, tên món, số lượng, **ghi chú của khách**, thời gian đã chờ

Ghi chú của khách phải nổi bật. Ít cay, không hành, không rau — đây là thứ hay bị bỏ sót nhất ngoài đời thật.

**C. Cập nhật trạng thái**

Đơn vị thao tác là **dòng món**, không phải cả order. Bếp làm xong món nào thì bấm xong món đó, hệ thống bắn thông báo ngay cho waiter đang trong ca đi bưng — không chờ cả order xong.

Bốn nút: chờ, đang làm, xong, hết món. Không hơn.

**D. Báo tình trạng món**

- Tắt món khi hết nguyên liệu, cập nhật số suất còn lại, bật lại khi có hàng

Trùng quyền với Branch Manager, và trùng là đúng — bếp là người biết trước nhất.

**Không làm:** không thấy giá tiền, không thấy tổng hoá đơn; không thấy thông tin khách hàng; không huỷ món — chỉ báo hết món, quyền huỷ thuộc waiter; không thấy dữ liệu chi nhánh khác.

**Nguyên tắc thiết kế giao diện bếp**

- Chữ tối thiểu 20px, nút cao tối thiểu 60px
- Hàng đợi nhìn thấy không cần cuộn, hoặc cuộn tối đa một lần
- Phân biệt trạng thái bằng **màu và vị trí**, đừng bắt đọc chữ
- Món chờ quá lâu tự đổi màu và nhảy lên đầu
- **Không hộp thoại xác nhận.** Bấm nhầm thì bấm lại
- Tự cập nhật khi có món mới
- **Màu thương hiệu chỉ xuất hiện ở thanh tiêu đề và logo.** Màu của thẻ món là màu ngữ nghĩa, không đổi theo chuỗi (BR-30)

### 4.8. Hệ thống bên ngoài

Không phải người dùng, không kế thừa Authenticated User, nhưng có trao đổi dữ liệu với hệ thống và **phải xuất hiện trên Context Diagram**.

| Hệ thống            | Trao đổi gì                                                                                         | Ghi chú                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Cổng thanh toán QR  | Nhận yêu cầu tạo QR động; nhận tiền vào tài khoản thu hộ; gửi webhook báo tiền về                   | Webhook phải xử lý idempotent (BR-35)                       |
| Ngân hàng           | Nhận lệnh chuyển tiền rút về tài khoản của Owner                                                    | Trong đồ án, Admin chuyển khoản ngoài hệ thống rồi xác nhận |
| Dịch vụ mô hình AI  | Nhận câu hỏi và mô tả view, trả truy vấn và diễn giải; nhận ảnh menu, trả bảng nháp _(giai đoạn 2)_ | Chỉ gọi qua backend                                         |
| Dịch vụ email       | Gửi tài khoản mới, kết quả duyệt hồ sơ, kết quả yêu cầu rút                                         |                                                             |
| Dịch vụ lưu trữ tệp | Lưu logo và ảnh món                                                                                 | Cơ sở dữ liệu chỉ giữ đường dẫn                             |

## 5\. Vòng đời trạng thái

### 5.1. Hồ sơ đăng ký

Chờ duyệt → Đã duyệt  
→ sinh doanh nghiệp + ví + tài khoản Owner  
→ sinh nhận diện mặc định  
Chờ duyệt → Bị từ chối (kèm lý do)

### 5.2. Doanh nghiệp

Hoạt động → Tạm ngưng → Hoạt động  
Hoạt động → Hết hạn → Chỉ đọc

### 5.3. Bàn

Trống → Đã đặt trước → Đang phục vụ → Trống  
Trống → Đang phục vụ → Trống (khách vãng lai)  
Trống → Tạm khoá (bàn hỏng)

Không có trạng thái _Cần dọn_ — thanh toán xong bàn về trống ngay.

### 5.4. Phiên bàn

Mở → Đang phục vụ → Đã thanh toán → Đóng  
Mở → Huỷ (khách bỏ về trước khi gọi món)

Bước _Đã thanh toán → Đóng_ do waiter thao tác sau khi Manager đã xác nhận thu tiền.

### 5.5. Order

Đã gửi bếp → Đang xử lý → Hoàn tất  
Đã gửi bếp → Huỷ

Không có trạng thái _Chờ duyệt_ và _Chờ thanh toán_ — waiter bấm gửi là xuống bếp luôn.

### 5.6. Dòng món

Trong hàng đợi → Đang làm → Xong → Chờ bưng → Đã phục vụ  
Đang làm → Hết món  
Trong hàng đợi → Huỷ

Chỉ được huỷ khi còn ở _Trong hàng đợi_. Sang _Đang làm_ thì phải có xác nhận của bếp.

### 5.7. Thanh toán

Khởi tạo → Chờ chuyển khoản → Đã xác nhận → In hoá đơn  
Khởi tạo → Nhận tiền mặt → Đã xác nhận → In hoá đơn  
Chờ chuyển khoản → Thất bại / Hết hạn → Đối soát tay  
Đã xác nhận (QR) → Đã hoàn một phần / Đã hoàn toàn bộ  
(chỉ trong thời gian tạm giữ)

Thanh toán QR chuyển sang _Đã xác nhận_ thì sổ cái sinh ngay một bút toán tạm giữ (5.11). Thanh toán tiền mặt không sinh bút toán.

### 5.8. Bảng nháp menu (AI, giai đoạn 2)

Ảnh tải lên → Đang bóc tách → Bảng nháp → Owner sửa → Đã nhập  
Ảnh tải lên → Bóc tách thất bại → Nhập tay

### 5.9. Bộ nhận diện thương hiệu

Mặc định nền tảng → Owner sửa → Đang áp dụng → Owner sửa tiếp  
Đang áp dụng → Khôi phục mặc định → Mặc định nền tảng

Không có trạng thái chờ duyệt. Owner lưu là áp dụng ngay cho toàn doanh nghiệp — nền tảng không kiểm duyệt màu sắc của khách hàng.

### 5.10. Lượt làm việc của nhân viên

Đã xếp ca → Đang trong ca → Đã ra ca  
(không có lịch) → Đang trong ca \[ngoài lịch\] → Đã ra ca  
Đang trong ca → Tự đóng, chờ xác nhận → Đã ra ca  
(Manager xác nhận hoặc sửa giờ)  
Đã xếp ca → Vắng (hết ca mà không check-in)

_Đã xếp ca_ là trạng thái của một dòng phân ca. Từ lúc check-in trở đi là trạng thái của lượt làm việc.

### 5.11. Khoản tiền QR trong ví

Tạm giữ → Khả dụng (quyết toán, đã trừ phí)  
Tạm giữ → Hoàn một phần → Tạm giữ phần còn lại → Khả dụng  
Tạm giữ → Đã hoàn toàn bộ

Đây là trạng thái của **khoản tiền**, không phải của một dòng dữ liệu bị sửa đi sửa lại. Mỗi lần đổi trạng thái là **một bút toán mới** trong sổ cái (BR-34).

### 5.12. Yêu cầu rút tiền

Chờ duyệt → Đã duyệt → Đã chuyển  
Chờ duyệt → Bị từ chối (kèm lý do)  
Chờ duyệt → Đã huỷ (Owner huỷ)  
Đã duyệt → Chuyển thất bại

Tạo yêu cầu thì số tiền **bị giữ lại ngay** khỏi số dư khả dụng. Bị từ chối, bị huỷ hoặc chuyển thất bại thì số tiền **trả lại** số dư khả dụng.

### 5.13. Một lượt hỏi trợ lý số liệu

Câu hỏi → Sinh truy vấn → Kiểm tra → Chạy → Diễn giải → Đã trả lời  
Kiểm tra → Bị chặn → Sinh lại (tối đa 1 lần) → Không trả lời được  
Câu hỏi → Ngoài phạm vi → Từ chối

## 6\. Luồng nghiệp vụ

### 6.1. Onboarding doanh nghiệp mới

\[Chủ quán\] Nộp hồ sơ đăng ký trên web  
↓  
\[Hệ thống\] Hồ sơ vào trạng thái Chờ duyệt  
↓  
\[Admin\] Mở chi tiết, đối chiếu thông tin  
↓  
├─ Từ chối: ghi lý do, gửi email  
│ → chủ quán sửa và nộp lại  
└─ Duyệt: sinh không gian dữ liệu + ví rỗng  
\+ tài khoản Owner + nhận diện mặc định  
\+ gửi email  
↓  
\[Owner\] Đăng nhập lần đầu, đổi mật khẩu  
↓  
\[Owner\] Cấu hình nhận diện: logo, màu chuỗi, tên hiển thị  
↓  
\[Hệ thống\] Áp nhận diện cho mọi màn hình của doanh nghiệp này  
↓  
\[Owner\] Tạo chi nhánh, nhập menu  
↓  
\[Owner\] Khai báo tài khoản ngân hàng nhận tiền rút  
↓  
\[Owner\] Tạo tài khoản Branch Manager cho từng chi nhánh  
├─ Email đã tồn tại → nhập email khác  
↓  
\[Manager\] Đăng nhập — giao diện đã mang màu của chuỗi  
↓  
\[Manager\] Thiết kế sơ đồ bàn, khai báo bàn liền kề  
↓  
\[Manager\] Tạo tài khoản waiter và bếp, tạo ca mẫu, phân ca tuần đầu  
↓  
Chi nhánh sẵn sàng bán hàng

Luồng này là **kịch bản demo mở màn** khi bảo vệ. Nó cho thấy multi-tenant, nhận diện riêng theo chuỗi và phân cấp tài khoản trong một mạch.

Bước cấu hình nhận diện đặt **ngay sau lần đăng nhập đầu tiên** là có chủ đích khi demo: hội đồng nhìn thấy giao diện đổi màu trước mắt, rồi mọi màn hình sau đó — kể cả màn hình của tài khoản chưa tồn tại tại thời điểm cấu hình — đều mang màu đó.

### 6.2. Luồng chính trong ca — từ lúc khách vào tới lúc khách ra

(Đầu ca)  
\[Manager\] Check-in waiter và bếp có mặt  
→ chỉ những người này nhận việc  
↓  
\[Waiter\] Nhập số khách trên tablet  
↓  
\[Hệ thống\] Gợi ý 3 phương án xếp bàn, tô sáng trên sơ đồ  
├─ Không có phương án → báo không đủ chỗ,  
│ kèm giờ dự kiến có bàn  
↓  
\[Waiter\] Chọn phương án → mở phiên bàn → dẫn khách vào  
↓  
\[Waiter\] Đưa tablet cho khách xem menu, đứng chờ  
↓  
\[Khách\] Chọn món, nói ghi chú (ít cay, không hành)  
↓  
\[Waiter\] Bấm hoàn tất  
↓  
\[Hệ thống\] Kiểm tra món còn bán  
├─ Có món vừa hết → chặn, khách chọn món khác  
↓  
\[Hệ thống\] Trừ số suất còn lại, đẩy order xuống bếp  
↓  
\[Bếp\] Thấy món trong hàng đợi → Đang làm → Xong (từng món một)  
↓  
\[Hệ thống\] Bắn thông báo tới điện thoại mọi waiter đang trong ca  
↓  
\[Waiter\] Ai rảnh bấm nhận việc → bưng ra bàn → xác nhận đã phục vụ  
├─ Gọi thêm → quay lại bước chọn món,  
│ tạo order mới trong cùng phiên  
↓  
\[Khách\] Ăn xong, yêu cầu tính tiền  
↓  
\[Waiter\] Báo quầy  
↓  
\[Manager\] Mở hoá đơn phiên bàn, gộp mọi order, chọn hình thức  
↓  
├─ QR: Manager sinh mã, waiter mang tablet ra bàn,  
│ khách quét → tiền vào tài khoản thu hộ  
│ → webhook xác nhận → sổ cái ghi tạm giữ (6.6)  
└─ Tiền mặt: waiter thu hộ mang lên quầy,  
Manager ghi nhận, hệ thống lưu tên người thu  
↓  
\[Manager\] Xác nhận thanh toán, in hoá đơn (có logo và tên chuỗi)  
↓  
\[Waiter\] Mang bill và tiền thừa ra bàn, đóng phiên  
↓  
\[Hệ thống\] Bàn về trạng thái trống  
↓  
(Cuối ca)  
\[Manager\] Check-out từng nhân viên (6.5)

### 6.3. Gọi thêm giữa bữa

- Khách gọi waiter
- Waiter mang tablet ra, mở lại phiên bàn đang hoạt động, chọn gọi thêm
- Hệ thống tạo **order mới trong cùng phiên**
- Xử lý như luồng chính, thông báo chỉ gửi cho waiter đang trong ca
- Cuối bữa, hoá đơn gộp toàn bộ order của phiên thành một bill duy nhất

### 6.4. Bếp báo hết món

- Bếp bấm **Hết món**
- Hệ thống tắt món trên menu của chi nhánh, các bàn khác không gọi được nữa
- Cảnh báo bắn tới Branch Manager và mọi waiter đang trong ca
- Waiter ra bàn xin lỗi, đưa hai lựa chọn: **đổi món khác** hoặc **bỏ món khỏi hoá đơn**
- Vì chưa thu tiền, không phát sinh hoàn tiền
- Khi có nguyên liệu lại, Branch Manager hoặc bếp bật món lên

### 6.5. Ca làm, check-in, check-out

\[Manager\] Tạo ca mẫu cho chi nhánh  
(ví dụ Sáng 7:00–14:00, Tối 16:00–22:00)  
↓  
\[Manager\] Phân ca theo ngày: chọn ca, chọn waiter và bếp  
(có thể sao chép lịch tuần trước)  
↓  
\[Manager\] Đầu ca: check-in người có mặt  
(danh sách gợi ý là người có lịch hôm nay)  
├─ Người không có lịch tới làm thay  
│ → vẫn check-in, gắn cờ "ngoài lịch"  
↓  
\[Hệ thống\] Người trong ca bắt đầu nhận thông báo và cảnh báo  
↓  
\[Manager\] Nhân viên về: check-out  
├─ Người đó đang giữ việc chưa bưng → cảnh báo;  
│ vẫn check-out thì việc trả về hàng chờ chung  
↓  
\[Hệ thống\] Quá giờ kết thúc ca 15 phút chưa check-out  
→ nhắc Manager  
↓  
\[Hệ thống\] Tới giờ đóng cửa chi nhánh mà còn người trong ca  
→ tự đóng lượt làm việc theo giờ kết thúc ca  
→ gắn cờ "chờ xác nhận"  
↓  
\[Manager\] Xác nhận hoặc sửa giờ thực tế, ghi audit log

Chi tiết và lý do thiết kế ở mục 12.

### 6.6. Luồng tiền — thu hộ, tạm giữ, quyết toán, rút

\[Manager\] Mở hoá đơn phiên, chọn QR, sinh mã mang mã hoá đơn  
↓  
\[Khách\] Quét mã, chuyển khoản  
↓  
\[Cổng TT\] Tiền vào tài khoản thu hộ của nền tảng, gửi webhook  
↓  
\[Hệ thống\] Đối chiếu mã hoá đơn và số tiền → xác nhận thanh toán  
ghi bút toán TẠM GIỮ: số tiền, chi nhánh, hoá đơn,  
mức phí áp dụng  
↓  
\[Manager\] In hoá đơn; waiter đóng phiên  
↓  
(trong thời gian tạm giữ)  
├─ Tính nhầm, trừ trùng, món lỗi → Manager hoàn tiền,  
│ ghi bút toán hoàn (giai đoạn 2)  
↓  
\[Hệ thống\] Job quyết toán chạy định kỳ:  
gom giao dịch đã hết thời gian tạm giữ  
→ tính phí trên số còn lại  
→ chuyển sang KHẢ DỤNG → lập đợt quyết toán  
↓  
\[Owner\] Xem ví, tạo yêu cầu rút  
├─ Vượt số dư khả dụng hoặc dưới mức tối thiểu → chặn  
↓  
\[Hệ thống\] Giữ số tiền lại khỏi số dư khả dụng  
↓  
\[Admin\] Duyệt hoặc từ chối (kèm lý do)  
↓  
\[Admin\] Chuyển khoản tới tài khoản nhận tiền rút của Owner,  
xác nhận đã chuyển kèm mã giao dịch  
├─ Chuyển thất bại → trả tiền về số dư khả dụng,  
│ báo Owner  
↓  
\[Hệ thống\] Ghi bút toán rút, gửi email cho Owner

Tiền mặt **không** đi qua luồng này. Ví dụ tính tiền và các loại bút toán ở mục 11.

### 6.7. Hỏi đáp với trợ lý số liệu

- Owner mở trợ lý trên web, gõ câu hỏi, ví dụ _"Tuần trước chi nhánh Q7 bán bao nhiêu ly trà đào sau 20 giờ?"_
- Backend gửi câu hỏi kèm **mô tả cấu trúc các view báo cáo** tới mô hình ngôn ngữ — không gửi dữ liệu
- Mô hình trả về một truy vấn đọc
- Backend **kiểm tra** truy vấn, **tự gắn điều kiện doanh nghiệp**, rồi chạy bằng tài khoản cơ sở dữ liệu chỉ đọc
- Kết quả được gửi lại mô hình để viết một câu diễn giải ngắn
- Giao diện hiện câu trả lời, **bảng số**, khoảng thời gian đã hiểu và view đã dùng; Owner mở được truy vấn đã chạy
- Truy vấn không qua kiểm tra → sinh lại một lần → vẫn không qua thì báo không trả lời được và gợi ý cách hỏi khác
- Câu hỏi về thứ hệ thống không có dữ liệu (lợi nhuận, tồn kho, lương) → từ chối và nói rõ lý do

Chi tiết ở mục 9.

### 6.8. Nhập menu bằng ảnh _(giai đoạn 2)_

- Owner vào màn hình menu, chọn nhập bằng ảnh
- Tải lên 1–3 ảnh menu giấy
- Hệ thống gửi ảnh tới mô hình thị giác kèm lược đồ đầu ra cố định
- Nhận về bảng nháp: tên món, giá, danh mục
- **Owner xem bảng nháp, sửa, xoá dòng sai, thêm dòng thiếu**
- Bấm nhập → ghi hàng loạt vào menu chuỗi
- Nếu bóc tách thất bại, quay về nhập tay, không chặn luồng

Chi tiết ở 9.8.

### 6.9. Cấu hình nhận diện thương hiệu

- Owner vào màn hình cài đặt doanh nghiệp, chọn thẻ Nhận diện
- Tải logo, chọn màu chủ đạo (bộ dựng sẵn hoặc nhập mã màu), chọn màu nhấn, đặt tên hiển thị
- Khung xem trước bên cạnh đổi theo **ngay khi chọn**, chưa lưu
- Hệ thống kiểm tra tương phản; nếu màu chữ trên nền màu chủ đạo không đủ đọc, tự đổi màu chữ và báo cho Owner biết
- Owner bấm lưu → ghi vào bản ghi nhận diện của doanh nghiệp, ghi audit log
- Mọi client của doanh nghiệp tải lại cấu hình ở lần điều hướng kế tiếp hoặc lần đăng nhập kế tiếp
- Có nút khôi phục mặc định

Chi tiết ở mục 10.

### 6.10. Các luồng phụ

| Tình huống                                             | Xử lý                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Khách bỏ về trước khi gọi món                          | Waiter huỷ phiên, bàn về trống                                                           |
| Khách đổi ý sau khi gửi                                | Waiter sửa hoặc huỷ dòng món, chỉ khi món chưa vào trạng thái đang làm                   |
| Nhóm đông hơn sức chứa một bàn                         | Thuật toán gợi ý ghép các bàn liền kề — xem mục 8                                        |
| Không waiter nào nhận việc                             | Sau 3 phút chuyển đỏ, sau 5 phút cảnh báo Branch Manager                                 |
| Waiter đang giữ việc thì bị check-out                  | Cảnh báo Manager; nếu vẫn check-out, việc trả về hàng chờ chung                          |
| Nhân viên quên check-out                               | Quá giờ ca 15 phút nhắc Manager; tới giờ đóng cửa hệ thống tự đóng, chờ Manager xác nhận |
| Người không có lịch tới làm thay                       | Manager check-in bình thường, lượt làm việc gắn cờ ngoài lịch                            |
| Webhook không về                                       | Manager đối soát tay và xác nhận, ghi audit log                                          |
| Webhook về hai lần cho cùng giao dịch                  | Lần sau bị bỏ qua, không sinh thêm bút toán (BR-35)                                      |
| Webhook báo số tiền khác số tiền hoá đơn               | Không tự xác nhận, chuyển sang đối soát tay                                              |
| Khách bỏ về không trả tiền                             | Manager đóng phiên với lý do, ghi audit log                                              |
| Cần hoàn tiền sau khi hết thời gian tạm giữ            | Không hoàn qua hệ thống; xử lý ngoài hệ thống và ghi chú                                 |
| Owner rút quá số dư khả dụng                           | Chặn ở backend, không chỉ ẩn nút                                                         |
| Hai yêu cầu rút được tạo cùng lúc                      | Kiểm tra số dư trong transaction có khoá; yêu cầu thứ hai bị chặn nếu không đủ           |
| Chuyển khoản rút tiền thất bại                         | Yêu cầu sang _Chuyển thất bại_, tiền trả về số dư khả dụng, báo Owner                    |
| Owner đổi tài khoản nhận tiền khi còn yêu cầu đang chờ | Yêu cầu cũ giữ tài khoản đã khai lúc tạo; muốn đổi thì huỷ và tạo lại                    |
| Trợ lý nhận câu hỏi ngoài phạm vi                      | Từ chối, nói rõ hệ thống không có dữ liệu đó                                             |
| Câu hỏi cố lấy dữ liệu doanh nghiệp khác               | Backend luôn gắn doanh nghiệp của người hỏi; kết quả chỉ có dữ liệu của họ               |
| Mạng chập chờn                                         | Client tải lại trạng thái mới nhất khi có mạng, không dựng từ dữ liệu cũ                 |
| Hồ sơ đăng ký trùng mã số thuế                         | Hệ thống cảnh báo Admin, không tự chặn                                                   |
| Owner tải logo sai định dạng hoặc quá nặng             | Chặn ngay ở bước tải, báo giới hạn cụ thể, giữ logo cũ                                   |
| Owner chọn màu quá nhạt làm mất chữ                    | Hệ thống tự đổi màu chữ sang tương phản đủ, không từ chối màu của khách                  |

## 7\. Quy tắc nghiệp vụ

**Phân quyền và dữ liệu**

| Mã        | Quy tắc                                                                                                                                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BR-01** | Mọi truy vấn dữ liệu vận hành phải lọc theo doanh nghiệp. Không có ngoại lệ.                                                                                                                                                                                                          |
| **BR-02** | Nhân viên chỉ truy cập dữ liệu của chi nhánh mình được gán.                                                                                                                                                                                                                           |
| **BR-03** | Tài khoản Owner chỉ được sinh ra khi Admin duyệt hồ sơ. Không có đường tạo tắt.                                                                                                                                                                                                       |
| **BR-04** | Hồ sơ bị từ chối phải có lý do được ghi lại.                                                                                                                                                                                                                                          |
| **BR-20** | Mọi thao tác huỷ đơn, đóng phiên không thu tiền, đổi quyền, đổi giá, đổi nhận diện, duyệt/từ chối hồ sơ, đổi cấu hình phí, duyệt/từ chối/xác nhận yêu cầu rút, hoàn tiền, đổi tài khoản nhận tiền rút, sửa giờ check-in/check-out đều ghi audit log kèm người thực hiện và thời điểm. |
| **BR-21** | Platform Admin chỉ truy cập số liệu tổng hợp phục vụ tính phí và số liệu ví phục vụ quyết toán. Không truy cập nội dung đơn hàng, menu, nhân viên.                                                                                                                                    |
| **BR-22** | Doanh nghiệp hết hạn chuyển sang chế độ chỉ đọc, không khoá cứng, giữ dữ liệu tối thiểu 90 ngày. Số dư khả dụng vẫn được rút.                                                                                                                                                         |
| **BR-23** | Thao tác vượt hạn mức gói phải bị chặn tại **backend**, không chỉ ẩn nút ở frontend.                                                                                                                                                                                                  |

**Order, bếp, phục vụ**

| Mã        | Quy tắc                                                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BR-05** | Order được đẩy xuống bếp ngay khi waiter bấm hoàn tất. Không có bước duyệt trung gian.                                                                                                                  |
| **BR-06** | Món hiện trên menu khi **cả hai cờ đều bật**: cờ kinh doanh do Owner đặt ở cấp chuỗi, và cờ còn bán hôm nay do Branch Manager hoặc bếp đặt ở cấp chi nhánh. Owner tắt thì chi nhánh không bật lại được. |
| **BR-07** | **Số suất còn lại bị trừ vào lúc waiter bấm hoàn tất order**, và được cộng lại nếu dòng món bị huỷ.                                                                                                     |
| **BR-08** | Không cho thêm vào order món đang tắt hoặc đã hết suất.                                                                                                                                                 |
| **BR-09** | Dòng món chỉ được huỷ khi còn ở _Trong hàng đợi_.                                                                                                                                                       |
| **BR-10** | Bếp cập nhật trạng thái theo **từng dòng món**, không theo cả order. Món nào xong bắn thông báo món đó.                                                                                                 |
| **BR-11** | Một thông báo bưng món chỉ một waiter nhận được. Ai bấm trước thắng, backend khoá bằng transaction. Người thua nhận phản hồi rõ ràng.                                                                   |
| **BR-12** | Thông báo chờ bưng quá 3 phút chuyển cảnh báo, quá 5 phút báo lên Branch Manager.                                                                                                                       |
| **BR-24** | Thuật toán xếp bàn chỉ **gợi ý**, waiter là người quyết định cuối cùng.                                                                                                                                 |
| **BR-25** | Bàn chỉ ghép được với bàn đã được Branch Manager khai báo là liền kề, và phải cùng khu vực.                                                                                                             |

**Thanh toán tại quầy**

| Mã        | Quy tắc                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **BR-13** | **Chỉ Branch Manager mới sinh mã QR và xác nhận được thanh toán.** Waiter chỉ thu hộ, và hệ thống ghi tên người thu hộ vào giao dịch. |
| **BR-14** | Waiter chỉ đóng được phiên bàn **sau khi** phiên đã ở trạng thái _Đã thanh toán_.                                                     |
| **BR-15** | Mọi giao dịch đều in hoá đơn, kể cả tiền mặt.                                                                                         |
| **BR-16** | Mã QR thanh toán mang **mã hoá đơn duy nhất**, không đối soát chỉ bằng số tiền.                                                       |
| **BR-17** | Thanh toán, chuyển trạng thái phiên và ghi bút toán tạm giữ phải nằm trong **một transaction**.                                       |
| **BR-18** | Đơn hàng **lưu giá tại thời điểm bán**, không tham chiếu sang bảng món. Owner đổi giá không hồi tố.                                   |
| **BR-19** | Một món có **một giá duy nhất toàn chuỗi**. Không có giá riêng theo chi nhánh.                                                        |

**Ví doanh nghiệp**

| Mã        | Quy tắc                                                                                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BR-33** | Tiền giao dịch QR **luôn vào tài khoản thu hộ của nền tảng**. Không chi nhánh, Manager hay Owner nào nhận tiền QR trực tiếp.                                                                  |
| **BR-34** | **Số dư chỉ được tính ra từ sổ cái.** Bút toán chỉ thêm, không sửa, không xoá; sai thì ghi bút toán điều chỉnh. Không ai, kể cả Platform Admin, sửa trực tiếp số dư.                          |
| **BR-35** | Webhook được xử lý **idempotent** theo mã giao dịch của cổng thanh toán: nhận lại lần hai không sinh thêm bút toán. Số tiền webhook khác số tiền hoá đơn thì không tự xác nhận.               |
| **BR-36** | Tiền QR phải nằm ở trạng thái tạm giữ **đủ thời gian tạm giữ** (mặc định 24 giờ, Admin cấu hình) mới được quyết toán.                                                                         |
| **BR-37** | Mức phí dịch vụ được **chốt vào bút toán tại thời điểm thanh toán**. Admin đổi mức phí không hồi tố. Phí tính trên số tiền còn lại sau khi trừ phần đã hoàn.                                  |
| **BR-38** | Chỉ hoàn tiền giao dịch QR khi **còn trong thời gian tạm giữ**; tổng số hoàn không vượt số đã thanh toán; bắt buộc ghi lý do. Chỉ Branch Manager của chi nhánh đó thực hiện.                  |
| **BR-39** | Chỉ Owner tạo yêu cầu rút. Số tiền phải **≥ mức rút tối thiểu và ≤ số dư khả dụng** tại thời điểm tạo, kiểm tra ở backend trong transaction có khoá. Tạo yêu cầu thì số tiền bị giữ lại ngay. |
| **BR-40** | Chỉ Platform Admin duyệt, từ chối và xác nhận đã chuyển. Từ chối phải có lý do. Bị từ chối, bị huỷ hoặc chuyển thất bại thì tiền **trả về** số dư khả dụng.                                   |
| **BR-41** | Mỗi doanh nghiệp **một ví**. Mọi bút toán gắn doanh nghiệp, chi nhánh (nếu có) và chứng từ nguồn. **Tiền mặt không ghi vào ví.**                                                              |
| **BR-52** | Yêu cầu rút lưu lại **bản sao tài khoản nhận tiền tại thời điểm tạo**. Owner đổi tài khoản sau đó không ảnh hưởng yêu cầu đang xử lý.                                                         |
| **BR-53** | Job quyết toán **chạy lại không quyết toán trùng**: mỗi giao dịch chỉ thuộc tối đa một đợt quyết toán.                                                                                        |

**Ca làm và check-in / check-out**

| Mã        | Quy tắc                                                                                                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **BR-42** | Check-in và check-out do **Branch Manager** thực hiện. Hệ thống **không tự check-out** theo giờ kết thúc ca.                                                                                                                         |
| **BR-43** | **Chỉ nhân viên đang trong ca** nhận thông báo món xong và cảnh báo.                                                                                                                                                                 |
| **BR-44** | Quá giờ kết thúc ca **15 phút** chưa check-out thì nhắc Manager. Tới **giờ đóng cửa chi nhánh** mà còn người trong ca thì hệ thống tự đóng lượt làm việc theo giờ kết thúc ca, gắn cờ _chờ xác nhận_; Manager xác nhận hoặc sửa giờ. |
| **BR-45** | Check-out người **đang giữ việc chưa hoàn tất** thì cảnh báo; nếu vẫn check-out, việc đó trả về hàng chờ chung.                                                                                                                      |
| **BR-46** | Check-in người không có lịch được phép nhưng **gắn cờ ngoài lịch**. Một nhân viên không có hai lượt làm việc trùng giờ.                                                                                                              |
| **BR-47** | Ca mẫu có giờ kết thúc sau giờ bắt đầu trong cùng một ngày. Chỉ phân ca cho nhân viên đang hoạt động thuộc chi nhánh đó.                                                                                                             |
| **BR-48** | Dữ liệu ca và lượt làm việc dùng để **điều phối**, không dùng để tính lương trong phạm vi đồ án.                                                                                                                                     |

**AI**

| Mã        | Quy tắc                                                                                                                                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BR-27** | AI **không truy cập cơ sở dữ liệu trực tiếp**. Mọi lời gọi mô hình đi qua backend; ngữ cảnh gửi đi đã lọc theo doanh nghiệp; khoá API không xuất hiện ở frontend.                                                       |
| **BR-49** | Trợ lý số liệu chỉ chạy **truy vấn đọc**, chỉ trên **các view báo cáo được phép**, bằng **tài khoản cơ sở dữ liệu chỉ đọc**. Backend tự gắn điều kiện doanh nghiệp của người hỏi; mô hình không chọn được doanh nghiệp. |
| **BR-50** | **Mọi con số trong câu trả lời phải lấy từ kết quả truy vấn.** Không có kết quả thì trả lời là không có; không để mô hình tự ước lượng.                                                                                 |
| **BR-51** | Mỗi truy vấn bị giới hạn số dòng trả về và thời gian chạy. Câu hỏi, truy vấn đã chạy và câu trả lời được lưu để truy vết.                                                                                               |
| **BR-26** | _(giai đoạn 2)_ **Kết quả AI bóc tách menu không bao giờ ghi thẳng vào cơ sở dữ liệu.** Bắt buộc qua bước Owner duyệt bảng nháp.                                                                                        |

**Nhận diện thương hiệu**

| Mã        | Quy tắc                                                                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **BR-28** | **Bộ nhận diện thương hiệu thuộc về doanh nghiệp.** Mọi tài khoản thuộc doanh nghiệp đó — kể cả tài khoản tạo sau — đều nhận cùng một bộ nhận diện. Không cấu hình theo chi nhánh, không theo từng người dùng.     |
| **BR-29** | **Chỉ Owner sửa được bộ nhận diện.** Branch Manager, Waiter, Kitchen Staff chỉ nhận và hiển thị. Platform Admin không sửa nhận diện của khách hàng.                                                                |
| **BR-30** | **Màu ngữ nghĩa không chịu ảnh hưởng của màu thương hiệu.** Màu cảnh báo, màu lỗi và màu trạng thái chế biến là hằng số hệ thống. Màu thương hiệu chỉ áp cho nút chính, thanh điều hướng, liên kết và điểm nhấn.   |
| **BR-31** | Hệ thống **kiểm tra tương phản khi lưu**. Nếu tỷ lệ tương phản giữa chữ và nền màu thương hiệu dưới ngưỡng đọc được, hệ thống tự chọn màu chữ tương phản. Không cho lưu một cấu hình làm giao diện không đọc được. |
| **BR-32** | Giao diện **Platform Admin luôn giữ nhận diện của nền tảng**. Không doanh nghiệp nào áp màu lên được.                                                                                                              |

Mã quy tắc được giữ cố định để các tài liệu khác không phải sửa theo; bảng trên nhóm theo chủ đề nên số không liền nhau.

## 8\. Thuật toán xếp và ghép bàn

Đây là phần "có thuật toán" mà đề tài yêu cầu.

### 8.1. Vì sao chọn bài toán này

Bài toán xếp lịch bếp đã bị loại vì đầu vào không đo được: thời gian nấu phụ thuộc tay nghề, nguyên liệu sơ chế sẵn, nấu song song nhiều phần. Mọi con số đưa vào đều là số bịa, và một thuật toán chạy trên số bịa thì không bảo vệ được.

Bài toán xếp bàn thì ngược lại — mọi đầu vào đều **đo được chính xác**: số ghế là số ghế, bàn liền kề là do người quản lý khai báo, bàn trống hay không thì hệ thống biết.

### 8.2. Phát biểu bài toán

**Cho:** sơ đồ bàn của một chi nhánh, mỗi bàn có số ghế, khu vực, danh sách bàn liền kề. Số khách cần xếp. Thời điểm hiện tại và danh sách đặt bàn sắp tới.

**Tìm:** tập bàn tốt nhất để xếp nhóm khách này.

### 8.3. Ràng buộc bắt buộc

- Tổng số ghế của khối ≥ số khách
- Nếu dùng nhiều hơn một bàn, các bàn phải **liền kề nhau thành một khối liên thông**
- Mọi bàn trong khối phải **cùng khu vực**
- Không dùng bàn đang có khách, đang khoá, hoặc **đã có người đặt trước trong khung giờ tới**

### 8.4. Tiêu chí xếp hạng

Theo thứ tự ưu tiên:

1. **Ít ghế thừa nhất** — 8 khách vào 8 ghế hơn vào 12 ghế
2. **Ít bàn nhất** — ghép 2 bàn hơn ghép 3
3. **Bảo toàn bàn lớn** — đừng xếp nhóm 3 người vào bàn 8 ghế khi còn bàn 4 ghế trống

Tiêu chí 3 quan trọng hơn vẻ ngoài: xếp nhóm nhỏ vào bàn lớn thì lát nữa nhóm đông tới không còn chỗ. Đây là chỗ thuật toán thắng con người, vì nó nhìn được cả sơ đồ cùng lúc.

### 8.5. Cách giải

Sơ đồ thực tế 10–30 bàn, không cần thuật toán tinh vi:

1. Lọc ra các bàn khả dụng
2. Dựng đồ thị liền kề trong từng khu vực
3. Duyệt các khối bàn liền kề, **cắt tỉa ngay khi tổng ghế đã đủ** — không mở rộng khối thêm nữa
4. Chấm điểm mỗi phương án theo ba tiêu chí trên
5. Trả về **3 phương án tốt nhất** cho waiter chọn

Bước 5 là điểm thiết kế quan trọng: hệ thống **không tự xếp**. Waiter biết những thứ hệ thống không biết — bàn cạnh nhà vệ sinh, khách có trẻ nhỏ, nhóm ồn ào.

### 8.6. Dữ liệu cần thêm

Sơ đồ bàn phải lưu **quan hệ liền kề**, do Branch Manager khai báo thủ công từng cặp.

Không suy ra từ toạ độ, vì thực tế không phải cứ gần là ghép được — hai bàn cách nhau một lối đi thì nhìn gần mà không ghép được.

### 8.7. Demo

Mở sơ đồ bàn trước hội đồng, gõ số khách:

- 4 người → một bàn
- 9 người → hai bàn liền nhau được tô sáng
- 20 người → thông báo không đủ chỗ, kèm giờ dự kiến có bàn

Ba mươi giây, không cần giải thích thêm.

### 8.8. Khối lượng

Khoảng 1 tuần backend, nửa tuần frontend để hiển thị trên sơ đồ.

## 9\. AI trong sản phẩm

Hai điểm chạm, cả hai đều gọi API mô hình sẵn có qua backend, đúng ràng buộc đề tài:

- **Trợ lý hỏi đáp số liệu kinh doanh** cho Owner — _giai đoạn 1_, điểm chạm chính
- **Nhập menu bằng ảnh** — _giai đoạn 2_, xem 9.8

### 9.1. Vấn đề nó giải

Dashboard chỉ trả lời được những câu hỏi đã được vẽ sẵn thành biểu đồ. Chủ chuỗi thường muốn biết một con số cụ thể không có sẵn: _"Tuần trước chi nhánh Q7 bán bao nhiêu ly trà đào sau 20 giờ?"_, _"Tháng này chi nhánh nào có nhiều lượt khách nhất vào thứ Bảy?"_. Hiện tại họ phải nhờ người lọc báo cáo, hoặc tự xuất dữ liệu ra tính. Trợ lý trả lời những câu đó bằng **số thật** trong vài giây.

### 9.2. Trợ lý này khác "AI phân tích, gợi ý chiến lược" ở đâu

| Tiêu chí                          | Trợ lý hỏi đáp số liệu                                   | AI phân tích, gợi ý chiến lược             |
| --------------------------------- | -------------------------------------------------------- | ------------------------------------------ |
| Câu trả lời là gì                 | Một con số hoặc một bảng số lấy từ cơ sở dữ liệu         | Một lời khuyên, ví dụ "nên đẩy combo trưa" |
| Có đáp án đúng để kiểm chứng      | Có — chạy tay cùng truy vấn hoặc đối chiếu dashboard     | Không                                      |
| Phụ thuộc chất lượng dữ liệu seed | Không — số seed thì trả số seed, vẫn đúng với dữ liệu đó | Có — phân tích số bịa ra kết luận bịa      |
| Đo được để viết báo cáo           | Có — tỷ lệ trả lời đúng trên bộ câu hỏi mẫu              | Khó                                        |

Nhóm **làm cột trái, không làm cột phải**. Trợ lý không đưa lời khuyên kinh doanh; nó chỉ trả lời câu hỏi có đáp án đo được.

### 9.3. Luồng

1. Owner gõ câu hỏi bằng tiếng Việt
2. Backend gửi tới mô hình: câu hỏi, **mô tả cấu trúc các view báo cáo** (tên cột, ý nghĩa, đơn vị), ngày giờ hiện tại, vài lượt hỏi đáp gần nhất để hiểu câu hỏi nối tiếp. **Không gửi dữ liệu.**
3. Mô hình trả về **một truy vấn đọc**
4. Backend kiểm tra truy vấn theo 9.5; không qua thì yêu cầu mô hình sinh lại **một lần**
5. Backend **gắn điều kiện doanh nghiệp** của người hỏi và chạy bằng tài khoản cơ sở dữ liệu chỉ đọc
6. Kết quả gửi lại mô hình để viết **một câu diễn giải ngắn**
7. Giao diện hiện: câu trả lời, bảng số, khoảng thời gian hệ thống đã hiểu, view đã dùng; nút xem truy vấn đã chạy

### 9.4. Dữ liệu trợ lý được đọc

Trợ lý chỉ thấy **bộ view báo cáo** do nhóm định nghĩa, mỗi view đều có cột doanh nghiệp:

| View                   | Nội dung                                                          |
| ---------------------- | ----------------------------------------------------------------- |
| Doanh thu theo hoá đơn | Chi nhánh, thời điểm, hình thức thanh toán, tổng tiền             |
| Dòng món đã bán        | Chi nhánh, thời điểm, món, danh mục, số lượng, giá lúc bán        |
| Phiên bàn              | Chi nhánh, giờ mở, giờ đóng, số khách, số bàn đã dùng             |
| Thời gian phục vụ      | Chi nhánh, món, thời gian từ lúc gửi bếp tới lúc bưng             |
| Tổng hợp ví            | Số tiền QR đã thu, đã hoàn, phí, thực nhận theo ngày và chi nhánh |

Trợ lý **không** đọc được: bảng tài khoản, mật khẩu, thông tin cá nhân nhân viên, cấu hình hệ thống, audit log, dữ liệu doanh nghiệp khác.

### 9.5. Ràng buộc an toàn

- AI **không truy cập cơ sở dữ liệu trực tiếp** — chỉ đề xuất truy vấn, backend quyết định có chạy hay không (BR-27)
- Truy vấn phải là **truy vấn đọc duy nhất**: không có lệnh ghi, sửa cấu trúc, gọi hàm hệ thống, nhiều câu lệnh nối nhau
- Chỉ tham chiếu **các view trong danh sách cho phép**
- **Backend tự gắn điều kiện doanh nghiệp**, bỏ qua mọi điều kiện doanh nghiệp do mô hình tự viết (BR-49)
- Chạy bằng **tài khoản cơ sở dữ liệu chỉ đọc**, chỉ được cấp quyền trên các view — lớp chặn cuối cùng nếu bước kiểm tra có lỗ hổng
- **Giới hạn** số dòng trả về và thời gian chạy (BR-51)
- **Mọi con số trong câu trả lời lấy từ kết quả truy vấn** (BR-50)
- Lưu câu hỏi, truy vấn và câu trả lời để truy vết
- Chỉ Owner dùng được trợ lý trong phạm vi đồ án

**Phương án dự phòng (CC-04):** nếu bộ kiểm thử tấn công ở 9.7 không đạt tuyệt đối, chuyển sang cách **mô hình chỉ chọn một mẫu truy vấn có sẵn và điền tham số** (chi nhánh, món, khoảng thời gian). Kém linh hoạt hơn nhưng không còn truy vấn tự do.

### 9.6. Giới hạn đã biết

- Câu hỏi mơ hồ về thời gian (_"tuần này"_, _"dạo gần đây"_) có thể bị hiểu khác ý — luôn hiện khoảng thời gian đã hiểu để Owner kiểm tra
- Tên món viết tắt hoặc gọi theo cách riêng của quán có thể không khớp
- Câu hỏi nhiều bước phức tạp có thể không trả lời được
- Không trả lời những thứ hệ thống không có dữ liệu: lợi nhuận, tồn kho, lương, đánh giá của khách
- Mỗi câu hỏi tốn hai lần gọi mô hình — có chi phí và độ trễ

### 9.7. Đo và trình bày

- **Bộ 30 câu hỏi mẫu** có đáp án tính sẵn bằng truy vấn viết tay trên dữ liệu seed; đo **tỷ lệ trả lời đúng số liệu**
- **Bộ 10 câu hỏi ngoài phạm vi**; đo tỷ lệ từ chối đúng
- **Bộ kiểm thử tấn công**: câu hỏi cố lấy dữ liệu doanh nghiệp khác, cố xoá hoặc sửa dữ liệu, cố đọc bảng tài khoản. Yêu cầu **chặn 100%**
- Khi demo, dùng các câu hỏi đã chạy thử trước, và hỏi thêm một câu hội đồng tự đặt để thấy nó không được dàn dựng

### 9.8. Nhập menu bằng ảnh _(giai đoạn 2)_

**Vấn đề:** quán mới lên hệ thống có 60–80 món, gõ tay từng món kèm giá là rào cản thật khiến chủ quán ngại đổi phần mềm.

**Luồng:** Owner tải 1–3 ảnh menu giấy → backend gửi ảnh tới mô hình thị giác kèm **lược đồ đầu ra cố định** (tên món, giá, danh mục, mô tả ngắn) → backend kiểm tra JSON (giá là số, tên không rỗng, không trùng) → frontend hiện **bảng nháp** sửa được từng ô → Owner bấm nhập → ghi hàng loạt vào menu chuỗi.

**Ràng buộc:** kết quả không bao giờ ghi thẳng vào cơ sở dữ liệu (BR-26); bóc tách thất bại thì quay về nhập tay, không chặn onboarding.

**Giới hạn:** menu nhiều cột, ảnh nghiêng, có bóng làm giảm độ chính xác; món nhiều size giá bóc tách không đầy đủ; không xử lý menu viết tay.

**Đo:** chạy trên 10 ảnh menu thật, ghi tỷ lệ nhận đúng tên món và đúng giá. Khi demo dùng ảnh đã chuẩn bị trước.

### 9.9. Khối lượng

| Phần việc                                                  | Ước lượng |
| ---------------------------------------------------------- | --------- |
| Bộ view báo cáo và tài khoản chỉ đọc                       | ~2 ngày   |
| Bộ kiểm tra truy vấn, gắn điều kiện doanh nghiệp, giới hạn | ~2–3 ngày |
| Giao diện hỏi đáp, bảng kết quả, lịch sử                   | ~2 ngày   |
| Bộ câu hỏi mẫu và kiểm thử tấn công                        | ~1–2 ngày |
| Nhập menu bằng ảnh _(giai đoạn 2)_                         | ~2–3 ngày |

Trợ lý số liệu khoảng **1,5 tuần**, là phần AI nặng hơn hẳn nhập menu bằng ảnh — vì phần khó nằm ở an toàn dữ liệu chứ không nằm ở gọi mô hình.

## 10\. Tuỳ biến nhận diện thương hiệu theo chuỗi

### 10.1. Ý tưởng một câu

Khi hồ sơ được duyệt và tài khoản Owner được cấp, Owner tự đặt **logo, màu chủ đạo và tên hiển thị của chuỗi mình**. Mọi tài khoản sinh ra từ Owner đó — Branch Manager, Waiter, Kitchen Staff — đăng nhập vào là thấy giao diện mang màu của chuỗi, chứ không phải bản trắng đen mặc định giống hệt mọi khách hàng khác.

Đây là **white-label ở mức nhẹ**: đổi được nhận diện, không đổi được bố cục và chức năng.

### 10.2. Vì sao đáng làm — lý do nghiệp vụ, không phải lý do thẩm mỹ

Ba lý do, xếp theo sức nặng khi bảo vệ:

**Một — tablet là thứ duy nhất khách hàng cuối chạm vào.** Waiter đưa tablet cho khách xem menu và chọn món. Nếu trên đó là logo của một phần mềm lạ, quán đang để khách của mình nhìn thấy thương hiệu của nhà cung cấp phần mềm. Với quán, đó là mất mát thật. Đây là điểm khác biệt so với các POS chỉ nhân viên nhìn thấy.

**Hai — hoá đơn in ra là giấy tờ khách mang về.** Bill có logo và tên quán là chuẩn mực tối thiểu, không phải tính năng cao cấp.

**Ba — sản phẩm cho thuê theo tháng thì nhận diện riêng là câu hỏi khách hàng hỏi sớm nhất.** Một chuỗi 5 chi nhánh đã có bộ nhận diện của họ; bắt họ dùng giao diện của người khác là lý do để họ chọn đối thủ.

Và một lý do phụ có giá trị khi demo: **hai doanh nghiệp hai màu khác nhau là cách nhìn thấy được của multi-tenant.** Cô lập dữ liệu là thứ trừu tượng, phải giải thích. Đổi tài khoản mà cả giao diện đổi màu thì hội đồng thấy ngay. Xem 19.6.

### 10.3. Cấu hình gồm những gì — chốt cứng, không mở rộng

| Hạng mục              | Kiểu dữ liệu                               | Áp ở đâu                                                         | Mặc định                     |
| --------------------- | ------------------------------------------ | ---------------------------------------------------------------- | ---------------------------- |
| Logo chuỗi            | Ảnh PNG/JPG, ≤ 1 MB, khuyến nghị nền trong | Thanh điều hướng, màn đăng nhập của doanh nghiệp, đầu hoá đơn in | Logo nền tảng                |
| Màu chủ đạo           | Mã màu hex                                 | Nút chính, thanh điều hướng, liên kết, tab đang chọn             | Xám đen trung tính           |
| Màu nhấn              | Mã màu hex                                 | Badge, biểu đồ, điểm nhấn phụ                                    | Xám trung tính               |
| Tên hiển thị chuỗi    | Văn bản ≤ 50 ký tự                         | Tiêu đề trang, tiêu đề tab trình duyệt, đầu hoá đơn              | Tên doanh nghiệp trong hồ sơ |
| Ảnh nền màn đăng nhập | Ảnh ≤ 2 MB                                 | Trang đăng nhập riêng của doanh nghiệp                           | Không có — _(giai đoạn 2)_   |
| Chế độ sáng / tối     | Chọn một                                   | Toàn bộ giao diện nhân viên                                      | Sáng — _(giai đoạn 2)_       |

**Cố ý không có:** tải lên CSS tuỳ ý, đổi phông chữ, đổi bố cục màn hình, đổi nhãn nút và tên chức năng, tên miền riêng cho từng doanh nghiệp, nhận diện riêng theo từng chi nhánh. Lý do ở 19.11 và mục 20 (CC-05).

### 10.4. Áp ở những màn hình nào

| Màn hình                                     | Áp nhận diện?            | Ghi chú                                                                        |
| -------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------ |
| Web Owner                                    | Có                       | Toàn bộ                                                                        |
| Web Branch Manager — chế độ quầy và quản trị | Có                       | Toàn bộ                                                                        |
| Tablet Waiter                                | **Có — quan trọng nhất** | Khách hàng cuối nhìn thấy màn hình này                                         |
| Màn hình bếp                                 | Có, nhưng **giới hạn**   | Chỉ thanh tiêu đề và logo. Thẻ món giữ màu ngữ nghĩa — xem 10.5                |
| Hoá đơn in                                   | Có                       | Logo, tên chuỗi, kèm tên và địa chỉ chi nhánh                                  |
| Trang đăng nhập                              | Có _(giai đoạn 2)_       | Cần nhận diện được doanh nghiệp trước khi đăng nhập, ví dụ qua đường dẫn riêng |
| Email hệ thống                               | _(giai đoạn 2)_          | Logo trong email cấp tài khoản                                                 |
| Màn hình Platform Admin                      | **Không**                | Luôn giữ nhận diện nền tảng (BR-32)                                            |

### 10.5. Ràng buộc thiết kế — mục quan trọng nhất của phần này

Cho khách hàng tự chọn màu là mở một cửa để họ tự làm hỏng giao diện của chính mình. Bốn ràng buộc dưới đây là để đóng cửa đó lại mà vẫn giữ được quyền tuỳ biến.

**R1 — Tách màu thương hiệu khỏi màu ngữ nghĩa.** Hệ thống có hai họ màu:

- _Màu thương hiệu_: nút chính, thanh điều hướng, liên kết, điểm nhấn. Owner đổi được.
- _Màu ngữ nghĩa_: đỏ cảnh báo, vàng đang chờ, xanh đã xong, xám vô hiệu. **Hằng số hệ thống, Owner không đổi được.**

Lý do sống còn: màn hình bếp phân biệt trạng thái món bằng màu, người đứng bếp liếc chứ không đọc. Nếu một chuỗi chọn màu chủ đạo là đỏ và màu đó tràn vào thẻ món, bếp sẽ đọc nhầm món bình thường thành món trễ. Tuỳ biến giao diện không được phép làm hỏng vận hành (BR-30).

**R2 — Kiểm tra tương phản khi lưu.** Chủ quán chọn màu vàng nhạt làm màu nút thì chữ trắng trên nút biến mất. Hệ thống tự tính tương phản giữa chữ và nền; nếu dưới ngưỡng đọc được thì tự đổi chữ sang màu tương phản và báo cho Owner. Không từ chối màu của khách, chỉ sửa màu chữ (BR-31).

**R3 — Ưu tiên bộ màu dựng sẵn.** Cho 8 bộ màu đã phối sẵn cộng một ô nhập mã màu tự do. Phần lớn chủ quán chọn bộ sẵn, vừa nhanh vừa tránh phối màu xấu. Ô nhập tự do dành cho chuỗi đã có bộ nhận diện riêng.

**R4 — Xem trước trước khi lưu, và luôn có nút khôi phục mặc định.** Owner phải thấy kết quả trước khi áp cho cả doanh nghiệp, và phải có đường lùi.

### 10.6. Cách triển khai

**Dữ liệu.** Một bảng branding quan hệ **một–một với doanh nghiệp**: mã doanh nghiệp, đường dẫn logo, màu chủ đạo, màu nhấn, tên hiển thị, phiên bản cấu hình, thời điểm cập nhật, người cập nhật. Khi Admin duyệt hồ sơ, hệ thống sinh sẵn một bản ghi mặc định để không bao giờ có doanh nghiệp thiếu nhận diện.

**Ảnh.** Logo lưu ở dịch vụ lưu trữ tệp, cơ sở dữ liệu chỉ giữ đường dẫn. Kiểm tra định dạng và kích thước ngay ở bước tải.

**Áp vào giao diện.** Frontend không viết mã màu cứng ở bất kỳ đâu. Mọi màu đi qua **biến CSS** ở gốc tài liệu:

:root {  
\--brand-primary: #111827; ← Owner đổi được  
\--brand-accent: #6B7280; ← Owner đổi được  
\--status-waiting: #F59E0B; ← hằng số hệ thống  
\--status-done: #10B981; ← hằng số hệ thống  
\--status-late: #EF4444; ← hằng số hệ thống  
}

Đổi nhận diện chỉ là ghi lại giá trị của nhóm biến đầu. Không build lại, không nhân bản giao diện theo khách hàng.

**Nạp lúc nào.** Sau khi đăng nhập, API trả về hồ sơ người dùng **kèm nhận diện của doanh nghiệp** trong cùng một phản hồi. Client áp biến CSS trước khi render màn hình đầu tiên, tránh nhấp nháy đổi màu. Cấu hình được cache theo doanh nghiệp; mỗi lần Owner lưu thì tăng số phiên bản để client biết phải tải lại.

**Ranh giới quyền.** API ghi nhận diện chỉ chấp nhận vai trò Owner và chỉ ghi được vào doanh nghiệp của chính người gọi. Đây là một điểm kiểm thử phân quyền đáng viết test: tài khoản Branch Manager gọi thẳng API phải bị từ chối ở backend, không chỉ ẩn nút ở frontend (cùng tinh thần BR-23).

### 10.7. Khối lượng và thời điểm

| Phần việc                                                | Ước lượng                        |
| -------------------------------------------------------- | -------------------------------- |
| Backend: bảng, API đọc, API ghi, tải ảnh, kiểm tra quyền | ~0,5 ngày                        |
| Frontend: quy ước biến CSS và token màu cho toàn dự án   | ~0,5 ngày, **phải làm ở tuần 1** |
| Frontend: màn hình cấu hình, bộ màu dựng sẵn, xem trước  | ~1,5 ngày                        |
| Áp logo vào mẫu hoá đơn in                               | ~0,5 ngày                        |

Tổng khoảng **2–3 ngày**, rẻ so với giá trị thuyết trình. **Nhưng chỉ rẻ nếu quy ước biến CSS có từ tuần 1.** Nếu để tới tuần 9 mới nghĩ tới theme, cả nhóm phải đi dò từng màn hình gỡ mã màu cứng — lúc đó không còn là 2 ngày nữa. Đây là lý do việc này phải **chốt sớm dù làm sau**.

### 10.8. Giới hạn đã biết

- Không phải white-label đầy đủ: không có tên miền riêng, không đổi được phông và bố cục
- Logo nền không trong suốt sẽ lộ khối vuông trên thanh điều hướng màu — hướng dẫn trong giao diện, không xử lý ảnh tự động
- Nhận diện dùng chung toàn chuỗi, chi nhánh không có nhận diện riêng (CC-05)
- Không có bản xem trước cho từng vai trò; Owner xem trước trên giao diện của chính mình

## 11\. Ví doanh nghiệp và luồng tiền

### 11.1. Ý tưởng một câu

Nền tảng đứng giữa khách và chủ quán giống một sàn thương mại điện tử: **thu hộ** tiền QR, **tạm giữ** một thời gian ngắn, **quyết toán** vào ví doanh nghiệp sau khi trừ phí, rồi chủ quán **rút** về ngân hàng.

Khách → Nền tảng (tạm giữ) → Ví doanh nghiệp (khả dụng) → Ngân hàng

### 11.2. Vì sao làm theo mô hình này

**Một — một điểm thu cho cả chuỗi.** Không phải quản lý tài khoản nhận tiền của từng chi nhánh, không có chuyện Manager cho khách chuyển vào tài khoản cá nhân.

**Hai — có khoảng đệm để sửa sai.** Tính nhầm, khách bị trừ tiền hai lần, món lỗi phải hoàn: trong thời gian tạm giữ, hoàn tiền là một bút toán, không phải một cuộc gọi đòi lại tiền.

**Ba — nền tảng thu phí tự động.** Phí dịch vụ trừ ngay lúc quyết toán, không phải xuất hoá đơn rồi đi đòi.

**Bốn — Owner thấy rõ tiền từ đâu tới.** Sổ cái ghi từng khoản theo chi nhánh, từng đợt quyết toán ghi rõ tổng thu, đã hoàn, phí và thực nhận.

### 11.3. Khác sàn thương mại điện tử ở đâu

| Điểm              | Sàn thương mại điện tử                                         | Hệ thống này                                                                 |
| ----------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Thời gian tạm giữ | Tới khi giao hàng xong và hết hạn khiếu nại, thường nhiều ngày | Ngắn, mặc định **24 giờ** — món dùng tại chỗ, không có vận chuyển            |
| Tiền mặt          | Thu hộ qua người giao hàng, nộp lại cho sàn                    | **Không qua nền tảng**, nằm trong két chi nhánh, không tính phí              |
| Hoàn tiền         | Theo quy trình khiếu nại, trả hàng                             | Manager hoàn khi tính nhầm, trừ trùng, món lỗi — chỉ trong thời gian tạm giữ |
| Phí               | Hoa hồng, phí thanh toán, phí dịch vụ riêng                    | **Một mức phí dịch vụ thanh toán** theo phần trăm                            |
| Rút tiền          | Người bán tự rút, thường tự động                               | Owner tạo yêu cầu, **Admin duyệt và xác nhận**                               |

### 11.4. Các khoản số dư

| Khoản            | Cách tính                                                     |
| ---------------- | ------------------------------------------------------------- |
| **Tạm giữ**      | Tiền QR đã xác nhận, chưa quyết toán, trừ phần đã hoàn        |
| **Khả dụng**     | Tổng thực nhận đã quyết toán − đã rút − đang chờ rút          |
| **Đang chờ rút** | Tổng các yêu cầu rút ở trạng thái _Chờ duyệt_ hoặc _Đã duyệt_ |

**Doanh thu không bằng số dư.** Doanh thu trên dashboard gồm cả tiền mặt và chưa trừ phí; ví chỉ gồm tiền QR và đã trừ phí. Màn hình ví phải ghi rõ điều này để Owner không hỏi _"sao doanh thu 10 triệu mà ví có 6 triệu"_.

### 11.5. Sổ cái và các loại bút toán

**Mỗi nghiệp vụ ghi đúng một dòng.** Một dòng có ba cột biến động — tạm giữ, khả dụng, đang chờ rút — và một cột phí. Số dư của từng khoản là tổng của cột tương ứng.

| Loại               | Khi nào sinh                                    | Tạm giữ            | Khả dụng     | Chờ rút   | Phí    |
| ------------------ | ----------------------------------------------- | ------------------ | ------------ | --------- | ------ |
| Thu QR             | Webhook xác nhận thanh toán QR                  | \+ số tiền         |              |           |        |
| Quyết toán         | Job quyết toán, **một dòng cho mỗi giao dịch**  | − số còn lại       | \+ thực nhận |           | \+ phí |
| Giữ tiền rút       | Owner tạo yêu cầu rút                           |                    | − số rút     | \+ số rút |        |
| Trả tiền rút       | Yêu cầu bị từ chối, bị huỷ hoặc chuyển thất bại |                    | \+ số rút    | − số rút  |        |
| Rút tiền           | Admin xác nhận đã chuyển                        |                    |              | − số rút  |        |
| Hoàn tiền _(GĐ2)_  | Manager hoàn trong thời gian tạm giữ            | − số hoàn          |              |           |        |
| Điều chỉnh _(GĐ2)_ | Admin sửa sai, bắt buộc ghi lý do               | theo chiều cần sửa |              |           |        |

Với dòng quyết toán luôn có: **tạm giữ giảm = khả dụng tăng + phí**. Đây là điều kiện kiểm thử đơn giản nhất để bắt lỗi tính tiền.

### 11.6. Ví dụ

Giả định phí dịch vụ **3%**, thời gian tạm giữ 24 giờ.

**Trường hợp 1 — không hoàn tiền.** Hoá đơn 500.000đ thanh toán QR lúc 19:00 ngày 1.

| Thời điểm                       | Bút toán                       | Tạm giữ | Khả dụng |
| ------------------------------- | ------------------------------ | ------- | -------- |
| 19:00 ngày 1                    | Thu QR +500.000                | 500.000 | 0        |
| Đợt quyết toán sau 19:00 ngày 2 | Quyết toán 500.000, phí 15.000 | 0       | 485.000  |
| Owner tạo yêu cầu rút           | Giữ tiền rút 485.000           | 0       | 0        |
| Admin xác nhận đã chuyển        | Rút tiền 485.000               | 0       | 0        |

**Trường hợp 2 — hoàn một phần.** Cùng hoá đơn, lúc 21:00 ngày 1 Manager hoàn 100.000đ vì tính nhầm một món.

| Thời điểm                       | Bút toán                       | Tạm giữ | Khả dụng |
| ------------------------------- | ------------------------------ | ------- | -------- |
| 19:00 ngày 1                    | Thu QR +500.000                | 500.000 | 0        |
| 21:00 ngày 1                    | Hoàn tiền −100.000             | 400.000 | 0        |
| Đợt quyết toán sau 19:00 ngày 2 | Quyết toán 400.000, phí 12.000 | 0       | 388.000  |

Phí tính trên số còn lại sau hoàn (BR-37).

### 11.7. Quyết toán

- Job chạy định kỳ — mặc định **mỗi giờ một lần**, quyết toán các giao dịch đã đủ thời gian tạm giữ
- Mỗi lần chạy lập **một đợt quyết toán cho mỗi doanh nghiệp** có giao dịch đủ điều kiện, ghi tổng thu, đã hoàn, phí, thực nhận
- Mỗi giao dịch chỉ thuộc tối đa một đợt; chạy lại không quyết toán trùng (BR-53)
- Khi demo, Admin đặt thời gian tạm giữ xuống vài phút và có nút chạy job ngay để hội đồng thấy tiền chuyển trạng thái

Job quyết toán là **hành vi hệ thống**, không vẽ thành use case.

### 11.8. Rút tiền

- Owner khai báo tài khoản nhận tiền rút: ngân hàng, số tài khoản, tên chủ tài khoản
- Owner tạo yêu cầu: số tiền ≥ mức tối thiểu và ≤ số dư khả dụng (BR-39); hệ thống lưu bản sao tài khoản nhận tiền lúc tạo (BR-52)
- Owner được huỷ khi yêu cầu còn _Chờ duyệt_
- Admin duyệt hoặc từ chối kèm lý do
- Admin chuyển khoản **ngoài hệ thống**, quay lại xác nhận _Đã chuyển_ kèm mã giao dịch ngân hàng, hoặc đánh dấu _Chuyển thất bại_
- Mỗi lần đổi trạng thái đều gửi email cho Owner và ghi audit log

### 11.9. Pháp lý và phạm vi

Ngoài đời, giữ tiền của người khác rồi chi trả lại là **hoạt động trung gian thanh toán**, cần giấy phép theo quy định của Ngân hàng Nhà nước. Các sàn lớn làm được vì có giấy phép hoặc đi qua đối tác được cấp phép.

Trong phạm vi đồ án, ví là **mô phỏng nghiệp vụ**: cổng thanh toán QR có thể chạy môi trường thử nghiệm hoặc tài khoản thu hộ của nhóm với số tiền nhỏ (CC-03); việc chi tiền rút do Admin xác nhận thủ công. Nhóm **chủ động nêu điều này khi bảo vệ** (GĐ-13).

### 11.10. Cách triển khai

**Dữ liệu.** Bốn bảng riêng cho ví, một bảng cấu hình, và phần liên quan bên thanh toán:

- ledger_entries — sổ cái, **chỉ thêm**: doanh nghiệp, chi nhánh, loại, ba cột biến động, phí, giao dịch hoặc yêu cầu rút liên quan, người tạo, thời điểm
- settlement_batches — đợt quyết toán: tổng thu, đã hoàn, phí, thực nhận
- payout_accounts — tài khoản nhận tiền rút của doanh nghiệp
- withdrawal_requests — yêu cầu rút, trạng thái, bản sao tài khoản nhận, mã giao dịch ngân hàng
- platform_settings — một dòng cấu hình: phí, thời gian tạm giữ, mức rút tối thiểu; mỗi lần đổi ghi audit log
- payments có thêm: mức phí đã chốt, thời điểm hết tạm giữ, số đã hoàn và **đợt quyết toán** (trống khi chưa quyết toán)
- payment_webhooks — webhook đã nhận, **ràng buộc duy nhất** trên mã giao dịch của cổng

**Số dư.** Không có bảng số dư riêng. Số dư luôn là **tổng các cột biến động** trong sổ cái, lọc theo doanh nghiệp (và chi nhánh nếu cần). Ở quy mô đồ án, phép cộng này đủ nhanh, và không có bảng tổng hợp nào có thể lệch khỏi sổ cái.

**Không quyết toán trùng.** Job gán đợt quyết toán cho giao dịch bằng câu lệnh chỉ cập nhật những giao dịch **chưa có đợt**. Một giao dịch chỉ có một cột đợt, nên không thể thuộc hai đợt (BR-53).

**Đồng thời.** Tạo yêu cầu rút, hoàn tiền và quyết toán đều **khoá dòng doanh nghiệp** trong transaction trước khi tính số dư và ghi sổ. Phải có test cho hai yêu cầu rút cùng lúc và webhook tới hai lần.

**Tiền.** Lưu bằng số nguyên đồng, không dùng số thực.

### 11.11. Khối lượng

| Phần việc                                    | Ước lượng |
| -------------------------------------------- | --------- |
| Sổ cái, bút toán tạm giữ, webhook idempotent | ~3 ngày   |
| Job quyết toán, đợt quyết toán               | ~2 ngày   |
| Rút tiền: yêu cầu, duyệt, xác nhận, email    | ~2 ngày   |
| Màn hình ví Owner, màn hình tài chính Admin  | ~4 ngày   |
| Hoàn tiền _(giai đoạn 2)_                    | ~1–2 ngày |

Tổng khoảng **2 tuần người**. Sổ cái phải được thiết kế **từ tuần 4** vì bước thanh toán ở tuần 7 ghi vào đó.

### 11.12. Giới hạn đã biết

- Không đối soát tự động với sao kê ngân hàng
- Không tự động chi tiền; Admin chuyển khoản thủ công
- Không thu phí thuê bao qua ví
- Không xử lý hoá đơn thuế cho phần phí dịch vụ
- Hoàn tiền sau thời gian tạm giữ phải xử lý ngoài hệ thống

## 12\. Ca làm và check-in / check-out

### 12.1. Vì sao cần

Trạng thái _trong ca_ quyết định **ai nhận thông báo món xong** (BR-43). Muốn nhắc Manager khi nhân viên quên check-out, hệ thống phải biết **giờ kết thúc ca dự kiến** — không có ca làm thì chỉ còn mốc giờ đóng cửa chi nhánh.

Ca làm ở đây là **bản tối giản**: đủ để điều phối trong ca, không phải module nhân sự.

### 12.2. Có gì, không có gì

| Có                                                     | Không có                                      |
| ------------------------------------------------------ | --------------------------------------------- |
| Ca mẫu theo chi nhánh: tên, giờ bắt đầu, giờ kết thúc  | Tự động xếp lịch tối ưu                       |
| Phân ca theo ngày cho waiter và bếp                    | Nhân viên tự đăng ký ca, xin đổi ca, xin nghỉ |
| Sao chép lịch của tuần trước                           | Tính lương, tăng ca, phụ cấp                  |
| Check-in gợi ý theo lịch; cho phép check-in ngoài lịch | Ca qua đêm                                    |
| Check-out do Manager, cảnh báo khi còn giữ việc        | Chấm công bằng vân tay, khuôn mặt, định vị    |
| Nhắc quá giờ, tự đóng cuối ngày, Manager xác nhận      | Nhân viên tự xem lịch trên điện thoại         |
| Owner xem lịch các chi nhánh                           | Báo cáo giờ công                              |

### 12.3. Dữ liệu

- **Ca mẫu**: chi nhánh, tên ca, giờ bắt đầu, giờ kết thúc, đang dùng hay không
- **Phân ca**: ngày, ca mẫu, nhân viên
- **Lượt làm việc**: nhân viên, chi nhánh, phân ca (có thể trống), giờ vào, giờ ra, người check-in, người check-out, cờ ngoài lịch, cờ tự đóng, trạng thái

### 12.4. Vì sao không tự check-out đúng giờ kết thúc ca

Nhà hàng hay **tăng ca đột xuất** khi khách đông. Nếu hệ thống tự check-out lúc 22:00 trong khi waiter còn phục vụ, người đó ngừng nhận thông báo và món ra chậm đúng lúc cao điểm. Ngược lại, người **về sớm** vẫn bị tính là trong ca và vẫn nhận việc.

Giờ kết thúc ca chỉ là **dự kiến**; giờ nghỉ thật chỉ người ở quán biết. Vì vậy:

1. **Manager check-out** — cùng chỗ, cùng cách với check-in
2. **Hệ thống nhắc** khi quá giờ kết thúc ca 15 phút
3. **Hệ thống chốt dự phòng** tới giờ đóng cửa chi nhánh, gắn cờ _chờ xác nhận_ — chỉ để không có lượt làm việc treo sang ngày hôm sau, không coi là giờ thật
4. **Manager xác nhận hoặc sửa** giờ của lượt tự đóng, ghi audit log

Quy tắc: BR-42 đến BR-48.

### 12.5. Khối lượng

Khoảng **2 ngày backend** và **2 ngày frontend** (lưới phân ca theo tuần, danh sách check-in trong ngày). Làm cùng tuần với quản lý tài khoản nhân viên.

### 12.6. Giới hạn đã biết

- Chất lượng dữ liệu phụ thuộc Manager thao tác đúng lúc
- Không hỗ trợ ca qua đêm
- Dữ liệu ca và lượt làm việc đã đủ để sau này nối sang module tính lương, nhưng việc đó nằm ngoài phạm vi đồ án

## 13\. Danh sách use case

### 13.1. Giai đoạn 1 — bắt buộc, tuần 1–9 (46 use case)

| Mã        | Use case                                                        | Actor                 |
| --------- | --------------------------------------------------------------- | --------------------- |
| CM-01     | Đăng nhập, đăng xuất                                            | Mọi actor đã xác thực |
| CM-02     | Xem và cập nhật hồ sơ cá nhân                                   | Mọi actor đã xác thực |
| CM-03     | Đổi mật khẩu                                                    | Mọi actor đã xác thực |
| GU-01     | Nộp hồ sơ đăng ký Owner                                         | Prospective Owner     |
| PA-01     | Xem danh sách hồ sơ chờ duyệt, tìm kiếm, xem chi tiết           | Platform Admin        |
| PA-02     | Duyệt hồ sơ — sinh doanh nghiệp, ví, tài khoản Owner, gửi email | Platform Admin        |
| PA-03     | Từ chối hồ sơ và ghi lý do                                      | Platform Admin        |
| PA-04     | Xem danh sách và hồ sơ doanh nghiệp                             | Platform Admin        |
| PA-05     | Quản lý gói dịch vụ và hạn mức                                  | Platform Admin        |
| PA-06     | Gia hạn, nâng gói, tạm ngưng, kích hoạt lại                     | Platform Admin        |
| PA-07     | Đặt lại mật khẩu cho Owner                                      | Platform Admin        |
| **PA-09** | **Cấu hình phí dịch vụ, thời gian tạm giữ, mức rút tối thiểu**  | Platform Admin        |
| **PA-10** | **Duyệt, từ chối và xác nhận đã chuyển yêu cầu rút tiền**       | Platform Admin        |
| OW-01     | Quản lý chi nhánh                                               | Owner                 |
| OW-02     | Quản lý danh mục và món toàn chuỗi                              | Owner                 |
| OW-04     | Gán món cho chi nhánh, bật/tắt cấp chuỗi                        | Owner                 |
| OW-05     | Quản lý tài khoản Branch Manager                                | Owner                 |
| OW-06     | Chuyển Branch Manager sang chi nhánh khác                       | Owner                 |
| OW-07     | Dashboard so sánh doanh thu đa chi nhánh                        | Owner                 |
| **OW-08** | **Khai báo tài khoản ngân hàng nhận tiền rút**                  | Owner                 |
| OW-11     | Cấu hình bộ nhận diện thương hiệu — logo, màu, tên hiển thị     | Owner                 |
| **OW-12** | **Xem ví: số dư, sổ cái, lịch sử quyết toán**                   | Owner                 |
| **OW-13** | **Tạo và huỷ yêu cầu rút tiền**                                 | Owner                 |
| **OW-14** | **Hỏi đáp số liệu kinh doanh với trợ lý AI**                    | Owner                 |
| BM-01     | Dashboard chi nhánh                                             | Branch Manager        |
| BM-02     | Xem bàn đang phục vụ và tổng tiền tạm tính                      | Branch Manager        |
| BM-03     | Mở hoá đơn phiên bàn và sinh mã QR                              | Branch Manager        |
| BM-04     | Ghi nhận thanh toán tiền mặt, ghi người thu hộ                  | Branch Manager        |
| BM-05     | Xác nhận thanh toán và in hoá đơn                               | Branch Manager        |
| BM-06     | **Thiết kế sơ đồ bàn và khai báo bàn liền kề**                  | Branch Manager        |
| BM-07     | Bật/tắt món và đặt số suất còn lại                              | Branch Manager        |
| BM-08     | Quản lý tài khoản waiter và bếp                                 | Branch Manager        |
| BM-09     | Check-in / check-out cho waiter và bếp, xác nhận lượt tự đóng   | Branch Manager        |
| **BM-14** | **Quản lý ca mẫu của chi nhánh**                                | Branch Manager        |
| **BM-15** | **Phân ca nhân viên theo ngày**                                 | Branch Manager        |
| WT-01     | Xem sơ đồ bàn thời gian thực                                    | Waiter                |
| WT-02     | **Mở phiên bàn với gợi ý xếp bàn (thuật toán)**                 | Waiter                |
| WT-03     | Ghi order trên tablet và gửi bếp                                | Waiter                |
| WT-04     | Gọi thêm món trong phiên                                        | Waiter                |
| WT-05     | Nhận thông báo món xong và nhận việc                            | Waiter                |
| WT-06     | Xác nhận đã phục vụ món                                         | Waiter                |
| WT-07     | Báo quầy, thu tiền mặt hộ, đóng phiên đã thanh toán             | Waiter                |
| KT-01     | Xem hàng đợi, lọc theo danh mục và trạng thái                   | Kitchen               |
| KT-02     | Xem chi tiết order và ghi chú khách                             | Kitchen               |
| KT-03     | Cập nhật trạng thái từng dòng món                               | Kitchen               |
| KT-04     | Báo hết món và cập nhật số suất                                 | Kitchen               |

Mã use case được giữ cố định để các tài liệu khác không phải sửa theo; mã mới được cấp tiếp ở cuối mỗi nhóm.

### 13.2. Giai đoạn 2 — tuần 10, cắt được nếu chậm (14 use case)

| Mã    | Use case                                        | Actor          |
| ----- | ----------------------------------------------- | -------------- |
| PA-08 | Xem audit log hệ thống                          | Platform Admin |
| PA-11 | Xử lý giao dịch lệch và ghi bút toán điều chỉnh | Platform Admin |
| OW-03 | Nhập menu hàng loạt bằng ảnh (AI)               | Owner          |
| OW-09 | Xem audit log doanh nghiệp                      | Owner          |
| OW-10 | Xem trạng thái tài khoản và lịch sử gói         | Owner          |
| BM-10 | Báo cáo chi nhánh theo tuần/tháng               | Branch Manager |
| BM-11 | Nhận và quản lý đặt bàn qua điện thoại          | Branch Manager |
| BM-12 | Đối soát tay khi giao dịch lỗi                  | Branch Manager |
| BM-13 | Xem audit log chi nhánh                         | Branch Manager |
| BM-16 | Hoàn tiền giao dịch QR trong thời gian tạm giữ  | Branch Manager |
| WT-08 | Sửa hoặc huỷ món theo yêu cầu khách             | Waiter         |
| WT-09 | Xử lý khi bếp báo hết món                       | Waiter         |
| WT-10 | Xem danh sách đặt bàn                           | Waiter         |
| WT-11 | Nhận khách đã đặt bàn trước                     | Waiter         |

**Tổng: 60 use case.**

### 13.3. Đã cắt hẳn — không cam kết, không ghi vào SRS như lời hứa

Voucher và giảm giá; giá riêng theo chi nhánh; báo cáo lợi nhuận và chi phí; báo cáo giờ công; **tự động xếp lịch ca; nhân viên tự đăng ký, đổi ca, xin nghỉ; ca qua đêm**; chấm công và tính lương; xuất báo cáo ra Excel; **AI phân tích và gợi ý chiến lược kinh doanh**; dashboard kinh doanh nền tảng; khách tự order bằng điện thoại qua QR dán bàn; khách theo dõi trạng thái món; báo dọn bàn; đổi bàn và gộp bàn giữa bữa; quên mật khẩu qua email; quản lý kho nguyên liệu; máy in nhiệt; hoá đơn điện tử; **tự động chi tiền rút; đối soát tự động với sao kê ngân hàng; thu phí thuê bao qua ví; phí trên giao dịch tiền mặt**; tên miền riêng theo doanh nghiệp; tải lên CSS hoặc phông chữ tuỳ ý; nhận diện riêng theo chi nhánh.

### 13.4. Quy ước vẽ Use Case Diagram

- Vẽ **6 sơ đồ**: một tổng quan + năm sơ đồ theo actor. Không vẽ một sơ đồ khổng lồ.
- Vẽ **generalization** từ năm actor lên Authenticated User.
- &lt;<include&gt;> chỉ dùng cho hành vi **dùng lại ở nhiều use case**. Các bước tuần tự bên trong một use case viết vào luồng sự kiện, không vẽ thành bong bóng.
- **Không vẽ hành vi hệ thống thành use case**: gửi email, bắn thông báo, tính tổng tiền, **job quyết toán, nhắc check-out, tự đóng lượt làm việc** là phản ứng nội bộ. Việc giao diện hiển thị theo nhận diện của doanh nghiệp cũng vậy — chỉ OW-11 là use case.
- **Hệ thống bên ngoài** (mục 4.8) nếu vẽ thì đặt ở phía phải khung hệ thống, không kế thừa Authenticated User. Cổng thanh toán QR nối với BM-03; dịch vụ AI nối với OW-14 và OW-03.
- Use case giai đoạn 2 đánh dấu bằng nét đứt hoặc màu khác, có chú giải.

## 14\. Ma trận quyền

| Chức năng                                 | Platform Admin   | Owner          | Branch Manager   | Waiter            | Kitchen                     |
| ----------------------------------------- | ---------------- | -------------- | ---------------- | ----------------- | --------------------------- |
| Nộp hồ sơ đăng ký                         | –                | –              | –                | –                 | –                           |
| Duyệt / từ chối hồ sơ                     | Toàn quyền       | –              | –                | –                 | –                           |
| Quản lý doanh nghiệp thuê bao             | Toàn quyền       | –              | –                | –                 | –                           |
| Gói và hạn mức                            | Toàn quyền       | Xem            | –                | –                 | –                           |
| Tạo chi nhánh                             | –                | Toàn quyền     | –                | –                 | –                           |
| **Bộ nhận diện: logo, màu, tên hiển thị** | –                | **Toàn quyền** | Nhận và hiển thị | Nhận và hiển thị  | Nhận và hiển thị (giới hạn) |
| Menu: tên, ảnh, giá                       | –                | Toàn quyền     | Xem              | Xem               | Xem, không giá              |
| Nhập menu bằng ảnh (AI, GĐ2)              | –                | Toàn quyền     | –                | –                 | –                           |
| **Trợ lý AI hỏi đáp số liệu**             | –                | **Toàn quyền** | –                | –                 | –                           |
| Bật/tắt món cấp chuỗi                     | –                | Toàn quyền     | –                | –                 | –                           |
| Bật/tắt món, số suất cấp chi nhánh        | –                | Xem            | Toàn quyền       | –                 | Có                          |
| Sơ đồ bàn và bàn liền kề                  | –                | Xem            | Tạo/sửa          | Xem               | –                           |
| Tài khoản Branch Manager                  | –                | Tạo/sửa        | –                | –                 | –                           |
| Tài khoản waiter và bếp                   | –                | Xem            | Tạo/sửa          | –                 | –                           |
| **Ca mẫu và phân ca**                     | –                | Xem            | **Tạo/sửa**      | –                 | –                           |
| Check-in / check-out nhân viên            | –                | –              | Toàn quyền       | –                 | –                           |
| Mở phiên bàn, ghi order                   | –                | –              | Xem              | Toàn quyền        | –                           |
| Trạng thái chế biến                       | –                | Xem            | Xem              | Xem               | Cập nhật                    |
| Sinh mã QR thanh toán                     | –                | –              | **Toàn quyền**   | –                 | –                           |
| Xác nhận thanh toán, in bill              | –                | Xem            | **Toàn quyền**   | Thu hộ            | –                           |
| Đóng phiên đã thanh toán                  | –                | –              | Có               | Có                | –                           |
| **Hoàn tiền QR (GĐ2)**                    | –                | Xem            | **Toàn quyền**   | –                 | –                           |
| **Cấu hình phí, thời gian tạm giữ**       | **Toàn quyền**   | Xem            | –                | –                 | –                           |
| **Ví: số dư, sổ cái, quyết toán**         | Xem              | **Xem**        | –                | –                 | –                           |
| **Tài khoản nhận tiền rút**               | Xem              | **Toàn quyền** | –                | –                 | –                           |
| **Tạo, huỷ yêu cầu rút**                  | –                | **Toàn quyền** | –                | –                 | –                           |
| **Duyệt, xác nhận yêu cầu rút**           | **Toàn quyền**   | Xem            | –                | –                 | –                           |
| Đặt bàn                                   | –                | Xem            | Nhận/quản lý     | Gán khi khách đến | –                           |
| Báo cáo                                   | Số liệu tính phí | Toàn chuỗi     | Chi nhánh mình   | –                 | –                           |
| Audit log                                 | Hệ thống         | Doanh nghiệp   | Chi nhánh        | –                 | –                           |

## 15\. Phạm vi

### Trong phạm vi

Luồng đăng ký và duyệt doanh nghiệp; multi-tenant ba tầng với cô lập dữ liệu; **tuỳ biến nhận diện thương hiệu theo chuỗi**; cấu hình chi nhánh, menu, sơ đồ bàn; **ca mẫu, phân ca và check-in/check-out tối giản**; ghi order tại bàn bằng tablet; **thuật toán xếp và ghép bàn**; màn hình bếp thời gian thực cập nhật theo từng dòng món; thông báo qua Socket.IO chỉ cho người trong ca; thanh toán QR có webhook đối soát cộng tiền mặt; **ví doanh nghiệp theo mô hình thu hộ – tạm giữ – quyết toán – rút**; in hoá đơn qua trình duyệt có logo chuỗi; dashboard đa chi nhánh; **trợ lý AI hỏi đáp số liệu kinh doanh**; RBAC và audit log. Giai đoạn 2 có thêm nhập menu bằng ảnh và hoàn tiền QR.

### Ngoài phạm vi — cố ý loại trừ

| Hạng mục                                          | Lý do                                                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Hoá đơn điện tử theo quy định thuế Việt Nam       | Cần đăng ký với cơ quan thuế. **Bắt buộc nêu khi bảo vệ**                                       |
| Giấy phép trung gian thanh toán, tự động chi tiền | Cần cấp phép; trong đồ án ví là mô phỏng, Admin chi thủ công (GĐ-13)                            |
| Đối soát tự động với sao kê ngân hàng             | Cần tích hợp ngân hàng, vượt phạm vi                                                            |
| Phí trên giao dịch tiền mặt                       | Tiền mặt không đi qua nền tảng (CC-02)                                                          |
| Quản lý kho nguyên liệu                           | Cần định mức nguyên liệu và kiểm kê, là một hệ thống riêng. Thay bằng số suất còn lại ở mức món |
| Báo cáo lợi nhuận                                 | Không có dữ liệu chi phí vì không quản lý kho và không tính lương                               |
| Tính lương, chấm công để trả lương                | Dữ liệu ca đã có; nối sang module lương là mở rộng sau                                          |
| Tự động xếp lịch ca, nhân viên tự đăng ký/đổi ca  | Là bài toán riêng; đề tài đã có thuật toán xếp bàn                                              |
| AI phân tích, gợi ý chiến lược kinh doanh         | Không có đáp án đúng để kiểm chứng (9.2)                                                        |
| Chế độ hoạt động offline                          | Rủi ro cố hữu của POS đám mây, ghi nhận ở mục 16                                                |
| Voucher và chương trình khuyến mãi                | Quá phức tạp so với thời gian còn lại                                                           |
| Giá riêng theo chi nhánh                          | Làm phức tạp bảng giá và báo cáo so sánh, không đáng với quy mô 2–10 chi nhánh                  |
| **Tên miền riêng cho từng doanh nghiệp**          | Cần cấu hình DNS và chứng chỉ cho mỗi khách hàng, vượt phạm vi đồ án                            |
| **Tải lên CSS, phông chữ, đổi bố cục màn hình**   | Mỗi cấu hình tự do là một cách khách hàng tự làm hỏng giao diện. Tuỳ biến dừng ở logo, màu, tên |
| **Nhận diện riêng theo chi nhánh**                | Nhận diện là của chuỗi. Xem CC-05                                                               |
| Tích hợp giao hàng bên thứ ba                     | Không thuộc bài toán tại quán                                                                   |
| Đa ngôn ngữ, đa tiền tệ                           | Không cần cho thị trường mục tiêu                                                               |
| Tự huấn luyện mô hình AI                          | Chỉ gọi API sẵn, đúng ràng buộc đề tài                                                          |
| Máy in nhiệt                                      | In qua trình duyệt là đủ, tránh phụ thuộc phần cứng khi bảo vệ                                  |

## 16\. Giả định và giới hạn đã biết

Mục này để trả lời phản biện. **Chủ động nêu ra luôn được đánh giá cao hơn là bị phát hiện.**

**GĐ-01 — Waiter vẫn phải đứng bàn.** Mô hình tablet không tiết kiệm thời gian nhân viên ở khâu ghi order. Giá trị nằm ở khâu sau đó. Xem mục 19.1.

**GĐ-02 — Số tablet giới hạn.** Quán 12 bàn cần 2–3 tablet. Giờ cao điểm nhiều bàn cùng muốn gọi món có thể phải chờ. Đó là bài toán vận hành của quán.

**GĐ-03 — Thời gian chế biến không được mô hình hoá.** Nhóm đã cân nhắc và loại bỏ bài toán xếp lịch bếp vì thời gian nấu phụ thuộc tay nghề, sơ chế sẵn và nấu song song. Hàng đợi bếp sắp theo thứ tự nhận order.

**GĐ-04 — Bàn liền kề do người khai báo, không tự phát hiện.** Vì gần nhau về mặt hình học không có nghĩa là ghép được.

**GĐ-05 — AI không đạt 100%.** Trợ lý có thể hiểu sai câu hỏi mơ hồ; vì vậy luôn hiện khoảng thời gian đã hiểu, bảng số và truy vấn đã chạy để Owner tự kiểm tra. Tỷ lệ trả lời đúng được đo và công bố, không giấu.

**GĐ-06 — Rủi ro thất thoát tiền mặt.** Waiter thu hộ mang lên quầy. Hệ thống ghi tên người thu và in bill mọi giao dịch để truy vết, nhưng không loại bỏ được rủi ro hoàn toàn.

**GĐ-07 — Khách bỏ về không trả tiền.** Hệ quả cố hữu của mô hình trả sau, mọi nhà hàng đều chịu. Hệ thống chỉ ghi nhận và cảnh báo.

**GĐ-08 — Mất internet là ngừng bán.** Rủi ro cố hữu của POS đám mây, không xử lý trong phạm vi đồ án.

**GĐ-09 — Không xuất hoá đơn điện tử theo quy định thuế.** Đã biết và cố ý loại trừ.

**GĐ-10 — Việc bán hàng và ký hợp đồng diễn ra ngoài hệ thống.** Hệ thống chỉ nhận hồ sơ và cho Admin duyệt; phí thuê bao tháng thu ngoài hệ thống, không trừ qua ví.

**GĐ-11 — Tuỳ biến nhận diện là white-label mức nhẹ, không phải white-label đầy đủ.** Đổi được logo, màu, tên hiển thị. Không đổi được tên miền, phông chữ, bố cục, nhãn chức năng.

**GĐ-12 — Màu do khách hàng chọn có thể xấu.** Hệ thống bảo đảm _đọc được_, không bảo đảm _đẹp_. Bộ màu dựng sẵn là cách giảm rủi ro, không phải cách loại bỏ.

**GĐ-13 — Ví doanh nghiệp là mô phỏng nghiệp vụ trung gian thanh toán.** Vận hành thật cần giấy phép. Trong đồ án, cổng thanh toán có thể chạy môi trường thử nghiệm và việc chi tiền rút là Admin xác nhận thủ công.

**GĐ-14 — Tiền về tay chủ quán chậm hơn.** Thời gian tạm giữ cộng thời gian duyệt rút làm tiền QR về ngân hàng của Owner chậm ít nhất một ngày. Đổi lại là có khoảng đệm để sửa sai.

**GĐ-15 — Quán có động cơ đẩy khách trả tiền mặt để tránh phí.** Chấp nhận vì phí thấp và nền tảng vẫn có phí thuê bao; xem CC-02.

**GĐ-16 — Dữ liệu ca phụ thuộc Manager thao tác đúng lúc.** Quên check-in thì nhân viên không nhận việc; quên check-out thì hệ thống nhắc và chốt dự phòng, nhưng giờ thật vẫn phải do Manager xác nhận.

**GĐ-17 — Không hỗ trợ ca qua đêm.** Quán mở qua 0 giờ phải chia thành hai ca.

## 17\. Rủi ro

| Rủi ro                                                                     | Mức        | Cách xử lý                                                                                                                                    |
| -------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Không kịp 60 use case trong 11 tuần                                        | **Cao**    | Bám phân kỳ mục 13, giai đoạn 2 cắt được nguyên khối                                                                                          |
| **Số dư ví sai do xử lý đồng thời hoặc webhook trùng**                     | **Cao**    | Transaction khoá dòng doanh nghiệp, ràng buộc duy nhất trên mã giao dịch, số dư luôn tính từ sổ cái, test đồng thời                           |
| **Trợ lý AI sinh truy vấn lấy dữ liệu doanh nghiệp khác hoặc ghi dữ liệu** | **Cao**    | Danh sách view cho phép, tài khoản chỉ đọc, backend tự gắn doanh nghiệp, bộ kiểm thử tấn công; không đạt thì chuyển sang mẫu truy vấn (CC-04) |
| Webhook lỗi hoặc trễ ngày bảo vệ                                           | Cao        | Chuẩn bị nút xác nhận thủ công dự phòng, tập trước                                                                                            |
| Cô lập dữ liệu bị rò do quên điều kiện lọc                                 | Cao        | Ép lọc ở tầng repository, không để từng câu truy vấn tự lo                                                                                    |
| **Màu cứng rải rác trong mã, tới tuần 9 mới làm theme**                    | **Cao**    | Chốt quy ước biến CSS và token màu **ngay tuần 1**; review mã có bắt lỗi màu cứng                                                             |
| Hội đồng hỏi về tính pháp lý của ví                                        | Trung bình | Chủ động nêu GĐ-13 trước khi bị hỏi                                                                                                           |
| API AI chậm hoặc lỗi ngày bảo vệ                                           | Trung bình | Chuẩn bị bộ câu hỏi đã chạy thử, lưu sẵn kết quả để trình bày dự phòng                                                                        |
| **Màu thương hiệu đè lên màu trạng thái, bếp đọc sai**                     | Trung bình | Tách hai họ màu từ đầu (BR-30), viết test giao diện cho màn bếp với hai bộ màu khác nhau                                                      |
| **Màu khách chọn làm chữ không đọc được**                                  | Trung bình | Kiểm tra tương phản khi lưu, tự chọn màu chữ (BR-31), ưu tiên bộ màu dựng sẵn                                                                 |
| Tranh chấp khi hai waiter cùng nhận việc                                   | Trung bình | Cập nhật có điều kiện trong transaction, viết test riêng                                                                                      |
| Ghép hai nhánh làm song song ở tuần 8 vỡ                                   | Trung bình | Thống nhất hợp đồng API từ tuần 1, tích hợp sớm từng phần                                                                                     |
| Không đủ thiết bị demo                                                     | Trung bình | Cần tối thiểu 1 tablet, 1 điện thoại, 2 laptop chạy song song                                                                                 |
| Mạng không ổn định ngày bảo vệ                                             | Trung bình | Phát wifi từ điện thoại, seed sẵn dữ liệu                                                                                                     |

## 18\. Lịch 11 tuần

| Tuần | Việc                                                                                                                                                                           | Ai        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| 1    | Dựng khung, ERD, xác thực, RBAC ba tầng, thống nhất hợp đồng API, **chốt quy ước biến CSS và token màu**                                                                       | Cả nhóm   |
| 2    | Multi-tenant, luồng đăng ký + duyệt hồ sơ, Platform Admin, gói và hạn mức                                                                                                      | BE1 + FE1 |
| 3    | Owner: chi nhánh, menu, tài khoản Branch Manager, **cấu hình nhận diện (OW-11)**                                                                                               | BE1 + FE1 |
| 3    | Branch Manager: sơ đồ bàn, bàn liền kề, tài khoản nhân viên, **ca mẫu, phân ca, check-in/check-out**                                                                           | BE2 + FE2 |
| 4    | Thuật toán xếp bàn và hiển thị gợi ý trên sơ đồ                                                                                                                                | BE2 + FE2 |
| 4    | **Thiết kế sổ cái ví, cấu hình phí, tài khoản nhận tiền rút**                                                                                                                  | BE1       |
| 5    | Phiên bàn, màn ghi order trên tablet                                                                                                                                           | BE1 + FE1 |
| 5    | **Bộ view báo cáo cho dashboard và trợ lý AI**                                                                                                                                 | BE2       |
| 6    | Màn hình bếp, hàng đợi theo dòng món, cập nhật trạng thái                                                                                                                      | BE2 + FE2 |
| 6    | Socket.IO, thông báo **chỉ cho người trong ca**, cơ chế nhận việc                                                                                                              | BE1 + FE1 |
| 7    | Thanh toán: hoá đơn phiên, QR vào tài khoản thu hộ, **webhook idempotent, bút toán tạm giữ**, tiền mặt, in bill **có logo chuỗi**                                              | BE1 + FE2 |
| 8    | **Chạy trọn luồng đầu cuối, sửa lỗi tích hợp**                                                                                                                                 | Cả nhóm   |
| 9    | **Job quyết toán, ví Owner, rút tiền, màn hình tài chính Admin**                                                                                                               | BE1 + FE1 |
| 9    | **Trợ lý AI hỏi đáp số liệu**, dashboard Owner, báo cáo chi nhánh                                                                                                              | BE2 + FE2 |
| 10   | Giai đoạn 2 (nhập menu bằng ảnh, hoàn tiền, đặt bàn, audit log), **seed hai doanh nghiệp với hai bộ nhận diện khác nhau**, **kiểm thử đồng thời cho ví**, kiểm thử đa thiết bị | Cả nhóm   |
| 11   | Tài liệu, tập demo, dự phòng                                                                                                                                                   | Cả nhóm   |

**Mốc sinh tử là hết tuần 8.** Nếu tuần 8 chưa chạy được trọn luồng từ mở bàn tới thu tiền, in bill và ghi bút toán tạm giữ, phải cắt toàn bộ giai đoạn 2 và dồn sức vào luồng chính. Một luồng chạy mượt hoàn chỉnh luôn ăn điểm hơn tám tính năng làm dở.

**Lưu ý về ví:** sổ cái phải được **thiết kế ở tuần 4**, vì bước thanh toán tuần 7 ghi vào đó. Job quyết toán và rút tiền để tuần 9 được vì chúng chỉ đọc sổ cái đã có.

**Lưu ý về AI:** trợ lý xếp ở tuần 9 vì cần view báo cáo và dữ liệu thật từ luồng chính. Bộ view làm từ tuần 5 nên nếu Review cần thấy AI sớm, dựng bản thử trên dữ liệu seed ngay sau tuần 5.

**Lưu ý về nhận diện:** quy ước biến CSS ở tuần 1 là **bắt buộc**, màn hình cấu hình ở tuần 3 là **nên**. Nếu tuần 3 quá tải thì đẩy màn hình cấu hình sang tuần 9, nhưng quy ước biến CSS thì không được đẩy.

## 19\. Câu hỏi hội đồng dễ hỏi

### 19.1. "Waiter vẫn phải ra bàn ghi order, vậy phần mềm giải quyết được gì?"

Vẫn tốn thời gian nhân viên đứng bàn, đúng. Nhưng bỏ được toàn bộ khâu phía sau: không phải chạy vào bếp đưa giấy, không viết tay sai món, không quên bàn nào gọi gì, bếp không phải luận chữ, tiền tính tự động không cộng nhầm, và chủ ở nhà vẫn thấy được doanh thu từng chi nhánh, tiền QR của cả chuỗi về một ví có sổ cái rõ ràng. Thời gian tiết kiệm nằm ở phía sau quầy chứ không nằm ở bàn.

### 19.2. "Sao không cho khách tự order bằng điện thoại?"

Nhóm đã thiết kế phương án đó và loại bỏ. Lý do: mã QR dán bàn cho phép người ở bàn khác hoặc người đi ngang quét và đặt món cho bàn không phải của mình, mà mô hình trả sau không có cơ chế thanh toán để chặn lại. Đưa tablet qua tay nhân viên là cách bịt lỗ hổng đó triệt để.

### 19.3. "Phần thuật toán ở đâu?"

Bài toán xếp và ghép bàn, mục 8. Nhóm đã cân nhắc bài toán xếp lịch bếp trước đó nhưng loại bỏ vì đầu vào không đo được.

### 19.4. "AI ở đâu, và làm sao biết nó đúng?"

Trợ lý hỏi đáp số liệu cho Owner, mục 9. Nó kiểm chứng được: mỗi câu trả lời đi kèm bảng số, khoảng thời gian đã hiểu và truy vấn đã chạy, đối chiếu được với dashboard. Nhóm đo trên bộ 30 câu hỏi có đáp án tính sẵn và công bố tỷ lệ trả lời đúng. Giai đoạn 2 có thêm nhập menu bằng ảnh, cũng đo trên ảnh thật.

### 19.5. "Sao không dùng AI phân tích doanh thu, gợi ý chiến lược?"

Nhóm đã cân nhắc và loại bỏ. Gợi ý chiến lược không có đáp án đúng để đối chiếu nên không đo được chất lượng, và phân tích trên dữ liệu seed chỉ ra kết luận không kiểm chứng được. Trợ lý của nhóm chỉ trả lời câu hỏi có đáp án đo được — nó không khuyên, nó tra.

### 19.6. "Multi-tenant thể hiện ở đâu?"

Demo nộp hồ sơ, Admin duyệt, tài khoản Owner sinh ra ngay tại chỗ. Đăng nhập bằng tài khoản đó, cho thấy không gian dữ liệu trống trơn và không thấy gì của doanh nghiệp còn lại.

Và có một cách nhìn thấy được bằng mắt: hai doanh nghiệp đã seed sẵn mang hai bộ nhận diện khác nhau. Đăng nhập doanh nghiệp A ra giao diện cam với logo A, đăng nhập doanh nghiệp B ra giao diện xanh với logo B, dữ liệu hai bên không dính nhau. Cô lập dữ liệu là thứ phải giải thích; đổi màu cả giao diện là thứ hội đồng thấy ngay.

### 19.7. "Sao không có quản lý kho?"

Kho nguyên liệu cần định mức nguyên liệu cho từng món và kiểm kê định kỳ — là một module độc lập, trong ngành thường được bán tách riêng. Nhóm đánh giá vượt khối lượng cho phép và cố ý loại trừ, thay bằng cơ chế số suất còn lại để giải quyết phần rủi ro trực tiếp nhất là khách gọi phải món đã hết.

### 19.8. "Không có hoá đơn điện tử thì quán dùng thật sao được?"

Đúng, đây là giới hạn đã biết. Hoá đơn điện tử cần đăng ký với cơ quan thuế và tích hợp nhà cung cấp được cấp phép, nằm ngoài khả năng thực hiện của đồ án. Hệ thống in hoá đơn bán hàng nội bộ, không thay thế hoá đơn thuế.

### 19.9. "Tại sao waiter được đóng phiên mà không được xác nhận thanh toán?"

Hai việc khác nhau. Xác nhận thanh toán là quyết định tiền đã vào hay chưa, thuộc người đứng quầy. Đóng phiên là thao tác dọn dẹp sau khi tiền đã vào, để bàn về trống — waiter đang đứng ở bàn nên tiện làm. Hệ thống chặn không cho đóng phiên nếu phiên chưa ở trạng thái đã thanh toán (BR-14).

### 19.10. "Đổi logo với đổi màu thì có gì đáng gọi là tính năng?"

Ba điểm.

Về nghiệp vụ: tablet là thiết bị duy nhất khách hàng cuối chạm vào, và hoá đơn in là giấy tờ khách mang về. Để logo của nhà cung cấp phần mềm ở hai chỗ đó là quán đang cho khách của mình xem thương hiệu người khác.

Về kỹ thuật: nó không phải đổi một biến. Phải tách hai họ màu — màu thương hiệu đổi được, màu ngữ nghĩa là hằng số — nếu không thì màu chuỗi tràn vào thẻ món và bếp đọc sai trạng thái. Phải kiểm tra tương phản khi lưu để khách không tự tạo ra nút không đọc được. Phải nạp cấu hình theo tenant ngay lúc khởi tạo phiên để giao diện không nhấp nháy đổi màu. Và phải chặn ở backend để tài khoản không phải Owner không gọi được API ghi.

Về kiến trúc: nó là hệ quả trực tiếp của multi-tenant. Một bản triển khai phục vụ nhiều khách hàng, mỗi khách hàng một nhận diện — đây chính là chỗ chứng minh dữ liệu và cấu hình được phân tách theo doanh nghiệp.

### 19.11. "Sao không cho chủ quán sửa CSS hoặc đổi bố cục luôn?"

Mỗi ô cấu hình tự do là một cách để khách hàng tự làm hỏng giao diện, và phần hỏng đó nhóm phải hỗ trợ. Giới hạn ở logo, màu và tên hiển thị bao phủ gần hết nhu cầu thật của quán ăn với chi phí thấp và rủi ro gần bằng không. Mở tới CSS thì phải trả lời câu hỏi giao diện hỏng là lỗi của ai.

### 19.12. "Nhận diện đặt ở cấp chuỗi hay cấp chi nhánh?"

Cấp chuỗi. Lý do là một chuỗi có một thương hiệu — đó là ý nghĩa của từ chuỗi. Cho từng chi nhánh một màu riêng thì phá chính thứ khách hàng đang trả tiền để có. Điểm này ghi ở CC-05 và nhóm chọn dứt khoát, không để mở.

### 19.13. "AI tự viết truy vấn, lỡ nó xoá dữ liệu hoặc lấy dữ liệu quán khác thì sao?"

Có bốn lớp chặn. Backend chỉ chấp nhận một truy vấn đọc trên các view được phép. Backend tự gắn điều kiện doanh nghiệp của người hỏi, bỏ qua mọi điều kiện mô hình tự viết. Truy vấn chạy bằng tài khoản cơ sở dữ liệu chỉ có quyền đọc các view đó — kể cả khi bước kiểm tra có lỗ hổng thì lệnh ghi cũng bị cơ sở dữ liệu từ chối. Và nhóm có bộ kiểm thử tấn công với yêu cầu chặn 100%. Nếu không đạt, nhóm chuyển sang cách mô hình chỉ chọn mẫu truy vấn có sẵn.

### 19.14. "Sao không cho tiền về thẳng tài khoản chủ quán cho đơn giản?"

Đó là phương án nhóm cân nhắc đầu tiên. Cách đó đơn giản nhưng mất hai thứ: không có khoảng đệm để hoàn tiền khi tính nhầm, và nền tảng phải đi đòi phí giao dịch. Mô hình thu hộ – tạm giữ – quyết toán giải cả hai, đổi lại tiền về tay chủ quán chậm hơn khoảng một ngày (GĐ-14).

### 19.15. "Nền tảng giữ tiền của quán có hợp pháp không?"

Ngoài đời thì cần giấy phép trung gian thanh toán. Trong đồ án, ví là mô phỏng nghiệp vụ: cổng thanh toán có thể chạy môi trường thử nghiệm và việc chi tiền rút do Admin xác nhận thủ công (GĐ-13). Nhóm tập trung vào đúng phần nghiệp vụ: sổ cái, tạm giữ, quyết toán, rút.

### 19.16. "Làm sao chắc số dư không sai, không cộng tiền hai lần?"

Số dư không phải một con số được sửa đi sửa lại, mà là tổng của sổ cái chỉ thêm (BR-34). Webhook có ràng buộc duy nhất theo mã giao dịch nên tới hai lần cũng chỉ ghi một bút toán (BR-35). Tạo yêu cầu rút và quyết toán đều chạy trong transaction có khoá (BR-39, BR-53), và nhóm có test riêng cho các tình huống đồng thời.

### 19.17. "Sao hệ thống không tự check-out khi hết ca?"

Vì giờ kết thúc ca chỉ là dự kiến. Nhà hàng hay tăng ca đột xuất; tự check-out đúng giờ thì waiter đang phục vụ bị ngắt thông báo đúng lúc đông khách. Hệ thống chỉ nhắc khi quá giờ và chốt dự phòng lúc đóng cửa, có gắn cờ để Manager xác nhận (12.4).

### 19.18. "Có ca làm rồi sao không tính lương luôn?"

Tính lương kéo theo hệ số, tăng ca, phụ cấp, khấu trừ — là một module nhân sự riêng. Ca làm trong hệ thống tồn tại để điều phối trong ca. Dữ liệu ca và lượt làm việc đã được lưu đủ, nên nối sang tính lương sau này là mở rộng, không phải làm lại.

## 20\. Điểm chưa chốt

Ghi ra để không quên, không phải để lơ lửng tới tuần 8.

**CC-01 — Mức phí và thời gian tạm giữ.** Đề xuất: một mức phí dịch vụ thanh toán theo phần trăm; thời gian tạm giữ **24 giờ**; mức rút tối thiểu cố định. Cần thầy và nhóm chốt con số cụ thể. Các giá trị này là cấu hình của Admin nên đổi được mà không sửa mã.

**CC-02 — Có tính phí trên tiền mặt không.** Đề xuất **không**: tiền mặt không đi qua nền tảng. Phương án ngược lại là tính phí trên doanh thu tiền mặt và trừ vào số dư ví — phải xử lý số dư âm khi quán ít giao dịch QR, nên không làm trong phạm vi đồ án.

**CC-03 — Cổng thanh toán thật hay môi trường thử nghiệm khi demo.** Nếu dùng thật thì tài khoản thu hộ đứng tên ai, và giới hạn số tiền demo bao nhiêu.

**CC-04 — Trợ lý AI dùng truy vấn tự do hay mẫu truy vấn.** Đề xuất: truy vấn tự do trên danh sách view cho phép, có bốn lớp chặn (9.5). Nếu bộ kiểm thử tấn công không đạt 100% trước tuần 9, chuyển sang mẫu truy vấn có tham số.

**CC-05 — Nhận diện có tách theo chi nhánh không.** Bản này chốt là **không** — một chuỗi một nhận diện (BR-28). Nếu sau này có nhu cầu thật, cấu trúc bảng đã sẵn sàng để thêm một lớp ghi đè ở cấp chi nhánh mà không phải sửa lại phần đã làm. **Không mở trong phạm vi đồ án.**

**CC-06 — Trang đăng nhập có mang nhận diện riêng không.** Muốn được thì phải biết doanh nghiệp _trước khi_ người dùng đăng nhập, tức là cần đường dẫn riêng cho từng doanh nghiệp. Hiện xếp vào giai đoạn 2. Nếu cắt thì trang đăng nhập giữ nhận diện nền tảng — chấp nhận được.

**CC-07 — Ai đóng phiên bàn.** Bản này giao cho waiter (WT-07), Manager xác nhận thanh toán xong là xong. Nếu nhóm thấy Manager nên đóng luôn thì bỏ bước này khỏi waiter và sửa BR-14.

**CC-08 — Mốc nhắc và mốc tự đóng lượt làm việc.** Đề xuất nhắc sau **15 phút** quá giờ kết thúc ca và tự đóng tại **giờ đóng cửa chi nhánh**. Nếu chi nhánh không khai giờ đóng cửa thì dùng mốc 23:59.

**CC-09 — Báo cáo giờ có mặt.** Dữ liệu lượt làm việc đã đủ để làm báo cáo số giờ có mặt theo nhân viên. Đề xuất **chưa làm**, để tránh bị hiểu là chấm công tính lương.

## 21\. Việc phải làm ngay

1. Thay toàn bộ tài liệu cũ bằng bản này. Không để bản cũ lưu hành song song
2. Sửa file đăng ký đề tài: thanh toán theo mô hình **thu hộ – tạm giữ – quyết toán – rút**; thuật toán là xếp và ghép bàn; AI là **trợ lý hỏi đáp số liệu** (nhập menu bằng ảnh ở giai đoạn 2); có tuỳ biến nhận diện và xếp ca tối giản
3. Vẽ lại Use Case Diagram theo mục 13 và quy ước 13.4 — sáu sơ đồ, thêm các use case ví, ca làm, trợ lý AI, và các hệ thống bên ngoài
4. Vẽ Activity/Swimlane Diagram cho các luồng: khách vào tới khách ra (6.2), cấp tài khoản (6.1), luồng tiền (6.6), ca làm (6.5)
5. Thiết kế ERD, chú ý: bảng hồ sơ đăng ký tách khỏi bảng doanh nghiệp; lưu giá tại thời điểm bán; bảng quan hệ bàn liền kề; bảng nhận diện quan hệ một–một với doanh nghiệp; **sổ cái chỉ thêm, webhook có ràng buộc duy nhất, đợt quyết toán, yêu cầu rút, tài khoản nhận tiền rút, cấu hình nền tảng**; **ca mẫu, phân ca, lượt làm việc**; **bộ view báo cáo và lịch sử hỏi đáp của trợ lý**
6. **Chốt quy ước biến CSS và token màu ngay tuần 1** — tách rõ màu thương hiệu và màu ngữ nghĩa, cấm mã màu cứng trong mã nguồn
7. Chốt các điểm ở mục 20 trước tuần 2