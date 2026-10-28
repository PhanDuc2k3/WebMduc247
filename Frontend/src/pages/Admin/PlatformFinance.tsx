import {Link,useSearchParams} from 'react-router-dom';
import {dashboardFinanceApi} from '../../api/workQueueApi';
import {useDashboardRegion} from './dashboardState';
import {date,money} from './AdminUi';
import {Region} from './PlatformOverview';
export default function PlatformFinance(){
  const [params,setParams]=useSearchParams();const kind=params.get('kind')||'payments',from=params.get('from')||'',to=params.get('to')||'',page=params.get('page')||'1';
  const query={kind,page,...(from||to?{preset:'custom',from,to}:{preset:'7d'})};
  const data=useDashboardRegion(JSON.stringify(query),true,()=>dashboardFinanceApi.entries(query));
  function filter(key:string,value:string){const next=new URLSearchParams(params);next.set(key,value);if(key!=='page')next.delete('page');setParams(next);}
  return <div className="pa-page"><div className="pa-page-heading"><div><h1>Giao dịch thành công</h1><p>Asia/Bangkok · {data.data?.range.from} đến {data.data?.range.to}</p></div></div>
    <div className="pa-panel dq-range"><label>Loại giao dịch<select value={kind} onChange={event=>filter('kind',event.target.value)}><option value="payments">Thanh toán thành công</option><option value="refunds">Hoàn tiền thành công</option></select></label></div>
    <Region title={kind==='refunds'?'Hoàn tiền theo ngày thành công':'Thanh toán theo ngày xác minh'} loading={data.loading} error={data.error} retry={data.retry} updatedAt={data.data?.updatedAt}>
      <p>{kind==='refunds'?'Mỗi khoản hoàn được đếm một lần; không phụ thuộc ngày tạo đơn.':'Gồm các giao dịch thu tiền SUCCEEDED và COD đã xác nhận, kể cả đơn sau đó bị hủy.'}</p>
      <div className="pa-table-scroll"><table className="pa-table"><thead><tr><th>Giao dịch</th><th>Đối tượng</th><th>Nhà cung cấp</th><th>Số tiền</th><th>Thời điểm thành công</th></tr></thead><tbody>
        {data.data?.items.map(row=><tr key={row.id}><td>{row.id}</td><td>{kind==='refunds'?<Link className="pa-text-link" to={`/admin/orders?id=${row.objectId}`}>Đơn #{row.objectId.slice(0,8)}</Link>:`Payment intent ${row.objectId}`}</td><td>{row.provider}</td><td>{money(row.amountMinor)}</td><td>{date(row.occurredAt,true)}</td></tr>)}
        {!data.data?.items.length&&<tr><td colSpan={5}>Không có giao dịch trong kỳ.</td></tr>}</tbody></table></div>
      <div className="pa-pagination"><span>{data.data?.total||0} giao dịch</span><div><button className="pa-button pa-button-light" disabled={Number(page)<=1} onClick={()=>filter('page',String(Number(page)-1))}>Trước</button><span>Trang {page} / {Math.max(1,data.data?.totalPages||1)}</span><button className="pa-button pa-button-light" disabled={!data.data||Number(page)>=data.data.totalPages} onClick={()=>filter('page',String(Number(page)+1))}>Sau</button></div></div>
    </Region></div>;
}
