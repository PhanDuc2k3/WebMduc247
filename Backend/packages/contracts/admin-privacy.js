// Mask at the API boundary: hiding fields in React does not protect network responses.
export const maskEmail = value => typeof value === 'string' && value.includes('@')
  ? `${value.slice(0, 1)}***@${value.split('@')[1]}` : value ? '***' : null;
export const maskName = value => typeof value === 'string' && value.trim() ? `${value.trim().slice(0, 1)}***` : null;
