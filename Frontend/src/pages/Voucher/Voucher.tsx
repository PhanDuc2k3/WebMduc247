import React, { useEffect, useState } from "react";
import { XCircle, Gift } from "lucide-react";
import voucherApi, { type VoucherType } from "../../api/voucherApi";
import { toast } from "react-toastify";

export type Voucher = VoucherType & {
  title: string;
  condition: string;
  usagePercent?: number;
  used?: boolean;       // chỉ boolean, không nhận 0
  categories?: string[]; // mở rộng từ API nếu cần
  global?: boolean;
  storeCategory?: string; // category của store
  voucherType?: "product" | "freeship"; // loại voucher
};

type Category = {
  name: string;
  count: number;
};

const categories: Category[] = [
  { name: "Tất cả", count: 0 },
  { name: "Công nghệ", count: 0 },
  { name: "Thời trang", count: 0 },
  { name: "Nhà cửa", count: 0 },
  { name: "Sách", count: 0 },
  { name: "Miễn ship", count: 0 },
];

export default function VoucherPage() {
  const [activeCategory, setActiveCategory] = useState<string>("Tất cả");
  const [search, setSearch] = useState("");
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<{ [key: string]: number }>({
    "Tất cả": 0,
    "Công nghệ": 0,
    "Thời trang": 0,
    "Nhà cửa": 0,
    "Sách": 0,
    "Miễn ship": 0,
  });

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await voucherApi.getAvailableVouchers();
      const mapped: Voucher[] = res.data.map((v) => ({
        ...v,
        title: (v as any).title || v.code,
        condition: (v as any).condition || "",
        usagePercent:
          v.usedCount && v.usageLimit ? Math.round((v.usedCount / v.usageLimit) * 100) : undefined,
        used: Boolean((v as any).used), // Sử dụng field 'used' từ API (đã được kiểm tra user hiện tại)
        categories: (v as any).categories || [],
        global: (v as any).global || false,
        storeCategory: (v as any).storeCategory || "",
        voucherType: (v as any).voucherType || "product",
      }));

      setVouchers(mapped);
    } catch (err) {
      console.error("Lỗi khi fetch vouchers:", err);
      toast.error(
        <div className="flex items-center gap-2">
          <XCircle className="text-red-500" size={18} />
          <span>Lỗi khi lấy voucher</span>
        </div>
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  // Filter vouchers theo category
  const getFilteredVouchers = () => {
    let filtered = vouchers;

    // Filter theo category
    if (activeCategory !== "Tất cả") {
      if (activeCategory === "Miễn ship") {
        filtered = filtered.filter((v) => v.voucherType === "freeship");
      } else {
        // Map category tiếng Việt sang tiếng Anh
        const categoryMap: { [key: string]: string } = {
          "Công nghệ": "electronics",
          "Thời trang": "fashion",
          "Nhà cửa": "home",
          "Sách": "books",
        };

        const categoryValue = categoryMap[activeCategory] || activeCategory.toLowerCase();
        filtered = filtered.filter((v) => {
          // Check storeCategory
          if (v.storeCategory && v.storeCategory.toLowerCase() === categoryValue) {
            return true;
          }
          // Check categories array
          if (v.categories && v.categories.length > 0) {
            return v.categories.some(
              (cat) => cat.toLowerCase() === categoryValue || cat.toLowerCase().includes(categoryValue)
            );
          }
          return false;
        });
      }
    }

    // Filter theo search
    if (search) {
      filtered = filtered.filter(
        (v) =>
          v.title.toLowerCase().includes(search.toLowerCase()) ||
          v.code.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredVouchers = getFilteredVouchers();

  // Update category counts
  useEffect(() => {
    const allCount = vouchers.length;
    const techCount = vouchers.filter((v) => {
      const cat = v.storeCategory?.toLowerCase() || "";
      return cat === "electronics" || v.categories?.some((c) => c.toLowerCase() === "electronics");
    }).length;
    const fashionCount = vouchers.filter((v) => {
      const cat = v.storeCategory?.toLowerCase() || "";
      return cat === "fashion" || v.categories?.some((c) => c.toLowerCase() === "fashion");
    }).length;
    const homeCount = vouchers.filter((v) => {
      const cat = v.storeCategory?.toLowerCase() || "";
      return cat === "home" || v.categories?.some((c) => c.toLowerCase() === "home");
    }).length;
    const booksCount = vouchers.filter((v) => {
      const cat = v.storeCategory?.toLowerCase() || "";
      return cat === "books" || v.categories?.some((c) => c.toLowerCase() === "books");
    }).length;
    const freeshipCount = vouchers.filter((v) => v.voucherType === "freeship").length;

    setCategoryCounts({
      "Tất cả": allCount,
      "Công nghệ": techCount,
      "Thời trang": fashionCount,
      "Nhà cửa": homeCount,
      "Sách": booksCount,
      "Miễn ship": freeshipCount,
    });
  }, [vouchers]);

  const getStoreLabel = (v: Voucher) => {
    if (v.categories && v.categories.length > 0)
      return `Áp dụng cho các danh mục: ${v.categories.join(", ")}`;
    if (v.global) return `Áp dụng toàn hệ thống`;
    return "Áp dụng cho toàn bộ cửa hàng";
  };

  return (
    <div className="w-full p-3 md:p-4 lg:p-6 xl:p-8">
      <div className="mb-4 md:mb-6 lg:mb-8 animate-fade-in-down">
        <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold mb-2 md:mb-3 text-[#2F5FEB] flex items-center gap-2 md:gap-3">
          <Gift className="w-7 h-7" />
          <span>Kho Voucher</span>
        </h1>
        <p className="text-gray-600 text-sm sm:text-base md:text-lg">
          Tận hưởng <span className="text-[#2F5FEB] font-semibold">ưu đãi tốt nhất</span> từ các cửa hàng
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6 animate-fade-in-up delay-200 overflow-x-auto pb-2">
        {categories.map((cat, index) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(cat.name)}
            className={`px-4 py-2 md:px-5 md:py-2.5 rounded-lg md:rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 transform hover:scale-105 whitespace-nowrap flex-shrink-0 ${
              activeCategory === cat.name
                ? "bg-[#2F5FEB] text-white shadow-lg scale-105"
                : "bg-white text-gray-600 border-2 border-gray-200 hover:border-[#2F5FEB] hover:bg-[#2F5FEB]/5"
            } animate-fade-in-up`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {cat.name} ({categoryCounts[cat.name] || 0})
          </button>
        ))}
      </div>

      <div className="mb-4 md:mb-6 animate-fade-in-up delay-300">
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm kiếm voucher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 md:px-5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-[#2F5FEB] focus:border-[#2F5FEB] outline-none transition-all duration-300 text-sm md:text-base"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-6 md:p-8 text-center animate-fade-in">
          <p className="text-gray-600 text-sm md:text-base lg:text-lg font-medium">Đang tải voucher...</p>
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="p-6 md:p-8 text-center animate-fade-in">
          <div className="flex justify-center mb-3 md:mb-4">
            <Gift className="w-10 h-10 md:w-12 md:h-12 text-gray-300" />
          </div>
          <p className="text-gray-500 text-base md:text-lg font-medium mb-2">Không tìm thấy voucher nào</p>
          <p className="text-gray-400 text-xs md:text-sm">Thử lại với từ khóa khác hoặc chọn danh mục khác</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
          {filteredVouchers.map((v, index) => (
            <div
              key={v._id}
              className="border-2 border-gray-200 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-white to-gray-50 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex justify-between items-start mb-3 md:mb-4 gap-2">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#2F5FEB] flex items-center gap-1 md:gap-2 flex-1 min-w-0">
                  <span className="truncate">{v.title}</span>
                </h2>
                <span className="px-2 py-1 md:px-4 md:py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg md:rounded-xl font-bold text-[10px] sm:text-xs md:text-sm shadow-lg flex-shrink-0">
                  {v.code}
                </span>
              </div>
              
                <p className="text-xs sm:text-sm text-gray-700 mb-3 md:mb-4 bg-[#2F5FEB]/5 p-2 md:p-3 rounded-lg md:rounded-xl line-clamp-2">{v.description}</p>
              
              <div className="text-xs sm:text-sm text-gray-700 space-y-1.5 md:space-y-2 mb-3 md:mb-4">
                <p className="flex items-center gap-1 md:gap-2 flex-wrap">
                  <span className="font-semibold">Điều kiện:</span> <span className="break-words">{v.condition}</span>
                </p>
                <p className="flex items-center gap-1 md:gap-2 flex-wrap">
                  <span className="font-semibold">Ngày áp dụng:</span>
                  <span className="font-bold text-xs md:text-sm">{v.startDate.split("T")[0]}</span>
                  <span>→</span>
                  <span className="font-bold text-xs md:text-sm">{v.endDate.split("T")[0]}</span>
                </p>
                <p className="flex items-center gap-1 md:gap-2 flex-wrap">
                  <span className="font-semibold">{getStoreLabel(v)}</span>
                </p>
                {v.used && (
                  <p className="text-red-600 font-bold px-2 py-1.5 md:px-3 md:py-2 bg-red-50 border-2 border-red-200 rounded-lg md:rounded-xl mt-2 flex items-center gap-1 md:gap-2 text-xs sm:text-sm">
                    ⚠️ Bạn đã dùng voucher này
                  </p>
                )}
              </div>

              {v.usagePercent !== undefined && (
                <div className="mt-3 md:mt-4">
                  <div className="flex justify-between text-[10px] sm:text-xs font-bold text-gray-700 mb-1.5 md:mb-2">
                    <span className="flex items-center gap-1">
                      Đã sử dụng: {v.usagePercent}%
                    </span>
                    <span className="flex items-center gap-1">
                      Còn lại: {100 - v.usagePercent}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 md:h-3 overflow-hidden">
                    <div
                      className="bg-[#2F5FEB] h-2 md:h-3 rounded-full transition-all duration-1000"
                      style={{ width: `${v.usagePercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
