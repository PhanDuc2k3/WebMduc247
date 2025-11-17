import axios, { type AxiosInstance, type AxiosError } from "axios";
import { toast } from "react-toastify";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;
  // "http://localhost:5000";

const axiosClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Flag để chỉ log 1 lần
let hasLoggedBaseURL = false;

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    // ✅ giữ nguyên headers nếu đã có
    const headers = config.headers ?? {} as any;
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers;
  }

  // Chỉ log 1 lần khi khởi động
  if (import.meta.env.DEV && !hasLoggedBaseURL) {
    console.log("API base URL:", API_BASE_URL);
    hasLoggedBaseURL = true;
  }

  return config;
});

// Response interceptor để tự động hiển thị toast khi có lỗi
axiosClient.interceptors.response.use(
  (response) => {
    // Trả về response thành công bình thường
    return response;
  },
  (error: AxiosError) => {
    // Kiểm tra nếu request có flag skipToast để bỏ qua interceptor
    const skipToast = (error.config as any)?.skipToast;
    if (skipToast) {
      return Promise.reject(error);
    }

    // Bỏ qua toast cho các endpoint không quan trọng khi chưa đăng nhập
    const url = error.config?.url || "";
    const silentEndpoints = [
      "/api/favorites/check/", // Check favorite status - không cần toast khi 401
    ];
    
    const isSilentError = error.response?.status === 401 && 
      silentEndpoints.some(endpoint => url.includes(endpoint));
    
    if (isSilentError) {
      return Promise.reject(error);
    }

    // Chỉ xử lý lỗi nếu có response từ server
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      const message = data?.message || "Có lỗi xảy ra";

      // Xử lý các trường hợp lỗi cụ thể
      switch (status) {
        case 400:
          // Bad Request - Validation errors
          toast.error(message, {
            position: "top-right",
            autoClose: 3000,
            toastId: `error-400-${message.slice(0, 20)}`, // Dùng message để tạo ID duy nhất
          });
          break;

        case 401:
          // Unauthorized - Chưa đăng nhập hoặc token hết hạn
          if (!localStorage.getItem("token")) {
            toast.warning("Vui lòng đăng nhập để tiếp tục", {
              position: "top-right",
              autoClose: 3000,
              toastId: "auth-required", // Cùng ID để chỉ hiển thị 1 toast
            });
          } else {
            // Token hết hạn
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại", {
              position: "top-right",
              autoClose: 3000,
              toastId: "session-expired", // Cùng ID để chỉ hiển thị 1 toast
            });
            // Redirect to login nếu không phải đang ở trang login
            if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
              setTimeout(() => {
                window.location.href = "/login";
              }, 1000);
            }
          }
          break;

        case 403:
          // Forbidden - Không có quyền hoặc tài khoản chưa xác thực
          if (data?.needsVerification) {
            // Tài khoản chưa xác thực email
            const userEmail = data?.email || "";
            toast.error(message || "Tài khoản chưa được xác thực. Vui lòng kiểm tra email và xác thực tài khoản.", {
              position: "top-right",
              autoClose: 4000,
              toastId: "email-verification-required",
              onClose: () => {
                // Chuyển đến trang xác thực email nếu không phải đang ở đó
                if (window.location.pathname !== "/verify-email") {
                  window.location.href = `/verify-email?email=${encodeURIComponent(userEmail)}`;
                }
              },
            });
          } else {
            toast.error(message || "Bạn không có quyền thực hiện thao tác này", {
              position: "top-right",
              autoClose: 3000,
              toastId: `error-403-${message.slice(0, 20)}`,
            });
          }
          break;

        case 404:
          // Not Found - Chỉ hiển thị toast nếu không phải là check favorite
          if (!url.includes("/favorites/check/")) {
            toast.error(message || "Không tìm thấy dữ liệu", {
              position: "top-right",
              autoClose: 3000,
              toastId: `error-404-${url.slice(-20)}`,
            });
          }
          break;

        case 409:
          // Conflict - Dữ liệu đã tồn tại
          toast.warning(message || "Dữ liệu đã tồn tại", {
            position: "top-right",
            autoClose: 3000,
            toastId: `error-409-${message.slice(0, 20)}`,
          });
          break;

        case 422:
          // Unprocessable Entity - Validation errors
          toast.error(message || "Dữ liệu không hợp lệ", {
            position: "top-right",
            autoClose: 3000,
            toastId: `error-422-${message.slice(0, 20)}`,
          });
          break;

        case 500:
        case 502:
        case 503:
          // Server errors
          toast.error(message || "Lỗi máy chủ. Vui lòng thử lại sau", {
            position: "top-right",
            autoClose: 4000,
            toastId: `error-${status}`, // Cùng ID cho cùng loại lỗi server
          });
          break;

        default:
          // Các lỗi khác
          toast.error(message || "Có lỗi xảy ra. Vui lòng thử lại", {
            position: "top-right",
            autoClose: 3000,
            toastId: `error-${status}-${Date.now()}`,
          });
      }
    } else if (error.request) {
      // Request đã được gửi nhưng không nhận được response (network error)
      toast.error("Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại", {
        position: "top-right",
        autoClose: 4000,
        toastId: "network-error", // Cùng ID để chỉ hiển thị 1 toast
      });
    } else {
      // Lỗi khi setup request
      toast.error("Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại", {
        position: "top-right",
        autoClose: 3000,
        toastId: "request-error",
      });
    }

    // Vẫn throw error để component có thể xử lý nếu cần
    return Promise.reject(error);
  }
);

export default axiosClient;
