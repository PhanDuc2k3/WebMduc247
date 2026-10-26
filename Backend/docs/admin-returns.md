# Quản trị trả hàng

> Đã mở rộng đủ phạm vi CASE-001 đến CASE-008. Tài liệu đầy đủ về ticket/khiếu nại, phân công, policy, ngoại lệ hai người, grant chứng cứ và trao đổi thông tin: [admin-cases.md](admin-cases.md).

> CASE-009 đến 018 cũng đã hoàn thành local: [quyết định có căn cứ, can thiệp, kháng nghị và báo cáo](case-resolution.md).

Mở `/admin/returns` bằng tài khoản `platform_admin`. Có thể truy cập từ menu **Trả hàng**, hoặc nút **Yêu cầu trả hàng** trong chi tiết đơn quản trị.

## Phạm vi đã triển khai

- Danh sách phân trang, tìm mã yêu cầu/mã đơn/mã nhóm checkout/tên shop.
- Lọc trạng thái, phương thức thanh toán, ngày tiếp nhận theo UTC+7; API hỗ trợ thêm `storeId`.
- Chi tiết giữ số tiền và sản phẩm từ Order, liên kết tới người mua/shop/đơn; không trả địa chỉ hoặc điện thoại giao hàng.
- Mở ảnh chứng cứ theo assignee/quyền giám sát, bearer và grant dùng một lần 60 giây; response `private, no-store`. Mỗi lần cấp/tải ảnh ghi audit; đổi owner thu hồi grant.
- Bắt đầu xem xét, chấp nhận hoặc từ chối yêu cầu trả hàng/hoàn tiền (`resolution=REFUND`).
- Mọi thay đổi cần lý do 10–500 ký tự, `version` hiện tại và role admin. Buyer/seller không truy cập được API quản trị.
- Không cho admin xử lý yêu cầu của chính mình ở vai trò buyer. Hồ sơ đổi hàng (`REPLACEMENT`) chỉ đọc ở đợt này.
- Cập nhật trạng thái, phản hồi của sàn, lịch sử, audit và outbox chấp nhận trong cùng transaction. Request trùng/stale nhận 409; không ghi lịch sử hoặc sự kiện hai lần.
- Buyer/seller thấy phản hồi của sàn riêng với phản hồi shop. Buyer có thể tiếp tục gửi trả sau khi admin chấp nhận.

## Chuyển trạng thái

| Thao tác | Trước | Sau | Tác động |
| --- | --- | --- | --- |
| `review` | `REQUESTED` | `UNDER_REVIEW` | Ghi phản hồi/lịch sử/audit |
| `approve` | `UNDER_REVIEW` | `APPROVED` | Thêm `ReturnApproved.v1` theo outbox hiện có |
| `reject` | `UNDER_REVIEW` | `REJECTED` | Ghi phản hồi/lịch sử/audit; không tạo lệnh tiền |

Chấp nhận không đồng nghĩa đã hoàn tiền. Buyer gửi trả → seller ghi kết quả kiểm tra → `REFUND_PENDING` khi chấp nhận → Payment xác nhận. Admin nhận/kiểm tra thay seller chỉ qua lệnh can thiệp có permission, phân công, chứng cứ và điều kiện quá hạn/bị khóa. Không có lệnh ép `REFUNDED`, sửa số tiền hoặc xác nhận thực chi.

Nội dung lý do là phản hồi công khai trong hồ sơ cho buyer/seller, không phải ghi chú nội bộ. Không nhập thông tin cá nhân hoặc bí mật vào trường này.

## API

Prefix `/api/v2` trên Order Service:

| Method/path | Dữ liệu |
| --- | --- |
| `GET /admin/returns` | `{items,total,page,limit,totalPages}` |
| `GET /admin/returns/:id` | `{record,history,audit}`; audit tối đa 100 sự kiện gần nhất |
| `POST /admin/returns/:id/decisions` | `{action,reason,version}`; `approve/reject` cần thêm `responsibleParty,policyVersion,basisSummary,evidenceRefs` |
| `POST /admin/returns/:id/evidence/:imageId/access` | `{reason}` → URL có hạn; yêu cầu được phân công hoặc có quyền giám sát |
| `GET /admin/returns/:id/evidence/:imageId?grant=...` | Ảnh được bảo vệ; bearer + grant gắn actor/case/image, dùng một lần |

