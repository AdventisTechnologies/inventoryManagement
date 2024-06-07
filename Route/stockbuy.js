const express = require('express');
const router = express.Router();
const multer = require('multer'); // Make sure Multer is imported

const inventoryBuyController = require('../Controller/Stockbuy'); // Ensure correct import

const storage = multer.memoryStorage(); // Memory storage for in-memory processing
const upload = multer({ storage });

router.post('/inventorybuy/add', inventoryBuyController.addInventoryItem); // Correct path and method

router.get('/', inventoryBuyController.getAllInventoryItems);
router.post('/inventorybuy', upload.single('excelFile'), inventoryBuyController.uploadExcelFile);
router.put('/update', inventoryBuyController.updateInventoryItem);


module.exports = router;
