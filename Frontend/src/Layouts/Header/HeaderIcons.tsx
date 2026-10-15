import { Link } from "react-router-dom";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { useChat } from "../../context/chatContext";
import NotificationButton from "../../components/Notification/NotificationButton";
import WalletIcon from "../../components/Wallet/WalletIcon";

export const HeaderIcons = ({ cartCount, userId }: { cartCount: number; userId?: string }) => {
  const { unreadMessages } = useChat();
  const totalUnread = Object.values(unreadMessages).reduce((sum, count) => sum + count, 0);
  return (
    <div className="canva-header__icon-group">
      {userId && <WalletIcon />}
      <Link to="/messages" className="canva-header__icon-button" aria-label="Tin nhắn"><MessageCircle />{totalUnread > 0 && <span className="canva-header__count">{totalUnread > 99 ? "99+" : totalUnread}</span>}</Link>
      <NotificationButton userId={userId} />
      <Link to="/cart" className="canva-header__icon-button" aria-label="Giỏ hàng"><ShoppingBag />{cartCount > 0 && <span className="canva-header__count">{cartCount > 99 ? "99+" : cartCount}</span>}</Link>
    </div>
  );
};
