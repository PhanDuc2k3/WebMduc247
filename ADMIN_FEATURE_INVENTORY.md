# Chức năng admin hiện có — rà soát 28/10/2026

> Đây là snapshot trước đợt bổ sung admin cơ bản. Trạng thái mới sau triển khai: [ADMIN_BASIC_ACCEPTANCE.md](ADMIN_BASIC_ACCEPTANCE.md). Router đã thêm thanh toán, hoàn tiền, tồn kho, báo cáo hội thoại và thiết lập; lỗi cleanup/SLA đã sửa; Payment/Chat queue local đã kết nối.

Phạm vi: mã nguồn hiện tại trong workspace, bao gồm thay đổi chưa commit; router đang được sử dụng, giao diện, API, quyền, migration local và kiểm thử chạy lại. Ngày theo `Asia/Bangkok`.

**Kết luận:** admin có **18 mục điều hướng chính**, thêm trang đăng nhập và trang xem trước trang chủ. Có nhiều luồng đã nối giao diện–API và qua kiểm thử trên database riêng. Chưa thể xác nhận toàn bộ admin đã hoàn thiện hoặc mọi chức năng dùng được bằng tài khoản local hiện tại: còn lỗi đã ghi nhận, một bộ test lỗi cleanup, quyền/cấu hình chưa đủ và các module chưa có console.

Việc có endpoint, migration hoặc dấu `[x]` trong yêu cầu không đồng nghĩa đã nghiệm thu E2E trên môi trường đang chạy. Lần rà soát này không đổi vai trò tài khoản, thành viên nhóm, chính sách kinh doanh hoặc dữ liệu nghiệp vụ. Các helper kiểm thử chỉ migrate database test riêng.

## 1. Các màn hình đã có trong router

Nguồn xác định phạm vi: [AppRouter.tsx](Frontend/src/AppRouter.tsx), [PlatformAdminShell.tsx](Frontend/src/pages/Admin/PlatformAdminShell.tsx), [adminPolicy.ts](Frontend/src/pages/Admin/adminPolicy.ts).

