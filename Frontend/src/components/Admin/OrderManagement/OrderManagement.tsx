import React, { useEffect, useState, useMemo, useCallback } from 'react';
import orderApi from '../../../api/orderApi';
import { Edit, Trash2, Search, Eye, User, Mail, Phone, ShoppingBag, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../Pagination';

// Đồng nhất CSS cho status badges
const getStatusBadgeClass = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    packed: 'bg-purple-100 text-purple-700',
    shipping: 'bg-purple-100 text-purple-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    received: 'bg-green-100 text-green-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  const normalizedStatus = (status || 'pending').toLowerCase();
  return `px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${statusMap[normalizedStatus] || 'bg-gray-100 text-gray-700'}`;
};

const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: 'Chờ xử lý',
    confirmed: 'Đã xác nhận',
    packed: 'Đã đóng gói',
    shipping: 'Đang giao hàng',
    shipped: 'Đang giao hàng',
    delivered: 'Đã giao hàng',
    received: 'Đã nhận hàng',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
  };
  return statusMap[(status || 'pending').toLowerCase()] || status;
};


interface Order {
  _id: string;
  orderCode?: string;
  userInfo?: {
    fullName: string;
    email: string;
    phone: string;
    role: string;
    avatarUrl?: string;
  };
  customer?: { fullName: string; email: string };
  total: number;
  status: string;
  paymentStatus?: string;
  createdAt?: string;
  items?: Array<{ productName: string; quantity: number }>;
}

const OrderManagement: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    status: '',
    note: '',
  });

const fetchOrders = useCallback(async (showLoading = true) => {
  try {
    if (showLoading) setLoading(true);

    const response = await orderApi.getAllOrders();
    const data = response.data?.orders || response.data || [];

    // Chuẩn hóa status luôn thành lowercase
    const normalizedOrders = Array.isArray(data)
      ? data.map((o: Order) => ({
          ...o,
          status: (o.status || 'pending').toLowerCase(),
        }))
      : [];

    setOrders(normalizedOrders);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    if (showLoading) {
      alert(error?.response?.data?.message || 'Lỗi khi tải danh sách đơn hàng');
    }
  } finally {
    if (showLoading) setLoading(false);
  }
}, []);


  useEffect(() => {
    // Load lần đầu với loading spinner
    fetchOrders(true);
    
    // Tự động cập nhật danh sách đơn hàng mỗi 30 giây (không hiển thị loading)
    const interval = setInterval(() => {
      fetchOrders(false);
    }, 30000); // 30 giây = 30000 milliseconds
    
    // Cleanup interval khi component unmount
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleDelete = async (orderId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa đơn hàng này? Việc này không thể hoàn tác!')) return;
    
    try {
      await orderApi.deleteOrder(orderId);
      alert('Đã xóa đơn hàng thành công!');
      fetchOrders();
    } catch (error: any) {
      console.error('Error deleting order:', error);
      alert(error?.response?.data?.message || 'Lỗi khi xóa đơn hàng');
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      status: order.status,
      note: '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingOrder) return;

    try {
      await orderApi.updateOrderStatus(editingOrder._id, { status: formData.status });
      if (formData.note) {
        await orderApi.updateOrder(editingOrder._id, { note: formData.note });
      }
      alert('Đã cập nhật đơn hàng thành công!');
      setShowForm(false);
      setEditingOrder(null);
      setFormData({ status: '', note: '' });
      fetchOrders();
    } catch (error: any) {
      console.error('Error updating order:', error);
      alert(error?.response?.data?.message || 'Lỗi khi cập nhật đơn hàng');
    }
  };

  // Sắp xếp và lọc orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      const customer = order.userInfo || order.customer;
      return (
        order.orderCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.userInfo?.phone && order.userInfo.phone.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
    
    // Sắp xếp theo createdAt desc (mới nhất lên trước)
    filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    
    return filtered;
  }, [orders, searchTerm]);
  
  // Pagination
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredAndSortedOrders.slice(startIndex, endIndex);
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

  // Reset page khi search thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-16 h-16 text-purple-500 animate-spin mb-4" />
        <p className="text-gray-600 text-lg font-medium">Đang tải đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 animate-fade-in-down">
        <h2 className="text-2xl font-bold mb-2 gradient-text flex items-center gap-2">
          <ShoppingBag size={24} className="text-blue-600" />
          Quản lý đơn hàng
        </h2>
        <p className="text-gray-600 text-sm">
          Quản lý và cập nhật trạng thái đơn hàng trong hệ thống
        </p>
      </div>

      {/* Search */}
      <div className="mb-6 animate-fade-in-up">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm đơn hàng, khách hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
          />
        </div>
      </div>

      {/* Orders Table */}
      {filteredAndSortedOrders.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Mã đơn</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Khách hàng</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Tổng tiền</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Trạng thái</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Ngày tạo</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedOrders.map((order, index) => (
                <tr
                  key={order._id}
                  className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-gray-900">{order.orderCode || order._id.slice(-8)}</span>
                  </td>
                  <td className="px-6 py-4">
                    {order.userInfo ? (
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <img
                            src={order.userInfo.avatarUrl || '/avatar.png'}
                            alt={order.userInfo.fullName}
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 shadow-md"
                          />
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-gray-900 flex items-center gap-1">
                            <User size={14} className="text-gray-400" />
                            {order.userInfo.fullName}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Mail size={12} className="text-gray-400" />
                            {order.userInfo.email}
                          </div>
                          {order.userInfo.phone && (
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Phone size={12} className="text-gray-400" />
                              {order.userInfo.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium text-gray-900">{order.customer?.fullName || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{order.customer?.email || ''}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-green-600">
                      {order.total?.toLocaleString('vi-VN') || 0}đ
                    </span>
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadgeClass(getLatestStatus(order))}>
                        {getStatusLabel(getLatestStatus(order))}
                      </span>
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString('vi-VN')
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/order/${order._id}`)}
                        className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-110 flex items-center gap-1"
                      >
                        <Eye size={16} />
                        Xem
                      </button>
                      <button
                        onClick={() => handleEdit(order)}
                        className="text-purple-600 hover:text-purple-900 hover:bg-purple-50 px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-110 flex items-center gap-1"
                      >
                        <Edit size={16} />
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(order._id)}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50 px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-110 flex items-center gap-1"
                      >
                        <Trash2 size={16} />
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredAndSortedOrders.length}
            />
          )}
        </>
      ) : (
        <div className="text-center py-20 animate-fade-in-up">
          <ShoppingBag size={64} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 text-lg font-medium">
            {searchTerm ? "Không tìm thấy đơn hàng nào" : "Không có đơn hàng nào"}
          </p>
        </div>
      )}

      {/* Edit Form Modal */}
      {showForm && editingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in">
            <div className="p-6 border-b-2 border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold gradient-text flex items-center gap-2">
                  <Edit size={24} className="text-purple-600" />
                  Sửa đơn hàng
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingOrder(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mã đơn hàng</label>
                <input
                  type="text"
                  value={editingOrder.orderCode || editingOrder._id.slice(-8)}
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Trạng thái *</label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                >
                  <option value="pending">Chờ xử lý</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="packed">Đã đóng gói</option>
                  <option value="shipping">Đang giao hàng</option>
                  <option value="delivered">Đã giao hàng</option>
                  <option value="received">Đã nhận hàng</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Ghi chú</label>
                <textarea
                  rows={3}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Edit size={18} />
                  Lưu thay đổi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingOrder(null);
                  }}
                  className="flex-1 bg-gradient-to-r from-gray-400 to-gray-600 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;

