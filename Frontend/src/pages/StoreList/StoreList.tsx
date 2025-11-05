import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import StoreFilters from "../../components/StoreList/StoreFilters";
import StoreGrid from "../../components/StoreList/StoreGrid";
import StoreLoading from "../../components/StoreList/StoreLoading";
import type { StoreType } from "../../types/store";
import storeApi from "../../api/storeApi"; // dùng API đã tách
import { useChat } from "../../context/chatContext";

const StoreList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { onlineStores } = useChat();

  // Đọc search term từ URL query
  useEffect(() => {
    const search = searchParams.get("search");
    if (search) {
      setSearchTerm(search);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await storeApi.getAllActiveStores();
        const data = res.data; // axios trả về data trong res.data

        // Debug: Log raw data từ API
        console.log("[StoreList] Raw API stores:", data.stores);
        if (data.stores && data.stores.length > 0) {
          console.log("[StoreList] First store from API:", data.stores[0]);
          console.log("[StoreList] First store createdAt:", data.stores[0].createdAt);
        }
        
        // Giống hệt FeaturedStores để đảm bảo consistency
        const mappedStores: StoreType[] = data.stores.map((s: any) => {
          // Đảm bảo createdAt được truyền đúng format - giống FeaturedStores
          const createdAtValue = s.createdAt || s.created_at || s.created;
          
          return {
            ...s, // ✅ Spread tất cả properties từ API response (giống FeaturedStores)
            rating: s.rating ?? 0,
            products: s.products ?? 0,
            followers: s.followers ?? 0,
            responseRate: s.responseRate ?? 0,
            responseTime: s.responseTime ?? "—",
            joinDate: createdAtValue ? new Date(createdAtValue).toLocaleDateString() : "—",
            createdAt: createdAtValue, // ✅ Đảm bảo createdAt được truyền vào (giống FeaturedStores)
            isActive: s.isActive ?? true,
            customCategory: s.category || s.customCategory,
            // Giữ lại các field khác từ API response
            _id: s._id,
            owner: typeof s.owner === 'object' ? s.owner : { _id: s.owner || "" },
            name: s.name,
            description: s.description,
            logoUrl: s.logoUrl,
            bannerUrl: s.bannerUrl,
          };
        });

        setStores(mappedStores);
      } catch (err) {
        console.error("Lỗi khi fetch stores:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  if (loading) return <StoreLoading />;

  const filteredStores = stores.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full py-8 md:py-12">
      <div className="mb-8 animate-fade-in-down">
        <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900 gradient-text">
          🏬 Danh sách cửa hàng
        </h1>
        <p className="text-gray-600 text-lg">
          Khám phá các cửa hàng uy tín trên nền tảng
        </p>
      </div>

      <div className="mb-6 animate-fade-in-up delay-200">
        <StoreFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      </div>

      {filteredStores.length > 0 && (
        <div className="mb-6 animate-fade-in-up delay-300">
          <p className="text-gray-600 font-medium">
            Tìm thấy <span className="text-blue-600 font-bold">{filteredStores.length}</span> cửa hàng
          </p>
        </div>
      )}

      <div className="animate-fade-in-up delay-300">
        {filteredStores.length > 0 ? (
          <StoreGrid stores={filteredStores} onlineStores={onlineStores} />
        ) : (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-6xl mb-4">🏪</div>
            <p className="text-gray-500 text-lg font-medium mb-2">
              Không tìm thấy cửa hàng nào
            </p>
            <p className="text-gray-400 text-sm">
              Hãy thử thay đổi từ khóa tìm kiếm
            </p>
          </div>
        )}
      </div>

      {filteredStores.length > 0 && (
        <div className="mt-8 text-center animate-fade-in-up delay-400">
          <button className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
            📥 Tải thêm cửa hàng
          </button>
        </div>
      )}
    </div>
  );
};

export default StoreList;
