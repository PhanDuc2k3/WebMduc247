import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {adminApprovalApi,type Approval} from '../../api/adminAccessApi';
import {money} from './AdminUi';
export default function ApprovalSelector({operation,targetId,version,value,onChange}:{operation:string;targetId:string;version:number;value:string;onChange:(id:string)=>void}){
  const [items,setItems]=useState<Approval[]>([]),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{let active=true;setItems([]);setError('');adminApprovalApi.list(operation).then(result=>{if(active)setItems(result.items.filter(a=>a.target_id===targetId&&a.snapshot.version===version&&a.status==='APPROVED'));}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Chưa tải được yêu cầu duyệt.');});return()=>{active=false;};},[operation,targetId,version,revision]);
  return <div className="pa-case-wide"><label>Yêu cầu đã được duyệt<select value={value} onChange={event=>onChange(event.target.value)}><option value="">Chọn yêu cầu nếu thao tác vượt ngưỡng</option>{items.map(item=><option key={item.id} value={item.id}>{money(item.snapshot.amountMinor)} · #{item.id.slice(0,8)} · Người duyệt {item.reviewed_by?.slice(0,8)}</option>)}</select></label><Link target="_blank" rel="noreferrer" to={`/admin/approvals?${new URLSearchParams({operation,targetId,version:String(version)})}`}>Lập hoặc xem yêu cầu phê duyệt</Link><button type="button" className="pa-text-link" onClick={()=>setRevision(v=>v+1)}>Tải lại yêu cầu đã duyệt</button>{error&&<p role="alert">{error}</p>}</div>;
}
