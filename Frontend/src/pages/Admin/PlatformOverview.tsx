import { useEffect, useState, type ComponentType } from 'react';
import { CalendarDays, CircleAlert, Package, RefreshCw, ShoppingBag, Store, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { platformAdminApi, type RecentOrders, type CatalogSummary, type IdentitySummary, type OrderSummary } from '../../api/platformAdminApi';
import { date, formatNumber, money, StatusBadge } from './AdminUi';

function Stat({ label, value, note, icon: Icon, tone }: { label: string; value?: number; note: string; icon: ComponentType<{ size?: number }>; tone: string }) {
  return <article className={`pa-stat pa-stat-${tone}`}><div><span className="pa-stat-icon"><Icon size={21} /></span></div>
    <span className="pa-stat-label">{label}</span><strong>{formatNumber(value)}</strong><small>{note}</small></article>;
}
export default function PlatformOverview() {
  const [version, setVersion] = useState(0), [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<IdentitySummary | null>(null), [catalog, setCatalog] = useState<CatalogSummary | null>(null);
  const [orders, setOrders] = useState<OrderSummary | null>(null), [recent, setRecent] = useState<RecentOrders | null>(null);
  const [errors, setErrors] = useState<string[]>([]), [updated, setUpdated] = useState('');
  useEffect(() => {
    let active = true; setLoading(true); setErrors([]);
    Promise.allSettled([platformAdminApi.identitySummary(), platformAdminApi.catalogSummary(), platformAdminApi.orderSummary(),
      platformAdminApi.recentOrders()]).then(results => {
      if (!active) return;
      const [identityResult, catalogResult, orderResult, recentResult] = results;
      setIdentity(identityResult.status === 'fulfilled' ? identityResult.value : null);
      setCatalog(catalogResult.status === 'fulfilled' ? catalogResult.value : null);
      setOrders(orderResult.status === 'fulfilled' ? orderResult.value : null);
      setRecent(recentResult.status === 'fulfilled' ? recentResult.value : null);
      const labels = ['người dùng','catalog','thống kê đơn','đơn gần đây'];
      setErrors(results.flatMap((result, index) => result.status === 'rejected' ? [labels[index]] : []));
      setUpdated(new Intl.DateTimeFormat('vi-VN', { timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date()));
      setLoading(false);
    });
    return () => { active = false; };
  }, [version]);
  const distribution = orders ? [{ name: 'Chờ xử lý', value: orders.orders.pending, color: '#5978f4' },
    { name: 'Đã giao / hoàn tất', value: orders.orders.delivered, color: '#27b294' },
    { name: 'Đã hủy', value: orders.orders.cancelled, color: '#ed9b63' },
    { name: 'Đang xử lý khác', value: Math.max(0, orders.orders.total - orders.orders.pending - orders.orders.delivered - orders.orders.cancelled), color: '#a697e6' }] : [];
  return <div className="pa-page"><div className="pa-page-heading"><div><span className="pa-eyebrow">BẢNG ĐIỀU HÀNH</span><h1>Tổng quan sàn</h1><p>Theo dõi hoạt động và nắm bắt những việc cần chú ý.</p></div>
    <div className="pa-heading-actions"><span className="pa-date-label"><CalendarDays size={16} />{date(new Date().toISOString())}</span>
      <button className="pa-button pa-button-light" onClick={() => setVersion(value => value + 1)} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Làm mới</button></div></div>
    {!!errors.length && <div className="pa-warning" role="alert"><CircleAlert size={18} />Chưa tải được dữ liệu {errors.join(', ')}. Bạn có thể bấm Làm mới để thử lại.</div>}
    <section className={`pa-stats ${loading ? 'is-loading' : ''}`} aria-label="Số liệu tổng quan" aria-busy={loading}>
      <Stat label="Người dùng" value={identity?.users.total} note={identity ? `${formatNumber(identity.users.newWeek)} tài khoản mới trong 7 ngày` : 'Đang chờ dữ liệu người dùng'} icon={Users} tone="blue" />
      <Stat label="Cửa hàng" value={catalog?.stores.total} note={catalog ? `${formatNumber(catalog.stores.active)} cửa hàng đang hoạt động` : 'Đang chờ dữ liệu cửa hàng'} icon={Store} tone="green" />
      <Stat label="Sản phẩm" value={catalog?.products.total} note={catalog ? `${formatNumber(catalog.products.active)} sản phẩm đang đăng bán` : 'Đang chờ dữ liệu sản phẩm'} icon={Package} tone="purple" />
      <Stat label="Đơn hàng theo shop" value={orders?.orders.total} note={orders ? `${formatNumber(orders.orders.pending)} đơn cần xử lý` : 'Đang chờ dữ liệu đơn hàng'} icon={ShoppingBag} tone="orange" />
    </section>
    <div className="pa-chart-grid"><section className="pa-panel"><div className="pa-panel-title"><div><h2>Hoạt động đơn hàng</h2><p>Số đơn phát sinh trong 7 ngày gần nhất</p></div><span className="pa-chip">7 ngày gần nhất</span></div>
      <div className="pa-chart">{orders ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={orders.trend} margin={{ top: 15, right: 15, bottom: 0, left: -18 }}>
        <defs><linearGradient id="pa-order-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5d7bf5" stopOpacity={0.24} /><stop offset="100%" stopColor="#5d7bf5" stopOpacity={0.01} /></linearGradient></defs>
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e9edf5" /><XAxis dataKey="date" tickFormatter={value => date(value).split('/').slice(0, 2).join('/')} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8590a3' }} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8590a3' }} /><Tooltip labelFormatter={value => date(String(value))} formatter={value => [formatNumber(Number(value)), 'Đơn hàng']} />
        <Area type="monotone" dataKey="orders" stroke="#5879f5" strokeWidth={2.5} fill="url(#pa-order-gradient)" isAnimationActive={false} /></AreaChart></ResponsiveContainer> : <div className="pa-chart-empty">{loading ? 'Đang tải biểu đồ…' : 'Chưa tải được dữ liệu đơn hàng.'}</div>}</div>
      <div className="pa-chart-foot"><span><i />Đơn hàng theo shop</span><small>{updated ? `Cập nhật lúc ${updated}` : 'Đang đồng bộ số liệu'}</small></div></section>
      <section className="pa-panel"><div className="pa-panel-title"><div><h2>Trạng thái đơn hàng</h2><p>Phân bố trên toàn sàn</p></div></div>
        {orders && orders.orders.total > 0 ? <><div className="pa-donut"><ResponsiveContainer width="100%" height={180}><PieChart><Pie data={distribution} dataKey="value" innerRadius={59} outerRadius={79} paddingAngle={3} stroke="none" isAnimationActive={false}>
          {distribution.map(item => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={value => formatNumber(Number(value))} /></PieChart></ResponsiveContainer><div><strong>{formatNumber(orders.orders.total)}</strong><small>tổng đơn</small></div></div>
          <div className="pa-legend">{distribution.map(item => <div key={item.name}><span><i style={{ background: item.color }} />{item.name}</span><strong>{formatNumber(item.value)}</strong></div>)}</div></> :
          <div className="pa-chart-empty">{loading ? 'Đang tải trạng thái…' : orders ? 'Chưa có đơn hàng phát sinh.' : 'Chưa tải được dữ liệu.'}</div>}</section></div>
    <div className="pa-bottom-grid"><section className="pa-panel"><div className="pa-panel-title"><div><h2>Đơn hàng gần đây</h2><p>Các giao dịch mới nhất trên sàn</p></div><span className="pa-chip">5 đơn mới nhất</span></div>
      <div className="pa-table-scroll"><table className="pa-table"><thead><tr><th>Mã đơn / cửa hàng</th><th>Tổng giá trị</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>
        {recent?.items.map(row => <tr key={row.id}><td><span className="pa-row-title">#{row.id.slice(0, 8).toUpperCase()}</span><small>{row.storeName}</small></td><td className="pa-table-money">{money(row.totalMinor)}</td><td><StatusBadge status={row.status} /></td><td>{date(row.createdAt)}</td></tr>)}
        {!recent?.items.length && <tr><td colSpan={4} className="pa-empty-cell">{loading ? 'Đang tải đơn hàng…' : recent ? 'Chưa có đơn hàng.' : 'Chưa tải được danh sách đơn.'}</td></tr>}
      </tbody></table></div></section>
      <section className="pa-panel pa-attention"><div className="pa-panel-title"><div><h2>Cần chú ý</h2><p>Những mục cần theo dõi</p></div><CircleAlert size={19} /></div>
        {[{ label: 'Tài khoản chờ xác minh', count: identity?.users.pending, tone: 'blue', icon: Users },
          { label: 'Sản phẩm bản nháp', count: catalog?.products.draft, tone: 'purple', icon: Package },
          { label: 'Cửa hàng tạm ngừng', count: catalog?.stores.paused, tone: 'orange', icon: Store }].map(({ label, count, tone, icon: Icon }) =>
            <div key={label} className={`pa-attention-item pa-stat-${tone}`}><span className="pa-stat-icon"><Icon size={18} /></span><span>{label}</span><strong>{formatNumber(count)}</strong></div>)}
        <div className="pa-value-note"><span>Giá trị đơn chưa hủy</span><strong>{money(orders?.orders.orderValueMinor)}</strong><small>Tổng giá trị đặt hàng, chưa phải doanh thu đã thu.</small></div>
      </section></div>
  </div>;
}
