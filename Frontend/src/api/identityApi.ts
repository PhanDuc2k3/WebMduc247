export type AdminSessionInfo={familyId:string;verifiedAt:string;reauthenticatedAt:string;expiresAt:string;idleExpiresAt:string;reauthSeconds:number};
export type AdminLoginChallenge={challengeToken:string;expiresAt:string;enrollmentRequired:boolean;passkeysEnabled?:boolean;recoveryEnrollment?:boolean};
export type AdminLoginResult={user:IdentityUser;accessToken:string;adminSession:AdminSessionInfo;recoveryCodes?:string[]};
export type IdentityUser = {
  id: string;
  email: string;
  fullName: string;
  emailVerifiedAt: string | null;
  roles: Array<"buyer" | "seller" | "platform_admin">;
  adminAccess?: {roles:{role:string;label:string;scope:Record<string,string[]>}[];permissions:string[];
    grants:{permission:string;role:string;scope:Record<string,string[]>}[];restrictions:string[]};
  adminSession?:AdminSessionInfo;
};

const baseUrl = import.meta.env.VITE_IDENTITY_API_URL || "http://localhost:5101";
let accessToken: string | null = null;
let refreshInFlight: Promise<string> | null = null;
let meInFlight: Promise<IdentityUser> | null = null;
let sessionVersion = 0;
let refreshFailure: { error: unknown; retryAt: number } | null = null;
let adminSessionInfo:AdminSessionInfo|null=null;
const logoutChannel=typeof window.BroadcastChannel==='function'?new window.BroadcastChannel('mduc247-admin-session'):null;
const signedOutInitially=localStorage.getItem?.('admin_signed_out')==='true';
function clearLocalSession(broadcast=true){
  setSession(null);refreshFailure={error:new IdentityApiError(401,'Vui lòng đăng nhập.','UNAUTHORIZED'),retryAt:Infinity};
  localStorage.setItem?.('admin_signed_out','true');
  window.dispatchEvent(new Event('adminSessionCleared'));notify();
  if(broadcast){logoutChannel?.postMessage('signed_out');localStorage.setItem?.('admin_logout_at',String(Date.now()));}
}
if(logoutChannel)logoutChannel.onmessage=event=>{if(event.data==='signed_out')clearLocalSession(false);};
window.addEventListener('storage',event=>{if((event as StorageEvent).key==='admin_logout_at')clearLocalSession(false);});
window.addEventListener('pageshow',()=>{if(localStorage.getItem?.('admin_signed_out')==='true')clearLocalSession(false);});
export function updateAdminSessionInfo(session:AdminSessionInfo){adminSessionInfo=session;window.dispatchEvent(new Event('adminSessionUpdated'));}
export function acceptAdminSession(result:AdminLoginResult,notifyIdentity=false){
  setSession(result.accessToken,result.adminSession);localStorage.removeItem('admin_signed_out');
  window.dispatchEvent(new Event('adminSessionUpdated'));if(notifyIdentity)notify();
}

// Remove credentials left by the previous auth flow. V2 never persists them in web storage.
for (const key of ["token", "refreshToken", "rememberedPassword"]) localStorage.removeItem(key);

export class IdentityApiError extends Error {
  status: number;
  code?: string;
  retryAfterSeconds?: number;
  constructor(status: number, message: string, code?: string, retryAfterSeconds?: number) {
    super(message); this.status = status; this.code = code; this.retryAfterSeconds = retryAfterSeconds;
  }
}
if(signedOutInitially)refreshFailure={error:new IdentityApiError(401,'Vui lòng đăng nhập.','UNAUTHORIZED'),retryAt:Infinity};

function retryAfter(response: Response) {
  const value = response.headers.get('Retry-After');
  if (!value) return undefined;
  const seconds = /^\d+$/.test(value) ? Number(value) : (Date.parse(value) - Date.now()) / 1000;
  return Number.isFinite(seconds) ? Math.max(1, Math.ceil(seconds)) : undefined;
}

async function request<T>(path: string, body?: unknown, bearer?: string): Promise<T> {
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
  if (!response.ok) throw new IdentityApiError(response.status, data.message || "Không thể xử lý yêu cầu.", data.code, retryAfter(response));
  return data as T;
}

