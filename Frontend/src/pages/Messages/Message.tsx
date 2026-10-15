import { useMemo, useState } from "react";
import { FileImage, Image, LayoutPanelLeft, MessageCirclePlus, MoreHorizontal, Paperclip, Phone, Pin, Search, Send, Smile } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./Message.css";

type Filter = "all" | "unread" | "pinned";

interface Conversation {
  id: string;
  name: string;
  initials: string;
  color: string;
  lastMessage: string;
  time: string;
  unread: number;
  pinned: boolean;
  online: boolean;
  storeId: string;
  rating: number;
  products: number;
  orderCode?: string;
  orderTotal?: number;
}

interface ChatMessage {
  id: string;
  text: string;
  time: string;
  mine: boolean;
  read?: boolean;
}

const initialConversations: Conversation[] = [
  { id: "techzone", name: "TechZone Official", initials: "TZ", color: "#6675ed", lastMessage: "Shop có màu trắng ngọc nhé!", time: "09:42", unread: 2, pinned: true, online: true, storeId: "store-nova", rating: 4.9, products: 128, orderCode: "MD247-1024", orderTotal: 1290000 },
  { id: "fashion", name: "Fashion House", initials: "FH", color: "#ed7b83", lastMessage: "Mẫu áo bạn hỏi đã về hàng.", time: "08:30", unread: 1, pinned: true, online: true, storeId: "store-may", rating: 4.8, products: 94 },
  { id: "support", name: "MDUC247 Hỗ trợ", initials: "M", color: "#4778df", lastMessage: "Chúng tôi luôn sẵn sàng hỗ trợ bạn.", time: "Hôm qua", unread: 0, pinned: true, online: true, storeId: "store-nova", rating: 5, products: 0 },
  { id: "nova", name: "Nova Electronics", initials: "NE", color: "#52658c", lastMessage: "Đơn hàng của bạn đang được chuẩn bị.", time: "Hôm qua", unread: 3, pinned: true, online: false, storeId: "store-nova", rating: 4.7, products: 86, orderCode: "MD247-1018", orderTotal: 899000 },
  { id: "greenhome", name: "Green Home", initials: "GH", color: "#48a188", lastMessage: "Cảm ơn bạn đã quan tâm sản phẩm.", time: "Thứ hai", unread: 1, pinned: false, online: true, storeId: "store-home", rating: 4.8, products: 63 },
];

const starterMessages: Record<string, ChatMessage[]> = {
  techzone: [
    { id: "m1", text: "Xin chào! TechZone có thể hỗ trợ bạn điều gì hôm nay?", time: "16:12", mine: false },
    { id: "m2", text: "Cho mình hỏi đơn #MD247-1024 hiện đang ở đâu ạ?", time: "16:15", mine: true, read: true },
    { id: "m3", text: "Đơn hàng đang được giao đến bạn. Dự kiến 2–4 ngày làm việc nữa nhé!", time: "16:18", mine: false },
    { id: "m4", text: "Tai nghe Bluetooth Pro X còn màu trắng ngọc không shop?", time: "09:36", mine: true, read: true },
    { id: "m5", text: "Dạ còn ạ! Mình gửi bạn thông tin sản phẩm bên dưới nhé.", time: "09:40", mine: false },
  ],
  fashion: [{ id: "f1", text: "Chào bạn, mẫu áo bạn quan tâm đã về đủ size rồi nhé!", time: "08:30", mine: false }],
  support: [{ id: "s1", text: "Xin chào! Trung tâm hỗ trợ MDUC247 có thể giúp gì cho bạn?", time: "Hôm qua", mine: false }],
  nova: [{ id: "n1", text: "Đơn hàng của bạn đã được xác nhận và đang chuẩn bị đóng gói.", time: "Hôm qua", mine: false }],
  greenhome: [{ id: "g1", text: "Cảm ơn bạn đã quan tâm sản phẩm của Green Home.", time: "Thứ hai", mine: false }],
};

const quickReplies = ["Xin chào", "Đơn hàng của tôi đang ở đâu?", "Khi nào giao hàng?", "Cảm ơn bạn"];

const MessagePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState(initialConversations.some((item) => item.id === id) ? id! : initialConversations[0].id);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(starterMessages);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");

  const selected = conversations.find((item) => item.id === selectedId) || conversations[0];
  const unreadTotal = conversations.reduce((sum, item) => sum + item.unread, 0);
  const filteredConversations = useMemo(() => conversations.filter((item) => {
    const matchesFilter = filter === "all" || (filter === "unread" ? item.unread > 0 : item.pinned);
    return matchesFilter && `${item.name} ${item.lastMessage}`.toLowerCase().includes(search.toLowerCase());
  }), [conversations, filter, search]);

  const selectConversation = (conversation: Conversation) => {
    setSelectedId(conversation.id);
    setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, unread: 0 } : item));
    navigate(`/messages/${conversation.id}`, { replace: true });
  };

  const togglePinned = (event: React.MouseEvent, conversationId: string) => {
    event.stopPropagation();
    setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, pinned: !item.pinned } : item));
  };

  const sendMessage = (value = draft) => {
    const text = value.trim();
    if (!text) return;
    const message: ChatMessage = { id: `message-${Date.now()}`, text, time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }), mine: true, read: true };
    setMessages((current) => ({ ...current, [selectedId]: [...(current[selectedId] || []), message] }));
    setConversations((current) => current.map((item) => item.id === selectedId ? { ...item, lastMessage: text, time: message.time } : item));
    setDraft("");
  };

  return (
    <div className="messages-page">
      <nav className="messages-breadcrumb"><Link to="/">Trang chủ</Link><span>/</span><strong>Tin nhắn</strong></nav>

      <div className="messages-layout">
        <aside className="conversation-panel">
          <header><h2>Cuộc trò chuyện <small>({unreadTotal} chưa đọc)</small></h2><button type="button"><MessageCirclePlus /> Tin nhắn mới</button></header>
          <label className="conversation-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm cuộc trò chuyện..." /></label>
          <div className="conversation-tabs"><button type="button" className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}>Tất cả</button><button type="button" className={filter === "unread" ? "is-active" : ""} onClick={() => setFilter("unread")}>Chưa đọc</button><button type="button" className={filter === "pinned" ? "is-active" : ""} onClick={() => setFilter("pinned")}>Đã ghim</button></div>
          <div className="conversation-list">{filteredConversations.map((conversation) => <button type="button" key={conversation.id} className={selectedId === conversation.id ? "is-active" : ""} onClick={() => selectConversation(conversation)}><span className="conversation-avatar" style={{ background: conversation.color }}>{conversation.initials}<i className={conversation.online ? "is-online" : ""} /></span><span className="conversation-copy"><strong>{conversation.name}</strong><small>{conversation.lastMessage}</small>{conversation.unread > 0 && <em>{conversation.unread}</em>}</span><span className="conversation-meta"><small>{conversation.time}</small><i onClick={(event) => togglePinned(event, conversation.id)} className={conversation.pinned ? "is-pinned" : ""}><Pin /></i></span></button>)}</div>
        </aside>

        <main className="chat-panel">
          <header><div><span className="conversation-avatar" style={{ background: selected.color }}>{selected.initials}<i className={selected.online ? "is-online" : ""} /></span><span><strong>{selected.name}</strong><small>{selected.online ? "Đang hoạt động" : "Ngoại tuyến"}</small></span></div><div><button type="button" aria-label="Gọi điện"><Phone /></button><button type="button" aria-label="Tìm trong hội thoại"><Search /></button><button type="button" aria-label="Thông tin"><LayoutPanelLeft /></button><button type="button" aria-label="Thêm"><MoreHorizontal /></button></div></header>
          <div className="chat-body">
            {(messages[selectedId] || []).map((message, index) => <div key={message.id} className={`chat-message ${message.mine ? "is-mine" : ""}`}>{index === 3 && <span className="chat-day">Hôm nay</span>}<p>{message.text}</p><small>{message.time}{message.mine && message.read ? " · Đã xem" : ""}</small></div>)}
          </div>
          <div className="quick-replies">{quickReplies.map((reply) => <button type="button" key={reply} onClick={() => sendMessage(reply)}>{reply}</button>)}</div>
          <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}><button type="button" aria-label="Đính kèm"><Paperclip /></button><button type="button" aria-label="Gửi ảnh"><Image /></button><button type="button" aria-label="Biểu tượng cảm xúc"><Smile /></button><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Nhập tin nhắn..." /><button type="submit" className="is-send" aria-label="Gửi"><Send /></button></form>
        </main>

        <aside className="chat-info">
          <h2>Thông tin cuộc trò chuyện</h2>
          <section className="shop-profile"><span className="conversation-avatar" style={{ background: selected.color }}>{selected.initials}<i className={selected.online ? "is-online" : ""} /></span><strong>{selected.name}</strong><small>{selected.online ? "Đang hoạt động" : "Ngoại tuyến"}</small><p>★ {selected.rating} / 5<br />{selected.products} sản phẩm</p><Link to="/store">Khám phá cửa hàng</Link></section>
          {selected.orderCode && <section className="related-order"><h3>Đơn hàng liên quan</h3><p>Đơn #{selected.orderCode}</p><span>Đang giao</span><strong>Tổng tiền: {selected.orderTotal?.toLocaleString("vi-VN")}₫</strong><Link to="/order/demo">Xem đơn hàng mẫu</Link></section>}
          <section className="chat-files"><h3>Tệp và liên kết</h3><button type="button"><FileImage /><span>Ảnh sản phẩm minh họa.jpg<small>1,2 MB</small></span></button><button type="button"><FileImage /><span>Thông tin đơn hàng.pdf<small>320 KB</small></span></button></section>
        </aside>
      </div>
    </div>
  );
};

export default MessagePage;
