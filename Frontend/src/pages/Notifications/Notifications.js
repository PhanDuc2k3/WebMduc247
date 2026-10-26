import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import ContentBreadcrumb from '../../components/ui/ContentBreadcrumb';
import notificationApi, {} from '../../api/notificationApi';
export default function Notifications() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]), [cursor, setCursor] = useState(null);
    const [type, setType] = useState(''), [unreadOnly, setUnreadOnly] = useState(false), [unread, setUnread] = useState(0);
    const [selected, setSelected] = useState([]), [prefs, setPrefs] = useState(null);
    const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const refresh = useCallback(async () => {
        try {
            const [list, count] = await Promise.all([notificationApi.list({ limit: 20, type, unreadOnly }),
                notificationApi.unread()]);
            setItems(list.notifications);
            setCursor(list.nextCursor);
            setUnread(count.count);
            setError('');
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Không thể tải thông báo.');
        }
        finally {
            setLoading(false);
        }
    }, [type, unreadOnly]);
    useEffect(() => { setLoading(true); void refresh(); }, [refresh]);
    useEffect(() => {
        void notificationApi.preferences().then(setPrefs).catch(() => { });
        let active = true, socket = null;
        void notificationApi.socket().then(connected => {
            if (!active) {
                connected.disconnect();
                return;
            }
            socket = connected;
            connected.on('notification:new', () => void refresh());
        }).catch(() => { });
        window.addEventListener('notification:changed', refresh);
        const timer = window.setInterval(() => void notificationApi.unread().then(result => setUnread(result.count)).catch(() => { }), 30000);
        return () => {
            active = false;
            socket?.disconnect();
            window.clearInterval(timer);
            window.removeEventListener('notification:changed', refresh);
        };
    }, [refresh]);
    async function loadMore() {
        if (!cursor || busy)
            return;
        setBusy(true);
        try {
            const list = await notificationApi.list({ limit: 20, cursor, type, unreadOnly });
            setItems(current => [...current, ...list.notifications.filter(item => !current.some(row => row.id === item.id))]);
            setCursor(list.nextCursor);
        }
        catch (cause) {
            toast.error(cause instanceof Error ? cause.message : 'Không thể tải thêm.');
        }
        finally {
            setBusy(false);
        }
    }
    async function visit(item) {
        try {
            if (!item.isRead) {
                await notificationApi.read(item.id);
                setItems(current => current.map(row => row.id === item.id ? { ...row, isRead: true } : row));
                setUnread(count => Math.max(0, count - 1));
                window.dispatchEvent(new Event('notification:badge-changed'));
            }
        }
        catch (cause) {
            toast.error(cause instanceof Error ? cause.message : 'Không thể đánh dấu đã đọc.');
        }
        navigate(item.deepLink);
    }
    async function markAll() {
        setBusy(true);
        try {
            await notificationApi.readAll();
            setItems(current => current.map(row => ({ ...row, isRead: true })));
            setUnread(0);
            setSelected([]);
            window.dispatchEvent(new Event('notification:badge-changed'));
        }
        catch (cause) {
            toast.error(cause instanceof Error ? cause.message : 'Không thể đánh dấu đã đọc.');
        }
        finally {
            setBusy(false);
        }
    }
    async function markSelected() {
        if (!selected.length)
            return;
        setBusy(true);
        try {
            await notificationApi.readMany(selected);
            setItems(current => current.map(row => selected.includes(row.id) ? { ...row, isRead: true } : row));
            setSelected([]);
            setUnread((await notificationApi.unread()).count);
            window.dispatchEvent(new Event('notification:badge-changed'));
        }
        catch (cause) {
            toast.error(cause instanceof Error ? cause.message : 'Không thể cập nhật thông báo.');
        }
        finally {
            setBusy(false);
        }
    }
    async function remove(id) {
        setBusy(true);
        try {
            await notificationApi.remove(id);
            setItems(current => current.filter(row => row.id !== id));
            setUnread((await notificationApi.unread()).count);
            window.dispatchEvent(new Event('notification:badge-changed'));
        }
        catch (cause) {
            toast.error(cause instanceof Error ? cause.message : 'Không thể xóa thông báo.');
        }
        finally {
            setBusy(false);
        }
    }
    async function setPreference(key, value) {
        try {
            setPrefs(await notificationApi.setPreferences({ [key]: value }));
            toast.success('Đã lưu cài đặt thông báo.');
        }
        catch (cause) {
            toast.error(cause instanceof Error ? cause.message : 'Không thể lưu cài đặt.');
        }
    }
    async function markOne(item) {
        try {
            await notificationApi.read(item.id);
            setItems(current => current.map(row => row.id === item.id ? { ...row, isRead: true } : row));
            setUnread(count => Math.max(0, count - 1));
            window.dispatchEvent(new Event('notification:badge-changed'));
        }
        catch (cause) {
            toast.error(cause instanceof Error ? cause.message : 'Không thể đánh dấu đã đọc.');
        }
    }
    return _jsxs("div", { className: "mx-auto max-w-4xl px-3 py-8", children: [_jsx(ContentBreadcrumb, { items: [{ label: 'Thông báo' }] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center justify-between gap-3", children: [_jsx("h1", { className: "text-3xl font-extrabold", children: "Th\u00F4ng b\u00E1o" }), _jsxs("span", { className: "rounded-full bg-[#edf2ff] px-3 py-1 text-sm font-semibold text-[#476de4]", children: [unread, " ch\u01B0a \u0111\u1ECDc"] })] }), _jsxs("div", { className: "mt-5 flex flex-wrap gap-2 rounded-2xl border bg-white p-4", children: [_jsxs("select", { value: type, onChange: event => setType(event.target.value), className: "rounded-lg border px-3 py-2", "aria-label": "Lo\u1EA1i th\u00F4ng b\u00E1o", children: [_jsx("option", { value: "", children: "T\u1EA5t c\u1EA3 lo\u1EA1i" }), _jsx("option", { value: "order", children: "\u0110\u01A1n h\u00E0ng" }), _jsx("option", { value: "payment", children: "Thanh to\u00E1n" }), _jsx("option", { value: "seller", children: "C\u1EEDa h\u00E0ng" }), _jsx("option", { value: "chat", children: "Tin nh\u1EAFn" })] }), _jsxs("label", { className: "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: unreadOnly, onChange: event => setUnreadOnly(event.target.checked) }), "Ch\u01B0a \u0111\u1ECDc"] }), _jsx("button", { type: "button", disabled: busy || !selected.length, onClick: () => void markSelected(), className: "rounded-lg border px-3 py-2 text-sm disabled:opacity-50", children: "\u0110\u00E3 \u0111\u1ECDc m\u1EE5c ch\u1ECDn" }), _jsx("button", { type: "button", disabled: busy || unread === 0, onClick: () => void markAll(), className: "rounded-lg bg-[#476de4] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50", children: "\u0110\u00E3 \u0111\u1ECDc t\u1EA5t c\u1EA3" })] }), error && _jsxs("div", { className: "mt-5 rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700", children: [error, " ", _jsx(Link, { to: "/login", className: "underline", children: "\u0110\u0103ng nh\u1EADp" })] }), _jsx("div", { className: "mt-5 space-y-3", children: loading ? _jsx("p", { children: "\u0110ang t\u1EA3i th\u00F4ng b\u00E1o..." }) : items.length ? items.map(item => _jsxs("article", { className: `flex gap-3 rounded-xl border p-4 ${item.isRead ? 'bg-white' : 'border-[#b9c9ff] bg-[#edf2ff]'}`, children: [_jsx("input", { type: "checkbox", checked: selected.includes(item.id), onChange: event => setSelected(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id)), "aria-label": "Ch\u1ECDn th\u00F4ng b\u00E1o" }), _jsx(Bell, { className: "mt-1 shrink-0 text-[#476de4]", size: 19 }), _jsxs("button", { type: "button", onClick: () => void visit(item), className: "min-w-0 flex-1 text-left", children: [_jsx("strong", { className: "block", children: item.title }), _jsx("span", { className: "mt-1 block text-sm", children: item.body }), _jsx("small", { className: "mt-1 block text-[#718099]", children: new Date(item.createdAt).toLocaleString('vi-VN') })] }), !item.isRead && _jsx("button", { type: "button", onClick: () => void markOne(item), "aria-label": "\u0110\u00E3 \u0111\u1ECDc", children: _jsx(Check, { size: 18 }) }), _jsx("button", { type: "button", disabled: busy, onClick: () => void remove(item.id), "aria-label": "X\u00F3a th\u00F4ng b\u00E1o", children: _jsx(Trash2, { size: 18 }) })] }, item.id)) : _jsx("p", { className: "rounded-xl border bg-white p-8 text-center text-[#718099]", children: "Ch\u01B0a c\u00F3 th\u00F4ng b\u00E1o." }) }), cursor && _jsx("button", { type: "button", disabled: busy, onClick: () => void loadMore(), className: "mx-auto mt-5 block rounded-lg border bg-white px-4 py-2 disabled:opacity-50", children: "T\u1EA3i th\u00EAm" }), prefs && _jsxs("section", { className: "mt-8 rounded-2xl border bg-white p-5", children: [_jsx("h2", { className: "text-xl font-bold", children: "C\u00E0i \u0111\u1EB7t th\u00F4ng b\u00E1o" }), _jsx("p", { className: "mt-1 text-sm text-[#718099]", children: "Email b\u1EA3o m\u1EADt v\u00E0 giao d\u1ECBch thi\u1EBFt y\u1EBFu v\u1EABn \u0111\u01B0\u1EE3c g\u1EEDi theo ch\u00EDnh s\u00E1ch." }), [['marketingOptIn', 'Tiếp thị'], ['emailChat', 'Email tin nhắn'], ['emailSeller', 'Email hoạt động shop'],
                        ['webChat', 'Thông báo chat trong web']].map(([key, label]) => _jsxs("label", { className: "mt-3 flex items-center justify-between border-t pt-3 text-sm", children: [_jsx("span", { children: label }), _jsx("input", { type: "checkbox", checked: prefs[key], onChange: event => void setPreference(key, event.target.checked) })] }, key))] })] });
}
