import {useEffect,useState,type FormEvent} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {adminCaseApi} from '../../api/adminCaseApi';
import {workQueueApi,type WorkItem,type SlaPolicy,type WorkSettings} from '../../api/workQueueApi';
import {useAdminSession} from './AdminSession';
import {hasAdminPermission} from './adminPolicy';
import {useDashboardRegion,workLabels} from './dashboardState';
import {AdminDialog,date,StatusBadge} from './AdminUi';
import {Region} from './PlatformOverview';
import './dashboard-queue.css';

const views=[['all','Tất cả'],['mine','Việc của tôi'],['unassigned','Chưa phân công'],['overdue','Quá hạn'],['needs_response','Cần phản hồi'],['awaiting_approval','Chờ phê duyệt']];
const priorities:Record<string,string>={URGENT:'Khẩn cấp',HIGH:'Cao',NORMAL:'Bình thường',LOW:'Thấp'};
const states:Record<string,string>={OPEN:'Mới tiếp nhận',IN_PROGRESS:'Đang xử lý',WAITING_RESPONSE:'Chờ phản hồi',AWAITING_APPROVAL:'Chờ phê duyệt',RESOLVED:'Đã hoàn tất'};
const milestones:Record<string,string>={response_reminder:'Sắp đến hạn phản hồi',response_overdue:'Quá hạn phản hồi',resolution_reminder:'Sắp đến hạn giải quyết',resolution_overdue:'Quá hạn giải quyết'};
function Due({item}:{item:WorkItem}) {
  const responseLate=!item.firstResponseAt&&Date.parse(item.responseDueAt)<Date.now();
  const resolutionLate=!item.pausedAt&&Date.parse(item.resolutionDueAt)<Date.now();
  return <><small className={responseLate?'dq-overdue':''}>Phản hồi: {item.firstResponseAt?`đã phản hồi ${date(item.firstResponseAt,true)}`:date(item.responseDueAt,true)} {responseLate?'· Quá hạn':''}</small>
    <small className={resolutionLate?'dq-overdue':''}>Giải quyết: {item.pausedAt?`tạm dừng từ ${date(item.pausedAt,true)}`:date(item.resolutionDueAt,true)} {resolutionLate?'· Quá hạn':''}</small></>;
}
export default function PlatformWorkQueue() {
  const user=useAdminSession(),[params,setParams]=useSearchParams(),[showSettings,setShowSettings]=useState(false);
  const view=params.get('view')||'all',kind=params.get('kind')||'',team=params.get('team')||'',page=params.get('page')||'1',selected=params.get('id')||'';
  const list=useDashboardRegion(JSON.stringify({view,kind,team,page}),true,()=>workQueueApi.list({view,kind,team,page}));
  const settings=useDashboardRegion('settings',true,()=>workQueueApi.settings());
  const notices=useDashboardRegion('notifications',true,()=>workQueueApi.notifications());
  const staff=useDashboardRegion('staff',true,()=>adminCaseApi.staff());
  useEffect(()=>{const timer=setInterval(()=>{list.retry();notices.retry();},30000);return()=>clearInterval(timer);},[list.retry,notices.retry]);
  const [noticeError,setNoticeError]=useState('');
  const staffName=(id:string|null)=>id?(id===user.id?'Tôi':staff.data?.items.find(person=>person.id===id)?.name||id):'Chưa phân công';
  function filter(key:string,value:string){const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);if(!['page','id'].includes(key)){next.delete('page');next.delete('id');}setParams(next);}
  const refresh=()=>{list.retry();notices.retry();};
  return <div className="pa-page"><div className="pa-page-heading"><div><span className="pa-eyebrow">VẬN HÀNH</span><h1>Hàng chờ công việc</h1><p>Asia/Bangkok (UTC+07:00) · Sắp theo ưu tiên và hạn xử lý.</p></div><button className="pa-button pa-button-light" onClick={()=>setShowSettings(value=>!value)}>Quy tắc SLA và trưởng nhóm</button></div>
    <div className="pa-panel dq-range"><label>Việc cần xem<select value={view} onChange={event=>filter('view',event.target.value)}>{views.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label>Loại công việc<select value={kind} onChange={event=>filter('kind',event.target.value)}><option value="">Tất cả</option>{Object.entries(workLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label>Nhóm phụ trách<select value={team} onChange={event=>filter('team',event.target.value)}><option value="">Tất cả</option>{settings.data?.teams.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
    <Region title="Danh sách công việc" loading={list.loading} error={list.error} retry={list.retry}><div className="pa-table-scroll"><table className="pa-table dq-table"><thead><tr><th>Loại / đối tượng</th><th>Ưu tiên</th><th>Người / nhóm phụ trách</th><th>Hạn xử lý</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
      {list.data?.items.map(item=><tr key={item.id}><td><strong>{item.title}</strong><small>{workLabels[item.kind]}</small><small>{item.shopOrderId?`Đơn #${item.shopOrderId.slice(0,8)}`:`Báo cáo #${item.sourceId}`}</small></td>
        <td><span className={['HIGH','URGENT'].includes(item.priority)?'dq-overdue':''}>{priorities[item.priority]}</span>{item.escalationLevel>0&&<small>Đã chuyển cấp {item.escalationLevel}</small>}</td>
        <td>{staffName(item.assigneeId)}<small>{item.teamName} · Trưởng nhóm: {item.leaderId?staffName(item.leaderId):'Chưa cấu hình'}</small></td><td><Due item={item}/></td><td>{states[item.status]||item.status}</td><td><button className="pa-text-link" onClick={()=>filter('id',item.id)}>Mở xử lý</button></td></tr>)}
      {!list.data?.items.length&&<tr><td colSpan={6}>Không có công việc phù hợp.</td></tr>}</tbody></table></div>
      <div className="pa-pagination"><span>{list.data?.total||0} công việc</span><div><button className="pa-button pa-button-light" disabled={Number(page)<=1} onClick={()=>filter('page',String(Number(page)-1))}>Trước</button><span>Trang {page} / {Math.max(1,list.data?.totalPages||1)}</span><button className="pa-button pa-button-light" disabled={!list.data||Number(page)>=list.data.totalPages} onClick={()=>filter('page',String(Number(page)+1))}>Sau</button></div></div></Region>
    {staff.error&&<p className="pa-warning">Chưa tải được tên nhân sự. Mã nhân sự vẫn được hiển thị. <button className="pa-text-link" onClick={staff.retry}>Thử lại</button></p>}
    <Region title="Nhắc hạn và chuyển cấp của tôi" loading={notices.loading} error={notices.error} retry={notices.retry}>
      {noticeError&&<p className="pa-error" role="alert">{noticeError}</p>}
      <ul className="dq-notices">{notices.data?.items.map(item=><li key={item.id}><button className="pa-text-link" onClick={()=>filter('id',item.work_id)}>{item.title} · {milestones[item.milestone]||item.milestone}</button><small>Hạn: {date(item.due_at,true)}</small>
        {!item.read_at?<button className="pa-text-link" onClick={async()=>{try{await workQueueApi.read(item.id);notices.retry();}catch(cause){setNoticeError(cause instanceof Error?cause.message:'Không thể đánh dấu đã đọc.');}}}>Đánh dấu đã đọc</button>:<small>Đã đọc</small>}</li>)}</ul>{!notices.data?.items.length&&<p>Không có thông báo.</p>}</Region>
    {showSettings&&<Region title="Quy tắc SLA" loading={settings.loading} error={settings.error} retry={settings.retry}><p>{settings.data?.pauseRule}</p><p>Quy tắc mới áp dụng cho công việc tạo sau khi lưu. Công việc hiện tại giữ thời hạn đã chốt.</p>
      {settings.data?.policies.map(policy=><SlaEditor key={`${policy.kind}:${policy.version}`} policy={policy} settings={settings.data} staff={staff.data?.items||[]} canManage={hasAdminPermission(user,'work_queue.manage')} changed={settings.retry}/>)}</Region>}
    {selected&&<WorkDialog id={selected} key={selected} staff={staff.data?.items||[]} teams={settings.data?.teams||[]} close={()=>filter('id','')} changed={refresh}/>}
  </div>;
}
function WorkDialog({id,staff,teams,close,changed}:{id:string;staff:{id:string;name:string}[];teams:{id:string;name:string}[];close:()=>void;changed:()=>void}) {
  const user=useAdminSession(),detail=useDashboardRegion(id,true,()=>workQueueApi.detail(id));
  const [action,setAction]=useState('claim'),[reason,setReason]=useState(''),[assignee,setAssignee]=useState(''),[team,setTeam]=useState('support'),[status,setStatus]=useState('IN_PROGRESS'),[priority,setPriority]=useState('NORMAL');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const canUpdate=hasAdminPermission(user,'work_queue.update'),manage=hasAdminPermission(user,'work_queue.manage'),item=detail.data?.record;
  const target=item?.sourceDetails?.returnId?`/admin/returns?id=${item.sourceDetails.returnId}`:item?.kind==='RETURN'?`/admin/returns?id=${item.sourceId}`:item&&['TICKET','DISPUTE'].includes(item.kind)?`/admin/cases?kind=${item.kind}&id=${item.sourceId}`:item?.shopOrderId?`/admin/orders?id=${item.shopOrderId}`:null;
  async function submit(event:FormEvent){event.preventDefault();if(!item||busy)return;setBusy(true);setError('');setNotice('');
    try{await workQueueApi.action(id,{action,reason:reason.trim(),version:item.version,...(action==='assign'?{assigneeId:assignee||null}:{}),...(action==='transfer'?{teamId:team}:{}),...(action==='status'?{status}:{}),...(action==='priority'?{priority}:{})});setNotice('Đã cập nhật công việc và lưu lịch sử.');setReason('');detail.retry();changed();}
    catch(cause){setError(cause instanceof Error?cause.message:'Không thể cập nhật.');detail.retry();changed();}finally{setBusy(false);}}
  return <AdminDialog title="Xử lý công việc" close={close} busy={busy}><div className="pa-detail">{detail.error&&<p className="pa-error" role="alert">{detail.error}<button onClick={detail.retry}>Tải lại</button></p>}
    {detail.loading?<p>Đang tải công việc…</p>:item&&<><h3>{item.title}</h3><p>{workLabels[item.kind]} · {priorities[item.priority]} · {states[item.status]}</p><p>Phụ trách: {staff.find(person=>person.id===item.assigneeId)?.name||item.assigneeId||'Chưa phân công'} · {item.teamName}</p>
      <Due item={item}/><p>SLA phản hồi {item.responseMinutes} phút; giải quyết {item.resolutionMinutes} phút. Đã tạm dừng {Math.round(item.pausedSeconds/60)} phút.</p>
      {item.sourceDetails?.reason&&<p>Lý do báo cáo: {item.sourceDetails.reason}</p>}{item.sourceDetails?.conversationId&&<p>Hội thoại: {item.sourceDetails.conversationId} · Tin nhắn: {item.sourceDetails.messageId||'Toàn hội thoại'}</p>}
      {target&&<Link className="pa-button pa-button-light" to={target}>Mở đối tượng nghiệp vụ</Link>}
      {error&&<p className="pa-error" role="alert">{error}</p>}{notice&&<p className="pa-success" role="status">{notice}</p>}
      {canUpdate&&item.sourceActive&&item.status!=='RESOLVED'&&<form onSubmit={submit} className="dq-form"><fieldset disabled={busy}><label>Thao tác<select value={action} onChange={event=>setAction(event.target.value)}><option value="claim">Nhận việc</option><option value="respond">Ghi nhận đã phản hồi</option><option value="status">Cập nhật trạng thái xử lý</option><option value="priority">Đổi ưu tiên</option>{manage&&<><option value="assign">Phân công</option><option value="transfer">Chuyển nhóm</option></>}</select></label>
        {action==='assign'&&<label>Người phụ trách<select value={assignee} onChange={event=>setAssignee(event.target.value)}><option value="">Bỏ phân công</option>{staff.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
        {action==='transfer'&&<label>Nhóm nhận<select value={team} onChange={event=>setTeam(event.target.value)}>{teams.map(group=><option key={group.id} value={group.id}>{group.name}</option>)}</select></label>}
        {action==='status'&&<label>Trạng thái<select value={status} onChange={event=>setStatus(event.target.value)}>{Object.entries(states).filter(([value])=>value!=='OPEN'&&(value!=='RESOLVED'||item.kind==='ABUSE_REPORT')).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
        {action==='priority'&&<label>Ưu tiên<select value={priority} onChange={event=>setPriority(event.target.value)}>{Object.entries(priorities).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
        <label>Lý do (10–500 ký tự)<textarea required minLength={10} maxLength={500} value={reason} onChange={event=>setReason(event.target.value)}/></label><button className="pa-button" disabled={busy||reason.trim().length<10}>{busy?'Đang lưu…':'Lưu thao tác'}</button></fieldset></form>}
      <h3>Lịch sử xử lý</h3><ul className="pa-history">{detail.data.events.map(event=><li key={event.id}><strong>{event.action==='sla_escalated'?'Chuyển cấp do quá hạn':event.action}</strong><time>{date(event.created_at,true)}</time><p>{event.reason}</p></li>)}</ul>
    </>}</div></AdminDialog>;
}
function SlaEditor({policy,settings,staff,canManage,changed}:{policy:SlaPolicy;settings:WorkSettings;staff:{id:string;name:string}[];canManage:boolean;changed:()=>void}) {
  const [response,setResponse]=useState(policy.response_minutes),[resolution,setResolution]=useState(policy.resolution_minutes),[reminder,setReminder]=useState(policy.reminder_minutes),[leader,setLeader]=useState(settings.teams.find(team=>team.id===policy.team_id)?.leader_id||'');
  const [reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{await workQueueApi.updateSettings(policy.kind,{version:policy.version,responseMinutes:response,resolutionMinutes:resolution,reminderMinutes:reminder,leaderId:leader||null,reason});changed();}catch(cause){setError(cause instanceof Error?cause.message:'Không thể lưu SLA.');}finally{setBusy(false);}}
  return <details className="dq-policy"><summary>{workLabels[policy.kind]} · Phản hồi {policy.response_minutes} phút / Giải quyết {policy.resolution_minutes} phút</summary><form onSubmit={submit} className="dq-form"><fieldset disabled={!canManage||busy}>
    <label>Phản hồi (phút)<input type="number" min={1} max={525600} required value={response} onChange={event=>setResponse(Number(event.target.value))}/></label>
    <label>Giải quyết (phút)<input type="number" min={response} max={525600} required value={resolution} onChange={event=>setResolution(Number(event.target.value))}/></label>
    <label>Nhắc trước hạn (phút)<input type="number" min={0} max={10080} required value={reminder} onChange={event=>setReminder(Number(event.target.value))}/></label>
    <label>Trưởng nhóm<select value={leader} onChange={event=>setLeader(event.target.value)}><option value="">Chưa cấu hình</option>{staff.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}{leader&&!staff.some(person=>person.id===leader)&&<option value={leader}>{leader}</option>}</select></label>
    <label>Lý do thay đổi<textarea minLength={10} maxLength={500} required value={reason} onChange={event=>setReason(event.target.value)}/></label>{canManage&&<button className="pa-button">{busy?'Đang lưu…':'Lưu quy tắc'}</button>}</fieldset>{error&&<p className="pa-error" role="alert">{error}</p>}</form></details>;
}
