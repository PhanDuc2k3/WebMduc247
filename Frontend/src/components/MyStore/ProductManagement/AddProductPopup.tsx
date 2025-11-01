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

  // ✅ Reset form khi đóng popup hoặc khi editProduct thay đổi
  useEffect(() => {
    if (!open) {
      setStep(1);
      setFormData({
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
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {editProduct ? "✏️ Sửa sản phẩm" : "➕ Thêm sản phẩm mới"}
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-full transition-all duration-300 text-2xl font-bold hover:scale-110"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
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
    </div>
  );
};

export default AddProductPopup;
