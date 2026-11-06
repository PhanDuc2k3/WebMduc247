import {useEffect,useState,type FormEvent} from 'react';
import type {CategoryInput,TaxCategory,TaxCommand,TaxonomyData} from '../../api/taxonomyApi';
const blank:CategoryInput={name:'',slug:'',description:'',parentId:null,sortOrder:0,isActive:true,iconKey:'package',imageKey:null};
export default function CategoryEditor({data,selected,parentId,canManage,busy,preview}:{data:TaxonomyData;selected:string|null;parentId:string|null;canManage:boolean;busy:boolean;preview:(input:Omit<TaxCommand,'requestId'>)=>void}){
  const row=data.categories.find(c=>c.id===selected),[form,setForm]=useState<CategoryInput>({...blank,parentId}),[reason,setReason]=useState(''),[replacement,setReplacement]=useState('');
  useEffect(()=>{setForm(row?{name:row.name,slug:row.slug,description:row.description,parentId:row.parentId,sortOrder:row.sortOrder,isActive:row.isActive,iconKey:row.iconKey,imageKey:row.imageKey}:{...blank,parentId});setReason('');setReplacement('');},[row,parentId]);
  const input=<K extends keyof CategoryInput>(key:K,value:CategoryInput[K])=>setForm(f=>({...f,[key]:value}));
  const command=(action:string)=>({action,...(row?{id:row.id}:{}),version:row?row.version:data.stateVersion,reason,...(replacement?{replacementId:replacement}:{})});
  function submit(e:FormEvent){e.preventDefault();preview({...command(row?'update':'create'),category:form});}
  return <section className="pa-panel tx-editor"><h2>{row?`Chỉnh sửa: ${row.name}`:parentId?'Tạo danh mục con':'Tạo danh mục gốc'}</h2>
    {row&&<p>{row.productCount} sản phẩm trực tiếp · {row.childCount} danh mục con trực tiếp · Phiên bản {row.version}</p>}
    <form onSubmit={submit}><fieldset disabled={!canManage||busy} className="tx-fields">
      <label>Tên danh mục<input required minLength={2} maxLength={120} value={form.name} onChange={e=>input('name',e.target.value)}/></label>
      <label>Slug<input required minLength={2} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={e=>input('slug',e.target.value)}/></label>
      <label>Danh mục cha<select value={form.parentId||''} onChange={e=>input('parentId',e.target.value||null)}><option value="">Danh mục gốc</option>{data.categories.filter(c=>c.id!==selected&&c.isActive).map(c=><option key={c.id} value={c.id}>{c.name} / {c.slug}</option>)}</select></label>
      <label>Thứ tự<input type="number" min={0} max={10000} step={1} required value={form.sortOrder} onChange={e=>input('sortOrder',Number(e.target.value))}/></label>
      <label className="tx-wide">Mô tả<textarea maxLength={5000} value={form.description} onChange={e=>input('description',e.target.value)}/></label>
      <label>Ảnh danh mục (URL HTTPS hoặc ảnh thư viện)<input value={form.imageKey||''} onChange={e=>input('imageKey',e.target.value||null)}/></label>
      <label>Icon (tên icon hoặc URL ảnh)<input value={form.iconKey||''} onChange={e=>input('iconKey',e.target.value||null)}/></label>
      <label>Trạng thái<select value={String(form.isActive)} onChange={e=>input('isActive',e.target.value==='true')}><option value="true">Đang hoạt động</option><option value="false">Ngừng hoạt động</option></select></label>
      {row&&<label>Danh mục thay thế khi chuyển sản phẩm<select value={replacement} onChange={e=>setReplacement(e.target.value)}><option value="">Chọn khi cần chuyển/ngừng</option>{data.categories.filter(c=>c.id!==selected&&c.isActive).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
      <label className="tx-wide">Lý do thao tác<textarea required minLength={8} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>
      <p className="tx-wide pa-warning">Ngừng một nhánh sẽ ngừng toàn bộ danh mục con. Sản phẩm phải chuyển sang nhánh khác còn hoạt động; các ô và liên kết trang chủ liên quan sẽ được ngừng trong cùng giao dịch. URL cũ khi đổi slug được giữ bằng mapping về ID.</p>
      <div className="tx-wide tx-actions"><button className="pa-button" disabled={busy}>Xem trước {row?'thay đổi':'tạo danh mục'}</button>
        {row&&<><button className="pa-button pa-button-light" type="button" disabled={!replacement||reason.trim().length<8} onClick={()=>preview(command('transfer'))}>Xem trước chuyển sản phẩm</button><button className="pa-button pa-button-danger" type="button" disabled={reason.trim().length<8} onClick={()=>preview(command('delete'))}>Kiểm tra trước khi xóa</button></>}
      </div></fieldset></form>
    {!canManage&&<p>Bạn có quyền xem. Thay đổi catalog cần quyền quản lý danh mục trên toàn sàn.</p>}
  </section>;
}
