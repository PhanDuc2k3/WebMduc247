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
    { method: 'POST', path: `${prefix}/refresh`, handler: controller.refresh },
    { method: 'POST', path: `${prefix}/logout`, middleware: [authMiddleware], handler: controller.logout },
    { method: 'POST', path: `${prefix}/forgot-password`, handler: controller.forgotPassword },
    { method: 'POST', path: `${prefix}/reset-password`, handler: controller.resetPassword },
  ];
}
