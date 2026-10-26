import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { storefrontApi } from '../../api/storefrontApi';
import Header from '../../Layouts/Header/Header';
import Footer from '../../Layouts/Footer/Footer';
import Home from '../Home/Home';
import './storefront-editor.css';
export default function StorefrontPreview() {
    const [data, setData] = useState(null), [error, setError] = useState('');
    useEffect(() => { let active = true; storefrontApi.preview().then(result => { if (active)
        setData(result); }).catch(cause => { if (active)
        setError(cause instanceof Error ? cause.message : 'Chưa thể tải bản xem trước.'); }); return () => { active = false; }; }, []);
    return _jsxs("div", { className: "sf-preview", children: [_jsxs("div", { className: "sf-preview-bar", children: [_jsxs("span", { children: [_jsx("strong", { children: "Xem tr\u01B0\u1EDBc b\u1EA3n nh\u00E1p" }), " \u00B7 Trang c\u00F4ng khai ch\u01B0a thay \u0111\u1ED5i"] }), _jsx(Link, { to: "/admin/storefront", children: "Quay l\u1EA1i bi\u00EAn t\u1EADp" })] }), error ? _jsx("p", { className: "pa-error", role: "alert", children: error }) : data ? _jsxs(_Fragment, { children: [_jsx(Header, { navigationOverride: data.layout?.navigation }), _jsx("main", { className: "container-wrapper", children: _jsx(Home, { initialData: data }) }), _jsx(Footer, {})] }) : _jsx("p", { className: "pa-access", role: "status", children: "\u0110ang t\u1EA3i b\u1EA3n xem tr\u01B0\u1EDBc\u2026" })] });
}
