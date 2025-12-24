import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Star, MapPin, Tag } from "lucide-react";

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
        {/* Bộ lọc đánh giá */}
        <div className="relative flex-1 min-w-[200px] max-w-[250px]" ref={ratingRef}>
          <button
            onClick={() => {
              setRatingOpen(!ratingOpen);
              setRegionOpen(false);
              setCategoryOpen(false);
            }}
            className="w-full flex justify-between items-center border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-sm text-gray-700 hover:border-[#2F5FEB] hover:shadow-md focus:outline-none transition-all duration-300 shadow-sm"
          >
            <span className="font-medium flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span>{rating}</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${ratingOpen ? "rotate-180 text-[#2F5FEB]" : ""}`}
            />
          </button>
          {ratingOpen && (
            <div className="absolute z-[9999] mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-xl overflow-hidden animate-fade-in">
              {ratingOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    setRating(opt);
                    setRatingOpen(false);
                  }}
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-[#2F5FEB]/10 hover:text-[#2F5FEB] cursor-pointer transition-all duration-200 font-medium"
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
            className="w-full flex justify-between items-center border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-sm text-gray-700 hover:border-[#2F5FEB] hover:shadow-md focus:outline-none transition-all duration-300 shadow-sm"
          >
            <span className="font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" />
              <span>{region}</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${regionOpen ? "rotate-180 text-[#2F5FEB]" : ""}`}
            />
          </button>
          {regionOpen && (
            <div className="absolute z-[9999] mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-xl overflow-hidden animate-fade-in">
              {regionOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    setRegion(opt);
                    setRegionOpen(false);
                  }}
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-[#2F5FEB]/10 hover:text-[#2F5FEB] cursor-pointer transition-all duration-200 font-medium"
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
            className="w-full flex justify-between items-center border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-sm text-gray-700 hover:border-[#2F5FEB] hover:shadow-md focus:outline-none transition-all duration-300 shadow-sm"
          >
            <span className="font-medium flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#2F5FEB]" />
              <span>{category}</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${categoryOpen ? "rotate-180 text-[#2F5FEB]" : ""}`}
            />
          </button>
          {categoryOpen && (
            <div className="absolute z-[9999] mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-xl overflow-hidden animate-fade-in max-h-60 overflow-y-auto custom-scrollbar">
              {categoryOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    setCategory(opt);
                    setCategoryOpen(false);
                  }}
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-[#2F5FEB]/10 hover:text-[#2F5FEB] cursor-pointer transition-all duration-200 font-medium"
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
