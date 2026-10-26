import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { reviewApi } from '../../api/reviewReturnApi';
export default function ReviewSection({ productId }) {
    const itemId = new URLSearchParams(window.location.search).get('reviewItem');
    const [reviews, setReviews] = useState([]), [mine, setMine] = useState([]);
    const [page, setPage] = useState(1), [ratingFilter, setRatingFilter] = useState(0), [sort, setSort] = useState('newest');
    const [total, setTotal] = useState(0), [average, setAverage] = useState(0);
    const [rating, setRating] = useState(5), [title, setTitle] = useState(''), [content, setContent] = useState('');
    const [files, setFiles] = useState([]), [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState(null);
    const reload = useCallback(async () => {
        const result = await reviewApi.list(productId, { page, ...(ratingFilter ? { rating: ratingFilter } : {}), sort });
        setReviews(result.reviews);
        setTotal(result.total);
        setAverage(result.summary.averageRating);
        reviewApi.mine(productId).then(data => setMine(data.reviews)).catch(() => setMine([]));
    }, [productId, page, ratingFilter, sort]);
    useEffect(() => { void reload().catch(error => toast.error(error instanceof Error ? error.message : 'Không thể tải đánh giá.')); }, [reload]);
    function startEdit(review) { setEditing(review); setRating(review.rating); setTitle(review.title); setContent(review.content); }
    async function save() {
        if (!itemId && !editing)
            return;
        setBusy(true);
        try {
            const result = editing ? await reviewApi.edit(editing.id, { expectedVersion: editing.version, rating, title, content })
                : await reviewApi.create({ orderItemId: itemId, rating, title, content });
            for (const file of files)
                await reviewApi.upload(result.review.id, file);
            setEditing(null);
            setFiles([]);
            setTitle('');
            setContent('');
            await reload();
            toast.success('Đã lưu đánh giá.');
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : 'Không thể lưu đánh giá.');
        }
        finally {
            setBusy(false);
        }
    }
    return _jsxs("section", { className: "mt-6 rounded-2xl border border-[#e8edf5] bg-white p-6", children: [_jsx("h2", { className: "text-xl font-bold", children: "\u0110\u00E1nh gi\u00E1 s\u1EA3n ph\u1EA9m" }), _jsxs("p", { className: "mt-2 text-sm", children: [total, " \u0111\u00E1nh gi\u00E1 \u00B7 ", total ? `${average.toFixed(1)} / 5 sao` : 'Chưa có đánh giá'] }), (itemId || editing) && _jsxs("div", { className: "mt-5 grid gap-3 rounded-xl bg-[#f6f8fc] p-4", children: [_jsx("h3", { className: "font-semibold", children: editing ? 'Sửa đánh giá' : 'Đánh giá đơn đã mua' }), _jsx("select", { value: rating, onChange: e => setRating(Number(e.target.value)), className: "rounded-lg border p-2", "aria-label": "S\u1ED1 sao", children: [5, 4, 3, 2, 1].map(star => _jsxs("option", { value: star, children: [star, " sao"] }, star)) }), _jsx("input", { value: title, onChange: e => setTitle(e.target.value), maxLength: 120, placeholder: "Ti\u00EAu \u0111\u1EC1 (3\u2013120 k\u00FD t\u1EF1)", className: "rounded-lg border p-2" }), _jsx("textarea", { value: content, onChange: e => setContent(e.target.value), maxLength: 2000, rows: 3, placeholder: "N\u1ED9i dung (10\u20132000 k\u00FD t\u1EF1, kh\u00F4ng nh\u1EADp th\u00F4ng tin li\u00EAn h\u1EC7)", className: "rounded-lg border p-2" }), _jsxs("label", { className: "text-sm", children: ["\u1EA2nh minh h\u1ECDa (t\u1ED1i \u0111a 3 \u1EA3nh, m\u1ED7i \u1EA3nh 2 MB)", _jsx("input", { type: "file", accept: "image/png,image/jpeg,image/webp", multiple: true, onChange: e => setFiles(Array.from(e.target.files || []).slice(0, 3)), className: "block mt-1" })] }), _jsxs("div", { children: [_jsx("button", { disabled: busy, onClick: () => void save(), className: "rounded-lg bg-[#476de4] px-4 py-2 font-semibold text-white disabled:opacity-50", children: busy ? 'Đang lưu' : 'Gửi đánh giá' }), editing && _jsx("button", { onClick: () => setEditing(null), className: "ml-2 rounded-lg border px-4 py-2", children: "H\u1EE7y s\u1EEDa" })] })] }), _jsxs("div", { className: "mt-5 flex gap-2", children: [_jsxs("select", { value: ratingFilter, onChange: e => { setRatingFilter(Number(e.target.value)); setPage(1); }, className: "rounded-lg border p-2", "aria-label": "L\u1ECDc sao", children: [_jsx("option", { value: 0, children: "T\u1EA5t c\u1EA3 sao" }), [5, 4, 3, 2, 1].map(star => _jsxs("option", { value: star, children: [star, " sao"] }, star))] }), _jsxs("select", { value: sort, onChange: e => { setSort(e.target.value); setPage(1); }, className: "rounded-lg border p-2", "aria-label": "S\u1EAFp x\u1EBFp", children: [_jsx("option", { value: "newest", children: "M\u1EDBi nh\u1EA5t" }), _jsx("option", { value: "helpful", children: "H\u1EEFu \u00EDch nh\u1EA5t" })] })] }), reviews.map(review => _jsxs("article", { className: "mt-4 border-t pt-4", children: [_jsxs("strong", { children: ['★'.repeat(review.rating), '☆'.repeat(5 - review.rating), " \u00B7 ", review.title] }), _jsx("p", { className: "mt-1 whitespace-pre-wrap text-sm", children: review.content }), _jsxs("p", { className: "mt-1 text-xs text-[#70819d]", children: ["\u0110\u00E3 mua h\u00E0ng \u00B7 ", new Date(review.createdAt).toLocaleDateString('vi-VN')] }), !!review.images?.length && _jsx("div", { className: "mt-2 flex gap-2", children: review.images.map(image => _jsx("img", { src: reviewApi.imageUrl(image.url), alt: "\u1EA2nh \u0111\u00E1nh gi\u00E1", className: "h-20 w-20 rounded-lg object-cover" }, image.id)) }), review.reply && _jsxs("p", { className: "mt-2 rounded-lg bg-[#f6f8fc] p-2 text-sm", children: [_jsx("strong", { children: "Shop: " }), review.reply.content] }), _jsxs("div", { className: "mt-2 flex gap-3 text-sm text-[#476de4]", children: [_jsxs("button", { onClick: () => void reviewApi.helpful(review.id).then(reload).catch(error => toast.error(error.message)), children: ["H\u1EEFu \u00EDch (", review.helpfulCount, ")"] }), mine.some(own => own.id === review.id) && _jsx("button", { onClick: () => startEdit(mine.find(own => own.id === review.id)), children: "S\u1EEDa" })] })] }, review.id)), _jsxs("div", { className: "mt-5 flex gap-3", children: [_jsx("button", { disabled: page <= 1, onClick: () => setPage(page - 1), children: "Tr\u01B0\u1EDBc" }), _jsxs("span", { children: [page, " / ", Math.max(1, Math.ceil(total / 10))] }), _jsx("button", { disabled: page * 10 >= total, onClick: () => setPage(page + 1), children: "Sau" })] }), !itemId && _jsx("p", { className: "mt-4 text-xs text-[#70819d]", children: "\u0110\u1EC3 vi\u1EBFt \u0111\u00E1nh gi\u00E1, m\u1EDF s\u1EA3n ph\u1EA9m t\u1EEB \u0111\u01A1n h\u00E0ng \u0111\u00E3 giao." }), _jsx(Link, { to: "/orders", className: "mt-2 inline-block text-sm text-[#476de4]", children: "Xem \u0111\u01A1n h\u00E0ng c\u1EE7a t\u00F4i" })] });
}
