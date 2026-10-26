import { authorizedBlobRequest, authorizedRequest } from './identityApi';
import type { AdminPage } from './platformAdminApi';
import type {CaseDetail} from './adminCaseApi';
import type {DecisionBasis} from './caseResolutionApi';

export type ReturnStatus = 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RETURNING' |
  'RECEIVED' | 'REFUND_PENDING' | 'REFUNDED' | 'CLOSED';
export type ReturnDecision = 'review' | 'approve' | 'reject';
export type AdminReturn = {
  id:string; shopOrderId:string; groupId:string; buyerId:string; storeId:string; storeName:string;
  status:ReturnStatus; version:number; reason:string; reasonCode:string; resolution:string;
  sellerResponse:string|null; adminResponse:string|null; eligibleRefundMinor:number; shippingRefundMinor:number;
  requestedAt:string; updatedAt:string; orderStatus:string; paymentMethod:string; paymentStatus:string;
  orderTotalMinor:number; refundedMinor:number; refundReference:string|null; refundNeedsAttention:boolean;
  assigneeId?:string|null;dueAt?:string;policyVersion?:string;windowDays?:number;deliveredAt?:string;exceptionId?:string|null;
  items?:{orderItemId:string;name:string;sku:string;quantity:number;eligibleRefundMinor:number}[];
  evidence?:{id:string;mimeType:string;createdAt:string}[];
};
export type AdminReturnDetail = {
  case:CaseDetail;
  record:AdminReturn;
  history:{fromStatus:string|null;toStatus:string;actorType:string;note:string|null;createdAt:string}[];
  audit:{id:string;actorId:string;action:string;fromStatus:string;toStatus:string;reason:string;evidenceId:string|null;createdAt:string}[];
};
export type ReturnFilters = {q?:string;status?:string;paymentMethod?:string;storeId?:string;reasonCode?:string;assigneeId?:string;due?:string;from?:string;to?:string;page?:number;limit?:number};
const base = `${import.meta.env.VITE_ORDER_API_URL || 'http://localhost:5103'}/api/v2/admin/returns`;
export const adminReturnApi = {
  list(filters:ReturnFilters) {
    const query = new URLSearchParams(Object.entries(filters).filter(([,value]) => value !== undefined && value !== '')
      .map(([key,value]) => [key,String(value)]));
    return authorizedRequest<AdminPage<AdminReturn>>(`${base}?${query}`);
  },
  detail:(id:string) => authorizedRequest<AdminReturnDetail>(`${base}/${encodeURIComponent(id)}`),
  decide:(record:AdminReturn,action:ReturnDecision,reason:string,basis?:DecisionBasis) =>
    authorizedRequest<{id:string;status:ReturnStatus;version:number}>(`${base}/${encodeURIComponent(record.id)}/decisions`,
      {method:'POST',body:{action,version:record.version,reason,...basis}}),
  async evidence(id:string,evidenceId:string){
    const access=await authorizedRequest<{url:string;expiresAt:string}>(`${base}/${encodeURIComponent(id)}/evidence/${encodeURIComponent(evidenceId)}/access`,
      {method:'POST',body:{reason:'Xem ảnh chứng cứ phục vụ xử lý yêu cầu trả hàng.'}});
    const blob=await authorizedBlobRequest(new URL(access.url,base).href);
    return {blob,expiresAt:access.expiresAt};
  },
};
