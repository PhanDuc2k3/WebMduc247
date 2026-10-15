import { Boxes, Facebook, Instagram, Mail, MapPin, Phone, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { SITE_CONTENT } from "../../config/siteContent";

const customerLinks = [
  ["Trung tâm trợ giúp", "/support"],
  ["Theo dõi đơn hàng", "/profile"],
  ["Voucher của bạn", "/voucher"],
  ["Ví MDUC247", "/wallet"],
];

const aboutLinks = [
  ["Cửa hàng", "/store"],
  ["Khuyến mãi", "/new"],
  ["Điều khoản", "/terms"],
  ["Chính sách bảo mật", "/privacy"],
];

const Footer = () => (
  <footer className="mt-auto bg-[#172b49] text-white">
    <div className="site-shell grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
      <section>
        <Link to="/" className="mb-5 inline-flex items-center gap-3 text-white no-underline">
          <span className="grid h-10 w-10 -rotate-6 place-items-center rounded-xl bg-[#476de4]"><Boxes size={21} /></span>
          <strong className="text-xl tracking-tight">MDUC247</strong>
        </Link>
        <p className="text-sm leading-7 text-[#c4d0e1]">Không gian mua sắm trực quan, thân thiện và kết nối bạn với những cửa hàng phù hợp mỗi ngày.</p>
        <div className="mt-5 flex gap-2">
          {[Facebook, Instagram, Youtube].map((Icon, index) => <a href="#" aria-label={["Facebook", "Instagram", "YouTube"][index]} key={index} className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 text-[#c4d0e1] hover:border-white/35 hover:bg-white/10 hover:text-white"><Icon size={17} /></a>)}
        </div>
      </section>

      <section><h2 className="mb-4 text-base font-bold">Hỗ trợ khách hàng</h2><ul className="space-y-3 text-sm text-[#c4d0e1]">{customerLinks.map(([label, to]) => <li key={to}><Link to={to} className="hover:text-white">{label}</Link></li>)}</ul></section>
      <section><h2 className="mb-4 text-base font-bold">Khám phá MDUC247</h2><ul className="space-y-3 text-sm text-[#c4d0e1]">{aboutLinks.map(([label, to]) => <li key={to}><Link to={to} className="hover:text-white">{label}</Link></li>)}</ul></section>
      <section>
        <h2 className="mb-4 text-base font-bold">Liên hệ</h2>
        <ul className="space-y-4 text-sm text-[#c4d0e1]">
          <li className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#8fa5ff]" /><a href={`tel:${SITE_CONTENT.supportPhone.replace(/\s/g, "")}`} className="hover:text-white">{SITE_CONTENT.supportPhone}</a></li>
          <li className="flex gap-3"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#8fa5ff]" /><a href={`mailto:${SITE_CONTENT.supportEmail}`} className="hover:text-white">{SITE_CONTENT.supportEmail}</a></li>
          <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8fa5ff]" /><span>{SITE_CONTENT.supportAddress}</span></li>
        </ul>
      </section>
    </div>
    <div className="border-t border-white/10"><div className="site-shell flex flex-col justify-between gap-3 py-5 text-xs text-[#aebbd0] sm:flex-row"><span>© 2026 MDUC247. Tất cả quyền được bảo lưu.</span><span>Thanh toán an toàn · Giao hàng thuận tiện · Hỗ trợ tận tâm</span></div></div>
  </footer>
);

export default Footer;
