import {useEffect,useRef,useState} from 'react';
import {taxonomyApi as api,type TaxonomyData,type TaxCommand,type TaxPreview} from '../../api/taxonomyApi';
import {adminRequestId} from '../../api/adminCommand';
import {useAdminSession} from './AdminSession';
import {AdminDialog,date} from './AdminUi';
import CategoryEditor from './CategoryEditor';
import AttributeSchemaEditor from './AttributeSchemaEditor';
import BrandEditor from './BrandEditor';
import TaxonomyImports from './TaxonomyImports';
import './taxonomy-admin.css';
const actionLabels:Record<string,string>={create:'Tạo danh mục',update:'Cập nhật danh mục',delete:'Xóa danh mục',transfer:'Chuyển sản phẩm',schema:'Thay bộ thuộc tính',brand:'Lưu thương hiệu',merge_brand:'Hợp nhất thương hiệu'};
export default function PlatformTaxonomy(){
  const actor=useAdminSession(),canManage=!!actor?.adminAccess?.grants.some(g=>g.permission==='taxonomy.manage'&&Object.keys(g.scope||{}).length===0),canImport=!!actor?.adminAccess?.grants.some(g=>g.permission==='taxonomy.import'&&Object.keys(g.scope||{}).length===0);
  const [data,setData]=useState<TaxonomyData|null>(null),[selected,setSelected]=useState<string|null>(null),[parentId,setParentId]=useState<string|null>(null),[tab,setTab]=useState('categories'),[search,setSearch]=useState('');
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0),[preview,setPreview]=useState<TaxPreview|null>(null);
  const attempt=useRef({signature:'',requestId:''});
  useEffect(()=>{let active=true;setLoading(true);api.read().then(result=>{if(active){setData(result);setError('');}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[revision]);
  async function view(input:Omit<TaxCommand,'requestId'>){setBusy(true);setError('');setNotice('');try{setPreview(await api.preview({...input,requestId:adminRequestId(attempt.current,input)}));}catch(e){setError(e instanceof Error?e.message:'Không tạo được bản xem trước.');}finally{setBusy(false);}}
  async function commit(){if(!preview)return;setBusy(true);setError('');try{const result=await api.commit(preview.id);setNotice('Đã áp dụng thay đổi và ghi audit.');if(preview.command.action==='create'&&result.result.id)setSelected(result.result.id);if(preview.command.action==='delete')setSelected(null);setPreview(null);setRevision(v=>v+1);}catch(e){setError(e instanceof Error?e.message:'Không áp dụng được thay đổi.');}finally{setBusy(false);}}
  const visible=new Set<string>();if(data)for(const c of data.categories)if(!search||`${c.name} ${c.slug}`.toLowerCase().includes(search.toLowerCase())){let current:typeof c|undefined=c;while(current&&!visible.has(current.id)){visible.add(current.id);current=data.categories.find(p=>p.id===current?.parentId);}}
  const tree=(id:string|null):React.ReactNode=><ul>{data?.categories.filter(c=>c.parentId===id&&visible.has(c.id)).map(c=><li key={c.id}><button className={c.id===selected?'is-selected':''} onClick={()=>{setSelected(c.id);setParentId(null);}}><span>{c.isActive?'●':'○'} {c.name}</span><small>/{c.slug} · {c.productCount} sản phẩm</small></button>{tree(c.id)}</li>)}</ul>;
  return <div className="pa-page tx-page"><div className="pa-page-heading"><div><span className="pa-eyebrow">QUẢN TRỊ CATALOG</span><h1>Danh mục, thương hiệu và thuộc tính</h1><p>Quản lý cây danh mục, tiêu chuẩn thông số và tên thương hiệu dùng chung.</p></div><button className="pa-button pa-button-light" disabled={loading||busy} onClick={()=>setRevision(v=>v+1)}>Tải lại</button></div>
    {error&&<p className="pa-error" role="alert">{error}</p>}{notice&&<p className="pa-success" role="status">{notice}</p>}
    <nav className="tx-tabs" aria-label="Phần quản lý catalog">{[['categories','Cây danh mục'],['attributes','Bộ thuộc tính'],['brands','Thương hiệu'],['imports','Nhập CSV'],['history','Lịch sử']].map(([key,label])=><button key={key} className={tab===key?'is-active':''} onClick={()=>setTab(key)}>{label}</button>)}</nav>
    {!data?<p>{loading?'Đang tải catalog…':'Chưa tải được catalog.'}</p>:<>
      {['categories','attributes'].includes(tab)&&<div className="tx-layout"><aside className="pa-panel tx-tree"><h2>Cây danh mục ({data.categories.length})</h2><input aria-label="Tìm danh mục" placeholder="Tên hoặc slug" value={search} onChange={e=>setSearch(e.target.value)}/>
        {canManage&&<div className="tx-actions"><button className="pa-button pa-button-light" onClick={()=>{setSelected(null);setParentId(null);setTab('categories');}}>Thêm gốc</button><button className="pa-button pa-button-light" disabled={!selected} onClick={()=>{setParentId(selected);setSelected(null);setTab('categories');}}>Thêm con</button></div>}
        {tree(null)}{!data.categories.length&&<p>Chưa có danh mục.</p>}<small>● Hoạt động · ○ Đã ngừng</small>
      </aside>{tab==='categories'?<CategoryEditor data={data} selected={selected} parentId={parentId} canManage={canManage} busy={busy} preview={input=>void view(input)}/>:<AttributeSchemaEditor data={data} id={selected} canManage={canManage} busy={busy} preview={input=>void view(input)}/>}</div>}
      {tab==='brands'&&<BrandEditor data={data} canManage={canManage} busy={busy} preview={input=>void view(input)}/>}
      {tab==='imports'&&<TaxonomyImports version={data.stateVersion} canImport={canImport} changed={()=>setRevision(v=>v+1)}/>}
      {tab==='history'&&<section className="pa-panel tx-editor"><h2>Nhật ký catalog</h2>{data.history.map(h=><article className="tx-audit" key={h.id}><strong>{actionLabels[h.action]||h.action}</strong> · {date(h.created_at,true)}<p>{h.reason}</p><details><summary>Dữ liệu trước/sau và việc chuyển sản phẩm</summary><pre>{JSON.stringify({before:h.before_data,after:h.after_data,impact:h.impact},null,2)}</pre></details></article>)}{!data.history.length&&<p>Chưa có thay đổi được ghi nhận.</p>}
        <h3>Mapping URL cũ</h3>{data.aliases.map(a=><p key={a.slug}>/category/{a.slug} → /category/{data.categories.find(c=>c.id===a.category_id)?.slug}</p>)}
      </section>}
    </>}
    {preview&&<AdminDialog title={`Xem trước: ${actionLabels[preview.command.action]}`} close={()=>setPreview(null)} busy={busy}><div className="pa-detail tx-preview">
      <p><strong>Lý do:</strong> {preview.command.reason}</p><dl><div><dt>Sản phẩm liên quan</dt><dd>{preview.impact.productCount}</dd></div>
        {preview.impact.sellingProducts!=null&&<div><dt>Đang bán</dt><dd>{preview.impact.sellingProducts}</dd></div>}{preview.impact.descendantCount!=null&&<div><dt>Danh mục hậu duệ</dt><dd>{preview.impact.descendantCount}</dd></div>}
        {preview.impact.missingProducts!=null&&<div><dt>Thiếu/sai thuộc tính</dt><dd>{preview.impact.missingProducts}</dd></div>}{preview.impact.targetAttributeGaps!=null&&<div><dt>Cần bổ sung thông số ở danh mục thay thế</dt><dd>{preview.impact.targetAttributeGaps}</dd></div>}
      </dl>
      {preview.impact.retiring&&<p className="pa-warning">Toàn bộ nhánh được ngừng. Sản phẩm được chuyển trước khi ngừng; các ô và liên kết trang chủ bị ảnh hưởng sẽ được tắt. Đơn đã đặt giữ nguyên snapshot.</p>}
      {preview.impact.reapprovalRequired&&preview.impact.productCount>0&&<p className="pa-warning">Sàn đang duyệt trước đăng: thay đổi danh mục hoặc tên thương hiệu của sản phẩm có thể đưa phiên bản nội dung về hàng chờ. Seller sẽ nhận thông báo.</p>}
      {preview.command.action==='schema'&&<p className="pa-warning">Không tự ẩn sản phẩm cũ. Chính sách: {preview.command.legacyPolicy==='ON_EDIT'?'Bổ sung khi sửa hoặc đăng lại':'Bắt buộc cho sản phẩm tạo mới sau thay đổi'}.</p>}
      {preview.impact.samples?.map(s=><p key={s.id}>#{s.id.slice(0,8)}: {s.errors.map(e=>e.message).join(' ')}</p>)}
      {(['draftReferences','publishedReferences'] as const).map(key=><div key={key}><h3>{key==='draftReferences'?'Tham chiếu bản nháp trang chủ':'Tham chiếu trang chủ đang xuất bản'}</h3>{preview.impact[key]?.length?preview.impact[key]!.map((r,i)=><p key={i}>{r.label} · {r.enabled?'Đang bật':'Đã tắt'}</p>):<p>Không có tham chiếu.</p>}</div>)}
      <details open><summary>Thay đổi sẽ áp dụng</summary><pre>{JSON.stringify(preview.command.category||preview.command.brand||preview.command.definitions||{replacementId:preview.command.replacementId},null,2)}</pre></details>
      {error&&<p className="pa-error" role="alert">{error}</p>}<p>Quyền và phiên bản sẽ được kiểm tra lại khi xác nhận.</p><div className="tx-actions"><button className="pa-button" disabled={busy} onClick={()=>void commit()}>{busy?'Đang áp dụng…':'Xác nhận áp dụng'}</button><button className="pa-button pa-button-light" disabled={busy} onClick={()=>setPreview(null)}>Quay lại chỉnh sửa</button></div>
    </div></AdminDialog>}
  </div>;
}
