import { io, type Socket } from 'socket.io-client';
import { authorizedRequest, identityApi } from './identityApi';

export const CHAT_BASE=import.meta.env.VITE_CHAT_API_URL||'http://localhost:5106';
const endpoint=(path:string)=>`${CHAT_BASE}/api/v2${path}`;
const logChatError=(method:string,path:string,error:unknown)=>{
  if(import.meta.env.DEV)console.error('[Chat API] Request failed',{
    method,url:endpoint(path),status:error instanceof Error&&'status'in error?error.status:undefined,
    message:error instanceof Error?error.message:String(error),error,
  });
};
const req=async<T>(path:string,method='GET',body?:unknown):Promise<T>=>{
  try{return await authorizedRequest<T>(endpoint(path),
    {method,...(body===undefined?{}:{body})});}
  catch(error){
    logChatError(method,path,error);
    if(error instanceof TypeError)throw new Error('Không thể kết nối dịch vụ tin nhắn. Vui lòng thử lại.');
    throw error;
  }
};

export type ChatConversation={id:string;buyerId:string;storeId:string;status:string;
  storeName:string;storeSlug:string;lastMessageAt:string|null;lastMessagePreview:string;
  unreadCount:number;createdAt:string};
export type ChatMessage={id:string;conversationId:string;senderId:string;senderRole:'buyer'|'seller';
  clientMessageId:string;type:'text'|'image'|'file';content:string;attachmentId:string|null;createdAt:string};
export type ChatPage={messages:ChatMessage[];nextCursor:string|null;otherReadAt:string|null};

export const chatV2Api={
  conversations:()=>req<{conversations:ChatConversation[]}>('/conversations'),
  create:(storeId:string)=>req<{conversation:ChatConversation}>('/conversations','POST',{storeId}),
  messages:(id:string,cursor?:string)=>req<ChatPage>(`/conversations/${id}/messages?limit=30${cursor?`&cursor=${encodeURIComponent(cursor)}`:''}`),
  send:(id:string,input:{clientMessageId:string;type:'text'|'image'|'file';content:string;attachmentId?:string})=>
    req<{message:ChatMessage;duplicate:boolean}>(`/conversations/${id}/messages`,'POST',input),
  read:(id:string,messageId:string)=>req<{lastReadMessageId:string;lastReadAt:string;unreadCount:number}>(
    `/conversations/${id}/read`,'POST',{messageId}),
  report:(id:string,reason:string,messageId?:string)=>req<{report:{id:string;status:string}}>(
    `/conversations/${id}/reports`,'POST',{reason,...(messageId?{messageId}:{})}),
  upload:async(file:File)=>{
    try{return await authorizedRequest<{attachment:{id:string;mimeType:string;size:number}}>(endpoint('/attachments'),
      {method:'POST',body:file,contentType:file.type});}
    catch(error){
      logChatError('POST','/attachments',error);
      if(error instanceof TypeError)throw new Error('Không thể kết nối dịch vụ tin nhắn. Vui lòng thử lại.');
      throw error;
    }
  },
  attachmentUrl:(id:string)=>req<{url:string;expiresAt:string}>(`/attachments/${id}/url`),
  async socket():Promise<Socket>{
    await identityApi.me();
    const token=identityApi.getAccessToken();
    if(!token)throw new Error('Vui lòng đăng nhập để nhắn tin.');
    return io(CHAT_BASE,{auth:{token},transports:['websocket'],autoConnect:true});
  },
};
