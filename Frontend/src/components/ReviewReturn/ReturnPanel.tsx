import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { returnApi, type ReturnRequest } from '../../api/reviewReturnApi';
import { vnd, type ShopOrderV2 } from '../../api/orderV2Api';
import CaseInformationPanel from './CaseInformationPanel';
import CaseResolutionPanel from './CaseResolutionPanel';

const names:Record<string,string>={REQUESTED:'Đã yêu cầu',UNDER_REVIEW:'Đang xem xét',
  APPROVED:'Đã chấp nhận',REJECTED:'Đã từ chối',RETURNING:'Đang gửi trả',RECEIVED:'Shop đã nhận',
  REFUND_PENDING:'Đang hoàn tiền',REFUNDED:'Đã hoàn tiền',CLOSED:'Đã đóng'};
export default function ReturnPanel({order,seller=false}:{order:ShopOrderV2;seller?:boolean}){
  const [requests,setRequests]=useState<ReturnRequest[]>([]),[details,setDetails]=useState<Record<string,ReturnRequest>>({});
  const [itemId,setItemId]=useState(order.items?.[0]?.id||''),[quantity,setQuantity]=useState(1);
  const [reasonCode,setReasonCode]=useState('DAMAGED'),[reason,setReason]=useState('');
  const [response,setResponse]=useState(''),[files,setFiles]=useState<File[]>([]),[busy,setBusy]=useState(false);
  const [receiptId,setReceiptId]=useState<string|null>(null),[inspectionCondition,setInspectionCondition]=useState('ACCEPTED'),[inspectionNote,setInspectionNote]=useState('');
  const reload=useCallback(async()=>{
    const result=seller?await returnApi.sellerList(order.storeId,order.id):await returnApi.buyerList(order.id);
    const own=result.returns.filter(row=>row.shopOrderId===order.id);setRequests(own);
    const loaded=await Promise.all(own.map(row=>returnApi.detail(row.id).then(data=>data.returnRequest)));
    setDetails(Object.fromEntries(loaded.map(row=>[row.id,row])));
  },[seller,order.id,order.storeId]);
  useEffect(()=>{void reload().catch(error=>toast.error(error instanceof Error?error.message:'Không thể tải yêu cầu trả hàng.'));},
    [reload]);
  async function create(){
    setBusy(true);try{
      const result=await returnApi.create(order.id,{reasonCode,reason,resolution:'REFUND',
        items:[{orderItemId:itemId,quantity}]});
      for(const file of files) await returnApi.upload(result.returnRequest.id,file);
      setReason('');setFiles([]);await reload();toast.success('Đã gửi yêu cầu trả hàng.');
    }catch(error){toast.error(error instanceof Error?error.message:'Không thể gửi yêu cầu.');}
    finally{setBusy(false);}
  }
  async function command(row:ReturnRequest,action:'review'|'approve'|'reject'|'ship'|'receive'|'close'){
    setBusy(true);try{await returnApi.command(row.id,action,row.version,response,action==='receive'?{inspectionCondition,inspectionNote}:undefined);setResponse('');setReceiptId(null);setInspectionNote('');await reload();
      toast.success('Đã cập nhật yêu cầu.');}
    catch(error){toast.error(error instanceof Error?error.message:'Không thể cập nhật.');}
    finally{setBusy(false);}
  }
  async function openEvidence(id:string,imageId:string){
    try{const blob=await returnApi.evidence(id,imageId),url=URL.createObjectURL(blob);
      window.open(url,'_blank','noopener,noreferrer');window.setTimeout(()=>URL.revokeObjectURL(url),60000);}
    catch(error){toast.error(error instanceof Error?error.message:'Không thể mở chứng cứ.');}
  }
  return <><section className="mt-5 rounded-xl border border-[#dce3ee] p-4">
    <h3 className="font-bold">Trả hàng / hoàn tiền</h3>
    {!seller&&['DELIVERED','COMPLETED'].includes(order.status)&&!!order.items?.length&&<div className="mt-3 grid gap-2">
      <select value={itemId} onChange={e=>setItemId(e.target.value)} className="rounded-lg border p-2" aria-label="Sản phẩm trả">
        {order.items.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <input type="number" min={1} max={order.items.find(item=>item.id===itemId)?.quantity||1}
        value={quantity} onChange={e=>setQuantity(Number(e.target.value))} className="w-24 rounded-lg border p-2" aria-label="Số lượng trả" />
      <select value={reasonCode} onChange={e=>setReasonCode(e.target.value)} className="rounded-lg border p-2" aria-label="Lý do">
        <option value="DAMAGED">Hàng hỏng</option><option value="WRONG_ITEM">Giao sai hàng</option>
        <option value="NOT_AS_DESCRIBED">Khác mô tả</option><option value="OTHER">Lý do khác</option></select>
      <textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000} rows={2}
        placeholder="Mô tả lý do (10–1000 ký tự)" className="rounded-lg border p-2" />
      <label className="text-sm">Ảnh chứng cứ (tối đa 6 ảnh, mỗi ảnh 2 MB)
        <input type="file" accept="image/png,image/jpeg,image/webp" multiple
          onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,6))} className="mt-1 block" /></label>
      <div><button disabled={busy} onClick={()=>void create()} className="rounded-lg border border-[#476de4] px-4 py-2 font-semibold text-[#476de4] disabled:opacity-50">Gửi yêu cầu</button></div>
      <p className="text-xs text-[#70819d]">Trong 7 ngày sau giao hàng. Tiền sản phẩm tính theo giá đã giảm; phí giao hàng chỉ hoàn khi trả toàn bộ đơn trong một yêu cầu vì hàng hỏng hoặc giao sai.</p>
    </div>}
    {requests.map(row=>{const detail=details[row.id]||row;return <article key={row.id} className="mt-4 border-t pt-3 text-sm">
      <strong>#{row.id.slice(0,8)} · {order.paymentMethod==='COD'&&row.status==='REFUND_PENDING'
        ?'Chờ xử lý hoàn COD':names[row.status]||row.status}</strong>
      <p className="mt-1">{row.reason}</p><p>Hoàn tối đa: {vnd(row.eligibleRefundMinor)}</p>
      {row.sellerResponse&&<p>Shop: {row.sellerResponse}</p>}
      {row.adminResponse&&<p>Phản hồi của sàn: {row.adminResponse}</p>}
      {detail.items?.map(item=><p key={item.orderItemId}>{item.name} × {item.quantity} · {vnd(item.eligibleRefundMinor)}</p>)}
      {detail.evidence?.map(image=><button key={image.id} onClick={()=>void openEvidence(row.id,image.id)}
        className="mr-2 text-[#476de4] underline">Xem ảnh chứng cứ</button>)}
      {detail.history?.map((event,index)=><p key={index} className="text-xs text-[#70819d]">
        {new Date(event.createdAt).toLocaleString('vi-VN')} · {names[event.toStatus]||event.toStatus}</p>)}
      {seller&&['UNDER_REVIEW'].includes(row.status)&&<textarea value={response}
        onChange={e=>setResponse(e.target.value)} className="mt-2 w-full rounded-lg border p-2" maxLength={1000}
        placeholder="Phản hồi seller (ít nhất 10 ký tự)" />}
      <div className="mt-2 flex flex-wrap gap-2">
        {seller&&row.status==='REQUESTED'&&<button disabled={busy} onClick={()=>void command(row,'review')} className="rounded-lg border px-3 py-1">Bắt đầu xem xét</button>}
        {seller&&row.status==='UNDER_REVIEW'&&<><button disabled={busy} onClick={()=>void command(row,'approve')} className="rounded-lg border px-3 py-1">Chấp nhận</button>
          <button disabled={busy} onClick={()=>void command(row,'reject')} className="rounded-lg border px-3 py-1">Từ chối</button></>}
        {!seller&&row.status==='APPROVED'&&<button disabled={busy} onClick={()=>void command(row,'ship')} className="rounded-lg border px-3 py-1">Đã gửi hàng trả</button>}
        {seller&&row.status==='RETURNING'&&<button disabled={busy} onClick={()=>{setReceiptId(row.id);setInspectionCondition('ACCEPTED');setInspectionNote('');}} className="rounded-lg border px-3 py-1">Ghi nhận hàng trả và kiểm tra</button>}
        {!seller&&['REFUNDED','REJECTED'].includes(row.status)&&<button disabled={busy} onClick={()=>void command(row,'close')} className="rounded-lg border px-3 py-1">Đóng yêu cầu</button>}
      </div>
      {seller&&receiptId===row.id&&<form className="mt-3 grid gap-2 rounded border bg-blue-50 p-3" onSubmit={event=>{event.preventDefault();void command(row,'receive');}}><p>Chỉ xác nhận khi đã nhận hàng thực tế. Kết quả chấp nhận sẽ mở luồng hoàn tiền, chưa xác nhận tiền đã chuyển.</p><label>Kết quả kiểm tra<select className="ml-2 rounded border p-2" value={inspectionCondition} onChange={event=>setInspectionCondition(event.target.value)}><option value="ACCEPTED">Chấp nhận hàng trả</option><option value="ISSUE_FOUND">Có vấn đề cần sàn xác minh, chưa mở hoàn tiền</option></select></label><label>Ghi chú kiểm tra<textarea required minLength={10} maxLength={1000} className="mt-1 w-full rounded border p-2" value={inspectionNote} onChange={event=>setInspectionNote(event.target.value)}/></label><div className="flex gap-2"><button type="button" disabled={busy} onClick={()=>setReceiptId(null)} className="rounded border px-3 py-1">Hủy</button><button disabled={busy||inspectionNote.trim().length<10} className="rounded border px-3 py-1">Xác nhận đã nhận và kiểm tra</button></div></form>}
    </article>})}
  </section><CaseInformationPanel shopOrderId={order.id}/><CaseResolutionPanel shopOrderId={order.id}/></>;
}
