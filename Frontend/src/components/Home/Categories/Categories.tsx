import React, { useEffect, useRef, useState } from "react";
import {
  Smartphone,
  Book,        
  Shirt,
  Laptop,
  Heart,
  Dumbbell,
  Home,
  Baby,
  Car,
  Camera,
  Tv,
  Watch,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import productApi from "../../../api/productApi";

const baseCategories = [
  { name: "Điện thoại", icon: Smartphone, key: "Điện thoại", color: "bg-blue-100", count: "" },
  { name: "Sách", icon: Book, key: "Sách", color: "bg-amber-100", count: "" }, // ✅ thêm mục Sách ở đây
  { name: "Thời trang", icon: Shirt, key: "Thời trang", color: "bg-pink-100", count: "" },
  { name: "Laptop", icon: Laptop, key: "Laptop", color: "bg-purple-100", count: "" },
  { name: "Làm đẹp", icon: Heart, key: "Làm đẹp", color: "bg-yellow-100", count: "" },
  { name: "Thể thao", icon: Dumbbell, key: "Thể thao", color: "bg-green-100", count: "" },
  { name: "Nhà cửa", icon: Home, key: "Nhà cửa", color: "bg-orange-100", count: "" },
  { name: "Mẹ & Bé", icon: Baby, key: "Mẹ & Bé", color: "bg-red-100", count: "" },
  { name: "Ô tô", icon: Car, key: "Ô tô", color: "bg-gray-200", count: "" },
  { name: "Máy ảnh", icon: Camera, key: "Máy ảnh", color: "bg-indigo-100", count: "" },
  { name: "Tivi", icon: Tv, key: "Tivi", color: "bg-teal-100", count: "" },
  { name: "Đồng hồ", icon: Watch, key: "Đồng hồ", color: "bg-lime-100", count: "" },
  { name: "Đồ chơi", icon: Gamepad2, key: "Đồ chơi", color: "bg-rose-100", count: "" },
];

const Categories: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState(baseCategories);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await productApi.getProductCountByCategory();
        const countData = res.data || [];

        const updated = baseCategories.map((cat) => {
          const found = countData.find((c: any) => c.category === cat.key);
          return {
            ...cat,
            count: found ? `${found.count} sản phẩm` : "0 sản phẩm",
          };
        });
        setCategories(updated);
      } catch (error) {
        console.error("❌ Lỗi tải số lượng:", error);
      }
    };
    fetchCounts();
  }, []);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  return (
    <section className="p-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 mt-10 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="mb-6 animate-fade-in-down">
        <h3 className="text-[24px] lg:text-[28px] font-bold mb-2 text-gray-900 gradient-text">
          🛍️ Danh mục nổi bật
        </h3>
        <p className="text-sm text-gray-600">Khám phá các danh mục sản phẩm phổ biến</p>
      </div>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 
                     w-12 h-12 flex items-center justify-center
                     rounded-full bg-white/90 backdrop-blur-md glass-effect
                     shadow-lg hover:bg-white hover:scale-110 hover:shadow-xl
                     transition-all duration-300 group"
          aria-label="Scroll left"
        >
          <ChevronLeft size={24} className="text-gray-700 group-hover:text-blue-600 transition-colors" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth px-3 py-4 no-scrollbar"
        >
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div
                key={idx}
                className={`flex flex-col items-center justify-center text-center rounded-2xl 
                            shadow-md hover:shadow-xl transition-all duration-300
                            p-6 min-w-[150px] cursor-pointer transform hover:-translate-y-2
                            ${cat.color} group animate-scale-in`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="mb-3 transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                  <Icon size={40} className="text-gray-800 group-hover:text-blue-600 transition-colors duration-300" />
                </div>
                <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                  {cat.name}
                </div>
                <div className="text-xs text-gray-600 mt-1 group-hover:text-gray-800 transition-colors duration-300">
                  {cat.count}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 
                     w-12 h-12 flex items-center justify-center
                     rounded-full bg-white/90 backdrop-blur-md glass-effect
                     shadow-lg hover:bg-white hover:scale-110 hover:shadow-xl
                     transition-all duration-300 group"
          aria-label="Scroll right"
        >
          <ChevronRight size={24} className="text-gray-700 group-hover:text-blue-600 transition-colors" />
        </button>
      </div>
    </section>
  );
};

export default Categories;
