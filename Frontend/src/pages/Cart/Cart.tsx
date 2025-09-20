import React from "react";

const products = [
  {
    shop: "TechZone Official",
    items: [
      {
        name: "iPhone 15 Pro Max 256GB - Titan Tự Nhiên",
        price: 29990000,
        oldPrice: 34990000,
        discount: 14,
        qty: 1,
        img: "https://tse3.mm.bing.net/th/id/OIP.Qp1LQqGkThPjM23l7crnQQHaHa?pid=Api&P=0&h=220",
      },
      {
        name: "AirPods Pro 2nd Generation",
        price: 5490000,
        oldPrice: 6490000,
        discount: 15,
        qty: 2,
        img: "https://tse2.mm.bing.net/th/id/OIP.VImC6cFIwZIH_Lkh2jXajwHaE8?pid=Api&P=0&h=220",
      },
    ],
  },
  {
    shop: "Apple Store Vietnam",
    items: [
      {
        name: "MacBook Air M3 13 inch – Space Gray",
        price: 25990000,
        oldPrice: 28990000,
        discount: 10,
        qty: 1,
        img: "https://tse1.mm.bing.net/th/id/OIP.SImPaTuytF9aRNeo3mY8AQHaG_?pid=Api&P=0&h=220",
      },
    ],
  },
];

export default function CartPage() {
  return (
    <div className="bg-gray-100 min-h-screen py-8 font-sans">
      <div className="max-w-6xl mx-auto flex gap-6">
        {/* Left: Cart Items */}
        <div className="flex-1">
          {/* Header */}
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Giỏ hàng</h1>
            <div className="flex items-center gap-4">
              <button className="text-blue-600 font-medium hover:underline">
                Tiếp tục mua sắm
              </button>
              <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-blue-600 w-5 h-5"
                  checked
                  readOnly
                />
                <span>Chọn tất cả (3/3)</span>
              </label>
              <button className="text-red-500 font-medium hover:underline">
                Xóa đã chọn
              </button>
            </div>
          </div>

          {/* Product List */}
          <div className="space-y-6">
            {products.map((shop, idx) => (
              <div key={shop.shop} className="bg-white rounded-lg shadow">
                {/* Shop Name */}
                <div className="flex items-center px-6 py-3 border-b">
                  <svg
                    className="w-5 h-5 text-blue-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M3 7V6a3 3 0 013-3h12a3 3 0 013 3v1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3 7h18v11a3 3 0 01-3 3H6a3 3 0 01-3-3V7z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="font-semibold text-gray-800">{shop.shop}</span>
                </div>
                {/* Items */}
                {shop.items.map((item, i) => (
                  <div
                    key={item.name}
                    className={`flex items-center px-6 py-4 ${
                      i !== shop.items.length - 1 ? "border-b" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-blue-600 w-5 h-5 mr-4"
                      checked
                      readOnly
                    />
                    <img
                      src={item.img}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded border mr-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-bold text-red-500">
                          {item.price.toLocaleString("vi-VN")}₫
                        </span>
                        <span className="text-gray-400 line-through text-sm">
                          {item.oldPrice.toLocaleString("vi-VN")}₫
                        </span>
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded font-semibold ml-2">
                          -{item.discount}%
                        </span>
                      </div>
                    </div>
                    {/* Quantity */}
                    <div className="flex items-center gap-2 mx-6">
                      <button className="w-8 h-8 border rounded text-lg text-gray-600 hover:bg-gray-100">
                        -
                      </button>
                      <span className="w-8 text-center">{item.qty}</span>
                      <button className="w-8 h-8 border rounded text-lg text-gray-600 hover:bg-gray-100">
                        +
                      </button>
                    </div>
                    {/* Delete */}
                    <button className="ml-4 text-gray-400 hover:text-red-500">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M6 18L18 6M6 6l12 12"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="w-[350px]">
          {/* Promo Code */}
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <div className="font-semibold mb-2">Mã giảm giá</div>
            <div className="flex">
              <input
                type="text"
                placeholder="Nhập mã giảm giá"
                className="flex-1 border rounded-l px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button className="bg-blue-600 text-white px-4 rounded-r hover:bg-blue-700 font-medium">
                Áp dụng
              </button>
            </div>
          </div>
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <div className="font-semibold text-lg mb-4">Tóm tắt đơn hàng</div>
            <div className="flex justify-between text-gray-700 mb-2">
              <span>Tạm tính</span>
              <span className="font-medium">66.960.000₫</span>
            </div>
            <div className="flex justify-between text-gray-700 mb-2">
              <span>Giảm giá</span>
              <span className="text-red-500 font-medium">-10.000.000₫</span>
            </div>
            <div className="flex justify-between text-gray-700 mb-4">
              <span>Phí vận chuyển</span>
              <span className="text-green-600 font-medium">Miễn phí</span>
            </div>
            <div className="border-t pt-4 flex justify-between items-center text-lg font-bold">
              <span>Tổng cộng</span>
              <span className="text-red-500">66.960.000₫</span>
            </div>
            <button className="w-full mt-6 bg-blue-600 text-white py-3 rounded font-semibold text-lg hover:bg-blue-700 transition">
              Đăng nhập để thanh toán
            </button>
          </div>
          {/* Secure Payment */}
          <div className="flex items-center gap-2 text-gray-500 text-sm mt-2 justify-center">
            <svg
              className="w-5 h-5 text-green-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                d="M12 11c1.657 0 3-1.343 3-3V6a3 3 0 10-6 0v2c0 1.657 1.343 3 3 3z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5 11v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Thanh toán an toàn với nhiều phương thức bảo mật
          </div>
        </div>
      </div>
    </div>
  );
}
