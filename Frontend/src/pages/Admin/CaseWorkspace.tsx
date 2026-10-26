import {useEffect,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {adminCaseApi,type CaseDetail} from '../../api/adminCaseApi';
import {useAdminSession} from './AdminSession';
import {date} from './AdminUi';
import './admin-cases.css';
import CaseResolutionWorkspace from './CaseResolutionWorkspace';

const localTime=(value:string)=>{const time=new Date(value);return new Date(time.getTime()-time.getTimezoneOffset()*60000).toISOString().slice(0,16);};
const errors=(cause:unknown)=>cause instanceof Error?cause.message:'Chưa thể xử lý hồ sơ.';
export default function CaseWorkspace({detail,refresh,onBusy}:{detail:CaseDetail;refresh:()=>void;onBusy?:(value:boolean)=>void}){
  const user=useAdminSession(),r=detail.record;
  const [staff,setStaff]=useState<{id:string;name:string}[]>([]),[staffError,setStaffError]=useState('');
  const [assignee,setAssignee]=useState(r.assigneeId||''),[deadline,setDeadline]=useState(localTime(new Date(r.dueAt).getTime()>Date.now()?r.dueAt:new Date(Date.now()+48*3600000).toISOString()));
  const [reason,setReason]=useState(''),[recipient,setRecipient]=useState('BUYER'),[prompt,setPrompt]=useState('');
  const [infoDue,setInfoDue]=useState(localTime(new Date(Date.now()+24*3600000).toISOString()));
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[stale,setStale]=useState(false);
  useEffect(()=>{let active=true;adminCaseApi.staff().then(data=>{if(active)setStaff(data.items);}).catch(cause=>{if(active)setStaffError(errors(cause));});return()=>{active=false;};},[]);
  useEffect(()=>{onBusy?.(busy);return()=>onBusy?.(false);},[busy,onBusy]);
  async function run(action:()=>Promise<unknown>){
    if(busy||stale)return;setBusy(true);setError('');
    try{await action();refresh();}catch(cause){setError(errors(cause));setStale(true);}finally{setBusy(false);}
  }
  function assign(event:FormEvent){event.preventDefault();void run(()=>adminCaseApi.assign(r.id,{assigneeId:assignee||null,dueAt:new Date(deadline).toISOString(),version:r.caseVersion,reason:reason.trim()}));}
  function claim(){void run(()=>adminCaseApi.assign(r.id,{assigneeId:user.id,dueAt:new Date(deadline).toISOString(),version:r.caseVersion,
    reason:'Nhận hồ sơ để xử lý; hạn xử lý theo thời điểm đã chọn trong biểu mẫu.'}));}
  function information(event:FormEvent){event.preventDefault();void run(()=>adminCaseApi.requestInformation(r.id,{recipientKind:recipient,prompt:prompt.trim(),dueAt:new Date(infoDue).toISOString(),version:r.caseVersion}));}
  const closed=['CLOSED','REJECTED','REFUNDED','RESOLVED','DECIDED'].includes(r.status);
  return <section className="pa-case-workspace">
    <h3>Phân công và hạn xử lý</h3><p className="pa-detail-muted">Người phụ trách: {staff.find(item=>item.id===r.assigneeId)?.name||r.assigneeId||'Chưa phân công'} · Hạn: {date(r.dueAt,true)}{new Date(r.dueAt).getTime()<Date.now()?' · Đã quá hạn':''}</p>
    {error&&<p className="pa-error" role="alert">{error}</p>}{stale&&<button className="pa-button pa-button-light" onClick={refresh}>Tải lại hồ sơ trước khi thử tiếp</button>}
    <form className="pa-case-form" onSubmit={assign}>
      <label>Người phụ trách<select value={assignee} onChange={event=>setAssignee(event.target.value)} disabled={busy}><option value="">Chưa phân công</option><option value={user.id}>Tôi — {user.fullName}</option>{staff.filter(item=>item.id!==user.id).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}{r.assigneeId&&r.assigneeId!==user.id&&!staff.some(item=>item.id===r.assigneeId)&&<option value={r.assigneeId}>{r.assigneeId}</option>}</select></label>
      <label>Hạn xử lý<input type="datetime-local" required value={deadline} onChange={event=>setDeadline(event.target.value)} disabled={busy}/></label>
      <label className="pa-case-wide">Lý do thay đổi<textarea required minLength={10} maxLength={500} value={reason} onChange={event=>setReason(event.target.value)} disabled={busy}/></label>
      {staffError&&<p className="pa-detail-muted">Không tải được danh sách nhân viên: {staffError}. Bạn vẫn có thể nhận hồ sơ cho mình.</p>}
      <div className="pa-case-wide pa-dialog-actions">{r.assigneeId!==user.id&&<button type="button" className="pa-button pa-button-light" disabled={busy||stale||!deadline} onClick={claim}>Nhận hồ sơ</button>}<button className="pa-button" disabled={busy||stale||reason.trim().length<10}>Lưu phân công và hạn</button></div>
    </form>
    <h3>Hồ sơ liên quan</h3><div className="pa-case-links">{detail.links.map(link=><Link key={link.id} to={link.kind==='RETURN'?`/admin/returns?id=${link.id}`:`/admin/cases?kind=${link.kind}&id=${link.id}`}>{link.kind==='RETURN'?'Trả hàng':link.kind==='TICKET'?'Ticket':'Khiếu nại'} #{link.id.slice(0,8)}</Link>)}
      <Link to={`/admin/cases?kind=TICKET&new=1&orderId=${r.shopOrderId}&relatedCaseId=${r.id}`}>Tạo ticket liên quan</Link><Link to={`/admin/cases?kind=DISPUTE&new=1&orderId=${r.shopOrderId}&relatedCaseId=${r.id}`}>Mở khiếu nại liên quan</Link></div>
    <h3>Yêu cầu bổ sung thông tin</h3>
    {detail.informationRequests.map(request=><article className="pa-case-thread" key={request.id}><strong>{request.recipientKind==='BUYER'?'Người mua':'Cửa hàng'} · {request.status==='OPEN'?'Chờ phản hồi':request.status==='RESPONDED'?'Đã phản hồi':'Đã hủy'}</strong><small>Hạn phản hồi: {date(request.dueAt,true)}{request.status==='OPEN'&&new Date(request.dueAt).getTime()<Date.now()?' · Quá hạn':''}</small><p>{request.prompt}</p>
      {request.replies.map(reply=><blockquote key={reply.id}><small>{reply.actorType==='BUYER'?'Người mua':'Cửa hàng'} · {date(reply.createdAt,true)}</small><p>{reply.message}</p></blockquote>)}</article>)}
    {!detail.informationRequests.length&&<p className="pa-detail-muted">Chưa yêu cầu bổ sung thông tin.</p>}
    {!closed&&<form className="pa-case-form" onSubmit={information}><label>Gửi cho<select value={recipient} onChange={event=>setRecipient(event.target.value)} disabled={busy}><option value="BUYER">Người mua</option><option value="SELLER">Cửa hàng</option></select></label><label>Hạn phản hồi<input type="datetime-local" required value={infoDue} onChange={event=>setInfoDue(event.target.value)} disabled={busy}/></label><label className="pa-case-wide">Nội dung cần bổ sung<textarea required minLength={10} maxLength={2000} value={prompt} onChange={event=>setPrompt(event.target.value)} disabled={busy}/></label><p className="pa-detail-muted pa-case-wide">Nội dung được gửi tới bên đã chọn và lưu nguyên văn cùng lịch sử phản hồi.</p><button className="pa-button pa-case-wide" disabled={busy||stale||prompt.trim().length<10}>Gửi yêu cầu bổ sung</button></form>}
    <h3>Nhật ký hồ sơ</h3><ol className="pa-history">{detail.events.map(event=><li key={event.id}><small>{date(event.createdAt,true)} · {event.action==='assignment_changed'?'Thay đổi phân công':event.action==='information_requested'?'Yêu cầu thông tin':event.action==='information_replied'?'Phản hồi bổ sung':event.action==='case_created'?'Tạo hồ sơ':event.action==='status_changed'?'Chuyển trạng thái':event.action==='evidence_viewed'?'Xem chứng cứ':event.action==='evidence_access_issued'?'Cấp quyền xem ảnh':'Xử lý hồ sơ'}</small><p>{event.reason}</p></li>)}</ol>
    <CaseResolutionWorkspace id={r.id} refresh={refresh} onBusy={setBusy}/>
  </section>;
}
