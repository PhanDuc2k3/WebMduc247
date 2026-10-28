import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, LayoutDashboard, LogOut, Menu, Package, PanelsTopLeft, ScrollText, ShieldCheck, ShoppingBag, Store, Undo2, Users, X } from 'lucide-react';
import { identityApi } from '../../api/identityApi';
import { useAdminSession } from './AdminSession';
import { canVisitAdminPath } from './adminPolicy';
import AdminSessionGuard from './AdminSessionGuard';
import './platform-admin.css';
const links = [
    { path: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
    { path: '/admin/work-queue', label: 'Hàng chờ công việc', icon: ScrollText },
    { path: '/admin/finance', label: 'Giao dịch thành công', icon: ShoppingBag },
    { path: '/admin/users', label: 'Người dùng', icon: Users },
    { path: '/admin/user-workflows', label: 'Kháng nghị & dữ liệu', icon: ShieldCheck },
    { path: '/admin/stores', label: 'Cửa hàng', icon: Store },
    { path: '/admin/products', label: 'Sản phẩm', icon: Package },
    { path: '/admin/orders', label: 'Đơn hàng', icon: ShoppingBag },
    { path: '/admin/returns', label: 'Trả hàng', icon: Undo2 },
    { path: '/admin/cases', label: 'Ticket & khiếu nại', icon: ScrollText },
    { path: '/admin/return-exceptions', label: 'Ngoại lệ trả hàng', icon: ShieldCheck },
    { path: '/admin/case-reports', label: 'Báo cáo hậu mãi', icon: ScrollText },
    { path: '/admin/storefront', label: 'Giao diện trang chủ', icon: PanelsTopLeft },
    { path: '/admin/audit', label: 'Nhật ký quản trị', icon: ScrollText },
    { path: '/admin/staff-access', label: 'Nhân sự & quyền', icon: Users },
    { path: '/admin/approvals', label: 'Yêu cầu phê duyệt', icon: ShieldCheck },
    { path: '/admin/security', label: 'Bảo mật & phiên', icon: ShieldCheck },
];
export default function PlatformAdminShell() {
    const user = useAdminSession(), location = useLocation(), navigate = useNavigate();
    const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const title = links.find(link => link.path === location.pathname)?.label || 'Tổng quan';
    async function logout() {
        setBusy(true);
        setError('');
        let confirmed = false;
        try {
            await identityApi.logout();
            confirmed = true;
        }
        catch {
            setError('Chưa thể đăng xuất. Vui lòng thử lại.');
        }
        finally {
            setBusy(false);
            navigate(`/admin/login?logout=${confirmed ? '1' : 'unconfirmed'}`, { replace: true });
        }
    }
    return _jsxs("div", { className: "pa-app", children: [open && _jsx("button", { className: "pa-mobile-backdrop", "aria-label": "\u0110\u00F3ng menu", onClick: () => setOpen(false) }), _jsxs("aside", { className: `pa-sidebar ${open ? 'is-open' : ''}`, "aria-label": "\u0110i\u1EC1u h\u01B0\u1EDBng qu\u1EA3n tr\u1ECB", children: [_jsxs(Link, { to: "/admin", className: "pa-brand", onClick: () => setOpen(false), children: [_jsx("span", { className: "pa-brand-icon", children: _jsx(Store, { size: 22 }) }), _jsxs("strong", { children: ["MDUC247", _jsx("span", { children: "PLATFORM CONSOLE" })] })] }), _jsx("button", { className: "pa-mobile-close", onClick: () => setOpen(false), "aria-label": "\u0110\u00F3ng menu", children: _jsx(X, { size: 20 }) }), _jsxs("div", { className: "pa-workspace", children: [_jsx("span", { children: _jsx(ShieldCheck, { size: 18 }) }), _jsxs("div", { children: [_jsx("strong", { children: "Qu\u1EA3n tr\u1ECB s\u00E0n" }), _jsx("small", { children: "Kh\u00F4ng gian v\u1EADn h\u00E0nh" })] }), _jsx("span", { className: "pa-workspace-dot" })] }), _jsx("span", { className: "pa-nav-label", children: "B\u1EA2NG \u0110I\u1EC0U KHI\u1EC2N" }), _jsx("nav", { children: links.filter(link => canVisitAdminPath(user, link.path)).map(({ path, label, icon: Icon }) => _jsxs(NavLink, { to: path, end: path === '/admin', onClick: () => setOpen(false), className: ({ isActive }) => `pa-nav-link ${isActive ? 'is-active' : ''}`, children: [_jsx(Icon, { size: 19 }), _jsx("span", { children: label })] }, path)) }), _jsxs("div", { className: "pa-sidebar-bottom", children: [_jsxs("div", { className: "pa-sidebar-guide", children: [_jsx(ShieldCheck, { size: 20 }), _jsx("strong", { children: "V\u1EADn h\u00E0nh c\u00F3 ki\u1EC3m so\u00E1t" }), _jsx("p", { children: "Quy\u1EC1n qu\u1EA3n tr\u1ECB \u0111\u01B0\u1EE3c x\u00E1c minh theo phi\u00EAn \u0111\u0103ng nh\u1EADp." })] }), _jsxs("div", { className: "pa-sidebar-user", children: [_jsx("span", { className: "pa-avatar", children: user.fullName.trim().slice(0, 1).toUpperCase() }), _jsxs("div", { children: [_jsx("strong", { children: user.fullName }), _jsx("small", { children: "Qu\u1EA3n tr\u1ECB vi\u00EAn s\u00E0n" })] }), _jsx("button", { type: "button", onClick: () => void logout(), disabled: busy, "aria-label": "\u0110\u0103ng xu\u1EA5t", title: "\u0110\u0103ng xu\u1EA5t", children: _jsx(LogOut, { size: 18 }) })] })] })] }), _jsxs("div", { className: "pa-workarea", children: [_jsxs("header", { className: "pa-topbar", children: [_jsxs("div", { children: [_jsx("button", { className: "pa-menu-button", onClick: () => setOpen(true), "aria-label": "M\u1EDF menu qu\u1EA3n tr\u1ECB", children: _jsx(Menu, { size: 21 }) }), _jsxs("span", { className: "pa-breadcrumb", children: ["Qu\u1EA3n tr\u1ECB s\u00E0n ", _jsx(ChevronRight, { size: 14 }), _jsx("strong", { children: title })] })] }), _jsxs("div", { className: "pa-topbar-right", children: [_jsxs("span", { className: "pa-admin-badge", children: [_jsx(ShieldCheck, { size: 14 }), "Platform Admin"] }), _jsxs(Link, { to: "/", target: "_blank", rel: "noreferrer", children: ["Xem c\u1EEDa h\u00E0ng ", _jsx(ArrowUpRight, { size: 16 })] })] })] }), _jsxs("main", { className: "pa-main", children: [_jsx(AdminSessionGuard, {}), error && _jsx("p", { role: "alert", className: "pa-error", children: error }), _jsx(Outlet, {})] }), _jsxs("footer", { className: "pa-app-footer", children: [_jsx("span", { children: "MDUC247 Platform" }), _jsx("span", { children: "Kh\u00F4ng gian d\u00E0nh cho qu\u1EA3n tr\u1ECB vi\u00EAn" })] })] })] });
}
