import { authorizedRequest } from "./identityApi";
import type {HomeData} from './storefrontApi';

const base = import.meta.env.VITE_CATALOG_API_URL || "http://localhost:5102";
export type CatalogStore = {
  id: string; slug: string; name: string; description: string;
  logoUrl: string | null; bannerUrl: string | null; category: string | null;
  createdAt: string; status: "active" | "paused";
  productCount: number | null; rating: number | null; followers: number | null;
  role?: "owner" | "staff"; pickupAddress?: string; returnAddress?: string;
  acceptingOrders?: boolean; businessHours?: Record<string, unknown>;
  platformSuspended?:boolean;suspensionReason?:string;registrationStatus?:string;
  reputationBadge?:{label:string;expiresAt:string;policyId:string}|null;
  contactInfo?: { email?: string; phone?: string };
};
export type StoreInput = {
  name: string; slug?: string; description?: string; logoUrl?: string;
  bannerUrl?: string; category?: string; contactEmail: string;
  contactPhone: string; pickupAddress: string; returnAddress?: string;
};
export type CatalogProduct = {
  id: string; storeId: string; name: string; description: string;
  price: number; stock: number; imageUrl: string | null;
  status: "draft" | "published" | "hidden"; createdAt: string;
};
export type ProductInput = {
  name: string; description?: string; price: number; stock: number;
  imageUrl?: string; status?: CatalogProduct["status"];
};
export type CategoryNode = { id: string; parentId: string | null; name: string; slug: string; iconKey: string | null;
  imageKey: string | null; iconUrl?: string | null; imageUrl?: string | null; sortOrder: number; isActive: boolean; children: CategoryNode[] };
export type Variant = { id: string; sku: string; attributes: Record<string, string>; priceOriginalMinor: number;
  priceMinor: number; salePriceMinor: number | null; saleStartsAt: string | null; saleEndsAt: string | null;
  stock: number; status: "active" | "inactive"; currency: "VND" };
export type CatalogItem = { id: string; slug: string; name: string; title: string; description?: string; brand: string | null;
  storeId: string; store: { id?: string; slug: string; name: string; logoUrl?: string | null };
  categoryId: string | null; status?: "draft" | "active" | "hidden" | "discontinued";
  currency: "VND"; priceMinor: number; priceOriginalMinor: number; stock: number; inStock: boolean;
  imageUrl: string | null; images?: { id: string; variantId: string | null; position: number; isPrimary: boolean; url: string | null }[];
  variants?: Variant[]; attributes?: Record<string, string[]>; rating: number | null; reviewCount: number | null;
  soldCount: number | null; createdAt: string };
export type CatalogProductInput = { title: string; description?: string; brand?: string; categoryId?: string | null;
  priceMinor?: number; stock?: number; variants?: { sku: string; attributes?: Record<string, string>; priceMinor: number;
    salePriceMinor?: number | null; saleStartsAt?: string | null; saleEndsAt?: string | null; stock: number; status?: "active" | "inactive" }[];
  attributes?: Record<string, string[]> };
export type ProductQuery = { page?: number; limit?: number; search?: string; category?: string; store?: string; brand?: string;
  categoryId?: string; shopId?: string;
  minPrice?: number; maxPrice?: number; minRating?: number; inStock?: boolean; sale?: boolean;
  sort?: "relevance" | "newest" | "price_asc" | "price_desc" };
export type ProductPage = { products: CatalogItem[]; total: number; page: number; limit: number;
  totalPages: number; hasNextPage: boolean };
const query = (options: ProductQuery) => new URLSearchParams(Object.entries(options).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => [key, String(value)])).toString();
const publicGet = async <T>(path: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(`${base}/api/v2${path}`, { signal });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Không thể tải dữ liệu.");
  return data as T;
};
const seller = <T>(path: string, options?: { method?: string; body?: unknown }) =>
  authorizedRequest<T>(`${base}/api/v2/seller${path}`, options);

