const express = require('express');
const { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  getAllUsers, 
  deleteUser, 
  updateUser,
  requestSeller,
  getAllSellerRequests,
  handleSellerRequest
} = require('../controllers/UserController');

const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

const router = express.Router();

// Auth
router.post('/register', register);
router.post('/login', login);

// Profile (người dùng tự sửa thông tin)
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, upload.single('avatar'), updateProfile);

// Người dùng gửi yêu cầu mở cửa hàng (seller request)
router.post(
  '/seller-request',
  authMiddleware,
  upload.single('logo'), // hoặc upload.fields nếu muốn logo + banner
  requestSeller
);

// Admin: lấy danh sách yêu cầu mở cửa hàng
router.get('/seller-requests', authMiddleware, getAllSellerRequests);

// Admin: phê duyệt hoặc từ chối yêu cầu
router.post('/seller-requests/handle', authMiddleware, handleSellerRequest);

// Admin routes (quản lý user)
router.get('/all', authMiddleware, getAllUsers);
router.delete('/:id', authMiddleware, deleteUser);
router.put('/:id', authMiddleware, updateUser);

module.exports = router;
