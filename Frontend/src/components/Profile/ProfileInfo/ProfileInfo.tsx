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
    <div className="bg-white rounded-xl shadow p-8 flex items-center gap-8 mb-6">
      <img
        src={user.avatarUrl || "/default-avatar.png"}
        alt="avatar"
        className="w-32 h-32 rounded-full object-cover border"
      />
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-semibold text-3xl">{user.fullName}</span>
          {user.role && (
            <span className="bg-gray-100 text-sm px-3 py-1 rounded text-gray-700 border border-gray-300">
              {user.role === "buyer"
                ? "Người mua"
                : user.role === "seller"
                ? "Người bán"
                : "Admin"}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-6 text-gray-600 text-lg mb-3">
          <span>
            <i className="fa fa-envelope mr-1" /> {user.email}
          </span>
          <span>
            <i className="fa fa-phone mr-1" /> {user.phone}
          </span>
          <span>
            <i className="fa fa-calendar mr-1" /> Tham gia{" "}
            {new Date(user.createdAt).toLocaleDateString("vi-VN")}
          </span>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onEdit}
            className="bg-gray-100 px-6 py-2 rounded hover:bg-gray-200 text-base font-medium"
          >
            Chỉnh sửa
          </button>
          <button
            onClick={handleLogout}
            className="bg-gray-100 px-6 py-2 rounded hover:bg-gray-200 text-base font-medium"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileInfo;
