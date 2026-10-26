import http from 'node:http';
import pg from 'pg';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { PaymentError, PaymentService } from './service.js';

const port=Number(process.env.PAYMENT_PORT||5104);
const databaseUrl=process.env.PAYMENT_DATABASE_URL||process.env.IDENTITY_DATABASE_URL;
const frontendOrigin=process.env.FRONTEND_ORIGIN||'http://localhost:5173';
const internalToken=process.env.PAYMENT_INTERNAL_TOKEN||'';
const settlementToken=process.env.PAYMENT_SETTLEMENT_TOKEN||'';
const notificationWebhookUrl=process.env.PAYMENT_NOTIFICATION_WEBHOOK_URL||'';
const notificationWebhookToken=process.env.NOTIFICATION_PAYMENT_TOKEN||'';
const publicUrl=process.env.PAYMENT_PUBLIC_URL||`http://127.0.0.1:${port}`;
if (!databaseUrl || !process.env.ORDER_PAYMENT_TOKEN) throw new Error('PAYMENT_DATABASE_URL and ORDER_PAYMENT_TOKEN are required');
if (process.env.NODE_ENV==='production' && (!internalToken || !publicUrl.startsWith('https://')))
  throw new Error('Production payment internal token and HTTPS public URL are required');
const config={
  identityUrl:process.env.PAYMENT_IDENTITY_URL||'http://127.0.0.1:5101',
  orderUrl:process.env.PAYMENT_ORDER_URL||'http://127.0.0.1:5103',
  orderToken:process.env.ORDER_PAYMENT_TOKEN,
  momo:{
    baseUrl:process.env.MOMO_API_BASE_URL||'https://test-payment.momo.vn',
    partnerCode:process.env.MOMO_PARTNER_CODE||'',accessKey:process.env.MOMO_ACCESS_KEY||'',
    secretKey:process.env.MOMO_SECRET_KEY||'',
    ipnUrl:process.env.MOMO_IPN_URL||new URL('/api/v2/payments/webhooks/momo',publicUrl).href,
    redirectUrl:process.env.MOMO_REDIRECT_URL||`${frontendOrigin}/payments/return`,
  },
  vietqr:{
    baseUrl:process.env.VIETQR_API_BASE_URL||'https://api.vietqr.io',
    clientId:process.env.VIETQR_CLIENT_ID||'',apiKey:process.env.VIETQR_API_KEY||'',
    webhookToken:process.env.VIETQR_WEBHOOK_TOKEN||'',
    returnUrl:process.env.VIETQR_RETURN_URL||`${frontendOrigin}/payments/return`,
  },
};
if (process.env.NODE_ENV==='production' && [config.momo.baseUrl,config.momo.ipnUrl,
  config.momo.redirectUrl,config.vietqr.baseUrl].some(url=>!url.startsWith('https://')))
  throw new Error('Production payment provider URLs must use HTTPS');
if (process.env.NODE_ENV==='production' && config.momo.partnerCode &&
  (!process.env.MOMO_API_BASE_URL || /test-payment\.momo\.vn/i.test(config.momo.baseUrl)))
  throw new Error('Production MoMo API base URL must be explicitly configured to the live endpoint');
if (process.env.NODE_ENV==='production' && config.vietqr.clientId && !settlementToken)
  throw new Error('PAYMENT_SETTLEMENT_TOKEN is required for production VietQR refunds');
