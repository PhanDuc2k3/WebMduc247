import React, { useState } from "react";

const Statistics: React.FC = () => {
  const [range, setRange] = useState("7");

  return (
    <div>
      {/* Bộ lọc thời gian */}
      <div className="flex gap-3 mb-6">
        {["7", "30", "90"].map(r => (
          <button
            key={r}
            className={`px-5 py-3 rounded-lg font-medium text-base transition ${
              range === r
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setRange(r)}
          >
            {r} ngày
          </button>
        ))}
      </div>

      {/* Hàng đầu */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow p-6 min-h-[220px]">
          <div className="font-semibold text-lg mb-3">Doanh thu theo thời gian</div>
          <div className="text-gray-400 text-center mt-10">
            Biểu đồ doanh thu sẽ hiển thị ở đây
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 min-h-[220px]">
          <div className="font-semibold text-lg mb-3">Sản phẩm bán chạy</div>
          <div className="text-gray-400 text-center mt-10">
            Top sản phẩm bán chạy
          </div>
        </div>
      </div>

      {/* Hàng dưới */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6 min-h-[150px]">
          <div className="font-semibold text-lg mb-3">Đánh giá khách hàng</div>
          <div className="space-y-3 text-base">
            <div className="flex items-center gap-3">
              <span className="w-12">5 ⭐</span>
              <div className="flex-1 bg-gray-200 h-3 rounded">
                <div
                  className="bg-yellow-400 h-3 rounded"
                  style={{ width: "80%" }}
                />
              </div>
              <span className="text-gray-500">80%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-12">4 ⭐</span>
              <div className="flex-1 bg-gray-200 h-3 rounded">
                <div
                  className="bg-yellow-400 h-3 rounded"
                  style={{ width: "15%" }}
                />
              </div>
              <span className="text-gray-500">15%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-12">3 ⭐</span>
              <div className="flex-1 bg-gray-200 h-3 rounded">
                <div
                  className="bg-yellow-400 h-3 rounded"
                  style={{ width: "3%" }}
                />
              </div>
              <span className="text-gray-500">3%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 min-h-[150px]">
          <div className="font-semibold text-lg mb-3">Thống kê lượt truy cập</div>
          <div className="text-gray-400 text-center mt-10">
            Biểu đồ lượt truy cập
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
