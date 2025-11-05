import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Eye } from "lucide-react";

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
    if (!url) return "/no-image.png";
    return url.startsWith("http") ? url : `${import.meta.env.VITE_API_URL}${url}`;
  };

  return (
    <Link
      to={_id ? `/promotion/${_id}` : "#"}
      className="block bg-white rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group animate-fade-in-up"
    >
      {/* Hình ảnh */}
      <div className="relative overflow-hidden">
        <img 
          src={getImageUrl(imageUrl)} 
          alt={title} 
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
                className="text-xs font-black px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg animate-pulse"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Tiêu đề */}
        <h2 className="text-xl font-black text-gray-900 mb-3 leading-tight">{title}</h2>

        {/* Mô tả */}
        <p className="text-sm text-gray-700 mb-4 leading-relaxed font-medium line-clamp-3">{description}</p>

        {/* Thời gian & lượt xem */}
        <div className="flex items-center justify-between text-sm mb-4 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
          <div className="flex items-center gap-2 text-gray-700 font-bold">
            <CalendarDays size={18} className="text-blue-600" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700 font-bold">
            <Eye size={18} className="text-purple-600" />
            <span>{views.toLocaleString()} lượt xem</span>
          </div>
        </div>

        {/* Nút xem chi tiết */}
        <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-black shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 group-hover:from-blue-700 group-hover:to-purple-700">
          Xem chi tiết →
        </button>
      </div>
    </Link>
  );
};

export default PromotionCard;
