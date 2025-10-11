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
    <div className="w-full bg-white rounded-xl ">
      {/* Thanh kéo chọn giá tối đa */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
          <span>Khoảng giá:</span>
          <span className="font-medium text-gray-800">
            0 - {(price * 1_000_000).toLocaleString("vi-VN")} ₫
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
            }%, #bfdbfe ${(price / 50) * 100}%, #bfdbfe 100%)`,
          }}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Lọc nhanh theo mức giá cố định */}
      <div className="flex flex-col gap-3 text-gray-700">
        {[
          { label: "Dưới 1 triệu", value: "duoi1tr" },
          { label: "Từ 1 - 5 triệu", value: "1-5tr" },
          { label: "Từ 5 - 10 triệu", value: "5-10tr" },
          { label: "Trên 10 triệu", value: "tren10tr" },
        ].map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-3 cursor-pointer hover:text-blue-600 transition"
          >
            <input
              type="radio"
              name="price"
              value={opt.value}
              checked={selectedPrice === opt.value}
              onChange={(e) => setSelectedPrice(e.target.value)}
              className="accent-blue-500"
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>

      {/* Nút hành động */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
        >
          Xóa lọc
        </button>
        <button
          onClick={() => setIsPopupOpen(true)}
          className="px-4 py-2 text-sm rounded-md bg-green-500 text-white hover:bg-green-600 transition"
        >
          Lọc khoảng giá
        </button>
      </div>

      {/* Popup nhập khoảng giá */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 text-center">
              Nhập khoảng giá
            </h3>

            <div className="flex flex-col gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-600">Giá tối thiểu</label>
                <input
                  type="text"
                  value={formatNumber(minPrice)}
                  onChange={handleMinChange}
                  placeholder="VD: 0"
                  className="w-full border border-gray-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Giá tối đa</label>
                <input
                  type="text"
                  value={formatNumber(maxPrice)}
                  onChange={handleMaxChange}
                  placeholder="VD: 20.000.000"
                  className="w-full border border-gray-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsPopupOpen(false)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={handleApplyRange}
                className="px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
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
