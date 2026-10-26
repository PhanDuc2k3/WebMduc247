import { HttpError } from '../utils/errors.js';
import { PlatformAdminError } from '../../../../packages/contracts/platform-admin.js';
import { sendJson } from '../utils/http.js';

export function sendError(res, error) {
  const known = error instanceof HttpError || error instanceof PlatformAdminError;
  if (!known) console.error('Identity request failed');
  const status = known ? error.status : 500;
  if (status === 429) res.setHeader('Retry-After', '900');
  sendJson(res, status, {
    code: known ? error.code : 'INTERNAL_ERROR',
    message: known ? error.message : 'Lỗi hệ thống.',
  });
}
