# Admin Platform

Khu vực `/admin` dùng Identity, Catalog và Order V2 với dữ liệu PostgreSQL thật, độc lập với `VITE_USE_MOCK_DATA`. Giữ nhận diện MDUC247, layout desktop/mobile và luồng đăng nhập/refresh/logout hiện có. Các component admin đời cũ không được đưa vào router mới.

## Chức năng đã nối frontend–backend

| Trang | Chức năng |
| --- | --- |
| `/admin/login` | Đăng nhập riêng; chỉ tài khoản có role `platform_admin` được cấp phiên từ endpoint admin. |
| `/admin` | Tổng quan tài khoản/shop/sản phẩm/đơn, biểu đồ 7 ngày, 5 đơn mới nhất và số mục cần chú ý. |
| `/admin/users` | Tìm tên/email, lọc vai trò/trạng thái, phân trang, xem chi tiết, khóa/khôi phục và lịch sử thao tác. |
| `/admin/stores` | Tìm tên/slug, lọc trạng thái, xem chi tiết, tạm ngừng/khôi phục cửa hàng và lịch sử. |
| `/admin/products` | Tìm tên/thương hiệu/shop, lọc trạng thái, phân trang, xem mô tả/biến thể/giá/tồn, ẩn/khôi phục và lịch sử. |
| `/admin/orders` | Tìm mã đơn/mã nhóm/shop/tên sản phẩm, lọc trạng thái, phân trang, xem item, thanh toán, tiền hoàn và lịch sử xử lý. |
| `/admin/returns` | Danh sách/lọc yêu cầu trả hàng, chi tiết, chứng cứ có kiểm soát truy cập, bắt đầu xem xét, chấp nhận/từ chối và nhật ký. [Chi tiết](admin-returns.md). |
| `/admin/cases` | Ticket/khiếu nại có trạng thái riêng, phân công/hạn, liên kết hồ sơ và thông tin bổ sung từ buyer/seller. [Chi tiết](admin-cases.md). |
| `/admin/return-exceptions` | Ngoại lệ quá hạn theo permission riêng, đề nghị/duyệt hai actor và snapshot policy gốc. [Chi tiết](admin-cases.md). |
| `/admin/case-reports` | Nguyên nhân, thời gian xử lý và tỷ lệ kháng nghị theo shop/category snapshot. [Chi tiết](case-resolution.md). |
| `/admin/audit` | Nhật ký tài khoản và catalog theo nguồn, lọc loại store/product, tìm đối tượng/lý do và phân trang. |
| `/admin/storefront` | Quản lý navbar, danh mục nổi bật, banner, thứ tự/ẩn hiện các khối, ghim sản phẩm/shop; lưu nháp, xem trước và xuất bản. [Chi tiết](storefront-editor.md). |

Chi tiết mở bằng `?id=<UUID>`, có thể tải lại hoặc gửi liên kết nội bộ. Thao tác thay đổi trạng thái yêu cầu xác nhận và lý do 8–500 ký tự. Không có thao tác xóa dữ liệu, tự nâng quyền, sửa tiền, ép trạng thái đơn hoặc xác nhận hoàn tiền trong đợt này. Cấp quyền quản trị vẫn dùng quy trình CLI riêng.

## Tài khoản và phiên

