import {authorizedRequest} from './identityApi';
const catalog=import.meta.env.VITE_CATALOG_API_URL||'http://localhost:5102';
const order=import.meta.env.VITE_ORDER_API_URL||'http://localhost:5103';
const engagement=import.meta.env.VITE_ENGAGEMENT_API_URL||'http://localhost:5105';
const chat=import.meta.env.VITE_CHAT_API_URL||'http://localhost:5106';
export type StoreDecision={id:string;action:string;reason:string;scope:string;appeal_path:string;created_at:string;read_at:string|null;violation_id?:string};
export type StoreViolation={id:string;incident_key:string;reason:string;remedy_by:string;status:string;created_at:string};
export type StoreAppeal={id:string;decision_id:string;reason:string;status:string;review_reason?:string;created_at:string};
export type StoreProfile={id:string;profile:{name:string;description?:string;category?:string;contactEmail?:string;pickupAddress?:string;returnAddress?:string};created_at:string};
export type StoreGovernance={decisions:StoreDecision[];violations:StoreViolation[];appeals:StoreAppeal[];profiles:StoreProfile[];
  ownership:{id:string;kind:string;target_user_id:string;proposed_by:string;verification_ref:string;reason:string;status:string;review_reason?:string;created_at:string}[];
  events:{id:string;action:string;reason:string;created_at:string}[];
  policy:{approvalRequired:boolean;ownershipTransferEnabled:boolean;documentVerificationEnabled:boolean;badgesEnabled:boolean;reputation:{id:string;label:string;criteria:string;validDays:number};existingOrderSupport:string;appealPath:string}};
export type StoreImpact={storeId:string;updatedAt:string;range:{from:string;to:string};timeZone:string;total_orders:number;open_orders:number;
  overdue_orders:number;period_orders:number;seller_cancelled:number;delayed_orders:number;open_returns:number;period_returns:number;
  open_cases:number;concluded_complaints:number;sellerCancellationRate:number|null;definition:string;supportPath:string};
export type StoreRatings={review_count:number;average_rating:number|null;updatedAt:string;definition:string};
export type StoreReports={storeId:string;total_reports:number;open_reports:number;updatedAt:string;definition:string};
const route=(id:string,seller=false)=>`${catalog}/api/v2/${seller?'seller':'admin'}/stores/${encodeURIComponent(id)}/governance`;
export const storeAdminApi={
  formerDecisions:()=>authorizedRequest<{items:{id:string;action:string;reason:string;scope:string;created_at:string;store_name:string}[]}>(`${catalog}/api/v2/seller/former-store-decisions`),
  read:(id:string)=>authorizedRequest<StoreGovernance>(route(id)),
  profileContact:(id:string,body:{profileVersionId:string;reason:string})=>authorizedRequest<{contactEmail:string;contactPhone:string;pickupAddress:string;returnAddress:string}>(`${catalog}/api/v2/admin/stores/${id}/profile-contact`,{method:'POST',body}),
  command:(id:string,body:Record<string,unknown>)=>authorizedRequest<{id:string;version:number;eligible?:boolean}>(route(id),{method:'POST',body}),
  queue:(status='PENDING',page=1)=>authorizedRequest<{items:{id:string;name:string;slug:string;registration_status:string}[];total:number;page:number;totalPages:number}>(`${catalog}/api/v2/admin/store-applications?${new URLSearchParams({status,page:String(page)})}`),
  impact:(id:string,range:{from?:string;to?:string}={})=>authorizedRequest<StoreImpact>(`${order}/api/v2/admin/stores/${encodeURIComponent(id)}/impact?${new URLSearchParams(range)}`),
  ratings:(id:string,range:{from?:string;to?:string}={})=>authorizedRequest<StoreRatings>(`${engagement}/api/v2/admin/stores/${encodeURIComponent(id)}/rating-summary?${new URLSearchParams(range)}`),
  reports:(id:string)=>authorizedRequest<StoreReports>(`${chat}/api/v2/admin/stores/${encodeURIComponent(id)}/report-summary`),
  sellerRead:(id:string)=>authorizedRequest<StoreGovernance>(route(id,true)),
  sellerCommand:(id:string,body:Record<string,unknown>)=>authorizedRequest<{id:string}>(route(id,true),{method:'POST',body}),
};
