import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useRef, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import userApi from "../../../api/userApi";
import { toast } from "react-toastify";
const StoreRegisterForm = ({ onClose, onSuccess }) => {
    const logoRef = useRef(null);
    const bannerRef = useRef(null);
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        description: "",
        storeAddress: "",
        contactPhone: "",
        contactEmail: "",
    });
    const [logoPreview, setLogoPreview] = useState(null);
    const [bannerPreview, setBannerPreview] = useState(null);
    // 🧩 Cập nhật input text
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    // 🧩 Cập nhật file + preview
    const handleFileChange = (e, type) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            if (type === "logo")
                setLogoPreview(url);
            if (type === "banner")
                setBannerPreview(url);
        }
    };
    // 🧩 Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const form = new FormData();
            form.append("name", formData.name);
            form.append("category", formData.category);
            form.append("description", formData.description);
            form.append("storeAddress", formData.storeAddress);
            form.append("contactPhone", formData.contactPhone);
            form.append("contactEmail", formData.contactEmail);
            if (logoRef.current?.files?.[0])
                form.append("logo", logoRef.current.files[0]);
            if (bannerRef.current?.files?.[0])
                form.append("banner", bannerRef.current.files[0]);
            const res = await userApi.requestSeller(form);
            toast.success(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CheckCircle, { className: "text-green-500", size: 18 }), _jsx("span", { children: res.data?.message || "Đăng ký cửa hàng thành công!" })] }));
            onSuccess?.();
            onClose?.();
        }
        catch (error) {
            console.error("❌ Lỗi khi tạo cửa hàng:", error);
            toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: error?.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!" })] }));
        }
    };
    return (_jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg max-w-xl mx-auto p-4 sm:p-6 md:p-8", children: [_jsxs("div", { className: "flex flex-col items-center mb-4 sm:mb-6", children: [_jsx("div", { className: "bg-[#4B5563] rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mb-2", children: _jsxs("svg", { width: "24", height: "24", className: "sm:w-8 sm:h-8", fill: "none", viewBox: "0 0 24 24", children: [_jsx("rect", { x: "4", y: "7", width: "16", height: "10", rx: "2", stroke: "#fff", strokeWidth: "2" }), _jsx("path", { d: "M2 7l10-5 10 5", stroke: "#fff", strokeWidth: "2" })] }) }), _jsx("h2", { className: "font-bold text-lg sm:text-xl mb-1", children: "\u0110\u0103ng k\u00FD m\u1EDF c\u1EEDa h\u00E0ng" }), _jsx("p", { className: "text-gray-500 text-center text-sm sm:text-base px-2", children: "\u0110i\u1EC1n th\u00F4ng tin \u0111\u1EC3 t\u1EA1o c\u1EEDa h\u00E0ng c\u1EE7a b\u1EA1n tr\u00EAn MDUC247" })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "font-medium text-xs sm:text-sm mb-1 block", children: ["T\u00EAn c\u1EEDa h\u00E0ng ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", name: "name", value: formData.name, onChange: handleChange, className: "w-full border rounded-lg px-3 py-2 text-sm sm:text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:border-transparent", placeholder: "VD: Th\u1EDDi trang ABC Store", required: true })] }), _jsxs("div", { children: [_jsxs("label", { className: "font-medium text-xs sm:text-sm mb-1 block", children: ["Danh m\u1EE5c kinh doanh ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs("select", { name: "category", value: formData.category, onChange: handleChange, className: "w-full border rounded-lg px-3 py-2 text-sm sm:text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:border-transparent", required: true, children: [_jsx("option", { value: "", children: "Ch\u1ECDn danh m\u1EE5c ch\u00EDnh" }), _jsx("option", { value: "fashion", children: "Th\u1EDDi trang" }), _jsx("option", { value: "electronics", children: "\u0110i\u1EC7n t\u1EED" }), _jsx("option", { value: "books", children: "S\u00E1ch" }), _jsx("option", { value: "home", children: "Nh\u00E0 c\u1EEDa" }), _jsx("option", { value: "other", children: "Kh\u00E1c" })] })] })] }), _jsxs("div", { className: "mb-4", children: [_jsxs("label", { className: "font-medium text-xs sm:text-sm mb-1 block", children: ["M\u00F4 t\u1EA3 c\u1EEDa h\u00E0ng ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("textarea", { name: "description", value: formData.description, onChange: handleChange, className: "w-full border rounded-lg px-3 py-2 text-sm sm:text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none", rows: 3, placeholder: "M\u00F4 t\u1EA3 v\u1EC1 s\u1EA3n ph\u1EA9m, d\u1ECBch v\u1EE5 v\u00E0 cam k\u1EBFt c\u1EE7a c\u1EEDa h\u00E0ng...", required: true })] }), _jsxs("div", { className: "mb-4", children: [_jsxs("label", { className: "font-medium text-xs sm:text-sm mb-1 block", children: ["\u0110\u1ECBa ch\u1EC9 c\u1EEDa h\u00E0ng ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", name: "storeAddress", value: formData.storeAddress, onChange: handleChange, className: "w-full border rounded-lg px-3 py-2 text-sm sm:text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:border-transparent", placeholder: "S\u1ED1 nh\u00E0, \u0111\u01B0\u1EDDng, ph\u01B0\u1EDDng/x\u00E3, qu\u1EADn/huy\u1EC7n, t\u1EC9nh/th\u00E0nh ph\u1ED1", required: true })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4", children: [_jsxs("div", { children: [_jsx("label", { className: "font-medium text-xs sm:text-sm mb-1 block", children: "S\u1ED1 \u0111i\u1EC7n tho\u1EA1i li\u00EAn h\u1EC7" }), _jsx("input", { type: "text", name: "contactPhone", value: formData.contactPhone, onChange: handleChange, className: "w-full border rounded-lg px-3 py-2 text-sm sm:text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:border-transparent", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "font-medium text-xs sm:text-sm mb-1 block", children: "Email li\u00EAn h\u1EC7" }), _jsx("input", { type: "email", name: "contactEmail", value: formData.contactEmail, onChange: handleChange, className: "w-full border rounded-lg px-3 py-2 text-sm sm:text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:border-transparent", required: true })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4", children: [_jsxs("div", { className: "border rounded-lg p-3 sm:p-4 flex flex-col items-center", children: [_jsx("label", { className: "font-medium text-xs sm:text-sm mb-2 block", children: "Logo c\u1EEDa h\u00E0ng" }), logoPreview && (_jsx("img", { src: logoPreview, alt: "Logo Preview", className: "w-20 h-20 sm:w-24 sm:h-24 object-cover rounded mb-2 border" })), _jsx("div", { className: "mb-2 text-gray-400 text-xs text-center", children: "Logo vu\u00F4ng (khuy\u1EBFn ngh\u1ECB)" }), _jsx("button", { type: "button", className: "bg-gray-100 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm text-gray-700 hover:bg-gray-200 transition", onClick: () => logoRef.current?.click(), children: "Ch\u1ECDn \u1EA3nh" }), _jsx("input", { type: "file", ref: logoRef, className: "hidden", accept: "image/*", onChange: (e) => handleFileChange(e, "logo") })] }), _jsxs("div", { className: "border rounded-lg p-3 sm:p-4 flex flex-col items-center", children: [_jsx("label", { className: "font-medium text-xs sm:text-sm mb-2 block", children: "\u1EA2nh b\u00ECa c\u1EEDa h\u00E0ng" }), bannerPreview && (_jsx("img", { src: bannerPreview, alt: "Banner Preview", className: "w-full max-w-[200px] sm:w-40 h-16 sm:h-20 object-cover rounded mb-2 border" })), _jsx("div", { className: "mb-2 text-gray-400 text-xs text-center", children: "T\u1EF7 l\u1EC7 16:9 (khuy\u1EBFn ngh\u1ECB)" }), _jsx("button", { type: "button", className: "bg-gray-100 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm text-gray-700 hover:bg-gray-200 transition", onClick: () => bannerRef.current?.click(), children: "Ch\u1ECDn \u1EA3nh" }), _jsx("input", { type: "file", ref: bannerRef, className: "hidden", accept: "image/*", onChange: (e) => handleFileChange(e, "banner") })] })] }), _jsxs("div", { className: "bg-[#4B5563]/10 border border-[#4B5563]/40 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-gray-700 mb-4 sm:mb-6", children: [_jsx("div", { className: "font-semibold mb-2", children: "L\u01B0u \u00FD quan tr\u1ECDng:" }), _jsxs("ul", { className: "list-disc ml-4 sm:ml-5 space-y-1", children: [_jsx("li", { children: "Th\u00F4ng tin c\u1EEDa h\u00E0ng s\u1EBD \u0111\u01B0\u1EE3c hi\u1EC3n th\u1ECB c\u00F4ng khai v\u1EDBi kh\u00E1ch h\u00E0ng" }), _jsx("li", { children: "Sau khi \u0111\u0103ng k\u00FD, b\u1EA1n c\u00F3 th\u1EC3 ch\u1EC9nh s\u1EEDa th\u00F4ng tin trong ph\u1EA7n qu\u1EA3n l\u00FD c\u1EEDa h\u00E0ng" }), _jsx("li", { children: "MDUC247 s\u1EBD xem x\u00E9t y\u00EAu c\u1EA7u \u0111\u0103ng k\u00FD c\u1EEDa h\u00E0ng c\u1EE7a b\u1EA1n" })] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3 sm:gap-4", children: [_jsxs("button", { type: "submit", className: "flex-1 bg-[#4B5563] text-white font-semibold py-2.5 sm:py-3 rounded-lg hover:bg-[#374151] transition text-sm sm:text-base", children: [_jsx("span", { className: "inline-block align-middle mr-2", children: "+" }), " T\u1EA1o c\u1EEDa h\u00E0ng"] }), _jsx("button", { type: "button", className: "flex-1 bg-gray-100 text-gray-700 font-semibold py-2.5 sm:py-3 rounded-lg hover:bg-gray-200 transition text-sm sm:text-base", onClick: onClose, children: "H\u1EE7y" })] })] })] }));
};
export default StoreRegisterForm;
