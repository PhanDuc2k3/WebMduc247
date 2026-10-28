# Quản lý cửa hàng và người bán

Phạm vi thực thi: Catalog giữ hồ sơ, ý định seller, cờ đình chỉ, quyết định, phiên bản đăng ký, vi phạm, kháng nghị, quyền sở hữu và badge. Order cung cấp số liệu tổng hợp; Engagement cung cấp đánh giá công khai; Chat cung cấp tổng số báo cáo và số đang mở theo shop. Không truy vấn chéo database giữa các service ở runtime.

## Trạng thái và đơn cũ

`store_settings.accepting_orders` là ý định seller. `stores.platform_suspended` là quyết định của sàn. `registration_status` độc lập với hai trường này. Trạng thái hiệu lực chỉ là `active` khi không bị sàn chặn, hồ sơ là `NOT_REQUIRED`/`APPROVED`, và seller muốn nhận đơn. Trigger bảo vệ quan hệ này; cập nhật tên, địa chỉ, thiết lập hoặc khôi phục của sàn không ghi đè ý định seller.

Seller không có API sửa cờ sàn, chủ sở hữu, trạng thái duyệt hoặc badge. Seller có thể tự ngừng khi đang bị chặn. Bật lại nhận đơn trong lúc bị đình chỉ bị từ chối. Owner mutations khóa shop trước khi kiểm tra lại membership để không dùng quyền chủ cũ sau chuyển giao.

Đình chỉ không sửa đơn, snapshot, tiền hoặc lịch sử đơn. Shop tiếp tục xử lý đơn/trả hàng qua các API hiện có. Hồ sơ shop có liên kết tới đơn, trả hàng, ticket và khiếu nại đúng `storeId`, theo quyền từng module. Đội vận hành sàn tiếp nhận qua hồ sơ hậu mãi khi seller không xử lý được.

## Quyết định và kháng nghị

Mỗi quyết định được ghi vào hộp thông báo của chủ shop trong cùng transaction với thay đổi trạng thái; seller đọc tại `/mystore`, có phạm vi ảnh hưởng, lý do, thời gian, đánh dấu đã đọc và gửi kháng nghị. Đây là kênh thông báo trong ứng dụng; chưa tích hợp gửi email/push của Catalog. Chủ cũ vẫn đọc được thông báo liên quan sau chuyển quyền qua `/seller/former-store-decisions`.

Kháng nghị gắn đúng quyết định. Người ra quyết định/người gửi không tự xét lại. Hủy đình chỉ chỉ áp dụng nếu đó vẫn là quyết định đình chỉ hiện hành; không gỡ chặn của một quyết định mới hơn. Chấp nhận kháng nghị từ chối đăng ký chuyển về chờ bổ sung, không tự duyệt. Hủy cảnh cáo loại sự việc khỏi số vi phạm còn hiệu lực. Không tự khôi phục badge đã bị thu hồi.

`version` và `requestId` bảo vệ thao tác quản trị; retry thành công không tạo thêm quyết định, kể cả khi nguồn tác động đang lỗi sau lần thực hiện đầu tiên.

## Hồ sơ đăng ký

`STORE_APPROVAL_REQUIRED=false` mặc định. Khi bật, chỉ shop mới vào `PENDING`, chưa xuất hiện công khai/nhận đơn. Shop cũ giữ `NOT_REQUIRED`; bật chính sách không tự chặn shop cũ.

Luồng: `PENDING → APPROVED | NEEDS_INFORMATION | REJECTED`. Cả ba quyết định đều cần lý do và đúng phiên bản hồ sơ. `NEEDS_INFORMATION` chờ seller sửa thông tin, lưu và nộp lại. `REJECTED` cũng có thể nộp lại hoặc kháng nghị. Hồ sơ gốc không bị ghi đè. Seller sửa hồ sơ đang `PENDING` tạo snapshot mới và tăng version để admin không duyệt bản đã cũ.

Hàng chờ `/admin/store-applications` có trạng thái/phân trang/phạm vi shop. Liên hệ/địa chỉ trong snapshot mặc định che. Xem đầy đủ qua `/admin/stores/:id/profile-contact` cần `users.view_sensitive`, quyền đọc đúng shop và lý do; lưu audit không kèm nội dung liên hệ. UI tự ẩn dữ liệu vừa xem sau 60 giây.

## Tác động và hiệu quả

