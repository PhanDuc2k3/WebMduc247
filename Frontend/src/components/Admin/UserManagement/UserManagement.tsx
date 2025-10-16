import React, { useEffect, useState } from "react";
import userApi from "../../../api/userApi"; 

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
  status?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log("🔄 Đang gọi API lấy danh sách người dùng...");
        const response = await userApi.getAllUsers();

        const payload = (response && (response as any).data !== undefined) ? (response as any).data : response;

        console.log("✅ Dữ liệu trả về từ API:", payload);

        const userList = Array.isArray(payload)
          ? payload
          : payload?.users || [];

        setUsers(userList);
      } catch (error: any) {
        console.error("❌ Lỗi khi fetch users:", error?.response || error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) return <div>Đang tải danh sách người dùng...</div>;

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
          {users.length > 0 ? (
            users.map((user) => (
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
                      statusColor[user.status || "Hoạt động"]
                    }`}
                  >
                    {user.status || "Hoạt động"}
                  </span>
                </td>
                <td>
                  <button className="text-gray-400 hover:text-black px-2">
                    ...
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="text-center py-4 text-gray-500">
                Không có người dùng nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UserManagement;
