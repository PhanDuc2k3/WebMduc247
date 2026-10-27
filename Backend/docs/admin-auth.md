# Đăng nhập và quản lý phiên admin

Nghiệm thu phát triển **27/10/2026, Asia/Bangkok**. Phạm vi: Identity, các API quản trị dùng Identity, giao diện admin và kiểm tra quyền ở các service hiện có. Đây chưa phải nghiệm thu production, khóa bảo mật vật lý hoặc dịch vụ email production.

## Đối chiếu mục 5

| Mã | Hành vi đã triển khai |
| --- | --- |
| ADM-AUTH-001 | TOTP 6 số/30 giây, đăng ký và xác minh trước khi kích hoạt; 10 mã khôi phục dùng một lần, chỉ hiển thị khi tạo. Secret mã hóa AES-256-GCM, ràng buộc user ID; mã khôi phục chỉ lưu HMAC hash. |
| ADM-AUTH-002 | Mật khẩu đúng chỉ nhận challenge ngẫu nhiên, hash trong database, đúng mục đích và có hạn 5 phút. Chỉ sau MFA mới có refresh cookie và phiên quản trị. Đăng nhập mua sắm của admin không cấp quyền admin. |
| ADM-AUTH-003 | Xác thực lại bằng mật khẩu cùng TOTP/mã khôi phục/passkey. Đổi quyền, cấu hình ngưỡng, thay MFA, đọc dữ liệu đặc biệt nhạy cảm và các thao tác tài chính được chặn bằng `428 ADMIN_REAUTH_REQUIRED` khi quá thời hạn xác thực lại. |
| ADM-AUTH-004 | Rate limit theo tài khoản/IP cho mật khẩu, MFA, khôi phục và xác thực lại; challenge tối đa 5 lần thử. Lỗi MFA đồng nhất, không trả trạng thái factor/secret khi xác minh thất bại. Lỗi mật khẩu không phân biệt tài khoản không tồn tại, sai mật khẩu hoặc không có quyền admin. |
| ADM-AUTH-005 | Phiên admin tối đa 8 giờ, hết hạn sau 30 phút không hoạt động, cấu hình tại backend. Refresh/polling không kéo dài hạn không hoạt động hoặc thời hạn tối đa. Frontend cảnh báo trước 60 giây. Mutation admin gặp 401/428 không tự phát lại sau đăng nhập/xác thực lại. |
| ADM-AUTH-006 | Màn Bảo mật & phiên hiển thị tất cả phiên còn hiệu lực, kèm 50 phiên hết hiệu lực gần nhất, trình duyệt/IP và thời điểm hoạt động; thu hồi từng family hoặc tất cả. Không truy cập hoặc thu hồi phiên của người khác. |
| ADM-AUTH-007 | Đổi mật khẩu và khóa tài khoản có trigger thu hồi phiên, vô hiệu challenge đang chờ. Đổi quyền qua API/CLI thu hồi phiên; backend luôn đọc quyền hiện tại. Đổi TOTP/tạo lại mã khôi phục thu hồi phiên cũ; thêm/xóa passkey thu hồi các phiên khác. |
| ADM-AUTH-008 | Logout thu hồi family trên server và xóa cookie; cookie cũ vẫn có thể dùng để thu hồi family nếu bearer đã hết hạn. Client xóa token, metadata và pending cache, tháo giao diện admin, đồng bộ logout giữa tab và chặn tự refresh sau logout. Nếu mất mạng, client vẫn xóa dữ liệu và báo chưa xác nhận được việc thu hồi trên server. |
| ADM-AUTH-009 | Khôi phục mất mọi yếu tố cần mật khẩu trước, hồ sơ bằng chứng, người duyệt độc lập có `mfa_recovery.approve` và xác thực lại gần đây. Duyệt thu hồi mọi phiên/factor cũ, gửi thông báo; chủ tài khoản phải đăng nhập lại và xác minh TOTP mới. Rút quyền người duyệt hoặc đổi thông tin bảo mật làm phê duyệt cũ không dùng được. CSKH không được đọc secret hoặc duyệt phục hồi. |
| ADM-AUTH-010 | Nhật ký riêng ghi password/MFA/login thành công/thất bại, trình duyệt mới, xác thực lại, thu hồi phiên, thay quyền/MFA/passkey và khôi phục. Thông báo bảo mật được mã hóa trong email outbox; không ghi OTP/secret/mã khôi phục vào audit. |
| ADM-AUTH-011 | Có passkey WebAuthn làm yếu tố thứ hai sau mật khẩu, đăng ký/xóa sau xác thực lại, kiểm origin/RP ID/UV/challenge/counter bằng SimpleWebAuthn. Bật theo môi trường; TOTP và mã khôi phục vẫn là phương án dự phòng. Không triển khai SSO vì yêu cầu này cho phép chọn passkey hoặc SSO. |

