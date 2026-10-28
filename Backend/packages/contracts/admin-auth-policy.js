import {PlatformAdminError} from './platform-admin.js';
export const ADMIN_SENSITIVE_PERMISSIONS=new Set(['stores.ownership.request','stores.ownership.approve','users.sessions.revoke','users.password_reset','users.appeals.review','privacy.execute','staff.update','approval_policy.update','mfa_recovery.approve','refunds.create','refunds.approve','refunds.execute','orders.create','orders.approve','orders.execute','returns.moderate','returns.execute','cases.approve']);
export function requireRecentAdmin(user){
  const session=user?.adminSession;
  if(!session||!Number.isFinite(Date.parse(session.reauthenticatedAt))||Date.parse(session.reauthenticatedAt)+(session.reauthSeconds||300)*1000<=Date.now())
    throw new PlatformAdminError(428,'ADMIN_REAUTH_REQUIRED','Vui lòng xác thực lại trước khi thực hiện thao tác này.');
}
