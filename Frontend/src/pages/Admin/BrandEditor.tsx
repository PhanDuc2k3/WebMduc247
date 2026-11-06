import {useEffect,useState,type FormEvent} from 'react';
import type {TaxonomyData,TaxCommand} from '../../api/taxonomyApi';
export default function BrandEditor({data,canManage,busy,preview}:{data:TaxonomyData;canManage:boolean;busy:boolean;preview:(input:Omit<TaxCommand,'requestId'>)=>void}){
  const [id,setId]=useState(''),[name,setName]=useState(''),[aliases,setAliases]=useState(''),[logo,setLogo]=useState(''),[status,setStatus]=useState('ACTIVE'),[target,setTarget]=useState(''),[reason,setReason]=useState('');
  const row=data.brands.find(b=>b.id===id);
  useEffect(()=>{setName(row?.name||'');setAliases((row?.aliases||[]).filter(a=>a.toLowerCase()!==row?.name.toLowerCase()).join('\n'));setLogo(row?.logo_url||'');setStatus(row?.status==='INACTIVE'?'INACTIVE':'ACTIVE');setTarget('');setReason('');},[row]);
  function submit(e:FormEvent){e.preventDefault();preview({action:'brand',...(id?{id}:{}),version:row?.version||0,reason,brand:{name,aliases:aliases.split('\n').map(s=>s.trim()).filter(Boolean),logoUrl:logo||null,status}});}
  return <section className="pa-panel tx-editor"><h2>Thương hiệu chuẩn và tên thay thế</h2><label>Thương hiệu<select value={id} onChange={e=>setId(e.target.value)}><option value="">Tạo thương hiệu</option>{data.brands.map(b=><option key={b.id} value={b.id}>{b.name} · {b.status} · {b.products} sản phẩm</option>)}</select></label>
    {row?.status==='MERGED'?<p className="pa-warning">Đã hợp nhất vào {data.brands.find(b=>b.id===row.merged_into)?.name}. Tên cũ trỏ trực tiếp đến thương hiệu đích.</p>:<form onSubmit={submit}><fieldset disabled={!canManage||busy} className="tx-fields">
      <label>Tên chuẩn<input required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><label>Logo<input value={logo} onChange={e=>setLogo(e.target.value)} placeholder="https://…"/></label>
      <label className="tx-wide">Tên thay thế (mỗi dòng một tên)<textarea value={aliases} onChange={e=>setAliases(e.target.value)}/></label><p className="tx-wide">Tên đã sử dụng được giữ làm tên thay thế để sản phẩm cũ tiếp tục tra cứu được.</p>
      <label>Trạng thái<select value={status} onChange={e=>setStatus(e.target.value)}><option value="ACTIVE">Đang dùng</option><option value="INACTIVE">Ngừng dùng cho lựa chọn mới</option></select></label>
      {row&&<label>Hợp nhất vào<select value={target} onChange={e=>setTarget(e.target.value)}><option value="">Chọn thương hiệu khác</option>{data.brands.filter(b=>b.id!==id&&b.status==='ACTIVE').map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
      <label className="tx-wide">Lý do<textarea required minLength={8} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>
      <div className="tx-wide tx-actions"><button className="pa-button">Xem trước lưu thương hiệu</button>{row&&<button type="button" className="pa-button pa-button-light" disabled={!target||reason.trim().length<8} onClick={()=>preview({action:'merge_brand',id,version:row.version,replacementId:target,reason})}>Xem trước hợp nhất</button>}</div>
    </fieldset></form>}
  </section>;
}
