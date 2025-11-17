import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Store, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import StoreFilters from "../../components/StoreList/StoreFilters";
import StoreGrid from "../../components/StoreList/StoreGrid";
import StoreLoading from "../../components/StoreList/StoreLoading";
import type { StoreType } from "../../types/store";
import storeApi from "../../api/storeApi"; // dùng API đã tách
import { useChat } from "../../context/chatContext";

const ITEMS_PER_PAGE = 9;

const StoreList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchKeyword = searchParams.get("search");
  const pageParam = searchParams.get("page");
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    rating: "Đánh giá cao nhất",
    region: "Tất cả khu vực",
    category: "Tất cả ngành hàng",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const { onlineStores } = useChat();

  // Khởi tạo currentPage từ URL params
  useEffect(() => {
    const page = parseInt(pageParam || "1", 10);
    if (page > 0) {
      setCurrentPage(page);
    } else {
      setCurrentPage(1);
    }
  }, [pageParam]);

  // Reset về trang 1 khi search keyword thay đổi
  useEffect(() => {
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("page");
    setSearchParams(newParams, { replace: true });
  }, [searchKeyword]);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        let data;
        
        // Nếu có search keyword, tìm kiếm stores
        if (searchKeyword && searchKeyword.trim()) {
          const res = await storeApi.searchStores(searchKeyword.trim(), 100);
          data = { stores: res.data.stores || [] };
        } else {
          // Nếu không có search, lấy tất cả stores
          const res = await storeApi.getAllActiveStores();
          data = res.data;
        }

        // Giống hệt FeaturedStores để đảm bảo consistency
        const mappedStores: StoreType[] = (data.stores || []).map((s: any) => {
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
  }, [searchKeyword]);

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

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredStores.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedStores = filteredStores.slice(startIndex, endIndex);

  // Reset về trang 1 nếu currentPage vượt quá totalPages (khi filter thay đổi)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("page");
      setSearchParams(newParams, { replace: true });
    }
  }, [totalPages, currentPage, searchParams, setSearchParams]);

  // Xử lý chuyển trang
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    
    setCurrentPage(newPage);
    const newParams = new URLSearchParams(searchParams);
    if (newPage === 1) {
      newParams.delete("page");
    } else {
      newParams.set("page", newPage.toString());
    }
    setSearchParams(newParams);
    
    // Scroll to top khi chuyển trang
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="w-full p-3 md:p-4 lg:p-6 xl:p-8">
      {/* Header */}
      <div className="mb-4 md:mb-6 lg:mb-8 animate-fade-in-down">
        <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold mb-2 md:mb-3 text-gray-900 gradient-text flex items-center gap-2 sm:gap-3">
          <Store className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600" />
          <span>
            {searchKeyword ? `Kết quả tìm kiếm: "${searchKeyword}"` : "Danh sách cửa hàng"}
          </span>
        </h1>
        <p className="text-gray-600 text-sm sm:text-base md:text-lg">
          {searchKeyword 
            ? `Tìm thấy ${filteredStores.length} cửa hàng phù hợp`
            : "Khám phá các cửa hàng uy tín trên nền tảng"}
        </p>
      </div>

      {/* Filter Section - ở trên */}
      <div className="mb-4 md:mb-6 lg:mb-8 animate-fade-in-up delay-200" style={{ position: 'relative', zIndex: 50 }}>
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

        <div className="animate-fade-in-up delay-300" style={{ position: 'relative', zIndex: 1 }}>
          {filteredStores.length > 0 ? (
            <>
              <StoreGrid stores={paginatedStores} onlineStores={onlineStores} />
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 md:mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-up delay-400">
                  <div className="text-gray-600 text-sm md:text-base">
                    Hiển thị <span className="font-bold text-blue-600">{startIndex + 1}</span> -{" "}
                    <span className="font-bold text-blue-600">
                      {Math.min(endIndex, filteredStores.length)}
                    </span>{" "}
                    trong tổng số <span className="font-bold text-blue-600">{filteredStores.length}</span> cửa hàng
                  </div>
                  
                  <div className="flex items-center gap-2 md:gap-4">
                    <span className="text-gray-700 text-xs md:text-sm">
                      Trang <span className="text-blue-600 font-bold">{currentPage}</span> /{" "}
                      <span className="text-gray-600">{totalPages}</span>
                    </span>
                    
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 md:px-4 md:py-2.5 border-r border-gray-200 transition-colors ${
                          currentPage === 1
                            ? "text-gray-300 cursor-not-allowed bg-gray-50"
                            : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                        }`}
                        aria-label="Trang trước"
                      >
                        <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      
                      {/* Page numbers */}
                      <div className="flex items-center gap-1 px-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((page) => {
                            // Hiển thị trang đầu, cuối, trang hiện tại và các trang xung quanh
                            return (
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 1 && page <= currentPage + 1)
                            );
                          })
                          .map((page, index, array) => {
                            // Thêm dấu ... nếu có khoảng trống
                            const showEllipsis = index > 0 && array[index] - array[index - 1] > 1;
                            return (
                              <React.Fragment key={page}>
                                {showEllipsis && (
                                  <span className="px-2 text-gray-400">...</span>
                                )}
                                <button
                                  onClick={() => handlePageChange(page)}
                                  className={`px-3 py-2 md:px-4 md:py-2 text-xs md:text-sm font-medium transition-colors ${
                                    currentPage === page
                                      ? "bg-blue-600 text-white"
                                      : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                                  }`}
                                >
                                  {page}
                                </button>
                              </React.Fragment>
                            );
                          })}
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-2 md:px-4 md:py-2.5 border-l border-gray-200 transition-colors ${
                          currentPage === totalPages
                            ? "text-gray-300 cursor-not-allowed bg-gray-50"
                            : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                        }`}
                        aria-label="Trang sau"
                      >
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
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
      </div>
    </div>
  );
};

export default StoreList;
