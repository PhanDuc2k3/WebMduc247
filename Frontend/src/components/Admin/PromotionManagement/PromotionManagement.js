import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo } from 'react';
import promotionApi from '../../../api/promotionApi';
import { Edit, Trash2, Plus, Search, Tag, Eye, Loader2, Megaphone } from 'lucide-react';
import ConfirmDialog from '../../ui/ConfirmDialog';
import Pagination from '../Pagination';
import { toast } from 'react-toastify';
// Đồng nhất CSS cho status badges
const getStatusBadgeClass = (isActive) => {
    return `px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${isActive
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-700'}`;
};
const PromotionManagement = () => {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, promotionId: null });
    const itemsPerPage = 20;
    const [showForm, setShowForm] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        content: '',
        category: 'Khác',
        tags: [],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    useEffect(() => {
        fetchPromotions();
    }, []);
    const fetchPromotions = async () => {
        try {
            setLoading(true);
            const response = await promotionApi.getAllPromotions();
            setPromotions(response.data || []);
        }
        catch (error) {
            console.error('Error fetching promotions:', error);
            toast.error(error?.response?.data?.message || 'Lỗi khi tải danh sách tin tức khuyến mãi');
        }
        finally {
            setLoading(false);
        }
    };
    const handleDeleteClick = (promotionId) => {
        setDeleteConfirm({ open: true, promotionId });
    };
    const handleDelete = async () => {
        if (!deleteConfirm.promotionId)
            return;
        const promotionId = deleteConfirm.promotionId;
        setDeleteConfirm({ open: false, promotionId: null });
        try {
            await promotionApi.deletePromotion(promotionId);
            toast.success('Đã xóa tin tức khuyến mãi thành công!');
            fetchPromotions();
        }
        catch (error) {
            console.error('Error deleting promotion:', error);
            toast.error(error?.response?.data?.message || 'Lỗi khi xóa tin tức khuyến mãi');
        }
    };
    const handleEdit = (promotion) => {
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
    const handleSubmit = async (e) => {
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
            }
            else {
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
        }
        catch (error) {
            console.error('Error saving promotion:', error);
            toast.error(error?.response?.data?.message || 'Lỗi khi lưu tin tức khuyến mãi');
        }
    };
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };
    // Sắp xếp và lọc promotions
    const filteredAndSortedPromotions = useMemo(() => {
        let filtered = promotions.filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase()));
        // Sắp xếp theo createdAt desc (mới nhất lên trước)
        filtered.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
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
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-20", children: [_jsx(Loader2, { className: "w-16 h-16 text-purple-500 animate-spin mb-4" }), _jsx("p", { className: "text-gray-600 text-lg font-medium", children: "\u0110ang t\u1EA3i tin t\u1EE9c khuy\u1EBFn m\u00E3i..." })] }));
    }
    return (_jsxs("div", { className: "p-4 md:p-6 lg:p-8", children: [_jsxs("div", { className: "mb-4 md:mb-6 animate-fade-in-down", children: [_jsxs("h2", { className: "text-xl md:text-2xl font-bold mb-1 md:mb-2 gradient-text flex items-center gap-2", children: [_jsx(Megaphone, { size: 20, className: "md:w-6 md:h-6 text-blue-600" }), _jsx("span", { className: "text-base md:text-2xl", children: "Qu\u1EA3n l\u00FD Tin t\u1EE9c Khuy\u1EBFn m\u00E3i" })] }), _jsx("p", { className: "text-gray-600 text-xs md:text-sm", children: "Qu\u1EA3n l\u00FD v\u00E0 t\u1EA1o c\u00E1c tin t\u1EE9c khuy\u1EBFn m\u00E3i cho kh\u00E1ch h\u00E0ng" })] }), _jsx("div", { className: "mb-4 md:mb-6 animate-fade-in-up", children: _jsx("div", { className: "bg-purple-600 rounded-lg md:rounded-xl p-4 md:p-6 shadow-lg", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white text-xs md:text-sm font-medium mb-1", children: "T\u1ED5ng s\u1ED1 khuy\u1EBFn m\u00E3i" }), _jsx("p", { className: "text-white text-2xl md:text-4xl font-bold", children: filteredAndSortedPromotions.length.toLocaleString('vi-VN') })] }), _jsx(Megaphone, { className: "w-12 h-12 md:w-16 md:h-16 text-white opacity-80" })] }) }) }), _jsxs("div", { className: "mb-4 md:mb-6 flex flex-col sm:flex-row gap-3 md:gap-4 items-stretch sm:items-center justify-between animate-fade-in-up", children: [_jsxs("div", { className: "relative flex-1 w-full sm:max-w-md", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" }), _jsx("input", { type: "text", placeholder: "T\u00ECm ki\u1EBFm tin t\u1EE9c khuy\u1EBFn m\u00E3i...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium" })] }), _jsxs("button", { onClick: () => {
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
                        }, className: "px-4 md:px-6 py-2 md:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg md:rounded-xl text-sm md:text-base font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2", children: [_jsx(Plus, { size: 18, className: "md:w-5 md:h-5" }), _jsx("span", { children: "Th\u00EAm m\u1EDBi" })] })] }), showForm && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4", children: _jsxs("div", { className: "bg-white rounded-lg md:rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "p-4 md:p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10", children: [_jsxs("h3", { className: "text-base md:text-xl font-bold gradient-text", children: [editingPromotion ? 'Chỉnh sửa' : 'Thêm mới', " Tin t\u1EE9c Khuy\u1EBFn m\u00E3i"] }), _jsx("button", { onClick: () => setShowForm(false), className: "text-gray-500 hover:text-gray-700 text-xl md:text-2xl font-bold", children: "\u00D7" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-4 md:p-6 space-y-4 md:space-y-6", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: ["Ti\u00EAu \u0111\u1EC1 ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", required: true, value: formData.title, onChange: (e) => setFormData({ ...formData, title: e.target.value }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent", placeholder: "Nh\u1EADp ti\u00EAu \u0111\u1EC1..." })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: ["M\u00F4 t\u1EA3 ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("textarea", { required: true, value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), rows: 3, className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent", placeholder: "Nh\u1EADp m\u00F4 t\u1EA3..." })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "N\u1ED9i dung chi ti\u1EBFt" }), _jsx("textarea", { value: formData.content, onChange: (e) => setFormData({ ...formData, content: e.target.value }), rows: 4, className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent md:rows-6", placeholder: "Nh\u1EADp n\u1ED9i dung chi ti\u1EBFt..." })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "Danh m\u1EE5c" }), _jsxs("select", { value: formData.category, onChange: (e) => setFormData({ ...formData, category: e.target.value }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent", children: [_jsx("option", { value: "Sale l\u1EDBn", children: "Sale l\u1EDBn" }), _jsx("option", { value: "Flash Sale", children: "Flash Sale" }), _jsx("option", { value: "Freeship", children: "Freeship" }), _jsx("option", { value: "Ho\u00E0n ti\u1EC1n", children: "Ho\u00E0n ti\u1EC1n" }), _jsx("option", { value: "\u0110\u1EB7c bi\u1EC7t", children: "\u0110\u1EB7c bi\u1EC7t" }), _jsx("option", { value: "T\u00E2n th\u1EE7", children: "T\u00E2n th\u1EE7" }), _jsx("option", { value: "Kh\u00E1c", children: "Kh\u00E1c" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "Tags (ph\u00E2n c\u00E1ch b\u1EDFi d\u1EA5u ph\u1EA9y)" }), _jsx("input", { type: "text", value: Array.isArray(formData.tags) ? formData.tags.join(', ') : '', onChange: (e) => {
                                                        const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                                                        setFormData({ ...formData, tags });
                                                    }, className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent", placeholder: "M\u1EDBi, Hot, Khuy\u1EBFn m\u00E3i..." })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "Ng\u00E0y b\u1EAFt \u0111\u1EA7u" }), _jsx("input", { type: "date", required: true, value: formData.startDate, onChange: (e) => setFormData({ ...formData, startDate: e.target.value }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "Ng\u00E0y k\u1EBFt th\u00FAc" }), _jsx("input", { type: "date", required: true, value: formData.endDate, onChange: (e) => setFormData({ ...formData, endDate: e.target.value }), className: "w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2", children: "H\u00ECnh \u1EA3nh" }), _jsx("input", { type: "file", accept: "image/*", onChange: handleImageChange, className: "w-full px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent" }), imagePreview && (_jsx("img", { src: imagePreview, alt: "Preview", className: "mt-3 md:mt-4 w-full h-32 md:h-48 object-cover rounded-lg md:rounded-xl" }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: formData.isActive, onChange: (e) => setFormData({ ...formData, isActive: e.target.checked }), className: "w-4 h-4 md:w-5 md:h-5 text-purple-600 rounded focus:ring-purple-500" }), _jsx("label", { className: "text-xs md:text-sm font-bold text-gray-700", children: "K\u00EDch ho\u1EA1t" })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-2 md:gap-4 justify-end pt-3 md:pt-4 border-t border-gray-200", children: [_jsx("button", { type: "button", onClick: () => setShowForm(false), className: "w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 text-gray-700 rounded-lg md:rounded-xl font-bold hover:bg-gray-50 transition-all duration-300", children: "H\u1EE7y" }), _jsx("button", { type: "submit", className: "w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 text-sm md:text-base bg-purple-600 hover:bg-purple-700 text-white rounded-lg md:rounded-xl font-bold transition-all duration-300 shadow-lg", children: editingPromotion ? 'Cập nhật' : 'Tạo mới' })] })] })] }) })), filteredAndSortedPromotions.length > 0 ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "hidden md:block bg-white rounded-lg md:rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden animate-fade-in-up", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-100 border-b-2 border-gray-200", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "Ti\u00EAu \u0111\u1EC1" }), _jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "Danh m\u1EE5c" }), _jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "Th\u1EDDi gian" }), _jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "L\u01B0\u1EE3t xem" }), _jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-center text-xs font-bold text-gray-700 uppercase", children: "Thao t\u00E1c" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: paginatedPromotions.map((promo) => (_jsxs("tr", { className: "hover:bg-gray-50 transition-colors", children: [_jsxs("td", { className: "px-4 md:px-6 py-3 md:py-4", children: [_jsx("div", { className: "font-bold text-sm md:text-base text-gray-900", children: promo.title }), _jsx("div", { className: "text-xs md:text-sm text-gray-500 line-clamp-1", children: promo.description })] }), _jsx("td", { className: "px-4 md:px-6 py-3 md:py-4", children: _jsx("span", { className: "px-2 md:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold", children: promo.category }) }), _jsxs("td", { className: "px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-600", children: [new Date(promo.startDate).toLocaleDateString('vi-VN'), " -", ' ', new Date(promo.endDate).toLocaleDateString('vi-VN')] }), _jsx("td", { className: "px-4 md:px-6 py-3 md:py-4", children: _jsxs("div", { className: "flex items-center gap-1 text-gray-600", children: [_jsx(Eye, { size: 14, className: "md:w-4 md:h-4" }), _jsx("span", { className: "text-xs md:text-sm font-bold", children: promo.views || 0 })] }) }), _jsx("td", { className: "px-4 md:px-6 py-3 md:py-4", children: _jsx("span", { className: getStatusBadgeClass(promo.isActive ?? true), children: promo.isActive ? 'Hoạt động' : 'Tạm khóa' }) }), _jsx("td", { className: "px-4 md:px-6 py-3 md:py-4", children: _jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsx("button", { onClick: () => handleEdit(promo), className: "p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors", title: "Ch\u1EC9nh s\u1EEDa", children: _jsx(Edit, { size: 16, className: "md:w-[18px] md:h-[18px]" }) }), _jsx("button", { onClick: () => promo._id && handleDeleteClick(promo._id), className: "p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors", title: "X\u00F3a", children: _jsx(Trash2, { size: 16, className: "md:w-[18px] md:h-[18px]" }) })] }) })] }, promo._id))) })] }) }) }), _jsx("div", { className: "md:hidden space-y-3 animate-fade-in-up", children: paginatedPromotions.map((promo) => (_jsxs("div", { className: "bg-white rounded-lg shadow-lg border-2 border-gray-100 p-4", children: [_jsx("div", { className: "flex items-start justify-between mb-3", children: _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "font-bold text-sm text-gray-900 mb-1 line-clamp-2", children: promo.title }), _jsx("p", { className: "text-xs text-gray-500 line-clamp-2", children: promo.description })] }) }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 mb-3", children: [_jsx("span", { className: "px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold", children: promo.category }), _jsx("span", { className: getStatusBadgeClass(promo.isActive ?? true), children: promo.isActive ? 'Hoạt động' : 'Tạm khóa' })] }), _jsxs("div", { className: "flex items-center justify-between text-xs text-gray-600 mb-3", children: [_jsxs("div", { children: [new Date(promo.startDate).toLocaleDateString('vi-VN'), " -", ' ', new Date(promo.endDate).toLocaleDateString('vi-VN')] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Eye, { size: 14 }), _jsx("span", { className: "font-bold", children: promo.views || 0 })] })] }), _jsxs("div", { className: "flex items-center justify-end gap-2 pt-3 border-t border-gray-200", children: [_jsxs("button", { onClick: () => handleEdit(promo), className: "px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-bold flex items-center gap-1", children: [_jsx(Edit, { size: 14 }), "S\u1EEDa"] }), _jsxs("button", { onClick: () => promo._id && handleDeleteClick(promo._id), className: "px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-bold flex items-center gap-1", children: [_jsx(Trash2, { size: 14 }), "X\u00F3a"] })] })] }, promo._id))) }), totalPages > 1 && (_jsx(Pagination, { currentPage: currentPage, totalPages: totalPages, onPageChange: setCurrentPage, itemsPerPage: itemsPerPage, totalItems: filteredAndSortedPromotions.length }))] })) : (_jsxs("div", { className: "text-center py-20 animate-fade-in-up", children: [_jsx(Megaphone, { size: 64, className: "mx-auto mb-4 text-gray-400" }), _jsx("p", { className: "text-gray-500 text-lg font-medium", children: searchTerm ? "Không tìm thấy tin tức khuyến mãi nào" : "Không có tin tức khuyến mãi nào" })] })), _jsx(ConfirmDialog, { open: deleteConfirm.open, onClose: () => setDeleteConfirm({ open: false, promotionId: null }), onConfirm: handleDelete, title: "X\u00E1c nh\u1EADn x\u00F3a tin t\u1EE9c khuy\u1EBFn m\u00E3i", message: "B\u1EA1n c\u00F3 ch\u1EAFc mu\u1ED1n x\u00F3a tin t\u1EE9c khuy\u1EBFn m\u00E3i n\u00E0y kh\u00F4ng?", type: "danger", confirmText: "X\u00F3a" })] }));
};
export default PromotionManagement;
