import {authorizedRequest} from './identityApi';
import type {AdminPage,Comparison,DashboardMeta,DashboardRange} from './platformAdminApi';
export type WorkKind='ORDER'|'RETURN'|'TICKET'|'DISPUTE'|'REFUND'|'ABUSE_REPORT';
export type WorkItem={id:string;kind:WorkKind;sourceId:string;shopOrderId:string|null;title:string;sourceStatus:string;
  sourceDetails:{reason?:string;conversationId?:string;messageId?:string;returnId?:string};status:string;priority:string;assigneeId:string|null;teamId:string;teamName:string;leaderId:string|null;
  responseDueAt:string;resolutionDueAt:string;firstResponseAt:string|null;pausedAt:string|null;pausedSeconds:number;escalationLevel:number;
  version:number;createdAt:string;sourceActive:boolean;responseMinutes:number;resolutionMinutes:number};
export type WorkEvent={id:string;actor_id:string|null;action:string;reason:string;created_at:string};
export type WorkHealth={source:string;updatedAt:string|null;errorCode:string|null;delayed:boolean};
export type WorkAttention={items:{kind:WorkKind;total:number;unassigned:number;overdue:number}[];health:WorkHealth[];updatedAt:string};
export type SlaPolicy={kind:WorkKind;response_minutes:number;resolution_minutes:number;reminder_minutes:number;team_id:string;version:number};
export type WorkSettings={policies:SlaPolicy[];teams:{id:string;name:string;leader_id:string|null}[];pauseRule:string};
export type WorkNotification={id:string;work_id:string;milestone:string;due_at:string;created_at:string;read_at:string|null;title:string};
const base=`${import.meta.env.VITE_ORDER_API_URL||'http://localhost:5103'}/api/v2/admin/work-queue`;
const payment=`${import.meta.env.VITE_PAYMENT_API_URL||'http://localhost:5104'}/api/v2/admin/finance`;
const request=<T>(path:string,method='GET',body?:unknown)=>authorizedRequest<T>(base+path,{method,...(body===undefined?{}:{body})});
export const workQueueApi={
  list:(filters:Record<string,string>)=>request<AdminPage<WorkItem>>(`?${new URLSearchParams(filters)}`),
  attention:()=>request<WorkAttention>('/attention'),
  detail:(id:string)=>request<{record:WorkItem;events:WorkEvent[]}>(`/${id}`),
  action:(id:string,body:{action:string;version:number;reason:string;assigneeId?:string|null;teamId?:string;status?:string;priority?:string})=>request(`/${id}/actions`,'POST',body),
  settings:()=>request<WorkSettings>('/settings'),
  updateSettings:(kind:WorkKind,body:{version:number;responseMinutes:number;resolutionMinutes:number;reminderMinutes:number;leaderId:string|null;reason:string})=>request(`/settings/${kind}`,'PUT',body),
  notifications:()=>request<{items:WorkNotification[]}>('/notifications'),
  read:(id:string)=>request(`/notifications/${id}/read`,'POST',{}),
  retry:(source:string)=>request<{sources:{source:string;ok:boolean}[]}>(`/retry/${source}`,'POST',{}),
};
export type FinanceSummary=DashboardMeta & {paid:Comparison;refunded:Comparison;feeRevenue:null;definitions:Record<string,string>};
export type FinanceEntry={id:string;objectId:string;provider:string;status:string;amountMinor:number;occurredAt:string};
export const dashboardFinanceApi={
  summary:(range:DashboardRange)=>authorizedRequest<FinanceSummary>(`${payment}/summary?${new URLSearchParams(range as Record<string,string>)}`),
  entries:(filters:Record<string,string>)=>authorizedRequest<AdminPage<FinanceEntry> & DashboardMeta>(`${payment}/entries?${new URLSearchParams(filters)}`),
};
