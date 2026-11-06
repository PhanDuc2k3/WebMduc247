import {useEffect,useState} from 'react';
import {taxonomyApi as api,type AttributeSchema} from '../../api/taxonomyApi';
export function TaxonomySellerNotices({productId,version}:{productId:string;version:number}){
  const [notices,setNotices]=useState<{id:string;body:string;created_at:string}[]>([]),[error,setError]=useState('');
  useEffect(()=>{let active=true;api.seller(productId).then(r=>{if(active)setNotices(r.notices);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[productId,version]);
  if(error)return <p className="text-sm text-red-700" role="alert">Chưa tải được thông báo catalog: {error}</p>;
  return notices.length?<section className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h2 className="font-bold">Thông báo thay đổi catalog của sàn</h2>{notices.map(n=><p key={n.id} className="mt-2 text-sm">{n.body}<small className="block text-slate-500">{new Date(n.created_at).toLocaleString('vi-VN')}</small></p>)}</section>:null;
}
export function BrandNameInput({value,onChange,className}:{value:string;onChange:(v:string)=>void;className:string}){
  const [brands,setBrands]=useState<{id:string;name:string;aliases:string[]}[]>([]);
  useEffect(()=>{api.brands().then(r=>setBrands(r.items)).catch(()=>{});},[]);
  return <label className="text-sm font-bold">Thương hiệu<input className={className} list="catalog-standard-brands" value={value} onChange={e=>onChange(e.target.value)}/><datalist id="catalog-standard-brands">{brands.map(b=><option key={b.id} value={b.name}>{b.aliases?.filter(a=>a!==b.name).join(', ')}</option>)}</datalist><small className="block font-normal text-slate-500">Tên thay thế đã biết sẽ được đổi sang tên chuẩn khi lưu.</small></label>;
}
export default function ProductTaxonomyFields({categoryId,values,onChange}:{categoryId:string;values:Record<string,unknown>;onChange:(v:Record<string,unknown>)=>void}){
  const [schema,setSchema]=useState<AttributeSchema|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  useEffect(()=>{let active=true;setSchema(null);setError('');if(!categoryId)return;setLoading(true);api.schema(categoryId).then(r=>{if(active)setSchema(r.schema);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[categoryId]);
  const set=(code:string,value:unknown)=>{const next={...values};if(value===undefined)delete next[code];else next[code]=value;onChange(next);};
  const unknown=Object.keys(values).filter(key=>!schema?.definitions.some(d=>d.code===key));
  return <fieldset className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:col-span-2"><legend className="px-2 text-sm font-bold">Thông số theo nhóm hàng</legend>
    {loading&&<p>Đang tải bộ thuộc tính…</p>}{error&&<p className="text-red-700" role="alert">{error}</p>}
    {!schema&&!loading&&!error&&<p className="text-sm text-slate-500">Danh mục chưa có bộ thông số bắt buộc.</p>}
    {schema&&<p className="text-sm text-slate-500">{schema.legacy_policy==='ON_EDIT'?'Bổ sung thông số bắt buộc khi lưu nội dung hoặc đăng bán lại.':'Bộ mới bắt buộc cho sản phẩm được tạo sau lần cập nhật bộ thuộc tính.'}</p>}
    {schema?.definitions.map(d=><label className="text-sm font-bold" key={d.code}>{d.label}{d.required?' *':''}{d.unit&&` (${d.unit})`}
      {d.type==='enum'||d.type==='boolean'?<select className="mt-1 w-full rounded-lg border p-2" value={values[d.code]===undefined?'':String(values[d.code])} onChange={e=>set(d.code,e.target.value===''?undefined:d.type==='boolean'?e.target.value==='true':e.target.value)}><option value="">Chưa chọn</option>{(d.type==='boolean'?['true','false']:d.allowedValues).map(v=><option key={v} value={v}>{d.type==='boolean'?v==='true'?'Có':'Không':v}</option>)}</select>:
        <input className="mt-1 w-full rounded-lg border p-2" type={d.type==='number'?'number':'text'} step={d.type==='number'?'any':undefined} maxLength={500} value={values[d.code]==null?'':String(values[d.code])} onChange={e=>set(d.code,e.target.value===''?undefined:d.type==='number'?Number(e.target.value):e.target.value)}/>}
    </label>)}
    {!!unknown.length&&!loading&&<div className="text-sm text-amber-800"><p>Thông số cũ không thuộc bộ đang áp dụng: {unknown.join(', ')}.</p><button type="button" className="underline" onClick={()=>onChange(Object.fromEntries(Object.entries(values).filter(([key])=>!unknown.includes(key))))}>Bỏ các thông số cũ khỏi lần lưu này</button></div>}
  </fieldset>;
}
