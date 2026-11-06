import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useSearchParams} from 'react-router-dom';
import {platformAdminApi,type AdminPage,type AdminRecord} from '../../api/platformAdminApi';
import {catalogApi,type CategoryNode} from '../../api/catalogApi';
import {productModerationApi as api,type ProductRule,type BulkPreview,type BulkJob} from '../../api/productModerationApi';
import {adminRequestId} from '../../api/adminCommand';
import {AdminDialog,date,money,StatusBadge} from './AdminUi';
import ProductWorkspace,{reasonLinks} from './ProductWorkspace';
import {hasAdminPermission} from './adminPolicy';
import {useAdminSession} from './AdminSession';
import './product-admin.css';
const groups:Record<string,string>={MISLEADING:'Nội dung sai lệch',PROHIBITED:'Hàng bị cấm',INAPPROPRIATE_IMAGE:'Ảnh không phù hợp',COUNTERFEIT:'Giả mạo thương hiệu',SPAM:'Spam',REMEDIATION:'Khắc phục / xét lại'};
const flatten=(items:CategoryNode[]):CategoryNode[]=>items.flatMap(item=>[item,...flatten(item.children)]);
function PublicationPolicy(){
  const [policy,setPolicy]=useState<{prePublicationReview:boolean;version:number}|null>(null),[required,setRequired]=useState(false),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const attempt=useRef({signature:'',requestId:''});
  function load(){api.rules().then(r=>{setPolicy(r.policy);setRequired(r.policy.prePublicationReview);}).catch(e=>setError(e.message));}
  useEffect(load,[]);
  async function save(e:FormEvent){e.preventDefault();if(!policy)return;setBusy(true);setError('');const input={approvalRequired:required,version:policy.version,reason};
    try{await api.savePolicy({...input,requestId:adminRequestId(attempt.current,input)});load();setReason('');}catch(e){setError(e instanceof Error?e.message:'Chưa lưu được chính sách.');}finally{setBusy(false);}}
  return <details className="pa-panel"><summary className="product-rules">Chính sách duyệt trước đăng</summary><form className="product-rules" onSubmit={save}>
    <p>Khi bật, sản phẩm mới và thay đổi tên, mô tả, ảnh, danh mục, thương hiệu, giá, biến thể hoặc thuộc tính phải được duyệt trước khi hiển thị. Thay đổi riêng số tồn kho không cần duyệt lại.</p>
    <p>Sản phẩm hiện có được giữ trạng thái đến lần thay đổi nội dung tiếp theo. Tắt chính sách dừng tạo yêu cầu duyệt mới; các bản đang chờ vẫn cần được xử lý.</p>
    {error&&<p className="pa-error" role="alert">{error} <button type="button" onClick={load}>Tải lại</button></p>}
    <label>Duyệt trước đăng<select disabled={!policy||busy} value={String(required)} onChange={e=>setRequired(e.target.value==='true')}><option value="false">Tắt</option><option value="true">Bật</option></select></label>
    <label>Lý do thay đổi<textarea required minLength={8} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label><button className="pa-button" disabled={!policy||busy||policy.prePublicationReview===required}>{busy?'Đang lưu…':'Lưu chính sách'}</button>
  </form></details>;
}
function RuleEditor({rules,refresh}:{rules:ProductRule[];refresh:()=>void}){
  const [selected,setSelected]=useState(''),[code,setCode]=useState(''),[group,setGroup]=useState('MISLEADING'),[label,setLabel]=useState(''),[description,setDescription]=useState(''),[enabled,setEnabled]=useState(true),[reason,setReason]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),attempt=useRef({signature:'',requestId:''});
  function choose(value:string){setSelected(value);const rule=rules.find(r=>r.code===value);setCode(rule?.code||'');setGroup(rule?.violation_group||'MISLEADING');setLabel(rule?.label||'');setDescription(rule?.description||'');setEnabled(rule?.enabled??true);}
  async function save(e:FormEvent){e.preventDefault();setBusy(true);setError('');const input={code,group,label,description,enabled,reason,version:Number(rules.find(r=>r.code===selected)?.version??0)};
    try{await api.saveRule({...input,requestId:adminRequestId(attempt.current,input)});refresh();setReason('');}catch(e){setError(e instanceof Error?e.message:'Không thể lưu quy tắc.');}finally{setBusy(false);}}
  return <details className="pa-panel"><summary className="product-rules">Cấu hình quy tắc vi phạm</summary><form className="product-rules" onSubmit={save}>
    {error&&<p className="pa-error" role="alert">{error}</p>}<label>Quy tắc<select value={selected} onChange={e=>choose(e.target.value)}><option value="">Thêm quy tắc</option>{rules.map(r=><option key={r.code} value={r.code}>{r.code} · {r.enabled?'Đang dùng':'Đã tắt'}</option>)}</select></label>
    <label>Mã<input required pattern="[A-Z][A-Z0-9_]{2,59}" value={code} disabled={!!selected} onChange={e=>setCode(e.target.value)}/></label>
    <label>Nhóm<select value={group} onChange={e=>setGroup(e.target.value)}>{Object.entries(groups).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
    <label>Tên quy tắc<input required minLength={3} maxLength={200} value={label} onChange={e=>setLabel(e.target.value)}/></label><label>Nội dung chính sách<textarea maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)}/></label>
    <label>Áp dụng<select value={String(enabled)} onChange={e=>setEnabled(e.target.value==='true')}><option value="true">Đang dùng</option><option value="false">Đã tắt</option></select></label>
    <label>Lý do thay đổi<textarea required minLength={8} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label><button className="pa-button" disabled={busy}>{busy?'Đang lưu…':'Lưu quy tắc'}</button>
  </form></details>;
}
function BulkDialog({items,rules,close,changed}:{items:AdminRecord[];rules:ProductRule[];close:()=>void;changed:()=>void}){
  const [autoRun,setAutoRun]=useState(true);
  const [action,setAction]=useState('suspend'),[code,setCode]=useState(''),[reason,setReason]=useState(''),[evidence,setEvidence]=useState(''),[preview,setPreview]=useState<BulkPreview|null>(null),[job,setJob]=useState<BulkJob|null>(null),[resumeId,setResumeId]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function view(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{setPreview(await api.preview(items.map(i=>({id:i.id,version:i.version})),{action,reasonCode:code,reason,evidence:reasonLinks(evidence)}));}catch(e){setError(e instanceof Error?e.message:'Không thể xem trước.');}finally{setBusy(false);}}
  async function run(existing?:BulkJob){setBusy(true);setError('');try{let current=existing||job||await api.createJob(preview!.id);setJob(current);sessionStorage.setItem('product-moderation-job',current.id);
      current=await api.job(current.id,true);setJob(current);changed();
      if(current.status==='COMPLETED')sessionStorage.removeItem('product-moderation-job');
    }catch(e){setAutoRun(false);setError(e instanceof Error?e.message:'Chưa hoàn tất job. Có thể tiếp tục bằng mã job.');}finally{setBusy(false);}}
  useEffect(()=>{setResumeId(sessionStorage.getItem('product-moderation-job')||'');},[]);
  useEffect(()=>{if(!job||job.status==='COMPLETED'||busy||!autoRun)return;const timer=window.setTimeout(()=>void run(),250);return()=>window.clearTimeout(timer);},[job,busy,autoRun]);
  return <AdminDialog title="Kiểm duyệt hàng loạt" close={close} busy={busy}><div className="product-bulk">
    {error&&<p className="pa-error" role="alert">{error}</p>}
    {!job&&<label>Tiếp tục job đã tạo<input value={resumeId} onChange={e=>setResumeId(e.target.value)} placeholder="Mã job"/><button className="pa-button pa-button-light" disabled={busy||!resumeId} onClick={()=>{setBusy(true);api.job(resumeId).then(setJob).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>Tải job</button></label>}
    {!preview&&!job&&<form onSubmit={view} className="product-bulk"><p>Chỉ xử lý {items.length} sản phẩm đã chọn rõ trong trang hiện tại. Tối đa 200 mục mỗi job.</p>
      <label>Thao tác<select value={action} onChange={e=>setAction(e.target.value)}><option value="suspend">Ẩn bởi sàn</option><option value="restore">Khôi phục</option></select></label>
      <label>Mã lý do chung<select required value={code} onChange={e=>setCode(e.target.value)}><option value="">Chọn mã lý do</option>{rules.filter(r=>r.enabled&&(action!=='suspend'||r.violation_group!=='REMEDIATION')).map(r=><option key={r.code} value={r.code}>{r.label}</option>)}</select></label>
      <label>Giải thích chung<textarea required minLength={8} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label><label>Bằng chứng, mỗi dòng một liên kết<textarea value={evidence} onChange={e=>setEvidence(e.target.value)}/></label>
      <button className="pa-button" disabled={busy||!items.length}>Xem trước danh sách và quyền từng mục</button></form>}
    {preview&&!job&&<><p><strong>{preview.command.action==='suspend'?'Ẩn':'Khôi phục'} · {preview.command.reasonCode}</strong></p><p>{preview.command.reason}</p><p>{preview.items.filter(i=>i.eligible).length} mục đủ điều kiện. Quyền và phiên bản sẽ được kiểm tra lại khi xử lý.</p>
      <div className="product-bulk-results">{preview.items.map(i=><p key={i.id}>{i.name||i.id} · {i.eligible?'Đủ điều kiện':i.message}</p>)}</div>
      <button className="pa-button" disabled={busy||!preview.items.some(i=>i.eligible)} onClick={()=>void run()}>{busy?'Đang xử lý…':'Xác nhận danh sách và tạo job'}</button><button className="pa-button pa-button-light" disabled={busy} onClick={()=>setPreview(null)}>Sửa yêu cầu</button></>}
    {job&&<><p>Job <code>{job.id}</code> · {job.status}</p><p>Thành công: {job.items.filter(i=>i.status==='SUCCEEDED').length} · Thất bại: {job.items.filter(i=>i.status==='FAILED').length} · Chờ: {job.items.filter(i=>i.status==='PENDING').length}</p>
      <div className="product-bulk-results">{job.items.map(i=><p key={i.id}>{i.name||i.id} · {i.status} {i.message}</p>)}</div>
      {job.status!=='COMPLETED'&&<button className="pa-button" disabled={busy} onClick={()=>{setAutoRun(true);void run();}}>{busy?'Đang xử lý…':'Tiếp tục xử lý tối đa 20 mục'}</button>}
    </>}
  </div></AdminDialog>;
}
export default function PlatformProducts(){
  const actor=useAdminSession(),canModerate=hasAdminPermission(actor,'products.moderate');
  const canConfigure=actor?.adminAccess?.grants?.some(g=>g.permission==='products.moderate'&&Object.keys(g.scope||{}).length===0);
  const [params,setParams]=useSearchParams(),[data,setData]=useState<AdminPage<AdminRecord>|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const [rules,setRules]=useState<ProductRule[]>([]),[categories,setCategories]=useState<CategoryNode[]>([]),[selected,setSelected]=useState<string[]>([]),[bulk,setBulk]=useState(false),[draft,setDraft]=useState(params.get('q')||'');
  const page=Math.max(1,Number(params.get('page'))||1),queryKey=params.toString();
  useEffect(()=>{api.rules().then(r=>setRules(r.items)).catch(e=>setError(e.message));catalogApi.categories().then(r=>setCategories(flatten(r.categories))).catch(()=>{});},[revision]);
  useEffect(()=>{let active=true;setLoading(true);setSelected([]);setData(null);setError('');const filters=Object.fromEntries(params);delete filters.id;
    platformAdminApi.list('products',{...filters,page,limit:20}).then(result=>{if(active)setData(result);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[queryKey,page,revision]);
  useEffect(()=>setDraft(params.get('q')||''),[queryKey]);
  function filter(key:string,value:string){const next=new URLSearchParams(params);value?next.set(key,value):next.delete(key);if(key!=='page'&&key!=='id')next.delete('page');if(key!=='id')next.delete('id');setParams(next);}
  const fields:[string,string,string][]=[['storeId','Shop (ID)','text'],['brand','Thương hiệu','text'],['from','Từ ngày','date'],['to','Đến ngày','date']];
  return <div className="pa-page"><div className="pa-page-heading"><div><span className="pa-eyebrow">QUẢN LÝ VẬN HÀNH</span><h1>Sản phẩm và kiểm duyệt</h1><p>Tra cứu hàng hóa, kiểm tra phiên bản và xử lý vi phạm.</p></div><button className="pa-button pa-button-light" disabled={loading} onClick={()=>setRevision(v=>v+1)}>Làm mới</button></div>
    <section className="pa-panel"><div className="pa-records-top"><h2>Danh sách sản phẩm {data&&`(${data.total})`}</h2><form className="pa-search" onSubmit={e=>{e.preventDefault();filter('q',draft);}}><input aria-label="Tìm sản phẩm" placeholder="Tên, shop hoặc thương hiệu" maxLength={100} value={draft} onChange={e=>setDraft(e.target.value)}/><button>Tìm</button></form></div>
      <div className="product-filter-grid">{fields.map(([key,label,type])=><label key={key}>{label}<input type={type} value={params.get(key)||''} onChange={e=>filter(key,e.target.value)}/></label>)}
        <label>Danh mục<select value={params.get('categoryId')||''} onChange={e=>filter('categoryId',e.target.value)}><option value="">Tất cả danh mục</option>{categories.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
        <label>Trạng thái seller<select value={params.get('publicationStatus')||''} onChange={e=>filter('publicationStatus',e.target.value)}><option value="">Tất cả</option><option value="active">Đang bán</option><option value="published">Đã đăng bán</option><option value="draft">Bản nháp</option><option value="hidden">Seller đã ẩn</option><option value="discontinued">Ngừng kinh doanh</option></select></label>
        <label>Kiểm duyệt<select value={params.get('moderation')||''} onChange={e=>filter('moderation',e.target.value)}><option value="">Tất cả</option><option value="REVIEW_PENDING">Chờ duyệt đăng bán</option><option value="REVIEW_NEEDS_CHANGES">Cần sửa trước đăng bán</option><option value="BLOCKED">Sàn đang chặn</option><option value="CLEAR">Không chặn, không yêu cầu sửa</option><option value="NEEDS_CHANGES">Cần chỉnh sửa</option><option value="REMEDY_SUBMITTED">Seller đã khắc phục</option></select></label>
        <label>Tồn kho<select value={params.get('stock')||''} onChange={e=>filter('stock',e.target.value)}><option value="">Tất cả</option><option value="in_stock">Còn hàng</option><option value="out_of_stock">Hết hàng</option></select></label><button className="pa-text-link" onClick={()=>setParams({})}>Xóa bộ lọc</button></div>
      {error&&<p className="pa-error" role="alert">{error}</p>}
      {canModerate&&<div className="pa-filters"><span>Đã chọn {selected.length} mục trong trang hiện tại</span><button className="pa-button pa-button-light" disabled={!selected.length} onClick={()=>setBulk(true)}>Xem trước xử lý hàng loạt</button><button className="pa-text-link" onClick={()=>setBulk(true)}>Tiếp tục job</button></div>}
      <div className="pa-table-scroll" aria-busy={loading}><table className="pa-table"><thead><tr>{canModerate&&<th><input type="checkbox" aria-label="Chọn sản phẩm trong trang hiện tại" checked={!!data?.items.length&&selected.length===data.items.length} disabled={loading} onChange={e=>setSelected(e.target.checked?data?.items.map(i=>i.id)||[]:[])}/></th>}<th>Sản phẩm / shop</th><th>Giá / tồn kho</th><th>Seller</th><th>Kiểm duyệt</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead><tbody>
        {data?.items.map(row=><tr key={row.id}>{canModerate&&<td><input type="checkbox" aria-label={`Chọn ${row.name}`} checked={selected.includes(row.id)} onChange={e=>setSelected(v=>e.target.checked?[...v,row.id]:v.filter(id=>id!==row.id))}/></td>}<td><strong>{row.name}</strong><small>{row.storeName} · {row.brand||'Chưa có thương hiệu'}</small><small>{row.categoryName}</small></td><td>{money(row.priceMinor)}<small>Tồn: {row.stock}</small></td><td><StatusBadge status={row.publicationStatus}/></td><td>{row.suspended?'Sàn đang chặn':row.reviewStatus==='PENDING'?'Chờ duyệt đăng bán':row.reviewStatus==='NEEDS_CHANGES'?'Cần sửa trước đăng bán':row.moderationStatus==='NEEDS_CHANGES'?'Cần chỉnh sửa':row.moderationStatus==='REMEDY_SUBMITTED'?'Seller đã khắc phục':'Không chặn'}</td><td>{date(row.createdAt)}</td><td><button className="pa-row-action" onClick={()=>filter('id',row.id)}>Kiểm duyệt</button></td></tr>)}
        {!data?.items.length&&<tr><td colSpan={7} className="pa-empty-cell">{loading?'Đang tải…':'Không có sản phẩm phù hợp.'}</td></tr>}
      </tbody></table></div><div className="pa-pagination"><span>{data?.total||0} sản phẩm · Trang {page}/{Math.max(1,data?.totalPages||1)}</span><div><button disabled={loading||page<=1} onClick={()=>filter('page',String(page-1))}>Trước</button><button disabled={loading||!data||page>=data.totalPages} onClick={()=>filter('page',String(page+1))}>Sau</button></div></div>
    </section>
    {canConfigure&&<><PublicationPolicy/><RuleEditor rules={rules} refresh={()=>setRevision(v=>v+1)}/></>}
    {params.get('id')&&<ProductWorkspace key={params.get('id')} id={params.get('id')!} close={()=>filter('id','')} changed={()=>setRevision(v=>v+1)}/>}
    {bulk&&<BulkDialog items={data?.items.filter(i=>selected.includes(i.id))||[]} rules={rules} close={()=>setBulk(false)} changed={()=>setRevision(v=>v+1)}/>}
  </div>;
}
