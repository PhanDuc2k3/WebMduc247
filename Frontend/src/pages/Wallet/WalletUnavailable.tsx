import { Link } from "react-router-dom";
export default function WalletUnavailable() {
  return <div className="mx-auto max-w-2xl py-16"><div className="rounded-2xl border border-[#e6ebf5] bg-white p-8 text-center">
    <h1 className="text-3xl font-extrabold text-[#172a49]">Ví nội bộ chưa khả dụng</h1>
    <p className="mt-4 text-[#70819d]">MDUC247 hiện hỗ trợ COD và các phương thức online được hiển thị khi đã kết nối nhà cung cấp thanh toán. Không có số dư ví nội bộ hoặc chức năng nạp/rút tiền.</p>
    <Link to="/orders" className="mt-6 inline-block font-bold text-[#476de4]">Xem đơn hàng của tôi</Link>
  </div></div>;
}
