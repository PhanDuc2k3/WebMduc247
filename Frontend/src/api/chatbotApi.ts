import { identityApi } from './identityApi';
import { CHAT_BASE } from './chatV2Api';

export type BotProduct={id:string;name:string;priceMinor:number;imageUrl:string|null;storeName:string;
  brand?:string|null;rating?:number|null;reviewCount?:number|null;inStock?:boolean;stock?:number};
export type BotComparison={products:BotProduct[];rows:Array<{label:string;values:string[]}>};
export type BotReply={reply:string;products:BotProduct[];stores:{id:string;name:string;slug:string}[];
  suggestedQuestions?:string[];emptySearch?:boolean;
  comparison?:BotComparison|null;sourceRefs:string[];sessionId?:string;messageId?:string;
  status?:string;metadata?:{aiUsed:boolean;model?:string;latencyMs?:number;
    usage?:{inputTokens:number;outputTokens:number};toolCalls?:number;intent?:string;limited?:boolean}};
export type BotSession={sessionId:string;sessionToken?:string;expiresAt:string};
export type BotHistory={sessionId:string;messages:Array<{id:string;role:'user'|'bot';text:string;
  sourceRefs:string[];createdAt:string}>};

async function bearer(){
  await identityApi.me().catch(()=>null);
  return identityApi.getAccessToken();
}
async function request<T>(method:'GET'|'POST'|'DELETE',path:string,body?:object,sessionToken?:string):Promise<T>{
  const token=await bearer();
  const response=await fetch(`${CHAT_BASE}/api/v2${path}`,{method,
    headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{ }),
      ...(sessionToken?{'X-Bot-Session-Token':sessionToken}:{})},
    ...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.message||'Chatbot tạm thời chưa sẵn sàng.');
  return data as T;
}
const chatbotApi={
  startSession:()=>request<BotSession>('POST','/chatbot/sessions',{}),
  history:(session:BotSession)=>request<BotHistory>('GET',
    `/chatbot/sessions/${session.sessionId}/messages?limit=50`,undefined,session.sessionToken),
  deleteSession:(session:BotSession)=>request<{deleted:boolean}>('DELETE',
    `/chatbot/sessions/${session.sessionId}`,undefined,session.sessionToken),
  sendMessage:(session:BotSession,text:string,clientMessageId:string,orderGroupId?:string,storeSlug?:string)=>
    request<BotReply>('POST',`/chatbot/sessions/${session.sessionId}/messages`,
      {text,clientMessageId,...(orderGroupId?{orderGroupId}:{}),...(storeSlug?{storeSlug}:{})},session.sessionToken),
};
export default chatbotApi;
