import {permissionGrants,requireAdminScope} from './admin-rbac.js';
export function requireUserImpact(actor){
  const permission=['users.moderate','privacy.review','privacy.execute'].find(value=>permissionGrants(actor,value).length)||'users.moderate';
  requireAdminScope(actor,permission,{});
}
