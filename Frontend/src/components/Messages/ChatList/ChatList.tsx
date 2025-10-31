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
            onClick={() => !disabled && handleSelectChat(chat)}
            className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-100 transition ${
              selectedChat?.conversationId === chat.conversationId
                ? "bg-gray-200"
                : ""
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="relative w-10 h-10">
              <img
                src={chat.avatarUrl}
                alt={chat.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              {chat.online && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-md"></span>
              )}
            </div>

            <div className="flex-1 relative">
              <div className="font-semibold truncate">{chat.name}</div>
              <div className="text-sm text-gray-500 truncate">
                {chat.lastMessage || "Chưa có tin nhắn"}
              </div>

              {unreadMessages[chat.conversationId] > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full px-2 text-xs">
                  {unreadMessages[chat.conversationId]}
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
