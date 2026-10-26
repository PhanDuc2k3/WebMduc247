import { createContext, useContext } from "react";
export const UserContext = createContext(undefined);
export const useUser = () => {
    const context = useContext(UserContext);
    if (!context)
        throw new Error("useUser must be used within UserProvider");
    return context;
};
export const useHeader = useUser;
