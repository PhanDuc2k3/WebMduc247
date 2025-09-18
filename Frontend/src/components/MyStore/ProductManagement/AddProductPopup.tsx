import React, { useState } from "react";

// Popup form component
const AddProductPopup: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 relative">
        {/* Nút đóng */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-black text-xl"
          onClick={onClose}
        >
          ×
        </button>

        {/* Thanh tiến trình */}
        <div className="flex items-center mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  step >= s
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {s}
              </div>
              {s < 4 && (
                <div className="w-10 h-1 bg-gray-200 mx-2 rounded-full">
                  <div
                    className={`h-1 rounded-full ${
                      step > s ? "bg-blue-500" : ""
                    }`}
                  ></div>
                </div>
              )}
            </div>
          ))}
          <span className="ml-4 text-gray-500 font-medium">
            Bước {step}/4
          </span>
        </div>

        {/* Step 1: Thông tin cơ bản */}
        {step === 1 && (
          <>
            <div className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span>📦</span> Thông tin cơ bản
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium">Tên sản phẩm *</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: iPhone 15 Pro Max 256GB"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Thương hiệu</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: Apple, Samsung, Nike..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Danh mục *</label>
                <select className="w-full border rounded px-3 py-2 mt-1 bg-gray-50">
                  <option>Chọn danh mục</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Danh mục con</label>
                <select className="w-full border rounded px-3 py-2 mt-1 bg-gray-50">
                  <option>Chọn danh mục con</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Giá bán *</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  type="number"
                  placeholder="$ 0"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Giá gốc</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  type="number"
                  placeholder="$ 0"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Số lượng tồn kho</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  type="number"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Model/Mã sản phẩm</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: A2484, SM-G998B..."
                />
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button
                className="bg-gray-100 px-4 py-2 rounded font-medium"
                onClick={onClose}
              >
                Hủy
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded font-medium"
                onClick={() => setStep(2)}
              >
                Tiếp tục
              </button>
            </div>
          </>
        )}

        {/* Step 2: Mô tả & Hình ảnh */}
        {step === 2 && (
          <>
            <div className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span>📝</span> Mô tả & Hình ảnh
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium">Mô tả sản phẩm *</label>
              <textarea
                className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                rows={2}
                placeholder="Mô tả chi tiết về sản phẩm, tính năng, ưu điểm..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="border rounded-lg p-4 flex flex-col items-center">
                <div className="text-gray-400 mb-2">
                  Ảnh chính sản phẩm
                  <br />
                  Tỷ lệ 1:1 (khuyến nghị)
                </div>
                <button className="bg-gray-100 px-4 py-2 rounded font-medium text-gray-700 hover:bg-gray-200">
                  <span className="mr-2">⬆️</span> Chọn ảnh chính
                </button>
              </div>
              <div className="border rounded-lg p-4 flex flex-col items-center">
                <div className="text-gray-400 mb-2">
                  Ảnh phụ (tùy chọn)
                  <br />
                  Tối đa 8 ảnh
                </div>
                <button className="bg-gray-100 px-4 py-2 rounded font-medium text-gray-700 hover:bg-gray-200">
                  <span className="mr-2">⬆️</span> Thêm ảnh phụ
                </button>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium">Tính năng nổi bật</label>
              <div className="flex gap-2">
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: Camera 48MP chuyên nghiệp"
                />
                <button className="bg-gray-100 px-3 py-2 rounded font-medium">
                  +
                </button>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button
                className="bg-gray-100 px-4 py-2 rounded font-medium"
                onClick={() => setStep(1)}
              >
                Quay lại
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded font-medium"
                onClick={() => setStep(3)}
              >
                Tiếp tục
              </button>
            </div>
          </>
        )}

        {/* Step 3: Thông số kỹ thuật */}
        {step === 3 && (
          <>
            <div className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span>⚙️</span> Thông số kỹ thuật
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium">Màu sắc</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: Đen, Trắng, Xanh..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kích thước</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: 160.7 x 77.6 x 7.8 mm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Trọng lượng</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: 240g"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Chất liệu</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: Nhôm, Nhựa, Da..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Xuất xứ</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: Việt Nam, Trung Quốc..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Bảo hành</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: 12 tháng, 2 năm..."
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Thông số chi tiết</label>
                <div className="flex gap-2">
                  <input
                    className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                    placeholder="Tên thông số (VD: CPU)"
                  />
                  <input
                    className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                    placeholder="Giá trị (VD: A17 Pro Bion)"
                  />
                  <button className="bg-gray-100 px-3 py-2 rounded font-medium">
                    +
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button
                className="bg-gray-100 px-4 py-2 rounded font-medium"
                onClick={() => setStep(2)}
              >
                Quay lại
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded font-medium"
                onClick={() => setStep(4)}
              >
                Tiếp tục
              </button>
            </div>
          </>
        )}

        {/* Step 4: SEO & Thẻ tìm kiếm */}
        {step === 4 && (
          <>
            <div className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span>🔍</span> SEO & Thẻ tìm kiếm
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium">Tiêu đề SEO</label>
              <input
                className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                placeholder="Tiêu đề hiển thị trên kết quả tìm kiếm"
              />
              <div className="text-xs text-gray-400 mt-1">
                Độ dài khuyến nghị: 50-60 ký tự (0/60)
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium">Mô tả SEO</label>
              <input
                className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                placeholder="Mô tả ngắn hiển thị trên kết quả tìm kiếm"
              />
              <div className="text-xs text-gray-400 mt-1">
                Độ dài khuyến nghị: 150-160 ký tự (0/160)
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium">Thẻ tìm kiếm</label>
              <div className="flex gap-2">
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-50"
                  placeholder="VD: smartphone, điện thoại cao cấp..."
                />
                <button className="bg-gray-100 px-3 py-2 rounded font-medium">
                  +
                </button>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700 mb-6">
              <div className="font-semibold mb-2">Lưu ý về SEO</div>
              <ul className="list-disc ml-5 space-y-1">
                <li>
                  Sử dụng từ khóa liên quan để tăng khả năng tìm thấy sản phẩm
                </li>
                <li>Tiêu đề và mô tả nên rõ ràng, hấp dẫn</li>
                <li>
                  Thêm thẻ tìm kiếm phổ biến trong danh mục của sản phẩm
                </li>
              </ul>
            </div>
            <div className="flex justify-between mt-6">
              <button
                className="bg-gray-100 px-4 py-2 rounded font-medium"
                onClick={() => setStep(3)}
              >
                Quay lại
              </button>
              <button className="bg-green-600 text-white px-4 py-2 rounded font-medium">
                Tạo sản phẩm
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddProductPopup;
