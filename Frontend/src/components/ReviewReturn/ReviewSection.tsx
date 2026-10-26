import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { reviewApi, type Review } from '../../api/reviewReturnApi';

export default function ReviewSection({productId}:{productId:string}){
  const itemId=new URLSearchParams(window.location.search).get('reviewItem');
  const [reviews,setReviews]=useState<Review[]>([]),[mine,setMine]=useState<Review[]>([]);
  const [page,setPage]=useState(1),[ratingFilter,setRatingFilter]=useState(0),[sort,setSort]=useState('newest');
  const [total,setTotal]=useState(0),[average,setAverage]=useState(0);
  const [rating,setRating]=useState(5),[title,setTitle]=useState(''),[content,setContent]=useState('');
  const [files,setFiles]=useState<File[]>([]),[busy,setBusy]=useState(false);
  const [editing,setEditing]=useState<Review|null>(null);
  const reload=useCallback(async()=>{
    const result=await reviewApi.list(productId,{page,...(ratingFilter?{rating:ratingFilter}:{}),sort});
    setReviews(result.reviews);setTotal(result.total);setAverage(result.summary.averageRating);
    reviewApi.mine(productId).then(data=>setMine(data.reviews)).catch(()=>setMine([]));
  },[productId,page,ratingFilter,sort]);
  useEffect(()=>{void reload().catch(error=>toast.error(error instanceof Error?error.message:'Không thể tải đánh giá.'));},
    [reload]);
  function startEdit(review:Review){setEditing(review);setRating(review.rating);setTitle(review.title);setContent(review.content);}
  async function save(){
    if(!itemId&&!editing)return;
    setBusy(true);
    try{
      const result=editing?await reviewApi.edit(editing.id,{expectedVersion:editing.version,rating,title,content})
        :await reviewApi.create({orderItemId:itemId!,rating,title,content});
      for(const file of files) await reviewApi.upload(result.review.id,file);
      setEditing(null);setFiles([]);setTitle('');setContent('');await reload();
      toast.success('Đã lưu đánh giá.');
    }catch(error){toast.error(error instanceof Error?error.message:'Không thể lưu đánh giá.');}
    finally{setBusy(false);}
  }
  return <section className="mt-6 rounded-2xl border border-[#e8edf5] bg-white p-6">
    <h2 className="text-xl font-bold">Đánh giá sản phẩm</h2>
    <p className="mt-2 text-sm">{total} đánh giá · {total?`${average.toFixed(1)} / 5 sao`:'Chưa có đánh giá'}</p>
    {(itemId||editing)&&<div className="mt-5 grid gap-3 rounded-xl bg-[#f6f8fc] p-4">
      <h3 className="font-semibold">{editing?'Sửa đánh giá':'Đánh giá đơn đã mua'}</h3>
      <select value={rating} onChange={e=>setRating(Number(e.target.value))} className="rounded-lg border p-2" aria-label="Số sao">
        {[5,4,3,2,1].map(star=><option key={star} value={star}>{star} sao</option>)}</select>
      <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={120} placeholder="Tiêu đề (3–120 ký tự)" className="rounded-lg border p-2" />
      <textarea value={content} onChange={e=>setContent(e.target.value)} maxLength={2000} rows={3}
        placeholder="Nội dung (10–2000 ký tự, không nhập thông tin liên hệ)" className="rounded-lg border p-2" />
      <label className="text-sm">Ảnh minh họa (tối đa 3 ảnh, mỗi ảnh 2 MB)
        <input type="file" accept="image/png,image/jpeg,image/webp" multiple
          onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,3))} className="block mt-1" /></label>
      <div><button disabled={busy} onClick={()=>void save()} className="rounded-lg bg-[#476de4] px-4 py-2 font-semibold text-white disabled:opacity-50">{busy?'Đang lưu':'Gửi đánh giá'}</button>
        {editing&&<button onClick={()=>setEditing(null)} className="ml-2 rounded-lg border px-4 py-2">Hủy sửa</button>}</div>
    </div>}
    <div className="mt-5 flex gap-2"><select value={ratingFilter} onChange={e=>{setRatingFilter(Number(e.target.value));setPage(1);}} className="rounded-lg border p-2" aria-label="Lọc sao">
      <option value={0}>Tất cả sao</option>{[5,4,3,2,1].map(star=><option key={star} value={star}>{star} sao</option>)}</select>
      <select value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}} className="rounded-lg border p-2" aria-label="Sắp xếp">
        <option value="newest">Mới nhất</option><option value="helpful">Hữu ích nhất</option></select></div>
    {reviews.map(review=><article key={review.id} className="mt-4 border-t pt-4">
      <strong>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)} · {review.title}</strong>
      <p className="mt-1 whitespace-pre-wrap text-sm">{review.content}</p>
      <p className="mt-1 text-xs text-[#70819d]">Đã mua hàng · {new Date(review.createdAt).toLocaleDateString('vi-VN')}</p>
      {!!review.images?.length&&<div className="mt-2 flex gap-2">{review.images.map(image=><img key={image.id}
        src={reviewApi.imageUrl(image.url)} alt="Ảnh đánh giá" className="h-20 w-20 rounded-lg object-cover" />)}</div>}
      {review.reply&&<p className="mt-2 rounded-lg bg-[#f6f8fc] p-2 text-sm"><strong>Shop: </strong>{review.reply.content}</p>}
      <div className="mt-2 flex gap-3 text-sm text-[#476de4]"><button onClick={()=>void reviewApi.helpful(review.id).then(reload).catch(error=>toast.error(error.message))}>Hữu ích ({review.helpfulCount})</button>
        {mine.some(own=>own.id===review.id)&&<button onClick={()=>startEdit(mine.find(own=>own.id===review.id)!)}>Sửa</button>}
        </div>
    </article>)}
    <div className="mt-5 flex gap-3"><button disabled={page<=1} onClick={()=>setPage(page-1)}>Trước</button>
      <span>{page} / {Math.max(1,Math.ceil(total/10))}</span>
      <button disabled={page*10>=total} onClick={()=>setPage(page+1)}>Sau</button></div>
    {!itemId&&<p className="mt-4 text-xs text-[#70819d]">Để viết đánh giá, mở sản phẩm từ đơn hàng đã giao.</p>}
    <Link to="/orders" className="mt-2 inline-block text-sm text-[#476de4]">Xem đơn hàng của tôi</Link>
  </section>;
}
