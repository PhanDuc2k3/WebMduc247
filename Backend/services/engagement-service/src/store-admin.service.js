import {requireAdminScope} from '../../../packages/contracts/admin-rbac.js';
import {adminId} from '../../../packages/contracts/platform-admin.js';
import {dashboardRange} from '../../../packages/contracts/admin-dashboard.js';
export async function storeRatingSummary(pool,actor,id,query={}){
  adminId(id);requireAdminScope(actor,'stores.read',{storeId:id});const range=dashboardRange(query);
  const {rows}=await pool.query(`SELECT count(*)::int AS review_count,avg(rating)::float8 AS average_rating
    FROM engagement.reviews WHERE store_id=$1 AND status='PUBLISHED' AND created_at>=$2 AND created_at<$3`,[id,range.start,range.end]);
  return {...rows[0],updatedAt:new Date().toISOString(),range:{from:range.from,to:range.to},definition:'Đánh giá đã công khai, theo ngày tạo trong kỳ; không có đánh giá thì điểm là chưa có dữ liệu.'};
}
