# Backend v2 — trạng thái liên kết FE–BE

Backend v2 hiện triển khai **Identity Service**, **Catalog Service**, **Order Service**, **Payment Service**, **Chat Service** và các module Promotion/Reviews/Notification của **Engagement Service**. Các trang xác thực trong `Frontend` gọi API thật tại `/api/v2/auth` qua [`identityApi.ts`](../Frontend/src/api/identityApi.ts).

## Kết quả nghiệm thu local (19/10/2026)

**Kết luận:** Docker Desktop vẫn chưa chạy. PostgreSQL 18 tạm và API `5101–5105` đã được dùng để kiểm thử Review/Return, Notification và chứng minh checkout/Order hoạt động khi Chat/Mongo tắt. Chat Service qua unit test và Socket.IO/HTTP với repository giả lập; chưa có MongoDB local hoặc thao tác FE trên trình duyệt. Toàn hệ thống chưa được nghiệm thu đầy đủ.

| Phần đã có FE + BE v2 | Mức xác nhận hiện tại |
| --- | --- |
| Tài khoản, phiên đăng nhập, hồ sơ, địa chỉ | FE có trang/API; Identity có 16 test đạt, gồm 2 test PostgreSQL. |
| Shop, danh mục, sản phẩm, SKU và tồn kho | FE có trang/API; Catalog có 4 integration test đạt trên PostgreSQL tạm. |
| Giỏ hàng, checkout, đơn buyer/seller, COD | FE có trang/API; Order có 4 unit test đạt. HTTP `cart-checkout` và `order-lifecycle` đạt khi Chat/Mongo tắt. |
| Voucher, Flash Sale, Review, Notification | FE có trang/API; Engagement có 12 test đạt khi dùng PostgreSQL tạm, gồm inbox DB/HTTP và Socket.IO; Review & Return có thêm test DB và HTTP liên service đạt. |
| MoMo/VietQR, webhook và hoàn tiền | FE có luồng/API; Payment có 3 unit test đạt. Luồng hoàn tiền VietQR của P1 đã được kiểm tra HTTP bằng settlement giả lập; chưa dùng ngân hàng thật. |
| Chat và chatbot | Trang `/messages`, trang shop và widget bot dùng API v2; Chat Service có 11 test đạt, gồm Socket.IO/HTTP giả lập. Chưa chạy MongoDB thật hoặc thử FE trên trình duyệt. |
| Notification | Trang `/notifications`, badge và cài đặt dùng API v2; Order → Notification đã qua HTTP với checkout ba shop và yêu cầu trả hàng. Payment/Chat event được kiểm tra qua HTTP consumer; email provider live chưa nghiệm thu. |

**Chưa xong hoặc chưa được xác nhận:**

- FE build bằng Vite thành công, nhưng `tsc --noEmit` còn các lỗi kiểu dữ liệu cũ và `npm run lint` toàn FE đã báo **551 lỗi, 10 cảnh báo** trước khi thêm P1; các file FE mới lint riêng không có lỗi/cảnh báo.
- Bộ E2E chung chưa chạy đầy đủ trong đợt này. Khi chạy thiếu biến môi trường, bài MoMo lỗi lúc import `payment-service/src/server.js` trước điều kiện skip; P1 đã có test HTTP riêng chạy đạt với database tạm.
- Yêu thích và các component quản trị đời cũ vẫn dùng API cũ/dịch vụ riêng hoặc mock; `Frontend/.env` bật `VITE_USE_MOCK_DATA=true` cho API cũ. Luồng `/admin/*` mới dùng Identity/Catalog/Order V2 với quyền `platform_admin`: dashboard, người dùng, cửa hàng, sản phẩm, tra cứu đơn và nhật ký đều dùng dữ liệu thật. Xem [Admin Platform](docs/platform-admin.md). Chat, chatbot và thông báo v2 cũng gọi API thật độc lập với cờ mock.
- Chưa có Delivery Service, ví nội bộ, số liệu tổng hợp seller/số bán/best seller. Phí ship đang là ước tính cố định.
- Tại mốc kiểm tra 19/10, xác minh email còn tắt; từ 21/10 đã bật và người dùng nghiệm thu đăng ký qua Resend. OTP điện thoại vẫn dùng email giả lập trong dev; SMS và hạ tầng ảnh production, Kafka, tài khoản thanh toán live chưa nghiệm thu.

Để nghiệm thu FE–BE local đầy đủ cần chạy lại toàn bộ E2E và thao tác thực tế trên trình duyệt, gồm upload ảnh qua ClamAV và hoàn tiền qua provider thử nghiệm. Chi tiết chức năng theo mã nguồn ở các mục bên dưới.

### P1 Review & Return (đã qua test DB và HTTP, chưa thử trình duyệt/provider)

- **Review:** Buyer chỉ tạo một đánh giá cho mỗi `order_item` đã giao/hoàn thành; có sửa theo version, điểm 1–5, ảnh tối đa 3 tệp, lọc nội dung chứa HTML/liên kết/thông tin liên hệ. Public xem phân trang/lọc sao/sắp xếp theo phiếu hữu ích; seller thuộc shop trả lời một lần. Rating summary của Catalog được đồng bộ và đối soát định kỳ.
- **Return:** Buyer gửi yêu cầu theo item/số lượng trong 7 ngày từ khi giao; số lượng và tiền sản phẩm được tính theo giá đã giảm. Phí ship chỉ hoàn khi toàn bộ đơn được trả trong cùng một yêu cầu do hàng hỏng/giao sai. Seller xem xét, chấp nhận/từ chối, xác nhận nhận hàng; ảnh chứng cứ chỉ buyer và seller cùng shop đọc được. Đơn trả trước chỉ gửi refund sang Payment sau khi nhận hàng, có retry; COD giữ ở `REFUND_PENDING` để xử lý riêng.
- **Chưa hoàn chỉnh:** yêu cầu đổi hàng, chi trả COD và xử lý tranh chấp; ảnh hiện lưu trong PostgreSQL, cần chuyển sang object storage khi vận hành lớn. Chưa thử upload ảnh với ClamAV thật hoặc refund với provider live; test HTTP đã xác nhận VietQR pending → settlement giả lập → `REFUNDED`. Contract ở [Review & Return OpenAPI](docs/api/review-return.openapi.yaml).

