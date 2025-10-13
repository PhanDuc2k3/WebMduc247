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
      console.error("❌ Lỗi khi fetch vouchers:", err);
      alert("❌ Lỗi khi lấy voucher");
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
    <div className="p-6 max-w-6xl mx-auto font-sans">
      <h3 className="text-[22px] font-bold mb-1 text-gray-900">Kho Voucher</h3>
      <p className="text-sm text-gray-600 mb-4">
        Tận hưởng ưu đãi tốt nhất từ các cửa hàng
      </p>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab("available")}
          className={`px-4 py-2 rounded-full font-medium ${
            activeTab === "available" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          Voucher có sẵn
        </button>
        <button
          onClick={() => setActiveTab("mine")}
          className={`px-4 py-2 rounded-full font-medium ${
            activeTab === "mine" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          Voucher của tôi
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {categories.map((cat) => (
          <span
            key={cat.name}
            className="px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-blue-100 cursor-pointer"
          >
            {cat.name} ({cat.count})
          </span>
        ))}
      </div>

      <input
        type="text"
        placeholder="Tìm kiếm voucher..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 mb-6 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {loading ? (
        <div>Đang tải voucher...</div>
      ) : (
        <div className="grid gap-6">
          {filteredVouchers.map((v) => (
            <div
              key={v._id}
              className="border rounded-lg p-5 shadow hover:shadow-md transition bg-white"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold text-blue-700">{v.title}</h2>
                <span className="text-green-600 font-bold">{v.code}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{v.description}</p>
              <div className="text-sm text-gray-700 space-y-1 mb-3">
                <p>Điều kiện: {v.condition}</p>
                <p>
                  Ngày áp dụng: {v.startDate.split("T")[0]} → {v.endDate.split("T")[0]}
                </p>
                <p>{getStoreLabel(v)}</p>
                {v.used && (
                  <p className="text-red-500 font-medium mt-1">Bạn đã dùng voucher này</p>
                )}
              </div>

              {v.usagePercent !== undefined && (
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Đã sử dụng: {v.usagePercent}%</span>
                    <span>Còn lại: {100 - v.usagePercent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
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
