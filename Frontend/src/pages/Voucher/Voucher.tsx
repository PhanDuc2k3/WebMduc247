import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { catalogApi, type CategoryNode } from "../../api/catalogApi";
import { engagementApi, type Campaign, type Voucher } from "../../api/engagementApi";
import { vnd } from "../../api/orderV2Api";
import { USE_MOCK_DATA } from "../../config/runtime";
import "./Voucher.css";

type Entry = { campaign: Campaign; voucher: Voucher };
type Tab = "all" | "tech" | "fashion" | "home" | "books" | "shipping";
const tabs: Array<{ value: Tab; label: string }> = [
  { value: "all", label: "Tất cả" }, { value: "tech", label: "Công nghệ" },
  { value: "fashion", label: "Thời trang" }, { value: "home", label: "Nhà cửa" },
  { value: "books", label: "Sách" }, { value: "shipping", label: "Miễn ship" },
];
const flatten = (items: CategoryNode[]): CategoryNode[] => items.flatMap(item => [item, ...flatten(item.children)]);
const formatDate = (value: string) => new Date(value).toLocaleDateString("vi-VN");

function previewEntries(): Entry[] {
  const startsAt = new Date(Date.now() - 86_400_000).toISOString();
  const endsAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const campaign = (id: string, title: string): Campaign => ({ id, storeId: null, type: "VOUCHER",
    status: "ACTIVE", fundingSource: "PLATFORM", title, startsAt, endsAt, createdAt: startsAt });
  const voucher = (id: string, code: string, discountValue: number, minSpendMinor: number, usedCount: number): Voucher => ({
    id, code, discountType: "FIXED", discountValue, maxDiscountMinor: null, minSpendMinor,
    totalLimit: 100, perUserLimit: 1, usedCount, reservedCount: 0, scopeType: "PLATFORM",
    scopeId: null, segment: code === "WELCOME50" ? "FIRST_ORDER" : "ALL", stackable: false,
  });
  return [
    { campaign: campaign("preview-welcome", "Chào thành viên mới"), voucher: voucher("preview-welcome", "WELCOME50", 50_000, 299_000, 13) },
    { campaign: campaign("preview-shipping", "Miễn phí vận chuyển"), voucher: voucher("preview-shipping", "FREESHIP", 30_000, 199_000, 15) },
  ];
}

