# 🏗️ KIẾN TRÚC HỆ THỐNG - WEBSITE SÀN THƯƠNG MẠI ĐIỆN TỬ

## 📋 TỔNG QUAN

Hệ thống được xây dựng theo **kiến trúc Service-Oriented Architecture (SOA)** hoặc **Modular Monolith** với các module/service được tách biệt, nhưng **không phải Microservices thuần túy** vì các services chia sẻ chung một database (MongoDB).

---

## 🎯 KIẾN TRÚC TỔNG THỂ

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript)            │
│              Port: 5173 (dev) / Vercel (production)         │
│                                                             │
│  - React 19.1.1, TypeScript 5.8.3, Vite 7.1.2            │
│  - Tailwind CSS, React Router DOM v7                       │
│  - Context API (State Management)                          │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ HTTP/REST API
               │ WebSocket
               │
       ┌───────┴────────┬──────────────┬──────────────┐
       │                │              │              │
┌──────▼──────┐  ┌──────▼────────┐  ┌──▼──────────┐  ┌──▼──────────┐
│   BACKEND   │  │   CHATBOT     │  │  WEBSOCKET  │  │  EXTERNAL   │
│   SERVICE   │  │   SERVICE     │  │  SERVICE    │  │  SERVICES   │
│             │  │               │  │             │  │             │
│ Express.js  │  │ Express.js    │  │ Socket.io   │  │ - Cloudinary│
│ Port: 5000  │  │ Port: 5001    │  │ Port: 5050  │  │ - Groq AI   │
│             │  │               │  │             │  │ - Google AI │
│ MVC Pattern │  │ AI Processing │  │ Real-time   │  │ - MOMO      │
│             │  │               │  │ Messaging   │  │ - VIETQR    │
└──────┬──────┘  └──────┬────────┘  └──────┬──────┘  └─────────────┘
       │                │                   │
       └────────────────┴───────────────────┘
                         │
              ┌──────────▼──────────┐
              │   MONGODB ATLAS     │
              │   (Cloud Database) │
              │                     │
              │ - Users             │
              │ - Products          │
              │ - Orders            │
              │ - Stores            │
              │ - ... (18 models)   │
              └─────────────────────┘
```

---

## 🔧 CÁC SERVICE CHI TIẾT

### 1. **BACKEND SERVICE** (`Backend/`)

#### **Công nghệ Stack**

- **Runtime**: Node.js
- **Framework**: Express.js 5.1.0
- **Database**: MongoDB với Mongoose 8.19.2
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs, CORS
- **File Upload**: Multer, Cloudinary
- **Email**: Nodemailer, Resend
- **Payment**: QR Code generation (qrcode)
- **Search**: Fuse.js (fuzzy search), cosine-similarity

#### **Kiến trúc Pattern: MVC + Repository Pattern**

```
Request Flow:
┌─────────────┐
│   Routes    │ → Định tuyến HTTP requests
└──────┬──────┘
       │
┌──────▼──────┐
│ Middlewares │ → Authentication, Authorization, Validation
└──────┬──────┘
       │
┌──────▼──────┐
│ Controllers │ → Xử lý HTTP requests/responses
└──────┬──────┘
       │
┌──────▼──────┐
│  Services   │ → Business logic, validation
└──────┬──────┘
       │
┌──────▼──────┐
│ Repositories│ → Data access layer, database queries
└──────┬──────┘
       │