### P1 Chat & Chatbot (test giả lập và kiểm tra phiên bot trên MongoDB local đạt)

- Một hội thoại duy nhất theo buyer/shop; Identity xác thực REST và Socket.IO, Catalog kiểm tra quyền nhân viên shop ở mỗi lần join/gửi/đọc. MongoDB lưu message, cursor lịch sử, read state, bot session/message; `clientMessageId` và unique index chống gửi trùng. FE `/messages` dùng API/Socket.IO v2, có REST fallback, trạng thái đã lưu/đã xem và badge chưa đọc.
- Ảnh/PDF tối đa 5 MB (ảnh tối đa 2 MB), quét ClamAV; MongoDB chỉ lưu metadata/object key, tệp lưu S3 hoặc thư mục riêng trong dev. URL đọc có hạn 5 phút. Message retention mặc định 365 ngày; bot session 24 giờ; có báo cáo lạm dụng và outbox `ChatMessageSent.v1` cho webhook Notification tùy cấu hình.
- Bot trả lời FAQ và dữ liệu Catalog có nguồn; đơn cá nhân chỉ đọc trạng thái qua Order API nội bộ sau khi Identity xác thực chủ đơn. Claude Haiku qua proxy là tùy chọn cho câu hỏi tư vấn, có giới hạn lượt gọi và fallback xác định; không dùng AI để xác nhận thanh toán/refund. Xem [cấu hình Claude chatbot](docs/claude-chatbot.md) và [Chat OpenAPI](docs/api/chat.openapi.yaml).
- **Chưa nghiệm thu:** upload với ClamAV/S3 thật, FE trên trình duyệt và webhook Chat → Notification chạy trên MongoDB production. `npm run chat:test` đạt 33/33 bài khi `CHAT_TEST_MONGO_URL` trỏ tới database `_test`; phiên bot guest, lịch sử và xóa phiên cũng đã được thử qua HTTP với MongoDB local. Compose có xác thực MongoDB; trước production cần thay mật khẩu dev và dùng rate limit chung nếu chạy nhiều instance. Chat/Mongo tắt không ảnh hưởng checkout/Order: hai bài HTTP `cart-checkout` và `order-lifecycle` vẫn đạt khi Chat Service không chạy.

### P1 Notification (đã qua test PostgreSQL, HTTP và socket; chưa thử provider live)

- Engagement lưu inbox theo người nhận với cursor, lọc loại/chưa đọc, unread count, đọc một/nhiều/tất cả, xóa và thời hạn lưu 180 ngày. FE `/notifications` và badge nhận `notification:new` qua socket room của chính user; khi offline, thông báo vẫn ở PostgreSQL.
- Order/Payment dùng kênh outbox riêng sang Notification, không dùng trạng thái publish dành cho service khác. Chat gửi `ChatMessageSent.v1` không kèm nội dung tin. Consumer kiểm tra ngữ cảnh đơn, member shop qua Catalog, unique `(source,event_id,recipient,template)`; template text và deep link được tạo từ ID hợp lệ. Seller chỉ nhận sự kiện shop mình có quyền.
- Email giao dịch chạy job SMTP riêng với tối đa 5 lần thử, backoff, trạng thái `DEAD` và metrics tổng hợp backlog từ Order/Payment/Chat; lỗi gửi không rollback checkout. Identity tiếp tục gửi email xác minh/đặt lại mật khẩu qua hàng đợi riêng. Tiếp thị lấy `marketingOptIn` từ Identity, kênh chat/seller tùy chọn; email giao dịch thiết yếu không tắt trong UI. [Notification OpenAPI](docs/api/notification.openapi.yaml) mô tả REST, webhook và socket.
- **Chưa nghiệm thu:** SMTP provider live, Chat outbox với MongoDB thật và thao tác FE trên trình duyệt. Test HTTP Order ba shop vẫn đặt đơn thành công khi Mailpit không chạy; seller không nhận thông báo của shop khác. Test Return xác nhận seller nhận cảnh báo trả hàng; preferences marketing được đồng bộ Identity qua HTTP.

## Chức năng có mã nguồn FE–BE v2 (mức kiểm chứng ghi theo từng dòng)

