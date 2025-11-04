const jwt = require('jsonwebtoken');
const { Admin } = require("../models/index");
const { Producer, Category, Order, OrderItem, Product, AdminWallet, ProducerWallet, ProducerWalletTransaction, User, sequelize } = require("../models/index");
const { Op, fn, col, literal } = require("sequelize");

exports.signInAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const admin = await Admin.findOne({ where: { email } });

    if (!admin)
      return res.status(404).json({ message: "Admin not found" });

    if (password !== admin.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Single token (like producer), expires in 7 days
    const token = jwt.sign({ id: admin.id, role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(200).json({
      message: "Login successful",
      token,
      admin: {
        id: admin.id,
        email: admin.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};


exports.getProducersForVerification = async (req, res) => {
  try {
    const producers = await Producer.findAll({
      where: {
        idDocuments: {
          [Op.ne]: null,
        },
        addressProofs: {
          [Op.ne]: null,
        },
        kycStatus: "pending", 
      },
      include: [
        {
          model: Category,
          through: { attributes: [] },
        },
      ],
      attributes: {
        exclude: ["password"],
      },
    });

    
    const filtered = producers.filter(
      (p) => Array.isArray(p.idDocuments) && p.idDocuments.length > 0 &&
             Array.isArray(p.addressProofs) && p.addressProofs.length > 0
    );

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (error) {
    console.error("Error fetching producers for KYC verification:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Admin: List all producers with status and applied date
exports.getAllProducersWithStatus = async (req, res) => {
  try {
    const producers = await Producer.findAll({
      include: [
        {
          model: Category,
          through: { attributes: [] },
        },
      ],
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({ success: true, count: producers.length, data: producers });
  } catch (error) {
    console.error("Error fetching all producers:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// Admin: Approve Producer
exports.approveProducer = async (req, res) => {
  try {
    const { id } = req.params;
    const producer = await Producer.findByPk(id);
    if (!producer) return res.status(404).json({ message: "Producer not found" });
    producer.kycStatus = "approved";
    producer.kycRemarks = null;
    await producer.save();
    try {
      const { ProducerPushToken } = require("../models");
      const { notifyProducerKyc } = require("../utils/push");
      const rows = await ProducerPushToken.findAll({ where: { producerId: producer.id }, attributes: ['token'], raw: true });
      const tokens = rows.map(r => r.token);
      if (tokens.length) {
        const res = await notifyProducerKyc({ tokens, status: 'approved' });
        console.log('[push] approve result:', { successCount: res.successCount, failureCount: res.failureCount });
      }
    } catch (e) {
      console.warn('[push] approveProducer notify error:', e.message);
    }
    res.status(200).json({ message: "Producer approved", producer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to approve producer" });
  }
};

// Admin: Reject Producer
exports.rejectProducer = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const producer = await Producer.findByPk(id);
    if (!producer) return res.status(404).json({ message: "Producer not found" });
    producer.kycStatus = "rejected";
    producer.kycRemarks = remarks || null;
    await producer.save();
    try {
      const { ProducerPushToken } = require("../models");
      const { notifyProducerKyc } = require("../utils/push");
      const rows = await ProducerPushToken.findAll({ where: { producerId: producer.id }, attributes: ['token'], raw: true });
      const tokens = rows.map(r => r.token);
      if (tokens.length) {
        const res = await notifyProducerKyc({ tokens, status: 'rejected', remarks });
        console.log('[push] reject result:', { successCount: res.successCount, failureCount: res.failureCount });
      }
    } catch (e) {
      console.warn('[push] rejectProducer notify error:', e.message);
    }
    res.status(200).json({ message: "Producer rejected", producer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to reject producer" });
  }
};

// Admin dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    // Total orders
    const totalOrders = await Order.count();

    // Pending verifications (producers with submitted docs and pending status)
    const pendingProducers = await Producer.count({
      where: {
        kycStatus: 'pending',
        idDocuments: { [Op.ne]: null },
        addressProofs: { [Op.ne]: null },
      },
    });

    // Orders by category (last 30 days), via OrderItem -> Product -> Category
    const since = new Date();
    since.setDate(since.getDate() - 29);

    const rows = await OrderItem.findAll({
      include: [
        { model: Product, attributes: [], include: [{ model: Category, attributes: [] }] },
        { model: Order, attributes: [], where: { createdAt: { [Op.gte]: since } } },
      ],
      attributes: [
        [fn('COALESCE', col('Product->Category.name'), literal("'Uncategorized'")), 'category'],
        [fn('COUNT', literal('1')), 'orders'],
      ],
      group: [col('Product->Category.name')],
      order: [[literal('orders'), 'DESC']],
      raw: true,
    });

    const chart = rows.map(r => ({ name: r.category || 'Uncategorized', orders: Number(r.orders || 0) }));

    res.json({
      totalOrders,
      pendingVerifications: pendingProducers,
      disputes: 0, // placeholder until disputes implemented
      chart,
    });
  } catch (err) {
    console.error('Admin dashboard stats error:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};

// Admin: paginated orders with filtering
exports.getAdminOrders = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const paymentStatus = req.query.paymentStatus ? String(req.query.paymentStatus) : null;
    const paymentMethod = req.query.paymentMethod ? String(req.query.paymentMethod) : null;
    const q = (req.query.q || '').trim();

    const where = {};
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    const include = [
      { model: OrderItem, attributes: ['id','quantity','price','productId'], include: [{ model: Product, attributes: ['id','title'], include: [{ model: Producer, attributes: ['businessName'] }] }] },
      { model: User, attributes: ['id', 'username', 'email'] },
    ];

    // Basic search by order id or user email
    if (q) {
      if (/^\d+$/.test(q)) {
        where.id = parseInt(q, 10);
      } else {
        include[1].where = { email: { [Op.iLike]: `%${q}%` } };
      }
    }

    const { rows, count } = await Order.findAndCountAll({
      where,
      include,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
      subQuery: false,
    });

    res.json({
      items: rows || [],
      page,
      pageSize: limit,
      total: count,
      hasMore: offset + (rows?.length || 0) < count,
    });
  } catch (err) {
    console.error('Admin get orders error:', err);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

// Admin: update payment status (global override)
exports.adminUpdateOrderPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    const allowed = ["pending", "paid", "cancelled", "failed", "refunded"];
    if (!allowed.includes(String(paymentStatus))) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const prevStatus = order.paymentStatus;
    order.paymentStatus = paymentStatus;
    await order.save();

    // If transitioning to paid for the first time, credit producer wallets and admin wallet
    if (prevStatus !== 'paid' && String(paymentStatus) === 'paid') {
      const items = await OrderItem.findAll({ where: { orderId: order.id }, include: [{ model: Product }] });
      const credits = new Map();
      let totalPaid = 0;
      for (const it of items) {
        const pid = it?.Product?.producerId;
        if (!pid) continue;
        const line = Number(it.price) * Number(it.quantity);
        totalPaid += line;
        credits.set(pid, (credits.get(pid) || 0) + line);
      }
      for (const [pid, amount] of credits.entries()) {
        let wallet = await ProducerWallet.findOne({ where: { producerId: pid } });
        if (!wallet) wallet = await ProducerWallet.create({ producerId: pid, balance: 0.0 });
        wallet.balance = Number(wallet.balance) + Number(amount);
        await wallet.save();
        await ProducerWalletTransaction.create({
          producerId: pid,
          type: 'credit',
          amount: Number(amount).toFixed(2),
          currency: 'INR',
          description: `Admin marked Order #${order.id} paid`,
          orderId: order.id,
        });
      }
      let admin = await AdminWallet.findOne();
      if (!admin) admin = await AdminWallet.create({ balance: 0.0 });
      admin.balance = Number(admin.balance) + Number(totalPaid);
      await admin.save();
    }

    return res.json({ message: 'Payment status updated', paymentStatus: order.paymentStatus });
  } catch (err) {
    console.error('Admin update payment status error:', err);
    return res.status(500).json({ message: 'Failed to update payment status' });
  }
};

