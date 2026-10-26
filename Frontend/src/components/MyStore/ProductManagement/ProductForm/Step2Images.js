import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, {} from "react";
import { Image, Camera, ChevronLeft, ChevronRight, X } from "lucide-react";
const Step2Images = ({ formData, setFormData, setStep, existingSubImages, setExistingSubImages, }) => {
    // Chọn ảnh chính
    const handleMainImage = (e) => {
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
    const handleSubImages = (e) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (!files.length)
            return;
        const newPreviews = files.map((f) => URL.createObjectURL(f));
        setFormData((prev) => ({
            ...prev,
            subImages: [...prev.subImages, ...files],
            subImagesPreview: [...prev.subImagesPreview, ...newPreviews],
        }));
    };
    // Xóa ảnh phụ theo index
    const handleRemoveSubImage = (index) => {
        if (index < existingSubImages.length) {
            // xóa ảnh cũ (từ existingSubImages)
            setExistingSubImages(existingSubImages.filter((_, i) => i !== index));
            // Không cần xóa khỏi subImagesPreview vì existingSubImages và subImagesPreview là 2 mảng riêng
        }
        else {
            // xóa ảnh mới (từ subImages và subImagesPreview)
            const newIndex = index - existingSubImages.length;
            setFormData((prev) => ({
                ...prev,
                subImages: prev.subImages.filter((_, i) => i !== newIndex),
                subImagesPreview: prev.subImagesPreview.filter((_, i) => i !== newIndex),
            }));
        }
    };
    return (_jsxs("div", { className: "animate-fade-in-up", children: [_jsxs("h2", { className: "text-2xl font-bold mb-6 gradient-text flex items-center gap-2", children: [_jsx(Image, { className: "w-6 h-6 text-[#2F5EE9]" }), " \u1EA2nh s\u1EA3n ph\u1EA9m"] }), _jsxs("div", { className: "space-y-8", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2", children: [_jsx(Camera, { className: "w-5 h-5 text-[#2F5EE9]" }), " \u1EA2nh ch\u00EDnh ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs("div", { className: "border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-[#2F5EE9] transition-all duration-300 bg-gray-50", children: [_jsx("input", { type: "file", accept: "image/*", onChange: handleMainImage, className: "hidden", id: "main-image" }), _jsx("label", { htmlFor: "main-image", className: "cursor-pointer flex flex-col items-center justify-center", children: formData.mainImagePreview ? (_jsxs("div", { className: "relative group", children: [_jsx("img", { src: formData.mainImagePreview, alt: "Main", className: "w-48 h-48 object-cover rounded-xl shadow-lg border-4 border-white" }), _jsx("div", { className: "absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center", children: _jsx("span", { className: "text-white font-bold", children: "Thay \u0111\u1ED5i" }) })] })) : (_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx(Camera, { className: "w-16 h-16 text-gray-400" }) }), _jsx("p", { className: "text-gray-600 font-medium", children: "Nh\u1EA5n \u0111\u1EC3 ch\u1ECDn \u1EA3nh ch\u00EDnh" }), _jsx("p", { className: "text-xs text-gray-400 mt-2", children: "PNG, JPG, GIF t\u1ED1i \u0111a 10MB" })] })) })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2", children: [_jsx(Image, { className: "w-5 h-5 text-[#2F5EE9]" }), " \u1EA2nh ph\u1EE5 (t\u1ED1i \u0111a 10 \u1EA3nh)"] }), _jsxs("div", { className: "border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-[#2F5EE9] transition-all duration-300 bg-gray-50 mb-4", children: [_jsx("input", { type: "file", accept: "image/*", multiple: true, onChange: handleSubImages, className: "hidden", id: "sub-images" }), _jsxs("label", { htmlFor: "sub-images", className: "cursor-pointer flex flex-col items-center justify-center py-4", children: [_jsx("div", { className: "mb-2", children: _jsx(Image, { className: "w-12 h-12 text-gray-400" }) }), _jsx("p", { className: "text-gray-600 font-medium", children: "Nh\u1EA5n \u0111\u1EC3 ch\u1ECDn nhi\u1EC1u \u1EA3nh ph\u1EE5" }), _jsx("p", { className: "text-xs text-gray-400 mt-1", children: "PNG, JPG, GIF t\u1ED1i \u0111a 10MB m\u1ED7i \u1EA3nh" })] })] }), (formData.subImagesPreview.length > 0 || existingSubImages.length > 0) && (_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4", children: [...existingSubImages, ...formData.subImagesPreview].map((src, i) => (_jsxs("div", { className: "relative group animate-fade-in-up", style: { animationDelay: `${i * 0.1}s` }, children: [_jsx("img", { src: src, alt: `sub-${i}`, className: "w-full h-32 object-cover rounded-xl shadow-lg border-2 border-gray-200 hover:border-[#2F5EE9] transition-all duration-300" }), _jsx("button", { type: "button", onClick: () => handleRemoveSubImage(i), className: "absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:scale-110 transform transition-all duration-300 opacity-0 group-hover:opacity-100", children: _jsx(X, { className: "w-5 h-5" }) })] }, i))) }))] })] }), _jsxs("div", { className: "flex justify-between mt-8", children: [_jsxs("button", { className: "bg-gradient-to-r from-gray-400 to-gray-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2", onClick: () => setStep(1), children: [_jsx(ChevronLeft, { className: "w-5 h-5" }), " Quay l\u1EA1i"] }), _jsxs("button", { className: "bg-[#2F5EE9] text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2 hover:bg-[#374151]", onClick: () => setStep(3), children: ["Ti\u1EBFp t\u1EE5c ", _jsx(ChevronRight, { className: "w-5 h-5" })] })] })] }));
};
export default Step2Images;
