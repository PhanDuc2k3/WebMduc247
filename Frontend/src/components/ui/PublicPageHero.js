import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import "./PublicPages.css";
import { showImageFallback } from "../../utils/imageFallback";
const PublicPageHero = ({ eyebrow, title, description, icon: Icon, image, imageAlt, tone = "blue", meta }) => (_jsxs("section", { className: `public-page-hero public-page-hero--${tone}`, children: [_jsxs("div", { className: "public-page-hero__copy", children: [_jsxs("p", { children: [_jsx(Icon, {}), " ", eyebrow] }), _jsx("h1", { children: title }), _jsx("span", { children: description }), meta && _jsx("strong", { children: meta })] }), _jsx("img", { src: image, alt: imageAlt, onError: showImageFallback })] }));
export default PublicPageHero;
