import {authorizedRequest} from './identityApi';
import type {AdminPage} from './platformAdminApi';

export type CaseKind='RETURN'|'TICKET'|'DISPUTE';
export type InformationRequest={id:string;recipientKind:'BUYER'|'SELLER';prompt:string;dueAt:string;status:string;version:number;createdAt:string;
  replies:{id:string;actorType:string;message:string;createdAt:string}[]};
export type CaseRecord={id:string;kind:CaseKind;shopOrderId:string;buyerId:string;storeId:string;storeName:string;subject:string;description:string;
  status:string;workflowStatus:string;escalationLevel:number;reasonCode:string;assigneeId:string|null;caseVersion:number;dueAt:string;createdAt:string;requestedAt:string;paymentMethod:string};
export type CaseDetail={record:CaseRecord;links:{id:string;kind:CaseKind}[];canViewEvidence:boolean;informationRequests:InformationRequest[];
  events:{id:string;actorId:string;action:string;reason:string;metadata:Record<string,unknown>;createdAt:string}[]};
export type CaseFilters={kind?:CaseKind;q?:string;status?:string;reasonCode?:string;storeId?:string;assigneeId?:string;due?:string;
  paymentMethod?:string;from?:string;to?:string;page?:number;limit?:number};
export type ReturnException={id:string;shopOrderId:string;requestedBy:string;reason:string;status:string;version:number;
  payload:ReturnPayload;deliveredAt:string;approvedBy:string|null;decisionReason:string|null;resultReturnId:string|null;policyVersion:string;createdAt:string};
export type OrderReturnContext={orderId:string;buyerId:string;status:string;deliveredAt:string|null;policyVersion:string;windowDays:number;
  items:{id:string;name:string;quantity:number}[]};
export type ReturnPayload={reason:string;reasonCode:string;resolution:'REFUND';items:{orderItemId:string;quantity:number}[]};
const base=`${import.meta.env.VITE_ORDER_API_URL||'http://localhost:5103'}/api/v2`;
const request=<T>(path:string,method='GET',body?:unknown)=>authorizedRequest<T>(base+path,{method,...(body===undefined?{}:{body})});
export const adminCaseApi={
  list:(filters:CaseFilters)=>request<AdminPage<CaseRecord>>(`/admin/cases?${new URLSearchParams(Object.entries(filters)
    .filter(([,value])=>value!==undefined&&value!=='').map(([key,value])=>[key,String(value)]))}`),
  detail:(id:string)=>request<CaseDetail>(`/admin/cases/${encodeURIComponent(id)}`),
  capabilities:()=>request<{userId:string;permissions:string[]}>('/admin/cases/capabilities'),
  staff:(q='')=>request<{items:{id:string;name:string}[]}>(`/admin/cases/staff?${new URLSearchParams({q})}`),
  assign:(id:string,body:{assigneeId:string|null;dueAt:string;version:number;reason:string})=>request(`/admin/cases/${id}/assignment`,'PATCH',body),
  create:(body:{kind:'TICKET'|'DISPUTE';shopOrderId:string;subject:string;description:string;reasonCode:string;relatedCaseId?:string;clientRequestId:string})=>request<{id:string}>('/admin/cases','POST',body),
  status:(id:string,body:{status:string;version:number;reason:string})=>request(`/admin/cases/${id}/status`,'POST',body),
  requestInformation:(id:string,body:{recipientKind:string;prompt:string;dueAt:string;version:number})=>request(`/admin/cases/${id}/information-requests`,'POST',body),
  orderContext:(id:string)=>request<OrderReturnContext>(`/admin/cases/order-context/${encodeURIComponent(id)}`),
  exceptions:()=>request<{items:ReturnException[]}>('/admin/return-exceptions'),
  requestException:(body:{shopOrderId:string;payload:ReturnPayload;reason:string;clientRequestId:string})=>request('/admin/return-exceptions','POST',body),
  decideException:(id:string,body:{action:'approve'|'reject';reason:string;version:number})=>request<{returnRequest?:{id:string}}>(`/admin/return-exceptions/${id}/decisions`,'POST',body),
};
export const participantCaseApi={
  forOrder:(orderId:string)=>request<{items:{id:string;kind:CaseKind;subject:string;status:string;informationRequests:InformationRequest[]}[]}>(`/orders/${orderId}/cases`),
  reply:(id:string,requestId:string,body:{message:string;version:number})=>request(`/cases/${id}/information-requests/${requestId}/replies`,'POST',body),
};
