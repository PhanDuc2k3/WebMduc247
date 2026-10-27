import {identityAuthorizedRequest,authorizedRequest} from './identityApi';
export type AdminScope=Record<string,string[]>;
export type RoleAssignment={role:string;scope:AdminScope};
export type AccessPreview={id:string;name:string;status:string;version:number;assignments:RoleAssignment[];
  access:{roles:{role:string;label:string;scope:AdminScope}[];permissions:string[];grants:{permission:string;role:string;scope:AdminScope}[];restrictions:string[]};
  roles:Record<string,{label:string;permissions:string[]}>};
export type Approval={id:string;operation:string;target_id:string;version:number;created_by:string;reviewed_by:string|null;status:string;reason:string;
  snapshot:{version:number;amountMinor:number;recipientId:string;storeId:string}};
export type ApprovalPolicy={operation:string;threshold_minor:string;version:number};
const order=import.meta.env.VITE_ORDER_API_URL||'http://localhost:5103';
export const adminAccessApi={
  staff:()=>identityAuthorizedRequest<{items:{id:string;name:string}[]}>('/admin/staff'),
  preview:(id:string)=>identityAuthorizedRequest<AccessPreview>(`/admin/staff/${encodeURIComponent(id)}/access`),
  replace:(id:string,assignments:RoleAssignment[],version:number,reason:string,requestId:string)=>identityAuthorizedRequest(`/admin/staff/${encodeURIComponent(id)}/access`,{method:'PUT',body:{assignments,version,reason,requestId}}),
};
export const adminApprovalApi={
  list:(operation:string)=>authorizedRequest<{items:Approval[]}>(`${order}/api/v2/admin/approvals?operation=${encodeURIComponent(operation)}`),
  create:(body:{operation:string;targetId:string;version:number;reason:string;requestId:string})=>authorizedRequest<Approval>(`${order}/api/v2/admin/approvals`,{method:'POST',body}),
  review:(id:string,version:number,action:'approve'|'reject',reason:string)=>authorizedRequest<Approval>(`${order}/api/v2/admin/approvals/${id}/review`,{method:'POST',body:{version,action,reason}}),
  policies:()=>authorizedRequest<{items:ApprovalPolicy[]}>(`${order}/api/v2/admin/approval-policies`),
  updatePolicy:(operation:string,version:number,thresholdMinor:number,reason:string)=>authorizedRequest(`${order}/api/v2/admin/approval-policies/${operation}`,{method:'PUT',body:{version,thresholdMinor,reason}}),
};
