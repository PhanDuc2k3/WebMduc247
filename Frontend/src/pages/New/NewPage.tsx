import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, CalendarDays, Eye, Flame, Gift, Star, Tag, TicketPercent, Wallet, Zap } from "lucide-react";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { catalogApi } from "../../api/catalogApi";
import { engagementApi, type FlashSaleItem } from "../../api/engagementApi";
import promotionApi, { type PromotionType } from "../../api/promotionApi";
import { vnd } from "../../api/orderV2Api";
import { USE_MOCK_DATA } from "../../config/runtime";
import { showImageFallback } from "../../utils/imageFallback";
import "./NewPage.css";

type Category = "all" | "sale" | "flash" | "shipping" | "cashback" | "special" | "newcomer";
type PromotionCard = { id: string; title: string; description: string; categories: Category[];
  tags: string[]; imageUrl?: string; startsAt: string; endsAt: string;
  views?: number; href: string; preview: boolean };
const tabs = [
  { value: "all", label: "Tất cả", icon: Tag },
  { value: "sale", label: "Sale lớn", icon: Flame },
  { value: "flash", label: "Flash Sale", icon: Zap },
  { value: "shipping", label: "Freeship", icon: ArrowUp },
  { value: "cashback", label: "Hoàn tiền", icon: Wallet },
  { value: "special", label: "Đặc biệt", icon: Star },
  { value: "newcomer", label: "Tân thủ", icon: Gift },
] as const;
const date = (value: string) => new Date(value).toLocaleDateString("vi-VN");

function fromPreview(item: PromotionType, index: number): PromotionCard {
  const text = `${item.category} ${item.tags?.join(" ") || ""}`.toLocaleLowerCase("vi-VN");
  const categories: Category[] = [];
  if (text.includes("sale lớn")) categories.push("sale");
  if (text.includes("flash")) categories.push("flash");
  if (text.includes("freeship") || text.includes("vận chuyển")) categories.push("shipping");
  if (text.includes("hoàn tiền")) categories.push("cashback");
  if (text.includes("đặc biệt")) categories.push("special");
  if (text.includes("tân thủ") || text.includes("thành viên mới")) categories.push("newcomer");
  return { id: item._id || `preview-${index}`, title: item.title, description: item.description,
    categories: categories.length ? categories : ["special"], tags: item.tags || [],
    imageUrl: item.imageUrl, startsAt: item.startDate, endsAt: item.endDate,
    views: item.views, href: item._id ? `/promotion/${item._id}` : "/flash-sale", preview: true };
}

function fromVoucher(item: Awaited<ReturnType<typeof engagementApi.active>>["promotions"][number], storeSlug?: string): PromotionCard {
  const { campaign, voucher } = item;
  const text = `${campaign.title} ${voucher.code}`.toLocaleLowerCase("vi-VN");
  const categories: Category[] = ["special"];
  if (/ship|vận chuyển/.test(text)) categories.push("shipping");
  if (voucher.segment === "FIRST_ORDER") categories.push("newcomer");
  if (/hoàn tiền|cashback/.test(text)) categories.push("cashback");
  const discount = voucher.discountType === "FIXED" ? vnd(voucher.discountValue) : `${voucher.discountValue / 100}%`;
  return { id: campaign.id, title: campaign.title,
    description: `Giảm ${discount} cho đơn đủ điều kiện. Áp dụng mã ${voucher.code} khi thanh toán.`,
    categories, tags: [campaign.storeId ? "Voucher shop" : "Voucher sàn"],
    startsAt: campaign.startsAt, endsAt: campaign.endsAt,
    href: campaign.storeId && storeSlug ? `/store/${storeSlug}` : campaign.storeId ? "/store" : "/voucher",
    preview: false };
}

function fromFlash(item: FlashSaleItem): PromotionCard {
  return { id: item.campaignId, title: item.title,
    description: `${item.productName} đang có giá Flash Sale ${vnd(item.salePriceMinor)}. Giá và tồn kho được xác nhận khi đặt hàng.`,
    categories: ["flash", "sale"], tags: ["Flash Sale"], imageUrl: item.imageUrl || undefined,
    startsAt: item.startsAt, endsAt: item.endsAt, href: "/flash-sales/products", preview: false };
}

