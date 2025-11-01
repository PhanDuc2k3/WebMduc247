// StorePage.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
      <div className="w-full py-16 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🏪</div>
          <p className="text-gray-600 text-lg font-medium">Đang tải thông tin cửa hàng...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="w-full py-16 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-gray-600 text-lg font-semibold text-red-500">Cửa hàng không tồn tại</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-8 md:py-12">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <StoreHeader store={store} />
      </div>

      {/* Tabs */}
      <div className="mb-8 animate-fade-in-up delay-200">
        <div className="flex space-x-3 bg-gradient-to-r from-gray-100 to-gray-50 p-2 rounded-2xl w-fit shadow-md border border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-8 py-3 text-base font-bold rounded-xl border-2 transition-all duration-300 transform hover:scale-105 whitespace-nowrap ${
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
