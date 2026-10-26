import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { Mail, Lock, MapPin, X } from "lucide-react";
import userApi from "../../../api/userApi";
import { toast } from "react-toastify";
import Address from "../../Payment/Adress/Address";
const ProfileSettings = ({ onChangePassword, user, onUserUpdate }) => {
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [loadingEmailNotif, setLoadingEmailNotif] = useState(false);
    const [showAddressManagement, setShowAddressManagement] = useState(false);
    // Load user preferences
    useEffect(() => {
        if (user) {
            setEmailNotifications(user.emailNotifications ?? true);
        }
    }, [user]);
    const handleToggleEmailNotifications = async () => {
        const newValue = !emailNotifications;
        setLoadingEmailNotif(true);
        try {
            await userApi.updateEmailNotifications({ emailNotifications: newValue });
            setEmailNotifications(newValue);
            toast.success(newValue ? "Đã bật thông báo email" : "Đã tắt thông báo email");
        }
        catch (error) {
            const message = error.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
            toast.error(message);
        }
        finally {
            setLoadingEmailNotif(false);
        }
    };
    const handleAddressSelect = (id) => {
        // Address selection handled by Address component
        console.log("Selected address:", id);
    };
    if (showAddressManagement) {
        return (_jsxs("div", { className: "bg-white rounded-xl md:rounded-2xl shadow-lg border-2 border-gray-100 p-4 md:p-6 lg:p-8", children: [_jsxs("div", { className: "flex items-center justify-between mb-4 md:mb-6", children: [_jsx("h3", { className: "font-semibold text-lg sm:text-xl text-[#4B5563]", children: "Qu\u1EA3n l\u00FD \u0111\u1ECBa ch\u1EC9" }), _jsx("button", { onClick: () => setShowAddressManagement(false), className: "text-gray-400 hover:text-[#4B5563] transition-colors", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsx(Address, { onSelect: handleAddressSelect })] }));
    }
    return (_jsxs("div", { className: "bg-white rounded-xl md:rounded-2xl shadow-lg border-2 border-gray-100 p-4 md:p-6 lg:p-8", children: [_jsx("h3", { className: "font-semibold text-lg sm:text-xl mb-4 md:mb-6 text-[#4B5563]", children: "C\u00E0i \u0111\u1EB7t t\u00E0i kho\u1EA3n" }), _jsxs("div", { className: "space-y-3 md:space-y-4 lg:space-y-6", children: [_jsxs("div", { className: "border-2 border-[#4B5563]/15 rounded-lg md:rounded-xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "text-sm sm:text-base md:text-lg font-medium mb-1 flex items-center gap-2", children: [_jsx(Mail, { className: "w-4 h-4 sm:w-5 sm:h-5 text-[#4B5563]" }), "Th\u00F4ng b\u00E1o email"] }), _jsx("div", { className: "text-xs sm:text-sm md:text-base text-gray-500", children: "Nh\u1EADn th\u00F4ng b\u00E1o v\u1EC1 \u0111\u01A1n h\u00E0ng v\u00E0 khuy\u1EBFn m\u00E3i qua email" })] }), _jsx("button", { onClick: handleToggleEmailNotifications, disabled: loadingEmailNotif, className: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${emailNotifications ? "bg-[#4B5563]" : "bg-gray-300"} ${loadingEmailNotif ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`, children: _jsx("span", { className: `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailNotifications ? "translate-x-6" : "translate-x-1"}` }) })] }), _jsxs("div", { className: "border-2 border-[#4B5563]/15 rounded-lg md:rounded-xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "text-sm sm:text-base md:text-lg font-medium mb-1 flex items-center gap-2", children: [_jsx(Lock, { className: "w-4 h-4 sm:w-5 sm:h-5 text-[#4B5563]" }), "\u0110\u1ED5i m\u1EADt kh\u1EA9u"] }), _jsx("div", { className: "text-xs sm:text-sm md:text-base text-gray-500", children: "Thay \u0111\u1ED5i m\u1EADt kh\u1EA9u t\u00E0i kho\u1EA3n c\u1EE7a b\u1EA1n" })] }), _jsx("button", { onClick: onChangePassword, className: "bg-[#4B5563] text-white px-4 py-2 md:px-6 md:py-2.5 rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-semibold hover:bg-[#374151] transition-all duration-300 shadow-md hover:shadow-lg flex-shrink-0 w-full sm:w-auto", children: "\u0110\u1ED5i m\u1EADt kh\u1EA9u" })] }), _jsxs("div", { className: "border-2 border-[#4B5563]/15 rounded-lg md:rounded-xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "text-sm sm:text-base md:text-lg font-medium mb-1 flex items-center gap-2", children: [_jsx(MapPin, { className: "w-4 h-4 sm:w-5 sm:h-5 text-[#4B5563]" }), "\u0110\u1ECBa ch\u1EC9 giao h\u00E0ng"] }), _jsx("div", { className: "text-xs sm:text-sm md:text-base text-gray-500", children: "Qu\u1EA3n l\u00FD \u0111\u1ECBa ch\u1EC9 nh\u1EADn h\u00E0ng khi mua s\u1EAFm" })] }), _jsx("button", { onClick: () => setShowAddressManagement(true), className: "px-4 py-2 md:px-6 md:py-2.5 rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-semibold border-2 border-[#4B5563]/60 text-[#4B5563] bg-white hover:bg-[#4B5563]/5 transition-all duration-300 flex-shrink-0 w-full sm:w-auto", children: "Qu\u1EA3n l\u00FD" })] })] })] }));
};
export default ProfileSettings;
