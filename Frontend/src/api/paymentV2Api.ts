import { authorizedRequest } from "./identityApi";
const base=import.meta.env.VITE_PAYMENT_API_URL||"http://localhost:5104";
const request=<T>(path:string,options:{ method?:string;body?:unknown }={})=>
  authorizedRequest<T>(`${base}/api/v2${path}`,options);
export type PaymentMethod="COD"|"MOMO"|"VIETQR";
export type PaymentIntent={
  id:string;orderGroupId:string;method:PaymentMethod;provider:string;
  amountMinor:number;currency:"VND";status:string;checkoutUrl:string|null;
  qrData:string|null;expiresAt:string|null;needsReview:boolean;
};
export type RefundV2={ id:string;shopOrderId:string;amountMinor:number;currency:"VND";
  status:"INITIATED"|"PENDING"|"SUCCEEDED"|"FAILED";reason:string;createdAt:string };
export const paymentV2Api={
  methods:()=>request<{ methods:Array<{ code:PaymentMethod;name:string;available:boolean }> }>("/payments/methods"),
  create:(orderGroupId:string,method:"MOMO"|"VIETQR",idempotencyKey:string)=>
    request<{ intent:PaymentIntent }>("/payments/intents",{ method:"POST",
      body:{ orderGroupId,method,idempotencyKey } }),
  intent:(id:string)=>request<{ intent:PaymentIntent;refunds:RefundV2[] }>(`/payments/intents/${id}`),
  order:(groupId:string)=>request<{ orderGroupId:string;paymentMethod:PaymentMethod;
    orderPaymentStatus:string;intents:PaymentIntent[];refunds:RefundV2[] }>(`/orders/${groupId}/payments`),
};
