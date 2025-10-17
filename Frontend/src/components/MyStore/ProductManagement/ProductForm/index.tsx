import React, { useEffect } from "react";
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

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ProductForm: React.FC<ProductFormProps> = ({
  step,
  setStep,
  formData,
  setFormData,
  onClose,
  onAddProduct,
  editProduct,
}) => {
  // Khi editProduct có dữ liệu, set vào formData
  useEffect(() => {
    if (editProduct) {
      const mainImageUrl = editProduct.images?.[0] || null;
      const subImagesUrl = editProduct.images?.slice(1) || [];

      setFormData({
        name: editProduct.name || "",
        description: editProduct.description || "",
        price: String(editProduct.price || ""),
        originalPrice: String(editProduct.salePrice || ""),
        brand: editProduct.brand || "",
        category: editProduct.category || "",
        subCategory: editProduct.subCategory || "",
        model: editProduct.model || "",
        features: editProduct.tags || [],
        specifications: editProduct.specifications || [],
        seoTitle: editProduct.seoTitle || "",
        seoDescription: editProduct.seoDescription || "",
        tags: editProduct.keywords || [],
        storeId: editProduct.store || "",
        variations: editProduct.variations || [],
        mainImage: null,
        mainImagePreview: mainImageUrl,
        subImages: [],
        subImagesPreview: subImagesUrl,
      });
    }
  }, [editProduct, setFormData]);

  // 🔹 Submit tạo / sửa sản phẩm
const handleSubmit = async () => {
  try {
    const form = new FormData();

    // 🔹 Các field cơ bản
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
      store: formData.storeId ?? "",
    }).forEach(([key, val]) => {
      if (val) form.append(key, String(val));
    });

    // 🔹 Các field JSON
    ["specifications", "tags", "features", "variations"].forEach((key) => {
      form.append(key, JSON.stringify(formData[key as keyof FormDataType] || []));
    });

    // 🔹 Ảnh mới
    if (formData.mainImage) form.append("mainImage", formData.mainImage);
    formData.subImages.forEach((file) => form.append("subImages", file));

    // 🔹 Ảnh cũ giữ lại
    if (formData.mainImagePreview && !formData.mainImage) {
      form.append("existingMainImage", formData.mainImagePreview);
    }
    formData.subImagesPreview.forEach((url) => {
      // chỉ append nếu ảnh chưa bị xóa
      if (!formData.subImages.some((f) => URL.createObjectURL(f) === url)) {
        form.append("existingSubImages", url);
      }
    });

    const isEdit = Boolean(editProduct?._id);
    const res = isEdit
      ? await productApi.updateProduct(editProduct!._id, form)
      : await productApi.createProduct(form);

    const newProduct: ProductType = res.data.data;

    // 🔹 Cập nhật formData để preview UI
    setFormData((prev) => ({
      ...prev,
      mainImagePreview: newProduct.images?.[0] || null,
      subImagesPreview: newProduct.images?.slice(1) || [],
      mainImage: null,
      subImages: [],
    }));

    alert(isEdit ? "✅ Cập nhật sản phẩm thành công!" : "✅ Tạo sản phẩm thành công!");
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
      {step === 2 && <Step2Images formData={formData} setFormData={setFormData} setStep={setStep} />}
      {step === 3 && <Step3Variations formData={formData} handleChange={handleChange} setStep={setStep} />}
      {step === 4 && <Step4SEO formData={formData} handleChange={handleChange} setStep={setStep} handleSubmit={handleSubmit} />}
    </>
  );
};

export default ProductForm;
