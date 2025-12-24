import React, { useState } from "react";

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
  const [zoomed, setZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  return (
    <div className="w-full">
      {/* Ảnh chính với zoom effect */}
      <div 
        className="w-full mb-6 relative group rounded-2xl overflow-hidden shadow-xl border-4 border-gray-100 hover:border-[#2F5FEB] transition-all duration-300 bg-white"
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        {mainImage ? (
          <div className="relative w-full aspect-[3/4] bg-gray-50 overflow-hidden">
            <img
              src={mainImage}
              alt="product"
              className={`w-full h-full object-contain transition-transform duration-300 ${
                zoomed ? "scale-150" : "scale-100"
              }`}
              style={{
                transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
              }}
            />
            {zoomed && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
            )}
          </div>
        ) : (
          <div className="w-full aspect-[3/4] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl text-gray-400 bg-gray-50">
            <div className="text-center">
              <div className="text-4xl mb-2 text-[#2F5FEB]">📷</div>
              <p className="text-sm">Chưa có ảnh</p>
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail với scroll */}
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {images.map((img, idx) => (
          <div
            key={idx}
            className={`flex-shrink-0 w-20 h-20 rounded-xl border-4 overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-110 ${
              mainImage === img 
                ? "border-[#2F5FEB] shadow-lg ring-4 ring-[#2F5FEB]/30" 
                : "border-gray-200 hover:border-[#2F5FEB]"
            }`}
            onClick={() => setMainImage(img)}
          >
            <img
              src={img}
              alt={`thumb-${idx}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
      
      {images.length > 1 && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          {images.length} ảnh - Click để xem chi tiết
        </p>
      )}
    </div>
  );
};

export default ProductImages;
