import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { engagementApi, type FlashSaleItem } from "../../api/engagementApi";
import { vnd } from "../../api/orderV2Api";

function remainingText(milliseconds:number){
  const seconds=Math.max(0,Math.ceil(milliseconds/1000));
  const hours=Math.floor(seconds/3600),minutes=Math.floor((seconds%3600)/60);
  return `${hours.toString().padStart(2,"0")}:${minutes.toString().padStart(2,"0")}:${(seconds%60).toString().padStart(2,"0")}`;
}
export default function FlashSalesV2(){
  const [items,setItems]=useState<FlashSaleItem[]>([]);
  const [anchor,setAnchor]=useState({ serverMs:0,perfMs:0 });
  const [tick,setTick]=useState(0);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let active=true;
    engagementApi.flashSales().then(result=>{
      if(!active) return;
      setItems(result.items);
      const perf=performance.now();
      setAnchor({serverMs:Date.parse(result.serverTime),perfMs:perf});
      setTick(perf);
    }).catch(error=>{if(active)toast.error(error instanceof Error?error.message:"Không thể tải Flash Sale.",
      {containerId:"general-toast"});}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{const timer=setInterval(()=>setTick(performance.now()),1000);return()=>clearInterval(timer);},[]);
  const serverNow=anchor.serverMs+Math.max(0,tick-anchor.perfMs);
  return <div className="py-8 pb-16"><h1 className="text-3xl font-extrabold text-[#172a49]">Flash Sale</h1>
    <p className="mt-2 text-[#70819d]">Giá và thời gian được xác định trên server. Quota được kiểm tra lại khi đặt đơn.</p>
    {loading?<p className="mt-7">Đang tải Flash Sale...</p>:items.some(item=>Date.parse(item.endsAt)>serverNow)?
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.filter(item=>Date.parse(item.endsAt)>serverNow).map(item=>
        <Link key={item.campaignId+item.variantId} to={`/products/${item.productId}`}
          className="rounded-2xl border border-[#e6ebf5] bg-white p-4 shadow-sm hover:border-[#476de4]">
          <div className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-[#f2f5fb]">
            <img src={item.imageUrl||"/visual-placeholder.svg"} alt={item.productName} className="h-full w-full object-contain" /></div>
          <p className="mt-3 text-sm font-bold text-[#476de4]">{item.title}</p>
          <h2 className="mt-1 font-bold text-[#172a49]">{item.productName}</h2>
          <strong className="mt-3 block text-xl text-red-600">{vnd(item.salePriceMinor)}</strong>
          <del className="text-sm text-[#70819d]">{vnd(item.regularPriceMinor)}</del>
          <p className="mt-3 text-sm">Còn {Math.max(0,Math.min(item.availableStock,item.quota-item.soldCount-item.reservedCount))} suất</p>
          <p className="mt-1 text-sm font-bold text-[#476de4]">Kết thúc sau {remainingText(Date.parse(item.endsAt)-serverNow)}</p>
        </Link>)}</div>:
      <div className="mt-6 rounded-2xl bg-white p-8 text-[#70819d]">Hiện chưa có Flash Sale đang diễn ra.</div>}
  </div>;
}
