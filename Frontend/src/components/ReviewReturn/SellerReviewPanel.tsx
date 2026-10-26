import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { reviewApi, type Review } from '../../api/reviewReturnApi';

export default function SellerReviewPanel({storeId}:{storeId:string}){
  const [reviews,setReviews]=useState<Review[]>([]),[drafts,setDrafts]=useState<Record<string,string>>({});
  const reload=useCallback(async()=>{setReviews((await reviewApi.sellerList(storeId)).reviews);},[storeId]);
  useEffect(()=>{void reload().catch(()=>{});},[reload]);
  async function reply(id:string){
    try{await reviewApi.reply(id,drafts[id]||'');await reload();toast.success('Đã phản hồi đánh giá.');}
    catch(error){toast.error(error instanceof Error?error.message:'Không thể phản hồi.');}
  }
  return <section className="mt-5 rounded-2xl border border-[#e6ebf5] bg-white p-5">
    <h2 className="text-xl font-bold">Đánh giá cửa hàng</h2>
    {reviews.map(row=><article key={row.id} className="mt-3 border-t pt-3 text-sm">
      <p><strong>{'★'.repeat(row.rating)} · {row.title}</strong></p><p>{row.content}</p>
      {row.reply?<p className="mt-2">Shop: {row.reply.content}</p>:<div className="mt-2 flex gap-2">
        <input value={drafts[row.id]||''} onChange={e=>setDrafts({...drafts,[row.id]:e.target.value})}
          className="min-w-0 flex-1 rounded-lg border p-2" maxLength={1000} placeholder="Phản hồi (3–1000 ký tự)" />
        <button onClick={()=>void reply(row.id)} className="rounded-lg border px-3">Gửi</button></div>}
    </article>)}
  </section>;
}
