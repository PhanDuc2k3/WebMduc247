import { useEffect, useState } from "react";
import walletApi from "../../../api/walletApi";

type Method = "cod" | "momo" | "vietqr" | "wallet";

const Payment = ({ onChange }: { onChange?: (method: Method) => void }) => {
  const [selected, setSelected] = useState<Method>("wallet");
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => { walletApi.getWallet().then((response) => setBalance(response.data.wallet?.balance ?? 0)).catch(() => setBalance(null)); }, []);
  const methods: { id: Method; label: string; description: string }[] = [
    { id: "wallet", label: "Ví MDUC247", description: balance === null ? "Thanh toán bằng số dư ví" : `Số dư: ${balance.toLocaleString("vi-VN")}₫` },
    { id: "vietqr", label: "Thẻ ngân hàng / VietQR", description: "Quét QR bằng ứng dụng ngân hàng" },
    { id: "momo", label: "Ví điện tử MoMo", description: "Thanh toán qua cổng MoMo" },
    { id: "cod", label: "Thanh toán khi nhận hàng", description: "Trả tiền khi nhận hàng" },
  ];
  return <section className="checkout-card checkout-options checkout-payment-methods"><h2>Phương thức thanh toán</h2><div>{methods.map((method) => <label className={selected === method.id ? "is-selected" : ""} key={method.id}><input type="radio" name="payment" checked={selected === method.id} onChange={() => { setSelected(method.id); onChange?.(method.id); }} /><span><strong>{method.label}</strong><small>{method.description}</small></span></label>)}</div><button type="button" className="checkout-link-button">+ Thêm phương thức thanh toán</button><p className="checkout-security">Bảo mật thanh toán · Thông tin được mã hóa trong quá trình xử lý</p></section>;
};

export default Payment;
