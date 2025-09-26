import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface StatisticsProps {
  storeId: string;
}

const Statistics: React.FC<StatisticsProps> = ({ storeId }) => {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [viewsData, setViewsData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        // ----------- Doanh thu -----------
        const revRes = await fetch(
          `http://localhost:5000/api/statistics/revenue?storeId=${storeId}&range=7`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const revJson = await revRes.json();

        const revMap: Record<string, number> = {};
        revJson.forEach((item: any) => {
          const dateStr = item.date || item._id;
          revMap[dateStr] = Number(item.total) || 0;
        });

        const today = new Date();
        const days = 7;
        const revFinal = Array.from({ length: days }).map((_, i) => {
          const d = new Date();
          d.setDate(today.getDate() - (days - 1 - i));
          const dateStr = d.toISOString().slice(0, 10);
          return {
            date: dateStr,
            total: revMap[dateStr] || 0,
          };
        });
        setRevenueData(revFinal);

        // ----------- Lượt truy cập -----------
        const viewRes = await fetch(
          `http://localhost:5000/api/statistics/views?storeId=${storeId}&range=7`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const viewJson = await viewRes.json();

        const viewMap: Record<string, number> = {};
        viewJson.forEach((v: any) => {
          const dateStr = v.date || v._id;
          viewMap[dateStr] = Number(v.views) || Number(v.totalViews) || 0;
        });

        const viewFinal = Array.from({ length: days }).map((_, i) => {
          const d = new Date();
          d.setDate(today.getDate() - (days - 1 - i));
          const dateStr = d.toISOString().slice(0, 10);
          return {
            date: dateStr,
            views: viewMap[dateStr] || 0,
          };
        });
        setViewsData(viewFinal);

        // ----------- Top sản phẩm -----------
        const topRes = await fetch(
          `http://localhost:5000/api/statistics/top-products?storeId=${storeId}&range=7`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const topJson = await topRes.json();

        const topFinal = topJson.map((item: any) => ({
          name: item.product?.name || "Unknown",
          sold: Number(item.totalSold) || 0,
        }));
        setTopProducts(topFinal);
      } catch (err) {
        console.error("Lỗi khi load dữ liệu thống kê:", err);
      }
    };

    fetchData();
  }, [storeId]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow p-6 min-h-[220px]">
          <div className="font-semibold text-lg mb-3">Doanh thu 7 ngày</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}tr`} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString("vi-VN")}₫`} />
              <Line type="monotone" dataKey="total" stroke="#000" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow p-6 min-h-[220px]">
          <div className="font-semibold text-lg mb-3">Sản phẩm bán chạy</div>
          <div className="space-y-2">
            {topProducts.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center p-2 rounded hover:bg-gray-100"
              >
                <span>{idx + 1}. {item.name}</span>
                <span className="font-semibold text-gray-700">{item.sold} bán</span>
              </div>
            ))}
            {topProducts.length === 0 && (
              <div className="text-gray-500">Không có dữ liệu</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6 min-h-[150px]">
          <div className="font-semibold text-lg mb-3">Đánh giá khách hàng</div>
          <div className="space-y-3 text-base">
            {[{ stars: 5, percent: 80 }, { stars: 4, percent: 15 }, { stars: 3, percent: 3 }, { stars: 2, percent: 1 }, { stars: 1, percent: 1 }].map(item => (
              <div key={item.stars} className="flex items-center gap-3">
                <span className="w-12">{item.stars} ⭐</span>
                <div className="flex-1 bg-gray-200 h-3 rounded">
                  <div
                    className="bg-yellow-400 h-3 rounded"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
                <span className="text-gray-500">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 min-h-[200px]">
          <div className="font-semibold text-lg mb-3">Lượt truy cập 7 ngày</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={viewsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v: number) => v.toLocaleString("vi-VN")} />
              <Bar dataKey="views" fill="#facc15" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
