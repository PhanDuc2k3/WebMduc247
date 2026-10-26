import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminCaseApi } from '../../api/adminCaseApi';
import { useAdminSession } from './AdminSession';
import { date } from './AdminUi';
import './admin-cases.css';
import CaseResolutionWorkspace from './CaseResolutionWorkspace';
const localTime = (value) => { const time = new Date(value); return new Date(time.getTime() - time.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const errors = (cause) => cause instanceof Error ? cause.message : 'Chưa thể xử lý hồ sơ.';
export default function CaseWorkspace({ detail, refresh, onBusy }) {
    const user = useAdminSession(), r = detail.record;
    const [staff, setStaff] = useState([]), [staffError, setStaffError] = useState('');
    const [assignee, setAssignee] = useState(r.assigneeId || ''), [deadline, setDeadline] = useState(localTime(new Date(r.dueAt).getTime() > Date.now() ? r.dueAt : new Date(Date.now() + 48 * 3600000).toISOString()));
    const [reason, setReason] = useState(''), [recipient, setRecipient] = useState('BUYER'), [prompt, setPrompt] = useState('');
    const [infoDue, setInfoDue] = useState(localTime(new Date(Date.now() + 24 * 3600000).toISOString()));
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [stale, setStale] = useState(false);
    useEffect(() => { let active = true; adminCaseApi.staff().then(data => { if (active)
        setStaff(data.items); }).catch(cause => { if (active)
        setStaffError(errors(cause)); }); return () => { active = false; }; }, []);
    useEffect(() => { onBusy?.(busy); return () => onBusy?.(false); }, [busy, onBusy]);
    async function run(action) {
        if (busy || stale)
            return;
        setBusy(true);
        setError('');
        try {
            await action();
            refresh();
        }
        catch (cause) {
            setError(errors(cause));
            setStale(true);
        }
        finally {
            setBusy(false);
        }
    }
    function assign(event) { event.preventDefault(); void run(() => adminCaseApi.assign(r.id, { assigneeId: assignee || null, dueAt: new Date(deadline).toISOString(), version: r.caseVersion, reason: reason.trim() })); }
    function claim() {
        void run(() => adminCaseApi.assign(r.id, { assigneeId: user.id, dueAt: new Date(deadline).toISOString(), version: r.caseVersion,
            reason: 'Nhận hồ sơ để xử lý; hạn xử lý theo thời điểm đã chọn trong biểu mẫu.' }));
    }
    function information(event) { event.preventDefault(); void run(() => adminCaseApi.requestInformation(r.id, { recipientKind: recipient, prompt: prompt.trim(), dueAt: new Date(infoDue).toISOString(), version: r.caseVersion })); }
    const closed = ['CLOSED', 'REJECTED', 'REFUNDED', 'RESOLVED', 'DECIDED'].includes(r.status);
    return _jsxs("section", { className: "pa-case-workspace", children: [_jsx("h3", { children: "Ph\u00E2n c\u00F4ng v\u00E0 h\u1EA1n x\u1EED l\u00FD" }), _jsxs("p", { className: "pa-detail-muted", children: ["Ng\u01B0\u1EDDi ph\u1EE5 tr\u00E1ch: ", staff.find(item => item.id === r.assigneeId)?.name || r.assigneeId || 'Chưa phân công', " \u00B7 H\u1EA1n: ", date(r.dueAt, true), new Date(r.dueAt).getTime() < Date.now() ? ' · Đã quá hạn' : ''] }), error && _jsx("p", { className: "pa-error", role: "alert", children: error }), stale && _jsx("button", { className: "pa-button pa-button-light", onClick: refresh, children: "T\u1EA3i l\u1EA1i h\u1ED3 s\u01A1 tr\u01B0\u1EDBc khi th\u1EED ti\u1EBFp" }), _jsxs("form", { className: "pa-case-form", onSubmit: assign, children: [_jsxs("label", { children: ["Ng\u01B0\u1EDDi ph\u1EE5 tr\u00E1ch", _jsxs("select", { value: assignee, onChange: event => setAssignee(event.target.value), disabled: busy, children: [_jsx("option", { value: "", children: "Ch\u01B0a ph\u00E2n c\u00F4ng" }), _jsxs("option", { value: user.id, children: ["T\u00F4i \u2014 ", user.fullName] }), staff.filter(item => item.id !== user.id).map(item => _jsx("option", { value: item.id, children: item.name }, item.id)), r.assigneeId && r.assigneeId !== user.id && !staff.some(item => item.id === r.assigneeId) && _jsx("option", { value: r.assigneeId, children: r.assigneeId })] })] }), _jsxs("label", { children: ["H\u1EA1n x\u1EED l\u00FD", _jsx("input", { type: "datetime-local", required: true, value: deadline, onChange: event => setDeadline(event.target.value), disabled: busy })] }), _jsxs("label", { className: "pa-case-wide", children: ["L\u00FD do thay \u0111\u1ED5i", _jsx("textarea", { required: true, minLength: 10, maxLength: 500, value: reason, onChange: event => setReason(event.target.value), disabled: busy })] }), staffError && _jsxs("p", { className: "pa-detail-muted", children: ["Kh\u00F4ng t\u1EA3i \u0111\u01B0\u1EE3c danh s\u00E1ch nh\u00E2n vi\u00EAn: ", staffError, ". B\u1EA1n v\u1EABn c\u00F3 th\u1EC3 nh\u1EADn h\u1ED3 s\u01A1 cho m\u00ECnh."] }), _jsxs("div", { className: "pa-case-wide pa-dialog-actions", children: [r.assigneeId !== user.id && _jsx("button", { type: "button", className: "pa-button pa-button-light", disabled: busy || stale || !deadline, onClick: claim, children: "Nh\u1EADn h\u1ED3 s\u01A1" }), _jsx("button", { className: "pa-button", disabled: busy || stale || reason.trim().length < 10, children: "L\u01B0u ph\u00E2n c\u00F4ng v\u00E0 h\u1EA1n" })] })] }), _jsx("h3", { children: "H\u1ED3 s\u01A1 li\u00EAn quan" }), _jsxs("div", { className: "pa-case-links", children: [detail.links.map(link => _jsxs(Link, { to: link.kind === 'RETURN' ? `/admin/returns?id=${link.id}` : `/admin/cases?kind=${link.kind}&id=${link.id}`, children: [link.kind === 'RETURN' ? 'Trả hàng' : link.kind === 'TICKET' ? 'Ticket' : 'Khiếu nại', " #", link.id.slice(0, 8)] }, link.id)), _jsx(Link, { to: `/admin/cases?kind=TICKET&new=1&orderId=${r.shopOrderId}&relatedCaseId=${r.id}`, children: "T\u1EA1o ticket li\u00EAn quan" }), _jsx(Link, { to: `/admin/cases?kind=DISPUTE&new=1&orderId=${r.shopOrderId}&relatedCaseId=${r.id}`, children: "M\u1EDF khi\u1EBFu n\u1EA1i li\u00EAn quan" })] }), _jsx("h3", { children: "Y\u00EAu c\u1EA7u b\u1ED5 sung th\u00F4ng tin" }), detail.informationRequests.map(request => _jsxs("article", { className: "pa-case-thread", children: [_jsxs("strong", { children: [request.recipientKind === 'BUYER' ? 'Người mua' : 'Cửa hàng', " \u00B7 ", request.status === 'OPEN' ? 'Chờ phản hồi' : request.status === 'RESPONDED' ? 'Đã phản hồi' : 'Đã hủy'] }), _jsxs("small", { children: ["H\u1EA1n ph\u1EA3n h\u1ED3i: ", date(request.dueAt, true), request.status === 'OPEN' && new Date(request.dueAt).getTime() < Date.now() ? ' · Quá hạn' : ''] }), _jsx("p", { children: request.prompt }), request.replies.map(reply => _jsxs("blockquote", { children: [_jsxs("small", { children: [reply.actorType === 'BUYER' ? 'Người mua' : 'Cửa hàng', " \u00B7 ", date(reply.createdAt, true)] }), _jsx("p", { children: reply.message })] }, reply.id))] }, request.id)), !detail.informationRequests.length && _jsx("p", { className: "pa-detail-muted", children: "Ch\u01B0a y\u00EAu c\u1EA7u b\u1ED5 sung th\u00F4ng tin." }), !closed && _jsxs("form", { className: "pa-case-form", onSubmit: information, children: [_jsxs("label", { children: ["G\u1EEDi cho", _jsxs("select", { value: recipient, onChange: event => setRecipient(event.target.value), disabled: busy, children: [_jsx("option", { value: "BUYER", children: "Ng\u01B0\u1EDDi mua" }), _jsx("option", { value: "SELLER", children: "C\u1EEDa h\u00E0ng" })] })] }), _jsxs("label", { children: ["H\u1EA1n ph\u1EA3n h\u1ED3i", _jsx("input", { type: "datetime-local", required: true, value: infoDue, onChange: event => setInfoDue(event.target.value), disabled: busy })] }), _jsxs("label", { className: "pa-case-wide", children: ["N\u1ED9i dung c\u1EA7n b\u1ED5 sung", _jsx("textarea", { required: true, minLength: 10, maxLength: 2000, value: prompt, onChange: event => setPrompt(event.target.value), disabled: busy })] }), _jsx("p", { className: "pa-detail-muted pa-case-wide", children: "N\u1ED9i dung \u0111\u01B0\u1EE3c g\u1EEDi t\u1EDBi b\u00EAn \u0111\u00E3 ch\u1ECDn v\u00E0 l\u01B0u nguy\u00EAn v\u0103n c\u00F9ng l\u1ECBch s\u1EED ph\u1EA3n h\u1ED3i." }), _jsx("button", { className: "pa-button pa-case-wide", disabled: busy || stale || prompt.trim().length < 10, children: "G\u1EEDi y\u00EAu c\u1EA7u b\u1ED5 sung" })] }), _jsx("h3", { children: "Nh\u1EADt k\u00FD h\u1ED3 s\u01A1" }), _jsx("ol", { className: "pa-history", children: detail.events.map(event => _jsxs("li", { children: [_jsxs("small", { children: [date(event.createdAt, true), " \u00B7 ", event.action === 'assignment_changed' ? 'Thay đổi phân công' : event.action === 'information_requested' ? 'Yêu cầu thông tin' : event.action === 'information_replied' ? 'Phản hồi bổ sung' : event.action === 'case_created' ? 'Tạo hồ sơ' : event.action === 'status_changed' ? 'Chuyển trạng thái' : event.action === 'evidence_viewed' ? 'Xem chứng cứ' : event.action === 'evidence_access_issued' ? 'Cấp quyền xem ảnh' : 'Xử lý hồ sơ'] }), _jsx("p", { children: event.reason })] }, event.id)) }), _jsx(CaseResolutionWorkspace, { id: r.id, refresh: refresh, onBusy: setBusy })] });
}
