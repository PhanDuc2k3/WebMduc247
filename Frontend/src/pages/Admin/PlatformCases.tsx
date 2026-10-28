import {useEffect,useState,type FormEvent} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ChevronLeft,ChevronRight,Eye,Plus,RefreshCw,Search} from 'lucide-react';
import {adminCaseApi,type CaseDetail,type CaseRecord} from '../../api/adminCaseApi';
import type {AdminPage} from '../../api/platformAdminApi';
import {AdminDialog,date,formatNumber,StatusBadge} from './AdminUi';
import CaseWorkspace from './CaseWorkspace';
import CaseQueueFilters from './CaseQueueFilters';
import './admin-cases.css';

const ticketStatuses=[['NEW','Mới'],['IN_PROGRESS','Đang xử lý'],['WAITING_CUSTOMER','Chờ khách'],['RESOLVED','Đã giải quyết'],['CLOSED','Đã đóng']];
const disputeStatuses=[['OPEN','Mới tiếp nhận'],['INVESTIGATING','Đang xác minh'],['AWAITING_DECISION','Chờ kết luận'],['DECIDED','Đã kết luận'],['CLOSED','Đã đóng']];
const nextStatuses:Record<string,string[]>={NEW:['IN_PROGRESS'],IN_PROGRESS:['WAITING_CUSTOMER','RESOLVED'],WAITING_CUSTOMER:['IN_PROGRESS','RESOLVED'],RESOLVED:['CLOSED','IN_PROGRESS'],
  OPEN:['INVESTIGATING'],INVESTIGATING:['AWAITING_DECISION'],AWAITING_DECISION:['INVESTIGATING']};
const message=(cause:unknown)=>cause instanceof Error?cause.message:'Chưa thể xử lý hồ sơ.';

