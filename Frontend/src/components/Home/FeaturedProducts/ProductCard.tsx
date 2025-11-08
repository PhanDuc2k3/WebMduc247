import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FavoriteButton from "../../Favorite/FavoriteButton";

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
    // Check if click is on FavoriteButton or its children - don't navigate
    const target = e.target as HTMLElement;
    if (target.closest('[data-favorite-button]')) {
      return;
    }
    // Check if click is on the "Xem" button - it will handle navigation itself
    if (target.closest('a[href*="/products/"]')) {
      return;
    }
    // Only navigate on mobile devices (screen width < 640px or touch device)
    // On desktop, users should use the "Xem" button that appears on hover
    const isMobile = window.innerWidth < 640 || 'ontouchstart' in window;
    if (isMobile) {
      navigate(`/products/${product._id}`);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className="group bg-white border-2 border-gray-200 rounded-lg sm:rounded-xl shadow-md p-1.5 sm:p-2 relative transition-all duration-500 hover:shadow-2xl hover:border-blue-400 w-full flex flex-col animate-scale-in cursor-pointer sm:cursor-default active:scale-[0.98] sm:active:scale-100 touch-manipulation"
    >
      <div className="relative overflow-hidden rounded-md sm:rounded-lg pb-1 sm:pb-2">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
        <img
          src={getImageUrl(product.images?.[0])}
          alt={product.name}
          className="w-full h-28 sm:h-36 md:h-44 lg:h-52 object-cover rounded-md sm:rounded-lg transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        {product.salePrice && (
          <>
            <span className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 md:top-3 md:left-3 bg-gradient-to-r from-red-600 to-red-500 text-white text-[9px] sm:text-[10px] md:text-xs font-bold px-1 sm:px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-full shadow-lg transform group-hover:scale-110 transition-transform duration-300 z-20">
              -{Math.round((1 - product.salePrice / product.price) * 100)}%
            </span>
            <span className="absolute top-5 sm:top-6 left-1 sm:left-1.5 md:top-14 md:left-3 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-[7px] sm:text-[8px] md:text-xs font-bold px-1 sm:px-1.5 md:px-3 py-0.5 md:py-1 rounded-full shadow-lg animate-pulse z-20">
              🔥 HOT
            </span>
          </>
        )}

        <div 
          className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 md:top-3 md:right-3 z-30"
          onClick={(e) => e.stopPropagation()}
          data-favorite-button
        >
          <div className="scale-75 sm:scale-90 md:scale-100">
            <FavoriteButton productId={product._id} />
          </div>
        </div>

        <a
          href={`/products/${product._id}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate(`/products/${product._id}`);
          }}
          className="absolute bottom-1 sm:bottom-1.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[10px] sm:text-xs md:text-sm font-bold px-2 sm:px-3 md:px-6 py-0.5 sm:py-1 md:py-2 rounded-full opacity-0 transform translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 hover:from-orange-600 hover:to-orange-700 shadow-xl z-20 hidden sm:block"
        >
          Xem
        </a>
      </div>

      <div className="pt-0.5 sm:pt-1 text-[10px] sm:text-xs font-bold text-gray-800 overflow-hidden truncate group-hover:text-blue-600 transition-colors duration-300">
        {product.name}
      </div>

      <div className="pt-1 sm:pt-1.5 flex items-center gap-1 sm:gap-1.5 overflow-hidden">
        <span className="text-[10px] sm:text-xs text-red-600 font-bold whitespace-nowrap truncate">
          {(product.salePrice || product.price).toLocaleString("vi-VN")}₫
        </span>
        {product.salePrice && (
          <span className="text-gray-400 line-through text-[9px] sm:text-[10px] font-medium whitespace-nowrap">
            {product.price.toLocaleString("vi-VN")}₫
          </span>
        )}
      </div>

      <div className="flex justify-between items-center pt-1.5 sm:pt-2 text-gray-600 text-[9px] sm:text-[10px] bg-gray-50 rounded-md sm:rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1">
        <div className="flex items-center gap-0.5">
          <span className="text-yellow-500 text-[10px] sm:text-xs">⭐</span>
          <span className="font-semibold">{product.rating || 0}</span>
          <span className="text-gray-500 hidden sm:inline">({product.reviewsCount || 0})</span>
        </div>
        <div className="text-gray-700 font-medium text-[9px] sm:text-[10px]">Đã bán {product.soldCount || 0}</div>
      </div>

      <div className="flex justify-between items-center pt-1.5 sm:pt-2 text-gray-500 text-[9px] sm:text-[10px] border-t">
        <div className="truncate flex-1 font-medium">
          🏪 {typeof product.store === "string" ? product.store : product.store?.name || "N/A"}
        </div>
        <div className="ml-1 sm:ml-2 hidden md:block whitespace-nowrap">📍 {product.location || "VN"}</div>
      </div>
    </div>
  );
};

export default ProductCard;
