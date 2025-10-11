// Step3Details.tsx
import React from "react";
import type { FormDataType, VariationOption } from "../../../../types/product";

interface Props {
  formData: FormDataType;
  handleChange: (field: keyof FormDataType, value: any) => void;
  setStep: React.Dispatch<React.SetStateAction<number>>;
}

const Step3Details: React.FC<Props> = ({ formData, handleChange, setStep }) => {
  const addVariation = () => {
    handleChange("variations", [
      ...formData.variations,
      { color: "", options: [] },
    ]);
  };

  const updateVariationColor = (index: number, color: string) => {
    const newVariations = [...formData.variations];
    newVariations[index].color = color;
    handleChange("variations", newVariations);
  };

  const addOption = (index: number) => {
    const newVariations = [...formData.variations];
    newVariations[index].options.push({
      name: "",
      additionalPrice: 0,
      stock: 0,
    });
    handleChange("variations", newVariations);
  };

  const updateOption = (
    varIndex: number,
    optIndex: number,
    field: keyof VariationOption,
    value: string | number
  ) => {
    const newVariations = [...formData.variations];
    (newVariations[varIndex].options[optIndex][field] as any) = value;
    handleChange("variations", newVariations);
  };

  const removeVariation = (index: number) => {
    const newVariations = formData.variations.filter((_, i) => i !== index);
    handleChange("variations", newVariations);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Chi tiết & Biến thể</h2>

      {/* 🔹 Tính năng nổi bật */}
      <div className="mb-4">
        <label className="text-sm font-medium block mb-1">
          Tính năng nổi bật
        </label>
        <textarea
          className="w-full border rounded px-3 py-2 mt-1"
          placeholder="Liệt kê các tính năng nổi bật của sản phẩm..."
          value={formData.features.join("\n")}
          onChange={(e) => handleChange("features", e.target.value.split("\n"))}
        />
      </div>

      {/* 🔹 Biến thể sản phẩm */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-medium">Biến thể sản phẩm</label>
          <button
            onClick={addVariation}
            type="button"
            className="bg-green-600 text-white px-3 py-1 rounded text-sm"
          >
            + Thêm màu
          </button>
        </div>

        {formData.variations.map((v, i) => (
          <div key={i} className="border rounded p-3 mb-4">
            {/* 🔸 Tên màu */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex-1">
                <label className="text-sm font-medium block mb-1">
                  Tên màu
                </label>
                <input
                  placeholder="VD: Đỏ, Xanh, Đen..."
                  className="border px-2 py-1 rounded w-full"
                  value={v.color}
                  onChange={(e) => updateVariationColor(i, e.target.value)}
                />
              </div>
              <button
                onClick={() => removeVariation(i)}
                type="button"
                className="text-red-500 text-sm hover:underline ml-3"
              >
                Xóa màu
              </button>
            </div>

            {/* 🔸 Danh sách tùy chọn */}
            {v.options.map((opt, j) => (
              <div
                key={j}
                className="grid grid-cols-3 gap-3 border-t pt-3 mt-2"
              >
                <div>
                  <label className="text-xs font-medium block mb-1">
                    Tên tùy chọn
                  </label>
                  <input
                    placeholder="VD: 128GB, XL, 500g"
                    className="border rounded px-2 py-1 w-full"
                    value={opt.name}
                    onChange={(e) =>
                      updateOption(i, j, "name", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1">
                    Giá cộng thêm
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    className="border rounded px-2 py-1 w-full"
                    value={opt.additionalPrice}
                    onChange={(e) =>
                      updateOption(
                        i,
                        j,
                        "additionalPrice",
                        Number(e.target.value)
                      )
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1">
                    Số lượng tồn
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    className="border rounded px-2 py-1 w-full"
                    value={opt.stock}
                    onChange={(e) =>
                      updateOption(i, j, "stock", Number(e.target.value))
                    }
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addOption(i)}
              className="bg-blue-600 text-white text-xs px-3 py-1 rounded mt-3"
            >
              + Thêm tùy chọn
            </button>
          </div>
        ))}
      </div>

      {/* 🔹 Nút điều hướng */}
      <div className="flex justify-between mt-6">
        <button
          type="button"
          className="bg-gray-100 px-4 py-2 rounded font-medium"
          onClick={() => setStep(2)}
        >
          ⬅ Quay lại
        </button>
        <button
          type="button"
          className="bg-blue-600 text-white px-4 py-2 rounded font-medium"
          onClick={() => setStep(4)}
        >
          Tiếp tục ➡
        </button>
      </div>
    </div>
  );
};

export default Step3Details;
