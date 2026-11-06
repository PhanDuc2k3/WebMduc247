import {Link} from 'react-router-dom';
import {identityAuthorizedRequest} from '../../api/identityApi';
import {workQueueApi} from '../../api/workQueueApi';
import {useDashboardRegion} from './dashboardState';
import {Region} from './PlatformOverview';
import {useAdminSession} from './AdminSession';
import {hasAdminPermission} from './adminPolicy';
type Setup={roles:{role:string;members:number}[];teams:{id:string;name:string;members:number}[];guidance:string;canManageStaff:boolean};
export default function AdminSetup(){
  const actor=useAdminSession(),queueAllowed=['orders.read','cases.read','returns.read','refunds.read','moderation.read'].some(p=>hasAdminPermission(actor,p));
  const setup=useDashboardRegion('admin-setup',true,()=>identityAuthorizedRequest<Setup>('/admin/setup'));
  const health=useDashboardRegion('admin-queue-health',queueAllowed,()=>workQueueApi.attention());
  const settings=useDashboardRegion('admin-queue-settings',queueAllowed,()=>workQueueApi.settings());
  return <div className="pa-page"><div className="pa-page-heading"><div><h1>Thiết lập vận hành</h1><p>Kiểm tra quyền, nhóm phụ trách và kết nối nguồn trước khi nhận công việc.</p></div></div>
    <Region title="Vai trò và nhóm ghi chú" loading={setup.loading} error={setup.error} retry={setup.retry}>
      <p>{setup.data?.guidance}</p><div className="pa-table-scroll"><table className="pa-table"><thead><tr><th>Vai trò</th><th>Số người được gán</th></tr></thead><tbody>{setup.data?.roles.map(r=><tr key={r.role}><td>{r.role}</td><td>{r.members}</td></tr>)}</tbody></table></div>
      <p><Link to="/admin/staff-access">Mở nhân sự & quyền</Link></p>{setup.data&&!setup.data.canManageStaff&&<p className="pa-warning">Phiên hiện tại chỉ xem được quyền. Cần quản trị viên có quyền cấp vai trò hoặc operator khởi tạo được ủy quyền.</p>}
      <h3>Nhóm ghi chú</h3>{setup.data?.teams.map(t=><p key={t.id}>{t.name}: {t.members} thành viên {t.members===0&&'· Chưa cấu hình'}</p>)}
      {hasAdminPermission(actor,'users.notes.manage')&&<Link to="/admin/user-workflows">Cấu hình thành viên và phân công nhóm ghi chú</Link>}
    </Region>
    {queueAllowed&&<><Region title="Nguồn hàng chờ" loading={health.loading} error={health.error} retry={health.retry}>{health.data?.health.map(h=><p key={h.source}>{h.source}: {h.errorCode||(!h.updatedAt?'Chưa đồng bộ':h.delayed?'Dữ liệu chậm':'Đang kết nối')}</p>)}<Link to="/admin/work-queue">Mở hàng chờ để thử lại nguồn</Link></Region>
      <Region title="Nhóm nhận việc" loading={settings.loading} error={settings.error} retry={settings.retry}>{settings.data?.teams.map(t=><p key={t.id}>{t.name}: {t.leader_id?'Đã có trưởng nhóm':'Chưa có trưởng nhóm'}</p>)}<Link to="/admin/work-queue">Cấu hình SLA và trưởng nhóm</Link></Region></>}
    <section className="pa-panel pa-detail"><h2>Kiểm tra trước vận hành</h2><p>Nhân sự cần đăng nhập MFA, có vai trò/phạm vi phù hợp và được phân nhóm. Nguồn Payment/Chat dùng cùng khóa nội bộ ADMIN_AUTHORIZATION_TOKEN; không nhập khóa đó vào trình duyệt.</p><p>Thanh toán, hoàn tiền và kết luận báo cáo có lịch sử riêng trong hồ sơ. Kiểm tra kết quả nguồn sau thao tác; yêu cầu kiểm tra lại không phải xác nhận giao dịch đã hoàn tất.</p><Link to="/admin/security">Kiểm tra bảo mật và phiên của tôi</Link></section>
  </div>;
}
