import {requireAdminScope} from '../../../../packages/contracts/admin-rbac.js';
import {adminId, adminQuery, adminPage, adminAction, checkAdminVersion, PlatformAdminError} from '../../../../packages/contracts/platform-admin.js';
import {adminCommand} from '../../../../packages/contracts/admin-command.js';
import {maskEmail, maskName} from '../../../../packages/contracts/admin-privacy.js';

const userDto = row => ({ id: row.id, email: maskEmail(row.email), fullName: maskName(row.full_name), status: row.status,
  roles: row.roles, emailVerifiedAt: row.email_verified_at, createdAt: row.created_at, version: Number(row.admin_version) });
const columns = `u.id,u.email,u.full_name,u.status,u.email_verified_at,u.created_at,u.admin_version,
  ARRAY(SELECT role FROM user_roles r WHERE r.user_id=u.id ORDER BY role) AS roles`;

export class IdentityAdminService {
  constructor(repository) { this.repo = repository; }
  async summary(user) {
    requireAdminScope(user,'users.read',{});
    const { rows } = await this.repo.pool.query(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE status='active')::int AS active,
      count(*) FILTER (WHERE status='suspended')::int AS suspended,
      count(*) FILTER (WHERE status='pending_verification')::int AS pending,
      count(*) FILTER (WHERE created_at>=now()-interval '7 days')::int AS new_week FROM users`);
    return { users: { total: rows[0].total, active: rows[0].active, suspended: rows[0].suspended,
      pending: rows[0].pending, newWeek: rows[0].new_week } };
  }
  async list(user, query) {
    requireAdminScope(user,'users.read',{});
    const options = adminQuery(query, { statuses: ['active','suspended','pending_verification'], roles: ['buyer','seller','platform_admin'] });
    const where = `WHERE (u.full_name ILIKE $1 OR u.email ILIKE $1) AND ($2='' OR u.status=$2)
      AND ($3='' OR EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role=$3))`;
    const args = [options.pattern, options.status, options.role];
    const [count, list] = await Promise.all([
      this.repo.pool.query(`SELECT count(*)::int AS total FROM users u ${where}`, args),
      this.repo.pool.query(`SELECT ${columns} FROM users u ${where} ORDER BY u.created_at DESC,u.id DESC LIMIT $4 OFFSET $5`,
        [...args, options.limit, options.offset]),
    ]);
    return adminPage(list.rows.map(userDto), count.rows[0].total, options);
  }
  async detail(user, id) {
    requireAdminScope(user,'users.read',{}); adminId(id);
    const { rows } = await this.repo.pool.query(`SELECT ${columns} FROM users u WHERE u.id=$1`, [id]);
    if (!rows[0]) throw new PlatformAdminError(404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản.');
    const history = await this.repo.pool.query(`SELECT a.id,coalesce(a.actor_id,a.actor_reference) AS actor_id,a.action,a.previous_status,a.next_status,a.reason,a.created_at,a.read_version,a.result_version,a.correlation_id,
      actor.full_name AS actor_name FROM platform_admin_actions a LEFT JOIN users actor ON actor.id=a.actor_id
      WHERE a.target_id=$1 ORDER BY a.created_at DESC,a.id DESC LIMIT 30`, [id]);
    return { record: userDto(rows[0]), history: history.rows };
  }
  async moderate(actor, id, input) {
    requireAdminScope(actor,'users.moderate',{}); adminId(id); const action = adminAction(input);
    if (actor.id === id.toLowerCase()) throw new PlatformAdminError(409, 'ADMIN_PROTECTED', 'Bạn không thể thay đổi trạng thái tài khoản đang dùng.');
    return this.repo.transaction(db => adminCommand(db, 'public', actor, `users:${id}:status`, action, async () => {
      const { rows } = await db.query(`SELECT u.id,u.status,u.email_verified_at,u.admin_version,
        EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role='platform_admin') AS is_admin
        FROM users u WHERE u.id=$1 FOR UPDATE OF u`, [id]);
      const row = rows[0];
      if (!row) throw new PlatformAdminError(404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản.');
      if (row.is_admin) throw new PlatformAdminError(409, 'ADMIN_PROTECTED', 'Tài khoản quản trị được bảo vệ; hãy dùng quy trình cấp quyền riêng.');
      checkAdminVersion(row, action);
      if (action.action === 'suspend' ? row.status === 'suspended' : row.status !== 'suspended')
        throw new PlatformAdminError(409, 'INVALID_TRANSITION', 'Thao tác không phù hợp với trạng thái hiện tại.');
      const status = action.action === 'suspend' ? 'suspended' : row.email_verified_at ? 'active' : 'pending_verification';
      await db.query('UPDATE users SET status=$2,admin_version=admin_version+1,updated_at=now() WHERE id=$1', [id,status]);
      if (status === 'suspended') await db.query('UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [id]);
      await db.query(`INSERT INTO platform_admin_actions(actor_id,actor_reference,target_id,action,previous_status,next_status,reason,read_version,result_version,correlation_id)
        VALUES ($1,$1,$2,$3,$4,$5,$6,$7,$8,$9)`, [actor.id,id,action.action,row.status,status,action.reason,action.version,action.version+1,action.requestId]);
      return { id, status, version: Number(row.admin_version)+1 };
    }));
  }
  async audit(user, query) {
    requireAdminScope(user,'audit.read',{}); const options = adminQuery(query);
    const args = [options.pattern];
    const from = `FROM platform_admin_actions a LEFT JOIN users actor ON actor.id=a.actor_id LEFT JOIN users target ON target.id=a.target_id
      WHERE (coalesce(target.email,'') ILIKE $1 OR a.reason ILIKE $1 OR a.target_id::text ILIKE $1)`;
    const [count,list] = await Promise.all([
      this.repo.pool.query(`SELECT count(*)::int AS total ${from}`,args),
      this.repo.pool.query(`SELECT a.*,actor.full_name AS actor_name,target.email AS target_name ${from}
        ORDER BY a.created_at DESC,a.id DESC LIMIT $2 OFFSET $3`,[...args,options.limit,options.offset]),
    ]);
    return adminPage(list.rows.map(row => ({...row,actor_id:row.actor_id||row.actor_reference,target_name:maskEmail(row.target_name),target_type:'user'})),count.rows[0].total,options);
  }
}
