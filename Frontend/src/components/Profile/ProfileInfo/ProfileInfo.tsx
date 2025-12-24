import React from "react";
import { User, Store, Crown, Mail, Phone, Calendar, Edit, LogOut } from "lucide-react";

interface ProfileInfoProps {
  user: any; // nhận user từ cha
  onEdit?: () => void;
}

const ProfileInfo: React.FC<ProfileInfoProps> = ({ user, onEdit }) => {
  if (!user) return <div>Đang tải...</div>;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("id");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <div className="bg-[#F3F6FF] rounded-xl md:rounded-2xl shadow-2xl border-2 border-[#2F5FEB]/20 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-6">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={user.avatarUrl || "/default-avatar.png"}
            alt="avatar"
            className="w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full object-cover border-2 md:border-4 border-white shadow-2xl transform hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left w-full min-w-0">
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2 md:mb-3 justify-center sm:justify-start">
            <span className="font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl text-[#2F5FEB] truncate">
              {user.fullName}
            </span>
            {user.role && (
              <span className="bg-[#2F5FEB]/10 text-[#2F5FEB] text-xs md:text-sm px-2 md:px-4 py-1 md:py-1.5 rounded-full font-bold border-2 border-[#2F5FEB]/40 shadow-sm flex items-center gap-1 md:gap-2 flex-shrink-0">
                {user.role === "buyer" ? (
                  <>
                    <User size={12} /> <span className="hidden sm:inline">Người mua</span>
                  </>
                ) : user.role === "seller" ? (
                  <>
                    <Store size={12} /> <span className="hidden sm:inline">Người bán</span>
                  </>
                ) : (
                  <>
                    <Crown size={12} /> <span className="hidden sm:inline">Admin</span>
                  </>
                )}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-center sm:items-center gap-2 md:gap-4 text-gray-600 text-xs sm:text-sm md:text-base mb-3 md:mb-4 justify-center sm:justify-start">
            <span className="flex items-center gap-1.5 md:gap-2 justify-center sm:justify-start">
              <Mail size={14} className="flex-shrink-0 text-[#2F5FEB]" /> <span className="break-words text-center sm:text-left">{user.email}</span>
            </span>
            {user.phone && (
              <span className="flex items-center gap-1.5 md:gap-2 justify-center sm:justify-start">
                <Phone size={14} className="text-[#2F5FEB]" /> {user.phone}
              </span>
            )}
            <span className="flex items-center gap-1.5 md:gap-2 justify-center sm:justify-start">
              <Calendar size={14} className="text-[#2F5FEB]" /> <span className="hidden sm:inline">Tham gia </span>
              {new Date(user.createdAt).toLocaleDateString("vi-VN")}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-center sm:justify-start w-full sm:w-auto">
            <button
              onClick={onEdit}
              className="px-4 py-2 md:px-6 md:py-2.5 bg-[#2F5FEB] text-white rounded-lg md:rounded-xl hover:bg-[#244ACC] text-xs sm:text-sm md:text-base font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2"
            >
              <Edit size={14} /> Chỉnh sửa
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 md:px-6 md:py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg md:rounded-xl hover:bg-red-50 hover:border-red-400 hover:text-red-600 text-xs sm:text-sm md:text-base font-bold transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2"
            >
              <LogOut size={14} /> Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileInfo;
