import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import productApi from "../../api/productApi";
import CanvaProductSection from "../../components/Home/CanvaHome/CanvaProductSection";
import { demoProducts, type HomeProduct } from "../../components/Home/CanvaHome/homeData";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import type { ProductType } from "../../types/product";
import { categoryPages } from "./categoryData";
import "../../components/Home/CanvaHome/CanvaHome.css";
import "./CategoryPage.css";

const extractProducts = (payload: unknown): ProductType[] => {
  if (Array.isArray(payload)) return payload as ProductType[];
  if (typeof payload !== "object" || payload === null) return [];
  const data = payload as { data?: unknown; products?: unknown };
  if (Array.isArray(data.products)) return data.products as ProductType[];
  if (Array.isArray(data.data)) return data.data as ProductType[];
  return [];
};

const toHomeProduct = (product: ProductType): HomeProduct => ({
  _id: product._id,
  name: product.name,
  price: product.price,
  salePrice: product.salePrice,
  images: product.images || [],
  rating: product.rating,
  soldCount: product.soldCount,
  category: product.category,
  isFeatured: product.isFeatured,
  createdAt: product.createdAt,
});

const CategoryPage = () => {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const config = categoryPages[slug];
  const fallbackProducts = useMemo(() => {
    if (!config) return demoProducts.slice(0, 10);
    const matching = demoProducts.filter((product) => product.category === config.apiCategory);
    return [...matching, ...demoProducts.filter((product) => product.category !== config.apiCategory)].slice(0, 10);
  }, [config]);
  const [products, setProducts] = useState<HomeProduct[]>(fallbackProducts);

  useEffect(() => {
    setProducts(fallbackProducts);
    if (!config) return;
    let active = true;
    const loadProducts = async () => {
      try {
        const response = await productApi.getProducts({ category: config.apiCategory, limit: 20 });
        const liveProducts = extractProducts(response.data).filter((product) => product.isActive !== false).map(toHomeProduct);
        if (active && liveProducts.length) setProducts(liveProducts);
      } catch {
        if (active) setProducts(fallbackProducts);
      }
    };
    void loadProducts();
    return () => { active = false; };
  }, [config, fallbackProducts]);

  if (!config) return <Navigate to="/products" replace />;
  const Icon = config.icon;

  return (
    <div className="canva-public-page category-page">
      <ContentBreadcrumb items={[{ label: "Danh mục", to: "/products" }, { label: config.title }]} />

      <div className="canva-public-page__content">
        <section className="category-page__subcategories" aria-labelledby="subcategory-title">
          <header><div><p>Khám phá nhanh</p><h2 id="subcategory-title">Bạn đang tìm gì?</h2></div><button type="button" onClick={() => navigate(`/products?category=${encodeURIComponent(config.apiCategory)}`)}>Xem toàn bộ <ArrowRight /></button></header>
          <div>
            {config.subcategories.map((subcategory, index) => (
              <button type="button" key={subcategory} onClick={() => navigate(`/products?category=${encodeURIComponent(config.apiCategory)}&search=${encodeURIComponent(subcategory)}`)}>
                <span className={`category-page__sub-icon category-page__sub-icon--${index % 4}`}><Icon /></span><strong>{subcategory}</strong><small>Khám phá ngay</small>
              </button>
            ))}
          </div>
        </section>

        <section className={`category-page__promo category-page__promo--${config.tone}`}>
          <div><p>Gợi ý từ MDUC247</p><h2>{config.promoTitle}</h2><span>{config.promoDescription}</span><button type="button" onClick={() => navigate(`/products?category=${encodeURIComponent(config.apiCategory)}`)}>Mua sắm ngay <ArrowRight /></button></div>
          <img src={config.image} alt="" />
        </section>
      </div>

      <CanvaProductSection kicker="Được quan tâm nhiều" title={`Nổi bật trong ${config.title}`} products={products.slice(0, 10)} viewAllTo={`/products?category=${encodeURIComponent(config.apiCategory)}`} />

      <section className="category-page__benefits" aria-label="Lợi ích mua sắm">
        <article><Truck /><span><strong>Giao hàng thuận tiện</strong><small>Theo dõi đơn hàng dễ dàng</small></span></article>
        <article><ShieldCheck /><span><strong>Mua sắm an tâm</strong><small>Thông tin cửa hàng rõ ràng</small></span></article>
        <article><RotateCcw /><span><strong>Hỗ trợ đổi trả</strong><small>Quy trình minh bạch</small></span></article>
      </section>
    </div>
  );
};

export default CategoryPage;
