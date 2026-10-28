# Rà soát lại mục 7 và 8 — 27/10/2026

**Kết luận: chưa xong hết.** Các suite hiện có qua không đủ để xác nhận toàn bộ luồng và cấu hình đang chạy. Rà soát đã phát hiện hai lỗi chức năng, một giới hạn phạm vi cần lưu ý và các điều kiện vận hành local chưa hoàn tất.

Lần rà soát này kiểm tra mã, chạy lại test, đọc cấu hình/trạng thái tổng hợp của database local và tái hiện các tình huống bổ sung trong database `_test` với transaction được rollback. Không thay đổi quyền nhân sự, cấu hình trưởng nhóm hay dữ liệu nghiệp vụ.

## Lỗi đã tái hiện

### 1. ADM-USER-010 — trạng thái hồ sơ ẩn danh có thể bị kẹt

- Khi hồ sơ ở `WAITING_CLEANUP`, API vẫn nhận `start` và đổi sang `IN_REVIEW`. Nhánh rà soát lưu trữ cũng có thể đổi sang `WAITING_RETENTION`; nhánh từ chối chưa bị chặn ở giai đoạn này.
- Worker xóa ảnh đánh dấu job `completed_at` trước, nhưng chỉ hoàn thành hồ sơ nếu hồ sơ vẫn ở `WAITING_CLEANUP`.
- Kết quả tái hiện: `startAccepted=IN_REVIEW`, `cleanup_finished=true`, nhưng hồ sơ vẫn `IN_REVIEW`. Job không còn được lấy lại để hoàn thành hồ sơ. Tài khoản đã ẩn danh cũng không thể thực thi ẩn danh lại để thoát trạng thái này.
- Nguồn: [user-workflow.service.js](Backend/services/identity-service/src/services/user-workflow.service.js), [user-admin.worker.js](Backend/services/identity-service/src/services/user-admin.worker.js).
- Cần bổ sung state machine chặn các chuyển trạng thái không hợp lệ sau khi đã thực hiện ẩn danh; cập nhật job và hồ sơ nhất quán, kèm regression test cho các thao tác lúc đang chờ cleanup.

### 2. ADM-QUEUE-004 — hạn SLA hàng chờ lệch hồ sơ nguồn

- Tạm dừng rồi tiếp tục cộng thời gian dừng vào `work_items.resolution_due_at`.
- `admin_cases.due_at` không được cộng cùng khoảng thời gian. Trigger hiện đồng bộ hạn từ case sang queue khi case đổi hạn, không có chiều cập nhật hạn đã kéo dài từ queue về case.
- Kết quả tái hiện sau 2 giờ tạm dừng: `deadline_difference_seconds=7200` giữa queue và hồ sơ gốc. Các màn hình/bộ lọc theo hạn ở module hậu mãi và hàng chờ có thể cho kết quả quá hạn khác nhau.
- Nguồn: [023_dashboard_queue.sql](Backend/services/order-service/database/migrations/023_dashboard_queue.sql), [work-queue.service.js](Backend/services/order-service/src/work-queue.service.js).
- Cần thống nhất nguồn hạn SLA hoặc đồng bộ hạn hiệu lực, rồi kiểm tra cả danh sách case và queue sau pause/resume, phân công và cập nhật từ module nguồn.

## Phạm vi USER-010 hiện có

Xuất tự động hiện lấy dữ liệu Identity; chỉnh sửa tự động hiện là họ tên. Các module Catalog/Order/Payment/Engagement/Chat mới có bản ghi căn cứ, tham chiếu rà soát và ngoại lệ lưu trữ. Chưa có bộ xuất/chỉnh sửa/ẩn danh tự động tổng hợp dữ liệu cá nhân từ toàn bộ các service này.

Vì vậy, không được diễn giải dấu hoàn thành trước đây là đã cung cấp trọn bộ xử lý dữ liệu cá nhân toàn sàn. Giữ USER-010 chưa hoàn thành cho đến khi sửa lỗi trạng thái và chốt/hoàn thiện phạm vi nghiệp vụ cần nghiệm thu.

## Trạng thái vận hành local quan sát được

| Khu vực | Kết quả đọc trực tiếp | Tác động |
| --- | --- | --- |
| Nguồn queue Payment | `error_code=NOT_CONFIGURED`, `updated_at=NULL` | Chưa xác nhận ADM-DASH-003 hoạt động đủ nguồn trên ứng dụng đang chạy. |
| Nguồn queue Chat | `error_code=NOT_CONFIGURED`, `updated_at=NULL` | Báo cáo vi phạm chưa có bằng chứng đồng bộ thực tế vào queue local. |
| Trưởng nhóm queue | 0/4 nhóm có `leader_id` | Chưa có người nhận chuyển cấp thực tế cho ADM-QUEUE-005. |
| Nhóm ghi chú | 0 thành viên ở cả support/trust/privacy | Chưa cấu hình người sử dụng ghi chú trong môi trường local. |
| Vai trò nhân sự | Một assignment `legacy_admin`; chưa có vai trò nghiệp vụ mới | Tài khoản hiện tại không được cấp các quyền riêng về liên hệ đầy đủ, phiên, privacy và cấu hình nhóm. Đây là quyền bị từ chối đúng thiết kế, không được tự nâng quyền để làm test trông như thành công. |
| Migration Identity | Có 021 và 022 trong bảng migration | Schema đã được áp dụng; điều này không thay thế nghiệm thu luồng vận hành. |

