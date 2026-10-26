# AI Shopping Assistant trong Chat Service V2

Widget React hiện có gọi `/api/v2/chatbot/sessions/...`. Chat Service dùng Catalog/PostgreSQL, Order và Promotion cho dữ liệu thật, MongoDB cho hội thoại và Claude Haiku qua proxy hiện có cho hiểu ngữ cảnh. Không thay đổi công nghệ, schema PostgreSQL hoặc đường dẫn API.

## Nguyên nhân và kiến trúc

Luồng cũ nhận từ “tìm” trong “tìm hiểu” là tìm hàng, bỏ từ dẫn bằng regex rồi thử cắt ngắn từ khóa khi không có kết quả. Không có kiểm tra loại hàng sau retrieval nên kết quả có vài từ giống nhau có thể là sách hoặc phụ kiện. Từ “shop” được ưu tiên thành tìm cửa hàng, khiến “Shop có điện thoại không?” đi sai luồng. Lịch sử chỉ được chuyển vào một số lời gọi model, không có bộ lọc mua sắm lưu riêng.

Luồng nâng cấp: xác thực phiên → đọc lịch sử/bộ lọc → hiểu ý định → làm rõ hoặc gọi công cụ được phép → kiểm tra dữ liệu/loại hàng → tạo câu trả lời và thẻ từ backend → lưu lịch sử/bộ lọc. Các FAQ rõ ràng vẫn trả lời xác định.

| Module | Trách nhiệm |
| --- | --- |
| `intent-understanding.js` | Tám intent, kế hoạch Claude có schema, validation, fallback và bộ lọc theo hội thoại. |
| `product-relevance.js` | Chuẩn hóa tiếng Việt, alias loại hàng, cây danh mục và chặn sách/phụ kiện sai loại. |
| `shopping-tools.js` | Công cụ đọc, validation đầu vào/đầu ra, bộ lọc do backend kiểm soát và phân quyền đơn. |
| `shopping-response.js` | Tìm hàng/chi tiết/so sánh, làm rõ nhu cầu, xếp lại theo thuộc tính và câu trả lời có căn cứ. |
| `shopping-assistant.js` | Claude tool-use có allowlist, giới hạn vòng/lượt và xử lý lỗi. |
| `service.js` | API/phiên hiện có, lưu trạng thái hội thoại, metadata và chốt quyền truy cập. |

Claude phân biệt `GENERAL_KNOWLEDGE`, `PRODUCT_DISCOVERY`, `PRODUCT_RECOMMENDATION`, `PRODUCT_COMPARISON`, `PRODUCT_DETAIL`, `ORDER_SUPPORT`, `VOUCHER_SUPPORT`, `GENERAL_CONVERSATION`. Kế hoạch sai schema, bị cắt ngắn, hết quota hoặc timeout quay về rule bảo thủ. Câu “tìm hiểu” rõ ràng luôn là kiến thức chung dù model đề xuất tìm hàng. Nhánh kiến thức không có công cụ catalog khả dụng.

## Cấu hình và chi phí

Đặt biến ở backend, ví dụ `Backend/.env.development.local` đã được Git bỏ qua. Không đặt key trong frontend.

```dotenv
CHAT_CLAUDE_BASE_URL=https://1gw.gwai.cloud
CHAT_CLAUDE_API_KEY=<your-proxy-key>
CHAT_CLAUDE_MODEL=claude-haiku-5-5
CHAT_CLAUDE_MODE=selective
CHAT_CLAUDE_MAX_TOKENS=160
CHAT_CLAUDE_DAILY_LIMIT=20
```

Giữ model/proxy đang cấu hình; không tự chuyển model. `selective` phân tích câu hỏi có ngữ cảnh bằng Claude, rồi dùng API trực tiếp cho tìm hàng đơn giản. Tư vấn phức tạp có thể dùng thêm vòng tool-use. Lời chào, FAQ và hỗ trợ tài khoản rõ ràng không cần request phân loại. `all` còn cho phép diễn đạt tìm cửa hàng đơn giản; `off` tắt Claude. Không có key vẫn có fallback bảo thủ, nhưng khả năng hiểu diễn đạt mới bị giới hạn.

