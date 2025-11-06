const { Order, OrderItem, Cart, CartItem, Product, ProducerWallet, AdminWallet, ProducerWalletTransaction, Address, sequelize } = require("../models/index");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initiate payment for cart-based orders
exports.initiatePayment = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      where: { userId: req.user.id },
      include: [{ model: CartItem, include: [Product] }],
    });
    if (!cart || !cart.CartItems || cart.CartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let total = 0;
    for (const item of cart.CartItems) {
      if (item.Product.inventory < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.Product.title}.`,
        });
      }
      total += item.quantity * item.Product.price;
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      return res.status(500).json({ message: "Payment gateway not configured" });
    }

    const rp = new Razorpay({ key_id, key_secret });
    const rpOrder = await rp.orders.create({
      amount: Math.round(total * 100),
      currency: "INR",
      receipt: `cart_${cart.id}`,
      notes: { userId: req.user.id },
    });

    return res.json({
      message: "Payment order created",
      razorpayOrderId: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      keyId: key_id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to initiate payment" });
  }
};

// Initiate payment for direct orders
exports.initiateDirectPayment = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity) {
      return res.status(400).json({ message: "productId and quantity are required" });
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    if (product.inventory < qty) {
      return res.status(400).json({
        message: `Insufficient stock for ${product.title}. Available: ${product.inventory}, Required: ${qty}`
      });
    }

    const total = qty * product.price;

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      return res.status(500).json({ message: "Payment gateway not configured" });
    }

    const rp = new Razorpay({ key_id, key_secret });
    const rpOrder = await rp.orders.create({
      amount: Math.round(total * 100),
      currency: "INR",
      receipt: `direct_${productId}_${qty}`,
      notes: { userId: req.user.id, productId, quantity: qty },
    });

    return res.json({
      message: "Payment order created",
      razorpayOrderId: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      keyId: key_id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to initiate direct payment" });
  }
};

// Place an order from the user's cart
exports.placeOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { addressId, paymentMethod } = req.body;

    if (!addressId) {
      await transaction.rollback();
      return res.status(400).json({ message: "Address ID is required" });
    }

    // For PREPAID, return error - must use initiatePayment + verifyPayment flow
    if (String(paymentMethod || "").toUpperCase() === "PREPAID") {
      await transaction.rollback();
      return res.status(400).json({ 
        message: "For prepaid orders, use initiatePayment endpoint first, then verifyPayment after payment" 
      });
    }

    // Verify address belongs to user and exists
    const address = await Address.findOne({
      where: { id: addressId, userId: req.user.id }
    }, { transaction });

    if (!address) {
      await transaction.rollback();
      return res.status(400).json({ message: "Invalid address selected" });
    }

    const cart = await Cart.findOne({
      where: { userId: req.user.id },
      include: [{ model: CartItem, include: [Product] }],
    });
    if (!cart || !cart.CartItems || cart.CartItems.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Check stock availability
    for (const item of cart.CartItems) {
      if (item.Product.inventory < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Insufficient stock for ${item.Product.title}. Available: ${item.Product.inventory}, Required: ${item.quantity}`
        });
      }
    }

    let total = 0;
    cart.CartItems.forEach(item => {
      total += item.quantity * item.Product.price;
    });

    // Only COD orders reach here
    const order = await Order.create({
      userId: req.user.id,
      total,
      paymentMethod: "COD",
      paymentStatus: "pending",
      addressId: addressId
    }, { transaction });

    for (const item of cart.CartItems) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.Product.price,
      }, { transaction });

      // Reduce product stock
      await Product.update(
        { inventory: sequelize.literal(`inventory - ${item.quantity}`) },
        { where: { id: item.productId }, transaction }
      );
    }

    await CartItem.destroy({ where: { cartId: cart.id }, transaction });

    await transaction.commit();

    // Notify each producer involved in this order
    try {
      const { ProducerPushToken } = require("../models");
      const { notifyProducerOrderPlaced } = require("../utils/push");
      const items = cart.CartItems || [];
      const byProducer = new Map();
      for (const it of items) {
        const pid = it?.Product?.producerId;
        if (!pid) continue;
        byProducer.set(pid, (byProducer.get(pid) || 0) + 1);
      }
      for (const [pid, count] of byProducer.entries()) {
        const rows = await ProducerPushToken.findAll({ where: { producerId: pid }, attributes: ['token'], raw: true });
        const tokens = rows.map(r => r.token);
        if (tokens.length) await notifyProducerOrderPlaced({ tokens, orderId: order.id, itemsCount: count });
      }
    } catch (e) {
      console.warn('[push] order placed notify error (cod):', e.message);
    }

    res.status(201).json({ message: "Order placed", orderId: order.id });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ message: "Failed to place order" });
  }
};

