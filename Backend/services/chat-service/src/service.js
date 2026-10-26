import { decodeCursor, hashToken, newToken, objectId } from './repository.js';
import { createHash, randomUUID } from 'node:crypto';
import { redactPrivateData } from './claude-proxy.js';
import { ShoppingTools } from './shopping-tools.js';
import { ShoppingAssistant } from './shopping-assistant.js';
import { understandRequest, shoppingContext } from './intent-understanding.js';
import { answerShopping, catalogReply, knowledgeFallback } from './shopping-response.js';

export class ChatError extends Error {
  constructor(status,code,message){super(message);Object.assign(this,{status,code});}
}
const fail=(status,code,message)=>new ChatError(status,code,message);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clientIdPattern=/^[a-zA-Z0-9_-]{8,120}$/;
const textInput=(value,max=2000)=>{
  if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value))
    throw fail(400,'INVALID_TEXT','Nội dung tin nhắn không hợp lệ.');
  return value.trim();
};
const cleanQuery=value=>String(value||'').trim().slice(0,100).replace(/[\u0000-\u001f]/g,'');
const advice=/so sánh|so sanh|tư vấn|tu van|nên chọn|nen chon|phù hợp|phu hop|gợi ý|goi y|khác nhau|khac nhau|loại nào|cái nào|cai nao|rẻ hơn|re hon|giá rẻ|gia re|dưới\s*\d+|duoi\s*\d+|ngân sách|ngan sach/i;
export function catalogRequest(text){
  const normalized=String(text).normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/gi,'d')
    .toLocaleLowerCase('vi-VN');
  const cheap=/\b(gia re|re nhat|gia thap|binh dan)\b/.test(normalized);
  const budget=normalized.match(/\b(?:duoi|khong qua|toi da)\s*(\d+(?:[.,]\d+)?)\s*(trieu|nghin|ngan|k|dong|d)?\b/);
  const numeric=budget?/^\d{1,3}(?:\.\d{3})+$/.test(budget[1])?
    Number(budget[1].replaceAll('.','')):Number(budget[1].replace(',','.')):null;
  const multiplier=budget?.[2]==='trieu'?1_000_000:
    ['nghin','ngan','k'].includes(budget?.[2])?1000:1;
  const maxPrice=numeric&&Number.isSafeInteger(Math.round(numeric*multiplier))?
    Math.round(numeric*multiplier):null;
  const withoutBudget=budget?normalized.replace(budget[0],' '):normalized;
  const term=withoutBudget.replace(/\b(gia re|re nhat|gia thap|binh dan)\b/g,' ')
    .replace(/\b(ben ban co|ben minh co|ban co|toi can|toi muon|cho toi|giup toi|tu van|so sanh|goi y|nen chon|tim kiem|san pham)\b/g,' ')
    .replace(/\b(tim|mua|kiem|nao|khong|loai|nhe|vay|toi|minh|can)\b/g,' ')
    .replace(/^\s*co\s+/,' ').replace(/\b(k|a)\s*$/,' ')
    .replace(/[^a-z0-9\s]+/g,' ').replace(/\s+/g,' ').trim();
  return {term:cleanQuery(term),cheap,...(maxPrice?{maxPrice}:{})};
}

