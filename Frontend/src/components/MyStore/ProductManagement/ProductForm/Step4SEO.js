import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { Search, FileText, ChevronLeft, CheckCircle, Save } from "lucide-react";
const Step4SEO = ({ formData, handleChange, handleSubmit, setStep, isEdit = false, }) => {
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
    return (_jsxs("div", { className: "animate-fade-in-up", children: [_jsxs("h2", { className: "text-2xl font-bold mb-6 gradient-text flex items-center gap-2", children: [_jsx(Search, { className: "w-6 h-6 text-[#2F5EE9]" }), " SEO & Ho\u00E0n t\u1EA5t"] }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2", children: [_jsx(Search, { className: "w-4 h-4 text-[#2F5EE9]" }), " T\u1EEB kh\u00F3a t\u00ECm ki\u1EBFm"] }), _jsx("input", { className: "w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2F5EE9] focus:border-transparent transition-all duration-300 font-medium bg-gray-50", placeholder: "Nh\u1EADp c\u00E1c t\u1EEB kh\u00F3a (ph\u00E2n t\u00E1ch b\u1EB1ng d\u1EA5u ph\u1EA9y): iPhone, smartphone, Apple...", value: tagsInput, onChange: (e) => setTagsInput(e.target.value), onBlur: handleTagsBlur }), _jsx("p", { className: "text-xs text-gray-400 mt-1", children: "V\u00ED d\u1EE5: iPhone, smartphone, Apple, c\u00F4ng ngh\u1EC7" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2", children: [_jsx(FileText, { className: "w-4 h-4 text-[#2F5EE9]" }), " Ti\u00EAu \u0111\u1EC1 SEO"] }), _jsx("input", { className: "w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2F5EE9] focus:border-transparent transition-all duration-300 font-medium bg-gray-50", placeholder: "Ti\u00EAu \u0111\u1EC1 hi\u1EC3n th\u1ECB tr\u00EAn k\u1EBFt qu\u1EA3 t\u00ECm ki\u1EBFm (t\u1ED1i \u0111a 60 k\u00FD t\u1EF1)", value: seoTitleInput, onChange: (e) => setSeoTitleInput(e.target.value), onBlur: handleSeoTitleBlur, maxLength: 60 }), _jsxs("p", { className: "text-xs text-gray-400 mt-1", children: [seoTitleInput.length, "/60 k\u00FD t\u1EF1"] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2", children: [_jsx(FileText, { className: "w-4 h-4 text-[#2F5EE9]" }), " M\u00F4 t\u1EA3 SEO"] }), _jsx("textarea", { rows: 4, className: "w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2F5EE9] focus:border-transparent transition-all duration-300 font-medium bg-gray-50 resize-none", placeholder: "M\u00F4 t\u1EA3 ng\u1EAFn hi\u1EC3n th\u1ECB tr\u00EAn k\u1EBFt qu\u1EA3 t\u00ECm ki\u1EBFm (t\u1ED1i \u0111a 160 k\u00FD t\u1EF1)", value: seoDescInput, onChange: (e) => setSeoDescInput(e.target.value), onBlur: handleSeoDescBlur, maxLength: 160 }), _jsxs("p", { className: "text-xs text-gray-400 mt-1", children: [seoDescInput.length, "/160 k\u00FD t\u1EF1"] })] })] }), _jsx("div", { className: "mt-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl", children: _jsxs("p", { className: "text-green-700 font-medium flex items-center gap-2", children: [_jsx(CheckCircle, { className: "w-5 h-5" }), " B\u1EA1n \u0111\u00E3 ho\u00E0n th\u00E0nh t\u1EA5t c\u1EA3 c\u00E1c b\u01B0\u1EDBc! Nh\u1EA5n n\u00FAt b\u00EAn d\u01B0\u1EDBi \u0111\u1EC3 ", isEdit ? "cập nhật" : "tạo", " s\u1EA3n ph\u1EA9m."] }) }), _jsxs("div", { className: "flex justify-between mt-8", children: [_jsxs("button", { className: "bg-gradient-to-r from-gray-400 to-gray-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2", onClick: () => setStep(3), children: [_jsx(ChevronLeft, { className: "w-5 h-5" }), " Quay l\u1EA1i"] }), _jsx("button", { className: `${isEdit
                            ? "bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700"
                            : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"} text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2`, onClick: handleSubmit, children: isEdit ? (_jsxs(_Fragment, { children: [_jsx(Save, { className: "w-5 h-5" }), " C\u1EADp nh\u1EADt s\u1EA3n ph\u1EA9m"] })) : (_jsxs(_Fragment, { children: [_jsx(CheckCircle, { className: "w-5 h-5" }), " T\u1EA1o s\u1EA3n ph\u1EA9m"] })) })] })] }));
};
export default Step4SEO;
