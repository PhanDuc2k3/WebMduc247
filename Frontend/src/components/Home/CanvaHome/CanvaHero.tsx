import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Gift, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { heroSlides } from "./homeData";
import { showImageFallback } from "../../../utils/imageFallback";

const CanvaHero = () => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % heroSlides.length), 5500);
    return () => window.clearInterval(timer);
  }, []);
  const show = (index: number) => setActive((index + heroSlides.length) % heroSlides.length);

  return (
    <section className="canva-home__hero" aria-label="Ưu đãi nổi bật">
      <div className="canva-home__carousel">
        {heroSlides.map((slide, index) => (
          <article className={`canva-home__slide ${index === active ? "is-active" : ""}`} style={{ background: slide.gradient }} aria-hidden={index !== active} key={slide.title}>
            <div className="canva-home__hero-copy">
              <p className="canva-home__eyebrow canva-home__eyebrow--light">{slide.kicker}</p>
              {index === 0 ? <h1>{slide.title}</h1> : <h2>{slide.title}</h2>}
              <p>{slide.description}</p>
              {index === 0 ? <><Link className="canva-home__primary-button" to="/order/demo">Bắt đầu mua hàng</Link><small className="canva-home__preview-note">Xem trước chi tiết đơn hàng minh họa</small></> : <a className="canva-home__primary-button" href={slide.href}>Khám phá ngay</a>}
            </div>
            <img src={slide.image} alt={slide.alt} className="canva-home__hero-image" onError={showImageFallback} />
          </article>
        ))}
        <div className="canva-home__dots" aria-label="Chọn banner">
          {heroSlides.map((slide, index) => <button type="button" key={slide.title} className={index === active ? "is-active" : ""} onClick={() => show(index)} aria-label={`Banner ${index + 1}`} aria-current={index === active ? "true" : undefined} />)}
        </div>
        <div className="canva-home__carousel-controls">
          <button type="button" onClick={() => show(active - 1)} aria-label="Banner trước"><ChevronLeft /></button>
          <button type="button" onClick={() => show(active + 1)} aria-label="Banner tiếp theo"><ChevronRight /></button>
        </div>
      </div>
      <div className="canva-home__promos">
        <article className="canva-home__promo canva-home__promo--cyan"><Truck aria-hidden="true" /><h2>Giao hàng thuận tiện</h2><p>Xem phí vận chuyển rõ ràng trước khi đặt hàng.</p></article>
        <article className="canva-home__promo canva-home__promo--coral"><Gift aria-hidden="true" /><h2>Ưu đãi thành viên mới</h2><p>Bắt đầu hành trình mua sắm thật vui.</p></article>
      </div>
    </section>
  );
};

export default CanvaHero;
