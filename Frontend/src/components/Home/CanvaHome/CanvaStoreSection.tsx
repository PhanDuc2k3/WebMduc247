import { ArrowRight, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { HomeStore } from "./homeData";

const CanvaStoreSection = ({ stores }: { stores: HomeStore[] }) => {
  const navigate = useNavigate();
  return (
    <section className="canva-home__section canva-home__stores" aria-labelledby="home-store-title">
      <header className="canva-home__section-header"><div><p className="canva-home__eyebrow">Mua sắm an tâm</p><h2 id="home-store-title">Cửa hàng nổi bật</h2></div><button type="button" onClick={() => navigate("/store")}>Xem tất cả <ArrowRight /></button></header>
      <div className="canva-home__store-grid">
        {stores.map((store) => (
          <button type="button" className="canva-home__store-card" key={store._id} onClick={() => navigate(store.demo ? "/store" : `/store/${store._id}`)}>
            <img src={store.logoUrl || "/visual-placeholder.svg"} alt="" /><span><strong>{store.name}</strong><small>{store.category || "Cửa hàng"}</small><em><Star /> {typeof store.rating === "number" ? store.rating.toFixed(1) : "Chưa có đánh giá"} · {store.products ?? 0} sản phẩm</em></span><ArrowRight aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
};

export default CanvaStoreSection;
