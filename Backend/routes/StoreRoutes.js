const express = require('express');
const router = express.Router();
const {
  createStore,
  getStoreByOwner,
  updateStore,
  activateStore,
  deactivateStore,
  getAllActiveStores,
  getStoreById,
  getMyStore
} = require('../controllers/StoreController');

const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

router.post(
  '/',
  authMiddleware,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
  ]),
  createStore
);router.get('/owner', authMiddleware, getStoreByOwner);
router.put('/', authMiddleware, updateStore);
router.patch('/activate', authMiddleware, activateStore);
router.patch('/deactivate', authMiddleware, deactivateStore);
router.get('/me', authMiddleware, getMyStore);

router.get('/', getAllActiveStores);
router.get('/:id', getStoreById);

module.exports = router;
