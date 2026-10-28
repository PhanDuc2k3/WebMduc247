import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { ChatService,ChatError } from './service.js';
import { ClaudeProxy } from './claude-proxy.js';
import { connectMongo,objectId } from './repository.js';
import { ChatStorage,AttachmentService,scannerFromEnv } from './media.js';
import {adminId} from '../../../packages/contracts/platform-admin.js';
import {requireAdminScope} from '../../../packages/contracts/admin-rbac.js';

const localEnv=fileURLToPath(new URL('../../../.env.development.local',import.meta.url));
const env=process.env;
const port=Number(env.CHAT_PORT||5106),origin=env.FRONTEND_ORIGIN||'http://localhost:5173';
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
const room=id=>`conversation:${id}`;
const invalid=(status,code,message)=>new ChatError(status,code,message);
async function body(req,max=32768){
  if(!String(req.headers['content-type']||'').startsWith('application/json'))
    throw invalid(415,'CONTENT_TYPE_REQUIRED','Yêu cầu JSON.');
  const parts=[];let size=0;for await(const part of req){size+=part.length;
    if(size>max)throw invalid(413,'BODY_TOO_LARGE','Dữ liệu quá lớn.');parts.push(part);}
  try{const parsed=JSON.parse(Buffer.concat(parts).toString('utf8')||'{}');
    if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))return parsed;}
  catch{}throw invalid(400,'INVALID_JSON','JSON không hợp lệ.');
}
async function binary(req){
  const parts=[];let size=0;for await(const part of req){size+=part.length;
    if(size>5*1024*1024)throw invalid(413,'FILE_TOO_LARGE','Tệp quá 5 MB.');parts.push(part);}
  return Buffer.concat(parts);
}
const failure=error=>({code:error.code||'INTERNAL_ERROR',message:error.status?error.message:'Không thể xử lý yêu cầu chat.'});
export function createHandler(chat,attachments,io){
  const deliver=async(conversation,actor,result)=>{
    const sockets=await io.in(room(conversation.id)).fetchSockets();let recipientOnline=false;
    for(const socket of sockets){
      try{const fresh=await chat.identity(socket.data.bearer);
        const raw=await chat.repo.get(conversation.id);await chat.check(fresh,raw);
        if(fresh.id!==actor.id)recipientOnline=true;
        socket.emit('chat:message',result.message);
      }catch{socket.leave(room(conversation.id));}
    }
    if(recipientOnline)await chat.repo.chat_outbox.updateOne({messageId:objectId(result.message.id)},
      {$set:{publishedAt:new Date(),outcome:'ONLINE'}}).catch(()=>{});
  };
  const handler=async(req,res)=>{
    const requestOrigin=req.headers.origin;
    if(requestOrigin===origin){res.setHeader('Access-Control-Allow-Origin',origin);
      res.setHeader('Access-Control-Allow-Credentials','true');
      res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, X-Bot-Session-Token');
      res.setHeader('Access-Control-Allow-Methods','GET, POST, DELETE, OPTIONS');res.setHeader('Vary','Origin');}
    if(req.method==='OPTIONS'){res.writeHead(requestOrigin===origin?204:403);res.end();return;}
    try{
      const url=new URL(req.url,'http://localhost');
      const path=url.pathname.replace(/^\/api\/v2/,'');
      if(req.method==='GET'&&path==='/internal/admin-queue'){
        const expected=Buffer.from(env.ADMIN_AUTHORIZATION_TOKEN||''),actual=Buffer.from(String(req.headers['x-admin-authorization-token']||''));
        if(!expected.length||expected.length!==actual.length||!timingSafeEqual(expected,actual))throw invalid(403,'FORBIDDEN','Không có quyền đồng bộ hàng chờ.');
        return send(res,200,await chat.repo.adminQueueFeed(url.searchParams.get('after')));
      }
      if(req.method==='GET'&&path==='/health')return send(res,200,{ok:true});
      if(req.method==='GET'&&path==='/internal/notification/metrics'){
        const expected=Buffer.from(env.CHAT_NOTIFICATION_WEBHOOK_TOKEN||'');
        const actual=Buffer.from(String(req.headers['x-chat-event-token']||''));
        if(!expected.length||expected.length!==actual.length||!timingSafeEqual(expected,actual))
          throw invalid(403,'FORBIDDEN','Không có quyền xem notification metrics.');
        return send(res,200,await chat.notificationMetrics());
      }
      const file=/^\/attachments\/([0-9a-f]{24})$/i.exec(path);
      if(req.method==='GET'&&file){const result=await attachments.direct(file[1],
        url.searchParams.get('expires'),url.searchParams.get('signature'));
        res.writeHead(200,{'Content-Type':result.mimeType,'Content-Length':result.data.length,
          'Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff',
          'Content-Security-Policy':"default-src 'none'; sandbox",
          'Content-Disposition':result.mimeType==='application/pdf'?'attachment':'inline'});
        res.end(result.data);return;}
      if(['POST','PATCH','DELETE'].includes(req.method)&&requestOrigin!==origin)
        throw invalid(403,'ORIGIN_DENIED','Origin không hợp lệ.');
      const bearer=req.headers.authorization||'';
      if(req.method==='POST'&&path==='/chatbot/sessions'){
        chat.limit(`bot-session:${req.socket.remoteAddress}`,10,60_000);
        return send(res,201,await chat.botSession(await chat.maybeIdentity(bearer)));
      }
      const botSession=/^\/chatbot\/sessions\/([0-9a-f]{24})$/i.exec(path);
      if(req.method==='DELETE'&&botSession){const user=await chat.maybeIdentity(bearer);
        return send(res,200,await chat.deleteBotSession(user,botSession[1],req.headers['x-bot-session-token']));}
      const botMessage=/^\/chatbot\/sessions\/([0-9a-f]{24})\/messages$/i.exec(path);
      if(req.method==='GET'&&botMessage){const user=await chat.maybeIdentity(bearer);
        return send(res,200,await chat.botHistory(user,botMessage[1],
          req.headers['x-bot-session-token'],url.searchParams.get('limit')||30));}
      if(req.method==='POST'&&botMessage){const user=await chat.maybeIdentity(bearer);
        return send(res,200,await chat.botMessage(user,botMessage[1],
          req.headers['x-bot-session-token'],await body(req),user?.id||req.socket.remoteAddress,bearer));}
      const user=await chat.identity(bearer);
      const storeReports=/^\/admin\/stores\/([0-9a-f-]{36})\/report-summary$/i.exec(path);
      if(req.method==='GET'&&storeReports){adminId(storeReports[1]);requireAdminScope(user,'stores.read',{storeId:storeReports[1]});return send(res,200,await chat.repo.storeReportSummary(storeReports[1]));}
      if(req.method==='GET'&&path==='/conversations')return send(res,200,await chat.list(user,bearer));
      if(req.method==='POST'&&path==='/conversations')return send(res,201,
        await chat.create(user,(await body(req)).storeId));
      if(req.method==='POST'&&path==='/attachments')return send(res,201,
        await attachments.upload(user.id,await binary(req),req.headers['content-type']));
      const attachmentUrl=/^\/attachments\/([0-9a-f]{24})\/url$/i.exec(path);
      if(req.method==='GET'&&attachmentUrl)return send(res,200,
        await attachments.url(user.id,attachmentUrl[1],async(uid,conversation)=>chat.check(user,conversation)));
      const conversation=/^\/conversations\/([0-9a-f]{24})\/(messages|read|reports)$/i.exec(path);
      if(conversation){
        const [,id,section]=conversation;
        if(section==='messages'&&req.method==='GET')return send(res,200,
          await chat.messages(user,id,Object.fromEntries(url.searchParams)));
        if(section==='messages'&&req.method==='POST'){
          const result=await chat.send(user,id,await body(req));
          await deliver({id},user,result).catch(()=>{});
          return send(res,result.duplicate?200:201,result);
        }
        if(section==='read'&&req.method==='POST'){
          const result=await chat.read(user,id,(await body(req)).messageId);
          io.to(room(id)).emit('chat:read',{conversationId:id,userId:user.id,...result});
          return send(res,200,result);
        }
        if(section==='reports'&&req.method==='POST')return send(res,201,
          await chat.report(user,id,await body(req)));
      }
      throw invalid(404,'NOT_FOUND','Không tìm thấy API.');
    }catch(error){if(!(error instanceof ChatError)&&!error.status)
      console.error('Chat request failed:',error.code||error.name||'unknown');
      send(res,error.status||500,failure(error));}
  };
  return {handler,deliver};
}
export function attachSockets(io,chat,deliver){
  io.use(async(socket,next)=>{
    try{const raw=socket.handshake.auth?.token;
      if(typeof raw!=='string'||raw.length>4096)throw invalid(401,'UNAUTHORIZED','Thiếu token.');
      const bearer=`Bearer ${raw}`,user=await chat.identity(bearer);
      socket.data.user=user;socket.data.bearer=bearer;next();}
    catch{next(new Error('UNAUTHORIZED'));}
  });
  io.on('connection',socket=>{
    const run=async(action,ack)=>{try{const result=await action();ack?.({ok:true,...result});}
      catch(error){ack?.({ok:false,...failure(error)});}};
    socket.on('chat:join',(id,ack)=>run(async()=>{
      const user=await chat.identity(socket.data.bearer),conversation=await chat.repo.get(id);
      chat.limit(`join:${user.id}`,60,60_000);
      await chat.check(user,conversation);await socket.join(room(id));return {conversationId:id};},ack));
    socket.on('chat:send',(input,ack)=>run(async()=>{
      const user=await chat.identity(socket.data.bearer),id=input?.conversationId;
      const result=await chat.send(user,id,input||{});
      socket.emit('chat:ack',result);
      await deliver({id},user,result).catch(()=>{});
      return result;},ack));
    socket.on('chat:read',(input,ack)=>run(async()=>{
      const user=await chat.identity(socket.data.bearer),id=input?.conversationId;
      const result=await chat.read(user,id,input?.messageId);
      io.to(room(id)).emit('chat:read',{conversationId:id,userId:user.id,...result});
      return result;},ack));
    socket.on('chat:leave',id=>{if(typeof id==='string')socket.leave(room(id));});
  });
}
async function publishOffline(chat,env){
  if(!env.CHAT_NOTIFICATION_WEBHOOK_URL||!env.CHAT_NOTIFICATION_WEBHOOK_TOKEN){
    await chat.repo.chat_outbox.updateMany({publishedAt:null},{$set:{publishedAt:new Date(),
      outcome:'NOT_CONFIGURED'}});
    return false;
  }
  const row=await chat.repo.chat_outbox.findOne({publishedAt:null,nextAttemptAt:{$lte:new Date()}},
    {sort:{createdAt:1}});
  if(!row)return false;
  try{const response=await fetch(env.CHAT_NOTIFICATION_WEBHOOK_URL,{method:'POST',
    headers:{'Content-Type':'application/json','X-Chat-Event-Token':env.CHAT_NOTIFICATION_WEBHOOK_TOKEN,
      'X-Event-Id':String(row._id)},body:JSON.stringify({type:row.eventType,
        messageId:String(row.messageId),conversationId:String(row.conversationId),
        storeId:row.storeId,buyerId:row.buyerId,senderId:row.senderId}),
    signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw new Error('notification unavailable');
    await chat.repo.chat_outbox.updateOne({_id:row._id},{$set:{publishedAt:new Date(),outcome:'OFFLINE'}});
    return true;
  }catch{const attempts=row.attempts+1;
    await chat.repo.chat_outbox.updateOne({_id:row._id},{$set:{attempts,
      nextAttemptAt:new Date(Date.now()+Math.min(300,2**Math.min(attempts,8))*1000),
      ...(attempts>=10?{publishedAt:new Date(),outcome:'DEAD'}:{})}});}
  return true;
}
export async function startServer(){
  if(env.NODE_ENV!=='production'&&existsSync(localEnv))process.loadEnvFile(localEnv);
  if(!env.CHAT_MONGO_URL||!env.INVENTORY_INTERNAL_TOKEN)
    throw new Error('CHAT_MONGO_URL and INVENTORY_INTERNAL_TOKEN are required');
  if(!['selective','all','off'].includes(env.CHAT_CLAUDE_MODE||'selective'))
    throw new Error('CHAT_CLAUDE_MODE must be selective, all or off');
  if(env.CHAT_NOTIFICATION_WEBHOOK_URL&&!env.CHAT_NOTIFICATION_WEBHOOK_TOKEN)
    throw new Error('CHAT_NOTIFICATION_WEBHOOK_TOKEN is required when webhook is configured');
  if(env.NODE_ENV==='production'&&[env.CHAT_NOTIFICATION_WEBHOOK_URL,env.CHAT_INTENT_URL]
    .some(url=>url&&!url.startsWith('https://')))
    throw new Error('Production Chat webhook and intent URLs must use HTTPS');
  const retentionDays=Number(env.CHAT_RETENTION_DAYS||365);
  if(!Number.isInteger(retentionDays)||retentionDays<1||retentionDays>3650)
    throw new Error('CHAT_RETENTION_DAYS must be between 1 and 3650');
  const {connection,repo}=await connectMongo(env.CHAT_MONGO_URL,retentionDays);
  const ai=env.CHAT_CLAUDE_API_KEY?new ClaudeProxy({apiKey:env.CHAT_CLAUDE_API_KEY,
    baseUrl:env.CHAT_CLAUDE_BASE_URL||'https://1gw.gwai.cloud',
    model:env.CHAT_CLAUDE_MODEL||'claude-haiku-5-5',
    maxTokens:Number(env.CHAT_CLAUDE_MAX_TOKENS||160),
    dailyLimit:Number(env.CHAT_CLAUDE_DAILY_LIMIT||20)}):null;
  const chat=new ChatService(repo,{identityUrl:env.CHAT_IDENTITY_URL||'http://127.0.0.1:5101',
    catalogUrl:env.CHAT_CATALOG_URL||'http://127.0.0.1:5102',
    orderUrl:env.CHAT_ORDER_URL||'http://127.0.0.1:5103',
    engagementUrl:env.CHAT_ENGAGEMENT_URL||'http://127.0.0.1:5105',
    inventoryToken:env.INVENTORY_INTERNAL_TOKEN,orderToken:env.CHAT_ORDER_TOKEN||'',
    intentUrl:env.CHAT_INTENT_URL||'',intentToken:env.CHAT_INTENT_TOKEN||'',
    aiMode:env.CHAT_CLAUDE_MODE||'selective',ai});
  const storage=new ChatStorage(env);
  await storage.ensureBucket();
  const attachments=new AttachmentService(repo,storage,scannerFromEnv(env));
  let dispatch=()=>{};
  const server=http.createServer((req,res)=>dispatch(req,res));
  const io=new Server(server,{cors:{origin,methods:['GET','POST'],credentials:false},
    maxHttpBufferSize:32768,transports:['websocket','polling']});
  const {handler,deliver}=createHandler(chat,attachments,io);
  dispatch=handler;attachSockets(io,chat,deliver);
  await new Promise(resolve=>server.listen(port,resolve));
  const cleanupTimer=setInterval(()=>{void attachments.cleanup().catch(()=>{});},60_000);
  let publishing=false;
  const notifyTimer=setInterval(()=>{
    if(publishing)return;publishing=true;
    (async()=>{for(let i=0;i<10;i++)if(!(await publishOffline(chat,env)))break;})()
      .catch(()=>{}).finally(()=>{publishing=false;});
  },5000);
  process.on('SIGTERM',()=>{clearInterval(cleanupTimer);clearInterval(notifyTimer);
    io.close();server.close();void connection.close();});
  console.log(`Chat Service listening on ${port}`);
  return {server,io,chat,attachments,connection};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
  startServer().catch(error=>{console.error('Chat startup failed:',error.message);process.exit(1);});
