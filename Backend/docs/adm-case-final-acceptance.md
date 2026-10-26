# Biên bản chốt ADM-CASE-001 đến ADM-CASE-018

Ngày kiểm tra: **26/10/2026 (UTC+7)**.

Kết luận: **18/18 yêu cầu hoàn thành trong phạm vi local**. Không phát hiện lỗi chặn chốt qua đối chiếu mã nguồn, chạy lại kiểm thử và nghiệm thu trình duyệt. Các ô hoàn thành ở mục 15 của [tài liệu yêu cầu](../../ADMIN_PLATFORM_REQUIREMENTS.md) được giữ nguyên.

## Đối chiếu từng yêu cầu

| Yêu cầu | Kết quả kiểm tra lần cuối | Bằng chứng chính |
| --- | --- | --- |
| CASE-001 | Đạt: hàng chờ riêng, lọc trạng thái/lý do/shop/assignee/hạn/phương thức thanh toán | `admin-cases.test.js`: `001 list/filter`; Edge tìm kiếm và danh sách rỗng |
| CASE-002 | Đạt: đúng đơn, item, lượng, các bên và tiền từ snapshot | `admin-cases.test.js`: `002 order item/money/context`; `admin-returns.test.js`: chi tiết hồ sơ |
| CASE-003 | Đạt: return/ticket/dispute có trạng thái riêng, liên kết cùng đơn | `admin-cases.test.js`: `003 separate ticket/dispute states and links`; Edge ticket/dispute liên kết |
| CASE-004 | Đạt: policy 7 ngày theo lần giao đầu, giữ snapshot/version | `admin-cases.test.js`: `004 seven-day policy`; kiểm tra policy local `RETURN_7D_V1` |
| CASE-005 | Đạt: quyền ngoại lệ riêng, hai người độc lập, kiểm tra lại quyền khi duyệt | `admin-cases.test.js`: CLI, explicit permissions, permission revocation; Edge ngoại lệ |
| CASE-006 | Đạt: giới hạn lượng và tiền khi đồng thời, làm tròn và giải phóng đúng | `admin-cases.test.js`: hai bài `006`; `case-resolution.test.js`: mở lại không vượt reservation |
| CASE-007 | Đạt: grant ảnh có hạn/dùng một lần/đúng actor và scope; validation, scan và audit | `admin-cases.test.js`: hai bài `007`; Edge ảnh private; quét ảnh trực tiếp qua ClamAV local |
| CASE-008 | Đạt: prompt có hạn, đúng bên nhận, phản hồi và lịch sử giữ riêng | `admin-cases.test.js`: `008 immutable prompts/replies`; notification unit; Edge participant reply |
| CASE-009 | Đạt: phân công/chuyển cấp, nội bộ và công khai tách biệt | `case-resolution.test.js`: `009 internal/public separation`; kiểm thử gửi trùng và audit |
| CASE-010 | Đạt: quyết định giữ bên chịu trách nhiệm, policy, lý do, chứng cứ, snapshot | `case-resolution.test.js`: `010 decisions retain responsibility`; Edge quyết định |
| CASE-011 | Đạt: quyết định không tự hoàn tiền, nghĩa vụ tiền chờ Payment xác nhận | `case-resolution.test.js`: `010` và `011/012/014 verified Payment result` |
| CASE-012 | Đạt: FULL/PARTIAL, tiền hàng/ship, snapshot và tổng đã hoàn | `case-resolution.test.js`: `011/012/014`; kiểm thử prorate/rounding của CASE-006 |
| CASE-013 | Đạt: gửi/nhận, inspection, chờ hoàn và can thiệp seller quá hạn | `case-resolution.test.js`: hai bài `013`; Edge receipt/refund intervention |
| CASE-014 | Đạt: tường trình, chứng cứ, đề xuất cố định và duyệt độc lập; không tự sửa tiền | `case-resolution.test.js`: `014 proposed decisions freeze facts`; Edge independent decision review |
| CASE-015 | Đạt: assignee có quyền tiếp tục hậu mãi khi shop/chủ shop bị khóa | `case-resolution.test.js`: `013/015 overdue or blocked seller`; trạng thái shop giữ nguyên |
| CASE-016 | Đạt: guard version/trạng thái, callback lặp, receipt muộn và mở lại có kiểm soát | `case-resolution.test.js`: `016/017`, `016 reopening`; kiểm thử cạnh tranh |
| CASE-017 | Đạt: thời hạn appeal, người xét độc lập và lịch sử quyết định được giữ | `case-resolution.test.js`: `016/017 appeal`; Edge buyer appeal và independent appeal review |
| CASE-018 | Đạt: nhóm lý do/shop/category snapshot, thời gian xử lý, tỷ lệ kháng nghị đã xét | `case-resolution.test.js`: `018 report`; Edge case reports |

