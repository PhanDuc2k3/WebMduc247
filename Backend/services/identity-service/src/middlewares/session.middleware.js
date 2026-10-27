const cookieName = 'identity_refresh';

export function readRefreshCookie(req) {
  const item = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`));
  return item ? item.slice(cookieName.length + 1) : null;
}

export function setRefreshCookie(res, token, config) {
  appendCookie(res,`${cookieName}=${token || ''}; HttpOnly; Path=/api/v2/auth; SameSite=Strict; ${config.secureCookie ? 'Secure; ' : ''}Max-Age=${token ? (config.cookieMaxAgeSeconds??config.refreshDays * 86400) : 0}`);
}
export function appendCookie(res,value){const current=res.getHeader('Set-Cookie');res.setHeader('Set-Cookie',[...(Array.isArray(current)?current:current?[current]:[]),value]);}
export function readAdminDevice(req){const value=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('identity_admin_device='))?.slice(22);return value&&/^[A-Za-z0-9_-]{43}$/.test(value)?value:null;}
export function setAdminDevice(res,value,config){appendCookie(res,`identity_admin_device=${value}; HttpOnly; Path=/api/v2/auth; SameSite=Strict; ${config.secureCookie?'Secure; ':''}Max-Age=31536000`);}
