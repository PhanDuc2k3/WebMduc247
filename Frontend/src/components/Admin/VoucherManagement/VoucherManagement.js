import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo } from 'react';
import voucherApi from '../../../api/voucherApi';
import { Edit, Trash2, Plus, Search, Gift, Lock, Unlock, Loader2, Ticket, Calendar, DollarSign, Zap } from 'lucide-react';
import ConfirmDialog from '../../ui/ConfirmDialog';
import Pagination from '../Pagination';
import { toast } from 'react-toastify';
// Đồng nhất CSS cho status badges
const getStatusBadgeClass = (isActive) => {
    return `px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${isActive
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-700'}`;
};
// Định dạng giá trị giảm giá
const formatDiscountValue = (voucher) => {
    if (voucher.discountType === 'percent') {
        return `${voucher.discountValue}%`;
    }
    return `${voucher.discountValue.toLocaleString('vi-VN')}đ`;
};
// Định dạng giá trị tối thiểu
const formatMinOrderValue = (value) => {
    return value && value > 0 ? `${value.toLocaleString('vi-VN')}đ` : 'Không có';
};
const VoucherManagement = () => {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const [showForm, setShowForm] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState(null);
    const [formData, setFormData] = useState({
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
    const [selectedCategories, setSelectedCategories] = useState([]);
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
        }
        catch (error) {
            console.error('Error fetching vouchers:', error);
            toast.error(error?.response?.data?.message || 'Lỗi khi tải danh sách voucher');
        }
        finally {
            setLoading(false);
        }
    };
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, voucherId: null });
    const handleDeleteClick = (voucherId) => {
        setDeleteConfirm({ open: true, voucherId });
    };
    const handleDelete = async () => {
        if (!deleteConfirm.voucherId)
            return;
        const voucherId = deleteConfirm.voucherId;
        setDeleteConfirm({ open: false, voucherId: null });
        try {
            await voucherApi.deleteVoucher(voucherId);
            toast.success('Đã xóa voucher thành công!');
            fetchVouchers();
        }
        catch (error) {
            console.error('Error deleting voucher:', error);
            toast.error(error?.response?.data?.message || 'Lỗi khi xóa voucher');
        }
    };
    const handleToggleStatus = async (voucherId) => {
        try {
            const response = await voucherApi.toggleVoucherStatus(voucherId);
            toast.success(response.data.message);
            fetchVouchers();
        }
        catch (error) {
            console.error('Error toggling voucher status:', error);
            toast.error(error?.response?.data?.message || 'Lỗi khi thay đổi trạng thái voucher');
        }
    };
    const handleEdit = (voucher) => {
        setEditingVoucher(voucher);
        setFormData({
            ...voucher,
            startDate: voucher.startDate ? new Date(voucher.startDate).toISOString().split('T')[0] : '',
            endDate: voucher.endDate ? new Date(voucher.endDate).toISOString().split('T')[0] : '',
        });
        // Set selected categories và global cho edit
        const isGlobalVoucher = voucher.global === true;
        const categories = voucher.categories || [];
        setIsGlobal(isGlobalVoucher);
        setSelectedCategories(isGlobalVoucher ? [] : categories);
        setShowForm(true);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const submitData = {
                ...formData,
                startDate: new Date(formData.startDate).toISOString(),
                endDate: new Date(formData.endDate).toISOString(),
            };
            // Chỉ gửi maxDiscount khi discountType là "percent"
            if (submitData.discountType === "percent") {
                // Giữ nguyên maxDiscount
            }
            else {
                // Không gửi maxDiscount khi là fixed
                delete submitData.maxDiscount;
            }
            // Admin: thêm categories hoặc global
            if (isGlobal) {
                submitData.global = true;
                submitData.categories = [];
            }
            else if (selectedCategories.length > 0) {
                submitData.global = false;
                submitData.categories = selectedCategories;
            }
            else {
                // Nếu không chọn global và không chọn category nào, mặc định là global
                submitData.global = true;
                submitData.categories = [];
            }
            if (editingVoucher?._id) {
                await voucherApi.updateVoucher(editingVoucher._id, submitData);
                toast.success('Đã cập nhật voucher thành công!');
            }
            else {
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
        }
        catch (error) {
            console.error('Error saving voucher:', error);
            toast.error(error?.response?.data?.message || 'Lỗi khi lưu voucher');
        }
    };
    // Sắp xếp và lọc vouchers
    const filteredAndSortedVouchers = useMemo(() => {
        let filtered = vouchers.filter(voucher => voucher.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            voucher.description?.toLowerCase().includes(searchTerm.toLowerCase()));
        // Sắp xếp theo createdAt desc (mới nhất lên trước)
        filtered.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
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
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-20", children: [_jsx(Loader2, { className: "w-16 h-16 text-purple-500 animate-spin mb-4" }), _jsx("p", { className: "text-gray-600 text-lg font-medium", children: "\u0110ang t\u1EA3i voucher..." })] }));
    }
    return (_jsxs("div", { className: "p-4 md:p-6 lg:p-8", children: [_jsxs("div", { className: "mb-4 md:mb-6 animate-fade-in-down", children: [_jsxs("h2", { className: "text-xl md:text-2xl font-bold mb-1 md:mb-2 gradient-text flex items-center gap-2", children: [_jsx(Gift, { size: 20, className: "md:w-6 md:h-6 text-purple-600" }), _jsx("span", { className: "text-base md:text-2xl", children: "Qu\u1EA3n l\u00FD Voucher" })] }), _jsx("p", { className: "text-gray-600 text-xs md:text-sm", children: "Qu\u1EA3n l\u00FD v\u00E0 t\u1EA1o c\u00E1c m\u00E3 gi\u1EA3m gi\u00E1 cho kh\u00E1ch h\u00E0ng" })] }), _jsx("div", { className: "mb-4 md:mb-6 animate-fade-in-up", children: _jsx("div", { className: "bg-blue-600 rounded-lg md:rounded-xl p-4 md:p-6 shadow-lg", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white text-xs md:text-sm font-medium mb-1", children: "T\u1ED5ng s\u1ED1 voucher" }), _jsx("p", { className: "text-white text-2xl md:text-4xl font-bold", children: filteredAndSortedVouchers.length.toLocaleString('vi-VN') })] }), _jsx(Gift, { className: "w-12 h-12 md:w-16 md:h-16 text-white opacity-80" })] }) }) }), _jsxs("div", { className: "mb-4 md:mb-6 flex flex-col sm:flex-row gap-3 md:gap-4 items-stretch sm:items-center justify-between animate-fade-in-up", children: [_jsxs("div", { className: "relative flex-1 w-full sm:max-w-md", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" }), _jsx("input", { type: "text", placeholder: "T\u00ECm ki\u1EBFm voucher...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium" })] }), _jsxs("button", { onClick: () => {
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
                        }, className: "px-4 md:px-6 py-2 md:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg md:rounded-xl text-sm md:text-base font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2", children: [_jsx(Plus, { size: 18, className: "md:w-5 md:h-5" }), _jsx("span", { children: "Th\u00EAm voucher" })] })] }), filteredAndSortedVouchers.length > 0 ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "hidden md:block bg-white rounded-lg md:rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden animate-fade-in-up", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-100 border-b-2 border-gray-200", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "M\u00E3 voucher" }), _jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "M\u00F4 t\u1EA3" }), _jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "Gi\u1EA3m gi\u00E1" }), _jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "\u0110\u01A1n t\u1ED1i thi\u1EC3u" }), _jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "Th\u1EDDi h\u1EA1n" }), _jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-center text-xs font-bold text-gray-700 uppercase", children: "Thao t\u00E1c" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: paginatedVouchers.map((voucher, index) => (_jsxs("tr", { className: `hover:bg-gray-50 transition-all duration-300 ${!voucher.isActive ? 'bg-gray-50 opacity-75' : ''}`, children: [_jsx("td", { className: "px-4 md:px-6 py-3 md:py-4 whitespace-nowrap", children: _jsxs("div", { className: "flex items-center gap-2", children: [!voucher.isActive && _jsx(Lock, { size: 14, className: "md:w-4 md:h-4 text-gray-400" }), _jsx("span", { className: `text-sm md:text-base font-bold ${!voucher.isActive ? 'text-gray-500' : 'text-gray-900'}`, children: voucher.code })] }) }), _jsx("td", { className: "px-4 md:px-6 py-3 md:py-4", children: _jsx("div", { className: `text-xs md:text-sm max-w-xs truncate ${!voucher.isActive ? 'text-gray-400' : 'text-gray-700'}`, children: voucher.description || 'Không có mô tả' }) }), _jsx("td", { className: "px-4 md:px-6 py-3 md:py-4 whitespace-nowrap", children: _jsx("span", { className: `text-sm md:text-base font-bold ${!voucher.isActive ? 'text-gray-400' : 'text-green-600'}`, children: formatDiscountValue(voucher) }) }), _jsx("td", { className: "px-4 md:px-6 py-3 md:py-4 whitespace-nowrap", children: _jsx("span", { className: `text-xs md:text-sm ${!voucher.isActive ? 'text-gray-400' : 'text-gray-700'}`, children: formatMinOrderValue(voucher.minOrderValue) }) }), _jsx("td", { className: "px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500", children: voucher.startDate && voucher.endDate
                                                        ? `${new Date(voucher.startDate).toLocaleDateString('vi-VN')} - ${new Date(voucher.endDate).toLocaleDateString('vi-VN')}`
                                                        : 'N/A' }), _jsx("td", { className: "px-4 md:px-6 py-3 md:py-4 whitespace-nowrap", children: _jsx("span", { className: getStatusBadgeClass(voucher.isActive ?? true), children: voucher.isActive ? 'Hoạt động' : 'Tạm khóa' }) }), _jsx("td", { className: "px-4 md:px-6 py-3 md:py-4 whitespace-nowrap", children: _jsxs("div", { className: "flex items-center justify-center gap-1 md:gap-2", children: [_jsx("button", { onClick: () => handleEdit(voucher), className: "p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors", title: "Ch\u1EC9nh s\u1EEDa", children: _jsx(Edit, { size: 16, className: "md:w-[18px] md:h-[18px]" }) }), voucher._id && (_jsx("button", { onClick: () => handleToggleStatus(voucher._id), className: `p-1.5 md:p-2 rounded-lg transition-colors ${voucher.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`, title: voucher.isActive ? 'Khóa voucher' : 'Mở khóa voucher', children: voucher.isActive ? _jsx(Lock, { size: 16, className: "md:w-[18px] md:h-[18px]" }) : _jsx(Unlock, { size: 16, className: "md:w-[18px] md:h-[18px]" }) })), _jsx("button", { onClick: () => voucher._id && handleDeleteClick(voucher._id), className: "p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors", title: "X\u00F3a", children: _jsx(Trash2, { size: 16, className: "md:w-[18px] md:h-[18px]" }) })] }) })] }, voucher._id))) })] }) }) }), _jsx("div", { className: "md:hidden space-y-3 animate-fade-in-up", children: paginatedVouchers.map((voucher) => (_jsxs("div", { className: `bg-white rounded-lg shadow-lg border-2 border-gray-100 p-4 transition-shadow duration-300 ${!voucher.isActive ? 'opacity-75' : ''}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-3 border-b pb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Ticket, { size: 20, className: "text-purple-500" }), _jsx("span", { className: `font-bold text-base ${!voucher.isActive ? 'text-gray-500' : 'text-purple-700'}`, children: voucher.code }), !voucher.isActive && _jsx(Lock, { size: 14, className: "text-gray-400" })] }), _jsx("span", { className: getStatusBadgeClass(voucher.isActive ?? true), children: voucher.isActive ? 'Hoạt động' : 'Tạm khóa' })] }), _jsx("p", { className: `text-xs text-gray-500 mb-3 line-clamp-2 ${!voucher.isActive ? 'text-gray-400' : ''}`, children: voucher.description || 'Không có mô tả' }), _jsxs("div", { className: "grid grid-cols-2 gap-y-2 text-xs mb-3", children: [_jsxs("div", { className: "text-gray-500 font-medium flex items-center gap-1", children: [_jsx(Zap, { size: 12, className: "text-red-400" }), " Gi\u1EA3m gi\u00E1:"] }), _jsx("div", { className: "text-right font-bold text-green-600", children: formatDiscountValue(voucher) }), _jsxs("div", { className: "text-gray-500 font-medium flex items-center gap-1", children: [_jsx(DollarSign, { size: 12, className: "text-blue-400" }), " \u0110\u01A1n t\u1ED1i thi\u1EC3u:"] }), _jsx("div", { className: "text-right text-gray-700", children: formatMinOrderValue(voucher.minOrderValue) }), _jsxs("div", { className: "text-gray-500 font-medium flex items-center gap-1", children: [_jsx(Ticket, { size: 12, className: "text-yellow-400" }), " Gi\u1EDBi h\u1EA1n:"] }), _jsx("div", { className: "text-right text-gray-700", children: voucher.usageLimit > 0 ? `${voucher.usageLimit} lần` : 'Không giới hạn' }), _jsxs("div", { className: "col-span-2 mt-2 pt-2 border-t border-gray-100", children: [_jsxs("div", { className: "text-gray-500 font-medium flex items-center gap-1 mb-1", children: [_jsx(Calendar, { size: 12, className: "text-gray-400" }), " Th\u1EDDi h\u1EA1n:"] }), _jsx("p", { className: "text-xs text-gray-700 ml-4", children: voucher.startDate && voucher.endDate
                                                        ? `${new Date(voucher.startDate).toLocaleDateString('vi-VN')} - ${new Date(voucher.endDate).toLocaleDateString('vi-VN')}`
                                                        : 'N/A' })] })] }), _jsxs("div", { className: "flex items-center justify-end gap-2 pt-3 border-t border-gray-200", children: [_jsxs("button", { onClick: () => handleEdit(voucher), className: "px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-bold flex items-center gap-1", children: [_jsx(Edit, { size: 14 }), "S\u1EEDa"] }), voucher._id && (_jsxs("button", { onClick: () => handleToggleStatus(voucher._id), className: `px-3 py-1.5 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 ${voucher.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`, title: voucher.isActive ? 'Khóa voucher' : 'Mở khóa voucher', children: [voucher.isActive ? _jsx(Lock, { size: 14 }) : _jsx(Unlock, { size: 14 }), voucher.isActive ? 'Khóa' : 'Mở'] })), _jsxs("button", { onClick: () => voucher._id && handleDelete(voucher._id), className: "px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-bold flex items-center gap-1", children: [_jsx(Trash2, { size: 14 }), "X\u00F3a"] })] })] }, voucher._id))) }), totalPages > 1 && (_jsx(Pagination, { currentPage: currentPage, totalPages: totalPages, onPageChange: setCurrentPage, itemsPerPage: itemsPerPage, totalItems: filteredAndSortedVouchers.length }))] })) : (_jsxs("div", { className: "text-center py-20 animate-fade-in-up", children: [_jsx("div", { className: "text-8xl mb-4 animate-bounce", children: "\uD83C\uDFAB" }), _jsx("p", { className: "text-gray-500 text-lg font-medium", children: "Kh\u00F4ng t\u00ECm th\u1EA5y voucher n\u00E0o" })] })), showForm && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4", children: _jsxs("div", { className: "bg-white rounded-lg md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "p-4 md:p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10", children: [_jsxs("h3", { className: "text-base md:text-xl font-bold gradient-text flex items-center gap-2", children: [_jsx(Edit, { size: 20, className: "md:w-6 md:h-6 text-purple-600" }), _jsx("span", { className: "text-sm md:text-xl", children: editingVoucher ? 'Sửa voucher' : 'Thêm voucher mới' })] }), _jsx("button", { onClick: () => {
                                        setShowForm(false);
                                        setEditingVoucher(null);
                                    }, className: "text-gray-500 hover:text-gray-700 text-xl md:text-2xl font-bold", children: "\u00D7" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-4 md:p-6 space-y-4 md:space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "M\u00E3 voucher *" }), _jsx("input", { type: "text", required: true, value: formData.code, onChange: (e) => setFormData({ ...formData, code: e.target.value.toUpperCase() }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "Ti\u00EAu \u0111\u1EC1 *" }), _jsx("input", { type: "text", required: true, value: formData.title, onChange: (e) => setFormData({ ...formData, title: e.target.value }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium", placeholder: "Nh\u1EADp ti\u00EAu \u0111\u1EC1 voucher" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "M\u00F4 t\u1EA3 *" }), _jsx("textarea", { rows: 2, required: true, value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium", placeholder: "Nh\u1EADp m\u00F4 t\u1EA3 voucher" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "\u0110i\u1EC1u ki\u1EC7n *" }), _jsx("textarea", { rows: 2, required: true, value: formData.condition, onChange: (e) => setFormData({ ...formData, condition: e.target.value }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium", placeholder: "Nh\u1EADp \u0111i\u1EC1u ki\u1EC7n \u00E1p d\u1EE5ng voucher" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "Lo\u1EA1i voucher *" }), _jsxs("select", { required: true, value: formData.voucherType || 'product', onChange: (e) => setFormData({ ...formData, voucherType: e.target.value }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium", children: [_jsx("option", { value: "product", children: "Gi\u1EA3m gi\u00E1 s\u1EA3n ph\u1EA9m" }), _jsx("option", { value: "freeship", children: "Mi\u1EC5n ph\u00ED v\u1EADn chuy\u1EC3n" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "Lo\u1EA1i gi\u1EA3m gi\u00E1 *" }), _jsxs("select", { required: true, value: formData.discountType, onChange: (e) => setFormData({ ...formData, discountType: e.target.value }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium", children: [_jsx("option", { value: "percent", children: "Ph\u1EA7n tr\u0103m (%)" }), _jsx("option", { value: "fixed", children: "S\u1ED1 ti\u1EC1n c\u1ED1 \u0111\u1ECBnh" })] })] })] }), formData.discountType === "fixed" ? (_jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "Gi\u00E1 tr\u1ECB gi\u1EA3m (\u20AB) *" }), _jsx("input", { type: "number", required: true, min: "0", value: formData.discountValue, onChange: (e) => setFormData({ ...formData, discountValue: Number(e.target.value) }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium", placeholder: "VD: 50000" })] })) : (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "Gi\u1EA3m theo % *" }), _jsx("input", { type: "number", required: true, min: "0", max: "100", value: formData.discountValue, onChange: (e) => setFormData({ ...formData, discountValue: Number(e.target.value) }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium", placeholder: "VD: 10" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "Gi\u1EA3m t\u1ED1i \u0111a (\u20AB) *" }), _jsx("input", { type: "number", required: true, min: "0", value: formData.maxDiscount, onChange: (e) => setFormData({ ...formData, maxDiscount: Number(e.target.value) }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium", placeholder: "VD: 100000" })] })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "\u0110\u01A1n h\u00E0ng t\u1ED1i thi\u1EC3u (\u20AB)" }), _jsx("input", { type: "number", min: "0", value: formData.minOrderValue, onChange: (e) => setFormData({ ...formData, minOrderValue: Number(e.target.value) }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium", placeholder: "VD: 100000" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "Ng\u00E0y b\u1EAFt \u0111\u1EA7u *" }), _jsx("input", { type: "date", required: true, value: formData.startDate, onChange: (e) => setFormData({ ...formData, startDate: e.target.value }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "Ng\u00E0y k\u1EBFt th\u00FAc *" }), _jsx("input", { type: "date", required: true, value: formData.endDate, onChange: (e) => setFormData({ ...formData, endDate: e.target.value }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium" })] })] }), _jsxs("div", { className: "border-2 border-gray-200 rounded-lg md:rounded-xl p-3 md:p-4 bg-gray-50", children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-2 md:mb-3", children: "\u00C1p d\u1EE5ng cho c\u1EEDa h\u00E0ng" }), _jsx("div", { className: "mb-3 md:mb-4", children: _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "radio", name: "storeScope", checked: isGlobal, onChange: () => {
                                                            setIsGlobal(true);
                                                            setSelectedCategories([]);
                                                        }, className: "w-4 h-4 md:w-5 md:h-5 text-purple-600" }), _jsx("span", { className: "text-xs md:text-sm font-semibold text-gray-700", children: "\u00C1p d\u1EE5ng cho t\u1EA5t c\u1EA3 c\u1EEDa h\u00E0ng (Global)" })] }) }), _jsxs("div", { className: "mb-2 md:mb-3", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer mb-2 md:mb-3", children: [_jsx("input", { type: "radio", name: "storeScope", checked: !isGlobal, onChange: () => setIsGlobal(false), className: "w-4 h-4 md:w-5 md:h-5 text-purple-600" }), _jsx("span", { className: "text-xs md:text-sm font-semibold text-gray-700", children: "\u00C1p d\u1EE5ng cho lo\u1EA1i c\u1EEDa h\u00E0ng" })] }), !isGlobal && (_jsxs("div", { className: "ml-4 md:ml-6 border-2 border-gray-300 rounded-lg p-2 md:p-3 bg-white", children: [_jsx("p", { className: "text-xs text-gray-500 mb-2 md:mb-3", children: "Ch\u1ECDn lo\u1EA1i c\u1EEDa h\u00E0ng \u0111\u1EC3 \u00E1p d\u1EE5ng voucher:" }), _jsx("div", { className: "space-y-1 md:space-y-2", children: availableCategories.map((category) => (_jsxs("label", { className: "flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 md:p-2 rounded", children: [_jsx("input", { type: "checkbox", checked: selectedCategories.includes(category.value), onChange: (e) => {
                                                                            if (e.target.checked) {
                                                                                setSelectedCategories([...selectedCategories, category.value]);
                                                                            }
                                                                            else {
                                                                                setSelectedCategories(selectedCategories.filter(c => c !== category.value));
                                                                            }
                                                                        }, className: "w-3 h-3 md:w-4 md:h-4 text-purple-600" }), _jsx("span", { className: "text-xs md:text-sm text-gray-700", children: category.label })] }, category.value))) }), selectedCategories.length > 0 && (_jsxs("p", { className: "text-xs text-gray-500 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-200", children: ["\u0110\u00E3 ch\u1ECDn: ", selectedCategories.map(c => availableCategories.find(cat => cat.value === c)?.label).join(', ')] }))] }))] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "Gi\u1EDBi h\u1EA1n s\u1EED d\u1EE5ng" }), _jsx("input", { type: "number", min: "0", value: formData.usageLimit, onChange: (e) => setFormData({ ...formData, usageLimit: Number(e.target.value) }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "Tr\u1EA1ng th\u00E1i" }), _jsxs("select", { value: formData.isActive ? 'active' : 'inactive', onChange: (e) => setFormData({ ...formData, isActive: e.target.value === 'active' }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium", children: [_jsx("option", { value: "active", children: "Ho\u1EA1t \u0111\u1ED9ng" }), _jsx("option", { value: "inactive", children: "T\u1EA1m kh\u00F3a" })] })] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-2 md:gap-4 justify-end pt-3 md:pt-4 border-t border-gray-200", children: [_jsx("button", { type: "button", onClick: () => {
                                                setShowForm(false);
                                                setEditingVoucher(null);
                                            }, className: "w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 text-gray-700 rounded-lg md:rounded-xl font-bold hover:bg-gray-50 transition-all duration-300", children: "H\u1EE7y" }), _jsx("button", { type: "submit", className: "w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 text-sm md:text-base bg-blue-600 hover:bg-blue-700 text-white rounded-lg md:rounded-xl font-bold transition-all duration-300 shadow-lg", children: editingVoucher ? 'Cập nhật' : 'Tạo mới' })] })] })] }) })), _jsx(ConfirmDialog, { open: deleteConfirm.open, onClose: () => setDeleteConfirm({ open: false, voucherId: null }), onConfirm: handleDelete, title: "X\u00E1c nh\u1EADn x\u00F3a voucher", message: "B\u1EA1n c\u00F3 ch\u1EAFc mu\u1ED1n x\u00F3a voucher n\u00E0y kh\u00F4ng?", type: "danger", confirmText: "X\u00F3a" })] }));
};
export default VoucherManagement;
