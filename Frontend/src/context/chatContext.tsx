// src/context/chatContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "react-toastify";

const SOCKET_URL = "http://localhost:5050"; // dev

interface ChatContextType {
  socket: Socket | null;
  unreadMessages: Record<string, number>;
  setUnreadMessages: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  currentUserId: string | null;
  setCurrentUserId: React.Dispatch<React.SetStateAction<string | null>>;
  onlineUsers: string[];
  setOnlineUsers: React.Dispatch<React.SetStateAction<string[]>>;
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
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

  // Kết nối socket
  useEffect(() => {
    const newSocket = io(SOCKET_URL, { reconnection: true, transports: ["websocket"] });
    setSocket(newSocket);
    return () => {
      if (newSocket.connected) newSocket.disconnect();
    };
  }, []);

  // Khi có currentUserId → emit user_connected + join user room
  useEffect(() => {
    if (!socket || !currentUserId) return;

    const handleConnect = () => {
      socket.emit("user_connected", currentUserId);
      socket.emit("join_user_room", currentUserId);
      socket.emit("get_online_users");
    };

    socket.on("connect", handleConnect);
    if (socket.connected) handleConnect();

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [socket, currentUserId]);

  // Theo dõi danh sách online
  useEffect(() => {
    if (!socket) return;

    const handleOnlineUsers = (users: string[]) => setOnlineUsers(users);
    const handleUserConnected = (userId: string) =>
      setOnlineUsers((prev) => [...new Set([...prev, userId])]);
    const handleUserDisconnected = (userId: string) =>
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));

    socket.on("update_online_users", handleOnlineUsers);
    socket.on("user_connected", handleUserConnected);
    socket.on("user_disconnected", handleUserDisconnected);

    return () => {
      socket.off("update_online_users", handleOnlineUsers);
      socket.off("user_connected", handleUserConnected);
      socket.off("user_disconnected", handleUserDisconnected);
    };
  }, [socket]);

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
    if (!socket) return;

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
  }, [socket, canPlayAudio, audio]);

  const sendMessageNotification = (
    conversationId: string,
    message: string,
    senderId: string,
    senderName: string,
    recipientId?: string
  ) => {
    if (!socket || !socket.connected) return;
    socket.emit("send_message_notification", { conversationId, message, senderId, senderName, recipientId });
  };

  return (
    <ChatContext.Provider
      value={{
        socket,
        unreadMessages,
        setUnreadMessages,
        currentUserId,
        setCurrentUserId,
        onlineUsers,
        setOnlineUsers,
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
