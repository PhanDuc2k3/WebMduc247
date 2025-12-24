# SCRIPT TRÌNH BÀY BẢO VỆ ĐỒ ÁN (10-15 phút)

---

## 🎯 PHẦN MỞ ĐẦU (1 phút)

**Chào thầy cô và các bạn!**

Em tên là **[Tên của bạn]**, sinh viên lớp **[Lớp]**, mã sinh viên **[MSSV]**.

Hôm nay em xin được trình bày đồ án tốt nghiệp với đề tài:

**"Website Sàn Thương Mại Điện Tử (E-commerce Marketplace)"**

---

## 📋 PHẦN 1: GIỚI THIỆU ĐỒ ÁN (2 phút)

### 1.1. Mục tiêu

Đồ án xây dựng một **nền tảng thương mại điện tử đầy đủ tính năng**, hỗ trợ:

- **Người mua**: Duyệt sản phẩm, mua hàng, thanh toán
- **Người bán**: Quản lý cửa hàng, sản phẩm, đơn hàng
- **Quản trị viên**: Quản lý toàn bộ hệ thống

### 1.2. Điểm nổi bật

1. ✅ **AI Chatbot** với Cosine Similarity để tìm kiếm sản phẩm thông minh
2. ✅ **Real-time messaging** giữa buyer và seller
3. ✅ **4 phương thức thanh toán**: COD, MOMO, VIETQR, Wallet
4. ✅ **Kiến trúc Microservices** với 4 service độc lập

---

## 🏗️ PHẦN 2: KIẾN TRÚC HỆ THỐNG (2 phút)

### 2.1. Kiến trúc tổng thể

Hệ thống được xây dựng theo **kiến trúc Microservices** với 4 service:

1. **Backend** (Port 5000): API server chính, xử lý tất cả business logic
2. **Frontend** (Port 5173): React application, giao diện người dùng
3. **Chatbot Service** (Port 5001): AI chatbot với Groq SDK
4. **WebSocket Service** (Port 5050): Real-time communication

Tất cả kết nối với **MongoDB Atlas** làm database.

### 2.2. Kiến trúc Backend

Sử dụng **MVC Pattern**:

- **Controllers**: Xử lý HTTP requests
- **Services**: Business logic
- **Repositories**: Data access layer
- **Models**: MongoDB schemas

---

## 💻 PHẦN 3: CÔNG NGHỆ SỬ DỤNG (1 phút)

### Backend:

- Node.js, Express.js 5.1.0
- MongoDB với Mongoose
- JWT authentication
- Socket.io cho real-time

### Frontend:

- React 19, TypeScript
- Tailwind CSS
- React Router v7

### AI & Database:

- Groq SDK cho chatbot
- Google Generative AI cho embeddings
- MongoDB Atlas

---

## ⭐ PHẦN 4: TÍNH NĂNG CHÍNH (3 phút)

### 4.1. Cho Người Mua

- ✅ Đăng ký/đăng nhập với email verification
- ✅ Duyệt sản phẩm với filter, search, sort
- ✅ Giỏ hàng với real-time updates
- ✅ **4 phương thức thanh toán**: COD, MOMO, VIETQR, Wallet
- ✅ Quản lý đơn hàng, đánh giá sản phẩm
- ✅ **Chat real-time** với seller
- ✅ **Chatbot AI** tư vấn mua hàng

### 4.2. Cho Người Bán

- ✅ Đăng ký và quản lý cửa hàng
- ✅ Quản lý sản phẩm (CRUD, variations, inventory)
- ✅ Quản lý đơn hàng, cập nhật trạng thái
- ✅ Thống kê doanh thu, sản phẩm bán chạy
- ✅ Quản lý voucher

### 4.3. Cho Admin

- ✅ Quản lý users, stores, products
- ✅ Duyệt seller requests
- ✅ Thống kê hệ thống với dashboard
- ✅ Quản lý voucher, promotion, banner

---

## 🎯 PHẦN 5: ĐIỂM NỔI BẬT - AI CHATBOT (3 phút)

### 5.1. Vấn đề

