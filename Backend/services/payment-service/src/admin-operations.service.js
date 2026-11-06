import {adminId,adminMoney,adminPage,PlatformAdminError} from '../../../packages/contracts/platform-admin.js';
import {requireAdminScope} from '../../../packages/contracts/admin-rbac.js';
import {operationsQuery,operationsCommand} from '../../../packages/contracts/admin-operations.js';

const paymentStatuses=['INITIATED','PENDING','SUCCEEDED','FAILED','EXPIRED','REFUNDED','PARTIALLY_REFUNDED','UNPAID'];
const refundStatuses=['INITIATED','PENDING','SUCCEEDED','FAILED'];
export class PaymentAdminOperations {
  constructor(payment){this.payment=payment;this.pool=payment.pool;}
  kind(kind){if(!['payments','refunds'].includes(kind))throw new PlatformAdminError(400,'INVALID_KIND','Loại giao dịch không hợp lệ.');return kind==='refunds';}
  async list(actor,kind,query={}){
    requireAdminScope(actor,'finance.view_sensitive',{});const refunds=this.kind(kind);
    const f=operationsQuery(query,refunds?refundStatuses:paymentStatuses,['provider','review']);
    if(query.provider&&!['MOMO','VIETQR','COD'].includes(query.provider)||query.review&&!['true','false'].includes(query.review))throw new PlatformAdminError(400,'INVALID_ADMIN_FILTER','Bộ lọc không hợp lệ.');
    const args=[f.pattern,f.status,f.from,f.to,query.provider||'',query.review||''];
    const from=refunds?'payment_service.refunds r JOIN payment_service.payment_intents p ON p.id=r.payment_intent_id':'payment_service.payment_intents p';
    const a=refunds?'r':'p';
    const where=`FROM ${from} WHERE ($1='%%' OR ${a}.id::text ILIKE $1 OR p.order_group_id::text ILIKE $1 OR coalesce(p.provider_order_ref,'') ILIKE $1
      OR EXISTS(SELECT 1 FROM payment_service.payment_transactions t WHERE t.intent_id=p.id AND coalesce(t.provider_txn_id,'') ILIKE $1)
      ${refunds?"OR r.shop_order_id::text ILIKE $1 OR r.provider_refund_ref ILIKE $1":""})
      AND ($2='' OR ${a}.status=$2) AND ($3::timestamptz IS NULL OR ${a}.created_at>=$3) AND ($4::timestamptz IS NULL OR ${a}.created_at<$4)
      AND ($5='' OR ${a}.provider=$5) AND ($6='' OR p.review_required=($6='true'))`;
    const [count,items]=await Promise.all([this.pool.query(`SELECT count(*)::int n ${where}`,args),this.pool.query(`SELECT ${a}.id,p.order_group_id,${a}.provider,${a}.status,${a}.amount_minor,${a}.created_at,${a}.updated_at,p.review_required,
      ${refunds?'r.shop_order_id,r.idempotency_key,r.admin_version AS version':'p.version,NULL::uuid AS shop_order_id,NULL::text AS idempotency_key'} ${where}
      ORDER BY ${a}.created_at DESC,${a}.id DESC LIMIT $7 OFFSET $8`,[...args,f.limit,f.offset])]);
    return adminPage(items.rows.map(row=>this.dto(row)),count.rows[0].n,f);
  }
  dto(row){return {id:row.id,orderGroupId:row.order_group_id,shopOrderId:row.shop_order_id||null,provider:row.provider,status:row.status,amountMinor:adminMoney(row.amount_minor),
    version:Number(row.version),needsReview:row.review_required,createdAt:row.created_at,updatedAt:row.updated_at,
    returnId:/^return:[0-9a-f-]{36}:\d+$/.test(row.idempotency_key||'')?row.idempotency_key.split(':')[1]:null};}
  async detail(actor,kind,id){
    requireAdminScope(actor,'finance.view_sensitive',{});const refunds=this.kind(kind);adminId(id);
    const row=(await this.pool.query(refunds?`SELECT r.*,p.order_group_id,p.review_required,r.admin_version AS version FROM payment_service.refunds r JOIN payment_service.payment_intents p ON p.id=r.payment_intent_id WHERE r.id=$1`:
      'SELECT * FROM payment_service.payment_intents WHERE id=$1',[id])).rows[0];
    if(!row)throw new PlatformAdminError(404,'TRANSACTION_NOT_FOUND','Không tìm thấy giao dịch.');
    const intentId=refunds?row.payment_intent_id:row.id;
    const [transactions,refundRows,checks,events,outbox]=await Promise.all([
      this.pool.query('SELECT id,provider,provider_txn_id,status,amount_minor,verified_at,source FROM payment_service.payment_transactions WHERE intent_id=$1 ORDER BY verified_at DESC LIMIT 50',[intentId]),
      this.pool.query('SELECT id,shop_order_id,status,amount_minor FROM payment_service.refunds WHERE payment_intent_id=$1 ORDER BY created_at DESC LIMIT 50',[intentId]),
      this.pool.query('SELECT id,local_status,observed_status,outcome,checked_at FROM payment_service.payment_reconciliation WHERE intent_id=$1 ORDER BY id DESC LIMIT 30',[intentId]),
      this.pool.query('SELECT id,actor_id,kind,reason,created_at FROM payment_service.admin_operations WHERE target_id=$1 ORDER BY id DESC LIMIT 30',[id]),
      this.pool.query('SELECT event_type,attempts,created_at,published_at,next_attempt_at FROM payment_service.payment_outbox WHERE aggregate_id=$1 ORDER BY id DESC LIMIT 20',[intentId]),
    ]);
    const sums=(await this.pool.query(`SELECT coalesce(sum(amount_minor) FILTER(WHERE status='SUCCEEDED'),0) AS refunded,
      coalesce(sum(amount_minor) FILTER(WHERE status IN ('INITIATED','PENDING')),0) AS reserved FROM payment_service.refunds WHERE payment_intent_id=$1`,[intentId])).rows[0];
    const intent=refunds?(await this.pool.query('SELECT amount_minor,status FROM payment_service.payment_intents WHERE id=$1',[intentId])).rows[0]:row;
    const paid=transactions.rows.filter(t=>t.status==='SUCCEEDED').reduce((sum,t)=>sum+adminMoney(t.amount_minor),0);
    let orderSource={available:false,needsReview:false,orders:[]};
    try{const group=await this.payment.group(row.order_group_id);if(Array.isArray(group.orders))orderSource={available:true,
      needsReview:row.provider!=='COD'&&paid>0&&group.paymentStatus==='UNPAID',
      orders:group.orders.map(o=>({id:adminId(o.id),status:o.status,paymentStatus:o.paymentStatus,amountMinor:adminMoney(o.amountMinor)}))};}catch{}
    return {record:{...this.dto(row),providerReference:refunds?row.provider_refund_ref:row.provider_order_ref,lastCheckedAt:row.last_reconciled_at,
      recheckRequestedAt:row.admin_recheck_requested_at,canRecheck:row.provider==='MOMO'&&['INITIATED','PENDING'].includes(row.status)},
      amounts:{expected:adminMoney(intent.amount_minor),paid,refunded:adminMoney(sums.refunded),reserved:adminMoney(sums.reserved),remaining:Math.max(0,paid-adminMoney(sums.refunded)-adminMoney(sums.reserved))},
      orderSource,transactions:transactions.rows.map(t=>({...t,amount_minor:adminMoney(t.amount_minor)})),refunds:refundRows.rows.map(r=>({...r,amount_minor:adminMoney(r.amount_minor)})),checks:checks.rows,events:events.rows,outbox:outbox.rows,
      guidance:row.provider==='VIETQR'?'Chuyển khoản cần đối soát ngân hàng có chứng từ; không xác nhận thủ công từ màn này.':row.status==='FAILED'?'Mở hồ sơ nguồn để xem điều kiện thử lại. Không tạo một khoản hoàn mới khi giao dịch cũ chưa rõ kết quả.':'Yêu cầu kiểm tra lại chỉ đưa giao dịch vào worker xác minh qua provider; chưa có nghĩa đã thu hoặc hoàn tiền.'};
  }
  async recheck(actor,kind,id,input){
    requireAdminScope(actor,'finance.reconcile',{});const refunds=this.kind(kind);adminId(id);const cmd=operationsCommand(input);
    return this.payment.transaction(async db=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`payment-admin:${actor.id}:${cmd.requestId}`]);
      const receipt=(await db.query('SELECT * FROM payment_service.admin_operations WHERE actor_id=$1 AND request_id=$2',[actor.id,cmd.requestId])).rows[0];
      if(receipt){if(receipt.target_id!==id||receipt.kind!==kind||receipt.reason!==cmd.reason||Number(receipt.read_version)!==cmd.version)throw new PlatformAdminError(409,'IDEMPOTENCY_CONFLICT','Mã yêu cầu đã dùng cho nội dung khác.');return {status:'QUEUED',requestId:cmd.requestId};}
      const table=refunds?'refunds':'payment_intents';
      const row=(await db.query(`SELECT * FROM payment_service.${table} WHERE id=$1 FOR UPDATE`,[id])).rows[0];
      if(!row)throw new PlatformAdminError(404,'TRANSACTION_NOT_FOUND','Không tìm thấy giao dịch.');
      if(Number(refunds?row.admin_version:row.version)!==cmd.version)throw new PlatformAdminError(409,'VERSION_CONFLICT','Giao dịch đã đổi; hãy tải lại.');
      if(row.provider!=='MOMO'||!['INITIATED','PENDING'].includes(row.status))throw new PlatformAdminError(409,'RECHECK_NOT_ALLOWED','Trạng thái/provider này không hỗ trợ kiểm tra lại tự động.');
      if(row.admin_recheck_requested_at&&Date.now()-Date.parse(row.admin_recheck_requested_at)<60000)throw new PlatformAdminError(429,'RECHECK_RATE_LIMIT','Chờ ít nhất một phút trước khi yêu cầu kiểm tra tiếp.');
      await db.query(`UPDATE payment_service.${table} SET admin_recheck_requested_at=now(),${refunds?'last_reconciled_at=NULL':'next_reconcile_at=now(),version=version+1'} WHERE id=$1`,[id]);
      await db.query('INSERT INTO payment_service.admin_operations(actor_id,request_id,kind,target_id,reason,read_version) VALUES($1,$2,$3,$4,$5,$6)',[actor.id,cmd.requestId,kind,id,cmd.reason,cmd.version]);
      return {status:'QUEUED',requestId:cmd.requestId};
    });
  }
}
