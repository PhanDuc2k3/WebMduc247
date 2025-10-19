import React from "react";

const Banner: React.FC = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 mt-8">
      {/* Banner chính */}
      <div className="lg:flex-[2] relative rounded-2xl overflow-hidden w-full h-[450px] group">
        <img
          src="https://res.cloudinary.com/dlbgb4whu/image/upload/v1760882192/messages/bmdxizhkdtje6sxqprmi.png"
          alt="Siêu Sale Cuối Năm"
          className="w-full h-full object-cover transition duration-500 ease-out group-hover:scale-105"
        />

        {/* Lớp overlay & chữ (đưa xuống dưới) */}
        <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-6 text-white transition duration-500 ease-out group-hover:bg-black/50">
          <h2 className="text-2xl lg:text-3xl font-bold mb-3 opacity-90 transition duration-500 ease-out group-hover:text-4xl group-hover:font-extrabold group-hover:opacity-100">
            Siêu Sale Cuối Năm
          </h2>
          <p className="text-base lg:text-lg mb-4 opacity-80 transition duration-500 ease-out group-hover:opacity-100 group-hover:text-white/90">
            Giảm giá lên đến 70% cho tất cả sản phẩm
          </p>
          <button className="bg-white text-[#3a5ef7] px-4 lg:px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition duration-300 ease-out text-sm lg:text-base group-hover:scale-110">
            Mua ngay
          </button>
        </div>
      </div>

      {/* Banner phụ */}
      <div className="lg:flex-1 flex flex-col gap-4 lg:gap-6">
        {/* Flash Sale */}
        <div className="flex-1 relative rounded-2xl overflow-hidden w-full h-[200px] group">
          <img
            src="https://res.cloudinary.com/dlbgb4whu/image/upload/v1760883412/Blue_and_White_Modern_9.9_Flash_Sale_Promotion_Banner_Horizontal_rsbgqw.png"
            alt="Flash Sale"
            className="w-full h-full object-cover transition duration-500 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-4 text-white transition duration-500 ease-out group-hover:bg-black/50">
            <div className="text-lg lg:text-xl font-bold opacity-90 transition duration-500 ease-out group-hover:font-extrabold group-hover:opacity-100">
              Flash Sale
            </div>
            <div className="text-sm lg:text-base my-2 opacity-80 transition duration-500 ease-out group-hover:opacity-100 group-hover:text-white/90">
              Kết thúc trong 2h:15p
            </div>
            <button className="bg-white text-[#ff7e5f] px-3 lg:px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition duration-300 ease-out text-sm lg:text-base group-hover:scale-110">
              Xem ngay
            </button>
          </div>
        </div>

        {/* Miễn phí ship */}
        <div className="flex-1 relative rounded-2xl overflow-hidden w-full h-[200px] group">
          <img
            src="https://res.cloudinary.com/dlbgb4whu/image/upload/v1760883412/Blue_and_White_Modern_9.9_Flash_Sale_Promotion_Banner_Horizontal_rsbgqw.png"
            alt="Miễn phí ship"
            className="w-full h-full object-cover transition duration-500 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-4 text-white transition duration-500 ease-out group-hover:bg-black/50">
            <div className="text-lg lg:text-xl font-bold opacity-90 transition duration-500 ease-out group-hover:font-extrabold group-hover:opacity-100">
              Miễn phí ship
            </div>
            <div className="text-sm lg:text-base my-2 opacity-80 transition duration-500 ease-out group-hover:opacity-100 group-hover:text-white/90">
              Đơn từ 300k
            </div>
            <button className="bg-white text-[#00c6fb] px-3 lg:px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition duration-300 ease-out text-sm lg:text-base group-hover:scale-110">
              Mua sắm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banner;
