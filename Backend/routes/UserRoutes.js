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
  handleSellerRequest,
  logout,
  verifyEmail,
  resendVerificationCode,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  changePassword,
  updateEmailNotifications
} = require('../controllers/UserController');

const authMiddleware = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/upload');

const router = express.Router();

// Auth
router.post('/register', register);
router.post('/login', login);
router.post('/logout', authMiddleware,logout);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationCode);
// Forgot password
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);
// Profile (người dùng tự sửa thông tin)
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, upload.single('avatar'), updateProfile);
router.post('/change-password', authMiddleware, changePassword);
router.put('/email-notifications', authMiddleware, updateEmailNotifications);

// Người dùng gửi yêu cầu mở cửa hàng (seller request)
router.post(
  '/seller-request',
  authMiddleware,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
  ]),
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
