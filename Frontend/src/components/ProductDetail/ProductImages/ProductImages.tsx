import React, { useEffect, useState } from "react";

interface ProductImagesProps {
  productId?: string; // id sản phẩm
  images?: string[];
  mainImage?: string;
  setMainImage?: (img: string) => void;
}

const getImageUrl = (path: string) => {
  if (!path) return "/no-image.png"; 
  return path.startsWith("http") ? path : `http://localhost:5000${path}`;
};

const ProductImages: React.FC<ProductImagesProps> = ({ productId }) => {
  const [images, setImages] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState<string>("");

  useEffect(() => {
    console.log("🔎 ProductImages nhận productId:", productId);

  if (!productId) {
    console.warn("❌ Không có productId, bỏ qua fetch ảnh");
    return;
  }

  const fetchImages = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/products/${productId}`);
      const data = await res.json();

      if (res.ok && data.data) {
        const imgs = data.data.images || [];
        setImages(imgs);
        if (imgs.length > 0) setMainImage(imgs[0]);
      }
    } catch (err) {
      console.error("❌ Fetch error:", err);
    }
  };

  fetchImages();
}, [productId]);



  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-sm mb-5">
        {mainImage ? (
          <img
            src={getImageUrl(mainImage)}
            alt="product"
            className="w-full aspect-[3/4] object-contain rounded-md border"
          />
        ) : (
          <div className="w-full aspect-[3/4] flex items-center justify-center border rounded-md text-gray-400">
            Chưa có ảnh
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        {images.map((img, idx) => (
          <img
            key={idx}
            src={getImageUrl(img)}
            alt={`thumb-${idx}`}
            className={`w-16 h-16 object-contain rounded-md border cursor-pointer transition ${
              mainImage === img ? "border-blue-500" : "hover:border-gray-400"
            }`}
            onClick={() => setMainImage(img)}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductImages;
