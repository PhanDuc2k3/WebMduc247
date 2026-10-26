import { createContext, useContext } from 'react';
export const AdminSessionContext = createContext(null);
export function useAdminSession() {
    const user = useContext(AdminSessionContext);
    if (!user)
        throw new Error('Admin session unavailable');
    return user;
}