| Chức năng | Trên FE | API trên BE | Trạng thái hiện tại |
| --- | --- | --- | --- |
| Đăng ký | `/register` | `POST /api/v2/auth/register` | Tạo Buyer, chuẩn hóa email, kiểm tra trùng, băm mật khẩu. Xác minh email đang tắt; FE tự đăng nhập sau khi đăng ký thành công. Nếu tự đăng nhập lỗi, FE chuyển tới trang đăng nhập và tài khoản vẫn đã được tạo. |
| Đăng nhập | `/login` | `POST /api/v2/auth/login` | Kiểm tra mật khẩu/trạng thái; FE nhận access token trong bộ nhớ, refresh token nằm trong cookie HttpOnly. |
| Khôi phục và xem phiên | Header khi tải lại trang | `POST /api/v2/auth/refresh`, `GET /api/v2/auth/me` | FE dùng refresh cookie để lấy access token mới và hiển thị người dùng đang đăng nhập trên Header. |
| Đăng xuất thiết bị hiện tại | Menu tài khoản | `POST /api/v2/auth/logout` | Thu hồi phiên hiện tại và xóa cookie. |
| Đăng xuất tất cả thiết bị | Menu tài khoản | `POST /api/v2/auth/logout` với `allDevices: true` | Thu hồi toàn bộ phiên của tài khoản. |
| Quên mật khẩu | `/forgot-password` | `POST /api/v2/auth/forgot-password` | Phản hồi giống nhau dù email có tồn tại hay không; mã OTP 6 chữ số được đưa vào hàng đợi email. |
| Đặt lại mật khẩu | `/reset-password` nhập mã từ email | `POST /api/v2/auth/reset-password` | Mã OTP có hạn 10 phút, chỉ dùng một lần, tối đa 5 lần nhập sai; đổi mật khẩu xong thu hồi các phiên cũ. |
| Xem và sửa hồ sơ | `/profile` | `GET`, `PATCH /api/v2/users/me` | Trả hồ sơ an toàn, che số tài khoản; sửa tên hiển thị bằng danh tính từ access token. |
| Upload avatar | `/profile` | `POST /api/v2/users/me/avatar` | FE gửi ảnh JPEG/PNG/WebP; BE giới hạn 2 MB, kiểm tra ảnh thực, quét ClamAV, resize rồi lưu object key vào DB. Dev dùng thư mục riêng khi MinIO không khả dụng; production cần S3 và ClamAV. |
| Thêm/đổi số điện thoại tài khoản | `/profile` | `POST /api/v2/users/me/phone/challenge`, `POST /api/v2/users/me/phone/verify` | FE nhập số và OTP 6 chữ số gửi tới email tài khoản; BE giới hạn gửi/thử và lưu số sau khi xác nhận. Email OTP không xác minh quyền sở hữu số. |
| Cài đặt tiếp thị | `/profile` | `PATCH /api/v2/users/me/preferences` | Người dùng bật/tắt nhận thông báo tiếp thị. |
| Sổ địa chỉ | `/profile` | `/api/v2/users/me/addresses` | Thêm, xem, sửa, xóa mềm; danh sách che số người nhận, chi tiết chỉ chủ tài khoản xem. |
| Địa chỉ mặc định | `/profile` | `PUT /api/v2/users/me/addresses/{id}/default` | Đổi mặc định trong transaction; DB có unique index để chặn hai địa chỉ mặc định. |
| Đăng ký / quản lý shop | `/mystore` | `/api/v2/seller/stores` | Tạo shop active theo chính sách auto-activate cho tài khoản đăng nhập; owner sửa thông tin, trạng thái nhận đơn và nhân sự. |
| Xem / tìm shop | `/store`, `/store/:slug` | `GET /api/v2/stores`, `GET /api/v2/stores/:slug` | Chỉ shop active xuất hiện công khai; tìm kiếm và phân trang bằng dữ liệu thật. |
| Xem / điều chỉnh tồn SKU | `/mystore/products/:id` | `GET /api/v2/seller/variants/:id/inventory`, `POST /api/v2/seller/variants/:id/inventory-adjustments` | FE hiện on-hand, reserved, available và lịch sử có lý do, actor. |
| Giữ / xuất / trả hàng | `/checkout` | `/api/v2/inventory/reservations` và các route commit/release | Order Service giữ và xác nhận tồn khi chốt đơn COD; API nội bộ có TTL, row lock và idempotency. |
| Giỏ hàng và checkout COD | `/cart`, `/checkout`, trang chi tiết sản phẩm | `/api/v2/cart`, `/api/v2/checkout/preview`, `/api/v2/checkout/place-order` | Giỏ theo buyer/SKU, tách shop, báo lỗi từng dòng, báo giá VND trên server, snapshot địa chỉ và chốt đơn idempotent. |
| Vòng đời đơn hàng | `/orders`, `/orders/:groupId`, `/mystore/:storeId/orders` | `/api/v2/orders`, `/api/v2/seller/orders/:id` | Một group cho mỗi checkout, shop order riêng, lịch sử/snapshot, seller xác nhận và chuẩn bị, hủy theo shop, giao hàng qua sự kiện nội bộ đã xác thực. |
| Thanh toán COD/online | `/checkout`, `/payments/return`, chi tiết đơn | `/api/v2/payments/methods`, `/payments/intents`, `/orders/:id/payments` | COD chưa thu cho tới khi có xác nhận thu hộ; MoMo/VietQR chỉ xuất hiện khi provider đã cấu hình, webhook/đối soát mới xác nhận PAID. |
| Voucher và Flash Sale | `/voucher`, `/flash-sales`, `/checkout`, `/mystore` | `/api/v2/promotions/active`, `/flash-sales`, `/promotions/vouchers/validate` | Seller tạo chương trình cho shop, backend tính giá/quota và phân bổ giảm giá; Order reserve/commit/release usage. |
| Review sau mua | Chi tiết sản phẩm, chi tiết đơn buyer/seller | `/api/v2/reviews`, `/products/:id/reviews`, `/seller/reviews/:id/reply` | Có API v2, rating projection, test DB/HTTP đạt; chưa thử thao tác FE trên trình duyệt. |
| Trả hàng/hoàn tiền | Chi tiết đơn buyer/seller | `/api/v2/orders/:id/returns`, `/returns/:id`, `/seller/returns/:id/*` | Có API v2, kiểm tra số lượng/tiền và refund VietQR qua settlement giả lập; COD chờ xử lý riêng. |
| Nhắn tin và chatbot | `/messages`, trang shop, widget bot | `/api/v2/conversations`, `/chatbot/sessions`, Socket.IO `chat:*` | FE đã nối Chat v2; test quyền room, idempotency, cursor và bot đạt trên fake repository; chờ nghiệm thu MongoDB thật. |
| Inbox thông báo | `/notifications`, badge Header | `/api/v2/notifications`, `/notifications/preferences`, Socket.IO `notification:new` | FE đã nối Notification v2; test DB, HTTP, socket và Order event đạt; email live chưa thử. |

Các trang xác thực FE nằm trong [`AuthPages.tsx`](../Frontend/src/pages/AuthV2/AuthPages.tsx). [OpenAPI Auth](docs/api/identity.openapi.yaml) mô tả contract tương ứng.

Trang hồ sơ nằm trong [`ProfileV2.tsx`](../Frontend/src/pages/ProfileV2/ProfileV2.tsx); [OpenAPI Profile](docs/api/profile.openapi.yaml) mô tả các API riêng. Upload avatar trong dev dùng thư mục `.local-avatars/` khi MinIO không khả dụng, nhưng vẫn cần ClamAV; production cần S3 và ClamAV. Trong chế độ dev, OTP số điện thoại được gửi vào Mailpit để **mô phỏng**; đây không phải xác minh quyền sở hữu số thật.

