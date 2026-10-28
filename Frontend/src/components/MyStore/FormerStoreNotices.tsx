import {useEffect,useState} from 'react';
import {storeAdminApi} from '../../api/storeAdminApi';
export default function FormerStoreNotices(){
  const [data,setData]=useState<Awaited<ReturnType<typeof storeAdminApi.formerDecisions>>|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{let active=true;setError('');storeAdminApi.formerDecisions().then(result=>{if(active)setData(result);}).catch(()=>{if(active)setError('Chưa tải được thông báo cửa hàng đã chuyển quyền.');});return()=>{active=false;};},[retry]);
  if(error)return <p role="alert">{error} <button type="button" onClick={()=>setRetry(value=>value+1)}>Thử lại</button></p>;
  if(!data?.items.length)return null;
  return <details className="mb-6 rounded-xl border border-slate-200 bg-white p-4"><summary className="font-bold">Thông báo về cửa hàng đã chuyển quyền ({data.items.length})</summary>{data.items.map(item=><article key={item.id} className="my-3 border-t border-slate-200 pt-3"><strong>{item.store_name}</strong><p>{item.reason}</p><p className="text-sm text-slate-500">{item.scope}</p></article>)}</details>;
}
