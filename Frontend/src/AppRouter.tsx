import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layouts/Layout";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
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
import StoreList from "./pages/Home/StoreList";
import Message from "./pages/Messages/Message";
const AppRouter = () => (
  <BrowserRouter>
    <Routes>

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />


      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/mystore" element={<MyStore />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/voucher" element={<VoucherPage />} />
        <Route path="/store/:id" element={<StorePage />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order/:orderId" element={<OrderPage />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/stores" element={<StoreList />} />
        <Route path="/messages" element={<Message />} />
      </Route>

      <Route path="/s" element={<Navigate to="/login" />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