Endpoint hỗ trợ tài khoản đang trả `401/SUPPORT_PROOF_REQUIRED`; Order/Payment trả `401/UNAUTHORIZED` khi không có bearer; Chat health trả 200. Đây chỉ là kiểm tra service có phản hồi, chưa phải E2E có đăng nhập và dữ liệu thật.

## Đối chiếu từng yêu cầu

“Qua kiểm thử hiện có” dưới đây là kết quả trong phạm vi test/fixture đã chạy, không khẳng định không còn lỗi hoặc đã vận hành đủ cấu hình.

| Yêu cầu | Kết quả rà soát |
| --- | --- |
| DASH-001 | Có bộ lọc và metadata thời gian; qua kiểm thử hiện có. |
| DASH-002 | Có drilldown giữ bộ lọc; browser kiểm tra thẻ/lát/điểm biểu đồ. |
| DASH-003 | Có adapter/queue; chưa nghiệm thu đủ nguồn local vì Payment/Chat chưa đồng bộ. |
| DASH-004 | Có định nghĩa chỉ số và phân biệt shop order; qua kiểm thử hiện có. |
| DASH-005 | Tách giá trị đơn, tiền thu và tiền hoàn; phí sàn chưa có nguồn nghiệp vụ, được ghi rõ. |
| DASH-006 | So sánh kỳ trước và xử lý mẫu số 0; qua kiểm thử hiện có. |
| DASH-007 | Có quyền/phạm vi backend và ẩn tài chính với CSKH; qua kiểm thử hiện có. |
| DASH-008 | Có lỗi/thời gian trễ/thử lại riêng; qua kiểm thử hiện có. |
| QUEUE-001 | Có các trường công việc theo yêu cầu; qua kiểm thử hiện có. |
| QUEUE-002 | Có nhận/phân công/chuyển nhóm/lý do/version; qua kiểm thử cạnh tranh nhận việc. |
| QUEUE-003 | Có các bộ lọc theo yêu cầu; qua kiểm thử hiện có. |
| QUEUE-004 | **Chưa đạt:** tái hiện được hạn queue và case không nhất quán. |
| QUEUE-005 | Có worker và chống thông báo trùng; chưa cấu hình trưởng nhóm để nghiệm thu chuyển cấp thực tế. |
| QUEUE-006 | Có tách việc hành động và số liệu tham khảo; qua kiểm thử hiện có. |
| USER-001 | Có tìm kiếm, masking, quyền và audit liên hệ; qua kiểm thử hiện có. |
| USER-002 | Có liên kết theo quyền module và bộ lọc; qua kiểm thử hiện có. |
| USER-003 | Có lý do, hạn và đếm vi phạm; phạm vi khóa hiện hỗ trợ ACCOUNT. |
| USER-004 | Có xem tác động trước khóa và chặn UI khi tải tác động lỗi; qua kiểm thử hiện có. |
| USER-005 | Không tự xác minh email khi khôi phục; qua kiểm thử hiện có. |
| USER-006 | Có gửi luồng reset theo quyền/rate limit; OTP không trả cho admin; chưa nghiệm thu gửi thư thực tế của luồng mới. |
| USER-007 | Có cách ly ghi chú theo nhóm; qua test nhóm khác; local chưa có thành viên được cấu hình. |
| USER-008 | Có xác minh, gắn quyết định và reviewer độc lập; qua kiểm thử hiện có. |
| USER-009 | Có quyền xem/thu hồi phiên và audit không lộ token; qua kiểm thử hiện có. |
| USER-010 | **Chưa đạt đầy đủ:** lỗi state/cleanup và phạm vi tự động hiện giới hạn Identity. |
| USER-011 | Có tín hiệu IP/liên hệ và không tự khóa/gộp; qua kiểm thử hiện có. |

## Kiểm tra chạy lại

- Dashboard/Queue PostgreSQL/API: **12/12 qua**.
- USER PostgreSQL/API: **18/18 qua**.
- Frontend build/typecheck và browser desktop/mobile: chạy lại trong đợt rà soát này. Browser dùng API fixture, không thay thế E2E với các service/role/cấu hình đang dùng.
- Probe bổ sung đã tái hiện hai lỗi nêu trên dù các suite hiện có qua. Cần chuyển các probe thành regression test khi sửa lỗi.

Hai mục `ADM-QUEUE-004` và `ADM-USER-010` đã được bỏ dấu hoàn thành trong yêu cầu gốc. Các dấu `[x]` khác chỉ giữ ý nghĩa phạm vi triển khai/kiểm thử đã mô tả; các điều kiện cấu hình và nghiệm thu thực tế còn thiếu phải được hoàn tất trước khi xác nhận cả hai phần đã xong.
