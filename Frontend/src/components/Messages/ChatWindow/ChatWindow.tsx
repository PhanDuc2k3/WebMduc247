import React, { useEffect, useState, useRef } from "react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ArrowLeft } from "lucide-react";
import messageApi from "../../../api/messageApi";
import { useChat } from "../../../context/chatContext";
import { useLocation } from "react-router-dom";
import { getSocket } from "../../../socket";
import OrderMessageCard from "../OrderMessageCard/OrderMessageCard";

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  disabled?: boolean;
  chatUser: {
    _id: string;
    name: string;
    avatar?: string;
  };
  onBack?: () => void;
}

interface Attachment {
  url: string;
  type?: string;
}

interface Message {
  _id: string;
  sender: string;
  text?: string;
  attachments?: Attachment[];
  createdAt: string;
  conversationId: string;
  tempId?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  currentUserId,
  disabled,
  chatUser,
  onBack,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const location = useLocation();
  const socket = getSocket();
  const { setUnreadMessages } = useChat();

  useEffect(() => {
    if (location.state?.initialMessages?.length) {
      setMessages(location.state.initialMessages);
      
      // Mark as read when opening from initial messages
      const markAsRead = async () => {
        if (!conversationId || conversationId === "temp") return;
        try {
          await messageApi.markAsRead(conversationId, currentUserId);
          setUnreadMessages((prev) => ({ ...prev, [conversationId]: 0 }));
        } catch (err) {
          console.error("[ChatWindow] Error marking as read:", err);
        }
      };
      markAsRead();
    }
  }, [location.state, conversationId, currentUserId, setUnreadMessages]);

