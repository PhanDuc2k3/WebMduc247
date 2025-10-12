import React from "react";

interface ProductImagesProps {
  productId?: string;  
  images: string[];
  mainImage: string;
  setMainImage: (img: string) => void;
}


const ProductImages: React.FC<ProductImagesProps> = ({
  images,
  mainImage,
  setMainImage,
}) => {
  return (
    <div className="flex flex-col items-center">
      {/* Ảnh chính */}
      <div className="w-full max-w-sm mb-5">
        {mainImage ? (
          <img
            src={mainImage}
            alt="product"
            className="w-full aspect-[3/4] object-contain rounded-md border"
          />
        ) : (
          <div className="w-full aspect-[3/4] flex items-center justify-center border rounded-md text-gray-400">
            Chưa có ảnh
          </div>
        )}
      </div>

      {/* Thumbnail */}
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
  );
};

export default ProductImages;
