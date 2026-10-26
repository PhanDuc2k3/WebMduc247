import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useRef } from "react";
import { FileText, Camera, Calendar, Users, User, Store, Crown, Check, X, Mail, Phone } from "lucide-react";
import userApi from "../../../api/userApi";
import { formatDisplayDate } from "../../../utils/formatDisplayDate";
import { showAvatarFallback } from "../../../utils/imageFallback";
const ProfileInfoDetail = ({ isEditing, onCancel, onUpdated, user, }) => {
    const [formData, setFormData] = useState(user);
    const [previewAvatar, setPreviewAvatar] = useState(user?.avatarUrl || null);
    const fileInputRef = useRef(null);
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewAvatar(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };
    const handleUpdate = async () => {
        try {
            if (!formData)
                return;
            // Lấy file avatar nếu có
            const avatarFile = fileInputRef.current?.files?.[0];
            // Gọi API axios
            const res = await userApi.updateProfile({ fullName: formData.fullName, phone: formData.phone }, avatarFile);
            // res.data.user là user mới trả về từ server
            if (onUpdated)
                onUpdated(res.data.user);
            window.dispatchEvent(new Event("userUpdated"));
        }
        catch (err) {
            console.error("Lỗi cập nhật:", err);
        }
    };
    const handleCancel = () => {
        setFormData(user);
        setPreviewAvatar(user?.avatarUrl || null);
        onCancel();
    };
    return (_jsxs("div", { className: "bg-white rounded-xl md:rounded-2xl shadow-lg border-2 border-gray-100 p-4 md:p-6 lg:p-8 animate-fade-in-up", children: [_jsxs("div", { className: "flex items-center gap-2 md:gap-3 mb-4 md:mb-6", children: [_jsx(FileText, { size: 20, className: "text-gray-700" }), _jsx("div", { className: "text-lg sm:text-xl md:text-2xl font-bold text-gray-900 gradient-text", children: "Th\u00F4ng tin c\u00E1 nh\u00E2n" })] }), isEditing && (_jsxs("div", { className: "flex flex-col items-center mb-6 md:mb-8 p-4 md:p-6 bg-[#F3F6FF] rounded-lg md:rounded-xl border border-[#E5E7EB]", children: [_jsx("div", { className: "relative mb-3 md:mb-4", children: _jsx("img", { src: previewAvatar || "/avatar-placeholder.svg", onError: showAvatarFallback, alt: "avatar", className: "w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full object-cover border-2 md:border-4 border-white shadow-2xl mb-2 md:mb-3" }) }), _jsx("input", { type: "file", accept: "image/*", ref: fileInputRef, onChange: handleAvatarChange, hidden: true }), _jsxs("button", { onClick: () => fileInputRef.current?.click(), className: "px-4 py-2 md:px-6 md:py-2.5 bg-[#4B5563] text-white rounded-lg md:rounded-xl hover:bg-[#374151] text-xs sm:text-sm md:text-base font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-1.5 md:gap-2", children: [_jsx(Camera, { size: 14 }), " Ch\u1ECDn \u1EA3nh \u0111\u1EA1i di\u1EC7n"] })] })), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8", children: [_jsxs("div", { className: "space-y-4 md:space-y-6", children: [_jsxs("div", { className: "p-3 md:p-4 bg-gray-50 rounded-lg md:rounded-xl border border-gray-200", children: [_jsxs("span", { className: "text-xs md:text-sm font-semibold text-gray-600 mb-1.5 md:mb-2 block flex items-center gap-1.5 md:gap-2", children: [_jsx(User, { size: 14, className: "md:w-4 md:h-4" }), " H\u1ECD v\u00E0 t\u00EAn"] }), isEditing ? (_jsx("input", { type: "text", name: "fullName", value: formData.fullName || "", onChange: handleChange, className: "w-full border-2 border-gray-300 rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 text-sm md:text-base lg:text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300" })) : (_jsx("div", { className: "text-sm md:text-base lg:text-lg font-bold text-gray-900", children: user.fullName }))] }), _jsxs("div", { className: "p-3 md:p-4 bg-gray-50 rounded-lg md:rounded-xl border border-gray-200", children: [_jsxs("span", { className: "text-xs md:text-sm font-semibold text-gray-600 mb-1.5 md:mb-2 block flex items-center gap-1.5 md:gap-2", children: [_jsx(Mail, { size: 14, className: "md:w-4 md:h-4" }), " Email"] }), _jsx("div", { className: "text-sm md:text-base lg:text-lg font-bold text-gray-900 break-words", children: user.email })] }), _jsxs("div", { className: "p-3 md:p-4 bg-gray-50 rounded-lg md:rounded-xl border border-gray-200", children: [_jsxs("span", { className: "text-xs md:text-sm font-semibold text-gray-600 mb-1.5 md:mb-2 block flex items-center gap-1.5 md:gap-2", children: [_jsx(Phone, { size: 14, className: "md:w-4 md:h-4" }), " S\u1ED1 \u0111i\u1EC7n tho\u1EA1i"] }), isEditing ? (_jsx("input", { type: "text", name: "phone", value: formData.phone || "", onChange: handleChange, className: "w-full border-2 border-gray-300 rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 text-sm md:text-base lg:text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300" })) : (_jsx("div", { className: "text-sm md:text-base lg:text-lg font-bold text-gray-900", children: user.phone || "Chưa cập nhật" }))] })] }), _jsxs("div", { className: "space-y-4 md:space-y-6", children: [_jsxs("div", { className: "p-3 md:p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg md:rounded-xl border border-green-200", children: [_jsxs("span", { className: "text-xs md:text-sm font-semibold text-gray-600 mb-1.5 md:mb-2 block flex items-center gap-1.5 md:gap-2", children: [_jsx(Calendar, { size: 14, className: "md:w-4 md:h-4" }), " Ng\u00E0y tham gia"] }), _jsx("div", { className: "text-sm md:text-base lg:text-lg font-bold text-gray-900", children: formatDisplayDate(user.createdAt) })] }), _jsxs("div", { className: "p-3 md:p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg md:rounded-xl border border-purple-200", children: [_jsxs("span", { className: "text-xs md:text-sm font-semibold text-gray-600 mb-1.5 md:mb-2 block flex items-center gap-1.5 md:gap-2", children: [_jsx(Users, { size: 14, className: "md:w-4 md:h-4" }), " Tr\u1EA1ng th\u00E1i t\u00E0i kho\u1EA3n"] }), user.role && (_jsx("span", { className: "inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-xs md:text-sm font-bold border-2 border-blue-300", children: user.role === "buyer" ? (_jsxs(_Fragment, { children: [_jsx(User, { size: 12, className: "md:w-3.5 md:h-3.5" }), " Ng\u01B0\u1EDDi mua"] })) : user.role === "seller" ? (_jsxs(_Fragment, { children: [_jsx(Store, { size: 12, className: "md:w-3.5 md:h-3.5" }), " Ng\u01B0\u1EDDi b\u00E1n"] })) : (_jsxs(_Fragment, { children: [_jsx(Crown, { size: 12, className: "md:w-3.5 md:h-3.5" }), " Admin"] })) }))] })] })] }), isEditing && (_jsxs("div", { className: "flex flex-col sm:flex-row gap-3 md:gap-4 mt-6 md:mt-8 justify-center sm:justify-start", children: [_jsxs("button", { onClick: handleUpdate, className: "px-6 md:px-8 py-2.5 md:py-3 bg-[#4B5563] text-white rounded-lg md:rounded-xl hover:bg-[#374151] text-xs sm:text-sm md:text-base font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2", children: [_jsx(Check, { size: 14, className: "md:w-4 md:h-4" }), " C\u1EADp nh\u1EADt"] }), _jsxs("button", { onClick: handleCancel, className: "px-6 md:px-8 py-2.5 md:py-3 border-2 border-gray-300 text-gray-700 rounded-lg md:rounded-xl hover:bg-gray-50 hover:border-gray-400 text-xs sm:text-sm md:text-base font-bold transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2", children: [_jsx(X, { size: 14, className: "md:w-4 md:h-4" }), " H\u1EE7y"] })] }))] }));
};
export default ProfileInfoDetail;
