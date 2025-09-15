import React, { useEffect, useState } from "react";

const ProfileInfoDetail: React.FC = () => {
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
      .then((data) => setUser(data.user))
      .catch((err) => console.error("Lỗi fetch user:", err));
  }, []);

  if (!user) return <div>Đang tải...</div>;

  return (
    <div className="bg-white rounded-xl shadow p-6 mb-6">
      <div className="font-semibold mb-4">Thông tin cá nhân</div>
      <div className="grid grid-cols-2 gap-8">
        <div>
          <div className="mb-2">
            <span className="text-gray-500">Họ và tên</span>
            <div className="font-medium">{user.fullName}</div>
          </div>
          <div className="mb-2">
            <span className="text-gray-500">Email</span>
            <div className="font-medium">{user.email}</div>
          </div>
          <div>
            <span className="text-gray-500">Số điện thoại</span>
            <div className="font-medium">{user.phone}</div>
          </div>
        </div>
        <div>
          <div className="mb-2">
            <span className="text-gray-500">Ngày tham gia</span>
            <div className="font-medium">
              {new Date(user.createdAt).toLocaleDateString("vi-VN")}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Trạng thái tài khoản</span>
            <div>
              {user.role && (
                <span className="bg-black text-white px-3 py-1 rounded text-xs font-medium inline-block mt-1">
                  {user.role === "buyer"
                    ? "Người mua"
                    : user.role === "seller"
                    ? "Người bán"
                    : "Admin"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileInfoDetail;