const pool=new pg.Pool({ connectionString:databaseUrl });
const service=new PaymentService(pool,config);
const send=(res,status,data)=>{ res.writeHead(status,{ 'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff' }); res.end(JSON.stringify(data)); };
const secretValid=(actual,expected)=>{
  const a=Buffer.from(String(actual||'')),b=Buffer.from(String(expected||''));
  return b.length>0 && a.length===b.length && timingSafeEqual(a,b);
};
async function body(req) {
  if (!String(req.headers['content-type']||'').startsWith('application/json'))
    throw new PaymentError(415,'CONTENT_TYPE_REQUIRED','Yêu cầu JSON.');
  const chunks=[];let size=0;
  for await (const chunk of req) {
    size+=chunk.length;
    if (size>32768) throw new PaymentError(413,'BODY_TOO_LARGE','Dữ liệu quá lớn.');
    chunks.push(chunk);
  }
  try {
    const raw=Buffer.concat(chunks).toString('utf8');
    const lossless=raw.replace(/"(transId|refundTransId)"\s*:\s*(\d+)/g,'"$1":"$2"');
    const result=JSON.parse(lossless||'{}');
    if (result && typeof result==='object' && !Array.isArray(result)) return result;
  } catch {}
  throw new PaymentError(400,'INVALID_JSON','JSON không hợp lệ.');
}
export function createHandler(payment=service) {
  return async (req,res)=>{
    const origin=req.headers.origin;
    if (origin===frontendOrigin) {
      res.setHeader('Access-Control-Allow-Origin',origin);
      res.setHeader('Access-Control-Allow-Credentials','true');
      res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
      res.setHeader('Vary','Origin');
    }
    if (req.method==='OPTIONS') { res.writeHead(origin===frontendOrigin?204:403); res.end(); return; }
    try {
      const url=new URL(req.url,'http://localhost');
      const path=url.pathname.replace(/^\/api\/v2/,'');
      if(req.method==='GET'&&path==='/internal/notification/metrics'){
        if(!secretValid(req.headers['x-payment-notification-token'],notificationWebhookToken))
          throw new PaymentError(403,'FORBIDDEN','Không có quyền xem notification metrics.');
        return send(res,200,await payment.notificationMetrics());
      }
      if (req.method==='POST' && path==='/payments/webhooks/momo') {
        const input=await body(req);
        const result=await payment.momoWebhook(input);
        return send(res,200,{ partnerCode:input.partnerCode,requestId:input.requestId,
          orderId:input.orderId,resultCode:0,message:'Received',idempotent:result.idempotent });
      }
      if (req.method==='POST' && path==='/payments/webhooks/bank') {
        if (!secretValid(req.headers['secure-token'],payment.vietqr.config.webhookToken))
          throw new PaymentError(403,'INVALID_TOKEN','Webhook ngân hàng không hợp lệ.');
        return send(res,200,await payment.vietqrWebhook(await body(req),req.headers['secure-token']));
      }
      const settlement=/^\/internal\/refunds\/([0-9a-f-]{36})\/settle$/i.exec(path);
      if (req.method==='POST' && settlement) {
        if (!secretValid(req.headers['x-payment-settlement-token'],settlementToken))
          throw new PaymentError(403,'FORBIDDEN','Thiếu xác thực adapter đối soát ngân hàng.');
        const input=await body(req);
        return send(res,200,await payment.settleVietqrRefund(settlement[1],input.bankReference));
      }
      if (path.startsWith('/internal/')) {
        if (!secretValid(req.headers['x-payment-internal-token'],internalToken))
          throw new PaymentError(403,'FORBIDDEN','Không có quyền với Payment API nội bộ.');
        if (req.method==='POST' && path==='/internal/cod-collections')
          return send(res,200,await payment.collectCod(await body(req)));
        if (req.method==='POST' && path==='/internal/refunds')
          return send(res,202,await payment.refund(await body(req)));
        if (req.method==='GET' && path==='/internal/reconciliation')
          return send(res,200,await payment.report());
        if (req.method==='POST' && path==='/internal/reconcile') {
          return send(res,200,{ paymentChecked:await payment.reconcileOne(),
            refundChecked:await payment.reconcileRefundOne(),
            cancelledRefundsQueued:await payment.reconcileCancelledOrders() });
        }
        throw new PaymentError(404,'NOT_FOUND','Không tìm thấy API nội bộ.');
      }
      if (['POST','PATCH','DELETE'].includes(req.method) && origin!==frontendOrigin)
        throw new PaymentError(403,'ORIGIN_DENIED','Origin không hợp lệ.');
      const user=await payment.identity(req.headers.authorization);
      if (req.method==='GET' && path==='/payments/methods')
        return send(res,200,payment.methods());
      if (req.method==='POST' && path==='/payments/intents')
        return send(res,201,await payment.createIntent(user.id,await body(req)));
      const intent=/^\/payments\/intents\/([0-9a-f-]{36})$/i.exec(path);
      if (req.method==='GET' && intent) return send(res,200,await payment.intent(intent[1],user.id));
      const group=/^\/orders\/([0-9a-f-]{36})\/payments$/i.exec(path);
      if (req.method==='GET' && group) return send(res,200,await payment.orderPayments(group[1],user.id));
      throw new PaymentError(404,'NOT_FOUND','Không tìm thấy API.');
    } catch (error) {
      const known=error instanceof PaymentError;
      if (!known) console.error('Payment request failed:');
      send(res,known?error.status:500,{ code:known?error.code:'INTERNAL_ERROR',
        message:known?error.message:'Không thể xử lý thanh toán.',
        ...(known&&error.details?{ details:error.details }: {}) });
    }
  };
}
export function startServer() {
  const server=http.createServer(createHandler());
  server.listen(port,()=>console.log('Payment Service listening on '+port));
  let working=false;
  const timer=setInterval(()=>{
    if (working) return;
    working=true;
    (async()=>{ await service.reconcileOne(); await service.reconcileRefundOne();
      await service.reconcileCancelledOrders();
      for(let i=0;i<10;i++) if (!(await service.publishOutbox())) break; })()
      .catch(()=>console.error('Payment reconciliation failed:'))
      .finally(()=>{ working=false; });
  },5000);
  let notifying=false;
  const notificationTimer=setInterval(()=>{
    if(notifying||!notificationWebhookUrl||!notificationWebhookToken)return;
    notifying=true;
    (async()=>{for(let i=0;i<10;i++)if(!(await service.publishNotificationOutbox(
      notificationWebhookUrl,notificationWebhookToken)))break;})()
      .catch(()=>console.error('Payment notification worker failed:'))
      .finally(()=>{notifying=false;});
  },5000);
  process.on('SIGTERM',()=>{ clearInterval(timer);clearInterval(notificationTimer);
    server.close(); void pool.end(); });
  return server;
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) startServer();
