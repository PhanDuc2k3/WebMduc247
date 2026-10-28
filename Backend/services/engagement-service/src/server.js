import http from 'node:http';
import pg from 'pg';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { PromotionError, PromotionService } from './service.js';
import { ReviewService, configuredReviewScanner } from './review.service.js';
import { NotificationService } from './notification.service.js';
import nodemailer from 'nodemailer';
import { Server } from 'socket.io';
import { attachNotificationSockets } from './notification.socket.js';
import {storeRatingSummary} from './store-admin.service.js';

const port=Number(process.env.ENGAGEMENT_PORT||5105);
const databaseUrl=process.env.ENGAGEMENT_DATABASE_URL||process.env.IDENTITY_DATABASE_URL;
const internalToken=process.env.PROMOTION_INTERNAL_TOKEN||'';
const frontendOrigin=process.env.FRONTEND_ORIGIN||'http://localhost:5173';
if(!databaseUrl||!internalToken||!process.env.INVENTORY_INTERNAL_TOKEN)
  throw new Error('ENGAGEMENT_DATABASE_URL, PROMOTION_INTERNAL_TOKEN and INVENTORY_INTERNAL_TOKEN are required');
const pool=new pg.Pool({ connectionString:databaseUrl });
const service=new PromotionService(pool,{
  identityUrl:process.env.ENGAGEMENT_IDENTITY_URL||'http://127.0.0.1:5101',
  catalogUrl:process.env.ENGAGEMENT_CATALOG_URL||'http://127.0.0.1:5102',
  orderUrl:process.env.ENGAGEMENT_ORDER_URL||'http://127.0.0.1:5103',
  paymentUrl:process.env.ENGAGEMENT_PAYMENT_URL||'http://127.0.0.1:5104',
  chatUrl:process.env.ENGAGEMENT_CHAT_URL||'http://127.0.0.1:5106',
  catalogToken:process.env.INVENTORY_INTERNAL_TOKEN,internalToken,
});
const reviews=new ReviewService(pool,service,configuredReviewScanner(process.env));
const notificationTokens={order:process.env.NOTIFICATION_ORDER_TOKEN||'',
  payment:process.env.NOTIFICATION_PAYMENT_TOKEN||'',chat:process.env.NOTIFICATION_CHAT_TOKEN||'',
  identity:process.env.IDENTITY_EVENT_WEBHOOK_TOKEN||''};
const transport=process.env.SMTP_HOST&&process.env.MAIL_FROM
  ?nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),
    secure:process.env.SMTP_SECURE==='true',connectionTimeout:5000,socketTimeout:10000,
    ...(process.env.SMTP_USER?{auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}}:{})})
  :null;
