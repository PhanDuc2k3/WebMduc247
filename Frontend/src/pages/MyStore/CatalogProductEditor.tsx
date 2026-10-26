import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { catalogApi, type CatalogItem, type CategoryNode, type Variant } from "../../api/catalogApi";
import InventoryPanel from "../../components/MyStore/InventoryPanel";

const input = "mt-1 w-full rounded-xl border border-[#dce3ee] bg-white px-3 py-2 text-sm";
const primary = "rounded-xl bg-[#476de4] px-4 py-2 text-sm font-bold text-white disabled:opacity-50";
const card = "rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm";
type VariantForm = { sku: string; attributes: string; priceMinor: number; salePriceMinor: string; saleStartsAt: string;
  saleEndsAt: string; stock: number; status: "active" | "inactive" };
const blankVariant: VariantForm = { sku: "", attributes: "{}", priceMinor: 0, salePriceMinor: "", saleStartsAt: "", saleEndsAt: "", stock: 0, status: "active" };
const asDateInput = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
const flatten = (items: CategoryNode[], depth = 0): { item: CategoryNode; depth: number }[] =>
  items.flatMap(item => [{ item, depth }, ...flatten(item.children, depth + 1)]);

export default function CatalogProductEditor() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<CatalogItem | null>(null);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [variantId, setVariantId] = useState<string | null>(null);
  const [variant, setVariant] = useState<VariantForm>(blankVariant);
  const [image, setImage] = useState<File | null>(null);
  const [imageVariantId, setImageVariantId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const result = await catalogApi.sellerProduct(id);
    setProduct(result.product);
    return result.product;
  }
  useEffect(() => {
    let active = true;
    Promise.all([catalogApi.sellerProduct(id), catalogApi.categories()]).then(([result, tree]) => {
      if (!active) return;
      const item = result.product;
      setProduct(item); setCategories(tree.categories); setTitle(item.title); setDescription(item.description || "");
      setBrand(item.brand || ""); setCategoryId(item.categoryId || "");
    }).catch(error => { if (active) toast.error(error instanceof Error ? error.message : "Không thể tải sản phẩm.", { containerId: "general-toast" }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  async function act(action: () => Promise<void>, success: string) {
    setBusy(true);
    try { await action(); toast.success(success, { containerId: "general-toast" }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Không thể xử lý yêu cầu.", { containerId: "general-toast" }); }
    finally { setBusy(false); }
  }
  function chooseVariant(item: Variant) {
    setVariantId(item.id);
    setVariant({ sku: item.sku, attributes: JSON.stringify(item.attributes), priceMinor: item.priceOriginalMinor,
      salePriceMinor: item.salePriceMinor == null ? "" : String(item.salePriceMinor),
      saleStartsAt: asDateInput(item.saleStartsAt), saleEndsAt: asDateInput(item.saleEndsAt), stock: item.stock, status: item.status });
  }
  function saveVariant(event: FormEvent) {
    event.preventDefault();
    void act(async () => {
      let attributes: Record<string, string>;
      try { attributes = JSON.parse(variant.attributes) as Record<string, string>; }
      catch { throw new Error("Thuộc tính phải là JSON hợp lệ, ví dụ {\"color\":\"Đỏ\"}."); }
      await catalogApi.saveVariant(id, { sku: variant.sku, attributes, priceMinor: variant.priceMinor,
        salePriceMinor: variant.salePriceMinor === "" ? null : Number(variant.salePriceMinor),
        saleStartsAt: variant.saleStartsAt || null, saleEndsAt: variant.saleEndsAt || null,
        ...(!variantId ? { stock: variant.stock } : {}), status: variant.status }, variantId || undefined);
      await reload(); setVariantId(null); setVariant(blankVariant);
    }, variantId ? "Đã cập nhật biến thể." : "Đã thêm biến thể.");
  }
  if (loading) return <div className="py-12 text-center">Đang tải sản phẩm...</div>;
  if (!product) return <div className="py-12 text-center"><p>Không có dữ liệu sản phẩm.</p><Link to="/mystore">Quay lại cửa hàng</Link></div>;
  return <div className="space-y-6 py-8 pb-16">
    <ContentBreadcrumb items={[{ label: "Cửa hàng", to: "/mystore" }, { label: product.name }]} />
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold">{product.name}</h1><p className="text-sm text-[#718099]">{product.status === "active" ? "Đang bán" : product.status === "draft" ? "Bản nháp" : product.status === "hidden" ? "Đã ẩn" : "Ngừng bán"}</p></div><div className="flex flex-wrap gap-2"><button className={primary} disabled={busy} onClick={() => void act(async () => { const result = await catalogApi.duplicateCatalogProduct(id); navigate(`/mystore/products/${result.product.id}`); }, "Đã nhân bản thành bản nháp.")}>Nhân bản</button><button className={primary} disabled={busy} onClick={() => void act(async () => { await catalogApi.setCatalogProductStatus(id, product.status === "active" ? "hidden" : "active"); await reload(); }, "Đã cập nhật trạng thái.")}>{product.status === "active" ? "Ẩn" : "Đăng bán"}</button><button className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600" disabled={busy} onClick={() => void act(async () => { await catalogApi.setCatalogProductStatus(id, "discontinued"); await reload(); }, "Đã ngừng bán.")}>Ngừng bán</button></div></div>
    <section className={card}><h2 className="mb-4 text-lg font-bold">Thông tin sản phẩm</h2><form className="grid gap-4 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); void act(async () => { await catalogApi.editCatalogProduct(id, { title, description, brand, categoryId: categoryId || null }); await reload(); }, "Đã lưu sản phẩm."); }}><label className="text-sm font-bold">Tên<input className={input} value={title} onChange={event => setTitle(event.target.value)} required minLength={3} /></label><label className="text-sm font-bold">Thương hiệu<input className={input} value={brand} onChange={event => setBrand(event.target.value)} /></label><label className="text-sm font-bold">Danh mục<select className={input} value={categoryId} onChange={event => setCategoryId(event.target.value)}><option value="">Chưa chọn</option>{flatten(categories).map(({ item, depth }) => <option key={item.id} value={item.id}>{"— ".repeat(depth)}{item.name}</option>)}</select></label><label className="text-sm font-bold sm:col-span-2">Mô tả<textarea className={input} rows={5} value={description} onChange={event => setDescription(event.target.value)} /></label><button className={primary} disabled={busy}>Lưu thông tin</button></form></section>
    <section className={card}><h2 className="text-lg font-bold">Biến thể và giá (VND)</h2><p className="mt-1 text-sm text-[#718099]">Giá và tồn kho được quản lý riêng cho từng SKU.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{product.variants?.map(item => <button type="button" key={item.id} onClick={() => chooseVariant(item)} className="rounded-xl border border-[#e8edf5] p-3 text-left text-sm"><strong>{item.sku}</strong><span className="mt-1 block">{Object.entries(item.attributes).map(([key, value]) => `${key}: ${value}`).join(" · ") || "Mặc định"}</span><span className="block text-[#476de4]">{item.priceMinor.toLocaleString("vi-VN")}₫ · Tồn {item.stock}</span></button>)}</div><form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={saveVariant}><label className="text-sm font-bold">SKU<input className={input} value={variant.sku} onChange={event => setVariant(current => ({ ...current, sku: event.target.value }))} required /></label><label className="text-sm font-bold">Thuộc tính JSON<input className={input} value={variant.attributes} onChange={event => setVariant(current => ({ ...current, attributes: event.target.value }))} /></label><label className="text-sm font-bold">Giá gốc<input className={input} type="number" min="0" step="1" value={variant.priceMinor} onChange={event => setVariant(current => ({ ...current, priceMinor: Number(event.target.value) }))} required /></label><label className="text-sm font-bold">Giá giảm<input className={input} type="number" min="0" step="1" value={variant.salePriceMinor} onChange={event => setVariant(current => ({ ...current, salePriceMinor: event.target.value }))} /></label><label className="text-sm font-bold">Bắt đầu giảm<input className={input} type="datetime-local" value={variant.saleStartsAt} onChange={event => setVariant(current => ({ ...current, saleStartsAt: event.target.value }))} /></label><label className="text-sm font-bold">Kết thúc giảm<input className={input} type="datetime-local" value={variant.saleEndsAt} onChange={event => setVariant(current => ({ ...current, saleEndsAt: event.target.value }))} /></label><label className="text-sm font-bold">Tồn kho<input className={input} type="number" min="0" step="1" value={variant.stock} readOnly={Boolean(variantId)} onChange={event => setVariant(current => ({ ...current, stock: Number(event.target.value) }))} required /></label><label className="text-sm font-bold">Trạng thái<select className={input} value={variant.status} onChange={event => setVariant(current => ({ ...current, status: event.target.value as VariantForm["status"] }))}><option value="active">Đang dùng</option><option value="inactive">Tạm ẩn</option></select></label><div className="flex gap-2"><button className={primary} disabled={busy}>{variantId ? "Lưu biến thể" : "Thêm biến thể"}</button>{variantId && <button type="button" onClick={() => { setVariantId(null); setVariant(blankVariant); }}>Hủy</button>}</div></form></section>
    {variantId && <InventoryPanel key={variantId} variantId={variantId} onAdjusted={reload} />}
    <section className={card}><h2 className="text-lg font-bold">Hình ảnh</h2><div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">{product.images?.map((item, index) => <div key={item.id} className="rounded-xl border border-[#e8edf5] p-2"><img className="aspect-square w-full rounded-lg object-cover" src={item.url || "/visual-placeholder.svg"} alt="" /><p className="mt-2 text-xs">{item.isPrimary ? "Ảnh đại diện" : `Ảnh ${index + 1}`}</p><div className="mt-2 flex gap-2 text-xs"><button type="button" disabled={busy || index === 0} onClick={() => void act(async () => { const ids = (product.images || []).map(image => image.id); [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; await catalogApi.reorderProductImages(id, ids, product.images?.find(image => image.isPrimary)?.id); await reload(); }, "Đã đổi thứ tự ảnh.")}>←</button><button type="button" disabled={busy || item.isPrimary} onClick={() => void act(async () => { await catalogApi.reorderProductImages(id, (product.images || []).map(image => image.id), item.id); await reload(); }, "Đã chọn ảnh đại diện.")}>Đặt chính</button><button type="button" disabled={busy} onClick={() => void act(async () => { await catalogApi.removeProductImage(id, item.id); await reload(); }, "Đã xóa ảnh.")}>Xóa</button></div></div>)}</div><form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); if (!image) return; void act(async () => { await catalogApi.uploadProductImage(id, image, { variantId: imageVariantId || undefined, primary: !product.images?.length }); await reload(); setImage(null); }, "Đã tải ảnh lên."); }}><label className="text-sm font-bold">JPEG, PNG hoặc WebP tối đa 5 MB<input className={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setImage(event.target.files?.[0] || null)} required /></label><label className="text-sm font-bold">Ảnh theo biến thể<select className={input} value={imageVariantId} onChange={event => setImageVariantId(event.target.value)}><option value="">Ảnh chung</option>{product.variants?.map(item => <option key={item.id} value={item.id}>{item.sku}</option>)}</select></label><button className={primary} disabled={busy || !image}>Tải ảnh</button></form></section>
  </div>;
}
