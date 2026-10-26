import { sendJson } from '../utils/http.js';
import { readRefreshCookie, setRefreshCookie } from '../middlewares/session.middleware.js';

export function createAuthController(service, config) {
  return {
    health: async (_req, res) => sendJson(res, 200, { status: 'ok' }),
    register: async (req, res) => sendJson(res, 201, await service.register(req.body, req.context)),
    resendVerification: async (req, res) => sendJson(res, 200, await service.resendVerification(req.body, req.context)),
    verifyEmail: async (req, res) => sendJson(res, 200, await service.verifyEmail(req.body, req.context)),
    login: async (req, res) => {
      const { refreshToken, ...result } = await service.login(req.body, req.context);
      setRefreshCookie(res, refreshToken, config);
      sendJson(res, 200, result);
    },
    adminLogin: async (req, res) => {
      const { refreshToken, ...result } = await service.login(req.body, req.context, { platformAdmin: true });
      setRefreshCookie(res, refreshToken, config);
      sendJson(res, 200, result);
    },
    refresh: async (req, res) => {
      try {
        const { refreshToken, ...result } = await service.refresh(readRefreshCookie(req), req.context);
        setRefreshCookie(res, refreshToken, config);
        sendJson(res, 200, result);
      } catch (error) {
        // A revoked/expired cookie cannot recover by retrying and consumes rate limits.
        if (error.status === 401) setRefreshCookie(res, null, config);
        throw error;
      }
    },
    logout: async (req, res) => {
      const result = await service.logoutAuthorized(req.auth, req.body.allDevices === true, req.context);
      setRefreshCookie(res, null, config);
      sendJson(res, 200, result);
    },
    forgotPassword: async (req, res) => sendJson(res, 200, await service.forgotPassword(req.body, req.context)),
    resetPassword: async (req, res) => sendJson(res, 200, await service.resetPassword(req.body, req.context)),
    me: async (req, res) => sendJson(res, 200, service.meAuthorized(req.auth)),
  };
}
