import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {userAdminApi,type UserWorkspaceData} from '../../api/userAdminApi';
import {platformAdminApi} from '../../api/platformAdminApi';
import {adminCaseApi} from '../../api/adminCaseApi';
import {adminRequestId} from '../../api/adminCommand';
import {useAdminSession} from './AdminSession';
import {hasAdminPermission} from './adminPolicy';
import {useDashboardRegion} from './dashboardState';
import {AdminDialog,date,StatusBadge} from './AdminUi';
import {Region} from './PlatformOverview';
import './user-admin.css';

const errorMessage=(error:unknown)=>error instanceof Error?error.message:'Chưa thể thực hiện thao tác.';
export default function UserWorkspace({id,close,changed}:{id:string;close:()=>void;changed:()=>void}){
  const actor=useAdminSession(),can=(permission:string)=>hasAdminPermission(actor,permission),detail=useDashboardRegion(id,true,()=>userAdminApi.workspace(id));
  const [tab,setTab]=useState('overview'),[action,setAction]=useState(''),[reason,setReason]=useState(''),[reasonCode,setReasonCode]=useState('OTHER'),[expiresAt,setExpiresAt]=useState(''),[family,setFamily]=useState('all');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[contact,setContact]=useState<{email:string;phone:string|null}|null>(null);
  const attempt=useRef({signature:'',requestId:''}),data=detail.data,record=data?.record,suspended=record?.status==='suspended',protectedAccount=Boolean(record?.roles?.includes('platform_admin')||data?.anonymizedAt);
  const impact=useDashboardRegion(id,action==='moderate'&&!suspended,()=>userAdminApi.impact(id));
  const sessions=useDashboardRegion(id,tab==='sessions'&&can('users.sessions.read')&&!protectedAccount,()=>userAdminApi.sessions(id));
  const signals=useDashboardRegion(id,tab==='signals'&&can('users.signals.read'),()=>userAdminApi.signals(id));
  const events=useDashboardRegion(id,tab==='history'&&can('audit.read'),()=>userAdminApi.events(id));
  useEffect(()=>{setContact(null);},[record?.version]);
  useEffect(()=>{if(!contact)return;const timer=setTimeout(()=>setContact(null),60000);return()=>clearTimeout(timer);},[contact]);
  function begin(next:string){setAction(next);setReason('');setError('');setNotice('');setReasonCode('OTHER');setExpiresAt('');}
  const refresh=()=>{detail.retry();sessions.retry();changed();};
  async function submit(event:FormEvent){event.preventDefault();if(!record||busy)return;setBusy(true);setError('');setNotice('');
    try{const payload={version:record.version,reason:reason.trim(),action,reasonCode,expiresAt,family};const command={version:record.version,reason:reason.trim(),requestId:adminRequestId(attempt.current,payload)};
      if(action==='contact'){setContact(await userAdminApi.contact(id,command));setNotice('Đã ghi nhận việc xem dữ liệu liên hệ. Dữ liệu sẽ tự ẩn sau 60 giây.');}
      else if(action==='moderate'){await userAdminApi.moderate(id,{...command,action:suspended?'restore':'suspend',reasonCode,restrictionScope:'ACCOUNT',expiresAt:expiresAt?new Date(`${expiresAt}+07:00`).toISOString():null,...(!suspended?{impactConfirmed:true}:{})});setNotice(suspended?'Đã khôi phục; yêu cầu xác minh email được giữ nguyên.':'Đã khóa tài khoản và thu hồi các phiên.');refresh();}
      else if(action==='reset'){await userAdminApi.resetPassword(id,command);setNotice('Đã xếp gửi email đặt lại mật khẩu đến chủ tài khoản.');}
      else if(action==='revoke'){await userAdminApi.revoke(id,{...command,familyId:family});setNotice('Đã thu hồi phiên đã chọn và ghi log.');sessions.retry();}
      attempt.current={signature:'',requestId:''};setAction('');setReason('');
    }catch(cause){setError(errorMessage(cause));if(action==='moderate')detail.retry();}finally{setBusy(false);}}
  const impactUnavailable=!suspended&&(impact.loading||!!impact.error||!impact.data||impact.data.modules.some(module=>!module.ok));
  return <AdminDialog title="Hồ sơ người dùng" close={close} busy={busy}><div className="pa-detail ua-workspace">
    {detail.error&&<p className="pa-error" role="alert">{detail.error}<button className="pa-text-link" onClick={detail.retry}>Thử lại</button></p>}
    {detail.loading?<p role="status">Đang tải hồ sơ…</p>:record&&<><h3>{record.fullName} · #{record.id.slice(0,8)}</h3><div className="pa-detail-badges"><StatusBadge status={record.status}/><span>{data.violationCount} lần vi phạm được giữ nguyên sau rà soát</span></div>
      <p className="ua-masked-contact">{record.email} · Email {record.emailVerifiedAt?'đã xác minh':'chưa xác minh'}</p>
      {data.decisions.some(decision=>decision.reason_code==='LEGACY')&&<p className="pa-detail-muted">Quyết định cũ chưa phân loại lý do được giữ trong lịch sử và chưa cộng vào số lần vi phạm có căn cứ chuẩn.</p>}
      {data.anonymizedAt&&<p className="pa-warning">Đã ẩn danh {date(data.anonymizedAt,true)}. Mã người dùng vẫn được giữ để truy vết nghiệp vụ.</p>}
      <nav className="ua-tabs" aria-label="Các phần hồ sơ">{[['overview','Tổng quan'],['links','Liên kết nghiệp vụ'],['history','Quyết định quản trị'],...(can('users.notes.read')||can('users.notes.manage')?[['notes','Ghi chú nội bộ']]:[]),...(can('users.sessions.read')&&!protectedAccount?[['sessions','Phiên đăng nhập']]:[]),...(can('users.signals.read')?[['signals','Tín hiệu điều tra']]:[])].map(([key,label])=><button key={key} type="button" className={tab===key?'is-active':''} onClick={()=>setTab(key)}>{label}</button>)}</nav>
      {tab==='overview'&&<><dl><div><dt>Mã người dùng</dt><dd>{record.id}</dd></div><div><dt>Ngày tạo</dt><dd>{date(record.createdAt,true)}</dd></div><div><dt>Nhóm được giao</dt><dd>{data.assignment?.name||'Chưa phân công nhóm'}</dd></div><div><dt>Phạm vi khóa</dt><dd>{suspended?'Toàn tài khoản: đăng nhập và giao dịch mới':'Không có khóa đang áp dụng'}</dd></div></dl>
        {data.decisions.find(decision=>decision.id===data.suspensionId)&&<p className="pa-warning">Lý do: {data.decisions.find(decision=>decision.id===data.suspensionId)?.reason} · Hết hạn: {date(data.decisions.find(decision=>decision.id===data.suspensionId)?.expires_at||undefined,true)}</p>}
        {contact&&<div className="pa-warning" role="status"><strong>Liên hệ đầy đủ đã được ghi log</strong><p>{contact.email} · {contact.phone||'Chưa có số điện thoại'}</p><button className="pa-text-link" onClick={()=>setContact(null)}>Ẩn ngay</button></div>}
        <div className="ua-actions">{can('users.view_sensitive')&&<button className="pa-button pa-button-light" onClick={()=>begin('contact')}>Xem liên hệ có ghi log</button>}
          {can('users.moderate')&&!protectedAccount&&<button className="pa-button pa-button-danger" onClick={()=>begin('moderate')}>{suspended?'Khôi phục tài khoản':'Khóa tài khoản'}</button>}
          {can('users.password_reset')&&!protectedAccount&&record.status==='active'&&<button className="pa-button pa-button-light" onClick={()=>begin('reset')}>Gửi luồng đặt lại mật khẩu</button>}
          {(can('users.appeals.read')||can('privacy.read'))&&<Link className="pa-button pa-button-light" to={`/admin/user-workflows?kind=${can('users.appeals.read')?'APPEAL':'ACCESS'}&userId=${id}`}>Hồ sơ kháng nghị / dữ liệu</Link>}</div></>}
      {tab==='links'&&<UserRelated id={id}/>}
      {tab==='history'&&<><h3>Quyết định gốc và khôi phục</h3><ul className="pa-history">{data.decisions.map(decision=><li key={decision.id} id={`decision-${decision.id}`}><strong>{decision.action==='suspend'?'Khóa tài khoản':decision.action==='expire'?'Hết hạn khóa tạm thời':'Khôi phục'} · {data.reasonCodes[decision.reason_code]||decision.reason_code}</strong><time>{date(decision.created_at,true)}</time><p>{decision.reason}</p><small>Mã quyết định: {decision.id} · Người thực hiện: {decision.actor_reference||'Hệ thống'} · {decision.outcome==='OVERTURNED'?'Đã được sửa qua kháng nghị':'Giữ nguyên quyết định'} · Phạm vi toàn tài khoản{decision.expires_at?` · Đến ${date(decision.expires_at,true)}`:''}</small></li>)}</ul>{!data.decisions.length&&<p>Chưa có quyết định quản trị.</p>}
        {can('audit.read')&&<Region title="Nhật ký truy cập và thao tác người dùng" loading={events.loading} error={events.error} retry={events.retry}><ul className="pa-history">{events.data?.items.map(event=><li key={event.id}><strong>{event.action}</strong><time>{date(event.created_at,true)}</time><p>{event.reason}</p><small>Người thực hiện: {event.actor_reference||'Hệ thống / người dùng'}</small>{Array.isArray(event.metadata.familyIds)&&<small>Nhóm phiên đã thu hồi: {(event.metadata.familyIds as string[]).join(', ')||'Không có phiên còn hiệu lực'}</small>}</li>)}</ul></Region>}</>}
      {tab==='notes'&&<UserNotes data={data} changed={refresh}/>}
      {tab==='sessions'&&!protectedAccount&&<Region title="Phiên đăng nhập · tối đa 50 nhóm phiên gần đây" loading={sessions.loading} error={sessions.error} retry={sessions.retry}><div className="pa-table-scroll"><table className="pa-table"><thead><tr><th>Thiết bị / mã phiên</th><th>Hoạt động gần nhất</th><th>Hết hạn</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{sessions.data?.items.map(session=><tr key={session.familyId}><td>{session.device||'Chưa có tên thiết bị'}<small>{session.familyId}</small></td><td>{date(session.lastActivityAt,true)}</td><td>{date(session.expiresAt,true)}</td><td>{session.active?'Còn hiệu lực':'Đã thu hồi / hết hạn'}</td><td>{session.active&&can('users.sessions.revoke')&&<button className="pa-text-link" onClick={()=>{setFamily(session.familyId);begin('revoke');}}>Thu hồi phiên này</button>}</td></tr>)}</tbody></table></div>{can('users.sessions.revoke')&&<button className="pa-button pa-button-light" onClick={()=>{setFamily('all');begin('revoke');}}>Thu hồi tất cả phiên</button>}</Region>}
      {tab==='signals'&&<Region title="Tín hiệu điều tra" loading={signals.loading} error={signals.error} retry={signals.retry}><p>{signals.data?.notice}</p><ul className="ua-linked-list">{signals.data?.items.map(item=><li key={item.id}><Link className="pa-text-link" to={`/admin/users?id=${item.id}`}>Tài khoản #{item.id.slice(0,8)}</Link><span>{item.sharedIp?`Có IP chung trong ${signals.data?.windowDays||30} ngày. `:''}{item.sharedContact?'Có dữ liệu liên hệ trùng. ':''}</span><StatusBadge status={item.status}/></li>)}</ul>{!signals.data?.items.length&&<p>Chưa có tín hiệu phù hợp trong giới hạn điều tra.</p>}</Region>}
      {error&&<p className="pa-error" role="alert">{error}</p>}{notice&&<p className="pa-success" role="status">{notice}</p>}
      {action&&<form className="ua-command" onSubmit={submit}><fieldset disabled={busy}><h3>{action==='moderate'?suspended?'Xác nhận khôi phục':'Xem tác động và xác nhận khóa':action==='contact'?'Xác nhận xem liên hệ':action==='reset'?'Gửi email đặt lại mật khẩu':'Thu hồi phiên đăng nhập'}</h3>
        {action==='moderate'&&<><label>Lý do chuẩn<select value={reasonCode} onChange={event=>setReasonCode(event.target.value)}>{Object.entries(data.reasonCodes).filter(([key])=>suspended?['OTHER','REMEDIATED','REVIEW_CORRECTION'].includes(key):['ABUSE','FRAUD','PROHIBITED_CONTENT','PAYMENT_ABUSE','SECURITY_RISK','OTHER'].includes(key)).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          <p>Phạm vi: toàn tài khoản. Phiên đã thu hồi sẽ không tự hoạt động lại sau khi khôi phục. Email chưa xác minh vẫn phải xác minh.</p>
          {!suspended&&<><label>Hạn khóa tạm thời · UTC+07:00 (tối đa {data.policy?.temporaryMaxDays||366} ngày; để trống nếu không có hạn)<input type="datetime-local" value={expiresAt} onChange={event=>setExpiresAt(event.target.value)}/></label>
            <Region title="Tác động trước khi khóa" loading={impact.loading} error={impact.error} retry={impact.retry} updatedAt={impact.data?.updatedAt}><p>{impact.data?.sessions} nhóm phiên còn hiệu lực sẽ bị thu hồi.</p>{impact.data?.modules.map(module=><div key={module.module}>{module.module==='catalog'?'Cửa hàng':'Đơn hàng và hậu mãi'}: {module.ok?<>{module.module==='catalog'?`${module.data?.ownedStores} cửa hàng sở hữu`:`${module.data?.activeOrders} đơn đang xử lý (${module.data?.activeBuyerOrders} đơn mua, ${module.data?.activeSellerOrders} đơn bán); ${module.data?.openCases} hồ sơ hậu mãi; ${module.data?.pendingRefunds} hoàn tiền đang chờ`}</>:<span className="pa-error">{module.error}</span>}</div>)}<p>Các đơn và yêu cầu hậu mãi đang mở vẫn phải được xử lý; dữ liệu truy vết được giữ lại.</p></Region></>}
        </>}
        {action==='reset'&&<p>Email sẽ gửi đến chủ tài khoản theo luồng OTP hiện có; có giới hạn tần suất. Quản trị viên không nhận mã xác minh.</p>}
        {action==='revoke'&&<p>{family==='all'?'Thu hồi tất cả nhóm phiên.':`Chỉ thu hồi nhóm phiên ${family}.`} Nhật ký lưu mã nhóm phiên.</p>}
        <label>Lý do thao tác<textarea required minLength={8} maxLength={500} value={reason} onChange={event=>setReason(event.target.value)}/></label><div className="ua-actions"><button className="pa-button" disabled={busy||reason.trim().length<8||(action==='moderate'&&!suspended&&impactUnavailable)}>{busy?'Đang xử lý…':'Xác nhận'}</button><button type="button" className="pa-button pa-button-light" onClick={()=>setAction('')}>Hủy</button></div></fieldset></form>}
    </>}
  </div></AdminDialog>;
}
function UserRelated({id}:{id:string}){
  const actor=useAdminSession(),can=(p:string)=>hasAdminPermission(actor,p);
  const stores=useDashboardRegion(id,can('stores.read'),()=>platformAdminApi.list('stores',{ownerId:id,limit:20}));
  const orders=useDashboardRegion(id,can('orders.read'),()=>platformAdminApi.list('orders',{buyerId:id,limit:20}));
  const tickets=useDashboardRegion(id,can('cases.read'),()=>adminCaseApi.list({kind:'TICKET',userId:id,limit:20}));
  const disputes=useDashboardRegion(id,can('cases.read'),()=>adminCaseApi.list({kind:'DISPUTE',userId:id,limit:20}));
  return <div className="ua-related">{can('stores.read')&&<Region title="Cửa hàng sở hữu" loading={stores.loading} error={stores.error} retry={stores.retry}><Link className="pa-text-link" to={`/admin/stores?ownerId=${id}`}>Xem đủ {stores.data?.total||0} cửa hàng</Link><ul>{stores.data?.items.map(row=><li key={row.id}><Link to={`/admin/stores?ownerId=${id}&id=${row.id}`}>{row.name}</Link> · <StatusBadge status={row.status}/></li>)}</ul></Region>}
    {can('orders.read')&&<Region title="Đơn mua gần đây" loading={orders.loading} error={orders.error} retry={orders.retry}><Link className="pa-text-link" to={`/admin/orders?buyerId=${id}`}>Xem đủ {orders.data?.total||0} đơn mua trong phạm vi được giao</Link><ul>{orders.data?.items.map(row=><li key={row.id}><Link to={`/admin/orders?buyerId=${id}&id=${row.id}`}>Đơn #{row.id.slice(0,8)}</Link> · <StatusBadge status={row.status}/></li>)}</ul></Region>}
    {can('cases.read')&&[[tickets,'TICKET','Ticket hỗ trợ'],[disputes,'DISPUTE','Khiếu nại / tranh chấp']].map(([region,kind,title])=>{const data=region as typeof tickets;return <Region key={String(kind)} title={String(title)} loading={data.loading} error={data.error} retry={data.retry}><Link className="pa-text-link" to={`/admin/cases?kind=${kind}&userId=${id}`}>Xem đủ {data.data?.total||0} hồ sơ</Link><ul>{data.data?.items.map(row=><li key={row.id}><Link to={`/admin/cases?kind=${kind}&userId=${id}&id=${row.id}`}>{row.subject||`Hồ sơ #${row.id.slice(0,8)}`}</Link> · <StatusBadge status={row.status}/></li>)}</ul></Region>;})}
    {!can('stores.read')&&!can('orders.read')&&!can('cases.read')&&<p>Vai trò hiện tại chưa có quyền truy cập các module nghiệp vụ liên quan.</p>}
  </div>;
}
function UserNotes({data,changed}:{data:UserWorkspaceData;changed:()=>void}){
  const actor=useAdminSession(),can=(p:string)=>hasAdminPermission(actor,p),teams=useDashboardRegion('user-teams',true,()=>userAdminApi.teams());
  const member=Boolean(data.assignment&&teams.data?.members.some(row=>row.team_id===data.assignment.team_id&&row.staff_id===actor.id));
  const notes=useDashboardRegion(`${data.record.id}:${data.assignment?.team_id}`,member&&can('users.notes.read'),()=>userAdminApi.notes(data.record.id));
  const [body,setBody]=useState(''),[reason,setReason]=useState(''),[team,setTeam]=useState('support'),[busy,setBusy]=useState(false),[error,setError]=useState('');const attempt=useRef({signature:'',requestId:''});
  async function submit(event:FormEvent,assign=false){event.preventDefault();setBusy(true);setError('');try{const payload={version:data.record.version,reason,body,team,assign};const cmd={version:data.record.version,reason,requestId:adminRequestId(attempt.current,payload)};
    if(assign)await userAdminApi.assignTeam(data.record.id,{...cmd,teamId:team});else await userAdminApi.addNote(data.record.id,{...cmd,body});attempt.current={signature:'',requestId:''};setBody('');setReason('');teams.retry();notes.retry();changed();}catch(cause){setError(errorMessage(cause));}finally{setBusy(false);}}
  return <><p>Chỉ nhóm đang được giao hồ sơ được đọc và viết ghi chú của nhóm. Nội dung này chỉ dùng nội bộ.</p>
    {!member&&<p className="pa-warning">Bạn chưa là thành viên nhóm được giao. Nhân sự quản lý nhóm không mặc nhiên được đọc ghi chú.</p>}
    {teams.error&&<p className="pa-error">{teams.error}<button onClick={teams.retry}>Thử lại</button></p>}
    {member&&can('users.notes.read')&&<Region title="Ghi chú của nhóm" loading={notes.loading} error={notes.error} retry={notes.retry}><ul className="pa-history">{notes.data?.items.map(note=><li key={note.id}><strong>{note.author_name}</strong><time>{date(note.created_at,true)}</time><p>{note.body}</p></li>)}</ul>{!notes.data?.items.length&&<p>Chưa có ghi chú.</p>}</Region>}
    {member&&can('users.notes.create')&&<form className="ua-command" onSubmit={event=>void submit(event)}><label>Nội dung ghi chú nội bộ<textarea value={body} onChange={event=>setBody(event.target.value)} minLength={10} maxLength={2000} required/></label><label>Lý do ghi nhận<textarea value={reason} onChange={event=>setReason(event.target.value)} minLength={8} maxLength={500} required/></label><button className="pa-button" disabled={busy}>{busy?'Đang lưu…':'Lưu ghi chú nội bộ'}</button></form>}
    {can('users.notes.manage')&&<form className="ua-command" onSubmit={event=>void submit(event,true)}><h3>Phân công nhóm phụ trách hồ sơ</h3><label>Nhóm<select value={team} onChange={event=>setTeam(event.target.value)}>{teams.data?.teams.map(row=><option value={row.id} key={row.id}>{row.name}</option>)}</select></label><label>Lý do phân công<textarea value={reason} onChange={event=>setReason(event.target.value)} minLength={8} maxLength={500} required/></label><button className="pa-button" disabled={busy}>Phân công nhóm</button><Link to="/admin/user-workflows?settings=teams" className="pa-text-link">Cấu hình thành viên nhóm</Link></form>}
    {error&&<p className="pa-error" role="alert">{error}</p>}
  </>;
}
