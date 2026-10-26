import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {storefrontApi,type HomeData} from '../../api/storefrontApi';
import Header from '../../Layouts/Header/Header';
import Footer from '../../Layouts/Footer/Footer';
import Home from '../Home/Home';
import './storefront-editor.css';
export default function StorefrontPreview(){
  const [data,setData]=useState<HomeData|null>(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;storefrontApi.preview().then(result=>{if(active)setData(result);}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Chưa thể tải bản xem trước.');});return()=>{active=false;};},[]);
  return <div className="sf-preview"><div className="sf-preview-bar"><span><strong>Xem trước bản nháp</strong> · Trang công khai chưa thay đổi</span><Link to="/admin/storefront">Quay lại biên tập</Link></div>
    {error?<p className="pa-error" role="alert">{error}</p>:data?<><Header navigationOverride={data.layout?.navigation}/><main className="container-wrapper"><Home initialData={data}/></main><Footer/></>:<p className="pa-access" role="status">Đang tải bản xem trước…</p>}
  </div>;
}
