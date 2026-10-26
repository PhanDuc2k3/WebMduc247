import { authorizedRequest, authorizedBlobRequest } from './identityApi';

const engagement=import.meta.env.VITE_ENGAGEMENT_API_URL||'http://localhost:5105';
const order=import.meta.env.VITE_ORDER_API_URL||'http://localhost:5103';
const url=(base:string,path:string)=>`${base}/api/v2${path}`;
const req=<T>(base:string,path:string,method='GET',body?:unknown)=>
  authorizedRequest<T>(url(base,path),{method,...(body===undefined?{}:{body})});
export type Review={id:string;productId:string;rating:number;title:string;content:string;
  version:number;helpfulCount:number;createdAt:string;images:{id:string;url:string}[];
  reply:{content:string;createdAt:string}|null};
export type ReturnRequest={id:string;shopOrderId:string;storeId:string;status:string;version:number;
  reason:string;reasonCode:string;resolution:string;eligibleRefundMinor:number;shippingRefundMinor:number;
  sellerResponse:string|null;adminResponse?:string|null;items?:{orderItemId:string;name:string;quantity:number;eligibleRefundMinor:number}[];
  evidence?:{id:string;url:string}[];history?:{toStatus:string;note:string;createdAt:string}[]};
export const reviewApi={
  list:async(productId:string,filters:{page?:number;rating?:number;sort?:string}={})=>{
    const query=new URLSearchParams(Object.entries(filters).map(([k,v])=>[k,String(v)]));
    const response=await fetch(url(engagement,`/products/${productId}/reviews?${query}`));
    const data=await response.json();if(!response.ok) throw new Error(data.message||'Không thể tải đánh giá.');
    return data as {page:number;limit:number;total:number;summary:{averageRating:number;reviewCount:number};reviews:Review[]};
  },
  create:(input:{orderItemId:string;rating:number;title:string;content:string})=>
    req<{review:Review}>(engagement,'/reviews','POST',input),
  mine:(productId:string)=>req<{reviews:Review[]}>(engagement,`/reviews/mine?productId=${encodeURIComponent(productId)}`),
  sellerList:(storeId:string)=>req<{reviews:Review[]}>(engagement,`/seller/stores/${storeId}/reviews`),
  edit:(id:string,input:{expectedVersion:number;rating:number;title:string;content:string})=>
    req<{review:Review}>(engagement,`/reviews/${id}`,'PATCH',input),
  helpful:(id:string)=>req<{helpfulCount:number}>(engagement,`/reviews/${id}/helpful`,'POST',{}),
  reply:(id:string,content:string)=>req(engagement,`/seller/reviews/${id}/reply`,'POST',{content}),
  upload:(id:string,file:File)=>authorizedRequest<{image:{id:string;url:string}}>(url(engagement,`/reviews/${id}/images`),
    {method:'POST',body:file,contentType:file.type}),
  imageUrl:(path:string)=>url(engagement,path.replace(/^\/api\/v2/,'')),
};
export const returnApi={
  buyerList:(shopOrderId?:string)=>req<{returns:ReturnRequest[]}>(order,
    `/returns${shopOrderId?`?shopOrderId=${encodeURIComponent(shopOrderId)}`:''}`),
  sellerList:(storeId:string,shopOrderId?:string)=>req<{returns:ReturnRequest[]}>(order,
    `/seller/stores/${storeId}/returns${shopOrderId?`?shopOrderId=${encodeURIComponent(shopOrderId)}`:''}`),
  detail:(id:string)=>req<{returnRequest:ReturnRequest}>(order,`/returns/${id}`),
  create:(shopOrderId:string,input:{reason:string;reasonCode:string;resolution:'REFUND';
    items:{orderItemId:string;quantity:number}[]})=>
    req<{returnRequest:ReturnRequest}>(order,`/orders/${shopOrderId}/returns`,'POST',input),
  command:(id:string,action:'review'|'approve'|'reject'|'ship'|'receive'|'close',
    expectedVersion:number,response?:string,inspection?:{inspectionCondition:string;inspectionNote:string})=>
    req<{returnRequest:ReturnRequest}>(order,
      `${['review','approve','reject','receive'].includes(action)?'/seller':''}/returns/${id}/${action}`,
      'POST',{expectedVersion,...(response?{response}:{}),...inspection}),
  upload:(id:string,file:File)=>authorizedRequest<{evidence:{id:string;url:string}}>(url(order,`/returns/${id}/evidence`),
    {method:'POST',body:file,contentType:file.type}),
  evidence:(id:string,imageId:string)=>authorizedBlobRequest(url(order,`/returns/${id}/evidence/${imageId}`)),
};
