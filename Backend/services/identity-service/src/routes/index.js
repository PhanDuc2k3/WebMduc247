import { timingSafeEqual } from 'node:crypto';
import { createAuthController } from '../controllers/auth.controller.js';
import { createProfileController } from '../controllers/profile.controller.js';
import { requireSession } from '../middlewares/auth.middleware.js';
import { sendError } from '../middlewares/error.middleware.js';
import { applyCors, attachRequestContext, parseAvatarBody, parseJsonBody, requireOrigin } from '../middlewares/request.middleware.js';
import { HttpError } from '../utils/errors.js';
import { sendJson } from '../utils/http.js';
import { createAuthRoutes } from './auth.routes.js';
import { createProfileRoutes } from './profile.routes.js';
import { IdentityAdminService } from '../services/platform-admin.service.js';
import { AdminAccessService, loadAdminAccess } from '../services/admin-access.service.js';

export function createRequestHandler(service, profileService, config) {
  const controller = createAuthController(service, config);
  const authMiddleware = requireSession(service);
  const admin = new IdentityAdminService(service.repo);
  const access = new AdminAccessService(service.repo);
  const routes = [...createAuthRoutes(controller, authMiddleware), ...createProfileRoutes(createProfileController(profileService), authMiddleware),
    {method:'GET',path:'/api/v2/admin/staff',middleware:[authMiddleware],handler:async(req,res)=>sendJson(res,200,await access.staff(req.auth.user,Object.fromEntries(new URL(req.url,'http://localhost').searchParams)))},
    {method:'GET',path:/^\/api\/v2\/admin\/staff\/([0-9a-f-]{36})\/access$/i,middleware:[authMiddleware],handler:async(req,res)=>sendJson(res,200,await access.preview(req.auth.user,req.params.id))},
    {method:'PUT',path:/^\/api\/v2\/admin\/staff\/([0-9a-f-]{36})\/access$/i,middleware:[authMiddleware],handler:async(req,res)=>sendJson(res,200,await access.replace(req.auth.user,req.params.id,req.body))},
    {method:'GET',path:'/api/v2/admin/identity/summary',middleware:[authMiddleware],handler:async(req,res)=>sendJson(res,200,await admin.summary(req.auth.user))},
    {method:'GET',path:'/api/v2/admin/users',middleware:[authMiddleware],handler:async(req,res)=>sendJson(res,200,await admin.list(req.auth.user,Object.fromEntries(new URL(req.url,'http://localhost').searchParams)))},
    {method:'GET',path:'/api/v2/admin/audit',middleware:[authMiddleware],handler:async(req,res)=>sendJson(res,200,await admin.audit(req.auth.user,Object.fromEntries(new URL(req.url,'http://localhost').searchParams)))},
    {method:'GET',path:/^\/api\/v2\/admin\/users\/([0-9a-f-]{36})$/i,middleware:[authMiddleware],handler:async(req,res)=>sendJson(res,200,await admin.detail(req.auth.user,req.params.id))},
    {method:'PATCH',path:/^\/api\/v2\/admin\/users\/([0-9a-f-]{36})\/status$/i,middleware:[authMiddleware],handler:async(req,res)=>sendJson(res,200,await admin.moderate(req.auth.user,req.params.id,req.body))},
  ];
  return async (req, res) => {
    if (applyCors(req, res, config)) return;
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      const adminActor=/^\/api\/v2\/internal\/admin-authorization\/([0-9a-f-]{36})$/i.exec(path);
      if(req.method==='GET'&&adminActor){
        const expected=Buffer.from(config.adminAuthorizationToken||'');
        const actual=Buffer.from(String(req.headers['x-admin-authorization-token']||''));
        if(!expected.length||expected.length!==actual.length||!timingSafeEqual(expected,actual))
          throw new HttpError(403,'FORBIDDEN','Không có quyền xác thực nội bộ.');
        const account=(await service.repo.pool.query('SELECT status FROM users WHERE id=$1',[adminActor[1]])).rows[0];
        return sendJson(res,200,{user:{id:adminActor[1].toLowerCase(),status:account?.status||'deleted',adminAccess:await loadAdminAccess(service.repo.pool,adminActor[1])}});
      }
      const notificationRecipient=/^\/api\/v2\/internal\/notification\/users\/([0-9a-f-]{36})$/i.exec(path);
      if(req.method==='GET'&&notificationRecipient){
        const expected=Buffer.from(config.notificationIdentityToken||'');
        const actual=Buffer.from(String(req.headers['x-notification-identity-token']||''));
        if(!expected.length||expected.length!==actual.length||!timingSafeEqual(expected,actual))
          throw new HttpError(403,'FORBIDDEN','Không có quyền với thông báo nội bộ.');
        const row=await profileService.repo.profile(notificationRecipient[1]);
        if(!row)throw new HttpError(404,'USER_NOT_FOUND','Không tìm thấy tài khoản.');
        return sendJson(res,200,{userId:row.id,email:row.email,status:row.status,
          marketingOptIn:Boolean(row.marketing_opt_in)});
      }
      if (req.method === 'POST' && path === '/api/v2/internal/store-membership') {
        const expected = Buffer.from(config.catalogSyncSecret || '');
        const actual = Buffer.from(String(req.headers['x-catalog-secret'] || ''));
        if (!expected.length || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
          throw new HttpError(403, 'FORBIDDEN', 'Không có quyền đồng bộ cửa hàng.');
        }
        await parseJsonBody(req);
        const { userId, storeId, active } = req.body;
        const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!validId.test(userId) || !validId.test(storeId) || typeof active !== 'boolean' || Object.keys(req.body).length !== 3) {
          throw new HttpError(400, 'INVALID_REQUEST', 'Dữ liệu không hợp lệ.');
        }
        if (!(await service.repo.syncStoreMembership(userId, storeId, active))) {
          throw new HttpError(404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản.');
        }
        return sendJson(res, 200, { synced: true });
      }
      requireOrigin(req, config);
      const route = routes.find(item => item.method === req.method && (typeof item.path === 'string' ? item.path === path : item.path.test(path)));
      if (!route) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy API.');
      if (route.path instanceof RegExp) req.params = { id: route.path.exec(path)[1] };
      if (route.bodyType === 'binary') await parseAvatarBody(req);
      else if (['POST', 'PATCH', 'PUT'].includes(req.method)) await parseJsonBody(req);
      attachRequestContext(req, config);
      for (const middleware of route.middleware || []) await middleware(req, res);
      await route.handler(req, res);
    } catch (error) { sendError(res, error); }
  };
}
