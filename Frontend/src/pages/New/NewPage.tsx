import React, { useState } from "react";
import PromotionTabs from "../../components/New/PromotionTabs";
import PromotionCard from "../../components/New/PromotionCard";
import { Tag, Flame, Zap, ArrowUp, Wallet, Star, Gift } from "lucide-react";

const tabs = [
  { label: "Tất cả", icon: <Tag size={18} className="text-blue-500" /> },
  { label: "Sale lớn", icon: <Flame size={18} className="text-red-500" /> },
  { label: "Flash Sale", icon: <Zap size={18} className="text-yellow-500" /> },
  { label: "Freeship", icon: <ArrowUp size={18} className="text-green-500" /> },
  { label: "Hoàn tiền", icon: <Wallet size={18} className="text-purple-500" /> },
  { label: "Đặc biệt", icon: <Star size={18} className="text-pink-500" /> },
  { label: "Tân thủ", icon: <Gift size={18} className="text-orange-500" /> },
];

const promotions = [
  {
    title: "Siêu Sale 10/10 - Giảm đến 50%",
    description:
      "Săn sale cực sốc với hàng ngàn sản phẩm giảm giá đến 50%. Voucher giảm thêm 100K cho đơn từ 500K. Áp dụng cho tất cả danh mục sản phẩm. Không giới hạn số lần mua.",
    tags: ["Mới", "Hot"],
    category: "Sale lớn",
    date: "10/10/2025 - 12/10/2025",
    views: 12340,
    imageUrl: "https://tse1.mm.bing.net/th/id/OIP.iLvL83MDE4RsE82KuqRLbQHaFa?pid=Api&P=0&h=220",
  },
  {
    title: "Mega Sale Cuối Tháng 10",
    description:
      "Lễ hội mua sắm cuối tháng với voucher giảm đến 500K. Áp dụng cho đơn hàng từ 2 triệu. Miễn phí vận chuyển toàn quốc.",
    tags: ["Mới", "Mega Sale"],
    category: "Flash Sale",
    date: "28/10/2025 - 31/10/2025",
    views: 9876,
    imageUrl: "https://tse2.mm.bing.net/th/id/OIP.4uT6zmebRNLRikXuAuDfRQHaE8?pid=Api&P=0&h=220",
  },
  {
    title: "Black Friday - Giảm giá khủng",
    description:
      "Sự kiện Black Friday lớn nhất năm. Giảm giá đến 70% cho hàng nghìn sản phẩm. Voucher thêm 1 triệu đồng cho đơn từ 5 triệu.",
    tags: ["Mới", "Black Friday"],
    category: "Freeship",
    date: "24/11/2025 - 26/11/2025",
    views: 34560,
    imageUrl: "https://tse2.mm.bing.net/th/id/OIP.u8Mfw_vWmd2OE4iGDxQ3uwHaD2?pid=Api&P=0&h=220",
  },
];

const PromotionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Tất cả");

  // Lọc promotions theo tab
  const filteredPromotions =
    activeTab === "Tất cả"
      ? promotions
      : promotions.filter((p) => p.category === activeTab);

  return (
<div className="p-6 bg-white font-sans">
  <h1 className="text-xl font-bold mb-4 text-gray-800">
    Tin tức & Chương trình khuyến mãi
  </h1>

  <PromotionTabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

  {/* Grid 3 cột */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
    {filteredPromotions.map((promo, index) => (
      <PromotionCard
        key={index}
        title={promo.title}
        description={promo.description}
        tags={promo.tags}
        date={promo.date}
        views={promo.views}
        imageUrl={promo.imageUrl}
      />
    ))}
  </div>
</div>

  );
};

export default PromotionPage;
