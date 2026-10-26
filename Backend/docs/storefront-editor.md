# Quản lý giao diện trang chủ

Mở [Admin → Giao diện trang chủ](http://localhost:5173/admin/storefront) bằng tài khoản `platform_admin` hiện có. Trang khách hàng và header dùng cấu hình từ Catalog, độc lập với cờ mock của API cũ.

## Chức năng

- **Menu điều hướng:** thêm/xóa mục, sửa tên và liên kết nội bộ, ẩn/hiện, đổi thứ tự. Tối đa 16 mục; menu áp dụng cho header trên các trang mua sắm.
- **Danh mục nổi bật:** chọn danh mục thật trong catalog hoặc tạo ô liên kết riêng; sửa nhãn, biểu tượng, màu và thứ tự; tối đa 16 ô. Thêm/bật ô sẽ tăng giới hạn hiển thị nếu cần. Có thể chủ động giảm số ô tại Bố cục trang.
- **Tạo danh mục:** tạo danh mục gốc/con, slug tự động hoặc nhập riêng. Danh mục được tạo ngay trong catalog và thêm vào bản nháp nổi bật; cần xuất bản bố cục để hiện ô trên trang chủ. Trang `/category/:slug` hỗ trợ danh mục mới bằng dữ liệu thật.
- **Banner:** tối đa 6 banner, sửa nội dung, ảnh, mô tả ảnh, nhãn nút, liên kết và tông màu. Chọn ảnh sẵn có hoặc nhập URL HTTPS/đường dẫn ảnh tĩnh được hỗ trợ; không có upload file mới trong đợt này. Ẩn/xóa toàn bộ banner không tự làm banner mặc định xuất hiện lại sau xuất bản.
- **Bố cục trang:** bật/tắt và sắp xếp sáu khối hero, danh mục, Flash Sale, sản phẩm nổi bật, cửa hàng nổi bật, gợi ý hôm nay. Đổi tiêu đề/dòng mô tả và số mục tối đa của các khối. Nội dung chữ hero được sửa ở tab Banner.
- **Sản phẩm/cửa hàng:** tìm và ghim tối đa 12 mục mỗi loại theo thứ tự. Không ghim thì dùng lựa chọn tự động. Giá/tồn kho/trạng thái lấy mới từ catalog; mục ẩn hoặc shop tạm ngừng bị loại khỏi nội dung công khai, không được khôi phục trạng thái bán bởi cấu hình trang chủ.

## Bản nháp, xem trước và xuất bản

1. Chỉnh nội dung trong các tab; lưu trước khi rời màn biên tập.
2. **Lưu bản nháp** lưu cấu hình riêng, không đổi navbar/nội dung công khai.
3. **Lưu & xem trước** lưu và mở `/admin/storefront/preview`, vẫn yêu cầu xác thực/quyền admin. Dùng Header/Home/Footer thật và dữ liệu hàng hóa hiện tại để dựng bản nháp.
4. **Xuất bản** mở hộp xác nhận, sau đó lưu đồng thời draft và published của cấu hình đang biên tập.
5. **Dùng lại bản đã xuất bản** chép nội dung published vào bản nháp để rà soát/lưu lại; không tự xuất bản.

Khách mới/tải lại trang đọc published. Các tab cùng browser profile được báo cập nhật qua sự kiện storage sau khi admin xuất bản. Chưa có push realtime sang mọi thiết bị đang mở trang. Bản nháp và lịch sử không nằm trong API công khai. Lưu/xuất bản có kiểm tra phiên bản; request cũ nhận 409 thay vì ghi đè sửa đổi của admin khác. Lịch sử lưu actor UUID, action, version và snapshot trong transaction; audit lỗi sẽ rollback toàn bộ thao tác, kể cả tạo danh mục.

## API và dữ liệu

Catalog migration `009_storefront_editor.sql` thêm `catalog.storefront_settings` (singleton, draft/published/version) và `catalog.storefront_changes`. Không sửa giá/tồn kho, không ghi đè banner đời cũ. Khi chưa có published tùy chỉnh, trang giữ giao diện mặc định hiện tại; `/home` vẫn giữ các trường cũ và bổ sung `layout`, `storefrontConfigured`.

| API, prefix `/api/v2` | Quyền |
| --- | --- |
| `GET /storefront` | Public; chỉ layout published/mặc định |
| `GET /home` | Public; dữ liệu catalog và layout published |
| `GET /admin/storefront` | Admin; draft, published, categories, references, history |
| `POST /admin/storefront/draft` | Admin; `{version,config}` |
| `POST /admin/storefront/publish` | Admin; `{version,config}` |
| `GET /admin/storefront/preview` | Admin; HomeData của draft |
| `GET /admin/storefront/choices?resource=products|stores&q=...` | Admin; tìm tối đa 20 mục đang công khai |
| `POST /admin/storefront/categories` | Admin; `{name,slug?,parentId}` |

Backend kiểm tra schema sâu, UUID/tham chiếu catalog, số lượng, độ dài, enum biểu tượng/màu và thứ tự. Liên kết chỉ trỏ tới trang nội bộ công khai được hỗ trợ, không cho URL JavaScript/protocol-relative/admin. Ảnh dùng URL HTTPS hoặc asset tĩnh; backend không fetch URL ảnh do admin nhập. Không lưu HTML/CSS/script tùy ý. Các trường chữ được React render dưới dạng text. Cấu hình tối đa 64 KiB, request editor tối đa 128 KiB; API khác giữ giới hạn body cũ.

Ô tham chiếu danh mục đang bật phải còn hoạt động; ô đã tắt có thể giữ tham chiếu cũ. Mục ghim tạm ngừng vẫn được giữ làm lựa chọn nhưng chỉ xuất hiện lại khi catalog cho phép công khai. Mục bị xóa cần được bỏ ghim trước khi lưu. Đổi slug danh mục được cập nhật lại khi dựng liên kết ô danh mục.

## Kiểm chứng

```powershell
cd Backend
docker exec backend-v2-dev-catalog-service-1 node services/catalog-service/scripts/test-storefront.mjs
docker exec backend-v2-dev-identity-service-1 node services/identity-service/scripts/test-admin-management.mjs
```

- Storefront: 9 bài đạt trên database `catalog_storefront_test` riêng: schema/URL, authorization, tạo danh mục/audit, draft isolation, preview, publish/order/curation, catalog thay đổi, version conflict, rollback và nội dung tắt/rỗng không tự fallback.
- Hồi quy admin PostgreSQL: 8 đạt. Catalog: 8 đạt, 1 storefront DB test skip trong runner cũ; bài storefront DB đã được chạy riêng ở trên để tránh singleton config ảnh hưởng các bài Catalog chạy đồng thời.
- Build frontend đạt; typecheck toàn dự án còn 22 lỗi cũ ngoài các file mới/sửa trong đợt này.
- Edge headless desktop/mobile: thêm/sắp menu, tạo danh mục mới, sửa/thêm/xóa banner, đổi thứ tự/tắt khối, ghim dữ liệu thật, lưu nháp, xem trước riêng, xuất bản/kiểm tra trang public, menu mobile và logout; không có lỗi runtime.
- Browser QA dùng cấu hình tạm có marker, chụp bản gốc trước khi thử và khôi phục sau; danh mục/nhật ký QA đã dọn. Kiểm tra cuối xác nhận không còn mục QA, vẫn có bảy danh mục gốc và chưa có layout tùy chỉnh xuất bản. Phiên bản cấu hình được giữ tăng dần để vô hiệu hóa form cũ.

Chưa triển khai production. Cần chạy migration Catalog trước khi nạp code mới. Compose dev hiện tại tự reload source; không cần đổi công nghệ hoặc thêm service.
