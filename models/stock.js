const mongoose = require('mongoose');

// Stock Movement Schema
const stockMovementSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['INCOMING', 'OUTGOING'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    enum: ['kg', 'nos', 'liters', 'meters', 'boxes', 'packs', 'units', 'other'],
    required: true
  },
  price: {
    value: { type: Number, required: true },
    unit: { type: String, enum: ['INR'], default: 'INR' }
  },
  fromLocation: { type: String },
  toLocation: { type: String },
  purpose: { type: String },
  date: { type: Date, default: Date.now },
  reference: { type: String },
  notes: { type: String }
});

// Main Product Schema
const productSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: ''
  },
  weight: {
    type: Number,
    default: 0
  },
  
  // Stock fields
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'nos', 'liters', 'meters', 'boxes', 'packs', 'units', 'other'],
    default: 'nos'
  },
  price: {
    value: { type: Number, required: true, default: 0, min: 0 },
    unit: { type: String, enum: ['INR'], default: 'INR' }
  },
  
  notes: {
    type: String,
    default: ''
  },
  
  dimensions: {
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 }
  },
  
  supplier: {
    name: { type: String, default: '' },
    contact: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' }
  },
  
  location: {
    warehouse: { type: String, required: true },
    aisle: { type: String, default: '' },
    shelf: { type: String, default: '' },
    bin: { type: String, default: '' }
  },
  
  // Stock management fields
  reorderLevel: {
    type: String,
    enum: ['Urgent', 'High', 'Normal', 'Low'],
    default: 'Normal'
  },
  reorderDate: {
    type: Date
  },
  reorderQuantity: {
    type: Number,
    default: 0
  },
  
  // Movement history
  movements: [stockMovementSchema],
  
  createdBy: {
    type: String,
    default: 'admin'
  },
  lastModifiedBy: {
    type: String,
    default: 'admin'
  }
}, {
  timestamps: true
});

// Indexes
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Stock', productSchema);