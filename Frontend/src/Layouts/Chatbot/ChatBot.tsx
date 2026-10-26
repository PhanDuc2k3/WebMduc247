import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, LoaderCircle, MessageCircle, RotateCcw, Send, Trash2, X } from 'lucide-react';
import chatbotApi, { type BotComparison, type BotProduct, type BotSession } from '../../api/chatbotApi';

type Item = { id: string; role: 'user' | 'bot'; text: string; products?: BotProduct[];
  stores?: { id: string; name: string; slug: string }[]; comparison?: BotComparison | null;
  suggestedQuestions?: string[]; emptySearch?: boolean;
  retry?: { text: string; clientMessageId: string } };
const storageKey = 'mduc247.botSession.v2';
const orderId = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const greeting: Item = { id: 'greeting', role: 'bot',
  text: 'Xin chào! Mình có thể giải thích về sản phẩm, tư vấn theo nhu cầu, so sánh lựa chọn và hỗ trợ đơn hàng.',
  suggestedQuestions: ['Tôi muốn tìm hiểu về điện thoại thông minh', 'Tôi muốn mua điện thoại dưới 5 triệu', 'Có voucher nào đang hoạt động?'] };

function savedSession(): BotSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (typeof value?.sessionId === 'string' && new Date(value.expiresAt).getTime() > Date.now()) return value;
  } catch { /* Invalid local session starts a new conversation. */ }
  sessionStorage.removeItem(storageKey);
  return null;
}

function ProductCard({ product, close }: { product: BotProduct; close: () => void }) {
  return <article className="flex gap-3 rounded-lg border border-[#dfe6f2] bg-white p-2 text-[#172a49]">
    <img src={product.imageUrl || '/visual-placeholder.svg'} alt="" loading="lazy"
      className="h-16 w-16 flex-none rounded-md bg-[#f4f7fb] object-contain" />
    <div className="min-w-0 flex-1">
      <strong className="block text-xs leading-snug">{product.name}</strong>
      <small className="mt-0.5 block truncate text-[11px] text-[#718099]">{product.storeName}</small>
      <span className="mt-1 block text-xs font-bold text-[#476de4]">{product.priceMinor.toLocaleString('vi-VN')}₫</span>
      {product.inStock != null && <small className="block text-[11px] text-[#718099]">{product.inStock ? 'Còn hàng' : 'Hết hàng'}</small>}
      {product.rating != null && <small className="block text-[11px] text-[#718099]">★ {product.rating.toFixed(1)}{product.reviewCount ? ` (${product.reviewCount})` : ''}</small>}
      <Link to={`/products/${product.id}`} onClick={close} className="mt-1 inline-block text-[11px] font-bold text-[#476de4]">Xem sản phẩm →</Link>
    </div>
  </article>;
}

