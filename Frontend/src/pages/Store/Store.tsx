import React, { useState } from "react";
import { useParams } from "react-router-dom";
import StoreHeader from "../../components/Store/StoreHeader/StoreHeader";
import StoreInfo from "../../components/Store/StoreInfo/StoreInfo";
import FeaturedProduct from "../../components/Store/FeaturedProduct/FeaturedProduct";
import Categories from "../../components/Store/Categories/Categories";

const tabs = [
  { id: "info", label: "Thông tin cửa hàng" },
  { id: "featured", label: "Sản phẩm nổi bật" },
  { id: "categories", label: "Danh mục" },
];

const StorePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("info");

  return (
    <div className="max-w-6xl mx-auto p-4 font-sans text-gray-800">
      {id && <StoreHeader storeId={id} />}

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
        {activeTab === "featured" && id && <FeaturedProduct storeId={id} />}
      </div>
    </div>
  );
};

export default StorePage;