import React, { useState, useEffect } from "react";
import ProductForm from "./ProductForm/index";
import type { FormDataType, ProductType } from "../../../types/product";

interface AddProductPopupProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProductType, isEdit: boolean) => void;
  editProduct?: ProductType | null;
}

const AddProductPopup: React.FC<AddProductPopupProps> = ({
  open,
  onClose,
  onSubmit,
  editProduct,
}) => {
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState<FormDataType>({
    name: "",
    description: "",
    price: "",
    originalPrice: "",
    brand: "",
    category: "",
    subCategory: "",
    model: "",
    features: [],
    specifications: [],
    seoTitle: "",
    seoDescription: "",
    tags: [],
    mainImage: null,
    mainImagePreview: null,
    subImages: [],
    subImagesPreview: [],
    storeId: "",
    variations: [],
  });

  // ✅ Khi bấm Edit -> tự fill lại dữ liệu sản phẩm cũ
  useEffect(() => {
    if (editProduct) {
      const mainImageUrl = editProduct.images?.[0] || null;
      const subImagesUrl = editProduct.images?.slice(1) || [];

      // ✅ Lấy đúng field
      setFormData({
        name: editProduct.name || "",
        description: editProduct.description || "",
        price: editProduct.price || "",
        originalPrice: editProduct.salePrice || "",
        brand: editProduct.brand || "",
        category: editProduct.category || "",
        subCategory: editProduct.subCategory || "",
        model: editProduct.model || "",
        features: editProduct.features || [], // ✅ đúng
        specifications: editProduct.specifications || [],
        seoTitle: editProduct.seoTitle || "",
        seoDescription: editProduct.seoDescription || "",
        tags: editProduct.tags || [], // ✅ đúng (trước đây nhầm keywords)
        storeId:
          typeof editProduct.store === "object"
            ? editProduct.store._id
            : editProduct.store || "",
        variations: editProduct.variations || [],
        mainImage: null,
        mainImagePreview: mainImageUrl,
        subImages: [],
        subImagesPreview: subImagesUrl,
      });

      setStep(1);
    }
  }, [editProduct]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {editProduct ? "✏️ Sửa sản phẩm" : "➕ Thêm sản phẩm mới"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-lg"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <ProductForm
          step={step}
          setStep={setStep}
          formData={formData}
          setFormData={setFormData}
          onClose={onClose}
          onAddProduct={onSubmit}
          editProduct={editProduct}
        />
      </div>
    </div>
  );
};

export default AddProductPopup;
