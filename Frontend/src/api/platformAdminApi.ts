import { authorizedRequest, identityAuthorizedRequest } from './identityApi';
export type RecentOrders = { items: { id: string; status: string; paymentMethod: string; totalMinor: number; storeName: string; createdAt: string }[] };
export type IdentitySummary = { users: { total: number; active: number; pending: number; suspended: number; newWeek: number } };
export type CatalogSummary = { stores: { total: number; active: number; paused: number };
  products: { total: number; active: number; draft: number; hidden: number } };
export type OrderSummary = { orders: { total: number; pending: number; delivered: number; cancelled: number; orderValueMinor: number };
  trend: { date: string; orders: number; valueMinor: number }[] };
export type AdminResource = 'users' | 'stores' | 'products' | 'orders';
export type AdminRecord = { id:string; name?:string; fullName?:string; email?:string; roles?:string[]; status:string;
  version:number; createdAt:string; emailVerifiedAt?:string|null; suspended?:boolean; suspensionReason?:string|null;
  slug?:string; description?:string; category?:string; categoryName?:string; ownerId?:string; acceptingOrders?:boolean;
  contactEmail?:string|null; productCount?:number; storeName?:string; storeSlug?:string; priceMinor?:number; stock?:number;
  brand?:string; imageUrl?:string|null; attributes?:Record<string,string[]>;
  variants?:{id:string;sku:string;priceMinor:number;stock:number;status:string;attributes:Record<string,string>}[];
  groupId?:string; buyerId?:string; paymentMethod?:string; paymentStatus?:string; totalMinor?:number; itemCount?:number;
  subtotalMinor?:number; discountMinor?:number; shippingMinor?:number; refundedMinor?:number; shipmentRef?:string;
  delivery?:{receiverName:string|null;phoneMasked:string|null;province:string|null;ward:string|null};
  items?:{id:string;productId:string;name:string;sku:string;quantity:number;unitPriceMinor:number;discountMinor:number;lineTotalMinor:number}[] };
export type AdminHistory = {id?:string;action?:string;actor_name?:string|null;actor_id?:string;previous_status?:string;
  next_status:string;reason?:string|null;created_at:string;read_version?:number|null;result_version?:number|null;correlation_id?:string|null};
export type AuditRecord = AdminHistory & {id:string;target_id:string;target_type:'user'|'store'|'product';target_name?:string|null};
export type AdminPage<T> = {items:T[];total:number;page:number;limit:number;totalPages:number};
export type AdminFilters = {q?:string;status?:string;role?:string;kind?:string;page?:number;limit?:number};
const catalog = import.meta.env.VITE_CATALOG_API_URL || 'http://localhost:5102';
const order = import.meta.env.VITE_ORDER_API_URL || 'http://localhost:5103';
function entityRequest<T>(resource:AdminResource,path:string,options?:{method?:string;body?:unknown}) {
  const route=`/admin/${resource}${path}`;
  return resource==='users' ? identityAuthorizedRequest<T>(route,options) :
    authorizedRequest<T>(`${resource==='orders'?order:catalog}/api/v2${route}`,options);
}
const queryString=(filters:AdminFilters)=>new URLSearchParams(Object.entries(filters).filter(([,v])=>v!==''&&v!==undefined)
  .map(([key,value])=>[key,String(value)])).toString();
export const platformAdminApi = {
  identitySummary: () => identityAuthorizedRequest<IdentitySummary>('/admin/identity/summary'),
  catalogSummary: () => authorizedRequest<CatalogSummary>(`${catalog}/api/v2/admin/catalog/summary`),
  orderSummary: () => authorizedRequest<OrderSummary>(`${order}/api/v2/admin/orders/summary`),
  recentOrders: () => authorizedRequest<RecentOrders>(`${order}/api/v2/admin/orders/recent`),
  list:(resource:AdminResource,filters:AdminFilters)=>entityRequest<AdminPage<AdminRecord>>(resource,`?${queryString(filters)}`),
  detail:(resource:AdminResource,id:string)=>entityRequest<{record:AdminRecord;history:AdminHistory[]}>(resource,`/${encodeURIComponent(id)}`),
  cancelBlockedSeller:(record:AdminRecord,reason:string,requestId:string,approvalId?:string)=>entityRequest<{id:string;status:string;version:number}>('orders',`/${record.id}/cancel-blocked-seller`,{method:'POST',body:{version:record.version,reason,requestId,...(approvalId?{approvalId}:{})}}),
  moderate:(resource:Exclude<AdminResource,'orders'>,record:AdminRecord,action:'suspend'|'restore',reason:string,requestId:string)=>
    entityRequest<{id:string;status:string;version:number}>(resource,`/${record.id}/status`,{method:'PATCH',body:{action,reason,version:record.version,requestId}}),
  audit:(source:'identity'|'catalog',filters:AdminFilters)=>source==='identity'?
    identityAuthorizedRequest<AdminPage<AuditRecord>>(`/admin/audit?${queryString(filters)}`):
    authorizedRequest<AdminPage<AuditRecord>>(`${catalog}/api/v2/admin/catalog/audit?${queryString(filters)}`),
};
