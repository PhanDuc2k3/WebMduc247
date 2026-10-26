import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { useChat } from "../../context/chatContext";
import NotificationButton from "../../components/Notification/NotificationButton";
import WalletIcon from "../../components/Wallet/WalletIcon";
export const HeaderIcons = ({ cartCount, userId }) => {
    const { unreadMessages } = useChat();
    const totalUnread = Object.values(unreadMessages).reduce((sum, count) => sum + count, 0);
    return (_jsxs("div", { className: "canva-header__icon-group", children: [userId && _jsx(WalletIcon, {}), _jsxs(Link, { to: "/messages", className: "canva-header__icon-button", "aria-label": "Tin nh\u1EAFn", children: [_jsx(MessageCircle, {}), totalUnread > 0 && _jsx("span", { className: "canva-header__count", children: totalUnread > 99 ? "99+" : totalUnread })] }), _jsx(NotificationButton, { userId: userId }), _jsxs(Link, { to: "/cart", className: "canva-header__icon-button", "aria-label": "Gi\u1ECF h\u00E0ng", children: [_jsx(ShoppingBag, {}), cartCount > 0 && _jsx("span", { className: "canva-header__count", children: cartCount > 99 ? "99+" : cartCount })] })] }));
};
