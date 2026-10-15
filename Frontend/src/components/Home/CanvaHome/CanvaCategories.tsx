import { useNavigate } from "react-router-dom";
import { homeCategories, type HomeProduct } from "./homeData";

const CanvaCategories = ({ products }: { products: HomeProduct[] }) => {
  const navigate = useNavigate();
  return (
    <section className="canva-home__section" aria-labelledby="home-categories-title">
      <header className="canva-home__section-header"><div><p className="canva-home__eyebrow">Khám phá dễ dàng</p><h2 id="home-categories-title">Danh mục nổi bật</h2></div></header>
      <div className="canva-home__category-grid">
        {homeCategories.map(({ icon: Icon, ...category }) => (
          <button type="button" className="canva-home__category" key={category.name} onClick={() => navigate(category.href)}>
            <span className={`canva-home__category-icon tone-${category.tone}`}><Icon /></span><strong>{category.name}</strong><small>{products.filter((product) => category.value === "sale" ? Boolean(product.salePrice && product.salePrice < product.price) : product.category === category.value).length} sản phẩm gợi ý</small>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CanvaCategories;
