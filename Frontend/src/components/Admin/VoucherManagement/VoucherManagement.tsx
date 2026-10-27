import React, { useEffect, useState, useMemo } from 'react';
import voucherApi from '../../../api/voucherApi';
import type { VoucherType } from '../../../api/voucherApi';
import { Edit, Trash2, Plus, Search, Gift, Lock, Unlock, Loader2, Ticket, Calendar, DollarSign, Zap } from 'lucide-react';
import ConfirmDialog from '../../ui/ConfirmDialog';
import Pagination from '../Pagination';
import { toast } from 'react-toastify';

// Đồng nhất CSS cho status badges
const getStatusBadgeClass = (isActive: boolean) => {
  return `px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
    isActive
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-700'
  }`;
};

// Định dạng giá trị giảm giá
const formatDiscountValue = (voucher: VoucherType) => {
    if (voucher.discountType === 'percent') {
        return `${voucher.discountValue}%`;
    }
    return `${voucher.discountValue.toLocaleString('vi-VN')}đ`;
};

// Định dạng giá trị tối thiểu
const formatMinOrderValue = (value: number | undefined) => {
    return value && value > 0 ? `${value.toLocaleString('vi-VN')}đ` : 'Không có';
};

const VoucherManagement: React.FC = () => {
  const [vouchers, setVouchers] = useState<VoucherType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
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
      // Sử dụng getAllVouchers để lấy tất cả voucher (bao gồm cả đã khóa)
      const response = await voucherApi.getAllVouchers();
      setVouchers(response.data || []);
    } catch (error: any) {
      console.error('Error fetching vouchers:', error);
      toast.error(error?.response?.data?.message || 'Lỗi khi tải danh sách voucher');
    } finally {
      setLoading(false);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; voucherId: string | null }>({ open: false, voucherId: null });

  const handleDeleteClick = (voucherId: string) => {
    setDeleteConfirm({ open: true, voucherId });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.voucherId) return;
    const voucherId = deleteConfirm.voucherId;
    setDeleteConfirm({ open: false, voucherId: null });
    
    try {
      await voucherApi.deleteVoucher(voucherId);
      toast.success('Đã xóa voucher thành công!');
      fetchVouchers();
    } catch (error: any) {
      console.error('Error deleting voucher:', error);
      toast.error(error?.response?.data?.message || 'Lỗi khi xóa voucher');
    }
  };

  const handleToggleStatus = async (voucherId: string) => {
    try {
      const response = await voucherApi.toggleVoucherStatus(voucherId);
      toast.success(response.data.message);
      fetchVouchers();
    } catch (error: any) {
      console.error('Error toggling voucher status:', error);
      toast.error(error?.response?.data?.message || 'Lỗi khi thay đổi trạng thái voucher');
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
    const isGlobalVoucher = (voucher as any).global === true;
    const categories = (voucher as any).categories || [];
    
    setIsGlobal(isGlobalVoucher);
    setSelectedCategories(isGlobalVoucher ? [] : categories);
    
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

      // Chỉ gửi maxDiscount khi discountType là "percent"
      if (submitData.discountType === "percent") {
        // Giữ nguyên maxDiscount
      } else {
        // Không gửi maxDiscount khi là fixed
        delete submitData.maxDiscount;
      }

      // Admin: thêm categories hoặc global
      if (isGlobal) {
        submitData.global = true;
        submitData.categories = [];
      } else if (selectedCategories.length > 0) {
        submitData.global = false;
        submitData.categories = selectedCategories;
      } else {
        // Nếu không chọn global và không chọn category nào, mặc định là global
        submitData.global = true;
        submitData.categories = [];
      }

      if (editingVoucher?._id) {
        await voucherApi.updateVoucher(editingVoucher._id, submitData);
        toast.success('Đã cập nhật voucher thành công!');
      } else {
        await voucherApi.createVoucher(submitData);
        toast.success('Đã tạo voucher thành công!');
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
      toast.error(error?.response?.data?.message || 'Lỗi khi lưu voucher');
    }
  };

  // Sắp xếp và lọc vouchers
  const filteredAndSortedVouchers = useMemo(() => {
    let filtered = vouchers.filter(voucher =>
      voucher.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voucher.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Sắp xếp theo createdAt desc (mới nhất lên trước)
    filtered.sort((a, b) => {
      const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
      const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
      return dateB - dateA;
    });
    
    return filtered;
  }, [vouchers, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedVouchers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVouchers = filteredAndSortedVouchers.slice(startIndex, endIndex);

  // Reset page khi search thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-16 h-16 text-purple-500 animate-spin mb-4" />
        <p className="text-gray-600 text-lg font-medium">Đang tải voucher...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-4 md:mb-6 animate-fade-in-down">
        <h2 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 gradient-text flex items-center gap-2">
          <Gift size={20} className="md:w-6 md:h-6 text-purple-600" />
          <span className="text-base md:text-2xl">Quản lý Voucher</span>
        </h2>
        <p className="text-gray-600 text-xs md:text-sm">
          Quản lý và tạo các mã giảm giá cho khách hàng
        </p>
      </div>

      {/* Total Vouchers Count */}
      <div className="mb-4 md:mb-6 animate-fade-in-up">
        <div className="bg-blue-600 rounded-lg md:rounded-xl p-4 md:p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-xs md:text-sm font-medium mb-1">Tổng số voucher</p>
              <p className="text-white text-2xl md:text-4xl font-bold">
                {filteredAndSortedVouchers.length.toLocaleString('vi-VN')}
              </p>
            </div>
            <Gift className="w-12 h-12 md:w-16 md:h-16 text-white opacity-80" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row gap-3 md:gap-4 items-stretch sm:items-center justify-between animate-fade-in-up">
        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm voucher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
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
            setIsGlobal(false);
            setSelectedCategories([]);
            setShowForm(true);
          }}
          className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg md:rounded-xl text-sm md:text-base font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <Plus size={18} className="md:w-5 md:h-5" />
          <span>Thêm voucher</span>
        </button>
      </div>

      {/* Vouchers List */}
      {filteredAndSortedVouchers.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-lg md:rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden animate-fade-in-up">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase">Mã voucher</th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase">Mô tả</th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase">Giảm giá</th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase">Đơn tối thiểu</th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase">Thời hạn</th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase">Trạng thái</th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-center text-xs font-bold text-gray-700 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedVouchers.map((voucher, index) => (
                    <tr
                      key={voucher._id}
                      className={`hover:bg-gray-50 transition-all duration-300 ${!voucher.isActive ? 'bg-gray-50 opacity-75' : ''}`}
                    >
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {!voucher.isActive && <Lock size={14} className="md:w-4 md:h-4 text-gray-400" />}
                          <span className={`text-sm md:text-base font-bold ${!voucher.isActive ? 'text-gray-500' : 'text-gray-900'}`}>
                            {voucher.code}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <div className={`text-xs md:text-sm max-w-xs truncate ${!voucher.isActive ? 'text-gray-400' : 'text-gray-700'}`}>
                          {voucher.description || 'Không có mô tả'}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                        <span className={`text-sm md:text-base font-bold ${!voucher.isActive ? 'text-gray-400' : 'text-green-600'}`}>
                          {formatDiscountValue(voucher)}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                        <span className={`text-xs md:text-sm ${!voucher.isActive ? 'text-gray-400' : 'text-gray-700'}`}>
                          {formatMinOrderValue(voucher.minOrderValue)}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                        {voucher.startDate && voucher.endDate
                          ? `${new Date(voucher.startDate).toLocaleDateString('vi-VN')} - ${new Date(voucher.endDate).toLocaleDateString('vi-VN')}`
                          : 'N/A'}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                        <span className={getStatusBadgeClass(voucher.isActive ?? true)}>
                          {voucher.isActive ? 'Hoạt động' : 'Tạm khóa'}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 md:gap-2">
                          <button
                            onClick={() => handleEdit(voucher)}
                            className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit size={16} className="md:w-[18px] md:h-[18px]" />
                          </button>
                          {voucher._id && (
                            <button
                              onClick={() => handleToggleStatus(voucher._id)}
                              className={`p-1.5 md:p-2 rounded-lg transition-colors ${voucher.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                              title={voucher.isActive ? 'Khóa voucher' : 'Mở khóa voucher'}
                            >
                              {voucher.isActive ? <Lock size={16} className="md:w-[18px] md:h-[18px]" /> : <Unlock size={16} className="md:w-[18px] md:h-[18px]" />}
                            </button>
                          )}
                          <button
                            onClick={() => voucher._id && handleDeleteClick(voucher._id)}
                            className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 animate-fade-in-up">
            {paginatedVouchers.map((voucher) => (
              <div 
                key={voucher._id} 
                className={`bg-white rounded-lg shadow-lg border-2 border-gray-100 p-4 transition-shadow duration-300 ${!voucher.isActive ? 'opacity-75' : ''}`}
              >
                {/* Header: Code & Status */}
                <div className="flex items-center justify-between mb-3 border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Ticket size={20} className="text-purple-500" />
                    <span className={`font-bold text-base ${!voucher.isActive ? 'text-gray-500' : 'text-purple-700'}`}>
                      {voucher.code}
                    </span>
                    {!voucher.isActive && <Lock size={14} className="text-gray-400" />}
                  </div>
                  <span className={getStatusBadgeClass(voucher.isActive ?? true)}>
                    {voucher.isActive ? 'Hoạt động' : 'Tạm khóa'}
                  </span>
                </div>

                {/* Description */}
                <p className={`text-xs text-gray-500 mb-3 line-clamp-2 ${!voucher.isActive ? 'text-gray-400' : ''}`}>
                  {voucher.description || 'Không có mô tả'}
                </p>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-y-2 text-xs mb-3">
                  {/* Discount Value */}
                  <div className="text-gray-500 font-medium flex items-center gap-1">
                    <Zap size={12} className="text-red-400" /> Giảm giá:
                  </div>
                  <div className="text-right font-bold text-green-600">{formatDiscountValue(voucher)}</div>
                  
                  {/* Min Order Value */}
                  <div className="text-gray-500 font-medium flex items-center gap-1">
                    <DollarSign size={12} className="text-blue-400" /> Đơn tối thiểu:
                  </div>
                  <div className="text-right text-gray-700">{formatMinOrderValue(voucher.minOrderValue)}</div>

                  {/* Usage Limit */}
                  <div className="text-gray-500 font-medium flex items-center gap-1">
                    <Ticket size={12} className="text-yellow-400" /> Giới hạn:
                  </div>
                  <div className="text-right text-gray-700">{voucher.usageLimit > 0 ? `${voucher.usageLimit} lần` : 'Không giới hạn'}</div>
                  
                  {/* Date Range */}
                  <div className="col-span-2 mt-2 pt-2 border-t border-gray-100">
                    <div className="text-gray-500 font-medium flex items-center gap-1 mb-1">
                      <Calendar size={12} className="text-gray-400" /> Thời hạn:
                    </div>
                    <p className="text-xs text-gray-700 ml-4">
                      {voucher.startDate && voucher.endDate
                        ? `${new Date(voucher.startDate).toLocaleDateString('vi-VN')} - ${new Date(voucher.endDate).toLocaleDateString('vi-VN')}`
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleEdit(voucher)}
                    className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                  >
                    <Edit size={14} />
                    Sửa
                  </button>
                  {voucher._id && (
                    <button
                      onClick={() => handleToggleStatus(voucher._id)}
                      className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 ${voucher.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                      title={voucher.isActive ? 'Khóa voucher' : 'Mở khóa voucher'}
                    >
                      {voucher.isActive ? <Lock size={14} /> : <Unlock size={14} />}
                      {voucher.isActive ? 'Khóa' : 'Mở'}
                    </button>
                  )}
                  <button
                    onClick={() => voucher._id && handleDeleteClick(voucher._id)}
                    className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredAndSortedVouchers.length}
            />
          )}
        </>
      ) : (
        <div className="text-center py-20 animate-fade-in-up">
          <div className="text-8xl mb-4 animate-bounce">🎫</div>
          <p className="text-gray-500 text-lg font-medium">Không tìm thấy voucher nào</p>
        </div>
      )}


      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-lg md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-base md:text-xl font-bold gradient-text flex items-center gap-2">
                <Edit size={20} className="md:w-6 md:h-6 text-purple-600" />
                <span className="text-sm md:text-xl">{editingVoucher ? 'Sửa voucher' : 'Thêm voucher mới'}</span>
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingVoucher(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-xl md:text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Mã voucher & Tiêu đề */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Mã voucher *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Tiêu đề *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                    placeholder="Nhập tiêu đề voucher"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Mô tả *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  placeholder="Nhập mô tả voucher"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Điều kiện *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  placeholder="Nhập điều kiện áp dụng voucher"
                />
              </div>

              {/* Loại voucher & Loại giảm giá */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Loại voucher *</label>
                  <select
                    required
                    value={formData.voucherType || 'product'}
                    onChange={(e) => setFormData({ ...formData, voucherType: e.target.value as 'product' | 'freeship' })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  >
                    <option value="product">Giảm giá sản phẩm</option>
                    <option value="freeship">Miễn phí vận chuyển</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Loại giảm giá *</label>
                  <select
                    required
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percent' | 'fixed' })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  >
                    <option value="percent">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định</option>
                  </select>
                </div>
              </div>

              {/* Hiển thị trường dựa trên loại giảm giá */}
              {formData.discountType === "fixed" ? (
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Giá trị giảm (₫) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                    placeholder="VD: 50000"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Giảm theo % *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                      className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                      placeholder="VD: 10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Giảm tối đa (₫) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.maxDiscount}
                      onChange={(e) => setFormData({ ...formData, maxDiscount: Number(e.target.value) })}
                      className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                      placeholder="VD: 100000"
                    />
                  </div>
                </div>
              )}

              {/* Đơn hàng tối thiểu */}
              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Đơn hàng tối thiểu (₫)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.minOrderValue}
                  onChange={(e) => setFormData({ ...formData, minOrderValue: Number(e.target.value) })}
                  className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  placeholder="VD: 100000"
                />
              </div>

              {/* Ngày bắt đầu & Ngày kết thúc */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Ngày bắt đầu *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Ngày kết thúc *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  />
                </div>
              </div>

              {/* Phần chọn loại cửa hàng (chỉ Admin) */}
              <div className="border-2 border-gray-200 rounded-lg md:rounded-xl p-3 md:p-4 bg-gray-50">
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2 md:mb-3">Áp dụng cho cửa hàng</label>
                
                <div className="mb-3 md:mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="storeScope"
                      checked={isGlobal}
                      onChange={() => {
                        setIsGlobal(true);
                        setSelectedCategories([]);
                      }}
                      className="w-4 h-4 md:w-5 md:h-5 text-purple-600"
                    />
                    <span className="text-xs md:text-sm font-semibold text-gray-700">Áp dụng cho tất cả cửa hàng (Global)</span>
                  </label>
                </div>

                <div className="mb-2 md:mb-3">
                  <label className="flex items-center gap-2 cursor-pointer mb-2 md:mb-3">
                    <input
                      type="radio"
                      name="storeScope"
                      checked={!isGlobal}
                      onChange={() => setIsGlobal(false)}
                      className="w-4 h-4 md:w-5 md:h-5 text-purple-600"
                    />
                    <span className="text-xs md:text-sm font-semibold text-gray-700">Áp dụng cho loại cửa hàng</span>
                  </label>
                  
                  {!isGlobal && (
                    <div className="ml-4 md:ml-6 border-2 border-gray-300 rounded-lg p-2 md:p-3 bg-white">
                      <p className="text-xs text-gray-500 mb-2 md:mb-3">Chọn loại cửa hàng để áp dụng voucher:</p>
                      <div className="space-y-1 md:space-y-2">
                        {availableCategories.map((category) => (
                          <label key={category.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 md:p-2 rounded">
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
                              className="w-3 h-3 md:w-4 md:h-4 text-purple-600"
                            />
                            <span className="text-xs md:text-sm text-gray-700">{category.label}</span>
                          </label>
                        ))}
                      </div>
                      {selectedCategories.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-200">
                          Đã chọn: {selectedCategories.map(c => availableCategories.find(cat => cat.value === c)?.label).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Giới hạn sử dụng & Trạng thái */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Giới hạn sử dụng</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Trạng thái</label>
                  <select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Tạm khóa</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 md:gap-4 justify-end pt-3 md:pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingVoucher(null);
                  }}
                  className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 text-gray-700 rounded-lg md:rounded-xl font-bold hover:bg-gray-50 transition-all duration-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 text-sm md:text-base bg-blue-600 hover:bg-blue-700 text-white rounded-lg md:rounded-xl font-bold transition-all duration-300 shadow-lg"
                >
                  {editingVoucher ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, voucherId: null })}
        onConfirm={handleDelete}
        title="Xác nhận xóa voucher"
        message="Bạn có chắc muốn xóa voucher này không?"
        type="danger"
        confirmText="Xóa"
      />
    </div>
  );
};

export default VoucherManagement;
