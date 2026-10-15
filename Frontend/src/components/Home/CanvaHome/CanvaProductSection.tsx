import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { HomeProduct } from "./homeData";
import CanvaProductCard from "./CanvaProductCard";

interface Props { id?: string; kicker?: string; title: string; products: HomeProduct[]; flash?: boolean; compact?: boolean; viewAllTo?: string; }

const getDailySaleEnd = () => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end;
};

const FlashCountdown = () => {
  const [saleEnd, setSaleEnd] = useState(getDailySaleEnd);
  const [remaining, setRemaining] = useState(() => Math.max(0, saleEnd.getTime() - Date.now()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextRemaining = saleEnd.getTime() - Date.now();
      if (nextRemaining <= 0) {
        const nextEnd = getDailySaleEnd();
        setSaleEnd(nextEnd);
        setRemaining(nextEnd.getTime() - Date.now());
      } else {
        setRemaining(nextRemaining);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [saleEnd]);

  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const pad = (value: number) => value.toString().padStart(2, "0");

  return (
    <div className="canva-home__countdown" aria-label={`Kết thúc sau ${hours} giờ ${minutes} phút ${seconds} giây`}>
      <span>Kết thúc trong</span>
      <time dateTime={saleEnd.toISOString()}>{pad(hours)}:{pad(minutes)}:{pad(seconds)}</time>
    </div>
  );
};

const CanvaProductSection = ({ id, kicker, title, products, flash = false, compact = false, viewAllTo }: Props) => (
  <section id={id} className={`canva-home__section ${flash ? "canva-home__flash" : ""}`} aria-label={title}>
    <header className="canva-home__section-header">
      <div>
        {kicker && <p className="canva-home__eyebrow">{kicker}</p>}
        <div className="canva-home__title-row">
          <h2>{flash ? "⚡ " : ""}{title}</h2>
          {flash && <><span className="canva-home__live">Đang diễn ra</span><FlashCountdown /></>}
        </div>
      </div>
      <Link to={viewAllTo || (flash ? "/products?sale=true" : "/products")}>Xem tất cả →</Link>
    </header>
    <div className={`canva-home__product-grid ${compact ? "is-compact" : ""}`}>
      {products.map((product) => <CanvaProductCard key={product._id} product={product} compact={compact} flash={flash} />)}
    </div>
  </section>
);

export default CanvaProductSection;
