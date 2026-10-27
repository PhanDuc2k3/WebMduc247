const baseUrl = import.meta.env.VITE_IDENTITY_API_URL || "http://localhost:5101";
let accessToken = null;
let refreshInFlight = null;
let meInFlight = null;
let sessionVersion = 0;
let refreshFailure = null;
let adminSessionInfo = null;
const logoutChannel = typeof window.BroadcastChannel === 'function' ? new window.BroadcastChannel('mduc247-admin-session') : null;
const signedOutInitially = localStorage.getItem?.('admin_signed_out') === 'true';
function clearLocalSession(broadcast = true) {
    setSession(null);
    refreshFailure = { error: new IdentityApiError(401, 'Vui lòng đăng nhập.', 'UNAUTHORIZED'), retryAt: Infinity };
    localStorage.setItem?.('admin_signed_out', 'true');
    window.dispatchEvent(new Event('adminSessionCleared'));
    notify();
    if (broadcast) {
        logoutChannel?.postMessage('signed_out');
        localStorage.setItem?.('admin_logout_at', String(Date.now()));
    }
}
if (logoutChannel)
    logoutChannel.onmessage = event => { if (event.data === 'signed_out')
        clearLocalSession(false); };
window.addEventListener('storage', event => { if (event.key === 'admin_logout_at')
    clearLocalSession(false); });
window.addEventListener('pageshow', () => { if (localStorage.getItem?.('admin_signed_out') === 'true')
    clearLocalSession(false); });
export function updateAdminSessionInfo(session) { adminSessionInfo = session; window.dispatchEvent(new Event('adminSessionUpdated')); }
export function acceptAdminSession(result, notifyIdentity = false) {
    setSession(result.accessToken, result.adminSession);
    localStorage.removeItem('admin_signed_out');
    window.dispatchEvent(new Event('adminSessionUpdated'));
    if (notifyIdentity)
        notify();
}
// Remove credentials left by the previous auth flow. V2 never persists them in web storage.
for (const key of ["token", "refreshToken", "rememberedPassword"])
    localStorage.removeItem(key);
