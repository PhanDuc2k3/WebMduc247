import React from "react";
import { FileText, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Terms: React.FC = () => {
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
              <FileText className="text-white w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Điều khoản sử dụng</h1>
              <p className="text-gray-600 mt-1">Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Chấp nhận điều khoản</h2>
            <p className="text-gray-700 leading-relaxed">
              Bằng việc truy cập và sử dụng nền tảng ShopMDuc247 ("Nền tảng"), bạn đồng ý tuân thủ và bị ràng buộc bởi các Điều khoản sử dụng này. 
              Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, vui lòng không sử dụng Nền tảng.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Định nghĩa</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>"Nền tảng"</strong> hoặc <strong>"Chúng tôi"</strong>: Chỉ ShopMDuc247 và các dịch vụ liên quan</li>
              <li><strong>"Người dùng"</strong> hoặc <strong>"Bạn"</strong>: Bất kỳ cá nhân hoặc tổ chức nào truy cập hoặc sử dụng Nền tảng</li>
              <li><strong>"Người mua"</strong>: Người dùng mua sản phẩm trên Nền tảng</li>
              <li><strong>"Người bán"</strong>: Người dùng đăng ký và bán sản phẩm trên Nền tảng</li>
              <li><strong>"Sản phẩm"</strong>: Hàng hóa được niêm yết và bán trên Nền tảng</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Đăng ký tài khoản</h2>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-800">3.1. Yêu cầu đăng ký</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Bạn phải từ đủ 18 tuổi trở lên hoặc có sự đồng ý của người giám hộ</li>
                <li>Cung cấp thông tin chính xác, đầy đủ và cập nhật</li>
                <li>Chịu trách nhiệm bảo mật thông tin đăng nhập của mình</li>
                <li>Thông báo ngay cho chúng tôi nếu phát hiện sử dụng trái phép tài khoản</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-4">3.2. Đăng ký làm Người bán</h3>
              <p className="text-gray-700 leading-relaxed">
                Người dùng muốn trở thành Người bán phải gửi yêu cầu và được chúng tôi phê duyệt. 
                Người bán có trách nhiệm cung cấp thông tin cửa hàng chính xác và tuân thủ các quy định về sản phẩm.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Sử dụng Nền tảng</h2>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-800">4.1. Quyền của bạn</h3>
              <p className="text-gray-700 leading-relaxed">
                Bạn có quyền sử dụng Nền tảng để:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Duyệt và tìm kiếm sản phẩm</li>
                <li>Mua sắm và đặt hàng (nếu là Người mua)</li>
                <li>Bán sản phẩm (nếu là Người bán đã được phê duyệt)</li>
                <li>Tương tác với người dùng khác thông qua hệ thống tin nhắn</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-4">4.2. Nghĩa vụ của bạn</h3>
              <p className="text-gray-700 leading-relaxed mb-2">
                Bạn cam kết KHÔNG:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Sử dụng Nền tảng cho mục đích bất hợp pháp hoặc gian lận</li>
                <li>Đăng tải thông tin sai sự thật, lừa đảo hoặc vi phạm quyền của người khác</li>
                <li>Xâm phạm quyền sở hữu trí tuệ của bên thứ ba</li>
                <li>Phát tán virus, mã độc hoặc phần mềm có hại</li>
                <li>Thu thập thông tin của người dùng khác một cách trái phép</li>
                <li>Can thiệp vào hoạt động bình thường của Nền tảng</li>
                <li>Tạo nhiều tài khoản để tránh các hạn chế hoặc lừa đảo</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Sản phẩm và giao dịch</h2>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-800">5.1. Thông tin sản phẩm</h3>
              <p className="text-gray-700 leading-relaxed">
                Người bán chịu trách nhiệm về tính chính xác của thông tin sản phẩm, bao gồm mô tả, hình ảnh, giá cả và tình trạng hàng hóa. 
                Chúng tôi không đảm bảo về chất lượng, an toàn hoặc tính hợp pháp của sản phẩm do Người bán cung cấp.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-4">5.2. Đặt hàng và thanh toán</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Khi đặt hàng, bạn đồng ý mua sản phẩm với giá và điều kiện được niêm yết</li>
                <li>Thanh toán có thể được thực hiện qua nhiều phương thức: COD, MOMO, VIETQR, hoặc Ví điện tử</li>
                <li>Chúng tôi có quyền từ chối hoặc hủy đơn hàng trong trường hợp có dấu hiệu gian lận</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-4">5.3. Vận chuyển và giao hàng</h3>
              <p className="text-gray-700 leading-relaxed">
                Người bán chịu trách nhiệm vận chuyển và giao hàng đến địa chỉ do Người mua cung cấp. 
                Thời gian giao hàng và chi phí vận chuyển sẽ được thông báo trước khi xác nhận đơn hàng.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Đổi trả và hoàn tiền</h2>
            <p className="text-gray-700 leading-relaxed">
              Chính sách đổi trả và hoàn tiền được quy định riêng và có thể khác nhau tùy theo từng Người bán. 
              Người mua có quyền yêu cầu đổi trả trong các trường hợp được quy định, và Người bán có trách nhiệm xử lý yêu cầu hợp lệ.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Phí và thanh toán</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Chúng tôi có thể thu phí dịch vụ từ Người bán cho việc sử dụng Nền tảng</li>
              <li>Phí sẽ được thông báo rõ ràng trước khi áp dụng</li>
              <li>Người bán chịu trách nhiệm thanh toán đầy đủ và đúng hạn các khoản phí</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Quyền sở hữu trí tuệ</h2>
            <p className="text-gray-700 leading-relaxed">
              Tất cả nội dung trên Nền tảng, bao gồm logo, thiết kế, văn bản, hình ảnh và phần mềm, đều thuộc quyền sở hữu của ShopMDuc247 hoặc được cấp phép sử dụng. 
              Bạn không được sao chép, sử dụng hoặc phân phối nội dung này mà không có sự cho phép bằng văn bản của chúng tôi.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Miễn trừ trách nhiệm</h2>
            <p className="text-gray-700 leading-relaxed">
              Chúng tôi cung cấp Nền tảng "như hiện có" và không đảm bảo rằng Nền tảng sẽ luôn hoạt động không gián đoạn, không có lỗi hoặc an toàn. 
              Chúng tôi không chịu trách nhiệm về bất kỳ thiệt hại nào phát sinh từ việc sử dụng hoặc không thể sử dụng Nền tảng, 
              bao gồm nhưng không giới hạn ở thiệt hại trực tiếp, gián tiếp, ngẫu nhiên hoặc hậu quả.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Chấm dứt tài khoản</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Chúng tôi có quyền tạm ngưng hoặc chấm dứt tài khoản của bạn nếu:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Bạn vi phạm các Điều khoản sử dụng này</li>
              <li>Bạn thực hiện các hành vi gian lận, lừa đảo hoặc bất hợp pháp</li>
              <li>Bạn không hoạt động trong thời gian dài (theo quy định của chúng tôi)</li>
              <li>Yêu cầu của cơ quan nhà nước có thẩm quyền</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Giải quyết tranh chấp</h2>
            <p className="text-gray-700 leading-relaxed">
              Mọi tranh chấp phát sinh từ việc sử dụng Nền tảng sẽ được giải quyết thông qua thương lượng. 
              Nếu không thể thương lượng, tranh chấp sẽ được giải quyết theo pháp luật Việt Nam tại Tòa án có thẩm quyền tại Hà Nội.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Thay đổi điều khoản</h2>
            <p className="text-gray-700 leading-relaxed">
              Chúng tôi có quyền sửa đổi các Điều khoản sử dụng này bất cứ lúc nào. 
              Các thay đổi sẽ có hiệu lực ngay sau khi được đăng tải trên Nền tảng. 
              Việc bạn tiếp tục sử dụng Nền tảng sau khi có thay đổi được coi là chấp nhận các điều khoản mới.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Liên hệ</h2>
            <p className="text-gray-700 leading-relaxed">
              Nếu bạn có câu hỏi về các Điều khoản sử dụng này, vui lòng liên hệ với chúng tôi:
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

export default Terms;

