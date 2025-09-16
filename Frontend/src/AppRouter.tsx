import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layouts/Layout";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Home from "./pages/Home/Home";
import Profile from "./pages/Profile/Profile";
import MyStore from "./pages/MyStore/MyStore";
import AdminDashboard from "./pages/Admin/AdminDashboard";
const AppRouter = () => (
  <BrowserRouter>
    <Routes>

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />


      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/mystore" element={<MyStore />} />
      </Route>

      <Route path="/s" element={<Navigate to="/login" />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
