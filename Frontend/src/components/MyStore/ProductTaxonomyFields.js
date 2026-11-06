import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { taxonomyApi as api } from '../../api/taxonomyApi';
export function TaxonomySellerNotices({ productId, version }) {
    const [notices, setNotices] = useState([]), [error, setError] = useState('');
    useEffect(() => { let active = true; api.seller(productId).then(r => { if (active)
        setNotices(r.notices); }).catch(e => { if (active)
        setError(e.message); }); return () => { active = false; }; }, [productId, version]);
    if (error)
        return _jsxs("p", { className: "text-sm text-red-700", role: "alert", children: ["Ch\u01B0a t\u1EA3i \u0111\u01B0\u1EE3c th\u00F4ng b\u00E1o catalog: ", error] });
    return notices.length ? _jsxs("section", { className: "rounded-xl border border-amber-200 bg-amber-50 p-4", children: [_jsx("h2", { className: "font-bold", children: "Th\u00F4ng b\u00E1o thay \u0111\u1ED5i catalog c\u1EE7a s\u00E0n" }), notices.map(n => _jsxs("p", { className: "mt-2 text-sm", children: [n.body, _jsx("small", { className: "block text-slate-500", children: new Date(n.created_at).toLocaleString('vi-VN') })] }, n.id))] }) : null;
}
export function BrandNameInput({ value, onChange, className }) {
    const [brands, setBrands] = useState([]);
    useEffect(() => { api.brands().then(r => setBrands(r.items)).catch(() => { }); }, []);
    return _jsxs("label", { className: "text-sm font-bold", children: ["Th\u01B0\u01A1ng hi\u1EC7u", _jsx("input", { className: className, list: "catalog-standard-brands", value: value, onChange: e => onChange(e.target.value) }), _jsx("datalist", { id: "catalog-standard-brands", children: brands.map(b => _jsx("option", { value: b.name, children: b.aliases?.filter(a => a !== b.name).join(', ') }, b.id)) }), _jsx("small", { className: "block font-normal text-slate-500", children: "T\u00EAn thay th\u1EBF \u0111\u00E3 bi\u1EBFt s\u1EBD \u0111\u01B0\u1EE3c \u0111\u1ED5i sang t\u00EAn chu\u1EA9n khi l\u01B0u." })] });
}
export default function ProductTaxonomyFields({ categoryId, values, onChange }) {
    const [schema, setSchema] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(false);
    useEffect(() => { let active = true; setSchema(null); setError(''); if (!categoryId)
        return; setLoading(true); api.schema(categoryId).then(r => { if (active)
        setSchema(r.schema); }).catch(e => { if (active)
        setError(e.message); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [categoryId]);
    const set = (code, value) => { const next = { ...values }; if (value === undefined)
        delete next[code];
    else
        next[code] = value; onChange(next); };
    const unknown = Object.keys(values).filter(key => !schema?.definitions.some(d => d.code === key));
    return _jsxs("fieldset", { className: "grid gap-3 rounded-xl border border-slate-200 p-4 sm:col-span-2", children: [_jsx("legend", { className: "px-2 text-sm font-bold", children: "Th\u00F4ng s\u1ED1 theo nh\u00F3m h\u00E0ng" }), loading && _jsx("p", { children: "\u0110ang t\u1EA3i b\u1ED9 thu\u1ED9c t\u00EDnh\u2026" }), error && _jsx("p", { className: "text-red-700", role: "alert", children: error }), !schema && !loading && !error && _jsx("p", { className: "text-sm text-slate-500", children: "Danh m\u1EE5c ch\u01B0a c\u00F3 b\u1ED9 th\u00F4ng s\u1ED1 b\u1EAFt bu\u1ED9c." }), schema && _jsx("p", { className: "text-sm text-slate-500", children: schema.legacy_policy === 'ON_EDIT' ? 'Bổ sung thông số bắt buộc khi lưu nội dung hoặc đăng bán lại.' : 'Bộ mới bắt buộc cho sản phẩm được tạo sau lần cập nhật bộ thuộc tính.' }), schema?.definitions.map(d => _jsxs("label", { className: "text-sm font-bold", children: [d.label, d.required ? ' *' : '', d.unit && ` (${d.unit})`, d.type === 'enum' || d.type === 'boolean' ? _jsxs("select", { className: "mt-1 w-full rounded-lg border p-2", value: values[d.code] === undefined ? '' : String(values[d.code]), onChange: e => set(d.code, e.target.value === '' ? undefined : d.type === 'boolean' ? e.target.value === 'true' : e.target.value), children: [_jsx("option", { value: "", children: "Ch\u01B0a ch\u1ECDn" }), (d.type === 'boolean' ? ['true', 'false'] : d.allowedValues).map(v => _jsx("option", { value: v, children: d.type === 'boolean' ? v === 'true' ? 'Có' : 'Không' : v }, v))] }) :
                        _jsx("input", { className: "mt-1 w-full rounded-lg border p-2", type: d.type === 'number' ? 'number' : 'text', step: d.type === 'number' ? 'any' : undefined, maxLength: 500, value: values[d.code] == null ? '' : String(values[d.code]), onChange: e => set(d.code, e.target.value === '' ? undefined : d.type === 'number' ? Number(e.target.value) : e.target.value) })] }, d.code)), !!unknown.length && !loading && _jsxs("div", { className: "text-sm text-amber-800", children: [_jsxs("p", { children: ["Th\u00F4ng s\u1ED1 c\u0169 kh\u00F4ng thu\u1ED9c b\u1ED9 \u0111ang \u00E1p d\u1EE5ng: ", unknown.join(', '), "."] }), _jsx("button", { type: "button", className: "underline", onClick: () => onChange(Object.fromEntries(Object.entries(values).filter(([key]) => !unknown.includes(key)))), children: "B\u1ECF c\u00E1c th\u00F4ng s\u1ED1 c\u0169 kh\u1ECFi l\u1EA7n l\u01B0u n\u00E0y" })] })] });
}