export default function NewPage() {
  const [activeTab, setActiveTab] = useState<Category>("all");
  const [cards, setCards] = useState<PromotionCard[]>([]);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    async function load() {
      const [campaignResult, flashResult, storeResult] = await Promise.allSettled([
        engagementApi.active(), engagementApi.flashSales(), catalogApi.list("?limit=50"),
      ]);
      if (!active) return;
      if (campaignResult.status === "rejected" && flashResult.status === "rejected") {
        setError("Không thể tải chương trình khuyến mãi. Vui lòng thử lại.");
        setCards([]); return;
      }
      const storeSlugs = storeResult.status === "fulfilled"
        ? new Map(storeResult.value.stores.map(store => [store.id, store.slug])) : new Map<string, string>();
      const real = [
        ...(campaignResult.status === "fulfilled" ? campaignResult.value.promotions.map(item => fromVoucher(item, storeSlugs.get(item.campaign.storeId || ""))) : []),
        ...(flashResult.status === "fulfilled" ? flashResult.value.items.map(fromFlash) : []),
      ];
      const unique = [...new Map(real.map(item => [item.id, item])).values()];
      if (unique.length || !USE_MOCK_DATA) { setCards(unique); setPreview(false); return; }
      try {
        const result = await promotionApi.getAllPromotions({ isActive: true });
        if (active) { setCards(result.data.map(fromPreview)); setPreview(true); }
      } catch {
        if (active) { setCards([]); setError("Không thể tải chương trình mẫu."); }
      }
    }
    void load().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  const visible = cards.filter(item => activeTab === "all" || item.categories.includes(activeTab));
  return <div className="promotion-list-page"><ContentBreadcrumb items={[{ label: "Khuyến mãi" }]} />
    {preview && <p className="promotion-list-preview">Bản xem trước giao diện · Các chương trình bên dưới là dữ liệu minh họa, không phải ưu đãi đang hoạt động.</p>}
    <div className="promotion-list-tabs" role="group" aria-label="Lọc chương trình khuyến mãi">{tabs.map(tab => {
      const Icon = tab.icon;
      return <button type="button" key={tab.value} className={activeTab === tab.value ? "is-active" : ""} aria-pressed={activeTab === tab.value} onClick={() => setActiveTab(tab.value)}><Icon size={16} /> {tab.label}</button>;
    })}</div>
    {error ? <div className="promotion-list-state"><h2>Không thể tải khuyến mãi</h2><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div> : loading ? <div className="promotion-list-state" role="status">Đang tải khuyến mãi...</div> : visible.length ? <div className="promotion-list-grid">{visible.map(item => <article className="promotion-list-card" key={item.id}><Link className="promotion-list-card__media" to={item.href} aria-label={`Xem ${item.title}`}>{item.imageUrl ? <img src={item.imageUrl} alt={item.title} loading="lazy" onError={showImageFallback} /> : <span><TicketPercent size={58} /></span>}</Link><div className="promotion-list-card__body"><div className="promotion-list-card__tags">{item.tags.map(tag => <span key={tag}>{tag}</span>)}{item.preview && <span>Dữ liệu mẫu</span>}</div><h2>{item.title}</h2><p>{item.description}</p><div className="promotion-list-card__meta"><span><CalendarDays size={16} /> {date(item.startsAt)} – {date(item.endsAt)}</span>{item.views != null && <span><Eye size={16} /> {item.views.toLocaleString("vi-VN")} lượt xem</span>}</div><Link className="promotion-list-card__action" to={item.href}>{item.preview ? "Xem nội dung mẫu" : "Xem chi tiết"} →</Link></div></article>)}</div> : <div className="promotion-list-state"><h2>Chưa có chương trình phù hợp</h2><p>{cards.length ? "Hãy chọn một loại khuyến mãi khác." : "Hiện chưa có chương trình khuyến mãi đang diễn ra."}</p></div>}
  </div>;
}