function notify() { window.dispatchEvent(new Event("identityUpdated")); }

function changedSession() {
  return new IdentityApiError(401, 'Phiên đăng nhập đã thay đổi. Vui lòng thử lại.', 'SESSION_CHANGED');
}

function setSession(next: string | null,session?:AdminSessionInfo) {
  sessionVersion += 1;
  accessToken = next;
  refreshFailure = null;
  refreshInFlight = null;
  meInFlight = null;
  adminSessionInfo=session||null;
}

async function refresh(rejectedToken?: string) {
  // A late 401 may belong to a token another request has already replaced.
  if (rejectedToken && accessToken && rejectedToken !== accessToken) return accessToken;
  if (refreshFailure && Date.now() < refreshFailure.retryAt) throw refreshFailure.error;
  if (!refreshInFlight) {
    const version = sessionVersion;
    const pending = request<{ accessToken: string;adminSession?:AdminSessionInfo }>("/refresh", {}).then(({ accessToken: next,adminSession }) => {
      if (version !== sessionVersion) throw changedSession();
      accessToken = next;
      refreshFailure = null;
      if(adminSession)updateAdminSessionInfo(adminSession);
      return next;
    }).catch((error) => {
      if (version !== sessionVersion) throw changedSession();
      accessToken = null;
      const wait = error instanceof IdentityApiError && error.status === 401 ? Infinity :
        error instanceof IdentityApiError && error.status === 429 ? (error.retryAfterSeconds ?? 900) * 1000 : 5000;
      refreshFailure = { error, retryAt: Date.now() + wait };
      if(error instanceof IdentityApiError&&error.status===401&&adminSessionInfo){setSession(null);refreshFailure={error,retryAt:Infinity};localStorage.setItem?.('admin_signed_out','true');window.dispatchEvent(new Event('adminSessionCleared'));notify();}
      throw error;
    }).finally(() => { if (refreshInFlight === pending) refreshInFlight = null; });
    refreshInFlight = pending;
  }
  return refreshInFlight;
}

async function token() {
  if(accessToken?.split('.').length===3){try{const claims=JSON.parse(atob(accessToken.split('.')[1].replaceAll('-','+').replaceAll('_','/')));if(typeof claims.exp==='number'&&claims.exp*1000<=Date.now()+15000)return refresh();}catch{/* An opaque test/non-JWT token is validated by the server. */}}
  return accessToken || refresh();
}

async function sendAuthorized(send: (bearer: string) => Promise<Response>,retry=true) {
  const version = sessionVersion;
  const bearer = await token();
  if (version !== sessionVersion) throw changedSession();
  const response = await send(bearer);
  if (version !== sessionVersion) throw changedSession();
  if (response.status !== 401) return response;
  if(!retry){clearLocalSession();throw new IdentityApiError(401,'Phiên đã hết hạn. Đăng nhập lại rồi kiểm tra dữ liệu trước khi gửi lại thao tác.','ADMIN_SESSION_EXPIRED');}
  const next=await refresh(bearer);if(version!==sessionVersion)throw changedSession();
  const retryResponse=await send(next);if(version!==sessionVersion)throw changedSession();return retryResponse;
}

export async function authorizedRequest<T>(url: string, options: { method?: string; body?: unknown; contentType?: string; headers?: Record<string, string> } = {}): Promise<T> {
  const send = async (bearer: string) => fetch(url, {
    method: options.method || "GET",
    credentials: "include",
    headers: { Authorization: `Bearer ${bearer}`, ...(options.body === undefined ? {} : { "Content-Type": options.contentType || "application/json" }), ...options.headers },
    ...(options.body === undefined ? {} : { body: options.body instanceof Blob ? options.body : JSON.stringify(options.body) }),
  });
  const adminUrl=/\/api\/v2\/(?:admin\/|auth\/admin\/)/.test(url);
  const mutation=!['GET','HEAD'].includes((options.method||'GET').toUpperCase());
  const response = await sendAuthorized(send,!(mutation&&(adminUrl||Boolean(adminSessionInfo))));
  const data = await response.json().catch(() => ({}));
  if(response.status===428&&data.code==='ADMIN_REAUTH_REQUIRED')window.dispatchEvent(new Event('adminReauthRequired'));
  if (!response.ok) throw new IdentityApiError(response.status, data.message || "Không thể xử lý yêu cầu.", data.code, retryAfter(response));
  return data as T;
}

