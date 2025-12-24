import React, { useEffect, useState } from "react";
import StoreRegisterForm from "../../components/MyStore/StoreRegisterForm/StoreRegisterForm";
import Overview from "../../components/MyStore/Overview/Overview";
import ProductManagement from "../../components/MyStore/ProductManagement/ProductManagement";
import OrderManagement from "../../components/MyStore/OrderManagement/OrderManagement";
import ReturnManagement from "../../components/MyStore/ReturnManagement/ReturnManagement";
import Statistics from "../../components/MyStore/Statistics/Statistics";
import VoucherManagement from "../../components/MyStore/VoucherManagement/VoucherManagement";
import ManageStore from "../../components/MyStore/ManageStore/ManageStore"; // import component mới
import axiosClient from "../../api/axiosClient";

const tabs = [
  { key: "manageStore", label: "Quản lý cửa hàng", icon: "" },
  { key: "overview", label: "Tổng quan", icon: "" },
  { key: "products", label: "Sản phẩm", icon: "" },
  { key: "orders", label: "Đơn hàng", icon: "" },
  { key: "returns", label: "Quản lý sản phẩm thu hồi", icon: "" },
  { key: "stats", label: "Thống kê", icon: "" },
  { key: "voucher", label: "Voucher", icon: "" },
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
        <div className="text-center text-[#2F5FEB]">
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#2F5FEB]" />
          </div>
          <p className="text-lg font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (role === "buyer" && !hasStore && (sellerRequestStatus === "none" || sellerRequestStatus === "rejected")) {
    return (
      <div className="w-full py-8 md:py-12">
        <div className="mb-8 animate-fade-in-down">
          <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-[#2F5FEB] flex items-center gap-3">
            {sellerRequestStatus === "rejected" ? "Đăng ký lại mở cửa hàng" : "Đăng ký mở cửa hàng"}
          </h1>
          <p className="text-gray-600 text-lg">
            {sellerRequestStatus === "rejected" 
              ? "Yêu cầu trước đó của bạn đã bị từ chối. Vui lòng cập nhật thông tin và gửi lại yêu cầu mới."
              : "Bắt đầu hành trình bán hàng của bạn ngay hôm nay"
            }
          </p>
          {sellerRequestStatus === "rejected" && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-800">
                ⚠️ Yêu cầu trước đó của bạn đã bị từ chối. Vui lòng kiểm tra và cập nhật thông tin cửa hàng trước khi gửi lại.
              </p>
            </div>
          )}
        </div>
        <div className="animate-fade-in-up delay-200">
          <StoreRegisterForm onSuccess={() => {
            setSellerRequestStatus("pending");
            // Refresh để lấy thông tin mới
            window.location.reload();
          }} />
        </div>
      </div>
    );
  }

  if (role === "buyer" && sellerRequestStatus === "pending") {
    return (
      <div className="w-full py-16 flex items-center justify-center animate-fade-in">
        <div className="text-center bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-12 max-w-md">
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#2F5FEB]" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-[#2F5FEB]">Yêu cầu đang chờ duyệt</h2>
          <p className="text-gray-600 mb-4">Vui lòng chờ admin phê duyệt yêu cầu của bạn</p>
          <div className="mt-6 p-4 bg-[#2F5FEB]/5 border border-[#2F5FEB]/30 rounded-xl">
            <p className="text-sm text-[#2F5FEB]">
              Chúng tôi sẽ xem xét và liên hệ với bạn trong vòng 24 giờ
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (role === "seller" && hasStore) {
    return (
      <div className="w-full py-4 sm:py-6 md:py-8 lg:py-12 px-4 sm:px-6">
        <div className="mb-6 md:mb-8 animate-fade-in-down">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 text-[#2F5FEB]">
            Quản lý cửa hàng
          </h1>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg">Dashboard người bán - Quản lý cửa hàng và sản phẩm</p>
        </div>

        <div className="mb-4 sm:mb-6 animate-fade-in-up delay-200">
          {/* Mobile: Horizontal scroll, Desktop: Wrap */}
          <div className="bg-[#2F5FEB]/5 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl shadow-inner border border-[#2F5FEB]/20 overflow-x-auto no-scrollbar md:overflow-x-visible scroll-smooth -mx-4 sm:mx-0 px-4 sm:px-0">
            <div className="flex md:flex-wrap gap-2 sm:gap-2.5 min-w-max md:min-w-0 pb-1 md:pb-0">
              {tabs.map((tab, index) => (
                <button
                  key={tab.key}
                  className={`px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 flex items-center justify-center relative flex-shrink-0 whitespace-nowrap touch-manipulation ${
                    activeTab === tab.key
                      ? tab.key === "manageStore"
                        ? "bg-[#2F5FEB] text-white shadow-md scale-[1.02] min-w-[140px] sm:min-w-[160px] md:min-w-[190px] font-bold"
                        : "bg-[#2F5FEB] text-white shadow-md scale-[1.02]"
                      : tab.key === "manageStore"
                      ? "bg-white text-gray-800 hover:bg-[#2F5FEB]/5 active:bg-[#2F5FEB]/10 hover:text-[#2F5FEB] min-w-[140px] sm:min-w-[160px] md:min-w-[190px] border border-[#2F5FEB]/30"
                      : "bg-white text-gray-700 hover:bg-[#2F5FEB]/5 active:bg-[#2F5FEB]/10 hover:text-[#2F5FEB] border border-gray-200"
                  } animate-fade-in-up`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.icon && <span className="text-base sm:text-lg md:text-xl mr-1 sm:mr-1.5 md:mr-2 flex-shrink-0">{tab.icon}</span>}
                  <span className={`text-xs sm:text-sm md:text-base ${tab.key === "manageStore" && activeTab === tab.key ? "tracking-wide" : ""}`}>
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="animate-fade-in-up delay-300">
          {activeTab === "manageStore" && <ManageStore />}
          {activeTab === "overview" && <Overview />}
          {activeTab === "products" && <ProductManagement />}
          {activeTab === "orders" && <OrderManagement />}
          {activeTab === "returns" && <ReturnManagement />}
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
