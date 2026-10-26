# CASE-009 đến CASE-018 — xử lý, quyết định và kháng nghị

Nghiệm thu local ngày 26/10/2026. Tài liệu tiếp nối [CASE-001 đến 008](admin-cases.md); không có thao tác xác nhận tiền đã chuyển chỉ dựa trên quyết định của nhân viên.

## Các màn hình

- `/admin/returns?id=<UUID>`: đọc tiến trình, breakdown tiền hàng/ship, quyết định trả hàng có căn cứ, nghĩa vụ, can thiệp và kháng nghị.
- `/admin/cases?kind=DISPUTE&id=<UUID>`: tường trình/chứng cứ các bên, đề xuất cố định, người khác duyệt/công bố, thực hiện nghĩa vụ và xét lại.
- `/admin/case-reports`: nguyên nhân, thời gian xử lý và tỷ lệ kháng nghị được chấp nhận, nhóm/lọc theo shop hoặc danh mục snapshot.
- Trang đơn buyer/seller có **Xử lý hậu mãi và kháng nghị**: xem thông báo công khai, gửi tường trình/ảnh, xem quyết định và gửi kháng nghị còn hạn.

Luồng mới nằm trong phần **Luồng xử lý và quyết định** của chi tiết hồ sơ. Các nhóm thao tác dùng panel mở/đóng để giữ trang đọc được trên desktop/mobile.

## Quyền và phân công

Mọi API nhân viên tiếp tục yêu cầu Identity xác minh admin hiện tại. Ghi chú, chuyển cấp, lập đề xuất, thực hiện nghĩa vụ hoặc can thiệp cần assignee hiện tại; nhân viên không dùng quyền vận hành để xử lý hồ sơ của chính mình ở vai trò buyer.

| Permission riêng | Người sử dụng | Quy tắc |
| --- | --- | --- |
| `case.decision.approve` | Người duyệt tranh chấp | Khác người đề xuất, buyer, owner/member của shop liên quan |
| `case.appeal.review` | Người xét kháng nghị | Khác người đề xuất/người duyệt gốc, người kháng nghị, buyer và nhân sự shop liên quan |
| `aftersales.intervene` | Nhân viên hậu mãi | Phải đang được giao hồ sơ, đủ điều kiện nghiệp vụ và có lý do/chứng cứ |