### Store & Seller

[OpenAPI Store](docs/api/store.openapi.yaml) mô tả API ở `http://localhost:5102/api/v2`. Catalog Service dùng schema `catalog` trong PostgreSQL; môi trường dev hiện dùng chung instance với Identity nhưng tách schema. `npm run dev` chạy migration và khởi động Identity, Catalog, Order, Payment, Engagement; Chat khởi động nếu MongoDB khả dụng. `CATALOG_SYNC_SECRET` bảo vệ API nội bộ đồng bộ membership; không đưa secret này lên frontend. Owner mời staff bằng mã một lần có hạn 7 ngày, staff chỉ nhận lời mời khi email đăng nhập khớp.

Shop được kích hoạt ngay khi tài khoản đã đăng nhập vì xác minh email đang tắt trong dev. Shop tạm ngừng không xuất hiện trên API public. Số đơn cần xử lý và doanh thu seller dashboard vẫn trả `null` với `sourceStatus: orders_unavailable` cho tới khi tích hợp aggregate Order. Checkout v2 kiểm tra trạng thái shop trước và sau khi giữ hàng, Inventory chặn reserve cho shop ngừng nhận đơn. Logo/bìa shop hiện nhận URL HTTPS, chưa có upload media riêng.

### Catalog sản phẩm

[OpenAPI Catalog](docs/api/catalog.openapi.yaml) mô tả category cha–con, sản phẩm, SKU, media, danh sách/search và trang chủ tại `http://localhost:5102/api/v2`. Sản phẩm seller có draft, active, hidden và discontinued; không xóa cứng. API public lọc trạng thái shop/sản phẩm ở server. Giá VND dùng số nguyên; giá giảm và thời gian áp dụng được tính ở server theo từng SKU. Ảnh tải lên được quét ClamAV, chuyển WebP và lưu object key ở S3; dev dùng `.local-catalog-images/` khi MinIO không khả dụng.

`npm run catalog:seed` nhập dữ liệu từ `Frontend/src/mocks/catalogData.ts` vào dev/test theo `seed_key` nên chạy lặp không nhân bản. `npm run catalog:seed:reset` chỉ xóa các bản ghi đã seed và từ chối nếu còn reservation của sản phẩm demo. Hai lệnh từ chối production và không được chạy tự động khi khởi động service. Chế độ API trên frontend hiển thị danh sách rỗng thật thay vì tự dùng mock.

Rating và review count lấy từ projection của review đã xuất bản; khi chưa có review, rating là `null` và count bằng 0. Sold count và best sellers vẫn chưa có nguồn aggregate. Cart/Checkout v2 hỏi giá Catalog trực tiếp lúc mở giỏ, preview và chốt đơn; chưa dùng event `ProductPriceChanged.v1`.

### Inventory theo SKU

[OpenAPI Inventory](docs/api/inventory.openapi.yaml) và [thiết kế dữ liệu](docs/database/inventory.md) mô tả `on_hand`, `reserved`, `available`, reservation TTL và lịch sử điều chỉnh. Seller xem/điều chỉnh tồn trong trang quản lý sản phẩm; mọi điều chỉnh cần lý do và ghi actor. Order Service v2 có các API nội bộ kiểm tra, reserve, commit và release, được bảo vệ bằng `INVENTORY_INTERNAL_TOKEN` tách riêng khỏi secret đồng bộ Catalog–Identity. Catalog chạy job hết hạn/đối soát mỗi 30 giây. Sự kiện tồn kho được ghi vào outbox; có thể cấu hình webhook với retry và `X-Event-Id` để chuyển cho service nhận.

Kiểm thử PostgreSQL và HTTP đã chạy 100 yêu cầu reserve đồng thời trên SKU tồn 5, xác nhận chỉ 5 đơn vị được giữ. Retry cùng idempotency key, commit/release lặp, hết hạn, điều chỉnh âm và lịch sử actor cũng đã được kiểm tra. Order Service v2 gọi reserve/commit/release trong luồng COD; worker thử lại commit nếu dịch vụ tồn kho tạm lỗi.

### Giỏ hàng và checkout COD

[OpenAPI Order](docs/api/order.openapi.yaml) mô tả Cart/Checkout tại `http://localhost:5103/api/v2`. Giỏ chỉ lưu trên server sau đăng nhập; sản phẩm thêm trước đăng nhập không được lưu trong browser. API `POST /cart/merge` dành cho client có giỏ khách explicit, nhưng UI hiện yêu cầu đăng nhập trước khi thêm. Giá và tồn được hỏi lại từ Catalog khi đọc giỏ, preview và đặt đơn. Dòng SKU hết hàng/ngừng bán giữ trong giỏ và trả lỗi riêng.

Preview có hạn 5 phút, không giữ tồn. COD luôn được bật; MoMo/VietQR chỉ được bật khi Order và Payment cùng có cấu hình provider. Checkout nhận tối đa một mã voucher, được Promotion kiểm tra ở preview và lúc tạo đơn. Phí ship tạm tính cố định 30.000 VND mỗi shop, được đánh dấu là **ước tính** vì chưa tích hợp Delivery Service. Địa chỉ nhận hàng phải thuộc buyer và được sao chụp khi tạo đơn. Chốt đơn tách theo shop, dùng idempotency key và chỉ xóa các dòng đã chọn. Inventory commit toàn bộ SKU của checkout trong một transaction. Outbox `OrderCreated.v1` chỉ được ghi sau khi Inventory commit thành công; worker thử lại những đơn đang `PENDING_INVENTORY` mỗi 10 giây, hủy đơn và đưa sản phẩm trở lại giỏ nếu reservation hết hạn. Outbox có webhook publisher tùy chọn với retry và `X-Event-Id`; chưa nối Kafka trực tiếp.

