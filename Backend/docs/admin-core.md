# Nghiệm thu ADM-CORE-001 đến ADM-CORE-015

Ngày chốt: **27/10/2026, Asia/Bangkok**. Phạm vi: các API và màn Admin Platform hiện có (Identity, Catalog, Storefront, Order, CASE), cùng đường đi hoàn tiền qua Payment. Đây là nghiệm thu phát triển local; module mới phải tiếp tục tuân thủ các quy tắc này.

## Đối chiếu yêu cầu

| Mã | Thực hiện và bằng chứng |
| --- | --- |
| CORE-001 | Mỗi request HTTP lấy danh tính hiện tại qua Identity/session, sau đó service kiểm tra `platform_admin`. Permission riêng được đọc ở backend, kể cả khi retry. Test HTTP thu hồi role khi token còn hạn; test thu hồi `orders.cancel_blocked` ngăn phát lại lệnh. |
| CORE-002 | Giữ thu hồi phiên khi khóa tài khoản, hold riêng của sàn trên shop/product, và chặn seller tự mở lại. Khôi phục shop tôn trọng lựa chọn ngừng nhận đơn của owner. Các test Catalog và quản trị đạt. |
| CORE-003 | Khóa/mở khóa lưu actor, đối tượng, lý do, read/result version, trạng thái sau và correlation ID. Storefront bắt buộc lý do cho lưu/xuất bản/tạo danh mục; history hiển thị lý do. CASE lưu read/result version cùng observed case version/workflow. Audit Identity giữ `actor_reference` nếu tài khoản nguồn bị xóa sau xét duyệt dữ liệu cá nhân. |
| CORE-004 | Lock đối tượng và kiểm tra version bên trong transaction. Hai admin dùng cùng bản đọc chỉ có một mutation được ghi; API trả xung đột cho người còn lại. |
| CORE-005 | State, audit, command receipt và outbox được ghi trong transaction của service sở hữu. Test audit lỗi rollback Identity/session, Catalog/outbox/receipt, Storefront/category, quyết định CASE và từ chối ngoại lệ. Hoàn tất từng nghĩa vụ khi hồ sơ còn nghĩa vụ khác cũng có audit. |
| CORE-006 | Hủy đơn giữ intent `CANCEL_PENDING` với audit trước khi trả tồn. Inventory dùng `cancel:<orderId>`; lệnh được Order retry, rồi phát `OrderCancelled.v1` có correlation ID để Payment xử lý. Không coi commit Order là xác nhận hoàn tiền. CASE giữ return/decision ID qua notification/refund và có retry riêng. |
| CORE-007 | Moderation/Storefront dùng UUID `requestId`, fingerprint, transaction lock và receipt theo actor. Request trùng trả kết quả cũ, đổi nội dung với cùng mã trả `409`. Frontend giữ mã khi thử lại sau lỗi mạng. CASE tiếp tục dùng khóa tạo/gửi và guard trạng thái/version để ngăn quyết định hoặc tác dụng phụ thứ hai. |
| CORE-008 | Màn đơn không sửa tiền/trạng thái thanh toán. Lệnh hủy mới đi qua Order lifecycle, trả tồn rồi chuyển nghĩa vụ tiền sang Payment. Test giữ `PAID`, `refundedMinor=0` sau hủy, chờ sự kiện Payment xác nhận. CASE không thể hoàn tất nghĩa vụ tiền chỉ bằng quyết định. |
| CORE-009 | Không thêm API xóa cứng đơn, giao dịch, refund, quyết định hoặc audit. Quyết định bị rút/bác bỏ và lịch sử vẫn được giữ. Test giữ audit actor sau xóa bản ghi Identity; các thao tác DELETE trong test chỉ dọn fixture database test riêng. |
| CORE-010 | Dashboard lấy từng nguồn riêng, lỗi nguồn trả ô chưa có dữ liệu và cảnh báo; không thay bằng mock/0. Tải lại chi tiết/Storefront lỗi không giữ bản cũ để thao tác như vừa tải thành công. Edge mô phỏng mất Order summary và xác minh ô hiển thị `—`. |
| CORE-011 | `adminMoney` từ chối nguồn thiếu/số lẻ/âm/vượt safe integer. `100000` VND giữ nguyên `100000`; UI hiển thị trực tiếp. Snapshot item/order/refund không đổi đơn vị. |
| CORE-012 | Cột thời gian dùng `timestamptz`; UI dùng `Asia/Bangkok`. CASE lọc từ 00:00 UTC+7 bao gồm đến trước 00:00 ngày kế tiếp. Trend trả ngày `YYYY-MM-DD`, tránh chuyển SQL date thành UTC timestamp rồi lệch ngày khi hiển thị. |
| CORE-013 | Tách hold giao dịch mới khỏi nghĩa vụ đang có. Shop bị hold vẫn cho thành viên hợp lệ xử lý đơn cũ. Account bị khóa mất phiên; nhân sự có quyền riêng có thể hủy đơn chưa bàn giao hoặc tiếp tục hậu mãi. Chi tiết policy và giới hạn nằm bên dưới. |
| CORE-014 | API quản trị che tên/email khách hàng, email liên hệ shop, tên/điện thoại người nhận; không gửi địa chỉ chi tiết. Actor nhân sự phục vụ truy vết thao tác vẫn được hiển thị. Ảnh chứng cứ dùng scope, lý do, grant có hạn/dùng một lần và audit hiện có. Không thêm endpoint mở hàng loạt PII. |
| CORE-015 | Loại `providerError` chứa lỗi thô khỏi lỗi trả frontend. Lỗi không thuộc loại nghiệp vụ được trả thông báo chung; worker/request không ghi nguyên object hoặc message của dependency có thể chứa credentials. Outbox Identity và reconciliation Payment lưu mã lỗi cố định. Webhook Payment giữ digest/outcome, không đưa payload thô vào màn admin. Test provider có marker bí mật không làm lộ marker. |

