import {requireAdminScope} from '../../../packages/contracts/admin-rbac.js';
import {PlatformAdminError, adminMutation} from '../../../packages/contracts/platform-admin.js';
import {adminCommand} from '../../../packages/contracts/admin-command.js';
import {defaultStorefront, flattenStorefrontCategories, resolveStorefront, validateStorefront} from './storefront-config.js';
export class StorefrontService {
  constructor(catalog){this.catalog=catalog;this.pool=catalog.pool;}
  async categories(){return flattenStorefrontCategories((await this.catalog.categories()).categories);}
  async publicConfig(categories=null){
    categories=categories||await this.categories();
    const result=await this.pool.query('SELECT published,version,published_at FROM catalog.storefront_settings WHERE id=1');
    const row=result.rows[0];return {layout:resolveStorefront(row?.published||defaultStorefront(categories),categories),configured:Boolean(row?.published),version:Number(row?.version||0),publishedAt:row?.published_at||null};
  }
  async read(actor){
    requireAdminScope(actor,'storefront.read',{});
    const [categories,result,history]=await Promise.all([this.categories(),this.pool.query('SELECT * FROM catalog.storefront_settings WHERE id=1'),
      this.pool.query('SELECT id,actor_id,action,version,created_at,reason,read_version,correlation_id FROM catalog.storefront_changes ORDER BY id DESC LIMIT 20')]);
    const row=result.rows[0],draft=row?.draft||row?.published||defaultStorefront(categories);
    const [products,stores]=await Promise.all([
      this.pool.query('SELECT id,name,status FROM catalog.products WHERE id=ANY($1::uuid[])',[draft.featuredProductIds]),
      this.pool.query('SELECT id,name,status FROM catalog.stores WHERE id=ANY($1::uuid[])',[draft.featuredStoreIds]),
    ]);
    return {draft,published:row?.published||null,version:Number(row?.version||0),publishedAt:row?.published_at||null,categories,
      references:{products:products.rows,stores:stores.rows},history:history.rows};
  }
  async checkReferences(config){
    const categories=await this.categories();const byId=new Map(categories.map(item=>[item.id,item]));
    for(const tile of config.featuredCategories){if(tile.categoryId){const category=byId.get(tile.categoryId);if(!category&&tile.enabled)throw new PlatformAdminError(409,'CATEGORY_UNAVAILABLE','Danh mục được chọn đã ngừng hoạt động. Hãy ẩn hoặc bỏ ô này.');if(category)tile.targetUrl='/category/'+category.slug;}}
    for(const [table,ids] of [['products',config.featuredProductIds],['stores',config.featuredStoreIds]])if(ids.length){
      const result=await this.pool.query(`SELECT id FROM catalog.${table} WHERE id=ANY($1::uuid[])`,[ids]);
      if(result.rows.length!==ids.length)throw new PlatformAdminError(409,'FEATURED_UNAVAILABLE','Một mục được ghim không còn tồn tại. Hãy bỏ mục đó trước khi lưu.');
    }
    return config;
  }
  async save(actor,input,publish=false){
    requireAdminScope(actor,publish?'storefront.approve':'storefront.update',{});
    if(!input||Object.keys(input).some(key=>!['version','config','reason','requestId'].includes(key)))
      throw new PlatformAdminError(400,'INVALID_STOREFRONT','Phiên bản cấu hình không hợp lệ.');
    const mutation=adminMutation(input), validated=validateStorefront(input.config);
    return this.catalog.transaction(db=>adminCommand(db,'catalog',actor,publish?'storefront:publish':'storefront:draft',
      {...mutation,config:validated},async()=>{
      const config=await this.checkReferences(validated);
      const row=(await db.query('SELECT * FROM catalog.storefront_settings WHERE id=1 FOR UPDATE')).rows[0];
      if(Number(row.version)!==input.version)throw new PlatformAdminError(409,'VERSION_CONFLICT','Bố cục đã được quản trị viên khác thay đổi. Hãy tải lại trước khi lưu.');
      const version=Number(row.version)+1;
      const result=await db.query(`UPDATE catalog.storefront_settings SET draft=$1,version=version+1,updated_at=now(),
        published=CASE WHEN $2 THEN $1 ELSE published END,published_at=CASE WHEN $2 THEN now() ELSE published_at END
        WHERE id=1 RETURNING published_at`,[config,publish]);
      const change=await db.query('INSERT INTO catalog.storefront_changes(actor_id,action,version,snapshot,reason,read_version,correlation_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,actor_id,action,version,created_at,reason,read_version,correlation_id',
        [actor.id,publish?'published':'draft_saved',version,config,mutation.reason,mutation.version,mutation.requestId]);
      return {draft:config,version,publishedAt:result.rows[0].published_at,change:change.rows[0]};
    }));
  }
  async preview(actor){requireAdminScope(actor,'storefront.read',{});const data=await this.read(actor);return this.catalog.home(data.draft);}
  async choices(actor,query){
    requireAdminScope(actor,'storefront.read',{});
    if(!query||Object.keys(query).some(key=>!['resource','q'].includes(key))||!['products','stores'].includes(query.resource)||
      typeof (query.q||'')!=='string'||(query.q||'').length>100||/[\u0000-\u001f]/.test(query.q||''))throw new PlatformAdminError(400,'INVALID_FILTER','Bộ lọc lựa chọn không hợp lệ.');
    const q=(query.q||'').trim();
    const found=query.resource==='products'?await this.catalog.listProducts({search:q,limit:20,page:1,sort:'newest'}):await this.catalog.stores.list({search:q,limit:20,page:1});
    return {items:(found.products||found.stores).map(item=>({id:item.id,name:item.name}))};
  }
  async createCategory(actor,input){
    requireAdminScope(actor,'storefront.create',{});
    if(!input||Object.keys(input).some(key=>!['name','slug','parentId','version','reason','requestId'].includes(key)))throw new PlatformAdminError(400,'INVALID_CATEGORY','Dữ liệu danh mục không hợp lệ.');
    const mutation=adminMutation(input);
    return this.catalog.transaction(db=>adminCommand(db,'catalog',actor,'storefront:category',input,async()=>{
      const row=(await db.query('SELECT version FROM catalog.storefront_settings WHERE id=1 FOR UPDATE')).rows[0];
      if(Number(row.version)!==mutation.version)throw new PlatformAdminError(409,'VERSION_CONFLICT','Cấu hình đã thay đổi. Hãy tải lại trước khi tạo danh mục.');
      if(input.parentId&&!(await this.categories()).some(category=>category.id===input.parentId))throw new PlatformAdminError(400,'INVALID_PARENT','Danh mục cha không hoạt động.');
      const result=await this.catalog.createCategory({name:input.name,...(input.slug?{slug:input.slug}:{}),parentId:input.parentId},db);
      const version=mutation.version+1;
      await db.query('UPDATE catalog.storefront_settings SET version=version+1,updated_at=now() WHERE id=1');
      await db.query(`INSERT INTO catalog.storefront_changes(actor_id,action,version,snapshot,reason,read_version,correlation_id)
        VALUES($1,'category_created',$2,$3,$4,$5,$6)`,[actor.id,version,result.category,mutation.reason,mutation.version,mutation.requestId]);
      return {...result,version};
    }));
  }
}