  useEffect(() => {
    if (!conversationId || conversationId === "temp") return;
    if (location.state?.initialMessages?.length) return;

    const fetchMessages = async () => {
      try {
        const res = await messageApi.getMessages(conversationId);
        setMessages(res.data);
        
        // Mark messages as read when opening chat
        try {
          await messageApi.markAsRead(conversationId, currentUserId);
          setUnreadMessages((prev) => ({ ...prev, [conversationId]: 0 }));
        } catch (err) {
          console.error("[ChatWindow] Error marking as read:", err);
        }
      } catch (err) {
        console.error("[ChatWindow]  Lỗi fetch messages:", err);
      }
    };
    fetchMessages();
  }, [conversationId, currentUserId, setUnreadMessages]);

useEffect(() => {
  if (!conversationId || !socket) return;

  console.log("[ChatWindow]  Join conversation:", conversationId);
  socket.emit("joinConversation", conversationId);

  const handleReceive = (msg: Message) => {
    if (msg.conversationId !== conversationId) return;
    setMessages((prev) => {
      if (msg.tempId) {
        return prev.map((m) => (m._id === msg.tempId ? msg : m));
      }
      if (!prev.find((m) => m._id === msg._id)) return [...prev, msg];
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

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    setNewFiles(files);
    setPreview(files.map((f) => URL.createObjectURL(f)));
  };

  const handleOpenFileDialog = () => {
    if (!disabled) fileInputRef.current?.click();
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
    if (!newMessage.trim() && newFiles.length === 0) return;

    setIsSending(true);

    const tempId = Date.now().toString();
    const tempMsg: Message = {
      _id: tempId,
      tempId,
      sender: currentUserId,
      text: newMessage.trim(),
      attachments: [],
      createdAt: new Date().toISOString(),
      conversationId,
    };


    let attachments: Attachment[] = [];
    if (newFiles.length > 0) {
      const formData = new FormData();
      newFiles.forEach((f) => formData.append("attachments", f));
      formData.append("sender", currentUserId);
      formData.append("conversationId", conversationId);

      try {
        const res = await messageApi.sendMessage(formData as any);
        attachments = res.data.attachments || [];
      } catch (err) {
        console.error("[ChatWindow] Upload lỗi:", err);
      }
    }

    const payload = { ...tempMsg, attachments };
    socket?.emit("sendMessage", payload);

    setNewMessage("");
    clearPreview();
    setIsSending(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden w-full bg-white">
      {/* Header */}
      <div className="flex-none p-3 md:p-4 lg:p-5 border-b-2 border-gray-200 bg-gradient-to-r from-blue-500 to-purple-500 flex items-center gap-2 md:gap-3 shadow-md flex-shrink-0">
        {/* Back button - only on mobile */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-2 rounded-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center"
            aria-label="Quay lại danh sách"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
        )}
        {chatUser.avatar && (
          <img
            src={chatUser.avatar}
            alt={chatUser.name}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 md:border-3 border-white shadow-lg"
          />
        )}
        <h2 className="text-base md:text-xl font-bold text-white truncate flex-1">
          {chatUser.name || "Chọn cuộc trò chuyện"}
        </h2>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6 space-y-3 md:space-y-4 bg-gradient-to-br from-gray-50 to-blue-50 custom-scrollbar min-h-0"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4">
            <div className="text-4xl md:text-6xl mb-3 md:mb-4">💬</div>
            <p className="text-sm sm:text-base md:text-lg font-medium text-center">Chưa có tin nhắn nào.</p>
            <p className="text-xs sm:text-sm md:text-sm mt-2 text-center">Bắt đầu trò chuyện ngay bây giờ!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender === currentUserId;
          const isOrderMessage = msg.text?.includes("Thông tin đơn hàng #") || msg.text?.includes("📦 Thông tin đơn hàng #");

          return (
            <div
              key={msg._id}
              className={`flex ${isMine ? "justify-end" : "justify-start"} ${msg.tempId ? "opacity-60" : ""}`}
            >
              {isOrderMessage ? (
                // ✅ Order message - mobile 50%, desktop 40%
                <div className={`w-full ${isMine ? "flex justify-end" : "flex justify-start"} px-2 md:px-4`}>
                  <div className="w-[50%] md:w-[40%] max-w-full">
                    <div className={`text-[10px] md:text-xs font-semibold mb-1 ${
                      isMine ? "text-right text-gray-600" : "text-left text-gray-600"
                    }`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {msg.tempId && <span className="italic"> (Đang gửi...)</span>}
                    </div>
                    <OrderMessageCard message={msg.text || ""} isMine={isMine} />
                  </div>
                </div>
              ) : (
                <div className="space-y-1 md:space-y-2 max-w-[85%] md:max-w-[60%] lg:max-w-[55%] xl:max-w-[50%]">
                  <div
                    className={`text-[10px] md:text-xs font-semibold px-2 ${
                      isMine ? "text-right text-gray-600" : "text-left text-gray-600"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {msg.tempId && <span className="italic"> (Đang gửi...)</span>}
                  </div>
                  <div
                    className={`p-3 md:p-4 lg:p-4 rounded-xl md:rounded-2xl w-fit max-w-full break-words shadow-md md:shadow-lg animate-fade-in-up ${
                      isMine 
                        ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-tr-none" 
                        : "bg-white text-gray-900 rounded-tl-none border-2 border-gray-200"
                    }`}
                  >
                    {msg.attachments?.length ? (
                      <div className="flex flex-wrap gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                        {msg.attachments.map((a, i) => (
                          <img
                            key={i}
                            src={a.url}
                            alt={`attachment-${i}`}
                            className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-lg md:rounded-xl shadow-md border-2 border-white"
                          />
                        ))}
                      </div>
                    ) : null}
                    {msg.text && (
                      <div className="font-medium text-sm md:text-base whitespace-pre-wrap">{msg.text}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div
        className={`flex-none p-3 md:p-4 lg:p-5 border-t-2 border-gray-200 flex flex-col gap-2 md:gap-3 bg-white shadow-lg flex-shrink-0 ${
          disabled ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {preview.length > 0 && (
          <div className="flex gap-1.5 md:gap-2 relative p-2 md:p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg md:rounded-xl border-2 border-blue-200">
            {preview.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`preview-${i}`}
                className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg md:rounded-xl shadow-md border-2 border-white"
              />
            ))}
            <button
              onClick={clearPreview}
              className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-300 transform hover:scale-110 shadow-lg"
            >
              <XMarkIcon className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-md md:shadow-lg hover:shadow-xl transform hover:scale-110 flex items-center justify-center flex-shrink-0"
            onClick={handleOpenFileDialog}
            disabled={disabled || isSending}
          >
            <PhotoIcon className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            ref={fileInputRef}
            onChange={handleSelectFiles}
          />
          <input
            type="text"
            placeholder={
              disabled ? "Bạn cần đăng nhập để chat..." : "Nhập tin nhắn..."
            }
            className="flex-1 p-2.5 md:p-4 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 text-xs sm:text-sm md:text-base"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={disabled || isSending}
          />
          <button
            onClick={handleSend}
            className={`w-16 sm:w-20 md:w-28 h-10 md:h-12 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg md:rounded-xl hover:from-blue-600 hover:to-purple-700 flex items-center justify-center gap-1 md:gap-2 font-bold text-xs md:text-sm transition-all duration-300 shadow-md md:shadow-lg hover:shadow-xl transform hover:scale-105 flex-shrink-0 ${
              (disabled || isSending) && "opacity-50 cursor-not-allowed"
            }`}
            disabled={disabled || isSending}
          >
            {isSending ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 md:h-5 md:w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                <span className="hidden sm:inline text-xs md:text-sm">Gửi...</span>
              </>
            ) : (
              <>
                <span className="text-xs md:text-base">🚀</span>
                <span className="hidden sm:inline">Gửi</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
