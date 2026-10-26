import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { platformAdminApi, type AdminPage, type AuditRecord } from '../../api/platformAdminApi';
import { date, formatNumber, StatusBadge } from './AdminUi';

export default function PlatformAudit() {
  const [params,setParams]=useSearchParams();const source=params.get('source')==='catalog'?'catalog':'identity';
  const q=params.get('q')||'',kind=source==='catalog'?params.get('kind')||'':'';
  const rawPage=Number(params.get('page')||1),page=Number.isSafeInteger(rawPage)&&rawPage>0?rawPage:1;
  const [draft,setDraft]=useState(q),[data,setData]=useState<AdminPage<AuditRecord>|null>(null),[error,setError]=useState('');
  const [loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
  useEffect(()=>setDraft(q),[q]);
  useEffect(()=>{let active=true;setLoading(true);setError('');setData(null);
    platformAdminApi.audit(source,{q,kind:kind||undefined,page,limit:12}).then(result=>{if(active)setData(result);})
      .catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Chưa tải được nhật ký.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[source,q,kind,page,revision]);
  function filter(key:string,value:string){const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);if(key!=='page')next.delete('page');if(key==='source')next.delete('kind');setParams(next);}
  function search(event:FormEvent){event.preventDefault();filter('q',draft.trim());}
  return <div className="pa-page"><div className="pa-page-heading"><div><span className="pa-eyebrow">KIỂM SOÁT HOẠT ĐỘNG</span><h1>Nhật ký quản trị</h1><p>Theo dõi ai đã thay đổi trạng thái, thời điểm và lý do thực hiện.</p></div>
    <button className="pa-button pa-button-light" disabled={loading} onClick={()=>setRevision(value=>value+1)}><RefreshCw size={16} className={loading?'animate-spin':''}/>Làm mới</button></div>
    <div className="pa-audit-tabs" aria-label="Nguồn nhật ký"><button className={source==='identity'?'is-active':''} onClick={()=>filter('source','identity')}>Tài khoản</button>
      <button className={source==='catalog'?'is-active':''} onClick={()=>filter('source','catalog')}>Cửa hàng & sản phẩm</button></div>
    <section className="pa-panel"><div className="pa-records-top"><div><h2>Lịch sử thao tác</h2><span className="pa-count-chip">{data?formatNumber(data.total):'—'}</span></div>
      <form className="pa-search" onSubmit={search}><Search size={17}/><input aria-label="Tìm nhật ký" placeholder="Tìm đối tượng hoặc lý do…" maxLength={100} value={draft} onChange={event=>setDraft(event.target.value)}/><button type="submit">Tìm kiếm</button></form></div>
      {source==='catalog'&&<div className="pa-filters"><label><span className="sr-only">Loại đối tượng</span><select value={kind} onChange={event=>filter('kind',event.target.value)}><option value="">Tất cả đối tượng</option><option value="store">Cửa hàng</option><option value="product">Sản phẩm</option></select></label></div>}
      {error&&<p role="alert" className="pa-error pa-record-error">{error}</p>}
      <div className="pa-table-scroll" aria-busy={loading}><table className="pa-table pa-audit-table"><thead><tr><th>Đối tượng / thao tác</th><th>Người thực hiện</th><th>Trạng thái sau</th><th>Lý do</th><th>Thời gian</th></tr></thead><tbody>
        {data?.items.map(row=><tr key={row.id}><td><strong className="pa-row-title">{row.target_name||row.target_id}</strong><small>{row.target_type==='user'?'Tài khoản':row.target_type==='store'?'Cửa hàng':'Sản phẩm'} · {row.action==='suspend'?'Tạm khóa / ẩn':'Khôi phục'}</small></td>
          <td>{row.actor_name||(row.actor_id?`Quản trị viên ${row.actor_id.slice(0,8)}`:'Tài khoản đã xóa')}</td><td><StatusBadge status={row.next_status}/>{row.read_version!=null&&<small>Phiên bản {row.read_version} → {row.result_version}</small>}</td><td className="pa-audit-reason">{row.reason}{row.correlation_id&&<small>Mã yêu cầu: {row.correlation_id}</small>}</td><td>{date(row.created_at,true)}</td></tr>)}
        {!data?.items.length&&<tr><td colSpan={5} className="pa-empty-cell">{loading?'Đang tải nhật ký…':error?'Dữ liệu chưa sẵn sàng.':q||kind?'Không có nhật ký phù hợp.':'Chưa có thao tác quản trị.'}</td></tr>}
      </tbody></table></div>
      <div className="pa-pagination"><span>{data?`${formatNumber(data.total)} hoạt động`:'Chưa tải dữ liệu'}</span><div><button aria-label="Trang trước" disabled={loading||page<=1} onClick={()=>filter('page',String(page-1))}><ChevronLeft size={17}/></button>
        <span>Trang {page} / {Math.max(1,data?.totalPages||1)}</span><button aria-label="Trang sau" disabled={loading||!data||page>=data.totalPages} onClick={()=>filter('page',String(page+1))}><ChevronRight size={17}/></button></div></div>
    </section>
  </div>;
}
