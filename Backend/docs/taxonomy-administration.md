# Danh mục, thương hiệu và thuộc tính (ADM-CAT-001–009)

Trang quản trị riêng: **`/admin/categories`**. Các tab gồm cây danh mục, bộ thuộc tính, thương hiệu, nhập CSV và lịch sử.

## Quyền và quy trình

Các quyền `taxonomy.read`, `taxonomy.manage`, `taxonomy.import` là quyền tường minh. Moderator, content editor và vai trò admin chuyển đổi được cấp cả ba; operations được đọc. Catalog dùng chung toàn sàn nên grant giới hạn theo shop/hồ sơ không được dùng để thay đổi cây hay đọc lịch sử quản trị toàn sàn. Seller đọc bộ thuộc tính công khai và thông báo của sản phẩm thuộc shop mà họ đang có quyền.

Tạo/sửa/xóa danh mục, chuyển sản phẩm, sửa bộ thuộc tính, lưu/hợp nhất thương hiệu đều đi qua **xem trước → xác nhận**. Preview lưu lệnh, phiên bản, lý do và tác động, hết hạn sau 15 phút. Backend kiểm tra lại quyền và phiên bản khi áp dụng. Dữ liệu cây, tham chiếu sản phẩm, thuộc tính, thương hiệu hoặc bố cục trang chủ thay đổi thì preview cũ bị từ chối; người dùng phải xem trước lại.

Mutation, chuyển sản phẩm, cập nhật liên kết, thông báo và audit commit trong một transaction. Request ID giữ receipt chống lặp. Không ghi vào snapshot đơn hàng đã đặt.

## Chính sách cây và ngừng danh mục

- Backend và trigger PostgreSQL từ chối danh mục tự làm cha hoặc chuyển vào hậu duệ. Advisory lock dùng chung ngăn hai lệnh đồng thời tạo chu trình.
- Danh mục hoạt động phải nằm dưới toàn bộ nhánh cha còn hoạt động. Danh mục mới hoặc lần gán/đăng bán mới vào nhánh đã ngừng bị từ chối.
- Ngừng một nút là ngừng **toàn bộ nhánh**. Nếu nhánh còn sản phẩm ở bất kỳ trạng thái nào, phải chọn danh mục thay thế còn hoạt động và nằm ngoài nhánh. Không cho ngừng rồi để hàng hóa mất khỏi tìm kiếm âm thầm.
- Preview hiện tổng sản phẩm, sản phẩm đang bán/bị sàn chặn, số hậu duệ, tham chiếu trang chủ nháp/đã xuất bản và banner theo luồng cũ. Khi xác nhận, chuyển sản phẩm trước, tắt các ô/liên kết liên quan, kết thúc lịch của banner cũ rồi mới ngừng nhánh.
- Có thể chuyển sản phẩm sang nhánh thay thế mà vẫn giữ danh mục nguồn hoạt động. Chuyển áp dụng cho toàn nhánh, ghi từng ID sản phẩm và danh mục trước đó trong audit.
- Nếu sàn đang bật duyệt trước đăng, thay đổi danh mục/tên thương hiệu sẽ tuân theo cơ chế duyệt nội dung hiện có, có thể đưa hàng về hàng chờ. Preview thông báo tác động này; seller nhận thông báo trong trang sửa sản phẩm.
- Chuyển vào danh mục có bộ thông số khác không tự ẩn hàng chỉ vì thiếu thông số. Preview thống kê số hàng cần bổ sung; seller hoàn thiện theo chính sách thuộc tính.
- Không xóa danh mục còn sản phẩm, con, bộ thuộc tính, URL cũ hoặc tham chiếu trang chủ/banner, kể cả tham chiếu đã tắt. Cần chuyển hàng và gỡ các tham chiếu trước; danh mục đổi slug được giữ để bảo toàn URL cũ.
- Bật lại một nút không tự bật lại các con đã ngừng.

## Slug, ảnh và URL cũ

Tên, slug, mô tả, ảnh/icon, thứ tự, trạng thái và cha được quản lý trong cùng form. Slug có unique constraint và không được chiếm slug đã dành cho danh mục khác. Icon nhận tên icon hoặc URL ảnh; ảnh/logo nhận HTTPS hoặc đường dẫn ảnh thư viện.

