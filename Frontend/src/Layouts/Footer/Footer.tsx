import React from "react";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-white shadow-[0_-2px_8px_rgba(127,90,240,0.08)] pt-12">
      {/* Top */}
      <div className="flex flex-wrap justify-between gap-8 px-8 pb-6 border-b border-gray-200">
        {/* Brand */}
        <div className="flex-1.2 min-w-[250px]">
          <span className="bg-gradient-to-r from-[#3a5ef7] to-[#a259f7] text-white text-lg font-bold rounded-lg px-6 py-1 inline-block mb-3">
            ShopMduc247
          </span>
          <p className="text-gray-900 text-base mb-3">
            Sàn thương mại điện tử hàng đầu Việt Nam với hàng triệu sản phẩm chất lượng và dịch vụ tốt nhất.
          </p>
          <div className="flex gap-3 mt-2 text-purple-700 text-xl">
            <a href="#" aria-label="Facebook"><Facebook /></a>
            <a href="#" aria-label="Instagram"><Instagram /></a>
            <a href="#" aria-label="Twitter"><Twitter /></a>
            <a href="#" aria-label="YouTube"><Youtube /></a>
          </div>
        </div>

        {/* Footer columns */}
        <div className="flex-1 min-w-[150px]">
          <h4 className="text-gray-900 font-semibold text-lg mb-2">Chăm sóc khách hàng</h4>
          <ul className="space-y-1 text-gray-900 text-sm">
            <li>Trung tâm trợ giúp</li>
            <li>Hướng dẫn mua hàng</li>
            <li>Hướng dẫn bán hàng</li>
            <li>Thanh toán</li>
            <li>Vận chuyển</li>
            <li>Trả hàng & Hoàn tiền</li>
          </ul>
        </div>

        <div className="flex-1 min-w-[150px]">
          <h4 className="text-gray-900 font-semibold text-lg mb-2">Về ShopMduc247</h4>
          <ul className="space-y-1 text-gray-900 text-sm">
            <li>Giới thiệu</li>
            <li>Tuyển dụng</li>
            <li>Điều khoản</li>
            <li>Chính sách bảo mật</li>
            <li>Chính hãng</li>
            <li>Kênh người bán</li>
          </ul>
        </div>

        <div className="flex-1 min-w-[200px]">
          <h4 className="text-gray-900 font-semibold text-lg mb-2">Liên hệ</h4>
          <ul className="space-y-1 text-gray-900 text-sm">
            <li className="flex items-center"><span className="mr-1 text-lg">📞</span> Hotline: 1800 1234</li>
            <li className="flex items-center"><span className="mr-1 text-lg">✉️</span> support@shopmduc247.vn</li>
            <li className="flex items-center"><span className="mr-1 text-lg">📍</span> Tầng 4-5-6, Tòa nhà Capital Place, số 29 Liễu Giai, Ba Đình, Hà Nội</li>
          </ul>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex flex-col md:flex-row justify-between items-center px-8 py-4 text-purple-700 text-sm">
        <span>© 2024 ShopMduc247. Tất cả quyền được bảo lưu.</span>
        <div className="flex gap-2 mt-2 md:mt-0">
          <span className="bg-[#1976d2] text-white px-2 py-0.5 rounded font-semibold text-sm">VISA</span>
          <span className="bg-[#e53935] text-white px-2 py-0.5 rounded font-semibold text-sm">MC</span>
          <span className="bg-[#fbc02d] text-white px-2 py-0.5 rounded font-semibold text-sm">JCB</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
