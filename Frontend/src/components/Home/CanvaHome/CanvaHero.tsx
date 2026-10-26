import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Gift, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { showImageFallback } from "../../../utils/imageFallback";
import type {HeroBanner} from '../../../api/storefrontApi';

const defaultSlides = [
  { kicker: "Mua sắm mỗi ngày", title: "Đại tiệc mua sắm MDUC247", description: "Khám phá sản phẩm từ nhiều gian hàng bạn yêu thích.", image: "/home/shopping-hero.png", alt: "Bàn mua sắm với máy tính và hộp quà", href: "/products", gradient: "linear-gradient(120deg, #4969d8, #a6a4ed)" },
  { kicker: "Phong cách mỗi ngày", title: "Chọn món đồ bạn yêu", description: "Tìm cảm hứng mới cho phong cách của riêng bạn.", image: "/home/fashion-hero.png", alt: "Túi tote vải canvas", href: "/category/fashion", gradient: "linear-gradient(120deg, #6573d9, #c7a5db)" },
  { kicker: "Làm mới không gian", title: "Tiện ích cho tổ ấm", description: "Những lựa chọn nhỏ cho một không gian nhiều niềm vui.", image: "/home/home-hero.png", alt: "Đèn bàn LED", href: "/category/home", gradient: "linear-gradient(120deg, #426eae, #9bb9dc)" },
];
type Banner = { id: string; title: string; imageUrl: string | null; targetUrl: string };
const CanvaHero = ({ banners = [],slidesOverride }: { banners?: Banner[];slidesOverride?:HeroBanner[] }) => {
  const [active, setActive] = useState(0);
  const gradients={blue:'linear-gradient(120deg, #4969d8, #a6a4ed)',purple:'linear-gradient(120deg, #6573d9, #c7a5db)',cyan:'linear-gradient(120deg, #426eae, #9bb9dc)'};
  const slides = slidesOverride?slidesOverride.filter(slide=>slide.enabled).map(slide=>({id:slide.id,kicker:slide.kicker,title:slide.title,description:slide.description,
    image:slide.imageUrl,alt:slide.imageAlt,href:slide.targetUrl,gradient:gradients[slide.tone],buttonText:slide.buttonText})):banners.length ? banners.map(banner => ({
    id:banner.id,buttonText:'Khám phá ngay',
    kicker: "Khám phá MDUC247", title: banner.title, description: "Khám phá thêm sản phẩm đang bán.",
    image: banner.imageUrl || "/home/shopping-hero.png", alt: banner.title,
    href: banner.targetUrl, gradient: "linear-gradient(120deg, #4969d8, #a6a4ed)",
  })) : defaultSlides.map((slide,index)=>({...slide,id:'default-'+index,buttonText:index===0?'Bắt đầu mua hàng':'Khám phá ngay'}));
  useEffect(() => {
    setActive(0);
    if(slides.length<2)return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 5500);
    return () => window.clearInterval(timer);
  }, [slides.length]);
  const show = (index: number) => setActive((index + slides.length) % slides.length);
  if(!slides.length)return null;

  return (
    <section className="canva-home__hero" aria-label="Ưu đãi nổi bật">
      <div className="canva-home__carousel">
        {slides.map((slide, index) => (
          <article className={`canva-home__slide ${index === active ? "is-active" : ""}`} style={{ background: slide.gradient }} aria-hidden={index !== active} key={slide.id}>
            <div className="canva-home__hero-copy">
              <p className="canva-home__eyebrow canva-home__eyebrow--light">{slide.kicker}</p>
              {index === 0 ? <h1>{slide.title}</h1> : <h2>{slide.title}</h2>}
              <p>{slide.description}</p>
              <Link className="canva-home__primary-button" to={slide.href}>{slide.buttonText}</Link>
            </div>
            <img src={slide.image} alt={slide.alt} className="canva-home__hero-image" onError={showImageFallback} />
          </article>
        ))}
        <div className="canva-home__dots" aria-label="Chọn banner">
          {slides.map((slide, index) => <button type="button" key={slide.id} className={index === active ? "is-active" : ""} onClick={() => show(index)} aria-label={`Banner ${index + 1}`} aria-current={index === active ? "true" : undefined} />)}
        </div>
        <div className="canva-home__carousel-controls">
          <button type="button" onClick={() => show(active - 1)} aria-label="Banner trước"><ChevronLeft /></button>
          <button type="button" onClick={() => show(active + 1)} aria-label="Banner tiếp theo"><ChevronRight /></button>
        </div>
      </div>
      <div className="canva-home__promos">
        <article className="canva-home__promo canva-home__promo--cyan"><Truck aria-hidden="true" /><h2>Giao hàng thuận tiện</h2><p>Xem phí vận chuyển rõ ràng trước khi đặt hàng.</p></article>
        <article className="canva-home__promo canva-home__promo--coral"><Gift aria-hidden="true" /><h2>Khám phá gian hàng mới</h2><p>Tìm thêm sản phẩm từ các cửa hàng đang bán.</p></article>
      </div>
    </section>
  );
};

export default CanvaHero;
