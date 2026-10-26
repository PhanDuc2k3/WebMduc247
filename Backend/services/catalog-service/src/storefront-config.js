import {PlatformAdminError,adminId} from '../../../packages/contracts/platform-admin.js';
export const sectionKeys=['hero','categories','flashSale','featuredProducts','featuredStores','suggestions'];
export const icons=['laptop','shirt','house','sparkles','dumbbell','apple','book','tag','phone','package'];
export const tones=['blue','pink','green','coral','purple','yellow','cyan','navy'];
const fail=message=>new PlatformAdminError(400,'INVALID_STOREFRONT',message||'Cấu hình trang chủ không hợp lệ.');
const object=(value,keys)=>{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))throw fail();
};
const text=(value,max,min=0)=>{
  if(typeof value!=='string'||value.trim().length<min||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw fail('Nội dung văn bản không hợp lệ.');
  return value.trim();
};
export function internalTarget(value){
  const result=text(value,500,1);
  if(!result.startsWith('/')||result.startsWith('//')||/[\\\u0000-\u0020]/.test(result))throw fail('Liên kết phải là đường dẫn nội bộ của sàn.');
  const url=new URL(result,'https://storefront.invalid');
  if(url.origin!=='https://storefront.invalid'||!/^\/(?:products(?:\/[0-9a-f-]{36})?|category\/[a-z0-9]+(?:-[a-z0-9]+)*|store(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?|flash-sale|flash-sales|voucher|support|terms|privacy)?$/.test(url.pathname))throw fail('Liên kết không trỏ đến trang công khai được hỗ trợ.');
  return result;
}
function image(value){
  const result=text(value,2048,1);
  if(/[\\\u0000-\u0020]/.test(result))throw fail('Đường dẫn ảnh không hợp lệ.');
  if(result.startsWith('/')){
    if(result.startsWith('//')||result.includes('..')||!/^\/(home|category|assets)\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp|avif)$/i.test(result))throw fail('Chọn ảnh thư viện hoặc URL ảnh HTTPS.');
  }else{
    let url;try{url=new URL(result);}catch{throw fail('URL ảnh không hợp lệ.');}
    if(url.protocol!=='https:'||url.username||url.password)throw fail('URL ảnh phải dùng HTTPS.');
  }
  return result;
}
const entry=(item,keys)=>{object(item,keys);if(typeof item.id!=='string'||!/^[a-zA-Z0-9_-]{1,60}$/.test(item.id)||typeof item.enabled!=='boolean')throw fail();};
const array=(items,max)=>{if(!Array.isArray(items)||items.length>max||items.some(item=>!item||typeof item!=='object'||Array.isArray(item))||new Set(items.map(item=>item.id)).size!==items.length)throw fail('Danh sách có mục trùng hoặc quá dài.');};
const selection=(ids,max)=>{if(!Array.isArray(ids)||ids.length>max||new Set(ids).size!==ids.length)throw fail('Danh sách lựa chọn không hợp lệ.');ids.forEach(adminId);return ids;};
export function validateStorefront(config){
  object(config,['navigation','featuredCategories','banners','sections','featuredProductIds','featuredStoreIds']);
  array(config.navigation,16);array(config.featuredCategories,16);array(config.banners,6);array(config.sections,6);
  if(config.sections.length!==sectionKeys.length||new Set(config.sections.map(item=>item.key)).size!==6||config.sections.some(item=>!sectionKeys.includes(item.key)))throw fail('Bố cục phải giữ đủ sáu loại khối nội dung.');
  const navigation=config.navigation.map(item=>{entry(item,['id','label','targetUrl','enabled']);return {...item,label:text(item.label,50,1),targetUrl:internalTarget(item.targetUrl)};});
  const featuredCategories=config.featuredCategories.map(item=>{
    entry(item,['id','categoryId','label','targetUrl','icon','tone','enabled']);if(item.categoryId!==null)adminId(item.categoryId);
    if(!icons.includes(item.icon)||!tones.includes(item.tone))throw fail('Biểu tượng hoặc màu danh mục không hợp lệ.');
    return {...item,label:text(item.label,60,1),targetUrl:internalTarget(item.targetUrl)};
  });
  const banners=config.banners.map(item=>{
    entry(item,['id','title','kicker','description','imageUrl','imageAlt','targetUrl','buttonText','tone','enabled']);
    if(!['blue','purple','cyan'].includes(item.tone))throw fail();
    return {...item,title:text(item.title,120,1),kicker:text(item.kicker,80),description:text(item.description,300),
      imageUrl:image(item.imageUrl),imageAlt:text(item.imageAlt,160),targetUrl:internalTarget(item.targetUrl),buttonText:text(item.buttonText,40,1)};
  });
  const sections=config.sections.map(item=>{
    entry(item,['id','key','title','eyebrow','enabled','limit']);
    if(!Number.isSafeInteger(item.limit)||item.limit<1||item.limit>24)throw fail('Số lượng hiển thị phải từ 1 đến 24.');
    return {...item,title:text(item.title,80,1),eyebrow:text(item.eyebrow,80)};
  });
  const result={navigation,featuredCategories,banners,sections,featuredProductIds:selection(config.featuredProductIds,12),featuredStoreIds:selection(config.featuredStoreIds,12)};
  if(Buffer.byteLength(JSON.stringify(result))>65536)throw fail('Cấu hình quá lớn.');
  return result;
}
export function flattenStorefrontCategories(items,result=[]){for(const item of items){result.push({id:item.id,name:item.name,slug:item.slug,parentId:item.parentId});flattenStorefrontCategories(item.children||[],result);}return result;}
export function defaultStorefront(categories){
  const definitions=[['electronics','Điện tử','laptop','blue'],['fashion','Thời trang','shirt','pink'],['home','Gia dụng','house','green'],
    ['beauty','Làm đẹp','sparkles','coral'],['sports','Thể thao','dumbbell','purple'],['food','Thực phẩm','apple','yellow'],['books','Sách','book','cyan']];
  const navigation=[['Tất cả danh mục','/products'],['Điện thoại & Phụ kiện','/category/phone'],['Điện tử','/category/electronics'],['Thời trang','/category/fashion'],
    ['Nhà cửa & Đời sống','/category/home'],['Làm đẹp','/category/beauty'],['Thể thao','/category/sports'],['Flash Sale','/flash-sale'],['Cửa hàng','/store']]
    .map(([label,targetUrl],index)=>({id:'nav-'+index,label,targetUrl,enabled:true}));
  const featuredCategories=definitions.flatMap(([slug,label,icon,tone])=>{const category=categories.find(item=>item.slug===slug);return category?[{id:'tile-'+slug,categoryId:category.id,label,targetUrl:'/category/'+slug,icon,tone,enabled:true}]:[];});
  featuredCategories.push({id:'tile-sale',categoryId:null,label:'Ưu đãi',targetUrl:'/products?sale=true',icon:'tag',tone:'navy',enabled:true});
  const banners=[{id:'hero-shopping',kicker:'Mua sắm mỗi ngày',title:'Đại tiệc mua sắm MDUC247',description:'Khám phá sản phẩm từ nhiều gian hàng bạn yêu thích.',imageUrl:'/home/shopping-hero.png',imageAlt:'Bàn mua sắm với máy tính và hộp quà',targetUrl:'/products',buttonText:'Bắt đầu mua hàng',tone:'blue',enabled:true},
    {id:'hero-fashion',kicker:'Phong cách mỗi ngày',title:'Chọn món đồ bạn yêu',description:'Tìm cảm hứng mới cho phong cách của riêng bạn.',imageUrl:'/home/fashion-hero.png',imageAlt:'Túi tote vải canvas',targetUrl:'/category/fashion',buttonText:'Khám phá ngay',tone:'purple',enabled:true},
    {id:'hero-home',kicker:'Làm mới không gian',title:'Tiện ích cho tổ ấm',description:'Những lựa chọn nhỏ cho một không gian nhiều niềm vui.',imageUrl:'/home/home-hero.png',imageAlt:'Đèn bàn LED',targetUrl:'/category/home',buttonText:'Khám phá ngay',tone:'cyan',enabled:true}];
  const sections=[['hero','Banner trang chủ','',6],['categories','Danh mục nổi bật','Khám phá dễ dàng',8],['flashSale','⚡ Flash Sale','',5],
    ['featuredProducts','Sản phẩm nổi bật','',4],['featuredStores','Cửa hàng nổi bật','Mua sắm an tâm',8],['suggestions','Gợi ý hôm nay','Dành cho bạn',5]]
    .map(([key,title,eyebrow,limit])=>({id:'section-'+key,key,title,eyebrow,limit,enabled:true}));
  return {navigation,featuredCategories,banners,sections,featuredProductIds:[],featuredStoreIds:[]};
}
export function resolveStorefront(config,categories){
  const byId=new Map(categories.map(item=>[item.id,item]));
  return {...config,navigation:config.navigation.filter(item=>item.enabled),banners:config.banners.filter(item=>item.enabled),
    sections:config.sections.filter(item=>item.enabled),featuredCategories:config.featuredCategories.filter(item=>item.enabled&&(!item.categoryId||byId.has(item.categoryId)))
      .map(item=>({...item,targetUrl:item.categoryId?'/category/'+byId.get(item.categoryId).slug:item.targetUrl}))};
}
