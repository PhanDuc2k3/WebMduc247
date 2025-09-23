import React, { useState } from "react";
import ProductImages from "../../components/ProductDetail/ProductImages/ProductImages";
import ProductInfo from "../../components/ProductDetail/ProductInfo/ProductInfo";
import ProductTabs from "../../components/ProductDetail/ProductTabs/ProductTabs";

const ProductDetail: React.FC = () => {
  const [quantity, setQuantity] = useState(1);

  const colors = ["Titan Tự Nhiên", "Titan Xanh", "Titan Trắng", "Titan Đen"];
  const storages = ["256GB", "512GB", "1TB"];

  const images = [
    "https://tse3.mm.bing.net/th/id/OIP.Qp1LQqGkThPjM23l7crnQQHaHa?pid=Api&P=0&h=220",
    "https://tse2.mm.bing.net/th/id/OIP.VImC6cFIwZIH_Lkh2jXajwHaE8?pid=Api&P=0&h=220",
    "https://tse3.mm.bing.net/th/id/OIP.hv_GZ3hpO0H8Cf_GHSQSSAHaF7?pid=Api&P=0&h=220",
    "https://tse1.mm.bing.net/th/id/OIP.SImPaTuytF9aRNeo3mY8AQHaG_?pid=Api&P=0&h=220",
  ];

  const [mainImage, setMainImage] = useState(images[0]);

  return (
    <div className="max-w-6xl mx-auto p-4 bg-white rounded-lg shadow-md ">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProductImages images={images} mainImage={mainImage} setMainImage={setMainImage} />
        <ProductInfo colors={colors} storages={storages} quantity={quantity} setQuantity={setQuantity} />
      </div>

      <ProductTabs />
    </div>
  );
};

export default ProductDetail;
