import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
const AdminLayout = () => {
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(256);
    const [isMobile, setIsMobile] = useState(false);
    // Kiểm tra mobile/desktop
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    // Listen for sidebar width changes
    useEffect(() => {
        const handleResize = () => {
            const sidebar = document.querySelector('.admin-sidebar');
            if (sidebar) {
                const width = sidebar.offsetWidth;
                setSidebarWidth(width);
            }
        };
        const observer = new MutationObserver(handleResize);
        const sidebar = document.querySelector('.admin-sidebar');
        if (sidebar) {
            observer.observe(sidebar, {
                attributes: true,
                attributeFilter: ['style'],
                childList: false,
                subtree: false
            });
        }
        // Polling để catch width changes từ resize handle (desktop)
        const interval = setInterval(handleResize, 100);
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => {
            observer.disconnect();
            clearInterval(interval);
            window.removeEventListener('resize', handleResize);
        };
    }, [isSidebarCollapsed, isMobile]);
    return (_jsxs("div", { className: "flex h-screen overflow-hidden bg-slate-50", children: [_jsx(AdminSidebar, { activeMenu: activeMenu, onMenuChange: setActiveMenu, onCollapseChange: setIsSidebarCollapsed }), _jsx("div", { className: "admin-main-content flex-1 flex flex-col overflow-hidden transition-all duration-300", style: {
                    // Mobile: content luôn có margin cố định (256px hoặc 80px khi collapsed), không thay đổi khi sidebar expanded
                    // Desktop: content đẩy theo sidebar width
                    marginLeft: isMobile
                        ? (isSidebarCollapsed ? '80px' : '256px')
                        : `${sidebarWidth}px`,
                    width: isMobile
                        ? (isSidebarCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 256px)')
                        : `calc(100% - ${sidebarWidth}px)`,
                    minWidth: isMobile
                        ? (isSidebarCollapsed ? 'calc(100vw - 80px)' : 'calc(100vw - 256px)')
                        : `calc(100vw - ${sidebarWidth}px)`
                }, children: _jsx("main", { className: "flex-1 overflow-x-auto overflow-y-auto bg-slate-50 w-full", style: { minWidth: '100%' }, children: _jsx(Outlet, { context: { activeMenu } }) }) })] }));
};
export default AdminLayout;
