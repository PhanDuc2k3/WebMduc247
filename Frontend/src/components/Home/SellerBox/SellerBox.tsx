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
    <section className="mt-12">
      <div className="bg-gradient-to-r from-[#00c6fb] to-[#005bea] text-white rounded-2xl px-6 md:px-10 py-8 md:py-10 flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* --- Nội dung bên trái --- */}
        <div className="text-center md:text-left flex-1">
          <h3 className="text-[1.4rem] md:text-[1.6rem] font-bold mb-2">
            Bán hàng cùng ShopMduc247
          </h3>
          <p className="text-base mb-4">
            Mở cửa hàng online miễn phí, tiếp cận hàng triệu khách hàng trên toàn quốc
          </p>

          <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm md:text-base mb-5">
            <span>50M+ Người mua</span>
            <span>500K+ Sản phẩm</span>
            <span>Tăng trưởng 200%</span>
          </div>

          <div className="flex justify-center md:justify-start gap-4">
            <button className="bg-white text-[#00c6fb] font-semibold rounded-lg px-5 py-2.5 hover:brightness-110 transition">
              Đăng ký bán hàng
            </button>
            <button className="bg-white text-[#005bea] font-semibold rounded-lg px-5 py-2.5 hover:brightness-110 transition">
              Tìm hiểu thêm
            </button>
          </div>
        </div>

        {/* --- Icon bên phải --- */}
        <div className="flex items-center justify-center bg-white/10 rounded-xl w-24 h-24 md:w-32 md:h-32">
          <span className="text-5xl md:text-6xl">🏬</span>
        </div>
      </div>
    </section>
  );
};

export default SellerBox;
