import React, { useEffect, useState, useMemo } from "react";
import userApi from "../../../api/userApi";
import { Search, Lock, Unlock, Calendar, User as UserIcon, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import Pagination from "../Pagination";

// Đồng nhất CSS cho status badges
const getStatusBadgeClass = (status: string) => {
  const statusMap: Record<string, string> = {
    "Chưa xác minh": "bg-yellow-100 text-yellow-700",
    "Đã xác minh": "bg-green-100 text-green-700",
    "Bị ban": "bg-red-100 text-red-700",
    "unverified": "bg-yellow-100 text-yellow-700",
    "verified": "bg-green-100 text-green-700",
    "banned": "bg-red-100 text-red-700",
  };
  return `px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
    statusMap[status] || "bg-gray-100 text-gray-700"
  }`;
};

// Hàm để format status
const formatStatus = (status: string | undefined, isVerified: boolean | undefined): string => {
  // Ưu tiên kiểm tra status banned trước
  if (status === "banned" || status === "Bị ban") {
    return "Bị ban";
  }
  
  // Nếu status là active hoặc không có status, kiểm tra isVerified
  if (status === "active" || !status) {
    if (isVerified === true) {
      return "Đã xác minh";
    }
    if (isVerified === false) {
      return "Chưa xác minh";
    }
  }
  
  // Mặc định nếu không có thông tin
  return "Chưa xác minh";
};
interface Order {
  _id: string;
  orderCode?: string;
  status?: string;
  statusHistory?: { status: string; timestamp: string | number }[];
}

interface User {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  avatarUrl: string;
  status?: string;
  isVerified?: boolean;
}
const getLatestStatus = (order: Order & { statusHistory?: { status: string; timestamp: string | number }[] }) => {
  if (order.statusHistory && order.statusHistory.length > 0) {
    // Sắp xếp giảm dần theo timestamp
    const sorted = [...order.statusHistory].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return sorted[0].status.toLowerCase();
  }
  return (order.status || 'pending').toLowerCase();
};

const UserManagement: React.FC = () => {
  // HOOKS
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

  useEffect(() => {
    fetchUsers();
  }, []);

  // Auto-refresh mỗi 30 giây
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUsers();
    }, 30000); // 30 giây

    return () => clearInterval(interval);
  }, []);

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user =>
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Sắp xếp theo createdAt desc (mới nhất lên trước)
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
    
    return filtered;
  }, [users, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleBanUser = async (userId: string, userName: string) => {
    const confirmToastId = toast.info(
      <div>
        <p className="font-bold mb-2">Xác nhận khóa tài khoản</p>
        <p className="mb-3">Bạn có chắc muốn khóa tài khoản của <strong>{userName}</strong>?</p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(confirmToastId);
              try {
                await userApi.banUser(userId);
                toast.success(`Đã khóa tài khoản của ${userName}`, {
                  position: "top-right",
                  containerId: "general-toast",
                });
                await fetchUsers();
              } catch (error: any) {
                console.error("❌ Lỗi khi khóa tài khoản:", error?.response || error);
                toast.error(error?.response?.data?.message || "Không thể khóa tài khoản. Vui lòng thử lại!", {
                  position: "top-right",
                  containerId: "general-toast",
                });
              }
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors mr-2"
          >
            Xác nhận
          </button>
          <button
            onClick={() => toast.dismiss(confirmToastId)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>,
      {
        position: "top-right",
        containerId: "general-toast",
        autoClose: false,
        closeOnClick: false,
      }
    );
  };

  const handleUnbanUser = async (userId: string, userName: string) => {
    const confirmToastId = toast.info(
      <div>
        <p className="font-bold mb-2">Xác nhận gỡ khóa tài khoản</p>
        <p className="mb-3">Bạn có chắc muốn gỡ khóa tài khoản của <strong>{userName}</strong>?</p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(confirmToastId);
              try {
                await userApi.unbanUser(userId);
                toast.success(`Đã gỡ khóa tài khoản của ${userName}`, {
                  position: "top-right",
                  containerId: "general-toast",
                });
                await fetchUsers();
              } catch (error: any) {
                console.error("❌ Lỗi khi gỡ khóa tài khoản:", error?.response || error);
                toast.error(error?.response?.data?.message || "Không thể gỡ khóa tài khoản. Vui lòng thử lại!", {
                  position: "top-right",
                  containerId: "general-toast",
                });
              }
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mr-2"
          >
            Xác nhận
          </button>
          <button
            onClick={() => toast.dismiss(confirmToastId)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>,
      {
        position: "top-right",
        containerId: "general-toast",
        autoClose: false,
        closeOnClick: false,
      }
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
      <p className="text-gray-600 text-lg font-medium">Đang tải danh sách người dùng...</p>
    </div>
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredAndSortedUsers.slice(startIndex, endIndex);

  return (
    <div className="p-4 lg:p-8"> {/* Adjusted padding for mobile */}
      <div className="mb-4 md:mb-6 animate-fade-in-down">
        <h2 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 gradient-text flex items-center gap-2">
          <UserIcon size={20} className="md:w-6 md:h-6 text-blue-600" />
          <span className="text-base md:text-2xl">Quản lý người dùng</span>
        </h2>
        <p className="text-gray-600 text-xs md:text-sm">
          Danh sách và quản lý tài khoản người dùng trong hệ thống
        </p>
      </div>

      {/* Total Users Count */}
      <div className="mb-4 md:mb-6 animate-fade-in-up">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg md:rounded-xl p-4 md:p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-xs md:text-sm font-medium mb-1">Tổng số người dùng</p>
              <p className="text-white text-2xl md:text-4xl font-bold">
                {filteredAndSortedUsers.length.toLocaleString('vi-VN')}
              </p>
            </div>
            <UserIcon className="w-12 h-12 md:w-16 md:h-16 text-white opacity-80" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 animate-fade-in-up">
        <div className="relative max-w-full md:max-w-md"> {/* Ensure search bar is full width on mobile */}
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
          />
        </div>
      </div>

      {filteredAndSortedUsers.length > 0 ? (
        <>
          {/* --- DESKTOP TABLE VIEW (md and up) --- */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
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
                {paginatedUsers.map((user, index) => (
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
                        ? "Khách hàng"
                        : user.role === "seller"
                        ? "Người bán"
                        : "Quản trị viên"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadgeClass(formatStatus(user.status, user.isVerified))}>
                      {formatStatus(user.status, user.isVerified)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {user.status === "banned" ? (
                      <button 
                        onClick={() => handleUnbanUser(user._id, user.fullName)}
                        className="text-green-600 hover:text-green-900 hover:bg-green-50 px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-110 flex items-center gap-1"
                      >
                        <Unlock size={16} />
                        Gỡ khóa tài khoản
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleBanUser(user._id, user.fullName)}
                        className="text-orange-600 hover:text-orange-900 hover:bg-orange-50 px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-110 flex items-center gap-1"
                      >
                        <Lock size={16} />
                        Khóa tài khoản
                      </button>
                    )}
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- MOBILE CARD VIEW (max-md) --- */}
          <div className="md:hidden space-y-4">
            {paginatedUsers.map((user, index) => (
              <div 
                key={user._id} 
                className="bg-white p-4 shadow-xl rounded-xl border border-gray-100 transition-shadow duration-300 hover:shadow-2xl animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Header: User Info */}
                <div className="flex items-center gap-3 mb-4 border-b pb-3">
                  <img
                    src={user.avatarUrl || "/default-avatar.png"}
                    alt={user.fullName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-blue-500 shadow-md"
                  />
                  <div>
                    <div className="font-bold text-lg text-gray-900">{user.fullName}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  {/* Role */}
                  <div className="text-gray-500 font-medium">Vai trò:</div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 text-xs leading-5 font-bold rounded-full ${
                        user.role === "seller"
                          ? "bg-indigo-500 text-white"
                          : user.role === "admin"
                          ? "bg-red-500 text-white"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      {user.role === "buyer"
                        ? "Khách hàng"
                        : user.role === "seller"
                        ? "Người bán"
                        : "Quản trị viên"}
                    </span>
                  </div>

                  {/* Join Date */}
                  <div className="text-gray-500 font-medium">Ngày tham gia:</div>
                  <div className="text-right text-gray-700 flex justify-end items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                  </div>

                  {/* Status */}
                  <div className="text-gray-500 font-medium">Trạng thái:</div>
                  <div className="text-right">
                    <span className={getStatusBadgeClass(formatStatus(user.status, user.isVerified))}>
                      {formatStatus(user.status, user.isVerified)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                  {user.status === "banned" ? (
                    <button 
                      onClick={() => handleUnbanUser(user._id, user.fullName)}
                      className="text-green-600 hover:text-green-900 hover:bg-green-50 px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-1 text-sm"
                    >
                      <Unlock size={16} />
                      Gỡ khóa tài khoản
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleBanUser(user._id, user.fullName)}
                      className="text-orange-600 hover:text-orange-900 hover:bg-orange-50 px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-1 text-sm"
                    >
                      <Lock size={16} />
                      Khóa tài khoản
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredAndSortedUsers.length}
            />
          )}
        </>
      ) : (
        <div className="text-center py-20 animate-fade-in-up">
          <UserIcon size={64} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 text-lg font-medium">
            {searchTerm ? "Không tìm thấy người dùng nào" : "Không có người dùng nào"}
          </p>
        </div>
      )}
    </div>
  );
};

export default UserManagement;