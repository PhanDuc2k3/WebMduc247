import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import ChatList from "../../components/Messages/ChatList/ChatList";
import ChatWindow from "../../components/Messages/ChatWindow/ChatWindow";

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

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;

    try {
      const user = JSON.parse(storedUser);
      const userId = user._id || user.id;
      if (userId) setCurrentUserId(userId);
    } catch (err) {}
  }, []);

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
