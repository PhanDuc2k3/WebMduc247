import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import favoriteApi from "../../api/favoriteApi";
import type { ProductType } from "../../types/product";
import type { StoreType } from "../../types/store";
import FavoriteButton from "../../components/Favorite/FavoriteButton";

const Whitelist: React.FC = () => {
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
    } catch (error: any) {
      console.error("Error fetching favorites:", error);
      if (error.response?.status === 401) {
        // Not logged in - could redirect or show message
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = () => {
    // Refetch after removing
    fetchFavorites();
  };

  const getImageUrl = (img?: string) => {
    if (!img) return "/no-image.png";
    return img.startsWith("http") ? img : `${import.meta.env.VITE_API_URL}${img}`;
  };

  if (loading) {
    return (
      <div className="w-full py-8 md:py-12">
        <div className="mb-8 animate-fade-in-down">
          <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900 gradient-text flex items-center gap-3">
            <span>❤️</span> Danh sách yêu thích
          </h1>
          <p className="text-gray-600 text-lg">
            Những sản phẩm và cửa hàng bạn đã yêu thích
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center py-16">
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <p className="text-gray-500 font-medium">Đang tải yêu thích...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-8 md:py-12">
      <div className="mb-8 animate-fade-in-down">
        <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900 gradient-text flex items-center gap-3">
          <span>❤️</span> Danh sách yêu thích
        </h1>
        <p className="text-gray-600 text-lg">
          Những sản phẩm và cửa hàng bạn đã yêu thích
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("products")}
            className={`pb-3 px-4 font-bold transition-all duration-300 relative ${
              activeTab === "products"
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="flex items-center gap-2">
              <span>🛍️</span> Sản phẩm
              <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                {products.length}
              </span>
            </span>
            {activeTab === "products" && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("stores")}
            className={`pb-3 px-4 font-bold transition-all duration-300 relative ${
              activeTab === "stores"
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="flex items-center gap-2">
              <span>🏪</span> Cửa hàng
              <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                {stores.length}
              </span>
            </span>
            {activeTab === "stores" && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="animate-fade-in-up">
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product, index) => (
                <div
                  key={product._id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-lg transition-all duration-300 group relative animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <Link to={`/products/${product._id}`} className="block">
                    <div className="relative overflow-hidden rounded-lg mb-3">
                      <img
                        src={getImageUrl(product.images?.[0])}
                        alt={product.name}
                        className="w-full h-[200px] object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute top-3 right-3 z-20">
                        <FavoriteButton productId={product._id} iconSize={20} />
                      </div>
                    </div>
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
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-16 text-center animate-fade-in">
              <div className="text-6xl mb-4">❤️</div>
              <p className="text-gray-500 text-lg font-medium mb-2">
                Chưa có sản phẩm yêu thích nào
              </p>
              <p className="text-gray-400 text-sm mb-6">
                Khám phá và thêm sản phẩm yêu thích của bạn
              </p>
              <Link
                to="/products"
                className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                🛍️ Xem sản phẩm
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Stores Tab */}
      {activeTab === "stores" && (
        <div className="animate-fade-in-up">
          {stores.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store, index) => (
                <div
                  key={store._id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-lg transition-all duration-300 group relative animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <Link to={`/store/${store._id}`} className="block">
                    <div className="relative overflow-hidden rounded-lg mb-3">
                      {store.bannerUrl && (
                        <img
                          src={store.bannerUrl}
                          alt={store.name}
                          className="w-full h-[150px] object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      )}
                      {!store.bannerUrl && (
                        <div className="w-full h-[150px] bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                          <span className="text-6xl">🏪</span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3 z-20">
                        <FavoriteButton storeId={store._id} iconSize={20} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      {store.logoUrl && (
                        <img
                          src={store.logoUrl}
                          alt={store.name}
                          className="w-14 h-14 rounded-full border-2 border-gray-200"
                        />
                      )}
                      <div className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {store.name}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {store.description}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>⭐ {store.rating || 0}</span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-16 text-center animate-fade-in">
              <div className="text-6xl mb-4">🏪</div>
              <p className="text-gray-500 text-lg font-medium mb-2">
                Chưa có cửa hàng yêu thích nào
              </p>
              <p className="text-gray-400 text-sm mb-6">
                Khám phá và theo dõi các cửa hàng bạn yêu thích
              </p>
              <Link
                to="/store"
                className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                🏪 Xem cửa hàng
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Whitelist;

