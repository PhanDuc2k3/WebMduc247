const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/UserRepository');

module.exports = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Kiểm tra tài khoản có bị ban không
    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Người dùng không tồn tại' });
    }
    
    if (user.status === 'banned') {
      return res.status(403).json({ 
        message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
        isBanned: true
      });
    }
    
    req.user = decoded; // chứa { userId, role, ... }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
};
