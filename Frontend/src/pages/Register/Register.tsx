import React, { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import userApi from "../../api/userApi";
import { User, Phone, Mail, Lock, CheckCircle } from "lucide-react";

const Register: React.FC = () => {
  const [activeTab, setActiveTab] = useState("register");
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!acceptTerms) {
    toast.error("Bạn phải đồng ý với điều khoản sử dụng và chính sách bảo mật");
    return;
  }
  if (!fullName || !phone || !email || !password || !confirmPassword) {
    toast.error("Vui lòng nhập đầy đủ thông tin");
    return;
  }
  if (password !== confirmPassword) {
    toast.error("Mật khẩu xác nhận không khớp");
    return;
  }

  setLoading(true);
  try {
    const res = await userApi.register({
      fullName,
      phone,
      email,
      password,
    });

    // Hiển thị toast và chờ toast tắt mới navigate
    toast.success(res.data.message || "Đăng ký thành công", {
      autoClose: 1500, // thời gian toast hiển thị
      onClose: () => {
        navigate("/login"); // chuyển hướng sau khi toast tắt
      },
    });

  } catch (err: any) {
    toast.error(err.response?.data?.message || "Đăng ký thất bại, vui lòng thử lại");
  } finally {
    setLoading(false);
  }
};


  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
        {/* Logo và Header */}
        <div className="flex flex-col items-center mb-8 animate-fade-in-down">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
              <span className="text-white text-3xl font-bold">🛒</span>
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 gradient-text mb-2">
            ShopMDuc247
          </h1>
          <p className="text-gray-600 text-center text-lg">
            Tạo tài khoản mới ngay hôm nay!
          </p>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-gray-100 p-8 lg:p-10 relative animate-fade-in-up">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl"></div>
          
          {/* Tabs */}
          <div className="relative mb-8">
            <div className="flex bg-gradient-to-r from-gray-100 to-gray-50 rounded-2xl p-1 border border-gray-200 shadow-inner">
              <button
                className={`w-1/2 py-3 text-center font-bold rounded-xl transition-all duration-300 ${
                  activeTab === "login" 
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105" 
                    : "bg-transparent text-gray-600 hover:text-blue-600"
                }`}
                onClick={() => {
                  setActiveTab("login");
                  navigate("/login");
                }}
              >
                Đăng nhập
              </button>
              <button
                className={`w-1/2 py-3 text-center font-bold rounded-xl transition-all duration-300 ${
                  activeTab === "register" 
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105" 
                    : "bg-transparent text-gray-600 hover:text-blue-600"
                }`}
                onClick={() => {
                  setActiveTab("register");
                  navigate("/register");
                }}
              >
                Đăng ký
              </button>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">
            Tạo tài khoản mới
          </h2>

          <form className="space-y-5" onSubmit={handleRegister}>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Họ và tên
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300"
                  placeholder="Nhập họ và tên"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Số điện thoại
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300"
                  placeholder="Nhập số điện thoại"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300"
                  placeholder="Nhập email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type="password"
                  className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <input
                  type="password"
                  className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300"
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded mt-0.5"
              />
              <span className="text-sm text-gray-700">
                Tôi đồng ý với{" "}
                <a href="#" className="text-blue-600 hover:text-blue-700 hover:underline font-semibold">
                  Điều khoản sử dụng
                </a>{" "}
                và{" "}
                <a href="#" className="text-blue-600 hover:text-blue-700 hover:underline font-semibold">
                  Chính sách bảo mật
                </a>
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3.5 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 font-bold text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Đang xử lý...
                </span>
              ) : (
                "Đăng ký ngay"
              )}
            </button>
          </form>
        </div>
      </div>

      <ToastContainer
        position="top-center"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
      />
    </>
  );
};

export default Register;
