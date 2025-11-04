const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Producer, Category, Product, Order, OrderItem, Review, ProducerWalletTransaction, User, sequelize } = require("../models/index");
const { Op } = require("sequelize");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

exports.signup = async (req, res) => {
  try {
    const {
      email,
      password,
      businessName,
      phoneNumber,
      description,
      businessAddressLine1,
      businessAddressLine2,
      businessCity,
      businessState,
      businessPostalCode,
      businessCountry,
      businessSameAsPermanent: sameAsPermanentRaw,
      latitude,
      longitude,
    } = req.body;

    const businessSameAsPermanent = String(sameAsPermanentRaw).toLowerCase() === 'true';

    const categories = JSON.parse(req.body.categories || "[]"); // parse categories from form data

    const existing = await Producer.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Uploaded files via multer.fields: businessLogo, aadharImages, idDocuments, addressProofs
    const businessLogo = req.files?.businessLogo?.[0]?.path || null;
    const aadharImages = (req.files?.aadharImages || []).map(f => f.path);
    const idDocuments = (req.files?.idDocuments || []).map(f => f.path);
    const addressProofs = (req.files?.addressProofs || []).map(f => f.path);

    // Permanent address (from Aadhaar)
    let addressLine1 = null,
      addressLine2 = null,
      city = null,
      state = null,
      postalCode = null,
      country = null,
      aadharAddressRaw = null;

    // Business address
    let bLine1 = null,
      bLine2 = null,
      bCity = null,
      bState = null,
      bPostal = null,
      bCountry = null,
      location = null; // full business address string for display

    // If Aadhaar images provided, parse address via Gemini (no geocoding)
    if (aadharImages.length > 0) {
      try {
        const { extractAddressFromAadhaar } = require("../services/gemini");
        const result = await extractAddressFromAadhaar(aadharImages);
        addressLine1 = result.address.addressLine1 || null;
        addressLine2 = result.address.addressLine2 || null;
        city = result.address.city || null;
        state = result.address.state || null;
        postalCode = result.address.postalCode || null;
        country = result.address.country || null;
        aadharAddressRaw = result.rawAddressText || null;

        if (businessSameAsPermanent) {
          bLine1 = addressLine1;
          bLine2 = addressLine2;
          bCity = city;
          bState = state;
          bPostal = postalCode;
          bCountry = country;
        }
      } catch (err) {
        console.error("Gemini parsing error during signup:", err.message || err);
      }
    }

    // If not same-as-permanent, use provided business address fields
    if (!businessSameAsPermanent) {
      bLine1 = businessAddressLine1 || null;
      bLine2 = businessAddressLine2 || null;
      bCity = businessCity || null;
      bState = businessState || null;
      bPostal = businessPostalCode || null;
      bCountry = businessCountry || null;
    }

    // Compose a simple full business address string for display
    const parts = [bLine1, bLine2, bCity, bState, bPostal, bCountry].filter(Boolean);
    location = parts.join(', ');

    const producer = await Producer.create({
      email,
      password: hashedPassword,
      businessName,
      phoneNumber,
      description,

      // Permanent address (Aadhaar)
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,

      // Business address
      businessAddressLine1: bLine1,
      businessAddressLine2: bLine2,
      businessCity: bCity,
      businessState: bState,
      businessPostalCode: bPostal,
      businessCountry: bCountry,
      businessSameAsPermanent,

      // Display string
      location,

      // Business location coordinates from browser
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,

      businessLogo,
      aadharImages: aadharImages.length ? aadharImages : null,
      aadharAddressRaw,

      // KYC docs at signup
      idDocuments: idDocuments.length ? idDocuments : null,
      addressProofs: addressProofs.length ? addressProofs : null,
      kycStatus: (idDocuments.length || addressProofs.length) ? 'pending' : 'pending',
    });

    // Attach categories to producer
    if (categories.length > 0) {
      await producer.setCategories(categories);
    }

    res.status(201).json({
      message: "Producer registered successfully",
      producer,
      autoFilledAddress: {
        permanent: {
          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          country,
        },
        business: {
          addressLine1: bLine1,
          addressLine2: bLine2,
          city: bCity,
          state: bState,
          postalCode: bPostal,
          country: bCountry,
          fullAddress: location,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Signup failed" });
  }
};

// Producer: Get KYC Status and Docs
exports.getKycStatusForProducer = async (req, res) => {
  try {
    const producer = req.producer;
    const idDocs = producer.idDocuments || [];
    const addressDocs = producer.addressProofs || [];
    let status = "";
    if (producer.kycStatus === "approved") {
      status = "approved";
    } else if (producer.kycStatus === "rejected") {
      status = "rejected";
    } else if (producer.kycStatus === "pending" && (idDocs.length > 0 || addressDocs.length > 0)) {
      status = "pending_with_docs";
    } else {
      status = "pending_no_docs";
    }
    res.status(200).json({
      status,
      remarks: producer.kycRemarks || null,
      idDocs,
      addressDocs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get KYC status" });
  }
};


// Sign In
exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const producer = await Producer.findOne({ where: { email } });
    if (!producer) return res.status(404).json({ message: "Producer not found" });

    const isMatch = await bcrypt.compare(password, producer.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: producer.id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, producer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Signin failed" });
  }
};


// Update Producer
exports.updateProducer = async (req, res) => {
  try {
    const {
      email,
      password,
      businessName,
      phoneNumber,
      description,
      location,
      latitude,
      longitude,
      kycStatus,
      kycRemarks,
      // Business address fields
      businessAddressLine1,
      businessAddressLine2,
      businessCity,
      businessState,
      businessPostalCode,
      businessCountry,
      businessSameAsPermanent,
    } = req.body;

    const categories = JSON.parse(req.body.categories || "[]");
    const businessLogo = req.file?.path;

    const producer = await req.producer.reload(); // from middleware

    // Update fields
    producer.email = email || producer.email;
    if (password) {
      producer.password = await bcrypt.hash(password, 10);
    }
    producer.businessName = businessName || producer.businessName;
    producer.phoneNumber = phoneNumber || producer.phoneNumber;
    producer.description = description || producer.description;
    producer.location = location || producer.location;
    if (latitude !== undefined && latitude !== null) producer.latitude = parseFloat(latitude);
    if (longitude !== undefined && longitude !== null) producer.longitude = parseFloat(longitude);
    if (businessLogo) producer.businessLogo = businessLogo;

    // Update business address fields
    if (businessAddressLine1 !== undefined) producer.businessAddressLine1 = businessAddressLine1;
    if (businessAddressLine2 !== undefined) producer.businessAddressLine2 = businessAddressLine2;
    if (businessCity !== undefined) producer.businessCity = businessCity;
    if (businessState !== undefined) producer.businessState = businessState;
    if (businessPostalCode !== undefined) producer.businessPostalCode = businessPostalCode;
    if (businessCountry !== undefined) producer.businessCountry = businessCountry;
    if (businessSameAsPermanent !== undefined) {
      producer.businessSameAsPermanent = businessSameAsPermanent === 'true' || businessSameAsPermanent === true;
    }

    // Handle KYC Status
    if (kycStatus && ["pending", "approved", "rejected"].includes(kycStatus)) {
      producer.kycStatus = kycStatus;

      // Save remarks only if status is rejected and remarks provided
      if (kycStatus === "rejected" && kycRemarks) {
        producer.kycRemarks = kycRemarks;
      } else {
        producer.kycRemarks = null; // Clear previous remarks
      }
    }

    await producer.save();

    // If categories are provided, update the relationship
    if (Array.isArray(categories) && categories.length > 0) {
      await producer.setCategories(categories);
    }

    // Optionally reload to include updated categories
    const updatedProducer = await Producer.findByPk(producer.id, {
      include: [{ model: Category, through: { attributes: [] } }],
      attributes: { exclude: ["password"] },
    });

    res.status(200).json({ message: "Producer updated", producer: updatedProducer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update producer" });
  }
};


exports.getAllProducers = async (req, res) => {
  try {
    const producers = await Producer.findAll({
      include: ["Categories", "Products"], // adjust if you’ve aliased associations
    });
    res.status(200).json(producers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch producers" });
  }
};

exports.getProducerProfile = async (req, res) => {
  try {
    const producer = await req.producer.reload({
      include: [{ model: Category, through: { attributes: [] } }],
      attributes: { exclude: ["password"] },
    });

    res.status(200).json({ producer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch producer profile" });
  }
};

// Change password for producer: verify old password, set new hashed password
exports.changePassword = async (req, res) => {
  try {
    const p = req.producer;
    if (!p) return res.status(401).json({ message: "Unauthorized" });
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Both oldPassword and newPassword are required" });
    }
    const isMatch = await bcrypt.compare(oldPassword, p.password);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });
    if (String(newPassword).length < 8) return res.status(400).json({ message: "New password must be at least 8 characters" });
    p.password = await bcrypt.hash(newPassword, 10);
    await p.save();
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to change password" });
  }
};

// Update only location coordinates
exports.updateLocation = async (req, res) => {
  try {
    const producer = req.producer;
    if (!producer) return res.status(401).json({ message: "Unauthorized" });
    
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }
    
    producer.latitude = parseFloat(latitude);
    producer.longitude = parseFloat(longitude);
    await producer.save();
    
    res.json({ 
      message: "Location updated successfully",
      latitude: producer.latitude,
      longitude: producer.longitude
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update location" });
  }
};


exports.uploadKYC = async (req, res) => {
  try {
    const producer = await req.producer.reload();

    const idDocs = req.files["idDocuments"]?.map(file => file.path) || [];
    const addressProofs = req.files["addressProofs"]?.map(file => file.path) || [];

    if (idDocs.length === 0 && addressProofs.length === 0) {
      return res.status(400).json({ message: "No KYC documents uploaded" });
    }

    // Replace existing docs with the new submission to allow clean re-apply
    if (idDocs.length > 0) producer.idDocuments = idDocs;
    if (addressProofs.length > 0) producer.addressProofs = addressProofs;

    // Move status to pending. Do NOT clear kycRemarks so admin can see last rejection reason.
    producer.kycStatus = "pending";

    await producer.save();

    res.status(200).json({
      message: "KYC documents uploaded successfully",
      idDocuments: producer.idDocuments || [],
      addressProofs: producer.addressProofs || [],
    });
  } catch (error) {
    console.error("KYC Upload Error:", error);
    res.status(500).json({ message: "KYC upload failed", error: error.message });
  }
};

// Get all products for the authenticated producer

exports.getMyProducts = async (req, res) => {
  try {
    const producerId = req.producer.id;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const search = (req.query.search || '').trim();

    const where = { producerId };
    if (search) {
      where.title = { [Op.iLike]: `%${search}%` };
    }
    // Optional filter by categoryId
    if (req.query.categoryId) {
      const catId = parseInt(req.query.categoryId, 10);
      if (!Number.isNaN(catId)) {
        where.categoryId = catId;
      }
    }

    const offset = (page - 1) * limit;

    const { rows, count } = await Product.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const hasMore = offset + rows.length < count;

    res.status(200).json({
      items: rows,
      total: count,
      page,
      pageSize: limit,
      hasMore,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch producer's products" });
  }
};


// Wallet summary for current producer
exports.getWalletSummary = async (req, res) => {
  try {
    const { ProducerWallet } = require("../models");
    const producerId = req.producer?.id;
    if (!producerId) return res.status(401).json({ message: "Unauthorized" });

    let wallet = await ProducerWallet.findOne({ where: { producerId } });
    if (!wallet) {
      wallet = await ProducerWallet.create({ producerId, balance: 0.0 });
    }
    res.json({
      balance: Number(wallet.balance),
      currency: wallet.currency || "INR",
      updatedAt: wallet.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch wallet summary" });
  }
};

// Wallet transactions (credits/debits) for current producer
exports.getWalletTransactions = async (req, res) => {
  try {
    const producerId = req.producer?.id;
    if (!producerId) return res.status(401).json({ message: "Unauthorized" });

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const { rows, count } = await ProducerWalletTransaction.findAndCountAll({
      where: { producerId },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    res.json({
      items: rows || [],
      page,
      pageSize: limit,
      total: count,
      hasMore: offset + (rows?.length || 0) < count,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch wallet transactions" });
  }
};

// Sales analytics for current producer
exports.getAnalytics = async (req, res) => {
  try {
    const producerId = req.producer?.id;
    if (!producerId) return res.status(401).json({ message: "Unauthorized" });

    const since = new Date();
    since.setDate(since.getDate() - 29); // last 30 days including today

    // Orders and revenue time series (by day)
    const dayCol = sequelize.fn('date_trunc', 'day', sequelize.col('Order.createdAt'));
    const orderItemsAgg = await OrderItem.findAll({
      where: {},
      include: [
        { model: Product, attributes: [], where: { producerId } },
        { model: Order, attributes: [], where: { createdAt: { [Op.gte]: since } } },
      ],
      attributes: [
        [dayCol, 'day'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Order.id'))), 'orders'],
        [sequelize.fn('SUM', sequelize.literal('"OrderItem"."price" * "OrderItem"."quantity"')), 'revenue'],
      ],
      group: [dayCol],
      order: [[dayCol, 'ASC']],
      raw: true,
    });

    // Totals across all time
    const totalsAgg = await OrderItem.findAll({
      include: [
        { model: Product, attributes: [], where: { producerId } },
        { model: Order, attributes: [] },
      ],
      attributes: [
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Order.id'))), 'totalOrders'],
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalItemsSold'],
        [sequelize.fn('SUM', sequelize.literal('"OrderItem"."price" * "OrderItem"."quantity"')), 'totalRevenue'],
      ],
      raw: true,
    });
    const totals = totalsAgg && totalsAgg[0] ? totalsAgg[0] : { totalOrders: 0, totalItemsSold: 0, totalRevenue: 0 };

    // Reviews stats (for this producer's products)
    const products = await Product.findAll({ where: { producerId }, attributes: ['id'], raw: true });
    const productIds = products.map(p => p.id);
    let reviewsStats = { totalReviews: 0, averageRating: 0 };
    let ratingBuckets = [];
    let recentReviews = [];
    if (productIds.length > 0) {
      const reviewsAgg = await Review.findAll({
        where: { productId: { [Op.in]: productIds } },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews'],
          [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
        ],
        raw: true,
      });
      if (reviewsAgg && reviewsAgg[0]) {
        reviewsStats.totalReviews = Number(reviewsAgg[0].totalReviews || 0);
        reviewsStats.averageRating = Math.round((Number(reviewsAgg[0].averageRating || 0)) * 10) / 10;
      }
      ratingBuckets = await Review.findAll({
        where: { productId: { [Op.in]: productIds } },
        attributes: ['rating', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['rating'],
        order: [['rating', 'ASC']],
        raw: true,
      });
      recentReviews = await Review.findAll({
        where: { productId: { [Op.in]: productIds } },
        order: [['createdAt', 'DESC']],
        limit: 5,
        include: [
          { model: User, attributes: ['username'] },
          { model: Product, attributes: ['title'] },
        ],
      });
    }

    // Payments (wallet credits) time series last 30 days
    const walletAgg = await ProducerWalletTransaction.findAll({
      where: { producerId, createdAt: { [Op.gte]: since }, type: 'credit' },
      attributes: [
        [sequelize.fn('date_trunc', 'day', sequelize.col('createdAt')), 'day'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'amount'],
      ],
      group: [sequelize.fn('date_trunc', 'day', sequelize.col('createdAt'))],
      order: [[sequelize.fn('date_trunc', 'day', sequelize.col('createdAt')), 'ASC']],
      raw: true,
    });

    res.json({
      since,
      series: orderItemsAgg.map(r => ({
        day: r.day,
        orders: Number(r.orders || 0),
        revenue: Number(r.revenue || 0),
      })),
      totals: {
        totalOrders: Number(totals.totalOrders || 0),
        totalItemsSold: Number(totals.totalItemsSold || 0),
        totalRevenue: Number(totals.totalRevenue || 0),
        avgOrderValue: Number(totals.totalOrders || 0) > 0 ? Math.round((Number(totals.totalRevenue) / Number(totals.totalOrders)) * 100) / 100 : 0,
      },
      reviews: {
        ...reviewsStats,
        distribution: ratingBuckets.map(b => ({ rating: Number(b.rating), count: Number(b.count) })),
        recent: recentReviews,
      },
      payments: {
        creditsByDay: walletAgg.map(w => ({ day: w.day, amount: Number(w.amount || 0) })),
      },
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
};

// Get featured producers for home page (public endpoint)
exports.getFeaturedProducers = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 20);
    
    const producers = await Producer.findAll({
      where: { 
        kycStatus: 'approved'
      },
      attributes: [
        'id', 
        'businessName',
        'email',
        'phoneNumber',
        'businessLogo', 
        'description',
        'businessCity',
        'businessState',
        'city',
        'state',
        'location'
      ],
      include: [
        {
          model: Category,
          attributes: ['id', 'name'],
          through: { attributes: [] }
        }
      ],
      limit,
    });

    // Calculate rating for each producer from their products' reviews
    const producersWithRating = await Promise.all(
      producers.map(async (producer) => {
        const products = await Product.findAll({
          where: { producerId: producer.id },
          attributes: ['id'],
          raw: true
        });
        
        const productIds = products.map(p => p.id);
        let rating = null;
        
        if (productIds.length > 0) {
          const reviewsAgg = await Review.findAll({
            where: { productId: { [Op.in]: productIds } },
            attributes: [
              [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
            ],
            raw: true,
          });
          
          if (reviewsAgg && reviewsAgg[0] && reviewsAgg[0].averageRating) {
            rating = Math.round(Number(reviewsAgg[0].averageRating) * 10) / 10;
          }
        }
        
        const producerData = producer.toJSON();
        return {
          ...producerData,
          rating,
          farmName: producer.businessName,
          categories: producerData.Categories || [],
          // Use business address, fallback to permanent address
          displayCity: producerData.businessCity || producerData.city,
          displayState: producerData.businessState || producerData.state
        };
      })
    );

    res.json({ producers: producersWithRating });
  } catch (error) {
    console.error('Fetch featured producers error:', error);
    res.status(500).json({ message: 'Failed to fetch featured producers' });
  }
};

// Get public producer profile with products (public endpoint)
exports.getPublicProducerProfile = async (req, res) => {
  try {
    const producerId = req.params.id;
    
    const producer = await Producer.findByPk(producerId, {
      attributes: [
        'id',
        'businessName',
        'email',
        'phoneNumber',
        'businessLogo',
        'description',
        'businessCity',
        'businessState',
        'city',
        'state',
        'location'
      ],
      include: [
        {
          model: Category,
          attributes: ['id', 'name'],
          through: { attributes: [] }
        }
      ]
    });

    if (!producer) {
      return res.status(404).json({ message: 'Producer not found' });
    }

    // Get all products by this producer grouped by category
    const products = await Product.findAll({
      where: { producerId },
      include: [
        {
          model: Category,
          attributes: ['id', 'name']
        }
      ],
      order: [['id', 'DESC']]
    });

    // Calculate producer stats
    const totalProducts = products.length;
    
    // Get reviews for all products
    const productIds = products.map(p => p.id);
    let averageRating = null;
    let totalReviews = 0;
    
    if (productIds.length > 0) {
      const reviewsAgg = await Review.findAll({
        where: { productId: { [Op.in]: productIds } },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews']
        ],
        raw: true,
      });
      
      if (reviewsAgg && reviewsAgg[0]) {
        averageRating = reviewsAgg[0].averageRating ? Math.round(Number(reviewsAgg[0].averageRating) * 10) / 10 : null;
        totalReviews = Number(reviewsAgg[0].totalReviews || 0);
      }
    }

    // Group products by category
    const productsByCategory = {};
    products.forEach(product => {
      const catId = product.Category?.id;
      const catName = product.Category?.name || 'Uncategorized';
      
      if (!productsByCategory[catId]) {
        productsByCategory[catId] = {
          categoryId: catId,
          categoryName: catName,
          products: []
        };
      }
      productsByCategory[catId].products.push(product);
    });

    const producerData = producer.toJSON();
    
    res.json({
      producer: {
        ...producerData,
        displayCity: producerData.businessCity || producerData.city,
        displayState: producerData.businessState || producerData.state,
        categories: producerData.Categories || []
      },
      stats: {
        totalProducts,
        averageRating,
        totalReviews
      },
      productsByCategory: Object.values(productsByCategory)
    });
  } catch (error) {
    console.error('Fetch public producer profile error:', error);
    res.status(500).json({ message: 'Failed to fetch producer profile' });
  }
};
