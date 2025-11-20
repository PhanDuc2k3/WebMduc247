import React, { useEffect, useState, useMemo } from 'react';
import promotionApi from '../../../api/promotionApi';
import type { PromotionType } from '../../../api/promotionApi';
import { Edit, Trash2, Plus, Search, Tag, Eye, Loader2, Megaphone } from 'lucide-react';
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

const PromotionManagement: React.FC = () => {
  const [promotions, setPromotions] = useState<PromotionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; promotionId: string | null }>({ open: false, promotionId: null });
  const itemsPerPage = 20;
  const [showForm, setShowForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotionType | null>(null);
  const [formData, setFormData] = useState<Partial<PromotionType>>({
    title: '',
    description: '',
    content: '',
    category: 'Khác',
    tags: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const response = await promotionApi.getAllPromotions();
      setPromotions(response.data || []);
    } catch (error: any) {
      console.error('Error fetching promotions:', error);
      toast.error(error?.response?.data?.message || 'Lỗi khi tải danh sách tin tức khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (promotionId: string) => {
    setDeleteConfirm({ open: true, promotionId });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.promotionId) return;
    const promotionId = deleteConfirm.promotionId;
    setDeleteConfirm({ open: false, promotionId: null });
    
    try {
      await promotionApi.deletePromotion(promotionId);
      toast.success('Đã xóa tin tức khuyến mãi thành công!');
      fetchPromotions();
    } catch (error: any) {
      console.error('Error deleting promotion:', error);
      toast.error(error?.response?.data?.message || 'Lỗi khi xóa tin tức khuyến mãi');
    }
  };

  const handleEdit = (promotion: PromotionType) => {
    setEditingPromotion(promotion);
    setFormData({
      title: promotion.title,
      description: promotion.description,
      content: promotion.content || '',
      category: promotion.category,
      tags: promotion.tags || [],
      startDate: promotion.startDate ? new Date(promotion.startDate).toISOString().split('T')[0] : '',
      endDate: promotion.endDate ? new Date(promotion.endDate).toISOString().split('T')[0] : '',
      isActive: promotion.isActive,
    });
    setImagePreview(promotion.imageUrl || '');
    setImageFile(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const submitData = new FormData();
      submitData.append('title', formData.title || '');
      submitData.append('description', formData.description || '');
      submitData.append('content', formData.content || formData.description || '');
      submitData.append('category', formData.category || 'Khác');
      submitData.append('tags', Array.isArray(formData.tags) ? formData.tags.join(',') : '');
      submitData.append('startDate', formData.startDate || new Date().toISOString());
      submitData.append('endDate', formData.endDate || new Date().toISOString());
      submitData.append('isActive', String(formData.isActive ?? true));

      if (imageFile) {
        submitData.append('image', imageFile);
      }

      if (editingPromotion?._id) {
        await promotionApi.updatePromotion(editingPromotion._id, submitData);
        toast.success('Đã cập nhật tin tức khuyến mãi thành công!');
      } else {
        await promotionApi.createPromotion(submitData);
        toast.success('Đã tạo tin tức khuyến mãi thành công!');
      }
      
      setShowForm(false);
      setEditingPromotion(null);
      setFormData({
        title: '',
        description: '',
        content: '',
        category: 'Khác',
        tags: [],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
      });
      setImageFile(null);
      setImagePreview('');
      fetchPromotions();
    } catch (error: any) {
      console.error('Error saving promotion:', error);
      toast.error(error?.response?.data?.message || 'Lỗi khi lưu tin tức khuyến mãi');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Sắp xếp và lọc promotions
  const filteredAndSortedPromotions = useMemo(() => {
    let filtered = promotions.filter(
      (p) =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Sắp xếp theo createdAt desc (mới nhất lên trước)
    filtered.sort((a, b) => {
      const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
      const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
      return dateB - dateA;
    });
    
    return filtered;
  }, [promotions, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPromotions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPromotions = filteredAndSortedPromotions.slice(startIndex, endIndex);

  // Reset page khi search thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-16 h-16 text-purple-500 animate-spin mb-4" />
        <p className="text-gray-600 text-lg font-medium">Đang tải tin tức khuyến mãi...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-4 md:mb-6 animate-fade-in-down">
        <h2 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 gradient-text flex items-center gap-2">
          <Megaphone size={20} className="md:w-6 md:h-6 text-blue-600" />
          <span className="text-base md:text-2xl">Quản lý Tin tức Khuyến mãi</span>
        </h2>
        <p className="text-gray-600 text-xs md:text-sm">
          Quản lý và tạo các tin tức khuyến mãi cho khách hàng
        </p>
      </div>

      {/* Total Promotions Count */}
      <div className="mb-4 md:mb-6 animate-fade-in-up">
        <div className="bg-purple-600 rounded-lg md:rounded-xl p-4 md:p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-xs md:text-sm font-medium mb-1">Tổng số khuyến mãi</p>
              <p className="text-white text-2xl md:text-4xl font-bold">
                {filteredAndSortedPromotions.length.toLocaleString('vi-VN')}
              </p>
            </div>
            <Megaphone className="w-12 h-12 md:w-16 md:h-16 text-white opacity-80" />
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
            placeholder="Tìm kiếm tin tức khuyến mãi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
          />
        </div>

        {/* Add Button */}
        <button
          onClick={() => {
            setEditingPromotion(null);
            setFormData({
              title: '',
              description: '',
              content: '',
              category: 'Khác',
              tags: [],
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              isActive: true,
            });
            setImageFile(null);
            setImagePreview('');
            setShowForm(true);
          }}
          className="px-4 md:px-6 py-2 md:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg md:rounded-xl text-sm md:text-base font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
        >
          <Plus size={18} className="md:w-5 md:h-5" />
          <span>Thêm mới</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-lg md:rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-base md:text-xl font-bold gradient-text">
                {editingPromotion ? 'Chỉnh sửa' : 'Thêm mới'} Tin tức Khuyến mãi
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700 text-xl md:text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Title */}
              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Nhập tiêu đề..."
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">
                  Mô tả <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Nhập mô tả..."
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">
                  Nội dung chi tiết
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent md:rows-6"
                  placeholder="Nhập nội dung chi tiết..."
                />
              </div>

              {/* Category & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">
                    Danh mục
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="Sale lớn">Sale lớn</option>
                    <option value="Flash Sale">Flash Sale</option>
                    <option value="Freeship">Freeship</option>
                    <option value="Hoàn tiền">Hoàn tiền</option>
                    <option value="Đặc biệt">Đặc biệt</option>
                    <option value="Tân thủ">Tân thủ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">
                    Tags (phân cách bởi dấu phẩy)
                  </label>
                  <input
                    type="text"
                    value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                      setFormData({ ...formData, tags });
                    }}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Mới, Hot, Khuyến mãi..."
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Image */}
              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">
                  Hình ảnh
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="mt-3 md:mt-4 w-full h-32 md:h-48 object-cover rounded-lg md:rounded-xl"
                  />
                )}
              </div>

              {/* Active */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 md:w-5 md:h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <label className="text-xs md:text-sm font-bold text-gray-700">Kích hoạt</label>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 md:gap-4 justify-end pt-3 md:pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 text-gray-700 rounded-lg md:rounded-xl font-bold hover:bg-gray-50 transition-all duration-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 text-sm md:text-base bg-purple-600 hover:bg-purple-700 text-white rounded-lg md:rounded-xl font-bold transition-all duration-300 shadow-lg"
                >
                  {editingPromotion ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promotions List */}
      {filteredAndSortedPromotions.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-lg md:rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden animate-fade-in-up">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase">Tiêu đề</th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase">Danh mục</th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase">Thời gian</th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase">Lượt xem</th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase">Trạng thái</th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-center text-xs font-bold text-gray-700 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedPromotions.map((promo) => (
                  <tr key={promo._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <div className="font-bold text-sm md:text-base text-gray-900">{promo.title}</div>
                      <div className="text-xs md:text-sm text-gray-500 line-clamp-1">{promo.description}</div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <span className="px-2 md:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        {promo.category}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-600">
                      {new Date(promo.startDate).toLocaleDateString('vi-VN')} -{' '}
                      {new Date(promo.endDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Eye size={14} className="md:w-4 md:h-4" />
                        <span className="text-xs md:text-sm font-bold">{promo.views || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <span className={getStatusBadgeClass(promo.isActive ?? true)}>
                        {promo.isActive ? 'Hoạt động' : 'Tạm khóa'}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(promo)}
                          className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit size={16} className="md:w-[18px] md:h-[18px]" />
                        </button>
                        <button
                          onClick={() => promo._id && handleDeleteClick(promo._id)}
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
            {paginatedPromotions.map((promo) => (
              <div key={promo._id} className="bg-white rounded-lg shadow-lg border-2 border-gray-100 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-sm text-gray-900 mb-1 line-clamp-2">{promo.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">{promo.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                    {promo.category}
                  </span>
                  <span className={getStatusBadgeClass(promo.isActive ?? true)}>
                    {promo.isActive ? 'Hoạt động' : 'Tạm khóa'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                  <div>
                    {new Date(promo.startDate).toLocaleDateString('vi-VN')} -{' '}
                    {new Date(promo.endDate).toLocaleDateString('vi-VN')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye size={14} />
                    <span className="font-bold">{promo.views || 0}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleEdit(promo)}
                    className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                  >
                    <Edit size={14} />
                    Sửa
                  </button>
                  <button
                    onClick={() => promo._id && handleDelete(promo._id)}
                    className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    Xóa
                  </button>
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
              totalItems={filteredAndSortedPromotions.length}
            />
          )}
        </>
      ) : (
        <div className="text-center py-20 animate-fade-in-up">
          <Megaphone size={64} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 text-lg font-medium">
            {searchTerm ? "Không tìm thấy tin tức khuyến mãi nào" : "Không có tin tức khuyến mãi nào"}
          </p>
        </div>
      )}
    </div>
  );
};

export default PromotionManagement;
