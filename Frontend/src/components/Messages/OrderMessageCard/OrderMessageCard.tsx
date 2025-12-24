import React from "react";
import { useNavigate } from "react-router-dom";
import { Package, MapPin, CreditCard, Phone, ExternalLink, ShoppingBag } from "lucide-react";

interface OrderMessageCardProps {
  message: string;
  isMine?: boolean;
}

const OrderMessageCard: React.FC<OrderMessageCardProps> = ({ message, isMine = false }) => {
  const navigate = useNavigate();

  // Parse message để extract thông tin order
  const parseOrderMessage = (text: string) => {
    if (!text) return {
      orderCode: "",
      products: [],
      subtotal: "",
      shippingFee: "",
      discount: "",
      total: "",
      paymentMethod: "",
      status: "",
      address: null,
      orderLink: "",
    };
    // 1. Order Code
    const orderCodeMatch = text.match(/#([A-Z0-9-]+)/);
    const orderCode = orderCodeMatch ? orderCodeMatch[1] : "";

    // 2. Sản phẩm
    const productsSection = text.match(/(?:🛍️\s*)?Sản phẩm:\s*\n((?:\d+\.\s*.+?\s*x\d+\s*-\s*.+?₫\s*\n?)+)/);
    const products: Array<{ name: string; quantity: number; price: string }> = [];
    if (productsSection) {
      const productLines = productsSection[1].trim().split("\n").filter(line => line.trim());
      productLines.forEach((line) => {
        const match = line.match(/\d+\.\s*(.+?)\s*x(\d+)\s*-\s*(.+?₫)/);
        if (match) {
          products.push({
            name: match[1].trim(),
            quantity: parseInt(match[2]),
            price: match[3].trim(),
          });
        }
      });
    }

    // 3. Chi tiết thanh toán
    const chiTietSection = text.match(/(?:💰\s*)?Chi tiết thanh toán:\s*\n((?:[- ]*.+?:\s*.+?₫\s*\n?)+)/);
    let subtotal = "";
    let shippingFee = "";
    let discount = "";
    let total = "";
    
    if (chiTietSection) {
      const lines = chiTietSection[1].split("\n").filter(line => line.trim());
      lines.forEach((line) => {
        // Xử lý dòng có thể có dấu "-" ở đầu
        const cleanLine = line.replace(/^-\s*/, "").trim();
        if (cleanLine.includes("Tạm tính:")) {
          const match = cleanLine.match(/Tạm tính:\s*(.+?₫)/);
          if (match) subtotal = match[1].trim();
        } else if (cleanLine.includes("Phí vận chuyển:")) {
          const match = cleanLine.match(/Phí vận chuyển:\s*(.+?₫)/);
          if (match) shippingFee = match[1].trim();
        } else if (cleanLine.includes("Giảm giá:")) {
          const match = cleanLine.match(/Giảm giá:\s*-?(.+?₫)/);
          if (match) discount = match[1].trim();
        } else if (cleanLine.includes("Tổng tiền:")) {
          const match = cleanLine.match(/Tổng tiền:\s*(.+?₫)/);
          if (match) total = match[1].trim();
        }
      });
    }

    // 4. Phương thức thanh toán
    const paymentMethodMatch = text.match(/(?:💳\s*)?Phương thức thanh toán:\s*(.+?)(?:\n|$)/);
    const paymentMethod = paymentMethodMatch ? paymentMethodMatch[1].trim() : "";

    // 5. Trạng thái
    const statusMatch = text.match(/(?:📊\s*)?Trạng thái:\s*(.+?)(?:\n|$)/);
    const status = statusMatch ? statusMatch[1].trim() : "";

    // 6. Địa chỉ giao hàng
    const addressSection = text.match(/(?:📍\s*)?Địa chỉ giao hàng:\s*\n\s*(.+?)\s*\n\s*(.+?)\s*\n\s*(.+?)\s*(?:\n\s*\n|(?:\n|$))/s);

    const address = addressSection
      ? {
          fullName: addressSection[1].trim(),
          phone: addressSection[2].trim(),
          address: addressSection[3].trim(),
        }
      : null;

    // 7. Link
    const linkMatch = text.match(/(?:🔗\s*)?Xem chi tiết đơn hàng:\s*(https?:\/\/[^\s\n]+)/);
    const orderLink = linkMatch ? linkMatch[1].trim() : "";

    return {
      orderCode,
      products,
      subtotal,
      shippingFee,
      discount,
      total,
      paymentMethod,
      status,
      address,
      orderLink,
    };
  };

  const orderInfo = parseOrderMessage(message);

  // Chỉ hiển thị card nếu có order code
  if (!orderInfo.orderCode) {
    return (
      <div className="font-medium whitespace-pre-wrap text-xs sm:text-sm md:text-base">{message}</div>
    );
  }

  const statusColors: Record<string, string> = {
    "Chờ xử lý": "bg-yellow-100 text-yellow-700",
    "Đã xác nhận": "bg-blue-100 text-blue-700",
    "Đã đóng gói": "bg-purple-100 text-purple-700",
    "Đang giao hàng": "bg-purple-100 text-purple-700",
    "Đã giao hàng": "bg-green-100 text-green-700",
    "Đã nhận hàng": "bg-green-100 text-green-700",
    "Hoàn thành": "bg-green-100 text-green-700",
    "Đã hủy": "bg-red-100 text-red-700",
    "pending": "bg-yellow-100 text-yellow-700",
    "confirmed": "bg-blue-100 text-blue-700",
    "packed": "bg-purple-100 text-purple-700",
    "shipping": "bg-purple-100 text-purple-700",
    "shipped": "bg-purple-100 text-purple-700",
    "delivered": "bg-green-100 text-green-700",
    "received": "bg-green-100 text-green-700",
    "completed": "bg-green-100 text-green-700",
    "cancelled": "bg-red-100 text-red-700",
  };

  const handleViewOrder = () => {
    if (orderInfo.orderLink) {
      // Nếu là internal link, navigate
      if (orderInfo.orderLink.includes(window.location.origin) || orderInfo.orderLink.startsWith('/')) {
        const url = new URL(orderInfo.orderLink, window.location.origin);
        const path = url.pathname;
        navigate(path);
      } else {
        // Nếu là external link, mở tab mới
        window.open(orderInfo.orderLink, '_blank');
      }
    }
  };

  return (
    <div className="w-full max-w-full">
      {/* Order Card */}
      <div className={`rounded sm:rounded-md overflow-hidden border shadow-sm transition-all duration-300 hover:shadow ${
        isMine
          ? "bg-[#2F5FEB]/5 border-[#2F5FEB]/40"
          : "bg-white border-gray-200"
      }`}>
        {/* Header */}
        <div className={`px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 flex items-center justify-between ${
          isMine
            ? "bg-[#2F5FEB] text-white"
            : "bg-[#2F5FEB]/90 text-white"
        }`}>
          <div className="flex items-center gap-1 min-w-0">
            <Package className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 flex-shrink-0" />
            <span className="font-bold text-[9px] sm:text-[10px] md:text-base truncate">
              Đơn hàng #{orderInfo.orderCode}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-1 sm:p-1.5 md:p-2 space-y-0.5 sm:space-y-1 md:space-y-1.5">
          {/* Sản phẩm Section */}
          {orderInfo.products.length > 0 && (
            <div className="bg-white/60 border border-gray-200 rounded p-0.5 sm:p-1 md:p-1.5">
              <h4 className="font-semibold text-gray-900 text-[9px] sm:text-[10px] md:text-base mb-0.5 md:mb-1 flex items-center gap-0.5 md:gap-1">
                <ShoppingBag className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-gray-700 flex-shrink-0" />
                <span>Sản phẩm</span>
              </h4>
              <div className="space-y-0.5 md:space-y-1">
                {orderInfo.products.map((product, index) => (
                  <div key={index} className="flex justify-between items-start gap-1 md:gap-1.5 p-0.5 sm:p-1 md:p-1.5 bg-white/50 rounded">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-[9px] sm:text-[10px] md:text-base truncate">
                        {product.name}
                      </p>
                      <p className="text-[8px] sm:text-[9px] md:text-sm text-gray-500">
                        x{product.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-[#2F5FEB] text-[9px] sm:text-[10px] md:text-base whitespace-nowrap flex-shrink-0">
                      {product.price}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chi tiết thanh toán Section */}
          <div className="bg-white/60 border border-gray-200 rounded p-0.5 sm:p-1 md:p-1.5">
            <h4 className="font-semibold text-gray-900 text-[9px] sm:text-[10px] md:text-base mb-0.5 md:mb-1 flex items-center gap-0.5 md:gap-1">
              <CreditCard className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-gray-700 flex-shrink-0" />
              <span>Chi tiết thanh toán</span>
            </h4>
            <div className="space-y-0.5 md:space-y-1 text-[9px] sm:text-[10px] md:text-base">
              {orderInfo.subtotal && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tạm tính:</span>
                  <span className="font-medium text-gray-900">{orderInfo.subtotal}</span>
                </div>
              )}
              {orderInfo.shippingFee && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Phí vận chuyển:</span>
                  <span className="font-medium text-gray-900">{orderInfo.shippingFee}</span>
                </div>
              )}
              {orderInfo.discount && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá:</span>
                  <span className="font-medium">-{orderInfo.discount}</span>
                </div>
              )}
              {orderInfo.total && (
                <div className="flex justify-between pt-0.5 md:pt-1 border-t border-gray-300 mt-0.5 md:mt-1">
                  <span className="font-bold text-[9px] sm:text-[10px] md:text-base text-gray-900">Tổng:</span>
                  <span className="font-bold text-[9px] sm:text-[10px] md:text-base text-red-600">{orderInfo.total}</span>
                </div>
              )}
            </div>
          </div>

          {/* Phương thức & Trạng thái - Grid */}
          <div className="grid grid-cols-2 gap-0.5 sm:gap-1 md:gap-1.5">
            {orderInfo.paymentMethod && (
              <div className="bg-white/60 border border-gray-200 rounded p-0.5 sm:p-1 md:p-1.5">
                <p className="text-[8px] sm:text-[9px] md:text-sm text-gray-600 mb-0.5 md:mb-1 font-medium">Phương thức</p>
                <p className="font-semibold text-gray-900 text-[9px] sm:text-[10px] md:text-base truncate">{orderInfo.paymentMethod}</p>
              </div>
            )}
            {orderInfo.status && (
              <div className="bg-white/60 border border-gray-200 rounded p-0.5 sm:p-1 md:p-1.5">
                <p className="text-[8px] sm:text-[9px] md:text-sm text-gray-600 mb-0.5 md:mb-1 font-medium">Trạng thái</p>
                <span className={`inline-block px-0.5 py-0.5 sm:px-1 sm:py-0.5 md:px-1.5 md:py-1 rounded-full text-[8px] sm:text-[9px] md:text-sm font-semibold ${
                  statusColors[orderInfo.status] || "bg-gray-100 text-gray-800"
                }`}>
                  {orderInfo.status}
                </span>
              </div>
            )}
          </div>

          {/* Địa chỉ giao hàng Section */}
          {orderInfo.address && (
            <div className="bg-white/60 border border-gray-200 rounded p-0.5 sm:p-1 md:p-1.5">
              <h4 className="font-semibold text-gray-900 text-[9px] sm:text-[10px] md:text-base mb-0.5 md:mb-1 flex items-center gap-0.5 md:gap-1">
                <MapPin className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-green-600 flex-shrink-0" />
                <span>Giao đến</span>
              </h4>
              <div className="text-[9px] sm:text-[10px] md:text-base text-gray-700 space-y-0.5 md:space-y-1">
                <p className="font-medium text-gray-900 text-[9px] sm:text-[10px] md:text-base">{orderInfo.address.fullName}</p>
                <p className="flex items-center gap-0.5 md:gap-1 text-gray-600 break-all">
                  <Phone className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-gray-500 flex-shrink-0" />
                  <span className="text-[8px] sm:text-[9px] md:text-sm">{orderInfo.address.phone}</span>
                </p>
                <p className="text-[9px] sm:text-[10px] md:text-base break-words text-gray-600 leading-tight md:leading-normal">
                  {orderInfo.address.address}
                </p>
              </div>
            </div>
          )}

      {/* Xem chi tiết Button */}
          {orderInfo.orderLink && (
            <button
              onClick={handleViewOrder}
          className="w-full py-0.5 sm:py-1 md:py-1.5 px-1.5 sm:px-2 md:px-3 rounded font-semibold text-white text-[9px] sm:text-[10px] md:text-base transition-all duration-300 shadow-sm hover:shadow md:hover:shadow-md transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-0.5 md:gap-1 bg-[#2F5FEB] hover:bg-[#244ACC]"
            >
              <ExternalLink className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 flex-shrink-0" />
              <span>Xem chi tiết</span>
            </button>
          )}
        </div>
      </div>
      </div>
  );
};

export default OrderMessageCard;