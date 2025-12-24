// src/pages/Messages/Message.tsx
import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Clock, MessageCircle } from "lucide-react";
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
  const { id: conversationId } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Debug: Log conversationId changes
  useEffect(() => {
    console.log("[ChatInterface] 🔄 conversationId changed:", conversationId, "pathname:", location.pathname);
  }, [conversationId, location.pathname]);

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

  // ✅ Tự động set chat khi có conversationId trong URL
  useEffect(() => {
    console.log("[ChatInterface] 🎯 useEffect triggered - conversationId:", conversationId, "currentUserId:", currentUserId, "selectedChat:", selectedChat);
    
    // Nếu không có conversationId, reset selectedChat
    if (!conversationId) {
      console.log("[ChatInterface] ⚠️ No conversationId, resetting selectedChat");
      setSelectedChat(null);
      return;
    }

    // Nếu đã có selectedChat với conversationId đúng, không cần làm gì
    if (selectedChat?.conversationId === conversationId) {
      console.log("[ChatInterface] ✅ Already have correct selectedChat");
      return;
    }

    // Ưu tiên: Nếu có state từ OrderShare/StoreCard, set ngay
    if (location.state?.chatUser) {
      const chatUser = location.state.chatUser;
      console.log("[ChatInterface] ⚡ Set chat từ state:", chatUser);
      setSelectedChat({
        conversationId: conversationId,
        userId: chatUser._id,
        name: chatUser.name || "Cửa hàng",
        avatarUrl: chatUser.avatar || "/default-avatar.png",
        lastMessage: "",
      });
      return;
    }

    // Nếu chưa có currentUserId, đợi
    if (!currentUserId) {
      console.log("[ChatInterface] ⏳ Đợi currentUserId...");
      return;
    }

    // Reset selectedChat trước khi fetch để đảm bảo load lại
    setSelectedChat(null);

    // Fetch từ API
    const fetchChat = async () => {
      try {
        console.log("[ChatInterface] 🔍 Fetching chat for conversationId:", conversationId, "currentUserId:", currentUserId);
        const convList = await messageApi.getUserConversations(currentUserId);
        console.log("[ChatInterface] 📋 Conversation list:", convList.data);
        
        const conv = convList.data.find(
          (c: any) =>
            String(c.conversationId) === String(conversationId) || 
            String(c._id) === String(conversationId)
        );

        console.log("[ChatInterface] 🎯 Found conversation:", conv);

        if (conv) {
          const partner = conv.participants?.find(
            (p: any) => String(p._id) !== String(currentUserId)
          );
          
          console.log("[ChatInterface] 👤 Partner:", partner);
          
          if (partner) {
            console.log("[ChatInterface] ✅ Fetch và set chat từ URL:", conversationId);
            setSelectedChat({
              conversationId: String(conversationId),
              userId: partner._id,
              name: partner.fullName || partner.name || "Người dùng",
              avatarUrl: partner.avatarUrl || "/default-avatar.png",
              lastMessage: conv.lastMessage?.text || conv.lastMessage || "",
            });
          } else {
            console.warn("[ChatInterface] ⚠️ Không tìm thấy partner trong conversation");
          }
        } else {
          console.warn("[ChatInterface] ⚠️ Không tìm thấy conversation với ID:", conversationId);
        }
      } catch (err) {
        console.error("[ChatInterface] ❌ Lỗi fetch chat:", err);
      }
    };

    fetchChat();
  }, [conversationId, currentUserId, location.state]);

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
    <div className="w-full px-0 sm:px-4 lg:px-6 xl:px-8 2xl:mx-auto 2xl:w-full 2xl:max-w-[1920px]">
<div className="flex relative h-[calc(100vh-80px)] sm:h-[calc(100vh-85px)] md:h-[calc(100vh-90px)]">
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
<div className={`${showListOnMobile ? "hidden md:flex" : "flex"} flex-1 min-w-0 h-full`}>
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
            <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-gray-50 to-[#2F5FEB]/10 animate-fade-in px-4">
              <MessageCircle className="w-14 h-14 md:w-24 md:h-24 mb-3 sm:mb-4 md:mb-6 text-[#2F5FEB] animate-pulse" />
              <p className="text-base sm:text-lg md:text-2xl font-bold text-gray-700 mb-2">Đang tải...</p>
            </div>
          ) : (
            <div className="hidden md:flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-gray-50 to-[#2F5FEB]/10 animate-fade-in">
              <MessageCircle className="w-20 h-20 md:w-28 md:h-28 mb-6 text-[#2F5FEB] animate-bounce" />
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
