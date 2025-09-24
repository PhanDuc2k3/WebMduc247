import React from "react";

const StoreInfo: React.FC = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
    <div>
      <p className="font-semibold">Đánh giá:</p>
      <p>⭐ 4.8 / 5 (12,680 đánh giá)</p>
    </div>
    <div>
      <p className="font-semibold">Phản hồi:</p>
      <p>⏱ Trong vòng 1 giờ</p>
    </div>
    <div>
      <p className="font-semibold">Tỷ lệ phản hồi:</p>
      <p>📈 98%</p>
    </div>
    <div>
      <p className="font-semibold">Địa điểm:</p>
      <p>📍 Hà Nội</p>
    </div>
  </div>
);

export default StoreInfo;
