import React, { useEffect, useState } from "react";

const SellerBox: React.FC = () => {
  const [showBox, setShowBox] = useState(false);

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

  if (!showBox) return null;

  return (
    <section className="mt-6 sm:mt-8 md:mt-12 animate-fade-in-up delay-400">
      <div className="relative bg-gradient-to-r from-[#00c6fb] via-[#005bea] to-[#667eea] text-white rounded-xl sm:rounded-2xl md:rounded-3xl px-4 sm:px-6 md:px-12 py-6 sm:py-8 md:py-10 lg:py-14 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 md:gap-8 overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow duration-500 group">
        {/* Animated gradient background */}
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            background: "linear-gradient(45deg, #00c6fb, #005bea, #667eea, #764ba2)",
            backgroundSize: "400% 400%",
            animation: "gradientShift 15s ease infinite",
          }}
        ></div>
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        
        {/* Content wrapper */}
        <div className="relative z-10 w-full">
          <div className="text-center md:text-left flex-1 transform group-hover:translate-x-2 transition-transform duration-500">
            <h3 className="text-lg sm:text-xl md:text-[1.5rem] lg:text-[2rem] font-extrabold mb-2 sm:mb-3 drop-shadow-lg">
              🚀 Bán hàng cùng ShopMduc247
            </h3>
            <p className="text-sm sm:text-base md:text-lg mb-4 sm:mb-5 md:mb-6 opacity-95">
              Mở cửa hàng online miễn phí, tiếp cận hàng triệu khách hàng trên toàn quốc
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-3 md:gap-4 lg:gap-8 text-xs sm:text-sm md:text-base mb-4 sm:mb-6 md:mb-8">
              <span className="bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold shadow-lg transform hover:scale-110 transition-transform duration-300">
                👥 50M+ Người mua
              </span>
              <span className="bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold shadow-lg transform hover:scale-110 transition-transform duration-300">
                📦 500K+ Sản phẩm
              </span>
              <span className="bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold shadow-lg transform hover:scale-110 transition-transform duration-300">
                📈 Tăng trưởng 200%
              </span>
            </div>

            <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-3 sm:gap-4">
              <button className="bg-white text-[#00c6fb] font-bold rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 transform group-hover:scale-105">
                ✨ Đăng ký bán hàng
              </button>
              <button className="bg-white/10 backdrop-blur-md border-2 border-white/30 text-white font-bold rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base shadow-lg hover:bg-white/20 hover:scale-105 active:scale-95 transition-all duration-300 transform">
                📖 Tìm hiểu thêm
              </button>
            </div>
          </div>
        </div>

        {/* Icon bên phải */}
        <div className="relative z-10 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-36 lg:h-36 shadow-2xl transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
          <span className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl transform group-hover:scale-125 transition-transform duration-500">🏬</span>
        </div>
      </div>
    </section>
  );
};

export default SellerBox;
