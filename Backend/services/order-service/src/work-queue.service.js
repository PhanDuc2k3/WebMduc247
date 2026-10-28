import {adminId, adminPage, PlatformAdminError} from '../../../packages/contracts/platform-admin.js';
import {adminScopeSql, permissionGrants, requireAdminPermission, requireAdminScope} from '../../../packages/contracts/admin-rbac.js';
import {adminOrderScopeSql, requireCaseAccess} from './admin-scope.js';
import {dashboardMeta, dashboardRange} from '../../../packages/contracts/admin-dashboard.js';

const caseKinds=['RETURN','TICKET','DISPUTE'];
const permissions={ORDER:'orders.read',RETURN:'returns.read',TICKET:'cases.read',DISPUTE:'cases.read',REFUND:'refunds.read',ABUSE_REPORT:'moderation.read'};
const columns={storeIds:'w.store_id::text',caseKinds:'w.case_kind',assigneeIds:'w.assignee_id::text'};
const invalid=()=>new PlatformAdminError(400,'INVALID_WORK_FILTER','Bộ lọc hàng chờ không hợp lệ.');
export function workScope(user,args) {
  // Order visibility retains the special support rule: only orders linked to assigned cases.
  const parts=Object.entries(permissions).filter(([,permission])=>permissionGrants(user,permission).length).map(([kind,permission])=>{
    const scope=kind==='ORDER'?`EXISTS(SELECT 1 FROM order_service.orders o WHERE o.id=w.shop_order_id AND ${adminOrderScopeSql(user,permission,args)})`:
      adminScopeSql(user,permission,columns,args);
    return `(w.kind='${kind}' AND ${scope})`;
  });
  if (!parts.length) requireAdminPermission(user,'cases.read');
  return '('+parts.join(' OR ')+')';
}
export function workFilters(query={}) {
  if(Object.keys(query).some(key=>!['view','kind','team','page','limit','id'].includes(key)))throw invalid();
  const view=query.view||'all',kind=query.kind||'',team=query.team||'',page=Number(query.page??1),limit=Number(query.limit??20);
  if(!['all','mine','unassigned','overdue','needs_response','awaiting_approval'].includes(view)||kind&&!permissions[kind]||
    team&&!['operations','support','finance','moderation'].includes(team)||!Number.isSafeInteger(page)||page<1||page>10000||!Number.isSafeInteger(limit)||limit<1||limit>50)throw invalid();
  if(query.id)adminId(query.id);
  return {view,kind,team,page,limit,offset:(page-1)*limit,id:query.id||null};
}
export const workDto=row=>({id:row.id,kind:row.kind,sourceId:row.source_id,shopOrderId:row.shop_order_id,title:row.title,
  sourceStatus:row.source_status,sourceDetails:row.source_details,status:row.state,priority:row.priority,assigneeId:row.assignee_id,teamId:row.team_id,
  teamName:row.team_name,leaderId:row.leader_id,version:row.version,responseDueAt:row.response_due_at,resolutionDueAt:row.resolution_due_at,
  firstResponseAt:row.first_response_at,pausedAt:row.paused_at,pausedSeconds:Number(row.paused_seconds),escalationLevel:row.escalation_level,
  createdAt:row.created_at,sourceActive:row.source_active,responseMinutes:row.response_minutes,resolutionMinutes:row.resolution_minutes});
