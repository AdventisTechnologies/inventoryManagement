const express = require('express');
const router = express.Router();
const stockController = require('../controller/stock');

// Create new product
router.post('/', stockController.createProduct);

// Update stock (add/remove)
router.patch('/:id/stock', stockController.updateStock);

// Get all products
router.get('/', stockController.getAllStocks);

// Get product by ID
router.get('/:id', stockController.getProductById);

// Get movement history
router.get('/:id/history', stockController.getMovementHistory);

// Delete product
router.delete('/:id', stockController.deleteStock);

module.exports = router;