Local: [đăng nhập quản trị](http://localhost:5173/admin/login), email `platform-admin-local@example.test`; mật khẩu nằm trong `user.md` được Git bỏ qua. Email `@example.test` không nhận email thật, không dùng nghiệm thu OTP/quên mật khẩu.

Identity dùng access token trong bộ nhớ và refresh cookie HttpOnly, SameSite Strict, Path `/api/v2/auth`. Admin login kiểm tra mật khẩu, trạng thái active, email xác minh và role trước khi tạo phiên. Buyer/seller thiếu quyền nhận 403 và không được đặt cookie mới. Mỗi API tiếp tục xác minh quyền hiện tại ở backend, không tin role trong body/localStorage. Đăng ký công khai không cấp admin.

CLI `services/identity-service/scripts/create-platform-admin.mjs` nhận `{email,fullName,password}` qua stdin, dùng database URL của backend và từ chối email đã tồn tại. Không đổi mật khẩu hoặc nâng quyền ngầm cho tài khoản cũ. Production phải cấp mật khẩu rõ ràng; local có thể sinh ngẫu nhiên và xuất một lần cho người vận hành lưu riêng.

## Quy tắc kiểm duyệt

- **Tài khoản:** khóa đặt `suspended` và thu hồi tất cả refresh sessions trong cùng transaction. Access token cũ cũng bị từ chối vì Identity kiểm tra trạng thái/phiên từ DB. Khôi phục tài khoản chưa xác minh trả về `pending_verification`, không bỏ qua xác minh email. Không tự khóa hoặc đổi trạng thái tài khoản admin khác.
- **Cửa hàng:** `platform_suspended` độc lập với ý định nhận đơn của shop. Khi sàn chặn, status hiệu lực là `paused`, nên các API công khai và inventory hiện có không nhận giao dịch mới. Người bán không thể bật nhận đơn để bỏ chặn. Shop vẫn có thể chọn ngừng nhận đơn trong thời gian bị chặn; khi sàn khôi phục, lựa chọn đó được giữ nguyên.
- **Sản phẩm:** khi bị sàn ẩn, status hiệu lực là `hidden`, kèm trạng thái trước đó. Seller không thể publish/đổi status để bỏ chặn cùng sản phẩm. Khôi phục trả về trạng thái trước đó, không tự biến bản nháp/hàng ngừng kinh doanh thành hàng đang bán. Khôi phục trạng thái active/published cần ít nhất một biến thể đang hoạt động.
- **Đơn hàng:** giữ nguyên snapshot, lịch sử, trạng thái thanh toán và số tiền từ Order; không tạo lệnh tài chính hay sửa state trực tiếp. Điện thoại người nhận được che, không trả địa chỉ đường chi tiết ở API quản trị mới.
- **Xung đột:** request có `version` đã đọc từ server. Row lock và `admin_version` phát hiện thao tác admin đồng thời; bản cũ nhận 409 và cần tải lại chi tiết.
- **Nhật ký:** thay đổi trạng thái, thu hồi phiên và ghi audit nằm trong cùng transaction. Audit lỗi thì toàn bộ thay đổi rollback. Catalog còn ghi outbox cập nhật trong transaction. Nhật ký không có API sửa/xóa công khai. Catalog dùng actor UUID từ Identity để nhận diện quản trị viên, không truy vấn chéo database Identity.

## API

Các đường dẫn dưới đây có prefix `/api/v2`. Tất cả `/admin/*` yêu cầu bearer và role `platform_admin`: 401 khi thiếu phiên, 403 khi thiếu quyền.

| Service | Method/path | Response chính |
| --- | --- | --- |
| Identity | `POST /auth/admin/login` | user/accessToken, refresh cookie |
| Identity | `GET /admin/identity/summary` | số liệu tài khoản |
| Identity | `GET /admin/users` | danh sách phân trang |
| Identity | `GET /admin/users/:id` | record, history |
| Identity | `PATCH /admin/users/:id/status` | id/status/version |
| Identity | `GET /admin/audit` | nhật ký tài khoản phân trang |
| Catalog | `GET /admin/catalog/summary` | số liệu shop/sản phẩm |
| Catalog | `GET /admin/stores`, `/admin/products` | danh sách phân trang |
| Catalog | `GET /admin/stores/:id`, `/admin/products/:id` | record, history |
| Catalog | `PATCH /admin/stores/:id/status`, `/admin/products/:id/status` | id/status/version |
| Catalog | `GET /admin/catalog/audit` | nhật ký catalog phân trang |
| Order | `GET /admin/orders/summary`, `/admin/orders/recent` | thống kê và tối đa 5 đơn mới |
| Order | `GET /admin/orders`, `/admin/orders/:id` | danh sách hoặc record/history |

List query: `q` tối đa 100 ký tự, `status` theo enum của tài nguyên, `role` cho users, `kind=store|product` cho audit catalog, `page>=1`, `limit=1..50`. Dữ liệu trả `{items,total,page,limit,totalPages}`. Query tìm kiếm dùng SQL parameters, escape `%`, `_`, `\`; các khóa/bộ lọc không hợp lệ bị từ chối.

Mutation body: `{action:"suspend"|"restore", reason:"...", version:0}`. Không nhận userId/actorId/role từ client để cấp quyền. Detail trả các trường được chọn rõ ràng, không trả password hash hoặc token. Thông tin thiếu hiển thị “Chưa có dữ liệu”, lỗi tải có nút thử lại, không thay bằng mock hoặc số 0.

Dashboard tính ngày theo `Asia/Bangkok`. Số đơn là shop orders; checkout nhiều shop có thể tạo nhiều đơn. Giá trị đơn chưa hủy không đồng nghĩa doanh thu đã thu.

## Migration và chạy local

Migration mới:

- Identity `014_admin_management.sql`: `users.admin_version` và `platform_admin_actions`.
- Catalog `008_admin_management.sql`: cờ/lý do/phiên bản kiểm duyệt, trạng thái trước khi ẩn sản phẩm và `catalog.platform_admin_actions`.

Các migration bổ sung đã áp dụng vào stack local; không đổi ID, giá, tồn kho, đơn hoặc membership của dữ liệu hiện có. Các migration admin 012/013 trước đó được giữ nguyên. Compose dev tự nạp source qua nodemon. Khi triển khai nhiều replica, cập nhật mọi Catalog instance để chốt seller/public/inventory thống nhất trước khi mở chức năng kiểm duyệt. Chưa triển khai production.

## Kiểm thử

```powershell
cd Backend
npm.cmd run identity:test
node --test ../Frontend/src/pages/Admin/adminPolicy.test.mjs
docker exec backend-v2-dev-identity-service-1 node services/identity-service/scripts/test-admin-management.mjs
```

Helper Docker chỉ chạy ở `NODE_ENV=development`, tạo/giữ database `identity_admin_test` riêng và áp dụng migration Identity/Catalog/Order vào đó. Nó không kiểm duyệt dữ liệu đang dùng. Có thể chạy bài DB độc lập với `ADMIN_TEST_DATABASE_URL` trỏ database đã migrate có hậu tố `_test`.

Kết quả:

- Identity host: 32 đạt, 6 DB test skip khi không cung cấp URL test; policy frontend 2 đạt.
- Admin PostgreSQL trên database riêng: 8 đạt, gồm quyền trước SQL, thu hồi access/refresh, bảo vệ admin, giữ xác minh email, version conflict, rollback khi audit lỗi, chống seller bỏ chặn, restore theo ý định shop, tìm kiếm/pagination và snapshot đơn.
- Catalog PostgreSQL: 6 đạt, gồm luồng seller, media, search, inventory và 100 lượt reserve đồng thời.
- HTTP stack local: danh sách/chi tiết của bốn tài nguyên và hai nguồn audit đều trả dữ liệu thật.
- Edge headless desktop/mobile: tìm/lọc, trạng thái rỗng, phân trang thực, xem biến thể và item đơn, khóa/khôi phục tài khoản, tạm ngừng/khôi phục shop, ẩn/khôi phục sản phẩm, audit source/kind, menu và đăng xuất. Không có lỗi runtime. Các thao tác browser dùng bản ghi QA riêng, shop QA luôn paused; bản ghi và nhật ký QA đã được dọn theo marker, không dùng dữ liệu khách hàng hiện có.
- Frontend production build đạt. Typecheck toàn dự án vẫn có 22 lỗi cũ ngoài các file mới/sửa của phần này.
