# Yêu cầu chức năng Admin Platform — MDUC247

> Ngày lập: 26/10/2026 · Phiên bản tài liệu: 1.0 · Trạng thái: Đề xuất triển khai.
>
> Tài liệu mô tả đích phát triển, không xác nhận các chức năng đề xuất đã tồn tại. Hiện trạng được đối chiếu từ mã nguồn và tài liệu trong repository; không thay thế kết quả nghiệm thu môi trường thực tế. Không chứa thông tin đăng nhập, mật khẩu hoặc khóa tích hợp.

## Mục lục

1. [Mục tiêu, cách đọc và ưu tiên](#1-mục-tiêu-cách-đọc-và-ưu-tiên)
2. [Hiện trạng và ranh giới phạm vi](#2-hiện-trạng-và-ranh-giới-phạm-vi)
3. [Quy tắc bắt buộc xuyên suốt](#3-quy-tắc-bắt-buộc-xuyên-suốt)
4. [Vai trò, quyền hạn và phê duyệt](#4-vai-trò-quyền-hạn-và-phê-duyệt)
5. [Đăng nhập và quản lý phiên](#5-đăng-nhập-và-quản-lý-phiên)
6. [Quản lý nhân sự quản trị](#6-quản-lý-nhân-sự-quản-trị)
7. [Dashboard và hàng chờ công việc](#7-dashboard-và-hàng-chờ-công-việc)
8. [Quản lý người dùng](#8-quản-lý-người-dùng)
9. [Quản lý cửa hàng và người bán](#9-quản-lý-cửa-hàng-và-người-bán)
10. [Sản phẩm và kiểm duyệt hàng hóa](#10-sản-phẩm-và-kiểm-duyệt-hàng-hóa)
11. [Danh mục, thương hiệu và thuộc tính](#11-danh-mục-thương-hiệu-và-thuộc-tính)
12. [Tồn kho và giữ hàng](#12-tồn-kho-và-giữ-hàng)
13. [Đơn hàng](#13-đơn-hàng)
14. [Giao nhận và COD](#14-giao-nhận-và-cod)
15. [Trả hàng, khiếu nại và tranh chấp](#15-trả-hàng-khiếu-nại-và-tranh-chấp)
16. [Thanh toán và đối soát](#16-thanh-toán-và-đối-soát)
17. [Hoàn tiền](#17-hoàn-tiền)
18. [Phí sàn và thanh toán cho người bán](#18-phí-sàn-và-thanh-toán-cho-người-bán)
19. [Báo cáo vi phạm và kiểm duyệt nội dung](#19-báo-cáo-vi-phạm-và-kiểm-duyệt-nội-dung)
20. [Hỗ trợ khách hàng](#20-hỗ-trợ-khách-hàng)
21. [Voucher, khuyến mãi và Flash Sale](#21-voucher-khuyến-mãi-và-flash-sale)
22. [Trang chủ, nội dung và thư viện ảnh](#22-trang-chủ-nội-dung-và-thư-viện-ảnh)
23. [Thông báo và email](#23-thông-báo-và-email)
24. [Chat và chatbot](#24-chat-và-chatbot)
25. [Báo cáo, tìm kiếm và xuất dữ liệu](#25-báo-cáo-tìm-kiếm-và-xuất-dữ-liệu)
26. [Nhật ký và dữ liệu cá nhân](#26-nhật-ký-và-dữ-liệu-cá-nhân)
27. [Cấu hình sàn và chính sách](#27-cấu-hình-sàn-và-chính-sách)
28. [Theo dõi hệ thống và xử lý lỗi](#28-theo-dõi-hệ-thống-và-xử-lý-lỗi)
29. [Yêu cầu giao diện và khả năng sử dụng](#29-yêu-cầu-giao-diện-và-khả-năng-sử-dụng)
30. [API và phân chia trách nhiệm service](#30-api-và-phân-chia-trách-nhiệm-service)
31. [Mô hình dữ liệu đề xuất](#31-mô-hình-dữ-liệu-đề-xuất)
32. [Hiệu năng và vận hành](#32-hiệu-năng-và-vận-hành)
33. [Kịch bản kiểm thử và nghiệm thu](#33-kịch-bản-kiểm-thử-và-nghiệm-thu)
34. [Lộ trình và điều kiện hoàn thành](#34-lộ-trình-và-điều-kiện-hoàn-thành)
35. [Quyết định nghiệp vụ cần chốt](#35-quyết-định-nghiệp-vụ-cần-chốt)
36. [Nguồn đối chiếu](#36-nguồn-đối-chiếu)

## 1. Mục tiêu, cách đọc và ưu tiên

### 1.1. Mục tiêu

- Có một nơi để theo dõi, điều tra và xử lý hoạt động sàn xuyên suốt người dùng → cửa hàng → sản phẩm → đơn → thanh toán → hậu mãi.
- Chuyển các thao tác vận hành thường xuyên từ CLI hoặc API nội bộ sang giao diện có phân quyền, xác nhận và lịch sử.
- Giúp nhân viên xác định việc cần làm tiếp theo, người chịu trách nhiệm và thời hạn xử lý.
- Bảo vệ tính đúng đắn của đơn hàng, tiền, tồn kho và quyền truy cập khi nhiều người xử lý đồng thời.
- Phát triển tiếp kiến trúc Identity, Catalog, Order, Payment, Engagement và Chat hiện có; chỉ thêm thành phần khi có nhu cầu rõ ràng.

### 1.2. Mức ưu tiên

| Mức | Ý nghĩa                                                          | Điều kiện triển khai                                             |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| P0  | Cần cho vận hành có giao dịch thật hoặc bảo vệ nghiệp vụ cốt lõi | Hoàn thành trước khi mở phạm vi vận hành tương ứng               |
| P1  | Tăng khả năng xử lý, giảm công việc thủ công                     | Làm sau nền tảng P0 và khi có người sử dụng thực tế              |
| P2  | Nâng cao, tối ưu hoặc phục vụ quy mô lớn hơn                     | Chỉ làm khi số liệu hoặc mô hình kinh doanh chứng minh cần thiết |

P0 không có nghĩa tất cả các mục phải triển khai trong một đợt. Ví dụ: chức năng quyết toán cho người bán chỉ trở thành bắt buộc khi sàn thực sự giữ và chi trả tiền cho người bán.

### 1.3. Quy ước theo dõi

- Mã `ADM-<NHÓM>-<SỐ>` là mã yêu cầu để liên kết issue, PR, API và kịch bản kiểm thử.
- Ô `[ ]` là yêu cầu cần triển khai hoặc nâng cấp; không tự đánh dấu xong chỉ vì có một phần backend.
- Mỗi yêu cầu hoàn thành phải có giao diện cần thiết, API, phân quyền, xử lý lỗi và bằng chứng nghiệm thu tương ứng.
- Các giới hạn, thời hạn và ngưỡng mới trong tài liệu là đề xuất; phải cấu hình hoặc chốt trước khi nghiệm thu.
- Các trạng thái mới là mô hình nghiệp vụ đề xuất; cần ánh xạ sang enum/schema thực tế trước khi lập trình.
- Nhóm hiện trạng ở mục 2 mô tả mã nguồn đang có; danh sách yêu cầu phía sau mô tả phần phát triển tiếp.

## 2. Hiện trạng và ranh giới phạm vi

### 2.1. Hiện trạng gốc khi lập tài liệu

Đây là mốc trước các đợt triển khai CASE. Tiến độ mới nhất và các chức năng đã nghiệm thu nằm ở mục 2.3.

| Khu vực    | Hiện có                                                                         | Phần cần phát triển tiếp                                                                        |
| ---------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Đăng nhập  | Trang `/admin/login`, kiểm tra `platform_admin`, access token và refresh cookie | MFA, quyền theo nghiệp vụ, quản lý nhân sự và phiên admin                                       |
| Dashboard  | Tổng người dùng/shop/sản phẩm/đơn, biểu đồ 7 ngày, 5 đơn gần đây                | Khoảng ngày, số liệu tài chính đúng nguồn, cảnh báo và hàng chờ có thể mở xử lý                 |
| Người dùng | Tìm kiếm, lọc vai trò/trạng thái, phân trang, chi tiết, khóa/khôi phục, lịch sử | Phiên, ghi chú hỗ trợ, tra cứu liên quan và hồ sơ yêu cầu dữ liệu                               |
| Cửa hàng   | Danh sách, chi tiết, tạm ngừng/khôi phục, lịch sử                               | Xét duyệt hồ sơ theo chính sách, vi phạm, hiệu quả và công việc cần xử lý                       |
| Sản phẩm   | Danh sách, biến thể, giá/tồn, ẩn/khôi phục, lịch sử                             | Hàng chờ kiểm duyệt, báo cáo vi phạm, chính sách đăng bán và kháng nghị                         |
| Đơn hàng   | Danh sách/chi tiết, snapshot, item, trạng thái, tiền hoàn và lịch sử            | Timeline liên service, trả hàng/tranh chấp, cảnh báo quá hạn và thao tác nghiệp vụ có kiểm soát |
| Nhật ký    | Nhật ký Identity và Catalog, tìm kiếm, loại đối tượng, phân trang               | Lọc thời gian/người xử lý, sự kiện từ các module mới và xuất có kiểm soát                       |
| Trang chủ  | Menu, danh mục nổi bật, banner, thứ tự khối, ghim sản phẩm/shop                 | Upload media, lên lịch, so sánh/khôi phục phiên bản, quy trình duyệt nội dung                   |
| Danh mục   | Tạo danh mục gốc/con từ trình biên tập trang chủ                                | Quản lý cây, sửa, đổi vị trí và ngừng sử dụng có kiểm tra tham chiếu                            |
| Trả hàng   | Order có nghiệp vụ trả hàng và retry hoàn tiền                                  | Chưa có không gian xử lý dành riêng cho admin                                                   |
| Thanh toán | Payment có giao dịch, hoàn tiền, webhook và đối soát nội bộ                     | Chưa có bộ màn hình quản trị tài chính tương ứng                                                |
| Khuyến mãi | Engagement có voucher/Flash Sale và API nội bộ cho voucher sàn                  | Chưa có màn admin quản lý chiến dịch toàn sàn                                                   |
| Chat       | Có báo cáo hội thoại được lưu ở backend                                         | Chưa có hàng chờ xử lý báo cáo dành cho admin                                                   |

### 2.2. Phạm vi dự kiến

- **Đợt đầu:** nền tảng quyền và audit; hậu mãi; thanh toán/hoàn tiền; hàng chờ vi phạm; mở rộng tra cứu và cảnh báo.
- **Đợt tiếp theo:** quản lý danh mục, khuyến mãi, hỗ trợ, báo cáo, nội dung và thông báo.
- **Phụ thuộc nghiệp vụ tương lai:** tích hợp hãng vận chuyển, phí sàn/quyết toán, hóa đơn/chứng từ, ví nội bộ, xác minh người bán chuyên sâu và tự động đánh giá rủi ro.
- Không mặc định triển khai ví, AI kiểm duyệt, Kafka, công cụ BI riêng hoặc service mới chỉ để hoàn thành tài liệu này.
- Những tính năng tương lai không được hiển thị như đã hoạt động; có thể ẩn menu cho tới khi module sẵn sàng.

### 2.3. Tiến độ CASE-001 đến CASE-018 — 26/10/2026

Đã hoàn thành và nghiệm thu local 18 yêu cầu ADM-CASE-001 đến ADM-CASE-018. Không có mã CASE-000 trong tài liệu. Chỉ đánh dấu `[x]` theo phạm vi của chính yêu cầu; không suy diễn rằng các quy tắc xuyên suốt mọi module đã hoàn thành.

| Mã yêu cầu   | Trạng thái       | Đã có                                                                                                                             | Còn thiếu                                                                       |
| ------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| ADM-CASE-001 | Hoàn thành local | Danh sách trả hàng/khiếu nại, trạng thái, lý do, shop, người phụ trách, hạn, phương thức thanh toán và khoảng ngày                | Không còn trong phạm vi yêu cầu này                                             |
| ADM-CASE-002 | Hoàn thành local | Liên kết shop order, item, lượng, buyer/shop, chứng cứ, nội dung/phương án khách yêu cầu và tiền đủ điều kiện                     | Hồ sơ tranh chấp tài chính đầy đủ thuộc các yêu cầu khác                        |
| ADM-CASE-003 | Hoàn thành local | Return/ticket/dispute dùng bảng và state machine riêng, có liên kết cùng đơn                                                      | CASE-014 được nghiệm thu riêng ở đợt mở rộng                                    |
| ADM-CASE-004 | Hoàn thành local | Giữ policy 7 ngày, lấy lần giao đầu, lưu version/ngày giao/window; chặn bypass từ client                                          | Giao diện đổi policy là phạm vi cấu hình sau này                                |
| ADM-CASE-005 | Hoàn thành local | Quyền đề nghị/duyệt riêng, hai actor độc lập, lý do/version, kiểm tra lại quyền và số lượng/tiền khi duyệt                        | Cần cấp quyền qua CLI cho nhân sự được giao; không tự cấp cho tài khoản hiện có |
| ADM-CASE-006 | Hoàn thành local | Lock order, giới hạn lượng/tiền đã/chờ hoàn, tính theo snapshot, round nguyên và giải phóng đúng khi từ chối rồi đóng             | Không còn trong phạm vi yêu cầu này                                             |
| ADM-CASE-007 | Hoàn thành local | Scope theo assignee/giám sát, grant dùng một lần 60 giây gắn actor/case/image, kiểm tra lại khi tải; validation/quét ảnh và audit | Không còn trong phạm vi yêu cầu này                                             |
| ADM-CASE-008 | Hoàn thành local | Prompt theo buyer/seller có hạn, notification outbox, trả lời từ đơn, lịch sử append-only và kiểm tra đúng bên nhận               | Không còn trong phạm vi yêu cầu này                                             |
| ADM-CASE-009 | Hoàn thành local | Nhận việc/phân công, chuyển cấp, ghi chú nội bộ và thông báo đúng bên nhận tách riêng, có audit/idempotency                       | Không còn trong phạm vi yêu cầu này                                             |
| ADM-CASE-010 | Hoàn thành local | Policy, bên chịu trách nhiệm, lý do, căn cứ và tham chiếu chứng cứ; snapshot/version                                              | Không còn trong phạm vi yêu cầu này                                             |
| ADM-CASE-011 | Hoàn thành local | Receipt/inspection trước mở refund; nghĩa vụ tiền chỉ hoàn tất theo xác nhận Payment                                              | Không coi quyết định là tiền đã chuyển                                          |
| ADM-CASE-012 | Hoàn thành local | FULL/PARTIAL, tiền hàng/ship, tổng đã hoàn và snapshot/prorate nguồn                                                              | Không có sửa tiền tùy ý                                                         |
| ADM-CASE-013 | Hoàn thành local | Mốc gửi/nhận, inspection, pending refund và lệnh can thiệp khi seller quá hạn                                                     | Quá hạn không thay chứng cứ đã nhận hàng                                        |
| ADM-CASE-014 | Hoàn thành local | Tường trình/ảnh hai bên, đề xuất cố định, duyệt độc lập, người duyệt/thời điểm, nghĩa vụ riêng                                    | Không phát giao dịch tiền từ công bố quyết định                                 |
| ADM-CASE-015 | Hoàn thành local | Assignee có quyền hậu mãi tiếp tục xử lý khi shop/chủ shop bị khóa; metadata kiểm tra chỉ đọc                                     | Không kích hoạt lại shop/tài khoản seller                                       |
| ADM-CASE-016 | Hoàn thành local | Guard trạng thái/version, idempotent callback, từ chối receipt muộn; mở lại sau kháng nghị phải giữ lại lượng/tiền hợp lệ         | Không đảo ngược tiền đã chi                                                     |
| ADM-CASE-017 | Hoàn thành local | Hạn nhận appeal, người xét độc lập, kết quả/căn cứ; giữ quyết định cũ và đánh giá lại rõ ràng                                     | Không sửa âm thầm quyết định đã phát hành                                       |
| ADM-CASE-018 | Hoàn thành local | Báo cáo nguyên nhân, thời gian xử lý, tỷ lệ appeal accepted/đã xét theo shop/category snapshot                                    | Snapshot cũ thiếu category giữ UNKNOWN                                          |

Tại thời điểm chốt CASE, các quy tắc ADM-CORE-003/004/005 và phần liên quan của ADM-UX-005/006 đã được thực hiện, kiểm thử trong module trả hàng: lý do/actor/version, chống xử lý đồng thời, rollback khi audit lỗi và tải lại khi xung đột. Phần CORE xuyên suốt được triển khai và nghiệm thu tiếp ở mục 2.4; không suy diễn tiến độ các mã UX ngoài phạm vi đó.

Đợt này vẫn dùng role `platform_admin` cùng permission riêng cho ngoại lệ, giám sát chứng cứ, duyệt tranh chấp, xét appeal và can thiệp hậu mãi; chưa hoàn tất G0 (RBAC/MFA), tự động hóa SLA toàn sàn hoặc console settlement tiền thật. Bằng chứng: 44 test PostgreSQL/HTTP/CLI đạt, 6 test notification đạt; Edge desktop/mobile qua các luồng người duyệt độc lập, buyer appeal, người xét lại độc lập, can thiệp receipt/refund và báo cáo; build/lint các màn/API được kiểm tra đạt. Xem [CASE-001..008](Backend/docs/admin-cases.md) và [CASE-009..018, quyền/API/trạng thái](Backend/docs/case-resolution.md). Đây là nghiệm thu local, chưa triển khai production; callback tiền dùng nguồn test, không chi tiền thật.

**Rà soát chốt lần cuối — 26/10/2026:** Giữ trạng thái hoàn thành local **18/18 ADM-CASE** sau khi chạy lại toàn bộ 44 test PostgreSQL/HTTP/CLI (không skip), 6 test notification, 14 test frontend về phiên/quyền admin và Edge desktop/mobile. Ba điều kiện nghiệm thu mục 15 đều đạt. Đã kiểm tra migration thực tế, template thông báo, quét ảnh bằng ClamAV đang chạy và dọn fixture. Không phát hiện lỗi chặn chốt trong phạm vi này. Typecheck toàn frontend còn 22 lỗi đã có ngoài các file CASE; build và lint các file được kiểm tra đạt. Xem [biên bản chốt ADM-CASE](Backend/docs/adm-case-final-acceptance.md) để đối chiếu từng mã và giới hạn nghiệm thu.

### 2.4. ADM-CORE-001 đến ADM-CORE-015 — 27/10/2026

Đã triển khai và nghiệm thu local **15/15 quy tắc CORE trong các module Admin Platform hiện có**. Bổ sung command receipt chống lặp, lý do/version/correlation trong audit, transaction cho từ chối ngoại lệ, giữ tham chiếu actor, che PII tại API và loại lỗi dependency thô. Storefront yêu cầu lý do khi lưu/xuất bản/tạo danh mục. Lệnh hủy đơn chưa bàn giao của seller bị khóa dùng permission riêng `orders.cancel_blocked`, intent/retry của Order và hoàn tiền qua Payment; quyền này không tự cấp cho nhân sự hiện có.

Kết quả: 15 test PostgreSQL/HTTP quản trị, 11 test Storefront, 45 test CASE và 24 test auth/Payment/frontend đạt; hồi quy Catalog đạt 8 bài (bài Storefront PostgreSQL chạy riêng). Edge desktop/mobile đạt phần che dữ liệu, lý do bắt buộc, mất nguồn thống kê, phiên và quyền frontend. Build và lint file thay đổi đạt; typecheck toàn frontend còn 22 lỗi cũ ngoài các file CORE thay đổi. Migration đã áp dụng trên stack phát triển local. Chi tiết từng mã, policy nghĩa vụ còn mở, hợp đồng API, cách cấp quyền và giới hạn bằng chứng nằm ở [biên bản ADM-CORE](Backend/docs/admin-core.md).

Các ô CORE hoàn thành bên dưới xác nhận phạm vi hiện có; quy tắc vẫn bắt buộc cho mọi module mới và phải được nghiệm thu lại khi mở module đó. Không xác nhận production, MFA/RBAC toàn sàn hoặc giao dịch hoàn tiền thật đã được nghiệm thu.

## 3. Quy tắc bắt buộc xuyên suốt

- [x] **ADM-CORE-001 — P0:** Mọi API admin kiểm tra danh tính và quyền hiện tại tại backend; ẩn nút ở frontend không thay thế kiểm tra quyền.
- [x] **ADM-CORE-002 — P0:** Giữ nguyên khả năng khóa người dùng, chặn shop/sản phẩm và chống seller tự bỏ chặn đang có.
- [x] **ADM-CORE-003 — P0:** Mutation quan trọng phải có lý do, người thực hiện, đối tượng, phiên bản đã đọc và kết quả cuối cùng.
- [x] **ADM-CORE-004 — P0:** Kiểm tra phiên bản hoặc điều kiện trạng thái trong transaction để chặn hai admin ghi đè hoặc duyệt cùng một việc.
- [x] **ADM-CORE-005 — P0:** Ghi thay đổi và audit trong cùng transaction tại service sở hữu; nếu audit bắt buộc lỗi thì không hoàn tất thay đổi đó.
- [x] **ADM-CORE-006 — P0:** Với hành động nhiều service, dùng command/event có mã tương quan và retry; không coi transaction cục bộ là transaction toàn hệ thống.
- [x] **ADM-CORE-007 — P0:** Lệnh tiền, hoàn tiền, duyệt hồ sơ và tác vụ có tác dụng phụ phải có cơ chế chống thực hiện lặp khi bấm lại hoặc retry.
- [x] **ADM-CORE-008 — P0:** Không sửa trực tiếp số tiền đơn, đánh dấu đã thanh toán hoặc ép trạng thái hoàn tiền chỉ từ giao diện; thực hiện qua nghiệp vụ của service sở hữu.
- [x] **ADM-CORE-009 — P0:** Không xóa cứng đơn, giao dịch, hoàn tiền, quyết định kiểm duyệt hoặc audit đang cần truy vết.
- [x] **ADM-CORE-010 — P0:** Tách dữ liệu nguồn khỏi bản tổng hợp; lỗi tải hiển thị lỗi/chưa có dữ liệu, không thay bằng mock hoặc số 0.
- [x] **ADM-CORE-011 — P0:** Tiền được lưu/xử lý bằng số nguyên và đúng đơn vị hợp đồng hiện có. VND hiện được UI hiển thị trực tiếp; không tự nhân/chia 100 vì tên trường có hậu tố `Minor`.
- [x] **ADM-CORE-012 — P0:** Lưu thời điểm theo UTC, hiển thị mặc định `Asia/Bangkok`; định nghĩa ranh giới ngày rõ ràng khi lọc và tổng hợp.
- [x] **ADM-CORE-013 — P0:** Khóa shop/tài khoản phải có quy tắc xử lý đơn, hoàn tiền và yêu cầu hỗ trợ đang tồn tại; không để việc chặn giao dịch mới làm mất khả năng hoàn tất nghĩa vụ cũ.
- [x] **ADM-CORE-014 — P0:** Dữ liệu cá nhân được che mặc định; chỉ mở phần cần thiết theo quyền và mục đích xử lý.
- [x] **ADM-CORE-015 — P0:** Không đưa secret nội bộ, token, mật khẩu, chuỗi kết nối hoặc dữ liệu webhook nguyên bản chứa thông tin nhạy cảm vào frontend/log xuất cho nhân viên.

**Nghiệm thu:** thiếu quyền bị từ chối ở API; mutation lỗi không để lại trạng thái nửa chừng; request lặp không tạo giao dịch hoặc quyết định thứ hai; chức năng mới không phá luồng buyer/seller hiện có.

## 4. Vai trò, quyền hạn và phê duyệt

### 4.1. Vai trò nghiệp vụ đề xuất

| Vai trò              | Công việc chính                                      | Giới hạn mặc định                                           |
| -------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| Quản trị hệ thống    | Quản lý nhân sự, quyền, cấu hình quan trọng          | Không mặc nhiên được duyệt chính yêu cầu tài chính mình tạo |
| Vận hành sàn         | Theo dõi shop, đơn và điều phối công việc            | Không đổi quyền nhân sự hoặc tự xác nhận tiền               |
| Chăm sóc khách hàng  | Ticket, khiếu nại, tra cứu đơn theo vụ việc          | Không xem hàng loạt thông tin thanh toán hoặc sửa giao dịch |
| Kiểm duyệt           | Sản phẩm, shop, review, báo cáo chat và kháng nghị   | Không xuất dữ liệu tài chính hoặc đọc toàn bộ hội thoại     |
| Tài chính            | Thanh toán, hoàn tiền, đối soát và quyết toán nếu có | Không sửa nội dung bán hàng hoặc tự cấp quyền               |
| Marketing            | Voucher, Flash Sale, ngân sách khuyến mãi được giao  | Không xuất danh sách người dùng hoặc đọc khiếu nại riêng tư |
| Biên tập nội dung    | Trang chủ, banner, danh mục và bài hướng dẫn         | Không quản lý giao dịch hoặc danh tính người dùng           |
| Kiểm tra/đọc báo cáo | Số liệu và audit trong phạm vi được giao             | Chỉ đọc; xuất dữ liệu là quyền tách biệt                    |

### 4.2. Yêu cầu quyền

- [x] **ADM-RBAC-001 — P0:** Chuyển kiểm tra một role chung sang permission rõ ràng, có kế hoạch tương thích tài khoản `platform_admin` hiện có.
- [x] **ADM-RBAC-002 — P0:** Tách quyền `read`, `create`, `update`, `moderate`, `approve`, `execute`, `export`, `view_sensitive` theo tài nguyên.
- [x] **ADM-RBAC-003 — P0:** Không mặc định mở quyền khi thêm module/permission mới; phải có mapping vai trò và xác nhận phạm vi.
- [x] **ADM-RBAC-004 — P0:** Một người có thể có nhiều vai trò nhưng vẫn chịu ràng buộc không tự duyệt; thay đổi quyền phải thu hồi hoặc làm mới hiệu lực phiên phù hợp.
- [ ] **ADM-RBAC-005 — P0:** Luồng phê duyệt hai người áp dụng cho hoàn tiền ngoại lệ, thay tài khoản nhận tiền và thao tác vượt ngưỡng; ngưỡng được cấu hình, không hardcode tùy tiện. (chưa có module , tạm thời để trống)
- [x] **ADM-RBAC-006 — P0:** Kiểm tra quyền cả khi tạo, duyệt và thực thi; quyền bị thu hồi giữa các bước phải ngăn bước tiếp theo.
- [x] **ADM-RBAC-007 — P0:** Duyệt phải gắn đúng đối tượng, số tiền, người nhận và phiên bản. Sửa các dữ liệu này làm mất hiệu lực phê duyệt cũ.
- [x] **ADM-RBAC-008 — P1:** Có phạm vi theo nhóm xử lý, loại vụ việc hoặc shop phụ trách khi cần; scope phải được thực thi ở truy vấn backend.
- [x] **ADM-RBAC-009 — P1:** Giao diện xem trước quyền hiệu lực của một nhân viên, nêu quyền nhận từ vai trò nào và các giới hạn liên quan.

**Cập nhật 27/10/2026:** Đã triển khai và kiểm thử RBAC cho các module quản trị hiện có; xem [mapping, migration, cấu hình và bằng chứng](Backend/docs/admin-rbac.md). `ADM-RBAC-005` còn mở vì chưa có module thay tài khoản nhận tiền; thao tác này đang bị từ chối. Ngoại lệ hoàn tiền và các thao tác hiện có vượt ngưỡng đã có phê duyệt hai người. Cần cấu hình `ADMIN_AUTHORIZATION_TOKEN` chung cho Identity/Order và bootstrap vai trò quản trị nhân sự qua operator; chưa tự cấp thêm quyền cho tài khoản thật.

**Nghiệm thu:** nhân viên CSKH không gọi được API hoàn tiền; biên tập không xuất người dùng; người tạo yêu cầu không tự duyệt bằng một vai trò khác trong cùng tài khoản.

## 5. Đăng nhập và quản lý phiên

- [ ] **ADM-AUTH-001 — P0:** Bổ sung MFA cho tài khoản admin; có thể bắt đầu bằng TOTP, kèm luồng đăng ký, xác minh và mã khôi phục dùng một lần.
- [ ] **ADM-AUTH-002 — P0:** Chỉ cấp phiên admin đầy đủ sau khi hoàn tất MFA; token bước xác thực phải ngắn hạn, đúng mục đích và không dùng gọi API nghiệp vụ.
- [ ] **ADM-AUTH-003 — P0:** Có xác thực lại cho đổi quyền, đổi MFA, xem dữ liệu đặc biệt nhạy cảm và hành động tài chính theo chính sách.
- [ ] **ADM-AUTH-004 — P0:** Giới hạn số lần thử đăng nhập, MFA và khôi phục; thông báo lỗi không làm lộ tài khoản tồn tại hay cấu hình xác thực.
- [ ] **ADM-AUTH-005 — P0:** Định nghĩa thời hạn phiên và thời gian không hoạt động; frontend cảnh báo trước khi hết phiên và không tự gửi lại mutation sau đăng nhập.
- [ ] **ADM-AUTH-006 — P0:** Admin xem được phiên/thiết bị của chính mình, thời điểm hoạt động và thu hồi từng phiên hoặc toàn bộ phiên.
- [ ] **ADM-AUTH-007 — P0:** Đổi mật khẩu, khóa nhân sự hoặc thay đổi quyền quan trọng phải có chính sách thu hồi phiên đang tồn tại.
- [ ] **ADM-AUTH-008 — P0:** Đăng xuất xóa phiên máy chủ/cookie theo cấu hình hiện có và xóa dữ liệu admin đã cache phía ứng dụng.
- [ ] **ADM-AUTH-009 — P0:** Khôi phục MFA cần bằng chứng danh tính/quy trình phê duyệt, thu hồi phiên cũ và thông báo cho chủ tài khoản; CSKH không được đọc secret MFA.
- [ ] **ADM-AUTH-010 — P1:** Ghi sự kiện đăng nhập thành công/thất bại, đăng nhập từ thiết bị mới và thay đổi bảo mật vào nhật ký an ninh.
- [ ] **ADM-AUTH-011 — P1:** Hỗ trợ passkey hoặc SSO nội bộ khi đội vận hành cần, sau khi có thiết kế tương thích và phục hồi tài khoản.

**Nghiệm thu:** token chưa qua MFA không vào `/admin`; mã khôi phục dùng lại bị từ chối; mất quyền có hiệu lực ở backend mà không cần chờ người dùng tải lại trang.

## 6. Quản lý nhân sự quản trị

- [ ] **ADM-STAFF-001 — P0:** Danh sách nhân viên với tên, email, vai trò, trạng thái, MFA, lần hoạt động gần nhất và người cấp quyền.
- [ ] **ADM-STAFF-002 — P0:** Mời nhân viên qua liên kết một lần có hạn; không gửi mật khẩu rõ qua email hoặc tạo mật khẩu dùng chung.
- [ ] **ADM-STAFF-003 — P0:** Gán/thu hồi vai trò qua quy trình có lý do, người duyệt nếu cần và audit; không dùng form hồ sơ buyer để nâng quyền.
- [ ] **ADM-STAFF-004 — P0:** Không tự nâng quyền, tự duyệt yêu cầu cấp quyền hoặc vô hiệu hóa quản trị viên cuối cùng có khả năng khôi phục hệ thống.
- [ ] **ADM-STAFF-005 — P0:** Khi nhân viên nghỉ hoặc bị khóa: thu hồi phiên, gỡ phân công và chuyển công việc đang mở cho người/nhóm phụ trách.
- [ ] **ADM-STAFF-006 — P1:** Quyền tạm thời có ngày hết hạn, người bảo trợ và lịch sử; hết hạn được kiểm tra phía server.
- [ ] **ADM-STAFF-007 — P1:** Cấu hình nhóm hỗ trợ, nhóm kiểm duyệt, ca trực và trưởng nhóm; chỉ thêm lịch ca khi có nhu cầu vận hành.

## 7. Dashboard và hàng chờ công việc

### 7.1. Tổng quan

- [ ] **ADM-DASH-001 — P0:** Lọc hôm nay, 7/30 ngày và khoảng tùy chọn; hiển thị múi giờ và thời điểm dữ liệu cập nhật.
- [ ] **ADM-DASH-002 — P0:** Bấm thẻ số liệu, lát biểu đồ hoặc đơn gần đây mở đúng danh sách/chi tiết với bộ lọc được giữ lại.
- [ ] **ADM-DASH-003 — P0:** Hiển thị đơn quá hạn xử lý, trả hàng chờ xử lý, hoàn tiền lỗi/chờ xác minh và báo cáo vi phạm chưa phân công.
- [ ] **ADM-DASH-004 — P0:** Mỗi chỉ số có định nghĩa: đếm shop order hay checkout group; theo ngày tạo hay ngày thanh toán; có loại đơn hủy hay không.
- [ ] **ADM-DASH-005 — P0:** Tách giá trị đặt hàng, tiền thanh toán thành công, tiền hoàn thành công và doanh thu phí sàn nếu nghiệp vụ đã có.
- [ ] **ADM-DASH-006 — P1:** So sánh cùng độ dài kỳ trước, thể hiện giá trị tuyệt đối khi kỳ trước bằng 0; không hiển thị phần trăm vô nghĩa.
- [ ] **ADM-DASH-007 — P1:** Theo vai trò chỉ hiển thị số liệu có quyền xem; CSKH không mặc nhiên thấy doanh thu toàn sàn.
- [ ] **ADM-DASH-008 — P1:** Chỉ rõ module lỗi hoặc số liệu đang trễ; có nút thử lại theo khu vực thay vì làm mất toàn bộ dashboard.

### 7.2. Hàng chờ

- [ ] **ADM-QUEUE-001 — P0:** Danh sách việc cần xử lý gồm loại, mức ưu tiên, đối tượng, người/nhóm phụ trách, hạn xử lý và trạng thái.
- [ ] **ADM-QUEUE-002 — P0:** Nhận việc, phân công, chuyển nhóm và ghi lý do chuyển; xử lý trường hợp hai người cùng nhận.
- [ ] **ADM-QUEUE-003 — P0:** Bộ lọc việc của tôi, chưa phân công, quá hạn, cần phản hồi và chờ phê duyệt.
- [ ] **ADM-QUEUE-004 — P0:** Có quy tắc SLA theo loại việc; phân biệt thời hạn phản hồi và giải quyết, ghi rõ lúc nào đồng hồ tạm dừng.
- [ ] **ADM-QUEUE-005 — P1:** Nhắc hạn và chuyển cấp cho trưởng nhóm; tránh tạo nhiều thông báo trùng cho cùng một mốc.
- [ ] **ADM-QUEUE-006 — P1:** Khối “Cần chú ý” ưu tiên việc admin có thể hành động; tách bản nháp sản phẩm và tài khoản chờ xác minh thành số liệu tham khảo.

## 8. Quản lý người dùng

- [ ] **ADM-USER-001 — P0:** Tra cứu theo ID, tên, email và dữ liệu liên hệ được phép; dữ liệu nhạy cảm không đưa toàn bộ vào danh sách.
- [ ] **ADM-USER-002 — P0:** Hồ sơ liên kết cửa hàng sở hữu, đơn, ticket, khiếu nại và quyết định kiểm duyệt; mỗi liên kết kiểm tra quyền module đích.
- [ ] **ADM-USER-003 — P0:** Bổ sung lý do chuẩn cho khóa/khôi phục, phạm vi hạn chế, thời hạn nếu khóa tạm thời và số lần vi phạm.
- [ ] **ADM-USER-004 — P0:** Hiển thị tác động trước khi khóa: phiên sẽ thu hồi, đơn đang xử lý và yêu cầu hậu mãi còn mở.
- [ ] **ADM-USER-005 — P0:** Giữ quy tắc không bỏ qua xác minh email khi khôi phục; không cho admin tùy ý đặt trạng thái đã xác minh.
- [ ] **ADM-USER-006 — P0:** Không có nút xem mật khẩu, token hoặc mã OTP; hỗ trợ gửi luồng đặt lại mật khẩu theo quyền và giới hạn tần suất.
- [ ] **ADM-USER-007 — P1:** Ghi chú nội bộ có tác giả/thời gian, chỉ nhóm được giao xem; không lẫn với nội dung gửi khách hàng.
- [ ] **ADM-USER-008 — P1:** Tiếp nhận kháng nghị khóa tài khoản, dẫn tới quyết định gốc và người đánh giá khác khi chính sách yêu cầu.
- [ ] **ADM-USER-009 — P1:** Xem/thu hồi phiên người dùng theo quyền riêng và lý do; log ghi nhận phiên bị thu hồi nhưng không lộ token.
- [ ] **ADM-USER-010 — P1:** Xử lý yêu cầu truy cập, chỉnh sửa hoặc xóa/ẩn danh dữ liệu qua hồ sơ công việc riêng, có kiểm tra danh tính và ngoại lệ lưu trữ.
- [ ] **ADM-USER-011 — P2:** Phát hiện tài khoản có dấu hiệu trùng/lạm dụng chỉ như tín hiệu điều tra; không tự gộp danh tính hoặc tự khóa chỉ vì chung IP.

**Nghiệm thu:** khóa thu hồi phiên như hiện tại; dữ liệu đơn vẫn truy vết được; xem dữ liệu liên hệ đầy đủ phải có quyền và được ghi log.

## 9. Quản lý cửa hàng và người bán

- [ ] **ADM-STORE-001 — P0:** Hồ sơ tổng hợp chủ shop, thông tin cửa hàng, trạng thái hiệu lực, ý định nhận đơn của seller, lý do chặn và lịch sử.
- [ ] **ADM-STORE-002 — P0:** Thống kê đơn mở, đơn quá hạn, trả hàng và báo cáo liên quan để đánh giá tác động trước khi tạm ngừng.
- [ ] **ADM-STORE-003 — P0:** Tách rõ “shop tự tạm ngừng” và “sàn đình chỉ”; khôi phục không tự bật nhận đơn trái ý định seller.
- [ ] **ADM-STORE-004 — P0:** Gửi quyết định đình chỉ/khôi phục cho người bán, có phạm vi ảnh hưởng và kênh kháng nghị.
- [ ] **ADM-STORE-005 — P1:** Nếu có chính sách duyệt shop: hàng chờ đăng ký, hồ sơ, yêu cầu bổ sung, duyệt/từ chối và lịch sử phiên bản hồ sơ.
- [ ] **ADM-STORE-006 — P1:** Quyết định hồ sơ phải có lý do; yêu cầu bổ sung không được đồng nghĩa từ chối vĩnh viễn.
- [ ] **ADM-STORE-007 — P1:** Xem hiệu quả theo kỳ: tỷ lệ hủy do shop, chậm xử lý, trả hàng, điểm đánh giá và khiếu nại có kết luận.
- [ ] **ADM-STORE-008 — P1:** Quản lý chuỗi vi phạm, cảnh cáo, hạn khắc phục và kháng nghị; tránh tính cùng một sự việc thành nhiều vi phạm.
- [ ] **ADM-STORE-009 — P1:** Có quy trình chuyển chủ hoặc khôi phục quyền truy cập shop nếu được cho phép; cần xác minh, phê duyệt và không sửa lịch sử đơn.
- [ ] **ADM-STORE-010 — P2:** Xác minh giấy tờ người bán khi mô hình kinh doanh yêu cầu; xác định dữ liệu cần thu, nơi lưu, quyền xem và thời hạn lưu trước khi triển khai.
- [ ] **ADM-STORE-011 — P2:** Badge shop xác minh/uy tín có điều kiện công khai, thời hạn và thu hồi; không gắn badge chỉ vì người bán mua quyền hoặc tự chọn.

**Nghiệm thu:** seller không bỏ chặn bằng cập nhật shop; đơn cũ vẫn có đầu mối xử lý; shop tự ngừng trước khi bị chặn vẫn ngừng sau khi sàn khôi phục.

## 10. Sản phẩm và kiểm duyệt hàng hóa

- [ ] **ADM-PROD-001 — P0:** Bổ sung lọc theo shop, danh mục, thương hiệu, ngày tạo, tồn kho và trạng thái kiểm duyệt; phân biệt trạng thái seller với trạng thái chặn của sàn.
- [ ] **ADM-PROD-002 — P0:** Xem đủ ảnh, mô tả, SKU, thuộc tính, biến thể, giá bán, giá khuyến mãi và lịch sử thay đổi cần thiết cho kiểm duyệt.
- [ ] **ADM-PROD-003 — P0:** Ẩn/khôi phục có mã lý do chuẩn, nội dung giải thích, bằng chứng và thông báo seller; giữ trạng thái bán trước khi ẩn.
- [ ] **ADM-PROD-004 — P0:** Liên kết sản phẩm với báo cáo vi phạm và quyết định; không sửa snapshot của đơn đã đặt khi sửa hoặc ẩn sản phẩm.
- [ ] **ADM-PROD-005 — P0:** Quy tắc vi phạm có thể cấu hình theo nhóm: nội dung sai lệch, hàng bị cấm theo chính sách, hình ảnh không phù hợp, giả mạo thương hiệu hoặc spam.
- [ ] **ADM-PROD-006 — P1:** Nếu áp dụng duyệt trước đăng: hàng chờ sản phẩm mới/chỉnh sửa, phiên bản được xét duyệt và phạm vi thay đổi cần duyệt lại.
- [ ] **ADM-PROD-007 — P1:** So sánh trước/sau khi seller sửa tên, ảnh, danh mục hoặc mô tả sau một quyết định kiểm duyệt.
- [ ] **ADM-PROD-008 — P1:** Yêu cầu seller chỉnh sửa, đặt hạn và xác nhận đã khắc phục; sửa nội dung không tự bỏ cờ chặn của sàn.
- [ ] **ADM-PROD-009 — P1:** Xử lý hàng loạt có bước xem trước danh sách, lý do chung, quyền từng bản ghi và báo cáo thành công/thất bại từng mục.
- [ ] **ADM-PROD-010 — P1:** Hàng loạt phải giới hạn số mục, xử lý theo job khi lớn; không dùng một nút để ngầm chọn mọi bản ghi ngoài bộ lọc hiện tại.
- [ ] **ADM-PROD-011 — P1:** Kháng nghị của seller gắn với quyết định và phiên bản sản phẩm; xét lại không xóa lịch sử vi phạm cũ.
- [ ] **ADM-PROD-012 — P2:** Gợi ý sản phẩm trùng, ảnh đáng ngờ hoặc thay đổi giá bất thường để nhân viên kiểm tra; tín hiệu không tự trở thành kết luận vi phạm.

**Nghiệm thu:** seller không tự publish lại sản phẩm bị sàn ẩn; khôi phục bản nháp vẫn là bản nháp; thay đổi dữ liệu khi đang duyệt phải phát hiện xung đột.

## 11. Danh mục, thương hiệu và thuộc tính

- [ ] **ADM-CAT-001 — P1:** Có trang quản lý cây danh mục riêng; tái sử dụng khả năng tạo danh mục gốc/con đang có.
- [ ] **ADM-CAT-002 — P1:** Sửa tên, slug, mô tả, ảnh/icon, thứ tự, trạng thái và danh mục cha; kiểm tra trùng slug và chu trình cây ở backend.
- [ ] **ADM-CAT-003 — P1:** Trước khi đổi cha hoặc ngừng danh mục, hiển thị số sản phẩm, danh mục con và tham chiếu trang chủ bị ảnh hưởng.
- [ ] **ADM-CAT-004 — P1:** Không xóa danh mục đang được tham chiếu; có phương án chuyển sản phẩm sang danh mục thay thế và audit việc chuyển.
- [ ] **ADM-CAT-005 — P1:** Đổi slug cần cập nhật liên kết nội bộ; nếu muốn hỗ trợ URL cũ phải có mapping chuyển hướng và kiểm tra trùng/chu trình.
- [ ] **ADM-CAT-006 — P1:** Ngừng danh mục phải xác định tác động tới đăng sản phẩm mới, sản phẩm hiện hữu, tìm kiếm và ô nổi bật; tránh mất hàng hóa âm thầm.
- [ ] **ADM-CAT-007 — P1:** Quản lý bộ thuộc tính theo nhóm hàng: kiểu dữ liệu, bắt buộc/tùy chọn, đơn vị và giá trị cho phép; có kế hoạch cho sản phẩm cũ thiếu thuộc tính.
- [ ] **ADM-CAT-008 — P2:** Danh sách thương hiệu chuẩn, tên thay thế, logo, trạng thái và cách hợp nhất thương hiệu trùng.
- [ ] **ADM-CAT-009 — P2:** Nhập danh mục/thuộc tính bằng CSV có kiểm tra trước, danh sách lỗi từng dòng và lịch sử; không tự tạo hàng loạt khi file không hợp lệ.

**Nghiệm thu:** chuyển một nút vào hậu duệ của chính nó bị từ chối; ngừng danh mục có sản phẩm phải xử lý đúng chính sách tham chiếu đã chốt.

## 12. Tồn kho và giữ hàng

- [ ] **ADM-STOCK-001 — P0:** Tra cứu theo SKU/shop/sản phẩm, tách số lượng ghi nhận, đang giữ, khả dụng và đã bán theo đúng mô hình Catalog.
- [ ] **ADM-STOCK-002 — P0:** Xem lượt giữ hàng theo đơn, thời điểm tạo/hết hạn, trạng thái commit/release và mã tương quan.
- [ ] **ADM-STOCK-003 — P0:** Phát hiện lượt giữ quá hạn, đơn hủy nhưng chưa release hoặc sai lệch số lượng; đưa vào hàng chờ điều tra.
- [ ] **ADM-STOCK-004 — P0:** Không cho admin nhập trực tiếp số khả dụng hoặc xóa reservation đang gắn với đơn; thao tác sửa đi qua command có kiểm tra trạng thái.
- [ ] **ADM-STOCK-005 — P1:** Chạy đối soát có xem trước phạm vi, lý do và kết quả; retry cùng một việc không release hoặc commit hai lần.
- [ ] **ADM-STOCK-006 — P1:** Điều chỉnh kho nếu chính sách cho phép phải có loại tăng/giảm, số lượng, lý do, chứng từ và phiên bản; không cho lượng âm hoặc vượt giới hạn nghiệp vụ.
- [ ] **ADM-STOCK-007 — P1:** Nhận hàng trả về không tự tăng tồn bán được; phân biệt hàng có thể bán lại, chờ kiểm tra và hàng hỏng.

## 13. Đơn hàng

- [ ] **ADM-ORDER-001 — P0:** Lọc thêm khoảng ngày, shop, người mua theo quyền, phương thức thanh toán, trạng thái thanh toán và đơn có hậu mãi.
- [ ] **ADM-ORDER-002 — P0:** Liên kết checkout group với từng shop order; hiển thị số tiền phân bổ, trạng thái và các lần hủy/hoàn theo từng shop.
- [ ] **ADM-ORDER-003 — P0:** Timeline hợp nhất từ Order, Payment và giao nhận nếu có; mỗi sự kiện chỉ rõ nguồn và thời điểm nguồn ghi nhận.
- [ ] **ADM-ORDER-004 — P0:** Phân biệt trạng thái đơn, thanh toán, giao nhận, trả hàng và hoàn tiền; không suy diễn một trạng thái từ trạng thái khác.
- [ ] **ADM-ORDER-005 — P0:** Hiển thị breakdown từ snapshot: tiền hàng, giảm giá, phân bổ voucher, phí vận chuyển ước tính/thực tế nếu có, đã thu, đã hoàn và còn có thể hoàn.
- [ ] **ADM-ORDER-006 — P0:** Cảnh báo đơn chờ thanh toán, chờ shop xác nhận, chờ giao hoặc chờ hoàn quá thời hạn cấu hình.
- [ ] **ADM-ORDER-007 — P0:** Xem dữ liệu giao hàng đầy đủ chỉ khi có quyền và lý do nghiệp vụ; mặc định giữ che điện thoại/địa chỉ như API hiện có.
- [ ] **ADM-ORDER-008 — P0:** Ghi chú xử lý nội bộ, người phụ trách và liên kết ticket/khiếu nại không làm thay đổi snapshot thương mại.
- [ ] **ADM-ORDER-009 — P0:** Nếu cho admin hủy đơn thay bên liên quan: chỉ các trạng thái được phép, có xác nhận, lý do, kiểm tra quyền và xử lý tồn/tiền qua service tương ứng.
- [ ] **ADM-ORDER-010 — P0:** Đơn đang hoàn tiền hoặc đang hủy phải hiển thị tiến trình; không báo thành công toàn bộ khi mới gửi lệnh sang service khác.
- [ ] **ADM-ORDER-011 — P1:** Gửi nhắc việc cho shop theo mẫu và tần suất; không thay đổi trạng thái đơn để tạo cảm giác đã xử lý.
- [ ] **ADM-ORDER-012 — P1:** Xuất hồ sơ vụ việc gồm snapshot đơn, timeline và chứng từ được phép; dữ liệu cá nhân che theo quyền xuất.
- [ ] **ADM-ORDER-013 — P1:** Tìm kiếm theo mã giao dịch/mã vận đơn có thể điều hướng tới đơn khi các service có ánh xạ đáng tin cậy.

**Nghiệm thu:** hủy và webhook thanh toán tới đồng thời không làm mất tiền/hoàn trùng; một checkout nhiều shop không bị đếm là một shop order; hỗ trợ không sửa được giá và số tiền đã đặt.

## 14. Giao nhận và COD

Phạm vi này phụ thuộc khả năng giao nhận thực tế. Không coi trường mã vận đơn hoặc trạng thái thủ công là tích hợp hãng vận chuyển hoàn chỉnh.

- [ ] **ADM-SHIP-001 — P1:** Xem mã vận đơn, hãng giao, các mốc, lần giao thất bại và bằng chứng giao nếu nguồn tích hợp cung cấp.
- [ ] **ADM-SHIP-002 — P1:** Danh sách chậm lấy hàng, chậm giao, giao thất bại và hoàn hàng; liên kết tới đơn và ticket.
- [ ] **ADM-SHIP-003 — P1:** Nếu cho sửa mã vận đơn, phải xác nhận chủ thể, trạng thái cho phép và ghi lịch sử; không ghi đè mất mã cũ.
- [ ] **ADM-SHIP-004 — P1:** Tách giao hàng thành công, đã thu COD và COD đã chuyển về; bằng chứng giao hàng không chứng minh tiền đã về.
- [ ] **ADM-SHIP-005 — P1:** Đối soát COD theo từng đợt/bên thu hộ, số phải thu, thực thu, đã chuyển, chênh lệch và chứng từ nguồn.
- [ ] **ADM-SHIP-006 — P1:** Chênh lệch COD tạo vụ việc điều tra; không cho đánh dấu đã thu đủ chỉ vì đơn ở trạng thái `DELIVERED`.
- [ ] **ADM-SHIP-007 — P2:** Tạo/đổi/hủy vận đơn qua adapter chính thức, có idempotency và điều kiện hãng hỗ trợ; chỉ triển khai sau khi có hợp đồng/API phù hợp.
- [ ] **ADM-SHIP-008 — P2:** Quản lý phí giao và khu vực phục vụ theo phiên bản; giữ rõ hệ thống hiện còn dùng phí ước tính ở những luồng chưa tích hợp.

## 15. Trả hàng, khiếu nại và tranh chấp

### 15.1. Hồ sơ và tiếp nhận

- [x] **ADM-CASE-001 — P0:** Có danh sách riêng cho trả hàng/khiếu nại, lọc theo trạng thái, lý do, shop, người phụ trách, hạn và phương thức thanh toán.
- [x] **ADM-CASE-002 — P0:** Hồ sơ liên kết đúng shop order, item, số lượng, người mua, shop, bằng chứng, yêu cầu của khách và số tiền đủ điều kiện. Đã nghiệm thu local cho hồ sơ trả hàng tại `/admin/returns`; xem tiến độ mục 2.3.
- [x] **ADM-CASE-003 — P0:** Tách yêu cầu trả hàng, ticket hỗ trợ và tranh chấp; các hồ sơ có thể liên kết nhưng không dùng chung một trạng thái mơ hồ.
- [x] **ADM-CASE-004 — P0:** Bảo toàn chính sách hiện có về cửa sổ trả hàng 7 ngày từ khi giao cho tới khi có quyết định đổi chính sách và phiên bản áp dụng.
- [x] **ADM-CASE-005 — P0:** Admin tiếp nhận ngoại lệ ngoài hạn chỉ với quyền riêng, lý do và phê duyệt nếu cần; không sửa ngày giao để lách chính sách.
- [x] **ADM-CASE-006 — P0:** Kiểm tra tổng lượng trả theo item và tổng tiền đã/chờ hoàn; nhiều yêu cầu không vượt lượng đã mua hoặc tiền đủ điều kiện.
- [x] **ADM-CASE-007 — P0:** Xem bằng chứng qua URL có hạn, có quyền theo vụ việc; file được kiểm tra định dạng/dung lượng và quét theo cơ chế media được chọn.
- [x] **ADM-CASE-008 — P0:** Có yêu cầu bổ sung thông tin cho buyer/seller với nội dung cần gửi và hạn phản hồi; lịch sử trao đổi không bị ghi đè.

### 15.2. Xử lý và quyết định

- [x] **ADM-CASE-009 — P0:** Nhận việc, phân công, chuyển cấp, ghi chú nội bộ và thông báo công khai được tách biệt.
- [x] **ADM-CASE-010 — P0:** Duyệt/từ chối hoặc đề xuất xử lý theo policy; lưu bên chịu trách nhiệm, lý do và cơ sở bằng chứng.
- [x] **ADM-CASE-011 — P0:** Chỉ mở hoàn tiền khi đạt điều kiện của yêu cầu trả hàng; quyết định bồi hoàn không đồng nghĩa tiền đã được chuyển.
- [x] **ADM-CASE-012 — P0:** Phân biệt hoàn toàn bộ/một phần và hoàn phí ship; giữ tính toán theo snapshot và quy tắc phân bổ hiện có.
- [x] **ADM-CASE-013 — P0:** Theo dõi chờ buyer gửi hàng, seller nhận hàng, kết quả kiểm tra và bước hoàn tiền; có đường xử lý seller không phản hồi.
- [x] **ADM-CASE-014 — P0:** Tranh chấp lưu yêu cầu mỗi bên, chứng cứ, quyết định, người duyệt và thời điểm; quyết định không tự sửa tiền hoặc trạng thái đơn ngoài command được phép.
- [x] **ADM-CASE-015 — P0:** Khi seller bị khóa, có người vận hành được giao tiếp tục xử lý hậu mãi theo quyền; không mở lại shop chỉ để hoàn tiền.
- [x] **ADM-CASE-016 — P0:** Chuyển trạng thái lỗi hoặc cập nhật tới muộn phải được phát hiện; không cho nhận hàng trả sau khi hồ sơ đã bị từ chối mà không mở lại theo quy trình.
- [x] **ADM-CASE-017 — P1:** Kháng nghị quyết định có hạn tiếp nhận, người xét lại và kết quả; không sửa âm thầm quyết định đã phát hành.
- [x] **ADM-CASE-018 — P1:** Báo cáo nguyên nhân trả hàng, thời gian xử lý và tỷ lệ kháng nghị được chấp nhận theo shop/danh mục.

### 15.3. Mô hình trạng thái đề xuất cho hồ sơ tranh chấp

| Trạng thái nghiệp vụ     | Ai thực hiện bước tiếp                     | Điều kiện chuyển                                            |
| ------------------------ | ------------------------------------------ | ----------------------------------------------------------- |
| Mới tiếp nhận            | Nhân viên được phân công                   | Xác nhận đúng đối tượng và không trùng hồ sơ đang mở        |
| Đang xem xét             | Nhân viên xử lý                            | Đủ quyền và đã nhận việc                                    |
| Chờ thông tin khách/shop | Bên được yêu cầu                           | Có danh sách thông tin thiếu và hạn phản hồi                |
| Chờ phê duyệt            | Người duyệt khác người đề xuất nếu áp dụng | Hồ sơ đủ bằng chứng, số tiền và phương án đã được cố định   |
| Đã quyết định            | Nhân viên thực thi/khách hàng              | Quyết định có lý do và thông báo đã được ghi nhận           |
| Chờ thực hiện nghĩa vụ   | Order/Payment hoặc bộ phận phụ trách       | Theo dõi riêng hoàn tiền, trả hàng hoặc biện pháp khác      |
| Đã giải quyết            | Nhân viên phụ trách                        | Nghĩa vụ hoàn tất hoặc có kết luận không phát sinh nghĩa vụ |
| Đóng                     | Nhân viên theo policy                      | Hết bước xử lý/kháng nghị theo quy định được cấu hình       |

Bảng trên không thay enum `return_requests` hiện hữu. Đã triển khai `admin_cases.workflow_status` với ánh xạ sang return/ticket/dispute, còn kết quả tiền lấy từ Payment; xem [bảng trạng thái triển khai](Backend/docs/case-resolution.md#ánh-xạ-trạng-thái).

**Nghiệm thu:** hai hồ sơ không trả cùng số lượng vượt giới hạn; từ chối không phát sinh hoàn tiền; kết luận có hoàn tiền vẫn hiển thị chờ thực hiện cho tới khi Payment xác nhận kết quả.

## 16. Thanh toán và đối soát

- [ ] **ADM-PAY-001 — P0:** Danh sách payment intent/giao dịch, lọc ngày, provider, trạng thái, số tiền và mã đơn; chỉ hiển thị trường cần thiết.
- [ ] **ADM-PAY-002 — P0:** Chi tiết gồm mã nội bộ/provider, lần thanh toán, tiền, đơn/checkout liên quan, callback/webhook và kết quả xác minh đã che dữ liệu nhạy cảm.
- [ ] **ADM-PAY-003 — P0:** Phân biệt `SUCCEEDED` của Payment với `PAID` của Order; phát hiện lệch trạng thái và đưa vào hàng chờ đồng bộ.
- [ ] **ADM-PAY-004 — P0:** Hiển thị số tiền dự kiến, provider xác nhận, tiền phân bổ shop và tiền đã hoàn; không lấy số tổng hợp dashboard làm nguồn quyết định giao dịch.
- [ ] **ADM-PAY-005 — P0:** Đối soát theo provider và khoảng thời gian: khớp, thiếu callback, sai số tiền, giao dịch chưa xác định hoặc đơn đã hủy nhưng tiền tới.
- [ ] **ADM-PAY-006 — P0:** Lệnh kiểm tra lại trạng thái phải gọi adapter provider phía backend, có rate limit và audit; nhân viên không được nhập tùy ý “thanh toán thành công”.
- [ ] **ADM-PAY-007 — P0:** Đơn đã hủy nhận tiền muộn phải theo quy tắc bồi hoàn/hoàn tiền, không tự hồi sinh đơn hoặc bán hàng từ reservation đã release.
- [ ] **ADM-PAY-008 — P0:** Webhook inbox có trạng thái nhận/xác minh/xử lý/lỗi và số lần thử; không lộ chữ ký hoặc raw payload nhạy cảm cho vai trò không cần.
- [ ] **ADM-PAY-009 — P0:** Retry xử lý sự kiện dùng cùng event ID và điều kiện idempotency; không giả mạo callback hoặc bỏ qua xác minh chữ ký.
- [ ] **ADM-PAY-010 — P0:** Tách môi trường thử và thật bằng nhãn rõ ràng; không dùng giao dịch sandbox để nghiệm thu tiền thật.
- [ ] **ADM-PAY-011 — P1:** Nhập file đối soát chính thức khi provider hỗ trợ; xem trước ánh xạ cột, đơn vị tiền, kỳ và lỗi trước khi ghi nhận.
- [ ] **ADM-PAY-012 — P1:** Phiên đối soát lưu phạm vi, nguồn dữ liệu, chênh lệch, người xác nhận và các vụ việc chưa đóng; xác nhận phiên không tự sửa giao dịch.
- [ ] **ADM-PAY-013 — P1:** Phân công điều tra chênh lệch và ghi kết luận với bằng chứng; số liệu báo cáo cập nhật theo kết quả thực tế.

**Nghiệm thu:** webhook lặp chỉ tác động một lần; số tiền sai không chuyển đơn sang đã trả; provider timeout không bị diễn giải thành thất bại chắc chắn để tạo hoàn mới.

## 17. Hoàn tiền

### 17.1. Hàng chờ và điều kiện

- [ ] **ADM-REFUND-001 — P0:** Danh sách refund theo đơn/checkout, yêu cầu trả hàng, provider, trạng thái, người xử lý, tuổi lệnh và lỗi gần nhất.
- [ ] **ADM-REFUND-002 — P0:** Chi tiết hiển thị tiền gốc đã thu, đã hoàn thành công, đã giữ cho refund đang chờ, số còn được hoàn và breakdown hàng/ship.
- [ ] **ADM-REFUND-003 — P0:** Tạo yêu cầu hoàn có nguồn hợp lệ: hủy sau thanh toán, trả hàng được chấp nhận hoặc ngoại lệ đã được phê duyệt.
- [ ] **ADM-REFUND-004 — P0:** Dành chỗ cho số tiền refund đang xử lý bằng transaction/lock để hai yêu cầu đồng thời không vượt phần còn lại.
- [ ] **ADM-REFUND-005 — P0:** Tiền hoàn theo command được tính và kiểm tra ở server; client gửi số tiền khác điều kiện hợp lệ phải bị từ chối.
- [ ] **ADM-REFUND-006 — P0:** Giữ quy trình tự động hiện có cho trường hợp bình thường; chỉ bổ sung duyệt thủ công cho ngoại lệ/ngưỡng yêu cầu, tránh chặn mọi refund vô lý.

### 17.2. Thực thi và xác minh

- [ ] **ADM-REFUND-007 — P0:** Mỗi refund có idempotency key gắn nguồn nghiệp vụ; bấm nhiều lần hoặc retry mạng không tạo refund provider mới.
- [ ] **ADM-REFUND-008 — P0:** Tách các bước đề xuất, phê duyệt, gửi provider và xác nhận hoàn tất; không báo đã hoàn chỉ vì lệnh được tiếp nhận.
- [ ] **ADM-REFUND-009 — P0:** Retry sau timeout phải kiểm tra giao dịch cũ trước; chỉ gửi lại khi adapter xác định an toàn theo hợp đồng provider.
- [ ] **ADM-REFUND-010 — P0:** Refund thất bại hiển thị lỗi có thể hiểu được, hướng xử lý và số lần thử; không lộ secret hoặc stack trace.
- [ ] **ADM-REFUND-011 — P0:** Với VietQR/chuyển khoản thủ công: có thông tin người nhận được bảo vệ, chứng từ và mã tham chiếu ngân hàng; xác nhận thực chi là quyền riêng.
- [ ] **ADM-REFUND-012 — P0:** Chứng từ tải lên chỉ là bằng chứng để kiểm tra, không tự chứng minh ngân hàng đã chuyển tiền; người có quyền đối soát phải xác minh nguồn.
- [ ] **ADM-REFUND-013 — P0:** Với COD: giữ hồ sơ chờ phương án chi trả cho tới khi có bằng chứng hoàn thực tế; không chuyển `REFUNDED` khi chỉ duyệt yêu cầu.
- [ ] **ADM-REFUND-014 — P0:** Không thay tài khoản nhận tiền sau khi duyệt mà giữ phê duyệt cũ; thay đổi người nhận phải đánh giá/duyệt lại.
- [ ] **ADM-REFUND-015 — P0:** Payment phát sự kiện kết quả, Order cập nhật số đã hoàn và yêu cầu trả hàng; sự kiện trễ/lặp không cộng tiền hoàn hai lần.
- [ ] **ADM-REFUND-016 — P1:** Báo cáo thời gian hoàn, lệnh chờ quá hạn, tỷ lệ lỗi và tổng tiền theo provider/nguyên nhân.

**Nghiệm thu:** refund 2 lần đồng thời không vượt tiền đã thu; timeout không tạo lần chi thứ hai; tổng refund khớp Order; không dùng nút admin để xác nhận tiền không có nguồn chứng minh.

## 18. Phí sàn và thanh toán cho người bán

**Module có điều kiện, mặc định P2.** Chỉ đưa vào phạm vi thực hiện nếu sàn có chính sách thu phí, giữ tiền hoặc quyết toán cho shop. Chưa được suy diễn các chỉ số hiện có thành sổ kế toán hay ví.

- [ ] **ADM-FIN-001 — P2:** Quản lý chính sách phí theo kỳ/nhóm shop/danh mục, có ngày hiệu lực, phiên bản và người duyệt.
- [ ] **ADM-FIN-002 — P2:** Tính phí từ sự kiện giao dịch xác định; lưu căn cứ và snapshot tỷ lệ để sửa chính sách không làm đổi giao dịch cũ.
- [ ] **ADM-FIN-003 — P2:** Sổ phát sinh ghi riêng tiền thu, phí, ưu đãi sàn/shop, refund, khoản giữ và chi trả; chỉ xây sổ đủ tính đối chiếu khi mô hình đã chốt.
- [ ] **ADM-FIN-004 — P2:** Kỳ quyết toán shop có trạng thái nháp, chờ duyệt, chờ chi, đã chi hoặc thất bại; khóa số liệu kỳ đã chốt theo chính sách.
- [ ] **ADM-FIN-005 — P2:** Người lập kỳ và người duyệt/chi có quyền tách biệt; tổng kỳ được tính phía server và có chứng từ.
- [ ] **ADM-FIN-006 — P2:** Thay tài khoản ngân hàng người bán cần xác minh, thông báo và phê duyệt; không nhận thay đổi từ ghi chú hoặc email không xác thực.
- [ ] **ADM-FIN-007 — P2:** Định nghĩa giữ/giải phóng tiền do tranh chấp và cách xử lý refund phát sinh sau khi đã chi cho shop.
- [ ] **ADM-FIN-008 — P2:** Chi trả thất bại có quy trình retry chống trùng; import chứng từ không tự sinh giao dịch chi mới.
- [ ] **ADM-FIN-009 — P2:** Hóa đơn, thuế và chứng từ chỉ triển khai sau khi yêu cầu nghiệp vụ và nghĩa vụ áp dụng được chuyên môn xác nhận; tài liệu này không đưa ra kết luận pháp lý.

## 19. Báo cáo vi phạm và kiểm duyệt nội dung

- [ ] **ADM-MOD-001 — P0:** Hàng chờ chung cho báo cáo shop/sản phẩm/review/chat, có bộ lọc loại đối tượng, lý do, mức độ, số báo cáo và tuổi vụ việc.
- [ ] **ADM-MOD-002 — P0:** Xem snapshot tại lúc báo cáo nếu khả thi, nội dung hiện tại và thay đổi sau báo cáo; không mất chứng cứ khi seller sửa nội dung.
- [ ] **ADM-MOD-003 — P0:** Đọc bằng chứng chat chỉ trong hội thoại/phạm vi liên quan; cần quyền riêng, lý do và audit truy cập.
- [ ] **ADM-MOD-004 — P0:** Các quyết định gồm không vi phạm, yêu cầu sửa, cảnh cáo, ẩn nội dung hoặc đình chỉ theo chính sách; không mặc định mọi báo cáo đều hợp lệ.
- [ ] **ADM-MOD-005 — P0:** Mỗi quyết định chỉ rõ điều khoản/phiên bản chính sách, bằng chứng, người quyết định và quyền kháng nghị.
- [ ] **ADM-MOD-006 — P0:** Nhóm báo cáo trùng về một vụ việc, vẫn giữ nguồn báo cáo riêng; không tăng mức xử phạt chỉ do một người gửi lặp.
- [ ] **ADM-MOD-007 — P0:** Thông báo kết quả cho người báo cáo và bên bị xử lý theo mức thông tin được phép; không công khai danh tính người báo cáo.
- [ ] **ADM-MOD-008 — P1:** Kiểm duyệt review bằng ẩn/khôi phục theo lý do, giữ nguyên nội dung gốc; admin không được sửa đánh giá thành ý kiến khác của khách.
- [ ] **ADM-MOD-009 — P1:** Ẩn/khôi phục review phải cập nhật điểm tổng hợp theo chính sách được công bố; tránh số sao và danh sách review lệch nhau.
- [ ] **ADM-MOD-010 — P1:** Có hàng chờ kháng nghị, phân công người xem xét và liên kết quyết định gốc; trường hợp người xử lý là bên liên quan phải chuyển người khác.
- [ ] **ADM-MOD-011 — P1:** Đánh dấu báo cáo lạm dụng có bằng chứng và giới hạn tần suất hợp lý; không cấm khách phản ánh chỉ vì trước đó bị từ chối.
- [ ] **ADM-MOD-012 — P2:** Bộ quy tắc hoặc gợi ý tự động hỗ trợ ưu tiên; quyết định ảnh hưởng tài khoản/tiền cần cơ chế giải thích và xem xét của người có quyền.

## 20. Hỗ trợ khách hàng

- [ ] **ADM-SUP-001 — P1:** Tạo ticket từ khách/shop hoặc nội bộ, có chủ đề, kênh, mức ưu tiên, đối tượng liên quan và người phụ trách.
- [ ] **ADM-SUP-002 — P1:** Các trạng thái có ý nghĩa rõ: mới, đang xử lý, chờ khách, chờ nội bộ, đã giải quyết, đóng; cấu hình điều kiện mở lại.
- [ ] **ADM-SUP-003 — P1:** Phản hồi gửi khách và ghi chú nội bộ có giao diện tách rõ; attachment tuân theo quyền và chính sách file.
- [ ] **ADM-SUP-004 — P1:** Template phản hồi theo chủ đề, có xem trước nội dung; không chèn nhầm dữ liệu của khách hoặc đơn khác.
- [ ] **ADM-SUP-005 — P1:** Tìm ticket theo mã, khách, đơn, nội dung được phép; lọc nhóm, nhân viên, trạng thái và SLA.
- [ ] **ADM-SUP-006 — P1:** Chuyển nhóm/nhân viên giữ toàn bộ lịch sử; đánh dấu ticket trùng và liên kết hồ sơ gốc thay vì xóa mất phản ánh.
- [ ] **ADM-SUP-007 — P1:** Từ ticket mở vụ việc trả hàng, tranh chấp hoặc vi phạm khi đủ điều kiện; không tự biến lời hứa hỗ trợ thành giao dịch hoàn tiền.
- [ ] **ADM-SUP-008 — P1:** Theo dõi thời gian phản hồi đầu, thời gian xử lý và đánh giá sau hỗ trợ nếu có; ghi rõ lúc chờ phản hồi có tính SLA hay không.
- [ ] **ADM-SUP-009 — P2:** Kho hướng dẫn nội bộ và bài trợ giúp công khai có phiên bản, người duyệt và thời điểm cập nhật.

## 21. Voucher, khuyến mãi và Flash Sale

- [ ] **ADM-PROMO-001 — P1:** Trang chiến dịch toàn sàn gồm loại, mã, tên, nguồn ngân sách, thời gian, trạng thái, ngân sách đã giữ/đã dùng và số lượt.
- [ ] **ADM-PROMO-002 — P1:** Tạo voucher theo số tiền/phần trăm, mức giảm tối đa, giá trị đơn tối thiểu, tổng lượt dùng và giới hạn từng người.
- [ ] **ADM-PROMO-003 — P1:** Chọn phạm vi shop, sản phẩm, danh mục hoặc nhóm người dùng khi backend hỗ trợ; tiêu chí đủ điều kiện được kiểm tra ở server.
- [ ] **ADM-PROMO-004 — P1:** Tách ưu đãi sàn tài trợ và shop tài trợ, có quy tắc cộng dồn và phân bổ giảm giá theo item/shop order.
- [ ] **ADM-PROMO-005 — P1:** Nháp → chờ duyệt nếu vượt ngưỡng → đã lên lịch → đang chạy → tạm dừng/kết thúc; kiểm tra quyền ở từng bước.
- [ ] **ADM-PROMO-006 — P1:** Không đổi ngầm điều kiện voucher đã được áp dụng vào đơn cũ; chỉnh điều kiện đang chạy phải có giới hạn và phiên bản.
- [ ] **ADM-PROMO-007 — P1:** Xem trước điều kiện trên giỏ hàng mẫu, giải thích không đủ điều kiện; việc mô phỏng không giữ tồn/ngân sách hoặc tạo đơn thật.
- [ ] **ADM-PROMO-008 — P1:** Reserve/commit/release ngân sách và lượt dùng phải chống race; hủy một shop trong checkout nhiều shop xử lý đúng phần giảm được phân bổ.
- [ ] **ADM-PROMO-009 — P1:** Flash Sale có sản phẩm/biến thể, giá, quota, khung giờ và giới hạn mua; quota chiến dịch không thay thế kiểm tra tồn thực tế.
- [ ] **ADM-PROMO-010 — P1:** Kiểm tra thời gian trùng, xung đột giá, sản phẩm bị ẩn hoặc shop tạm ngừng; nêu rõ xử lý mục hết điều kiện giữa chiến dịch.
- [ ] **ADM-PROMO-011 — P1:** Tạm dừng ngăn sử dụng mới theo policy, không hủy quyền lợi của đơn đã cam kết; giữ lịch sử mọi lần thay đổi.
- [ ] **ADM-PROMO-012 — P1:** Báo cáo lượt nhận/dùng, giá trị giảm thực tế, đơn hủy và phần ngân sách được giải phóng; không đồng nhất lượt bấm banner với đơn được tạo.
- [ ] **ADM-PROMO-013 — P2:** Phát hiện dấu hiệu lạm dụng voucher bằng dữ liệu hợp lệ và giới hạn quyền; tín hiệu phải có giải thích và quy trình xem xét.
- [ ] **ADM-PROMO-014 — P2:** Duyệt đề xuất tham gia chiến dịch của shop, quota và lịch đăng; chỉ mở sau khi có quy tắc hợp tác seller rõ ràng.

**Nghiệm thu:** đồng thời sử dụng voucher không vượt quota/ngân sách; chiến dịch hết hạn được kiểm tra bởi backend; ngày và giờ đúng múi giờ; đơn đã tạo giữ đúng snapshot ưu đãi.

## 22. Trang chủ, nội dung và thư viện ảnh

Giữ và mở rộng trình biên tập hiện có; không xây lại menu, banner, bố cục hoặc luồng nháp/xem trước/xuất bản đã hoạt động.

- [ ] **ADM-CMS-001 — P1:** Upload ảnh banner qua thư viện media có kiểm tra loại thực, kích thước, dung lượng, quét file và quyền; không chỉ nhập URL.
- [ ] **ADM-CMS-002 — P1:** Có xem trước/cắt ảnh theo tỷ lệ được hỗ trợ, văn bản thay thế và cảnh báo ảnh không phù hợp desktop/mobile.
- [ ] **ADM-CMS-003 — P1:** Thư viện ảnh có tìm kiếm, người tải lên, ngày tải, trạng thái và nơi đang sử dụng; không xóa tài nguyên đang được tham chiếu mà không xử lý tham chiếu.
- [ ] **ADM-CMS-004 — P1:** Lưu nhiều phiên bản nội dung, xem chênh lệch và phục hồi một phiên bản vào bản nháp để duyệt trước khi xuất bản.
- [ ] **ADM-CMS-005 — P1:** Lên lịch bắt đầu/kết thúc banner hoặc bản xuất bản theo múi giờ; job chạy trễ vẫn kiểm tra điều kiện hiện tại và không xuất bản bản đã hủy.
- [ ] **ADM-CMS-006 — P1:** Quy trình biên tập → duyệt → xuất bản khi tổ chức có nhiều người; thay đổi nội dung sau duyệt làm mất hiệu lực duyệt trước đó.
- [ ] **ADM-CMS-007 — P1:** Cảnh báo bản nháp chưa lưu khi rời trang; lỗi mạng không làm mất nội dung đang nhập và không tự xuất bản lại khi retry.
- [ ] **ADM-CMS-008 — P1:** Cho biết bản nháp khác bản công khai ở đâu, ai sửa gần nhất và có xung đột phiên bản hay không.
- [ ] **ADM-CMS-009 — P1:** Kiểm tra liên kết hỏng, sản phẩm ghim bị ẩn, shop bị chặn và danh mục ngừng; cấu hình giao diện không tự khôi phục trạng thái bán.
- [ ] **ADM-CMS-010 — P1:** Thống nhất cơ chế cập nhật cấu hình công khai/cache sau xuất bản; nêu rõ độ trễ, không giả định thông báo storage cập nhật được mọi thiết bị.
- [ ] **ADM-CMS-011 — P2:** Quản lý trang giới thiệu, hướng dẫn mua/bán, liên hệ và chính sách bằng cấu trúc nội dung được kiểm soát.
- [ ] **ADM-CMS-012 — P2:** Metadata SEO theo trang và chuyển hướng khi đổi URL; không cho chèn script/HTML tùy ý làm ảnh hưởng người dùng.
- [ ] **ADM-CMS-013 — P2:** Đa ngôn ngữ khi sản phẩm có nhu cầu; trạng thái bản dịch độc lập với bản gốc, có nội dung dự phòng rõ ràng.

## 23. Thông báo và email

- [ ] **ADM-NOTI-001 — P1:** Danh sách thông báo vận hành và kết quả gửi theo sự kiện, đối tượng, kênh, template, thời điểm, số lần thử và lỗi gần nhất.
- [ ] **ADM-NOTI-002 — P1:** Template có phiên bản và biến được phép; xem trước bằng dữ liệu mẫu đã che và phát hiện biến thiếu trước khi kích hoạt.
- [ ] **ADM-NOTI-003 — P1:** Tách thông báo nghiệp vụ bắt buộc khỏi nội dung marketing theo chính sách đã xác định; tùy chọn nhận tin được áp dụng phù hợp.
- [ ] **ADM-NOTI-004 — P1:** Gửi thông báo cho người dùng/shop theo vụ việc cần quyền, lý do và kênh phù hợp; không dùng ghi chú nội bộ làm nội dung gửi.
- [ ] **ADM-NOTI-005 — P1:** Retry email/thông báo dùng mã sự kiện và kiểm tra đã gửi; không tạo hàng loạt email trùng khi job chạy lại.
- [ ] **ADM-NOTI-006 — P1:** Gửi thử chỉ tới địa chỉ cho phép trong môi trường tương ứng; preview không gửi thật tới khách.
- [ ] **ADM-NOTI-007 — P1:** Hiển thị phân biệt đã xếp hàng, đã gửi cho provider, provider chấp nhận và kết quả giao nhận nếu provider có cung cấp.
- [ ] **ADM-NOTI-008 — P1:** Theo dõi hàng đợi lỗi/quá hạn và tần suất; template hỏng có thể tạm dừng có kiểm soát mà không mất sự kiện nguồn.
- [ ] **ADM-NOTI-009 — P2:** Thông báo hàng loạt có xem trước quy mô, quyền gửi, giới hạn tần suất, phê duyệt và cách dừng phần chưa gửi.
- [ ] **ADM-NOTI-010 — P2:** Chiến dịch gửi marketing cần quản lý đối tượng theo mục đích được phép và lựa chọn nhận tin; không xuất toàn bộ email sang file thủ công làm quy trình mặc định.

## 24. Chat và chatbot

- [ ] **ADM-CHAT-001 — P0:** Admin mở báo cáo hội thoại từ hàng chờ với đoạn tin liên quan, người báo cáo, lý do và các bước đã xử lý.
- [ ] **ADM-CHAT-002 — P0:** Phân quyền riêng cho xem nội dung chat; mọi truy cập phải có vụ việc/lý do. Không mở một trang đọc mọi hội thoại cho tất cả admin.
- [ ] **ADM-CHAT-003 — P0:** Tệp đính kèm được cấp quyền/URL có hạn; hết quyền hoặc đóng phiên không tiếp tục dùng URL như đường dẫn công khai lâu dài.
- [ ] **ADM-CHAT-004 — P1:** Xử lý tin vi phạm theo chính sách: ẩn hoặc hạn chế truy cập, giữ dấu vết và bằng chứng; không sửa lời người gửi.
- [ ] **ADM-CHAT-005 — P1:** Quản lý câu trả lời FAQ/tri thức bot có nguồn, người duyệt, phiên bản và ngày cập nhật; nguồn lỗi thời có thể ngừng sử dụng.
- [ ] **ADM-CHAT-006 — P1:** Theo dõi số phiên bot, lỗi, fallback, thời gian đáp ứng và mức sử dụng AI; tách dữ liệu tổng hợp khỏi nội dung cá nhân.
- [ ] **ADM-CHAT-007 — P1:** Cấu hình ngân sách/lượt gọi, timeout, mô hình được phép và nút tắt AI có audit; secret provider chỉ quản lý phía server.
- [ ] **ADM-CHAT-008 — P1:** Kiểm thử bot bằng phiên giả lập không ghi nhầm vào hội thoại khách hoặc gọi lệnh tài chính thật.
- [ ] **ADM-CHAT-009 — P1:** Bot không kết luận thanh toán/hoàn tiền nếu không có dữ liệu xác thực từ service nguồn; dữ liệu đơn riêng chỉ đọc theo quyền người hỏi.
- [ ] **ADM-CHAT-010 — P2:** Chuyển tiếp cho nhân viên hỗ trợ có sự đồng ý/phạm vi phù hợp, ghi rõ bên nào đang trả lời và lưu lịch sử bàn giao.

## 25. Báo cáo, tìm kiếm và xuất dữ liệu

### 25.1. Báo cáo nghiệp vụ

- [ ] **ADM-REPORT-001 — P1:** Báo cáo theo kỳ: đơn, người dùng mới, shop, sản phẩm, thanh toán, hủy, trả hàng và hoàn tiền.
- [ ] **ADM-REPORT-002 — P1:** Phân rã theo shop, danh mục, phương thức thanh toán, trạng thái và nguồn ưu đãi khi dữ liệu nguồn có sẵn.
- [ ] **ADM-REPORT-003 — P1:** Mỗi chỉ số có định nghĩa, nguồn, thời điểm chốt và cách xử lý hoàn/hủy phát sinh sau kỳ.
- [ ] **ADM-REPORT-004 — P1:** Tiền ròng sau hoàn phải nêu có trừ phí provider/ship/ưu đãi không; không gọi là lợi nhuận khi chưa có đủ cấu phần chi phí.
- [ ] **ADM-REPORT-005 — P1:** Từ số tổng mở được danh sách giao dịch cấu thành trong phạm vi quyền; tổng và chi tiết dùng cùng bộ lọc/định nghĩa.
- [ ] **ADM-REPORT-006 — P1:** So sánh theo kỳ và giải thích trường hợp dữ liệu ít/không có; không làm mượt dữ liệu bằng số giả.
- [ ] **ADM-REPORT-007 — P1:** Báo cáo hiệu quả vận hành: tồn đọng, quá SLA, số vụ mở lại, thời gian giải quyết và chất lượng kết luận.

### 25.2. Tìm kiếm và export

- [ ] **ADM-REPORT-008 — P1:** Tìm kiếm liên tài nguyên theo ID/mã đơn/mã giao dịch/mã case, kết quả chia nhóm và kiểm tra quyền ở từng nguồn.
- [ ] **ADM-REPORT-009 — P1:** Bộ lọc có thể chia sẻ bằng URL hoặc lưu cá nhân; URL không chứa secret hoặc dữ liệu nhạy cảm không cần thiết.
- [ ] **ADM-REPORT-010 — P1:** Xuất CSV UTF-8 theo bộ lọc và cột được chọn; XLSX chỉ thêm khi cần, không phụ thuộc để dùng chức năng cơ bản.
- [ ] **ADM-REPORT-011 — P0:** Quyền export tách khỏi read; backend kiểm tra phạm vi hàng/cột và che dữ liệu như khi xem giao diện.
- [ ] **ADM-REPORT-012 — P0:** Chống công thức nguy hiểm khi mở CSV/spreadsheet, xử lý dấu phân cách, xuống dòng và chuỗi bắt đầu bằng ký tự công thức.
- [ ] **ADM-REPORT-013 — P1:** Export lớn chạy job nền, có trạng thái/số dòng, hạn tải và hủy; tải lại kiểm tra quyền hiện tại và không dùng URL công khai vô hạn.
- [ ] **ADM-REPORT-014 — P1:** Tệp có metadata bộ lọc, thời điểm, múi giờ và phiên bản báo cáo; dữ liệu nhất quán theo snapshot hoặc mốc cắt được nêu rõ.
- [ ] **ADM-REPORT-015 — P1:** Audit người yêu cầu và người tải file; tự xóa file hết hạn theo chính sách, không lưu bản sao lâu hơn cần thiết.
- [ ] **ADM-REPORT-016 — P2:** Báo cáo định kỳ chỉ gửi tới người có quyền; quyền thay đổi phải ngăn các lần gửi/tải sau.

## 26. Nhật ký và dữ liệu cá nhân

### 26.1. Nhật ký thống nhất

- [ ] **ADM-AUDIT-001 — P0:** Ghi sự kiện cho thay đổi quyền, khóa/khôi phục, quyết định case, hoàn tiền, nội dung, cấu hình và thao tác xử lý lại.
- [ ] **ADM-AUDIT-002 — P0:** Sự kiện chứa ID, actor, vai trò/quyền liên quan, tài nguyên, hành động, lý do, kết quả, thời điểm và correlation ID.
- [ ] **ADM-AUDIT-003 — P0:** Before/after chỉ lưu trường cần thiết và đã lọc dữ liệu nhạy cảm; không log toàn bộ body/token vì thuận tiện.
- [ ] **ADM-AUDIT-004 — P0:** Audit thay đổi dữ liệu khác log truy cập/log lỗi; có kết quả thất bại cho hành động bị từ chối hoặc không thực thi được khi phù hợp.
- [ ] **ADM-AUDIT-005 — P0:** Lọc thời gian, actor, loại tài nguyên, action, kết quả và ID đối tượng; liên kết về hồ sơ nếu người xem có quyền.
- [ ] **ADM-AUDIT-006 — P0:** Không có API sửa/xóa audit thông thường; chính sách hết hạn lưu trữ cần quyền hệ thống và quy trình riêng.
- [ ] **ADM-AUDIT-007 — P0:** Truy vết qua service bằng correlation ID; giao diện phân biệt audit gốc với bản sao/index tập trung có thể chậm.
- [ ] **ADM-AUDIT-008 — P1:** Tra cứu audit của trang chủ, khuyến mãi, Order/Payment và các module mới từ một giao diện, không chỉ hai nguồn hiện tại.
- [ ] **ADM-AUDIT-009 — P1:** Lưu/export audit theo phạm vi được phép; triển khai biện pháp phát hiện can thiệp phù hợp yêu cầu vận hành, không tuyên bố “bất biến tuyệt đối” chỉ vì không có nút xóa.

### 26.2. Quyền riêng tư và quản trị dữ liệu

- [ ] **ADM-PRIV-001 — P0:** Phân loại dữ liệu: công khai, nội bộ, cá nhân và bí mật; xác định quyền xem, export và thời hạn theo loại.
- [ ] **ADM-PRIV-002 — P0:** Xem số điện thoại, địa chỉ, tài khoản ngân hàng hoặc giấy tờ đầy đủ cần permission riêng, mục đích và log truy cập.
- [ ] **ADM-PRIV-003 — P0:** Khi giảm quyền/đăng xuất, không giữ dữ liệu nhạy cảm trong cache ứng dụng, localStorage hoặc file tạm không cần thiết.
- [ ] **ADM-PRIV-004 — P1:** Hồ sơ yêu cầu dữ liệu có xác minh danh tính, phạm vi, người duyệt, hạn xử lý và bằng chứng hoàn tất.
- [ ] **ADM-PRIV-005 — P1:** Xóa/ẩn danh không phá quan hệ đơn và số liệu tài chính; xác định dữ liệu cần giữ và căn cứ trước khi thực thi.
- [ ] **ADM-PRIV-006 — P1:** Cơ chế giữ dữ liệu phục vụ tranh chấp đang mở, có phạm vi và người chịu trách nhiệm; hết lý do phải đánh giá lại.
- [ ] **ADM-PRIV-007 — P1:** Chính sách lưu chat, bằng chứng, export, log và tài liệu xác minh được cấu hình/ghi nhận; không tự đặt một thời hạn áp dụng cho mọi dữ liệu.
- [ ] **ADM-PRIV-008 — P2:** Khi cần môi trường thử, dùng dữ liệu tổng hợp/ẩn danh phù hợp; không sao chép nguyên dữ liệu production vào máy cá nhân để thử UI.

## 27. Cấu hình sàn và chính sách

- [ ] **ADM-CONFIG-001 — P1:** Trang cấu hình gồm thông tin liên hệ, địa chỉ hỗ trợ, liên kết chính sách, múi giờ và các tham số được phép thay đổi.
- [ ] **ADM-CONFIG-002 — P0:** Định nghĩa ranh giới cấu hình nghiệp vụ và secret/hạ tầng; không đưa mật khẩu DB, khóa thanh toán hoặc quyền shell vào trang cấu hình chung.
- [ ] **ADM-CONFIG-003 — P1:** Mỗi cấu hình có kiểu, miền giá trị, đơn vị, mặc định, phạm vi và mô tả tác động; backend từ chối khóa lạ.
- [ ] **ADM-CONFIG-004 — P1:** Đổi thời hạn trả hàng, SLA, giới hạn refund hoặc chính sách phí phải có ngày hiệu lực và nguyên tắc áp dụng hồ sơ cũ.
- [ ] **ADM-CONFIG-005 — P1:** Cấu hình quan trọng có bản nháp, duyệt, xuất bản và rollback; rollback tạo phiên bản mới, không sửa/xóa lịch sử.
- [ ] **ADM-CONFIG-006 — P1:** Chính sách hiển thị cho buyer/seller và policy backend dùng chung phiên bản hiệu lực; không để UI hứa điều backend từ chối.
- [ ] **ADM-CONFIG-007 — P1:** Feature flag có người sở hữu, phạm vi, thời hạn xem xét và audit; tắt tính năng phải có phương án xử lý công việc đang dở.
- [ ] **ADM-CONFIG-008 — P1:** Tắt phương thức thanh toán chỉ chặn intent mới theo policy; vẫn xử lý webhook, đối soát và hoàn tiền của giao dịch cũ.
- [ ] **ADM-CONFIG-009 — P1:** Chế độ bảo trì có nội dung công khai và quyền bật/tắt riêng; không chặn callback thanh toán hoặc công việc cần hoàn tất theo thiết kế.
- [ ] **ADM-CONFIG-010 — P2:** Cấu hình theo vùng/kênh nếu mô hình kinh doanh mở rộng; không nhân bản cấu hình khi chưa có nhu cầu.

## 28. Theo dõi hệ thống và xử lý lỗi

- [ ] **ADM-OPS-001 — P0:** Trang trạng thái hiển thị Identity/Catalog/Order/Payment/Engagement/Chat, DB và tích hợp cần thiết với thời điểm kiểm tra gần nhất.
- [ ] **ADM-OPS-002 — P0:** Phân biệt container/process còn chạy, HTTP trả lời, dependency sẵn sàng và nghiệp vụ hoạt động; badge `Running` không đủ để kết luận toàn hệ thống tốt.
- [ ] **ADM-OPS-003 — P0:** Theo dõi lỗi webhook, outbox/inbox chậm, email không gửi và refund chờ quá lâu; có liên kết tới đối tượng lỗi.
- [ ] **ADM-OPS-004 — P0:** Giao diện retry/reconcile là danh sách command cho phép, có scope và permission; không cung cấp shell/SQL tùy ý qua admin.
- [ ] **ADM-OPS-005 — P0:** Retry kiểm tra idempotency, điều kiện trạng thái và giới hạn số lần; tách lỗi tạm thời khỏi lỗi cần con người quyết định.
- [ ] **ADM-OPS-006 — P1:** Dashboard lỗi có mã/correlation ID, service, thời điểm đầu/cuối và số lượng; chi tiết đã loại secret/dữ liệu cá nhân dư thừa.
- [ ] **ADM-OPS-007 — P1:** Có ngưỡng cảnh báo, nhóm nhận, trạng thái đã xác nhận và lịch sử xử lý; gom cảnh báo trùng để tránh nhiễu.
- [ ] **ADM-OPS-008 — P1:** Tác vụ định kỳ có lần chạy gần nhất, kết quả, phạm vi, thời lượng và lỗi; chạy lại phải có cùng quy tắc an toàn như tác vụ tự động.
- [ ] **ADM-OPS-009 — P1:** Theo dõi cấu hình tích hợp theo trạng thái đã cấu hình/khả dụng/hết hạn nếu nguồn cung cấp; chỉ hiển thị fingerprint hoặc metadata cần thiết của secret.
- [ ] **ADM-OPS-010 — P1:** Hiển thị trạng thái backup và lần kiểm tra phục hồi; thao tác restore dữ liệu không nằm trong nút admin vận hành thông thường.
- [ ] **ADM-OPS-011 — P1:** Nhật ký sự cố có mức độ, dịch vụ ảnh hưởng, người phụ trách, timeline và bài học; không dùng để tự động xóa dữ liệu gây lỗi.
- [ ] **ADM-OPS-012 — P2:** Liên kết công cụ quan sát chuyên dụng với SSO/quyền phù hợp thay vì xây lại toàn bộ hệ thống log trong ứng dụng.

**Nghiệm thu:** khi PostgreSQL dừng, admin thể hiện module phụ thuộc không sẵn sàng và thời điểm dữ liệu cũ; sau phục hồi không tự gửi lại lệnh tiền chưa rõ kết quả.

## 29. Yêu cầu giao diện và khả năng sử dụng

- [ ] **ADM-UX-001 — P0:** Menu theo quyền, tên module thống nhất; đường dẫn trực tiếp vẫn được bảo vệ và có trang không đủ quyền rõ ràng.
- [ ] **ADM-UX-002 — P0:** Mọi màn hình có trạng thái đang tải, rỗng, không có kết quả, lỗi, thiếu quyền và dữ liệu cũ nếu áp dụng.
- [ ] **ADM-UX-003 — P0:** Trạng thái dùng nhãn tiếng Việt và ký hiệu, không chỉ màu; giữ ID trạng thái kỹ thuật trong nơi tra cứu phù hợp.
- [ ] **ADM-UX-004 — P0:** Hành động quan trọng mở xác nhận có đúng tên/ID đối tượng, thay đổi sắp áp dụng, hậu quả và lý do; không dùng một hộp “Bạn có chắc?” chung chung.
- [ ] **ADM-UX-005 — P0:** Khi đang gửi mutation, chặn bấm lặp ở UI và có chống lặp ở backend; timeout hiển thị chưa rõ kết quả với cách kiểm tra lại.
- [ ] **ADM-UX-006 — P0:** Bản ghi đã thay đổi trả 409 phải giải thích và cho tải lại; không tự retry ghi đè bản mới.
- [ ] **ADM-UX-007 — P1:** Bộ lọc đồng bộ URL, có xóa lọc, reset trang khi đổi lọc và giữ trạng thái khi trở về từ chi tiết.
- [ ] **ADM-UX-008 — P1:** Trang chi tiết có link chia sẻ, copy mã và liên kết tài nguyên liên quan; không buộc mở modal mất ngữ cảnh để xử lý hồ sơ dài.
- [ ] **ADM-UX-009 — P1:** Có điều hướng bàn phím, focus khi mở/đóng dialog, label cho input và thông báo lỗi có thể đọc bằng công cụ hỗ trợ.
- [ ] **ADM-UX-010 — P1:** Desktop dùng được cho bảng lớn; mobile/tablet có cách đọc và thao tác phù hợp, không che nút xác nhận/lý do.
- [ ] **ADM-UX-011 — P1:** Hiển thị tiền, ngày, số lượng và định dạng ID nhất quán; dữ liệu thiếu hiện “Chưa có dữ liệu”, không tự suy đoán.
- [ ] **ADM-UX-012 — P1:** Tác vụ lâu có tiến trình, kết quả từng phần và cách quay lại; không yêu cầu giữ nguyên tab để job tiếp tục chạy.
- [ ] **ADM-UX-013 — P1:** Thay đổi form chưa lưu có cảnh báo; lỗi validation giữ dữ liệu hợp lệ và chỉ đúng trường cần sửa.
- [ ] **ADM-UX-014 — P2:** Ghim bộ lọc, cột bảng tùy chọn và phím tắt cho công việc lặp; không dùng phím tắt thực hiện ngay lệnh tài chính.

## 30. API và phân chia trách nhiệm service

### 30.1. Quyền sở hữu

| Miền                                                   | Service sở hữu đề xuất          | Nguyên tắc                                                                |
| ------------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------- |
| Admin, nhân sự, phiên, quyền                           | Identity                        | Các service khác xác minh danh tính/quyền qua hợp đồng tin cậy            |
| Shop, sản phẩm, danh mục, tồn, trang chủ               | Catalog                         | Giữ kiểm tra cờ chặn ở public/seller/inventory                            |
| Đơn, yêu cầu trả hàng, hồ sơ tranh chấp đơn            | Order                           | Quyết định nghiệp vụ đơn; không tự xác nhận kết quả chi tiền              |
| Giao dịch, refund, đối soát, COD theo khả năng hiện có | Payment                         | Nguồn kết quả tiền; adapter provider không được gọi từ frontend           |
| Voucher, Flash Sale, review, thông báo                 | Engagement                      | Tái sử dụng nghiệp vụ có sẵn và bổ sung admin authorization               |
| Hội thoại, attachment, báo cáo chat, bot               | Chat                            | Quyền truy cập bằng chứng giới hạn theo vụ việc                           |
| Ticket hỗ trợ tổng quát                                | Cần chốt owner trước triển khai | MVP có thể dùng module trong service hiện có; không mặc định thêm service |
| Giao nhận/quyết toán tương lai                         | Chốt theo phạm vi được duyệt    | Chỉ tạo module/service khi adapter và nghiệp vụ đã sẵn sàng               |

Trang tổng hợp có thể gọi nhiều API hoặc dùng lớp tổng hợp phía server nếu có nhu cầu. Lớp tổng hợp không sở hữu lại giao dịch tiền hoặc ghi trực tiếp vào bảng của các service.

### 30.2. Quy ước hợp đồng

- [ ] **ADM-API-001 — P0:** API mở rộng đặt dưới prefix `/api/v2/admin`; giữ tương thích endpoint hiện tại hoặc có kế hoạch chuyển đổi rõ ràng.
- [ ] **ADM-API-002 — P0:** Dùng danh tính actor từ phiên xác thực; không tin `actorId`, `role`, `approvedBy` hoặc `userId` trong body để cấp quyền.
- [ ] **ADM-API-003 — P0:** Đọc danh sách có allowlist query, giới hạn `limit`, thứ tự ổn định và chỉ mục phù hợp; không cho query SQL tùy ý.
- [ ] **ADM-API-004 — P0:** Bổ sung `from`, `to`, `sort`, `assigneeId` theo từng contract; bộ lọc ngoài allowlist bị từ chối. Contract admin hiện tại chưa nhận các khóa này.
- [ ] **ADM-API-005 — P0:** Mutation có `version`, `reason`/`reasonCode` khi áp dụng, idempotency key với hành động có tác dụng phụ và mã tương quan.
- [ ] **ADM-API-006 — P0:** Schema từ chối trường lạ; phân biệt lỗi validation, thiếu quyền, không tìm thấy, xung đột, quá tần suất và dependency không khả dụng.
- [ ] **ADM-API-007 — P0:** HTTP 202 chỉ dùng khi đã nhận việc nền và trả job/command ID; trạng thái job cho biết kết quả thực thi cuối cùng.
- [ ] **ADM-API-008 — P0:** Lỗi trả mã ổn định, thông điệp phù hợp và correlation ID; không trả stack, query, secret hoặc dữ liệu khách khác.
- [ ] **ADM-API-009 — P0:** Kiểm tra origin/CSRF phù hợp cơ chế xác thực đang dùng; cookie, bearer và URL tải file không được dùng lẫn mà thiếu kiểm soát.
- [ ] **ADM-API-010 — P0:** Lưu idempotency gồm actor/phạm vi, key, hash payload, trạng thái và kết quả; cùng key khác payload phải bị từ chối.
- [ ] **ADM-API-011 — P0:** Với lệnh tiền, kiểm tra cả key và tham chiếu nghiệp vụ/provider lâu dài; hết TTL cache idempotency không được mở lại khả năng chi trùng.
- [ ] **ADM-API-012 — P1:** Cập nhật OpenAPI và kiểu TypeScript từ contract; permission tương ứng được ghi cho từng endpoint.

### 30.3. Danh mục API dự kiến

**Đây là thiết kế đề xuất, không phải danh sách endpoint đã triển khai.** Tên cuối cùng cần thống nhất với kiến trúc hiện hữu. Những endpoint read/status hiện có nên được mở rộng thay vì tạo bản trùng.

| Nhóm                | Method và path sau `/api/v2`                                                     | Quyền gợi ý                          | Ghi chú                                                   |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------- |
| MFA                 | `POST /auth/admin/mfa/challenge`                                                 | Phiên xác thực từng bước             | Không cấp quyền nghiệp vụ                                 |
| Phiên               | `GET /admin/sessions`, `DELETE /admin/sessions/:id`                              | `sessions.read/revoke`               | Tách phạm vi phiên của mình/người khác                    |
| Nhân sự             | `GET /admin/staff`, `POST /admin/staff/invitations`                              | `staff.read/invite`                  | Lời mời có hạn                                            |
| Vai trò             | `GET /admin/roles`, `PATCH /admin/staff/:id/roles`                               | `roles.read/assign`                  | Có kiểm tra quyền được phép cấp                           |
| Phê duyệt           | `GET /admin/approvals`, `POST /admin/approvals/:id/decisions`                    | `approvals.read/decide`              | Ràng buộc domain và phiên bản dữ liệu                     |
| Dashboard           | `GET /admin/overview` hoặc endpoint summary mở rộng                              | `dashboard.read`                     | Dữ liệu theo quyền và kỳ                                  |
| Công việc           | `GET /admin/work-items`, `POST /admin/work-items/:id/assignments`                | `work.read/assign`                   | Chốt owner, không gộp transaction liên service            |
| Người dùng          | `GET /admin/users/:id/context`                                                   | `users.read` và quyền miền liên quan | Chỉ dữ liệu được phép                                     |
| Shop                | `GET /admin/store-applications`, `POST /admin/store-applications/:id/decisions`  | `stores.review`                      | Chỉ khi có chính sách xét duyệt                           |
| Sản phẩm            | `GET /admin/product-reviews`, `POST /admin/product-reviews/:id/decisions`        | `products.review`                    | Phân biệt review xét duyệt với đánh giá khách             |
| Danh mục            | `GET/POST /admin/categories`, `PATCH /admin/categories/:id`                      | `categories.read/write`              | Tái sử dụng nghiệp vụ tạo hiện có                         |
| Kho                 | `GET /admin/inventory/reservations`, `POST /admin/inventory/reconciliation-jobs` | `inventory.read/reconcile`           | Không sửa reservation tùy ý                               |
| Đơn                 | `GET /admin/orders/:id/timeline`                                                 | `orders.read`                        | Bổ sung nguồn sự kiện                                     |
| Hủy đơn             | `POST /admin/orders/:id/cancellations`                                           | `orders.cancel`                      | Kiểm tra state machine                                    |
| Trả hàng            | `GET /admin/returns`, `GET /admin/returns/:id`                                   | `returns.read`                       | Khác API buyer/seller                                     |
| Quyết định trả hàng | `POST /admin/returns/:id/decisions`                                              | `returns.decide`                     | Version, lý do và audit                                   |
| Tranh chấp          | `GET/POST /admin/disputes`, `POST /admin/disputes/:id/decisions`                 | `disputes.read/create/decide`        | Không tự xác nhận chi tiền                                |
| Thanh toán          | `GET /admin/payments`, `GET /admin/payments/:id`                                 | `payments.read`                      | Theo phạm vi được giao                                    |
| Kiểm tra provider   | `POST /admin/payments/:id/status-checks`                                         | `payments.reconcile`                 | Rate limit và idempotency                                 |
| Đối soát            | `GET /admin/reconciliations`, `POST /admin/reconciliation-jobs`                  | `reconciliation.read/run`            | Job và kết quả từng mục                                   |
| Refund              | `GET/POST /admin/refunds`, `GET /admin/refunds/:id`                              | `refunds.read/request`               | Kiểm tra nguồn và số tiền                                 |
| Duyệt refund        | `POST /admin/refunds/:id/decisions`                                              | `refunds.approve`                    | Không tự duyệt, dữ liệu đã cố định                        |
| Retry refund        | `POST /admin/refunds/:id/retry-requests`                                         | `refunds.retry`                      | Kiểm tra kết quả provider cũ                              |
| Thực chi thủ công   | `POST /admin/refunds/:id/settlement-confirmations`                               | `refunds.settle`                     | Bọc nghiệp vụ settlement hiện có, không lộ internal token |
| Báo cáo vi phạm     | `GET /admin/reports`, `POST /admin/reports/:id/decisions`                        | `moderation.read/decide`             | Chốt cơ chế gom nguồn                                     |
| Review khách        | `POST /admin/reviews/:id/moderation-decisions`                                   | `reviews.moderate`                   | Ẩn/khôi phục, không sửa lời khách                         |
| Ticket              | `GET/POST /admin/tickets`, `POST /admin/tickets/:id/messages`                    | `support.read/write`                 | Nội bộ/công khai là hai loại tin                          |
| Khuyến mãi          | `GET/POST /admin/campaigns`, `POST /admin/campaigns/:id/status-changes`          | `promotions.read/write/publish`      | Tái sử dụng Engagement                                    |
| Media               | `POST /admin/media/upload-intents`, `GET /admin/media`                           | `media.upload/read`                  | Luồng file theo storage được chọn                         |
| Trang chủ           | `GET /admin/storefront/versions`, `POST /admin/storefront/restorations`          | `storefront.read/restore`            | Restore vào nháp                                          |
| Thông báo           | `GET /admin/notification-deliveries`, `POST /admin/notification-retries`         | `notifications.read/retry`           | Không gửi lặp sự kiện                                     |
| Chat                | `GET /admin/chat/reports/:id/evidence`                                           | `chat.evidence.read`                 | Bắt buộc vụ việc và lý do                                 |
| Báo cáo             | `GET /admin/analytics/:reportKey`                                                | `analytics.read`                     | Allowlist report và dimension                             |
| Export              | `POST /admin/export-jobs`, `GET /admin/export-jobs/:id`                          | `<domain>.export`                    | Tải file kiểm tra lại quyền                               |
| Audit               | `GET /admin/audit-events` hoặc tổng hợp endpoint hiện có                         | `audit.read`                         | Nêu độ trễ index nếu có                                   |
| Cấu hình            | `GET /admin/settings`, `POST /admin/settings/changes`                            | `settings.read/change`               | Không quản lý secret qua form này                         |
| Vận hành            | `GET /admin/system/health`, `GET /admin/jobs/:id`                                | `operations.read`                    | Chỉ metadata cần thiết                                    |

### 30.4. Quyền tối thiểu cho thao tác nhạy cảm

| Hành động                  | Quyền nghiệp vụ         | Yêu cầu bổ sung                                      |
| -------------------------- | ----------------------- | ---------------------------------------------------- |
| Xem địa chỉ đầy đủ         | `orders.view_sensitive` | Vụ việc/lý do, audit truy cập                        |
| Xem bằng chứng chat        | `chat.evidence.read`    | Phạm vi hội thoại thuộc báo cáo                      |
| Khóa tài khoản             | `users.moderate`        | Version, lý do, thu hồi phiên                        |
| Duyệt hoàn ngoại lệ        | `refunds.approve`       | Khác người tạo, xác thực lại theo policy             |
| Xác nhận chuyển khoản hoàn | `refunds.settle`        | Bằng chứng đối soát, mã tham chiếu và số tiền hợp lệ |
| Cấp vai trò                | `roles.assign`          | Không cấp vượt thẩm quyền, không tự cấp              |
| Xuất danh sách người dùng  | `users.export`          | Quyền từng cột, thời hạn file, audit                 |
| Retry webhook              | `payments.reprocess`    | Sự kiện đã xác minh, chống thực hiện lặp             |
| Xuất bản trang chủ         | `storefront.publish`    | Phiên bản hợp lệ, duyệt nếu policy yêu cầu           |

## 31. Mô hình dữ liệu đề xuất

### 31.1. Đối tượng cần lưu

Không yêu cầu tạo mọi bảng ngay từ đầu. Trước khi thêm bảng phải đối chiếu entity hiện hữu, xác định owner, khóa ngoại trong cùng miền và cách tham chiếu ID qua service.

| Đối tượng             | Trường tối thiểu/điểm cần thiết kế                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Vai trò và permission | Mã ổn định, tên, domain/action, trạng thái, mapping và phiên bản                                             |
| Gán quyền nhân viên   | Nhân viên, role/scope, người cấp, thời điểm hiệu lực/hết hạn, lý do                                          |
| Đăng ký MFA           | Tham chiếu secret được bảo vệ, trạng thái, thời điểm xác minh; mã khôi phục lưu theo cơ chế kiểm tra an toàn |
| Yêu cầu phê duyệt     | Domain, target, requester, payload hash/version, số tiền nếu có, quyết định, người duyệt và hạn              |
| Work item             | Loại, target, assignee/team, ưu tiên, hạn phản hồi/giải quyết, trạng thái, version                           |
| Dispute/case          | Order/return liên quan, bên yêu cầu, lý do, phương án, số tiền, owner, policy version và kết luận            |
| Bằng chứng            | Case/report, uploader, storage key, loại/dung lượng/hash, trạng thái quét, quyền, thời hạn                   |
| Quyết định kiểm duyệt | Đối tượng và snapshot/version, lý do, policy version, hành động, actor, hiệu lực và kháng nghị               |
| Ticket/message        | Đối tượng hỗ trợ, bên tham gia, loại nội bộ/công khai, người gửi, thời điểm và attachment                    |
| Lệnh admin            | Loại command, actor, target, idempotency key, request hash, trạng thái/kết quả và correlation ID             |
| Audit                 | Actor, domain, target, action, before/after đã lọc, lý do, kết quả, UTC và correlation ID                    |
| Export job            | Report/domain, bộ lọc/cột, requester, trạng thái, số dòng, mốc dữ liệu, file reference và hạn                |
| Phiên đối soát        | Provider, kỳ, nguồn/file hash, tổng, chênh lệch, kết quả từng mục và người xác nhận                          |
| Media                 | Storage key, metadata, uploader, kiểm tra/quét, tham chiếu sử dụng và trạng thái                             |
| Policy/config version | Key, schema/version, giá trị được phép, hiệu lực, người duyệt và lịch sử                                     |

### 31.2. Ràng buộc dữ liệu

- [ ] **ADM-DATA-001 — P0:** Unique business key cho refund nguồn, event provider, quyết định đang hiệu lực và lệnh cần chống lặp.
- [ ] **ADM-DATA-002 — P0:** Ràng buộc tiền/số lượng không âm, tổng không vượt nguồn hợp lệ; không chỉ kiểm tra trong form.
- [ ] **ADM-DATA-003 — P0:** Bản ghi nghiệp vụ quan trọng có version và thời điểm; mutation kiểm tra phiên bản trong transaction.
- [ ] **ADM-DATA-004 — P0:** Giữ ID tài nguyên gốc khi hiển thị snapshot; snapshot bị thiếu phải ghi rõ, không thay bằng dữ liệu hiện tại mà không nhãn.
- [ ] **ADM-DATA-005 — P0:** Không cascade delete làm mất order/payment/audit khi xóa hoặc ẩn danh tài khoản.
- [ ] **ADM-DATA-006 — P0:** File bằng chứng không lưu đường dẫn public mặc định; quyền truy cập được đánh giá khi cấp/tải, không chỉ khi upload.
- [ ] **ADM-DATA-007 — P1:** Index theo tổ hợp lọc thực tế: trạng thái + thời gian, assignee + trạng thái, target ID và provider reference.
- [ ] **ADM-DATA-008 — P1:** Migration có backfill/kiểm chứng và phương án rollback hoặc forward-fix; chạy lại không tạo dữ liệu trùng.
- [ ] **ADM-DATA-009 — P1:** Tham số policy áp dụng đơn/khuyến mãi có snapshot hoặc tham chiếu phiên bản; đổi cấu hình không đổi nghĩa bản ghi quá khứ.

### 31.3. Phân biệt trạng thái nguồn hiện có

| Nguồn                 | Ví dụ trạng thái trong mã nguồn                                                                                      | Yêu cầu trình bày                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Order                 | `PENDING_PAYMENT`, `PLACED`, `SHIPPING`, `DELIVERED`, `CANCELLED`                                                    | Trạng thái thực hiện đơn                                           |
| Thanh toán trên Order | `UNPAID`, `PAID`, `FAILED`, `REFUNDED` và trạng thái group liên quan                                                 | Không đồng nhất với state máy provider                             |
| Payment intent        | `INITIATED`, `PENDING`, `SUCCEEDED`, `FAILED`, `EXPIRED`, `PARTIALLY_REFUNDED`, `REFUNDED`, `UNPAID`                 | Có ánh xạ nhãn, không đổi enum để hợp UI                           |
| Return request        | `REQUESTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `RETURNING`, `RECEIVED`, `REFUND_PENDING`, `REFUNDED`, `CLOSED` | Trạng thái yêu cầu trả hàng                                        |
| Refund Payment        | `INITIATED`, `PENDING`, `SUCCEEDED`, `FAILED` theo migration hiện có                                                 | Hành trình duyệt admin lưu riêng nếu bổ sung                       |
| Dispute/work item mới | Chốt state machine khi triển khai                                                                                    | Không ghi các trạng thái đề xuất vào bảng cũ khi chưa có migration |

Danh sách trên là điểm đối chiếu, không thay hợp đồng đầy đủ; cần kiểm tra toàn bộ migration có hiệu lực trước khi triển khai.

## 32. Hiệu năng và vận hành

- [ ] **ADM-NFR-001 — P1:** Xác định bộ dữ liệu và số admin đồng thời để đo hiệu năng; mục tiêu thử nghiệm ban đầu có thể là p95 danh sách ≤ 2 giây, chi tiết ≤ 3 giây trong môi trường đã thống nhất.
- [ ] **ADM-NFR-002 — P1:** Không coi các con số trên là SLA đã đạt; ghi cấu hình máy, dung lượng dữ liệu, phạm vi API và kết quả đo.
- [ ] **ADM-NFR-003 — P0:** Lỗi một service không làm frontend mất toàn bộ phiên hoặc cho thao tác thiếu dữ liệu quyết định; giữ rõ phần nào đọc được/phần nào bị khóa thao tác.
- [ ] **ADM-NFR-004 — P0:** Timeout sau mutation có cách tra cứu kết quả bằng command ID/key; người dùng không phải đoán xem có nên bấm lại.
- [ ] **ADM-NFR-005 — P1:** Export, import, gửi hàng loạt và đối soát lớn chạy nền, có giới hạn tài nguyên, progress và kết quả từng mục.
- [ ] **ADM-NFR-006 — P1:** Không chạy truy vấn không giới hạn hoặc tải tất cả đối tượng chỉ để đếm ở frontend; trang lớn có phân trang và thứ tự xác định.
- [ ] **ADM-NFR-007 — P0:** Cache số liệu/quyền không làm nhân viên bị thu hồi quyền tiếp tục thực thi; quyền phải được kiểm tra tại thời điểm hành động.
- [ ] **ADM-NFR-008 — P1:** Backup, retention và kiểm thử phục hồi có người phụ trách, RPO/RTO cần chốt; không tuyên bố backup tốt nếu chưa từng kiểm tra restore.
- [ ] **ADM-NFR-009 — P1:** Có môi trường kiểm thử tách biệt, provider giả lập/sandbox và nhãn môi trường dễ nhận biết.
- [ ] **ADM-NFR-010 — P0:** Không dùng người dùng/shop/đơn thật làm dữ liệu test cho khóa, hủy, hoàn hoặc xuất bản; fixture có marker và kế hoạch dọn.
- [ ] **ADM-NFR-011 — P1:** Deploy migration/schema mới theo thứ tự tương thích; các instance Catalog phải thống nhất kiểm tra chặn trước khi mở hành động kiểm duyệt mới.
- [ ] **ADM-NFR-012 — P1:** Feature rollout có phạm vi thử, theo dõi lỗi và khả năng tắt; tắt module không hủy command tiền đã gửi hoặc làm mất việc đang xử lý.

## 33. Kịch bản kiểm thử và nghiệm thu

### 33.1. Ma trận kịch bản quan trọng

Mỗi dòng là một kịch bản cần bằng chứng phù hợp: API, integration trên database riêng, provider giả lập hoặc thao tác trình duyệt. Không bắt buộc viết unit test cho mọi label hoặc thay đổi CSS.

| Mã     | Kịch bản                                         | Kết quả bắt buộc                                                                     |
| ------ | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| AT-001 | Buyer/seller gọi trực tiếp API admin             | 403; không thay đổi dữ liệu hoặc cấp phiên admin                                     |
| AT-002 | Nhân viên có read nhưng không có export          | Xem trong phạm vi được giao; tạo/tải export bị từ chối                               |
| AT-003 | Cấp và thu hồi quyền giữa một phiên              | Bước tiếp theo kiểm tra quyền mới; không chờ UI tự làm mới                           |
| AT-004 | Token chưa hoàn tất MFA gọi API nghiệp vụ        | Bị từ chối; mã MFA/khôi phục lặp không cấp thêm phiên                                |
| AT-005 | Người tạo hoàn tiền tự duyệt                     | Bị từ chối dù tài khoản có nhiều vai trò                                             |
| AT-006 | Hai admin khóa/khôi phục cùng phiên bản          | Chỉ một thay đổi hợp lệ; bên còn lại nhận xung đột                                   |
| AT-007 | Audit ghi lỗi trong mutation bắt buộc            | Thay đổi dữ liệu cục bộ rollback                                                     |
| AT-008 | Khóa tài khoản có phiên cũ                       | Access/refresh bị từ chối theo chính sách hiện có                                    |
| AT-009 | Khôi phục tài khoản chưa xác minh                | Vẫn cần xác minh email                                                               |
| AT-010 | Seller sửa trạng thái shop/sản phẩm bị chặn      | Không bỏ được cờ chặn của sàn                                                        |
| AT-011 | Shop tự ngừng trước khi sàn chặn                 | Khôi phục của sàn giữ ý định không nhận đơn                                          |
| AT-012 | Khôi phục sản phẩm bản nháp                      | Không tự trở thành đang bán                                                          |
| AT-013 | Chuyển danh mục vào hậu duệ                      | Bị từ chối, không tạo chu trình                                                      |
| AT-014 | Ngừng danh mục còn sản phẩm/tham chiếu           | Thực thi đúng policy đã chốt hoặc yêu cầu xử lý tham chiếu trước                     |
| AT-015 | Checkout nhiều shop, hủy một shop                | Phân bổ tồn, tiền và voucher đúng từng phần                                          |
| AT-016 | Callback thanh toán tới sau khi hủy              | Không hồi sinh đơn trái policy; đưa vào luồng xử lý tiền muộn                        |
| AT-017 | Provider callback trùng hoặc tới sai thứ tự      | Không ghi nhận thu/hoàn hai lần, không lùi trạng thái hợp lệ                         |
| AT-018 | Provider báo sai số tiền                         | Không xác nhận đơn đã thanh toán                                                     |
| AT-019 | Hai refund đồng thời cùng đơn                    | Tổng đã hoàn/đang giữ không vượt tiền đủ điều kiện                                   |
| AT-020 | Request hoàn timeout rồi nhân viên retry         | Tra cứu kết quả cũ; không tạo lần chi mới khi chưa xác định                          |
| AT-021 | Đổi tài khoản nhận tiền sau duyệt                | Mất hiệu lực duyệt cũ, yêu cầu đánh giá lại                                          |
| AT-022 | COD/VietQR chỉ có ảnh chứng từ                   | Không tự coi tiền đã hoàn; cần xác nhận đối soát có quyền                            |
| AT-023 | Payment xác nhận hoàn nhưng event tới Order chậm | UI nêu khác biệt nguồn; retry đồng bộ không cộng lại tiền                            |
| AT-024 | Trả cùng item nhiều lần vượt lượng đã mua        | Bị từ chối tại backend                                                               |
| AT-025 | Hoàn phí ship qua nhiều yêu cầu trả              | Không vượt chính sách/tiền ship đủ điều kiện                                         |
| AT-026 | Từ chối yêu cầu trả hàng                         | Không tạo refund; có lý do và thông báo                                              |
| AT-027 | Shop bị khóa nhưng còn yêu cầu hậu mãi           | Có đường xử lý bởi người được giao, không mở lại bán hàng ngầm                       |
| AT-028 | Báo cáo trùng cùng vụ việc                       | Gom hồ sơ mà vẫn giữ các nguồn; không phạt lặp thiếu căn cứ                          |
| AT-029 | Nhân viên không có quyền xem chat/bằng chứng     | Không truy cập được API hoặc URL file                                                |
| AT-030 | Ẩn/khôi phục review                              | Điểm tổng hợp cập nhật theo policy và audit đầy đủ                                   |
| AT-031 | Voucher sát quota bị dùng đồng thời              | Không vượt ngân sách/quota; retry không trừ thêm lượt                                |
| AT-032 | Voucher hết hạn hoặc campaign tạm dừng           | Backend ngăn sử dụng mới, không phá đơn đã cam kết                                   |
| AT-033 | Lưu nháp/xem trước trang chủ                     | Không thay bản public; preview vẫn yêu cầu quyền                                     |
| AT-034 | Hai biên tập xuất bản cùng phiên bản             | Không ghi đè âm thầm; phát hiện xung đột                                             |
| AT-035 | Job xuất bản đã hủy vẫn được gọi lại             | Không xuất bản; command idempotent                                                   |
| AT-036 | Upload file giả ảnh/không qua kiểm tra           | Bị từ chối hoặc cách ly; không có URL public dùng được                               |
| AT-037 | CSV có ô bắt đầu bằng công thức                  | File được xử lý tránh thực thi công thức khi mở bằng công cụ mục tiêu                |
| AT-038 | Quyền bị thu hồi sau khi tạo export              | Không tải được file ngoài quyền hiện tại                                             |
| AT-039 | Export đã hết hạn hoặc link bị chia sẻ           | Không tải trái phép; tệp hết hạn được dọn theo policy                                |
| AT-040 | Lọc ngày qua ranh giới UTC/ngày Bangkok          | Danh sách và tổng số liệu khớp quy ước ngày                                          |
| AT-041 | DB/service dừng khi dashboard đang mở            | Nêu phần lỗi/độ cũ, không thay dữ liệu bằng 0 hoặc mock                              |
| AT-042 | Gửi thông báo retry cùng event ID                | Không gửi trùng ngoài chính sách gửi lại có chủ đích                                 |
| AT-043 | Đăng xuất hoặc hết phiên khi có form chưa gửi    | Không tự gửi lại sau đăng nhập; dữ liệu nhạy cảm không còn trong cache               |
| AT-044 | Giao diện mobile, keyboard và dialog             | Truy cập được bộ lọc/chi tiết, focus đúng và không mất nút xác nhận                  |
| AT-045 | Tải lớn theo tập dữ liệu đã chốt                 | Đạt mục tiêu đo; export/job không làm nghẽn request vận hành chính                   |
| AT-046 | Người dùng bị ẩn danh nhưng có giao dịch cũ      | Quan hệ, tổng tiền và audit cần thiết còn nhất quán                                  |
| AT-047 | Hủy/đổi cấu hình sau khi command đã xếp hàng     | Worker kiểm tra lại điều kiện và ghi kết quả; không thực thi dữ liệu đã mất hiệu lực |
| AT-048 | Migration/backfill trên bản sao dữ liệu đại diện | Không đổi ID, giá, snapshot, quyền hoặc số tiền ngoài phạm vi migration              |

### 33.2. Luồng nghiệm thu đầu cuối tối thiểu

1. **CSKH xử lý tranh chấp:** đăng nhập có MFA → tìm đơn → mở case → xem bằng chứng theo quyền → yêu cầu bổ sung → đề xuất quyết định → người khác duyệt nếu cần → theo dõi hoàn/khắc phục → thông báo và đóng.
2. **Tài chính xử lý hoàn lỗi:** lọc refund quá hạn → xem tiền nguồn và lần chi trước → kiểm tra provider → retry an toàn hoặc xác minh thực chi → nhận kết quả → Order cập nhật → audit khớp số tiền.
3. **Kiểm duyệt báo cáo:** nhận việc → xem snapshot/bằng chứng → đối chiếu policy → quyết định → Catalog/Chat/Engagement áp dụng → thông báo → xử lý kháng nghị.
4. **Marketing xuất bản chiến dịch:** tạo nháp → chọn scope/quota → mô phỏng điều kiện → duyệt ngân sách → lên lịch → chạy → theo dõi → kết thúc → đối soát ngân sách.
5. **Biên tập thay banner:** upload/kiểm tra ảnh → sửa nháp → xem trước desktop/mobile → duyệt/xuất bản → kiểm tra public → phục hồi bản trước vào nháp khi cần.
6. **Nhân sự nghỉ việc:** khóa nhân sự → phiên bị thu hồi → job/export kiểm tra lại quyền → việc mở được chuyển người → audit đầy đủ.

## 34. Lộ trình và điều kiện hoàn thành

### 34.1. Các gói triển khai

| Gói             | Phạm vi                                                                      | Phụ thuộc                                   | Kết quả bàn giao                                         |
| --------------- | ---------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------- |
| G0 — Nền tảng   | Permission, MFA, actor/audit, version, idempotency, schema API               | Hiện trạng Identity/Catalog/Order           | Mọi module mới có nền quyền và lịch sử thống nhất        |
| G1 — Hậu mãi    | Admin returns/disputes, work queue, bằng chứng, SLA, thông báo cơ bản        | G0 và nghiệp vụ trả hàng hiện có            | Có thể xử lý một vụ việc từ tiếp nhận tới kết luận       |
| G2 — Tiền       | Payment/refund/reconciliation console, duyệt ngoại lệ, thực chi và đồng bộ   | G0; phối hợp G1, Payment adapter            | Có thể điều tra và hoàn tiền đúng nguồn, không chi trùng |
| G3 — Kiểm duyệt | Reports, moderation, kháng nghị và chat evidence                             | G0, policy nội dung và quyền riêng tư       | Nhận và giải quyết báo cáo có lưu bằng chứng/quyết định  |
| G4 — Năng suất  | Dashboard hành động, lọc nâng cao, audit thống nhất, export, ticket          | Các domain liên quan                        | Giảm tra cứu thủ công và kiểm tra được số liệu           |
| G5 — Thương mại | Categories/attributes, voucher/Flash Sale, CMS/media, notification templates | G0 và Catalog/Engagement                    | Nhân viên phụ trách vận hành nội dung/chiến dịch qua UI  |
| G6 — Mở rộng    | Logistics, payout/fees, SSO, BI, tự động gợi ý rủi ro                        | Phạm vi kinh doanh và nguồn dữ liệu đã chốt | Chỉ thực hiện module có lợi ích và chủ sở hữu rõ ràng    |

G1 và G2 có thể thiết kế cùng nhau vì case và refund liên quan chặt chẽ. Có thể bàn giao phần chỉ đọc của Payment trước, nhưng không mở nút thực thi khi nền quyền/idempotency chưa hoàn tất.

### 34.2. Định nghĩa hoàn thành cho mỗi đầu việc

- [ ] Có mã yêu cầu, ưu tiên, owner và phạm vi được thống nhất; biết dữ liệu nào là nguồn sự thật.
- [ ] Có thiết kế màn hình, trạng thái rỗng/lỗi/thiếu quyền, câu xác nhận và nội dung gửi các bên.
- [ ] Có API/schema, permission, audit và kiểm soát đồng thời/chống lặp phù hợp tác động.
- [ ] Có migration/backfill nếu cần; không làm thay đổi dữ liệu cũ ngoài phạm vi đã mô tả.
- [ ] Dùng dữ liệu thật qua API; fixture/mock chỉ tồn tại trong môi trường/bài test được phân biệt rõ.
- [ ] Kiểm thử mức cần thiết đã đạt, gồm lỗi và trường hợp đồng thời cho nghiệp vụ tiền/trạng thái quan trọng.
- [ ] Kiểm tra UI desktop/mobile cho màn thay đổi; build và các kiểm tra bắt buộc của dự án đạt hoặc lỗi tồn tại được ghi rõ.
- [ ] Tài liệu API, hướng dẫn vận hành và quyền đã được cập nhật; có bằng chứng nghiệm thu.
- [ ] Nếu có job/provider: có cách theo dõi, điều tra, retry an toàn và quy trình xử lý khi kết quả chưa rõ.
- [ ] Có hướng rollout, giám sát và rollback/forward-fix; không xem hoàn thành local là đã triển khai production.

### 34.3. Mẫu tách issue từ tài liệu

```text
Tiêu đề: [ADM-REFUND-009] Kiểm tra kết quả refund cũ trước khi retry
Mức ưu tiên: P0
Owner nghiệp vụ: Tài chính
Owner kỹ thuật: Payment + Admin frontend
Hiện trạng: Có nghiệp vụ refund, chưa có luồng admin tương ứng
Phạm vi: Đọc trạng thái provider, quyết định retry, audit và trạng thái UI
Ngoài phạm vi: Thêm provider mới hoặc đổi chính sách tiền hoàn
Quyền: refunds.read + refunds.retry
Đầu vào: Refund ID, version, lý do, idempotency key
Điều kiện: Đủ quyền; refund chưa được xác nhận thành công
Kết quả: Trả command ID/trạng thái có thể tra cứu, không tạo chi trùng
Lỗi: Provider không rõ kết quả; quyền bị thu hồi; version conflict
Nghiệm thu: AT-019, AT-020, AT-023
Phụ thuộc: ADM-API-010, ADM-API-011, ADM-REFUND-007
```

## 35. Quyết định nghiệp vụ cần chốt

Các mục dưới đây là quyết định thiết kế cho giai đoạn triển khai, không phải yêu cầu người đọc phải trả lời trước khi có thể dùng tài liệu.

| Mã   | Câu hỏi cần quyết định                               | Đề xuất mặc định/phạm vi ban đầu                                                                   |
| ---- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Q-01 | Vai trò nào được dùng trước?                         | CSKH, kiểm duyệt, tài chính, nội dung và quản trị; chỉ mở nhóm có người phụ trách                  |
| Q-02 | MFA bắt buộc khi nào và cách phục hồi?               | Bắt buộc trước vận hành thật cho admin; phục hồi có xác minh và audit                              |
| Q-03 | Mức tiền/loại ngoại lệ nào cần hai người?            | Chốt cùng tài chính; không cài ngưỡng tùy ý vào source                                             |
| Q-04 | Thời hạn phản hồi/giải quyết từng loại vụ việc?      | Cấu hình theo loại, xác định thời điểm bắt đầu/tạm dừng                                            |
| Q-05 | Shop mới/sản phẩm mới có duyệt trước không?          | Giữ cơ chế hiện tại tới khi có chính sách và nhân sự duyệt                                         |
| Q-06 | Admin có thể hủy/thay mặt seller đến trạng thái nào? | Chỉ command được Order hỗ trợ, không ép trạng thái hoặc bỏ qua tiền/tồn                            |
| Q-07 | Ngoài hạn trả hàng có xử lý ngoại lệ không?          | Giữ mốc 7 ngày hiện có; ngoại lệ cần quyền và hồ sơ riêng                                          |
| Q-08 | Đổi hàng thay thế được hỗ trợ tới đâu?               | Không coi enum `REPLACEMENT` là luồng đã hoàn chỉnh; phải chốt tồn/đơn thay thế/vận chuyển         |
| Q-09 | COD/VietQR hoàn qua kênh nào và ai xác minh?         | Theo khả năng chi thực tế; chờ xác minh trước khi báo đã hoàn                                      |
| Q-10 | Sàn giữ tiền và quyết toán cho shop không?           | Nếu chưa có: hoãn payout, sổ phí và ví; chỉ báo cáo giao dịch hiện có                              |
| Q-11 | Tích hợp giao vận nào và dữ liệu đáng tin cậy?       | Chỉ mở chức năng theo adapter/hợp đồng đã có                                                       |
| Q-12 | Review bị ẩn có tính vào điểm không?                 | Chốt policy minh bạch, cập nhật tổng hợp nhất quán                                                 |
| Q-13 | Giới hạn đọc chat và giữ bằng chứng?                 | Theo vụ việc, quyền riêng, truy cập có log và thời hạn đã xác định                                 |
| Q-14 | Chính sách lưu/xóa dữ liệu và chứng từ?              | Chốt theo mục đích, yêu cầu áp dụng và khả năng hệ thống; không tự đặt một mốc chung               |
| Q-15 | Voucher cộng dồn và bên tài trợ thế nào?             | Tái sử dụng logic hiện có, ghi snapshot phân bổ; thay đổi cần phiên bản                            |
| Q-16 | Quy trình duyệt/xuất bản nội dung?                   | Giữ luồng nháp/preview/publish; thêm duyệt khi có nhiều người phụ trách                            |
| Q-17 | Ai sở hữu ticket và queue liên domain?               | Chọn owner trước API/schema; không để hai service cùng ghi một hồ sơ                               |
| Q-18 | Khối lượng dữ liệu, tải đồng thời, RPO/RTO?          | Đo baseline, đặt mục tiêu theo môi trường rồi nghiệm thu bằng số liệu                              |
| Q-19 | Phạm vi admin khẩn cấp khi hệ thống lỗi?             | Quy trình riêng, quyền có hạn, xác thực và hậu kiểm; không thêm tài khoản bí mật hoặc bypass chung |
| Q-20 | Điều kiện chuyển từ sandbox sang thật?               | Kiểm thử tích hợp, thông tin môi trường rõ ràng, quyền/provider và quy trình vận hành đã sẵn sàng  |

## 36. Nguồn đối chiếu

### 36.1. Tài liệu và mã nguồn dự án

- [Admin Platform hiện có](Backend/docs/platform-admin.md).
- [Trình biên tập trang chủ](Backend/docs/storefront-editor.md).
- [Kiến trúc và trạng thái Backend](Backend/README.md).
- [Router frontend](Frontend/src/AppRouter.tsx).
- [Menu Admin Platform](Frontend/src/pages/Admin/PlatformAdminShell.tsx).
- [Dashboard](Frontend/src/pages/Admin/PlatformOverview.tsx).
- [Danh sách và chi tiết tài nguyên](Frontend/src/pages/Admin/PlatformRecords.tsx).
- [Nhật ký quản trị](Frontend/src/pages/Admin/PlatformAudit.tsx).
- [API client quản trị](Frontend/src/api/platformAdminApi.ts).
- [API client trang chủ](Frontend/src/api/storefrontApi.ts).
- [Contract phân quyền và bộ lọc hiện tại](Backend/packages/contracts/platform-admin.js).
- [Admin Identity](Backend/services/identity-service/src/services/platform-admin.service.js).
- [Admin Catalog](Backend/services/catalog-service/src/platform-admin.service.js).
- [Admin Order](Backend/services/order-service/src/platform-admin.service.js).
- [Nghiệp vụ trả hàng](Backend/services/order-service/src/return.service.js).
- [Payment HTTP và endpoint nội bộ](Backend/services/payment-service/src/server.js).
- [Nghiệp vụ Payment](Backend/services/payment-service/src/service.js).
- [Engagement HTTP](Backend/services/engagement-service/src/server.js).
- [Chat HTTP và báo cáo hội thoại](Backend/services/chat-service/src/server.js).
- [OpenAPI Identity](Backend/docs/api/identity.openapi.yaml), [Catalog](Backend/docs/api/catalog.openapi.yaml), [Order](Backend/docs/api/order.openapi.yaml).
- [OpenAPI Payment](Backend/docs/api/payment.openapi.yaml), [Review/Return](Backend/docs/api/review-return.openapi.yaml), [Promotion](Backend/docs/api/promotion.openapi.yaml).
- [OpenAPI Inventory](Backend/docs/api/inventory.openapi.yaml), [Notification](Backend/docs/api/notification.openapi.yaml), [Chat](Backend/docs/api/chat.openapi.yaml).

### 36.2. Tham khảo thiết kế quyền và xác thực

- [OWASP — Multifactor Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html): tham khảo thiết kế MFA, đặc biệt tài khoản đặc quyền và phục hồi yếu tố xác thực.
- [OWASP — Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): tham khảo nguyên tắc quyền tối thiểu, kiểm tra quyền trên từng request và kiểm thử quyền.

Các nguồn tham khảo không có nghĩa hệ thống hiện đã đáp ứng một tiêu chuẩn chứng nhận. Mọi yêu cầu mới cần được triển khai và nghiệm thu theo phạm vi được chọn.
