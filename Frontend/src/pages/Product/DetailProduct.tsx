import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Loader2, XCircle } from "lucide-react";
import ProductImages from "../../components/ProductDetail/ProductImages/ProductImages";
import ProductInfo from "../../components/ProductDetail/ProductInfo/ProductInfo";
import ProductTabs from "../../components/ProductDetail/ProductTabs/ProductTabs";
import productApi from "../../api/productApi"; // import API đã tách riêng
import axiosClient from "../../api/axiosClient"; // lấy baseURL

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [mainImage, setMainImage] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  const hasCounted = useRef(false);

  // Fetch product bằng axios
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await productApi.getProductById(id!);
        const data = res.data.data; // backend trả về { data: product }

        // Map path thành URL đầy đủ (dùng baseURL từ axiosClient)
        const imagesWithUrl = (data.images || []).map((img: string) =>
          img.startsWith("http") ? img : `${axiosClient.defaults.baseURL}${img}`
        );

        setProduct({ ...data, images: imagesWithUrl });
        if (imagesWithUrl.length > 0) setMainImage(imagesWithUrl[0]);
      } catch (err: any) {
        console.error("❌ Lỗi fetch product:", err);
        toast.error(
          "Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.",
          { containerId: "general-toast" }
        );
        
        // Nếu không tìm thấy sản phẩm, chuyển về trang chủ sau 2 giây
        if (err.response?.status === 404) {
          setTimeout(() => {
            navigate("/");
            toast.info("Đang chuyển về trang chủ...", { containerId: "general-toast" });
          }, 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  // Tăng view chỉ 1 lần
  useEffect(() => {
    const increaseView = async () => {
      try {
        await productApi.increaseView(id!);
      } catch (err) {
        console.error("❌ Lỗi tăng view:", err);
      }
    };

    if (id && !hasCounted.current) {
      hasCounted.current = true;
      increaseView();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="w-full py-16 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Đang tải sản phẩm...</p>
        </div>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="w-full py-16 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-semibold">Không tìm thấy sản phẩm</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-8 md:py-12">
      <div className="mb-8 animate-fade-in-up">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="animate-fade-in-left delay-200">
            <ProductImages
              images={product.images}
              mainImage={mainImage}
              setMainImage={setMainImage}
            />
          </div>

          <div className="animate-fade-in-right delay-300">
            <ProductInfo
              product={product}
              quantity={quantity}
              setQuantity={setQuantity}
            />
          </div>
        </div>
      </div>

      <div className="mt-12 animate-fade-in-up delay-400">
        <ProductTabs productId={product._id} />
      </div>
    </div>
  );
};

export default ProductDetail;
