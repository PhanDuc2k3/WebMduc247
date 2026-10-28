export const REPUTATION_POLICY={id:'REPUTATION_V1',label:'Shop uy tín',windowDays:90,validDays:30,
  criteria:'Tại ngày xét: trong 90 ngày có ít nhất 100 đơn, 100 đơn hoàn tất, 30 đánh giá công khai, điểm từ 4,5/5, hủy do seller tối đa 2%, chậm xử lý tối đa 5%, yêu cầu trả hàng tối đa 5% số đơn. Không có cảnh cáo chưa khắc phục, không bị đình chỉ và hồ sơ đã duyệt nếu có yêu cầu. Badge hiệu lực 30 ngày; hết hạn tự ẩn, thu hồi khi bị đình chỉ/cảnh cáo mới hoặc kiểm tra lại không đạt. Không phụ thuộc gói trả phí hay lựa chọn của seller.'};
export function qualifiesForReputation(impact,ratings){
  return impact.period_orders>=100&&impact.completed_orders>=100&&impact.sellerCancellationRate!==null&&impact.sellerCancellationRate<=.02&&
    impact.delayed_orders/impact.period_orders<=.05&&impact.period_returns/impact.period_orders<=.05&&ratings.review_count>=30&&ratings.average_rating>=4.5;
}
