const express = require('express');
const router = express.Router();
const productController = require('../controllers/ProductController');
const upload = require('../middlewares/upload');
const auth = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');
router.post(
  '/',
  auth,
  authorize('seller', 'admin'),
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'subImages', maxCount: 5 }
  ]),
  productController.createProduct
);

router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.put(
  '/:id',
  auth,
  authorize('seller', 'admin'),
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'subImages', maxCount: 5 }
  ]),
  productController.updateProduct
);
router.delete('/:id', auth, authorize('seller', 'admin'), productController.deleteProduct);

module.exports = router;
