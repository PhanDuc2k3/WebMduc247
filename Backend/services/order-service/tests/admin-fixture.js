// Explicit test principals for the pre-RBAC domain regression suites.
// Fine-grained legacy grants remain independently controlled by each test.
import {randomUUID} from 'node:crypto';
import {effectiveAdminAccess} from '../../../packages/contracts/admin-rbac.js';
import {casePermissionAliases} from '../src/case-contract.js';
const gated=new Set(Object.values(casePermissionAliases));
export function testAdmin(id=randomUUID()){
  const access=effectiveAdminAccess(['legacy_admin','finance','moderator'].map(role=>({role,scope:{}})),id);
  access.grants=access.grants.filter(g=>!gated.has(g.permission));access.permissions=access.permissions.filter(p=>!gated.has(p));
  return {id,roles:['platform_admin'],adminAccess:access};
}
export async function syncTestAdmin(pool,user){
  const access=testAdmin(user.id).adminAccess;
  const rows=(await pool.query('SELECT permission FROM order_service.case_permissions WHERE user_id=$1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now())',[user.id])).rows;
  for(const row of rows){const permission=casePermissionAliases[row.permission];if(permission&&!access.permissions.includes(permission)){
    access.permissions.push(permission);access.grants.push({permission,role:'explicit-test-grant',scope:{}});
  }}
  user.adminAccess=access;return user;
}
