import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
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

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-10 sm:-top-12 right-0">
          <button
            onClick={onClose}
            className="text-white bg-[#2F5EE9] hover:bg-[#244ACC] px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-semibold transition-colors touch-manipulation shadow-lg flex items-center gap-2"
          >
            <X className="w-4 h-4" /> Đóng
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 md:p-8">
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
    </div>,
    document.body
  );
};

export default AddProductPopup;
