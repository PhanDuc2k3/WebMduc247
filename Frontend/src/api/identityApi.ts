export type IdentityUser = {
  id: string;
  email: string;
  fullName: string;
  emailVerifiedAt: string | null;
  roles: Array<"buyer" | "seller" | "platform_admin">;
};

const baseUrl = import.meta.env.VITE_IDENTITY_API_URL || "http://localhost:5101";
let accessToken: string | null = null;
let refreshInFlight: Promise<string> | null = null;
let meInFlight: Promise<IdentityUser> | null = null;
let sessionVersion = 0;
let refreshFailure: { error: unknown; retryAt: number } | null = null;

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

function setSession(next: string | null) {
  sessionVersion += 1;
  accessToken = next;
  refreshFailure = null;
  refreshInFlight = null;
  meInFlight = null;
}

async function refresh(rejectedToken?: string) {
  // A late 401 may belong to a token another request has already replaced.
  if (rejectedToken && accessToken && rejectedToken !== accessToken) return accessToken;
  if (refreshFailure && Date.now() < refreshFailure.retryAt) throw refreshFailure.error;
  if (!refreshInFlight) {
    const version = sessionVersion;
    const pending = request<{ accessToken: string }>("/refresh", {}).then(({ accessToken: next }) => {
      if (version !== sessionVersion) throw changedSession();
      accessToken = next;
      refreshFailure = null;
      return next;
    }).catch((error) => {
      if (version !== sessionVersion) throw changedSession();
      accessToken = null;
      const wait = error instanceof IdentityApiError && error.status === 401 ? Infinity :
        error instanceof IdentityApiError && error.status === 429 ? (error.retryAfterSeconds ?? 900) * 1000 : 5000;
      refreshFailure = { error, retryAt: Date.now() + wait };
      throw error;
    }).finally(() => { if (refreshInFlight === pending) refreshInFlight = null; });
    refreshInFlight = pending;
  }
  return refreshInFlight;
}

async function token() {
  return accessToken || refresh();
}

async function sendAuthorized(send: (bearer: string) => Promise<Response>) {
  const version = sessionVersion;
  const bearer = await token();
  if (version !== sessionVersion) throw changedSession();
  const response = await send(bearer);
  if (version !== sessionVersion) throw changedSession();
  if (response.status !== 401) return response;
  return send(await refresh(bearer));
}

export async function authorizedRequest<T>(url: string, options: { method?: string; body?: unknown; contentType?: string; headers?: Record<string, string> } = {}): Promise<T> {
  const send = async (bearer: string) => fetch(url, {
    method: options.method || "GET",
    credentials: "include",
    headers: { Authorization: `Bearer ${bearer}`, ...(options.body === undefined ? {} : { "Content-Type": options.contentType || "application/json" }), ...options.headers },
    ...(options.body === undefined ? {} : { body: options.body instanceof Blob ? options.body : JSON.stringify(options.body) }),
  });
  const response = await sendAuthorized(send);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new IdentityApiError(response.status, data.message || "Không thể xử lý yêu cầu.", data.code, retryAfter(response));
  return data as T;
}

export async function authorizedBlobRequest(url:string):Promise<Blob>{
  const send=(bearer:string)=>fetch(url,{headers:{Authorization:`Bearer ${bearer}`},credentials:'include'});
  const response=await sendAuthorized(send);
  if(!response.ok) throw new IdentityApiError(response.status,'Không thể tải ảnh chứng cứ.');
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
    notify();
    return result.user;
  },
  async adminLogin(email: string, password: string) {
    const result = await request<{ user: IdentityUser; accessToken: string }>("/admin/login", { email, password });
    setSession(result.accessToken);
    notify();
    return result.user;
  },
  me(): Promise<IdentityUser> {
    if (!meInFlight) {
      const version = sessionVersion;
      const pending = identityAuthorizedRequest<{ user: IdentityUser }>('/auth/me').then(({ user }) => {
        if (version !== sessionVersion) throw changedSession();
        return user;
      }).finally(() => { if (meInFlight === pending) meInFlight = null; });
      meInFlight = pending;
    }
    return meInFlight;
  },
  async logout(allDevices = false) {
    const version = sessionVersion;
    await identityAuthorizedRequest('/auth/logout', { method: 'POST', body: { allDevices } });
    if (version !== sessionVersion) throw changedSession();
    setSession(null);
    refreshFailure = { error: new IdentityApiError(401, 'Vui lòng đăng nhập.', 'UNAUTHORIZED'), retryAt: Infinity };
    notify();
  },
  forgotPassword: (email: string) => request<{ message: string }>("/forgot-password", { email }),
  resetPassword: (email: string, code: string, newPassword: string, confirmPassword: string) => request<{ message: string }>("/reset-password", { email, code, newPassword, confirmPassword }),
  getAccessToken: () => accessToken,
};