Khi đổi slug, PostgreSQL cập nhật URL trong cả cấu hình trang chủ nháp/đang xuất bản lẫn banner cũ, giữ query/hash. Trang chủ mặc định cũng phân giải alias khi dựng liên kết. `category_slug_aliases` ánh xạ **slug → ID danh mục**, không ánh xạ slug → slug, nên không tạo chuỗi hay vòng chuyển hướng. Đổi về slug cũ của chính danh mục được phép và không để hai mapping xung đột.

Trang `/category/:slug` phân giải URL cũ, thay URL trình duyệt bằng canonical path và giữ query/hash. Search/filter theo slug cũ vẫn lấy đúng danh mục. Đây là chuyển hướng trong SPA bằng `replace`, không phải HTTP 301 của server hosting. Danh mục đã ngừng không chuyển hướng sang danh mục thay thế; trang công khai báo không còn hoạt động.

## Bộ thuộc tính và hàng cũ

Mỗi danh mục có thể có bộ riêng. Danh mục chưa có bộ riêng kế thừa bộ gần nhất từ cha; lưu bộ riêng thay thế toàn bộ bộ kế thừa. Một bộ tối đa 50 thuộc tính, mỗi thuộc tính có mã duy nhất, tên, kiểu `text/number/boolean/enum`, bắt buộc/tùy chọn, đơn vị và giá trị lựa chọn cho `enum`.

Các thông số sản phẩm lưu trong `specifications_json`, tách khỏi thuộc tính biến thể/SKU đang có. Biểu mẫu seller dựng control theo kiểu; backend kiểm tra khi tạo sản phẩm, lưu thông tin sản phẩm và đăng bán lại.

Có hai kế hoạch chuyển tiếp:

| Chính sách | Sản phẩm cũ |
| --- | --- |
| `ON_EDIT` | Giữ hàng đang bán; khi lưu thông tin chung hoặc đăng lại phải bổ sung bộ thông số hiện hành. |
| `NEW_ONLY` | Bộ thay đổi bắt buộc với sản phẩm tạo sau thời điểm cập nhật; sản phẩm cũ được tiếp tục chỉnh sửa theo dữ liệu cũ. |

Preview thống kê hàng thiếu/sai thông số và một số ví dụ để lập kế hoạch bổ sung. Đổi định nghĩa không tự sửa hay tự ẩn hàng cũ. Điều chỉnh tồn, giá SKU và ảnh có luồng riêng; các thao tác đó không tự buộc sản phẩm cũ hoàn thiện thông số chung.

## Thương hiệu

Migration lấy các tên thương hiệu đang có để tạo danh sách chuẩn ban đầu và gắn ID vào sản phẩm. Admin quản lý tên chuẩn, tên thay thế, logo và trạng thái. Tên và alias không thể thuộc hai thương hiệu.

Seller chọn tên chuẩn hoặc nhập tên cũ đã biết; backend phân giải alias và lưu tên chuẩn/ID. Tên tự nhập chưa khớp thương hiệu vẫn được giữ là dữ liệu chưa chuẩn hóa, không tự tạo thương hiệu. Khi admin tạo chuẩn/alias tương ứng, hệ thống gắn các sản phẩm cũ phù hợp.

Ngừng thương hiệu chặn lựa chọn mới, giữ sản phẩm hiện hữu và cho phép giữ nguyên thương hiệu đó khi sửa sản phẩm. Hợp nhất chỉ trỏ đến thương hiệu khác đang hoạt động; chuyển sản phẩm và toàn bộ alias sang đích, làm phẳng các mapping trước đó, giữ bản ghi nguồn ở trạng thái `MERGED`. Search theo tên/alias cũ tiếp tục tìm hàng của thương hiệu chuẩn. Đổi tên chuẩn giữ tên cũ làm alias; form bổ sung alias, không xóa các tên lịch sử.

## CSV

File UTF-8 tối đa **256 KB, 200 dòng dữ liệu**. Hỗ trợ BOM, CRLF, dấu phẩy và xuống dòng trong ô có dấu nháy. Lỗi tiêu đề, thiếu/thừa cột, kiểu dữ liệu, slug/mã trùng, cha thiếu và chu trình được ghi theo dòng. Chỉ kiểm tra không tạo danh mục/thuộc tính; file có lỗi không có nút áp dụng và backend cũng từ chối commit.

