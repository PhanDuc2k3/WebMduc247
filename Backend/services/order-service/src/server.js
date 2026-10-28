import http from 'node:http';
import pg from 'pg';
import { pathToFileURL } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { OrderError, OrderService } from './service.js';
import { OrderLifecycle } from './lifecycle.service.js';
import { ReturnService, configuredReturnScanner } from './return.service.js';
import { OrderAdminService } from './platform-admin.service.js';
import { AdminOrderObligations } from './admin-order-obligations.service.js';
import { ReturnAdminService } from './return-admin.service.js';
import { CaseService } from './case.service.js';
import {CaseResolutionService} from './case-resolution.service.js';
import { PlatformAdminError } from '../../../packages/contracts/platform-admin.js';
import {AdminApprovalService} from './admin-approval.service.js';
import {WorkQueueService} from './work-queue.service.js';
import {WorkQueueWorker} from './work-queue.worker.js';
import {userOrderImpact} from './user-impact.service.js';
import {storeOrderImpact} from './store-admin.service.js';
import {requireAdminPermission} from '../../../packages/contracts/admin-rbac.js';

const port = Number(process.env.ORDER_PORT || 5103);
const dbUrl = process.env.ORDER_DATABASE_URL || process.env.IDENTITY_DATABASE_URL;
const identityUrl = process.env.ORDER_IDENTITY_URL || 'http://127.0.0.1:5101';
const catalogUrl = process.env.ORDER_CATALOG_URL || 'http://127.0.0.1:5102';
const inventoryToken = process.env.INVENTORY_INTERNAL_TOKEN || '';
const deliveryToken = process.env.ORDER_DELIVERY_TOKEN || '';
const paymentToken = process.env.ORDER_PAYMENT_TOKEN || '';
const promotionToken = process.env.PROMOTION_INTERNAL_TOKEN || '';
const chatOrderToken = process.env.CHAT_ORDER_TOKEN || '';
const notificationOrderToken = process.env.NOTIFICATION_ORDER_TOKEN || '';
const eventWebhookUrl = process.env.ORDER_EVENT_WEBHOOK_URL || '';
const eventWebhookToken = process.env.ORDER_EVENT_WEBHOOK_TOKEN || '';
const notificationWebhookUrl = process.env.ORDER_NOTIFICATION_WEBHOOK_URL || '';
const notificationWebhookToken = process.env.NOTIFICATION_ORDER_TOKEN || '';
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
if (!dbUrl || !inventoryToken) throw new Error('ORDER_DATABASE_URL and INVENTORY_INTERNAL_TOKEN are required');
if (process.env.NODE_ENV === 'production' && !deliveryToken) throw new Error('ORDER_DELIVERY_TOKEN is required');
if (process.env.NODE_ENV === 'production' && !paymentToken) throw new Error('ORDER_PAYMENT_TOKEN is required');
if (process.env.NODE_ENV === 'production' && !promotionToken) throw new Error('PROMOTION_INTERNAL_TOKEN is required');
if (process.env.NODE_ENV === 'production' && !process.env.PAYMENT_INTERNAL_TOKEN)
  throw new Error('PAYMENT_INTERNAL_TOKEN is required for returns');
if (eventWebhookUrl && !eventWebhookToken) throw new Error('ORDER_EVENT_WEBHOOK_TOKEN is required');
if (eventWebhookUrl && process.env.NODE_ENV==='production' && !eventWebhookUrl.startsWith('https://'))
  throw new Error('Production order event webhook must use HTTPS');
const pool = new pg.Pool({ connectionString: dbUrl });
const service = new OrderService(pool,catalogUrl,identityUrl,inventoryToken);
const lifecycle = new OrderLifecycle(service);
const returns = new ReturnService(service,{paymentUrl:process.env.ORDER_PAYMENT_URL,
  paymentToken:process.env.PAYMENT_INTERNAL_TOKEN,scanner:configuredReturnScanner(process.env)});
