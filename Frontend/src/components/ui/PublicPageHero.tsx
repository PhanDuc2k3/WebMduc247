import type { LucideIcon } from "lucide-react";
import "./PublicPages.css";
import { showImageFallback } from "../../utils/imageFallback";

interface Props {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  image: string;
  imageAlt: string;
  tone?: "blue" | "coral" | "cyan" | "purple";
  meta?: string;
}

const PublicPageHero = ({ eyebrow, title, description, icon: Icon, image, imageAlt, tone = "blue", meta }: Props) => (
  <section className={`public-page-hero public-page-hero--${tone}`}>
    <div className="public-page-hero__copy">
      <p><Icon /> {eyebrow}</p>
      <h1>{title}</h1>
      <span>{description}</span>
      {meta && <strong>{meta}</strong>}
    </div>
    <img src={image} alt={imageAlt} onError={showImageFallback} />
  </section>
);

export default PublicPageHero;