## Chính sách và chuyển đổi

Migration mới: Identity `018_admin_auth.sql`, `019_admin_passkey_reauth.sql`, `020_admin_security_events.sql`. Migration 018 thu hồi các phiên của tài khoản có `platform_admin`: **người quản trị phải đăng nhập lại và đăng ký MFA**. Không tạo secret hoặc đăng ký MFA hộ tài khoản thật; không đặt đường bỏ qua MFA cho tài khoản cũ. Phiên buyer/seller thông thường giữ luồng hiện có.

Các biến môi trường:

| Biến | Mặc định / quy tắc |
| --- | --- |
| `ADMIN_MFA_KEY` | Base64 của 32 byte ngẫu nhiên, độc lập với JWT/mail key; **bắt buộc production**. Dev để trống sẽ dùng HKDF với context riêng từ `IDENTITY_MAIL_KEY`. |
| `ADMIN_SESSION_SECONDS` | `28800` (8 giờ); từ 300 đến 86400 giây |
| `ADMIN_IDLE_SECONDS` | `1800` (30 phút); ít nhất 120 giây, không vượt thời hạn tối đa |
| `ADMIN_REAUTH_SECONDS` | `300` (5 phút); từ 30 đến 900 giây |
| `ADMIN_MFA_LIMIT` | `8` lần trong cửa sổ 15 phút cho mỗi nhóm kiểm tra/tài khoản; giới hạn IP bổ sung gấp 4; từ 1 đến 20 |
| `ADMIN_PASSKEYS_ENABLED` | `false`; đặt `true` khi đội vận hành muốn dùng passkey |

Compose đã nhận các biến trên. Sau cập nhật môi trường phải khởi động lại Identity. Các service còn lại nhận trạng thái MFA/reauth qua `/auth/me`; không tự tin vào role hoặc thời điểm do client gửi. Token nội bộ `ADMIN_AUTHORIZATION_TOKEN` của mục RBAC vẫn dùng để kiểm tra quyền hiện tại của người tạo/người duyệt khi thực thi công việc đã được chấp thuận; nó không phải token đăng nhập của người dùng.

Giữ khóa MFA ổn định và sao lưu ở nơi quản lý bí mật của môi trường. Đổi giá trị khóa mà không tái mã hóa dữ liệu sẽ làm TOTP cũ không đọc được. Không có API đọc secret đang sử dụng, và không dùng email OTP đặt lại mật khẩu để bỏ qua MFA.

Một phiên mua sắm có `platform_admin` trong danh sách role vẫn không có `adminAccess` nếu family chưa có bằng chứng MFA hợp lệ. MFA và phạm vi quyền là hai điều kiện riêng. Thay quyền, khóa nhân sự hoặc đổi mật khẩu có hiệu lực ở backend ngay, không chờ trang reload.

## Luồng thao tác

1. Mở `/admin/login`, nhập email/mật khẩu. API chỉ trả challenge cùng trạng thái cần đăng ký sau khi đã xác minh mật khẩu; không cấp bearer/cookie quản trị ở bước này.
2. Lần đầu, thêm khóa TOTP vào ứng dụng xác thực (khóa thủ công hoặc liên kết `otpauth`), nhập mã và lưu 10 mã khôi phục. Secret chỉ xuất hiện ở bước đăng ký khóa mới.
3. Những lần sau dùng TOTP, một mã khôi phục, hoặc passkey đã đăng ký. Dùng mã khôi phục sẽ thu hồi các phiên trước và thông báo cho chủ tài khoản.
4. `/admin/security` quản lý TOTP, mã khôi phục, passkey, phiên/trình duyệt và nhật ký của mình. Không lưu các mã/challenge trong localStorage/sessionStorage.
5. Khi nhận yêu cầu xác thực lại, nhập mật khẩu và yếu tố thứ hai. Xác minh xong **kiểm tra dữ liệu rồi chủ động gửi lại thao tác**. Hệ thống không giữ hàng đợi mutation để tự gửi sau đăng nhập.

