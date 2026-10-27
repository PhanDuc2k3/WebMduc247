import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, ShieldCheck, Store, Package, ChartNoAxesCombined } from 'lucide-react';
import { identityApi } from '../../api/identityApi';
import { adminSecurityApi } from '../../api/adminSecurityApi';
import AdminRecoveryCodes from './AdminRecoveryCodes';
import { adminDestination, isPlatformAdmin } from './adminPolicy';
import './platform-admin.css';
import './admin-security.css';
export default function AdminLogin() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const destination = adminDestination(params.get('next'));
    const [email, setEmail] = useState(''), [password, setPassword] = useState('');
    const [visible, setVisible] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const [challenge, setChallenge] = useState(null), [setup, setSetup] = useState(null);
    const [code, setCode] = useState(''), [recovery, setRecovery] = useState(false), [codes, setCodes] = useState([]), [notice, setNotice] = useState('');
    const [requestRecovery, setRequestRecovery] = useState(false), [evidenceReference, setEvidenceReference] = useState(''), [recoveryReason, setRecoveryReason] = useState('');
    useEffect(() => {
        let active = true;
        if (params.has('logout'))
            return;
        identityApi.me().then(user => { if (active && isPlatformAdmin(user))
            navigate(destination, { replace: true }); }).catch(() => { });
        return () => { active = false; };
    }, [navigate, destination, params]);
    async function submit(event) {
        event.preventDefault();
        if (busy)
            return;
        setBusy(true);
        setError('');
        try {
            const result = await identityApi.adminLogin(email.trim(), password);
            setPassword('');
            setChallenge(result);
            setCode('');
            if (result.enrollmentRequired)
                setSetup(await identityApi.adminEnrollStart(result.challengeToken));
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Chưa thể đăng nhập. Vui lòng thử lại.');
        }
        finally {
            setBusy(false);
        }
    }
    async function verify(event) {
        event.preventDefault();
        if (!challenge || busy)
            return;
        setBusy(true);
        setError('');
        try {
            if (challenge.enrollmentRequired) {
                const result = await identityApi.adminEnrollConfirm(challenge.challengeToken, code.trim());
                setSetup(null);
                setCode('');
                setCodes(result.recoveryCodes || []);
            }
            else {
                await identityApi.adminVerify(challenge.challengeToken, recovery ? { recoveryCode: code.trim() } : { code: code.trim() });
                navigate(destination, { replace: true });
            }
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Chưa xác minh được MFA.');
        }
        finally {
            setBusy(false);
        }
    }
    async function passkey() { if (!challenge || busy)
        return; setBusy(true); setError(''); try {
        await adminSecurityApi.passkeyLogin(challenge.challengeToken);
        navigate(destination, { replace: true });
    }
    catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Chưa xác minh được passkey.');
    }
    finally {
        setBusy(false);
    } }
    async function recover(event) { event.preventDefault(); if (!challenge || busy)
        return; setBusy(true); setError(''); try {
        const result = await identityApi.adminRecoveryRequest(challenge.challengeToken, evidenceReference.trim(), recoveryReason.trim());
        setNotice(result.message);
        setChallenge(null);
        setRequestRecovery(false);
        setCode('');
    }
    catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Chưa gửi được đề nghị.');
    }
    finally {
        setBusy(false);
    } }
    return _jsxs("main", { className: "pa-login", children: [_jsxs("section", { className: "pa-login-story", children: [_jsxs(Link, { to: "/", className: "pa-brand", children: [_jsx("span", { className: "pa-brand-icon", children: _jsx(Store, { size: 22 }) }), _jsxs("strong", { children: ["MDUC247", _jsx("span", { children: "PLATFORM CONSOLE" })] })] }), _jsxs("div", { className: "pa-login-story-copy", children: [_jsx("span", { className: "pa-eyebrow", children: "D\u00C0NH CHO \u0110\u1ED8I NG\u0168 V\u1EACN H\u00C0NH" }), _jsxs("h1", { children: ["M\u1ED9t n\u01A1i \u0111\u1EC3 v\u1EADn h\u00E0nh", _jsx("br", {}), _jsx("em", { children: "to\u00E0n b\u1ED9 s\u00E0n." })] }), _jsx("p", { children: "K\u1EBFt n\u1ED1i d\u1EEF li\u1EC7u, theo d\u00F5i ho\u1EA1t \u0111\u1ED9ng v\u00E0 qu\u1EA3n l\u00FD tr\u1EA3i nghi\u1EC7m mua s\u1EAFm tr\u00EAn MDUC247." }), _jsxs("div", { className: "pa-login-illustration", "aria-hidden": "true", children: [_jsxs("div", { className: "pa-illustration-top", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {})] }), _jsxs("div", { className: "pa-illustration-body", children: [_jsxs("div", { className: "pa-illustration-nav", children: [_jsx("i", {}), _jsx("i", {}), _jsx("i", {}), _jsx("i", {})] }), _jsxs("div", { className: "pa-illustration-main", children: [_jsxs("div", { children: [_jsxs("span", { children: [_jsx(Store, { size: 20 }), "C\u1EEDa h\u00E0ng"] }), _jsxs("span", { children: [_jsx(Package, { size: 20 }), "S\u1EA3n ph\u1EA9m"] })] }), _jsxs("div", { className: "pa-illustration-chart", children: [_jsx(ChartNoAxesCombined, { size: 85, strokeWidth: 1 }), _jsx("span", { children: "To\u00E0n c\u1EA3nh ho\u1EA1t \u0111\u1ED9ng s\u00E0n" })] })] })] }), _jsxs("div", { className: "pa-security-tag", children: [_jsx(ShieldCheck, { size: 17 }), "Ph\u00E2n quy\u1EC1n theo t\u00E0i kho\u1EA3n"] })] })] }), _jsxs("p", { className: "pa-login-footer", children: ["\u00A9 ", new Date().getFullYear(), " MDUC247 \u00B7 Kh\u00F4ng gian qu\u1EA3n tr\u1ECB t\u1EADp trung"] })] }), _jsxs("section", { className: "pa-login-form-side", children: [_jsxs(Link, { to: "/", className: "pa-back", children: [_jsx(ArrowLeft, { size: 16 }), " V\u1EC1 trang mua s\u1EAFm"] }), _jsxs("div", { className: "pa-login-card", children: [_jsx("div", { className: "pa-login-lock", children: _jsx(LockKeyhole, { size: 25 }) }), _jsx("span", { className: "pa-eyebrow", children: "QU\u1EA2N TR\u1ECA S\u00C0N" }), _jsx("h2", { children: "Ch\u00E0o m\u1EEBng tr\u1EDF l\u1EA1i" }), _jsx("p", { children: "\u0110\u0103ng nh\u1EADp \u0111\u1EC3 truy c\u1EADp b\u1EA3ng \u0111i\u1EC1u h\u00E0nh MDUC247." }), notice && _jsx("p", { role: "status", children: notice }), params.get('logout') === 'unconfirmed' && _jsx("p", { className: "pa-error", role: "alert", children: "\u0110\u00E3 x\u00F3a d\u1EEF li\u1EC7u \u0111\u0103ng nh\u1EADp tr\u00EAn tr\u00ECnh duy\u1EC7t. Ch\u01B0a k\u1EBFt n\u1ED1i \u0111\u01B0\u1EE3c \u0111\u1EC3 x\u00E1c nh\u1EADn thu h\u1ED3i phi\u00EAn tr\u00EAn m\u00E1y ch\u1EE7." }), codes.length > 0 ? _jsx(AdminRecoveryCodes, { codes: codes, onDone: () => { setCodes([]); setChallenge(null); identityApi.finishAdminLogin(); navigate(destination, { replace: true }); } }) : challenge ? _jsxs(_Fragment, { children: [_jsx("h3", { children: challenge.enrollmentRequired ? 'Đăng ký ứng dụng xác thực' : 'Xác thực bước hai' }), setup && _jsxs("div", { className: "pa-mfa-setup", children: [_jsx("p", { children: "Th\u00EAm t\u00E0i kho\u1EA3n trong \u1EE9ng d\u1EE5ng x\u00E1c th\u1EF1c b\u1EB1ng kh\u00F3a d\u01B0\u1EDBi \u0111\u00E2y (TOTP, 6 s\u1ED1, chu k\u1EF3 30 gi\u00E2y)." }), _jsx("code", { children: setup.secret }), _jsx("a", { href: setup.otpauthUri, children: "M\u1EDF b\u1EB1ng \u1EE9ng d\u1EE5ng x\u00E1c th\u1EF1c" }), _jsx("p", { children: "Nh\u1EADp m\u00E3 trong \u1EE9ng d\u1EE5ng \u0111\u1EC3 ho\u00E0n t\u1EA5t \u0111\u0103ng k\u00FD." })] }), requestRecovery ? _jsxs("form", { onSubmit: recover, children: [_jsx("p", { children: "Ng\u01B0\u1EDDi ph\u1EE5 tr\u00E1ch b\u1EA3o m\u1EADt s\u1EBD ki\u1EC3m tra b\u1EB1ng ch\u1EE9ng danh t\u00EDnh v\u00E0 duy\u1EC7t \u0111\u1ED9c l\u1EADp. Kh\u00F4ng g\u1EEDi secret ho\u1EB7c m\u00E3 kh\u00F4i ph\u1EE5c v\u00E0o h\u1ED3 s\u01A1." }), _jsxs("label", { children: ["M\u00E3 h\u1ED3 s\u01A1 x\u00E1c minh danh t\u00EDnh", _jsx("input", { required: true, minLength: 8, maxLength: 200, value: evidenceReference, onChange: event => setEvidenceReference(event.target.value) })] }), _jsxs("label", { children: ["L\u00FD do kh\u00F4i ph\u1EE5c", _jsx("textarea", { required: true, minLength: 10, maxLength: 500, value: recoveryReason, onChange: event => setRecoveryReason(event.target.value) })] }), error && _jsx("p", { role: "alert", className: "pa-error", children: error }), _jsx("button", { disabled: busy, className: "pa-button", children: "G\u1EEDi \u0111\u1EC1 ngh\u1ECB kh\u00F4i ph\u1EE5c MFA" })] }) : _jsxs("form", { onSubmit: verify, children: [_jsxs("label", { children: [recovery ? 'Mã khôi phục' : 'Mã từ ứng dụng xác thực', _jsx("input", { required: true, autoComplete: "one-time-code", inputMode: recovery ? 'text' : 'numeric', maxLength: recovery ? 24 : 6, value: code, onChange: event => setCode(event.target.value), disabled: busy })] }), error && _jsx("p", { className: "pa-error", role: "alert", children: error }), _jsx("button", { disabled: busy || (challenge.enrollmentRequired && !setup), className: "pa-button pa-login-submit", children: busy ? 'Đang xác minh…' : 'Xác minh MFA' }), !challenge.enrollmentRequired && _jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "pa-text-link", onClick: () => { setRecovery(v => !v); setCode(''); }, children: recovery ? 'Dùng mã TOTP' : 'Dùng mã khôi phục một lần' }), challenge.passkeysEnabled && _jsx("button", { type: "button", className: "pa-button pa-button-light", disabled: busy, onClick: () => void passkey(), children: "D\u00F9ng passkey \u0111\u00E3 \u0111\u0103ng k\u00FD" }), _jsx("button", { type: "button", className: "pa-text-link", onClick: () => setRequestRecovery(true), children: "M\u1EA5t \u1EE9ng d\u1EE5ng v\u00E0 m\u00E3 kh\u00F4i ph\u1EE5c" })] })] }), challenge.recoveryEnrollment && !requestRecovery && _jsx("button", { type: "button", className: "pa-text-link", onClick: () => setRequestRecovery(true), children: "G\u1EEDi l\u1EA1i \u0111\u1EC1 ngh\u1ECB kh\u00F4i ph\u1EE5c khi ph\u00EA duy\u1EC7t c\u0169 m\u1EA5t hi\u1EC7u l\u1EF1c" }), _jsx("button", { type: "button", className: "pa-text-link", disabled: busy, onClick: () => { setChallenge(null); setSetup(null); setCode(''); setRequestRecovery(false); setError(''); }, children: "\u0110\u0103ng nh\u1EADp l\u1EA1i t\u1EEB \u0111\u1EA7u" })] }) : _jsxs("form", { onSubmit: submit, children: [_jsxs("label", { htmlFor: "admin-email", children: ["Email qu\u1EA3n tr\u1ECB", _jsx("input", { id: "admin-email", type: "email", autoComplete: "username", placeholder: "Nh\u1EADp email c\u1EE7a b\u1EA1n", value: email, onChange: event => setEmail(event.target.value), required: true, maxLength: 254, disabled: busy })] }), _jsxs("label", { htmlFor: "admin-password", children: ["M\u1EADt kh\u1EA9u", _jsxs("span", { className: "pa-password", children: [_jsx("input", { id: "admin-password", type: visible ? 'text' : 'password', autoComplete: "current-password", placeholder: "Nh\u1EADp m\u1EADt kh\u1EA9u", value: password, onChange: event => setPassword(event.target.value), required: true, maxLength: 128, disabled: busy }), _jsx("button", { type: "button", onClick: () => setVisible(value => !value), "aria-label": visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu', children: visible ? _jsx(EyeOff, { size: 19 }) : _jsx(Eye, { size: 19 }) })] })] }), _jsx(Link, { to: "/forgot-password", className: "pa-forgot", children: "Qu\u00EAn m\u1EADt kh\u1EA9u?" }), error && _jsx("p", { className: "pa-error", role: "alert", children: error }), _jsxs("button", { className: "pa-button pa-login-submit", type: "submit", disabled: busy, children: [busy ? 'Đang đăng nhập…' : 'Đăng nhập quản trị', !busy && _jsx(ArrowRight, { size: 18 })] })] }), _jsxs("div", { className: "pa-login-note", children: [_jsx(Check, { size: 16 }), _jsx("p", { children: "Ch\u1EC9 phi\u00EAn \u0111\u00E3 ho\u00E0n t\u1EA5t MFA v\u00E0 c\u00F3 quy\u1EC1n qu\u1EA3n tr\u1ECB s\u00E0n m\u1EDBi c\u00F3 th\u1EC3 truy c\u1EADp." })] })] }), _jsxs("div", { className: "pa-login-help", children: ["B\u1EA1n l\u00E0 kh\u00E1ch h\u00E0ng ho\u1EB7c ng\u01B0\u1EDDi b\u00E1n? ", _jsx(Link, { to: "/login", children: "\u0110\u0103ng nh\u1EADp mua s\u1EAFm" })] })] })] });
}
