const statusName = {
    PENDING_INVENTORY: "Đang xác nhận tồn kho",
    PENDING_PAYMENT: "Chờ thanh toán",
    PLACED: "Đã đặt hàng",
    CONFIRMED: "Shop đã xác nhận",
    PREPARING: "Đang chuẩn bị",
    READY_TO_SHIP: "Sẵn sàng giao",
    SHIPPING: "Đang giao",
    DELIVERED: "Đã giao",
    COMPLETED: "Hoàn thành",
    CANCEL_PENDING: "Đang hủy",
    CANCELLED: "Đã hủy",
    PARTIAL_CANCELLED: "Hủy một phần",
};
export const orderStatusName = (status) => statusName[status] || status;
export const orderStatusOptions = Object.entries(statusName);
