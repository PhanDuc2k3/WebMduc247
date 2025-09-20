import React, { useState } from "react";

type Category = {
  name: string;
  count: number;
};

type Voucher = {
  title: string;
  description: string;
  condition: string;
  price: string;
  date: string;
  store: string;
  used?: boolean;
  usage?: number; 
};

const categories: Category[] = [
  { name: "Tất cả", count: 89 },
  { name: "Công nghệ", count: 15 },
  { name: "Thời trang", count: 23 },
  { name: "Nhà cửa", count: 18 },
  { name: "Sách", count: 8 },
  { name: "Miễn ship", count: 12 },
];

const vouchers: Voucher[] = [
  {
    title: "Giảm 50K cho đơn từ 500K",
    description: "Áp dụng cho tất cả sản phẩm, không kết hợp với voucher khác",
    condition: "Từ 500.000 ₫",
    price: "50.000 ₫",
    date: "2023-02-15",
    store: "Tất cả cửa hàng",
    used: true,
    usage: 50, 
  },
  {
    title: "Giảm 20K cho đơn từ 200K",
    description: "Chỉ áp dụng cho ngành hàng thời trang",
    condition: "Từ 200.000 ₫",
    price: "20.000 ₫",
    date: "2023-03-01",
    store: "Thời trang",
    usage: 30, 
  },
];

export default function VoucherPage() {
  const [activeTab, setActiveTab] = useState<"available" | "mine">("available");
  const [search, setSearch] = useState("");

  const filteredVouchers = vouchers.filter((v) =>
    v.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-2 text-blue-700">Kho Voucher</h1>
      <p className="text-gray-600 mb-6 text-lg">
        Tận hưởng ưu đãi tốt nhất từ các cửa hàng
      </p>

      <div className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white p-4 rounded-lg mb-6 text-center font-semibold">
        🎉 Flash Sale | Giảm đến 50% | Miễn phí ship | Voucher hot
      </div>

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

      <div className="grid gap-6">
        {filteredVouchers.map((v, i) => (
          <div
            key={i}
            className="border rounded-lg p-5 shadow hover:shadow-md transition bg-white"
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold text-blue-700">{v.title}</h2>
              <span className="text-green-600 font-bold">{v.price}</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{v.description}</p>
            <div className="text-sm text-gray-700 space-y-1 mb-3">
              <p>Điều kiện: {v.condition}</p>
              <p>Ngày áp dụng: {v.date}</p>
              <p>Cửa hàng: {v.store}</p>
              {v.used && (
                <p className="text-red-500 font-medium mt-1">Đã dùng</p>
              )}
            </div>

            {/* 🟢 Thanh tiến trình usage */}
            {v.usage !== undefined && (
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Đã sử dụng: {v.usage}%</span>
                  <span>Còn lại: {100 - v.usage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${v.usage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
