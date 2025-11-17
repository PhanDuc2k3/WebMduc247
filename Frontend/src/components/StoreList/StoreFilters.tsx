import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Star, MapPin, Tag } from "lucide-react";

interface StoreFiltersProps {
  onFilterChange: (filters: {
    rating: string;
    region: string;
    category: string;
  }) => void;
}

const StoreFilters: React.FC<StoreFiltersProps> = ({ onFilterChange }) => {
  const [ratingOpen, setRatingOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const [rating, setRating] = useState("Đánh giá cao nhất");
  const [region, setRegion] = useState("Tất cả khu vực");
  const [category, setCategory] = useState("Tất cả ngành hàng");

  const ratingRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  const ratingOptions = ["Đánh giá cao nhất", "Đánh giá trung bình"];
  const regionOptions = ["Tất cả khu vực", "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Cần Thơ", "Huế"];
  const categoryOptions = [
    "Tất cả ngành hàng",
    "Điện tử",
    "Thời trang",
    "Hoa quả",
    "Thực phẩm",
    "Gia dụng",
    "Mỹ phẩm",
    "Sách",
    "Đồ chơi",
    "Khác",
  ];

  // ✅ Tự đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ratingRef.current && !ratingRef.current.contains(e.target as Node)) setRatingOpen(false);
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) setRegionOpen(false);
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Gọi onFilterChange khi filter thay đổi
  useEffect(() => {
    onFilterChange({ rating, region, category });
  }, [rating, region, category, onFilterChange]);

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-3 md:p-4 lg:p-6 rounded-xl md:rounded-2xl shadow-lg border border-gray-200">
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3 lg:gap-4">
        {/* Bộ lọc đánh giá */}
        <div 
          ref={ratingRef} 
          className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-[250px]"
          style={{ zIndex: ratingOpen ? 101 : 50 }}
        >
          <button
            onClick={() => {
              setRatingOpen(!ratingOpen);
              setRegionOpen(false);
              setCategoryOpen(false);
            }}
            className="w-full flex justify-between items-center border-2 border-gray-200 rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 bg-white text-xs md:text-sm text-gray-700 hover:border-blue-400 hover:shadow-md focus:outline-none transition-all duration-300 shadow-sm touch-manipulation"
          >
            <span className="font-medium truncate flex items-center gap-1.5 sm:gap-2">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              <span>{rating}</span>
            </span>
            <ChevronDown
              className={`w-3 h-3 md:w-4 md:h-4 text-gray-400 transition-transform duration-300 flex-shrink-0 ml-2 ${ratingOpen ? "rotate-180 text-blue-500" : ""}`}
            />
          </button>
          {ratingOpen && (
            <div 
              className="absolute top-full left-0 right-0 mt-2 w-full bg-white border-2 border-gray-200 rounded-lg md:rounded-xl shadow-2xl overflow-hidden"
              style={{ zIndex: 101 }}
            >
              {ratingOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    setRating(opt);
                    setRatingOpen(false);
                  }}
                  className="px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-600 cursor-pointer transition-all duration-200 font-medium"
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bộ lọc khu vực */}
        <div 
          ref={regionRef} 
          className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-[250px]"
          style={{ zIndex: regionOpen ? 101 : 50 }}
        >
          <button
            onClick={() => {
              setRegionOpen(!regionOpen);
              setRatingOpen(false);
              setCategoryOpen(false);
            }}
            className="w-full flex justify-between items-center border-2 border-gray-200 rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 bg-white text-xs md:text-sm text-gray-700 hover:border-blue-400 hover:shadow-md focus:outline-none transition-all duration-300 shadow-sm touch-manipulation"
          >
            <span className="font-medium truncate flex items-center gap-1.5 sm:gap-2">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 flex-shrink-0" />
              <span>{region}</span>
            </span>
            <ChevronDown
              className={`w-3 h-3 md:w-4 md:h-4 text-gray-400 transition-transform duration-300 flex-shrink-0 ml-2 ${regionOpen ? "rotate-180 text-blue-500" : ""}`}
            />
          </button>
          {regionOpen && (
            <div 
              className="absolute top-full left-0 right-0 mt-2 w-full bg-white border-2 border-gray-200 rounded-lg md:rounded-xl shadow-2xl overflow-hidden max-h-48 md:max-h-60 overflow-y-auto custom-scrollbar"
              style={{ zIndex: 101 }}
            >
              {regionOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    setRegion(opt);
                    setRegionOpen(false);
                  }}
                  className="px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-600 cursor-pointer transition-all duration-200 font-medium"
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bộ lọc ngành hàng */}
        <div 
          ref={categoryRef} 
          className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-[250px]"
          style={{ zIndex: categoryOpen ? 101 : 50 }}
        >
          <button
            onClick={() => {
              setCategoryOpen(!categoryOpen);
              setRegionOpen(false);
              setRatingOpen(false);
            }}
            className="w-full flex justify-between items-center border-2 border-gray-200 rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 bg-white text-xs md:text-sm text-gray-700 hover:border-blue-400 hover:shadow-md focus:outline-none transition-all duration-300 shadow-sm touch-manipulation"
          >
            <span className="font-medium truncate flex items-center gap-1.5 sm:gap-2">
              <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500 flex-shrink-0" />
              <span>{category}</span>
            </span>
            <ChevronDown
              className={`w-3 h-3 md:w-4 md:h-4 text-gray-400 transition-transform duration-300 flex-shrink-0 ml-2 ${categoryOpen ? "rotate-180 text-blue-500" : ""}`}
            />
          </button>
          {categoryOpen && (
            <div 
              className="absolute top-full left-0 right-0 mt-2 w-full bg-white border-2 border-gray-200 rounded-lg md:rounded-xl shadow-2xl overflow-hidden max-h-48 md:max-h-60 overflow-y-auto custom-scrollbar"
              style={{ zIndex: 101 }}
            >
              {categoryOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    setCategory(opt);
                    setCategoryOpen(false);
                  }}
                  className="px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-600 cursor-pointer transition-all duration-200 font-medium"
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreFilters;
