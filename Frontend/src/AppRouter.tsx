import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layouts/Layout";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Home from "./pages/Home/Home";
import Profile from "./pages/Profile/Profile";
const AppRouter = () => (
  <BrowserRouter>
    <Routes>

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />


      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="/s" element={<Navigate to="/login" />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
