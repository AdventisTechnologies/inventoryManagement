const Product = require('../models/stockin');

// Get all products with pagination and filters
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (category && category !== 'All') {
      filter.category = category;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { productId: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (minPrice || maxPrice) {
      filter['price.value'] = {};
      if (minPrice) filter['price.value'].$gte = parseFloat(minPrice);
      if (maxPrice) filter['price.value'].$lte = parseFloat(maxPrice);
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const products = await Product.find(filter)
      .sort(sortConfig)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const totalProducts = await Product.countDocuments(filter);

    res.json({
      success: true,
      data: products,
      pagination: {
        totalProducts,
        totalPages: Math.ceil(totalProducts / limit),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// Get single product by ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ productId: req.params.id });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
};

// Create new product with initial stock
const createProduct = async (req, res) => {
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

    // Create initial movement for stock creation
    const initialMovement = {
      type: 'INCOMING',
      quantity: req.body.quantity || 0,
      unit: req.body.unit || 'nos',
      price: {
        value: req.body.price?.value || 0,
        unit: 'INR'
      },
      fromLocation: 'Supplier',
      toLocation: req.body.location?.warehouse || 'Main Warehouse',
      purpose: 'Initial stock creation',
      reference: `INIT-${req.body.productId}`,
      notes: 'Initial product setup'
    };

    const productData = {
      ...req.body,
      movements: [initialMovement]
    };

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

// Update stock (add or remove quantity with price calculation)
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      type, 
      quantity, 
      price, 
      fromLocation, 
      toLocation, 
      purpose, 
      reference, 
      notes 
    } = req.body;

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

    } else if (type === 'OUTGOING') {
      // Remove stock
      if (qtyChange > oldQty) {
        return res.status(400).json({
          success: false,
          message: 'Not enough stock to remove'
        });
      }

      const newQty = oldQty - qtyChange;
      
      // For outgoing, we don't change the unit price, just reduce quantity
      // The price remains the same per unit
      product.quantity = newQty;

      movementPrice.value = oldPrice; // Use current price for outgoing
    }

    // Add movement to history
    product.movements.push({
      type,
      quantity: qtyChange,
      unit: product.unit,
      price: movementPrice,
      fromLocation: fromLocation || 'Unknown',
      toLocation: toLocation || product.location.warehouse,
      purpose: purpose || 'Stock adjustment',
      reference: reference || `REF-${Date.now()}`,
      notes: notes || '',
      date: new Date()
    });

    product.lastModifiedBy = req.body.lastModifiedBy || 'admin';
    await product.save();

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating stock',
      error: error.message
    });
  }
};

// Update product details (without stock movement)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { productId: req.params.id },
      { 
        ...req.body, 
        lastModifiedBy: req.body.lastModifiedBy || 'admin',
        updatedAt: new Date() 
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ productId: req.params.id });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
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

// Get product statistics
const getProductStats = async (req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$price.value'] } },
          averagePrice: { $avg: '$price.value' }
        }
      }
    ]);

    const categoryStats = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$price.value'] } }
        }
      }
    ]);

    // Low stock alerts
    const lowStockProducts = await Product.find({
      $expr: {
        $lt: ['$quantity', 10] // Adjust threshold as needed
      }
    }).select('productId name quantity reorderLevel');

    res.json({
      success: true,
      data: {
        overview: stats[0] || {},
        byCategory: categoryStats,
        lowStockAlerts: lowStockProducts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

// Get movement history for a product
const getMovementHistory = async (req, res) => {
  try {
    const product = await Product.findOne({ productId: req.params.id })
      .select('movements name productId');
    
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

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct,
  getProductStats,
  getMovementHistory
};