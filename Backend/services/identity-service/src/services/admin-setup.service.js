import {requireAdminScope} from '../../../../packages/contracts/admin-rbac.js';
export class AdminSetupService {
  constructor(pool){this.pool=pool;}
  async read(actor){
    requireAdminScope(actor,'staff.read',{});
    const [roles,teams]=await Promise.all([
      this.pool.query('SELECT role,count(*)::int AS members FROM admin_role_assignments GROUP BY role ORDER BY role'),
      this.pool.query('SELECT t.id,t.name,count(m.staff_id)::int AS members FROM user_admin_teams t LEFT JOIN user_admin_team_members m ON m.team_id=t.id GROUP BY t.id,t.name ORDER BY t.id'),
    ]);
    return {roles:roles.rows,teams:teams.rows,updatedAt:new Date().toISOString(),
      canManageStaff:actor.adminAccess.permissions.includes('staff.update'),
      guidance:'Gán vai trò theo công việc qua Nhân sự & quyền. Tài khoản chỉ có legacy_admin cần operator được ủy quyền cấp vai trò khởi tạo bằng admin-roles.mjs; không tự nâng quyền qua giao diện.'};
  }
}