| Mục / đường dẫn | Chức năng hiện có | Giới hạn cần hiểu |
| --- | --- | --- |
| Tổng quan — `/admin` | Chọn kỳ/ngày; thống kê người dùng, shop, sản phẩm, đơn; so sánh kỳ trước; biểu đồ; đơn gần đây; chỉ số thu/hoàn theo quyền; drilldown giữ bộ lọc; trạng thái lỗi và thử lại từng nguồn. | Giá trị đơn khác tiền đã thu; phí sàn chưa có nguồn nghiệp vụ. Số liệu hiển thị phụ thuộc quyền và tình trạng service. |
| Hàng chờ — `/admin/work-queue` | Tổng hợp ORDER/RETURN/TICKET/DISPUTE/REFUND/ABUSE_REPORT; lọc, nhận việc, phân công, chuyển nhóm, ưu tiên, phản hồi đầu tiên, trạng thái chờ, SLA, thông báo nhắc việc/chuyển cấp, cấu hình theo loại việc và trưởng nhóm. Có kiểm soát phiên bản khi cùng nhận việc. | Còn vấn đề hạn queue khác hạn case sau pause/resume; Payment/Chat local chưa đồng bộ; chưa có trưởng nhóm local. Hoàn tất nghiệp vụ tiền/đơn phải qua module nguồn. |
| Giao dịch thành công — `/admin/finance` | Danh sách thu tiền hoặc hoàn tiền thành công trong kỳ, phân trang; số tiền, provider, thời điểm thành công; API summary tài chính cho dashboard. | Đây là màn tra cứu giao dịch thành công. Chưa có console đầy đủ cho payment intent mọi trạng thái, webhook inbox, phiên đối soát, xử lý chênh lệch, quyết toán. |
| Người dùng — `/admin/users` | Tìm/lọc/phân trang, tìm ID/tên/email và tìm liên hệ theo quyền; hồ sơ che PII; mở liên hệ có lý do/audit; liên kết shop/đơn/hậu mãi; xem tác động trước khóa; khóa/khôi phục, khóa có hạn và mã lý do; gửi reset mật khẩu; ghi chú nhóm; xem/thu hồi phiên; lịch sử và tín hiệu liên hệ/IP. | Khóa hiện ở phạm vi ACCOUNT. Không đọc mật khẩu/OTP/token, không tự đánh dấu email đã xác minh. Các tab/nút nhạy cảm có quyền riêng; nhóm ghi chú local chưa có thành viên. |
| Kháng nghị & dữ liệu — `/admin/user-workflows` | Hàng xử lý kháng nghị khóa và yêu cầu ACCESS/RECTIFY/ANONYMIZE; nhận/phân công, xác minh danh tính, reviewer độc lập, rà soát sáu module, ngoại lệ lưu trữ, bản dữ liệu mã hóa, thực thi, lịch sử; cấu hình nhóm ghi chú. | USER-010 chưa đạt đầy đủ: lỗi WAITING_CLEANUP; tự động xuất/chỉnh sửa/ẩn danh chủ yếu thuộc Identity, chưa tổng hợp tự động toàn bộ dữ liệu sáu service. |
| Cửa hàng — `/admin/stores` | Danh sách/hồ sơ, chủ shop và liên hệ theo quyền; tạm ngừng/khôi phục độc lập ý định seller; xem tác động từ Order/Chat; chỉ số vận hành/đánh giá theo kỳ; queue hồ sơ đăng ký; duyệt/từ chối/yêu cầu bổ sung; vi phạm, hạn khắc phục, kháng nghị; chuyển chủ/khôi phục sở hữu theo chính sách và hai người; badge uy tín, thông báo/lịch sử. | Chưa xác minh giấy tờ seller (STORE-010). Chuyển chủ và duyệt đăng ký phụ thuộc chính sách môi trường; có mã không có nghĩa đã bật. Badge uy tín không phải xác minh danh tính. Thông báo Catalog hiện là hộp thư trong ứng dụng, chưa nghiệm thu email/push. |
| Sản phẩm — `/admin/products` | Lọc shop/danh mục/thương hiệu/ngày/tồn/trạng thái seller và kiểm duyệt; hồ sơ SKU/giá/tồn/ảnh; snapshot và so sánh phiên bản; ẩn/khôi phục; quy tắc và mã vi phạm; yêu cầu sửa/xác nhận khắc phục; báo cáo người mua; kháng nghị với reviewer độc lập; tín hiệu trùng tên/hash ảnh/biến động giá; chính sách duyệt trước đăng; xem trước và xử lý hàng loạt có kết quả từng mục. | Duyệt trước đăng đang tắt trong database local. Hàng loạt tối đa 200 mục, mỗi lượt tối đa 20; job tiếp tục nhờ client gọi lượt chạy, chưa có worker tự chạy độc lập. Tín hiệu chỉ hỗ trợ điều tra, không tự kết luận vi phạm. |
| Danh mục & thương hiệu — `/admin/categories` | Năm tab: cây danh mục, bộ thuộc tính, thương hiệu, CSV, lịch sử. Tạo/sửa/chuyển cha/thứ tự/ngừng/xóa có kiểm tra tham chiếu; chống chu trình; xem trước tác động và chuyển sản phẩm khi ngừng nhánh; slug/URL cũ; thuộc tính có kiểu và kế thừa; chuẩn hóa/alias/hợp nhất thương hiệu; CSV kiểm từng dòng, preview và áp dụng nguyên khối; audit trước/sau. | CSV tối đa 256 KB/200 dòng; danh mục CSV chỉ tạo mới. URL cũ chuyển bằng SPA replace, chưa phải HTTP 301 ở hosting. Không xóa được danh mục còn tham chiếu. |
| Đơn hàng — `/admin/orders` | Tìm/lọc/phân trang, ngày/shop/người mua theo quyền; chi tiết shop order và checkout reference; item/snapshot, tiền và trạng thái thanh toán/hoàn; lịch sử; hủy đơn trước bàn giao khi seller bị khóa, có quyền riêng và phê duyệt nếu cần. | Không có chức năng ép trạng thái hoặc sửa giá/snapshot. Chưa phải timeline hợp nhất đầy đủ Order–Payment–hãng vận chuyển; không có console điều hành giao nhận riêng. |
| Trả hàng — `/admin/returns` | Danh sách/lọc, chi tiết và item/số lượng; chứng cứ qua quyền cấp có hạn và audit; bắt đầu xem xét/chấp nhận/từ chối; policy cửa sổ trả hàng, giữ lượng/tiền; liên kết case và quy trình nhận/kiểm hàng trước hoàn. | Đọc, xét duyệt và thực thi dùng quyền riêng; không báo hoàn xong chỉ vì lệnh được nhận. Kết quả tiền phải từ Payment. |
| Ticket & khiếu nại — `/admin/cases` | RETURN/TICKET/DISPUTE có trạng thái riêng; tạo/tra cứu, liên kết đơn/hồ sơ; nhận/phân công/hạn; yêu cầu buyer/seller bổ sung; ghi chú nội bộ và thông báo các bên tách riêng; chuyển cấp; căn cứ/policy/trách nhiệm/chứng cứ; đề xuất/duyệt quyết định, can thiệp seller bị khóa/quá hạn; fulfillment, kháng nghị, mở lại và đóng hồ sơ. | Quyết định tiền và ngoại lệ cần kiểm soát người tạo/người duyệt; tài khoản có nhiều vai trò vẫn không tự duyệt. Đây là hỗ trợ gắn nghiệp vụ đơn/hậu mãi, chưa phải hệ thống CSKH đa kênh đầy đủ. |
| Ngoại lệ trả hàng — `/admin/return-exceptions` | Danh sách, đề nghị/duyệt/từ chối ngoại lệ quá hạn; hai actor độc lập; lý do, version, snapshot policy và audit. | Không biến thành quyền bỏ qua policy tùy ý hoặc nhập số tiền hoàn tùy ý. |
| Báo cáo hậu mãi — `/admin/case-reports` | Lọc kỳ/shop/danh mục; tổng hợp nguyên nhân, thời gian xử lý, tỷ lệ kháng nghị theo snapshot. | Chưa phải bộ báo cáo toàn sàn, trình tạo báo cáo hay export tài chính. |
| Giao diện trang chủ — `/admin/storefront` | Navbar/menu, danh mục nổi bật, banner theo URL ảnh, thứ tự/ẩn hiện các khối, ghim sản phẩm/shop; nháp, preview, xuất bản, dùng lại bản đang xuất bản làm nháp, lịch sử gần đây; kiểm tra version/lý do/tham chiếu. | Chưa có thư viện media/upload riêng trong editor, lịch xuất bản, workflow biên tập–duyệt đầy đủ hoặc khôi phục tùy chọn mọi phiên bản lịch sử. |
| Nhật ký quản trị — `/admin/audit` | Chọn nguồn Identity/Catalog; lọc loại shop/sản phẩm, tìm đối tượng/lý do, phân trang; actor, thời gian, trạng thái, version và correlation ID. Các module khác còn có lịch sử tại hồ sơ riêng. | Chưa phải audit explorer hợp nhất mọi service, chưa có bộ lọc thời gian/actor và export toàn sàn trên màn này. |
| Nhân sự & quyền — `/admin/staff-access` | Chọn/tra tài khoản; xem role, quyền hiệu lực, nguồn quyền và scope; thay bộ vai trò/phạm vi có lý do và version; thu hồi phiên sau thay quyền; bảo vệ tự thay quyền và quản trị viên cuối cùng ở backend. | Chưa có bộ quản lý nhân sự hoàn chỉnh: danh sách giàu thông tin/MFA/hoạt động, mời qua link một lần, quyền tạm thời, offboarding kèm chuyển hết việc và lịch ca trực. |
| Yêu cầu phê duyệt — `/admin/approvals` | Đề nghị/duyệt/từ chối cho chấp nhận return có hoàn tiền và hủy đơn đã thanh toán; snapshot số tiền/người nhận/đối tượng/version; ngưỡng có version/audit; chuyển tới đối tượng để thực thi. | Chưa có module thay tài khoản nhận tiền/payout để áp dụng phê duyệt. Không tự suy rộng hỗ trợ mọi thao tác tài chính. |
| Bảo mật & phiên — `/admin/security` | TOTP, tạo lại mã khôi phục, đổi yếu tố MFA; passkey WebAuthn theo cấu hình; xem/thu hồi phiên thiết bị; sự kiện bảo mật; xử lý đề nghị phục hồi MFA theo quyền và xác minh độc lập. | Passkey phụ thuộc môi trường hỗ trợ. Kiểm thử chữ ký dùng authenticator phần mềm; chưa nghiệm thu khóa phần cứng/email production. |

