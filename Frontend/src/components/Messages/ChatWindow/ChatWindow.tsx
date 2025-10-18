import React, { useEffect, useState, useRef } from "react";
import { PaperClipIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { io, Socket } from "socket.io-client";

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  disabled?: boolean;
}

interface Message {
  _id: string;
  sender: string;
  text: string;
  createdAt: string;
  conversationId: string;
  product?: {
    name: string;
    variant?: string;
    price?: number;
    url?: string;
  };
}

// Dùng env variables
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
const API_URL = import.meta.env.VITE_API_BASE_URL + "/api/messages";

const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId, currentUserId, disabled }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Kết nối socket
  useEffect(() => {
    if (!currentUserId) return;

    const socket = io(SOCKET_URL, { query: { userId: currentUserId } });
    socketRef.current = socket;

    if (conversationId) {
      socket.emit("joinConversation", conversationId);
    }

    return () => {
      socket.disconnect();
    };
  }, [currentUserId, conversationId]);

  // Nhận tin nhắn realtime
  useEffect(() => {
    if (!socketRef.current) return;

    const handler = (msg: Message) => {
      if (msg.conversationId === conversationId) {
        setMessages((prev) => {
          if (prev.find((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socketRef.current.on("receiveMessage", handler);

    return () => {
      socketRef.current?.off("receiveMessage", handler);
    };
  }, [conversationId]);

  // Lấy tin nhắn ban đầu
  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/${conversationId}`);
        const data: Message[] = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("❌ Lỗi tải tin nhắn:", err);
      }
    };

    fetchMessages();
  }, [conversationId]);

  // Scroll xuống cuối khi messages thay đổi
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId || !socketRef.current || disabled) return;

    const msgData = {
      sender: currentUserId,
      text: newMessage,
      conversationId,
    };

    setNewMessage("");

    try {
      const res = await fetch(`${API_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msgData),
      });

      const savedMessage: Message = await res.json();
      socketRef.current.emit("sendMessage", savedMessage);
    } catch (err) {
      console.error("❌ Lỗi gửi tin nhắn:", err);
    }
  };

  return (
    <div className="flex flex-col border rounded-lg h-[calc(100vh-110px)]">
      <div className="flex-none p-4 border-b bg-white">
        <h2 className="text-lg font-semibold">
          {conversationId ? `Chat: ${conversationId}` : "Chọn cuộc trò chuyện"}
        </h2>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => {
          const isMine = msg.sender === currentUserId;
          return (
            <div key={msg._id} className="space-y-1">
              <div className={`text-sm text-gray-500 ${isMine ? "text-right" : ""}`}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className={`p-3 rounded-lg w-fit max-w-md break-words ${isMine ? "ml-auto bg-green-100" : "bg-blue-100"}`}>
                {msg.text}
                {msg.product && (
                  <div className="mt-3 border-t pt-3">
                    <div className="font-semibold">{msg.product.name}</div>
                    {msg.product.variant && <div>{msg.product.variant}</div>}
                    {msg.product.price && <div className="text-red-500 font-bold">{msg.product.price.toLocaleString()}đ</div>}
                    {msg.product.url && (
                      <a href={msg.product.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        Xem sản phẩm
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`flex-none p-4 border-t flex items-center gap-2 bg-white ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
        <button className="p-2 rounded hover:bg-gray-200" disabled={disabled}>
          <PhotoIcon className="h-6 w-6 text-gray-600" />
        </button>
        <button className="p-2 rounded hover:bg-gray-200" disabled={disabled}>
          <PaperClipIcon className="h-6 w-6 text-gray-600" />
        </button>
        <input
          type="text"
          placeholder={disabled ? "Bạn cần đăng nhập để chat..." : "Nhập tin nhắn..."}
          className="flex-1 p-3 border rounded-lg focus:outline-none"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={disabled}
        />
        <button onClick={handleSend} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600" disabled={disabled}>
          Gửi
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
