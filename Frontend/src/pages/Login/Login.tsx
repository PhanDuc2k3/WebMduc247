import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "@/api/axiosClient";
import userApi from "@/api/userApi";
import { Mail, Lock, X } from "lucide-react";
import { useChat } from "../../context/chatContext";
import { toast } from "react-toastify";
import { getSocket } from "../../socket";

const Login: React.FC = () => {
  const [activeTab, setActiveTab] = useState("login");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<"email" | "code" | "password">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const { setCurrentUserId } = useChat();
  const socket = getSocket();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axiosClient.post("/api/users/login", { email, password });

      if (res.status === 200) {
        const data = res.data;

        // Lưu token và user
        if (data.user) {
          // ✅ Dự phòng cả _id và id (tránh lỗi undefined)
          const userId = data.user._id || data.user.id;

          const userData = {
            _id: userId, // 🔹 luôn có id ở đây
            fullName: data.user.fullName,
            avatarUrl: data.user.avatarUrl || "",
            online: true,
            lastSeen: new Date().toISOString(),
          };

          // ✅ Lưu localStorage
          localStorage.setItem("user", JSON.stringify(userData));
          localStorage.setItem("token", data.token);
          window.dispatchEvent(new Event("userUpdated"));

          // ✅ Cập nhật context và socket
          if (userId) {
            setCurrentUserId(userId);
            if (socket && socket.connected) {
              socket.emit("user_connected", userId);
              console.log("[Login] ✅ Đã emit user_connected:", userId);
            } else {
              console.warn("[Login] ⚠️ Socket chưa kết nối, không thể emit user_connected");
            }
          } else {
            console.error("[Login] ❌ Không tìm thấy userId trong phản hồi login", data.user);
          }
        }

        // ✅ Toast xong mới navigate
        toast.success(data.message || "Đăng nhập thành công", {
          autoClose: 1500,
          onClose: () => navigate("/"),
        });
      }
    } catch (err: any) {
      // Kiểm tra nếu tài khoản chưa được xác thực
      if (err.response?.status === 403 && err.response?.data?.needsVerification) {
        const userEmail = err.response?.data?.email || email;
        toast.error(err.response?.data?.message || "Tài khoản chưa được xác thực", {
          autoClose: 3000,
          onClose: () => {
            // Chuyển đến trang xác thực email
            navigate("/verify-email", { 
              state: { email: userEmail } 
            });
          },
        });
      } else {
        const message = err.response?.data?.message || "Đăng nhập thất bại, vui lòng thử lại";
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Forgot password handlers
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const res = await userApi.forgotPassword({ email: forgotEmail });
      if (res.status === 200) {
        toast.success(res.data.message || "Mã đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email.");
        setForgotPasswordStep("code");
      }
    } catch (err: any) {
      const message = err.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const res = await userApi.verifyResetCode({ email: forgotEmail, resetCode });
      if (res.status === 200) {
        toast.success(res.data.message || "Mã xác thực hợp lệ.");
        setForgotPasswordStep("password");
      }
    } catch (err: any) {
      const message = err.response?.data?.message || "Mã xác thực không đúng hoặc đã hết hạn.";
      toast.error(message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await userApi.resetPassword({ 
        email: forgotEmail, 
        resetCode, 
        newPassword 
      });
      if (res.status === 200) {
        toast.success(res.data.message || "Đặt lại mật khẩu thành công!");
        setShowForgotPassword(false);
        setForgotPasswordStep("email");
        setForgotEmail("");
        setResetCode("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      const message = err.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
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
          Chào mừng bạn quay trở lại!
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-gray-100 p-8 lg:p-10 relative animate-fade-in-up">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl pointer-events-none"></div>
        
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
          Đăng nhập vào tài khoản
        </h2>

        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email hoặc số điện thoại
            </label>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
              <input
                type="text"
                className="relative w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300"
                placeholder="Nhập email hoặc số điện thoại"
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
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
              <input
                type="password"
                className="relative w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input 
                type="checkbox" 
                checked={remember} 
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded"
              />
              Ghi nhớ đăng nhập
            </label>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowForgotPassword(true);
              }}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200 cursor-pointer bg-transparent border-none outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
            >
              Quên mật khẩu?
            </button>
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
              "Đăng nhập ngay"
            )}
          </button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative animate-fade-in-up">
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setForgotPasswordStep("email");
                setForgotEmail("");
                setResetCode("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">
              {forgotPasswordStep === "email" && "Quên mật khẩu"}
              {forgotPasswordStep === "code" && "Nhập mã xác thực"}
              {forgotPasswordStep === "password" && "Đặt lại mật khẩu"}
            </h2>

            {/* Step 1: Enter Email */}
            {forgotPasswordStep === "email" && (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
                    <input
                      type="email"
                      className="relative w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300"
                      placeholder="Nhập email của bạn"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="relative w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3.5 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 font-bold text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {forgotLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Đang gửi...
                    </span>
                  ) : (
                    "Gửi mã xác thực"
                  )}
                </button>
              </form>
            )}

            {/* Step 2: Enter Code */}
            {forgotPasswordStep === "code" && (
              <form onSubmit={handleVerifyResetCode} className="space-y-5">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Chúng tôi đã gửi mã xác thực đến email <strong>{forgotEmail}</strong>. Vui lòng kiểm tra và nhập mã bên dưới.
                  </p>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Mã xác thực (6 chữ số)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
                    <input
                      type="text"
                      className="relative w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300 text-center text-2xl font-bold tracking-widest"
                      placeholder="000000"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading || resetCode.length !== 6}
                  className="relative w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3.5 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 font-bold text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {forgotLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Đang xác thực...
                    </span>
                  ) : (
                    "Xác thực mã"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotPasswordStep("email");
                    setResetCode("");
                  }}
                  className="w-full text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200"
                >
                  Quay lại nhập email
                </button>
              </form>
            )}

            {/* Step 3: Enter New Password */}
            {forgotPasswordStep === "password" && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
                    <input
                      type="password"
                      className="relative w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300"
                      placeholder="Nhập mật khẩu mới"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
                    <input
                      type="password"
                      className="relative w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300"
                      placeholder="Nhập lại mật khẩu mới"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">Mật khẩu xác nhận không khớp</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading || newPassword !== confirmPassword || newPassword.length < 6}
                  className="relative w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3.5 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 font-bold text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {forgotLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Đang xử lý...
                    </span>
                  ) : (
                    "Đặt lại mật khẩu"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotPasswordStep("code");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="w-full text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200"
                >
                  Quay lại nhập mã
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