Trang phụ:

- `/admin/login`: mật khẩu → challenge → TOTP/passkey/mã khôi phục; mật khẩu đơn lẻ chưa tạo phiên admin. Có đăng ký MFA lần đầu và đề nghị khôi phục.
- `/admin/storefront/preview`: xem trước nháp trang chủ theo quyền.
- `/account-help`: trang người dùng xác minh bằng mật khẩu và OTP email để gửi kháng nghị/yêu cầu dữ liệu khi tài khoản bị khóa; là đầu vào cho admin, không phải mục menu quản trị.

## 2. Những phần chưa có console admin đầy đủ

Đối chiếu router với handler API hiện tại, không suy diễn chức năng từ component cũ hoặc tên permission:

| Nhóm | Hiện có ở mức nào | Phần còn thiếu chính |
| --- | --- | --- |
| Tồn kho/reservation | Xem SKU/tồn trong hồ sơ sản phẩm; nghiệp vụ giữ/commit/release ở Catalog. | Màn reservation theo đơn, phát hiện lệch/quá hạn, đối soát/điều chỉnh có chứng từ. |
| Giao nhận/COD | Trạng thái đơn và nghiệp vụ backend liên quan COD. | Console vận đơn, các mốc hãng giao, chênh lệch COD, đối soát thu hộ. |
| Payment/đối soát | Summary và giao dịch thành công; backend có endpoint reconciliation nội bộ. | Console mọi trạng thái, webhook, truy vấn provider, phiên đối soát và điều tra chênh lệch. |
| Refund độc lập | Hậu mãi, approval, queue REFUND và giao dịch hoàn thành công. | Console đầy đủ quản trị mọi refund/provider/retry/chứng từ như nhóm ADM-REFUND yêu cầu. |
| Phí sàn/payout | Có một số tên quyền và thiết kế yêu cầu. | Module phí/settlement, công nợ shop, lịch chi trả, tài khoản nhận tiền và đối soát payout. |
| Voucher/khuyến mãi/Flash Sale | Engagement có nghiệp vụ seller và API nội bộ voucher sàn. | Trang admin mới quản lý chiến dịch toàn sàn; component cũ chưa được router mới sử dụng. |
| Vi phạm nội dung/chat | Báo cáo sản phẩm đã có workspace; Chat có feed báo cáo, queue và thống kê shop. | Không gian kiểm duyệt hội thoại với đoạn tin/chứng cứ và hành động nội dung được phân quyền đầy đủ. |
| CSKH | Ticket/khiếu nại đơn, yêu cầu bổ sung, account help, ghi chú nhóm. | Console đa kênh, bộ mẫu trả lời và quản lý hỗ trợ tổng quát như toàn bộ nhóm ADM-SUPPORT. |
| Media/CMS nâng cao | Editor trang chủ, nháp/preview/publish. | Thư viện media, upload/cắt ảnh trong editor, lịch xuất bản, duyệt nội dung và trang chính sách tổng quát. |
| Thông báo/email | Outbox, thông báo theo vụ việc, nhắc việc queue, sự kiện bảo mật. | Console template, lịch sử gửi hợp nhất, retry/DLQ và chiến dịch gửi hàng loạt. |
| Chatbot | Backend bot, policy/grounding và kiểm soát công cụ đã có test. | Console quản lý FAQ/tri thức, ngân sách/mô hình, thống kê bot và cấu hình có audit. |
| Báo cáo/tìm kiếm/export | Dashboard, tìm từng module, báo cáo hậu mãi, artifact Identity, nhập taxonomy CSV. | Global search, bộ báo cáo toàn sàn, export có job/progress/quyền/retention. Nhập CSV không đồng nghĩa có export. |
| Cấu hình/vận hành | Cấu hình cục bộ về SLA, nhóm, ngưỡng duyệt, duyệt sản phẩm, quy tắc và taxonomy. | Console cấu hình sàn tập trung, health/outbox/job retry và theo dõi lỗi liên service. |