## Hợp đồng mutation và migration

Identity/Catalog moderation nhận `{action, reason, version, requestId}`. Storefront draft/publish nhận `{config, reason, version, requestId}`; tạo danh mục nhận `{name, slug?, parentId, reason, version, requestId}`. Lý do dài 8–500 ký tự. Request thiếu metadata bị từ chối; frontend đã gửi hợp đồng mới. Dùng lại đúng `requestId` khi chưa biết kết quả do lỗi mạng; sửa payload phải dùng mã mới.

Migration mới:

- Identity: `015_admin_core.sql`, `016_admin_actor_reference.sql`.
- Catalog: `010_admin_core.sql`.
- Order: `018_admin_core.sql`, `019_blocked_seller_obligations.sql`.

Đã áp dụng trên database test và stack phát triển local. Lịch sử cũ thiếu version/reason/correlation giữ `NULL`, không suy đoán hoặc điền lý do giả. Command receipts giữ trong database service sở hữu; không tự dọn trước thời hạn retry/retention được phê duyệt.

## Xử lý nghĩa vụ khi khóa shop/tài khoản

Khóa tài khoản chặn đăng nhập và request mới của tài khoản đó. Hold shop/product do Catalog sở hữu. Nếu cần dừng shop bán hàng trong sự cố tài khoản seller, nhân sự phải khóa các shop liên quan qua Catalog và kiểm tra kết quả từng lệnh; không mặc định rằng khóa Identity đã đồng thời khóa shop. Khôi phục một đối tượng cũng không tự mở các hold còn lại.

| Trạng thái đang có | Cách xử lý |
| --- | --- |
| Chờ giữ hàng/thanh toán | Worker và timeout nghiệp vụ tiếp tục; không tự ghi PAID hoặc bỏ reservation. |
| `PLACED`, `CONFIRMED`, `PREPARING`, `READY_TO_SHIP` | Thành viên shop hợp lệ có thể tiếp tục hoàn tất đơn cũ. Khi shop hoặc chủ shop bị sàn khóa và không thể thực hiện, nhân sự có `orders.cancel_blocked` được hủy với lý do/version/requestId. |
| `CANCEL_PENDING` | Intent/audit đã commit, inventory/notification/refund có thể chưa xong. Worker tiếp tục retry; gửi lại cùng command không tạo intent thứ hai. Không khôi phục shop chỉ để chạy retry. |
| `SHIPPING` trở đi | Lệnh hủy mới bị từ chối. Tiếp tục webhook giao nhận hoặc mở CASE/return theo policy; không giả lập chưa giao hoặc ép hoàn tiền. |
| Return/refund | Assignee cùng `aftersales.intervene` có thể xử lý seller bị khóa/quá hạn. Nhận hàng cần chứng cứ thực tế; tiền hoàn chỉ hoàn tất khi Payment xác nhận. |
| Ticket/dispute | Hàng chờ, phân công, chuyển cấp và quyết định tiếp tục hoạt động; không xóa hồ sơ khi khóa các bên. |

