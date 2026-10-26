export const formatDisplayDate = (value) => {
    if (value === null || value === undefined || value === "")
        return "Chưa cập nhật";
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? "Chưa cập nhật" : date.toLocaleDateString("vi-VN");
};
