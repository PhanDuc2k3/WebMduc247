import React from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle, Store, LogOut } from "lucide-react";

interface Props {
  userId: string;
  online: boolean;
  lastSeen: string | null;
  handleLogout: () => void;
  setShowDropdown: (v: boolean) => void;
}

const DropdownUser: React.FC<Props> = ({ online, lastSeen, handleLogout, setShowDropdown }) => {
  const navigate = useNavigate();

  return (
    <div className="absolute right-0 mt-2 bg-white border rounded-xl shadow-md w-48 p-2 z-50">
      <button
        onClick={() => {
          setShowDropdown(false);
          navigate("/profile");
        }}
        className="flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100"
      >
        <UserCircle className="mr-2" size={18} /> Trang cá nhân
      </button>
      <button
        onClick={() => {
          setShowDropdown(false);
          navigate("/mystore");
        }}
        className="flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100"
      >
        <Store className="mr-2" size={18} /> Cửa hàng của tôi
      </button>
      <button
        onClick={handleLogout}
        className="flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100"
      >
        <LogOut className="mr-2" size={18} /> Đăng xuất
      </button>
      {!online && lastSeen && (
        <span className="block text-xs text-gray-500 mt-2">
          Offline lúc {new Date(lastSeen).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

export default DropdownUser;
