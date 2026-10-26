import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { reviewApi } from '../../api/reviewReturnApi';
export default function SellerReviewPanel({ storeId }) {
    const [reviews, setReviews] = useState([]), [drafts, setDrafts] = useState({});
    const reload = useCallback(async () => { setReviews((await reviewApi.sellerList(storeId)).reviews); }, [storeId]);
    useEffect(() => { void reload().catch(() => { }); }, [reload]);
    async function reply(id) {
        try {
            await reviewApi.reply(id, drafts[id] || '');
            await reload();
            toast.success('Đã phản hồi đánh giá.');
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : 'Không thể phản hồi.');
        }
    }
    return _jsxs("section", { className: "mt-5 rounded-2xl border border-[#e6ebf5] bg-white p-5", children: [_jsx("h2", { className: "text-xl font-bold", children: "\u0110\u00E1nh gi\u00E1 c\u1EEDa h\u00E0ng" }), reviews.map(row => _jsxs("article", { className: "mt-3 border-t pt-3 text-sm", children: [_jsx("p", { children: _jsxs("strong", { children: ['★'.repeat(row.rating), " \u00B7 ", row.title] }) }), _jsx("p", { children: row.content }), row.reply ? _jsxs("p", { className: "mt-2", children: ["Shop: ", row.reply.content] }) : _jsxs("div", { className: "mt-2 flex gap-2", children: [_jsx("input", { value: drafts[row.id] || '', onChange: e => setDrafts({ ...drafts, [row.id]: e.target.value }), className: "min-w-0 flex-1 rounded-lg border p-2", maxLength: 1000, placeholder: "Ph\u1EA3n h\u1ED3i (3\u20131000 k\u00FD t\u1EF1)" }), _jsx("button", { onClick: () => void reply(row.id), className: "rounded-lg border px-3", children: "G\u1EEDi" })] })] }, row.id))] });
}
