import React, { useState, useEffect } from "react";
import ChatList from "../../components/Messages/ChatList/ChatList";
import ChatWindow from "../../components/Messages/ChatWindow/ChatWindow";

interface Chat {
  conversationId: string;
  name: string;
  avatarUrl?: string;
  lastMessage: string;
}

export default function ChatInterface() {
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  // ✅ Lấy user hiện tại từ localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const userId = user._id || user.id; 

        if (userId) {
          setCurrentUserId(userId);
          console.log("✅ [FE] currentUserId:", userId);
        } else {
          console.warn("⚠️ [FE] Không tìm thấy id trong user object:", user);
        }
      } catch (err) {
        console.error("❌ [FE] Lỗi parse JSON từ localStorage:", err);
      }
    } else {
      console.warn("⚠️ [FE] Không tìm thấy user trong localStorage");
    }
  }, []);

  return (
    <div className="flex" style={{ height: "calc(100vh - 110px)" }}>
      {/* Chat List */}
      <ChatList
        currentUserId={currentUserId}
        selectedChat={selectedChat}
        onSelectChat={setSelectedChat}
        disabled={!currentUserId} // disable nếu chưa có user
      />

      {/* Chat Window */}
      <div className="flex-1">
        {selectedChat ? (
          <ChatWindow
          conversationId={selectedChat.conversationId}
          currentUserId={currentUserId}
          disabled={!currentUserId} // disable input khi chưa login
          chatUser={{
           name: selectedChat.name,
          avatar: selectedChat.avatarUrl,
          }}
/>

        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Chọn một cuộc trò chuyện để bắt đầu
          </div>
        )}
      </div>
    </div>
  );
}
