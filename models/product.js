const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Auto-generated Unique ID
  productId: {
    type: String,
    required: true,
    unique: true,
    match: /^[A-Z]{3}-[0-9]{6}-[A-Z0-9]{3}$/
  },
  
  // Basic Product Information
  name: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Electronics', 'Clothing', 'Books', 'Home & Kitchen', 'Sports', 'Beauty', 'Toys', 'Other'],
    default: 'Other'
  },
  brand: {
    type: String,
    maxlength: 50,
    trim: true
  },

  // Product Specifications
  size: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true
  },
  weight: {
    type: Number,
    min: 0
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  
  // Supplier Information
  supplier: {
    name: String,
    contact: String,
    email: String,
    phone: String
  },
  
  // Dates
  dateAdded: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },

  // Location
  location: {
    warehouse: String,
    aisle: String,
    shelf: String,
    bin: String
  },
  
  // Audit Trail
  createdBy: {
    type: String,
    required: true,
    trim: true
  },
  lastModifiedBy: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Update lastUpdated before saving
productSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

// Static method to generate product ID
productSchema.statics.generateProductId = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  let id = '';
  // First part: 3 random letters
  for (let i = 0; i < 3; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  id += '-';
  // Second part: 6 random numbers
  for (let i = 0; i < 6; i++) {
    id += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  id += '-';
  // Third part: 3 random alphanumeric characters
  for (let i = 0; i < 3; i++) {
    const pool = Math.random() < 0.5 ? chars : numbers;
    id += pool.charAt(Math.floor(Math.random() * pool.length));
  }
  
  return id;
};

module.exports = mongoose.model('Product', productSchema);