import { useEffect, useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { catalogApi } from "../../api/catalogApi";

type Balance = Awaited<ReturnType<typeof catalogApi.inventory>>;
export default function InventoryPanel({ variantId, onAdjusted }: { variantId: string; onAdjusted: () => Promise<unknown> }) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  useEffect(() => {
    let active = true;
    catalogApi.inventory(variantId, page).then(result => { if (active) setBalance(result); })
      .catch(error => { if (active) toast.error(error instanceof Error ? error.message : "Không thể tải tồn kho.", { containerId: "general-toast" }); });
    return () => { active = false; };
  }, [variantId, page]);
  function submit(event: FormEvent) {
    event.preventDefault();
    void (async () => {
      setBusy(true);
      try {
        await catalogApi.adjustInventory(variantId, Number(delta), reason);
        setDelta(""); setReason("");
        toast.success("Đã điều chỉnh tồn kho.", { containerId: "general-toast" });
        try {
          setPage(1); setBalance(await catalogApi.inventory(variantId, 1));
          await onAdjusted();
        } catch { toast.warning("Đã lưu tồn kho nhưng chưa tải lại được lịch sử.", { containerId: "general-toast" }); }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể điều chỉnh tồn kho.", { containerId: "general-toast" });
      } finally { setBusy(false); }
    })();
  }
  return <section className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Tồn kho SKU</h2><p className="mt-2 text-sm text-[#718099]">Tồn khả dụng = hàng thực có − hàng đang giữ.</p>{balance ? <div className="mt-4 grid gap-3 sm:grid-cols-3">{([["Hàng thực có", balance.onHand], ["Đang giữ", balance.reserved], ["Khả dụng", balance.available]] as const).map(([label, value]) => <div key={label} className="rounded-xl bg-[#f4f7fb] p-4"><small className="text-[#718099]">{label}</small><strong className="mt-1 block text-2xl text-[#172b49]">{value}</strong></div>)}</div> : <p className="mt-4 text-sm">Đang tải tồn kho...</p>}<form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={submit}><label className="text-sm font-bold">Thay đổi số lượng<input className="mt-1 block w-36 rounded-xl border border-[#dce3ee] px-3 py-2" type="number" step="1" value={delta} onChange={event => setDelta(event.target.value)} placeholder="+10 hoặc -3" required /></label><label className="min-w-48 flex-1 text-sm font-bold">Lý do<input className="mt-1 w-full rounded-xl border border-[#dce3ee] px-3 py-2" value={reason} onChange={event => setReason(event.target.value)} minLength={3} maxLength={300} required /></label><button className="rounded-xl bg-[#476de4] px-4 py-2 font-bold text-white disabled:opacity-50" disabled={busy}>Lưu điều chỉnh</button></form><h3 className="mt-7 font-bold">Lịch sử gần đây</h3><div className="mt-3 space-y-2">{balance?.movements.length ? balance.movements.map(item => <div key={item.id} className="flex flex-wrap justify-between gap-2 border-b border-[#e8edf5] pb-2 text-sm"><span>{item.reason} · {item.source}</span><span className="font-bold">{item.delta > 0 ? "+" : ""}{item.delta}</span><small className="text-[#718099]">{new Date(item.occurredAt).toLocaleString("vi-VN")}</small></div>) : <p className="text-sm text-[#718099]">Chưa có lịch sử.</p>}</div>{balance && balance.total > 20 && <nav className="mt-4 flex items-center gap-3 text-sm"><button type="button" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Trước</button><span>Trang {page} / {Math.ceil(balance.total / 20)}</span><button type="button" disabled={page * 20 >= balance.total} onClick={() => setPage(current => current + 1)}>Sau</button></nav>}</section>;
}
