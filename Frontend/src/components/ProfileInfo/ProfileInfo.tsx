import React, { useEffect, useState } from "react";

const ProfileInfo: React.FC<{ showDetail?: boolean }> = ({ showDetail }) => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:5000/api/users/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setUser(data.user || data)) 
      .catch((err) => console.error("Lỗi fetch user:", err));
  }, []);
  console.log(user);
  if (!user) return <div>Đang tải...</div>;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("id");
    window.location.href = "/login"; // chuyển hướng về trang login
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 flex items-center gap-6 mb-6">
      <img
        src={user.avatarUrl}
        alt="avatar"
        className="w-20 h-20 rounded-full object-cover border"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-xl">{user.fullName}</span>
          {user.role && (
            <span className="bg-gray-100 text-xs px-2 py-1 rounded text-gray-700 border border-gray-300">
              {user.role === "buyer"
                ? "Người mua"
                : user.role === "seller"
                ? "Người bán"
                : "Admin"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-gray-600 text-sm mb-2">
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
        <div className="flex gap-2">
          <button className="bg-gray-100 px-4 py-2 rounded hover:bg-gray-200 text-sm font-medium">
            Chỉnh sửa
          </button>
          <button
            onClick={handleLogout}
            className="bg-gray-100 px-4 py-2 rounded hover:bg-gray-200 text-sm font-medium"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileInfo;