`GET Order /admin/stores/:id/impact` cần `stores.read` đúng shop, chỉ trả tổng hợp. Có đơn mở, đơn xử lý quá 48 giờ, trả hàng mở, hồ sơ hậu mãi mở và hiệu quả theo kỳ. Cách tính, kỳ, múi giờ và thời gian cập nhật đi kèm response. Đơn vị là đơn từng shop, không phải nhóm checkout. Tỷ lệ hủy chỉ tính đơn có lịch sử hủy bởi seller; không gán hủy của buyer thành lỗi shop. Khiếu nại có kết luận đếm theo hồ sơ có quyết định đã công bố, không đếm từng quyết định thành một khiếu nại mới.

Ngưỡng 48 giờ là định nghĩa tham khảo cho báo cáo này, không phải cơ chế phạt tự động. Số mở/quá hạn là hiện tại; chỉ các chỉ số ghi “trong kỳ” chịu bộ lọc ngày. Trả hàng theo ngày yêu cầu, khiếu nại theo ngày công bố, đánh giá theo ngày tạo và chỉ trạng thái công khai. Không có mẫu thì tỷ lệ/điểm là `null`. Báo cáo hội thoại thuộc nguồn Chat riêng; số hậu mãi không đại diện toàn bộ báo cáo hội thoại.

`GET Chat /admin/stores/:id/report-summary` cần `stores.read` đúng shop, chỉ trả tổng số và số đang mở, không trả nội dung hội thoại. Báo cáo đang mở không được coi là vi phạm có kết luận. Catalog lấy lại cả tác động Order và báo cáo Chat trước khi đình chỉ. Một trong hai nguồn không sẵn sàng/sai dữ liệu làm thao tác bị từ chối, không coi là 0. Lỗi Engagement hiện riêng, không thay thế điểm bằng 0.

## Vi phạm

Một sự việc dùng một `incident_key` chuẩn, ví dụ `case:<UUID hồ sơ gốc>`. Nhân viên cần đối chiếu báo cáo trùng và tái sử dụng cùng mã. Unique constraint chống cùng mã bị tính hai lần kể cả hai request khác nhau. Đình chỉ/khôi phục không tự cộng vi phạm. Cảnh cáo có hạn khắc phục, lý do, trạng thái `WARNING`/`REMEDIED`/`OVERTURNED`, lịch sử và kháng nghị.

## Chuyển chủ/khôi phục quyền truy cập

`STORE_OWNERSHIP_ENABLED=false` mặc định. Có API/giao diện khi chính sách cho phép. `stores.ownership.request` thuộc moderator; `stores.ownership.approve` thuộc system_admin. Hai quyền đều yêu cầu xác thực quản trị gần đây. Legacy admin không được hai quyền này. System admin có quyền đọc shop và hồ sơ để xét đề xuất; không được quyền đình chỉ chỉ vì vai trò này.

Đề xuất cần loại `TRANSFER`/`RECOVERY`, tài khoản đích đang hoạt động và đã xác minh email, lý do và `case:UUID` hồ sơ xác minh. Adapter kiểm tra ticket đã kết luận, đúng shop và tài khoản đích là chủ thể ticket. Nhân viên phải thực hiện xác minh danh tính/quyền chuyển giao thực tế và ghi căn cứ trong ticket trước khi đề xuất; trạng thái ticket/email không tự chứng minh quyền sở hữu.

Người duyệt cần một ticket xác minh khác, không được là người đề xuất, chủ cũ hoặc chủ mới. Duyệt gắn đúng version shop sau đề xuất; shop đổi giữa chừng thì từ chối và tạo lại. Hệ thống kiểm tra lại tài khoản đích và hồ sơ nguồn khi duyệt. Thực thi thay membership/chủ hiện tại, hủy lời mời chưa dùng, phát sự kiện đồng bộ Identity và thông báo hai bên. Không sửa Order. `RECOVERY` chỉ khôi phục membership của chủ hiện tại, không đổi chủ. Việc khôi phục mật khẩu/phiên tài khoản dùng luồng Identity riêng.

Chính sách này chỉ phù hợp khi có thể tạo ticket xác minh gắn đúng shop/tài khoản đích. Không cung cấp đường bỏ qua điều kiện ticket để chuyển cho một người chưa có hồ sơ liên quan.

## Giấy tờ định danh — chưa triển khai thu nhận

