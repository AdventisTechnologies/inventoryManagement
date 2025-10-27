// backend/controller/product.js
const Product = require('../models/product');

// @desc    Create a new product (single or multiple)
// @route   POST /api/user/products
// @access  Public
const createProduct = async (req, res) => {
  try {
    // Check if it's a single product or multiple products
    if (Array.isArray(req.body)) {
      return await createMultipleProducts(req.body, res);
    } else {
      return await createSingleProduct(req.body, res);
    }
  } catch (error) {
    handleProductError(error, res);
  }
};

// Create single product
const createSingleProduct = async (productData, res) => {
  const productId = await generateUniqueProductId();
  
  const product = new Product({
    ...productData,
    productId,
    createdBy: productData.createdBy || 'system',
    lastModifiedBy: productData.lastModifiedBy || 'system'
  });

  await product.save();

  res.status(201).json({
    success: true,
    data: product,
    message: 'Product created successfully'
  });
};

// Create multiple products
const createMultipleProducts = async (productsData, res) => {
  if (!Array.isArray(productsData) || productsData.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Products array is required and cannot be empty'
    });
  }

  if (productsData.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Cannot process more than 100 products at once'
    });
  }

  // Generate unique IDs for all products
  const productsWithIds = [];
  for (const productData of productsData) {
    const productId = await generateUniqueProductId();
    productsWithIds.push({
      ...productData,
      productId,
      createdBy: productData.createdBy || 'system',
      lastModifiedBy: productData.lastModifiedBy || 'system'
    });
  }

  // Insert all products
  const products = await Product.insertMany(productsWithIds);

  res.status(201).json({
    success: true,
    data: products,
    message: `Successfully created ${products.length} products`,
    count: products.length
  });
};

// @desc    Create multiple products in bulk
// @route   POST /api/user/products/bulk
// @access  Public
const createBulkProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Products array is required and cannot be empty'
      });
    }

    return await createMultipleProducts(products, res);
  } catch (error) {
    handleProductError(error, res);
  }
};

// Generate unique product ID
const generateUniqueProductId = async () => {
  let productId;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    productId = Product.generateProductId();
    const existingProduct = await Product.findOne({ productId });
    if (!existingProduct) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique product ID after multiple attempts');
  }

  return productId;
};

// Error handler
const handleProductError = (error, res) => {
  console.error('Product Error:', error);

  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }
  
  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Product ID already exists'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: error.message
  });
};

// Keep all other existing functions exactly as they were
// @desc    Get all products with filtering, sorting and pagination
// @route   GET /api/user/products
// @access  Public
const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'dateAdded',
      sortOrder = 'desc',
      category,
      brand,
      search
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (category) {
      filter.category = category;
    }
    
    if (brand) {
      filter.brand = new RegExp(brand, 'i');
    }
    
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { productId: new RegExp(search, 'i') }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const products = await Product.find(filter)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    handleProductError(error, res);
  }
};

// @desc    Get single product by ID
// @route   GET /api/user/products/:id
// @access  Public
const getProductById = async (req, res) => {
  console.log('🔍 Get Product By ID - Params:', req.params);
  console.log('📝 Requested ID:', req.params.id);
  
  try {
    const product = await Product.findOne({ productId: req.params.id });

    console.log('📦 Database Query Result:', product);

    if (!product) {
      console.log('❌ Product not found for ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    console.log('✅ Product found:', product.productId, '-', product.name);
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('💥 Server Error:', error);
    handleProductError(error, res);
  }
};

// @desc    Update product
// @route   PUT /api/user/products/:id
// @access  Public
const updateProduct = async (req, res) => {
  try {
    const { lastModifiedBy, ...updateData } = req.body;
    
    const product = await Product.findOneAndUpdate(
      {
        $or: [
          { _id: req.params.id },
          { productId: req.params.id }
        ]
      },
      {
        ...updateData,
        lastModifiedBy: lastModifiedBy || 'system',
        lastUpdated: Date.now()
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    handleProductError(error, res);
  }
};

// @desc    Delete product
// @route   DELETE /api/user/products/:id
// @access  Public
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      $or: [
        { _id: req.params.id },
        { productId: req.params.id }
      ]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: {
        productId: product.productId,
        name: product.name
      }
    });
  } catch (error) {
    handleProductError(error, res);
  }
};

// @desc    Get products by category
// @route   GET /api/user/products/category/:category
// @access  Public
const getProductsByCategory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { category } = req.params;

    const products = await Product.find({ category })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ dateAdded: -1 });

    const total = await Product.countDocuments({ category });

    res.status(200).json({
      success: true,
      data: products,
      category,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total
      }
    });
  } catch (error) {
    handleProductError(error, res);
  }
};

// @desc    Get product statistics
// @route   GET /api/user/products/stats/summary
// @access  Public
const getProductStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    
    const productsByCategory = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const recentProducts = await Product.find()
      .sort({ dateAdded: -1 })
      .limit(5)
      .select('productId name category dateAdded');

    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        categoryDistribution: productsByCategory,
        recentProducts
      }
    });
  } catch (error) {
    handleProductError(error, res);
  }
};

module.exports = {
  createProduct,
  createBulkProducts,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getProductStats
};