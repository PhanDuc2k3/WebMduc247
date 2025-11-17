import React, { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { CalendarDays, Eye, ArrowLeft, Tag } from "lucide-react";
import promotionApi from "../../api/promotionApi";
import type { PromotionType } from "../../api/promotionApi";
import { toast } from "react-toastify";

const PromotionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [promotion, setPromotion] = useState<PromotionType | null>(null);
  const [loading, setLoading] = useState(true);
  const hasIncreasedViewRef = useRef(false);

  useEffect(() => {
    const fetchPromotion = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await promotionApi.getPromotionById(id);
        setPromotion(res.data);
        
        // Chỉ tăng view một lần khi fetch thành công
        if (!hasIncreasedViewRef.current && res.data?._id) {
          hasIncreasedViewRef.current = true;
          try {
            await promotionApi.increaseViews(id);
            // Cập nhật lại views sau khi tăng
            setPromotion(prev => prev ? { ...prev, views: (prev.views || 0) + 1 } : null);
          } catch (viewError) {
            console.error("Error increasing views:", viewError);
            // Không hiển thị lỗi cho user, chỉ log
          }
        }
      } catch (error) {
        console.error("Error fetching promotion:", error);
        toast.error("Không tìm thấy tin tức khuyến mãi");
        navigate("/new");
      } finally {
        setLoading(false);
      }
    };

    fetchPromotion();
    
    // Reset flag khi id thay đổi
    return () => {
      hasIncreasedViewRef.current = false;
    };
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="w-full py-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!promotion) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getImageUrl = (url?: string) => {
    if (!url) return "/no-image.png";
    return url.startsWith("http") ? url : `${import.meta.env.VITE_API_URL}${url}`;
  };

  return (
    <div className="w-full py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Link
          to="/new"
          className="inline-flex items-center gap-2 text-gray-700 hover:text-purple-600 mb-6 transition-colors duration-300 font-bold"
        >
          <ArrowLeft size={20} />
          <span>Quay lại danh sách</span>
        </Link>

        {/* Image */}
        {promotion.imageUrl && (
          <div className="mb-8 rounded-2xl overflow-hidden shadow-2xl">
            <img
              src={getImageUrl(promotion.imageUrl)}
              alt={promotion.title}
              className="w-full h-96 object-cover"
            />
          </div>
        )}

        {/* Content */}
        <article className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 p-6 lg:p-8">
          {/* Tags */}
          {promotion.tags && promotion.tags.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {promotion.tags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg"
                >
                  <Tag size={12} />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Category */}
          <div className="mb-4">
            <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm font-bold">
              {promotion.category}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl lg:text-4xl font-black text-gray-900 mb-6 gradient-text">
            {promotion.title}
          </h1>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
            <div className="flex items-center gap-2 text-gray-700 font-bold">
              <CalendarDays size={18} className="text-blue-600" />
              <span>
                {formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 font-bold">
              <Eye size={18} className="text-purple-600" />
              <span>{promotion.views?.toLocaleString() || 0} lượt xem</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-lg text-gray-700 leading-relaxed font-medium">
              {promotion.description}
            </p>
          </div>

          {/* Content */}
          {promotion.content && (
            <div className="prose max-w-none">
              <div
                className="text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: promotion.content.replace(/\n/g, "<br />") }}
              />
            </div>
          )}
        </article>
      </div>
    </div>
  );
};

export default PromotionDetail;