Test HTTP `tests/e2e/cart-checkout.http.test.js` bao phủ hai shop, tổng tiền server, địa chỉ thiếu, SKU ngừng bán, đặt đơn song song cùng key, giữ dòng không chọn và hoàn giỏ khi reservation hết hạn. Chạy với `ORDER_TEST_DATABASE_URL`, `IDENTITY_TEST_API_URL`, `CATALOG_TEST_API_URL`, `ORDER_TEST_API_URL` trỏ tới các service và database test đã migrate.

### Vòng đời Order

Checkout COD tạo một `order_groups` và một `orders` (shop order) cho mỗi shop. Mỗi dòng giữ snapshot SKU, tên, biến thể, giá gốc, đơn giá thực trả, giảm giá và ảnh; mỗi shop order giữ tên shop, địa chỉ người nhận và breakdown VND. `subtotal_minor` là tổng giá gốc; `discount_minor` là giảm giá sản phẩm, `payable_total_minor = subtotal_minor - discount_minor + shipping_estimate_minor`. Giá trị `grand_total_minor` là tổng cần trả lúc mua, còn `current_total_minor` và `cancelled_total_minor` phản ánh hủy từng shop.

Sau khi tồn kho được commit, shop order COD ở `PLACED`, còn online ở `PENDING_PAYMENT` tới khi Payment Service phát kết quả đã kiểm chứng. Seller thuộc đúng shop được chuyển `PLACED → CONFIRMED → PREPARING → READY_TO_SHIP`; không có API seller tự đánh dấu đã giao. Buyer được hủy shop order khi còn `PLACED`; seller được từ chối `PLACED/CONFIRMED` với lý do cho phép. Lệnh hủy đi qua `CANCEL_PENDING`, hoàn tồn idempotent rồi chuyển `CANCELLED`; worker retry nếu Catalog tạm lỗi. COD không có refund/voucher. Sự kiện Delivery có `X-Delivery-Token` chuyển `READY_TO_SHIP → SHIPPING → DELIVERED` và Inbox chặn event trùng. Buyer xác nhận đã nhận hàng để chuyển `DELIVERED → COMPLETED`.

Mọi chuyển trạng thái kiểm tra `expectedVersion`, idempotency key và membership; lịch sử ghi actor, trạng thái cũ/mới, lý do và correlation ID. `ShopOrderConfirmed.v1`, `OrderCancelled.v1`, `OrderReadyForShipment.v1` và các sự kiện khác được ghi vào transactional outbox. `ORDER_EVENT_WEBHOOK_URL` phát đến adapter tùy chọn; kênh Notification dùng `ORDER_NOTIFICATION_WEBHOOK_URL` riêng. Receiver dedup `X-Event-Id`. Chưa nối Kafka hay Delivery Service thực tế; endpoint Delivery hiện là điểm tích hợp có xác thực. Payment Service dùng `ORDER_PAYMENT_TOKEN` riêng để đọc tổng tiền và gửi kết quả đã xác thực; Order giữ Inbox để chặn event trùng. [OpenAPI Order](docs/api/order.openapi.yaml) mô tả contract; `tests/e2e/order-lifecycle.http.test.js` nghiệm thu ba shop, quyền seller, state machine, hủy/hoàn tồn, dedup Delivery và snapshot.

### Payment & Wallet

[OpenAPI Payment](docs/api/payment.openapi.yaml) mô tả API trên `http://localhost:5104/api/v2`. COD luôn khả dụng; Payment Service trả `UNPAID` cho group COD cho tới khi adapter giao hàng/đối soát gửi `POST /internal/cod-collections` với token nội bộ và đúng shop order đã giao, amount, event ID. Gửi trùng không ghi thêm tiền. Trang checkout đọc phương thức từ Payment Service; trang trở về provider chỉ đọc trạng thái server, không tin query redirect.

