import { authorizedRequest } from "./identityApi";
const base = import.meta.env.VITE_CATALOG_API_URL || "http://localhost:5102";
const query = (options) => new URLSearchParams(Object.entries(options).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => [key, String(value)])).toString();
const publicGet = async (path, signal) => {
    const response = await fetch(`${base}/api/v2${path}`, { signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(data.message || "Không thể tải dữ liệu.");
    return data;
};
const seller = (path, options) => authorizedRequest(`${base}/api/v2/seller${path}`, options);
export const catalogApi = {
    categories: () => publicGet("/categories"),
    listProducts: (options = {}) => publicGet(`/products?${query(options)}`),
    searchProducts: (options, signal) => publicGet(`/products/search?${query(options)}`, signal),
    product: (id) => publicGet(`/products/${encodeURIComponent(id)}`),
    search: (keyword) => publicGet(`/search?q=${encodeURIComponent(keyword)}`),
    home: () => publicGet("/home"),
    list: (query = "", signal) => publicGet(`/stores${query}`, signal),
    storeCategories: () => publicGet("/stores/categories"),
    featured: () => publicGet(`/stores/featured?limit=8`),
    store: (slug) => publicGet(`/stores/${encodeURIComponent(slug)}`),
    reputationPolicy: () => publicGet('/stores/reputation-policy'),
    publicProducts: (slug) => publicGet(`/stores/${encodeURIComponent(slug)}/products`),
    mine: () => seller("/stores"),
    manage: (id) => seller(`/stores/${id}`),
    create: (body) => seller("/stores", { method: "POST", body }),
    update: (id, body) => seller(`/stores/${id}`, { method: "PATCH", body }),
    settings: (id, body) => seller(`/stores/${id}/settings`, { method: "PATCH", body }),
    overview: (id) => seller(`/stores/${id}/overview`),
    products: (id) => seller(`/stores/${id}/products`),
    createProduct: (id, body) => seller(`/stores/${id}/products`, { method: "POST", body }),
    updateProduct: (id, productId, body) => seller(`/stores/${id}/products/${productId}`, { method: "PATCH", body }),
    members: (id) => seller(`/stores/${id}/members`),
    invite: (id, email) => seller(`/stores/${id}/invitations`, { method: "POST", body: { email } }),
    acceptInvite: (token) => seller("/invitations/accept", { method: "POST", body: { token } }),
    removeMember: (id, userId) => seller(`/stores/${id}/members/${userId}`, { method: "DELETE" }),
    sellerProduct: (id) => seller(`/products/${id}`),
    createCatalogProduct: (storeId, body) => seller(`/stores/${storeId}/products`, { method: "POST", body }),
    editCatalogProduct: (id, body) => seller(`/products/${id}`, { method: "PATCH", body }),
    duplicateCatalogProduct: (id) => seller(`/products/${id}/duplicate`, { method: "POST" }),
    setCatalogProductStatus: (id, status) => seller(`/products/${id}/status`, { method: "PATCH", body: { status } }),
    saveVariant: (id, body, variantId) => seller(`/products/${id}/variants${variantId ? `/${variantId}` : ""}`, { method: variantId ? "PATCH" : "POST", body }),
    uploadProductImage: (id, file, options = {}) => authorizedRequest(`${base}/api/v2/seller/products/${id}/images`, {
        method: "POST", body: file, contentType: file.type,
        headers: { ...(options.variantId ? { "X-Variant-Id": options.variantId } : {}),
            "X-Position": String(options.position || 0), "X-Primary": String(Boolean(options.primary)) },
    }),
    removeProductImage: (id, imageId) => seller(`/products/${id}/images/${imageId}`, { method: "DELETE" }),
    reorderProductImages: (id, ids, primaryId) => seller(`/products/${id}/images`, { method: "PATCH", body: { ids, primaryId } }),
    inventory: (variantId, page = 1) => seller(`/variants/${variantId}/inventory?page=${page}&limit=20`),
    adjustInventory: (variantId, delta, reason, reference) => seller(`/variants/${variantId}/inventory-adjustments`, { method: "POST", body: { delta, reason, reference } }),
};