export class IdentityApiError extends Error {
    status;
    code;
    retryAfterSeconds;
    constructor(status, message, code, retryAfterSeconds) {
        super(message);
        this.status = status;
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
if (signedOutInitially)
    refreshFailure = { error: new IdentityApiError(401, 'Vui lòng đăng nhập.', 'UNAUTHORIZED'), retryAt: Infinity };
function retryAfter(response) {
    const value = response.headers.get('Retry-After');
    if (!value)
        return undefined;
    const seconds = /^\d+$/.test(value) ? Number(value) : (Date.parse(value) - Date.now()) / 1000;
    return Number.isFinite(seconds) ? Math.max(1, Math.ceil(seconds)) : undefined;
}
async function request(path, body, bearer) {
    const response = await fetch(`${baseUrl}/api/v2/auth${path}`, {
        method: body === undefined ? "GET" : "POST",
        credentials: "include",
        headers: {
            ...(body === undefined ? {} : { "Content-Type": "application/json" }),
            ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new IdentityApiError(response.status, data.message || "Không thể xử lý yêu cầu.", data.code, retryAfter(response));
    return data;
}
function notify() { window.dispatchEvent(new Event("identityUpdated")); }
function changedSession() {
    return new IdentityApiError(401, 'Phiên đăng nhập đã thay đổi. Vui lòng thử lại.', 'SESSION_CHANGED');
}
function setSession(next, session) {
    sessionVersion += 1;
    accessToken = next;
    refreshFailure = null;
    refreshInFlight = null;
    meInFlight = null;
    adminSessionInfo = session || null;
}
async function refresh(rejectedToken) {
    // A late 401 may belong to a token another request has already replaced.
    if (rejectedToken && accessToken && rejectedToken !== accessToken)
        return accessToken;
    if (refreshFailure && Date.now() < refreshFailure.retryAt)
        throw refreshFailure.error;
    if (!refreshInFlight) {
        const version = sessionVersion;
        const pending = request("/refresh", {}).then(({ accessToken: next, adminSession }) => {
            if (version !== sessionVersion)
                throw changedSession();
            accessToken = next;
            refreshFailure = null;
            if (adminSession)
                updateAdminSessionInfo(adminSession);
            return next;
        }).catch((error) => {
            if (version !== sessionVersion)
                throw changedSession();
            accessToken = null;
            const wait = error instanceof IdentityApiError && error.status === 401 ? Infinity :
                error instanceof IdentityApiError && error.status === 429 ? (error.retryAfterSeconds ?? 900) * 1000 : 5000;
            refreshFailure = { error, retryAt: Date.now() + wait };
            if (error instanceof IdentityApiError && error.status === 401 && adminSessionInfo) {
                setSession(null);
                refreshFailure = { error, retryAt: Infinity };
                localStorage.setItem?.('admin_signed_out', 'true');
                window.dispatchEvent(new Event('adminSessionCleared'));
                notify();
            }
            throw error;
        }).finally(() => { if (refreshInFlight === pending)
            refreshInFlight = null; });
        refreshInFlight = pending;
    }
    return refreshInFlight;
}
async function token() {
    if (accessToken?.split('.').length === 3) {
        try {
            const claims = JSON.parse(atob(accessToken.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')));
            if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now() + 15000)
                return refresh();
        }
        catch { /* An opaque test/non-JWT token is validated by the server. */ }
    }
    return accessToken || refresh();
}
async function sendAuthorized(send, retry = true) {
    const version = sessionVersion;
    const bearer = await token();
    if (version !== sessionVersion)
        throw changedSession();
    const response = await send(bearer);
    if (version !== sessionVersion)
        throw changedSession();
    if (response.status !== 401)
        return response;
    if (!retry) {
        clearLocalSession();
        throw new IdentityApiError(401, 'Phiên đã hết hạn. Đăng nhập lại rồi kiểm tra dữ liệu trước khi gửi lại thao tác.', 'ADMIN_SESSION_EXPIRED');
    }
    const next = await refresh(bearer);
    if (version !== sessionVersion)
        throw changedSession();
    const retryResponse = await send(next);
    if (version !== sessionVersion)
        throw changedSession();
    return retryResponse;
}
export async function authorizedRequest(url, options = {}) {
    const send = async (bearer) => fetch(url, {
        method: options.method || "GET",
        credentials: "include",
        headers: { Authorization: `Bearer ${bearer}`, ...(options.body === undefined ? {} : { "Content-Type": options.contentType || "application/json" }), ...options.headers },
        ...(options.body === undefined ? {} : { body: options.body instanceof Blob ? options.body : JSON.stringify(options.body) }),
    });
    const adminUrl = /\/api\/v2\/(?:admin\/|auth\/admin\/)/.test(url);
    const mutation = !['GET', 'HEAD'].includes((options.method || 'GET').toUpperCase());
    const response = await sendAuthorized(send, !(mutation && (adminUrl || Boolean(adminSessionInfo))));
    const data = await response.json().catch(() => ({}));
    if (response.status === 428 && data.code === 'ADMIN_REAUTH_REQUIRED')
        window.dispatchEvent(new Event('adminReauthRequired'));
    if (!response.ok)
        throw new IdentityApiError(response.status, data.message || "Không thể xử lý yêu cầu.", data.code, retryAfter(response));
    return data;
}
export async function authorizedBlobRequest(url) {
    const send = (bearer) => fetch(url, { headers: { Authorization: `Bearer ${bearer}` }, credentials: 'include' });
    const response = await sendAuthorized(send);
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 428 && data.code === 'ADMIN_REAUTH_REQUIRED')
            window.dispatchEvent(new Event('adminReauthRequired'));
        throw new IdentityApiError(response.status, data.message || 'Không thể tải ảnh chứng cứ.', data.code);
    }
    return response.blob();
}
export async function identityAuthorizedRequest(path, options = {}) {
    return authorizedRequest(`${baseUrl}/api/v2${path}`, options);
}
export const identityApi = {
    register: (body) => request("/register", body),
    resendVerification: (email) => request("/resend-verification", { email }),
    verifyEmail: (email, linkToken) => request("/verify-email", { email, token: linkToken }),
    async login(email, password) {
        const result = await request("/login", { email, password });
        setSession(result.accessToken);
        localStorage.removeItem('admin_signed_out');
        notify();
        return result.user;
    },
    async adminLogin(email, password) {
        return request("/admin/login", { email, password });
    },
    adminEnrollStart: (challengeToken) => request('/admin/mfa/enroll/start', { challengeToken }),
    async adminEnrollConfirm(challengeToken, code) { const result = await request('/admin/mfa/enroll/confirm', { challengeToken, code }); acceptAdminSession(result); return result; },
    async adminVerify(challengeToken, body) { const result = await request('/admin/mfa/verify', { challengeToken, ...body }); acceptAdminSession(result, true); return result.user; },
    adminRecoveryRequest: (challengeToken, evidenceReference, reason) => request('/admin/mfa/recovery/request', { challengeToken, evidenceReference, reason }),
    adminPublicRequest: (path, body) => request(`/admin/${path}`, body),
    finishAdminLogin: () => notify(),
    getAdminSession: () => adminSessionInfo,
    clearLocalSession,
    me() {
        if (!meInFlight) {
            const version = sessionVersion;
            const pending = identityAuthorizedRequest('/auth/me').then(({ user }) => {
                if (version !== sessionVersion)
                    throw changedSession();
                if (user.adminSession)
                    updateAdminSessionInfo(user.adminSession);
                return user;
            }).finally(() => { if (meInFlight === pending)
                meInFlight = null; });
            meInFlight = pending;
        }
        return meInFlight;
    },
    async logout(allDevices = false) {
        const version = sessionVersion;
        try {
            await identityAuthorizedRequest('/auth/logout', { method: 'POST', body: { allDevices } });
        }
        finally {
            if (version === sessionVersion)
                clearLocalSession();
        }
    },
    forgotPassword: (email) => request("/forgot-password", { email }),
    resetPassword: (email, code, newPassword, confirmPassword) => request("/reset-password", { email, code, newPassword, confirmPassword }),
    getAccessToken: () => accessToken,
};
