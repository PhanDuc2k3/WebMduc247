import { Routes, Route, Navigate } from "react-router-dom";
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
import StoreList from "./pages/StoreList/StoreList";
import Message from "./pages/Messages/Message";
import Product from "./pages/ProductList/ProductList";
import NewPage from "./pages/New/NewPage"
import SupportPage from "./pages/Support/SupportPage"

const AppRouter = () => (
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
      <Route path="/messages/:id?" element={<Message />} />
      <Route path="/message" element={<Navigate to="/messages" replace />} />

      <Route path="/categories" element={<Product />} />
      <Route path="/new" element={<NewPage />} />
      <Route path="/support" element={<SupportPage/>}/>
    </Route>

    <Route path="/s" element={<Navigate to="/login" />} />
    <Route path="/admin" element={<AdminDashboard />} />
  </Routes>
);

export default AppRouter;
