import { identityAuthorizedRequest } from "./identityApi";
const base = "/users/me";
export const profileApi = {
    me: () => identityAuthorizedRequest(base),
    exportPersonalData: () => identityAuthorizedRequest(`${base}/data-export`),
    deletionRequest: () => identityAuthorizedRequest(`${base}/deletion-request`),
    requestDeletion: (password) => identityAuthorizedRequest(`${base}/deletion-request`, { method: "POST", body: { password } }),
    cancelDeletionRequest: () => identityAuthorizedRequest(`${base}/deletion-request`, { method: "DELETE" }),
    update: (displayName) => identityAuthorizedRequest(base, { method: "PATCH", body: { displayName } }),
    uploadAvatar: (file) => identityAuthorizedRequest(`${base}/avatar`, { method: "POST", body: file, contentType: file.type }),
    requestPhoneCode: (phone) => identityAuthorizedRequest(`${base}/phone/challenge`, { method: "POST", body: { phone } }),
    verifyPhoneCode: (code) => identityAuthorizedRequest(`${base}/phone/verify`, { method: "POST", body: { code } }),
    setMarketing: (marketingOptIn) => identityAuthorizedRequest(`${base}/preferences`, { method: "PATCH", body: { marketingOptIn } }),
    addresses: () => identityAuthorizedRequest(`${base}/addresses`),
    address: (id) => identityAuthorizedRequest(`${base}/addresses/${id}`),
    createAddress: (body) => identityAuthorizedRequest(`${base}/addresses`, { method: "POST", body }),
    updateAddress: (id, body) => identityAuthorizedRequest(`${base}/addresses/${id}`, { method: "PATCH", body }),
    deleteAddress: (id) => identityAuthorizedRequest(`${base}/addresses/${id}`, { method: "DELETE" }),
    setDefaultAddress: (id) => identityAuthorizedRequest(`${base}/addresses/${id}/default`, { method: "PUT", body: {} }),
};
