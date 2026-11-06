# Admin platform cơ bản — 28/10/2026

Đã triển khai phần vận hành cơ bản bổ sung trên nền admin hiện có. Router hiện có **23 mục chính** (18 mục cũ và 5 mục mới). Phạm vi này không mở rộng sang payout/settlement, BI, chiến dịch marketing, CMS nâng cao hoặc console cấu hình chatbot.

## Chức năng bổ sung

| Trang | Có thể làm |
| --- | --- |
| `/admin/payments` | Tra cứu payment intent mọi trạng thái, mã nhóm đơn/provider/giao dịch, ngày, provider và cờ cần đối soát; phân trang; xem tiền dự kiến/thu/hoàn/đang giữ/còn lại của nhóm thanh toán, giao dịch xác minh, trạng thái Order, lịch sử đối soát và sự kiện đang chờ đồng bộ. |
| `/admin/refunds` | Tra cứu hoàn tiền mọi trạng thái, theo shop order/mã provider/nhóm đơn; mở hồ sơ trả hàng nguồn; theo dõi tiền đang chờ và lịch sử; yêu cầu worker xác minh lại khoản MoMo đang xử lý. |
| `/admin/inventory` | Tìm SKU/tên/tham chiếu đơn; xem on-hand/reserved/available, lượt giữ quá hạn hoặc lệch tổng lượng giữ; chi tiết tối đa 100 reservation và 50 biến động gần nhất, sự cố kho, liên kết đơn. |
| `/admin/chat-reports` | Danh sách báo cáo theo scope, mã báo cáo/hội thoại, ngày/trạng thái; nhập lý do trước xem tin liên quan có audit; xác nhận có căn cứ hoặc không đủ căn cứ; version, idempotency, lịch sử nguyên tử trong cùng report. |
| `/admin/setup` | Kiểm tra vai trò đã có, nhóm ghi chú, trưởng nhóm và sức khỏe nguồn queue; liên kết các màn cấu hình nhân sự/nhóm/SLA/bảo mật. |

Chi tiết đơn có liên kết sang thanh toán của nhóm và hoàn tiền theo đơn khi người xem có quyền tài chính. Queue REFUND và ABUSE_REPORT dẫn tới module nghiệp vụ tương ứng. Không còn đóng một report chỉ bằng đổi trạng thái công việc trong queue; phải ghi kết luận ở Chat, rồi feed đồng bộ trạng thái về Order.

Console tài chính chỉ trả các trường cần thiết; không trả buyer ID, checkout URL/QR, request hash, khóa/chữ ký, digest hoặc lỗi provider thô. Thông tin Order lỗi được hiển thị riêng, không thay bằng dữ liệu thành công giả.

## Quy tắc thao tác

- Đọc tài chính dùng `finance.view_sensitive`. Quyền mới `finance.reconcile` chỉ thuộc role finance và cần MFA gần đây cho HTTP actor.
- Yêu cầu kiểm tra lại MoMo nhận reason/version/requestId, có rate limit một phút, lưu audit và lịch kiểm tra trong cùng transaction. Retry cùng requestId giữ kết quả; thay payload bị từ chối. API trả **QUEUED**, không xác nhận đã thu/hoàn. Worker hiện có gọi adapter provider và cập nhật theo kết quả xác minh.
- Không tạo payment/refund mới từ console, không nhập số tiền tùy ý hoặc ép trạng thái thành công. Khoản FAILED cần xử lý điều kiện retry tại hồ sơ nguồn; VietQR/COD không có nút giả lập provider thành công hoặc hoàn thủ công.
- Kho chỉ đọc bằng `inventory.read`, cấp cho operations/moderator/legacy_admin với scope shop tương ứng. Không thêm thao tác sửa tồn hoặc xóa reservation trực tiếp.
- Chat dùng `moderation.read/update`, thêm `moderation.view_sensitive` riêng cho moderator; xem nội dung yêu cầu MFA gần đây và lý do. Audit truy cập lỗi thì không trả tin nhắn. Chỉ lấy tin được báo cáo, hoặc tối đa 10 tin gần nhất của hội thoại được báo cáo; không có trang đọc mọi cuộc hội thoại. Tệp đính kèm chỉ hiển thị chỉ báo, không mở qua URL công khai trong module cơ bản.
- Quyết định report và lịch sử được ghi bằng một conditional update MongoDB; hai người cùng xử lý chỉ một người thành công. Kết luận không tự khóa user/shop hoặc sửa lời người gửi.
- Không mở rộng quyền tài chính/privacy/đọc chat cho legacy_admin. Có role nghiệp vụ trong mã không tự cấp role đó cho tài khoản thật.

## Lỗi đã sửa

1. **USER cleanup:** WAITING_CLEANUP chặn start/reject/execute ở trước và trong transaction; retention không đưa hồ sơ về giai đoạn rà soát. Worker khóa hồ sơ trước cập nhật job, hoàn thành job/hồ sơ/audit cùng transaction. Có sửa các receipt cũ đã completed nhưng hồ sơ ẩn danh còn kẹt ở trạng thái trung gian. Test có storage lỗi, giữ trạng thái khi cập nhật retention, và khôi phục cặp receipt/case cũ.
2. **SLA queue/case:** migration Order 025–026 đồng bộ thời gian đã cộng pause về case, tránh trigger echo vô hạn và giữ version hợp lệ khi update bắt đầu từ case. Test kiểm tra pause/resume từ queue và từ case, cập nhật hạn, deadline hai bên, version trả về. Migration có backfill deadline đã lệch từ queue vào case; không sửa snapshot thương mại.
3. **RBAC cleanup test:** gỡ các tham chiếu quyết định hiện tại trong shop fixture, dọn store_decisions/profile_versions trước khi xóa shop test. Bộ RBAC chạy lại 19/19 qua.

