import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, Image, RefreshCw, Search, Undo2 } from 'lucide-react';
import { adminReturnApi, type AdminReturn, type AdminReturnDetail, type ReturnDecision } from '../../api/adminReturnApi';
import { IdentityApiError } from '../../api/identityApi';
import type { AdminPage } from '../../api/platformAdminApi';
import { AdminDialog, date, formatNumber, money, StatusBadge } from './AdminUi';
import './admin-returns.css';
import CaseWorkspace from './CaseWorkspace';
import CaseQueueFilters from './CaseQueueFilters';
import type {EvidenceRef} from '../../api/caseResolutionApi';
import ApprovalSelector from './ApprovalSelector';
import {useAdminSession} from './AdminSession';
import {hasAdminPermission} from './adminPolicy';

const statuses = [
  ['REQUESTED','Mới tiếp nhận'],['UNDER_REVIEW','Đang xem xét'],['APPROVED','Đã chấp nhận'],
  ['REJECTED','Đã từ chối'],['RETURNING','Đang gửi trả'],['RECEIVED','Đã nhận hàng trả'],
  ['REFUND_PENDING','Chờ hoàn tiền'],['REFUNDED','Đã hoàn tiền'],['CLOSED','Đã đóng'],
];
const reasons:Record<string,string> = {DAMAGED:'Hàng hỏng',WRONG_ITEM:'Giao sai hàng',NOT_AS_DESCRIBED:'Không đúng mô tả',OTHER:'Khác'};
const actions:Record<ReturnDecision,string> = {review:'Bắt đầu xem xét',approve:'Chấp nhận trả hàng',reject:'Từ chối yêu cầu'};
const actors:Record<string,string> = {buyer:'Người mua',seller:'Người bán',platform_admin:'Quản trị sàn',system:'Hệ thống',payment:'Thanh toán'};
const message = (cause:unknown) => cause instanceof Error ? cause.message : 'Chưa thể tải dữ liệu. Vui lòng thử lại.';

function Evidence({requestId,id,createdAt}:{requestId:string;id:string;createdAt:string}) {
  const [requested,setRequested] = useState(false), [imageUrl,setImageUrl] = useState('');
  const [error,setError] = useState(''), [attempt,setAttempt] = useState(0);
  useEffect(() => {
    if(!requested) return;
    let active = true, url = '';let expiryTimer:ReturnType<typeof setTimeout>;
    setError(''); setImageUrl('');
    adminReturnApi.evidence(requestId,id).then(({blob,expiresAt}) => {
      if(!active) return;
      url = URL.createObjectURL(blob); setImageUrl(url);
      expiryTimer=setTimeout(()=>{URL.revokeObjectURL(url);setImageUrl('');setRequested(false);},Math.max(0,Date.parse(expiresAt)-Date.now()));
    }).catch(cause => { if(active) setError(message(cause)); });
    return () => { active = false; clearTimeout(expiryTimer);if(url) URL.revokeObjectURL(url); };
  },[requested,requestId,id,attempt]);
  return <article className="pa-return-evidence">
    <small>{date(createdAt,true)}</small>
    {!requested && <button className="pa-button pa-button-light" onClick={() => setRequested(true)}><Image size={16}/>Xem chứng cứ</button>}
    {requested && !imageUrl && !error && <p role="status">Đang tải ảnh…</p>}
    {imageUrl && <a href={imageUrl} target="_blank" rel="noreferrer"><img src={imageUrl} alt="Ảnh chứng cứ của yêu cầu trả hàng"/></a>}
    {error && <div role="alert"><p>{error}</p><button className="pa-text-link" onClick={() => setAttempt(value => value+1)}>Thử lại</button></div>}
  </article>;
}

