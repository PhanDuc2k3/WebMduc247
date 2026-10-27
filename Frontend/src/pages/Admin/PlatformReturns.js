import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, Image, RefreshCw, Search, Undo2 } from 'lucide-react';
import { adminReturnApi } from '../../api/adminReturnApi';
import { IdentityApiError } from '../../api/identityApi';
import { AdminDialog, date, formatNumber, money, StatusBadge } from './AdminUi';
import './admin-returns.css';
import CaseWorkspace from './CaseWorkspace';
import CaseQueueFilters from './CaseQueueFilters';
import ApprovalSelector from './ApprovalSelector';
import { useAdminSession } from './AdminSession';
import { hasAdminPermission } from './adminPolicy';
const statuses = [
    ['REQUESTED', 'Mới tiếp nhận'], ['UNDER_REVIEW', 'Đang xem xét'], ['APPROVED', 'Đã chấp nhận'],
    ['REJECTED', 'Đã từ chối'], ['RETURNING', 'Đang gửi trả'], ['RECEIVED', 'Đã nhận hàng trả'],
    ['REFUND_PENDING', 'Chờ hoàn tiền'], ['REFUNDED', 'Đã hoàn tiền'], ['CLOSED', 'Đã đóng'],
];
const reasons = { DAMAGED: 'Hàng hỏng', WRONG_ITEM: 'Giao sai hàng', NOT_AS_DESCRIBED: 'Không đúng mô tả', OTHER: 'Khác' };
const actions = { review: 'Bắt đầu xem xét', approve: 'Chấp nhận trả hàng', reject: 'Từ chối yêu cầu' };
const actors = { buyer: 'Người mua', seller: 'Người bán', platform_admin: 'Quản trị sàn', system: 'Hệ thống', payment: 'Thanh toán' };
const message = (cause) => cause instanceof Error ? cause.message : 'Chưa thể tải dữ liệu. Vui lòng thử lại.';
function Evidence({ requestId, id, createdAt }) {
    const [requested, setRequested] = useState(false), [imageUrl, setImageUrl] = useState('');
    const [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!requested)
            return;
        let active = true, url = '';
        let expiryTimer;
        setError('');
        setImageUrl('');
        adminReturnApi.evidence(requestId, id).then(({ blob, expiresAt }) => {
            if (!active)
                return;
            url = URL.createObjectURL(blob);
            setImageUrl(url);
            expiryTimer = setTimeout(() => { URL.revokeObjectURL(url); setImageUrl(''); setRequested(false); }, Math.max(0, Date.parse(expiresAt) - Date.now()));
        }).catch(cause => { if (active)
            setError(message(cause)); });
        return () => { active = false; clearTimeout(expiryTimer); if (url)
            URL.revokeObjectURL(url); };
    }, [requested, requestId, id, attempt]);
    return _jsxs("article", { className: "pa-return-evidence", children: [_jsx("small", { children: date(createdAt, true) }), !requested && _jsxs("button", { className: "pa-button pa-button-light", onClick: () => setRequested(true), children: [_jsx(Image, { size: 16 }), "Xem ch\u1EE9ng c\u1EE9"] }), requested && !imageUrl && !error && _jsx("p", { role: "status", children: "\u0110ang t\u1EA3i \u1EA3nh\u2026" }), imageUrl && _jsx("a", { href: imageUrl, target: "_blank", rel: "noreferrer", children: _jsx("img", { src: imageUrl, alt: "\u1EA2nh ch\u1EE9ng c\u1EE9 c\u1EE7a y\u00EAu c\u1EA7u tr\u1EA3 h\u00E0ng" }) }), error && _jsxs("div", { role: "alert", children: [_jsx("p", { children: error }), _jsx("button", { className: "pa-text-link", onClick: () => setAttempt(value => value + 1), children: "Th\u1EED l\u1EA1i" })] })] });
}
function ReturnDetail({ id, close, changed }) {
    const user = useAdminSession(), canModerate = hasAdminPermission(user, 'returns.moderate');
    const [approvalId, setApprovalId] = useState('');
    const [data, setData] = useState(null), [loading, setLoading] = useState(true);
    const [error, setError] = useState(''), [notice, setNotice] = useState(''), [revision, setRevision] = useState(0);
    const [action, setAction] = useState(null), [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false), [mustRefresh, setMustRefresh] = useState(false);
    const [responsibleParty, setResponsibleParty] = useState(''), [basisSummary, setBasisSummary] = useState(''), [evidenceRefs, setEvidenceRefs] = useState([]);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setData(null);
        setError('');
        setMustRefresh(false);
        setAction(null);
        setReason('');
        setResponsibleParty('');
        setBasisSummary('');
        setEvidenceRefs([]);
        adminReturnApi.detail(id).then(result => { if (active)
            setData(result); })
            .catch(cause => { if (active)
            setError(message(cause)); }).finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [id, revision]);
    async function decide(event) {
        event.preventDefault();
        if (!data || !action || busy || mustRefresh)
            return;
        setBusy(true);
        setError('');
        setNotice('');
        try {
            await adminReturnApi.decide(data.record, action, reason.trim(), action === 'review' ? undefined : { responsibleParty, policyVersion: 'CASE_RESOLUTION_V1', basisSummary: basisSummary.trim(), evidenceRefs }, approvalId || undefined);
            setNotice('Đã cập nhật yêu cầu và lưu lịch sử quản trị.');
            setRevision(value => value + 1);
            changed();
        }
        catch (cause) {
            setError(message(cause));
            if (!(cause instanceof IdentityApiError) || cause.status !== 400)
                setMustRefresh(true);
        }
        finally {
            setBusy(false);
        }
    }
    const record = data?.record;
    return _jsx(AdminDialog, { title: "Chi ti\u1EBFt y\u00EAu c\u1EA7u tr\u1EA3 h\u00E0ng", close: close, busy: busy, children: _jsxs("div", { className: "pa-detail pa-return-detail", "aria-busy": loading, children: [notice && _jsx("p", { className: "pa-return-success", role: "status", children: notice }), error && _jsxs("div", { className: "pa-error", role: "alert", children: [_jsx("span", { children: error }), _jsx("button", { className: "pa-text-link", disabled: busy, onClick: () => setRevision(value => value + 1), children: "T\u1EA3i l\u1EA1i chi ti\u1EBFt" })] }), loading && _jsx("p", { role: "status", className: "pa-detail-loading", children: "\u0110ang t\u1EA3i h\u1ED3 s\u01A1\u2026" }), record && data && _jsxs(_Fragment, { children: [_jsxs("div", { className: "pa-detail-badges", children: [_jsx(StatusBadge, { status: record.status }), _jsxs("span", { className: "pa-chip", children: ["Phi\u00EAn b\u1EA3n ", record.version] })] }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "M\u00E3 y\u00EAu c\u1EA7u" }), _jsx("dd", { children: record.id })] }), _jsxs("div", { children: [_jsx("dt", { children: "\u0110\u01A1n h\u00E0ng" }), _jsx("dd", { children: _jsxs(Link, { to: `/admin/orders?id=${record.shopOrderId}`, children: ["#", record.shopOrderId.slice(0, 8).toUpperCase(), " \u00B7 Xem chi ti\u1EBFt \u0111\u01A1n"] }) })] }), _jsxs("div", { children: [_jsx("dt", { children: "C\u1EEDa h\u00E0ng" }), _jsx("dd", { children: _jsx(Link, { to: `/admin/stores?id=${record.storeId}`, children: record.storeName }) })] }), _jsxs("div", { children: [_jsx("dt", { children: "Ng\u01B0\u1EDDi mua" }), _jsx("dd", { children: _jsx(Link, { to: `/admin/users?id=${record.buyerId}`, children: record.buyerId }) })] }), _jsxs("div", { children: [_jsx("dt", { children: "Ng\u00E0y ti\u1EBFp nh\u1EADn" }), _jsx("dd", { children: date(record.requestedAt, true) })] }), _jsxs("div", { children: [_jsx("dt", { children: "Ch\u00EDnh s\u00E1ch \u00E1p d\u1EE5ng" }), _jsxs("dd", { children: [record.windowDays || 7, " ng\u00E0y \u00B7 ", record.policyVersion || 'Chưa có phiên bản', record.deliveredAt && _jsxs("small", { children: ["Giao h\u00E0ng: ", date(record.deliveredAt, true)] }), record.exceptionId && _jsx("small", { children: "\u0110\u00E3 duy\u1EC7t ngo\u1EA1i l\u1EC7 ngo\u00E0i h\u1EA1n" })] })] }), _jsxs("div", { children: [_jsx("dt", { children: "L\u00FD do" }), _jsx("dd", { children: reasons[record.reasonCode] || record.reasonCode })] }), _jsxs("div", { children: [_jsx("dt", { children: "Ph\u01B0\u01A1ng \u00E1n" }), _jsx("dd", { children: record.resolution === 'REFUND' ? 'Trả hàng và hoàn tiền' : 'Đổi hàng (cần xử lý riêng)' })] }), _jsxs("div", { children: [_jsx("dt", { children: "N\u1ED9i dung kh\u00E1ch g\u1EEDi" }), _jsx("dd", { className: "pa-return-text", children: record.reason })] }), _jsxs("div", { children: [_jsx("dt", { children: "Thanh to\u00E1n" }), _jsxs("dd", { children: [record.paymentMethod, " \u00B7 ", _jsx(StatusBadge, { status: record.paymentStatus })] })] }), _jsxs("div", { children: [_jsx("dt", { children: "Gi\u00E1 tr\u1ECB \u0111\u01A1n" }), _jsx("dd", { children: money(record.orderTotalMinor) })] }), _jsxs("div", { children: [_jsx("dt", { children: "Ti\u1EC1n \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n ho\u00E0n" }), _jsxs("dd", { children: [_jsx("strong", { children: money(record.eligibleRefundMinor) }), " (g\u1ED3m ", money(record.shippingRefundMinor), " ph\u00ED giao h\u00E0ng)"] })] }), _jsxs("div", { children: [_jsx("dt", { children: "\u0110\u01A1n \u0111\u00E3 ho\u00E0n" }), _jsx("dd", { children: money(record.refundedMinor) })] }), record.refundReference && _jsxs("div", { children: [_jsx("dt", { children: "M\u00E3 ho\u00E0n ti\u1EC1n" }), _jsx("dd", { children: record.refundReference })] }), record.sellerResponse && _jsxs("div", { children: [_jsx("dt", { children: "Ph\u1EA3n h\u1ED3i shop" }), _jsx("dd", { className: "pa-return-text", children: record.sellerResponse })] }), record.adminResponse && _jsxs("div", { children: [_jsx("dt", { children: "Ph\u1EA3n h\u1ED3i c\u1EE7a s\u00E0n" }), _jsx("dd", { className: "pa-return-text", children: record.adminResponse })] })] }), _jsx("p", { className: "pa-return-note", children: "Ch\u1EA5p nh\u1EADn tr\u1EA3 h\u00E0ng cho ph\u00E9p ng\u01B0\u1EDDi mua ti\u1EBFp t\u1EE5c g\u1EEDi tr\u1EA3. Ti\u1EC1n ch\u1EC9 \u0111\u01B0\u1EE3c ghi nh\u1EADn \u0111\u00E3 ho\u00E0n sau khi lu\u1ED3ng thanh to\u00E1n x\u00E1c nh\u1EADn k\u1EBFt qu\u1EA3." }), record.status === 'REFUND_PENDING' && _jsx("p", { className: "pa-warning", children: record.paymentMethod === 'COD'
                                ? 'Yêu cầu COD đang chờ phương án chi trả và xác minh hoàn tiền.'
                                : record.refundNeedsAttention ? 'Lần xử lý hoàn tiền có lỗi. Cần kiểm tra kết quả thanh toán trước khi xử lý tiếp.'
                                    : 'Đang chờ kết quả hoàn tiền được xác minh từ dịch vụ thanh toán.' }), _jsxs("section", { className: "pa-detail-section", children: [_jsx("h3", { children: "S\u1EA3n ph\u1EA9m tr\u1EA3 h\u00E0ng" }), _jsx("div", { className: "pa-table-scroll", children: _jsxs("table", { className: "pa-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "S\u1EA3n ph\u1EA9m / SKU" }), _jsx("th", { children: "S\u1ED1 l\u01B0\u1EE3ng tr\u1EA3" }), _jsx("th", { children: "Ti\u1EC1n h\u00E0ng \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n ho\u00E0n" })] }) }), _jsx("tbody", { children: record.items?.map(item => _jsxs("tr", { children: [_jsxs("td", { children: [_jsx("strong", { children: item.name }), _jsx("small", { children: item.sku })] }), _jsx("td", { children: item.quantity }), _jsx("td", { children: money(item.eligibleRefundMinor) })] }, item.orderItemId)) })] }) })] }), _jsxs("section", { className: "pa-detail-section", children: [_jsxs("h3", { children: ["Ch\u1EE9ng c\u1EE9 (", record.evidence?.length || 0, ")"] }), _jsx("p", { className: "pa-detail-muted", children: "Li\u00EAn k\u1EBFt xem \u1EA3nh d\u00F9ng m\u1ED9t l\u1EA7n, h\u1EBFt h\u1EA1n sau 60 gi\u00E2y v\u00E0 ki\u1EC3m tra l\u1EA1i ph\u00E2n c\u00F4ng khi t\u1EA3i. M\u1ED7i l\u1EA7n truy c\u1EADp \u0111\u01B0\u1EE3c ghi nh\u1EADt k\u00FD." }), !data.case.canViewEvidence && _jsx("p", { className: "pa-case-permission-note", children: "C\u1EA7n \u0111\u01B0\u1EE3c ph\u00E2n c\u00F4ng h\u1ED3 s\u01A1 ho\u1EB7c c\u00F3 quy\u1EC1n gi\u00E1m s\u00E1t ch\u1EE9ng c\u1EE9 \u0111\u1EC3 xem \u1EA3nh. B\u1EA1n c\u00F3 th\u1EC3 nh\u1EADn h\u1ED3 s\u01A1 \u1EDF ph\u1EA7n ph\u00E2n c\u00F4ng b\u00EAn d\u01B0\u1EDBi." }), record.evidence?.length ? data.case.canViewEvidence && _jsx("div", { className: "pa-return-evidence-grid", children: record.evidence.map(image => _jsx(Evidence, { requestId: record.id, ...image }, image.id)) }) : _jsx("p", { className: "pa-detail-muted", children: "Ch\u01B0a c\u00F3 \u1EA3nh ch\u1EE9ng c\u1EE9." })] }), _jsx(CaseWorkspace, { detail: data.case, refresh: () => { setRevision(value => value + 1); changed(); }, onBusy: setBusy }, `${id}-${data.case.record.caseVersion}`), _jsxs("section", { className: "pa-detail-section", children: [_jsx("h3", { children: "L\u1ECBch s\u1EED x\u1EED l\u00FD" }), _jsxs("ol", { className: "pa-history", children: [data.history.map((entry, index) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx(StatusBadge, { status: entry.toStatus }), _jsx("time", { children: date(entry.createdAt, true) })] }), _jsx("p", { children: entry.note || 'Không có ghi chú.' }), _jsx("small", { children: actors[entry.actorType] || entry.actorType })] }, `${entry.createdAt}-${index}`)), !data.history.length && _jsx("li", { children: "Ch\u01B0a c\u00F3 l\u1ECBch s\u1EED." })] })] }), _jsxs("section", { className: "pa-detail-section", children: [_jsx("h3", { children: "Nh\u1EADt k\u00FD qu\u1EA3n tr\u1ECB g\u1EA7n \u0111\u00E2y" }), _jsx("p", { className: "pa-detail-muted", children: "T\u1ED1i \u0111a 100 thao t\u00E1c g\u1EA7n nh\u1EA5t. L\u00E0m m\u1EDBi chi ti\u1EBFt \u0111\u1EC3 xem l\u1EA7n m\u1EDF ch\u1EE9ng c\u1EE9 v\u1EEBa th\u1EF1c hi\u1EC7n." }), _jsxs("ol", { className: "pa-history", children: [data.audit.map(entry => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: entry.action === 'view_evidence' ? 'Xem chứng cứ' : actions[entry.action] || entry.action }), _jsx("time", { children: date(entry.createdAt, true) })] }), _jsx("p", { children: entry.reason }), _jsxs("small", { children: ["Qu\u1EA3n tr\u1ECB vi\u00EAn ", entry.actorId.slice(0, 8)] })] }, entry.id)), !data.audit.length && _jsx("li", { children: "Ch\u01B0a c\u00F3 thao t\u00E1c qu\u1EA3n tr\u1ECB." })] })] }), !action && canModerate && _jsxs("div", { className: "pa-dialog-actions", children: [_jsxs("button", { className: "pa-button pa-button-light", disabled: busy, onClick: () => setRevision(value => value + 1), children: [_jsx(RefreshCw, { size: 15 }), "L\u00E0m m\u1EDBi chi ti\u1EBFt"] }), record.status === 'REQUESTED' && record.resolution === 'REFUND' && _jsx("button", { className: "pa-button", disabled: mustRefresh || busy, onClick: () => setAction('review'), children: "B\u1EAFt \u0111\u1EA7u xem x\u00E9t" }), record.status === 'UNDER_REVIEW' && record.resolution === 'REFUND' && _jsxs(_Fragment, { children: [_jsx("button", { className: "pa-button pa-button-danger", disabled: mustRefresh || busy, onClick: () => setAction('reject'), children: "T\u1EEB ch\u1ED1i y\u00EAu c\u1EA7u" }), _jsx("button", { className: "pa-button", disabled: mustRefresh || busy, onClick: () => setAction('approve'), children: "Ch\u1EA5p nh\u1EADn tr\u1EA3 h\u00E0ng" })] })] }), action && _jsxs("form", { className: "pa-confirm-box", onSubmit: decide, children: [_jsx("h3", { children: actions[action] }), action === 'approve' && _jsx(ApprovalSelector, { operation: "return_approve", targetId: record.id, version: record.version, value: approvalId, onChange: setApprovalId }), _jsxs("p", { children: ["\u00C1p d\u1EE5ng cho y\u00EAu c\u1EA7u #", record.id.slice(0, 8).toUpperCase(), " c\u1EE7a ", record.storeName, ". N\u1ED9i dung ph\u1EA3n h\u1ED3i \u0111\u01B0\u1EE3c l\u01B0u trong l\u1ECBch s\u1EED v\u00E0 hi\u1EC3n th\u1ECB cho ng\u01B0\u1EDDi mua, c\u1EEDa h\u00E0ng."] }), _jsxs("label", { htmlFor: "return-decision-reason", children: ["L\u00FD do / ph\u1EA3n h\u1ED3i (10\u2013500 k\u00FD t\u1EF1)", _jsx("textarea", { id: "return-decision-reason", value: reason, onChange: event => setReason(event.target.value), minLength: 10, maxLength: 500, required: true, disabled: busy })] }), action !== 'review' && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["B\u00EAn ch\u1ECBu tr\u00E1ch nhi\u1EC7m", _jsxs("select", { id: "return-responsible-party", required: true, value: responsibleParty, onChange: event => setResponsibleParty(event.target.value), children: [_jsx("option", { value: "", children: "Ch\u1ECDn b\u00EAn" }), _jsx("option", { value: "BUYER", children: "Ng\u01B0\u1EDDi mua" }), _jsx("option", { value: "SELLER", children: "Shop" }), _jsx("option", { value: "CARRIER", children: "V\u1EADn chuy\u1EC3n" }), _jsx("option", { value: "PLATFORM", children: "S\u00E0n" }), _jsx("option", { value: "UNDETERMINED", children: "Ch\u01B0a x\u00E1c \u0111\u1ECBnh" })] })] }), _jsx("p", { className: "pa-detail-muted", children: "Policy x\u1EED l\u00FD: CASE_RESOLUTION_V1. Ch\u00EDnh s\u00E1ch tr\u1EA3 h\u00E0ng g\u1ED1c \u0111\u01B0\u1EE3c gi\u1EEF nguy\u00EAn trong snapshot." }), _jsxs("label", { children: ["C\u01A1 s\u1EDF b\u1EB1ng ch\u1EE9ng / l\u00FD do thi\u1EBFu ch\u1EE9ng c\u1EE9", _jsx("textarea", { id: "return-basis-summary", required: true, minLength: 10, maxLength: 2000, value: basisSummary, onChange: event => setBasisSummary(event.target.value) })] }), record.evidence?.map(image => _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: evidenceRefs.some(ref => ref.id === image.id), onChange: event => setEvidenceRefs(current => event.target.checked ? [...current, { kind: 'RETURN_EVIDENCE', id: image.id }] : current.filter(ref => ref.id !== image.id)) }), " D\u00F9ng \u1EA3nh #", image.id.slice(0, 8), " l\u00E0m c\u0103n c\u1EE9"] }, image.id))] }), mustRefresh && _jsx("p", { role: "status", children: "C\u1EA7n t\u1EA3i l\u1EA1i h\u1ED3 s\u01A1 \u0111\u1EC3 x\u00E1c nh\u1EADn tr\u1EA1ng th\u00E1i hi\u1EC7n t\u1EA1i tr\u01B0\u1EDBc khi th\u1EED ti\u1EBFp." }), _jsxs("div", { className: "pa-dialog-actions", children: [_jsx("button", { type: "button", className: "pa-button pa-button-light", disabled: busy, onClick: () => { setAction(null); setReason(''); }, children: "H\u1EE7y" }), _jsx("button", { className: `pa-button ${action === 'reject' ? 'pa-button-danger' : ''}`, disabled: busy || mustRefresh || reason.trim().length < 10 || (action !== 'review' && (!responsibleParty || basisSummary.trim().length < 10)), children: busy ? 'Đang xử lý…' : `Xác nhận ${actions[action].toLowerCase()}` })] })] })] })] }) });
}
export default function PlatformReturns() {
    const [params, setParams] = useSearchParams();
    const q = params.get('q') || '', status = params.get('status') || '', paymentMethod = params.get('paymentMethod') || '';
    const from = params.get('from') || '', to = params.get('to') || '', storeId = params.get('storeId') || '';
    const reasonCode = params.get('reasonCode') || '', assigneeId = params.get('assigneeId') || '', due = params.get('due') || '';
    const selected = params.get('id') || '', rawPage = Number(params.get('page') || 1);
    const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 10000 ? rawPage : 1;
    const [draft, setDraft] = useState(q), [data, setData] = useState(null);
    const [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
    useEffect(() => setDraft(q), [q]);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        setData(null);
        adminReturnApi.list({ q, status, paymentMethod, from, to, storeId, reasonCode, assigneeId, due, page, limit: 12 })
            .then(result => { if (active)
            setData(result); }).catch(cause => { if (active)
            setError(message(cause)); })
            .finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [q, status, paymentMethod, from, to, storeId, reasonCode, assigneeId, due, page, revision]);
    function filter(key, value) {
        const next = new URLSearchParams(params);
        if (value)
            next.set(key, value);
        else
            next.delete(key);
        if (key !== 'page' && key !== 'id')
            next.delete('page');
        setParams(next);
    }
    function search(event) { event.preventDefault(); filter('q', draft.trim()); }
    const filtered = Boolean(q || status || paymentMethod || from || to || storeId || reasonCode || assigneeId || due);
    return _jsxs("div", { className: "pa-page", children: [_jsxs("div", { className: "pa-page-heading", children: [_jsxs("div", { children: [_jsx("span", { className: "pa-eyebrow", children: "H\u1EACU M\u00C3I V\u00C0 X\u1EEC L\u00DD Y\u00CAU C\u1EA6U" }), _jsx("h1", { children: "Tr\u1EA3 h\u00E0ng" }), _jsx("p", { children: "Tra c\u1EE9u h\u1ED3 s\u01A1, xem ch\u1EE9ng c\u1EE9 v\u00E0 x\u1EED l\u00FD y\u00EAu c\u1EA7u c\u1EE7a ng\u01B0\u1EDDi mua." })] }), _jsxs("button", { className: "pa-button pa-button-light", disabled: loading, onClick: () => setRevision(value => value + 1), children: [_jsx(RefreshCw, { size: 16, className: loading ? 'animate-spin' : '' }), "L\u00E0m m\u1EDBi"] })] }), _jsxs("nav", { className: "pa-case-tabs", "aria-label": "Lo\u1EA1i h\u1ED3 s\u01A1 h\u1EADu m\u00E3i", children: [_jsx(Link, { className: "is-active", to: "/admin/returns", children: "Tr\u1EA3 h\u00E0ng" }), _jsx(Link, { to: "/admin/cases?kind=DISPUTE", children: "Khi\u1EBFu n\u1EA1i / tranh ch\u1EA5p" }), _jsx(Link, { to: "/admin/cases?kind=TICKET", children: "Ticket h\u1ED7 tr\u1EE3" }), _jsx(Link, { to: "/admin/return-exceptions", children: "Ngo\u1EA1i l\u1EC7 ngo\u00E0i h\u1EA1n" })] }), _jsxs("section", { className: "pa-panel", children: [_jsxs("div", { className: "pa-records-top", children: [_jsxs("div", { children: [_jsx(Undo2, { size: 18 }), _jsx("h2", { children: "Y\u00EAu c\u1EA7u tr\u1EA3 h\u00E0ng" }), _jsx("span", { className: "pa-count-chip", children: data ? formatNumber(data.total) : '—' })] }), _jsxs("form", { className: "pa-search", onSubmit: search, children: [_jsx(Search, { size: 17 }), _jsx("input", { "aria-label": "T\u00ECm y\u00EAu c\u1EA7u tr\u1EA3 h\u00E0ng", placeholder: "M\u00E3 y\u00EAu c\u1EA7u, \u0111\u01A1n h\u00E0ng, t\u00EAn shop\u2026", maxLength: 100, value: draft, onChange: event => setDraft(event.target.value) }), _jsx("button", { type: "submit", children: "T\u00ECm ki\u1EBFm" })] })] }), _jsxs("div", { className: "pa-filters pa-return-filters", children: [_jsxs("label", { children: ["Tr\u1EA1ng th\u00E1i", _jsxs("select", { value: status, onChange: event => filter('status', event.target.value), children: [_jsx("option", { value: "", children: "T\u1EA5t c\u1EA3 tr\u1EA1ng th\u00E1i" }), statuses.map(([value, label]) => _jsx("option", { value: value, children: label }, value))] })] }), _jsxs("label", { children: ["Thanh to\u00E1n", _jsxs("select", { value: paymentMethod, onChange: event => filter('paymentMethod', event.target.value), children: [_jsx("option", { value: "", children: "T\u1EA5t c\u1EA3 ph\u01B0\u01A1ng th\u1EE9c" }), ['COD', 'MOMO', 'VIETQR'].map(value => _jsx("option", { value: value, children: value }, value))] })] }), _jsxs("label", { children: ["T\u1EEB ng\u00E0y", _jsx("input", { type: "date", value: from, max: to || undefined, onChange: event => filter('from', event.target.value) })] }), _jsxs("label", { children: ["\u0110\u1EBFn ng\u00E0y", _jsx("input", { type: "date", value: to, min: from || undefined, onChange: event => filter('to', event.target.value) })] }), _jsx(CaseQueueFilters, { reasonCode: reasonCode, storeId: storeId, assigneeId: assigneeId, due: due, onFilter: filter }), filtered && _jsx("button", { className: "pa-text-link", onClick: () => setParams(selected ? { id: selected } : {}), children: "X\u00F3a b\u1ED9 l\u1ECDc" })] }), _jsx("p", { className: "pa-return-filter-note", children: "Ng\u00E0y ti\u1EBFp nh\u1EADn t\u00EDnh theo gi\u1EDD Vi\u1EC7t Nam (UTC+7)." }), error && _jsxs("div", { className: "pa-error pa-record-error", role: "alert", children: [error, _jsx("button", { className: "pa-text-link", onClick: () => setRevision(value => value + 1), children: "Th\u1EED l\u1EA1i" })] }), _jsx("div", { className: "pa-table-scroll", "aria-busy": loading, children: _jsxs("table", { className: "pa-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Y\u00EAu c\u1EA7u / c\u1EEDa h\u00E0ng" }), _jsx("th", { children: "L\u00FD do" }), _jsx("th", { children: "Ti\u1EC1n \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n ho\u00E0n" }), _jsx("th", { children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { children: "H\u1EA1n x\u1EED l\u00FD" }), _jsx("th", { children: "Ti\u1EBFp nh\u1EADn" }), _jsx("th", { children: "Thao t\u00E1c" })] }) }), _jsxs("tbody", { children: [data?.items.map(row => _jsxs("tr", { children: [_jsxs("td", { children: [_jsxs("strong", { className: "pa-row-title", children: ["#", row.id.slice(0, 8).toUpperCase()] }), _jsx("small", { children: row.storeName }), _jsxs("small", { children: ["\u0110\u01A1n #", row.shopOrderId.slice(0, 8).toUpperCase()] })] }), _jsx("td", { children: reasons[row.reasonCode] || row.reasonCode }), _jsxs("td", { className: "pa-table-money", children: [money(row.eligibleRefundMinor), _jsx("small", { children: row.paymentMethod })] }), _jsxs("td", { children: [_jsx(StatusBadge, { status: row.status }), row.refundNeedsAttention && _jsx("small", { children: "C\u1EA7n ki\u1EC3m tra ho\u00E0n ti\u1EC1n" })] }), _jsxs("td", { children: [date(row.dueAt, true), _jsx("small", { children: row.assigneeId ? 'Đã phân công' : 'Chưa phân công' })] }), _jsx("td", { children: date(row.requestedAt, true) }), _jsx("td", { children: _jsxs("button", { className: "pa-row-action", onClick: () => filter('id', row.id), "aria-label": `Xem yêu cầu ${row.id}`, children: [_jsx(Eye, { size: 16 }), _jsx("span", { children: "Chi ti\u1EBFt" })] }) })] }, row.id)), !data?.items.length && _jsx("tr", { children: _jsx("td", { colSpan: 7, className: "pa-empty-cell", children: loading ? 'Đang tải yêu cầu…' : error ? 'Dữ liệu chưa sẵn sàng.' : filtered ? 'Không có yêu cầu phù hợp với bộ lọc.' : 'Chưa có yêu cầu trả hàng.' }) })] })] }) }), _jsxs("div", { className: "pa-pagination", children: [_jsx("span", { children: data ? `${formatNumber(data.total)} yêu cầu` : 'Chưa tải dữ liệu' }), _jsxs("div", { children: [_jsx("button", { "aria-label": "Trang tr\u01B0\u1EDBc", disabled: loading || page <= 1, onClick: () => filter('page', String(page - 1)), children: _jsx(ChevronLeft, { size: 17 }) }), _jsxs("span", { children: ["Trang ", page, " / ", Math.max(1, data?.totalPages || 1)] }), _jsx("button", { "aria-label": "Trang sau", disabled: loading || !data || page >= data.totalPages, onClick: () => filter('page', String(page + 1)), children: _jsx(ChevronRight, { size: 17 }) })] })] })] }), selected && _jsx(ReturnDetail, { id: selected, close: () => filter('id', ''), changed: () => setRevision(value => value + 1) }, selected)] });
}
