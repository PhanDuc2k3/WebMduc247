import React, { useEffect, useState } from "react";

const statusColor: Record<string, string> = {
  "Hoạt động": "bg-green-100 text-green-700",
  "Chờ duyệt": "bg-yellow-100 text-yellow-700",
  "Tạm khóa": "bg-red-100 text-red-700",
};

interface User {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  avatarUrl: string;
  // bạn có thể thêm status nếu backend có field này
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:5000/api/users/all", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi fetch users:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Đang tải...</div>;

  return (
    <div>
      <div className="font-semibold mb-2">Quản lý người dùng</div>
      <div className="text-gray-500 mb-4 text-sm">
        Danh sách và quản lý tài khoản người dùng
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="py-2">Người dùng</th>
            <th>Email</th>
            <th>Vai trò</th>
            <th>Ngày tham gia</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id} className="border-b">
              <td className="py-2 flex items-center gap-2">
                <img
                  src={user.avatarUrl || "/default-avatar.png"}
                  alt={user.fullName}
                  className="w-8 h-8 rounded-full object-cover"
                />
                {user.fullName}
              </td>
              <td>{user.email}</td>
              <td>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    user.role === "seller"
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {user.role === "buyer"
                    ? "Khách hàng"
                    : user.role === "seller"
                    ? "Người bán"
                    : "Admin"}
                </span>
              </td>
              <td>{new Date(user.createdAt).toLocaleDateString("vi-VN")}</td>
              <td>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    statusColor["Hoạt động"]
                  }`}
                >
                  Hoạt động
                </span>
              </td>
              <td>
                <button className="text-gray-400 hover:text-black px-2">
                  ...
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserManagement;