Cấp/thu hồi qua `services/order-service/scripts/case-permission.mjs`, cùng cơ chế stdin và audit như [hướng dẫn quyền ngoại lệ](admin-cases.md#cấpthu-hồi-quyền-qua-cli). Không tự cấp các quyền mới cho tài khoản hiện có. Trong thực tế, tranh chấp và kháng nghị có thể cần ba tài khoản được giao công việc khác nhau.

Phê duyệt/từ chối trả hàng thông thường không phải lệnh chi tiền: assignee có thể công bố quyết định trực tiếp, nhưng bắt buộc ghi bên chịu trách nhiệm, policy và căn cứ. Tranh chấp sử dụng bước đề xuất/người khác duyệt riêng.

## Ánh xạ trạng thái

`admin_cases.workflow_status` theo dõi công việc; không thay enum của `return_requests`, `disputes`, `support_tickets` hoặc Payment.

| Công việc | Workflow | Nguồn/điều kiện |
| --- | --- | --- |
| Mới tiếp nhận | `NEW` | Return `REQUESTED`, ticket `NEW`, dispute `OPEN` |
| Đang xem xét | `IN_REVIEW` | Review/xác minh hoặc quay lại sau xét kháng nghị |
| Chờ thông tin | `WAITING_INFORMATION` | Có yêu cầu bổ sung; prompt/reply giữ nguyên lịch sử |
| Chờ phê duyệt | `AWAITING_APPROVAL` | Có đề xuất; dữ kiện/version cố định |
| Đã quyết định | `DECIDED` | Quyết định công bố; chưa ghi nhận giải quyết hoặc còn thời hạn hậu kiểm |
| Chờ thực hiện nghĩa vụ | `WAITING_FULFILLMENT` | Trả hàng/kiểm tra/hoàn tiền hoặc khắc phục khác còn chờ |
| Đã giải quyết | `RESOLVED` | Nghĩa vụ đã hoàn tất theo nguồn có thẩm quyền hoặc không phát sinh nghĩa vụ |
| Đóng | `CLOSED` | Không còn nghĩa vụ/kháng nghị mở và hết hạn tiếp nhận theo policy |

Trigger đồng bộ tiến trình từ trạng thái nghiệp vụ. Khi Payment xác nhận `REFUNDED`, các nghĩa vụ tiền tham chiếu đúng return được hoàn tất; hồ sơ liên quan đang chờ thực hiện được đồng bộ. Không dùng việc container/HTTP còn chạy làm bằng chứng tiền đã chuyển.

## CASE-009: nhận việc, chuyển cấp và trao đổi

- Giữ nhận việc/phân công/hạn của đợt trước; chuyển cấp cần chọn admin active khác, hạn mới và lý do.
- Lưu cấp, người cũ/người mới, tác giả và thời điểm; thu hồi các grant ảnh khi đổi người phụ trách.
- Ghi chú `INTERNAL` chỉ trả cho API admin, không có bên nhận, không tạo thông báo cho khách.
- Thông báo `PUBLIC` chọn buyer, seller hoặc cả hai; nội dung được lưu riêng và gửi outbox. API participant chỉ trả đúng nhóm người nhận.
- `clientRequestId` + hash nội dung chống gửi trùng; key cũ khác nội dung bị từ chối. Update có version và audit cùng transaction.

## CASE-010/014: quyết định có căn cứ

Phiếu quyết định lưu:

- Người đề xuất, người duyệt/công bố và các thời điểm.
- `responsible_party`: buyer, seller, vận chuyển, sàn hoặc chưa xác định; không tự suy đoán lỗi một bên.
- `policy_version`, lý do và diễn giải cơ sở bằng chứng; khi không đủ chứng cứ phải ghi rõ căn cứ kết luận.
- Tham chiếu tường trình, ảnh case hoặc ảnh return thuộc hồ sơ/liên kết cùng đơn; backend từ chối chứng cứ ngoài phạm vi.
- Phương án, return được tham chiếu nếu có và snapshot số tiền/ship/version. Không lấy giá hoặc danh mục hiện tại để sửa đơn cũ.

### Trả hàng thông thường

`POST /admin/returns/:id/decisions` vẫn nhận `review/approve/reject`. `approve/reject` bổ sung bắt buộc `responsibleParty`, `policyVersion`, `basisSummary`, `evidenceRefs`. UI đã cập nhật; client cũ thiếu căn cứ bị từ chối, cần tải lại frontend.

### Tranh chấp

1. Ghi nhận yêu cầu/tường trình mỗi bên, ảnh đã kiểm tra/scan và lịch sử.
2. Assignee lập đề xuất. Snapshot/version cố định, chỉ một đề xuất chờ duyệt trên mỗi hồ sơ.
3. Người có quyền duyệt độc lập công bố hoặc từ chối. Người đề xuất có thể rút đề xuất, giữ lịch sử.
4. Có dữ kiện/version mới thì không công bố đề xuất cũ; rút và lập lại. Trạng thái `DECIDED` không được ép qua API chuyển trạng thái tổng quát.
5. Phương án `NO_COMPENSATION` không phát sinh lệnh tiền. `OTHER_REMEDY` tạo nghĩa vụ khắc phục có chứng cứ hoàn tất. `REFUND_EXISTING_RETURN` chỉ tham chiếu return đã liên kết, đủ giai đoạn nhận/chờ hoàn/đã hoàn, cố định tiền từ nguồn đó.
6. Công bố ghi nghĩa vụ và thông báo; không sửa tiền, không đánh dấu paid/refunded và không gọi provider chỉ vì có quyết định.

Tường trình/ảnh là bản ghi riêng của actor/party. Không có API sửa lời các bên hoặc sửa nội dung quyết định đã công bố. Dữ liệu quyết định admin cũ được chuyển thành bản ghi lịch sử, ghi rõ thiếu trường xác định lỗi trước đây thay vì bịa dữ liệu; không kéo dài hạn kháng nghị khi backfill.

## CASE-011/012: hoàn tiền đúng nguồn

- Màn hình phân biệt FULL/PARTIAL, tiền hàng, phí ship đủ điều kiện, tổng đơn đã hoàn và thời điểm xác nhận.
- Giữ logic snapshot, prorate và giải phóng lượng/tiền của CASE-006; không có input để tùy ý sửa số tiền.
- Quyết định chấp nhận trả hàng tạo nghĩa vụ chờ buyer gửi/seller nhận, chưa tạo refund.
- Xác nhận nhận hàng lưu inspection `ACCEPTED` hoặc `ISSUE_FOUND`. Chấp nhận mới mở `REFUND_PENDING`; có vấn đề giữ `RECEIVED` để xác minh.
- Nhận hàng theo API cũ không có kết quả riêng giữ ý nghĩa xác nhận chấp nhận của luồng trước, có note phân biệt; UI seller mới yêu cầu kết quả và ghi chú rõ ràng.
- Mở refund phải có chấp nhận trả hàng và inspection chấp nhận. `refund-context` không trả trạng thái sẵn sàng khi thiếu receipt hợp lệ.
- “Hoàn tất nghĩa vụ tiền” chỉ chấp nhận return có xác nhận hoàn thực tế từ Payment. COD chưa có kết quả chi trả vẫn chờ; ảnh chứng từ/đồng ý của admin không được dùng để ép `REFUNDED`.
- Callback tiền được xử lý qua inbox/idempotency hiện có. Test dùng sự kiện Payment giả lập đã kiểm soát; chưa nghiệm thu chuyển tiền thật của provider.

## CASE-013/015/016: theo dõi và can thiệp

Các mốc khởi tạo V1: hạn phản hồi seller theo hạn hồ sơ (mặc định 48 giờ), buyer gửi trả 7 ngày, seller xác nhận nhận trả 72 giờ. Đây là policy triển khai ban đầu, không phải kết luận pháp lý hoặc cơ chế tự động bồi thường.

| Lệnh can thiệp | Điều kiện | Kết quả |
| --- | --- | --- |
| `take_review` | Seller quá hạn phản hồi hoặc shop/chủ shop bị khóa; request đang mới/xem xét | Nhân viên tiếp tục review, không tự chấp nhận hoặc chi tiền |
| `inspect` | Đang gửi trả/đã nhận; seller quá hạn nhận hoặc bị khóa; có chứng cứ thực tế và kết quả kiểm tra | Lưu inspection và `RECEIVED`; quá hạn không được coi là bằng chứng đã nhận |
| `open_refund` | `RECEIVED`, inspection gần nhất chấp nhận, có chấp nhận trả hàng | Gửi vào luồng refund hiện có; vẫn chờ Payment |
| `reopen` | Return đã từ chối/đóng do từ chối, chưa hoàn; quyết định gần nhất có kháng nghị độc lập được chấp nhận | Kiểm tra/giữ lại lượng và tiền, mở `UNDER_REVIEW` để quyết định mới |

Catalog có endpoint nội bộ chỉ đọc `/inventory/stores/:id/aftersales-status`, sau kiểm tra internal token. Order kiểm tra cờ đình chỉ shop và trạng thái chủ shop qua Identity; không ghi/chuyển shop active để xử lý hậu mãi. Endpoint còn cung cấp owner/member ID cho kiểm tra xung đột người duyệt.

Mọi lệnh cần assignee, permission riêng, version case/return và audit. Dùng order/return/case lock để phối hợp với luồng buyer/seller/Payment. Lệnh lặp hoặc tới muộn không ghi thêm receipt/refund lần hai. Sau từ chối không nhận trả hoặc mark refunded bằng sự kiện trạng thái thông thường; chỉ được mở lại sau kháng nghị và kiểm tra reservation. Mở lại thất bại nếu lượng/tiền đã được hồ sơ khác dùng.

Inspection không tự cộng tồn bán được. Quản trị kho/đổi hàng thực tế vẫn thuộc module nghiệp vụ tương ứng.

## CASE-017: kháng nghị

- Buyer hoặc seller của đơn gửi kháng nghị quyết định công bố gần nhất, trong hạn `appeal_until` (V1: 7 ngày từ công bố).
- Mỗi bên một kháng nghị cho mỗi quyết định. Không nhận quyết định đã bị thay thế hoặc đã có kết quả overturn cần đánh giá lại.
- Người có permission xét lại phải nhận việc riêng trên appeal; không phải người đề xuất/duyệt gốc, claimant, buyer hoặc owner/member của shop.
- `SUBMITTED → UNDER_REVIEW → UPHELD/OVERTURNED`, có version, người xét, lý do, căn cứ và thời điểm. Kết quả gửi thông báo công khai.
- Giữ nguyên payload/quyết định gốc. Overturn đưa về đánh giá lại, hủy nghĩa vụ chưa thực hiện của quyết định bị xét lại; không đảo ngược giao dịch đã chi.
- Return đã từ chối không tự khôi phục. Nhân viên đủ quyền dùng `reopen`, kiểm tra lượng/tiền và lập quyết định mới. Không công bố quyết định mới khi còn kháng nghị đang mở.
- Không đóng hồ sơ khi chưa hết hạn, còn kháng nghị hoặc nghĩa vụ mở. Luồng đóng của buyer cũng kiểm tra thời hạn/quyền kháng nghị.

## CASE-018: báo cáo

- Cohort: ngày tạo case theo UTC+7, lọc khoảng ngày/shop/danh mục; gồm return/dispute, không gộp ticket hỗ trợ vào nguyên nhân trả hàng.
- Nhóm theo nguyên nhân, shop hoặc danh mục từ `order_items.product_snapshot_json.categoryId`. Checkout mới ghi category ID vào snapshot; dữ liệu cũ thiếu giữ nhóm `UNKNOWN`, không truy danh mục hiện tại để bịa lịch sử.
- Thời gian xử lý trung bình: từ tạo đến `resolved_at`; chưa giải quyết hiển thị chưa có dữ liệu, không thay bằng 0.
- Tỷ lệ chấp nhận = số `OVERTURNED` / số đã xét (`UPHELD + OVERTURNED`); loại kháng nghị đang chờ khỏi mẫu số.
- Hồ sơ nhiều danh mục được tính riêng ở mỗi nhóm, không cộng các nhóm thành tổng toàn sàn. Giới hạn 500 nhóm hiển thị đã được nêu ở UI.

## API bổ sung

Prefix `/api/v2`, Order Service. Actor từ phiên, không từ body.

| Method/path | Chức năng |
| --- | --- |
| `GET /admin/cases/:id/resolution` | Workflow, quyết định, nghĩa vụ, ghi chú/thông báo, chuyển cấp, chứng cứ, receipt và appeal |
| `POST /admin/cases/:id/messages` | `{visibility,recipientKind?,body,clientRequestId,version}` |
| `POST /admin/cases/:id/escalations` | `{assigneeId,dueAt,reason,version}` |
| `POST /admin/cases/:id/decision-proposals` | `{version,reason,responsibleParty,policyVersion,basisSummary,evidenceRefs,outcome,returnId?}` |
| `POST /admin/cases/:id/decisions/:decisionId/review` | `{action:publish/reject/withdraw,version,reason}` |
| `POST /admin/cases/:id/interventions` | `{action,version,returnVersion,reason,evidenceRefs,condition?}` |
| `POST /admin/cases/:id/fulfillment` | `{version,note,obligationId?,evidenceRefs?}`; tiền bắt buộc kiểm tra Payment |
| `POST /admin/cases/:id/close` | `{version,reason}`; có guard nghĩa vụ/kháng nghị |
| `POST /admin/cases/:id/appeals/:appealId/review` | `{action:claim/uphold/overturn,version,reason,evidenceRefs?}` |
| `POST /admin/cases/:id/evidence/:imageId/access` | Grant ảnh case có hạn và scope, giống cơ chế ảnh return |
| `GET /admin/cases/:id/evidence/:imageId?grant=...` | Bearer + grant một lần, audit trước khi trả bytes |
| `GET /admin/case-reports` | `from,to,storeId,categoryId,groupBy=reason/shop/category` |
| `GET /cases/:id/resolution` | Chỉ nội dung công khai đúng participant; không ghi chú nội bộ/đề xuất chưa công bố |
| `POST /cases/:id/statements` | `{requestedResolution,content,clientRequestId}`; append-only |
| `POST /cases/:id/evidence` | File ảnh tối đa 2 MB, normalize/scan; 12 ảnh/case |
| `GET /cases/:id/evidence/:imageId` | Participant của đúng case, ảnh private/no-store |
| `POST /cases/:id/appeals` | `{decisionId,reason}` trong hạn |

`evidenceRefs` là mảng `{kind:STATEMENT/CASE_EVIDENCE/RETURN_EVIDENCE,id}`. Policy gốc trả hàng và policy giải quyết là hai version riêng. Endpoint admin trạng thái tổng quát không được dùng để ép dispute sang `DECIDED/CLOSED`.

## Migration, kiểm tra và giới hạn

- Order `016_case_resolution.sql`: workflow, policy xử lý, messages/escalations, statements/evidence/grants, decisions, obligations, inspections, appeals, interventions và backfill lịch sử cũ.
- Order `017_case_closure_times.sql`: ghi mốc giải quyết khi đóng, đồng bộ nghĩa vụ theo xác nhận hoàn tiền.
- Engagement `009_case_resolution.sql`: template cập nhật hồ sơ cho buyer/seller.
- Migration đã áp dụng trên Docker local. Code Catalog bổ sung endpoint nội bộ chỉ đọc; không thay quyền bán hoặc trạng thái hiện có.

```powershell
docker exec backend-v2-dev-engagement-service-1 npm run engagement:migrate
docker exec backend-v2-dev-order-service-1 npm run order:migrate
docker restart backend-v2-dev-order-service-1 backend-v2-dev-engagement-service-1 backend-v2-dev-catalog-service-1
docker exec backend-v2-dev-order-service-1 node services/order-service/scripts/test-admin-returns.mjs
```

Kiểm thử PostgreSQL/HTTP/CLI dùng `order_admin_returns_test` riêng; helper từ chối database không có hậu tố `_test`. Callback tiền dùng nguồn giả lập, không chi tiền thật. Browser dùng Identity local để đăng nhập, adapter actor QA cho người duyệt/người xét lại/participant trong server test và dữ liệu test; không tạo nhân sự hoặc cấp quyền mới trên database đang dùng. Có kiểm tra chỉ đọc API admin trên stack local.

G0 RBAC/MFA toàn sàn, console settlement thủ công COD/VietQR, ví/quyết toán, tạo vận đơn/đổi hàng và tích hợp provider production vẫn là phạm vi riêng. Module này không cung cấp nút giả xác nhận đã trả tiền. Chưa triển khai production.