export async function authorizedBlobRequest(url:string):Promise<Blob>{
  const send=(bearer:string)=>fetch(url,{headers:{Authorization:`Bearer ${bearer}`},credentials:'include'});
  const response=await sendAuthorized(send);
  if(!response.ok){const data=await response.json().catch(()=>({}));if(response.status===428&&data.code==='ADMIN_REAUTH_REQUIRED')window.dispatchEvent(new Event('adminReauthRequired'));throw new IdentityApiError(response.status,data.message||'Không thể tải ảnh chứng cứ.',data.code);}
  return response.blob();
}

export async function identityAuthorizedRequest<T>(path: string, options: { method?: string; body?: unknown; contentType?: string } = {}): Promise<T> {
  return authorizedRequest<T>(`${baseUrl}/api/v2${path}`, options);
}

export const identityApi = {
  register: (body: { email: string; fullName: string; password: string; confirmPassword: string }) => request<{ user: IdentityUser; requiresEmailVerification: boolean; message: string }>("/register", body),
  resendVerification: (email: string) => request<{ message: string }>("/resend-verification", { email }),
  verifyEmail: (email: string, linkToken: string) => request<{ message: string }>("/verify-email", { email, token: linkToken }),
  async login(email: string, password: string) {
    const result = await request<{ user: IdentityUser; accessToken: string }>("/login", { email, password });
    setSession(result.accessToken);
    localStorage.removeItem('admin_signed_out');
    notify();
    return result.user;
  },
  async adminLogin(email: string, password: string) {
    return request<AdminLoginChallenge>("/admin/login", { email, password });
  },
  adminEnrollStart:(challengeToken:string)=>request<{secret:string;otpauthUri:string}>('/admin/mfa/enroll/start',{challengeToken}),
  async adminEnrollConfirm(challengeToken:string,code:string){const result=await request<AdminLoginResult>('/admin/mfa/enroll/confirm',{challengeToken,code});acceptAdminSession(result);return result;},
  async adminVerify(challengeToken:string,body:{code?:string;recoveryCode?:string}){const result=await request<AdminLoginResult>('/admin/mfa/verify',{challengeToken,...body});acceptAdminSession(result,true);return result.user;},
  adminRecoveryRequest:(challengeToken:string,evidenceReference:string,reason:string)=>request<{id:string;message:string}>('/admin/mfa/recovery/request',{challengeToken,evidenceReference,reason}),
  adminPublicRequest:<T>(path:string,body:unknown)=>request<T>(`/admin/${path}`,body),
  finishAdminLogin:()=>notify(),
  getAdminSession:()=>adminSessionInfo,
  clearLocalSession,
  me(): Promise<IdentityUser> {
    if (!meInFlight) {
      const version = sessionVersion;
      const pending = identityAuthorizedRequest<{ user: IdentityUser }>('/auth/me').then(({ user }) => {
        if (version !== sessionVersion) throw changedSession();
        if(user.adminSession)updateAdminSessionInfo(user.adminSession);
        return user;
      }).finally(() => { if (meInFlight === pending) meInFlight = null; });
      meInFlight = pending;
    }
    return meInFlight;
  },
  async logout(allDevices = false) {
    const version = sessionVersion;
    try{await identityAuthorizedRequest('/auth/logout', { method: 'POST', body: { allDevices } });}
    finally{if(version===sessionVersion)clearLocalSession();}
  },
  forgotPassword: (email: string) => request<{ message: string }>("/forgot-password", { email }),
  resetPassword: (email: string, code: string, newPassword: string, confirmPassword: string) => request<{ message: string }>("/reset-password", { email, code, newPassword, confirmPassword }),
  getAccessToken: () => accessToken,
};
