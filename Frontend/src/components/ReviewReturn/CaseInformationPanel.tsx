import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {participantCaseApi,type InformationRequest} from '../../api/adminCaseApi';

type ParticipantCase={id:string;kind:string;subject:string;status:string;informationRequests:InformationRequest[]};
function InformationReply({caseId,request,refresh,closed}:{caseId:string;request:InformationRequest;refresh:()=>Promise<void>;closed:boolean}){
  const [text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event:FormEvent){event.preventDefault();if(busy)return;setBusy(true);setError('');try{await participantCaseApi.reply(caseId,request.id,{message:text.trim(),version:request.version});setText('');await refresh();}catch(cause){setError(cause instanceof Error?cause.message:'Chưa gửi được phản hồi. Vui lòng tải lại hồ sơ.');}finally{setBusy(false);}}
  return <article className="mt-3 rounded-lg border border-[#dce3ee] p-3 text-sm"><strong>{request.prompt}</strong><p className="mt-1 text-xs text-[#70819d]">Hạn phản hồi: {new Date(request.dueAt).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'})}{Date.parse(request.dueAt)<Date.now()?' · Đã quá hạn, bạn vẫn có thể bổ sung thông tin.':''}</p>
    {request.replies.map(reply=><div key={reply.id} className="mt-2 border-l-2 border-[#b6c7f5] pl-3"><small>{new Date(reply.createdAt).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'})}</small><p className="whitespace-pre-wrap">{reply.message}</p></div>)}
    {closed&&<p className="mt-2 text-xs text-[#70819d]">Hồ sơ đã kết thúc. Lịch sử phản hồi vẫn được giữ nguyên.</p>}
    {!closed&&request.status!=='CANCELLED'&&<form onSubmit={submit} className="mt-3 grid gap-2"><label>Thông tin bổ sung<textarea className="mt-1 w-full rounded border p-2" required minLength={10} maxLength={2000} value={text} onChange={event=>setText(event.target.value)} disabled={busy}/></label><button className="rounded border px-3 py-2 text-[#476de4] disabled:opacity-50" disabled={busy||text.trim().length<10}>{busy?'Đang gửi…':'Gửi thông tin bổ sung'}</button></form>}
    {error&&<p role="alert" className="mt-2 text-red-700">{error}<button className="ml-2 underline" onClick={()=>void refresh()}>Tải lại</button></p>}
  </article>;
}
export default function CaseInformationPanel({shopOrderId}:{shopOrderId:string}){
  const [items,setItems]=useState<ParticipantCase[]>([]),[error,setError]=useState('');
  const load=useCallback(async()=>{setError('');try{const data=await participantCaseApi.forOrder(shopOrderId);setItems(data.items);}catch(cause){setError(cause instanceof Error?cause.message:'Chưa tải được yêu cầu bổ sung.');}},[shopOrderId]);
  useEffect(()=>{void load();},[load]);
  if(!error&&!items.some(item=>item.informationRequests.length))return null;
  return <section className="mt-5 rounded-xl border border-[#dce3ee] p-4"><h3 className="font-bold">Thông tin sàn cần bổ sung</h3>{error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}<button onClick={()=>void load()} className="ml-2 underline">Thử lại</button></p>}{items.filter(item=>item.informationRequests.length).map(item=><div className="mt-3" key={item.id}><h4 className="font-semibold text-sm">{item.kind==='RETURN'?'Trả hàng':item.kind==='TICKET'?'Hỗ trợ':'Khiếu nại'} #{item.id.slice(0,8)}</h4>{item.informationRequests.map(request=><InformationReply key={`${request.id}-${request.version}`} caseId={item.id} request={request} refresh={load} closed={['CLOSED','REJECTED','REFUNDED','RESOLVED','DECIDED'].includes(item.status)}/>)}</div>)}</section>;
}