Phạm vi xử lý dữ liệu cá nhân tự động vẫn là Identity; không đánh dấu toàn bộ ADM-USER-010 đã hoàn thành thay cho bộ xử lý dữ liệu cá nhân toàn sàn.

## Trạng thái local

Đã cập nhật sáu service Node bằng đúng Compose project `backend-v2-dev`, giữ nguyên database/volume. Runner nạp mã nguồn mount và migration mới. Payment migration **007_admin_operations.sql**, Order **025_case_queue_deadline_sync.sql** và **026_case_deadline_version.sql** đã có trong database local.

Đọc lại database bằng transaction READ ONLY: bốn nguồn queue **orders/cases/payment/chat** đều có timestamp và `error_code=NULL`. Khóa nội bộ hiện có được nạp vào container từ cấu hình development; không xuất khóa ra báo cáo hoặc frontend.

**Cấu hình nhân sự đang chờ người được chỉ định:** local vẫn có một assignment legacy_admin, nhóm support/trust/privacy chưa có thành viên và bốn nhóm queue chưa có trưởng nhóm. Chức năng/config API đã có, màn setup hiển thị rõ các phần này; không tự chọn người hoặc tự cấp quyền nhạy cảm cho tài khoản đang dùng.

Khi đã có tài khoản phụ trách:

1. Operator được ủy quyền khởi tạo role system_admin cho tài khoản được chỉ định qua [admin-roles.mjs](Backend/services/identity-service/scripts/admin-roles.mjs), nếu chưa có người được cấp `staff.update`. CLI nhận userId, version quyền hiện tại, operator, reason và assignments tường minh qua stdin; không có HTTP tự nâng quyền.
2. Đăng nhập lại MFA; dùng `/admin/staff-access` phân vai theo công việc, `/admin/user-workflows` cấu hình nhóm ghi chú, `/admin/work-queue` cấu hình trưởng nhóm/SLA.
3. Mở `/admin/setup` để đọc lại cấu hình và nguồn. Phê duyệt hai người vẫn cần hai tài khoản khác nhau, kể cả một người được gán nhiều role.

## Kiểm thử

| Bộ kiểm tra chạy lại | Kết quả |
| --- | --- |
| Admin basic PostgreSQL + Mongo + HTTP | **15/15 qua**, không skip; tiền/quyền/scope, ngày, retry/version/rate limit, lệch Payment/Order và nguồn lỗi, rollback audit, kho read-only, chat access/audit/concurrency/feed. |
| USER PostgreSQL/API | **18/18 qua**, gồm regression cleanup và setup API. |
| Dashboard/Queue PostgreSQL/API | **12/12 qua**, gồm regression deadline/version hai chiều. |
| RBAC PostgreSQL/HTTP | **19/19 qua**, cleanup đã sửa. |
| AUTH PostgreSQL/HTTP | **21/21 qua**. |
| Return/Case PostgreSQL/HTTP/CLI | **45/45 qua**. |
| Catalog regression/taxonomy | **56 qua, 1 skip**; inventory DB mới được chạy riêng trong basic suite. |
| Identity unit mặc định | **47 qua, 9 skip**, các integration DB tương ứng đã chạy qua helper riêng ở trên. |
| Payment unit mặc định | **5 qua, 1 skip**; operations DB được chạy trong basic suite. |
| Chat unit mặc định | **59 qua, 4 skip**; Mongo report mới được chạy trong basic suite. |
| Frontend session/policy/command | **20/20 qua**. |
| Browser admin basic | Qua desktop/mobile: filter/pagination, lookup, source failure, recheck, quyền chỉ đọc, reservation, xem chat có lý do, quyết định, setup hiển thị cấu hình còn thiếu; không tràn trang hoặc runtime exception. |
| Browser dashboard và users | Qua desktop/mobile. |
| Frontend build/typecheck | Qua; còn cảnh báo bundle lớn của ứng dụng. |
| ESLint frontend cho các module mới | Qua, không diagnostic. |

Browser dùng API fixture; các helper dùng database có hậu tố `_test` riêng và dọn/rollback fixture. Không tính test skip là pass, không cộng các suite có bài trùng để tuyên bố tổng số kịch bản độc lập. Chưa nghiệm thu gửi thư, tiền provider thật, khóa phần cứng hoặc E2E toàn bộ bằng tài khoản nghiệp vụ đã được phân vai.

Chạy lại từ Backend trên PowerShell:

```powershell
$env:NODE_ENV='development'
node --env-file=.env.development.local scripts/test-basic-admin.mjs
node --env-file=.env.development.local scripts/check-basic-admin.mjs
```

Từ Frontend: `npm.cmd run test:admin:basic:browser` và `npm.cmd run build`. File JavaScript đồng hành của các file frontend thay đổi được đồng bộ bằng `scripts/sync-basic-admin-javascript.mjs`, không transpile lại toàn bộ dự án.

Log kiểm thử local: `.tmp/basic-operations.log`, `basic-users.log`, `basic-dashboard.log`, `basic-rbac.log`, `basic-auth.log`, `basic-returns.log`, `basic-catalog.log`. Ảnh browser: `.tmp/basic-payments-desktop.png`, `basic-inventory-mobile.png`, `basic-report-mobile.png`.
