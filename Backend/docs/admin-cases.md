# Admin CASE-001 đến CASE-008

> Cập nhật phân quyền 27/10/2026: [RBAC, chuyển đổi tài khoản và CLI](admin-rbac.md) thay các hướng dẫn cấp quyền bằng `platform_admin`/`case-permission.mjs` bên dưới. Quyền nghiệp vụ hiện do Identity quản lý; CLI CASE chỉ còn quản lý giám sát chứng cứ.

Ngày nghiệm thu local: 26/10/2026. Không có mã CASE-000 trong checklist gốc. Phạm vi này mở rộng đợt quản trị trả hàng trước đó và không bao gồm console thực chi/hoàn tiền.

> Đã triển khai tiếp CASE-009 đến 018: [quyết định, nghĩa vụ, can thiệp, kháng nghị và báo cáo](case-resolution.md). Tài liệu tiếp theo thay các giới hạn tương ứng của đợt đầu được ghi bên dưới.

## Màn hình và cách dùng

| Đường dẫn | Công việc |
| --- | --- |
| `/admin/returns` | Danh sách/chi tiết trả hàng, quyết định xem xét/chấp nhận/từ chối |
| `/admin/cases?kind=DISPUTE` | Khiếu nại/tranh chấp, trạng thái riêng và liên kết hồ sơ |
| `/admin/cases?kind=TICKET` | Ticket hỗ trợ, trạng thái riêng và liên kết hồ sơ |
| `/admin/return-exceptions` | Đề nghị/duyệt ngoại lệ ngoài thời hạn trả hàng |

Danh sách hỗ trợ trạng thái, lý do, shop, người phụ trách, việc của tôi/chưa phân công, quá hạn/chưa quá hạn, phương thức thanh toán và khoảng ngày. Tìm kiếm theo ID hồ sơ/đơn/checkout, tên shop; ticket/khiếu nại thêm tiêu đề. Bộ lọc lưu trong URL, phân trang 1–50 mục/trang; frontend dùng 12 mục.

Để phân công: mở chi tiết → chọn người phụ trách/hạn → nhập lý do → lưu. Có thể nhận hồ sơ cho chính mình. Chỉ cho giao người khác sau khi Identity xác nhận tài khoản đó đang active và có role `platform_admin`. Hạn mặc định 48 giờ từ lúc tiếp nhận là lựa chọn triển khai ban đầu, không phải SLA tự động bồi thường. Nếu hồ sơ đã quá hạn, giao diện đề xuất hạn mới và ghi lý do khi lưu.

## Trạng thái tách biệt và liên kết

- **Trả hàng:** giữ state machine Order hiện có, không dùng endpoint ticket để thay trạng thái.
- **Ticket:** `NEW → IN_PROGRESS → WAITING_CUSTOMER/RESOLVED → CLOSED`; có thể quay lại `IN_PROGRESS` từ chờ khách hoặc đã giải quyết.
- **Khiếu nại/tranh chấp:** `OPEN → INVESTIGATING → AWAITING_DECISION → DECIDED → CLOSED`; `DECIDED/CLOSED` phải qua quy trình quyết định/đóng hồ sơ mới, không được ép bằng endpoint trạng thái tổng quát.
- Link tạo ticket/khiếu nại trong hồ sơ sẽ gắn cùng đơn và liên kết hai hồ sơ. Backend từ chối link khác đơn.
- Tạo hồ sơ có `clientRequestId`: gửi lặp cùng key/nội dung trả về cùng hồ sơ; đổi nội dung với key cũ nhận 409.
- Chuyển trạng thái ticket/khiếu nại không tự hủy đơn, sửa snapshot hoặc tạo bất cứ lệnh tiền nào. Quy trình tranh chấp CASE-014 đã có ở [module quyết định](case-resolution.md).

## Chính sách 7 ngày và lượng/tiền được trả

