import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { returnApi } from '../../api/reviewReturnApi';
import { vnd } from '../../api/orderV2Api';
import CaseInformationPanel from './CaseInformationPanel';
import CaseResolutionPanel from './CaseResolutionPanel';
const names = { REQUESTED: 'Đã yêu cầu', UNDER_REVIEW: 'Đang xem xét',
    APPROVED: 'Đã chấp nhận', REJECTED: 'Đã từ chối', RETURNING: 'Đang gửi trả', RECEIVED: 'Shop đã nhận',
    REFUND_PENDING: 'Đang hoàn tiền', REFUNDED: 'Đã hoàn tiền', CLOSED: 'Đã đóng' };
export default function ReturnPanel({ order, seller = false }) {
    const [requests, setRequests] = useState([]), [details, setDetails] = useState({});
    const [itemId, setItemId] = useState(order.items?.[0]?.id || ''), [quantity, setQuantity] = useState(1);
    const [reasonCode, setReasonCode] = useState('DAMAGED'), [reason, setReason] = useState('');
    const [response, setResponse] = useState(''), [files, setFiles] = useState([]), [busy, setBusy] = useState(false);
    const [receiptId, setReceiptId] = useState(null), [inspectionCondition, setInspectionCondition] = useState('ACCEPTED'), [inspectionNote, setInspectionNote] = useState('');
    const reload = useCallback(async () => {
        const result = seller ? await returnApi.sellerList(order.storeId, order.id) : await returnApi.buyerList(order.id);
        const own = result.returns.filter(row => row.shopOrderId === order.id);
        setRequests(own);
        const loaded = await Promise.all(own.map(row => returnApi.detail(row.id).then(data => data.returnRequest)));
        setDetails(Object.fromEntries(loaded.map(row => [row.id, row])));
    }, [seller, order.id, order.storeId]);
    useEffect(() => { void reload().catch(error => toast.error(error instanceof Error ? error.message : 'Không thể tải yêu cầu trả hàng.')); }, [reload]);
    async function create() {
        setBusy(true);
        try {
            const result = await returnApi.create(order.id, { reasonCode, reason, resolution: 'REFUND',
                items: [{ orderItemId: itemId, quantity }] });
            for (const file of files)
                await returnApi.upload(result.returnRequest.id, file);
            setReason('');
            setFiles([]);
            await reload();
            toast.success('Đã gửi yêu cầu trả hàng.');
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : 'Không thể gửi yêu cầu.');
        }
        finally {
            setBusy(false);
        }
    }
    async function command(row, action) {
        setBusy(true);
        try {
            await returnApi.command(row.id, action, row.version, response, action === 'receive' ? { inspectionCondition, inspectionNote } : undefined);
            setResponse('');
            setReceiptId(null);
            setInspectionNote('');
            await reload();
            toast.success('Đã cập nhật yêu cầu.');
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : 'Không thể cập nhật.');
        }
        finally {
            setBusy(false);
        }
    }
    async function openEvidence(id, imageId) {
        try {
            const blob = await returnApi.evidence(id, imageId), url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener,noreferrer');
            window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : 'Không thể mở chứng cứ.');
        }
    }
    return _jsxs(_Fragment, { children: [_jsxs("section", { className: "mt-5 rounded-xl border border-[#dce3ee] p-4", children: [_jsx("h3", { className: "font-bold", children: "Tr\u1EA3 h\u00E0ng / ho\u00E0n ti\u1EC1n" }), !seller && ['DELIVERED', 'COMPLETED'].includes(order.status) && !!order.items?.length && _jsxs("div", { className: "mt-3 grid gap-2", children: [_jsx("select", { value: itemId, onChange: e => setItemId(e.target.value), className: "rounded-lg border p-2", "aria-label": "S\u1EA3n ph\u1EA9m tr\u1EA3", children: order.items.map(item => _jsx("option", { value: item.id, children: item.name }, item.id)) }), _jsx("input", { type: "number", min: 1, max: order.items.find(item => item.id === itemId)?.quantity || 1, value: quantity, onChange: e => setQuantity(Number(e.target.value)), className: "w-24 rounded-lg border p-2", "aria-label": "S\u1ED1 l\u01B0\u1EE3ng tr\u1EA3" }), _jsxs("select", { value: reasonCode, onChange: e => setReasonCode(e.target.value), className: "rounded-lg border p-2", "aria-label": "L\u00FD do", children: [_jsx("option", { value: "DAMAGED", children: "H\u00E0ng h\u1ECFng" }), _jsx("option", { value: "WRONG_ITEM", children: "Giao sai h\u00E0ng" }), _jsx("option", { value: "NOT_AS_DESCRIBED", children: "Kh\u00E1c m\u00F4 t\u1EA3" }), _jsx("option", { value: "OTHER", children: "L\u00FD do kh\u00E1c" })] }), _jsx("textarea", { value: reason, onChange: e => setReason(e.target.value), maxLength: 1000, rows: 2, placeholder: "M\u00F4 t\u1EA3 l\u00FD do (10\u20131000 k\u00FD t\u1EF1)", className: "rounded-lg border p-2" }), _jsxs("label", { className: "text-sm", children: ["\u1EA2nh ch\u1EE9ng c\u1EE9 (t\u1ED1i \u0111a 6 \u1EA3nh, m\u1ED7i \u1EA3nh 2 MB)", _jsx("input", { type: "file", accept: "image/png,image/jpeg,image/webp", multiple: true, onChange: e => setFiles(Array.from(e.target.files || []).slice(0, 6)), className: "mt-1 block" })] }), _jsx("div", { children: _jsx("button", { disabled: busy, onClick: () => void create(), className: "rounded-lg border border-[#476de4] px-4 py-2 font-semibold text-[#476de4] disabled:opacity-50", children: "G\u1EEDi y\u00EAu c\u1EA7u" }) }), _jsx("p", { className: "text-xs text-[#70819d]", children: "Trong 7 ng\u00E0y sau giao h\u00E0ng. Ti\u1EC1n s\u1EA3n ph\u1EA9m t\u00EDnh theo gi\u00E1 \u0111\u00E3 gi\u1EA3m; ph\u00ED giao h\u00E0ng ch\u1EC9 ho\u00E0n khi tr\u1EA3 to\u00E0n b\u1ED9 \u0111\u01A1n trong m\u1ED9t y\u00EAu c\u1EA7u v\u00EC h\u00E0ng h\u1ECFng ho\u1EB7c giao sai." })] }), requests.map(row => {
                        const detail = details[row.id] || row;
                        return _jsxs("article", { className: "mt-4 border-t pt-3 text-sm", children: [_jsxs("strong", { children: ["#", row.id.slice(0, 8), " \u00B7 ", order.paymentMethod === 'COD' && row.status === 'REFUND_PENDING'
                                            ? 'Chờ xử lý hoàn COD' : names[row.status] || row.status] }), _jsx("p", { className: "mt-1", children: row.reason }), _jsxs("p", { children: ["Ho\u00E0n t\u1ED1i \u0111a: ", vnd(row.eligibleRefundMinor)] }), row.sellerResponse && _jsxs("p", { children: ["Shop: ", row.sellerResponse] }), row.adminResponse && _jsxs("p", { children: ["Ph\u1EA3n h\u1ED3i c\u1EE7a s\u00E0n: ", row.adminResponse] }), detail.items?.map(item => _jsxs("p", { children: [item.name, " \u00D7 ", item.quantity, " \u00B7 ", vnd(item.eligibleRefundMinor)] }, item.orderItemId)), detail.evidence?.map(image => _jsx("button", { onClick: () => void openEvidence(row.id, image.id), className: "mr-2 text-[#476de4] underline", children: "Xem \u1EA3nh ch\u1EE9ng c\u1EE9" }, image.id)), detail.history?.map((event, index) => _jsxs("p", { className: "text-xs text-[#70819d]", children: [new Date(event.createdAt).toLocaleString('vi-VN'), " \u00B7 ", names[event.toStatus] || event.toStatus] }, index)), seller && ['UNDER_REVIEW'].includes(row.status) && _jsx("textarea", { value: response, onChange: e => setResponse(e.target.value), className: "mt-2 w-full rounded-lg border p-2", maxLength: 1000, placeholder: "Ph\u1EA3n h\u1ED3i seller (\u00EDt nh\u1EA5t 10 k\u00FD t\u1EF1)" }), _jsxs("div", { className: "mt-2 flex flex-wrap gap-2", children: [seller && row.status === 'REQUESTED' && _jsx("button", { disabled: busy, onClick: () => void command(row, 'review'), className: "rounded-lg border px-3 py-1", children: "B\u1EAFt \u0111\u1EA7u xem x\u00E9t" }), seller && row.status === 'UNDER_REVIEW' && _jsxs(_Fragment, { children: [_jsx("button", { disabled: busy, onClick: () => void command(row, 'approve'), className: "rounded-lg border px-3 py-1", children: "Ch\u1EA5p nh\u1EADn" }), _jsx("button", { disabled: busy, onClick: () => void command(row, 'reject'), className: "rounded-lg border px-3 py-1", children: "T\u1EEB ch\u1ED1i" })] }), !seller && row.status === 'APPROVED' && _jsx("button", { disabled: busy, onClick: () => void command(row, 'ship'), className: "rounded-lg border px-3 py-1", children: "\u0110\u00E3 g\u1EEDi h\u00E0ng tr\u1EA3" }), seller && row.status === 'RETURNING' && _jsx("button", { disabled: busy, onClick: () => { setReceiptId(row.id); setInspectionCondition('ACCEPTED'); setInspectionNote(''); }, className: "rounded-lg border px-3 py-1", children: "Ghi nh\u1EADn h\u00E0ng tr\u1EA3 v\u00E0 ki\u1EC3m tra" }), !seller && ['REFUNDED', 'REJECTED'].includes(row.status) && _jsx("button", { disabled: busy, onClick: () => void command(row, 'close'), className: "rounded-lg border px-3 py-1", children: "\u0110\u00F3ng y\u00EAu c\u1EA7u" })] }), seller && receiptId === row.id && _jsxs("form", { className: "mt-3 grid gap-2 rounded border bg-blue-50 p-3", onSubmit: event => { event.preventDefault(); void command(row, 'receive'); }, children: [_jsx("p", { children: "Ch\u1EC9 x\u00E1c nh\u1EADn khi \u0111\u00E3 nh\u1EADn h\u00E0ng th\u1EF1c t\u1EBF. K\u1EBFt qu\u1EA3 ch\u1EA5p nh\u1EADn s\u1EBD m\u1EDF lu\u1ED3ng ho\u00E0n ti\u1EC1n, ch\u01B0a x\u00E1c nh\u1EADn ti\u1EC1n \u0111\u00E3 chuy\u1EC3n." }), _jsxs("label", { children: ["K\u1EBFt qu\u1EA3 ki\u1EC3m tra", _jsxs("select", { className: "ml-2 rounded border p-2", value: inspectionCondition, onChange: event => setInspectionCondition(event.target.value), children: [_jsx("option", { value: "ACCEPTED", children: "Ch\u1EA5p nh\u1EADn h\u00E0ng tr\u1EA3" }), _jsx("option", { value: "ISSUE_FOUND", children: "C\u00F3 v\u1EA5n \u0111\u1EC1 c\u1EA7n s\u00E0n x\u00E1c minh, ch\u01B0a m\u1EDF ho\u00E0n ti\u1EC1n" })] })] }), _jsxs("label", { children: ["Ghi ch\u00FA ki\u1EC3m tra", _jsx("textarea", { required: true, minLength: 10, maxLength: 1000, className: "mt-1 w-full rounded border p-2", value: inspectionNote, onChange: event => setInspectionNote(event.target.value) })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", disabled: busy, onClick: () => setReceiptId(null), className: "rounded border px-3 py-1", children: "H\u1EE7y" }), _jsx("button", { disabled: busy || inspectionNote.trim().length < 10, className: "rounded border px-3 py-1", children: "X\u00E1c nh\u1EADn \u0111\u00E3 nh\u1EADn v\u00E0 ki\u1EC3m tra" })] })] })] }, row.id);
                    })] }), _jsx(CaseInformationPanel, { shopOrderId: order.id }), _jsx(CaseResolutionPanel, { shopOrderId: order.id })] });
}
