import { useEffect, useRef, useState, type FormEvent } from 'react';
import { adminRequestId } from '../../api/adminCommand';
import { adminCaseApi } from '../../api/adminCaseApi';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight, Eye, LockKeyhole, Package, RefreshCw, Search, ShieldCheck, Store, UnlockKeyhole, Users } from 'lucide-react';
import { platformAdminApi, type AdminHistory, type AdminPage, type AdminRecord, type AdminResource } from '../../api/platformAdminApi';
import { AdminDialog, date, formatNumber, money, StatusBadge } from './AdminUi';

const adminTitles:Record<AdminResource,{title:string;noun:string;description:string}>={
  users:{title:'Người dùng',noun:'tài khoản',description:'Tra cứu tài khoản và kiểm soát quyền truy cập vào sàn.'},
  stores:{title:'Cửa hàng',noun:'cửa hàng',description:'Theo dõi gian hàng và xử lý tạm ngừng hoạt động khi cần.'},
  products:{title:'Sản phẩm',noun:'sản phẩm',description:'Tra cứu hàng hóa, giá, tồn kho và kiểm duyệt sản phẩm.'},
  orders:{title:'Đơn hàng',noun:'đơn hàng',description:'Theo dõi đơn theo cửa hàng, thanh toán và lịch sử xử lý.'},
};
const roles:Record<string,string>={buyer:'Khách hàng',seller:'Người bán',platform_admin:'Quản trị sàn'};
const filters:Record<AdminResource,[string,string][]>={
  users:[['active','Đang hoạt động'],['pending_verification','Chờ xác minh'],['suspended','Sàn tạm khóa']],
  stores:[['active','Đang hoạt động'],['paused','Shop tạm ngừng'],['suspended','Sàn tạm khóa']],
  products:[['active','Đang bán'],['published','Đã đăng bán'],['draft','Bản nháp'],['hidden','Shop đã ẩn'],['discontinued','Ngừng kinh doanh'],['suspended','Sàn đã ẩn']],
  orders:[['PENDING_INVENTORY','Đang giữ hàng'],['PENDING_PAYMENT','Chờ thanh toán'],['PLACED','Đơn mới'],['CONFIRMED','Đã xác nhận'],
    ['PREPARING','Đang chuẩn bị'],['READY_TO_SHIP','Chờ lấy hàng'],['SHIPPING','Đang giao'],['DELIVERED','Đã giao'],['COMPLETED','Hoàn tất'],['CANCEL_PENDING','Đang hủy'],['CANCELLED','Đã hủy']],
};

