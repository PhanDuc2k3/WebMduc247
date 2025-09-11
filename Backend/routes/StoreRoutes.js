const express = require('express');
const router = express.Router();
const {
  createStore,
  getStoreByOwner,
  updateStore,
  activateStore,
  deactivateStore,
  getAllActiveStores,
  getStoreById
} = require('../controllers/StoreController');

const authMiddleware = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

router.post('/', authMiddleware, authorize('seller', 'admin'), createStore);
router.get('/owner', authMiddleware, authorize('seller', 'admin'), getStoreByOwner);
router.put('/', authMiddleware, authorize('seller', 'admin'), updateStore);
router.patch('/activate', authMiddleware, authorize('seller', 'admin'), activateStore);
router.patch('/deactivate', authMiddleware, authorize('seller', 'admin'), deactivateStore);
router.get('/', getAllActiveStores);
router.get('/:id', getStoreById);

module.exports = router;
