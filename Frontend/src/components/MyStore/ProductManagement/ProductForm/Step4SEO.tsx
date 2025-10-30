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
    <div>
      <h2 className="text-xl font-bold mb-4">SEO & Hoàn tất</h2>

      {/* Tags */}
      <div className="mb-4">
        <label className="text-sm font-medium">Từ khóa tìm kiếm</label>
        <input
          className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
          placeholder="Nhập các từ khóa (phân tách bằng dấu phẩy)"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          onBlur={handleTagsBlur}
        />
      </div>

      {/* SEO Title */}
      <div className="mb-4">
        <label className="text-sm font-medium">Tiêu đề SEO</label>
        <input
          className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
          placeholder="Tiêu đề hiển thị trên kết quả tìm kiếm"
          value={seoTitleInput}
          onChange={(e) => setSeoTitleInput(e.target.value)}
          onBlur={handleSeoTitleBlur}
        />
      </div>

      {/* SEO Description */}
      <div className="mb-4">
        <label className="text-sm font-medium">Mô tả SEO</label>
        <textarea
          className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
          placeholder="Mô tả ngắn hiển thị trên kết quả tìm kiếm"
          value={seoDescInput}
          onChange={(e) => setSeoDescInput(e.target.value)}
          onBlur={handleSeoDescBlur}
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
          className={`${
            isEdit
              ? "bg-yellow-600 hover:bg-yellow-700"
              : "bg-green-600 hover:bg-green-700"
          } text-white px-4 py-2 rounded font-medium`}
          onClick={handleSubmit}
        >
          {isEdit ? "Cập nhật sản phẩm" : "Tạo sản phẩm"}
        </button>
      </div>
    </div>
  );
};

export default Step4SEO;
