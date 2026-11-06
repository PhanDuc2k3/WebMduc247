import {useEffect,useState,type FormEvent} from 'react';
import type {AttributeDefinition,TaxonomyData,TaxCommand} from '../../api/taxonomyApi';
const blank:AttributeDefinition={code:'',label:'',type:'text',required:false,unit:'',allowedValues:[]};
export default function AttributeSchemaEditor({data,id,canManage,busy,preview}:{data:TaxonomyData;id:string|null;canManage:boolean;busy:boolean;preview:(input:Omit<TaxCommand,'requestId'>)=>void}){
  const own=data.schemas.find(s=>s.category_id===id),[definitions,setDefinitions]=useState<AttributeDefinition[]>([]),[policy,setPolicy]=useState('ON_EDIT'),[reason,setReason]=useState('');
  let inherited=own;let current=data.categories.find(c=>c.id===id);while(!inherited&&current?.parentId){current=data.categories.find(c=>c.id===current!.parentId);inherited=data.schemas.find(s=>s.category_id===current?.id);}
  useEffect(()=>{setDefinitions(structuredClone(inherited?.definitions||[]));setPolicy(own?.legacy_policy||'ON_EDIT');setReason('');},[id,own,inherited]);
  const edit=(index:number,values:Partial<AttributeDefinition>)=>setDefinitions(items=>items.map((item,i)=>i===index?{...item,...values}:item));
  function submit(e:FormEvent){e.preventDefault();if(id)preview({action:'schema',id,version:Number(own?.version||0),definitions,legacyPolicy:policy,reason});}
  if(!id)return <section className="pa-panel tx-editor"><p>Chọn danh mục trong cây để quản lý bộ thuộc tính.</p></section>;
  return <section className="pa-panel tx-editor"><h2>Bộ thuộc tính: {data.categories.find(c=>c.id===id)?.name}</h2>
    <p>{own?'Đang dùng bộ riêng của danh mục.':inherited?`Đang kế thừa bộ của ${data.categories.find(c=>c.id===inherited!.category_id)?.name}; lưu sẽ tạo bộ riêng thay thế toàn bộ bộ kế thừa.`:'Chưa có bộ riêng hoặc bộ kế thừa.'}</p>
    <form onSubmit={submit}><fieldset className="tx-fields" disabled={!canManage||busy}>
      {definitions.map((d,index)=><div className="tx-attribute tx-wide" key={index}>
        <label>Mã<input required pattern="[a-z][a-z0-9_]{0,49}" value={d.code} onChange={e=>edit(index,{code:e.target.value})}/></label><label>Tên hiển thị<input required maxLength={100} value={d.label} onChange={e=>edit(index,{label:e.target.value})}/></label>
        <label>Kiểu<select value={d.type} onChange={e=>edit(index,{type:e.target.value as AttributeDefinition['type'],allowedValues:[]})}><option value="text">Văn bản</option><option value="number">Số</option><option value="boolean">Đúng/sai</option><option value="enum">Lựa chọn</option></select></label>
        <label>Đơn vị<input maxLength={30} value={d.unit} onChange={e=>edit(index,{unit:e.target.value})}/></label>
        <label>Bắt buộc<select value={String(d.required)} onChange={e=>edit(index,{required:e.target.value==='true'})}><option value="false">Tùy chọn</option><option value="true">Bắt buộc</option></select></label>
        {d.type==='enum'&&<label>Giá trị cho phép (phân cách bằng |)<input required value={d.allowedValues.join('|')} onChange={e=>edit(index,{allowedValues:e.target.value.split('|')})}/></label>}
        <button type="button" className="pa-text-link" onClick={()=>setDefinitions(items=>items.filter((_,i)=>i!==index))}>Bỏ thuộc tính</button>
      </div>)}
      <button className="pa-button pa-button-light" type="button" disabled={definitions.length>=50} onClick={()=>setDefinitions(items=>[...items,{...blank}])}>Thêm thuộc tính</button>
      <label className="tx-wide">Áp dụng cho sản phẩm cũ<select value={policy} onChange={e=>setPolicy(e.target.value)}><option value="ON_EDIT">Bổ sung khi sửa nội dung hoặc đăng bán lại</option><option value="NEW_ONLY">Chỉ bắt buộc cho sản phẩm tạo sau thay đổi này</option></select></label>
      <p className="tx-wide pa-warning">Sản phẩm cũ đang bán được giữ hiển thị. Bước xem trước sẽ thống kê sản phẩm thiếu hoặc sai thông số; seller bổ sung theo chính sách đã chọn.</p>
      <label className="tx-wide">Lý do<textarea required minLength={8} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label><button className="pa-button tx-wide">Xem trước tác động của bộ thuộc tính</button>
    </fieldset></form>
  </section>;
}
