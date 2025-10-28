import React, { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import axiosClient from "@/api/axiosClient";
import { Mail, Lock } from "lucide-react";
import { useChat } from "../../context/chatContext"; // ✅ thêm dòng này

const Login: React.FC = () => {
  const [activeTab, setActiveTab] = useState("login");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const { setCurrentUserId, socket } = useChat(); // ✅ lấy từ context

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log("🔹 [Login] Đang gửi request login với:", { email, password });

      const res = await axiosClient.post("/api/users/login", { email, password });
      console.log("🔹 [Login] Response từ server:", res.data);

      if (res.status === 200) {
        const data = res.data;
        toast.success(data.message || "Đăng nhập thành công");
        localStorage.setItem("token", data.token);

        if (data.user) {
          console.log("🔹 [Login] User data nhận được:", data.user);

          const userData = {
            ...data.user,
            online: data.user.online,
            lastSeen: data.user.lastSeen,
          };

          // ✅ Lưu vào localStorage
          localStorage.setItem("user", JSON.stringify(userData));

          console.log(
            "🔹 [Login] User online status:",
            userData.online,
            "Last seen:",
            userData.lastSeen
          );

          // ✅ Cập nhật userId cho chatContext để socket biết bạn là ai
          const userId = userData._id || userData.id;
          if (userId) {
            setCurrentUserId(userId);
            console.log("📡 [Login] setCurrentUserId:", userId);

            // ✅ Gửi sự kiện user_connected ngay lập tức lên server
            if (socket && socket.connected) {
              socket.emit("user_connected", userId);
              console.log("📡 [Login] Emit user_connected:", userId);
            }
          }
        }

        // ✅ Chuyển hướng sau 1s
        setTimeout(() => navigate("/"), 1000);
      }
    } catch (err: any) {
      const message = err.response?.data?.message || "Đăng nhập thất bại, vui lòng thử lại";
      toast.error(message);
      console.error("❌ [Login] Lỗi:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="flex flex-col items-center mt-12 mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-2">
          <span className="text-white text-2xl font-bold">MD</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">ShopMDuc247</h1>
        <p className="text-gray-500 text-center mt-1">
          Sàn thương mại điện tử hàng đầu
        </p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 relative">
        <h2 className="text-xl font-semibold text-center mb-4">
          Chào mừng bạn!
        </h2>

        <div className="flex mb-6 bg-gray-100 rounded-lg overflow-hidden">
          <button
            className={`w-1/2 py-2 text-center font-medium ${
              activeTab === "login"
                ? "bg-white"
                : "bg-gray-100 text-gray-400"
            }`}
            onClick={() => {
              setActiveTab("login");
              navigate("/login");
            }}
          >
            Đăng nhập
          </button>
          <button
            className={`w-1/2 py-2 text-center font-medium ${
              activeTab === "register"
                ? "bg-white"
                : "bg-gray-100 text-gray-400"
            }`}
            onClick={() => {
              setActiveTab("register");
              navigate("/register");
            }}
          >
            Đăng ký
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Email hoặc số điện thoại
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-blue-300 outline-none bg-gray-50 pl-10"
                placeholder="Nhập email hoặc số điện thoại"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                className="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-blue-300 outline-none bg-gray-50 pl-10 pr-10"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Ghi nhớ đăng nhập
            </label>
            <a href="#" className="text-sm text-blue-600 hover:underline">
              Quên mật khẩu?
            </a>
          </div>

          <button
            type="submit"
            className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 transition font-semibold text-base"
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
      </div>

      <ToastContainer
        position="top-center"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
      />
    </div>
  );
};

export default Login;