┌──────▼──────┐
│   Models    │ → MongoDB schemas (Mongoose)
└─────────────┘
```

#### **Cấu trúc thư mục**

```
Backend/
├── config/              # Database configuration
│   └── db.js
├── controllers/         # HTTP request handlers (15 controllers)
│   ├── UserController.js
│   ├── ProductController.js
│   ├── OrderController.js
│   ├── StoreController.js
│   └── ...
├── services/           # Business logic layer (15 services)
│   ├── UserService.js
│   ├── ProductService.js
│   ├── OrderService.js
│   └── ...
├── repositories/       # Data access layer (15 repositories)
│   ├── UserRepository.js
│   ├── ProductRepository.js
│   └── ...
├── models/             # MongoDB schemas (18 models)
│   ├── Users.js
│   ├── Product.js
│   ├── Order.js
│   └── ...
├── routes/             # API routes definition (15 route files)
│   ├── UserRoutes.js
│   ├── ProductRoutes.js
│   └── ...
├── middlewares/        # Authentication, authorization
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   └── upload.js
├── utils/              # Utility functions
│   ├── emailService.js
│   ├── walletService.js
│   └── ...
├── helpers/            # Helper functions
│   └── cloudinaryUploader.js
├── scripts/            # Migration, setup scripts
│   ├── createAdmin.js
│   ├── createEmbeddings.js
│   └── ...
└── server.js           # Entry point
```

#### **API Endpoints chính**

- `/api/users` - User management
- `/api/products` - Product CRUD
- `/api/orders` - Order management
- `/api/stores` - Store management
- `/api/cart` - Shopping cart
- `/api/vouchers` - Voucher system
- `/api/wallet` - Wallet & transactions
- `/api/reviews` - Product reviews
- `/api/payments` - Payment processing
- `/api/chatbot` - Chatbot proxy (forward to Chatbot service)

---

### 2. **FRONTEND SERVICE** (`Frontend/`)

#### **Công nghệ Stack**

- **Framework**: React 19.1.1
- **Language**: TypeScript 5.8.3
- **Build Tool**: Vite 7.1.2
- **Styling**: Tailwind CSS 3.4.17
- **Routing**: React Router DOM v7.8.2
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Real-time**: Socket.io Client
- **Charts**: Recharts
- **Icons**: Heroicons, Lucide React
- **UI Components**: Class Variance Authority, Tailwind Variants

#### **Kiến trúc Pattern: Component-based Architecture**

```
Frontend/
├── src/
│   ├── api/                    # API clients (Axios)
│   │   ├── userApi.ts
│   │   ├── productApi.ts
│   │   ├── orderApi.ts
│   │   └── ...
│   ├── components/             # React components
│   │   ├── Admin/              # Admin dashboard components
│   │   ├── Cart/               # Shopping cart components
│   │   ├── Home/               # Homepage components
│   │   ├── MyStore/            # Seller store management
│   │   ├── Order/              # Order components
│   │   ├── Payment/            # Payment components
│   │   ├── Product/            # Product components
│   │   ├── Chat/               # Chat components
│   │   └── ...
│   ├── pages/                  # Page components
│   │   ├── HomePage.tsx
│   │   ├── ProductPage.tsx
│   │   ├── CartPage.tsx
│   │   └── ...
│   ├── Layouts/                # Layout components
│   │   ├── MainLayout.tsx
│   │   └── AdminLayout.tsx
│   ├── context/                # React Context (Global State)
│   │   ├── CartContext.tsx
│   │   ├── ChatContext.tsx
│   │   └── UserContext.tsx
│   ├── types/                  # TypeScript type definitions
│   │   ├── user.d.ts
│   │   ├── product.d.ts
│   │   └── ...
│   ├── utils/                  # Utility functions
│   │   ├── formatters.ts
│   │   └── validators.ts
│   └── App.tsx                 # Main app component
└── public/                     # Static assets
```

#### **State Management**

- **Context API**: Global state cho Cart, Chat, User
- **Local State**: useState, useReducer cho component-level state
- **Server State**: Axios với manual caching

#### **Routing Structure**

```
/                    → HomePage
/products            → ProductListPage
/products/:id        → ProductDetailPage
/cart                → CartPage
/checkout            → CheckoutPage
/orders              → OrderListPage
/orders/:id          → OrderDetailPage
/mystore             → StoreManagementPage (Seller)
/admin               → AdminDashboardPage
/chat                → ChatPage
/login               → LoginPage
/register            → RegisterPage
```

---

### 3. **CHATBOT SERVICE** (`Chatbot/`)

#### **Công nghệ Stack**

- **Framework**: Express.js
- **AI SDK**: Groq SDK 0.36.0
- **AI Embeddings**: Google Generative AI (@google/genai)
- **Search**: Cosine similarity, Fuse.js
- **Database**: MongoDB (shared với Backend)

#### **Chức năng**

- **Semantic Search**: Vector embeddings cho product matching
- **Intent Detection**: Phân tích ý định người dùng
- **Natural Language Processing**: Xử lý ngôn ngữ tự nhiên
- **Product Recommendation**: Gợi ý sản phẩm dựa trên câu hỏi

#### **Cấu trúc**

```
Chatbot/
├── config/
│   └── groqConfig.js          # Groq API configuration
├── Controllers/
│   └── ChatbotController.js   # Main chatbot logic
├── services/
│   ├── aiService.js           # AI processing
│   ├── embeddingService.js   # Vector embeddings
│   └── searchService.js       # Product search
├── models/                    # Database models (shared)
├── utils/
│   ├── vectorUtils.js         # Vector operations
│   └── similarityUtils.js    # Similarity calculations
├── routes/
│   └── chatbotRoutes.js      # API routes
└── index.js                   # Entry point
```

#### **API Endpoints**

- `POST /chat` - Chat với AI chatbot
- `POST /search` - Semantic product search

#### **Workflow**

```
User Query
    ↓
