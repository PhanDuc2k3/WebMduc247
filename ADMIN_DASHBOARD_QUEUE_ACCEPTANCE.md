# Dashboard và hàng chờ — nghiệm thu local 27/10/2026

> **Đính chính sau rà soát:** chưa thể xác nhận mục 7 hoàn tất toàn bộ. Đã tái hiện lỗi SLA queue/case không nhất quán; Payment/Chat và trưởng nhóm chuyển cấp trong local chưa sẵn sàng. [Báo cáo rà soát mới](ADMIN_SECTIONS_7_8_REVIEW.md) được ưu tiên khi đối chiếu trạng thái; các kết quả test dưới đây không bao phủ hết các tình huống này.

Phạm vi: ADM-DASH-001…008 và ADM-QUEUE-001…006. Đã triển khai giao diện, API, kiểm tra quyền, migration và kiểm thử local. Chưa xác nhận triển khai production.

## Giao diện

- `/admin`: hôm nay, 7/30 ngày, khoảng ngày tùy chọn; thời gian Asia/Bangkok (UTC+07:00), thời điểm cập nhật từng khu vực, định nghĩa chỉ số và so sánh kỳ trước.
- Thẻ chỉ số, điểm/lát biểu đồ và đơn gần đây mở danh sách/chi tiết với ngày và trạng thái tương ứng. Danh sách lưu bộ lọc trên URL; đóng chi tiết không mất bộ lọc.
- `/admin/finance`: chi tiết giao dịch thanh toán/hoàn tiền thành công trong kỳ. Chỉ tài khoản có quyền tài chính toàn sàn được xem tổng tiền; CSKH không được cấp quyền này.
- `/admin/work-queue`: loại, ưu tiên, đối tượng, nhân sự/nhóm, hai hạn SLA, trạng thái; lọc việc của tôi, chưa phân công, quá hạn, cần phản hồi và chờ phê duyệt. Tự làm mới danh sách/thông báo mỗi 30 giây.
- Nhận việc, phân công, chuyển nhóm, ghi nhận phản hồi, đổi ưu tiên/trạng thái đều có lý do, kiểm tra phiên bản và lịch sử. Hai người cùng nhận: một người thành công, người còn lại nhận HTTP 409 và được tải lại dữ liệu.
- Công việc hậu mãi giữ đồng bộ người phụ trách với hồ sơ hiện có và thu hồi quyền tải chứng cứ cũ khi phân công lại. Hoàn tất đơn, trả hàng, ticket, tranh chấp và hoàn tiền qua luồng nghiệp vụ nguồn. Việc xử lý báo cáo hội thoại được lưu trong hàng chờ cùng lý do và lịch sử.
- “Cần chú ý” lấy công việc còn mở trong phạm vi được giao. Tài khoản chưa xác minh và sản phẩm nháp nằm riêng ở số liệu tham khảo.

## Định nghĩa dữ liệu

| Chỉ số | Nguồn và cách tính |
| --- | --- |
| Người dùng / shop / sản phẩm mới | Ngày tạo trong kỳ, mọi trạng thái, có giới hạn phạm vi. Các số tồn tham khảo hiện tại được ghi rõ. |
| Số đơn | Shop order, không phải checkout group; ngày tạo, gồm đơn hủy. Lát biểu đồ dùng đúng cùng phân nhóm với danh sách. |
| Giá trị đặt hàng | Tổng payable của shop order tạo trong kỳ, loại CANCELLED; yêu cầu quyền tài chính toàn sàn. |
| Thanh toán thành công | Payment transaction SUCCEEDED theo verified_at; gồm COD đã xác nhận; không loại khoản đã thu chỉ vì đơn bị hủy sau đó. |
| Hoàn tiền thành công | Payment refund SUCCEEDED theo succeeded_at; không cộng khoản lỗi/chờ xác minh. Migration dữ liệu cũ dùng updated_at làm mốc chuyển đổi. |
| Doanh thu phí sàn | Chưa có nghiệp vụ nguồn: hiển thị thông tin chưa có, không suy ra từ giá trị đơn. |
| So sánh | Kỳ liền trước cùng số ngày lịch; kỳ trước bằng 0 trả percent=null và chỉ hiển thị chênh lệch tuyệt đối. |
| Hàng chờ | Không giới hạn theo kỳ doanh số: công việc đang mở cần xử lý hiện tại, có phạm vi đọc riêng từng loại. |

Khoảng ngày tính trọn ngày kết thúc, tối đa 366 ngày. API từ chối ngày không tồn tại, đảo ngược khoảng và múi giờ không hỗ trợ.

## SLA và nhắc hạn

Quy tắc khởi tạo có thể sửa tại “Quy tắc SLA và trưởng nhóm”; thay đổi chỉ áp dụng cho công việc tạo sau đó. Công việc cũ giữ snapshot SLA và hạn hiện có.

