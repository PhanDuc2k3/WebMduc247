import { createContext, useContext } from 'react';
import type { IdentityUser } from '../../api/identityApi';
export const AdminSessionContext = createContext<IdentityUser | null>(null);
export function useAdminSession() {
  const user = useContext(AdminSessionContext);
  if (!user) throw new Error('Admin session unavailable');
  return user;
}
