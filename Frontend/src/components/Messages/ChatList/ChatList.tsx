import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ thêm
import messageApi from "../../../api/messageApi";
import { useChat } from "../../../context/chatContext";

interface Chat {
  conversationId: string;
  name: string;
  avatarUrl?: string;
  lastMessage: string;
  online?: boolean;
  participantId?: string;
}

interface Props {
  currentUserId: string;
  selectedChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  disabled?: boolean;
}

export default function ChatList({
  currentUserId,
  selectedChat,
  onSelectChat,
  disabled,
}: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { socket, unreadMessages, setUnreadMessages, onlineUsers, setOnlineUsers } = useChat();
  const navigate = useNavigate(); // ✅ thêm

  // Fetch danh sách chat
  useEffect(() => {
    const fetchChats = async () => {
      try {
        if (!currentUserId) return;
        console.log("[ChatList] Fetching conversations for user:", currentUserId);

        const res = await messageApi.getUserConversations(currentUserId);
        console.log("[ChatList] API response:", res.data);

        const mappedChats: Chat[] = (res.data as any[])
          .map((conv) => {
            const participants = conv.participants || [];
            const participant = participants.find(
              (p: any) => p._id !== currentUserId
            );

            if (!participant) return null;

            const lastMsg =
              conv.lastMessage?.text ||
              conv.lastMessage?.content ||
              (conv.lastMessage?.attachments?.length ? "[Đính kèm]" : "") ||
              conv.lastMessage ||
              "";

            const chat: Chat = {
              conversationId:
                conv.conversationId ||
                conv._id?.toString() ||
                "unknown_conversation",
              name: participant.fullName || "Người dùng ẩn danh",
              avatarUrl: participant.avatarUrl || "/default-avatar.png",
              lastMessage: lastMsg,
              participantId: participant._id,
              online: false,
            };

            return chat;
          })
          .filter((c): c is Chat => Boolean(c?.conversationId));

        console.log("[ChatList] Mapped chats:", mappedChats);
        setChats(mappedChats);
      } catch (err) {
        console.error("[ChatList] Fetch chats error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [currentUserId, onlineUsers]);

  // Kết nối socket & nhận danh sách online
  useEffect(() => {
    if (!socket) return;
    if (!socket.connected) socket.connect();
    if (currentUserId) socket.emit("user_connected", currentUserId);

    socket.on("update_online_users", (users: string[]) => setOnlineUsers(users));
    return () => {
      socket.off("update_online_users");
    };
  }, [socket, currentUserId]);

  // ✅ Cập nhật online realtime
  useEffect(() => {
    if (!onlineUsers) return;
    setChats((prev) =>
      prev.map((c) => ({
        ...c,
        online: c.participantId ? onlineUsers.includes(c.participantId) : false,
      }))
    );
  }, [onlineUsers]);

  // ✅ Chọn chat và cập nhật URL
  const handleSelectChat = (chat: Chat) => {
    if (!chat.conversationId) return;

    console.log("[ChatList] 🖱 Chọn chat:", chat);
    onSelectChat(chat);

    // Cập nhật URL
    navigate(`/messages/${chat.conversationId}`);

    // Reset tin chưa đọc
    setUnreadMessages((prev) => ({
      ...prev,
      [chat.conversationId]: 0,
    }));
  };

  // UI
  return (
    <div className="w-1/3 bg-white border-r-2 border-gray-200 overflow-hidden flex flex-col">
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 border-b-2 border-gray-200">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span>💬</span> Tin nhắn
        </h2>
        <p className="text-white/90 text-sm mt-1">{chats.length} cuộc trò chuyện</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center animate-fade-in">
            <div className="text-4xl mb-4 animate-pulse">💬</div>
            <p className="text-gray-600 text-lg font-medium">Đang tải...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-gray-500 text-lg font-medium mb-2">Chưa có cuộc trò chuyện</p>
            <p className="text-gray-400 text-sm">Bắt đầu cuộc trò chuyện mới</p>
          </div>
        ) : (
          chats.map((chat, index) => (
            <div
              key={chat.conversationId}
              onClick={() => !disabled && handleSelectChat(chat)}
              className={`flex items-center gap-3 p-5 cursor-pointer transition-all duration-300 animate-fade-in-up border-b border-gray-100 ${
                selectedChat?.conversationId === chat.conversationId
                  ? "bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 shadow-lg"
                  : "hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="relative w-14 h-14">
                <img
                  src={chat.avatarUrl}
                  alt={chat.name}
                  className="w-14 h-14 rounded-full object-cover border-3 border-white shadow-lg"
                />
                {chat.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-lg"></span>
                )}
              </div>

              <div className="flex-1 relative">
                <div className="font-bold text-gray-900 truncate mb-1">{chat.name}</div>
                <div className="text-sm text-gray-600 truncate flex items-center gap-2">
                  <span>{chat.lastMessage || "Chưa có tin nhắn"}</span>
                </div>

                {unreadMessages[chat.conversationId] > 0 && (
                  <span className="absolute top-0 right-0 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full px-3 py-1 text-xs font-bold shadow-lg animate-pulse">
                    {unreadMessages[chat.conversationId]}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
