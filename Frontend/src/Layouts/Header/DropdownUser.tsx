import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle, Store, LogOut, Gift, Wallet, MessageCircle, Settings } from "lucide-react";
import walletApi from "../../api/walletApi";
import { useChat } from "../../context/chatContext";

interface Props {
  userId: string;
  online: boolean;
  lastSeen: string | null;
  handleLogout: () => void;
  setShowDropdown: (v: boolean) => void;
  userRole?: string; // ✅ role để kiểm tra admin
}

const DropdownUser: React.FC<Props> = ({ online, lastSeen, handleLogout, setShowDropdown, userRole }) => {
  const navigate = useNavigate();
  const { unreadMessages } = useChat();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  
  const totalUnreadMessages = Object.values(unreadMessages).reduce((sum, count) => sum + count, 0);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const res = await walletApi.getWallet();
        setWalletBalance(res.data.wallet.balance);
      } catch (err: any) {
        if (err.response?.status !== 401 && err.code !== 'ERR_NETWORK') {
          console.error('Lỗi lấy ví:', err);
        }
      }
    };

    fetchWallet();
  }, []);

  return (
    <div className="absolute right-0 mt-2 bg-white border rounded-xl shadow-md w-56 md:w-48 p-2 z-50">
      {/* Mobile: Wallet, Voucher, Messages */}
      <div className="md:hidden border-b border-gray-200 pb-2 mb-2">
        <button
          onClick={() => {
            setShowDropdown(false);
            navigate("/wallet");
          }}
          className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-gray-100"
        >
          <div className="flex items-center">
            <Wallet className="mr-2" size={18} />
            <span>Ví của tôi</span>
          </div>
          <span className="text-sm font-bold text-purple-600">
            {walletBalance.toLocaleString('vi-VN')}₫
          </span>
        </button>
        <button
          onClick={() => {
            setShowDropdown(false);
            navigate("/voucher");
          }}
          className="flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100"
        >
          <Gift className="mr-2" size={18} />
          <span>Voucher</span>
        </button>
        <button
          onClick={() => {
            setShowDropdown(false);
            navigate("/message");
          }}
          className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-gray-100"
        >
          <div className="flex items-center">
            <MessageCircle className="mr-2" size={18} />
            <span>Tin nhắn</span>
          </div>
          {totalUnreadMessages > 0 && (
            <span className="bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
            </span>
          )}
        </button>
      </div>

      {/* Profile & Store */}
      <button
        onClick={() => {
          setShowDropdown(false);
          navigate("/profile");
        }}
        className="flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100"
      >
        <UserCircle className="mr-2" size={18} /> Trang cá nhân
      </button>
      {/* Chỉ hiển thị "Cửa hàng của tôi" nếu user là seller hoặc admin */}
      {(userRole === "seller" || userRole === "admin") && (
        <button
          onClick={() => {
            setShowDropdown(false);
            navigate("/mystore");
          }}
          className="flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100"
        >
          <Store className="mr-2" size={18} /> Cửa hàng của tôi
        </button>
      )}
      {/* Admin option - chỉ hiển thị khi user là admin */}
      {userRole === "admin" && (
        <button
          onClick={() => {
            setShowDropdown(false);
            navigate("/admin");
          }}
          className="flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100 text-blue-600 font-semibold border-t border-gray-200 mt-1"
        >
          <Settings className="mr-2" size={18} /> Quản lý website
        </button>
      )}
      <button
        onClick={handleLogout}
        className="flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100 text-red-600"
      >
        <LogOut className="mr-2" size={18} /> Đăng xuất
      </button>
      {!online && lastSeen && (
        <span className="block text-xs text-gray-500 mt-2 px-3">
          Offline lúc {new Date(lastSeen).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

export default DropdownUser;
