import React from "react";

export default function ChatInterface() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <div className="w-1/4 bg-white border-r p-4">
        <h2 className="text-lg font-semibold mb-4">Danh sách chat</h2>
        <ul className="space-y-3">
          {["TechZone Official Store", "Nguyễn Văn A", "Fashion House", "Hỗ trợ khách hàng"].map((name) => (
            <li key={name} className="p-2 rounded-lg hover:bg-gray-200 cursor-pointer bg-gray-100 font-medium">
              {name}
            </li>
          ))}
        </ul>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col justify-between p-6">
        <div className="space-y-4">
          <div className="text-sm text-gray-500">14:30</div>
          <div className="bg-blue-100 p-3 rounded-lg w-fit max-w-md">Chào bạn! Cảm ơn bạn đã quan tâm đến sản phẩm của chúng tôi</div>

          <div className="text-sm text-gray-500 text-right">14:32</div>
          <div className="bg-green-100 p-3 rounded-lg w-fit max-w-md ml-auto">Cho tôi hỏi sản phẩm này có bảo hành không ạ?</div>

          <div className="text-sm text-gray-500">14:33</div>
          <div className="bg-blue-100 p-3 rounded-lg w-fit max-w-md">
            Dạ có bảo hành 12 tháng chính hãng ạ
            <div className="mt-3 border-t pt-3">
              <div className="font-semibold">iPhone 15 Pro Max</div>
              <div>256GB</div>
              <div className="text-red-500 font-bold">29,990,000đ</div>
              <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Xem sản phẩm</button>
            </div>
          </div>

          <div className="text-sm text-gray-500 text-right">14:38</div>
          <div className="bg-green-100 p-3 rounded-lg w-fit max-w-md ml-auto">Ok, tôi sẽ đặt hàng ngay</div>

          <div className="text-sm text-gray-500">14:45</div>
          <div className="bg-blue-100 p-3 rounded-lg w-fit max-w-md">Chào bạn! Sản phẩm của bạn đã sẵn sàng giao hàng</div>
        </div>

        {/* Input Area */}
        <div className="mt-6 flex">
          <input
            type="text"
            placeholder="Nhập tin nhắn..."
            className="flex-1 p-3 border rounded-l-lg focus:outline-none"
          />
          <button className="px-4 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600">Gửi</button>
        </div>
      </div>
    </div>
  );
}