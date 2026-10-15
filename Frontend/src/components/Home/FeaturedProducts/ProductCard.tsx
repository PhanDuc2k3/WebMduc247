import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FavoriteButton from "../../Favorite/FavoriteButton";
import { Flame, Star, Store as StoreIcon, MapPin } from "lucide-react";

interface Product {
  _id: string;
  name: string;
  price: number;
  salePrice?: number;
  images?: string[];
  rating?: number;
  reviewsCount?: number;
  soldCount?: number;
  location?: string;
  store?: string | { name: string };
}

interface ProductCardProps {
  product: Product;
}

// Helper hiển thị URL ảnh
const getImageUrl = (img?: string) => {
  if (!img) return "/no-image.png";
  return img.startsWith("http") ? img : `${import.meta.env.VITE_API_URL}${img}`;
};

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();

  useEffect(() => {
  }, [product.images]);

  // Handle click on card - navigate to product detail (mobile only)
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-favorite-button]')) {
      return;
    }
    if (target.closest('a[href*="/products/"]')) {
      return;
    }
    const isMobile = window.innerWidth < 640 || 'ontouchstart' in window;
    if (isMobile) {
      navigate(`/products/${product._id}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group bg-white border border-gray-200 rounded-lg shadow-sm w-full flex flex-col cursor-pointer active:scale-[0.98] touch-manipulation hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <div className="relative overflow-hidden rounded-t-lg">
        <img
          src={getImageUrl(product.images?.[0])}
          alt={product.name}
          className="w-full h-28 sm:h-32 md:h-40 lg:h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {product.salePrice && (
          <div className="absolute top-1 left-1 flex flex-col gap-0.5">
            <span className="bg-red-600 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              -{Math.round((1 - product.salePrice / product.price) * 100)}%
            </span>
            <span className="bg-orange-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Flame className="w-2.5 h-2.5" />
              HOT
            </span>
          </div>
        )}

        <div
          className="absolute top-1 right-1 z-20"
          onClick={(e) => e.stopPropagation()}
          data-favorite-button
        >
          <FavoriteButton productId={product._id} />
        </div>

        {/* View button - desktop only */}
        <a
          href={`/products/${product._id}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate(`/products/${product._id}`);
          }}
          className="absolute bottom-1 sm:bottom-1.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full opacity-0 transform translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 hover:from-orange-600 hover:to-orange-700 shadow-xl z-20 hidden sm:block"
        >
          Xem
        </a>
      </div>

      {/* Content */}
      <div className="p-1.5 sm:p-2 flex flex-col flex-1 gap-0.5 sm:gap-1">
        <div className="text-[11px] sm:text-xs font-semibold text-gray-800 line-clamp-2 leading-tight">
          {product.name}
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-[11px] sm:text-sm text-red-600 font-bold">
            {(product.salePrice || product.price).toLocaleString("vi-VN")}₫
          </span>
          {product.salePrice && (
            <span className="text-[10px] sm:text-xs text-gray-400 line-through">
              {product.price.toLocaleString("vi-VN")}₫
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-600">
          <div className="flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
            <span className="font-semibold">{product.rating?.toFixed(1) || "0"}</span>
            <span className="text-gray-500">({product.reviewsCount ?? 0})</span>
          </div>
          <span className="text-gray-500">Đã bán {product.soldCount || 0}</span>
        </div>

        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-500 mt-auto">
          <StoreIcon className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">
            {typeof product.store === "string" ? product.store : product.store?.name || "N/A"}
          </span>
          <span className="hidden sm:flex items-center gap-0.5 ml-auto flex-shrink-0">
            <MapPin className="w-2.5 h-2.5" />
            {product.location || "VN"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
