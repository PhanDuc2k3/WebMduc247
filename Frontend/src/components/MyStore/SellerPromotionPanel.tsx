import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { engagementApi, type Campaign, type Voucher } from "../../api/engagementApi";
import { catalogApi, type CatalogItem, type CategoryNode } from "../../api/catalogApi";
import { vnd } from "../../api/orderV2Api";

const field="mt-1 w-full rounded-xl border border-[#dce3ee] bg-white px-3 py-2 text-sm";
const localTime=(milliseconds:number)=>{
  const date=new Date(milliseconds);
  return new Date(milliseconds-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
};
export default function SellerPromotionPanel({storeId,products}:{storeId:string;products:CatalogItem[]}){
  const [campaigns,setCampaigns]=useState<Array<Campaign&{voucher?:Voucher;flashItems?:Array<{
    variantId:string;salePriceMinor:number;quota:number;soldCount:number;reservedCount:number }> }>>([]);
  const [loading,setLoading]=useState(true);
  const [categories,setCategories]=useState<Array<{id:string;name:string}>>([]);
  const [busy,setBusy]=useState(false);
  const [form,setForm]=useState({ title:"",code:"",discountType:"FIXED",discountValue:"10000",
    minSpendMinor:"0",maxDiscountMinor:"",totalLimit:"100",perUserLimit:"1",
    scopeType:"STORE",scopeId:"",segment:"ALL",
    startsAt:localTime(Date.now()),endsAt:localTime(Date.now()+86400_000) });
  const [flash,setFlash]=useState({ title:"",variantId:"",salePriceMinor:"",
    quota:"10",startsAt:localTime(Date.now()),endsAt:localTime(Date.now()+3600_000) });
  const variants=useMemo(()=>products.flatMap(product=>(product.variants||[]).map(item=>({
    id:item.id,label:`${product.name} · ${item.sku} · ${vnd(item.priceMinor)}`,
    price:item.priceMinor
  }))),[products]);
  useEffect(()=>{
    let active=true;setLoading(true);
    engagementApi.seller(storeId).then(result=>{if(active)setCampaigns(result.campaigns);})
      .catch(error=>{if(active)toast.error(error instanceof Error?error.message:"Không thể tải chương trình.",
        {containerId:"general-toast"});})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[storeId]);
  useEffect(()=>{
    let active=true;
    const flatten=(nodes:CategoryNode[],level=0):Array<{id:string;name:string}>=>
      nodes.flatMap(item=>[{id:item.id,name:`${"— ".repeat(level)}${item.name}`},
        ...flatten(item.children||[],level+1)]);
    catalogApi.categories().then(result=>{if(active)setCategories(flatten(result.categories));})
      .catch(error=>{if(active)toast.warning(error instanceof Error?error.message:"Chưa thể tải danh mục.",
        {containerId:"general-toast",toastId:"promo-categories"});});
    return()=>{active=false;};
  },[]);
  async function reload(){setCampaigns((await engagementApi.seller(storeId)).campaigns);}
  async function createVoucher(event:FormEvent){
    event.preventDefault();setBusy(true);
    try{
      await engagementApi.createVoucher(storeId,{
        title:form.title.trim(),code:form.code.trim().toUpperCase(),
        discountType:form.discountType,discountValue:form.discountType==="PERCENT"?
          Math.round(Number(form.discountValue)*100):Number(form.discountValue),
        minSpendMinor:Number(form.minSpendMinor),
        maxDiscountMinor:form.maxDiscountMinor?Number(form.maxDiscountMinor):null,
        totalLimit:Number(form.totalLimit),perUserLimit:Number(form.perUserLimit),
        scopeType:form.scopeType,scopeId:form.scopeType==="STORE"?null:form.scopeId,
        segment:form.segment,startsAt:new Date(form.startsAt).toISOString(),
        endsAt:new Date(form.endsAt).toISOString()
      });
      await reload();setForm(current=>({...current,title:"",code:""}));
      toast.success("Đã tạo voucher shop.",{containerId:"general-toast"});
    }catch(error){toast.error(error instanceof Error?error.message:"Không thể tạo voucher.",{containerId:"general-toast"});}
    finally{setBusy(false);}
  }
  async function createFlash(event:FormEvent){
    event.preventDefault();setBusy(true);
    try{
      await engagementApi.createFlashSale(storeId,{
        title:flash.title.trim(),startsAt:new Date(flash.startsAt).toISOString(),
        endsAt:new Date(flash.endsAt).toISOString(),
        items:[{variantId:flash.variantId,salePriceMinor:Number(flash.salePriceMinor),quota:Number(flash.quota)}]
      });
      await reload();setFlash(current=>({...current,title:"",salePriceMinor:""}));
      toast.success("Đã tạo Flash Sale.",{containerId:"general-toast"});
    }catch(error){toast.error(error instanceof Error?error.message:"Không thể tạo Flash Sale.",{containerId:"general-toast"});}
    finally{setBusy(false);}
  }
  async function toggle(campaign:Campaign){
    setBusy(true);
    try{
      await engagementApi.setStatus(campaign.id,campaign.status==="ACTIVE"?"PAUSED":"ACTIVE");
      await reload();toast.success("Đã cập nhật chương trình.",{containerId:"general-toast"});
    }catch(error){toast.error(error instanceof Error?error.message:"Không thể cập nhật chương trình.",{containerId:"general-toast"});}
    finally{setBusy(false);}
  }
  return <section className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm sm:p-6">
    <h2 className="text-xl font-bold">Khuyến mãi của shop</h2>
    <p className="mt-1 text-sm text-[#718099]">Giá và quota được kiểm tra trên server. Mỗi checkout dùng tối đa một mã shop cùng một mã sàn.</p>
    {loading?<p className="mt-4">Đang tải...</p>:campaigns.length?
      <div className="mt-4 space-y-2">{campaigns.map(item=><div key={item.id}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
        <div><strong>{item.title}</strong><p className="text-sm text-[#718099]">{item.type==="VOUCHER"?
          `Mã ${item.voucher?.code} · Đã dùng ${item.voucher?.usedCount||0}/${item.voucher?.totalLimit||0}`:
          `Flash Sale · ${item.flashItems?.reduce((sum,flash)=>sum+flash.soldCount,0)||0} đã bán`} · {item.status} · đến {new Date(item.endsAt).toLocaleString("vi-VN")}</p></div>
        {item.status!=="ENDED" && <button type="button" disabled={busy} onClick={()=>void toggle(item)}
          className="font-bold text-[#476de4] disabled:opacity-50">{item.status==="ACTIVE"?"Tạm dừng":"Bật lại"}</button>}
      </div>)}</div>:<p className="mt-4 text-sm text-[#718099]">Chưa có chương trình.</p>}
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <form onSubmit={createVoucher} className="space-y-3 rounded-xl bg-[#f7f9fd] p-4">
        <h3 className="font-bold">Tạo voucher</h3>
        <label className="block text-sm">Tên chương trình<input required minLength={3} className={field}
          value={form.title} onChange={event=>setForm({...form,title:event.target.value})}/></label>
        <label className="block text-sm">Mã voucher<input required minLength={4} maxLength={32} className={field}
          value={form.code} onChange={event=>setForm({...form,code:event.target.value.toUpperCase()})}/></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">Loại giảm<select className={field}
          value={form.discountType} onChange={event=>setForm({...form,discountType:event.target.value,
            discountValue:event.target.value==="PERCENT"?"10":"10000"})}>
          <option value="FIXED">Số tiền (₫)</option><option value="PERCENT">Phần trăm (%)</option></select></label>
          <label className="text-sm">Giá trị<input required type="number" min={form.discountType==="PERCENT"?0.01:1}
            step={form.discountType==="PERCENT"?"0.01":"1"}
            max={form.discountType==="PERCENT"?100:undefined} className={field} value={form.discountValue}
            onChange={event=>setForm({...form,discountValue:event.target.value})}/></label></div>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">Đơn tối thiểu (₫)<input type="number" min={0}
          className={field} value={form.minSpendMinor} onChange={event=>setForm({...form,minSpendMinor:event.target.value})}/></label>
          <label className="text-sm">Giảm tối đa (₫)<input type="number" min={0} placeholder="Không giới hạn"
            className={field} value={form.maxDiscountMinor} onChange={event=>setForm({...form,maxDiscountMinor:event.target.value})}/></label></div>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">Tổng lượt<input required type="number" min={1}
          className={field} value={form.totalLimit} onChange={event=>setForm({...form,totalLimit:event.target.value})}/></label>
          <label className="text-sm">Lượt mỗi người<input required type="number" min={1} className={field}
            value={form.perUserLimit} onChange={event=>setForm({...form,perUserLimit:event.target.value})}/></label></div>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">Phạm vi<select className={field}
          value={form.scopeType} onChange={event=>setForm({...form,scopeType:event.target.value,scopeId:""})}>
          <option value="STORE">Cả shop</option><option value="SKU">Một SKU</option><option value="CATEGORY">Danh mục</option></select></label>
          <label className="text-sm">Đối tượng<select className={field} value={form.segment}
            onChange={event=>setForm({...form,segment:event.target.value})}>
            <option value="ALL">Mọi người mua</option><option value="FIRST_ORDER">Đơn đầu tiên</option></select></label></div>
        {form.scopeType==="SKU" && <label className="block text-sm">SKU<select required className={field}
          value={form.scopeId} onChange={event=>setForm({...form,scopeId:event.target.value})}>
          <option value="">Chọn SKU</option>{variants.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
        {form.scopeType==="CATEGORY" && <label className="block text-sm">Danh mục<select required className={field}
          value={form.scopeId} onChange={event=>setForm({...form,scopeId:event.target.value})}>
          <option value="">Chọn danh mục</option>{categories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>}
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">Bắt đầu<input required type="datetime-local" className={field}
          value={form.startsAt} onChange={event=>setForm({...form,startsAt:event.target.value})}/></label>
          <label className="text-sm">Kết thúc<input required type="datetime-local" className={field}
            value={form.endsAt} onChange={event=>setForm({...form,endsAt:event.target.value})}/></label></div>
        <button disabled={busy} className="rounded-xl bg-[#476de4] px-4 py-2 font-bold text-white disabled:opacity-50">Tạo voucher</button>
      </form>
      <form onSubmit={createFlash} className="space-y-3 rounded-xl bg-[#f7f9fd] p-4">
        <h3 className="font-bold">Tạo Flash Sale</h3>
        <label className="block text-sm">Tên chương trình<input required minLength={3} className={field}
          value={flash.title} onChange={event=>setFlash({...flash,title:event.target.value})}/></label>
        <label className="block text-sm">SKU<select required className={field} value={flash.variantId}
          onChange={event=>setFlash({...flash,variantId:event.target.value})}>
          <option value="">Chọn SKU</option>{variants.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">Giá Flash (₫)<input required type="number" min={1}
          className={field} value={flash.salePriceMinor} onChange={event=>setFlash({...flash,salePriceMinor:event.target.value})}/></label>
          <label className="text-sm">Quota<input required type="number" min={1} className={field}
            value={flash.quota} onChange={event=>setFlash({...flash,quota:event.target.value})}/></label></div>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">Bắt đầu<input required type="datetime-local" className={field}
          value={flash.startsAt} onChange={event=>setFlash({...flash,startsAt:event.target.value})}/></label>
          <label className="text-sm">Kết thúc<input required type="datetime-local" className={field}
            value={flash.endsAt} onChange={event=>setFlash({...flash,endsAt:event.target.value})}/></label></div>
        <button disabled={busy||!variants.length} className="rounded-xl bg-[#476de4] px-4 py-2 font-bold text-white disabled:opacity-50">Tạo Flash Sale</button>
      </form>
    </div>
  </section>;
}
