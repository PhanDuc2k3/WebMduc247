import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, CreditCard, MapPin, MessageCircle, Package, Printer, Truck } from "lucide-react";
import "./DemoOrderDetail.css";
import { showImageFallback } from "../../utils/imageFallback";

const money = (amount: number) => `${amount.toLocaleString("vi-VN")}₫`;

const products = [
  { name: "Tai nghe Bluetooth Pro X", variant: "Trắng ngọc", price: 1290000, image: "https://images.pexels.com/photos/8858287/pexels-photo-8858287.jpeg?auto=compress&cs=tinysrgb&w=240" },
  { name: "Bàn phím cơ RGB", variant: "Đen", price: 890000, image: "https://images.pexels.com/photos/17895080/pexels-photo-17895080.jpeg?auto=compress&cs=tinysrgb&w=240" },
  { name: "Đèn bàn thông minh", variant: "Trắng", price: 590000, image: "https://images.pexels.com/photos/7439754/pexels-photo-7439754.jpeg?auto=compress&cs=tinysrgb&w=240" },
  { name: "Balo laptop chống nước", variant: "Xanh navy", price: 720000, image: "https://images.pexels.com/photos/15059375/pexels-photo-15059375.jpeg?auto=compress&cs=tinysrgb&w=240" },
];

const progress = [
  { label: "Đã đặt hàng", date: "12/10 · 08:30" },
  { label: "Đã xác nhận", date: "12/10 · 09:15" },
  { label: "Đang chuẩn bị", date: "12/10 · 14:00" },
  { label: "Đang giao", date: "13/10 · 09:20" },
  { label: "Đã giao", date: "Dự kiến 15–16/10" },
];

export default function DemoOrderDetail() {
  const navigate = useNavigate();
  const [showCancelInfo, setShowCancelInfo] = useState(false);

  return (
    <div className="demo-order-page">
      <div className="demo-order-shell">
        <nav className="demo-order-breadcrumb" aria-label="Đường dẫn trang">
          <Link to="/">Trang chủ</Link><span>/</span><Link to="/profile">Đơn hàng của tôi</Link><span>/</span><strong>Chi tiết đơn hàng</strong>
        </nav>

        <section className="demo-order-card demo-order-carrier">
          <div className="demo-order-carrier-main"><div className="demo-order-icon"><Truck size={23} /></div><div><div className="demo-order-context"><strong>Mã đơn #MD247-1024</strong><span>Ngày đặt: 12/10/2026</span><em>Đang giao</em></div><h2>J&amp;T Express</h2><p>Mã vận đơn: JTMD2471024</p><p>Dự kiến nhận hàng: 15–16/10/2026</p><small>Đơn hàng minh họa · Không có giao dịch hoặc vận chuyển thực tế.</small></div></div>
          <a className="demo-order-soft-button" href="#hanh-trinh">Theo dõi đơn hàng</a>
        </section>

        <section className="demo-order-card demo-order-progress" id="hanh-trinh"><h2>Hành trình đơn hàng</h2><p className="demo-order-scroll-hint">Vuốt ngang để xem toàn bộ hành trình.</p><ol>{progress.map((step, index) => <li className={index === 3 ? "current" : index === 4 ? "upcoming" : "complete"} key={step.label}><span className="demo-order-step-icon">{index < 3 ? <Check size={17} /> : index === 3 ? <Truck size={17} /> : <Package size={17} />}</span><strong>{step.label}</strong><small>{step.date}</small></li>)}</ol></section>

        <div className="demo-order-columns">
          <div className="demo-order-main-column">
            <section className="demo-order-card demo-order-products"><div className="demo-order-section-title"><h2>Sản phẩm trong đơn</h2><span>4 sản phẩm</span></div><div>{products.map((product) => <article key={product.name}><img src={product.image} alt={product.name} onError={showImageFallback} /><div className="demo-order-product-copy"><h3>{product.name}</h3><p>{product.variant} · Số lượng: 1</p><small>Đơn giá: {money(product.price)}</small></div><div className="demo-order-product-action"><strong>{money(product.price)}</strong><button type="button" onClick={() => navigate(`/products?search=${encodeURIComponent(product.name)}`)}>Tìm sản phẩm</button></div></article>)}</div></section>

            <section className="demo-order-card demo-order-address"><h2>Địa chỉ nhận hàng</h2><div><MapPin size={21} /><p><strong>Nguyễn Minh Đức · 09•• ••• 247</strong><span>Số 24 đường Nguyễn Văn Cừ, Phường Gia Thụy, Hà Nội. Địa chỉ minh họa.</span></p></div></section>

            <section className="demo-order-card demo-order-payment"><h2>Thông tin thanh toán</h2><p className="demo-order-method">Phương thức: Ví MDUC247</p><dl><div><dt>Tạm tính</dt><dd>{money(3490000)}</dd></div><div><dt>Phí vận chuyển</dt><dd>{money(30000)}</dd></div><div><dt>Giảm giá</dt><dd className="discount">−{money(200000)}</dd></div><div><dt>Điểm thưởng</dt><dd className="discount">−{money(20000)}</dd></div><div className="total"><dt>Tổng cộng</dt><dd>{money(3300000)}</dd></div></dl><p className="demo-order-paid">✓ Đã thanh toán qua Ví MDUC247 (minh họa)</p></section>
          </div>

          <aside className="demo-order-side-column"><section className="demo-order-card demo-order-summary"><h2>Tóm tắt đơn hàng</h2><dl><div><dt>Tổng số sản phẩm</dt><dd>4</dd></div><div><dt>Thanh toán</dt><dd>Ví MDUC247</dd></div><div className="total"><dt>Tổng tiền</dt><dd>{money(3300000)}</dd></div></dl><button type="button" onClick={() => window.print()}>In chi tiết đơn mẫu</button></section>
            <section className="demo-order-card demo-order-seller"><h2>Thông tin người bán</h2><div className="demo-order-seller-identity"><span>TZ</span><p><strong>TechZone Official</strong><small>Gian hàng minh họa</small></p></div><p className="demo-order-rating">★ 4,8/5 · 1.248 đánh giá mẫu</p><Link className="primary" to="/messages">Xem tin nhắn mẫu</Link><Link to="/store">Khám phá cửa hàng</Link></section>
          </aside>
        </div>

        <section className="demo-order-card demo-order-help"><h2>Bạn cần hỗ trợ thêm?</h2><div><Link to="/messages"><MessageCircle size={16} /> Xem tin nhắn mẫu</Link><button type="button" onClick={() => window.print()}><Printer size={16} /> In chi tiết</button><Link className="primary" to="/products">Tiếp tục mua sắm</Link><button type="button" className="danger" onClick={() => setShowCancelInfo(!showCancelInfo)}>Hủy đơn mẫu</button></div>{showCancelInfo && <p className="demo-order-notice"><CreditCard size={16} /> Đây là đơn hàng minh họa, không có giao dịch thực tế để hủy.</p>}</section>
      </div>
    </div>
  );
}
