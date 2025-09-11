import React, { useState } from "react";
import styles from "./Login.module.css";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const Login: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  // Logic: API call
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Đăng nhập thành công");
        localStorage.setItem("token", data.token);
        // Có thể chuyển hướng hoặc reload tại đây
      } else {
        toast.error(data.message || "Đăng nhập thất bại");
      }
    } catch (err) {
      toast.error("Lỗi kết nối server");
    }
    setLoading(false);
  };

  // UI
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="flex flex-col items-center mt-12 mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-2">
          <span className="text-white text-2xl font-bold">MD</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">ShopMDuc247</h1>
        <p className="text-gray-500 text-center mt-1">Sàn thương mại điện tử hàng đầu</p>
      </div>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 relative">
        <h2 className="text-xl font-semibold text-center mb-4">Chào mừng bạn!</h2>
        <div className="flex mb-6 bg-gray-100 rounded-lg overflow-hidden">
          <button
            className={`w-1/2 py-2 text-center font-medium ${activeTab === "login" ? "bg-white" : "bg-gray-100 text-gray-400"}`}
            onClick={() => setActiveTab("login")}
          >
            Đăng nhập
          </button>
          <button
            className={`w-1/2 py-2 text-center font-medium ${activeTab === "register" ? "bg-white" : "bg-gray-100 text-gray-400"}`}
            onClick={() => setActiveTab("register")}
          >
            Đăng ký
          </button>
        </div>
        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Email hoặc số điện thoại</label>
            <div className="relative">
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-blue-300 outline-none bg-gray-50 pl-10"
                placeholder="Nhập email hoặc số điện thoại"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M4 6h16M4 6v12a2 2 0 002 2h12a2 2 0 002-2V6M4 6l8 7 8-7"/></svg>
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Mật khẩu</label>
            <div className="relative">
              <input
                type="password"
                className="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-blue-300 outline-none bg-gray-50 pl-10 pr-10"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 17a2 2 0 100-4 2 2 0 000 4zm6-7V7a6 6 0 10-12 0v3m12 0a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2m12 0H6"/></svg>
              </span>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm-9 0c0 5 4 9 9 9s9-4 9-9-4-9-9-9-9 4-9 9z"/></svg>
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              Ghi nhớ đăng nhập
            </label>
            <a href="#" className="text-sm text-blue-600 hover:underline">Quên mật khẩu?</a>
          </div>
          <button type="submit" className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 transition font-semibold text-base" disabled={loading}>
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
        <div className="my-6 text-center text-gray-400 text-sm">HOẶC ĐĂNG NHẬP VỚI</div>
        <div className="flex gap-4">
          <button className="flex-1 flex items-center justify-center gap-2 border rounded-lg py-2 hover:bg-gray-50">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.227c0-.818-.073-1.6-.21-2.364H12v4.482h5.4a4.62 4.62 0 01-2.004 3.034v2.522h3.24c1.895-1.747 2.964-4.322 2.964-7.674z"/><path fill="#34A853" d="M12 22c2.43 0 4.47-.805 5.96-2.188l-3.24-2.522c-.9.604-2.05.96-3.32.96-2.554 0-4.72-1.726-5.49-4.045H2.82v2.54A9.997 9.997 0 0012 22z"/><path fill="#FBBC05" d="M6.51 14.205A5.996 5.996 0 016 12c0-.76.13-1.494.36-2.205V7.255H2.82A9.997 9.997 0 002 12c0 1.64.395 3.19 1.09 4.545l3.42-2.34z"/><path fill="#EA4335" d="M12 6.96c1.32 0 2.5.454 3.43 1.345l2.57-2.57C16.47 4.805 14.43 4 12 4A9.997 9.997 0 002.82 7.255l3.42 2.54C7.28 8.686 9.446 6.96 12 6.96z"/></svg>
            Google
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 border rounded-lg py-2 hover:bg-gray-50">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="#1877F3" d="M22.675 0h-21.35C.6 0 0 .6 0 1.326v21.348C0 23.4.6 24 1.326 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24h-1.918c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.4 24 24 23.4 24 22.674V1.326C24 .6 23.4 0 22.675 0"/></svg>
            Facebook
          </button>
        </div>
      </div>
      <ToastContainer position="top-center" autoClose={2500} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover />
    </div>
  );
};

export default Login;