const overdue=`((w.first_response_at IS NULL AND w.response_due_at<now()) OR (w.paused_at IS NULL AND w.resolution_due_at<now()))`;
export class WorkQueueService {
  constructor(order){this.order=order;this.pool=order.pool;}
  async list(user,query={}) {
    const f=workFilters(query),args=[user.id,f.view,f.kind,f.team,f.id],scope=workScope(user,args);
    const where=`FROM order_service.work_items w JOIN order_service.work_teams team ON team.id=w.team_id WHERE ${scope}
      AND w.source_active AND w.state<>'RESOLVED' AND ($3='' OR w.kind=$3) AND ($4='' OR w.team_id=$4) AND ($5::uuid IS NULL OR w.id=$5)
      AND ($2='all' OR ($2='mine' AND w.assignee_id=$1::uuid) OR ($2='unassigned' AND w.assignee_id IS NULL)
        OR ($2='overdue' AND ${overdue}) OR ($2='needs_response' AND (w.first_response_at IS NULL OR w.state='WAITING_RESPONSE'))
        OR ($2='awaiting_approval' AND w.state='AWAITING_APPROVAL'))`;
    const [count,list]=await Promise.all([this.pool.query(`SELECT count(*)::int AS total ${where}`,args),
      this.pool.query(`SELECT w.*,team.name AS team_name,team.leader_id ${where}
        ORDER BY CASE w.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 ELSE 3 END,
          least(CASE WHEN w.first_response_at IS NULL THEN w.response_due_at END,CASE WHEN w.paused_at IS NULL THEN w.resolution_due_at END) NULLS LAST,w.id
        LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,f.limit,f.offset])]);
    return {...adminPage(list.rows.map(workDto),count.rows[0].total,f),updatedAt:new Date().toISOString(),timeZone:'Asia/Bangkok'};
  }
  async attention(user) {
    const args=[],scope=workScope(user,args);
    const result=await this.pool.query(`SELECT w.kind,count(*)::int AS total,
      count(*) FILTER(WHERE w.assignee_id IS NULL)::int AS unassigned,
      count(*) FILTER(WHERE ${overdue})::int AS overdue
      FROM order_service.work_items w WHERE ${scope} AND w.source_active AND w.state<>'RESOLVED' GROUP BY w.kind`,args);
    const health=await this.pool.query('SELECT * FROM order_service.work_source_health');
    const visibleSources=new Set(['orders','cases']);
    if(permissionGrants(user,'refunds.read').length)visibleSources.add('payment');
    if(permissionGrants(user,'moderation.read').length)visibleSources.add('chat');
    return {items:result.rows,health:health.rows.filter(row=>visibleSources.has(row.source)).map(row=>({source:row.source,updatedAt:row.updated_at,errorCode:row.error_code,
      delayed:!row.updated_at||Date.now()-new Date(row.updated_at).getTime()>120000})),updatedAt:new Date().toISOString()};
  }
  async detail(user,id) {
    adminId(id);const args=[id],scope=workScope(user,args);
    const row=(await this.pool.query(`SELECT w.*,team.name AS team_name,team.leader_id FROM order_service.work_items w
      JOIN order_service.work_teams team ON team.id=w.team_id WHERE w.id=$1 AND ${scope}`,args)).rows[0];
    if(!row)throw new PlatformAdminError(404,'WORK_NOT_FOUND','Không tìm thấy công việc trong phạm vi được giao.');
    const events=await this.pool.query('SELECT id,actor_id,action,reason,metadata,created_at FROM order_service.work_events WHERE work_id=$1 ORDER BY id DESC LIMIT 100',[id]);
    return {record:workDto(row),events:events.rows};
  }
  async action(user,id,input) {
    requireAdminPermission(user,'work_queue.update');adminId(id);
    if(!input||Object.keys(input).some(k=>!['action','version','assigneeId','teamId','reason','status','priority'].includes(k))||
      !['claim','assign','transfer','respond','status','priority'].includes(input.action)||!Number.isSafeInteger(input.version)||input.version<1||
      typeof input.reason!=='string'||input.reason.trim().length<10||input.reason.length>500||/[\u0000-\u001f\u007f]/.test(input.reason))throw invalid();
    const initial=(await this.detail(user,id)).record;
    // Evaluate mutation scopes against the persisted task, never client supplied scope fields.
    const updateArgs=[id],updateScope=adminScopeSql(user,'work_queue.update',columns,updateArgs);
    if(!(await this.pool.query(`SELECT w.id FROM order_service.work_items w WHERE w.id=$1 AND ${updateScope}`,updateArgs)).rowCount)
      throw new PlatformAdminError(403,'ADMIN_SCOPE_REQUIRED','Công việc nằm ngoài phạm vi được giao.');
    if(['assign','transfer'].includes(input.action))requireAdminPermission(user,'work_queue.manage');
    if(input.action==='assign'&&input.assigneeId!==null) {
      adminId(input.assigneeId);
      const target=await this.order.adminActor(input.assigneeId);
      if(target.status!=='active')throw new PlatformAdminError(400,'INVALID_ASSIGNEE','Nhân sự không hoạt động.');
      const record=(await this.pool.query('SELECT store_id,case_kind FROM order_service.work_items WHERE id=$1',[id])).rows[0];
      requireAdminScope(target,'work_queue.update',{storeId:record.store_id,caseKind:record.case_kind,assigneeId:target.id});
      requireAdminScope(target,permissions[initial.kind],{storeId:record.store_id,caseKind:record.case_kind,assigneeId:target.id});
    }
    if(input.action==='transfer'&&!['operations','support','finance','moderation'].includes(input.teamId))throw invalid();
    if(input.action==='transfer'){
      const team=(await this.pool.query('SELECT leader_id FROM order_service.work_teams WHERE id=$1',[input.teamId])).rows[0];
      if(team?.leader_id){const leader=await this.order.adminActor(team.leader_id);
        const record=(await this.pool.query('SELECT store_id,case_kind,assignee_id FROM order_service.work_items WHERE id=$1',[id])).rows[0];
        if(leader.status!=='active')throw new PlatformAdminError(409,'TEAM_LEADER_UNAVAILABLE','Trưởng nhóm nhận không hoạt động.');
        requireAdminScope(leader,permissions[initial.kind],{storeId:record.store_id,caseKind:record.case_kind,assigneeId:record.assignee_id});
      }
    }
    if(input.action==='status'&&!['IN_PROGRESS','WAITING_RESPONSE','AWAITING_APPROVAL','RESOLVED'].includes(input.status))throw invalid();
    if(input.action==='priority'&&!['URGENT','HIGH','NORMAL','LOW'].includes(input.priority))throw invalid();
    return this.order.transaction(async db=>{
      if(caseKinds.includes(initial.kind))await db.query('SELECT id FROM order_service.admin_cases WHERE id=$1 FOR UPDATE',[initial.sourceId]);
      const args=[id],scope=workScope(user,args);
      const row=(await db.query(`SELECT w.* FROM order_service.work_items w WHERE w.id=$1 AND ${scope} FOR UPDATE`,args)).rows[0];
      if(!row)throw new PlatformAdminError(404,'WORK_NOT_FOUND','Công việc không còn khả dụng.');
      if(row.version!==input.version)throw new PlatformAdminError(409,'WORK_CONFLICT','Công việc đã được người khác cập nhật hoặc nhận. Hãy tải lại.');
      requireAdminScope(user,'work_queue.update',{storeId:row.store_id,caseKind:row.case_kind,assigneeId:row.assignee_id});
      if(!row.source_active||row.state==='RESOLVED')throw new PlatformAdminError(409,'WORK_CLOSED','Công việc đã kết thúc.');
      if(input.action==='claim'&&row.assignee_id&&row.assignee_id!==user.id)throw new PlatformAdminError(409,'WORK_ALREADY_CLAIMED','Công việc đã có người nhận.');
      if(['assign','transfer'].includes(input.action))requireAdminScope(user,'work_queue.manage',{storeId:row.store_id,caseKind:row.case_kind,assigneeId:row.assignee_id});
      else if(row.assignee_id!==user.id&&input.action!=='claim')requireAdminScope(user,'work_queue.manage',{storeId:row.store_id,caseKind:row.case_kind,assigneeId:row.assignee_id});
      if(input.action==='status'&&input.status==='RESOLVED'&&row.kind!=='ABUSE_REPORT')throw new PlatformAdminError(409,'SOURCE_WORKFLOW_REQUIRED','Hoàn tất công việc tại luồng nghiệp vụ của đối tượng.');
      if(caseKinds.includes(row.kind)&&['claim','assign','transfer'].includes(input.action)) {
        await requireCaseAccess(db,user,'cases.update',row.source_id);
        const assignee=input.action==='claim'?user.id:input.action==='assign'?input.assigneeId:null;
        await db.query('UPDATE order_service.admin_cases SET assignee_id=$2,version=version+1,updated_at=now() WHERE id=$1',[row.source_id,assignee]);
        await db.query(`INSERT INTO order_service.case_events(case_id,actor_id,action,reason,metadata) VALUES($1,$2,'queue_assignment',$3,$4)`,[row.source_id,user.id,input.reason,{teamId:input.teamId,assigneeId:assignee}]);
        await db.query('DELETE FROM order_service.case_evidence_grants WHERE case_id=$1',[row.source_id]);
        await db.query('DELETE FROM order_service.case_resolution_grants WHERE case_id=$1',[row.source_id]);
      }
      const sets={claim:'assignee_id=$2',assign:'assignee_id=$2',transfer:'team_id=$2,assignee_id=NULL',
        respond:"first_response_at=coalesce(first_response_at,now()),state='IN_PROGRESS'",status:'state=$2',priority:'priority=$2'};
      const value=input.action==='claim'?user.id:input.action==='assign'?input.assigneeId:input.action==='transfer'?input.teamId:input.action==='status'?input.status:input.priority;
      const updated=await db.query(`UPDATE order_service.work_items SET ${sets[input.action]} WHERE id=$1 RETURNING *`,input.action==='respond'?[id]:[id,value]);
      await db.query('INSERT INTO order_service.work_events(work_id,actor_id,action,reason,metadata) VALUES($1,$2,$3,$4,$5)',
        [id,user.id,input.action,input.reason.trim(),{before:workDto(row),after:workDto(updated.rows[0])}]);
      return {id,version:updated.rows[0].version};
    });
  }
  async settings(user) {
    const args=[];workScope(user,args);
    const [policies,teams]=await Promise.all([this.pool.query('SELECT * FROM order_service.work_sla_policies ORDER BY kind'),this.pool.query('SELECT * FROM order_service.work_teams ORDER BY id')]);
    return {policies:policies.rows,teams:teams.rows,pauseRule:'Chỉ đồng hồ giải quyết tạm dừng ở trạng thái chờ phản hồi. Đồng hồ phản hồi chạy đến khi ghi nhận phản hồi đầu tiên. Hạn được cộng thời gian tạm dừng khi tiếp tục.'};
  }
  async updateSettings(user,kind,input) {
    requireAdminScope(user,'work_queue.manage',{});
    if(!permissions[kind]||!input||Object.keys(input).some(k=>!['version','responseMinutes','resolutionMinutes','reminderMinutes','leaderId','reason'].includes(k))||
      !Number.isSafeInteger(input.version)||!Number.isSafeInteger(input.responseMinutes)||input.responseMinutes<1||input.responseMinutes>525600||
      !Number.isSafeInteger(input.resolutionMinutes)||input.resolutionMinutes<input.responseMinutes||input.resolutionMinutes>525600||
      !Number.isSafeInteger(input.reminderMinutes)||input.reminderMinutes<0||input.reminderMinutes>10080||typeof input.reason!=='string'||input.reason.trim().length<10||input.reason.length>500)throw invalid();
    requireAdminScope(user,permissions[kind],{});
    if(input.leaderId!==null){adminId(input.leaderId);const target=await this.order.adminActor(input.leaderId);
      if(target.status!=='active')throw invalid();requireAdminScope(target,'work_queue.manage',{});requireAdminScope(target,permissions[kind],{});}
    return this.order.transaction(async db=>{
      const result=await db.query(`UPDATE order_service.work_sla_policies SET response_minutes=$2,resolution_minutes=$3,reminder_minutes=$4,version=version+1
        WHERE kind=$1 AND version=$5 RETURNING *`,[kind,input.responseMinutes,input.resolutionMinutes,input.reminderMinutes,input.version]);
      if(!result.rowCount)throw new PlatformAdminError(409,'WORK_CONFLICT','Quy tắc SLA đã thay đổi.');
      await db.query('UPDATE order_service.work_teams SET leader_id=$2 WHERE id=$1',[result.rows[0].team_id,input.leaderId]);
      await db.query(`INSERT INTO order_service.work_config_events(actor_id,kind,reason,payload) VALUES($1,$2,$3,$4)`,[user.id,kind,input.reason,input]);
      return {version:result.rows[0].version};
    });
  }
  async notifications(user) {
    const args=[user.id],scope=workScope(user,args);
    const {rows}=await this.pool.query(`SELECT n.id,n.work_id,n.milestone,n.due_at,n.created_at,n.read_at,w.title FROM order_service.work_notifications n
      JOIN order_service.work_items w ON w.id=n.work_id WHERE n.recipient_id=$1 AND ${scope} ORDER BY n.created_at DESC,n.id DESC LIMIT 50`,args);
    return {items:rows};
  }
  async markRead(user,id) {if(!/^\d{1,20}$/.test(id))throw invalid();await this.pool.query('UPDATE order_service.work_notifications SET read_at=coalesce(read_at,now()) WHERE id=$1 AND recipient_id=$2',[id,user.id]);return {ok:true};}
}
