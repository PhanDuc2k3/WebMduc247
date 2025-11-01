import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown } from "lucide-react";

interface ProductFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

const ProductFilters: React.FC<ProductFiltersProps> = ({
  searchTerm,
  setSearchTerm,
}) => {
  const [ratingOpen, setRatingOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const [rating, setRating] = useState("Đánh giá cao nhất");
  const [region, setRegion] = useState("Tất cả khu vực");
  const [category, setCategory] = useState("Tất cả ngành hàng");

  const ratingRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  const ratingOptions = ["Đánh giá cao nhất", "Đánh giá trung bình", "Mới nhất", "Cũ nhất"];
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

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-lg border border-gray-200">
      <div className="flex flex-wrap gap-4">
        {/* Ô tìm kiếm */}
        <div className="flex items-center flex-1 min-w-[250px] bg-white border-2 border-gray-200 rounded-xl px-4 py-3 shadow-sm hover:border-blue-400 focus-within:border-blue-500 focus-within:shadow-md transition-all duration-300">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full outline-none text-sm placeholder-gray-400 text-gray-700"
          />
        </div>

        {/* Bộ lọc đánh giá */}
        <div className="relative flex-1 min-w-[200px] max-w-[250px]" ref={ratingRef}>
          <button
            onClick={() => {
              setRatingOpen(!ratingOpen);
              setRegionOpen(false);
              setCategoryOpen(false);
            }}
            className="w-full flex justify-between items-center border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-sm text-gray-700 hover:border-blue-400 hover:shadow-md focus:outline-none transition-all duration-300 shadow-sm"
          >
            <span className="font-medium">⭐ {rating}</span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${ratingOpen ? "rotate-180 text-blue-500" : ""}`}
            />
          </button>
          {ratingOpen && (
            <div className="absolute z-20 mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-xl overflow-hidden animate-fade-in">
              {ratingOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    setRating(opt);
                    setRatingOpen(false);
                  }}
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-600 cursor-pointer transition-all duration-200 font-medium"
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bộ lọc khu vực */}
        <div className="relative flex-1 min-w-[200px] max-w-[250px]" ref={regionRef}>
          <button
            onClick={() => {
              setRegionOpen(!regionOpen);
              setRatingOpen(false);
              setCategoryOpen(false);
            }}
            className="w-full flex justify-between items-center border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-sm text-gray-700 hover:border-blue-400 hover:shadow-md focus:outline-none transition-all duration-300 shadow-sm"
          >
            <span className="font-medium">📍 {region}</span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${regionOpen ? "rotate-180 text-blue-500" : ""}`}
            />
          </button>
          {regionOpen && (
            <div className="absolute z-20 mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-xl overflow-hidden animate-fade-in">
              {regionOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    setRegion(opt);
                    setRegionOpen(false);
                  }}
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-600 cursor-pointer transition-all duration-200 font-medium"
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bộ lọc ngành hàng */}
        <div className="relative flex-1 min-w-[200px] max-w-[250px]" ref={categoryRef}>
          <button
            onClick={() => {
              setCategoryOpen(!categoryOpen);
              setRegionOpen(false);
              setRatingOpen(false);
            }}
            className="w-full flex justify-between items-center border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-sm text-gray-700 hover:border-blue-400 hover:shadow-md focus:outline-none transition-all duration-300 shadow-sm"
          >
            <span className="font-medium">🏷️ {category}</span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${categoryOpen ? "rotate-180 text-blue-500" : ""}`}
            />
          </button>
          {categoryOpen && (
            <div className="absolute z-20 mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-xl overflow-hidden animate-fade-in max-h-60 overflow-y-auto custom-scrollbar">
              {categoryOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    setCategory(opt);
                    setCategoryOpen(false);
                  }}
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-600 cursor-pointer transition-all duration-200 font-medium"
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

export default ProductFilters;
