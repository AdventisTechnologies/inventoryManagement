const express = require('express');
const router = express.Router();
const inventoryController = require('../Controller/buy'); // Ensure correct import

router.post('/inventory/add', inventoryController.addInventoryItem); // Correct path and method
router.get('/', inventoryController.getAllInventoryItems);

module.exports = router;
