const Voucher = require('../models/Voucher');

class VoucherRepository {
  // Tạo voucher
  async create(voucherData) {
    return await Voucher.create(voucherData);
  }

  // Tìm voucher theo ID
  async findById(voucherId, populate = false) {
    let query = Voucher.findById(voucherId);
    if (populate) {
      query = query.populate("store", "name category").populate("createdBy", "name email");
    }
    return await query;
  }

  // Tìm voucher theo code
  async findByCode(code, populate = false) {
    let query = Voucher.findOne({ code: code.toUpperCase(), isActive: true });
    if (populate) {
      query = query.populate("store", "name category");
    }
    return await query;
  }

  // Tìm vouchers available (active và trong thời gian hiệu lực)
  async findAvailable(now, populate = false) {
    let query = Voucher.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });
    if (populate) {
      query = query.populate("store", "name category");
    }
    return await query;
  }

  // Tìm tất cả vouchers
  async findAll(populate = false) {
    let query = Voucher.find({});
    if (populate) {
      query = query
        .populate("store", "name category")
        .populate("createdBy", "name email");
    }
    return await query.sort({ createdAt: -1 });
  }

  // Tìm vouchers theo query
  async findByQuery(query, populate = false) {
    // ✅ Không dùng lean() để giữ nguyên Mongoose document, đảm bảo usersUsed được load đúng
    let dbQuery = Voucher.find(query);
    if (populate) {
      dbQuery = dbQuery.populate("store", "name category");
    }
    return await dbQuery;
  }

  // Cập nhật voucher
  async update(voucherId, updateData) {
    return await Voucher.findByIdAndUpdate(voucherId, updateData, { new: true });
  }

  // Xóa voucher
  async delete(voucherId) {
    return await Voucher.findByIdAndDelete(voucherId);
  }

  // Tìm vouchers có usersUsed
  async findWithUsersUsed() {
    return await Voucher.find({ usersUsed: { $exists: true, $ne: [] } });
  }
}

module.exports = new VoucherRepository();

