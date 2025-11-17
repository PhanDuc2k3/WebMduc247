const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/UserRepository');

// Optional auth middleware - không bắt buộc phải có token
// Nếu có token hợp lệ, sẽ set req.user
// Nếu không có token hoặc token không hợp lệ, vẫn tiếp tục (req.user = undefined)
module.exports = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    // Không có token, tiếp tục mà không set req.user
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Kiểm tra tài khoản có bị ban không
    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      // User không tồn tại, tiếp tục mà không set req.user
      return next();
    }
    
    if (user.status === 'banned') {
      // User bị ban, trả về lỗi
      return res.status(403).json({ 
        message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
        isBanned: true
      });
    }
    
    req.user = decoded; // chứa { userId, role, ... }
    next();
  } catch (error) {
    // Token không hợp lệ, tiếp tục mà không set req.user
    next();
  }
};

