import React, { useState, useEffect } from "react";
import type { FormDataType } from "../../../../types/product";

interface Props {
  formData: FormDataType;
  handleChange: (field: keyof FormDataType, value: any) => void;
  handleSubmit: (e: React.FormEvent) => void | Promise<void>;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  isEdit?: boolean;
}

const Step4SEO: React.FC<Props> = ({
  formData,
  handleChange,
  handleSubmit,
  setStep,
  isEdit = false,
}) => {
  const [tagsInput, setTagsInput] = useState("");
  const [seoTitleInput, setSeoTitleInput] = useState("");
  const [seoDescInput, setSeoDescInput] = useState("");

  // ✅ Đồng bộ từ formData → input
  useEffect(() => {
    console.log("[Step4SEO] 🔄 formData cập nhật:", formData.tags);

    setTagsInput(Array.isArray(formData.tags) ? formData.tags.join(", ") : "");
    setSeoTitleInput(formData.seoTitle || "");
    setSeoDescInput(formData.seoDescription || "");
  }, [formData.tags, formData.seoTitle, formData.seoDescription]);

  // ✅ Cập nhật ngược lại khi blur
  const handleTagsBlur = () => {
    const arr = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    handleChange("tags", arr);
  };

  const handleSeoTitleBlur = () => handleChange("seoTitle", seoTitleInput);
  const handleSeoDescBlur = () => handleChange("seoDescription", seoDescInput);

  return (
    <div className="animate-fade-in-up">
      <h2 className="text-2xl font-bold mb-6 gradient-text flex items-center gap-2">
        <span>🔍</span> SEO & Hoàn tất
      </h2>

      <div className="space-y-6">
        {/* Tags */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <span>🏷️</span> Từ khóa tìm kiếm
          </label>
          <input
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium bg-gray-50"
            placeholder="Nhập các từ khóa (phân tách bằng dấu phẩy): iPhone, smartphone, Apple..."
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onBlur={handleTagsBlur}
          />
          <p className="text-xs text-gray-400 mt-1">Ví dụ: iPhone, smartphone, Apple, công nghệ</p>
        </div>

        {/* SEO Title */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <span>📝</span> Tiêu đề SEO
          </label>
          <input
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium bg-gray-50"
            placeholder="Tiêu đề hiển thị trên kết quả tìm kiếm (tối đa 60 ký tự)"
            value={seoTitleInput}
            onChange={(e) => setSeoTitleInput(e.target.value)}
            onBlur={handleSeoTitleBlur}
            maxLength={60}
          />
          <p className="text-xs text-gray-400 mt-1">{seoTitleInput.length}/60 ký tự</p>
        </div>

        {/* SEO Description */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <span>📄</span> Mô tả SEO
          </label>
          <textarea
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium bg-gray-50 resize-none"
            placeholder="Mô tả ngắn hiển thị trên kết quả tìm kiếm (tối đa 160 ký tự)"
            value={seoDescInput}
            onChange={(e) => setSeoDescInput(e.target.value)}
            onBlur={handleSeoDescBlur}
            maxLength={160}
          ></textarea>
          <p className="text-xs text-gray-400 mt-1">{seoDescInput.length}/160 ký tự</p>
        </div>
      </div>

      {/* Success Message */}
      <div className="mt-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
        <p className="text-green-700 font-medium flex items-center gap-2">
          <span>✅</span> Bạn đã hoàn thành tất cả các bước! Nhấn nút bên dưới để {isEdit ? "cập nhật" : "tạo"} sản phẩm.
        </p>
      </div>

      <div className="flex justify-between mt-8">
        <button
          className="bg-gradient-to-r from-gray-400 to-gray-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
          onClick={() => setStep(3)}
        >
          <span>⬅️</span> Quay lại
        </button>
        <button
          className={`${
            isEdit
              ? "bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700"
              : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          } text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2`}
          onClick={handleSubmit}
        >
          {isEdit ? (
            <>
              <span>💾</span> Cập nhật sản phẩm
            </>
          ) : (
            <>
              <span>✨</span> Tạo sản phẩm
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Step4SEO;
