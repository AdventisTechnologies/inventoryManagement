const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  itemId: { type: String, required: true},
  itemDescription: { type: String, default: '' },
  itemLocation: { type: String, default: '' },
  itemQuantityStock: { type: Number, required: true },
  unit: { type: String },
  itemReorderLevel: { type: String, default: 'normal' },
  itemReorderDate: { type: Date },
  itemQuantityToBeReordered: { type: Number, default: 0 },
  inventoryPerson: { type: String, required: true }, // Ensure it's required
  itemComment: { type: String },
  projectId:{type: String},
  projectIncharge:{type: String},
  itemRemark:{type: String},
  projectIdTaken:{type:String},
});



module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
