import React from "react";
import { Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại</span>
          </button>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Shield className="text-white w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Chính sách bảo mật</h1>
              <p className="text-gray-600 mt-1">Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Giới thiệu</h2>
            <p className="text-gray-700 leading-relaxed">
              ShopMDuc247 ("chúng tôi", "của chúng tôi" hoặc "nền tảng") cam kết bảo vệ quyền riêng tư và thông tin cá nhân của người dùng. 
              Chính sách bảo mật này mô tả cách chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ thông tin của bạn khi sử dụng dịch vụ của chúng tôi.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Thông tin chúng tôi thu thập</h2>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-800">2.1. Thông tin cá nhân</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Họ và tên</li>
                <li>Địa chỉ email</li>
                <li>Số điện thoại</li>
                <li>Địa chỉ giao hàng</li>
                <li>Thông tin thanh toán (được mã hóa và bảo mật)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-4">2.2. Thông tin tự động thu thập</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Địa chỉ IP</li>
                <li>Loại trình duyệt và thiết bị</li>
                <li>Thông tin về cách bạn sử dụng nền tảng (trang đã xem, thời gian truy cập)</li>
                <li>Cookies và công nghệ theo dõi tương tự</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Cách chúng tôi sử dụng thông tin</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Chúng tôi sử dụng thông tin thu thập được để:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Xử lý và hoàn thành đơn hàng của bạn</li>
              <li>Cung cấp dịch vụ khách hàng và hỗ trợ</li>
              <li>Gửi thông báo về đơn hàng, sản phẩm và dịch vụ</li>
              <li>Cải thiện trải nghiệm người dùng và tối ưu hóa nền tảng</li>
              <li>Phát hiện và ngăn chặn gian lận, lạm dụng</li>
              <li>Tuân thủ các nghĩa vụ pháp lý</li>
              <li>Gửi thông tin marketing (với sự đồng ý của bạn)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Bảo mật thông tin</h2>
            <p className="text-gray-700 leading-relaxed">
              Chúng tôi áp dụng các biện pháp bảo mật kỹ thuật và tổ chức phù hợp để bảo vệ thông tin cá nhân của bạn khỏi truy cập trái phép, 
              mất mát, phá hủy hoặc thay đổi. Các biện pháp bao gồm:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mt-3">
              <li>Mã hóa dữ liệu trong quá trình truyền (SSL/TLS)</li>
              <li>Mã hóa mật khẩu bằng thuật toán bcrypt</li>
              <li>Xác thực hai yếu tố (2FA) cho tài khoản</li>
              <li>Giới hạn quyền truy cập vào thông tin cá nhân</li>
              <li>Giám sát và kiểm tra bảo mật thường xuyên</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Chia sẻ thông tin</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Chúng tôi không bán, cho thuê hoặc chia sẻ thông tin cá nhân của bạn với bên thứ ba, ngoại trừ:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Nhà cung cấp dịch vụ:</strong> Các đối tác hỗ trợ vận hành nền tảng (lưu trữ, thanh toán, vận chuyển)</li>
              <li><strong>Yêu cầu pháp lý:</strong> Khi được yêu cầu bởi cơ quan nhà nước có thẩm quyền</li>
              <li><strong>Bảo vệ quyền lợi:</strong> Để bảo vệ quyền, tài sản hoặc an toàn của chúng tôi và người dùng</li>
              <li><strong>Với sự đồng ý của bạn:</strong> Trong các trường hợp khác khi bạn đã đồng ý</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies và công nghệ theo dõi</h2>
            <p className="text-gray-700 leading-relaxed">
              Chúng tôi sử dụng cookies và công nghệ tương tự để cải thiện trải nghiệm của bạn, phân tích lưu lượng truy cập và cá nhân hóa nội dung. 
              Bạn có thể quản lý hoặc xóa cookies thông qua cài đặt trình duyệt của mình.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Quyền của người dùng</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Bạn có quyền:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Truy cập và xem thông tin cá nhân của mình</li>
              <li>Yêu cầu chỉnh sửa hoặc cập nhật thông tin không chính xác</li>
              <li>Yêu cầu xóa thông tin cá nhân (theo quy định pháp luật)</li>
              <li>Từ chối nhận thông tin marketing</li>
              <li>Rút lại sự đồng ý về xử lý dữ liệu</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Lưu trữ dữ liệu</h2>
            <p className="text-gray-700 leading-relaxed">
              Chúng tôi lưu trữ thông tin cá nhân của bạn trong thời gian cần thiết để thực hiện các mục đích nêu trong chính sách này, 
              hoặc theo yêu cầu của pháp luật. Khi không còn cần thiết, chúng tôi sẽ xóa hoặc ẩn danh hóa thông tin một cách an toàn.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Thay đổi chính sách</h2>
            <p className="text-gray-700 leading-relaxed">
              Chúng tôi có thể cập nhật chính sách bảo mật này theo thời gian. Mọi thay đổi quan trọng sẽ được thông báo qua email hoặc thông báo trên nền tảng. 
              Việc bạn tiếp tục sử dụng dịch vụ sau khi có thay đổi được coi là chấp nhận chính sách mới.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Liên hệ</h2>
            <p className="text-gray-700 leading-relaxed">
              Nếu bạn có câu hỏi, yêu cầu hoặc khiếu nại về chính sách bảo mật này, vui lòng liên hệ với chúng tôi:
            </p>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-gray-700"><strong>Email:</strong> support@shopmduc247.com</p>
              <p className="text-gray-700"><strong>Địa chỉ:</strong> Trường Đại học Phenikaa, Hà Nội, Việt Nam</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;

