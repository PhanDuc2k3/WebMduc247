import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";
import userApi from "../../api/userApi";
import { Mail, CheckCircle, RefreshCw, ArrowLeft, ShoppingCart } from "lucide-react";

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const hasAutoResentRef = useRef(false); // Dùng useRef để không bị reset khi re-render

  useEffect(() => {
    // Lấy email từ location state hoặc query params
    const emailFromState = location.state?.email;
    const emailFromQuery = new URLSearchParams(location.search).get("email");
    const emailToUse = emailFromState || emailFromQuery || "";
    // Kiểm tra fromLogin từ cả state và query params
    const fromLoginState = location.state?.fromLogin || false;
    const fromLoginQuery = new URLSearchParams(location.search).get("fromLogin") === "true";
    const fromLogin = fromLoginState || fromLoginQuery;

    if (emailToUse) {
      setEmail(emailToUse);
      
      // Nếu đến từ trang đăng nhập, tự động gửi mã xác nhận mới ngay lập tức
      if (fromLogin) {
        const autoResentKey = `autoResent_${emailToUse}`;
        const hasAutoResent = sessionStorage.getItem(autoResentKey);
        const countdownKey = `countdown_${emailToUse}`;
        const savedCountdown = sessionStorage.getItem(countdownKey);
        
        // Chỉ gửi nếu:
        // 1. Chưa gửi (không có trong sessionStorage)
        // 2. useRef chưa được set
        // 3. Không có countdown đang chạy (countdown = 0 hoặc không có trong sessionStorage)
        if (!hasAutoResent && !hasAutoResentRef.current && (!savedCountdown || parseInt(savedCountdown) <= 0)) {
          // Đánh dấu đã gửi TRƯỚC khi gọi API để tránh gửi lại (do StrictMode có thể chạy 2 lần)
          sessionStorage.setItem(autoResentKey, "true");
          sessionStorage.setItem(countdownKey, "60"); // Lưu countdown vào sessionStorage
          hasAutoResentRef.current = true;
          setCountdown(60); // Set countdown ngay để tránh gửi lại
          
          // Gửi mã ngay lập tức
          (async () => {
            try {
              const res = await userApi.resendVerificationCode({ email: emailToUse });
              toast.success(res.data.message || "Đã gửi mã xác thực mới. Vui lòng kiểm tra email.", {
                containerId: "general-toast",
              });
            } catch (err: any) {
              // Interceptor đã tự động hiển thị toast cho các lỗi
              // Xóa flag và reset countdown nếu gửi thất bại để có thể thử lại
              sessionStorage.removeItem(autoResentKey);
              sessionStorage.removeItem(countdownKey);
              hasAutoResentRef.current = false;
              setCountdown(0);
            }
          })();
        } else if (savedCountdown && parseInt(savedCountdown) > 0) {
          // Nếu có countdown đang chạy, khôi phục lại
          setCountdown(parseInt(savedCountdown));
        }
      }
    } else {
      // Nếu không có email và không phải từ login, chuyển về trang đăng ký
      // Nếu từ login thì đợi một chút vì có thể email đang được load từ query params
      if (!fromLogin) {
        navigate("/register");
      } else {
        // Đợi một chút để query params được load (nếu có delay)
        const timer = setTimeout(() => {
          const emailAfterDelay = new URLSearchParams(location.search).get("email");
          if (!emailAfterDelay) {
            // Nếu vẫn không có email sau khi đợi, chuyển về login
            navigate("/login");
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [location, navigate]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      // Lưu countdown vào sessionStorage để tránh mất khi reload
      const countdownKey = `countdown_${email}`;
      sessionStorage.setItem(countdownKey, countdown.toString());
      
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (email) {
      // Xóa countdown khỏi sessionStorage khi hết thời gian
      const countdownKey = `countdown_${email}`;
      sessionStorage.removeItem(countdownKey);
      // Xóa flag autoResent để có thể gửi lại
      const autoResentKey = `autoResent_${email}`;
      sessionStorage.removeItem(autoResentKey);
      hasAutoResentRef.current = false;
    }
  }, [countdown, email]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Vui lòng nhập mã xác thực 6 chữ số", {
        containerId: "general-toast",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await userApi.verifyEmail({
        email,
        verificationCode,
      });

      toast.success(res.data.message || "Xác thực thành công!", {
        containerId: "general-toast",
        autoClose: 2000,
        onClose: () => {
          navigate("/login");
        },
      });
    } catch (err: any) {
      // Interceptor đã tự động hiển thị toast cho các lỗi
      // Không cần hiển thị lại toast ở đây để tránh trùng lặp
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) {
      toast.warning(`Vui lòng đợi ${countdown} giây trước khi gửi lại`, {
        containerId: "general-toast",
      });
      return;
    }

    setResendLoading(true);
    try {
      const res = await userApi.resendVerificationCode({ email });
      toast.success(res.data.message || "Đã gửi lại mã xác thực", {
        containerId: "general-toast",
      });
      // Lưu countdown vào sessionStorage
      const countdownKey = `countdown_${email}`;
      sessionStorage.setItem(countdownKey, "60");
      setCountdown(60); // 60 giây countdown
    } catch (err: any) {
      // Interceptor đã tự động hiển thị toast cho các lỗi
      // Không cần hiển thị lại toast ở đây
    } finally {
      setResendLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setVerificationCode(value);
  };

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-4 sm:py-8 px-4">
        {/* Logo và Header */}
        <div className="flex flex-col items-center mb-4 sm:mb-8 animate-fade-in-down">
          <div className="relative mb-3 sm:mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
              <ShoppingCart className="text-white w-8 h-8 sm:w-10 sm:h-10" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 gradient-text mb-2">
            ShopMDuc247
          </h1>
          <p className="text-gray-600 text-center text-sm sm:text-base lg:text-lg">
            Xác thực tài khoản của bạn
          </p>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-gray-100 p-4 sm:p-6 md:p-8 lg:p-10 relative animate-fade-in-up">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl"></div>

          <div className="relative">
            <button
              onClick={() => navigate("/register")}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Quay lại đăng ký</span>
            </button>

            <div className="text-center mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Kiểm tra email của bạn
              </h2>
              <p className="text-gray-600 text-xs sm:text-sm">
                Chúng tôi đã gửi mã xác thực 6 chữ số đến
              </p>
              <p className="text-blue-600 font-semibold mt-1 text-sm sm:text-base break-all px-2">{email}</p>
            </div>

            <form className="space-y-4 sm:space-y-5" onSubmit={handleVerify}>
              <div>
                <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700">
                  Mã xác thực
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-center text-xl sm:text-2xl font-bold tracking-widest border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={handleCodeChange}
                    maxLength={6}
                    autoComplete="off"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Nhập mã 6 chữ số từ email
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="relative w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span className="text-xs sm:text-base">Đang xác thực...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-base">Xác thực tài khoản</span>
                  </span>
                )}
              </button>
            </form>

            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
              <p className="text-xs sm:text-sm text-gray-600 text-center mb-2 sm:mb-3">
                Không nhận được mã?
              </p>
              <button
                onClick={handleResendCode}
                disabled={resendLoading || countdown > 0}
                className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-blue-600 border-2 border-blue-600 rounded-lg sm:rounded-xl hover:bg-blue-50 transition-all duration-300 font-semibold text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>Đang gửi...</span>
                  </>
                ) : countdown > 0 ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Gửi lại sau ({countdown}s)</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Gửi lại mã xác thực</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg sm:rounded-xl">
              <p className="text-xs text-yellow-800 leading-relaxed">
                <strong>Lưu ý:</strong> Mã xác thực có hiệu lực trong 15 phút.
                Nếu không thấy email, vui lòng kiểm tra thư mục spam.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VerifyEmail;

