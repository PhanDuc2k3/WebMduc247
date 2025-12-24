import React, { useEffect, useState } from "react";
import { Clock, ShoppingBag, Store, Heart } from "lucide-react";
import favoriteApi from "../../../api/favoriteApi";
import type { ProductType } from "../../../types/product";
import type { StoreType } from "../../../types/store";
import ProductCard from "../../Home/FeaturedProducts/ProductCard";
import StoreCard from "../../Home/FeaturedStores/StoreCard";

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

  if (loading) {
    return (
      <div className="bg-white rounded-xl md:rounded-2xl shadow p-4 md:p-6 lg:p-8">
        <div className="text-center py-8 md:py-12 lg:py-16">
          <Clock size={40} className="mx-auto mb-3 md:mb-4 animate-pulse text-[#2F5FEB]" />
          <p className="text-gray-500 text-sm md:text-base font-medium">Đang tải yêu thích...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 lg:p-8">
      {/* Tabs */}
      <div className="flex gap-2 md:gap-4 mb-4 md:mb-6 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("products")}
          className={`pb-2 md:pb-3 px-3 md:px-4 font-bold transition-all duration-300 relative flex items-center gap-1.5 md:gap-2 text-xs sm:text-sm md:text-base ${
            activeTab === "products"
              ? "text-[#2F5FEB]"
              : "text-gray-500 hover:text-[#2F5FEB]"
          }`}
        >
          <ShoppingBag size={16} className="md:w-[18px] md:h-[18px] text-[#2F5FEB]" />
          Sản phẩm ({products.length})
          {activeTab === "products" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 md:h-1 bg-[#2F5FEB] rounded-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("stores")}
          className={`pb-2 md:pb-3 px-3 md:px-4 font-bold transition-all duration-300 relative flex items-center gap-1.5 md:gap-2 text-xs sm:text-sm md:text-base ${
            activeTab === "stores"
              ? "text-[#2F5FEB]"
              : "text-gray-500 hover:text-[#2F5FEB]"
          }`}
        >
          <Store size={16} className="md:w-[18px] md:h-[18px] text-[#2F5FEB]" />
          Cửa hàng ({stores.length})
          {activeTab === "stores" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 md:h-1 bg-[#2F5FEB] rounded-full"></span>
          )}
        </button>
      </div>

      {/* Products Tab */}
      {activeTab === "products" && (
        <div>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
              {products.map((product) => {
                // Convert ProductType to ProductCard format
                const productForCard = {
                  _id: product._id,
                  name: product.name,
                  price: product.price,
                  salePrice: product.salePrice,
                  images: product.images,
                  rating: product.rating,
                  reviewsCount: product.reviewsCount,
                  soldCount: product.soldCount,
                  location: product.location,
                  store: typeof product.store === 'string' 
                    ? product.store 
                    : (product.store && typeof product.store === 'object' && 'name' in product.store)
                    ? { name: product.store.name || 'Unknown Store' }
                    : 'Unknown Store'
                };
                return (
                  <ProductCard key={product._id} product={productForCard} />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 md:py-12 lg:py-16">
              <Heart size={48} className="mx-auto mb-3 md:mb-4 text-[#2F5FEB]" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
              {stores.map((store) => {
                const ownerId = typeof store.owner === "string" 
                  ? store.owner 
                  : (store.owner && typeof store.owner === 'object' && '_id' in store.owner)
                  ? store.owner._id
                  : undefined;
                
                // Đảm bảo createdAt được truyền đúng - xử lý nhiều format
                const createdAtValue = store.createdAt || store.joinDate;
                
                return (
                  <StoreCard
                    key={store._id}
                    storeId={store._id}
                    ownerId={ownerId}
                    name={store.name}
                    description={store.description}
                    logoUrl={store.logoUrl}
                    bannerUrl={store.bannerUrl}
                    createdAt={createdAtValue}
                    isActive={store.isActive}
                    customCategory={store.customCategory}
                    isOnline={false}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 md:py-12 lg:py-16">
              <Store size={48} className="mx-auto mb-3 md:mb-4 text-[#2F5FEB]" />
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
