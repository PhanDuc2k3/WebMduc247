# Product Search V2

## Kiến trúc

- Catalog Service hiện có phục vụ `GET /api/v2/products/search`; `GET /api/v2/products?search=...` vẫn hoạt động. Không có dịch vụ tìm kiếm mới.
- `ProductSearchService` xác thực tham số và tạo DTO; `ProductSearchRepository` chạy SQL tham số hóa, tính thứ hạng và phân trang. Product CRUD vẫn nằm trong `CatalogService`.
- Migration `007_product_search.sql` thêm `pg_trgm`, các cột chuẩn hóa và trigger vào bảng Catalog hiện có. `unaccent` đã được kích hoạt ở migration 002. `normalize(..., NFC)`, `unaccent`, và chuyển `đ` thành `d` giúp tìm không dấu. Cấu hình FTS `simple` giữ nguyên từng âm tiết tiếng Việt; nó không tách từ ghép như một bộ phân tích tiếng Việt chuyên dụng.
- GIN trigram hỗ trợ tìm một phần và ứng viên fuzzy; GIN `tsvector` hỗ trợ nhiều từ khóa. Truy vấn dùng `UNION` các nhóm ứng viên để các index có thể được xét riêng. Thứ hạng ưu tiên tên trùng hoàn toàn, tiền tố, chứa cụm từ, rồi FTS và fuzzy. Còn hàng, featured và ngày tạo chỉ phân định các kết quả cùng mức liên quan. Không dùng số bán hoặc đánh giá để tăng hạng vì dữ liệu hiện chưa đủ tin cậy.
- Header gọi endpoint này sau 300 ms, hủy request cũ khi từ khóa thay đổi, tối đa 6 gợi ý. Trang `/products` dùng cùng endpoint khi có từ khóa và giữ bộ lọc trong URL.

## Migration

Chỉ chạy trên database đã được phép thay đổi. Trong môi trường phát triển local:

```powershell
cd Backend
node --env-file=.env.development.local services/catalog-service/scripts/migrate.js
```

Script migration dùng bảng `catalog.schema_migrations`; chạy lại sẽ bỏ qua migration đã áp dụng. Database role cần quyền tạo extension `pg_trgm`. Đừng chạy lệnh này với `CATALOG_DATABASE_URL` production khi chưa có phê duyệt.

## API

Ví dụ:

```http
GET /api/v2/products/search?q=ao%20thun&categoryId=<uuid>&shopId=<uuid>&minPrice=100000&maxPrice=500000&sort=relevance&page=1&limit=12
```

`q` dài 2–100 ký tự. Bộ lọc danh mục/cửa hàng cũng chấp nhận slug qua `category`/`store` để tương thích frontend cũ; `brand` lọc tên thương hiệu không phân biệt dấu/chữ hoa. `sort`: `relevance`, `price_asc`, `price_desc`, `newest`. `page` từ 1 đến 10000; `limit` từ 1 đến 50. Sản phẩm không công khai, cửa hàng tạm dừng, hoặc cửa hàng không nhận đơn đều bị loại.

Response rút gọn:

```json
{
  "products": [{ "id": "<uuid>", "name": "Áo thun cotton mẫu", "priceMinor": 159000, "imageUrl": "<url>" }],
  "page": 1,
  "limit": 12,
  "total": 1,
  "totalPages": 1,
  "hasNextPage": false,
  "ratingSource": "reviews"
}
```

Từ khóa rỗng hoặc chỉ một ký tự ở endpoint chuyên dụng trả HTTP 400. Endpoint danh sách `/api/v2/products` vẫn chấp nhận truy vấn không có từ khóa.

## Kiểm thử và đo hiệu năng local

```powershell
cd Backend
node scripts/benchmark-product-search.mjs
```

Với 79 sản phẩm local, một lần chạy `EXPLAIN (ANALYZE, BUFFERS)` ghi nhận truy vấn tên cũ 0,175 ms, điều kiện trên cột chuẩn hóa 0,177 ms, và truy vấn xếp hạng đầy đủ 1,492 ms. PostgreSQL chọn `Seq Scan` cho hai truy vấn đơn giản vì bảng rất nhỏ. Đây không phải benchmark 100.000 hay 1.000.000 sản phẩm; cần dữ liệu và tải đại diện để đánh giá thông lượng, độ trễ và lựa chọn index ở quy mô đó.

Test tích hợp dùng transaction và `ROLLBACK`; chỉ chạy với database test hoặc local được phép ghi:

```powershell
cd Backend
$env:CATALOG_TEST_DATABASE_URL = '<test PostgreSQL URL>'
node --test services/catalog-service/tests/product-search.test.js services/catalog-service/tests/catalog.integration.test.js
Remove-Item Env:CATALOG_TEST_DATABASE_URL
```

Autocomplete và race condition được kiểm thử bằng Node test, không cần thư viện UI mới:

```powershell
cd Frontend
node --test src/Layouts/Header/searchAutocomplete.test.mjs
npx.cmd tsc --noEmit
npm.cmd run build
```

## Giới hạn và hướng nâng cấp

- FTS `simple` không hiểu ngữ nghĩa hoặc từ ghép tiếng Việt. Fuzzy dựa trên trigram và ngưỡng tương đồng mỗi từ 0,50, vì vậy một số lỗi ở đầu từ hay từ quá ngắn có thể không khớp.
- Query hai ký tự và phân trang sâu bằng `OFFSET` có thể đắt khi dữ liệu lớn. Theo dõi `pg_stat_statements`/`EXPLAIN` trên dữ liệu đại diện, rồi cân nhắc tăng độ dài tối thiểu hoặc chuyển sang cursor pagination nếu cần.
- Chỉ xem xét một search engine riêng khi PostgreSQL không còn đáp ứng các mục tiêu độ trễ và thông lượng đo được.
