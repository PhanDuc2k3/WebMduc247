import React from "react";
import { Link } from "react-router-dom";
import { Gift, ShoppingCart, MessageCircle } from "lucide-react";
import { useChat } from "../../context/chatContext";
import WalletIcon from "../../components/Wallet/WalletIcon";
import NotificationButton from "../../components/Notification/NotificationButton";

interface Props {
  cartCount: number;
  userId?: string;
}

export const HeaderIcons: React.FC<Props> = ({ cartCount, userId }) => {
  const { unreadMessages } = useChat();
  
  // Calculate total unread messages
  const totalUnread = Object.values(unreadMessages).reduce((sum, count) => sum + count, 0);

  return (
    <>
      {/* Desktop: All icons */}
      <div className="hidden md:flex items-center gap-1 sm:gap-2">
        <WalletIcon />
        <Link to="/voucher" className="flex items-center gap-1 hover:text-purple-600 transition-all duration-300 group">
          <Gift size={14} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] group-hover:scale-125 transition-transform" /> 
          <span className="hidden xl:inline text-xs sm:text-sm font-bold">Voucher</span>
        </Link>
      </div>
      
      {/* Mobile & Desktop: Cart, Notifications, Messages */}
      <Link to="/cart" className="relative flex items-center gap-1 hover:text-purple-600 transition-all duration-300 group">
        <div className="relative">
          <ShoppingCart size={14} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] group-hover:scale-125 transition-transform" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 bg-gradient-to-r from-red-500 to-pink-600 text-white text-[10px] sm:text-xs w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center rounded-full font-black animate-pulse">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </div>
        <span className="hidden xl:inline text-xs sm:text-sm font-bold">Giỏ hàng</span>
      </Link>
      <NotificationButton userId={userId} />
      <Link to="/message" className="flex items-center gap-1 hover:text-purple-600 transition-all duration-300 group">
        <div className="relative">
          <MessageCircle size={14} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] group-hover:scale-125 transition-transform" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 bg-gradient-to-r from-red-500 to-pink-600 text-white text-[10px] sm:text-xs w-3.5 h-3.5 sm:w-5 sm:h-5 flex items-center justify-center rounded-full font-black animate-pulse">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>
        <span className="hidden xl:inline text-xs sm:text-sm font-bold">Tin nhắn</span>
      </Link>
    </>
  );
};
