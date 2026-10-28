import {identityAuthorizedRequest} from './identityApi';
import type {AdminRecord,AdminHistory,AdminPage} from './platformAdminApi';
export type UserDecision={id:string;action:string;reason_code:string;reason:string;restriction_scope:string;expires_at:string|null;counts_violation:boolean;outcome:string;original_decision_id:string|null;actor_reference:string|null;created_at:string};
export type UserWorkspaceData={record:AdminRecord;history:AdminHistory[];decisions:UserDecision[];reasonCodes:Record<string,string>;policy?:{temporaryMaxDays:number;signalWindowDays:number;artifactHours:number};suspensionId:string|null;violationCount:number;anonymizedAt:string|null;assignment:{team_id:string;name:string;version:number}|null};
export type UserCommand={version:number;reason:string;requestId:string};
export type UserImpact={sessions:number;modules:{module:string;ok:boolean;error?:string;data?:{ownedStores?:number;activeOrders?:number;activeBuyerOrders?:number;activeSellerOrders?:number;openCases?:number;pendingRefunds?:number}}[];updatedAt:string};
export type UserSession={familyId:string;device:string|null;active:boolean;createdAt:string;lastActivityAt:string;expiresAt:string};
export type UserNote={id:string;author_reference:string;author_name:string;body:string;created_at:string};
export type UserTeams={teams:{id:string;name:string;version:number}[];members:{team_id:string;staff_id:string}[]};
export type UserWorkflowKind='APPEAL'|'ACCESS'|'RECTIFY'|'ANONYMIZE';
export type UserWorkflow={id:string;userId:string|null;userName?:string;email?:string;kind:UserWorkflowKind;originalDecisionId:string|null;summary:string;payload:{fullName?:string};status:string;assigneeId:string|null;identityVerifiedAt:string|null;proofMethod:string;reviewedBy:string|null;reviewReason:string|null;version:number;createdAt:string;resolvedAt:string|null};
export type RetentionReview={module:string;disposition:string;basis_reference:string;reason:string;retain_until:string|null;reviewed_by:string;reviewed_at:string};
export type UserWorkflowDetail={record:UserWorkflow;originalDecision:UserDecision|null;retention:RetentionReview[];events:{id:string;action:string;reason:string;actor_reference:string|null;created_at:string}[];requiredModules:string[];artifact:{id:string;expires_at:string}|null};
const request=<T>(path:string,method='GET',body?:unknown)=>identityAuthorizedRequest<T>(path,{method,...(body===undefined?{}:{body})});
export const userAdminApi={
  workspace:(id:string)=>request<UserWorkspaceData>(`/admin/users/${id}/workspace`),
  impact:(id:string)=>request<UserImpact>(`/admin/users/${id}/impact`),
  contact:(id:string,body:UserCommand)=>request<{email:string;phone:string|null}>(`/admin/users/${id}/contact`,'POST',body),
  searchContact:(body:{phone:string;reason:string;requestId:string;page?:number})=>request<AdminPage<AdminRecord>>('/admin/users/contact-search','POST',body),
  moderate:(id:string,body:UserCommand&{action:'suspend'|'restore';reasonCode:string;restrictionScope:'ACCOUNT';expiresAt?:string|null;impactConfirmed?:boolean})=>request(`/admin/users/${id}/status`,'PATCH',body),
  sessions:(id:string)=>request<{items:UserSession[]}>(`/admin/users/${id}/sessions`),
  events:(id:string)=>request<{items:{id:string;actor_reference:string|null;action:string;reason:string;metadata:Record<string,unknown>;created_at:string}[]}>(`/admin/users/${id}/events`),
  revoke:(id:string,body:UserCommand&{familyId:string})=>request(`/admin/users/${id}/revoke-sessions`,'POST',body),
  resetPassword:(id:string,body:UserCommand)=>request(`/admin/users/${id}/password-reset`,'POST',body),
  teams:()=>request<UserTeams>('/admin/user-teams'),
  updateTeam:(team:string,body:UserCommand&{staffIds:string[]})=>request(`/admin/user-teams/${team}`,'PUT',body),
  assignTeam:(id:string,body:UserCommand&{teamId:string})=>request(`/admin/users/${id}/team`,'PUT',body),
  notes:(id:string)=>request<{items:UserNote[];teamId:string}>(`/admin/users/${id}/notes`),
  addNote:(id:string,body:UserCommand&{body:string})=>request(`/admin/users/${id}/notes`,'POST',body),
  signals:(id:string)=>request<{items:{id:string;status:string;sharedIp:boolean;sharedContact:boolean}[];notice:string;windowDays?:number}>(`/admin/users/${id}/signals`),
  workflows:(filters:Record<string,string>)=>request<AdminPage<UserWorkflow>>(`/admin/user-workflows?${new URLSearchParams(filters)}`),
  workflow:(id:string)=>request<UserWorkflowDetail>(`/admin/user-workflows/${id}`),
  workflowAction:(id:string,body:UserCommand&{action:string;assigneeId?:string;module?:string;disposition?:string;basisReference?:string;retainUntil?:string|null})=>request(`/admin/user-workflows/${id}/actions`,'POST',body),
  artifact:(id:string,body:UserCommand)=>request<unknown>(`/admin/user-workflows/${id}/artifact`,'POST',body),
};
const base=import.meta.env.VITE_IDENTITY_API_URL||'http://localhost:5101';
async function supportRequest<T>(path:string,method='GET',body?:unknown,token?:string){
  const response=await fetch(`${base}/api/v2/account-support${path}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{'X-Account-Support-Token':token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||'Chưa thể xử lý yêu cầu hỗ trợ.');return data as T;
}
export type AccountSupportState={receiptOnly?:boolean;suspension:{id:string;reason_code:string;reason:string;restriction_scope:string;expires_at:string|null;created_at:string}|null;cases:{id:string;kind:UserWorkflowKind;status:string;summary:string;review_reason:string|null;created_at:string;resolved_at:string|null;retention?:{module:string;disposition:string;retainUntil:string|null}[]}[]};
export const accountSupportApi={
  challenge:(email:string,password:string)=>supportRequest<{challengeId:string;message:string}>('/challenge','POST',{email,password}),
  verify:(challengeId:string,code:string)=>supportRequest<{supportToken:string;expiresAt:string}>('/verify','POST',{challengeId,code}),
  state:(token:string)=>supportRequest<AccountSupportState>('/state','GET',undefined,token),
  create:(token:string,body:{kind:UserWorkflowKind;summary:string;fullName?:string;requestId:string})=>supportRequest<{id:string}>('/cases','POST',body,token),
  artifact:(token:string,id:string)=>supportRequest<unknown>(`/cases/${id}/artifact`,'GET',undefined,token),
};
