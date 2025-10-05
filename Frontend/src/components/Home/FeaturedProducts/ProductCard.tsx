import React from "react";
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

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    // 👉 Thêm class `group`
    <div className="group bg-white rounded-lg shadow-md p-3 relative transition-all duration-300 hover:shadow-lg">
      {/* Ảnh sản phẩm */}
      <div className="relative overflow-hidden rounded-md">
        <img
          src={`http://localhost:5000${product.images?.[0] || "/no-image.png"}`}
          alt={product.name}
          className="w-full h-[180px] object-cover rounded-md transition-transform duration-300 group-hover:scale-105"
        />

        {/* Giảm giá & HOT */}
        {product.salePrice && (
          <>
            <span className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
              -{Math.round((1 - product.salePrice / product.price) * 100)}%
            </span>
            <span className="absolute top-10 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded font-semibold">
              HOT
            </span>
          </>
        )}

        {/* Nút yêu thích */}
        <button className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow hover:bg-gray-100 transition">
          <Heart size={18} className="text-red-500" />
        </button>

        {/* Nút xem chi tiết → Hiện khi hover */}
        <Link
          to={`/products/${product._id}`}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 
                     bg-orange-500 text-white text-sm px-4 py-1.5 rounded-full 
                     opacity-0 transition duration-300 
                     group-hover:opacity-100 hover:bg-orange-600"
        >
          Xem chi tiết
        </Link>
      </div>

      {/* Tên sản phẩm */}
      <div className="mt-3 text-sm font-semibold text-gray-800 line-clamp-2">
        {product.name}
      </div>

      {/* Giá */}
      <div className="mt-1 text-red-600 font-bold">
        {(product.salePrice || product.price).toLocaleString("vi-VN")}₫
        {product.salePrice && (
          <span className="ml-2 text-gray-400 line-through text-sm">
            {product.price.toLocaleString("vi-VN")}₫
          </span>
        )}
      </div>

      {/* Đánh giá & đã bán */}
      <div className="flex justify-between mt-2 text-gray-600 text-sm">
        <div className="flex gap-1">
          ⭐ {product.rating || 0} <span>({product.reviewsCount || 0})</span>
        </div>
        <div>Đã bán {product.soldCount || 0}</div>
      </div>

      {/* Cửa hàng & địa điểm */}
      <div className="flex justify-between mt-2 text-gray-500 text-sm">
        <div>
          {typeof product.store === "string"
            ? product.store
            : product.store?.name}
        </div>
        <div>{product.location || "VN"}</div>
      </div>
    </div>
  );
};

export default ProductCard;
