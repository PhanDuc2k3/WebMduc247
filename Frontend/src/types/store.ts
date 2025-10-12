// types/store.ts
export interface StoreType {
  _id: string; // MongoDB ObjectId
  name: string;
  description: string;
  storeAddress: string;
  logoUrl: string;
  bannerUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  category: 'electronics' | 'fashion' | 'home' | 'books' | 'other';
  customCategory?: string;
  rating: number;
  owner: { _id: string }; // tham chiếu tới User
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Optional fields hiển thị ở UI
  products?: number;
  followers?: number;
  responseRate?: number;
  responseTime?: string;
  joinDate?: string;
}
