import { io, type Socket } from 'socket.io-client';
import { authorizedRequest, identityApi } from './identityApi';

const base=import.meta.env.VITE_ENGAGEMENT_API_URL||'http://localhost:5105';
const req=<T>(path:string,method='GET',body?:unknown)=>authorizedRequest<T>(
  `${base}/api/v2${path}`,{method,...(body===undefined?{}:{body})});
export type Notification={id:string;type:'order'|'payment'|'chat'|'seller'|'system'|'marketing';
  title:string;body:string;deepLink:string;isRead:boolean;createdAt:string};
export type NotificationPreferences={marketingOptIn:boolean;emailChat:boolean;emailSeller:boolean;
  webChat:boolean;essentialEmail:true};
export type NotificationPage={notifications:Notification[];nextCursor:string|null};
const notificationApi={
  list:(filters:{limit?:number;cursor?:string;type?:string;unreadOnly?:boolean}={})=>{
    const query=new URLSearchParams();
    for(const [key,value] of Object.entries(filters))if(value!==undefined&&value!=='')
      query.set(key,String(value));
    return req<NotificationPage>(`/notifications?${query}`);
  },
  unread:()=>req<{count:number}>('/notifications/unread-count'),
  read:(id:string)=>req<{notification:Notification}>(`/notifications/${id}/read`,'PATCH',{}),
  readMany:(ids:string[])=>req<{updated:number}>('/notifications/read-many','POST',{ids}),
  readAll:()=>req<{updated:number}>('/notifications/mark-all-read','POST',{}),
  remove:(id:string)=>req<{deleted:boolean}>(`/notifications/${id}`,'DELETE'),
  preferences:()=>req<NotificationPreferences>('/notifications/preferences'),
  setPreferences:(input:Partial<Pick<NotificationPreferences,'marketingOptIn'|'emailChat'|'emailSeller'|'webChat'>>)=>
    req<NotificationPreferences>('/notifications/preferences','PATCH',input),
  async socket():Promise<Socket>{
    await identityApi.me();
    const token=identityApi.getAccessToken();
    if(!token)throw new Error('Vui lòng đăng nhập để xem thông báo.');
    return io(base,{auth:{token},transports:['websocket']});
  },
};
export default notificationApi;
