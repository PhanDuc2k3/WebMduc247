import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Step3Details.tsx
import React from "react";
import { Plus, Trash2, ChevronLeft, CheckCircle, Save } from "lucide-react";
const Step3Details = ({ formData, handleChange, setStep, handleSubmit, isEdit = false }) => {
    const addVariation = () => {
        handleChange("variations", [
            ...formData.variations,
            { color: "", options: [] },
        ]);
    };
    const updateVariationColor = (index, color) => {
        const newVariations = [...formData.variations];
        newVariations[index].color = color;
        handleChange("variations", newVariations);
    };
    const addOption = (index) => {
        const newVariations = [...formData.variations];
        newVariations[index].options.push({
            name: "",
            additionalPrice: 0,
            stock: 0,
        });
        handleChange("variations", newVariations);
    };
    const updateOption = (varIndex, optIndex, field, value) => {
        const newVariations = [...formData.variations];
        newVariations[varIndex].options[optIndex][field] = value;
        handleChange("variations", newVariations);
    };
    const removeVariation = (index) => {
        const newVariations = formData.variations.filter((_, i) => i !== index);
        handleChange("variations", newVariations);
    };
    return (_jsxs("div", { className: "animate-fade-in-up", children: [_jsx("h2", { className: "text-2xl font-bold mb-6 gradient-text flex items-center gap-2", children: "Chi ti\u1EBFt & Bi\u1EBFn th\u1EC3" }), _jsxs("div", { className: "mb-8", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("label", { className: "text-lg font-bold text-gray-700 flex items-center gap-2", children: "Bi\u1EBFn th\u1EC3 s\u1EA3n ph\u1EA9m" }), _jsxs("button", { onClick: addVariation, type: "button", className: "bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2", children: [_jsx(Plus, { className: "w-5 h-5" }), " Th\u00EAm bi\u1EBFn th\u1EC3"] })] }), formData.variations.length === 0 ? (_jsxs("div", { className: "text-center py-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50", children: [_jsx("p", { className: "text-gray-600 font-medium", children: "Ch\u01B0a c\u00F3 bi\u1EBFn th\u1EC3 n\u00E0o" }), _jsx("p", { className: "text-sm text-gray-400 mt-2", children: "Nh\u1EA5n \"Th\u00EAm bi\u1EBFn th\u1EC3\" \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u" })] })) : (_jsx("div", { className: "space-y-4", children: formData.variations.map((v, i) => (_jsxs("div", { className: "bg-[#2F5EE9]/10 border-2 border-[#2F5EE9]/30 rounded-xl p-6 shadow-lg animate-fade-in-up", style: { animationDelay: `${i * 0.1}s` }, children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-sm font-bold text-gray-700 mb-2", children: "Lo\u1EA1i s\u1EA3n ph\u1EA9m:" }), _jsx("input", { placeholder: "VD: M\u00E0u s\u1EAFc, ch\u1EA5t li\u1EC7u, k\u00EDch th\u01B0\u1EDBc...", className: "w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2F5EE9] focus:border-transparent transition-all duration-300 font-medium", value: v.color, onChange: (e) => updateVariationColor(i, e.target.value) })] }), _jsxs("button", { onClick: () => removeVariation(i), type: "button", className: "ml-4 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2", children: [_jsx(Trash2, { className: "w-5 h-5" }), " X\u00F3a"] })] }), v.options.length === 0 ? (_jsx("div", { className: "text-center py-6 border-2 border-dashed border-gray-300 rounded-xl bg-white/50 mb-4", children: _jsx("p", { className: "text-gray-500 text-sm", children: "Ch\u01B0a c\u00F3 t\u00F9y ch\u1ECDn n\u00E0o" }) })) : (_jsx("div", { className: "space-y-3 mb-4", children: v.options.map((opt, j) => (_jsx("div", { className: "bg-white rounded-xl p-4 border-2 border-gray-200 shadow-md", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-gray-700 mb-2", children: "T\u00EAn t\u00F9y ch\u1ECDn" }), _jsx("input", { placeholder: "VD: 128GB, XL, 500g", className: "w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F5EE9] focus:border-transparent transition-all duration-300 font-medium text-sm", value: opt.name, onChange: (e) => updateOption(i, j, "name", e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-gray-700 mb-2", children: "Gi\u00E1 c\u1ED9ng th\u00EAm" }), _jsx("input", { type: "number", placeholder: "0", className: "w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F5EE9] focus:border-transparent transition-all duration-300 font-medium text-sm", value: opt.additionalPrice, onChange: (e) => updateOption(i, j, "additionalPrice", Number(e.target.value)) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-gray-700 mb-2", children: "S\u1ED1 l\u01B0\u1EE3ng t\u1ED3n" }), _jsx("input", { type: "number", placeholder: "0", className: "w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F5EE9] focus:border-transparent transition-all duration-300 font-medium text-sm", value: opt.stock, onChange: (e) => updateOption(i, j, "stock", Number(e.target.value)) })] })] }) }, j))) })), _jsxs("button", { type: "button", onClick: () => addOption(i), className: "bg-[#2F5EE9] text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2 text-sm hover:bg-[#374151]", children: [_jsx(Plus, { className: "w-4 h-4" }), " Th\u00EAm t\u00F9y ch\u1ECDn"] })] }, i))) }))] }), _jsx("div", { className: "mt-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl", children: _jsxs("p", { className: "text-green-700 font-medium flex items-center gap-2", children: [_jsx(CheckCircle, { className: "w-5 h-5" }), " B\u1EA1n \u0111\u00E3 ho\u00E0n th\u00E0nh t\u1EA5t c\u1EA3 c\u00E1c b\u01B0\u1EDBc! Nh\u1EA5n n\u00FAt b\u00EAn d\u01B0\u1EDBi \u0111\u1EC3 ", isEdit ? "cập nhật" : "tạo", " s\u1EA3n ph\u1EA9m."] }) }), _jsxs("div", { className: "flex justify-between mt-8", children: [_jsxs("button", { type: "button", className: "bg-gradient-to-r from-gray-400 to-gray-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2", onClick: () => setStep(2), children: [_jsx(ChevronLeft, { className: "w-5 h-5" }), " Quay l\u1EA1i"] }), _jsx("button", { type: "button", className: `${isEdit
                            ? "bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700"
                            : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"} text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2`, onClick: handleSubmit, children: isEdit ? (_jsxs(_Fragment, { children: [_jsx(Save, { className: "w-5 h-5" }), " C\u1EADp nh\u1EADt s\u1EA3n ph\u1EA9m"] })) : (_jsxs(_Fragment, { children: [_jsx(CheckCircle, { className: "w-5 h-5" }), " T\u1EA1o s\u1EA3n ph\u1EA9m"] })) })] })] }));
};
export default Step3Details;
