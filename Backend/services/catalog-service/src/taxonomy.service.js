import {randomUUID} from 'node:crypto';
import {requireAdminScope} from '../../../packages/contracts/admin-rbac.js';
import {adminId,adminMutation,checkAdminVersion} from '../../../packages/contracts/platform-admin.js';
import {adminCommand} from '../../../packages/contracts/admin-command.js';
import {categoryInput,attributeDefinitions,effectiveSchema,specificationErrors,parseCsv,taxText,taxSlug,taxMedia,taxonomyError as error} from './taxonomy-contract.js';
import {defaultStorefront} from './storefront-config.js';
const reject=(code,message,status=409)=>{throw error(code,message,status);};
const categoryDto=r=>({id:r.id,name:r.name,slug:r.slug,parentId:r.parent_id,description:r.description,sortOrder:r.sort_order,isActive:r.is_active,iconKey:r.icon_key,imageKey:r.image_key,version:Number(r.admin_version)});
const canonicalName=value=>taxText(value,2,120).normalize('NFC').toLowerCase();
export function categoryReferences(config,ids,slugs,path='',result=[]){
  if(Array.isArray(config)){config.forEach((item,i)=>categoryReferences(item,ids,slugs,`${path}[${i}]`,result));}
  else if(config&&typeof config==='object'){
    if(ids.includes(config.categoryId)||typeof config.targetUrl==='string'&&slugs.includes(config.targetUrl.split(/[?#]/)[0].replace(/^\/category\//,'')))result.push({path,label:config.label||config.title||config.id||path,enabled:config.enabled!==false});
    for(const [key,value] of Object.entries(config))if(value&&typeof value==='object')categoryReferences(value,ids,slugs,path?`${path}.${key}`:key,result);
  }return result;
}
function retireReferences(config,ids,slugs){
  if(Array.isArray(config))return config.map(v=>retireReferences(v,ids,slugs));
  if(!config||typeof config!=='object')return config;
  const result=Object.fromEntries(Object.entries(config).map(([key,value])=>[key,retireReferences(value,ids,slugs)]));
  if(ids.includes(config.categoryId)||typeof config.targetUrl==='string'&&slugs.includes(config.targetUrl.split(/[?#]/)[0].replace(/^\/category\//,'')))result.enabled=false;
  return result;
}
export class TaxonomyService {
  constructor(catalog){this.catalog=catalog;this.pool=catalog.pool;}
  authorize(actor,permission='taxonomy.read'){requireAdminScope(actor,permission,{});}
  async transaction(fn){return this.catalog.transaction(async db=>{await db.query('SELECT catalog.taxonomy_lock()');return fn(db);});}
  async versions(db){const state=(await db.query('SELECT version FROM catalog.taxonomy_state WHERE id=true')).rows[0];const front=(await db.query('SELECT version FROM catalog.storefront_settings WHERE id=1')).rows[0];return {stateVersion:Number(state.version),storefrontVersion:Number(front.version)};}
  async read(actor){
    this.authorize(actor);
    const categories=(await this.pool.query(`SELECT c.*,(SELECT count(*)::int FROM catalog.products p WHERE p.category_id=c.id) AS products,
      (SELECT count(*)::int FROM catalog.categories child WHERE child.parent_id=c.id) AS children FROM catalog.categories c ORDER BY c.sort_order,c.name,c.id`)).rows;
    const aliases=(await this.pool.query('SELECT * FROM catalog.category_slug_aliases ORDER BY slug')).rows;
    const brands=(await this.pool.query(`SELECT b.*,(SELECT jsonb_agg(display_name ORDER BY display_name) FROM catalog.brand_names n WHERE n.brand_id=b.id) AS aliases,
      (SELECT count(*)::int FROM catalog.products p WHERE p.brand_id=b.id OR p.brand_id IS NULL AND lower(trim(p.brand)) IN(SELECT name_key FROM catalog.brand_names WHERE brand_id=b.id)) AS products FROM catalog.brands b ORDER BY b.name`)).rows;
    const schemas=(await this.pool.query('SELECT * FROM catalog.category_attribute_schemas ORDER BY category_id')).rows;
    const history=(await this.pool.query('SELECT * FROM catalog.taxonomy_audit ORDER BY id DESC LIMIT 100')).rows;
    return {...await this.versions(this.pool),categories:categories.map(c=>({...categoryDto(c),productCount:c.products,childCount:c.children})),aliases,
      brands:brands.map(b=>({...b,version:Number(b.admin_version),aliases:b.aliases||[]})),schemas,history,
      policy:{retirement:'TRANSFER_OR_BLOCK',subtreeRetirement:true,legacyAttributes:'ON_EDIT_OR_NEW_ONLY',csvLimit:200}};
  }
  async category(db,id){adminId(id);const row=(await db.query('SELECT * FROM catalog.categories WHERE id=$1',[id])).rows[0];if(!row)reject('CATEGORY_NOT_FOUND','Không tìm thấy danh mục.',404);return row;}
  async subtree(db,id){return (await db.query(`WITH RECURSIVE tree AS(SELECT * FROM catalog.categories WHERE id=$1
    UNION ALL SELECT c.* FROM catalog.categories c JOIN tree t ON c.parent_id=t.id) SELECT * FROM tree`,[id])).rows;}
  async activeCategory(db,id){
    const rows=(await db.query(`WITH RECURSIVE path AS(SELECT id,parent_id,is_active FROM catalog.categories WHERE id=$1
      UNION ALL SELECT c.id,c.parent_id,c.is_active FROM catalog.categories c JOIN path p ON c.id=p.parent_id)
      SELECT count(*)::int AS total,bool_and(is_active) AS active FROM path`,[id])).rows[0];
    if(!rows.total||!rows.active)reject('CATEGORY_UNAVAILABLE','Danh mục và toàn bộ danh mục cha phải đang hoạt động.');
  }
  async impact(db,id){
    const nodes=await this.subtree(db,id),ids=nodes.map(c=>c.id),slugs=nodes.map(c=>c.slug);
    const aliases=(await db.query('SELECT slug FROM catalog.category_slug_aliases WHERE category_id=ANY($1::uuid[])',[ids])).rows;slugs.push(...aliases.map(a=>a.slug));
    const products=(await db.query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE status IN ('active','published'))::int AS selling,
      count(*) FILTER(WHERE platform_suspended)::int AS blocked FROM catalog.products WHERE category_id=ANY($1::uuid[])`,[ids])).rows[0];
    const settings=(await db.query('SELECT * FROM catalog.storefront_settings WHERE id=1')).rows[0];
    const all=(await db.query('SELECT id,name,slug,parent_id AS "parentId" FROM catalog.categories WHERE is_active')).rows;
    const fallback=defaultStorefront(all),policy=(await db.query('SELECT approval_required FROM catalog.product_review_policy WHERE id=true')).rows[0];
    const schemas=(await db.query('SELECT category_id FROM catalog.category_attribute_schemas WHERE category_id=ANY($1::uuid[])',[ids])).rows;
    const banners=(await db.query("SELECT id,title,active_from,active_to FROM catalog.catalog_banners WHERE split_part(split_part(target_url,'?',1),'#',1)=ANY($1::text[])",[slugs.map(slug=>`/category/${slug}`)])).rows;
    return {productCount:products.total,sellingProducts:products.selling,blockedProducts:products.blocked,descendantCount:Math.max(0,nodes.length-1),
      directChildren:nodes.filter(c=>c.parent_id===id).length,nodeIds:ids,slugs,attributeSchemaCount:schemas.length,
      aliases:aliases.length,reapprovalRequired:policy.approval_required,draftReferences:categoryReferences(settings.draft||fallback,ids,slugs),
      publishedReferences:[...categoryReferences(settings.published||fallback,ids,slugs),...banners.map(b=>({path:`legacyBanners.${b.id}`,label:b.title,enabled:(!b.active_from||new Date(b.active_from)<=new Date())&&(!b.active_to||new Date(b.active_to)>new Date())}))]};
  }
  normalize(input){
    const allowed={create:['category'],update:['category','replacementId'],delete:[],transfer:['replacementId'],schema:['definitions','legacyPolicy'],brand:['brand'],merge_brand:['replacementId']};
    if(!input||!allowed[input.action]||Object.keys(input).some(k=>!['action','id','version','reason','requestId',...allowed[input.action]].includes(k)))reject('INVALID_TAXONOMY','Thao tác catalog không hợp lệ.',400);
    const cmd={...input,...adminMutation(input)};
    if(input.action!=='create'&&input.action!=='brand'||input.id)adminId(input.id);
    if(input.replacementId)adminId(input.replacementId);
    if(['create','update'].includes(input.action))cmd.category=categoryInput(input.category);
    if(input.action==='schema'){
      cmd.definitions=attributeDefinitions(input.definitions);if(!['ON_EDIT','NEW_ONLY'].includes(input.legacyPolicy))reject('INVALID_SCHEMA','Chọn cách áp dụng cho sản phẩm cũ.',400);
    }
    if(input.action==='brand'){
      const b=input.brand;if(!b||Object.keys(b).some(k=>!['name','aliases','logoUrl','status'].includes(k))||!['ACTIVE','INACTIVE'].includes(b.status)||!Array.isArray(b.aliases)||b.aliases.length>100)reject('INVALID_BRAND','Thương hiệu không hợp lệ.',400);
      cmd.brand={name:taxText(b.name,2,120),aliases:b.aliases.map(a=>taxText(a,2,120)),logoUrl:taxMedia(b.logoUrl),status:b.status};
      if(new Set([b.name,...b.aliases].map(canonicalName)).size!==b.aliases.length+1)reject('DUPLICATE_BRAND_NAME','Tên chuẩn và tên thay thế không được trùng.',400);
    }return cmd;
  }
  async schemaImpact(db,id,definitions){
    const nodes=await this.subtree(db,id),products=(await db.query('SELECT id,category_id,specifications_json FROM catalog.products WHERE category_id=ANY($1::uuid[])',[nodes.map(c=>c.id)])).rows;
    const affected=[];let missing=0;const samples=[],schemas=new Map();
    for(const product of products){if(!schemas.has(product.category_id))schemas.set(product.category_id,await effectiveSchema(db,product.category_id));const current=schemas.get(product.category_id);
      if(current&&current.category_id!==id&&nodes.some(n=>n.id===current.category_id))continue;
      affected.push(product.id);const errors=specificationErrors(definitions,product.specifications_json);if(errors.length){missing++;if(samples.length<20)samples.push({id:product.id,errors});}
    }return {productCount:affected.length,missingProducts:missing,samples,policy:'Không tự ẩn sản phẩm cũ; yêu cầu bổ sung theo chính sách đã chọn.'};
  }
  async validate(db,cmd){
    if(['create','update','delete','transfer'].includes(cmd.action)){
      const current=cmd.action==='create'?null:await this.category(db,cmd.id),impact=current?await this.impact(db,cmd.id):{productCount:0,descendantCount:0,directChildren:0,draftReferences:[],publishedReferences:[]};
      if(current)checkAdminVersion(current,cmd);
      if(cmd.category){
        if(cmd.category.parentId){await this.activeCategory(db,cmd.category.parentId);if(impact.nodeIds?.includes(cmd.category.parentId))reject('CATEGORY_CYCLE','Không thể chuyển danh mục vào chính nó hoặc hậu duệ.');}
        const conflict=(await db.query('SELECT id FROM catalog.categories WHERE slug=$1 AND ($2::uuid IS NULL OR id<>$2) UNION ALL SELECT category_id AS id FROM catalog.category_slug_aliases WHERE slug=$1 AND ($2::uuid IS NULL OR category_id<>$2)',[cmd.category.slug,current?.id||null])).rows;
        if(conflict.length)reject('CATEGORY_SLUG_TAKEN','Slug đã được sử dụng hoặc dành cho URL cũ.');
      }
      if(cmd.action==='delete'&&(impact.productCount||impact.descendantCount||impact.attributeSchemaCount||impact.aliases||impact.draftReferences.length||impact.publishedReferences.length))reject('CATEGORY_REFERENCED','Danh mục còn sản phẩm, danh mục con, thuộc tính hoặc tham chiếu; không thể xóa.');
      const retiring=cmd.action==='update'&&!cmd.category.isActive;
      if((retiring&&impact.productCount||cmd.action==='transfer')&&!cmd.replacementId)reject('REPLACEMENT_REQUIRED','Chọn danh mục thay thế để chuyển sản phẩm trước khi ngừng.');
      if(cmd.replacementId){await this.activeCategory(db,cmd.replacementId);if(impact.nodeIds.includes(cmd.replacementId))reject('INVALID_REPLACEMENT','Danh mục thay thế phải nằm ngoài nhánh đang xử lý.');}
      let targetAttributeGaps=0;
      if(cmd.replacementId){const schema=await effectiveSchema(db,cmd.replacementId);if(schema){const products=(await db.query('SELECT specifications_json FROM catalog.products WHERE category_id=ANY($1::uuid[])',[impact.nodeIds])).rows;targetAttributeGaps=products.filter(p=>specificationErrors(schema.definitions,p.specifications_json).length).length;}}
      return {...impact,retiring,targetAttributeGaps,before:current?categoryDto(current):null};
    }
    if(cmd.action==='schema'){
      await this.category(db,cmd.id);const before=await effectiveSchema(db,cmd.id);
      const own=before?.category_id===cmd.id?before:null;if(Number(own?.version||0)!==cmd.version)reject('VERSION_CONFLICT','Bộ thuộc tính đã thay đổi.');
      return {...await this.schemaImpact(db,cmd.id,cmd.definitions),before:own};
    }
    const current=cmd.id?(await db.query('SELECT * FROM catalog.brands WHERE id=$1',[cmd.id])).rows[0]:null;
    if(cmd.id&&!current)reject('BRAND_NOT_FOUND','Không tìm thấy thương hiệu.',404);
    if(Number(current?.admin_version||0)!==cmd.version)reject('VERSION_CONFLICT','Thương hiệu đã thay đổi.');
    if(current?.status==='MERGED')reject('BRAND_MERGED','Thương hiệu đã được hợp nhất.');
    if(cmd.action==='brand'){
      const names=[cmd.brand.name,...cmd.brand.aliases].map(canonicalName);
      if((await db.query('SELECT name_key FROM catalog.brand_names WHERE name_key=ANY($1::text[]) AND ($2::uuid IS NULL OR brand_id<>$2)',[names,cmd.id||null])).rowCount)reject('DUPLICATE_BRAND_NAME','Tên hoặc tên thay thế đã thuộc thương hiệu khác.');
    }else{
      adminId(cmd.replacementId);const target=(await db.query("SELECT * FROM catalog.brands WHERE id=$1 AND status='ACTIVE'",[cmd.replacementId])).rows[0];
      if(!target||cmd.id===cmd.replacementId)reject('INVALID_REPLACEMENT','Chọn thương hiệu chuẩn khác đang hoạt động.');
    }
    const count=current?(await db.query('SELECT count(*)::int AS total FROM catalog.products WHERE brand_id=$1 OR brand_id IS NULL AND lower(trim(brand)) IN(SELECT name_key FROM catalog.brand_names WHERE brand_id=$1)',[current.id])).rows[0].total:0;
    return {before:current,productCount:count,reapprovalRequired:(await db.query('SELECT approval_required FROM catalog.product_review_policy WHERE id=true')).rows[0].approval_required};
  }
  async preview(actor,input){
    this.authorize(actor,'taxonomy.manage');const cmd=this.normalize(input);
    return this.transaction(async db=>{const impact=await this.validate(db,cmd),versions=await this.versions(db);
      if(cmd.action==='create'&&cmd.version!==versions.stateVersion)reject('VERSION_CONFLICT','Cây danh mục đã thay đổi.');
      const row=(await db.query('INSERT INTO catalog.taxonomy_previews(actor_id,command,state_version,storefront_version,impact) VALUES($1,$2,$3,$4,$5) RETURNING id,created_at',[actor.id,cmd,versions.stateVersion,versions.storefrontVersion,impact])).rows[0];
      return {...row,command:cmd,impact,...versions};
    });
  }
  async audit(db,actor,cmd,before,after,impact){await db.query('INSERT INTO catalog.taxonomy_audit(actor_id,action,target_id,reason,before_data,after_data,impact,request_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[actor.id,cmd.action,after?.id||cmd.id||null,cmd.reason,before||null,after||null,impact||{},cmd.requestId]);}
  async notifyProducts(db,products,reason){
    if(!products.length)return;
    await db.query(`INSERT INTO catalog.taxonomy_seller_notices(product_id,recipient_id,body)
      SELECT p.id,s.owner_user_id,$2 FROM catalog.products p JOIN catalog.stores s ON s.id=p.store_id WHERE p.id=ANY($1::uuid[])`,[products.map(p=>p.id),reason]);
  }
  async transfer(db,ids,replacementId,reason){
    if(!replacementId)return [];
    const products=(await db.query(`WITH source AS MATERIALIZED(SELECT id,category_id FROM catalog.products WHERE category_id=ANY($1::uuid[]) FOR UPDATE)
      UPDATE catalog.products p SET category_id=$2,updated_at=now() FROM source s WHERE p.id=s.id RETURNING p.id,p.store_id,s.category_id AS previous_category_id,p.admin_version`,[ids,replacementId])).rows;
    await this.notifyProducts(db,products,`Sàn đã chuyển sản phẩm sang danh mục thay thế. ${reason} Nếu áp dụng duyệt trước đăng, phiên bản nội dung mới cần được xét duyệt.`);return products;
  }
  async apply(db,actor,cmd,impact){
    if(cmd.action==='create')return (await this.catalog.createCategory(cmd.category,db)).category;
    if(cmd.action==='update'||cmd.action==='transfer'){
      const moved=await this.transfer(db,impact.nodeIds,cmd.replacementId,cmd.reason);
      if(impact.retiring){
        const settings=(await db.query('SELECT * FROM catalog.storefront_settings WHERE id=1 FOR UPDATE')).rows[0];
        await db.query('UPDATE catalog.storefront_settings SET draft=$1,published=$2,version=version+1,updated_at=now() WHERE id=1',[
          retireReferences(settings.draft,impact.nodeIds,impact.slugs),retireReferences(settings.published,impact.nodeIds,impact.slugs)]);
        await db.query("UPDATE catalog.catalog_banners SET active_to=now() WHERE split_part(split_part(target_url,'?',1),'#',1)=ANY($1::text[]) AND (active_to IS NULL OR active_to>now())",[impact.slugs.map(slug=>`/category/${slug}`)]);
        await db.query('UPDATE catalog.categories SET is_active=false WHERE id=ANY($1::uuid[])',[impact.nodeIds]);
      }
      if(cmd.action==='transfer')return {id:cmd.id,movedProducts:moved};
      const c=cmd.category;const row=(await db.query(`UPDATE catalog.categories SET name=$2,slug=$3,description=$4,parent_id=$5,sort_order=$6,is_active=$7,icon_key=$8,image_key=$9 WHERE id=$1 RETURNING *`,
        [cmd.id,c.name,c.slug,c.description,c.parentId,c.sortOrder,c.isActive,c.iconKey,c.imageKey])).rows[0];return {...categoryDto(row),movedProducts:moved};
    }
    if(cmd.action==='delete'){await db.query('DELETE FROM catalog.categories WHERE id=$1',[cmd.id]);return {id:cmd.id,deleted:true};}
    if(cmd.action==='schema')return (await db.query(`INSERT INTO catalog.category_attribute_schemas(category_id,definitions,legacy_policy,version) VALUES($1,$2,$3,1)
      ON CONFLICT(category_id) DO UPDATE SET definitions=$2,legacy_policy=$3,version=catalog.category_attribute_schemas.version+1,updated_at=clock_timestamp() RETURNING *`,[cmd.id,JSON.stringify(cmd.definitions),cmd.legacyPolicy])).rows[0];
    if(cmd.action==='brand'){
      const b=cmd.brand,id=cmd.id||randomUUID();
      await db.query(`INSERT INTO catalog.brands(id,name,logo_url,status) VALUES($1,$2,$3,$4)
        ON CONFLICT(id) DO UPDATE SET name=$2,logo_url=$3,status=$4,admin_version=catalog.brands.admin_version+1`,[id,b.name,b.logoUrl,b.status]);
      // Preserve previous names as aliases so existing seller values remain resolvable.
      for(const value of [b.name,...b.aliases])await db.query('INSERT INTO catalog.brand_names(name_key,display_name,brand_id) VALUES($1,$2,$3) ON CONFLICT(name_key) DO UPDATE SET display_name=$2',[canonicalName(value),value,id]);
      const products=(await db.query('UPDATE catalog.products SET brand=$2,brand_id=$1 WHERE (brand_id=$1 AND brand IS DISTINCT FROM $2) OR brand_id IS NULL AND lower(trim(brand)) IN(SELECT name_key FROM catalog.brand_names WHERE brand_id=$1) RETURNING id',[id,b.name])).rows;
      await this.notifyProducts(db,products,`Sàn cập nhật tên thương hiệu chuẩn thành ${b.name}. ${cmd.reason}`);return {id,...b};
    }
    const target=(await db.query('SELECT * FROM catalog.brands WHERE id=$1',[cmd.replacementId])).rows[0];
    const products=(await db.query('UPDATE catalog.products SET brand_id=$2,brand=$3 WHERE brand_id=$1 OR brand_id IS NULL AND lower(trim(brand)) IN(SELECT name_key FROM catalog.brand_names WHERE brand_id=$1) RETURNING id',[cmd.id,target.id,target.name])).rows;
    await db.query('UPDATE catalog.brand_names SET brand_id=$2 WHERE brand_id=$1',[cmd.id,target.id]);
    await db.query('UPDATE catalog.brands SET merged_into=$2,admin_version=admin_version+1 WHERE merged_into=$1',[cmd.id,target.id]);
    await db.query("UPDATE catalog.brands SET status='MERGED',merged_into=$2,admin_version=admin_version+1 WHERE id=$1",[cmd.id,target.id]);
    await this.notifyProducts(db,products,`Sàn hợp nhất thương hiệu thành ${target.name}. ${cmd.reason}`);return {id:cmd.id,mergedInto:target.id,movedProducts:products};
  }
  async commit(actor,input){
    this.authorize(actor,'taxonomy.manage');adminId(input?.previewId);
    return this.transaction(async db=>{
      const preview=(await db.query('SELECT * FROM catalog.taxonomy_previews WHERE id=$1 AND actor_id=$2',[input.previewId,actor.id])).rows[0];if(!preview)reject('PREVIEW_NOT_FOUND','Không tìm thấy bản xem trước.',404);
      const cmd=preview.command;
      return adminCommand(db,'catalog',actor,'taxonomy:commit',{previewId:preview.id,requestId:cmd.requestId},async()=>{
        const versions=await this.versions(db);
        if(versions.stateVersion!==Number(preview.state_version)||versions.storefrontVersion!==Number(preview.storefront_version))reject('VERSION_CONFLICT','Danh mục, sản phẩm liên quan hoặc trang chủ đã thay đổi. Xem trước lại tác động.');
        if(Date.now()-new Date(preview.created_at).getTime()>900000)reject('PREVIEW_EXPIRED','Bản xem trước hết hạn sau 15 phút.');
        const impact=await this.validate(db,cmd),result=await this.apply(db,actor,cmd,impact);await this.audit(db,actor,cmd,impact.before,result,impact);
        return {result,...await this.versions(db)};
      });
    });
  }
  async resolve(slug){
    taxSlug(slug);const row=(await this.pool.query(`SELECT c.*,c.slug<>$1 AS redirected FROM catalog.categories c WHERE c.slug=$1
      OR c.id=(SELECT category_id FROM catalog.category_slug_aliases WHERE slug=$1)`,[slug])).rows[0];
    if(!row)reject('CATEGORY_NOT_FOUND','Không tìm thấy danh mục.',404);await this.activeCategory(this.pool,row.id);
    return {category:categoryDto(row),redirected:row.redirected,canonicalPath:`/category/${row.slug}`};
  }
  async sellerSchema(user,productId){
    adminId(productId);return this.catalog.transaction(async db=>{
      await db.query('SELECT s.id FROM catalog.stores s JOIN catalog.products p ON p.store_id=s.id WHERE p.id=$1 FOR SHARE OF s',[productId]);
      const row=await this.catalog.ownerStoreOfProduct(productId,user.id,db),product=(await db.query('SELECT * FROM catalog.products WHERE id=$1',[productId])).rows[0];
      const schema=await effectiveSchema(db,product.category_id);
      const notices=(await db.query('SELECT n.id,n.body,n.created_at FROM catalog.taxonomy_seller_notices n JOIN catalog.stores s ON s.owner_user_id=n.recipient_id AND s.id=$2 WHERE n.product_id=$1 ORDER BY n.id DESC LIMIT 30',[productId,row.store_id])).rows;
      return {schema,values:product.specifications_json,errors:schema?specificationErrors(schema.definitions,product.specifications_json):[],storeId:row.store_id,notices};
    });
  }
  async imports(actor){this.authorize(actor);return {items:(await this.pool.query('SELECT id,kind,status,filename,row_count,errors,created_at,applied_at FROM catalog.taxonomy_imports ORDER BY created_at DESC LIMIT 50')).rows};}
  async previewCsv(actor,input){
    this.authorize(actor,'taxonomy.import');
    if(!input||Object.keys(input).some(k=>!['kind','csv','filename','version','reason','requestId'].includes(k))||!['categories','attributes'].includes(input.kind))reject('INVALID_IMPORT','Chọn CSV danh mục hoặc thuộc tính.',400);
    const mutation=adminMutation(input),filename=taxText(input.filename,1,180);
    return this.transaction(async db=>{
      const versions=await this.versions(db);if(mutation.version!==versions.stateVersion)reject('VERSION_CONFLICT','Catalog đã thay đổi. Tải lại trước khi nhập.');
      const errors=[],plan=[];let parsed={headers:[],rows:[]};try{parsed=parseCsv(input.csv);}catch(e){errors.push({line:Number(/^Dòng (\d+)/.exec(e.message)?.[1]||1),message:e.message});}
      const headers=input.kind==='categories'?['name','slug','parentSlug','description','sortOrder','isActive','iconKey','imageKey']:['categorySlug','code','label','type','required','unit','allowedValues','legacyPolicy'];
      if(parsed.headers.length&&(parsed.headers.length!==headers.length||headers.some(h=>!parsed.headers.includes(h))))errors.push({line:1,message:`Tiêu đề bắt buộc: ${headers.join(',')}`});
      const all=(await db.query('SELECT * FROM catalog.categories')).rows,bySlug=new Map(all.map(c=>[c.slug,c])),newBySlug=new Map(),grouped=new Map();
      for(const row of parsed.rows){try{
        if(row.cells.length!==headers.length)reject('INVALID_CSV','Số cột không khớp tiêu đề.',400);const v=row.values;
        if(input.kind==='categories'){
          if(!['true','false'].includes(v.isActive)||!/^\d+$/.test(v.sortOrder))reject('INVALID_CSV','isActive là true/false; sortOrder là số nguyên.',400);
          const category=categoryInput({name:v.name,slug:v.slug,description:v.description,parentId:null,sortOrder:Number(v.sortOrder),isActive:v.isActive==='true',iconKey:v.iconKey,imageKey:v.imageKey});
          if(bySlug.has(category.slug)||newBySlug.has(category.slug)||(await db.query('SELECT 1 FROM catalog.category_slug_aliases WHERE slug=$1',[category.slug])).rowCount)reject('DUPLICATE_SLUG','Slug đã tồn tại hoặc trùng trong file.',400);
          const item={id:randomUUID(),line:row.line,category,parentSlug:v.parentSlug};newBySlug.set(category.slug,item);plan.push(item);
        }else{
          const category=bySlug.get(v.categorySlug);if(!category)reject('CATEGORY_NOT_FOUND','categorySlug không tồn tại.',400);
          if(!['true','false'].includes(v.required)||!['ON_EDIT','NEW_ONLY'].includes(v.legacyPolicy))reject('INVALID_CSV','required là true/false; legacyPolicy là ON_EDIT/NEW_ONLY.',400);
          const definition=attributeDefinitions([{code:v.code,label:v.label,type:v.type,required:v.required==='true',unit:v.unit,allowedValues:v.allowedValues?v.allowedValues.split('|'):[]}])[0];
          const group=grouped.get(category.id)||{id:category.id,definitions:[],legacyPolicy:v.legacyPolicy,lines:[]};
          if(group.legacyPolicy!==v.legacyPolicy||group.definitions.some(d=>d.code===definition.code))reject('DUPLICATE_ATTRIBUTE','Mã thuộc tính trùng hoặc chính sách không nhất quán.',400);
          group.definitions.push(definition);group.lines.push(row.line);grouped.set(category.id,group);
        }
      }catch(e){errors.push({line:row.line,message:e.message});}}
      if(input.kind==='categories'){
        for(const item of plan){try{
          const parent=item.parentSlug?(bySlug.get(item.parentSlug)||newBySlug.get(item.parentSlug)):null;if(item.parentSlug&&!parent)reject('INVALID_PARENT','parentSlug không tồn tại trong catalog hoặc file.',400);
          const visited=new Set([item.category.slug]);let cursor=item;
          while(cursor.parentSlug){if(visited.has(cursor.parentSlug))reject('CATEGORY_CYCLE','Chu trình danh mục trong CSV.',400);visited.add(cursor.parentSlug);cursor=newBySlug.get(cursor.parentSlug);if(!cursor)break;}
          if(parent){item.category.parentId=parent.id;const active=parent.category?parent.category.isActive:parent.is_active;if(item.category.isActive&&!active)reject('INVALID_PARENT','Danh mục hoạt động không được nằm dưới cha đã ngừng.',400);if(!parent.category&&item.category.isActive)await this.activeCategory(db,parent.id);}
        }catch(e){errors.push({line:item.line,message:e.message});}}
      }else for(const group of grouped.values()){
        const own=(await db.query('SELECT * FROM catalog.category_attribute_schemas WHERE category_id=$1',[group.id])).rows[0];
        group.definitions=[...(own?.definitions||[]).filter(d=>!group.definitions.some(next=>next.code===d.code)),...group.definitions];
        try{attributeDefinitions(group.definitions);plan.push(group);}catch(e){for(const line of group.lines)errors.push({line,message:e.message});}
      }
      const result=(await db.query(`INSERT INTO catalog.taxonomy_imports(actor_id,kind,status,filename,row_count,plan,errors,state_version,storefront_version,reason,request_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[actor.id,input.kind,errors.length?'INVALID':'PREVIEWED',filename,parsed.rows.length,JSON.stringify(plan),JSON.stringify(errors),versions.stateVersion,versions.storefrontVersion,mutation.reason,mutation.requestId])).rows[0];
      return result;
    });
  }
  async commitCsv(actor,input){
    this.authorize(actor,'taxonomy.import');adminId(input?.importId);
    return this.transaction(async db=>{
      const record=(await db.query('SELECT * FROM catalog.taxonomy_imports WHERE id=$1 AND actor_id=$2 FOR UPDATE',[input.importId,actor.id])).rows[0];if(!record)reject('IMPORT_NOT_FOUND','Không tìm thấy lần nhập.',404);
      return adminCommand(db,'catalog',actor,'taxonomy:csv',{importId:record.id,requestId:record.request_id},async()=>{
        if(record.status!=='PREVIEWED')reject('INVALID_IMPORT','File không hợp lệ; không có bản ghi nào được tạo.');
        const versions=await this.versions(db);if(versions.stateVersion!==Number(record.state_version)||versions.storefrontVersion!==Number(record.storefront_version))reject('VERSION_CONFLICT','Catalog đã thay đổi. Kiểm tra lại toàn bộ file.');
        if(Date.now()-new Date(record.created_at).getTime()>900000)reject('PREVIEW_EXPIRED','Bản kiểm tra CSV đã hết hạn.');
        const remaining=[...record.plan];let applied=0;
        while(remaining.length){let progress=false;
          for(let i=remaining.length-1;i>=0;i--){const item=remaining[i];
            if(record.kind==='categories'&&item.category.parentId&&remaining.some(p=>p.id===item.category.parentId))continue;
            const cmd=record.kind==='categories'?{action:'create',category:item.category}:{action:'schema',id:item.id,definitions:item.definitions,legacyPolicy:item.legacyPolicy};
            let result;if(record.kind==='categories'){
              // Use the same category creation contract, retaining IDs referenced by child CSV rows.
              const c=item.category;result=categoryDto((await db.query('INSERT INTO catalog.categories(id,name,slug,parent_id,description,sort_order,is_active,icon_key,image_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[item.id,c.name,c.slug,c.parentId,c.description,c.sortOrder,c.isActive,c.iconKey,c.imageKey])).rows[0]);
            }else result=await this.apply(db,actor,cmd,{});
            await this.audit(db,actor,{...cmd,reason:record.reason,requestId:record.request_id},null,result,{importId:record.id,line:item.line,lines:item.lines});
            remaining.splice(i,1);applied++;progress=true;
          }if(!progress)reject('CATEGORY_CYCLE','Không thể sắp xếp danh mục cha/con trong file.');
        }
        await db.query("UPDATE catalog.taxonomy_imports SET status='APPLIED',applied_at=now() WHERE id=$1",[record.id]);return {id:record.id,status:'APPLIED',applied,...await this.versions(db)};
      });
    });
  }
}
