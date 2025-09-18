// types/product.ts

export interface Specification {
  key: string;
  value: string;
}

export interface ProductType {
  _id: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number; // không bắt buộc
  brand: string;
  category: string;
  subCategory: string;
  quantity: number;
  stock?: number; // nếu FE cần
  soldCount: number;
  model: string;
  sku?: string;
  variations?: any[]; // giữ mảng trống hoặc object tùy backend
  images: string[];
  specifications: Specification[];
  rating: number;
  reviewsCount: number;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  isFeatured: boolean;
  viewsCount: number;
  isActive: boolean;
  store: string; // store id
}
