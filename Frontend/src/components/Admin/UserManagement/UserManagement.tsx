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

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
      <p className="text-gray-600 text-lg font-medium">⏳ Đang tải danh sách người dùng...</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 animate-fade-in-down">
        <h2 className="text-2xl font-bold mb-2 gradient-text flex items-center gap-2">
          <span>👥</span> Quản lý người dùng
        </h2>
        <p className="text-gray-600 text-sm">
          Danh sách và quản lý tài khoản người dùng trong hệ thống
        </p>
      </div>

      {users.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Người dùng</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Vai trò</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ngày tham gia</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user, index) => (
                <tr 
                  key={user._id} 
                  className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={user.avatarUrl || "/default-avatar.png"}
                          alt={user.fullName}
                          className="w-12 h-12 rounded-full object-cover border-3 border-white shadow-lg hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{user.fullName}</div>
                        <div className="text-xs text-gray-500">{user._id.slice(-6)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                        user.role === "seller"
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                          : user.role === "admin"
                          ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg"
                          : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                      }`}
                    >
                      {user.role === "buyer"
                        ? "👤 Khách hàng"
                        : user.role === "seller"
                        ? "🏬 Người bán"
                        : "👨‍💼 Admin"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                        statusColor[user.status || "Hoạt động"]
                      }`}
                    >
                      {user.status || "Hoạt động"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-110">
                        ✏️ Sửa
                      </button>
                      <button className="text-red-600 hover:text-red-900 hover:bg-red-50 px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-110">
                        🗑️ Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-20 animate-fade-in-up">
          <div className="text-8xl mb-4 animate-bounce">😕</div>
          <p className="text-gray-500 text-lg font-medium">Không có người dùng nào</p>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
