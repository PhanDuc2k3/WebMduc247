import {requireAdminPermission, requireAdminScope} from '../../../packages/contracts/admin-rbac.js';
import {createHash} from 'node:crypto';
import {adminId, adminMutation, PlatformAdminError} from '../../../packages/contracts/platform-admin.js';
import {requireCasePermission, caseInput} from './case-contract.js';
import {AdminApprovalService} from './admin-approval.service.js';
import {requireOrderAccess} from './admin-scope.js';

export class AdminOrderObligations {
  constructor(lifecycle){this.lifecycle=lifecycle;this.order=lifecycle.order;}
  async cancel(actor,id,input,bearer){
    requireAdminPermission(actor,'orders.execute');adminId(id);caseInput(input,['version','reason','requestId','approvalId']);
    const command={...adminMutation(input),...(input.approvalId?{approvalId:adminId(input.approvalId)}:{})},key='admin:'+command.requestId;
    const fingerprint=createHash('sha256').update(JSON.stringify({id,...command})).digest('hex');
    await this.order.transaction(async db=>{
      // Recheck explicit permission for retries too. No automatic grant to existing admins.
      await requireCasePermission(db,actor,'orders.cancel_blocked');
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[actor.id,key]);
      const existing=(await db.query('SELECT request_hash,shop_order_id FROM order_service.order_commands WHERE actor_id=$1 AND idempotency_key=$2',[actor.id,key])).rows[0];
      if(existing){
        await requireOrderAccess(db,actor,'orders.execute',existing.shop_order_id);
        if(existing.request_hash!==fingerprint)throw new PlatformAdminError(409,'IDEMPOTENCY_CONFLICT','Mã yêu cầu đã được dùng cho nội dung khác.');
        return;
      }
      const row=(await db.query('SELECT * FROM order_service.orders WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(row)requireAdminScope(actor,'orders.execute',{storeId:row.store_id});
      if(!row)throw new PlatformAdminError(404,'ORDER_NOT_FOUND','Không tìm thấy đơn hàng.');
      if(Number(row.version)!==command.version)throw new PlatformAdminError(409,'VERSION_CONFLICT','Đơn hàng đã thay đổi. Hãy tải lại.');
      if(!['PLACED','CONFIRMED','PREPARING','READY_TO_SHIP'].includes(row.status))
        throw new PlatformAdminError(409,'INVALID_TRANSITION','Chỉ hủy đơn chưa bàn giao vận chuyển.');
      const store=await this.order.inventory('/stores/'+row.store_id+'/aftersales-status');
      if(row.user_id===actor.id||store.ownerId===actor.id||store.memberIds?.includes(actor.id))
        throw new PlatformAdminError(403,'PARTY_REVIEW_FORBIDDEN','Nhân sự không được dùng quyền này cho đơn của mình hoặc shop mình.');
      let accountBlocked=false;
      if(!store.platformSuspended&&store.ownerId){
        const record=await this.order.adminActor(store.ownerId);
        accountBlocked=record.status==='suspended';
      }
      if(!store.platformSuspended&&!accountBlocked)
        throw new PlatformAdminError(409,'SELLER_NOT_BLOCKED','Người bán chưa bị sàn khóa; dùng luồng xử lý đơn thông thường.');
      await new AdminApprovalService(this.order).consume(db,actor,'cancel_paid_order',id,command.approvalId);
      // This commits a cancellation intent with audit. Inventory and Payment complete it through retries.
      await db.query("UPDATE order_service.orders SET status='CANCEL_PENDING',cancellation_reason=$2,version=version+1,updated_at=now() WHERE id=$1",[id,command.reason]);
      await db.query(`INSERT INTO order_service.order_status_history(shop_order_id,from_status,to_status,actor_id,actor_type,reason,correlation_id,read_version,result_version)
        VALUES($1,$2,'CANCEL_PENDING',$3,'platform_admin',$4,$5,$6,$7)`,[id,row.status,actor.id,command.reason,key,command.version,command.version+1]);
      await db.query(`INSERT INTO order_service.order_commands(actor_id,idempotency_key,request_hash,shop_order_id) VALUES($1,$2,$3,$4)`,[actor.id,key,fingerprint,id]);
    });
    const result=await this.lifecycle.finishCancel(id,actor.id,key);
    // Lifecycle's buyer DTO contains delivery details; return only the admin command result.
    return {id,status:result.order.status,version:result.order.version,correlationId:command.requestId};
  }
}
