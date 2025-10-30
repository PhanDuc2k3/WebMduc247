import React, { useEffect, useState } from "react";
import Step1BasicInfo from "./Step1BasicInfo";
import Step2Images from "./Step2Images";
import Step3Variations from "./Step3Details";
import Step4SEO from "./Step4SEO";
import type { FormDataType, ProductType } from "../../../../types/product";
import axiosClient from "../../../../api/axiosClient";
import { toast } from "react-hot-toast";

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
  const [existingSubImages, setExistingSubImages] = useState<string[]>([]);
  const isEditing = Boolean(editProduct);

  // ✅ Khi có sản phẩm cần sửa → set form ban đầu
  useEffect(() => {
    if (editProduct) {
      const mainImageUrl = editProduct.images?.[0] || null;
      const subImagesUrl = editProduct.images?.slice(1) || [];

      setExistingSubImages(subImagesUrl);

      const storeId =
        typeof editProduct.store === "object"
          ? editProduct.store._id
          : editProduct.store || "";

      const newForm: FormDataType = {
        name: editProduct.name || "",
        description: editProduct.description || "",
        price: editProduct.price || "",
        originalPrice: editProduct.salePrice || "",
        brand: editProduct.brand || "",
        category: editProduct.category || "",
        subCategory: editProduct.subCategory || "",
        model: editProduct.model || "",
        seoTitle: editProduct.seoTitle || "",
        seoDescription: editProduct.seoDescription || "",
        tags: editProduct.tags || [],
        features: editProduct.features || [],
        specifications: editProduct.specifications || [],
        variations: editProduct.variations || [],
        mainImage: null,
        mainImagePreview: mainImageUrl,
        subImages: [],
        subImagesPreview: subImagesUrl,
        storeId,
      };

      console.log("[ProductForm] ✅ Setting new formData:", newForm);
      setFormData(newForm);
    }
  }, [editProduct, setFormData]);

  useEffect(() => {
    console.log("[ProductForm] 🔎 formData changed:", formData);
  }, [formData]);

  const handleChange = (field: keyof FormDataType, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ✅ Gửi dữ liệu
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    try {
      const formDataToSend = new FormData();

      console.log("[handleSubmit] 🚀 Sending form with tags:", formData.tags);

      // Trường cơ bản
      formDataToSend.append("name", formData.name || "");
      formDataToSend.append("description", formData.description || "");
      formDataToSend.append("price", String(formData.price || ""));
      formDataToSend.append("salePrice", String(formData.originalPrice || ""));
      formDataToSend.append("brand", formData.brand || "");
      formDataToSend.append("category", formData.category || "");
      formDataToSend.append("subCategory", formData.subCategory || "");
      formDataToSend.append("model", formData.model || "");
      formDataToSend.append("seoTitle", formData.seoTitle || "");
      formDataToSend.append("seoDescription", formData.seoDescription || "");
      formDataToSend.append("store", formData.storeId || "");

      // ✅ tags
      if (Array.isArray(formData.tags)) {
        formData.tags.forEach((tag) => tag && formDataToSend.append("tags[]", tag));
      }

      // ✅ JSON fields
      formDataToSend.append("features", JSON.stringify(formData.features || []));
      formDataToSend.append("specifications", JSON.stringify(formData.specifications || []));
      formDataToSend.append("variations", JSON.stringify(formData.variations || []));

      // ✅ Images
      if (formData.mainImage) formDataToSend.append("mainImage", formData.mainImage);
      formData.subImages.forEach((img) => formDataToSend.append("subImages", img));

      console.log("[handleSubmit] 📤 Data sending:", Object.fromEntries(formDataToSend.entries()));

      // Gọi API
      const response = isEditing
        ? await axiosClient.put(`/api/products/${editProduct?._id}`, formDataToSend, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        : await axiosClient.post("/api/products", formDataToSend, {
            headers: { "Content-Type": "multipart/form-data" },
          });

      const newProduct = response.data;

      console.log("[handleSubmit] ✅ Tags received from server:", newProduct.tags);
      console.log("[handleSubmit] ✅ Keywords received from server:", newProduct.keywords);

      toast.success(isEditing ? "Cập nhật sản phẩm thành công!" : "Thêm sản phẩm thành công!");

      // ✅ Nếu là edit → cập nhật lại formData từ server
      if (isEditing) {
        setFormData((prev) => ({
          ...prev,
          ...newProduct,
          tags: newProduct.tags || [],
          features: newProduct.features || [],
          specifications: newProduct.specifications || [],
          variations: newProduct.variations || [],
          seoTitle: newProduct.seoTitle || prev.seoTitle,
          seoDescription: newProduct.seoDescription || prev.seoDescription,
        }));
      } else {
        // ✅ Reset form nếu thêm mới
        setFormData({
          name: "",
          description: "",
          price: "",
          originalPrice: "",
          brand: "",
          category: "",
          subCategory: "",
          model: "",
          seoTitle: "",
          seoDescription: "",
          tags: [],
          features: [],
          specifications: [],
          variations: [],
          mainImage: null,
          mainImagePreview: null,
          subImages: [],
          subImagesPreview: [],
          storeId: "",
        });
      }

      onAddProduct(newProduct, isEditing);
      onClose();
    } catch (error: any) {
      console.error("[handleSubmit] ❌ Error submitting form:", error);
      toast.error(error.response?.data?.message || "Lỗi khi gửi dữ liệu sản phẩm");
    }
  };

  return (
    <>
      {/* 🧭 Header Steps */}
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

      {/* 🧩 Step Components */}
      {step === 1 && (
        <Step1BasicInfo formData={formData} handleChange={handleChange} onClose={onClose} setStep={setStep} />
      )}
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
      {step === 4 && (
        <Step4SEO
          formData={formData}
          handleChange={handleChange}
          setStep={setStep}
          handleSubmit={handleSubmit}
          isEdit={isEditing}
        />
      )}
    </>
  );
};

export default ProductForm;
