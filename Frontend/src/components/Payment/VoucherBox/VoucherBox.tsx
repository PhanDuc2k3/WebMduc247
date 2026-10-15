import type { AvailableVoucher } from "../../../api/voucherApi";

interface Props {
  subtotal: number;
  shippingFee: number;
  selectedItems?: string[];
  onOpenPopup: () => void;
  selectedSystemVoucher: AvailableVoucher | null;
  selectedFreeshipVoucher: AvailableVoucher | null;
  selectedStoreVoucher: AvailableVoucher | null;
  onRemoveSystemVoucher: () => void;
  onRemoveFreeshipVoucher: () => void;
  onRemoveStoreVoucher: () => void;
}

const VoucherBox = ({ onOpenPopup, selectedSystemVoucher, selectedFreeshipVoucher, selectedStoreVoucher, onRemoveSystemVoucher, onRemoveFreeshipVoucher, onRemoveStoreVoucher }: Props) => {
  const selected = [
    [selectedSystemVoucher, onRemoveSystemVoucher],
    [selectedFreeshipVoucher, onRemoveFreeshipVoucher],
    [selectedStoreVoucher, onRemoveStoreVoucher],
  ] as const;
  return <section className="checkout-card checkout-vouchers"><h2>Mã giảm giá và ưu đãi</h2><div className="checkout-voucher-input"><input readOnly placeholder="Chọn hoặc nhập mã giảm giá" onClick={onOpenPopup} /><button type="button" onClick={onOpenPopup}>Áp dụng</button></div><div className="checkout-voucher-tags">{selected.map(([voucher, remove]) => voucher && <span key={voucher.code}>{voucher.code} · {voucher.title}<button type="button" onClick={remove}>×</button></span>)}</div>{!selected.some(([voucher]) => voucher) && <button type="button" className="checkout-link-button" onClick={onOpenPopup}>Xem voucher khả dụng</button>}</section>;
};

export default VoucherBox;
