import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { taxonomyApi as api } from '../../api/taxonomyApi';
import { adminRequestId } from '../../api/adminCommand';
import { useAdminSession } from './AdminSession';
import { AdminDialog, date } from './AdminUi';
import CategoryEditor from './CategoryEditor';
import AttributeSchemaEditor from './AttributeSchemaEditor';
import BrandEditor from './BrandEditor';
import TaxonomyImports from './TaxonomyImports';
import './taxonomy-admin.css';
const actionLabels = { create: 'Tạo danh mục', update: 'Cập nhật danh mục', delete: 'Xóa danh mục', transfer: 'Chuyển sản phẩm', schema: 'Thay bộ thuộc tính', brand: 'Lưu thương hiệu', merge_brand: 'Hợp nhất thương hiệu' };
export default function PlatformTaxonomy() {
    const actor = useAdminSession(), canManage = !!actor?.adminAccess?.grants.some(g => g.permission === 'taxonomy.manage' && Object.keys(g.scope || {}).length === 0), canImport = !!actor?.adminAccess?.grants.some(g => g.permission === 'taxonomy.import' && Object.keys(g.scope || {}).length === 0);
    const [data, setData] = useState(null), [selected, setSelected] = useState(null), [parentId, setParentId] = useState(null), [tab, setTab] = useState('categories'), [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [revision, setRevision] = useState(0), [preview, setPreview] = useState(null);
    const attempt = useRef({ signature: '', requestId: '' });
    useEffect(() => { let active = true; setLoading(true); api.read().then(result => { if (active) {
        setData(result);
        setError('');
    } }).catch(e => { if (active)
        setError(e.message); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [revision]);
    async function view(input) { setBusy(true); setError(''); setNotice(''); try {
        setPreview(await api.preview({ ...input, requestId: adminRequestId(attempt.current, input) }));
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Không tạo được bản xem trước.');
    }
    finally {
        setBusy(false);
    } }
    async function commit() { if (!preview)
        return; setBusy(true); setError(''); try {
        const result = await api.commit(preview.id);
        setNotice('Đã áp dụng thay đổi và ghi audit.');
        if (preview.command.action === 'create' && result.result.id)
            setSelected(result.result.id);
        if (preview.command.action === 'delete')
            setSelected(null);
        setPreview(null);
        setRevision(v => v + 1);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Không áp dụng được thay đổi.');
    }
    finally {
        setBusy(false);
    } }
    const visible = new Set();
    if (data)
        for (const c of data.categories)
            if (!search || `${c.name} ${c.slug}`.toLowerCase().includes(search.toLowerCase())) {
                let current = c;
                while (current && !visible.has(current.id)) {
                    visible.add(current.id);
                    current = data.categories.find(p => p.id === current?.parentId);
                }
            }
    const tree = (id) => _jsx("ul", { children: data?.categories.filter(c => c.parentId === id && visible.has(c.id)).map(c => _jsxs("li", { children: [_jsxs("button", { className: c.id === selected ? 'is-selected' : '', onClick: () => { setSelected(c.id); setParentId(null); }, children: [_jsxs("span", { children: [c.isActive ? '●' : '○', " ", c.name] }), _jsxs("small", { children: ["/", c.slug, " \u00B7 ", c.productCount, " s\u1EA3n ph\u1EA9m"] })] }), tree(c.id)] }, c.id)) });
    return _jsxs("div", { className: "pa-page tx-page", children: [_jsxs("div", { className: "pa-page-heading", children: [_jsxs("div", { children: [_jsx("span", { className: "pa-eyebrow", children: "QU\u1EA2N TR\u1ECA CATALOG" }), _jsx("h1", { children: "Danh m\u1EE5c, th\u01B0\u01A1ng hi\u1EC7u v\u00E0 thu\u1ED9c t\u00EDnh" }), _jsx("p", { children: "Qu\u1EA3n l\u00FD c\u00E2y danh m\u1EE5c, ti\u00EAu chu\u1EA9n th\u00F4ng s\u1ED1 v\u00E0 t\u00EAn th\u01B0\u01A1ng hi\u1EC7u d\u00F9ng chung." })] }), _jsx("button", { className: "pa-button pa-button-light", disabled: loading || busy, onClick: () => setRevision(v => v + 1), children: "T\u1EA3i l\u1EA1i" })] }), error && _jsx("p", { className: "pa-error", role: "alert", children: error }), notice && _jsx("p", { className: "pa-success", role: "status", children: notice }), _jsx("nav", { className: "tx-tabs", "aria-label": "Ph\u1EA7n qu\u1EA3n l\u00FD catalog", children: [['categories', 'Cây danh mục'], ['attributes', 'Bộ thuộc tính'], ['brands', 'Thương hiệu'], ['imports', 'Nhập CSV'], ['history', 'Lịch sử']].map(([key, label]) => _jsx("button", { className: tab === key ? 'is-active' : '', onClick: () => setTab(key), children: label }, key)) }), !data ? _jsx("p", { children: loading ? 'Đang tải catalog…' : 'Chưa tải được catalog.' }) : _jsxs(_Fragment, { children: [['categories', 'attributes'].includes(tab) && _jsxs("div", { className: "tx-layout", children: [_jsxs("aside", { className: "pa-panel tx-tree", children: [_jsxs("h2", { children: ["C\u00E2y danh m\u1EE5c (", data.categories.length, ")"] }), _jsx("input", { "aria-label": "T\u00ECm danh m\u1EE5c", placeholder: "T\u00EAn ho\u1EB7c slug", value: search, onChange: e => setSearch(e.target.value) }), canManage && _jsxs("div", { className: "tx-actions", children: [_jsx("button", { className: "pa-button pa-button-light", onClick: () => { setSelected(null); setParentId(null); setTab('categories'); }, children: "Th\u00EAm g\u1ED1c" }), _jsx("button", { className: "pa-button pa-button-light", disabled: !selected, onClick: () => { setParentId(selected); setSelected(null); setTab('categories'); }, children: "Th\u00EAm con" })] }), tree(null), !data.categories.length && _jsx("p", { children: "Ch\u01B0a c\u00F3 danh m\u1EE5c." }), _jsx("small", { children: "\u25CF Ho\u1EA1t \u0111\u1ED9ng \u00B7 \u25CB \u0110\u00E3 ng\u1EEBng" })] }), tab === 'categories' ? _jsx(CategoryEditor, { data: data, selected: selected, parentId: parentId, canManage: canManage, busy: busy, preview: input => void view(input) }) : _jsx(AttributeSchemaEditor, { data: data, id: selected, canManage: canManage, busy: busy, preview: input => void view(input) })] }), tab === 'brands' && _jsx(BrandEditor, { data: data, canManage: canManage, busy: busy, preview: input => void view(input) }), tab === 'imports' && _jsx(TaxonomyImports, { version: data.stateVersion, canImport: canImport, changed: () => setRevision(v => v + 1) }), tab === 'history' && _jsxs("section", { className: "pa-panel tx-editor", children: [_jsx("h2", { children: "Nh\u1EADt k\u00FD catalog" }), data.history.map(h => _jsxs("article", { className: "tx-audit", children: [_jsx("strong", { children: actionLabels[h.action] || h.action }), " \u00B7 ", date(h.created_at, true), _jsx("p", { children: h.reason }), _jsxs("details", { children: [_jsx("summary", { children: "D\u1EEF li\u1EC7u tr\u01B0\u1EDBc/sau v\u00E0 vi\u1EC7c chuy\u1EC3n s\u1EA3n ph\u1EA9m" }), _jsx("pre", { children: JSON.stringify({ before: h.before_data, after: h.after_data, impact: h.impact }, null, 2) })] })] }, h.id)), !data.history.length && _jsx("p", { children: "Ch\u01B0a c\u00F3 thay \u0111\u1ED5i \u0111\u01B0\u1EE3c ghi nh\u1EADn." }), _jsx("h3", { children: "Mapping URL c\u0169" }), data.aliases.map(a => _jsxs("p", { children: ["/category/", a.slug, " \u2192 /category/", data.categories.find(c => c.id === a.category_id)?.slug] }, a.slug))] })] }), preview && _jsx(AdminDialog, { title: `Xem trước: ${actionLabels[preview.command.action]}`, close: () => setPreview(null), busy: busy, children: _jsxs("div", { className: "pa-detail tx-preview", children: [_jsxs("p", { children: [_jsx("strong", { children: "L\u00FD do:" }), " ", preview.command.reason] }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "S\u1EA3n ph\u1EA9m li\u00EAn quan" }), _jsx("dd", { children: preview.impact.productCount })] }), preview.impact.sellingProducts != null && _jsxs("div", { children: [_jsx("dt", { children: "\u0110ang b\u00E1n" }), _jsx("dd", { children: preview.impact.sellingProducts })] }), preview.impact.descendantCount != null && _jsxs("div", { children: [_jsx("dt", { children: "Danh m\u1EE5c h\u1EADu du\u1EC7" }), _jsx("dd", { children: preview.impact.descendantCount })] }), preview.impact.missingProducts != null && _jsxs("div", { children: [_jsx("dt", { children: "Thi\u1EBFu/sai thu\u1ED9c t\u00EDnh" }), _jsx("dd", { children: preview.impact.missingProducts })] }), preview.impact.targetAttributeGaps != null && _jsxs("div", { children: [_jsx("dt", { children: "C\u1EA7n b\u1ED5 sung th\u00F4ng s\u1ED1 \u1EDF danh m\u1EE5c thay th\u1EBF" }), _jsx("dd", { children: preview.impact.targetAttributeGaps })] })] }), preview.impact.retiring && _jsx("p", { className: "pa-warning", children: "To\u00E0n b\u1ED9 nh\u00E1nh \u0111\u01B0\u1EE3c ng\u1EEBng. S\u1EA3n ph\u1EA9m \u0111\u01B0\u1EE3c chuy\u1EC3n tr\u01B0\u1EDBc khi ng\u1EEBng; c\u00E1c \u00F4 v\u00E0 li\u00EAn k\u1EBFt trang ch\u1EE7 b\u1ECB \u1EA3nh h\u01B0\u1EDFng s\u1EBD \u0111\u01B0\u1EE3c t\u1EAFt. \u0110\u01A1n \u0111\u00E3 \u0111\u1EB7t gi\u1EEF nguy\u00EAn snapshot." }), preview.impact.reapprovalRequired && preview.impact.productCount > 0 && _jsx("p", { className: "pa-warning", children: "S\u00E0n \u0111ang duy\u1EC7t tr\u01B0\u1EDBc \u0111\u0103ng: thay \u0111\u1ED5i danh m\u1EE5c ho\u1EB7c t\u00EAn th\u01B0\u01A1ng hi\u1EC7u c\u1EE7a s\u1EA3n ph\u1EA9m c\u00F3 th\u1EC3 \u0111\u01B0a phi\u00EAn b\u1EA3n n\u1ED9i dung v\u1EC1 h\u00E0ng ch\u1EDD. Seller s\u1EBD nh\u1EADn th\u00F4ng b\u00E1o." }), preview.command.action === 'schema' && _jsxs("p", { className: "pa-warning", children: ["Kh\u00F4ng t\u1EF1 \u1EA9n s\u1EA3n ph\u1EA9m c\u0169. Ch\u00EDnh s\u00E1ch: ", preview.command.legacyPolicy === 'ON_EDIT' ? 'Bổ sung khi sửa hoặc đăng lại' : 'Bắt buộc cho sản phẩm tạo mới sau thay đổi', "."] }), preview.impact.samples?.map(s => _jsxs("p", { children: ["#", s.id.slice(0, 8), ": ", s.errors.map(e => e.message).join(' ')] }, s.id)), ['draftReferences', 'publishedReferences'].map(key => _jsxs("div", { children: [_jsx("h3", { children: key === 'draftReferences' ? 'Tham chiếu bản nháp trang chủ' : 'Tham chiếu trang chủ đang xuất bản' }), preview.impact[key]?.length ? preview.impact[key].map((r, i) => _jsxs("p", { children: [r.label, " \u00B7 ", r.enabled ? 'Đang bật' : 'Đã tắt'] }, i)) : _jsx("p", { children: "Kh\u00F4ng c\u00F3 tham chi\u1EBFu." })] }, key)), _jsxs("details", { open: true, children: [_jsx("summary", { children: "Thay \u0111\u1ED5i s\u1EBD \u00E1p d\u1EE5ng" }), _jsx("pre", { children: JSON.stringify(preview.command.category || preview.command.brand || preview.command.definitions || { replacementId: preview.command.replacementId }, null, 2) })] }), error && _jsx("p", { className: "pa-error", role: "alert", children: error }), _jsx("p", { children: "Quy\u1EC1n v\u00E0 phi\u00EAn b\u1EA3n s\u1EBD \u0111\u01B0\u1EE3c ki\u1EC3m tra l\u1EA1i khi x\u00E1c nh\u1EADn." }), _jsxs("div", { className: "tx-actions", children: [_jsx("button", { className: "pa-button", disabled: busy, onClick: () => void commit(), children: busy ? 'Đang áp dụng…' : 'Xác nhận áp dụng' }), _jsx("button", { className: "pa-button pa-button-light", disabled: busy, onClick: () => setPreview(null), children: "Quay l\u1EA1i ch\u1EC9nh s\u1EEDa" })] })] }) })] });
}
