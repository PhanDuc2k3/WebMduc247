# Sản phẩm và kiểm duyệt (ADM-PROD-001–012)

Trang quản trị: `/admin/products`. Hồ sơ seller: `/mystore/products/:id`.
Người mua có thể gửi báo cáo tại trang chi tiết sản phẩm; báo cáo là đầu vào kiểm tra, không tự chặn hàng.

## Trạng thái và phiên bản

- `seller_status` lưu ý định bán của seller, độc lập với `platform_suspended` và `review_status`.
- `status` là trạng thái hiển thị thực tế, được trigger PostgreSQL tính lại. Sản phẩm bị sàn chặn luôn `hidden`; seller API từ chối publish trong trạng thái này.
- Khôi phục bỏ cờ chặn; bản nháp vẫn là bản nháp. Nếu chưa được duyệt đăng bán thì sản phẩm vẫn chưa hiển thị dù đã gỡ chặn.
- Nội dung, SKU, giá, thuộc tính, ảnh và trạng thái làm tăng `admin_version`. Quyết định và bản xem trước hàng loạt phải gửi đúng phiên bản; dữ liệu thay đổi trả `409 VERSION_CONFLICT`.
- `product_revisions` lưu snapshot theo phiên bản; `product_decisions` giữ snapshot được xét, quy tắc tại thời điểm xét, mã lý do, giải thích, bằng chứng, báo cáo liên quan và hạn khắc phục. API không sửa các bản ghi này; trigger cấm UPDATE lịch sử.
- Thay đổi catalog không ghi vào `order_service.order_items`. Kiểm thử so sánh toàn bộ bản ghi đơn trước/sau sửa giá, nội dung và ẩn hàng.
- Xóa ảnh khỏi sản phẩm giữ object cũ để ảnh của lịch sử kiểm duyệt và snapshot đơn vẫn truy cập được. Không chạy dọn object chỉ dựa trên danh sách ảnh hiện tại.

## Duyệt trước đăng

Mặc định **tắt**. Moderator có quyền toàn sàn có thể bật trong mục **Chính sách duyệt trước đăng**, kèm lý do và phiên bản chính sách. Thay đổi chính sách có audit riêng.

Khi bật, sản phẩm mới và thay đổi tên, mô tả, danh mục, thương hiệu, ảnh, giá, biến thể hoặc thuộc tính chuyển `PENDING`. Chỉnh riêng số tồn kho tăng phiên bản quản trị nhưng không bắt duyệt lại nội dung. Danh sách có bộ lọc **Chờ duyệt đăng bán** và **Cần sửa trước đăng bán**.

Admin xét đúng phiên bản hiện tại, chọn duyệt hoặc yêu cầu sửa kèm hạn. `approved_content_version` ghi nhận phiên bản nội dung đã duyệt. Duyệt không gỡ cờ chặn của sàn và không biến bản nháp thành sản phẩm đang bán.

Sản phẩm đã tồn tại trước khi bật được giữ nguyên đến lần sửa nội dung tiếp theo. Tắt chính sách dừng tạo yêu cầu duyệt mới; các bản đang chờ vẫn phải được xét.

## Quyết định, thông báo và kháng nghị

Ẩn/khôi phục, yêu cầu chỉnh sửa, xác nhận khắc phục, duyệt đăng và xét kháng nghị ghi quyết định cùng thông báo seller trong một transaction. Thông báo được lưu bền vững và hiển thị ở hồ sơ sản phẩm của seller; outbox ghi `ProductModerationDecided.v1` để kết nối kênh khác sau này.

Seller gửi xác nhận đã sửa hoặc kháng nghị gắn quyết định, phiên bản và snapshot sản phẩm. Sửa nội dung hoặc xác nhận khắc phục không tự gỡ cờ chặn. Người ra quyết định không được tự xét kháng nghị. Kháng nghị quyết định cũ không thể gỡ một lần chặn mới hơn hay thay lần duyệt đăng mới hơn. Xét lại tạo quyết định mới và giữ lịch sử cũ.

Mã vi phạm thuộc các nhóm nội dung sai lệch, hàng cấm, ảnh không phù hợp, giả mạo thương hiệu và spam. Quy tắc có bật/tắt, phiên bản và audit; quyết định lưu bản sao quy tắc để việc sửa chính sách không đổi lịch sử. Liên kết bằng chứng chỉ nhận HTTP/HTTPS, tối đa 10 liên kết; tối đa 20 báo cáo thuộc đúng sản phẩm.

