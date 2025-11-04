const { Product, Category, Producer, Review, sequelize, Address } = require("../models/index");
const { Op } = require("sequelize");
const { syncProduct, deleteProduct: deleteProductFromSearch } = require("../services/syncService");
const { getProducersWithinRange, calculateDistance } = require("../utils/geoUtils");
const Admin = require("../models/Admin");

exports.createProduct = async (req, res) => {
  try {
    const { title, description, price, inventory, categoryId } = req.body;
    const producerId = req.producer?.id;

    const images = (req.files || []).map((file) => file.path).slice(0, 5);

    if (!producerId) {
      return res.status(401).json({ error: "Unauthorized: Producer not found" });
    }
    if (!categoryId) {
      return res.status(400).json({ error: "Category ID is required" });
    }

    // Units
    let unitLabel = (req.body.unitLabel || 'piece').toString().trim().slice(0, 20);
    let unitSize = parseFloat(req.body.unitSize || '1');
    if (!unitLabel) unitLabel = 'piece';
    if (!(unitSize > 0)) {
      return res.status(400).json({ error: "Invalid unit size" });
    }

    // Discount
    const allowedDiscountTypes = ['none', 'percentage', 'flat'];
    const discountType = (req.body.discountType || 'none').toLowerCase();
    if (!allowedDiscountTypes.includes(discountType)) {
      return res.status(400).json({ error: "Invalid discount type" });
    }
    let discountValue = parseFloat(req.body.discountValue || '0');
    if (!(discountValue >= 0)) discountValue = 0;
    const priceNum = parseFloat(price);
    if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
      return res.status(400).json({ error: "Discount percentage must be between 0 and 100" });
    }
    if (discountType === 'flat' && discountValue > priceNum) {
      return res.status(400).json({ error: "Flat discount cannot exceed price" });
    }

    // Discount conditions
    let discountMinQuantity = null;
    let discountMinSubtotal = null;
    if (discountType !== 'none') {
      if (typeof req.body.discountMinQuantity !== 'undefined' && req.body.discountMinQuantity !== '') {
        const q = parseInt(req.body.discountMinQuantity, 10);
        if (!(q >= 1)) return res.status(400).json({ error: 'discountMinQuantity must be >= 1' });
        discountMinQuantity = q;
      }
      if (typeof req.body.discountMinSubtotal !== 'undefined' && req.body.discountMinSubtotal !== '') {
        const s = parseFloat(req.body.discountMinSubtotal);
        if (!(s >= 0)) return res.status(400).json({ error: 'discountMinSubtotal must be >= 0' });
        discountMinSubtotal = s;
      }
    }

    const product = await Product.create({
      title,
      description,
      price: priceNum,
      inventory,
      categoryId,
      producerId,
      images,
      unitLabel,
      unitSize,
      discountType,
      discountValue,
      discountMinQuantity,
      discountMinSubtotal,
    });

    // Sync to Meilisearch (don't await - run in background)
    syncProduct(product.id).catch(err => console.error('Meilisearch sync error:', err));

    res.status(201).json(product);
  } catch (error) {
    console.error("Create Product Error:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
};

// GET /api/products - list products (supports categoryId, limit, offset, lat, lon)
exports.getAllProducts = async (req, res) => {
  try {
    const { categoryId, limit, offset, lat, lon } = req.query;
    const where = {};
    if (categoryId) where.categoryId = categoryId;

    const queryOptions = {
      where,
      include: [
        { model: Producer, attributes: ["businessName", "businessLogo", "latitude", "longitude"] },
        { model: Category, attributes: ["name"] },
      ],
      order: [["createdAt", "DESC"]],
    };
    if (limit) queryOptions.limit = parseInt(limit);
    if (offset) queryOptions.offset = parseInt(offset);

    let products = await Product.findAll(queryOptions);

    // Calculate distance if user location provided
    if (lat && lon) {
      const userLat = parseFloat(lat);
      const userLon = parseFloat(lon);
      
      // Get admin range setting
      const admin = await Admin.findOne();
      const rangeKm = admin?.nearbyProducerRangeKm || 10.0;
      
      // Add distance to each product
      products = products.map(product => {
        const productObj = product.toJSON();
        
        if (product.Producer?.latitude && product.Producer?.longitude) {
          const distance = calculateDistance(
            userLat,
            userLon,
            product.Producer.latitude,
            product.Producer.longitude
          );
          productObj.distance = Number(distance.toFixed(2)); // in km
          productObj.rangeKm = rangeKm; // Include range for frontend to determine color
        } else {
          productObj.distance = null; // Producer location not available
          productObj.rangeKm = rangeKm;
        }
        
        return productObj;
      });
      
      // Sort by distance (nearest first, null distances at the end)
      products.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    res.json(products);
  } catch (error) {
    console.error("Fetch Products Error:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

// GET /api/products/count - total count (supports categoryId & q for search)
exports.getProductsCount = async (req, res) => {
  try {
    const { categoryId, q } = req.query;
    const where = {};
    if (categoryId) where.categoryId = categoryId;

    // Search-aware count across Product, Producer and Category
    if (q && q.trim()) {
      const count = await Product.count({
        include: [
          { model: Producer, attributes: [] },
          { model: Category, attributes: [] },
        ],
        where: {
          ...where,
          [Op.or]: [
            { title: { [Op.iLike]: `%${q}%` } },
            { "$Producer.businessName$": { [Op.iLike]: `%${q}%` } },
            { "$Category.name$": { [Op.iLike]: `%${q}%` } },
          ],
        },
        distinct: true,
      });
      return res.json({ count });
    }

    const count = await Product.count({ where });
    res.json({ count });
  } catch (error) {
    console.error("Count Products Error:", error);
    res.status(500).json({ error: "Failed to count products" });
  }
};

// GET /api/products/search?q=...&limit=...&offset=...
exports.searchProducts = async (req, res) => {
  try {
    const { q, limit, offset } = req.query;
    if (!q) return res.status(400).json({ error: "Missing search query" });

    const queryOptions = {
      include: [
        { model: Producer, attributes: ["businessName", "businessLogo"] },
        { model: Category, attributes: ["name"] },
      ],
      where: {
        [Op.or]: [
          { title: { [Op.iLike]: `%${q}%` } },
          { "$Producer.businessName$": { [Op.iLike]: `%${q}%` } },
          { "$Category.name$": { [Op.iLike]: `%${q}%` } },
        ],
      },
      order: [["createdAt", "DESC"]],
    };

    if (limit) queryOptions.limit = parseInt(limit);
    if (offset) queryOptions.offset = parseInt(offset);

    const products = await Product.findAll(queryOptions);
    res.json(products);
  } catch (error) {
    console.error("Search Products Error:", error);
    res.status(500).json({ error: "Failed to search products" });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id, {
      include: [
        { model: Producer, attributes: ["businessName", "businessLogo", "averageRating", "totalReviews"] },
        { model: Category, attributes: ["name"] },
      ],
    });
    if (!product) return res.status(404).json({ error: "Product not found" });

    // Attach producer total products count
    try {
      const totalProducts = await Product.count({ where: { producerId: product.producerId } });
      if (product.Producer) {
        product.Producer.setDataValue('totalProducts', totalProducts);
      }
    } catch (e) {
      console.warn('Failed to compute producer totalProducts:', e?.message || e);
    }

    res.json(product);
  } catch (error) {
    console.error("Get Product Error:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, inventory, categoryId } = req.body;
    const producerId = req.producer?.id;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.producerId !== producerId) {
      return res.status(403).json({ error: "Unauthorized: You can only update your own products" });
    }

    const updateData = { title, description, price, inventory, categoryId };

    // Units
    if (typeof req.body.unitLabel !== 'undefined') {
      updateData.unitLabel = String(req.body.unitLabel).trim().slice(0, 20) || 'piece';
    }
    if (typeof req.body.unitSize !== 'undefined') {
      const unitSize = parseFloat(req.body.unitSize);
      if (!(unitSize > 0)) return res.status(400).json({ error: 'Invalid unit size' });
      updateData.unitSize = unitSize;
    }

    // Discount
    if (typeof req.body.discountType !== 'undefined') {
      const allowedDiscountTypes = ['none', 'percentage', 'flat'];
      const discountType = String(req.body.discountType).toLowerCase();
      if (!allowedDiscountTypes.includes(discountType)) {
        return res.status(400).json({ error: 'Invalid discount type' });
      }
      updateData.discountType = discountType;
      if (discountType === 'none') {
        updateData.discountValue = 0;
        updateData.discountMinQuantity = null;
        updateData.discountMinSubtotal = null;
      }
    }
    if (typeof req.body.discountValue !== 'undefined') {
      let val = parseFloat(req.body.discountValue);
      if (!(val >= 0)) val = 0;
      // validate against final price if both provided
      const finalPrice = typeof updateData.price !== 'undefined' ? parseFloat(updateData.price) : product.price;
      const dType = updateData.discountType || product.discountType;
      if (dType === 'percentage' && (val < 0 || val > 100)) {
        return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
      }
      if (dType === 'flat' && val > finalPrice) {
        return res.status(400).json({ error: 'Flat discount cannot exceed price' });
      }
      updateData.discountValue = val;
    }
    // Discount conditions (apply only when discount type is not none)
    if ((updateData.discountType || product.discountType) !== 'none') {
      if (typeof req.body.discountMinQuantity !== 'undefined') {
        if (req.body.discountMinQuantity === '' || req.body.discountMinQuantity === null) {
          updateData.discountMinQuantity = null;
        } else {
          const q = parseInt(req.body.discountMinQuantity, 10);
          if (!(q >= 1)) return res.status(400).json({ error: 'discountMinQuantity must be >= 1' });
          updateData.discountMinQuantity = q;
        }
      }
      if (typeof req.body.discountMinSubtotal !== 'undefined') {
        if (req.body.discountMinSubtotal === '' || req.body.discountMinSubtotal === null) {
          updateData.discountMinSubtotal = null;
        } else {
          const s = parseFloat(req.body.discountMinSubtotal);
          if (!(s >= 0)) return res.status(400).json({ error: 'discountMinSubtotal must be >= 0' });
          updateData.discountMinSubtotal = s;
        }
      }
    }
    
    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map((file) => file.path).slice(0, 5);
    }

    await product.update(updateData);

    // Sync to Meilisearch (don't await - run in background)
    syncProduct(product.id).catch(err => console.error('Meilisearch sync error:', err));

    res.json(product);
  } catch (error) {
    console.error("Update Product Error:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const producerId = req.producer?.id;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.producerId !== producerId) {
      return res.status(403).json({ error: "Unauthorized: You can only delete your own products" });
    }

    await product.destroy();

    // Delete from Meilisearch (don't await - run in background)
    deleteProductFromSearch(id).catch(err => console.error('Meilisearch delete error:', err));

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
};

exports.getBestSellers = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 24);

    const products = await Product.findAll({
      include: [
        { model: Category, attributes: ["id", "name"] },
        { model: Producer, attributes: ["businessName", "businessLogo"] },
      ],
      where: {
        totalReviews: { [Op.gt]: 0 }, // include all rated products; exclude unrated
      },
      order: [["averageRating", "DESC"], ["totalReviews", "DESC"], ["updatedAt", "DESC"]],
      limit,
    });

    res.json(products);
  } catch (error) {
    console.error("Best sellers error:", error);
    res.status(500).json({ error: "Failed to fetch best sellers" });
  }
};
