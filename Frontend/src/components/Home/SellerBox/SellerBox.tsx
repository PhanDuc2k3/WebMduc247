import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import adminStatisticsApi from "../../../api/adminStatisticsApi";

const SellerBox: React.FC = () => {
  const [showBox, setShowBox] = useState(false);
  const [stats, setStats] = useState<{
    totalUsers?: number;
    totalStores?: number;
    totalProducts?: number;
  }>({});
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        if (user.role === "seller" || user.role === "admin") {
          setShowBox(false);
          return;
        }
      }
      setShowBox(true);
    } catch (err) {
      console.error("❌ Lỗi khi đọc localStorage:", err);
      setShowBox(true);
    }
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminStatisticsApi.getDashboardStats();
        if (res.data) {
          setStats({
            totalUsers: res.data.totalUsers || 0,
            totalStores: res.data.totalStores || 0,
            totalProducts: res.data.totalProducts || 0,
          });
        }
      } catch (err) {
        console.error("❌ Lỗi khi lấy thống kê:", err);
      }
    };

    if (showBox) {
      fetchStats();
    }
  }, [showBox]);

  const handleRegisterClick = () => {
    navigate("/mystore");
  };

  if (!showBox) return null;

  return (
    <section className="mt-6 sm:mt-8 md:mt-12">
      <div className="bg-[#2F5FEB] text-white rounded-xl sm:rounded-2xl md:rounded-3xl px-4 sm:px-6 md:px-12 py-6 sm:py-8 md:py-10 lg:py-14 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 md:gap-8 shadow-2xl">
        {/* Content */}
        <div className="w-full">
          <div className="text-center md:text-left flex-1">
            <h3 className="text-lg sm:text-xl md:text-[1.5rem] lg:text-[2rem] font-extrabold mb-2 sm:mb-3">
              Bán hàng cùng ShopMduc247
            </h3>
            <p className="text-sm sm:text-base md:text-lg mb-4 sm:mb-5 md:mb-6 opacity-95">
              Mở cửa hàng online miễn phí, tiếp cận hàng triệu khách hàng trên toàn quốc.
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-3 md:gap-4 lg:gap-8 text-xs sm:text-sm md:text-base mb-4 sm:mb-6 md:mb-8">
              <span className="bg-white/15 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold">
                {stats.totalUsers ? stats.totalUsers.toLocaleString("vi-VN") : "..."} người mua
              </span>
              <span className="bg-white/15 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold">
                {stats.totalProducts ? stats.totalProducts.toLocaleString("vi-VN") : "..."} sản phẩm
              </span>
              <span className="bg-white/15 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold">
                {stats.totalStores ? stats.totalStores.toLocaleString("vi-VN") : "..."} cửa hàng
              </span>
            </div>

            <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-3 sm:gap-4">
              <button
                onClick={handleRegisterClick}
                className="flex-1 bg-white text-[#2F5FEB] font-bold rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base shadow-lg hover:shadow-xl hover:bg-[#f3f4ff] transition-all duration-300 transform hover:scale-105 active:scale-95 touch-manipulation flex items-center justify-center"
              >
                Đăng ký bán hàng
              </button>
              <button
                className="flex-1 bg-transparent border border-white/70 text-white font-bold rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base hover:bg-white/10 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 touch-manipulation flex items-center justify-center"
              >
                Tìm hiểu thêm
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SellerBox;
