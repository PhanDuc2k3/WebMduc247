# Quản lý người dùng — nghiệm thu local 27/10/2026

> **Đính chính sau rà soát:** chưa thể xác nhận mục 8 hoàn tất toàn bộ. Đã tái hiện lỗi hồ sơ ẩn danh bị kẹt khi đổi trạng thái lúc chờ cleanup; USER-010 hiện chỉ tự động xử lý dữ liệu Identity. [Báo cáo rà soát mới](ADMIN_SECTIONS_7_8_REVIEW.md) được ưu tiên khi đối chiếu trạng thái. Đã bỏ dấu hoàn thành USER-010 trong tài liệu yêu cầu.

Phạm vi: ADM-USER-001…011. Đã có giao diện, API, kiểm tra quyền/phạm vi, migration và bằng chứng kiểm thử local. Tài liệu này không xác nhận triển khai production.

## Chức năng và bằng chứng

| Mã | Phần đã triển khai |
| --- | --- |
| USER-001 | Tìm theo ID, tên, email; tìm chính xác số điện thoại E.164 qua quyền xem liên hệ và lý do. Danh sách tiếp tục che tên/email. Xem liên hệ đầy đủ ghi log trước khi trả dữ liệu; lỗi audit thì không trả dữ liệu. |
| USER-002 | Hồ sơ liên kết shop sở hữu, đơn mua, ticket, tranh chấp và quyết định quản trị. Bộ lọc ownerId/buyerId/userId được giữ trên URL. Từng API module đích kiểm tra quyền/phạm vi SQL riêng. |
| USER-003 | Lý do chuẩn, phạm vi ACCOUNT, khóa không có hạn hoặc khóa tạm thời, quyết định gốc và số vi phạm đã phân loại. Quyết định bị sửa qua kháng nghị hoặc rà soát không còn tính là vi phạm được giữ nguyên. |
| USER-004 | Trước khi khóa: nhóm phiên còn hiệu lực, shop sở hữu, đơn mua/bán đang xử lý, hồ sơ hậu mãi và hoàn tiền chờ. Giao diện không cho xác nhận khi chưa tải đủ tác động. Nguồn lỗi có thử lại riêng. |
| USER-005 | Khôi phục và hết hạn khóa đều lấy trạng thái từ email_verified_at hiện có. Không có trường cho admin tự đánh dấu email đã xác minh. Phiên đã thu hồi không được mở lại. |
| USER-006 | Gửi OTP đặt lại mật khẩu đến email chủ tài khoản bằng hàng gửi mã hóa và theo quyền riêng. Không có API/nút đọc mật khẩu, token hoặc OTP cho admin. Có giới hạn theo tài khoản, IP và nhân sự. |
| USER-007 | Ghi chú có tác giả/thời gian, giữ riêng theo nhóm được giao. Quyền quản lý nhóm không tự cấp quyền đọc nội dung. Ghi chú nội bộ không được trả trong hồ sơ người dùng tự xem. |
| USER-008 | Người bị khóa vẫn gửi được kháng nghị sau khi xác minh mật khẩu + OTP email. Hồ sơ gắn quyết định gốc; người khóa không được giữ nguyên, từ chối hay chấp nhận chính kháng nghị đó. Nhận/phân công chống xung đột phiên bản. |
| USER-009 | Quyền xem và thu hồi phiên tách riêng. Có thu hồi một nhóm phiên hoặc toàn bộ; lý do và mã nhóm phiên được ghi log, không lưu token vào kết quả API/log thao tác. |
| USER-010 | Hồ sơ ACCESS / RECTIFY / ANONYMIZE riêng; kiểm tra danh tính, người được giao, rà soát sáu module và ngoại lệ có căn cứ/hạn lưu. Có bản dữ liệu mã hóa, chỉnh họ tên, ẩn danh tài khoản/hồ sơ và xóa ảnh có retry. Giữ mã người dùng cùng hồ sơ đơn/thanh toán để truy vết. |
| USER-011 | IP chung trong cửa sổ cấu hình và dữ liệu liên hệ trùng chỉ tạo tín hiệu điều tra. Không trả IP/số liên hệ thô trong tín hiệu, không tự hợp nhất danh tính hoặc tự khóa. |

## Giao diện

