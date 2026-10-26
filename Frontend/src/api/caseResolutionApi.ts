import {authorizedRequest,authorizedBlobRequest} from './identityApi';
import type {CaseDetail} from './adminCaseApi';
export type EvidenceRef={kind:'STATEMENT'|'CASE_EVIDENCE'|'RETURN_EVIDENCE';id:string};
export type DecisionBasis={responsibleParty:string;policyVersion:string;basisSummary:string;evidenceRefs:EvidenceRef[]};
export type CaseDecision={id:string;kind:string;status:string;proposed_by:string;reviewed_by:string|null;responsible_party:string;policy_version:string;reason:string;
  basis_summary:string;evidence_refs:EvidenceRef[];outcome:string;return_id:string|null;snapshot:{amountMinor?:number;shippingMinor?:number};appeal_until:string|null;published_at:string|null};
export type CaseAppeal={id:string;decision_id:string;party:string;reason:string;status:string;reviewer_id:string|null;result_reason:string|null;version:number;created_at:string;decided_at:string|null};
export type ResolutionDetail=CaseDetail&{decisions:CaseDecision[];obligations:{id:string;kind:string;status:string;return_id:string|null;completion_note:string|null}[];
  messages:{id:string;visibility:string;recipient_kind:string|null;body:string;created_at:string}[];escalations:{id:string;to_assignee:string;level:number;reason:string;created_at:string}[];
  appeals:CaseAppeal[];evidence:(EvidenceRef&{caseId:string;party?:string;content?:string;requestedResolution?:string;createdAt:string})[];
  policies:{id:string;description:string;appeal_days:number}[];inspections:{id:string;condition:string;note:string;actor_type:string;created_at:string}[];
  returnProgress:null|{status:string;version:number;shipBy:string|null;sellerReceiveBy:string|null;confirmedAt:string|null;mode:'FULL'|'PARTIAL';amountMinor:number;itemsMinor:number;shippingMinor:number;orderTotalMinor:number;orderRefundedMinor:number}};
export type PublicResolution={id:string;party:string;workflowStatus:string;messages:{id:string;body:string;created_at:string}[];
  statements:{id:string;party:string;requested_resolution:string;content:string;created_at:string}[];evidence:{id:string;party:string;created_at:string}[];
  decisions:CaseDecision[];appeals:CaseAppeal[];obligations:{kind:string;status:string;completed_at:string|null}[];
  progress:null|{status:string;amountMinor:number;shippingMinor:number;confirmedAt:string|null;shipBy:string|null;sellerReceiveBy:string|null}};
const base=`${import.meta.env.VITE_ORDER_API_URL||'http://localhost:5103'}/api/v2`;
const req=<T>(path:string,body?:unknown)=>authorizedRequest<T>(base+path,{...(body===undefined?{}:{method:'POST',body})});
export const caseResolutionApi={
  detail:(id:string)=>req<ResolutionDetail>(`/admin/cases/${id}/resolution`),
  message:(id:string,body:{visibility:string;recipientKind?:string;body:string;clientRequestId:string;version:number})=>req(`/admin/cases/${id}/messages`,body),
  escalate:(id:string,body:{assigneeId:string;dueAt:string;reason:string;version:number})=>req(`/admin/cases/${id}/escalations`,body),
  propose:(id:string,body:DecisionBasis&{reason:string;version:number;outcome:string;returnId?:string})=>req(`/admin/cases/${id}/decision-proposals`,body),
  review:(id:string,decisionId:string,body:{action:string;version:number;reason:string})=>req(`/admin/cases/${id}/decisions/${decisionId}/review`,body),
  intervention:(id:string,body:{action:string;version:number;returnVersion:number;reason:string;evidenceRefs:EvidenceRef[];condition?:string})=>req(`/admin/cases/${id}/interventions`,body),
  fulfill:(id:string,body:{version:number;note:string;obligationId?:string;evidenceRefs?:EvidenceRef[]})=>req(`/admin/cases/${id}/fulfillment`,body),
  close:(id:string,body:{version:number;reason:string})=>req(`/admin/cases/${id}/close`,body),
  appealReview:(id:string,appealId:string,body:{action:string;version:number;reason:string;evidenceRefs?:EvidenceRef[]})=>req(`/admin/cases/${id}/appeals/${appealId}/review`,body),
  async evidence(id:string,evidenceId:string){const access=await req<{url:string;expiresAt:string}>(`/admin/cases/${id}/evidence/${evidenceId}/access`,{reason:'Xem chứng cứ để đánh giá quyết định và xử lý hậu mãi.'});return {blob:await authorizedBlobRequest(new URL(access.url,base).href),expiresAt:access.expiresAt};},
  report:(filters:Record<string,string>)=>req<{groupBy:string;cohort:string;asOf:string;items:{label:string;cases:number;resolved:number;averageHours:number|null;decidedAppeals:number;acceptedAppeals:number;appealAcceptanceRate:number|null}[]}>(`/admin/case-reports?${new URLSearchParams(Object.entries(filters).filter(([,value])=>value!==''))}`),
};
export const participantResolutionApi={
  detail:(id:string)=>req<PublicResolution>(`/cases/${id}/resolution`),
  statement:(id:string,body:{requestedResolution:string;content:string;clientRequestId:string})=>req(`/cases/${id}/statements`,body),
  appeal:(id:string,body:{decisionId:string;reason:string})=>req(`/cases/${id}/appeals`,body),
  upload:(id:string,file:File)=>authorizedRequest(`${base}/cases/${id}/evidence`,{method:'POST',body:file,contentType:file.type}),
  evidence:(id:string,evidenceId:string)=>authorizedBlobRequest(`${base}/cases/${id}/evidence/${evidenceId}`),
};
