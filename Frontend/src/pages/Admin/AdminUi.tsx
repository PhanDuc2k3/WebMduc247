import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export const formatNumber = (value: number | undefined) => value == null ? '—' : value.toLocaleString('vi-VN');
export const money = (value: number | undefined) => value == null ? '—' : `${value.toLocaleString('vi-VN')} ₫`;
export const date = (value: string | undefined, withTime = false) => value ? new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', ...(withTime ? { timeStyle: 'short' as const } : {}), timeZone: 'Asia/Bangkok',
}).format(new Date(value)) : '—';
const statuses: Record<string, [string, string]> = {
  active: ['Đang hoạt động','green'], published: ['Đang bán','green'], pending_verification: ['Chờ xác minh','amber'],
  suspended: ['Sàn tạm khóa','red'], paused: ['Tạm ngừng','amber'], draft: ['Bản nháp','gray'], hidden: ['Đã ẩn','gray'], discontinued: ['Ngừng kinh doanh','gray'],
  PENDING_INVENTORY: ['Đang giữ hàng','amber'], PENDING_PAYMENT: ['Chờ thanh toán','amber'], PLACED: ['Đơn mới','blue'],
  CONFIRMED: ['Đã xác nhận','blue'], PREPARING: ['Đang chuẩn bị','blue'], READY_TO_SHIP: ['Chờ lấy hàng','blue'],
  SHIPPING: ['Đang giao','purple'], DELIVERED: ['Đã giao','green'], COMPLETED: ['Hoàn tất','green'],
  CANCEL_PENDING: ['Đang hủy','amber'], CANCELLED: ['Đã hủy','red'],
  UNPAID:['Chưa thanh toán','amber'],PAID:['Đã thanh toán','green'],FAILED:['Thất bại','red'],REFUNDED:['Đã hoàn tiền','purple'],
  REQUESTED:['Mới tiếp nhận','blue'],UNDER_REVIEW:['Đang xem xét','amber'],APPROVED:['Đã chấp nhận','green'],
  REJECTED:['Đã từ chối','red'],RETURNING:['Đang gửi trả','purple'],RECEIVED:['Đã nhận hàng trả','green'],
  REFUND_PENDING:['Chờ hoàn tiền','amber'],CLOSED:['Đã đóng','gray'],
  NEW:['Mới','blue'],IN_PROGRESS:['Đang xử lý','blue'],WAITING_CUSTOMER:['Chờ khách','amber'],RESOLVED:['Đã giải quyết','green'],
  OPEN:['Mới tiếp nhận','blue'],INVESTIGATING:['Đang xác minh','amber'],AWAITING_DECISION:['Chờ kết luận','purple'],DECIDED:['Đã kết luận','green'],
};
export function StatusBadge({ status }: { status?: string }) {
  const [label, tone] = statuses[status || ''] || [status || 'Chưa có dữ liệu', 'gray'];
  return <span className={`pa-status pa-status-${tone}`}><i />{label}</span>;
}
export function AdminDialog({title,close,busy=false,children}:{title:string;close:()=>void;busy?:boolean;children:ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null),label=useId();
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
  return <dialog ref={ref} className="pa-dialog" aria-labelledby={label} onCancel={event=>{event.preventDefault();if(!busy)close();}}>
    <div className="pa-dialog-title"><h2 id={label}>{title}</h2><button type="button" onClick={close} disabled={busy} aria-label="Đóng hộp thoại"><X size={20}/></button></div>{children}</dialog>;
}