const send = (res,status,data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data));
};
async function body(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) throw new OrderError(413,'BODY_TOO_LARGE','Dữ liệu quá lớn.');
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  } catch {}
  throw new OrderError(400,'INVALID_JSON','JSON không hợp lệ.');
}
async function imageBody(req){
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;
    if(size>2*1024*1024) throw new OrderError(413,'IMAGE_TOO_LARGE','Ảnh quá 2 MB.');
    chunks.push(chunk);}
  return Buffer.concat(chunks);
}
export function createHandler(orderService = service, orderLifecycle = lifecycle, returnService = returns) {
  const queueWorker=new WorkQueueWorker(orderService);
  return async (req,res) => {
    const origin = req.headers.origin;
    if (origin === frontendOrigin) {
      res.setHeader('Access-Control-Allow-Origin',origin);
      res.setHeader('Access-Control-Allow-Credentials','true');
      res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Vary','Origin');
    }
    if (req.method === 'OPTIONS') { res.writeHead(origin === frontendOrigin ? 204 : 403); res.end(); return; }
    try {
      const url = new URL(req.url,'http://localhost');
      const path = url.pathname.replace(/^\/api\/v2/,'');
      const botOrder=/^\/internal\/chat\/orders\/([0-9a-f-]{36})$/i.exec(path);
      if(req.method==='GET'&&botOrder){
        const actual=Buffer.from(String(req.headers['x-chat-order-token']||''));
        const expected=Buffer.from(chatOrderToken);
        if(!expected.length||actual.length!==expected.length||!timingSafeEqual(actual,expected))
          throw new OrderError(403,'FORBIDDEN','Không có quyền xem đơn qua chatbot.');
        return send(res,200,await orderLifecycle.chatOrder(botOrder[1],url.searchParams.get('buyerId')));
      }
      if(path.startsWith('/internal/notification/')){
        const actual=Buffer.from(String(req.headers['x-notification-order-token']||''));
        const expected=Buffer.from(notificationOrderToken);
        if(!expected.length||actual.length!==expected.length||!timingSafeEqual(actual,expected))
          throw new OrderError(403,'FORBIDDEN','Không có quyền với thông báo nội bộ.');
        if(req.method==='GET'&&path==='/internal/notification/metrics')
          return send(res,200,await orderService.notificationMetrics());
        const shop=/^\/internal\/notification\/shop-orders\/([0-9a-f-]{36})$/i.exec(path);
        if(req.method==='GET'&&shop)return send(res,200,await orderLifecycle.notificationShop(shop[1]));
        const group=/^\/internal\/notification\/groups\/([0-9a-f-]{36})$/i.exec(path);
        if(req.method==='GET'&&group)return send(res,200,await orderLifecycle.notificationGroup(group[1]));
        throw new OrderError(404,'NOT_FOUND','Không tìm thấy API nội bộ.');
      }
      if (req.method==='POST' && path==='/internal/delivery-events') {
        const actual = Buffer.from(String(req.headers['x-delivery-token'] || ''));
        const expected = Buffer.from(deliveryToken);
        if (!expected.length || actual.length!==expected.length || !timingSafeEqual(actual,expected))
          throw new OrderError(403,'FORBIDDEN','Không có quyền gửi sự kiện giao hàng.');
        return send(res,200,await orderLifecycle.receiveDelivery(await body(req)));
      }
      if (path.startsWith('/internal/payment/')) {
        const actual=Buffer.from(String(req.headers['x-order-payment-token'] || ''));
        const expected=Buffer.from(paymentToken);
        if (!expected.length || actual.length!==expected.length || !timingSafeEqual(actual,expected))
          throw new OrderError(403,'FORBIDDEN','Không có quyền truy cập dữ liệu thanh toán.');
        if (req.method==='GET' && path==='/internal/payment/refund-candidates')
          return send(res,200,await orderLifecycle.refundCandidates());
        const refundContext=/^\/internal\/payment\/returns\/([0-9a-f-]{36})\/refund-context$/i.exec(path);
        if(req.method==='GET'&&refundContext)
          return send(res,200,await returnService.refundContext(refundContext[1]));
        const group=/^\/internal\/payment\/groups\/([0-9a-f-]{36})$/i.exec(path);
        if (req.method==='GET' && group) return send(res,200,await orderLifecycle.paymentGroup(group[1]));
        if (req.method==='POST' && path==='/internal/payment/events')
          return send(res,200,await orderLifecycle.receivePayment(await body(req)));
        throw new OrderError(404,'NOT_FOUND','Không tìm thấy API nội bộ.');
      }
      if (path.startsWith('/internal/promotion/')) {
        const actual=Buffer.from(String(req.headers['x-promotion-token']||''));
        const expected=Buffer.from(promotionToken);
        if (!expected.length || actual.length!==expected.length || !timingSafeEqual(actual,expected))
          throw new OrderError(403,'FORBIDDEN','Không có quyền với Promotion API nội bộ.');
        const buyer=/^\/internal\/promotion\/buyers\/([0-9a-f-]{36})\/context$/i.exec(path);
        if (req.method==='GET' && buyer) return send(res,200,await orderService.promotionContext(buyer[1]));
        const shop=/^\/internal\/promotion\/orders\/([0-9a-f-]{36})\/status$/i.exec(path);
        if (req.method==='GET' && shop) return send(res,200,await orderLifecycle.promotionOrderStatus(shop[1]));
        const quote=/^\/internal\/promotion\/quotes\/([0-9a-f-]{36})\/status$/i.exec(path);
        if (req.method==='GET' && quote) return send(res,200,await orderLifecycle.promotionQuoteStatus(quote[1]));
        throw new OrderError(404,'NOT_FOUND','Không tìm thấy API nội bộ.');
      }
      if (['POST','PUT','PATCH','DELETE'].includes(req.method) && origin !== frontendOrigin)
        throw new OrderError(403,'ORIGIN_DENIED','Origin không hợp lệ.');
      if (!/^Bearer\s+\S+$/i.test(req.headers.authorization || ''))
        throw new OrderError(401,'UNAUTHORIZED','Vui lòng đăng nhập.');
      const { user } = await orderService.identity('/auth/me',req.headers.authorization);
      const query = Object.fromEntries(url.searchParams);
      if (path.startsWith('/admin/')) {
        const storeImpact=/^\/admin\/stores\/([0-9a-f-]{36})\/impact$/i.exec(path);
        if(req.method==='GET'&&storeImpact)return send(res,200,await storeOrderImpact(orderService.pool,user,storeImpact[1],query));
        const userImpact=/^\/admin\/user-impact\/([0-9a-f-]{36})$/i.exec(path);
        if(req.method==='GET'&&userImpact)return send(res,200,await userOrderImpact(orderService,user,userImpact[1],req.headers.authorization));
        const queue=new WorkQueueService(orderService);
        const queueRetry=/^\/admin\/work-queue\/retry\/(orders|cases|payment|chat)$/.exec(path);
        if(req.method==='POST'&&queueRetry){
          requireAdminPermission(user,{orders:'orders.read',cases:'cases.read',payment:'refunds.read',chat:'moderation.read'}[queueRetry[1]]);
          return send(res,200,await queueWorker.run(queueRetry[1]));
        }
        if(req.method==='GET'&&path==='/admin/work-queue')return send(res,200,await queue.list(user,query));
        if(req.method==='GET'&&path==='/admin/work-queue/attention')return send(res,200,await queue.attention(user));
        if(req.method==='GET'&&path==='/admin/work-queue/settings')return send(res,200,await queue.settings(user));
        if(req.method==='GET'&&path==='/admin/work-queue/notifications')return send(res,200,await queue.notifications(user));
        const queueRead=/^\/admin\/work-queue\/notifications\/(\d+)\/read$/.exec(path);
        if(req.method==='POST'&&queueRead)return send(res,200,await queue.markRead(user,queueRead[1]));
        const queuePolicy=/^\/admin\/work-queue\/settings\/(ORDER|RETURN|TICKET|DISPUTE|REFUND|ABUSE_REPORT)$/.exec(path);
        if(req.method==='PUT'&&queuePolicy)return send(res,200,await queue.updateSettings(user,queuePolicy[1],await body(req)));
        const queueItem=/^\/admin\/work-queue\/([0-9a-f-]{36})(\/actions)?$/i.exec(path);
        if(req.method==='GET'&&queueItem&&!queueItem[2])return send(res,200,await queue.detail(user,queueItem[1]));
        if(req.method==='POST'&&queueItem&&queueItem[2])return send(res,200,await queue.action(user,queueItem[1],await body(req)));
        const approvals=new AdminApprovalService(orderService);
        if(req.method==='GET'&&path==='/admin/approvals')return send(res,200,await approvals.list(user,query.operation));
        if(req.method==='POST'&&path==='/admin/approvals')return send(res,201,await approvals.create(user,await body(req)));
        const approvalReview=/^\/admin\/approvals\/([0-9a-f-]{36})\/review$/i.exec(path);
        if(req.method==='POST'&&approvalReview)return send(res,200,await approvals.review(user,approvalReview[1],await body(req)));
        if(req.method==='GET'&&path==='/admin/approval-policies')return send(res,200,await approvals.policies(user));
        const approvalPolicy=/^\/admin\/approval-policies\/(return_approve|cancel_paid_order)$/.exec(path);
        if(req.method==='PUT'&&approvalPolicy)return send(res,200,await approvals.updatePolicy(user,approvalPolicy[1],await body(req)));
        const blockedCancellation=/^\/admin\/orders\/([0-9a-f-]{36})\/cancel-blocked-seller$/i.exec(path);
        if(req.method==='POST'&&blockedCancellation)return send(res,200,await new AdminOrderObligations(orderLifecycle).cancel(user,blockedCancellation[1],await body(req),req.headers.authorization));
        const admin = new OrderAdminService(orderService.pool);
        const adminReturns = new ReturnAdminService(returnService);
        const cases=adminReturns.cases;
        const resolution=new CaseResolutionService(cases);
        if(req.method==='GET'&&path==='/admin/case-reports')return send(res,200,await resolution.report(user,query));
        const workflow=/^\/admin\/cases\/([0-9a-f-]{36})\/(resolution|messages|escalations|decision-proposals|fulfillment|close|interventions)$/i.exec(path);
        if(workflow){
          if(req.method==='GET'&&workflow[2]==='resolution')return send(res,200,await resolution.detail(user,workflow[1]));
          if(req.method==='POST'){
            const handlers={messages:'message',escalations:'escalate','decision-proposals':'propose',fulfillment:'fulfill',close:'close',interventions:'intervene'};
            if(handlers[workflow[2]])return send(res,200,await resolution[handlers[workflow[2]]](user,workflow[1],await body(req),req.headers.authorization));
          }
        }
        const decisionReview=/^\/admin\/cases\/([0-9a-f-]{36})\/decisions\/([0-9a-f-]{36})\/review$/i.exec(path);
        if(req.method==='POST'&&decisionReview)return send(res,200,await resolution.review(user,decisionReview[1],decisionReview[2],await body(req)));
        const appealReview=/^\/admin\/cases\/([0-9a-f-]{36})\/appeals\/([0-9a-f-]{36})\/review$/i.exec(path);
        if(req.method==='POST'&&appealReview)return send(res,200,await resolution.reviewAppeal(user,appealReview[1],appealReview[2],await body(req)));
        const caseImage=/^\/admin\/cases\/([0-9a-f-]{36})\/evidence\/([0-9a-f-]{36})(\/access)?$/i.exec(path);
        if(caseImage&&req.method==='POST'&&caseImage[3])return send(res,200,await resolution.imageGrant(user,caseImage[1],caseImage[2],(await body(req)).reason));
        if(caseImage&&req.method==='GET'&&!caseImage[3]){
          const image=await resolution.image(user,caseImage[1],caseImage[2],query.grant);
          res.writeHead(200,{'Content-Type':image.mimeType,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});res.end(image.data);return;
        }
        if(req.method==='GET'&&path==='/admin/cases/capabilities')return send(res,200,await cases.capabilities(user));
        if(req.method==='GET'&&path==='/admin/cases/staff')return send(res,200,await cases.staff(user,req.headers.authorization,query.q||''));
        if(req.method==='GET'&&path==='/admin/cases')return send(res,200,await cases.list(user,query));
        if(req.method==='POST'&&path==='/admin/cases')return send(res,201,await cases.create(user,await body(req)));
        const caseContext=/^\/admin\/cases\/order-context\/([0-9a-f-]{36})$/i.exec(path);
        if(req.method==='GET'&&caseContext)return send(res,200,await cases.orderContext(user,caseContext[1]));
        const caseRecord=/^\/admin\/cases\/([0-9a-f-]{36})$/i.exec(path);
        if(req.method==='GET'&&caseRecord)return send(res,200,await cases.detail(user,caseRecord[1]));
        const caseAssignment=/^\/admin\/cases\/([0-9a-f-]{36})\/assignment$/i.exec(path);
        if(req.method==='PATCH'&&caseAssignment)return send(res,200,await cases.assign(user,caseAssignment[1],await body(req),req.headers.authorization));
        const caseStatus=/^\/admin\/cases\/([0-9a-f-]{36})\/status$/i.exec(path);
        if(req.method==='POST'&&caseStatus)return send(res,200,await cases.status(user,caseStatus[1],await body(req)));
        const caseInformation=/^\/admin\/cases\/([0-9a-f-]{36})\/information-requests$/i.exec(path);
        if(req.method==='POST'&&caseInformation)return send(res,201,await cases.requestInformation(user,caseInformation[1],await body(req)));
        if(req.method==='GET'&&path==='/admin/return-exceptions')return send(res,200,await cases.exceptions(user));
        if(req.method==='POST'&&path==='/admin/return-exceptions')return send(res,201,await cases.requestException(user,await body(req)));
        const exceptionDecision=/^\/admin\/return-exceptions\/([0-9a-f-]{36})\/decisions$/i.exec(path);
        if(req.method==='POST'&&exceptionDecision)return send(res,200,await cases.decideException(user,exceptionDecision[1],await body(req)));
        if(req.method==='GET'&&path==='/admin/returns')return send(res,200,await adminReturns.list(user,query));
        const returnRecord = /^\/admin\/returns\/([0-9a-f-]{36})$/i.exec(path);
        if(req.method==='GET'&&returnRecord)return send(res,200,await adminReturns.detail(user,returnRecord[1]));
        const returnDecision = /^\/admin\/returns\/([0-9a-f-]{36})\/decisions$/i.exec(path);
        if(req.method==='POST'&&returnDecision)return send(res,200,await adminReturns.decide(user,returnDecision[1],await body(req)));
        const adminEvidence = /^\/admin\/returns\/([0-9a-f-]{36})\/evidence\/([0-9a-f-]{36})$/i.exec(path);
        if(req.method==='GET'&&adminEvidence){
          const image=await adminReturns.evidence(user,adminEvidence[1],adminEvidence[2],query.grant);
          res.writeHead(200,{'Content-Type':image.mimeType,'Cache-Control':'private, no-store',
            'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});
          res.end(image.data);return;
        }
        const evidenceAccess=/^\/admin\/returns\/([0-9a-f-]{36})\/evidence\/([0-9a-f-]{36})\/access$/i.exec(path);
        if(req.method==='POST'&&evidenceAccess)return send(res,200,await cases.issueEvidence(user,evidenceAccess[1],evidenceAccess[2],(await body(req)).reason));
        if(req.method==='GET'&&path==='/admin/orders/summary')return send(res,200,await admin.summary(user,query));
        if(req.method==='GET'&&path==='/admin/orders/recent')return send(res,200,await admin.recent(user,query));
        if(req.method==='GET'&&path==='/admin/orders')return send(res,200,await admin.list(user,query));
        const record = /^\/admin\/orders\/([0-9a-f-]{36})$/i.exec(path);
        if(req.method==='GET'&&record)return send(res,200,await admin.detail(user,record[1]));
        throw new OrderError(404,'NOT_FOUND','Không tìm thấy API quản trị.');
      }
      const participantResolution=/^\/cases\/([0-9a-f-]{36})\/(resolution|statements|appeals|evidence)(?:\/([0-9a-f-]{36}))?$/i.exec(path);
      if(participantResolution){
        const resolution=new CaseResolutionService(new CaseService(returnService)),id=participantResolution[1],action=participantResolution[2];
        if(req.method==='GET'&&action==='resolution')return send(res,200,await resolution.publicDetail(user.id,id));
        if(req.method==='POST'&&action==='statements')return send(res,201,await resolution.statement(user.id,id,await body(req)));
        if(req.method==='POST'&&action==='appeals')return send(res,201,await resolution.appeal(user.id,id,await body(req)));
        if(req.method==='POST'&&action==='evidence'&&!participantResolution[3])return send(res,201,await resolution.upload(user.id,id,await imageBody(req),req.headers['content-type']));
        if(req.method==='GET'&&action==='evidence'&&participantResolution[3]){
          const image=await resolution.publicEvidence(user.id,id,participantResolution[3]);res.writeHead(200,{'Content-Type':image.mimeType,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});res.end(image.data);return;
        }
      }
      const orderCases=/^\/orders\/([0-9a-f-]{36})\/cases$/i.exec(path);
      if(req.method==='GET'&&orderCases)return send(res,200,await new CaseService(returnService).participantCases(user.id,orderCases[1]));
      const informationReply=/^\/cases\/([0-9a-f-]{36})\/information-requests\/([0-9a-f-]{36})\/replies$/i.exec(path);
      if(req.method==='POST'&&informationReply)return send(res,201,await new CaseService(returnService).reply(user.id,informationReply[1],informationReply[2],await body(req)));
      if(req.method==='GET'&&path==='/returns') return send(res,200,await returnService.buyerList(user.id,query.shopOrderId));
      const returnDetail=/^\/returns\/([0-9a-f-]{36})$/i.exec(path);
      if(req.method==='GET'&&returnDetail)
        return send(res,200,await returnService.detail(user.id,returnDetail[1]));
      const returnEvidence=/^\/returns\/([0-9a-f-]{36})\/evidence(?:\/([0-9a-f-]{36}))?$/i.exec(path);
      if(returnEvidence&&req.method==='POST'&&!returnEvidence[2])
        return send(res,201,await returnService.uploadEvidence(user.id,returnEvidence[1],
          await imageBody(req),req.headers['content-type']));
      if(returnEvidence&&req.method==='GET'&&returnEvidence[2]){
        const image=await returnService.evidence(user.id,returnEvidence[1],returnEvidence[2]);
        res.writeHead(200,{'Content-Type':image.mime_type,'Cache-Control':'private, no-store',
          'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});
        res.end(image.data);return;
      }
      const buyerReturn=/^\/orders\/([0-9a-f-]{36})\/returns$/i.exec(path);
      if(req.method==='POST'&&buyerReturn)
        return send(res,201,await returnService.create(user.id,buyerReturn[1],await body(req)));
      const buyerReturnAction=/^\/returns\/([0-9a-f-]{36})\/(ship|close)$/i.exec(path);
      if(req.method==='POST'&&buyerReturnAction)
        return send(res,200,await returnService.transition(user.id,buyerReturnAction[1],
          buyerReturnAction[2],await body(req)));
      const sellerReturns=/^\/seller\/stores\/([0-9a-f-]{36})\/returns$/i.exec(path);
      if(req.method==='GET'&&sellerReturns)
        return send(res,200,await returnService.sellerList(user.id,sellerReturns[1],query.shopOrderId));
      const sellerReturnAction=/^\/seller\/returns\/([0-9a-f-]{36})\/(review|approve|reject|receive)$/i.exec(path);
      if(req.method==='POST'&&sellerReturnAction)
        return send(res,200,await returnService.transition(user.id,sellerReturnAction[1],
          sellerReturnAction[2],await body(req)));
      if (req.method === 'GET' && path === '/cart') return send(res,200,await orderService.cart(user.id));
      if (req.method === 'POST' && path === '/cart/items') return send(res,201,await orderService.add(user.id,await body(req)));
      if (req.method === 'POST' && path === '/cart/merge') return send(res,200,await orderService.merge(user.id,await body(req)));
      const item = /^\/cart\/items\/([0-9a-f-]{36})$/i.exec(path);
      if (req.method === 'PATCH' && item) return send(res,200,await orderService.edit(user.id,item[1],await body(req)));
      if (req.method === 'DELETE' && item) return send(res,200,await orderService.remove(user.id,item[1]));
      if (req.method === 'POST' && path === '/checkout/preview')
        return send(res,200,await orderService.preview(user.id,await body(req),req.headers.authorization));
      if (req.method === 'POST' && path === '/checkout/place-order')
        return send(res,201,await orderService.place(user.id,await body(req),req.headers.authorization));
      if (req.method === 'POST' && path === '/orders')
        return send(res,201,await orderService.place(user.id,await body(req),req.headers.authorization));
      if (req.method === 'GET' && path === '/orders')
        return send(res,200,await orderLifecycle.buyerList(user.id,query));
      const buyerOrder = /^\/orders\/([0-9a-f-]{36})(?:\/(cancel))?$/i.exec(path);
      if (buyerOrder && req.method === 'GET' && !buyerOrder[2])
        return send(res,200,await orderLifecycle.buyerDetail(user.id,buyerOrder[1]));
      if (buyerOrder && req.method === 'POST' && buyerOrder[2]==='cancel')
        return send(res,200,await orderLifecycle.buyerCancel(user.id,buyerOrder[1],await body(req)));
      const buyerComplete = /^\/orders\/([0-9a-f-]{36})\/shop-orders\/([0-9a-f-]{36})\/complete$/i.exec(path);
      if (buyerComplete && req.method==='POST')
        return send(res,200,await orderLifecycle.buyerComplete(user.id,buyerComplete[1],buyerComplete[2],await body(req)));
      const sellerList = /^\/seller\/stores\/([0-9a-f-]{36})\/orders$/i.exec(path);
      if (sellerList && req.method === 'GET')
        return send(res,200,await orderLifecycle.sellerList(user.id,sellerList[1],query));
      const sellerOrder = /^\/seller\/orders\/([0-9a-f-]{36})(?:\/(confirm|prepare|ready-to-ship|reject))?$/i.exec(path);
      if (sellerOrder && req.method === 'GET' && !sellerOrder[2])
        return send(res,200,await orderLifecycle.sellerDetail(user.id,sellerOrder[1]));
      if (sellerOrder && req.method === 'POST' && sellerOrder[2]) {
        const input = await body(req);
        return send(res,200,sellerOrder[2]==='reject'
          ? await orderLifecycle.sellerReject(user.id,sellerOrder[1],input)
          : await orderLifecycle.transition(user.id,sellerOrder[1],sellerOrder[2],input));
      }
      throw new OrderError(404,'NOT_FOUND','Không tìm thấy API.');
    } catch (error) {
      const known=error instanceof OrderError || error instanceof PlatformAdminError;
      if (!known) console.error('Order request failed:');
      send(res,known ? error.status : 500,{ code: known ? error.code : 'INTERNAL_ERROR',
        message: known ? error.message : 'Không thể xử lý yêu cầu.', ...(known && error.details ? { details: error.details } : {}) });
    }
  };
}
export function startServer() {
  const server = http.createServer(createHandler());
  server.listen(port,() => console.log('Order Service listening on ' + port));
  const timer = setInterval(() => service.reconcilePending().catch(()=>console.error('Order reconciliation failed:')),10000);
  const cancellationTimer = setInterval(() => lifecycle.reconcileCancellations().catch(()=>console.error('Cancellation reconciliation failed:')),10000);
  const paymentExpiryTimer = setInterval(() => lifecycle.expireUnpaidOnline().catch(()=>console.error('Unpaid order expiry failed:')),60000);
  const returnTimer = setInterval(() => returns.reconcile().catch(()=>console.error('Return reconciliation failed:')),30000);
  const queueWorker=new WorkQueueWorker(service);
  const updateQueue=()=>queueWorker.run().catch(()=>console.error('Admin work queue sync failed'));
  void updateQueue();const queueTimer=setInterval(updateQueue,30000);
  let publishing = false;
  const outboxTimer = setInterval(() => {
    if (publishing || !eventWebhookUrl) return;
    publishing = true;
    (async () => { for (let i=0;i<10;i++) if (!(await service.publishOutbox(eventWebhookUrl,eventWebhookToken))) break; })()
      .catch(()=>console.error('Order outbox publisher failed:'))
      .finally(() => { publishing=false; });
  },5000);
  let notifying=false;
  const notificationTimer=setInterval(()=>{
    if(notifying||!notificationWebhookUrl||!notificationWebhookToken)return;
    notifying=true;
    (async()=>{for(let i=0;i<10;i++)if(!(await service.publishNotificationOutbox(
      notificationWebhookUrl,notificationWebhookToken)))break;})()
      .catch(()=>console.error('Order notification worker failed:'))
      .finally(()=>{notifying=false;});
  },5000);
  process.on('SIGTERM',() => { clearInterval(timer); clearInterval(cancellationTimer);
    clearInterval(paymentExpiryTimer);
    clearInterval(returnTimer);
    clearInterval(queueTimer);
    clearInterval(outboxTimer); clearInterval(notificationTimer);
    server.close(); void pool.end(); });
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startServer();