- `/admin/users`: tra cứu có che dữ liệu, mở hồ sơ nhiều phần: tổng quan, liên kết nghiệp vụ, quyết định/audit, ghi chú, phiên và tín hiệu điều tra. Các phần/nút xuất hiện theo quyền.
- `/admin/user-workflows`: hàng xử lý kháng nghị và yêu cầu dữ liệu, trạng thái/phân công, bằng chứng danh tính, quyết định gốc, rà soát lưu trữ, thực thi và lịch sử. Có bộ lọc đến hạn rà soát lưu trữ và phần cấu hình nhóm ghi chú.
- `/account-help`: người dùng xác minh và gửi yêu cầu ngay cả khi không đăng nhập được vì bị khóa. Có liên kết từ trang đăng nhập. Chỉ trả hồ sơ/kết quả của chủ tài khoản đã xác minh.
- Phiên hỗ trợ giữ trong bộ nhớ trang, có hạn 15 phút; OTP email có hạn 10 phút, tối đa 5 lần sai. Xác minh hỗ trợ không thay đổi cờ xác minh email đăng ký.
- Tối đa 6 lượt tạo hồ sơ mới trong 15 phút cho mỗi tài khoản; một loại yêu cầu dữ liệu chỉ có một hồ sơ đang mở. Retry cùng requestId giữ nguyên kết quả và không tạo bản sao.
- Sau ẩn danh, quyền hỗ trợ đã xác minh chuyển sang chỉ đọc kết quả đến hạn cũ; không trở thành phiên đăng nhập, không tạo yêu cầu mới và không tải artifact đã xóa.

## Phạm vi nghiệp vụ cần hiểu khi vận hành

1. **Khóa tài khoản:** phạm vi hiện hỗ trợ là ACCOUNT, giữ cách chặn đăng nhập và thao tác do tài khoản khởi tạo. Không giả lập khóa riêng từng chức năng. Tài khoản quản trị và tài khoản đã ẩn danh được bảo vệ khỏi thao tác quản lý tài khoản thông thường.
2. **Số lần vi phạm:** tính các quyết định ABUSE / FRAUD / PROHIBITED_CONTENT / PAYMENT_ABUSE còn được giữ nguyên. SECURITY_RISK và quyết định cũ chưa phân loại không tự coi là vi phạm. Lịch sử cũ được giữ và ghi nhãn LEGACY.
3. **Yêu cầu dữ liệu:** phần xuất tự động là dữ liệu tài khoản/hồ sơ Identity theo danh sách trường cho phép, cùng tham chiếu rà soát các module. Chỉnh sửa tự động hiện là họ tên; email/số điện thoại tiếp tục qua luồng xác minh hiện có. Dữ liệu nghiệp vụ ở Catalog, Order, Payment, Engagement, Chat được xử lý qua hồ sơ rà soát/tham chiếu và ngoại lệ lưu trữ, không bị xóa hàng loạt từ Identity.
4. **Ẩn danh:** chặn khi còn đơn, hậu mãi hoặc hoàn tiền mở. Xóa/ẩn danh tên, email, điện thoại, địa chỉ, tùy chọn liên lạc, OTP/challenge, bản dữ liệu đã xuất và ảnh đại diện. Định danh người dùng và các bản ghi cần truy vết được giữ theo ngoại lệ. Nhật ký Identity cần căn cứ/hạn lưu; đơn/shop còn tồn tại cũng phải có ngoại lệ tương ứng. Module không có dữ liệu cần giữ có thể ghi CLEAR sau rà soát có căn cứ.
5. **Lưu trữ:** nhân sự có quyền nhập căn cứ, tham chiếu xử lý và hạn lưu cho từng module. Hết hạn được lọc để rà soát tiếp, không tự xóa hồ sơ tài chính hoặc chứng cứ. Nếu kho ảnh lỗi, hồ sơ ở WAITING_CLEANUP, worker thử lại và chỉ hoàn thành sau khi xóa ảnh thành công.
6. **Hồ sơ xóa cũ:** worker tiếp nhận yêu cầu PENDING từ luồng hồ sơ hiện có, giữ dấu vết phương thức kiểm tra mật khẩu đã thực hiện. Luồng CLI xóa cũ không được gọi từ màn quản trị mới.

## Quyền và nhóm