export function RecordDialog({resource,id,close,changed}:{resource:AdminResource;id:string;close:()=>void;changed:()=>void}) {
  const attempt=useRef({signature:'',requestId:''});
  const [canCancelBlocked,setCanCancelBlocked]=useState(false);
  useEffect(()=>{let active=true;if(resource==='orders')void adminCaseApi.capabilities().then(result=>{if(active)setCanCancelBlocked(result.permissions.includes('orders.cancel_blocked'));}).catch(()=>{if(active)setCanCancelBlocked(false);});return()=>{active=false;};},[resource]);
  const [record,setRecord]=useState<AdminRecord|null>(null),[history,setHistory]=useState<AdminHistory[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const [confirm,setConfirm]=useState(false),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  useEffect(()=>{
    let active=true;setLoading(true);setError('');setRecord(null);setHistory([]);
    platformAdminApi.detail(resource,id).then(result=>{if(active){setRecord(result.record);setHistory(result.history);}})
      .catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Chưa tải được chi tiết.');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[resource,id,revision]);
  const suspended=resource==='users'?record?.status==='suspended':Boolean(record?.suspended);
  const actionTitle=resource==='orders'?'Hủy đơn do người bán bị khóa':suspended?'Khôi phục':resource==='products'?'Ẩn sản phẩm':resource==='stores'?'Tạm ngừng cửa hàng':'Khóa tài khoản';
  const protectedAdmin=resource==='users'&&record?.roles?.includes('platform_admin');
  async function moderate(event:FormEvent) {
    event.preventDefault();if(!record||busy)return;
    setBusy(true);setError('');
    try{
      const action=suspended?'restore':'suspend';
      const requestId=adminRequestId(attempt.current,{resource,id,action,reason:reason.trim(),version:record.version});
      if(resource==='orders')await platformAdminApi.cancelBlockedSeller(record,reason.trim(),requestId);
      else await platformAdminApi.moderate(resource,record,action,reason.trim(),requestId);
      setNotice(resource==='orders'?'Đã hủy đơn. Nghĩa vụ tiền được xử lý theo phương thức thanh toán của đơn.':suspended?'Đã khôi phục đối tượng.':'Đã áp dụng thao tác và lưu nhật ký.');
      setConfirm(false);setReason('');setRevision(value=>value+1);changed();
    }catch(cause){setError(cause instanceof Error?cause.message:'Chưa thể thực hiện thao tác.');}
    finally{setBusy(false);}
  }
  const entries:[string,string|number|undefined|null][]=!record?[]:resource==='users'?[
    ['Họ tên',record.fullName],['Email',record.email],['Vai trò',record.roles?.map(role=>roles[role]||role).join(', ')],
    ['Ngày tham gia',date(record.createdAt,true)],['Xác minh email',record.emailVerifiedAt?date(record.emailVerifiedAt,true):'Chưa xác minh'],
  ]:resource==='stores'?[
    ['Tên cửa hàng',record.name],['Đường dẫn',record.slug],['Lĩnh vực',record.category||'Chưa phân loại'],['Email liên hệ',record.contactEmail],
    ['Mã chủ cửa hàng',record.ownerId],['Sản phẩm',record.productCount],['Shop muốn nhận đơn',record.acceptingOrders?'Có':'Không'],['Ngày tạo',date(record.createdAt,true)],
  ]:resource==='products'?[
    ['Tên sản phẩm',record.name],['Cửa hàng',record.storeName],['Danh mục',record.categoryName||'Chưa phân loại'],['Thương hiệu',record.brand||'Chưa cập nhật'],
    ['Giá hiện tại',money(record.priceMinor)],['Tồn khả dụng',record.stock],['Ngày tạo',date(record.createdAt,true)],
  ]:[['Mã đơn',record.id],['Cửa hàng',record.storeName],['Mã người mua',record.buyerId],['Phương thức',record.paymentMethod],
    ['Tiền sản phẩm',money(record.subtotalMinor)],['Giảm giá',money(record.discountMinor)],['Phí vận chuyển',money(record.shippingMinor)],
    ['Tổng giá trị',money(record.totalMinor)],['Đã hoàn tiền',money(record.refundedMinor)],['Mã vận chuyển',record.shipmentRef||'Chưa cập nhật'],
    ['Người nhận',record.delivery?.receiverName],['Số điện thoại',record.delivery?.phoneMasked],
    ['Khu vực nhận', [record.delivery?.ward,record.delivery?.province].filter(Boolean).join(', ')||'Chưa cập nhật'],['Ngày đặt',date(record.createdAt,true)]];
  return <AdminDialog title={`Chi tiết ${adminTitles[resource].noun}`} close={()=>{if(!busy)close();}} busy={busy}>
    <div className="pa-detail">
      {notice&&<p className="pa-success" role="status">{notice}</p>}
      {error&&<div className="pa-error" role="alert">{error}<button className="pa-text-link" disabled={busy} onClick={()=>{setConfirm(false);setRevision(value=>value+1);}}>Tải lại chi tiết</button></div>}
      {loading?<p className="pa-detail-loading" role="status">Đang tải chi tiết…</p>:record&&<>
        <div className="pa-detail-badges"><StatusBadge status={record.status}/>{record.paymentStatus&&<StatusBadge status={record.paymentStatus}/>}</div>
        {record.suspensionReason&&<p className="pa-warning"><strong>Lý do sàn tạm khóa:</strong> {record.suspensionReason}</p>}
        {record.imageUrl&&<img className="pa-detail-image" src={record.imageUrl} alt={record.name||''}/>}
        <dl>{entries.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??'Chưa có dữ liệu'}</dd></div>)}</dl>
        {record.description&&<div className="pa-detail-description"><h3>Mô tả</h3><p>{record.description}</p></div>}
        {!!record.variants?.length&&<div className="pa-detail-section"><h3>Biến thể sản phẩm</h3><div className="pa-table-scroll"><table className="pa-table"><thead><tr><th>SKU / thuộc tính</th><th>Giá</th><th>Tồn</th><th>Trạng thái</th></tr></thead><tbody>
          {record.variants.map(variant=><tr key={variant.id}><td>{variant.sku}<small>{Object.entries(variant.attributes||{}).map(([k,v])=>`${k}: ${v}`).join(', ')}</small></td><td>{money(variant.priceMinor)}</td><td>{variant.stock}</td><td>{variant.status==='active'?'Hoạt động':'Ngừng hoạt động'}</td></tr>)}
        </tbody></table></div></div>}
        {!!record.items?.length&&<div className="pa-detail-section"><h3>Sản phẩm trong đơn</h3><div className="pa-table-scroll"><table className="pa-table"><thead><tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>
          {record.items.map(item=><tr key={item.id}><td><strong>{item.name}</strong><small>{item.sku}</small></td><td>{item.quantity}</td><td>{money(item.unitPriceMinor)}</td><td>{money(item.lineTotalMinor)}</td></tr>)}
        </tbody></table></div></div>}
        <div className="pa-detail-section"><h3>{resource==='orders'?'Lịch sử xử lý':'Lịch sử quản trị'}</h3>
          {history.length?<ol className="pa-history">{history.map((entry,index)=><li key={entry.id||index}><div><StatusBadge status={entry.next_status}/><time>{date(entry.created_at,true)}</time></div>
            {entry.reason&&<p>{entry.reason}</p>}<small>{entry.actor_name||(entry.actor_id?`Quản trị viên ${entry.actor_id.slice(0,8)}`:'Hệ thống')}</small></li>)}</ol>:<p className="pa-detail-muted">Chưa có thao tác được ghi nhận.</p>}</div>
        {protectedAdmin&&<p className="pa-detail-muted">Tài khoản quản trị được bảo vệ. Việc cấp hoặc thu hồi quyền thực hiện qua quy trình quản trị riêng.</p>}
        {confirm?<form className="pa-confirm-box" onSubmit={moderate}><h3>Xác nhận {actionTitle.toLowerCase()}</h3>
          {resource==='orders'&&<p>Chỉ áp dụng khi shop hoặc tài khoản chủ shop bị sàn khóa và đơn chưa bàn giao vận chuyển. Hệ thống sẽ trả tồn và chuyển nghĩa vụ hoàn tiền sang Payment.</p>}
          {resource!=='orders'&&<p>{suspended?resource==='users'?'Tài khoản sẽ được gỡ khóa. Email chưa xác minh vẫn cần được xác minh trước khi đăng nhập.':'Đối tượng sẽ được gỡ chặn của sàn. Trạng thái bán/nhận đơn vẫn phụ thuộc thiết lập của shop.':resource==='users'?'Tài khoản sẽ không thể đăng nhập và các phiên hiện tại sẽ bị thu hồi.':'Đối tượng sẽ ngừng xuất hiện hoặc nhận giao dịch mới trên sàn. Các đơn đã tạo vẫn được giữ nguyên.'}</p>}
          {!suspended&&['users','stores'].includes(resource)&&<p>Đơn hàng, hoàn tiền và hồ sơ hỗ trợ đang mở vẫn cần được xử lý. Dùng hàng chờ hồ sơ và quyền can thiệp hậu mãi khi người bán không thể tiếp tục.</p>}
          <label htmlFor="pa-reason">Lý do thực hiện<textarea id="pa-reason" value={reason} onChange={event=>setReason(event.target.value)} minLength={8} maxLength={500} required disabled={busy} placeholder="Ghi rõ lý do để lưu vào nhật ký quản trị…"/></label>
          <div className="pa-dialog-actions"><button type="button" className="pa-button pa-button-light" onClick={()=>setConfirm(false)} disabled={busy}>Hủy</button>
            <button type="submit" className={`pa-button ${suspended?'':'pa-button-danger'}`} disabled={busy||reason.trim().length<8}>{busy?'Đang xử lý…':'Xác nhận'}</button></div></form>:
          <div className="pa-dialog-actions">
            {resource!=='orders'&&!protectedAdmin&&<button type="button" className={`pa-button ${suspended?'':'pa-button-danger'}`} onClick={()=>{setConfirm(true);setReason('');setError('');setNotice('');}}>
              {suspended?<UnlockKeyhole size={16}/>:<LockKeyhole size={16}/>} {actionTitle}</button>}
            {resource==='stores'&&!suspended&&record.status==='active'&&<Link to={`/store/${record.slug}`} target="_blank" rel="noreferrer" className="pa-button pa-button-light">Trang cửa hàng <ArrowUpRight size={15}/></Link>}
            {resource==='products'&&!suspended&&['active','published'].includes(record.status)&&<Link to={`/products/${record.id}`} target="_blank" rel="noreferrer" className="pa-button pa-button-light">Trang sản phẩm <ArrowUpRight size={15}/></Link>}
            {resource==='orders'&&<Link to={`/admin/returns?q=${record.id}`} className="pa-button pa-button-light">Yêu cầu trả hàng <ArrowUpRight size={15}/></Link>}
            {resource==='orders'&&canCancelBlocked&&['PLACED','CONFIRMED','PREPARING','READY_TO_SHIP'].includes(record.status)&&<button className="pa-button pa-button-danger" onClick={()=>{setConfirm(true);setReason('');setError('');}}>Hủy đơn khi người bán bị khóa</button>}
            <button type="button" className="pa-button pa-button-light" onClick={close}>Đóng</button>
          </div>}
      </>}
    </div>
  </AdminDialog>;
}

export default function PlatformRecords({resource}:{resource:AdminResource}) {
  const [params,setParams]=useSearchParams();const q=params.get('q')||'',status=params.get('status')||'',role=params.get('role')||'',selected=params.get('id');
  const rawPage=Number(params.get('page')||1),page=Number.isSafeInteger(rawPage)&&rawPage>0?rawPage:1;
  const [draft,setDraft]=useState(q),[data,setData]=useState<AdminPage<AdminRecord>|null>(null),[loading,setLoading]=useState(true);
  const [error,setError]=useState(''),[revision,setRevision]=useState(0);const config=adminTitles[resource];
  useEffect(()=>setDraft(q),[q,resource]);
  useEffect(()=>{
    let active=true;setLoading(true);setError('');setData(null);
    platformAdminApi.list(resource,{q,status,role:resource==='users'?role:undefined,page,limit:12}).then(result=>{
      if(!active)return;
      if(result.totalPages>0&&page>result.totalPages){const next=new URLSearchParams(params);next.set('page',String(result.totalPages));setParams(next,{replace:true});return;}
      setData(result);
    }).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Chưa tải được danh sách.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[resource,q,status,role,page,revision,params,setParams]);
  function filter(key:string,value:string){const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);if(key!=='page'&&key!=='id')next.delete('page');if(key!=='id')next.delete('id');setParams(next);}
  function search(event:FormEvent){event.preventDefault();filter('q',draft.trim());}
  const heads=resource==='users'?['Người dùng','Vai trò','Trạng thái','Ngày tham gia']:resource==='stores'?['Cửa hàng','Sản phẩm','Trạng thái','Ngày tạo']:
    resource==='products'?['Sản phẩm / cửa hàng','Giá hiện tại','Tồn kho','Trạng thái']:['Mã đơn / cửa hàng','Giá trị đơn','Trạng thái','Ngày đặt'];
  return <div className="pa-page"><div className="pa-page-heading"><div><span className="pa-eyebrow">QUẢN LÝ VẬN HÀNH</span><h1>{config.title}</h1><p>{config.description}</p></div>
    <button className="pa-button pa-button-light" disabled={loading} onClick={()=>setRevision(value=>value+1)}><RefreshCw size={16} className={loading?'animate-spin':''}/>Làm mới</button></div>
    <section className="pa-panel pa-records"><div className="pa-records-top"><div><h2>Danh sách {config.noun}</h2><span className="pa-count-chip">{data?formatNumber(data.total):'—'}</span></div>
      <form className="pa-search" onSubmit={search}><Search size={17}/><input aria-label={`Tìm ${config.noun}`} value={draft} onChange={event=>setDraft(event.target.value)} maxLength={100} placeholder={resource==='users'?'Tìm tên hoặc email…':resource==='orders'?'Tìm mã đơn, cửa hàng, sản phẩm…':'Tìm kiếm…'}/><button type="submit">Tìm kiếm</button></form></div>
      <div className="pa-filters"><label><span className="sr-only">Trạng thái</span><select value={status} onChange={event=>filter('status',event.target.value)}><option value="">Tất cả trạng thái</option>{filters[resource].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        {resource==='users'&&<label><span className="sr-only">Vai trò</span><select value={role} onChange={event=>filter('role',event.target.value)}><option value="">Tất cả vai trò</option>{Object.entries(roles).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
        {(q||status||role)&&<button className="pa-text-link" onClick={()=>setParams({})}>Xóa bộ lọc</button>}</div>
      {error&&<div className="pa-error pa-record-error" role="alert">{error}<button className="pa-text-link" onClick={()=>setRevision(value=>value+1)}>Thử lại</button></div>}
      <div className="pa-table-scroll" aria-busy={loading}><table className="pa-table"><thead><tr>{heads.map(head=><th key={head}>{head}</th>)}<th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>
        {data?.items.map(row=><tr key={row.id}>
          {resource==='users'&&<><td><div className="pa-user-cell"><span className="pa-table-avatar">{row.fullName?.slice(0,1).toUpperCase()||<Users size={17}/>}</span><div><strong className="pa-row-title">{row.fullName}</strong><small>{row.email}</small></div></div></td><td><div className="pa-role-list">{row.roles?.map(role=><span className={`pa-role ${role==='platform_admin'?'pa-role-admin':''}`} key={role}>{role==='platform_admin'&&<ShieldCheck size={11}/>} {roles[role]||role}</span>)}</div></td><td><StatusBadge status={row.status}/></td><td>{date(row.createdAt)}</td></>}
          {resource==='stores'&&<><td><div className="pa-user-cell"><span className="pa-table-avatar pa-avatar-green"><Store size={19}/></span><div><strong className="pa-row-title">{row.name}</strong><small>/{row.slug}</small></div></div></td><td>{formatNumber(row.productCount)} sản phẩm</td><td><StatusBadge status={row.status}/></td><td>{date(row.createdAt)}</td></>}
          {resource==='products'&&<><td><div className="pa-user-cell"><span className="pa-table-avatar pa-avatar-purple"><Package size={19}/></span><div><strong className="pa-row-title">{row.name}</strong><small>{row.storeName}</small></div></div></td><td className="pa-table-money">{money(row.priceMinor)}</td><td>{formatNumber(row.stock)}</td><td><StatusBadge status={row.status}/></td></>}
          {resource==='orders'&&<><td><strong className="pa-row-title">#{row.id.slice(0,8).toUpperCase()}</strong><small>{row.storeName}</small></td><td className="pa-table-money">{money(row.totalMinor)}</td><td><StatusBadge status={row.status}/><small>{row.paymentStatus==='PAID'?'Đã thanh toán':row.paymentStatus==='REFUNDED'?'Đã hoàn tiền':row.paymentMethod}</small></td><td>{date(row.createdAt,true)}</td></>}
          <td><button className="pa-row-action" onClick={()=>filter('id',row.id)} aria-label={`Xem chi tiết ${row.fullName||row.name||row.id}`}><Eye size={16}/><span>Chi tiết</span></button></td>
        </tr>)}
        {!data?.items.length&&<tr><td colSpan={5} className="pa-empty-cell">{loading?'Đang tải dữ liệu…':error?'Dữ liệu chưa sẵn sàng.':q||status||role?'Không có kết quả phù hợp với bộ lọc.':`Chưa có ${config.noun}.`}</td></tr>}
      </tbody></table></div>
      <div className="pa-pagination"><span>{data?data.total?`Hiển thị ${(page-1)*data.limit+1}–${Math.min(page*data.limit,data.total)} trong ${formatNumber(data.total)} ${config.noun}`:`0 ${config.noun}`:'Chưa tải dữ liệu'}</span><div>
        <button aria-label="Trang trước" disabled={loading||page<=1} onClick={()=>filter('page',String(page-1))}><ChevronLeft size={17}/></button><span>Trang {page} / {Math.max(1,data?.totalPages||1)}</span>
        <button aria-label="Trang sau" disabled={loading||!data||page>=data.totalPages} onClick={()=>filter('page',String(page+1))}><ChevronRight size={17}/></button></div></div>
    </section>
    {selected&&<RecordDialog key={`${resource}:${selected}`} resource={resource} id={selected} close={()=>filter('id','')} changed={()=>setRevision(value=>value+1)}/>}
  </div>;
}
