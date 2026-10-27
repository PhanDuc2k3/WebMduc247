import { ADMIN_ROLES, effectiveAdminAccess, normalizeScope, requireAdminScope, requireAdminPermission, permissionGrants } from '../../../../packages/contracts/admin-rbac.js';
import { PlatformAdminError, adminId, adminMutation, adminQuery } from '../../../../packages/contracts/platform-admin.js';

export async function loadAdminAccess(db,id) {
  const result=await db.query(`SELECT a.role,a.scope FROM admin_role_assignments a JOIN users u ON u.id=a.user_id
    WHERE a.user_id=$1 AND u.status='active' AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role='platform_admin') ORDER BY a.role`,[id]);
  return effectiveAdminAccess(result.rows,id);
}
export class AdminAccessService {
  constructor(repository){this.repo=repository;}
  async preview(actor,id){
    requireAdminScope(actor,'staff.read',{});adminId(id);
    const row=(await this.repo.pool.query('SELECT id,full_name,status,admin_access_version FROM users WHERE id=$1',[id])).rows[0];
    if(!row)throw new PlatformAdminError(404,'USER_NOT_FOUND','Không tìm thấy nhân viên.');
    const assignments=(await this.repo.pool.query('SELECT role,scope FROM admin_role_assignments WHERE user_id=$1 ORDER BY role',[id])).rows;
    return {id:row.id,name:row.full_name,status:row.status,version:Number(row.admin_access_version),assignments,
      access:await loadAdminAccess(this.repo.pool,id),roles:ADMIN_ROLES};
  }
  async staff(actor,query={}){
    requireAdminPermission(actor,permissionGrants(actor,'staff.read').length?'staff.read':'cases.read');
    if(Object.keys(query).some(k=>!['id','q'].includes(k)))throw new PlatformAdminError(400,'INVALID_ADMIN_FILTER','Bộ lọc nhân viên không hợp lệ.');
    const id=query.id?adminId(query.id):null,filter=adminQuery({q:query.q||''});
    const rows=(await this.repo.pool.query(`SELECT u.id,u.full_name AS name FROM users u WHERE u.status='active'
      AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role='platform_admin')
      AND EXISTS(SELECT 1 FROM admin_role_assignments a WHERE a.user_id=u.id AND ($1::boolean OR a.role IN ('operations','customer_support','moderator','finance','legacy_admin')))
      AND ($2::uuid IS NULL OR u.id=$2) AND u.full_name ILIKE $3
      ORDER BY u.full_name,u.id LIMIT 100`,[permissionGrants(actor,'staff.read').length>0,id,filter.pattern])).rows;
    return {items:rows};
  }
  async replace(actor,id,input){
    requireAdminScope(actor,'staff.update',{});id=adminId(id).toLowerCase();
    if(actor.id===id)throw new PlatformAdminError(403,'SELF_PERMISSION_CHANGE','Không tự thay đổi quyền của mình.');
    if(!input||Object.keys(input).some(k=>!['assignments','reason','version','requestId'].includes(k))||!Array.isArray(input.assignments)||input.assignments.length>8)
      throw new PlatformAdminError(400,'INVALID_ROLE_ASSIGNMENTS','Danh sách vai trò không hợp lệ.');
    const command=adminMutation(input);
    const assignments=input.assignments.map(a=>{
      if(!a||!Object.hasOwn(a,'scope')||Object.keys(a).some(k=>!['role','scope'].includes(k))||!Object.hasOwn(ADMIN_ROLES,a.role)||a.role==='legacy_admin')
        throw new PlatformAdminError(400,'INVALID_ADMIN_ROLE','Chọn vai trò nghiệp vụ; không cấp mới vai trò chuyển đổi.');
      const scope=normalizeScope(a.scope);
      if(['system_admin','content_editor','marketing','auditor'].includes(a.role)&&Object.keys(scope).length)
        throw new PlatformAdminError(400,'INVALID_ADMIN_SCOPE','Vai trò này dùng phạm vi toàn sàn.');
      return {role:a.role,scope};
    });
    if(new Set(assignments.map(a=>a.role)).size!==assignments.length)throw new PlatformAdminError(400,'DUPLICATE_ROLE','Vai trò bị lặp.');
    return this.repo.transaction(async db=>{
      // Serialize permission administration, including changes to the actor, across accounts.
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended('admin-access',0))");
      const fresh={id:actor.id,adminAccess:await loadAdminAccess(db,actor.id)};
      requireAdminScope(fresh,'staff.update',{});
      const row=(await db.query('SELECT admin_access_version FROM users WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(!row)throw new PlatformAdminError(404,'USER_NOT_FOUND','Không tìm thấy nhân viên.');
      if(Number(row.admin_access_version)!==command.version)throw new PlatformAdminError(409,'VERSION_CONFLICT','Quyền đã thay đổi; hãy tải lại.');
      const before=(await db.query('SELECT role,scope FROM admin_role_assignments WHERE user_id=$1 ORDER BY role',[id])).rows;
      await db.query('DELETE FROM admin_role_assignments WHERE user_id=$1',[id]);
      for(const a of assignments)await db.query('INSERT INTO admin_role_assignments(user_id,role,scope) VALUES($1,$2,$3)',[id,a.role,a.scope]);
      if(assignments.length)await db.query("INSERT INTO user_roles(user_id,role) VALUES($1,'platform_admin') ON CONFLICT DO NOTHING",[id]);
      else await db.query("DELETE FROM user_roles WHERE user_id=$1 AND role='platform_admin'",[id]);
      await db.query('UPDATE users SET admin_access_version=admin_access_version+1 WHERE id=$1',[id]);
      await db.query('UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',[id]);
      await db.query(`INSERT INTO admin_access_events(actor_reference,target_reference,reason,before_roles,after_roles,read_version,result_version)
        VALUES($1,$2,$3,$4,$5,$6,$7)`,[actor.id,id,command.reason,JSON.stringify(before),JSON.stringify(assignments),command.version,command.version+1]);
      await db.query("INSERT INTO security_events(user_id,action,metadata) VALUES($1,'admin_permissions_changed',$2)",[id,{actorId:actor.id,readVersion:command.version,resultVersion:command.version+1,requestId:command.requestId}]);
      return {id,version:command.version+1,access:effectiveAdminAccess(assignments,id)};
    });
  }
}
