const cookieName = 'identity_refresh';

export function readRefreshCookie(req) {
  const item = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`));
  return item ? item.slice(cookieName.length + 1) : null;
}

export function setRefreshCookie(res, token, config) {
  res.setHeader('Set-Cookie', `${cookieName}=${token || ''}; HttpOnly; Path=/api/v2/auth; SameSite=Strict; ${config.secureCookie ? 'Secure; ' : ''}Max-Age=${token ? config.refreshDays * 86400 : 0}`);
}
