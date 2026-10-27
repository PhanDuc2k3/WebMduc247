// Trusted operator bootstrap/recovery. Never an HTTP self-promotion endpoint.
import pg from 'pg';
import {ADMIN_ROLES,normalizeScope} from '../../../packages/contracts/admin-rbac.js';
import {adminId} from '../../../packages/contracts/platform-admin.js';
const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);
const input=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
const id=adminId(input.userId).toLowerCase();
if(!process.env.IDENTITY_DATABASE_URL||typeof input.operator!=='string'||input.operator.trim().length<3||
  typeof input.reason!=='string'||input.reason.trim().length<10||input.reason.length>500||!Number.isSafeInteger(input.version)||input.version<0||
  !Array.isArray(input.assignments)||input.assignments.length>8)throw Error('Provide database URL, operator, reason, current version and explicit assignments on stdin.');
const assignments=input.assignments.map(a=>{
  if(!a||!Object.hasOwn(a,'scope')||!Object.hasOwn(ADMIN_ROLES,a.role)||a.role==='legacy_admin')throw Error('Provide a supported role and an explicit scope');
  const scope=normalizeScope(a.scope);
  if(['system_admin','content_editor','marketing','auditor'].includes(a.role)&&Object.keys(scope).length)throw Error('This role requires platform scope');
  return {role:a.role,scope};
});
if(new Set(assignments.map(a=>a.role)).size!==assignments.length)throw Error('Duplicate role');
const db=new pg.Client({connectionString:process.env.IDENTITY_DATABASE_URL});await db.connect();
try{
  await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtextextended('admin-access',0))");
  const row=(await db.query('SELECT admin_access_version FROM users WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!row||Number(row.admin_access_version)!==input.version)throw Error('Account missing or version conflict');
  const before=(await db.query('SELECT role,scope FROM admin_role_assignments WHERE user_id=$1 ORDER BY role',[id])).rows;
  await db.query('DELETE FROM admin_role_assignments WHERE user_id=$1',[id]);
  for(const a of assignments)await db.query('INSERT INTO admin_role_assignments(user_id,role,scope) VALUES($1,$2,$3)',[id,a.role,a.scope]);
  if(assignments.length)await db.query("INSERT INTO user_roles(user_id,role) VALUES($1,'platform_admin') ON CONFLICT DO NOTHING",[id]);
  else await db.query("DELETE FROM user_roles WHERE user_id=$1 AND role='platform_admin'",[id]);
  await db.query('UPDATE users SET admin_access_version=admin_access_version+1 WHERE id=$1',[id]);
  await db.query('UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',[id]);
  await db.query(`INSERT INTO admin_access_events(actor_reference,target_reference,reason,before_roles,after_roles,read_version,result_version)
    VALUES($1,$2,$3,$4,$5,$6,$7)`,['operator:'+input.operator.trim(),id,input.reason.trim(),JSON.stringify(before),JSON.stringify(assignments),input.version,input.version+1]);
  await db.query("INSERT INTO security_events(user_id,action,metadata) VALUES($1,'admin_permissions_changed',$2)",[id,{operator:input.operator.trim(),readVersion:input.version,resultVersion:input.version+1}]);
  await db.query('COMMIT');process.stdout.write(JSON.stringify({userId:id,version:input.version+1})+'\n');
}catch(error){await db.query('ROLLBACK');throw error;}finally{await db.end();}
