import {identityApi,identityAuthorizedRequest,acceptAdminSession,updateAdminSessionInfo,type AdminSessionInfo,type AdminLoginResult} from './identityApi';
import type {PublicKeyCredentialCreationOptionsJSON,PublicKeyCredentialRequestOptionsJSON} from '@simplewebauthn/browser';
export type AdminSecurity={recoveryCodesRemaining:number;passkeysEnabled:boolean;passkeys:{id:string;label:string;created_at:string;last_used_at:string|null}[];
  events:{id:string;action:string;ip:string;user_agent:string;occurred_at:string}[];policy:{absoluteSeconds:number;idleSeconds:number;reauthSeconds:number};adminSession:AdminSessionInfo};
export type AdminDeviceSession={family_id:string;device:string;ip:string;created_at:string;last_activity_at:string;expires_at:string;method:string;current:boolean;revoked:boolean};
export type MfaRecoveryRequest={id:string;user_id:string;full_name:string;evidence_reference:string;reason:string;status:string;version:number;created_at:string};
const call=<T>(path:string,body?:unknown)=>identityAuthorizedRequest<T>('/auth/admin/'+path,body===undefined?{}:{method:'POST',body});
export const adminSecurityApi={
  security:()=>call<AdminSecurity>('security'),
  sessions:()=>call<{items:AdminDeviceSession[]}>('sessions'),
  async activity(){const result=await call<{adminSession:AdminSessionInfo}>('activity',{});updateAdminSessionInfo(result.adminSession);return result.adminSession;},
  async reauth(password:string,code:string,recovery=false){const result=await call<{adminSession:AdminSessionInfo}>('reauth',{password,...(recovery?{recoveryCode:code}:{code})});updateAdminSessionInfo(result.adminSession);return result.adminSession;},
  async revoke(body:{familyId?:string;allDevices?:boolean}){const result=await call<{signedOut:boolean}>('sessions/revoke',body);if(result.signedOut)identityApi.clearLocalSession();return result;},
  rotateStart:()=>call<{challengeToken:string;secret:string;otpauthUri:string}>('mfa/rotate/start',{}),
  async rotateConfirm(challengeToken:string,code:string){const result=await call<AdminLoginResult>('mfa/rotate/confirm',{challengeToken,code});acceptAdminSession(result);return result.recoveryCodes||[];},
  async regenerateCodes(){const result=await call<AdminLoginResult>('mfa/recovery-codes',{});acceptAdminSession(result);return result.recoveryCodes||[];},
  recoveries:()=>call<{items:MfaRecoveryRequest[]}>('mfa/recovery/requests'),
  reviewRecovery:(id:string,version:number,action:'approve'|'reject',evidenceReference:string,reason:string,identityVerified:boolean)=>call('mfa/recovery/review',{id,version,action,evidenceReference,reason,identityVerified}),
  async passkeyLogin(challengeToken:string){
    const {startAuthentication}=await import('@simplewebauthn/browser');
    const result=await identityApi.adminPublicRequest<{options:PublicKeyCredentialRequestOptionsJSON}>('passkey/options',{challengeToken});
    const response=await startAuthentication({optionsJSON:result.options});
    const session=await identityApi.adminPublicRequest<AdminLoginResult>('passkey/verify',{challengeToken,response});acceptAdminSession(session,true);return session.user;
  },
  async passkeyRegister(label:string){
    const {startRegistration}=await import('@simplewebauthn/browser');
    const result=await call<{challengeToken:string;options:PublicKeyCredentialCreationOptionsJSON}>('passkey/register/options',{label});
    const response=await startRegistration({optionsJSON:result.options});return call('passkey/register/verify',{challengeToken:result.challengeToken,response});
  },
  passkeyRevoke:(id:string)=>call('passkey/revoke',{id}),
  async passkeyReauth(password:string){
    const {startAuthentication}=await import('@simplewebauthn/browser');
    const result=await call<{challengeToken:string;options:PublicKeyCredentialRequestOptionsJSON}>('passkey/reauth/options',{password});
    const response=await startAuthentication({optionsJSON:result.options});
    const updated=await call<{adminSession:AdminSessionInfo}>('passkey/reauth/verify',{challengeToken:result.challengeToken,response});updateAdminSessionInfo(updated.adminSession);return updated.adminSession;
  },
};
