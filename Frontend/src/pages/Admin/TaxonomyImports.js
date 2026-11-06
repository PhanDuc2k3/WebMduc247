import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { taxonomyApi as api } from '../../api/taxonomyApi';
import { adminRequestId } from '../../api/adminCommand';
import { date } from './AdminUi';
const headers = { categories: 'name,slug,parentSlug,description,sortOrder,isActive,iconKey,imageKey', attributes: 'categorySlug,code,label,type,required,unit,allowedValues,legacyPolicy' };
export default function TaxonomyImports({ version, canImport, changed }) {
    const [kind, setKind] = useState('categories'), [csv, setCsv] = useState(''), [filename, setFilename] = useState('catalog.csv'), [reason, setReason] = useState('');
    const [history, setHistory] = useState([]), [preview, setPreview] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const attempt = useRef({ signature: '', requestId: '' });
    function load() { api.imports().then(r => setHistory(r.items)).catch(e => setError(e.message)); }
    useEffect(load, []);
    async function check(e) {
        e.preventDefault();
        setBusy(true);
        setError('');
        setNotice('');
        const input = { kind, csv, filename, version, reason };
        try {
            setPreview(await api.previewCsv({ ...input, requestId: adminRequestId(attempt.current, input) }));
            load();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Chưa kiểm tra được file.');
        }
        finally {
            setBusy(false);
        }
    }
    async function commit() { if (!preview)
        return; setBusy(true); setError(''); try {
        const result = await api.commitCsv(preview.id);
        setPreview(p => p ? { ...p, status: 'APPLIED' } : null);
        setNotice(`Đã áp dụng ${result.applied} mục trong một giao dịch.`);
        load();
        changed();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Chưa nhập được file.');
    }
    finally {
        setBusy(false);
    } }
    return _jsxs("section", { className: "pa-panel tx-editor", children: [_jsx("h2", { children: "Nh\u1EADp CSV c\u00F3 ki\u1EC3m tra tr\u01B0\u1EDBc" }), _jsx("p", { children: "T\u1ED1i \u0111a 200 d\u00F2ng / 256 KB. CSV danh m\u1EE5c ch\u1EC9 t\u1EA1o m\u1EDBi; c\u00F3 th\u1EC3 khai b\u00E1o cha tr\u01B0\u1EDBc ho\u1EB7c sau con. CSV thu\u1ED9c t\u00EDnh c\u1EADp nh\u1EADt c\u00E1c m\u00E3 c\u00F3 trong file v\u00E0 gi\u1EEF c\u00E1c m\u00E3 kh\u00E1c. File c\u00F3 b\u1EA5t k\u1EF3 l\u1ED7i n\u00E0o s\u1EBD kh\u00F4ng \u0111\u01B0\u1EE3c \u00E1p d\u1EE5ng." }), error && _jsx("p", { className: "pa-error", role: "alert", children: error }), notice && _jsx("p", { className: "pa-success", role: "status", children: notice }), _jsx("form", { onSubmit: check, children: _jsxs("fieldset", { disabled: !canImport || busy, className: "tx-fields", children: [_jsxs("label", { children: ["Lo\u1EA1i file", _jsxs("select", { value: kind, onChange: e => { setKind(e.target.value); setPreview(null); }, children: [_jsx("option", { value: "categories", children: "Danh m\u1EE5c" }), _jsx("option", { value: "attributes", children: "Thu\u1ED9c t\u00EDnh" })] })] }), _jsxs("label", { children: ["File CSV", _jsx("input", { type: "file", accept: ".csv,text/csv", onChange: async (e) => { const file = e.target.files?.[0]; if (!file)
                                        return; if (file.size > 262144) {
                                        setError('File vượt 256 KB.');
                                        return;
                                    } setFilename(file.name); setCsv(await file.text()); setPreview(null); } })] }), _jsxs("p", { className: "tx-wide", children: ["Ti\u00EAu \u0111\u1EC1 b\u1EAFt bu\u1ED9c: ", _jsx("code", { children: headers[kind] })] }), _jsx("p", { className: "tx-wide", children: "Boolean d\u00F9ng true/false. Gi\u00E1 tr\u1ECB l\u1EF1a ch\u1ECDn ph\u00E2n c\u00E1ch b\u1EB1ng |. legacyPolicy d\u00F9ng ON_EDIT ho\u1EB7c NEW_ONLY." }), _jsxs("label", { className: "tx-wide", children: ["N\u1ED9i dung CSV", _jsx("textarea", { className: "tx-csv", required: true, value: csv, onChange: e => { setCsv(e.target.value); setPreview(null); }, placeholder: headers[kind] })] }), _jsxs("label", { className: "tx-wide", children: ["L\u00FD do nh\u1EADp", _jsx("textarea", { required: true, minLength: 8, maxLength: 500, value: reason, onChange: e => { setReason(e.target.value); setPreview(null); } })] }), _jsx("button", { className: "pa-button tx-wide", children: "Ki\u1EC3m tra to\u00E0n b\u1ED9 file" })] }) }), preview && _jsxs("div", { className: "tx-import-preview", children: [_jsxs("h3", { children: ["K\u1EBFt qu\u1EA3 ki\u1EC3m tra: ", preview.status, " \u00B7 ", preview.row_count, " d\u00F2ng"] }), !!preview.errors.length && _jsx("div", { className: "pa-table-scroll", children: _jsxs("table", { className: "pa-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "D\u00F2ng" }), _jsx("th", { children: "L\u1ED7i" })] }) }), _jsx("tbody", { children: preview.errors.map((e, i) => _jsxs("tr", { children: [_jsx("td", { children: e.line }), _jsx("td", { children: e.message })] }, i)) })] }) }), _jsxs("details", { children: [_jsx("summary", { children: "Xem danh s\u00E1ch s\u1EBD \u00E1p d\u1EE5ng" }), _jsx("pre", { children: JSON.stringify(preview.plan, null, 2) })] }), preview.status === 'PREVIEWED' && _jsx("button", { className: "pa-button", disabled: busy || !canImport, onClick: () => void commit(), children: "X\u00E1c nh\u1EADn nh\u1EADp to\u00E0n b\u1ED9 file h\u1EE3p l\u1EC7" })] }), _jsx("h3", { children: "L\u1ECBch s\u1EED nh\u1EADp" }), _jsx("div", { className: "pa-table-scroll", children: _jsxs("table", { className: "pa-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "File / lo\u1EA1i" }), _jsx("th", { children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { children: "S\u1ED1 d\u00F2ng / l\u1ED7i" }), _jsx("th", { children: "Th\u1EDDi gian" })] }) }), _jsx("tbody", { children: history.map(row => _jsxs("tr", { children: [_jsxs("td", { children: [row.filename, _jsx("small", { children: row.kind })] }), _jsx("td", { children: row.status }), _jsxs("td", { children: [row.row_count, " / ", row.errors.length, _jsxs("details", { children: [_jsx("summary", { children: "L\u1ED7i t\u1EEBng d\u00F2ng" }), row.errors.map((e, i) => _jsxs("p", { children: ["D\u00F2ng ", e.line, ": ", e.message] }, i))] })] }), _jsx("td", { children: date(row.created_at, true) })] }, row.id)) })] }) })] });
}
