import React, { createContext, useState, useEffect, useContext, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { getSocket } from "../../socket";

// --- fix _id optional
interface UserType {
  _id?: string;    // ✅ optional để user mặc định "Khách" không lỗi TS
  fullName: string;
  avatarUrl: string;
}

interface UserContextType {
  user: UserType;
  online: boolean;
  lastSeen: string | null;
  showDropdown: boolean;
  setShowDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  handleLogout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface Props {
  children: ReactNode;
}

export const UserProvider: React.FC<Props> = ({ children }) => {
  const [user, setUser] = useState<UserType>({ fullName: "Khách", avatarUrl: "" });
  const [online, setOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  // --- fetch user profile
  const fetchUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser({ fullName: "Khách", avatarUrl: "" });
      setOnline(false);
      setLastSeen(null);
      return;
    }

    try {
      const res = await axiosClient.get("/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profile = res.data.user || res.data;

      setUser({
        _id: profile._id,                // ✅ luôn set _id
        fullName: profile.fullName || "Khách",
        avatarUrl: profile.avatarUrl || "",
      });

      setOnline(profile.online ?? false);
      setLastSeen(profile.lastSeen ?? null);
    } catch (err) {
      console.warn("[UserContext] fetchUser failed", err);
      setUser({ fullName: "Khách", avatarUrl: "" });
      setOnline(false);
      setLastSeen(null);
    }
  };

  // --- Listen userUpdated
  useEffect(() => {
    fetchUser();
    window.addEventListener("userUpdated", fetchUser);
    return () => window.removeEventListener("userUpdated", fetchUser);
  }, []);

  // --- Socket online status
  useEffect(() => {
    if (!user._id) return;

    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit("user_connected", user._id);

    const handler = (data: { online: boolean; lastSeen: string }) => {
      setOnline(data.online);
      setLastSeen(data.lastSeen);
    };

    socket.on("userOnlineStatus", handler);
    return () => {
      if (socket && typeof socket.off === "function") socket.off("userOnlineStatus", handler);
    };
  }, [user._id]);

  // --- Logout
  const handleLogout = () => {
    const userLocal = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = userLocal._id || userLocal.id;

    const socket = getSocket();
    if (socket && socket.connected && userId) socket.emit("user_disconnected", userId);
    setTimeout(() => socket.disconnect(), 300);

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser({ fullName: "Khách", avatarUrl: "" });
    setShowDropdown(false);
    setOnline(false);
    setLastSeen(null);

    window.dispatchEvent(new Event("userUpdated"));
    navigate("/login");
  };

  return (
    <UserContext.Provider
      value={{
        user,
        online,
        lastSeen,
        showDropdown,
        setShowDropdown,
        handleLogout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// --- Hook để dùng context
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
};

// --- Alias cho useHeader
export const useHeader = useUser;
