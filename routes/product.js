// backend/routes/product.js
const express = require('express');
const router = express.Router();
const {
  createProduct,
  createBulkProducts,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getProductStats
} = require('../controller/product');

// POST /api/user/products (supports both single and multiple)
router.post('/', createProduct);

// POST /api/user/products/bulk (specifically for multiple products)
router.post('/bulk', createBulkProducts);

// GET /api/user/products
router.get('/', getAllProducts);

// GET /api/user/products/stats/summary
router.get('/stats/summary', getProductStats);

// GET /api/user/products/category/:category
router.get('/category/:category', getProductsByCategory);

// GET /api/user/products/:id
router.get('/:id', getProductById);

// PUT /api/user/products/:id
router.put('/:id', updateProduct);

// DELETE /api/user/products/:id
router.delete('/:id', deleteProduct);

module.exports = router;