- Lấy **lần giao thành công đầu tiên** từ lịch sử Order; sự kiện giao lặp không kéo dài cửa sổ trả hàng.
- Bản policy ban đầu là `RETURN_7D_V1`, 7 ngày. Request lưu `policy_version`, `window_days`, `delivered_at_snapshot` và `exception_id` nếu có.
- Bảng policy có thời điểm hiệu lực; không có form/API thay policy trong đợt này. Bản mới phải đi qua quyết định triển khai được duyệt, có hiệu lực rõ ràng và không backdate để thay quyền lợi của đơn cũ.
- API buyer không tin `windowDays` hoặc `exceptionId` do client gửi để bỏ qua thời hạn.
- Lock shop order khi tạo trả hàng để tuần tự hóa các request đồng thời.
- Tổng lượng đã giữ/đã trả theo item không vượt lượng mua. Giá trị dùng snapshot tiền hàng đã giảm; phân bổ phần dư vào lượng cuối bằng phép tính nguyên.
- Tổng tiền mới + tiền các yêu cầu chưa hoàn + số đã hoàn không vượt giá trị đơn. Tiền đã hoàn xác nhận qua return và số tổng trên Order được đối chiếu bằng mức lớn hơn để không đếm hai lần trong lúc đồng bộ.
- Khi từ chối, ghi mốc giải phóng lượng/tiền. Đóng một yêu cầu đã từ chối không được làm lượng bị giữ trở lại; đóng yêu cầu đã hoàn vẫn giữ lượng đã trả.
- Giữ chính sách phí ship hiện có: chỉ hoàn khi trả toàn bộ trong một yêu cầu, lý do hàng hỏng/giao sai, và chưa được hoàn phí ship trước đó.

## Ngoại lệ ngoài hạn: quyền riêng và hai người

Ba permission được lưu tại Order, kiểm tra lại phía server và không tự cấp cho mọi tài khoản admin:

| Permission | Công dụng |
| --- | --- |
| `exception.request` | Tiếp nhận và đề nghị ngoại lệ cho đơn quá hạn |
| `exception.approve` | Duyệt/từ chối ngoại lệ của người khác |
| `evidence.supervise` | Giám sát chứng cứ ngoài các hồ sơ được giao |

Mọi endpoint vẫn yêu cầu Identity xác minh tài khoản active và role admin hiện tại. Quyền riêng có thể có ngày hết hạn hoặc bị thu hồi. Một tài khoản có cả hai quyền ngoại lệ vẫn không tự duyệt được; người mua cũng không được duyệt ngoại lệ cho chính đơn của mình.

### Cấp/thu hồi quyền qua CLI

Không có endpoint để người dùng trình duyệt tự nâng quyền. Người vận hành có thẩm quyền xác nhận đúng UUID của admin đang active, rồi dùng stdin. Ví dụ dưới đây chỉ là mẫu, thay UUID/nhãn người vận hành trước khi thực hiện:

```powershell
$casePermission = @'
{"userId":"11111111-1111-4111-8111-111111111111","permission":"exception.request","action":"grant","operator":"nguoi-van-hanh","reason":"Phan cong tiep nhan ngoai le tra hang theo quy trinh"}
'@
$casePermission | docker exec -i backend-v2-dev-order-service-1 node services/order-service/scripts/case-permission.mjs
```

Dùng người khác với `exception.approve` để duyệt. Thu hồi bằng cùng lệnh, `action:"revoke"`. Có thể thêm `expiresAt` là ISO timestamp trong tương lai khi cấp. Quyền và lịch sử cấp/thu hồi được ghi trong cùng transaction. Script từ chối chạy nếu thiếu database URL; không in secret. Triển khai không tự cấp quyền riêng cho các tài khoản hiện có.

### Luồng ngoại lệ

1. Người có quyền đề nghị nhập mã đơn → xem mốc giao/policy → chọn item/lượng → nhập nội dung của khách và căn cứ ngoại lệ.
2. Hệ thống chỉ tiếp nhận đơn đã giao, thực sự quá hạn; đề nghị chưa giữ lượng hoặc tạo refund.
3. Người có quyền duyệt xem policy/mốc giao gốc, item/lượng, nội dung khách và căn cứ; nhập lý do quyết định.
4. Khi duyệt, kiểm tra lại quyền người duyệt/người đề nghị, version, policy/mốc giao, lượng và ngân sách trong transaction.
5. Thành công tạo đúng một return request, snapshot policy gốc, gắn exception và ghi trạng thái ngoại lệ `CONSUMED`. Không sửa ngày giao, không trực tiếp chi tiền.
6. Khi từ chối, lưu người quyết định/lý do/thời điểm và không tạo yêu cầu trả hàng. Request xử lý lặp/stale bị từ chối.

