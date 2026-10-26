import {authorizedRequest} from './identityApi';
import type {CategoryNode,CatalogItem,CatalogStore} from './catalogApi';
export type NavigationItem={id:string;label:string;targetUrl:string;enabled:boolean};
export type FeaturedCategory=NavigationItem&{categoryId:string|null;icon:string;tone:string};
export type HeroBanner={id:string;title:string;kicker:string;description:string;imageUrl:string;imageAlt:string;targetUrl:string;buttonText:string;tone:'blue'|'purple'|'cyan';enabled:boolean};
export type SectionKey='hero'|'categories'|'flashSale'|'featuredProducts'|'featuredStores'|'suggestions';
export type HomeSection={id:string;key:SectionKey;title:string;eyebrow:string;enabled:boolean;limit:number};
export type StorefrontConfig={navigation:NavigationItem[];featuredCategories:FeaturedCategory[];banners:HeroBanner[];sections:HomeSection[];featuredProductIds:string[];featuredStoreIds:string[]};
export type HomeData={categories:CategoryNode[];featuredProducts:CatalogItem[];newestProducts:CatalogItem[];bestSellers:CatalogItem[];featuredStores:CatalogStore[];
  banners:{id:string;title:string;imageUrl:string|null;targetUrl:string}[];layout?:StorefrontConfig;storefrontConfigured?:boolean};
export type StorefrontState={draft:StorefrontConfig;published:StorefrontConfig|null;version:number;publishedAt:string|null;
  categories:{id:string;name:string;slug:string;parentId:string|null}[];
  references:{products:{id:string;name:string;status:string}[];stores:{id:string;name:string;status:string}[]};
  history:{id:string;actor_id:string;action:string;version:number;created_at:string;reason?:string;read_version?:number;correlation_id?:string}[]};
const base=import.meta.env.VITE_CATALOG_API_URL||'http://localhost:5102';
const admin=<T>(path:string,options?:{method?:string;body?:unknown})=>authorizedRequest<T>(`${base}/api/v2/admin/storefront${path}`,options);
export const storefrontApi={
  async publicConfig(){const response=await fetch(`${base}/api/v2/storefront`,{cache:'no-store'});if(!response.ok)throw Error('Chưa tải được bố cục.');return response.json() as Promise<{layout:StorefrontConfig;configured:boolean;version:number}>;},
  read:()=>admin<StorefrontState>(''),
  save:(config:StorefrontConfig,version:number,publish:boolean,reason:string,requestId:string)=>admin<{draft:StorefrontConfig;version:number;publishedAt:string|null;change:StorefrontState['history'][number]}>(publish?'/publish':'/draft',{method:'POST',body:{config,version,reason,requestId}}),
  preview:()=>admin<HomeData>('/preview'),
  choices:(resource:'products'|'stores',q:string)=>admin<{items:{id:string;name:string}[]}>(`/choices?${new URLSearchParams({resource,q})}`),
  createCategory:(body:{name:string;slug?:string;parentId:string|null;version:number;reason:string;requestId:string})=>admin<{category:{id:string;name:string;slug:string;parentId:string|null};version:number}>('/categories',{method:'POST',body}),
};
export function notifyStorefrontPublished(){
  window.dispatchEvent(new Event('storefrontPublished'));
  try{localStorage.setItem('mduc247.storefrontVersion',String(Date.now()));}catch{/* Publication still succeeds if web storage is unavailable. */}
}
