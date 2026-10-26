import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { catalogApi, type CatalogItem, type CatalogStore, type ProductInput, type StoreInput } from "../../api/catalogApi";
import SellerPromotionPanel from "../../components/MyStore/SellerPromotionPanel";

const empty: StoreInput = { name: "", slug: "", description: "", logoUrl: "", bannerUrl: "", category: "", contactEmail: "", contactPhone: "", pickupAddress: "", returnAddress: "" };
const fieldClass = "mt-1 w-full rounded-xl border border-[#dce3ee] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#476de4]";
const buttonClass = "rounded-xl bg-[#476de4] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50";
const cardClass = "rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm sm:p-6";

export default function MyStore() {
  const [stores, setStores] = useState<CatalogStore[]>([]);
  const [selected, setSelected] = useState("");
  const [store, setStore] = useState<CatalogStore | null>(null);
  const [form, setForm] = useState<StoreInput>(empty);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<{ userId: string; role: "owner" | "staff" }[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [acceptToken, setAcceptToken] = useState("");
  const [hours, setHours] = useState("");
  const [overview, setOverview] = useState<{ productCount: number | null; pendingOrderCount: number | null; recognizedRevenue: number | null } | null>(null);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [productForm, setProductForm] = useState<ProductInput>({ name: "", description: "", price: 0, stock: 0, imageUrl: "", status: "draft" });
  const [productImage, setProductImage] = useState<File | null>(null);

  async function loadStores(preferred?: string) {
    const result = await catalogApi.mine();
    setStores(result.stores);
    setSelected(preferred || result.stores[0]?.id || "");
  }
  useEffect(() => {
    let active = true;
    catalogApi.mine().then(result => { if (active) { setStores(result.stores); setSelected(result.stores[0]?.id || ""); } })
      .catch(error => { if (active) toast.error(error instanceof Error ? error.message : "Không thể tải cửa hàng.", { containerId: "general-toast", toastId: "seller-load" }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!selected) { setStore(null); return; }
    let active = true;
    Promise.all([catalogApi.manage(selected), catalogApi.overview(selected), catalogApi.members(selected), catalogApi.products(selected)]).then(([detail, summary, people, listing]) => {
      if (!active) return;
      setStore(detail.store); setOverview(summary.metrics); setMembers(people.members); setProducts(listing.products);
      setHours(typeof detail.store.businessHours?.text === "string" ? detail.store.businessHours.text : "");
      setForm({ name: detail.store.name, description: detail.store.description, logoUrl: detail.store.logoUrl || "",
        bannerUrl: detail.store.bannerUrl || "", category: detail.store.category || "", contactEmail: detail.store.contactInfo?.email || "",
        contactPhone: detail.store.contactInfo?.phone || "", pickupAddress: detail.store.pickupAddress || "",
        returnAddress: detail.store.returnAddress || "" });
    }).catch(error => { if (active) toast.error(error instanceof Error ? error.message : "Không thể tải shop.", { containerId: "general-toast" }); });
    return () => { active = false; };
  }, [selected]);
  const update = (key: keyof StoreInput, value: string) => setForm(current => ({ ...current, [key]: value }));
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Không thể xử lý yêu cầu.", { containerId: "general-toast" }); }
    finally { setBusy(false); }
  }
  function create(event: FormEvent) {
    event.preventDefault();
    void act(async () => {
      const result = await catalogApi.create({ ...form, slug: form.slug?.trim() || undefined, logoUrl: form.logoUrl || undefined, bannerUrl: form.bannerUrl || undefined, category: form.category || undefined, returnAddress: form.returnAddress || undefined });
      await loadStores(result.store.id); setCreating(false); toast.success("Đã tạo cửa hàng.", { containerId: "general-toast" });
    });
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!store) return;
    void act(async () => {
      await catalogApi.update(store.id, { name: form.name, description: form.description, logoUrl: form.logoUrl || "", bannerUrl: form.bannerUrl || "", category: form.category || undefined, pickupAddress: form.pickupAddress, returnAddress: form.returnAddress || form.pickupAddress });
      await catalogApi.settings(store.id, { contactInfo: { email: form.contactEmail, phone: form.contactPhone }, businessHours: { text: hours } });
      setStore((await catalogApi.manage(store.id)).store);
      toast.success("Đã cập nhật cửa hàng.", { containerId: "general-toast" });
    });
  }
  function addProduct(event: FormEvent) {
    event.preventDefault();
    if (!store) return;
    void act(async () => {
      const result = await catalogApi.createCatalogProduct(store.id, { title: productForm.name, description: productForm.description,
        priceMinor: productForm.price, stock: productForm.stock });
      if (productImage) {
        try { await catalogApi.uploadProductImage(result.product.id, productImage, { primary: true }); }
        catch (error) { toast.warning(error instanceof Error ? `Đã tạo bản nháp; tải ảnh thất bại: ${error.message}` : "Đã tạo bản nháp; tải ảnh thất bại.", { containerId: "general-toast" }); }
      }
      setProducts((await catalogApi.products(store.id)).products);
      setOverview((await catalogApi.overview(store.id)).metrics);
      setProductForm({ name: "", description: "", price: 0, stock: 0, imageUrl: "", status: "draft" });
      setProductImage(null);
      toast.success("Đã thêm sản phẩm.", { containerId: "general-toast" });
    });
  }
  return <div className="py-8 pb-16">
    <ContentBreadcrumb items={[{ label: "Quản lý cửa hàng" }]} />
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-extrabold">Cửa hàng của bạn</h1><p className="mt-1 text-sm text-[#718099]">Đăng ký và vận hành shop trên MDUC247.</p></div><button className={buttonClass} type="button" onClick={() => { setForm(empty); setCreating(true); }}>+ Tạo cửa hàng</button></div>
    {loading ? <p>Đang tải cửa hàng...</p> : <>
      {stores.length > 0 && <div className="mb-6 flex flex-wrap items-center gap-3"><label className="text-sm font-bold" htmlFor="seller-store-select">Shop đang quản lý</label><select id="seller-store-select" className="rounded-xl border border-[#dce3ee] bg-white px-3 py-2" value={selected} onChange={event => { setSelected(event.target.value); setCreating(false); }}>{stores.map(item => <option key={item.id} value={item.id}>{item.name} ({item.role === "owner" ? "Chủ shop" : "Nhân viên"})</option>)}</select></div>}
      {!stores.length && !creating && <div className={cardClass}><h2 className="text-xl font-bold">Bắt đầu bán hàng</h2><p className="mt-2 text-[#718099]">Tạo cửa hàng để quản lý thông tin và nhân sự.</p><button className={`mt-5 ${buttonClass}`} type="button" onClick={() => setCreating(true)}>Đăng ký shop</button></div>}
      {creating && <section className={cardClass}><h2 className="mb-4 text-xl font-bold">Đăng ký shop</h2><StoreFields form={form} update={update} onSubmit={create} busy={busy} creating /><button type="button" className="mt-3 text-sm text-[#718099]" onClick={() => setCreating(false)}>Hủy</button></section>}
      {store && !creating && <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]"><div className="space-y-6">
        <section className={cardClass}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{store.name}</h2><p className="text-sm text-[#718099]">/{store.slug} · {store.status === "active" ? "Đang hoạt động" : "Tạm ngừng nhận đơn"}</p></div><Link className="text-sm font-bold text-[#476de4]" to={`/store/${store.slug}`}>Xem trang công khai →</Link></div></section>
        {store.role === "owner" && <section className={cardClass}><h2 className="mb-4 text-xl font-bold">Thông tin cửa hàng</h2><StoreFields form={form} update={update} onSubmit={save} busy={busy} hours={hours} setHours={setHours} /></section>}
        <section className={cardClass}><h2 className="text-xl font-bold">Sản phẩm</h2><p className="mt-1 text-sm text-[#718099]">Chỉ sản phẩm đã công bố và còn hàng xuất hiện trên trang công khai.</p><div className="mt-4 space-y-3">{products.map(product => <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8edf5] p-3"><div><strong>{product.name}</strong><p className="text-sm text-[#718099]">{product.priceMinor.toLocaleString("vi-VN")}₫ · Tồn {product.stock} · {product.status === "active" ? "Đang bán" : product.status === "draft" ? "Bản nháp" : "Đã ẩn"}</p></div><button type="button" className="text-sm font-bold text-[#476de4]" disabled={busy} onClick={() => void act(async () => { await catalogApi.setCatalogProductStatus(product.id, product.status === "active" ? "hidden" : "active"); setProducts((await catalogApi.products(store.id)).products); toast.success("Đã cập nhật trạng thái sản phẩm.", { containerId: "general-toast" }); })}>{product.status === "active" ? "Ẩn" : "Công bố"}</button><Link className="text-sm font-bold text-[#476de4]" to={`/mystore/products/${product.id}`}>Biến thể và ảnh</Link></div>)}</div><form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={addProduct}><label className="text-sm font-bold">Tên sản phẩm<input className={fieldClass} value={productForm.name} onChange={event => setProductForm(current => ({ ...current, name: event.target.value }))} required minLength={3} /></label><label className="text-sm font-bold">Giá (₫)<input className={fieldClass} type="number" min="0" value={productForm.price} onChange={event => setProductForm(current => ({ ...current, price: Number(event.target.value) }))} required /></label><label className="text-sm font-bold">Tồn kho<input className={fieldClass} type="number" min="0" value={productForm.stock} onChange={event => setProductForm(current => ({ ...current, stock: Number(event.target.value) }))} required /></label><label className="text-sm font-bold">Ảnh sản phẩm<input className={fieldClass} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setProductImage(event.target.files?.[0] || null)} /></label><label className="text-sm font-bold sm:col-span-2">Mô tả<input className={fieldClass} value={productForm.description || ""} onChange={event => setProductForm(current => ({ ...current, description: event.target.value }))} /></label><button className={buttonClass} disabled={busy}>Thêm sản phẩm</button></form></section>
        <SellerPromotionPanel storeId={store.id} products={products} />
        <section className={cardClass}><h2 className="text-xl font-bold">Thành viên shop</h2><div className="mt-4 space-y-3">{members.map(member => <div key={member.userId} className="flex items-center justify-between gap-3 border-b border-[#e8edf5] pb-3 text-sm"><span className="break-all">{member.userId} · {member.role === "owner" ? "Chủ shop" : "Nhân viên"}</span>{store.role === "owner" && member.role === "staff" && <button type="button" className="font-bold text-red-600" disabled={busy} onClick={() => void act(async () => { await catalogApi.removeMember(store.id, member.userId); setMembers((await catalogApi.members(store.id)).members); toast.success("Đã gỡ nhân viên.", { containerId: "general-toast" }); })}>Gỡ</button>}</div>)}</div>
          {store.role === "owner" && <form className="mt-5 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); void act(async () => { const result = await catalogApi.invite(store.id, inviteEmail); setInviteToken(result.token); setInviteEmail(""); toast.success("Đã tạo lời mời.", { containerId: "general-toast" }); }); }}><input className={`${fieldClass} flex-1`} type="email" placeholder="Email nhân viên" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} required /><button className={buttonClass} disabled={busy}>Tạo lời mời</button></form>}
          {inviteToken && <div className="mt-4 rounded-xl bg-[#f4f7fb] p-3 text-sm"><p>Gửi mã này cho nhân viên (hiệu lực 7 ngày):</p><code className="mt-1 block break-all">{inviteToken}</code></div>}
        </section>
      </div><aside className="space-y-6"><section className={cardClass}><h2 className="text-xl font-bold">Đơn hàng</h2><p className="mt-2 text-sm text-[#718099]">Xác nhận, chuẩn bị và bàn giao đơn của shop.</p><Link to={`/mystore/${selected}/orders`} className="mt-4 inline-block font-bold text-[#476de4]">Quản lý đơn hàng →</Link></section><section className={cardClass}><h2 className="text-xl font-bold">Tổng quan shop</h2><p className="mt-3 text-sm">Sản phẩm: {overview?.productCount ?? "—"}</p><p className="mt-2 text-sm text-[#718099]">Thống kê đơn và doanh thu trên dashboard đang chờ kết nối dữ liệu tổng hợp.</p></section>
        {store.role === "owner" && <section className={cardClass}><h2 className="text-xl font-bold">Trạng thái nhận đơn</h2><p className="mt-2 text-sm text-[#718099]">Khi tạm ngừng, shop sẽ không xuất hiện trong danh sách công khai.</p><button type="button" className={`mt-4 ${buttonClass}`} disabled={busy} onClick={() => void act(async () => { const next = await catalogApi.settings(store.id, { acceptingOrders: !store.acceptingOrders }); setStore(next.store); await loadStores(store.id); toast.success(next.store.acceptingOrders ? "Shop đã hoạt động lại." : "Shop đã tạm ngừng.", { containerId: "general-toast" }); })}>{store.acceptingOrders ? "Tạm ngừng shop" : "Hoạt động lại"}</button></section>}
      </aside></div>}
      <section className={`mt-6 ${cardClass}`}><h2 className="text-lg font-bold">Nhận lời mời tham gia shop</h2><form className="mt-3 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); void act(async () => { const result = await catalogApi.acceptInvite(acceptToken); await loadStores(result.storeId); setAcceptToken(""); toast.success("Đã tham gia shop.", { containerId: "general-toast" }); }); }}><input className={`${fieldClass} flex-1`} placeholder="Mã lời mời" value={acceptToken} onChange={event => setAcceptToken(event.target.value)} required /><button className={buttonClass} disabled={busy}>Tham gia</button></form></section>
    </>}
  </div>;
}

function StoreFields({ form, update, onSubmit, busy, creating = false, hours, setHours }: { form: StoreInput; update: (key: keyof StoreInput, value: string) => void; onSubmit: (event: FormEvent) => void; busy: boolean; creating?: boolean; hours?: string; setHours?: (value: string) => void }) {
  const fields: { key: keyof StoreInput; label: string; required?: boolean; type?: string }[] = [
    { key: "name", label: "Tên shop", required: true }, ...(creating ? [{ key: "slug" as const, label: "Slug (để trống để tự tạo)" }] : []),
    { key: "description", label: "Mô tả" }, { key: "category", label: "Nhóm sản phẩm" },
    { key: "logoUrl", label: "URL logo HTTPS", type: "url" }, { key: "bannerUrl", label: "URL ảnh bìa HTTPS", type: "url" },
    { key: "contactEmail", label: "Email liên hệ", required: true, type: "email" }, { key: "contactPhone", label: "Số điện thoại liên hệ", required: true },
    { key: "pickupAddress", label: "Địa chỉ lấy hàng", required: true }, { key: "returnAddress", label: "Địa chỉ hoàn hàng" },
  ];
  return <form onSubmit={onSubmit}><div className="grid gap-4 sm:grid-cols-2">{fields.map(field => <label key={field.key} className="text-sm font-bold">{field.label}<input className={fieldClass} type={field.type || "text"} value={form[field.key] || ""} required={field.required} onChange={event => update(field.key, event.target.value)} /></label>)}</div>{setHours && <label className="mt-4 block text-sm font-bold">Lịch hoạt động<input className={fieldClass} value={hours || ""} onChange={event => setHours(event.target.value)} placeholder="Ví dụ: Thứ 2–7, 8:00–18:00" /></label>}<button className={`mt-5 ${buttonClass}`} disabled={busy}>{creating ? "Tạo cửa hàng" : "Lưu thay đổi"}</button></form>;
}
