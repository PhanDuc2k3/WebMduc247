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
    toast.success(res.data.message || "Đăng ký thành công 🎉", {
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex flex-col items-center mt-12 mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-2">
            <span className="text-white text-2xl font-bold">MP</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">MarketPlace</h1>
          <p className="text-gray-500 text-center mt-1">Sàn thương mại điện tử hàng đầu</p>
        </div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 relative">
          <h2 className="text-xl font-semibold text-center mb-4">Chào mừng bạn!</h2>

          <div className="flex mb-6 bg-gray-100 rounded-lg overflow-hidden">
            <button
              className={`w-1/2 py-2 text-center font-medium ${
                activeTab === "login" ? "bg-white" : "bg-gray-100 text-gray-400"
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
                activeTab === "register" ? "bg-white" : "bg-gray-100 text-gray-400"
              }`}
              onClick={() => {
                setActiveTab("register");
                navigate("/register");
              }}
            >
              Đăng ký
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleRegister}>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Họ và tên</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-blue-300 outline-none bg-gray-50 pl-10"
                  placeholder="Nhập họ và tên"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Số điện thoại</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-blue-300 outline-none bg-gray-50 pl-10"
                  placeholder="Nhập số điện thoại"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  className="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-blue-300 outline-none bg-gray-50 pl-10"
                  placeholder="Nhập email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Mật khẩu</label>
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

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Xác nhận mật khẩu</label>
              <div className="relative">
                <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  className="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-blue-300 outline-none bg-gray-50 pl-10 pr-10"
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <span className="text-sm">
                Tôi đồng ý với{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  Điều khoản sử dụng
                </a>{" "}
                và{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  Chính sách bảo mật
                </a>
              </span>
            </div>

            <button
              type="submit"
              className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 transition font-semibold text-base"
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Đăng ký"}
            </button>
          </form>

          <div className="text-center text-gray-400 text-xs mt-6">
            Bằng việc đăng ký, bạn đồng ý với các điều khoản sử dụng của chúng tôi
          </div>
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
