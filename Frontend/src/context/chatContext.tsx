// src/context/chatContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { getSocket } from "../socket";
import { toast } from "react-toastify";

interface ChatContextType {
  unreadMessages: Record<string, number>;
  setUnreadMessages: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  currentUserId: string | null;
  setCurrentUserId: React.Dispatch<React.SetStateAction<string | null>>;
  onlineUsers: string[];
  setOnlineUsers: React.Dispatch<React.SetStateAction<string[]>>;
  onlineStores: string[];
  setOnlineStores: React.Dispatch<React.SetStateAction<string[]>>;
  sendMessageNotification: (
    conversationId: string,
    message: string,
    senderId: string,
    senderName: string,
    recipientId?: string
  ) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [onlineStores, setOnlineStores] = useState<string[]>([]);
  const [canPlayAudio, setCanPlayAudio] = useState(false);

  const [audio] = useState(() => new Audio("/sound/poppop.mp3"));

  // Load user từ localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        const id = parsed.id || parsed._id;
        if (id) setCurrentUserId(id);
      } catch {}
    }
  }, []);

  // Khi có currentUserId → emit user_connected + join user room
  useEffect(() => {
    const socket = getSocket();
    if (!currentUserId) return;

    const handleConnect = () => {
      console.log("[ChatContext] Socket connected, emitting user_connected for:", currentUserId);
      socket.emit("user_connected", currentUserId);
      socket.emit("join_user_room", currentUserId);
      socket.emit("get_online_users");
    };

    socket.on("connect", handleConnect);
    if (socket.connected) {
      console.log("[ChatContext] Socket already connected, calling handleConnect");
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [currentUserId]);

  // Theo dõi danh sách online users và stores
  useEffect(() => {
    const socket = getSocket();

    const handleOnlineUsers = (users: string[]) => {
      console.log("[ChatContext] Received online users:", users);
      setOnlineUsers(users);
    };

    const handleOnlineStores = (stores: string[]) => {
      console.log("[ChatContext] Received online stores:", stores);
      setOnlineStores(stores);
    };

    socket.on("update_online_users", handleOnlineUsers);
    socket.on("update_online_stores", handleOnlineStores);

    // Request initial online lists
    socket.emit("get_online_users");
    socket.emit("get_online_stores");

    return () => {
      socket.off("update_online_users", handleOnlineUsers);
      socket.off("update_online_stores", handleOnlineStores);
    };
  }, []);

  // Bật quyền play audio sau tương tác đầu tiên
  useEffect(() => {
    const handleInteraction = () => {
      setCanPlayAudio(true);
      audio.volume = 0;
      audio.play().catch(() => {});
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
    };

    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [audio]);

  // Nhận notify_message
  useEffect(() => {
    const socket = getSocket();

    const handleNotifyMessage = (data: {
      conversationId: string;
      senderName: string;
      text: string;
      avatarUrl?: string;
    }) => {
      const { conversationId, senderName, text, avatarUrl } = data;
      const isActiveConversation = window.location.pathname.includes(conversationId);

      if (!isActiveConversation) {
        setUnreadMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || 0) + 1,
        }));

        if (canPlayAudio) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        }

        toast.info(
          <div style={{ display: "flex", alignItems: "center" }}>
            <img
              src={avatarUrl || "/default-avatar.png"}
              alt={senderName}
              style={{ width: 32, height: 32, borderRadius: "50%", marginRight: 8 }}
            />
            <div>
              <strong>{senderName}</strong>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                {text.length > 60 ? text.slice(0, 60) + "..." : text}
              </div>
            </div>
          </div>,
          { position: "bottom-right", toastId: conversationId }
        );
      }
    };

    socket.on("notify_message", handleNotifyMessage);
    return () => {
      socket.off("notify_message", handleNotifyMessage);
    };
  }, [canPlayAudio, audio]);

  const sendMessageNotification = (
    conversationId: string,
    message: string,
    senderId: string,
    senderName: string,
    recipientId?: string
  ) => {
    const socket = getSocket();
    if (!socket || !socket.connected) return;
    socket.emit("send_message_notification", { conversationId, message, senderId, senderName, recipientId });
  };

  return (
    <ChatContext.Provider
      value={{
        unreadMessages,
        setUnreadMessages,
        currentUserId,
        setCurrentUserId,
        onlineUsers,
        setOnlineUsers,
        onlineStores,
        setOnlineStores,
        sendMessageNotification,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
};