## Hàng loạt

Chọn rõ các ID và phiên bản, tối đa **200 mục**. Checkbox trên danh sách chỉ chọn trang hiện tại. Bước xem trước lưu danh sách, lý do chung và kết quả kiểm tra quyền/trạng thái từng mục, hết hạn sau 15 phút.

Từ bản xem trước đã xác nhận, API tạo job bền vững. Mỗi lần chạy xử lý tối đa **20 mục** trong các transaction riêng, kiểm tra lại quyền, phạm vi, trạng thái, quy tắc và phiên bản. Giao diện tự gọi các lượt tiếp theo khi hộp thoại còn mở. Có thể đóng rồi tiếp tục bằng mã job; job không tiếp tục chạy khi không có client gọi lượt tiếp theo.

Mỗi mục có request ID riêng cố định. Nếu quyết định đã commit nhưng checkpoint job bị lỗi, lượt tiếp theo đọc receipt cũ, không tạo quyết định hay thông báo trùng. Một mục lỗi không làm mất kết quả mục khác. Job chỉ đọc/chạy được bởi người tạo, với quyền hiện tại ở từng lượt.

## Tín hiệu hỗ trợ

Trùng tên trong cùng shop, trùng hash ảnh đã upload và biến động giá từ 50% là gợi ý cho nhân viên. Hash chỉ nhận ảnh giống hệt sau chuẩn hóa, không suy luận nội dung ảnh. Ảnh cũ chưa có hash không được tự gán kết quả. Các truy vấn ứng viên tuân thủ phạm vi đọc. Không tín hiệu nào tự tạo vi phạm hoặc chặn sản phẩm.

## API

| API | Mục đích |
| --- | --- |
| `GET /api/v2/admin/products` | Lọc shop, danh mục, thương hiệu, ngày tạo, tồn, trạng thái seller và kiểm duyệt |
| `GET/POST /api/v2/admin/products/:id/moderation` | Hồ sơ và quyết định có version/requestId |
| `GET /api/v2/admin/products/:id/revisions/:version` | Snapshot và ảnh của bản lịch sử được phép đọc |
| `GET /api/v2/admin/products/:id/signals` | Tín hiệu tham khảo |
| `GET/POST /api/v2/admin/product-rules` | Đọc/cấu hình quy tắc |
| `POST /api/v2/admin/product-review-policy` | Bật/tắt duyệt trước đăng |
| `POST /api/v2/admin/products/bulk/preview` | Xem trước danh sách ID/version tường minh |
| `POST /api/v2/admin/products/bulk/jobs` | Tạo job từ previewId đã xác nhận |
| `GET /api/v2/admin/products/bulk/jobs/:id` | Tiến độ và kết quả từng mục |
| `POST /api/v2/admin/products/bulk/jobs/:id/run` | Chạy tối đa 20 mục, có thể tiếp tục |
| `GET/POST /api/v2/seller/products/:id/moderation` | Thông báo, lịch sử, xác nhận sửa, kháng nghị |
| `GET /api/v2/product-report-reasons` | Lý do báo cáo đang áp dụng |
| `POST /api/v2/products/:id/reports` | Người dùng đăng nhập gửi báo cáo sản phẩm công khai |

## Chạy và kiểm thử

Áp dụng migration catalog **014–017** trước khi chạy backend mới:

```powershell
cd Backend
node --env-file=.env --env-file=.env.development.local services/catalog-service/scripts/migrate.js
```

Bộ nghiệm thu tạo database riêng `admin_product_moderation_test` trên PostgreSQL localhost, migrate các schema cần thiết và chạy các test catalog. Fixture chính rollback; bài kiểm thử cạnh tranh và mất checkpoint dùng transaction thật, tự dọn dữ liệu.

```powershell
cd Backend
$env:NODE_ENV='development'
node --env-file=.env --env-file=.env.development.local services/catalog-service/scripts/test-product-moderation.mjs
cd ../Frontend
npm.cmd run test:products:browser
npm.cmd run build
```

Browser QA dùng Edge headless có sẵn trên Windows với dữ liệu giả, kiểm tra bộ chọn trang hiện tại, preview/job, phiên bản quyết định, so sánh trước/sau, duyệt đăng, quyền chỉ đọc, thông báo seller, kháng nghị và báo cáo của người mua. Test không thay đổi dữ liệu thật. Các file `.js` đồng hành được đồng bộ từ TypeScript bằng `scripts/sync-product-javascript.mjs`.
