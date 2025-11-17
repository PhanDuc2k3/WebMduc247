// StorePage.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Store, AlertCircle, Loader2 } from "lucide-react";
import StoreHeader from "../../components/Store/StoreHeader/StoreHeader";
import StoreOverview from "../../components/Store/StoreInfo/StoreInfo"; // mô tả cửa hàng
import FeaturedProduct from "../../components/Store/FeaturedProduct/FeaturedProduct";
import Categories from "../../components/Store/Categories/Categories";
import storeApi from "../../api/storeApi";
import type { StoreType } from "../../types/store";

const tabs = [
  { id: "info", label: "Thông tin cửa hàng" },
  { id: "featured", label: "Sản phẩm nổi bật" },
  { id: "categories", label: "Danh mục" },
];

const StorePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("info");
  const [store, setStore] = useState<StoreType | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch store cho header và overview
  useEffect(() => {
    const fetchStore = async () => {
      if (!id) return;
      try {
        const res = await storeApi.getStoreById(id);
        setStore(res.data.store || res.data); // backend trả về { store } hoặc trực tiếp
      } catch (err) {
        console.error("Lỗi khi fetch store:", err);
        setStore(null);
      } finally {
        setLoading(false);
      }
    };
    fetchStore();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full p-6 sm:p-8 md:p-16 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center mb-3 md:mb-4">
            <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-blue-600 animate-spin" />
          </div>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg font-medium">Đang tải thông tin cửa hàng...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="w-full p-6 sm:p-8 md:p-16 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center mb-3 md:mb-4">
            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-red-500" />
          </div>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg font-semibold">Cửa hàng không tồn tại</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-3 md:p-4 lg:p-6">
      {/* Header */}
      <div className="pb-4 md:pb-6 animate-fade-in-up">
        <StoreHeader store={store} />
      </div>

      {/* Tabs */}
      <div className="pb-4 md:pb-6 animate-fade-in-up delay-200">
        <div className="flex gap-2 bg-gradient-to-r from-gray-100 to-gray-50 p-1.5 sm:p-2 rounded-xl md:rounded-2xl w-full shadow-md border border-gray-200 overflow-x-auto no-scrollbar scroll-smooth -mx-3 sm:mx-0 px-3 sm:px-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 sm:px-4 sm:py-2.5 md:px-8 md:py-3 text-xs sm:text-sm md:text-base font-bold rounded-lg md:rounded-xl border-2 transition-all duration-300 transform hover:scale-105 active:scale-95 whitespace-nowrap flex-shrink-0 touch-manipulation ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white border-blue-600 shadow-lg scale-105"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in-up delay-300">
        {activeTab === "info" && (
          <div className="card-container animate-slide-up">
            <StoreOverview store={store} />
          </div>
        )}

        {activeTab === "featured" && (
          <div className="card-container animate-slide-up">
            <FeaturedProduct storeId={id!} />
          </div>
        )}

        {activeTab === "categories" && (
          <div className="card-container animate-slide-up">
            <Categories storeId={store._id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StorePage;

