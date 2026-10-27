# Phân quyền và phê duyệt quản trị

Ngày nghiệm thu phát triển: **27/10/2026, Asia/Bangkok**. Áp dụng cho API quản trị hiện có trong Identity, Catalog, Storefront, Order và CASE/Return. Chưa nghiệm thu production hoặc giao dịch với provider tiền thật.

## Trạng thái mục 4

| Yêu cầu | Kết quả trong mã nguồn |
| --- | --- |
| ADM-RBAC-001 | API nghiệp vụ kiểm permission; `platform_admin` riêng lẻ không cấp quyền. Identity nạp mapping hiện tại từ database cho mỗi request. |
| ADM-RBAC-002 | Danh mục `resource.action` tách read/create/update/moderate/approve/execute/export/view_sensitive. Xuất người dùng và tài chính chưa được cấp cho vai trò mặc định nào. |
| ADM-RBAC-003 | Manifest và mapping liệt kê từng quyền, không dùng wildcard. Permission/module không có mapping bị từ chối. |
| ADM-RBAC-004 | Nhiều vai trò được hợp quyền theo từng grant. Cấm tự sửa quyền qua HTTP; thay vai trò kiểm version, ghi audit và thu hồi toàn bộ refresh/access session. Cấm tự duyệt theo user ID, không theo vai trò đang chọn. |
| ADM-RBAC-005 | Ngoại lệ ngoài hạn có người đề nghị và người duyệt độc lập; hoàn tiền và hủy đơn có nghĩa vụ tiền vượt ngưỡng dùng hàng chờ duyệt. **Chưa đóng toàn bộ yêu cầu:** hệ thống hiện chưa có module thay tài khoản nhận tiền. Thao tác `payout_account_change` bị từ chối cho tới khi có adapter nghiệp vụ và nghiệm thu riêng. |
| ADM-RBAC-006 | Kiểm quyền ở tạo, duyệt, thực thi và retry; đọc lại quyền hiện tại của người tạo/người duyệt/người thực thi qua Identity. Worker và context cung cấp cho Payment kiểm tra lại trước khi phát lệnh hoàn tiền từ quyết định của admin hoặc ngoại lệ. |
| ADM-RBAC-007 | Fingerprint gắn operation, đối tượng, số tiền, người nhận, scope, phiên bản và chính sách. Ngoại lệ lưu tiền tính từ item/reservation snapshot, không lấy tiền từ client. Thay thông tin làm yêu cầu duyệt không dùng được. |
| ADM-RBAC-008 | Scope shop, loại hồ sơ và nhóm người xử lý nằm trong SQL của danh sách/count/chi tiết/báo cáo; kiểm lại dưới transaction lock khi mutation và trước trả receipt retry. Các điều kiện loại hồ sơ/người xử lý của đơn phải khớp cùng một hồ sơ. |
| ADM-RBAC-009 | `/admin/staff-access` hiển thị quyền hiệu lực, nguồn vai trò, từng scope và giới hạn; tách assignment lưu sẵn với quyền hiệu lực của tài khoản đang bị khóa. |

## Vai trò mặc định

Mapping chuẩn nằm ở [admin-rbac.js](../packages/contracts/admin-rbac.js). Các quyền chưa có module thực thi chỉ là tên dành trước, không tự tạo API hoặc mở đường thay đổi dữ liệu.

| Role | Phạm vi mặc định |
| --- | --- |
| `system_admin` | Nhân sự, cấu hình ngưỡng và audit; không có quyền duyệt/thực thi tiền |
| `operations` | Shop/product/order read, điều phối hồ sơ, đề nghị hủy đơn và báo cáo; không tự thực thi tiền |
| `customer_support` | Ticket/khiếu nại, đọc trả hàng và chứng cứ theo phân công; đơn chỉ đọc được qua hồ sơ của mình hoặc nhóm người xử lý được giao |
| `moderator` | Kiểm duyệt shop/product, xử lý hồ sơ/kháng nghị; không thực thi hoàn tiền hoặc xuất tài chính |
| `finance` | Đề nghị/duyệt/thực thi hoàn tiền và lệnh tài chính hiện có; không sửa nội dung bán hàng hoặc cấp quyền |
| `marketing` | Tên quyền khuyến mãi và đọc báo cáo; không xuất người dùng hoặc đọc hồ sơ riêng |
| `content_editor` | Đọc/tạo/lưu/xuất bản Storefront và danh mục; không truy cập người dùng/giao dịch |
| `auditor` | Đọc báo cáo/audit/chính sách; không có quyền export hoặc mutation |

