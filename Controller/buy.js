// controllers/inventoryController.js
const InventoryItem = require('../model/buy');





exports.addInventoryItem = async (req, res) => {
  try {
    console.log('Received request body:', req.body);

    const inventoryPerson = req.body.inventoryPerson; // Explicitly extract
    const itemComment = req.body.itemComment;
    if (!inventoryPerson) {
      throw new Error('inventoryPerson is required');
    }

    const inventoryItems = req.body.inventoryItems.map((item) => {
      return new InventoryItem({
        ...item,
        inventoryPerson, // Explicitly add `inventoryPerson`
        itemComment,
      });
    });

    const result = await InventoryItem.insertMany(inventoryItems);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error adding inventory item:', error.message);
    res.status(500).json({ error: 'Error adding inventory item', details: error.message });
  }
};

exports.getAllInventoryItems = async (req, res) => {
  try {
    const items = await InventoryItem.find(); // Find all items in the collection
    res.status(200).json(items); // Send the list of items as a JSON response
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while fetching inventory items', error: error.message });
  }
};





