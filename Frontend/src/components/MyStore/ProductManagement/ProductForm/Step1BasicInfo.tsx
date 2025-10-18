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
    <div>
      <h2 className="text-xl font-bold mb-4">Thông tin cơ bản</h2>
      <div className="mb-4">
        <label className="text-sm font-medium">Tên sản phẩm</label>
        <input
          className="w-full border rounded px-3 py-2 mt-1"
          placeholder="Nhập tên sản phẩm..."
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium">Thương hiệu</label>
          <input
            className="w-full border rounded px-3 py-2 mt-1"
            value={formData.brand}
            placeholder="VD: Apple, Samsung..."
            onChange={(e) => handleChange("brand", e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Model</label>
          <input
            className="w-full border rounded px-3 py-2 mt-1"
            value={formData.model}
            placeholder="VD: iPhone 15 Pro Max"
            onChange={(e) => handleChange("model", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium">Danh mục</label>
          <input
            className="w-full border rounded px-3 py-2 mt-1"
            placeholder="VD: Điện thoại"
            value={formData.category}
            onChange={(e) => handleChange("category", e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Danh mục con</label>
          <input
            className="w-full border rounded px-3 py-2 mt-1"
            placeholder="VD: Smartphone"
            value={formData.subCategory}
            onChange={(e) => handleChange("subCategory", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium">Giá bán</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 mt-1"
            placeholder="VD: 15000000"
            value={formData.price}
            onChange={(e) => handleChange("price", e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Giá giảm giá (nếu có)</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 mt-1"
            placeholder="VD: 12000000"
            value={formData.originalPrice}
            onChange={(e) => handleChange("originalPrice", e.target.value)}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium">Mô tả sản phẩm</label>
        <textarea
          className="w-full border rounded px-3 py-2 mt-1"
          placeholder="Mô tả ngắn gọn..."
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
        ></textarea>
      </div>

      <div className="flex justify-end mt-6">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded font-medium"
          onClick={() => setStep(2)}
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
};

export default Step1BasicInfo;
