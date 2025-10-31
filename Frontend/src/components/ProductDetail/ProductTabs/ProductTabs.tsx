import React, { useState, useEffect } from "react";
import reviewApi from "../../../api/apiReview";
import productApi from "../../../api/productApi"; // 🔹 Thêm API để lấy product

interface Review {
  _id: string;
  userInfo: {
    fullName: string;
    avatarUrl?: string;
  };
  rating: number;
  comment: string;
  images?: string[];
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  description: string;
}

const ProductTabs: React.FC<{ productId: string }> = ({ productId }) => {
  const [active, setActive] = useState<"mo-ta" | "danh-gia">("mo-ta");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);

  // 🔹 Lấy mô tả sản phẩm từ DB
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await productApi.getProductById(productId);
        setProduct(res.data.data);
        console.log("data: ",res.data)
      } catch (err) {
        console.error("Lỗi khi fetch product:", err);
      }
    };
    fetchProduct();
  }, [productId]);

  // 🔹 Lấy đánh giá khi chọn tab "Đánh giá"
  useEffect(() => {
    const fetchReviews = async () => {
      if (active !== "danh-gia") return;
      try {
        setLoadingReviews(true);
        const res = await reviewApi.getReviewsByProduct(productId);
        setReviews(res.data);
      } catch (err) {
        console.error("Lỗi khi fetch reviews:", err);
      } finally {
        setLoadingReviews(false);
      }
    };
    fetchReviews();
  }, [active, productId]);

  const tabs = [
    { id: "mo-ta", label: "Mô tả" },
    { id: "danh-gia", label: "Đánh giá" },
  ] as const;

  const getFullUrl = (path?: string) =>
    path?.startsWith("http") ? path : `http://localhost:5000${path}`;

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
        {/* 🔹 Mô tả từ DB */}
        {active === "mo-ta" && (
          <div>
            {product ? (
              <p className="text-gray-700">{product.description}</p>
            ) : (
              <p className="text-gray-400 italic">Đang tải mô tả...</p>
            )}
          </div>
        )}

        {/* 🔹 Đánh giá */}
        {active === "danh-gia" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg text-gray-800">Đánh giá từ khách hàng</h3>
            {loadingReviews ? (
              <p>Đang tải đánh giá...</p>
            ) : reviews.length === 0 ? (
              <p className="text-gray-500">Chưa có đánh giá nào</p>
            ) : (
              reviews.map((r) => (
                <div key={r._id} className="border-b pb-4">
                  <div className="flex items-start gap-4">
                    {r.userInfo.avatarUrl ? (
                      <img
                        src={getFullUrl(r.userInfo.avatarUrl)}
                        alt={r.userInfo.fullName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">
                        {r.userInfo.fullName[0]}
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{r.userInfo.fullName}</span>
                        <span className="text-yellow-500 text-sm">{"⭐".repeat(r.rating)}</span>
                      </div>

                      <p className="text-gray-700 text-sm mt-1">{r.comment}</p>

                      {(r.images ?? []).length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {(r.images ?? []).map((img, i) => (
                            <img
                              key={i}
                              src={getFullUrl(img)}
                              alt="review"
                              className="w-16 h-16 object-cover rounded"
                            />
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductTabs;
