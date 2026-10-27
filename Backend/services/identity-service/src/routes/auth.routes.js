export function createAuthRoutes(controller, authMiddleware) {
  const prefix = '/api/v2/auth';
  return [
    { method: 'GET', path: '/health', handler: controller.health },
    { method: 'GET', path: `${prefix}/me`, middleware: [authMiddleware], handler: controller.me },
    { method: 'POST', path: `${prefix}/register`, handler: controller.register },
    { method: 'POST', path: `${prefix}/resend-verification`, handler: controller.resendVerification },
    { method: 'POST', path: `${prefix}/verify-email`, handler: controller.verifyEmail },
    { method: 'POST', path: `${prefix}/login`, handler: controller.login },
    { method: 'POST', path: `${prefix}/admin/login`, handler: controller.adminLogin },
    ...[
      ['mfa/enroll/start','adminEnrollStart',false],['mfa/enroll/confirm','adminEnrollConfirm',false],['mfa/verify','adminVerify',false],
      ['reauth','adminReauth',true],['activity','adminActivity',true],['sessions/revoke','adminRevokeSessions',true],
      ['mfa/rotate/start','adminRotateStart',true],['mfa/rotate/confirm','adminRotateConfirm',true],['mfa/recovery-codes','adminRecoveryCodes',true],
      ['mfa/recovery/request','adminRecoveryRequest',false],['mfa/recovery/review','adminRecoveryReview',true],
      ['passkey/options','adminPasskeyOptions',false],['passkey/verify','adminPasskeyVerify',false],
      ['passkey/register/options','adminPasskeyRegisterOptions',true],['passkey/register/verify','adminPasskeyRegisterVerify',true],['passkey/revoke','adminPasskeyRemove',true],
      ['passkey/reauth/options','adminPasskeyReauthOptions',true],['passkey/reauth/verify','adminPasskeyReauthVerify',true],
    ].map(([path,handler,authenticated])=>({method:'POST',path:`${prefix}/admin/${path}`,middleware:authenticated?[authMiddleware]:[],handler:controller[handler]})),
    ...[['sessions','adminSessions'],['security','adminSecurity'],['mfa/recovery/requests','adminRecoveries']].map(([path,handler])=>({method:'GET',path:`${prefix}/admin/${path}`,middleware:[authMiddleware],handler:controller[handler]})),
    { method: 'POST', path: `${prefix}/refresh`, handler: controller.refresh },
    { method: 'POST', path: `${prefix}/logout`, handler: controller.logout },
    { method: 'POST', path: `${prefix}/forgot-password`, handler: controller.forgotPassword },
    { method: 'POST', path: `${prefix}/reset-password`, handler: controller.resetPassword },
  ];
}
