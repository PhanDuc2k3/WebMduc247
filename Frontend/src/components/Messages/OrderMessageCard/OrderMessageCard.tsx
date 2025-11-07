import React from "react";
import { useNavigate } from "react-router-dom";
import { Package, MapPin, CreditCard, Truck, ExternalLink } from "lucide-react";

interface OrderMessageCardProps {
  message: string;
  isMine?: boolean;
}

const OrderMessageCard: React.FC<OrderMessageCardProps> = ({ message, isMine = false }) => {
  const navigate = useNavigate();

  // Parse message để extract thông tin order
  const parseOrderMessage = (text: string) => {
    const orderCodeMatch = text.match(/#([A-Z0-9-]+)/);
    const orderCode = orderCodeMatch ? orderCodeMatch[1] : "";

    // Extract sản phẩm - improved regex to handle various formats
    const productsSection = text.match(/🛍️ Sản phẩm:\s*\n((?:\d+\.\s*.+?\s*x\d+\s*-\s*.+?₫\s*\n?)+)/);
    const products: Array<{ name: string; quantity: number; price: string }> = [];
    if (productsSection) {
      const productLines = productsSection[1].trim().split("\n").filter(line => line.trim());
      productLines.forEach((line) => {
        // Match pattern: "1. Product Name x2 - 100,000₫"
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

    // Extract chi tiết thanh toán - improved regex (handle "- " prefix)
    const subtotalMatch = text.match(/[- ]*Tạm tính:\s*(.+?₫)/);
    const shippingMatch = text.match(/[- ]*Phí vận chuyển:\s*(.+?₫)/);
    const discountMatch = text.match(/[- ]*Giảm giá:\s*-?(.+?₫)/);
    const totalMatch = text.match(/[- ]*Tổng tiền:\s*(.+?₫)/);
    const paymentMethodMatch = text.match(/💳 Phương thức thanh toán:\s*(.+?)(?:\n|$)/);
    const statusMatch = text.match(/📊 Trạng thái:\s*(.+?)(?:\n|$)/);

    // Extract địa chỉ - improved to handle multiline
    const addressSection = text.match(/📍 Địa chỉ giao hàng:\s*\n(.+?)\n(.+?)\n(.+?)(?:\n\n|$)/);
    const address = addressSection
      ? {
          fullName: addressSection[1].trim(),
          phone: addressSection[2].trim(),
          address: addressSection[3].trim(),
        }
      : null;

    // Extract link - improved regex
    const linkMatch = text.match(/Xem chi tiết đơn hàng:\s*(.+?)(?:\n|$)/);
    const orderLink = linkMatch ? linkMatch[1].trim() : "";

    return {
      orderCode,
      products,
      subtotal: subtotalMatch ? subtotalMatch[1].trim() : "",
      shippingFee: shippingMatch ? shippingMatch[1].trim() : "",
      discount: discountMatch ? discountMatch[1].trim() : "",
      total: totalMatch ? totalMatch[1].trim() : "",
      paymentMethod: paymentMethodMatch ? paymentMethodMatch[1].trim() : "",
      status: statusMatch ? statusMatch[1].trim() : "",
      address,
      orderLink,
    };
  };

  const orderInfo = parseOrderMessage(message);

  // Chỉ hiển thị card nếu có order code
  if (!orderInfo.orderCode) {
    return (
      <div className="font-medium whitespace-pre-wrap">{message}</div>
    );
  }

  const statusColors: Record<string, string> = {
    "Đã đặt hàng": "bg-gray-100 text-gray-800",
    "Đã xác nhận": "bg-blue-100 text-blue-800",
    "Đã đóng gói": "bg-purple-100 text-purple-800",
    "Đang vận chuyển": "bg-yellow-100 text-yellow-800",
    "Đã giao hàng": "bg-green-100 text-green-800",
    "Đã nhận hàng": "bg-emerald-100 text-emerald-800",
    "Đã hủy": "bg-red-100 text-red-800",
  };

  const handleViewOrder = () => {
    if (orderInfo.orderLink) {
      const orderId = orderInfo.orderLink.split("/order/")[1];
      if (orderId) {
        navigate(`/order/${orderId}`);
      }
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Order Card */}
      <div
        className={`rounded-2xl shadow-xl border-2 overflow-hidden ${
          isMine
            ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
            : "bg-gradient-to-br from-white to-gray-50 border-gray-200"
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b-2 ${
            isMine
              ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
              : "bg-gradient-to-r from-purple-500 to-pink-600 text-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={20} />
              <span className="font-bold text-lg">Đơn hàng #{orderInfo.orderCode}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Products */}
          {orderInfo.products.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <span>🛍️</span> Sản phẩm
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {orderInfo.products.map((product, index) => (
                  <div
                    key={index}
                    className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Số lượng: {product.quantity}
                        </p>
                      </div>
                      <p className="font-bold text-blue-600 text-sm ml-2">
                        {product.price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <CreditCard size={16} />
              Chi tiết thanh toán
            </h4>
            <div className="space-y-1 text-sm">
              {orderInfo.subtotal && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tạm tính:</span>
                  <span className="font-semibold text-gray-900">{orderInfo.subtotal}</span>
                </div>
              )}
              {orderInfo.shippingFee && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Phí vận chuyển:</span>
                  <span className="font-semibold text-gray-900">{orderInfo.shippingFee}</span>
                </div>
              )}
              {orderInfo.discount && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá:</span>
                  <span className="font-semibold">-{orderInfo.discount}</span>
                </div>
              )}
              {orderInfo.total && (
                <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
                  <span className="font-bold text-gray-900">Tổng tiền:</span>
                  <span className="font-bold text-lg text-blue-600">{orderInfo.total}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method & Status */}
          <div className="grid grid-cols-2 gap-2">
            {orderInfo.paymentMethod && (
              <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Phương thức</p>
                <p className="font-semibold text-gray-900 text-sm">{orderInfo.paymentMethod}</p>
              </div>
            )}
            {orderInfo.status && (
              <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Trạng thái</p>
                <span
                  className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold ${
                    statusColors[orderInfo.status] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {orderInfo.status}
                </span>
              </div>
            )}
          </div>

          {/* Address */}
          {orderInfo.address && (
            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <MapPin size={16} />
                Địa chỉ giao hàng
              </h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-semibold">{orderInfo.address.fullName}</p>
                <p>📞 {orderInfo.address.phone}</p>
                <p className="text-xs">{orderInfo.address.address}</p>
              </div>
            </div>
          )}

          {/* View Order Button */}
          {orderInfo.orderLink && (
            <button
              onClick={handleViewOrder}
              className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 ${
                isMine
                  ? "bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800"
                  : "bg-gradient-to-r from-purple-600 to-pink-700 hover:from-purple-700 hover:to-pink-800"
              }`}
            >
              <ExternalLink size={18} />
              <span>Xem chi tiết đơn hàng</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderMessageCard;

