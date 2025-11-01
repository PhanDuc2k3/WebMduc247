// types/store.ts

export interface Product {
  _id: string;
  name: string;
  price: number;            // thêm price
  description?: string;     // optional
  imageUrl?: string;        // optional
  stock?: number;           // optional
  categoryId?: string;      // optional, nếu cần
}


export interface Category {
  _id: string;
  name: string;
  products?: string[]; // danh sách productIds
}

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

  // Thêm categories (dùng cho UI quản lý danh mục)
  categories?: Category[];

  rating: number;
  owner: { _id: string }; // tham chiếu tới User
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Optional fields hiển thị ở UI
  products?: number;
  followers?: number;
  reviewsCount?: number; // tổng số người đánh giá
  joinDate?: string;     // ngày tạo cửa hàng (string, dd/mm/yyyy)
}