| Quyền | Vai trò được khai báo trong bản này |
| --- | --- |
| users.view_sensitive, users.sessions.read/revoke | system_admin; quyền nhạy cảm/thao tác thu hồi yêu cầu xác thực lại gần đây. |
| users.password_reset | system_admin và customer_support; yêu cầu xác thực lại gần đây, lý do và giới hạn tần suất. |
| users.read | Giữ các vai trò đang có; bổ sung cho system_admin, customer_support và moderator. Phạm vi không hỗ trợ bị từ chối, không tự mở rộng. |
| users.moderate | Giữ legacy_admin; bổ sung moderator. |
| users.notes.read/create | customer_support và moderator, kèm điều kiện thành viên nhóm được giao hồ sơ. |
| users.notes.manage | system_admin; quản lý thành viên/phân công nhóm, không mặc nhiên đọc ghi chú. |
| users.appeals.read/review | system_admin và moderator; customer_support có quyền đọc. Ràng buộc người đánh giá độc lập vẫn áp dụng khi một tài khoản có nhiều vai trò. |
| privacy.read/review/execute | system_admin. Thực thi và xem bản dữ liệu cần quyền tương ứng; xem bản dữ liệu admin còn cần users.view_sensitive và audit. |
| users.signals.read | system_admin và moderator. |

Không tự nâng quyền hay đưa nhân sự hiện có vào nhóm. Người vận hành có thẩm quyền cần gán vai trò và cấu hình thành viên/phân công nhóm qua giao diện. legacy_admin không được tự cấp quyền xem liên hệ đầy đủ, xem/thu hồi phiên hoặc xử lý dữ liệu cá nhân mới.

## Cấu hình và migration

- Đã áp dụng `021_user_administration.sql` và `022_user_privacy_receipts.sql` trên database PostgreSQL local hiện có.
- Worker Identity chạy khi khởi động và mỗi 30 giây: khôi phục khóa tạm đã hết hạn theo đúng quyết định hiện tại, tiếp nhận yêu cầu dữ liệu cũ, xóa ảnh còn chờ và dọn artifact/quyền hỗ trợ hết hạn.
- Khóa tạm cũ không thể gỡ một quyết định khóa mới. Phiên thông thường vẫn phải đăng nhập lại sau khi hết hạn khóa.
- Cấu hình mặc định có thể thay qua môi trường: `USER_TEMP_SUSPENSION_MAX_DAYS=366`, `USER_SIGNAL_WINDOW_DAYS=30`, `USER_PRIVACY_ARTIFACT_HOURS=168`. Giá trị không hợp lệ bị từ chối khi nạp dịch vụ.
- Identity lấy tác động qua `IDENTITY_CATALOG_URL` / `IDENTITY_ORDER_URL`; Docker Compose đã trỏ các URL này tới service tương ứng.
- Email dùng hàng gửi và SMTP hiện có. Cần khởi động lại backend để nạp mã, quyền và biến môi trường mới. Chưa gửi thư đến người dùng thật hoặc thực hiện ẩn danh trên tài khoản nghiệp vụ trong quá trình kiểm thử.

## Kiểm tra đã chạy

- [Bộ USER PostgreSQL/API](Backend/services/identity-service/tests/user-admin.test.js): **18/18 qua**, gồm quyền/MFA, ID/contact search, masking/audit, thu hồi access/refresh, xác minh email, reset rate limit/idempotency, lỗi audit rollback, nhóm ghi chú, OTP một lần/giới hạn sai, kháng nghị độc lập, nhận hồ sơ đồng thời, ngoại lệ lưu trữ, artifact mã hóa, ẩn danh và retry kho ảnh.
- [Browser desktop/mobile](Frontend/scripts/verify-users.browser.mjs): thành phần giao diện thật với API fixture; che/hiện liên hệ có lý do, nguồn tác động lỗi/thử lại, khóa theo lý do chuẩn, thu hồi đúng phiên, cách ly ghi chú, người đánh giá độc lập, trang hỗ trợ tài khoản. Không có lỗi runtime hoặc tràn trang ở 1440px và 390px.
- Hồi quy đã qua: Dashboard/Queue PostgreSQL/API **12/12**, hậu mãi PostgreSQL/HTTP **45/45**, RBAC PostgreSQL/HTTP **19/19**, browser dashboard và các suite Identity/Catalog/Order/Payment/Chat. Các integration không cấp biến môi trường trong lượt chạy tổng được ghi SKIP, không tính là đã qua.
- `npm run build` frontend qua typecheck và build. Còn cảnh báo kích thước bundle chung của ứng dụng.

Chạy lại từ `Backend` trên PowerShell:

```powershell
$env:NODE_ENV='development'
node --env-file=.env.development.local services/identity-service/scripts/test-user-admin.mjs
```

Helper tạo và migrate database riêng `admin_user_management_test`; fixture không chạy trên dữ liệu nghiệp vụ. Từ `Frontend`: `npm run test:users:browser` (Microsoft Edge trên Windows), `npm run build`.
