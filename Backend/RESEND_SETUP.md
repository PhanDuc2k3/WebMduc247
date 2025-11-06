# Cấu hình Resend Email API cho Backend

Để tính năng gửi email (xác thực tài khoản, xác nhận đơn hàng, v.v.) hoạt động với Resend API, bạn cần cấu hình các biến môi trường sau trong file `.env` ở thư mục `Backend`:

## 1. Lấy API Key từ Resend

1. Truy cập [Resend.com](https://resend.com) và đăng ký tài khoản (miễn phí)
2. Vào **API Keys** trong dashboard
3. Tạo API Key mới và copy nó

## 2. Cấu hình Domain (Quan trọng)

Resend yêu cầu bạn verify domain trước khi có thể gửi email. Có 2 cách:

### Cách 1: Sử dụng domain đã verify
- Nếu bạn đã có domain và đã verify trên Resend, sử dụng email từ domain đó
- Ví dụ: `noreply@yourdomain.com`

### Cách 2: Sử dụng domain test của Resend (Chỉ để test)
- Resend cung cấp domain test: `onboarding@resend.dev`
- Domain này chỉ hoạt động trong môi trường development
- **Lưu ý**: Domain test không hoạt động trên production

## 3. Cấu hình biến môi trường

Thêm các biến sau vào file `.env`:

```env
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Email từ (phải là domain đã verify trên Resend)
# Nếu dùng domain test: onboarding@resend.dev
# Nếu dùng domain của bạn: noreply@yourdomain.com
RESEND_FROM_EMAIL=onboarding@resend.dev
```

## 4. Ví dụ cấu hình `.env` đầy đủ:

```env
MONGO_URI=mongodb://localhost:27017/shopmduc247
JWT_SECRET=supersecretkey
PORT=5000

# Resend Email API
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
```

## 5. Verify Domain trên Resend (Cho production)

1. Vào **Domains** trong Resend dashboard
2. Click **Add Domain**
3. Nhập domain của bạn (ví dụ: `yourdomain.com`)
4. Thêm DNS records mà Resend yêu cầu vào DNS của domain
5. Chờ Resend verify domain (thường mất vài phút)
6. Sau khi verify, cập nhật `RESEND_FROM_EMAIL` trong `.env` thành email từ domain đã verify

## 6. Free Tier của Resend

- 3,000 emails/tháng miễn phí
- 100 emails/ngày
- Đủ cho hầu hết các ứng dụng nhỏ và vừa

## 7. Lưu ý

- **Development**: Có thể dùng `onboarding@resend.dev` để test
- **Production**: Phải verify domain và sử dụng email từ domain đã verify
- API Key phải được bảo mật, không commit vào git
- Resend API hoạt động tốt trên Render.com và các cloud platforms khác

## 8. Troubleshooting

### Lỗi "Invalid API Key"
- Kiểm tra lại `RESEND_API_KEY` trong `.env`
- Đảm bảo không có khoảng trắng thừa

### Lỗi "Domain not verified"
- Kiểm tra `RESEND_FROM_EMAIL` có đúng domain đã verify không
- Nếu dùng domain test, chỉ hoạt động trong development

### Email không gửi được
- Kiểm tra logs để xem lỗi cụ thể
- Đảm bảo API Key còn hiệu lực
- Kiểm tra quota (free tier: 100 emails/ngày)

