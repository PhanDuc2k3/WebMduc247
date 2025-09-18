// types.ts
export interface ProductType {
  _id: string;
  name: string;
  description?: string;
  price: number;
  salePrice?: number;
  brand?: string;
  category?: string;
  subCategory?: string;
  quantity?: number;
  stock?: number;
  soldCount: number;
  model?: string;
  sku?: string;
  variations?: any[];
  images: string[];
  specifications?: { key: string; value: string }[];
  rating?: number;
  reviewsCount?: number;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
  isFeatured?: boolean;
  viewsCount: number;
  isActive: boolean;
  store?: string;
}
