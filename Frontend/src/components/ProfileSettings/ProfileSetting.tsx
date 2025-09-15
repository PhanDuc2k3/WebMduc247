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
  <div className="bg-white rounded-xl shadow p-6">
    <h3 className="font-semibold text-lg mb-4">Cài đặt tài khoản</h3>
    <div className="space-y-4">
      {settings.map(item => (
        <div key={item.title} className="border rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">{item.title}</div>
            <div className="text-xs text-gray-500">{item.desc}</div>
          </div>
          <button className="bg-gray-100 px-4 py-2 rounded text-sm hover:bg-gray-200 font-medium">{item.btn}</button>
        </div>
      ))}
    </div>
  </div>
);

export default ProfileSettings;