# Yêu cầu dữ liệu cá nhân

Người dùng đã đăng nhập có thể tải bản JSON dữ liệu thuộc Identity tại `GET /api/v2/users/me/data-export`. Bản này gồm hồ sơ, địa chỉ đang dùng và đã xóa mềm, lịch sử yêu cầu đổi số điện thoại, metadata phiên và sự kiện bảo mật; không gồm hash mật khẩu, token hoặc dữ liệu do Order, Payment, Catalog, Chat và Engagement quản lý. Giao diện tải nằm ở tab Cài đặt của hồ sơ.

Yêu cầu xóa tài khoản dùng `POST /api/v2/users/me/deletion-request` với mật khẩu hiện tại. API trả `202`, lưu một yêu cầu `PENDING` và không xóa tài khoản ngay. Người dùng xem yêu cầu mới nhất bằng `GET` và có thể hủy yêu cầu đang chờ bằng `DELETE` trên cùng URL. Chỉ có một yêu cầu đang chờ cho mỗi tài khoản; các thao tác được ghi vào `security_events`.

## Xử lý thủ công

1. Liệt kê yêu cầu: từ thư mục `Backend`, chạy `node --env-file=.env.development.local services/identity-service/scripts/privacy.js list` ở dev. Môi trường triển khai khác truyền `IDENTITY_DATABASE_URL` và thông tin storage qua secret của môi trường đó.
2. Kiểm tra đơn hàng, thanh toán, shop, thông báo và hội thoại theo `user_id`. Xử lý dữ liệu của từng service theo chính sách lưu trữ đã áp dụng; dữ liệu đơn hàng cần giữ được xử lý tại Order, không bị script Identity tự xóa. Chuyển quyền hoặc đóng shop trước khi hoàn tất yêu cầu của seller.
3. Nếu chưa thể xóa, chạy `node --env-file=.env.development.local services/identity-service/scripts/privacy.js reject <request-id> "lý do"` và thông báo cho người dùng theo quy trình vận hành.
4. Chỉ sau khi đã xử lý các service liên quan, chạy `node --env-file=.env.development.local services/identity-service/scripts/privacy.js complete <request-id> --cross-service-reviewed`. Lệnh này xóa avatar, dữ liệu cá nhân Identity, phiên, email chờ gửi và sự kiện gắn với tài khoản; bản ghi yêu cầu còn lại ở trạng thái `COMPLETED` nhưng không còn `user_id`.

`--cross-service-reviewed` là xác nhận của người vận hành, không phải kiểm tra tự động. Không đánh dấu yêu cầu hoàn thành khi dữ liệu ở service khác chưa được xử lý theo chính sách. Quy trình trên được kiểm thử với tài khoản thử nghiệm; chưa nghiệm thu trên hệ thống production.
