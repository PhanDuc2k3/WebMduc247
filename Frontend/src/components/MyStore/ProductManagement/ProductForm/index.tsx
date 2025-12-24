import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import Step1BasicInfo from "./Step1BasicInfo";
import Step2Images from "./Step2Images";
import Step3Variations from "./Step3Details";
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

      // ✅ Chỉ set ảnh cũ vào existingSubImages, không set vào subImagesPreview
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
        subImagesPreview: [], // ✅ Khởi tạo rỗng, ảnh cũ sẽ hiển thị từ existingSubImages
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

    console.log("🚀 [handleSubmit] FormData trước khi append:");
    console.log({
      name: formData.name,
      description: formData.description,
      price: formData.price,
      originalPrice: formData.originalPrice,
      brand: formData.brand,
      category: formData.category,
      subCategory: formData.subCategory,
      model: formData.model,
      seoTitle: formData.seoTitle,
      seoDescription: formData.seoDescription,
      storeId: formData.storeId,
      tags: formData.tags,
      features: formData.features,
      specifications: formData.specifications,
      variations: formData.variations,
      mainImage: formData.mainImage,
      subImages: formData.subImages,
    });

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

    // ✅ tags - gửi dưới dạng JSON string để đảm bảo parse đúng
    formDataToSend.append("tags", JSON.stringify(formData.tags || []));

    // ✅ JSON fields
    formDataToSend.append("features", JSON.stringify(formData.features || []));
    formDataToSend.append("specifications", JSON.stringify(formData.specifications || []));
    formDataToSend.append("variations", JSON.stringify(formData.variations || []));

    console.log("[handleSubmit] 🔹 JSON fields prepared:");
    console.log({
      features: JSON.stringify(formData.features || []),
      specifications: JSON.stringify(formData.specifications || []),
      variations: JSON.stringify(formData.variations || []),
    });

    // ✅ Images
    console.log("[handleSubmit] 🔹 Main image:", formData.mainImage);
    console.log("[handleSubmit] 🔹 Sub images:", formData.subImages);
    console.log("[handleSubmit] 🔹 Existing sub images:", existingSubImages);
    
    // Main image: ưu tiên file mới, nếu không có thì dùng ảnh cũ
    if (formData.mainImage) {
      formDataToSend.append("mainImage", formData.mainImage);
    } else if (formData.mainImagePreview && !formData.mainImagePreview.startsWith('blob:')) {
      formDataToSend.append("existingMainImage", formData.mainImagePreview);
    }
    
    // Sub images: thêm ảnh mới
    formData.subImages.forEach((img) => formDataToSend.append("subImages", img));
    
    // Existing sub images: giữ lại ảnh cũ chưa bị xóa
    existingSubImages.forEach((imgUrl) => {
      formDataToSend.append("existingSubImages", imgUrl);
    });

    console.log("[handleSubmit] 📤 FormData entries:");
    for (const pair of formDataToSend.entries()) {
      console.log(pair[0], pair[1]);
    }

    // Gọi API
    const response = isEditing
      ? await axiosClient.put(`/api/products/${editProduct?._id}`, formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      : await axiosClient.post("/api/products", formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        });

    const newProduct = response.data;

    console.log("[handleSubmit] ✅ Tags returned from server:", newProduct.tags);
    console.log("[handleSubmit] ✅ Keywords returned from server:", newProduct.keywords);

    toast.success(isEditing ? "Cập nhật sản phẩm thành công!" : "Thêm sản phẩm thành công!");

    // Cập nhật formData nếu edit
    if (isEditing) {
      // ✅ Cập nhật existingSubImages với ảnh sub mới từ server
      const newSubImages = newProduct.images?.slice(1) || [];
      setExistingSubImages(newSubImages);
      
      setFormData((prev) => ({
        ...prev,
        ...newProduct,
        tags: newProduct.tags || [],
        features: newProduct.features || [],
        specifications: newProduct.specifications || [],
        variations: newProduct.variations || [],
        seoTitle: newProduct.seoTitle || prev.seoTitle,
        seoDescription: newProduct.seoDescription || prev.seoDescription,
        mainImagePreview: newProduct.images?.[0] || null,
        subImages: [], // ✅ Reset ảnh mới vì đã merge vào server
        subImagesPreview: [], // ✅ Reset preview vì ảnh đã ở existingSubImages
      }));
    } else {
      // Reset form nếu thêm mới
      setExistingSubImages([]);
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
      setStep(1); // ✅ Reset về step 1
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
      <div className="flex items-center mb-8 animate-fade-in-down">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 shadow-lg ${
                step >= s
                  ? "bg-[#2F5EE9] text-white transform scale-110"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {step > s ? <Check className="w-6 h-6" /> : s}
            </div>
            {s < 3 && (
              <div className="w-16 h-2 bg-gray-200 mx-3 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-[#2F5EE9] transition-all duration-500 ${
                    step > s ? "w-full" : "w-0"
                  }`}
                ></div>
              </div>
            )}
          </div>
        ))}
        <span className="ml-6 text-gray-600 font-bold text-lg">Bước {step}/3</span>
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
      {step === 3 && (
        <Step3Variations 
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