API mới: `POST /api/v2/admin/orders/:id/cancel-blocked-seller`, body `{version, reason, requestId}`. Backend xác minh trạng thái khóa từ Catalog/Identity, đọc quyền riêng trong transaction, chặn actor là buyer hoặc thành viên shop liên quan. Kết quả chỉ gồm ID/status/version/correlation ID; không dùng DTO buyer chứa địa chỉ giao hàng. Nút trong chi tiết đơn chỉ hiện với permission phù hợp và trạng thái trước giao nhận. Các lệnh đang chờ cũng được kiểm tra lại quyền khi nhân sự gửi lại; worker có quyền hoàn tất intent đã được duyệt trước đó.

Quyền `orders.cancel_blocked` **không tự cấp**. Dùng CLI [case-permission.mjs](../services/order-service/scripts/case-permission.mjs), stdin JSON theo hợp đồng đang có: `userId`, `permission: "orders.cancel_blocked"`, `action: "grant"` hoặc `"revoke"`, `operator`, `reason`, `expiresAt` tùy chọn. CLI ghi lịch sử; tài khoản vẫn phải là platform admin đang hoạt động. Không cấp quyền trên database đang dùng trong đợt nghiệm thu này.

## Kết quả nghiệm thu local

| Bộ kiểm tra | Kết quả |
| --- | --- |
| Admin management PostgreSQL/HTTP | **15 pass**, 0 fail/skip; gồm retry/concurrency/rollback, thu hồi role/quyền, che PII, giữ actor audit và hủy nghĩa vụ seller bị khóa |
| Catalog regression từ helper admin management | **8 pass, 1 skip**; bài storefront PostgreSQL được chạy riêng ngay dưới |
| Storefront PostgreSQL | **11 pass**, 0 fail/skip; gồm publish/category đồng thời cùng mã chỉ ghi một lần |
| CASE PostgreSQL/HTTP/CLI | **45 pass**, 0 fail/skip; giữ 44 bài trước và thêm rollback audit từ chối ngoại lệ |
| Identity admin HTTP + Payment unit + frontend session/policy/command | **24 pass**, 0 fail/skip |
| Edge desktop/mobile | Đạt: đăng nhập/refresh/đăng xuất; dữ liệu người dùng che trong danh sách/chi tiết; lý do Storefront và category; mất nguồn thống kê không ra số 0; không có runtime exception |
| Frontend build / lint file thay đổi | Đạt; build còn cảnh báo bundle lớn |
| Typecheck toàn frontend | Còn **22 lỗi cũ** ở component legacy, không có diagnostic trong các file CORE được thay đổi |

Chạy các bộ dữ liệu bằng:

```powershell
docker exec backend-v2-dev-identity-service-1 node services/identity-service/scripts/test-admin-management.mjs
docker exec backend-v2-dev-catalog-service-1 node services/catalog-service/scripts/test-storefront.mjs
docker exec backend-v2-dev-order-service-1 node services/order-service/scripts/test-admin-returns.mjs
```

Helper tạo/migrate database `*_test` riêng và dọn fixture. Test hủy đơn dùng HTTP thật của handler, adapter Inventory lỗi/thành công có kiểm soát và event Payment; không gọi provider để chi/hoàn tiền thật. Kiểm tra trình duyệt trên stack local không xuất bản nội dung, tạo danh mục hay cấp thêm quyền cho tài khoản thật. MFA/RBAC toàn sàn, console tài chính/COD/settlement và nghiệm thu production vẫn thuộc các nhóm yêu cầu tương ứng.
