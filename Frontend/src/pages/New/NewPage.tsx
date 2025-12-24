import React, { useState, useEffect } from "react";
import PromotionTabs from "../../components/New/PromotionTabs";
import PromotionCard from "../../components/New/PromotionCard";
import { Tag, Flame, Zap, ArrowUp, Wallet, Star, Gift } from "lucide-react";
import promotionApi from "../../api/promotionApi";
import type { PromotionType } from "../../api/promotionApi";

const tabs = [
  { label: "Tất cả", icon: <Tag size={18} className="text-blue-500" /> },
  { label: "Sale lớn", icon: <Flame size={18} className="text-red-500" /> },
  { label: "Flash Sale", icon: <Zap size={18} className="text-yellow-500" /> },
  { label: "Freeship", icon: <ArrowUp size={18} className="text-green-500" /> },
  { label: "Hoàn tiền", icon: <Wallet size={18} className="text-purple-500" /> },
  { label: "Đặc biệt", icon: <Star size={18} className="text-pink-500" /> },
  { label: "Tân thủ", icon: <Gift size={18} className="text-orange-500" /> },
];

const PromotionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Tất cả");
  const [promotions, setPromotions] = useState<PromotionType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPromotions();
  }, [activeTab]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const params: { category?: string; isActive?: boolean } = {
        isActive: true,
      };
      
      if (activeTab !== "Tất cả") {
        params.category = activeTab;
      }

      const res = await promotionApi.getAllPromotions(params);
      setPromotions(res.data);
    } catch (error) {
      console.error("Error fetching promotions:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString("vi-VN")} - ${end.toLocaleDateString("vi-VN")}`;
  };

  return (
    <div className="w-full py-8 md:py-12">
      {/* Header */}
      <div className="mb-8 animate-fade-in-down">
        <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-[#2F5FEB]">
          Tin tức & Khuyến mãi
        </h1>
        <p className="text-gray-600 text-lg">
          Những chương trình <span className="text-[#2F5FEB] font-semibold">khuyến mãi hấp dẫn</span> đang chờ đón bạn!
        </p>
      </div>

      <PromotionTabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg font-medium">Đang tải...</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && promotions.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg font-medium">Chưa có tin tức khuyến mãi nào</p>
        </div>
      )}

      {/* Grid 3 cột */}
      {!loading && promotions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 animate-fade-in-up">
          {promotions.map((promo) => (
            <PromotionCard
              key={promo._id}
              _id={promo._id}
              title={promo.title}
              description={promo.description}
              tags={promo.tags}
              date={formatDate(promo.startDate, promo.endDate)}
              views={promo.views}
              imageUrl={promo.imageUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PromotionPage;
