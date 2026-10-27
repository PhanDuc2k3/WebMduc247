import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApprovalApi } from '../../api/adminAccessApi';
import { money } from './AdminUi';
export default function ApprovalSelector({ operation, targetId, version, value, onChange }) {
    const [items, setItems] = useState([]), [error, setError] = useState(''), [revision, setRevision] = useState(0);
    useEffect(() => { let active = true; setItems([]); setError(''); adminApprovalApi.list(operation).then(result => { if (active)
        setItems(result.items.filter(a => a.target_id === targetId && a.snapshot.version === version && a.status === 'APPROVED')); }).catch(cause => { if (active)
        setError(cause instanceof Error ? cause.message : 'Chưa tải được yêu cầu duyệt.'); }); return () => { active = false; }; }, [operation, targetId, version, revision]);
    return _jsxs("div", { className: "pa-case-wide", children: [_jsxs("label", { children: ["Y\u00EAu c\u1EA7u \u0111\u00E3 \u0111\u01B0\u1EE3c duy\u1EC7t", _jsxs("select", { value: value, onChange: event => onChange(event.target.value), children: [_jsx("option", { value: "", children: "Ch\u1ECDn y\u00EAu c\u1EA7u n\u1EBFu thao t\u00E1c v\u01B0\u1EE3t ng\u01B0\u1EE1ng" }), items.map(item => _jsxs("option", { value: item.id, children: [money(item.snapshot.amountMinor), " \u00B7 #", item.id.slice(0, 8), " \u00B7 Ng\u01B0\u1EDDi duy\u1EC7t ", item.reviewed_by?.slice(0, 8)] }, item.id))] })] }), _jsx(Link, { target: "_blank", rel: "noreferrer", to: `/admin/approvals?${new URLSearchParams({ operation, targetId, version: String(version) })}`, children: "L\u1EADp ho\u1EB7c xem y\u00EAu c\u1EA7u ph\u00EA duy\u1EC7t" }), _jsx("button", { type: "button", className: "pa-text-link", onClick: () => setRevision(v => v + 1), children: "T\u1EA3i l\u1EA1i y\u00EAu c\u1EA7u \u0111\u00E3 duy\u1EC7t" }), error && _jsx("p", { role: "alert", children: error })] });
}
