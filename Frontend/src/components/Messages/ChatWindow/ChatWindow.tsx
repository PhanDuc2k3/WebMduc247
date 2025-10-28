import React, { useEffect, useState, useRef } from "react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import messageApi from "../../../api/messageApi";
import { useChat } from "../../../context/chatContext";

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

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { socket } = useChat();

  // Join conversation + nhận tin nhắn realtime
  useEffect(() => {
    if (!conversationId || !socket) return;

    socket.emit("joinConversation", conversationId);

    const handler = (msg: Message) => {
      if (msg.conversationId !== conversationId) return;

      setMessages((prev) => {
        if (msg.tempId) {
          return prev.map((m) => (m._id === msg.tempId ? msg : m));
        }
        if (!prev.find((m) => m._id === msg._id)) return [...prev, msg];
        return prev;
      });
    };

    socket.on("receiveMessage", handler);
    return () => {
      socket.off("receiveMessage", handler);
    };
  }, [conversationId, socket]);

  // Tải tin nhắn cũ
  useEffect(() => {
    if (!conversationId) return;
    const fetchMessages = async () => {
      try {
        const res = await messageApi.getMessages(conversationId);
        setMessages(res.data);
      } catch (err) {}
    };
    fetchMessages();
  }, [conversationId]);

  // Cuộn xuống khi có tin mới
  useEffect(() => {
    messagesContainerRef.current?.scrollTo(
      0,
      messagesContainerRef.current.scrollHeight
    );
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

  // Gửi tin nhắn
  const handleSend = async () => {
    if (!conversationId) return;
    if (!newMessage.trim() && newFiles.length === 0) return;

    let attachments: Attachment[] = [];

    if (newFiles.length > 0) {
      const formData = new FormData();
      newFiles.forEach((f) => formData.append("attachments", f));
      formData.append("sender", currentUserId);
      formData.append("conversationId", conversationId);

      try {
        const res = await messageApi.sendMessage(formData as any);
        attachments = res.data.attachments || [];
      } catch (err) {}
    }

    const payload = {
      sender: currentUserId,
      conversationId,
      text: newMessage.trim() || undefined,
      attachments,
    };

    socket?.emit("sendMessage", payload);

    setNewMessage("");
    clearPreview();
  };

  return (
    <div className="flex flex-col border rounded-lg h-[calc(100vh-110px)]">
      {/* Header */}
      <div className="flex-none p-4 border-b bg-white flex items-center gap-2">
        {chatUser.avatar && (
          <img
            src={chatUser.avatar}
            alt={chatUser.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        )}
        <h2 className="text-lg font-semibold">
          {chatUser.name || "Chọn cuộc trò chuyện"}
        </h2>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {messages.map((msg) => {
          const isMine = msg.sender === currentUserId;
          return (
            <div
              key={msg._id}
              className={`space-y-1 ${msg.tempId ? "opacity-50 italic" : ""}`}
            >
              <div
                className={`text-sm text-gray-500 ${
                  isMine ? "text-right" : ""
                }`}
              >
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {msg.tempId && " (Đang gửi...)"}
              </div>
              <div
                className={`p-3 rounded-lg w-fit max-w-md break-words ${
                  isMine ? "ml-auto bg-green-100" : "bg-blue-100"
                }`}
              >
                {msg.attachments?.length ? (
                  <div className="flex flex-wrap gap-2 mb-1">
                    {msg.attachments.map((a, i) => (
                      <img
                        key={i}
                        src={a.url}
                        alt={`attachment-${i}`}
                        className="w-32 h-32 object-cover rounded"
                      />
                    ))}
                  </div>
                ) : null}
                {msg.text && <div>{msg.text}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div
        className={`flex-none p-4 border-t flex flex-col gap-2 bg-white ${
          disabled ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {preview.length > 0 && (
          <div className="flex gap-2 relative p-2 bg-gray-100 rounded">
            {preview.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`preview-${i}`}
                className="w-16 h-16 object-cover rounded"
              />
            ))}
            <button
              onClick={clearPreview}
              className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded hover:bg-gray-200"
            onClick={handleOpenFileDialog}
            disabled={disabled}
          >
            <PhotoIcon className="h-6 w-6 text-gray-600" />
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
            className="flex-1 p-3 border rounded-lg focus:outline-none"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={disabled}
          />
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            disabled={disabled}
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
