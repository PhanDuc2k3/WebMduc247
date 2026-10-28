import {useEffect,useState,type ReactNode} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {Area,AreaChart,CartesianGrid,Cell,Pie,PieChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {platformAdminApi,type Comparison} from '../../api/platformAdminApi';
import {dashboardFinanceApi,workQueueApi} from '../../api/workQueueApi';
import {useAdminSession} from './AdminSession';
import {hasAdminPermission} from './adminPolicy';
import {useDashboardRegion,workLabels,sourceLabels} from './dashboardState';
import {date,formatNumber,money,StatusBadge} from './AdminUi';
import './dashboard-queue.css';

export function Region({title,loading,error,retry,updatedAt,children}:{title:string;loading:boolean;error:string;retry:()=>void;updatedAt?:string;children:ReactNode}) {
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
  const stale=updatedAt&&now-Date.parse(updatedAt)>120000;
  return <section className="pa-panel dq-region" aria-label={title} aria-busy={loading}>
    <div className="pa-panel-title"><div><h2>{title}</h2>{updatedAt&&<small>Cập nhật {date(updatedAt,true)} · Asia/Bangkok {stale?'· Dữ liệu đang trễ':''}</small>}</div>
      <button type="button" className="pa-text-link" onClick={retry} disabled={loading}>{loading?'Đang tải…':'Tải lại khu vực'}</button></div>
    {error&&<p className="pa-error" role="alert">{error}</p>}{loading?<p role="status">Đang tải dữ liệu…</p>:!error&&children}
  </section>;
}
function Compare({value,currency=false}:{value?:Comparison;currency?:boolean}) {
  if(!value)return null;
  return <small className="dq-comparison">Kỳ trước: {currency?money(value.previous):formatNumber(value.previous)} · {value.delta>0?'+':''}{currency?money(value.delta):formatNumber(value.delta)}
    {value.percent!==null?` (${value.percent>0?'+':''}${value.percent}%)`:' · Kỳ trước bằng 0, so sánh chênh lệch tuyệt đối'}</small>;
}
function Stat({title,value,definition,to,comparison,currency=false}:{title:string;value?:number;definition?:string;to?:string;comparison?:Comparison;currency?:boolean}) {
  return <article className="dq-stat">{to?<Link to={to}><span>{title}</span><strong>{currency?money(value):formatNumber(value)}</strong></Link>:<><span>{title}</span><strong>{currency?money(value):formatNumber(value)}</strong></>}
    <Compare value={comparison} currency={currency}/>{definition&&<details><summary>Định nghĩa chỉ số</summary><p>{definition}</p></details>}</article>;
}
export default function PlatformOverview() {
  const user=useAdminSession(),navigate=useNavigate(),[params,setParams]=useSearchParams();
  const preset=params.get('preset')||'7d',from=params.get('from')||'',to=params.get('to')||'';
  const [customFrom,setCustomFrom]=useState(from),[customTo,setCustomTo]=useState(to);
  useEffect(()=>{setCustomFrom(from);setCustomTo(to);},[from,to]);
  const range=preset==='custom'?{preset,from,to}:{preset},key=JSON.stringify(range);
  const can=(permission:string)=>hasAdminPermission(user,permission);
  const canQueue=['orders.read','cases.read','returns.read','refunds.read','moderation.read'].some(can);
  const financeAllowed=user.adminAccess?.grants?.some(grant=>grant.permission==='finance.view_sensitive'&&!Object.keys(grant.scope||{}).length);
  const identity=useDashboardRegion(key,can('users.read'),()=>platformAdminApi.identitySummary(range));
  const catalog=useDashboardRegion(key,can('stores.read')||can('products.read'),()=>platformAdminApi.catalogSummary(range));
  const orders=useDashboardRegion(key,can('orders.read'),()=>platformAdminApi.orderSummary(range));
  const recent=useDashboardRegion(key,can('orders.read'),()=>platformAdminApi.recentOrders(range));
  const finance=useDashboardRegion(key,Boolean(financeAllowed),()=>dashboardFinanceApi.summary(range));
  const attention=useDashboardRegion('attention',canQueue,()=>workQueueApi.attention());
  useEffect(()=>{if(!canQueue)return;const timer=setInterval(attention.retry,60000);return()=>clearInterval(timer);},[canQueue,attention.retry]);
  const link=(resource:string,extra:Record<string,string>={},day?:string)=>{
    const source=orders.data||identity.data||catalog.data||finance.data||recent.data;
    const dates=day?{from:day,to:day}:source?{from:source.range.from,to:source.range.to}:{};
    return `/admin/${resource}?${new URLSearchParams({...dates,...extra})}`;
  };
  const distribution=orders.data?[{name:'Chờ xử lý',value:orders.data.orders.pending,color:'#5978f4',group:'pending'},
    {name:'Đã giao / hoàn tất',value:orders.data.orders.delivered,color:'#27b294',group:'delivered'},
    {name:'Đã hủy',value:orders.data.orders.cancelled,color:'#ed9b63',group:'cancelled'},
    {name:'Trạng thái khác',value:orders.data.orders.total-orders.data.orders.pending-orders.data.orders.delivered-orders.data.orders.cancelled,color:'#a697e6',group:'other'}]:[];
  const regionProps=(region:{loading:boolean;error:string;retry:()=>void;data:unknown})=>({loading:region.loading,error:region.error,retry:region.retry,updatedAt:(region.data as {updatedAt?:string})?.updatedAt});
  return <div className="pa-page"><div className="pa-page-heading"><div><span className="pa-eyebrow">BẢNG ĐIỀU HÀNH</span><h1>Tổng quan sàn</h1><p>Số liệu theo quyền và phạm vi được giao.</p></div>{canQueue&&<Link className="pa-button" to="/admin/work-queue">Mở hàng chờ công việc</Link>}</div>
    <form className="pa-panel dq-range" onSubmit={event=>{event.preventDefault();setParams({preset:'custom',from:customFrom,to:customTo});}}>
      <label>Kỳ số liệu<select aria-label="Kỳ số liệu" value={preset} onChange={event=>{const resolved=orders.data||identity.data||catalog.data||finance.data||recent.data;setParams({preset:event.target.value,...(event.target.value==='custom'?{from:customFrom||resolved?.range.from||'',to:customTo||resolved?.range.to||''}:{})});}}>
        <option value="today">Hôm nay</option><option value="7d">7 ngày</option><option value="30d">30 ngày</option><option value="custom">Khoảng tùy chọn</option></select></label>
      {preset==='custom'&&<><label>Từ ngày<input aria-label="Từ ngày" type="date" required value={customFrom} onChange={event=>setCustomFrom(event.target.value)}/></label><label>Đến ngày<input aria-label="Đến ngày" type="date" required min={customFrom} value={customTo} onChange={event=>setCustomTo(event.target.value)}/></label><button className="pa-button" type="submit">Áp dụng</button></>}
      <p>Asia/Bangkok (UTC+07:00) · Tính trọn ngày kết thúc. So sánh kỳ liền trước cùng số ngày.</p>
    </form>
    <div className="dq-summary-grid">
      {can('users.read')&&<Region title="Người dùng" {...regionProps(identity)}><Stat title="Tài khoản tạo trong kỳ" value={identity.data?.users.inPeriod} comparison={identity.data?.comparison} definition={identity.data?.definition} to={link('users')}/></Region>}
      {(can('stores.read')||can('products.read'))&&<Region title="Cửa hàng và sản phẩm" {...regionProps(catalog)}>
        {catalog.data?.stores&&<Stat title="Cửa hàng tạo trong kỳ" value={catalog.data.stores.inPeriod} comparison={catalog.data.comparisons.stores} definition={catalog.data.definitions.stores} to={link('stores')}/>}
        {catalog.data?.products&&<Stat title="Sản phẩm tạo trong kỳ" value={catalog.data.products.inPeriod} comparison={catalog.data.comparisons.products} definition={catalog.data.definitions.products} to={link('products')}/>}</Region>}
      {can('orders.read')&&<Region title="Số liệu đơn hàng" {...regionProps(orders)}><Stat title="Shop order trong kỳ" value={orders.data?.orders.total} comparison={orders.data?.comparison} definition={orders.data?.definitions.orders} to={link('orders')}/>
        {orders.data?.orders.orderValueMinor!==undefined&&<Stat title="Giá trị đặt hàng chưa hủy" value={orders.data.orders.orderValueMinor} comparison={orders.data.valueComparison} definition={orders.data.definitions.orderValueMinor} currency to={link('orders',{excludeCancelled:'true'})}/>}</Region>}
      {financeAllowed&&<Region title="Dòng tiền đã xác nhận" {...regionProps(finance)}><Stat title="Thanh toán thành công" value={finance.data?.paid.current} comparison={finance.data?.paid} definition={finance.data?.definitions.paid} currency to={link('finance',{kind:'payments'})}/>
        <Stat title="Hoàn tiền thành công" value={finance.data?.refunded.current} comparison={finance.data?.refunded} definition={finance.data?.definitions.refunded} currency to={link('finance',{kind:'refunds'})}/>
        <p className="pa-detail-muted">{finance.data?.definitions.feeRevenue}</p></Region>}
    </div>
    {can('orders.read')&&<Region title="Biểu đồ đơn hàng" {...regionProps(orders)}><div className="pa-chart-grid"><div>
      <p>Shop order theo ngày tạo, gồm đơn hủy. Bấm điểm trên biểu đồ để mở danh sách theo ngày.</p>
      <div className="pa-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={orders.data?.trend}>
        <CartesianGrid strokeDasharray="4 4"/><XAxis dataKey="date"/><YAxis allowDecimals={false}/><Tooltip/>
        <Area dataKey="orders" stroke="#5879f5" fill="#e5ebff" isAnimationActive={false} activeDot={false} dot={props=><circle key={props.payload.date} cx={props.cx} cy={props.cy} r={5} fill="#5879f5" role="link" tabIndex={0} aria-label={`Xem đơn ngày ${props.payload.date}`} onClick={()=>navigate(link('orders',{},props.payload.date))} onKeyDown={event=>{if(event.key==='Enter')navigate(link('orders',{},props.payload.date));}}/>}/>
      </AreaChart></ResponsiveContainer></div><details><summary>Mở danh sách theo ngày</summary><div className="dq-date-links">{orders.data?.trend.map(point=><Link key={point.date} to={link('orders',{},point.date)}>{point.date}: {point.orders}</Link>)}</div></details></div>
      <div><h3>Trạng thái đơn trong kỳ</h3><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={distribution} dataKey="value" innerRadius={52} outerRadius={80} onClick={entry=>navigate(link('orders',{statusGroup:entry.group}))} isAnimationActive={false}>
        {distribution.map(item=><Cell key={item.group} fill={item.color} cursor="pointer"/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>
        <div className="pa-legend">{distribution.map(item=><Link key={item.group} to={link('orders',{statusGroup:item.group})}><i style={{background:item.color}}/>{item.name}: {formatNumber(item.value)}</Link>)}</div></div></div></Region>}
    {can('orders.read')&&<Region title="Đơn hàng gần đây trong kỳ" {...regionProps(recent)}><div className="pa-table-scroll"><table className="pa-table"><thead><tr><th>Mã đơn / cửa hàng</th><th>Giá trị đơn</th><th>Trạng thái</th><th>Ngày tạo</th></tr></thead><tbody>
      {recent.data?.items.map(row=><tr key={row.id}><td><Link className="pa-text-link" to={link('orders',{id:row.id})}>#{row.id.slice(0,8)} · {row.storeName}</Link></td><td>{money(row.totalMinor)}</td><td><StatusBadge status={row.status}/></td><td>{date(row.createdAt,true)}</td></tr>)}
      {!recent.data?.items.length&&<tr><td colSpan={4}>Không có đơn trong kỳ.</td></tr>}</tbody></table></div></Region>}
    {canQueue&&<Region title="Cần chú ý · công việc có thể xử lý" {...regionProps(attention)}><p>Đếm công việc còn mở hiện tại trong phạm vi được giao, không giới hạn theo kỳ số liệu ở trên.</p><div className="dq-attention">{attention.data?.items.map(item=><Link key={item.kind} className="dq-stat" to={`/admin/work-queue?${new URLSearchParams({kind:item.kind,...(item.kind==='ABUSE_REPORT'?{view:'unassigned'}:item.kind==='ORDER'?{view:'overdue'}:{})})}`}>
      <span>{workLabels[item.kind]}</span><strong>{formatNumber(item.kind==='ABUSE_REPORT'?item.unassigned:item.kind==='ORDER'?item.overdue:item.total)}</strong><small>{item.overdue} quá hạn · {item.unassigned} chưa phân công</small></Link>)}</div>
      {!attention.data?.items.length&&<p>Không có công việc đang mở trong phạm vi của bạn.</p>}
      {attention.data?.health.map(source=><SourceHealth key={source.source} source={source.source} updatedAt={source.updatedAt} errorCode={source.errorCode} delayed={source.delayed} refreshed={attention.retry}/>)}</Region>}
    {(identity.data||catalog.data)&&<section className="pa-panel dq-region"><h2>Số liệu tham khảo hiện tại</h2><p>Không thuộc hàng chờ hành động; không giới hạn theo kỳ đã chọn.</p><div className="dq-attention">
      {identity.data&&<Stat title="Tài khoản chờ xác minh" value={identity.data.users.pending} to="/admin/users?status=pending_verification"/>}
      {catalog.data?.products&&<Stat title="Sản phẩm bản nháp" value={catalog.data.products.draft} to="/admin/products?status=draft"/>}</div></section>}
  </div>;
}
function SourceHealth({source,updatedAt,errorCode,delayed,refreshed}:{source:string;updatedAt:string|null;errorCode:string|null;delayed:boolean;refreshed:()=>void}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function retry(){setBusy(true);setError('');try{const result=await workQueueApi.retry(source);if(result.sources.some(item=>!item.ok))setError('Nguồn vẫn chưa sẵn sàng.');}catch(cause){setError(cause instanceof Error?cause.message:'Không thể thử lại.');}finally{setBusy(false);refreshed();}}
  return <div className={errorCode||delayed?'pa-warning':'pa-detail-muted'}>{sourceLabels[source]} · {updatedAt?date(updatedAt,true):'Chưa đồng bộ'}
    {(errorCode||delayed)&&<><span> · {errorCode==='NOT_CONFIGURED'?'Chưa cấu hình đồng bộ':errorCode?'Nguồn dữ liệu lỗi':'Dữ liệu đang trễ'}</span><button className="pa-text-link" disabled={busy} onClick={()=>void retry()}>{busy?'Đang thử lại…':'Thử lại nguồn này'}</button></>}{error&&<span role="alert">{error}</span>}</div>;
}
