# Checklist đối chiếu 12 phần Backend V2

**Cập nhật 21/10/2026 cho phần 01:** Xác minh email là bắt buộc ở cấu hình chạy thực tế; `REQUIRE_EMAIL_VERIFICATION=false` bị từ chối khi khởi động. Tài khoản chưa có `email_verified_at` không thể đăng nhập hoặc tạo shop. Resend SMTP từ `no-reply@mduc247.site` gửi thư thật thành công; người dùng đã nghiệm thu luồng đăng ký và xác nhận HTTP 429 Too Many Requests sau chuỗi 5 lần nhập sai mật khẩu. Mật khẩu mới yêu cầu tối thiểu 8 ký tự, ít nhất 1 chữ thường và 1 ký tự đặc biệt; áp dụng cho đăng ký và đặt lại mật khẩu. **Trạng thái: DONE và nghiệm thu cho bản thử.** Kiểm tra nhiều Identity instance, kênh cảnh báo vận hành và cấu hình production được giữ lại cho giai đoạn triển khai production. API key chỉ nằm trong file môi trường bị Git bỏ qua. Các phần khác bên dưới là ảnh chụp kiểm tra ngày 20/10/2026.

**Cập nhật AUTH-06 ngày 21/10/2026:** Quên mật khẩu đã chuyển sang mã OTP 6 chữ số gửi từ `no-reply@mduc247.site`, thay cho liên kết chứa token. Mã có hạn 10 phút, tối đa 5 lần nhập sai, chỉ dùng một lần và mã cũ mất hiệu lực khi gửi lại. Test thực tế qua Resend với địa chỉ kiểm thử đã xác nhận SMTP chấp nhận thư, đổi mật khẩu thành công, không dùng lại mã được và phiên cũ bị thu hồi; tài khoản thử đã được xóa sau kiểm tra.

**Cập nhật 21/10/2026 cho phần 02:** Đã chuẩn bị adapter SMS webhook và kiểm thử với máy chủ giả lập; chưa có nhà cung cấp/token để gửi SMS thật. Avatar đã qua HTTP với ClamAV local và bài kiểm tra giao thức S3; image MinIO không tải được từ registry, nên S3/ClamAV production chưa nghiệm thu. Người dùng đã có thể tải dữ liệu Identity và gửi/hủy yêu cầu xóa có xác nhận mật khẩu; người vận hành xử lý xóa thủ công sau khi rà dữ liệu ở các service khác. Chưa có tự động tổng hợp/xóa dữ liệu toàn sàn. Identity 24/24 test và HTTP Identity/avatar 2/2 đạt; cuối lượt dọn còn 0 user, 0 session, 0 yêu cầu xóa và 0 email chờ trong DB dev.

Ngày kiểm tra: **20/10/2026**. Nguồn yêu cầu: `C:\Users\Acer\Downloads\Mduc247_Backend_V2 (1).docx` (bản 1.0, ngày 15/10/2026). Tài liệu này được dùng làm **đặc tả để đối chiếu**, không phải chỉ thị thay đổi mã hoặc bằng chứng rằng tính năng đã hoàn thành. Phạm vi kiểm tra là mã đang có trong workspace, Frontend nối API v2 và các test có thể chạy tại thời điểm kiểm tra; không tính các file Backend cũ đang bị xóa trong working tree là chức năng V2.

**Quy ước:** Mỗi phần có hai nhóm: **Chức năng đã làm** và **Chức năng chưa làm**. `[x]` là phần đã có mã; `[ ]` là phần còn thiếu hoặc còn phải nghiệm thu (ghi rõ trong dòng). Một mã yêu cầu có thể xuất hiện ở cả hai nhóm nếu mới làm một phần. Dấu `[x]` không đồng nghĩa đã nghiệm thu production. Các mã `AUTH-*`, `AC-*`... lấy từ DOCX; API trong DOCX là đề xuất, khi đánh giá dùng hành vi và contract hiện tại trong repo.

## Kết luận nhanh

