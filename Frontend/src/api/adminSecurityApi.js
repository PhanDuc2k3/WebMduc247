import { identityApi, identityAuthorizedRequest, acceptAdminSession, updateAdminSessionInfo } from './identityApi';
const call = (path, body) => identityAuthorizedRequest('/auth/admin/' + path, body === undefined ? {} : { method: 'POST', body });
export const adminSecurityApi = {
    security: () => call('security'),
    sessions: () => call('sessions'),
    async activity() { const result = await call('activity', {}); updateAdminSessionInfo(result.adminSession); return result.adminSession; },
    async reauth(password, code, recovery = false) { const result = await call('reauth', { password, ...(recovery ? { recoveryCode: code } : { code }) }); updateAdminSessionInfo(result.adminSession); return result.adminSession; },
    async revoke(body) { const result = await call('sessions/revoke', body); if (result.signedOut)
        identityApi.clearLocalSession(); return result; },
    rotateStart: () => call('mfa/rotate/start', {}),
    async rotateConfirm(challengeToken, code) { const result = await call('mfa/rotate/confirm', { challengeToken, code }); acceptAdminSession(result); return result.recoveryCodes || []; },
    async regenerateCodes() { const result = await call('mfa/recovery-codes', {}); acceptAdminSession(result); return result.recoveryCodes || []; },
    recoveries: () => call('mfa/recovery/requests'),
    reviewRecovery: (id, version, action, evidenceReference, reason, identityVerified) => call('mfa/recovery/review', { id, version, action, evidenceReference, reason, identityVerified }),
    async passkeyLogin(challengeToken) {
        const { startAuthentication } = await import('@simplewebauthn/browser');
        const result = await identityApi.adminPublicRequest('passkey/options', { challengeToken });
        const response = await startAuthentication({ optionsJSON: result.options });
        const session = await identityApi.adminPublicRequest('passkey/verify', { challengeToken, response });
        acceptAdminSession(session, true);
        return session.user;
    },
    async passkeyRegister(label) {
        const { startRegistration } = await import('@simplewebauthn/browser');
        const result = await call('passkey/register/options', { label });
        const response = await startRegistration({ optionsJSON: result.options });
        return call('passkey/register/verify', { challengeToken: result.challengeToken, response });
    },
    passkeyRevoke: (id) => call('passkey/revoke', { id }),
    async passkeyReauth(password) {
        const { startAuthentication } = await import('@simplewebauthn/browser');
        const result = await call('passkey/reauth/options', { password });
        const response = await startAuthentication({ optionsJSON: result.options });
        const updated = await call('passkey/reauth/verify', { challengeToken: result.challengeToken, response });
        updateAdminSessionInfo(updated.adminSession);
        return updated.adminSession;
    },
};
