import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { identityApi } from "../../api/identityApi";
function Card({ title, children }) {
    return _jsx("main", { className: "min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 flex items-center justify-center p-4", children: _jsxs("section", { className: "w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-7 space-y-6", children: [_jsxs("div", { className: "text-center", children: [_jsx(Link, { to: "/", className: "font-extrabold text-2xl text-slate-700", children: "MDUC247" }), _jsx("h1", { className: "text-xl font-bold mt-4", children: title })] }), children] }) });
}
function Field({ label, value, onChange, type = "text", minLength }) {
    return _jsxs("label", { className: "block text-sm font-medium text-slate-700", children: [label, _jsx("input", { className: "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500", type: type, value: value, onChange: event => onChange(event.target.value), minLength: minLength, required: true })] });
}
function Submit({ busy, children }) {
    return _jsx("button", { type: "submit", disabled: busy, className: "w-full rounded-lg bg-slate-700 py-2.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-50", children: busy ? "Đang xử lý..." : children });
}
function useRequest() {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    async function run(action) {
        setBusy(true);
        setError("");
        setMessage("");
        try {
            await action();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Không thể xử lý yêu cầu.");
        }
        finally {
            setBusy(false);
        }
    }
    return { busy, error, message, setMessage, run };
}
function Feedback({ error, message }) {
    return _jsxs(_Fragment, { children: [error && _jsx("p", { role: "alert", className: "text-sm text-red-700", children: error }), message && _jsx("p", { role: "status", className: "text-sm text-green-700", children: message })] });
}
export function LoginV2() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { busy, error, message, run } = useRequest();
    function submit(event) { event.preventDefault(); void run(async () => { await identityApi.login(email, password); navigate("/"); }); }
    return _jsxs(Card, { title: "\u0110\u0103ng nh\u1EADp", children: [_jsxs("form", { onSubmit: submit, className: "space-y-4", children: [_jsx(Field, { label: "Email", type: "email", value: email, onChange: setEmail }), _jsx(Field, { label: "M\u1EADt kh\u1EA9u", type: "password", value: password, onChange: setPassword }), new URLSearchParams(window.location.search).has("registered") && _jsx("p", { role: "status", className: "text-sm text-green-700", children: "T\u00E0i kho\u1EA3n \u0111\u00E3 \u0111\u01B0\u1EE3c t\u1EA1o. B\u1EA1n c\u00F3 th\u1EC3 \u0111\u0103ng nh\u1EADp." }), _jsx(Feedback, { error: error, message: message }), _jsx(Submit, { busy: busy, children: "\u0110\u0103ng nh\u1EADp" })] }), _jsxs("div", { className: "flex justify-between text-sm text-slate-700", children: [_jsx(Link, { to: "/forgot-password", className: "underline", children: "Qu\u00EAn m\u1EADt kh\u1EA9u?" }), _jsx(Link, { to: "/register", className: "underline", children: "T\u1EA1o t\u00E0i kho\u1EA3n" })] }), _jsx(Link, { to: `/verify-email?email=${encodeURIComponent(email.trim())}`, className: "block text-center text-sm text-slate-700 underline", children: "Ch\u01B0a x\u00E1c minh email? G\u1EEDi l\u1EA1i li\u00EAn k\u1EBFt" }), _jsx(Link, { to: "/admin/login", className: "block border-t pt-4 text-center text-xs text-slate-500", children: "\u0110\u0103ng nh\u1EADp qu\u1EA3n tr\u1ECB s\u00E0n \u2192" })] });
}
export function RegisterV2() {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const { busy, error, message, run } = useRequest();
    function submit(event) {
        event.preventDefault();
        void run(async () => {
            const registration = await identityApi.register({ fullName, email, password, confirmPassword });
            if (registration.requiresEmailVerification) {
                navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`);
                return;
            }
            try {
                await identityApi.login(email, password);
                navigate("/");
            }
            catch {
                navigate("/login?registered=1");
            }
        });
    }
    return _jsxs(Card, { title: "T\u1EA1o t\u00E0i kho\u1EA3n", children: [_jsxs("form", { onSubmit: submit, className: "space-y-4", children: [_jsx(Field, { label: "H\u1ECD t\u00EAn", value: fullName, onChange: setFullName }), _jsx(Field, { label: "Email", type: "email", value: email, onChange: setEmail }), _jsx(Field, { label: "M\u1EADt kh\u1EA9u (\u00EDt nh\u1EA5t 8 k\u00FD t\u1EF1, c\u00F3 ch\u1EEF th\u01B0\u1EDDng v\u00E0 k\u00FD t\u1EF1 \u0111\u1EB7c bi\u1EC7t)", type: "password", minLength: 8, value: password, onChange: setPassword }), _jsx(Field, { label: "X\u00E1c nh\u1EADn m\u1EADt kh\u1EA9u", type: "password", minLength: 8, value: confirmPassword, onChange: setConfirmPassword }), _jsx(Feedback, { error: error, message: message }), _jsx(Submit, { busy: busy, children: "\u0110\u0103ng k\u00FD" })] }), _jsxs("p", { className: "text-center text-sm", children: ["\u0110\u00E3 c\u00F3 t\u00E0i kho\u1EA3n? ", _jsx(Link, { to: "/login", className: "underline", children: "\u0110\u0103ng nh\u1EADp" })] })] });
}
function useEmailLink() {
    const [email] = useState(() => new URLSearchParams(window.location.search).get("email") || "");
    const [linkToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
    useEffect(() => { if (window.location.hash)
        window.history.replaceState(null, "", window.location.pathname + window.location.search); }, []);
    return { email, linkToken };
}
export function VerifyEmailV2() {
    const { email, linkToken } = useEmailLink();
    const { busy, error, message, setMessage, run } = useRequest();
    function verify(event) { event.preventDefault(); void run(async () => { await identityApi.verifyEmail(email, linkToken); setMessage("Email đã được xác minh. Bạn có thể đăng nhập."); }); }
    function resend() { void run(async () => { const result = await identityApi.resendVerification(email); setMessage(result.message); }); }
    return _jsxs(Card, { title: "X\u00E1c minh email", children: [_jsxs("p", { className: "text-sm text-slate-600", children: ["Ch\u00FAng t\u00F4i \u0111\u00E3 g\u1EEDi li\u00EAn k\u1EBFt x\u00E1c minh \u0111\u1EBFn ", _jsx("strong", { children: email }), ". Li\u00EAn k\u1EBFt c\u00F3 hi\u1EC7u l\u1EF1c 15 ph\u00FAt."] }), linkToken && _jsx("form", { onSubmit: verify, children: _jsx(Submit, { busy: busy, children: "X\u00E1c minh email" }) }), _jsx(Feedback, { error: error, message: message }), _jsx("button", { type: "button", onClick: resend, disabled: busy || !email, className: "w-full rounded-lg border border-slate-500 py-2 text-slate-700 disabled:opacity-50", children: "G\u1EEDi l\u1EA1i li\u00EAn k\u1EBFt" }), _jsx(Link, { to: "/login", className: "block text-center text-sm underline", children: "\u0110\u1EBFn trang \u0111\u0103ng nh\u1EADp" })] });
}
export function ForgotPasswordV2() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const { busy, error, message, run } = useRequest();
    function submit(event) {
        event.preventDefault();
        void run(async () => {
            await identityApi.forgotPassword(email);
            navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`);
        });
    }
    return _jsxs(Card, { title: "Qu\u00EAn m\u1EADt kh\u1EA9u", children: [_jsxs("form", { onSubmit: submit, className: "space-y-4", children: [_jsx(Field, { label: "Email", type: "email", value: email, onChange: setEmail }), _jsx(Feedback, { error: error, message: message }), _jsx(Submit, { busy: busy, children: "G\u1EEDi m\u00E3 OTP" })] }), _jsx(Link, { to: "/login", className: "block text-center text-sm underline", children: "Quay l\u1EA1i \u0111\u0103ng nh\u1EADp" })] });
}
export function ResetPasswordV2() {
    const [email, setEmail] = useState(() => new URLSearchParams(window.location.search).get("email") || "");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [completed, setCompleted] = useState(false);
    const { busy, error, message, setMessage, run } = useRequest();
    function submit(event) {
        event.preventDefault();
        void run(async () => {
            const result = await identityApi.resetPassword(email, code, password, confirmPassword);
            setMessage(result.message);
            setCode("");
            setPassword("");
            setConfirmPassword("");
            setCompleted(true);
        });
    }
    function resend() { void run(async () => { const result = await identityApi.forgotPassword(email); setMessage(result.message); }); }
    return _jsxs(Card, { title: "\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u", children: [_jsx("p", { className: "text-sm text-slate-600", children: "N\u1EBFu email t\u1ED3n t\u1EA1i, m\u00E3 OTP 6 ch\u1EEF s\u1ED1 \u0111\u00E3 \u0111\u01B0\u1EE3c g\u1EEDi t\u1EEB no-reply@mduc247.site. M\u00E3 c\u00F3 hi\u1EC7u l\u1EF1c 10 ph\u00FAt." }), !completed && _jsxs("form", { onSubmit: submit, className: "space-y-4", children: [_jsx(Field, { label: "Email", type: "email", value: email, onChange: setEmail }), _jsxs("label", { className: "block text-sm font-medium text-slate-700", children: ["M\u00E3 OTP", _jsx("input", { className: "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500", type: "text", inputMode: "numeric", autoComplete: "one-time-code", pattern: "[0-9]{6}", maxLength: 6, value: code, onChange: event => setCode(event.target.value), required: true })] }), _jsx(Field, { label: "M\u1EADt kh\u1EA9u m\u1EDBi (\u00EDt nh\u1EA5t 8 k\u00FD t\u1EF1, c\u00F3 ch\u1EEF th\u01B0\u1EDDng v\u00E0 k\u00FD t\u1EF1 \u0111\u1EB7c bi\u1EC7t)", type: "password", minLength: 8, value: password, onChange: setPassword }), _jsx(Field, { label: "X\u00E1c nh\u1EADn m\u1EADt kh\u1EA9u m\u1EDBi", type: "password", minLength: 8, value: confirmPassword, onChange: setConfirmPassword }), _jsx(Submit, { busy: busy, children: "\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u" })] }), _jsx(Feedback, { error: error, message: message }), !completed && _jsx("button", { type: "button", onClick: resend, disabled: busy || !email, className: "w-full rounded-lg border border-slate-500 py-2 text-slate-700 disabled:opacity-50", children: "G\u1EEDi l\u1EA1i m\u00E3 OTP" }), _jsx(Link, { to: "/login", className: "block text-center text-sm underline", children: "\u0110\u1EBFn trang \u0111\u0103ng nh\u1EADp" })] });
}
