import React, { useState } from "react";

interface PriceFilterProps {
  selectedPrice: string;
  setSelectedPrice: (value: string) => void;
}

const PriceFilter: React.FC<PriceFilterProps> = ({
  selectedPrice,
  setSelectedPrice,
}) => {
  const [price, setPrice] = useState(25); // giá tối đa (triệu)
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");

  // Thanh trượt giá tối đa
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setPrice(value);
    setSelectedPrice(`0-${value * 1_000_000}`);
  };

  const handleReset = () => {
    setSelectedPrice("");
    setPrice(25);
    setMinPrice("");
    setMaxPrice("");
  };

  // Format số có dấu chấm
  const formatNumber = (value: number | "") => {
    if (value === "" || isNaN(Number(value))) return "";
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Xử lý nhập giá
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setMinPrice(raw === "" ? "" : Number(raw));
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setMaxPrice(raw === "" ? "" : Number(raw));
  };

  const handleApplyRange = () => {
    if (minPrice === "" || maxPrice === "") {
      alert("Vui lòng nhập đầy đủ giá tối thiểu và tối đa!");
      return;
    }
    if (Number(minPrice) < 0 || Number(maxPrice) < 0) {
      alert("Giá không được âm!");
      return;
    }
    if (Number(minPrice) >= Number(maxPrice)) {
      alert("Giá tối thiểu phải nhỏ hơn giá tối đa!");
      return;
    }
    setSelectedPrice(`${minPrice}-${maxPrice}`);
    setIsPopupOpen(false);
  };

  return (
    <div className="w-full">
      {/* Thanh kéo chọn giá tối đa */}
      <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">Khoảng giá:</span>
          <span className="font-bold text-lg text-blue-600">
            0 - {(price * 1_000_000).toLocaleString("vi-VN")}₫
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="50"
          step="1"
          value={price}
          onChange={handleSliderChange}
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
              (price / 50) * 100
            }%, #e0e7ff ${(price / 50) * 100}%, #e0e7ff 100%)`,
          }}
          className="w-full h-3 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Lọc nhanh theo mức giá cố định */}
      <div className="flex flex-col gap-2 mb-6">
        {[
          { label: "Dưới 1 triệu", value: "duoi1tr" },
          { label: "Từ 1 - 5 triệu", value: "1-5tr" },
          { label: "Từ 5 - 10 triệu", value: "5-10tr" },
          { label: "Trên 10 triệu", value: "tren10tr" },
        ].map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border-2 transition-all duration-300 ${
              selectedPrice === opt.value
                ? "border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-semibold shadow-md"
                : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-700"
            }`}
          >
            <input
              type="radio"
              name="price"
              value={opt.value}
              checked={selectedPrice === opt.value}
              onChange={(e) => setSelectedPrice(e.target.value)}
              className="accent-blue-500 w-4 h-4"
            />
            <span className="text-sm font-medium flex-1">{opt.label}</span>
          </label>
        ))}
      </div>

      {/* Nút hành động */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleReset}
          className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 shadow-sm hover:shadow-md"
        >
          Xóa lọc
        </button>
        <button
          onClick={() => setIsPopupOpen(true)}
          className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
        >
          Lọc khoảng giá tùy chỉnh
        </button>
      </div>

      {/* Popup nhập khoảng giá */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 w-96 shadow-2xl animate-scale-in border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 gradient-text">
                Nhập khoảng giá
              </h3>
              <button
                onClick={() => setIsPopupOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all duration-300 text-gray-600 hover:text-gray-900"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-5 mb-6">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Giá tối thiểu
                </label>
                <input
                  type="text"
                  value={formatNumber(minPrice)}
                  onChange={handleMinChange}
                  placeholder="VD: 0"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 text-gray-700"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Giá tối đa
                </label>
                <input
                  type="text"
                  value={formatNumber(maxPrice)}
                  onChange={handleMaxChange}
                  placeholder="VD: 20.000.000"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 text-gray-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsPopupOpen(false)}
                className="px-6 py-2.5 text-sm font-semibold border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
              >
                Hủy
              </button>
              <button
                onClick={handleApplyRange}
                className="px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceFilter;
