import React, { useState, useEffect, useRef } from "react";
import reviewApi from "../../api/apiReview";
import productApi from "../../api/productApi";
import orderApi from "../../api/orderApi";
import axiosClient from "../../api/axiosClient";

interface ProductReviewModalProps {
  productId: string;
  orderId: string;
  onClose: () => void;
}

interface ExistingReview {
  _id: string;
  rating: number;
  comment: string;
  images?: string[];
  editCount: number;
}

export default function ProductReviewModal({ productId, orderId, onClose }: ProductReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [media, setMedia] = useState<FileList | null>(null);
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const hasFetchedRef = useRef(false);

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

  // Fetch product info và check existing review
  useEffect(() => {
    // Reset ref when productId or orderId changes
    hasFetchedRef.current = false;
    
    const fetchData = async () => {
      // Prevent double fetching in React Strict Mode
      if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;
      
      try {
        setLoadingData(true);
        
        let product: any = null;
        let order: any = null;
        let orderItem: any = null;

        // Fetch product info
        try {
          console.log("Fetching product with ID:", productId);
          const productRes = await productApi.getProductById(productId);
          console.log("Product response:", productRes);
          product = productRes.data?.data || productRes.data;
          if (!product) {
            throw new Error("Không tìm thấy sản phẩm");
          }
        } catch (err: any) {
          console.error("Error fetching product:", err);
          console.error("Error details:", {
            message: err.message,
            response: err.response?.data,
            status: err.response?.status,
            code: err.code,
          });
          
          // Handle network errors specifically
          if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
            setModalMessage("Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại!");
            setModalOpen(true);
            setLoadingData(false);
            return;
          }
          
          const errorMsg = err.response?.data?.message || err.message || "Không thể tải thông tin sản phẩm";
          setModalMessage(`Lỗi: ${errorMsg}`);
          setModalOpen(true);
          setLoadingData(false);
          return;
        }
        
        // Fetch order info
        try {
          console.log("Fetching order with ID:", orderId);
          const orderRes = await orderApi.getOrderById(orderId);
          console.log("Order response:", orderRes);
          order = orderRes.data || orderRes.data?.data;
          if (!order) {
            throw new Error("Không tìm thấy đơn hàng");
          }
          
          // Find the product item in order
          orderItem = order.items?.find((item: any) => {
            const itemProductId = item.productId?.toString() || item.productId?._id?.toString() || item.productId;
            return itemProductId === productId;
          });
          console.log("Found order item:", orderItem);
        } catch (err: any) {
          console.error("Error fetching order:", err);
          console.error("Order error details:", {
            message: err.message,
            response: err.response?.data,
            status: err.response?.status,
            code: err.code,
          });
          
          // If network error, show message but continue
          if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
            console.warn("Network error fetching order, continuing with product info only");
          } else {
            // If order fetch fails for other reasons, we can still use product info
            console.warn("Continuing with product info only");
          }
        }

        // Format price
        const itemPrice = orderItem?.salePrice || orderItem?.price || product?.price || product?.salePrice || 0;
        const formattedPrice = new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(itemPrice);

        // Get store name
        let storeName = "Cửa hàng";
        try {
          if (product?.store) {
            if (typeof product.store === "object" && product.store.name) {
              storeName = product.store.name;
            } else if (typeof product.store === "string") {
              // Try to fetch store info if needed
              try {
                const storeRes = await axiosClient.get(`/api/stores/${product.store}`);
                storeName = storeRes.data?.store?.name || storeRes.data?.name || "Cửa hàng";
              } catch {
                // Use default store name
              }
            }
          }
        } catch (err) {
          console.warn("Could not fetch store name:", err);
        }

        // Get variation info
        let variantText = "";
        if (orderItem?.variation) {
          const variant = orderItem.variation;
          const parts: string[] = [];
          if (variant.color) parts.push(`Màu: ${variant.color}`);
          if (variant.size) parts.push(`Size: ${variant.size}`);
          variantText = parts.join(", ");
        }

        // Get image URL helper
        const getImageUrl = (img: string) => {
          if (!img) return "";
          if (img.startsWith("http")) return img;
          return `${axiosClient.defaults.baseURL}${img}`;
        };

        setProductInfo({
          name: product.name || orderItem?.name || "Sản phẩm",
          variant: variantText || product.variations?.[0]?.name || "",
          image: getImageUrl(product.images?.[0] || orderItem?.imageUrl || ""),
          orderCode: order?.orderCode || order?._id || orderId || "",
          price: formattedPrice,
          store: storeName,
        });

        // Check if review already exists
        try {
          const reviewRes = await reviewApi.getReviewByUserAndProduct(orderId, productId);
          if (reviewRes.data?.review) {
            const rev = reviewRes.data.review;
            setExistingReview(rev);
            setRating(rev.rating);
            setReviewText(rev.comment || "");
          }
        } catch (err: any) {
          // Review doesn't exist yet (404) - that's fine, ignore it
          // Only log other errors
          if (err.response?.status && err.response.status !== 404) {
            console.error("Error checking review:", err);
          }
          // 404 is expected when no review exists yet, so we silently ignore it
        }
      } catch (err: any) {
        console.error("Error fetching data:", err);
        const errorMsg = err.response?.data?.message || err.message || "Lỗi khi tải thông tin sản phẩm!";
        setModalMessage(`Lỗi: ${errorMsg}`);
        setModalOpen(true);
      } finally {
        setLoadingData(false);
      }
    };

    if (productId && orderId) {
      fetchData();
    }
  }, [productId, orderId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      setModalMessage("Vui lòng đánh giá sản phẩm bằng số sao!");
      setModalOpen(true);
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("productId", productId);
      formData.append("rating", rating.toString());
      formData.append("comment", reviewText);
      if (media) {
        Array.from(media).forEach((file) => formData.append("images", file));
      }

      if (existingReview) {
        // Update existing review
        if (existingReview.editCount >= 1) {
          setModalMessage("Bạn đã sửa đánh giá 1 lần rồi. Không thể sửa thêm.");
          setModalOpen(true);
          setLoading(false);
          return;
        }

        await reviewApi.updateReview(existingReview._id, formData);
        setModalMessage("Cập nhật đánh giá thành công!");
      } else {
        // Create new review
        await reviewApi.createReview(orderId, formData);
        setModalMessage("Đánh giá đã được gửi!");
      }

      setModalOpen(true);
      // Reset form after successful submission
      if (!existingReview) {
        setRating(0);
        setReviewText("");
        setMedia(null);
      }
      
      // Refresh review data
      const reviewRes = await reviewApi.getReviewByUserAndProduct(orderId, productId);
      if (reviewRes.data.review) {
        setExistingReview(reviewRes.data.review);
      }
    } catch (err: any) {
      console.error("Error submitting review:", err);
      const errorMsg = err.response?.data?.message || "Lỗi khi gửi đánh giá!";
      setModalMessage(errorMsg);
      setModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModalMessage = () => {
    setModalOpen(false);
    if (modalMessage?.includes("thành công") || modalMessage?.includes("gửi")) {
      onClose();
    }
  };

  const getFullUrl = (path?: string) => {
    if (!path) return "";
    return path.startsWith("http") ? path : `${axiosClient.defaults.baseURL}${path}`;
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}>
        <div className="bg-white rounded-2xl w-full max-w-2xl p-8 relative">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Đang tải...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl p-8 relative shadow-2xl border-2 border-gray-100 space-y-6">
        {/* Nút đóng modal */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-800 font-bold text-2xl transition-colors duration-200 hover:scale-110 transform"
        >
          ✕
        </button>

        <div className="pr-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {existingReview ? "Chỉnh sửa đánh giá" : "Đánh giá sản phẩm"}
          </h1>
          {existingReview && existingReview.editCount >= 1 && (
            <p className="text-sm text-orange-600 mt-2">⚠️ Bạn đã sửa đánh giá 1 lần. Không thể sửa thêm.</p>
          )}
        </div>

        {/* Product Info */}
        <div className="flex justify-between items-start space-x-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
          <div className="flex items-start space-x-4">
            {productInfo.image ? (
              <img
                src={getFullUrl(productInfo.image)}
                alt={productInfo.name}
                className="w-24 h-24 object-cover rounded-xl shadow-md"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 shadow-md">
                <span className="text-xs">No Image</span>
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-800">{productInfo.name}</h2>
              {productInfo.variant && (
                <p className="text-sm text-gray-600 mt-1">{productInfo.variant}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Mã đơn hàng: {productInfo.orderCode}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
              {productInfo.price}
            </p>
            <p className="text-sm text-blue-600 font-semibold mt-1">{productInfo.store}</p>
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-4">
          <p className="text-base font-semibold text-gray-700">Đánh giá sao:</p>
          <div className="flex space-x-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                disabled={existingReview && existingReview.editCount >= 1}
                className={`text-4xl transition-all duration-200 transform hover:scale-110 ${
                  rating >= star
                    ? "text-yellow-400 drop-shadow-lg"
                    : "text-gray-300 hover:text-yellow-200"
                } ${existingReview && existingReview.editCount >= 1 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              >
                ★
              </button>
            ))}
          </div>

          {/* Review Text */}
          <textarea
            rows={5}
            placeholder="Chia sẻ thêm về sản phẩm..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            disabled={existingReview && existingReview.editCount >= 1}
            className={`w-full border-2 border-gray-300 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
              existingReview && existingReview.editCount >= 1
                ? "bg-gray-100 cursor-not-allowed"
                : "bg-white hover:border-blue-400"
            }`}
          />

          {/* Upload Media */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Tải lên hình ảnh / video:
            </label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => setMedia(e.target.files)}
              disabled={existingReview && existingReview.editCount >= 1}
              className={`block w-full text-sm text-gray-600
                file:mr-4 file:py-2.5 file:px-6
                file:rounded-xl file:border-0
                file:text-sm file:font-semibold
                file:bg-gradient-to-r file:from-blue-500 file:to-purple-500
                file:text-white hover:file:from-blue-600 hover:file:to-purple-600
                file:cursor-pointer file:transition-all file:duration-200
                file:shadow-md hover:file:shadow-lg file:transform hover:file:scale-105
                ${existingReview && existingReview.editCount >= 1 ? "file:opacity-50 file:cursor-not-allowed" : ""}`}
            />
            {existingReview?.images && existingReview.images.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {existingReview.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={getFullUrl(img)}
                    alt={`Review ${idx + 1}`}
                    className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="text-center pt-2">
            <button
              onClick={handleSubmit}
              disabled={loading || (existingReview && existingReview.editCount >= 1)}
              className={`px-8 py-3 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl ${
                loading || (existingReview && existingReview.editCount >= 1)
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Đang xử lý...
                </span>
              ) : existingReview ? (
                "Cập nhật đánh giá"
              ) : (
                "Gửi đánh giá"
              )}
            </button>
          </div>
        </div>

        {/* Modal thông báo */}
        {modalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[60]">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl border-2 border-gray-100">
              <p className="text-gray-800 font-medium">{modalMessage}</p>
              <button
                onClick={handleCloseModalMessage}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
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