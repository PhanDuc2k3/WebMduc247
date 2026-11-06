import {authorizedRequest} from './identityApi';
import type {CatalogItem} from './catalogApi';
const base=import.meta.env.VITE_CATALOG_API_URL||'http://localhost:5102';
const request=<T>(path:string,options?:{method?:string;body?:unknown})=>authorizedRequest<T>(`${base}/api/v2${path}`,options);
export type ProductRule={code:string;violation_group:string;label:string;description:string;enabled:boolean;version:number};
export type Snapshot=Record<string,unknown>;
export type ProductDecision={id:string;product_version:number;action:string;reason_code:string;reason:string;evidence:string[];report_ids:string[];snapshot:Snapshot;remedy_by:string|null;created_at:string};
export type ProductReport={id:string;reason_code:string;reason:string;evidence:string[];decision_id:string|null;created_at:string};
export type ProductAppeal={id:string;decision_id:string;product_version:number;status:string;reason:string;evidence:string[];created_at:string};
export type Remedy={decision_id:string;status:string;remedy_by:string;submitted_version:number|null;seller_note:string|null};
export type ModerationData={version:number;record:CatalogItem;decisions:ProductDecision[];reports:ProductReport[];revisions:{version:number;snapshot:Snapshot;created_at:string}[];
  comparisonImages:{id:string;url:string|null}[];
  appeals:ProductAppeal[];remedies:Remedy[];notices:{id:number;title:string;body:string;created_at:string}[];
  changesSinceDecision:{field:string;before:unknown;after:unknown}[];snapshot:Snapshot;policy:{prePublicationReview:boolean}};
export type ProductModerationCommand={action:string;reason:string;reasonCode:string;evidence:string[];reportIds?:string[];version:number;requestId:string;remedyBy?:string;decisionId?:string;appealId?:string;outcome?:string};
export type BulkItem={id:string;name?:string;version:number;eligible:boolean;status?:string;error?:string;message?:string};
export type BulkPreview={id:string;items:BulkItem[];command:ProductModerationCommand;expiresInSeconds:number};
export type BulkJob={id:string;status:string;items:BulkItem[]};
export const productModerationApi={
  reportReasons:async()=>{const response=await fetch(`${base}/api/v2/product-report-reasons`);if(!response.ok)throw Error('Chưa tải được lý do báo cáo.');return response.json() as Promise<{items:{code:string;label:string}[]}>;},
  read:(id:string)=>request<ModerationData>(`/admin/products/${id}/moderation`),
  revision:(id:string,version:string)=>request<{images:{id:string;url:string|null}[]}>(`/admin/products/${id}/revisions/${version}`),
  command:(id:string,body:ProductModerationCommand)=>request(`/admin/products/${id}/moderation`,{method:'POST',body}),
  rules:()=>request<{items:ProductRule[];policy:{prePublicationReview:boolean;version:number;reapprovalFields:string[];bulkLimit:number}}>('/admin/product-rules'),
  savePolicy:(body:{approvalRequired:boolean;version:number;reason:string;requestId:string})=>request('/admin/product-review-policy',{method:'POST',body}),
  saveRule:(body:unknown)=>request('/admin/product-rules',{method:'POST',body}),
  signals:(id:string)=>request<{advisoryOnly:boolean;duplicates:{id:string;name:string}[];reusedImages:{id:string;name:string}[];unusualPrice:{before:number;after:number}|null;missingImages:boolean}>(`/admin/products/${id}/signals`),
  preview:(items:{id:string;version:number}[],command:Omit<ProductModerationCommand,'version'|'requestId'>)=>request<BulkPreview>('/admin/products/bulk/preview',{method:'POST',body:{items,command}}),
  createJob:(previewId:string)=>request<BulkJob>('/admin/products/bulk/jobs',{method:'POST',body:{previewId}}),
  job:(id:string,run=false)=>request<BulkJob>(`/admin/products/bulk/jobs/${id}${run?'/run':''}`,run?{method:'POST',body:{}}:undefined),
  sellerRead:(id:string)=>request<ModerationData>(`/seller/products/${id}/moderation`),
  sellerCommand:(id:string,body:{action:string;decisionId:string;version:number;reason:string;evidence:string[];requestId:string})=>request(`/seller/products/${id}/moderation`,{method:'POST',body}),
  report:(id:string,body:{reasonCode:string;reason:string;evidence:string[];requestId:string})=>request(`/products/${id}/reports`,{method:'POST',body}),
};