export class ChatService {
  constructor(repo,config){
    this.repo=repo;this.config=config;this.ai=config.ai||null;this.buckets=new Map();
    this.tools=new ShoppingTools(this);
    this.assistant=this.ai?.createMessage?new ShoppingAssistant(this.ai,this.tools):null;
    this.botPending=new Map();this.botDone=new Map();this.botQueues=new Map();
  }
  async remote(url,options={}){
    let response;
    try{response=await fetch(url,{...options,signal:AbortSignal.timeout(5000)});}
    catch{throw fail(503,'DEPENDENCY_UNAVAILABLE','Dịch vụ liên quan chưa sẵn sàng.');}
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw fail(response.status>=500?503:response.status,
      data.code||'DEPENDENCY_ERROR',data.message||'Dịch vụ liên quan từ chối yêu cầu.');
    return data;
  }
  async identity(bearer){
    if(!/^Bearer\s+\S+$/i.test(bearer||''))throw fail(401,'UNAUTHORIZED','Vui lòng đăng nhập.');
    return (await this.remote(new URL('/api/v2/auth/me',this.config.identityUrl),
      {headers:{Authorization:bearer}})).user;
  }
  async maybeIdentity(bearer){return bearer?this.identity(bearer):null;}
  async member(storeId,userId){
    if(!uuid.test(String(storeId)))throw fail(404,'STORE_NOT_FOUND','Không tìm thấy shop.');
    return this.remote(new URL(`/api/v2/inventory/stores/${storeId}/membership?userId=${userId}`,
      this.config.catalogUrl),{headers:{'X-Inventory-Token':this.config.inventoryToken}});
  }
  async sellerStores(bearer){
    try{const data=await this.remote(new URL('/api/v2/seller/stores',this.config.catalogUrl),
      {headers:{Authorization:bearer}});
      return (data.stores||[]).map(store=>store.id).filter(id=>uuid.test(String(id)));}
    catch(error){if(error.status===503)return [];throw error;}
  }
  async check(user,conversation){
    if(!conversation)throw fail(404,'CONVERSATION_NOT_FOUND','Không tìm thấy hội thoại.');
    if(conversation.status!=='ACTIVE')throw fail(409,'CONVERSATION_CLOSED','Hội thoại đã đóng.');
    if(conversation.buyerId===user.id)return 'buyer';
    await this.member(conversation.storeId,user.id);return 'seller';
  }
  limit(key,count,windowMs){
    const now=Date.now(),current=this.buckets.get(key);
    if(!current||current.until<=now){this.buckets.set(key,{count:1,until:now+windowMs});return;}
    if(current.count>=count)throw fail(429,'RATE_LIMITED','Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau.');
    current.count++;
    if(this.buckets.size>20_000)for(const [id,bucket] of this.buckets)
      if(bucket.until<=now)this.buckets.delete(id);
  }
  async create(user,storeId){
    this.limit(`conversation:${user.id}`,20,60_000);
    if(!uuid.test(String(storeId)))throw fail(400,'INVALID_STORE','Shop không hợp lệ.');
    const profile=await this.remote(new URL(`/api/v2/inventory/stores/${storeId}/chat-profile`,
      this.config.catalogUrl),{headers:{'X-Inventory-Token':this.config.inventoryToken}});
    if(profile.status!=='active')throw fail(409,'STORE_INACTIVE','Shop đang tạm ngừng.');
    return {conversation:await this.repo.getOrCreate(user.id,storeId,profile.name,profile.slug)};
  }
  async list(user,bearer){
    const stores=await this.sellerStores(bearer);
    return {conversations:await this.repo.list(user.id,stores)};
  }
  async messages(user,id,query){
    const conversation=await this.repo.get(id);const role=await this.check(user,conversation);
    const limit=query.limit==null?30:Number(query.limit);
    if(!Number.isInteger(limit)||limit<1||limit>50)throw fail(400,'INVALID_LIMIT','Giới hạn không hợp lệ.');
    const cursor=query.cursor?decodeCursor(query.cursor):null;
    if(query.cursor&&!cursor)throw fail(400,'INVALID_CURSOR','Cursor không hợp lệ.');
    return {...await this.repo.page(id,cursor,limit),
      otherReadAt:await this.repo.otherReadAt(conversation,user.id,role)};
  }
  async send(user,id,input){
    const conversation=await this.repo.get(id);await this.check(user,conversation);
    this.limit(`send:${user.id}`,60,60_000);
    if(!clientIdPattern.test(input?.clientMessageId||''))
      throw fail(400,'INVALID_MESSAGE_ID','clientMessageId không hợp lệ.');
    const type=input.type||'text';
    if(!['text','image','file'].includes(type))throw fail(400,'INVALID_TYPE','Loại tin nhắn không hợp lệ.');
    const content=type==='text'?textInput(input.content):String(input.content||'').trim();
    if(type!=='text'&&(content.length>200||!objectId(input.attachmentId)))
      throw fail(400,'INVALID_ATTACHMENT','Tệp đính kèm không hợp lệ.');
    if(type==='text'&&input.attachmentId)throw fail(400,'INVALID_ATTACHMENT','Tin văn bản không kèm tệp.');
    return this.repo.send(conversation,user,{clientMessageId:input.clientMessageId,
      type,content,attachmentId:type==='text'?null:input.attachmentId});
  }
  async read(user,id,messageId){
    const conversation=await this.repo.get(id);await this.check(user,conversation);
    if(!objectId(messageId))throw fail(400,'INVALID_MESSAGE_ID','Tin nhắn không hợp lệ.');
    return this.repo.markRead(conversation,user.id,messageId);
  }
  async report(user,id,input){
    const conversation=await this.repo.get(id);await this.check(user,conversation);
    const reason=textInput(input?.reason,1000);
    if(reason.length<10||input.messageId&&!objectId(input.messageId))
      throw fail(400,'INVALID_REPORT','Báo cáo không hợp lệ.');
    if(input.messageId){const found=await this.repo.messages.findOne({_id:objectId(input.messageId),
      conversationId:conversation._id});
      if(!found)throw fail(404,'MESSAGE_NOT_FOUND','Không tìm thấy tin nhắn trong hội thoại.');}
    return {report:await this.repo.report(id,user.id,reason,input.messageId)};
  }
  async notificationMetrics(){
    const [pending,dead,oldest]=await Promise.all([
      this.repo.chat_outbox.countDocuments({publishedAt:null}),
      this.repo.chat_outbox.countDocuments({outcome:'DEAD'}),
      this.repo.chat_outbox.findOne({publishedAt:null},{sort:{createdAt:1}}),
    ]);
    return {pending,dead,oldestPendingAt:oldest?.createdAt||null};
  }
  async botSession(user){
    const token=user?null:newToken(),now=new Date(),expiresAt=new Date(now.getTime()+24*3600_000);
    const result=await this.repo.bot_sessions.insertOne({userId:user?.id||null,
      guestTokenHash:token?hashToken(token):null,createdAt:now,expiresAt});
    return {sessionId:String(result.insertedId),...(token?{sessionToken:token}:{}),expiresAt};
  }
  async checkedBotSession(user,sessionId,sessionToken){
    const oid=objectId(sessionId);
    if(!oid)throw fail(404,'SESSION_NOT_FOUND','Phiên chatbot đã hết hạn.');
    const session=await this.repo.bot_sessions.findOne({_id:oid,expiresAt:{$gt:new Date()}});
    if(!session)throw fail(404,'SESSION_NOT_FOUND','Phiên chatbot đã hết hạn.');
    if(session.userId){if(!user||session.userId!==user.id)throw fail(403,'FORBIDDEN','Không có quyền với phiên chatbot.');}
    else if(!sessionToken||hashToken(sessionToken)!==session.guestTokenHash)
      throw fail(403,'FORBIDDEN','Không có quyền với phiên chatbot.');
    return session;
  }
  async botHistory(user,sessionId,sessionToken,limit=30){
    const session=await this.checkedBotSession(user,sessionId,sessionToken);
    const size=Number(limit);
    if(!Number.isInteger(size)||size<1||size>50)throw fail(400,'INVALID_LIMIT','Giới hạn không hợp lệ.');
    const rows=await this.repo.bot_messages.find({sessionId:session._id})
      .sort({createdAt:-1,_id:-1}).limit(size).toArray();
    return {sessionId,messages:rows.reverse().map(row=>({id:String(row._id),role:row.role,
      text:row.text,sourceRefs:row.sourceRefs||[],createdAt:row.createdAt,
      ...(row.role==='bot'&&row.metadata?{metadata:row.metadata}:{})}))};
  }
  async deleteBotSession(user,sessionId,sessionToken){
    const session=await this.checkedBotSession(user,sessionId,sessionToken);
    await this.repo.bot_messages.deleteMany({sessionId:session._id});
    await this.repo.bot_sessions.deleteOne({_id:session._id});
    return {deleted:true};
  }
  async botMessage(user,sessionId,sessionToken,input,rateKey,bearer=''){
    const session=await this.checkedBotSession(user,sessionId,sessionToken);
    const text=textInput(input?.text,500);
    const clientMessageId=input?.clientMessageId||randomUUID();
    if(!clientIdPattern.test(clientMessageId))throw fail(400,'INVALID_MESSAGE_ID','clientMessageId không hợp lệ.');
    const key=`${sessionId}:${clientMessageId}`;
    const requestHash=createHash('sha256').update(text).digest('hex');
    const done=this.botDone.get(key);
    if(done&&done.until>Date.now()){
      if(done.requestHash!==requestHash)throw fail(409,'IDEMPOTENCY_CONFLICT','Mã gửi tin đã dùng cho nội dung khác.');
      return done.result;
    }
    const pending=this.botPending.get(key);
    if(pending){
      if(pending.requestHash!==requestHash)throw fail(409,'IDEMPOTENCY_CONFLICT','Mã gửi tin đã dùng cho nội dung khác.');
      return pending.task;
    }
    this.limit(`bot:${rateKey}`,20,60_000);
    const previous=this.botQueues.get(sessionId)||Promise.resolve();
    const task=previous.then(()=>this.processBotMessage(session,user,text,input,bearer,clientMessageId,requestHash));
    const tail=task.catch(()=>{});
    this.botQueues.set(sessionId,tail);
    void tail.finally(()=>{if(this.botQueues.get(sessionId)===tail)this.botQueues.delete(sessionId);});
    this.botPending.set(key,{requestHash,task});
    try{
      const result=await task;
      this.botDone.set(key,{requestHash,result,until:Date.now()+5*60_000});
      if(this.botDone.size>500)for(const [id,entry] of this.botDone)
        if(entry.until<=Date.now())this.botDone.delete(id);
      while(this.botDone.size>500)this.botDone.delete(this.botDone.keys().next().value);
      return result;
    }finally{this.botPending.delete(key);}
  }
  async processBotMessage(session,user,text,input,bearer,clientMessageId,requestHash){
    const existing=await this.repo.bot_messages.findOne?.({sessionId:session._id,role:'bot',clientMessageId});
    if(existing?.requestHash&&existing.requestHash!==requestHash)
      throw fail(409,'IDEMPOTENCY_CONFLICT','Mã gửi tin đã dùng cho nội dung khác.');
    if(existing)return {sessionId:String(session._id),messageId:String(existing._id),status:'complete',
      reply:existing.text,products:[],stores:[],comparison:null,
      sourceRefs:existing.sourceRefs||[],metadata:existing.metadata||{aiUsed:false}};
    const history=this.repo.bot_messages.find?await this.repo.bot_messages.find({sessionId:session._id})
      .sort({createdAt:-1,_id:-1}).limit(12).toArray():[];
    const started=performance.now();
    const result=await this.answer(text,user,{...input,history:history.reverse()},bearer);
    const metadata=result.metadata||{aiUsed:false,latencyMs:Math.round(performance.now()-started)};
    const now=new Date();
    const stored=await this.repo.bot_messages.insertMany([
      {sessionId:session._id,role:'user',clientMessageId,requestHash,text:redactPrivateData(text),
        sourceRefs:[],createdAt:now,expiresAt:session.expiresAt},
      {sessionId:session._id,role:'bot',clientMessageId,requestHash,text:redactPrivateData(result.reply),
        sourceRefs:(result.sourceRefs||[]).filter(ref=>!ref.startsWith('order:')),
        metadata,...(result.shoppingContext?{shoppingContext:result.shoppingContext}:{}),
        createdAt:new Date(now.getTime()+1),expiresAt:session.expiresAt},
    ]);
    return {sessionId:String(session._id),messageId:String(stored?.insertedIds?.[1]||randomUUID()),
      status:'complete',reply:result.reply,products:result.products||[],stores:result.stores||[],
      comparison:result.comparison||null,sourceRefs:result.sourceRefs||[],metadata,
      suggestedQuestions:result.suggestedQuestions||[],emptySearch:Boolean(result.emptySearch)};
  }
  async aiReply(question,facts,fallback,mode='selective'){
    if(!this.ai||this.config.aiMode==='off'||
      mode==='selective'&&this.config.aiMode!=='all'&&!advice.test(question))
      return {reply:fallback,metadata:{aiUsed:false}};
    try{
      if(this.ai.replyDetailed){const result=await this.ai.replyDetailed(question,facts);
        return result||{reply:fallback,metadata:{aiUsed:false}};}
      const reply=await this.ai.reply(question,facts);
      return {reply:reply||fallback,metadata:{aiUsed:Boolean(reply)}};
    }catch{return {reply:fallback,metadata:{aiUsed:false}};} // No paid retry after ambiguous failure.
  }
  async compareReply(text,productIds){
    const compared=await this.tools.execute('compare_products',{productIds});
    return {reply:catalogReply(compared.products,compared.comparison),products:compared.products,comparison:compared.comparison,
      sourceRefs:compared.sourceRefs};
  }
  async answer(text,user,input,bearer=''){
    const started=performance.now();
    if(!input?.orderGroupId&&/đơn hàng|don hang|mã đơn|ma don|order/i.test(text)){
      const orderGroupId=text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
      if(orderGroupId)input={...input,orderGroupId};
    }
    const plan=input?.orderGroupId?{intent:'ORDER_SUPPORT'}:await understandRequest({text,
      history:input?.history||[],ai:this.ai,enabled:this.config.aiMode!=='off'});
    let result;
    try{result=await this.answerWithPlan(text,user,{...input,plan},bearer);}
    catch(error){
      if(error.status!==503)throw error;
      result={reply:'Mình chưa thể kiểm tra dữ liệu hiện tại do dịch vụ tạm thời gián đoạn. Bạn vui lòng thử lại sau ít phút.',
        sourceRefs:[],suggestedQuestions:[],metadata:{limited:true}};
    }
    const state=shoppingContext(plan);
    return {...result,...(state?{shoppingContext:state}:{}),metadata:{...result.metadata,
      aiUsed:Boolean(plan.aiUsed||result.metadata?.aiUsed),intent:plan.intent,
      ...(plan.model?{model:plan.model}:{}),...(plan.usage?{intentUsage:plan.usage}:{}),
      ...(plan.unavailable?{limited:true}:{}),latencyMs:Math.round(performance.now()-started)}};
  }
  async answerWithPlan(text,user,input,bearer=''){
    if(input?.orderGroupId){
      if(!uuid.test(String(input.orderGroupId)))throw fail(400,'INVALID_ORDER','Mã đơn không hợp lệ.');
      if(!user)return {reply:'Vui lòng đăng nhập để xem đơn hàng của bạn.',sourceRefs:[]};
      const {data}=await this.tools.execute('get_order_status',{orderGroupId:input.orderGroupId},{user,bearer});
      return {reply:`Đơn #${data.id.slice(0,8)} hiện ở trạng thái ${data.status}. Xem chi tiết tại /orders/${data.id}.`,
        sourceRefs:[`order:${data.id}`]};
    }
    const plan=input.plan;
    if(plan.intent==='GENERAL_KNOWLEDGE'){
      const fallback=knowledgeFallback(plan);
      // A knowledge request has no catalog tools available, even if the model attempts to use one.
      if(!plan.unavailable&&this.assistant&&this.config.aiMode!=='off'){
        const result=await this.assistant.respond({question:text,history:input?.history||[],allowedToolNames:[]}).catch(()=>null);
        if(result)return {...result,products:[],comparison:null,sourceRefs:[],suggestedQuestions:plan.productType==='dien thoai'?['Tôi muốn mua điện thoại dưới 5 triệu']:[]};
      }
      return {reply:fallback,products:[],sourceRefs:[]};
    }
    if(/danh mục|danh muc/i.test(text)){
      const output=await this.tools.execute('get_product_categories',{});
      const categories=output.data.categories;
      return {reply:categories.length?`Các danh mục hiện có: ${categories.map(item=>item.name).join(', ')}. Bạn muốn tìm loại nào?`:
        'Catalog chưa có danh mục đang hoạt động.',sourceRefs:output.sourceRefs};
    }
    if(plan.intent.startsWith('PRODUCT_'))return answerShopping(this,text,plan,input);
    let intent=plan.intent==='ORDER_SUPPORT'?'orders':plan.intent==='VOUCHER_SUPPORT'?'voucher':this.fallbackIntent(text);
    if(intent==='orders')return {reply:'Để xem trạng thái đơn, vui lòng đăng nhập và mở đơn tại /orders. Chatbot chỉ đọc đơn thuộc tài khoản của bạn.',sourceRefs:[]};
    if(intent==='shipping')return {reply:'Phí và thời gian giao hàng được hiển thị khi checkout. Hãy xem chi tiết đơn tại /orders; chatbot không xác nhận thay dịch vụ giao hàng.',sourceRefs:['faq:shipping']};
    if(intent==='checkout')return {reply:'Thêm sản phẩm vào giỏ, chọn địa chỉ và phương thức thanh toán tại /checkout. Tổng tiền chính thức được tính trên trang checkout.',sourceRefs:['faq:checkout']};
    if(intent==='returns')return {reply:'Yêu cầu trả hàng được gửi từ chi tiết đơn đã giao, trong thời hạn hiển thị ở trang đơn. Quyết định và hoàn tiền chỉ theo trạng thái trong Order/Payment.',sourceRefs:['faq:returns']};
    if(intent==='policy'){
      const topic=/bảo hành|bao hanh/i.test(text)?'warranty':/bảo mật|bao mat/i.test(text)?'privacy':
        /đổi trả|doi tra|hoàn tiền|hoan tien/i.test(text)?'returns':/giao|ship/i.test(text)?'shipping':
          /thanh toán|thanh toan/i.test(text)?'payment':'terms';
      const {data,sourceRefs}=await this.tools.execute('get_platform_policy',{topic});
      return {reply:`${data.message} ${data.url}`,sourceRefs};
    }
    if(intent==='voucher'){
      const explicit=text.match(/(?:mã|ma|code|voucher)\s*[:#]?\s*([A-Z][A-Z0-9_-]{3,31})/i);
      const code=explicit?.[1]?.toUpperCase()||null;
      const output=await this.tools.execute('get_voucher_information',code?{code}:{},{user,bearer});
      const vouchers=output.data.vouchers||[];
      if(output.data.reason)return {reply:output.data.reason,sourceRefs:output.sourceRefs};
      if(output.data.valid)return {reply:`Mã ${code} đang áp dụng được theo giỏ hiện tại. Mức giảm dự kiến ${Number(output.data.discountMinor||0).toLocaleString('vi-VN')}₫; checkout sẽ xác nhận lại.`,sourceRefs:output.sourceRefs};
      if(!vouchers.length)return {reply:code?output.data.message:'Hiện chưa có voucher đang hoạt động. Hãy xem lại tại checkout.',sourceRefs:output.sourceRefs};
      const lines=vouchers.map(item=>`${item.kind==='shop'?'Shop':'Sàn'} ${item.code}: ${item.discountType==='FIXED'?`${Number(item.discountValue).toLocaleString('vi-VN')}₫`:`${Number(item.discountValue)/100}%`}, đơn từ ${Number(item.minSpendMinor).toLocaleString('vi-VN')}₫.`);
      return {reply:`Voucher đang hoạt động:\n${lines.join('\n')}\nĐiều kiện và giá cuối cùng được kiểm tra tại checkout.`,sourceRefs:output.sourceRefs};
    }
    if(intent==='stores'){
      if(input?.storeSlug&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.storeSlug)){
        const data=await this.remote(new URL(`/api/v2/stores/${input.storeSlug}`,this.config.catalogUrl));
        return {reply:`Cửa hàng ${data.store.name} có trang tại /store/${data.store.slug}.`,
          stores:[{id:data.store.id,name:data.store.name,slug:data.store.slug}],
          sourceRefs:[`store:${data.store.id}`]};
      }
      const term=cleanQuery(text.replace(/^(cửa hàng|shop)\s*/i,''));
      if(term.length<2)return {reply:'Bạn muốn tìm cửa hàng nào? Hãy nhập tên shop.',sourceRefs:[]};
      const data=await this.remote(new URL(`/api/v2/stores?search=${encodeURIComponent(term)}&limit=5`,
        this.config.catalogUrl));
      const stores=(data.stores||[]).map(store=>({id:store.id,name:store.name,slug:store.slug}));
      if(!stores.length)return {reply:'Catalog chưa có cửa hàng phù hợp với từ khóa này.',sourceRefs:['catalog:stores']};
      const polished=await this.aiReply(text,stores.map(store=>
        `${store.name} | /store/${store.slug}`).join('\n'),
        `Catalog tìm thấy ${stores.length} cửa hàng phù hợp.`);
      return {...polished,stores,sourceRefs:stores.map(store=>`store:${store.id}`)};
    }
    const fallback='Mình có thể giúp tìm sản phẩm, giải thích kiến thức, so sánh lựa chọn hoặc hỗ trợ đơn hàng. Bạn muốn tìm hiểu điều gì?';
    if(/^(chào|xin chào|hello|hi)[!.\s]*$/i.test(text))return {reply:'Xin chào! Bạn muốn tìm hiểu sản phẩm, tìm mua hay hỏi về đơn hàng?',sourceRefs:[],
      suggestedQuestions:['Tôi muốn tìm hiểu về điện thoại thông minh','Tôi muốn mua điện thoại dưới 5 triệu']};
    const assisted=!plan.unavailable&&this.assistant&&this.config.aiMode!=='off'?await this.assistant.respond({
      question:text,history:input?.history||[],allowedToolNames:[]}).catch(()=>null):null;
    return assisted||{reply:fallback,sourceRefs:[]};
  }
  fallbackIntent(text){
    const lower=text.toLocaleLowerCase('vi-VN');
    if(/đơn hàng|don hang|order|mã đơn|ma don/.test(lower))return 'orders';
    if(/voucher|mã giảm giá|ma giam gia|khuyến mãi|khuyen mai/.test(lower))return 'voucher';
    if(/chính sách|chinh sach|điều khoản|dieu khoan|bảo hành|bao hanh|bảo mật|bao mat/.test(lower))return 'policy';
    if(/trả hàng|tra hang|hoàn tiền|hoan tien|refund/.test(lower))return 'returns';
    if(/giao hàng|giao hang|vận chuyển|van chuyen|ship/.test(lower))return 'shipping';
    if(/đặt hàng|dat hang|thanh toán|thanh toan|checkout|giỏ|gio hang/.test(lower))return 'checkout';
    if(/cửa hàng|cua hang|shop/.test(lower))return 'stores';
    return 'help';
  }
}