Thời gian không hoạt động được gia hạn bằng heartbeat từ tương tác pointer/keyboard/scroll/focus hoặc nút “Tiếp tục phiên”. Các lần đọc nền và refresh không gia hạn. Gia hạn hoạt động không kéo dài giới hạn tuyệt đối 8 giờ. Tạo lại bộ mã giữ thời điểm xác thực lại và thời hạn tối đa của phiên hiện tại, không dùng việc tạo mã để kéo dài mãi cửa sổ xác thực lại.

`identity_admin_device` là cookie nhận diện trình duyệt ngẫu nhiên, HttpOnly/SameSite=Strict, không phải bằng chứng sở hữu thiết bị vật lý. Phiên mới từ cookie trình duyệt chưa biết được ghi sự kiện và đưa thông báo vào email outbox. Cookie admin/refresh dùng Secure ở production. Trạng thái đăng xuất được đồng bộ giữa tab bằng BroadcastChannel/storage event; marker lưu trên trình duyệt không chứa token hoặc dữ liệu nghiệp vụ.

## Khôi phục MFA khi mất cả ứng dụng và mã

- Người dùng xác minh mật khẩu tại trang login, chọn đề nghị khôi phục và nhập mã hồ sơ danh tính/lý do; không đính secret hoặc mã khôi phục vào hồ sơ.
- Nhân sự được giao `mfa_recovery.approve` xác minh qua quy trình nội bộ, ghi hồ sơ xác minh độc lập, lý do và xác nhận đã kiểm tra danh tính. Người duyệt phải khác chủ tài khoản; không được tự duyệt bằng vai trò thứ hai trong cùng tài khoản.
- Duyệt có version, ràng buộc phiên bản bảo mật/quyền. Thao tác vô hiệu hóa TOTP cũ, hủy mã khôi phục và passkey cũ, thu hồi các phiên/challenge, ghi audit và đưa thông báo tới email chủ tài khoản trong cùng transaction.
- Chủ tài khoản đăng nhập bằng mật khẩu, đăng ký TOTP mới rồi xác minh mã mới. Quyền người duyệt được kiểm lại trước khi hoàn tất. Nếu thông tin/quyền thay đổi, người dùng có thể gửi lại đề nghị; yêu cầu cũ bị đóng, lịch sử vẫn giữ.
- Nếu quản trị viên cuối cùng không còn yếu tố phục hồi, operator có quyền vận hành môi trường phải xác minh bằng quy trình độc lập, ghi lại chấp thuận rồi dùng CLI cấp một tài khoản quản trị được ủy quyền theo [hướng dẫn RBAC](admin-rbac.md). Tài khoản đó vẫn phải tự đăng ký MFA và dùng luồng phê duyệt thông thường. Không có API reset bằng email đơn lẻ, đọc secret hoặc backdoor CSKH.

Hồ sơ danh tính là tham chiếu tới bằng chứng/quy trình xác minh do tổ chức quản lý. Phần mềm ghi người xác nhận, lý do và tham chiếu; không tự kiểm tra giấy tờ hoặc tự coi nội dung người đề nghị là bằng chứng đã được phê duyệt.

## API

Các đường dẫn dưới đây có prefix `/api/v2/auth/admin`.

| Nhóm | API |
| --- | --- |
| Mật khẩu/MFA | `POST /login`, `/mfa/enroll/start`, `/mfa/enroll/confirm`, `/mfa/verify` |
| Phiên | `GET /sessions`, `POST /sessions/revoke`, `POST /activity` |
| Tự bảo mật | `GET /security`, `POST /reauth`, `/mfa/rotate/start`, `/mfa/rotate/confirm`, `/mfa/recovery-codes` |
| Khôi phục có duyệt | `POST /mfa/recovery/request`, `GET /mfa/recovery/requests`, `POST /mfa/recovery/review` |
| Passkey | `POST /passkey/options`, `/passkey/verify`, `/passkey/register/options`, `/passkey/register/verify`, `/passkey/revoke`, `/passkey/reauth/options`, `/passkey/reauth/verify` |

