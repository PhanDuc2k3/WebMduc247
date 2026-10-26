import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle, Store, LogOut, Gift, MessageCircle, Settings, Package } from "lucide-react";
import { useChat } from "../../context/chatContext";
const DropdownUser = ({ online, lastSeen, handleLogout, handleLogoutAll, setShowDropdown, userRole }) => {
    const navigate = useNavigate();
    const { unreadMessages } = useChat();
    const totalUnreadMessages = Object.values(unreadMessages).reduce((sum, count) => sum + count, 0);
    return (_jsxs("div", { className: "canva-user-menu absolute right-0 mt-2 bg-white border border-[#e8edf5] rounded-2xl shadow-xl w-64 p-2 z-50", children: [_jsxs("div", { className: "border-b border-gray-200 pb-2 mb-2", children: [_jsxs("button", { onClick: () => {
                            setShowDropdown(false);
                            navigate("/voucher");
                        }, className: "flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100", children: [_jsx(Gift, { className: "mr-2", size: 18 }), _jsx("span", { children: "Voucher" })] }), _jsxs("button", { onClick: () => {
                            setShowDropdown(false);
                            navigate("/message");
                        }, className: "flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-gray-100", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(MessageCircle, { className: "mr-2", size: 18 }), _jsx("span", { children: "Tin nh\u1EAFn" })] }), totalUnreadMessages > 0 && (_jsx("span", { className: "bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs px-2 py-0.5 rounded-full font-bold", children: totalUnreadMessages > 99 ? '99+' : totalUnreadMessages }))] })] }), _jsxs("button", { onClick: () => {
                    setShowDropdown(false);
                    navigate("/profile");
                }, className: "flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100", children: [_jsx(UserCircle, { className: "mr-2", size: 18 }), " Trang c\u00E1 nh\u00E2n"] }), _jsxs("button", { onClick: () => { setShowDropdown(false); navigate("/orders"); }, className: "flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100", children: [_jsx(Package, { className: "mr-2", size: 18 }), " \u0110\u01A1n h\u00E0ng c\u1EE7a t\u00F4i"] }), (userRole === "seller" || userRole === "admin") && (_jsxs("button", { onClick: () => {
                    setShowDropdown(false);
                    navigate("/mystore");
                }, className: "flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100", children: [_jsx(Store, { className: "mr-2", size: 18 }), " C\u1EEDa h\u00E0ng c\u1EE7a t\u00F4i"] })), userRole === "admin" && (_jsxs("button", { onClick: () => {
                    setShowDropdown(false);
                    navigate("/admin");
                }, className: "flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100 text-blue-600 font-semibold border-t border-gray-200 mt-1", children: [_jsx(Settings, { className: "mr-2", size: 18 }), " Qu\u1EA3n l\u00FD website"] })), _jsxs("button", { onClick: handleLogout, className: "flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100 text-red-600", children: [_jsx(LogOut, { className: "mr-2", size: 18 }), " \u0110\u0103ng xu\u1EA5t"] }), _jsxs("button", { onClick: handleLogoutAll, className: "flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100 text-red-600", children: [_jsx(LogOut, { className: "mr-2", size: 18 }), " \u0110\u0103ng xu\u1EA5t t\u1EA5t c\u1EA3 thi\u1EBFt b\u1ECB"] }), !online && lastSeen && (_jsxs("span", { className: "block text-xs text-gray-500 mt-2 px-3", children: ["Offline l\u00FAc ", new Date(lastSeen).toLocaleTimeString()] }))] }));
};
export default DropdownUser;
