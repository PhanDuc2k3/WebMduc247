import {useCallback,useEffect,useRef,useState} from 'react';
export function useDashboardRegion<T>(key:string,enabled:boolean,fetcher:()=>Promise<T>) {
  const fetchRef=useRef(fetcher);fetchRef.current=fetcher;
  const [revision,setRevision]=useState(0),[state,setState]=useState<{data:T|null;error:string;loading:boolean}>({data:null,error:'',loading:enabled});
  useEffect(()=>{
    let active=true;
    if(!enabled){setState({data:null,error:'',loading:false});return;}
    setState({data:null,error:'',loading:true});
    fetchRef.current().then(data=>{if(active)setState({data,error:'',loading:false});})
      .catch(cause=>{if(active)setState({data:null,error:cause instanceof Error?cause.message:'Chưa tải được dữ liệu.',loading:false});});
    return()=>{active=false;};
  },[key,enabled,revision]);
  const retry=useCallback(()=>setRevision(value=>value+1),[]);
  return {...state,retry};
}
export const workLabels:Record<string,string>={ORDER:'Đơn quá hạn xử lý',RETURN:'Trả hàng chờ xử lý',TICKET:'Ticket hỗ trợ',DISPUTE:'Khiếu nại / tranh chấp',REFUND:'Hoàn tiền lỗi / chờ xác minh',ABUSE_REPORT:'Báo cáo vi phạm'};
export const sourceLabels:Record<string,string>={orders:'Đơn hàng',cases:'Hồ sơ hậu mãi',payment:'Hoàn tiền',chat:'Báo cáo vi phạm'};
