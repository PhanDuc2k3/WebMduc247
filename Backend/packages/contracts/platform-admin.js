export class PlatformAdminError extends Error {
  constructor(status, code, message) { super(message); Object.assign(this, { status, code }); }
}
export function requirePlatformAdmin(user) {
  if (!user?.id) throw new PlatformAdminError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
  if (!user.adminAccess?.grants?.length)
    throw new PlatformAdminError(403, 'PLATFORM_ADMIN_REQUIRED', 'Tài khoản không có quyền quản trị sàn.');
  return user;
}
export const adminId = value => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    throw new PlatformAdminError(400, 'INVALID_ID', 'Mã đối tượng không hợp lệ.');
  return value;
};
export function adminQuery(query = {}, { statuses = [], roles = [], kinds = [] } = {}) {
  const fail = () => new PlatformAdminError(400, 'INVALID_ADMIN_FILTER', 'Bộ lọc không hợp lệ.');
  if (!query || Object.keys(query).some(key => !['q','status','role','kind','page','limit','from','to','statusGroup','excludeCancelled','ownerId','buyerId','storeId'].includes(key))) throw fail();
  if(query.ownerId)adminId(query.ownerId);if(query.buyerId)adminId(query.buyerId);if(query.storeId)adminId(query.storeId);
  if (query.statusGroup && !['pending','delivered','cancelled','other'].includes(query.statusGroup) || query.excludeCancelled && query.excludeCancelled !== 'true') throw fail();
  const q = query.q ?? '', status = query.status ?? '', role = query.role ?? '', kind = query.kind ?? '';
  if (typeof q !== 'string' || q.length > 100 || /[\u0000-\u001f\u007f]/.test(q) ||
    typeof status !== 'string' || status && !statuses.includes(status) || typeof role !== 'string' || role && !roles.includes(role) ||
    typeof kind !== 'string' || kind && !kinds.includes(kind)) throw fail();
  const page = Number(query.page ?? 1), limit = Number(query.limit ?? 12);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) throw fail();
  return { q: q.trim(), pattern: `%${q.trim().replace(/[\\%_]/g, '\\$&')}%`, status, role, kind, page, limit, offset: (page - 1) * limit };
}
export const adminPage = (items, total, options) => ({ items, total: Number(total), page: options.page,
  limit: options.limit, totalPages: Math.ceil(Number(total) / options.limit) });
export function adminAction(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['action','reason','version','requestId'].includes(key)) ||
    !['suspend','restore'].includes(input.action) || typeof input.reason !== 'string' || input.reason.trim().length < 8 || input.reason.length > 500 ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(input.reason) || !Number.isSafeInteger(input.version) || input.version < 0)
    throw new PlatformAdminError(400, 'INVALID_ADMIN_ACTION', 'Nhập thao tác, phiên bản hiện tại và lý do từ 8 đến 500 ký tự.');
  return { action: input.action, ...adminMutation(input) };
}
export function adminMutation(input) {
  if (!input || !Number.isSafeInteger(input.version) || input.version < 0 || typeof input.reason !== 'string' ||
    input.reason.trim().length < 8 || input.reason.length > 500 || /[\u0000-\u001f\u007f]/.test(input.reason))
    throw new PlatformAdminError(400, 'INVALID_ADMIN_ACTION', 'Nhập phiên bản hiện tại và lý do từ 8 đến 500 ký tự.');
  if (typeof input.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.requestId))
    throw new PlatformAdminError(400, 'INVALID_REQUEST_ID', 'Mã yêu cầu chống lặp không hợp lệ.');
  return { reason: input.reason.trim(), version: input.version, requestId: input.requestId.toLowerCase() };
}
export function checkAdminVersion(row, input) {
  if (Number(row.admin_version) !== input.version)
    throw new PlatformAdminError(409, 'VERSION_CONFLICT', 'Dữ liệu đã thay đổi. Hãy tải lại chi tiết trước khi thao tác.');
}
export function adminMoney(value) {
  // The current VND contract uses whole dong, including fields named *Minor.
  if (value === null || value === undefined || value === '' || !['number','string'].includes(typeof value) ||
    typeof value === 'string' && !/^\d+$/.test(value))
    throw new PlatformAdminError(503, 'INVALID_SOURCE_AMOUNT', 'Dữ liệu tiền từ nguồn chưa hợp lệ.');
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new PlatformAdminError(503, 'INVALID_SOURCE_AMOUNT', 'Dữ liệu tiền từ nguồn vượt giới hạn xử lý.');
  return amount;
}