Một người có thể nhận nhiều vai trò. Grant của mỗi vai trò giữ nguyên scope riêng: OR giữa các grant, AND giữa các điều kiện của một grant. Scope rỗng là toàn sàn, phải được người cấp quyền chọn rõ. Scope hỗ trợ `storeIds`, `caseKinds` (`RETURN`, `TICKET`, `DISPUTE`), `assigneeIds` (một nhóm người xử lý). Chiều scope không hỗ trợ ở tài nguyên đó bị từ chối, không bỏ qua để mở toàn sàn. Dashboard/audit/CMS toàn sàn chỉ nhận grant toàn sàn.

`users.export`, `finance.export`, `users.view_sensitive` không nằm trong mapping mặc định. Có `read` không tự có `export` hoặc bỏ che PII. `evidence.supervise` cũ vẫn là điều kiện giám sát bổ sung, cần cả `cases.view_sensitive`; không tự mở quyền xem ảnh.

## Chuyển đổi và cấu hình

Migration Identity `017_admin_rbac.sql` chỉ gán `legacy_admin` cho tài khoản có `platform_admin` **tại lúc migration chạy**. Mapping này giữ các màn quản trị phổ thông, không cấp quản lý vai trò, tài chính, xuất dữ liệu hoặc dữ liệu nhạy cảm. Tài khoản được thêm `platform_admin` sau đó không có quyền nếu thiếu assignment. Không tự nâng các tài khoản thật lên `finance` hoặc `system_admin`.

Migration Order: `020_admin_rbac_approvals.sql`, `021_exception_approval_binding.sql`, `022_return_admin_authorization.sql`. Ngưỡng ban đầu trong database bằng **0 VND**: mọi số tiền dương cần duyệt độc lập. Người có `approval_policy.update` có thể sửa ngưỡng bằng API/màn phê duyệt với version và lý do. Đổi chính sách làm mất hiệu lực yêu cầu chưa thực thi; không dùng lại yêu cầu cũ. Lệnh nghiệp vụ đã commit giữ biên nhận chính sách tại lần thực thi; worker vẫn kiểm tra dữ liệu tiền và quyền hiện tại trước khi gọi Payment. Ngoại lệ luôn cần hai người, không phụ thuộc ngưỡng. Đề nghị ngoại lệ cũ thiếu `approval_snapshot` phải bị từ chối rồi lập lại.

Identity và Order cần dùng cùng một **`ADMIN_AUTHORIZATION_TOKEN` riêng**, cấu hình qua môi trường và khởi động lại hai dịch vụ. Compose đã khai báo biến này. Thiếu token hoặc Identity không trả quyền hiện tại thì bước tài chính bị chặn, không bỏ qua kiểm tra.

Để bootstrap quản trị nhân sự, operator dùng [admin-roles.mjs](../services/identity-service/scripts/admin-roles.mjs), JSON trên stdin, ví dụ hợp đồng:

```json
{
  "userId": "UUID-nhan-vien",
  "version": 1,
  "assignments": [{"role": "system_admin", "scope": {}}],
  "operator": "ma-nguoi-van-hanh",
  "reason": "Cap vai tro quan tri nhan su theo phan cong da xac nhan"
}
```

`assignments` thay toàn bộ danh sách cũ; phải dùng version hiện tại, không mặc định giữ vai trò cũ. CLI và API đều audit/thu hồi phiên. CLI dành cho operator có quyền vận hành môi trường, không xuất thành API tự cấp quyền. CLI tạo tài khoản mới nhận `adminRoles`; mặc định chỉ `system_admin`. Chưa chạy bootstrap/cấp thêm quyền cho tài khoản thật trong đợt này.

