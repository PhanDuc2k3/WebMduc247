import React, { useEffect, useState, useMemo } from 'react';
import storeApi from '../../../api/storeApi';
import { Edit, Trash2, Plus, Search, Eye, Store as StoreIcon, Loader2, User, Tag, Calendar } from 'lucide-react';
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

// Hàm hỗ trợ hiển thị tên danh mục
const getCategoryLabel = (category: string | undefined) => {
    switch (category) {
        case 'electronics': return 'Điện tử';
        case 'fashion': return 'Thời trang';
        case 'home': return 'Đồ gia dụng';
        case 'books': return 'Sách';
        default: return 'Khác/Chưa có';
    }
}

interface Store {
  _id: string;
  name: string;
  description: string;
  owner?: { fullName: string; email: string };
  category?: 'electronics' | 'fashion' | 'home' | 'books' | 'other';
  logoUrl?: string;
  bannerUrl?: string;
  isActive?: boolean;
  createdAt?: string;
}

const StoreManagement: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    category: 'electronics' | 'fashion' | 'home' | 'books' | 'other' | '';
  }>({
    name: '',
    description: '',
    category: '',
  });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await storeApi.getAllStores();
      const data = response.data?.stores || response.data || [];
      setStores(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      toast.error(error?.response?.data?.message || 'Lỗi khi tải danh sách cửa hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (storeId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa cửa hàng này?')) return;
    
    try {
      await storeApi.deleteStore(storeId);
      toast.success('Đã xóa cửa hàng thành công!');
      fetchStores();
    } catch (error: any) {
      console.error('Error deleting store:', error);
      toast.error(error?.response?.data?.message || 'Lỗi khi xóa cửa hàng');
    }
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      description: store.description,
      category: (store.category || '') as 'electronics' | 'fashion' | 'home' | 'books' | 'other' | '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingStore) {
        const updateData: any = {
          name: formData.name,
          description: formData.description,
        };
        if (formData.category) {
          updateData.category = formData.category;
        }
        await storeApi.updateStoreById(editingStore._id, updateData);
        toast.success('Đã cập nhật cửa hàng thành công!');
      } else {
        const formDataObj = new FormData();
        formDataObj.append('name', formData.name);
        formDataObj.append('description', formData.description);
        if (formData.category) {
          formDataObj.append('category', formData.category);
        }
        await storeApi.createStore(formDataObj);
        toast.success('Đã tạo cửa hàng thành công!');
      }
      setShowForm(false);
      setEditingStore(null);
      setFormData({ name: '', description: '', category: '' });
      fetchStores();
    } catch (error: any) {
      console.error('Error saving store:', error);
      toast.error(error?.response?.data?.message || 'Lỗi khi lưu cửa hàng');
    }
  };

  // Sắp xếp và lọc stores
  const filteredAndSortedStores = useMemo(() => {
    let filtered = stores.filter(store =>
      store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.owner?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCategoryLabel(store.category).toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Sắp xếp theo createdAt desc (mới nhất lên trước)
    filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    
    return filtered;
  }, [stores, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedStores.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStores = filteredAndSortedStores.slice(startIndex, endIndex);

  // Reset page khi search thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-16 h-16 text-purple-500 animate-spin mb-4" />
        <p className="text-gray-600 text-lg font-medium">Đang tải cửa hàng...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 animate-fade-in-down">
        <h2 className="text-xl md:text-2xl font-bold mb-2 gradient-text flex items-center gap-2">
          <StoreIcon size={24} className="text-blue-600" />
          Quản lý cửa hàng
        </h2>
        <p className="text-gray-600 text-sm">
          Quản lý và chỉnh sửa thông tin các cửa hàng trong hệ thống
        </p>
      </div>

      {/* Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between animate-fade-in-up">
        {/* Search */}
        <div className="relative flex-1 max-w-full sm:max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm cửa hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
          />
        </div>

        {/* Add Button */}
        <button
          onClick={() => {
            setEditingStore(null);
            setFormData({ name: '', description: '', category: '' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 w-full sm:w-auto justify-center"
        >
          <Plus size={20} />
          Thêm cửa hàng
        </button>
      </div>

      {/* Stores List */}
      {filteredAndSortedStores.length > 0 ? (
        <>
          {/* --- DESKTOP TABLE VIEW (md and up) --- */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Cửa hàng</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Chủ sở hữu</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Danh mục</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Trạng thái</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedStores.map((store, index) => (
                <tr
                  key={store._id}
                  className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img
                        src={store.logoUrl || '/default-store.png'}
                        alt={store.name}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-gray-200 shadow-lg"
                      />
                      <div>
                        <div className="font-bold text-gray-900">{store.name}</div>
                        <div className="text-xs text-gray-500 max-w-xs truncate">{store.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{store.owner?.fullName || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{store.owner?.email || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
                      {getCategoryLabel(store.category)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadgeClass(store.isActive ?? true)}>
                      {store.isActive ? 'Hoạt động' : 'Tạm khóa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(store)}
                        className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-110 flex items-center gap-1"
                      >
                        <Edit size={16} /> Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(store._id)}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50 px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-110 flex items-center gap-1"
                      >
                        <Trash2 size={16} /> Xóa
                      </button>
                    </div>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- MOBILE CARD VIEW (max-md) --- */}
          <div className="md:hidden space-y-4">
            {paginatedStores.map((store, index) => (
              <div 
                key={store._id} 
                className="bg-white p-4 shadow-xl rounded-xl border border-gray-100 transition-shadow duration-300 hover:shadow-2xl animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Header: Store Info & Status */}
                <div className="flex items-start justify-between mb-4 border-b pb-3">
                    <div className="flex items-center gap-3">
                        <img
                            src={store.logoUrl || '/default-store.png'}
                            alt={store.name}
                            className="w-12 h-12 rounded-xl object-cover border-2 border-blue-500 shadow-md flex-shrink-0"
                        />
                        <div>
                            <div className="font-bold text-lg text-gray-900">{store.name}</div>
                            <div className="text-xs text-gray-500 max-w-xs truncate">{store.description}</div>
                        </div>
                    </div>
                    <span className={getStatusBadgeClass(store.isActive ?? true)}>
                        {store.isActive ? 'Hoạt động' : 'Tạm khóa'}
                    </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                    {/* Owner */}
                    <div className="text-gray-500 font-medium flex items-center gap-2">
                        <User size={14} className="text-purple-400" /> Chủ sở hữu:
                    </div>
                    <div className="text-right text-gray-700">
                        <div className="font-medium">{store.owner?.fullName || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{store.owner?.email || ''}</div>
                    </div>
                    
                    {/* Category */}
                    <div className="text-gray-500 font-medium flex items-center gap-2">
                        <Tag size={14} className="text-green-400" /> Danh mục:
                    </div>
                    <div className="text-right">
                        <span className="px-3 py-1 text-xs leading-5 font-bold rounded-full bg-green-500 text-white shadow-lg">
                            {getCategoryLabel(store.category)}
                        </span>
                    </div>

                    {/* Created At */}
                    {store.createdAt && (
                        <>
                            <div className="text-gray-500 font-medium flex items-center gap-2">
                                <Calendar size={14} className="text-gray-400" /> Ngày tạo:
                            </div>
                            <div className="text-right text-gray-700">
                                {new Date(store.createdAt).toLocaleDateString("vi-VN")}
                            </div>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                  <button
                    onClick={() => handleEdit(store)}
                    className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-1 text-sm"
                  >
                    <Edit size={16} /> Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(store._id)}
                    className="text-red-600 hover:text-red-900 hover:bg-red-50 px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-1 text-sm"
                  >
                    <Trash2 size={16} /> Xóa
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
              totalItems={filteredAndSortedStores.length}
            />
          )}
        </>
      ) : (
        <div className="text-center py-20 animate-fade-in-up">
          <StoreIcon size={64} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 text-lg font-medium">
            {searchTerm ? "Không tìm thấy cửa hàng nào" : "Không có cửa hàng nào"}
          </p>
        </div>
      )}

      {/* Form Modal (Optimized for Mobile) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[98vh] overflow-y-auto animate-scale-in">
            <div className="p-4 sm:p-6 border-b-2 border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl sm:text-2xl font-bold gradient-text flex items-center gap-2">
                  <Edit size={24} className="text-purple-600" />
                  {editingStore ? 'Sửa cửa hàng' : 'Thêm cửa hàng mới'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingStore(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold p-1"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tên cửa hàng *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Danh mục</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as "electronics" | "fashion" | "home" | "books" | "other" | '' })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
                >
                  <option value="">-- Chọn danh mục --</option>
                  <option value="electronics">Điện tử</option>
                  <option value="fashion">Thời trang</option>
                  <option value="home">Đồ gia dụng</option>
                  <option value="books">Sách</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Edit size={18} />
                  {editingStore ? 'Lưu thay đổi' : 'Tạo cửa hàng'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingStore(null);
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

export default StoreManagement;