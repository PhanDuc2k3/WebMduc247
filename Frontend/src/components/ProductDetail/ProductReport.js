import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { productModerationApi as api } from '../../api/productModerationApi';
import { adminRequestId } from '../../api/adminCommand';
export default function ProductReport({ productId }) {
    const [open, setOpen] = useState(false), [rules, setRules] = useState([]), [code, setCode] = useState(''), [reason, setReason] = useState(''), [evidence, setEvidence] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
    const attempt = useRef({ signature: '', requestId: '' });
    useEffect(() => { if (open)
        api.reportReasons().then(r => setRules(r.items)).catch(e => setMessage(e.message)); }, [open]);
    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setMessage('');
        const input = { reasonCode: code, reason, evidence: evidence.split('\n').map(s => s.trim()).filter(Boolean) };
        try {
            await api.report(productId, { ...input, requestId: adminRequestId(attempt.current, input) });
            setMessage('Đã gửi báo cáo để sàn kiểm tra.');
            setOpen(false);
            setReason('');
        }
        catch (e) {
            setMessage(e instanceof Error ? e.message : 'Không thể gửi báo cáo.');
        }
        finally {
            setBusy(false);
        }
    }
    return _jsxs("div", { className: "mt-4 text-sm", children: [_jsx("button", { type: "button", className: "text-slate-600 underline", onClick: () => setOpen(v => !v), children: "B\u00E1o c\u00E1o s\u1EA3n ph\u1EA9m vi ph\u1EA1m" }), message && _jsx("p", { role: "status", children: message }), open && _jsxs("form", { className: "mt-3 grid gap-3 rounded-xl border p-4", onSubmit: submit, children: [_jsxs("label", { children: ["Lo\u1EA1i vi ph\u1EA1m", _jsxs("select", { className: "ml-2 rounded border p-2", required: true, value: code, onChange: e => setCode(e.target.value), children: [_jsx("option", { value: "", children: "Ch\u1ECDn l\u00FD do" }), rules.map(r => _jsx("option", { value: r.code, children: r.label }, r.code))] })] }), _jsxs("label", { children: ["M\u00F4 t\u1EA3", _jsx("textarea", { className: "mt-1 w-full rounded border p-2", required: true, minLength: 8, maxLength: 500, value: reason, onChange: e => setReason(e.target.value) })] }), _jsxs("label", { children: ["B\u1EB1ng ch\u1EE9ng (m\u1ED7i d\u00F2ng m\u1ED9t li\u00EAn k\u1EBFt)", _jsx("textarea", { className: "mt-1 w-full rounded border p-2", value: evidence, onChange: e => setEvidence(e.target.value) })] }), _jsx("button", { className: "rounded bg-blue-600 p-2 text-white", disabled: busy, children: busy ? 'Đang gửi…' : 'Gửi báo cáo' })] })] });
}
