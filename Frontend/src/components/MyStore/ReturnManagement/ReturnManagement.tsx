import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, CheckCircle, XCircle, Package, Clock, User } from "lucide-react";
import ConfirmDialog from "../../ui/ConfirmDialog";
import orderApi from "../../../api/orderApi";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

interface OrderItem {
  _id: string;
  name: string;
  quantity: number;
  price: number;
  salePrice?: number;
  imageUrl?: string;
  variation?: {
    color?: string;
    size?: string;
  };
}

interface ReturnRequest {
  requestedAt?: string | Date;
  reason?: string;
  status?: string;
  processedAt?: string | Date;
}

interface Order {
  _id: string;
  orderCode: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  items: OrderItem[];
  total: number;
  statusHistory: Array<{ status: string; timestamp: string | Date; note?: string }>;
  returnRequest?: ReturnRequest;
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
  };
}

const ReturnManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmReturn, setConfirmReturn] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });
  const [rejectReturn, setRejectReturn] = useState<{ open: boolean; orderId: string | null; reason: string }>({ open: false, orderId: null, reason: "" });
  const navigate = useNavigate();

  useEffect(() => {
    fetchReturnOrders();
  }, []);

  const fetchReturnOrders = async () => {
    try {
      setLoading(true);
      const res = await orderApi.getOrdersBySeller();
      const allOrders = res.data || [];
      
      // Lọc các đơn hàng có yêu cầu trả lại
      const returnOrders = allOrders.filter((order: Order) => {
        const currentStatus = order.statusHistory && order.statusHistory.length > 0
          ? order.statusHistory[order.statusHistory.length - 1]?.status
          : null;
        
        return (
          order.returnRequest &&
          order.returnRequest.status === "pending" &&
          (currentStatus === "return_requested" || currentStatus === "returned")
        );
      });
      
      setOrders(returnOrders);
    } catch (err: any) {
      console.error("Lỗi khi tải đơn hàng trả lại:", err);
      toast.error(err.response?.data?.message || "Lỗi khi tải danh sách đơn hàng trả lại");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReturnClick = (orderId: string) => {
    setConfirmReturn({ open: true, orderId });
  };

  const handleConfirmReturn = async () => {
    if (!confirmReturn.orderId) return;
    const orderId = confirmReturn.orderId;
    setConfirmReturn({ open: false, orderId: null });
    setProcessingId(orderId);
    try {
      await orderApi.confirmReturnReceived(orderId);
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-500" size={18} />
          <span>Đã xác nhận thu hồi sản phẩm. Tiền đã được hoàn lại cho người mua.</span>
        </div>,
        {
          containerId: "general-toast",
        }
      );
      fetchReturnOrders(); // Reload danh sách
    } catch (err: any) {
      console.error("Lỗi xác nhận thu hồi:", err);
      const errorMessage = err.response?.data?.message 
        || err.message 
        || "Lỗi khi xác nhận thu hồi sản phẩm!";
      toast.error(
        <div className="flex items-center gap-2">
          <XCircle className="text-red-500" size={18} />
          <span>{errorMessage}</span>
        </div>,
        {
          containerId: "general-toast",
        }
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectReturnClick = (orderId: string) => {
    setRejectReturn({ open: true, orderId, reason: "" });
  };

  const handleRejectReturn = async () => {
    if (!rejectReturn.orderId) return;
    const orderId = rejectReturn.orderId;
    const reason = rejectReturn.reason.trim();
    setRejectReturn({ open: false, orderId: null, reason: "" });
    setProcessingId(orderId);
    try {
      await orderApi.rejectReturn(orderId, reason || undefined);
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-500" size={18} />
          <span>Đã từ chối yêu cầu trả lại hàng</span>
        </div>,
        {
          containerId: "general-toast",
        }
      );
      fetchReturnOrders(); // Reload danh sách
    } catch (err: any) {
      console.error("Lỗi từ chối yêu cầu:", err);
      const errorMessage = err.response?.data?.message 
        || err.message 
        || "Lỗi khi từ chối yêu cầu trả lại hàng!";
      toast.error(
        <div className="flex items-center gap-2">
          <XCircle className="text-red-500" size={18} />
          <span>{errorMessage}</span>
        </div>,
        {
          containerId: "general-toast",
        }
      );
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      "return_requested": "Chờ thu hồi",
      "returned": "Đã thu hồi",
      "pending": "Chờ xử lý",
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 p-8 sm:p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Đang tải danh sách sản phẩm thu hồi...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 p-8 sm:p-12 text-center">
        <RotateCcw className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Chưa có sản phẩm thu hồi</h3>
        <p className="text-gray-600">Hiện tại không có đơn hàng nào cần xử lý trả lại</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 mb-2">
          <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
          Quản lý sản phẩm thu hồi
        </h2>
        <p className="text-gray-600 text-sm sm:text-base">
          Danh sách các đơn hàng có yêu cầu trả lại. Vui lòng xác nhận khi đã nhận được sản phẩm.
        </p>
      </div>

      {orders.map((order) => {
        const currentStatus = order.statusHistory && order.statusHistory.length > 0
          ? order.statusHistory[order.statusHistory.length - 1]?.status
          : null;

        return (
          <div
            key={order._id}
            className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-orange-200 overflow-hidden animate-fade-in-up"
          >
            <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 sm:p-6 border-b-2 border-orange-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                    Đơn hàng: {order.orderCode}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm sm:text-base">
                    <span className="px-2 sm:px-3 py-1 bg-orange-100 text-orange-700 rounded-lg font-semibold border border-orange-300">
                      {getStatusLabel(currentStatus || "pending")}
                    </span>
                    <span className="text-gray-600">
                      Tổng tiền: <span className="font-bold text-gray-900">{order.total.toLocaleString("vi-VN")}₫</span>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/order/${order._id}`)}
                  className="px-3 sm:px-4 py-2 text-sm sm:text-base font-semibold text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Xem chi tiết
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Thông tin khách hàng */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  Thông tin khách hàng
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Tên:</span>{" "}
                    <span className="font-semibold text-gray-900">{order.userId.fullName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>{" "}
                    <span className="font-semibold text-gray-900">{order.userId.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">SĐT:</span>{" "}
                    <span className="font-semibold text-gray-900">{order.userId.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Địa chỉ:</span>{" "}
                    <span className="font-semibold text-gray-900">{order.shippingAddress.address}</span>
                  </div>
                </div>
              </div>

              {/* Lý do trả lại */}
              {order.returnRequest?.reason && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                  <h4 className="text-sm sm:text-base font-bold text-yellow-900 mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                    Lý do trả lại
                  </h4>
                  <p className="text-sm sm:text-base text-yellow-800">{order.returnRequest.reason}</p>
                  {order.returnRequest.requestedAt && (
                    <p className="text-xs sm:text-sm text-yellow-700 mt-2">
                      Yêu cầu vào: {new Date(order.returnRequest.requestedAt).toLocaleString("vi-VN")}
                    </p>
                  )}
                </div>
              )}

              {/* Danh sách sản phẩm */}
              <div>
                <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                  Sản phẩm cần thu hồi
                </h4>
                <div className="space-y-2 sm:space-y-3">
                  {order.items.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl.startsWith("/uploads") ? `http://localhost:5000${item.imageUrl}` : item.imageUrl}
                          alt={item.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-300 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base mb-1">{item.name}</p>
                        {item.variation && (
                          <div className="flex flex-wrap gap-2 mb-1">
                            {item.variation.color && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded border border-blue-300">
                                Màu: {item.variation.color}
                              </span>
                            )}
                            {item.variation.size && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded border border-purple-300">
                                Size: {item.variation.size}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-xs sm:text-sm text-gray-600">
                          Số lượng: <span className="font-semibold">{item.quantity}</span> | Giá:{" "}
                          <span className="font-semibold">
                            {(item.salePrice || item.price).toLocaleString("vi-VN")}₫
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nút xác nhận và từ chối */}
              <div className="pt-3 sm:pt-4 border-t border-gray-200 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={() => handleConfirmReturnClick(order._id)}
                    disabled={processingId === order._id || order.returnRequest?.status !== "pending"}
                    className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 ${
                      processingId === order._id || order.returnRequest?.status !== "pending"
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    }`}
                  >
                    {processingId === order._id ? (
                      <>
                        <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} className="sm:w-5 sm:h-5" />
                        <span>Xác nhận đã thu hồi</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleRejectReturnClick(order._id)}
                    disabled={processingId === order._id || order.returnRequest?.status !== "pending"}
                    className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 ${
                      processingId === order._id || order.returnRequest?.status !== "pending"
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                    }`}
                  >
                    <XCircle size={18} className="sm:w-5 sm:h-5" />
                    <span>Từ chối</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 text-center">
                  Xác nhận: Tiền sẽ được hoàn lại cho người mua | Từ chối: Yêu cầu sẽ bị hủy
                </p>
              </div>
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        open={confirmReturn.open}
        onClose={() => setConfirmReturn({ open: false, orderId: null })}
        onConfirm={handleConfirmReturn}
        title="Xác nhận thu hồi sản phẩm"
        message="Bạn đã nhận được sản phẩm trả lại? Xác nhận sẽ hoàn tiền cho người mua."
        type="info"
        loading={processingId !== null}
        confirmText="Xác nhận"
      />

      {/* Modal từ chối yêu cầu */}
      {rejectReturn.open && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && processingId === null) {
              setRejectReturn({ open: false, orderId: null, reason: "" });
            }
          }}
        >
          <div 
            className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 border-b-2 border-gray-200">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                Từ chối yêu cầu trả lại hàng
              </h3>
            </div>
            <div className="p-4 sm:p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lý do từ chối <span className="text-gray-500">(tùy chọn)</span>
              </label>
              <textarea
                value={rejectReturn.reason}
                onChange={(e) => setRejectReturn({ ...rejectReturn, reason: e.target.value })}
                placeholder="Nhập lý do từ chối yêu cầu trả lại hàng (ví dụ: Sản phẩm không đúng với mô tả ban đầu, đã qua thời hạn đổi trả, v.v.)"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-500 resize-none"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {rejectReturn.reason.length}/500 ký tự
              </p>
            </div>
            <div className="p-4 sm:p-6 border-t-2 border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setRejectReturn({ open: false, orderId: null, reason: "" })}
                disabled={processingId !== null}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-300 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                onClick={handleRejectReturn}
                disabled={processingId !== null}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg sm:rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processingId !== null && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Từ chối
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ReturnManagement;

