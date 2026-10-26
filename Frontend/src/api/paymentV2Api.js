import { authorizedRequest } from "./identityApi";
const base = import.meta.env.VITE_PAYMENT_API_URL || "http://localhost:5104";
const request = (path, options = {}) => authorizedRequest(`${base}/api/v2${path}`, options);
export const paymentV2Api = {
    methods: () => request("/payments/methods"),
    create: (orderGroupId, method, idempotencyKey) => request("/payments/intents", { method: "POST",
        body: { orderGroupId, method, idempotencyKey } }),
    intent: (id) => request(`/payments/intents/${id}`),
    order: (groupId) => request(`/orders/${groupId}/payments`),
};
