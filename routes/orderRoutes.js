const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/userAuth");
const { authenticateProducer } = require("../middleware/authmiddleware");
const { placeOrder, getOrders, placeDirectOrder, getProducerOrders, updateOrderStatus, verifyPayment, getProducerOrderStats } = require("../controllers/orderController");

router.post("/place", authenticateUser, placeOrder);
router.post("/direct", authenticateUser, placeDirectOrder);
router.get("/my", authenticateUser, getOrders);

// Payment verification webhook-like endpoint (client posts after Razorpay success)
router.post("/verify", authenticateUser, verifyPayment);

// Producer-side orders (items for products owned by the producer)
router.get("/producer", authenticateProducer, getProducerOrders);
// Aggregated stats for producer orders
router.get("/producer/stats", authenticateProducer, getProducerOrderStats);

// Producer can update overall order status for orders containing their items
router.patch("/:id/status", authenticateProducer, updateOrderStatus);

// Producer can update per-item status (packed, shipped, delivered) for their own items
const { updateOrderItemStatus, updateOrderPaymentStatus } = require("../controllers/orderController");
router.patch("/item/:id/status", authenticateProducer, updateOrderItemStatus);

// Producer can update payment status for COD orders containing their items
router.patch("/:id/payment-status", authenticateProducer, updateOrderPaymentStatus);

module.exports = router;
