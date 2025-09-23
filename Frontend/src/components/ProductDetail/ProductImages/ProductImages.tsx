import React from "react";

interface ProductImagesProps {
  images: string[];
  mainImage: string;
  setMainImage: (img: string) => void;
}

const ProductImages: React.FC<ProductImagesProps> = ({ images, mainImage, setMainImage }) => {
  return (
    <div className="flex flex-col items-center">
      {/* Ảnh lớn */}
      <div className="w-full max-w-sm mb-5 ">
<img
  src={mainImage}
  alt="product"
  className="w-full aspect-[3/4] object-contain rounded-md border"
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
  );
};

export default ProductImages;
