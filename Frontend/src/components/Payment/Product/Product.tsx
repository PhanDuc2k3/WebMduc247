import { Package, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

interface CartItem {
  _id: string;
  name: string;
  imageUrl: string;
  price: number;
  salePrice?: number;
  quantity: number;
  subtotal: number;
  variation?: { color?: string; size?: string; additionalPrice?: number };
}

const Product = ({ selectedItems }: { selectedItems: CartItem[] }) => {
  const items = Array.isArray(selectedItems) ? selectedItems : [];
  return (
    <section className="checkout-card checkout-products">
      <h2><Package /> Sản phẩm trong đơn</h2>
      {items.length === 0 ? <div className="checkout-empty"><ShoppingCart /> Chưa có sản phẩm nào được chọn.</div> : (
        <div className="checkout-product-list">
          {items.map((item) => {
            const unitPrice = (item.salePrice ?? item.price ?? 0) + (item.variation?.additionalPrice || 0);
            const image = item.imageUrl?.startsWith("http") ? item.imageUrl : `${import.meta.env.VITE_API_URL || ""}${item.imageUrl || "/image.png"}`;
            return <article key={item._id}>
              <img src={image} alt={item.name} />
              <div><strong>{item.name}</strong><span>{[item.variation?.color, item.variation?.size].filter(Boolean).join(" · ") || "Phân loại tiêu chuẩn"}</span><small>Đơn giá: {unitPrice.toLocaleString("vi-VN")}₫</small></div>
              <p><span>SL: {item.quantity}</span><strong>{(item.subtotal || unitPrice * item.quantity).toLocaleString("vi-VN")}₫</strong></p>
            </article>;
          })}
        </div>
      )}
      <Link className="checkout-back-cart" to="/cart">← Quay lại giỏ hàng</Link>
    </section>
  );
};

export default Product;
