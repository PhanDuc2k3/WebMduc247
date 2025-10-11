import React from "react";
import { CalendarDays, Eye } from "lucide-react";

interface PromotionCardProps {
  title: string;
  description: string;
  tags: string[];
  date: string;
  views: number;
  imageUrl: string;
}

const PromotionCard: React.FC<PromotionCardProps> = ({
  title,
  description,
  tags,
  date,
  views,
  imageUrl,
}) => {
  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden w-full max-w-2xl mx-auto">
      {/* Hình ảnh */}
      <img src={imageUrl} alt={title} className="w-full h-48 object-cover" />

      {/* Nội dung */}
      <div className="p-4">
        {/* Tags */}
        <div className="flex items-center gap-2 mb-2">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Tiêu đề */}
        <h2 className="text-lg font-semibold text-gray-800 mb-1">{title}</h2>

        {/* Mô tả */}
        <p className="text-sm text-gray-600 mb-3 leading-relaxed">{description}</p>

        {/* Thời gian & lượt xem */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <CalendarDays size={16} />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye size={16} />
            <span>{views.toLocaleString()} lượt xem</span>
          </div>
        </div>

        {/* Nút xem chi tiết */}
        <button className="text-blue-500 text-sm font-medium hover:underline">
          Xem chi tiết &gt;
        </button>
      </div>
    </div>
  );
};

export default PromotionCard;