// Get all orders for the current user
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      include: [
        { model: OrderItem, include: [Product] },
        { model: Address }
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// Place a direct order for a single product (Buy Now)
exports.placeDirectOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { productId, quantity, addressId, paymentMethod } = req.body;

    if (!productId || !quantity || !addressId) {
      await transaction.rollback();
      return res.status(400).json({ message: "productId, quantity, and addressId are required" });
    }

    // For PREPAID, return error - must use initiateDirectPayment + verifyDirectPayment flow
    if (String(paymentMethod || "").toUpperCase() === "PREPAID") {
      await transaction.rollback();
      return res.status(400).json({ 
        message: "For prepaid orders, use initiateDirectPayment endpoint first, then verifyDirectPayment after payment" 
      });
    }

    // Verify address belongs to user and exists
    const address = await Address.findOne({
      where: { id: addressId, userId: req.user.id }
    }, { transaction });

    if (!address) {
      await transaction.rollback();
      return res.status(400).json({ message: "Invalid address selected" });
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ message: "Product not found" });
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    // Check stock availability
    if (product.inventory < qty) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Insufficient stock for ${product.title}. Available: ${product.inventory}, Required: ${qty}`
      });
    }

    const total = qty * product.price;

    // Only COD orders reach here
    const order = await Order.create({
      userId: req.user.id,
      total,
      paymentMethod: "COD",
      paymentStatus: "pending",
      addressId: addressId
    }, { transaction });

    await OrderItem.create({
      orderId: order.id,
      productId: product.id,
      quantity: qty,
      price: product.price,
    }, { transaction });

    // Reduce product stock
    await Product.update(
      { inventory: sequelize.literal(`inventory - ${qty}`) },
      { where: { id: productId }, transaction }
    );

    await transaction.commit();

    // Notify producer owning this product
    try {
      const { ProducerPushToken } = require("../models");
      const { notifyProducerOrderPlaced } = require("../utils/push");
      const pid = product.producerId;
      if (pid) {
        const rows = await ProducerPushToken.findAll({ where: { producerId: pid }, attributes: ['token'], raw: true });
        const tokens = rows.map(r => r.token);
        if (tokens.length) await notifyProducerOrderPlaced({ tokens, orderId: order.id, itemsCount: 1 });
      }
    } catch (e) {
      console.warn('[push] direct order placed notify error (cod):', e.message);
    }

    res.status(201).json({ message: "Order placed", orderId: order.id });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ message: "Failed to place direct order" });
  }
};

// Get producer orders (supports pagination via ?page=&limit=)
// Returns most recent first
exports.getProducerOrders = async (req, res) => {
  try {
    const producerId = req.producer?.id;
    if (!producerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 0, 0);
    const limit = Math.max(parseInt(req.query.limit, 10) || 0, 0);

    // If pagination requested, return paged list of orders with ONLY this producer's items included
    if (page > 0 && limit > 0) {
      const offset = (page - 1) * limit;

      const { rows, count } = await Order.findAndCountAll({
   distinct: true,
   subQuery: false,
   include: [
     {
       model: OrderItem,
       required: true,
       include: [
         {
           model: Product,
           where: { producerId },
           required: true,
         },
       ],
     },
     { model: Address }
   ],
   order: [["createdAt", "DESC"]],
   limit,
   offset,
});



      const items = (rows || []).map((o) => ({
        orderId: o.id,
        order: o,
        items: Array.isArray(o.OrderItems) ? o.OrderItems : [],
      }));
      const hasMore = offset + items.length < count;
      return res.json({ items, page, pageSize: limit, total: count, hasMore });
    }

    // Legacy: no pagination -> return all grouped (most recent first)
    const items = await OrderItem.findAll({
      include: [
        {
          model: Product,
          where: { producerId },
        },
        {
          model: Order,
          include: [{ model: Address }]
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const byOrder = {};
    for (const it of items) {
      const orderId = it.orderId;
      if (!byOrder[orderId]) {
        byOrder[orderId] = { orderId, order: it.Order, items: [] };
      }
      byOrder[orderId].items.push(it);
    }
    res.json(Object.values(byOrder));
  } catch (err) {
    console.error("Error fetching producer orders:", err);
    res.status(500).json({ message: "Failed to fetch producer orders" });
  }
};

// Update per-item status (packed, shipped, delivered) for producer-owned items
exports.updateOrderItemStatus = async (req, res) => {
  try {
    const { id } = req.params; // OrderItem ID
    const { status } = req.body;

    const allowed = ["pending", "packed", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(String(status))) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const producerId = req.producer?.id;
    if (!producerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Load OrderItem and ensure it belongs to this producer
    const item = await OrderItem.findByPk(id, {
      include: [{ model: Product }]
    });

    if (!item || !item.Product || item.Product.producerId !== producerId) {
      return res.status(403).json({ message: "You cannot update this order item" });
    }

    item.status = status;
    await item.save();

    // Notify user about this order's status update
    try {
      const { UserPushToken } = require("../models");
      const { notifyUserOrder } = require("../utils/push");
      const order = await Order.findByPk(item.orderId);
      if (order) {
        const rows = await UserPushToken.findAll({ where: { userId: order.userId }, attributes: ['token'], raw: true });
        const tokens = rows.map(r => r.token);
        if (tokens.length) await notifyUserOrder({ tokens, orderId: order.id, status });
      }
    } catch (e) {
      console.warn('[push] order item status notify error:', e.message);
    }
 
    return res.json({ message: "Item status updated", id: item.id, status: item.status });
  } catch (err) {
    res.status(500).json({ message: "Failed to update order item status" });
  }
};

/**
 * Update order status from producer dashboard.
 * Additionally, when the requested status is an item-level fulfillment status,
 * bulk-update all OrderItems in this order that belong to the current producer
 * to keep item statuses in sync (source of truth at item level).
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["pending", "packed", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(String(status))) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const producerId = req.producer?.id;
    if (!producerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const prevPaymentStatus = String(order.paymentStatus || 'pending');
    const payMethod = String(order.paymentMethod || 'COD').toUpperCase();

    // Verify at least one item in the order belongs to this producer
    const oneItem = await OrderItem.findOne({
      where: { orderId: order.id },
      include: [{ model: Product, where: { producerId } }]
    });
    if (!oneItem) {
      return res.status(403).json({ message: "You cannot update this order" });
    }

    // Guard: cannot cancel a delivered order
    if (String(status) === 'cancelled') {
      const deliveredAny = await OrderItem.findOne({
        where: { orderId: order.id, status: 'delivered' },
        include: [{ model: Product, where: { producerId } }]
      });
      if (deliveredAny) {
        return res.status(400).json({ message: 'Cannot cancel an order that has delivered items' });
      }
    }

    // If the requested status is an item-level fulfillment status,
    // update all producer-owned items in this order to that status.
    const itemLevelSet = new Set(["pending", "packed", "shipped", "delivered", "cancelled"]);
    let updatedItemIds = [];
    if (itemLevelSet.has(String(status))) {
      const items = await OrderItem.findAll({
        where: { orderId: order.id },
        include: [{ model: Product, where: { producerId } }]
      });

      for (const it of items) {
        it.status = status;
        await it.save();
        updatedItemIds.push(it.id);
      }

      // If producer cancels and payment was already received, create debit and mark refund if prepaid
      if (String(status) === 'cancelled') {
        // Sum only this producer's items lines
        const prodItems = await OrderItem.findAll({
          where: { orderId: order.id },
          include: [{ model: Product, where: { producerId } }]
        });
        const amount = prodItems.reduce((sum, it) => sum + Number(it.price) * Number(it.quantity), 0);

        // If funds were previously credited (paid), debit now
        if (prevPaymentStatus === 'paid' && amount > 0) {
          // Debit producer wallet and add transaction
          let wallet = await ProducerWallet.findOne({ where: { producerId } });
          if (!wallet) wallet = await ProducerWallet.create({ producerId, balance: 0.0 });
          wallet.balance = Number(wallet.balance) - Number(amount);
          await wallet.save();

          await ProducerWalletTransaction.create({
            producerId,
            type: 'debit',
            amount: Number(amount).toFixed(2),
            currency: 'INR',
            description: `Refund for cancelled items of Order #${order.id}`,
            orderId: order.id,
          });

          // Reflect refund outflow from admin pool
          let admin = await AdminWallet.findOne();
          if (!admin) admin = await AdminWallet.create({ balance: 0.0 });
          admin.balance = Number(admin.balance) - Number(amount);
          await admin.save();
        }

        // For prepaid, set status to refunded for visibility
        if (payMethod === 'PREPAID') {
          order.paymentStatus = prevPaymentStatus === 'paid' ? 'refunded' : 'refunded';
          await order.save();
        }
      }

      // Notify user about order status after bulk update
      try {
        const { UserPushToken } = require("../models");
        const { notifyUserOrder } = require("../utils/push");
        const rows = await UserPushToken.findAll({ where: { userId: order.userId }, attributes: ['token'], raw: true });
        const tokens = rows.map(r => r.token);
        if (tokens.length) await notifyUserOrder({ tokens, orderId: order.id, status });
      } catch (e) {
        console.warn('[push] order status notify error:', e.message);
      }
    }

    return res.json({
      message: "Status updated",
      updatedItemIds,
      paymentStatus: order.paymentStatus
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update order status" });
  }
};

