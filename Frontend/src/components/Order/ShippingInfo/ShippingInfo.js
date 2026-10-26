import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, MapPin, Phone, User, Building2, FileText, Clock, Share2, Loader2, AlertTriangle, XCircle } from "lucide-react";
import messageApi from "../../../api/messageApi";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";
export default function ShippingInfo({ orderCode, shippingAddress, shippingInfo, ownerId, order, storeName, }) {
    const [isSharing, setIsSharing] = useState(false);
    const navigate = useNavigate();
    // Convert estimatedDelivery nếu là object, nếu không có thì fallback thành now
    let estimatedDeliveryTime = Date.now();
    if (shippingInfo.estimatedDelivery) {
        if (typeof shippingInfo.estimatedDelivery === "number") {
            estimatedDeliveryTime = shippingInfo.estimatedDelivery;
        }
        else if (shippingInfo.estimatedDelivery.$date?.$numberLong) {
            estimatedDeliveryTime = parseInt(shippingInfo.estimatedDelivery.$date.$numberLong);
        }
    }
    const deliveryDate = new Date(estimatedDeliveryTime);
    // Format thông tin order thành message text
    const formatOrderMessage = (order) => {
        if (!order)
            return "";
        const currentStatus = order.statusHistory[order.statusHistory.length - 1];
        const statusMap = {
            pending: "Đã đặt hàng",
            confirmed: "Đã xác nhận",
            packed: "Đã đóng gói",
            shipped: "Đang vận chuyển",
            delivered: "Đã giao hàng",
            received: "Đã nhận hàng",
            cancelled: "Đã hủy",
        };
        let message = `Thông tin đơn hàng #${order.orderCode}\n\n`;
        message += `Sản phẩm:\n`;
        order.items.forEach((item, index) => {
            message += `${index + 1}. ${item.name} x${item.quantity} - ${item.subtotal.toLocaleString("vi-VN")}₫\n`;
        });
        message += `\nChi tiết thanh toán:\n`;
        message += `- Tạm tính: ${order.subtotal.toLocaleString("vi-VN")}₫\n`;
        message += `- Phí vận chuyển: ${order.shippingFee.toLocaleString("vi-VN")}₫\n`;
        if (order.discount > 0) {
            message += `- Giảm giá: -${order.discount.toLocaleString("vi-VN")}₫\n`;
        }
        message += `- Tổng tiền: ${order.total.toLocaleString("vi-VN")}₫\n`;
        message += `\nPhương thức thanh toán: ${order.paymentInfo.method}\n`;
        message += `Trạng thái: ${statusMap[currentStatus.status] || currentStatus.status}\n`;
        message += `\nĐịa chỉ giao hàng:\n`;
        message += `${shippingAddress.fullName}\n`;
        message += `${shippingAddress.phone}\n`;
        message += `${shippingAddress.address}`;
        message += `\n\nXem chi tiết đơn hàng: ${window.location.origin}/order/${order._id}`;
        return message;
    };
    const handleShareOrder = async () => {
        if (!ownerId || !order) {
            toast.warning(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "text-yellow-500", size: 18 }), _jsx("span", { children: "Kh\u00F4ng t\u00ECm th\u1EA5y th\u00F4ng tin ch\u1EE7 c\u1EEDa h\u00E0ng ho\u1EB7c \u0111\u01A1n h\u00E0ng" })] }));
            return;
        }
        try {
            // Lấy user hiện tại
            const storedUser = localStorage.getItem("user");
            if (!storedUser) {
                toast.warning(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "text-yellow-500", size: 18 }), _jsx("span", { children: "Vui l\u00F2ng \u0111\u0103ng nh\u1EADp \u0111\u1EC3 chia s\u1EBB \u0111\u01A1n h\u00E0ng" })] }));
                return;
            }
            const currentUser = JSON.parse(storedUser);
            const senderId = currentUser._id || currentUser.id;
            if (!senderId) {
                toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: "Kh\u00F4ng t\u00ECm th\u1EA5y ID ng\u01B0\u1EDDi d\u00F9ng" })] }));
                return;
            }
            setIsSharing(true);
            // Lấy thông tin chủ cửa hàng (owner)
            let ownerName = storeName || "Cửa hàng";
            let ownerAvatar = "/avatar-placeholder.svg";
            try {
                const ownerRes = await axiosClient.get(`/api/users/${ownerId}`);
                if (ownerRes.data?.user) {
                    ownerName = ownerRes.data.user.fullName || ownerRes.data.user.name || ownerName;
                    ownerAvatar = ownerRes.data.user.avatarUrl || ownerAvatar;
                }
            }
            catch (err) {
                console.warn("Không thể lấy thông tin chủ cửa hàng, sử dụng tên mặc định");
            }
            // Tạo hoặc lấy conversation
            const convRes = await messageApi.getOrCreateConversation({
                senderId,
                receiverId: ownerId,
            });
            const conversation = convRes.data;
            const conversationId = conversation._id || conversation;
            // Format message với thông tin order
            const orderMessage = formatOrderMessage(order);
            // Gửi message - backend yêu cầu field là "sender" không phải "senderId"
            await axiosClient.post("/api/messages/send", {
                conversationId,
                sender: senderId,
                text: orderMessage,
            });
            // Lấy thông tin conversation và messages để navigate
            const msgRes = await axiosClient.get(`/api/messages/${conversationId}`);
            const initialMessages = msgRes.data || [];
            // Navigate đến trang message (room chat) với tên chủ cửa hàng
            navigate(`/messages/${conversationId}`, {
                state: {
                    chatUser: {
                        _id: ownerId,
                        name: ownerName,
                        avatar: ownerAvatar,
                    },
                    initialMessages,
                    fromOrderShare: true,
                },
            });
        }
        catch (error) {
            console.error("Lỗi khi chia sẻ đơn hàng:", error);
            toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: error.response?.data?.message || "Lỗi khi chia sẻ đơn hàng. Vui lòng thử lại!" })] }));
        }
        finally {
            setIsSharing(false);
        }
    };
    return (_jsx(_Fragment, { children: _jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up", children: [_jsxs("div", { className: "bg-[#4B5563]/5 p-4 sm:p-6 border-b-2 border-gray-200", children: [_jsxs("h2", { className: "text-xl sm:text-2xl font-bold text-[#4B5563] flex items-center gap-2 sm:gap-3", children: [_jsx(Truck, { className: "w-5 h-5 sm:w-6 sm:h-6" }), "Th\u00F4ng tin v\u1EADn chuy\u1EC3n"] }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: "Chi ti\u1EBFt \u0111\u1ECBa ch\u1EC9 v\u00E0 v\u1EADn \u0111\u01A1n" })] }), _jsxs("div", { className: "p-4 sm:p-6 space-y-3 sm:space-y-4", children: [_jsxs("div", { className: "p-3 sm:p-4 bg-[#4B5563]/5 border-2 border-[#4B5563]/40 rounded-lg sm:rounded-xl", children: [_jsxs("p", { className: "font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm sm:text-base", children: [_jsx(MapPin, { className: "w-4 h-4 sm:w-5 sm:h-5" }), "\u0110\u1ECBa ch\u1EC9 giao h\u00E0ng"] }), _jsx("p", { className: "text-gray-700 mb-2 text-xs sm:text-sm break-words", children: shippingAddress.address }), _jsxs("p", { className: "text-gray-700 text-xs sm:text-sm break-words flex items-center gap-1", children: [_jsx(Phone, { className: "w-3 h-3 flex-shrink-0" }), shippingAddress.phone] }), _jsxs("p", { className: "text-gray-700 text-xs sm:text-sm break-words flex items-center gap-1", children: [_jsx(User, { className: "w-3 h-3 flex-shrink-0" }), shippingAddress.fullName] })] }), _jsxs("div", { className: "space-y-2 sm:space-y-3", children: [_jsxs("div", { className: "flex justify-between items-center p-3 bg-gray-50 rounded-lg sm:rounded-xl gap-2", children: [_jsxs("span", { className: "font-semibold flex items-center gap-2 text-xs sm:text-sm", children: [_jsx(Building2, { className: "w-3 h-3 sm:w-4 sm:h-4" }), "\u0110\u01A1n v\u1ECB v\u1EADn chuy\u1EC3n"] }), _jsx("span", { className: "font-bold text-gray-900 text-xs sm:text-sm break-words", children: shippingInfo.method })] }), _jsxs("div", { className: "flex justify-between items-center p-3 bg-gray-50 rounded-lg sm:rounded-xl gap-2", children: [_jsxs("span", { className: "font-semibold flex items-center gap-2 text-xs sm:text-sm", children: [_jsx(FileText, { className: "w-3 h-3 sm:w-4 sm:h-4" }), "M\u00E3 v\u1EADn \u0111\u01A1n"] }), _jsx("span", { className: "font-bold text-[#4B5563] text-xs sm:text-sm break-all", children: shippingInfo.trackingNumber || orderCode })] }), _jsxs("div", { className: "flex justify-between items-center p-3 bg-[#4B5563]/5 border-2 border-[#4B5563]/40 rounded-lg sm:rounded-xl gap-2", children: [_jsxs("span", { className: "font-semibold flex items-center gap-2 text-xs sm:text-sm", children: [_jsx(Clock, { className: "w-3 h-3 sm:w-4 sm:h-4" }), "D\u1EF1 ki\u1EBFn giao"] }), _jsx("span", { className: "font-bold text-orange-700 text-xs sm:text-sm break-words", children: deliveryDate.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) })] })] }), ownerId && order && (_jsx("button", { onClick: handleShareOrder, disabled: isSharing, className: "w-full py-2.5 sm:py-3 px-4 bg-[#4B5563] text-white font-bold rounded-lg sm:rounded-xl hover:bg-[#374151] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 mt-3 sm:mt-4 text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed", children: isSharing ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 sm:w-5 sm:h-5 animate-spin" }), "\u0110ang chia s\u1EBB..."] })) : (_jsxs(_Fragment, { children: [_jsx(Share2, { className: "w-4 h-4 sm:w-5 sm:h-5" }), "Chia s\u1EBB \u0111\u01A1n h\u00E0ng"] })) }))] })] }) }));
}
