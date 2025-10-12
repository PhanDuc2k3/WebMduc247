// StorePage.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import StoreHeader from "../../components/Store/StoreHeader/StoreHeader";
import StoreInfo from "../../components/Store/StoreInfo/StoreInfo";
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

  // Fetch store for header (StoreHeader cần dữ liệu store)
  useEffect(() => {
    const fetchStore = async () => {
      if (!id) return;
      try {
        const res = await storeApi.getStoreById(id);
        setStore(res.data.store || res.data); // tùy backend trả về { store } hay trực tiếp
      } catch (err) {
        console.error("Lỗi khi fetch store:", err);
        setStore(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, [id]);

  if (loading)
    return <p className="text-center mt-6">Đang tải cửa hàng...</p>;
  if (!store)
    return (
      <p className="text-center mt-6 text-red-500">Cửa hàng không tồn tại.</p>
    );

  return (
    <div className="max-w-6xl mx-auto p-4 font-sans text-gray-800">
      {/* Header */}
      <StoreHeader  store={store} />

      {/* Tabs */}
      <div className="flex space-x-4 border-b mt-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-4 font-medium transition duration-200 ${
              activeTab === tab.id
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-blue-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "info" && <StoreInfo />}
        {activeTab === "featured" && <FeaturedProduct storeId={id!} />}
        {activeTab === "categories" && <Categories  />}
      </div>
    </div>
  );
};

export default StorePage;
