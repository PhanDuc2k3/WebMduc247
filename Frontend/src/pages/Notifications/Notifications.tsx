import { useCallback,useEffect,useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { Bell,Check,Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import ContentBreadcrumb from '../../components/ui/ContentBreadcrumb';
import notificationApi,{type Notification,type NotificationPreferences} from '../../api/notificationApi';

export default function Notifications(){
  const navigate=useNavigate();
  const [items,setItems]=useState<Notification[]>([]),[cursor,setCursor]=useState<string|null>(null);
  const [type,setType]=useState(''),[unreadOnly,setUnreadOnly]=useState(false),[unread,setUnread]=useState(0);
  const [selected,setSelected]=useState<string[]>([]),[prefs,setPrefs]=useState<NotificationPreferences|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const refresh=useCallback(async()=>{
    try{const [list,count]=await Promise.all([notificationApi.list({limit:20,type,unreadOnly}),
      notificationApi.unread()]);
      setItems(list.notifications);setCursor(list.nextCursor);setUnread(count.count);setError('');}
    catch(cause){setError(cause instanceof Error?cause.message:'Không thể tải thông báo.');}
    finally{setLoading(false);}
  },[type,unreadOnly]);
  useEffect(()=>{setLoading(true);void refresh();},[refresh]);
  useEffect(()=>{void notificationApi.preferences().then(setPrefs).catch(()=>{});
    let active=true,socket:Awaited<ReturnType<typeof notificationApi.socket>>|null=null;
    void notificationApi.socket().then(connected=>{if(!active){connected.disconnect();return;}
      socket=connected;connected.on('notification:new',()=>void refresh());}).catch(()=>{});
    window.addEventListener('notification:changed',refresh);
    const timer=window.setInterval(()=>void notificationApi.unread().then(result=>setUnread(result.count)).catch(()=>{}),30000);
    return()=>{active=false;socket?.disconnect();window.clearInterval(timer);
      window.removeEventListener('notification:changed',refresh);};
  },[refresh]);
  async function loadMore(){if(!cursor||busy)return;setBusy(true);
    try{const list=await notificationApi.list({limit:20,cursor,type,unreadOnly});
      setItems(current=>[...current,...list.notifications.filter(item=>!current.some(row=>row.id===item.id))]);
      setCursor(list.nextCursor);}
    catch(cause){toast.error(cause instanceof Error?cause.message:'Không thể tải thêm.');}
    finally{setBusy(false);}}
  async function visit(item:Notification){
    try{if(!item.isRead){await notificationApi.read(item.id);
      setItems(current=>current.map(row=>row.id===item.id?{...row,isRead:true}:row));
      setUnread(count=>Math.max(0,count-1));window.dispatchEvent(new Event('notification:badge-changed'));}}
    catch(cause){toast.error(cause instanceof Error?cause.message:'Không thể đánh dấu đã đọc.');}
    navigate(item.deepLink);
  }
  async function markAll(){setBusy(true);
    try{await notificationApi.readAll();setItems(current=>current.map(row=>({...row,isRead:true})));
      setUnread(0);setSelected([]);window.dispatchEvent(new Event('notification:badge-changed'));}
    catch(cause){toast.error(cause instanceof Error?cause.message:'Không thể đánh dấu đã đọc.');}
    finally{setBusy(false);}}
  async function markSelected(){if(!selected.length)return;setBusy(true);
    try{await notificationApi.readMany(selected);
      setItems(current=>current.map(row=>selected.includes(row.id)?{...row,isRead:true}:row));
      setSelected([]);setUnread((await notificationApi.unread()).count);
      window.dispatchEvent(new Event('notification:badge-changed'));}
    catch(cause){toast.error(cause instanceof Error?cause.message:'Không thể cập nhật thông báo.');}
    finally{setBusy(false);}}
  async function remove(id:string){setBusy(true);
    try{await notificationApi.remove(id);setItems(current=>current.filter(row=>row.id!==id));
      setUnread((await notificationApi.unread()).count);
      window.dispatchEvent(new Event('notification:badge-changed'));}
    catch(cause){toast.error(cause instanceof Error?cause.message:'Không thể xóa thông báo.');}
    finally{setBusy(false);}}
  async function setPreference(key:'marketingOptIn'|'emailChat'|'emailSeller'|'webChat',value:boolean){
    try{setPrefs(await notificationApi.setPreferences({[key]:value}));toast.success('Đã lưu cài đặt thông báo.');}
    catch(cause){toast.error(cause instanceof Error?cause.message:'Không thể lưu cài đặt.');}}
  async function markOne(item:Notification){
    try{await notificationApi.read(item.id);
      setItems(current=>current.map(row=>row.id===item.id?{...row,isRead:true}:row));
      setUnread(count=>Math.max(0,count-1));window.dispatchEvent(new Event('notification:badge-changed'));}
    catch(cause){toast.error(cause instanceof Error?cause.message:'Không thể đánh dấu đã đọc.');}
  }
  return <div className="mx-auto max-w-4xl px-3 py-8">
    <ContentBreadcrumb items={[{label:'Thông báo'}]}/>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-extrabold">Thông báo</h1>
      <span className="rounded-full bg-[#edf2ff] px-3 py-1 text-sm font-semibold text-[#476de4]">{unread} chưa đọc</span></div>
    <div className="mt-5 flex flex-wrap gap-2 rounded-2xl border bg-white p-4">
      <select value={type} onChange={event=>setType(event.target.value)} className="rounded-lg border px-3 py-2" aria-label="Loại thông báo">
        <option value="">Tất cả loại</option><option value="order">Đơn hàng</option>
        <option value="payment">Thanh toán</option><option value="seller">Cửa hàng</option>
        <option value="chat">Tin nhắn</option></select>
      <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
        <input type="checkbox" checked={unreadOnly} onChange={event=>setUnreadOnly(event.target.checked)}/>Chưa đọc</label>
      <button type="button" disabled={busy||!selected.length} onClick={()=>void markSelected()}
        className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Đã đọc mục chọn</button>
      <button type="button" disabled={busy||unread===0} onClick={()=>void markAll()}
        className="rounded-lg bg-[#476de4] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Đã đọc tất cả</button>
    </div>
    {error&&<div className="mt-5 rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700">
      {error} <Link to="/login" className="underline">Đăng nhập</Link></div>}
    <div className="mt-5 space-y-3">{loading?<p>Đang tải thông báo...</p>:items.length?items.map(item=><article
      key={item.id} className={`flex gap-3 rounded-xl border p-4 ${item.isRead?'bg-white':'border-[#b9c9ff] bg-[#edf2ff]'}`}>
      <input type="checkbox" checked={selected.includes(item.id)} onChange={event=>setSelected(current=>
        event.target.checked?[...current,item.id]:current.filter(id=>id!==item.id))} aria-label="Chọn thông báo"/>
      <Bell className="mt-1 shrink-0 text-[#476de4]" size={19}/>
      <button type="button" onClick={()=>void visit(item)} className="min-w-0 flex-1 text-left">
        <strong className="block">{item.title}</strong><span className="mt-1 block text-sm">{item.body}</span>
        <small className="mt-1 block text-[#718099]">{new Date(item.createdAt).toLocaleString('vi-VN')}</small></button>
      {!item.isRead&&<button type="button" onClick={()=>void markOne(item)}
        aria-label="Đã đọc"><Check size={18}/></button>}
      <button type="button" disabled={busy} onClick={()=>void remove(item.id)} aria-label="Xóa thông báo"><Trash2 size={18}/></button>
    </article>):<p className="rounded-xl border bg-white p-8 text-center text-[#718099]">Chưa có thông báo.</p>}</div>
    {cursor&&<button type="button" disabled={busy} onClick={()=>void loadMore()}
      className="mx-auto mt-5 block rounded-lg border bg-white px-4 py-2 disabled:opacity-50">Tải thêm</button>}
    {prefs&&<section className="mt-8 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Cài đặt thông báo</h2>
      <p className="mt-1 text-sm text-[#718099]">Email bảo mật và giao dịch thiết yếu vẫn được gửi theo chính sách.</p>
      {([['marketingOptIn','Tiếp thị'],['emailChat','Email tin nhắn'],['emailSeller','Email hoạt động shop'],
        ['webChat','Thông báo chat trong web']] as const).map(([key,label])=><label key={key}
          className="mt-3 flex items-center justify-between border-t pt-3 text-sm"><span>{label}</span>
          <input type="checkbox" checked={prefs[key]} onChange={event=>void setPreference(key,event.target.checked)}/></label>)}
    </section>}
  </div>;
}