function VoucherCard({ entry, preview, scopeLabel, onCopy }: {
  entry: Entry; preview: boolean; scopeLabel: string; onCopy: (code: string) => void;
}) {
  const { campaign, voucher } = entry;
  const available = Math.max(0, voucher.totalLimit - voucher.usedCount - voucher.reservedCount);
  const usedPercent = voucher.totalLimit ? Math.min(100, Math.round((voucher.usedCount / voucher.totalLimit) * 100)) : 0;
  const remainingPercent = voucher.totalLimit ? Math.round((available / voucher.totalLimit) * 100) : 0;
  const summary = voucher.discountType === "FIXED" ? `Giảm tối đa ${vnd(voucher.discountValue)}` :
    `Giảm ${voucher.discountValue / 100}%${voucher.maxDiscountMinor != null ? `, tối đa ${vnd(voucher.maxDiscountMinor)}` : ""}`;

  return <article className={`voucher-card${preview ? " is-preview" : ""}`}>
    <header><h2>{campaign.title}</h2>{preview ? <span className="voucher-card__code" title="Mã mẫu, chưa áp dụng được">{voucher.code}</span> : <button type="button" className="voucher-card__code" onClick={() => onCopy(voucher.code)} title="Sao chép mã voucher" aria-label={`Sao chép mã ${voucher.code}`}>{voucher.code}</button>}</header>
    <p className="voucher-card__summary">{summary}</p>
    <div className="voucher-card__details"><p><strong>Điều kiện:</strong> {voucher.minSpendMinor ? `Đơn từ ${vnd(voucher.minSpendMinor)}` : "Không yêu cầu giá trị đơn tối thiểu"}</p><p><strong>Ngày áp dụng:</strong> {formatDate(campaign.startsAt)} → {formatDate(campaign.endsAt)}</p><p>{scopeLabel}{voucher.segment === "FIRST_ORDER" ? " · Chỉ áp dụng cho đơn đầu tiên" : ""}</p></div>
    <div className="voucher-card__usage"><span>Đã sử dụng: {usedPercent}%</span><span>Còn lại: {remainingPercent}%</span></div><div className="voucher-card__progress" role="progressbar" aria-label={`Đã sử dụng ${usedPercent}%`} aria-valuenow={usedPercent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${usedPercent}%` }} /></div>
    {preview && <p className="voucher-card__preview-note">Mẫu giao diện · Không thể áp dụng tại thanh toán</p>}
  </article>;
}

export default function VoucherPage() {
  const [items, setItems] = useState<Entry[]>([]);
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [storeCategories, setStoreCategories] = useState<Record<string, string>>({});
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [examples] = useState(previewEntries);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    engagementApi.active().then(result => {
      if (active) setItems(result.promotions.filter(item => item.campaign.storeId === null));
    })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Không thể tải voucher."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => {
    let active = true;
    Promise.allSettled([catalogApi.categories(), catalogApi.list("?limit=50")]).then(results => {
      if (!active) return;
      if (results[0].status === "fulfilled") setCategoryNames(Object.fromEntries(flatten(results[0].value.categories).map(item => [item.id, item.name])));
      if (results[1].status === "fulfilled") {
        setStoreCategories(Object.fromEntries(results[1].value.stores.map(item => [item.id, item.category || ""])));
        setStoreNames(Object.fromEntries(results[1].value.stores.map(item => [item.id, item.name])));
      }
    });
    return () => { active = false; };
  }, []);

  const preview = USE_MOCK_DATA && !loading && !error && !items.length;
  const source = preview ? examples : items;
  const classify = (entry: Entry): Tab | "other" => {
    const text = `${entry.campaign.title} ${entry.voucher.code}`.toLocaleLowerCase("vi-VN");
    if (/miễn.*ship|free.*ship|vận chuyển/.test(text)) return "shipping";
    const scope = entry.voucher.scopeType === "CATEGORY" ? categoryNames[entry.voucher.scopeId || ""] :
      entry.voucher.scopeType === "STORE" ? storeCategories[entry.campaign.storeId || ""] : "";
    if (/điện tử|công nghệ|thiết bị/.test(scope.toLocaleLowerCase("vi-VN"))) return "tech";
    if (/thời trang/.test(scope.toLocaleLowerCase("vi-VN"))) return "fashion";
    if (/nhà cửa|gia dụng/.test(scope.toLocaleLowerCase("vi-VN"))) return "home";
    if (/sách|văn phòng phẩm/.test(scope.toLocaleLowerCase("vi-VN"))) return "books";
    return "other";
  };
  const counts = Object.fromEntries(tabs.map(tab => [tab.value, tab.value === "all" ? source.length : source.filter(entry => classify(entry) === tab.value).length]));
  const visible = source.filter(entry => {
    if (activeTab !== "all" && classify(entry) !== activeTab) return false;
    const keyword = search.trim().toLocaleLowerCase("vi-VN");
    return !keyword || `${entry.campaign.title} ${entry.voucher.code}`.toLocaleLowerCase("vi-VN").includes(keyword);
  });

  function scopeLabel(entry: Entry) {
    const { campaign, voucher } = entry;
    if (voucher.scopeType === "PLATFORM") return "Áp dụng toàn hệ thống";
    if (voucher.scopeType === "CATEGORY") return `Áp dụng cho ${categoryNames[voucher.scopeId || ""] || "danh mục phù hợp"}`;
    if (voucher.scopeType === "STORE") return `Áp dụng tại ${storeNames[campaign.storeId || ""] || "cửa hàng phát hành"}`;
    return "Áp dụng cho sản phẩm phù hợp";
  }
  async function copy(code: string) {
    try { await navigator.clipboard.writeText(code); toast.success("Đã sao chép mã voucher.", { containerId: "general-toast" }); }
    catch { toast.error("Không thể sao chép mã.", { containerId: "general-toast" }); }
  }

  return <div className="voucher-page"><ContentBreadcrumb items={[{ label: "Kho voucher" }]} /><h1 className="sr-only">Kho voucher</h1>
    {preview && <p className="voucher-preview-banner">Bản xem trước giao diện · Hiện chưa có voucher đang hoạt động để sử dụng.</p>}
    <div className="voucher-tabs" role="group" aria-label="Lọc voucher theo ngành hàng">{tabs.map(tab => <button type="button" key={tab.value} className={activeTab === tab.value ? "is-active" : ""} aria-pressed={activeTab === tab.value} onClick={() => setActiveTab(tab.value)}>{tab.label} ({counts[tab.value]})</button>)}</div>
    <input className="voucher-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm kiếm voucher..." aria-label="Tìm kiếm voucher" />
    {error ? <div className="voucher-state"><h2>Không thể tải voucher</h2><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div> : loading ? <div className="voucher-state" role="status">Đang tải voucher...</div> : visible.length ? <div className="voucher-grid">{visible.map(entry => <VoucherCard key={entry.voucher.id} entry={entry} preview={preview} scopeLabel={scopeLabel(entry)} onCopy={code => void copy(code)} />)}</div> : <div className="voucher-state"><h2>Chưa có voucher phù hợp</h2><p>{source.length ? "Thử tìm tên hoặc chọn danh mục khác." : "Hiện chưa có voucher đang hoạt động."}</p></div>}
    {!preview && items.length > 0 && <p className="voucher-footnote">Điều kiện và số lượt sử dụng sẽ được kiểm tra lại khi thanh toán.</p>}
  </div>;
}
