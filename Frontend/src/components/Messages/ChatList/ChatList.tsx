import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import messageApi from "../../../api/messageApi";
import { useChat } from "../../../context/chatContext";
import axiosClient from "../../../api/axiosClient";

interface Chat {
  conversationId: string;
  name: string;
  avatarUrl?: string;
  lastMessage: string;
  lastMessageTime?: string;
  online?: boolean;
  participantId?: string;
}

interface Props {
  currentUserId: string;
  selectedChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  disabled?: boolean;
}

// Format message time
const formatMessageTime = (time: string | Date): string => {
  if (!time) return "";
  
  const messageDate = new Date(time);
  const now = new Date();
  const diffInMs = now.getTime() - messageDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMs / 3600000);
  const diffInDays = Math.floor(diffInMs / 86400000);

  // Same day - show time
  if (diffInDays === 0) {
    if (diffInMinutes < 1) return "Vừa xong";
    if (diffInMinutes < 60) return `${diffInMinutes} phút`;
    if (diffInHours < 24) return `${diffInHours} giờ`;
    return messageDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }

  // Yesterday
  if (diffInDays === 1) return "Hôm qua";

  // This week
  if (diffInDays < 7) {
    return messageDate.toLocaleDateString("vi-VN", { weekday: "short" });
  }

  // Older - show date
  return messageDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
};