Intent Detection (Groq AI)
    ↓
Product Search (Vector Embeddings)
    ↓
Similarity Matching (Cosine Similarity)
    ↓
Response Generation (Groq AI)
    ↓
Return Product Recommendations
```

---

### 4. **WEBSOCKET SERVICE** (`websocket/`)

#### **Công nghệ Stack**

- **Framework**: Express.js
- **Real-time**: Socket.io 4.8.1
- **Database**: MongoDB (shared với Backend)

#### **Chức năng**

- **Real-time Messaging**: Chat giữa users
- **Online Status**: Tracking user online/offline
- **Cart Updates**: Real-time cart synchronization
- **Notifications**: Push notifications

#### **Cấu trúc**

```
websocket/
├── websocket/
│   ├── chatSocket.js          # Chat socket handlers
│   └── notificationSocket.js # Notification handlers
├── models/                    # Database models (shared)
├── helpers/
│   └── socketAuth.js          # Socket authentication
└── server.js                  # Entry point
```

#### **Socket Events**

- **Connection**: `connection`
- **Chat**: `sendMessage`, `receiveMessage`, `joinRoom`
- **Status**: `userOnline`, `userOffline`
- **Cart**: `cartUpdate`
- **Notification**: `newNotification`

---

## 🔄 LUỒNG DỮ LIỆU (DATA FLOW)

### **1. User Authentication Flow**

```
Frontend
  ↓ (POST /api/users/login)
Backend Controller
  ↓
UserService (validate credentials)
  ↓
UserRepository (query database)
  ↓
MongoDB
  ↓ (return user data)
UserService (generate JWT)
  ↓
Controller (return token + user)
  ↓
Frontend (store token, update context)
```

### **2. Product Search Flow**

```
Frontend
  ↓ (GET /api/products?search=...)
Backend Controller
  ↓
ProductService (process search)
  ↓
ProductRepository (query with filters)
  ↓
MongoDB
  ↓ (return products)
Controller (return results)
  ↓
Frontend (display products)
```

### **3. Order Creation Flow**

```
Frontend (Cart checkout)
  ↓ (POST /api/orders)
Backend Controller
  ↓
OrderService (validate, calculate totals)
  ↓
OrderRepository (create order)
  ↓
MongoDB (save order)
  ↓
PaymentService (process payment)
  ↓
Controller (return order)
  ↓
Frontend (redirect to payment)
```

### **4. Real-time Chat Flow**

```
Frontend (send message)
  ↓ (Socket.io emit)
WebSocket Service
  ↓
ChatSocket (process message)
  ↓
MessageService (save to database)
  ↓
MongoDB (save message)
  ↓
