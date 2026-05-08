// Step3Details.tsx
import React from "react";
import { Plus, Trash2, ChevronLeft, CheckCircle, Save } from "lucide-react";
import type { FormDataType, VariationOption } from "../../../../types/product";

interface Props {
  formData: FormDataType;
  handleChange: (field: keyof FormDataType, value: any) => void;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  handleSubmit: (e?: React.FormEvent) => void | Promise<void>;
  isEdit?: boolean;
}

const Step3Details: React.FC<Props> = ({ formData, handleChange, setStep, handleSubmit, isEdit = false }) => {
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
    <div className="animate-fade-in-up">
      <h2 className="text-2xl font-bold mb-6 gradient-text flex items-center gap-2">
        Chi tiết & Biến thể
      </h2>

      {/* 🔹 Biến thể sản phẩm */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <label className="text-lg font-bold text-gray-700 flex items-center gap-2">
            Biến thể sản phẩm
          </label>
          <button
            onClick={addVariation}
            type="button"
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Thêm biến thể
          </button>
        </div>

        {formData.variations.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
            <p className="text-gray-600 font-medium">Chưa có biến thể nào</p>
            <p className="text-sm text-gray-400 mt-2">Nhấn "Thêm biến thể" để bắt đầu</p>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.variations.map((v, i) => (
              <div
                key={i}
                className="bg-[#2F5EE9]/10 border-2 border-[#2F5EE9]/30 rounded-xl p-6 shadow-lg animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {/* 🔸 Tên màu */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Loại sản phẩm:
                    </label>
                    <input
                      placeholder="VD: Màu sắc, chất liệu, kích thước..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2F5EE9] focus:border-transparent transition-all duration-300 font-medium"
                      value={v.color}
                      onChange={(e) => updateVariationColor(i, e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => removeVariation(i)}
                    type="button"
                    className="ml-4 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" /> Xóa
                  </button>
                </div>

                {/* 🔸 Danh sách tùy chọn */}
                {v.options.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-xl bg-white/50 mb-4">
                    <p className="text-gray-500 text-sm">Chưa có tùy chọn nào</p>
                  </div>
                ) : (
                  <div className="space-y-3 mb-4">
                    {v.options.map((opt, j) => (
                      <div
                        key={j}
                        className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-md"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">
                              Tên tùy chọn
                            </label>
                            <input
                              placeholder="VD: 128GB, XL, 500g"
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F5EE9] focus:border-transparent transition-all duration-300 font-medium text-sm"
                              value={opt.name}
                              onChange={(e) =>
                                updateOption(i, j, "name", e.target.value)
                              }
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">
                              Giá cộng thêm
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F5EE9] focus:border-transparent transition-all duration-300 font-medium text-sm"
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
                            <label className="block text-xs font-bold text-gray-700 mb-2">
                              Số lượng tồn
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F5EE9] focus:border-transparent transition-all duration-300 font-medium text-sm"
                              value={opt.stock}
                              onChange={(e) =>
                                updateOption(i, j, "stock", Number(e.target.value))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => addOption(i)}
                  className="bg-[#2F5EE9] text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2 text-sm hover:bg-[#374151]"
                >
                  <Plus className="w-4 h-4" /> Thêm tùy chọn
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Success Message */}
      <div className="mt-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
        <p className="text-green-700 font-medium flex items-center gap-2">
          <CheckCircle className="w-5 h-5" /> Bạn đã hoàn thành tất cả các bước! Nhấn nút bên dưới để {isEdit ? "cập nhật" : "tạo"} sản phẩm.
        </p>
      </div>

      {/* 🔹 Nút điều hướng */}
      <div className="flex justify-between mt-8">
        <button
          type="button"
          className="bg-gradient-to-r from-gray-400 to-gray-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
          onClick={() => setStep(2)}
        >
          <ChevronLeft className="w-5 h-5" /> Quay lại
        </button>
        <button
          type="button"
          className={`${
            isEdit
              ? "bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700"
              : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          } text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2`}
          onClick={handleSubmit}
        >
          {isEdit ? (
            <>
              <Save className="w-5 h-5" /> Cập nhật sản phẩm
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" /> Tạo sản phẩm
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Step3Details;
