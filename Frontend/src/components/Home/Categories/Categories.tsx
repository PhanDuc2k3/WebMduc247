import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shirt,
  Wind,
  Briefcase,
  Watch,
  ShoppingBag,
  Footprints,
  Grid3X3,
  Crown,
} from "lucide-react";
import productApi from "../../../api/productApi";

interface Category {
  name: string;
  icon: React.ElementType;
  key: string;
  color: string;
  borderColor: string;
  count?: number;
  imageUrl?: string;
  bgColor: string;
}

const baseCategories: Category[] = [
  { name: "T-Shirt", icon: Shirt, key: "T-Shirt", color: "text-blue-600", borderColor: "border-blue-200", bgColor: "bg-blue-50" },
  { name: "Jacket", icon: Wind, key: "Jacket", color: "text-gray-600", borderColor: "border-gray-200", bgColor: "bg-gray-50" },
  { name: "Shirt", icon: Briefcase, key: "Shirt", color: "text-green-600", borderColor: "border-green-200", bgColor: "bg-green-50" },
  { name: "Jeans", icon: Shirt, key: "Jeans", color: "text-indigo-600", borderColor: "border-indigo-200", bgColor: "bg-indigo-50" },
  { name: "Bag", icon: ShoppingBag, key: "Bag", color: "text-amber-600", borderColor: "border-amber-200", bgColor: "bg-amber-50" },
  { name: "Shoes", icon: Footprints, key: "Shoes", color: "text-red-600", borderColor: "border-red-200", bgColor: "bg-red-50" },
  { name: "Watches", icon: Watch, key: "Watches", color: "text-purple-600", borderColor: "border-purple-200", bgColor: "bg-purple-50" },
  { name: "Cap", icon: Crown, key: "Cap", color: "text-pink-600", borderColor: "border-pink-200", bgColor: "bg-pink-50" },
];

const Categories: React.FC = () => {
  const navigate = useNavigate();
  const [categories] = useState<Category[]>(baseCategories);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await productApi.getProductCountByCategory();
        const countData = res.data || [];
        const stored = localStorage.getItem("categoryCounts");
        if (!stored) {
          localStorage.setItem("categoryCounts", JSON.stringify(countData));
        }
      } catch (error) {
        console.error("Lỗi tải số lượng:", error);
      }
    };
    fetchCounts();
  }, []);

  const handleCategoryClick = (key: string) => {
    setActiveCategory(key === activeCategory ? null : key);
    navigate(`/products?category=${encodeURIComponent(key)}`);
  };

  return (
    <section className="mt-4 sm:mt-6 lg:mt-8">
      {/* Categories Container - White Card with Shadow */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4 md:p-5">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-800">
            Danh mục sản phẩm
          </h2>
          <button
            onClick={() => navigate("/products")}
            className="text-xs sm:text-sm text-[#4B5563] hover:text-[#374151] font-medium transition-colors flex items-center gap-1"
          >
            Xem tất cả →
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-9 gap-2 sm:gap-3 md:gap-4 justify-items-center">
          {/* All Category Button - Featured First */}
          <button
            onClick={() => {
              setActiveCategory(null);
              navigate("/products");
            }}
            className="flex flex-col items-center justify-center group cursor-pointer transition-all duration-300"
          >
            {/* Circular Icon Container - Featured Style */}
            <div
              className={`
                w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 lg:w-20 lg:h-20
                rounded-full
                flex items-center justify-center
                transition-all duration-300
                transform hover:scale-110 active:scale-95
                ${!activeCategory
                  ? "bg-gradient-to-br from-[#4B5563] to-[#374151] text-white shadow-lg ring-4 ring-[#4B5563]/20"
                  : "bg-[#E5E9EC] text-[#4B5563] shadow-md hover:shadow-xl"
                }
              `}
            >
              <Grid3X3 size={22} className="sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9" />
            </div>
            <span
              className={`
                mt-2 sm:mt-2.5 text-[10px] sm:text-xs font-medium
                text-center leading-tight
                transition-colors duration-300
                max-w-[60px] sm:max-w-[70px]
                ${!activeCategory
                  ? "text-[#4B5563] font-semibold"
                  : "text-[#4B5563]/70 group-hover:text-[#4B5563]"
                }
              `}
            >
              All Category
            </span>
          </button>

          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={idx}
                onClick={() => handleCategoryClick(cat.key)}
                className="flex flex-col items-center justify-center group cursor-pointer transition-all duration-300"
              >
                {/* Circular Icon Container */}
                <div
                  className={`
                    w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 lg:w-20 lg:h-20
                    rounded-full
                    flex items-center justify-center
                    transition-all duration-300
                    transform hover:scale-110 active:scale-95
                    ${isActive
                      ? "bg-gradient-to-br from-[#4B5563] to-[#374151] text-white shadow-lg ring-4 ring-[#4B5563]/20"
                      : `${cat.bgColor} text-[#4B5563] shadow-md hover:shadow-xl`
                    }
                  `}
                >
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <Icon size={22} className="sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9" />
                  )}
                </div>

                {/* Category Name */}
                <span
                  className={`
                    mt-2 sm:mt-2.5 text-[10px] sm:text-xs font-medium
                    text-center leading-tight
                    transition-colors duration-300
                    max-w-[60px] sm:max-w-[70px]
                    ${isActive
                      ? "text-[#4B5563] font-semibold"
                      : "text-[#4B5563]/70 group-hover:text-[#4B5563]"
                    }
                  `}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Categories;