List nhận `q`, `status`, `paymentMethod`, `storeId`, `reasonCode`, `assigneeId`, `due`, `from`, `to`, `page`, `limit`. `from/to` theo `YYYY-MM-DD`, gồm toàn bộ ngày kết thúc tại UTC+7. Giới hạn phân trang 1–50 mục/trang. Khóa lạ, ngày sai hoặc khoảng ngược bị từ chối. Detail trả thêm `case` chứa phân công, trao đổi thông tin, link và event.

Migration `013_admin_returns.sql` thêm `return_requests.admin_response`, bảng `admin_return_actions` và index. Không thay giá, tiền, snapshot hoặc ID hiện hữu. Audit lưu actor UUID; không có API sửa/xóa audit.

## Kiểm tra

```powershell
cd Backend
npm.cmd run order:test
docker exec backend-v2-dev-order-service-1 node services/order-service/scripts/test-admin-returns.mjs
```

Helper Docker chỉ chạy ở `NODE_ENV=development`, tạo/migrate database riêng `order_admin_returns_test`, dùng fixture có ID ngẫu nhiên và dọn sau khi chạy. Không đổi trạng thái bản ghi người dùng đang dùng. HTTP test dùng Identity adapter giả lập để kiểm tra routing/role/origin; không thay thế kiểm tra đăng nhập Identity thật trên trình duyệt.

Khi phát triển với source mount: chạy `npm run order:migrate` trong container rồi restart riêng Order sau khi thêm migration. Production cần migration trước khi nạp code và nghiệm thu riêng.

### Kết quả kiểm tra local ngày 26/10/2026

- Order host: 9 test đạt; bài integration bỏ qua khi không cung cấp URL test riêng.
- Helper PostgreSQL/HTTP/CLI: 44 test đạt, không skip; gồm CASE-001 đến 018 và hồi quy trả hàng. Notification unit: 6 test đạt.
- Edge headless: đăng nhập Identity thật, menu admin, tìm kiếm/trạng thái rỗng, chi tiết, ảnh, xem xét/chấp nhận, khôi phục phiên sau reload và desktop/mobile đạt; không có runtime exception.
- Thao tác UI dùng API Order gắn database test riêng; sau đó kiểm tra chỉ đọc API admin trên Order local đang chạy. Fixture được dọn, không xử lý hồ sơ khách hiện có.
- Frontend production build và lint các file admin/API mới/sửa đạt. Vite còn cảnh báo kích thước bundle lớn.
- Typecheck toàn frontend vẫn báo 22 lỗi ở các component đời cũ ngoài phạm vi thay đổi; không có lỗi type tại các file mới/sửa của đợt này.
- Migration Order 013/014/015 và Engagement 008 đã áp dụng vào stack Docker local; các service đã khởi động lại/reload. Chưa triển khai production.

## Chưa thuộc đợt này

- RBAC theo nhóm nhân sự và MFA: vẫn dùng quyền `platform_admin` hiện tại; chưa hoàn tất gói G0 của tài liệu yêu cầu.
- Đồng hồ SLA tự động toàn sàn; chuyển cấp, kháng nghị, quyết định/duyệt tranh chấp và nghĩa vụ đã có trong module mở rộng.
- Console tài chính/refund, duyệt hai người, thực chi COD/VietQR và đối soát provider.
- Tra cứu audit nhiều module từ một giao diện; audit trả hàng hiện nằm trong chi tiết yêu cầu.
- Luồng đổi hàng thay thế tự động; admin nhận/kiểm tra khi seller bị chặn đã có qua permission và chứng cứ, không mở lại shop.

Theo dõi phạm vi tổng thể trong [yêu cầu Admin Platform](../../ADMIN_PLATFORM_REQUIREMENTS.md).