[AdminDashboard.tsx](Frontend/src/pages/Admin/AdminDashboard.tsx) vẫn import VoucherManagement, PromotionManagement, SellerRequests, BannerManagement… nhưng router hiện tại dùng `PlatformOverview` và các trang Platform mới. Vì vậy không tính các component cũ này là tính năng admin đang được cung cấp.

## 3. Quyền và trạng thái local đọc lại

Nguồn quyền: [admin-rbac.js](Backend/packages/contracts/admin-rbac.js). Có tám vai trò nghiệp vụ: `system_admin`, `operations`, `customer_support`, `moderator`, `finance`, `marketing`, `content_editor`, `auditor`; thêm `legacy_admin` để chuyển đổi tài khoản cũ. Vai trò `system_admin` không mặc nhiên có toàn bộ quyền nghiệp vụ. `platform_admin` đơn lẻ cũng không đủ: cần assignment và phiên MFA hợp lệ.

Menu và nút phụ thuộc quyền. Backend kiểm tra quyền/scope hiện tại; ẩn nút không thay thế bảo vệ API. Các thao tác quan trọng dùng lý do, version, request ID, audit và transaction/chống lặp tùy luồng.

Đọc database cấu hình development bằng transaction **READ ONLY**, không đọc thông tin đăng nhập hoặc dữ liệu cá nhân:

| Hạng mục | Kết quả ngày 28/10/2026 | Ý nghĩa |
| --- | --- | --- |
| Assignment admin | Chỉ có 1 assignment `legacy_admin`. | Chưa cấu hình vai trò nghiệp vụ mới. Việc tài khoản không thấy finance/privacy/quyền nhạy cảm là phù hợp với quyền hiện tại; chưa đăng nhập E2E để khẳng định menu runtime. |
| Nhóm ghi chú | support/trust/privacy đều 0 thành viên. | Chức năng có mã và test nhưng chưa cấu hình người dùng thực tế. |
| Trưởng nhóm queue | 0/4 nhóm có `leader_id`. | Chưa đủ cấu hình nghiệm thu chuyển cấp thực tế. |
| Nguồn queue | orders/cases có timestamp; payment/chat `NOT_CONFIGURED`, `updated_at=NULL`. | Chưa vận hành đủ bốn nguồn queue. |
| Identity migration | Đến `022_user_privacy_receipts.sql`. | Có schema quản lý người dùng/privacy; không chứng minh luồng đã hết lỗi. |
| Order migration | Đến `024_case_queue_sla_policy.sql`. | 024 áp SLA cấu hình khi tạo case mới; không đồng bộ hạn sau pause/resume về case. |
| Catalog migration | 014–020 đã có trong bảng migration local. | Schema sản phẩm và taxonomy mới đã áp dụng; vẫn cần runtime mới và quyền tương ứng. |
| Duyệt sản phẩm trước đăng | `approval_required=false`, version 0. | Tính năng có nhưng chính sách chưa bật. |

