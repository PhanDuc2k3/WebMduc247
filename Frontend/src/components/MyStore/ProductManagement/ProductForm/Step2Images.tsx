import React, { type ChangeEvent } from "react";
import type { FormDataType } from "../../../../types/product";

interface Props {
  formData: FormDataType;
  setFormData: React.Dispatch<React.SetStateAction<FormDataType>>;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  existingSubImages: string[];
  setExistingSubImages: React.Dispatch<React.SetStateAction<string[]>>;
}

const Step2Images: React.FC<Props> = ({
  formData,
  setFormData,
  setStep,
  existingSubImages,
  setExistingSubImages,
}) => {
  // Chọn ảnh chính
  const handleMainImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        mainImage: file,
        mainImagePreview: URL.createObjectURL(file),
      }));
    }
  };

  // Chọn ảnh phụ mới
  const handleSubImages = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setFormData((prev) => ({
      ...prev,
      subImages: [...prev.subImages, ...files],
      subImagesPreview: [...prev.subImagesPreview, ...newPreviews],
    }));
  };

  // Xóa ảnh phụ theo index
  const handleRemoveSubImage = (index: number) => {
    if (index < existingSubImages.length) {
      // xóa ảnh cũ (từ existingSubImages)
      setExistingSubImages(existingSubImages.filter((_, i) => i !== index));
      // Không cần xóa khỏi subImagesPreview vì existingSubImages và subImagesPreview là 2 mảng riêng
    } else {
      // xóa ảnh mới (từ subImages và subImagesPreview)
      const newIndex = index - existingSubImages.length;
      setFormData((prev) => ({
        ...prev,
        subImages: prev.subImages.filter((_, i) => i !== newIndex),
        subImagesPreview: prev.subImagesPreview.filter((_, i) => i !== newIndex),
      }));
    }
  };

  return (
    <div className="animate-fade-in-up">
      <h2 className="text-2xl font-bold mb-6 gradient-text flex items-center gap-2">
        <span>🖼️</span> Ảnh sản phẩm
      </h2>

      <div className="space-y-8">
        {/* Ảnh chính */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">
            <span>📸</span> Ảnh chính <span className="text-red-500">*</span>
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-purple-500 transition-all duration-300 bg-gray-50">
            <input
              type="file"
              accept="image/*"
              onChange={handleMainImage}
              className="hidden"
              id="main-image"
            />
            <label
              htmlFor="main-image"
              className="cursor-pointer flex flex-col items-center justify-center"
            >
              {formData.mainImagePreview ? (
                <div className="relative group">
                  <img
                    src={formData.mainImagePreview}
                    alt="Main"
                    className="w-48 h-48 object-cover rounded-xl shadow-lg border-4 border-white"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold">Thay đổi</span>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-6xl mb-4">📷</div>
                  <p className="text-gray-600 font-medium">Nhấn để chọn ảnh chính</p>
                  <p className="text-xs text-gray-400 mt-2">PNG, JPG, GIF tối đa 10MB</p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Ảnh phụ */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">
            <span>🖼️</span> Ảnh phụ (tối đa 10 ảnh)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-purple-500 transition-all duration-300 bg-gray-50 mb-4">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleSubImages}
              className="hidden"
              id="sub-images"
            />
            <label
              htmlFor="sub-images"
              className="cursor-pointer flex flex-col items-center justify-center py-4"
            >
              <div className="text-4xl mb-2">🖼️</div>
              <p className="text-gray-600 font-medium">Nhấn để chọn nhiều ảnh phụ</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF tối đa 10MB mỗi ảnh</p>
            </label>
          </div>

          {/* Grid ảnh phụ */}
          {(formData.subImagesPreview.length > 0 || existingSubImages.length > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...existingSubImages, ...formData.subImagesPreview].map((src, i) => (
                <div
                  key={i}
                  className="relative group animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <img
                    src={src}
                    alt={`sub-${i}`}
                    className="w-full h-32 object-cover rounded-xl shadow-lg border-2 border-gray-200 hover:border-purple-500 transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSubImage(i)}
                    className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-lg hover:scale-110 transform transition-all duration-300 opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          className="bg-gradient-to-r from-gray-400 to-gray-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
          onClick={() => setStep(1)}
        >
          <span>⬅️</span> Quay lại
        </button>
        <button
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
          onClick={() => setStep(3)}
        >
          Tiếp tục <span>➡️</span>
        </button>
      </div>
    </div>
  );
};

export default Step2Images;