OTP/mã khôi phục không dùng làm bearer. Challenge login không dùng cho rotate/register/reauth. Nonce bị hash, ràng buộc user/security version/access version và cookie trình duyệt; các bước cần phiên còn ràng buộc family. TOTP chặn counter đã sử dụng; mã khôi phục và WebAuthn challenge tiêu thụ nguyên tử trong transaction. Thất bại xác minh vẫn tăng attempt và ghi audit; lỗi audit làm rollback factor/mã/phiên thay vì cấp phiên nửa chừng.

Passkey dùng origin và RP ID từ `FRONTEND_ORIGIN`, không lấy từ client. Cần trình duyệt/context hỗ trợ WebAuthn (HTTPS khi triển khai, localhost khi dev). Chọn user verification bắt buộc, attestation `none`, không tuyên bố chứng thực phần cứng. Thư viện backend/frontend được khóa trong package lock; image backend cần cài dependency mới khi build lại.

## Bằng chứng và cách chạy

- **21 test mới backend**, 0 fail/skip: vector RFC HOTP/TOTP, AAD/encryption, challenge chỉ đúng mục đích, lỗi đồng nhất/rate limit, recovery-code race/reuse, thay MFA/tạo lại mã, rollback audit, phiên/heartbeat/hết hạn, thay quyền/password/hold, recovery độc lập, thông báo mã hóa, WebAuthn chữ ký/origin/RP ID/UV/replay/counter.
- **20 test frontend** cho session/policy/command, 0 fail/skip: password stage không lưu token, MFA mới hoàn tất phiên, logout/xóa cache, phiên tab khác bị thu hồi, không replay mutation và prompt xác thực lại.
- **19 test RBAC PostgreSQL/HTTP**, 0 fail/skip sau thay đổi sang principal đã xác minh MFA. Các bộ hồi quy admin management/CASE/Storefront được chạy riêng.
- **Edge desktop/mobile** trên tài khoản và database test: TOTP, lưu mã, màn bảo mật, đăng ký/đăng nhập passkey bằng authenticator ảo, step-up bằng passkey, không tự gửi lại mutation, tạo lại mã thủ công, logout/reload sạch dữ liệu. Không có runtime exception. Chưa thử khóa phần cứng hoặc email production.
- Frontend build/lint các file AUTH đạt. Bảo trì ngày 27/10/2026 đã sửa toàn bộ 22 diagnostic legacy; typecheck cả app/cấu hình Vite và build đạt. Build hiện bắt buộc typecheck trước khi đóng gói; xem [biên bản bảo trì](typecheck-dependency-maintenance.md).
- Unit regression Identity/Catalog/Order/Payment: **64 pass, 17 skip** khi không đặt các URL database; bộ MFA/RBAC và các bộ quản trị cần DB đã chạy riêng. Admin management: **15 pass**, CASE/Return: **45 pass**, Catalog regression: **8 pass, 1 skip**.
- Kiểm tra lockfile bằng `npm ci --dry-run --ignore-scripts` đạt. Đợt bảo trì ngày 27/10/2026 đã xử lý 9 gói backend bị cảnh báo và 24 gói frontend phát hiện khi mở rộng kiểm tra: audit đầy đủ ở cả hai thư mục đều còn **0 cảnh báo**. Chi tiết phiên bản, phạm vi và hồi quy tại [biên bản bảo trì](typecheck-dependency-maintenance.md).

```powershell
docker exec backend-v2-dev-identity-service-1 node services/identity-service/scripts/test-admin-auth.mjs
docker exec backend-v2-dev-identity-service-1 node services/identity-service/scripts/test-admin-rbac.mjs
```

Helper dùng database `admin_auth_test`/`admin_rbac_test` riêng và không chạy mail worker/provider thật. `--reset` chỉ dùng khi muốn xóa và dựng lại database test có tên cố định của helper; không trỏ helper vào dữ liệu production. Browser QA cũng chỉ dùng tài khoản test, không đăng ký MFA hoặc tạo passkey cho tài khoản thật.

Tham chiếu kỹ thuật: [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238), [RFC 4226](https://www.rfc-editor.org/rfc/rfc4226), [SimpleWebAuthn server](https://simplewebauthn.dev/docs/packages/server), [SimpleWebAuthn browser](https://simplewebauthn.dev/docs/packages/browser).
