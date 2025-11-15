import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, ShieldX } from "lucide-react";
import axiosClient from "../../api/axiosClient";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        // ✅ Kiểm tra từ localStorage trước
        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;
        
        // ✅ Nếu localStorage có role và là admin, cho phép truy cập ngay
        if (user && user.role === "admin") {
          setIsAdmin(true);
          setIsLoading(false);
          return;
        }

        // ✅ Nếu localStorage không có role hoặc role không phải admin, lấy từ API
        const token = localStorage.getItem("token");
        if (!token) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        try {
          const res = await axiosClient.get("/api/users/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const profile = res.data.user || res.data;
          
          if (profile.role === "admin") {
            setIsAdmin(true);
            // ✅ Cập nhật role vào localStorage
            if (userStr) {
              const userData = JSON.parse(userStr);
              userData.role = profile.role;
              localStorage.setItem("user", JSON.stringify(userData));
            }
          } else {
            setIsAdmin(false);
          }
        } catch (apiError) {
          console.error("Error fetching profile from API:", apiError);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error checking admin:", error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        <div className="text-center bg-white rounded-2xl shadow-xl border-2 border-red-200 p-8 max-w-md mx-4">
          <ShieldX className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-600 mb-6">
            Bạn không có quyền truy cập trang quản trị. Chỉ có quản trị viên mới có thể truy cập trang này.
          </p>
          <button
            onClick={() => window.location.href = "/"}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;

