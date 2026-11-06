import {useEffect,useRef,useState,type FormEvent} from 'react';
import type {CatalogItem} from '../../api/catalogApi';
import {productModerationApi as api,type ModerationData} from '../../api/productModerationApi';
import {adminRequestId} from '../../api/adminCommand';
export default function ProductModerationPanel({product,reload}:{product:CatalogItem;reload:()=>Promise<unknown>}){
  const [data,setData]=useState<ModerationData|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[action,setAction]=useState('appeal'),[decisionId,setDecisionId]=useState(''),[reason,setReason]=useState(''),[evidence,setEvidence]=useState('');
  const [revision,setRevision]=useState(0),attempt=useRef({signature:'',requestId:''});
  useEffect(()=>{let active=true;api.sellerRead(product.id).then(data=>{if(active)setData(data);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[product.id,product.version,revision]);
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNotice('');
    const input={action,decisionId,reason,version:product.version,evidence:evidence.split('\n').map(s=>s.trim()).filter(Boolean)};
    try{await api.sellerCommand(product.id,{...input,requestId:adminRequestId(attempt.current,input)});setNotice(action==='appeal'?'Đã gửi kháng nghị.':'Đã gửi xác nhận khắc phục, chờ sàn kiểm tra.');setReason('');setRevision(v=>v+1);await reload();}
    catch(e){setError(e instanceof Error?e.message:'Không thể gửi yêu cầu.');}finally{setBusy(false);}}
  return <section className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Kiểm duyệt và thông báo của sàn</h2>
    {product.reviewStatus&&['PENDING','NEEDS_CHANGES'].includes(product.reviewStatus)&&<p className="my-3 rounded-xl bg-amber-50 p-3 text-amber-800">{product.reviewStatus==='PENDING'?'Sản phẩm đang chờ sàn duyệt trước khi xuất hiện công khai.':'Sản phẩm cần chỉnh sửa trước khi được duyệt đăng bán.'} Thay đổi tên, ảnh, danh mục, mô tả, thương hiệu, giá, biến thể hoặc thuộc tính cần được duyệt lại.</p>}
    {product.platformSuspended&&<p className="my-3 rounded-xl bg-red-50 p-3 text-red-700">Sản phẩm đang bị sàn chặn: {product.suspensionReason}. Trạng thái seller trước khi chặn: {product.publicationStatus}. Sửa nội dung không tự khôi phục đăng bán.</p>}
    {error&&<p role="alert" className="text-red-700">{error}<button type="button" className="ml-3 underline" onClick={()=>{setError('');setRevision(v=>v+1);}}>Tải lại</button></p>}{notice&&<p role="status">{notice}</p>}
    {data?.notices.map(n=><article className="my-3 border-b pb-3" key={n.id}><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.created_at).toLocaleString('vi-VN')}</small></article>)}
    {data?.decisions.map(d=><article className="my-3 border-b pb-3" key={d.id}><strong>#{d.id.slice(0,8)} · {d.reason_code} · {d.action}</strong><p>{d.reason}</p><small>Phiên bản được xét: {d.product_version}{d.remedy_by&&` · Hạn khắc phục: ${new Date(d.remedy_by).toLocaleString('vi-VN')}`}</small><div>{d.evidence.map(url=><a key={url} href={url} target="_blank" rel="noreferrer" className="mr-3 underline">Bằng chứng</a>)}</div></article>)}
    {data?.appeals.map(a=><p key={a.id}>Kháng nghị #{a.id.slice(0,8)} · {a.status} · {a.reason}</p>)}
    {!!data?.decisions.some(d=>['suspend','request_changes','publication_changes_requested'].includes(d.action))&&<form className="mt-4 grid gap-3" onSubmit={submit}>
      <label>Yêu cầu<select className="ml-2 rounded border p-2" value={action} onChange={e=>{setAction(e.target.value);setDecisionId('');}}><option value="appeal">Kháng nghị quyết định</option><option value="submit_remedy">Xác nhận đã chỉnh sửa</option></select></label>
      <label>Quyết định<select required className="ml-2 max-w-full rounded border p-2" value={decisionId} onChange={e=>setDecisionId(e.target.value)}><option value="">Chọn quyết định</option>{data.decisions.filter(d=>action==='appeal'?['suspend','request_changes','publication_changes_requested'].includes(d.action)&&!data.appeals.some(a=>a.decision_id===d.id):data.remedies.some(r=>r.decision_id===d.id&&['OPEN','SUBMITTED'].includes(r.status))).map(d=><option key={d.id} value={d.id}>#{d.id.slice(0,8)} · {d.reason_code}</option>)}</select></label>
      <label>Nội dung giải thích<textarea className="mt-1 w-full rounded border p-2" required minLength={8} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>
      <label>Bằng chứng (mỗi dòng một liên kết HTTP/HTTPS)<textarea className="mt-1 w-full rounded border p-2" value={evidence} onChange={e=>setEvidence(e.target.value)}/></label>
      <button className="rounded-xl bg-[#476de4] px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={busy}>{busy?'Đang gửi…':'Gửi yêu cầu'}</button>
    </form>}{!data?.decisions.length&&!error&&<p className="mt-3 text-sm text-slate-500">Chưa có quyết định kiểm duyệt.</p>}
  </section>;
}
