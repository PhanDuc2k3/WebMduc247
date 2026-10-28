import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {platformAdminApi,type AdminRecord,type AdminHistory} from '../../api/platformAdminApi';
import {storeAdminApi,type StoreGovernance,type StoreImpact,type StoreRatings,type StoreReports} from '../../api/storeAdminApi';
import {adminRequestId} from '../../api/adminCommand';
import {useAdminSession} from './AdminSession';
import {hasAdminPermission} from './adminPolicy';
import {AdminDialog,date,StatusBadge} from './AdminUi';
import './store-admin.css';

export const registrationLabels:Record<string,string>={NOT_REQUIRED:'Không yêu cầu duyệt',PENDING:'Chờ duyệt',NEEDS_INFORMATION:'Chờ bổ sung',APPROVED:'Đã duyệt',REJECTED:'Đã từ chối'};
export const decisionLabels:Record<string,string>={suspend:'Đình chỉ',restore:'Khôi phục',WARNING:'Cảnh cáo',REMEDIED:'Đã khắc phục',APPEAL_UPHELD:'Giữ quyết định',APPEAL_OVERTURNED:'Chấp nhận kháng nghị',BADGE_AWARDED:'Cấp badge uy tín',BADGE_REVOKED:'Thu hồi badge',OWNERSHIP_REQUESTED:'Đề xuất thay đổi quyền sở hữu',OWNERSHIP_APPROVED:'Đã duyệt quyền sở hữu',OWNERSHIP_REJECTED:'Từ chối thay đổi quyền sở hữu',...registrationLabels};
const message=(error:unknown)=>error instanceof Error?error.message:'Chưa thể tải dữ liệu.';
export default function StoreWorkspace({id,close,changed}:{id:string;close:()=>void;changed:()=>void}){
  const actor=useAdminSession(),canModerate=hasAdminPermission(actor,'stores.moderate');
  const [record,setRecord]=useState<AdminRecord|null>(null),[history,setHistory]=useState<AdminHistory[]>([]),[data,setData]=useState<StoreGovernance|null>(null);
  const [owner,setOwner]=useState<AdminRecord|null>(null),[revision,setRevision]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [impact,setImpact]=useState<StoreImpact|null>(null),[impactError,setImpactError]=useState(''),[ratings,setRatings]=useState<StoreRatings|null>(null),[ratingError,setRatingError]=useState('');
  const [reports,setReports]=useState<StoreReports|null>(null),[reportsError,setReportsError]=useState('');
  const [from,setFrom]=useState(''),[to,setTo]=useState(''),[range,setRange]=useState<{from?:string;to?:string}>({});
  const [action,setAction]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[incidentKey,setIncidentKey]=useState(''),[remedyBy,setRemedyBy]=useState(''),[target,setTarget]=useState(''),[outcome,setOutcome]=useState('UPHELD');
  const attempt=useRef({signature:'',requestId:''});
  const [revealedProfile,setRevealedProfile]=useState<Awaited<ReturnType<typeof storeAdminApi.profileContact>>|null>(null);
  useEffect(()=>setRevealedProfile(null),[id,revision]);
  useEffect(()=>{if(!revealedProfile)return;const timer=setTimeout(()=>setRevealedProfile(null),60000);return()=>clearTimeout(timer);},[revealedProfile]);
  const [ownershipKind,setOwnershipKind]=useState('TRANSFER'),[targetUserId,setTargetUserId]=useState(''),[verificationRef,setVerificationRef]=useState('');
  useEffect(()=>{let active=true;setLoading(true);setRecord(null);setData(null);setOwner(null);setError('');setAction('');
    Promise.all([platformAdminApi.detail('stores',id),storeAdminApi.read(id)]).then(async([detail,governance])=>{
      if(!active)return;setRecord(detail.record);setHistory(detail.history);setData(governance);
      if(detail.record.ownerId&&hasAdminPermission(actor,'users.read'))try{const result=await platformAdminApi.detail('users',detail.record.ownerId);if(active)setOwner(result.record);}catch{/* The store remains readable when owner lookup is outside the user's scope. */}
    }).catch(cause=>{if(active)setError(message(cause));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
  },[id,revision,actor]);
  useEffect(()=>{let active=true;setImpact(null);setImpactError('');setRatings(null);setRatingError('');setReports(null);setReportsError('');
    void storeAdminApi.impact(id,range).then(result=>{if(active)setImpact(result);}).catch(cause=>{if(active)setImpactError(message(cause));});
    void storeAdminApi.ratings(id,range).then(result=>{if(active)setRatings(result);}).catch(cause=>{if(active)setRatingError(message(cause));});
    void storeAdminApi.reports(id).then(result=>{if(active)setReports(result);}).catch(cause=>{if(active)setReportsError(message(cause));});
    return()=>{active=false;};},[id,range,revision]);
  function choose(value:string,ref=''){setAction(value);setTarget(ref);setReason('');setError('');setNotice('');setOutcome('UPHELD');}
  async function submit(event:FormEvent){
    event.preventDefault();if(!record||busy||!data||action==='suspend'&&(!impact||!reports))return;setBusy(true);setError('');
    try{if(action==='profile-contact'){const result=await storeAdminApi.profileContact(id,{profileVersionId:target,reason:reason.trim()});setRevealedProfile(result);setAction('');return;}
      const extras=action==='review'?{decision:target,profileVersionId:data.profiles[0]?.id}:action==='warning'?{incidentKey,remedyBy:new Date(remedyBy).toISOString()}:action==='remedy'?{violationId:target}:action==='appeal'?{appealId:target,outcome}:action==='ownership'?{kind:ownershipKind,targetUserId,verificationRef}:action==='ownership-review'?{ownershipId:target,outcome,verificationRef}:{};
      const cmd={action,reason:reason.trim(),version:record.version,...extras};const requestId=adminRequestId(attempt.current,{id,...cmd});
      if(action==='suspend'||action==='restore')await platformAdminApi.moderate('stores',record,action,reason.trim(),requestId);
      else {const result=await storeAdminApi.command(id,{...cmd,requestId});if(result.eligible===false){setNotice('Shop không còn đạt điều kiện; badge đã được thu hồi và đã thông báo chủ shop.');setAction('');setRevision(value=>value+1);changed();return;}}
      setNotice('Đã lưu quyết định và gửi vào hộp thông báo của chủ shop.');setAction('');setRevision(value=>value+1);changed();
    }catch(cause){setError(message(cause));}finally{setBusy(false);}
  }
  return <AdminDialog title="Hồ sơ cửa hàng và người bán" close={()=>{if(!busy)close();}} busy={busy}><div className="pa-detail sa-workspace">
    {notice&&<p className="pa-success" role="status">{notice}</p>}
    {error&&<p className="pa-error" role="alert">{error} <button className="pa-text-link" disabled={busy} onClick={()=>setRevision(value=>value+1)}>Tải lại hồ sơ</button></p>}
    {loading?<p role="status">Đang tải hồ sơ…</p>:record&&data&&<>
      <h2>{record.name}</h2><div className="pa-detail-badges"><StatusBadge status={record.status}/><span>{registrationLabels[record.registrationStatus||'NOT_REQUIRED']}</span></div>
      <dl><div><dt>Chủ shop</dt><dd>{owner?.fullName||record.ownerId} {owner?.email&&<small>{owner.email}</small>}{hasAdminPermission(actor,'users.read')&&<Link to={`/admin/users?id=${record.ownerId}`} onClick={close}>Xem hồ sơ chủ shop →</Link>}</dd></div>
        <div><dt>Đường dẫn</dt><dd>/{record.slug}</dd></div><div><dt>Email liên hệ</dt><dd>{record.contactEmail||'Chưa có dữ liệu'}</dd></div>
        <div><dt>Ý định seller nhận đơn</dt><dd>{record.acceptingOrders?'Có':'Không — seller tự ngừng'}</dd></div><div><dt>Nhận đơn có hiệu lực</dt><dd>{record.effectiveAcceptingOrders?'Đang nhận':'Không nhận'}</dd></div>
        <div><dt>Lý do sàn chặn</dt><dd>{record.suspensionReason||'Không bị đình chỉ'}</dd></div><div><dt>Ngày tạo</dt><dd>{date(record.createdAt,true)}</dd></div></dl>
      <p>{record.description}</p>
      <section className="sa-section"><h3>Tác động hiện tại và hiệu quả theo kỳ</h3><form className="sa-range" onSubmit={event=>{event.preventDefault();setRange(from&&to?{from,to}:{});}}>
        <label>Từ ngày<input aria-label="Hiệu quả từ ngày" type="date" value={from} onChange={event=>setFrom(event.target.value)} required/></label><label>Đến ngày<input aria-label="Hiệu quả đến ngày" type="date" min={from} value={to} onChange={event=>setTo(event.target.value)} required/></label><button className="pa-button pa-button-light" disabled={busy}>Xem kỳ</button></form>
        {impactError?<p className="pa-error" role="alert">{impactError} <button className="pa-text-link" onClick={()=>setRevision(value=>value+1)}>Thử lại</button></p>:!impact?<p role="status">Đang lấy số liệu tác động…</p>:<>
          <dl><div><dt>Đơn mở</dt><dd>{impact.open_orders}</dd></div><div><dt>Đơn chậm xử lý</dt><dd>{impact.overdue_orders}</dd></div><div><dt>Trả hàng đang mở</dt><dd>{impact.open_returns}</dd></div><div><dt>Hồ sơ hậu mãi mở</dt><dd>{impact.open_cases}</dd></div>
            <div><dt>Đơn trong kỳ</dt><dd>{impact.period_orders}</dd></div><div><dt>Tỷ lệ hủy do shop</dt><dd>{impact.sellerCancellationRate===null?'Chưa có mẫu':`${(impact.sellerCancellationRate*100).toFixed(1)}%`} ({impact.seller_cancelled} đơn)</dd></div>
            <div><dt>Chậm xử lý trong kỳ</dt><dd>{impact.delayed_orders}</dd></div><div><dt>Yêu cầu trả hàng trong kỳ</dt><dd>{impact.period_returns}</dd></div><div><dt>Khiếu nại có kết luận trong kỳ</dt><dd>{impact.concluded_complaints}</dd></div></dl>
          <small>Kỳ {impact.range.from} – {impact.range.to} · Cập nhật {date(impact.updatedAt,true)} · {impact.timeZone}</small><details><summary>Cách tính</summary><p>{impact.definition}</p></details>
        </>}
        <p>Điểm đánh giá: {ratingError?<span role="alert">Chưa tải được từ Engagement. <button className="pa-text-link" onClick={()=>setRevision(value=>value+1)}>Thử lại</button></span>:ratings?ratings.average_rating===null?'Chưa có đánh giá trong kỳ':`${ratings.average_rating.toFixed(2)}/5 (${ratings.review_count} đánh giá công khai)`:'Đang tải…'}</p>
        {ratings&&<small>{ratings.definition}</small>}
        {reportsError?<p className="pa-error" role="alert">Báo cáo Chat chưa sẵn sàng: {reportsError} <button className="pa-text-link" onClick={()=>setRevision(value=>value+1)}>Thử lại báo cáo</button></p>:reports?<><p>Báo cáo hội thoại: {reports.open_reports} đang mở / {reports.total_reports} tổng cộng · {date(reports.updatedAt,true)}</p><small>{reports.definition}</small></>:<p role="status">Đang lấy báo cáo hội thoại…</p>}
        <p className="pa-warning">Đơn cũ và trả hàng vẫn do shop xử lý. Khi seller không thể xử lý, đội vận hành sàn tiếp nhận qua hồ sơ hậu mãi.</p>
        <div className="sa-links">{hasAdminPermission(actor,'orders.read')&&<Link to={`/admin/orders?storeId=${id}`} onClick={close}>Đơn hàng của shop →</Link>}{hasAdminPermission(actor,'cases.read')&&<><Link to={`/admin/cases?kind=DISPUTE&storeId=${id}`} onClick={close}>Khiếu nại →</Link><Link to={`/admin/cases?kind=TICKET&storeId=${id}`} onClick={close}>Ticket hỗ trợ →</Link></>}{hasAdminPermission(actor,'returns.read')&&<Link to={`/admin/returns?storeId=${id}`} onClick={close}>Trả hàng →</Link>}</div>
      </section>
      <section className="sa-section"><h3>Hồ sơ đăng ký và phiên bản</h3>{data.profiles.map((profile,index)=><details key={profile.id} open={index===0}><summary>Phiên bản #{profile.id} · {date(profile.created_at,true)}</summary><p>{profile.profile.name} · {profile.profile.category||'Chưa phân loại'}</p><p>{profile.profile.description}</p><p>Liên hệ: {profile.profile.contactEmail}</p><p>Địa chỉ lấy hàng: {profile.profile.pickupAddress}; trả hàng: {profile.profile.returnAddress}</p></details>)}
        {hasAdminPermission(actor,'users.view_sensitive')&&data.profiles.length>0&&<button className="pa-button pa-button-light" disabled={busy} onClick={()=>choose('profile-contact',data.profiles[0].id)}>Xem liên hệ hồ sơ mới nhất có ghi log</button>}
        {revealedProfile&&<div className="sa-card"><p>{revealedProfile.contactEmail} · {revealedProfile.contactPhone}</p><p>Lấy hàng: {revealedProfile.pickupAddress}</p><p>Trả hàng: {revealedProfile.returnAddress}</p><button className="pa-text-link" onClick={()=>setRevealedProfile(null)}>Ẩn liên hệ</button></div>}
        {canModerate&&record.registrationStatus==='PENDING'&&<div className="sa-links"><button className="pa-button" disabled={busy} onClick={()=>choose('review','APPROVED')}>Duyệt hồ sơ</button><button className="pa-button pa-button-light" disabled={busy} onClick={()=>choose('review','NEEDS_INFORMATION')}>Yêu cầu bổ sung</button><button className="pa-button pa-button-danger" disabled={busy} onClick={()=>choose('review','REJECTED')}>Từ chối</button></div>}
        {record.registrationStatus==='NEEDS_INFORMATION'&&<p>Đang chờ seller cập nhật và nộp lại; yêu cầu bổ sung không phải từ chối vĩnh viễn.</p>}
      </section>
      <section className="sa-section"><h3>Chuỗi vi phạm và hạn khắc phục</h3><p>{data.violations.filter(item=>item.status!=='OVERTURNED').length} sự việc còn hiệu lực trong {data.violations.length} sự việc hiển thị gần nhất.</p>
        {data.violations.map(item=><article className="sa-card" key={item.id}><strong>{item.incident_key}</strong><p>{item.reason}</p><p>{({WARNING:'Đang cảnh cáo',REMEDIED:'Đã khắc phục',OVERTURNED:'Đã hủy'} as Record<string,string>)[item.status]} · Hạn: {date(item.remedy_by,true)}</p>{canModerate&&item.status==='WARNING'&&<button className="pa-button pa-button-light" disabled={busy} onClick={()=>choose('remedy',item.id)}>Ghi nhận khắc phục</button>}</article>)}
        {canModerate&&<button className="pa-button pa-button-light" disabled={busy} onClick={()=>choose('warning')}>Ghi cảnh cáo theo sự việc</button>}
      </section>
      <section className="sa-section"><h3>Kháng nghị</h3>{!data.appeals.length&&<p>Chưa có kháng nghị.</p>}{data.appeals.map(item=><article className="sa-card" key={item.id}><p>{item.reason}</p><p>{({PENDING:'Chờ xét',UPHELD:'Giữ quyết định',OVERTURNED:'Chấp nhận kháng nghị'} as Record<string,string>)[item.status]}</p>{item.review_reason&&<p>{item.review_reason}</p>}{canModerate&&item.status==='PENDING'&&<button className="pa-button pa-button-light" disabled={busy} onClick={()=>choose('appeal',item.id)}>Xét kháng nghị</button>}</article>)}</section>
      <section className="sa-section"><h3>Quyết định đã gửi chủ shop</h3>{!data.decisions.length&&<p>Chưa có quyết định.</p>}{data.decisions.map(item=><article className="sa-card" key={item.id}><strong>{decisionLabels[item.action]||item.action}</strong> · {date(item.created_at,true)}<p>{item.reason}</p><small>{item.scope}</small><p>{item.read_at?'Seller đã đọc':'Chờ seller đọc'} · Kênh kháng nghị: mục Cửa hàng của tôi</p></article>)}</section>
      <details className="sa-section"><summary>Lịch sử thao tác</summary>{history.map(item=><p key={item.id}>{date(item.created_at,true)} · {decisionLabels[item.action||'']||item.action} · {item.reason}</p>)}{data.events.map(item=><p key={`event-${item.id}`}>{date(item.created_at,true)} · {item.action} · {item.reason}</p>)}</details>
      <section className="sa-section"><h3>Badge uy tín</h3><p>{record.reputationBadgeUntil&&Date.parse(record.reputationBadgeUntil)>Date.now()?`Hiệu lực đến ${date(record.reputationBadgeUntil,true)}`:'Chưa có badge còn hiệu lực'}</p><p>{data.policy.reputation.criteria}</p>{canModerate&&<div className="sa-links"><button className="pa-button pa-button-light" disabled={busy} onClick={()=>choose('badge-award')}>Kiểm tra và cấp badge</button>{record.reputationBadgeUntil&&<button className="pa-button pa-button-light" disabled={busy} onClick={()=>choose('badge-revoke')}>Thu hồi badge</button>}</div>}</section>
      <section className="sa-section"><h3>Chuyển chủ và khôi phục quyền sở hữu</h3>{!data.policy.ownershipTransferEnabled?<p>Chính sách chưa được bật trên môi trường này.</p>:<><p>Cần xác minh qua ticket đã kết luận của tài khoản đích và một người duyệt độc lập xác minh lại. Đơn cũ và lịch sử giữ nguyên.</p>{hasAdminPermission(actor,'stores.ownership.request')&&<button className="pa-button pa-button-light" disabled={busy} onClick={()=>{choose('ownership');setVerificationRef('');setTargetUserId('');}}>Tạo đề xuất đã xác minh</button>}
        {data.ownership.map(item=><article className="sa-card" key={item.id}><strong>{item.kind==='TRANSFER'?'Chuyển chủ':'Khôi phục chủ hiện tại'}</strong><p>Tài khoản đích: {item.target_user_id}</p><p>{item.reason} · {item.status==='PENDING'?'Chờ duyệt':item.status==='APPROVED'?'Đã duyệt':'Đã từ chối'}</p><p>{item.review_reason}</p>{item.status==='PENDING'&&hasAdminPermission(actor,'stores.ownership.approve')&&<button className="pa-button pa-button-light" disabled={busy} onClick={()=>{choose('ownership-review',item.id);setOutcome('APPROVED');setVerificationRef('');}}>Xét đề xuất</button>}</article>)}</>}
      </section>
      <p className="pa-detail-muted">Thu giấy tờ định danh chưa được bật. Hệ thống chưa nhận tài liệu định danh người bán.</p>
      {action&&<form className="pa-confirm-box" onSubmit={submit}><h3>{action==='profile-contact'?'Xem liên hệ hồ sơ có ghi log':action==='review'?registrationLabels[target]:action==='warning'?'Ghi cảnh cáo':action==='appeal'?'Xét kháng nghị':action==='remedy'?'Ghi nhận khắc phục':action==='ownership'?'Đề xuất quyền sở hữu':action==='ownership-review'?'Duyệt quyền sở hữu':action==='badge-award'?'Kiểm tra và cấp badge':action==='badge-revoke'?'Thu hồi badge':decisionLabels[action]}</h3>
        {action==='ownership'&&<><label>Loại đề xuất<select value={ownershipKind} onChange={event=>setOwnershipKind(event.target.value)}><option value="TRANSFER">Chuyển chủ</option><option value="RECOVERY">Khôi phục chủ hiện tại</option></select></label><label>ID tài khoản đích<input value={targetUserId} onChange={event=>setTargetUserId(event.target.value)} required pattern="[0-9a-fA-F-]{36}"/></label></>}
        {(action==='ownership'||action==='ownership-review')&&<label>Hồ sơ xác minh {action==='ownership-review'?'độc lập của người duyệt':''}<input value={verificationRef} onChange={event=>setVerificationRef(event.target.value)} required pattern="case:[0-9a-fA-F-]{36}" placeholder="case:UUID của ticket đã kết luận"/></label>}
        {action==='ownership-review'&&<label>Quyết định<select value={outcome} onChange={event=>setOutcome(event.target.value)}><option value="APPROVED">Duyệt và thực hiện</option><option value="REJECTED">Từ chối</option></select></label>}
        {action==='suspend'&&<p>Ngừng nhận đơn mới. Ý định nhận đơn của seller được giữ nguyên để áp dụng khi khôi phục.</p>}
        {action==='restore'&&<p>Gỡ đình chỉ của sàn. Shop tự ngừng hoặc chưa được duyệt vẫn không nhận đơn.</p>}
        {action==='warning'&&<><label>Mã sự việc gốc<input value={incidentKey} onChange={event=>setIncidentKey(event.target.value)} required minLength={8} maxLength={160} placeholder="case: mã hồ sơ hoặc mã sự việc đã đối chiếu"/></label><label>Hạn khắc phục<input type="datetime-local" required value={remedyBy} onChange={event=>setRemedyBy(event.target.value)}/></label><p>Dùng cùng mã cho các báo cáo thuộc một sự việc; hệ thống từ chối ghi trùng.</p></>}
        {action==='appeal'&&<><label>Kết quả<select value={outcome} onChange={event=>setOutcome(event.target.value)}><option value="UPHELD">Giữ quyết định</option><option value="OVERTURNED">Chấp nhận kháng nghị</option></select></label><p>Người xét phải độc lập. Chấp nhận kháng nghị đình chỉ sẽ gỡ chặn; ý định seller được giữ nguyên.</p></>}
        <label>Lý do<textarea aria-label="Lý do quyết định shop" value={reason} onChange={event=>setReason(event.target.value)} required minLength={8} maxLength={500}/></label>
        <div className="pa-dialog-actions"><button type="button" className="pa-button pa-button-light" disabled={busy} onClick={()=>setAction('')}>Hủy</button><button className="pa-button" disabled={busy||reason.trim().length<8||action==='suspend'&&(!impact||!reports)}>{busy?'Đang lưu…':'Xác nhận quyết định'}</button></div>
      </form>}
      <div className="pa-dialog-actions">{canModerate&&!action&&<button className={`pa-button ${record.suspended?'':'pa-button-danger'}`} disabled={busy||!record.suspended&&(!impact||!reports)} onClick={()=>choose(record.suspended?'restore':'suspend')}>{record.suspended?'Khôi phục shop':'Đình chỉ shop'}</button>}<button className="pa-button pa-button-light" disabled={busy} onClick={close}>Đóng</button></div>
    </>}
  </div></AdminDialog>;
}
