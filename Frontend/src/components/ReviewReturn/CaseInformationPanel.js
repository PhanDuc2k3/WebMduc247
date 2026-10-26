import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { participantCaseApi } from '../../api/adminCaseApi';
function InformationReply({ caseId, request, refresh, closed }) {
    const [text, setText] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function submit(event) { event.preventDefault(); if (busy)
        return; setBusy(true); setError(''); try {
        await participantCaseApi.reply(caseId, request.id, { message: text.trim(), version: request.version });
        setText('');
        await refresh();
    }
    catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Chưa gửi được phản hồi. Vui lòng tải lại hồ sơ.');
    }
    finally {
        setBusy(false);
    } }
    return _jsxs("article", { className: "mt-3 rounded-lg border border-[#dce3ee] p-3 text-sm", children: [_jsx("strong", { children: request.prompt }), _jsxs("p", { className: "mt-1 text-xs text-[#70819d]", children: ["H\u1EA1n ph\u1EA3n h\u1ED3i: ", new Date(request.dueAt).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' }), Date.parse(request.dueAt) < Date.now() ? ' · Đã quá hạn, bạn vẫn có thể bổ sung thông tin.' : ''] }), request.replies.map(reply => _jsxs("div", { className: "mt-2 border-l-2 border-[#b6c7f5] pl-3", children: [_jsx("small", { children: new Date(reply.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' }) }), _jsx("p", { className: "whitespace-pre-wrap", children: reply.message })] }, reply.id)), closed && _jsx("p", { className: "mt-2 text-xs text-[#70819d]", children: "H\u1ED3 s\u01A1 \u0111\u00E3 k\u1EBFt th\u00FAc. L\u1ECBch s\u1EED ph\u1EA3n h\u1ED3i v\u1EABn \u0111\u01B0\u1EE3c gi\u1EEF nguy\u00EAn." }), !closed && request.status !== 'CANCELLED' && _jsxs("form", { onSubmit: submit, className: "mt-3 grid gap-2", children: [_jsxs("label", { children: ["Th\u00F4ng tin b\u1ED5 sung", _jsx("textarea", { className: "mt-1 w-full rounded border p-2", required: true, minLength: 10, maxLength: 2000, value: text, onChange: event => setText(event.target.value), disabled: busy })] }), _jsx("button", { className: "rounded border px-3 py-2 text-[#476de4] disabled:opacity-50", disabled: busy || text.trim().length < 10, children: busy ? 'Đang gửi…' : 'Gửi thông tin bổ sung' })] }), error && _jsxs("p", { role: "alert", className: "mt-2 text-red-700", children: [error, _jsx("button", { className: "ml-2 underline", onClick: () => void refresh(), children: "T\u1EA3i l\u1EA1i" })] })] });
}
export default function CaseInformationPanel({ shopOrderId }) {
    const [items, setItems] = useState([]), [error, setError] = useState('');
    const load = useCallback(async () => { setError(''); try {
        const data = await participantCaseApi.forOrder(shopOrderId);
        setItems(data.items);
    }
    catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Chưa tải được yêu cầu bổ sung.');
    } }, [shopOrderId]);
    useEffect(() => { void load(); }, [load]);
    if (!error && !items.some(item => item.informationRequests.length))
        return null;
    return _jsxs("section", { className: "mt-5 rounded-xl border border-[#dce3ee] p-4", children: [_jsx("h3", { className: "font-bold", children: "Th\u00F4ng tin s\u00E0n c\u1EA7n b\u1ED5 sung" }), error && _jsxs("p", { role: "alert", className: "mt-2 text-sm text-red-700", children: [error, _jsx("button", { onClick: () => void load(), className: "ml-2 underline", children: "Th\u1EED l\u1EA1i" })] }), items.filter(item => item.informationRequests.length).map(item => _jsxs("div", { className: "mt-3", children: [_jsxs("h4", { className: "font-semibold text-sm", children: [item.kind === 'RETURN' ? 'Trả hàng' : item.kind === 'TICKET' ? 'Hỗ trợ' : 'Khiếu nại', " #", item.id.slice(0, 8)] }), item.informationRequests.map(request => _jsx(InformationReply, { caseId: item.id, request: request, refresh: load, closed: ['CLOSED', 'REJECTED', 'REFUNDED', 'RESOLVED', 'DECIDED'].includes(item.status) }, `${request.id}-${request.version}`))] }, item.id))] });
}
