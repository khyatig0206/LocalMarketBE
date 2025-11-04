const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../utils/cloudinary");

// Default uploader (allows images and pdfs per Cloudinary params) for general use
const uploadImage = multer({ storage });

// Signup-specific uploader: restrict Aadhaar to image types only
const uploadSignup = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "aadharImages") {
      const ok = ["image/jpeg", "image/png"].includes(file.mimetype);
      return cb(ok ? null : new Error("Only JPG/PNG allowed for Aadhaar images"), ok);
    }
    cb(null, true);
  },
});

const {
  signin,
  signup,
  getProducerProfile,
  updateProducer,
  uploadKYC,
  getKycStatusForProducer,
  getMyProducts,
  getWalletSummary,
  getWalletTransactions,
  getAnalytics,
  changePassword,
  updateLocation,
  getFeaturedProducers,
  getPublicProducerProfile,
} = require("../controllers/producerController");
const { parseAadhaar } = require("../controllers/kycController");
const {authenticateProducer} = require("../middleware/authmiddleware");

// Producer signup: accepts businessLogo, Aadhaar images, and optional initial KYC docs
router.post(
  "/signup",
  uploadSignup.fields([
    { name: "businessLogo", maxCount: 1 },
    { name: "aadharImages", maxCount: 4 },
    { name: "idDocuments", maxCount: 5 },
    { name: "addressProofs", maxCount: 5 },
  ]),
  signup
);

router.post("/signin", signin);

// Public endpoints
router.get("/featured", getFeaturedProducers);
router.get("/public/:id", getPublicProducerProfile);

// Parse Aadhaar (unauthenticated) - single Aadhaar image
router.post("/parse-aadhaar", uploadSignup.single('aadhaar'), parseAadhaar);

router.get("/me", authenticateProducer, getProducerProfile);
router.get("/kyc-status", authenticateProducer, getKycStatusForProducer);
router.put("/update", authenticateProducer, uploadImage.single('businessLogo'), updateProducer);

// Change password
router.post("/change-password", authenticateProducer, changePassword);

// Update location only
router.post("/update-location", authenticateProducer, updateLocation);
 
 // KYC uploads: use CloudinaryStorage so per-file params handler runs
router.post(
  "/uploadKYC",
  // Log before anything else so we can see requests even if auth fails
  (req, res, next) => {
    console.log("[/uploadKYC] route hit. Content-Type:", req.headers["content-type"]);
    next();
  },
  authenticateProducer,
  uploadImage.fields([
    { name: "idDocuments", maxCount: 5 },
    { name: "addressProofs", maxCount: 5 },
  ]),
  (req, res, next) => {
    const filesSummary = Object.fromEntries(
      Object.entries(req.files || {}).map(([k, arr]) => [
        k,
        arr.map((f) => ({ fieldname: f.fieldname, originalname: f.originalname, mimetype: f.mimetype }))
      ])
    );
    console.log("[/uploadKYC] multer processed files:", filesSummary);
    next();
  },
  uploadKYC
);

router.get("/my-products", authenticateProducer, getMyProducts);

// Wallet routes
router.get("/wallet/summary", authenticateProducer, getWalletSummary);
router.get("/wallet/transactions", authenticateProducer, getWalletTransactions);

// Analytics
router.get("/analytics", authenticateProducer, getAnalytics);

// Push notification token endpoints
const { registerProducerToken, unregisterProducerToken } = require("../controllers/pushController");
router.post("/push-token", authenticateProducer, registerProducerToken);
router.delete("/push-token", authenticateProducer, unregisterProducerToken);
 
 module.exports = router;