Không tự nâng quyền hoặc thêm thành viên/trưởng nhóm để biến kiểm thử thành kết quả thành công.

## 4. Các vấn đề cần giữ mở

1. **USER-010:** mã hiện tại vẫn cho `start` đưa hồ sơ `WAITING_CLEANUP` về `IN_REVIEW`; worker chỉ hoàn thành hồ sơ còn ở `WAITING_CLEANUP` dù đã đánh dấu job xong. Lỗi đã được tái hiện trong [rà soát 27/10](ADMIN_SECTIONS_7_8_REVIEW.md); lần này đối chiếu lại service/worker thấy điều kiện vẫn còn, không ghi là đã sửa. Ngoài ra phạm vi tự động vẫn chủ yếu Identity.
2. **QUEUE-004:** trigger cộng thời gian dừng vào hạn work item; không thấy cập nhật tương ứng `admin_cases.due_at`. Migration 024 chỉ xử lý hạn mặc định khi tạo case. Lỗi lệch hạn đã tái hiện ngày 27/10 vẫn cần regression test và sửa nguồn hạn thống nhất.
3. **RBAC test cleanup mới phát hiện khi chạy lại:** 13 bài con PostgreSQL/HTTP đều qua nhưng suite cha lỗi trong `finally` khi xóa shop còn được `catalog.store_decisions` tham chiếu (`23503`, `store_decisions_store_id_fkey`). Tổng kết 18 pass / 1 fail. Nguồn: [admin-rbac.integration.test.js](Backend/services/identity-service/tests/admin-rbac.integration.test.js), dòng xóa `catalog.stores` trong cleanup. Đây là lỗi dọn fixture trên database test với schema mới; chưa chứng minh một lỗi phân quyền thực tế và không được ghi bộ RBAC đã qua hoàn toàn.
4. **Cấu hình vận hành:** thiếu Payment/Chat queue, trưởng nhóm, thành viên ghi chú và vai trò nghiệp vụ; chưa có E2E toàn bộ bằng tài khoản local với cấu hình đó.
5. **Giới hạn chức năng:** seller verification STORE-010 và các console nêu ở mục 2 chưa được hoàn thiện chỉ bằng việc có permission/API nội bộ.

Lần này không thêm probe tái hiện mới cho hai lỗi đầu; phân biệt kết quả rà mã hiện tại với bằng chứng tái hiện trong báo cáo trước. Các suite hiện có qua không phủ được mọi chuyển trạng thái và tình huống đồng bộ hạn.

## 5. Kiểm tra đã chạy trong lần rà soát này

