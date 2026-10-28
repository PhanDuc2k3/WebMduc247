import {adminMutation,PlatformAdminError} from '../../../../packages/contracts/platform-admin.js';
import {USER_ADMIN_POLICY} from './user-admin-policy.js';
export const USER_REASON_CODES={ABUSE:'Lạm dụng dịch vụ',FRAUD:'Gian lận',PROHIBITED_CONTENT:'Nội dung vi phạm',PAYMENT_ABUSE:'Lạm dụng thanh toán',SECURITY_RISK:'Bảo vệ an toàn tài khoản',OTHER:'Lý do khác',APPEAL_ACCEPTED:'Chấp nhận kháng nghị',REMEDIATED:'Đã khắc phục',REVIEW_CORRECTION:'Điều chỉnh sau rà soát',TEMPORARY_EXPIRED:'Hết hạn khóa tạm thời',LEGACY:'Quyết định cũ chưa phân loại lý do'};
export const invalidUser=()=>new PlatformAdminError(400,'INVALID_USER_COMMAND','Dữ liệu yêu cầu quản lý tài khoản không hợp lệ.');
export function strictInput(input,fields){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!fields.includes(key)))throw invalidUser();return input;}
export function userText(value,min=10,max=2000){if(typeof value!=='string'||value.trim().length<min||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw invalidUser();return value.trim();}
export function userFullName(value){const name=userText(value,2,120);if(!/^[\p{L}\p{M}\p{N} .'-]+$/u.test(name))throw invalidUser();return name;}
export function userCommand(input,fields=[]){strictInput(input,['version','reason','requestId',...fields]);return {...input,...adminMutation(input)};}
export function moderationInput(input){
  const command=userCommand(input,['action','reasonCode','restrictionScope','expiresAt','impactConfirmed']);
  if(!['suspend','restore'].includes(input.action))throw invalidUser();
  const reasonCode=input.reasonCode||'OTHER',restrictionScope=input.restrictionScope||'ACCOUNT';
  if(!Object.hasOwn(USER_REASON_CODES,reasonCode)||restrictionScope!=='ACCOUNT'||input.impactConfirmed!==undefined&&input.impactConfirmed!==true)throw invalidUser();
  if(input.action==='suspend'&&!['ABUSE','FRAUD','PROHIBITED_CONTENT','PAYMENT_ABUSE','SECURITY_RISK','OTHER'].includes(reasonCode)||input.action==='restore'&&!['REMEDIATED','REVIEW_CORRECTION','OTHER'].includes(reasonCode))throw invalidUser();
  let expiresAt=null;if(input.expiresAt){expiresAt=new Date(input.expiresAt);if(input.action!=='suspend'||!Number.isFinite(expiresAt.getTime())||expiresAt<=new Date()||expiresAt.getTime()>Date.now()+USER_ADMIN_POLICY.temporaryMaxDays*86400000)throw invalidUser();expiresAt=expiresAt.toISOString();}
  return {...command,reasonCode,restrictionScope,expiresAt};
}
export async function userEvent(db,userId,actor,action,reason,metadata={},requestId=null){
  const result=await db.query(`INSERT INTO user_admin_events(user_reference,actor_reference,action,reason,metadata,request_id) VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(actor_reference,request_id,action) WHERE request_id IS NOT NULL DO NOTHING RETURNING id`,[userId,actor?.id||null,action,reason,metadata,requestId]);
  if(!result.rowCount&&requestId&&actor?.id){const previous=(await db.query('SELECT user_reference,reason FROM user_admin_events WHERE actor_reference=$1 AND request_id=$2 AND action=$3',[actor.id,requestId,action])).rows[0];if(previous?.user_reference!==userId||previous?.reason!==reason)throw new PlatformAdminError(409,'IDEMPOTENCY_CONFLICT','Mã ghi nhận đã dùng cho đối tượng hoặc lý do khác.');}
  return result;
}
