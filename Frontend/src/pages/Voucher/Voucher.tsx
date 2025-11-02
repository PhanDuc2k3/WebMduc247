import React, { useEffect, useState } from "react";
import voucherApi, { type VoucherType } from "../../api/voucherApi";

export type Voucher = VoucherType & {
  title: string;
  condition: string;
  usagePercent?: number;
  used?: boolean;       // chỉ boolean, không nhận 0
  categories?: string[]; // mở rộng từ API nếu cần
  global?: boolean;
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
  const [activeTab, setActiveTab] = useState<"available" | "mine">("available");
  const [search, setSearch] = useState("");
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);

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
  used: Boolean(v.usedCount), // chuyển 0 -> false
  categories: (v as any).categories || [],
  global: (v as any).global || false,
}));

      setVouchers(mapped);
    } catch (err) {
      console.error("Lỗi khi fetch vouchers:", err);
      alert("Lỗi khi lấy voucher");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [activeTab]);

  const filteredVouchers = vouchers.filter((v) =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.code.toLowerCase().includes(search.toLowerCase())
  );

  const getStoreLabel = (v: Voucher) => {
    if (v.categories && v.categories.length > 0)
      return `Áp dụng cho các danh mục: ${v.categories.join(", ")}`;
    if (v.global) return `Áp dụng toàn hệ thống`;
    return "Áp dụng cho toàn bộ cửa hàng";
  };

  return (
    <div className="w-full py-8 md:py-12">
      <div className="mb-8 animate-fade-in-down">
        <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900 gradient-text flex items-center gap-3">
          Kho Voucher
        </h1>
        <p className="text-gray-600 text-lg">Tận hưởng ưu đãi tốt nhất từ các cửa hàng</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 animate-fade-in-up">
        <button
          onClick={() => setActiveTab("available")}
          className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 flex items-center gap-2 ${
            activeTab === "available" 
              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105" 
              : "bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50"
          }`}
        >
          <span>Voucher có sẵn</span>
        </button>
        <button
          onClick={() => setActiveTab("mine")}
          className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 flex items-center gap-2 ${
            activeTab === "mine" 
              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105" 
              : "bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50"
          }`}
        >
          <span>Voucher của tôi</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 animate-fade-in-up delay-200">
        {categories.map((cat, index) => (
          <span
            key={cat.name}
            className="px-5 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-300 cursor-pointer transition-all duration-300 transform hover:scale-105 animate-fade-in-up"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {cat.name} ({cat.count})
          </span>
        ))}
      </div>

      <div className="mb-6 animate-fade-in-up delay-300">
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm kiếm voucher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-5 py-3 pl-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center animate-fade-in">
          <p className="text-gray-600 text-lg font-medium">Đang tải voucher...</p>
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="p-8 text-center animate-fade-in">
          <p className="text-gray-500 text-lg font-medium mb-2">Không tìm thấy voucher nào</p>
          <p className="text-gray-400 text-sm">Thử lại với từ khóa khác</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredVouchers.map((v, index) => (
            <div
              key={v._id}
              className="border-2 border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-white to-gray-50 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
                  {v.title}
                </h2>
                <span className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg">
                  {v.code}
                </span>
              </div>
              
              <p className="text-sm text-gray-700 mb-4 bg-blue-50 p-3 rounded-xl">{v.description}</p>
              
              <div className="text-sm text-gray-700 space-y-2 mb-4">
                <p className="flex items-center gap-2">
                  Điều kiện: {v.condition}
                </p>
                <p className="flex items-center gap-2">
                  Ngày áp dụng: <span className="font-bold">{v.startDate.split("T")[0]}</span> → <span className="font-bold">{v.endDate.split("T")[0]}</span>
                </p>
                <p className="flex items-center gap-2">
                  {getStoreLabel(v)}
                </p>
                {v.used && (
                  <p className="text-red-600 font-bold px-3 py-2 bg-red-50 border-2 border-red-200 rounded-xl mt-2 flex items-center gap-2">
                    Bạn đã dùng voucher này
                  </p>
                )}
              </div>

              {v.usagePercent !== undefined && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-bold text-gray-700 mb-2">
                    <span className="flex items-center gap-1">
                      Đã sử dụng: {v.usagePercent}%
                    </span>
                    <span className="flex items-center gap-1">
                      Còn lại: {100 - v.usagePercent}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-3 rounded-full transition-all duration-1000"
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
