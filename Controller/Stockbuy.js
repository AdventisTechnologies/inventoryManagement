// controllers/inventoryController.js
const InventoryItem = require('../model/take');
const XLSX = require('xlsx');
const moment = require('moment');





// exports.addInventoryItem = async (req, res) => {
//   try {
//     console.log('Received request body:', req.body);

//     const inventoryPerson = req.body.inventoryPerson; // Explicitly extract
//     if (!inventoryPerson) {
//       throw new Error('inventoryPerson is required');
//     }

//     const inventoryItems = req.body.inventoryItems.map((item) => {
//       return new InventoryItem({
//         ...item,
//         inventoryPerson, // Explicitly add `inventoryPerson`
//       });
//     });

//     const result = await InventoryItem.insertMany(inventoryItems);
//     res.status(201).json(result);
//   } catch (error) {
//     console.error('Error adding inventory item:', error.message);
//     res.status(500).json({ error: 'Error adding inventory item', details: error.message });
//   }
// };

exports.addInventoryItem = async (req, res) => {
  try {
    const inventoryPerson = req.body.inventoryPerson;
    const itemComment = req.body.itemComment;
    if (!inventoryPerson) {
      throw new Error('inventoryPerson is required');
    }

    const inventoryItems = req.body.inventoryItems;

    for (let item of inventoryItems) {
      let existingItem = await InventoryItem.findOne({
        itemName: item.itemName,
        projectId : item.projectId,
        itemDescription: item.itemDescription
      });

      if (existingItem) {
        // Update existing item by adding the new values to the existing values
        existingItem.itemQuantityStock = Number(existingItem.itemQuantityStock) + Number(item.itemQuantityStock);
        existingItem.itemQuantityToBeReordered = Number(existingItem.itemQuantityToBeReordered) + Number(item.itemQuantityToBeReordered);
        existingItem.itemAmount = Number(existingItem.itemAmount) + Number(item.itemAmount);
        existingItem.itemLocation = item.itemLocation;
        existingItem.unit = item.unit;
        existingItem.itemId = item.itemId;
        existingItem.itemReorderLevel = item.itemReorderLevel;
        existingItem.itemReorderDate = item.itemReorderDate;
        existingItem.projectIncharge = item.projectIncharge;
        existingItem.inventoryPerson = inventoryPerson;
        existingItem.itemComment = item.itemComment ?? existingItem.itemComment; // Use existing comment if not provided
        await existingItem.save();
      } else {
        // Create new item
        let newItem = new InventoryItem({
          ...item,
          inventoryPerson,
          itemComment, // Default to an empty string if itemComment is not provided
        });
        await newItem.save();
      }
    }

    res.status(201).json({ message: 'Items processed successfully' });
  } catch (error) {
    console.error('Error processing inventory item:', error.message);
    res.status(500).json({ error: 'Error processing inventory item', details: error.message });
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

  // Function to convert Excel serial date to JavaScript Date
function excelSerialDateToJSDate(serial) {
  const excelEpoch = new Date(1899, 11, 30); // December 30, 1899, to handle leap year issue
  return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000); // Convert to milliseconds
}

exports.uploadExcelFile = async (req, res) => {
  try {
      if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
      }

      const inventoryPerson = req.body.inventoryPerson;
      if (!inventoryPerson) {
          return res.status(400).json({ error: 'Inventory person is required' });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const inventoryItems = [];

      data.slice(1).forEach((row) => {
          const rawDate = row[8]; // Assuming itemReorderDate is in the 8th column (index 7)
          let itemReorderDate;

          // Check if the rawDate is numeric (indicating Excel serial date)
          if (typeof rawDate === 'number') {
              itemReorderDate = excelSerialDateToJSDate(rawDate);
          } else {
              itemReorderDate = moment(rawDate, 'MM-DD-YYYY').toDate();
          }

          if (isNaN(itemReorderDate.getTime())) {
              console.warn('Skipping invalid date:', rawDate); // Log or handle invalid dates
              return;
          }

          inventoryItems.push({
              itemName: row[0],
              itemId: row[1],
              itemDescription: row[2],
              itemLocation: row[3],
              itemQuantityStock: row[4],
              itemAmount:row[5],
              unit: row[6],
              itemReorderLevel: row[7],
              itemReorderDate,
              itemQuantityToBeReordered: row[9],
              projectId:row[10],
              projectIncharge:row[11],
          });
      });

      if (inventoryItems.length === 0) {
          return res.status(400).json({ error: 'No valid inventory items to insert' });
      }

      await InventoryItem.insertMany(inventoryItems);

      res.status(200).json({ message: 'File uploaded and processed successfully.' });
  } catch (error) {
      console.error('Error in uploadExcelFile:', error);
      res.status(500).json({ error: 'An error occurred while processing the file.', details: error.message });
  }
};

// exports.updateInventoryItem = async (req, res) => {
//   try {
//     const { itemDescription, itemQuantityStock } = req.body;

//     if (!itemDescription || itemQuantityStock == null) {
//       return res.status(400).json({ error: 'itemDescription and itemQuantityStock are required' });
//     }

//     const item = await InventoryItem.findOne({ itemDescription });
//     if (!item) {
//       return res.status(404).json({ error: 'Inventory item not found' });
//     }

//     item.itemQuantityToBeReordered -= itemQuantityStock;
//     await item.save();

//     res.status(200).json({ message: 'Inventory item updated successfully', item });
//   } catch (error) {
//     console.error('Error updating inventory item:', error.message);
//     res.status(500).json({ error: 'Error updating inventory item', details: error.message });
//   }
// };
exports.updateInventoryItem = async (req, res) => {
  try {
    const { itemName, itemDescription, projectId, itemQuantityStock } = req.body;

    if (!itemName || !itemDescription || !projectId || itemQuantityStock == null) {
      return res.status(400).json({ error: 'itemName, itemDescription, projectId, and itemQuantityStock are required' });
    }

    const item = await InventoryItem.findOne({ itemName, itemDescription, projectId });
    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    item.itemQuantityToBeReordered -= itemQuantityStock;
    await item.save();

    res.status(200).json({ message: 'Inventory item updated successfully', item });
  } catch (error) {
    console.error('Error updating inventory item:', error.message);
    res.status(500).json({ error: 'Error updating inventory item', details: error.message });
  }
};
