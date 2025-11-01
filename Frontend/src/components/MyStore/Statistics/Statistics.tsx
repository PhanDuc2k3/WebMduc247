import React, { useEffect, useState } from "react";
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
import statisticApi from "../../../api/statisticApi";

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
        // Doanh thu 7 ngày
        const revRes = await statisticApi.getRevenueStats({ storeId, range: 7 });
        const revJson = revRes.data;
        const revMap: Record<string, number> = {};
        revJson.forEach((item: any) => {
          const dateStr = item.date || item._id;
          revMap[dateStr] = Number(item.total) || 0;
        });
        const today = new Date();
        const revFinal = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(today.getDate() - (6 - i));
          const dateStr = d.toISOString().slice(0, 10);
          return { date: dateStr, total: revMap[dateStr] || 0 };
        });
        setRevenueData(revFinal);

        // Lượt truy cập 7 ngày
        const viewRes = await statisticApi.getViewsStats({ storeId, range: 7 });
        const viewJson = viewRes.data;
        const viewMap: Record<string, number> = {};
        viewJson.forEach((v: any) => {
          const dateStr = v.date || v._id;
          viewMap[dateStr] = Number(v.views) || Number(v.totalViews) || 0;
        });
        const viewFinal = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(today.getDate() - (6 - i));
          const dateStr = d.toISOString().slice(0, 10);
          return { date: dateStr, views: viewMap[dateStr] || 0 };
        });
        setViewsData(viewFinal);

        // Top sản phẩm
        const topRes = await statisticApi.getTopProducts({ storeId, range: 7 });
        const topFinal = topRes.data.map((item: any) => ({
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
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doanh thu 7 ngày */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b-2 border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span>💰</span> Doanh thu 7 ngày
            </h3>
            <p className="text-gray-600 text-sm mt-1">Tổng quan doanh thu trong tuần</p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}tr`} stroke="#6b7280" />
                <Tooltip formatter={(v: number) => `${v.toLocaleString("vi-VN")}₫`} />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="url(#gradient)" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sản phẩm bán chạy */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b-2 border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span>🏆</span> Sản phẩm bán chạy
            </h3>
            <p className="text-gray-600 text-sm mt-1">Top sản phẩm được yêu thích nhất</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {topProducts.slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 rounded-xl hover:bg-purple-50 transition-all duration-200 animate-fade-in-up border border-gray-100"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                      idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                      idx === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400' :
                      'bg-gradient-to-br from-blue-400 to-purple-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className="font-semibold text-gray-900">{item.name}</span>
                  </div>
                  <span className="font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg">{item.sold} bán</span>
                </div>
              ))}
              {topProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📊</div>
                  <p>Không có dữ liệu</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Đánh giá khách hàng */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 border-b-2 border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span>⭐</span> Đánh giá khách hàng
            </h3>
            <p className="text-gray-600 text-sm mt-1">Phân phối điểm đánh giá</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[{ stars: 5, percent: 80 }, { stars: 4, percent: 15 }, { stars: 3, percent: 3 }, { stars: 2, percent: 1 }, { stars: 1, percent: 1 }].map((item, idx) => (
                <div key={item.stars} className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <span className="w-12 font-bold text-yellow-600">{item.stars} ⭐</span>
                  <div className="flex-1 bg-gray-200 h-4 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <span className="text-gray-700 font-bold text-sm">{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lượt truy cập 7 ngày */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 border-b-2 border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span>👁️</span> Lượt truy cập 7 ngày
            </h3>
            <p className="text-gray-600 text-sm mt-1">Số lượt xem sản phẩm</p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={viewsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip formatter={(v: number) => v.toLocaleString("vi-VN")} />
                <Bar dataKey="views" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
