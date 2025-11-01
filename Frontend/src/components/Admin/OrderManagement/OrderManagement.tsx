import React, { useEffect, useState } from 'react';
import orderApi from '../../../api/orderApi';
import { Edit, Trash2, Search, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Order {
  _id: string;
  orderCode?: string;
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
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    status: '',
    note: '',
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderApi.getAllOrders();
      const data = response.data?.orders || response.data || [];
      setOrders(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      alert(error?.response?.data?.message || 'Lỗi khi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

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

  const filteredOrders = orders.filter(order =>
    order.orderCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    shipping: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-4"></div>
        <p className="text-gray-600 text-lg font-medium">⏳ Đang tải đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 animate-fade-in-down">
        <h2 className="text-2xl font-bold mb-2 gradient-text flex items-center gap-2">
          <span>🛒</span> Quản lý đơn hàng
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
            placeholder="Tìm kiếm đơn hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
          />
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length > 0 ? (
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
              {filteredOrders.map((order, index) => (
                <tr
                  key={order._id}
                  className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-gray-900">{order.orderCode || order._id.slice(-8)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{order.customer?.fullName || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{order.customer?.email || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-green-600">
                      {order.total?.toLocaleString('vi-VN') || 0}đ
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                      statusColors[order.status?.toLowerCase() || 'pending'] || 'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status || 'Pending'}
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
      ) : (
        <div className="text-center py-20 animate-fade-in-up">
          <div className="text-8xl mb-4 animate-bounce">🛒</div>
          <p className="text-gray-500 text-lg font-medium">Không tìm thấy đơn hàng nào</p>
        </div>
      )}

      {/* Edit Form Modal */}
      {showForm && editingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in">
            <div className="p-6 border-b-2 border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold gradient-text">✏️ Sửa đơn hàng</h3>
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
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipping">Shipping</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
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
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  💾 Lưu thay đổi
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

