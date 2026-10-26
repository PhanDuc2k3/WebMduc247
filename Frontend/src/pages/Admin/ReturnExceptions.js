import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminCaseApi } from '../../api/adminCaseApi';
import { AdminDialog, date } from './AdminUi';
import './admin-cases.css';
const errorMessage = (cause) => cause instanceof Error ? cause.message : 'Chưa thể xử lý ngoại lệ.';
export default function ReturnExceptions() {
    const navigate = useNavigate();
    const [caps, setCaps] = useState(null), [items, setItems] = useState([]), [error, setError] = useState(''), [revision, setRevision] = useState(0), [loading, setLoading] = useState(true);
    const [orderId, setOrderId] = useState(''), [context, setContext] = useState(null), [quantities, setQuantities] = useState({});
    const [customerReason, setCustomerReason] = useState(''), [reasonCode, setReasonCode] = useState('OTHER'), [reason, setReason] = useState(''), [key, setKey] = useState(() => crypto.randomUUID()), [busy, setBusy] = useState(false);
    const [selected, setSelected] = useState(null), [action, setAction] = useState('approve'), [decision, setDecision] = useState('');
    const [reviewContext, setReviewContext] = useState(null), [reviewError, setReviewError] = useState('');
    useEffect(() => { if (!selected)
        return; let active = true; setReviewContext(null); setReviewError(''); adminCaseApi.orderContext(selected.shopOrderId).then(data => { if (active)
        setReviewContext(data); }).catch(cause => { if (active)
        setReviewError(errorMessage(cause)); }); return () => { active = false; }; }, [selected]);
    useEffect(() => { let active = true; setLoading(true); setError(''); Promise.all([adminCaseApi.capabilities(), adminCaseApi.exceptions()]).then(([permissions, result]) => { if (active) {
        setCaps(permissions);
        setItems(result.items);
    } }).catch(cause => { if (active)
        setError(errorMessage(cause)); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [revision]);
    const canRequest = caps?.permissions.includes('exception.request'), canApprove = caps?.permissions.includes('exception.approve');
    async function load() { setBusy(true); setError(''); setContext(null); try {
        const data = await adminCaseApi.orderContext(orderId.trim());
        setContext(data);
        setQuantities({});
    }
    catch (cause) {
        setError(errorMessage(cause));
    }
    finally {
        setBusy(false);
    } }
    async function request(event) { event.preventDefault(); if (!context || busy || !canRequest)
        return; setBusy(true); setError(''); try {
        await adminCaseApi.requestException({ shopOrderId: context.orderId, payload: { reason: customerReason.trim(), reasonCode, resolution: 'REFUND', items: Object.entries(quantities).filter(([, quantity]) => quantity > 0).map(([orderItemId, quantity]) => ({ orderItemId, quantity })) }, reason: reason.trim(), clientRequestId: key });
        setContext(null);
        setReason('');
        setCustomerReason('');
        setKey(crypto.randomUUID());
        setRevision(value => value + 1);
    }
    catch (cause) {
        setError(errorMessage(cause));
    }
    finally {
        setBusy(false);
    } }
    async function decide(event) { event.preventDefault(); if (!selected || busy)
        return; setBusy(true); setError(''); try {
        const result = await adminCaseApi.decideException(selected.id, { action, version: selected.version, reason: decision.trim() });
        setSelected(null);
        setDecision('');
        setRevision(value => value + 1);
        if (result.returnRequest)
            navigate(`/admin/returns?id=${result.returnRequest.id}`);
    }
    catch (cause) {
        setError(errorMessage(cause));
        setSelected(null);
        setRevision(value => value + 1);
    }
    finally {
        setBusy(false);
    } }
    return _jsxs("div", { className: "pa-page", children: [_jsxs("div", { className: "pa-page-heading", children: [_jsxs("div", { children: [_jsx("span", { className: "pa-eyebrow", children: "NGO\u1EA0I L\u1EC6 C\u00D3 PH\u00CA DUY\u1EC6T" }), _jsx("h1", { children: "Tr\u1EA3 h\u00E0ng ngo\u00E0i h\u1EA1n" }), _jsx("p", { children: "Ng\u01B0\u1EDDi \u0111\u1EC1 ngh\u1ECB v\u00E0 ng\u01B0\u1EDDi duy\u1EC7t ph\u1EA3i kh\u00E1c nhau, c\u00F3 quy\u1EC1n ri\u00EAng. Kh\u00F4ng thay \u0111\u1ED5i ng\u00E0y giao h\u00E0ng." })] }), _jsx("button", { className: "pa-button pa-button-light", disabled: loading, onClick: () => setRevision(value => value + 1), children: "L\u00E0m m\u1EDBi" })] }), _jsxs("nav", { className: "pa-case-tabs", children: [_jsx(Link, { to: "/admin/returns", children: "Tr\u1EA3 h\u00E0ng" }), _jsx(Link, { to: "/admin/cases?kind=DISPUTE", children: "Khi\u1EBFu n\u1EA1i / tranh ch\u1EA5p" }), _jsx(Link, { to: "/admin/cases?kind=TICKET", children: "Ticket h\u1ED7 tr\u1EE3" }), _jsx(Link, { className: "is-active", to: "/admin/return-exceptions", children: "Ngo\u1EA1i l\u1EC7 ngo\u00E0i h\u1EA1n" })] }), error && _jsx("p", { className: "pa-error", role: "alert", children: error }), !canRequest && !loading && _jsx("p", { className: "pa-case-permission-note", children: "B\u1EA1n ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5p quy\u1EC1n \u0111\u1EC1 ngh\u1ECB ngo\u1EA1i l\u1EC7. Vi\u1EC7c c\u1EA5p quy\u1EC1n \u0111\u01B0\u1EE3c th\u1EF1c hi\u1EC7n qua quy tr\u00ECnh v\u1EADn h\u00E0nh ri\u00EAng." }), canRequest && _jsxs("section", { className: "pa-panel", children: [_jsx("div", { className: "pa-panel-title", children: _jsx("h2", { children: "\u0110\u1EC1 ngh\u1ECB ngo\u1EA1i l\u1EC7" }) }), _jsxs("div", { className: "pa-detail", children: [_jsxs("div", { className: "pa-case-form", children: [_jsxs("label", { children: ["M\u00E3 \u0111\u01A1n h\u00E0ng \u0111\u1EA7y \u0111\u1EE7", _jsx("input", { value: orderId, onChange: event => { setOrderId(event.target.value); setContext(null); } })] }), _jsx("button", { className: "pa-button", disabled: busy || !orderId.trim(), onClick: () => void load(), children: "Ki\u1EC3m tra \u0111\u01A1n h\u00E0ng" })] }), context && _jsxs("form", { className: "pa-case-form", onSubmit: request, children: [_jsxs("p", { className: "pa-case-wide pa-detail-muted", children: ["\u0110\u01A1n #", context.orderId.slice(0, 8), " \u00B7 Giao l\u00FAc ", date(context.deliveredAt || undefined, true), " \u00B7 Ch\u00EDnh s\u00E1ch ", context.windowDays || 7, " ng\u00E0y (", context.policyVersion || 'Chưa có mốc giao hợp lệ', ")."] }), _jsx("div", { className: "pa-case-wide", children: context.items.map(item => _jsxs("label", { className: "pa-case-quantity", children: [_jsxs("span", { children: [item.name, " \u00B7 \u0110\u00E3 mua ", item.quantity] }), _jsx("input", { "aria-label": `Số lượng ngoại lệ ${item.name}`, type: "number", min: 0, max: item.quantity, value: quantities[item.id] || 0, onChange: event => setQuantities(current => ({ ...current, [item.id]: Number(event.target.value) })) })] }, item.id)) }), _jsxs("label", { children: ["L\u00FD do tr\u1EA3 h\u00E0ng", _jsxs("select", { value: reasonCode, onChange: event => setReasonCode(event.target.value), children: [_jsx("option", { value: "OTHER", children: "Kh\u00E1c" }), _jsx("option", { value: "DAMAGED", children: "H\u00E0ng h\u1ECFng" }), _jsx("option", { value: "WRONG_ITEM", children: "Giao sai h\u00E0ng" }), _jsx("option", { value: "NOT_AS_DESCRIBED", children: "Kh\u00F4ng \u0111\u00FAng m\u00F4 t\u1EA3" })] })] }), _jsxs("label", { className: "pa-case-wide", children: ["M\u00F4 t\u1EA3 y\u00EAu c\u1EA7u c\u1EE7a kh\u00E1ch", _jsx("textarea", { required: true, minLength: 10, maxLength: 1000, value: customerReason, onChange: event => setCustomerReason(event.target.value) })] }), _jsxs("label", { className: "pa-case-wide", children: ["C\u0103n c\u1EE9 \u0111\u1EC1 ngh\u1ECB ngo\u1EA1i l\u1EC7", _jsx("textarea", { required: true, minLength: 10, maxLength: 500, value: reason, onChange: event => setReason(event.target.value) })] }), _jsx("p", { className: "pa-detail-muted pa-case-wide", children: "Khi duy\u1EC7t, h\u1EC7 th\u1ED1ng ki\u1EC3m tra l\u1EA1i s\u1ED1 l\u01B0\u1EE3ng, ti\u1EC1n c\u00F2n \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n v\u00E0 ch\u00EDnh s\u00E1ch. \u0110\u1EC1 ngh\u1ECB n\u00E0y ch\u01B0a gi\u1EEF l\u01B0\u1EE3ng tr\u1EA3 ho\u1EB7c t\u1EA1o l\u1EC7nh ho\u00E0n ti\u1EC1n." }), _jsx("button", { className: "pa-button pa-case-wide", disabled: busy || !Object.values(quantities).some(quantity => quantity > 0), children: "G\u1EEDi \u0111\u1EC1 ngh\u1ECB cho ng\u01B0\u1EDDi c\u00F3 quy\u1EC1n duy\u1EC7t" })] })] })] }), _jsxs("section", { className: "pa-panel pa-exceptions-panel", style: { marginTop: 20 }, children: [_jsx("div", { className: "pa-panel-title", children: _jsxs("div", { children: [_jsx("h2", { children: "Ngo\u1EA1i l\u1EC7 g\u1EA7n \u0111\u00E2y" }), _jsx("p", { children: "T\u1ED1i \u0111a 100 h\u1ED3 s\u01A1: \u0111\u1EC1 ngh\u1ECB c\u1EE7a b\u1EA1n v\u00E0 h\u1ED3 s\u01A1 \u0111\u01B0\u1EE3c ph\u00E9p duy\u1EC7t." })] }) }), _jsx("div", { className: "pa-table-scroll", children: _jsxs("table", { className: "pa-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u0110\u1EC1 ngh\u1ECB / \u0111\u01A1n" }), _jsx("th", { children: "C\u0103n c\u1EE9" }), _jsx("th", { children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { children: "Thao t\u00E1c" })] }) }), _jsxs("tbody", { children: [items.map(row => _jsxs("tr", { children: [_jsxs("td", { children: ["#", row.id.slice(0, 8), _jsxs("small", { children: ["\u0110\u01A1n #", row.shopOrderId.slice(0, 8), " \u00B7 ", date(row.createdAt, true)] })] }), _jsxs("td", { className: "pa-audit-reason", children: [row.reason, row.decisionReason && _jsxs("small", { children: ["K\u1EBFt lu\u1EADn: ", row.decisionReason] })] }), _jsx("td", { children: row.status === 'REQUESTED' ? 'Chờ duyệt' : row.status === 'REJECTED' ? 'Đã từ chối' : 'Đã duyệt và tạo yêu cầu trả hàng' }), _jsxs("td", { children: [row.resultReturnId && _jsx(Link, { className: "pa-text-link", to: `/admin/returns?id=${row.resultReturnId}`, children: "Xem y\u00EAu c\u1EA7u tr\u1EA3 h\u00E0ng" }), row.status === 'REQUESTED' && canApprove && row.requestedBy !== caps?.userId && _jsxs("div", { className: "pa-dialog-actions", children: [_jsx("button", { className: "pa-button pa-button-light", onClick: () => { setSelected(row); setAction('reject'); setDecision(''); }, children: "T\u1EEB ch\u1ED1i" }), _jsx("button", { className: "pa-button", onClick: () => { setSelected(row); setAction('approve'); setDecision(''); }, children: "Xem v\u00E0 duy\u1EC7t" })] })] })] }, row.id)), !items.length && _jsx("tr", { children: _jsx("td", { colSpan: 4, className: "pa-empty-cell", children: loading ? 'Đang tải ngoại lệ…' : 'Chưa có ngoại lệ trong phạm vi của bạn.' }) })] })] }) })] }), selected && _jsx(AdminDialog, { title: action === 'approve' ? 'Duyệt ngoại lệ ngoài hạn' : 'Từ chối ngoại lệ', close: () => setSelected(null), busy: busy, children: _jsxs("form", { className: "pa-detail pa-case-form", onSubmit: decide, children: [_jsxs("p", { className: "pa-case-wide", children: ["\u0110\u01A1n #", selected.shopOrderId.slice(0, 8), " \u00B7 Ng\u01B0\u1EDDi \u0111\u1EC1 ngh\u1ECB ", selected.requestedBy.slice(0, 8), ". ", selected.reason] }), _jsxs("p", { className: "pa-case-wide", children: ["M\u1ED1c giao g\u1ED1c: ", date(selected.deliveredAt, true), " \u00B7 Ch\u00EDnh s\u00E1ch ", selected.policyVersion, "."] }), _jsxs("p", { className: "pa-case-wide", children: ["N\u1ED9i dung c\u1EE7a kh\u00E1ch: ", selected.payload.reason] }), _jsx("div", { className: "pa-case-wide", children: selected.payload.items.map(item => _jsxs("p", { children: [reviewContext?.items.find(product => product.id === item.orderItemId)?.name || item.orderItemId, " \u00B7 L\u01B0\u1EE3ng \u0111\u1EC1 ngh\u1ECB tr\u1EA3: ", item.quantity] }, item.orderItemId)) }), reviewError && _jsx("p", { className: "pa-error pa-case-wide", role: "alert", children: reviewError }), _jsx("p", { className: "pa-detail-muted pa-case-wide", children: "Duy\u1EC7t th\u00E0nh c\u00F4ng s\u1EBD t\u1EA1o y\u00EAu c\u1EA7u tr\u1EA3 h\u00E0ng m\u1EDBi theo ch\u00EDnh s\u00E1ch g\u1ED1c; s\u1ED1 ti\u1EC1n \u0111\u01B0\u1EE3c ki\u1EC3m tra v\u00E0 t\u00EDnh l\u1EA1i t\u1EEB snapshot, ch\u01B0a x\u00E1c nh\u1EADn ho\u00E0n ti\u1EC1n." }), _jsxs("label", { className: "pa-case-wide", children: ["L\u00FD do quy\u1EBFt \u0111\u1ECBnh", _jsx("textarea", { required: true, minLength: 10, maxLength: 500, value: decision, onChange: event => setDecision(event.target.value) })] }), _jsx("button", { className: "pa-button pa-case-wide", disabled: busy || decision.trim().length < 10 || (action === 'approve' && !reviewContext), children: busy ? 'Đang xử lý…' : action === 'approve' ? 'Xác nhận duyệt ngoại lệ' : 'Xác nhận từ chối' })] }) })] });
}
