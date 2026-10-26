import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, FolderOpen, Heart, MessageCircle, Package, Star, Store as StoreIcon, Tag, TicketPercent } from "lucide-react";
import { toast } from "react-toastify";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import LiveProductCard from "../../components/Home/CanvaHome/LiveProductCard";
import { catalogApi, type CatalogItem, type CatalogStore, type CategoryNode } from "../../api/catalogApi";
import { chatV2Api } from "../../api/chatV2Api";
import { engagementApi, type Campaign, type Voucher } from "../../api/engagementApi";
import { vnd } from "../../api/orderV2Api";
import { showImageFallback } from "../../utils/imageFallback";
import "../../components/Home/CanvaHome/CanvaHome.css";
import "./Store.css";

type Tab = "info" | "products" | "categories" | "vouchers";
type Entry = { campaign: Campaign; voucher: Voucher };
const flatten = (items: CategoryNode[]): CategoryNode[] => items.flatMap(item => [item, ...flatten(item.children)]);

export default function StorePage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [store, setStore] = useState<CatalogStore | null>(null);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [vouchers, setVouchers] = useState<Entry[]>([]);
  const [tab, setTab] = useState<Tab>("categories");
  const [loading, setLoading] = useState(true);
  const [openingChat, setOpeningChat] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setStore(null); setProducts([]); setVouchers([]);
    Promise.all([catalogApi.store(id), catalogApi.publicProducts(id)]).then(([result, listing]) => {
      if (active) { setStore(result.store); setProducts(listing.products); }
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : "Không thể tải cửa hàng.");
    }).finally(() => { if (active) setLoading(false); });
    catalogApi.categories().then(result => { if (active) setCategories(flatten(result.categories)); }).catch(() => {});
    return () => { active = false; };
  }, [id]);
  useEffect(() => {
    if (!store?.id) return;
    let active = true;
    engagementApi.active().then(result => {
      if (active) setVouchers(result.promotions.filter(item => item.campaign.storeId === store.id));
    }).catch(() => {});
    return () => { active = false; };
  }, [store?.id]);

  async function openChat() {
    if (!store) return;
    setOpeningChat(true);
    try {
      const result = await chatV2Api.create(store.id);
      navigate(`/messages/${result.conversation.id}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Không thể mở hội thoại.", { containerId: "general-toast" });
    } finally { setOpeningChat(false); }
  }

  async function copy(code: string) {
    try { await navigator.clipboard.writeText(code); toast.success("Đã sao chép mã voucher shop.", { containerId: "general-toast" }); }
    catch { toast.error("Không thể sao chép mã.", { containerId: "general-toast" }); }
  }
  function save(code: string) {
    sessionStorage.setItem("cartStoreVoucherCode", code);
    toast.success("Đã lưu mã shop. Chọn sản phẩm của cửa hàng và áp dụng khi thanh toán.", { containerId: "general-toast" });
  }

  const banner = store?.bannerUrl;
  const logo = store?.logoUrl || products.find(item => item.imageUrl)?.imageUrl;
  const productCategories = categories.filter(category => products.some(product => product.categoryId === category.id));
  const tabs: Array<{ value: Tab; label: string }> = [
    { value: "info", label: "Thông tin cửa hàng" },
    { value: "products", label: "Sản phẩm nổi bật" },
    { value: "categories", label: "Danh mục" },
    { value: "vouchers", label: `Voucher${vouchers.length ? ` (${vouchers.length})` : ""}` },
  ];

  return <div className="store-detail-page">
    <ContentBreadcrumb items={[{ label: "Cửa hàng", to: "/store" }, { label: store?.name || "Chi tiết cửa hàng" }]} />
    {loading ? <div className="store-detail-state" role="status">Đang tải cửa hàng...</div> : !store ? <div className="store-detail-state"><h1>Không thể hiển thị cửa hàng</h1><p>{error || "Không tìm thấy cửa hàng."}</p><Link to="/store">Xem các cửa hàng khác</Link></div> : <>
      <section className="store-detail-hero" aria-labelledby="store-detail-name"><div className="store-detail-hero__banner">{banner ? <img src={banner} alt="" onError={showImageFallback} /> : <Package size={120} strokeWidth={1.4} />}</div><div className="store-detail-hero__content"><div className="store-detail-hero__identity"><span className="store-detail-hero__logo">{logo ? <img src={logo} alt="" onError={showImageFallback} /> : <StoreIcon size={38} />}</span><div><div className="store-detail-hero__name"><h1 id="store-detail-name">{store.name}</h1><span><StoreIcon size={13} /> {store.category || "Gian hàng"}</span></div><p>{store.description || "Khám phá sản phẩm của cửa hàng này."}</p></div><div className="store-detail-hero__actions"><button type="button" disabled={openingChat} onClick={() => void openChat()}><MessageCircle size={18} /> {openingChat ? "Đang mở..." : "Chat ngay"}</button><button type="button" disabled title="Theo dõi cửa hàng chưa khả dụng"><Heart size={17} /> Yêu thích</button></div></div><div className="store-detail-stats"><div><strong>{store.rating != null ? <><Star size={16} /> {store.rating.toFixed(1)}</> : "—"}</strong><span>Đánh giá</span></div><div><strong>{store.productCount ?? products.length}</strong><span><Package size={13} /> Sản phẩm</span></div><div><strong>{store.followers ?? "—"}</strong><span><Heart size={13} /> Người theo dõi</span></div><div><strong>{new Date(store.createdAt).toLocaleDateString("vi-VN")}</strong><span><CalendarDays size={13} /> Ngày tạo</span></div></div></div></section>
      <nav className="store-detail-tabs" role="tablist" aria-label="Nội dung cửa hàng">{tabs.map(item => <button type="button" role="tab" key={item.value} className={tab === item.value ? "is-active" : ""} aria-selected={tab === item.value} onClick={() => setTab(item.value)}>{item.label}</button>)}</nav>
      <section className="store-detail-content" role="tabpanel">
        {tab === "categories" && <div className="store-detail-category-panel"><header><h2><FolderOpen size={26} /> Danh mục sản phẩm</h2><p>Chọn danh mục để xem sản phẩm đang bán tại cửa hàng.</p></header>{productCategories.length ? <div className="store-detail-categories">{productCategories.map(category => <Link to={`/products?store=${encodeURIComponent(store.slug)}&category=${encodeURIComponent(category.slug)}`} key={category.id}><FolderOpen size={27} /><strong>{category.name}</strong><small>{products.filter(product => product.categoryId === category.id).length} sản phẩm</small></Link>)}</div> : <p className="store-detail-empty">Cửa hàng chưa có danh mục sản phẩm đang bán.</p>}</div>}
        {tab === "products" && <div className="store-detail-products"><header><h2>Sản phẩm đang bán</h2><Link to={`/products?store=${encodeURIComponent(store.slug)}`}>Xem tất cả →</Link></header>{products.length ? <div className="store-detail-products__grid">{products.map(product => <LiveProductCard key={product.id} product={product} />)}</div> : <p className="store-detail-empty">Cửa hàng chưa có sản phẩm đang bán.</p>}</div>}
        {tab === "info" && <div className="store-detail-info"><h2>Thông tin cửa hàng</h2><p>{store.description || "Cửa hàng chưa cập nhật giới thiệu."}</p><div><span>Ngành hàng<strong>{store.category || "Chưa cập nhật"}</strong></span><span>Tham gia<strong>{new Date(store.createdAt).toLocaleDateString("vi-VN")}</strong></span><span>Sản phẩm đang bán<strong>{store.productCount ?? products.length}</strong></span></div>{store.contactInfo?.email && <p>Email: <a href={`mailto:${store.contactInfo.email}`}>{store.contactInfo.email}</a></p>}{store.contactInfo?.phone && <p>Điện thoại: {store.contactInfo.phone}</p>}{typeof store.businessHours?.text === "string" && store.businessHours.text && <p>Giờ hoạt động: {store.businessHours.text}</p>}</div>}
        {tab === "vouchers" && <div className="store-detail-vouchers"><header><h2><TicketPercent size={25} /> Voucher của cửa hàng</h2><p>Voucher shop có thể dùng cùng một voucher sàn; số tiền giảm được xác nhận tại checkout.</p></header>{vouchers.length ? <div className="store-detail-vouchers__grid">{vouchers.map(({ campaign, voucher }) => <article key={voucher.id}><div><h3>{campaign.title}</h3><span>{voucher.code}</span></div><strong>{voucher.discountType === "FIXED" ? `Giảm ${vnd(voucher.discountValue)}` : `Giảm ${voucher.discountValue / 100}%`}</strong><p>Đơn từ {vnd(voucher.minSpendMinor)} · Hết hạn {new Date(campaign.endsAt).toLocaleDateString("vi-VN")}</p><small>Còn {Math.max(0, voucher.totalLimit - voucher.usedCount - voucher.reservedCount)} lượt</small><footer><button type="button" onClick={() => void copy(voucher.code)}>Sao chép mã</button><button type="button" onClick={() => save(voucher.code)}>Lưu để thanh toán</button></footer></article>)}</div> : <p className="store-detail-empty">Cửa hàng chưa có voucher đang hoạt động.</p>}<Link className="store-detail-vouchers__platform" to="/voucher"><Tag size={16} /> Xem voucher sàn</Link></div>}
      </section>
    </>}
  </div>;
}
