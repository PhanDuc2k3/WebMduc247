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
  { path: '/admin/users', label: 'Người dùng', icon: Users },
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
    setBusy(true); setError('');
    let confirmed=false;
    try { await identityApi.logout(); confirmed=true; }
    catch { setError('Chưa thể đăng xuất. Vui lòng thử lại.'); }
    finally { setBusy(false);navigate(`/admin/login?logout=${confirmed?'1':'unconfirmed'}`,{replace:true}); }
  }
  return <div className="pa-app">
    {open && <button className="pa-mobile-backdrop" aria-label="Đóng menu" onClick={() => setOpen(false)} />}
    <aside className={`pa-sidebar ${open ? 'is-open' : ''}`} aria-label="Điều hướng quản trị">
      <Link to="/admin" className="pa-brand" onClick={() => setOpen(false)}><span className="pa-brand-icon"><Store size={22} /></span><strong>MDUC247<span>PLATFORM CONSOLE</span></strong></Link>
      <button className="pa-mobile-close" onClick={() => setOpen(false)} aria-label="Đóng menu"><X size={20} /></button>
      <div className="pa-workspace"><span><ShieldCheck size={18} /></span><div><strong>Quản trị sàn</strong><small>Không gian vận hành</small></div><span className="pa-workspace-dot" /></div>
      <span className="pa-nav-label">BẢNG ĐIỀU KHIỂN</span>
      <nav>{links.filter(link=>canVisitAdminPath(user,link.path)).map(({ path, label, icon: Icon }) => <NavLink key={path} to={path} end={path === '/admin'} onClick={() => setOpen(false)}
        className={({ isActive }) => `pa-nav-link ${isActive ? 'is-active' : ''}`}><Icon size={19} /><span>{label}</span></NavLink>)}</nav>
      <div className="pa-sidebar-bottom"><div className="pa-sidebar-guide"><ShieldCheck size={20} /><strong>Vận hành có kiểm soát</strong><p>Quyền quản trị được xác minh theo phiên đăng nhập.</p></div>
        <div className="pa-sidebar-user"><span className="pa-avatar">{user.fullName.trim().slice(0, 1).toUpperCase()}</span><div><strong>{user.fullName}</strong><small>Quản trị viên sàn</small></div>
          <button type="button" onClick={() => void logout()} disabled={busy} aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={18} /></button></div></div>
    </aside>
    <div className="pa-workarea"><header className="pa-topbar"><div><button className="pa-menu-button" onClick={() => setOpen(true)} aria-label="Mở menu quản trị"><Menu size={21} /></button>
      <span className="pa-breadcrumb">Quản trị sàn <ChevronRight size={14} /><strong>{title}</strong></span></div>
      <div className="pa-topbar-right"><span className="pa-admin-badge"><ShieldCheck size={14} />Platform Admin</span><Link to="/" target="_blank" rel="noreferrer">Xem cửa hàng <ArrowUpRight size={16} /></Link></div></header>
      <main className="pa-main"><AdminSessionGuard/>{error && <p role="alert" className="pa-error">{error}</p>}<Outlet /></main>
      <footer className="pa-app-footer"><span>MDUC247 Platform</span><span>Không gian dành cho quản trị viên</span></footer>
    </div>
  </div>;
}
