import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layouts/Layout";
import PlatformAdminShell from "./pages/Admin/PlatformAdminShell";
import AdminSecurityPage from "./pages/Admin/AdminSecurityPage";
import StaffAccess from "./pages/Admin/StaffAccess";
import PlatformApprovals from "./pages/Admin/PlatformApprovals";
import AdminLogin from "./pages/Admin/AdminLogin";
import PlatformOverview from "./pages/Admin/PlatformOverview";
import PlatformRecords from "./pages/Admin/PlatformRecords";
import PlatformAudit from "./pages/Admin/PlatformAudit";
import PlatformReturns from "./pages/Admin/PlatformReturns";
import PlatformCases from "./pages/Admin/PlatformCases";
import ReturnExceptions from "./pages/Admin/ReturnExceptions";
import CaseReports from "./pages/Admin/CaseReports";
import StorefrontEditor from "./pages/Admin/StorefrontEditor";
import StorefrontPreview from "./pages/Admin/StorefrontPreview";
import AdminRoute from "./components/Admin/AdminRoute";
import { LoginV2, RegisterV2, VerifyEmailV2, ForgotPasswordV2, ResetPasswordV2 } from "./pages/AuthV2/AuthPages";
import Home from "./pages/Home/Home";
import Profile from "./pages/ProfileV2/ProfileV2";
import MyStore from "./pages/MyStore/MyStore";
import CatalogProductEditor from "./pages/MyStore/CatalogProductEditor";
import ProductDetail from "./pages/Product/DetailProduct";
import Cart from "./pages/Cart/Cart";
import VoucherPage from "./pages/Voucher/Voucher";
import StorePage from "./pages/Store/Store";
import Checkout from "./pages/Payment/Payment";
import PaymentReturnV2 from "./pages/Payment/PaymentReturnV2";
import { BuyerOrdersV2 } from "./pages/Order/BuyerOrdersV2";
import { BuyerOrderDetailV2 } from "./pages/Order/BuyerOrderDetailV2";
import { SellerOrdersV2, SellerOrderDetailV2 } from "./pages/MyStore/SellerOrdersV2";
import DemoOrderDetail from "./pages/Order/DemoOrderDetail";
import StoreList from "./pages/StoreList/StoreList";
import Message from "./pages/Messages/Message";
import Product from "./pages/ProductList/ProductList";
import NewPage from "./pages/New/NewPage"
import PromotionDetail from "./pages/Promotion/PromotionDetail"
import FlashSalesV2 from "./pages/Promotion/FlashSalesV2"
import SupportPage from "./pages/Support/SupportPage"
import Whitelist from "./pages/Whitelist/Whitelist"
import WalletPageV2 from "./pages/Wallet/WalletPageV2"
import Notifications from "./pages/Notifications/Notifications"
import Privacy from "./pages/Privacy/Privacy"
import Terms from "./pages/Terms/Terms"
import CategoryPage from "./pages/Category/CategoryPage"

const AppRouter = () => (
  <Routes>
    <Route path="/login" element={<LoginV2 />} />
    <Route path="/register" element={<RegisterV2 />} />
    <Route path="/verify-email" element={<VerifyEmailV2 />} />
    <Route path="/forgot-password" element={<ForgotPasswordV2 />} />
    <Route path="/reset-password" element={<ResetPasswordV2 />} />
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin/storefront/preview" element={<AdminRoute><StorefrontPreview /></AdminRoute>} />

    <Route element={<Layout />}>  
      <Route path="/" element={<Home />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/mystore" element={<MyStore />} />
      <Route path="/mystore/products/:id" element={<CatalogProductEditor />} />
      <Route path="/mystore/:storeId/orders" element={<SellerOrdersV2 />} />
      <Route path="/mystore/orders/:id" element={<SellerOrderDetailV2 />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/voucher" element={<VoucherPage />} />
      <Route path="/store/:id" element={<StorePage />} />
      <Route path="/store" element={<StoreList />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/payments/return" element={<PaymentReturnV2 />} />
      <Route path="/orders" element={<BuyerOrdersV2 />} />
      <Route path="/orders/:groupId" element={<BuyerOrderDetailV2 />} />
      <Route path="/order/demo" element={<DemoOrderDetail />} />
      <Route path="/order/:orderId" element={<Navigate to="/orders" replace />} />
      <Route path="/payment-success" element={<Navigate to="/payments/return" replace />} />
      <Route path="/payment-qr" element={<Navigate to="/payments/return" replace />} />
      <Route path="/messages/:id?" element={<Message />} />
      <Route path="/message" element={<Navigate to="/messages" replace />} />

      <Route path="/products" element={<Product />} />
      <Route path="/category/:slug" element={<CategoryPage />} />
      <Route path="/new" element={<Navigate to="/flash-sale" replace />} />
      <Route path="/flash-sale" element={<NewPage />} />
      <Route path="/promotion/:id" element={<PromotionDetail />} />
      <Route path="/flash-sales" element={<NewPage />} />
      <Route path="/flash-sales/products" element={<FlashSalesV2 />} />
      <Route path="/support" element={<SupportPage/>}/>
      <Route path="/whitelist" element={<Whitelist />} />
      <Route path="/wallet" element={<WalletPageV2 />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
    </Route>

    <Route path="/s" element={<Navigate to="/login" />} />
    <Route path="/admin" element={<AdminRoute><PlatformAdminShell /></AdminRoute>}>
      <Route path="security" element={<AdminSecurityPage/>}/>
      <Route path="staff-access" element={<StaffAccess/>}/>
      <Route path="approvals" element={<PlatformApprovals/>}/>
      <Route index element={<PlatformOverview />} />
      <Route path="users" element={<PlatformRecords key="users" resource="users" />} />
      <Route path="stores" element={<PlatformRecords key="stores" resource="stores" />} />
      <Route path="products" element={<PlatformRecords key="products" resource="products" />} />
      <Route path="orders" element={<PlatformRecords key="orders" resource="orders" />} />
      <Route path="returns" element={<PlatformReturns />} />
      <Route path="cases" element={<PlatformCases />} />
      <Route path="return-exceptions" element={<ReturnExceptions />} />
      <Route path="case-reports" element={<CaseReports />} />
      <Route path="audit" element={<PlatformAudit />} />
      <Route path="storefront" element={<StorefrontEditor />} />
    </Route>
  </Routes>
);

export default AppRouter;
