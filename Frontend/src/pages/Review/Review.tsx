import React, { useState, useEffect } from "react";

interface ProductReviewModalProps {
  productId: string;
  orderId: string;
  onClose: () => void;
}

export default function ProductReviewModal({ productId, orderId, onClose }: ProductReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [media, setMedia] = useState<FileList | null>(null);

  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [productInfo, setProductInfo] = useState({
    name: "",
    variant: "",
    image: "",
    orderCode: "",
    price: "",
    store: "",
  });

  useEffect(() => {
    // TODO: fetch sản phẩm từ API nếu cần
    setProductInfo({
      name: "iPhone 15 Pro Max 256GB",
      variant: "Titanium Tự nhiên",
      image: "https://cdn.tgdd.vn/Products/Images/42/305659/iphone-15-pro-max-blue-thumbnew-600x600.jpg",
      orderCode: "ORD-001",
      price: "29.990.000₫",
      store: "TechZone Official Store",
    });
  }, [productId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      setModalMessage("Vui lòng đánh giá sản phẩm bằng số sao!");
      setModalOpen(true);
      return;
    }

    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("rating", rating.toString());
    formData.append("comment", reviewText);
    if (media) Array.from(media).forEach((file) => formData.append("images", file));

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/review/${orderId}/reviews`, {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        body: formData,
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {}

      if (res.ok) {
        setModalMessage("Đánh giá đã được gửi!");
        setModalOpen(true);
        setRating(0);
        setReviewText("");
        setMedia(null);
      } else {
        setModalMessage("Gửi thất bại: " + (data.message || "Lỗi server"));
        setModalOpen(true);
      }
    } catch (err) {
      console.error(err);
      setModalMessage("Lỗi khi gửi review!");
      setModalOpen(true);
    }
  };

  const handleCloseModalMessage = () => setModalOpen(false);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6 relative space-y-4">
        {/* Nút đóng modal */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 font-bold text-lg"
        >
          ✕
        </button>

        <h1 className="text-2xl font-bold text-gray-800">Đánh giá sản phẩm</h1>

        {/* Product Info */}
        <div className="flex justify-between items-start space-x-4">
          <div className="flex items-start space-x-4">
            {productInfo.image ? (
              <img
                src={productInfo.image}
                alt={productInfo.name}
                className="w-20 h-20 object-cover rounded"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-gray-500">
                No Image
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold">{productInfo.name}</h2>
              <p className="text-sm text-gray-500">{productInfo.variant}</p>
              <p className="text-xs text-gray-400">Mã đơn hàng: {productInfo.orderCode}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-red-600">{productInfo.price}</p>
            <p className="text-sm text-blue-600 font-medium">{productInfo.store}</p>
          </div>
        </div>

        {/* Rating */}
        <div>
          <p className="text-sm font-medium mb-1">Đánh giá sao:</p>
          <div className="flex space-x-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-2xl ${rating >= star ? "text-yellow-400" : "text-gray-300"}`}
              >
                ★
              </button>
            ))}
          </div>

          {/* Review Text */}
          <textarea
            rows={4}
            placeholder="Chia sẻ thêm về sản phẩm..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />

          {/* Upload Media */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Tải lên hình ảnh / video:</label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => setMedia(e.target.files)}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Submit */}
          <div className="text-center">
            <button
              onClick={handleSubmit}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
            >
              Gửi đánh giá
            </button>
          </div>
        </div>

        {/* Modal thông báo */}
        {modalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center space-y-4">
              <p>{modalMessage}</p>
              <button
                onClick={handleCloseModalMessage}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
