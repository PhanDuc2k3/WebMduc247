import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingBag, Store, X, Clock } from "lucide-react";
import favoriteApi from "../../api/favoriteApi";
import type { ProductType } from "../../types/product";
import type { StoreType } from "../../types/store";
import ProductCard from "../Home/FeaturedProducts/ProductCard";
import StoreCard from "../Home/FeaturedStores/StoreCard";

interface FavoriteDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const FavoriteDropdown: React.FC<FavoriteDropdownProps> = ({ isOpen, onClose }) => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"products" | "stores">("products");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchFavorites();
      // Close dropdown when clicking outside
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          onClose();
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <div
        ref={dropdownRef}
        className="fixed md:absolute top-16 md:top-14 left-1/2 md:left-auto md:right-4 -translate-x-1/2 md:translate-x-0 w-[95vw] sm:w-[90vw] md:w-[600px] lg:w-[700px] xl:w-[800px] max-w-[95vw] max-h-[85vh] md:max-h-[600px] bg-white rounded-xl md:rounded-2xl shadow-2xl border-2 border-gray-200 z-50 flex flex-col overflow-hidden animate-fade-in-down"
      >
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b-2 border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          <Heart className="text-red-500 flex-shrink-0" size={18} />
          <h3 className="text-sm md:text-lg font-bold text-gray-900">Yêu thích</h3>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/Whitelist"
            onClick={onClose}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold hidden sm:inline-block"
          >
            Xem tất cả
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={16} className="md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 md:gap-4 px-3 md:px-4 pt-3 md:pt-4 border-b border-gray-200 bg-white flex-shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab("products")}
          className={`pb-2 px-2 sm:px-3 md:px-4 font-bold transition-all duration-300 relative flex items-center gap-1 md:gap-1.5 text-xs sm:text-sm md:text-base flex-shrink-0 whitespace-nowrap ${
            activeTab === "products"
              ? "text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ShoppingBag size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
          <span>Sản phẩm</span>
          <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ml-1">
            {products.length}
          </span>
          {activeTab === "products" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("stores")}
          className={`pb-2 px-2 sm:px-3 md:px-4 font-bold transition-all duration-300 relative flex items-center gap-1 md:gap-1.5 text-xs sm:text-sm md:text-base flex-shrink-0 whitespace-nowrap ${
            activeTab === "stores"
              ? "text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Store size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
          <span>Cửa hàng</span>
          <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ml-1">
            {stores.length}
          </span>
          {activeTab === "stores" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 min-h-0">
        {loading ? (
          <div className="text-center py-6 md:py-12">
            <Clock size={28} className="mx-auto mb-2 animate-pulse text-gray-400" />
            <p className="text-gray-500 text-xs sm:text-sm font-medium">Đang tải...</p>
          </div>
        ) : activeTab === "products" ? (
          products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-2 md:gap-3">
              {products.slice(0, 6).map((product) => {
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
                  <div key={product._id} className="w-full">
                    <ProductCard product={productForCard} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 md:py-12">
              <Heart size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500 text-xs sm:text-sm font-medium mb-1">
                Chưa có sản phẩm yêu thích
              </p>
              <Link
                to="/products"
                onClick={onClose}
                className="inline-block mt-2 text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-semibold"
              >
                Khám phá sản phẩm →
              </Link>
            </div>
          )
        ) : (
          stores.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
              {stores.slice(0, 4).map((store) => {
                const ownerId = typeof store.owner === "string" 
                  ? store.owner 
                  : (store.owner && typeof store.owner === 'object' && '_id' in store.owner)
                  ? store.owner._id
                  : undefined;
                
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
            <div className="text-center py-6 md:py-12">
              <Store size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500 text-xs sm:text-sm font-medium mb-1">
                Chưa có cửa hàng yêu thích
              </p>
              <Link
                to="/stores"
                onClick={onClose}
                className="inline-block mt-2 text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-semibold"
              >
                Khám phá cửa hàng →
              </Link>
            </div>
          )
        )}
      </div>

      {/* Footer */}
      {(products.length > 6 || stores.length > 4) && (
        <div className="p-2 sm:p-3 md:p-4 border-t border-gray-200 bg-gray-50 text-center flex-shrink-0">
          <Link
            to="/Whitelist"
            onClick={onClose}
            className="inline-block text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-semibold"
          >
            Xem tất cả yêu thích →
          </Link>
        </div>
      )}
    </div>
    </>
  );
};

export default FavoriteDropdown;

