import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Gift, ShoppingCart, MessageCircle } from "lucide-react";
import { useChat } from "../../context/chatContext";
import WalletIcon from "../../components/Wallet/WalletIcon";
import NotificationButton from "../../components/Notification/NotificationButton";
import FavoriteDropdown from "../../components/Favorite/FavoriteDropdown";

interface Props {
  cartCount: number;
  userId?: string;
}

export const HeaderIcons: React.FC<Props> = ({ cartCount, userId }) => {
  const { unreadMessages } = useChat();
  const [showFavoriteDropdown, setShowFavoriteDropdown] = useState(false);
  
  // Calculate total unread messages
  const totalUnread = Object.values(unreadMessages).reduce((sum, count) => sum + count, 0);

  return (
    <>
      <WalletIcon />
      {/* Favorite Dropdown - All devices */}
      <div className="relative">
        <button
          onClick={() => setShowFavoriteDropdown(!showFavoriteDropdown)}
          className="flex items-center gap-1.5 hover:text-purple-600 transition-all duration-300 group"
        >
          <Heart size={18} className="group-hover:scale-125 transition-transform" /> 
          <span className="hidden xl:inline text-sm font-bold">Yêu thích</span>
        </button>
        <FavoriteDropdown 
          isOpen={showFavoriteDropdown} 
          onClose={() => setShowFavoriteDropdown(false)} 
        />
      </div>
      <Link to="/voucher" className="hidden md:flex items-center gap-1.5 hover:text-purple-600 transition-all duration-300 group">
        <Gift size={18} className="group-hover:scale-125 transition-transform" /> 
        <span className="hidden xl:inline text-sm font-bold">Voucher</span>
      </Link>
      <Link to="/cart" className="relative flex items-center gap-1.5 hover:text-purple-600 transition-all duration-300 group">
        <div className="relative">
          <ShoppingCart size={18} className="group-hover:scale-125 transition-transform" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full font-black animate-pulse">
              {cartCount}
            </span>
          )}
        </div>
        <span className="hidden xl:inline text-sm font-bold">Giỏ hàng</span>
      </Link>
      <NotificationButton userId={userId} />
      <Link to="/message" className="hidden md:flex items-center gap-1.5 hover:text-purple-600 transition-all duration-300 group">
        <div className="relative">
          <MessageCircle size={18} className="group-hover:scale-125 transition-transform" />
          {totalUnread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-black animate-pulse">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>
        <span className="hidden xl:inline text-sm font-bold">Tin nhắn</span>
      </Link>
    </>
  );
};
