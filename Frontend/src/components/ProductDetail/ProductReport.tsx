import {useEffect,useRef,useState,type FormEvent} from 'react';
import {productModerationApi as api} from '../../api/productModerationApi';
import {adminRequestId} from '../../api/adminCommand';
export default function ProductReport({productId}:{productId:string}){
  const [open,setOpen]=useState(false),[rules,setRules]=useState<{code:string;label:string}[]>([]),[code,setCode]=useState(''),[reason,setReason]=useState(''),[evidence,setEvidence]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const attempt=useRef({signature:'',requestId:''});
  useEffect(()=>{if(open)api.reportReasons().then(r=>setRules(r.items)).catch(e=>setMessage(e.message));},[open]);
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage('');const input={reasonCode:code,reason,evidence:evidence.split('\n').map(s=>s.trim()).filter(Boolean)};
    try{await api.report(productId,{...input,requestId:adminRequestId(attempt.current,input)});setMessage('Đã gửi báo cáo để sàn kiểm tra.');setOpen(false);setReason('');}
    catch(e){setMessage(e instanceof Error?e.message:'Không thể gửi báo cáo.');}finally{setBusy(false);}}
  return <div className="mt-4 text-sm"><button type="button" className="text-slate-600 underline" onClick={()=>setOpen(v=>!v)}>Báo cáo sản phẩm vi phạm</button>{message&&<p role="status">{message}</p>}{open&&<form className="mt-3 grid gap-3 rounded-xl border p-4" onSubmit={submit}>
    <label>Loại vi phạm<select className="ml-2 rounded border p-2" required value={code} onChange={e=>setCode(e.target.value)}><option value="">Chọn lý do</option>{rules.map(r=><option key={r.code} value={r.code}>{r.label}</option>)}</select></label>
    <label>Mô tả<textarea className="mt-1 w-full rounded border p-2" required minLength={8} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>
    <label>Bằng chứng (mỗi dòng một liên kết)<textarea className="mt-1 w-full rounded border p-2" value={evidence} onChange={e=>setEvidence(e.target.value)}/></label><button className="rounded bg-blue-600 p-2 text-white" disabled={busy}>{busy?'Đang gửi…':'Gửi báo cáo'}</button>
  </form>}</div>;
}
