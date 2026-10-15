import React, { useState, useEffect } from "react";
import PromotionTabs from "../../components/New/PromotionTabs";
import PromotionCard from "../../components/New/PromotionCard";
import { Tag, Flame, Zap, ArrowUp, Wallet, Star, Gift } from "lucide-react";
import promotionApi from "../../api/promotionApi";
import type { PromotionType } from "../../api/promotionApi";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";

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

  const fetchPromotions = React.useCallback(async () => {
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
  }, [activeTab]);

  useEffect(() => {
    void fetchPromotions();
  }, [fetchPromotions]);

  const formatDate = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString("vi-VN")} - ${end.toLocaleDateString("vi-VN")}`;
  };

  return (
    <div className="canva-public-page">
      <ContentBreadcrumb items={[{ label: "Khuyến mãi" }]} />
      <div className="canva-public-page__content">

      <PromotionTabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Loading */}
      {loading && (
        <div className="canva-public-page__loader"><span aria-label="Đang tải" /></div>
      )}

      {/* Empty state */}
      {!loading && promotions.length === 0 && (
        <div className="canva-public-page__empty">
          <p className="text-gray-500 text-lg font-medium">Chưa có chương trình khuyến mãi nào</p>
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
    </div>
  );
};

export default PromotionPage;
