import { useCallback,useEffect,useRef,useState } from 'react';
import { Bell,Check } from 'lucide-react';
import { Link,useNavigate } from 'react-router-dom';
import notificationApi,{type Notification} from '../../api/notificationApi';

export default function NotificationButton({userId}:{userId?:string}){
  const [open,setOpen]=useState(false),[items,setItems]=useState<Notification[]>([]),[unread,setUnread]=useState(0);
  const root=useRef<HTMLDivElement|null>(null),seen=useRef(new Set<string>());
  const navigate=useNavigate();
  const refresh=useCallback(async()=>{
    if(!userId)return;
    const [list,count]=await Promise.all([notificationApi.list({limit:10}),notificationApi.unread()]);
    setItems(list.notifications);setUnread(count.count);
    seen.current=new Set(list.notifications.map(item=>item.id));
  },[userId]);
  useEffect(()=>{if(!userId){setItems([]);setUnread(0);return;}
    void refresh().catch(()=>{});
    const timer=window.setInterval(()=>void refresh().catch(()=>{}),30000);
    window.addEventListener('notification:changed',refresh);
    window.addEventListener('notification:badge-changed',refresh);
    let active=true,socket:Awaited<ReturnType<typeof notificationApi.socket>>|null=null;
    void notificationApi.socket().then(connected=>{
      if(!active){connected.disconnect();return;}socket=connected;
      connected.on('notification:new',(item:Notification)=>{
        if(seen.current.has(item.id))return;seen.current.add(item.id);
        setItems(current=>[item,...current].slice(0,10));setUnread(count=>count+1);
        window.dispatchEvent(new Event('notification:changed'));
      });
    }).catch(()=>{});
    return()=>{active=false;socket?.disconnect();window.clearInterval(timer);
      window.removeEventListener('notification:changed',refresh);
      window.removeEventListener('notification:badge-changed',refresh);};
  },[userId,refresh]);
  useEffect(()=>{if(!open)return;
    const outside=(event:MouseEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false);};
    document.addEventListener('mousedown',outside);
    return()=>document.removeEventListener('mousedown',outside);
  },[open]);
  async function visit(item:Notification){
    try{if(!item.isRead){await notificationApi.read(item.id);
      setItems(current=>current.map(row=>row.id===item.id?{...row,isRead:true}:row));
      setUnread(count=>Math.max(0,count-1));}}
    catch{ /* Deep link remains usable if the read update fails. */ }
    setOpen(false);navigate(item.deepLink);
  }
  async function markAll(){try{await notificationApi.readAll();
    setItems(current=>current.map(item=>({...item,isRead:true})));setUnread(0);
    window.dispatchEvent(new Event('notification:changed'));}
    catch{ /* The next poll will reconcile the badge. */ }}
  if(!userId)return null;
  return <div className="relative" ref={root}>
    <button type="button" onClick={()=>setOpen(value=>!value)}
      className="canva-header__icon-button" aria-label="Thông báo" aria-expanded={open}>
      <Bell/>{unread>0&&<span className="canva-header__count">{unread>99?'99+':unread}</span>}</button>
    {open&&<div className="absolute right-0 top-full z-[120] mt-2 max-h-[70vh] w-[min(380px,calc(100vw-24px))] overflow-y-auto rounded-2xl border bg-white p-3 shadow-2xl">
      <div className="flex items-center justify-between border-b pb-2"><strong>Thông báo</strong>
        <button type="button" onClick={()=>void markAll()} className="flex items-center gap-1 text-xs text-[#476de4]"><Check size={14}/>Đã đọc tất cả</button></div>
      {items.map(item=><button type="button" key={item.id} onClick={()=>void visit(item)}
        className={`block w-full border-b px-2 py-3 text-left text-sm hover:bg-[#f5f7fc] ${item.isRead?'':'bg-[#edf2ff]'}`}>
        <strong className="block">{item.title}</strong><span className="mt-1 block">{item.body}</span>
        <small className="text-[#70819d]">{new Date(item.createdAt).toLocaleString('vi-VN')}</small>
      </button>)}
      {!items.length&&<p className="py-8 text-center text-sm text-[#70819d]">Chưa có thông báo.</p>}
      <Link to="/notifications" onClick={()=>setOpen(false)} className="mt-3 block text-center font-semibold text-[#476de4]">Xem tất cả</Link>
    </div>}
  </div>;
}
