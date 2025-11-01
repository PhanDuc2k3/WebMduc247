import React from "react";
import type { FormDataType } from "../../../../types/product";

interface Props {
  formData: FormDataType;
  handleChange: (field: keyof FormDataType, value: any) => void;
  onClose: () => void;
  setStep: React.Dispatch<React.SetStateAction<number>>;
}

const Step1BasicInfo: React.FC<Props> = ({ formData, handleChange, setStep }) => {
  return (
    <div className="animate-fade-in-up">
      <h2 className="text-2xl font-bold mb-6 gradient-text flex items-center gap-2">
        <span>📋</span> Thông tin cơ bản
      </h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Tên sản phẩm <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
            placeholder="Nhập tên sản phẩm..."
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <span>🏷️</span> Thương hiệu
            </label>
            <input
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
              value={formData.brand}
              placeholder="VD: Apple, Samsung..."
              onChange={(e) => handleChange("brand", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <span>📱</span> Model
            </label>
            <input
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
              value={formData.model}
              placeholder="VD: iPhone 15 Pro Max"
              onChange={(e) => handleChange("model", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <span>📂</span> Danh mục
            </label>
            <input
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
              placeholder="VD: Điện thoại"
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <span>🔖</span> Danh mục con
            </label>
            <input
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
              placeholder="VD: Smartphone"
              value={formData.subCategory}
              onChange={(e) => handleChange("subCategory", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <span>💰</span> Giá bán <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
              placeholder="VD: 15000000"
              value={formData.price}
              onChange={(e) => handleChange("price", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <span>🏷️</span> Giá giảm giá (nếu có)
            </label>
            <input
              type="number"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
              placeholder="VD: 12000000"
              value={formData.originalPrice}
              onChange={(e) => handleChange("originalPrice", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <span>📝</span> Mô tả sản phẩm
          </label>
          <textarea
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium resize-none"
            placeholder="Mô tả ngắn gọn về sản phẩm..."
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
          ></textarea>
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <button
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
          onClick={() => setStep(2)}
        >
          Tiếp tục <span>➡️</span>
        </button>
      </div>
    </div>
  );
};

export default Step1BasicInfo;