let notificationIo=null;
const notifications=new NotificationService(pool,{
  identityUrl:process.env.ENGAGEMENT_IDENTITY_URL||'http://127.0.0.1:5101',
  catalogUrl:process.env.ENGAGEMENT_CATALOG_URL||'http://127.0.0.1:5102',
  orderUrl:process.env.ENGAGEMENT_ORDER_URL||'http://127.0.0.1:5103',
  identityToken:process.env.NOTIFICATION_IDENTITY_TOKEN||'',
  catalogToken:process.env.INVENTORY_INTERNAL_TOKEN,
  orderToken:process.env.NOTIFICATION_ORDER_TOKEN||'',transport,
  paymentToken:process.env.NOTIFICATION_PAYMENT_TOKEN||'',
  chatToken:process.env.NOTIFICATION_CHAT_TOKEN||'',
  mailFrom:process.env.MAIL_FROM||'',frontendOrigin,
  emit:async(userId,notification)=>{
    const sockets=await notificationIo?.in('notification:user:'+userId).fetchSockets()||[];
    for(const socket of sockets)try{
      const current=await service.identity(socket.data.bearer);
      if(current.id!==userId)throw new Error('Identity changed');
      socket.emit('notification:new',notification);
    }catch{socket.disconnect(true);}
  },
});
const send=(res,status,data)=>{res.writeHead(status,{ 'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff' });res.end(JSON.stringify(data));};
const validSecret=(actual,expected)=>{
  const a=Buffer.from(String(actual||'')),b=Buffer.from(String(expected||''));
  return b.length>0&&a.length===b.length&&timingSafeEqual(a,b);
};
async function body(req){
  if(!String(req.headers['content-type']||'').startsWith('application/json'))
    throw new PromotionError(415,'CONTENT_TYPE_REQUIRED','Yêu cầu JSON.');
  const chunks=[];let size=0;
  for await(const chunk of req){
    size+=chunk.length;
    if(size>65536) throw new PromotionError(413,'BODY_TOO_LARGE','Dữ liệu quá lớn.');
    chunks.push(chunk);
  }
  try{const data=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
    if(data&&typeof data==='object'&&!Array.isArray(data)) return data;}
  catch{}
  throw new PromotionError(400,'INVALID_JSON','JSON không hợp lệ.');
}
async function imageBody(req){
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;
    if(size>2*1024*1024) throw new PromotionError(413,'IMAGE_TOO_LARGE','Ảnh quá 2 MB.');
    chunks.push(chunk);}
  return Buffer.concat(chunks);
}
export function createHandler(promotion=service,reviewService=reviews,notifier=notifications){
  return async(req,res)=>{
    const origin=req.headers.origin;
    if(origin===frontendOrigin){
      res.setHeader('Access-Control-Allow-Origin',origin);
      res.setHeader('Access-Control-Allow-Credentials','true');
      res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods','GET, POST, PATCH, DELETE, OPTIONS');
      res.setHeader('Vary','Origin');
    }
    if(req.method==='OPTIONS'){res.writeHead(origin===frontendOrigin?204:403);res.end();return;}
    try{
      const url=new URL(req.url,'http://localhost');
      const path=url.pathname.replace(/^\/api\/v2/,'');
      const publicReviews=/^\/products\/([0-9a-f-]{36})\/reviews$/i.exec(path);
      if(req.method==='GET'&&publicReviews)
        return send(res,200,await reviewService.list(publicReviews[1],Object.fromEntries(url.searchParams)));
      const publicImage=/^\/reviews\/images\/([0-9a-f-]{36})$/i.exec(path);
      if(req.method==='GET'&&publicImage){
        const image=await reviewService.image(publicImage[1]);
        res.writeHead(200,{'Content-Type':image.mime_type,'Cache-Control':'public, max-age=300',
          'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});
        res.end(image.data);return;
      }
      const eventRoute=/^\/internal\/notifications\/(identity|order|payment|chat)-events$/i.exec(path);
      if(req.method==='POST'&&eventRoute){
        const source=eventRoute[1].toLowerCase();
        const header={identity:'x-identity-event-token',order:'x-order-notification-token',
          payment:'x-payment-notification-token',chat:'x-chat-event-token'}[source];
        if(!validSecret(req.headers[header],notificationTokens[source]))
          throw new PromotionError(403,'FORBIDDEN','Không có quyền gửi sự kiện thông báo.');
        return send(res,200,await notifier.ingest(source,String(req.headers['x-event-id']||''),
          await body(req)));
      }
      if(req.method==='GET'&&path==='/internal/notifications/metrics'){
        if(!validSecret(req.headers['x-notification-admin-token'],process.env.NOTIFICATION_ADMIN_TOKEN||''))
          throw new PromotionError(403,'FORBIDDEN','Không có quyền xem metrics.');
        return send(res,200,await notifier.metrics());
      }
      if(req.method==='POST'&&path==='/internal/reviews/reconcile'){
        if(!validSecret(req.headers['x-promotion-token'],internalToken))
          throw new PromotionError(403,'FORBIDDEN','Không có quyền đối soát review.');
        return send(res,200,await reviewService.reconcile());
      }
      if(path.startsWith('/internal/promotions/')){
        const adminStoreVoucher=/^\/internal\/promotions\/stores\/([0-9a-f-]{36})\/vouchers$/i.exec(path);
        if(req.method==='POST'&&(path==='/internal/promotions/platform-vouchers'||adminStoreVoucher)){
          if(!validSecret(req.headers['x-promotion-admin-token'],process.env.PROMOTION_ADMIN_TOKEN||''))
            throw new PromotionError(403,'FORBIDDEN','Không có quyền quản trị voucher.');
        }
        if(req.method==='POST'&&path==='/internal/promotions/platform-vouchers')
          return send(res,201,await promotion.createPlatformVoucher(await body(req)));
        if(req.method==='POST'&&adminStoreVoucher)
          return send(res,201,await promotion.createVoucher(adminStoreVoucher[1],null,await body(req),true));
        if(!validSecret(req.headers['x-promotion-token'],internalToken))
          throw new PromotionError(403,'FORBIDDEN','Không có quyền với Promotion API nội bộ.');
        if(req.method==='POST'&&path==='/internal/promotions/quote')
          return send(res,200,await promotion.quote(await body(req)));
        if(req.method==='POST'&&path==='/internal/promotions/reserve')
          return send(res,201,await promotion.reserve(await body(req)));
        if(req.method==='POST'&&path==='/internal/promotions/commit')
          return send(res,200,await promotion.commit(await body(req)));
        if(req.method==='POST'&&path==='/internal/promotions/release')
          return send(res,200,await promotion.release(await body(req)));
        if(req.method==='POST'&&path==='/internal/promotions/release-shop')
          return send(res,200,await promotion.releaseShop((await body(req)).shopOrderId));
        if(req.method==='POST'&&path==='/internal/promotions/release-platform')
          return send(res,200,await promotion.releasePlatform((await body(req)).orderRef));
        if(req.method==='POST'&&path==='/internal/promotions/reconcile')
          return send(res,200,{ ...(await promotion.reconcileExpired()),
            ...(await promotion.endCampaigns()),...(await promotion.reconcileCancelled()) });
        throw new PromotionError(404,'NOT_FOUND','Không tìm thấy Promotion API nội bộ.');
      }
      if(req.method==='GET'&&path==='/promotions/active')
        return send(res,200,await promotion.active());
      if(req.method==='GET'&&path==='/flash-sales')
        return send(res,200,await promotion.flashSales());
      if(['POST','PATCH','DELETE'].includes(req.method)&&origin!==frontendOrigin)
        throw new PromotionError(403,'ORIGIN_DENIED','Origin không hợp lệ.');
      const user=await promotion.identity(req.headers.authorization);
      const adminStoreRating=/^\/admin\/stores\/([0-9a-f-]{36})\/rating-summary$/i.exec(path);
      if(req.method==='GET'&&adminStoreRating)return send(res,200,await storeRatingSummary(promotion.pool,user,adminStoreRating[1],Object.fromEntries(url.searchParams)));
      if(req.method==='GET'&&path==='/notifications')
        return send(res,200,await notifier.list(user.id,Object.fromEntries(url.searchParams)));
      if(req.method==='GET'&&path==='/notifications/unread-count')
        return send(res,200,await notifier.unreadCount(user.id));
      if(req.method==='GET'&&path==='/notifications/preferences')
        return send(res,200,await notifier.preferences(user.id,req.headers.authorization));
      if(req.method==='PATCH'&&path==='/notifications/preferences')
        return send(res,200,await notifier.setPreferences(user.id,req.headers.authorization,await body(req)));
      if(req.method==='POST'&&path==='/notifications/mark-all-read')
        return send(res,200,await notifier.readAll(user.id));
      if(req.method==='POST'&&path==='/notifications/read-many')
        return send(res,200,await notifier.readMany(user.id,(await body(req)).ids));
      const notification=/^\/notifications\/([0-9a-f-]{36})(?:\/(read))?$/i.exec(path);
      if(req.method==='PATCH'&&notification?.[2])
        return send(res,200,await notifier.readOne(user.id,notification[1]));
      if(req.method==='DELETE'&&notification&&!notification[2])
        return send(res,200,await notifier.remove(user.id,notification[1]));
      if(req.method==='GET'&&path==='/reviews/mine')
        return send(res,200,await reviewService.mine(user.id,url.searchParams.get('productId')));
      const sellerReviews=/^\/seller\/stores\/([0-9a-f-]{36})\/reviews$/i.exec(path);
      if(req.method==='GET'&&sellerReviews)
        return send(res,200,await reviewService.sellerList(user.id,sellerReviews[1]));
      if(req.method==='POST'&&path==='/reviews')
        return send(res,201,await reviewService.create(user.id,await body(req)));
      const editReview=/^\/reviews\/([0-9a-f-]{36})$/i.exec(path);
      if(req.method==='PATCH'&&editReview)
        return send(res,200,await reviewService.edit(user.id,editReview[1],await body(req)));
      const helpful=/^\/reviews\/([0-9a-f-]{36})\/helpful$/i.exec(path);
      if(req.method==='POST'&&helpful)
        return send(res,200,await reviewService.helpful(user.id,helpful[1]));
      const reviewImage=/^\/reviews\/([0-9a-f-]{36})\/images$/i.exec(path);
      if(req.method==='POST'&&reviewImage)
        return send(res,201,await reviewService.uploadImage(user.id,reviewImage[1],await imageBody(req),
          req.headers['content-type']));
      const reply=/^\/seller\/reviews\/([0-9a-f-]{36})\/reply$/i.exec(path);
      if(req.method==='POST'&&reply)
        return send(res,201,await reviewService.reply(user.id,reply[1],await body(req)));
      if(req.method==='POST'&&path==='/promotions/vouchers/validate')
        return send(res,200,await promotion.validateBuyer(user.id,(await body(req)).code));
      const store=/^\/seller\/stores\/([0-9a-f-]{36})\/(vouchers|flash-sales)$/i.exec(path);
      if(store){
        if(req.method==='GET'&&store[2]==='vouchers')
          return send(res,200,await promotion.sellerList(store[1],user.id));
        if(req.method==='POST'&&store[2]==='vouchers')
          return send(res,201,await promotion.createVoucher(store[1],user.id,await body(req)));
        if(req.method==='POST'&&store[2]==='flash-sales')
          return send(res,201,await promotion.createFlashSale(store[1],user.id,await body(req)));
      }
      const status=/^\/seller\/campaigns\/([0-9a-f-]{36})\/status$/i.exec(path);
      if(req.method==='PATCH'&&status)
        return send(res,200,await promotion.setStatus(status[1],user.id,(await body(req)).status));
      throw new PromotionError(404,'NOT_FOUND','Không tìm thấy API.');
    }catch(error){
      if(!(error instanceof PromotionError)) console.error('Engagement request failed:',error.code||error.name);
      send(res,error.status||500,{ code:error.code||'INTERNAL_ERROR',
        message:error.status?error.message:'Không thể xử lý yêu cầu.',
        ...(error.details?{ details:error.details }: {}) });
    }
  };
}
export function startServer(){
  const server=http.createServer(createHandler());
  notificationIo=new Server(server,{cors:{origin:frontendOrigin,methods:['GET','POST']},
    maxHttpBufferSize:32768});
  attachNotificationSockets(notificationIo,bearer=>service.identity(bearer));
  server.listen(port,()=>console.log('Engagement Service listening on '+port));
  const timer=setInterval(()=>{
    (async()=>{await service.reconcileExpired();await service.endCampaigns();
      await service.reconcileCancelled();await reviews.reconcile();})()
      .catch(error=>console.error('Promotion reconciliation failed:',error.message));
  },30000);
  let emailing=false;
  const emailTimer=setInterval(()=>{
    if(emailing)return;emailing=true;
    (async()=>{for(let i=0;i<10;i++)if(!(await notifications.deliverEmailOne()))break;})()
      .catch(error=>console.error('Notification email worker failed:',error.code||error.name))
      .finally(()=>{emailing=false;});
  },5000);
  const cleanupTimer=setInterval(()=>void notifications.cleanup().catch(error=>
    console.error('Notification cleanup failed:',error.code||error.name)),3600_000);
  process.on('SIGTERM',()=>{clearInterval(timer);clearInterval(emailTimer);clearInterval(cleanupTimer);
    notificationIo.close();void pool.end();});
  return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) startServer();
