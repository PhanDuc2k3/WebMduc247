import React from 'react';
import ContactInfoCard from '../../components/Support/ContactInfoCard';
import QuickGuideCard from '../../components/Support/QuickGuideCard';
import FAQGroup from '../../components/Support/FAQGroup';
import SupportForm from '../../components/Support/SupportForm';
import AdditionalInfoCard from '../../components/Support/AdditionalInfoCard';
import { Phone, Mail, MessageSquare, MapPin, ShoppingCart, Eye, CreditCard, Gift, Truck, HelpCircle } from 'lucide-react';
  const faqCategories = [
    {
      id: "order",
      title: "Đặt hàng & Thanh toán",
      icon: ShoppingCart,
      questions: [
        {
          q: "Làm thế nào để đặt hàng trên ShopMduc247?",
          a: "Để đặt hàng, bạn chỉ cần: 1) Tìm kiếm sản phẩm muốn mua, 2) Thêm vào giỏ hàng, 3) Chọn phương thức thanh toán và điền thông tin giao hàng, 4) Xác nhận đơn hàng. Bạn sẽ nhận được email xác nhận ngay sau đó."
        },
        {
          q: "Có những phương thức thanh toán nào?",
                      a: "Chúng tôi hỗ trợ nhiều phương thức thanh toán: Thanh toán khi nhận hàng (COD), Thẻ tín dụng/ghi nợ (Visa, Mastercard), Ví điện tử (Momo, ZaloPay), Thanh toán QR (VietQR), Chuyển khoản ngân hàng."
        },
        {
          q: "Tôi có thể hủy đơn hàng không?",
          a: "Bạn có thể hủy đơn hàng miễn phí nếu đơn hàng chưa được xác nhận hoặc chưa được giao cho đơn vị vận chuyển. Sau khi đơn hàng đã được giao cho vận chuyển, bạn cần liên hệ bộ phận chăm sóc khách hàng."
        },
        {
          q: "Làm sao để áp dụng mã giảm giá?",
          a: "Tại trang thanh toán, bạn sẽ thấy ô 'Mã giảm giá' hoặc 'Voucher'. Nhập mã của bạn vào đó và nhấn 'Áp dụng'. Số tiền giảm giá sẽ được tự động trừ vào tổng đơn hàng."
        }
      ]
    },
    {
      id: "shipping",
      title: "Vận chuyển & Giao hàng",
      icon: Truck,
      questions: [
        {
          q: "Thời gian giao hàng là bao lâu?",
          a: "Thời gian giao hàng phụ thuộc vào khu vực: Nội thành Hà Nội, TP.HCM: 1-2 ngày. Các tỉnh thành khác: 3-5 ngày. Vùng sâu vùng xa: 5-7 ngày. Bạn có thể theo dõi đơn hàng realtime qua trang 'Đơn hàng của tôi'."
        },
        {
          q: "Phí vận chuyển được tính như thế nào?",
          a: "Phí vận chuyển được tính dựa trên trọng lượng, kích thước và khoảng cách giao hàng. Chúng tôi có chương trình freeship cho đơn hàng từ 300K. Phí vận chuyển cụ thể sẽ được hiển thị trước khi bạn thanh toán."
        },
        {
          q: "Tôi có thể thay đổi địa chỉ giao hàng không?",
          a: "Bạn có thể thay đổi địa chỉ giao hàng trước khi đơn hàng được giao cho đơn vị vận chuyển. Vui lòng liên hệ ngay với bộ phận chăm sóc khách hàng hoặc cập nhật trong phần 'Đơn hàng của tôi'."
        },
        {
          q: "Điều gì xảy ra nếu tôi không có nhà khi giao hàng?",
          a: "Đơn vị vận chuyển sẽ liên hệ với bạn trước khi giao hàng. Nếu bạn không có nhà, họ sẽ thử giao lại lần 2. Bạn cũng có thể liên hệ đơn vị vận chuyển để sắp xếp lại thời gian giao hàng phù hợp."
        }
      ]
    },
    {
      id: "return",
      title: "Đổi trả & Hoàn tiền",
      icon: CreditCard,
      questions: [
        {
          q: "Chính sách đổi trả hàng như thế nào?",
          a: "Bạn có thể đổi trả hàng trong vòng 7 ngày kể từ ngày nhận hàng nếu sản phẩm còn nguyên tem mác, chưa qua sử dụng và có đầy đủ hóa đơn. Một số sản phẩm đặc biệt như đồ lót, mỹ phẩm đã mở seal không được đổi trả."
        },
        {
          q: "Tôi được hoàn tiền sau bao lâu?",
          a: "Sau khi chúng tôi nhận được hàng trả và xác nhận hợp lệ, tiền sẽ được hoàn lại trong vòng 5-7 ngày làm việc. Nếu bạn thanh toán bằng thẻ/ví điện tử, tiền sẽ được hoàn về tài khoản gốc. Nếu thanh toán COD, bạn sẽ nhận tiền qua chuyển khoản."
        },
        {
          q: "Chi phí vận chuyển đổi trả do ai chịu?",
          a: "Nếu lỗi do nhà bán hàng (sản phẩm lỗi, sai hàng), chúng tôi sẽ chịu toàn bộ phí vận chuyển. Nếu lỗi do người mua (đổi ý, chọn nhầm size), người mua sẽ chịu phí vận chuyển."
        },
        {
          q: "Làm thế nào để yêu cầu đổi trả?",
          a: "Vào 'Đơn hàng của tôi', chọn đơn hàng cần đổi trả, nhấn 'Yêu cầu đổi trả/hoàn tiền', chọn lý do và tải lên hình ảnh sản phẩm (nếu có). Bộ phận chăm sóc khách hàng sẽ xử lý trong vòng 24h."
        }
      ]
    },
    {
      id: "account",
      title: "Tài khoản & Bảo mật",
      icon: HelpCircle,
      questions: [
        {
          q: "Làm thế nào để đăng ký tài khoản?",
          a: "Nhấn vào 'Đăng ký' ở góc trên bên phải, điền email/số điện thoại và mật khẩu, xác nhận qua OTP được gửi đến. Bạn cũng có thể đăng ký nhanh qua Facebook hoặc Google."
        },
        {
          q: "Tôi quên mật khẩu, phải làm sao?",
          a: "Tại trang đăng nhập, nhấn 'Quên mật khẩu', nhập email/số điện thoại đã đăng ký. Chúng tôi sẽ gửi link đặt lại mật khẩu qua email hoặc mã OTP qua SMS."
        },
        {
          q: "Làm sao để bảo vệ tài khoản của tôi?",
          a: "Sử dụng mật khẩu mạnh (ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt), không chia sẻ mật khẩu với người khác, bật xác thực 2 lớp (2FA), cập nhật thông tin bảo mật thường xuyên."
        },
        {
          q: "Thông tin cá nhân của tôi có được bảo mật không?",
          a: "Chúng tôi cam kết bảo mật tuyệt đối thông tin cá nhân của khách hàng theo chính sách bảo mật. Thông tin của bạn được mã hóa và chỉ sử dụng cho mục đích giao dịch, không chia sẻ với bên thứ ba."
        }
      ]
    },
    {
      id: "voucher",
      title: "Voucher & Khuyến mãi",
      icon: Gift,
      questions: [
        {
          q: "Làm thế nào để nhận voucher?",
          a: "Bạn có thể nhận voucher từ: Các chương trình khuyến mãi trên trang chủ, Trang Voucher của ShopMduc247, Email/SMS từ chúng tôi, Tích điểm đổi quà, Mini game và sự kiện đặc biệt."
        },
        {
          q: "Tại sao voucher của tôi không áp dụng được?",
          a: "Voucher có thể không áp dụng được do: Đã hết hạn sử dụng, không đủ điều kiện đơn hàng tối thiểu, không áp dụng cho sản phẩm/danh mục bạn mua, đã sử dụng hết lượt, hoặc xung đột với chương trình khuyến mãi khác."
        },
        {
          q: "Tôi có thể dùng nhiều voucher cùng lúc không?",
          a: "Bạn có thể sử dụng nhiều loại voucher khác nhau (voucher giảm giá + voucher freeship) nhưng chỉ được dùng 1 voucher giảm giá cho mỗi đơn hàng. Voucher của shop và voucher của ShopMduc247 có thể dùng cùng lúc."
        },
        {
          q: "Voucher có được hoàn lại khi tôi hủy đơn?",
          a: "Nếu bạn hủy đơn hàng trước khi xác nhận, voucher sẽ được hoàn lại vào tài khoản. Nếu hủy sau khi xác nhận, voucher có thể không được hoàn lại tùy theo điều kiện cụ thể của từng voucher."
        }
      ]
    }
  ];
