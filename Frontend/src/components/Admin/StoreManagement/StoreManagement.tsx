import React, { useEffect, useState, useMemo } from 'react';
import storeApi from '../../../api/storeApi';
import { Search, Store as StoreIcon, Loader2, User, Tag, Calendar, Lock, Unlock } from 'lucide-react';
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
  const [toggleConfirm, setToggleConfirm] = useState<{ open: boolean; store: Store | null }>({ open: false, store: null });
  const itemsPerPage = 20;

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await storeApi.getAllStores();
      console.log('📦 [StoreManagement] Full response:', JSON.stringify(response, null, 2));
      console.log('📦 [StoreManagement] response.data:', response.data);
      console.log('📦 [StoreManagement] response.data.stores:', response.data?.stores);
      console.log('📦 [StoreManagement] response.data (direct):', response.data);
      
      // Thử nhiều cách parse
      let data = [];
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data?.stores && Array.isArray(response.data.stores)) {
        data = response.data.stores;
      } else if (response.data && typeof response.data === 'object') {
        // Nếu response.data là object, thử lấy stores property
        data = (response.data as any).stores || [];
      }
      
      console.log('📦 [StoreManagement] Final data:', data);
      console.log('📦 [StoreManagement] Số lượng stores:', data.length);
      setStores(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('❌ Error fetching stores:', error);
      toast.error(error?.response?.data?.message || 'Lỗi khi tải danh sách cửa hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatusClick = (store: Store) => {
    setToggleConfirm({ open: true, store });
  };

  const handleToggleStatus = async () => {
    if (!toggleConfirm.store) return;
    const store = toggleConfirm.store;
    const isActive = store.isActive ?? true;
    const action = isActive ? 'khóa' : 'mở khóa';
    setToggleConfirm({ open: false, store: null });
    
    try {
      await storeApi.updateStoreById(store._id, { isActive: !isActive });
      toast.success(`Đã ${action} cửa hàng ${store.name} thành công!`, {
        containerId: "general-toast",
      });
      await fetchStores();
    } catch (error: any) {
      console.error(`❌ Lỗi khi ${action} cửa hàng:`, error?.response || error);
      toast.error(error?.response?.data?.message || `Không thể ${action} cửa hàng. Vui lòng thử lại!`, {
        containerId: "general-toast",
      });
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
      <div className="mb-4 md:mb-6 animate-fade-in-down">
        <h2 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 gradient-text flex items-center gap-2">
          <StoreIcon size={20} className="md:w-6 md:h-6 text-blue-600" />
          <span className="text-base md:text-2xl">Quản lý cửa hàng</span>
        </h2>
        <p className="text-gray-600 text-xs md:text-sm">
          Quản lý và chỉnh sửa thông tin các cửa hàng trong hệ thống
        </p>
      </div>

      {/* Total Stores Count */}
      <div className="mb-4 md:mb-6 animate-fade-in-up">
        <div className="bg-blue-600 rounded-lg md:rounded-xl p-4 md:p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-xs md:text-sm font-medium mb-1">Tổng số cửa hàng</p>
              <p className="text-white text-2xl md:text-4xl font-bold">
                {filteredAndSortedStores.length.toLocaleString('vi-VN')}
              </p>
            </div>
            <StoreIcon className="w-12 h-12 md:w-16 md:h-16 text-white opacity-80" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 md:mb-6 animate-fade-in-up">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm cửa hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
          />
        </div>
      </div>

      {/* Stores List */}
      {filteredAndSortedStores.length > 0 ? (
        <>
          {/* --- DESKTOP TABLE VIEW (md and up) --- */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
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
                  className="hover:bg-gray-50 transition-all duration-300 animate-fade-in-up"
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
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-green-500 text-white shadow-lg">
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
                        onClick={() => handleToggleStatusClick(store)}
                        className={`${store.isActive ? 'text-orange-600 hover:text-orange-900 hover:bg-orange-50' : 'text-green-600 hover:text-green-900 hover:bg-green-50'} px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-110 flex items-center gap-1`}
                        title={store.isActive ? 'Khóa cửa hàng' : 'Mở khóa cửa hàng'}
                      >
                        {store.isActive ? <Lock size={16} /> : <Unlock size={16} />}
                        {store.isActive ? 'Khóa' : 'Mở khóa'}
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
                    onClick={() => handleToggleStatusClick(store)}
                    className={`${store.isActive ? 'text-orange-600 hover:text-orange-900 hover:bg-orange-50' : 'text-green-600 hover:text-green-900 hover:bg-green-50'} px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-1 text-sm`}
                    title={store.isActive ? 'Khóa cửa hàng' : 'Mở khóa cửa hàng'}
                  >
                    {store.isActive ? <Lock size={16} /> : <Unlock size={16} />}
                    {store.isActive ? 'Khóa' : 'Mở khóa'}
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

      <ConfirmDialog
        open={toggleConfirm.open}
        onClose={() => setToggleConfirm({ open: false, store: null })}
        onConfirm={handleToggleStatus}
        title={toggleConfirm.store ? `Xác nhận ${toggleConfirm.store.isActive ? 'khóa' : 'mở khóa'} cửa hàng` : ""}
        message={toggleConfirm.store ? `Bạn có chắc muốn ${toggleConfirm.store.isActive ? 'khóa' : 'mở khóa'} cửa hàng ${toggleConfirm.store.name}?` : ""}
        type={toggleConfirm.store?.isActive ? "danger" : "info"}
        confirmText={toggleConfirm.store?.isActive ? "Khóa cửa hàng" : "Mở khóa cửa hàng"}
      />
    </div>
  );
};

export default StoreManagement;
