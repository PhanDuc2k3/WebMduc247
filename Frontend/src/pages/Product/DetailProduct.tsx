import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import ProductImages from "../../components/ProductDetail/ProductImages/ProductImages";
import ProductInfo from "../../components/ProductDetail/ProductInfo/ProductInfo";
import ProductTabs from "../../components/ProductDetail/ProductTabs/ProductTabs";

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [mainImage, setMainImage] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  // ✅ biến cờ để tránh tăng view nhiều lần
  const hasCounted = useRef(false);

  // fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/products/${id}`);
        const data = await res.json();
        if (res.ok) {
          setProduct(data.data);
          if (data.data.images?.length > 0) {
            setMainImage(data.data.images[0]);
          }
        } else {
          console.error("❌ Lỗi:", data.message);
        }
      } catch (err) {
        console.error("❌ Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  // ✅ tăng view chỉ 1 lần khi load page
  useEffect(() => {
    const increaseView = async () => {
      try {
        await fetch(`http://localhost:5000/api/products/${id}/view`, {
          method: "PATCH",
        });
      } catch (err) {
        console.error("❌ Lỗi tăng view:", err);
      }
    };

    if (id && !hasCounted.current) {
      hasCounted.current = true;
      increaseView();
    }
  }, [id]);

  if (loading) return <div className="p-6 text-center">⏳ Đang tải...</div>;
  if (!product) return <div className="p-6 text-center">❌ Không tìm thấy sản phẩm</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProductImages
          images={product.images || []}
          mainImage={mainImage}
          setMainImage={setMainImage}
        />

        <ProductInfo
          product={product}
          quantity={quantity}
          setQuantity={setQuantity}
        />
      </div>

      <ProductTabs productId={product?._id} />
    </div>
  );
};

export default ProductDetail;