Giới hạn ngày đếm **mọi request tới proxy trên một tiến trình**, gồm cả intent, và đặt lại khi tiến trình khởi động lại. Một lượt kiến thức thường cần một request phân tích và một request trả lời; tư vấn phức tạp có thể thêm tối đa ba request tool-use. Giới hạn tổng này vẫn được giữ. Không tự gọi lại request phân tích đã timeout, tránh tính phí lặp.

Proxy dùng `POST /v1/messages`, `x-api-key`, `anthropic-version: 2023-06-01` và cấu hình thinking hiện có. Phân tích tối đa 384 output token, tool-use đầu 256, lượt sau 160. Mỗi request proxy timeout 18 giây, mỗi request dữ liệu timeout 5 giây. Giao thức `input_schema`, `tool_use` và `tool_result` theo [tài liệu Anthropic](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview).

Kiểm tra runtime ngày 25/10 xác nhận proxy vẫn có thể trả `thinking` cùng `tool_use` dù request gửi thinking disabled. Validator cũ từ chối khối này, khiến HTTP 200 vẫn bị fallback. Adapter hiện chấp nhận `thinking`/`redacted_thinking` hợp lệ và giữ nguyên chữ ký khi gửi lại kết quả công cụ, theo [quy tắc thinking của Anthropic](https://platform.claude.com/docs/en/build-with-claude/thinking). Chỉ `text` được dùng trong câu trả lời; không trả hoặc lưu nội dung thinking vào lịch sử công khai. Khối sai cấu trúc hoặc loại không được hỗ trợ vẫn bị từ chối. Lỗi phân tích được log bằng mã lý do, không log prompt/nội dung thinking/API key.

Sau sửa đã xác minh qua HTTP trên Docker dev với Claude thật: liệt kê danh mục → “điện tử” → “cho mình xem 1 số sản phẩm điện tử” đều thành công; hai lượt chọn điện tử nhận 5 thẻ từ Catalog và `aiUsed: true`. Câu “Điện thoại thông minh là gì?” nhận văn bản model, có usage cho cả intent và trả lời, không kèm thẻ. Phiên guest kiểm tra đã được xóa sau khi chạy; không chỉnh lịch sử người dùng.

## Retrieval và câu trả lời

Loại hàng, từ khóa, khoảng giá VND, thương hiệu, tính năng và nhu cầu được tách riêng. “Tôi muốn mua điện thoại” hỏi ngân sách/nhu cầu; “Shop có điện thoại không?” tra catalog; “So sánh iPhone và Samsung” hỏi mẫu cụ thể. Không cắt bớt từ khóa để tìm bằng được kết quả.

Chọn danh mục như “điện tử” hoặc “cho mình xem 1 số sản phẩm điện tử” dùng category ID từ cây danh mục thật để duyệt hàng. Danh mục rộng có thể chứa nhiều loại sản phẩm con; không bắt tên từng mặt hàng phải có chữ “điện tử”. Khi AI lỗi, hai cách diễn đạt này vẫn được xử lý bởi fallback và tra Catalog, thay vì lặp câu giới thiệu mặc định.

Danh mục lấy từ API thật, ưu tiên loại hàng chính xác rồi danh mục cha phù hợp; kiểm tra tên/loại hàng sau retrieval để loại sách/ốp lưng. API Catalog hiện có đã dùng PostgreSQL Full Text Search và `pg_trgm`, giá biến thể hiệu lực, tồn kho khả dụng và trạng thái sản phẩm/shop/danh mục. Backend kiểm tra lại giá, thương hiệu, danh mục và tồn kho của response. Không thêm migration hoặc SQL do model sinh.

Tư vấn xác định theo tính năng đọc chi tiết và xếp lại tối đa năm ứng viên theo mô tả/thuộc tính đã xác minh. Ưu tiên pin có thể xét dung lượng pin được công bố; dung lượng không bảo đảm thời lượng thực tế. Chưa có thông số thì nêu rõ chưa xác nhận tiêu chí. Nhánh Claude có thể gọi thêm chi tiết nhưng không được tự xác nhận tính năng thiếu dữ liệu.

Kết quả rỗng là kết quả hợp lệ, không chuyển sang loại hàng khác. Giá/tồn kho không dùng cache. Thẻ và bảng luôn từ backend; lời giới thiệu model không được ghi đè kết quả rỗng, bịa giá/thông số, hoặc tự chọn mẫu đầu tiên đại diện thương hiệu. Hai tên sản phẩm cần khớp duy nhất trước khi so sánh; trường thiếu ghi “Chưa có dữ liệu”.

## Công cụ và quyền

Registry hỗ trợ `search_products`, `get_product_details`, `compare_products`, `get_product_categories`, `get_order_status`, `get_applicable_vouchers`; giữ `get_voucher_information` tương thích và `get_platform_policy` hiện có. Tất cả chỉ đọc, có schema và validation runtime; khóa thừa bị từ chối. Allowlist theo nhánh được kiểm tra ở backend, không chỉ gửi trong prompt. Tool loop tối đa hai vòng và ba lượt công cụ do model gọi; công cụ tìm hàng có thể đọc thêm cây danh mục.

Giá/tồn kho/rating hoặc response sai kiểu gây lỗi thân thiện, không mặc định thành 0. Tìm hàng loại kết quả hết hàng; trang chi tiết/so sánh vẫn có thể báo hết hàng đúng dữ liệu. Nội dung sản phẩm là dữ liệu không đáng tin cậy, không được dùng làm chỉ dẫn hệ thống.

Tra cứu đơn dùng `user.id` đã được Identity xác thực, không nhận `userId` trong tham số model. Order Service kiểm tra quyền sở hữu qua API nội bộ. Khách chưa đăng nhập không nhận trạng thái đơn; dữ liệu đơn và bearer không gửi cho model. Voucher public không đồng nghĩa đủ điều kiện; validation có bearer mới kiểm tra giỏ thật. Chính sách chưa có nội dung được duyệt nên chỉ dẫn tới trang chính thức và nêu rõ giới hạn.

## Phiên, tương thích và giao diện

MongoDB giữ `bot_sessions` và `bot_messages` hiện có, TTL 24 giờ. Thêm trường nội bộ `shoppingContext` trên tin bot để giữ loại hàng, từ khóa, ngân sách, thương hiệu, tính năng và nhu cầu. Đây là bổ sung tùy chọn trong collection không schema; không cần migration. Phiên cũ không có trường này được dựng lại ngữ cảnh từ tin người dùng gần nhất. Đổi loại hàng bỏ bộ lọc cũ; câu bổ sung thương hiệu/pin giữ ngân sách. Model trả null hoặc reset không có căn cứ không tự xóa ngân sách.

Backend đọc tối đa 12 tin. Intent gửi tối đa sáu tin gần nhất, mỗi tin 250 ký tự; tool loop tối đa bốn tin. Lọc email, điện thoại, mã đơn, khóa API, mật khẩu và địa chỉ có mẫu nhận diện trước khi gửi model/lưu văn bản. Bộ lọc không nhận diện được mọi PII tự do. History do client gửi bị thay bằng history do server đọc từ phiên đã xác thực. `shoppingContext` không được trả qua history hoặc API công khai.

Giữ nguyên POST tạo phiên, GET lịch sử, POST tin nhắn và DELETE phiên. Các trường response cũ được giữ; thêm tùy chọn `suggestedQuestions`, `emptySearch`, `metadata.intent`, `metadata.intentUsage`. `clientMessageId` vẫn dùng chống gửi trùng. Xem [Chat OpenAPI](api/chat.openapi.yaml).

Widget giữ phiên guest trong `sessionStorage`, loading, retry, thẻ và bảng so sánh; thêm câu hỏi gợi ý, nhãn còn/hết hàng và trạng thái không có kết quả. UUID chỉ được gửi như mã đơn khi câu hỏi nói về đơn hàng, nên liên kết sản phẩm không bị hiểu nhầm là đơn. Lịch sử tải lại hiển thị văn bản, không phát lại giá/tồn kho cũ từ thẻ.

## Kiểm tra

```powershell
cd Backend
npm.cmd run chat:test
```

`shopping-upgrade.test.js` bao phủ tám tình huống yêu cầu, phân tích ngữ nghĩa không có từ khóa loại hàng, giữ/reset bộ lọc, timeout, response sai định dạng, prompt injection, tool allowlist và HTTP session sau tạo lại service. Các test hiện có tiếp tục kiểm tra quyền đơn, guest token, socket, idempotency, voucher và so sánh. Claude được giả lập, không tốn quota. HTTP integration dùng server Catalog và repository test; không chứng minh được mọi diễn đạt của model thật.

Kết quả automated tests ngày 25/10/2026: Chat 56 đạt, 0 lỗi, 1 Mongo integration skip; Catalog 1 đạt, 5 integration skip do thiếu database test. Frontend build đạt; typecheck còn 22 lỗi ở các module ngoài chatbot. Automated tests dùng Claude giả lập; kiểm tra runtime riêng dùng Claude thật qua cấu hình proxy hiện có.

Mongo integration cần `CHAT_TEST_MONGO_URL` trỏ database riêng có hậu tố `_test`; thiếu biến sẽ skip. Không dùng database production cho bài này. Smoke test chỉ đọc Catalog local xác nhận câu hỏi điện thoại không nhận sách/ốp lưng và tai nghe dưới 500 nghìn dùng dữ liệu giá/tồn kho thật.

Frontend: `npm.cmd run build`. Typecheck toàn dự án hiện còn lỗi ở các module cũ ngoài chatbot; cần theo dõi riêng, không coi build Vite là typecheck. Chưa nghiệm thu giao diện bằng tự động hóa trình duyệt.

## Giới hạn và kế hoạch tích hợp

- Search dùng semantic intent + category/alias + FTS/trigram và xếp lại ứng viên, chưa có vector embeddings. Alias bảo thủ có thể bỏ sót hàng có tên lạ khi thiếu danh mục; cần đánh giá recall trên catalog thật trước khi mở rộng.
- Tính năng/nhu cầu là ưu tiên xếp hạng, không phải mọi tiêu chí đều được catalog xác nhận. Cần chuẩn hóa thuộc tính theo danh mục trước khi bổ sung bộ lọc cứng cho pin/camera/hiệu năng.
- Chưa có nội dung chính sách được duyệt: cần nguồn có phiên bản và chủ sở hữu nội dung trước khi tóm tắt bằng AI. Công cụ chỉ trả liên kết hiện có.
- Voucher cá nhân được hỗ trợ qua giỏ hiện tại; chưa kiểm tra giỏ giả định bằng chat vì API công khai chưa hỗ trợ ngữ cảnh đó. Không trả giảm giá giả.
- Chưa streaming. Giới hạn quota, hàng đợi và dedupe đang theo tiến trình; cần bộ đếm chung và idempotency bền vững trước khi chạy nhiều replica. Retry sau restart vẫn trả văn bản đã lưu, không tái tạo thẻ giá cũ.
- Cần eval bằng hội thoại thực tế cho kiến thức chung và semantic intent trước khi tăng lưu lượng. Kiểm tra định dạng/giá không thể chứng minh mọi phát biểu kiến thức của model là đúng.
- Compose dev hiện tại bind mount mã nguồn và dùng nodemon, tự nạp thay đổi. Với Docker không có hot reload, build/tạo lại riêng `chat-service` theo quy trình local hiện có; không cần migration PostgreSQL. Chưa tự triển khai production.
