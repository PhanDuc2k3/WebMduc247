import React, { useEffect } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

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
  useEffect(() => {
  }, [product.images]);

  return (
    <div className="group bg-white border-2 border-gray-200 rounded-xl shadow-md p-4 relative transition-all duration-500 hover:shadow-2xl hover:border-blue-400 w-full max-w-xs min-h-[320px] flex flex-col transform hover:-translate-y-2 animate-scale-in">
      <div className="relative overflow-hidden rounded-lg mb-3">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
        <img
          src={getImageUrl(product.images?.[0])}
          alt={product.name}
          className="w-full h-[180px] object-cover rounded-lg transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        {product.salePrice && (
          <>
            <span className="absolute top-3 left-3 bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg transform group-hover:scale-110 transition-transform duration-300 z-20">
              -{Math.round((1 - product.salePrice / product.price) * 100)}%
            </span>
            <span className="absolute top-14 left-3 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse z-20">
              🔥 HOT
            </span>
          </>
        )}

        <button className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-red-50 transition-all duration-300 group-hover:scale-110 z-20">
          <Heart size={18} className="text-red-500 group-hover:fill-red-500 transition-all duration-300" />
        </button>

        <Link
          to={`/products/${product._id}`}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold px-6 py-2 rounded-full opacity-0 transform translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 hover:from-orange-600 hover:to-orange-700 shadow-xl z-20"
        >
          Xem chi tiết →
        </Link>
      </div>

      <div className="mt-2 text-sm font-bold text-gray-800 overflow-hidden text-ellipsis whitespace-nowrap flex-1 group-hover:text-blue-600 transition-colors duration-300">
        {product.name}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="text-lg text-red-600 font-bold">
          {(product.salePrice || product.price).toLocaleString("vi-VN")}₫
        </span>
        {product.salePrice && (
          <span className="text-gray-400 line-through text-sm font-medium">
            {product.price.toLocaleString("vi-VN")}₫
          </span>
        )}
      </div>

      <div className="flex justify-between items-center mt-3 text-gray-600 text-xs bg-gray-50 rounded-lg px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="text-yellow-500">⭐</span>
          <span className="font-semibold">{product.rating || 0}</span>
          <span className="text-gray-500">({product.reviewsCount || 0})</span>
        </div>
        <div className="text-gray-700 font-medium">Đã bán {product.soldCount || 0}</div>
      </div>

      <div className="flex justify-between items-center mt-2 text-gray-500 text-xs border-t pt-2">
        <div className="truncate flex-1 font-medium">
          🏪 {typeof product.store === "string" ? product.store : product.store?.name}
        </div>
        <div className="ml-2">📍 {product.location || "VN"}</div>
      </div>
    </div>
  );
};

export default ProductCard;
