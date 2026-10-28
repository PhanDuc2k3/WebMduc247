import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { accountSupportApi } from '../../api/userAdminApi';
import { adminRequestId } from '../../api/adminCommand';
import { userWorkflowKinds, userWorkflowStatuses, downloadUserData } from '../Admin/UserWorkflows';
import { date } from '../Admin/AdminUi';
import '../Admin/user-admin.css';
export default function AccountHelp() {
    const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [challenge, setChallenge] = useState(''), [code, setCode] = useState(''), [token, setToken] = useState(''), [expires, setExpires] = useState('');
    const [kind, setKind] = useState('ACCESS'), [summary, setSummary] = useState(''), [name, setName] = useState(''), [state, setState] = useState(null), [revision, setRevision] = useState(0);
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const attempt = useRef({ signature: '', requestId: '' });
    useEffect(() => { if (!token)
        return; let active = true; accountSupportApi.state(token).then(data => { if (active)
        setState(data); }).catch(cause => { if (active)
        setError(cause.message); }); const timer = setTimeout(() => { setToken(''); setChallenge(''); setState(null); setNotice('Phiên hỗ trợ đã hết hạn. Hãy xác minh lại.'); }, Math.max(0, Date.parse(expires) - Date.now())); return () => { active = false; clearTimeout(timer); }; }, [token, expires, revision]);
    async function submit(event) {
        event.preventDefault();
        if (busy)
            return;
        setBusy(true);
        setError('');
        setNotice('');
        try {
            if (state?.receiptOnly)
                throw new Error('Tài khoản đã ẩn danh. Phiên hỗ trợ này chỉ còn quyền đọc kết quả.');
            if (!challenge) {
                const response = await accountSupportApi.challenge(email.trim(), password);
                setPassword('');
                setChallenge(response.challengeId);
                setNotice(response.message);
            }
            else if (!token) {
                const response = await accountSupportApi.verify(challenge, code);
                setCode('');
                setToken(response.supportToken);
                setExpires(response.expiresAt);
                setNotice('Đã xác minh quyền gửi yêu cầu cho tài khoản.');
            }
            else {
                await accountSupportApi.create(token, { kind, summary, ...(kind === 'RECTIFY' ? { fullName: name } : {}), requestId: adminRequestId(attempt.current, { kind, summary, name }) });
                attempt.current = { signature: '', requestId: '' };
                setSummary('');
                setName('');
                setRevision(value => value + 1);
                setNotice('Đã tiếp nhận yêu cầu và tạo hồ sơ xử lý riêng.');
            }
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Chưa thể gửi yêu cầu.');
        }
        finally {
            setBusy(false);
        }
    }
    async function download(id) { setError(''); try {
        downloadUserData(await accountSupportApi.artifact(token, id), `du-lieu-tai-khoan-${id}.json`);
    }
    catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Chưa tải được dữ liệu.');
    } }
    return _jsxs("main", { className: "ua-public", children: [_jsx(Link, { to: "/", className: "ua-public-brand", children: "MDUC247" }), _jsx("h1", { children: "H\u1ED7 tr\u1EE3 t\u00E0i kho\u1EA3n v\u00E0 d\u1EEF li\u1EC7u c\u00E1 nh\u00E2n" }), _jsx("p", { children: "G\u1EEDi kh\u00E1ng ngh\u1ECB kh\u00F3a t\u00E0i kho\u1EA3n ho\u1EB7c y\u00EAu c\u1EA7u truy c\u1EADp, ch\u1EC9nh s\u1EEDa, x\u00F3a / \u1EA9n danh d\u1EEF li\u1EC7u. B\u1EA1n c\u00F3 th\u1EC3 d\u00F9ng lu\u1ED3ng n\u00E0y khi t\u00E0i kho\u1EA3n \u0111ang b\u1ECB kh\u00F3a." }), _jsx("form", { className: "ua-command", onSubmit: submit, children: _jsx("fieldset", { disabled: busy || Boolean(state?.receiptOnly), children: !challenge ? _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Email t\u00E0i kho\u1EA3n", _jsx("input", { type: "email", required: true, autoComplete: "username", value: email, onChange: event => setEmail(event.target.value) })] }), _jsxs("label", { children: ["M\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i", _jsx("input", { type: "password", required: true, autoComplete: "current-password", maxLength: 128, value: password, onChange: event => setPassword(event.target.value) })] }), _jsx("button", { className: "pa-button", children: busy ? 'Đang xác minh…' : 'Gửi mã xác minh qua email' })] }) : !token ? _jsxs(_Fragment, { children: [_jsxs("label", { children: ["M\u00E3 x\u00E1c minh trong email", _jsx("input", { required: true, inputMode: "numeric", autoComplete: "one-time-code", pattern: "[0-9]{6}", maxLength: 6, value: code, onChange: event => setCode(event.target.value) })] }), _jsx("button", { className: "pa-button", children: "X\u00E1c minh m\u00E3" }), _jsx("button", { type: "button", className: "pa-text-link", onClick: () => { setChallenge(''); setCode(''); }, children: "Nh\u1EADn m\u00E3 m\u1EDBi / \u0111\u1ED5i t\u00E0i kho\u1EA3n" })] }) : _jsxs(_Fragment, { children: [_jsxs("p", { children: ["Quy\u1EC1n g\u1EEDi y\u00EAu c\u1EA7u c\u00F3 hi\u1EC7u l\u1EF1c \u0111\u1EBFn ", date(expires, true), " \u00B7 UTC+07:00."] }), _jsxs("label", { children: ["Lo\u1EA1i y\u00EAu c\u1EA7u", _jsx("select", { value: kind, onChange: event => setKind(event.target.value), children: Object.keys(userWorkflowKinds).map(value => _jsx("option", { value: value, disabled: value === 'APPEAL' && !state?.suspension, children: userWorkflowKinds[value] }, value)) })] }), kind === 'APPEAL' && state?.suspension && _jsxs("div", { className: "ua-result", children: [_jsx("strong", { children: "Quy\u1EBFt \u0111\u1ECBnh kh\u00F3a \u0111ang \u00E1p d\u1EE5ng" }), _jsx("p", { children: state.suspension.reason }), _jsxs("small", { children: ["M\u00E3 quy\u1EBFt \u0111\u1ECBnh: ", state.suspension.id, " \u00B7 ", date(state.suspension.created_at, true)] })] }), kind === 'RECTIFY' && _jsxs("label", { children: ["H\u1ECD t\u00EAn \u0111\u1EC1 ngh\u1ECB ch\u1EC9nh s\u1EEDa", _jsx("input", { required: true, minLength: 2, maxLength: 120, value: name, onChange: event => setName(event.target.value) })] }), kind === 'RECTIFY' && _jsx("p", { children: "Email v\u00E0 s\u1ED1 \u0111i\u1EC7n tho\u1EA1i c\u1EA7n \u0111\u01B0\u1EE3c thay \u0111\u1ED5i qua lu\u1ED3ng x\u00E1c minh t\u01B0\u01A1ng \u1EE9ng trong h\u1ED3 s\u01A1." }), kind === 'ANONYMIZE' && _jsx("p", { children: "Y\u00EAu c\u1EA7u s\u1EBD \u0111\u01B0\u1EE3c r\u00E0 so\u00E1t ngh\u0129a v\u1EE5 \u0111ang m\u1EDF v\u00E0 h\u1ED3 s\u01A1 c\u1EA7n l\u01B0u. D\u1EEF li\u1EC7u \u0111\u01A1n, thanh to\u00E1n ho\u1EB7c quy\u1EBFt \u0111\u1ECBnh c\u00F3 th\u1EC3 \u0111\u01B0\u1EE3c gi\u1EEF theo ngo\u1EA1i l\u1EC7 l\u01B0u tr\u1EEF \u0111\u01B0\u1EE3c th\u00F4ng b\u00E1o trong h\u1ED3 s\u01A1." }), _jsxs("label", { children: ["N\u1ED9i dung y\u00EAu c\u1EA7u", _jsx("textarea", { required: true, minLength: 10, maxLength: 2000, value: summary, onChange: event => setSummary(event.target.value) })] }), _jsx("button", { className: "pa-button", children: busy ? 'Đang gửi…' : 'Gửi yêu cầu' })] }) }) }), error && _jsx("p", { role: "alert", className: "ua-error", children: error }), notice && _jsx("p", { role: "status", className: "ua-result", children: notice }), token && state && _jsxs("section", { children: [_jsx("h2", { children: "H\u1ED3 s\u01A1 y\u00EAu c\u1EA7u c\u1EE7a t\u00F4i" }), state.receiptOnly && _jsx("p", { className: "ua-result", children: "T\u00E0i kho\u1EA3n \u0111\u00E3 \u0111\u01B0\u1EE3c \u1EA9n danh. Phi\u00EAn h\u1ED7 tr\u1EE3 hi\u1EC7n t\u1EA1i ch\u1EC9 c\u00F2n quy\u1EC1n \u0111\u1ECDc k\u1EBFt qu\u1EA3 \u0111\u1EBFn th\u1EDDi \u0111i\u1EC3m h\u1EBFt h\u1EA1n \u0111\u00E3 th\u00F4ng b\u00E1o." }), _jsx("button", { className: "pa-text-link", onClick: () => setRevision(value => value + 1), children: "T\u1EA3i l\u1EA1i tr\u1EA1ng th\u00E1i" }), _jsx("ul", { className: "ua-public-cases", children: state.cases.map(row => _jsxs("li", { children: [_jsxs("strong", { children: [userWorkflowKinds[row.kind], " \u00B7 ", userWorkflowStatuses[row.status]] }), _jsxs("small", { children: ["#", row.id.slice(0, 8), " \u00B7 ", date(row.created_at, true)] }), _jsx("p", { children: row.summary }), row.review_reason && _jsxs("p", { children: ["K\u1EBFt qu\u1EA3 r\u00E0 so\u00E1t: ", row.review_reason] }), row.retention?.filter(item => item.disposition === 'RETAIN').map(item => _jsxs("small", { children: ["H\u1ED3 s\u01A1 ", { identity: 'tài khoản và nhật ký truy vết', catalog: 'cửa hàng / sản phẩm', order: 'đơn hàng / hậu mãi', payment: 'thanh toán', engagement: 'tương tác / thông báo', chat: 'hội thoại' }[item.module], " \u0111\u01B0\u1EE3c gi\u1EEF theo ngo\u1EA1i l\u1EC7 l\u01B0u tr\u1EEF \u0111\u1EBFn ", date(item.retainUntil || undefined, true), "."] }, item.module)), row.kind === 'ACCESS' && row.status === 'COMPLETED' && !state.receiptOnly && _jsx("button", { className: "pa-text-link", onClick: () => void download(row.id), children: "T\u1EA3i b\u1EA3n d\u1EEF li\u1EC7u \u0111\u01B0\u1EE3c cung c\u1EA5p" })] }, row.id)) }), !state.cases.length && _jsx("p", { children: "B\u1EA1n ch\u01B0a c\u00F3 y\u00EAu c\u1EA7u h\u1ED7 tr\u1EE3 trong lu\u1ED3ng n\u00E0y." })] }), _jsx(Link, { className: "pa-text-link", to: "/login", children: "Quay l\u1EA1i \u0111\u0103ng nh\u1EADp" })] });
}