export default function ChatList({
  currentUserId,
  selectedChat,
  onSelectChat,
  disabled,
}: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { unreadMessages, setUnreadMessages, onlineUsers } = useChat();
  const navigate = useNavigate();

  // 📥 Fetch danh sách chat
  useEffect(() => {
    const fetchChats = async () => {
      try {
        if (!currentUserId) return;
        console.log("[ChatList] Fetching conversations for user:", currentUserId);

        const res = await messageApi.getUserConversations(currentUserId);
        console.log("[ChatList] API response:", res.data);

// Helper function để fetch thông tin user từ API
const fetchUserInfo = async (participantId: string): Promise<{ name: string; avatarUrl: string } | null> => {
  try {
    const userRes = await axiosClient.get(`/api/users/${participantId}`);
    const user = userRes.data?.user || userRes.data;
    return {
      name: user?.fullName || user?.name || "",
      avatarUrl: user?.avatarUrl || "",
    };
  } catch (err) {
    console.warn("[ChatList] Không thể fetch thông tin user:", err);
    return null;
  }
};

const mappedChats: Chat[] = await Promise.all(
  (res.data as any[]).map(async (conv) => {
    console.log("[ChatList] Raw conversation:", conv);

    const participants = conv.participants || [];
    // ép kiểu về string để so sánh an toàn
    const participant =
      participants.find((p: any) => String(p._id) !== String(currentUserId)) ||
      participants[0]; // fallback

    if (!participant) {
      console.warn("[ChatList] ⚠️ Không tìm thấy participant trong conv:", conv._id);
      return null;
    }

    const lastMsg =
      conv.lastMessage?.text ||
      conv.lastMessage?.content ||
      (conv.lastMessage?.attachments?.length ? "[Đính kèm]" : "") ||
      conv.lastMessage ||
      "";

    // Fetch thông tin user từ API để đảm bảo lấy đúng fullName và avatarUrl (đặc biệt cho seller/owner)
    let displayName = participant.fullName || participant.name || "Người dùng ẩn danh";
    let displayAvatar = participant.avatarUrl || "/default-avatar.png";

    // Fetch từ API để đảm bảo có thông tin mới nhất (quan trọng cho seller để hiển thị tên owner thay vì tên store)
    const userInfo = await fetchUserInfo(participant._id);
    if (userInfo) {
      if (userInfo.name) {
        displayName = userInfo.name;
      }
      if (userInfo.avatarUrl) {
        displayAvatar = userInfo.avatarUrl;
      }
    }

    const chat: Chat = {
      conversationId: conv._id?.toString() || conv.conversationId,
      name: displayName,
      avatarUrl: displayAvatar,
      lastMessage: lastMsg,
      lastMessageTime: conv.lastMessageTime,
      participantId: participant._id,
      online: Array.isArray(onlineUsers)
        ? onlineUsers.includes(String(participant._id))
        : false,
    };

    return chat;
  })
);
const filteredChats = mappedChats.filter((c): c is Chat => Boolean(c?.conversationId));


        console.log("[ChatList] Mapped chats:", filteredChats);

        // ✅ Giữ lại trạng thái online từ danh sách cũ
        setChats((prev) => {
          const prevMap = new Map(prev.map((c) => [c.conversationId, c]));
          const merged = filteredChats.map((chat) => {
            const old = prevMap.get(chat.conversationId);
            return old ? { ...chat, online: old.online } : chat;
          });
          return merged;
        });

        // ✅ Cập nhật tin chưa đọc
        const unreadData: Record<string, number> = {};
        res.data.forEach((conv: any) => {
          const convId = conv.conversationId || conv._id?.toString();
          if (convId && conv.unreadCount > 0) {
            unreadData[convId] = conv.unreadCount;
          }
        });
        setUnreadMessages((prev) => ({ ...prev, ...unreadData }));
      } catch (err) {
        console.error("[ChatList] Fetch chats error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [currentUserId]);

  // 🔁 Cập nhật trạng thái online realtime
  useEffect(() => {
    if (!onlineUsers) return;
    console.log("[ChatList] Updating chat online status, online users:", onlineUsers);
    setChats((prev) =>
      prev.map((c) => ({
        ...c,
        online: c.participantId ? onlineUsers.includes(c.participantId) : false,
      }))
    );
  }, [onlineUsers]);

  // 🖱 Chọn chat
  const handleSelectChat = (chat: Chat) => {
    if (!chat.conversationId) return;

    console.log("[ChatList] 🖱 Chọn chat:", chat);
    onSelectChat(chat);

    navigate(`/messages/${chat.conversationId}`);

    // reset tin chưa đọc
    setUnreadMessages((prev) => ({
      ...prev,
      [chat.conversationId]: 0,
    }));
  };

  // 🧩 UI
  return (
    <div className="w-full h-full bg-white border-r-0 md:border-r-2 border-gray-200 overflow-hidden flex flex-col shadow-lg md:shadow-xl">
      {/* Header */}
      <div className="bg-[#2F5FEB] p-3 sm:p-4 md:p-5 lg:p-6 border-b-2 border-gray-200 flex-shrink-0">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2 md:gap-3">
          <MessageCircle className="w-5 h-5 md:w-6 md:h-6" /> Tin nhắn
        </h2>
        <p className="text-white/90 text-xs md:text-sm mt-1">{chats.length} cuộc trò chuyện</p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-4 sm:p-6 md:p-8 text-center animate-fade-in">
            <MessageCircle className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-[#2F5FEB] animate-pulse" />
            <p className="text-gray-600 text-sm sm:text-base md:text-lg font-medium">Đang tải...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="p-4 sm:p-6 md:p-8 text-center animate-fade-in">
            <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-3 md:mb-4 text-[#2F5FEB]" />
            <p className="text-gray-500 text-sm sm:text-base md:text-lg font-medium mb-2">Chưa có cuộc trò chuyện</p>
            <p className="text-gray-400 text-xs md:text-sm">Bắt đầu cuộc trò chuyện mới</p>
          </div>
        ) : (
          chats.map((chat, index) => (
            <div
              key={chat.conversationId}
              onClick={() => !disabled && handleSelectChat(chat)}
              className={`flex items-center gap-2 sm:gap-3 md:gap-4 p-3 sm:p-4 md:p-4 lg:p-5 cursor-pointer transition-all duration-300 animate-fade-in-up border-b border-gray-100 ${
                selectedChat?.conversationId === chat.conversationId
                  ? "bg-[#2F5FEB]/5 border-l-4 border-[#2F5FEB] shadow-md"
                  : "hover:bg-[#2F5FEB]/5 active:bg-[#2F5FEB]/10"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <img
                  src={chat.avatarUrl || "/default-avatar.png"}
                  alt={chat.name}
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full object-cover border-2 md:border-3 border-white shadow-md md:shadow-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/default-avatar.png";
                  }}
                />
                {/* Online status indicator */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 border-2 border-white rounded-full shadow-md md:shadow-lg ${
                    chat.online ? "bg-green-500" : "bg-gray-400"
                  }`}
                ></span>
              </div>

              {/* Name and Last Message */}
              <div className="flex-1 min-w-0 relative">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="font-bold text-sm sm:text-base md:text-lg text-gray-900 truncate flex-1">
                    {chat.name || "Người dùng ẩn danh"}
                  </div>
                  {/* Last message time */}
                  {chat.lastMessageTime && (
                    <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                      {formatMessageTime(chat.lastMessageTime)}
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-xs md:text-sm text-gray-600 truncate flex items-center gap-2">
                  <span className="truncate flex-1">
                    {chat.lastMessage || "Chưa có tin nhắn"}
                  </span>
                </div>

                {/* Unread badge */}
                {unreadMessages[chat.conversationId] > 0 && (
                  <span className="absolute top-0 right-0 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full px-1.5 sm:px-2 py-0.5 md:px-3 md:py-1 text-[9px] sm:text-[10px] md:text-xs font-bold shadow-md md:shadow-lg animate-pulse">
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