Các file kiểm thử: [admin-cases.test.js](../services/order-service/tests/admin-cases.test.js), [admin-returns.test.js](../services/order-service/tests/admin-returns.test.js), [case-resolution.test.js](../services/order-service/tests/case-resolution.test.js), [notification.test.js](../services/engagement-service/tests/notification.test.js).

## Ba điều kiện nghiệm thu bắt buộc

1. **Hai hồ sơ không trả cùng số lượng vượt giới hạn:** kiểm thử đồng thời lượng/tiền và mở lại hồ sơ sau kháng nghị đạt. Lượng đang giữ và đã hoàn được kiểm tra theo item và đơn.
2. **Từ chối không phát sinh hoàn tiền:** kiểm thử không phát `RefundRequested.v1` hoặc lệnh chấp nhận khi từ chối đạt; receipt tới muộn bị chặn.
3. **Có quyết định hoàn vẫn chờ thực hiện:** kiểm thử giữ `WAITING_FULFILLMENT`/nghĩa vụ `PENDING` trước xác nhận đạt. Sự kiện Payment hợp lệ mới hoàn tất; sự kiện lặp không cộng tiền lần hai.

## Kết quả chạy lại

| Kiểm tra | Kết quả |
| --- | --- |
| PostgreSQL/HTTP/CLI toàn bộ CASE | **44 pass, 0 fail, 0 skip** trên `order_admin_returns_test` |
| Notification unit | **6 pass** |
| Frontend phiên/quyền admin | **14 pass**, gồm hồi quy lỗi refresh `429` |
| Edge desktop/mobile | Tìm kiếm, chi tiết, ảnh private, duyệt trả hàng, phản hồi participant, ticket/dispute, duyệt độc lập, kháng nghị/xét lại, receipt/refund, báo cáo, ngoại lệ, reload phiên và API admin local đạt; **0 runtime exception** |
| Frontend build | Đạt; còn cảnh báo bundle lớn |
| Lint các màn/API CASE và auth được kiểm tra | Đạt |
| Typecheck toàn frontend | Còn **22 lỗi có sẵn ngoài các file CASE được kiểm tra**; không có diagnostic ở các file CASE/auth được kiểm tra |
| Order local | Đã có migration `013`–`017`; không có return thiếu case, liên kết sai đơn hoặc nghĩa vụ tiền hoàn tất khi thiếu `refund_confirmed_at` tại thời điểm đọc |
| Engagement local | Đã có migration `008`–`009`; cả bốn template thông tin/cập nhật buyer/seller đủ `IN_APP` và `EMAIL` |
| Media local | ClamAV đang chạy nhận và quét ảnh PNG thử thành công |
| Dọn dữ liệu | Không còn đơn thuộc các fixture QA được kiểm tra trong database test |

Chạy lại kiểm thử dữ liệu bằng:

```powershell
docker exec backend-v2-dev-order-service-1 node services/order-service/scripts/test-admin-returns.mjs
```

Helper tạo/migrate database test riêng và dùng fixture ngẫu nhiên. Thao tác UI dùng server Order thử với database này; đăng nhập Identity local thật. Người duyệt/participant bổ sung dùng adapter QA, không tạo nhân sự hoặc cấp quyền trên database đang dùng. Kiểm tra stack local ngoài fixture là chỉ đọc. Bộ kiểm thử không chi tiền thật.

## Giới hạn của kết luận

- Đây là chốt phát triển và nghiệm thu **local**, chưa phải xác nhận triển khai production hoặc chuyển tiền thật qua provider. Callback Payment trong kiểm thử được giả lập có kiểm soát.
- Permission ngoại lệ/giám sát/duyệt/xét lại/can thiệp cần cấp rõ cho nhân sự bằng CLI; không tự cấp quyền cho tài khoản hiện có. Cách cấp và thu hồi nằm trong [case-resolution.md](case-resolution.md) và [admin-cases.md](admin-cases.md).
- G0 RBAC/MFA toàn sàn, console tài chính/COD/VietQR, settlement, tích hợp vận chuyển và xử lý các lỗi TypeScript cũ là phạm vi riêng. Không dùng việc chốt CASE để đánh dấu hoàn thành các nhóm đó.
- Migration, cấu hình quyền/tích hợp và nghiệm thu môi trường triển khai phải được kiểm tra tại môi trường đó trước khi mở vận hành thật.
