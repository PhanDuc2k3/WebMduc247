// src/pages/Messages/Message.tsx
import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  // ✅ Scroll to top when component mounts or route changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [conversationId, location.pathname]);

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

  // Handle back to list on mobile
  const handleBackToList = () => {
    setSelectedChat(null);
    navigate("/messages");
  };

  // Determine if we should show list or chat on mobile
  const showListOnMobile = !selectedChat && !conversationId;
  const showChatOnMobile = !!selectedChat || !!conversationId;

  return (
    <div className="w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] lg:w-[calc(100%+6rem)] xl:w-[calc(100%+10%)] -mx-4 sm:-mx-6 lg:-mx-12 xl:-mx-[5%] 2xl:mx-auto 2xl:w-full 2xl:max-w-[1920px]">
      <div className="flex relative h-[calc(100vh-80px)] md:h-[calc(100vh-90px)]">
        {/* Chat List - Hidden on mobile when chat is selected */}
        <div className={`${showChatOnMobile ? "hidden md:block" : "block"} ${showListOnMobile ? "w-full md:w-[380px] lg:w-[420px]" : "w-full md:w-[380px] lg:w-[420px]"} flex-shrink-0`}>
          <ChatList
            currentUserId={currentUserId}
            selectedChat={selectedChat}
            onSelectChat={(chat) => {
              setSelectedChat(chat as Chat);
              // On mobile, navigate to chat view
              if (window.innerWidth < 768) {
                navigate(`/messages/${chat.conversationId}`);
              }
            }}
            disabled={!currentUserId}
          />
        </div>

        {/* Chat Window - Hidden on mobile when no chat selected */}
        <div className={`${showListOnMobile ? "hidden md:flex" : "flex"} flex-1 min-w-0`}>
          {selectedChat ? (
            <ChatWindow
              conversationId={selectedChat.conversationId}
              currentUserId={currentUserId}
              chatUser={{
                _id: selectedChat.userId,
                name: selectedChat.name,
                avatar: selectedChat.avatarUrl,
              }}
              onBack={handleBackToList}
            />
          ) : conversationId ? (
            // Show loading or placeholder when conversationId exists but selectedChat is not loaded yet
            <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-gray-50 to-blue-50 animate-fade-in">
              <div className="text-4xl md:text-8xl mb-4 md:mb-6 animate-pulse">💬</div>
              <p className="text-base md:text-2xl font-bold text-gray-700 mb-2">Đang tải...</p>
            </div>
          ) : (
            <div className="hidden md:flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-gray-50 to-blue-50 animate-fade-in">
              <div className="text-8xl mb-6 animate-bounce">💬</div>
              <p className="text-2xl font-bold text-gray-700 mb-2">Chào mừng đến với Tin nhắn</p>
              <p className="text-lg text-gray-500 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>Chọn một cuộc trò chuyện để bắt đầu</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
