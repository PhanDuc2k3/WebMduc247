import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone, Mail, MessageCircle, AlertTriangle, XCircle } from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";
const CustomerInfo = ({ customer }) => {
    const navigate = useNavigate();
    const handleMessage = async () => {
        try {
            const stored = localStorage.getItem("user");
            if (!stored) {
                toast.warning(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "text-yellow-500", size: 18 }), _jsx("span", { children: "Vui l\u00F2ng \u0111\u0103ng nh\u1EADp \u0111\u1EC3 nh\u1EAFn tin" })] }));
                return;
            }
            const currentUser = JSON.parse(stored);
            const senderId = currentUser._id || currentUser.id;
            const receiverId = customer.userId;
            if (!senderId || !receiverId) {
                toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: "Kh\u00F4ng t\u00ECm th\u1EA5y ID ng\u01B0\u1EDDi d\u00F9ng" })] }));
                return;
            }
            // Tạo hoặc lấy conversation
            const res = await axiosClient.post("/api/messages/conversation", {
                senderId,
                receiverId,
            });
            const conversation = res.data.conversation || res.data;
            // Xây chatUser
            const chatUser = {
                _id: receiverId,
                name: customer.fullName,
                avatar: customer.avatarUrl || "/avatar-placeholder.svg",
            };
            // Lấy tin nhắn ban đầu
            const msgRes = await axiosClient.get(`/api/messages/${conversation._id}`);
            const initialMessages = msgRes.data || [];
            // Điều hướng đến trang chat
            navigate(`/messages/${conversation._id}`, {
                state: {
                    chatUser,
                    initialMessages,
                },
            });
        }
        catch (err) {
            console.error("Lỗi khi mở chat:", err);
            toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: err.response?.data?.message || "Không thể mở cuộc trò chuyện. Vui lòng thử lại." })] }));
        }
    };
    return (_jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up", children: [_jsxs("div", { className: "bg-[#4B5563]/5 p-4 sm:p-6 border-b-2 border-gray-200", children: [_jsxs("h2", { className: "text-xl sm:text-2xl font-bold text-[#4B5563] flex items-center gap-2 sm:gap-3", children: [_jsx(User, { className: "w-5 h-5 sm:w-6 sm:h-6" }), "Th\u00F4ng tin ", customer.role === "Khách hàng" ? "khách hàng" : "cửa hàng"] }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: "Li\u00EAn h\u1EC7 v\u00E0 th\u00F4ng tin li\u00EAn l\u1EA1c" })] }), _jsxs("div", { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "flex items-start space-x-3 sm:space-x-4 mb-4 sm:mb-6", children: [_jsxs("div", { className: "relative flex-shrink-0", children: [_jsx("img", { src: customer.avatarUrl || "/avatar-placeholder.svg", alt: "Avatar", className: "w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-3 sm:border-4 border-[#4B5563] shadow-lg" }), _jsx("span", { className: "absolute bottom-0 right-0 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full border-2 border-white" })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h3", { className: "text-base sm:text-xl font-bold text-gray-900 mb-1 break-words", children: customer.fullName }), _jsx("p", { className: "text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 bg-[#4B5563]/10 text-[#4B5563] rounded-full inline-block mb-2 sm:mb-3", children: customer.role }), _jsxs("div", { className: "space-y-1.5 sm:space-y-2", children: [customer.phone && (_jsxs("p", { className: "text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2 break-words", children: [_jsx(Phone, { className: "w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" }), _jsx("span", { children: customer.phone })] })), customer.email && (_jsxs("p", { className: "text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2 break-words", children: [_jsx(Mail, { className: "w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" }), _jsx("span", { className: "break-all", children: customer.email })] }))] })] })] }), _jsx("div", { className: "flex flex-col space-y-2", children: _jsxs("button", { onClick: handleMessage, className: "w-full px-4 py-2.5 sm:py-3 bg-[#4B5563] text-white text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl hover:bg-[#374151] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2", children: [_jsx(MessageCircle, { className: "w-4 h-4 sm:w-5 sm:h-5" }), "Nh\u1EAFn tin"] }) })] })] }));
};
export default CustomerInfo;
