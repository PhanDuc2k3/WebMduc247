// src/types/user.ts

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: UserProfile;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface RegisterResponse {
  message: string;
}

export interface UserProfile {
  id?: string;
  _id?: string;
  email: string;
  fullName: string;
  phone?: string;
  role?: string;
  avatarUrl?: string;
  store?: any;
  sellerRequest?: SellerRequest;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  avatarFile?: File;
}

export interface SellerRequestData {
  name: string;
  description: string;
  address: string;
  category: string;
  contactPhone: string;
  contactEmail: string;
}

export interface SellerRequest {
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  store: {
    name: string;
    description: string;
    address: string;
    category: string;
    contactPhone: string;
    contactEmail: string;
    logoUrl?: string;
    bannerUrl?: string;
    isActive: boolean;
  };
}

export interface SellerRequestResponse {
  message: string;
  sellerRequest?: SellerRequest;
}

export interface SellerRequestAction {
  userId: string;
  action: "approve" | "reject";
}
