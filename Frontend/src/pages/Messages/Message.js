import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Ellipsis, FileText, Image as ImageIcon, MessageCirclePlus, PanelRightClose, PanelRightOpen, Paperclip, Pin, Search, Send, Smile } from "lucide-react";
import { identityApi } from "../../api/identityApi";
import { CHAT_BASE, chatV2Api } from "../../api/chatV2Api";
import { orderV2Api, vnd } from "../../api/orderV2Api";
import { orderStatusName } from "../Order/orderStatus";
import "./Message.css";
import "./MessageV2.css";
const append = (current, message) => current.some(item => item.id === message.id)
    ? current : [...current, message];
const displayTime = (value) => {
    if (!value)
        return "";
    const date = new Date(value);
    return date.toDateString() === new Date().toDateString()
        ? date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
        : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
};
const avatarColor = (name) => ["#5f72ec", "#ec7586", "#4479df", "#56a895", "#6683a8"][name.length % 5];
const quickReplies = ["Xin chào", "Đơn hàng của tôi đang ở đâu?", "Khi nào giao hàng?", "Cảm ơn bạn"];
export default function MessagePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [userId, setUserId] = useState("");
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [otherReadAt, setOtherReadAt] = useState(null);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [messageLoading, setMessageLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [messageSearch, setMessageSearch] = useState("");
    const [showMessageSearch, setShowMessageSearch] = useState(false);
    const [tab, setTab] = useState("all");
    const [pinnedIds, setPinnedIds] = useState([]);
    const [infoOpen, setInfoOpen] = useState(true);
    const [relatedOrder, setRelatedOrder] = useState(null);
    const socketRef = useRef(null);
    const fileRef = useRef(null);
    const inputRef = useRef(null);
    const bodyRef = useRef(null);
    const activeIdRef = useRef(id);
    const preserveScrollRef = useRef(null);
    const selected = conversations.find(item => item.id === id);
    const selectedStoreId = selected?.storeId;
    const unreadTotal = conversations.reduce((sum, item) => sum + item.unreadCount, 0);
    const visibleConversations = conversations.filter(item => {
        if (tab === "unread" && !item.unreadCount)
            return false;
        if (tab === "pinned" && !pinnedIds.includes(item.id))
            return false;
        return item.storeName.toLocaleLowerCase("vi-VN").includes(search.toLocaleLowerCase("vi-VN"));
    });
    const visibleMessages = messageSearch.trim()
        ? messages.filter(item => item.content.toLocaleLowerCase("vi-VN").includes(messageSearch.trim().toLocaleLowerCase("vi-VN")))
        : messages;
    const attachments = messages.filter(item => item.attachmentId).slice(-5).reverse();
    const relatedShopOrder = relatedOrder?.orders.find(order => order.storeId === selected?.storeId);
    const refresh = useCallback(async () => {
        const result = await chatV2Api.conversations();
        setConversations(result.conversations);
        window.dispatchEvent(new Event("chatV2Changed"));
    }, []);
    useEffect(() => {
        let alive = true;
        identityApi.me().then(user => {
            if (!alive)
                return;
            setUserId(user.id);
            try {
                const saved = JSON.parse(localStorage.getItem(`chat-pins:${user.id}`) || "[]");
                if (Array.isArray(saved))
                    setPinnedIds(saved.filter((value) => typeof value === "string"));
            }
            catch {
                setPinnedIds([]);
            }
            return refresh().catch(error => {
                if (alive)
                    toast.error(error instanceof Error ? error.message : "Không thể tải hội thoại.", { containerId: "general-toast" });
            });
        }).catch(() => { if (alive)
            navigate("/login"); })
            .finally(() => { if (alive)
            setLoading(false); });
        return () => { alive = false; };
    }, [navigate, refresh]);
    useEffect(() => {
        if (!loading && !id && conversations.length)
            navigate(`/messages/${conversations[0].id}`, { replace: true });
    }, [loading, id, conversations, navigate]);
    useEffect(() => {
        if (!id || !userId)
            return;
        let alive = true;
        setMessages([]);
        setCursor(null);
        setOtherReadAt(null);
        setMessageSearch("");
        setMessageLoading(true);
        void chatV2Api.messages(id).then(page => {
            if (!alive)
                return;
            setMessages(page.messages);
            setCursor(page.nextCursor);
            setOtherReadAt(page.otherReadAt);
            const last = page.messages.at(-1);
            if (last)
                void chatV2Api.read(id, last.id).then(refresh).catch(() => { });
        }).catch(error => {
            if (alive)
                toast.error(error instanceof Error ? error.message : "Không thể tải tin nhắn.", { containerId: "general-toast" });
        }).finally(() => { if (alive)
            setMessageLoading(false); });
        void chatV2Api.socket().then(socket => {
            if (!alive) {
                socket.disconnect();
                return;
            }
            socketRef.current = socket;
            socket.on("connect", () => socket.emit("chat:join", id, (result) => {
                if (!result.ok)
                    toast.error(result.message || "Không thể tham gia hội thoại.", { containerId: "general-toast" });
            }));
            socket.on("chat:message", (message) => {
                if (message.conversationId !== id)
                    return;
                setMessages(current => append(current, message));
                if (message.senderId !== userId)
                    void chatV2Api.read(id, message.id).then(refresh).catch(() => { });
            });
            socket.on("chat:read", (event) => {
                if (event.conversationId === id && event.userId !== userId)
                    setOtherReadAt(event.lastReadAt);
                void refresh().catch(() => { });
            });
            socket.on("connect_error", error => {
                if (import.meta.env.DEV)
                    console.error("[Chat Socket] Connection failed", { url: CHAT_BASE, message: error.message, error });
                toast.warning("Kết nối trực tiếp tạm gián đoạn; bạn vẫn có thể gửi tin nhắn.", { containerId: "general-toast", toastId: "chat-socket-error" });
            });
        }).catch(error => {
            if (import.meta.env.DEV)
                console.error("[Chat Socket] Could not initialize", { url: CHAT_BASE, error });
        });
        return () => { alive = false; socketRef.current?.disconnect(); socketRef.current = null; };
    }, [id, userId, refresh]);
    useEffect(() => {
        if (!selectedStoreId) {
            setRelatedOrder(null);
            return;
        }
        let alive = true;
        setRelatedOrder(null);
        orderV2Api.buyerOrders({ page: 1, limit: 50 }).then(result => {
            if (alive)
                setRelatedOrder(result.groups?.find(group => group.orders.some(order => order.storeId === selectedStoreId)) || null);
        }).catch(() => { });
        return () => { alive = false; };
    }, [selectedStoreId]);
    useLayoutEffect(() => {
        activeIdRef.current = id;
        const body = bodyRef.current;
        if (!body)
            return;
        if (preserveScrollRef.current) {
            body.scrollTop = body.scrollHeight - preserveScrollRef.current.height + preserveScrollRef.current.top;
            preserveScrollRef.current = null;
        }
        else if (!messageSearch)
            body.scrollTop = body.scrollHeight;
    }, [messages.length, id, messageSearch]);
    function togglePin(conversationId) {
        const next = pinnedIds.includes(conversationId)
            ? pinnedIds.filter(value => value !== conversationId) : [...pinnedIds, conversationId];
        setPinnedIds(next);
        if (userId)
            try {
                localStorage.setItem(`chat-pins:${userId}`, JSON.stringify(next));
            }
            catch { /* Pin remains usable in this session. */ }
    }
    async function deliver(content, type, attachmentId) {
        if (!id)
            return;
        const conversationId = id;
        const input = { conversationId, clientMessageId: crypto.randomUUID(), type, content, ...(attachmentId ? { attachmentId } : {}) };
        let result = null;
        const socket = socketRef.current;
        if (socket?.connected)
            try {
                result = await new Promise((resolve, reject) => socket.timeout(5000).emit("chat:send", input, (error, reply) => {
                    if (error || !reply?.ok || !reply.message)
                        reject(error || new Error(reply?.code || "Socket error"));
                    else
                        resolve({ message: reply.message, duplicate: Boolean(reply.duplicate) });
                }));
            }
            catch { /* Retry through REST with the same clientMessageId. */ }
        if (!result)
            result = await chatV2Api.send(conversationId, input);
        if (activeIdRef.current === conversationId) {
            setMessages(current => append(current, result.message));
            setDraft("");
        }
        await refresh();
    }
    async function submit() {
        const content = draft.trim();
        if (!id || busy || !content)
            return;
        setBusy(true);
        try {
            await deliver(content, "text");
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể gửi tin nhắn.", { containerId: "general-toast" });
        }
        finally {
            setBusy(false);
        }
    }
    async function upload(file) {
        if (!id || busy)
            return;
        setBusy(true);
        try {
            const result = await chatV2Api.upload(file);
            await deliver(file.name.slice(0, 200), result.attachment.mimeType.startsWith("image/") ? "image" : "file", result.attachment.id);
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể gửi tệp.", { containerId: "general-toast" });
        }
        finally {
            setBusy(false);
        }
    }
    async function older() {
        if (!id || !cursor || !bodyRef.current)
            return;
        const conversationId = id;
        preserveScrollRef.current = { top: bodyRef.current.scrollTop, height: bodyRef.current.scrollHeight };
        try {
            const page = await chatV2Api.messages(conversationId, cursor);
            if (activeIdRef.current !== conversationId) {
                preserveScrollRef.current = null;
                return;
            }
            setMessages(current => [...page.messages.filter(item => !current.some(row => row.id === item.id)), ...current]);
            setCursor(page.nextCursor);
            if (!page.messages.length)
                preserveScrollRef.current = null;
        }
        catch (error) {
            preserveScrollRef.current = null;
            toast.error(error instanceof Error ? error.message : "Không thể tải lịch sử.", { containerId: "general-toast" });
        }
    }
    async function openAttachment(attachmentId) {
        try {
            const result = await chatV2Api.attachmentUrl(attachmentId);
            window.open(result.url, "_blank", "noopener,noreferrer");
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể mở tệp.", { containerId: "general-toast" });
        }
    }
    async function report() {
        if (!id)
            return;
        const reason = window.prompt("Mô tả hành vi cần báo cáo (ít nhất 10 ký tự):");
        if (!reason)
            return;
        try {
            await chatV2Api.report(id, reason);
            toast.success("Đã ghi nhận báo cáo.", { containerId: "general-toast" });
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể gửi báo cáo.", { containerId: "general-toast" });
        }
    }
    if (loading)
        return _jsx("div", { className: "messages-page messages-loading", role: "status", children: "\u0110ang t\u1EA3i h\u1ED9i tho\u1EA1i..." });
    return _jsxs("div", { className: "messages-page", children: [_jsxs("nav", { className: "messages-breadcrumb", "aria-label": "\u0110\u01B0\u1EDDng d\u1EABn trang", children: [_jsx(Link, { to: "/", children: "Trang ch\u1EE7" }), _jsx("span", { children: "/" }), _jsx("strong", { children: "Tin nh\u1EAFn" })] }), _jsxs("div", { className: `messages-layout${infoOpen ? "" : " is-info-closed"}`, children: [_jsxs("aside", { className: "conversation-panel", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsxs("h2", { children: ["Cu\u1ED9c tr\u00F2 chuy\u1EC7n", unreadTotal > 0 ? ` (${unreadTotal})` : ""] }), _jsx("small", { children: unreadTotal > 0 ? `${unreadTotal} tin chưa đọc` : `${conversations.length} hội thoại` })] }), _jsxs(Link, { to: "/store", children: [_jsx(MessageCirclePlus, { size: 15 }), " Tin nh\u1EAFn m\u1EDBi"] })] }), _jsxs("label", { className: "conversation-search", children: [_jsx(Search, { size: 16 }), _jsx("input", { value: search, onChange: event => setSearch(event.target.value), placeholder: "T\u00ECm cu\u1ED9c tr\u00F2 chuy\u1EC7n...", "aria-label": "T\u00ECm cu\u1ED9c tr\u00F2 chuy\u1EC7n" })] }), _jsxs("div", { className: "conversation-tabs", role: "group", "aria-label": "L\u1ECDc h\u1ED9i tho\u1EA1i", children: [_jsx("button", { type: "button", className: tab === "all" ? "is-active" : "", "aria-pressed": tab === "all", onClick: () => setTab("all"), children: "T\u1EA5t c\u1EA3" }), _jsx("button", { type: "button", className: tab === "unread" ? "is-active" : "", "aria-pressed": tab === "unread", onClick: () => setTab("unread"), children: "Ch\u01B0a \u0111\u1ECDc" }), _jsx("button", { type: "button", className: tab === "pinned" ? "is-active" : "", "aria-pressed": tab === "pinned", onClick: () => setTab("pinned"), children: "\u0110\u00E3 ghim" })] }), _jsx("div", { className: "conversation-list", children: visibleConversations.map(item => _jsxs("div", { className: `conversation-row${id === item.id ? " is-active" : ""}`, children: [_jsxs("button", { type: "button", className: "conversation-row__main", onClick: () => navigate(`/messages/${item.id}`), children: [_jsx("span", { className: "conversation-avatar", style: { backgroundColor: avatarColor(item.storeName) }, children: item.storeName.slice(0, 2).toUpperCase() }), _jsxs("span", { className: "conversation-copy", children: [_jsx("strong", { children: item.storeName }), _jsx("small", { children: item.lastMessagePreview || "Chưa có tin nhắn" }), item.unreadCount > 0 && _jsx("em", { children: item.unreadCount })] }), _jsx("span", { className: "conversation-meta", children: _jsx("small", { children: displayTime(item.lastMessageAt) }) })] }), _jsx("button", { type: "button", className: `conversation-row__pin${pinnedIds.includes(item.id) ? " is-pinned" : ""}`, onClick: () => togglePin(item.id), "aria-label": `${pinnedIds.includes(item.id) ? "Bỏ ghim" : "Ghim"} ${item.storeName}`, title: "Ghim tr\u00EAn thi\u1EBFt b\u1ECB n\u00E0y", children: _jsx(Pin, { size: 14 }) })] }, item.id)) }), !visibleConversations.length && _jsx("p", { className: "conversation-empty", children: conversations.length ? "Không có hội thoại phù hợp." : "Chưa có hội thoại. Hãy mở một cửa hàng để bắt đầu nhắn tin." })] }), _jsx("main", { className: `chat-panel${selected ? " has-selection" : ""}`, children: selected ? _jsxs(_Fragment, { children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("span", { className: "conversation-avatar", style: { backgroundColor: avatarColor(selected.storeName) }, children: selected.storeName.slice(0, 2).toUpperCase() }), _jsxs("span", { children: [_jsx("strong", { children: selected.storeName }), _jsx("small", { children: "C\u1EEDa h\u00E0ng tr\u00EAn MDUC247" })] })] }), _jsxs("div", { className: "chat-panel__tools", children: [_jsx("button", { type: "button", onClick: () => setShowMessageSearch(value => !value), "aria-label": "T\u00ECm trong tin \u0111\u00E3 t\u1EA3i", title: "T\u00ECm trong tin \u0111\u00E3 t\u1EA3i", children: _jsx(Search, { size: 18 }) }), _jsx("button", { type: "button", onClick: () => setInfoOpen(value => !value), "aria-label": infoOpen ? "Ẩn thông tin hội thoại" : "Hiện thông tin hội thoại", title: "Th\u00F4ng tin h\u1ED9i tho\u1EA1i", children: infoOpen ? _jsx(PanelRightClose, { size: 18 }) : _jsx(PanelRightOpen, { size: 18 }) }), _jsx("button", { type: "button", onClick: () => void report(), "aria-label": "B\u00E1o c\u00E1o h\u1ED9i tho\u1EA1i", title: "B\u00E1o c\u00E1o h\u1ED9i tho\u1EA1i", children: _jsx(Ellipsis, { size: 18 }) })] })] }), showMessageSearch && _jsxs("div", { className: "chat-message-search", children: [_jsx(Search, { size: 15 }), _jsx("input", { value: messageSearch, onChange: event => setMessageSearch(event.target.value), placeholder: "T\u00ECm trong tin \u0111\u00E3 t\u1EA3i...", "aria-label": "T\u00ECm trong tin \u0111\u00E3 t\u1EA3i" }), _jsx("button", { type: "button", onClick: () => { setMessageSearch(""); setShowMessageSearch(false); }, children: "\u0110\u00F3ng" })] }), _jsxs("div", { className: "chat-body", ref: bodyRef, children: [cursor && !messageSearch && _jsx("button", { type: "button", className: "chat-load-older", onClick: () => void older(), children: "T\u1EA3i tin c\u0169 h\u01A1n" }), messageLoading ? _jsx("p", { className: "chat-body__empty", children: "\u0110ang t\u1EA3i tin nh\u1EAFn..." }) : visibleMessages.map((message, index) => {
                                            const day = new Date(message.createdAt).toDateString();
                                            const previousDay = index ? new Date(visibleMessages[index - 1].createdAt).toDateString() : "";
                                            return _jsxs(Fragment, { children: [day !== previousDay && _jsx("span", { className: "chat-day", children: new Date(message.createdAt).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" }) }), _jsxs("div", { className: `chat-message${message.senderId === userId ? " is-mine" : ""}`, children: [_jsx("p", { children: message.content || (message.type === "image" ? "Ảnh đính kèm" : "Tệp đính kèm") }), message.attachmentId && _jsxs("button", { type: "button", className: "chat-message__attachment", onClick: () => void openAttachment(message.attachmentId), children: [message.type === "image" ? _jsx(ImageIcon, { size: 14 }) : _jsx(FileText, { size: 14 }), message.type === "image" ? "Xem ảnh" : "Mở tệp đính kèm"] }), _jsxs("small", { children: [displayTime(message.createdAt), message.senderId === userId ? otherReadAt && Date.parse(message.createdAt) <= Date.parse(otherReadAt) ? " · Đã xem" : " · Đã gửi" : ""] })] })] }, message.id);
                                        }), !messageLoading && !visibleMessages.length && _jsx("p", { className: "chat-body__empty", children: messageSearch ? "Không tìm thấy tin nhắn phù hợp." : "Hãy gửi lời chào đầu tiên." })] }), _jsx("div", { className: "quick-replies", children: quickReplies.map(reply => _jsx("button", { type: "button", onClick: () => { setDraft(reply); inputRef.current?.focus(); }, children: reply }, reply)) }), _jsxs("form", { className: "chat-composer", onSubmit: event => { event.preventDefault(); void submit(); }, children: [_jsx("input", { ref: fileRef, type: "file", className: "hidden", accept: "image/png,image/jpeg,image/webp,application/pdf", onChange: event => { const file = event.target.files?.[0]; if (file)
                                                void upload(file); event.target.value = ""; } }), _jsx("button", { type: "button", onClick: () => fileRef.current?.click(), disabled: busy, "aria-label": "\u0110\u00EDnh k\u00E8m t\u1EC7p", children: _jsx(Paperclip, {}) }), _jsx("button", { type: "button", onClick: () => { setDraft(value => `${value}😊`); inputRef.current?.focus(); }, disabled: busy, "aria-label": "Ch\u00E8n bi\u1EC3u t\u01B0\u1EE3ng c\u1EA3m x\u00FAc", children: _jsx(Smile, {}) }), _jsx("input", { ref: inputRef, value: draft, onChange: event => setDraft(event.target.value), maxLength: 2000, placeholder: "Nh\u1EADp tin nh\u1EAFn...", "aria-label": "N\u1ED9i dung tin nh\u1EAFn" }), _jsx("button", { type: "submit", disabled: busy || !draft.trim(), className: "is-send", "aria-label": "G\u1EEDi tin nh\u1EAFn", children: _jsx(Send, {}) })] })] }) : _jsxs("div", { className: "chat-panel__empty", children: [_jsx(MessageCirclePlus, { size: 31 }), _jsx("h2", { children: "Ch\u1ECDn m\u1ED9t cu\u1ED9c tr\u00F2 chuy\u1EC7n" }), _jsx("p", { children: "Ho\u1EB7c m\u1EDF m\u1ED9t c\u1EEDa h\u00E0ng \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u nh\u1EAFn tin." }), _jsx(Link, { to: "/store", children: "Kh\u00E1m ph\u00E1 c\u1EEDa h\u00E0ng" })] }) }), infoOpen && _jsxs("aside", { className: "chat-info", children: [_jsx("h2", { children: "Th\u00F4ng tin cu\u1ED9c tr\u00F2 chuy\u1EC7n" }), selected && _jsxs(_Fragment, { children: [_jsxs("section", { className: "shop-profile", children: [_jsx("span", { className: "conversation-avatar", style: { backgroundColor: avatarColor(selected.storeName) }, children: selected.storeName.slice(0, 2).toUpperCase() }), _jsx("strong", { children: selected.storeName }), _jsx("small", { children: "C\u1EEDa h\u00E0ng tr\u00EAn MDUC247" }), selected.storeSlug && _jsx(Link, { to: `/store/${selected.storeSlug}`, children: "Kh\u00E1m ph\u00E1 c\u1EEDa h\u00E0ng" })] }), relatedOrder && relatedShopOrder && _jsxs("section", { className: "related-order", children: [_jsx("h3", { children: "\u0110\u01A1n h\u00E0ng li\u00EAn quan" }), _jsxs("p", { children: ["\u0110\u01A1n #", relatedOrder.id.slice(0, 8).toUpperCase()] }), _jsx("span", { children: orderStatusName(relatedShopOrder.status) }), _jsxs("strong", { children: ["T\u1ED5ng ti\u1EC1n: ", vnd(relatedShopOrder.totalMinor)] }), _jsx(Link, { to: `/orders/${relatedOrder.id}`, children: "Xem chi ti\u1EBFt \u0111\u01A1n h\u00E0ng" })] }), attachments.length > 0 && _jsxs("section", { className: "chat-files", children: [_jsx("h3", { children: "T\u1EC7p v\u00E0 li\u00EAn k\u1EBFt" }), attachments.map(message => _jsxs("button", { type: "button", onClick: () => void openAttachment(message.attachmentId), children: [message.type === "image" ? _jsx(ImageIcon, { size: 17 }) : _jsx(FileText, { size: 17 }), _jsxs("span", { children: [message.content || (message.type === "image" ? "Ảnh đính kèm" : "Tệp đính kèm"), _jsx("small", { children: new Date(message.createdAt).toLocaleDateString("vi-VN") })] })] }, message.id))] })] })] })] })] });
}