function ReturnDetail({id,close,changed}:{id:string;close:()=>void;changed:()=>void}) {
  const user=useAdminSession(),canModerate=hasAdminPermission(user,'returns.moderate');
  const [approvalId,setApprovalId]=useState('');
  const [data,setData] = useState<AdminReturnDetail|null>(null), [loading,setLoading] = useState(true);
  const [error,setError] = useState(''), [notice,setNotice] = useState(''), [revision,setRevision] = useState(0);
  const [action,setAction] = useState<ReturnDecision|null>(null), [reason,setReason] = useState('');
  const [busy,setBusy] = useState(false), [mustRefresh,setMustRefresh] = useState(false);
  const [responsibleParty,setResponsibleParty]=useState(''),[basisSummary,setBasisSummary]=useState(''),[evidenceRefs,setEvidenceRefs]=useState<EvidenceRef[]>([]);
  useEffect(() => {
    let active = true; setLoading(true); setData(null); setError(''); setMustRefresh(false); setAction(null); setReason('');
    setResponsibleParty('');setBasisSummary('');setEvidenceRefs([]);
    adminReturnApi.detail(id).then(result => { if(active) setData(result); })
      .catch(cause => { if(active) setError(message(cause)); }).finally(() => { if(active) setLoading(false); });
    return () => { active = false; };
  },[id,revision]);
  async function decide(event:FormEvent) {
    event.preventDefault(); if(!data || !action || busy || mustRefresh) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await adminReturnApi.decide(data.record,action,reason.trim(),action==='review'?undefined:{responsibleParty,policyVersion:'CASE_RESOLUTION_V1',basisSummary:basisSummary.trim(),evidenceRefs},approvalId||undefined);
      setNotice('Đã cập nhật yêu cầu và lưu lịch sử quản trị.'); setRevision(value => value+1); changed();
    } catch(cause) {
      setError(message(cause));
      if(!(cause instanceof IdentityApiError) || cause.status !== 400) setMustRefresh(true);
    } finally { setBusy(false); }
  }
  const record = data?.record;
  return <AdminDialog title="Chi tiết yêu cầu trả hàng" close={close} busy={busy}>
    <div className="pa-detail pa-return-detail" aria-busy={loading}>
      {notice && <p className="pa-return-success" role="status">{notice}</p>}
      {error && <div className="pa-error" role="alert"><span>{error}</span><button className="pa-text-link" disabled={busy} onClick={() => setRevision(value => value+1)}>Tải lại chi tiết</button></div>}
      {loading && <p role="status" className="pa-detail-loading">Đang tải hồ sơ…</p>}
      {record && data && <>
        <div className="pa-detail-badges"><StatusBadge status={record.status}/><span className="pa-chip">Phiên bản {record.version}</span></div>
        <dl>
          <div><dt>Mã yêu cầu</dt><dd>{record.id}</dd></div>
          <div><dt>Đơn hàng</dt><dd><Link to={`/admin/orders?id=${record.shopOrderId}`}>#{record.shopOrderId.slice(0,8).toUpperCase()} · Xem chi tiết đơn</Link></dd></div>
          <div><dt>Cửa hàng</dt><dd><Link to={`/admin/stores?id=${record.storeId}`}>{record.storeName}</Link></dd></div>
          <div><dt>Người mua</dt><dd><Link to={`/admin/users?id=${record.buyerId}`}>{record.buyerId}</Link></dd></div>
          <div><dt>Ngày tiếp nhận</dt><dd>{date(record.requestedAt,true)}</dd></div>
          <div><dt>Chính sách áp dụng</dt><dd>{record.windowDays||7} ngày · {record.policyVersion||'Chưa có phiên bản'}{record.deliveredAt&&<small>Giao hàng: {date(record.deliveredAt,true)}</small>}{record.exceptionId&&<small>Đã duyệt ngoại lệ ngoài hạn</small>}</dd></div>
          <div><dt>Lý do</dt><dd>{reasons[record.reasonCode] || record.reasonCode}</dd></div>
          <div><dt>Phương án</dt><dd>{record.resolution === 'REFUND' ? 'Trả hàng và hoàn tiền' : 'Đổi hàng (cần xử lý riêng)'}</dd></div>
          <div><dt>Nội dung khách gửi</dt><dd className="pa-return-text">{record.reason}</dd></div>
          <div><dt>Thanh toán</dt><dd>{record.paymentMethod} · <StatusBadge status={record.paymentStatus}/></dd></div>
          <div><dt>Giá trị đơn</dt><dd>{money(record.orderTotalMinor)}</dd></div>
          <div><dt>Tiền đủ điều kiện hoàn</dt><dd><strong>{money(record.eligibleRefundMinor)}</strong> (gồm {money(record.shippingRefundMinor)} phí giao hàng)</dd></div>
          <div><dt>Đơn đã hoàn</dt><dd>{money(record.refundedMinor)}</dd></div>
          {record.refundReference && <div><dt>Mã hoàn tiền</dt><dd>{record.refundReference}</dd></div>}
          {record.sellerResponse && <div><dt>Phản hồi shop</dt><dd className="pa-return-text">{record.sellerResponse}</dd></div>}
          {record.adminResponse && <div><dt>Phản hồi của sàn</dt><dd className="pa-return-text">{record.adminResponse}</dd></div>}
        </dl>
        <p className="pa-return-note">Chấp nhận trả hàng cho phép người mua tiếp tục gửi trả. Tiền chỉ được ghi nhận đã hoàn sau khi luồng thanh toán xác nhận kết quả.</p>
        {record.status === 'REFUND_PENDING' && <p className="pa-warning">{record.paymentMethod === 'COD'
          ? 'Yêu cầu COD đang chờ phương án chi trả và xác minh hoàn tiền.'
          : record.refundNeedsAttention ? 'Lần xử lý hoàn tiền có lỗi. Cần kiểm tra kết quả thanh toán trước khi xử lý tiếp.'
          : 'Đang chờ kết quả hoàn tiền được xác minh từ dịch vụ thanh toán.'}</p>}
        <section className="pa-detail-section"><h3>Sản phẩm trả hàng</h3><div className="pa-table-scroll"><table className="pa-table"><thead><tr><th>Sản phẩm / SKU</th><th>Số lượng trả</th><th>Tiền hàng đủ điều kiện hoàn</th></tr></thead><tbody>
          {record.items?.map(item => <tr key={item.orderItemId}><td><strong>{item.name}</strong><small>{item.sku}</small></td><td>{item.quantity}</td><td>{money(item.eligibleRefundMinor)}</td></tr>)}
        </tbody></table></div></section>
        <section className="pa-detail-section"><h3>Chứng cứ ({record.evidence?.length || 0})</h3>
          <p className="pa-detail-muted">Liên kết xem ảnh dùng một lần, hết hạn sau 60 giây và kiểm tra lại phân công khi tải. Mỗi lần truy cập được ghi nhật ký.</p>
          {!data.case.canViewEvidence&&<p className="pa-case-permission-note">Cần được phân công hồ sơ hoặc có quyền giám sát chứng cứ để xem ảnh. Bạn có thể nhận hồ sơ ở phần phân công bên dưới.</p>}
          {record.evidence?.length ? data.case.canViewEvidence&&<div className="pa-return-evidence-grid">{record.evidence.map(image => <Evidence key={image.id} requestId={record.id} {...image}/>)}</div> : <p className="pa-detail-muted">Chưa có ảnh chứng cứ.</p>}
        </section>
        <CaseWorkspace key={`${id}-${data.case.record.caseVersion}`} detail={data.case} refresh={()=>{setRevision(value=>value+1);changed();}} onBusy={setBusy}/>
        <section className="pa-detail-section"><h3>Lịch sử xử lý</h3><ol className="pa-history">
          {data.history.map((entry,index) => <li key={`${entry.createdAt}-${index}`}><div><StatusBadge status={entry.toStatus}/><time>{date(entry.createdAt,true)}</time></div><p>{entry.note || 'Không có ghi chú.'}</p><small>{actors[entry.actorType] || entry.actorType}</small></li>)}
          {!data.history.length && <li>Chưa có lịch sử.</li>}
        </ol></section>
        <section className="pa-detail-section"><h3>Nhật ký quản trị gần đây</h3>
          <p className="pa-detail-muted">Tối đa 100 thao tác gần nhất. Làm mới chi tiết để xem lần mở chứng cứ vừa thực hiện.</p>
          <ol className="pa-history">{data.audit.map(entry => <li key={entry.id}><div><strong>{entry.action === 'view_evidence' ? 'Xem chứng cứ' : actions[entry.action as ReturnDecision] || entry.action}</strong><time>{date(entry.createdAt,true)}</time></div><p>{entry.reason}</p><small>Quản trị viên {entry.actorId.slice(0,8)}</small></li>)}
            {!data.audit.length && <li>Chưa có thao tác quản trị.</li>}
          </ol>
        </section>
        {!action && canModerate && <div className="pa-dialog-actions">
          <button className="pa-button pa-button-light" disabled={busy} onClick={() => setRevision(value => value+1)}><RefreshCw size={15}/>Làm mới chi tiết</button>
          {record.status === 'REQUESTED' && record.resolution === 'REFUND' && <button className="pa-button" disabled={mustRefresh || busy} onClick={() => setAction('review')}>Bắt đầu xem xét</button>}
          {record.status === 'UNDER_REVIEW' && record.resolution === 'REFUND' && <><button className="pa-button pa-button-danger" disabled={mustRefresh || busy} onClick={() => setAction('reject')}>Từ chối yêu cầu</button><button className="pa-button" disabled={mustRefresh || busy} onClick={() => setAction('approve')}>Chấp nhận trả hàng</button></>}
        </div>}
        {action && <form className="pa-confirm-box" onSubmit={decide}><h3>{actions[action]}</h3>
          {action==='approve'&&<ApprovalSelector operation="return_approve" targetId={record.id} version={record.version} value={approvalId} onChange={setApprovalId}/>}
          <p>Áp dụng cho yêu cầu #{record.id.slice(0,8).toUpperCase()} của {record.storeName}. Nội dung phản hồi được lưu trong lịch sử và hiển thị cho người mua, cửa hàng.</p>
          <label htmlFor="return-decision-reason">Lý do / phản hồi (10–500 ký tự)<textarea id="return-decision-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={10} maxLength={500} required disabled={busy}/></label>
          {action!=='review'&&<><label>Bên chịu trách nhiệm<select id="return-responsible-party" required value={responsibleParty} onChange={event=>setResponsibleParty(event.target.value)}><option value="">Chọn bên</option><option value="BUYER">Người mua</option><option value="SELLER">Shop</option><option value="CARRIER">Vận chuyển</option><option value="PLATFORM">Sàn</option><option value="UNDETERMINED">Chưa xác định</option></select></label><p className="pa-detail-muted">Policy xử lý: CASE_RESOLUTION_V1. Chính sách trả hàng gốc được giữ nguyên trong snapshot.</p><label>Cơ sở bằng chứng / lý do thiếu chứng cứ<textarea id="return-basis-summary" required minLength={10} maxLength={2000} value={basisSummary} onChange={event=>setBasisSummary(event.target.value)}/></label>{record.evidence?.map(image=><label key={image.id}><input type="checkbox" checked={evidenceRefs.some(ref=>ref.id===image.id)} onChange={event=>setEvidenceRefs(current=>event.target.checked?[...current,{kind:'RETURN_EVIDENCE',id:image.id}]:current.filter(ref=>ref.id!==image.id))}/> Dùng ảnh #{image.id.slice(0,8)} làm căn cứ</label>)}</>}
          {mustRefresh && <p role="status">Cần tải lại hồ sơ để xác nhận trạng thái hiện tại trước khi thử tiếp.</p>}
          <div className="pa-dialog-actions"><button type="button" className="pa-button pa-button-light" disabled={busy} onClick={() => {setAction(null);setReason('');}}>Hủy</button><button className={`pa-button ${action === 'reject' ? 'pa-button-danger' : ''}`} disabled={busy || mustRefresh || reason.trim().length < 10||(action!=='review'&&(!responsibleParty||basisSummary.trim().length<10))}>{busy ? 'Đang xử lý…' : `Xác nhận ${actions[action].toLowerCase()}`}</button></div>
        </form>}
      </>}
    </div>
  </AdminDialog>;
}

export default function PlatformReturns() {
  const [params,setParams] = useSearchParams();
  const q = params.get('q') || '', status = params.get('status') || '', paymentMethod = params.get('paymentMethod') || '';
  const from = params.get('from') || '', to = params.get('to') || '', storeId = params.get('storeId') || '';
  const reasonCode=params.get('reasonCode')||'',assigneeId=params.get('assigneeId')||'',due=params.get('due')||'';
  const selected = params.get('id') || '', rawPage = Number(params.get('page') || 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 10000 ? rawPage : 1;
  const [draft,setDraft] = useState(q), [data,setData] = useState<AdminPage<AdminReturn>|null>(null);
  const [loading,setLoading] = useState(true), [error,setError] = useState(''), [revision,setRevision] = useState(0);
  useEffect(() => setDraft(q),[q]);
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setData(null);
    adminReturnApi.list({q,status,paymentMethod,from,to,storeId,reasonCode,assigneeId,due,page,limit:12})
      .then(result => {if(active) setData(result);}).catch(cause => {if(active) setError(message(cause));})
      .finally(() => {if(active) setLoading(false);});
    return () => {active = false;};
  },[q,status,paymentMethod,from,to,storeId,reasonCode,assigneeId,due,page,revision]);
  function filter(key:string,value:string) {
    const next = new URLSearchParams(params);
    if(value) next.set(key,value); else next.delete(key);
    if(key !== 'page' && key !== 'id') next.delete('page');
    setParams(next);
  }
  function search(event:FormEvent) {event.preventDefault();filter('q',draft.trim());}
  const filtered = Boolean(q || status || paymentMethod || from || to || storeId||reasonCode||assigneeId||due);
  return <div className="pa-page"><div className="pa-page-heading"><div><span className="pa-eyebrow">HẬU MÃI VÀ XỬ LÝ YÊU CẦU</span><h1>Trả hàng</h1><p>Tra cứu hồ sơ, xem chứng cứ và xử lý yêu cầu của người mua.</p></div><button className="pa-button pa-button-light" disabled={loading} onClick={() => setRevision(value => value+1)}><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>Làm mới</button></div>
    <nav className="pa-case-tabs" aria-label="Loại hồ sơ hậu mãi"><Link className="is-active" to="/admin/returns">Trả hàng</Link><Link to="/admin/cases?kind=DISPUTE">Khiếu nại / tranh chấp</Link><Link to="/admin/cases?kind=TICKET">Ticket hỗ trợ</Link><Link to="/admin/return-exceptions">Ngoại lệ ngoài hạn</Link></nav>
    <section className="pa-panel"><div className="pa-records-top"><div><Undo2 size={18}/><h2>Yêu cầu trả hàng</h2><span className="pa-count-chip">{data ? formatNumber(data.total) : '—'}</span></div>
      <form className="pa-search" onSubmit={search}><Search size={17}/><input aria-label="Tìm yêu cầu trả hàng" placeholder="Mã yêu cầu, đơn hàng, tên shop…" maxLength={100} value={draft} onChange={event => setDraft(event.target.value)}/><button type="submit">Tìm kiếm</button></form></div>
      <div className="pa-filters pa-return-filters">
        <label>Trạng thái<select value={status} onChange={event => filter('status',event.target.value)}><option value="">Tất cả trạng thái</option>{statuses.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Thanh toán<select value={paymentMethod} onChange={event => filter('paymentMethod',event.target.value)}><option value="">Tất cả phương thức</option>{['COD','MOMO','VIETQR'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>Từ ngày<input type="date" value={from} max={to || undefined} onChange={event => filter('from',event.target.value)}/></label>
        <label>Đến ngày<input type="date" value={to} min={from || undefined} onChange={event => filter('to',event.target.value)}/></label>
        <CaseQueueFilters reasonCode={reasonCode} storeId={storeId} assigneeId={assigneeId} due={due} onFilter={filter}/>
        {filtered && <button className="pa-text-link" onClick={() => setParams(selected ? {id:selected} : {})}>Xóa bộ lọc</button>}
      </div>
      <p className="pa-return-filter-note">Ngày tiếp nhận tính theo giờ Việt Nam (UTC+7).</p>
      {error && <div className="pa-error pa-record-error" role="alert">{error}<button className="pa-text-link" onClick={() => setRevision(value => value+1)}>Thử lại</button></div>}
      <div className="pa-table-scroll" aria-busy={loading}><table className="pa-table"><thead><tr><th>Yêu cầu / cửa hàng</th><th>Lý do</th><th>Tiền đủ điều kiện hoàn</th><th>Trạng thái</th><th>Hạn xử lý</th><th>Tiếp nhận</th><th>Thao tác</th></tr></thead><tbody>
        {data?.items.map(row => <tr key={row.id}><td><strong className="pa-row-title">#{row.id.slice(0,8).toUpperCase()}</strong><small>{row.storeName}</small><small>Đơn #{row.shopOrderId.slice(0,8).toUpperCase()}</small></td><td>{reasons[row.reasonCode] || row.reasonCode}</td><td className="pa-table-money">{money(row.eligibleRefundMinor)}<small>{row.paymentMethod}</small></td><td><StatusBadge status={row.status}/>{row.refundNeedsAttention && <small>Cần kiểm tra hoàn tiền</small>}</td><td>{date(row.dueAt,true)}<small>{row.assigneeId?'Đã phân công':'Chưa phân công'}</small></td><td>{date(row.requestedAt,true)}</td><td><button className="pa-row-action" onClick={() => filter('id',row.id)} aria-label={`Xem yêu cầu ${row.id}`}><Eye size={16}/><span>Chi tiết</span></button></td></tr>)}
        {!data?.items.length && <tr><td colSpan={7} className="pa-empty-cell">{loading ? 'Đang tải yêu cầu…' : error ? 'Dữ liệu chưa sẵn sàng.' : filtered ? 'Không có yêu cầu phù hợp với bộ lọc.' : 'Chưa có yêu cầu trả hàng.'}</td></tr>}
      </tbody></table></div>
      <div className="pa-pagination"><span>{data ? `${formatNumber(data.total)} yêu cầu` : 'Chưa tải dữ liệu'}</span><div><button aria-label="Trang trước" disabled={loading || page <= 1} onClick={() => filter('page',String(page-1))}><ChevronLeft size={17}/></button><span>Trang {page} / {Math.max(1,data?.totalPages || 1)}</span><button aria-label="Trang sau" disabled={loading || !data || page >= data.totalPages} onClick={() => filter('page',String(page+1))}><ChevronRight size={17}/></button></div></div>
    </section>
    {selected && <ReturnDetail key={selected} id={selected} close={() => filter('id','')} changed={() => setRevision(value => value+1)}/>}
  </div>;
}
