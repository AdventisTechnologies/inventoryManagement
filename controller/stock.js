const Product = require('../models/stockin');

// 🟢 Create new product
exports.createProduct = async (req, res) => {
  console.log('=== CREATE PRODUCT FUNCTION STARTED ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    console.log('Checking for productId:', req.body.productId);
    
    const existingProduct = await Product.findOne({ productId: req.body.productId });
    
    if (existingProduct) {
      console.log('❌ Product ID already exists');
      return res.status(400).json({
        success: false,
        message: 'Product ID already exists'
      });
    }
    
    console.log('✅ Product ID is available - creating product');

    // Handle price format
    let priceObject;
    if (req.body.price && typeof req.body.price === 'object' && req.body.price.value !== undefined) {
      priceObject = {
        value: Number(req.body.price.value),
        unit: req.body.price.unit || 'INR'
      };
      console.log('✅ Price is in correct object format:', priceObject);
    } else if (typeof req.body.price === 'number') {
      priceObject = {
        value: req.body.price,
        unit: 'INR'
      };
      console.log('🔄 Converted price from number to object:', priceObject);
    } else {
      priceObject = {
        value: 0,
        unit: 'INR'
      };
      console.log('⚠️ No valid price provided, using default:', priceObject);
    }

    // Handle quantity and unit
    const quantity = Number(req.body.quantity) || 0;
    const unit = req.body.unit || 'nos';

    // Create initial movement for stock creation
    const initialMovement = {
      type: 'INCOMING',
      quantity: quantity,
      unit: unit,
      price: priceObject,
      fromLocation: 'Supplier',
      toLocation: req.body.location?.warehouse || 'Main Warehouse',
      purpose: 'Initial stock creation',
      reference: `INIT-${req.body.productId}`,
      notes: 'Initial product setup',
      date: new Date()
    };

    // Prepare the product data for saving
    const productData = {
      productId: req.body.productId,
      name: req.body.name,
      description: req.body.description || '',
      category: req.body.category,
      brand: req.body.brand || '',
      size: req.body.size || '',
      color: req.body.color || '',
      weight: req.body.weight ? Number(req.body.weight) : 0,
      quantity: quantity,
      unit: unit,
      price: priceObject,
      dimensions: req.body.dimensions || {
        length: 0,
        width: 0,
        height: 0
      },
      location: req.body.location || {
        warehouse: '',
        aisle: '',
        shelf: '',
        bin: ''
      },
      supplier: req.body.supplier || {
        name: '',
        contact: '',
        email: '',
        phone: ''
      },
      notes: req.body.notes || '',
      reorderLevel: req.body.reorderLevel || 'Normal',
      movements: [initialMovement],
      createdBy: req.body.createdBy || 'admin',
      lastModifiedBy: req.body.lastModifiedBy || 'admin'
    };

    console.log('Final product data being saved:', JSON.stringify(productData, null, 2));

    const product = new Product(productData);
    const savedProduct = await product.save();
    
    console.log('✅ Product created successfully');
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: savedProduct
    });
    
  } catch (error) {
    console.log('❌ Error creating product:', error.message);
    
    res.status(400).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};


exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, quantity, price, fromLocation, toLocation, purpose, reference, notes } = req.body;

    console.log('=== UPDATE STOCK STARTED ===');
    console.log('Product ID:', id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const product = await Product.findOne({ productId: id });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const qtyChange = Number(quantity);
    const oldQty = product.quantity;
    const oldPrice = product.price.value;

    console.log('Current stock - Quantity:', oldQty, 'Price:', oldPrice);
    console.log('Requested change - Type:', type, 'Quantity:', qtyChange);

    let movementPrice = { value: oldPrice, unit: 'INR' };

    if (type === 'INCOMING') {
      // Add stock with weighted average price calculation
      if (!price || !price.value) {
        return res.status(400).json({
          success: false,
          message: 'Price is required for INCOMING stock'
        });
      }

      const priceValue = Number(price.value);
      const newQty = oldQty + qtyChange;

      // Weighted average price calculation
      const totalOldValue = oldQty * oldPrice;
      const totalNewValue = qtyChange * priceValue;
      const newAveragePrice = (totalOldValue + totalNewValue) / newQty;

      product.quantity = newQty;
      product.price.value = newAveragePrice;

      movementPrice.value = priceValue;

      console.log('INCOMING - New Quantity:', newQty, 'New Average Price:', newAveragePrice);

    } else if (type === 'OUTGOING') {
      // Remove stock with proportional price reduction
      if (qtyChange > oldQty) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock to remove. Available: ${oldQty}, Requested: ${qtyChange}`
        });
      }

      const newQty = oldQty - qtyChange;
      
      let newPriceValue;
      
      if (newQty === 0) {
        // When all stock is removed, keep the last known unit price
        newPriceValue = oldPrice;
        console.log('OUTGOING - All stock removed, keeping last unit price:', newPriceValue);
      } else {
        // Proportional price reduction for partial removal
        newPriceValue = (newQty / oldQty) * oldPrice;
        console.log('OUTGOING - Partial removal, new price:', newPriceValue);
      }

      product.quantity = newQty;
      product.price.value = newPriceValue;

      // FIX: Movement price should be the VALUE OF REMOVED STOCK, not the new product price
      // Calculate the value of the removed items
      const removedValue = (qtyChange / oldQty) * oldPrice;
      movementPrice.value = removedValue;

      console.log('OUTGOING - Removed value:', removedValue);
      console.log('OUTGOING - Final state - Quantity:', newQty, 'Price:', newPriceValue);
    }

    // Add movement to history
    const newMovement = {
      type,
      quantity: qtyChange,
      unit: product.unit,
      price: movementPrice,
      fromLocation: fromLocation || product.location?.warehouse || 'Warehouse',
      toLocation: toLocation || 'External',
      purpose: purpose || 'Stock adjustment',
      reference: reference || `REF-${Date.now()}`,
      notes: notes || '',
      date: new Date()
    };

    product.movements.push(newMovement);
    product.lastModifiedBy = 'admin';

    console.log('Saving product with new quantity:', product.quantity, 'and price:', product.price.value);

    const savedProduct = await product.save();

    console.log('✅ Stock updated successfully');
    console.log('Final product state - Quantity:', savedProduct.quantity, 'Price:', savedProduct.price.value);

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: savedProduct
    });
  } catch (error) {
    console.log('❌ Error updating stock:', error.message);
    
    res.status(400).json({
      success: false,
      message: 'Error updating stock',
      error: error.message
    });
  }
};

// 🟡 Get all products
exports.getAllStocks = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching products', 
      error: error.message 
    });
  }
};

// 🟡 Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ productId: id });
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }
    
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching product', 
      error: error.message 
    });
  }
};

// 🟡 Get movement history
exports.getMovementHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ productId: id });
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }
    
    res.json({
      success: true,
      data: {
        productId: product.productId,
        name: product.name,
        movements: product.movements.sort((a, b) => new Date(b.date) - new Date(a.date))
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching movement history', 
      error: error.message 
    });
  }
};

// 🟡 Delete product
exports.deleteStock = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error deleting product', 
      error: error.message 
    });
  }
};