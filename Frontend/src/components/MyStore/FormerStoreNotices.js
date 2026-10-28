import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { storeAdminApi } from '../../api/storeAdminApi';
export default function FormerStoreNotices() {
    const [data, setData] = useState(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
    useEffect(() => { let active = true; setError(''); storeAdminApi.formerDecisions().then(result => { if (active)
        setData(result); }).catch(() => { if (active)
        setError('Chưa tải được thông báo cửa hàng đã chuyển quyền.'); }); return () => { active = false; }; }, [retry]);
    if (error)
        return _jsxs("p", { role: "alert", children: [error, " ", _jsx("button", { type: "button", onClick: () => setRetry(value => value + 1), children: "Th\u1EED l\u1EA1i" })] });
    if (!data?.items.length)
        return null;
    return _jsxs("details", { className: "mb-6 rounded-xl border border-slate-200 bg-white p-4", children: [_jsxs("summary", { className: "font-bold", children: ["Th\u00F4ng b\u00E1o v\u1EC1 c\u1EEDa h\u00E0ng \u0111\u00E3 chuy\u1EC3n quy\u1EC1n (", data.items.length, ")"] }), data.items.map(item => _jsxs("article", { className: "my-3 border-t border-slate-200 pt-3", children: [_jsx("strong", { children: item.store_name }), _jsx("p", { children: item.reason }), _jsx("p", { className: "text-sm text-slate-500", children: item.scope })] }, item.id))] });
}
