import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown } from "lucide-react";

const StoreFilters: React.FC = () => {
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
    <div className="flex flex-wrap justify-between gap-4 mb-6 p-6 border border-gray-300 rounded-lg bg-gray-50 shadow-sm">
      {/* Ô tìm kiếm */}
      <div className="flex items-center flex-1 min-w-[250px] border border-gray-300 rounded-md px-3 py-2.5 shadow-sm bg-white hover:border-gray-400 focus-within:border-gray-500 transition">
        <Search className="w-4 h-4 text-gray-500 mr-2" />
        <input
          type="text"
          placeholder="Tìm kiếm cửa hàng..."
          className="w-full outline-none text-sm placeholder-gray-500"
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
          className="w-full flex justify-between items-center border border-gray-300 rounded-md px-4 py-2.5 bg-white text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:border-gray-500 transition"
        >
          {rating}
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${ratingOpen ? "rotate-180" : ""}`}
          />
        </button>
        {ratingOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-md overflow-hidden animate-fadeIn">
            {ratingOptions.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  setRating(opt);
                  setRatingOpen(false);
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
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
          className="w-full flex justify-between items-center border border-gray-300 rounded-md px-4 py-2.5 bg-white text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:border-gray-500 transition"
        >
          {region}
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${regionOpen ? "rotate-180" : ""}`}
          />
        </button>
        {regionOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-md overflow-hidden animate-fadeIn">
            {regionOptions.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  setRegion(opt);
                  setRegionOpen(false);
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
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
          className="w-full flex justify-between items-center border border-gray-300 rounded-md px-4 py-2.5 bg-white text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:border-gray-500 transition"
        >
          {category}
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${categoryOpen ? "rotate-180" : ""}`}
          />
        </button>
        {categoryOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-md overflow-hidden animate-fadeIn max-h-60 overflow-y-auto">
            {categoryOptions.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  setCategory(opt);
                  setCategoryOpen(false);
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                {opt}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreFilters;
