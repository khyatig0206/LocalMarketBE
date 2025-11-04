const express = require("express");
const router = express.Router();
const { addReview, getProductReviews } = require("../controllers/reviewController");
const multer = require("multer");
const { storage } = require("../utils/cloudinary");
const { authenticateUser } = require("../middleware/userAuth");

const upload = multer({ storage });

// Add review with images
router.post("/", authenticateUser, upload.array("images", 5), addReview);

// Get reviews for a product
router.get("/product/:productId", getProductReviews);

module.exports = router;
