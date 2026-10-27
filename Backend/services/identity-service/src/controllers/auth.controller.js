import { sendJson } from '../utils/http.js';
import { readRefreshCookie, setRefreshCookie, readAdminDevice, setAdminDevice } from '../middlewares/session.middleware.js';
import {randomToken} from '../utils/crypto.js';

export function createAuthController(service, config) {
  function device(req,res){const value=readAdminDevice(req)||randomToken();req.context.deviceId=value;if(!readAdminDevice(req))setAdminDevice(res,value,config);}
  function finish(res,result){const {refreshToken,...body}=result;if(refreshToken)setRefreshCookie(res,refreshToken,{...config,...(result.adminSession?{cookieMaxAgeSeconds:Math.max(0,Math.floor((Date.parse(result.adminSession.expiresAt)-Date.now())/1000))}:{})});sendJson(res,200,body);}
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
      device(req,res);
      finish(res,await service.login(req.body, req.context, { platformAdmin: true }));
    },
    adminEnrollStart:async(req,res)=>{device(req,res);finish(res,await service.adminAuth.startEnrollment(req.body.challengeToken,req.context));},
    adminEnrollConfirm:async(req,res)=>{device(req,res);finish(res,await service.adminAuth.confirmEnrollment(req.body.challengeToken,req.body.code,req.context));},
    adminVerify:async(req,res)=>{device(req,res);finish(res,await service.adminAuth.completeLogin(req.body.challengeToken,req.body,req.context));},
    adminReauth:async(req,res)=>{device(req,res);finish(res,await service.adminAuth.reauthenticate(req.auth,req.body,req.context));},
    adminActivity:async(req,res)=>finish(res,await service.adminAuth.activity(req.auth)),
    adminSecurity:async(req,res)=>finish(res,await service.adminAuth.security(req.auth)),
    adminSessions:async(req,res)=>finish(res,await service.adminAuth.sessions(req.auth)),
    adminRevokeSessions:async(req,res)=>{const result=await service.adminAuth.revokeSessions(req.auth,req.body,req.context);if(result.signedOut)setRefreshCookie(res,null,config);finish(res,result);},
    adminRotateStart:async(req,res)=>{device(req,res);finish(res,await service.adminAuth.startRotation(req.auth,req.context));},
    adminRotateConfirm:async(req,res)=>{device(req,res);finish(res,await service.adminAuth.confirmRotation(req.auth,req.body.challengeToken,req.body.code,req.context));},
    adminRecoveryCodes:async(req,res)=>{device(req,res);finish(res,await service.adminAuth.regenerateCodes(req.auth,req.context));},
    adminRecoveryRequest:async(req,res)=>{device(req,res);finish(res,await service.adminAuth.requestRecovery(req.body.challengeToken,req.body,req.context));},
    adminRecoveries:async(req,res)=>finish(res,await service.adminAuth.recoveries(req.auth)),
    adminRecoveryReview:async(req,res)=>finish(res,await service.adminAuth.reviewRecovery(req.auth,req.body,req.context)),
    adminPasskeyOptions:async(req,res)=>{device(req,res);finish(res,await service.adminPasskeys.loginOptions(req.body.challengeToken,req.context));},
    adminPasskeyVerify:async(req,res)=>{device(req,res);finish(res,await service.adminPasskeys.loginVerify(req.body.challengeToken,req.body.response,req.context));},
    adminPasskeyRegisterOptions:async(req,res)=>{device(req,res);finish(res,await service.adminPasskeys.registrationOptions(req.auth,req.body.label,req.context));},
    adminPasskeyRegisterVerify:async(req,res)=>{device(req,res);finish(res,await service.adminPasskeys.registrationVerify(req.auth,req.body.challengeToken,req.body.response,req.context));},
    adminPasskeyRemove:async(req,res)=>finish(res,await service.adminPasskeys.remove(req.auth,req.body.id,req.context)),
    adminPasskeyReauthOptions:async(req,res)=>{device(req,res);finish(res,await service.adminPasskeys.reauthOptions(req.auth,req.body.password,req.context));},
    adminPasskeyReauthVerify:async(req,res)=>{device(req,res);finish(res,await service.adminPasskeys.reauthVerify(req.auth,req.body.challengeToken,req.body.response,req.context));},
    refresh: async (req, res) => {
      try {
        finish(res,await service.refresh(readRefreshCookie(req), req.context));
      } catch (error) {
        // A revoked/expired cookie cannot recover by retrying and consumes rate limits.
        if (error.status === 401) setRefreshCookie(res, null, config);
        throw error;
      }
    },
    logout: async (req, res) => {
      let result;
      try{result = req.auth ? await service.logoutAuthorized(req.auth, req.body.allDevices === true, req.context) : await service.logoutAny(req.headers.authorization,readRefreshCookie(req),req.body.allDevices === true,req.context);}
      finally{setRefreshCookie(res, null, config);}
      sendJson(res, 200, result);
    },
    forgotPassword: async (req, res) => sendJson(res, 200, await service.forgotPassword(req.body, req.context)),
    resetPassword: async (req, res) => sendJson(res, 200, await service.resetPassword(req.body, req.context)),
    me: async (req, res) => sendJson(res, 200, service.meAuthorized(req.auth)),
  };
}
