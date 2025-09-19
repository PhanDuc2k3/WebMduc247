import React, { useState } from "react";
import { Heart } from "lucide-react";

const ProductDetail: React.FC = () => {
  const [quantity, setQuantity] = useState(1);

  const colors = ["Titan Tự Nhiên", "Titan Xanh", "Titan Trắng", "Titan Đen"];
  const storages = ["256GB", "512GB", "1TB"];

  // Danh sách ảnh sản phẩm
  const images = [
    "https://tse3.mm.bing.net/th/id/OIP.Qp1LQqGkThPjM23l7crnQQHaHa?pid=Api&P=0&h=220",
    "https://tse2.mm.bing.net/th/id/OIP.VImC6cFIwZIH_Lkh2jXajwHaE8?pid=Api&P=0&h=220",
    "https://tse3.mm.bing.net/th/id/OIP.hv_GZ3hpO0H8Cf_GHSQSSAHaF7?pid=Api&P=0&h=220",
    "https://tse1.mm.bing.net/th/id/OIP.SImPaTuytF9aRNeo3mY8AQHaG_?pid=Api&P=0&h=220",
  ];

  const [mainImage, setMainImage] = useState(images[0]);

  return (
    <div className="max-w-6xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ảnh sản phẩm */}
        <div className="flex flex-col items-center">
          {/* Ảnh lớn */}
          <div className="w-full max-w-sm mb-4">
            <img
              src={mainImage}
              alt="iPhone 15 Pro Max"
              className="w-full h-[350px] object-contain rounded-md border"
            />
          </div>

          {/* Ảnh nhỏ */}
          <div className="flex gap-2 flex-wrap justify-center">
            {images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`thumb-${idx}`}
                className={`w-16 h-16 object-contain rounded-md border cursor-pointer transition ${
                  mainImage === img ? "border-blue-500" : "hover:border-gray-400"
                }`}
                onClick={() => setMainImage(img)}
              />
            ))}
          </div>
        </div>

        {/* Thông tin sản phẩm */}
        <div>
          <h1 className="text-2xl font-semibold mb-2">
            iPhone 15 Pro Max 256GB - Chính hãng VNA
          </h1>
          <div className="text-sm text-gray-600 mb-4">⭐ 4.8 (1234 đánh giá)</div>

          <div className="text-red-600 text-xl font-bold">
            29.990.000₫
            <span className="text-gray-500 line-through text-base ml-2">
              34.990.000₫
            </span>
          </div>

          {/* Màu sắc */}
          <div className="mt-4">
            <h3 className="font-medium mb-2">Chọn màu sắc:</h3>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <button
                  key={color}
                  className="px-3 py-1 border rounded hover:bg-gray-100"
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          {/* Dung lượng */}
          <div className="mt-4">
            <h3 className="font-medium mb-2">Chọn dung lượng:</h3>
            <div className="flex gap-2">
              {storages.map((s) => (
                <button
                  key={s}
                  className={`px-3 py-1 border rounded hover:bg-gray-100 ${
                    s === "256GB" ? "border-blue-500" : ""
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Số lượng */}
          <div className="mt-4">
            <h3 className="font-medium mb-2">Số lượng:</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-1 border rounded"
              >
                -
              </button>
              <span>{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-3 py-1 border rounded"
              >
                +
              </button>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="mt-6 flex gap-3 flex-wrap">
            <button className="flex items-center gap-1 px-4 py-2 border rounded hover:bg-gray-100">
              <Heart size={18} />
              Yêu thích
            </button>
            <button className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
              Thêm vào giỏ
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Mua ngay
            </button>
          </div>

          {/* Thông tin thêm */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-700">
            <div>📦 Bảo hành chính hãng 12 tháng</div>
            <div>🚚 Miễn phí vận chuyển (Đơn từ 500K)</div>
            <div>💳 Miễn phí trả góp</div>
          </div>

          {/* Người bán */}
          <div className="mt-6 text-sm text-gray-600">
            Người bán: <span className="font-medium">TechZone</span> - Hà Nội
          </div>
        </div>
      </div>

      {/* Mô tả sản phẩm */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Mô tả sản phẩm</h3>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>Chip A17 Pro 3nm – Hiệu năng vượt trội</li>
          <li>Camera chính 48MP với zoom quang học 5x</li>
          <li>Màn hình Promotion 120Hz</li>
          <li>Khung titan cực bền, nhẹ</li>
          <li>Cổng USB-C tiện lợi</li>
        </ul>
      </div>
    </div>
  );
};

export default ProductDetail;
