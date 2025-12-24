import React, { useState } from "react";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import userApi from "../../api/userApi";
import { User, Phone, Mail, Lock, CheckCircle, ShoppingCart, Eye, EyeOff } from "lucide-react";

const Register: React.FC = () => {
  const [activeTab, setActiveTab] = useState("register");
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!acceptTerms) {
    toast.error("Bạn phải đồng ý với điều khoản sử dụng và chính sách bảo mật", {
      containerId: "general-toast",
    });
    return;
  }
  if (!fullName || !phone || !email || !password || !confirmPassword) {
    toast.error("Vui lòng nhập đầy đủ thông tin", {
      containerId: "general-toast",
    });
    return;
  }
  if (password !== confirmPassword) {
    toast.error("Mật khẩu xác nhận không khớp", {
      containerId: "general-toast",
    });
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

    // Hiển thị toast và chuyển đến trang xác thực email
    toast.success(res.data.message || "Đăng ký thành công! Vui lòng kiểm tra email.", {
      containerId: "general-toast",
      autoClose: 2000,
      onClose: () => {
        // Chuyển đến trang xác thực email với email trong state
        navigate("/verify-email", { 
          state: { email: email } 
        });
      },
    });

  } catch (err: any) {
    toast.error(err.response?.data?.message || "Đăng ký thất bại, vui lòng thử lại", {
      containerId: "general-toast",
    });
  } finally {
    setLoading(false);
  }
};


  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#2F5FEB]/10 via-white to-[#2F5FEB]/20 py-4 sm:py-8 px-4">
        {/* Logo và Header */}
        <div className="flex flex-col items-center mb-4 sm:mb-8 animate-fade-in-down">
          <div className="relative mb-3 sm:mb-4">
            <div className="absolute inset-0 bg-[#2F5FEB] rounded-full blur-lg opacity-50 animate-pulse"></div>
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#2F5FEB] flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
              <ShoppingCart className="text-white w-8 h-8 sm:w-10 sm:h-10" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2F5FEB] mb-2">
            ShopMDuc247
          </h1>
          <p className="text-gray-600 text-center text-sm sm:text-base lg:text-lg">
            Tạo tài khoản mới ngay hôm nay!
          </p>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-gray-100 p-4 sm:p-6 md:p-8 lg:p-10 relative animate-fade-in-up">
          <div className="absolute inset-0 bg-[#2F5FEB]/5 rounded-3xl"></div>
          
          {/* Tabs */}
          <div className="relative mb-8">
            <div className="flex bg-gradient-to-r from-gray-100 to-gray-50 rounded-2xl p-1 border border-gray-200 shadow-inner">
              <button
                className={`w-1/2 py-3 text-center font-bold rounded-xl transition-all duration-300 ${
                  activeTab === "login" 
                    ? "bg-[#2F5FEB] text-white shadow-lg scale-105" 
                    : "bg-transparent text-gray-600 hover:text-[#2F5FEB]"
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
                    ? "bg-[#2F5FEB] text-white shadow-lg scale-105" 
                    : "bg-transparent text-gray-600 hover:text-[#2F5FEB]"
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

          <h2 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6 text-gray-900">
            Tạo tài khoản mới
          </h2>

          <form className="space-y-4 sm:space-y-5" onSubmit={handleRegister}>
            <div>
              <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Họ và tên</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-10 sm:pl-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#2F5FEB] focus:border-[#2F5FEB] outline-none bg-white transition-all duration-300 text-sm sm:text-base"
                  placeholder="Nhập họ và tên"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <User className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Số điện thoại</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-10 sm:pl-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#2F5FEB] focus:border-[#2F5FEB] outline-none bg-white transition-all duration-300 text-sm sm:text-base"
                  placeholder="Nhập số điện thoại"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Phone className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Email</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-10 sm:pl-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#2F5FEB] focus:border-[#2F5FEB] outline-none bg-white transition-all duration-300 text-sm sm:text-base"
                  placeholder="Nhập email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Mật khẩu</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-10 sm:pl-12 pr-10 sm:pr-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#2F5FEB] focus:border-[#2F5FEB] outline-none bg-white transition-all duration-300 text-sm sm:text-base"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Xác nhận mật khẩu</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-10 sm:pl-12 pr-10 sm:pr-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#2F5FEB] focus:border-[#2F5FEB] outline-none bg-white transition-all duration-300 text-sm sm:text-base"
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <CheckCircle className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[#2F5FEB]/10 border border-[#2F5FEB]/40 rounded-xl cursor-pointer hover:bg-[#2F5FEB]/20 transition-colors"
                 onClick={() => setAcceptTerms(!acceptTerms)}>
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 accent-[#2F5FEB] rounded mt-0.5 cursor-pointer flex-shrink-0 relative z-10"
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-700 cursor-pointer flex-1">
                Tôi đồng ý với{" "}
                <Link 
                  to="/terms"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="text-[#2F5FEB] hover:text-[#2F5FEB] hover:underline font-semibold relative z-20"
                >
                  Điều khoản sử dụng
                </Link>{" "}
                và{" "}
                <Link 
                  to="/privacy"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="text-[#2F5FEB] hover:text-[#2F5FEB] hover:underline font-semibold relative z-20"
                >
                  Chính sách bảo mật
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full bg-[#2F5FEB] text-white py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl hover:bg-[#244ACC] transition-all duration-300 font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span className="text-xs sm:text-base">Đang xử lý...</span>
                </span>
              ) : (
                <span className="text-xs sm:text-base">Đăng ký ngay</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Register;
