import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import notificationApi, {} from '../../api/notificationApi';
export default function NotificationButton({ userId }) {
    const [open, setOpen] = useState(false), [items, setItems] = useState([]), [unread, setUnread] = useState(0);
    const root = useRef(null), seen = useRef(new Set());
    const navigate = useNavigate();
    const refresh = useCallback(async () => {
        if (!userId)
            return;
        const [list, count] = await Promise.all([notificationApi.list({ limit: 10 }), notificationApi.unread()]);
        setItems(list.notifications);
        setUnread(count.count);
        seen.current = new Set(list.notifications.map(item => item.id));
    }, [userId]);
    useEffect(() => {
        if (!userId) {
            setItems([]);
            setUnread(0);
            return;
        }
        void refresh().catch(() => { });
        const timer = window.setInterval(() => void refresh().catch(() => { }), 30000);
        window.addEventListener('notification:changed', refresh);
        window.addEventListener('notification:badge-changed', refresh);
        let active = true, socket = null;
        void notificationApi.socket().then(connected => {
            if (!active) {
                connected.disconnect();
                return;
            }
            socket = connected;
            connected.on('notification:new', (item) => {
                if (seen.current.has(item.id))
                    return;
                seen.current.add(item.id);
                setItems(current => [item, ...current].slice(0, 10));
                setUnread(count => count + 1);
                window.dispatchEvent(new Event('notification:changed'));
            });
        }).catch(() => { });
        return () => {
            active = false;
            socket?.disconnect();
            window.clearInterval(timer);
            window.removeEventListener('notification:changed', refresh);
            window.removeEventListener('notification:badge-changed', refresh);
        };
    }, [userId, refresh]);
    useEffect(() => {
        if (!open)
            return;
        const outside = (event) => { if (root.current && !root.current.contains(event.target))
            setOpen(false); };
        document.addEventListener('mousedown', outside);
        return () => document.removeEventListener('mousedown', outside);
    }, [open]);
    async function visit(item) {
        try {
            if (!item.isRead) {
                await notificationApi.read(item.id);
                setItems(current => current.map(row => row.id === item.id ? { ...row, isRead: true } : row));
                setUnread(count => Math.max(0, count - 1));
            }
        }
        catch { /* Deep link remains usable if the read update fails. */ }
        setOpen(false);
        navigate(item.deepLink);
    }
    async function markAll() {
        try {
            await notificationApi.readAll();
            setItems(current => current.map(item => ({ ...item, isRead: true })));
            setUnread(0);
            window.dispatchEvent(new Event('notification:changed'));
        }
        catch { /* The next poll will reconcile the badge. */ }
    }
    if (!userId)
        return null;
    return _jsxs("div", { className: "relative", ref: root, children: [_jsxs("button", { type: "button", onClick: () => setOpen(value => !value), className: "canva-header__icon-button", "aria-label": "Th\u00F4ng b\u00E1o", "aria-expanded": open, children: [_jsx(Bell, {}), unread > 0 && _jsx("span", { className: "canva-header__count", children: unread > 99 ? '99+' : unread })] }), open && _jsxs("div", { className: "absolute right-0 top-full z-[120] mt-2 max-h-[70vh] w-[min(380px,calc(100vw-24px))] overflow-y-auto rounded-2xl border bg-white p-3 shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b pb-2", children: [_jsx("strong", { children: "Th\u00F4ng b\u00E1o" }), _jsxs("button", { type: "button", onClick: () => void markAll(), className: "flex items-center gap-1 text-xs text-[#476de4]", children: [_jsx(Check, { size: 14 }), "\u0110\u00E3 \u0111\u1ECDc t\u1EA5t c\u1EA3"] })] }), items.map(item => _jsxs("button", { type: "button", onClick: () => void visit(item), className: `block w-full border-b px-2 py-3 text-left text-sm hover:bg-[#f5f7fc] ${item.isRead ? '' : 'bg-[#edf2ff]'}`, children: [_jsx("strong", { className: "block", children: item.title }), _jsx("span", { className: "mt-1 block", children: item.body }), _jsx("small", { className: "text-[#70819d]", children: new Date(item.createdAt).toLocaleString('vi-VN') })] }, item.id)), !items.length && _jsx("p", { className: "py-8 text-center text-sm text-[#70819d]", children: "Ch\u01B0a c\u00F3 th\u00F4ng b\u00E1o." }), _jsx(Link, { to: "/notifications", onClick: () => setOpen(false), className: "mt-3 block text-center font-semibold text-[#476de4]", children: "Xem t\u1EA5t c\u1EA3" })] })] });
}
