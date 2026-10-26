import { randomUUID } from 'node:crypto';
import { PromotionError } from './service.js';
import { normalizeImage } from '../../../packages/contracts/image-validation.js';
import { scanWithClamAv } from '../../identity-service/src/services/clam-scanner.service.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(status,code,message)=>new PromotionError(status,code,message);
export function cleanReviewText(value,min,max) {
  if(typeof value!=='string') throw fail(400,'INVALID_CONTENT','Nội dung không hợp lệ.');
  const text=value.trim();
  if(text.length<min||text.length>max||/<[^>]*>|https?:\/\/|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:\+?\d[\s().-]*){9,}|\b\d{1,5}\s+(?:đường|phố|ngõ|hẻm|street|road|avenue)\b|\b(?:địa chỉ|address)\s*:/i.test(text))
    throw fail(400,'UNSAFE_CONTENT','Nội dung có liên kết hoặc thông tin liên hệ, hoặc độ dài không hợp lệ.');
  return text;
}

export class ReviewService {
  constructor(pool,promotion,scanner=null){this.pool=pool;this.promotion=promotion;this.scanner=scanner;}
  async summary(db,productId){
    await db.query(`INSERT INTO engagement.product_rating_summary(product_id,average_rating,review_count,updated_at)
      SELECT $1,coalesce(round(avg(rating)::numeric,2),0),count(*)::int,now()
      FROM engagement.reviews WHERE product_id=$1 AND status='PUBLISHED'
      ON CONFLICT(product_id) DO UPDATE SET average_rating=EXCLUDED.average_rating,
      review_count=EXCLUDED.review_count,updated_at=now()`,[productId]);
  }
  async create(buyerId,input){
    const itemId=input?.orderItemId;
    if(!uuid.test(String(itemId))||!Number.isInteger(input.rating)||input.rating<1||input.rating>5)
      throw fail(400,'INVALID_REVIEW','Mã sản phẩm hoặc điểm không hợp lệ.');
    const title=cleanReviewText(input.title,3,120),content=cleanReviewText(input.content,10,2000);
    const db=await this.pool.connect();
    try{
      await db.query('BEGIN');
      const item=(await db.query(`SELECT i.product_id,o.store_id,o.status FROM order_service.order_items i
        JOIN order_service.orders o ON o.id=i.order_id WHERE i.id=$1 AND o.user_id=$2 FOR UPDATE OF i`,
        [itemId,buyerId])).rows[0];
      if(!item) throw fail(404,'ORDER_ITEM_NOT_FOUND','Không tìm thấy sản phẩm trong đơn của bạn.');
      if(!['DELIVERED','COMPLETED'].includes(item.status))
        throw fail(409,'REVIEW_NOT_ELIGIBLE','Chỉ đánh giá sau khi đã giao hàng.');
      const row=(await db.query(`INSERT INTO engagement.reviews
        (buyer_id,product_id,order_item_id,store_id,rating,title,content)
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(order_item_id) DO NOTHING RETURNING *`,
        [buyerId,item.product_id,itemId,item.store_id,input.rating,title,content])).rows[0];
      if(!row) throw fail(409,'REVIEW_EXISTS','Sản phẩm trong đơn này đã được đánh giá.');
      await this.summary(db,row.product_id);
      await db.query('INSERT INTO engagement.review_outbox(event_type,payload) VALUES ($1,$2)',
        ['ReviewPublished.v1',{reviewId:row.id,productId:row.product_id}]);
      await db.query('COMMIT');
      await this.syncCatalog(row.product_id).catch(error=>console.error('Review rating sync pending:',error.message));
      return {review:this.dto(row)};
    }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }
  dto(row){return {id:row.id,buyerId:row.buyer_id,productId:row.product_id,orderItemId:row.order_item_id,
    storeId:row.store_id,rating:row.rating,title:row.title,content:row.content,status:row.status,
    version:row.version,helpfulCount:row.helpful_count,createdAt:row.created_at,updatedAt:row.updated_at};}
  async edit(buyerId,id,input){
    if(!uuid.test(String(id))||!Number.isInteger(input?.expectedVersion)||input.expectedVersion<1||
      !Number.isInteger(input?.rating)||input.rating<1||input.rating>5) throw fail(400,'INVALID_REVIEW','Đánh giá không hợp lệ.');
    const title=cleanReviewText(input.title,3,120),content=cleanReviewText(input.content,10,2000);
    const db=await this.pool.connect();
    try{await db.query('BEGIN');
      const row=(await db.query('SELECT * FROM engagement.reviews WHERE id=$1 AND buyer_id=$2 FOR UPDATE',[id,buyerId])).rows[0];
      if(!row) throw fail(404,'REVIEW_NOT_FOUND','Không tìm thấy đánh giá.');
      if(row.version!==input.expectedVersion) throw fail(409,'VERSION_CONFLICT','Đánh giá đã thay đổi.');
      const updated=(await db.query(`UPDATE engagement.reviews SET rating=$2,title=$3,content=$4,
        version=version+1,updated_at=now() WHERE id=$1 RETURNING *`,[id,input.rating,title,content])).rows[0];
      await this.summary(db,row.product_id);
      await db.query('INSERT INTO engagement.review_outbox(event_type,payload) VALUES ($1,$2)',
        ['ReviewPublished.v1',{reviewId:id,productId:row.product_id,version:updated.version}]);
      await db.query('COMMIT');
      await this.syncCatalog(row.product_id).catch(error=>console.error('Review rating sync pending:',error.message));
      return {review:this.dto(updated)};
    }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }
  async reply(sellerId,id,input){
    if(!uuid.test(String(id))) throw fail(404,'REVIEW_NOT_FOUND','Không tìm thấy đánh giá.');
    const content=cleanReviewText(input?.content,3,1000);
    const row=(await this.pool.query('SELECT store_id FROM engagement.reviews WHERE id=$1',[id])).rows[0];
    if(!row) throw fail(404,'REVIEW_NOT_FOUND','Không tìm thấy đánh giá.');
    await this.promotion.member(row.store_id,sellerId);
    const reply=(await this.pool.query(`INSERT INTO engagement.review_replies(review_id,seller_id,content)
      VALUES ($1,$2,$3) ON CONFLICT(review_id) DO NOTHING RETURNING *`,[id,sellerId,content])).rows[0];
    if(!reply) throw fail(409,'REPLY_EXISTS','Đánh giá đã được phản hồi.');
    return {reply:{reviewId:id,sellerId,content,createdAt:reply.created_at}};
  }
  async list(productId,query){
    if(!uuid.test(String(productId))) throw fail(404,'PRODUCT_NOT_FOUND','Sản phẩm không hợp lệ.');
    const page=Number(query.page||1),limit=Number(query.limit||10),rating=query.rating==null?null:Number(query.rating);
    if(!Number.isInteger(page)||page<1||!Number.isInteger(limit)||limit<1||limit>50||
      (rating!==null&&(!Number.isInteger(rating)||rating<1||rating>5))||
      !['newest','helpful'].includes(query.sort||'newest')) throw fail(400,'INVALID_FILTER','Bộ lọc không hợp lệ.');
    const total=(await this.pool.query(`SELECT count(*)::int AS total FROM engagement.reviews
      WHERE product_id=$1 AND status='PUBLISHED' AND ($2::int IS NULL OR rating=$2)`,[productId,rating])).rows[0].total;
    const order=query.sort==='helpful'?'r.helpful_count DESC,r.created_at DESC,r.id DESC':'r.created_at DESC,r.id DESC';
    const rows=(await this.pool.query(`SELECT r.*,rr.content AS reply_content,rr.created_at AS reply_at,
      coalesce((SELECT json_agg(json_build_object('id',i.id,'url','/api/v2/reviews/images/'||i.id)
        ORDER BY i.position) FROM engagement.review_images i WHERE i.review_id=r.id),'[]'::json) AS images
      FROM engagement.reviews r LEFT JOIN engagement.review_replies rr ON rr.review_id=r.id
      WHERE r.product_id=$1 AND r.status='PUBLISHED' AND ($2::int IS NULL OR r.rating=$2)
      ORDER BY ${order} LIMIT $3 OFFSET $4`,[productId,rating,limit,(page-1)*limit])).rows;
    const summary=(await this.pool.query('SELECT * FROM engagement.product_rating_summary WHERE product_id=$1',[productId])).rows[0];
    return {page,limit,total,summary:{averageRating:Number(summary?.average_rating||0),reviewCount:summary?.review_count||0},
      reviews:rows.map(row=>({...this.dto(row),buyerId:undefined,orderItemId:undefined,storeId:undefined,
        images:row.images,reply:row.reply_content?{content:row.reply_content,createdAt:row.reply_at}:null}))};
  }
  async mine(userId,productId){
    if(!uuid.test(String(productId))) throw fail(400,'INVALID_PRODUCT','Sản phẩm không hợp lệ.');
    const rows=(await this.pool.query(`SELECT * FROM engagement.reviews WHERE buyer_id=$1 AND product_id=$2
      ORDER BY created_at DESC`,[userId,productId])).rows;
    return {reviews:rows.map(row=>this.dto(row))};
  }
  async sellerList(userId,storeId){
    if(!uuid.test(String(storeId))) throw fail(404,'STORE_NOT_FOUND','Không tìm thấy shop.');
    await this.promotion.member(storeId,userId);
    const rows=(await this.pool.query(`SELECT r.*,rr.content AS reply_content FROM engagement.reviews r
      LEFT JOIN engagement.review_replies rr ON rr.review_id=r.id
      WHERE r.store_id=$1 AND r.status='PUBLISHED' ORDER BY r.created_at DESC LIMIT 100`,[storeId])).rows;
    return {reviews:rows.map(row=>({...this.dto(row),buyerId:undefined,orderItemId:undefined,
      reply:row.reply_content?{content:row.reply_content}:null}))};
  }
  async helpful(userId,id){
    if(!uuid.test(String(id))) throw fail(404,'REVIEW_NOT_FOUND','Không tìm thấy đánh giá.');
    const db=await this.pool.connect();try{await db.query('BEGIN');
      const row=(await db.query("SELECT * FROM engagement.reviews WHERE id=$1 AND status='PUBLISHED' FOR UPDATE",[id])).rows[0];
      if(!row) throw fail(404,'REVIEW_NOT_FOUND','Không tìm thấy đánh giá.');
      if(row.buyer_id===userId) throw fail(403,'SELF_VOTE','Không thể tự bình chọn.');
      const added=await db.query(`INSERT INTO engagement.review_helpful_votes(review_id,user_id)
        VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING review_id`,[id,userId]);
      if(added.rowCount) await db.query('UPDATE engagement.reviews SET helpful_count=helpful_count+1 WHERE id=$1',[id]);
      await db.query('COMMIT');return {helpfulCount:Number(row.helpful_count)+added.rowCount};
    }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }
  async uploadImage(userId,id,buffer,mime){
    if(!uuid.test(String(id))) throw fail(404,'REVIEW_NOT_FOUND','Không tìm thấy đánh giá.');
    const processed=await normalizeImage(buffer,mime);
    if(!processed) throw fail(415,'INVALID_IMAGE','Ảnh phải là JPEG, PNG hoặc WebP hợp lệ, tối đa 2 MB.');
    if(!this.scanner) throw fail(503,'SCANNER_UNAVAILABLE','Bộ quét ảnh chưa sẵn sàng.');
    await this.scanner(buffer);
    const db=await this.pool.connect();try{await db.query('BEGIN');
      const row=(await db.query('SELECT * FROM engagement.reviews WHERE id=$1 AND buyer_id=$2 FOR UPDATE',[id,userId])).rows[0];
      if(!row) throw fail(404,'REVIEW_NOT_FOUND','Không tìm thấy đánh giá.');
      const count=(await db.query('SELECT count(*)::int AS total FROM engagement.review_images WHERE review_id=$1',[id])).rows[0].total;
      if(count>=3) throw fail(409,'IMAGE_LIMIT','Tối đa 3 ảnh.');
      const image=(await db.query(`INSERT INTO engagement.review_images(review_id,object_key,mime_type,data,position)
        VALUES ($1,$2,$3,$4,$5) RETURNING id`,[id,`review/${id}/${randomUUID()}`,'image/webp',processed,count])).rows[0];
      await db.query('COMMIT');return {image:{id:image.id,url:`/api/v2/reviews/images/${image.id}`}};
    }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }
  async image(id){
    if(!uuid.test(String(id))) throw fail(404,'IMAGE_NOT_FOUND','Không tìm thấy ảnh.');
    const row=(await this.pool.query(`SELECT i.data,i.mime_type FROM engagement.review_images i
      JOIN engagement.reviews r ON r.id=i.review_id WHERE i.id=$1 AND r.status='PUBLISHED'`,[id])).rows[0];
    if(!row) throw fail(404,'IMAGE_NOT_FOUND','Không tìm thấy ảnh.');return row;
  }
  async reconcile(){
    const rows=(await this.pool.query('SELECT DISTINCT product_id FROM engagement.reviews')).rows;
    for(const row of rows){await this.summary(this.pool,row.product_id);
      await this.syncCatalog(row.product_id).catch(error=>console.error('Review rating sync pending:',error.message));}
    return {checked:rows.length};
  }
  async syncCatalog(productId){
    const row=(await this.pool.query('SELECT * FROM engagement.product_rating_summary WHERE product_id=$1',[productId])).rows[0];
    if(!row) return;
    await this.promotion.remote(new URL(`/api/v2/inventory/products/${productId}/rating-summary`,
      this.promotion.config.catalogUrl),{method:'POST',headers:{'Content-Type':'application/json',
        'X-Inventory-Token':this.promotion.config.catalogToken},body:JSON.stringify({
          averageRating:Number(row.average_rating),reviewCount:row.review_count})});
    await this.pool.query(`UPDATE engagement.review_outbox SET published_at=now()
      WHERE payload->>'productId'=$1 AND published_at IS NULL`,[productId]);
  }
}

export const configuredReviewScanner=env=>env.CLAMAV_HOST
  ? buffer=>scanWithClamAv(buffer,{host:env.CLAMAV_HOST,port:Number(env.CLAMAV_PORT||3310)}) : null;
