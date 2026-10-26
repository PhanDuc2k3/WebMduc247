import { createContext, useContext, type Dispatch, type SetStateAction } from "react";

export interface UserType {
  _id?: string;
  fullName: string;
  avatarUrl: string;
  role?: string;
}

export interface UserContextType {
  user: UserType;
  online: boolean;
  lastSeen: string | null;
  showDropdown: boolean;
  setShowDropdown: Dispatch<SetStateAction<boolean>>;
  handleLogout: () => void;
  handleLogoutAll: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
};

export const useHeader = useUser;