/**
* Update payment status (COD only) for orders that contain at least one item of current producer
* Allowed: pending | paid | cancelled | failed | refunded
*/
exports.updateOrderPaymentStatus = async (req, res) => {
try {
const { id } = req.params;
const { paymentStatus } = req.body;
const allowed = ["pending", "paid", "cancelled", "failed", "refunded"];
if (!allowed.includes(String(paymentStatus))) {
return res.status(400).json({ message: "Invalid payment status" });
}

const producerId = req.producer?.id;
if (!producerId) {
return res.status(401).json({ message: "Unauthorized" });
}

const order = await Order.findByPk(id);
if (!order) return res.status(404).json({ message: "Order not found" });

if (String(order.paymentMethod).toUpperCase() !== "COD") {
return res.status(400).json({ message: "Payment status can be manually updated only for COD orders" });
}

// Ensure producer owns at least one item in this order
const owns = await OrderItem.findOne({
where: { orderId: order.id },
include: [{ model: Product, where: { producerId } }],
});
if (!owns) {
return res.status(403).json({ message: "You cannot update payment status for this order" });
}

const prevStatus = order.paymentStatus;
order.paymentStatus = paymentStatus;
await order.save();

// If transitioning to paid for the first time, credit producer wallets similar to prepaid flow
  if (prevStatus !== "paid" && String(paymentStatus) === "paid") {
     const items = await OrderItem.findAll({
       where: { orderId: order.id },
       include: [{ model: Product }]
     });
 
     const credits = new Map(); // producerId -> amount
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
         type: "credit",
         amount: Number(amount).toFixed(2),
         currency: "INR",
         description: `Order #${order.id} COD payment credit`,
         orderId: order.id,
       });
     }
 
     let admin = await AdminWallet.findOne();
     if (!admin) admin = await AdminWallet.create({ balance: 0.0 });
     admin.balance = Number(admin.balance) + Number(totalPaid);
     await admin.save();
   }
 
   return res.json({ message: "Payment status updated", paymentStatus: order.paymentStatus });
 } catch (err) {
   return res.status(500).json({ message: "Failed to update payment status" });
 }
};