const SupportPage = () => {
  const [selectedTab, setSelectedTab] = React.useState(faqCategories[0].id);
  const [openAnswers, setOpenAnswers] = React.useState<{ [key: string]: number[] }>({});

  const toggleAnswer = (tabId: string, index: number) => {
    setOpenAnswers(prev => {
      const current = prev[tabId] || [];
      return {
        ...prev,
        [tabId]: current.includes(index) ? current.filter(i => i !== index) : [...current, index],
      };
    });
  };

  return (
    <div className="w-full py-8 md:py-12">
      {/* Header Section */}
      <div className="mb-8 animate-fade-in-down">
        <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900 gradient-text">
          💬 Trung tâm hỗ trợ
        </h1>
        <p className="text-gray-600 text-lg">
          Chúng tôi luôn sẵn sàng giúp đỡ bạn!
        </p>
      </div>

      <div className="space-y-8">

        {/* Contact Info */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up">
        {[
          { title: 'Hotline', content: '1800 1234', note: 'Hỗ trợ 24/7', icon: <Phone size={28} className="text-blue-700" />, iconBgColor: 'rgba(59,130,246,0.2)', iconBorderColor: 'rgba(59,130,246,0.5)' },
          { title: 'Email', content: 'support@shoppingabc.com', note: 'Phản hồi trong 24h', icon: <Mail size={28} className="text-green-700" />, iconBgColor: 'rgba(34,197,94,0.2)', iconBorderColor: 'rgba(34,197,94,0.5)' },
          { title: 'Live Chat', content: 'Chat ngay', note: '8h - 22h hàng ngày', icon: <MessageSquare size={28} className="text-purple-700" />, iconBgColor: 'rgba(139,92,246,0.2)', iconBorderColor: 'rgba(139,92,246,0.5)' },
          { title: 'Địa chỉ', content: 'Số 123, Đường ABC, Quận 1, TP.HCM', note: '', icon: <MapPin size={28} className="text-orange-500" />, iconBgColor: 'rgba(251,146,60,0.2)', iconBorderColor: 'rgba(251,146,60,0.5)' },
        ].map((item, idx) => (
          <ContactInfoCard key={idx} {...item} />
        ))}
      </section>

        {/* Quick Guide */}
        <section className="animate-fade-in-up delay-200">
          <h2 className="text-xl lg:text-2xl font-bold mb-6 flex items-center gap-3 text-gray-900">
            <span>⚡</span> <span className="gradient-text">Hướng dẫn nhanh</span>
          </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Hướng dẫn đặt hàng', icon: <ShoppingCart size={24} />, description: 'Cách đặt hàng nhanh chóng và dễ dàng' },
            { title: 'Theo dõi đơn hàng', icon: <Eye size={24} />, description: 'Kiểm tra tình trạng giao hàng' },
            { title: 'Phương thức thanh toán', icon: <CreditCard size={24} />, description: 'Các phương thức thanh toán' },
            { title: 'Sử dụng voucher', icon: <Gift size={24} />, description: 'Cách sử dụng mã giảm giá' },
          ].map((item, idx) => (
            <QuickGuideCard key={idx} {...item} />
          ))}
        </div>
      </section>

        {/* FAQ Section */}
        <section className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 p-8 animate-fade-in-up delay-300">
          <h2 className="text-xl lg:text-2xl font-bold mb-6 flex items-center gap-3 text-gray-900">
            <span>❓</span> <span className="gradient-text">Câu hỏi thường gặp</span>
          </h2>

          {/* Tabs ngang */}
          <div className="flex flex-wrap gap-3 mb-6">
            {faqCategories.map((group) => (
              <button
                key={group.id}
                className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
                  selectedTab === group.id
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105"
                    : "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                }`}
                onClick={() => setSelectedTab(group.id)}
              >
                {group.title}
              </button>
            ))}
          </div>

          {/* Danh sách câu hỏi */}
          <div className="border-2 border-gray-200 rounded-2xl shadow-lg overflow-hidden">
    {faqCategories
      .find((group) => group.id === selectedTab)
      ?.questions.map((item, idx) => (
        <div
          key={idx}
          className={`p-6 cursor-pointer transition-all duration-300 ${
            idx !== faqCategories.find((group) => group.id === selectedTab)?.questions.length! - 1 ? "border-b-2 border-gray-200" : ""
          } ${openAnswers[selectedTab]?.includes(idx) ? "bg-gradient-to-r from-blue-50 to-purple-50" : "hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50"}`}
          onClick={() => toggleAnswer(selectedTab, idx)}
        >
          <div className="flex justify-between items-center">
            <p className="font-bold text-gray-900 text-lg">{item.q}</p>
            <span className="text-2xl font-bold text-gray-500 hover:text-purple-600 transition-colors">
              {openAnswers[selectedTab]?.includes(idx) ? "−" : "+"}
            </span>
          </div>
          {openAnswers[selectedTab]?.includes(idx) && (
            <p className="mt-4 text-gray-700 leading-relaxed animate-fade-in">{item.a}</p>
          )}
        </div>
      ))}
          </div>
        </section>


        {/* Support Form */}
        <section className="animate-fade-in-up delay-400">
          <h2 className="text-xl lg:text-2xl font-bold mb-6 flex items-center gap-3 text-gray-900">
            <span>📝</span> <span className="gradient-text">Gửi yêu cầu hỗ trợ</span>
          </h2>
          <SupportForm />
        </section>

        {/* Additional Info */}
        <section className="animate-fade-in-up delay-500">
          <AdditionalInfoCard />
        </section>
      </div>
    </div>
  );
};

export default SupportPage;

