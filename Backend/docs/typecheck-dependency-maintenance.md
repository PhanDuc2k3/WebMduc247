# Sửa TypeScript và dependency — 27/10/2026

Phạm vi: ứng dụng `Frontend` và npm workspace `Backend`. Các ứng dụng độc lập `Chatbot` và `websocket` không thuộc lần kiểm tra này.

## Kết quả

| Kiểm tra | Trước | Sau |
| --- | --- | --- |
| TypeScript frontend | 22 diagnostic | 0; cả app và cấu hình Vite đều đạt |
| Audit đầy đủ backend | 9 gói bị cảnh báo: 7 high, 2 moderate | 0 |
| Audit đầy đủ frontend | 24 gói bị cảnh báo: 18 high, 6 moderate | 0 |
| Build frontend | Chỉ chạy Vite | Chạy typecheck trước Vite; đạt |

Audit là kết quả tại thời điểm kiểm tra, bao gồm dependency phát triển. Số gói bị cảnh báo không tương đương số lỗ hổng độc lập hoặc số đường API có thể bị khai thác.

## Thay đổi

- Nút mobile xóa khuyến mãi/voucher, khóa shop và khóa/gỡ khóa người dùng mở hộp xác nhận đúng đối tượng. Bổ sung hộp xác nhận còn thiếu ở quản lý khuyến mãi cho cả desktop/mobile.
- Preview ảnh chat dùng icon `X` đã import; thêm tên truy cập cho nút xóa ảnh.
- Thẻ sản phẩm yêu thích lấy địa chỉ từ `store.storeAddress`; form voucher giữ các trường bắt buộc theo `VoucherType`.
- Cart và Order dùng chung kiểu biến thể có `variationId`/`optionId`; khai báo thông báo VietQR và dữ liệu sản phẩm đầy đủ, xử lý shop dạng ID hoặc object khi mua ngay.
- Đồng bộ các bản JavaScript đi kèm TypeScript để import không có đuôi file chạy đúng mã đã sửa.
- Mongoose nâng từ 8.19.1 lên 8.24.7; Nodemailer từ 10.1.1 lên 10.2.1. Lockfile cập nhật các bản vá Socket.IO/WebSocket và dependency frontend trong phạm vi tương thích, không dùng `npm audit fix --force`.
- Backend lockfile có 23 mục `extraneous` còn sót sau npm prune. Chỉ bỏ metadata sau khi xác nhận package và package cha đều không còn trên đĩa hoặc trong cây dependency; không bỏ khai báo dependency đang được sử dụng.

## Bằng chứng

- `npm run typecheck` và `npm run build` trong `Frontend`: đạt. Build còn cảnh báo chunk lớn hơn 500 kB; đây là cảnh báo kích thước bundle.
- `npm audit --json` trong cả `Backend` và `Frontend`: exit 0, toàn bộ mức cảnh báo bằng 0.
- `npm ci --dry-run --ignore-scripts` trong cả hai thư mục: đạt, manifest và lockfile nhất quán.
- `npm test --workspaces --if-present` trong `Backend`: **133 pass, 21 skip, 0 fail**. Các bài skip yêu cầu database/cấu hình tích hợp riêng.
- Bộ MFA PostgreSQL/HTTP chạy riêng với dependency mới: **21 pass, 0 skip/fail**.
- MongoDB chạy riêng trên database test local với Mongoose mới: **1 pass, 0 skip/fail**; kiểm tra unique conversation, gửi tin nhắn idempotent và phân trang cursor.
- Nodemailer tại cả Identity và Engagement: kiểm tra địa chỉ có comment lồng nhau theo advisory và tạo MIME bằng stream bộ nhớ đều đạt; không gửi email thật.
- Frontend session/policy/command/search: **23 pass, 0 skip/fail**.
- Edge desktop/mobile: đăng nhập TOTP/passkey, đăng ký passkey, xác thực lại, đăng xuất/reload và không tự phát lại mutation đều đạt. Với 5 thao tác mobile đã sửa, hủy không gọi mutation và xác nhận gọi đúng một lần với đúng đối tượng; desktop khuyến mãi và preview/xóa ảnh chat đạt, không có runtime exception. Các thao tác này dùng API giả lập cô lập, không xóa/khóa dữ liệu thật.

## Áp dụng khi triển khai

Cài dependency bằng lockfile đã cập nhật (`npm ci`), sau đó build lại frontend/backend image và tạo lại container theo quy trình triển khai. Container đang chạy giữ dependency đã cài trước đó cho tới khi được cập nhật. Lần này kiểm tra mã và dependency trên máy phát triển, không triển khai production.
