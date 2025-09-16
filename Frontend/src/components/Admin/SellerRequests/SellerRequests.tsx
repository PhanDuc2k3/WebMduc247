import React, { useEffect, useState } from "react";

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const SellerApproval: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Lấy token admin từ localStorage
  const token = localStorage.getItem("token");

  // Fetch danh sách yêu cầu từ BE
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/users/seller-requests", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      // 🔥 Chỉ giữ những user có sellerRequest + có store name
      const filtered = (data.requests || []).filter(
        (u: any) => u.sellerRequest && u.sellerRequest.store?.name
      );

      setRequests(filtered);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách:", error);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý duyệt / từ chối
  const handleAction = async (userId: string, action: "approve" | "reject") => {
    try {
      const res = await fetch("http://localhost:5000/api/users/handle-seller-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, action }),
      });

      const data = await res.json();
      alert(data.message);
      fetchRequests(); // reload lại danh sách
    } catch (error) {
      console.error("Lỗi xử lý yêu cầu:", error);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div>
      <div className="font-semibold mb-2">Đơn đăng ký mở cửa hàng</div>
      <div className="text-gray-500 mb-4 text-sm">
        Danh sách và duyệt đơn đăng ký từ người muốn trở thành seller
      </div>

      {loading ? (
        <div>Đang tải...</div>
      ) : (
        <div className="bg-white rounded-lg shadow p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Thông tin cửa hàng</th>
                <th>Người đăng ký</th>
                <th>Danh mục</th>
                <th>Ngày đăng ký</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-gray-500">
                    Không có yêu cầu nào
                  </td>
                </tr>
              ) : (
                requests.map((req, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2">
                      <div className="font-medium">{req.sellerRequest.store.name}</div>
                      <div className="text-xs text-gray-500">
                        {req.sellerRequest.store.description}
                      </div>
                    </td>
                    <td>
                      <div>{req.fullName}</div>
                      <div className="text-xs text-gray-500">{req.email}</div>
                    </td>
                    <td>
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                        {req.sellerRequest.store.category}
                      </span>
                    </td>
                    <td>
                      {new Date(req.sellerRequest.requestedAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          statusColor[req.sellerRequest.status]
                        }`}
                      >
                        {req.sellerRequest.status}
                      </span>
                    </td>
                    <td>
                      {req.sellerRequest.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(req._id, "approve")}
                            className="text-green-600 hover:bg-green-50 rounded px-2 py-1"
                            title="Duyệt"
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => handleAction(req._id, "reject")}
                            className="text-red-600 hover:bg-red-50 rounded px-2 py-1"
                            title="Từ chối"
                          >
                            ❌
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SellerApproval;
