import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { platformAdminApi } from '../../api/platformAdminApi';
import { date, formatNumber, StatusBadge } from './AdminUi';
export default function PlatformAudit() {
    const [params, setParams] = useSearchParams();
    const source = params.get('source') === 'catalog' ? 'catalog' : 'identity';
    const q = params.get('q') || '', kind = source === 'catalog' ? params.get('kind') || '' : '';
    const rawPage = Number(params.get('page') || 1), page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const [draft, setDraft] = useState(q), [data, setData] = useState(null), [error, setError] = useState('');
    const [loading, setLoading] = useState(true), [revision, setRevision] = useState(0);
    useEffect(() => setDraft(q), [q]);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        setData(null);
        platformAdminApi.audit(source, { q, kind: kind || undefined, page, limit: 12 }).then(result => { if (active)
            setData(result); })
            .catch(cause => { if (active)
            setError(cause instanceof Error ? cause.message : 'Chưa tải được nhật ký.'); }).finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [source, q, kind, page, revision]);
    function filter(key, value) { const next = new URLSearchParams(params); if (value)
        next.set(key, value);
    else
        next.delete(key); if (key !== 'page')
        next.delete('page'); if (key === 'source')
        next.delete('kind'); setParams(next); }
    function search(event) { event.preventDefault(); filter('q', draft.trim()); }
    return _jsxs("div", { className: "pa-page", children: [_jsxs("div", { className: "pa-page-heading", children: [_jsxs("div", { children: [_jsx("span", { className: "pa-eyebrow", children: "KI\u1EC2M SO\u00C1T HO\u1EA0T \u0110\u1ED8NG" }), _jsx("h1", { children: "Nh\u1EADt k\u00FD qu\u1EA3n tr\u1ECB" }), _jsx("p", { children: "Theo d\u00F5i ai \u0111\u00E3 thay \u0111\u1ED5i tr\u1EA1ng th\u00E1i, th\u1EDDi \u0111i\u1EC3m v\u00E0 l\u00FD do th\u1EF1c hi\u1EC7n." })] }), _jsxs("button", { className: "pa-button pa-button-light", disabled: loading, onClick: () => setRevision(value => value + 1), children: [_jsx(RefreshCw, { size: 16, className: loading ? 'animate-spin' : '' }), "L\u00E0m m\u1EDBi"] })] }), _jsxs("div", { className: "pa-audit-tabs", "aria-label": "Ngu\u1ED3n nh\u1EADt k\u00FD", children: [_jsx("button", { className: source === 'identity' ? 'is-active' : '', onClick: () => filter('source', 'identity'), children: "T\u00E0i kho\u1EA3n" }), _jsx("button", { className: source === 'catalog' ? 'is-active' : '', onClick: () => filter('source', 'catalog'), children: "C\u1EEDa h\u00E0ng & s\u1EA3n ph\u1EA9m" })] }), _jsxs("section", { className: "pa-panel", children: [_jsxs("div", { className: "pa-records-top", children: [_jsxs("div", { children: [_jsx("h2", { children: "L\u1ECBch s\u1EED thao t\u00E1c" }), _jsx("span", { className: "pa-count-chip", children: data ? formatNumber(data.total) : '—' })] }), _jsxs("form", { className: "pa-search", onSubmit: search, children: [_jsx(Search, { size: 17 }), _jsx("input", { "aria-label": "T\u00ECm nh\u1EADt k\u00FD", placeholder: "T\u00ECm \u0111\u1ED1i t\u01B0\u1EE3ng ho\u1EB7c l\u00FD do\u2026", maxLength: 100, value: draft, onChange: event => setDraft(event.target.value) }), _jsx("button", { type: "submit", children: "T\u00ECm ki\u1EBFm" })] })] }), source === 'catalog' && _jsx("div", { className: "pa-filters", children: _jsxs("label", { children: [_jsx("span", { className: "sr-only", children: "Lo\u1EA1i \u0111\u1ED1i t\u01B0\u1EE3ng" }), _jsxs("select", { value: kind, onChange: event => filter('kind', event.target.value), children: [_jsx("option", { value: "", children: "T\u1EA5t c\u1EA3 \u0111\u1ED1i t\u01B0\u1EE3ng" }), _jsx("option", { value: "store", children: "C\u1EEDa h\u00E0ng" }), _jsx("option", { value: "product", children: "S\u1EA3n ph\u1EA9m" })] })] }) }), error && _jsx("p", { role: "alert", className: "pa-error pa-record-error", children: error }), _jsx("div", { className: "pa-table-scroll", "aria-busy": loading, children: _jsxs("table", { className: "pa-table pa-audit-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u0110\u1ED1i t\u01B0\u1EE3ng / thao t\u00E1c" }), _jsx("th", { children: "Ng\u01B0\u1EDDi th\u1EF1c hi\u1EC7n" }), _jsx("th", { children: "Tr\u1EA1ng th\u00E1i sau" }), _jsx("th", { children: "L\u00FD do" }), _jsx("th", { children: "Th\u1EDDi gian" })] }) }), _jsxs("tbody", { children: [data?.items.map(row => _jsxs("tr", { children: [_jsxs("td", { children: [_jsx("strong", { className: "pa-row-title", children: row.target_name || row.target_id }), _jsxs("small", { children: [row.target_type === 'user' ? 'Tài khoản' : row.target_type === 'store' ? 'Cửa hàng' : 'Sản phẩm', " \u00B7 ", row.action === 'suspend' ? 'Tạm khóa / ẩn' : 'Khôi phục'] })] }), _jsx("td", { children: row.actor_name || (row.actor_id ? `Quản trị viên ${row.actor_id.slice(0, 8)}` : 'Tài khoản đã xóa') }), _jsxs("td", { children: [_jsx(StatusBadge, { status: row.next_status }), row.read_version != null && _jsxs("small", { children: ["Phi\u00EAn b\u1EA3n ", row.read_version, " \u2192 ", row.result_version] })] }), _jsxs("td", { className: "pa-audit-reason", children: [row.reason, row.correlation_id && _jsxs("small", { children: ["M\u00E3 y\u00EAu c\u1EA7u: ", row.correlation_id] })] }), _jsx("td", { children: date(row.created_at, true) })] }, row.id)), !data?.items.length && _jsx("tr", { children: _jsx("td", { colSpan: 5, className: "pa-empty-cell", children: loading ? 'Đang tải nhật ký…' : error ? 'Dữ liệu chưa sẵn sàng.' : q || kind ? 'Không có nhật ký phù hợp.' : 'Chưa có thao tác quản trị.' }) })] })] }) }), _jsxs("div", { className: "pa-pagination", children: [_jsx("span", { children: data ? `${formatNumber(data.total)} hoạt động` : 'Chưa tải dữ liệu' }), _jsxs("div", { children: [_jsx("button", { "aria-label": "Trang tr\u01B0\u1EDBc", disabled: loading || page <= 1, onClick: () => filter('page', String(page - 1)), children: _jsx(ChevronLeft, { size: 17 }) }), _jsxs("span", { children: ["Trang ", page, " / ", Math.max(1, data?.totalPages || 1)] }), _jsx("button", { "aria-label": "Trang sau", disabled: loading || !data || page >= data.totalPages, onClick: () => filter('page', String(page + 1)), children: _jsx(ChevronRight, { size: 17 }) })] })] })] })] });
}
