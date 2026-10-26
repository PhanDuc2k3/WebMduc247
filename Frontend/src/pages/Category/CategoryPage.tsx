import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowRight, BatteryCharging, Cable, Headphones, Package, RotateCcw, ShieldCheck, Smartphone, Truck, Watch } from "lucide-react";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import LiveProductCard from "../../components/Home/CanvaHome/LiveProductCard";
import { catalogApi, type CatalogItem, type CategoryNode } from "../../api/catalogApi";
import { categoryPages } from "./categoryData";
import "../../components/Home/CanvaHome/CanvaHome.css";
import "./CategoryPage.css";

const findCategory = (items: CategoryNode[], slug: string): CategoryNode | null => {
  for (const item of items) {
    if (item.slug === slug) return item;
    const nested = findCategory(item.children, slug);
    if (nested) return nested;
  }
  return null;
};
const phoneIcons = [Smartphone, Smartphone, Headphones, Cable, BatteryCharging, Watch];

export default function CategoryPage() {
  const { slug = "" } = useParams();
  const config = categoryPages[slug];
  const actualSlug = config?.apiCategory || slug;
  const [category, setCategory] = useState<CategoryNode | null>(null);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true); setCategory(null); setProducts([]);
    Promise.all([catalogApi.categories(), catalogApi.listProducts({ category: actualSlug, page: 1, limit: 50 })])
      .then(([tree, listing]) => { if (active) { setCategory(findCategory(tree.categories, actualSlug)); setProducts(listing.products); } })
      .catch(error => { if (active) toast.error(error instanceof Error ? error.message : "Không thể tải danh mục.", { containerId: "general-toast" }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [actualSlug]);

  const title = config?.title || category?.name || slug;
  const shortcuts = config?.subcategories || category?.children.map(item => item.name) || [];
  const catalogLink = `/products?category=${actualSlug}`;
  return <div className="category-page">
    <ContentBreadcrumb items={[{ label: "Danh mục", to: "/products" }, { label: title }]} />
    {loading ? <p className="category-page__state">Đang tải danh mục và sản phẩm...</p> : !category ?
      <div className="category-page__state"><h1>Không tìm thấy danh mục</h1><Link to="/products">Xem tất cả sản phẩm</Link></div> : <>
        {!!shortcuts.length && <section className="category-page__subcategories" aria-labelledby="category-quick-title"><header><div><p>Khám phá nhanh</p><h1 id="category-quick-title">Bạn đang tìm gì?</h1></div><Link to={catalogLink}>Xem toàn bộ <ArrowRight size={17} /></Link></header><div>{shortcuts.slice(0, 6).map((name, index) => {
          const child = category.children.find(item => item.name === name);
          const Icon = slug === "phone" ? phoneIcons[index] : config?.icon || Package;
          return <Link key={name} to={child ? `/category/${child.slug}` : `${catalogLink}&search=${encodeURIComponent(name)}`}><span className={`category-page__sub-icon category-page__sub-icon--${index % 4}`}><Icon size={24} /></span><strong>{name}</strong><small>Khám phá ngay</small></Link>;
        })}</div></section>}

        <section className={`category-page__promo category-page__promo--${config?.tone || "blue"}`} aria-label={`Gợi ý ${title}`}><div><p>Gợi ý từ MDUC247</p><h2>{config?.promoTitle || `Khám phá ${title}`}</h2><span>{config?.promoDescription || "Xem các sản phẩm đang được bán trong danh mục này."}</span><Link className="category-page__promo-action" to={catalogLink}>Mua sắm ngay <ArrowRight size={17} /></Link></div><img src={config?.image || category.imageUrl || "/home/shopping-hero.png"} alt={config?.imageAlt || title} /></section>

        <section className="canva-home__section category-page__products" aria-labelledby="category-products-title"><header className="canva-home__section-header"><div><p className="canva-home__eyebrow">Được quan tâm nhiều</p><h2 id="category-products-title">Nổi bật trong {title}</h2></div><Link to={catalogLink}>Xem tất cả <ArrowRight size={17} /></Link></header>
          {products.length ? <div className="canva-home__product-grid">{products.slice(0, 10).map(product => <LiveProductCard product={product} key={product.id} />)}</div> : <p className="category-page__state">Chưa có sản phẩm đang bán trong danh mục này.</p>}
        </section>

        <div className="category-page__benefits"><article><Truck aria-hidden="true" /><span><strong>Giao hàng thuận tiện</strong><small>Theo dõi đơn hàng dễ dàng</small></span></article><article><ShieldCheck aria-hidden="true" /><span><strong>Mua sắm an tâm</strong><small>Thông tin cửa hàng rõ ràng</small></span></article><article><RotateCcw aria-hidden="true" /><span><strong>Hỗ trợ đổi trả</strong><small>Quy trình minh bạch</small></span></article></div>
      </>}
  </div>;
}
