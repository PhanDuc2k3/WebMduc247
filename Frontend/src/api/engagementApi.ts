import { authorizedRequest } from "./identityApi";
const base=import.meta.env.VITE_ENGAGEMENT_API_URL||"http://localhost:5105";
async function publicRequest<T>(path:string):Promise<T>{
  const response=await fetch(`${base}/api/v2${path}`);
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.message||"Không thể tải khuyến mãi.");
  return data as T;
}
const request=<T>(path:string,options:{ method?:string;body?:unknown }={})=>
  authorizedRequest<T>(`${base}/api/v2${path}`,options);
export type Campaign={ id:string;storeId:string|null;type:"VOUCHER"|"FLASH_SALE";
  status:"DRAFT"|"ACTIVE"|"PAUSED"|"ENDED";fundingSource:"SELLER"|"PLATFORM";
  title:string;startsAt:string;endsAt:string;createdAt:string };
export type Voucher={ id:string;code:string;discountType:"FIXED"|"PERCENT";
  discountValue:number;maxDiscountMinor:number|null;minSpendMinor:number;
  totalLimit:number;perUserLimit:number;usedCount:number;reservedCount:number;
  scopeType:"STORE"|"CATEGORY"|"SKU"|"PLATFORM";scopeId:string|null;
  segment:"ALL"|"FIRST_ORDER";stackable:boolean };
export type FlashSaleItem={ campaignId:string;title:string;storeId:string;variantId:string;
  productId:string;productName:string;imageUrl:string|null;salePriceMinor:number;
  regularPriceMinor:number;quota:number;soldCount:number;reservedCount:number;
  availableStock:number;
  startsAt:string;endsAt:string };
export const engagementApi={
  active:()=>publicRequest<{ serverTime:string;promotions:Array<{ campaign:Campaign;voucher:Voucher }> }>("/promotions/active"),
  flashSales:()=>publicRequest<{ serverTime:string;items:FlashSaleItem[] }>("/flash-sales"),
  validate:(code:string)=>request<{ voucher:{ id:string;code:string;discountMinor:number };
    lines:Array<{ id:string;voucherDiscountMinor:number }>;serverTime:string }>(
    "/promotions/vouchers/validate",{method:"POST",body:{code}}),
  seller:(storeId:string)=>request<{ campaigns:Array<Campaign & { voucher?:Voucher;
    flashItems?:Array<{variantId:string;salePriceMinor:number;quota:number;soldCount:number;reservedCount:number}> }> }>(
    `/seller/stores/${storeId}/vouchers`),
  createVoucher:(storeId:string,input:Record<string,unknown>)=>
    request<{ campaign:Campaign;voucher:Voucher }>(`/seller/stores/${storeId}/vouchers`,
      {method:"POST",body:input}),
  createFlashSale:(storeId:string,input:Record<string,unknown>)=>
    request<{ campaign:Campaign;items:FlashSaleItem[] }>(`/seller/stores/${storeId}/flash-sales`,
      {method:"POST",body:input}),
  setStatus:(campaignId:string,status:"ACTIVE"|"PAUSED"|"ENDED")=>
    request<{ campaign:Campaign }>(`/seller/campaigns/${campaignId}/status`,
      {method:"PATCH",body:{status}}),
};
