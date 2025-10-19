import React, { useState } from "react";
import UserManagement from "../../components/Admin/UserManagement/UserManagement";
// import StoreManagement from "../../components/Admin/StoreManagement/StoreManagement";
// import OrderManagement from "../../components/Admin/OrderManagement/OrderManagement";
// import VoucherManagement from "../../components/Admin/VoucherManagement/VoucherManagement";
import SellerApproval from "../../components/Admin/SellerRequests/SellerRequests";
import BannerManagement from "../../components/Admin/BannerManagement/BannerManagement";

const tabs = [
  { key: "users", label: "Quản lý người dùng" },
  { key: "stores", label: "Quản lý cửa hàng" },
  { key: "orders", label: "Quản lý đơn hàng" },
  { key: "vouchers", label: "Quản lý Voucher" },
  { key: "sellerRequest", label: "Duyệt đơn người bán" },
    { key: "banner", label: "Chỉnh sửa Banner" },

];

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="bg-[#f8f9fb] min-h-screen px-8 py-6">
      <h1 className="font-bold text-xl mb-1">Admin Dashboard</h1>
      <p className="text-gray-600 mb-6">Quản lý hệ thống thương mại điện tử</p>
      {/* Thống kê */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <StatBox title="Tổng người dùng" value="125.400" percent="+2.5%" icon="👤" />
        <StatBox title="Cửa hàng hoạt động" value="8.650" percent="+2.8%" icon="🏬" />
        <StatBox title="Sản phẩm" value="456.000" percent="+1.5%" icon="📦" />
        <StatBox title="Đơn hàng" value="89.300" percent="-5.1%" icon="🛒" />
        <StatBox title="Doanh thu" value="2.45B đ" percent="+12.5%" icon="💰" />
        <StatBox title="Mục tiêu tháng" value="75%" percent="81.7%" icon="🎯" progress />
      </div>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`px-5 py-2 rounded-full font-medium ${
              activeTab === tab.key
                ? "bg-gray-200 text-black"
                : "bg-gray-100 text-gray-500"
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div className="bg-white rounded-xl shadow p-6">
        {activeTab === "users" && <UserManagement />}
        {activeTab === "stores" &&  <div>Báo cáo...</div>}
        {activeTab === "orders" &&  <div>Báo cáo...</div>}
        {activeTab === "vouchers" &&  <div>Báo cáo...</div>}
        {activeTab === "sellerRequest" && <SellerApproval />}
        {activeTab === "banner" && <BannerManagement />} {/* Banner tab */}

      </div>
    </div>
  );
};

const StatBox: React.FC<{
  title: string;
  value: string;
  percent: string;
  icon: string;
  progress?: boolean;
}> = ({ title, value, percent, icon, progress }) => (
  <div className="bg-white rounded-lg shadow flex flex-col justify-between p-4 h-28">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{title}</span>
    </div>
    <div className="font-bold text-xl">{value}</div>
    <div className="text-xs text-green-600">{percent}</div>
    {progress && (
      <div className="mt-2 w-full h-2 bg-gray-200 rounded">
        <div className="bg-black h-2 rounded" style={{ width: "75%" }} />
      </div>
    )}
  </div>
);

export default AdminDashboard;