MoMo chỉ xuất hiện khi có `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`, IPN URL và redirect URL; Order cũng cần `ORDER_ONLINE_METHODS=MOMO`. Adapter dùng [MoMo One-Time Payments](https://developers.momo.vn/v3/docs/payment/api/wallet/onetime/) để ký request `captureWallet`, kiểm chữ ký IPN và đối chiếu partner/order/request/amount; [API tra cứu](https://developers.momo.vn/v3/docs/payment/api/payment-api/query/) xử lý mất webhook. Mã QR hoặc checkout URL chỉ tạo intent `PENDING`, không đổi đơn thành đã trả tiền.

VietQR chỉ xuất hiện khi có client ID/API key và secure-token webhook từ [VietQR Payment Kit](https://www.vietqr.io/paymentRequests/), đồng thời bật `ORDER_ONLINE_METHODS=VIETQR`. Render link/QR không xác nhận tiền. Webhook hợp lệ phải khớp order code, số tiền, nội dung và reference; khi không có webhook trước hạn, intent chuyển `EXPIRED` với `review_required=true` và báo cáo đối soát thủ công. Do contract đang dùng không cung cấp API truy vấn giao dịch tự động, môi trường vận hành cần quy trình đối soát ngân hàng trước khi bật VietQR production.

Hoàn tiền chỉ nhận từ API nội bộ, kiểm tra tổng các khoản đang xử lý/đã hoàn không vượt số đã thu của từng shop. Job Payment đọc shop order online đã hủy còn tiền chưa hoàn qua Order API nội bộ và tự tạo refund idempotent; đây cũng là bước bù khi sự kiện hủy bị mất. MoMo dùng [API hoàn tiền và tra cứu](https://developers.momo.vn/v3/docs/payment/api/payment-api/refund/); VietQR giữ `PENDING` cho tới khi adapter ngân hàng xác nhận settlement tin cậy bằng `PAYMENT_SETTLEMENT_TOKEN` riêng, không dùng token nội bộ chung. Outbox Payment gửi `PaymentSucceeded.v1`, `PaymentFailed.v1`, `PaymentExpired.v1`, `CODCollected.v1`, `RefundSucceeded.v1` tới Order; Order dùng Inbox idempotent. Payload webhook chỉ lưu digest, kết quả kiểm chữ ký và provider transaction ID, không lưu dữ liệu thẻ/CVV. Báo cáo `GET /internal/reconciliation` liệt kê pending lâu, backlog event và sai lệch cần xử lý.

Ví nội bộ **chưa triển khai**: route `/wallet` có giao diện theo dõi đơn hàng và hoàn tiền thật nhưng không hiển thị số dư giả; nạp/rút/chuyển tiền bị vô hiệu hóa. Chưa có ledger hoặc số dư tiền thật. Các API MoMo/VietQR đã được nghiệm thu bằng provider giả lập có chữ ký/token; chưa nghiệm thu tài khoản merchant live hay luồng hoàn tiền ngân hàng production.

### Voucher và Flash Sale

[OpenAPI Promotion](docs/api/promotion.openapi.yaml) mô tả module Engagement tại `http://localhost:5105/api/v2`. Seller thành viên shop tạo voucher do **shop tài trợ** trong trang quản lý. Quản trị nội bộ có thể tạo voucher shop hoặc voucher sàn qua API được bảo vệ bằng `PROMOTION_ADMIN_TOKEN` riêng; token này để trống sẽ vô hiệu hóa hai API quản trị. Voucher hỗ trợ giảm cố định hoặc % theo basis point, trần giảm, đơn tối thiểu, SKU/danh mục/shop, mọi buyer hoặc đơn đầu tiên, tổng quota và giới hạn theo user. `FIRST_ORDER` nghĩa là buyer chưa từng tạo `order_group`, kể cả group sau đó bị hủy. Mỗi checkout dùng tối đa **một voucher shop và một voucher sàn**. Giá Catalog/Flash Sale được áp trước, tiếp theo là voucher shop rồi voucher sàn trên phần còn lại. Tổng giảm được phân bổ theo số nguyên VND và không làm tiền sản phẩm âm.

Đặt `PROMOTION_ADMIN_TOKEN` bằng bí mật riêng trong môi trường của Engagement Service để bật `POST /api/v2/internal/promotions/platform-vouchers` và `POST /api/v2/internal/promotions/stores/{storeId}/vouchers`. Gửi token trong header `X-Promotion-Admin-Token` từ công cụ quản trị phía server, không đặt trong biến `VITE_*` hay mã frontend. Voucher sàn chỉ có phạm vi toàn sàn; voucher shop dùng đúng `storeId` đã kiểm tra tại Catalog. Trang `/voucher` hiển thị voucher sàn, tab Voucher trên `/store/{slug}` hiển thị voucher của shop.

Preview không giữ lượt; Order kiểm tra lại và reserve voucher/Flash Sale bằng `PROMOTION_INTERNAL_TOKEN` khi đặt đơn. Engagement dùng row lock để chống vượt quota; Order commit sau khi lưu đơn, release nếu checkout thất bại. Hủy shop order trả lượt đã dùng đúng một lần; job Engagement kiểm tra đơn hủy để bù khi lời gọi trực tiếp lỗi. Flash Sale dùng `starts_at/ends_at` và quota từ server; API public trả `serverTime`, frontend dùng đồng hồ monotonic để hiển thị countdown. `order_service.order_discounts` lưu từng nguồn `CATALOG_SALE`, `FLASH_SALE`, `VOUCHER`; refund dựa trên tổng tiền đã giảm của shop.
Khi hủy một shop order, lượt voucher shop được trả lại. Voucher sàn chỉ được trả lượt khi toàn bộ nhóm đơn đã hủy; Order gọi endpoint release riêng và có thể gọi lại an toàn. Job Engagement quét các voucher sàn đã dùng để bù nếu lời gọi release trực tiếp thất bại. Mỗi phần giảm shop/sàn được ghi thành bản ghi `VOUCHER` riêng với nguồn tài trợ tương ứng.

Nếu Engagement tạm lỗi và checkout **không** dùng voucher, Order có thể báo giá Catalog với `promotionUnavailable=true`; checkout đã thấy ưu đãi sẽ bị yêu cầu tính lại khi giá/quota thay đổi. Nếu có mã voucher, lỗi Promotion chặn checkout. Test HTTP `tests/e2e/promotion.http.test.js` bao phủ mã hết hạn/min spend/sai shop, giới hạn user và đơn đầu tiên, tranh quota voucher/Flash, thời gian server, quyền seller, phân bổ % trên nhiều dòng, snapshot discount, trả quota khi hủy và job bù khi lời gọi release bị mất.

### Trạng thái yêu cầu User & Profile

| Mã | Trạng thái | Ghi chú |
| --- | --- | --- |
| USER-01 — Xem hồ sơ | Đã nối FE–BE | Trả userId, tên, avatar URL có hạn, email, số điện thoại đã che, trạng thái và mức xác thực; không trả hash/token. |
| USER-02 — Sửa hồ sơ | Đã nối FE–BE | Sửa tên hiển thị của chính mình; avatar đi qua API upload riêng. |
| USER-03 — Thêm/đổi số điện thoại | OTP gửi tới email tài khoản qua SMTP/Resend; adapter SMS webhook vẫn có thể cấu hình sau | OTP có TTL, giới hạn thử/gửi và không log số đầy đủ. Email OTP xác nhận thao tác thêm số, không xác minh quyền sở hữu số điện thoại; `phoneEmailConfirmed` và `phoneVerified` là hai trạng thái riêng. |
| USER-04 — Upload avatar | Hoàn thành API/UI; ClamAV local và giao thức S3 đã kiểm thử | Chỉ lưu object key trong PostgreSQL; scanner/storage lỗi thì từ chối hoặc dọn object mới. MinIO image chưa tải được tại máy này và S3 production chưa nghiệm thu. |
| USER-05 — Sổ địa chỉ | Đã nối FE–BE | Thêm, liệt kê, xem chi tiết, sửa, xóa mềm; số người nhận ở danh sách được che. |
| USER-06 — Địa chỉ mặc định | Đã nối FE–BE | Transaction khóa theo user và unique index đảm bảo tối đa một mặc định, kể cả request đồng thời. |
| USER-07 — Snapshot giao hàng | Đã lưu trong đơn COD | Order Service kiểm tra address ID thuộc buyer qua Identity rồi lưu bản sao thông tin người nhận/địa chỉ vào mỗi đơn. |
| USER-08 — Riêng tư | Đã nối tùy chọn tiếp thị, tải dữ liệu Identity và yêu cầu xóa có xác nhận mật khẩu | Yêu cầu xóa được xử lý thủ công sau khi xem xét Order/Catalog/Payment/Chat/Engagement; xem [quy trình vận hành](docs/operations/privacy.md). Chưa tự động xóa dữ liệu liên service. |

### Xác minh email và Resend

Xác minh email là bắt buộc; cấu hình `REQUIRE_EMAIL_VERIFICATION=false` sẽ khiến Identity Service từ chối khởi động. Tài khoản mới phải xác minh email trước khi đăng nhập hoặc tạo shop. Email xác minh và đặt lại mật khẩu được đưa vào hàng đợi Identity rồi gửi qua SMTP; cấu hình Resend dùng `smtp.resend.com:465`, `SMTP_SECURE=true`, `SMTP_USER=resend`, `SMTP_PASSWORD` là API key và `MAIL_FROM=no-reply@mduc247.site`. Đặt API key trong file môi trường không được commit hoặc secret của môi trường triển khai. Domain `mduc247.site` phải được xác minh trên Resend trước khi gửi thật. Các tài khoản thử nghiệm cũ đã được xóa khỏi Identity DB dev ngày 21/10/2026.

Quên mật khẩu gửi mã OTP 6 chữ số từ `no-reply@mduc247.site` thay cho liên kết chứa token. Người dùng nhập email, mã và mật khẩu mới trên `/reset-password`; mã hết hạn sau 10 phút, tối đa 5 lần nhập sai và mã cũ mất hiệu lực khi gửi lại. Mã trong database là HMAC theo email với khóa riêng; email chờ gửi được mã hóa trong outbox. Việc gửi SMS không liên quan tới luồng quên mật khẩu này.

Mật khẩu khi đăng ký hoặc đặt lại cần dài 8–128 ký tự, có ít nhất một chữ thường và một ký tự đặc biệt (dấu câu hoặc ký hiệu); xác nhận mật khẩu phải khớp. Người dùng đã nghiệm thu luồng đăng ký và HTTP 429 sau chuỗi đăng nhập sai trên bản thử.

## Có trên BE nhưng chưa nối FE thành nghiệp vụ hoàn chỉnh

- Catalog Service ghi sự kiện tạo shop và thay đổi thành viên vào outbox; worker đồng bộ vai trò seller và `store_memberships` vào Identity qua API nội bộ có secret. API seller kiểm tra membership của từng shop ở mỗi request.
- Identity ghi `UserRegistered.v1`, `UserEmailVerified.v1` và cảnh báo refresh-token reuse vào outbox; worker chuyển qua webhook nội bộ có retry đến Notification để hiển thị trong inbox. Local chưa dùng Kafka.
- API gateway và các module Engagement ngoài Promotion/Reviews chưa triển khai v2. Trang chủ, danh mục, danh sách/tìm kiếm, chi tiết sản phẩm, StoreList, StorePage và MyStore dùng Catalog Service thật; Cart/Checkout dùng Order Service v2, Promotion và các phương thức đã cấu hình trong Payment Service.
- `/profile` hiện dùng trang Profile v2 cho hồ sơ và địa chỉ; các tab đơn hàng/yêu thích của trang Profile cũ chưa được chuyển sang API v2.
- Order Service lưu bản sao địa chỉ giao hàng trong `order_service.orders.shipping_address_json`; buyer xem lại tại `/orders/:groupId`.
- OTP thêm/đổi số gửi tới email tài khoản khi `PHONE_OTP_MODE=email` (mặc định), dùng cấu hình SMTP/Resend hiện có và `MAIL_FROM=no-reply@mduc247.site`. SMS là tùy chọn nếu sau này cần xác minh quyền sở hữu số. Avatar production yêu cầu S3-compatible storage và ClamAV khi khởi động. ClamAV local, upload HTTP và adapter S3 qua máy chủ thử nghiệm đã đạt; image MinIO từ registry đang trả lỗi truy cập nên chưa thử MinIO/production.
- Quy trình Admin không nằm trong Identity Service này.

## Chạy Backend trong Docker khi phát triển

[`compose.dev.yaml`](compose.dev.yaml) mở rộng Compose gốc và file cổng local. Sáu service Node dùng chung một image development có `nodemon` đã nằm trong devDependencies. Thư mục `services` và `packages` được bind mount chỉ đọc; `node_modules` Linux ở trong image và không bị mount đè. Nodemon polling mỗi giây để nhận thay đổi từ VSCode trên Windows/Docker Desktop. File JS của service chỉ restart process trong container tương ứng; file dùng chung chỉ restart các service import nó. `apps/api-gateway` hiện không có source và không nằm trong sáu service Compose, nên không có TypeScript runtime cần watch ở stack này.

Nếu PowerShell đang ở `D:\WebMduc247`, chạy cả khối sau (dòng đầu chuyển vào `Backend`, nơi có `package.json`, Compose và `.env.development.local`):

```powershell
Set-Location .\Backend
npm run dev -- --check
docker compose -p backend-v2-dev --env-file .env.development.local -f docker-compose.yml -f docker-compose.dev.yml -f compose.dev.yaml --profile dev build identity-service
docker compose -p backend-v2-dev --env-file .env.development.local -f docker-compose.yml -f docker-compose.dev.yml -f compose.dev.yaml --profile dev up -d --no-build identity-mail identity-scanner identity-service catalog-service order-service payment-service engagement-service chat-service
```

Lệnh `build identity-service` tạo image dùng chung cho sáu service; các lần sửa `.js` hoặc module `packages/contracts` sau đó **không cần build lại**. Dùng `docker compose -p backend-v2-dev --env-file .env.development.local -f docker-compose.yml -f docker-compose.dev.yml -f compose.dev.yaml logs -f --tail=100 payment-service` để xem log một service (thay `payment-service` bằng tên khác). `docker compose -p backend-v2-dev --env-file .env.development.local -f docker-compose.yml -f docker-compose.dev.yml -f compose.dev.yaml --profile dev stop` dừng stack và giữ volumes.

Migration của từng service chạy **một lần khi container khởi động**, không chạy lại khi nodemon reload do lưu source. Sau khi thêm migration SQL, chủ động chạy `docker compose -p backend-v2-dev --env-file .env.development.local -f docker-compose.yml -f docker-compose.dev.yml -f compose.dev.yaml restart identity-service` (thay bằng service có migration). Seed không được chạy tự động. Khi sửa `package.json`, `package-lock.json`, `Dockerfile.dev` hoặc đổi dependencies native/phiên bản Node, build lại image development rồi tạo lại các container Node để nhận dependencies mới. Thay đổi `scripts/docker-dev.mjs` chỉ cần restart service.

Development mặc định dùng vùng file local cho ảnh khi MinIO chưa chạy; ba thư mục `.local-avatars`, `.local-catalog-images` và `.local-chat-files` được bind mount riêng để giữ file qua lần tạo lại container. Nếu registry cho phép tải MinIO, khởi động `identity-objects`, đặt `DEV_S3_BUCKET=identity-avatars` trong `.env.development.local`, rồi tạo lại Identity/Catalog/Chat để dùng S3. Catalog trong overlay dùng cùng PostgreSQL dev qua hostname `identity-db`; URL trên host `127.0.0.1:56434` không thể dùng bên trong container. Database credentials và volumes không đổi.

Production vẫn dùng image và lệnh gốc, không có bind mount hay nodemon: sau khi cung cấp đầy đủ secret trong `.env` production, chạy `docker compose --env-file .env -f docker-compose.yml up -d --build`. Không đưa `compose.dev.yaml` vào lệnh production.

## Chạy thử trên máy

1. Bật Docker Desktop ở chế độ Linux containers.
2. Từ `Backend`, chạy `npm install` (lần đầu) rồi `npm run dev`. Lệnh tạo `.env.development.local` được Git bỏ qua, khởi động PostgreSQL và Mailpit nếu SMTP host là `identity-mail`, rồi thử khởi động MinIO/ClamAV riêng cho dev. Muốn dùng Resend, đặt cả `SMTP_HOST` và `SMTP_HOST_DOCKER` thành `smtp.resend.com`, cả hai cổng thành `465`, `SMTP_SECURE=true`, `SMTP_USER=resend`, `SMTP_PASSWORD` bằng API key và `MAIL_FROM=no-reply@mduc247.site`. Nodemon áp dụng migration còn thiếu trước khi mở API và khởi động lại khi sửa `src` hoặc thêm migration SQL. Nếu MinIO không khả dụng, avatar được lưu riêng trong `.local-avatars/`; ClamAV vẫn phải chạy để quét ảnh.
3. Từ `Frontend`, chạy `npm install` (lần đầu) rồi `npm run dev`. FE mặc định ở `http://localhost:5173`, Identity ở `5101`, Catalog ở `5102`, Order ở `5103`, Payment ở `5104`, Engagement ở `5105` và Chat ở `5106`; MongoDB dev ở `127.0.0.1:27018`. Có thể đổi URL qua các biến `VITE_*_API_URL`, trong đó Chat dùng `VITE_CHAT_API_URL`.
4. Khi dùng Mailpit, email và mã OTP **mô phỏng** xem tại `http://localhost:8025`; khi dùng Resend, email được gửi tới hộp thư thật của người nhận. MinIO Console ở `http://localhost:9003`; S3 API local ở cổng `9002`, ClamAV local ở cổng `3311`.

`npm run dev:stop` dừng các container dev nhưng **giữ dữ liệu** PostgreSQL và MongoDB trong Docker volume. Nếu đã tự vận hành PostgreSQL/SMTP, điền [`.env.example`](.env.example) vào `.env` và dùng `npm run dev:identity` để chạy nodemon mà không khởi động Docker.

Nếu API `/api/v2/users/me` từng trả `500` vì thiếu bảng `user_profiles`/`addresses`, hãy dừng phiên nodemon cũ và chạy lại `npm run dev`. Entrypoint dev hiện áp dụng migration còn thiếu trước khi mở API; không cần xóa Docker volume hay đăng ký lại tài khoản. Với cấu hình `.env` tự quản, chạy migration trên đúng database trước khi khởi động service.

## Dữ liệu và kiểm thử

- PostgreSQL database `identity` lưu `users`, `user_profiles`, `user_preferences`, `addresses`, `phone_challenges`, `refresh_sessions`, `security_events` và các bảng liên quan. Avatar chỉ lưu object key trong DB; file nằm ở MinIO/S3 hoặc `.local-avatars/` trong dev. Catalog dùng schema `catalog` trong cùng PostgreSQL dev. Khi dùng `npm run dev`, database nằm trong Docker volume của project `backend-v2-dev`.
- [Thiết kế dữ liệu Profile](docs/database/profile.md) giải thích xóa mềm, OTP, object key và giới hạn của shipping snapshot.
- `npm run identity:test` chạy test nghiệp vụ; test PostgreSQL chạy khi có `IDENTITY_TEST_DATABASE_URL` trỏ tới database kiểm thử đã migrate.
- `npm run identity:test:e2e` chạy test HTTP khi Identity Service đang chạy cùng database kiểm thử. `npm run catalog:test` chạy kiểm thử Store; đặt `CATALOG_TEST_DATABASE_URL` để chạy kiểm thử PostgreSQL. Kiểm thử HTTP Store cần thêm `IDENTITY_TEST_API_URL` và `CATALOG_TEST_API_URL`. Kiểm thử Store trên database dev đã xác nhận quyền shop, slug, tạm ngừng, đồng bộ seller role và luồng HTTP đăng ký shop.

Xem thêm [kiến trúc Identity](docs/architecture/identity.md) và [sự kiện](docs/events/identity.md).
