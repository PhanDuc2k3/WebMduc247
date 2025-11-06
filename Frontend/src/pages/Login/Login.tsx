import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "@/api/axiosClient";
import { Mail, Lock } from "lucide-react";
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
            <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200">
              Quên mật khẩu?
            </a>
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
    </div>
  );
};

export default Login;
