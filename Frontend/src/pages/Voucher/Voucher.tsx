import React, { useEffect, useState } from "react";

type Category = {
  name: string;
  count: number;
};

type Voucher = {
  _id: string;
  code: string;
  title: string;
  description: string;
  condition: string;
  price: string;
  date: string;
  store?: { _id: string; name: string; category?: string };
  categories?: string[];
  global?: boolean;
  used?: boolean;
  usagePercent?: number;
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
      const token = localStorage.getItem("token");
      const res = await fetch(
        activeTab === "available"
          ? "http://localhost:5000/api/vouchers"
          : "http://localhost:5000/api/vouchers/mine",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi khi lấy voucher");
      setVouchers(data);
    } catch (err) {
      console.error(err);
      alert("❌ " + (err as Error).message);
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
    if (v.store?.name) return `Áp dụng cho cửa hàng: ${v.store.name}`;
    if (v.categories && v.categories.length > 0)
      return `Áp dụng riêng cho tất cả các cửa hàng thuộc: ${v.categories.join(", ")}`;
    if (v.global) return `Áp dụng cho toàn bộ cửa hàng`;
    return "Áp dụng cho toàn bộ cửa hàng";
  };

  return (
    <div className="p-6 max-w-6xl mx-auto font-sans">
      {/* 🔥 Tiêu đề & mô tả giống FeaturedProducts */}
      <h3 className="text-[22px] font-bold mb-1 text-gray-900">Kho Voucher</h3>
      <p className="text-sm text-gray-600 mb-4">
        Tận hưởng ưu đãi tốt nhất từ các cửa hàng
      </p>

      {/* Banner Flash Sale */}
      <div className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white p-4 rounded-lg mb-6 text-center font-semibold">
        🎉 Flash Sale | Giảm đến 50% | Miễn phí ship | Voucher hot
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab("available")}
          className={`px-4 py-2 rounded-full font-medium ${
            activeTab === "available"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Voucher có sẵn
        </button>
        <button
          onClick={() => setActiveTab("mine")}
          className={`px-4 py-2 rounded-full font-medium ${
            activeTab === "mine"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Voucher của tôi
        </button>
      </div>

      {/* Categories */}
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

      {/* Search */}
      <input
        type="text"
        placeholder="Tìm kiếm voucher..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 mb-6 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {/* Danh sách Voucher */}
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
                <p>Ngày áp dụng: {v.date}</p>
                <p>{getStoreLabel(v)}</p>
                {v.used && (
                  <p className="text-red-500 font-medium mt-1">
                    Bạn đã dùng voucher này
                  </p>
                )}
              </div>

              {/* Thanh số lượng đã dùng */}
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
                    ></div>
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
