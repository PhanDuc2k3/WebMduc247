import React from "react";

interface ProfileInfoProps {
  user: any; // nhận user từ cha
  onEdit?: () => void;
}

const ProfileInfo: React.FC<ProfileInfoProps> = ({ user, onEdit }) => {
  if (!user) return <div>Đang tải...</div>;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("id");
    window.location.href = "/login";
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl border-2 border-gray-100 p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur opacity-50 animate-pulse"></div>
          <img
            src={user.avatarUrl || "/default-avatar.png"}
            alt="avatar"
            className="relative w-32 h-32 rounded-full object-cover border-4 border-white shadow-2xl transform hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center gap-3 mb-3 justify-center sm:justify-start">
            <span className="font-bold text-3xl lg:text-4xl text-gray-900 gradient-text">
              {user.fullName}
            </span>
            {user.role && (
              <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-sm px-4 py-1.5 rounded-full font-bold border-2 border-blue-300 shadow-sm">
                {user.role === "buyer"
                  ? "👤 Người mua"
                  : user.role === "seller"
                  ? "🏪 Người bán"
                  : "👑 Admin"}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-gray-600 text-base mb-4 justify-center sm:justify-start">
            <span className="flex items-center gap-2">
              <span>📧</span> {user.email}
            </span>
            {user.phone && (
              <span className="flex items-center gap-2">
                <span>📱</span> {user.phone}
              </span>
            )}
            <span className="flex items-center gap-2">
              <span>📅</span> Tham gia{" "}
              {new Date(user.createdAt).toLocaleDateString("vi-VN")}
            </span>
          </div>

          <div className="flex gap-3 justify-center sm:justify-start">
            <button
              onClick={onEdit}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 text-base font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              ✏️ Chỉnh sửa
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-red-50 hover:border-red-400 hover:text-red-600 text-base font-bold transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
            >
              🚪 Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileInfo;
