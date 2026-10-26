export function requireSession(service) {
  return async req => {
    req.auth = await service.authenticate(req.headers.authorization);
  };
}