function Comparison({ data, close }: { data: BotComparison; close: () => void }) {
  return <div className="mt-3 max-w-full overflow-x-auto rounded-lg border border-[#dfe6f2] bg-white text-[#172a49]">
    <table className="w-full min-w-[360px] text-left text-[11px]">
      <thead><tr><th className="p-2">Tiêu chí</th>{data.products.map(product =>
        <th className="p-2" key={product.id}><Link to={`/products/${product.id}`} onClick={close} className="text-[#476de4]">{product.name}</Link></th>)}</tr></thead>
      <tbody>{data.rows.map(row => <tr className="border-t border-[#e8edf5]" key={row.label}>
        <th className="p-2 font-semibold">{row.label}</th>{row.values.map((value, index) =>
          <td className="p-2" key={`${row.label}-${data.products[index]?.id}`}>{value || 'Chưa có dữ liệu'}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

export default function ChatBot() {
  const [open, setOpen] = useState(false), [input, setInput] = useState(''), [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Đang trả lời...');
  const [session, setSession] = useState<BotSession | null>(savedSession);
  const [items, setItems] = useState<Item[]>([greeting]);
  const scroller = useRef<HTMLDivElement | null>(null);
  const stickToBottom = useRef(true);
  const busyRef = useRef(false);
  const createdHere = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    const resetForAccountChange = () => { generation.current++; sessionStorage.removeItem(storageKey); createdHere.current = false;
      setSession(null); setItems([greeting]); };
    window.addEventListener('identityUpdated', resetForAccountChange);
    return () => window.removeEventListener('identityUpdated', resetForAccountChange);
  }, []);

  useEffect(() => {
    if (!session || createdHere.current) return;
    let active = true;
    chatbotApi.history(session).then(result => {
      if (active && result.messages.length) setItems(result.messages.map(message => ({
        id: message.id, role: message.role, text: message.text,
      })));
    }).catch(() => {
      if (active) { sessionStorage.removeItem(storageKey); setSession(null); setItems([greeting]); }
    });
    return () => { active = false; };
  }, [session]);
  useEffect(() => {
    if (open && stickToBottom.current) scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [items, busy, open]);

  async function send(text: string, clientMessageId: string = crypto.randomUUID(), isRetry = false) {
    if (!text.trim() || busyRef.current) return;
    const currentGeneration = generation.current;
    busyRef.current = true; setBusy(true);
    setBusyLabel('Đang xem yêu cầu của bạn...');
    setInput(''); stickToBottom.current = true;
    setItems(current => [...current.filter(item => item.retry?.clientMessageId !== clientMessageId),
      ...(isRetry ? [] : [{ id: clientMessageId, role: 'user' as const, text }])]);
    try {
      let current = session;
      if (!current) {
        current = await chatbotApi.startSession();
        if (currentGeneration !== generation.current) return;
        sessionStorage.setItem(storageKey, JSON.stringify(current));
        createdHere.current = true;
        setSession(current);
      }
      const id = /đơn hàng|don hang|mã đơn|ma don|order/i.test(text) ? orderId.exec(text)?.[0] : undefined;
      const storeSlug = /^\/store\/([a-z0-9-]+)$/.exec(window.location.pathname)?.[1];
      const result = await chatbotApi.sendMessage(current, text, clientMessageId, id, storeSlug);
      if (currentGeneration !== generation.current) return;
      setItems(list => [...list, { id: result.messageId || crypto.randomUUID(), role: 'bot',
        text: result.reply, products: result.products, stores: result.stores, comparison: result.comparison,
        suggestedQuestions: result.suggestedQuestions, emptySearch: result.emptySearch }]);
    } catch (error) {
      if (currentGeneration !== generation.current) return;
      const message = error instanceof Error ? error.message : 'Chatbot tạm thời chưa sẵn sàng.';
      if (/Phiên chatbot đã hết hạn|Không có quyền với phiên chatbot/i.test(message)) {
        sessionStorage.removeItem(storageKey); createdHere.current = false; setSession(null);
      }
      setItems(list => [...list, { id: `error-${clientMessageId}`, role: 'bot',
        text: message,
        retry: { text, clientMessageId } }]);
    } finally { busyRef.current = false; setBusy(false); }
  }

  async function clearHistory() {
    if (busyRef.current) return;
    try { if (session) await chatbotApi.deleteSession(session); }
    catch (error) {
      if (error instanceof Error && /Phiên chatbot đã hết hạn|Không có quyền với phiên chatbot/i.test(error.message)) {
        sessionStorage.removeItem(storageKey); createdHere.current = false; setSession(null);
        setItems([greeting]); return;
      }
      setItems(list => [...list, { id: crypto.randomUUID(), role: 'bot',
        text: error instanceof Error ? error.message : 'Chưa thể xóa lịch sử. Vui lòng thử lại.' }]);
      return;
    }
    createdHere.current = false;
    generation.current++; sessionStorage.removeItem(storageKey); setSession(null); setItems([greeting]);
    stickToBottom.current = true;
  }

  return <div className="font-sans">
    {open ? <div className="flex h-[min(640px,calc(100dvh-48px))] w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-[#dce3ee] bg-white shadow-2xl">
      <header className="flex items-center justify-between bg-[#476de4] px-4 py-3 text-white">
        <div className="flex items-center gap-2"><Bot size={21} /><strong>Trợ lý mua sắm</strong></div>
        <div className="flex items-center gap-3"><button type="button" onClick={() => void clearHistory()} disabled={busy} aria-label="Xóa lịch sử trò chuyện" title="Xóa lịch sử"><Trash2 size={17} /></button>
          <button type="button" onClick={() => setOpen(false)} aria-label="Đóng chatbot"><X size={20} /></button></div>
      </header>
      <div ref={scroller} onScroll={event => { const node = event.currentTarget;
        stickToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100; }}
        className="flex-1 space-y-3 overflow-y-auto p-4 text-sm" aria-live="polite" aria-label="Lịch sử trò chuyện">
        {items.map(item => <div key={item.id} className={`max-w-[92%] rounded-xl p-3 ${item.role === 'user'
          ? 'ml-auto bg-[#476de4] text-white' : 'bg-[#f1f5fb] text-[#172a49]'}`}>
          <p className="whitespace-pre-wrap">{item.text}</p>
          {item.emptySearch && <p className="mt-2 text-xs text-[#718099]" role="status">Chưa có sản phẩm phù hợp với bộ lọc hiện tại.</p>}
          {!!item.products?.length && <div className="mt-3 space-y-2">{item.products.map(product =>
            <ProductCard key={product.id} product={product} close={() => setOpen(false)} />)}</div>}
          {item.comparison && <Comparison data={item.comparison} close={() => setOpen(false)} />}
          {!!item.stores?.length && <div className="mt-3 space-y-2">{item.stores.map(store =>
            <Link key={store.id} to={`/store/${store.slug}`} onClick={() => setOpen(false)}
              className="block rounded-lg border bg-white p-2 text-[#172a49]">{store.name}</Link>)}</div>}
          {!!item.suggestedQuestions?.length && item.id === items.at(-1)?.id && <div className="mt-3 flex flex-wrap gap-2">
            {item.suggestedQuestions.map(question => <button key={question} type="button" disabled={busy}
              onClick={() => void send(question)} className="rounded-lg border border-[#dfe6f2] bg-white px-2 py-1 text-left text-xs text-[#476de4] disabled:opacity-50">{question}</button>)}
          </div>}
          {item.retry && <button type="button" onClick={() => void send(item.retry!.text, item.retry!.clientMessageId, true)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#476de4]"><RotateCcw size={13} /> Thử lại</button>}
        </div>)}
        {busy && <p className="flex items-center gap-2 text-[#718099]" role="status"><LoaderCircle className="animate-spin" size={15} />{busyLabel}</p>}
      </div>
      <p className="border-t px-4 py-2 text-xs text-[#718099]">Giá, tồn kho, voucher và trạng thái đơn được kiểm tra từ hệ thống. Không gửi mật khẩu hoặc thông tin thẻ.</p>
      <form className="flex gap-2 border-t p-3" onSubmit={event => { event.preventDefault(); void send(input.trim()); }}>
        <input value={input} onChange={event => setInput(event.target.value)} maxLength={500}
          onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}
          placeholder="Hỏi về sản phẩm hoặc đơn hàng..." aria-label="Nhập câu hỏi cho trợ lý"
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" />
        <button type="submit" disabled={busy || !input.trim()} className="rounded-lg bg-[#476de4] px-3 text-white disabled:opacity-50" aria-label="Gửi"><Send size={18} /></button>
      </form>
    </div> : <button type="button" onClick={() => setOpen(true)} aria-label="Mở chatbot"
      className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-[#476de4] text-white shadow-lg">
      <MessageCircle size={26} /></button>}
  </div>;
}