Danh mục dùng đầy đủ các cột:

```csv
name,slug,parentSlug,description,sortOrder,isActive,iconKey,imageKey
Điện tử,electronics,,Nhóm hàng điện tử,0,true,package,
Điện thoại,phones,electronics,Điện thoại và phụ kiện,1,true,phone,
```

CSV danh mục chỉ tạo mới. Có thể khai báo con trước cha; ID và thứ tự chèn được lập trong plan. Slug đang tồn tại hoặc slug dành cho URL cũ là lỗi.

Thuộc tính dùng đầy đủ các cột:

```csv
categorySlug,code,label,type,required,unit,allowedValues,legacyPolicy
phones,weight,Khối lượng,number,true,g,,ON_EDIT
phones,color,Màu,enum,false,,Đen|Trắng|Xanh,ON_EDIT
```

CSV thuộc tính cập nhật các mã có trong file và giữ các mã khác trong bộ riêng. Các dòng cùng danh mục phải có cùng chính sách. `required/isActive` dùng `true/false`; `allowedValues` phân cách bằng `|`; chính sách là `ON_EDIT/NEW_ONLY`.

Sau kiểm tra, người dùng xem plan và xác nhận toàn bộ file. Catalog hoặc tham chiếu thay đổi thì phải kiểm tra file lại. Không áp dụng từng phần; audit lỗi làm rollback toàn bộ. Lịch sử có file, loại nhập, số dòng, lỗi từng dòng, trạng thái và thời gian áp dụng. Lịch sử không lưu nội dung CSV gốc; giữ plan đã kiểm tra và lỗi.

## API và vận hành

| API | Mục đích |
| --- | --- |
| `GET /api/v2/admin/taxonomy` | Cây đầy đủ, số tham chiếu, thương hiệu, bộ thuộc tính, alias, audit |
| `POST /api/v2/admin/taxonomy/preview` | Kiểm tra lệnh và xem tác động |
| `POST /api/v2/admin/taxonomy/commit` | Áp dụng previewId của chính người dùng |
| `GET /api/v2/admin/taxonomy/imports` | Lịch sử CSV |
| `POST /api/v2/admin/taxonomy/imports/preview` | Kiểm tra toàn bộ file |
| `POST /api/v2/admin/taxonomy/imports/commit` | Áp dụng importId hợp lệ |
| `GET /api/v2/categories/resolve?slug=...` | Canonical URL của danh mục hoạt động |
| `GET /api/v2/categories/:id/attributes` | Bộ thuộc tính áp dụng gần nhất |
| `GET /api/v2/brands` | Thương hiệu đang áp dụng và alias |
| `GET /api/v2/seller/products/:id/taxonomy` | Thông số, thiếu sót và thông báo catalog của seller |

Áp dụng migration **018–020** trước khi chạy code mới. Các quyền mới được tính từ vai trò trong Identity; nếu dịch vụ đang chạy không theo dõi thay đổi file, cần khởi động lại để nạp định nghĩa quyền mới.

```powershell
cd Backend
node --env-file=.env --env-file=.env.development.local services/catalog-service/scripts/migrate.js
$env:NODE_ENV='development'
node --env-file=.env --env-file=.env.development.local services/catalog-service/scripts/test-taxonomy.mjs
cd ../Frontend
npm.cmd run test:taxonomy:browser
npm.cmd run build
```

Runner chỉ dùng PostgreSQL localhost, tạo database riêng `admin_taxonomy_test`, migrate các schema cần thiết và chạy toàn bộ test catalog. Các test chính rollback fixture; test cạnh tranh dùng kết nối/transaction thật và dọn dữ liệu riêng. Test browser dùng Edge headless và dữ liệu giả, kiểm tra desktop/mobile, quyền chỉ đọc, preview, lỗi chu trình, CSV, thông số seller và URL cũ. Đồng bộ file `.js` từ TypeScript bằng `Frontend/scripts/sync-taxonomy-javascript.mjs`.
