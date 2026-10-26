import {Fragment,useEffect,useState,type ComponentType,type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {toast} from 'react-toastify';
import {Apple,ArrowRight,BookOpen,Dumbbell,House,Laptop,Package,Shirt,Smartphone,Sparkles,Star,Store,Tag} from 'lucide-react';
import {catalogApi,type CategoryNode} from '../../api/catalogApi';
import {engagementApi,type FlashSaleItem} from '../../api/engagementApi';
import type {FeaturedCategory,HomeData,HomeSection,SectionKey} from '../../api/storefrontApi';
import CanvaHero from '../../components/Home/CanvaHome/CanvaHero';
import LiveProductCard from '../../components/Home/CanvaHome/LiveProductCard';
import LiveFlashCard from '../../components/Home/CanvaHome/LiveFlashCard';
import '../../components/Home/CanvaHome/CanvaHome.css';
const empty:HomeData={categories:[],featuredProducts:[],newestProducts:[],bestSellers:[],featuredStores:[],banners:[]};
const iconMap:Record<string,ComponentType<{size?:number}>>={laptop:Laptop,shirt:Shirt,house:House,sparkles:Sparkles,dumbbell:Dumbbell,apple:Apple,book:BookOpen,tag:Tag,phone:Smartphone,package:Package};
const defaults:HomeSection[]=[{id:'hero',key:'hero',title:'Banner trang chủ',eyebrow:'',enabled:true,limit:6},
  {id:'categories',key:'categories',title:'Danh mục nổi bật',eyebrow:'Khám phá dễ dàng',enabled:true,limit:8},
  {id:'flashSale',key:'flashSale',title:'⚡ Flash Sale',eyebrow:'',enabled:true,limit:5},
  {id:'featuredProducts',key:'featuredProducts',title:'Sản phẩm nổi bật',eyebrow:'',enabled:true,limit:4},
  {id:'featuredStores',key:'featuredStores',title:'Cửa hàng nổi bật',eyebrow:'Mua sắm an tâm',enabled:true,limit:8},
  {id:'suggestions',key:'suggestions',title:'Gợi ý hôm nay',eyebrow:'Dành cho bạn',enabled:true,limit:5}];
function flatten(items:CategoryNode[]):CategoryNode[]{return items.flatMap(item=>[item,...flatten(item.children||[])]);}
function fallbackTiles(categories:CategoryNode[]):FeaturedCategory[]{
  const definitions=[['electronics','Điện tử','laptop','blue'],['fashion','Thời trang','shirt','pink'],['home','Gia dụng','house','green'],
    ['beauty','Làm đẹp','sparkles','coral'],['sports','Thể thao','dumbbell','purple'],['food','Thực phẩm','apple','yellow'],['books','Sách','book','cyan']];
  return [...definitions.flatMap(([slug,label,icon,tone])=>{const category=categories.find(item=>item.slug===slug);return category?[{id:slug,categoryId:category.id,label,icon,tone,targetUrl:'/category/'+slug,enabled:true}]:[];}),
    {id:'sale',categoryId:null,label:'Ưu đãi',icon:'tag',tone:'navy',targetUrl:'/products?sale=true',enabled:true}];
}
function FlashCountdown({endsAt,serverTime}:{endsAt:string;serverTime:string}){
  const [remaining,setRemaining]=useState(0);
  useEffect(()=>{const offset=new Date(serverTime).getTime()-Date.now();const update=()=>setRemaining(Math.max(0,new Date(endsAt).getTime()-Date.now()-offset));
    update();const timer=window.setInterval(update,1000);return()=>window.clearInterval(timer);},[endsAt,serverTime]);
  return <div className="canva-home__countdown"><span>Kết thúc trong</span><time dateTime={endsAt}>{[Math.floor(remaining/3600000),Math.floor(remaining/60000)%60,Math.floor(remaining/1000)%60].map(value=>String(value).padStart(2,'0')).join(':')}</time></div>;
}
export default function Home({initialData}:{initialData?:HomeData}={}){
  const [data,setData]=useState<HomeData>(initialData||empty),[loading,setLoading]=useState(!initialData);
  const [flash,setFlash]=useState<{serverTime:string;items:FlashSaleItem[]}>({serverTime:'',items:[]});
  useEffect(()=>{
    let active=true,request=0;
    const load=()=>{const id=++request;void catalogApi.home().then(result=>{if(active&&id===request)setData(result);})
      .catch(error=>{if(active)toast.error(error instanceof Error?error.message:'Không thể tải trang chủ.',{containerId:'general-toast',toastId:'home-catalog-error'});})
      .finally(()=>{if(active&&id===request)setLoading(false);});};
    const storage=(event:StorageEvent)=>{if(event.key==='mduc247.storefrontVersion')load();};
    if(initialData){setData(initialData);setLoading(false);}else{load();window.addEventListener('storefrontPublished',load);window.addEventListener('storage',storage);}
    engagementApi.flashSales().then(result=>{if(active)setFlash(result);}).catch(()=>{});
    return()=>{active=false;window.removeEventListener('storefrontPublished',load);window.removeEventListener('storage',storage);};
  },[initialData]);
  const sections=data.layout?.sections||defaults;
  const config=(key:SectionKey)=>sections.find(section=>section.key===key)||defaults.find(section=>section.key===key)!;
  const tiles=(data.layout?.featuredCategories||fallbackTiles(flatten(data.categories))).filter(tile=>tile.enabled).slice(0,config('categories').limit);
  const featured=data.featuredProducts.slice(0,config('featuredProducts').limit),featuredIds=new Set(featured.map(product=>product.id));
  const suggestions=[...data.newestProducts.filter(product=>!featuredIds.has(product.id)),...data.newestProducts.filter(product=>featuredIds.has(product.id))].slice(0,config('suggestions').limit);
  const flashEnd=flash.items.length?flash.items.reduce((earliest,item)=>new Date(item.endsAt)<new Date(earliest)?item.endsAt:earliest,flash.items[0].endsAt):'';
  function heading(key:SectionKey,link?:string){const section=config(key);return <header className="canva-home__section-header"><div>{section.eyebrow&&<p className="canva-home__eyebrow">{section.eyebrow}</p>}<h2 id={`home-${key}-title`}>{section.title}</h2></div>{link&&<Link to={link}>Xem tất cả <ArrowRight size={17}/></Link>}</header>;}
  const content:Record<SectionKey,ReactNode>={
    hero:<CanvaHero banners={data.banners} slidesOverride={data.storefrontConfigured?data.layout?.banners.slice(0,config('hero').limit):undefined}/>,
    categories:<section className="canva-home__section" aria-labelledby="home-categories-title">{heading('categories')}
      {tiles.length?<div className="canva-home__category-grid">{tiles.map(tile=>{const Icon=iconMap[tile.icon]||Package;
        const count=tile.categoryId?data.newestProducts.filter(product=>product.categoryId===tile.categoryId).length:data.newestProducts.filter(product=>product.priceOriginalMinor>product.priceMinor).length;
        return <Link className="canva-home__category" key={tile.id} to={tile.targetUrl}><span className={`canva-home__category-icon tone-${tile.tone}`}><Icon size={24}/></span><strong>{tile.label}</strong><small>{count?`${count} sản phẩm gợi ý`:'Khám phá danh mục'}</small></Link>;})}</div>:
        <p className="canva-home__empty">{loading?'Đang tải danh mục…':'Chưa có danh mục nổi bật.'}</p>}</section>,
    flashSale:<section id="flash-sale" className="canva-home__section canva-home__flash" aria-labelledby="home-flashSale-title">{heading('flashSale','/flash-sale')}
      {!!flash.items.length&&<div className="canva-home__title-row"><span className="canva-home__live">Đang diễn ra</span><FlashCountdown endsAt={flashEnd} serverTime={flash.serverTime}/></div>}
      {flash.items.length?<div className="canva-home__product-grid">{flash.items.slice(0,config('flashSale').limit).map(item=><LiveFlashCard item={item} key={`${item.campaignId}-${item.variantId}`}/>)}</div>:
        <div className="canva-home__empty canva-home__empty--flash"><strong>Chưa có Flash Sale đang diễn ra.</strong><span>Trong lúc chờ, bạn có thể xem các sản phẩm đang bán.</span><Link to="/products">Khám phá sản phẩm <ArrowRight size={16}/></Link></div>}</section>,
    featuredProducts:<section className="canva-home__section" aria-labelledby="home-featuredProducts-title">{heading('featuredProducts','/products')}
      {featured.length?<div className="canva-home__product-grid is-compact">{featured.map(product=><LiveProductCard product={product} compact key={product.id}/>)}</div>:<p className="canva-home__empty">{loading?'Đang tải sản phẩm…':'Chưa có sản phẩm đang bán.'}</p>}</section>,
    featuredStores:<section className="canva-home__section canva-home__stores" aria-labelledby="home-featuredStores-title">{heading('featuredStores','/store')}
      {data.featuredStores.length?<div className="canva-home__store-grid">{data.featuredStores.slice(0,config('featuredStores').limit).map(store=>{const image=store.logoUrl||data.newestProducts.find(product=>product.storeId===store.id)?.imageUrl;
        return <Link className="canva-home__store-card" key={store.id} to={`/store/${store.slug}`}><span className="canva-home__store-logo">{image?<img src={image} alt=""/>:<Store size={26}/>}</span><span><strong>{store.name}</strong><small>{store.category||'Gian hàng MDUC247'}</small><em>{store.rating!=null&&<><Star size={13}/> {store.rating.toFixed(1)} · </>}{store.productCount??0} sản phẩm</em></span><ArrowRight aria-hidden="true"/></Link>;})}</div>:
        <p className="canva-home__empty">{loading?'Đang tải cửa hàng…':'Chưa có cửa hàng hoạt động.'}</p>}</section>,
    suggestions:<section id="suggestions" className="canva-home__section" aria-labelledby="home-suggestions-title">{heading('suggestions','/products')}
      {suggestions.length?<div className="canva-home__product-grid">{suggestions.map(product=><LiveProductCard product={product} key={product.id}/>)}</div>:<p className="canva-home__empty">{loading?'Đang tải gợi ý…':'Chưa có sản phẩm gợi ý.'}</p>}</section>,
  };
  return <div className="canva-home">{sections.filter(section=>section.enabled).map(section=><Fragment key={section.id}>{content[section.key]}</Fragment>)}</div>;
}