/**
 * Verify Razorpay payment and create order with stock reduction for cart-based orders
 * Body: { addressId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
exports.verifyPayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { addressId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!addressId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      await transaction.rollback();
      return res.status(400).json({ message: "Missing payment fields" });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) {
      await transaction.rollback();
      return res.status(500).json({ message: "Payment gateway not configured" });
    }

    // Verify signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto.createHmac("sha256", key_secret).update(body).digest("hex");
    if (expected !== razorpay_signature) {
      await transaction.rollback();
      return res.status(400).json({ message: "Signature verification failed" });
    }

    // Verify address belongs to user
    const address = await Address.findOne({
      where: { id: addressId, userId: req.user.id }
    }, { transaction });

    if (!address) {
      await transaction.rollback();
      return res.status(400).json({ message: "Invalid address selected" });
    }

    // Get cart items
    const cart = await Cart.findOne({
      where: { userId: req.user.id },
      include: [{ model: CartItem, include: [Product] }],
    }, { transaction });

    if (!cart || !cart.CartItems || cart.CartItems.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Check stock availability again
    for (const item of cart.CartItems) {
      if (item.Product.inventory < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Insufficient stock for ${item.Product.title}. Available: ${item.Product.inventory}, Required: ${item.quantity}`
        });
      }
    }

    let total = 0;
    cart.CartItems.forEach(item => {
      total += item.quantity * item.Product.price;
    });

    // NOW create the order
    const order = await Order.create({
      userId: req.user.id,
      total,
      paymentMethod: "PREPAID",
      paymentStatus: "paid",
      addressId: addressId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature
    }, { transaction });

    // Create order items and reduce stock
    for (const item of cart.CartItems) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.Product.price,
      }, { transaction });

      await Product.update(
        { inventory: sequelize.literal(`inventory - ${item.quantity}`) },
        { where: { id: item.productId }, transaction }
      );
    }

    // Clear cart
    await CartItem.destroy({ where: { cartId: cart.id }, transaction });

    // Credit producer wallets
    const items = cart.CartItems;
    const credits = new Map();
    let totalPaid = 0;
    for (const it of items) {
      const producerId = it?.Product?.producerId;
      if (!producerId) continue;
      const line = Number(it.price) * Number(it.quantity);
      totalPaid += line;
      credits.set(producerId, (credits.get(producerId) || 0) + line);
    }

    for (const [producerId, amount] of credits.entries()) {
      let wallet = await ProducerWallet.findOne({ where: { producerId } }, { transaction });
      if (!wallet) wallet = await ProducerWallet.create({ producerId, balance: 0.0 }, { transaction });
      wallet.balance = Number(wallet.balance) + Number(amount);
      await wallet.save({ transaction });

      await ProducerWalletTransaction.create({
        producerId,
        type: "credit",
        amount: Number(amount).toFixed(2),
        currency: "INR",
        description: `Order #${order.id} payment credit`,
        orderId: order.id
      }, { transaction });
    }

    let admin = await AdminWallet.findOne({}, { transaction });
    if (!admin) admin = await AdminWallet.create({ balance: 0.0 }, { transaction });
    admin.balance = Number(admin.balance) + Number(totalPaid);
    await admin.save({ transaction });

    await transaction.commit();

    // Notify producers
    try {
      const { ProducerPushToken } = require("../models");
      const { notifyProducerOrderPlaced } = require("../utils/push");
      const byProducer = new Map();
      for (const it of items) {
        const pid = it?.Product?.producerId;
        if (!pid) continue;
        byProducer.set(pid, (byProducer.get(pid) || 0) + 1);
      }
      for (const [pid, count] of byProducer.entries()) {
        const rows = await ProducerPushToken.findAll({ where: { producerId: pid }, attributes: ['token'], raw: true });
        const tokens = rows.map(r => r.token);
        if (tokens.length) await notifyProducerOrderPlaced({ tokens, orderId: order.id, itemsCount: count });
      }
    } catch (e) {
      console.warn('[push] order placed notify error (prepaid):', e.message);
    }

    return res.json({ message: "Payment verified and order placed", orderId: order.id });
  } catch (err) {
    await transaction.rollback();
    console.error("verifyPayment error:", err);
    return res.status(500).json({ message: "Failed to verify payment" });
  }
};

/**
 * Verify Razorpay payment and create direct order for single product
 * Body: { productId, quantity, addressId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
exports.verifyDirectPayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { productId, quantity, addressId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    
    if (!productId || !quantity || !addressId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      await transaction.rollback();
      return res.status(400).json({ message: "Missing required fields" });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) {
      await transaction.rollback();
      return res.status(500).json({ message: "Payment gateway not configured" });
    }

    // Verify signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto.createHmac("sha256", key_secret).update(body).digest("hex");
    if (expected !== razorpay_signature) {
      await transaction.rollback();
      return res.status(400).json({ message: "Signature verification failed" });
    }

    // Verify address belongs to user
    const address = await Address.findOne({
      where: { id: addressId, userId: req.user.id }
    }, { transaction });

    if (!address) {
      await transaction.rollback();
      return res.status(400).json({ message: "Invalid address selected" });
    }

    const product = await Product.findByPk(productId, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ message: "Product not found" });
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    // Check stock availability
    if (product.inventory < qty) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Insufficient stock for ${product.title}. Available: ${product.inventory}, Required: ${qty}`
      });
    }

    const total = qty * product.price;

    // NOW create the order
    const order = await Order.create({
      userId: req.user.id,
      total,
      paymentMethod: "PREPAID",
      paymentStatus: "paid",
      addressId: addressId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature
    }, { transaction });

    await OrderItem.create({
      orderId: order.id,
      productId: product.id,
      quantity: qty,
      price: product.price,
    }, { transaction });

    // Reduce product stock
    await Product.update(
      { inventory: sequelize.literal(`inventory - ${qty}`) },
      { where: { id: productId }, transaction }
    );

    // Credit producer wallet
    const producerId = product.producerId;
    const amount = total;

    if (producerId) {
      let wallet = await ProducerWallet.findOne({ where: { producerId } }, { transaction });
      if (!wallet) wallet = await ProducerWallet.create({ producerId, balance: 0.0 }, { transaction });
      wallet.balance = Number(wallet.balance) + Number(amount);
      await wallet.save({ transaction });

      await ProducerWalletTransaction.create({
        producerId,
        type: "credit",
        amount: Number(amount).toFixed(2),
        currency: "INR",
        description: `Order #${order.id} payment credit`,
        orderId: order.id
      }, { transaction });
    }

    let admin = await AdminWallet.findOne({}, { transaction });
    if (!admin) admin = await AdminWallet.create({ balance: 0.0 }, { transaction });
    admin.balance = Number(admin.balance) + Number(amount);
    await admin.save({ transaction });

    await transaction.commit();

    // Notify producer
    try {
      const { ProducerPushToken } = require("../models");
      const { notifyProducerOrderPlaced } = require("../utils/push");
      if (producerId) {
        const rows = await ProducerPushToken.findAll({ where: { producerId }, attributes: ['token'], raw: true });
        const tokens = rows.map(r => r.token);
        if (tokens.length) await notifyProducerOrderPlaced({ tokens, orderId: order.id, itemsCount: 1 });
      }
    } catch (e) {
      console.warn('[push] direct order placed notify error (prepaid):', e.message);
    }

    return res.json({ message: "Payment verified and order placed", orderId: order.id });
  } catch (err) {
    await transaction.rollback();
    console.error("verifyDirectPayment error:", err);
    return res.status(500).json({ message: "Failed to verify payment" });
  }
};

// Aggregated stats for producer orders
exports.getProducerOrderStats = async (req, res) => {
  try {
    const producerId = req.producer?.id;
    if (!producerId) return res.status(401).json({ message: 'Unauthorized' });

    // Count orders by earliest (min) item status for this producer
    const items = await OrderItem.findAll({
      include: [
        { model: Product, where: { producerId }, required: true },
        { model: Order, required: true },
      ],
      attributes: ['orderId', 'status', 'price', 'quantity'],
      order: [[sequelize.col('Order.createdAt'), 'DESC']],
      raw: true,
    });

    const byOrder = new Map();
    for (const it of items) {
      const oid = it.orderId;
      if (!byOrder.has(oid)) byOrder.set(oid, []);
      byOrder.get(oid).push(it);
    }

    const STAGE_ORDER = { pending: 0, packed: 1, shipped: 2, delivered: 3, cancelled: 4 };
    const stats = { total: 0, pending: 0, packed: 0, shipped: 0, delivered: 0, cancelled: 0, revenue: 0 };
    for (const [oid, arr] of byOrder.entries()) {
      stats.total += 1;
      const active = arr.filter(a => String(a.status) !== 'cancelled');
      let minStage = Infinity;
      for (const a of (active.length ? active : arr)) {
        const s = String(a.status || 'pending').toLowerCase();
        const stage = STAGE_ORDER.hasOwnProperty(s) ? STAGE_ORDER[s] : 0;
        if (stage < minStage) minStage = stage;
      }
      const label = Object.keys(STAGE_ORDER).find(k => STAGE_ORDER[k] === minStage) || 'pending';
      stats[label] = (stats[label] || 0) + 1;
      if (label === 'delivered') {
        // revenue for this order for this producer
        for (const a of arr) stats.revenue += Number(a.price) * Number(a.quantity);
      }
    }

    return res.json(stats);
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ message: 'Failed to fetch stats' });
  }
};
