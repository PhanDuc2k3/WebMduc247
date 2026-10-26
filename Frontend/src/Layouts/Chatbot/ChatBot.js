import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, LoaderCircle, MessageCircle, RotateCcw, Send, Trash2, X } from 'lucide-react';
import chatbotApi, {} from '../../api/chatbotApi';
const storageKey = 'mduc247.botSession.v2';
const orderId = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const greeting = { id: 'greeting', role: 'bot',
    text: 'Xin chào! Mình có thể giải thích về sản phẩm, tư vấn theo nhu cầu, so sánh lựa chọn và hỗ trợ đơn hàng.',
    suggestedQuestions: ['Tôi muốn tìm hiểu về điện thoại thông minh', 'Tôi muốn mua điện thoại dưới 5 triệu', 'Có voucher nào đang hoạt động?'] };
function savedSession() {
    try {
        const value = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
        if (typeof value?.sessionId === 'string' && new Date(value.expiresAt).getTime() > Date.now())
            return value;
    }
    catch { /* Invalid local session starts a new conversation. */ }
    sessionStorage.removeItem(storageKey);
    return null;
}
function ProductCard({ product, close }) {
    return _jsxs("article", { className: "flex gap-3 rounded-lg border border-[#dfe6f2] bg-white p-2 text-[#172a49]", children: [_jsx("img", { src: product.imageUrl || '/visual-placeholder.svg', alt: "", loading: "lazy", className: "h-16 w-16 flex-none rounded-md bg-[#f4f7fb] object-contain" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("strong", { className: "block text-xs leading-snug", children: product.name }), _jsx("small", { className: "mt-0.5 block truncate text-[11px] text-[#718099]", children: product.storeName }), _jsxs("span", { className: "mt-1 block text-xs font-bold text-[#476de4]", children: [product.priceMinor.toLocaleString('vi-VN'), "\u20AB"] }), product.inStock != null && _jsx("small", { className: "block text-[11px] text-[#718099]", children: product.inStock ? 'Còn hàng' : 'Hết hàng' }), product.rating != null && _jsxs("small", { className: "block text-[11px] text-[#718099]", children: ["\u2605 ", product.rating.toFixed(1), product.reviewCount ? ` (${product.reviewCount})` : ''] }), _jsx(Link, { to: `/products/${product.id}`, onClick: close, className: "mt-1 inline-block text-[11px] font-bold text-[#476de4]", children: "Xem s\u1EA3n ph\u1EA9m \u2192" })] })] });
}
function Comparison({ data, close }) {
    return _jsx("div", { className: "mt-3 max-w-full overflow-x-auto rounded-lg border border-[#dfe6f2] bg-white text-[#172a49]", children: _jsxs("table", { className: "w-full min-w-[360px] text-left text-[11px]", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "p-2", children: "Ti\u00EAu ch\u00ED" }), data.products.map(product => _jsx("th", { className: "p-2", children: _jsx(Link, { to: `/products/${product.id}`, onClick: close, className: "text-[#476de4]", children: product.name }) }, product.id))] }) }), _jsx("tbody", { children: data.rows.map(row => _jsxs("tr", { className: "border-t border-[#e8edf5]", children: [_jsx("th", { className: "p-2 font-semibold", children: row.label }), row.values.map((value, index) => _jsx("td", { className: "p-2", children: value || 'Chưa có dữ liệu' }, `${row.label}-${data.products[index]?.id}`))] }, row.label)) })] }) });
}
export default function ChatBot() {
    const [open, setOpen] = useState(false), [input, setInput] = useState(''), [busy, setBusy] = useState(false);
    const [busyLabel, setBusyLabel] = useState('Đang trả lời...');
    const [session, setSession] = useState(savedSession);
    const [items, setItems] = useState([greeting]);
    const scroller = useRef(null);
    const stickToBottom = useRef(true);
    const busyRef = useRef(false);
    const createdHere = useRef(false);
    const generation = useRef(0);
    useEffect(() => {
        const resetForAccountChange = () => {
            generation.current++;
            sessionStorage.removeItem(storageKey);
            createdHere.current = false;
            setSession(null);
            setItems([greeting]);
        };
        window.addEventListener('identityUpdated', resetForAccountChange);
        return () => window.removeEventListener('identityUpdated', resetForAccountChange);
    }, []);
    useEffect(() => {
        if (!session || createdHere.current)
            return;
        let active = true;
        chatbotApi.history(session).then(result => {
            if (active && result.messages.length)
                setItems(result.messages.map(message => ({
                    id: message.id, role: message.role, text: message.text,
                })));
        }).catch(() => {
            if (active) {
                sessionStorage.removeItem(storageKey);
                setSession(null);
                setItems([greeting]);
            }
        });
        return () => { active = false; };
    }, [session]);
    useEffect(() => {
        if (open && stickToBottom.current)
            scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
    }, [items, busy, open]);
    async function send(text, clientMessageId = crypto.randomUUID(), isRetry = false) {
        if (!text.trim() || busyRef.current)
            return;
        const currentGeneration = generation.current;
        busyRef.current = true;
        setBusy(true);
        setBusyLabel('Đang xem yêu cầu của bạn...');
        setInput('');
        stickToBottom.current = true;
        setItems(current => [...current.filter(item => item.retry?.clientMessageId !== clientMessageId),
            ...(isRetry ? [] : [{ id: clientMessageId, role: 'user', text }])]);
        try {
            let current = session;
            if (!current) {
                current = await chatbotApi.startSession();
                if (currentGeneration !== generation.current)
                    return;
                sessionStorage.setItem(storageKey, JSON.stringify(current));
                createdHere.current = true;
                setSession(current);
            }
            const id = /đơn hàng|don hang|mã đơn|ma don|order/i.test(text) ? orderId.exec(text)?.[0] : undefined;
            const storeSlug = /^\/store\/([a-z0-9-]+)$/.exec(window.location.pathname)?.[1];
            const result = await chatbotApi.sendMessage(current, text, clientMessageId, id, storeSlug);
            if (currentGeneration !== generation.current)
                return;
            setItems(list => [...list, { id: result.messageId || crypto.randomUUID(), role: 'bot',
                    text: result.reply, products: result.products, stores: result.stores, comparison: result.comparison,
                    suggestedQuestions: result.suggestedQuestions, emptySearch: result.emptySearch }]);
        }
        catch (error) {
            if (currentGeneration !== generation.current)
                return;
            const message = error instanceof Error ? error.message : 'Chatbot tạm thời chưa sẵn sàng.';
            if (/Phiên chatbot đã hết hạn|Không có quyền với phiên chatbot/i.test(message)) {
                sessionStorage.removeItem(storageKey);
                createdHere.current = false;
                setSession(null);
            }
            setItems(list => [...list, { id: `error-${clientMessageId}`, role: 'bot',
                    text: message,
                    retry: { text, clientMessageId } }]);
        }
        finally {
            busyRef.current = false;
            setBusy(false);
        }
    }
    async function clearHistory() {
        if (busyRef.current)
            return;
        try {
            if (session)
                await chatbotApi.deleteSession(session);
        }
        catch (error) {
            if (error instanceof Error && /Phiên chatbot đã hết hạn|Không có quyền với phiên chatbot/i.test(error.message)) {
                sessionStorage.removeItem(storageKey);
                createdHere.current = false;
                setSession(null);
                setItems([greeting]);
                return;
            }
            setItems(list => [...list, { id: crypto.randomUUID(), role: 'bot',
                    text: error instanceof Error ? error.message : 'Chưa thể xóa lịch sử. Vui lòng thử lại.' }]);
            return;
        }
        createdHere.current = false;
        generation.current++;
        sessionStorage.removeItem(storageKey);
        setSession(null);
        setItems([greeting]);
        stickToBottom.current = true;
    }
    return _jsx("div", { className: "font-sans", children: open ? _jsxs("div", { className: "flex h-[min(640px,calc(100dvh-48px))] w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-[#dce3ee] bg-white shadow-2xl", children: [_jsxs("header", { className: "flex items-center justify-between bg-[#476de4] px-4 py-3 text-white", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Bot, { size: 21 }), _jsx("strong", { children: "Tr\u1EE3 l\u00FD mua s\u1EAFm" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { type: "button", onClick: () => void clearHistory(), disabled: busy, "aria-label": "X\u00F3a l\u1ECBch s\u1EED tr\u00F2 chuy\u1EC7n", title: "X\u00F3a l\u1ECBch s\u1EED", children: _jsx(Trash2, { size: 17 }) }), _jsx("button", { type: "button", onClick: () => setOpen(false), "aria-label": "\u0110\u00F3ng chatbot", children: _jsx(X, { size: 20 }) })] })] }), _jsxs("div", { ref: scroller, onScroll: event => {
                        const node = event.currentTarget;
                        stickToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100;
                    }, className: "flex-1 space-y-3 overflow-y-auto p-4 text-sm", "aria-live": "polite", "aria-label": "L\u1ECBch s\u1EED tr\u00F2 chuy\u1EC7n", children: [items.map(item => _jsxs("div", { className: `max-w-[92%] rounded-xl p-3 ${item.role === 'user'
                                ? 'ml-auto bg-[#476de4] text-white' : 'bg-[#f1f5fb] text-[#172a49]'}`, children: [_jsx("p", { className: "whitespace-pre-wrap", children: item.text }), item.emptySearch && _jsx("p", { className: "mt-2 text-xs text-[#718099]", role: "status", children: "Ch\u01B0a c\u00F3 s\u1EA3n ph\u1EA9m ph\u00F9 h\u1EE3p v\u1EDBi b\u1ED9 l\u1ECDc hi\u1EC7n t\u1EA1i." }), !!item.products?.length && _jsx("div", { className: "mt-3 space-y-2", children: item.products.map(product => _jsx(ProductCard, { product: product, close: () => setOpen(false) }, product.id)) }), item.comparison && _jsx(Comparison, { data: item.comparison, close: () => setOpen(false) }), !!item.stores?.length && _jsx("div", { className: "mt-3 space-y-2", children: item.stores.map(store => _jsx(Link, { to: `/store/${store.slug}`, onClick: () => setOpen(false), className: "block rounded-lg border bg-white p-2 text-[#172a49]", children: store.name }, store.id)) }), !!item.suggestedQuestions?.length && item.id === items.at(-1)?.id && _jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: item.suggestedQuestions.map(question => _jsx("button", { type: "button", disabled: busy, onClick: () => void send(question), className: "rounded-lg border border-[#dfe6f2] bg-white px-2 py-1 text-left text-xs text-[#476de4] disabled:opacity-50", children: question }, question)) }), item.retry && _jsxs("button", { type: "button", onClick: () => void send(item.retry.text, item.retry.clientMessageId, true), className: "mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#476de4]", children: [_jsx(RotateCcw, { size: 13 }), " Th\u1EED l\u1EA1i"] })] }, item.id)), busy && _jsxs("p", { className: "flex items-center gap-2 text-[#718099]", role: "status", children: [_jsx(LoaderCircle, { className: "animate-spin", size: 15 }), busyLabel] })] }), _jsx("p", { className: "border-t px-4 py-2 text-xs text-[#718099]", children: "Gi\u00E1, t\u1ED3n kho, voucher v\u00E0 tr\u1EA1ng th\u00E1i \u0111\u01A1n \u0111\u01B0\u1EE3c ki\u1EC3m tra t\u1EEB h\u1EC7 th\u1ED1ng. Kh\u00F4ng g\u1EEDi m\u1EADt kh\u1EA9u ho\u1EB7c th\u00F4ng tin th\u1EBB." }), _jsxs("form", { className: "flex gap-2 border-t p-3", onSubmit: event => { event.preventDefault(); void send(input.trim()); }, children: [_jsx("input", { value: input, onChange: event => setInput(event.target.value), maxLength: 500, onKeyDown: event => { if (event.key === 'Escape')
                                setOpen(false); }, placeholder: "H\u1ECFi v\u1EC1 s\u1EA3n ph\u1EA9m ho\u1EB7c \u0111\u01A1n h\u00E0ng...", "aria-label": "Nh\u1EADp c\u00E2u h\u1ECFi cho tr\u1EE3 l\u00FD", className: "min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" }), _jsx("button", { type: "submit", disabled: busy || !input.trim(), className: "rounded-lg bg-[#476de4] px-3 text-white disabled:opacity-50", "aria-label": "G\u1EEDi", children: _jsx(Send, { size: 18 }) })] })] }) : _jsx("button", { type: "button", onClick: () => setOpen(true), "aria-label": "M\u1EDF chatbot", className: "ml-auto grid h-14 w-14 place-items-center rounded-full bg-[#476de4] text-white shadow-lg", children: _jsx(MessageCircle, { size: 26 }) }) });
}
