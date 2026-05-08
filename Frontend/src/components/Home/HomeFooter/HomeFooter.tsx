import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin, Send } from "lucide-react";

const HomeFooter: React.FC = () => {
  return (
    <footer className="bg-[#1F2937] text-white mt-8 sm:mt-12 md:mt-16">
      {/* Main Footer */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-block mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-500 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl sm:text-2xl font-black text-white">B</span>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    BeliBeli<span className="text-gray-400">.com</span>
                  </h3>
                  <p className="text-xs text-gray-400">Shopping Mall</p>
                </div>
              </div>
            </Link>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              Nền tảng mua sắm trực tuyến hàng đầu Việt Nam. Mua sắm thông minh, thanh toán an toàn, giao hàng nhanh chóng.
            </p>
            {/* Social Icons */}
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors">
                <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a href="#" className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors">
                <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a href="#" className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-sky-500 transition-colors">
                <Twitter className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a href="#" className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                <Youtube className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
            </div>
          </div>

          {/* About Column */}
          <div>
            <h4 className="text-base sm:text-lg font-bold mb-4 text-white">Về BeliBeli</h4>
            <ul className="space-y-2.5">
              <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors text-sm">Giới thiệu</Link></li>
              <li><Link to="/careers" className="text-gray-400 hover:text-white transition-colors text-sm">Tuyển dụng</Link></li>
              <li><Link to="/press" className="text-gray-400 hover:text-white transition-colors text-sm">Báo chí</Link></li>
              <li><Link to="/blog" className="text-gray-400 hover:text-white transition-colors text-sm">Blog</Link></li>
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h4 className="text-base sm:text-lg font-bold mb-4 text-white">Hỗ trợ</h4>
            <ul className="space-y-2.5">
              <li><Link to="/help" className="text-gray-400 hover:text-white transition-colors text-sm">Trung tâm trợ giúp</Link></li>
              <li><Link to="/faq" className="text-gray-400 hover:text-white transition-colors text-sm">Câu hỏi thường gặp</Link></li>
              <li><Link to="/shipping" className="text-gray-400 hover:text-white transition-colors text-sm">Chính sách vận chuyển</Link></li>
              <li><Link to="/returns" className="text-gray-400 hover:text-white transition-colors text-sm">Chính sách đổi trả</Link></li>
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h4 className="text-base sm:text-lg font-bold mb-4 text-white">Liên hệ</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>123 Đường ABC, Quận 1, TP.HCM</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>1900 1234</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span>support@belibeli.com</span>
              </li>
            </ul>
            {/* Newsletter */}
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">Đăng ký nhận tin</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Email của bạn"
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/40 transition-colors"
                />
                <button className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-gray-400 text-xs sm:text-sm">
            <p>© 2024 BeliBeli.com. Tất cả quyền được bảo lưu.</p>
            <div className="flex gap-4">
              <Link to="/terms" className="hover:text-white transition-colors">Điều khoản sử dụng</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Chính sách bảo mật</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;