Người dùng muốn tìm sản phẩm bằng **ngôn ngữ tự nhiên** thay vì keyword cứng nhắc.

Ví dụ: "Tôi muốn mua điện thoại iPhone giá rẻ" thay vì "iPhone"

### 5.2. Giải pháp: Cosine Similarity

**Cosine Similarity** tính độ tương đồng giữa 2 vector:

- **Công thức**: `cos(θ) = (A·B) / (||A|| × ||B||)`
- **Kết quả**: Từ -1 đến 1, càng gần 1 thì càng giống nhau

### 5.3. Cách hoạt động

1. **Vector Embeddings**: Sản phẩm được chuyển thành vector embeddings (lưu trong `VectorStore`)
2. **Query Processing**: Câu hỏi của user được dịch sang keywords
3. **Cosine Similarity**: Tính độ tương đồng giữa query và sản phẩm
4. **Top-K Retrieval**: Lấy top K sản phẩm có score cao nhất

### 5.4. Code Implementation

```javascript
// Backend/utils/cosineSim.js
function cosineSim(a, b) {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### 5.5. Kết quả

- ✅ Tìm kiếm semantic (ngữ nghĩa) thay vì chỉ keyword
- ✅ Hỗ trợ tiếng Việt với translation
- ✅ Ranking sản phẩm thông minh

---

## 📊 PHẦN 6: DEMO (2 phút)

### Demo các tính năng chính:

1. **Trang chủ**: Banner, categories, featured products
2. **Tìm kiếm sản phẩm**: Filter, search, sort
3. **Chi tiết sản phẩm**: Images, specs, reviews
4. **Giỏ hàng**: Real-time updates
5. **Thanh toán**: 4 payment methods
6. **Chatbot AI**: Tìm kiếm bằng ngôn ngữ tự nhiên
7. **Real-time messaging**: Chat với seller
8. **Admin Dashboard**: Statistics, management

---

## ⚠️ PHẦN 7: HẠN CHẾ VÀ HƯỚNG PHÁT TRIỂN (1 phút)

### Hạn chế:

1. Vector search chưa dùng full embeddings (đang dùng text search + scoring)
2. Payment gateway đang ở test mode
3. Chưa có caching layer (Redis)
4. Chưa có unit tests

### Hướng phát triển:

1. Tích hợp full vector embeddings với Google AI
2. Production payment gateways
3. Redis caching
4. Unit tests, integration tests
5. Recommendation system
6. Mobile app (React Native)

---

## 🎓 PHẦN KẾT LUẬN (30 giây)

### Tóm tắt:

Đồ án đã xây dựng thành công một **website sàn thương mại điện tử đầy đủ tính năng** với:

- ✅ Kiến trúc Microservices hiện đại
- ✅ AI Chatbot với Cosine Similarity
- ✅ Real-time communication
- ✅ Multiple payment methods
- ✅ Modern tech stack

### Đóng góp:

- Ứng dụng AI vào tìm kiếm sản phẩm
- Kiến trúc scalable và maintainable
- User experience tốt với real-time features

**Em xin cảm ơn thầy cô và các bạn đã lắng nghe!**

---

## ❓ CHUẨN BỊ CÂU TRẢ LỜI

### Q: Tại sao chọn Microservices?

**A**: Tách biệt service độc lập, dễ scale, maintain, deploy riêng biệt.

### Q: Cosine Similarity hoạt động như thế nào?

**A**: Tính góc giữa 2 vector, công thức `cos(θ) = (A·B) / (||A|| × ||B||)`, kết quả từ -1 đến 1.

### Q: Tại sao dùng MongoDB?

**A**: Schema linh hoạt, phù hợp e-commerce (variations, specs), dễ scale horizontal.

### Q: Real-time messaging hoạt động ra sao?

**A**: Socket.io bidirectional communication, server emit events, client listen và update UI.

### Q: Payment flow như thế nào?

**A**: User chọn method → API tạo payment → Redirect gateway → Callback → Update order status.

### Q: Security như thế nào?

**A**: JWT auth, bcrypt hashing, CORS, input validation, RBAC, file upload validation.

---

**Chúc bạn bảo vệ thành công! 🎉**