function NewCase({kind,orderId,relatedCaseId,close,created}:{kind:'TICKET'|'DISPUTE';orderId:string;relatedCaseId:string;close:()=>void;created:(id:string)=>void}){
  const [order,setOrder]=useState(orderId),[subject,setSubject]=useState(''),[description,setDescription]=useState(''),[reasonCode,setReasonCode]=useState('OTHER');
  const [key]=useState(()=>crypto.randomUUID()),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event:FormEvent){event.preventDefault();if(busy)return;setBusy(true);setError('');try{const result=await adminCaseApi.create({kind,shopOrderId:order.trim(),subject:subject.trim(),description:description.trim(),reasonCode,clientRequestId:key,...(relatedCaseId?{relatedCaseId}:{})});created(result.id);}catch(cause){setError(message(cause));}finally{setBusy(false);}}
  return <AdminDialog title={kind==='TICKET'?'Tạo ticket hỗ trợ':'Mở khiếu nại / tranh chấp'} close={close} busy={busy}><form className="pa-detail pa-case-form" onSubmit={submit}>
    <label className="pa-case-wide">Mã đơn hàng đầy đủ<input required value={order} readOnly={Boolean(relatedCaseId)} onChange={event=>setOrder(event.target.value)}/></label>
    <label className="pa-case-wide">Tiêu đề<input required minLength={5} maxLength={200} value={subject} onChange={event=>setSubject(event.target.value)}/></label>
    <label className="pa-case-wide">Nội dung hồ sơ (các bên liên quan có thể xem)<textarea required minLength={10} maxLength={2000} value={description} onChange={event=>setDescription(event.target.value)}/></label>
    <label className="pa-case-wide">Lý do<select value={reasonCode} onChange={event=>setReasonCode(event.target.value)}><option value="OTHER">Khác</option><option value="DAMAGED">Hàng hỏng</option><option value="WRONG_ITEM">Giao sai</option><option value="NOT_AS_DESCRIBED">Không đúng mô tả</option><option value="PAYMENT">Thanh toán</option><option value="SERVICE">Dịch vụ</option></select></label>
    {relatedCaseId&&<p className="pa-detail-muted pa-case-wide">Hồ sơ sẽ được liên kết với #{relatedCaseId.slice(0,8)} của cùng đơn hàng.</p>}
    {error&&<p className="pa-error pa-case-wide" role="alert">{error}</p>}<div className="pa-dialog-actions pa-case-wide"><button type="button" className="pa-button pa-button-light" disabled={busy} onClick={close}>Hủy</button><button className="pa-button" disabled={busy}>{busy?'Đang tạo…':'Tạo hồ sơ'}</button></div>
  </form></AdminDialog>;
}
function CaseDialog({id,close,changed}:{id:string;close:()=>void;changed:()=>void}){
  const [data,setData]=useState<CaseDetail|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false);
  const [status,setStatus]=useState(''),[reason,setReason]=useState(''),[stale,setStale]=useState(false);
  useEffect(()=>{let active=true;setLoading(true);setData(null);setError('');setStale(false);setStatus('');setReason('');adminCaseApi.detail(id).then(result=>{if(active)setData(result);}).catch(cause=>{if(active)setError(message(cause));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[id,revision]);
  const refresh=()=>{setRevision(value=>value+1);changed();};
  async function submit(event:FormEvent){event.preventDefault();if(!data||busy||stale)return;setBusy(true);setError('');try{await adminCaseApi.status(id,{status,version:data.record.caseVersion,reason:reason.trim()});refresh();}catch(cause){setError(message(cause));setStale(true);}finally{setBusy(false);}}
  const record=data?.record,options=record?nextStatuses[record.status]||[]:[];
  return <AdminDialog title="Chi tiết hồ sơ hỗ trợ / khiếu nại" close={close} busy={busy}><div className="pa-detail">
    {loading&&<p role="status">Đang tải hồ sơ…</p>}{error&&<p className="pa-error" role="alert">{error}<button className="pa-text-link" onClick={refresh}>Tải lại</button></p>}
    {record&&data&&<><div className="pa-detail-badges"><span className="pa-chip">{record.kind==='TICKET'?'Ticket hỗ trợ':'Khiếu nại / tranh chấp'}</span><StatusBadge status={record.status}/></div><h3>{record.subject}</h3><p className="pa-return-text">{record.description}</p><dl><div><dt>Mã hồ sơ</dt><dd>{record.id}</dd></div><div><dt>Đơn hàng</dt><dd><Link to={`/admin/orders?id=${record.shopOrderId}`}>#{record.shopOrderId.slice(0,8)}</Link></dd></div><div><dt>Cửa hàng</dt><dd>{record.storeName}</dd></div></dl>
      <p className="pa-detail-muted">Ticket và khiếu nại có trạng thái riêng. Chuyển trạng thái không sửa đơn hàng hoặc tạo lệnh thanh toán/hoàn tiền.</p>
      {options.length>0&&<form className="pa-case-form" onSubmit={submit}><label className="pa-case-wide">Trạng thái tiếp theo<select required value={status} onChange={event=>setStatus(event.target.value)}><option value="">Chọn trạng thái</option>{(record.kind==='TICKET'?ticketStatuses:disputeStatuses).filter(([value])=>options.includes(value)).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="pa-case-wide">Lý do / kết luận<textarea required minLength={10} maxLength={500} value={reason} onChange={event=>setReason(event.target.value)}/></label><button className="pa-button pa-case-wide" disabled={busy||stale||!status||reason.trim().length<10}>Xác nhận chuyển trạng thái</button></form>}
      <CaseWorkspace key={`${id}-${record.caseVersion}`} detail={data} refresh={refresh} onBusy={setBusy}/>
    </>}
  </div></AdminDialog>;
}
export default function PlatformCases(){
  const [params,setParams]=useSearchParams();const kind=params.get('kind')==='TICKET'?'TICKET':'DISPUTE';
  const q=params.get('q')||'',status=params.get('status')||'',reasonCode=params.get('reasonCode')||'',storeId=params.get('storeId')||'',assigneeId=params.get('assigneeId')||'',due=params.get('due')||'',paymentMethod=params.get('paymentMethod')||'';
  const from=params.get('from')||'',to=params.get('to')||'',selected=params.get('id')||'',creating=params.get('new')==='1',rawPage=Number(params.get('page')||1),page=Number.isSafeInteger(rawPage)&&rawPage>0&&rawPage<=10000?rawPage:1;
  const userId=params.get('userId')||'';
  const [draft,setDraft]=useState(q),[data,setData]=useState<AdminPage<CaseRecord>|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>setDraft(q),[q]);
  useEffect(()=>{let active=true;setLoading(true);setData(null);setError('');adminCaseApi.list({kind,q,status,reasonCode,storeId,assigneeId,due,paymentMethod,from,to,page,limit:12,userId}).then(result=>{if(active)setData(result);}).catch(cause=>{if(active)setError(message(cause));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[kind,q,status,reasonCode,storeId,assigneeId,due,paymentMethod,from,to,page,userId,revision]);
  function filter(key:string,value:string){const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);if(!['page','id','new'].includes(key))next.delete('page');setParams(next);}
  function search(event:FormEvent){event.preventDefault();filter('q',draft.trim());}
  return <div className="pa-page"><div className="pa-page-heading"><div><span className="pa-eyebrow">HỒ SƠ ĐƯỢC PHÂN LOẠI RIÊNG</span><h1>{kind==='TICKET'?'Ticket hỗ trợ':'Khiếu nại / tranh chấp'}</h1><p>Theo dõi người phụ trách, hạn xử lý và thông tin cần bổ sung.</p></div><button className="pa-button" onClick={()=>filter('new','1')}><Plus size={16}/>Tạo hồ sơ</button></div>
    <nav className="pa-case-tabs" aria-label="Loại hồ sơ hậu mãi"><Link to="/admin/returns">Trả hàng</Link><Link className={kind==='DISPUTE'?'is-active':''} to="/admin/cases?kind=DISPUTE">Khiếu nại / tranh chấp</Link><Link className={kind==='TICKET'?'is-active':''} to="/admin/cases?kind=TICKET">Ticket hỗ trợ</Link><Link to="/admin/return-exceptions">Ngoại lệ ngoài hạn</Link></nav>
    <section className="pa-panel"><div className="pa-records-top"><div><h2>Danh sách hồ sơ</h2><span className="pa-count-chip">{data?formatNumber(data.total):'—'}</span><button aria-label="Làm mới hồ sơ" className="pa-row-action" disabled={loading} onClick={()=>setRevision(value=>value+1)}><RefreshCw size={15}/></button></div><form className="pa-search" onSubmit={search}><Search size={17}/><input value={draft} maxLength={100} aria-label="Tìm hồ sơ" placeholder="Mã hồ sơ, mã đơn, tiêu đề, shop…" onChange={event=>setDraft(event.target.value)}/><button>Tìm kiếm</button></form></div>
      <div className="pa-filters pa-return-filters"><label>Trạng thái<select value={status} onChange={event=>filter('status',event.target.value)}><option value="">Tất cả</option>{(kind==='TICKET'?ticketStatuses:disputeStatuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Thanh toán<select value={paymentMethod} onChange={event=>filter('paymentMethod',event.target.value)}><option value="">Tất cả</option>{['COD','MOMO','VIETQR'].map(value=><option key={value}>{value}</option>)}</select></label><label>Từ ngày<input type="date" value={from} max={to||undefined} onChange={event=>filter('from',event.target.value)}/></label><label>Đến ngày<input type="date" value={to} min={from||undefined} onChange={event=>filter('to',event.target.value)}/></label><CaseQueueFilters {...{reasonCode,storeId,assigneeId,due}} onFilter={filter}/><button className="pa-text-link" onClick={()=>setParams({kind})}>Xóa bộ lọc</button></div>
      {error&&<p className="pa-error pa-record-error" role="alert">{error}</p>}<div className="pa-table-scroll" aria-busy={loading}><table className="pa-table"><thead><tr><th>Hồ sơ</th><th>Cửa hàng</th><th>Trạng thái</th><th>Hạn xử lý</th><th>Thao tác</th></tr></thead><tbody>{data?.items.map(row=><tr key={row.id}><td><strong>{row.subject}</strong><small>#{row.id.slice(0,8)}</small></td><td>{row.storeName}<small>{row.paymentMethod}</small></td><td><StatusBadge status={row.status}/></td><td>{date(row.dueAt,true)}<small>{row.assigneeId?'Đã phân công':'Chưa phân công'}</small></td><td><button className="pa-row-action" aria-label={`Xem hồ sơ ${row.id}`} onClick={()=>filter('id',row.id)}><Eye size={16}/>Chi tiết</button></td></tr>)}{!data?.items.length&&<tr><td colSpan={5} className="pa-empty-cell">{loading?'Đang tải hồ sơ…':error?'Chưa tải được dữ liệu.':'Không có hồ sơ phù hợp.'}</td></tr>}</tbody></table></div>
      <div className="pa-pagination"><span>{data?`${data.total} hồ sơ`:'Chưa có dữ liệu'}</span><div><button aria-label="Trang trước" disabled={loading||page<=1} onClick={()=>filter('page',String(page-1))}><ChevronLeft size={17}/></button><span>Trang {page} / {Math.max(1,data?.totalPages||1)}</span><button aria-label="Trang sau" disabled={loading||!data||page>=data.totalPages} onClick={()=>filter('page',String(page+1))}><ChevronRight size={17}/></button></div></div>
    </section>
    {creating&&<NewCase key={kind} kind={kind} orderId={params.get('orderId')||''} relatedCaseId={params.get('relatedCaseId')||''} close={()=>filter('new','')} created={id=>{const next=new URLSearchParams({kind,id});setParams(next);setRevision(value=>value+1);}}/>}
    {selected&&!creating&&<CaseDialog key={selected} id={selected} close={()=>filter('id','')} changed={()=>setRevision(value=>value+1)}/>}
  </div>;
}
