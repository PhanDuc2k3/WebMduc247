import React, { useState } from "react";
// AddProductPopup.tsx
import type { ProductType } from "../../../types/product";

interface AddProductPopupProps {
  onClose: () => void;
  onAddProduct: (newProduct: ProductType) => void;
}


const AddProductPopup: React.FC<AddProductPopupProps> = ({ onClose, onAddProduct }) => {
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState<any>({
    name: "",
    brand: "",
    category: "",
    subCategory: "",
    price: "",
    originalPrice: "",
    stock: "",
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
  });

  const [featureInput, setFeatureInput] = useState("");

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: string, file: File | null) => {
    if (file) {
      const preview = URL.createObjectURL(file);
      setFormData((prev: any) => ({
        ...prev,
        [field]: file,
        [`${field}Preview`]: preview,
      }));
    }
  };

  const handleMultiFileChange = (field: string, files: File[]) => {
    const previews = files.map((f) => URL.createObjectURL(f));
    setFormData((prev: any) => ({
      ...prev,
      [field]: files,
      [`${field}Preview`]: previews,
    }));
  };

  const addFeature = () => {
    if (featureInput.trim() !== "") {
      setFormData((prev: any) => ({
        ...prev,
        features: [...prev.features, featureInput.trim()],
      }));
      setFeatureInput("");
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");

      const payload = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        salePrice: formData.originalPrice
          ? Number(formData.originalPrice)
          : undefined,
        brand: formData.brand,
        category: formData.category,
        subCategory: formData.subCategory,
        quantity: Number(formData.stock),
        model: formData.model,
        specifications: formData.specifications,
        tags: formData.tags,
        seoTitle: formData.seoTitle,
        seoDescription: formData.seoDescription,
        store: formData.storeId,
      };

      const res = await fetch("http://localhost:5000/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ Tạo sản phẩm thành công!");
        // gọi onAddProduct để cập nhật bảng bên ProductManagement
        onAddProduct(data.data); // giả sử API trả về { data: newProduct }
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
        {/* Nút đóng */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-black text-xl"
          onClick={onClose}
        >
          ×
        </button>

        {/* Thanh tiến trình */}
        <div className="flex items-center mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  step >= s
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {s}
              </div>
              {s < 4 && (
                <div className="w-10 h-1 bg-gray-200 mx-2 rounded-full">
                  <div
                    className={`h-1 rounded-full ${
                      step > s ? "bg-blue-500" : ""
                    }`}
                  ></div>
                </div>
              )}
            </div>
          ))}
          <span className="ml-4 text-gray-500 font-medium">
            Bước {step}/4
          </span>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <>
            <div className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span>📦</span> Thông tin cơ bản
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium">Tên sản phẩm *</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: iPhone 15 Pro Max 256GB"
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
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Danh mục con</label>
                <select
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  value={formData.subCategory}
                  onChange={(e) => handleChange("subCategory", e.target.value)}
                >
                  <option value="">Chọn danh mục con</option>
                  <option value="iPhone">iPhone</option>
                  <option value="Macbook">Macbook</option>
                </select>
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
                  onChange={(e) =>
                    handleChange("originalPrice", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Số lượng tồn kho</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="0"
                  value={formData.stock}
                  onChange={(e) => handleChange("stock", e.target.value)}
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
              <button
                className="bg-gray-100 px-4 py-2 rounded font-medium"
                onClick={onClose}
              >
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

        {/* Step 2 */}
        {step === 2 && (
          <>
            <div className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span>📝</span> Mô tả & Hình ảnh
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium">Mô tả sản phẩm *</label>
              <textarea
                className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                rows={3}
                placeholder="Mô tả chi tiết..."
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="border rounded-lg p-4 flex flex-col items-center">
                <div className="text-gray-400 mb-2 text-center">
                  Ảnh chính sản phẩm <br />
                  <span className="text-xs">(Tỷ lệ 1:1 khuyến nghị)</span>
                </div>
                <label className="bg-gray-100 px-4 py-2 rounded font-medium text-gray-700 hover:bg-gray-200 cursor-pointer">
                  <span className="mr-2">⬆️</span> Chọn ảnh chính
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleFileChange(
                        "mainImage",
                        e.target.files ? e.target.files[0] : null
                      )
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
                <label className="bg-gray-100 px-4 py-2 rounded font-medium text-gray-700 hover:bg-gray-200 cursor-pointer">
                  <span className="mr-2">⬆️</span> Thêm ảnh phụ
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        const files = Array.from(e.target.files).slice(0, 8);
                        handleMultiFileChange("subImages", files);
                      }
                    }}
                  />
                </label>
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.subImagesPreview?.map(
                    (src: string, idx: number) => (
                      <img
                        key={idx}
                        src={src}
                        alt={`Sub ${idx}`}
                        className="w-16 h-16 object-cover rounded border"
                      />
                    )
                  )}
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
                  className="bg-gray-100 px-3 py-2 rounded font-medium hover:bg-gray-200"
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

{/* Step 3 */}
{/* Step 3 */}
{step === 3 && (
  <>
    <div className="font-semibold text-lg mb-4 flex items-center gap-2">
      <span>⚙️</span> Thông số kỹ thuật
    </div>

    <div className="grid grid-cols-2 gap-4 mb-4">
      {/* Màu sắc */}
      <div>
        <label className="text-sm font-medium">Màu sắc</label>
        <input
          className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
          placeholder="VD: Đen, Trắng..."
          value={
            formData.specifications?.find((s: any) => s.key === "Màu sắc")
              ?.value || ""
          }
          onChange={(e) => {
            const updated = [
              ...(formData.specifications || []).filter(
                (s: any) => s.key !== "Màu sắc"
              ),
              { key: "Màu sắc", value: e.target.value },
            ];
            handleChange("specifications", updated);
          }}
        />
      </div>

      {/* Kích thước */}
      <div>
        <label className="text-sm font-medium">Kích thước</label>
        <input
          className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
          placeholder="VD: 160.7 x 77.6 x 7.8 mm"
          value={
            formData.specifications?.find((s: any) => s.key === "Kích thước")
              ?.value || ""
          }
          onChange={(e) => {
            const updated = [
              ...(formData.specifications || []).filter(
                (s: any) => s.key !== "Kích thước"
              ),
              { key: "Kích thước", value: e.target.value },
            ];
            handleChange("specifications", updated);
          }}
        />
      </div>
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



        {/* Step 4 */}
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
