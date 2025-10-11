import React, { useEffect, useState } from "react";

interface Chat {
  conversationId: string;
  name: string;
  avatarUrl?: string;
  lastMessage: string;
}

interface Props {
  currentUserId: string;
  selectedChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
    disabled?: boolean; // thêm

}

export default function ChatList({ currentUserId, selectedChat, onSelectChat, disabled }: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/messages/conversations/${currentUserId}`);
        if (!res.ok) throw new Error("Lỗi khi lấy danh sách cuộc trò chuyện");

        const data = await res.json();
        console.log("Danh sách conversations:", data); // để debug
        setChats(data);
      } catch (err) {
        console.error("❌ Lỗi fetchChats:", err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUserId) fetchChats();
  }, [currentUserId]);

  return (
    <div className="w-1/3 bg-white border-r overflow-y-auto">
      <h2 className="p-4 font-bold text-lg border-b">Tin nhắn</h2>

      {loading ? (
        <div className="p-4 text-gray-500">Đang tải...</div>
      ) : chats.length === 0 ? (
        <div className="p-4 text-gray-500">Không có cuộc trò chuyện</div>
      ) : (
        chats.map((chat) => (
          <div
            key={chat.conversationId}
            onClick={() => !disabled && onSelectChat(chat)} // disable khi không có user
            className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-100 ${
              selectedChat?.conversationId === chat.conversationId ? "bg-gray-200" : ""
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`} // style khi disabled
          >
            <img
              src={chat.avatarUrl || "/default-avatar.png"}
              alt={chat.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1">
              <div className="font-semibold">{chat.name}</div>
              <div className="text-sm text-gray-500 truncate">{chat.lastMessage}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

