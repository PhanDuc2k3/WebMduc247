import {useEffect,useRef,useState,type FormEvent} from 'react';
import {taxonomyApi as api,type CsvImport} from '../../api/taxonomyApi';
import {adminRequestId} from '../../api/adminCommand';
import {date} from './AdminUi';
const headers={categories:'name,slug,parentSlug,description,sortOrder,isActive,iconKey,imageKey',attributes:'categorySlug,code,label,type,required,unit,allowedValues,legacyPolicy'};
export default function TaxonomyImports({version,canImport,changed}:{version:number;canImport:boolean;changed:()=>void}){
  const [kind,setKind]=useState<'categories'|'attributes'>('categories'),[csv,setCsv]=useState(''),[filename,setFilename]=useState('catalog.csv'),[reason,setReason]=useState('');
  const [history,setHistory]=useState<CsvImport[]>([]),[preview,setPreview]=useState<CsvImport|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const attempt=useRef({signature:'',requestId:''});
  function load(){api.imports().then(r=>setHistory(r.items)).catch(e=>setError(e.message));}useEffect(load,[]);
  async function check(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNotice('');const input={kind,csv,filename,version,reason};
    try{setPreview(await api.previewCsv({...input,requestId:adminRequestId(attempt.current,input)}));load();}catch(e){setError(e instanceof Error?e.message:'Chưa kiểm tra được file.');}finally{setBusy(false);}}
  async function commit(){if(!preview)return;setBusy(true);setError('');try{const result=await api.commitCsv(preview.id);setPreview(p=>p?{...p,status:'APPLIED'}:null);setNotice(`Đã áp dụng ${result.applied} mục trong một giao dịch.`);load();changed();}catch(e){setError(e instanceof Error?e.message:'Chưa nhập được file.');}finally{setBusy(false);}}
  return <section className="pa-panel tx-editor"><h2>Nhập CSV có kiểm tra trước</h2><p>Tối đa 200 dòng / 256 KB. CSV danh mục chỉ tạo mới; có thể khai báo cha trước hoặc sau con. CSV thuộc tính cập nhật các mã có trong file và giữ các mã khác. File có bất kỳ lỗi nào sẽ không được áp dụng.</p>
    {error&&<p className="pa-error" role="alert">{error}</p>}{notice&&<p className="pa-success" role="status">{notice}</p>}
    <form onSubmit={check}><fieldset disabled={!canImport||busy} className="tx-fields"><label>Loại file<select value={kind} onChange={e=>{setKind(e.target.value as typeof kind);setPreview(null);}}><option value="categories">Danh mục</option><option value="attributes">Thuộc tính</option></select></label>
      <label>File CSV<input type="file" accept=".csv,text/csv" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>262144){setError('File vượt 256 KB.');return;}setFilename(file.name);setCsv(await file.text());setPreview(null);}}/></label>
      <p className="tx-wide">Tiêu đề bắt buộc: <code>{headers[kind]}</code></p><p className="tx-wide">Boolean dùng true/false. Giá trị lựa chọn phân cách bằng |. legacyPolicy dùng ON_EDIT hoặc NEW_ONLY.</p>
      <label className="tx-wide">Nội dung CSV<textarea className="tx-csv" required value={csv} onChange={e=>{setCsv(e.target.value);setPreview(null);}} placeholder={headers[kind]}/></label>
      <label className="tx-wide">Lý do nhập<textarea required minLength={8} maxLength={500} value={reason} onChange={e=>{setReason(e.target.value);setPreview(null);}}/></label><button className="pa-button tx-wide">Kiểm tra toàn bộ file</button>
    </fieldset></form>
    {preview&&<div className="tx-import-preview"><h3>Kết quả kiểm tra: {preview.status} · {preview.row_count} dòng</h3>
      {!!preview.errors.length&&<div className="pa-table-scroll"><table className="pa-table"><thead><tr><th>Dòng</th><th>Lỗi</th></tr></thead><tbody>{preview.errors.map((e,i)=><tr key={i}><td>{e.line}</td><td>{e.message}</td></tr>)}</tbody></table></div>}
      <details><summary>Xem danh sách sẽ áp dụng</summary><pre>{JSON.stringify(preview.plan,null,2)}</pre></details>
      {preview.status==='PREVIEWED'&&<button className="pa-button" disabled={busy||!canImport} onClick={()=>void commit()}>Xác nhận nhập toàn bộ file hợp lệ</button>}
    </div>}
    <h3>Lịch sử nhập</h3><div className="pa-table-scroll"><table className="pa-table"><thead><tr><th>File / loại</th><th>Trạng thái</th><th>Số dòng / lỗi</th><th>Thời gian</th></tr></thead><tbody>{history.map(row=><tr key={row.id}><td>{row.filename}<small>{row.kind}</small></td><td>{row.status}</td><td>{row.row_count} / {row.errors.length}<details><summary>Lỗi từng dòng</summary>{row.errors.map((e,i)=><p key={i}>Dòng {e.line}: {e.message}</p>)}</details></td><td>{date(row.created_at,true)}</td></tr>)}</tbody></table></div>
  </section>;
}
