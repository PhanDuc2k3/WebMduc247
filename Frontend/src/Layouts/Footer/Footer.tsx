import React from "react";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white shadow-2xl mt-auto">
      {/* Top */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <span className="bg-[#4B5563] text-white text-xl font-bold rounded-xl px-6 py-2 inline-block mb-4 shadow-lg">
              ShopMduc247
            </span>
            <p className="text-gray-300 text-sm mb-4 leading-relaxed">
              Sàn thương mại điện tử hàng đầu Việt Nam với hàng triệu sản phẩm chất lượng và dịch vụ tốt nhất.
            </p>
            <div className="flex gap-3 mt-4">
              <a 
                href="#" 
                aria-label="Facebook"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#3b5998] flex items-center justify-center transition-all duration-300 transform hover:scale-110"
              >
                <Facebook size={18} />
              </a>
              <a 
                href="#" 
                aria-label="Instagram"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 flex items-center justify-center transition-all duration-300 transform hover:scale-110"
              >
                <Instagram size={18} />
              </a>
              <a 
                href="#" 
                aria-label="Twitter"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#1da1f2] flex items-center justify-center transition-all duration-300 transform hover:scale-110"
              >
                <Twitter size={18} />
              </a>
              <a 
                href="#" 
                aria-label="YouTube"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#ff0000] flex items-center justify-center transition-all duration-300 transform hover:scale-110"
              >
                <Youtube size={18} />
              </a>
            </div>
          </div>

          {/* Footer columns */}
          <div>
            <h4 className="text-white font-bold text-lg mb-4 relative pb-2">
              Chăm sóc khách hàng
              <span className="absolute bottom-0 left-0 w-12 h-0.5 bg-[#4B5563]"></span>
            </h4>
            <ul className="space-y-2 text-gray-300 text-sm">
              {['Trung tâm trợ giúp', 'Hướng dẫn mua hàng', 'Hướng dẫn bán hàng', 'Thanh toán', 'Vận chuyển', 'Trả hàng & Hoàn tiền'].map((item, idx) => (
                <li key={idx}>
                  <a href="#" className="hover:text-[#4B5563] transition-colors duration-300 flex items-center gap-2">
                    <span>•</span>
                    <span>{item}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-lg mb-4 relative pb-2">
              Về ShopMduc247
              <span className="absolute bottom-0 left-0 w-12 h-0.5 bg-[#4B5563]"></span>
            </h4>
            <ul className="space-y-2 text-gray-300 text-sm">
              {['Giới thiệu', 'Tuyển dụng', 'Điều khoản', 'Chính sách bảo mật', 'Chính hãng', 'Kênh người bán'].map((item, idx) => (
                <li key={idx}>
                  <a href="#" className="hover:text-[#4B5563] transition-colors duration-300 flex items-center gap-2">
                    <span>•</span>
                    <span>{item}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-lg mb-4 relative pb-2">
              Liên hệ
              <span className="absolute bottom-0 left-0 w-12 h-0.5 bg-[#4B5563]"></span>
            </h4>
            <ul className="space-y-3 text-gray-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-lg mt-0.5">📞</span>
                <span className="hover:text-[#4B5563] transition-colors duration-300">Hotline: 1800 1234</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg mt-0.5">✉️</span>
                <span className="hover:text-[#4B5563] transition-colors duration-300">support@shopmduc247.vn</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg mt-0.5">📍</span>
                <span className="hover:text-[#4B5563] transition-colors duration-300">Tầng 4-5-6, Tòa nhà Capital Place, số 29 Liễu Giai, Ba Đình, Hà Nội</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="text-gray-300 text-sm">© 2024 ShopMduc247. Tất cả quyền được bảo lưu.</span>
            <div className="flex gap-3">
              <span className="bg-gradient-to-r from-[#1976d2] to-[#1565c0] text-white px-3 py-1.5 rounded-lg font-semibold text-xs shadow-lg transform hover:scale-105 transition-all duration-300">
                VISA
              </span>
              <span className="bg-gradient-to-r from-[#e53935] to-[#c62828] text-white px-3 py-1.5 rounded-lg font-semibold text-xs shadow-lg transform hover:scale-105 transition-all duration-300">
                MC
              </span>
              <span className="bg-gradient-to-r from-[#fbc02d] to-[#f9a825] text-white px-3 py-1.5 rounded-lg font-semibold text-xs shadow-lg transform hover:scale-105 transition-all duration-300">
                JCB
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
