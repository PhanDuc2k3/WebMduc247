import {useEffect,useState} from 'react';
import {adminCaseApi} from '../../api/adminCaseApi';
import {platformAdminApi} from '../../api/platformAdminApi';

export default function CaseQueueFilters({reasonCode,storeId,assigneeId,due,onFilter}:{reasonCode:string;storeId:string;assigneeId:string;due:string;onFilter:(key:string,value:string)=>void}){
  const [staff,setStaff]=useState<{id:string;name:string}[]>([]),[stores,setStores]=useState<{id:string;name?:string}[]>([]),[search,setSearch]=useState(''),[error,setError]=useState('');
  useEffect(()=>{let active=true;adminCaseApi.staff().then(data=>{if(active)setStaff(data.items);}).catch(()=>{if(active)setError('Chưa tải được danh sách nhân viên.');});return()=>{active=false;};},[]);
  useEffect(()=>{let active=true;const timer=setTimeout(()=>{platformAdminApi.list('stores',{q:search,limit:50}).then(data=>{if(active)setStores(data.items);}).catch(()=>{if(active)setError('Chưa tải được danh sách cửa hàng.');});},250);return()=>{active=false;clearTimeout(timer);};},[search]);
  return <><label>Lý do<select value={reasonCode} onChange={event=>onFilter('reasonCode',event.target.value)}><option value="">Tất cả lý do</option><option value="DAMAGED">Hàng hỏng</option><option value="WRONG_ITEM">Giao sai hàng</option><option value="NOT_AS_DESCRIBED">Không đúng mô tả</option><option value="PAYMENT">Thanh toán</option><option value="SERVICE">Dịch vụ</option><option value="OTHER">Khác</option></select></label>
    <label>Tìm cửa hàng<input aria-label="Tìm cửa hàng để lọc" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Nhập tên cửa hàng…"/></label>
    <label>Cửa hàng<select value={storeId} onChange={event=>onFilter('storeId',event.target.value)}><option value="">Tất cả cửa hàng</option>{stores.map(store=><option key={store.id} value={store.id}>{store.name}</option>)}{storeId&&!stores.some(store=>store.id===storeId)&&<option value={storeId}>Cửa hàng đã chọn</option>}</select></label>
    <label>Người phụ trách<select value={assigneeId} onChange={event=>onFilter('assigneeId',event.target.value)}><option value="">Tất cả</option><option value="me">Việc của tôi</option><option value="unassigned">Chưa phân công</option>{staff.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Hạn xử lý<select value={due} onChange={event=>onFilter('due',event.target.value)}><option value="">Tất cả</option><option value="overdue">Đã quá hạn</option><option value="upcoming">Chưa quá hạn</option></select></label>{error&&<p className="pa-detail-muted">{error}</p>}</>;
}
