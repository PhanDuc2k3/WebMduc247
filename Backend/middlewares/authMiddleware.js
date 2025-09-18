const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  console.log("👉 Token nhận được:", token); // log token

  if (!token) {
    console.log("❌ Chưa có token");
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token giải mã thành công:", decoded); // log decoded
    req.user = decoded; // chứa { id, role }
    next();
  } catch (error) {
    console.log("❌ Token không hợp lệ", error);
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
};