## Chứng cứ theo vụ việc, URL có hạn

- Chỉ assignee hiện tại hoặc người có `evidence.supervise` được cấp quyền xem ảnh.
- Nhận link bằng POST có lý do. URL chứa token ngẫu nhiên; DB chỉ lưu hash, actor, hồ sơ, ảnh, lý do và hạn 60 giây.
- Tải ảnh vẫn cần bearer đang hợp lệ. Link gắn đúng actor/case/image, dùng một lần, kiểm tra lại phân công/quyền và hạn phía server.
- Đổi phân công thu hồi các grant cũ. Hết hạn, dùng lại, sai actor hoặc đổi owner đều không trả bytes.
- Ghi audit trước khi cấp/trả ảnh; audit lỗi rollback và không trả ảnh. Response `private, no-store`; frontend thu hồi blob URL khi hết hạn hoặc đóng chi tiết.
- Upload của buyer/seller tiếp tục kiểm tra ảnh thực, MIME, tối đa 2 MB/ảnh, tối đa 6 ảnh/hồ sơ, normalize bằng image pipeline và quét ClamAV trước khi lưu. Scanner không sẵn sàng/nhiễm lỗi thì không chấp nhận ảnh.

## Bổ sung thông tin cho buyer/seller

- Admin mở bất kỳ hồ sơ đang xử lý → chọn buyer hoặc seller → ghi rõ thông tin cần bổ sung và hạn phản hồi.
- Prompt, bên nhận, thời hạn và người tạo được lưu riêng. Mỗi phản hồi là bản ghi mới; không có API ghi đè prompt hoặc nội dung đã gửi.
- Ghi thông báo `CaseInformationRequested.v1` vào Order outbox cùng transaction với prompt/audit. Engagement gửi thông báo in-app/email bằng hai template riêng, đúng bên được yêu cầu.
- Buyer/seller mở trang chi tiết đơn, phần **Thông tin sàn cần bổ sung**. Server xác minh buyer của đơn hoặc membership seller và chỉ trả prompt dành cho bên đó.
- Reply có version để chặn gửi trùng/stale. Chấp nhận phản hồi muộn để giữ thông tin, hiển thị quá hạn; không tự thay hạn hoặc xóa lịch sử. Hồ sơ kết thúc không nhận reply mới.
- Prompt/reply là trao đổi với các bên. Nhật ký phân công và các event nội bộ không được trả trong API participant.

## API

Prefix `/api/v2`, Order Service. Danh tính actor lấy từ phiên Identity, không từ body.

| Method/path | Chức năng |
| --- | --- |
| `GET /admin/cases` | List theo `kind=RETURN/TICKET/DISPUTE`, q/status/reasonCode/storeId/assigneeId/due/paymentMethod/from/to/page/limit |
| `GET /admin/cases/:id` | Root record, liên kết, informationRequests/replies, event và quyền xem chứng cứ |
| `GET /admin/cases/capabilities` | Các permission riêng hiện có của người đang đăng nhập |
| `GET /admin/cases/staff?q=...` | Tối đa 50 admin active từ Identity để phân công |
| `POST /admin/cases` | `{kind,shopOrderId,subject,description,reasonCode,relatedCaseId?,clientRequestId}`; chỉ TICKET/DISPUTE |
| `PATCH /admin/cases/:id/assignment` | `{assigneeId:null hoặc UUID,dueAt,version,reason}` |
| `POST /admin/cases/:id/status` | `{status,version,reason}`; chỉ trạng thái của loại hồ sơ tương ứng |
| `POST /admin/cases/:id/information-requests` | `{recipientKind:BUYER hoặc SELLER,prompt,dueAt,version}` |
| `GET /admin/cases/order-context/:orderId` | Item/lượng, mốc giao gốc và policy để đề nghị/duyệt ngoại lệ; không trả địa chỉ |
| `GET /admin/return-exceptions` | Tối đa 100 đề nghị của mình hoặc thuộc quyền duyệt |
| `POST /admin/return-exceptions` | `{shopOrderId,payload:ReturnInput,reason,clientRequestId}` |
| `POST /admin/return-exceptions/:id/decisions` | `{action:approve hoặc reject,version,reason}` |
| `POST /admin/returns/:id/evidence/:imageId/access` | `{reason}` → `{url,expiresAt}` |
| `GET /admin/returns/:id/evidence/:imageId?grant=...` | Bytes ảnh; bearer + grant một lần + quyền vụ việc hiện tại |
| `GET /orders/:orderId/cases` | Danh sách hồ sơ/thông tin dành cho đúng buyer/seller của đơn |
| `POST /cases/:caseId/information-requests/:requestId/replies` | `{message,version}` của đúng bên nhận |