`ADM-STORE-010` còn mở. Mô hình hiện tại chưa yêu cầu giấy tờ người bán; không có API upload/xem giấy tờ và không dùng ảnh công khai làm kho giấy tờ. Trước khi bật, chủ sản phẩm phải chốt phạm vi mô hình kinh doanh và chính sách sau; đây là thiết kế dự kiến, chưa phải khả năng đang hoạt động:

| Nội dung | Thiết kế để duyệt trước triển khai |
| --- | --- |
| Dữ liệu tối thiểu | Loại chủ thể, tên pháp lý, mã đăng ký kinh doanh nếu áp dụng, loại giấy tờ, cơ quan cấp, ngày hết hạn, kết quả xác minh. Chỉ thu ảnh giấy tờ nếu quy trình thực sự cần; không thu selfie/sinh trắc học mặc định. |
| Nơi lưu | Metadata trong schema Catalog riêng; bản ảnh trong bucket S3 private riêng, mã hóa, không URL công khai/không dùng media sản phẩm. Không đưa nội dung ảnh/số giấy tờ vào log, event hoặc command receipt. |
| Quyền | Quyền riêng `stores.documents.read/review` chưa được cấp hoặc triển khai; cần phạm vi shop, xác thực lại, lý do và audit từng lượt xem. Không kế thừa từ `stores.read`. |
| Thời hạn dự kiến | 30 ngày cho hồ sơ bỏ dở/từ chối; 90 ngày sau hết hiệu lực hoặc shop đóng cho hồ sơ đã duyệt; worker xóa cả ảnh và bản sao. Giữ ngoại lệ có căn cứ, hạn xem xét và người chịu trách nhiệm. Các mốc cần được chủ chính sách xác nhận trước khi triển khai. |
| Điều kiện bật | Chốt trường bắt buộc, chính sách thời hạn/ngoại lệ, cung cấp nơi lưu riêng và hoàn thành kiểm thử phân quyền/xóa dữ liệu. Không gắn badge “đã xác minh danh tính” trong giai đoạn này. |

## Badge

Chỉ có `Shop uy tín`, chính sách `REPUTATION_V1`, công khai tại `/stores/reputation-policy` và trên trang shop có badge. Không có badge xác minh danh tính hay chính hãng.

Điều kiện tại ngày xét: trong 90 ngày có ít nhất 100 đơn, 100 đơn đã giao/hoàn tất, 30 đánh giá công khai, điểm từ 4,5/5; hủy bởi seller ≤2%, chậm xử lý ≤5%, số yêu cầu trả hàng ≤5% số đơn; không bị chặn, không còn cảnh cáo chưa khắc phục và đã duyệt hồ sơ nếu yêu cầu. Badge hiệu lực 30 ngày. Hết hạn tự ẩn; đình chỉ/cảnh cáo mới thu hồi ngay; xét lại không đạt cũng thu hồi. Không cấp khi nguồn lỗi. Admin có thể thu hồi với lý do. Khôi phục shop/kháng nghị không tự cấp lại badge.

Snapshot số liệu và chính sách được lưu tại lần cấp. Đây là đánh giá tại thời điểm cấp, không phải tính lại tỷ lệ cho từng đơn phát sinh. Gói trả phí và lựa chọn của seller không xuất hiện trong điều kiện; seller không sửa được trường badge. Các nhãn Mall/Chính hãng cố định ở StoreHeader cũ đã được bỏ.

## Cấu hình và vận hành

- Chạy migration Catalog 011–013 trước khi chạy code mới. Order/Engagement dùng schema hiện có.
- Cấu hình `CATALOG_ORDER_URL`, `CATALOG_ENGAGEMENT_URL`, `CATALOG_CHAT_URL`; Docker đã trỏ tên service nội bộ.
- Hai công tắc duyệt đăng ký/chuyển chủ mặc định tắt. Không tự thay cấu hình hay cấp thêm vai trò cho tài khoản thật để làm nghiệm thu.
- `npm run stores:test` dùng database local riêng `admin_store_management_test`; cần nạp `.env`, `.env.development.local` và `NODE_ENV=development`. `npm run test:stores:browser` chạy frontend với fixture API.
- Dữ liệu quyết định/vi phạm/profile là lịch sử quản trị; hiện chưa có job purge theo thời hạn. Cần tích hợp chính sách lưu trữ của toàn sàn trước khi thu thêm dữ liệu nhạy cảm.
