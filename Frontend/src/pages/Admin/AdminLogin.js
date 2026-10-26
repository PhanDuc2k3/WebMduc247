import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, ShieldCheck, Store, Package, ChartNoAxesCombined } from 'lucide-react';
import { identityApi } from '../../api/identityApi';
import { adminDestination, isPlatformAdmin } from './adminPolicy';
import './platform-admin.css';
export default function AdminLogin() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const destination = adminDestination(params.get('next'));
    const [email, setEmail] = useState(''), [password, setPassword] = useState('');
    const [visible, setVisible] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        identityApi.me().then(user => { if (active && isPlatformAdmin(user))
            navigate(destination, { replace: true }); }).catch(() => { });
        return () => { active = false; };
    }, [navigate, destination]);
    async function submit(event) {
        event.preventDefault();
        if (busy)
            return;
        setBusy(true);
        setError('');
        try {
            const user = await identityApi.adminLogin(email.trim(), password);
            if (!isPlatformAdmin(user))
                throw new Error('Tài khoản không có quyền quản trị sàn.');
            navigate(destination, { replace: true });
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Chưa thể đăng nhập. Vui lòng thử lại.');
        }
        finally {
            setBusy(false);
        }
    }
    return _jsxs("main", { className: "pa-login", children: [_jsxs("section", { className: "pa-login-story", children: [_jsxs(Link, { to: "/", className: "pa-brand", children: [_jsx("span", { className: "pa-brand-icon", children: _jsx(Store, { size: 22 }) }), _jsxs("strong", { children: ["MDUC247", _jsx("span", { children: "PLATFORM CONSOLE" })] })] }), _jsxs("div", { className: "pa-login-story-copy", children: [_jsx("span", { className: "pa-eyebrow", children: "D\u00C0NH CHO \u0110\u1ED8I NG\u0168 V\u1EACN H\u00C0NH" }), _jsxs("h1", { children: ["M\u1ED9t n\u01A1i \u0111\u1EC3 v\u1EADn h\u00E0nh", _jsx("br", {}), _jsx("em", { children: "to\u00E0n b\u1ED9 s\u00E0n." })] }), _jsx("p", { children: "K\u1EBFt n\u1ED1i d\u1EEF li\u1EC7u, theo d\u00F5i ho\u1EA1t \u0111\u1ED9ng v\u00E0 qu\u1EA3n l\u00FD tr\u1EA3i nghi\u1EC7m mua s\u1EAFm tr\u00EAn MDUC247." }), _jsxs("div", { className: "pa-login-illustration", "aria-hidden": "true", children: [_jsxs("div", { className: "pa-illustration-top", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {})] }), _jsxs("div", { className: "pa-illustration-body", children: [_jsxs("div", { className: "pa-illustration-nav", children: [_jsx("i", {}), _jsx("i", {}), _jsx("i", {}), _jsx("i", {})] }), _jsxs("div", { className: "pa-illustration-main", children: [_jsxs("div", { children: [_jsxs("span", { children: [_jsx(Store, { size: 20 }), "C\u1EEDa h\u00E0ng"] }), _jsxs("span", { children: [_jsx(Package, { size: 20 }), "S\u1EA3n ph\u1EA9m"] })] }), _jsxs("div", { className: "pa-illustration-chart", children: [_jsx(ChartNoAxesCombined, { size: 85, strokeWidth: 1 }), _jsx("span", { children: "To\u00E0n c\u1EA3nh ho\u1EA1t \u0111\u1ED9ng s\u00E0n" })] })] })] }), _jsxs("div", { className: "pa-security-tag", children: [_jsx(ShieldCheck, { size: 17 }), "Ph\u00E2n quy\u1EC1n theo t\u00E0i kho\u1EA3n"] })] })] }), _jsxs("p", { className: "pa-login-footer", children: ["\u00A9 ", new Date().getFullYear(), " MDUC247 \u00B7 Kh\u00F4ng gian qu\u1EA3n tr\u1ECB t\u1EADp trung"] })] }), _jsxs("section", { className: "pa-login-form-side", children: [_jsxs(Link, { to: "/", className: "pa-back", children: [_jsx(ArrowLeft, { size: 16 }), " V\u1EC1 trang mua s\u1EAFm"] }), _jsxs("div", { className: "pa-login-card", children: [_jsx("div", { className: "pa-login-lock", children: _jsx(LockKeyhole, { size: 25 }) }), _jsx("span", { className: "pa-eyebrow", children: "QU\u1EA2N TR\u1ECA S\u00C0N" }), _jsx("h2", { children: "Ch\u00E0o m\u1EEBng tr\u1EDF l\u1EA1i" }), _jsx("p", { children: "\u0110\u0103ng nh\u1EADp \u0111\u1EC3 truy c\u1EADp b\u1EA3ng \u0111i\u1EC1u h\u00E0nh MDUC247." }), _jsxs("form", { onSubmit: submit, children: [_jsxs("label", { htmlFor: "admin-email", children: ["Email qu\u1EA3n tr\u1ECB", _jsx("input", { id: "admin-email", type: "email", autoComplete: "username", placeholder: "Nh\u1EADp email c\u1EE7a b\u1EA1n", value: email, onChange: event => setEmail(event.target.value), required: true, maxLength: 254, disabled: busy })] }), _jsxs("label", { htmlFor: "admin-password", children: ["M\u1EADt kh\u1EA9u", _jsxs("span", { className: "pa-password", children: [_jsx("input", { id: "admin-password", type: visible ? 'text' : 'password', autoComplete: "current-password", placeholder: "Nh\u1EADp m\u1EADt kh\u1EA9u", value: password, onChange: event => setPassword(event.target.value), required: true, maxLength: 128, disabled: busy }), _jsx("button", { type: "button", onClick: () => setVisible(value => !value), "aria-label": visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu', children: visible ? _jsx(EyeOff, { size: 19 }) : _jsx(Eye, { size: 19 }) })] })] }), _jsx(Link, { to: "/forgot-password", className: "pa-forgot", children: "Qu\u00EAn m\u1EADt kh\u1EA9u?" }), error && _jsx("p", { className: "pa-error", role: "alert", children: error }), _jsxs("button", { className: "pa-button pa-login-submit", type: "submit", disabled: busy, children: [busy ? 'Đang đăng nhập…' : 'Đăng nhập quản trị', !busy && _jsx(ArrowRight, { size: 18 })] })] }), _jsxs("div", { className: "pa-login-note", children: [_jsx(Check, { size: 16 }), _jsx("p", { children: "Ch\u1EC9 t\u00E0i kho\u1EA3n \u0111\u00E3 \u0111\u01B0\u1EE3c c\u1EA5p quy\u1EC1n qu\u1EA3n tr\u1ECB s\u00E0n m\u1EDBi c\u00F3 th\u1EC3 truy c\u1EADp." })] })] }), _jsxs("div", { className: "pa-login-help", children: ["B\u1EA1n l\u00E0 kh\u00E1ch h\u00E0ng ho\u1EB7c ng\u01B0\u1EDDi b\u00E1n? ", _jsx(Link, { to: "/login", children: "\u0110\u0103ng nh\u1EADp mua s\u1EAFm" })] })] })] });
}
