import { authorizedRequest } from "./identityApi";
import type { PaymentMethod } from "./paymentV2Api";

const base = import.meta.env.VITE_ORDER_API_URL || "http://localhost:5103";
const request = <T>(path: string, options: { method?: string; body?: unknown } = {}) =>
  authorizedRequest<T>(`${base}/api/v2${path}`, options);

export type CartLine = {
  id: string; variantId: string; quantity: number; selected: boolean;
  productId?: string; productName?: string; storeId?: string; storeName?: string; storeSlug?: string; categoryId?:string|null;
  attributes?: Record<string, string>;
  sku?: string; priceMinor?: number; priceOriginalMinor?: number; available?: number;
  imageKey?: string | null; imageUrl?: string | null; currency?: "VND"; observedPriceMinor?: number | null;
  flashCampaignId?:string|null;flashEndsAt?:string|null;flashDiscountMinor?:number;
  error?: { code: string; message: string; available?: number } | null;
};
export type CartV2 = { id: string; version: number; items: CartLine[];promotionUnavailable?:boolean };
export type CheckoutGroup = {
  storeId: string; storeName: string; lines: Array<CartLine & { unitPriceMinor: number; lineTotalMinor: number;
    catalogDiscountMinor:number;flashDiscountMinor:number;voucherDiscountMinor:number;
    shopVoucherDiscountMinor:number;platformVoucherDiscountMinor:number;
    flashCampaignId:string|null;flashEndsAt:string|null }>;
  subtotalMinor: number; discountMinor: number; shippingEstimateMinor: number; payableTotalMinor: number;
};
export type CheckoutQuote = {
  quoteId: string; expiresAt: string; cartVersion: number; addressId: string | null;
  paymentMethod: PaymentMethod; stores: CheckoutGroup[]; errors: Array<{ code: string; message: string; itemId?: string }>;
  subtotalMinor: number; discountMinor: number; shippingEstimateMinor: number;
  payableTotalMinor: number; itemIds: string[]; shippingFeeIsEstimate: true;
  voucherCode:string|null;storeVoucherCode:string|null;platformVoucherCode:string|null;
  voucher:{ id:string;code:string;discountMinor:number;fundingSource:string }|null;
  vouchers:Array<{ id:string;code:string;discountMinor:number;fundingSource:string;kind:"store"|"platform" }>;
  promotionUnavailable:boolean;serverTime:string;
};
export type ShippingAddress = {
  id: string; receiverName: string; receiverPhoneMasked: string; provinceCode: string;
  districtCode: string; wardCode: string; addressLine: string; isDefault: boolean;
};
export type ShopOrderV2 = {
  id: string; groupId: string; storeId: string; store: { name?: string };
  status: string; version: number; paymentMethod: string; paymentStatus:string;currency: string;
  subtotalMinor: number; discountMinor: number; shippingMinor: number; totalMinor: number; refundedMinor:number;
  address: { receiverName: string; receiverPhone: string; addressLine: string;
    wardCode: string; districtCode: string; provinceCode: string };
  shipmentRef?: string | null; createdAt: string;
  items?: Array<{ id: string; productId:string; sku: string; name: string; quantity: number; unitPriceMinor: number;
    discountMinor: number; lineTotalMinor: number; snapshot: { attributes?: Record<string,string>;
      imageUrl?: string;voucherCode?:string|null;voucherDiscountMinor?:number;
      flashCampaignId?:string|null;originalPriceMinor?:number } }>;
  history?: Array<{ fromStatus?: string; toStatus: string; actorType: string; reason?: string; occurredAt: string }>;
};
export type OrderGroupV2 = {
  id: string; status: string; currency: string; grandTotalMinor: number; currentTotalMinor: number;
  cancelledTotalMinor: number; paymentMethod: PaymentMethod; paymentStatus: string;
  createdAt: string; orders: ShopOrderV2[];
};
export type Page<T> = { page: number; limit: number; total: number; groups?: T[]; orders?: T[] };
const query = (value: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  for (const [key, item] of Object.entries(value)) if (item !== undefined && item !== "") params.set(key, String(item));
  return params.toString();
};
export const orderV2Api = {
  cart: () => request<CartV2>("/cart"),
  add: (variantId: string, quantity: number) => request<CartV2>("/cart/items", { method: "POST", body: { variantId, quantity } }),
  update: (id: string, input: { quantity?: number; selected?: boolean }) =>
    request<CartV2>(`/cart/items/${id}`, { method: "PATCH", body: input }),
  remove: (id: string) => request<CartV2>(`/cart/items/${id}`, { method: "DELETE" }),
  merge: (items: Array<{ variantId: string; quantity: number }>) =>
    request<CartV2>("/cart/merge", { method: "POST", body: { items } }),
  preview: (input: { itemIds?: string[]; addressId: string; paymentMethod: PaymentMethod;
    voucherCode?:string;storeVoucherCode?:string;platformVoucherCode?:string }) =>
    request<CheckoutQuote>("/checkout/preview", { method: "POST", body: input }),
  place: (input: { quoteId: string; addressId: string; paymentMethod: PaymentMethod; idempotencyKey: string;
    expectedTotalMinor: number;voucherCode?:string;storeVoucherCode?:string;platformVoucherCode?:string }) =>
    request<{ groupId: string;paymentMethod:PaymentMethod;orders: Array<{ id: string; storeId: string; payableTotalMinor: number; status: string }> }>(
      "/checkout/place-order", { method: "POST", body: input }),
  buyerOrders: (filters: { page?: number; limit?: number; status?: string; from?: string; to?: string } = {}) =>
    request<Page<OrderGroupV2>>(`/orders?${query(filters)}`),
  buyerOrder: (groupId: string) => request<{ group: OrderGroupV2 }>(`/orders/${groupId}`),
  cancel: (groupId: string, shopOrderId: string, expectedVersion: number, reason: string, idempotencyKey: string) =>
    request<{ order: ShopOrderV2 }>(`/orders/${groupId}/cancel`, {
      method: "POST", body: { shopOrderId, expectedVersion, reason, idempotencyKey },
    }),
  complete: (groupId: string, shopOrderId: string, expectedVersion: number, idempotencyKey: string) =>
    request<{ order: ShopOrderV2 }>(`/orders/${groupId}/shop-orders/${shopOrderId}/complete`, {
      method: "POST", body: { expectedVersion, idempotencyKey },
    }),
  sellerOrders: (storeId: string, filters: { page?: number; limit?: number; status?: string; from?: string; to?: string } = {}) =>
    request<Page<ShopOrderV2>>(`/seller/stores/${storeId}/orders?${query(filters)}`),
  sellerOrder: (id: string) => request<{ order: ShopOrderV2 }>(`/seller/orders/${id}`),
  sellerCommand: (id: string, action: "confirm" | "prepare" | "ready-to-ship" | "reject",
    input: { expectedVersion: number; idempotencyKey: string; reason?: string }) =>
    request<{ order: ShopOrderV2 }>(`/seller/orders/${id}/${action}`, { method: "POST", body: input }),
};
export const vnd = (value: number) => `${value.toLocaleString("vi-VN")}₫`;
export const notifyCartChanged = () => window.dispatchEvent(new Event("cartV2Changed"));
