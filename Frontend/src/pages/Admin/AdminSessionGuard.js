import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { identityApi } from '../../api/identityApi';
import { adminSecurityApi } from '../../api/adminSecurityApi';
import { useAdminSession } from './AdminSession';
import { AdminDialog } from './AdminUi';
import './admin-security.css';
export default function AdminSessionGuard() {
    const user = useAdminSession(), navigate = useNavigate();
    const [session, setSession] = useState(identityApi.getAdminSession() || user.adminSession || null), [remaining, setRemaining] = useState(Infinity);
    const [reauth, setReauth] = useState(false), [password, setPassword] = useState(''), [code, setCode] = useState(''), [recovery, setRecovery] = useState(false);
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [passkey, setPasskey] = useState(false);
    useEffect(() => {
        let alive = true, expiring = false, lastAction = 0, lastPing = 0;
        const changed = () => setSession(identityApi.getAdminSession());
        const cleared = () => navigate('/admin/login?expired=1', { replace: true });
        const prompt = () => { setReauth(true); setPassword(''); setCode(''); setError(''); };
        const activity = () => { lastAction = Date.now(); };
        const tick = setInterval(() => {
            const current = identityApi.getAdminSession();
            if (!current)
                return;
            const seconds = Math.ceil((Math.min(Date.parse(current.expiresAt), Date.parse(current.idleExpiresAt)) - Date.now()) / 1000);
            setRemaining(seconds);
            if (seconds <= 0 && !expiring) {
                expiring = true;
                void identityApi.logout().catch(() => { }).finally(() => { if (alive)
                    cleared(); });
            }
            if (!expiring && lastAction > lastPing && Date.now() - lastPing > 45000) {
                lastPing = Date.now();
                void adminSecurityApi.activity().catch(() => { });
            }
        }, 1000);
        window.addEventListener('adminSessionUpdated', changed);
        window.addEventListener('adminSessionCleared', cleared);
        window.addEventListener('adminReauthRequired', prompt);
        for (const event of ['pointerdown', 'keydown', 'scroll', 'focus'])
            window.addEventListener(event, activity, { passive: true });
        return () => { alive = false; clearInterval(tick); window.removeEventListener('adminSessionUpdated', changed); window.removeEventListener('adminSessionCleared', cleared); window.removeEventListener('adminReauthRequired', prompt); for (const event of ['pointerdown', 'keydown', 'scroll', 'focus'])
            window.removeEventListener(event, activity); };
    }, [navigate]);
    useEffect(() => { let active = true; if (reauth)
        adminSecurityApi.security().then(value => { if (active)
            setPasskey(value.passkeysEnabled && value.passkeys.length > 0); }).catch(() => { }); return () => { active = false; }; }, [reauth]);
    async function confirm(event, withPasskey = false) { event.preventDefault(); if (busy)
        return; setBusy(true); setError(''); try {
        if (withPasskey)
            await adminSecurityApi.passkeyReauth(password);
        else
            await adminSecurityApi.reauth(password, code.trim(), recovery);
        setPassword('');
        setCode('');
        setReauth(false);
    }
    catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Chưa xác thực lại được.');
    }
    finally {
        setBusy(false);
    } }
    return _jsxs(_Fragment, { children: [session && remaining > 0 && remaining <= 60 && _jsxs("div", { role: "alert", className: "pa-session-warning", children: ["Phi\u00EAn qu\u1EA3n tr\u1ECB s\u1EBD h\u1EBFt h\u1EA1n sau ", remaining, " gi\u00E2y. ", _jsx("button", { className: "pa-text-link", onClick: () => void adminSecurityApi.activity().catch(() => { }), children: "Ti\u1EBFp t\u1EE5c phi\u00EAn" }), _jsxs("span", { children: [" Gi\u1EDBi h\u1EA1n t\u1ED1i \u0111a: ", new Date(session.expiresAt).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Bangkok' }), "."] })] }), reauth && _jsx(AdminDialog, { title: "X\u00E1c th\u1EF1c l\u1EA1i", close: () => { if (!busy) {
                    setReauth(false);
                    setPassword('');
                    setCode('');
                } }, busy: busy, children: _jsxs("form", { className: "pa-detail pa-case-form", onSubmit: confirm, children: [_jsx("p", { className: "pa-case-wide", children: "Nh\u1EADp m\u1EADt kh\u1EA9u v\u00E0 y\u1EBFu t\u1ED1 th\u1EE9 hai \u0111\u1EC3 ti\u1EBFp t\u1EE5c. Sau khi x\u00E1c minh, h\u00E3y ki\u1EC3m tra d\u1EEF li\u1EC7u r\u1ED3i t\u1EF1 g\u1EEDi l\u1EA1i thao t\u00E1c; h\u1EC7 th\u1ED1ng kh\u00F4ng g\u1EEDi thay b\u1EA1n." }), _jsxs("label", { className: "pa-case-wide", children: ["M\u1EADt kh\u1EA9u", _jsx("input", { required: true, type: "password", autoComplete: "current-password", maxLength: 128, value: password, onChange: event => setPassword(event.target.value) })] }), _jsxs("label", { className: "pa-case-wide", children: [recovery ? 'Mã khôi phục dùng một lần' : 'Mã từ ứng dụng xác thực', _jsx("input", { required: true, autoComplete: "one-time-code", maxLength: recovery ? 24 : 6, value: code, onChange: event => setCode(event.target.value) })] }), _jsxs("label", { className: "pa-case-wide", children: [_jsx("input", { type: "checkbox", checked: recovery, onChange: event => { setRecovery(event.target.checked); setCode(''); } }), " D\u00F9ng m\u00E3 kh\u00F4i ph\u1EE5c"] }), error && _jsx("p", { role: "alert", className: "pa-error pa-case-wide", children: error }), _jsx("button", { className: "pa-button", disabled: busy, children: "X\u00E1c minh" }), passkey && _jsx("button", { className: "pa-button pa-button-light", type: "button", disabled: busy || !password, onClick: event => void confirm(event, true), children: "D\u00F9ng passkey" })] }) })] });
}
