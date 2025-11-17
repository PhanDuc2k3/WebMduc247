import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, Filter, X, Package } from "lucide-react";
import ProductLoading from "../../components/ProductList/ProductLoading";
import ProductCard from "../../components/Home/FeaturedProducts/ProductCard";
import PriceFilter from "../../components/ProductList/PriceFilter";
import type { ProductType } from "../../types/product";
import productApi from "../../api/productApi";

type SortType = "relevant" | "newest" | "bestselling" | "price";

const ProductList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrice, setSelectedPrice] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortType>("relevant");
  const [priceSort, setPriceSort] = useState<"low" | "high">("low");
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [showRatingDropdown, setShowRatingDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const priceDropdownRef = useRef<HTMLDivElement>(null);
  const ratingDropdownRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  const ratingOptions = [
    { value: "", label: "Tất cả đánh giá" },
    { value: "4.5", label: "4.5 sao trở lên" },
    { value: "4", label: "4 sao trở lên" },
    { value: "3.5", label: "3.5 sao trở lên" },
    { value: "3", label: "3 sao trở lên" },
  ];

  const locationOptions = [
    { value: "", label: "Tất cả địa chỉ" },
    { value: "Hà Nội", label: "Hà Nội" },
    { value: "TP. Hồ Chí Minh", label: "TP. Hồ Chí Minh" },
    { value: "Đà Nẵng", label: "Đà Nẵng" },
    { value: "Cần Thơ", label: "Cần Thơ" },
    { value: "Huế", label: "Huế" },
  ];

  // Map location từ tiếng Việt sang tiếng Anh và các biến thể
  const getLocationVariants = (location: string): string[] => {
    if (!location) return [];
    const variants: string[] = [location.toLowerCase()];
    
    // Map các tên địa danh phổ biến
    const locationMap: Record<string, string[]> = {
      "hà nội": ["hanoi", "ha noi", "hà nội", "ha noi city"],
      "tp. hồ chí minh": ["ho chi minh", "ho chi minh city", "hcm", "sài gòn", "saigon", "tp. hồ chí minh", "tp hcm"],
      "đà nẵng": ["da nang", "danang", "đà nẵng"],
      "cần thơ": ["can tho", "cantho", "cần thơ"],
      "huế": ["hue", "huế"],
    };

    const normalized = location.toLowerCase();
    if (locationMap[normalized]) {
      variants.push(...locationMap[normalized]);
    }
    
    return [...new Set(variants)]; // Remove duplicates
  };

  // Đọc search term và category từ URL query
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    
    if (search) {
      setSearchTerm(search);
    } else {
      setSearchTerm("");
    }
    
    if (category) {
      setSelectedCategory(category);
    } else {
      setSelectedCategory("");
    }
    
    // Reset về trang 1 khi search hoặc category thay đổi
    setCurrentPage(1);
  }, [searchParams]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Nếu có search keyword, tìm kiếm sản phẩm
        let res;
        if (searchTerm && searchTerm.trim()) {
          res = await productApi.searchProducts(searchTerm.trim(), 100);
          const products = res.data.products || [];
          const mapped: ProductType[] = products.map((p: any) => ({
            _id: p._id,
            name: p.name,
            description: p.description,
            price: p.price,
            salePrice: p.salePrice,
            brand: p.brand,
            category: p.category,
            subCategory: p.subCategory,
            quantity: p.quantity,
            soldCount: p.soldCount,
            model: p.model,
            images: p.images || [],
            specifications: p.specifications || [],
            rating: p.rating || 0,
            reviewsCount: p.reviewsCount || 0,
            viewsCount: p.viewsCount || 0,
            isActive: p.isActive ?? true,
            store: p.store || null,
            tags: p.tags || [],
            keywords: p.keywords || [],
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          }));
          setProducts(mapped);
          setLoading(false);
          return;
        }
        
        // Nếu có category, filter theo category
        const params: any = {};
        if (selectedCategory && selectedCategory.trim()) {
          params.category = selectedCategory.trim();
        }
        
        res = await productApi.getProducts(params);
        const list = res.data.data || res.data.products || [];

        const mapped: ProductType[] = list.map((p: any) => ({
          _id: p._id,
          name: p.name,
          description: p.description,
          price: p.price,
          salePrice: p.salePrice,
          brand: p.brand,
          category: p.category,
          subCategory: p.subCategory,
          quantity: p.quantity,
          soldCount: p.soldCount,
          model: p.model,
          images: p.images || [],
          specifications: p.specifications || [],
          rating: p.rating || 0,
          reviewsCount: p.reviewsCount || 0,
          tags: p.tags || [],
          seoTitle: p.seoTitle || "",
          seoDescription: p.seoDescription || "",
          keywords: p.keywords || [],
          isFeatured: p.isFeatured || false,
          viewsCount: p.viewsCount || 0,
          isActive: p.isActive ?? true,
          store: typeof p.store === 'object' && p.store 
            ? { 
                _id: p.store._id || p.store,
                name: p.store.name,
                logoUrl: p.store.logoUrl,
                storeAddress: p.store.storeAddress || p.store.address || ""
              }
            : p.store || "",
          createdAt: p.createdAt || p.created_at || new Date().toISOString(),
        }));

        setProducts(mapped);
      } catch (err) {
        console.error("Lỗi khi fetch products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchTerm, selectedCategory]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (priceDropdownRef.current && !priceDropdownRef.current.contains(e.target as Node)) {
        setShowPriceDropdown(false);
      }
      if (ratingDropdownRef.current && !ratingDropdownRef.current.contains(e.target as Node)) {
        setShowRatingDropdown(false);
      }
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔎 Lọc và sắp xếp sản phẩm
  let filteredProducts = products
    .filter((p) => {
      // Filter theo category nếu có
      if (selectedCategory && selectedCategory.trim()) {
        const productCategory = (p.category || "").toLowerCase().trim();
        const selectedCat = selectedCategory.toLowerCase().trim();
        // So sánh category (case-insensitive)
        if (productCategory !== selectedCat) {
          return false;
        }
      }
      return true;
    })
    .filter((p) => {
      if (!selectedPrice) return true;

      const range = selectedPrice.split("-");
      if (range.length === 2) {
        const [min, max] = range.map(Number);
        return p.price >= min && p.price <= max;
      }

      if (selectedPrice === "duoi1tr") return p.price < 1_000_000;
      if (selectedPrice === "1-5tr") return p.price >= 1_000_000 && p.price <= 5_000_000;
      if (selectedPrice === "5-10tr") return p.price > 5_000_000 && p.price <= 10_000_000;
      if (selectedPrice === "tren10tr") return p.price > 10_000_000;

      return true;
    })
    .filter((p) => {
      // Filter theo rating
      if (ratingFilter) {
        const minRating = parseFloat(ratingFilter);
        return (p.rating || 0) >= minRating;
      }
      return true;
    })
    .filter((p) => {
      // Filter theo location dựa trên storeAddress của store chứa product
      if (locationFilter) {
        // Nếu store là object và có storeAddress
        if (typeof p.store === 'object' && p.store && 'storeAddress' in p.store && p.store.storeAddress) {
          const storeAddress = p.store.storeAddress.toLowerCase();
          // Lấy tất cả các biến thể của location filter (Hà Nội -> Hanoi, Hà Nội, etc.)
          const locationVariants = getLocationVariants(locationFilter);
          // Kiểm tra storeAddress có chứa bất kỳ biến thể nào không
          return locationVariants.some(variant => storeAddress.includes(variant));
        }
        // Nếu store chỉ là string (ID), không thể filter theo location
        return false; // Bỏ qua sản phẩm không có thông tin store đầy đủ
      }
      return true;
    });

  // Sắp xếp sản phẩm
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortBy === "bestselling") {
      return (b.soldCount || 0) - (a.soldCount || 0);
    }
    if (sortBy === "price") {
      return priceSort === "low" ? a.price - b.price : b.price - a.price;
    }
    // relevant: giữ nguyên thứ tự (theo search relevance nếu có)
    return 0;
  });

  // Tính pagination
  const productsPerPage = 12;
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);
  const calculatedTotalPages = Math.ceil(sortedProducts.length / productsPerPage);

  useEffect(() => {
    setTotalPages(calculatedTotalPages);
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [calculatedTotalPages, currentPage]);

  // Khóa scroll khi mở mobile filter
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = isMobileFilterOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileFilterOpen]);

  if (loading) return <ProductLoading />;

  return (
    <div className="w-full p-3 md:p-4 lg:p-6">
      {/* Header */}
      <div className="pb-4 md:pb-6 animate-fade-in-down">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold pb-2 md:pb-3 text-gray-900 flex items-center gap-2">
          <Package className="w-6 h-6 md:w-7 md:h-7 text-blue-600" />
          <span>
            {searchTerm 
              ? `Kết quả tìm kiếm: "${searchTerm}"`
              : selectedCategory
              ? `Danh mục: ${selectedCategory}`
              : "Danh sách sản phẩm"}
          </span>
        </h1>
        <p className="text-gray-600 text-sm md:text-base lg:text-lg">
          {searchTerm 
            ? `Tìm thấy ${filteredProducts.length} sản phẩm phù hợp`
            : selectedCategory
            ? `Tìm thấy ${filteredProducts.length} sản phẩm trong danh mục ${selectedCategory}`
            : "Khám phá các sản phẩm nổi bật được nhiều người yêu thích"}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
        {/* Bộ lọc giá - Desktop */}
        <div className="hidden lg:block lg:w-1/5 bg-white p-6 rounded-2xl shadow-md border border-gray-100 h-fit sticky top-[180px] animate-fade-in-left delay-300">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💰</span>
            <h2 className="text-xl font-bold text-gray-900">Lọc theo giá</h2>
          </div>
          <PriceFilter selectedPrice={selectedPrice} setSelectedPrice={setSelectedPrice} />
        </div>

        {/* Danh sách sản phẩm */}
        <div className="w-full lg:w-4/5 animate-fade-in-right delay-300">
          {/* Mobile Filter Button */}
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden pb-3 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Filter size={20} />
            <span>Lọc sản phẩm</span>
          </button>

          {/* Thanh sắp xếp và pagination */}
          <div className="pb-4 bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-200">
            {/* Sắp xếp - Mobile: Vertical, Desktop: Horizontal */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 w-full md:w-auto">
                <span className="text-gray-700 font-medium text-xs md:text-sm whitespace-nowrap">Sắp xếp theo:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSortBy("relevant")}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${
                      sortBy === "relevant"
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md"
                        : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                    }`}
                  >
                  Liên Quan
                </button>
                <button
                  onClick={() => setSortBy("newest")}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${
                    sortBy === "newest"
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  Mới Nhất
                </button>
                <button
                  onClick={() => setSortBy("bestselling")}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${
                    sortBy === "bestselling"
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  Bán Chạy
                </button>
                {/* Dropdown Đánh giá tốt nhất */}
                <div className="relative" ref={ratingDropdownRef}>
                  <button
                    onClick={() => setShowRatingDropdown(!showRatingDropdown)}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                      ratingFilter
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md"
                        : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="hidden sm:inline">Đánh giá tốt nhất</span>
                    <span className="sm:hidden">Đánh giá</span>
                    <ChevronDown size={12} className={ratingFilter ? "text-white" : "text-gray-500"} />
                  </button>
                  {showRatingDropdown && (
                    <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-fade-in z-[9999]">
                      {ratingOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setRatingFilter(option.value);
                            setShowRatingDropdown(false);
                          }}
                          className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                            ratingFilter === option.value
                              ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-medium"
                              : "text-gray-700"
                          } ${option.value ? "border-t border-gray-100" : ""}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Dropdown Địa chỉ */}
                <div className="relative" ref={locationDropdownRef}>
                  <button
                    onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                      locationFilter
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md"
                        : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    Địa chỉ
                    <ChevronDown size={12} className={locationFilter ? "text-white" : "text-gray-500"} />
                  </button>
                  {showLocationDropdown && (
                    <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-fade-in z-[9999]">
                      {locationOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setLocationFilter(option.value);
                            setShowLocationDropdown(false);
                          }}
                          className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                            locationFilter === option.value
                              ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-medium"
                              : "text-gray-700"
                          } ${option.value ? "border-t border-gray-100" : ""}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative" ref={priceDropdownRef}>
                  <button
                    onClick={() => {
                      if (sortBy === "price") {
                        setShowPriceDropdown(!showPriceDropdown);
                      } else {
                        setSortBy("price");
                      }
                    }}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                      sortBy === "price"
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md"
                        : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    Giá
                    <ChevronDown size={12} className={sortBy === "price" ? "text-white" : "text-gray-500"} />
                  </button>
                  {showPriceDropdown && sortBy === "price" && (
                    <div className="absolute left-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-fade-in z-[9999]">
                      <button
                        onClick={() => {
                          setPriceSort("low");
                          setShowPriceDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                          priceSort === "low" ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-medium" : "text-gray-700"
                        }`}
                      >
                        Thấp đến cao
                      </button>
                      <button
                        onClick={() => {
                          setPriceSort("high");
                          setShowPriceDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors border-t border-gray-100 ${
                          priceSort === "high" ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-medium" : "text-gray-700"
                        }`}
                      >
                        Cao đến thấp
                      </button>
                    </div>
                  )}
                </div>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between md:justify-end gap-2 md:gap-4 w-full md:w-auto pt-2 md:pt-0">
                <span className="text-gray-700 text-xs md:text-sm">
                  <span className="text-red-500 font-bold">{currentPage}</span>/{totalPages}
                </span>
                <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-2 py-1.5 md:px-3 md:py-2 border-r border-gray-200 transition-colors ${
                      currentPage === 1
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-2 py-1.5 md:px-3 md:py-2 transition-colors ${
                      currentPage === totalPages
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

          {/* Grid sản phẩm */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
            {paginatedProducts.length > 0 ? (
              paginatedProducts.map((p, index) => {
                // Map ProductType sang Product cho ProductCard
                const productForCard = {
                  _id: p._id,
                  name: p.name,
                  price: p.price,
                  salePrice: p.salePrice,
                  images: p.images,
                  rating: p.rating,
                  reviewsCount: p.reviewsCount,
                  soldCount: p.soldCount,
                  store: typeof p.store === 'string' 
                    ? p.store 
                    : (p.store && typeof p.store === 'object' && 'name' in p.store)
                    ? { name: p.store.name || 'Unknown Store' }
                    : 'Unknown Store'
                };
                return (
                  <div 
                    key={p._id} 
                    className="w-full animate-slide-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <ProductCard product={productForCard} />
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-16 animate-fade-in">
                <div className="text-6xl mb-4">😔</div>
                <p className="text-gray-500 text-lg font-medium mb-2">
                  Không có sản phẩm nào để hiển thị
                </p>
                <p className="text-gray-400 text-sm">
                  Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div> {/* Đóng div flex flex-col lg:flex-row */}

      {/* Mobile Filter Drawer */}
      <div
        className={`fixed inset-0 z-[9999] lg:hidden transition-all duration-300 ${
          isMobileFilterOpen ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"
        }`}
      >
        {/* Overlay */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
            isMobileFilterOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileFilterOpen(false)}
        ></div>
        
        {/* Filter Drawer */}
        <div
          className={`absolute top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl transform transition-transform duration-300 overflow-y-auto ${
            isMobileFilterOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>💰</span>
              Lọc theo giá
            </h2>
            <button
              onClick={() => setIsMobileFilterOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Đóng filter"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>
          <div className="p-4">
            <PriceFilter selectedPrice={selectedPrice} setSelectedPrice={setSelectedPrice} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
