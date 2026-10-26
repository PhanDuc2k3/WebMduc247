import { jsx as _jsx } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { identityApi } from "../../api/identityApi";
import { profileApi } from "../../api/profileApi";
import { getSocket } from "../../socket";
import { UserContext } from "./userContext";
const guest = { fullName: "Khách", avatarUrl: "" };
export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(guest);
    const [online, setOnline] = useState(false);
    const [lastSeen, setLastSeen] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const requestId = useRef(0);
    const navigate = useNavigate();
    useEffect(() => {
        let alive = true;
        const load = async () => {
            const id = ++requestId.current;
            try {
                const profile = await profileApi.me();
                if (!alive || id !== requestId.current)
                    return;
                const current = { _id: profile.userId, fullName: profile.displayName, avatarUrl: profile.avatarUrl || "", role: profile.roles.includes("platform_admin") ? "admin" : profile.roles.includes("seller") ? "seller" : undefined };
                setUser(current);
                setOnline(true);
                localStorage.setItem("user", JSON.stringify(current));
            }
            catch {
                try {
                    const identity = await identityApi.me();
                    if (!alive || id !== requestId.current)
                        return;
                    const current = { _id: identity.id, fullName: identity.fullName, avatarUrl: "", role: identity.roles.includes("platform_admin") ? "admin" : identity.roles.includes("seller") ? "seller" : undefined };
                    setUser(current);
                    setOnline(true);
                    localStorage.setItem("user", JSON.stringify(current));
                }
                catch {
                    if (!alive || id !== requestId.current)
                        return;
                    setUser(guest);
                    setOnline(false);
                    setLastSeen(null);
                    localStorage.removeItem("user");
                }
            }
        };
        void load();
        window.addEventListener("identityUpdated", load);
        return () => { alive = false; window.removeEventListener("identityUpdated", load); };
    }, []);
    useEffect(() => {
        if (!user._id)
            return;
        const socket = getSocket();
        if (!socket.connected)
            socket.connect();
        socket.emit("user_connected", user._id);
        const handler = (data) => { setOnline(data.online); setLastSeen(data.lastSeen); };
        socket.on("userOnlineStatus", handler);
        return () => { socket.off("userOnlineStatus", handler); };
    }, [user._id]);
    const logout = (allDevices) => {
        void identityApi.logout(allDevices).then(() => {
            const socket = getSocket();
            if (socket.connected && user._id)
                socket.emit("user_disconnected", user._id);
            socket.disconnect();
            localStorage.removeItem("user");
            setUser(guest);
            setOnline(false);
            setLastSeen(null);
            setShowDropdown(false);
            navigate("/login");
        }).catch(() => toast.error("Không thể đăng xuất. Vui lòng thử lại.", { containerId: "general-toast" }));
    };
    const handleLogout = () => logout(false);
    const handleLogoutAll = () => logout(true);
    return _jsx(UserContext.Provider, { value: { user, online, lastSeen, showDropdown, setShowDropdown, handleLogout, handleLogoutAll }, children: children });
};
