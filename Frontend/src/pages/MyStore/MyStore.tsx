import React, { useEffect, useState } from "react";
import StoreRegisterForm from "../../components/MyStore/StoreRegisterForm/StoreRegisterForm";
import Overview from "../../components/MyStore/Overview/Overview";
import ProductManagement from "../../components/MyStore/ProductManagement/ProductManagement";
import OrderManagement from "../../components/MyStore/OrderManagement/OrderManagement";
import Statistics from "../../components/MyStore/Statistics/Statistics";
import VoucherManagement from "../../components/MyStore/VoucherManagement/VoucherManagement";
import axiosClient from "../../api/axiosClient";

const tabs = [
  { key: "overview", label: "Tổng quan" },
  { key: "products", label: "Sản phẩm" },
  { key: "orders", label: "Đơn hàng" },
  { key: "stats", label: "Thống kê" },
  { key: "voucher", label: "Voucher" },
];

const MyStore: React.FC = () => {
  const [role, setRole] = useState<string>("buyer");
  const [hasStore, setHasStore] = useState<boolean>(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [sellerRequestStatus, setSellerRequestStatus] = useState<string>("none");
  const [activeTab, setActiveTab] = useState("overview");
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

  if (loading) return <div className="p-6">Đang tải...</div>;

  if (role === "buyer" && !hasStore && sellerRequestStatus === "none") {
    return (
      <div className="bg-[#f8f9fb] min-h-screen px-8 py-6">
        <StoreRegisterForm onSuccess={() => setSellerRequestStatus("pending")} />
      </div>
    );
  }

  if (role === "buyer" && sellerRequestStatus === "pending") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <h2 className="text-xl font-semibold mb-2">Yêu cầu mở cửa hàng đang chờ duyệt</h2>
        <p className="text-gray-600">Vui lòng chờ admin phê duyệt yêu cầu của bạn.</p>
      </div>
    );
  }

  if (role === "seller" && hasStore) {
    return (
      <div className="bg-[#f8f9fb] min-h-screen px-8 py-6">
        <h1 className="font-bold text-xl mb-1">Dashboard Người bán</h1>
        <p className="text-gray-600 mb-6">Quản lý cửa hàng và sản phẩm của bạn</p>

        <div className="flex gap-2 mb-4">
          {tabs.map((tab) => (
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

        <div>
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
      <div className="p-6">
        <p className="text-gray-600">Bạn là seller nhưng chưa có cửa hàng nào.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <p className="text-gray-600">Bạn không có quyền truy cập trang này.</p>
    </div>
  );
};

export default MyStore;
