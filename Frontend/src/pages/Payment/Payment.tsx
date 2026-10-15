import { useEffect, useState } from "react";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import Address from "../../components/Payment/Adress/Address";
import Delivery from "../../components/Payment/Delivery/Delivery";
import OrderSummary from "../../components/Payment/OrderSummary/OrderSummary";
import PaymentMethod from "../../components/Payment/Payment/Payment";
import Product from "../../components/Payment/Product/Product";
import VoucherBox from "../../components/Payment/VoucherBox/VoucherBox";
import VoucherPopup from "../../components/Payment/VoucherBox/VoucherPopup";
import cartApi from "../../api/cartApi";
import type { AvailableVoucher } from "../../api/voucherApi";
import "./Payment.css";
import { USE_MOCK_DATA } from "../../config/runtime";

interface CheckoutItem {
  _id: string;
  name: string;
  imageUrl: string;
  price: number;
  salePrice?: number;
  quantity: number;
  subtotal: number;
  variation?: { color?: string; size?: string; additionalPrice?: number };
}

const CheckoutPage = () => {
  const [shippingFee, setShippingFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "momo" | "vietqr" | "wallet">("wallet");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<CheckoutItem[]>([]);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [selectedItemsIds, setSelectedItemsIds] = useState<string[]>([]);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [shippingDiscount, setShippingDiscount] = useState(0);
  const [productVoucherCode, setProductVoucherCode] = useState<string | null>(null);
  const [freeshipVoucherCode, setFreeshipVoucherCode] = useState<string | null>(null);
  const [isVoucherPopupOpen, setIsVoucherPopupOpen] = useState(false);
  const [selectedSystemVoucher, setSelectedSystemVoucher] = useState<AvailableVoucher | null>(null);
  const [selectedFreeshipVoucher, setSelectedFreeshipVoucher] = useState<AvailableVoucher | null>(null);
  const [selectedStoreVoucher, setSelectedStoreVoucher] = useState<AvailableVoucher | null>(null);
  const [sellerNote, setSellerNote] = useState("");
  const [invoiceRequested, setInvoiceRequested] = useState(false);

  useEffect(() => {
    const loadCheckoutItems = async () => {
      try {
        const saved = localStorage.getItem("checkoutItems");
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed) || parsed.length === 0) return;
        if (typeof parsed[0] === "string") {
          setSelectedItemsIds(parsed);
          const { data } = await cartApi.getCart();
          const filtered = ((data.items || []) as CheckoutItem[]).filter((item) => parsed.includes(item._id));
          setSelectedProducts(filtered);
          setCartSubtotal(filtered.reduce((sum, item) => sum + (item.subtotal || 0), 0));
        } else {
          const products = parsed as CheckoutItem[];
          setSelectedProducts(products);
          setSelectedItemsIds(products.map((item) => item._id));
          setCartSubtotal(products.reduce((sum, item) => sum + (item.subtotal || 0), 0));
        }
      } catch {
        toast.error("Không thể tải thông tin đơn hàng.", { containerId: "general-toast" });
      }
    };
    void loadCheckoutItems();
  }, []);

  useEffect(() => {
    let productDiscount = 0;
    let freeshipDiscount = 0;
    let productCode: string | null = null;
    let freeshipCode: string | null = null;
    const vouchers = [selectedSystemVoucher, selectedFreeshipVoucher, selectedStoreVoucher].filter(Boolean) as AvailableVoucher[];
    vouchers.forEach((voucher) => {
      if (voucher.voucherType === "product") {
        productDiscount += voucher.discount;
        productCode ||= voucher.code;
      } else {
        const amount = voucher.discountType === "fixed"
          ? voucher.discountValue
          : Math.min((shippingFee * voucher.discountValue) / 100, voucher.maxDiscount || shippingFee);
        freeshipDiscount += Math.min(amount, shippingFee);
        freeshipCode ||= voucher.code;
      }
    });
    setVoucherDiscount(productDiscount);
    setShippingDiscount(Math.min(freeshipDiscount, shippingFee));
    setProductVoucherCode(productCode);
    setFreeshipVoucherCode(freeshipCode);
  }, [selectedSystemVoucher, selectedFreeshipVoucher, selectedStoreVoucher, shippingFee]);

  return (
    <div className="checkout-page">
      <div className="checkout-breadcrumb"><Link to="/">Trang chủ</Link><ChevronRight /><Link to="/cart">Giỏ hàng</Link><ChevronRight /><strong>Thanh toán</strong></div>

      <div className="checkout-layout">
        <main className="checkout-main">
          <Address onSelect={setSelectedAddressId} />
          <Product selectedItems={selectedProducts} />
          <Delivery onChange={setShippingFee} subtotal={cartSubtotal} />
          <PaymentMethod onChange={setPaymentMethod} />
          <VoucherBox
            subtotal={cartSubtotal}
            shippingFee={shippingFee}
            selectedItems={selectedItemsIds}
            onOpenPopup={() => setIsVoucherPopupOpen(true)}
            selectedSystemVoucher={selectedSystemVoucher}
            selectedFreeshipVoucher={selectedFreeshipVoucher}
            selectedStoreVoucher={selectedStoreVoucher}
            onRemoveSystemVoucher={() => setSelectedSystemVoucher(null)}
            onRemoveFreeshipVoucher={() => setSelectedFreeshipVoucher(null)}
            onRemoveStoreVoucher={() => setSelectedStoreVoucher(null)}
          />
          <section className="checkout-card checkout-note">
            <h2>Ghi chú cho người bán</h2>
            <label>Lời nhắn giao hàng<textarea value={sellerNote} onChange={(event) => setSellerNote(event.target.value)} placeholder="Ví dụ: Giao hàng vào giờ hành chính..." /></label>
            <label className="checkout-check"><input type="checkbox" checked={invoiceRequested} onChange={(event) => setInvoiceRequested(event.target.checked)} /> Yêu cầu xuất hóa đơn điện tử mẫu</label>
          </section>
          {USE_MOCK_DATA && <p className="checkout-preview-states">Đây là dữ liệu minh họa. Hãy kiểm tra thông tin trước khi xác nhận.</p>}
        </main>

        <aside className="checkout-aside">
          <OrderSummary
            shippingFee={shippingFee}
            paymentMethod={paymentMethod}
            addressId={selectedAddressId}
            discount={voucherDiscount}
            shippingDiscount={shippingDiscount}
            productVoucherCode={productVoucherCode}
            freeshipVoucherCode={freeshipVoucherCode}
            selectedProducts={selectedProducts}
          />
        </aside>
      </div>

      <footer className="checkout-footer"><ShieldCheck /> MDUC247 · Giao dịch được bảo vệ và mã hóa an toàn.</footer>
      <VoucherPopup
        isOpen={isVoucherPopupOpen}
        onClose={() => setIsVoucherPopupOpen(false)}
        subtotal={cartSubtotal}
        shippingFee={shippingFee}
        selectedItems={selectedItemsIds}
        selectedSystemVoucher={selectedSystemVoucher}
        selectedFreeshipVoucher={selectedFreeshipVoucher}
        selectedStoreVoucher={selectedStoreVoucher}
        onSelectSystem={setSelectedSystemVoucher}
        onSelectFreeship={setSelectedFreeshipVoucher}
        onSelectStore={setSelectedStoreVoucher}
      />
    </div>
  );
};

export default CheckoutPage;