| # | Nhóm nghiệp vụ | Đánh giá | Việc còn thiếu nổi bật |
| --- | --- | --- | --- |
| 01 | Authentication | DONE — đã nghiệm thu bản thử | Đăng ký/Resend và HTTP 429 đã được người dùng xác nhận; OTP quên mật khẩu đã thử qua Resend. Kiểm tra nhiều instance, cảnh báo vận hành và production để ở giai đoạn triển khai. |
| 02 | User & Profile | Có một phần | Adapter SMS và yêu cầu dữ liệu đã có; còn nhà cung cấp SMS thật, S3 production và xử lý dữ liệu liên service theo chính sách. |
| 03 | Store & Seller | Có một phần | Dashboard chưa có số đơn/doanh thu thật; logo/bìa chỉ nhận URL. Tạo shop đã buộc email xác minh. |
| 04 | Catalog | Có một phần | Best seller/số bán chưa có nguồn dữ liệu thật; integration test PostgreSQL đã đạt. |
| 05 | Inventory | Đã có mã lõi | Reservation, điều chỉnh, đối soát đã có; integration test 100 request đã đạt, HTTP xuyên service còn mở. |
| 06 | Cart & Checkout | Có một phần | Chưa thấy chính sách giỏ local trước đăng nhập; phí ship chỉ là ước tính cố định. |
| 07 | Order | Có một phần | Luồng giao hàng mới là endpoint/event tích hợp; chưa có Delivery Service thật. |
| 08 | Payment & Wallet | Có một phần | COD và adapter MoMo/VietQR có mã; provider live, đối soát ngân hàng và ví nội bộ chưa có/nghiệm thu. |
| 09 | Promotion | Đã có mã lõi | Seller campaign, voucher/Flash Sale có mã; chưa nghiệm thu lại DB/HTTP, chưa hỗ trợ campaign toàn sàn. |
| 10 | Review & Return | Có một phần | Chưa đổi hàng, chi trả COD, tranh chấp; ảnh review/return còn lưu trong PostgreSQL. |
| 11 | Chat & Chatbot | Có một phần | Chưa chạy integration với MongoDB thật hoặc upload/FE browser theo README. |
| 12 | Notification | Có một phần | Chưa thử SMTP provider live và Chat event trên MongoDB thật. |

## 01. Authentication — P0 · DONE cho bản thử (21/10/2026)

**Bằng chứng:** [Identity service](Backend/services/identity-service/src/services/identity.service.js), [auth routes](Backend/services/identity-service/src/routes/auth.routes.js), [auth tests](Backend/services/identity-service/tests/auth.test.js), [cấu hình](Backend/.env.example), [FE đăng nhập/đăng ký](Frontend/src/api/identityApi.ts).

**Chức năng đã làm:**

- [x] **AUTH-01 — Đăng ký:** Chuẩn hóa email, chống trùng, hash mật khẩu bằng Argon2id và tạo tài khoản chờ xác minh. Mật khẩu yêu cầu 8–128 ký tự, có ít nhất 1 chữ thường và 1 ký tự đặc biệt. Người dùng đã nghiệm thu luồng đăng ký.
- [x] **AUTH-02 — Xác minh email:** Gửi liên kết qua Resend từ `no-reply@mduc247.site`; token có hạn 15 phút, chỉ dùng một lần, gửi lại sẽ vô hiệu liên kết cũ và xác minh thành công cập nhật `email_verified_at`.
- [x] **AUTH-03 — Đăng nhập:** Chặn tài khoản chưa xác minh; phát access token ngắn hạn và refresh cookie HttpOnly, SameSite=Strict. Cấu hình tắt xác minh bị từ chối khi khởi động.
- [x] **AUTH-04 — Refresh:** Rotation, phát hiện dùng lại refresh token và thu hồi cả nhóm phiên; có test.
- [x] **AUTH-05 — Đăng xuất:** Thu hồi phiên hiện tại hoặc tất cả phiên.
- [x] **AUTH-06 — Quên/đặt lại mật khẩu:** Phản hồi không tiết lộ email tồn tại; gửi mã OTP 6 chữ số qua Resend từ `no-reply@mduc247.site`. Mã có hạn 10 phút, tối đa 5 lần nhập sai, chỉ dùng một lần; gửi lại vô hiệu mã cũ. DB lưu HMAC của mã, outbox mã hóa mã OTP chờ gửi và bỏ qua mã hết hạn. Đổi mật khẩu thu hồi phiên cũ; mật khẩu mới áp dụng quy tắc 8 ký tự, chữ thường và ký tự đặc biệt. Đã thử luồng thực tế với địa chỉ kiểm thử của Resend.
- [x] **AUTH-07 — Buyer/Seller:** API kiểm tra vai trò và tư cách thành viên của đúng shop.
- [x] **AUTH-08 — Chống lạm dụng trong bản thử:** Giới hạn theo IP/tài khoản bằng PostgreSQL, ghi `security_events`; người dùng đã xác nhận HTTP **429 Too Many Requests** sau chuỗi 5 lần đăng nhập sai.

