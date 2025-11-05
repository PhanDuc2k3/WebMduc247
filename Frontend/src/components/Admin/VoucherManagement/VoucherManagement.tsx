import React, { useEffect, useState } from 'react';
import voucherApi from '../../../api/voucherApi';
import type { VoucherType } from '../../../api/voucherApi';
import { Edit, Trash2, Plus, Search, Gift } from 'lucide-react';

const VoucherManagement: React.FC = () => {
  const [vouchers, setVouchers] = useState<VoucherType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherType | null>(null);
  const [formData, setFormData] = useState<VoucherType>({
    code: '',
    title: '',
    description: '',
    condition: '',
    voucherType: 'product',
    discountType: 'percent',
    discountValue: 0,
    minOrderValue: 0,
    maxDiscount: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usageLimit: 0,
    isActive: true,
  });
  
  // State cho chọn category (chỉ admin)
  const [isGlobal, setIsGlobal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // Danh sách categories có sẵn
  const availableCategories = [
    { value: 'electronics', label: 'Điện tử' },
    { value: 'fashion', label: 'Thời trang' },
    { value: 'home', label: 'Nội thất' },
    { value: 'books', label: 'Sách' },
    { value: 'other', label: 'Khác' },
  ];

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const response = await voucherApi.getAvailableVouchers();
      setVouchers(response.data || []);
    } catch (error: any) {
      console.error('Error fetching vouchers:', error);
      alert(error?.response?.data?.message || 'Lỗi khi tải danh sách voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (voucherId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa voucher này?')) return;
    
    try {
      await voucherApi.deleteVoucher(voucherId);
      alert('Đã xóa voucher thành công!');
      fetchVouchers();
    } catch (error: any) {
      console.error('Error deleting voucher:', error);
      alert(error?.response?.data?.message || 'Lỗi khi xóa voucher');
    }
  };

  const handleEdit = (voucher: VoucherType) => {
    setEditingVoucher(voucher);
    setFormData({
      ...voucher,
      startDate: voucher.startDate ? new Date(voucher.startDate).toISOString().split('T')[0] : '',
      endDate: voucher.endDate ? new Date(voucher.endDate).toISOString().split('T')[0] : '',
    });
    
    // Set selected categories và global cho edit
    if ((voucher as any).global) {
      setIsGlobal(true);
      setSelectedCategories([]);
    } else if ((voucher as any).categories && Array.isArray((voucher as any).categories) && (voucher as any).categories.length > 0) {
      setIsGlobal(false);
      setSelectedCategories((voucher as any).categories);
    } else {
      // Nếu có store cụ thể = seller tạo, admin không thể edit
      setIsGlobal(false);
      setSelectedCategories([]);
    }
    
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const submitData: any = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      };

      // Admin: thêm categories hoặc global
      if (isGlobal) {
        submitData.global = true;
        submitData.categories = [];
      } else if (selectedCategories.length > 0) {
        submitData.global = false;
        submitData.categories = selectedCategories;
      } else {
        submitData.global = true; // Mặc định global nếu không chọn gì
        submitData.categories = [];
      }

      if (editingVoucher?._id) {
        await voucherApi.updateVoucher(editingVoucher._id, submitData);
        alert('Đã cập nhật voucher thành công!');
      } else {
        await voucherApi.createVoucher(submitData);
        alert('Đã tạo voucher thành công!');
      }
      
      setShowForm(false);
      setEditingVoucher(null);
      setSelectedCategories([]);
      setIsGlobal(false);
      setFormData({
        code: '',
        title: '',
        description: '',
        condition: '',
        voucherType: 'product',
        discountType: 'percent',
        discountValue: 0,
        minOrderValue: 0,
        maxDiscount: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        usageLimit: 0,
        isActive: true,
      });
      fetchVouchers();
    } catch (error: any) {
      console.error('Error saving voucher:', error);
      alert(error?.response?.data?.message || 'Lỗi khi lưu voucher');
    }
  };

  const filteredVouchers = vouchers.filter(voucher =>
    voucher.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voucher.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-4"></div>
        <p className="text-gray-600 text-lg font-medium">Đang tải voucher...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 animate-fade-in-down">
        <h2 className="text-2xl font-bold mb-2 gradient-text flex items-center gap-2">
          <span>��</span> Quản lý Voucher
        </h2>
        <p className="text-gray-600 text-sm">
          Quản lý và tạo các mã giảm giá cho khách hàng
        </p>
      </div>

      {/* Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between animate-fade-in-up">
        {/* Search */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm voucher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
          />
        </div>

        {/* Add Button */}
        <button
          onClick={() => {
            setEditingVoucher(null);
            setFormData({
              code: '',
              title: '',
              description: '',
              condition: '',
              voucherType: 'product',
              discountType: 'percent',
              discountValue: 0,
              minOrderValue: 0,
              maxDiscount: 0,
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              usageLimit: 0,
              isActive: true,
            });
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
        >
          <Plus size={20} />
          Thêm voucher
        </button>
      </div>

      {/* Vouchers Table */}
      {filteredVouchers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Mã voucher</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Mô tả</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Giảm giá</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Đơn tối thiểu</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Thời hạn</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Trạng thái</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVouchers.map((voucher, index) => (
                <tr
                  key={voucher._id}
                  className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-gray-900">{voucher.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700 max-w-xs truncate">
                      {voucher.description || 'Không có mô tả'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-green-600">
                      {voucher.discountType === 'percent'
                        ? `${voucher.discountValue}%`
                        : `${voucher.discountValue.toLocaleString('vi-VN')}đ`}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-700">
                      {voucher.minOrderValue ? `${voucher.minOrderValue.toLocaleString('vi-VN')}đ` : 'Không có'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {voucher.startDate && voucher.endDate
                      ? `${new Date(voucher.startDate).toLocaleDateString('vi-VN')} - ${new Date(voucher.endDate).toLocaleDateString('vi-VN')}`
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                        voucher.isActive
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                          : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                      }`}
                    >
                      {voucher.isActive ? 'Hoạt động' : 'Tạm khóa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(voucher)}
                        className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-110 flex items-center gap-1"
                      >
                        <Edit size={16} />
                        Sửa
                      </button>
                      <button
                        onClick={() => voucher._id && handleDelete(voucher._id)}
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
          <div className="text-8xl mb-4 animate-bounce">��</div>
          <p className="text-gray-500 text-lg font-medium">Không tìm thấy voucher nào</p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6 border-b-2 border-gray-200">
              <div className="flex items-center justify-between">
                                  <h3 className="text-2xl font-bold gradient-text">
                    {editingVoucher ? 'Sửa voucher' : 'Thêm voucher mới'}
                  </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingVoucher(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mã voucher *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tiêu đề *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  placeholder="Nhập tiêu đề voucher"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  placeholder="Nhập mô tả voucher"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Điều kiện *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  placeholder="Nhập điều kiện áp dụng voucher"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Loại voucher *</label>
                <select
                  required
                  value={formData.voucherType || 'product'}
                  onChange={(e) => setFormData({ ...formData, voucherType: e.target.value as 'product' | 'freeship' })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                >
                  <option value="product">Giảm giá sản phẩm</option>
                  <option value="freeship">Miễn phí vận chuyển</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Loại giảm giá *</label>
                  <select
                    required
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percent' | 'fixed' })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  >
                    <option value="percent">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Giá trị giảm *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Đơn hàng tối thiểu</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: Number(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  />
                </div>

                {formData.discountType === 'percent' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Giảm tối đa</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maxDiscount}
                      onChange={(e) => setFormData({ ...formData, maxDiscount: Number(e.target.value) })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Ngày bắt đầu *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Ngày kết thúc *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  />
                </div>
              </div>

              {/* Phần chọn loại cửa hàng (chỉ Admin) */}
              <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
                <label className="block text-sm font-bold text-gray-700 mb-3">Áp dụng cho cửa hàng</label>
                
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="storeScope"
                      checked={isGlobal}
                      onChange={() => {
                        setIsGlobal(true);
                        setSelectedCategories([]);
                      }}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="font-semibold text-gray-700">Áp dụng cho tất cả cửa hàng (Global)</span>
                  </label>
                </div>

                <div className="mb-3">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="radio"
                      name="storeScope"
                      checked={!isGlobal}
                      onChange={() => setIsGlobal(false)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="font-semibold text-gray-700">Áp dụng cho loại cửa hàng</span>
                  </label>
                  
                  {!isGlobal && (
                    <div className="ml-6 border-2 border-gray-300 rounded-lg p-3 bg-white">
                      <p className="text-xs text-gray-500 mb-3">Chọn loại cửa hàng để áp dụng voucher:</p>
                      <div className="space-y-2">
                        {availableCategories.map((category) => (
                          <label key={category.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(category.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCategories([...selectedCategories, category.value]);
                                } else {
                                  setSelectedCategories(selectedCategories.filter(c => c !== category.value));
                                }
                              }}
                              className="w-4 h-4 text-purple-600"
                            />
                            <span className="text-sm text-gray-700">{category.label}</span>
                          </label>
                        ))}
                      </div>
                      {selectedCategories.length > 0 && (
                        <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                          Đã chọn: {selectedCategories.map(c => availableCategories.find(cat => cat.value === c)?.label).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Giới hạn sử dụng</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Trạng thái</label>
                  <select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Tạm khóa</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  {editingVoucher ? '�� Lưu thay đổi' : '➕ Tạo voucher'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingVoucher(null);
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

export default VoucherManagement;





