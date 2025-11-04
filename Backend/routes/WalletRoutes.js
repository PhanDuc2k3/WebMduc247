const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const {
  getWallet,
  getTransactions,
  deposit,
  withdraw,
  payWithWallet
} = require('../controllers/WalletController');

// Lấy thông tin ví
router.get('/', auth, getWallet);

// Lấy lịch sử giao dịch
router.get('/transactions', auth, getTransactions);

// Nạp tiền
router.post('/deposit', auth, deposit);

// Rút tiền
router.post('/withdraw', auth, withdraw);

// Thanh toán bằng ví
router.post('/pay', auth, payWithWallet);

module.exports = router;
