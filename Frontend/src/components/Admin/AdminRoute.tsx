import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { LoaderCircle, ShieldX } from 'lucide-react';
import { identityApi, IdentityApiError, type IdentityUser } from '../../api/identityApi';
import { isPlatformAdmin, canVisitAdminPath } from '../../pages/Admin/adminPolicy';
import { AdminSessionContext } from '../../pages/Admin/AdminSession';

export default function AdminRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<{ loading: boolean; user: IdentityUser | null; error: string }>({ loading: true, user: null, error: '' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const refresh = () => { setState({ loading: true, user: null, error: '' }); setVersion(value => value + 1); };
    window.addEventListener('identityUpdated', refresh);
    return () => window.removeEventListener('identityUpdated', refresh);
  }, []);
  useEffect(() => {
    let active = true;
    identityApi.me().then(user => { if (active) setState({ loading: false, user, error: '' }); }).catch(error => {
      if (active) setState({ loading: false, user: null, error: error instanceof IdentityApiError && error.status === 401 ? '' :
        error instanceof IdentityApiError && error.status === 429 ?
          `Có quá nhiều yêu cầu làm mới phiên. Vui lòng thử lại sau ${Math.ceil((error.retryAfterSeconds ?? 900) / 60)} phút hoặc đăng nhập lại.` :
          'Chưa thể xác minh phiên đăng nhập. Vui lòng kiểm tra kết nối và thử lại.' });
    });
    return () => { active = false; };
  }, [version]);
  if (state.loading) return <div className="pa-access"><LoaderCircle className="animate-spin" size={28} /><p>Đang xác minh quyền quản trị…</p></div>;
  if (state.error) return <div className="pa-access"><ShieldX size={38} /><h1>Chưa thể xác minh phiên</h1><p role="alert">{state.error}</p>
    <button className="pa-button" onClick={() => { setState(value => ({ ...value, loading: true })); setVersion(value => value + 1); }}>Thử lại</button>
    <Link to="/admin/login">Đăng nhập lại</Link></div>;
  if (!state.user) return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!isPlatformAdmin(state.user)) return <div className="pa-access"><ShieldX size={44} /><h1>Tài khoản chưa có quyền quản trị</h1>
    <p>Bạn đang đăng nhập bằng {state.user.email}. Khu vực này dành cho quản trị viên sàn MDUC247.</p>
    <Link className="pa-button" to="/admin/login">Dùng tài khoản quản trị</Link><Link to="/">Về cửa hàng</Link></div>;
  if(!canVisitAdminPath(state.user,location.pathname))return <div className="pa-access"><ShieldX size={38}/><h1>Bạn chưa có quyền mở mục này</h1><Link to="/admin">Về trang quản trị</Link></div>;
  return <AdminSessionContext.Provider value={state.user}>{children}</AdminSessionContext.Provider>;
}
