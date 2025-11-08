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
import { DollarSign, Trophy, Star, Eye, BarChart3 } from "lucide-react";
import statisticApi from "../../../api/statisticApi";

interface StatisticsProps {
  storeId: string;
}

interface RatingDistribution {
  stars: number;
  count: number;
  percent: number;
}

const Statistics: React.FC<StatisticsProps> = ({ storeId }) => {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [viewsData, setViewsData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [ratingDistribution, setRatingDistribution] = useState<RatingDistribution[]>([]);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);

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

        // Đánh giá khách hàng - Lấy phân phối đánh giá từ API
        try {
          const ratingRes = await statisticApi.getRatingDistribution({ storeId });
          const ratingData = ratingRes.data;
          
          setTotalReviews(ratingData.totalReviews || 0);
          setAverageRating(ratingData.averageRating || 0);
          setRatingDistribution(ratingData.distribution || [
            { stars: 5, count: 0, percent: 0 },
            { stars: 4, count: 0, percent: 0 },
            { stars: 3, count: 0, percent: 0 },
            { stars: 2, count: 0, percent: 0 },
            { stars: 1, count: 0, percent: 0 },
          ]);
        } catch (err) {
          console.error("Lỗi khi load đánh giá:", err);
          // Set default distribution nếu có lỗi
          setRatingDistribution([
            { stars: 5, count: 0, percent: 0 },
            { stars: 4, count: 0, percent: 0 },
            { stars: 3, count: 0, percent: 0 },
            { stars: 2, count: 0, percent: 0 },
            { stars: 1, count: 0, percent: 0 },
          ]);
          setTotalReviews(0);
          setAverageRating(0);
        }
      } catch (err) {
        console.error("Lỗi khi load dữ liệu thống kê:", err);
      }
    };

    fetchData();
  }, [storeId]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in-up">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Doanh thu 7 ngày */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 sm:p-6 border-b-2 border-gray-200">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              <span>Doanh thu 7 ngày</span>
            </h3>
            <p className="text-gray-600 text-xs sm:text-sm mt-1">Tổng quan doanh thu trong tuần</p>
          </div>
          <div className="p-3 sm:p-4 md:p-6">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis 
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}tr`} 
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                  width={50}
                />
                <Tooltip 
                  formatter={(v: number) => `${v.toLocaleString("vi-VN")}₫`}
                  contentStyle={{ fontSize: '12px', padding: '8px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="url(#gradient)" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
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
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 sm:p-6 border-b-2 border-gray-200">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              <span>Sản phẩm bán chạy</span>
            </h3>
            <p className="text-gray-600 text-xs sm:text-sm mt-1">Top sản phẩm được yêu thích nhất</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-2 sm:space-y-3">
              {topProducts.slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 p-2 sm:p-3 rounded-lg sm:rounded-xl hover:bg-purple-50 transition-all duration-200 animate-fade-in-up border border-gray-100"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-white text-xs sm:text-sm flex-shrink-0 ${
                      idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                      idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                      idx === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400' :
                      'bg-gradient-to-br from-blue-400 to-purple-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className="font-semibold text-xs sm:text-sm text-gray-900 truncate">{item.name}</span>
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-green-600 bg-green-50 px-2 sm:px-3 py-1 rounded-lg whitespace-nowrap self-start sm:self-auto">{item.sold} bán</span>
                </div>
              ))}
              {topProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="flex justify-center mb-2">
                    <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
                  </div>
                  <p className="text-sm sm:text-base">Không có dữ liệu</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Đánh giá khách hàng */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 sm:p-6 border-b-2 border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                  <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                  <span>Đánh giá khách hàng</span>
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm mt-1">
                  {totalReviews > 0 ? (
                    <>
                      {totalReviews} đánh giá • Trung bình: <span className="font-bold text-yellow-600">{averageRating}/5</span>
                    </>
                  ) : (
                    "Phân phối điểm đánh giá"
                  )}
                </p>
              </div>
              {totalReviews > 0 && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 sm:w-5 sm:h-5 ${
                        star <= Math.round(averageRating)
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {totalReviews > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {ratingDistribution.map((item, idx) => (
                  <div key={item.stars} className="flex items-center gap-2 sm:gap-3 animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="flex items-center gap-1 sm:gap-2 w-16 sm:w-20 flex-shrink-0">
                      <span className="font-bold text-xs sm:text-sm text-yellow-600">{item.stars}</span>
                      <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div className="flex-1 bg-gray-200 h-3 sm:h-4 rounded-full overflow-hidden min-w-0 relative">
                      <div
                        className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-gray-700 font-bold text-xs sm:text-sm whitespace-nowrap">{item.percent}%</span>
                      <span className="text-gray-500 text-xs">({item.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="flex justify-center mb-2">
                  <Star className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300" />
                </div>
                <p className="text-sm sm:text-base font-medium">Chưa có đánh giá nào</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Đánh giá từ khách hàng sẽ hiển thị ở đây</p>
              </div>
            )}
          </div>
        </div>

        {/* Lượt truy cập 7 ngày */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 sm:p-6 border-b-2 border-gray-200">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <span>Lượt truy cập 7 ngày</span>
            </h3>
            <p className="text-gray-600 text-xs sm:text-sm mt-1">Số lượt xem sản phẩm</p>
          </div>
          <div className="p-3 sm:p-4 md:p-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={viewsData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis 
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                  width={50}
                />
                <Tooltip 
                  formatter={(v: number) => v.toLocaleString("vi-VN")}
                  contentStyle={{ fontSize: '12px', padding: '8px' }}
                />
                <Bar dataKey="views" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
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
