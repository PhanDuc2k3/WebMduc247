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
      <div className="bg-white rounded-xl shadow p-8">
        <div className="text-center py-16">
          <Clock size={48} className="mx-auto mb-4 animate-pulse text-gray-400" />
          <p className="text-gray-500 font-medium">Đang tải yêu thích...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("products")}
          className={`pb-3 px-4 font-bold transition-all duration-300 relative flex items-center gap-2 ${
            activeTab === "products"
              ? "text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ShoppingBag size={18} />
          Sản phẩm ({products.length})
          {activeTab === "products" && (
            <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("stores")}
          className={`pb-3 px-4 font-bold transition-all duration-300 relative flex items-center gap-2 ${
            activeTab === "stores"
              ? "text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Store size={18} />
          Cửa hàng ({stores.length})
          {activeTab === "stores" && (
            <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></span>
          )}
        </button>
      </div>

      {/* Products Tab */}
      {activeTab === "products" && (
        <div>
          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product._id}
                  className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-lg transition-all duration-300 group relative"
                >
                  <Link to={`/products/${product._id}`} className="block">
                    <img
                      src={getImageUrl(product.images?.[0])}
                      alt={product.name}
                      className="w-full h-40 object-cover rounded-lg mb-3 group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                    <span>⭐ {product.rating || 0}</span>
                    <span>•</span>
                    <span>Đã bán {product.soldCount || 0}</span>
                  </div>
                  <div className="text-xl font-bold text-red-600 mb-3">
                    {product.salePrice ? (
                      <>
                        <span className="text-red-600">
                          {product.salePrice.toLocaleString("vi-VN")}₫
                        </span>
                        <span className="text-gray-400 line-through text-sm ml-2">
                          {product.price.toLocaleString("vi-VN")}₫
                        </span>
                      </>
                    ) : (
                      <span>{product.price.toLocaleString("vi-VN")}₫</span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3">
                    <FavoriteButton
                      productId={product._id}
                      iconSize={20}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Heart size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg font-medium mb-2">
                Chưa có sản phẩm yêu thích nào
              </p>
              <p className="text-gray-400 text-sm">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store) => (
                <div
                  key={store._id}
                  className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-lg transition-all duration-300 group relative"
                >
                  <Link to={`/store/${store._id}`} className="block">
                    {store.bannerUrl && (
                      <img
                        src={store.bannerUrl}
                        alt={store.name}
                        className="w-full h-32 object-cover rounded-lg mb-3 group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      {store.logoUrl && (
                        <img
                          src={store.logoUrl}
                          alt={store.name}
                          className="w-12 h-12 rounded-full border-2 border-gray-200"
                        />
                      )}
                      <div className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {store.name}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {store.description}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Star size={14} className="text-yellow-500 fill-yellow-500" />
                      <span>{store.rating || 0}</span>
                    </div>
                  </Link>
                  <div className="absolute top-3 right-3">
                    <FavoriteButton
                      storeId={store._id}
                      iconSize={20}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Store size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg font-medium mb-2">
                Chưa có cửa hàng yêu thích nào
              </p>
              <p className="text-gray-400 text-sm">
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
