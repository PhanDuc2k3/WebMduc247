import { PlatformAdminError, adminId, adminQuery } from '../../../packages/contracts/platform-admin.js';
import { permissionGrants, requireAdminPermission } from '../../../packages/contracts/admin-rbac.js';

export const casePermissionAliases={
  'exception.request':'refunds.create','exception.approve':'refunds.approve','case.decision.approve':'cases.approve',
  'case.appeal.review':'cases.approve','aftersales.intervene':'returns.execute','orders.cancel_blocked':'orders.execute',
};

export const caseError = (status,code,message) => new PlatformAdminError(status,code,message);
export function caseText(value,min=10,max=2000) {
  if(typeof value !== 'string' || value.trim().length<min || value.trim().length>max || /[\u0000-\u0008\u000b-\u001f\u007f]|<[^>]*>/u.test(value))
    throw caseError(400,'INVALID_CASE_INPUT',`Nội dung phải có ${min}–${max} ký tự, không chứa HTML hoặc ký tự điều khiển.`);
  return value.trim();
}
export function caseInput(input,keys) {
  if(!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key=>!keys.includes(key)))
    throw caseError(400,'INVALID_CASE_INPUT','Dữ liệu hồ sơ không hợp lệ.');
  return input;
}
export function caseVersion(version) {
  if(!Number.isSafeInteger(version) || version<1) throw caseError(400,'INVALID_CASE_VERSION','Phiên bản không hợp lệ.');
  return version;
}
export function caseDue(value,{future=true}={}) {
  if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value)) ||
    !Number.isFinite(Date.parse(value.slice(0,10))) || new Date(value.slice(0,10)).toISOString().slice(0,10)!==value.slice(0,10) ||
    (future && Date.parse(value)<=Date.now()) || Date.parse(value)>Date.now()+366*86400000)
    throw caseError(400,'INVALID_CASE_DEADLINE','Hạn xử lý phải là thời điểm hợp lệ trong tương lai, tối đa 366 ngày.');
  return new Date(value).toISOString();
}
export async function casePermission(db,userId,permission) {
  if(typeof userId==='object'){
    if(casePermissionAliases[permission])return permissionGrants(userId,casePermissionAliases[permission]).length>0;
    userId=userId.id;
  }
  return Boolean((await db.query(`SELECT 1 FROM order_service.case_permissions WHERE user_id=$1 AND permission=$2
    AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now())`,[userId,permission])).rowCount);
}
export async function requireCasePermission(db,userId,permission) {
  if(typeof userId==='object'&&casePermissionAliases[permission]){
    requireAdminPermission(userId,casePermissionAliases[permission]);return;
  }
  if(!await casePermission(db,userId,permission)) throw caseError(403,'CASE_PERMISSION_REQUIRED','Chưa được cấp quyền riêng cho thao tác này.');
}
export async function caseAudit(db,id,user,action,reason,metadata={}) {
  const result=await db.query(`INSERT INTO order_service.case_events(case_id,actor_id,action,reason,metadata)
    SELECT $1,$2,$3,$4,jsonb_build_object('observedCaseVersion',version,'workflowStatus',workflow_status)||$5::jsonb
    FROM order_service.admin_cases WHERE id=$1`,[id,user.id,action,reason,metadata]);
  if(!result.rowCount)throw caseError(409,'CASE_AUDIT_REQUIRED','Không thể ghi nhật ký cho hồ sơ không tồn tại.');
}
export async function requireEvidenceScope(db,user,id) {
  adminId(id);
  const row=(await db.query('SELECT assignee_id FROM order_service.admin_cases WHERE id=$1',[id])).rows[0];
  if(!row) throw caseError(404,'CASE_NOT_FOUND','Không tìm thấy hồ sơ.');
  if(row.assignee_id!==user.id && !await casePermission(db,user.id,'evidence.supervise'))
    throw caseError(403,'CASE_NOT_ASSIGNED','Chỉ người được phân công hoặc người có quyền giám sát mới được xem chứng cứ.');
}
export const caseStatuses={
  RETURN:['REQUESTED','UNDER_REVIEW','APPROVED','REJECTED','RETURNING','RECEIVED','REFUND_PENDING','REFUNDED','CLOSED'],
  TICKET:['NEW','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED'],
  DISPUTE:['OPEN','INVESTIGATING','AWAITING_DECISION','DECIDED','CLOSED'],
};
export function caseFilters(query={},user={}) {
  if(!query||typeof query!=='object'||Array.isArray(query)||Object.keys(query).some(key=>
    !['q','status','page','limit','kind','from','to','storeId','paymentMethod','reasonCode','assigneeId','due'].includes(key)))
    throw caseError(400,'INVALID_ADMIN_FILTER','Bộ lọc không hợp lệ.');
  const kind=query.kind||'RETURN';
  if(!Object.hasOwn(caseStatuses,kind)) throw caseError(400,'INVALID_ADMIN_FILTER','Loại hồ sơ không hợp lệ.');
  const options=adminQuery(Object.fromEntries(Object.entries(query).filter(([key])=>['q','status','page','limit'].includes(key))),{statuses:caseStatuses[kind]});
  const dates={};
  for(const key of ['from','to']){
    const value=query[key]; if(value===undefined||value==='')continue;
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.startsWith('0000-')||
      !Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)
      throw caseError(400,'INVALID_ADMIN_FILTER','Ngày lọc không hợp lệ.');
    dates[key]=value;
  }
  if(dates.from&&dates.to&&dates.from>dates.to) throw caseError(400,'INVALID_ADMIN_FILTER','Khoảng ngày không hợp lệ.');
  if(query.storeId)adminId(query.storeId);
  let assigneeId=query.assigneeId||'';
  if(assigneeId==='me')assigneeId=adminId(user.id);
  if(assigneeId&&assigneeId!=='unassigned')adminId(assigneeId);
  if(query.paymentMethod&&!['COD','MOMO','VIETQR'].includes(query.paymentMethod)||
    query.reasonCode&&!['DAMAGED','WRONG_ITEM','NOT_AS_DESCRIBED','PAYMENT','SERVICE','OTHER'].includes(query.reasonCode)||
    query.due&&!['overdue','upcoming'].includes(query.due))throw caseError(400,'INVALID_ADMIN_FILTER','Bộ lọc không hợp lệ.');
  return {...options,kind,assigneeId,storeId:query.storeId||null,paymentMethod:query.paymentMethod||'',reasonCode:query.reasonCode||'',due:query.due||'',
    from:dates.from?`${dates.from}T00:00:00+07:00`:null,
    to:dates.to?new Date(Date.parse(`${dates.to}T00:00:00+07:00`)+86400000).toISOString():null};
}
