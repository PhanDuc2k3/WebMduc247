import React, { useEffect, useState, useRef } from "react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import messageApi from "../../../api/messageApi";
import { useChat } from "../../../context/chatContext";
import { useLocation } from "react-router-dom";

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  disabled?: boolean;
  chatUser: {
    _id: string;
    name: string;
    avatar?: string;
  };
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
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { socket } = useChat();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.initialMessages?.length) {
      setMessages(location.state.initialMessages);
    }
  }, [location.state]);

  useEffect(() => {
    if (!conversationId || conversationId === "temp") return;
    if (location.state?.initialMessages?.length) return;

    const fetchMessages = async () => {
      try {
        const res = await messageApi.getMessages(conversationId);
        setMessages(res.data);
      } catch (err) {
        console.error("[ChatWindow]  Lỗi fetch messages:", err);
      }
    };
    fetchMessages();
  }, [conversationId]);

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
    <div className="flex flex-col border-2 border-gray-200 rounded-r-2xl h-[calc(100vh-110px)] overflow-hidden">
      {/* Header */}
      <div className="flex-none p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-500 to-purple-500 flex items-center gap-3 shadow-lg">
        {chatUser.avatar && (
          <img
            src={chatUser.avatar}
            alt={chatUser.name}
            className="w-12 h-12 rounded-full object-cover border-3 border-white shadow-lg"
          />
        )}
        <h2 className="text-xl font-bold text-white">
          {chatUser.name || "Chọn cuộc trò chuyện"}
        </h2>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-gray-50 to-blue-50"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg font-medium">Chưa có tin nhắn nào.</p>
            <p className="text-sm mt-2">Bắt đầu trò chuyện ngay bây giờ!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender === currentUserId;
          return (
            <div
              key={msg._id}
              className={`flex ${isMine ? "justify-end" : "justify-start"} ${msg.tempId ? "opacity-60" : ""}`}
            >
              <div className="space-y-2 max-w-md">
                <div
                  className={`text-xs font-semibold px-2 ${
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
                  className={`p-4 rounded-2xl w-fit max-w-md break-words shadow-lg animate-fade-in-up ${
                    isMine 
                      ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-tr-none" 
                      : "bg-white text-gray-900 rounded-tl-none border-2 border-gray-200"
                  }`}
                >
                  {msg.attachments?.length ? (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.attachments.map((a, i) => (
                        <img
                          key={i}
                          src={a.url}
                          alt={`attachment-${i}`}
                          className="w-32 h-32 object-cover rounded-xl shadow-md border-2 border-white"
                        />
                      ))}
                    </div>
                  ) : null}
                  {msg.text && <div className="font-medium">{msg.text}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div
        className={`flex-none p-4 border-t-2 border-gray-200 flex flex-col gap-3 bg-white ${
          disabled ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {preview.length > 0 && (
          <div className="flex gap-2 relative p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
            {preview.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`preview-${i}`}
                className="w-20 h-20 object-cover rounded-xl shadow-md border-2 border-white"
              />
            ))}
            <button
              onClick={clearPreview}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-300 transform hover:scale-110 shadow-lg"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110 flex items-center justify-center"
            onClick={handleOpenFileDialog}
            disabled={disabled || isSending}
          >
            <PhotoIcon className="h-6 w-6" />
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
              disabled ? "Bạn cần đăng nhập để chat..." : "💬 Nhập tin nhắn..."
            }
            className="flex-1 p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={disabled || isSending}
          />
          <button
            onClick={handleSend}
            className={`w-28 h-12 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 flex items-center justify-center gap-2 font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
              (disabled || isSending) && "opacity-50 cursor-not-allowed"
            }`}
            disabled={disabled || isSending}
          >
            {isSending ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
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
                <span className="text-sm">Gửi...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Gửi</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
