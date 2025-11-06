// src/types/product.ts

// 🔹 Cấu hình thông số kỹ thuật (ví dụ: CPU, RAM, Kích thước)
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

// 🔹 Thông tin cửa hàng (nếu được populate từ backend)
export interface StoreRef {
  _id: string;
  name?: string;
  logoUrl?: string;
  storeAddress?: string; // Địa chỉ cửa hàng
}

// 🔹 Dữ liệu sản phẩm trả về từ backend
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
  variations?: Variation[];
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
  store: string | StoreRef; // ✅ string (id) hoặc object (populated)
  features: string[];
  createdAt?: string | Date; // Thêm createdAt cho sorting
}

// 🔹 Dữ liệu form tạm trong frontend
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
  variations: Variation[];
}
