# Mục 9 — Quản lý cửa hàng và người bán

Cập nhật 27/10/2026. Đã triển khai 001–009 và 011 trong phạm vi dưới đây. 010 chưa triển khai xác minh giấy tờ; không đánh dấu hoàn thành thay cho việc chốt chính sách kinh doanh.

| Yêu cầu | Phạm vi và bằng chứng |
| --- | --- |
| STORE-001 | Hồ sơ shop/chủ shop theo quyền; trạng thái hiệu lực, ý định seller, lý do chặn, profile/history/decisions. Liên hệ mặc định che, xem đầy đủ có quyền và audit. |
| STORE-002 | Số liệu Order hiện tại/trong kỳ và báo cáo hội thoại từ Chat, có nguồn/thời gian/cách tính. Catalog từ chối đình chỉ khi Order/Chat lỗi; không trả nội dung chat. |
| STORE-003 | Cờ sàn độc lập với seller; trigger bảo vệ hiệu lực, restore giữ seller tự ngừng. Test cập nhật shop và bật nhận đơn lúc bị chặn. |
| STORE-004 | Quyết định atomic trong hộp thông báo tại `/mystore`; phạm vi, lý do, kênh kháng nghị và đã đọc. Chưa gửi email/push Catalog. |
| STORE-005/006 | Chính sách đăng ký bật được cho shop mới; queue, snapshot bất biến, duyệt/từ chối/bổ sung có lý do và version. Seller nộp lại cả sau bổ sung/từ chối. |
| STORE-007 | Hủy do seller, chậm xử lý, trả hàng, khiếu nại có kết luận và điểm công khai theo kỳ. Null khi không có mẫu, lỗi nguồn hiển thị riêng. |
| STORE-008 | Unique mã sự việc; cảnh cáo/hạn khắc phục/kháng nghị/người xét độc lập; không cộng vi phạm theo số quyết định đình chỉ. Không tự nhận diện hai mã khác nhau là cùng sự việc. |
| STORE-009 | Chính sách chuyển chủ mặc định tắt; workflow xác minh, đề xuất, duyệt độc lập, đúng version, đồng bộ membership và thông báo hai bên. Test chủ cũ mất quyền, recovery chủ hiện tại và snapshot đơn giữ nguyên. Điều kiện ticket và giới hạn xem tài liệu thiết kế. |
| STORE-010 | **Còn mở**: không thu giấy tờ. Đã ghi thiết kế tối thiểu về dữ liệu/nơi lưu/quyền/thời hạn để chốt trước triển khai. |
| STORE-011 | Badge uy tín có điều kiện công khai, hạn 30 ngày, thu hồi/tự hết hạn; không do trả phí/tự chọn. Không có badge xác minh danh tính. |

## Kiểm thử

- PostgreSQL/API: **11/11 qua** trên database test riêng; fixture rollback, bài kiểm tra cạnh tranh có cleanup riêng. Bao gồm chính sách nhận đơn, hồ sơ, vi phạm/kháng nghị, thống kê từ đơn/đánh giá thật, badge, ownership và cập nhật đồng thời.
- Mongo/Chat HTTP: **2/2 qua**, kiểm tra scope shop, số báo cáo mở/đóng, cách ly shop khác và không lộ nội dung.
- HTTP kiểm tra bearer, origin, scope, lỗi nguồn trước đình chỉ, retry idempotent khi nguồn lỗi sau lần đầu và seller không gỡ chặn qua settings.
- Browser dùng fixture: lỗi/thử lại tác động chặn đình chỉ, khôi phục giữ shop ngừng, quyết định bổ sung đúng profile version, chọn hồ sơ từ queue, seller nộp lại/kháng nghị; desktop 1440px và mobile 390px.
- RBAC/Auth: **14/14 qua**. Catalog hồi quy có database: **6 qua, 1 bỏ qua** (storefront có cấu hình database riêng). Order suite: **15 qua, 4 bỏ qua** (các suite database Order ngoài phạm vi chưa nạp biến môi trường riêng).
- Frontend build/typecheck qua; Vite còn cảnh báo chunk lớn của ứng dụng. Browser desktop/mobile qua với fixture API.

Migration Catalog 011–013 đã áp dụng vào database local qua cấu hình phát triển. Không bật chính sách duyệt đăng ký/chuyển chủ, không cấp thêm vai trò cho tài khoản thật.

Không coi browser fixture là E2E với tài khoản thật, gửi thư thật hoặc sự kiện đồng bộ Identity thật. Tài khoản legacy không được tự cấp quyền chuyển chủ để nghiệm thu. Kích hoạt chính sách và xác minh nghiệp vụ bằng ticket thật còn là bước vận hành khi được áp dụng.

Chi tiết API, mô hình trạng thái, mapping quyền, cấu hình và giới hạn: [store-governance.md](Backend/docs/store-governance.md).