export const catalogApi = {
  categories: () => publicGet<{ categories: CategoryNode[] }>("/categories"),
  listProducts: (options: ProductQuery = {}) => publicGet<ProductPage>(`/products?${query(options)}`),
  searchProducts: (options: Omit<ProductQuery, "search"> & { q: string }, signal?: AbortSignal) =>
    publicGet<ProductPage>(`/products/search?${query(options)}`, signal),
  product: (id: string) => publicGet<{ product: CatalogItem }>(`/products/${encodeURIComponent(id)}`),
  search: (keyword: string) => publicGet<{ products: CatalogItem[]; stores: CatalogStore[]; categories: CategoryNode[] }>(`/search?q=${encodeURIComponent(keyword)}`),
  home: () => publicGet<HomeData>("/home"),
  list: (query = "", signal?: AbortSignal) => publicGet<{ stores: CatalogStore[]; page: number; limit: number; total: number }>(`/stores${query}`, signal),
  storeCategories: () => publicGet<{ categories: string[] }>("/stores/categories"),
  featured: () => publicGet<{ stores: CatalogStore[] }>(`/stores/featured?limit=8`),
  store: (slug: string) => publicGet<{ store: CatalogStore }>(`/stores/${encodeURIComponent(slug)}`),
  reputationPolicy:()=>publicGet<{id:string;criteria:string}>('/stores/reputation-policy'),
  publicProducts: (slug: string) => publicGet<{ products: CatalogItem[] }>(`/stores/${encodeURIComponent(slug)}/products`),
  mine: () => seller<{ stores: CatalogStore[] }>("/stores"),
  manage: (id: string) => seller<{ store: CatalogStore }>(`/stores/${id}`),
  create: (body: StoreInput) => seller<{ store: CatalogStore }>("/stores", { method: "POST", body }),
  update: (id: string, body: Partial<StoreInput>) => seller<{ store: CatalogStore }>(`/stores/${id}`, { method: "PATCH", body }),
  settings: (id: string, body: { acceptingOrders?: boolean; businessHours?: Record<string, unknown>; contactInfo?: { email?: string; phone?: string } }) =>
    seller<{ store: CatalogStore }>(`/stores/${id}/settings`, { method: "PATCH", body }),
  overview: (id: string) => seller<{ store: CatalogStore; metrics: { productCount: number | null; pendingOrderCount: number | null; recognizedRevenue: number | null; sourceStatus: string } }>(`/stores/${id}/overview`),
  products: (id: string) => seller<{ products: CatalogItem[] }>(`/stores/${id}/products`),
  createProduct: (id: string, body: ProductInput) => seller<{ product: CatalogProduct }>(`/stores/${id}/products`, { method: "POST", body }),
  updateProduct: (id: string, productId: string, body: Partial<ProductInput>) => seller<{ product: CatalogProduct }>(`/stores/${id}/products/${productId}`, { method: "PATCH", body }),
  members: (id: string) => seller<{ members: { userId: string; role: "owner" | "staff"; status: string }[] }>(`/stores/${id}/members`),
  invite: (id: string, email: string) => seller<{ token: string; email: string; expiresInDays: number }>(`/stores/${id}/invitations`, { method: "POST", body: { email } }),
  acceptInvite: (token: string) => seller<{ storeId: string; role: string }>("/invitations/accept", { method: "POST", body: { token } }),
  removeMember: (id: string, userId: string) => seller<{ removed: boolean }>(`/stores/${id}/members/${userId}`, { method: "DELETE" }),
  sellerProduct: (id: string) => seller<{ product: CatalogItem }>(`/products/${id}`),
  createCatalogProduct: (storeId: string, body: CatalogProductInput) => seller<{ product: CatalogItem }>(`/stores/${storeId}/products`, { method: "POST", body }),
  editCatalogProduct: (id: string, body: Partial<CatalogProductInput>) => seller<{ product: CatalogItem }>(`/products/${id}`, { method: "PATCH", body }),
  duplicateCatalogProduct: (id: string) => seller<{ product: CatalogItem }>(`/products/${id}/duplicate`, { method: "POST" }),
  setCatalogProductStatus: (id: string, status: "active" | "draft" | "hidden" | "discontinued") =>
    seller<{ product: CatalogItem }>(`/products/${id}/status`, { method: "PATCH", body: { status } }),
  saveVariant: (id: string, body: { sku: string; attributes?: Record<string, string>; priceMinor: number; salePriceMinor?: number | null;
    saleStartsAt?: string | null; saleEndsAt?: string | null; stock?: number; status?: "active" | "inactive" }, variantId?: string) =>
    seller<{ product: CatalogItem }>(`/products/${id}/variants${variantId ? `/${variantId}` : ""}`, { method: variantId ? "PATCH" : "POST", body }),
  uploadProductImage: (id: string, file: File, options: { variantId?: string; position?: number; primary?: boolean } = {}) =>
    authorizedRequest<{ image: { id: string; url: string | null } }>(`${base}/api/v2/seller/products/${id}/images`, {
      method: "POST", body: file, contentType: file.type,
      headers: { ...(options.variantId ? { "X-Variant-Id": options.variantId } : {}),
        "X-Position": String(options.position || 0), "X-Primary": String(Boolean(options.primary)) },
    }),
  removeProductImage: (id: string, imageId: string) => seller<{ removed: boolean }>(`/products/${id}/images/${imageId}`, { method: "DELETE" }),
  reorderProductImages: (id: string, ids: string[], primaryId?: string) =>
    seller<{ product: CatalogItem }>(`/products/${id}/images`, { method: "PATCH", body: { ids, primaryId } }),
  inventory: (variantId: string, page = 1) => seller<{ variantId: string; onHand: number; reserved: number; available: number;
    movements: { id: number; delta: number; reason: string; reference: string | null; actorId: string | null;
      source: string; occurredAt: string }[]; total: number }>(`/variants/${variantId}/inventory?page=${page}&limit=20`),
  adjustInventory: (variantId: string, delta: number, reason: string, reference?: string) =>
    seller<{ variantId: string; onHand: number; reserved: number; available: number }>(
      `/variants/${variantId}/inventory-adjustments`, { method: "POST", body: { delta, reason, reference } }),
};
