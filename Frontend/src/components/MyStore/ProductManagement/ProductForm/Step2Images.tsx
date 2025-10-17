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
      // xóa ảnh cũ
      setExistingSubImages(existingSubImages.filter((_, i) => i !== index));
      setFormData((prev) => ({
        ...prev,
        subImagesPreview: prev.subImagesPreview.filter((_, i) => i !== index),
      }));
    } else {
      // xóa ảnh mới
      const newIndex = index - existingSubImages.length;
      setFormData((prev) => ({
        ...prev,
        subImages: prev.subImages.filter((_, i) => i !== newIndex),
        subImagesPreview: prev.subImagesPreview.filter((_, i) => i !== index),
      }));
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Ảnh sản phẩm</h2>

      {/* Ảnh chính */}
      <div className="mb-6">
        <label className="text-sm font-medium">Ảnh chính</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleMainImage}
          className="mt-2"
        />
        {formData.mainImagePreview && (
          <img
            src={formData.mainImagePreview}
            alt="Main"
            className="mt-2 w-32 h-32 object-cover rounded border"
          />
        )}
      </div>

      {/* Ảnh phụ */}
      <div className="mb-6">
        <label className="text-sm font-medium">Ảnh phụ</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleSubImages}
          className="mt-2"
        />
        <div className="flex gap-2 flex-wrap mt-2">
          {formData.subImagesPreview.map((src, i) => (
            <div key={i} className="relative">
              <img
                src={src}
                alt={`sub-${i}`}
                className="w-24 h-24 object-cover rounded border"
              />
              <button
                type="button"
                onClick={() => handleRemoveSubImage(i)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
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
    </div>
  );
};

export default Step2Images;
