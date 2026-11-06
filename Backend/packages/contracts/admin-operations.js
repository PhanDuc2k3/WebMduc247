import {adminQuery,adminMutation,PlatformAdminError} from './platform-admin.js';

export function operationsQuery(query={},statuses=[],extra=[]) {
  if(Object.keys(query).some(key=>!['q','status','page','limit','from','to','storeId',...extra].includes(key)))throw new PlatformAdminError(400,'INVALID_ADMIN_FILTER','Bộ lọc không hợp lệ.');
  const base=Object.fromEntries(Object.entries(query).filter(([key])=>!extra.includes(key)));
  const result=adminQuery(base,{statuses});
  for(const key of ['from','to'])if(query[key]&&(!/^\d{4}-\d{2}-\d{2}$/.test(query[key])||!Number.isFinite(Date.parse(query[key]))||new Date(query[key]).toISOString().slice(0,10)!==query[key]))throw new PlatformAdminError(400,'INVALID_DATE','Ngày không hợp lệ.');
  if(query.from&&query.to&&query.from>query.to)throw new PlatformAdminError(400,'INVALID_DATE','Khoảng ngày không hợp lệ.');
  return {...result,from:query.from?`${query.from}T00:00:00+07:00`:null,to:query.to?new Date(Date.parse(`${query.to}T00:00:00+07:00`)+86400000).toISOString():null};
}
export function operationsCommand(input) {
  if(!input||Object.keys(input).some(key=>!['reason','version','requestId'].includes(key)))throw new PlatformAdminError(400,'INVALID_ADMIN_ACTION','Thao tác không hợp lệ.');
  return adminMutation(input);
}
