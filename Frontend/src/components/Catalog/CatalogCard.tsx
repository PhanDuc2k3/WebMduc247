import { Link } from "react-router-dom";
import type { CatalogItem } from "../../api/catalogApi";

export default function CatalogCard({ product }: { product: CatalogItem }) {
  const onSale = product.priceOriginalMinor > product.priceMinor;
  return <Link to={`/products/${product.id}`} className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white text-[#172b49] shadow-sm transition hover:-translate-y-1 hover:shadow-md">
    <div className="relative h-48 bg-[#f2f5fb]"><img className="h-full w-full object-cover" src={product.imageUrl || "/visual-placeholder.svg"} alt={product.name} loading="lazy" />{onSale && <span className="absolute left-3 top-3 rounded-lg bg-[#f36e64] px-2 py-1 text-xs font-bold text-white">Giảm giá</span>}</div>
    <div className="p-4"><small className="text-[#718099]">{product.brand || product.store?.name || "MDUC247"}</small><h2 className="mt-1 line-clamp-2 min-h-11 font-bold">{product.name}</h2><p className="mt-2 text-sm text-[#718099]">{product.rating == null ? "Chưa có đánh giá" : `${product.rating.toFixed(1)} ★`}</p><div className="mt-3 flex flex-wrap items-baseline gap-2"><strong className="text-lg text-[#476de4]">{product.priceMinor.toLocaleString("vi-VN")}₫</strong>{onSale && <del className="text-xs text-[#8a97aa]">{product.priceOriginalMinor.toLocaleString("vi-VN")}₫</del>}</div><small className="mt-2 block text-[#718099]">{product.inStock ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}</small></div>
  </Link>;
}