`due=overdue/upcoming`; `assigneeId=me/unassigned/UUID`. Ngày `from/to` theo UTC+7, bao gồm cả ngày cuối. Deadline gửi dưới dạng ISO có timezone, ở tương lai và tối đa 366 ngày. Text có giới hạn và không nhận HTML. Trường lạ bị từ chối ở các command có schema.

Endpoint `/admin/returns` trước đây vẫn sử dụng được, mở rộng các filter queue và trả thông tin phân công/hạn. API detail có thêm `case`; API evidence cũ dùng query `reason` không còn đủ quyền tải ảnh, phải lấy grant mới.

## Migration và nghiệm thu

- Order `014_admin_cases.sql`: policy/snapshot, mốc giải phóng/hoàn, root case và child ticket/dispute, trigger backfill/tự tạo case cho return, link, event, permission, exception, information thread và grant ảnh.
- Order `015_ticket_reasons.sql`: lưu/lọc đúng lý do ticket; không bỏ qua lựa chọn của người tạo.
- Engagement `008_case_information.sql`: template thông báo buyer/seller, in-app và email.
- Không sửa ID, ngày giao, giá hoặc snapshot thương mại hiện có. Backfill đánh dấu yêu cầu đã từ chối/hoàn và tạo root case cho yêu cầu trả hàng cũ.

```powershell
docker exec backend-v2-dev-engagement-service-1 npm run engagement:migrate
docker exec backend-v2-dev-order-service-1 npm run order:migrate
docker restart backend-v2-dev-order-service-1 backend-v2-dev-engagement-service-1
docker exec backend-v2-dev-order-service-1 node services/order-service/scripts/test-admin-returns.mjs
```

Helper test chỉ chạy ở development, migrate `order_admin_returns_test` riêng và dọn fixture. Kiểm thử bao gồm state machine tách biệt, lọc, hai người/thu hồi quyền, cửa sổ 7 ngày và snapshot, đồng thời lượng/tiền, từ chối rồi đóng, round tiền, link ảnh hết hạn/sai actor/đổi owner, quét ảnh và lịch sử thông tin/đúng bên nhận.

Kết quả gồm đợt mở rộng: **44 test PostgreSQL/HTTP/CLI đạt, không skip**; 6 test notification đạt. Build frontend và lint các màn/API được kiểm tra đạt. Typecheck toàn frontend vẫn có 22 lỗi cũ ngoài các file của phần này; Vite còn cảnh báo bundle lớn.

Nghiệm thu browser dùng dữ liệu/permission và actor QA trong database test. Đăng nhập admin dùng Identity thật; các thao tác nghiệp vụ được chuyển tới API gắn database test, bao gồm adapter participant QA để kiểm tra component buyer. Sau đó có kiểm tra chỉ đọc API admin trên stack local. Không thay đổi hồ sơ khách hoặc cấp quyền riêng vào database đang dùng.

## Giới hạn còn thuộc các yêu cầu tiếp theo

- G0 RBAC theo nhóm nhân sự/MFA chưa hoàn tất; quyền cấp đặc biệt trong module này không thay thế gói G0.
- Chưa có giao diện đổi policy hoặc module đổi hàng `REPLACEMENT` tự động. Nhận hàng theo chứng cứ khi seller bị khóa/quá hạn đã có qua permission can thiệp.
- Quyết định bên chịu trách nhiệm, đề xuất/duyệt tranh chấp, kháng nghị và nghĩa vụ đã có; console chi tiền/settlement provider là phạm vi riêng.
- Hạn xử lý hiện có để phân công/lọc, chưa có đồng hồ SLA tạm dừng/tự chuyển cấp hoặc bồi thường.
- Chưa triển khai production; số liệu/khả năng provider thật cần nghiệm thu môi trường riêng.

Theo dõi các mục tiếp theo trong [ADMIN_PLATFORM_REQUIREMENTS.md](../../ADMIN_PLATFORM_REQUIREMENTS.md).
