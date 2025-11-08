const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const {
  getWallet,
  getTransactions,
  deposit,
  sendWithdrawalCode,
  withdraw,
  payWithWallet
} = require('../controllers/WalletController');

// Lấy thông tin ví
router.get('/', auth, getWallet);

// Lấy lịch sử giao dịch
router.get('/transactions', auth, getTransactions);

// Nạp tiền
router.post('/deposit', auth, deposit);

// Gửi mã xác thực email cho rút tiền
router.post('/withdraw/send-code', auth, sendWithdrawalCode);
// Rút tiền
router.post('/withdraw', auth, withdraw);

// Thanh toán bằng ví
router.post('/pay', auth, payWithWallet);

module.exports = router;
