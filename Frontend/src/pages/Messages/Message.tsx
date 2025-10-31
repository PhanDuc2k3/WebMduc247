// src/pages/Messages/Message.tsx
import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Clock } from "lucide-react";
import ChatList from "../../components/Messages/ChatList/ChatList";
import ChatWindow from "../../components/Messages/ChatWindow/ChatWindow";
import messageApi from "../../api/messageApi";

interface Chat {
  userId: string;
  conversationId: string;
  name: string;
  avatarUrl?: string;
  lastMessage: string;
}

export default function ChatInterface() {
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const { conversationId } = useParams();
  const location = useLocation();

  // ✅ Lấy user từ localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;
    try {
      const user = JSON.parse(storedUser);
      const userId = user._id || user.id;
      if (userId) setCurrentUserId(userId);
    } catch {}
  }, []);

  // ✅ Khi có state từ StoreCard → hiện luôn ChatWindow
  useEffect(() => {
    if (location.state?.chatUser && location.state?.initialMessages) {
      const chatUser = location.state.chatUser;
      const convId = conversationId || "temp";

      console.log("[ChatInterface] ⚡ Load từ state:", chatUser);

      setSelectedChat({
        conversationId: convId,
        userId: chatUser._id,
        name: chatUser.name,
        avatarUrl: chatUser.avatar,
        lastMessage: "",
      });
    }
  }, [location.state, conversationId]);

  // ✅ Nếu vào từ URL (không có state) thì fetch conversation
  useEffect(() => {
    const fetchChat = async () => {
      if (!conversationId || !currentUserId) {
        console.log("[ChatInterface] ⏸ Chưa có conversationId hoặc currentUserId");
        return;
      }

      try {
        const convList = await messageApi.getUserConversations(currentUserId);
        const conv = convList.data.find(
          (c: any) =>
            c.conversationId === conversationId || c._id === conversationId
        );

        if (conv) {
          const partner = conv.participants?.find(
            (p: any) => p._id !== currentUserId
          );
          if (partner) {
            setSelectedChat({
              conversationId,
              userId: partner._id,
              name: partner.fullName || "Người dùng",
              avatarUrl: partner.avatarUrl || "/default-avatar.png",
              lastMessage: conv.lastMessage || "",
            });
          }
        }
      } catch (err) {
        console.error("[ChatInterface] ❌ Lỗi fetch chat:", err);
      }
    };

    fetchChat();
  }, [conversationId, currentUserId]);

  useEffect(() => {
    console.log("[ChatInterface] 🔍 selectedChat:", selectedChat);
  }, [selectedChat]);

  return (
    <div className="flex" style={{ height: "calc(100vh - 110px)" }}>
      <ChatList
        currentUserId={currentUserId}
        selectedChat={selectedChat}
        onSelectChat={(chat) => setSelectedChat(chat as Chat)}
        disabled={!currentUserId}
      />

      <div className="flex-1">
        {selectedChat ? (
          <ChatWindow
            conversationId={selectedChat.conversationId}
            currentUserId={currentUserId}
            chatUser={{
              _id: selectedChat.userId,
              name: selectedChat.name,
              avatar: selectedChat.avatarUrl,
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 gap-2">
            <Clock className="w-5 h-5" />
            <span>Chọn một cuộc trò chuyện để bắt đầu</span>
          </div>
        )}
      </div>
    </div>
  );
}
