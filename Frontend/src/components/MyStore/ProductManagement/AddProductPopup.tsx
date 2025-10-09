import React, { useState } from "react";
import type { ProductType, FormDataType, VariationOption } from "../../../types/product";

interface AddProductPopupProps {
  onClose: () => void;
  onAddProduct: (newProduct: ProductType) => void;
}

const AddProductPopup: React.FC<AddProductPopupProps> = ({ onClose, onAddProduct }) => {
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState<FormDataType>({
    name: "",
    brand: "",
    category: "",
    subCategory: "",
    price: "",
    originalPrice: "",
    model: "",
    description: "",
    features: [],
    specifications: [],
    seoTitle: "",
    seoDescription: "",
    tags: [],
    mainImage: null,
    mainImagePreview: null,
    subImages: [],
    subImagesPreview: [],
    variations: [], // ✅ thêm variations
  });

  const [featureInput, setFeatureInput] = useState("");

  const handleChange = (field: keyof FormDataType, value: any) => {
    setFormData((prev: FormDataType) => ({ ...prev, [field]: value }));
  };

  const handleMainImageChange = (file: File | null) => {
    if (file) {
      if (formData.mainImagePreview) URL.revokeObjectURL(formData.mainImagePreview);
      const preview = URL.createObjectURL(file);
      setFormData((prev: FormDataType) => ({
        ...prev,
        mainImage: file,
        mainImagePreview: preview,
      }));
    }
  };

  const handleSubImagesChange = (newFiles: File[]) => {
    const mergedFiles = [...formData.subImages, ...newFiles].slice(0, 8);

    formData.subImagesPreview.forEach(url => URL.revokeObjectURL(url));

    const previews = mergedFiles.map(f => URL.createObjectURL(f));

    setFormData((prev: FormDataType) => ({
      ...prev,
      subImages: mergedFiles,
      subImagesPreview: previews,
    }));
  };

  const addFeature = () => {
    if (featureInput.trim() !== "" && !formData.features.includes(featureInput.trim())) {
      setFormData((prev: FormDataType) => ({
        ...prev,
        features: [...prev.features, featureInput.trim()],
      }));
      setFeatureInput("");
    }
  };

  // ✅ Quản lý variations
  const addColor = () => {
    setFormData(prev => ({
      ...prev,
      variations: [...prev.variations, { color: "", options: [] }],
    }));
  };

  const updateColor = (index: number, value: string) => {
    const newVars = [...formData.variations];
    newVars[index].color = value;
    setFormData({ ...formData, variations: newVars });
  };

  const addOption = (colorIndex: number) => {
    const newVars = [...formData.variations];
    newVars[colorIndex].options.push({ name: "", stock: 0, additionalPrice: 0 });
    setFormData({ ...formData, variations: newVars });
  };

const updateOption = (
  colorIndex: number,
  optIndex: number,
  field: keyof VariationOption, // chỉ chấp nhận "name" | "stock" | "additionalPrice"
  value: any
) => {
  const newVars = [...formData.variations];
  (newVars[colorIndex].options[optIndex][field] as any) = value;
  setFormData({ ...formData, variations: newVars });
};


  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      const form = new FormData();

      form.append("name", formData.name);
      form.append("description", formData.description);
      form.append("price", String(formData.price));
      if (formData.originalPrice) form.append("salePrice", String(formData.originalPrice));
      form.append("brand", formData.brand);
      form.append("category", formData.category);
      form.append("subCategory", formData.subCategory);
      form.append("model", formData.model);
      form.append("seoTitle", formData.seoTitle);
      form.append("seoDescription", formData.seoDescription);
      form.append("store", formData.storeId ?? "");

      form.append("specifications", JSON.stringify(formData.specifications));
      form.append("tags", JSON.stringify(formData.tags));
      form.append("features", JSON.stringify(formData.features));
      form.append("variations", JSON.stringify(formData.variations)); // ✅ gửi variations

      if (formData.mainImage) form.append("mainImage", formData.mainImage);
      formData.subImages.forEach((file: File) => form.append("subImages", file));

      const res = await fetch("http://localhost:5000/api/products", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ Tạo sản phẩm thành công!");
        onAddProduct(data.data);
        onClose();
      } else {
        alert("❌ Lỗi: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Không thể kết nối server");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-black text-xl"
          onClick={onClose}
        >
          ×
        </button>

        {/* Steps */}
        <div className="flex items-center mb-6">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  step >= s ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-400"
                }`}
              >
                {s}
              </div>
              {s < 4 && (
                <div className="w-10 h-1 bg-gray-200 mx-2 rounded-full">
                  <div className={`h-1 rounded-full ${step > s ? "bg-blue-500" : ""}`}></div>
                </div>
              )}
            </div>
          ))}
          <span className="ml-4 text-gray-500 font-medium">Bước {step}/4</span>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <>
            <div className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span></span> Thông tin cơ bản
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium">Tên sản phẩm *</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: iPhone 15 Pro Max"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Thương hiệu</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: Apple, Samsung, Nike..."
                  value={formData.brand}
                  onChange={(e) => handleChange("brand", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Danh mục *</label>
                <select
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                >
                  <option value="">Chọn danh mục</option>
                  <option value="Điện thoại">Điện thoại</option>
                  <option value="Laptop">Laptop</option>
                  <option value="Quần áo">Quần áo</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Danh mục con</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: iPhone, Macbook..."
                  value={formData.subCategory}
                  onChange={(e) => handleChange("subCategory", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Giá bán *</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="$ 0"
                  value={formData.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Giá gốc</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="$ 0"
                  value={formData.originalPrice}
                  onChange={(e) => handleChange("originalPrice", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Model/Mã sản phẩm</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: A2484, SM-G998B..."
                  value={formData.model}
                  onChange={(e) => handleChange("model", e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button className="bg-gray-100 px-4 py-2 rounded font-medium" onClick={onClose}>
                Hủy
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded font-medium"
                onClick={() => setStep(2)}
              >
                Tiếp tục
              </button>
            </div>
          </>
        )}

        {/* Step 2: Mô tả & hình ảnh */}
        {step === 2 && (
          <>
            <div className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span>📝</span> Mô tả & Hình ảnh
            </div>

            <textarea
              className="w-full border rounded px-3 py-2 mb-4 bg-gray-50"
              rows={3}
              placeholder="Mô tả chi tiết..."
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Ảnh chính */}
              <div className="border rounded-lg p-4 flex flex-col items-center">
                <div className="text-gray-400 mb-2 text-center">
                  Ảnh chính sản phẩm <br />
                  <span className="text-xs">(Tỷ lệ 1:1 khuyến nghị)</span>
                </div>
                <label className="bg-gray-100 px-4 py-2 rounded cursor-pointer">
                  ⬆️ Chọn ảnh chính
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleMainImageChange(e.target.files ? e.target.files[0] : null)
                    }
                  />
                </label>
                {formData.mainImagePreview && (
                  <img
                    src={formData.mainImagePreview}
                    alt="Main Preview"
                    className="mt-3 w-24 h-24 object-cover rounded border"
                  />
                )}
              </div>

              <div className="border rounded-lg p-4 flex flex-col items-center">
                <div className="text-gray-400 mb-2 text-center">
                  Ảnh phụ (tùy chọn) <br />
                  <span className="text-xs">(Tối đa 8 ảnh)</span>
                </div>
                <label className="bg-gray-100 px-4 py-2 rounded cursor-pointer">
                  ⬆️ Thêm ảnh phụ
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleSubImagesChange(Array.from(e.target.files));
                      }
                    }}
                  />
                </label>
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.subImagesPreview?.map((src: string, idx: number) => (
                    <img
                      key={idx}
                      src={src}
                      alt={`Sub ${idx}`}
                      className="w-16 h-16 object-cover rounded border"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium">Tính năng nổi bật</label>
              <div className="flex gap-2">
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: Camera 48MP..."
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                />
                <button
                  type="button"
                  className="bg-gray-100 px-3 py-2 rounded hover:bg-gray-200"
                  onClick={addFeature}
                >
                  +
                </button>
              </div>
              {formData.features?.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-sm text-gray-700">
                  {formData.features.map((f: string, idx: number) => (
                    <li key={idx}>{f}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <button
                className="bg-gray-100 px-4 py-2 rounded font-medium"
                onClick={() => setStep(1)}
              >
                Quay lại
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded font-medium"
                onClick={() => setStep(3)}
              >
                Tiếp tục
              </button>
            </div>
          </>
        )}

        {/* Step 3: Variations (Màu + dung lượng/kích cỡ) */}
        {step === 3 && (
          <>
            <div className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span>🎨</span> Biến thể sản phẩm
            </div>

            <div className="space-y-4">
              {formData.variations.map((v, vi) => (
                <div key={vi} className="border p-3 rounded-lg">
                  <label className="text-sm font-medium">Màu sắc</label>
                  <input
                    className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                    placeholder="VD: Titan Xanh"
                    value={v.color}
                    onChange={(e) => updateColor(vi, e.target.value)}
                  />

                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Tuỳ chọn (Dung lượng/Kích cỡ)</span>
                      <button
                        type="button"
                        className="bg-gray-100 px-3 py-1 rounded text-sm"
                        onClick={() => addOption(vi)}
                      >
                        + Thêm tuỳ chọn
                      </button>
                    </div>

                    {v.options.map((opt, oi) => (
                      <div key={oi} className="grid grid-cols-3 gap-2 mb-2">
                        <input
                          className="border rounded px-2 py-1"
                          placeholder="Tên (VD: 128GB, XL)"
                          value={opt.name}
                          onChange={(e) => updateOption(vi, oi, "name", e.target.value)}
                        />
                        <input
                          type="number"
                          className="border rounded px-2 py-1"
                          placeholder="Số lượng"
                          value={opt.stock}
                          onChange={(e) =>
                            updateOption(vi, oi, "stock", Number(e.target.value))
                          }
                        />
                        <input
                          type="number"
                          className="border rounded px-2 py-1"
                          placeholder="Giá thêm"
                          value={opt.additionalPrice}
                          onChange={(e) =>
                            updateOption(vi, oi, "additionalPrice", Number(e.target.value))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="bg-gray-100 px-4 py-2 rounded font-medium"
                onClick={addColor}
              >
                + Thêm màu sắc
              </button>
            </div>

            <div className="flex justify-between mt-6">
              <button
                type="button"
                className="bg-gray-100 px-4 py-2 rounded font-medium"
                onClick={() => setStep(2)}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="bg-blue-600 text-white px-4 py-2 rounded font-medium"
                onClick={() => setStep(4)}
              >
                Tiếp tục
              </button>
            </div>
          </>
        )}

        {/* Step 4: SEO & Thẻ tìm kiếm */}
        {step === 4 && (
          <>
            <div className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span>🔍</span> SEO & Thẻ tìm kiếm
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium">Tiêu đề SEO</label>
              <input
                className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                placeholder="Tiêu đề hiển thị trên kết quả tìm kiếm"
                value={formData.seoTitle}
                onChange={(e) => handleChange("seoTitle", e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium">Mô tả SEO</label>
              <input
                className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                placeholder="Mô tả ngắn hiển thị trên kết quả tìm kiếm"
                value={formData.seoDescription}
                onChange={(e) => handleChange("seoDescription", e.target.value)}
              />
            </div>
            <div className="flex justify-between mt-6">
              <button
                className="bg-gray-100 px-4 py-2 rounded font-medium"
                onClick={() => setStep(3)}
              >
                Quay lại
              </button>
              <button
                className="bg-green-600 text-white px-4 py-2 rounded font-medium"
                onClick={handleSubmit}
              >
                Tạo sản phẩm
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddProductPopup;
