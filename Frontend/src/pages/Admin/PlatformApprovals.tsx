import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {adminApprovalApi,type Approval,type ApprovalPolicy} from '../../api/adminAccessApi';
import {useAdminSession} from './AdminSession';
import {hasAdminPermission} from './adminPolicy';
import {money} from './AdminUi';
import {adminRequestId} from '../../api/adminCommand';
const operations={return_approve:'Chấp nhận trả hàng có hoàn tiền',cancel_paid_order:'Hủy đơn có nghĩa vụ hoàn tiền'};
const statuses:Record<string,string>={REQUESTED:'Chờ duyệt',APPROVED:'Đã duyệt',REJECTED:'Đã từ chối',EXECUTED:'Đã thực thi'};
const message=(cause:unknown)=>cause instanceof Error?cause.message:'Chưa thực hiện được thao tác.';
export default function PlatformApprovals(){
  const user=useAdminSession(),[params]=useSearchParams();
  const attempt=useRef({signature:'',requestId:''});
  const [operation,setOperation]=useState(params.get('operation')==='cancel_paid_order'?'cancel_paid_order':'return_approve');
  const [targetId,setTargetId]=useState(params.get('targetId')||''),[version,setVersion]=useState(params.get('version')||'1'),[reason,setReason]=useState('');
  const [items,setItems]=useState<Approval[]>([]),[policies,setPolicies]=useState<ApprovalPolicy[]>([]),[reviewReason,setReviewReason]=useState(''),[policyReason,setPolicyReason]=useState('');
  const [thresholds,setThresholds]=useState<Record<string,string>>({}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
  const resource=operation==='return_approve'?'refunds':'orders',canRead=hasAdminPermission(user,resource+'.read');
  useEffect(()=>{let active=true;setError('');setItems([]);if(canRead)adminApprovalApi.list(operation).then(result=>{if(active)setItems(result.items);}).catch(cause=>{if(active)setError(message(cause));});return()=>{active=false;};},[operation,revision,canRead]);
  useEffect(()=>{let active=true;if(hasAdminPermission(user,'approval_policy.read'))adminApprovalApi.policies().then(result=>{if(active){setPolicies(result.items);setThresholds(Object.fromEntries(result.items.map(p=>[p.operation,String(p.threshold_minor)])));}}).catch(cause=>{if(active)setError(message(cause));});return()=>{active=false;};},[user,revision]);
  async function run(task:()=>Promise<unknown>){if(busy)return;setBusy(true);setError('');setNotice('');try{await task();setNotice('Đã lưu thao tác và lịch sử phê duyệt.');setRevision(v=>v+1);}catch(cause){setError(message(cause));}finally{setBusy(false);}}
  function create(event:FormEvent){event.preventDefault();const body={operation,targetId:targetId.trim(),version:Number(version),reason:reason.trim()};void run(()=>adminApprovalApi.create({...body,requestId:adminRequestId(attempt.current,body)}));}
  return <div className="pa-page"><div className="pa-page-heading"><div><h1>Yêu cầu phê duyệt</h1><p>Người duyệt phải khác người tạo. Thay đổi đối tượng hoặc thông tin tài chính cần lập yêu cầu mới.</p></div><button className="pa-button pa-button-light" disabled={busy} onClick={()=>setRevision(v=>v+1)}>Làm mới</button></div>
    <section className="pa-panel pa-detail">{error&&<p className="pa-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
      <label>Thao tác<select value={operation} onChange={event=>setOperation(event.target.value)}>{Object.entries(operations).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      {hasAdminPermission(user,resource+'.create')&&<form className="pa-case-form" onSubmit={create}><label>Mã đối tượng<input required value={targetId} onChange={event=>setTargetId(event.target.value)}/></label><label>Phiên bản đang xem<input type="number" min="0" step="1" required value={version} onChange={event=>setVersion(event.target.value)}/></label><label className="pa-case-wide">Lý do đề nghị<textarea required minLength={10} maxLength={500} value={reason} onChange={event=>setReason(event.target.value)}/></label><button disabled={busy} className="pa-button pa-case-wide">Gửi đề nghị phê duyệt</button></form>}
      {hasAdminPermission(user,resource+'.approve')&&<label>Lý do xét duyệt<textarea minLength={10} maxLength={500} value={reviewReason} onChange={event=>setReviewReason(event.target.value)}/></label>}
      {items.map(item=><article className="pa-detail-section" key={item.id}><h3>{statuses[item.status]} · {money(item.snapshot.amountMinor)}</h3><p>{item.reason}</p><dl><div><dt>Đối tượng</dt><dd>{item.target_id}</dd></div><div><dt>Người nhận hoàn</dt><dd>{item.snapshot.recipientId}</dd></div><div><dt>Phiên bản đối tượng</dt><dd>{item.snapshot.version}</dd></div><div><dt>Người đề nghị</dt><dd>{item.created_by}</dd></div><div><dt>Người duyệt</dt><dd>{item.reviewed_by||'Chưa có'}</dd></div></dl>
        {item.status==='REQUESTED'&&item.created_by!==user.id&&hasAdminPermission(user,resource+'.approve')&&<div className="pa-dialog-actions"><button disabled={busy||reviewReason.trim().length<10} className="pa-button" onClick={()=>void run(()=>adminApprovalApi.review(item.id,item.version,'approve',reviewReason.trim()))}>Duyệt</button><button disabled={busy||reviewReason.trim().length<10} className="pa-button pa-button-light" onClick={()=>void run(()=>adminApprovalApi.review(item.id,item.version,'reject',reviewReason.trim()))}>Từ chối</button></div>}
        {item.status==='APPROVED'&&<Link to={operation==='return_approve'?`/admin/returns?id=${item.target_id}`:`/admin/orders?id=${item.target_id}`}>Mở đối tượng để thực thi</Link>}
      </article>)}{canRead&&!items.length&&<p>Chưa có yêu cầu phê duyệt trong phạm vi được giao.</p>}
    </section>
    {!!policies.length&&<section className="pa-panel pa-detail"><h2>Ngưỡng phê duyệt</h2><p>Số tiền lớn hơn ngưỡng phải được duyệt độc lập. Ngưỡng 0 áp dụng cho mọi số tiền dương. Thay ngưỡng làm mất hiệu lực yêu cầu chưa thực thi.</p>{hasAdminPermission(user,'approval_policy.update')&&<label>Lý do thay chính sách<textarea required minLength={10} maxLength={500} value={policyReason} onChange={event=>setPolicyReason(event.target.value)}/></label>}{policies.map(policy=><form key={policy.operation} className="pa-case-form" onSubmit={event=>{event.preventDefault();void run(()=>adminApprovalApi.updatePolicy(policy.operation,policy.version,Number(thresholds[policy.operation]),policyReason.trim()));}}><label>{operations[policy.operation]} (VND)<input type="number" min="0" max={Number.MAX_SAFE_INTEGER} step="1" required disabled={!hasAdminPermission(user,'approval_policy.update')} value={thresholds[policy.operation]||'0'} onChange={event=>setThresholds(t=>({...t,[policy.operation]:event.target.value}))}/></label>{hasAdminPermission(user,'approval_policy.update')&&<button className="pa-button" disabled={busy||policyReason.trim().length<10}>Lưu ngưỡng</button>}</form>)}</section>}
  </div>;
}
