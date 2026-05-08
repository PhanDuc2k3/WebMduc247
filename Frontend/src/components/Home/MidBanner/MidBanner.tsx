import React from "react";
import { Truck, ShieldCheck, RotateCcw, HeadsetIcon, CheckCircle, Zap } from "lucide-react";

const MidBanner: React.FC = () => {
  return (
    <section className="mt-4 sm:mt-6 lg:mt-8">
      {/* Features Bar - Clean Style */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-xs sm:text-sm">Miễn phí vận chuyển</p>
              <p className="text-gray-500 text-[10px] sm:text-xs">Cho đơn từ 500K</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-xs sm:text-sm">Bảo đảm chính hãng</p>
              <p className="text-gray-500 text-[10px] sm:text-xs">100% authentic</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
              <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-xs sm:text-sm">Đổi trả dễ dàng</p>
              <p className="text-gray-500 text-[10px] sm:text-xs">Trong 7 ngày</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
              <HeadsetIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-xs sm:text-sm">Hỗ trợ 24/7</p>
              <p className="text-gray-500 text-[10px] sm:text-xs">Luôn sẵn sàng</p>
            </div>
          </div>
        </div>
      </div>

      {/* Promo Banner */}
      <div className="relative rounded-xl sm:rounded-2xl overflow-hidden mt-4 sm:mt-6 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-500"></div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10 px-6 sm:px-10 lg:px-16 py-8 sm:py-12 lg:py-16">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
            {/* Left Content */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full mb-3 sm:mb-4">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 fill-yellow-300" />
                <span className="text-white font-semibold text-xs sm:text-sm">Khuyến mãi đặc biệt</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2 sm:mb-3 leading-tight">
                Let's Shop<br />
                <span className="text-yellow-300">Beyond Boundaries</span>
              </h2>
              <p className="text-white/90 text-sm sm:text-base mb-5 sm:mb-6 max-w-md mx-auto lg:mx-0">
                Khám phá hàng ngàn sản phẩm chất lượng từ các cửa hàng uy tín
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 sm:gap-4">
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 sm:px-5 py-2 sm:py-3 text-center">
                  <p className="text-xl sm:text-2xl font-black text-white">100+</p>
                  <p className="text-white/80 text-[10px] sm:text-xs font-medium">Cửa hàng</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 sm:px-5 py-2 sm:py-3 text-center">
                  <p className="text-xl sm:text-2xl font-black text-yellow-300">500+</p>
                  <p className="text-white/80 text-[10px] sm:text-xs font-medium">Sản phẩm</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 sm:px-5 py-2 sm:py-3 text-center">
                  <p className="text-xl sm:text-2xl font-black text-white">10K+</p>
                  <p className="text-white/80 text-[10px] sm:text-xs font-medium">Khách hàng</p>
                </div>
              </div>
            </div>

            {/* Right Content - Featured Product */}
            <div className="hidden lg:flex flex-1 items-center justify-end">
              <div className="relative">
                <div className="w-80 h-80 rounded-3xl overflow-hidden shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-700">
                  <img
                    src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&h=600&fit=crop"
                    alt="Fashion collection"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -top-4 -right-4 bg-white rounded-2xl px-4 py-3 shadow-xl flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-bold text-gray-900 text-sm">Verified Seller</span>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-yellow-300 rounded-2xl px-4 py-3 shadow-xl">
                  <span className="font-black text-gray-900 text-lg">50% OFF</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MidBanner;
