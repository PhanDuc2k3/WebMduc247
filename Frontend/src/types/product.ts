// types/product.ts

export interface Specification {
  key: string;
  value: string;
}

// 🔹 Option phụ cho từng màu (VD: dung lượng, size, trọng lượng...)
export interface VariationOption {
  name: string;            // VD: "128GB" | "XL" | "500g"
  stock: number;           // số lượng tồn kho cho option này
  additionalPrice: number; // giá cộng thêm so với price gốc
}

// 🔹 Biến thể chính (màu sắc hoặc thuộc tính cha)
export interface Variation {
  color: string;              // VD: "Titan Xanh", "Đỏ", "Đen"
  options: VariationOption[]; // danh sách option con
}

export interface ProductType {
  _id: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  brand: string;
  category: string;
  subCategory: string;
  quantity: number;           // tổng stock = sum(options.stock)
  soldCount: number;
  model: string;
  sku?: string;
  variations?: Variation[];   // ✅ thay vì any[]
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

export interface FormDataType {
  name: string;
  description: string;
  price: string | number;
  originalPrice: string | number;
  brand: string;
  category: string;
  subCategory: string;
  model: string;
  features: string[];
  specifications: Specification[];
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  mainImage: File | null;
  mainImagePreview: string | null;
  subImages: File[];
  subImagesPreview: string[];
  storeId?: string;

  // ✅ thêm variations để FE quản lý
  variations: Variation[];
}
