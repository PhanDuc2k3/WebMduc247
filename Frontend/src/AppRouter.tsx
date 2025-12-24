import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layouts/Layout";
import AdminLayout from "./Layouts/AdminLayout/AdminLayout";
import AdminRoute from "./components/Admin/AdminRoute";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import VerifyEmail from "./pages/VerifyEmail/VerifyEmail";
import Home from "./pages/Home/Home";
import Profile from "./pages/Profile/Profile";
import MyStore from "./pages/MyStore/MyStore";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import ProductDetail from "./pages/Product/DetailProduct";
import Cart from "./pages/Cart/Cart";
import VoucherPage from "./pages/Voucher/Voucher";
import StorePage from "./pages/Store/Store";
import Checkout from "./pages/Payment/Payment";
import OrderPage from "./pages/Order/Order";
import PaymentSuccess from "./components/Payment/PaymentSuccess/PaymentSuccess";
import PaymentQR from "./pages/Payment/PaymentQR";
import StoreList from "./pages/StoreList/StoreList";
import Message from "./pages/Messages/Message";
import Product from "./pages/ProductList/ProductList";
import NewPage from "./pages/New/NewPage"
import PromotionDetail from "./pages/Promotion/PromotionDetail"
import SupportPage from "./pages/Support/SupportPage"
import Whitelist from "./pages/Whitelist/Whitelist"
import WalletPage from "./pages/Wallet/Wallet"
import Notifications from "./pages/Notifications/Notifications"
import Privacy from "./pages/Privacy/Privacy"
import Terms from "./pages/Terms/Terms"

const AppRouter = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/verify-email" element={<VerifyEmail />} />

    <Route element={<Layout />}>  
      <Route path="/" element={<Home />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/mystore" element={<MyStore />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/voucher" element={<VoucherPage />} />
      <Route path="/store/:id" element={<StorePage />} />
      <Route path="/store" element={<StoreList />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order/:orderId" element={<OrderPage />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-qr" element={<PaymentQR />} />
      <Route path="/messages/:id?" element={<Message />} />
      <Route path="/message" element={<Navigate to="/messages" replace />} />

      <Route path="/products" element={<Product />} />
      <Route path="/new" element={<NewPage />} />
      <Route path="/promotion/:id" element={<PromotionDetail />} />
      <Route path="/support" element={<SupportPage/>}/>
      <Route path="/whitelist" element={<Whitelist />} />
      <Route path="/wallet" element={<WalletPage />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
    </Route>

    <Route path="/s" element={<Navigate to="/login" />} />
    <Route element={<AdminLayout />}>
      <Route 
        path="/admin" 
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } 
      />
    </Route>
  </Routes>
);

export default AppRouter;
