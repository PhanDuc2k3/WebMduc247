import {useEffect,useState,type FormEvent} from 'react';
import {useSearchParams} from 'react-router-dom';
import {adminAccessApi,type AccessPreview,type RoleAssignment} from '../../api/adminAccessApi';
import {useAdminSession} from './AdminSession';
import {hasAdminPermission} from './adminPolicy';
const scopeLabels:Record<string,string>={storeIds:'Shop phụ trách',caseKinds:'Loại hồ sơ',assigneeIds:'Nhóm người xử lý'};
const scopeText=(scope:Record<string,string[]>)=>Object.entries(scope).map(([key,values])=>`${scopeLabels[key]||key}: ${values.join(', ')}`).join(' · ')||'Toàn sàn';
export default function StaffAccess(){
  const user=useAdminSession(),[params,setParams]=useSearchParams();
  const [id,setId]=useState(params.get('id')||''),[staff,setStaff]=useState<{id:string;name:string}[]>([]);
  const [data,setData]=useState<AccessPreview|null>(null),[assignments,setAssignments]=useState<RoleAssignment[]>([]);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[reason,setReason]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{let active=true;adminAccessApi.staff().then(r=>{if(active)setStaff(r.items);}).catch(()=>{});return()=>{active=false;};},[]);
  useEffect(()=>{let active=true;setData(null);setError('');const target=params.get('id');if(target)adminAccessApi.preview(target).then(result=>{if(active){setData(result);setAssignments(result.assignments);}}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Chưa tải được quyền.');});return()=>{active=false;};},[params,revision]);
  const editable=hasAdminPermission(user,'staff.update')&&data?.id!==user.id;
  function setScope(role:string,key:string,value:string){setAssignments(current=>current.map(a=>{if(a.role!==role)return a;const scope={...a.scope},values=value.split(',').map(v=>v.trim()).filter(Boolean);if(values.length)scope[key]=values;else delete scope[key];return {...a,scope};}));}
  async function save(event:FormEvent){event.preventDefault();if(!data||!editable||busy)return;setBusy(true);setError('');setNotice('');try{await adminAccessApi.replace(data.id,assignments.filter(a=>a.role!=='legacy_admin'),data.version,reason.trim(),crypto.randomUUID());setNotice('Đã cập nhật quyền và thu hồi các phiên đăng nhập của nhân viên.');setReason('');setRevision(v=>v+1);}catch(cause){setError(cause instanceof Error?cause.message:'Chưa cập nhật được quyền.');}finally{setBusy(false);}}
  return <div className="pa-page"><div className="pa-page-heading"><div><h1>Nhân sự & quyền hiệu lực</h1><p>Xem nguồn quyền từ từng vai trò và phạm vi được giao.</p></div></div>
    <section className="pa-panel pa-detail"><form className="pa-case-form" onSubmit={event=>{event.preventDefault();setNotice('');setParams({id:id.trim()});setRevision(v=>v+1);}}><label>Nhân viên<select value={id} onChange={event=>setId(event.target.value)}><option value="">Chọn nhân viên</option>{staff.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label>Mã tài khoản<input required value={id} onChange={event=>setId(event.target.value)}/></label><button className="pa-button">Xem quyền</button></form>
    {error&&<p className="pa-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    {data&&<><h2>{data.name}</h2><p>Trạng thái: {data.status} · Phiên bản quyền: {data.version}</p><ul>{data.access.restrictions.map(text=><li key={text}>{text}</li>)}</ul>
      <div className="pa-table-scroll"><table className="pa-table"><thead><tr><th>Quyền hiệu lực</th><th>Nhận từ vai trò</th><th>Phạm vi</th></tr></thead><tbody>{data.access.grants.map((g,index)=><tr key={index}><td>{g.permission}</td><td>{data.roles[g.role]?.label||g.role}</td><td>{scopeText(g.scope)}</td></tr>)}</tbody></table></div>
      {!data.access.grants.length&&<p>Tài khoản chưa có quyền quản trị.</p>}
      {editable&&<form className="pa-case-form" onSubmit={save}><h3 className="pa-case-wide">Phân công vai trò</h3>{data.assignments.some(a=>a.role==='legacy_admin')&&<p className="pa-case-wide">Khi lưu, vai trò chuyển đổi sẽ được thay bằng các vai trò nghiệp vụ đã chọn bên dưới.</p>}
        {Object.entries(data.roles).filter(([role])=>role!=='legacy_admin').map(([role,definition])=>{const assignment=assignments.find(a=>a.role===role);return <fieldset key={data.id+role+revision} className="pa-case-wide"><legend><label><input type="checkbox" checked={Boolean(assignment)} onChange={event=>setAssignments(a=>event.target.checked?[...a,{role,scope:{}}]:a.filter(item=>item.role!==role))}/> {definition.label}</label></legend>{assignment&&!['system_admin','content_editor','marketing','auditor'].includes(role)&&<><p>Để trống các phạm vi để giao toàn sàn. Các danh sách trong cùng vai trò được áp dụng đồng thời.</p>{Object.entries(scopeLabels).map(([key,label])=><label key={key}>{label} (phân cách bằng dấu phẩy)<input defaultValue={assignment.scope[key]?.join(', ')||''} onBlur={event=>setScope(role,key,event.target.value)} placeholder={key==='caseKinds'?'RETURN, TICKET, DISPUTE':'Mã định danh'}/></label>)}</>}</fieldset>;})}
        <label className="pa-case-wide">Lý do thay đổi<textarea required minLength={8} maxLength={500} value={reason} onChange={event=>setReason(event.target.value)}/></label><button disabled={busy||reason.trim().length<8} className="pa-button pa-case-wide">{busy?'Đang lưu…':'Lưu vai trò và thu hồi phiên'}</button></form>}
    </>}
    </section></div>;
}
