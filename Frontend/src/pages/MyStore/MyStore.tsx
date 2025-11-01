import React, { useEffect, useState } from "react";
import StoreRegisterForm from "../../components/MyStore/StoreRegisterForm/StoreRegisterForm";
import Overview from "../../components/MyStore/Overview/Overview";
import ProductManagement from "../../components/MyStore/ProductManagement/ProductManagement";
import OrderManagement from "../../components/MyStore/OrderManagement/OrderManagement";
import Statistics from "../../components/MyStore/Statistics/Statistics";
import VoucherManagement from "../../components/MyStore/VoucherManagement/VoucherManagement";
import ManageStore from "../../components/MyStore/ManageStore/ManageStore"; // import component mới
import axiosClient from "../../api/axiosClient";

const tabs = [
  { key: "manageStore", label: "Quản lý cửa hàng", icon: "🏪" },
  { key: "overview", label: "Tổng quan", icon: "📊" },
  { key: "products", label: "Sản phẩm", icon: "📦" },
  { key: "orders", label: "Đơn hàng", icon: "🛒" },
  { key: "stats", label: "Thống kê", icon: "📈" },
  { key: "voucher", label: "Voucher", icon: "🎁" },
];

const MyStore: React.FC = () => {
  const [role, setRole] = useState<string>("buyer");
  const [hasStore, setHasStore] = useState<boolean>(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [sellerRequestStatus, setSellerRequestStatus] = useState<string>("none");
  const [activeTab, setActiveTab] = useState("manageStore"); // mặc định mở tab quản lý cửa hàng
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axiosClient.get("/api/users/profile");
        const data = res.data;

        const userRole = data.role || data.user?.role || "buyer";
        const userStore = data.store || data.user?.store || null;
        const userSellerRequest = data.sellerRequest || data.user?.sellerRequest || null;

        setRole(userRole);
        setHasStore(!!userStore);
        setStoreId(userStore?._id || null);
        setSellerRequestStatus(userSellerRequest?.status || "none");
      } catch (err) {
        console.error("Lỗi khi fetch profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="w-full py-16 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🏪</div>
          <p className="text-gray-600 text-lg font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (role === "buyer" && !hasStore && sellerRequestStatus === "none") {
    return (
      <div className="w-full py-8 md:py-12">
        <div className="mb-8 animate-fade-in-down">
          <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900 gradient-text flex items-center gap-3">
            <span>🏪</span> Đăng ký mở cửa hàng
          </h1>
          <p className="text-gray-600 text-lg">Bắt đầu hành trình bán hàng của bạn ngay hôm nay</p>
        </div>
        <div className="animate-fade-in-up delay-200">
          <StoreRegisterForm onSuccess={() => setSellerRequestStatus("pending")} />
        </div>
      </div>
    );
  }

  if (role === "buyer" && sellerRequestStatus === "pending") {
    return (
      <div className="w-full py-16 flex items-center justify-center animate-fade-in">
        <div className="text-center bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-12 max-w-md">
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Yêu cầu đang chờ duyệt</h2>
          <p className="text-gray-600 mb-4">Vui lòng chờ admin phê duyệt yêu cầu của bạn</p>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800">
              ⏰ Chúng tôi sẽ xem xét và liên hệ với bạn trong vòng 24 giờ
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (role === "seller" && hasStore) {
    return (
      <div className="w-full py-8 md:py-12">
        <div className="mb-8 animate-fade-in-down">
          <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900 gradient-text flex items-center gap-3">
            <span>🏬</span> Quản lý cửa hàng
          </h1>
          <p className="text-gray-600 text-lg">Dashboard người bán - Quản lý cửa hàng và sản phẩm</p>
        </div>

        <div className="mb-6 animate-fade-in-up delay-200">
          <div className="flex flex-wrap gap-3">
            {tabs.map((tab, index) => (
              <button
                key={tab.key}
                className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105"
                    : "bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                } animate-fade-in-up`}
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="animate-fade-in-up delay-300">
          {activeTab === "manageStore" && <ManageStore />}
          {activeTab === "overview" && <Overview />}
          {activeTab === "products" && <ProductManagement />}
          {activeTab === "orders" && <OrderManagement />}
          {activeTab === "stats" && storeId && <Statistics storeId={storeId} />}
          {activeTab === "voucher" && <VoucherManagement />}
        </div>
      </div>
    );
  }

  if (role === "seller" && !hasStore) {
    return (
      <div className="w-full py-16 flex items-center justify-center animate-fade-in">
        <div className="text-center bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-12 max-w-md">
          <div className="text-6xl mb-4">🏪</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Chưa có cửa hàng</h2>
          <p className="text-gray-600 mb-6">Bạn là seller nhưng chưa có cửa hàng nào</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            🔄 Tải lại trang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-16 flex items-center justify-center animate-fade-in">
      <div className="text-center bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-12 max-w-md">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Không có quyền truy cập</h2>
        <p className="text-gray-600">Bạn không có quyền truy cập trang này</p>
      </div>
    </div>
  );
};

export default MyStore;
