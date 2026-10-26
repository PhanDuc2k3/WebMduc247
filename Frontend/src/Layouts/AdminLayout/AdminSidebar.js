import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Store, ShoppingBag, Ticket, Megaphone, Image as ImageIcon, CheckCircle2, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import userApi from '../../api/userApi';
const AdminSidebar = ({ activeMenu, onMenuChange, onCollapseChange }) => {
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [desktopWidth, setDesktopWidth] = useState(256); // Width có thể thay đổi trên desktop
    const sidebarRef = React.useRef(null);
    const resizeHandleRef = React.useRef(null);
    const isResizing = React.useRef(false);
    // Kiểm tra mobile/desktop và set mặc định collapsed trên mobile
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768; // md breakpoint
            setIsMobile(mobile);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);
    // Trên mobile, mặc định collapsed (chỉ hiển thị icon)
    useEffect(() => {
        if (isMobile && !isCollapsed) {
            setIsCollapsed(true);
            if (onCollapseChange) {
                onCollapseChange(true);
            }
        }
    }, [isMobile, isCollapsed, onCollapseChange]);
    // Desktop: Handle resize sidebar bằng cách kéo - CHỈ hoạt động trên desktop
    useEffect(() => {
        // KHÔNG cho phép resize trên mobile - vô hiệu hóa hoàn toàn
        if (isMobile) {
            // Reset về width mặc định nếu đang ở mobile
            if (desktopWidth !== 256) {
                setDesktopWidth(256);
            }
            // Vô hiệu hóa resize handle
            if (resizeHandleRef.current) {
                resizeHandleRef.current.style.pointerEvents = 'none';
                resizeHandleRef.current.style.cursor = 'default';
            }
            return;
        }
        const handleMouseDown = (e) => {
            // Chỉ cho phép resize trên desktop
            if (isMobile)
                return;
            if (e.target === resizeHandleRef.current || resizeHandleRef.current?.contains(e.target)) {
                isResizing.current = true;
                e.preventDefault();
            }
        };
        const handleMouseMove = (e) => {
            // Chỉ cho phép resize trên desktop
            if (isMobile || !isResizing.current || isCollapsed)
                return;
            const newWidth = e.clientX;
            // Giới hạn width từ 200px đến 600px
            if (newWidth >= 200 && newWidth <= 600) {
                setDesktopWidth(newWidth);
            }
        };
        const handleMouseUp = () => {
            isResizing.current = false;
        };
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isMobile, isCollapsed, desktopWidth]);
    const handleToggleCollapse = () => {
        // Không cho phép toggle trên mobile
        if (isMobile)
            return;
        const newCollapsed = !isCollapsed;
        setIsCollapsed(newCollapsed);
        if (onCollapseChange) {
            onCollapseChange(newCollapsed);
        }
    };
    useEffect(() => {
        const fetchPendingCount = async () => {
            try {
                const res = await userApi.getAllSellerRequests();
                const requests = res.data?.requests || [];
                const pending = requests.filter((r) => r.sellerRequest?.status === 'pending');
                setPendingCount(pending.length);
            }
            catch (error) {
                console.error('Error fetching pending requests:', error);
            }
        };
        fetchPendingCount();
        // Refresh every 30 seconds
        const interval = setInterval(fetchPendingCount, 30000);
        return () => clearInterval(interval);
    }, []);
    const menuItems = [
        { label: 'Tổng quan', key: 'dashboard', icon: LayoutDashboard },
        { label: 'Người dùng', key: 'users', icon: Users },
        { label: 'Duyệt đơn bán', key: 'sellerRequest', icon: CheckCircle2, badge: pendingCount },
        { label: 'Banner', key: 'banner', icon: ImageIcon },
        { label: 'Cửa hàng', key: 'stores', icon: Store },
        { label: 'Đơn hàng', key: 'orders', icon: ShoppingBag },
        { label: 'Voucher', key: 'vouchers', icon: Ticket },
        { label: 'Tin tức Khuyến mãi', key: 'promotions', icon: Megaphone },
    ];
    // Desktop: dùng desktopWidth có thể thay đổi
    // Mobile: giữ width cố định (256px hoặc 80px khi collapsed)
    const currentWidth = isCollapsed
        ? 80
        : (isMobile ? 256 : desktopWidth);
    return (_jsx(_Fragment, { children: _jsxs("div", { ref: sidebarRef, className: `admin-sidebar bg-slate-700 min-h-screen ${isMobile ? 'transition-all duration-300' : '' // Desktop không transition khi resize
            } ${isCollapsed ? 'w-20' : 'w-64'} flex flex-col shadow-2xl fixed left-0 top-0 h-full z-50 overflow-x-auto`, style: {
                width: `${currentWidth}px`,
                minWidth: isCollapsed
                    ? '80px'
                    : (isMobile ? '256px' : '200px'),
                maxWidth: isMobile ? '256px' : '600px',
                // Vô hiệu hóa resize trên mobile
                resize: isMobile ? 'none' : 'none',
                userSelect: isMobile ? 'none' : 'auto'
            }, children: [!isMobile && !isCollapsed && (_jsx("div", { ref: resizeHandleRef, className: "absolute right-0 top-0 w-1 h-full bg-slate-600 hover:bg-slate-500 cursor-col-resize z-10 group", style: { cursor: 'col-resize', pointerEvents: isMobile ? 'none' : 'auto' }, children: _jsx("div", { className: "absolute right-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-slate-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" }) })), _jsx("div", { className: "p-6 border-b border-slate-600", children: _jsxs("div", { className: "flex items-center justify-between", children: [!isCollapsed && (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center shadow-lg", children: _jsx("span", { className: "text-white font-bold text-sm", children: "A" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-white", children: "Admin" }), _jsx("p", { className: "text-xs text-slate-300", children: "T\u1ED5ng quan" })] })] })), !isMobile && (_jsx("button", { onClick: handleToggleCollapse, className: "w-8 h-8 flex items-center justify-center bg-slate-600 hover:bg-slate-500 rounded-lg transition-all duration-300", children: isCollapsed ? (_jsx(ChevronRight, { className: "text-white w-4 h-4" })) : (_jsx(ChevronLeft, { className: "text-white w-4 h-4" })) }))] }) }), _jsxs("nav", { className: "flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden", children: [_jsxs("button", { onClick: () => navigate('/'), className: "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative hover:bg-slate-600 hover:scale-105 border border-slate-600", children: [_jsx(Home, { size: 20, className: "text-slate-300 group-hover:text-white group-hover:scale-110 transition-transform duration-300" }), !isCollapsed && (_jsx("span", { className: "font-bold transition-colors flex-1 text-left text-slate-200 group-hover:text-white", children: "Quay tr\u1EDF l\u1EA1i" }))] }), menuItems.map((item) => {
                            const Icon = item.icon;
                            return (_jsxs("button", { onClick: () => onMenuChange(item.key), className: `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${activeMenu === item.key
                                    ? 'bg-slate-600 shadow-lg scale-105'
                                    : 'hover:bg-slate-600 hover:scale-105'}`, children: [_jsx(Icon, { size: 20, className: `transition-transform duration-300 ${activeMenu === item.key ? 'text-white scale-110' : 'text-slate-300 group-hover:text-white group-hover:scale-110'}` }), !isCollapsed && (_jsxs(_Fragment, { children: [_jsx("span", { className: `font-bold transition-colors flex-1 text-left ${activeMenu === item.key ? 'text-white' : 'text-slate-200'}`, children: item.label }), item.badge !== undefined && item.badge > 0 && (_jsx("span", { className: "bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse min-w-[24px] text-center", children: item.badge }))] })), activeMenu === item.key && !isCollapsed && (_jsx("div", { className: "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" }))] }, item.key));
                        })] }), _jsx("div", { className: "p-4 border-t border-slate-600", children: !isCollapsed && (_jsxs("div", { className: "bg-slate-600 rounded-xl p-4", children: [_jsx("p", { className: "text-white text-sm font-bold mb-2", children: "Need Help?" }), _jsx("p", { className: "text-slate-300 text-xs", children: "Contact admin support" })] })) })] }) }));
};
export default AdminSidebar;
