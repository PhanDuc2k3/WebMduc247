import {PlatformAdminError,adminId} from '../../../packages/contracts/platform-admin.js';
export const taxonomyError=(code,message,status=400)=>new PlatformAdminError(status,code,message);
export const taxText=(value,min=0,max=200)=>{
  if(typeof value!=='string'||value.trim().length<min||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw taxonomyError('INVALID_TAXONOMY','Nội dung văn bản không hợp lệ.');return value.trim();
};
export const taxSlug=value=>{if(typeof value!=='string'||value.length<2||value.length>80||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))throw taxonomyError('INVALID_SLUG','Slug chỉ gồm chữ thường, số và dấu gạch ngang, dài 2–80 ký tự.');return value;};
export function taxMedia(value,icon=false){
  if(value==null||value==='')return null;taxText(value,1,2048);
  if(icon&&/^[a-z][a-z0-9-]{1,40}$/.test(value))return value;
  if(/^\/(?:category|assets|home)\/[a-zA-Z0-9/_-]+\.(?:png|jpe?g|webp|avif|svg)$/.test(value)&&!value.includes('..'))return value;
  try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password)return url.href;}catch{}
  throw taxonomyError('INVALID_MEDIA','Ảnh/logo phải là URL HTTPS hoặc đường dẫn ảnh thư viện.');
}
export function categoryInput(value){
  if(!value||Object.keys(value).some(k=>!['name','slug','description','parentId','sortOrder','isActive','iconKey','imageKey'].includes(k)))throw taxonomyError('INVALID_CATEGORY','Thông tin danh mục không hợp lệ.');
  if(value.parentId)adminId(value.parentId);
  if(!Number.isInteger(value.sortOrder)||value.sortOrder<0||value.sortOrder>10000||typeof value.isActive!=='boolean')throw taxonomyError('INVALID_CATEGORY','Thứ tự hoặc trạng thái không hợp lệ.');
  return {name:taxText(value.name,2,120),slug:taxSlug(value.slug),description:taxText(value.description??'',0,5000),parentId:value.parentId||null,
    sortOrder:value.sortOrder,isActive:value.isActive,iconKey:taxMedia(value.iconKey,true),imageKey:taxMedia(value.imageKey)};
}
export function attributeDefinitions(input){
  if(!Array.isArray(input)||input.length>50)throw taxonomyError('INVALID_SCHEMA','Tối đa 50 thuộc tính mỗi bộ.');
  const codes=new Set();return input.map(item=>{
    if(!item||Object.keys(item).some(k=>!['code','label','type','required','unit','allowedValues'].includes(k))||
      !/^[a-z][a-z0-9_]{0,49}$/.test(item.code)||codes.has(item.code)||!['text','number','boolean','enum'].includes(item.type)||typeof item.required!=='boolean')throw taxonomyError('INVALID_SCHEMA','Mã thuộc tính trùng hoặc định nghĩa không hợp lệ.');
    codes.add(item.code);const allowed=item.allowedValues??[];
    if(!Array.isArray(allowed)||allowed.length>100||new Set(allowed).size!==allowed.length||allowed.some(v=>typeof v!=='string'||!v.trim()||v.length>100)||item.type==='enum'&&!allowed.length||item.type!=='enum'&&allowed.length)
      throw taxonomyError('INVALID_SCHEMA','Giá trị cho phép chỉ áp dụng cho kiểu lựa chọn và không được trùng/rỗng.');
    return {code:item.code,label:taxText(item.label,1,100),type:item.type,required:item.required,unit:taxText(item.unit??'',0,30),allowedValues:allowed};
  });
}
export function specificationErrors(definitions,values){
  if(!values||typeof values!=='object'||Array.isArray(values)||JSON.stringify(values).length>32000)return [{field:'specifications',message:'Thông số phải là một đối tượng JSON, tối đa 32 KB.'}];
  const errors=[],byCode=new Map(definitions.map(d=>[d.code,d]));
  for(const key of Object.keys(values))if(!byCode.has(key))errors.push({field:key,message:'Thuộc tính chưa có trong bộ áp dụng.'});
  for(const field of definitions){const value=values[field.code],missing=value===undefined||value===null||value==='';
    if(missing){if(field.required)errors.push({field:field.code,message:`Thiếu ${field.label}.`});continue;}
    const valid=field.type==='number'?typeof value==='number'&&Number.isFinite(value):field.type==='boolean'?typeof value==='boolean':
      field.type==='enum'?typeof value==='string'&&field.allowedValues.includes(value):typeof value==='string'&&value.length<=500;
    if(!valid)errors.push({field:field.code,message:`${field.label} không đúng kiểu hoặc giá trị cho phép.`});
  }return errors;
}
export async function effectiveSchema(db,categoryId){
  if(!categoryId)return null;
  return (await db.query(`WITH RECURSIVE path AS(SELECT id,parent_id,0 AS depth FROM catalog.categories WHERE id=$1
    UNION ALL SELECT c.id,c.parent_id,p.depth+1 FROM catalog.categories c JOIN path p ON c.id=p.parent_id)
    SELECT s.* FROM path p JOIN catalog.category_attribute_schemas s ON s.category_id=p.id ORDER BY p.depth LIMIT 1`,[categoryId])).rows[0]||null;
}
export async function validateSpecifications(db,categoryId,values,{createdAt=null}={}){
  const schema=await effectiveSchema(db,categoryId);
  if(!schema){if(!values||typeof values!=='object'||Array.isArray(values)||Object.keys(values).length)throw taxonomyError('INVALID_SPECIFICATIONS','Danh mục chưa có bộ thông số; hãy để trống thông số.');return;}
  if(schema.legacy_policy==='NEW_ONLY'&&createdAt&&new Date(createdAt)<new Date(schema.updated_at))return;
  const errors=specificationErrors(schema.definitions,values);
  if(errors.length)throw taxonomyError('INVALID_SPECIFICATIONS',errors.map(e=>`${e.field}: ${e.message}`).join(' ').slice(0,1500));
}
export async function resolveBrand(db,name,{existingId=null}={}){
  if(!name)return {name:null,id:null};
  const row=(await db.query('SELECT b.* FROM catalog.brand_names n JOIN catalog.brands b ON b.id=n.brand_id WHERE n.name_key=lower(trim($1))',[name.normalize('NFC')])).rows[0];
  if(!row)return {name,id:null};
  if(row.status!=='ACTIVE'&&!(row.status==='INACTIVE'&&row.id===existingId))throw taxonomyError('BRAND_UNAVAILABLE','Thương hiệu đã ngừng áp dụng; hãy chọn thương hiệu khác.');
  return {name:row.name,id:row.id};
}
export async function validateCategory(db,id){
  if(!id)return;
  const result=(await db.query(`WITH RECURSIVE path AS(SELECT id,parent_id,is_active FROM catalog.categories WHERE id=$1
    UNION ALL SELECT c.id,c.parent_id,c.is_active FROM catalog.categories c JOIN path p ON c.id=p.parent_id)
    SELECT count(*)::int AS total,bool_and(is_active) AS active FROM path`,[id])).rows[0];
  if(!result.total||!result.active)throw taxonomyError('CATEGORY_UNAVAILABLE','Danh mục hoặc danh mục cha đã ngừng hoạt động.');
}
export function parseCsv(source){
  if(typeof source!=='string'||Buffer.byteLength(source)>262144)throw taxonomyError('INVALID_CSV','CSV phải nhỏ hơn 256 KB.');
  source=source.replace(/^\uFEFF/,'');const rows=[];let cells=[],value='',quoted=false,closed=false,line=1,rowLine=1;
  const cell=()=>{cells.push(value);value='';closed=false;};
  const row=()=>{cell();if(cells.some(v=>v!==''))rows.push({line:rowLine,cells});cells=[];rowLine=line;};
  for(let i=0;i<source.length;i++){const c=source[i];
    if(quoted){if(c==='"'){if(source[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else{value+=c;if(c==='\n')line++;}continue;}
    if(closed&&c!==','&&c!=='\r'&&c!=='\n')throw taxonomyError('INVALID_CSV',`Dòng ${line}: ký tự sau dấu đóng nháy.`);
    if(c==='"'){if(value)throw taxonomyError('INVALID_CSV',`Dòng ${line}: dấu nháy không hợp lệ.`);quoted=true;}
    else if(c===',')cell();else if(c==='\n'||c==='\r'){if(c==='\r'&&source[i+1]==='\n')i++;line++;row();rowLine=line;}else value+=c;
  }
  if(quoted)throw taxonomyError('INVALID_CSV',`Dòng ${rowLine}: chưa đóng dấu nháy.`);if(value||cells.length||closed)row();
  if(rows.length<2||rows.length>201)throw taxonomyError('INVALID_CSV','CSV phải có tiêu đề và từ 1 đến 200 dòng dữ liệu.');
  const headers=rows.shift().cells.map(v=>v.trim());if(new Set(headers).size!==headers.length||headers.some(v=>!v))throw taxonomyError('INVALID_CSV','Tiêu đề CSV trùng hoặc rỗng.');
  return {headers,rows:rows.map(row=>({...row,values:Object.fromEntries(headers.map((key,index)=>[key,row.cells[index]??'']))}))};
}
