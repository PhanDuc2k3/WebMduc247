import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Calendar, Circle, Store, MessageCircle, AlertTriangle, XCircle } from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import FavoriteButton from "../../Favorite/FavoriteButton";
import { toast } from "react-toastify";
const StoreCard = ({ storeId, ownerId, name, description, logoUrl, bannerUrl, createdAt, isActive, customCategory, isOnline = false, }) => {
    const navigate = useNavigate();
    // Removed debug logs
    const handleChatNow = async () => {
        try {
            const stored = localStorage.getItem("user");
            if (!stored) {
                toast.warning(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "text-yellow-500", size: 18 }), _jsx("span", { children: "Vui l\u00F2ng \u0111\u0103ng nh\u1EADp \u0111\u1EC3 chat v\u1EDBi c\u1EEDa h\u00E0ng" })] }));
                return;
            }
            const currentUser = JSON.parse(stored);
            const senderId = currentUser._id || currentUser.id;
            const receiverId = ownerId;
            if (!senderId || !receiverId) {
                toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: "Kh\u00F4ng t\u00ECm th\u1EA5y ID ng\u01B0\u1EDDi d\u00F9ng ho\u1EB7c ch\u1EE7 c\u1EEDa h\u00E0ng" })] }));
                return;
            }
            // ✅ Tạo hoặc lấy conversation
            const res = await axiosClient.post("/api/messages/conversation", {
                senderId,
                receiverId,
            });
            const conversation = res.data.conversation || res.data;
            // ✅ Xây chatUser (vì BE không trả thông tin người nhận)
            const chatUser = {
                _id: receiverId,
                name: name || "Cửa hàng",
                avatar: logoUrl || "/visual-placeholder.svg",
            };
            // ✅ Lấy tin nhắn ban đầu
            const msgRes = await axiosClient.get(`/api/messages/${conversation._id}`);
            const initialMessages = msgRes.data || [];
            // ✅ Điều hướng đến trang chat + truyền dữ liệu
            navigate(`/messages/${conversation._id}`, {
                state: {
                    chatUser,
                    initialMessages,
                    fromStoreCard: true,
                },
            });
        }
        catch (err) {
            console.error("Lỗi khi mở chat:", err);
            toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: "Kh\u00F4ng th\u1EC3 m\u1EDF cu\u1ED9c tr\u00F2 chuy\u1EC7n. Vui l\u00F2ng th\u1EED l\u1EA1i." })] }));
        }
    };
    // 🕒 Thông tin hiển thị - xử lý date với nhiều format
    const getJoinDate = () => {
        if (!createdAt) {
            return "—";
        }
        try {
            const date = new Date(createdAt);
            if (isNaN(date.getTime())) {
                const altDate = new Date(createdAt.replace(/-/g, '/'));
                if (!isNaN(altDate.getTime())) {
                    return altDate.toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" });
                }
                return "—";
            }
            return date.toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" });
        }
        catch {
            return "—";
        }
    };
    const joinDate = getJoinDate();
    // Use real-time online status if available, otherwise fallback to isActive
    const showOnline = isOnline !== undefined ? isOnline : isActive;
    const statusText = showOnline ? "Đang online" : "Offline";
    const tags = customCategory ? [customCategory] : [];
    if (!storeId) {
        return (_jsxs("div", { className: "p-4 text-red-500 flex items-center gap-2", children: [_jsx(AlertCircle, { className: "w-5 h-5" }), _jsx("span", { children: "Kh\u00F4ng t\u00ECm th\u1EA5y c\u1EEDa h\u00E0ng" })] }));
    }
    return (_jsxs("div", { className: "canva-store-card bg-white border border-[#e8edf5] rounded-2xl transition-all duration-300 p-3 md:p-4 lg:p-5 flex flex-col overflow-hidden min-w-0 group", style: { position: 'relative', zIndex: 1 }, children: [bannerUrl && (_jsxs("div", { className: "h-24 sm:h-28 md:h-32 w-full overflow-hidden rounded-lg md:rounded-xl mb-3 md:mb-4 relative", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" }), _jsx("img", { src: bannerUrl, alt: name, className: "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110", loading: "lazy" }), _jsx("div", { className: "absolute top-1.5 right-1.5 md:top-2 md:right-2 z-20", children: _jsx(FavoriteButton, { storeId: storeId, iconSize: 16 }) })] })), !bannerUrl && (_jsx("div", { className: "absolute top-1.5 right-1.5 md:top-2 md:right-2 z-20", children: _jsx(FavoriteButton, { storeId: storeId, iconSize: 16 }) })), _jsxs("div", { className: "flex flex-col flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 md:gap-3 mb-2 md:mb-3 transform group-hover:translate-x-1 transition-transform duration-300", children: [logoUrl && (_jsxs("div", { className: "relative flex-shrink-0", children: [_jsx("div", { className: "absolute inset-0 bg-gray-500 rounded-full blur opacity-0 group-hover:opacity-30 transition-opacity duration-300" }), _jsx("img", { src: logoUrl, alt: name, className: "w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full border-2 border-gray-200 object-cover relative z-10 group-hover:border-gray-400 transition-all duration-300 group-hover:scale-110 shadow-lg" })] })), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-sm sm:text-base md:text-lg font-bold text-gray-900 group-hover:text-gray-600 transition-colors duration-300 truncate", children: name }), _jsxs("div", { className: "text-[10px] sm:text-xs text-gray-500 flex items-center gap-1 mt-0.5 md:mt-1", children: [_jsx(Calendar, { className: "w-3 h-3 flex-shrink-0" }), _jsx("span", { children: joinDate })] })] })] }), _jsx("div", { className: "text-gray-600 text-xs sm:text-sm mb-3 md:mb-4 flex-1 line-clamp-2 group-hover:text-gray-700 transition-colors duration-300", children: description }), _jsxs("div", { className: "flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4", children: [tags.map((tag, i) => (_jsx("span", { className: "text-[10px] sm:text-xs bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 px-2 py-0.5 md:px-3 md:py-1 rounded-full font-semibold shadow-sm group-hover:shadow-md transition-shadow duration-300", children: tag }, i))), _jsxs("span", { className: `text-[10px] sm:text-xs px-2 py-0.5 md:px-3 md:py-1 rounded-full font-semibold shadow-sm transition-all duration-300 flex items-center gap-1 ${showOnline
                                    ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 group-hover:from-green-200 group-hover:to-emerald-200"
                                    : "bg-gray-100 text-gray-600"}`, children: [_jsx(Circle, { className: `w-2 h-2 flex-shrink-0 ${showOnline ? "fill-green-600 text-green-600" : "fill-gray-600 text-gray-600"}` }), _jsx("span", { children: statusText })] })] }), _jsxs("div", { className: "mt-auto flex gap-2 md:gap-3", children: [_jsxs("button", { onClick: () => navigate(`/store/${storeId}`), className: "flex-1 bg-[#476de4] text-white py-2 md:py-2.5 rounded-xl font-bold text-xs sm:text-sm md:text-base hover:bg-[#375ac9] transition-all duration-200 touch-manipulation flex items-center justify-center gap-1.5 sm:gap-2", children: [_jsx(Store, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" }), _jsx("span", { children: "Xem c\u1EEDa h\u00E0ng" })] }), _jsxs("button", { onClick: handleChatNow, className: "flex-1 border border-[#e8edf5] text-[#586a84] py-2 md:py-2.5 rounded-xl font-bold text-xs sm:text-sm md:text-base hover:bg-[#f7f9fd] hover:border-[#476de4] hover:text-[#476de4] transition-all duration-200 touch-manipulation flex items-center justify-center gap-1.5 sm:gap-2", children: [_jsx(MessageCircle, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" }), _jsx("span", { children: "Chat" })] })] })] })] }));
};
export default StoreCard;
