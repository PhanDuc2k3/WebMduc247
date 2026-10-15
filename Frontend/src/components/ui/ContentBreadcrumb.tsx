import { Link } from "react-router-dom";

type Crumb = { label: string; to?: string };

const ContentBreadcrumb = ({ items }: { items: Crumb[] }) => (
  <nav className="content-breadcrumb" aria-label="Đường dẫn trang">
    <Link to="/">Trang chủ</Link>
    {items.map((item, index) => (
      <span className="content-breadcrumb__item" key={`${item.label}-${index}`}>
        <span aria-hidden="true">/</span>
        {item.to ? <Link to={item.to}>{item.label}</Link> : <strong aria-current="page">{item.label}</strong>}
      </span>
    ))}
  </nav>
);

export default ContentBreadcrumb;