| Loại | Phản hồi | Giải quyết | Nhắc trước |
| --- | --- | --- | --- |
| Đơn quá hạn | 120 phút từ lúc đưa vào hàng chờ | 1.440 phút tính từ ngày tạo đơn | 60 phút |
| Trả hàng | 240 phút | Hạn hồ sơ hiện có, mặc định 48 giờ | 60 phút |
| Ticket | 120 phút | Hạn hồ sơ hiện có, mặc định 48 giờ | 60 phút |
| Tranh chấp | 240 phút | Hồ sơ mới 72 giờ; hồ sơ cũ giữ hạn hiện có | 120 phút |
| Hoàn tiền | 120 phút | 1.440 phút | 60 phút |
| Báo cáo vi phạm | 120 phút | 1.440 phút | 60 phút |

Hồ sơ dùng hạn `due_at` đã chốt ở module hậu mãi. Cấu hình thời lượng giải quyết theo loại được dùng cho hồ sơ mới; hồ sơ đã tồn tại giữ hạn hiện tại.

Đồng hồ phản hồi chạy đến thao tác ghi nhận phản hồi đầu tiên. Đồng hồ giải quyết tạm dừng khi chờ phản hồi và được cộng lại thời gian dừng khi tiếp tục. Chờ phê duyệt vẫn tính SLA. Nhắc hạn gửi trong hộp thông báo hàng chờ; quá hạn chuyển cấp và nhắc trưởng nhóm đã cấu hình. Unique key theo công việc, người nhận, mốc và hạn chặn thông báo trùng khi chạy nhiều worker.

**Cần cấu hình nhân sự thực tế:** chọn trưởng nhóm có quyền phù hợp trước khi vận hành; hệ thống không tự chọn tài khoản làm trưởng nhóm. UI ghi rõ nhóm chưa cấu hình. Không tự cấp quyền tài chính cho tài khoản quản trị cũ.

## Đồng bộ và vận hành

- Worker Order chạy khi khởi động và mỗi 30 giây: đơn quá hạn, hồ sơ hậu mãi, yêu cầu hoàn chưa có giao dịch Payment, refund lỗi/chờ xác minh từ Payment và báo cáo hội thoại từ Chat. Refund retry cũ được loại khỏi việc còn mở khi bị lần retry mới thay thế.
- Payment/Chat cung cấp feed có phân trang, yêu cầu `ADMIN_AUTHORIZATION_TOKEN`. Chỉ chuyển metadata cần thiết. Order lưu hàng chờ và kiểm tra quyền/phạm vi trên mọi lần đọc/ghi.
- Dùng cùng token độc lập tại Identity, Order, Payment và Chat; cấu hình `ORDER_PAYMENT_URL`, `ORDER_CHAT_URL`. Docker Compose và script dev đã được cập nhật. Không đưa token vào frontend.
- Nguồn lỗi giữ lại snapshot gần nhất, ghi lỗi nguồn; quá 120 giây chưa đồng bộ thì ghi dữ liệu trễ. Có thử lại từng nguồn/khu vực.
- Đã áp dụng Order `023_dashboard_queue.sql`, `024_case_queue_sla_policy.sql` và Payment `006_dashboard_refund_time.sql` trên PostgreSQL local hiện có. Đã bổ sung token còn thiếu trong file local bị Git bỏ qua. Khởi động lại backend bằng quy trình dev hiện có để nạp mã và biến môi trường mới.

## Bằng chứng và chạy lại

- [Kiểm thử PostgreSQL/API và domain](Backend/services/order-service/tests/dashboard-queue.test.js): 12/12 qua; ngày, scope, drilldown, tài chính, hai người nhận cùng lúc, phân công, SLA, tạm dừng, chống trùng, lỗi từng nguồn và origin.
- [Kiểm thử Chat/MongoDB](Backend/services/chat-service/tests/admin-queue.test.js): token feed, metadata shop/lý do, con trỏ và báo cáo đã đóng. Đã chạy với MongoDB local trên database riêng kết thúc bằng `_test`.
- [Kiểm tra trình duyệt](Frontend/scripts/verify-dashboard-queue.browser.mjs): giao diện thực với API fixture, desktop 1440 và mobile 390; bộ lọc URL, CSKH ẩn tài chính, thử lại từng khu vực, xung đột nhận việc, không có lỗi runtime hoặc tràn trang.
- Bộ hồi quy hậu mãi PostgreSQL/HTTP: 45/45 qua. Các suite Identity, Catalog, Order, Payment, Chat không có lỗi; những integration không được cấp biến môi trường trong lượt chạy tổng được ghi SKIP, không tính là đã qua.
- `Frontend: npm run build` qua typecheck và build; còn cảnh báo kích thước bundle chung của ứng dụng.

Chạy PostgreSQL/API từ thư mục `Backend` (PowerShell):

```powershell
$env:NODE_ENV='development'
node --env-file=.env.development.local services/order-service/scripts/test-dashboard-queue.mjs
node --env-file=.env.development.local services/order-service/scripts/test-admin-returns.mjs
```

Helper dashboard tạo database local `admin_dashboard_queue_test`, áp dụng migration ở đó và không chạy fixture lên database nghiệp vụ. Kiểm tra browser từ `Frontend`: `npm run test:dashboard:browser` (Microsoft Edge trên Windows). MongoDB integration cần `CHAT_TEST_MONGO_URL` có xác thực tới database riêng kết thúc `_test`; không dùng database Chat nghiệp vụ.
