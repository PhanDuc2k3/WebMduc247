import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminAccessApi } from '../../api/adminAccessApi';
import { useAdminSession } from './AdminSession';
import { hasAdminPermission } from './adminPolicy';
const scopeLabels = { storeIds: 'Shop phụ trách', caseKinds: 'Loại hồ sơ', assigneeIds: 'Nhóm người xử lý' };
const scopeText = (scope) => Object.entries(scope).map(([key, values]) => `${scopeLabels[key] || key}: ${values.join(', ')}`).join(' · ') || 'Toàn sàn';
export default function StaffAccess() {
    const user = useAdminSession(), [params, setParams] = useSearchParams();
    const [id, setId] = useState(params.get('id') || ''), [staff, setStaff] = useState([]);
    const [data, setData] = useState(null), [assignments, setAssignments] = useState([]);
    const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [reason, setReason] = useState(''), [revision, setRevision] = useState(0);
    useEffect(() => { let active = true; adminAccessApi.staff().then(r => { if (active)
        setStaff(r.items); }).catch(() => { }); return () => { active = false; }; }, []);
    useEffect(() => { let active = true; setData(null); setError(''); const target = params.get('id'); if (target)
        adminAccessApi.preview(target).then(result => { if (active) {
            setData(result);
            setAssignments(result.assignments);
        } }).catch(cause => { if (active)
            setError(cause instanceof Error ? cause.message : 'Chưa tải được quyền.'); }); return () => { active = false; }; }, [params, revision]);
    const editable = hasAdminPermission(user, 'staff.update') && data?.id !== user.id;
    function setScope(role, key, value) { setAssignments(current => current.map(a => { if (a.role !== role)
        return a; const scope = { ...a.scope }, values = value.split(',').map(v => v.trim()).filter(Boolean); if (values.length)
        scope[key] = values;
    else
        delete scope[key]; return { ...a, scope }; })); }
    async function save(event) { event.preventDefault(); if (!data || !editable || busy)
        return; setBusy(true); setError(''); setNotice(''); try {
        await adminAccessApi.replace(data.id, assignments.filter(a => a.role !== 'legacy_admin'), data.version, reason.trim(), crypto.randomUUID());
        setNotice('Đã cập nhật quyền và thu hồi các phiên đăng nhập của nhân viên.');
        setReason('');
        setRevision(v => v + 1);
    }
    catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Chưa cập nhật được quyền.');
    }
    finally {
        setBusy(false);
    } }
    return _jsxs("div", { className: "pa-page", children: [_jsx("div", { className: "pa-page-heading", children: _jsxs("div", { children: [_jsx("h1", { children: "Nh\u00E2n s\u1EF1 & quy\u1EC1n hi\u1EC7u l\u1EF1c" }), _jsx("p", { children: "Xem ngu\u1ED3n quy\u1EC1n t\u1EEB t\u1EEBng vai tr\u00F2 v\u00E0 ph\u1EA1m vi \u0111\u01B0\u1EE3c giao." })] }) }), _jsxs("section", { className: "pa-panel pa-detail", children: [_jsxs("form", { className: "pa-case-form", onSubmit: event => { event.preventDefault(); setNotice(''); setParams({ id: id.trim() }); setRevision(v => v + 1); }, children: [_jsxs("label", { children: ["Nh\u00E2n vi\u00EAn", _jsxs("select", { value: id, onChange: event => setId(event.target.value), children: [_jsx("option", { value: "", children: "Ch\u1ECDn nh\u00E2n vi\u00EAn" }), staff.map(person => _jsx("option", { value: person.id, children: person.name }, person.id))] })] }), _jsxs("label", { children: ["M\u00E3 t\u00E0i kho\u1EA3n", _jsx("input", { required: true, value: id, onChange: event => setId(event.target.value) })] }), _jsx("button", { className: "pa-button", children: "Xem quy\u1EC1n" })] }), error && _jsx("p", { className: "pa-error", role: "alert", children: error }), notice && _jsx("p", { role: "status", children: notice }), data && _jsxs(_Fragment, { children: [_jsx("h2", { children: data.name }), _jsxs("p", { children: ["Tr\u1EA1ng th\u00E1i: ", data.status, " \u00B7 Phi\u00EAn b\u1EA3n quy\u1EC1n: ", data.version] }), _jsx("ul", { children: data.access.restrictions.map(text => _jsx("li", { children: text }, text)) }), _jsx("div", { className: "pa-table-scroll", children: _jsxs("table", { className: "pa-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Quy\u1EC1n hi\u1EC7u l\u1EF1c" }), _jsx("th", { children: "Nh\u1EADn t\u1EEB vai tr\u00F2" }), _jsx("th", { children: "Ph\u1EA1m vi" })] }) }), _jsx("tbody", { children: data.access.grants.map((g, index) => _jsxs("tr", { children: [_jsx("td", { children: g.permission }), _jsx("td", { children: data.roles[g.role]?.label || g.role }), _jsx("td", { children: scopeText(g.scope) })] }, index)) })] }) }), !data.access.grants.length && _jsx("p", { children: "T\u00E0i kho\u1EA3n ch\u01B0a c\u00F3 quy\u1EC1n qu\u1EA3n tr\u1ECB." }), editable && _jsxs("form", { className: "pa-case-form", onSubmit: save, children: [_jsx("h3", { className: "pa-case-wide", children: "Ph\u00E2n c\u00F4ng vai tr\u00F2" }), data.assignments.some(a => a.role === 'legacy_admin') && _jsx("p", { className: "pa-case-wide", children: "Khi l\u01B0u, vai tr\u00F2 chuy\u1EC3n \u0111\u1ED5i s\u1EBD \u0111\u01B0\u1EE3c thay b\u1EB1ng c\u00E1c vai tr\u00F2 nghi\u1EC7p v\u1EE5 \u0111\u00E3 ch\u1ECDn b\u00EAn d\u01B0\u1EDBi." }), Object.entries(data.roles).filter(([role]) => role !== 'legacy_admin').map(([role, definition]) => { const assignment = assignments.find(a => a.role === role); return _jsxs("fieldset", { className: "pa-case-wide", children: [_jsx("legend", { children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: Boolean(assignment), onChange: event => setAssignments(a => event.target.checked ? [...a, { role, scope: {} }] : a.filter(item => item.role !== role)) }), " ", definition.label] }) }), assignment && !['system_admin', 'content_editor', 'marketing', 'auditor'].includes(role) && _jsxs(_Fragment, { children: [_jsx("p", { children: "\u0110\u1EC3 tr\u1ED1ng c\u00E1c ph\u1EA1m vi \u0111\u1EC3 giao to\u00E0n s\u00E0n. C\u00E1c danh s\u00E1ch trong c\u00F9ng vai tr\u00F2 \u0111\u01B0\u1EE3c \u00E1p d\u1EE5ng \u0111\u1ED3ng th\u1EDDi." }), Object.entries(scopeLabels).map(([key, label]) => _jsxs("label", { children: [label, " (ph\u00E2n c\u00E1ch b\u1EB1ng d\u1EA5u ph\u1EA9y)", _jsx("input", { defaultValue: assignment.scope[key]?.join(', ') || '', onBlur: event => setScope(role, key, event.target.value), placeholder: key === 'caseKinds' ? 'RETURN, TICKET, DISPUTE' : 'Mã định danh' })] }, key))] })] }, data.id + role + revision); }), _jsxs("label", { className: "pa-case-wide", children: ["L\u00FD do thay \u0111\u1ED5i", _jsx("textarea", { required: true, minLength: 8, maxLength: 500, value: reason, onChange: event => setReason(event.target.value) })] }), _jsx("button", { disabled: busy || reason.trim().length < 8, className: "pa-button pa-case-wide", children: busy ? 'Đang lưu…' : 'Lưu vai trò và thu hồi phiên' })] })] })] })] });
}
