import {authorizedRequest} from './identityApi';
const base=import.meta.env.VITE_CATALOG_API_URL||'http://localhost:5102';
const request=<T>(path:string,options?:{method?:string;body?:unknown})=>authorizedRequest<T>(`${base}/api/v2${path}`,options);
export type TaxCategory={id:string;parentId:string|null;name:string;slug:string;description:string;sortOrder:number;isActive:boolean;iconKey:string|null;imageKey:string|null;version:number;productCount:number;childCount:number};
export type CategoryInput=Omit<TaxCategory,'id'|'version'|'productCount'|'childCount'>;
export type AttributeDefinition={code:string;label:string;type:'text'|'number'|'boolean'|'enum';required:boolean;unit:string;allowedValues:string[]};
export type AttributeSchema={category_id:string;definitions:AttributeDefinition[];legacy_policy:'ON_EDIT'|'NEW_ONLY';version:number;updated_at:string};
export type TaxBrand={id:string;name:string;logo_url:string|null;status:'ACTIVE'|'INACTIVE'|'MERGED';merged_into:string|null;aliases:string[];products:number;version:number};
export type TaxAudit={id:string;action:string;target_id:string|null;reason:string;before_data:unknown;after_data:unknown;impact:Record<string,unknown>;created_at:string};
export type TaxonomyData={stateVersion:number;storefrontVersion:number;categories:TaxCategory[];aliases:{slug:string;category_id:string}[];brands:TaxBrand[];schemas:AttributeSchema[];history:TaxAudit[]};
export type TaxCommand={action:string;id?:string;version:number;reason:string;requestId:string;category?:CategoryInput;replacementId?:string;definitions?:AttributeDefinition[];legacyPolicy?:string;brand?:{name:string;aliases:string[];logoUrl:string|null;status:string}};
export type TaxImpact={productCount:number;sellingProducts?:number;blockedProducts?:number;descendantCount?:number;directChildren?:number;attributeSchemaCount?:number;reapprovalRequired?:boolean;targetAttributeGaps?:number;retiring?:boolean;missingProducts?:number;samples?:{id:string;errors:{field:string;message:string}[]}[];draftReferences?:{path:string;label:string;enabled:boolean}[];publishedReferences?:{path:string;label:string;enabled:boolean}[];before?:unknown};
export type TaxPreview={id:string;command:TaxCommand;impact:TaxImpact;stateVersion:number;storefrontVersion:number};
export type CsvImport={id:string;kind:string;filename:string;status:'INVALID'|'PREVIEWED'|'APPLIED';row_count:number;plan?:unknown[];errors:{line:number;message:string}[];created_at:string;applied_at?:string};
export const taxonomyApi={
  read:()=>request<TaxonomyData>('/admin/taxonomy'),
  preview:(body:TaxCommand)=>request<TaxPreview>('/admin/taxonomy/preview',{method:'POST',body}),
  commit:(previewId:string)=>request<{result:{id?:string};stateVersion:number}>('/admin/taxonomy/commit',{method:'POST',body:{previewId}}),
  imports:()=>request<{items:CsvImport[]}>('/admin/taxonomy/imports'),
  previewCsv:(body:{kind:string;csv:string;filename:string;version:number;reason:string;requestId:string})=>request<CsvImport>('/admin/taxonomy/imports/preview',{method:'POST',body}),
  commitCsv:(importId:string)=>request<{id:string;status:'APPLIED';applied:number}>('/admin/taxonomy/imports/commit',{method:'POST',body:{importId}}),
  seller:(id:string)=>request<{schema:AttributeSchema|null;values:Record<string,unknown>;errors:{field:string;message:string}[];notices:{id:string;body:string;created_at:string}[]}>(`/seller/products/${id}/taxonomy`),
  schema:async(categoryId:string)=>{const response=await fetch(`${base}/api/v2/categories/${categoryId}/attributes`);if(!response.ok)throw Error('Không tải được bộ thuộc tính.');return response.json() as Promise<{schema:AttributeSchema|null}>;},
  brands:async()=>{const response=await fetch(`${base}/api/v2/brands`);if(!response.ok)throw Error('Không tải được thương hiệu.');return response.json() as Promise<{items:{id:string;name:string;logo_url:string|null;aliases:string[]}[]}>;},
  resolve:async(slug:string)=>{const response=await fetch(`${base}/api/v2/categories/resolve?${new URLSearchParams({slug})}`);if(!response.ok)throw Error('Danh mục không tồn tại hoặc đã ngừng hoạt động.');return response.json() as Promise<{category:TaxCategory;redirected:boolean;canonicalPath:string}>;},
};
