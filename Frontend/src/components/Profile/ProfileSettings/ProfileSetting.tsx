import React from "react";

const settings = [
  {
    title: "Thông báo email",
    desc: "Nhận thông báo về đơn hàng và khuyến mãi",
    btn: "Cài đặt",
  },
  {
    title: "Bảo mật tài khoản",
    desc: "Đổi mật khẩu và xác thực 2 bước",
    btn: "Cài đặt",
  },
  {
    title: "Địa chỉ giao hàng",
    desc: "Quản lý địa chỉ nhận hàng",
    btn: "Quản lý",
  },
  {
    title: "Phương thức thanh toán",
    desc: "Thẻ tín dụng và ví điện tử",
    btn: "Quản lý",
  },
];

const ProfileSettings: React.FC = () => (
  <div className="bg-white rounded-xl md:rounded-2xl shadow-lg border-2 border-gray-100 p-4 md:p-6 lg:p-8">
    <h3 className="font-semibold text-lg sm:text-xl mb-4 md:mb-6">Cài đặt tài khoản</h3>
    <div className="space-y-3 md:space-y-4 lg:space-y-6">
      {settings.map((item) => (
        <div
          key={item.title}
          className="border-2 border-gray-200 rounded-lg md:rounded-xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4"
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm sm:text-base md:text-lg font-medium mb-1">{item.title}</div>
            <div className="text-xs sm:text-sm md:text-base text-gray-500">{item.desc}</div>
          </div>
          <button className="bg-gray-100 px-4 py-2 md:px-6 md:py-2.5 rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-medium hover:bg-gray-200 transition-all duration-300 flex-shrink-0 w-full sm:w-auto">
            {item.btn}
          </button>
        </div>
      ))}
    </div>
  </div>
);

export default ProfileSettings;
