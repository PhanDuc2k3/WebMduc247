import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { userAdminApi } from '../../api/userAdminApi';
import { adminRequestId } from '../../api/adminCommand';
import { AdminDialog, StatusBadge } from './AdminUi';
export default function UserContactSearch({ select }) {
    const [open, setOpen] = useState(false), [phone, setPhone] = useState(''), [reason, setReason] = useState(''), [items, setItems] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const attempt = useRef({ signature: '', requestId: '' });
    async function search(event) { event.preventDefault(); setBusy(true); setError(''); setItems(null); try {
        const data = await userAdminApi.searchContact({ phone, reason, requestId: adminRequestId(attempt.current, { phone, reason }) });
        attempt.current = { signature: '', requestId: '' };
        setItems(data.items);
    }
    catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Không thể tra cứu liên hệ.');
    }
    finally {
        setBusy(false);
    } }
    return _jsxs(_Fragment, { children: [_jsx("button", { className: "pa-button pa-button-light", onClick: () => { setOpen(true); setItems(null); setError(''); }, children: "Tra c\u1EE9u li\u00EAn h\u1EC7 c\u00F3 ghi log" }), open && _jsx(AdminDialog, { title: "Tra c\u1EE9u b\u1EB1ng s\u1ED1 \u0111i\u1EC7n tho\u1EA1i", close: () => setOpen(false), busy: busy, children: _jsxs("div", { className: "pa-detail", children: [_jsx("p", { children: "Tra c\u1EE9u ch\u00EDnh x\u00E1c s\u1ED1 \u0111i\u1EC7n tho\u1EA1i theo \u0111\u1ECBnh d\u1EA1ng qu\u1ED1c t\u1EBF. K\u1EBFt qu\u1EA3 danh s\u00E1ch ti\u1EBFp t\u1EE5c \u0111\u01B0\u1EE3c che d\u1EEF li\u1EC7u." }), _jsx("form", { className: "ua-command", onSubmit: search, children: _jsxs("fieldset", { disabled: busy, children: [_jsxs("label", { children: ["S\u1ED1 \u0111i\u1EC7n tho\u1EA1i", _jsx("input", { required: true, type: "tel", pattern: "\\+[1-9][0-9]{7,14}", value: phone, onChange: event => setPhone(event.target.value), placeholder: "+849\u2026" })] }), _jsxs("label", { children: ["L\u00FD do truy c\u1EADp li\u00EAn h\u1EC7", _jsx("textarea", { required: true, minLength: 8, maxLength: 500, value: reason, onChange: event => setReason(event.target.value) })] }), _jsx("button", { className: "pa-button", children: busy ? 'Đang tra cứu…' : 'Tra cứu và ghi log' })] }) }), error && _jsx("p", { className: "pa-error", role: "alert", children: error }), items && _jsx("ul", { className: "ua-linked-list", children: items.map(item => _jsxs("li", { children: [_jsxs("button", { className: "pa-text-link", onClick: () => { select(item.id); setOpen(false); }, children: [item.fullName, " \u00B7 ", item.email, " \u00B7 #", item.id.slice(0, 8)] }), _jsx(StatusBadge, { status: item.status })] }, item.id)) }), items?.length === 0 && _jsx("p", { children: "Kh\u00F4ng c\u00F3 k\u1EBFt qu\u1EA3 ph\u00F9 h\u1EE3p." })] }) })] });
}
