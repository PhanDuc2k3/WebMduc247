import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useRef } from "react";
import { ArrowLeft, Image as ImageIcon, X, Package, Send, MessageCircle } from "lucide-react";
import messageApi from "../../../api/messageApi";
import { useChat } from "../../../context/chatContext";
import { useLocation } from "react-router-dom";
import { getSocket } from "../../../socket";
import OrderMessageCard from "../OrderMessageCard/OrderMessageCard";
import { toast } from "react-toastify";
const ChatWindow = ({ conversationId, currentUserId, disabled, chatUser, onBack, }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [newFiles, setNewFiles] = useState([]);
    const [preview, setPreview] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const messagesContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const location = useLocation();
    const socket = getSocket();
    const { setUnreadMessages } = useChat();
    useEffect(() => {
        if (location.state?.initialMessages?.length) {
            setMessages(location.state.initialMessages);
            // Mark as read when opening from initial messages
            const markAsRead = async () => {
                if (!conversationId || conversationId === "temp")
                    return;
                try {
                    await messageApi.markAsRead(conversationId, currentUserId);
                    setUnreadMessages((prev) => ({ ...prev, [conversationId]: 0 }));
                }
                catch (err) {
                    console.error("[ChatWindow] Error marking as read:", err);
                }
            };
            markAsRead();
        }
    }, [location.state, conversationId, currentUserId, setUnreadMessages]);
    useEffect(() => {
        if (!conversationId || conversationId === "temp")
            return;
        if (location.state?.initialMessages?.length)
            return;
        const fetchMessages = async () => {
            try {
                const res = await messageApi.getMessages(conversationId);
                setMessages(res.data);
                // Mark messages as read when opening chat
                try {
                    await messageApi.markAsRead(conversationId, currentUserId);
                    setUnreadMessages((prev) => ({ ...prev, [conversationId]: 0 }));
                }
                catch (err) {
                    console.error("[ChatWindow] Error marking as read:", err);
                }
            }
            catch (err) {
                console.error("[ChatWindow]  Lỗi fetch messages:", err);
            }
        };
        fetchMessages();
    }, [conversationId, currentUserId, setUnreadMessages]);
    useEffect(() => {
        if (!conversationId || !socket)
            return;
        console.log("[ChatWindow]  Join conversation:", conversationId);
        socket.emit("joinConversation", conversationId);
        const handleReceive = (msg) => {
            if (msg.conversationId !== conversationId)
                return;
            // Kiểm tra xem có phải là order share không
            const isOrderShare = msg.text?.includes("Thông tin đơn hàng") || /#ORD-/.test(msg.text || "");
            if (isOrderShare && msg.sender !== currentUserId) {
                // Hiển thị thông báo đặc biệt khi nhận order share
                toast.info(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Package, { className: "w-5 h-5 text-[#4B5563]" }), _jsxs("div", { children: [_jsx("strong", { className: "block", children: "\u0110\u00E3 nh\u1EADn \u0111\u01A1n h\u00E0ng m\u1EDBi" }), _jsxs("span", { className: "text-sm opacity-90", children: ["T\u1EEB ", chatUser.name] })] })] }), {
                    position: "top-right",
                    containerId: "general-toast",
                    autoClose: 5000,
                    style: {
                        background: "#1d4ed8",
                        color: "white",
                        borderRadius: "10px",
                        padding: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }
                });
            }
            setMessages((prev) => {
                if (msg.tempId) {
                    return prev.map((m) => (m._id === msg.tempId ? msg : m));
                }
                if (!prev.find((m) => m._id === msg._id))
                    return [...prev, msg];
                return prev;
            });
        };
        socket.on("receiveMessage", handleReceive);
        return () => {
            socket.off("receiveMessage", handleReceive);
        };
    }, [conversationId, socket]);
    useEffect(() => {
        messagesContainerRef.current?.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages]);
    const handleSelectFiles = (e) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (!files.length)
            return;
        setNewFiles(files);
        setPreview(files.map((f) => URL.createObjectURL(f)));
    };
    const handleOpenFileDialog = () => {
        if (!disabled)
            fileInputRef.current?.click();
    };
    const clearPreview = () => {
        setNewFiles([]);
        setPreview([]);
    };
    const handleSend = async () => {
        if (!conversationId || conversationId === "temp") {
            console.warn("[ChatWindow]  Không có conversationId hợp lệ để gửi tin.");
            return;
        }
        if (!newMessage.trim() && newFiles.length === 0)
            return;
        setIsSending(true);
        const tempId = Date.now().toString();
        const tempMsg = {
            _id: tempId,
            tempId,
            sender: currentUserId,
            text: newMessage.trim(),
            attachments: [],
            createdAt: new Date().toISOString(),
            conversationId,
        };
        let attachments = [];
        if (newFiles.length > 0) {
            const formData = new FormData();
            newFiles.forEach((f) => formData.append("attachments", f));
            formData.append("sender", currentUserId);
            formData.append("conversationId", conversationId);
            try {
                const res = await messageApi.sendMessage(formData);
                attachments = res.data.attachments || [];
            }
            catch (err) {
                console.error("[ChatWindow] Upload lỗi:", err);
            }
        }
        const payload = { ...tempMsg, attachments };
        socket?.emit("sendMessage", payload);
        setNewMessage("");
        clearPreview();
        setIsSending(false);
    };
    return (_jsxs("div", { className: "flex flex-col h-full overflow-hidden w-full bg-white", children: [_jsxs("div", { className: "flex-none p-3 md:p-4 lg:p-5 border-b-2 border-gray-200 bg-[#4B5563] flex items-center gap-2 md:gap-3 shadow-md flex-shrink-0", children: [onBack && (_jsx("button", { onClick: onBack, className: "md:hidden p-2 rounded-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center", "aria-label": "Quay l\u1EA1i danh s\u00E1ch", children: _jsx(ArrowLeft, { className: "w-6 h-6 text-white" }) })), chatUser.avatar && (_jsx("img", { src: chatUser.avatar, alt: chatUser.name, className: "w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 md:border-3 border-white shadow-lg" })), _jsx("h2", { className: "text-base md:text-xl font-bold text-white truncate flex-1", children: chatUser.name || "Chọn cuộc trò chuyện" })] }), _jsxs("div", { ref: messagesContainerRef, className: "flex-1 overflow-y-auto p-4 md:p-5 lg:p-6 space-y-3 md:space-y-4 bg-gradient-to-br from-gray-50 to-blue-50 custom-scrollbar min-h-0", children: [messages.length === 0 && (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-gray-400 px-4", children: [_jsx(MessageCircle, { className: "w-10 h-10 md:w-14 md:h-14 mb-3 md:mb-4 text-[#4B5563]" }), _jsx("p", { className: "text-sm sm:text-base md:text-lg font-medium text-center", children: "Ch\u01B0a c\u00F3 tin nh\u1EAFn n\u00E0o." }), _jsx("p", { className: "text-xs sm:text-sm md:text-sm mt-2 text-center", children: "B\u1EAFt \u0111\u1EA7u tr\u00F2 chuy\u1EC7n ngay b\u00E2y gi\u1EDD!" })] })), messages.map((msg) => {
                        const isMine = msg.sender === currentUserId;
                        const isOrderMessage = msg.text?.includes("Thông tin đơn hàng #") || msg.text?.includes("📦 Thông tin đơn hàng #");
                        return (_jsx("div", { className: `flex ${isMine ? "justify-end" : "justify-start"} ${msg.tempId ? "opacity-60" : ""}`, children: isOrderMessage ? (
                            // ✅ Order message - mobile 50%, desktop 40%
                            _jsx("div", { className: `w-full ${isMine ? "flex justify-end" : "flex justify-start"} px-2 md:px-4`, children: _jsxs("div", { className: "w-[50%] md:w-[40%] max-w-full", children: [_jsxs("div", { className: `text-[10px] md:text-xs font-semibold mb-1 ${isMine ? "text-right text-gray-600" : "text-left text-gray-600"}`, children: [new Date(msg.createdAt).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                }), msg.tempId && _jsx("span", { className: "italic", children: " (\u0110ang g\u1EEDi...)" })] }), _jsx(OrderMessageCard, { message: msg.text || "", isMine: isMine })] }) })) : (_jsxs("div", { className: "space-y-1 md:space-y-2 max-w-[85%] md:max-w-[60%] lg:max-w-[55%] xl:max-w-[50%]", children: [_jsxs("div", { className: `text-[10px] md:text-xs font-semibold px-2 ${isMine ? "text-right text-gray-600" : "text-left text-gray-600"}`, children: [new Date(msg.createdAt).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            }), msg.tempId && _jsx("span", { className: "italic", children: " (\u0110ang g\u1EEDi...)" })] }), _jsxs("div", { className: `p-3 md:p-4 lg:p-4 rounded-xl md:rounded-2xl w-fit max-w-full break-words shadow-md md:shadow-lg animate-fade-in-up ${isMine
                                            ? "bg-[#4B5563] text-white rounded-tr-none"
                                            : "bg-white text-gray-900 rounded-tl-none border-2 border-gray-200"}`, children: [msg.attachments?.length ? (_jsx("div", { className: "flex flex-wrap gap-1.5 md:gap-2 mb-1.5 md:mb-2", children: msg.attachments.map((a, i) => (_jsx("img", { src: a.url, alt: `attachment-${i}`, className: "w-24 h-24 md:w-32 md:h-32 object-cover rounded-lg md:rounded-xl shadow-md border-2 border-white" }, i))) })) : null, msg.text && (_jsx("div", { className: "font-medium text-sm md:text-base whitespace-pre-wrap", children: msg.text }))] })] })) }, msg._id));
                    })] }), _jsxs("div", { className: `flex-none p-3 md:p-4 lg:p-5 border-t-2 border-gray-200 flex flex-col gap-2 md:gap-3 bg-white shadow-lg flex-shrink-0 ${disabled ? "opacity-50 pointer-events-none" : ""}`, children: [preview.length > 0 && (_jsxs("div", { className: "flex gap-1.5 md:gap-2 relative p-2 md:p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg md:rounded-xl border-2 border-blue-200", children: [preview.map((src, i) => (_jsx("img", { src: src, alt: `preview-${i}`, className: "w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg md:rounded-xl shadow-md border-2 border-white" }, i))), _jsx("button", { onClick: clearPreview, className: "absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-300 transform hover:scale-110 shadow-lg", children: _jsx(XMarkIcon, { className: "h-4 w-4 md:h-5 md:w-5" }) })] })), _jsxs("div", { className: "flex items-center gap-2 md:gap-3", children: [_jsx("button", { type: "button", className: "w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-[#4B5563] text-white hover:bg-[#374151] transition-all duration-300 shadow-md md:shadow-lg hover:shadow-xl transform hover:scale-110 flex items-center justify-center flex-shrink-0", onClick: handleOpenFileDialog, disabled: disabled || isSending, children: _jsx(ImageIcon, { className: "h-5 w-5 md:h-6 md:w-6" }) }), _jsx("input", { type: "file", accept: "image/*", multiple: true, hidden: true, ref: fileInputRef, onChange: handleSelectFiles }), _jsx("input", { type: "text", placeholder: disabled ? "Bạn cần đăng nhập để chat..." : "Nhập tin nhắn...", className: "flex-1 p-2.5 md:p-4 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] outline-none transition-all duration-300 text-xs sm:text-sm md:text-base", value: newMessage, onChange: (e) => setNewMessage(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleSend(), disabled: disabled || isSending }), _jsx("button", { onClick: handleSend, className: `w-16 sm:w-20 md:w-28 h-10 md:h-12 bg-[#4B5563] text-white rounded-lg md:rounded-xl hover:bg-[#374151] flex items-center justify-center gap-1 md:gap-2 font-bold text-xs md:text-sm transition-all duration-300 shadow-md md:shadow-lg hover:shadow-xl transform hover:scale-105 flex-shrink-0 ${(disabled || isSending) && "opacity-50 cursor-not-allowed"}`, disabled: disabled || isSending, children: isSending ? (_jsxs(_Fragment, { children: [_jsx(Send, { className: "animate-spin h-4 w-4 md:h-5 md:w-5 text-white" }), _jsx("span", { className: "hidden sm:inline text-xs md:text-sm", children: "G\u1EEDi..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Send, { className: "w-4 h-4 md:w-5 md:h-5" }), _jsx("span", { className: "hidden sm:inline", children: "G\u1EEDi" })] })) })] })] })] }));
};
export default ChatWindow;
