import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, ShoppingBag, Store, Heart, Star } from "lucide-react";
import favoriteApi from "../../../api/favoriteApi";
import type { ProductType } from "../../../types/product";
import type { StoreType } from "../../../types/store";
import FavoriteButton from "../../Favorite/FavoriteButton";

const ProfileFavorites: React.FC = () => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"products" | "stores">("products");

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const res = await favoriteApi.getMyFavorites();
      setProducts(res.data.products || []);
      setStores(res.data.stores || []);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async () => {
    // Refetch after removing
    await fetchFavorites();
  };

  const getImageUrl = (img?: string) => {
    if (!img) return "/no-image.png";
    return img.startsWith("http") ? img : `${import.meta.env.VITE_API_URL}${img}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl md:rounded-2xl shadow p-4 md:p-6 lg:p-8">
        <div className="text-center py-8 md:py-12 lg:py-16">
          <Clock size={40} className="mx-auto mb-3 md:mb-4 animate-pulse text-gray-400" />
          <p className="text-gray-500 text-sm md:text-base font-medium">Đang tải yêu thích...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 lg:p-8">
      {/* Tabs */}
      <div className="flex gap-2 md:gap-4 mb-4 md:mb-6 border-b border-gray-200 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab("products")}
          className={`pb-2 md:pb-3 px-3 md:px-4 font-bold transition-all duration-300 relative flex items-center gap-1.5 md:gap-2 whitespace-nowrap flex-shrink-0 text-xs sm:text-sm md:text-base ${
            activeTab === "products"
              ? "text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ShoppingBag size={16} className="md:w-[18px] md:h-[18px]" />
          Sản phẩm ({products.length})
          {activeTab === "products" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 md:h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("stores")}
          className={`pb-2 md:pb-3 px-3 md:px-4 font-bold transition-all duration-300 relative flex items-center gap-1.5 md:gap-2 whitespace-nowrap flex-shrink-0 text-xs sm:text-sm md:text-base ${
            activeTab === "stores"
              ? "text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Store size={16} className="md:w-[18px] md:h-[18px]" />
          Cửa hàng ({stores.length})
          {activeTab === "stores" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 md:h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></span>
          )}
        </button>
      </div>

      {/* Products Tab */}
      {activeTab === "products" && (
        <div>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
              {products.map((product) => (
                <div
                  key={product._id}
                  className="border-2 border-gray-200 rounded-lg md:rounded-xl p-2 md:p-4 hover:border-blue-400 hover:shadow-lg transition-all duration-300 group relative"
                >
                  <Link to={`/products/${product._id}`} className="block">
                    <img
                      src={getImageUrl(product.images?.[0])}
                      alt={product.name}
                      className="w-full h-28 sm:h-32 md:h-40 object-cover rounded-lg mb-2 md:mb-3 group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-900 mb-1 md:mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2 text-[10px] sm:text-xs md:text-sm text-gray-500">
                    <span>⭐ {product.rating || 0}</span>
                    <span>•</span>
                    <span>Đã bán {product.soldCount || 0}</span>
                  </div>
                  <div className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-red-600 mb-2 md:mb-3">
                    {product.salePrice ? (
                      <>
                        <span className="text-red-600">
                          {product.salePrice.toLocaleString("vi-VN")}₫
                        </span>
                        <span className="text-gray-400 line-through text-[10px] sm:text-xs md:text-sm ml-1 md:ml-2">
                          {product.price.toLocaleString("vi-VN")}₫
                        </span>
                      </>
                    ) : (
                      <span>{product.price.toLocaleString("vi-VN")}₫</span>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 md:top-3 md:right-3">
                    <FavoriteButton
                      productId={product._id}
                      iconSize={16}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 md:py-12 lg:py-16">
              <Heart size={48} className="mx-auto mb-3 md:mb-4 text-gray-300" />
              <p className="text-gray-500 text-sm sm:text-base md:text-lg font-medium mb-2">
                Chưa có sản phẩm yêu thích nào
              </p>
              <p className="text-gray-400 text-xs md:text-sm">
                Khám phá và thêm sản phẩm yêu thích của bạn
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stores Tab */}
      {activeTab === "stores" && (
        <div>
          {stores.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
              {stores.map((store) => (
                <div
                  key={store._id}
                  className="border-2 border-gray-200 rounded-lg md:rounded-xl p-2 md:p-4 hover:border-blue-400 hover:shadow-lg transition-all duration-300 group relative"
                >
                  <Link to={`/store/${store._id}`} className="block">
                    {store.bannerUrl && (
                      <img
                        src={store.bannerUrl}
                        alt={store.name}
                        className="w-full h-24 sm:h-28 md:h-32 object-cover rounded-lg mb-2 md:mb-3 group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <div className="flex items-center gap-2 md:gap-3 mb-1.5 md:mb-2">
                      {store.logoUrl && (
                        <img
                          src={store.logoUrl}
                          alt={store.name}
                          className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-gray-200 flex-shrink-0"
                        />
                      )}
                      <div className="text-sm sm:text-base md:text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate flex-1 min-w-0">
                        {store.name}
                      </div>
                    </div>
                    <div className="text-xs md:text-sm text-gray-600 line-clamp-2 mb-1.5 md:mb-2">
                      {store.description}
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-500">
                      <Star size={12} className="md:w-3.5 md:h-3.5 text-yellow-500 fill-yellow-500" />
                      <span>{store.rating || 0}</span>
                    </div>
                  </Link>
                  <div className="absolute top-2 right-2 md:top-3 md:right-3">
                    <FavoriteButton
                      storeId={store._id}
                      iconSize={16}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 md:py-12 lg:py-16">
              <Store size={48} className="mx-auto mb-3 md:mb-4 text-gray-300" />
              <p className="text-gray-500 text-sm sm:text-base md:text-lg font-medium mb-2">
                Chưa có cửa hàng yêu thích nào
              </p>
              <p className="text-gray-400 text-xs md:text-sm">
                Khám phá và theo dõi các cửa hàng bạn yêu thích
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileFavorites;