## API và thao tác

| API | Quyền chính |
| --- | --- |
| `GET /api/v2/admin/staff?q=&id=` | `staff.read` hoặc directory tối thiểu cho `cases.read` |
| `GET /api/v2/admin/staff/:id/access` | `staff.read` |
| `PUT /api/v2/admin/staff/:id/access` | `staff.update`; body `{assignments,version,reason,requestId}` |
| `GET /api/v2/admin/approvals?operation=` | `refunds.read` hoặc `orders.read` tương ứng operation |
| `POST /api/v2/admin/approvals` | `refunds.create`/`orders.create`; body `{operation,targetId,version,reason,requestId}` |
| `POST /api/v2/admin/approvals/:id/review` | `refunds.approve`/`orders.approve`; body `{action,version,reason}` |
| `GET /api/v2/admin/approval-policies` | `approval_policy.read` |
| `PUT /api/v2/admin/approval-policies/:operation` | `approval_policy.update`; body `{version,thresholdMinor,reason}` |

Operation được hỗ trợ: `return_approve`, `cancel_paid_order`. Snapshot được lấy từ service sở hữu dữ liệu; client không nhập số tiền/người nhận cho yêu cầu duyệt. `approvalId` được chọn trong màn chấp nhận trả hàng hoặc hủy đơn. Biên nhận thực thi, audit và thay đổi nghiệp vụ commit cùng transaction. Một yêu cầu chỉ được thực thi một lần. Lệnh hủy vẫn trả tồn và chuyển nghĩa vụ tiền qua luồng Order/Payment; chấp nhận trả hàng chưa phải xác nhận tiền đã hoàn.

Permission cũ `exception.request`, `exception.approve`, `case.decision.approve`, `case.appeal.review`, `aftersales.intervene`, `orders.cancel_blocked` nay là alias của quyền Identity tương ứng. CLI `case-permission.mjs` từ chối grant/revoke các quyền nghiệp vụ này và hướng operator sang Identity, không báo thành công khi quyền thực tế không thay đổi. `evidence.supervise` vẫn được quản lý riêng. API capabilities trả alias để tương thích các màn CASE hiện có.

## Bằng chứng kiểm thử

- RBAC PostgreSQL/HTTP và contract: **19 pass**, không skip. Gồm cấm CSKH hoàn tiền, cấm biên tập quản lý quyền/xuất người dùng, không tự duyệt bằng nhiều vai trò, thu hồi phiên/quyền giữa các bước, ràng buộc số tiền/người nhận/version, worker trước Payment, query scope, retry, đồng thời và rollback audit.
- Admin management PostgreSQL/HTTP: **15 pass**; Catalog regression **8 pass, 1 skip** (Storefront chạy riêng).
- CASE/Return PostgreSQL/HTTP/CLI: **45 pass**; Storefront PostgreSQL: **11 pass**.
- Unit regression Identity/Catalog/Order/Payment: **60 pass, 16 skip** khi không đặt database test URL; các suite admin cần DB được chạy riêng như trên.
- Frontend policy/command: **3 pass**; build và lint các file thay đổi đạt. Typecheck toàn frontend còn **22 diagnostic** trong file legacy ngoài phần thay đổi. Chưa nghiệm thu giao diện mới bằng thao tác trình duyệt.

Chạy bộ mới trên database `admin_rbac_test` riêng:

```powershell
docker exec backend-v2-dev-identity-service-1 node services/identity-service/scripts/test-admin-rbac.mjs
```

Các bộ hồi quy cũ dùng principal được cấp quyền tường minh và ngưỡng cao trong **database test riêng** để giữ mục tiêu kiểm thử nghiệp vụ; bộ RBAC mới kiểm tra ngưỡng 0, người duyệt độc lập và nguồn quyền Identity thật. Không gọi provider chuyển/hoàn tiền thật.
