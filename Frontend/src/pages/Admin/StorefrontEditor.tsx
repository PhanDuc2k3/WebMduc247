import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {adminRequestId} from '../../api/adminCommand';
import {Link,useNavigate} from 'react-router-dom';
import {ArrowDown,ArrowUp,Check,Eye,Globe,Plus,RefreshCw,Save,Search,Trash2} from 'lucide-react';
import {notifyStorefrontPublished,storefrontApi,type StorefrontConfig,type StorefrontState} from '../../api/storefrontApi';
import {AdminDialog,date} from './AdminUi';
import {showImageFallback} from '../../utils/imageFallback';
import './storefront-editor.css';
type Tab='navigation'|'featuredCategories'|'banners'|'sections'|'selections';
type ListKey=Exclude<Tab,'selections'>;
const tabs:[Tab,string][]=[['navigation','Menu điều hướng'],['featuredCategories','Danh mục nổi bật'],['banners','Banner'],['sections','Bố cục trang'],['selections','Sản phẩm & cửa hàng']];
const iconNames:Record<string,string>={laptop:'Máy tính',shirt:'Áo',house:'Nhà',sparkles:'Làm đẹp',dumbbell:'Thể thao',apple:'Thực phẩm',book:'Sách',tag:'Ưu đãi',phone:'Điện thoại',package:'Hộp hàng'};
const toneNames:Record<string,string>={blue:'Xanh dương',pink:'Hồng',green:'Xanh lá',coral:'Cam san hô',purple:'Tím',yellow:'Vàng',cyan:'Xanh nhạt',navy:'Xanh đậm'};
const blockNames:Record<string,string>={hero:'Banner chính',categories:'Danh mục nổi bật',flashSale:'Flash Sale',featuredProducts:'Sản phẩm nổi bật',featuredStores:'Cửa hàng nổi bật',suggestions:'Gợi ý hôm nay'};
function fitCategoryTiles(config:StorefrontConfig){const section=config.sections.find(section=>section.key==='categories');if(section)section.limit=Math.max(section.limit,config.featuredCategories.filter(item=>item.enabled).length);}
function Field({label,value,onChange,max=120,placeholder}:{label:string;value:string;onChange:(value:string)=>void;max?:number;placeholder?:string}){
  return <label className="sf-field">{label}<input value={value} maxLength={max} onChange={event=>onChange(event.target.value)} placeholder={placeholder}/></label>;
}
export default function StorefrontEditor(){
  const attempt=useRef({signature:'',requestId:''}),categoryAttempt=useRef({signature:'',requestId:''});
  const [reason,setReason]=useState(''),[categoryReason,setCategoryReason]=useState('');
  const navigate=useNavigate();const [state,setState]=useState<StorefrontState|null>(null),[draft,setDraft]=useState<StorefrontConfig|null>(null);
  const [tab,setTab]=useState<Tab>('navigation'),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[dirty,setDirty]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[publishDialog,setPublishDialog]=useState(false);
  const [categoryDialog,setCategoryDialog]=useState(false),[categoryName,setCategoryName]=useState(''),[categorySlug,setCategorySlug]=useState(''),[parentId,setParentId]=useState('');
  const [categoryError,setCategoryError]=useState(''),[categoryBusy,setCategoryBusy]=useState(false);
  const [queries,setQueries]=useState({products:'',stores:''}),[choices,setChoices]=useState<{products:{id:string;name:string}[];stores:{id:string;name:string}[]}>({products:[],stores:[]});
  const [choiceError,setChoiceError]=useState(''),[pickedNames,setPickedNames]=useState<Record<string,string>>({});
  const fetchState=useCallback(async()=>{
    setLoading(true);setError('');setState(null);setDraft(null);
    try{const result=await storefrontApi.read();setState(result);setDraft(structuredClone(result.draft));setDirty(false);
      setPickedNames(Object.fromEntries([...result.references.products,...result.references.stores].map(item=>[item.id,item.name])));
    }catch(cause){setError(cause instanceof Error?cause.message:'Chưa tải được cấu hình.');}finally{setLoading(false);}
  },[]);
  async function load(){
    if(dirty&&!window.confirm('Tải lại sẽ bỏ các thay đổi chưa lưu. Tiếp tục?'))return;
    await fetchState();
  }
  useEffect(()=>{void fetchState();},[fetchState]);
  useEffect(()=>{
    if(tab!=='selections')return;let active=true;setChoiceError('');
    const timer=setTimeout(()=>{void Promise.all([storefrontApi.choices('products',queries.products),storefrontApi.choices('stores',queries.stores)])
      .then(([products,stores])=>{if(active)setChoices({products:products.items,stores:stores.items});})
      .catch(()=>{if(active)setChoiceError('Chưa tải được các lựa chọn. Hãy thử đổi từ khóa hoặc tải lại.');});},250);
    return()=>{active=false;clearTimeout(timer);};
  },[tab,queries.products,queries.stores]);
  useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  function update(change:(config:StorefrontConfig)=>void){setDraft(current=>{if(!current)return current;const next=structuredClone(current);change(next);return next;});setDirty(true);setNotice('');}
  function patch(key:ListKey,index:number,values:Record<string,unknown>){update(config=>{Object.assign(config[key][index],values);if(key==='featuredCategories'&&values.enabled===true)fitCategoryTiles(config);});}
  function move(key:ListKey,index:number,direction:number){update(config=>{const items=config[key] as {id:string}[];const [item]=items.splice(index,1);items.splice(index+direction,0,item);});}
  function remove(key:ListKey,index:number){update(config=>config[key].splice(index,1));}
  async function save(publish=false,preview=false){
    if(!draft||!state||busy)return;
    if(reason.trim().length<8){setError('Nhập lý do cập nhật từ 8 đến 500 ký tự.');return;}
    setBusy(true);setError('');setNotice('');
    try{const result=await storefrontApi.save(draft,state.version,publish,reason.trim(),adminRequestId(attempt.current,{config:draft,version:state.version,publish,reason:reason.trim()}));setDraft(result.draft);setState(current=>current?{...current,...result,history:[result.change,...current.history].slice(0,20),published:publish?result.draft:current.published}:current);setDirty(false);setPublishDialog(false);
      setNotice(publish?'Đã xuất bản. Trang chủ và menu điều hướng đã được cập nhật.':'Đã lưu bản nháp. Trang công khai chưa thay đổi.');
      if(publish)notifyStorefrontPublished();if(preview)navigate('/admin/storefront/preview');
    }catch(cause){setError(cause instanceof Error?cause.message:'Chưa thể lưu cấu hình.');setPublishDialog(false);}finally{setBusy(false);}
  }
  async function createCategory(event:FormEvent){
    event.preventDefault();if(categoryBusy||!state)return;setCategoryBusy(true);setCategoryError('');
    const input={name:categoryName.trim(),...(categorySlug.trim()?{slug:categorySlug.trim()}:{}),parentId:parentId||null,version:state.version,reason:categoryReason.trim()};
    try{const result=await storefrontApi.createCategory({...input,requestId:adminRequestId(categoryAttempt.current,input)});
      setState(current=>current?{...current,version:result.version,categories:[...current.categories.filter(item=>item.id!==result.category.id),result.category]}:current);
      if(draft&&draft.featuredCategories.length<16)update(config=>{config.featuredCategories.push({id:crypto.randomUUID(),categoryId:result.category.id,label:result.category.name.slice(0,60),targetUrl:'/category/'+result.category.slug,icon:'package',tone:'blue',enabled:true});fitCategoryTiles(config);});
      setCategoryDialog(false);setNotice(draft&&draft.featuredCategories.length<16?'Đã tạo danh mục và thêm vào bản nháp danh mục nổi bật.':'Đã tạo danh mục trong catalog. Bạn có thể chọn sau khi bớt ô nổi bật hiện có.');
    }catch(cause){setCategoryError(cause instanceof Error?cause.message:'Chưa thể tạo danh mục.');}finally{setCategoryBusy(false);}
  }
  function controls(key:ListKey,index:number,label:string,removable=true){const item=draft![key][index];return <div className="sf-row-controls"><label><input type="checkbox" checked={item.enabled} onChange={event=>patch(key,index,{enabled:event.target.checked})}/>Hiển thị</label>
    <button type="button" aria-label={`Đưa lên ${label}`} disabled={index===0} onClick={()=>move(key,index,-1)}><ArrowUp size={15}/></button>
    <button type="button" aria-label={`Đưa xuống ${label}`} disabled={index===draft![key].length-1} onClick={()=>move(key,index,1)}><ArrowDown size={15}/></button>
    {removable&&<button type="button" aria-label={`Xóa ${label}`} onClick={()=>remove(key,index)}><Trash2 size={15}/></button>}</div>;}
  if(loading&&!state)return <div className="pa-page"><h1>Giao diện trang chủ</h1><p role="status">Đang tải cấu hình…</p></div>;
  return <div className="pa-page sf-editor"><div className="pa-page-heading"><div><span className="pa-eyebrow">TRẢI NGHIỆM MUA SẮM</span><h1>Giao diện trang chủ</h1><p>Chỉnh nội dung, xem trước và xuất bản khi đã sẵn sàng.</p></div>
    <div className="pa-heading-actions"><Link className="pa-button pa-button-light" to="/" target="_blank" rel="noreferrer"><Globe size={15}/>Trang đang hiển thị</Link><button className="pa-button pa-button-light" disabled={busy||loading} onClick={()=>void load()} aria-label="Tải lại cấu hình"><RefreshCw size={15}/></button></div></div>
    {error&&<div className="pa-error" role="alert">{error}<button className="pa-text-link" onClick={()=>void load()}>Tải lại</button></div>}
    {notice&&<p className="pa-success" role="status">{notice}</p>}
    {state&&draft&&<>
      <Field label="Lý do cập nhật (8–500 ký tự)" value={reason} max={500} onChange={setReason}/>
      <div className="sf-publish-bar"><div><span className={`sf-state ${dirty?'is-dirty':''}`}>{dirty?'Có thay đổi chưa lưu':'Bản nháp đã sẵn sàng'}</span><small>{state.publishedAt?`Xuất bản lần cuối: ${date(state.publishedAt,true)}`:'Chưa xuất bản bố cục tùy chỉnh'}</small></div>
        <div><button className="pa-button pa-button-light" disabled={busy||loading} onClick={()=>void save(false)}><Save size={15}/>Lưu bản nháp</button><button className="pa-button pa-button-light" disabled={busy||loading} onClick={()=>void save(false,true)}><Eye size={15}/>Lưu & xem trước</button><button className="pa-button" disabled={busy||loading} onClick={()=>setPublishDialog(true)}><Check size={15}/>Xuất bản</button></div></div>
      <button className="pa-text-link sf-restore" disabled={busy||loading||(!state.published&&!dirty)} onClick={()=>{setDraft(structuredClone(state.published||state.draft));setDirty(Boolean(state.published));setNotice('Đã đưa bố cục đã lưu vào bản nháp để bạn kiểm tra.');}}>{state.published?'Dùng lại bản đã xuất bản':'Bỏ thay đổi chưa lưu'}</button>
      <div className="sf-tabs" role="tablist" aria-label="Thành phần trang chủ">{tabs.map(([key,label])=><button role="tab" aria-selected={tab===key} className={tab===key?'is-active':''} key={key} onClick={()=>setTab(key)}>{label}</button>)}</div>
      <section className="pa-panel sf-panel" aria-label={tabs.find(([key])=>key===tab)?.[1]}><fieldset disabled={busy||loading}>
        {tab==='navigation'&&<><div className="sf-section-head"><div><h2>Menu điều hướng</h2><p>Thêm liên kết trong sàn, thay nhãn, ẩn hoặc đổi thứ tự trên thanh navbar.</p></div><button className="pa-button" disabled={draft.navigation.length>=16} onClick={()=>update(config=>config.navigation.push({id:crypto.randomUUID(),label:'Mục mới',targetUrl:'/products',enabled:true}))}><Plus size={15}/>Thêm mục menu</button></div>
          {draft.navigation.map((item,index)=><article className="sf-item" key={item.id}><div className="sf-item-heading"><strong>{index+1}. {item.label}</strong>{controls('navigation',index,item.label)}</div><div className="sf-form-grid"><Field label="Tên hiển thị" value={item.label} max={50} onChange={label=>patch('navigation',index,{label})}/><Field label="Liên kết nội bộ" value={item.targetUrl} max={500} placeholder="/products hoặc /category/electronics" onChange={targetUrl=>patch('navigation',index,{targetUrl})}/></div></article>)}
          {!draft.navigation.length&&<p className="sf-empty">Chưa có mục menu. Bấm Thêm mục menu để bắt đầu.</p>}</>}
        {tab==='featuredCategories'&&<><div className="sf-section-head"><div><h2>Danh mục nổi bật</h2><p>Chọn danh mục trong catalog hoặc một liên kết khám phá riêng.</p></div><div><button className="pa-button pa-button-light" onClick={()=>{setCategoryName('');setCategorySlug('');setParentId('');setCategoryError('');setCategoryDialog(true);}}>Tạo danh mục</button><button className="pa-button" disabled={draft.featuredCategories.length>=16} onClick={()=>update(config=>{config.featuredCategories.push({id:crypto.randomUUID(),categoryId:null,label:'Khám phá sản phẩm',targetUrl:'/products',icon:'package',tone:'blue',enabled:true});fitCategoryTiles(config);})}><Plus size={15}/>Thêm ô danh mục</button></div></div>
          {draft.featuredCategories.map((item,index)=><article className="sf-item" key={item.id}><div className="sf-item-heading"><strong>{index+1}. {item.label}</strong>{controls('featuredCategories',index,item.label)}</div><div className="sf-form-grid">
            <label className="sf-field">Danh mục nguồn<select value={item.categoryId||''} onChange={event=>{const category=state.categories.find(category=>category.id===event.target.value);patch('featuredCategories',index,{categoryId:category?.id||null,...(category?{label:category.name.slice(0,60),targetUrl:'/category/'+category.slug}:{targetUrl:'/products'})});}}><option value="">Liên kết riêng</option>{state.categories.map(category=><option key={category.id} value={category.id}>{category.parentId?'↳ ':''}{category.name}</option>)}</select></label>
            <Field label="Nhãn trên trang chủ" value={item.label} max={60} onChange={label=>patch('featuredCategories',index,{label})}/>
            {!item.categoryId&&<Field label="Liên kết" value={item.targetUrl} max={500} onChange={targetUrl=>patch('featuredCategories',index,{targetUrl})}/>}
            <label className="sf-field">Biểu tượng<select value={item.icon} onChange={event=>patch('featuredCategories',index,{icon:event.target.value})}>{Object.entries(iconNames).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
            <label className="sf-field">Màu nền<select value={item.tone} onChange={event=>patch('featuredCategories',index,{tone:event.target.value})}>{Object.entries(toneNames).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          </div></article>)}</>}
        {tab==='banners'&&<><div className="sf-section-head"><div><h2>Banner trang chủ</h2><p>Ảnh, thông điệp và nút dẫn đến sản phẩm hoặc danh mục.</p></div><button className="pa-button" disabled={draft.banners.length>=6} onClick={()=>update(config=>config.banners.push({id:crypto.randomUUID(),title:'Khám phá lựa chọn mới',kicker:'MDUC247',description:'Sản phẩm từ các gian hàng đang bán.',imageUrl:'/home/shopping-hero.png',imageAlt:'Banner mua sắm',targetUrl:'/products',buttonText:'Khám phá ngay',tone:'blue',enabled:true}))}><Plus size={15}/>Thêm banner</button></div>
          {draft.banners.map((item,index)=><article className="sf-item" key={item.id}><div className="sf-item-heading"><strong>{index+1}. {item.title}</strong>{controls('banners',index,item.title)}</div><div className="sf-banner-edit"><img src={item.imageUrl} alt={item.imageAlt} onError={showImageFallback}/><div className="sf-form-grid">
            <Field label="Tiêu đề" value={item.title} max={120} onChange={title=>patch('banners',index,{title})}/><Field label="Dòng giới thiệu" value={item.kicker} max={80} onChange={kicker=>patch('banners',index,{kicker})}/>
            <Field label="Mô tả" value={item.description} max={300} onChange={description=>patch('banners',index,{description})}/><Field label="Ảnh (đường dẫn thư viện hoặc HTTPS)" value={item.imageUrl} max={2048} onChange={imageUrl=>patch('banners',index,{imageUrl})}/>
            <label className="sf-field">Ảnh có sẵn<select value={['/home/shopping-hero.png','/home/fashion-hero.png','/home/home-hero.png'].includes(item.imageUrl)?item.imageUrl:''} onChange={event=>{if(event.target.value)patch('banners',index,{imageUrl:event.target.value});}}><option value="">Ảnh tùy chọn</option><option value="/home/shopping-hero.png">Mua sắm & công nghệ</option><option value="/home/fashion-hero.png">Thời trang</option><option value="/home/home-hero.png">Gia dụng</option></select></label>
            <Field label="Mô tả ảnh" value={item.imageAlt} max={160} onChange={imageAlt=>patch('banners',index,{imageAlt})}/><Field label="Nhãn nút" value={item.buttonText} max={40} onChange={buttonText=>patch('banners',index,{buttonText})}/><Field label="Liên kết nút" value={item.targetUrl} max={500} onChange={targetUrl=>patch('banners',index,{targetUrl})}/>
            <label className="sf-field">Tông màu<select value={item.tone} onChange={event=>patch('banners',index,{tone:event.target.value})}><option value="blue">Xanh dương</option><option value="purple">Tím</option><option value="cyan">Xanh nhạt</option></select></label>
          </div></div></article>)}</>}
        {tab==='sections'&&<><div className="sf-section-head"><div><h2>Bố cục trang chủ</h2><p>Dùng mũi tên để sắp xếp; tắt những khối chưa muốn hiển thị.</p></div></div>
          {draft.sections.map((item,index)=><article className="sf-item" key={item.id}><div className="sf-item-heading"><strong>{index+1}. {blockNames[item.key]}</strong>{controls('sections',index,blockNames[item.key],false)}</div><div className="sf-form-grid">
            {item.key!=='hero'?<><Field label="Tiêu đề khối" value={item.title} max={80} onChange={title=>patch('sections',index,{title})}/><Field label="Dòng mô tả ngắn" value={item.eyebrow} max={80} onChange={eyebrow=>patch('sections',index,{eyebrow})}/></>:<p className="sf-help">Chỉnh tiêu đề và nội dung từng banner trong tab Banner.</p>}
            <label className="sf-field">Số mục tối đa<input type="number" min={1} max={24} value={item.limit} onChange={event=>patch('sections',index,{limit:Number(event.target.value)})}/></label>
          </div></article>)}</>}
        {tab==='selections'&&<><div className="sf-section-head"><div><h2>Ghim sản phẩm và cửa hàng</h2><p>Không ghim mục nào thì hệ thống tự chọn. Các mục bị ẩn hoặc tạm ngừng sẽ không xuất hiện trên trang công khai.</p></div></div>{choiceError&&<p className="pa-error" role="alert">{choiceError}</p>}
          <div className="sf-pickers">{(['products','stores'] as const).map(resource=>{const key=resource==='products'?'featuredProductIds':'featuredStoreIds';return <div className="sf-picker" key={resource}><h3>{resource==='products'?'Sản phẩm nổi bật':'Cửa hàng nổi bật'} <small>{draft[key].length}/12</small></h3>
            <div className="sf-search"><Search size={16}/><input aria-label={`Tìm ${resource==='products'?'sản phẩm':'cửa hàng'} để ghim`} value={queries[resource]} onChange={event=>setQueries(current=>({...current,[resource]:event.target.value}))} maxLength={100} placeholder="Nhập tên để tìm…"/></div>
            <div className="sf-selected">{draft[key].map((id,index)=><div key={id}><span>{pickedNames[id]||'Mục không còn hiển thị'}</span><button aria-label="Đưa lựa chọn lên" disabled={index===0} onClick={()=>update(config=>{const ids=config[key];[ids[index-1],ids[index]]=[ids[index],ids[index-1]];})}><ArrowUp size={14}/></button><button aria-label="Bỏ ghim" onClick={()=>update(config=>config[key].splice(index,1))}><Trash2 size={14}/></button></div>)}{!draft[key].length&&<p>Đang dùng lựa chọn tự động.</p>}</div>
            <div className="sf-choice-list">{choices[resource].map(item=><button key={item.id} disabled={draft[key].includes(item.id)||draft[key].length>=12} onClick={()=>{update(config=>config[key].push(item.id));setPickedNames(current=>({...current,[item.id]:item.name}));}}><span>{item.name}</span>{draft[key].includes(item.id)?<Check size={15}/>:<Plus size={15}/>}</button>)}{!choices[resource].length&&<p className="sf-empty">Chưa có lựa chọn phù hợp.</p>}</div>
          </div>;})}</div></>}
      </fieldset></section>
      <section className="sf-history"><h2>Lịch sử cập nhật gần đây</h2>{state.history.length?state.history.slice(0,8).map(item=><div key={item.id}><span>{item.action==='published'?'Xuất bản':item.action==='category_created'?'Tạo danh mục':'Lưu bản nháp'}</span><small>Phiên bản {item.version} · {date(item.created_at,true)}</small>{item.reason&&<small>{item.reason}</small>}</div>):<p>Chưa có lần cập nhật nào.</p>}</section>
      {publishDialog&&<AdminDialog title="Xuất bản trang chủ" close={()=>{if(!busy)setPublishDialog(false);}} busy={busy}><div className="pa-detail"><p>Menu điều hướng và các nội dung đang bật trong bản nháp này sẽ xuất hiện trên trang công khai.</p><p>{draft.navigation.filter(item=>item.enabled).length} mục menu · {draft.featuredCategories.filter(item=>item.enabled).length} ô danh mục · {draft.banners.filter(item=>item.enabled).length} banner</p><div className="pa-dialog-actions"><button className="pa-button pa-button-light" disabled={busy} onClick={()=>setPublishDialog(false)}>Hủy</button><button className="pa-button" disabled={busy} onClick={()=>void save(true)}>{busy?'Đang xuất bản…':'Xác nhận xuất bản'}</button></div></div></AdminDialog>}
      {categoryDialog&&<AdminDialog title="Tạo danh mục" close={()=>{if(!categoryBusy)setCategoryDialog(false);}} busy={categoryBusy}><form className="pa-detail sf-create-category" onSubmit={createCategory}><Field label="Tên danh mục" value={categoryName} max={120} onChange={setCategoryName}/><Field label="Slug (bỏ trống để tạo tự động)" value={categorySlug} max={80} onChange={setCategorySlug} placeholder="vi-du-danh-muc"/>
        <label className="sf-field">Danh mục cha<select value={parentId} onChange={event=>setParentId(event.target.value)}><option value="">Danh mục gốc</option>{state.categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <Field label="Lý do tạo danh mục (8–500 ký tự)" value={categoryReason} max={500} onChange={setCategoryReason}/>
        <p className="sf-help">Danh mục mới được tạo trong catalog và thêm vào bản nháp nổi bật. Xuất bản để cập nhật trang chủ.</p>{categoryError&&<p className="pa-error" role="alert">{categoryError}</p>}<div className="pa-dialog-actions"><button type="button" className="pa-button pa-button-light" disabled={categoryBusy} onClick={()=>setCategoryDialog(false)}>Hủy</button><button className="pa-button" disabled={categoryBusy||categoryName.trim().length<2||categoryReason.trim().length<8}>{categoryBusy?'Đang tạo…':'Tạo danh mục'}</button></div></form></AdminDialog>}
    </>}
  </div>;
}
