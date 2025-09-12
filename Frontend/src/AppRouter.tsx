import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layouts/Layout";
import AuthLayout from "./Layouts/AuthLayout";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";

const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      {/* Routes dành cho login/register */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Routes dành cho các trang chính (sau login) */}
      <Route element={<Layout />}>
        <Route path="/" element={<h1>Trang chủ sau khi login</h1>} />
        {/* bạn thêm các trang khác vào đây */}
      </Route>

      {/* Mặc định điều hướng về login */}
      <Route path="/s" element={<Navigate to="/login" />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
