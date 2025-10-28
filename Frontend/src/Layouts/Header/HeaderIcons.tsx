import React from "react";
import { Link } from "react-router-dom";
import { Heart, Gift, ShoppingCart, MessageCircle } from "lucide-react";

interface Props {
  cartCount: number;
}

export const HeaderIcons: React.FC<Props> = ({ cartCount }) => {
  return (
    <>
      <Link to="/wishlist" className="hidden sm:flex items-center gap-1 hover:text-[#3a5ef7] transition">
        <Heart size={22} /> <span className="hidden lg:inline">Yêu thích</span>
      </Link>
      <Link to="/voucher" className="hidden sm:flex items-center gap-1 hover:text-[#3a5ef7] transition">
        <Gift size={22} /> <span className="hidden lg:inline">Voucher</span>
      </Link>
      <Link to="/cart" className="relative flex items-center gap-1 hover:text-[#3a5ef7] transition">
        <div className="relative">
          <ShoppingCart size={22} />
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
              {cartCount}
            </span>
          )}
        </div>
        <span className="hidden lg:inline ml-1">Giỏ hàng</span>
      </Link>
      <Link to="/message" className="hidden sm:flex items-center gap-1 hover:text-[#3a5ef7] transition">
        <MessageCircle size={22} /> <span className="hidden lg:inline">Tin nhắn</span>
      </Link>
    </>
  );
};
