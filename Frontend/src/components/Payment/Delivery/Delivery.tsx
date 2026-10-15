import { useEffect, useState } from "react";

const options = [
  { id: "standard", label: "Tiêu chuẩn", description: "Nhận dự kiến trong 3–5 ngày · Miễn phí từ 499.000₫", fee: 30000 },
  { id: "express", label: "Nhanh", description: "Nhận dự kiến trong 1–2 ngày", fee: 49000 },
  { id: "same-day", label: "Siêu tốc", description: "Nhận trong ngày (tùy khu vực)", fee: 65000 },
] as const;

const calculateFee = (subtotal: number, fee: number, id: string) =>
  subtotal === 0 || (id === "standard" && subtotal >= 499000) ? 0 : fee;

const Delivery = ({ onChange, subtotal }: { onChange: (fee: number) => void; subtotal: number }) => {
  const [selected, setSelected] = useState("standard");
  useEffect(() => {
    const option = options.find((item) => item.id === selected) || options[0];
    onChange(calculateFee(subtotal, option.fee, option.id));
  }, [selected, subtotal, onChange]);
  return <section className="checkout-card checkout-options"><h2>Phương thức vận chuyển</h2><div>{options.map((option) => <label className={selected === option.id ? "is-selected" : ""} key={option.id}><input type="radio" name="delivery" checked={selected === option.id} onChange={() => setSelected(option.id)} /><span><strong>{option.label}</strong><small>{option.description}</small></span><b>{calculateFee(subtotal, option.fee, option.id) ? `${calculateFee(subtotal, option.fee, option.id).toLocaleString("vi-VN")}₫` : "Miễn phí"}</b></label>)}</div></section>;
};

export default Delivery;
