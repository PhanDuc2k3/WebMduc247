import React, { useRef } from "react";
import {
  Smartphone,
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

const categories = [
  { name: "Điện thoại", icon: Smartphone, count: "12k+ sản phẩm", color: "bg-blue-100" },
  { name: "Thời trang", icon: Shirt, count: "25k+ sản phẩm", color: "bg-pink-100" },
  { name: "Laptop", icon: Laptop, count: "8k+ sản phẩm", color: "bg-purple-100" },
  { name: "Làm đẹp", icon: Heart, count: "15k+ sản phẩm", color: "bg-yellow-100" },
  { name: "Thể thao", icon: Dumbbell, count: "18k+ sản phẩm", color: "bg-green-100" },
  { name: "Nhà cửa", icon: Home, count: "10k+ sản phẩm", color: "bg-orange-100" },
  { name: "Mẹ & Bé", icon: Baby, count: "7k+ sản phẩm", color: "bg-red-100" },
  { name: "Ô tô", icon: Car, count: "5k+ sản phẩm", color: "bg-gray-200" },
  { name: "Máy ảnh", icon: Camera, count: "4k+ sản phẩm", color: "bg-indigo-100" },
  { name: "Tivi", icon: Tv, count: "6k+ sản phẩm", color: "bg-teal-100" },
  { name: "Đồng hồ", icon: Watch, count: "9k+ sản phẩm", color: "bg-lime-100" },
  { name: "Đồ chơi", icon: Gamepad2, count: "11k+ sản phẩm", color: "bg-rose-100" },
];

const Categories: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: dir === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="p-6 bg-gray-50 mt-10 rounded-lg">
      {/* Tiêu đề giống FeaturedProducts */}
      <h3 className="text-[22px] font-bold mb-1 text-gray-900">Danh mục nổi bật</h3>
      <p className="text-sm text-gray-600 mb-4">Khám phá các danh mục sản phẩm phổ biến</p>

      <div className="relative">
        {/* Nút trái */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 
                     w-12 h-12 flex items-center justify-center
                     rounded-full bg-white/70 backdrop-blur
                     shadow-md hover:bg-white hover:scale-105
                     transition-all duration-200"
        >
          <ChevronLeft size={24} className="text-gray-700" />
        </button>

        {/* Slider danh mục */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scroll-smooth px-2 py-2 no-scrollbar"
        >
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div
                key={idx}
                className={`flex flex-col items-center justify-center text-center rounded-xl 
                            shadow-sm hover:shadow-md transition-shadow
                            p-6 min-w-[150px] cursor-pointer ${cat.color}`}
              >
                <div className="mb-2">
                  <Icon size={36} className="text-gray-800" />
                </div>
                <div className="font-semibold text-gray-900">{cat.name}</div>
                <div className="text-sm text-gray-600">{cat.count}</div>
              </div>
            );
          })}
        </div>

        {/* Nút phải */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 
                     w-12 h-12 flex items-center justify-center
                     rounded-full bg-white/70 backdrop-blur
                     shadow-md hover:bg-white hover:scale-105
                     transition-all duration-200"
        >
          <ChevronRight size={24} className="text-gray-700" />
        </button>
      </div>
    </section>
  );
};

export default Categories;
