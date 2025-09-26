import React, { useState } from "react";

const ProductTabs: React.FC = () => {
  // Quản lý tab đang được chọn
  const [active, setActive] = useState<"mo-ta" | "thong-so" | "danh-gia">("mo-ta");

  // Danh sách tab
  const tabs = [
    { id: "mo-ta", label: "Mô tả" },
    { id: "thong-so", label: "Thông số" },
    { id: "danh-gia", label: "Đánh giá" },
  ] as const;

  return (
    <div className="w-full max-w-screen-xl mx-auto mt-10">
      {/* Thanh chọn tab */}
      <div className="flex space-x-3 bg-gray-100 p-1 rounded-full w-fit mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-5 py-1 text-sm font-medium rounded-full border transition-colors duration-200
              ${
                active === tab.id
                  ? "bg-white text-blue-600 border-blue-600 shadow-sm"
                  : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-white hover:text-blue-500"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Nội dung tab */}
      <div className="p-6 bg-white border rounded-lg shadow text-sm text-gray-800 leading-relaxed">
        {/* Tab Mô tả */}
        {active === "mo-ta" && (
          <>
            <p className="mb-3">
              iPhone 15 Pro Max là đỉnh cao của công nghệ di động với chip A17 Pro mạnh mẽ và hệ
              thống camera tiên tiến. Thiết kế titan cao cấp mang đến sự bền bỉ và sang trọng.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Chip A17 Pro 3nm – Hiệu năng vượt trội</li>
              <li>Camera chính 48MP với zoom quang học 5x</li>
              <li>Màn hình ProMotion 120Hz</li>
              <li>Khung titan cực bền, nhẹ</li>
              <li>Cổng USB-C tiện lợi</li>
            </ul>
          </>
        )}

        {/* Tab Thông số */}
        {active === "thong-so" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
            <p>
              <span className="font-medium">Màn hình:</span> 6.7 inch, Super Retina XDR OLED
            </p>
            <p>
              <span className="font-medium">Chip:</span> A17 Pro
            </p>
            <p>
              <span className="font-medium">Camera:</span> 48MP + 12MP ultra wide + 12MP telephoto
            </p>
            <p>
              <span className="font-medium">Pin:</span> 4441 mAh
            </p>
            <p>
              <span className="font-medium">Hệ điều hành:</span> iOS 17
            </p>
          </div>
        )}

        {/* Tab Đánh giá */}
        {active === "danh-gia" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg text-gray-800">Đánh giá từ khách hàng</h3>

            {[1, 2, 3].map((id) => (
              <div key={id} className="border-b pb-4">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">
                    {`K${id}`}
                  </div>

                  <div className="flex-1">
                    {/* Tên + sao */}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">Khách hàng #{id}</span>
                      <span className="text-yellow-500 text-sm">⭐⭐⭐⭐⭐</span>
                    </div>

                    {/* Nội dung đánh giá */}
                    <p className="text-gray-700 text-sm mt-1">
                      Sản phẩm tuyệt vời, chất lượng đúng như mô tả. Giao hàng nhanh, đóng gói cẩn
                      thận.
                    </p>

                    {/* Thời gian */}
                    <p className="text-xs text-gray-500 mt-1">2 ngày trước</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductTabs;
