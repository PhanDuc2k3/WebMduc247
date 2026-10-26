import { authorizedRequest } from "./identityApi";
const base = import.meta.env.VITE_ORDER_API_URL || "http://localhost:5103";
const request = (path, options = {}) => authorizedRequest(`${base}/api/v2${path}`, options);
const query = (value) => {
    const params = new URLSearchParams();
    for (const [key, item] of Object.entries(value))
        if (item !== undefined && item !== "")
            params.set(key, String(item));
    return params.toString();
};
export const orderV2Api = {
    cart: () => request("/cart"),
    add: (variantId, quantity) => request("/cart/items", { method: "POST", body: { variantId, quantity } }),
    update: (id, input) => request(`/cart/items/${id}`, { method: "PATCH", body: input }),
    remove: (id) => request(`/cart/items/${id}`, { method: "DELETE" }),
    merge: (items) => request("/cart/merge", { method: "POST", body: { items } }),
    preview: (input) => request("/checkout/preview", { method: "POST", body: input }),
    place: (input) => request("/checkout/place-order", { method: "POST", body: input }),
    buyerOrders: (filters = {}) => request(`/orders?${query(filters)}`),
    buyerOrder: (groupId) => request(`/orders/${groupId}`),
    cancel: (groupId, shopOrderId, expectedVersion, reason, idempotencyKey) => request(`/orders/${groupId}/cancel`, {
        method: "POST", body: { shopOrderId, expectedVersion, reason, idempotencyKey },
    }),
    complete: (groupId, shopOrderId, expectedVersion, idempotencyKey) => request(`/orders/${groupId}/shop-orders/${shopOrderId}/complete`, {
        method: "POST", body: { expectedVersion, idempotencyKey },
    }),
    sellerOrders: (storeId, filters = {}) => request(`/seller/stores/${storeId}/orders?${query(filters)}`),
    sellerOrder: (id) => request(`/seller/orders/${id}`),
    sellerCommand: (id, action, input) => request(`/seller/orders/${id}/${action}`, { method: "POST", body: input }),
};
export const vnd = (value) => `${value.toLocaleString("vi-VN")}₫`;
export const notifyCartChanged = () => window.dispatchEvent(new Event("cartV2Changed"));