**Chức năng chưa làm:**

Phần 1 không còn chức năng bỏ dở trong phạm vi **bản thử đã nghiệm thu**. Các việc sau thuộc giai đoạn production:

- [ ] **AUTH-08 — Nhiều instance:** Chưa thử hai Identity instance dùng chung PostgreSQL với request đồng thời để xác nhận rate limit không bị vượt ngưỡng.
- [ ] **AUTH-08 — Cảnh báo vận hành:** Chưa có kênh cảnh báo lạm dụng cho người vận hành; thông báo refresh-token reuse hiện chỉ đến người dùng.
- [ ] **Triển khai production:** Chưa kiểm tra cấu hình, email và cảnh báo trên môi trường production. [README xác minh email](Backend/README.md#xác-minh-email-và-resend).

## 02. User & Profile — P0

**Bằng chứng:** [Profile service](Backend/services/identity-service/src/services/profile.service.js), [profile routes](Backend/services/identity-service/src/routes/profile.routes.js), [migration](Backend/services/identity-service/database/migrations/006_create_profiles_addresses.sql), [FE Profile V2](Frontend/src/pages/ProfileV2/ProfileV2.tsx), [profile tests](Backend/services/identity-service/tests/profile.test.js).

**Chức năng đã làm:**

- [x] **USER-01** Hồ sơ của chính người dùng, che số điện thoại và không trả hash/token đã có.
- [x] **USER-02** Sửa tên hiển thị và avatar bằng API riêng; xác thực chủ tài khoản ở backend.
- [x] **USER-03** Thêm/đổi số ngay trong form chỉnh sửa hồ sơ hoặc tab Bảo mật bằng OTP gửi tới email tài khoản qua SMTP/Resend; mã có TTL, giới hạn thử/gửi. Tách trạng thái xác nhận qua email khỏi xác minh quyền sở hữu số điện thoại. Adapter SMS webhook vẫn có thể cấu hình sau.
- [x] **USER-04** Kiểm MIME/dung lượng, resize, quét ClamAV và lưu object key đã có; upload HTTP với ClamAV local và giao thức S3 đã qua test.
- [x] **USER-05** CRUD/xóa mềm địa chỉ và che số điện thoại ở danh sách đã có.
- [x] **USER-06** Địa chỉ mặc định dùng transaction và unique index.
- [x] **USER-07** Order lưu `shipping_address_json` snapshot khi đặt đơn.
- [x] **USER-08** `marketingOptIn`, tải dữ liệu Identity, yêu cầu/hủy xóa tài khoản có xác nhận mật khẩu và công cụ xử lý thủ công đã có.

**Chức năng chưa làm:**

- [ ] **USER-03 — Nghiệm thu** Cần kiểm tra gửi/nhập OTP email trên giao diện bằng tài khoản thật. Xác minh quyền sở hữu số qua SMS là tùy chọn về sau nếu bổ sung nhà cung cấp; email OTP chỉ xác nhận thao tác trên tài khoản.
- [ ] **USER-04** Chưa nghiệm thu S3 và ClamAV production; image MinIO local hiện không tải được từ registry.
- [ ] **USER-08** Chưa tự động xuất/xóa dữ liệu do Order, Payment, Catalog, Chat và Engagement giữ; yêu cầu xóa được xử lý thủ công theo [quy trình vận hành](Backend/docs/operations/privacy.md).
- [ ] **Chưa nghiệm thu:** AC-02-01/02/05 đã qua unit/DB/HTTP Identity, AC-02-03 đã qua HTTP với ClamAV local và S3 giả lập; còn luồng OTP email trên giao diện, S3 production và AC-02-04 xuyên Order sau khi sửa địa chỉ. [README Profile](Backend/README.md#user--profile).

## 03. Store & Seller — P0

**Bằng chứng:** [Store service](Backend/services/catalog-service/src/store.service.js), [store routes](Backend/services/catalog-service/src/server.js), [store integration tests](Backend/services/catalog-service/tests/store.integration.test.js), [Store OpenAPI](Backend/docs/api/store.openapi.yaml).

**Chức năng đã làm:**

- [x] **STORE-01** Tạo shop, địa chỉ lấy/trả hàng, slug và auto-activate đã có; đã buộc email xác minh trước khi tạo shop.
- [x] **STORE-02** Validate/uniqueness slug, xử lý xung đột và hạn chế thay slug public đã có.
- [x] **STORE-03** Trang shop public và số sản phẩm thật đã có.
- [x] **STORE-04** Danh sách/tìm shop active, phân trang và sắp xếp đã có.
- [x] **STORE-05** API overview có product count.
- [x] **STORE-06** Owner cập nhật thông tin/settings và ghi audit đã có.
- [x] **STORE-07** Owner/staff, mời bằng token có hạn, nhận/gỡ thành viên và kiểm tra membership đã có.
- [x] **STORE-08** Tạm ngừng nhận đơn/ẩn khỏi public; Inventory ngăn reserve mới, đơn cũ vẫn còn.

**Chức năng chưa làm:**

- [ ] **STORE-01** Logo/bìa hiện nhận URL HTTPS; chưa có upload riêng.
- [ ] **STORE-03** rating/followers shop chưa có nguồn dữ liệu thật (`null`).
- [ ] **STORE-05** `pendingOrderCount` và `recognizedRevenue` đang là `null`, `sourceStatus: orders_unavailable`.
- [ ] **STORE-06** quản lý logo/bìa vẫn dựa URL, cần luồng media riêng nếu yêu cầu upload trực tiếp.
- [ ] **Chưa nghiệm thu:** Store integration/HTTP dev đã đạt; dashboard với Order aggregate và luồng upload ảnh shop chưa có để kiểm thử theo AC-03-01 đến 05.

## 04. Catalog — P0

**Bằng chứng:** [Catalog service](Backend/services/catalog-service/src/catalog.service.js), [media service](Backend/services/catalog-service/src/media.service.js), [seed script](Backend/services/catalog-service/scripts/seed.js), [FE Catalog API](Frontend/src/api/catalogApi.ts), [Catalog integration tests](Backend/services/catalog-service/tests/catalog.integration.test.js).

**Chức năng đã làm:**

- [x] **CAT-01** Danh mục cha/con, slug, ảnh/icon, thứ tự và chặn vòng lặp đã có.
- [x] **CAT-02** Seller tạo/sửa/nhân bản/ẩn/hiện sản phẩm theo quyền shop đã có.
- [x] **CAT-03** Nhiều ảnh, ảnh đại diện/biến thể, upload/URL qua media service đã có mã.
- [x] **CAT-04** Biến thể/SKU, giá gốc/giá sale và tồn riêng đã có.
- [x] **CAT-05** Public API lọc sản phẩm/shop active, phân trang và bộ lọc giá/danh mục/shop/rating/tồn đã có.
- [x] **CAT-06** Search có chuẩn hóa dấu, tên/brand/shop và sắp xếp relevance cơ bản.
- [x] **CAT-07** Chi tiết có media, options, variant, giá, tồn, rating summary và shop.
- [x] **CAT-08** Home API có categories, featured/newest products, stores, banners.
- [x] **CAT-09** Seed từ `catalogData.ts` theo `seed_key`, chạy lặp được, có reset riêng, chặn production.
- [x] **CAT-10** Giá VND số nguyên, thời gian sale và giá gốc/giá áp dụng đã có.

**Chức năng chưa làm:**

- [ ] **CAT-08** `bestSellers: []` vì chưa có tổng hợp số bán thật.
- [ ] **CAT-03** Chưa nghiệm thu hạ tầng lưu trữ ảnh production.
- [ ] **Chưa nghiệm thu:** Catalog integration PostgreSQL đã đạt; cần xác nhận FE API mode trên trình duyệt theo AC-04-05. [README Catalog](Backend/README.md#catalog-sản-phẩm).

## 05. Inventory — P0

**Bằng chứng:** [Inventory service](Backend/services/catalog-service/src/inventory.service.js), [migration](Backend/services/catalog-service/database/migrations/003_inventory.sql), [integration test 100 request](Backend/services/catalog-service/tests/inventory.integration.test.js), [FE Inventory Panel](Frontend/src/components/MyStore/InventoryPanel.tsx).

**Chức năng đã làm:**

- [x] **INV-01** `on_hand`, `reserved`, `available` theo biến thể/SKU.
- [x] **INV-02** Seller điều chỉnh tồn với lý do, actor và lịch sử; chặn tồn âm.
- [x] **INV-03** API kiểm tra SKU/khả dụng; preview Order chỉ tham khảo.
- [x] **INV-04** Reservation TTL, khóa dòng và kiểm tra tồn trước khi giữ.
- [x] **INV-05** Commit trừ on-hand và giải phóng reserved; có commit batch.
- [x] **INV-06** Release/expiry có trạng thái và xử lý retry idempotent.
- [x] **INV-07** Idempotency key của reserve, commit/release theo reservation ID.
- [x] **INV-08** Job hết hạn/đối soát và ghi nhận bất thường tồn kho.

**Chức năng chưa làm:**

- [ ] **Chưa nghiệm thu:** Integration PostgreSQL gồm 100 request tranh tồn 5 đã đạt; còn cần HTTP xuyên Order/Inventory và kiểm thử khi triển khai nhiều instance.

## 06. Cart & Checkout — P0

**Bằng chứng:** [Order cart/checkout service](Backend/services/order-service/src/service.js), [FE Cart](Frontend/src/pages/Cart/Cart.tsx), [FE Checkout](Frontend/src/pages/Payment/Payment.tsx), [HTTP test](Backend/tests/e2e/cart-checkout.http.test.js).

**Chức năng đã làm:**

- [x] **CART-01** Giỏ đăng nhập theo user/SKU/selected đã có.
- [x] **CART-02** Thêm/gộp SKU, đổi số lượng, xóa; giá được hỏi lại từ Catalog.
- [x] **CART-03** Mở giỏ/preview kiểm tra lại SKU, trạng thái bán, giá và tồn.
- [x] **CART-04** Chọn một phần giỏ, nhóm theo shop, giữ dòng chưa chọn sau đặt đơn.
- [x] **CART-05** Preview tính tiền từng shop, giảm giá, lỗi dòng, phí giao hàng và tổng trên server.
- [x] **CART-06** Xác thực address ID thuộc buyer và lưu snapshot người nhận/địa chỉ.
- [x] **CART-07** COD mặc định; online chỉ bật khi provider được cấu hình ở Order/Payment.
- [x] **CART-08** Place order dùng idempotency key, đối chiếu quote và payload.
- [x] **CART-09** Phí ship được đánh dấu `shippingFeeIsEstimate`.

**Chức năng chưa làm:**

- [ ] **CART-01** chưa thấy chính sách hoặc thao tác nhập giỏ local trước đăng nhập.
- [ ] **CART-09** Phí ship hiện cố định **30.000 VND/shop**; chưa có calculator theo khu vực/trọng lượng hoặc Delivery Service.
- [ ] **Chưa nghiệm thu:** AC-06-01 đến 05 có HTTP test nhưng chưa chạy lại vì cần service và test DB. Cần quyết định rõ hành vi giỏ khách trước đăng nhập.

## 07. Order — P0

**Bằng chứng:** [Order lifecycle](Backend/services/order-service/src/lifecycle.service.js), [Order service](Backend/services/order-service/src/service.js), [order migrations](Backend/services/order-service/database/migrations/001_order.sql), [HTTP lifecycle test](Backend/tests/e2e/order-lifecycle.http.test.js), [Order OpenAPI](Backend/docs/api/order.openapi.yaml).

**Chức năng đã làm:**

- [x] **ORD-01** Một checkout tạo group và shop order riêng.
- [x] **ORD-02** Snapshot SKU/tên/giá/discount/shop/địa chỉ và breakdown tiền.
- [x] **ORD-03** State machine COD/online, seller, delivery event, hoàn thành/hủy.
- [x] **ORD-04** Buyer xem danh sách/chi tiết, lọc trạng thái/thời gian và phân trang.
- [x] **ORD-05** Seller xem/chuyển trạng thái đơn đúng shop theo membership.
- [x] **ORD-06** Buyer hủy/seller từ chối theo rule; hoàn tồn/ưu đãi và refund online có workflow retry.
- [x] **ORD-07** Timeline ghi actor, trạng thái trước/sau, reason/correlation ID.
- [x] **ORD-08** `expectedVersion`, idempotency key và kiểm tra chuyển trạng thái.
- [x] **ORD-09** `OrderReadyForShipment.v1`, `shipment_ref` và endpoint Delivery có xác thực đã có.

**Chức năng chưa làm:**

- [ ] **ORD-09** chưa có Delivery Service/provider thực tế.
- [ ] **Chưa nghiệm thu:** AC-07-01 đến 05 có HTTP test trong repo; lần này chưa chạy đủ service/DB. Chưa thể kết luận luồng giao hàng ngoài hệ thống đã hoàn tất.

## 08. Payment & Wallet — P1 (COD thuộc P0)

**Bằng chứng:** [Payment service](Backend/services/payment-service/src/service.js), [MoMo adapter](Backend/services/payment-service/src/momo.js), [VietQR adapter](Backend/services/payment-service/src/vietqr.js), [payment routes](Backend/services/payment-service/src/server.js), [FE wallet route](Frontend/src/AppRouter.tsx), [payment tests](Backend/services/payment-service/tests/momo.test.js).

**Chức năng đã làm:**

- [x] **PAY-01** COD ở trạng thái chưa thu; chỉ xác nhận thu hộ qua event nội bộ hợp lệ.
- [x] **PAY-02** Payment intent/URL/QR và expiry có mã.
- [x] **PAY-03** Ký request/kiểm IPN MoMo, đối chiếu order/request/amount và query có mã.
- [x] **PAY-04** VietQR không đánh dấu paid khi chỉ hiện QR.
- [x] **PAY-05** Webhook có verify, inbox dedupe và transaction ID duy nhất.
- [x] **PAY-06** State giao dịch/đơn/refund, kiểm tra chuyển trạng thái và ghi event đã có mã.
- [x] **PAY-07** Giới hạn refund không vượt tiền thu, idempotency, MoMo refund/VietQR settlement có mã.
- [x] **PAY-08** Job/query MoMo và báo cáo reconciliation có mã.

**Chức năng chưa làm:**

- [ ] **PAY-02** provider merchant thật chưa nghiệm thu.
- [ ] **PAY-03** mới có test chữ ký/giả lập.
- [ ] **PAY-04** Đối soát ngân hàng production còn thủ công/chưa nghiệm thu; webhook xác nhận đã có mã.
- [ ] **PAY-07** chi trả COD và provider live chưa có/nghiệm thu.
- [ ] **PAY-08** VietQR chưa có đối soát tự động từ ngân hàng, trạng thái treo cần quy trình vận hành.
- [ ] **PAY-09 (tùy chọn)** Chưa có ví nội bộ/ledger/nạp/rút; route `/wallet` hiện báo chưa khả dụng. Đây là hạng mục tùy chọn trong DOCX, không tính là thiếu P0.
- [ ] **Chưa nghiệm thu:** AC-08-01 đến 04 cần chạy HTTP/DB với provider giả lập và sau đó sandbox/live; AC-08-05 đặc biệt cần quy trình đối soát VietQR khi mất webhook. [README Payment](Backend/README.md#payment--wallet).

## 09. Promotion — P1

**Bằng chứng:** [Promotion service](Backend/services/engagement-service/src/service.js), [promotion migrations](Backend/services/engagement-service/database/migrations/001_promotion.sql), [Order discount migration](Backend/services/order-service/database/migrations/008_promotion_discounts.sql), [FE seller promotion](Frontend/src/components/MyStore/SellerPromotionPanel.tsx), [Promotion OpenAPI](Backend/docs/api/promotion.openapi.yaml).

**Chức năng đã làm:**

- [x] **PROM-01** Voucher cố định/%; thời gian, mức giảm tối đa, min spend, quota.
- [x] **PROM-02** Phạm vi shop/danh mục/SKU và segment `ALL`/`FIRST_ORDER` đã có.
- [x] **PROM-03** Tổng lượt/lượt mỗi user, một voucher mỗi checkout, row lock chống vượt quota.
- [x] **PROM-04** Validate ở preview và kiểm tra lại khi tạo đơn, mã lỗi có định danh.
- [x] **PROM-05** Reserve/commit/release lượt dùng, xử lý hủy idempotent.
- [x] **PROM-06** Flash Sale có thời gian server, giá/quota và `serverTime` cho countdown FE.
- [x] **PROM-07** Seller chỉ quản lý campaign shop có membership.
- [x] **PROM-08** Discount phân bổ bằng số nguyên theo dòng/shop; Order snapshot để tính refund.

**Chức năng chưa làm:**

- [ ] **PROM-02** campaign toàn sàn chưa mở cho seller/không thấy API vận hành.
- [ ] **Chưa nghiệm thu:** AC-09-01 đến 05 có mã/test cho các rule chính; cần chạy lại integration/HTTP với PostgreSQL, nhất là hai checkout tranh quota 1 và release sau hủy. [README Promotion](Backend/README.md#promotion).

## 10. Review & Return — P1

**Bằng chứng:** [Review service](Backend/services/engagement-service/src/review.service.js), [Return service](Backend/services/order-service/src/return.service.js), [Review migration](Backend/services/engagement-service/database/migrations/005_reviews.sql), [Return migration](Backend/services/order-service/database/migrations/009_returns.sql), [HTTP test](Backend/tests/e2e/review-return.http.test.js).

**Chức năng đã làm:**

- [x] **REV-01** Review chỉ theo order item của buyer đã giao/hoàn thành; một review/item và có version sửa.
- [x] **REV-02** Điểm 1–5, nội dung/ảnh và lọc nội dung độc hại có mã.
- [x] **REV-03** Review public phân trang/lọc sao/sắp xếp mới nhất/hữu ích từ lượt bình chọn thật.
- [x] **REV-04** Seller thuộc shop được phản hồi một lần.
- [x] **REV-05** Rating summary/projection và job đối soát Catalog đã có.
- [x] **RET-01** Buyer mở yêu cầu theo item/số lượng trong 7 ngày, lý do/ảnh.
- [x] **RET-02** State REQUESTED đến REFUNDED/CLOSED và lịch sử đã có.
- [x] **RET-03** Seller đúng shop xem/xét duyệt/từ chối/xác nhận nhận hàng; quyền ảnh chứng cứ được kiểm tra.
- [x] **RET-04** Tính hoàn theo tiền đã giảm/số lượng/phí ship có mã; hoàn online đi qua Payment.

**Chức năng chưa làm:**

- [ ] **REV-02** ảnh hiện lưu binary trong PostgreSQL, chưa theo hướng object storage khi mở rộng.
- [ ] **RET-01** chỉ hỗ trợ `resolution=REFUND`, chưa đổi hàng.
- [ ] **RET-04** COD dừng ở `REFUND_PENDING`; chưa có chi trả COD hoặc xử lý tranh chấp.
- [ ] **Chưa nghiệm thu:** AC-10-01/02 có unit test; AC-10-03 đến 05 cần chạy DB/HTTP và thử upload ClamAV/provider. [README Review & Return](Backend/README.md#p1-review--return-đã-qua-test-db-và-http-chưa-thử-trình-duyệtprovider).

## 11. Chat & Chatbot — P1

**Bằng chứng:** [Chat service](Backend/services/chat-service/src/service.js), [Mongo repository](Backend/services/chat-service/src/repository.js), [Socket server](Backend/services/chat-service/src/server.js), [media](Backend/services/chat-service/src/media.js), [FE Chat V2 API](Frontend/src/api/chatV2Api.ts), [chat tests](Backend/services/chat-service/tests/chat.test.js).

**Chức năng đã làm:**

- [x] **CHAT-01** Hội thoại duy nhất buyer/shop bằng unique index và API tìm/tạo.
- [x] **CHAT-02** Socket.IO xác thực token, kiểm membership khi join/send/read, ack.
- [x] **CHAT-03** Mongo message và cursor pagination có mã.
- [x] **CHAT-04** `clientMessageId` chống trùng, read cursor/unread count và ack.
- [x] **CHAT-05** Upload ảnh/PDF, giới hạn MIME/size, ClamAV, object key và URL có hạn có mã.
- [x] **CHAT-06** Buyer/shop staff chỉ truy cập hội thoại được phép.
- [x] **CHAT-07** Bot FAQ/catalog trả lời có nguồn dữ liệu và fallback quy tắc.
- [x] **CHAT-08** Đơn cá nhân được hỏi qua Order internal API sau khi kiểm buyer; test prompt injection có.
- [x] **CHAT-09** Rate limit/fallback và lọc input có mã.

**Chức năng chưa làm:**

- [ ] **CHAT-05** S3/ClamAV thật chưa thử.
- [ ] **CHAT-09** limit bot hiện nằm trong bộ nhớ process, cần cơ chế chia sẻ nếu chạy nhiều instance.
- [ ] **Chưa nghiệm thu:** AC-11-01 đến 04 có unit/socket test nhưng Mongo integration bị `SKIP`; AC-11-05 có HTTP test checkout/Order khi Chat tắt theo README, cần chạy lại cùng môi trường. Chưa nghiệm thu FE trên browser/MongoDB thật. [README Chat](Backend/README.md#p1-chat--chatbot-mã-nguồn-và-test-giả-lập-đạt-chưa-chạy-mongodb-thật).

## 12. Notification — P1

**Bằng chứng:** [Notification service](Backend/services/engagement-service/src/notification.service.js), [Socket room](Backend/services/engagement-service/src/notification.socket.js), [migration](Backend/services/engagement-service/database/migrations/006_notifications.sql), [FE Notification API](Frontend/src/api/notificationApi.ts), [notification tests](Backend/services/engagement-service/tests/notification.test.js).

**Chức năng đã làm:**

- [x] **NOTI-01** Inbox theo user, type/read filter, cursor và unread count.
- [x] **NOTI-02** Consumer Identity/Order/Payment/Chat có template và dedupe.
- [x] **NOTI-03** Seller recipients được giải từ membership đúng shop; không phát cho shop khác.
- [x] **NOTI-04** Đọc một/nhiều/tất cả idempotent; FE badge có API/socket.
- [x] **NOTI-05** Socket room theo user đã xác thực và inbox lưu DB khi offline.
- [x] **NOTI-06** SMTP job, retry giới hạn, `DEAD`/metrics đã có.
- [x] **NOTI-07** Marketing opt-in qua Identity và tùy chọn kênh chat/seller; email giao dịch thiết yếu không bị tắt tùy tiện.
- [x] **NOTI-08** Template whitelist, biến ID an toàn, deep link và quyền đọc ở endpoint đích có mã.

**Chức năng chưa làm:**

- [ ] **NOTI-02** Chat event chưa chạy với MongoDB thật.
- [ ] **NOTI-06** Provider live cho Notification chưa nghiệm thu; email xác minh Identity đã thử Resend riêng.
- [ ] **Chưa nghiệm thu:** AC-12-01 đến 05 có test unit/socket; các test DB/HTTP cho dedupe/offline/read bị `SKIP` lần này vì thiếu PostgreSQL test URL. Cần thử SMTP thật, link trên browser và Chat outbox với MongoDB thật. [README Notification](Backend/README.md#p1-notification-đã-qua-test-postgresql-http-và-socket-chưa-thử-provider-live).

## Điều kiện nghiệm thu chung và kết quả kiểm tra lần này

- **Test mới nhất 21/10/2026:** Sau chuyển quên mật khẩu sang OTP, `identity:test` đạt 24 bài và bỏ qua 5 bài cần PostgreSQL khi không đặt test URL; bài PostgreSQL OTP riêng đạt, luồng OTP qua Resend thật đạt, frontend build đạt. Trước đó Catalog 4/4, HTTP Identity 1/1, HTTP Store 1/1 và HTTP avatar 1/1 đã đạt với PostgreSQL dev. Typecheck FE vẫn còn 22 lỗi có sẵn ngoài các file phần 01/02. Các HTTP E2E khác chưa chạy lại.
- **Build/kiểm tra kiểu FE:** `npm.cmd run build` đạt (có cảnh báo bundle JS lớn). `tsc --noEmit -p tsconfig.app.json` **không đạt: 22 lỗi TypeScript** trong các component hiện có, gồm Admin, Favorite, ChatWindow, Voucher, Payment/OrderSummary và ProductInfo; cần xử lý trước khi coi FE đạt quality gate. Vite build không chạy bước typecheck này.
- **FE/browser:** Mã FE đã nối nhiều API v2, nhưng chưa thao tác nghiệm thu đầy đủ trên browser; một số API cũ vẫn dùng mock (`VITE_USE_MOCK_DATA=true`). [Backend README](Backend/README.md), [Frontend env example](Frontend/.env.example).
- **Tích hợp/triển khai:** Outbox/webhook có mã cho nhiều luồng; Kafka và Delivery Service thực tế chưa nối. Identity đã thử SMTP Resend thật; SMTP Notification, SMS, Payment provider live, MongoDB và S3/ClamAV production chưa nghiệm thu. Cần chạy E2E xuyên service trước khi đánh dấu hoàn thành cả 12 phần.
- **Ưu tiên còn lại:** (1) hoàn thiện seller dashboard và best seller từ Order aggregate; (2) nghiệm thu các P0 khác qua DB/HTTP/browser; (3) chốt Delivery/phí ship; (4) nghiệm thu provider P1 và hoàn COD/đổi hàng; (5) xử lý mock cũ, Kafka và các tiêu chí phi chức năng chung trong DOCX. Kiểm tra nhiều instance/cảnh báo AUTH-08 và cấu hình Identity production thuộc giai đoạn triển khai production.
