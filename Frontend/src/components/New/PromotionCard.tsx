import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Eye } from "lucide-react";
import { showImageFallback } from "../../utils/imageFallback";

interface PromotionCardProps {
  _id?: string;
  title: string;
  description: string;
  tags?: string[];
  date: string;
  views?: number;
  imageUrl?: string;
}

const PromotionCard: React.FC<PromotionCardProps> = ({
  _id,
  title,
  description,
  tags = [],
  date,
  views = 0,
  imageUrl,
}) => {
  const getImageUrl = (url?: string) => {
    if (!url) return "/visual-placeholder.svg";
    return url.startsWith("http") ? url : `${import.meta.env.VITE_API_URL}${url}`;
  };

  return (
    <Link
      to={_id ? `/promotion/${_id}` : "#"}
      className="canva-promotion-card block bg-white rounded-2xl border border-[#e8edf5] overflow-hidden transition-all duration-300 group animate-fade-in-up"
    >
      {/* Hình ảnh */}
      <div className="relative overflow-hidden">
        <img 
          src={getImageUrl(imageUrl)} 
          alt={title} 
          onError={showImageFallback}
          className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-110" 
        />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      {/* Nội dung */}
      <div className="p-6">
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#e9edff] text-[#476de4]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Tiêu đề */}
        <h2 className="text-xl font-black text-[#172b49] mb-3 leading-tight group-hover:text-[#476de4] transition-colors duration-300">{title}</h2>

        {/* Mô tả */}
        <p className="text-sm text-gray-700 mb-4 leading-relaxed font-medium line-clamp-3">{description}</p>

        {/* Thời gian & lượt xem */}
        <div className="flex items-center justify-between text-sm mb-4 p-3 bg-gradient-to-r from-gray-50 to-[#4B5563]/10 rounded-xl">
          <div className="flex items-center gap-2 text-gray-700 font-bold">
            <CalendarDays size={18} className="text-[#4B5563]" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700 font-bold">
            <Eye size={18} className="text-[#4B5563]" />
            <span>{views.toLocaleString()} lượt xem</span>
          </div>
        </div>

        {/* Nút xem chi tiết */}
        <button className="w-full bg-[#476de4] text-white py-3 rounded-xl font-bold hover:bg-[#375ac9] transition-all duration-200">
          Xem chi tiết →
        </button>
      </div>
    </Link>
  );
};

export default PromotionCard;
