import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo } from 'react';
import storeApi from '../../../api/storeApi';
import { Search, Store as StoreIcon, Loader2, User, Tag, Calendar, Lock, Unlock } from 'lucide-react';
import ConfirmDialog from '../../ui/ConfirmDialog';
import Pagination from '../Pagination';
import { toast } from 'react-toastify';
// Đồng nhất CSS cho status badges
const getStatusBadgeClass = (isActive) => {
    return `px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${isActive
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-700'}`;
};
// Hàm hỗ trợ hiển thị tên danh mục
const getCategoryLabel = (category) => {
    switch (category) {
        case 'electronics': return 'Điện tử';
        case 'fashion': return 'Thời trang';
        case 'home': return 'Đồ gia dụng';
        case 'books': return 'Sách';
        default: return 'Khác/Chưa có';
    }
};
const StoreManagement = () => {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [toggleConfirm, setToggleConfirm] = useState({ open: false, store: null });
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
            }
            else if (response.data?.stores && Array.isArray(response.data.stores)) {
                data = response.data.stores;
            }
            else if (response.data && typeof response.data === 'object') {
                // Nếu response.data là object, thử lấy stores property
                data = response.data.stores || [];
            }
            console.log('📦 [StoreManagement] Final data:', data);
            console.log('📦 [StoreManagement] Số lượng stores:', data.length);
            setStores(Array.isArray(data) ? data : []);
        }
        catch (error) {
            console.error('❌ Error fetching stores:', error);
            toast.error(error?.response?.data?.message || 'Lỗi khi tải danh sách cửa hàng');
        }
        finally {
            setLoading(false);
        }
    };
    const handleToggleStatusClick = (store) => {
        setToggleConfirm({ open: true, store });
    };
    const handleToggleStatus = async () => {
        if (!toggleConfirm.store)
            return;
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
        }
        catch (error) {
            console.error(`❌ Lỗi khi ${action} cửa hàng:`, error?.response || error);
            toast.error(error?.response?.data?.message || `Không thể ${action} cửa hàng. Vui lòng thử lại!`, {
                containerId: "general-toast",
            });
        }
    };
    // Sắp xếp và lọc stores
    const filteredAndSortedStores = useMemo(() => {
        let filtered = stores.filter(store => store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            store.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            store.owner?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            getCategoryLabel(store.category).toLowerCase().includes(searchTerm.toLowerCase()));
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
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-20", children: [_jsx(Loader2, { className: "w-16 h-16 text-purple-500 animate-spin mb-4" }), _jsx("p", { className: "text-gray-600 text-lg font-medium", children: "\u0110ang t\u1EA3i c\u1EEDa h\u00E0ng..." })] }));
    }
    return (_jsxs("div", { className: "p-4 lg:p-8", children: [_jsxs("div", { className: "mb-4 md:mb-6 animate-fade-in-down", children: [_jsxs("h2", { className: "text-xl md:text-2xl font-bold mb-1 md:mb-2 gradient-text flex items-center gap-2", children: [_jsx(StoreIcon, { size: 20, className: "md:w-6 md:h-6 text-blue-600" }), _jsx("span", { className: "text-base md:text-2xl", children: "Qu\u1EA3n l\u00FD c\u1EEDa h\u00E0ng" })] }), _jsx("p", { className: "text-gray-600 text-xs md:text-sm", children: "Qu\u1EA3n l\u00FD v\u00E0 ch\u1EC9nh s\u1EEDa th\u00F4ng tin c\u00E1c c\u1EEDa h\u00E0ng trong h\u1EC7 th\u1ED1ng" })] }), _jsx("div", { className: "mb-4 md:mb-6 animate-fade-in-up", children: _jsx("div", { className: "bg-blue-600 rounded-lg md:rounded-xl p-4 md:p-6 shadow-lg", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white text-xs md:text-sm font-medium mb-1", children: "T\u1ED5ng s\u1ED1 c\u1EEDa h\u00E0ng" }), _jsx("p", { className: "text-white text-2xl md:text-4xl font-bold", children: filteredAndSortedStores.length.toLocaleString('vi-VN') })] }), _jsx(StoreIcon, { className: "w-12 h-12 md:w-16 md:h-16 text-white opacity-80" })] }) }) }), _jsx("div", { className: "mb-4 md:mb-6 animate-fade-in-up", children: _jsxs("div", { className: "relative w-full sm:max-w-md", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" }), _jsx("input", { type: "text", placeholder: "T\u00ECm ki\u1EBFm c\u1EEDa h\u00E0ng...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium" })] }) }), filteredAndSortedStores.length > 0 ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "hidden md:block overflow-x-auto", children: _jsxs("table", { className: "min-w-full", children: [_jsx("thead", { className: "bg-gray-100 border-b-2 border-gray-200", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "C\u1EEDa h\u00E0ng" }), _jsx("th", { className: "px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "Ch\u1EE7 s\u1EDF h\u1EEFu" }), _jsx("th", { className: "px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "Danh m\u1EE5c" }), _jsx("th", { className: "px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { className: "px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "Thao t\u00E1c" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: paginatedStores.map((store, index) => (_jsxs("tr", { className: "hover:bg-gray-50 transition-all duration-300 animate-fade-in-up", style: { animationDelay: `${index * 0.05}s` }, children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("img", { src: store.logoUrl || '/default-store.png', alt: store.name, className: "w-12 h-12 rounded-xl object-cover border-2 border-gray-200 shadow-lg" }), _jsxs("div", { children: [_jsx("div", { className: "font-bold text-gray-900", children: store.name }), _jsx("div", { className: "text-xs text-gray-500 max-w-xs truncate", children: store.description })] })] }) }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap", children: [_jsx("div", { className: "font-medium text-gray-900", children: store.owner?.fullName || 'N/A' }), _jsx("div", { className: "text-xs text-gray-500", children: store.owner?.email || '' })] }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("span", { className: "px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-green-500 text-white shadow-lg", children: getCategoryLabel(store.category) }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("span", { className: getStatusBadgeClass(store.isActive ?? true), children: store.isActive ? 'Hoạt động' : 'Tạm khóa' }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-medium", children: _jsx("div", { className: "flex items-center gap-2", children: _jsxs("button", { onClick: () => handleToggleStatusClick(store), className: `${store.isActive ? 'text-orange-600 hover:text-orange-900 hover:bg-orange-50' : 'text-green-600 hover:text-green-900 hover:bg-green-50'} px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-110 flex items-center gap-1`, title: store.isActive ? 'Khóa cửa hàng' : 'Mở khóa cửa hàng', children: [store.isActive ? _jsx(Lock, { size: 16 }) : _jsx(Unlock, { size: 16 }), store.isActive ? 'Khóa' : 'Mở khóa'] }) }) })] }, store._id))) })] }) }), _jsx("div", { className: "md:hidden space-y-4", children: paginatedStores.map((store, index) => (_jsxs("div", { className: "bg-white p-4 shadow-xl rounded-xl border border-gray-100 transition-shadow duration-300 hover:shadow-2xl animate-fade-in-up", style: { animationDelay: `${index * 0.05}s` }, children: [_jsxs("div", { className: "flex items-start justify-between mb-4 border-b pb-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("img", { src: store.logoUrl || '/default-store.png', alt: store.name, className: "w-12 h-12 rounded-xl object-cover border-2 border-blue-500 shadow-md flex-shrink-0" }), _jsxs("div", { children: [_jsx("div", { className: "font-bold text-lg text-gray-900", children: store.name }), _jsx("div", { className: "text-xs text-gray-500 max-w-xs truncate", children: store.description })] })] }), _jsx("span", { className: getStatusBadgeClass(store.isActive ?? true), children: store.isActive ? 'Hoạt động' : 'Tạm khóa' })] }), _jsxs("div", { className: "grid grid-cols-2 gap-y-3 text-sm", children: [_jsxs("div", { className: "text-gray-500 font-medium flex items-center gap-2", children: [_jsx(User, { size: 14, className: "text-purple-400" }), " Ch\u1EE7 s\u1EDF h\u1EEFu:"] }), _jsxs("div", { className: "text-right text-gray-700", children: [_jsx("div", { className: "font-medium", children: store.owner?.fullName || 'N/A' }), _jsx("div", { className: "text-xs text-gray-500", children: store.owner?.email || '' })] }), _jsxs("div", { className: "text-gray-500 font-medium flex items-center gap-2", children: [_jsx(Tag, { size: 14, className: "text-green-400" }), " Danh m\u1EE5c:"] }), _jsx("div", { className: "text-right", children: _jsx("span", { className: "px-3 py-1 text-xs leading-5 font-bold rounded-full bg-green-500 text-white shadow-lg", children: getCategoryLabel(store.category) }) }), store.createdAt && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "text-gray-500 font-medium flex items-center gap-2", children: [_jsx(Calendar, { size: 14, className: "text-gray-400" }), " Ng\u00E0y t\u1EA1o:"] }), _jsx("div", { className: "text-right text-gray-700", children: new Date(store.createdAt).toLocaleDateString("vi-VN") })] }))] }), _jsx("div", { className: "flex justify-end gap-2 pt-4 mt-4 border-t", children: _jsxs("button", { onClick: () => handleToggleStatus(store), className: `${store.isActive ? 'text-orange-600 hover:text-orange-900 hover:bg-orange-50' : 'text-green-600 hover:text-green-900 hover:bg-green-50'} px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-1 text-sm`, title: store.isActive ? 'Khóa cửa hàng' : 'Mở khóa cửa hàng', children: [store.isActive ? _jsx(Lock, { size: 16 }) : _jsx(Unlock, { size: 16 }), store.isActive ? 'Khóa' : 'Mở khóa'] }) })] }, store._id))) }), totalPages > 1 && (_jsx(Pagination, { currentPage: currentPage, totalPages: totalPages, onPageChange: setCurrentPage, itemsPerPage: itemsPerPage, totalItems: filteredAndSortedStores.length }))] })) : (_jsxs("div", { className: "text-center py-20 animate-fade-in-up", children: [_jsx(StoreIcon, { size: 64, className: "mx-auto mb-4 text-gray-400" }), _jsx("p", { className: "text-gray-500 text-lg font-medium", children: searchTerm ? "Không tìm thấy cửa hàng nào" : "Không có cửa hàng nào" })] })), _jsx(ConfirmDialog, { open: toggleConfirm.open, onClose: () => setToggleConfirm({ open: false, store: null }), onConfirm: handleToggleStatus, title: toggleConfirm.store ? `Xác nhận ${toggleConfirm.store.isActive ? 'khóa' : 'mở khóa'} cửa hàng` : "", message: toggleConfirm.store ? `Bạn có chắc muốn ${toggleConfirm.store.isActive ? 'khóa' : 'mở khóa'} cửa hàng ${toggleConfirm.store.name}?` : "", type: toggleConfirm.store?.isActive ? "danger" : "info", confirmText: toggleConfirm.store?.isActive ? "Khóa cửa hàng" : "Mở khóa cửa hàng" })] }));
};
export default StoreManagement;
