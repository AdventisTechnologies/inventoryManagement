const mongoose = require('mongoose');

const InventoryItemBuyingSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  itemId: { type: String, required: true},
  itemDescription: { type: String, default: '' },
  itemLocation: { type: String, default: '' },
  itemQuantityStock: { type: Number, required: true },
  unit: { type: String },
  itemReorderLevel: { type: String, default: 'normal' },
  itemReorderDate: { type: Date },
  itemQuantityToBeReordered: { type: Number},
  inventoryPerson: { type: String}, // Ensure it's required
  itemComment: { type: String },
  itemAmount: { type: Number},
  projectId:{type: String},
  projectIncharge:{type: String}
});



module.exports = mongoose.model('InventoryItemBuying', InventoryItemBuyingSchema);
