const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/userAuth");
const { authenticateProducer } = require("../middleware/authmiddleware");
const { placeOrder, getOrders, placeDirectOrder, getProducerOrders, updateOrderStatus, verifyPayment, verifyDirectPayment, initiatePayment, initiateDirectPayment, getProducerOrderStats } = require("../controllers/orderController");

// Cart-based order flow
router.post("/initiate-payment", authenticateUser, initiatePayment); // Step 1: Get Razorpay order for cart
router.post("/verify", authenticateUser, verifyPayment); // Step 2: Verify payment and create order
router.post("/place", authenticateUser, placeOrder); // COD orders only

// Direct order flow (Buy Now)
router.post("/initiate-direct-payment", authenticateUser, initiateDirectPayment); // Step 1: Get Razorpay order for product
router.post("/verify-direct", authenticateUser, verifyDirectPayment); // Step 2: Verify payment and create order
router.post("/direct", authenticateUser, placeDirectOrder); // COD orders only

router.get("/my", authenticateUser, getOrders);

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
