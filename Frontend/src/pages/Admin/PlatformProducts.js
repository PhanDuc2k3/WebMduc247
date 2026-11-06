import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { platformAdminApi } from '../../api/platformAdminApi';
import { catalogApi } from '../../api/catalogApi';
import { productModerationApi as api } from '../../api/productModerationApi';
import { adminRequestId } from '../../api/adminCommand';
import { AdminDialog, date, money, StatusBadge } from './AdminUi';
import ProductWorkspace, { reasonLinks } from './ProductWorkspace';
import { hasAdminPermission } from './adminPolicy';
import { useAdminSession } from './AdminSession';
import './product-admin.css';
const groups = { MISLEADING: 'Nội dung sai lệch', PROHIBITED: 'Hàng bị cấm', INAPPROPRIATE_IMAGE: 'Ảnh không phù hợp', COUNTERFEIT: 'Giả mạo thương hiệu', SPAM: 'Spam', REMEDIATION: 'Khắc phục / xét lại' };
const flatten = (items) => items.flatMap(item => [item, ...flatten(item.children)]);
function PublicationPolicy() {
    const [policy, setPolicy] = useState(null), [required, setRequired] = useState(false), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const attempt = useRef({ signature: '', requestId: '' });
    function load() { api.rules().then(r => { setPolicy(r.policy); setRequired(r.policy.prePublicationReview); }).catch(e => setError(e.message)); }
    useEffect(load, []);
    async function save(e) {
        e.preventDefault();
        if (!policy)
            return;
        setBusy(true);
        setError('');
        const input = { approvalRequired: required, version: policy.version, reason };
        try {
            await api.savePolicy({ ...input, requestId: adminRequestId(attempt.current, input) });
            load();
            setReason('');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Chưa lưu được chính sách.');
        }
        finally {
            setBusy(false);
        }
    }
    return _jsxs("details", { className: "pa-panel", children: [_jsx("summary", { className: "product-rules", children: "Ch\u00EDnh s\u00E1ch duy\u1EC7t tr\u01B0\u1EDBc \u0111\u0103ng" }), _jsxs("form", { className: "product-rules", onSubmit: save, children: [_jsx("p", { children: "Khi b\u1EADt, s\u1EA3n ph\u1EA9m m\u1EDBi v\u00E0 thay \u0111\u1ED5i t\u00EAn, m\u00F4 t\u1EA3, \u1EA3nh, danh m\u1EE5c, th\u01B0\u01A1ng hi\u1EC7u, gi\u00E1, bi\u1EBFn th\u1EC3 ho\u1EB7c thu\u1ED9c t\u00EDnh ph\u1EA3i \u0111\u01B0\u1EE3c duy\u1EC7t tr\u01B0\u1EDBc khi hi\u1EC3n th\u1ECB. Thay \u0111\u1ED5i ri\u00EAng s\u1ED1 t\u1ED3n kho kh\u00F4ng c\u1EA7n duy\u1EC7t l\u1EA1i." }), _jsx("p", { children: "S\u1EA3n ph\u1EA9m hi\u1EC7n c\u00F3 \u0111\u01B0\u1EE3c gi\u1EEF tr\u1EA1ng th\u00E1i \u0111\u1EBFn l\u1EA7n thay \u0111\u1ED5i n\u1ED9i dung ti\u1EBFp theo. T\u1EAFt ch\u00EDnh s\u00E1ch d\u1EEBng t\u1EA1o y\u00EAu c\u1EA7u duy\u1EC7t m\u1EDBi; c\u00E1c b\u1EA3n \u0111ang ch\u1EDD v\u1EABn c\u1EA7n \u0111\u01B0\u1EE3c x\u1EED l\u00FD." }), error && _jsxs("p", { className: "pa-error", role: "alert", children: [error, " ", _jsx("button", { type: "button", onClick: load, children: "T\u1EA3i l\u1EA1i" })] }), _jsxs("label", { children: ["Duy\u1EC7t tr\u01B0\u1EDBc \u0111\u0103ng", _jsxs("select", { disabled: !policy || busy, value: String(required), onChange: e => setRequired(e.target.value === 'true'), children: [_jsx("option", { value: "false", children: "T\u1EAFt" }), _jsx("option", { value: "true", children: "B\u1EADt" })] })] }), _jsxs("label", { children: ["L\u00FD do thay \u0111\u1ED5i", _jsx("textarea", { required: true, minLength: 8, maxLength: 500, value: reason, onChange: e => setReason(e.target.value) })] }), _jsx("button", { className: "pa-button", disabled: !policy || busy || policy.prePublicationReview === required, children: busy ? 'Đang lưu…' : 'Lưu chính sách' })] })] });
}
function RuleEditor({ rules, refresh }) {
    const [selected, setSelected] = useState(''), [code, setCode] = useState(''), [group, setGroup] = useState('MISLEADING'), [label, setLabel] = useState(''), [description, setDescription] = useState(''), [enabled, setEnabled] = useState(true), [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), attempt = useRef({ signature: '', requestId: '' });
    function choose(value) { setSelected(value); const rule = rules.find(r => r.code === value); setCode(rule?.code || ''); setGroup(rule?.violation_group || 'MISLEADING'); setLabel(rule?.label || ''); setDescription(rule?.description || ''); setEnabled(rule?.enabled ?? true); }
    async function save(e) {
        e.preventDefault();
        setBusy(true);
        setError('');
        const input = { code, group, label, description, enabled, reason, version: Number(rules.find(r => r.code === selected)?.version ?? 0) };
        try {
            await api.saveRule({ ...input, requestId: adminRequestId(attempt.current, input) });
            refresh();
            setReason('');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể lưu quy tắc.');
        }
        finally {
            setBusy(false);
        }
    }
    return _jsxs("details", { className: "pa-panel", children: [_jsx("summary", { className: "product-rules", children: "C\u1EA5u h\u00ECnh quy t\u1EAFc vi ph\u1EA1m" }), _jsxs("form", { className: "product-rules", onSubmit: save, children: [error && _jsx("p", { className: "pa-error", role: "alert", children: error }), _jsxs("label", { children: ["Quy t\u1EAFc", _jsxs("select", { value: selected, onChange: e => choose(e.target.value), children: [_jsx("option", { value: "", children: "Th\u00EAm quy t\u1EAFc" }), rules.map(r => _jsxs("option", { value: r.code, children: [r.code, " \u00B7 ", r.enabled ? 'Đang dùng' : 'Đã tắt'] }, r.code))] })] }), _jsxs("label", { children: ["M\u00E3", _jsx("input", { required: true, pattern: "[A-Z][A-Z0-9_]{2,59}", value: code, disabled: !!selected, onChange: e => setCode(e.target.value) })] }), _jsxs("label", { children: ["Nh\u00F3m", _jsx("select", { value: group, onChange: e => setGroup(e.target.value), children: Object.entries(groups).map(([key, label]) => _jsx("option", { value: key, children: label }, key)) })] }), _jsxs("label", { children: ["T\u00EAn quy t\u1EAFc", _jsx("input", { required: true, minLength: 3, maxLength: 200, value: label, onChange: e => setLabel(e.target.value) })] }), _jsxs("label", { children: ["N\u1ED9i dung ch\u00EDnh s\u00E1ch", _jsx("textarea", { maxLength: 2000, value: description, onChange: e => setDescription(e.target.value) })] }), _jsxs("label", { children: ["\u00C1p d\u1EE5ng", _jsxs("select", { value: String(enabled), onChange: e => setEnabled(e.target.value === 'true'), children: [_jsx("option", { value: "true", children: "\u0110ang d\u00F9ng" }), _jsx("option", { value: "false", children: "\u0110\u00E3 t\u1EAFt" })] })] }), _jsxs("label", { children: ["L\u00FD do thay \u0111\u1ED5i", _jsx("textarea", { required: true, minLength: 8, maxLength: 500, value: reason, onChange: e => setReason(e.target.value) })] }), _jsx("button", { className: "pa-button", disabled: busy, children: busy ? 'Đang lưu…' : 'Lưu quy tắc' })] })] });
}
function BulkDialog({ items, rules, close, changed }) {
    const [autoRun, setAutoRun] = useState(true);
    const [action, setAction] = useState('suspend'), [code, setCode] = useState(''), [reason, setReason] = useState(''), [evidence, setEvidence] = useState(''), [preview, setPreview] = useState(null), [job, setJob] = useState(null), [resumeId, setResumeId] = useState('');
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function view(e) { e.preventDefault(); setBusy(true); setError(''); try {
        setPreview(await api.preview(items.map(i => ({ id: i.id, version: i.version })), { action, reasonCode: code, reason, evidence: reasonLinks(evidence) }));
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Không thể xem trước.');
    }
    finally {
        setBusy(false);
    } }
    async function run(existing) {
        setBusy(true);
        setError('');
        try {
            let current = existing || job || await api.createJob(preview.id);
            setJob(current);
            sessionStorage.setItem('product-moderation-job', current.id);
            current = await api.job(current.id, true);
            setJob(current);
            changed();
            if (current.status === 'COMPLETED')
                sessionStorage.removeItem('product-moderation-job');
        }
        catch (e) {
            setAutoRun(false);
            setError(e instanceof Error ? e.message : 'Chưa hoàn tất job. Có thể tiếp tục bằng mã job.');
        }
        finally {
            setBusy(false);
        }
    }
    useEffect(() => { setResumeId(sessionStorage.getItem('product-moderation-job') || ''); }, []);
    useEffect(() => { if (!job || job.status === 'COMPLETED' || busy || !autoRun)
        return; const timer = window.setTimeout(() => void run(), 250); return () => window.clearTimeout(timer); }, [job, busy, autoRun]);
    return _jsx(AdminDialog, { title: "Ki\u1EC3m duy\u1EC7t h\u00E0ng lo\u1EA1t", close: close, busy: busy, children: _jsxs("div", { className: "product-bulk", children: [error && _jsx("p", { className: "pa-error", role: "alert", children: error }), !job && _jsxs("label", { children: ["Ti\u1EBFp t\u1EE5c job \u0111\u00E3 t\u1EA1o", _jsx("input", { value: resumeId, onChange: e => setResumeId(e.target.value), placeholder: "M\u00E3 job" }), _jsx("button", { className: "pa-button pa-button-light", disabled: busy || !resumeId, onClick: () => { setBusy(true); api.job(resumeId).then(setJob).catch(e => setError(e.message)).finally(() => setBusy(false)); }, children: "T\u1EA3i job" })] }), !preview && !job && _jsxs("form", { onSubmit: view, className: "product-bulk", children: [_jsxs("p", { children: ["Ch\u1EC9 x\u1EED l\u00FD ", items.length, " s\u1EA3n ph\u1EA9m \u0111\u00E3 ch\u1ECDn r\u00F5 trong trang hi\u1EC7n t\u1EA1i. T\u1ED1i \u0111a 200 m\u1EE5c m\u1ED7i job."] }), _jsxs("label", { children: ["Thao t\u00E1c", _jsxs("select", { value: action, onChange: e => setAction(e.target.value), children: [_jsx("option", { value: "suspend", children: "\u1EA8n b\u1EDFi s\u00E0n" }), _jsx("option", { value: "restore", children: "Kh\u00F4i ph\u1EE5c" })] })] }), _jsxs("label", { children: ["M\u00E3 l\u00FD do chung", _jsxs("select", { required: true, value: code, onChange: e => setCode(e.target.value), children: [_jsx("option", { value: "", children: "Ch\u1ECDn m\u00E3 l\u00FD do" }), rules.filter(r => r.enabled && (action !== 'suspend' || r.violation_group !== 'REMEDIATION')).map(r => _jsx("option", { value: r.code, children: r.label }, r.code))] })] }), _jsxs("label", { children: ["Gi\u1EA3i th\u00EDch chung", _jsx("textarea", { required: true, minLength: 8, maxLength: 500, value: reason, onChange: e => setReason(e.target.value) })] }), _jsxs("label", { children: ["B\u1EB1ng ch\u1EE9ng, m\u1ED7i d\u00F2ng m\u1ED9t li\u00EAn k\u1EBFt", _jsx("textarea", { value: evidence, onChange: e => setEvidence(e.target.value) })] }), _jsx("button", { className: "pa-button", disabled: busy || !items.length, children: "Xem tr\u01B0\u1EDBc danh s\u00E1ch v\u00E0 quy\u1EC1n t\u1EEBng m\u1EE5c" })] }), preview && !job && _jsxs(_Fragment, { children: [_jsx("p", { children: _jsxs("strong", { children: [preview.command.action === 'suspend' ? 'Ẩn' : 'Khôi phục', " \u00B7 ", preview.command.reasonCode] }) }), _jsx("p", { children: preview.command.reason }), _jsxs("p", { children: [preview.items.filter(i => i.eligible).length, " m\u1EE5c \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n. Quy\u1EC1n v\u00E0 phi\u00EAn b\u1EA3n s\u1EBD \u0111\u01B0\u1EE3c ki\u1EC3m tra l\u1EA1i khi x\u1EED l\u00FD."] }), _jsx("div", { className: "product-bulk-results", children: preview.items.map(i => _jsxs("p", { children: [i.name || i.id, " \u00B7 ", i.eligible ? 'Đủ điều kiện' : i.message] }, i.id)) }), _jsx("button", { className: "pa-button", disabled: busy || !preview.items.some(i => i.eligible), onClick: () => void run(), children: busy ? 'Đang xử lý…' : 'Xác nhận danh sách và tạo job' }), _jsx("button", { className: "pa-button pa-button-light", disabled: busy, onClick: () => setPreview(null), children: "S\u1EEDa y\u00EAu c\u1EA7u" })] }), job && _jsxs(_Fragment, { children: [_jsxs("p", { children: ["Job ", _jsx("code", { children: job.id }), " \u00B7 ", job.status] }), _jsxs("p", { children: ["Th\u00E0nh c\u00F4ng: ", job.items.filter(i => i.status === 'SUCCEEDED').length, " \u00B7 Th\u1EA5t b\u1EA1i: ", job.items.filter(i => i.status === 'FAILED').length, " \u00B7 Ch\u1EDD: ", job.items.filter(i => i.status === 'PENDING').length] }), _jsx("div", { className: "product-bulk-results", children: job.items.map(i => _jsxs("p", { children: [i.name || i.id, " \u00B7 ", i.status, " ", i.message] }, i.id)) }), job.status !== 'COMPLETED' && _jsx("button", { className: "pa-button", disabled: busy, onClick: () => { setAutoRun(true); void run(); }, children: busy ? 'Đang xử lý…' : 'Tiếp tục xử lý tối đa 20 mục' })] })] }) });
}
export default function PlatformProducts() {
    const actor = useAdminSession(), canModerate = hasAdminPermission(actor, 'products.moderate');
    const canConfigure = actor?.adminAccess?.grants?.some(g => g.permission === 'products.moderate' && Object.keys(g.scope || {}).length === 0);
    const [params, setParams] = useSearchParams(), [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
    const [rules, setRules] = useState([]), [categories, setCategories] = useState([]), [selected, setSelected] = useState([]), [bulk, setBulk] = useState(false), [draft, setDraft] = useState(params.get('q') || '');
    const page = Math.max(1, Number(params.get('page')) || 1), queryKey = params.toString();
    useEffect(() => { api.rules().then(r => setRules(r.items)).catch(e => setError(e.message)); catalogApi.categories().then(r => setCategories(flatten(r.categories))).catch(() => { }); }, [revision]);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setSelected([]);
        setData(null);
        setError('');
        const filters = Object.fromEntries(params);
        delete filters.id;
        platformAdminApi.list('products', { ...filters, page, limit: 20 }).then(result => { if (active)
            setData(result); }).catch(e => { if (active)
            setError(e.message); }).finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [queryKey, page, revision]);
    useEffect(() => setDraft(params.get('q') || ''), [queryKey]);
    function filter(key, value) { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); if (key !== 'page' && key !== 'id')
        next.delete('page'); if (key !== 'id')
        next.delete('id'); setParams(next); }
    const fields = [['storeId', 'Shop (ID)', 'text'], ['brand', 'Thương hiệu', 'text'], ['from', 'Từ ngày', 'date'], ['to', 'Đến ngày', 'date']];
    return _jsxs("div", { className: "pa-page", children: [_jsxs("div", { className: "pa-page-heading", children: [_jsxs("div", { children: [_jsx("span", { className: "pa-eyebrow", children: "QU\u1EA2N L\u00DD V\u1EACN H\u00C0NH" }), _jsx("h1", { children: "S\u1EA3n ph\u1EA9m v\u00E0 ki\u1EC3m duy\u1EC7t" }), _jsx("p", { children: "Tra c\u1EE9u h\u00E0ng h\u00F3a, ki\u1EC3m tra phi\u00EAn b\u1EA3n v\u00E0 x\u1EED l\u00FD vi ph\u1EA1m." })] }), _jsx("button", { className: "pa-button pa-button-light", disabled: loading, onClick: () => setRevision(v => v + 1), children: "L\u00E0m m\u1EDBi" })] }), _jsxs("section", { className: "pa-panel", children: [_jsxs("div", { className: "pa-records-top", children: [_jsxs("h2", { children: ["Danh s\u00E1ch s\u1EA3n ph\u1EA9m ", data && `(${data.total})`] }), _jsxs("form", { className: "pa-search", onSubmit: e => { e.preventDefault(); filter('q', draft); }, children: [_jsx("input", { "aria-label": "T\u00ECm s\u1EA3n ph\u1EA9m", placeholder: "T\u00EAn, shop ho\u1EB7c th\u01B0\u01A1ng hi\u1EC7u", maxLength: 100, value: draft, onChange: e => setDraft(e.target.value) }), _jsx("button", { children: "T\u00ECm" })] })] }), _jsxs("div", { className: "product-filter-grid", children: [fields.map(([key, label, type]) => _jsxs("label", { children: [label, _jsx("input", { type: type, value: params.get(key) || '', onChange: e => filter(key, e.target.value) })] }, key)), _jsxs("label", { children: ["Danh m\u1EE5c", _jsxs("select", { value: params.get('categoryId') || '', onChange: e => filter('categoryId', e.target.value), children: [_jsx("option", { value: "", children: "T\u1EA5t c\u1EA3 danh m\u1EE5c" }), categories.map(c => _jsx("option", { value: c.id, children: c.name }, c.id))] })] }), _jsxs("label", { children: ["Tr\u1EA1ng th\u00E1i seller", _jsxs("select", { value: params.get('publicationStatus') || '', onChange: e => filter('publicationStatus', e.target.value), children: [_jsx("option", { value: "", children: "T\u1EA5t c\u1EA3" }), _jsx("option", { value: "active", children: "\u0110ang b\u00E1n" }), _jsx("option", { value: "published", children: "\u0110\u00E3 \u0111\u0103ng b\u00E1n" }), _jsx("option", { value: "draft", children: "B\u1EA3n nh\u00E1p" }), _jsx("option", { value: "hidden", children: "Seller \u0111\u00E3 \u1EA9n" }), _jsx("option", { value: "discontinued", children: "Ng\u1EEBng kinh doanh" })] })] }), _jsxs("label", { children: ["Ki\u1EC3m duy\u1EC7t", _jsxs("select", { value: params.get('moderation') || '', onChange: e => filter('moderation', e.target.value), children: [_jsx("option", { value: "", children: "T\u1EA5t c\u1EA3" }), _jsx("option", { value: "REVIEW_PENDING", children: "Ch\u1EDD duy\u1EC7t \u0111\u0103ng b\u00E1n" }), _jsx("option", { value: "REVIEW_NEEDS_CHANGES", children: "C\u1EA7n s\u1EEDa tr\u01B0\u1EDBc \u0111\u0103ng b\u00E1n" }), _jsx("option", { value: "BLOCKED", children: "S\u00E0n \u0111ang ch\u1EB7n" }), _jsx("option", { value: "CLEAR", children: "Kh\u00F4ng ch\u1EB7n, kh\u00F4ng y\u00EAu c\u1EA7u s\u1EEDa" }), _jsx("option", { value: "NEEDS_CHANGES", children: "C\u1EA7n ch\u1EC9nh s\u1EEDa" }), _jsx("option", { value: "REMEDY_SUBMITTED", children: "Seller \u0111\u00E3 kh\u1EAFc ph\u1EE5c" })] })] }), _jsxs("label", { children: ["T\u1ED3n kho", _jsxs("select", { value: params.get('stock') || '', onChange: e => filter('stock', e.target.value), children: [_jsx("option", { value: "", children: "T\u1EA5t c\u1EA3" }), _jsx("option", { value: "in_stock", children: "C\u00F2n h\u00E0ng" }), _jsx("option", { value: "out_of_stock", children: "H\u1EBFt h\u00E0ng" })] })] }), _jsx("button", { className: "pa-text-link", onClick: () => setParams({}), children: "X\u00F3a b\u1ED9 l\u1ECDc" })] }), error && _jsx("p", { className: "pa-error", role: "alert", children: error }), canModerate && _jsxs("div", { className: "pa-filters", children: [_jsxs("span", { children: ["\u0110\u00E3 ch\u1ECDn ", selected.length, " m\u1EE5c trong trang hi\u1EC7n t\u1EA1i"] }), _jsx("button", { className: "pa-button pa-button-light", disabled: !selected.length, onClick: () => setBulk(true), children: "Xem tr\u01B0\u1EDBc x\u1EED l\u00FD h\u00E0ng lo\u1EA1t" }), _jsx("button", { className: "pa-text-link", onClick: () => setBulk(true), children: "Ti\u1EBFp t\u1EE5c job" })] }), _jsx("div", { className: "pa-table-scroll", "aria-busy": loading, children: _jsxs("table", { className: "pa-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [canModerate && _jsx("th", { children: _jsx("input", { type: "checkbox", "aria-label": "Ch\u1ECDn s\u1EA3n ph\u1EA9m trong trang hi\u1EC7n t\u1EA1i", checked: !!data?.items.length && selected.length === data.items.length, disabled: loading, onChange: e => setSelected(e.target.checked ? data?.items.map(i => i.id) || [] : []) }) }), _jsx("th", { children: "S\u1EA3n ph\u1EA9m / shop" }), _jsx("th", { children: "Gi\u00E1 / t\u1ED3n kho" }), _jsx("th", { children: "Seller" }), _jsx("th", { children: "Ki\u1EC3m duy\u1EC7t" }), _jsx("th", { children: "Ng\u00E0y t\u1EA1o" }), _jsx("th", { children: "Thao t\u00E1c" })] }) }), _jsxs("tbody", { children: [data?.items.map(row => _jsxs("tr", { children: [canModerate && _jsx("td", { children: _jsx("input", { type: "checkbox", "aria-label": `Chọn ${row.name}`, checked: selected.includes(row.id), onChange: e => setSelected(v => e.target.checked ? [...v, row.id] : v.filter(id => id !== row.id)) }) }), _jsxs("td", { children: [_jsx("strong", { children: row.name }), _jsxs("small", { children: [row.storeName, " \u00B7 ", row.brand || 'Chưa có thương hiệu'] }), _jsx("small", { children: row.categoryName })] }), _jsxs("td", { children: [money(row.priceMinor), _jsxs("small", { children: ["T\u1ED3n: ", row.stock] })] }), _jsx("td", { children: _jsx(StatusBadge, { status: row.publicationStatus }) }), _jsx("td", { children: row.suspended ? 'Sàn đang chặn' : row.reviewStatus === 'PENDING' ? 'Chờ duyệt đăng bán' : row.reviewStatus === 'NEEDS_CHANGES' ? 'Cần sửa trước đăng bán' : row.moderationStatus === 'NEEDS_CHANGES' ? 'Cần chỉnh sửa' : row.moderationStatus === 'REMEDY_SUBMITTED' ? 'Seller đã khắc phục' : 'Không chặn' }), _jsx("td", { children: date(row.createdAt) }), _jsx("td", { children: _jsx("button", { className: "pa-row-action", onClick: () => filter('id', row.id), children: "Ki\u1EC3m duy\u1EC7t" }) })] }, row.id)), !data?.items.length && _jsx("tr", { children: _jsx("td", { colSpan: 7, className: "pa-empty-cell", children: loading ? 'Đang tải…' : 'Không có sản phẩm phù hợp.' }) })] })] }) }), _jsxs("div", { className: "pa-pagination", children: [_jsxs("span", { children: [data?.total || 0, " s\u1EA3n ph\u1EA9m \u00B7 Trang ", page, "/", Math.max(1, data?.totalPages || 1)] }), _jsxs("div", { children: [_jsx("button", { disabled: loading || page <= 1, onClick: () => filter('page', String(page - 1)), children: "Tr\u01B0\u1EDBc" }), _jsx("button", { disabled: loading || !data || page >= data.totalPages, onClick: () => filter('page', String(page + 1)), children: "Sau" })] })] })] }), canConfigure && _jsxs(_Fragment, { children: [_jsx(PublicationPolicy, {}), _jsx(RuleEditor, { rules: rules, refresh: () => setRevision(v => v + 1) })] }), params.get('id') && _jsx(ProductWorkspace, { id: params.get('id'), close: () => filter('id', ''), changed: () => setRevision(v => v + 1) }, params.get('id')), bulk && _jsx(BulkDialog, { items: data?.items.filter(i => selected.includes(i.id)) || [], rules: rules, close: () => setBulk(false), changed: () => setRevision(v => v + 1) })] });
}
