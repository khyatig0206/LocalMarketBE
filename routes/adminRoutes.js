const express = require("express");
const router = express.Router();
const { signInAdmin, getProducersForVerification, getAllProducersWithStatus, approveProducer, rejectProducer, getDashboardStats } = require("../controllers/adminController");
const { authenticateAdmin } = require("../middleware/authmiddleware");

router.post("/signin", signInAdmin);
router.get("/getProducers", authenticateAdmin, getProducersForVerification);
router.get("/producers", authenticateAdmin, getAllProducersWithStatus);
router.get("/dashboard-stats", authenticateAdmin, getDashboardStats);
router.get("/orders", authenticateAdmin, require("../controllers/adminController").getAdminOrders);
router.patch("/orders/:id/payment-status", authenticateAdmin, require("../controllers/adminController").adminUpdateOrderPaymentStatus);

// Disputes (admin)
const {
  adminListDisputes,
  adminGetDispute,
  adminUpdateDisputeStatus,
  adminAssignDispute,
  adminPostMessage,
} = require("../controllers/disputeController");
router.get("/disputes", authenticateAdmin, adminListDisputes);
router.get("/disputes/:id", authenticateAdmin, adminGetDispute);
router.patch("/disputes/:id/status", authenticateAdmin, adminUpdateDisputeStatus);
router.patch("/disputes/:id/assign", authenticateAdmin, adminAssignDispute);
const multer = require('multer');
const { storage } = require('../utils/cloudinary');
const upload = multer({ storage });
router.post("/disputes/:id/messages", authenticateAdmin, upload.array('images', 5), adminPostMessage);

// Approve/Reject Producer KYC
router.post("/producers/:id/approve", authenticateAdmin, approveProducer);
router.post("/producers/:id/reject", authenticateAdmin, rejectProducer);

module.exports = router;
