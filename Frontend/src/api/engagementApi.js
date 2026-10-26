import { authorizedRequest } from "./identityApi";
const base = import.meta.env.VITE_ENGAGEMENT_API_URL || "http://localhost:5105";
async function publicRequest(path) {
    const response = await fetch(`${base}/api/v2${path}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(data.message || "Không thể tải khuyến mãi.");
    return data;
}
const request = (path, options = {}) => authorizedRequest(`${base}/api/v2${path}`, options);
export const engagementApi = {
    active: () => publicRequest("/promotions/active"),
    flashSales: () => publicRequest("/flash-sales"),
    validate: (code) => request("/promotions/vouchers/validate", { method: "POST", body: { code } }),
    seller: (storeId) => request(`/seller/stores/${storeId}/vouchers`),
    createVoucher: (storeId, input) => request(`/seller/stores/${storeId}/vouchers`, { method: "POST", body: input }),
    createFlashSale: (storeId, input) => request(`/seller/stores/${storeId}/flash-sales`, { method: "POST", body: input }),
    setStatus: (campaignId, status) => request(`/seller/campaigns/${campaignId}/status`, { method: "PATCH", body: { status } }),
};
