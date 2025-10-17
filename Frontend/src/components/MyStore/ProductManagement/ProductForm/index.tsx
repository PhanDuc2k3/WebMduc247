import React, { useEffect, useState } from "react";
import Step1BasicInfo from "./Step1BasicInfo";
import Step2Images from "./Step2Images";
import Step3Variations from "./Step3Details";
import Step4SEO from "./Step4SEO";
import type { FormDataType, ProductType } from "../../../../types/product";
import productApi from "../../../../api/productApi";

interface ProductFormProps {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  formData: FormDataType;
  setFormData: React.Dispatch<React.SetStateAction<FormDataType>>;
  onClose: () => void;
  onAddProduct: (newProduct: ProductType, isEdit: boolean) => void;
  editProduct?: ProductType | null;
}

const ProductForm: React.FC<ProductFormProps> = ({
  step,
  setStep,
  formData,
  setFormData,
  onClose,
  onAddProduct,
  editProduct,
}) => {
// State mới cho ảnh phụ cũ
const [existingSubImages, setExistingSubImages] = React.useState<string[]>([]);

// Khi editProduct có dữ liệu
useEffect(() => {
  if (editProduct) {
    const mainImageUrl = editProduct.images?.[0] || null;
    const subImagesUrl = editProduct.images?.slice(1) || [];
    setExistingSubImages(subImagesUrl);

    setFormData({
      ...formData,
      mainImagePreview: mainImageUrl,
      subImagesPreview: subImagesUrl,
      subImages: [],
      mainImage: null,
    });
  }
}, [editProduct]);

// Submit FormData
const handleSubmit = async () => {
  try {
    const form = new FormData();

    // Các field cơ bản
    Object.entries({
      name: formData.name,
      description: formData.description,
      price: String(formData.price),
      salePrice: formData.originalPrice,
      brand: formData.brand,
      category: formData.category,
      subCategory: formData.subCategory,
      model: formData.model,
      seoTitle: formData.seoTitle,
      seoDescription: formData.seoDescription,
      store: formData.storeId,
    }).forEach(([key, val]) => {
      if (val) form.append(key, String(val));
    });

    // Các field JSON
    ["specifications", "tags", "features", "variations"].forEach((key) => {
      form.append(key, JSON.stringify(formData[key as keyof FormDataType] || []));
    });

    // Ảnh mới
    if (formData.mainImage) form.append("mainImage", formData.mainImage);
    formData.subImages.forEach((file) => form.append("subImages", file));

    // Ảnh cũ giữ lại
    if (formData.mainImagePreview && !formData.mainImage) {
      form.append("existingMainImage", formData.mainImagePreview);
    }
    existingSubImages.forEach((url) => form.append("existingSubImages", url));

    const isEdit = Boolean(editProduct?._id);
    const res = isEdit
      ? await productApi.updateProduct(editProduct!._id, form)
      : await productApi.createProduct(form);

    const newProduct = res.data.data;

    setFormData((prev) => ({
      ...prev,
      mainImagePreview: newProduct.images?.[0] || null,
      subImagesPreview: newProduct.images?.slice(1) || [],
      mainImage: null,
      subImages: [],
    }));

    alert(isEdit ? "Cập nhật thành công!" : "Tạo thành công!");
    onAddProduct(newProduct, isEdit);
    onClose();
  } catch (err: any) {
    console.error(err);
    alert(err.response?.data?.message || "Không thể kết nối server");
  }
};

  const handleChange = (field: keyof FormDataType, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      {/* Steps header */}
      <div className="flex items-center mb-6">
        {[1, 2, 3, 4].map((s) => (
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

      {step === 1 && <Step1BasicInfo formData={formData} handleChange={handleChange} onClose={onClose} setStep={setStep} />}
{step === 2 && (
  <Step2Images
    formData={formData}
    setFormData={setFormData}
    setStep={setStep}
    existingSubImages={existingSubImages}
    setExistingSubImages={setExistingSubImages}
  />
)}
      {step === 3 && <Step3Variations formData={formData} handleChange={handleChange} setStep={setStep} />}
      {step === 4 && <Step4SEO formData={formData} handleChange={handleChange} setStep={setStep} handleSubmit={handleSubmit} />}
    </>
  );
};

export default ProductForm;