| Bộ kiểm tra | Kết quả | Phạm vi bằng chứng |
| --- | --- | --- |
| Frontend `npm run build` | Qua typecheck và Vite build. | Còn cảnh báo bundle JS lớn (~1,42 MB trước gzip). |
| Frontend session/policy/command | 20 pass, 0 fail. | 17 bài identityApi và 3 bài policy/command. |
| Identity test mặc định | 47 pass, 9 skip, 0 fail. | Các bài DB không được truyền URL test trong lượt này bị skip; không tính là pass. |
| Catalog test mặc định | 5 pass, 9 skip, 0 fail. | Sau đó chạy helper taxonomy đầy đủ bên dưới. |
| Order test mặc định | 15 pass, 4 skip, 0 fail. | Sau đó chạy helper dashboard và hậu mãi bên dưới. |
| Payment test mặc định | 4 pass, 0 fail/skip. | Kiểm tra hợp đồng/adapter, không gọi provider tiền thật. |
| Engagement test mặc định | 13 pass, 3 skip, 0 fail. | Các integration thiếu DB được ghi skip. |
| Chat test mặc định | 58 pass, 3 skip, 0 fail. | Mongo integration chưa cấu hình cho lượt này. |
| Catalog helper `test-taxonomy.mjs` | **55 pass, 0 fail/skip.** | Database `admin_taxonomy_test`, migrate Identity/Catalog/Order/Engagement; gồm sản phẩm, cửa hàng, storefront, search/inventory và taxonomy. |
| USER helper | **18 pass, 0 fail/skip.** | Database `admin_user_management_test`, PostgreSQL/API. |
| Dashboard/Queue helper | **12 pass, 0 fail/skip.** | Database `admin_dashboard_queue_test`, PostgreSQL/API/finance. |
| Return/Case helper | **45 pass, 0 fail/skip.** | Database `order_admin_returns_test`, hậu mãi/HTTP/CLI. |
| Auth helper | **21 pass, 0 fail/skip.** | Database `admin_auth_test`, MFA/phiên/phục hồi/passkey với chữ ký thật trong test. |
| RBAC helper | **18 pass, 1 fail, 0 skip.** | Database `admin_rbac_test`; lỗi cleanup như mục 4. |
| Browser dashboard/queue | Qua desktop/mobile. | API fixture, không phải E2E backend đang chạy. |
| Browser người dùng | Qua desktop/mobile. | API fixture: masking/quyền, tác động khóa, phiên, ghi chú, kháng nghị/account help. |
| Browser cửa hàng | Qua desktop/mobile. | API fixture: impact/retry, restore, hồ sơ, seller resubmit/appeal. |
| Browser sản phẩm | Qua desktop/mobile. | API fixture: chọn trang, bulk preview/job, version, snapshot, seller appeal, buyer report, quyền đọc. |
| Browser taxonomy | Qua desktop/mobile. | API fixture: cây/chu trình/preview, thuộc tính, merge brand, CSV, seller specs, URL cũ. |

Các lượt mặc định và helper có bài trùng nhau; không cộng chúng để tuyên bố tổng số kịch bản độc lập. Các script browser được gọi trực tiếp, không chạy bước đồng bộ ghi đè các file JavaScript đang có thay đổi.

Log helper lưu local tại `.tmp/admin-review-{taxonomy,users,dashboard,returns,auth,rbac}.log`. Script `.tmp/admin-review-state.mjs` chỉ đọc các trạng thái tổng hợp nêu trên. Không gửi thư thật, xuất bản trang chủ, tạo lệnh tiền thật hoặc thay đổi chính sách trên dữ liệu nghiệp vụ.

## 6. Nguồn đối chiếu

- [API Identity / người dùng](Backend/services/identity-service/src/routes/user-admin.routes.js), [auth](Backend/services/identity-service/src/routes/auth.routes.js).
- [API Catalog](Backend/services/catalog-service/src/server.js), [Order](Backend/services/order-service/src/server.js), [Payment](Backend/services/payment-service/src/server.js), [Engagement](Backend/services/engagement-service/src/server.js).
- [MFA và phiên](Backend/docs/admin-auth.md), [RBAC](Backend/docs/admin-rbac.md), [nguyên tắc admin](Backend/docs/admin-core.md).
- [Nghiệm thu dashboard/queue](ADMIN_DASHBOARD_QUEUE_ACCEPTANCE.md), [người dùng](ADMIN_USER_MANAGEMENT_ACCEPTANCE.md), [cửa hàng](ADMIN_STORE_MANAGEMENT_ACCEPTANCE.md).
- [Sản phẩm/kiểm duyệt](Backend/docs/product-moderation.md), [taxonomy](Backend/docs/taxonomy-administration.md), [hậu mãi](Backend/docs/admin-cases.md), [giải quyết vụ việc](Backend/docs/case-resolution.md).
- [Yêu cầu phát triển](ADMIN_PLATFORM_REQUIREMENTS.md): dùng đối chiếu phần còn thiếu, không coi mọi checkbox chưa đánh dấu là hoàn toàn chưa có mã và không coi mọi checkbox đã đánh dấu là E2E đã đạt.
