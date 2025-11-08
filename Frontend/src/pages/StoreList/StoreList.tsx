import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Store, AlertCircle, Download } from "lucide-react";
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
  const [filters, setFilters] = useState({
    rating: "Đánh giá cao nhất",
    region: "Tất cả khu vực",
    category: "Tất cả ngành hàng",
  });
  const { onlineStores } = useChat();

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

  // Filter stores dựa trên filters
  let filteredStores = stores.filter((s) => {
    // Filter theo region (khu vực) - hỗ trợ cả tiếng Việt và tiếng Anh
    const matchesRegion = filters.region === "Tất cả khu vực" || 
                         (s.storeAddress && (() => {
                           const address = s.storeAddress.toLowerCase();
                           
                           // Map các khu vực với các biến thể tên
                           const regionVariants: { [key: string]: string[] } = {
                             "hà nội": ["hà nội", "hanoi", "ha noi", "ha noi city"],
                             "tp. hồ chí minh": ["hồ chí minh", "ho chi minh", "hcm", "tp. hồ chí minh", "tp hcm", "sài gòn", "saigon"],
                             "đà nẵng": ["đà nẵng", "da nang", "danang"],
                             "cần thơ": ["cần thơ", "can tho", "cantho"],
                             "huế": ["huế", "hue"]
                           };
                           
                           const selectedRegion = filters.region.toLowerCase();
                           const variants = regionVariants[selectedRegion];
                           
                           if (variants) {
                             // Kiểm tra xem address có chứa bất kỳ biến thể nào không
                             return variants.some(variant => address.includes(variant));
                           }
                           
                           // Fallback: tìm kiếm trực tiếp
                           return address.includes(selectedRegion);
                         })());

    // Filter theo category (ngành hàng)
    // Map category tiếng Việt sang tiếng Anh
    const categoryMap: { [key: string]: string } = {
      "Tất cả ngành hàng": "",
      "Điện tử": "electronics",
      "Thời trang": "fashion",
      "Hoa quả": "other",
      "Thực phẩm": "other",
      "Gia dụng": "home",
      "Mỹ phẩm": "other",
      "Sách": "books",
      "Đồ chơi": "other",
      "Khác": "other",
    };

    const selectedCategory = categoryMap[filters.category] || "";
    const matchesCategory = 
      filters.category === "Tất cả ngành hàng" ||
      s.category?.toLowerCase() === selectedCategory.toLowerCase() ||
      s.customCategory?.toLowerCase().includes(filters.category.toLowerCase());

    return matchesRegion && matchesCategory;
  });

  // Sort stores dựa trên rating filter
  filteredStores = [...filteredStores].sort((a, b) => {
    switch (filters.rating) {
      case "Đánh giá cao nhất":
        return (b.rating || 0) - (a.rating || 0);
      case "Đánh giá trung bình":
        // Sắp xếp theo rating gần với trung bình (3.5)
        const avgA = Math.abs((a.rating || 0) - 3.5);
        const avgB = Math.abs((b.rating || 0) - 3.5);
        return avgA - avgB;
      default:
        return 0;
    }
  });

  return (
    <div className="w-full p-3 md:p-4 lg:p-6 xl:p-8">
      {/* Header */}
      <div className="mb-4 md:mb-6 lg:mb-8 animate-fade-in-down">
        <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold mb-2 md:mb-3 text-gray-900 gradient-text flex items-center gap-2 sm:gap-3">
          <Store className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600" />
          <span>Danh sách cửa hàng</span>
        </h1>
        <p className="text-gray-600 text-sm sm:text-base md:text-lg">
          Khám phá các cửa hàng uy tín trên nền tảng
        </p>
      </div>

      {/* Filter Section - ở trên */}
      <div className="mb-4 md:mb-6 lg:mb-8 animate-fade-in-up delay-200">
        <StoreFilters onFilterChange={setFilters} />
      </div>

      {/* List Section - ở dưới filter */}
      <div>
        {filteredStores.length > 0 && (
          <div className="mb-4 md:mb-6 animate-fade-in-up delay-300">
            <p className="text-gray-600 font-medium text-sm md:text-base">
              Tìm thấy <span className="text-blue-600 font-bold">{filteredStores.length}</span> cửa hàng
            </p>
          </div>
        )}

        <div className="animate-fade-in-up delay-300">
          {filteredStores.length > 0 ? (
            <StoreGrid stores={filteredStores} onlineStores={onlineStores} />
          ) : (
            <div className="text-center py-8 md:py-12 lg:py-16 animate-fade-in">
              <div className="flex justify-center mb-3 md:mb-4">
                <Store className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-gray-300" />
              </div>
              <p className="text-gray-500 text-base md:text-lg font-medium mb-2">
                Không tìm thấy cửa hàng nào
              </p>
              <p className="text-gray-400 text-xs md:text-sm">
                Hãy thử thay đổi bộ lọc
              </p>
            </div>
          )}
        </div>

        {filteredStores.length > 0 && (
          <div className="mt-6 md:mt-8 text-center animate-fade-in-up delay-400">
            <button className="px-4 sm:px-6 py-2.5 md:px-8 md:py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg md:rounded-xl font-bold text-sm md:text-base hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 touch-manipulation flex items-center gap-2 mx-auto">
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Tải thêm cửa hàng</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreList;
