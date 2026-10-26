export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const invalid = () => new HttpError(400, 'INVALID_REQUEST', 'Dữ liệu không hợp lệ.');
export const unauthorized = () => new HttpError(401, 'UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ.');
