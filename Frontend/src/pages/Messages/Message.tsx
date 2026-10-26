import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Ellipsis, FileText, Image as ImageIcon, MessageCirclePlus, PanelRightClose, PanelRightOpen, Paperclip, Pin, Search, Send, Smile } from "lucide-react";
import type { Socket } from "socket.io-client";
import { identityApi } from "../../api/identityApi";
import { CHAT_BASE, chatV2Api, type ChatConversation, type ChatMessage } from "../../api/chatV2Api";
import { orderV2Api, vnd, type OrderGroupV2 } from "../../api/orderV2Api";
import { orderStatusName } from "../Order/orderStatus";
import "./Message.css";
import "./MessageV2.css";

type ConversationTab = "all" | "unread" | "pinned";
const append = (current: ChatMessage[], message: ChatMessage) => current.some(item => item.id === message.id)
  ? current : [...current, message];
const displayTime = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
};
const avatarColor = (name: string) => ["#5f72ec", "#ec7586", "#4479df", "#56a895", "#6683a8"][name.length % 5];
const quickReplies = ["Xin chào", "Đơn hàng của tôi đang ở đâu?", "Khi nào giao hàng?", "Cảm ơn bạn"];

export default function MessagePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [otherReadAt, setOtherReadAt] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [tab, setTab] = useState<ConversationTab>("all");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [infoOpen, setInfoOpen] = useState(true);
  const [relatedOrder, setRelatedOrder] = useState<OrderGroupV2 | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const activeIdRef = useRef(id);
  const preserveScrollRef = useRef<{ top: number; height: number } | null>(null);
  const selected = conversations.find(item => item.id === id);
  const selectedStoreId = selected?.storeId;
  const unreadTotal = conversations.reduce((sum, item) => sum + item.unreadCount, 0);
  const visibleConversations = conversations.filter(item => {
    if (tab === "unread" && !item.unreadCount) return false;
    if (tab === "pinned" && !pinnedIds.includes(item.id)) return false;
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
      if (!alive) return;
      setUserId(user.id);
      try {
        const saved = JSON.parse(localStorage.getItem(`chat-pins:${user.id}`) || "[]");
        if (Array.isArray(saved)) setPinnedIds(saved.filter((value): value is string => typeof value === "string"));
      } catch { setPinnedIds([]); }
      return refresh().catch(error => {
        if (alive) toast.error(error instanceof Error ? error.message : "Không thể tải hội thoại.", { containerId: "general-toast" });
      });
    }).catch(() => { if (alive) navigate("/login"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [navigate, refresh]);

  useEffect(() => {
    if (!loading && !id && conversations.length) navigate(`/messages/${conversations[0].id}`, { replace: true });
  }, [loading, id, conversations, navigate]);

  useEffect(() => {
    if (!id || !userId) return;
    let alive = true;
    setMessages([]); setCursor(null); setOtherReadAt(null); setMessageSearch(""); setMessageLoading(true);
    void chatV2Api.messages(id).then(page => {
      if (!alive) return;
      setMessages(page.messages); setCursor(page.nextCursor); setOtherReadAt(page.otherReadAt);
      const last = page.messages.at(-1);
      if (last) void chatV2Api.read(id, last.id).then(refresh).catch(() => {});
    }).catch(error => {
      if (alive) toast.error(error instanceof Error ? error.message : "Không thể tải tin nhắn.", { containerId: "general-toast" });
    }).finally(() => { if (alive) setMessageLoading(false); });
    void chatV2Api.socket().then(socket => {
      if (!alive) { socket.disconnect(); return; }
      socketRef.current = socket;
      socket.on("connect", () => socket.emit("chat:join", id, (result: { ok: boolean; message?: string }) => {
        if (!result.ok) toast.error(result.message || "Không thể tham gia hội thoại.", { containerId: "general-toast" });
      }));
      socket.on("chat:message", (message: ChatMessage) => {
        if (message.conversationId !== id) return;
        setMessages(current => append(current, message));
        if (message.senderId !== userId) void chatV2Api.read(id, message.id).then(refresh).catch(() => {});
      });
      socket.on("chat:read", (event: { conversationId: string; userId: string; lastReadAt: string }) => {
        if (event.conversationId === id && event.userId !== userId) setOtherReadAt(event.lastReadAt);
        void refresh().catch(() => {});
      });
      socket.on("connect_error", error => {
        if (import.meta.env.DEV) console.error("[Chat Socket] Connection failed", { url: CHAT_BASE, message: error.message, error });
        toast.warning("Kết nối trực tiếp tạm gián đoạn; bạn vẫn có thể gửi tin nhắn.", { containerId: "general-toast", toastId: "chat-socket-error" });
      });
    }).catch(error => {
      if (import.meta.env.DEV) console.error("[Chat Socket] Could not initialize", { url: CHAT_BASE, error });
    });
    return () => { alive = false; socketRef.current?.disconnect(); socketRef.current = null; };
  }, [id, userId, refresh]);

  useEffect(() => {
    if (!selectedStoreId) { setRelatedOrder(null); return; }
    let alive = true;
    setRelatedOrder(null);
    orderV2Api.buyerOrders({ page: 1, limit: 50 }).then(result => {
      if (alive) setRelatedOrder(result.groups?.find(group => group.orders.some(order => order.storeId === selectedStoreId)) || null);
    }).catch(() => {});
    return () => { alive = false; };
  }, [selectedStoreId]);

  useLayoutEffect(() => {
    activeIdRef.current = id;
    const body = bodyRef.current;
    if (!body) return;
    if (preserveScrollRef.current) {
      body.scrollTop = body.scrollHeight - preserveScrollRef.current.height + preserveScrollRef.current.top;
      preserveScrollRef.current = null;
    } else if (!messageSearch) body.scrollTop = body.scrollHeight;
  }, [messages.length, id, messageSearch]);

  function togglePin(conversationId: string) {
    const next = pinnedIds.includes(conversationId)
      ? pinnedIds.filter(value => value !== conversationId) : [...pinnedIds, conversationId];
    setPinnedIds(next);
    if (userId) try { localStorage.setItem(`chat-pins:${userId}`, JSON.stringify(next)); } catch { /* Pin remains usable in this session. */ }
  }

  async function deliver(content: string, type: "text" | "image" | "file", attachmentId?: string) {
    if (!id) return;
    const conversationId = id;
    const input = { conversationId, clientMessageId: crypto.randomUUID(), type, content, ...(attachmentId ? { attachmentId } : {}) };
    let result: { message: ChatMessage; duplicate: boolean } | null = null;
    const socket = socketRef.current;
    if (socket?.connected) try {
      result = await new Promise((resolve, reject) => socket.timeout(5000).emit("chat:send", input,
        (error: Error | null, reply: { ok: boolean; message?: ChatMessage; duplicate?: boolean; code?: string }) => {
          if (error || !reply?.ok || !reply.message) reject(error || new Error(reply?.code || "Socket error"));
          else resolve({ message: reply.message, duplicate: Boolean(reply.duplicate) });
        }));
    } catch { /* Retry through REST with the same clientMessageId. */ }
    if (!result) result = await chatV2Api.send(conversationId, input);
    if (activeIdRef.current === conversationId) {
      setMessages(current => append(current, result.message));
      setDraft("");
    }
    await refresh();
  }

  async function submit() {
    const content = draft.trim();
    if (!id || busy || !content) return;
    setBusy(true);
    try { await deliver(content, "text"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Không thể gửi tin nhắn.", { containerId: "general-toast" }); }
    finally { setBusy(false); }
  }

  async function upload(file: File) {
    if (!id || busy) return;
    setBusy(true);
    try {
      const result = await chatV2Api.upload(file);
      await deliver(file.name.slice(0, 200), result.attachment.mimeType.startsWith("image/") ? "image" : "file", result.attachment.id);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể gửi tệp.", { containerId: "general-toast" }); }
    finally { setBusy(false); }
  }

  async function older() {
    if (!id || !cursor || !bodyRef.current) return;
    const conversationId = id;
    preserveScrollRef.current = { top: bodyRef.current.scrollTop, height: bodyRef.current.scrollHeight };
    try {
      const page = await chatV2Api.messages(conversationId, cursor);
      if (activeIdRef.current !== conversationId) { preserveScrollRef.current = null; return; }
      setMessages(current => [...page.messages.filter(item => !current.some(row => row.id === item.id)), ...current]);
      setCursor(page.nextCursor);
      if (!page.messages.length) preserveScrollRef.current = null;
    } catch (error) {
      preserveScrollRef.current = null;
      toast.error(error instanceof Error ? error.message : "Không thể tải lịch sử.", { containerId: "general-toast" });
    }
  }

  async function openAttachment(attachmentId: string) {
    try {
      const result = await chatV2Api.attachmentUrl(attachmentId);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể mở tệp.", { containerId: "general-toast" }); }
  }

  async function report() {
    if (!id) return;
    const reason = window.prompt("Mô tả hành vi cần báo cáo (ít nhất 10 ký tự):");
    if (!reason) return;
    try { await chatV2Api.report(id, reason); toast.success("Đã ghi nhận báo cáo.", { containerId: "general-toast" }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Không thể gửi báo cáo.", { containerId: "general-toast" }); }
  }

  if (loading) return <div className="messages-page messages-loading" role="status">Đang tải hội thoại...</div>;

  return <div className="messages-page">
    <nav className="messages-breadcrumb" aria-label="Đường dẫn trang"><Link to="/">Trang chủ</Link><span>/</span><strong>Tin nhắn</strong></nav>
    <div className={`messages-layout${infoOpen ? "" : " is-info-closed"}`}>
      <aside className="conversation-panel">
        <header><div><h2>Cuộc trò chuyện{unreadTotal > 0 ? ` (${unreadTotal})` : ""}</h2><small>{unreadTotal > 0 ? `${unreadTotal} tin chưa đọc` : `${conversations.length} hội thoại`}</small></div><Link to="/store"><MessageCirclePlus size={15} /> Tin nhắn mới</Link></header>
        <label className="conversation-search"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm cuộc trò chuyện..." aria-label="Tìm cuộc trò chuyện" /></label>
        <div className="conversation-tabs" role="group" aria-label="Lọc hội thoại"><button type="button" className={tab === "all" ? "is-active" : ""} aria-pressed={tab === "all"} onClick={() => setTab("all")}>Tất cả</button><button type="button" className={tab === "unread" ? "is-active" : ""} aria-pressed={tab === "unread"} onClick={() => setTab("unread")}>Chưa đọc</button><button type="button" className={tab === "pinned" ? "is-active" : ""} aria-pressed={tab === "pinned"} onClick={() => setTab("pinned")}>Đã ghim</button></div>
        <div className="conversation-list">{visibleConversations.map(item => <div className={`conversation-row${id === item.id ? " is-active" : ""}`} key={item.id}><button type="button" className="conversation-row__main" onClick={() => navigate(`/messages/${item.id}`)}><span className="conversation-avatar" style={{ backgroundColor: avatarColor(item.storeName) }}>{item.storeName.slice(0, 2).toUpperCase()}</span><span className="conversation-copy"><strong>{item.storeName}</strong><small>{item.lastMessagePreview || "Chưa có tin nhắn"}</small>{item.unreadCount > 0 && <em>{item.unreadCount}</em>}</span><span className="conversation-meta"><small>{displayTime(item.lastMessageAt)}</small></span></button><button type="button" className={`conversation-row__pin${pinnedIds.includes(item.id) ? " is-pinned" : ""}`} onClick={() => togglePin(item.id)} aria-label={`${pinnedIds.includes(item.id) ? "Bỏ ghim" : "Ghim"} ${item.storeName}`} title="Ghim trên thiết bị này"><Pin size={14} /></button></div>)}</div>
        {!visibleConversations.length && <p className="conversation-empty">{conversations.length ? "Không có hội thoại phù hợp." : "Chưa có hội thoại. Hãy mở một cửa hàng để bắt đầu nhắn tin."}</p>}
      </aside>

      <main className={`chat-panel${selected ? " has-selection" : ""}`}>
        {selected ? <>
          <header><div><span className="conversation-avatar" style={{ backgroundColor: avatarColor(selected.storeName) }}>{selected.storeName.slice(0, 2).toUpperCase()}</span><span><strong>{selected.storeName}</strong><small>Cửa hàng trên MDUC247</small></span></div><div className="chat-panel__tools"><button type="button" onClick={() => setShowMessageSearch(value => !value)} aria-label="Tìm trong tin đã tải" title="Tìm trong tin đã tải"><Search size={18} /></button><button type="button" onClick={() => setInfoOpen(value => !value)} aria-label={infoOpen ? "Ẩn thông tin hội thoại" : "Hiện thông tin hội thoại"} title="Thông tin hội thoại">{infoOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}</button><button type="button" onClick={() => void report()} aria-label="Báo cáo hội thoại" title="Báo cáo hội thoại"><Ellipsis size={18} /></button></div></header>
          {showMessageSearch && <div className="chat-message-search"><Search size={15} /><input value={messageSearch} onChange={event => setMessageSearch(event.target.value)} placeholder="Tìm trong tin đã tải..." aria-label="Tìm trong tin đã tải" /><button type="button" onClick={() => { setMessageSearch(""); setShowMessageSearch(false); }}>Đóng</button></div>}
          <div className="chat-body" ref={bodyRef}>
            {cursor && !messageSearch && <button type="button" className="chat-load-older" onClick={() => void older()}>Tải tin cũ hơn</button>}
            {messageLoading ? <p className="chat-body__empty">Đang tải tin nhắn...</p> : visibleMessages.map((message, index) => {
              const day = new Date(message.createdAt).toDateString();
              const previousDay = index ? new Date(visibleMessages[index - 1].createdAt).toDateString() : "";
              return <Fragment key={message.id}>{day !== previousDay && <span className="chat-day">{new Date(message.createdAt).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" })}</span>}<div className={`chat-message${message.senderId === userId ? " is-mine" : ""}`}><p>{message.content || (message.type === "image" ? "Ảnh đính kèm" : "Tệp đính kèm")}</p>{message.attachmentId && <button type="button" className="chat-message__attachment" onClick={() => void openAttachment(message.attachmentId!)}>{message.type === "image" ? <ImageIcon size={14} /> : <FileText size={14} />}{message.type === "image" ? "Xem ảnh" : "Mở tệp đính kèm"}</button>}<small>{displayTime(message.createdAt)}{message.senderId === userId ? otherReadAt && Date.parse(message.createdAt) <= Date.parse(otherReadAt) ? " · Đã xem" : " · Đã gửi" : ""}</small></div></Fragment>;
            })}
            {!messageLoading && !visibleMessages.length && <p className="chat-body__empty">{messageSearch ? "Không tìm thấy tin nhắn phù hợp." : "Hãy gửi lời chào đầu tiên."}</p>}
          </div>
          <div className="quick-replies">{quickReplies.map(reply => <button type="button" key={reply} onClick={() => { setDraft(reply); inputRef.current?.focus(); }}>{reply}</button>)}</div>
          <form className="chat-composer" onSubmit={event => { event.preventDefault(); void submit(); }}><input ref={fileRef} type="file" className="hidden" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} /><button type="button" onClick={() => fileRef.current?.click()} disabled={busy} aria-label="Đính kèm tệp"><Paperclip /></button><button type="button" onClick={() => { setDraft(value => `${value}😊`); inputRef.current?.focus(); }} disabled={busy} aria-label="Chèn biểu tượng cảm xúc"><Smile /></button><input ref={inputRef} value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} placeholder="Nhập tin nhắn..." aria-label="Nội dung tin nhắn" /><button type="submit" disabled={busy || !draft.trim()} className="is-send" aria-label="Gửi tin nhắn"><Send /></button></form>
        </> : <div className="chat-panel__empty"><MessageCirclePlus size={31} /><h2>Chọn một cuộc trò chuyện</h2><p>Hoặc mở một cửa hàng để bắt đầu nhắn tin.</p><Link to="/store">Khám phá cửa hàng</Link></div>}
      </main>

      {infoOpen && <aside className="chat-info"><h2>Thông tin cuộc trò chuyện</h2>{selected && <><section className="shop-profile"><span className="conversation-avatar" style={{ backgroundColor: avatarColor(selected.storeName) }}>{selected.storeName.slice(0, 2).toUpperCase()}</span><strong>{selected.storeName}</strong><small>Cửa hàng trên MDUC247</small>{selected.storeSlug && <Link to={`/store/${selected.storeSlug}`}>Khám phá cửa hàng</Link>}</section>{relatedOrder && relatedShopOrder && <section className="related-order"><h3>Đơn hàng liên quan</h3><p>Đơn #{relatedOrder.id.slice(0, 8).toUpperCase()}</p><span>{orderStatusName(relatedShopOrder.status)}</span><strong>Tổng tiền: {vnd(relatedShopOrder.totalMinor)}</strong><Link to={`/orders/${relatedOrder.id}`}>Xem chi tiết đơn hàng</Link></section>}{attachments.length > 0 && <section className="chat-files"><h3>Tệp và liên kết</h3>{attachments.map(message => <button type="button" key={message.id} onClick={() => void openAttachment(message.attachmentId!)}>{message.type === "image" ? <ImageIcon size={17} /> : <FileText size={17} />}<span>{message.content || (message.type === "image" ? "Ảnh đính kèm" : "Tệp đính kèm")}<small>{new Date(message.createdAt).toLocaleDateString("vi-VN")}</small></span></button>)}</section>}</>}</aside>}
    </div>
  </div>;
}
