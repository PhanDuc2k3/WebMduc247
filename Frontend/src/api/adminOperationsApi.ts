import {authorizedRequest} from './identityApi';
import type {AdminPage} from './platformAdminApi';
export type OperationsKind='payments'|'refunds'|'inventory'|'chat-reports';
export type OperationsRecord={id:string;status?:string;version:number;provider?:string;amountMinor?:number;createdAt?:string;updatedAt?:string;
  orderGroupId?:string;shopOrderId?:string;returnId?:string|null;needsReview?:boolean;reason?:string;conversationId?:string;
  sku?:string;name?:string;store_name?:string;store_id?:string;product_id?:string;on_hand?:number;reserved?:number;available?:number;expired?:number;held?:number;
  providerReference?:string;lastCheckedAt?:string;recheckRequestedAt?:string;canRecheck?:boolean};
export type OperationsDetail={record:OperationsRecord;guidance:string;amounts?:{expected:number;paid:number;refunded:number;reserved:number;remaining:number};
  transactions?:{id:string;status:string;amount_minor:number;provider_txn_id:string;verified_at:string}[];
  refunds?:{id:string;shop_order_id:string;status:string;amount_minor:number}[];
  checks?:{id:string;local_status:string;outcome:string;checked_at:string}[];
  events?:{id?:string;kind?:string;action?:string;actor_id?:string;actorId?:string;reason:string;created_at?:string;createdAt?:string}[];
  outbox?:{event_type:string;attempts:number;published_at:string|null;created_at:string}[];
  reservations?:{id:string;order_ref:string;quantity:number;status:string;expires_at:string;created_at:string}[];
  movements?:{id:string;delta:number;reason:string;reference:string;source:string;occurred_at:string}[];
  anomalies?:{issue:string;detected_at:string;resolved_at:string|null}[];
  messages?:{id:string;role:string;type:string;content:string;hasAttachment:boolean;createdAt:string}[];
  orderSource?:{available:boolean;needsReview?:boolean;orders:{id:string;status:string;paymentStatus:string;amountMinor:number}[]}};
const url=(kind:OperationsKind)=>kind==='inventory'?`${import.meta.env.VITE_CATALOG_API_URL||'http://localhost:5102'}/api/v2/admin/inventory`:
  kind==='chat-reports'?`${import.meta.env.VITE_CHAT_API_URL||'http://localhost:5106'}/api/v2/admin/chat-reports`:
  `${import.meta.env.VITE_PAYMENT_API_URL||'http://localhost:5104'}/api/v2/admin/transactions/${kind}`;
export const adminOperationsApi={
  list:(kind:OperationsKind,query:Record<string,string>)=>authorizedRequest<AdminPage<OperationsRecord>>(url(kind)+'?'+new URLSearchParams(query)),
  detail:(kind:OperationsKind,id:string)=>authorizedRequest<OperationsDetail>(`${url(kind)}/${encodeURIComponent(id)}`),
  viewReport:(id:string,reason:string)=>authorizedRequest<OperationsDetail>(`${url('chat-reports')}/${encodeURIComponent(id)}/view`,{method:'POST',body:{reason}}),
  recheck:(kind:OperationsKind,id:string,body:{reason:string;version:number;requestId:string})=>authorizedRequest(`${url(kind)}/${encodeURIComponent(id)}/recheck`,{method:'POST',body}),
  decide:(id:string,body:{action:string;reason:string;version:number;requestId:string})=>authorizedRequest(`${url('chat-reports')}/${encodeURIComponent(id)}/decision`,{method:'POST',body}),
};
