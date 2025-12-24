// src/context/chatContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { getSocket } from "../socket";
import { toast } from "react-toastify";

// Global navigate helper - sẽ được set từ component có useNavigate
let globalNavigate: ((path: string) => void) | null = null;

export const setGlobalNavigate = (navigate: (path: string) => void) => {
  globalNavigate = navigate;
};

// Component cho toast content có thể click
const MessageToastContent: React.FC<{
  conversationId: string;
  senderName: string;
  text: string;
  avatarUrl?: string;
}> = ({ conversationId, senderName, text, avatarUrl }) => {
  const handleClick = () => {
    console.log("[MessageToastContent] 🖱️ Clicked toast, conversationId:", conversationId);
    // Dùng globalNavigate nếu có, nếu không thì fallback về window.location
    if (globalNavigate) {
      console.log("[MessageToastContent] 🚀 Navigating using globalNavigate to:", `/messages/${conversationId}`);
      globalNavigate(`/messages/${conversationId}`);
    } else {
      console.log("[MessageToastContent] ⚠️ globalNavigate not available, using window.location");
      // Fallback: dùng window.location nhưng đảm bảo không reload nếu đã ở đúng route
      if (window.location.pathname !== `/messages/${conversationId}`) {
        window.location.href = `/messages/${conversationId}`;
      }
    }
  };

  return (
    <div 
      onClick={handleClick}
      style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "10px",
        cursor: "pointer"
      }}
    >
      <img
        src={avatarUrl || "/default-avatar.png"}
        alt={senderName}
        style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "2px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "white", marginBottom: "3px" }}>
          {senderName}
        </strong>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", lineHeight: "1.4", wordBreak: "break-word" }}>
          {text.length > 50 ? text.slice(0, 50) + "..." : text}
        </div>
      </div>
    </div>
  );
};

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
      senderId?: string;
      recipientId?: string;
    }) => {
      const { conversationId, senderName, text, avatarUrl, senderId, recipientId } = data;
      const isActiveConversation = window.location.pathname.includes(conversationId);

      // Lấy currentUserId từ localStorage
      const storedUser = localStorage.getItem("user");
      let currentUserId = "";
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          currentUserId = user._id || user.id || "";
        } catch (e) {}
      }

      // Chỉ hiển thị thông báo cho người nhận (không phải người gửi)
      const isRecipient = recipientId && currentUserId && recipientId === currentUserId;
      const isNotSender = senderId && currentUserId && senderId !== currentUserId;

      if (!isActiveConversation && (isRecipient || isNotSender)) {
        setUnreadMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || 0) + 1,
        }));

        if (canPlayAudio) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        }

        // Kiểm tra xem có phải là order share không (message chứa "Thông tin đơn hàng" hoặc pattern orderCode)
        const isOrderShare = text.includes("Thông tin đơn hàng") || /#ORD-/.test(text) || /orderCode/.test(text);
        
        // Toast style khác nhau cho order share
        const toastStyle = isOrderShare 
          ? {
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "white",
              borderRadius: "10px",
              padding: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              minWidth: "280px",
              maxWidth: "350px",
              fontSize: "14px",
              cursor: "pointer",
              border: "2px solid #fbbf24",
            }
          : {
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              borderRadius: "10px",
              padding: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              minWidth: "280px",
              maxWidth: "350px",
              fontSize: "14px",
              cursor: "pointer",
            };

        toast.info(
          <MessageToastContent
            conversationId={conversationId}
            senderName={senderName}
            text={isOrderShare ? "📦 Đã chia sẻ đơn hàng mới" : text}
            avatarUrl={avatarUrl}
          />,
          { 
            position: "bottom-right", 
            toastId: conversationId + (isOrderShare ? "-order" : ""),
            containerId: "message-toast",
            style: toastStyle,
            autoClose: isOrderShare ? 6000 : 4000, // Order share hiển thị lâu hơn
          }
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
