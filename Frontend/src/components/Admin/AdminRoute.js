import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { LoaderCircle, ShieldX } from 'lucide-react';
import { identityApi, IdentityApiError } from '../../api/identityApi';
import { isPlatformAdmin } from '../../pages/Admin/adminPolicy';
import { AdminSessionContext } from '../../pages/Admin/AdminSession';
export default function AdminRoute({ children }) {
    const location = useLocation();
    const [state, setState] = useState({ loading: true, user: null, error: '' });
    const [version, setVersion] = useState(0);
    useEffect(() => {
        const refresh = () => { setState({ loading: true, user: null, error: '' }); setVersion(value => value + 1); };
        window.addEventListener('identityUpdated', refresh);
        return () => window.removeEventListener('identityUpdated', refresh);
    }, []);
    useEffect(() => {
        let active = true;
        identityApi.me().then(user => { if (active)
            setState({ loading: false, user, error: '' }); }).catch(error => {
            if (active)
                setState({ loading: false, user: null, error: error instanceof IdentityApiError && error.status === 401 ? '' :
                        error instanceof IdentityApiError && error.status === 429 ?
                            `Có quá nhiều yêu cầu làm mới phiên. Vui lòng thử lại sau ${Math.ceil((error.retryAfterSeconds ?? 900) / 60)} phút hoặc đăng nhập lại.` :
                            'Chưa thể xác minh phiên đăng nhập. Vui lòng kiểm tra kết nối và thử lại.' });
        });
        return () => { active = false; };
    }, [version]);
    if (state.loading)
        return _jsxs("div", { className: "pa-access", children: [_jsx(LoaderCircle, { className: "animate-spin", size: 28 }), _jsx("p", { children: "\u0110ang x\u00E1c minh quy\u1EC1n qu\u1EA3n tr\u1ECB\u2026" })] });
    if (state.error)
        return _jsxs("div", { className: "pa-access", children: [_jsx(ShieldX, { size: 38 }), _jsx("h1", { children: "Ch\u01B0a th\u1EC3 x\u00E1c minh phi\u00EAn" }), _jsx("p", { role: "alert", children: state.error }), _jsx("button", { className: "pa-button", onClick: () => { setState(value => ({ ...value, loading: true })); setVersion(value => value + 1); }, children: "Th\u1EED l\u1EA1i" }), _jsx(Link, { to: "/admin/login", children: "\u0110\u0103ng nh\u1EADp l\u1EA1i" })] });
    if (!state.user)
        return _jsx(Navigate, { to: `/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`, replace: true });
    if (!isPlatformAdmin(state.user))
        return _jsxs("div", { className: "pa-access", children: [_jsx(ShieldX, { size: 44 }), _jsx("h1", { children: "T\u00E0i kho\u1EA3n ch\u01B0a c\u00F3 quy\u1EC1n qu\u1EA3n tr\u1ECB" }), _jsxs("p", { children: ["B\u1EA1n \u0111ang \u0111\u0103ng nh\u1EADp b\u1EB1ng ", state.user.email, ". Khu v\u1EF1c n\u00E0y d\u00E0nh cho qu\u1EA3n tr\u1ECB vi\u00EAn s\u00E0n MDUC247."] }), _jsx(Link, { className: "pa-button", to: "/admin/login", children: "D\u00F9ng t\u00E0i kho\u1EA3n qu\u1EA3n tr\u1ECB" }), _jsx(Link, { to: "/", children: "V\u1EC1 c\u1EEDa h\u00E0ng" })] });
    return _jsx(AdminSessionContext.Provider, { value: state.user, children: children });
}