Socket.io (broadcast to recipient)
  ↓
Frontend (receive message)
```

### **5. AI Chatbot Flow**

```
Frontend (user query)
  ↓ (POST /api/chatbot/chat)
Backend Controller (proxy)
  ↓
Chatbot Service
  ↓
ChatbotController (process query)
  ↓
AIService (Groq AI - intent detection)
  ↓
EmbeddingService (vector search)
  ↓
ProductRepository (find similar products)
  ↓
AIService (generate response)
  ↓
Controller (return response)
  ↓
Frontend (display response)
```

---

## 🗄️ DATABASE ARCHITECTURE

### **MongoDB Atlas (Cloud Database)**

#### **18 Models chính:**

1. **Users** - Người dùng (buyer, seller, admin)
2. **Stores** - Cửa hàng
3. **Products** - Sản phẩm
4. **Orders** - Đơn hàng
5. **Cart** - Giỏ hàng
6. **CartItem** - Item trong giỏ hàng (embedded)
7. **Reviews** - Đánh giá sản phẩm
8. **Vouchers** - Mã giảm giá
9. **Wallet** - Ví điện tử
10. **Transactions** - Giao dịch (embedded trong Wallet)
11. **Address** - Địa chỉ giao hàng
12. **Favorites** - Yêu thích
13. **Notifications** - Thông báo
14. **Promotions** - Khuyến mãi
15. **Messages** - Tin nhắn
16. **Conversations** - Cuộc trò chuyện
17. **ViewLog** - Nhật ký lượt xem
18. **VectorStore** - Vector embeddings cho AI search

#### **Mối quan hệ chính:**

- User ↔ Store (1:N) - Một user sở hữu nhiều store
- Store → Product (1:N) - Một store có nhiều product
- User → Order (1:N) - Một user có nhiều order
- Product → Review (1:N) - Một product có nhiều review
- Order → CartItem (1:N embedded) - Order chứa nhiều CartItem

---

## 🔐 SECURITY ARCHITECTURE

### **Authentication & Authorization**

- **JWT Tokens**: Access token + Refresh token
- **Password Hashing**: bcryptjs (salt rounds: 10)
- **Role-based Access Control**: buyer, seller, admin
- **Middleware**: authMiddleware, roleMiddleware

### **API Security**

- **CORS**: Whitelist origins
- **Rate Limiting**: (có thể thêm)
- **Input Validation**: Middleware validation
- **SQL Injection**: Không áp dụng (MongoDB NoSQL)
- **XSS Protection**: React tự động escape

### **File Upload Security**

- **Cloudinary**: Secure file storage
- **File Type Validation**: Chỉ cho phép images
- **File Size Limit**: Multer limits

---

## 🚀 DEPLOYMENT ARCHITECTURE

### **Production Environment**

```
┌─────────────────────────────────────────┐
│         VERCEL (Frontend)               │
│  https://web-mduc247.vercel.app        │
└──────────────┬──────────────────────────┘
               │
               │ HTTPS
               │
┌──────────────▼──────────────────────────┐
│      RENDER.COM (Backend Services)      │
│                                          │
│  ┌──────────────┐  ┌──────────────┐    │
│  │   Backend     │  │  WebSocket   │    │
│  │  Port: 5000   │  │  Port: 5050  │    │
│  └──────┬───────┘  └──────┬───────┘    │
│         │                 │             │
│         └────────┬────────┘             │
│                  │                      │
└──────────────────┼──────────────────────┘
                   │
         ┌─────────▼─────────┐
         │  MONGODB ATLAS    │
         │  (Cloud Database) │
         └───────────────────┘
```

### **Services Deployment**

- **Frontend**: Vercel (automatic deployment từ Git)
- **Backend**: Render.com (Web Service)
- **WebSocket**: Render.com (Web Service, separate)
- **Chatbot**: Render.com (Web Service, separate) hoặc cùng Backend
- **Database**: MongoDB Atlas (Cloud)

### **Environment Variables**

```env
# Backend
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Chatbot
GROQ_API_KEY=...
GOOGLE_AI_API_KEY=...

