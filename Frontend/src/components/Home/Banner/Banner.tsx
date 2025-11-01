import React from "react";
import { Link } from "react-router-dom";

const Banner: React.FC = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 mt-8 animate-fade-in-up">
      {/* Banner chính */}
      <div className="lg:flex-[2] relative rounded-2xl overflow-hidden w-full group flex lg:max-h-[380px] shadow-xl hover:shadow-2xl transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
        <img
          src="https://res.cloudinary.com/dlbgb4whu/image/upload/v1760882192/messages/bmdxizhkdtje6sxqprmi.png"
          alt="Siêu Sale Cuối Năm"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-end p-6 lg:p-8 text-white transition-all duration-500 group-hover:from-black/70 group-hover:via-black/40 z-20">
          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-100">
            <h2 className="text-2xl lg:text-3xl xl:text-4xl font-bold mb-3 opacity-90 group-hover:opacity-100 transition-all duration-500 group-hover:mb-4">
              Siêu Sale Cuối Năm
            </h2>
            <p className="text-base lg:text-lg mb-4 opacity-80 group-hover:opacity-100 group-hover:text-white transition-all duration-500 delay-150">
              Giảm giá lên đến 70% cho tất cả sản phẩm
            </p>
            <Link
              to="/products"
              className="inline-block bg-white text-[#3a5ef7] px-6 lg:px-8 py-3 rounded-xl font-bold hover:bg-[#f0f4ff] transition-all duration-300 text-sm lg:text-base shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transform group-hover:scale-110"
            >
              Mua ngay →
            </Link>
          </div>
        </div>
      </div>

      {/* Banner phụ */}
      <div className="lg:flex-1 flex flex-col gap-4 lg:gap-6">
        {/* Flash Sale */}
        <div className="flex-1 relative rounded-2xl overflow-hidden w-full group lg:max-h-[180px] shadow-lg hover:shadow-xl transition-all duration-500 animate-fade-in-right delay-200">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-red-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
          <img
            src="https://res.cloudinary.com/dlbgb4whu/image/upload/v1760883412/Blue_and_White_Modern_9.9_Flash_Sale_Promotion_Banner_Horizontal_rsbgqw.png"
            alt="Flash Sale"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex flex-col justify-end p-4 lg:p-5 text-white transition-all duration-500 group-hover:from-black/70 z-20">
            <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
              <div className="text-lg lg:text-xl font-bold opacity-90 group-hover:opacity-100 transition-opacity duration-300">
                ⚡ Flash Sale
              </div>
              <div className="text-sm lg:text-base my-2 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                Kết thúc trong 2h:15p
              </div>
              <Link
                to="/products?flashSale=true"
                className="inline-block bg-white text-[#ff7e5f] px-4 py-2 rounded-lg font-semibold hover:bg-[#fff5f2] transition-all duration-300 text-sm lg:text-base shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transform"
              >
                Xem ngay →
              </Link>
            </div>
          </div>
        </div>

        {/* Miễn phí ship */}
        <div className="flex-1 relative rounded-2xl overflow-hidden w-full group lg:max-h-[180px] shadow-lg hover:shadow-xl transition-all duration-500 animate-fade-in-right delay-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-cyan-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
          <img
            src="https://res.cloudinary.com/dlbgb4whu/image/upload/v1760883412/Blue_and_White_Modern_9.9_Flash_Sale_Promotion_Banner_Horizontal_rsbgqw.png"
            alt="Miễn phí ship"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex flex-col justify-end p-4 lg:p-5 text-white transition-all duration-500 group-hover:from-black/70 z-20">
            <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
              <div className="text-lg lg:text-xl font-bold opacity-90 group-hover:opacity-100 transition-opacity duration-300">
                🚚 Miễn phí ship
              </div>
              <div className="text-sm lg:text-base my-2 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                Đơn từ 300k
              </div>
              <Link
                to="/products"
                className="inline-block bg-white text-[#00c6fb] px-4 py-2 rounded-lg font-semibold hover:bg-[#e6f7ff] transition-all duration-300 text-sm lg:text-base shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transform"
              >
                Mua sắm →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banner;
