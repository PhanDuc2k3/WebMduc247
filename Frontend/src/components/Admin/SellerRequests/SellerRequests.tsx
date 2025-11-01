import React, { useEffect, useState } from "react";
import userApi from "../../../api/userApi"; 

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const SellerApproval: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      console.log("🔄 [SellerApproval] Gửi yêu cầu lấy danh sách seller requests...");

      const res = await userApi.getAllSellerRequests();
      console.log("✅ [SellerApproval] Dữ liệu trả về từ BE:", res);

      const filtered = (res.data.requests || []).filter(
        (u: any) => u.sellerRequest && u.sellerRequest.store?.name
      );
      console.log("📋 [SellerApproval] Danh sách sau khi lọc:", filtered);

      setRequests(filtered);
    } catch (error: any) {
      console.error("❌ [SellerApproval] Lỗi khi lấy danh sách:", error?.response || error);
      alert(error?.response?.data?.message || "Không thể tải danh sách yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: string, action: "approve" | "reject") => {
    try {
      console.log(`⚙️ [SellerApproval] Gửi hành động ${action} cho userId=${userId}`);
      const res = await userApi.handleSellerRequest({ userId, action });

      console.log("✅ [SellerApproval] Kết quả xử lý:", res);
      alert(res.data.message || "Thao tác thành công");

      await fetchRequests();
    } catch (error: any) {
      console.error("❌ [SellerApproval] Lỗi xử lý yêu cầu:", error?.response || error);
      alert(error?.response?.data?.message || "Xử lý thất bại");
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 animate-fade-in-down">
        <h2 className="text-2xl font-bold mb-2 gradient-text flex items-center gap-2">
          <span>📋</span> Đơn đăng ký mở cửa hàng
        </h2>
        <p className="text-gray-600 text-sm">
          Danh sách và duyệt đơn đăng ký từ người muốn trở thành seller
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">⏳ Đang tải yêu cầu...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 animate-fade-in-up">
          <div className="text-8xl mb-4 animate-bounce">📭</div>
          <p className="text-gray-500 text-lg font-medium">Không có yêu cầu nào</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-purple-50 border-b-2 border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Thông tin cửa hàng</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Người đăng ký</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Danh mục</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ngày đăng ký</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((req, idx) => (
                <tr 
                  key={idx} 
                  className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {req.sellerRequest.store.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{req.sellerRequest.store.name}</div>
                        <div className="text-xs text-gray-500 max-w-xs truncate">
                          {req.sellerRequest.store.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{req.fullName}</div>
                    <div className="text-xs text-gray-500">{req.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
                      {req.sellerRequest.store.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      {new Date(req.sellerRequest.requestedAt).toLocaleDateString("vi-VN")}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${statusColor[req.sellerRequest.status]}`}>
                      {req.sellerRequest.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {req.sellerRequest.status === "pending" ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(req._id, "approve")}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110 flex items-center gap-2 font-bold"
                          title="Duyệt"
                        >
                          ✅ Duyệt
                        </button>
                        <button
                          onClick={() => handleAction(req._id, "reject")}
                          className="bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110 flex items-center gap-2 font-bold"
                          title="Từ chối"
                        >
                          ❌ Từ chối
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Đã xử lý</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SellerApproval;