# WebSocket
MONGO_URI=...
JWT_SECRET=...
```

---

## 📊 SCALABILITY & PERFORMANCE

### **Scalability**

- **Services**: Mỗi service có thể scale độc lập (Backend, Chatbot, WebSocket)
- **Database**: MongoDB Atlas auto-scaling (shared database - bottleneck tiềm năng)
- **CDN**: Vercel CDN cho static assets
- **Load Balancing**: Render.com tự động
- **⚠️ Lưu ý**: Vì shared database, việc scale database sẽ ảnh hưởng đến tất cả services

### **Performance Optimization**

- **Frontend**:
  - Code splitting (Vite)
  - Lazy loading components
  - Image optimization (Cloudinary)
- **Backend**:
  - Database indexing
  - Query optimization
  - Caching (có thể thêm Redis)
- **Database**:
  - Indexes trên các field thường query
  - Aggregation pipelines cho complex queries

---

## 🔗 INTEGRATION POINTS

### **External Services**

1. **Cloudinary** - Image storage & optimization
2. **Groq AI** - AI chatbot processing
3. **Google Generative AI** - Vector embeddings
4. **MOMO Payment** - Payment gateway
5. **VIETQR** - QR code payment
6. **Email Services** - Nodemailer/Resend

### **Internal Communication**

- **Frontend ↔ Backend**: REST API (HTTP/HTTPS)
- **Frontend ↔ WebSocket**: Socket.io (WebSocket protocol)
- **Backend ↔ Chatbot**: HTTP proxy hoặc direct call
- **All Services ↔ MongoDB**: Mongoose ODM

---

## 📝 SUMMARY

### **Kiến trúc chính:**

- **Pattern**: **Service-Oriented Architecture (SOA)** / **Modular Monolith**
- **Backend Pattern**: MVC + Repository Pattern
- **Frontend Pattern**: Component-based Architecture
- **Database**: MongoDB (NoSQL) - **Shared Database**
- **Communication**: REST API + WebSocket

### **⚠️ LƯU Ý QUAN TRỌNG:**

**Tại sao KHÔNG phải Microservices thuần túy?**

1. **Shared Database**: Tất cả services (Backend, Chatbot, WebSocket) đều kết nối đến cùng một MongoDB database

   - Microservices thuần túy yêu cầu **"Database per Service"** pattern
   - Mỗi service nên có database riêng để đảm bảo độc lập hoàn toàn

2. **Tight Coupling**: Các services phụ thuộc vào cùng một database schema

   - Thay đổi schema ảnh hưởng đến tất cả services
   - Khó scale database độc lập cho từng service

3. **Frontend là Client**: Frontend không phải là một service backend, nó là client application

### **Đây là gì?**

**Service-Oriented Architecture (SOA)** hoặc **Modular Monolith**:

- ✅ Tách biệt services theo chức năng (Backend, Chatbot, WebSocket)
- ✅ Mỗi service có thể deploy độc lập
- ✅ Giao tiếp qua HTTP/REST API và WebSocket
- ❌ Nhưng chia sẻ chung database (không phải Microservices thuần túy)

### **Ưu điểm:**

✅ Tách biệt concerns (separation of concerns)
✅ Dễ maintain và test từng module
✅ Technology stack phù hợp cho từng service
✅ Real-time capabilities với WebSocket
✅ AI integration với Chatbot service
✅ Đơn giản hơn Microservices (ít phức tạp về infrastructure)

### **Nhược điểm so với Microservices:**

❌ Không thể scale database độc lập
❌ Tight coupling qua shared database
❌ Khó thay đổi database schema mà không ảnh hưởng services khác

### **Công nghệ chính:**

- **Backend**: Node.js, Express.js, MongoDB
- **Frontend**: React, TypeScript, Vite
- **Real-time**: Socket.io
- **AI**: Groq SDK, Google Generative AI
- **Deployment**: Vercel, Render.com, MongoDB Atlas
